import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Inject, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import type { Cache } from 'cache-manager';
import { Types, type Model } from 'mongoose';
import { User, type UserDocument } from '../auth/schemas/user.schema';
import { Friend, type FriendDocument } from '../friend/schemas/friend.schema';
import { Message, type MessageDocument } from '../message/schemas/message.schema';
import { Review, type ReviewDocument } from '../review/schemas/review.schema';
import type { QueryMatchesDto } from './dtos/query-matches.dto';
import type { QueryRoomsDto } from './dtos/query-rooms.dto';
import type { QueryUsersDto } from './dtos/query-users.dto';
import { MatchRecord, type MatchRecordDocument, type MatchRecordPlayer } from './schemas/match-record.schema';
import { ROOM_MATCH_MODEL_NAME, type RoomMatchDocument } from './schemas/room-match.schema';

const ADMIN_STATS_CACHE_KEY = 'admin:stats';
const ADMIN_STATS_TREND_CACHE_PREFIX = 'admin:stats:trend:';
const ADMIN_STATS_TTL_SECONDS = 300;
const RECENT_MATCH_LIMIT = 10;
const DEFAULT_TREND_DAYS = 7;
const ONLINE_KEY_PREFIX = 'social:online:';
const UNREAD_KEY_PREFIX = 'social:unread:';
const UNREAD_TOTAL_KEY_PREFIX = 'social:unread:total:';
const DELETED_USER_PLACEHOLDER = '[已删除用户]';

const escapeRegExp = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

type AdminStatsBase = {
    totalUsers: number;
    todayUsers: number;
    bannedUsers: number;
    totalMatches: number;
    todayMatches: number;
    games: Array<{ name: string; count: number }>;
};

type AdminStats = AdminStatsBase & {
    onlineUsers: number;
    activeUsers24h: number;
};

type AggregateCount = {
    _id: string | null;
    count: number;
};

type DailyStatsItem = {
    date: string;
    count: number;
};

type AdminStatsTrend = {
    days: number;
    startDate: string;
    endDate: string;
    dailyUsers: DailyStatsItem[];
    dailyMatches: DailyStatsItem[];
    games: Array<{ name: string; count: number }>;
};

type LeanUser = {
    _id: Types.ObjectId;
    username: string;
    email?: string;
    emailVerified: boolean;
    role: 'user' | 'admin';
    banned: boolean;
    bannedAt?: Date | null;
    bannedReason?: string | null;
    createdAt: Date;
    lastOnline?: Date | null;
};

type LeanMatchRecord = {
    matchID: string;
    gameName: string;
    players: MatchRecordPlayer[];
    winnerID?: string;
    createdAt: Date;
    endedAt: Date;
};

type UserListItem = {
    id: string;
    username: string;
    email?: string;
    emailVerified: boolean;
    role: 'user' | 'admin';
    banned: boolean;
    matchCount: number;
    createdAt: Date;
    lastOnline: Date | null;
};

type UserDetail = {
    user: {
        id: string;
        username: string;
        email?: string;
        emailVerified: boolean;
        role: 'user' | 'admin';
        banned: boolean;
        bannedAt: Date | null;
        bannedReason: string | null;
        createdAt: Date;
        lastOnline: Date | null;
    };
    stats: {
        totalMatches: number;
        wins: number;
        losses: number;
        draws: number;
        winRate: number;
    };
    recentMatches: Array<{
        matchID: string;
        gameName: string;
        result: string;
        opponent: string;
        endedAt: Date;
    }>;
};

type BanUserResult =
    | { ok: true; user: { id: string; username: string; banned: boolean; bannedAt: Date | null; bannedReason: string | null } }
    | { ok: false; code: 'notFound' | 'cannotBanAdmin' };

type DeleteUserResult =
    | { ok: true; user: { id: string; username: string } }
    | { ok: false; code: 'notFound' | 'cannotDeleteAdmin' };

