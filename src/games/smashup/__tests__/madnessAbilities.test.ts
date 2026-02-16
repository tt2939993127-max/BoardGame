/**
 * 大杀四方 - 疯狂卡相关能力测试
 *
 * 覆盖：
 * - 克苏鲁之仆：cthulhu_whispers_in_darkness, cthulhu_seal_is_broken, cthulhu_corruption
 * - 米斯卡塔尼克大学：miskatonic_psychological_profiling, miskatonic_mandatory_reading, miskatonic_lost_knowledge
 * - 印斯茅斯：innsmouth_recruitment
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { execute, reduce } from '../domain/reducer';
import { postProcessSystemEvents } from '../domain';
import { SU_COMMANDS, SU_EVENTS, MADNESS_CARD_DEF_ID, MADNESS_DECK_SIZE } from '../domain/types';
import type {
    SmashUpCore,
    SmashUpEvent,
    PlayerState,
    MinionOnBase,
    CardInstance,
} from '../domain/types';
import { initAllAbilities, resetAbilityInit } from '../abilities';
import { clearRegistry } from '../domain/abilityRegistry';
import { clearBaseAbilityRegistry } from '../domain/baseAbilities';
import { clearInteractionHandlers, getInteractionHandler } from '../domain/abilityInteractionHandlers';
import { applyEvents } from './helpers';
import type { MatchState, RandomFn } from '../../../engine/types';

beforeAll(() => {
    clearRegistry();
    clearBaseAbilityRegistry();
    resetAbilityInit();
    clearInteractionHandlers();
    initAllAbilities();
});

// ============================================================================
// 辅助函数
// ============================================================================

function makeMinion(uid: string, defId: string, controller: string, power: number, owner?: string): MinionOnBase {
    return {
        uid, defId, controller, owner: owner ?? controller,
        basePower: power, powerModifier: 0, talentUsed: false, attachedActions: [],
    };
}

function makeCard(uid: string, defId: string, type: 'minion' | 'action', owner: string): CardInstance {
    return { uid, defId, type, owner };
}

function makePlayer(id: string, overrides?: Partial<PlayerState>): PlayerState {
    return {
        id, vp: 0, hand: [], deck: [], discard: [],
        minionsPlayed: 0, minionLimit: 1, actionsPlayed: 0, actionLimit: 1,
        factions: ['test_a', 'test_b'] as [string, string],
        ...overrides,
    };
}

/** 创建带疯狂牌库的状态 */
function makeStateWithMadness(overrides?: Partial<SmashUpCore>): SmashUpCore {
    return {
        players: { '0': makePlayer('0'), '1': makePlayer('1') },
        turnOrder: ['0', '1'],
        currentPlayerIndex: 0,
        bases: [],
        baseDeck: [],
        turnNumber: 1,
        nextUid: 100,
        madnessDeck: Array.from({ length: MADNESS_DECK_SIZE }, () => MADNESS_CARD_DEF_ID),
        ...overrides,
    };
}

function makeMatchState(core: SmashUpCore): MatchState<SmashUpCore> {
    return { core, sys: { phase: 'playCards', interaction: { current: undefined, queue: [] } } as any } as any;
}

const defaultRandom: RandomFn = {
    shuffle: (arr: any[]) => [...arr],
    random: () => 0.5,
    d: (_max: number) => 1,
    range: (_min: number, _max: number) => _min,
};

/** 保存最近一次 execute 调用的 matchState 引用 */
let lastMatchState: MatchState<SmashUpCore> | null = null;

function execPlayAction(state: SmashUpCore, playerId: string, cardUid: string, targetBaseIndex?: number, random?: RandomFn): SmashUpEvent[] {
    const ms = makeMatchState(state);
    lastMatchState = ms;
    const events = execute(ms, {
        type: SU_COMMANDS.PLAY_ACTION, playerId,
        payload: { cardUid, targetBaseIndex },
    } as any, random ?? defaultRandom);
    
    // Call postProcessSystemEvents to trigger onPlay abilities
    return postProcessSystemEvents(state, events, random ?? defaultRandom).events;
}

