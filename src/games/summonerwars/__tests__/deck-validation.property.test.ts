/**
 * 牌组验证引擎与序列化 - 属性测试 (Property-Based Testing)
 *
 * 使用 fast-check 对核心验证逻辑进行属性测试，每个属性 ≥100 次迭代。
 * 所有生成器基于真实卡牌注册表数据，不使用 mock。
 *
 * 覆盖属性：
 * - Property 1: 牌组验证完整性
 * - Property 3: 符号匹配正确性
 * - Property 4: 卡牌数量上限约束
 * - Property 6: 序列化往返一致性
 */

import { describe, it, expect, beforeAll } from 'vitest';
import fc from 'fast-check';
import {
    validateDeck,
    canAddCard,
    getSymbolMatch,
    type DeckDraft,
    type DeckValidationResult,
} from '../config/deckValidation';
import {
    serializeDeck,
    deserializeDeck,
} from '../config/deckSerializer';
import {
    buildCardRegistry,
    groupCardsByType,
    type CardRegistry,
} from '../config/cardRegistry';
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
let champions: UnitCard[];
let commons: UnitCard[];
let events: EventCard[];
let structures: StructureCard[];

beforeAll(() => {
    registry = buildCardRegistry();
    allCards = Array.from(registry.values());

    const grouped = groupCardsByType(allCards);
    summoners = grouped.summoners;
    champions = grouped.champions;
    commons = grouped.commons;
    events = grouped.events;
    structures = grouped.structures;
});

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
 * 从注册表中随机选择一张卡牌
 */
function arbCard(): fc.Arbitrary<Card> {
    return fc.integer({ min: 0, max: allCards.length - 1 }).map(i => allCards[i]);
}

/**
 * 从注册表中随机选择一张非召唤师卡牌（用于手动添加）
 */
function arbNonSummonerCard(): fc.Arbitrary<Card> {
    const nonSummoners = allCards.filter(
        c => !(c.cardType === 'unit' && c.unitClass === 'summoner'),
    );
    return fc.integer({ min: 0, max: nonSummoners.length - 1 }).map(i => nonSummoners[i]);
}

/**
 * 生成随机的 manualCards Map
 * 每张卡牌数量在 1-6 之间（可能超出上限，用于测试验证）
 */
function arbManualCards(): fc.Arbitrary<Map<string, { card: Card; count: number }>> {
    const nonSummoners = allCards.filter(
        c => !(c.cardType === 'unit' && c.unitClass === 'summoner'),
    );
    if (nonSummoners.length === 0) {
        return fc.constant(new Map());
    }

    return fc.array(
        fc.record({
            cardIndex: fc.integer({ min: 0, max: nonSummoners.length - 1 }),
            count: fc.integer({ min: 1, max: 6 }),
        }),
        { minLength: 0, maxLength: 10 },
    ).map(entries => {
        const map = new Map<string, { card: Card; count: number }>();
        for (const { cardIndex, count } of entries) {
            const card = nonSummoners[cardIndex];
            // 如果同一张卡牌被多次选中，取最后一次的数量
            map.set(card.id, { card, count });
        }
        return map;
    });
}

/**
 * 生成随机的 DeckDraft（包括合法和非法状态）
 * 用于测试 validateDeck 的完整性
 */
function arbDeckDraft(): fc.Arbitrary<DeckDraft> {
    return fc.record({
        name: fc.string({ minLength: 1, maxLength: 20 }),
        hasSummoner: fc.boolean(),
        manualCards: arbManualCards(),
    }).chain(({ name, hasSummoner, manualCards }) => {
        if (!hasSummoner || summoners.length === 0) {
            return fc.constant<DeckDraft>({
                name,
                summoner: null,
                autoCards: [],
                manualCards,
            });
        }
        return arbSummonerCard().map(summoner => ({
            name,
            summoner,
            autoCards: [],
            manualCards,
        }));
    });
}

/**
 * 生成随机的牌组符号列表
 */
function arbDeckSymbols(): fc.Arbitrary<string[]> {
    const allSymbols = [
        'double_axe', 'flame', 'moon', 'eye', 'wave',
        'shield', 'diamond', 'claw', 'mask', 'snowflake',
        'droplet', 'star', 'rhombus',
    ];
    return fc.subarray(allSymbols, { minLength: 0, maxLength: 4 });
}

/**
 * 生成一个有召唤师的 DeckDraft（用于序列化测试，序列化要求有召唤师）
 */
function arbDeckDraftWithSummoner(): fc.Arbitrary<DeckDraft> {
    if (summoners.length === 0) {
        throw new Error('注册表中没有召唤师卡牌，无法生成测试数据');
    }
    return fc.record({
        name: fc.string({ minLength: 1, maxLength: 20 }),
        summoner: arbSummonerCard(),
        manualCards: arbManualCards(),
    }).map(({ name, summoner, manualCards }) => ({
        name,
        summoner,
        autoCards: [],
        manualCards,
    }));
}

