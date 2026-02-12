/**
 * 大杀四方 - 疯狂卡 + Prompt 能力测试（Priority 2）
 *
 * 覆盖：
 * - 克苏鲁之仆：cthulhu_madness_unleashed（弃疯狂卡换抽牌+额外行动）
 * - 米斯卡塔尼克大学：miskatonic_it_might_just_work（弃2疯狂卡消灭随从）
 * - 米斯卡塔尼克大学：miskatonic_book_of_iter_the_unseen（查看手牌+疯狂卡+额外行动）
 * - 米斯卡塔尼克大学：miskatonic_thing_on_the_doorstep（搜索牌库+疯狂卡）
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { execute, reduce } from '../domain/reducer';
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
import { clearPromptContinuationRegistry } from '../domain/promptContinuation';
import { applyEvents } from './helpers';
import type { MatchState, RandomFn } from '../../../engine/types';

beforeAll(() => {
    clearRegistry();
    clearBaseAbilityRegistry();
    resetAbilityInit();
    clearPromptContinuationRegistry();
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
    return { core, sys: { phase: 'playCards' } as any } as any;
}

const defaultRandom: RandomFn = {
    shuffle: (arr: any[]) => [...arr],
    random: () => 0.5,
    d: (_max: number) => 1,
    range: (_min: number, _max: number) => _min,
};

function execPlayAction(state: SmashUpCore, playerId: string, cardUid: string, targetBaseIndex?: number, random?: RandomFn): SmashUpEvent[] {
    return execute(makeMatchState(state), {
        type: SU_COMMANDS.PLAY_ACTION, playerId,
        payload: { cardUid, targetBaseIndex },
    } as any, random ?? defaultRandom);
}

function applyEvents(state: SmashUpCore, events: SmashUpEvent[]): SmashUpCore {
    return events.reduce((s, e) => reduce(s, e), state);
}

// ============================================================================
// 克苏鲁之仆 - cthulhu_madness_unleashed
// ============================================================================

describe('克苏鲁之仆 - cthulhu_madness_unleashed（疯狂释放）', () => {
    it('多张疑狂卡时创建多选 Prompt', () => {
        const state = makeStateWithMadness({
            players: {
                '0': makePlayer('0', {
                    hand: [
                        makeCard('a1', 'cthulhu_madness_unleashed', 'action', '0'),
                        makeCard('m1', MADNESS_CARD_DEF_ID, 'action', '0'),
                        makeCard('m2', MADNESS_CARD_DEF_ID, 'action', '0'),
                        makeCard('m3', MADNESS_CARD_DEF_ID, 'action', '0'),
                    ],
                    deck: [
                        makeCard('d1', 'test', 'minion', '0'),
                        makeCard('d2', 'test', 'action', '0'),
                        makeCard('d3', 'test', 'minion', '0'),
                        makeCard('d4', 'test', 'action', '0'),
                    ],
                }),
                '1': makePlayer('1'),
            },
        });

        const events = execPlayAction(state, '0', 'a1');
        // 多张疑狂卡时应创建 Prompt（不直接弃牌）
        const promptEvents = events.filter(e => e.type === SU_EVENTS.CHOICE_REQUESTED);
        expect(promptEvents.length).toBe(1);
        const cont = (promptEvents[0] as any).payload;
        expect(cont.abilityId).toBe('cthulhu_madness_unleashed');
        // 应有3个选项（每张疑狂卡一个）
        expect(cont.promptConfig.options.length).toBe(3);
        // 应支持多选
        expect(cont.promptConfig.multi).toEqual({ min: 1, max: 3 });
    });

    it('手中无疯狂卡时无效果', () => {
        const state = makeStateWithMadness({
            players: {
                '0': makePlayer('0', {
                    hand: [makeCard('a1', 'cthulhu_madness_unleashed', 'action', '0')],
                    deck: [makeCard('d1', 'test', 'minion', '0')],
                }),
                '1': makePlayer('1'),
            },
        });

        const events = execPlayAction(state, '0', 'a1');
        const returnEvents = events.filter(e => e.type === SU_EVENTS.MADNESS_RETURNED);
        expect(returnEvents.length).toBe(0);
        const drawEvents = events.filter(e => e.type === SU_EVENTS.CARDS_DRAWN);
        expect(drawEvents.length).toBe(0);
        const limitEvents = events.filter(e => e.type === SU_EVENTS.LIMIT_MODIFIED);
        expect(limitEvents.length).toBe(0);
    });

    it('只有1张疯狂卡时创建 Prompt', () => {
        const state = makeStateWithMadness({
            players: {
                '0': makePlayer('0', {
                    hand: [
                        makeCard('a1', 'cthulhu_madness_unleashed', 'action', '0'),
                        makeCard('m1', MADNESS_CARD_DEF_ID, 'action', '0'),
                    ],
                    deck: [makeCard('d1', 'test', 'minion', '0')],
                }),
                '1': makePlayer('1'),
            },
        });

        const events = execPlayAction(state, '0', 'a1');
        // 单张疯狂卡时创建 Prompt
        const promptEvents = events.filter(e => e.type === SU_EVENTS.CHOICE_REQUESTED);
        expect(promptEvents.length).toBe(1);
        expect((promptEvents[0] as any).payload.abilityId).toBe('cthulhu_madness_unleashed');
    });

    it('多张疑狂卡+牌库不足时也创建 Prompt', () => {
        const state = makeStateWithMadness({
            players: {
                '0': makePlayer('0', {
                    hand: [
                        makeCard('a1', 'cthulhu_madness_unleashed', 'action', '0'),
                        makeCard('m1', MADNESS_CARD_DEF_ID, 'action', '0'),
                        makeCard('m2', MADNESS_CARD_DEF_ID, 'action', '0'),
                        makeCard('m3', MADNESS_CARD_DEF_ID, 'action', '0'),
                    ],
                    deck: [makeCard('d1', 'test', 'minion', '0')], // 只有1张
                }),
                '1': makePlayer('1'),
            },
        });

        const events = execPlayAction(state, '0', 'a1');
        // 多张疑狂卡时应创建 Prompt
        const promptEvents = events.filter(e => e.type === SU_EVENTS.CHOICE_REQUESTED);
        expect(promptEvents.length).toBe(1);
        const cont = (promptEvents[0] as any).payload;
        expect(cont.abilityId).toBe('cthulhu_madness_unleashed');
        expect(cont.promptConfig.options.length).toBe(3);
    });

    it('状态正确（reduce 验证）- 多张疑狂卡产生 PROMPT_CONTINUATION', () => {
        const state = makeStateWithMadness({
            players: {
                '0': makePlayer('0', {
                    hand: [
                        makeCard('a1', 'cthulhu_madness_unleashed', 'action', '0'),
                        makeCard('m1', MADNESS_CARD_DEF_ID, 'action', '0'),
                        makeCard('m2', MADNESS_CARD_DEF_ID, 'action', '0'),
                    ],
                    deck: [
                        makeCard('d1', 'test', 'minion', '0'),
                        makeCard('d2', 'test', 'action', '0'),
                        makeCard('d3', 'test', 'minion', '0'),
                    ],
                    actionLimit: 1,
                }),
                '1': makePlayer('1'),
            },
        });

        const events = execPlayAction(state, '0', 'a1');
        const newState = applyEvents(state, events);
        // 多张疑狂卡时应有 CHOICE_REQUESTED 事件
        const promptEvents = events.filter(e => e.type === SU_EVENTS.CHOICE_REQUESTED);
        expect(promptEvents.length).toBe(1);
        expect((promptEvents[0] as any).payload.abilityId).toBe('cthulhu_madness_unleashed');
        // 手牌中疑狂卡仍在（等待玩家选择）
        expect(newState.players['0'].hand.filter(c => c.defId === MADNESS_CARD_DEF_ID).length).toBe(2);
    });
});


// ============================================================================
// 米斯卡塔尼克大学 - miskatonic_it_might_just_work
// ============================================================================

describe('米斯卡塔尼克大学 - miskatonic_it_might_just_work（也许能行）', () => {
    it('多个随从时创建 Prompt 选择目标', () => {
        const state = makeStateWithMadness({
            players: {
                '0': makePlayer('0', {
                    hand: [
                        makeCard('a1', 'miskatonic_it_might_just_work', 'action', '0'),
                        makeCard('m1', MADNESS_CARD_DEF_ID, 'action', '0'),
                        makeCard('m2', MADNESS_CARD_DEF_ID, 'action', '0'),
                        makeCard('m3', MADNESS_CARD_DEF_ID, 'action', '0'),
                    ],
                }),
                '1': makePlayer('1'),
            },
            bases: [{
                defId: 'base_test', ongoingActions: [],
                minions: [
                    makeMinion('weak', 'test_weak', '1', 2),
                    makeMinion('strong', 'test_strong', '1', 5),
                    makeMinion('mine', 'test_mine', '0', 3),
                ],
            }],
        });

        const events = execPlayAction(state, '0', 'a1');
        // 多个随从时应创建 Prompt（不直接消灭）
        const promptEvents = events.filter(e => e.type === SU_EVENTS.CHOICE_REQUESTED);
        expect(promptEvents.length).toBe(1);
        expect((promptEvents[0] as any).payload.abilityId).toBe('miskatonic_it_might_just_work');
    });

    it('单个随从时创建 Prompt', () => {
        const state = makeStateWithMadness({
            players: {
                '0': makePlayer('0', {
                    hand: [
                        makeCard('a1', 'miskatonic_it_might_just_work', 'action', '0'),
                        makeCard('m1', MADNESS_CARD_DEF_ID, 'action', '0'),
                        makeCard('m2', MADNESS_CARD_DEF_ID, 'action', '0'),
                    ],
                }),
                '1': makePlayer('1'),
            },
            bases: [{
                defId: 'base_test', ongoingActions: [],
                minions: [
                    makeMinion('target', 'test_target', '1', 5),
                ],
            }],
        });

        const events = execPlayAction(state, '0', 'a1');
        // 单个随从时创建 Prompt
        const promptEvents = events.filter(e => e.type === SU_EVENTS.CHOICE_REQUESTED);
        expect(promptEvents.length).toBe(1);
        expect((promptEvents[0] as any).payload.abilityId).toBe('miskatonic_it_might_just_work');
    });

    it('手中疯狂卡不足2张时无效果', () => {
        const state = makeStateWithMadness({
            players: {
                '0': makePlayer('0', {
                    hand: [
                        makeCard('a1', 'miskatonic_it_might_just_work', 'action', '0'),
                        makeCard('m1', MADNESS_CARD_DEF_ID, 'action', '0'),
                    ],
                }),
                '1': makePlayer('1'),
            },
            bases: [{
                defId: 'base_test', ongoingActions: [],
                minions: [makeMinion('target', 'test', '1', 3)],
            }],
        });

        const events = execPlayAction(state, '0', 'a1');
        const returnEvents = events.filter(e => e.type === SU_EVENTS.MADNESS_RETURNED);
        expect(returnEvents.length).toBe(0);
        const destroyEvents = events.filter(e => e.type === SU_EVENTS.MINION_DESTROYED);
        expect(destroyEvents.length).toBe(0);
    });

    it('无随从可消灭时无效果（即使有足够疯狂卡）', () => {
        const state = makeStateWithMadness({
            players: {
                '0': makePlayer('0', {
                    hand: [
                        makeCard('a1', 'miskatonic_it_might_just_work', 'action', '0'),
                        makeCard('m1', MADNESS_CARD_DEF_ID, 'action', '0'),
                        makeCard('m2', MADNESS_CARD_DEF_ID, 'action', '0'),
                    ],
                }),
                '1': makePlayer('1'),
            },
            bases: [{ defId: 'base_test', ongoingActions: [], minions: [] }],
        });

        const events = execPlayAction(state, '0', 'a1');
        const returnEvents = events.filter(e => e.type === SU_EVENTS.MADNESS_RETURNED);
        expect(returnEvents.length).toBe(0);
    });

    it('多个己方随从时创建 Prompt', () => {
        const state = makeStateWithMadness({
            players: {
                '0': makePlayer('0', {
                    hand: [
                        makeCard('a1', 'miskatonic_it_might_just_work', 'action', '0'),
                        makeCard('m1', MADNESS_CARD_DEF_ID, 'action', '0'),
                        makeCard('m2', MADNESS_CARD_DEF_ID, 'action', '0'),
                    ],
                }),
                '1': makePlayer('1'),
            },
            bases: [{
                defId: 'base_test', ongoingActions: [],
                minions: [
                    makeMinion('my_weak', 'test', '0', 2),
                    makeMinion('my_strong', 'test', '0', 4),
                ],
            }],
        });

        const events = execPlayAction(state, '0', 'a1');
        // 多个随从时应创建 Prompt
        const promptEvents = events.filter(e => e.type === SU_EVENTS.CHOICE_REQUESTED);
        expect(promptEvents.length).toBe(1);
        expect((promptEvents[0] as any).payload.abilityId).toBe('miskatonic_it_might_just_work');
    });

    it('无对手随从时单个己方随从创建 Prompt', () => {
        const state = makeStateWithMadness({
            players: {
                '0': makePlayer('0', {
                    hand: [
                        makeCard('a1', 'miskatonic_it_might_just_work', 'action', '0'),
                        makeCard('m1', MADNESS_CARD_DEF_ID, 'action', '0'),
                        makeCard('m2', MADNESS_CARD_DEF_ID, 'action', '0'),
                    ],
                }),
                '1': makePlayer('1'),
            },
            bases: [{
                defId: 'base_test', ongoingActions: [],
                minions: [
                    makeMinion('my_only', 'test', '0', 4),
                ],
            }],
        });

        const events = execPlayAction(state, '0', 'a1');
        // 单个己方随从时创建 Prompt
        const promptEvents = events.filter(e => e.type === SU_EVENTS.CHOICE_REQUESTED);
        expect(promptEvents.length).toBe(1);
        expect((promptEvents[0] as any).payload.abilityId).toBe('miskatonic_it_might_just_work');
    });

    it('状态正确（reduce 验证）- 单目标 Prompt 待决', () => {
        const state = makeStateWithMadness({
            players: {
                '0': makePlayer('0', {
                    hand: [
                        makeCard('a1', 'miskatonic_it_might_just_work', 'action', '0'),
                        makeCard('m1', MADNESS_CARD_DEF_ID, 'action', '0'),
                        makeCard('m2', MADNESS_CARD_DEF_ID, 'action', '0'),
                    ],
                }),
                '1': makePlayer('1'),
            },
            bases: [{
                defId: 'base_test', ongoingActions: [],
                minions: [makeMinion('target', 'test', '1', 5, '1')],
            }],
        });

        const events = execPlayAction(state, '0', 'a1');
        const newState = applyEvents(state, events);
        // CHOICE_REQUESTED 事件已生成（Prompt 待决），疯狂卡仍在手牌
        const promptEvents2 = events.filter(e => e.type === SU_EVENTS.CHOICE_REQUESTED);
        expect(promptEvents2.length).toBe(1);
        expect(newState.players['0'].hand.filter(c => c.defId === MADNESS_CARD_DEF_ID).length).toBe(2);
        // 基地上随从未被消灭
        expect(newState.bases[0].minions.length).toBe(1);
    });
});

// ============================================================================
// 米斯卡塔尼克大学 - miskatonic_book_of_iter_the_unseen
// ============================================================================

describe('米斯卡塔尼克大学 - miskatonic_book_of_iter_the_unseen（不可见之书）', () => {
    it('抽1张疯狂卡 + 2个额外行动', () => {
        const state = makeStateWithMadness({
            players: {
                '0': makePlayer('0', {
                    hand: [makeCard('a1', 'miskatonic_book_of_iter_the_unseen', 'action', '0')],
                }),
                '1': makePlayer('1'),
            },
        });

        const events = execPlayAction(state, '0', 'a1');
        // 抽1张疯狂卡
        const madnessEvents = events.filter(e => e.type === SU_EVENTS.MADNESS_DRAWN);
        expect(madnessEvents.length).toBe(1);
        expect((madnessEvents[0] as any).payload.count).toBe(1);
        // 2个额外行动
        const limitEvents = events.filter(e => e.type === SU_EVENTS.LIMIT_MODIFIED);
        expect(limitEvents.length).toBe(2);
        expect(limitEvents.every(e => (e as any).payload.limitType === 'action')).toBe(true);
    });

    it('状态正确（reduce 验证）', () => {
        const state = makeStateWithMadness({
            players: {
                '0': makePlayer('0', {
                    hand: [makeCard('a1', 'miskatonic_book_of_iter_the_unseen', 'action', '0')],
                    actionLimit: 1,
                }),
                '1': makePlayer('1'),
            },
        });

        const events = execPlayAction(state, '0', 'a1');
        const newState = applyEvents(state, events);
        // 手牌中有1张疯狂卡
        expect(newState.players['0'].hand.filter(c => c.defId === MADNESS_CARD_DEF_ID).length).toBe(1);
        // 疯狂牌库减少1张
        expect(newState.madnessDeck!.length).toBe(MADNESS_DECK_SIZE - 1);
        // 行动额度 = 1(原) + 2(额外) = 3
        expect(newState.players['0'].actionLimit).toBe(3);
    });

    it('疯狂牌库为空时仍给额外行动', () => {
        const state = makeStateWithMadness({
            players: {
                '0': makePlayer('0', {
                    hand: [makeCard('a1', 'miskatonic_book_of_iter_the_unseen', 'action', '0')],
                }),
                '1': makePlayer('1'),
            },
            madnessDeck: [], // 空疯狂牌库
        });

        const events = execPlayAction(state, '0', 'a1');
        // 无疯狂卡可抽
        const madnessEvents = events.filter(e => e.type === SU_EVENTS.MADNESS_DRAWN);
        expect(madnessEvents.length).toBe(0);
        // 但仍有2个额外行动
        const limitEvents = events.filter(e => e.type === SU_EVENTS.LIMIT_MODIFIED);
        expect(limitEvents.length).toBe(2);
    });
});

// ============================================================================
// 米斯卡塔尼克大学 - miskatonic_thing_on_the_doorstep
// ============================================================================

describe('米斯卡塔尼克大学 - miskatonic_thing_on_the_doorstep（门口之物）', () => {
    it('从牌库搜索1张非疯狂卡 + 抽1张疯狂卡', () => {
        const state = makeStateWithMadness({
            players: {
                '0': makePlayer('0', {
                    hand: [makeCard('a1', 'miskatonic_thing_on_the_doorstep', 'action', '0')],
                    deck: [
                        makeCard('d1', MADNESS_CARD_DEF_ID, 'action', '0'),
                        makeCard('d2', 'test_action', 'action', '0'),
                        makeCard('d3', 'test_minion', 'minion', '0'),
                    ],
                }),
                '1': makePlayer('1'),
            },
        });

        const events = execPlayAction(state, '0', 'a1');
        // 搜索到第一张非疯狂卡（d2）
        const drawEvents = events.filter(e => e.type === SU_EVENTS.CARDS_DRAWN);
        expect(drawEvents.length).toBe(1);
        expect((drawEvents[0] as any).payload.cardUids).toEqual(['d2']);
        // 抽1张疯狂卡
        const madnessEvents = events.filter(e => e.type === SU_EVENTS.MADNESS_DRAWN);
        expect(madnessEvents.length).toBe(1);
    });

    it('牌库全是疯狂卡时只抽疯狂卡', () => {
        const state = makeStateWithMadness({
            players: {
                '0': makePlayer('0', {
                    hand: [makeCard('a1', 'miskatonic_thing_on_the_doorstep', 'action', '0')],
                    deck: [
                        makeCard('d1', MADNESS_CARD_DEF_ID, 'action', '0'),
                        makeCard('d2', MADNESS_CARD_DEF_ID, 'action', '0'),
                    ],
                }),
                '1': makePlayer('1'),
            },
        });

        const events = execPlayAction(state, '0', 'a1');
        // 无非疯狂卡可搜索
        const drawEvents = events.filter(e => e.type === SU_EVENTS.CARDS_DRAWN);
        expect(drawEvents.length).toBe(0);
        // 仍抽1张疯狂卡
        const madnessEvents = events.filter(e => e.type === SU_EVENTS.MADNESS_DRAWN);
        expect(madnessEvents.length).toBe(1);
    });

    it('牌库为空时只抽疯狂卡', () => {
        const state = makeStateWithMadness({
            players: {
                '0': makePlayer('0', {
                    hand: [makeCard('a1', 'miskatonic_thing_on_the_doorstep', 'action', '0')],
                    deck: [],
                }),
                '1': makePlayer('1'),
            },
        });

        const events = execPlayAction(state, '0', 'a1');
        const drawEvents = events.filter(e => e.type === SU_EVENTS.CARDS_DRAWN);
        expect(drawEvents.length).toBe(0);
        const madnessEvents = events.filter(e => e.type === SU_EVENTS.MADNESS_DRAWN);
        expect(madnessEvents.length).toBe(1);
    });

    it('状态正确（reduce 验证）', () => {
        const state = makeStateWithMadness({
            players: {
                '0': makePlayer('0', {
                    hand: [makeCard('a1', 'miskatonic_thing_on_the_doorstep', 'action', '0')],
                    deck: [
                        makeCard('d1', 'test_minion', 'minion', '0'),
                        makeCard('d2', 'test_action', 'action', '0'),
                    ],
                }),
                '1': makePlayer('1'),
            },
        });

        const events = execPlayAction(state, '0', 'a1');
        const newState = applyEvents(state, events);
        // 搜索到 d1（第一张非疯狂卡）放入手牌
        expect(newState.players['0'].hand.some(c => c.uid === 'd1')).toBe(true);
        // 手牌中有1张疯狂卡
        expect(newState.players['0'].hand.filter(c => c.defId === MADNESS_CARD_DEF_ID).length).toBe(1);
        // 牌库减少1张（d1 被取走）
        expect(newState.players['0'].deck.length).toBe(1);
        expect(newState.players['0'].deck[0].uid).toBe('d2');
        // 疯狂牌库减少1张
        expect(newState.madnessDeck!.length).toBe(MADNESS_DECK_SIZE - 1);
    });

    it('疯狂牌库为空时仍可搜索牌库', () => {
        const state = makeStateWithMadness({
            players: {
                '0': makePlayer('0', {
                    hand: [makeCard('a1', 'miskatonic_thing_on_the_doorstep', 'action', '0')],
                    deck: [makeCard('d1', 'test_minion', 'minion', '0')],
                }),
                '1': makePlayer('1'),
            },
            madnessDeck: [],
        });

        const events = execPlayAction(state, '0', 'a1');
        // 搜索到 d1
        const drawEvents = events.filter(e => e.type === SU_EVENTS.CARDS_DRAWN);
        expect(drawEvents.length).toBe(1);
        expect((drawEvents[0] as any).payload.cardUids).toEqual(['d1']);
        // 无疯狂卡可抽
        const madnessEvents = events.filter(e => e.type === SU_EVENTS.MADNESS_DRAWN);
        expect(madnessEvents.length).toBe(0);
    });
});
