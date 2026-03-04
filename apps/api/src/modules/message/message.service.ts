import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Inject, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import type { Cache } from 'cache-manager';
import { Types, type Model } from 'mongoose';
import { SocialGateway } from '../../gateways/social.gateway';
import { FriendService } from '../friend/friend.service';
import { User, type UserDocument } from '../auth/schemas/user.schema';
import { Message, type MessageDocument } from './schemas/message.schema';

const UNREAD_KEY_PREFIX = 'social:unread:';
const UNREAD_TOTAL_KEY_PREFIX = 'social:unread:total:';
const UNREAD_TTL_SECONDS = 60 * 60 * 24 * 7;

const parseCacheNumber = (value: unknown): number | null => {
    if (typeof value === 'number') return Number.isFinite(value) ? value : null;
    if (typeof value === 'string') {
        const parsed = Number(value);
        return Number.isFinite(parsed) ? parsed : null;
    }
    return null;
};

type SendMessageResult =
    | { ok: true; message: MessageDocument; toUser: UserDocument; fromUser: UserDocument }
    | { ok: false; code: 'notFriend' | 'userNotFound' | 'invalidTarget' };

@Injectable()
export class MessageService {
    constructor(
        @InjectModel(Message.name) private readonly messageModel: Model<MessageDocument>,
        @InjectModel(User.name) private readonly userModel: Model<UserDocument>,
        @Inject(FriendService) private readonly friendService: FriendService,
        @Inject(CACHE_MANAGER) private readonly cacheManager: Cache,
        @Inject(SocialGateway) private readonly socialGateway: SocialGateway
    ) {}

    async getConversationList(userId: string) {
        const currentId = new Types.ObjectId(userId);
        const results = await this.messageModel.aggregate([
            {
                $match: {
                    $or: [{ from: currentId }, { to: currentId }],
                },
            },
            {
                $addFields: {
                    otherUser: {
                        $cond: [{ $eq: ['$from', currentId] }, '$to', '$from'],
                    },
                },
            },
            { $sort: { createdAt: -1 } },
            {
                $group: {
                    _id: '$otherUser',
                    lastMessage: { $first: '$$ROOT' },
                    unreadCount: {
                        $sum: {
                            $cond: [
                                { $and: [{ $eq: ['$to', currentId] }, { $eq: ['$read', false] }] },
                                1,
                                0,
                            ],
                        },
                    },
                },
            },
            { $sort: { 'lastMessage.createdAt': -1 } },
        ]);

        if (!results.length) {
            return [] as Array<{
                user: { id: string; username: string };
                lastMessage: {
                    id: string;
                    content: string;
                    type: 'text' | 'invite';
                    inviteData?: { matchId: string; gameName: string };
                    createdAt: Date;
                    fromSelf: boolean;
                };
                unread: number;
            }>;
        }

        const userIds = results.map(item => item._id.toString());
        const users = await this.userModel.find({ _id: { $in: userIds } }).select('username').lean();
        const userMap = new Map(users.map(user => [user._id.toString(), user]));

        let totalUnread = 0;

        const conversations = await Promise.all(results.map(async item => {
            const friendId = item._id.toString();
            const friend = userMap.get(friendId);
            if (!friend) return null;

            const unreadKey = this.getUnreadKey(userId, friendId);
            const cachedUnread = parseCacheNumber(await this.cacheManager.get(unreadKey));
            const unread = cachedUnread ?? Number(item.unreadCount || 0);
            totalUnread += unread;

            if (cachedUnread === null) {
                await this.cacheManager.set(unreadKey, unread, UNREAD_TTL_SECONDS);
            }

            const lastMessage = item.lastMessage as MessageDocument & {
                from: Types.ObjectId;
                to: Types.ObjectId;
                createdAt: Date;
            };

            return {
                user: {
                    id: friend._id.toString(),
                    username: friend.username,
                },
                lastMessage: {
                    id: lastMessage._id.toString(),
                    content: lastMessage.content,
                    type: lastMessage.type,
                    inviteData: lastMessage.inviteData,
                    createdAt: lastMessage.createdAt,
                    fromSelf: lastMessage.from.toString() === userId,
                },
                unread,
            };
        }));

        await this.cacheManager.set(this.getTotalUnreadKey(userId), totalUnread, UNREAD_TTL_SECONDS);

        return conversations.filter(Boolean) as Array<{
            user: { id: string; username: string };
            lastMessage: {
                id: string;
                content: string;
                type: 'text' | 'invite';
                inviteData?: { matchId: string; gameName: string };
                createdAt: Date;
                fromSelf: boolean;
            };
            unread: number;
        }>;
    }

    async getMessageHistory(userId: string, targetUserId: string, page: number, limit: number) {
        const [targetUser, isFriend] = await Promise.all([
            this.userModel.findById(targetUserId).select('username').lean(),
            this.friendService.isFriend(userId, targetUserId),
        ]);

        if (!targetUser) {
            return { ok: false, code: 'userNotFound' } as const;
        }

        if (!isFriend) {
            return { ok: false, code: 'notFriend' } as const;
        }

        const query = {
            $or: [
                { from: userId, to: targetUserId },
                { from: targetUserId, to: userId },
            ],
        };

        const [messages, total] = await Promise.all([
            this.messageModel
                .find(query)
                .sort({ createdAt: -1 })
                .skip((page - 1) * limit)
                .limit(limit)
                .lean(),
            this.messageModel.countDocuments(query),
        ]);

        const ordered = messages.slice().reverse().map(message => ({
            id: message._id.toString(),
            from: message.from.toString(),
            to: message.to.toString(),
            content: message.content,
            type: message.type,
            inviteData: message.inviteData,
            createdAt: message.createdAt,
        }));

        return {
            ok: true,
            targetUser: {
                id: targetUser._id.toString(),
                username: targetUser.username,
            },
            messages: ordered,
            pagination: {
                page,
                limit,
                total,
            },
        } as const;
    }

