/**
 * 王权骰铸（DiceThrone）流程测试
 */

import { describe, it, expect } from 'vitest';
import { DiceThroneDomain } from '../domain';
import type { DiceThroneCore, TurnPhase } from '../domain/types';
import { CP_MAX, HAND_LIMIT, INITIAL_CP, INITIAL_HEALTH } from '../domain/types';
import { RESOURCE_IDS } from '../domain/resources';
import { MONK_CARDS } from '../monk/cards';
import { GameTestRunner, type TestCase, type StateExpectation } from '../../../engine/testing';
import type { PlayerId, RandomFn } from '../../../engine/types';

// ============================================================================
// 固定随机数（保证回放确定性）
// ============================================================================

const fixedRandom: RandomFn = {
    random: () => 0,
    d: () => 1,
    range: (min) => min,
    shuffle: (arr) => [...arr],
};


const createQueuedRandom = (values: number[]): RandomFn => {
    let index = 0;
    const fallback = values.length > 0 ? values[values.length - 1] : 1;
    return {
        random: () => 0,
        d: (max) => {
            const raw = values[index] ?? fallback;
            index += 1;
            return Math.min(Math.max(1, raw), max);
        },
        range: (min) => min,
        shuffle: (arr) => [...arr],
    };
};

// ============================================================================
// 断言
// ============================================================================

type PlayerExpectation = {
    hp?: number;
    cp?: number;
    handSize?: number;
    deckSize?: number;
    statusEffects?: Record<string, number>;
    discardSize?: number;
    abilityNameById?: Record<string, string>;
    abilityLevels?: Record<string, number>;
};

interface DiceThroneExpectation extends StateExpectation {
    turnPhase?: TurnPhase;
    activePlayerId?: PlayerId;
    turnNumber?: number;
    players?: Record<PlayerId, PlayerExpectation>;
    pendingAttack?: {
        attackerId?: PlayerId;
        defenderId?: PlayerId;
        isDefendable?: boolean;
        sourceAbilityId?: string;
    } | null;
    availableAbilityIdsIncludes?: string[];
    roll?: {
        count?: number;
        limit?: number;
        diceCount?: number;
        confirmed?: boolean;
    };
}

