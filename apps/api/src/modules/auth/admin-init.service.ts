import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import type { Model } from 'mongoose';
import { AdminAuditLog, type AdminAuditLogDocument } from './schemas/admin-audit-log.schema';
import { User, type UserDocument } from './schemas/user.schema';

export type AdminInitResult = {
    status: 'created' | 'exists';
    userId: string;
    email: string;
};

@Injectable()
export class AdminInitService {
    constructor(
        @InjectModel(User.name) private userModel: Model<UserDocument>,
        @InjectModel(AdminAuditLog.name) private auditModel: Model<AdminAuditLogDocument>,
    ) { }

    async initAdminOnce(params: {
        email: string;
        password: string;
        username: string;
        actor: string;
        actorIp?: string | null;
    }): Promise<AdminInitResult> {
        const rawEmail = params.email?.trim() ?? '';
        const normalizedEmail = rawEmail.toLowerCase();
        if (process.env.NODE_ENV === 'production') {
            await this.writeAuditLog({
                action: 'init-admin',
                status: 'failed',
                actor: params.actor,
                actorIp: params.actorIp ?? null,
                targetEmail: normalizedEmail || 'unknown',
                message: '生产环境禁止初始化管理员',
            });
            throw new Error('生产环境禁止初始化管理员');
        }

        if (!normalizedEmail || !params.password || !params.username) {
            await this.writeAuditLog({
                action: 'init-admin',
                status: 'failed',
                actor: params.actor,
                actorIp: params.actorIp ?? null,
                targetEmail: normalizedEmail || 'unknown',
                message: '缺少必要参数',
            });
            throw new Error('缺少必要参数');
        }
        const emailRegex = /^\S+@\S+\.\S+$/;
        if (!emailRegex.test(normalizedEmail)) {
            await this.writeAuditLog({
                action: 'init-admin',
                status: 'failed',
                actor: params.actor,
                actorIp: params.actorIp ?? null,
                targetEmail: normalizedEmail,
                message: '邮箱格式无效',
            });
            throw new Error('邮箱格式无效');
        }

        try {
            const existing = await this.userModel.findOne({ email: normalizedEmail });
            if (existing) {
                if (existing.role !== 'admin' || !existing.emailVerified) {
                    existing.role = 'admin';
                    existing.emailVerified = true;
                    await existing.save();
                }
                await this.writeAuditLog({
                    action: 'init-admin',
                    status: 'exists',
                    actor: params.actor,
                    actorIp: params.actorIp ?? null,
                    targetEmail: normalizedEmail,
                    message: '管理员已存在，已确保权限',
                });
                return { status: 'exists', userId: existing._id.toString(), email: normalizedEmail };
            }

            const admin = new this.userModel({
                username: params.username,
                email: normalizedEmail,
                password: params.password,
                role: 'admin',
                emailVerified: true,
            });
            await admin.save();

            await this.writeAuditLog({
                action: 'init-admin',
                status: 'created',
                actor: params.actor,
                actorIp: params.actorIp ?? null,
                targetEmail: normalizedEmail,
                message: '管理员已创建',
            });

            return { status: 'created', userId: admin._id.toString(), email: normalizedEmail };
        } catch (error) {
            await this.writeAuditLog({
                action: 'init-admin',
                status: 'failed',
                actor: params.actor,
                actorIp: params.actorIp ?? null,
                targetEmail: normalizedEmail,
                message: error instanceof Error ? error.message : '初始化管理员失败',
            });
            throw error;
        }
    }

    private async writeAuditLog(entry: {
        action: string;
        status: 'created' | 'exists' | 'failed';
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
            console.error(`[AdminAudit] 写入失败 action=${entry.action} status=${entry.status} email=${entry.targetEmail}`);
        }
    }
}
