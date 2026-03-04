import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Inject, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { SubscribeMessage, WebSocketGateway, WebSocketServer } from '@nestjs/websockets';
import type { Cache } from 'cache-manager';
import jwt from 'jsonwebtoken';
import type { Model } from 'mongoose';
import type { Server, Socket } from 'socket.io';
import { Friend, type FriendDocument } from '../modules/friend/schemas/friend.schema';
import { User, type UserDocument } from '../modules/auth/schemas/user.schema';

const JWT_SECRET = process.env.JWT_SECRET || 'boardgame-secret-key-change-in-production';
const ONLINE_TTL_SECONDS = 60;
const OFFLINE_DELAY_MS = 30000;
const ONLINE_KEY_PREFIX = 'social:online:';

export const SOCIAL_EVENTS = {
    FRIEND_ONLINE: 'social:friendOnline',
    FRIEND_OFFLINE: 'social:friendOffline',
    FRIEND_REQUEST: 'social:friendRequest',
    NEW_MESSAGE: 'social:newMessage',
    GAME_INVITE: 'social:gameInvite',
    HEARTBEAT: 'social:heartbeat',
} as const;

type JwtPayload = { userId?: string; username?: string };

@WebSocketGateway({
    path: '/social-socket',
    cors: { origin: '*', credentials: true },
})
export class SocialGateway {
    @WebSocketServer()
    server!: Server;

    private readonly logger = new Logger(SocialGateway.name);
    private readonly userSockets = new Map<string, Set<string>>();
    private readonly offlineTimers = new Map<string, NodeJS.Timeout>();

    constructor(
        @InjectModel(Friend.name) private readonly friendModel: Model<FriendDocument>,
        @InjectModel(User.name) private readonly userModel: Model<UserDocument>,
        @Inject(CACHE_MANAGER) private readonly cacheManager: Cache
    ) {}

    async handleConnection(client: Socket) {
        const userId = this.resolveUserId(client);
        if (!userId) {
            client.disconnect(true);
            return;
        }

        client.data.userId = userId;
        client.join(this.getUserRoom(userId));
        this.trackSocket(userId, client.id);
        this.clearOfflineTimer(userId);

        await this.markOnline(userId, ONLINE_TTL_SECONDS);
        await this.emitFriendStatus(userId, true);

        this.logger.log(`用户连接: ${userId} (${client.id})`);
    }

    async handleDisconnect(client: Socket) {
        const userId = client.data.userId as string | undefined;
        if (!userId) return;

        this.untrackSocket(userId, client.id);
        if ((this.userSockets.get(userId)?.size ?? 0) > 0) return;

        this.scheduleOffline(userId);
        this.logger.log(`用户断开: ${userId} (${client.id})`);
    }

    @SubscribeMessage(SOCIAL_EVENTS.HEARTBEAT)
    async handleHeartbeat(client: Socket) {
        const userId = client.data.userId as string | undefined;
        if (!userId) return;
        this.clearOfflineTimer(userId);
        await this.markOnline(userId, ONLINE_TTL_SECONDS);
    }

    async emitFriendRequest(targetUserId: string, payload: unknown) {
        this.emitToUser(targetUserId, SOCIAL_EVENTS.FRIEND_REQUEST, payload);
    }

    async emitNewMessage(targetUserId: string, payload: unknown) {
        this.emitToUser(targetUserId, SOCIAL_EVENTS.NEW_MESSAGE, payload);
    }

    async emitGameInvite(targetUserId: string, payload: unknown) {
        this.emitToUser(targetUserId, SOCIAL_EVENTS.GAME_INVITE, payload);
    }

    async isUserOnline(userId: string): Promise<boolean> {
        const value = await this.cacheManager.get(`${ONLINE_KEY_PREFIX}${userId}`);
        return Boolean(value);
    }

    private emitToUser(userId: string, event: string, payload: unknown) {
        this.server?.to(this.getUserRoom(userId)).emit(event, payload);
    }

    private getUserRoom(userId: string) {
        return `social:user:${userId}`;
    }

    private trackSocket(userId: string, socketId: string) {
        const set = this.userSockets.get(userId) ?? new Set<string>();
        set.add(socketId);
        this.userSockets.set(userId, set);
    }

    private untrackSocket(userId: string, socketId: string) {
        const set = this.userSockets.get(userId);
        if (!set) return;
        set.delete(socketId);
        if (set.size === 0) {
            this.userSockets.delete(userId);
        }
    }

    private clearOfflineTimer(userId: string) {
        const timer = this.offlineTimers.get(userId);
        if (!timer) return;
        clearTimeout(timer);
        this.offlineTimers.delete(userId);
    }

    private scheduleOffline(userId: string) {
        if (this.offlineTimers.has(userId)) return;
        void this.markOnline(userId, Math.ceil(OFFLINE_DELAY_MS / 1000));
        const timer = setTimeout(async () => {
            this.offlineTimers.delete(userId);
            if ((this.userSockets.get(userId)?.size ?? 0) > 0) return;
            await this.markOffline(userId);
            await this.updateLastOnline(userId);
            await this.emitFriendStatus(userId, false);
        }, OFFLINE_DELAY_MS);
        this.offlineTimers.set(userId, timer);
    }

    private async markOnline(userId: string, ttlSeconds: number) {
        await this.cacheManager.set(`${ONLINE_KEY_PREFIX}${userId}`, true, ttlSeconds);
    }

    private async markOffline(userId: string) {
        await this.cacheManager.del(`${ONLINE_KEY_PREFIX}${userId}`);
    }

    private async updateLastOnline(userId: string) {
        await this.userModel.findByIdAndUpdate(userId, { lastOnline: new Date() });
    }

    private async emitFriendStatus(userId: string, online: boolean) {
        const friendIds = await this.resolveFriendIds(userId);
        const event = online ? SOCIAL_EVENTS.FRIEND_ONLINE : SOCIAL_EVENTS.FRIEND_OFFLINE;
        friendIds.forEach(friendId => {
            this.emitToUser(friendId, event, { userId });
        });
    }

    private async resolveFriendIds(userId: string): Promise<string[]> {
        const relations = await this.friendModel
            .find({ status: 'accepted', $or: [{ user: userId }, { friend: userId }] })
            .lean();

        if (!relations.length) return [];

        return relations.map(relation => (
            relation.user.toString() === userId ? relation.friend.toString() : relation.user.toString()
        ));
    }

    private resolveUserId(client: Socket): string | null {
        const token = this.resolveToken(client);
        if (!token) return null;
        try {
            const payload = jwt.verify(token, JWT_SECRET) as JwtPayload;
            return payload.userId ?? null;
        } catch {
            return null;
        }
    }

    private resolveToken(client: Socket): string | null {
        const header = client.handshake.headers.authorization;
        if (typeof header === 'string' && header.startsWith('Bearer ')) {
            return header.slice(7);
        }
        const authToken = client.handshake.auth?.token;
        if (typeof authToken === 'string' && authToken) return authToken;
        return null;
    }
}