type UserDetailResult =
    | { ok: true; data: UserDetail }
    | { ok: false; code: 'notFound' };

type MatchListItem = {
    matchID: string;
    gameName: string;
    players: MatchRecordPlayer[];
    winnerID?: string;
    createdAt: Date;
    endedAt: Date;
};

type MatchDetail = {
    matchID: string;
    gameName: string;
    players: Array<MatchRecordPlayer & { userId?: string | null }>;
    winnerID?: string;
    createdAt: Date;
    endedAt: Date;
    duration: number;
};

type RoomPlayerItem = {
    id: number;
    name?: string;
    isConnected?: boolean;
};

type RoomListItem = {
    matchID: string;
    gameName: string;
    roomName?: string;
    ownerKey?: string;
    ownerType?: 'user' | 'guest';
    isLocked: boolean;
    players: RoomPlayerItem[];
    createdAt: Date;
    updatedAt: Date;
};

type RoomMatchSetupData = {
    roomName?: string;
    ownerKey?: string;
    ownerType?: 'user' | 'guest';
    password?: string;
};

type RoomMatchLean = {
    matchID: string;
    gameName: string;
    state?: Record<string, unknown> | null;
    metadata?: Record<string, unknown> | null;
    createdAt: Date;
    updatedAt: Date;
};

const isValidStats = (value: unknown): value is AdminStatsBase => {
    if (!value || typeof value !== 'object') return false;
    const stats = value as AdminStatsBase;
    return (
        typeof stats.totalUsers === 'number'
        && typeof stats.todayUsers === 'number'
        && typeof stats.bannedUsers === 'number'
        && typeof stats.totalMatches === 'number'
        && typeof stats.todayMatches === 'number'
        && Array.isArray(stats.games)
    );
};

const isValidTrend = (value: unknown, days: number): value is AdminStatsTrend => {
    if (!value || typeof value !== 'object') return false;
    const trend = value as AdminStatsTrend;
    return (
        trend.days === days
        && typeof trend.startDate === 'string'
        && typeof trend.endDate === 'string'
        && Array.isArray(trend.dailyUsers)
        && Array.isArray(trend.dailyMatches)
        && Array.isArray(trend.games)
    );
};

@Injectable()
export class AdminService {
    constructor(
        @InjectModel(User.name) private readonly userModel: Model<UserDocument>,
        @InjectModel(Friend.name) private readonly friendModel: Model<FriendDocument>,
        @InjectModel(Message.name) private readonly messageModel: Model<MessageDocument>,
        @InjectModel(Review.name) private readonly reviewModel: Model<ReviewDocument>,
        @InjectModel(MatchRecord.name) private readonly matchRecordModel: Model<MatchRecordDocument>,
        @InjectModel(ROOM_MATCH_MODEL_NAME) private readonly roomMatchModel: Model<RoomMatchDocument>,
        @Inject(CACHE_MANAGER) private readonly cacheManager: Cache,
    ) {}

    async getStats(): Promise<AdminStats> {
        const cached = await this.cacheManager.get<AdminStatsBase>(ADMIN_STATS_CACHE_KEY);
        const baseStats = cached && isValidStats(cached)
            ? cached
            : await this.buildStatsBase();
        const onlineUserIds = await this.getOnlineUserIds();
        const [onlineUsers, activeUsers24h] = await Promise.all([
            Promise.resolve(onlineUserIds.length),
            this.countActiveUsers24h(onlineUserIds),
        ]);
        return {
            ...baseStats,
            onlineUsers,
            activeUsers24h,
        };
    }