/** 从最近一次 execute 的 matchState 中获取 interactions */
function getLastInteractions(): any[] {
    if (!lastMatchState) return [];
    const interaction = (lastMatchState.sys as any)?.interaction;
    if (!interaction) return [];
    const list: any[] = [];
    if (interaction.current) list.push(interaction.current);
    if (interaction.queue?.length) list.push(...interaction.queue);
    return list;
}

function applyEvents(state: SmashUpCore, events: SmashUpEvent[]): SmashUpCore {
    return events.reduce((s, e) => reduce(s, e), state);
}

// ============================================================================
// 克苏鲁之仆 - 疯狂卡能力
// ============================================================================

describe('克苏鲁之仆 - 疯狂卡能力', () => {
    describe('cthulhu_whispers_in_darkness（暗中低语：疯狂卡+2额外行动）', () => {
        it('抽1张疯狂卡并获得2个额外行动', () => {
            const state = makeStateWithMadness({
                players: {
                    '0': makePlayer('0', {
                        hand: [makeCard('a1', 'cthulhu_whispers_in_darkness', 'action', '0')],
                    }),
                    '1': makePlayer('1'),
                },
            });

            const events = execPlayAction(state, '0', 'a1');
            const madnessEvents = events.filter(e => e.type === SU_EVENTS.MADNESS_DRAWN);
            expect(madnessEvents.length).toBe(1);
            expect((madnessEvents[0] as any).payload.count).toBe(1);

            const limitEvents = events.filter(e => e.type === SU_EVENTS.LIMIT_MODIFIED);
            const actionLimits = limitEvents.filter(e => (e as any).payload.limitType === 'action');
            expect(actionLimits.length).toBe(2);
        });

        it('状态正确（reduce 验证）', () => {
            const state = makeStateWithMadness({
                players: {
                    '0': makePlayer('0', {
                        hand: [makeCard('a1', 'cthulhu_whispers_in_darkness', 'action', '0')],
                        actionLimit: 1,
                    }),
                    '1': makePlayer('1'),
                },
            });

            const events = execPlayAction(state, '0', 'a1');
            const newState = applyEvents(state, events);
            // 手牌应有1张疯狂卡
            expect(newState.players['0'].hand.filter(c => c.defId === MADNESS_CARD_DEF_ID).length).toBe(1);
            // 行动额度 = 1(原) + 2(额外) = 3
            expect(newState.players['0'].actionLimit).toBe(3);
            // 疯狂牌库减少1张
            expect(newState.madnessDeck!.length).toBe(MADNESS_DECK_SIZE - 1);
        });

        it('无疯狂牌库时仍给额外行动', () => {
            const state = makeStateWithMadness({
                players: {
                    '0': makePlayer('0', {
                        hand: [makeCard('a1', 'cthulhu_whispers_in_darkness', 'action', '0')],
                    }),
                    '1': makePlayer('1'),
                },
                madnessDeck: [], // 空牌库
            });

            const events = execPlayAction(state, '0', 'a1');
            const madnessEvents = events.filter(e => e.type === SU_EVENTS.MADNESS_DRAWN);
            expect(madnessEvents.length).toBe(0); // 无法抽取
            const limitEvents = events.filter(e => e.type === SU_EVENTS.LIMIT_MODIFIED);
            expect(limitEvents.length).toBe(2); // 仍给2个额外行动
        });
    });

    describe('cthulhu_seal_is_broken（封印已破：疯狂卡+1VP）', () => {
        it('抽1张疯狂卡并获得1VP', () => {
            const state = makeStateWithMadness({
                players: {
                    '0': makePlayer('0', {
                        hand: [makeCard('a1', 'cthulhu_seal_is_broken', 'action', '0')],
                        vp: 5,
                    }),
                    '1': makePlayer('1'),
                },
            });

            const events = execPlayAction(state, '0', 'a1');
            const madnessEvents = events.filter(e => e.type === SU_EVENTS.MADNESS_DRAWN);
            expect(madnessEvents.length).toBe(1);

            const vpEvents = events.filter(e => e.type === SU_EVENTS.VP_AWARDED);
            expect(vpEvents.length).toBe(1);
            expect((vpEvents[0] as any).payload.amount).toBe(1);
        });

        it('状态正确（reduce 验证）', () => {
            const state = makeStateWithMadness({
                players: {
                    '0': makePlayer('0', {
                        hand: [makeCard('a1', 'cthulhu_seal_is_broken', 'action', '0')],
                        vp: 5,
                    }),
                    '1': makePlayer('1'),
                },
            });

            const events = execPlayAction(state, '0', 'a1');
            const newState = applyEvents(state, events);
            expect(newState.players['0'].vp).toBe(6);
            expect(newState.players['0'].hand.filter(c => c.defId === MADNESS_CARD_DEF_ID).length).toBe(1);
        });
    });

    describe('cthulhu_corruption（腐化：疯狂卡+消灭最弱对手随从）', () => {
        it('多个对手随从时创建 Prompt 选择目标', () => {
            const state = makeStateWithMadness({
                players: {
                    '0': makePlayer('0', {
                        hand: [makeCard('a1', 'cthulhu_corruption', 'action', '0')],
                    }),
                    '1': makePlayer('1'),
                },
                bases: [{
                    defId: 'b1', minions: [
                        makeMinion('m1', 'test', '1', 2),
                        makeMinion('m2', 'test', '1', 5),
                        makeMinion('m3', 'test', '0', 1), // 己方，不应被消灭
                    ], ongoingActions: [],
                }],
            });

            const events = execPlayAction(state, '0', 'a1');
            const madnessEvents = events.filter(e => e.type === SU_EVENTS.MADNESS_DRAWN);
            expect(madnessEvents.length).toBe(1);

            // 多个对手随从时应创建 Interaction
            const interactions = getLastInteractions();
            expect(interactions.length).toBe(1);
            expect(interactions[0].data.sourceId).toBe('cthulhu_corruption');
        });

        it('单个对手随从时创建 Prompt', () => {
            const state = makeStateWithMadness({
                players: {
                    '0': makePlayer('0', {
                        hand: [makeCard('a1', 'cthulhu_corruption', 'action', '0')],
                    }),
                    '1': makePlayer('1'),
                },
                bases: [{
                    defId: 'b1', minions: [
                        makeMinion('m1', 'test', '1', 2),
                        makeMinion('m3', 'test', '0', 1), // 己方
                    ], ongoingActions: [],
                }],
            });

            const events = execPlayAction(state, '0', 'a1');
            const madnessEvents = events.filter(e => e.type === SU_EVENTS.MADNESS_DRAWN);
            expect(madnessEvents.length).toBe(1);

            // 单个对手随从时创建 Interaction
            const interactions = getLastInteractions();
            expect(interactions.length).toBe(1);
        });

        it('无对手随从时只抽疯狂卡', () => {
            const state = makeStateWithMadness({
                players: {
                    '0': makePlayer('0', {
                        hand: [makeCard('a1', 'cthulhu_corruption', 'action', '0')],
                    }),
                    '1': makePlayer('1'),
                },
                bases: [{
                    defId: 'b1', minions: [
                        makeMinion('m1', 'test', '0', 3), // 己方
                    ], ongoingActions: [],
                }],
            });

            const events = execPlayAction(state, '0', 'a1');
            const madnessEvents = events.filter(e => e.type === SU_EVENTS.MADNESS_DRAWN);
            expect(madnessEvents.length).toBe(1);
            const destroyEvents = events.filter(e => e.type === SU_EVENTS.MINION_DESTROYED);
            expect(destroyEvents.length).toBe(0);
        });

        it('多个对手随从时创建 Prompt（考虑力量修正）', () => {
            const state = makeStateWithMadness({
                players: {
                    '0': makePlayer('0', {
                        hand: [makeCard('a1', 'cthulhu_corruption', 'action', '0')],
                    }),
                    '1': makePlayer('1'),
                },
                bases: [{
                    defId: 'b1', minions: [
                        { ...makeMinion('m1', 'test', '1', 5), powerModifier: -3 }, // 有效力量 2
                        makeMinion('m2', 'test', '1', 3), // 有效力量 3
                    ], ongoingActions: [],
                }],
            });

            const events = execPlayAction(state, '0', 'a1');
            // 多个对手随从时应创建 Interaction
            const interactions = getLastInteractions();
            expect(interactions.length).toBe(1);
            expect(interactions[0].data.sourceId).toBe('cthulhu_corruption');
        });

        it('状态正确（reduce 验证）- 单目标时 Prompt 待决', () => {
            const state = makeStateWithMadness({
                players: {
                    '0': makePlayer('0', {
                        hand: [makeCard('a1', 'cthulhu_corruption', 'action', '0')],
                    }),
                    '1': makePlayer('1'),
                },
                bases: [{
                    defId: 'b1', minions: [
                        makeMinion('m1', 'test_m', '1', 2),
                    ], ongoingActions: [],
                }],
            });

            const events = execPlayAction(state, '0', 'a1');
            const newState = applyEvents(state, events);
            // 单目标创建 Interaction，m1 未被消灭
            const interactions = getLastInteractions();
            expect(interactions.length).toBe(1);
            expect(newState.bases[0].minions.length).toBe(1);
            // P0 手牌有疯狂卡
            expect(newState.players['0'].hand.filter(c => c.defId === MADNESS_CARD_DEF_ID).length).toBe(1);
        });
    });
});


