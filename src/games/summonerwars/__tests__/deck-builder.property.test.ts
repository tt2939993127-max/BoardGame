/**
 * useDeckBuilder 核心逻辑 - 属性测试 (Property-Based Testing)
 *
 * 使用 fast-check 对牌组构建核心逻辑进行属性测试，每个属性 ≥100 次迭代。
 * 测试纯函数逻辑（不依赖 React），基于真实卡牌注册表数据。
 *
 * 覆盖属性：
 * - Property 2: 召唤师选择自动填充
 * - Property 5: 添加/移除卡牌往返一致性
 */

import { describe, it, expect, beforeAll } from 'vitest';
import fc from 'fast-check';
import {
    buildCardRegistry,
    getCardPoolByFaction,
    groupCardsByType,
    type CardRegistry,
} from '../config/cardRegistry';
import {
    type DeckDraft,
    canAddCard,
    getSymbolMatch,
} from '../config/deckValidation';
import type {
    Card,
    UnitCard,
    EventCard,
    StructureCard,
    FactionId,
} from '../domain/types';

// ============================================================================
// 测试前准备：构建卡牌注册表
// ============================================================================

let registry: CardRegistry;
let allCards: Card[];
let summoners: UnitCard[];

beforeAll(() => {
    registry = buildCardRegistry();
    allCards = Array.from(registry.values());

    summoners = allCards.filter(
        (c): c is UnitCard => c.cardType === 'unit' && c.unitClass === 'summoner',
    );
});

// ============================================================================
// 辅助函数：复现 useDeckBuilder 中的 buildAutoCards 逻辑
// ============================================================================

/**
 * 复现 useDeckBuilder.ts 中 buildAutoCards 的逻辑
 * 用于测试属性 2（召唤师选择自动填充）
 *
 * 包含：
 * - 该召唤师阵营的起始单位（前2个普通单位）
 * - 该召唤师阵营的史诗事件（eventType === 'legendary'）
 * - 1个十生命城门（isStartingGate === true）
 * - 3个五生命城门（isGate === true && !isStartingGate）
 */
function buildAutoCards(summoner: UnitCard): Card[] {
    const factionId = summoner.faction as FactionId;
    const pool = getCardPoolByFaction(factionId);
    const groups = groupCardsByType(pool);
    const autoCards: Card[] = [];

    // 起始单位：从该阵营的普通单位中取前2个
    const startingCommons = groups.commons.slice(0, 2);
    autoCards.push(...startingCommons);

    // 史诗事件（legendary 类型）
    const epicEvents = groups.events.filter(e => e.eventType === 'legendary');
    autoCards.push(...epicEvents);

    // 城门：1个十生命起始城门 + 3个五生命城门
    const startingGate = groups.structures.find(s => s.isGate && s.isStartingGate);
    const normalGates = groups.structures.filter(s => s.isGate && !s.isStartingGate);

    if (startingGate) {
        autoCards.push(startingGate);
    }
    // 添加3个五生命城门
    for (let i = 0; i < 3 && normalGates.length > 0; i++) {
        autoCards.push({ ...normalGates[0], id: `${normalGates[0].id}-auto-${i}` });
    }

    return autoCards;
}

/**
 * 模拟 useDeckBuilder 中 addCard 的纯逻辑部分
 * 返回更新后的 manualCards Map
 */
function simulateAddCard(
    draft: DeckDraft,
    card: Card,
): { success: boolean; newManualCards: Map<string, { card: Card; count: number }> } {
    // 检查是否可以添加
    const check = canAddCard(draft, card);
    if (!check.allowed) {
        return { success: false, newManualCards: draft.manualCards };
    }

    // 符号匹配检查
    if (draft.summoner && !getSymbolMatch(card, draft.summoner.deckSymbols)) {
        return { success: false, newManualCards: draft.manualCards };
    }

    const newMap = new Map(draft.manualCards);
    const existing = newMap.get(card.id);
    if (existing) {
        newMap.set(card.id, { card, count: existing.count + 1 });
    } else {
        newMap.set(card.id, { card, count: 1 });
    }

    return { success: true, newManualCards: newMap };
}