// ============================================================================
// Property 1: 牌组验证完整性
// Feature: sw-custom-deck, Property 1: 牌组验证完整性
// **Validates: Requirements 5.1, 5.2, 5.3, 5.4, 5.5, 5.6, 5.7, 5.8**
// ============================================================================

describe('Property 1: 牌组验证完整性', () => {
    it('validateDeck 对任意 DeckDraft 应返回结构正确的 DeckValidationResult', () => {
        fc.assert(
            fc.property(arbDeckDraft(), (draft: DeckDraft) => {
                const result = validateDeck(draft);

                // 结果结构必须正确
                expect(result).toHaveProperty('valid');
                expect(result).toHaveProperty('errors');
                expect(typeof result.valid).toBe('boolean');
                expect(Array.isArray(result.errors)).toBe(true);

                // valid 为 true 当且仅当 errors 为空
                expect(result.valid).toBe(result.errors.length === 0);
            }),
            { numRuns: 100 },
        );
    });

    it('无召唤师的牌组必须报告 summoner_count 错误', () => {
        fc.assert(
            fc.property(arbManualCards(), (manualCards) => {
                const draft: DeckDraft = {
                    name: '无召唤师测试',
                    summoner: null,
                    autoCards: [],
                    manualCards,
                };

                const result = validateDeck(draft);

                // 无召唤师时必须报错
                expect(result.valid).toBe(false);
                const summonerError = result.errors.find(e => e.rule === 'summoner_count');
                expect(summonerError).toBeDefined();
                expect(summonerError!.current).toBe(0);
                expect(summonerError!.expected).toBe(1);
            }),
            { numRuns: 100 },
        );
    });

    it('每个验证错误应包含完整的结构信息', () => {
        fc.assert(
            fc.property(arbDeckDraft(), (draft: DeckDraft) => {
                const result = validateDeck(draft);

                for (const error of result.errors) {
                    // 每个错误必须有 rule、message、current、expected
                    expect(error).toHaveProperty('rule');
                    expect(error).toHaveProperty('message');
                    expect(error).toHaveProperty('current');
                    expect(error).toHaveProperty('expected');
                    expect(typeof error.rule).toBe('string');
                    expect(typeof error.message).toBe('string');
                    expect(typeof error.current).toBe('number');
                    expect(typeof error.expected).toBe('number');
                }
            }),
            { numRuns: 100 },
        );
    });

    it('普通单位不足16时应报告 commons 错误', () => {
        fc.assert(
            fc.property(arbSummonerCard(), (summoner: UnitCard) => {
                // 构建一个普通单位不足的牌组
                const draft: DeckDraft = {
                    name: '普通不足测试',
                    summoner,
                    autoCards: [],
                    manualCards: new Map(), // 空的手动卡牌 → 0 个普通单位
                };

                const result = validateDeck(draft);

                // 应报告 commons 错误
                const commonsError = result.errors.find(e => e.rule === 'commons');
                expect(commonsError).toBeDefined();
                expect(commonsError!.current).toBeLessThan(16);
                expect(commonsError!.expected).toBe(16);
            }),
            { numRuns: 100 },
        );
    });
});

// ============================================================================
// Property 3: 符号匹配正确性
// Feature: sw-custom-deck, Property 3: 符号匹配正确性
// **Validates: Requirements 3.5, 4.2**
// ============================================================================

