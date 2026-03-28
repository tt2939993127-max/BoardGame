/**
 * 大杀四方 - 新增基地能力测试
 *
 * 覆盖：
 * - base_haunted_house_al9000: onMinionPlayed 弃一张牌
 * - base_the_field_of_honor: onMinionDestroyed 消灭者获1VP
 * - base_the_workshop: onActionPlayed 额外行动额度
 * - base_crypt: onMinionDestroyed 控制者抽牌
 * - base_tar_pits: onMinionDestroyed 放入牌库底
 * - base_haunted_house: afterScoring 冠军弃手牌抽5
 * - base_temple_of_goju: afterScoring 最高力量随从放牌库底
 * - base_great_library: afterScoring 有随从的玩家抽牌
 * - base_ritual_site: afterScoring 随从洗回牌库
 */

import { describe, expect, it, beforeAll } from 'vitest';
import { initAllAbilities } from '../abilities';
import {
    triggerBaseAbility,
    triggerExtendedBaseAbility,
} from '../domain/baseAbilities';
import { fireTriggers } from '../domain/ongoingEffects';
import { processDestroyTriggers } from '../domain/reducer';
import type { BaseAbilityContext } from '../domain/baseAbilities';
import type { MatchState, RandomFn } from '../../../engine/types';
import type { SmashUpCore, MinionOnBase, CardInstance, MinionDestroyedEvent } from '../domain/types';
import { SU_EVENTS } from '../domain/types';
import { SMASHUP_FACTION_IDS } from '../domain/ids';
import {
    triggerBaseAbilityWithMS,
    getInteractionsFromResult,
    makeMatchState,
    findInteractionOption,
    resolveInteractionChain,
} from './helpers';
import { reduce } from '../domain/reduce';
import { runCommand, defaultTestRandom } from './testRunner';

beforeAll(() => {
    initAllAbilities();
});

function resolveDuelChain(initialState: MatchState<SmashUpCore>) {
    return resolveInteractionChain(initialState, (prompt) => {
        const sourceId = prompt?.data?.sourceId as string | undefined;
        if (sourceId === 'smashup_duel_pinkerton') {
            const option = findInteractionOption(prompt, entry => entry?.value?.amount === 0);
            if (!option) throw new Error('未找到 Pinkerton 的 0 指示物选项');
            return { optionId: option.id };
        }
        if (sourceId === 'smashup_duel_card' || sourceId === 'smashup_duel_deputy_card') {
            const option = findInteractionOption(prompt, entry => entry?.value?.skip === true);
            if (!option) throw new Error(`未找到 ${sourceId} 的跳过选项`);
            return { optionId: option.id };
        }
        if (sourceId === 'smashup_duel_run_em_off_move') {
            return { optionId: prompt.data.options[0].id };
        }
        throw new Error(`未处理的决斗交互 sourceId: ${sourceId ?? 'unknown'}`);
    });
}

const dummyRandom: RandomFn = {
    random: () => 0.5,
    d: () => 1,
    range: (min: number) => min,
    shuffle: <T>(arr: T[]) => [...arr],
};

/** 构造最小测试状态 */
function makeState(overrides: Partial<SmashUpCore> = {}): SmashUpCore {
    return {
        players: {},
        turnOrder: ['0', '1'],
        currentPlayerIndex: 0,
        bases: [],
        baseDeck: [],
        turnNumber: 1,
        nextUid: 100,
        ...overrides,
    } as SmashUpCore;
}

function makeMinion(uid: string, controller: string, power: number, defId = 'd1'): MinionOnBase {
    return {
        uid, defId, controller, owner: controller,
        basePower: power, powerCounters: 0, powerModifier: 0, tempPowerModifier: 0, talentUsed: false, attachedActions: [],
    };
}

function makeCard(uid: string, owner: string, defId = 'test_card'): CardInstance {
    return { uid, defId, type: 'minion', owner };
}

// ============================================================================
// base_haunted_house_al9000: 鬼屋 - 随从入场后弃一张牌
// ============================================================================

describe('base_haunted_house_al9000: 随从入场后弃牌', () => {
    it('打出随从后触发弃牌事件', () => {
        const ctx: BaseAbilityContext = {
            state: makeState({
                bases: [{
                    defId: 'base_haunted_house_al9000',
                    minions: [],
                    ongoingActions: [],
                }],
                players: {
                    '0': {
                        id: '0', vp: 0,
                        hand: [makeCard('h1', '0'), makeCard('h2', '0')],
                        deck: [], discard: [],
                        minionsPlayed: 0, minionLimit: 1,
                        actionsPlayed: 0, actionLimit: 1,
                        factions: [SMASHUP_FACTION_IDS.ALIENS, SMASHUP_FACTION_IDS.DINOSAURS],
                    },
                } as any,
            }),
            baseIndex: 0,
            baseDefId: 'base_haunted_house_al9000',
            playerId: '0',
            minionUid: 'm1',
            minionDefId: 'd1',
            minionPower: 3,
            now: 1000,
        };

        const result = triggerBaseAbilityWithMS('base_haunted_house_al9000', 'onMinionPlayed', ctx);
        expect(result.events.length).toBe(0);
        const interactions = getInteractionsFromResult(result);
        expect(interactions.length).toBe(1);
        expect(interactions[0].data.sourceId).toBe('base_haunted_house_al9000');
    });

    it('手牌为空时不触发弃牌', () => {
        const ctx: BaseAbilityContext = {
            state: makeState({
                bases: [{
                    defId: 'base_haunted_house_al9000',
                    minions: [],
                    ongoingActions: [],
                }],
                players: {
                    '0': {
                        id: '0', vp: 0,
                        hand: [],
                        deck: [], discard: [],
                        minionsPlayed: 0, minionLimit: 1,
                        actionsPlayed: 0, actionLimit: 1,
                        factions: [SMASHUP_FACTION_IDS.ALIENS, SMASHUP_FACTION_IDS.DINOSAURS],
                    },
                } as any,
            }),
            baseIndex: 0,
            baseDefId: 'base_haunted_house_al9000',
            playerId: '0',
            minionUid: 'm1',
            now: 1000,
        };

        const { events } = triggerBaseAbility('base_haunted_house_al9000', 'onMinionPlayed', ctx);
        expect(events.length).toBe(0);
    });
});


// ============================================================================
// base_the_field_of_honor: 荣誉之地 - 消灭者获1VP
// ============================================================================