/**
 * 模拟 useDeckBuilder 中 removeCard 的纯逻辑部分
 * 返回更新后的 manualCards Map
 */
function simulateRemoveCard(
    manualCards: Map<string, { card: Card; count: number }>,
    cardId: string,
): Map<string, { card: Card; count: number }> {
    const newMap = new Map(manualCards);
    const existing = newMap.get(cardId);
    if (!existing) return newMap;

    if (existing.count > 1) {
        newMap.set(cardId, { ...existing, count: existing.count - 1 });
    } else {
        newMap.delete(cardId);
    }
    return newMap;
}

// ============================================================================
// 生成器（Arbitraries）
// ============================================================================

/**
 * 从注册表中随机选择一个召唤师卡牌
 */
function arbSummonerCard(): fc.Arbitrary<UnitCard> {
    return fc.integer({ min: 0, max: summoners.length - 1 }).map(i => summoners[i]);
}

/**
 * 生成一个有召唤师的空 DeckDraft（用于添加/移除测试）
 */
function arbEmptyDeckWithSummoner(): fc.Arbitrary<DeckDraft> {
    return arbSummonerCard().map(summoner => ({
        name: '测试牌组',
        summoner,
        autoCards: buildAutoCards(summoner),
        manualCards: new Map(),
    }));
}

/**
 * 从注册表中随机选择一张可手动添加的卡牌（非召唤师、非城门）
 * 这些是用户在牌组构建中可以手动添加的卡牌类型
 */
function arbAddableCard(): fc.Arbitrary<Card> {
    const addable = allCards.filter(c => {
        // 排除召唤师（自动填充）
        if (c.cardType === 'unit' && c.unitClass === 'summoner') return false;
        // 排除城门（自动填充）
        if (c.cardType === 'structure' && (c as StructureCard).isGate) return false;
        return true;
    });
    if (addable.length === 0) {
        // 如果没有可添加的卡牌（不太可能），返回第一张非召唤师卡牌
        const fallback = allCards.filter(
            c => !(c.cardType === 'unit' && c.unitClass === 'summoner'),
        );
        return fc.constant(fallback[0]);
    }
    return fc.integer({ min: 0, max: addable.length - 1 }).map(i => addable[i]);
}

/**
 * 生成一个有召唤师的 DeckDraft，并附带与召唤师符号匹配的可添加卡牌
 * 确保生成的卡牌一定能被添加到牌组中
 */
function arbDraftWithMatchingCard(): fc.Arbitrary<{ draft: DeckDraft; card: Card }> {
    return arbSummonerCard().chain(summoner => {
        const summonerSymbols = summoner.deckSymbols;

        // 找到所有与该召唤师符号匹配的可添加卡牌
        const matchingCards = allCards.filter(c => {
            // 排除召唤师和城门
            if (c.cardType === 'unit' && c.unitClass === 'summoner') return false;
            if (c.cardType === 'structure' && (c as StructureCard).isGate) return false;
            // 必须符号匹配
            return getSymbolMatch(c, summonerSymbols);
        });

        if (matchingCards.length === 0) {
            // 如果没有匹配的卡牌，跳过此召唤师（不太可能发生）
            return fc.constant({
                draft: {
                    name: '测试牌组',
                    summoner,
                    autoCards: buildAutoCards(summoner),
                    manualCards: new Map(),
                } as DeckDraft,
                card: allCards[0], // 占位，测试中会检查 success
            });
        }

        return fc.integer({ min: 0, max: matchingCards.length - 1 }).map(cardIdx => ({
            draft: {
                name: '测试牌组',
                summoner,
                autoCards: buildAutoCards(summoner),
                manualCards: new Map(),
            } as DeckDraft,
            card: matchingCards[cardIdx],
        }));
    });
}

// ============================================================================
// Property 2: 召唤师选择自动填充
// Feature: sw-custom-deck, Property 2: 召唤师选择自动填充
// **Validates: Requirements 3.1, 3.2, 3.3, 3.4**
// ============================================================================