function assertDiceThrone(state: DiceThroneCore, expect: DiceThroneExpectation): string[] {
    const errors: string[] = [];

    if (expect.turnPhase !== undefined && state.turnPhase !== expect.turnPhase) {
        errors.push(`阶段不匹配: 预期 ${expect.turnPhase}, 实际 ${state.turnPhase}`);
    }

    if (expect.activePlayerId !== undefined && state.activePlayerId !== expect.activePlayerId) {
        errors.push(`当前玩家不匹配: 预期 ${expect.activePlayerId}, 实际 ${state.activePlayerId}`);
    }

    if (expect.turnNumber !== undefined && state.turnNumber !== expect.turnNumber) {
        errors.push(`回合数不匹配: 预期 ${expect.turnNumber}, 实际 ${state.turnNumber}`);
    }

    if (expect.roll) {
        if (expect.roll.count !== undefined && state.rollCount !== expect.roll.count) {
            errors.push(`掷骰次数不匹配: 预期 ${expect.roll.count}, 实际 ${state.rollCount}`);
        }
        if (expect.roll.limit !== undefined && state.rollLimit !== expect.roll.limit) {
            errors.push(`掷骰上限不匹配: 预期 ${expect.roll.limit}, 实际 ${state.rollLimit}`);
        }
        if (expect.roll.diceCount !== undefined && state.rollDiceCount !== expect.roll.diceCount) {
            errors.push(`掷骰数量不匹配: 预期 ${expect.roll.diceCount}, 实际 ${state.rollDiceCount}`);
        }
        if (expect.roll.confirmed !== undefined && state.rollConfirmed !== expect.roll.confirmed) {
            errors.push(`确认状态不匹配: 预期 ${expect.roll.confirmed}, 实际 ${state.rollConfirmed}`);
        }
    }

    if (expect.players) {
        for (const [playerId, playerExpect] of Object.entries(expect.players)) {
            const player = state.players[playerId];
            if (!player) {
                errors.push(`玩家不存在: ${playerId}`);
                continue;
            }

            if (playerExpect.hp !== undefined) {
                const hp = player.resources[RESOURCE_IDS.HP] ?? 0;
                if (hp !== playerExpect.hp) {
                    errors.push(`玩家 ${playerId} HP 不匹配: 预期 ${playerExpect.hp}, 实际 ${hp}`);
                }
            }

            if (playerExpect.cp !== undefined) {
                const cp = player.resources[RESOURCE_IDS.CP] ?? 0;
                if (cp !== playerExpect.cp) {
                    errors.push(`玩家 ${playerId} CP 不匹配: 预期 ${playerExpect.cp}, 实际 ${cp}`);
                }
            }

            if (playerExpect.handSize !== undefined && player.hand.length !== playerExpect.handSize) {
                errors.push(`玩家 ${playerId} 手牌数量不匹配: 预期 ${playerExpect.handSize}, 实际 ${player.hand.length}`);
            }

            if (playerExpect.deckSize !== undefined && player.deck.length !== playerExpect.deckSize) {
                errors.push(`玩家 ${playerId} 牌库数量不匹配: 预期 ${playerExpect.deckSize}, 实际 ${player.deck.length}`);
            }

            if (playerExpect.statusEffects) {
                for (const [statusId, stacks] of Object.entries(playerExpect.statusEffects)) {
                    const actual = player.statusEffects[statusId] ?? 0;
                    if (actual !== stacks) {
                        errors.push(`玩家 ${playerId} 状态 ${statusId} 不匹配: 预期 ${stacks}, 实际 ${actual}`);
                    }
                }
            }

            if (playerExpect.abilityLevels) {
                for (const [abilityId, level] of Object.entries(playerExpect.abilityLevels)) {
                    const actual = player.abilityLevels?.[abilityId] ?? 0;
                    if (actual !== level) {
                        errors.push(`玩家 ${playerId} 技能等级 ${abilityId} 不匹配: 预期 ${level}, 实际 ${actual}`);
                    }
                }
            }

            if (playerExpect.discardSize !== undefined && player.discard.length !== playerExpect.discardSize) {
                errors.push(`玩家 ${playerId} 弃牌数量不匹配: 预期 ${playerExpect.discardSize}, 实际 ${player.discard.length}`);
            }

            if (playerExpect.abilityNameById) {
                for (const [abilityId, expectedName] of Object.entries(playerExpect.abilityNameById)) {
                    const ability = player.abilities.find(a => a.id === abilityId);
                    if (!ability) {
                        errors.push(`玩家 ${playerId} 技能不存在: ${abilityId}`);
                        continue;
                    }
                    if (ability.name !== expectedName) {
                        errors.push(`玩家 ${playerId} 技能 ${abilityId} 名称不匹配: 预期 ${expectedName}, 实际 ${ability.name}`);
                    }
                }
            }
        }
    }

    if (expect.pendingAttack === null) {
        if (state.pendingAttack) {
            errors.push('预期待处理攻击为空，但实际存在 pendingAttack');
        }
    } else if (expect.pendingAttack) {
        const pending = state.pendingAttack;
        if (!pending) {
            errors.push('预期待处理攻击存在，但实际为空');
        } else {
            if (expect.pendingAttack.attackerId !== undefined && pending.attackerId !== expect.pendingAttack.attackerId) {
                errors.push(`攻击者不匹配: 预期 ${expect.pendingAttack.attackerId}, 实际 ${pending.attackerId}`);
            }
            if (expect.pendingAttack.defenderId !== undefined && pending.defenderId !== expect.pendingAttack.defenderId) {
                errors.push(`防守者不匹配: 预期 ${expect.pendingAttack.defenderId}, 实际 ${pending.defenderId}`);
            }
            if (expect.pendingAttack.isDefendable !== undefined && pending.isDefendable !== expect.pendingAttack.isDefendable) {
                errors.push(`可防御状态不匹配: 预期 ${expect.pendingAttack.isDefendable}, 实际 ${pending.isDefendable}`);
            }
            if (expect.pendingAttack.sourceAbilityId !== undefined && pending.sourceAbilityId !== expect.pendingAttack.sourceAbilityId) {
                errors.push(`来源技能不匹配: 预期 ${expect.pendingAttack.sourceAbilityId}, 实际 ${pending.sourceAbilityId}`);
            }
        }
    }

    if (expect.availableAbilityIdsIncludes) {
        for (const id of expect.availableAbilityIdsIncludes) {
            if (!state.availableAbilityIds.includes(id)) {
                errors.push(`可用技能缺失: ${id}`);
            }
        }
    }

    return errors;
}

// ============================================================================
// 测试用例（参照规则并对照实现）
// ============================================================================

const initialDeckSize = MONK_CARDS.length;
const expectedHandSize = 4;
const expectedDeckAfterDraw4 = initialDeckSize - expectedHandSize;
const expectedIncomeCp = Math.min(INITIAL_CP + 1, CP_MAX);
const fistAttackAbilityId = 'fist-technique-5';

type CommandInput = {
    type: string;
    playerId: PlayerId;
    payload: Record<string, unknown>;
};

const cmd = (type: string, playerId: PlayerId, payload: Record<string, unknown> = {}): CommandInput => ({
    type,
    playerId,
    payload,
});

const buildAttackTurn = (
    attackerId: PlayerId,
    defenderId: PlayerId,
    options?: { skipIncome?: boolean; discardCardIds?: string[] }
): CommandInput[] => {
    const commands: CommandInput[] = [];

    if (options?.skipIncome) {
        commands.push(cmd('ADVANCE_PHASE', attackerId)); // upkeep -> main1（跳过收入）
    } else {
        commands.push(cmd('ADVANCE_PHASE', attackerId)); // upkeep -> income
        commands.push(cmd('ADVANCE_PHASE', attackerId)); // income -> main1
    }

    commands.push(cmd('ADVANCE_PHASE', attackerId)); // main1 -> offensiveRoll
    commands.push(cmd('ROLL_DICE', attackerId));
    commands.push(cmd('CONFIRM_ROLL', attackerId));
    commands.push(cmd('SELECT_ABILITY', attackerId, { abilityId: fistAttackAbilityId }));
    commands.push(cmd('ADVANCE_PHASE', attackerId)); // offensiveRoll -> defensiveRoll

    commands.push(cmd('ROLL_DICE', defenderId));
    commands.push(cmd('CONFIRM_ROLL', defenderId));
    commands.push(cmd('ADVANCE_PHASE', attackerId)); // defensiveRoll -> main2（结算攻击）

    commands.push(cmd('ADVANCE_PHASE', attackerId)); // main2 -> discard
    if (options?.discardCardIds) {
        for (const cardId of options.discardCardIds) {
            commands.push(cmd('SELL_CARD', attackerId, { cardId }));
        }
    }
    commands.push(cmd('ADVANCE_PHASE', attackerId)); // discard -> upkeep（换人）

    return commands;
};

