/**
 * 大杀四方 - 基地限制校验测试
 *
 * 覆盖：
 * - base_the_homeworld: 额外出牌时 power>2 被拒，power≤2 通过
 * - base_secret_garden: 同 homeworld 的 extraPlayMinionPowerMax 限制
 * - base_tsars_palace: power≤2 随从被拒
 * - base_castle_of_ice: 所有随从被拒
 * - base_dread_lookout: 行动卡被拒
 */

import { describe, expect, it, beforeAll } from 'vitest';
import { initAllAbilities, resetAbilityInit } from '../abilities';
import { clearRegistry } from '../domain/abilityRegistry';
import { clearBaseAbilityRegistry } from '../domain/baseAbilities';
import { clearOngoingEffectRegistry, isOperationRestricted } from '../domain/ongoingEffects';
import { validate } from '../domain/commands';
import type { SmashUpCore, PlayerState, BaseInPlay, CardInstance } from '../domain/types';
import { SU_COMMANDS } from '../domain/types';
import type { MatchState } from '../../../engine/types';
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

function makePlayer(
    id: string, overrides?: Partial<PlayerState>,
): PlayerState {
    return {
        id, vp: 0, hand: [], deck: [], discard: [],
        minionsPlayed: 0, minionLimit: 1,
        actionsPlayed: 0, actionLimit: 1,
        factions: [SMASHUP_FACTION_IDS.ALIENS, SMASHUP_FACTION_IDS.DINOSAURS],
        ...overrides,
    };
}

function makeBase(defId: string, overrides?: Partial<BaseInPlay>): BaseInPlay {
    return { defId, minions: [], ongoingActions: [], ...overrides };
}