describe('base_the_field_of_honor: 消灭者获1VP', () => {
    it('有消灭者时触发VP奖励', () => {
        const ctx: BaseAbilityContext = {
            state: makeState({
                bases: [{
                    defId: 'base_the_field_of_honor',
                    minions: [],
                    ongoingActions: [],
                }],
            }),
            baseIndex: 0,
            baseDefId: 'base_the_field_of_honor',
            playerId: '1', // 被消灭随从的拥有者
            destroyerId: '0', // 消灭者
            now: 1000,
        };

        const { events } = triggerExtendedBaseAbility('base_the_field_of_honor', 'onMinionDestroyed', ctx);
        expect(events.length).toBe(1);
        expect(events[0].type).toBe(SU_EVENTS.VP_AWARDED);
        expect((events[0] as any).payload.playerId).toBe('0'); // 消灭者获得VP
        expect((events[0] as any).payload.amount).toBe(1);
    });

    it('无消灭者时不触发', () => {
        const ctx: BaseAbilityContext = {
            state: makeState({
                bases: [{
                    defId: 'base_the_field_of_honor',
                    minions: [],
                    ongoingActions: [],
                }],
            }),
            baseIndex: 0,
            baseDefId: 'base_the_field_of_honor',
            playerId: '1',
            // destroyerId 未设置
            now: 1000,
        };

        const { events } = triggerExtendedBaseAbility('base_the_field_of_honor', 'onMinionDestroyed', ctx);
        expect(events.length).toBe(0);
    });

    it('同一张牌一次性消灭多个随从只给 1VP（按 FAQ，管线层 batch）', () => {
        const core = makeState({
            bases: [{
                defId: 'base_the_field_of_honor',
                minions: [
                    { uid: 'victim-1', defId: 'v1', controller: '1', owner: '1', basePower: 2, powerCounters: 0, powerModifier: 0, tempPowerModifier: 0, talentUsed: false, attachedActions: [] },
                    { uid: 'victim-2', defId: 'v2', controller: '1', owner: '1', basePower: 2, powerCounters: 0, powerModifier: 0, tempPowerModifier: 0, talentUsed: false, attachedActions: [] },
                ],
                ongoingActions: [],
            }],
            players: {
                '0': { id: '0', vp: 0, hand: [], discard: [], deck: [], minionsPlayed: 0, minionLimit: 1, actionsPlayed: 0, actionLimit: 1, factions: [] },
                '1': { id: '1', vp: 0, hand: [], discard: [], deck: [], minionsPlayed: 0, minionLimit: 1, actionsPlayed: 0, actionLimit: 1, factions: [] },
            } as any,
        });
        const ms = makeMatchState(core);
        const events = [
            { type: SU_EVENTS.MINION_DESTROYED, payload: { minionUid: 'victim-1', minionDefId: 'v1', fromBaseIndex: 0, ownerId: '1', destroyerId: '0', reason: 'powderkeg' }, timestamp: 1000 },
            { type: SU_EVENTS.MINION_DESTROYED, payload: { minionUid: 'victim-2', minionDefId: 'v2', fromBaseIndex: 0, ownerId: '1', destroyerId: '0', reason: 'powderkeg' }, timestamp: 1000 },
        ] as any;
        const res = processDestroyTriggers(events, ms, '0', () => 0.5, 1000);
        const vpEvents = res.events.filter((e: any) => e.type === SU_EVENTS.VP_AWARDED);
        expect(vpEvents).toHaveLength(1);
        expect(vpEvents[0].payload.playerId).toBe('0');
        expect(vpEvents[0].payload.amount).toBe(1);
    });

    it('集成路径：destroyerId 缺失时，VP 仍应判给事件操作者而不是被消灭者', () => {
        const victim = makeMinion('victim', '0', 3);
        const core = makeState({
            players: {
                '0': {
                    id: '0',
                    vp: 0,
                    hand: [],
                    deck: [],
                    discard: [],
                    minionsPlayed: 0,
                    minionLimit: 1,
                    actionsPlayed: 0,
                    actionLimit: 1,
                    factions: [SMASHUP_FACTION_IDS.BEAR_CAVALRY, SMASHUP_FACTION_IDS.NINJAS],
                },
                '1': {
                    id: '1',
                    vp: 0,
                    hand: [],
                    deck: [],
                    discard: [],
                    minionsPlayed: 0,
                    minionLimit: 1,
                    actionsPlayed: 0,
                    actionLimit: 1,
                    factions: [SMASHUP_FACTION_IDS.BEAR_CAVALRY, SMASHUP_FACTION_IDS.NINJAS],
                },
            },
            bases: [{
                defId: 'base_the_field_of_honor',
                minions: [victim],
                ongoingActions: [],
            }],
        });
        const ms: MatchState<SmashUpCore> = makeMatchState(core);
        const destroyEvent: MinionDestroyedEvent = {
            type: SU_EVENTS.MINION_DESTROYED,
            payload: {
                minionUid: 'victim',
                minionDefId: victim.defId,
                fromBaseIndex: 0,
                ownerId: '0',
                reason: 'integration_destroy',
            },
            timestamp: 1000,
        };

        const result = processDestroyTriggers([destroyEvent], ms, '1', dummyRandom, 1000);
        const vpEvents = result.events.filter(e => e.type === SU_EVENTS.VP_AWARDED);
        expect(vpEvents).toHaveLength(1);
        expect((vpEvents[0] as any).payload.playerId).toBe('1');
        expect((vpEvents[0] as any).payload.amount).toBe(1);
    });

    it('base_the_field_of_honor: destroy 自己的随从时不应得分', () => {
        const ctx: BaseAbilityContext = {
            state: makeState({
                bases: [{
                    defId: 'base_the_field_of_honor',
                    minions: [],
                    ongoingActions: [],
                }],
            }),
            baseIndex: 0,
            baseDefId: 'base_the_field_of_honor',
            playerId: '0',
            controllerId: '0',
            destroyerId: '0',
            now: 1000,
        };

        const { events } = triggerExtendedBaseAbility('base_the_field_of_honor', 'onMinionDestroyed', ctx);
        expect(events).toHaveLength(0);
    });

    it('base_the_field_of_honor: 同回合同基地同一 destroyer 只触发一次', () => {
        const ctx: BaseAbilityContext = {
            state: makeState({
                bases: [{
                    defId: 'base_the_field_of_honor',
                    minions: [],
                    ongoingActions: [],
                }],
                turnDestroyedMinions: [{
                    uid: 'prev',
                    defId: 'test_minion',
                    baseIndex: 0,
                    owner: '1',
                    destroyer: '0',
                }],
            }),
            baseIndex: 0,
            baseDefId: 'base_the_field_of_honor',
            playerId: '1',
            controllerId: '1',
            destroyerId: '0',
            now: 1001,
        };

        const { events } = triggerExtendedBaseAbility('base_the_field_of_honor', 'onMinionDestroyed', ctx);
        expect(events).toHaveLength(0);
    });
});

describe('Oops Ancient Egyptians bases', () => {
    it('base_pyramids 在回合开始时给出埋葬手牌提示', () => {
        const ctx: BaseAbilityContext = {
            state: makeState({
                bases: [{
                    defId: 'base_pyramids',
                    minions: [],
                    ongoingActions: [],
                }],
                players: {
                    '0': {
                        id: '0',
                        vp: 0,
                        hand: [{ uid: 'h1', defId: 'ancient_egyptians_tomb_trap', type: 'action', owner: '0' }],
                        deck: [],
                        discard: [],
                        minionsPlayed: 0,
                        minionLimit: 1,
                        actionsPlayed: 0,
                        actionLimit: 1,
                        factions: [SMASHUP_FACTION_IDS.ANCIENT_EGYPTIANS, SMASHUP_FACTION_IDS.ALIENS],
                    },
                } as any,
            }),
            matchState: makeMatchState(makeState({
                bases: [{
                    defId: 'base_pyramids',
                    minions: [],
                    ongoingActions: [],
                }],
                players: {
                    '0': {
                        id: '0',
                        vp: 0,
                        hand: [{ uid: 'h1', defId: 'ancient_egyptians_tomb_trap', type: 'action', owner: '0' }],
                        deck: [],
                        discard: [],
                        minionsPlayed: 0,
                        minionLimit: 1,
                        actionsPlayed: 0,
                        actionLimit: 1,
                        factions: [SMASHUP_FACTION_IDS.ANCIENT_EGYPTIANS, SMASHUP_FACTION_IDS.ALIENS],
                    },
                } as any,
            })),
            baseIndex: 0,
            baseDefId: 'base_pyramids',
            playerId: '0',
            now: 1000,
        };

        const result = triggerBaseAbilityWithMS('base_pyramids', 'onTurnStart', ctx);
        const interactions = getInteractionsFromResult(result);
        expect(interactions).toHaveLength(1);
        expect(interactions[0].data.sourceId).toBe('base_pyramids');
    });

    it('base_star_portal 在行动牌打到此基地时让其控制者抽一张牌', () => {
        const ctx: BaseAbilityContext = {
            state: makeState({
                bases: [{
                    defId: 'base_star_portal',
                    minions: [],
                    ongoingActions: [],
                }],
                players: {
                    '0': {
                        id: '0',
                        vp: 0,
                        hand: [],
                        deck: [{ uid: 'd1', defId: 'robot_warbot', type: 'minion', owner: '0' }],
                        discard: [],
                        minionsPlayed: 0,
                        minionLimit: 1,
                        actionsPlayed: 0,
                        actionLimit: 1,
                        factions: [SMASHUP_FACTION_IDS.ANCIENT_EGYPTIANS, SMASHUP_FACTION_IDS.ALIENS],
                    },
                } as any,
            }),
            baseIndex: 0,
            baseDefId: 'base_star_portal',
            playerId: '0',
            actionTargetBaseIndex: 0,
            actionTargetType: 'base',
            now: 1001,
        };

        const result = triggerBaseAbility('base_star_portal', 'onActionPlayed', ctx);
        const drawEvent = result.events.find(event => event.type === SU_EVENTS.CARDS_DRAWN);
        expect(drawEvent).toBeDefined();
        expect((drawEvent as any).payload.playerId).toBe('0');
        expect((drawEvent as any).payload.count).toBe(1);
    });
});