    async getStatsTrend(days?: number): Promise<AdminStatsTrend> {
        const rangeDays = this.resolveTrendDays(days);
        const cacheKey = `${ADMIN_STATS_TREND_CACHE_PREFIX}${rangeDays}`;
        const cached = await this.cacheManager.get<AdminStatsTrend>(cacheKey);
        if (cached && isValidTrend(cached, rangeDays)) {
            return cached;
        }

        const { startDate, endDate } = this.buildTrendRange(rangeDays);
        const timezone = this.resolveTimezoneOffset();
        const dateFormat = '%Y-%m-%d';

        const [userDailyRaw, matchDailyRaw, gameStats] = await Promise.all([
            this.userModel.aggregate<AggregateCount>([
                { $match: { createdAt: { $gte: startDate, $lte: endDate } } },
                {
                    $group: {
                        _id: {
                            $dateToString: {
                                format: dateFormat,
                                date: '$createdAt',
                                timezone,
                            },
                        },
                        count: { $sum: 1 },
                    },
                },
                { $sort: { _id: 1 } },
            ]),
            this.matchRecordModel.aggregate<AggregateCount>([
                { $match: { endedAt: { $gte: startDate, $lte: endDate } } },
                {
                    $group: {
                        _id: {
                            $dateToString: {
                                format: dateFormat,
                                date: '$endedAt',
                                timezone,
                            },
                        },
                        count: { $sum: 1 },
                    },
                },
                { $sort: { _id: 1 } },
            ]),
            this.matchRecordModel.aggregate<AggregateCount>([
                { $match: { endedAt: { $gte: startDate, $lte: endDate } } },
                { $group: { _id: '$gameName', count: { $sum: 1 } } },
                { $sort: { count: -1 } },
            ]),
        ]);

        const dailyUsers = this.buildDailySeries(rangeDays, startDate, userDailyRaw);
        const dailyMatches = this.buildDailySeries(rangeDays, startDate, matchDailyRaw);

        const trend: AdminStatsTrend = {
            days: rangeDays,
            startDate: startDate.toISOString(),
            endDate: endDate.toISOString(),
            dailyUsers,
            dailyMatches,
            games: gameStats.map(item => ({
                name: String(item._id),
                count: Number(item.count || 0),
            })),
        };

        await this.cacheManager.set(cacheKey, trend, ADMIN_STATS_TTL_SECONDS);
        return trend;
    }

    async getRooms(query: QueryRoomsDto) {
        const page = query.page || 1;
        const limit = query.limit || 20;
        const filter: Record<string, unknown> = {};

        if (query.gameName) {
            const escaped = escapeRegExp(query.gameName.trim());
            filter.gameName = { $regex: `^${escaped}$`, $options: 'i' };
        }

        const [records, total] = await Promise.all([
            this.roomMatchModel
                .find(filter)
                .sort({ updatedAt: -1 })
                .skip((page - 1) * limit)
                .limit(limit)
                .select('matchID gameName metadata state createdAt updatedAt')
                .lean<RoomMatchLean[]>(),
            this.roomMatchModel.countDocuments(filter),
        ]);

        const items: RoomListItem[] = records.map(record => this.buildRoomListItem(record));

        return {
            items,
            page,
            limit,
            total,
            hasMore: page * limit < total,
        };
    }

    async destroyRoom(matchID: string): Promise<boolean> {
        const result = await this.roomMatchModel.deleteOne({ matchID });
        return (result.deletedCount ?? 0) > 0;
    }

    async getUsers(query: QueryUsersDto) {
        const page = query.page || 1;
        const limit = query.limit || 20;
        const filter: Record<string, unknown> = {};

        if (query.search) {
            const escaped = escapeRegExp(query.search.trim());
            filter.$or = [
                { username: { $regex: escaped, $options: 'i' } },
                { email: { $regex: escaped, $options: 'i' } },
            ];
        }

        if (typeof query.banned === 'boolean') {
            filter.banned = query.banned;
        }

        const [users, total] = await Promise.all([
            this.userModel
                .find(filter)
                .sort({ createdAt: -1 })
                .skip((page - 1) * limit)
                .limit(limit)
                .lean<LeanUser[]>(),
            this.userModel.countDocuments(filter),
        ]);

        const usernames = users.map(user => user.username).filter(Boolean);
        const matchCountMap = await this.buildMatchCountMap(usernames);

        const items: UserListItem[] = users.map(user => ({
            id: user._id.toString(),
            username: user.username,
            email: user.email,
            emailVerified: user.emailVerified,
            role: user.role,
            banned: user.banned,
            matchCount: matchCountMap.get(user.username) ?? 0,
            createdAt: user.createdAt,
            lastOnline: user.lastOnline ?? null,
        }));

        return {
            items,
            page,
            limit,
            total,
            hasMore: page * limit < total,
        };
    }

