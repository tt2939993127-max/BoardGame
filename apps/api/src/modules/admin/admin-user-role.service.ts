import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Types, type Model } from 'mongoose';
import { AdminAuditLog, type AdminAuditLogDocument } from '../auth/schemas/admin-audit-log.schema';
import {
    areDeveloperGameIdsEqual,
    normalizeDeveloperGameIds,
    serializeDeveloperGameIds,
} from '../auth/schemas/developer-game-access';
import { User, type UserDocument } from '../auth/schemas/user.schema';
import type { UserRole } from '../auth/schemas/user-role';
import logger from '../../../../../server/logger';

type RoleUser = {
    _id: Types.ObjectId;
    username: string;
    email?: string;
    role: UserRole;
    developerGameIds?: string[];
};

type UpdateUserRoleParams = {
    actorUserId: string;
    actorUsername: string;
    actorIp?: string | null;
    targetUserId: string;
    role: UserRole;
    developerGameIds?: string[];
};

export type UpdateUserRoleResult =
    | {
        ok: true;
        changed: boolean;
        user: {
            id: string;
            username: string;
            role: UserRole;
            developerGameIds?: string[];
        };
    }
    | {
        ok: false;
        code: 'notFound' | 'cannotChangeOwnRole' | 'mustKeepOneAdmin' | 'developerGamesRequired';
    };

type AdminRoleUpdateLock = {
    _id: string;
    owner: string;
    expiresAt: Date;
};

const ADMIN_ROLE_UPDATE_LOCK_COLLECTION = 'admin_role_update_locks';
const ADMIN_ROLE_UPDATE_LOCK_ID = 'admin-user-role-update';
const ADMIN_ROLE_UPDATE_LOCK_TTL_MS = 30_000;
const ADMIN_ROLE_UPDATE_LOCK_RETRY_MS = 50;
const ADMIN_ROLE_UPDATE_LOCK_MAX_ATTEMPTS = 200;

@Injectable()
export class AdminUserRoleService {
    constructor(
        @InjectModel(User.name) private readonly userModel: Model<UserDocument>,
        @InjectModel(AdminAuditLog.name) private readonly auditModel: Model<AdminAuditLogDocument>,
    ) {}