// ============================================================================
// base_the_workshop: 工坊 - 打出战术额外行动额度
// ============================================================================

describe('base_the_workshop: 额外行动额度', () => {
    it('打出战术到工坊时获得+1行动额度', () => {
        const ctx: BaseAbilityContext = {
            state: makeState({
                bases: [{
                    defId: 'base_the_workshop',
                    minions: [],
                    ongoingActions: [],
                }],
            }),
            baseIndex: 0,
            baseDefId: 'base_the_workshop',
            playerId: '0',
            actionTargetBaseIndex: 0,
            now: 1000,
        };

        const { events } = triggerBaseAbility('base_the_workshop', 'onActionPlayed', ctx);
        expect(events.length).toBe(1);
        expect(events[0].type).toBe(SU_EVENTS.LIMIT_MODIFIED);
        expect((events[0] as any).payload.playerId).toBe('0');
        expect((events[0] as any).payload.limitType).toBe('action');
        expect((events[0] as any).payload.delta).toBe(1);
    });

    it('打到工坊随从上的战术不应给予额外战术额度', () => {
        const ctx: BaseAbilityContext = {
            state: makeState({
                bases: [{
                    defId: 'base_the_workshop',
                    minions: [makeMinion('m1', '0', 3)],
                    ongoingActions: [],
                }],
            }),
            baseIndex: 0,
            baseDefId: 'base_the_workshop',
            playerId: '0',
            actionTargetBaseIndex: 0,
            actionTargetMinionUid: 'm1',
            now: 1000,
        };

        const { events } = triggerBaseAbility('base_the_workshop', 'onActionPlayed', ctx);
        expect(events).toHaveLength(0);
    });
});

// ============================================================================
// base_crypt: 地窖 - 随从被消灭后消灭者在自己这里的随从上放 +1 指示物
// ============================================================================

describe('base_crypt: 消灭者放指示物', () => {
    it('消灭者在这里只有一个随从时自动放指示物', () => {
        const ctx: BaseAbilityContext = {
            state: makeState({
                bases: [{
                    defId: 'base_crypt',
                    minions: [
                        { uid: 'm_destroyer', defId: 'd1', controller: '1', owner: '1', basePower: 4, powerCounters: 0, powerModifier: 0, tempPowerModifier: 0, talentUsed: false, attachedActions: [] },
                    ],
                    ongoingActions: [],
                }],
                players: {
                    '0': { id: '0', vp: 0, hand: [], discard: [], deck: [], minionsPlayed: 0, minionLimit: 1, actionsPlayed: 0, actionLimit: 1, factions: [] },
                    '1': { id: '1', vp: 0, hand: [], discard: [], deck: [], minionsPlayed: 0, minionLimit: 1, actionsPlayed: 0, actionLimit: 1, factions: [] },
                } as any,
            }),
            baseIndex: 0,
            baseDefId: 'base_crypt',
            playerId: '0',
            minionUid: 'm_victim',
            destroyerId: '1',
            now: 1000,
        };

        const { events } = triggerExtendedBaseAbility('base_crypt', 'onMinionDestroyed', ctx);
        expect(events.length).toBe(1);
        expect(events[0].type).toBe(SU_EVENTS.POWER_COUNTER_ADDED);
        expect((events[0] as any).payload.minionUid).toBe('m_destroyer');
    });

    it('消灭者在这里没有随从时不放指示物', () => {
        const ctx: BaseAbilityContext = {
            state: makeState({
                bases: [{
                    defId: 'base_crypt',
                    minions: [],
                    ongoingActions: [],
                }],
                players: {
                    '0': { id: '0', vp: 0, hand: [], discard: [], deck: [], minionsPlayed: 0, minionLimit: 1, actionsPlayed: 0, actionLimit: 1, factions: [] },
                    '1': { id: '1', vp: 0, hand: [], discard: [], deck: [], minionsPlayed: 0, minionLimit: 1, actionsPlayed: 0, actionLimit: 1, factions: [] },
                } as any,
            }),
            baseIndex: 0,
            baseDefId: 'base_crypt',
            playerId: '0',
            minionUid: 'm_victim',
            destroyerId: '1',
            now: 1000,
        };

        const { events } = triggerExtendedBaseAbility('base_crypt', 'onMinionDestroyed', ctx);
        expect(events.length).toBe(0);
    });

    it('同一张牌一次性消灭多个随从，只允许触发一次地窖（按 FAQ，管线层 batch）', () => {
        const core = makeState({
            bases: [{
                defId: 'base_crypt',
                minions: [
                    { uid: 'm_destroyer', defId: 'd1', controller: '1', owner: '1', basePower: 4, powerCounters: 0, powerModifier: 0, tempPowerModifier: 0, talentUsed: false, attachedActions: [] },
                    { uid: 'victim-1', defId: 'v1', controller: '0', owner: '0', basePower: 2, powerCounters: 0, powerModifier: 0, tempPowerModifier: 0, talentUsed: false, attachedActions: [] },
                    { uid: 'victim-2', defId: 'v2', controller: '0', owner: '0', basePower: 2, powerCounters: 0, powerModifier: 0, tempPowerModifier: 0, talentUsed: false, attachedActions: [] },
                ],
                ongoingActions: [],
            }],
            players: {
                '0': { id: '0', vp: 0, hand: [], discard: [], deck: [], minionsPlayed: 0, minionLimit: 1, actionsPlayed: 0, actionLimit: 1, factions: [] },
                '1': { id: '1', vp: 0, hand: [], discard: [], deck: [], minionsPlayed: 0, minionLimit: 1, actionsPlayed: 0, actionLimit: 1, factions: [] },
            } as any,
        });
        const ms = makeMatchState(core);
        const events = [
            { type: SU_EVENTS.MINION_DESTROYED, payload: { minionUid: 'victim-1', minionDefId: 'v1', fromBaseIndex: 0, ownerId: '0', destroyerId: '1', reason: 'powderkeg' }, timestamp: 1000 },
            { type: SU_EVENTS.MINION_DESTROYED, payload: { minionUid: 'victim-2', minionDefId: 'v2', fromBaseIndex: 0, ownerId: '0', destroyerId: '1', reason: 'powderkeg' }, timestamp: 1000 },
        ] as any;
        const res = processDestroyTriggers(events, ms, '1', () => 0.5, 1000);
        // base_crypt 是 optional，且有 matchState 时会创建交互；batch 后只创建一次
        const queued = (res.matchState ?? ms).sys.interaction.queue;
        const current = (res.matchState ?? ms).sys.interaction.current;
        const all = [...queued, ...(current ? [current] : [])];
        expect(all.filter((i: any) => i.data?.sourceId === 'base_crypt')).toHaveLength(1);
    });
});


// ============================================================================
// base_tar_pits: 焦油坑 - 被消灭随从放入牌库底
// ============================================================================

describe('base_tar_pits: 被消灭随从放入牌库底', () => {
    it('随从在 Tar Pits 被消灭时，MINION_DESTROYED 归约会把它放到拥有者牌库底（仍算被消灭）', () => {
        const state = makeState({
            bases: [{
                defId: 'base_tar_pits',
                minions: [makeMinion('m1', '0', 3, 'test_minion')],
                ongoingActions: [],
            }],
            players: {
                '0': { id: '0', vp: 0, hand: [], discard: [], deck: [], minionsPlayed: 0, minionLimit: 1, actionsPlayed: 0, actionLimit: 1, factions: [] },
            } as any,
        });

        const evt = {
            type: SU_EVENTS.MINION_DESTROYED,
            payload: { minionUid: 'm1', minionDefId: 'test_minion', fromBaseIndex: 0, ownerId: '0', reason: 'test' },
            timestamp: 1000,
        };

        const next = reduce(state, evt);
        expect(next.players['0'].discard.length).toBe(0);
        expect(next.players['0'].deck.map((c: any) => c.uid)).toEqual(['m1']);
        expect(next.bases[0].minions.length).toBe(0);
        expect((next.turnDestroyedMinions ?? []).some((r: any) => r.uid === 'm1')).toBe(true);
    });

});

// ============================================================================
// base_haunted_house: 伊万斯堡城镇公墓 - 冠军弃手牌抽5
// ============================================================================