    async getUserDetail(userId: string): Promise<UserDetailResult> {
        const user = await this.userModel.findById(userId).lean<LeanUser | null>();
        if (!user) {
            return { ok: false, code: 'notFound' };
        }

        const [stats, recentMatches] = await Promise.all([
            this.getUserStatsByName(user.username),
            this.getRecentMatchesByName(user.username),
        ]);

        return {
            ok: true,
            data: {
                user: {
                    id: user._id.toString(),
                    username: user.username,
                    email: user.email,
                    emailVerified: user.emailVerified,
                    role: user.role,
                    banned: user.banned,
                    bannedAt: user.bannedAt ?? null,
                    bannedReason: user.bannedReason ?? null,
                    createdAt: user.createdAt,
                    lastOnline: user.lastOnline ?? null,
                },
                stats,
                recentMatches,
            },
        };
    }

    async deleteUser(userId: string): Promise<DeleteUserResult> {
        const user = await this.userModel.findById(userId).lean<LeanUser | null>();
        if (!user) {
            return { ok: false, code: 'notFound' };
        }
        if (user.role === 'admin') {
            return { ok: false, code: 'cannotDeleteAdmin' };
        }

        const username = user.username;
        await Promise.all([
            this.friendModel.deleteMany({ $or: [{ user: userId }, { friend: userId }] }),
            this.messageModel.deleteMany({ $or: [{ from: userId }, { to: userId }] }),
            this.reviewModel.deleteMany({ user: userId }),
            this.userModel.deleteOne({ _id: userId }),
            this.matchRecordModel.updateMany(
                { 'players.name': username },
                { $set: { 'players.$[player].name': DELETED_USER_PLACEHOLDER } },
                { arrayFilters: [{ 'player.name': username }] }
            ),
        ]);

        await this.cacheManager.del(`${ONLINE_KEY_PREFIX}${userId}`);
        await this.cacheManager.del(`${UNREAD_TOTAL_KEY_PREFIX}${userId}`);
        await this.removeCacheByPattern(`${UNREAD_KEY_PREFIX}${userId}:*`);
        await this.removeCacheByPattern(`${UNREAD_KEY_PREFIX}*:${userId}`);
        await this.cacheManager.del(ADMIN_STATS_CACHE_KEY);
        await this.removeCacheByPattern(`${ADMIN_STATS_TREND_CACHE_PREFIX}*`);

        return {
            ok: true,
            user: {
                id: userId,
                username,
            },
        };
    }

    async banUser(userId: string, reason: string): Promise<BanUserResult> {
        const user = await this.userModel.findById(userId).lean();
        if (!user) {
            return { ok: false, code: 'notFound' };
        }

        if (user.role === 'admin') {
            return { ok: false, code: 'cannotBanAdmin' };
        }

        const bannedAt = new Date();
        const next = await this.userModel.findByIdAndUpdate(
            userId,
            { banned: true, bannedAt, bannedReason: reason },
            { new: true }
        );

        if (!next) {
            return { ok: false, code: 'notFound' };
        }

        return {
            ok: true,
            user: {
                id: next._id.toString(),
                username: next.username,
                banned: next.banned,
                bannedAt: next.bannedAt ?? null,
                bannedReason: next.bannedReason ?? null,
            },
        };
    }