const baseTestCases: TestCase<DiceThroneExpectation>[] = [
    {
        name: '初始设置：体力/CP/手牌数量',
        commands: [],
        expect: {
            turnPhase: 'upkeep',
            turnNumber: 1,
            activePlayerId: '0',
            players: {
                '0': {
                    hp: INITIAL_HEALTH,
                    cp: INITIAL_CP,
                    handSize: expectedHandSize,
                    deckSize: expectedDeckAfterDraw4,
                },
                '1': {
                    hp: INITIAL_HEALTH,
                    cp: INITIAL_CP,
                    handSize: expectedHandSize,
                    deckSize: expectedDeckAfterDraw4,
                },
            },
        },
    },
    {
        name: '进入防御阶段后掷骰配置正确',
        commands: [
            cmd('ADVANCE_PHASE', '0'), // upkeep -> main1（跳过收入）
            cmd('ADVANCE_PHASE', '0'), // main1 -> offensiveRoll
            cmd('ROLL_DICE', '0'),
            cmd('CONFIRM_ROLL', '0'),
            cmd('SELECT_ABILITY', '0', { abilityId: fistAttackAbilityId }),
            cmd('ADVANCE_PHASE', '0'), // offensiveRoll -> defensiveRoll
        ],
        expect: {
            turnPhase: 'defensiveRoll',
            roll: { count: 0, limit: 1, diceCount: 4, confirmed: false },
            pendingAttack: {
                attackerId: '0',
                defenderId: '1',
                isDefendable: true,
                sourceAbilityId: fistAttackAbilityId,
            },
            availableAbilityIdsIncludes: ['meditation'],
        },
    },
    // TODO: 完整对局测试需要更复杂的命令序列和状态管理，暂时跳过
    // {
    //     name: '完整对局直到结束（双方同归于尽）',
    //     ...
    // },
    {
        name: '先手首回合跳过收入阶段',
        commands: [
            { type: 'ADVANCE_PHASE', playerId: '0', payload: {} },
        ],
        expect: {
            turnPhase: 'main1',
            players: {
                '0': {
                    cp: INITIAL_CP,
                    handSize: expectedHandSize,
                },
            },
        },
    },
    {
        name: '非先手收入阶段获得1CP与1张牌',
        commands: [
            { type: 'ADVANCE_PHASE', playerId: '0', payload: {} }, // upkeep -> main1 (跳过 income)
            { type: 'ADVANCE_PHASE', playerId: '0', payload: {} }, // main1 -> offensiveRoll
            { type: 'ADVANCE_PHASE', playerId: '0', payload: {} }, // offensiveRoll -> main2
            { type: 'ADVANCE_PHASE', playerId: '0', payload: {} }, // main2 -> discard
            { type: 'ADVANCE_PHASE', playerId: '0', payload: {} }, // discard -> upkeep (换人)
            { type: 'ADVANCE_PHASE', playerId: '1', payload: {} }, // upkeep -> income
        ],
        expect: {
            turnPhase: 'income',
            activePlayerId: '1',
            turnNumber: 2,
            players: {
                '1': {
                    cp: expectedIncomeCp,
                    handSize: expectedHandSize + 1,
                    deckSize: expectedDeckAfterDraw4 - 1,
                },
            },
        },
    },
    {
        name: '掷骰次数上限为3',
        commands: [
            { type: 'ADVANCE_PHASE', playerId: '0', payload: {} }, // upkeep -> main1
            { type: 'ADVANCE_PHASE', playerId: '0', payload: {} }, // main1 -> offensiveRoll
            { type: 'ROLL_DICE', playerId: '0', payload: {} },
            { type: 'ROLL_DICE', playerId: '0', payload: {} },
            { type: 'ROLL_DICE', playerId: '0', payload: {} },
            { type: 'ROLL_DICE', playerId: '0', payload: {} }, // 超过上限
        ],
        expect: {
            errorAtStep: { step: 6, error: 'roll_limit_reached' },
            turnPhase: 'offensiveRoll',
            roll: { count: 3, limit: 3, diceCount: 5, confirmed: false },
        },
    },
    {
        name: '弃牌阶段手牌超限不可推进',
        commands: [
            { type: 'DRAW_CARD', playerId: '0', payload: {} },
            { type: 'DRAW_CARD', playerId: '0', payload: {} },
            { type: 'DRAW_CARD', playerId: '0', payload: {} }, // 手牌 7 (>6)
            { type: 'ADVANCE_PHASE', playerId: '0', payload: {} }, // upkeep -> main1
            { type: 'ADVANCE_PHASE', playerId: '0', payload: {} }, // main1 -> offensiveRoll
            { type: 'ADVANCE_PHASE', playerId: '0', payload: {} }, // offensiveRoll -> main2
            { type: 'ADVANCE_PHASE', playerId: '0', payload: {} }, // main2 -> discard
            { type: 'ADVANCE_PHASE', playerId: '0', payload: {} }, // discard -> 应被阻止
        ],
        expect: {
            errorAtStep: { step: 8, error: 'cannot_advance_phase' },
            turnPhase: 'discard',
            players: {
                '0': {
                    handSize: HAND_LIMIT + 1,
                },
            },
        },
    },
    {
        name: '升级差价：II -> III 仅支付 CP 差价',
        commands: [
            // 把升级卡抽到手里（fixedRandom 不洗牌，按 MONK_CARDS 顺序依次抽取）
            cmd('DRAW_CARD', '0'), // palm-strike
            cmd('DRAW_CARD', '0'), // meditation-3
            cmd('DRAW_CARD', '0'), // play-six
            cmd('DRAW_CARD', '0'), // meditation-2

            // 进入主阶段（先手首回合跳过收入）
            cmd('ADVANCE_PHASE', '0'), // upkeep -> main1

            // 先升到 II（花费 2 CP）
            cmd('PLAY_UPGRADE_CARD', '0', { cardId: 'card-meditation-2', targetAbilityId: 'meditation' }),

            // 卖一张牌获得 1 CP，用于支付 II->III 差价（3-2=1）
            cmd('SELL_CARD', '0', { cardId: 'card-inner-peace' }),

            // 再升到 III：应只扣 1 CP
            cmd('PLAY_UPGRADE_CARD', '0', { cardId: 'card-meditation-3', targetAbilityId: 'meditation' }),
        ],
        expect: {
            turnPhase: 'main1',
            players: {
                '0': {
                    cp: 0,
                    abilityLevels: { meditation: 3 },
                },
            },
        },
    },
];

