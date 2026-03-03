/**
 * 晕眩（Daze）状态行动阻止测试
 * 
 * 根据官方 Wiki 规则（Dice Throne Season 1 Rerolled）：
 * "After your attack ends, remove this token and the attacker attacks again."
 * 
 * 晕眩机制（正确理解）：
 * 1. ✅ 有晕眩的玩家可以正常攻击（晕眩不阻止进攻行为）
 * 2. ❌ 有晕眩的玩家不能防御（被攻击时无法投防御骰）
 * 3. ✅ 攻击结束后，移除晕眩，有晕眩的攻击方再次攻击同一目标（额外攻击奖励）
 * 4. ❌ 晕眩状态下无法打牌、使用 Token、使用净化、使用被动能力
 * 
 * 注意：晕眩不是"完全无法行动"，而是"无法防御和使用非攻击行动"。
 * 攻击行为本身不受晕眩影响，这是晕眩的核心机制（攻击后触发额外攻击）。
 * 
 * 测试覆盖：
 * 1. 晕眩状态下无法打牌（PLAY_CARD）
 * 2. 晕眩状态下无法选择进攻技能（SELECT_ABILITY）- 注：此测试验证的是在 offensiveRoll 阶段被施加晕眩的边缘情况
 * 3. 晕眩状态下无法选择防御技能（SELECT_ABILITY）- 核心规则
 * 4. 晕眩状态下无法使用 Token（USE_TOKEN）
 * 5. 晕眩状态下无法使用净化（USE_PURIFY）
 * 6. 晕眩状态下无法使用被动能力（USE_PASSIVE_ABILITY）
 */

import { describe, it, expect } from 'vitest';
import { GameTestRunner } from '../../../engine/testing/GameTestRunner';
import type { DiceThroneCore, DiceThroneCommand, DiceThroneEvent } from '../domain/types';
import { DiceThroneDomain } from '../domain';
import { STATUS_IDS, TOKEN_IDS } from '../domain/ids';
import { RESOURCE_IDS } from '../domain/resources';
import type { RandomFn, MatchState } from '../../../engine/types';
import { testSystems, cmd, type DiceThroneExpectation } from './test-utils';

const fixedRandom: RandomFn = {
    random: () => 0.5,
    d: (sides: number) => sides, // 总是返回最大值
    range: (min, max) => Math.floor((min + max) / 2),
    shuffle: <T>(arr: T[]) => arr,
};

function createRunner(random: RandomFn = fixedRandom, initialState?: MatchState<DiceThroneCore>) {
    const config: any = {
        domain: DiceThroneDomain,
        systems: testSystems,
        playerIds: ['0', '1'],
        random,
    };
    if (initialState) {
        config.setup = () => initialState;
    }
    return new GameTestRunner<DiceThroneCore, DiceThroneCommand, DiceThroneEvent, DiceThroneExpectation>(config);
}

/**
 * 创建一个玩家有晕眩状态的初始状态
 */
function createDazedPlayerSetup(playerId: string = '0') {
    return (_playerIds: string[], _random: RandomFn) => {
        const runner = createRunner();
        const result = runner.run({
            name: '初始化并添加晕眩状态',
            commands: [
                cmd('SELECT_CHARACTER', '0', { characterId: 'monk' }),
                cmd('SELECT_CHARACTER', '1', { characterId: 'barbarian' }),
                cmd('PLAYER_READY', '1'),
                cmd('HOST_START_GAME', '0'),
            ],
        });

        const state = result.finalState;
        // 添加晕眩状态
        state.core.players[playerId].statusEffects[STATUS_IDS.DAZE] = 1;
        // 添加一些资源用于测试
        state.core.players[playerId].resources[RESOURCE_IDS.CP] = 5;
        state.core.players[playerId].tokens[TOKEN_IDS.PURIFY] = 1;
        state.core.players[playerId].tokens[TOKEN_IDS.TAIJI] = 2;
        // 添加击倒状态用于测试净化
        state.core.players[playerId].statusEffects[STATUS_IDS.KNOCKDOWN] = 1;

        return state;
    };
}

