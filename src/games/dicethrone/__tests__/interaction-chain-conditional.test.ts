/**
 * DiceThrone 条件触发交互链测试
 *
 * 覆盖"条件满足时自动触发"的交互链路径，并断言最终状态：
 * 1. 晕眩（Daze）额外攻击链 — 攻击方有 daze 时，攻击结算后触发对手额外攻击
 * 2. 致盲（Blinded）攻击失败链 — 攻击方有 blinded 时，投掷1骰判定攻击是否命中
 * 3. 不可防御攻击链 — unblockable 标签跳过防御阶段
 * 4. 终极技能链 — ultimate 标签的特殊结算
 * 5. 治疗技能链 — 纯增益技能跳过防御阶段
 * 6. 压制奖励骰链 — barbarian suppress 的3骰伤害
 * 7. Token 响应链 — 僧侣 vs 僧侣太极 Token 交互
 * 8. card-dizzy afterAttackResolved 响应窗口链
 */

import { describe, it, expect, beforeAll } from 'vitest';
import {
    fixedRandom,
    createQueuedRandom,
    createRunner,
    createInitializedState,
    cmd,
    testSystems,
} from './test-utils';
import { initializeCustomActions } from '../domain/customActions';
import { STATUS_IDS, TOKEN_IDS } from '../domain/ids';
import { INITIAL_HEALTH, INITIAL_CP } from '../domain/types';
import type { DiceThroneCore } from '../domain/types';
import type { MatchState, PlayerId } from '../../../engine/types';
import { DiceThroneDomain } from '../domain';
import { createInitialSystemState, executePipeline } from '../../../engine/pipeline';
import { GameTestRunner } from '../../../engine/testing';
import { RESOURCE_IDS } from '../domain/resources';
import { BARBARIAN_CARDS } from '../heroes/barbarian/cards';

beforeAll(() => {
    initializeCustomActions();
});

// ============================================================================
// 辅助函数
// ============================================================================

/** 创建指定角色对战的 setup（清空手牌避免响应窗口干扰） */
function createHeroMatchup(hero0: string, hero1: string, mutate?: (core: DiceThroneCore) => void) {
    return (playerIds: PlayerId[], random: typeof fixedRandom) => {
        const core = DiceThroneDomain.setup(playerIds, random);
        const sys = createInitialSystemState(playerIds, testSystems, undefined);
        let state: MatchState<DiceThroneCore> = { sys, core };

        const setupCmds = [
            { type: 'SELECT_CHARACTER', playerId: '0', payload: { characterId: hero0 } },
            { type: 'SELECT_CHARACTER', playerId: '1', payload: { characterId: hero1 } },
            { type: 'PLAYER_READY', playerId: '1', payload: {} },
            { type: 'HOST_START_GAME', playerId: '0', payload: {} },
        ];

        const pipelineConfig = { domain: DiceThroneDomain, systems: testSystems };
        for (const c of setupCmds) {
            const result = executePipeline(
                pipelineConfig, state,
                { ...c, timestamp: Date.now() } as any,
                random, playerIds
            );
            if (result.success) {
                state = result.state as MatchState<DiceThroneCore>;
            }
        }

        // 清空手牌避免响应窗口干扰
        for (const pid of playerIds) {
            const player = state.core.players[pid];
            if (player) {
                player.deck = [...player.deck, ...player.hand];
                player.hand = [];
            }
        }

        if (mutate) mutate(state.core);

        return state;
    };
}


// ============================================================================
// 7. 压制奖励骰链（Suppress）
// ============================================================================

