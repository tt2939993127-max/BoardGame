/**
 * 大杀四方 - 被动保护类基地测试
 *
 * 覆盖：
 * - base_beautiful_castle: power≥5 → destroy/move/affect 保护；power<5 → 不保护
 * - base_pony_paradise: 2+ 随从 → destroy 保护；1 随从 → 不保护
 * - base_house_of_nine_lives: 拦截 MINION_DESTROYED → MINION_MOVED（其他基地消灭时）；本基地不拦截
 */

import { describe, expect, it, beforeAll } from 'vitest';
import { initAllAbilities, resetAbilityInit } from '../abilities';
import { clearRegistry } from '../domain/abilityRegistry';
import { clearBaseAbilityRegistry } from '../domain/baseAbilities';
import {
    clearOngoingEffectRegistry,
    isMinionProtected,
    interceptEvent,
} from '../domain/ongoingEffects';
import type { SmashUpCore, PlayerState, BaseInPlay, MinionOnBase, MinionDestroyedEvent, MinionMovedEvent } from '../domain/types';
import { SU_EVENTS } from '../domain/types';
import { SMASHUP_FACTION_IDS } from '../domain/ids';

// ============================================================================
// 初始化
// ============================================================================

beforeAll(() => {
    clearRegistry();
    clearBaseAbilityRegistry();
    clearOngoingEffectRegistry();
    resetAbilityInit();
    initAllAbilities();
});

// ============================================================================
// 辅助函数
// ============================================================================

function makePlayer(id: string, overrides?: Partial<PlayerState>): PlayerState {
    return {
        id, vp: 0, hand: [], deck: [], discard: [],
        minionsPlayed: 0, minionLimit: 1,
        actionsPlayed: 0, actionLimit: 1,
        factions: [SMASHUP_FACTION_IDS.ALIENS, SMASHUP_FACTION_IDS.DINOSAURS],
        ...overrides,
    };
}

function makeMinion(uid: string, controller: string, power: number, defId = 'd1'): MinionOnBase {
    return {
        uid, defId, controller, owner: controller,
        basePower: power, powerModifier: 0,
        talentUsed: false, attachedActions: [],
    };
}

function makeBase(defId: string, overrides?: Partial<BaseInPlay>): BaseInPlay {
    return { defId, minions: [], ongoingActions: [], ...overrides };
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
    } as SmashUpCore;
}

// ============================================================================
// base_beautiful_castle: 美丽城堡 - power≥5 免疫
// ============================================================================

describe('base_beautiful_castle: 力量≥5 随从保护', () => {
    const castleBase = makeBase('base_beautiful_castle', {
        minions: [
            makeMinion('m_strong', '0', 5),   // 力量 5，受保护
            makeMinion('m_weak', '0', 3),      // 力量 3，不受保护
            makeMinion('m_opp', '1', 6),       // 对手力量 6，受保护
        ],
    });

    it('power=5 随从免疫 destroy', () => {
        const state = makeState({ bases: [castleBase] });
        const minion = castleBase.minions[0]; // m_strong, power=5
        expect(isMinionProtected(state, minion, 0, '1', 'destroy')).toBe(true);
    });

    it('power=5 随从免疫 move', () => {
        const state = makeState({ bases: [castleBase] });
        const minion = castleBase.minions[0];
        expect(isMinionProtected(state, minion, 0, '1', 'move')).toBe(true);
    });

    it('power=5 随从免疫 affect', () => {
        const state = makeState({ bases: [castleBase] });
        const minion = castleBase.minions[0];
        expect(isMinionProtected(state, minion, 0, '1', 'affect')).toBe(true);
    });

    it('power<5 随从不受保护', () => {
        const state = makeState({ bases: [castleBase] });
        const minion = castleBase.minions[1]; // m_weak, power=3
        expect(isMinionProtected(state, minion, 0, '1', 'destroy')).toBe(false);
        expect(isMinionProtected(state, minion, 0, '1', 'move')).toBe(false);
        expect(isMinionProtected(state, minion, 0, '1', 'affect')).toBe(false);
    });

    it('不在美丽城堡上的随从不受保护', () => {
        const otherBase = makeBase('other_base', {
            minions: [makeMinion('m_other', '0', 7)],
        });
        const state = makeState({ bases: [castleBase, otherBase] });
        const minion = otherBase.minions[0]; // power=7 但在其他基地
        expect(isMinionProtected(state, minion, 1, '1', 'destroy')).toBe(false);
    });

    it('power≥5 对手随从也受保护', () => {
        const state = makeState({ bases: [castleBase] });
        const minion = castleBase.minions[2]; // m_opp, power=6
        expect(isMinionProtected(state, minion, 0, '0', 'destroy')).toBe(true);
    });
});

// ============================================================================
// base_pony_paradise: 小马乐园 - 2+ 随从不可消灭
// ============================================================================