describe('base_haunted_house: 冠军弃手牌抽5', () => {
    it('冠军弃掉所有手牌并抽5张', () => {
        const deckCards = Array.from({ length: 10 }, (_, i) =>
            makeCard(`d${i}`, '0', `card_${i}`)
        );
        const handCards = [makeCard('h1', '0'), makeCard('h2', '0'), makeCard('h3', '0')];

        const ctx: BaseAbilityContext = {
            state: makeState({
                bases: [{
                    defId: 'base_haunted_house',
                    minions: [makeMinion('m1', '0', 5), makeMinion('m2', '1', 3)],
                    ongoingActions: [],
                }],
                players: {
                    '0': {
                        id: '0', vp: 0,
                        hand: handCards,
                        deck: deckCards,
                        discard: [],
                        minionsPlayed: 0, minionLimit: 1,
                        actionsPlayed: 0, actionLimit: 1,
                        factions: [SMASHUP_FACTION_IDS.ALIENS, SMASHUP_FACTION_IDS.DINOSAURS],
                    },
                } as any,
            }),
            baseIndex: 0,
            baseDefId: 'base_haunted_house',
            playerId: '0',
            rankings: [
                { playerId: '0', power: 5, vp: 5 },
                { playerId: '1', power: 3, vp: 3 },
            ],
            now: 1000,
        };

        const { events } = triggerBaseAbility('base_haunted_house', 'afterScoring', ctx);
        expect(events.length).toBe(2); // 弃牌 + 抽牌

        // 第一个事件：弃掉所有手牌
        expect(events[0].type).toBe(SU_EVENTS.CARDS_DISCARDED);
        expect((events[0] as any).payload.playerId).toBe('0');
        expect((events[0] as any).payload.cardUids).toEqual(['h1', 'h2', 'h3']);

        // 第二个事件：抽5张
        expect(events[1].type).toBe(SU_EVENTS.CARDS_DRAWN);
        expect((events[1] as any).payload.playerId).toBe('0');
        expect((events[1] as any).payload.count).toBe(5);
        expect((events[1] as any).payload.cardUids.length).toBe(5);
    });

    it('无排名信息时不触发', () => {
        const ctx: BaseAbilityContext = {
            state: makeState(),
            baseIndex: 0,
            baseDefId: 'base_haunted_house',
            playerId: '0',
            // rankings 未设置
            now: 1000,
        };

        const { events } = triggerBaseAbility('base_haunted_house', 'afterScoring', ctx);
        expect(events.length).toBe(0);
    });

    it('冠军手牌为空时只抽牌不弃牌', () => {
        const deckCards = Array.from({ length: 10 }, (_, i) =>
            makeCard(`d${i}`, '0')
        );

        const ctx: BaseAbilityContext = {
            state: makeState({
                players: {
                    '0': {
                        id: '0', vp: 0,
                        hand: [],
                        deck: deckCards,
                        discard: [],
                        minionsPlayed: 0, minionLimit: 1,
                        actionsPlayed: 0, actionLimit: 1,
                        factions: [SMASHUP_FACTION_IDS.ALIENS, SMASHUP_FACTION_IDS.DINOSAURS],
                    },
                } as any,
            }),
            baseIndex: 0,
            baseDefId: 'base_haunted_house',
            playerId: '0',
            rankings: [{ playerId: '0', power: 5, vp: 5 }],
            now: 1000,
        };

        const { events } = triggerBaseAbility('base_haunted_house', 'afterScoring', ctx);
        expect(events.length).toBe(1); // 只有抽牌
        expect(events[0].type).toBe(SU_EVENTS.CARDS_DRAWN);
    });
});

// ============================================================================
// base_temple_of_goju: 刚柔流寺庙 - 最高力量随从放牌库底
// ============================================================================

describe('base_temple_of_goju: 最高力量随从放牌库底', () => {
    it('每位玩家最高力量随从放入牌库底', () => {
        const ctx: BaseAbilityContext = {
            state: makeState({
                bases: [{
                    defId: 'base_temple_of_goju',
                    minions: [
                        makeMinion('m1', '0', 5),
                        makeMinion('m2', '0', 3),
                        makeMinion('m3', '1', 4),
                    ],
                    ongoingActions: [],
                }],
            }),
            baseIndex: 0,
            baseDefId: 'base_temple_of_goju',
            playerId: '0',
            rankings: [
                { playerId: '0', power: 8, vp: 2 },
                { playerId: '1', power: 4, vp: 3 },
            ],
            now: 1000,
        };

        const { events } = triggerBaseAbility('base_temple_of_goju', 'afterScoring', ctx);
        expect(events.length).toBe(2); // 每位玩家一个

        // P0 的最高力量随从 m1 (power 5)
        const p0Event = events.find(e => (e as any).payload.cardUid === 'm1');
        expect(p0Event).toBeDefined();
        expect(p0Event!.type).toBe(SU_EVENTS.CARD_TO_DECK_BOTTOM);
        expect((p0Event as any).payload.ownerId).toBe('0');

        // P1 的最高力量随从 m3 (power 4)
        const p1Event = events.find(e => (e as any).payload.cardUid === 'm3');
        expect(p1Event).toBeDefined();
        expect((p1Event as any).payload.ownerId).toBe('1');
    });

    it('基地无随从时不触发', () => {
        const ctx: BaseAbilityContext = {
            state: makeState({
                bases: [{
                    defId: 'base_temple_of_goju',
                    minions: [],
                    ongoingActions: [],
                }],
            }),
            baseIndex: 0,
            baseDefId: 'base_temple_of_goju',
            playerId: '0',
            rankings: [],
            now: 1000,
        };

        const { events } = triggerBaseAbility('base_temple_of_goju', 'afterScoring', ctx);
        expect(events.length).toBe(0);
    });
});


// ============================================================================
// base_great_library: 大图书馆 - 有随从的玩家抽牌
// ============================================================================

describe('base_great_library: 有随从的玩家抽牌', () => {
    it('每位有随从的玩家抽一张牌', () => {
        const ctx: BaseAbilityContext = {
            state: makeState({
                bases: [{
                    defId: 'base_great_library',
                    minions: [
                        makeMinion('m1', '0', 3),
                        makeMinion('m2', '1', 2),
                    ],
                    ongoingActions: [],
                }],
                players: {
                    '0': {
                        id: '0', vp: 0,
                        hand: [], discard: [],
                        deck: [makeCard('c1', '0')],
                        minionsPlayed: 0, minionLimit: 1,
                        actionsPlayed: 0, actionLimit: 1,
                        factions: [SMASHUP_FACTION_IDS.ALIENS, SMASHUP_FACTION_IDS.DINOSAURS],
                    },
                    '1': {
                        id: '1', vp: 0,
                        hand: [], discard: [],
                        deck: [makeCard('c2', '1')],
                        minionsPlayed: 0, minionLimit: 1,
                        actionsPlayed: 0, actionLimit: 1,
                        factions: [SMASHUP_FACTION_IDS.PIRATES, SMASHUP_FACTION_IDS.NINJAS],
                    },
                } as any,
            }),
            baseIndex: 0,
            baseDefId: 'base_great_library',
            playerId: '0',
            now: 1000,
        };

        const { events } = triggerBaseAbility('base_great_library', 'afterScoring', ctx);
        expect(events.length).toBe(2);
        expect(events.every(e => e.type === SU_EVENTS.CARDS_DRAWN)).toBe(true);

        const p0Draw = events.find(e => (e as any).payload.playerId === '0');
        const p1Draw = events.find(e => (e as any).payload.playerId === '1');
        expect(p0Draw).toBeDefined();
        expect(p1Draw).toBeDefined();
    });

    it('没有随从的玩家不抽牌', () => {
        const ctx: BaseAbilityContext = {
            state: makeState({
                bases: [{
                    defId: 'base_great_library',
                    minions: [makeMinion('m1', '0', 3)],
                    ongoingActions: [],
                }],
                players: {
                    '0': {
                        id: '0', vp: 0,
                        hand: [], discard: [],
                        deck: [makeCard('c1', '0')],
                        minionsPlayed: 0, minionLimit: 1,
                        actionsPlayed: 0, actionLimit: 1,
                        factions: [SMASHUP_FACTION_IDS.ALIENS, SMASHUP_FACTION_IDS.DINOSAURS],
                    },
                    '1': {
                        id: '1', vp: 0,
                        hand: [], discard: [],
                        deck: [makeCard('c2', '1')],
                        minionsPlayed: 0, minionLimit: 1,
                        actionsPlayed: 0, actionLimit: 1,
                        factions: [SMASHUP_FACTION_IDS.PIRATES, SMASHUP_FACTION_IDS.NINJAS],
                    },
                } as any,
            }),
            baseIndex: 0,
            baseDefId: 'base_great_library',
            playerId: '0',
            now: 1000,
        };

        const { events } = triggerBaseAbility('base_great_library', 'afterScoring', ctx);
        expect(events.length).toBe(1); // 只有 P0
        expect((events[0] as any).payload.playerId).toBe('0');
    });

    it('牌库为空的玩家不抽牌', () => {
        const ctx: BaseAbilityContext = {
            state: makeState({
                bases: [{
                    defId: 'base_great_library',
                    minions: [makeMinion('m1', '0', 3)],
                    ongoingActions: [],
                }],
                players: {
                    '0': {
                        id: '0', vp: 0,
                        hand: [], discard: [],
                        deck: [], // 空牌库
                        minionsPlayed: 0, minionLimit: 1,
                        actionsPlayed: 0, actionLimit: 1,
                        factions: [SMASHUP_FACTION_IDS.ALIENS, SMASHUP_FACTION_IDS.DINOSAURS],
                    },
                } as any,
            }),
            baseIndex: 0,
            baseDefId: 'base_great_library',
            playerId: '0',
            now: 1000,
        };

        const { events } = triggerBaseAbility('base_great_library', 'afterScoring', ctx);
        expect(events.length).toBe(0);
    });
});