    async sendMessage(fromUserId: string, toUserId: string, content: string): Promise<SendMessageResult> {
        if (fromUserId === toUserId) {
            return { ok: false, code: 'invalidTarget' };
        }

        const [fromUser, toUser, isFriend] = await Promise.all([
            this.userModel.findById(fromUserId).select('username').lean(),
            this.userModel.findById(toUserId).select('username').lean(),
            this.friendService.isFriend(fromUserId, toUserId),
        ]);

        if (!fromUser || !toUser) {
            return { ok: false, code: 'userNotFound' };
        }

        if (!isFriend) {
            return { ok: false, code: 'notFriend' };
        }

        const message = await this.messageModel.create({
            from: fromUserId,
            to: toUserId,
            content: content.trim(),
            type: 'text',
            read: false,
        });

        await this.incrementUnread(toUserId, fromUserId);

        await this.socialGateway.emitNewMessage(toUserId, {
            id: message._id.toString(),
            fromUser: {
                id: fromUserId,
                username: fromUser.username,
            },
            content: message.content,
            type: message.type,
            inviteData: message.inviteData,
            createdAt: message.createdAt?.toISOString?.() ?? new Date().toISOString(),
        });

        return { ok: true, message, toUser: toUser as UserDocument, fromUser: fromUser as UserDocument };
    }

    async sendInvite(fromUserId: string, toUserId: string, matchId: string, gameName: string): Promise<SendMessageResult> {
        if (fromUserId === toUserId) {
            return { ok: false, code: 'invalidTarget' };
        }

        const [fromUser, toUser, isFriend] = await Promise.all([
            this.userModel.findById(fromUserId).select('username').lean(),
            this.userModel.findById(toUserId).select('username').lean(),
            this.friendService.isFriend(fromUserId, toUserId),
        ]);

        if (!fromUser || !toUser) {
            return { ok: false, code: 'userNotFound' };
        }

        if (!isFriend) {
            return { ok: false, code: 'notFriend' };
        }

        const message = await this.messageModel.create({
            from: fromUserId,
            to: toUserId,
            content: `邀请加入游戏 ${gameName}`,
            type: 'invite',
            inviteData: { matchId, gameName },
            read: false,
        });

        await this.incrementUnread(toUserId, fromUserId);

        await this.socialGateway.emitGameInvite(toUserId, {
            id: message._id.toString(),
            fromUser: {
                id: fromUserId,
                username: fromUser.username,
            },
            content: message.content,
            type: message.type,
            inviteData: message.inviteData,
            createdAt: message.createdAt?.toISOString?.() ?? new Date().toISOString(),
        });

        return { ok: true, message, toUser: toUser as UserDocument, fromUser: fromUser as UserDocument };
    }

    async markRead(userId: string, targetUserId: string) {
        const [targetUser, isFriend] = await Promise.all([
            this.userModel.findById(targetUserId).select('username').lean(),
            this.friendService.isFriend(userId, targetUserId),
        ]);

        if (!targetUser) {
            return { ok: false, code: 'userNotFound' } as const;
        }

        if (!isFriend) {
            return { ok: false, code: 'notFriend' } as const;
        }

        const result = await this.messageModel.updateMany(
            { from: targetUserId, to: userId, read: false },
            { read: true }
        );

        await this.clearUnread(userId, targetUserId);

        return { ok: true, updated: result.modifiedCount ?? 0 } as const;
    }

    private getUnreadKey(userId: string, fromUserId: string) {
        return `${UNREAD_KEY_PREFIX}${userId}:${fromUserId}`;
    }

    private getTotalUnreadKey(userId: string) {
        return `${UNREAD_TOTAL_KEY_PREFIX}${userId}`;
    }

    private async incrementUnread(userId: string, fromUserId: string) {
        const key = this.getUnreadKey(userId, fromUserId);
        const totalKey = this.getTotalUnreadKey(userId);
        const current = parseCacheNumber(await this.cacheManager.get(key)) ?? 0;
        const totalCurrent = parseCacheNumber(await this.cacheManager.get(totalKey)) ?? 0;
        await this.cacheManager.set(key, current + 1, UNREAD_TTL_SECONDS);
        await this.cacheManager.set(totalKey, totalCurrent + 1, UNREAD_TTL_SECONDS);
    }

    private async clearUnread(userId: string, fromUserId: string) {
        const key = this.getUnreadKey(userId, fromUserId);
        const totalKey = this.getTotalUnreadKey(userId);
        const cachedCount = parseCacheNumber(await this.cacheManager.get(key));
        const unreadCount = cachedCount ?? await this.messageModel.countDocuments({
            from: fromUserId,
            to: userId,
            read: false,
        });

        await this.cacheManager.del(key);

        const cachedTotal = parseCacheNumber(await this.cacheManager.get(totalKey));
        if (cachedTotal !== null) {
            const nextTotal = Math.max(0, cachedTotal - unreadCount);
            await this.cacheManager.set(totalKey, nextTotal, UNREAD_TTL_SECONDS);
        } else {
            const total = await this.messageModel.countDocuments({ to: userId, read: false });
            await this.cacheManager.set(totalKey, total, UNREAD_TTL_SECONDS);
        }
    }
}