    async updateUserRole(params: UpdateUserRoleParams): Promise<UpdateUserRoleResult> {
        const action = 'change-role';
        const nextDeveloperGameIds = params.role === 'developer'
            ? normalizeDeveloperGameIds(params.developerGameIds)
            : [];
        const fallbackTargetEmail = `user:${params.targetUserId}`.toLowerCase();
        const target = await this.userModel
            .findById(params.targetUserId)
            .select('_id username email role developerGameIds')
            .lean<RoleUser | null>();

        if (!target) {
            await this.writeAuditLog({
                action,
                status: 'failed',
                actor: this.formatActor(params.actorUsername, params.actorUserId),
                actorIp: params.actorIp ?? null,
                targetEmail: fallbackTargetEmail,
                message: `targetUserId=${params.targetUserId} nextRole=${params.role} reason=not_found`,
            });
            logger.warn('admin_user_role_update_denied', {
                actorUserId: params.actorUserId,
                actorUsername: params.actorUsername,
                targetUserId: params.targetUserId,
                nextRole: params.role,
                reason: 'not_found',
                actorIp: params.actorIp ?? null,
            });
            return { ok: false, code: 'notFound' };
        }

        const targetUserId = target._id.toString();
        const targetEmail = this.resolveTargetEmail(target);

        if (targetUserId === params.actorUserId) {
            await this.writeAuditLog({
                action,
                status: 'failed',
                actor: this.formatActor(params.actorUsername, params.actorUserId),
                actorIp: params.actorIp ?? null,
                targetEmail,
                message: `targetUserId=${targetUserId} nextRole=${params.role} reason=self_role_change_forbidden`,
            });
            logger.warn('admin_user_role_update_denied', {
                actorUserId: params.actorUserId,
                actorUsername: params.actorUsername,
                targetUserId,
                nextRole: params.role,
                reason: 'cannot_change_own_role',
                actorIp: params.actorIp ?? null,
            });
            return { ok: false, code: 'cannotChangeOwnRole' };
        }

        if (params.role === 'developer' && nextDeveloperGameIds.length === 0) {
            await this.writeAuditLog({
                action,
                status: 'failed',
                actor: this.formatActor(params.actorUsername, params.actorUserId),
                actorIp: params.actorIp ?? null,
                targetEmail,
                message: `targetUserId=${targetUserId} nextRole=developer reason=developer_games_required`,
            });
            logger.warn('admin_user_role_update_denied', {
                actorUserId: params.actorUserId,
                actorUsername: params.actorUsername,
                targetUserId,
                nextRole: params.role,
                reason: 'developer_games_required',
                actorIp: params.actorIp ?? null,
            });
            return { ok: false, code: 'developerGamesRequired' };
        }

        return this.withRoleUpdateLock(async () => {
            const latestTarget = await this.userModel
                .findById(targetUserId)
                .select('_id username email role developerGameIds')
                .lean<RoleUser | null>();

            if (!latestTarget) {
                await this.writeAuditLog({
                    action,
                    status: 'failed',
                    actor: this.formatActor(params.actorUsername, params.actorUserId),
                    actorIp: params.actorIp ?? null,
                    targetEmail,
                    message: `targetUserId=${targetUserId} nextRole=${params.role} reason=updated_user_missing`,
                });
                logger.warn('admin_user_role_update_denied', {
                    actorUserId: params.actorUserId,
                    actorUsername: params.actorUsername,
                    targetUserId,
                    nextRole: params.role,
                    reason: 'updated_user_missing',
                    actorIp: params.actorIp ?? null,
                });
                return { ok: false, code: 'notFound' } as UpdateUserRoleResult;
            }

            const latestTargetEmail = this.resolveTargetEmail(latestTarget);

            if (
                latestTarget.role === params.role
                && areDeveloperGameIdsEqual(
                    latestTarget.role === 'developer' ? latestTarget.developerGameIds : [],
                    params.role === 'developer' ? nextDeveloperGameIds : [],
                )
            ) {
                await this.writeAuditLog({
                    action,
                    status: 'exists',
                    actor: this.formatActor(params.actorUsername, params.actorUserId),
                    actorIp: params.actorIp ?? null,
                    targetEmail: latestTargetEmail,
                    message: `targetUserId=${targetUserId} role=${latestTarget.role} reason=no_change`,
                });
                logger.info('admin_user_role_update_skipped', {
                    actorUserId: params.actorUserId,
                    actorUsername: params.actorUsername,
                    targetUserId,
                    role: latestTarget.role,
                    actorIp: params.actorIp ?? null,
                });
                return {
                    ok: true,
                    changed: false,
                    user: {
                        id: targetUserId,
                        username: latestTarget.username,
                        role: latestTarget.role,
                        developerGameIds: serializeDeveloperGameIds(
                            latestTarget.role,
                            latestTarget.developerGameIds,
                        ),
                    },
                } satisfies UpdateUserRoleResult;
            }

            if (latestTarget.role === 'admin' && params.role !== 'admin') {
                const adminCount = await this.userModel.countDocuments({ role: 'admin' });
                if (adminCount <= 1) {
                    await this.writeAuditLog({
                        action,
                        status: 'failed',
                        actor: this.formatActor(params.actorUsername, params.actorUserId),
                        actorIp: params.actorIp ?? null,
                        targetEmail: latestTargetEmail,
                        message: `targetUserId=${targetUserId} previousRole=admin nextRole=${params.role} reason=must_keep_one_admin`,
                    });
                    logger.warn('admin_user_role_update_denied', {
                        actorUserId: params.actorUserId,
                        actorUsername: params.actorUsername,
                        targetUserId,
                        previousRole: latestTarget.role,
                        nextRole: params.role,
                        reason: 'must_keep_one_admin',
                        actorIp: params.actorIp ?? null,
                    });
                    return { ok: false, code: 'mustKeepOneAdmin' } as UpdateUserRoleResult;
                }
            }

            const update =
                params.role === 'developer'
                    ? {
                        $set: {
                            role: params.role,
                            developerGameIds: nextDeveloperGameIds,
                        },
                        $unset: {
                            adminPermissions: 1,
                        },
                    }
                    : {
                        $set: {
                            role: params.role,
                        },
                        $unset: {
                            developerGameIds: 1,
                            adminPermissions: 1,
                        },
                    };

            const updated = await this.userModel.findOneAndUpdate(
                { _id: targetUserId, role: latestTarget.role },
                update,
                { new: true }
            );

            if (!updated) {
                await this.writeAuditLog({
                    action,
                    status: 'failed',
                    actor: this.formatActor(params.actorUsername, params.actorUserId),
                    actorIp: params.actorIp ?? null,
                    targetEmail: latestTargetEmail,
                    message: `targetUserId=${targetUserId} nextRole=${params.role} reason=updated_user_missing`,
                });
                logger.warn('admin_user_role_update_denied', {
                    actorUserId: params.actorUserId,
                    actorUsername: params.actorUsername,
                    targetUserId,
                    nextRole: params.role,
                    reason: 'updated_user_missing',
                    actorIp: params.actorIp ?? null,
                });
                return { ok: false, code: 'notFound' } as UpdateUserRoleResult;
            }

            await this.writeAuditLog({
                action,
                status: 'updated',
                actor: this.formatActor(params.actorUsername, params.actorUserId),
                actorIp: params.actorIp ?? null,
                targetEmail: latestTargetEmail,
                message: `targetUserId=${targetUserId} previousRole=${latestTarget.role} nextRole=${updated.role} developerGameIds=${nextDeveloperGameIds.join(',')}`,
            });
            logger.info('admin_user_role_updated', {
                actorUserId: params.actorUserId,
                actorUsername: params.actorUsername,
                targetUserId,
                previousRole: latestTarget.role,
                nextRole: updated.role,
                developerGameIds: nextDeveloperGameIds,
                actorIp: params.actorIp ?? null,
            });

            return {
                ok: true,
                changed: true,
                user: {
                    id: updated._id.toString(),
                    username: updated.username,
                    role: updated.role,
                    developerGameIds: serializeDeveloperGameIds(updated.role, updated.developerGameIds),
                },
            } satisfies UpdateUserRoleResult;
        });
    }