// ============================================================================
// base_ritual_site: 仪式场所 - 随从洗回牌库
// ============================================================================

describe('base_ritual_site: 随从洗回牌库', () => {
    it('所有随从产生 CARD_TO_DECK_BOTTOM 事件', () => {
        const ctx: BaseAbilityContext = {
            state: makeState({
                bases: [{
                    defId: 'base_ritual_site',
                    minions: [
                        makeMinion('m1', '0', 3),
                        makeMinion('m2', '1', 4),
                        makeMinion('m3', '0', 2),
                    ],
                    ongoingActions: [],
                }],
            }),
            baseIndex: 0,
            baseDefId: 'base_ritual_site',
            playerId: '0',
            now: 1000,
        };

        const { events } = triggerBaseAbility('base_ritual_site', 'afterScoring', ctx);
        expect(events.length).toBe(3);
        expect(events.every(e => e.type === SU_EVENTS.CARD_TO_DECK_BOTTOM)).toBe(true);

        // 验证每个随从都有对应事件
        const uids = events.map(e => (e as any).payload.cardUid);
        expect(uids).toContain('m1');
        expect(uids).toContain('m2');
        expect(uids).toContain('m3');

        // 验证 owner 正确
        const m2Event = events.find(e => (e as any).payload.cardUid === 'm2');
        expect((m2Event as any).payload.ownerId).toBe('1');
    });

    it('基地无随从时不触发', () => {
        const ctx: BaseAbilityContext = {
            state: makeState({
                bases: [{
                    defId: 'base_ritual_site',
                    minions: [],
                    ongoingActions: [],
                }],
            }),
            baseIndex: 0,
            baseDefId: 'base_ritual_site',
            playerId: '0',
            now: 1000,
        };

        const { events } = triggerBaseAbility('base_ritual_site', 'afterScoring', ctx);
        expect(events.length).toBe(0);
    });
});

// ============================================================================
// Monster Smash 新派系基地回归
// ============================================================================

describe('base_laboratorium: 实验工坊 - 当前玩家回合内基地全局首次随从', () => {
    it('当前玩家回合内首次打出到该基地时触发 +1 指示物', () => {
        const ctx: BaseAbilityContext = {
            state: makeState({
                bases: [{ defId: 'base_laboratorium', minions: [makeMinion('m1', '0', 3)], ongoingActions: [] }],
                players: {
                    '0': {
                        id: '0', vp: 0, hand: [], deck: [], discard: [],
                        minionsPlayed: 1, minionLimit: 1, actionsPlayed: 0, actionLimit: 1,
                        minionsPlayedPerBase: { 0: 1 },
                        factions: [SMASHUP_FACTION_IDS.FRANKENSTEIN, SMASHUP_FACTION_IDS.WEREWOLVES],
                    },
                    '1': {
                        id: '1', vp: 0, hand: [], deck: [], discard: [],
                        minionsPlayed: 0, minionLimit: 1, actionsPlayed: 0, actionLimit: 1,
                        minionsPlayedPerBase: { 0: 0 },
                        factions: [SMASHUP_FACTION_IDS.GIANT_ANTS, SMASHUP_FACTION_IDS.VAMPIRES],
                    },
                } as any,
            }),
            baseIndex: 0,
            baseDefId: 'base_laboratorium',
            playerId: '0',
            minionUid: 'm1',
            now: 1000,
        };

        const { events } = triggerBaseAbility('base_laboratorium', 'onMinionPlayed', ctx);
        expect(events.length).toBe(1);
        expect(events[0].type).toBe(SU_EVENTS.POWER_COUNTER_ADDED);
    });

    it('同一回合内其他玩家已先打出到该基地时不应再次触发', () => {
        const ctx: BaseAbilityContext = {
            state: makeState({
                bases: [{ defId: 'base_laboratorium', minions: [makeMinion('m2', '1', 3)], ongoingActions: [] }],
                players: {
                    '0': {
                        id: '0', vp: 0, hand: [], deck: [], discard: [],
                        minionsPlayed: 1, minionLimit: 1, actionsPlayed: 0, actionLimit: 1,
                        minionsPlayedPerBase: { 0: 1 },
                        factions: [SMASHUP_FACTION_IDS.FRANKENSTEIN, SMASHUP_FACTION_IDS.WEREWOLVES],
                    },
                    '1': {
                        id: '1', vp: 0, hand: [], deck: [], discard: [],
                        minionsPlayed: 1, minionLimit: 1, actionsPlayed: 0, actionLimit: 1,
                        minionsPlayedPerBase: { 0: 1 },
                        factions: [SMASHUP_FACTION_IDS.GIANT_ANTS, SMASHUP_FACTION_IDS.VAMPIRES],
                    },
                } as any,
            }),
            baseIndex: 0,
            baseDefId: 'base_laboratorium',
            playerId: '1',
            minionUid: 'm2',
            now: 1000,
        };

        const { events } = triggerBaseAbility('base_laboratorium', 'onMinionPlayed', ctx);
        expect(events.length).toBe(0);
    });

    it('同一玩家本回合第二次打出到该基地时不应触发', () => {
        const ctx: BaseAbilityContext = {
            state: makeState({
                bases: [{ defId: 'base_laboratorium', minions: [makeMinion('m3', '1', 3)], ongoingActions: [] }],
                players: {
                    '0': {
                        id: '0', vp: 0, hand: [], deck: [], discard: [],
                        minionsPlayed: 1, minionLimit: 1, actionsPlayed: 0, actionLimit: 1,
                        minionsPlayedPerBase: { 0: 0 },
                        factions: [SMASHUP_FACTION_IDS.FRANKENSTEIN, SMASHUP_FACTION_IDS.WEREWOLVES],
                    },
                    '1': {
                        id: '1', vp: 0, hand: [], deck: [], discard: [],
                        minionsPlayed: 2, minionLimit: 1, actionsPlayed: 0, actionLimit: 1,
                        minionsPlayedPerBase: { 0: 2 },
                        factions: [SMASHUP_FACTION_IDS.GIANT_ANTS, SMASHUP_FACTION_IDS.VAMPIRES],
                    },
                } as any,
            }),
            baseIndex: 0,
            baseDefId: 'base_laboratorium',
            playerId: '1',
            minionUid: 'm3',
            now: 1000,
        };

        const { events } = triggerBaseAbility('base_laboratorium', 'onMinionPlayed', ctx);
        expect(events.length).toBe(0);
    });
});