// ============================================================================
// 米斯卡塔尼克大学 - 疯狂卡能力
// ============================================================================

describe('米斯卡塔尼克大学 - 疯狂卡能力', () => {
    describe('miskatonic_psychological_profiling（心理分析：抽2牌+疯狂卡）', () => {
        it('抽2张牌并抽1张疯狂卡', () => {
            const state = makeStateWithMadness({
                players: {
                    '0': makePlayer('0', {
                        hand: [makeCard('a1', 'miskatonic_psychological_profiling', 'action', '0')],
                        deck: [
                            makeCard('d1', 'test', 'minion', '0'),
                            makeCard('d2', 'test', 'action', '0'),
                            makeCard('d3', 'test', 'minion', '0'),
                        ],
                    }),
                    '1': makePlayer('1'),
                },
            });

            const events = execPlayAction(state, '0', 'a1');
            const drawEvents = events.filter(e => e.type === SU_EVENTS.CARDS_DRAWN);
            expect(drawEvents.length).toBe(1);
            expect((drawEvents[0] as any).payload.count).toBe(2);
            expect((drawEvents[0] as any).payload.cardUids).toEqual(['d1', 'd2']);

            const madnessEvents = events.filter(e => e.type === SU_EVENTS.MADNESS_DRAWN);
            expect(madnessEvents.length).toBe(1);
        });

        it('牌库不足2张时抽尽量多', () => {
            const state = makeStateWithMadness({
                players: {
                    '0': makePlayer('0', {
                        hand: [makeCard('a1', 'miskatonic_psychological_profiling', 'action', '0')],
                        deck: [makeCard('d1', 'test', 'minion', '0')],
                    }),
                    '1': makePlayer('1'),
                },
            });

            const events = execPlayAction(state, '0', 'a1');
            const drawEvents = events.filter(e => e.type === SU_EVENTS.CARDS_DRAWN);
            expect(drawEvents.length).toBe(1);
            expect((drawEvents[0] as any).payload.count).toBe(1);
        });

        it('状态正确（reduce 验证）', () => {
            const state = makeStateWithMadness({
                players: {
                    '0': makePlayer('0', {
                        hand: [makeCard('a1', 'miskatonic_psychological_profiling', 'action', '0')],
                        deck: [
                            makeCard('d1', 'test', 'minion', '0'),
                            makeCard('d2', 'test', 'action', '0'),
                        ],
                    }),
                    '1': makePlayer('1'),
                },
            });

            const events = execPlayAction(state, '0', 'a1');
            const newState = applyEvents(state, events);
            // 手牌：d1 + d2（抽的）+ 1张疯狂卡 = 3张
            expect(newState.players['0'].hand.length).toBe(3);
            expect(newState.players['0'].hand.some(c => c.uid === 'd1')).toBe(true);
            expect(newState.players['0'].hand.some(c => c.uid === 'd2')).toBe(true);
            expect(newState.players['0'].hand.some(c => c.defId === MADNESS_CARD_DEF_ID)).toBe(true);
            // 牌库空
            expect(newState.players['0'].deck.length).toBe(0);
        });
    });

    describe('miskatonic_mandatory_reading（强制阅读：对手抽2疯狂卡+额外行动）', () => {
        it('单对手时创建 Prompt（包含取消选项）', () => {
            const state = makeStateWithMadness({
                players: {
                    '0': makePlayer('0', {
                        hand: [makeCard('a1', 'miskatonic_mandatory_reading', 'action', '0')],
                    }),
                    '1': makePlayer('1'),
                },
            });

            const events = execPlayAction(state, '0', 'a1');
            // 单对手时创建 Prompt（不自动执行）
            const interactions = getLastInteractions();
            expect(interactions.length).toBe(1);
            expect(interactions[0].data.sourceId).toBe('miskatonic_mandatory_reading');
            
            // 验证包含取消选项
            const options = interactions[0].data.options;
            expect(options.length).toBe(2); // 1个对手 + 1个取消
            expect(options.some((opt: any) => opt.id === '__cancel__')).toBe(true);
        });

        it('选择取消时不执行任何效果', () => {
            const state = makeStateWithMadness({
                players: {
                    '0': makePlayer('0', {
                        hand: [makeCard('a1', 'miskatonic_mandatory_reading', 'action', '0')],
                    }),
                    '1': makePlayer('1'),
                },
            });

            // 先触发能力创建 Prompt
            execPlayAction(state, '0', 'a1');
            
            // 通过 handler 选择取消
            const handler = getInteractionHandler('miskatonic_mandatory_reading');
            expect(handler).toBeDefined();
            const ms = makeMatchState(state);
            const result = handler!(ms, '0', { __cancel__: true }, undefined, defaultRandom, 0);
            
            // 不应有疯狂卡或额外行动事件
            expect(result.events.length).toBe(0);
        });

        it('选择对手后执行效果', () => {
            const state = makeStateWithMadness({
                players: {
                    '0': makePlayer('0', {
                        hand: [makeCard('a1', 'miskatonic_mandatory_reading', 'action', '0')],
                    }),
                    '1': makePlayer('1'),
                },
            });

            // 先触发能力创建 Prompt
            execPlayAction(state, '0', 'a1');
            
            // 通过 handler 选择对手
            const handler = getInteractionHandler('miskatonic_mandatory_reading');
            expect(handler).toBeDefined();
            const ms = makeMatchState(state);
            const result = handler!(ms, '0', { pid: '1' }, undefined, defaultRandom, 0);
            
            const madnessEvents = result.events.filter(e => e.type === SU_EVENTS.MADNESS_DRAWN);
            expect(madnessEvents.length).toBe(1);
            expect((madnessEvents[0] as any).payload.playerId).toBe('1');
            expect((madnessEvents[0] as any).payload.count).toBe(2);

            const limitEvents = result.events.filter(e => e.type === SU_EVENTS.LIMIT_MODIFIED);
            expect(limitEvents.length).toBe(1);
            expect((limitEvents[0] as any).payload.playerId).toBe('0');
            expect((limitEvents[0] as any).payload.limitType).toBe('action');
        });

        it('状态正确（reduce 验证）', () => {
            const state = makeStateWithMadness({
                players: {
                    '0': makePlayer('0', {
                        hand: [makeCard('a1', 'miskatonic_mandatory_reading', 'action', '0')],
                        actionLimit: 1,
                    }),
                    '1': makePlayer('1'),
                },
            });

            // 先触发能力创建 Prompt
            execPlayAction(state, '0', 'a1');
            
            // 通过 handler 选择对手并 apply 事件
            const handler = getInteractionHandler('miskatonic_mandatory_reading');
            const ms = makeMatchState(state);
            const result = handler!(ms, '0', { pid: '1' }, undefined, defaultRandom, 0);
            const newState = applyEvents(state, result.events);
            
            // P1 手牌有2张疯狂卡
            expect(newState.players['1'].hand.filter(c => c.defId === MADNESS_CARD_DEF_ID).length).toBe(2);
            // P0 行动额度 +1
            expect(newState.players['0'].actionLimit).toBe(2);
            // 疯狂牌库减少2张
            expect(newState.madnessDeck!.length).toBe(MADNESS_DECK_SIZE - 2);
        });

        it('3人游戏中创建 Prompt 选择对手', () => {
            const state = makeStateWithMadness({
                players: {
                    '0': makePlayer('0', {
                        hand: [makeCard('a1', 'miskatonic_mandatory_reading', 'action', '0')],
                    }),
                    '1': makePlayer('1'),
                    '2': makePlayer('2'),
                },
                turnOrder: ['0', '1', '2'],
            });

            const events = execPlayAction(state, '0', 'a1');
            // 多个对手时创建 Interaction 选择，不直接产生 MADNESS_DRAWN
            const interactions = getLastInteractions();
            expect(interactions.length).toBeGreaterThanOrEqual(1);
            expect(interactions[0]?.data?.sourceId).toBe('miskatonic_mandatory_reading');
        });
    });

    describe('miskatonic_lost_knowledge（失落的知识：手中≥2疯狂卡时增益）', () => {
        it('手中有≥2张疯狂卡时获得增益', () => {
            const state = makeStateWithMadness({
                players: {
                    '0': makePlayer('0', {
                        hand: [
                            makeCard('a1', 'miskatonic_lost_knowledge', 'action', '0'),
                            makeCard('m1', MADNESS_CARD_DEF_ID, 'action', '0'),
                            makeCard('m2', MADNESS_CARD_DEF_ID, 'action', '0'),
                        ],
                        deck: [
                            makeCard('d1', 'test', 'minion', '0'),
                            makeCard('d2', 'test', 'action', '0'),
                        ],
                    }),
                    '1': makePlayer('1'),
                },
            });

            const events = execPlayAction(state, '0', 'a1');
            // 抽2张牌
            const drawEvents = events.filter(e => e.type === SU_EVENTS.CARDS_DRAWN);
            expect(drawEvents.length).toBe(1);
            expect((drawEvents[0] as any).payload.count).toBe(2);

            // 额外随从 + 额外行动
            const limitEvents = events.filter(e => e.type === SU_EVENTS.LIMIT_MODIFIED);
            expect(limitEvents.length).toBe(2);
            const types = limitEvents.map(e => (e as any).payload.limitType);
            expect(types).toContain('minion');
            expect(types).toContain('action');
        });

        it('手中疯狂卡不足2张时无增益', () => {
            const state = makeStateWithMadness({
                players: {
                    '0': makePlayer('0', {
                        hand: [
                            makeCard('a1', 'miskatonic_lost_knowledge', 'action', '0'),
                            makeCard('m1', MADNESS_CARD_DEF_ID, 'action', '0'), // 只有1张
                        ],
                        deck: [makeCard('d1', 'test', 'minion', '0')],
                    }),
                    '1': makePlayer('1'),
                },
            });

            const events = execPlayAction(state, '0', 'a1');
            const drawEvents = events.filter(e => e.type === SU_EVENTS.CARDS_DRAWN);
            expect(drawEvents.length).toBe(0);
            const limitEvents = events.filter(e => e.type === SU_EVENTS.LIMIT_MODIFIED);
            expect(limitEvents.length).toBe(0);
        });

        it('手中无疯狂卡时无增益', () => {
            const state = makeStateWithMadness({
                players: {
                    '0': makePlayer('0', {
                        hand: [makeCard('a1', 'miskatonic_lost_knowledge', 'action', '0')],
                        deck: [makeCard('d1', 'test', 'minion', '0')],
                    }),
                    '1': makePlayer('1'),
                },
            });

            const events = execPlayAction(state, '0', 'a1');
            const drawEvents = events.filter(e => e.type === SU_EVENTS.CARDS_DRAWN);
            expect(drawEvents.length).toBe(0);
        });

        it('状态正确（reduce 验证）', () => {
            const state = makeStateWithMadness({
                players: {
                    '0': makePlayer('0', {
                        hand: [
                            makeCard('a1', 'miskatonic_lost_knowledge', 'action', '0'),
                            makeCard('m1', MADNESS_CARD_DEF_ID, 'action', '0'),
                            makeCard('m2', MADNESS_CARD_DEF_ID, 'action', '0'),
                        ],
                        deck: [
                            makeCard('d1', 'test', 'minion', '0'),
                            makeCard('d2', 'test', 'action', '0'),
                        ],
                        minionLimit: 1,
                        actionLimit: 1,
                    }),
                    '1': makePlayer('1'),
                },
            });

            const events = execPlayAction(state, '0', 'a1');
            const newState = applyEvents(state, events);
            // 手牌：m1 + m2（疯狂卡）+ d1 + d2（抽的）= 4张
            expect(newState.players['0'].hand.length).toBe(4);
            expect(newState.players['0'].minionLimit).toBe(2);
            expect(newState.players['0'].actionLimit).toBe(2);
        });
    });
});