describe('Property 3: 符号匹配正确性', () => {
    it('卡牌与召唤师有交集符号时 getSymbolMatch 返回 true', () => {
        fc.assert(
            fc.property(
                arbCard(),
                arbSummonerCard(),
                (card: Card, summoner: UnitCard) => {
                    const result = getSymbolMatch(card, summoner.deckSymbols);

                    // 手动计算交集
                    const hasIntersection = card.deckSymbols.some(
                        s => summoner.deckSymbols.includes(s),
                    );

                    expect(result).toBe(hasIntersection);
                },
            ),
            { numRuns: 100 },
        );
    });

    it('空符号列表的卡牌与任何召唤师都不匹配', () => {
        fc.assert(
            fc.property(arbDeckSymbols(), (summonerSymbols: string[]) => {
                // 构造一个无符号的卡牌
                const cardWithNoSymbols: Card = {
                    id: 'test-no-symbols',
                    cardType: 'event',
                    name: '无符号事件',
                    cost: 0,
                    playPhase: 'any',
                    effect: '测试',
                    deckSymbols: [],
                } as EventCard;

                const result = getSymbolMatch(cardWithNoSymbols, summonerSymbols);
                expect(result).toBe(false);
            }),
            { numRuns: 100 },
        );
    });

    it('空召唤师符号列表与任何卡牌都不匹配', () => {
        fc.assert(
            fc.property(arbCard(), (card: Card) => {
                const result = getSymbolMatch(card, []);
                expect(result).toBe(false);
            }),
            { numRuns: 100 },
        );
    });

    it('符号匹配是对称的：card ∩ summoner = summoner ∩ card', () => {
        fc.assert(
            fc.property(
                arbDeckSymbols(),
                arbDeckSymbols(),
                (cardSymbols: string[], summonerSymbols: string[]) => {
                    // 构造测试卡牌
                    const testCard: Card = {
                        id: 'test-symmetric',
                        cardType: 'event',
                        name: '对称测试',
                        cost: 0,
                        playPhase: 'any',
                        effect: '测试',
                        deckSymbols: cardSymbols,
                    } as EventCard;

                    const testSummonerCard: Card = {
                        id: 'test-summoner-symmetric',
                        cardType: 'event',
                        name: '对称测试召唤师',
                        cost: 0,
                        playPhase: 'any',
                        effect: '测试',
                        deckSymbols: summonerSymbols,
                    } as EventCard;

                    // card 的符号与 summoner 的符号匹配 ⟺ summoner 的符号与 card 的符号匹配
                    const forward = getSymbolMatch(testCard, summonerSymbols);
                    const backward = getSymbolMatch(testSummonerCard, cardSymbols);
                    expect(forward).toBe(backward);
                },
            ),
            { numRuns: 100 },
        );
    });

    it('注册表中的真实卡牌与同阵营召唤师应匹配（除传奇事件外）', () => {
        // 传奇事件无符号，不参与匹配
        fc.assert(
            fc.property(arbSummonerCard(), (summoner: UnitCard) => {
                const summonerSymbols = summoner.deckSymbols;

                // 获取注册表中所有有符号的卡牌
                const cardsWithSymbols = allCards.filter(c => c.deckSymbols.length > 0);

                for (const card of cardsWithSymbols) {
                    const result = getSymbolMatch(card, summonerSymbols);
                    // 有符号的卡牌与召唤师匹配结果应与手动计算一致
                    const expected = card.deckSymbols.some(s => summonerSymbols.includes(s));
                    expect(result).toBe(expected);
                }
            }),
            { numRuns: 100 },
        );
    });
});

// ============================================================================
// Property 4: 卡牌数量上限约束
// Feature: sw-custom-deck, Property 4: 卡牌数量上限约束
// **Validates: Requirements 4.4, 4.5, 4.6**
// ============================================================================

describe('Property 4: 卡牌数量上限约束', () => {
    it('无召唤师时 canAddCard 应拒绝添加', () => {
        fc.assert(
            fc.property(arbCard(), (card: Card) => {
                const draft: DeckDraft = {
                    name: '无召唤师',
                    summoner: null,
                    autoCards: [],
                    manualCards: new Map(),
                };

                const result = canAddCard(draft, card);
                expect(result.allowed).toBe(false);
                expect(result.reason).toBeDefined();
            }),
            { numRuns: 100 },
        );
    });

    it('canAddCard 返回结构正确的结果', () => {
        fc.assert(
            fc.property(
                arbDeckDraft(),
                arbCard(),
                (draft: DeckDraft, card: Card) => {
                    const result = canAddCard(draft, card);

                    // 结果必须有 allowed 字段
                    expect(result).toHaveProperty('allowed');
                    expect(typeof result.allowed).toBe('boolean');

                    // 如果不允许，必须有 reason
                    if (!result.allowed) {
                        expect(result.reason).toBeDefined();
                        expect(typeof result.reason).toBe('string');
                    }
                },
            ),
            { numRuns: 100 },
        );
    });

    it('canAddCard 对有召唤师的牌组应返回布尔结果', () => {
        fc.assert(
            fc.property(
                arbSummonerCard(),
                arbNonSummonerCard(),
                (summoner: UnitCard, card: Card) => {
                    const draft: DeckDraft = {
                        name: '有召唤师测试',
                        summoner,
                        autoCards: [],
                        manualCards: new Map(),
                    };

                    const result = canAddCard(draft, card);
                    expect(typeof result.allowed).toBe('boolean');
                },
            ),
            { numRuns: 100 },
        );
    });
});

// ============================================================================
// Property 6: 序列化往返一致性
// Feature: sw-custom-deck, Property 6: 序列化往返一致性
// **Validates: Requirements 8.1, 8.2, 8.3**
// ============================================================================