describe('base_moot_site: 集会场 - 当前玩家回合内基地全局首次随从', () => {
    it('当前玩家回合内首次打出到该基地时触发 +2 临时力量', () => {
        const ctx: BaseAbilityContext = {
            state: makeState({
                bases: [{ defId: 'base_moot_site', minions: [makeMinion('m1', '0', 3)], ongoingActions: [] }],
                players: {
                    '0': {
                        id: '0', vp: 0, hand: [], deck: [], discard: [],
                        minionsPlayed: 1, minionLimit: 1, actionsPlayed: 0, actionLimit: 1,
                        minionsPlayedPerBase: { 0: 1 },
                        factions: [SMASHUP_FACTION_IDS.WEREWOLVES, SMASHUP_FACTION_IDS.FRANKENSTEIN],
                    },
                    '1': {
                        id: '1', vp: 0, hand: [], deck: [], discard: [],
                        minionsPlayed: 0, minionLimit: 1, actionsPlayed: 0, actionLimit: 1,
                        minionsPlayedPerBase: { 0: 0 },
                        factions: [SMASHUP_FACTION_IDS.GIANT_ANTS, SMASHUP_FACTION_IDS.VAMPIRES],
                    },
                } as any,
            }),
            baseIndex: 0,
            baseDefId: 'base_moot_site',
            playerId: '0',
            minionUid: 'm1',
            now: 1000,
        };

        const { events } = triggerBaseAbility('base_moot_site', 'onMinionPlayed', ctx);
        expect(events.length).toBe(1);
        expect(events[0].type).toBe(SU_EVENTS.TEMP_POWER_ADDED);
    });

    it('同一回合内其他玩家已先打出到该基地时不应再次触发', () => {
        const ctx: BaseAbilityContext = {
            state: makeState({
                bases: [{ defId: 'base_moot_site', minions: [makeMinion('m2', '1', 3)], ongoingActions: [] }],
                players: {
                    '0': {
                        id: '0', vp: 0, hand: [], deck: [], discard: [],
                        minionsPlayed: 1, minionLimit: 1, actionsPlayed: 0, actionLimit: 1,
                        minionsPlayedPerBase: { 0: 1 },
                        factions: [SMASHUP_FACTION_IDS.WEREWOLVES, SMASHUP_FACTION_IDS.FRANKENSTEIN],
                    },
                    '1': {
                        id: '1', vp: 0, hand: [], deck: [], discard: [],
                        minionsPlayed: 1, minionLimit: 1, actionsPlayed: 0, actionLimit: 1,
                        minionsPlayedPerBase: { 0: 1 },
                        factions: [SMASHUP_FACTION_IDS.GIANT_ANTS, SMASHUP_FACTION_IDS.VAMPIRES],
                    },
                } as any,
            }),
            baseIndex: 0,
            baseDefId: 'base_moot_site',
            playerId: '1',
            minionUid: 'm2',
            now: 1000,
        };

        const { events } = triggerBaseAbility('base_moot_site', 'onMinionPlayed', ctx);
        expect(events.length).toBe(0);
    });

    it('同一玩家本回合第二次打出到该基地时不应触发', () => {
        const ctx: BaseAbilityContext = {
            state: makeState({
                bases: [{ defId: 'base_moot_site', minions: [makeMinion('m3', '1', 3)], ongoingActions: [] }],
                players: {
                    '0': {
                        id: '0', vp: 0, hand: [], deck: [], discard: [],
                        minionsPlayed: 1, minionLimit: 1, actionsPlayed: 0, actionLimit: 1,
                        minionsPlayedPerBase: { 0: 0 },
                        factions: [SMASHUP_FACTION_IDS.WEREWOLVES, SMASHUP_FACTION_IDS.FRANKENSTEIN],
                    },
                    '1': {
                        id: '1', vp: 0, hand: [], deck: [], discard: [],
                        minionsPlayed: 2, minionLimit: 1, actionsPlayed: 0, actionLimit: 1,
                        minionsPlayedPerBase: { 0: 2 },
                        factions: [SMASHUP_FACTION_IDS.GIANT_ANTS, SMASHUP_FACTION_IDS.VAMPIRES],
                    },
                } as any,
            }),
            baseIndex: 0,
            baseDefId: 'base_moot_site',
            playerId: '1',
            minionUid: 'm3',
            now: 1000,
        };

        const { events } = triggerBaseAbility('base_moot_site', 'onMinionPlayed', ctx);
        expect(events.length).toBe(0);
    });
});

describe('base_castle_blood: 血堡 - 可选触发', () => {
    it('满足条件时应创建可选交互（可跳过）', () => {
        const result = triggerBaseAbilityWithMS('base_castle_blood', 'onMinionPlayed', {
            state: makeState({
                bases: [{
                    defId: 'base_castle_blood',
                    minions: [
                        makeMinion('m_me', '0', 2),
                        makeMinion('m_op', '1', 5),
                    ],
                    ongoingActions: [],
                }],
                players: {
                    '0': {
                        id: '0', vp: 0, hand: [], deck: [], discard: [],
                        minionsPlayed: 1, minionLimit: 1, actionsPlayed: 0, actionLimit: 1,
                        factions: [SMASHUP_FACTION_IDS.VAMPIRES, SMASHUP_FACTION_IDS.ALIENS],
                    },
                    '1': {
                        id: '1', vp: 0, hand: [], deck: [], discard: [],
                        minionsPlayed: 0, minionLimit: 1, actionsPlayed: 0, actionLimit: 1,
                        factions: [SMASHUP_FACTION_IDS.WEREWOLVES, SMASHUP_FACTION_IDS.PIRATES],
                    },
                } as any,
            }),
            baseIndex: 0,
            baseDefId: 'base_castle_blood',
            playerId: '0',
            minionUid: 'm_me',
            now: 1000,
        });

        expect(result.events.length).toBe(0);
        const interactions = getInteractionsFromResult(result);
        expect(interactions.length).toBe(1);
        expect(interactions[0].data.sourceId).toBe('base_castle_blood');
        expect(interactions[0].data.options.some((o: any) => o.id === 'skip')).toBe(true);
    });
});

describe('base_crypt: 地窖 - 可选触发', () => {
    it('单个可放置目标时也应创建可选交互（包含跳过）', () => {
        const state = makeState({
            bases: [{
                defId: 'base_crypt',
                minions: [
                    makeMinion('m_destroyer', '1', 4),
                ],
                ongoingActions: [],
            }],
            players: {
                '0': {
                    id: '0', vp: 0, hand: [], deck: [], discard: [],
                    minionsPlayed: 0, minionLimit: 1, actionsPlayed: 0, actionLimit: 1,
                    factions: [SMASHUP_FACTION_IDS.ALIENS, SMASHUP_FACTION_IDS.DINOSAURS],
                },
                '1': {
                    id: '1', vp: 0, hand: [], deck: [], discard: [],
                    minionsPlayed: 0, minionLimit: 1, actionsPlayed: 0, actionLimit: 1,
                    factions: [SMASHUP_FACTION_IDS.VAMPIRES, SMASHUP_FACTION_IDS.WEREWOLVES],
                },
            } as any,
        });

        const result = triggerExtendedBaseAbility('base_crypt', 'onMinionDestroyed', {
            state,
            matchState: makeMatchState(state),
            baseIndex: 0,
            baseDefId: 'base_crypt',
            playerId: '0',
            minionUid: 'm_victim',
            destroyerId: '1',
            now: 1000,
        });

        expect(result.events.length).toBe(0);
        const interactions = getInteractionsFromResult(result);
        expect(interactions.length).toBe(1);
        expect(interactions[0].data.sourceId).toBe('base_crypt');
        expect(interactions[0].data.options.some((o: any) => o.id === 'skip')).toBe(true);
    });
});