    async unbanUser(userId: string): Promise<BanUserResult> {
        const next = await this.userModel.findByIdAndUpdate(
            userId,
            { banned: false, bannedAt: null, bannedReason: null },
            { new: true }
        );

        if (!next) {
            return { ok: false, code: 'notFound' };
        }

        return {
            ok: true,
            user: {
                id: next._id.toString(),
                username: next.username,
                banned: next.banned,
                bannedAt: next.bannedAt ?? null,
                bannedReason: next.bannedReason ?? null,
            },
        };
    }

    async getMatches(query: QueryMatchesDto) {
        const page = query.page || 1;
        const limit = query.limit || 20;
        const filter: Record<string, unknown> = {};

        if (query.gameName) {
            const escaped = escapeRegExp(query.gameName.trim());
            filter.gameName = { $regex: `^${escaped}$`, $options: 'i' };
        }

        const dateRange: Record<string, Date> = {};
        if (query.startDate) {
            dateRange.$gte = new Date(query.startDate);
        }
        if (query.endDate) {
            dateRange.$lte = new Date(query.endDate);
        }
        if (Object.keys(dateRange).length > 0) {
            filter.endedAt = dateRange;
        }

        const [records, total] = await Promise.all([
            this.matchRecordModel
                .find(filter)
                .sort({ endedAt: -1 })
                .skip((page - 1) * limit)
                .limit(limit)
                .lean<LeanMatchRecord[]>(),
            this.matchRecordModel.countDocuments(filter),
        ]);

        const items: MatchListItem[] = records.map(record => ({
            matchID: record.matchID,
            gameName: record.gameName,
            players: record.players,
            winnerID: record.winnerID,
            createdAt: record.createdAt,
            endedAt: record.endedAt,
        }));

        return {
            items,
            page,
            limit,
            total,
            hasMore: page * limit < total,
        };
    }

    async getMatchDetail(matchID: string): Promise<MatchDetail | null> {
        const match = await this.matchRecordModel.findOne({ matchID }).lean<LeanMatchRecord | null>();
        if (!match) return null;

        const usernames = match.players
            .map(player => player.name)
            .filter((name): name is string => Boolean(name));
        const users = usernames.length
            ? await this.userModel
                .find({ username: { $in: usernames } })
                .select('username')
                .lean<Array<{ _id: Types.ObjectId; username: string }>>()
            : [];
        const userMap = new Map(users.map(user => [user.username, user._id.toString()]));

        const durationMs = match.endedAt && match.createdAt
            ? Math.max(0, match.endedAt.getTime() - match.createdAt.getTime())
            : 0;

        return {
            matchID: match.matchID,
            gameName: match.gameName,
            players: match.players.map(player => ({
                ...player,
                userId: player.name ? userMap.get(player.name) ?? null : null,
            })),
            winnerID: match.winnerID,
            createdAt: match.createdAt,
            endedAt: match.endedAt,
            duration: Math.round(durationMs / 1000),
        };
    }

    private async buildMatchCountMap(usernames: string[]) {
        if (!usernames.length) return new Map<string, number>();

        const results = await this.matchRecordModel.aggregate<AggregateCount>([
            { $match: { 'players.name': { $in: usernames } } },
            { $unwind: '$players' },
            { $match: { 'players.name': { $in: usernames } } },
            { $group: { _id: '$players.name', count: { $sum: 1 } } },
        ]);

        return new Map(results.map(item => [String(item._id), Number(item.count || 0)]));
    }

    private async getUserStatsByName(username: string) {
        const totalMatches = await this.matchRecordModel.countDocuments({ 'players.name': username });
        if (!totalMatches) {
            return {
                totalMatches: 0,
                wins: 0,
                losses: 0,
                draws: 0,
                winRate: 0,
            };
        }

        const results = await this.matchRecordModel.aggregate<AggregateCount>([
            { $match: { 'players.name': username } },
            { $unwind: '$players' },
            { $match: { 'players.name': username } },
            { $group: { _id: '$players.result', count: { $sum: 1 } } },
        ]);

        const resultMap = new Map(results.map(item => [String(item._id), Number(item.count || 0)]));
        const wins = resultMap.get('win') ?? 0;
        const losses = resultMap.get('loss') ?? 0;
        const draws = totalMatches - wins - losses;

        return {
            totalMatches,
            wins,
            losses,
            draws,
            winRate: totalMatches ? wins / totalMatches : 0,
        };
    }