    private resolveTargetEmail(user: RoleUser): string {
        const email = user.email?.trim().toLowerCase();
        return email && email.length > 0 ? email : `user:${user._id.toString()}`;
    }

    private formatActor(username: string, userId: string): string {
        return `${username}(${userId})`;
    }

    // 用 Mongo 单文档锁串行化管理员角色变更，避免“先数管理员再写角色”在并发下出现写偏斜。
    private async withRoleUpdateLock<T>(operation: () => Promise<T>): Promise<T> {
        const owner = new Types.ObjectId().toString();
        const lockCollection = this.userModel.db.collection<AdminRoleUpdateLock>(ADMIN_ROLE_UPDATE_LOCK_COLLECTION);

        for (let attempt = 0; attempt < ADMIN_ROLE_UPDATE_LOCK_MAX_ATTEMPTS; attempt += 1) {
            const now = new Date();
            const expiresAt = new Date(now.getTime() + ADMIN_ROLE_UPDATE_LOCK_TTL_MS);

            try {
                const result = await lockCollection.updateOne(
                    {
                        _id: ADMIN_ROLE_UPDATE_LOCK_ID,
                        $or: [
                            { expiresAt: { $lte: now } },
                            { owner },
                        ],
                    },
                    {
                        $set: {
                            owner,
                            expiresAt,
                        },
                    },
                    { upsert: true }
                );

                if (result.matchedCount > 0 || result.upsertedCount > 0) {
                    try {
                        return await operation();
                    } finally {
                        await lockCollection.deleteOne({
                            _id: ADMIN_ROLE_UPDATE_LOCK_ID,
                            owner,
                        });
                    }
                }
            } catch (error) {
                if (!this.isDuplicateKeyError(error)) {
                    throw error;
                }
            }

            await this.delay(ADMIN_ROLE_UPDATE_LOCK_RETRY_MS);
        }

        logger.error('admin_user_role_update_lock_timeout', {
            lockId: ADMIN_ROLE_UPDATE_LOCK_ID,
            ttlMs: ADMIN_ROLE_UPDATE_LOCK_TTL_MS,
        });
        throw new Error('admin_user_role_update_lock_timeout');
    }

    private isDuplicateKeyError(error: unknown): boolean {
        return typeof error === 'object'
            && error !== null
            && 'code' in error
            && (error as { code?: number }).code === 11000;
    }

    private async delay(ms: number): Promise<void> {
        await new Promise((resolve) => {
            setTimeout(resolve, ms);
        });
    }

    private async writeAuditLog(entry: {
        action: string;
        status: 'created' | 'exists' | 'updated' | 'failed';
        actor: string;
        actorIp?: string | null;
        targetEmail: string;
        message?: string | null;
    }): Promise<void> {
        try {
            await this.auditModel.create({
                action: entry.action,
                status: entry.status,
                actor: entry.actor,
                actorIp: entry.actorIp ?? null,
                targetEmail: entry.targetEmail,
                message: entry.message ?? null,
            });
        } catch (error) {
            logger.error('admin_audit_log_write_failed', {
                action: entry.action,
                status: entry.status,
                targetEmail: entry.targetEmail,
                error: error instanceof Error ? error.message : String(error),
            });
        }
    }
}