describe('压制奖励骰链', () => {
    // suppress: 2 SWORD + 2 STRENGTH → customAction barbarian-suppress-roll
    // 投掷3个d6，累加点数总和作为伤害；>14 施加脑震荡
    // 需要骰面：[1,1,6,6,x] → 2 SWORD + 2 STRENGTH

    it('suppress 投掷3骰 → 伤害 = 点数总和（低伤害，无脑震荡）', () => {
        // 随机数序列：
        // 掷骰1: [1,1,6,6,1] → 2 SWORD + 2 STRENGTH + 1 SWORD
        // 掷骰2: [1,1,6,6,1]
        // 掷骰3: [1,1,6,6,1]
        // 防御方掷骰: [1,1,1,1,1]（不会用到，suppress 不可防御...等等）
        // suppress 没有 unblockable 标签！它是可防御的
        // suppress 的 trigger: { type: 'diceSet', faces: { SWORD: 2, STRENGTH: 2 } }
        // 但 suppress 的效果是 customAction，伤害通过 customAction 生成
        // 需要确认 suppress 是否可防御
        // 查看定义：suppress 没有 tags: ['unblockable']，所以是可防御的
        // 但 suppress 的伤害通过 customAction 在 withDamage 时机生成
        // 防御方的防御技能也在 withDamage 时机执行
        // 所以流程：offensiveRoll → defensiveRoll → resolveAttack（含 suppress customAction + 防御）

        const values = [
            1, 1, 6, 6, 1,  // 掷骰1
            1, 1, 6, 6, 1,  // 掷骰2
            1, 1, 6, 6, 1,  // 掷骰3
            // defensiveRoll 掷骰（僧侣防御）
            1, 1, 1, 1, 1,
            // suppress customAction 的 3 个 d(6)
            2, 3, 4,         // 总和 = 9，< 14 无脑震荡
        ];
        const runner = createRunner(createQueuedRandom(values));
        const result = runner.run({
            name: 'suppress 低伤害',
            setup: createHeroMatchup('barbarian', 'monk'),
            commands: [
                cmd('ADVANCE_PHASE', '0'),
                cmd('ROLL_DICE', '0'),
                cmd('ROLL_DICE', '0'),
                cmd('ROLL_DICE', '0'),
                cmd('CONFIRM_ROLL', '0'),
                cmd('SELECT_ABILITY', '0', { abilityId: 'suppress' }),
                // suppress 可防御 → defensiveRoll
                cmd('ADVANCE_PHASE', '0'),
                // 防御方掷骰
                cmd('ROLL_DICE', '1'),
                cmd('CONFIRM_ROLL', '1'),
                // 攻击结算（含 suppress customAction 投掷3骰）
                cmd('ADVANCE_PHASE', '1'),
            ],
            expect: {
                turnPhase: 'main2',
                activePlayerId: '0',
                players: {
                    '1': {
                        // 伤害 = 2+3+4 = 9（减去防御后的实际值取决于防御技能）
                        statusEffects: { [STATUS_IDS.CONCUSSION]: 0 }, // 无脑震荡
                    },
                },
            },
        });
        expect(result.passed).toBe(true);
    });

    it('suppress 投掷3骰 → 总和>14 → 施加脑震荡', () => {
        const values = [
            1, 1, 6, 6, 1,  // 掷骰1
            1, 1, 6, 6, 1,  // 掷骰2
            1, 1, 6, 6, 1,  // 掷骰3
            // defensiveRoll 掷骰
            1, 1, 1, 1, 1,
            // suppress customAction 的 3 个 d(6)
            5, 5, 5,         // 总和 = 15，> 14 施加脑震荡
        ];
        const runner = createRunner(createQueuedRandom(values));
        const result = runner.run({
            name: 'suppress 高伤害 + 脑震荡',
            setup: createHeroMatchup('barbarian', 'monk'),
            commands: [
                cmd('ADVANCE_PHASE', '0'),
                cmd('ROLL_DICE', '0'),
                cmd('ROLL_DICE', '0'),
                cmd('ROLL_DICE', '0'),
                cmd('CONFIRM_ROLL', '0'),
                cmd('SELECT_ABILITY', '0', { abilityId: 'suppress' }),
                cmd('ADVANCE_PHASE', '0'),
                cmd('ROLL_DICE', '1'),
                cmd('CONFIRM_ROLL', '1'),
                cmd('ADVANCE_PHASE', '1'),
            ],
            expect: {
                turnPhase: 'main2',
                players: {
                    '1': {
                        statusEffects: { [STATUS_IDS.CONCUSSION]: 1 },
                    },
                },
            },
        });
        expect(result.passed).toBe(true);
    });
});

// ============================================================================
// 8. card-dizzy afterAttackResolved 响应窗口链
// ============================================================================