describe('晕眩（Daze）状态行动阻止', () => {
    it('晕眩状态下无法打牌', () => {
        const runner = createRunner();
        const result = runner.run({
            name: '晕眩玩家尝试打牌',
            setup: createDazedPlayerSetup('0'),
            commands: [
                cmd('ADVANCE_PHASE', '0'), // upkeep → income
                cmd('ADVANCE_PHASE', '0'), // income → main1
                cmd('PLAY_CARD', '0', { cardId: 'card-palm-strike' }),
            ],
            expect: {
                expectError: { command: 'PLAY_CARD', error: 'player_is_dazed' },
            },
        });

        expect(result.passed).toBe(true);
    });

    it('晕眩状态下无法选择进攻技能', () => {
        const runner = createRunner();
        const result = runner.run({
            name: '晕眩玩家尝试选择技能',
            setup: (_playerIds: string[], random: RandomFn) => {
                const state = createDazedPlayerSetup('0')(_playerIds, random);
                // 推进到 offensiveRoll 阶段并掷骰
                const runner2 = createRunner(random, state);
                const result2 = runner2.run({
                    name: '推进到 offensiveRoll',
                    commands: [
                        cmd('ADVANCE_PHASE', '0'), // upkeep → income
                        cmd('ADVANCE_PHASE', '0'), // income → main1
                        cmd('ADVANCE_PHASE', '0'), // main1 → offensiveRoll（晕眩会被移除）
                    ],
                });
                // 重新添加晕眩状态（模拟在 offensiveRoll 阶段被施加晕眩）
                result2.finalState.core.players['0'].statusEffects[STATUS_IDS.DAZE] = 1;
                // 掷骰并确认
                const runner3 = createRunner(random, result2.finalState);
                const result3 = runner3.run({
                    name: '掷骰并确认',
                    commands: [
                        cmd('ROLL_DICE', '0'),
                        cmd('CONFIRM_ROLL', '0'),
                    ],
                });
                return result3.finalState;
            },
            commands: [
                cmd('SELECT_ABILITY', '0', { abilityId: 'palm-strike' }),
            ],
            expect: {
                expectError: { command: 'SELECT_ABILITY', error: 'player_is_dazed' },
            },
        });

        expect(result.passed).toBe(true);
    });

    it('晕眩状态下无法选择防御技能', () => {
        const runner = createRunner();
        const result = runner.run({
            name: '晕眩玩家尝试防御',
            setup: (_playerIds: string[], random: RandomFn) => {
                const state = createDazedPlayerSetup('1')(_playerIds, random);
                // 推进到 offensiveRoll 并创建 pendingAttack
                const runner2 = createRunner(random, state);
                const result2 = runner2.run({
                    name: '推进到 defensiveRoll',
                    commands: [
                        cmd('ADVANCE_PHASE', '0'), // upkeep → income
                        cmd('ADVANCE_PHASE', '0'), // income → main1
                        cmd('ADVANCE_PHASE', '0'), // main1 → offensiveRoll
                        cmd('ROLL_DICE', '0'),
                        cmd('CONFIRM_ROLL', '0'),
                        cmd('SELECT_ABILITY', '0', { abilityId: 'palm-strike' }),
                        cmd('ADVANCE_PHASE', '0'), // offensiveRoll → defensiveRoll
                    ],
                });
                return result2.finalState;
            },
            commands: [
                cmd('SELECT_ABILITY', '1', { abilityId: 'deflect' }),
            ],
            expect: {
                expectError: { command: 'SELECT_ABILITY', error: 'player_is_dazed' },
            },
        });

        expect(result.passed).toBe(true);
    });

    it('晕眩状态下无法使用 Token', () => {
        const runner = createRunner();
        const result = runner.run({
            name: '晕眩玩家尝试使用 Token',
            setup: (_playerIds: string[], random: RandomFn) => {
                const state = createDazedPlayerSetup('1')(_playerIds, random);
                // 创建 pendingDamage 场景
                const runner2 = createRunner(random, state);
                const result2 = runner2.run({
                    name: '创建 pendingDamage',
                    commands: [
                        cmd('ADVANCE_PHASE', '0'), // upkeep → income
                        cmd('ADVANCE_PHASE', '0'), // income → main1
                        cmd('ADVANCE_PHASE', '0'), // main1 → offensiveRoll
                        cmd('ROLL_DICE', '0'),
                        cmd('CONFIRM_ROLL', '0'),
                        cmd('SELECT_ABILITY', '0', { abilityId: 'palm-strike' }),
                        cmd('ADVANCE_PHASE', '0'), // offensiveRoll → defensiveRoll
                    ],
                });
                // 添加闪避 Token 用于测试
                result2.finalState.core.players['1'].tokens[TOKEN_IDS.EVASIVE] = 1;
                return result2.finalState;
            },
            commands: [
                cmd('USE_TOKEN', '1', { tokenId: TOKEN_IDS.EVASIVE, amount: 1 }),
            ],
            expect: {
                expectError: { command: 'USE_TOKEN', error: 'player_is_dazed' },
            },
        });

        expect(result.passed).toBe(true);
    });

    it('晕眩状态下无法使用净化', () => {
        const runner = createRunner();
        const result = runner.run({
            name: '晕眩玩家尝试使用净化',
            setup: createDazedPlayerSetup('0'),
            commands: [
                cmd('ADVANCE_PHASE', '0'), // upkeep → income
                cmd('ADVANCE_PHASE', '0'), // income → main1
                cmd('USE_PURIFY', '0', { statusId: STATUS_IDS.KNOCKDOWN }),
            ],
            expect: {
                expectError: { command: 'USE_PURIFY', error: 'player_is_dazed' },
            },
        });

        expect(result.passed).toBe(true);
    });

    it('晕眩状态下无法使用被动能力', () => {
        const runner = createRunner();
        const result = runner.run({
            name: '晕眩玩家尝试使用被动能力',
            setup: (_playerIds: string[], random: RandomFn) => {
                const state = createDazedPlayerSetup('0')(_playerIds, random);
                // 选择圣骑士（有被动能力：教皇税）
                state.core.selectedCharacters['0'] = 'paladin';
                // 重新初始化英雄数据
                const runner2 = createRunner(random, state);
                const result2 = runner2.run({
                    name: '选择圣骑士',
                    commands: [
                        cmd('SELECT_CHARACTER', '0', { characterId: 'paladin' }),
                    ],
                });
                // 添加晕眩状态
                result2.finalState.core.players['0'].statusEffects[STATUS_IDS.DAZE] = 1;
                result2.finalState.core.players['0'].resources[RESOURCE_IDS.CP] = 5;
                // 推进到 offensiveRoll 并掷骰
                const runner3 = createRunner(random, result2.finalState);
                const result3 = runner3.run({
                    name: '推进到 offensiveRoll 并掷骰',
                    commands: [
                        cmd('ADVANCE_PHASE', '0'), // upkeep → income
                        cmd('ADVANCE_PHASE', '0'), // income → main1
                        cmd('ADVANCE_PHASE', '0'), // main1 → offensiveRoll
                        cmd('ROLL_DICE', '0'),
                    ],
                });
                return result3.finalState;
            },
            commands: [
                cmd('USE_PASSIVE_ABILITY', '0', {
                    passiveId: 'tithes',
                    actionIndex: 0,
                    targetDieId: 'die-0',
                }),
            ],
            expect: {
                expectError: { command: 'USE_PASSIVE_ABILITY', error: 'player_is_dazed' },
            },
        });

        expect(result.passed).toBe(true);
    });

    it('晕眩移除后可以正常行动', () => {
        const runner = createRunner();
        const result = runner.run({
            name: '晕眩移除后打牌',
            setup: (_playerIds: string[], random: RandomFn) => {
                const state = createDazedPlayerSetup('0')(_playerIds, random);
                // 移除晕眩状态
                state.core.players['0'].statusEffects[STATUS_IDS.DAZE] = 0;
                return state;
            },
            commands: [
                cmd('ADVANCE_PHASE', '0'), // upkeep → income
                cmd('ADVANCE_PHASE', '0'), // income → main1
                cmd('PLAY_CARD', '0', { cardId: 'card-palm-strike' }),
            ],
        });

        expect(result.passed).toBe(true);
        // 验证卡牌已从手牌移除
        const player = result.finalState.core.players['0'];
        const cardInHand = player.hand.find(c => c.id === 'card-palm-strike');
        expect(cardInHand).toBeUndefined();
    });
});