    private async getRecentMatchesByName(username: string) {
        const records = await this.matchRecordModel
            .find({ 'players.name': username })
            .sort({ endedAt: -1 })
            .limit(RECENT_MATCH_LIMIT)
            .lean<LeanMatchRecord[]>();

        return records.map(record => {
            const current = record.players.find(player => player.name === username);
            const opponent = record.players.find(player => player.name && player.name !== username)?.name ?? '未知';
            return {
                matchID: record.matchID,
                gameName: record.gameName,
                result: current?.result ?? 'draw',
                opponent,
                endedAt: record.endedAt,
            };
        });
    }

    private async buildStatsBase(): Promise<AdminStatsBase> {
        const todayStart = new Date();
        todayStart.setHours(0, 0, 0, 0);

        const [totalUsers, todayUsers, bannedUsers, totalMatches, todayMatches, gameStats] = await Promise.all([
            this.userModel.countDocuments(),
            this.userModel.countDocuments({ createdAt: { $gte: todayStart } }),
            this.userModel.countDocuments({ banned: true }),
            this.matchRecordModel.countDocuments(),
            this.matchRecordModel.countDocuments({ endedAt: { $gte: todayStart } }),
            this.matchRecordModel.aggregate<AggregateCount>([
                { $group: { _id: '$gameName', count: { $sum: 1 } } },
                { $sort: { count: -1 } },
            ]),
        ]);

        const stats: AdminStatsBase = {
            totalUsers,
            todayUsers,
            bannedUsers,
            totalMatches,
            todayMatches,
            games: gameStats.map(item => ({
                name: String(item._id),
                count: Number(item.count || 0),
            })),
        };

        await this.cacheManager.set(ADMIN_STATS_CACHE_KEY, stats, ADMIN_STATS_TTL_SECONDS);
        return stats;
    }

    private buildRoomListItem(record: RoomMatchLean): RoomListItem {
        const metadata = record.metadata as { players?: Record<string, { name?: string; isConnected?: boolean }>; setupData?: RoomMatchSetupData } | null | undefined;
        const state = record.state as { G?: { __setupData?: RoomMatchSetupData } } | null | undefined;
        const setupDataFromMeta = metadata?.setupData;
        const setupDataFromState = state?.G?.__setupData;
        const setupData: RoomMatchSetupData = {
            roomName: setupDataFromMeta?.roomName ?? setupDataFromState?.roomName,
            ownerKey: setupDataFromMeta?.ownerKey ?? setupDataFromState?.ownerKey,
            ownerType: setupDataFromMeta?.ownerType ?? setupDataFromState?.ownerType,
            password: setupDataFromMeta?.password ?? setupDataFromState?.password,
        };
        const playersObj = metadata?.players ?? {};
        const players: RoomPlayerItem[] = Object.entries(playersObj).map(([id, data]) => ({
            id: Number(id),
            name: data?.name,
            isConnected: data?.isConnected,
        }));
        const isLocked = Boolean(setupData.password && String(setupData.password).length > 0);

        return {
            matchID: record.matchID,
            gameName: record.gameName,
            roomName: setupData.roomName,
            ownerKey: setupData.ownerKey,
            ownerType: setupData.ownerType,
            isLocked,
            players,
            createdAt: record.createdAt,
            updatedAt: record.updatedAt,
        };
    }

    private async getOnlineUserIds(): Promise<string[]> {
        const keys = await this.getCacheKeys(`${ONLINE_KEY_PREFIX}*`);
        return this.extractOnlineUserIds(keys);
    }