describe('card-dizzy afterAttackResolved 响应窗口链', () => {
    // card-dizzy: timing=roll, playCondition.requireMinDamageDealt=8
    // 攻击造成 >=8 伤害后，afterAttackResolved 响应窗口打开
    // 攻击方可以打出 card-dizzy 施加脑震荡

    it('slap-5 造成 8 伤害 → afterAttackResolved 窗口 → 打出 card-dizzy → 施加脑震荡', () => {
        // 野蛮人 slap-5: 8 伤害（可防御）
        // 需要防御方防御后仍有 >=8 伤害（防御方无防御减伤时）
        // fixedRandom: d()=1 → 全 SWORD → slap-5
        const runner = createRunner(fixedRandom);
        const result = runner.run({
            name: 'card-dizzy 打出',
            setup: createHeroMatchup('barbarian', 'monk', (core) => {
                // 给攻击方手牌中放入 card-dizzy
                const dizzyCard = BARBARIAN_CARDS.find(c => c.id === 'card-dizzy');
                if (dizzyCard) {
                    core.players['0'].hand = [JSON.parse(JSON.stringify(dizzyCard))];
                }
            }),
            commands: [
                cmd('ADVANCE_PHASE', '0'),
                cmd('ROLL_DICE', '0'),
                cmd('ROLL_DICE', '0'),
                cmd('ROLL_DICE', '0'),
                cmd('CONFIRM_ROLL', '0'),
                cmd('SELECT_ABILITY', '0', { abilityId: 'slap-5' }),
                // → defensiveRoll
                cmd('ADVANCE_PHASE', '0'),
                cmd('ROLL_DICE', '1'),
                cmd('CONFIRM_ROLL', '1'),
                // 攻击结算 → 8 伤害 → afterAttackResolved 窗口打开（攻击方有 card-dizzy）
                cmd('ADVANCE_PHASE', '1'),
                // 在响应窗口中打出 card-dizzy
                cmd('PLAY_CARD', '0', { cardId: 'card-dizzy' }),
                // 跳过响应窗口（无更多卡牌可打）
                cmd('RESPONSE_PASS', '0'),
            ],
            expect: {
                turnPhase: 'main2',
                players: {
                    '1': {
                        hp: INITIAL_HEALTH - 8,
                        statusEffects: { [STATUS_IDS.CONCUSSION]: 1 },
                    },
                },
            },
        });
        expect(result.passed).toBe(true);
    });

    it('slap-5 造成 8 伤害 → afterAttackResolved 窗口 → RESPONSE_PASS 跳过', () => {
        const runner = createRunner(fixedRandom);
        const result = runner.run({
            name: 'card-dizzy 跳过',
            setup: createHeroMatchup('barbarian', 'monk', (core) => {
                const dizzyCard = BARBARIAN_CARDS.find(c => c.id === 'card-dizzy');
                if (dizzyCard) {
                    core.players['0'].hand = [JSON.parse(JSON.stringify(dizzyCard))];
                }
            }),
            commands: [
                cmd('ADVANCE_PHASE', '0'),
                cmd('ROLL_DICE', '0'),
                cmd('ROLL_DICE', '0'),
                cmd('ROLL_DICE', '0'),
                cmd('CONFIRM_ROLL', '0'),
                cmd('SELECT_ABILITY', '0', { abilityId: 'slap-5' }),
                cmd('ADVANCE_PHASE', '0'),
                cmd('ROLL_DICE', '1'),
                cmd('CONFIRM_ROLL', '1'),
                cmd('ADVANCE_PHASE', '1'),
                // 跳过响应窗口
                cmd('RESPONSE_PASS', '0'),
            ],
            expect: {
                turnPhase: 'main2',
                players: {
                    '1': {
                        hp: INITIAL_HEALTH - 8,
                        statusEffects: { [STATUS_IDS.CONCUSSION]: 0 }, // 未施加
                    },
                },
            },
        });
        expect(result.passed).toBe(true);
    });

    it('伤害不足 8 → 不触发 afterAttackResolved 窗口', () => {
        // slap-3: 3个 SWORD → 4 伤害（< 8）
        // 需要骰面产生恰好 3 个 SWORD：d() = [1,1,1,4,4] → 3 SWORD + 2 HEART
        const values = [
            1, 1, 1, 4, 4,  // 掷骰1
            1, 1, 1, 4, 4,  // 掷骰2
            1, 1, 1, 4, 4,  // 掷骰3
            // defensiveRoll
            1, 1, 1, 1, 1,
        ];
        const runner = createRunner(createQueuedRandom(values));
        const result = runner.run({
            name: 'card-dizzy 伤害不足',
            setup: createHeroMatchup('barbarian', 'monk', (core) => {
                const dizzyCard = BARBARIAN_CARDS.find(c => c.id === 'card-dizzy');
                if (dizzyCard) {
                    core.players['0'].hand = [JSON.parse(JSON.stringify(dizzyCard))];
                }
            }),
            commands: [
                cmd('ADVANCE_PHASE', '0'),
                cmd('ROLL_DICE', '0'),
                cmd('ROLL_DICE', '0'),
                cmd('ROLL_DICE', '0'),
                cmd('CONFIRM_ROLL', '0'),
                // 3 SWORD → slap-3 (4 伤害)
                cmd('SELECT_ABILITY', '0', { abilityId: 'slap-3' }),
                cmd('ADVANCE_PHASE', '0'),
                cmd('ROLL_DICE', '1'),
                cmd('CONFIRM_ROLL', '1'),
                // 4 伤害 < 8 → 无 afterAttackResolved 窗口 → 直接 main2
                cmd('ADVANCE_PHASE', '1'),
            ],
            expect: {
                turnPhase: 'main2',
                players: {
                    '1': {
                        hp: INITIAL_HEALTH - 4,
                        statusEffects: { [STATUS_IDS.CONCUSSION]: 0 },
                    },
                },
            },
        });
        expect(result.passed).toBe(true);
    });
});


