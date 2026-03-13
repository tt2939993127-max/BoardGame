import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { type Model } from 'mongoose';
import { normalizeDeveloperGameIds } from '../auth/schemas/developer-game-access';
import { User, type UserDocument } from '../auth/schemas/user.schema';
import type { UserRole } from '../auth/schemas/user-role';
import { CreateGameChangelogDto, UpdateGameChangelogDto } from './dto';
import { normalizeGameChangelogGameId } from './game-changelog-game-id';
import { GameChangelog, type GameChangelogDocument } from './game-changelog.schema';

type AdminActor = {
    userId: string;
};

type ChangelogManager = {
    role: Extract<UserRole, 'developer' | 'admin'>;
    developerGameIds: string[] | null;
};

type SerializedGameChangelog = {
    id: string;
    gameId: string;
    title: string;
    versionLabel: string | null;
    content: string;
    published: boolean;
    pinned: boolean;
    publishedAt: Date | null;
    createdBy: string;
    updatedBy: string;
    createdAt: Date;
    updatedAt: Date;
};

type PublicGameChangelog = Omit<SerializedGameChangelog, 'createdBy' | 'updatedBy'>;

const normalizeRequiredText = (value: string, field: 'gameId' | 'title' | 'content') => {
    const normalized = field === 'gameId' ? normalizeGameChangelogGameId(value) : value.trim();
    if (!normalized) {
        throw new BadRequestException(`${field} 不能为空`);
    }
    return normalized;
};

@Injectable()
export class GameChangelogService {
    constructor(
        @InjectModel(GameChangelog.name) private readonly changelogModel: Model<GameChangelogDocument>,
        @InjectModel(User.name) private readonly userModel: Model<UserDocument>,
    ) {}

    async listPublishedByGame(gameId: string) {
        const normalizedGameId = normalizeGameChangelogGameId(gameId);
        if (!normalizedGameId) {
            return [];
        }

        const items = await this.changelogModel.find({
            gameId: normalizedGameId,
            published: true,
        }).sort({
            pinned: -1,
            publishedAt: -1,
            createdAt: -1,
        }).lean<GameChangelogDocument[]>();

        return items.map((item) => this.serializePublic(item));
    }

    async listForAdmin(actorUserId: string, gameId?: string) {
        const actor = await this.assertActorCanManage(actorUserId);
        const normalizedFilterGameId = gameId?.trim()
            ? normalizeGameChangelogGameId(gameId)
            : undefined;

        if (
            actor.developerGameIds
            && normalizedFilterGameId
            && !actor.developerGameIds.includes(normalizedFilterGameId)
        ) {
            return {
                items: [],
                availableGameIds: actor.developerGameIds,
            };
        }

        const filter: Record<string, unknown> = {};
        if (actor.developerGameIds) {
            filter.gameId = { $in: actor.developerGameIds };
        }
        if (normalizedFilterGameId) {
            filter.gameId = normalizedFilterGameId;
        }

        const items = await this.changelogModel.find(filter).sort({
            pinned: -1,
            publishedAt: -1,
            createdAt: -1,
        }).lean<GameChangelogDocument[]>();

        return {
            items: items.map((item) => this.serialize(item)),
            availableGameIds: actor.developerGameIds,
        };
    }

    async createForAdmin(actor: AdminActor, dto: CreateGameChangelogDto) {
        const manager = await this.assertActorCanManage(actor.userId);
        const gameId = normalizeRequiredText(dto.gameId, 'gameId');
        this.assertManagerCanModifyGame(manager, gameId);

        const shouldPublish = dto.published === true;
        const created = await this.changelogModel.create({
            gameId,
            title: normalizeRequiredText(dto.title, 'title'),
            versionLabel: dto.versionLabel?.trim() || null,
            content: normalizeRequiredText(dto.content, 'content'),
            pinned: dto.pinned === true,
            published: shouldPublish,
            publishedAt: shouldPublish ? new Date() : null,
            createdBy: actor.userId,
            updatedBy: actor.userId,
        });

        return this.serialize(created);
    }