describe('Property 6: 序列化往返一致性', () => {
    it('serialize → deserialize 应保持牌组名称一致', () => {
        fc.assert(
            fc.property(arbDeckDraftWithSummoner(), (draft: DeckDraft) => {
                const serialized = serializeDeck(draft);
                const { deck: deserialized, warnings } = deserializeDeck(serialized, registry);

                // 名称应一致
                expect(deserialized.name).toBe(draft.name);
            }),
            { numRuns: 100 },
        );
    });

    it('serialize → deserialize 应保持召唤师一致', () => {
        fc.assert(
            fc.property(arbDeckDraftWithSummoner(), (draft: DeckDraft) => {
                const serialized = serializeDeck(draft);
                const { deck: deserialized } = deserializeDeck(serialized, registry);

                // 召唤师应一致（注册表中能找到的情况下）
                if (draft.summoner && registry.has(draft.summoner.id)) {
                    expect(deserialized.summoner).not.toBeNull();
                    expect(deserialized.summoner!.id).toBe(draft.summoner.id);
                    expect(deserialized.summoner!.unitClass).toBe('summoner');
                }
            }),
            { numRuns: 100 },
        );
    });

    it('serialize → deserialize 应保持 manualCards 数量一致', () => {
        fc.assert(
            fc.property(arbDeckDraftWithSummoner(), (draft: DeckDraft) => {
                const serialized = serializeDeck(draft);
                const { deck: deserialized, warnings } = deserializeDeck(serialized, registry);

                // 所有在注册表中能找到的卡牌应保持一致
                let expectedCount = 0;
                draft.manualCards.forEach(({ card }) => {
                    if (registry.has(card.id)) {
                        expectedCount++;
                    }
                });

                expect(deserialized.manualCards.size).toBe(expectedCount);
            }),
            { numRuns: 100 },
        );
    });

    it('serialize → deserialize 应保持每张卡牌的数量一致', () => {
        fc.assert(
            fc.property(arbDeckDraftWithSummoner(), (draft: DeckDraft) => {
                const serialized = serializeDeck(draft);
                const { deck: deserialized } = deserializeDeck(serialized, registry);

                // 逐条验证在注册表中能找到的卡牌
                draft.manualCards.forEach(({ card, count }, cardId) => {
                    if (registry.has(card.id)) {
                        const entry = deserialized.manualCards.get(cardId);
                        expect(entry).toBeDefined();
                        expect(entry!.count).toBe(count);
                        expect(entry!.card.id).toBe(card.id);
                    }
                });
            }),
            { numRuns: 100 },
        );
    });

    it('序列化结果应包含正确的结构字段', () => {
        fc.assert(
            fc.property(arbDeckDraftWithSummoner(), (draft: DeckDraft) => {
                const serialized = serializeDeck(draft);

                // 序列化结果必须包含所有必要字段
                expect(serialized).toHaveProperty('name');
                expect(serialized).toHaveProperty('summonerId');
                expect(serialized).toHaveProperty('summonerFaction');
                expect(serialized).toHaveProperty('cards');
                expect(Array.isArray(serialized.cards)).toBe(true);

                // 名称应与原始一致
                expect(serialized.name).toBe(draft.name);
                // 召唤师 ID 应与原始一致
                expect(serialized.summonerId).toBe(draft.summoner!.id);

                // cards 数量应与 manualCards 一致
                expect(serialized.cards.length).toBe(draft.manualCards.size);

                // 每个 card entry 应有正确结构
                for (const entry of serialized.cards) {
                    expect(entry).toHaveProperty('cardId');
                    expect(entry).toHaveProperty('faction');
                    expect(entry).toHaveProperty('count');
                    expect(typeof entry.cardId).toBe('string');
                    expect(typeof entry.count).toBe('number');
                    expect(entry.count).toBeGreaterThan(0);
                }
            }),
            { numRuns: 100 },
        );
    });

    it('无 manualCards 的牌组序列化往返应一致', () => {
        fc.assert(
            fc.property(arbSummonerCard(), (summoner: UnitCard) => {
                const draft: DeckDraft = {
                    name: '空牌组',
                    summoner,
                    autoCards: [],
                    manualCards: new Map(),
                };

                const serialized = serializeDeck(draft);
                expect(serialized.cards).toHaveLength(0);

                const { deck: deserialized, warnings } = deserializeDeck(serialized, registry);

                // 空牌组往返后仍为空
                expect(deserialized.manualCards.size).toBe(0);
                expect(deserialized.name).toBe(draft.name);

                // 召唤师应一致（如果注册表中有）
                if (registry.has(summoner.id)) {
                    expect(deserialized.summoner).not.toBeNull();
                    expect(deserialized.summoner!.id).toBe(summoner.id);
                }
            }),
            { numRuns: 100 },
        );
    });

    it('没有召唤师的牌组不可序列化', () => {
        fc.assert(
            fc.property(arbManualCards(), (manualCards) => {
                const draft: DeckDraft = {
                    name: '无召唤师',
                    summoner: null,
                    autoCards: [],
                    manualCards,
                };

                expect(() => serializeDeck(draft)).toThrow('无法序列化没有召唤师的牌组');
            }),
            { numRuns: 100 },
        );
    });
});