describe('base_pony_paradise: 2+ 随从免疫消灭', () => {
    it('拥有 2 个随从时免疫 destroy', () => {
        const ponyBase = makeBase('base_pony_paradise', {
            minions: [
                makeMinion('m1', '0', 2),
                makeMinion('m2', '0', 3),
            ],
        });
        const state = makeState({ bases: [ponyBase] });
        expect(isMinionProtected(state, ponyBase.minions[0], 0, '1', 'destroy')).toBe(true);
        expect(isMinionProtected(state, ponyBase.minions[1], 0, '1', 'destroy')).toBe(true);
    });

    it('拥有 3 个随从时也免疫 destroy', () => {
        const ponyBase = makeBase('base_pony_paradise', {
            minions: [
                makeMinion('m1', '0', 2),
                makeMinion('m2', '0', 3),
                makeMinion('m3', '0', 1),
            ],
        });
        const state = makeState({ bases: [ponyBase] });
        expect(isMinionProtected(state, ponyBase.minions[0], 0, '1', 'destroy')).toBe(true);
    });

    it('只有 1 个随从时不受保护', () => {
        const ponyBase = makeBase('base_pony_paradise', {
            minions: [makeMinion('m1', '0', 2)],
        });
        const state = makeState({ bases: [ponyBase] });
        expect(isMinionProtected(state, ponyBase.minions[0], 0, '1', 'destroy')).toBe(false);
    });

    it('对手只有 1 个随从不受保护（即使己方有 2 个）', () => {
        const ponyBase = makeBase('base_pony_paradise', {
            minions: [
                makeMinion('m1', '0', 2),
                makeMinion('m2', '0', 3),
                makeMinion('m3', '1', 4), // 对手只有这 1 个
            ],
        });
        const state = makeState({ bases: [ponyBase] });
        // 对手的随从 m3 只有 1 个，不受保护
        expect(isMinionProtected(state, ponyBase.minions[2], 0, '0', 'destroy')).toBe(false);
    });

    it('不在小马乐园的随从不受保护', () => {
        const ponyBase = makeBase('base_pony_paradise');
        const otherBase = makeBase('other_base', {
            minions: [
                makeMinion('m1', '0', 2),
                makeMinion('m2', '0', 3),
            ],
        });
        const state = makeState({ bases: [ponyBase, otherBase] });
        expect(isMinionProtected(state, otherBase.minions[0], 1, '1', 'destroy')).toBe(false);
    });
});

// ============================================================================
// base_house_of_nine_lives: 九命之屋 - 拦截消灭 → 移动
// ============================================================================

describe('base_house_of_nine_lives: 拦截消灭转移动', () => {
    it('其他基地随从被消灭时，拦截为移动到九命之屋', () => {
        const houseBase = makeBase('base_house_of_nine_lives');
        const otherBase = makeBase('other_base', {
            minions: [makeMinion('m1', '0', 3)],
        });
        const state = makeState({ bases: [houseBase, otherBase] });

        const destroyEvent: MinionDestroyedEvent = {
            type: SU_EVENTS.MINION_DESTROYED,
            payload: {
                minionUid: 'm1',
                minionDefId: 'd1',
                fromBaseIndex: 1, // 其他基地
                ownerId: '0',
                reason: '被消灭',
            },
            timestamp: 1000,
        };

        const result = interceptEvent(state, destroyEvent);
        expect(result).toBeDefined();
        expect(result).not.toBeNull();

        // 应替换为 MINION_MOVED 事件
        const moveEvent = result as MinionMovedEvent;
        expect(moveEvent.type).toBe(SU_EVENTS.MINION_MOVED);
        expect(moveEvent.payload.minionUid).toBe('m1');
        expect(moveEvent.payload.toBaseIndex).toBe(0); // 移动到九命之屋
    });

    it('九命之屋本身的随从被消灭时不拦截', () => {
        const houseBase = makeBase('base_house_of_nine_lives', {
            minions: [makeMinion('m1', '0', 3)],
        });
        const state = makeState({ bases: [houseBase] });

        const destroyEvent: MinionDestroyedEvent = {
            type: SU_EVENTS.MINION_DESTROYED,
            payload: {
                minionUid: 'm1',
                minionDefId: 'd1',
                fromBaseIndex: 0, // 九命之屋本身
                ownerId: '0',
                reason: '被消灭',
            },
            timestamp: 1000,
        };

        const result = interceptEvent(state, destroyEvent);
        // 不拦截 → 返回 undefined
        expect(result).toBeUndefined();
    });

    it('九命之屋不在场时不拦截', () => {
        const otherBase = makeBase('other_base', {
            minions: [makeMinion('m1', '0', 3)],
        });
        const state = makeState({ bases: [otherBase] });

        const destroyEvent: MinionDestroyedEvent = {
            type: SU_EVENTS.MINION_DESTROYED,
            payload: {
                minionUid: 'm1',
                minionDefId: 'd1',
                fromBaseIndex: 0,
                ownerId: '0',
                reason: '被消灭',
            },
            timestamp: 1000,
        };

        const result = interceptEvent(state, destroyEvent);
        expect(result).toBeUndefined();
    });
});
