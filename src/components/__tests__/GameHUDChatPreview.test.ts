import { describe, expect, it } from 'vitest';
import type { MatchChatMessage } from '../../services/matchSocket';
import { getLatestIncomingMessage, isSelfChatMessage, trimChatMessages } from '../game/framework/widgets/GameHUD';

const buildMessage = (override: Partial<MatchChatMessage> = {}): MatchChatMessage => ({
    id: 'msg-1',
    matchId: 'room-1',
    senderId: '1',
    senderName: '玩家1',
    text: '你好',
    createdAt: '2025-01-01T00:00:00.000Z',
    ...override,
});

describe('GameHUD chat preview helpers', () => {
    it('isSelfChatMessage 使用 senderId 判断自身消息', () => {
        const message = buildMessage({ senderId: '2', senderName: '玩家2' });
        expect(isSelfChatMessage(message, '2', '玩家1')).toBe(true);
        expect(isSelfChatMessage(message, '1', '玩家1')).toBe(false);
    });

    it('isSelfChatMessage 使用 senderName 判断自身消息', () => {
        const message = buildMessage({ senderId: undefined, senderName: '玩家A' });
        expect(isSelfChatMessage(message, '1', '玩家A')).toBe(true);
        expect(isSelfChatMessage(message, '1', '玩家B')).toBe(false);
    });

    it('getLatestIncomingMessage 返回最新的非自身消息', () => {
        const messages = [
            buildMessage({ id: 'msg-1', senderId: '1', senderName: '玩家1', text: '我发的' }),
            buildMessage({ id: 'msg-2', senderId: '2', senderName: '玩家2', text: '对方1' }),
            buildMessage({ id: 'msg-3', senderId: '1', senderName: '玩家1', text: '我发的2' }),
            buildMessage({ id: 'msg-4', senderId: '3', senderName: '玩家3', text: '对方2' }),
        ];
        const latest = getLatestIncomingMessage(messages, '1', '玩家1');
        expect(latest?.id).toBe('msg-4');
    });

    it('getLatestIncomingMessage 无非自身消息时返回 null', () => {
        const messages = [
            buildMessage({ id: 'msg-1', senderId: '1', senderName: '玩家1', text: '我发的' }),
            buildMessage({ id: 'msg-2', senderId: '1', senderName: '玩家1', text: '我发的2' }),
        ];
        const latest = getLatestIncomingMessage(messages, '1', '玩家1');
        expect(latest).toBeNull();
    });

    it('trimChatMessages 超过上限时保留最新消息', () => {
        const messages = [
            buildMessage({ id: 'msg-1' }),
            buildMessage({ id: 'msg-2' }),
            buildMessage({ id: 'msg-3' }),
            buildMessage({ id: 'msg-4' }),
        ];
        const trimmed = trimChatMessages(messages, 3);
        expect(trimmed.map((msg) => msg.id)).toEqual(['msg-2', 'msg-3', 'msg-4']);
    });

    it('trimChatMessages 未超过上限时保持原数组', () => {
        const messages = [
            buildMessage({ id: 'msg-1' }),
            buildMessage({ id: 'msg-2' }),
        ];
        const trimmed = trimChatMessages(messages, 3);
        expect(trimmed).toEqual(messages);
    });
});