function makeCard(uid: string, defId: string, type: 'minion' | 'action', owner = '0'): CardInstance {
    return { uid, defId, type, owner };
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
// base_the_homeworld: 母星 - extraPlayMinionPowerMax
// ============================================================================

describe('base_the_homeworld: 母星力量限制', () => {
    it('首次打随从无限制（minionsPlayed=0）', () => {
        const state = makeState({
            bases: [makeBase('base_the_homeworld')],
            players: {
                '0': makePlayer('0', { minionsPlayed: 0 }),
                '1': makePlayer('1'),
            },
        });

        // power=5 的随从，首次打出不受限制
        const restricted = isOperationRestricted(state, 0, '0', 'play_minion', { basePower: 5 });
        expect(restricted).toBe(false);
    });

    it('额外打随从时 power>2 被拒', () => {
        const state = makeState({
            bases: [makeBase('base_the_homeworld')],
            players: {
                '0': makePlayer('0', { minionsPlayed: 1, minionLimit: 2 }),
                '1': makePlayer('1'),
            },
        });

        // power=3 的随从在额外出牌时被拒
        const restricted = isOperationRestricted(state, 0, '0', 'play_minion', { basePower: 3 });
        expect(restricted).toBe(true);
    });

    it('额外打随从时 power=2 通过', () => {
        const state = makeState({
            bases: [makeBase('base_the_homeworld')],
            players: {
                '0': makePlayer('0', { minionsPlayed: 1, minionLimit: 2 }),
                '1': makePlayer('1'),
            },
        });

        const restricted = isOperationRestricted(state, 0, '0', 'play_minion', { basePower: 2 });
        expect(restricted).toBe(false);
    });

    it('额外打随从时 power=1 通过', () => {
        const state = makeState({
            bases: [makeBase('base_the_homeworld')],
            players: {
                '0': makePlayer('0', { minionsPlayed: 1, minionLimit: 2 }),
                '1': makePlayer('1'),
            },
        });

        const restricted = isOperationRestricted(state, 0, '0', 'play_minion', { basePower: 1 });
        expect(restricted).toBe(false);
    });

    it('validate 命令层面：额外出牌 power>2 随从到母星被拒', () => {
        // alien_invader 力量=3
        const state = makeState({
            bases: [makeBase('base_the_homeworld')],
            players: {
                '0': makePlayer('0', {
                    minionsPlayed: 1, minionLimit: 2,
                    hand: [makeCard('h1', 'alien_invader', 'minion')],
                }),
                '1': makePlayer('1'),
            },
        });
        const matchState: MatchState<SmashUpCore> = {
            core: state,
            sys: { phase: 'playCards' } as any, // eslint-disable-line @typescript-eslint/no-explicit-any
        };

        const result = validate(matchState, {
            type: SU_COMMANDS.PLAY_MINION,
            playerId: '0',
            payload: { cardUid: 'h1', baseIndex: 0 },
        } as any); // eslint-disable-line @typescript-eslint/no-explicit-any
        expect(result.valid).toBe(false);
    });
});

// ============================================================================
// base_secret_garden: 神秘花园 - 同 homeworld 的限制模式
// ============================================================================

describe('base_secret_garden: 神秘花园力量限制', () => {
    it('首次打随从无限制', () => {
        const state = makeState({
            bases: [makeBase('base_secret_garden')],
            players: {
                '0': makePlayer('0', { minionsPlayed: 0 }),
                '1': makePlayer('1'),
            },
        });

        const restricted = isOperationRestricted(state, 0, '0', 'play_minion', { basePower: 5 });
        expect(restricted).toBe(false);
    });

    it('额外打随从时 power>2 被拒', () => {
        const state = makeState({
            bases: [makeBase('base_secret_garden')],
            players: {
                '0': makePlayer('0', { minionsPlayed: 1, minionLimit: 2 }),
                '1': makePlayer('1'),
            },
        });

        const restricted = isOperationRestricted(state, 0, '0', 'play_minion', { basePower: 4 });
        expect(restricted).toBe(true);
    });

    it('额外打随从时 power≤2 通过', () => {
        const state = makeState({
            bases: [makeBase('base_secret_garden')],
            players: {
                '0': makePlayer('0', { minionsPlayed: 1, minionLimit: 2 }),
                '1': makePlayer('1'),
            },
        });

        const restricted = isOperationRestricted(state, 0, '0', 'play_minion', { basePower: 2 });
        expect(restricted).toBe(false);
    });
});

// ============================================================================
// base_tsars_palace: 沙皇宫殿 - power≤2 随从被拒
// ============================================================================

describe('base_tsars_palace: 沙皇宫殿 power≤2 限制', () => {
    it('power=2 随从被拒', () => {
        const state = makeState({
            bases: [makeBase('base_tsars_palace')],
        });

        const restricted = isOperationRestricted(state, 0, '0', 'play_minion', { basePower: 2 });
        expect(restricted).toBe(true);
    });

    it('power=1 随从被拒', () => {
        const state = makeState({
            bases: [makeBase('base_tsars_palace')],
        });

        const restricted = isOperationRestricted(state, 0, '0', 'play_minion', { basePower: 1 });
        expect(restricted).toBe(true);
    });

    it('power=3 随从通过', () => {
        const state = makeState({
            bases: [makeBase('base_tsars_palace')],
        });

        const restricted = isOperationRestricted(state, 0, '0', 'play_minion', { basePower: 3 });
        expect(restricted).toBe(false);
    });

    it('power=5 随从通过', () => {
        const state = makeState({
            bases: [makeBase('base_tsars_palace')],
        });

        const restricted = isOperationRestricted(state, 0, '0', 'play_minion', { basePower: 5 });
        expect(restricted).toBe(false);
    });
});

// ============================================================================
// base_castle_of_ice: 冰之城堡 - 禁止所有随从
// ============================================================================

describe('base_castle_of_ice: 冰之城堡禁止所有随从', () => {
    it('任何随从都被拒', () => {
        const state = makeState({
            bases: [makeBase('base_castle_of_ice')],
        });

        expect(isOperationRestricted(state, 0, '0', 'play_minion', { basePower: 1 })).toBe(true);
        expect(isOperationRestricted(state, 0, '0', 'play_minion', { basePower: 5 })).toBe(true);
        expect(isOperationRestricted(state, 0, '0', 'play_minion', { basePower: 10 })).toBe(true);
    });

    it('行动卡不受限制', () => {
        const state = makeState({
            bases: [makeBase('base_castle_of_ice')],
        });

        const restricted = isOperationRestricted(state, 0, '0', 'play_action');
        expect(restricted).toBe(false);
    });
});

// ============================================================================
// base_dread_lookout: 恐怖眺望台 - 禁止行动卡
// ============================================================================

describe('base_dread_lookout: 恐怖眺望台禁止行动卡', () => {
    it('行动卡被拒', () => {
        const state = makeState({
            bases: [makeBase('base_dread_lookout')],
        });

        const restricted = isOperationRestricted(state, 0, '0', 'play_action');
        expect(restricted).toBe(true);
    });

    it('随从不受限制', () => {
        const state = makeState({
            bases: [makeBase('base_dread_lookout')],
        });

        const restricted = isOperationRestricted(state, 0, '0', 'play_minion', { basePower: 3 });
        expect(restricted).toBe(false);
    });

    it('validate 命令层面：打出行动卡到恐怖眺望台被拒', () => {
        const state = makeState({
            bases: [makeBase('base_dread_lookout')],
            players: {
                '0': makePlayer('0', {
                    hand: [makeCard('h1', 'pirate_full_sail', 'action')],
                }),
                '1': makePlayer('1'),
            },
        });
        const matchState: MatchState<SmashUpCore> = {
            core: state,
            sys: { phase: 'playCards' } as any, // eslint-disable-line @typescript-eslint/no-explicit-any
        };

        const result = validate(matchState, {
            type: SU_COMMANDS.PLAY_ACTION,
            playerId: '0',
            payload: { cardUid: 'h1', targetBaseIndex: 0 },
        } as any); // eslint-disable-line @typescript-eslint/no-explicit-any
        expect(result.valid).toBe(false);
    });
});