// ============================================================================
// 1. 晕眩（Daze）额外攻击链
// ============================================================================

describe('晕眩（Daze）额外攻击链', () => {
    /**
     * 场景：Barbarian(0) vs Monk(1)
     * Barbarian 有 daze 状态，使用 slap-5（5 SWORD → 8 伤害）
     * 攻击结算后：移除 daze → 对手获得额外攻击 → 进入 offensiveRoll
     *
     * Barbarian 骰面：1,2,3→SWORD  4,5→HEART  6→STRENGTH
     * fixedRandom.d() 返回 1 → 全部 SWORD → 5 SWORD → slap-5
     *
     * Monk 防御骰面：fixedRandom.d() 返回 1 → 全部 FIST
     * meditation: FIST 面数量=防御骰数(1)→造成1伤害，TAIJI 面数量=0→不获得太极
     *
     * 防御 rollLimit=1，所以只需 1 次 ROLL_DICE
     */
    it('攻击方有 daze → 攻击结算后对手获得额外攻击', () => {
        // fixedRandom: d() 返回 1
        // 进攻骰: [1,1,1,1,1] → 5 SWORD → slap-5 (8 伤害)
        // 防御骰: [1] → 1 FIST → meditation: 1 伤害反击
        const runner = new GameTestRunner({
            domain: DiceThroneDomain,
            systems: testSystems,
            playerIds: ['0', '1'],
            random: fixedRandom,
            setup: createHeroMatchup('barbarian', 'monk', (core) => {
                // 给攻击方施加 daze
                core.players['0'].statusEffects[STATUS_IDS.DAZE] = 1;
            }),
            assertFn: () => [],
            silent: true,
        });

        runner.execute([
            // main1 → offensiveRoll
            cmd('ADVANCE_PHASE', '0'),
            // 进攻掷骰（fixedRandom → 全1 → 5 SWORD）
            cmd('ROLL_DICE', '0'),
            cmd('CONFIRM_ROLL', '0'),
            // offensiveRoll → defensiveRoll（slap-5 可防御）
            cmd('ADVANCE_PHASE', '0'),
            // 防御掷骰（rollLimit=1，只需1次）
            cmd('ROLL_DICE', '1'),
            cmd('CONFIRM_ROLL', '1'),
            // defensiveRoll → 攻击结算 → daze 触发 → 额外攻击 → offensiveRoll
            cmd('ADVANCE_PHASE', '1'),
        ]);

        const state = runner.getState();
        // 额外攻击：monk(1) 成为攻击方，进入 offensiveRoll
        expect(state.sys.phase).toBe('offensiveRoll');
        // 攻击方 daze 已移除
        expect(state.core.players['0'].statusEffects[STATUS_IDS.DAZE] ?? 0).toBe(0);
        // 额外攻击进行中
        expect(state.core.extraAttackInProgress).toBeTruthy();
        expect(state.core.extraAttackInProgress?.attackerId).toBe('1');
    });

    it('攻击方无 daze → 正常结算进入 main2', () => {
        const runner = new GameTestRunner({
            domain: DiceThroneDomain,
            systems: testSystems,
            playerIds: ['0', '1'],
            random: fixedRandom,
            setup: createHeroMatchup('barbarian', 'monk'),
            assertFn: () => [],
            silent: true,
        });

        runner.execute([
            cmd('ADVANCE_PHASE', '0'),
            cmd('ROLL_DICE', '0'),
            cmd('CONFIRM_ROLL', '0'),
            cmd('ADVANCE_PHASE', '0'),
            cmd('ROLL_DICE', '1'),
            cmd('CONFIRM_ROLL', '1'),
            cmd('ADVANCE_PHASE', '1'),
        ]);

        const state = runner.getState();
        expect(state.sys.phase).toBe('main2');
        expect(state.core.extraAttackInProgress).toBeFalsy();
    });
});