describe('Oops Vikings bases', () => {
    it('base_drakkar 首次有随从打到这里时会提示选择另一位玩家', () => {
        const result = triggerBaseAbilityWithMS('base_drakkar', 'onMinionPlayed', {
            state: makeState({
                bases: [{
                    defId: 'base_drakkar',
                    minions: [makeMinion('m1', '0', 3)],
                    ongoingActions: [],
                }],
                players: {
                    '0': {
                        id: '0', vp: 0, hand: [], deck: [], discard: [],
                        minionsPlayed: 1, minionLimit: 1, actionsPlayed: 0, actionLimit: 1,
                        minionsPlayedPerBase: { 0: 1 },
                        factions: [SMASHUP_FACTION_IDS.VIKINGS, SMASHUP_FACTION_IDS.ALIENS],
                    },
                    '1': {
                        id: '1',
                        vp: 0,
                        hand: [],
                        deck: [{ uid: 'd1', defId: 'wizard_summon', type: 'action', owner: '1' }],
                        discard: [],
                        minionsPlayed: 0, minionLimit: 1, actionsPlayed: 0, actionLimit: 1,
                        factions: [SMASHUP_FACTION_IDS.WIZARDS, SMASHUP_FACTION_IDS.PIRATES],
                    },
                } as any,
            }),
            baseIndex: 0,
            baseDefId: 'base_drakkar',
            playerId: '0',
            minionUid: 'm1',
            minionDefId: 'test_minion',
            minionPower: 3,
            now: 1000,
        });

        const prompt = getInteractionsFromResult(result)[0] as any;
        expect(prompt?.data?.sourceId).toBe('base_drakkar');

        const option = prompt.data.options.find((entry: any) => entry.value?.targetPlayerId === '1');
        const resolved = runCommand(
            result.matchState!,
            { type: 'SYS_INTERACTION_RESPOND', playerId: '0', payload: { optionId: option.id } } as any,
            defaultTestRandom,
        );

        expect(resolved.finalState.core.players['1'].hand.some(card => card.uid === 'd1')).toBe(true);
        expect(resolved.finalState.core.players['1'].deck).toHaveLength(0);
    });

    it('base_longhouse 会把手牌置于牌库顶并给此基地的己方随从 +2 力量', () => {
        const result = triggerBaseAbilityWithMS('base_longhouse', 'onTurnStart', {
            state: makeState({
                bases: [{
                    defId: 'base_longhouse',
                    minions: [makeMinion('m1', '0', 4)],
                    ongoingActions: [],
                }],
                players: {
                    '0': {
                        id: '0', vp: 0,
                        hand: [makeCard('h1', '0', 'robot_microbot_alpha')],
                        deck: [], discard: [],
                        minionsPlayed: 0, minionLimit: 1, actionsPlayed: 0, actionLimit: 1,
                        factions: [SMASHUP_FACTION_IDS.VIKINGS, SMASHUP_FACTION_IDS.ALIENS],
                    },
                } as any,
            }),
            baseIndex: 0,
            baseDefId: 'base_longhouse',
            playerId: '0',
            now: 1001,
        });

        const cardPrompt = getInteractionsFromResult(result)[0] as any;
        expect(cardPrompt?.data?.sourceId).toBe('base_longhouse_card');

        const chooseCard = cardPrompt.data.options.find((entry: any) => entry.value?.cardUid === 'h1');
        const afterCard = runCommand(
            result.matchState!,
            { type: 'SYS_INTERACTION_RESPOND', playerId: '0', payload: { optionId: chooseCard.id } } as any,
            defaultTestRandom,
        );

        const minionPrompt = (afterCard.finalState.sys.interaction.current as any);
        expect(minionPrompt?.data?.sourceId).toBe('base_longhouse_minion');

        const chooseMinion = minionPrompt.data.options.find((entry: any) => entry.value?.minionUid === 'm1');
        const resolved = runCommand(
            afterCard.finalState,
            { type: 'SYS_INTERACTION_RESPOND', playerId: '0', payload: { optionId: chooseMinion.id } } as any,
            defaultTestRandom,
        );

        expect(resolved.finalState.core.players['0'].deck[0]?.uid).toBe('h1');
        expect(resolved.finalState.core.bases[0].minions[0].tempPowerModifier).toBe(2);
    });
});

describe('Oops Cowboys bases', () => {
    it('base_saloon 在此处有随从被消灭后让场上留有随从的玩家各抽一张', () => {
        const ctx: BaseAbilityContext = {
            state: makeState({
                bases: [{
                    defId: 'base_saloon',
                    minions: [
                        makeMinion('m1', '0', 3),
                        makeMinion('m2', '1', 4),
                    ],
                    ongoingActions: [],
                }],
                players: {
                    '0': {
                        id: '0', vp: 0,
                        hand: [],
                        deck: [makeCard('d0', '0', 'robot_microbot_alpha')],
                        discard: [],
                        minionsPlayed: 0, minionLimit: 1,
                        actionsPlayed: 0, actionLimit: 1,
                        factions: [SMASHUP_FACTION_IDS.COWBOYS, SMASHUP_FACTION_IDS.ALIENS],
                    },
                    '1': {
                        id: '1', vp: 0,
                        hand: [],
                        deck: [makeCard('d1', '1', 'robot_microbot_beta')],
                        discard: [],
                        minionsPlayed: 0, minionLimit: 1,
                        actionsPlayed: 0, actionLimit: 1,
                        factions: [SMASHUP_FACTION_IDS.COWBOYS, SMASHUP_FACTION_IDS.PIRATES],
                    },
                } as any,
            }),
            baseIndex: 0,
            baseDefId: 'base_saloon',
            playerId: '0',
            minionUid: 'victim',
            destroyerId: '1',
            now: 1000,
        };

        const { events } = triggerExtendedBaseAbility('base_saloon', 'onMinionDestroyed', ctx);
        const drawEvents = events.filter(event => event.type === SU_EVENTS.CARDS_DRAWN);
        expect(drawEvents).toHaveLength(2);
        expect(drawEvents.some(event => (event as any).payload.playerId === '0')).toBe(true);
        expect(drawEvents.some(event => (event as any).payload.playerId === '1')).toBe(true);
    });

    it('base_so_so_corral 在打出随从后给出决斗提示并按结果消灭失败者', () => {
        const result = triggerBaseAbilityWithMS('base_so_so_corral', 'onMinionPlayed', {
            state: makeState({
                bases: [{
                    defId: 'base_so_so_corral',
                    minions: [
                        makeMinion('ally-1', '0', 4, 'cowboys_gunfighter'),
                        makeMinion('enemy-1', '1', 2, 'robot_microbot_alpha'),
                    ],
                    ongoingActions: [],
                }],
                players: {
                    '0': {
                        id: '0', vp: 0, hand: [], deck: [], discard: [],
                        minionsPlayed: 1, minionLimit: 1, actionsPlayed: 0, actionLimit: 1,
                        minionsPlayedPerBase: { 0: 1 },
                        factions: [SMASHUP_FACTION_IDS.COWBOYS, SMASHUP_FACTION_IDS.ALIENS],
                    },
                    '1': {
                        id: '1', vp: 0, hand: [], deck: [], discard: [],
                        minionsPlayed: 0, minionLimit: 1, actionsPlayed: 0, actionLimit: 1,
                        factions: [SMASHUP_FACTION_IDS.PIRATES, SMASHUP_FACTION_IDS.WIZARDS],
                    },
                } as any,
            }),
            baseIndex: 0,
            baseDefId: 'base_so_so_corral',
            playerId: '0',
            minionUid: 'ally-1',
            minionDefId: 'cowboys_gunfighter',
            minionPower: 4,
            now: 1001,
        });

        const prompt = getInteractionsFromResult(result)[0] as any;
        expect(prompt?.data?.sourceId).toBe('base_so_so_corral');

        const option = prompt.data.options.find((entry: any) => entry.value?.minionUid === 'enemy-1');
        const resolved = runCommand(
            result.matchState!,
            { type: 'SYS_INTERACTION_RESPOND', playerId: '0', payload: { optionId: option.id } } as any,
            defaultTestRandom,
        );

        const duelResolved = resolveDuelChain(resolved.finalState);
        expect(duelResolved.events.some(event => event.type === SU_EVENTS.MINION_DESTROYED)).toBe(true);
        expect(duelResolved.finalState.core.bases[0].minions.some(minion => minion.uid === 'enemy-1')).toBe(false);
    });
});