// ============================================================================
// 印斯茅斯 - 疯狂卡能力
// ============================================================================

describe('印斯茅斯 - 疯狂卡能力', () => {
    describe('innsmouth_recruitment（招募：抽疯狂卡换额外随从）', () => {
        it('抽3张疯狂卡并获得3个额外随从', () => {
            const state = makeStateWithMadness({
                players: {
                    '0': makePlayer('0', {
                        hand: [makeCard('a1', 'innsmouth_recruitment', 'action', '0')],
                    }),
                    '1': makePlayer('1'),
                },
            });

            execPlayAction(state, '0', 'a1');
            // 应创建选择交互
            const interactions = getLastInteractions();
            expect(interactions.length).toBeGreaterThan(0);
            const current = interactions[0];
            expect(current?.data?.sourceId).toBe('innsmouth_recruitment');

            // 通过 handler 选择抽 3 张
            const handler = getInteractionHandler('innsmouth_recruitment');
            expect(handler).toBeDefined();
            const ms = makeMatchState(state);
            const result = handler!(ms, '0', { count: 3 }, undefined, defaultRandom, 0);
            const madnessEvents = result.events.filter(e => e.type === SU_EVENTS.MADNESS_DRAWN);
            expect(madnessEvents.length).toBe(1);
            expect((madnessEvents[0] as any).payload.count).toBe(3);

            const limitEvents = result.events.filter(e => e.type === SU_EVENTS.LIMIT_MODIFIED);
            const minionLimits = limitEvents.filter(e => (e as any).payload.limitType === 'minion');
            expect(minionLimits.length).toBe(3);
        });

        it('疯狂牌库不足3张时按实际数量', () => {
            const state = makeStateWithMadness({
                players: {
                    '0': makePlayer('0', {
                        hand: [makeCard('a1', 'innsmouth_recruitment', 'action', '0')],
                    }),
                    '1': makePlayer('1'),
                },
                madnessDeck: [MADNESS_CARD_DEF_ID, MADNESS_CARD_DEF_ID], // 只有2张
            });

            execPlayAction(state, '0', 'a1');
            // 通过 handler 选择抽 3 张（实际只能抽 2 张）
            const handler = getInteractionHandler('innsmouth_recruitment');
            expect(handler).toBeDefined();
            const ms = makeMatchState(state);
            // 修改 madnessDeck 为只有 2 张
            (ms.core as any).madnessDeck = [MADNESS_CARD_DEF_ID, MADNESS_CARD_DEF_ID];
            const result = handler!(ms, '0', { count: 3 }, undefined, defaultRandom, 0);
            const madnessEvents = result.events.filter(e => e.type === SU_EVENTS.MADNESS_DRAWN);
            expect(madnessEvents.length).toBe(1);
            expect((madnessEvents[0] as any).payload.count).toBe(2); // 只能抽2张

            const limitEvents = result.events.filter(e => e.type === SU_EVENTS.LIMIT_MODIFIED);
            const minionLimits = limitEvents.filter(e => (e as any).payload.limitType === 'minion');
            expect(minionLimits.length).toBe(2); // 只有2个额外随从
        });

        it('疯狂牌库为空时无效果', () => {
            const state = makeStateWithMadness({
                players: {
                    '0': makePlayer('0', {
                        hand: [makeCard('a1', 'innsmouth_recruitment', 'action', '0')],
                    }),
                    '1': makePlayer('1'),
                },
                madnessDeck: [],
            });

            const events = execPlayAction(state, '0', 'a1');
            // 疯狂牌库为空，不创建交互
            const madnessEvents = events.filter(e => e.type === SU_EVENTS.MADNESS_DRAWN);
            expect(madnessEvents.length).toBe(0);
            const limitEvents = events.filter(e => e.type === SU_EVENTS.LIMIT_MODIFIED);
            expect(limitEvents.length).toBe(0);
        });

        it('状态正确（reduce 验证）', () => {
            const state = makeStateWithMadness({
                players: {
                    '0': makePlayer('0', {
                        hand: [makeCard('a1', 'innsmouth_recruitment', 'action', '0')],
                        minionLimit: 1,
                    }),
                    '1': makePlayer('1'),
                },
            });

            // 通过 handler 验证 reduce
            const handler = getInteractionHandler('innsmouth_recruitment');
            expect(handler).toBeDefined();
            const ms = makeMatchState(state);
            const result = handler!(ms, '0', { count: 3 }, undefined, defaultRandom, 0);
            // 先 apply ACTION_PLAYED 事件
            const playEvents: SmashUpEvent[] = [
                { type: SU_EVENTS.ACTION_PLAYED, payload: { playerId: '0', cardUid: 'a1', defId: 'innsmouth_recruitment' }, timestamp: 0 } as any,
                ...result.events,
            ];
            const newState = applyEvents(state, playEvents);
            // 手牌有3张疯狂卡
            expect(newState.players['0'].hand.filter(c => c.defId === MADNESS_CARD_DEF_ID).length).toBe(3);
            // 随从额度 = 1(原) + 3(额外) = 4
            expect(newState.players['0'].minionLimit).toBe(4);
            // 疯狂牌库减少3张
            expect(newState.madnessDeck!.length).toBe(MADNESS_DECK_SIZE - 3);
        });
    });
});