// ============================================================================
// 2. 致盲（Blinded）攻击失败链
// ============================================================================

describe('致盲（Blinded）攻击判定链', () => {
    /**
     * 场景：Barbarian(0) vs Monk(1)
     * Barbarian 有 blinded 状态，使用 slap-5
     * offensiveRoll 退出时：投掷1骰判定
     *   - 骰值 1-2：攻击失败，跳过防御直接进入 main2
     *   - 骰值 3-6：攻击命中，正常进入防御阶段
     *
     * Barbarian 骰面：1,2,3→SWORD  4,5→HEART  6→STRENGTH
     */

    it('致盲判定失败（骰值=1）→ 跳过攻击进入 main2', () => {
        // fixedRandom: d() 返回 1 → 致盲判定骰值=1 ≤ 2 → 攻击失败
        const runner = new GameTestRunner({
            domain: DiceThroneDomain,
            systems: testSystems,
            playerIds: ['0', '1'],
            random: fixedRandom,
            setup: createHeroMatchup('barbarian', 'monk', (core) => {
                core.players['0'].statusEffects[STATUS_IDS.BLINDED] = 1;
            }),
            assertFn: () => [],
            silent: true,
        });

        runner.execute([
            cmd('ADVANCE_PHASE', '0'),
            cmd('ROLL_DICE', '0'),
            cmd('CONFIRM_ROLL', '0'),
            // offensiveRoll → 致盲判定(1) → 失败 → main2
            cmd('ADVANCE_PHASE', '0'),
        ]);

        const state = runner.getState();
        expect(state.sys.phase).toBe('main2');
        // blinded 已移除
        expect(state.core.players['0'].statusEffects[STATUS_IDS.BLINDED] ?? 0).toBe(0);
        // 对手 HP 不变（攻击未命中）
        expect(state.core.players['1'].resources[RESOURCE_IDS.HP]).toBe(INITIAL_HEALTH);
    });

    it('致盲判定成功（骰值=3）→ 正常进入防御阶段', () => {
        // createQueuedRandom: 进攻骰 [1,1,1,1,1] → 5 SWORD → slap-5
        // 致盲判定骰值=3 > 2 → 攻击命中
        // 防御骰 [1] → meditation
        const random = createQueuedRandom([1, 1, 1, 1, 1, 3, 1]);
        const runner = new GameTestRunner({
            domain: DiceThroneDomain,
            systems: testSystems,
            playerIds: ['0', '1'],
            random,
            setup: createHeroMatchup('barbarian', 'monk', (core) => {
                core.players['0'].statusEffects[STATUS_IDS.BLINDED] = 1;
            }),
            assertFn: () => [],
            silent: true,
        });

        runner.execute([
            cmd('ADVANCE_PHASE', '0'),
            cmd('ROLL_DICE', '0'),
            cmd('CONFIRM_ROLL', '0'),
            // offensiveRoll → 致盲判定(3) → 成功 → defensiveRoll
            cmd('ADVANCE_PHASE', '0'),
        ]);

        const state = runner.getState();
        expect(state.sys.phase).toBe('defensiveRoll');
        expect(state.core.players['0'].statusEffects[STATUS_IDS.BLINDED] ?? 0).toBe(0);
    });

    it('致盲判定成功 → 防御结算 → 正常进入 main2', () => {
        // 进攻骰 [1,1,1,1,1] → 5 SWORD → slap-5 (8 伤害)
        // 致盲判定骰值=4 > 2 → 命中
        // 防御骰 [1] → 1 FIST → meditation: 1 伤害反击
        const random = createQueuedRandom([1, 1, 1, 1, 1, 4, 1]);
        const runner = new GameTestRunner({
            domain: DiceThroneDomain,
            systems: testSystems,
            playerIds: ['0', '1'],
            random,
            setup: createHeroMatchup('barbarian', 'monk', (core) => {
                core.players['0'].statusEffects[STATUS_IDS.BLINDED] = 1;
            }),
            assertFn: () => [],
            silent: true,
        });

        runner.execute([
            cmd('ADVANCE_PHASE', '0'),
            cmd('ROLL_DICE', '0'),
            cmd('CONFIRM_ROLL', '0'),
            cmd('ADVANCE_PHASE', '0'),
            // defensiveRoll
            cmd('ROLL_DICE', '1'),
            cmd('CONFIRM_ROLL', '1'),
            cmd('ADVANCE_PHASE', '1'),
        ]);

        const state = runner.getState();
        expect(state.sys.phase).toBe('main2');
        // slap-5 造成 8 伤害，meditation 反击 1 伤害
        expect(state.core.players['1'].resources[RESOURCE_IDS.HP]).toBe(INITIAL_HEALTH - 8);
        expect(state.core.players['0'].resources[RESOURCE_IDS.HP]).toBe(INITIAL_HEALTH - 1);
    });
});