describe('Oops Samurai bases', () => {
    it('base_shoguns_palace 在本回合首次打出随从到这里后给出决斗提示并让胜者抓两张', () => {
        const result = triggerBaseAbilityWithMS('base_shoguns_palace', 'onMinionPlayed', {
            state: makeState({
                bases: [{
                    defId: 'base_shoguns_palace',
                    minions: [
                        makeMinion('ally-1', '0', 4, 'samurai_ronin'),
                        makeMinion('enemy-1', '1', 2, 'robot_microbot_alpha'),
                    ],
                    ongoingActions: [],
                }],
                players: {
                    '0': {
                        id: '0', vp: 0, hand: [],
                        deck: [makeCard('d1', '0', 'robot_microbot_alpha'), makeCard('d2', '0', 'robot_microbot_beta')],
                        discard: [],
                        minionsPlayed: 1, minionLimit: 1, actionsPlayed: 0, actionLimit: 1,
                        minionsPlayedPerBase: { 0: 1 },
                        factions: [SMASHUP_FACTION_IDS.SAMURAI, SMASHUP_FACTION_IDS.ALIENS],
                    },
                    '1': {
                        id: '1', vp: 0, hand: [], deck: [], discard: [],
                        minionsPlayed: 0, minionLimit: 1, actionsPlayed: 0, actionLimit: 1,
                        factions: [SMASHUP_FACTION_IDS.PIRATES, SMASHUP_FACTION_IDS.WIZARDS],
                    },
                } as any,
            }),
            baseIndex: 0,
            baseDefId: 'base_shoguns_palace',
            playerId: '0',
            minionUid: 'ally-1',
            minionDefId: 'samurai_ronin',
            minionPower: 4,
            now: 1000,
        });

        const prompt = getInteractionsFromResult(result)[0] as any;
        expect(prompt?.data?.sourceId).toBe('base_shoguns_palace');

        const option = prompt.data.options.find((entry: any) => entry.value?.minionUid === 'enemy-1');
        const resolved = runCommand(
            result.matchState!,
            { type: 'SYS_INTERACTION_RESPOND', playerId: '0', payload: { optionId: option.id } } as any,
            defaultTestRandom,
        );

        const duelResolved = resolveDuelChain(resolved.finalState);
        const drawEvent = duelResolved.events.find(event => event.type === SU_EVENTS.CARDS_DRAWN) as any;
        expect(drawEvent).toBeDefined();
        expect(drawEvent.payload.playerId).toBe('0');
        expect(drawEvent.payload.count).toBe(2);
        expect(duelResolved.events.some(event => event.type === SU_EVENTS.MINION_DESTROYED)).toBe(false);
    });

    it('base_shoguns_palace 平局时双方各抓两张牌', () => {
        const result = triggerBaseAbilityWithMS('base_shoguns_palace', 'onMinionPlayed', {
            state: makeState({
                bases: [{
                    defId: 'base_shoguns_palace',
                    minions: [
                        makeMinion('ally-1', '0', 3, 'samurai_ronin'),
                        makeMinion('enemy-1', '1', 3, 'robot_microbot_alpha'),
                    ],
                    ongoingActions: [],
                }],
                players: {
                    '0': {
                        id: '0', vp: 0, hand: [],
                        deck: [makeCard('d1', '0', 'robot_microbot_alpha'), makeCard('d2', '0', 'robot_microbot_beta')],
                        discard: [],
                        minionsPlayed: 1, minionLimit: 1, actionsPlayed: 0, actionLimit: 1,
                        minionsPlayedPerBase: { 0: 1 },
                        factions: [SMASHUP_FACTION_IDS.SAMURAI, SMASHUP_FACTION_IDS.ALIENS],
                    },
                    '1': {
                        id: '1', vp: 0, hand: [],
                        deck: [makeCard('d3', '1', 'robot_microbot_alpha'), makeCard('d4', '1', 'robot_microbot_beta')],
                        discard: [],
                        minionsPlayed: 0, minionLimit: 1, actionsPlayed: 0, actionLimit: 1,
                        factions: [SMASHUP_FACTION_IDS.PIRATES, SMASHUP_FACTION_IDS.WIZARDS],
                    },
                } as any,
            }),
            baseIndex: 0,
            baseDefId: 'base_shoguns_palace',
            playerId: '0',
            minionUid: 'ally-1',
            minionDefId: 'samurai_ronin',
            minionPower: 3,
            now: 1000,
        });

        const prompt = getInteractionsFromResult(result)[0] as any;
        const option = prompt.data.options.find((entry: any) => entry.value?.minionUid === 'enemy-1');
        const started = runCommand(
            result.matchState!,
            { type: 'SYS_INTERACTION_RESPOND', playerId: '0', payload: { optionId: option.id } } as any,
            defaultTestRandom,
        );

        const duelResolved = resolveDuelChain(started.finalState);
        const drawEvents = duelResolved.events.filter(event => event.type === SU_EVENTS.CARDS_DRAWN) as any[];
        expect(drawEvents).toHaveLength(2);
        expect(drawEvents.some(event => event.payload.playerId === '0' && event.payload.count === 2)).toBe(true);
        expect(drawEvents.some(event => event.payload.playerId === '1' && event.payload.count === 2)).toBe(true);
    });

    it('base_sakura_garden 在本回合第一次有你的随从被消灭时让你抓一张牌', () => {
        const state = makeState({
            bases: [{
                defId: 'base_sakura_garden',
                minions: [],
                ongoingActions: [],
            }],
            players: {
                '0': {
                    id: '0', vp: 0, hand: [],
                    deck: [makeCard('draw-1', '0', 'robot_microbot_alpha')],
                    discard: [],
                    minionsPlayed: 0, minionLimit: 1, actionsPlayed: 0, actionLimit: 1,
                    factions: [SMASHUP_FACTION_IDS.SAMURAI, SMASHUP_FACTION_IDS.ALIENS],
                },
                '1': {
                    id: '1', vp: 0, hand: [], deck: [], discard: [],
                    minionsPlayed: 0, minionLimit: 1, actionsPlayed: 0, actionLimit: 1,
                    factions: [SMASHUP_FACTION_IDS.PIRATES, SMASHUP_FACTION_IDS.WIZARDS],
                },
            } as any,
        });

        const result = fireTriggers(state, 'onMinionDestroyed', {
            state,
            matchState: makeMatchState(state),
            playerId: '0',
            baseIndex: 0,
            triggerMinion: {
                uid: 'dead-1',
                defId: 'samurai_ronin',
                controller: '0',
                owner: '0',
                basePower: 3,
                powerCounters: 0,
                powerModifier: 0,
                tempPowerModifier: 0,
                talentUsed: false,
                attachedActions: [],
            },
            triggerMinionUid: 'dead-1',
            triggerMinionDefId: 'samurai_ronin',
            destroyerId: '1',
            random: dummyRandom,
            now: 1001,
        });

        expect(result.events.some(event => event.type === SU_EVENTS.CARDS_DRAWN)).toBe(true);
    });

    it('base_sakura_garden 同回合第二次有同一玩家的随从被消灭时不应再次抽牌', () => {
        const state = makeState({
            bases: [{
                defId: 'base_sakura_garden',
                minions: [],
                ongoingActions: [],
            }],
            turnDestroyedMinions: [{
                uid: 'prev-1',
                defId: 'samurai_samurai_chan',
                baseIndex: 0,
                owner: '0',
            }],
            players: {
                '0': {
                    id: '0', vp: 0, hand: [],
                    deck: [makeCard('draw-1', '0', 'robot_microbot_alpha')],
                    discard: [],
                    minionsPlayed: 0, minionLimit: 1, actionsPlayed: 0, actionLimit: 1,
                    factions: [SMASHUP_FACTION_IDS.SAMURAI, SMASHUP_FACTION_IDS.ALIENS],
                },
                '1': {
                    id: '1', vp: 0, hand: [], deck: [], discard: [],
                    minionsPlayed: 0, minionLimit: 1, actionsPlayed: 0, actionLimit: 1,
                    factions: [SMASHUP_FACTION_IDS.PIRATES, SMASHUP_FACTION_IDS.WIZARDS],
                },
            } as any,
        });

        const result = fireTriggers(state, 'onMinionDestroyed', {
            state,
            matchState: makeMatchState(state),
            playerId: '0',
            baseIndex: 0,
            triggerMinion: {
                uid: 'dead-2',
                defId: 'samurai_bushi',
                controller: '0',
                owner: '0',
                basePower: 4,
                powerCounters: 0,
                powerModifier: 0,
                tempPowerModifier: 0,
                talentUsed: false,
                attachedActions: [],
            },
            triggerMinionUid: 'dead-2',
            triggerMinionDefId: 'samurai_bushi',
            destroyerId: '1',
            random: dummyRandom,
            now: 1002,
        });

        expect(result.events.some(event => event.type === SU_EVENTS.CARDS_DRAWN)).toBe(false);
    });
});
