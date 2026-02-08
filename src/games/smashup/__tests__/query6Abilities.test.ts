/**
 * 大杀四方 - Query 6 新增/修改能力测试
 *
 * 覆盖：
 * - alien_supreme_overlord 修复（返回对手随从而非给额外出牌）
 * - alien_beaming_down（弃掉对手随机手牌）
 * - pirate_powderkeg（消灭己方随从 + 链式消灭）
 * - robot_microbot_reclaimer 升级（微型机洗回牌库）
 * - zombie_lord（空基地额外随从额度）
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { execute, reduce } from '../domain/reducer';
import { SU_COMMANDS, SU_EVENTS } from '../domain/types';
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
        players: { '0': makePlayer('0'), '1': makePlayer('1') },
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
    return { core, sys: { phase: 'playCards' } as any } as any;
}

const defaultRandom: RandomFn = {
    shuffle: (arr: any[]) => [...arr],
    random: () => 0.5,
    d: (_max: number) => 1,
    range: (_min: number, _max: number) => _min,
};

function execPlayMinion(state: SmashUpCore, playerId: string, cardUid: string, baseIndex: number, random?: RandomFn): SmashUpEvent[] {
    return execute(makeMatchState(state), {
        type: SU_COMMANDS.PLAY_MINION, playerId,
        payload: { cardUid, baseIndex },
    } as any, random ?? defaultRandom);
}

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
// alien_supreme_overlord 修复测试
// ============================================================================

describe('alien_supreme_overlord（修复：返回对手随从）', () => {
    it('将本基地力量最高的对手随从返回手牌', () => {
        const state = makeState({
            players: {
                '0': makePlayer('0', {
                    hand: [makeCard('m1', 'alien_supreme_overlord', 'minion', '0')],
                }),
                '1': makePlayer('1'),
            },
            bases: [{
                defId: 'b1', minions: [
                    makeMinion('m2', 'test_weak', '1', 2),
                    makeMinion('m3', 'test_strong', '1', 5),
                ], ongoingActions: [],
            }],
        });

        const events = execPlayMinion(state, '0', 'm1', 0);
        const returnEvents = events.filter(e => e.type === SU_EVENTS.MINION_RETURNED);
        expect(returnEvents.length).toBe(1);
        // 应返回力量最高的 m3
        expect((returnEvents[0] as any).payload.minionUid).toBe('m3');
        expect((returnEvents[0] as any).payload.toPlayerId).toBe('1');

        // 不应有额外随从额度事件
        const limitEvents = events.filter(e => e.type === SU_EVENTS.LIMIT_MODIFIED);
        expect(limitEvents.length).toBe(0);
    });

    it('没有对手随从时不产生事件', () => {
        const state = makeState({
            players: {
                '0': makePlayer('0', {
                    hand: [makeCard('m1', 'alien_supreme_overlord', 'minion', '0')],
                }),
                '1': makePlayer('1'),
            },
            bases: [{
                defId: 'b1', minions: [
                    makeMinion('m2', 'test', '0', 3),
                ], ongoingActions: [],
            }],
        });

        const events = execPlayMinion(state, '0', 'm1', 0);
        const returnEvents = events.filter(e => e.type === SU_EVENTS.MINION_RETURNED);
        expect(returnEvents.length).toBe(0);
    });

    it('返回的随从回到所有者手牌（reduce 验证）', () => {
        const state = makeState({
            players: {
                '0': makePlayer('0', {
                    hand: [makeCard('m1', 'alien_supreme_overlord', 'minion', '0')],
                }),
                '1': makePlayer('1'),
            },
            bases: [{
                defId: 'b1', minions: [
                    makeMinion('m2', 'test', '1', 4),
                ], ongoingActions: [],
            }],
        });

        const events = execPlayMinion(state, '0', 'm1', 0);
        const newState = applyEvents(state, events);
        // m2 应回到 P1 手牌
        expect(newState.players['1'].hand.some(c => c.uid === 'm2')).toBe(true);
        // 基地上只剩 m1（刚打出的外星霸主）
        expect(newState.bases[0].minions.length).toBe(1);
        expect(newState.bases[0].minions[0].uid).toBe('m1');
    });
});

// ============================================================================
// alien_beaming_down 测试
// ============================================================================

describe('alien_beaming_down（射线传递）', () => {
    it('弃掉对手随机手牌', () => {
        const state = makeState({
            players: {
                '0': makePlayer('0', {
                    hand: [makeCard('a1', 'alien_beaming_down', 'action', '0')],
                }),
                '1': makePlayer('1', {
                    hand: [
                        makeCard('h1', 'test_a', 'minion', '1'),
                        makeCard('h2', 'test_b', 'action', '1'),
                    ],
                }),
            },
        });

        // random() = 0.5, floor(0.5 * 2) = 1 → 选 h2
        const events = execPlayAction(state, '0', 'a1');
        const discardEvents = events.filter(e => e.type === SU_EVENTS.CARDS_DISCARDED);
        expect(discardEvents.length).toBe(1);
        expect((discardEvents[0] as any).payload.playerId).toBe('1');
        expect((discardEvents[0] as any).payload.cardUids).toEqual(['h2']);
    });

    it('对手无手牌时不产生事件', () => {
        const state = makeState({
            players: {
                '0': makePlayer('0', {
                    hand: [makeCard('a1', 'alien_beaming_down', 'action', '0')],
                }),
                '1': makePlayer('1', { hand: [] }),
            },
        });

        const events = execPlayAction(state, '0', 'a1');
        const discardEvents = events.filter(
            e => e.type === SU_EVENTS.CARDS_DISCARDED && (e as any).payload.playerId === '1'
        );
        expect(discardEvents.length).toBe(0);
    });
});

// ============================================================================
// pirate_powderkeg 测试
// ============================================================================

describe('pirate_powderkeg（炸药桶）', () => {
    it('消灭己方最弱随从，然后消灭同基地所有力量≤该随从的随从', () => {
        const state = makeState({
            players: {
                '0': makePlayer('0', {
                    hand: [makeCard('a1', 'pirate_powderkeg', 'action', '0')],
                }),
                '1': makePlayer('1'),
            },
            bases: [{
                defId: 'b1', minions: [
                    makeMinion('m0', 'test', '0', 2), // 己方力量2（最弱）
                    makeMinion('m1', 'test', '0', 5), // 己方力量5
                    makeMinion('m2', 'test', '1', 1), // 对手力量1 ≤ 2 → 被消灭
                    makeMinion('m3', 'test', '1', 2), // 对手力量2 ≤ 2 → 被消灭
                    makeMinion('m4', 'test', '1', 4), // 对手力量4 > 2 → 存活
                ], ongoingActions: [],
            }],
        });

        const events = execPlayAction(state, '0', 'a1');
        const destroyEvents = events.filter(e => e.type === SU_EVENTS.MINION_DESTROYED);
        // m0(己方牺牲) + m2(力量1) + m3(力量2) = 3
        expect(destroyEvents.length).toBe(3);
        const destroyedUids = destroyEvents.map(e => (e as any).payload.minionUid);
        expect(destroyedUids).toContain('m0');
        expect(destroyedUids).toContain('m2');
        expect(destroyedUids).toContain('m3');
        // m1 和 m4 不应被消灭
        expect(destroyedUids).not.toContain('m1');
        expect(destroyedUids).not.toContain('m4');
    });

    it('没有己方随从时不产生事件', () => {
        const state = makeState({
            players: {
                '0': makePlayer('0', {
                    hand: [makeCard('a1', 'pirate_powderkeg', 'action', '0')],
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
        const destroyEvents = events.filter(e => e.type === SU_EVENTS.MINION_DESTROYED);
        expect(destroyEvents.length).toBe(0);
    });

    it('消灭后状态正确（reduce 验证）', () => {
        const state = makeState({
            players: {
                '0': makePlayer('0', {
                    hand: [makeCard('a1', 'pirate_powderkeg', 'action', '0')],
                }),
                '1': makePlayer('1'),
            },
            bases: [{
                defId: 'b1', minions: [
                    makeMinion('m0', 'test', '0', 1),
                    makeMinion('m1', 'test', '1', 1),
                ], ongoingActions: [],
            }],
        });

        const events = execPlayAction(state, '0', 'a1');
        const newState = applyEvents(state, events);
        // 两个随从都被消灭
        expect(newState.bases[0].minions.length).toBe(0);
        // 各自进弃牌堆
        expect(newState.players['0'].discard.some(c => c.uid === 'm0')).toBe(true);
        expect(newState.players['1'].discard.some(c => c.uid === 'm1')).toBe(true);
    });
});


// ============================================================================
// robot_microbot_reclaimer 升级测试
// ============================================================================

describe('robot_microbot_reclaimer（升级：微型机洗回牌库）', () => {
    it('第一个随从时给额外出牌 + 弃牌堆微型机洗回牌库', () => {
        const state = makeState({
            players: {
                '0': makePlayer('0', {
                    hand: [makeCard('m1', 'robot_microbot_reclaimer', 'minion', '0')],
                    deck: [makeCard('d1', 'test_card', 'minion', '0')],
                    discard: [
                        makeCard('d2', 'robot_microbot_guard', 'minion', '0'),
                        makeCard('d3', 'robot_microbot_fixer', 'minion', '0'),
                        makeCard('d4', 'zombie_walker', 'minion', '0'), // 非微型机
                    ],
                    minionsPlayed: 0,
                }),
                '1': makePlayer('1'),
            },
            bases: [{ defId: 'b1', minions: [], ongoingActions: [] }],
        });

        const events = execPlayMinion(state, '0', 'm1', 0);
        // 应有额外随从额度
        const limitEvents = events.filter(e => e.type === SU_EVENTS.LIMIT_MODIFIED);
        expect(limitEvents.length).toBe(1);
        expect((limitEvents[0] as any).payload.limitType).toBe('minion');

        // 应有牌库重洗（微型机洗回）
        const reshuffleEvents = events.filter(e => e.type === SU_EVENTS.DECK_RESHUFFLED);
        expect(reshuffleEvents.length).toBe(1);
        // 新牌库应包含 d1(原牌库) + d2 + d3(微型机) = 3 张
        const deckUids = (reshuffleEvents[0] as any).payload.deckUids;
        expect(deckUids.length).toBe(3);
    });

    it('弃牌堆无微型机时不触发重洗', () => {
        const state = makeState({
            players: {
                '0': makePlayer('0', {
                    hand: [makeCard('m1', 'robot_microbot_reclaimer', 'minion', '0')],
                    deck: [makeCard('d1', 'test', 'minion', '0')],
                    discard: [makeCard('d2', 'zombie_walker', 'minion', '0')],
                    minionsPlayed: 0,
                }),
                '1': makePlayer('1'),
            },
            bases: [{ defId: 'b1', minions: [], ongoingActions: [] }],
        });

        const events = execPlayMinion(state, '0', 'm1', 0);
        const reshuffleEvents = events.filter(e => e.type === SU_EVENTS.DECK_RESHUFFLED);
        expect(reshuffleEvents.length).toBe(0);
    });

    it('非第一个随从时不给额外出牌但仍洗回微型机', () => {
        const state = makeState({
            players: {
                '0': makePlayer('0', {
                    hand: [makeCard('m1', 'robot_microbot_reclaimer', 'minion', '0')],
                    deck: [],
                    discard: [makeCard('d2', 'robot_microbot_guard', 'minion', '0')],
                    minionsPlayed: 1, // 已打出一个
                }),
                '1': makePlayer('1'),
            },
            bases: [{ defId: 'b1', minions: [], ongoingActions: [] }],
        });

        const events = execPlayMinion(state, '0', 'm1', 0);
        const limitEvents = events.filter(e => e.type === SU_EVENTS.LIMIT_MODIFIED);
        expect(limitEvents.length).toBe(0); // 非第一个，不给额外

        const reshuffleEvents = events.filter(e => e.type === SU_EVENTS.DECK_RESHUFFLED);
        expect(reshuffleEvents.length).toBe(1); // 仍然洗回微型机
    });
});

// ============================================================================
// zombie_lord 测试
// ============================================================================

describe('zombie_lord（僵尸领主）', () => {
    it('每个没有己方随从的基地给一个额外随从额度', () => {
        const state = makeState({
            players: {
                '0': makePlayer('0', {
                    hand: [makeCard('m1', 'zombie_lord', 'minion', '0')],
                }),
                '1': makePlayer('1'),
            },
            bases: [
                { defId: 'b1', minions: [], ongoingActions: [] }, // 打出到此基地
                { defId: 'b2', minions: [makeMinion('m2', 'test', '1', 3)], ongoingActions: [] }, // 无己方随从
                { defId: 'b3', minions: [makeMinion('m3', 'test', '0', 2)], ongoingActions: [] }, // 有己方随从
            ],
        });

        const events = execPlayMinion(state, '0', 'm1', 0);
        const limitEvents = events.filter(e => e.type === SU_EVENTS.LIMIT_MODIFIED);
        // b1 在 execute 时还没有己方随从（m1 还没 reduce），b2 无己方随从，b3 有己方随从
        // 所以空基地 = b1 + b2 = 2 个额外额度
        expect(limitEvents.length).toBe(2);
        for (const evt of limitEvents) {
            expect((evt as any).payload.limitType).toBe('minion');
            expect((evt as any).payload.reason).toBe('zombie_lord');
        }
    });

    it('所有基地都有己方随从时不给额度', () => {
        const state = makeState({
            players: {
                '0': makePlayer('0', {
                    hand: [makeCard('m1', 'zombie_lord', 'minion', '0')],
                }),
                '1': makePlayer('1'),
            },
            bases: [
                { defId: 'b1', minions: [makeMinion('m2', 'test', '0', 2)], ongoingActions: [] },
            ],
        });

        const events = execPlayMinion(state, '0', 'm1', 0);
        const limitEvents = events.filter(e => e.type === SU_EVENTS.LIMIT_MODIFIED);
        expect(limitEvents.length).toBe(0);
    });

    it('无基地时不给额度', () => {
        const state = makeState({
            players: {
                '0': makePlayer('0', {
                    hand: [makeCard('m1', 'zombie_lord', 'minion', '0')],
                }),
                '1': makePlayer('1'),
            },
            bases: [],
        });

        // 没有基地，baseIndex=0 不存在但 zombieLord 只看 state.bases
        const events = execPlayMinion(state, '0', 'm1', 0);
        const limitEvents = events.filter(e => e.type === SU_EVENTS.LIMIT_MODIFIED);
        expect(limitEvents.length).toBe(0);
    });
});