describe('Property 2: 召唤师选择自动填充', () => {
    it('选择任意召唤师后，autoCards 应包含2个起始单位', () => {
        fc.assert(
            fc.property(arbSummonerCard(), (summoner: UnitCard) => {
                const autoCards = buildAutoCards(summoner);

                // 从阵营卡牌池中获取起始单位（前2个普通单位）
                const factionId = summoner.faction as FactionId;
                const pool = getCardPoolByFaction(factionId);
                const groups = groupCardsByType(pool);
                const expectedStartingCommons = groups.commons.slice(0, 2);

                // autoCards 中应包含这些起始单位
                const startingUnitsInAuto = autoCards.filter(
                    c => c.cardType === 'unit' && (c as UnitCard).unitClass === 'common',
                );
                expect(startingUnitsInAuto.length).toBe(expectedStartingCommons.length);

                // 验证 ID 匹配
                for (const expected of expectedStartingCommons) {
                    const found = startingUnitsInAuto.find(c => c.id === expected.id);
                    expect(found).toBeDefined();
                }
            }),
            { numRuns: 100 },
        );
    });

    it('选择任意召唤师后，autoCards 应包含史诗事件（legendary）', () => {
        fc.assert(
            fc.property(arbSummonerCard(), (summoner: UnitCard) => {
                const autoCards = buildAutoCards(summoner);

                // 从阵营卡牌池中获取史诗事件
                const factionId = summoner.faction as FactionId;
                const pool = getCardPoolByFaction(factionId);
                const groups = groupCardsByType(pool);
                const expectedEpicEvents = groups.events.filter(
                    e => e.eventType === 'legendary',
                );

                // autoCards 中应包含所有史诗事件
                const epicEventsInAuto = autoCards.filter(
                    c => c.cardType === 'event' && (c as EventCard).eventType === 'legendary',
                );
                expect(epicEventsInAuto.length).toBe(expectedEpicEvents.length);
            }),
            { numRuns: 100 },
        );
    });

    it('选择任意召唤师后，autoCards 应包含1个十生命城门和3个五生命城门', () => {
        fc.assert(
            fc.property(arbSummonerCard(), (summoner: UnitCard) => {
                const autoCards = buildAutoCards(summoner);

                // 从阵营卡牌池中获取城门信息
                const factionId = summoner.faction as FactionId;
                const pool = getCardPoolByFaction(factionId);
                const groups = groupCardsByType(pool);
                const hasStartingGate = groups.structures.some(
                    s => s.isGate && s.isStartingGate,
                );
                const hasNormalGates = groups.structures.some(
                    s => s.isGate && !s.isStartingGate,
                );

                // 城门统计
                const gatesInAuto = autoCards.filter(
                    c => c.cardType === 'structure' && (c as StructureCard).isGate,
                );
                const startingGatesInAuto = gatesInAuto.filter(
                    c => (c as StructureCard).isStartingGate,
                );
                const normalGatesInAuto = gatesInAuto.filter(
                    c => !(c as StructureCard).isStartingGate,
                );

                // 如果阵营有起始城门，应包含1个
                if (hasStartingGate) {
                    expect(startingGatesInAuto.length).toBe(1);
                }

                // 如果阵营有普通城门，应包含3个
                if (hasNormalGates) {
                    expect(normalGatesInAuto.length).toBe(3);
                }

                // 总城门数 = 1（起始）+ 3（普通）= 4（如果阵营都有的话）
                if (hasStartingGate && hasNormalGates) {
                    expect(gatesInAuto.length).toBe(4);
                }
            }),
            { numRuns: 100 },
        );
    });

    it('更换召唤师时，旧召唤师的自动卡牌应被完全替换', () => {
        // 需要至少2个不同的召唤师
        if (summoners.length < 2) return;

        fc.assert(
            fc.property(
                arbSummonerCard(),
                arbSummonerCard(),
                (summoner1: UnitCard, summoner2: UnitCard) => {
                    // 跳过相同召唤师的情况
                    fc.pre(summoner1.id !== summoner2.id);

                    const autoCards1 = buildAutoCards(summoner1);
                    const autoCards2 = buildAutoCards(summoner2);

                    // 两次自动填充的结果应独立于之前的状态
                    // 即 autoCards2 不应包含 summoner1 特有的卡牌
                    // （除非两个召唤师属于同一阵营，此时卡牌池相同）
                    if (summoner1.faction !== summoner2.faction) {
                        // 不同阵营时，autoCards 应完全不同
                        const ids1 = new Set(autoCards1.map(c => c.id));
                        const ids2 = new Set(autoCards2.map(c => c.id));

                        // 至少起始单位应不同（不同阵营的普通单位不同）
                        const startingUnits1 = autoCards1
                            .filter(c => c.cardType === 'unit')
                            .map(c => c.id);
                        const startingUnits2 = autoCards2
                            .filter(c => c.cardType === 'unit')
                            .map(c => c.id);

                        // 不同阵营的起始单位不应有交集
                        const intersection = startingUnits1.filter(
                            id => startingUnits2.includes(id),
                        );
                        expect(intersection.length).toBe(0);
                    }

                    // 无论是否同阵营，autoCards2 应是 summoner2 的正确自动填充
                    // 重新独立计算验证
                    const factionId2 = summoner2.faction as FactionId;
                    const pool2 = getCardPoolByFaction(factionId2);
                    const groups2 = groupCardsByType(pool2);
                    const expectedCommons2 = groups2.commons.slice(0, 2);

                    const unitsInAuto2 = autoCards2.filter(
                        c => c.cardType === 'unit' && (c as UnitCard).unitClass === 'common',
                    );
                    expect(unitsInAuto2.length).toBe(expectedCommons2.length);
                    for (const expected of expectedCommons2) {
                        expect(unitsInAuto2.find(c => c.id === expected.id)).toBeDefined();
                    }
                },
            ),
            { numRuns: 100 },
        );
    });

    it('autoCards 的总数量应为：起始单位 + 史诗事件 + 城门', () => {
        fc.assert(
            fc.property(arbSummonerCard(), (summoner: UnitCard) => {
                const autoCards = buildAutoCards(summoner);

                const factionId = summoner.faction as FactionId;
                const pool = getCardPoolByFaction(factionId);
                const groups = groupCardsByType(pool);

                const startingCommonsCount = Math.min(groups.commons.length, 2);
                const epicEventsCount = groups.events.filter(
                    e => e.eventType === 'legendary',
                ).length;
                const hasStartingGate = groups.structures.some(
                    s => s.isGate && s.isStartingGate,
                ) ? 1 : 0;
                const hasNormalGates = groups.structures.some(
                    s => s.isGate && !s.isStartingGate,
                ) ? 3 : 0;

                const expectedTotal = startingCommonsCount + epicEventsCount
                    + hasStartingGate + hasNormalGates;

                expect(autoCards.length).toBe(expectedTotal);
            }),
            { numRuns: 100 },
        );
    });
});

