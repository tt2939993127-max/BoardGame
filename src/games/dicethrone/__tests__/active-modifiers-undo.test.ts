/**
 * 攻击修正指示器撤回测试
 * 
 * 验证 scanActiveModifiers 函数的逻辑：
 * 1. 能正确扫描未结算的修正卡
 * 2. 撤回后能正确恢复剩余的修正卡
 * 3. 攻击结算后清空所有修正卡
 */

import { describe, it, expect } from 'vitest';
import { findHeroCard } from '../heroes';

// 从 useActiveModifiers 中提取的扫描函数
function scanActiveModifiers(entries: any[]) {
    let lastResolvedIndex = -1;
    for (let i = entries.length - 1; i >= 0; i--) {
        if (entries[i].event.type === 'ATTACK_RESOLVED') {
            lastResolvedIndex = i;
            break;
        }
    }

    const modifiers: any[] = [];
    const startIndex = lastResolvedIndex + 1;
    
    for (let i = startIndex; i < entries.length; i++) {
        const entry = entries[i];
        const { type, payload } = entry.event;

        if (type === 'CARD_PLAYED') {
            const p = payload as { cardId: string };
            const card = findHeroCard(p.cardId);
            if (card && card.isAttackModifier) {
                modifiers.push({
                    cardId: p.cardId,
                    eventId: entry.id,
                });
            }
        }
    }

    return modifiers;
}

describe('攻击修正指示器撤回测试', () => {
    it('能正确扫描未结算的修正卡', () => {
        const entries = [
            { id: 1, event: { type: 'CARD_PLAYED', payload: { cardId: 'card-more-please' } } },
            { id: 2, event: { type: 'CARD_PLAYED', payload: { cardId: 'card-red-hot' } } },
        ];

        const modifiers = scanActiveModifiers(entries);

        expect(modifiers).toHaveLength(2);
        expect(modifiers[0].cardId).toBe('card-more-please');
        expect(modifiers[0].eventId).toBe(1);
        expect(modifiers[1].cardId).toBe('card-red-hot');
        expect(modifiers[1].eventId).toBe(2);
    });

    it('撤回后能正确恢复剩余的修正卡', () => {
        // 模拟：打出两张卡后撤回一张
        // EventStream 回退：entries 只剩第一张卡
        const entries = [
            { id: 1, event: { type: 'CARD_PLAYED', payload: { cardId: 'card-more-please' } } },
        ];

        const modifiers = scanActiveModifiers(entries);

        expect(modifiers).toHaveLength(1);
        expect(modifiers[0].cardId).toBe('card-more-please');
        expect(modifiers[0].eventId).toBe(1);
    });

    it('攻击结算后清空所有修正卡', () => {
        const entries = [
            { id: 1, event: { type: 'CARD_PLAYED', payload: { cardId: 'card-more-please' } } },
            { id: 2, event: { type: 'CARD_PLAYED', payload: { cardId: 'card-red-hot' } } },
            { id: 3, event: { type: 'ATTACK_RESOLVED', payload: {} } },
        ];

        const modifiers = scanActiveModifiers(entries);

        // ATTACK_RESOLVED 之后没有修正卡
        expect(modifiers).toHaveLength(0);
    });

    it('攻击结算后打出新卡，能正确扫描', () => {
        const entries = [
            { id: 1, event: { type: 'CARD_PLAYED', payload: { cardId: 'card-more-please' } } },
            { id: 2, event: { type: 'ATTACK_RESOLVED', payload: {} } },
            { id: 3, event: { type: 'CARD_PLAYED', payload: { cardId: 'card-red-hot' } } },
        ];

        const modifiers = scanActiveModifiers(entries);

        // 只扫描 ATTACK_RESOLVED 之后的卡
        expect(modifiers).toHaveLength(1);
        expect(modifiers[0].cardId).toBe('card-red-hot');
        expect(modifiers[0].eventId).toBe(3);
    });

    it('忽略非攻击修正卡', () => {
        const entries = [
            { id: 1, event: { type: 'CARD_PLAYED', payload: { cardId: 'card-more-please' } } },
            { id: 2, event: { type: 'CARD_PLAYED', payload: { cardId: 'some-non-modifier-card' } } },
        ];

        const modifiers = scanActiveModifiers(entries);

        // 只有 card-more-please 是攻击修正卡
        expect(modifiers).toHaveLength(1);
        expect(modifiers[0].cardId).toBe('card-more-please');
    });
});