    async updateForAdmin(actor: AdminActor, id: string, dto: UpdateGameChangelogDto) {
        const manager = await this.assertActorCanManage(actor.userId);
        const existing = await this.changelogModel.findById(id);
        if (!existing) {
            throw new NotFoundException('更新日志不存在');
        }

        this.assertManagerCanModifyGame(manager, normalizeGameChangelogGameId(existing.gameId));
        const nextGameId = dto.gameId !== undefined
            ? normalizeRequiredText(dto.gameId, 'gameId')
            : normalizeGameChangelogGameId(existing.gameId);
        this.assertManagerCanModifyGame(manager, nextGameId);

        if (existing.gameId !== nextGameId) {
            existing.gameId = nextGameId;
        }
        if (dto.title !== undefined) {
            existing.title = normalizeRequiredText(dto.title, 'title');
        }
        if (dto.versionLabel !== undefined) {
            existing.versionLabel = dto.versionLabel.trim() || null;
        }
        if (dto.content !== undefined) {
            existing.content = normalizeRequiredText(dto.content, 'content');
        }
        if (dto.pinned !== undefined) {
            existing.pinned = dto.pinned;
        }
        if (dto.published !== undefined) {
            const nextPublished = dto.published;
            const publishedChanged = existing.published !== nextPublished;
            existing.published = nextPublished;
            if (!nextPublished) {
                existing.publishedAt = null;
            } else if (publishedChanged || !existing.publishedAt) {
                existing.publishedAt = new Date();
            }
        }
        existing.updatedBy = actor.userId;

        await existing.save();
        return this.serialize(existing);
    }

    async deleteForAdmin(actorUserId: string, id: string) {
        const manager = await this.assertActorCanManage(actorUserId);
        const existing = await this.changelogModel.findById(id).lean<GameChangelogDocument | null>();
        if (!existing) {
            throw new NotFoundException('更新日志不存在');
        }
        this.assertManagerCanModifyGame(manager, normalizeGameChangelogGameId(existing.gameId));
        await this.changelogModel.deleteOne({ _id: id });
        return { deleted: true };
    }

    private async assertActorCanManage(actorUserId: string): Promise<ChangelogManager> {
        const actor = await this.userModel.findById(actorUserId).select('role developerGameIds').lean<{
            role: UserRole;
            developerGameIds?: string[];
        } | null>();
        if (!actor || (actor.role !== 'admin' && actor.role !== 'developer')) {
            throw new ForbiddenException('无权管理更新日志');
        }

        if (actor.role === 'admin') {
            return {
                role: actor.role,
                developerGameIds: null,
            };
        }

        const developerGameIds = normalizeDeveloperGameIds(actor.developerGameIds);
        // 兼容历史数据：未配置开发者游戏范围时按“全范围”处理，避免后台管理被错误拦截。
        if (developerGameIds.length === 0) {
            return {
                role: actor.role,
                developerGameIds: null,
            };
        }

        return {
            role: actor.role,
            developerGameIds,
        };
    }

    private assertManagerCanModifyGame(manager: ChangelogManager, gameId: string) {
        // null 表示“全范围可管理”
        if (manager.role === 'admin' || manager.developerGameIds === null) {
            return;
        }
        if (!manager.developerGameIds?.includes(gameId)) {
            throw new ForbiddenException('无权管理该游戏的更新日志');
        }
    }

    private serialize(item: Pick<
        GameChangelog,
        'gameId' | 'title' | 'versionLabel' | 'content' | 'published' | 'pinned' | 'publishedAt' | 'createdBy' | 'updatedBy' | 'createdAt' | 'updatedAt'
    > & { _id?: { toString(): string } }): SerializedGameChangelog {
        return {
            id: item._id?.toString() ?? '',
            gameId: normalizeGameChangelogGameId(item.gameId),
            title: item.title,
            versionLabel: item.versionLabel ?? null,
            content: item.content,
            published: item.published,
            pinned: item.pinned,
            publishedAt: item.publishedAt ?? null,
            createdBy: item.createdBy,
            updatedBy: item.updatedBy,
            createdAt: item.createdAt,
            updatedAt: item.updatedAt,
        };
    }

    private serializePublic(item: Pick<
        GameChangelog,
        'gameId' | 'title' | 'versionLabel' | 'content' | 'published' | 'pinned' | 'publishedAt' | 'createdBy' | 'updatedBy' | 'createdAt' | 'updatedAt'
    > & { _id?: { toString(): string } }): PublicGameChangelog {
        const { createdBy: _createdBy, updatedBy: _updatedBy, ...publicItem } = this.serialize(item);
        return publicItem;
    }
}