// ============================================================================
// 运行测试
// ============================================================================

const createRunner = (random: RandomFn, silent = true) => new GameTestRunner({
    domain: DiceThroneDomain,
    playerIds: ['0', '1'],
    random,
    setup: (playerIds, rnd) => DiceThroneDomain.setup(playerIds, rnd),
    assertFn: assertDiceThrone,
    silent,
});

describe('王权骰铸流程测试', () => {
    describe('基础测试', () => {
        const runner = createRunner(fixedRandom);
        it.each(baseTestCases)('$name', (testCase) => {
            const result = runner.run(testCase);
            expect(result.assertionErrors).toEqual([]);
        });
    });

    describe('技能触发', () => {
        // 骰面映射: 1,2=fist, 3=palm, 4,5=taiji, 6=lotus
        it('小顺可用"和谐"', () => {
            // 小顺: 需要4个连续不同的面。骰子值1,3,4,6 → fist,palm,taiji,lotus
            const runner = createRunner(createQueuedRandom([1, 3, 4, 6, 2]));
            const result = runner.run({
                name: '小顺可用和谐',
                commands: [
                    cmd('ADVANCE_PHASE', '0'),
                    cmd('ADVANCE_PHASE', '0'),
                    cmd('ROLL_DICE', '0'),
                    cmd('CONFIRM_ROLL', '0'),
                ],
                expect: {
                    turnPhase: 'offensiveRoll',
                    availableAbilityIdsIncludes: ['harmony'],
                },
            });
            expect(result.assertionErrors).toEqual([]);
        });

        it('大顺可用"定水神拳"', () => {
            // 大顺: 需要5个连续点数 [1,2,3,4,5] 或 [2,3,4,5,6]
            const runner = createRunner(createQueuedRandom([1, 2, 3, 4, 5]));
            const result = runner.run({
                name: '大顺可用定水神拳',
                commands: [
                    cmd('ADVANCE_PHASE', '0'),
                    cmd('ADVANCE_PHASE', '0'),
                    cmd('ROLL_DICE', '0'),
                    cmd('CONFIRM_ROLL', '0'),
                ],
                expect: {
                    turnPhase: 'offensiveRoll',
                    availableAbilityIdsIncludes: ['calm-water'],
                },
            });
            expect(result.assertionErrors).toEqual([]);
        });

        it('3个拳头可用"拳法"', () => {
            // 3个 fist: 值1,1,1 或 1,1,2 或 1,2,2 或 2,2,2 都是 fist
            const runner = createRunner(createQueuedRandom([1, 1, 1, 3, 4]));
            const result = runner.run({
                name: '3个拳头可用拳法',
                commands: [
                    cmd('ADVANCE_PHASE', '0'),
                    cmd('ADVANCE_PHASE', '0'),
                    cmd('ROLL_DICE', '0'),
                    cmd('CONFIRM_ROLL', '0'),
                ],
                expect: {
                    turnPhase: 'offensiveRoll',
                    availableAbilityIdsIncludes: ['fist-technique-3'],
                },
            });
            expect(result.assertionErrors).toEqual([]);
        });

        it('4个莲花可用"花开见佛"（不可防御）', () => {
            // 4个 lotus: 值6,6,6,6 → 4个 lotus
            const runner = createRunner(createQueuedRandom([6, 6, 6, 6, 1]));
            const result = runner.run({
                name: '4个莲花可用花开见佛',
                commands: [
                    cmd('ADVANCE_PHASE', '0'),
                    cmd('ADVANCE_PHASE', '0'),
                    cmd('ROLL_DICE', '0'),
                    cmd('CONFIRM_ROLL', '0'),
                ],
                expect: {
                    turnPhase: 'offensiveRoll',
                    availableAbilityIdsIncludes: ['lotus-palm'],
                },
            });
            expect(result.assertionErrors).toEqual([]);
        });

        it('3个太极可用"禅忘"', () => {
            // 3个 taiji: 值4,4,4 或 4,4,5 或 4,5,5 或 5,5,5 → 3个 taiji
            const runner = createRunner(createQueuedRandom([4, 4, 4, 1, 3]));
            const result = runner.run({
                name: '3个太极可用禅忘',
                commands: [
                    cmd('ADVANCE_PHASE', '0'),
                    cmd('ADVANCE_PHASE', '0'),
                    cmd('ROLL_DICE', '0'),
                    cmd('CONFIRM_ROLL', '0'),
                ],
                expect: {
                    turnPhase: 'offensiveRoll',
                    availableAbilityIdsIncludes: ['zen-forget'],
                },
            });
            expect(result.assertionErrors).toEqual([]);
        });

        it('3个拳+1个掌可用"太极连环拳"', () => {
            // 3 fist + 1 palm: 值1,1,1,3,4 → 3个fist + 1个palm + 1个taiji
            const runner = createRunner(createQueuedRandom([1, 1, 1, 3, 4]));
            const result = runner.run({
                name: '3拳+1掌可用太极连环拳',
                commands: [
                    cmd('ADVANCE_PHASE', '0'),
                    cmd('ADVANCE_PHASE', '0'),
                    cmd('ROLL_DICE', '0'),
                    cmd('CONFIRM_ROLL', '0'),
                ],
                expect: {
                    turnPhase: 'offensiveRoll',
                    availableAbilityIdsIncludes: ['taiji-combo'],
                },
            });
            expect(result.assertionErrors).toEqual([]);
        });

        it('3个掌可用"雷霆一击"', () => {
            // 3 palm: 值3,3,3 → 3个 palm
            const runner = createRunner(createQueuedRandom([3, 3, 3, 1, 4]));
            const result = runner.run({
                name: '3个掌可用雷霆一击',
                commands: [
                    cmd('ADVANCE_PHASE', '0'),
                    cmd('ADVANCE_PHASE', '0'),
                    cmd('ROLL_DICE', '0'),
                    cmd('CONFIRM_ROLL', '0'),
                ],
                expect: {
                    turnPhase: 'offensiveRoll',
                    availableAbilityIdsIncludes: ['thunder-strike'],
                },
            });
            expect(result.assertionErrors).toEqual([]);
        });
    });

    describe('状态效果', () => {
        // 骰面映射: 1,2=fist, 3=palm, 4,5=taiji, 6=lotus
        it('和谐命中后获得太极', () => {
            // 小顺: 1,3,4,6 → fist,palm,taiji,lotus
            const runner = createRunner(createQueuedRandom([1, 3, 4, 6, 2, 1, 1, 1, 1]));
            const result = runner.run({
                name: '和谐命中后获得太极',
                commands: [
                    cmd('ADVANCE_PHASE', '0'),
                    // 卖掉所有 instant 卡避免触发响应窗口（纯领域层测试不处理系统层）
                    cmd('SELL_CARD', '0', { cardId: 'card-inner-peace' }), // instant, 0 CP
                    cmd('SELL_CARD', '0', { cardId: 'card-deep-thought' }), // instant, 3 CP
                    cmd('ADVANCE_PHASE', '0'),
                    cmd('ROLL_DICE', '0'),
                    cmd('CONFIRM_ROLL', '0'),
                    cmd('SELECT_ABILITY', '0', { abilityId: 'harmony' }),
                    cmd('ADVANCE_PHASE', '0'),
                    cmd('ROLL_DICE', '1'),
                    cmd('CONFIRM_ROLL', '1'),
                    cmd('ADVANCE_PHASE', '0'),
                ],
                expect: {
                    turnPhase: 'main2',
                    players: {
                        '0': { statusEffects: { taiji: 2 } },
                        '1': { hp: 45 },
                    },
                },
            });
            expect(result.assertionErrors).toEqual([]);
        });

        it('定水神拳命中后获得太极+闪避', () => {
            // 大顺: [1,2,3,4,5] → 5个连续点数
            const runner = createRunner(createQueuedRandom([1, 2, 3, 4, 5, 1, 1, 1, 1]));
            const result = runner.run({
                name: '定水神拳命中后获得太极+闪避',
                commands: [
                    cmd('ADVANCE_PHASE', '0'),
                    // 卖掉所有 instant 卡避免触发响应窗口（纯领域层测试不处理系统层）
                    cmd('SELL_CARD', '0', { cardId: 'card-inner-peace' }), // instant, 0 CP
                    cmd('SELL_CARD', '0', { cardId: 'card-deep-thought' }), // instant, 3 CP
                    cmd('ADVANCE_PHASE', '0'),
                    cmd('ROLL_DICE', '0'),
                    cmd('CONFIRM_ROLL', '0'),
                    cmd('SELECT_ABILITY', '0', { abilityId: 'calm-water' }),
                    cmd('ADVANCE_PHASE', '0'),
                    cmd('ROLL_DICE', '1'),
                    cmd('CONFIRM_ROLL', '1'),
                    cmd('ADVANCE_PHASE', '0'),
                ],
                expect: {
                    turnPhase: 'main2',
                    players: {
                        '0': { statusEffects: { taiji: 2, evasive: 1 } },
                        '1': { hp: 43 },
                    },
                },
            });
            expect(result.assertionErrors).toEqual([]);
        });

        it('花开见佛命中后太极满值', () => {
            // 4个 lotus: 6,6,6,6 → 4个 lotus
            const runner = createRunner(createQueuedRandom([6, 6, 6, 6, 1, 1, 1, 1, 1]));
            const result = runner.run({
                name: '花开见佛命中后太极满值',
                commands: [
                    cmd('ADVANCE_PHASE', '0'),
                    cmd('ADVANCE_PHASE', '0'),
                    cmd('ROLL_DICE', '0'),
                    cmd('CONFIRM_ROLL', '0'),
                    cmd('SELECT_ABILITY', '0', { abilityId: 'lotus-palm' }),
                    // 不可防御攻击，ADVANCE_PHASE 会直接结算并跳到 main2
                    cmd('ADVANCE_PHASE', '0'),
                ],
                expect: {
                    turnPhase: 'main2',
                    players: {
                        '0': { statusEffects: { taiji: 5 } },
                        '1': { hp: 45 },
                    },
                },
            });
            expect(result.assertionErrors).toEqual([]);
        });
    });

    describe('卡牌效果', () => {
        it('打出内心平静获得太极', () => {
            const runner = createRunner(fixedRandom);
            const result = runner.run({
                name: '内心平静获得太极',
                commands: [
                    cmd('ADVANCE_PHASE', '0'), // upkeep -> main1
                    cmd('PLAY_CARD', '0', { cardId: 'card-inner-peace' }),
                ],
                expect: {
                    turnPhase: 'main1',
                    players: {
                        '0': { statusEffects: { taiji: 1 }, discardSize: 1 },
                    },
                },
            });
            expect(result.assertionErrors).toEqual([]);
        });

        it('打出佛光普照获得多种状态并给对手倒地', () => {
            const runner = createRunner(fixedRandom);
            const result = runner.run({
                name: '佛光普照多状态',
                commands: [
                    cmd('ADVANCE_PHASE', '0'),
                    // buddha-light 需要 3 CP，初始只有 2 CP，先卖卡获取 CP
                    cmd('SELL_CARD', '0', { cardId: 'card-enlightenment' }), // +1 CP, 总 3
                    cmd('PLAY_CARD', '0', { cardId: 'card-buddha-light' }),
                ],
                expect: {
                    turnPhase: 'main1',
                    players: {
                        '0': {
                            cp: 0, // 3 - 3 = 0
                            statusEffects: { taiji: 1, evasive: 1, purify: 1 },
                        },
                        '1': {
                            statusEffects: { stun: 1 },
                        },
                    },
                },
            });
            expect(result.assertionErrors).toEqual([]);
        });

        it('深思获得5太极', () => {
            const runner = createRunner(fixedRandom);
            const result = runner.run({
                name: '深思获得5太极',
                commands: [
                    cmd('ADVANCE_PHASE', '0'),
                    // deep-thought 需要 3 CP，初始只有 2 CP，先卖卡获取 CP
                    cmd('SELL_CARD', '0', { cardId: 'card-enlightenment' }), // +1 CP, 总 3
                    cmd('PLAY_CARD', '0', { cardId: 'card-deep-thought' }),
                ],
                expect: {
                    turnPhase: 'main1',
                    players: {
                        '0': {
                            cp: 0, // 3 - 3 = 0
                            statusEffects: { taiji: 5 },
                            handSize: expectedHandSize - 1 - 1, // -1卖 -1打出 = 2
                            discardSize: 2, // 卖的卡 + 打出的卡
                        },
                    },
                },
            });
            expect(result.assertionErrors).toEqual([]);
        });

        it('掌击给对手倒地', () => {
            const runner = createRunner(fixedRandom);
            const result = runner.run({
                name: '掌击给对手倒地',
                commands: [
                    // 初始手牌: enlightenment, inner-peace, deep-thought, buddha-light
                    // palm-strike 在 index 4，需要抽1张才能拿到
                    cmd('DRAW_CARD', '0'), // 抽 palm-strike
                    cmd('ADVANCE_PHASE', '0'),
                    cmd('PLAY_CARD', '0', { cardId: 'card-palm-strike' }),
                ],
                expect: {
                    turnPhase: 'main1',
                    players: {
                        '1': { statusEffects: { stun: 1 } },
                    },
                },
            });
            expect(result.assertionErrors).toEqual([]);
        });
    });

    describe('技能升级', () => {
        // 初始手牌(index 0-3): enlightenment, inner-peace, deep-thought, buddha-light
        // meditation-2 在 index 7，需要抽4张
        // thrust-punch-2 在 index 13，需要抽10张
        // mahayana-2 在 index 12，需要抽9张
        
        it('升级清修到 II 级', () => {
            const runner = createRunner(fixedRandom);
            const result = runner.run({
                name: '升级清修 II',
                commands: [
                    // 抽到 meditation-2 (index 7)
                    cmd('DRAW_CARD', '0'), // palm-strike (4)
                    cmd('DRAW_CARD', '0'), // meditation-3 (5)
                    cmd('DRAW_CARD', '0'), // play-six (6)
                    cmd('DRAW_CARD', '0'), // meditation-2 (7)
                    cmd('ADVANCE_PHASE', '0'),
                    cmd('PLAY_UPGRADE_CARD', '0', { cardId: 'card-meditation-2', targetAbilityId: 'meditation' }),
                ],
                expect: {
                    turnPhase: 'main1',
                    players: {
                        '0': {
                            cp: INITIAL_CP - 2,
                            abilityLevels: { meditation: 2 },
                            discardSize: 1,
                        },
                    },
                },
            });
            expect(result.assertionErrors).toEqual([]);
        });

        it('升级拳法到 II 级', () => {
            const runner = createRunner(fixedRandom);
            const result = runner.run({
                name: '升级拳法 II',
                commands: [
                    // 抽到 thrust-punch-2 (index 13)
                    cmd('DRAW_CARD', '0'), // 4: palm-strike
                    cmd('DRAW_CARD', '0'), // 5: meditation-3
                    cmd('DRAW_CARD', '0'), // 6: play-six
                    cmd('DRAW_CARD', '0'), // 7: meditation-2
                    cmd('DRAW_CARD', '0'), // 8: zen-fist-2
                    cmd('DRAW_CARD', '0'), // 9: storm-assault-2
                    cmd('DRAW_CARD', '0'), // 10: combo-punch-2
                    cmd('DRAW_CARD', '0'), // 11: lotus-bloom-2
                    cmd('DRAW_CARD', '0'), // 12: mahayana-2
                    cmd('DRAW_CARD', '0'), // 13: thrust-punch-2
                    cmd('ADVANCE_PHASE', '0'),
                    cmd('PLAY_UPGRADE_CARD', '0', { cardId: 'card-thrust-punch-2', targetAbilityId: 'fist-technique' }),
                ],
                expect: {
                    turnPhase: 'main1',
                    players: {
                        '0': {
                            cp: INITIAL_CP - 2,
                            abilityLevels: { 'fist-technique': 2 },
                        },
                    },
                },
            });
            expect(result.assertionErrors).toEqual([]);
        });

        it('升级和谐之力到 II 级', () => {
            const runner = createRunner(fixedRandom);
            const result = runner.run({
                name: '升级和谐 II',
                commands: [
                    // 抽到 mahayana-2 (index 12)
                    cmd('DRAW_CARD', '0'), // 4: palm-strike
                    cmd('DRAW_CARD', '0'), // 5: meditation-3
                    cmd('DRAW_CARD', '0'), // 6: play-six
                    cmd('DRAW_CARD', '0'), // 7: meditation-2
                    cmd('DRAW_CARD', '0'), // 8: zen-fist-2
                    cmd('DRAW_CARD', '0'), // 9: storm-assault-2
                    cmd('DRAW_CARD', '0'), // 10: combo-punch-2
                    cmd('DRAW_CARD', '0'), // 11: lotus-bloom-2
                    cmd('DRAW_CARD', '0'), // 12: mahayana-2
                    cmd('ADVANCE_PHASE', '0'),
                    cmd('PLAY_UPGRADE_CARD', '0', { cardId: 'card-mahayana-2', targetAbilityId: 'harmony' }),
                ],
                expect: {
                    turnPhase: 'main1',
                    players: {
                        '0': {
                            cp: INITIAL_CP - 1,
                            abilityLevels: { harmony: 2 },
                        },
                    },
                },
            });
            expect(result.assertionErrors).toEqual([]);
        });
    });

    describe('防御阶段', () => {
        it('清修技能在防御阶段可用', () => {
            const runner = createRunner(createQueuedRandom([1, 1, 1, 1, 1]));
            const result = runner.run({
                name: '清修在防御阶段可用',
                commands: [
                    cmd('ADVANCE_PHASE', '0'),
                    cmd('ADVANCE_PHASE', '0'),
                    cmd('ROLL_DICE', '0'),
                    cmd('CONFIRM_ROLL', '0'),
                    cmd('SELECT_ABILITY', '0', { abilityId: 'fist-technique-5' }),
                    cmd('ADVANCE_PHASE', '0'), // -> defensiveRoll
                ],
                expect: {
                    turnPhase: 'defensiveRoll',
                    availableAbilityIdsIncludes: ['meditation'],
                },
            });
            expect(result.assertionErrors).toEqual([]);
        });

        it('防御阶段掉骰上限为1', () => {
            const runner = createRunner(createQueuedRandom([1, 1, 1, 1, 1]));
            const result = runner.run({
                name: '防御阶段掉骰上限1',
                commands: [
                    cmd('ADVANCE_PHASE', '0'),
                    cmd('ADVANCE_PHASE', '0'),
                    cmd('ROLL_DICE', '0'),
                    cmd('CONFIRM_ROLL', '0'),
                    cmd('SELECT_ABILITY', '0', { abilityId: 'fist-technique-5' }),
                    cmd('ADVANCE_PHASE', '0'),
                    cmd('ROLL_DICE', '1'),
                    cmd('ROLL_DICE', '1'), // 第二次应失败
                ],
                expect: {
                    errorAtStep: { step: 8, error: 'roll_limit_reached' },
                    turnPhase: 'defensiveRoll',
                    roll: { count: 1, limit: 1 },
                },
            });
            expect(result.assertionErrors).toEqual([]);
        });
    });

    describe('卖牌与弃牌', () => {
        it('卖牌获得1CP', () => {
            const runner = createRunner(fixedRandom);
            const result = runner.run({
                name: '卖牌获得1CP',
                commands: [
                    cmd('ADVANCE_PHASE', '0'),
                    cmd('SELL_CARD', '0', { cardId: 'card-inner-peace' }),
                ],
                expect: {
                    turnPhase: 'main1',
                    players: {
                        '0': {
                            cp: Math.min(INITIAL_CP + 1, CP_MAX),
                            handSize: expectedHandSize - 1,
                            discardSize: 1,
                        },
                    },
                },
            });
            expect(result.assertionErrors).toEqual([]);
        });
    });

    describe('卡牌打出错误提示', () => {
        it('主要阶段卡在投掷阶段无法使用 - wrongPhaseForMain', () => {
            const runner = createRunner(fixedRandom);
            const result = runner.run({
                name: '主要阶段卡在投掷阶段无法使用',
                commands: [
                    cmd('ADVANCE_PHASE', '0'), // upkeep -> main1
                    cmd('ADVANCE_PHASE', '0'), // main1 -> offensiveRoll
                    cmd('ROLL_DICE', '0'),
                    // 在投掷阶段尝试使用 main 卡（enlightenment 是 main 卡）
                    cmd('PLAY_CARD', '0', { cardId: 'card-enlightenment' }),
                ],
                expect: {
                    errorAtStep: { step: 4, error: 'wrongPhaseForMain' },
                    turnPhase: 'offensiveRoll',
                },
            });
            expect(result.assertionErrors).toEqual([]);
        });

        it('CP不足时无法打出卡牌 - notEnoughCp', () => {
            const runner = createRunner(fixedRandom);
            const result = runner.run({
                name: 'CP不足时无法打出卡牌',
                commands: [
                    cmd('ADVANCE_PHASE', '0'), // upkeep -> main1
                    // buddha-light 需要 3 CP，初始只有 2 CP
                    cmd('PLAY_CARD', '0', { cardId: 'card-buddha-light' }),
                ],
                expect: {
                    errorAtStep: { step: 2, error: 'notEnoughCp' },
                    turnPhase: 'main1',
                    players: {
                        '0': { cp: INITIAL_CP }, // CP 未变
                    },
                },
            });
            expect(result.assertionErrors).toEqual([]);
        });

        it('升级卡在投掷阶段无法使用 - wrongPhaseForUpgrade', () => {
            const runner = createRunner(fixedRandom);
            const result = runner.run({
                name: '升级卡在投掷阶段无法使用',
                commands: [
                    // 抽到 meditation-2 (index 7)
                    cmd('DRAW_CARD', '0'), // palm-strike (4)
                    cmd('DRAW_CARD', '0'), // meditation-3 (5)
                    cmd('DRAW_CARD', '0'), // play-six (6)
                    cmd('DRAW_CARD', '0'), // meditation-2 (7)
                    cmd('ADVANCE_PHASE', '0'), // upkeep -> main1
                    cmd('ADVANCE_PHASE', '0'), // main1 -> offensiveRoll
                    cmd('ROLL_DICE', '0'),
                    // 在投掷阶段尝试使用升级卡
                    cmd('PLAY_UPGRADE_CARD', '0', { cardId: 'card-meditation-2', targetAbilityId: 'meditation' }),
                ],
                expect: {
                    errorAtStep: { step: 8, error: 'wrongPhaseForUpgrade' },
                    turnPhase: 'offensiveRoll',
                },
            });
            expect(result.assertionErrors).toEqual([]);
        });

        it('升级卡跳级使用 - upgradeCardSkipLevel', () => {
            const runner = createRunner(fixedRandom);
            const result = runner.run({
                name: '升级卡跳级使用',
                commands: [
                    // 抽到 meditation-3 (index 5)
                    cmd('DRAW_CARD', '0'), // palm-strike (4)
                    cmd('DRAW_CARD', '0'), // meditation-3 (5)
                    cmd('ADVANCE_PHASE', '0'), // upkeep -> main1
                    // 尝试直接跳到 III 级（当前是 I 级）
                    cmd('PLAY_UPGRADE_CARD', '0', { cardId: 'card-meditation-3', targetAbilityId: 'meditation' }),
                ],
                expect: {
                    errorAtStep: { step: 4, error: 'upgradeCardSkipLevel' },
                    turnPhase: 'main1',
                    players: {
                        '0': { abilityLevels: { meditation: 1 } }, // 等级未变
                    },
                },
            });
            expect(result.assertionErrors).toEqual([]);
        });

        it('投掷阶段卡在主要阶段无法使用 - wrongPhaseForRoll', () => {
            const runner = createRunner(fixedRandom);
            const result = runner.run({
                name: '投掷阶段卡在主要阶段无法使用',
                commands: [
                    // 抽到 play-six (index 6)，它是 roll 时机的卡
                    cmd('DRAW_CARD', '0'), // palm-strike (4)
                    cmd('DRAW_CARD', '0'), // meditation-3 (5)
                    cmd('DRAW_CARD', '0'), // play-six (6) - roll 卡
                    cmd('ADVANCE_PHASE', '0'), // upkeep -> main1
                    // 在主要阶段尝试使用 roll 卡
                    cmd('PLAY_CARD', '0', { cardId: 'card-play-six' }),
                ],
                expect: {
                    errorAtStep: { step: 5, error: 'wrongPhaseForRoll' },
                    turnPhase: 'main1',
                },
            });
            expect(result.assertionErrors).toEqual([]);
        });
    });
});