// ============================================================================
// Property 5: 添加/移除卡牌往返一致性
// Feature: sw-custom-deck, Property 5: 添加/移除卡牌往返一致性
// **Validates: Requirements 4.1, 4.3**
// ============================================================================

describe('Property 5: 添加/移除卡牌往返一致性', () => {
    it('addCard → removeCard 应恢复原始 manualCards 状态（空牌组）', () => {
        fc.assert(
            fc.property(
                arbDraftWithMatchingCard(),
                ({ draft, card }) => {
                    // 记录添加前的状态
                    const originalSize = draft.manualCards.size;

                    // 执行添加
                    const addResult = simulateAddCard(draft, card);

                    // 如果添加失败（不应该发生，因为我们选了匹配的卡牌），跳过
                    fc.pre(addResult.success);

                    // 执行移除
                    const afterRemove = simulateRemoveCard(addResult.newManualCards, card.id);

                    // 验证恢复到原始状态
                    expect(afterRemove.size).toBe(originalSize);

                    // 原始牌组是空的，移除后也应该是空的
                    expect(afterRemove.size).toBe(0);
                },
            ),
            { numRuns: 100 },
        );
    });

    it('addCard → removeCard 应恢复原始 manualCards 状态（非空牌组）', () => {
        fc.assert(
            fc.property(
                arbDraftWithMatchingCard(),
                fc.integer({ min: 1, max: 3 }),
                ({ draft, card }, preExistingCount) => {
                    // 先在牌组中预填一些该卡牌
                    const preFilledMap = new Map(draft.manualCards);
                    preFilledMap.set(card.id, { card, count: preExistingCount });
                    const preFilledDraft: DeckDraft = { ...draft, manualCards: preFilledMap };

                    // 记录添加前的状态
                    const originalCount = preExistingCount;

                    // 执行添加
                    const addResult = simulateAddCard(preFilledDraft, card);

                    // 如果添加失败（可能因为数量上限），跳过
                    fc.pre(addResult.success);

                    // 添加后数量应 +1
                    const afterAddEntry = addResult.newManualCards.get(card.id);
                    expect(afterAddEntry).toBeDefined();
                    expect(afterAddEntry!.count).toBe(originalCount + 1);

                    // 执行移除
                    const afterRemove = simulateRemoveCard(addResult.newManualCards, card.id);

                    // 验证恢复到原始数量
                    const afterRemoveEntry = afterRemove.get(card.id);
                    expect(afterRemoveEntry).toBeDefined();
                    expect(afterRemoveEntry!.count).toBe(originalCount);
                },
            ),
            { numRuns: 100 },
        );
    });

    it('addCard 后 manualCards 中该卡牌数量应 +1', () => {
        fc.assert(
            fc.property(
                arbDraftWithMatchingCard(),
                ({ draft, card }) => {
                    const originalEntry = draft.manualCards.get(card.id);
                    const originalCount = originalEntry ? originalEntry.count : 0;

                    const addResult = simulateAddCard(draft, card);
                    fc.pre(addResult.success);

                    const newEntry = addResult.newManualCards.get(card.id);
                    expect(newEntry).toBeDefined();
                    expect(newEntry!.count).toBe(originalCount + 1);
                },
            ),
            { numRuns: 100 },
        );
    });

    it('removeCard 后 manualCards 中该卡牌数量应 -1（或移除）', () => {
        fc.assert(
            fc.property(
                arbDraftWithMatchingCard(),
                fc.integer({ min: 1, max: 4 }),
                ({ draft, card }, count) => {
                    // 先在牌组中放入指定数量的卡牌
                    const map = new Map(draft.manualCards);
                    map.set(card.id, { card, count });

                    const afterRemove = simulateRemoveCard(map, card.id);

                    if (count > 1) {
                        // 数量 > 1 时，应减少1
                        const entry = afterRemove.get(card.id);
                        expect(entry).toBeDefined();
                        expect(entry!.count).toBe(count - 1);
                    } else {
                        // 数量 = 1 时，应完全移除
                        expect(afterRemove.has(card.id)).toBe(false);
                    }
                },
            ),
            { numRuns: 100 },
        );
    });

    it('removeCard 对不存在的卡牌应保持 manualCards 不变', () => {
        fc.assert(
            fc.property(
                arbEmptyDeckWithSummoner(),
                (draft) => {
                    const originalSize = draft.manualCards.size;
                    const afterRemove = simulateRemoveCard(
                        draft.manualCards,
                        'nonexistent-card-id',
                    );

                    expect(afterRemove.size).toBe(originalSize);
                },
            ),
            { numRuns: 100 },
        );
    });

    it('多次 addCard 后逐一 removeCard 应恢复原始状态', () => {
        fc.assert(
            fc.property(
                arbDraftWithMatchingCard(),
                fc.integer({ min: 1, max: 3 }),
                ({ draft, card }, addCount) => {
                    let currentMap = new Map(draft.manualCards);
                    const originalSize = currentMap.size;
                    let allAdded = true;

                    // 多次添加同一张卡牌
                    for (let i = 0; i < addCount; i++) {
                        const currentDraft: DeckDraft = { ...draft, manualCards: currentMap };
                        const result = simulateAddCard(currentDraft, card);
                        if (!result.success) {
                            allAdded = false;
                            break;
                        }
                        currentMap = result.newManualCards;
                    }

                    fc.pre(allAdded);

                    // 逐一移除
                    for (let i = 0; i < addCount; i++) {
                        currentMap = simulateRemoveCard(currentMap, card.id);
                    }

                    // 应恢复到原始状态
                    expect(currentMap.size).toBe(originalSize);
                    // 原始牌组是空的
                    expect(currentMap.has(card.id)).toBe(false);
                },
            ),
            { numRuns: 100 },
        );
    });
});