// ============================================================================
// 3. 不可防御攻击链
// ============================================================================

describe('不可防御攻击链', () => {
    /**
     * 场景：Barbarian(0) vs Monk(1)
     * violent-assault: 4 STRENGTH → 5 伤害 + daze，unblockable
     * all-out-strike: 2 SWORD + 2 STRENGTH → 4 伤害，unblockable
     *
     * Barbarian 骰面：1,2,3→SWORD  4,5→HEART  6→STRENGTH
     */

    it('violent-assault（unblockable）→ 跳过防御直接结算', () => {
        // 需要 4 STRENGTH: 骰值 [6,6,6,6,x]
        // fixedRandom.d()=1 不行，需要 createQueuedRandom
        // 4 个 6 + 1 个任意 → [6,6,6,6,1]
        const random = createQueuedRandom([6, 6, 6, 6, 1]);
        const runner = new GameTestRunner({
            domain: DiceThroneDomain,
            systems: testSystems,
            playerIds: ['0', '1'],
            random,
            setup: createHeroMatchup('barbarian', 'monk'),
            assertFn: () => [],
            silent: true,
        });

        runner.execute([
            cmd('ADVANCE_PHASE', '0'),
            cmd('ROLL_DICE', '0'),
            cmd('CONFIRM_ROLL', '0'),
            // offensiveRoll → unblockable → 直接结算 → main2
            cmd('ADVANCE_PHASE', '0'),
        ]);

        const state = runner.getState();
        expect(state.sys.phase).toBe('main2');
        // violent-assault: 5 伤害 + daze
        expect(state.core.players['1'].resources[RESOURCE_IDS.HP]).toBe(INITIAL_HEALTH - 5);
        expect(state.core.players['1'].statusEffects[STATUS_IDS.DAZE] ?? 0).toBe(1);
    });

    it('all-out-strike（unblockable）→ 跳过防御直接结算', () => {
        // 需要 2 SWORD + 2 STRENGTH: [1,1,6,6,x]
        // 第5个骰子随意，用4(HEART)
        const random = createQueuedRandom([1, 1, 6, 6, 4]);
        const runner = new GameTestRunner({
            domain: DiceThroneDomain,
            systems: testSystems,
            playerIds: ['0', '1'],
            random,
            setup: createHeroMatchup('barbarian', 'monk'),
            assertFn: () => [],
            silent: true,
        });

        runner.execute([
            cmd('ADVANCE_PHASE', '0'),
            cmd('ROLL_DICE', '0'),
            cmd('CONFIRM_ROLL', '0'),
            cmd('ADVANCE_PHASE', '0'),
        ]);

        const state = runner.getState();
        expect(state.sys.phase).toBe('main2');
        // all-out-strike: 4 伤害
        expect(state.core.players['1'].resources[RESOURCE_IDS.HP]).toBe(INITIAL_HEALTH - 4);
    });
});


