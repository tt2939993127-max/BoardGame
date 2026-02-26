/**
 * 大杀四方 - 派系卡牌能力测试
 *
 * 覆盖新增的不需要 PromptSystem 的派系能力
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { reduce } from '../domain/reducer';
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
import { runCommand } from './testRunner';
import type { MatchState, RandomFn } from '../../../engine/types';
import { makeMatchState } from './helpers';

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
        basePower: power, powerCounters: 0, powerModifier: 0, tempPowerModifier: 0, talentUsed: false, attachedActions: [],
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

const defaultRandom: RandomFn = { shuffle: (arr: any[]) => [...arr], random: () => 0.5, d: () => 1, range: (min) => min };

function execPlayMinion(state: SmashUpCore, playerId: string, cardUid: string, baseIndex: number) {
    const ms = makeMatchState(state);
    const result = runCommand(ms, {
        type: SU_COMMANDS.PLAY_MINION,
        playerId,
        payload: { cardUid, baseIndex },
    } as any, defaultRandom);
    return { events: result.events as SmashUpEvent[], matchState: result.finalState };
}

function execPlayAction(state: SmashUpCore, playerId: string, cardUid: string, targetBaseIndex?: number, targetMinionUid?: string) {
    const ms = makeMatchState(state);
    const result = runCommand(ms, {
        type: SU_COMMANDS.PLAY_ACTION,
        playerId,
        payload: { cardUid, targetBaseIndex, targetMinionUid },
    } as any, defaultRandom);
    return { events: result.events as SmashUpEvent[], matchState: result.finalState };
}

function applyEventsLocal(state: SmashUpCore, events: SmashUpEvent[]): SmashUpCore {
    return events.reduce((s, e) => reduce(s, e), state);
}

// ============================================================================
// 海盗派系
// ============================================================================

describe('海盗派系能力', () => {
    it('pirate_broadside: 单个有己方随从的基地时创建 Prompt', () => {
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

        const { matchState } = execPlayAction(state, '0', 'a1', 0);
        // 单个基地时创建 Interaction
        const current = (matchState.sys as any).interaction?.current;
        expect(current).toBeDefined();
        expect(current?.data?.sourceId).toBe('pirate_broadside');
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

        const { matchState } = execPlayAction(state, '0', 'a1');
        // 多个力量≤2目标时创建 Interaction
        const current = (matchState.sys as any).interaction?.current;
        expect(current).toBeDefined();
        expect(current?.data?.sourceId).toBe('pirate_cannon_choose_first');
    });

    it('pirate_cannon: 单目标时创建 Prompt', () => {
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

        const { matchState } = execPlayAction(state, '0', 'a1');
        const current = (matchState.sys as any).interaction?.current;
        expect(current).toBeDefined();
        expect(current?.data?.sourceId).toBe('pirate_cannon_choose_first');
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

        const { events, matchState } = execPlayAction(state, '0', 'a1');
        const powerEvents = events.filter(e => e.type === SU_EVENTS.TEMP_POWER_ADDED);
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
    it('ninja_seeing_stars: 单个力量≤3对手随从时创建 Prompt', () => {
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

        const { matchState } = execPlayAction(state, '0', 'a1');
        const current = (matchState.sys as any).interaction?.current;
        expect(current).toBeDefined();
        expect(current?.data?.sourceId).toBe('ninja_seeing_stars');
    });
});

// ============================================================================
// 恐龙派系
// ============================================================================

describe('恐龙派系能力', () => {
    it('dino_rampage: 选择基地降低爆破点', () => {
        const state = makeState({
            players: {
                '0': makePlayer('0', {
                    hand: [makeCard('a1', 'dino_rampage', 'action', '0')],
                }),
                '1': makePlayer('1'),
            },
            bases: [
                { defId: 'b1', minions: [makeMinion('m0', 'test', '0', 3)], ongoingActions: [] },
                { defId: 'b2', minions: [makeMinion('m1', 'test', '0', 2)], ongoingActions: [] },
            ],
        });

        const { matchState } = execPlayAction(state, '0', 'a1');
        const current = (matchState.sys as any).interaction?.current;
        expect(current).toBeDefined();
        expect(current?.data?.sourceId).toBe('dino_rampage');
    });

    it('dino_rampage: 单基地单随从自动执行', () => {
        const state = makeState({
            players: {
                '0': makePlayer('0', {
                    hand: [makeCard('a1', 'dino_rampage', 'action', '0')],
                }),
                '1': makePlayer('1'),
            },
            bases: [
                { defId: 'b1', minions: [makeMinion('m0', 'test', '0', 3)], ongoingActions: [] },
            ],
        });

        // 单基地单随从 → 自动执行
        const { events } = execPlayAction(state, '0', 'a1');
        const bpEvent = events.find(e => e.type === SU_EVENTS.BREAKPOINT_MODIFIED);
        expect(bpEvent).toBeDefined();
        // 力量 = 3（单个随从）
        expect((bpEvent as any).payload.delta).toBe(-3);
        expect((bpEvent as any).payload.baseIndex).toBe(0);
    });

    it('dino_rampage: 单基地多随从 → 选随从交互', () => {
        const state = makeState({
            players: {
                '0': makePlayer('0', {
                    hand: [makeCard('a1', 'dino_rampage', 'action', '0')],
                }),
                '1': makePlayer('1'),
            },
            bases: [
                { defId: 'b1', minions: [makeMinion('m0', 'test', '0', 3), makeMinion('m1', 'test2', '0', 5)], ongoingActions: [] },
            ],
        });

        // 单基地多随从 → 直接进入选随从交互
        const { events, matchState } = execPlayAction(state, '0', 'a1');
        const bpEvent = events.find(e => e.type === SU_EVENTS.BREAKPOINT_MODIFIED);
        expect(bpEvent).toBeUndefined(); // 不应自动执行
        const current = (matchState.sys as any).interaction?.current;
        expect(current).toBeDefined();
        expect(current?.data?.sourceId).toBe('dino_rampage_choose_minion');
        // 应该有2个选项（m0 和 m1）
        expect(current?.data?.options?.length).toBe(2);
    });

    it('dino_rampage: 两步交互 - 选基地再选随从', () => {
        const state = makeState({
            players: {
                '0': makePlayer('0', {
                    hand: [makeCard('a1', 'dino_rampage', 'action', '0')],
                }),
                '1': makePlayer('1'),
            },
            bases: [
                { defId: 'b1', minions: [makeMinion('m0', 'test', '0', 3), makeMinion('m1', 'test2', '0', 5)], ongoingActions: [] },
                { defId: 'b2', minions: [makeMinion('m2', 'test', '0', 2)], ongoingActions: [] },
            ],
        });

        // 第一步：多基地（两个基地都有己方随从）→ 选基地交互
        const ms = makeMatchState(state);
        const r1 = runCommand(ms, {
            type: SU_COMMANDS.PLAY_ACTION,
            playerId: '0',
            payload: { cardUid: 'a1' },
        } as any, defaultRandom);
        expect(r1.success).toBe(true);
        const current1 = r1.finalState.sys.interaction?.current;
        expect(current1).toBeDefined();
        expect(current1?.data?.sourceId).toBe('dino_rampage');

        // 第二步：选择基地0（有2个己方随从）→ 进入选随从交互
        const baseOption = (current1?.data as any)?.options?.find((o: any) => o.value?.baseIndex === 0);
        expect(baseOption).toBeDefined();
        const r2 = runCommand(r1.finalState, {
            type: 'SYS_INTERACTION_RESPOND',
            playerId: '0',
            payload: { optionId: baseOption.id },
        } as any, defaultRandom);
        expect(r2.success).toBe(true);
        const current2 = r2.finalState.sys.interaction?.current;
        expect(current2).toBeDefined();
        expect(current2?.data?.sourceId).toBe('dino_rampage_choose_minion');

        // 第三步：选择 m1（力量5）→ 降低5爆破点
        const minionOption = (current2?.data as any)?.options?.find((o: any) => o.value?.minionUid === 'm1');
        expect(minionOption).toBeDefined();
        const r3 = runCommand(r2.finalState, {
            type: 'SYS_INTERACTION_RESPOND',
            playerId: '0',
            payload: { optionId: minionOption.id },
        } as any, defaultRandom);
        expect(r3.success).toBe(true);
        const bpEvent = r3.events.find((e: any) => e.type === SU_EVENTS.BREAKPOINT_MODIFIED);
        expect(bpEvent).toBeDefined();
        expect((bpEvent as any).payload.delta).toBe(-5);
        expect((bpEvent as any).payload.baseIndex).toBe(0);
        // 交互链结束
        expect(r3.finalState.sys.interaction?.current).toBeUndefined();
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

        const { matchState } = execPlayAction(state, '0', 'a1');
        // 多个己方随从时应创建 Interaction 而非自动选择
        const current = (matchState.sys as any).interaction?.current;
        expect(current).toBeDefined();
        expect(current?.data?.sourceId).toBe('dino_augmentation');
    });

    it('dino_augmentation: 单个己方随从时创建 Prompt', () => {
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

        const { matchState } = execPlayAction(state, '0', 'a1');
        const current = (matchState.sys as any).interaction?.current;
        expect(current).toBeDefined();
        expect(current?.data?.sourceId).toBe('dino_augmentation');
    });

    it('dino_howl: 所有己方随从+1力量（临时，回合结束清零）', () => {
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

        const { events, matchState } = execPlayAction(state, '0', 'a1');
        const powerEvents = events.filter(e => e.type === SU_EVENTS.TEMP_POWER_ADDED);
        expect(powerEvents.length).toBe(1); // 只有己方 m0
        expect((powerEvents[0] as any).payload.minionUid).toBe('m0');
    });

    it('dino_natural_selection: 单个己方随从+单个目标时创建 Prompt', () => {
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

        const { matchState } = execPlayAction(state, '0', 'a1', 0);
        const current = (matchState.sys as any).interaction?.current;
        expect(current).toBeDefined();
        expect(current?.data?.sourceId).toBe('dino_natural_selection_choose_mine');
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

        const { events, matchState } = execPlayAction(state, '0', 'a1', 0);
        // 多个目标时不直接消灭，而是创建 Interaction 让玩家选择
        const destroyEvents = events.filter(e => e.type === SU_EVENTS.MINION_DESTROYED);
        expect(destroyEvents.length).toBe(0);
        const current = (matchState.sys as any).interaction?.current;
        expect(current).toBeDefined();
        expect(current?.data?.sourceId).toBe('dino_natural_selection_choose_mine');
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

        const { events, matchState } = execPlayAction(state, '0', 'a1', 0);
        const destroyEvents = events.filter(e => e.type === SU_EVENTS.MINION_DESTROYED);
        expect(destroyEvents.length).toBe(0);
        const current = (matchState.sys as any).interaction?.current;
        expect(current).toBeUndefined();
    });

    it('dino_survival_of_the_fittest: 每个基地消灭一个最低力量随从', () => {
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

        const { events, matchState } = execPlayAction(state, '0', 'a1');
        const destroyEvents = events.filter(e => e.type === SU_EVENTS.MINION_DESTROYED);
        // m1(力量2) 和 m2(力量2) 都是最低力量
        expect(destroyEvents.length).toBe(2);
        const destroyedUids = destroyEvents.map(e => (e as any).payload.minionUid);
        expect(destroyedUids).toContain('m1');
        expect(destroyedUids).toContain('m2');
    });

    it('dino_survival_of_the_fittest: 3个基地都应消灭最低力量随从', () => {
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
                {
                    defId: 'b3', minions: [
                        makeMinion('m4', 'test', '0', 7),
                        makeMinion('m5', 'test', '1', 1),
                        makeMinion('m6', 'test', '0', 4),
                    ], ongoingActions: [],
                },
            ],
        });

        const { events, matchState } = execPlayAction(state, '0', 'a1');
        const destroyEvents = events.filter(e => e.type === SU_EVENTS.MINION_DESTROYED);
        // m1(基地0,力量2), m2(基地1,力量2), m5(基地2,力量1) 都应被消灭
        expect(destroyEvents.length).toBe(3);
        const destroyedUids = destroyEvents.map(e => (e as any).payload.minionUid);
        expect(destroyedUids).toContain('m1');
        expect(destroyedUids).toContain('m2');
        expect(destroyedUids).toContain('m5');

        // 验证 reduce 后的状态
        const finalCore = events.reduce((s, e) => reduce(s, e), state);
        expect(finalCore.bases[0].minions.length).toBe(1);
        expect(finalCore.bases[0].minions[0].uid).toBe('m0');
        expect(finalCore.bases[1].minions.length).toBe(1);
        expect(finalCore.bases[1].minions[0].uid).toBe('m3');
        expect(finalCore.bases[2].minions.length).toBe(2);
    });

    it('dino_survival_of_the_fittest: 平局时创建交互，非平局基地仍直接消灭', () => {
        const state = makeState({
            players: {
                '0': makePlayer('0', {
                    hand: [makeCard('a1', 'dino_survival_of_the_fittest', 'action', '0')],
                }),
                '1': makePlayer('1'),
            },
            bases: [
                {
                    // 基地0：m1和m2都是力量2（平局），m0力量5更高 → 需要玩家选择
                    defId: 'b1', minions: [
                        makeMinion('m0', 'test', '0', 5),
                        makeMinion('m1', 'test', '1', 2),
                        makeMinion('m2', 'test', '0', 2),
                    ], ongoingActions: [],
                },
                {
                    // 基地1：m3力量1唯一最低 → 直接消灭
                    defId: 'b2', minions: [
                        makeMinion('m3', 'test', '1', 1),
                        makeMinion('m4', 'test', '0', 3),
                    ], ongoingActions: [],
                },
                {
                    // 基地2：m5和m6都是力量2（平局），m7力量6更高 → 需要玩家选择
                    defId: 'b3', minions: [
                        makeMinion('m5', 'test', '1', 2),
                        makeMinion('m6', 'test', '0', 2),
                        makeMinion('m7', 'test', '1', 6),
                    ], ongoingActions: [],
                },
            ],
        });

        const { events, matchState } = execPlayAction(state, '0', 'a1');
        const destroyEvents = events.filter(e => e.type === SU_EVENTS.MINION_DESTROYED);
        // 基地1的 m3 应该直接被消灭
        expect(destroyEvents.length).toBe(1);
        expect((destroyEvents[0] as any).payload.minionUid).toBe('m3');

        // 应该有交互（基地0的平局选择）
        const current = (matchState.sys as any).interaction?.current;
        expect(current).toBeDefined();
        expect(current?.data?.sourceId).toBe('dino_survival_tiebreak');

        // continuationContext 应该包含基地2的平局信息
        const ctx = current?.data?.continuationContext;
        expect(ctx?.remainingBases?.length).toBe(1);
        expect(ctx?.remainingBases[0]?.baseIndex).toBe(2);
    });

    it('dino_survival_of_the_fittest: 完整交互链 - 两个平局基地依次选择', () => {
        const state = makeState({
            players: {
                '0': makePlayer('0', {
                    hand: [makeCard('a1', 'dino_survival_of_the_fittest', 'action', '0')],
                }),
                '1': makePlayer('1'),
            },
            bases: [
                {
                    // 基地0：m1和m2都是力量2（平局），m0力量5更高
                    defId: 'b1', minions: [
                        makeMinion('m0', 'test', '0', 5),
                        makeMinion('m1', 'test', '1', 2),
                        makeMinion('m2', 'test', '0', 2),
                    ], ongoingActions: [],
                },
                {
                    // 基地1：m5和m6都是力量3（平局），m7力量6更高
                    defId: 'b2', minions: [
                        makeMinion('m5', 'test', '1', 3),
                        makeMinion('m6', 'test', '0', 3),
                        makeMinion('m7', 'test', '1', 6),
                    ], ongoingActions: [],
                },
            ],
        });

        // 第一步：打出适者生存 → 应该创建基地0的平局选择交互
        const ms = makeMatchState(state);
        const r1 = runCommand(ms, {
            type: SU_COMMANDS.PLAY_ACTION,
            playerId: '0',
            payload: { cardUid: 'a1' },
        } as any, defaultRandom);
        expect(r1.success).toBe(true);

        const current1 = r1.finalState.sys.interaction?.current;
        expect(current1).toBeDefined();
        expect(current1?.data?.sourceId).toBe('dino_survival_tiebreak');
        // 应该有选项（m1 和 m2）
        const options1 = (current1?.data as any)?.options;
        expect(options1?.length).toBe(2);

        // 第二步：选择 m1 消灭 → 应该创建基地1的平局选择交互
        const optionId1 = options1.find((o: any) => o.value?.minionUid === 'm1')?.id;
        expect(optionId1).toBeDefined();
        const r2 = runCommand(r1.finalState, {
            type: 'SYS_INTERACTION_RESPOND',
            playerId: '0',
            payload: { optionId: optionId1 },
        } as any, defaultRandom);
        expect(r2.success).toBe(true);

        // m1 应该被消灭
        const destroyEvents2 = r2.events.filter((e: any) => e.type === SU_EVENTS.MINION_DESTROYED);
        expect(destroyEvents2.length).toBe(1);
        expect((destroyEvents2[0] as any).payload.minionUid).toBe('m1');

        // 应该有基地1的平局选择交互
        const current2 = r2.finalState.sys.interaction?.current;
        expect(current2).toBeDefined();
        expect(current2?.data?.sourceId).toBe('dino_survival_tiebreak');
        const options2 = (current2?.data as any)?.options;
        expect(options2?.length).toBe(2);

        // 第三步：选择 m5 消灭 → 交互链结束
        const optionId2 = options2.find((o: any) => o.value?.minionUid === 'm5')?.id;
        expect(optionId2).toBeDefined();
        const r3 = runCommand(r2.finalState, {
            type: 'SYS_INTERACTION_RESPOND',
            playerId: '0',
            payload: { optionId: optionId2 },
        } as any, defaultRandom);
        expect(r3.success).toBe(true);

        // m5 应该被消灭
        const destroyEvents3 = r3.events.filter((e: any) => e.type === SU_EVENTS.MINION_DESTROYED);
        expect(destroyEvents3.length).toBe(1);
        expect((destroyEvents3[0] as any).payload.minionUid).toBe('m5');

        // 交互链应该结束
        expect(r3.finalState.sys.interaction?.current).toBeUndefined();

        // 验证最终状态
        const finalCore = r3.finalState.core;
        // 基地0：m0(5) 和 m2(2)，m1 被消灭
        expect(finalCore.bases[0].minions.length).toBe(2);
        expect(finalCore.bases[0].minions.map((m: any) => m.uid).sort()).toEqual(['m0', 'm2']);
        // 基地1：m6(3) 和 m7(6)，m5 被消灭
        expect(finalCore.bases[1].minions.length).toBe(2);
        expect(finalCore.bases[1].minions.map((m: any) => m.uid).sort()).toEqual(['m6', 'm7']);
    });
});


// ============================================================================
// 机器人派系
// ============================================================================

describe('机器人派系能力', () => {
    it('robot_zapbot: 打出后直接获得额外随从额度（力量≤2限制）', () => {
        const state = makeState({
            players: {
                '0': makePlayer('0', {
                    hand: [
                        makeCard('m1', 'robot_zapbot', 'minion', '0'),
                        makeCard('m2', 'robot_microbot_guard', 'minion', '0'),
                    ],
                }),
                '1': makePlayer('1'),
            },
            bases: [{ defId: 'b1', minions: [], ongoingActions: [] }],
        });

        const { events } = execPlayMinion(state, '0', 'm1', 0);
        // 直接发 LIMIT_MODIFIED 事件，带 powerMax: 2
        const limitEvents = events.filter(e => e.type === SU_EVENTS.LIMIT_MODIFIED);
        expect(limitEvents.length).toBe(1);
        expect((limitEvents[0] as any).payload.powerMax).toBe(2);
    });

    it('robot_zapbot: 无论手牌是否有力量≤2随从都给额度', () => {
        const state = makeState({
            players: {
                '0': makePlayer('0', {
                    hand: [makeCard('m1', 'robot_zapbot', 'minion', '0')],
                }),
                '1': makePlayer('1'),
            },
            bases: [{ defId: 'b1', minions: [], ongoingActions: [] }],
        });

        const { events } = execPlayMinion(state, '0', 'm1', 0);
        const limitEvents = events.filter(e => e.type === SU_EVENTS.LIMIT_MODIFIED);
        // 即使手牌没有力量≤2随从，也给额度（玩家可以选择不用）
        expect(limitEvents.length).toBe(1);
    });

    it('robot_tech_center: 单个基地时创建 Prompt', () => {
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

        const { matchState } = execPlayAction(state, '0', 'a1');
        const current = (matchState.sys as any).interaction?.current;
        expect(current).toBeDefined();
        expect(current?.data?.sourceId).toBe('robot_tech_center');
    });
});

// ============================================================================
// 巫师派系
// ============================================================================

describe('巫师派系能力', () => {
    it('wizard_neophyte: 牌库顶是行动卡时创建 Prompt 选择处理方式', () => {
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

        const { matchState } = execPlayMinion(state, '0', 'm1', 0);
        const current = (matchState.sys as any).interaction?.current;
        expect(current).toBeDefined();
        expect(current?.data?.sourceId).toBe('wizard_neophyte');
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

        const { events, matchState } = execPlayMinion(state, '0', 'm1', 0);
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

        const { events, matchState } = execPlayAction(state, '0', 'a1');
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

        const { events, matchState } = execPlayAction(state, '0', 'a1');
        const discardEvents = events.filter(e => e.type === SU_EVENTS.CARDS_DISCARDED);
        expect(discardEvents.length).toBe(1);
        expect((discardEvents[0] as any).payload.cardUids.length).toBe(1);
    });

    it('trickster_disenchant: 单个基地持续行动卡时创建 Interaction', () => {
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

        const { events, matchState } = execPlayAction(state, '0', 'a1');
        const current = (matchState.sys as any).interaction?.current;
        expect(current).toBeDefined();
        expect(current?.data?.sourceId).toBe('trickster_disenchant');
    });

    it('trickster_disenchant: 单个随从附着行动卡时创建 Interaction', () => {
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

        const { events, matchState } = execPlayAction(state, '0', 'a1');
        const current = (matchState.sys as any).interaction?.current;
        expect(current).toBeDefined();
        expect(current?.data?.sourceId).toBe('trickster_disenchant');
    });

    it('trickster_disenchant: 选项使用 cardUid + _source: ongoing（显式声明来源）', () => {
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

        const { matchState } = execPlayAction(state, '0', 'a1');
        const current = (matchState.sys as any).interaction?.current;
        expect(current).toBeDefined();
        const options = current?.data?.options;
        expect(options?.length).toBe(1);
        // 选项 value 使用 cardUid，_source 显式声明为 'ongoing'
        expect(options[0].value.cardUid).toBe('oa1');
        expect(options[0]._source).toBe('ongoing');
    });

    it('trickster_disenchant: 同时收集基地 ongoing 和随从附着行动卡', () => {
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
                ongoingActions: [{ uid: 'oa1', defId: 'test_ongoing', ownerId: '0' }],
            }],
        });

        const { matchState } = execPlayAction(state, '0', 'a1');
        const current = (matchState.sys as any).interaction?.current;
        const options = current?.data?.options;
        // 应收集到 2 个目标：1 个基地 ongoing + 1 个随从附着
        expect(options?.length).toBe(2);
    });

    it('trickster_disenchant: 交互解决后 ongoing 卡被移除并进入弃牌堆', () => {
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

        // 模拟交互解决：ONGOING_DETACHED 事件
        const detachEvent = {
            type: SU_EVENTS.ONGOING_DETACHED,
            payload: { cardUid: 'oa1', defId: 'test_ongoing', ownerId: '1', reason: 'trickster_disenchant' },
            timestamp: Date.now(),
        } as SmashUpEvent;
        const newCore = reduce(state, detachEvent);
        // 基地上 ongoing 应被移除
        expect(newCore.bases[0].ongoingActions.length).toBe(0);
        // 卡牌应进入所有者弃牌堆
        expect(newCore.players['1'].discard.some(c => c.uid === 'oa1')).toBe(true);
    });

    it('trickster_disenchant: 场上无行动卡时返回反馈', () => {
        const state = makeState({
            players: {
                '0': makePlayer('0', {
                    hand: [makeCard('a1', 'trickster_disenchant', 'action', '0')],
                }),
                '1': makePlayer('1'),
            },
            bases: [{ defId: 'b1', minions: [], ongoingActions: [] }],
        });

        const { events, matchState } = execPlayAction(state, '0', 'a1');
        // 无目标时应有 ABILITY_FEEDBACK 事件
        const feedbackEvents = events.filter(e => e.type === SU_EVENTS.ABILITY_FEEDBACK);
        expect(feedbackEvents.length).toBe(1);
        // 不应创建交互
        const current = (matchState.sys as any).interaction?.current;
        expect(current).toBeUndefined();
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

        const { events, matchState } = execPlayMinion(state, '0', 'm1', 0);
        const vpEvents = events.filter(e => e.type === SU_EVENTS.VP_AWARDED);
        expect(vpEvents.length).toBe(1);
        expect((vpEvents[0] as any).payload.amount).toBe(1);
        expect((vpEvents[0] as any).payload.playerId).toBe('0');
    });

    it('alien_collector: 单个力量≤3对手随从时创建 Prompt', () => {
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

        const { matchState } = execPlayMinion(state, '0', 'm1', 0);
        const current = (matchState.sys as any).interaction?.current;
        expect(current).toBeDefined();
        expect(current?.data?.sourceId).toBe('alien_collector');
    });

    it('alien_disintegrator: 单个力量≤3随从时创建 Prompt', () => {
        const state = makeState({
            players: {
                '0': makePlayer('0', {
                    hand: [makeCard('a1', 'alien_disintegrator', 'action', '0')],
                }),
                '1': makePlayer('1'),
            },
            bases: [{
                defId: 'b1', minions: [
                    makeMinion('m1', 'test', '1', 2),
                ], ongoingActions: [],
            }],
        });

        const { matchState } = execPlayAction(state, '0', 'a1');
        const current = (matchState.sys as any).interaction?.current;
        expect(current).toBeDefined();
        expect(current?.data?.sourceId).toBe('alien_disintegrator');
    });

    it('alien_crop_circles: 单个基地有随从时创建 Prompt', () => {
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

        const { matchState } = execPlayAction(state, '0', 'a1');
        const current = (matchState.sys as any).interaction?.current;
        expect(current).toBeDefined();
        expect(current?.data?.sourceId).toBe('alien_crop_circles');
    });
});
