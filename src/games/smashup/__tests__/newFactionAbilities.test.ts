/**
 * 大杀四方 - 新增派系能力测试
 *
 * 覆盖：
 * - 黑熊骑兵：bear_cavalry_bear_cavalry, bear_cavalry_youre_screwed,
 *   bear_cavalry_bear_rides_you, bear_cavalry_youre_pretty_much_borscht,
 *   bear_cavalry_bear_necessities
 * - 米斯卡塔尼克大学：miskatonic_librarian, miskatonic_professor
 * - 印斯茅斯：innsmouth_the_locals
 * - 幽灵：ghost_spirit
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { execute } from '../domain/reducer';
import { SU_COMMANDS, SU_EVENTS } from '../domain/types';
import type {
    SmashUpCore,
    PlayerState,
    MinionOnBase,
    CardInstance,
    OngoingActionOnBase,
} from '../domain/types';
import { initAllAbilities, resetAbilityInit } from '../abilities';
import { clearRegistry } from '../domain/abilityRegistry';
import { clearBaseAbilityRegistry } from '../domain/baseAbilities';
import { clearInteractionHandlers } from '../domain/abilityInteractionHandlers';
import { makeMinion, makeCard, makePlayer, makeState, makeMatchState, getInteractionsFromMS } from './helpers';
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






const defaultRandom: RandomFn = {
    shuffle: (arr: any[]) => [...arr],
    random: () => 0.5,
    d: (_max: number) => 1,
    range: (_min: number, _max: number) => _min,
};

// ============================================================================
// 黑熊骑兵派系
// ============================================================================

describe('黑熊骑兵派系能力', () => {
    describe('bear_cavalry_bear_cavalry（黑熊骑兵 onPlay）', () => {
        it('单个对手随从时创建 Prompt', () => {
            const core = makeState({
                players: {
                    '0': makePlayer('0', {
                        hand: [makeCard('c1', 'bear_cavalry_bear_cavalry', 'minion', '0')],
                    }),
                    '1': makePlayer('1'),
                },
                bases: [
                    { defId: 'base_a', minions: [makeMinion('m1', 'test', '1', 4)], ongoingActions: [] },
                    { defId: 'base_b', minions: [], ongoingActions: [] },
                ],
            });
            const state = makeMatchState(core);
            const events = execute(state,
                { type: SU_COMMANDS.PLAY_MINION, playerId: '0', payload: { cardUid: 'c1', baseIndex: 0 } },
                defaultRandom
            );
            const interactions = getInteractionsFromMS(state);
            expect(interactions.length).toBe(1);
        });

        it('本基地无对手随从时不产生移动事件', () => {
            const core = makeState({
                players: {
                    '0': makePlayer('0', {
                        hand: [makeCard('c1', 'bear_cavalry_bear_cavalry', 'minion', '0')],
                    }),
                    '1': makePlayer('1'),
                },
                bases: [
                    { defId: 'base_a', minions: [], ongoingActions: [] },
                    { defId: 'base_b', minions: [], ongoingActions: [] },
                ],
            });
            const state = makeMatchState(core);
            const events = execute(state,
                { type: SU_COMMANDS.PLAY_MINION, playerId: '0', payload: { cardUid: 'c1', baseIndex: 0 } },
                defaultRandom
            );
            expect(events.find(e => e.type === SU_EVENTS.MINION_MOVED)).toBeUndefined();
        });
    });

    describe('bear_cavalry_youre_screwed（你们已经完蛋）', () => {
        it('单个对手随从时创建 Prompt', () => {
            const core = makeState({
                players: {
                    '0': makePlayer('0', {
                        hand: [makeCard('a1', 'bear_cavalry_youre_screwed', 'action', '0')],
                    }),
                    '1': makePlayer('1'),
                },
                bases: [
                    { defId: 'base_a', minions: [makeMinion('m0', 'test', '0', 3), makeMinion('m1', 'test', '1', 5)], ongoingActions: [] },
                    { defId: 'base_b', minions: [], ongoingActions: [] },
                ],
            });
            const state = makeMatchState(core);
            const events = execute(state,
                { type: SU_COMMANDS.PLAY_ACTION, playerId: '0', payload: { cardUid: 'a1' } },
                defaultRandom
            );
            const interactions = getInteractionsFromMS(state);
            expect(interactions.length).toBe(1);
        });

        it('无己方随从时不产生移动事件', () => {
            const core = makeState({
                players: {
                    '0': makePlayer('0', {
                        hand: [makeCard('a1', 'bear_cavalry_youre_screwed', 'action', '0')],
                    }),
                    '1': makePlayer('1'),
                },
                bases: [
                    { defId: 'base_a', minions: [makeMinion('m1', 'test', '1', 5)], ongoingActions: [] },
                    { defId: 'base_b', minions: [], ongoingActions: [] },
                ],
            });
            const state = makeMatchState(core);
            const events = execute(state,
                { type: SU_COMMANDS.PLAY_ACTION, playerId: '0', payload: { cardUid: 'a1' } },
                defaultRandom
            );
            expect(events.find(e => e.type === SU_EVENTS.MINION_MOVED)).toBeUndefined();
        });
    });

    describe('bear_cavalry_bear_rides_you（与熊同行）', () => {
        it('单个己方随从时创建 Prompt', () => {
            const core = makeState({
                players: {
                    '0': makePlayer('0', {
                        hand: [makeCard('a1', 'bear_cavalry_bear_rides_you', 'action', '0')],
                    }),
                    '1': makePlayer('1'),
                },
                bases: [
                    { defId: 'base_a', minions: [makeMinion('m0', 'test', '0', 5)], ongoingActions: [] },
                    { defId: 'base_b', minions: [], ongoingActions: [] },
                ],
            });
            const state = makeMatchState(core);
            const events = execute(state,
                { type: SU_COMMANDS.PLAY_ACTION, playerId: '0', payload: { cardUid: 'a1' } },
                defaultRandom
            );
            const interactions = getInteractionsFromMS(state);
            expect(interactions.length).toBe(1);
        });

        it('无己方随从时不产生移动事件', () => {
            const core = makeState({
                players: {
                    '0': makePlayer('0', {
                        hand: [makeCard('a1', 'bear_cavalry_bear_rides_you', 'action', '0')],
                    }),
                    '1': makePlayer('1'),
                },
                bases: [
                    { defId: 'base_a', minions: [], ongoingActions: [] },
                    { defId: 'base_b', minions: [], ongoingActions: [] },
                ],
            });
            const state = makeMatchState(core);
            const events = execute(state,
                { type: SU_COMMANDS.PLAY_ACTION, playerId: '0', payload: { cardUid: 'a1' } },
                defaultRandom
            );
            expect(events.find(e => e.type === SU_EVENTS.MINION_MOVED)).toBeUndefined();
        });
    });

    describe('bear_cavalry_youre_pretty_much_borscht（你们都是美食）', () => {
        it('单个基地有对手随从时创建 Prompt', () => {
            const core = makeState({
                players: {
                    '0': makePlayer('0', {
                        hand: [makeCard('a1', 'bear_cavalry_youre_pretty_much_borscht', 'action', '0')],
                    }),
                    '1': makePlayer('1'),
                },
                bases: [
                    { defId: 'base_a', minions: [
                        makeMinion('m0', 'test', '0', 3),
                        makeMinion('m1', 'test', '1', 4),
                        makeMinion('m2', 'test', '1', 2),
                    ], ongoingActions: [] },
                    { defId: 'base_b', minions: [], ongoingActions: [] },
                ],
            });
            const state = makeMatchState(core);
            const events = execute(state,
                { type: SU_COMMANDS.PLAY_ACTION, playerId: '0', payload: { cardUid: 'a1' } },
                defaultRandom
            );
            const interactions = getInteractionsFromMS(state);
            expect(interactions.length).toBe(1);
        });
    });

    describe('bear_cavalry_bear_necessities（黑熊口粮）', () => {
        it('多个对手随从时创建 Prompt 选择目标', () => {
            const core = makeState({
                players: {
                    '0': makePlayer('0', {
                        hand: [makeCard('a1', 'bear_cavalry_bear_necessities', 'action', '0')],
                    }),
                    '1': makePlayer('1'),
                },
                bases: [
                    { defId: 'base_a', minions: [
                        makeMinion('m1', 'test', '1', 3),
                        makeMinion('m2', 'test', '1', 5),
                    ], ongoingActions: [] },
                ],
            });
            const state = makeMatchState(core);
            const events = execute(state,
                { type: SU_COMMANDS.PLAY_ACTION, playerId: '0', payload: { cardUid: 'a1' } },
                defaultRandom
            );
            // 多个目标时应创建 Prompt
            const interactions = getInteractionsFromMS(state);
            expect(interactions.length).toBe(1);
            expect(interactions[0].data.sourceId).toBe('bear_cavalry_bear_necessities');
        });

        it('单个对手随从时自动消灭', () => {
            const core = makeState({
                players: {
                    '0': makePlayer('0', {
                        hand: [makeCard('a1', 'bear_cavalry_bear_necessities', 'action', '0')],
                    }),
                    '1': makePlayer('1'),
                },
                bases: [
                    { defId: 'base_a', minions: [
                        makeMinion('m1', 'test', '1', 5),
                    ], ongoingActions: [] },
                ],
            });
            const state = makeMatchState(core);
            const events = execute(state,
                { type: SU_COMMANDS.PLAY_ACTION, playerId: '0', payload: { cardUid: 'a1' } },
                defaultRandom
            );
            // 单目标自动执行，直接消灭随从
            const destroyEvt = events.find(e => e.type === SU_EVENTS.MINION_DESTROYED);
            expect(destroyEvt).toBeDefined();
            expect((destroyEvt as any).payload.minionUid).toBe('m1');
        });

        it('无对手随从时单个持续行动卡自动消灭', () => {
            const ongoing: OngoingActionOnBase = { uid: 'oa1', defId: 'test_ongoing', ownerId: '1' };
            const core = makeState({
                players: {
                    '0': makePlayer('0', {
                        hand: [makeCard('a1', 'bear_cavalry_bear_necessities', 'action', '0')],
                    }),
                    '1': makePlayer('1'),
                },
                bases: [
                    { defId: 'base_a', minions: [], ongoingActions: [ongoing] },
                ],
            });
            const state = makeMatchState(core);
            const events = execute(state,
                { type: SU_COMMANDS.PLAY_ACTION, playerId: '0', payload: { cardUid: 'a1' } },
                defaultRandom
            );
            // 单目标自动执行，直接消灭行动卡
            const detachEvt = events.find(e => e.type === SU_EVENTS.ONGOING_DETACHED);
            expect(detachEvt).toBeDefined();
            expect((detachEvt as any).payload.cardUid).toBe('oa1');
        });

        it('无目标时不产生事件', () => {
            const core = makeState({
                players: {
                    '0': makePlayer('0', {
                        hand: [makeCard('a1', 'bear_cavalry_bear_necessities', 'action', '0')],
                    }),
                    '1': makePlayer('1'),
                },
                bases: [
                    { defId: 'base_a', minions: [], ongoingActions: [] },
                ],
            });
            const state = makeMatchState(core);
            const events = execute(state,
                { type: SU_COMMANDS.PLAY_ACTION, playerId: '0', payload: { cardUid: 'a1' } },
                defaultRandom
            );
            expect(events.find(e => e.type === SU_EVENTS.MINION_DESTROYED)).toBeUndefined();
            expect(events.find(e => e.type === SU_EVENTS.ONGOING_DETACHED)).toBeUndefined();
        });
    });
});

// ============================================================================
// 米斯卡塔尼克大学派系
// ============================================================================

describe('米斯卡塔尼克大学派系能力', () => {
    describe('miskatonic_librarian（图书管理员 talent）', () => {
        it('手中有疯狂卡时弃掉并抽1张牌', () => {
            const madnessCard = makeCard('mad1', 'special_madness', 'action', '0');
            const core = makeState({
                players: {
                    '0': makePlayer('0', {
                        hand: [madnessCard],
                        deck: [
                            makeCard('dk1', 'card_a', 'minion', '0'),
                            makeCard('dk2', 'card_b', 'action', '0'),
                        ],
                    }),
                    '1': makePlayer('1'),
                },
                bases: [
                    { defId: 'base_a', minions: [
                        makeMinion('lib1', 'miskatonic_librarian', '0', 4),
                    ], ongoingActions: [] },
                ],
            });
            const state = makeMatchState(core);
            const events = execute(state,
                { type: SU_COMMANDS.USE_TALENT, playerId: '0', payload: { minionUid: 'lib1', baseIndex: 0 } },
                defaultRandom
            );
            // 应有弃牌事件（弃疯狂卡）和抽牌事件
            const discardEvt = events.find(e => e.type === SU_EVENTS.CARDS_DISCARDED);
            expect(discardEvt).toBeDefined();
            const drawEvt = events.find(e => e.type === SU_EVENTS.CARDS_DRAWN);
            expect(drawEvt).toBeDefined();
        });

        it('手中无疯狂卡时不产生事件', () => {
            const core = makeState({
                players: {
                    '0': makePlayer('0', {
                        hand: [makeCard('h1', 'some_card', 'minion', '0')],
                        deck: [makeCard('dk1', 'card_a', 'minion', '0')],
                    }),
                    '1': makePlayer('1'),
                },
                bases: [
                    { defId: 'base_a', minions: [
                        makeMinion('lib1', 'miskatonic_librarian', '0', 4),
                    ], ongoingActions: [] },
                ],
            });
            const state = makeMatchState(core);
            const events = execute(state,
                { type: SU_COMMANDS.USE_TALENT, playerId: '0', payload: { minionUid: 'lib1', baseIndex: 0 } },
                defaultRandom
            );
            expect(events.find(e => e.type === SU_EVENTS.CARDS_DISCARDED)).toBeUndefined();
            expect(events.find(e => e.type === SU_EVENTS.CARDS_DRAWN)).toBeUndefined();
        });
    });

    describe('miskatonic_professor（教授 talent）', () => {
        it('手中有疯狂卡时弃掉并获得额外行动+额外随从', () => {
            const madnessCard = makeCard('mad1', 'special_madness', 'action', '0');
            const core = makeState({
                players: {
                    '0': makePlayer('0', {
                        hand: [madnessCard],
                    }),
                    '1': makePlayer('1'),
                },
                bases: [
                    { defId: 'base_a', minions: [
                        makeMinion('prof1', 'miskatonic_professor', '0', 5),
                    ], ongoingActions: [] },
                ],
            });
            const state = makeMatchState(core);
            const events = execute(state,
                { type: SU_COMMANDS.USE_TALENT, playerId: '0', payload: { minionUid: 'prof1', baseIndex: 0 } },
                defaultRandom
            );
            // 应有弃牌事件（弃疯狂卡）
            const discardEvt = events.find(e => e.type === SU_EVENTS.CARDS_DISCARDED);
            expect(discardEvt).toBeDefined();
            // 应有额度修改事件（额外行动 + 额外随从）
            const limitEvts = events.filter(e => e.type === SU_EVENTS.LIMIT_MODIFIED);
            expect(limitEvts.length).toBe(2);
        });

        it('手中无疯狂卡时不产生事件', () => {
            const core = makeState({
                players: {
                    '0': makePlayer('0', {
                        hand: [makeCard('h1', 'some_card', 'minion', '0')],
                    }),
                    '1': makePlayer('1'),
                },
                bases: [
                    { defId: 'base_a', minions: [
                        makeMinion('prof1', 'miskatonic_professor', '0', 5),
                    ], ongoingActions: [] },
                ],
            });
            const state = makeMatchState(core);
            const events = execute(state,
                { type: SU_COMMANDS.USE_TALENT, playerId: '0', payload: { minionUid: 'prof1', baseIndex: 0 } },
                defaultRandom
            );
            expect(events.find(e => e.type === SU_EVENTS.CARDS_DISCARDED)).toBeUndefined();
            expect(events.find(e => e.type === SU_EVENTS.LIMIT_MODIFIED)).toBeUndefined();
        });
    });
});

// ============================================================================
// 印斯茅斯派系
// ============================================================================

describe('印斯茅斯派系能力', () => {
    describe('innsmouth_the_locals（本地人 onPlay）', () => {
        it('牌库顶有同名卡时放入手牌，其余放牌库底', () => {
            const core = makeState({
                players: {
                    '0': makePlayer('0', {
                        hand: [makeCard('c1', 'innsmouth_the_locals', 'minion', '0')],
                        deck: [
                            makeCard('dk1', 'innsmouth_the_locals', 'minion', '0'),
                            makeCard('dk2', 'other_card', 'action', '0'),
                            makeCard('dk3', 'innsmouth_the_locals', 'minion', '0'),
                            makeCard('dk4', 'deep_card', 'minion', '0'),
                        ],
                    }),
                    '1': makePlayer('1'),
                },
                bases: [
                    { defId: 'base_a', minions: [], ongoingActions: [] },
                ],
            });
            const state = makeMatchState(core);
            const events = execute(state,
                { type: SU_COMMANDS.PLAY_MINION, playerId: '0', payload: { cardUid: 'c1', baseIndex: 0 } },
                defaultRandom
            );
            // 同名卡（dk1, dk3）应被抽到手牌
            const drawEvt = events.find(e => e.type === SU_EVENTS.CARDS_DRAWN);
            expect(drawEvt).toBeDefined();
            expect(drawEvt!.payload.cardUids).toEqual(['dk1', 'dk3']);
            expect(drawEvt!.payload.count).toBe(2);

            // 非同名卡（dk2）应放到牌库底
            const reshuffleEvt = events.find(e => e.type === SU_EVENTS.DECK_RESHUFFLED);
            expect(reshuffleEvt).toBeDefined();
            // 新牌库 = 剩余牌库（dk4）+ 放底的（dk2）
            expect(reshuffleEvt!.payload.deckUids).toEqual(['dk4', 'dk2']);
        });

        it('牌库顶3张无同名卡时全部放牌库底', () => {
            const core = makeState({
                players: {
                    '0': makePlayer('0', {
                        hand: [makeCard('c1', 'innsmouth_the_locals', 'minion', '0')],
                        deck: [
                            makeCard('dk1', 'card_a', 'minion', '0'),
                            makeCard('dk2', 'card_b', 'action', '0'),
                            makeCard('dk3', 'card_c', 'minion', '0'),
                            makeCard('dk4', 'card_d', 'minion', '0'),
                        ],
                    }),
                    '1': makePlayer('1'),
                },
                bases: [
                    { defId: 'base_a', minions: [], ongoingActions: [] },
                ],
            });
            const state = makeMatchState(core);
            const events = execute(state,
                { type: SU_COMMANDS.PLAY_MINION, playerId: '0', payload: { cardUid: 'c1', baseIndex: 0 } },
                defaultRandom
            );
            // 无同名卡，不应有抽牌事件
            expect(events.find(e => e.type === SU_EVENTS.CARDS_DRAWN)).toBeUndefined();
            // 3张全部放牌库底
            const reshuffleEvt = events.find(e => e.type === SU_EVENTS.DECK_RESHUFFLED);
            expect(reshuffleEvt).toBeDefined();
            // 新牌库 = 剩余（dk4）+ 放底的（dk1, dk2, dk3）
            expect(reshuffleEvt!.payload.deckUids).toEqual(['dk4', 'dk1', 'dk2', 'dk3']);
        });

        it('牌库为空时不产生事件', () => {
            const core = makeState({
                players: {
                    '0': makePlayer('0', {
                        hand: [makeCard('c1', 'innsmouth_the_locals', 'minion', '0')],
                        deck: [],
                    }),
                    '1': makePlayer('1'),
                },
                bases: [
                    { defId: 'base_a', minions: [], ongoingActions: [] },
                ],
            });
            const state = makeMatchState(core);
            const events = execute(state,
                { type: SU_COMMANDS.PLAY_MINION, playerId: '0', payload: { cardUid: 'c1', baseIndex: 0 } },
                defaultRandom
            );
            expect(events.find(e => e.type === SU_EVENTS.CARDS_DRAWN)).toBeUndefined();
            expect(events.find(e => e.type === SU_EVENTS.DECK_RESHUFFLED)).toBeUndefined();
        });

        it('牌库不足3张时只检查可用的牌', () => {
            const core = makeState({
                players: {
                    '0': makePlayer('0', {
                        hand: [makeCard('c1', 'innsmouth_the_locals', 'minion', '0')],
                        deck: [
                            makeCard('dk1', 'innsmouth_the_locals', 'minion', '0'),
                        ],
                    }),
                    '1': makePlayer('1'),
                },
                bases: [
                    { defId: 'base_a', minions: [], ongoingActions: [] },
                ],
            });
            const state = makeMatchState(core);
            const events = execute(state,
                { type: SU_COMMANDS.PLAY_MINION, playerId: '0', payload: { cardUid: 'c1', baseIndex: 0 } },
                defaultRandom
            );
            const drawEvt = events.find(e => e.type === SU_EVENTS.CARDS_DRAWN);
            expect(drawEvt).toBeDefined();
            expect(drawEvt!.payload.cardUids).toEqual(['dk1']);
        });
    });
});

// ============================================================================
// 幽灵派系
// ============================================================================

describe('幽灵派系能力', () => {
    describe('ghost_spirit（灵魂 onPlay）', () => {
        it('单个可消灭目标时创建 Prompt', () => {
            const core = makeState({
                players: {
                    '0': makePlayer('0', {
                        hand: [
                            makeCard('c1', 'ghost_spirit', 'minion', '0'),
                            makeCard('h1', 'filler_a', 'minion', '0'),
                            makeCard('h2', 'filler_b', 'action', '0'),
                            makeCard('h3', 'filler_c', 'minion', '0'),
                        ],
                    }),
                    '1': makePlayer('1'),
                },
                bases: [
                    { defId: 'base_a', minions: [
                        makeMinion('m1', 'enemy_weak', '1', 2),
                        makeMinion('m2', 'enemy_strong', '1', 5),
                    ], ongoingActions: [] },
                ],
            });
            const state = makeMatchState(core);
            const events = execute(state,
                { type: SU_COMMANDS.PLAY_MINION, playerId: '0', payload: { cardUid: 'c1', baseIndex: 0 } },
                defaultRandom
            );
            // 单个可消灭目标时创建 Prompt
            const interactions = getInteractionsFromMS(state);
            expect(interactions.length).toBe(1);
        });

        it('多个可消灭目标时创建 Prompt', () => {
            const core = makeState({
                players: {
                    '0': makePlayer('0', {
                        hand: [
                            makeCard('c1', 'ghost_spirit', 'minion', '0'),
                            makeCard('h1', 'f1', 'minion', '0'),
                            makeCard('h2', 'f2', 'action', '0'),
                            makeCard('h3', 'f3', 'minion', '0'),
                            makeCard('h4', 'f4', 'action', '0'),
                            makeCard('h5', 'f5', 'minion', '0'),
                        ],
                    }),
                    '1': makePlayer('1'),
                },
                bases: [
                    { defId: 'base_a', minions: [
                        makeMinion('m1', 'enemy_a', '1', 2),
                        makeMinion('m2', 'enemy_b', '1', 4),
                    ], ongoingActions: [] },
                ],
            });
            const state = makeMatchState(core);
            const events = execute(state,
                { type: SU_COMMANDS.PLAY_MINION, playerId: '0', payload: { cardUid: 'c1', baseIndex: 0 } },
                defaultRandom
            );
            // 5张手牌（排除自身），两个目标都可消灭 → Prompt
            const interactions = getInteractionsFromMS(state);
            expect(interactions.length).toBe(1);
            expect(interactions[0].data.sourceId).toBe('ghost_spirit');
        });

        it('手牌不足以消灭任何对手随从时不产生事件', () => {
            const core = makeState({
                players: {
                    '0': makePlayer('0', {
                        hand: [
                            makeCard('c1', 'ghost_spirit', 'minion', '0'),
                            makeCard('h1', 'filler', 'minion', '0'),
                        ],
                    }),
                    '1': makePlayer('1'),
                },
                bases: [
                    { defId: 'base_a', minions: [
                        makeMinion('m1', 'enemy', '1', 5),
                    ], ongoingActions: [] },
                ],
            });
            const state = makeMatchState(core);
            const events = execute(state,
                { type: SU_COMMANDS.PLAY_MINION, playerId: '0', payload: { cardUid: 'c1', baseIndex: 0 } },
                defaultRandom
            );
            // 只有1张可弃手牌，对手力量5，不够
            expect(events.find(e => e.type === SU_EVENTS.MINION_DESTROYED)).toBeUndefined();
            expect(events.find(e => e.type === SU_EVENTS.CARDS_DISCARDED)).toBeUndefined();
        });

        it('无对手随从时不产生事件', () => {
            const core = makeState({
                players: {
                    '0': makePlayer('0', {
                        hand: [
                            makeCard('c1', 'ghost_spirit', 'minion', '0'),
                            makeCard('h1', 'filler', 'minion', '0'),
                            makeCard('h2', 'filler2', 'action', '0'),
                        ],
                    }),
                    '1': makePlayer('1'),
                },
                bases: [
                    { defId: 'base_a', minions: [
                        makeMinion('m0', 'own', '0', 3),
                    ], ongoingActions: [] },
                ],
            });
            const state = makeMatchState(core);
            const events = execute(state,
                { type: SU_COMMANDS.PLAY_MINION, playerId: '0', payload: { cardUid: 'c1', baseIndex: 0 } },
                defaultRandom
            );
            expect(events.find(e => e.type === SU_EVENTS.MINION_DESTROYED)).toBeUndefined();
        });
    });
});