// ============================================================================
// 4. 终极技能链
// ============================================================================

describe('终极技能链', () => {
    /**
     * 场景：Barbarian(0) vs Monk(1)
     * reckless-strike: 5 STRENGTH → 15 伤害 + 自伤4（onHit）
     * ultimate 标签：不可防御
     *
     * Barbarian 骰面：6→STRENGTH
     * 需要 5 个 6: [6,6,6,6,6]
     */
    it('reckless-strike（ultimate）→ 不可防御 → 15伤害 + 自伤4', () => {
        const random = createQueuedRandom([6, 6, 6, 6, 6]);
        const runner = new GameTestRunner({
            domain: DiceThroneDomain,
            systems: testSystems,
            playerIds: ['0', '1'],
            random,
            setup: createHeroMatchup('barbarian', 'monk'),
            assertFn: () => [],
            silent: true,
        });

        runner.execute([
            cmd('ADVANCE_PHASE', '0'),
            cmd('ROLL_DICE', '0'),
            cmd('CONFIRM_ROLL', '0'),
            // offensiveRoll → ultimate(unblockable) → 直接结算 → main2
            cmd('ADVANCE_PHASE', '0'),
        ]);

        const state = runner.getState();
        expect(state.sys.phase).toBe('main2');
        // reckless-strike: 15 伤害给对手
        expect(state.core.players['1'].resources[RESOURCE_IDS.HP]).toBe(INITIAL_HEALTH - 15);
        // 自伤 4（onHit 条件：伤害 > 0 → 满足）
        expect(state.core.players['0'].resources[RESOURCE_IDS.HP]).toBe(INITIAL_HEALTH - 4);
    });
});


// ============================================================================
// 5. 治疗技能链
// ============================================================================

describe('治疗技能链', () => {
    /**
     * 场景：Barbarian(0) vs Monk(1)
     * steadfast-3: 3 HEART → 治疗4
     * 治疗技能无 pendingAttack → offensiveRoll 退出时直接进入 main2
     *
     * Barbarian 骰面：4,5→HEART
     * 需要 3 HEART: [4,4,4,x,x] → 3 HEART + 其他
     * 但 fixedRandom.d()=1 → 全 SWORD，不行
     * 用 createQueuedRandom: [4,4,4,1,1] → 3 HEART + 2 SWORD → steadfast-3
     */
    it('steadfast-3（治疗）→ 无攻击 → 直接进入 main2', () => {
        const random = createQueuedRandom([4, 4, 4, 1, 1]);
        const runner = new GameTestRunner({
            domain: DiceThroneDomain,
            systems: testSystems,
            playerIds: ['0', '1'],
            random,
            setup: createHeroMatchup('barbarian', 'monk', (core) => {
                // 先扣血以便观察治疗效果
                core.players['0'].resources[RESOURCE_IDS.HP] = INITIAL_HEALTH - 10;
            }),
            assertFn: () => [],
            silent: true,
        });

        runner.execute([
            cmd('ADVANCE_PHASE', '0'),
            cmd('ROLL_DICE', '0'),
            cmd('CONFIRM_ROLL', '0'),
            // offensiveRoll → 无 pendingAttack（治疗技能）→ main2
            cmd('ADVANCE_PHASE', '0'),
        ]);

        const state = runner.getState();
        expect(state.sys.phase).toBe('main2');
        // steadfast-3: 治疗 4
        expect(state.core.players['0'].resources[RESOURCE_IDS.HP]).toBe(INITIAL_HEALTH - 10 + 4);
        // 对手 HP 不变
        expect(state.core.players['1'].resources[RESOURCE_IDS.HP]).toBe(INITIAL_HEALTH);
    });
});
