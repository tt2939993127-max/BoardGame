import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Inject, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import type { Cache } from 'cache-manager';
import type { Model, Types } from 'mongoose';
import { User, type UserDocument } from '../auth/schemas/user.schema';
import type { QueryMatchesDto } from './dtos/query-matches.dto';
import type { QueryUsersDto } from './dtos/query-users.dto';
import { MatchRecord, type MatchRecordDocument, type MatchRecordPlayer } from './schemas/match-record.schema';

const ADMIN_STATS_CACHE_KEY = 'admin:stats';
const ADMIN_STATS_TTL_SECONDS = 300;
const RECENT_MATCH_LIMIT = 10;

const escapeRegExp = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

type AdminStats = {
    users: {
        total: number;
        today: number;
        banned: number;
    };
    matches: {
        total: number;
        today: number;
    };
    games: Array<{ name: string; count: number }>;
};

type AggregateCount = {
    _id: string | null;
    count: number;
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

const isValidStats = (value: unknown): value is AdminStats => {
    if (!value || typeof value !== 'object') return false;
    const stats = value as AdminStats;
    return Boolean(stats.users && stats.matches && Array.isArray(stats.games));
};

@Injectable()
export class AdminService {
    constructor(
        @InjectModel(User.name) private readonly userModel: Model<UserDocument>,
        @InjectModel(MatchRecord.name) private readonly matchRecordModel: Model<MatchRecordDocument>,
        @Inject(CACHE_MANAGER) private readonly cacheManager: Cache,
    ) {}

    async getStats(): Promise<AdminStats> {
        const cached = await this.cacheManager.get<AdminStats>(ADMIN_STATS_CACHE_KEY);
        if (cached && isValidStats(cached)) {
            return cached;
        }

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

        const stats: AdminStats = {
            users: {
                total: totalUsers,
                today: todayUsers,
                banned: bannedUsers,
            },
            matches: {
                total: totalMatches,
                today: todayMatches,
            },
            games: gameStats.map(item => ({
                name: String(item._id),
                count: Number(item.count || 0),
            })),
        };

        await this.cacheManager.set(ADMIN_STATS_CACHE_KEY, stats, ADMIN_STATS_TTL_SECONDS);
        return stats;
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
}