    private extractOnlineUserIds(keys: string[]) {
        return keys
            .filter(key => key.startsWith(ONLINE_KEY_PREFIX))
            .map(key => key.slice(ONLINE_KEY_PREFIX.length))
            .filter(Boolean);
    }

    private async removeCacheByPattern(pattern: string) {
        const keys = await this.getCacheKeys(pattern);
        if (!keys.length) return;
        const store = this.cacheManager.store as { getClient?: () => any; client?: any };
        const client = store?.getClient ? store.getClient() : store?.client;
        if (client?.del) {
            const result = client.del.length >= 2
                ? new Promise<void>((resolve, reject) => {
                    client.del(keys, (err: Error | null) => {
                        if (err) return reject(err);
                        resolve();
                    });
                })
                : client.del(keys);
            await Promise.resolve(result);
            return;
        }
        await Promise.all(keys.map(key => this.cacheManager.del(key)));
    }

    private async getCacheKeys(pattern: string): Promise<string[]> {
        const store = this.cacheManager.store as { getClient?: () => any; client?: any; keys?: (pattern: string) => Promise<string[]> | string[] };
        try {
            if (store?.getClient) {
                const client = store.getClient();
                return await this.resolveRedisKeys(client, pattern);
            }
            if (store?.client) {
                return await this.resolveRedisKeys(store.client, pattern);
            }
            if (store?.keys) {
                const keys = await Promise.resolve(store.keys(pattern));
                return Array.isArray(keys) ? keys : [];
            }
        } catch {
            return [];
        }
        return [];
    }

    private async resolveRedisKeys(client: { keys?: (...args: any[]) => any } | null, pattern: string): Promise<string[]> {
        if (!client?.keys) return [];
        const result = client.keys.length >= 2
            ? new Promise<string[]>((resolve, reject) => {
                client.keys?.(pattern, (err: Error | null, keys: string[]) => {
                    if (err) return reject(err);
                    resolve(keys);
                });
            })
            : client.keys(pattern);
        const keys = await Promise.resolve(result);
        return Array.isArray(keys) ? keys : [];
    }

    private async countActiveUsers24h(onlineUserIds: string[]): Promise<number> {
        const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
        const onlineObjectIds = onlineUserIds
            .filter(id => Types.ObjectId.isValid(id))
            .map(id => new Types.ObjectId(id));
        const conditions: Record<string, unknown>[] = [
            { lastOnline: { $gte: since } },
        ];
        if (onlineObjectIds.length > 0) {
            conditions.push({ _id: { $in: onlineObjectIds } });
        }
        return this.userModel.countDocuments({ $or: conditions });
    }

    private resolveTrendDays(days?: number) {
        return days === 30 ? 30 : DEFAULT_TREND_DAYS;
    }

    private buildTrendRange(days: number) {
        const endDate = new Date();
        endDate.setHours(23, 59, 59, 999);
        const startDate = new Date(endDate);
        startDate.setDate(startDate.getDate() - (days - 1));
        startDate.setHours(0, 0, 0, 0);
        return { startDate, endDate };
    }

    private resolveTimezoneOffset() {
        const offsetMinutes = -new Date().getTimezoneOffset();
        const sign = offsetMinutes >= 0 ? '+' : '-';
        const abs = Math.abs(offsetMinutes);
        const hours = String(Math.floor(abs / 60)).padStart(2, '0');
        const minutes = String(abs % 60).padStart(2, '0');
        return `${sign}${hours}:${minutes}`;
    }

    private buildDailySeries(days: number, startDate: Date, raw: AggregateCount[]): DailyStatsItem[] {
        const map = new Map(raw.map(item => [String(item._id), Number(item.count || 0)]));
        const items: DailyStatsItem[] = [];
        for (let index = 0; index < days; index += 1) {
            const current = new Date(startDate);
            current.setDate(startDate.getDate() + index);
            const key = this.formatDate(current);
            items.push({
                date: key,
                count: map.get(key) ?? 0,
            });
        }
        return items;
    }

    private formatDate(date: Date) {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    }
}
