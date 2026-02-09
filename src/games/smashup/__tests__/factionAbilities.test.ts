/**
 * 大杀四方 - 派系卡牌能力测试
 *
 * 覆盖新增的不需要 PromptSystem 的派系能力
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { execute, reduce } from '../domain/reducer';
import { SU_COMMANDS, SU_EVENTS } from '../domain/types';
import type {
    SmashUpCore,
    SmashUpEvent,
    PlayerState,
    BaseInPlay,
    MinionOnBase,
    CardInstance,
} from '../domain/types';
import { initAllAbilities, resetAbilityInit } from '../abilities';
import { clearRegistry } from '../domain/abilityRegistry';
import { clearBaseAbilityRegistry } from '../domain/baseAbilities';
import type { MatchState, RandomFn } from '../../../engine/types';

beforeAll(() => {
    clearRegistry();
    clearBaseAbilityRegistry();
    resetAbilityInit();
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

function makeState(overrides?: Partial<SmashUpCore>): SmashUpCore {
    return {
        players: {
            '0': makePlayer('0'),
            '1': makePlayer('1'),
        },
        turnOrder: ['0', '1'],
        currentPlayerIndex: 0,
        bases: [],
        baseDeck: [],
        turnNumber: 1,
        nextUid: 100,
        ...overrides,
    };
}

function makeMatchState(core: SmashUpCore): MatchState<SmashUpCore> {
    return {
        core,
        sys: { phase: 'playCards' } as any,
    } as any;
}

const defaultRandom: RandomFn = { shuffle: (arr: any[]) => [...arr], random: () => 0.5 };

function execPlayMinion(state: SmashUpCore, playerId: string, cardUid: string, baseIndex: number): SmashUpEvent[] {
    const matchState = makeMatchState(state);
    return execute(matchState, {
        type: SU_COMMANDS.PLAY_MINION,
        playerId,
        payload: { cardUid, baseIndex },
    } as any, defaultRandom);
}

function execPlayAction(state: SmashUpCore, playerId: string, cardUid: string, targetBaseIndex?: number, targetMinionUid?: string): SmashUpEvent[] {
    const matchState = makeMatchState(state);
    return execute(matchState, {
        type: SU_COMMANDS.PLAY_ACTION,
        playerId,
        payload: { cardUid, targetBaseIndex, targetMinionUid },
    } as any, defaultRandom);
}

function applyEvents(state: SmashUpCore, events: SmashUpEvent[]): SmashUpCore {
    return events.reduce((s, e) => reduce(s, e), state);
}

// ============================================================================
// 海盗派系
// ============================================================================

describe('海盗派系能力', () => {
    it('pirate_broadside: 消灭对手在你有随从的基地的所有力量≤2随从', () => {
        const state = makeState({
            players: {
                '0': makePlayer('0', {
                    hand: [makeCard('a1', 'pirate_broadside', 'action', '0')],
                }),
                '1': makePlayer('1'),
            },
            bases: [{
                defId: 'base_test', minions: [
                    makeMinion('m0', 'test', '0', 5),
                    makeMinion('m1', 'test', '1', 2),
                    makeMinion('m2', 'test', '1', 1),
                    makeMinion('m3', 'test', '1', 4),
                ], ongoingActions: [],
            }],
        });

        const events = execPlayAction(state, '0', 'a1', 0);
        const destroyEvents = events.filter(e => e.type === SU_EVENTS.MINION_DESTROYED);
        // 应消灭 m1(力量2) 和 m2(力量1)
        expect(destroyEvents.length).toBe(2);
        const destroyedUids = destroyEvents.map(e => (e as any).payload.minionUid);
        expect(destroyedUids).toContain('m1');
        expect(destroyedUids).toContain('m2');
    });

    it('pirate_cannon: 多目标时创建 Prompt 选择', () => {
        const state = makeState({
            players: {
                '0': makePlayer('0', {
                    hand: [makeCard('a1', 'pirate_cannon', 'action', '0')],
                }),
                '1': makePlayer('1'),
            },
            bases: [
                { defId: 'b1', minions: [makeMinion('m1', 'test', '1', 1)], ongoingActions: [] },
                { defId: 'b2', minions: [makeMinion('m2', 'test', '1', 2), makeMinion('m3', 'test', '1', 5)], ongoingActions: [] },
            ],
        });

        const events = execPlayAction(state, '0', 'a1');
        // 多个力量≤2目标时应创建 Prompt
        const promptEvents = events.filter(e => e.type === SU_EVENTS.PROMPT_CONTINUATION);
        expect(promptEvents.length).toBe(1);
        expect((promptEvents[0] as any).payload.continuation.abilityId).toBe('pirate_cannon_choose_first');
    });

    it('pirate_cannon: 单目标时自动消灭', () => {
        const state = makeState({
            players: {
                '0': makePlayer('0', {
                    hand: [makeCard('a1', 'pirate_cannon', 'action', '0')],
                }),
                '1': makePlayer('1'),
            },
            bases: [
                { defId: 'b1', minions: [makeMinion('m1', 'test', '1', 1)], ongoingActions: [] },
                { defId: 'b2', minions: [makeMinion('m3', 'test', '1', 5)], ongoingActions: [] },
            ],
        });

        const events = execPlayAction(state, '0', 'a1');
        const destroyEvents = events.filter(e => e.type === SU_EVENTS.MINION_DESTROYED);
        expect(destroyEvents.length).toBe(1);
        expect((destroyEvents[0] as any).payload.minionUid).toBe('m1');
    });

    it('pirate_swashbuckling: 所有己方随从+1力量', () => {
        const state = makeState({
            players: {
                '0': makePlayer('0', {
                    hand: [makeCard('a1', 'pirate_swashbuckling', 'action', '0')],
                }),
                '1': makePlayer('1'),
            },
            bases: [
                { defId: 'b1', minions: [makeMinion('m0', 'test', '0', 3), makeMinion('m1', 'test', '1', 2)], ongoingActions: [] },
                { defId: 'b2', minions: [makeMinion('m2', 'test', '0', 4)], ongoingActions: [] },
            ],
        });

        const events = execPlayAction(state, '0', 'a1');
        const powerEvents = events.filter(e => e.type === SU_EVENTS.POWER_COUNTER_ADDED);
        // 只有己方随从 m0 和 m2 获得 +1
        expect(powerEvents.length).toBe(2);
        const boostedUids = powerEvents.map(e => (e as any).payload.minionUid);
        expect(boostedUids).toContain('m0');
        expect(boostedUids).toContain('m2');
    });
});

// ============================================================================
// 忍者派系
// ============================================================================

describe('忍者派系能力', () => {
    it('ninja_seeing_stars: 消灭任意基地一个力量≤3的对手随从', () => {
        const state = makeState({
            players: {
                '0': makePlayer('0', {
                    hand: [makeCard('a1', 'ninja_seeing_stars', 'action', '0')],
                }),
                '1': makePlayer('1'),
            },
            bases: [
                { defId: 'b1', minions: [makeMinion('m1', 'test', '1', 5)], ongoingActions: [] },
                { defId: 'b2', minions: [makeMinion('m2', 'test', '1', 3)], ongoingActions: [] },
            ],
        });

        const events = execPlayAction(state, '0', 'a1');
        const destroyEvents = events.filter(e => e.type === SU_EVENTS.MINION_DESTROYED);
        expect(destroyEvents.length).toBe(1);
        expect((destroyEvents[0] as any).payload.minionUid).toBe('m2');
    });
});

// ============================================================================
// 恐龙派系
// ============================================================================

describe('恐龙派系能力', () => {
    it('dino_wild_stuffing: 消灭任意基地一个力量≤3的随从', () => {
        const state = makeState({
            players: {
                '0': makePlayer('0', {
                    hand: [makeCard('a1', 'dino_wild_stuffing', 'action', '0')],
                }),
                '1': makePlayer('1'),
            },
            bases: [
                { defId: 'b1', minions: [makeMinion('m1', 'test', '1', 3)], ongoingActions: [] },
            ],
        });

        const events = execPlayAction(state, '0', 'a1');
        const destroyEvents = events.filter(e => e.type === SU_EVENTS.MINION_DESTROYED);
        expect(destroyEvents.length).toBe(1);
    });

    it('dino_augmentation: 多个己方随从时创建 Prompt 选择', () => {
        const state = makeState({
            players: {
                '0': makePlayer('0', {
                    hand: [makeCard('a1', 'dino_augmentation', 'action', '0')],
                }),
                '1': makePlayer('1'),
            },
            bases: [
                { defId: 'b1', minions: [makeMinion('m0', 'test', '0', 3), makeMinion('m1', 'test', '0', 5)], ongoingActions: [] },
            ],
        });

        const events = execPlayAction(state, '0', 'a1');
        // 多个己方随从时应创建 Prompt 而非自动选择
        const promptEvents = events.filter(e => e.type === SU_EVENTS.PROMPT_CONTINUATION);
        expect(promptEvents.length).toBe(1);
        expect((promptEvents[0] as any).payload.continuation.abilityId).toBe('dino_augmentation');
    });

    it('dino_augmentation: 单个己方随从时自动+4力量', () => {
        const state = makeState({
            players: {
                '0': makePlayer('0', {
                    hand: [makeCard('a1', 'dino_augmentation', 'action', '0')],
                }),
                '1': makePlayer('1'),
            },
            bases: [
                { defId: 'b1', minions: [makeMinion('m1', 'test', '0', 5)], ongoingActions: [] },
            ],
        });

        const events = execPlayAction(state, '0', 'a1');
        const powerEvents = events.filter(e => e.type === SU_EVENTS.POWER_COUNTER_ADDED);
        expect(powerEvents.length).toBe(1);
        expect((powerEvents[0] as any).payload.minionUid).toBe('m1');
        expect((powerEvents[0] as any).payload.amount).toBe(4);
    });

    it('dino_howl: 所有己方随从+1力量', () => {
        const state = makeState({
            players: {
                '0': makePlayer('0', {
                    hand: [makeCard('a1', 'dino_howl', 'action', '0')],
                }),
                '1': makePlayer('1'),
            },
            bases: [
                { defId: 'b1', minions: [makeMinion('m0', 'test', '0', 3), makeMinion('m1', 'test', '1', 2)], ongoingActions: [] },
            ],
        });

        const events = execPlayAction(state, '0', 'a1');
        const powerEvents = events.filter(e => e.type === SU_EVENTS.POWER_COUNTER_ADDED);
        expect(powerEvents.length).toBe(1); // 只有己方 m0
        expect((powerEvents[0] as any).payload.minionUid).toBe('m0');
    });

    it('dino_natural_selection: 消灭力量低于己方随从的对手随从', () => {
        const state = makeState({
            players: {
                '0': makePlayer('0', {
                    hand: [makeCard('a1', 'dino_natural_selection', 'action', '0')],
                }),
                '1': makePlayer('1'),
            },
            bases: [
                {
                    defId: 'b1', minions: [
                        makeMinion('m0', 'test', '0', 5),
                        makeMinion('m1', 'test', '1', 4),
                        makeMinion('m2', 'test', '1', 6),
                    ], ongoingActions: [],
                },
            ],
        });

        const events = execPlayAction(state, '0', 'a1', 0);
        const destroyEvents = events.filter(e => e.type === SU_EVENTS.MINION_DESTROYED);
        expect(destroyEvents.length).toBe(1);
        expect((destroyEvents[0] as any).payload.minionUid).toBe('m1'); // 力量4 < 5
    });

    it('dino_natural_selection: 多个可消灭目标时创建 Prompt', () => {
        const state = makeState({
            players: {
                '0': makePlayer('0', {
                    hand: [makeCard('a1', 'dino_natural_selection', 'action', '0')],
                }),
                '1': makePlayer('1'),
            },
            bases: [
                {
                    defId: 'b1', minions: [
                        makeMinion('m0', 'test', '0', 5),
                        makeMinion('m1', 'test', '1', 3),
                        makeMinion('m2', 'test', '1', 4),
                    ], ongoingActions: [],
                },
            ],
        });

        const events = execPlayAction(state, '0', 'a1', 0);
        // 多个目标时不直接消灭，而是创建 Prompt 让玩家选择
        const destroyEvents = events.filter(e => e.type === SU_EVENTS.MINION_DESTROYED);
        expect(destroyEvents.length).toBe(0);
        // 应该有 PROMPT_CONTINUATION 事件
        const promptEvents = events.filter(e => e.type === SU_EVENTS.PROMPT_CONTINUATION);
        expect(promptEvents.length).toBe(1);
        expect((promptEvents[0] as any).payload.continuation.abilityId).toBe('dino_natural_selection_choose_target');
    });

    it('dino_natural_selection: 无合法目标时无事件', () => {
        const state = makeState({
            players: {
                '0': makePlayer('0', {
                    hand: [makeCard('a1', 'dino_natural_selection', 'action', '0')],
                }),
                '1': makePlayer('1'),
            },
            bases: [
                {
                    defId: 'b1', minions: [
                        makeMinion('m0', 'test', '0', 3),
                        makeMinion('m1', 'test', '1', 5),
                    ], ongoingActions: [],
                },
            ],
        });

        const events = execPlayAction(state, '0', 'a1', 0);
        const destroyEvents = events.filter(e => e.type === SU_EVENTS.MINION_DESTROYED);
        expect(destroyEvents.length).toBe(0);
        const promptEvents = events.filter(e => e.type === SU_EVENTS.PROMPT_CONTINUATION);
        expect(promptEvents.length).toBe(0);
    });

    it('dino_wild_rampage: 目标基地己方随从+2力量', () => {
        const state = makeState({
            players: {
                '0': makePlayer('0', {
                    hand: [makeCard('a1', 'dino_wild_rampage', 'action', '0')],
                }),
                '1': makePlayer('1'),
            },
            bases: [
                {
                    defId: 'b1', minions: [
                        makeMinion('m0', 'test', '0', 3),
                        makeMinion('m1', 'test', '0', 2),
                        makeMinion('m2', 'test', '1', 4),
                    ], ongoingActions: [],
                },
            ],
        });

        const events = execPlayAction(state, '0', 'a1', 0);
        const powerEvents = events.filter(e => e.type === SU_EVENTS.POWER_COUNTER_ADDED);
        expect(powerEvents.length).toBe(2); // m0 和 m1
        expect((powerEvents[0] as any).payload.amount).toBe(2);
    });

    it('dino_survival_of_the_fittest: 消灭全场所有最低力量的随从', () => {
        const state = makeState({
            players: {
                '0': makePlayer('0', {
                    hand: [makeCard('a1', 'dino_survival_of_the_fittest', 'action', '0')],
                }),
                '1': makePlayer('1'),
            },
            bases: [
                {
                    defId: 'b1', minions: [
                        makeMinion('m0', 'test', '0', 5),
                        makeMinion('m1', 'test', '1', 2),
                    ], ongoingActions: [],
                },
                {
                    defId: 'b2', minions: [
                        makeMinion('m2', 'test', '1', 2),
                        makeMinion('m3', 'test', '0', 3),
                    ], ongoingActions: [],
                },
            ],
        });

        const events = execPlayAction(state, '0', 'a1');
        const destroyEvents = events.filter(e => e.type === SU_EVENTS.MINION_DESTROYED);
        // m1(力量2) 和 m2(力量2) 都是最低力量
        expect(destroyEvents.length).toBe(2);
        const destroyedUids = destroyEvents.map(e => (e as any).payload.minionUid);
        expect(destroyedUids).toContain('m1');
        expect(destroyedUids).toContain('m2');
    });
});


// ============================================================================
// 机器人派系
// ============================================================================

describe('机器人派系能力', () => {
    it('robot_zapbot: 额外打出随从', () => {
        const state = makeState({
            players: {
                '0': makePlayer('0', {
                    hand: [makeCard('m1', 'robot_zapbot', 'minion', '0')],
                }),
                '1': makePlayer('1'),
            },
            bases: [{ defId: 'b1', minions: [], ongoingActions: [] }],
        });

        const events = execPlayMinion(state, '0', 'm1', 0);
        const limitEvents = events.filter(e => e.type === SU_EVENTS.LIMIT_MODIFIED);
        expect(limitEvents.length).toBe(1);
        expect((limitEvents[0] as any).payload.limitType).toBe('minion');
    });

    it('robot_tech_center: 按基地上己方随从数抽牌', () => {
        const deckCards = Array.from({ length: 5 }, (_, i) =>
            makeCard(`d${i}`, 'test_card', 'minion', '0')
        );
        const state = makeState({
            players: {
                '0': makePlayer('0', {
                    hand: [makeCard('a1', 'robot_tech_center', 'action', '0')],
                    deck: deckCards,
                }),
                '1': makePlayer('1'),
            },
            bases: [{
                defId: 'b1', minions: [
                    makeMinion('m0', 'test', '0', 1),
                    makeMinion('m1', 'test', '0', 1),
                    makeMinion('m2', 'test', '0', 1),
                ], ongoingActions: [],
            }],
        });

        const events = execPlayAction(state, '0', 'a1');
        const drawEvents = events.filter(e => e.type === SU_EVENTS.CARDS_DRAWN);
        expect(drawEvents.length).toBe(1);
        expect((drawEvents[0] as any).payload.count).toBe(3); // 3个随从 = 抽3张
    });
});

// ============================================================================
// 巫师派系
// ============================================================================

describe('巫师派系能力', () => {
    it('wizard_neophyte: 牌库顶是行动卡时放入手牌', () => {
        const state = makeState({
            players: {
                '0': makePlayer('0', {
                    hand: [makeCard('m1', 'wizard_neophyte', 'minion', '0')],
                    deck: [makeCard('d1', 'test_action', 'action', '0'), makeCard('d2', 'test_minion', 'minion', '0')],
                }),
                '1': makePlayer('1'),
            },
            bases: [{ defId: 'b1', minions: [], ongoingActions: [] }],
        });

        const events = execPlayMinion(state, '0', 'm1', 0);
        const drawEvents = events.filter(e => e.type === SU_EVENTS.CARDS_DRAWN);
        expect(drawEvents.length).toBe(1);
        expect((drawEvents[0] as any).payload.cardUids).toEqual(['d1']);
    });

    it('wizard_neophyte: 牌库顶不是行动卡时不产生事件', () => {
        const state = makeState({
            players: {
                '0': makePlayer('0', {
                    hand: [makeCard('m1', 'wizard_neophyte', 'minion', '0')],
                    deck: [makeCard('d1', 'test_minion', 'minion', '0')],
                }),
                '1': makePlayer('1'),
            },
            bases: [{ defId: 'b1', minions: [], ongoingActions: [] }],
        });

        const events = execPlayMinion(state, '0', 'm1', 0);
        const drawEvents = events.filter(e => e.type === SU_EVENTS.CARDS_DRAWN);
        expect(drawEvents.length).toBe(0);
    });
});

// ============================================================================
// 诡术师派系
// ============================================================================

describe('诡术师派系能力', () => {
    it('trickster_take_the_shinies: 每个对手随机弃两张手牌', () => {
        const state = makeState({
            players: {
                '0': makePlayer('0', {
                    hand: [makeCard('a1', 'trickster_take_the_shinies', 'action', '0')],
                }),
                '1': makePlayer('1', {
                    hand: [
                        makeCard('h1', 'test', 'minion', '1'),
                        makeCard('h2', 'test', 'minion', '1'),
                        makeCard('h3', 'test', 'minion', '1'),
                    ],
                }),
            },
            bases: [],
        });

        const events = execPlayAction(state, '0', 'a1');
        const discardEvents = events.filter(e => e.type === SU_EVENTS.CARDS_DISCARDED);
        expect(discardEvents.length).toBe(1);
        expect((discardEvents[0] as any).payload.playerId).toBe('1');
        expect((discardEvents[0] as any).payload.cardUids.length).toBe(2);
    });

    it('trickster_take_the_shinies: 对手手牌不足2张时弃全部', () => {
        const state = makeState({
            players: {
                '0': makePlayer('0', {
                    hand: [makeCard('a1', 'trickster_take_the_shinies', 'action', '0')],
                }),
                '1': makePlayer('1', {
                    hand: [makeCard('h1', 'test', 'minion', '1')],
                }),
            },
            bases: [],
        });

        const events = execPlayAction(state, '0', 'a1');
        const discardEvents = events.filter(e => e.type === SU_EVENTS.CARDS_DISCARDED);
        expect(discardEvents.length).toBe(1);
        expect((discardEvents[0] as any).payload.cardUids.length).toBe(1);
    });

    it('trickster_disenchant: 消灭基地上的持续行动卡', () => {
        const state = makeState({
            players: {
                '0': makePlayer('0', {
                    hand: [makeCard('a1', 'trickster_disenchant', 'action', '0')],
                }),
                '1': makePlayer('1'),
            },
            bases: [{
                defId: 'b1', minions: [],
                ongoingActions: [{ uid: 'oa1', defId: 'test_ongoing', ownerId: '1' }],
            }],
        });

        const events = execPlayAction(state, '0', 'a1');
        const detachEvents = events.filter(e => e.type === SU_EVENTS.ONGOING_DETACHED);
        expect(detachEvents.length).toBe(1);
        expect((detachEvents[0] as any).payload.cardUid).toBe('oa1');

        // 验证 reduce：持续行动卡回所有者弃牌堆
        const newState = applyEvents(state, events);
        expect(newState.bases[0].ongoingActions.length).toBe(0);
        expect(newState.players['1'].discard.some(c => c.uid === 'oa1')).toBe(true);
    });

    it('trickster_disenchant: 消灭随从上的附着行动卡', () => {
        const state = makeState({
            players: {
                '0': makePlayer('0', {
                    hand: [makeCard('a1', 'trickster_disenchant', 'action', '0')],
                }),
                '1': makePlayer('1'),
            },
            bases: [{
                defId: 'b1',
                minions: [{
                    ...makeMinion('m1', 'test', '1', 3),
                    attachedActions: [{ uid: 'att1', defId: 'test_attached', ownerId: '1' }],
                }],
                ongoingActions: [],
            }],
        });

        const events = execPlayAction(state, '0', 'a1');
        const detachEvents = events.filter(e => e.type === SU_EVENTS.ONGOING_DETACHED);
        expect(detachEvents.length).toBe(1);
        expect((detachEvents[0] as any).payload.cardUid).toBe('att1');

        // 验证 reduce
        const newState = applyEvents(state, events);
        expect(newState.bases[0].minions[0].attachedActions.length).toBe(0);
        expect(newState.players['1'].discard.some(c => c.uid === 'att1')).toBe(true);
    });
});

// ============================================================================
// 外星人派系
// ============================================================================

describe('外星人派系能力', () => {
    it('alien_invader: 获得1VP', () => {
        const state = makeState({
            players: {
                '0': makePlayer('0', {
                    hand: [makeCard('m1', 'alien_invader', 'minion', '0')],
                }),
                '1': makePlayer('1'),
            },
            bases: [{ defId: 'b1', minions: [], ongoingActions: [] }],
        });

        const events = execPlayMinion(state, '0', 'm1', 0);
        const vpEvents = events.filter(e => e.type === SU_EVENTS.VP_AWARDED);
        expect(vpEvents.length).toBe(1);
        expect((vpEvents[0] as any).payload.amount).toBe(1);
        expect((vpEvents[0] as any).payload.playerId).toBe('0');
    });

    it('alien_collector: 收回本基地力量≤3的对手随从', () => {
        const state = makeState({
            players: {
                '0': makePlayer('0', {
                    hand: [makeCard('m1', 'alien_collector', 'minion', '0')],
                }),
                '1': makePlayer('1'),
            },
            bases: [{
                defId: 'b1', minions: [
                    makeMinion('m2', 'test', '1', 3),
                    makeMinion('m3', 'test', '1', 5),
                ], ongoingActions: [],
            }],
        });

        const events = execPlayMinion(state, '0', 'm1', 0);
        const returnEvents = events.filter(e => e.type === SU_EVENTS.MINION_RETURNED);
        expect(returnEvents.length).toBe(1);
        expect((returnEvents[0] as any).payload.minionUid).toBe('m2'); // 力量3≤3
    });

    it('alien_disintegrate: 将力量≤3的随从返回手牌', () => {
        const state = makeState({
            players: {
                '0': makePlayer('0', {
                    hand: [makeCard('a1', 'alien_disintegrate', 'action', '0')],
                }),
                '1': makePlayer('1'),
            },
            bases: [{
                defId: 'b1', minions: [
                    makeMinion('m1', 'test', '1', 2),
                ], ongoingActions: [],
            }],
        });

        const events = execPlayAction(state, '0', 'a1');
        const returnEvents = events.filter(e => e.type === SU_EVENTS.MINION_RETURNED);
        expect(returnEvents.length).toBe(1);
        expect((returnEvents[0] as any).payload.minionUid).toBe('m1');
    });

    it('alien_crop_circles: 将基地所有随从返回手牌', () => {
        const state = makeState({
            players: {
                '0': makePlayer('0', {
                    hand: [makeCard('a1', 'alien_crop_circles', 'action', '0')],
                }),
                '1': makePlayer('1'),
            },
            bases: [{
                defId: 'b1', minions: [
                    makeMinion('m1', 'test', '0', 3),
                    makeMinion('m2', 'test', '1', 2),
                    makeMinion('m3', 'test', '1', 4),
                ], ongoingActions: [],
            }],
        });

        const events = execPlayAction(state, '0', 'a1');
        const returnEvents = events.filter(e => e.type === SU_EVENTS.MINION_RETURNED);
        expect(returnEvents.length).toBe(3); // 所有随从都返回
    });
});
