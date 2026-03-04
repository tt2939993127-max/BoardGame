/**
 * 晕眩（Daze）状态行动阻止测试
 * 
 * 根据官方 Wiki 规则（Dice Throne Season 1 Rerolled）：
 * "After your attack ends, remove this token and the attacker attacks again."
 * 
 * 晕眩机制（正确理解）：
 * 1. ✅ 攻击施加眩晕后，立即触发额外攻击
 * 2. ✅ 攻击方获得额外攻击机会，再次攻击被眩晕的目标
 * 3. ✅ 眩晕在攻击结算后立即移除，不会在 buff 区显示
 * 4. ❌ 晕眩状态下无法打牌、使用 Token、使用净化、使用被动能力
 * 
 * 注意：
 * - 眩晕是在攻击结算后立即触发的
 * - 不需要等到有眩晕的玩家自己攻击
 * - 眩晕立即移除，所以不会在 UI 中显示
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

    // 注意：根据游戏规则，晕眩不阻止进攻行为，只阻止防御行为
    // 因此不测试"晕眩状态下无法选择进攻技能"，因为这与规则矛盾
    // 晕眩的攻击方可以正常攻击，攻击结束后会触发额外攻击

    it('晕眩状态下无法选择防御技能', () => {
        const runner = createRunner();
        // 先运行到游戏开始后的状态
        const setupResult = runner.run({
            name: '初始化游戏',
            commands: [
                cmd('SELECT_CHARACTER', '0', { characterId: 'monk' }),
                cmd('SELECT_CHARACTER', '1', { characterId: 'barbarian' }),
                cmd('PLAYER_READY', '1'),
                cmd('HOST_START_GAME', '0'),
            ],
        });
        
        // 手动添加晕眩状态到玩家 1 和 pendingAttack
        setupResult.finalState.core.players['1'].statusEffects[STATUS_IDS.DAZE] = 1;
        // 手动设置 pendingAttack 模拟防御阶段
        setupResult.finalState.core.pendingAttack = {
            attackerId: '0',
            defenderId: '1',
            isDefendable: true,
            sourceAbilityId: 'palm-strike',
            isUltimate: false,
        } as any;
        // 设置阶段为 defensiveRoll（phase 存储在 sys.phase，不是 core.phase）
        setupResult.finalState.sys.phase = 'defensiveRoll';
        
        // 使用修改后的状态继续测试
        const runner2 = createRunner(fixedRandom, setupResult.finalState);
        const result = runner2.run({
            name: '晕眩玩家尝试防御',
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
        // 先运行到游戏开始后的状态
        const setupResult = runner.run({
            name: '初始化游戏',
            commands: [
                cmd('SELECT_CHARACTER', '0', { characterId: 'monk' }),
                cmd('SELECT_CHARACTER', '1', { characterId: 'barbarian' }),
                cmd('PLAYER_READY', '1'),
                cmd('HOST_START_GAME', '0'),
            ],
        });
        
        // 手动添加晕眩状态到玩家 1、闪避 Token 和 pendingDamage
        setupResult.finalState.core.players['1'].statusEffects[STATUS_IDS.DAZE] = 1;
        setupResult.finalState.core.players['1'].tokens[TOKEN_IDS.EVASIVE] = 1;
        // 手动设置 pendingDamage 模拟伤害响应窗口
        setupResult.finalState.core.pendingDamage = {
            id: 'pd-test',
            sourcePlayerId: '0',
            targetPlayerId: '1',
            originalDamage: 5,
            currentDamage: 5,
            sourceAbilityId: 'palm-strike',
            responseType: 'beforeDamageReceived',
            responderId: '1',
        } as any;
        
        // 使用修改后的状态继续测试
        const runner2 = createRunner(fixedRandom, setupResult.finalState);
        const result = runner2.run({
            name: '晕眩玩家尝试使用 Token',
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
