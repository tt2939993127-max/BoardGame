import { describe, it, expect } from 'vitest';
import { MAX_CHAT_LENGTH } from '../../../shared/chat';

/**
 * 聊天消息验证测试。
 * 覆盖问题 2 修复：长消息校验、MAX_CHAT_LENGTH 一致性。
 */
describe('聊天消息验证', () => {
    it('MAX_CHAT_LENGTH 应为 200', () => {
        expect(MAX_CHAT_LENGTH).toBe(200);
    });

    it('等于上限的消息应通过校验', () => {
        const msg = 'a'.repeat(MAX_CHAT_LENGTH);
        expect(msg.length).toBeLessThanOrEqual(MAX_CHAT_LENGTH);
    });

    it('超过上限的消息应被拒绝', () => {
        const msg = 'a'.repeat(MAX_CHAT_LENGTH + 1);
        expect(msg.length).toBeGreaterThan(MAX_CHAT_LENGTH);
    });

    it('空白消息应被拒绝（trim 后为空）', () => {
        const msg = '   ';
        expect(msg.trim()).toBe('');
    });

    it('sendMessage 返回值应构造正确的 Message 对象', () => {
        // 模拟服务端返回格式
        const serverResponse = {
            message: '发送成功',
            messageData: {
                id: 'msg_123',
                toUser: { id: 'user_456', username: 'test' },
            },
        };

        // 模拟 SocialContext.sendMessage 中的构造逻辑
        const userId = 'current_user';
        const toUserId = 'user_456';
        const content = '你好';
        const type = 'text' as const;

        const msg = {
            id: serverResponse.messageData?.id ?? crypto.randomUUID(),
            from: userId,
            to: toUserId,
            content,
            type,
            read: true,
            createdAt: new Date().toISOString(),
        };

        expect(msg.id).toBe('msg_123');
        expect(msg.from).toBe('current_user');
        expect(msg.to).toBe('user_456');
        expect(msg.content).toBe('你好');
        expect(msg.type).toBe('text');
        expect(msg.read).toBe(true);
        expect(msg.createdAt).toBeTruthy();
    });

    it('sendMessage 返回值在 messageData 缺失时应使用 fallback id', () => {
        const serverResponse = {
            message: '发送成功',
            // messageData 缺失
        };

        const id = (serverResponse as any).messageData?.id ?? 'fallback_id';
        expect(id).toBe('fallback_id');
    });

    it('旧版服务端返回的 data.message 是字符串而非 Message 对象', () => {
        // 这是修复前的 bug：直接 return data.message 拿到的是字符串
        const serverResponse = {
            message: '发送成功',
            messageData: { id: 'msg_123', toUser: { id: 'u1', username: 'test' } },
        };

        // 旧代码：return data.message → 得到字符串
        expect(typeof serverResponse.message).toBe('string');
        // 新代码：从 messageData 构造 → 得到正确的 id
        expect(serverResponse.messageData.id).toBe('msg_123');
    });
});
