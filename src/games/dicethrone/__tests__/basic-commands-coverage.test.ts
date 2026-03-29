/**
 * DiceThrone 基础命令覆盖测试
 *
 * 覆盖以下零覆盖命令：
 * 1. TOGGLE_DIE_LOCK — 锁定/解锁骰子
 * 2. REROLL_DIE — 重掷单个骰子（交互上下文中）
 * 3. RESOLVE_CHOICE — 解决选择交互
 */

import { describe, it, expect } from 'vitest';
import { GameTestRunner } from '../../../engine/testing';
import { buildAiDecisionContext, resolveNextLocalAiAction } from '../../../engine/ai';
import { DiceThroneDomain } from '../domain';
import { buildDiceThroneAiLegalActions, diceThroneAiRuntime } from '../ai';
import { engineConfig } from '../game';
import {
    testSystems,
    createQueuedRandom,
    createNoResponseSetup,
    assertState,
    cmd,
    createSetupWithHand,
    fixedRandom,
    type CommandInput,
    createHeroMatchup,
} from './test-utils';
import type { DiceThroneCore } from '../domain/types';
import type { MatchState, PlayerId, RandomFn } from '../../../engine/types';
import { executePipeline } from '../../../engine/pipeline';
import { createInitializedState, injectPendingInteraction } from './test-utils';
import { resolveLocalPregameControlledPlayerId } from '../../../engine/transport/followCurrentTurnPlayer';
import { RESOURCE_IDS } from '../domain/resources';

const pipelineConfig = { domain: DiceThroneDomain, systems: testSystems };

/** 执行命令并返回新状态 */
function execCmd(
    state: MatchState<DiceThroneCore>,
    command: CommandInput,
    random: RandomFn = fixedRandom,
): MatchState<DiceThroneCore> {
    const result = executePipeline(
        pipelineConfig,
        state,
        { type: command.type, playerId: command.playerId, payload: command.payload, timestamp: Date.now() },
        random,
        ['0', '1']
    );
    if (!result.success) {
        throw new Error(`命令执行失败: ${command.type} - ${result.error}`);
    }
    return result.state as MatchState<DiceThroneCore>;
}

/** 尝试执行命令，返回 pipeline 结果 */
function tryCmd(
    state: MatchState<DiceThroneCore>,
    command: CommandInput,
    random: RandomFn = fixedRandom,
) {
    return executePipeline(
        pipelineConfig,
        state,
        { type: command.type, playerId: command.playerId, payload: command.payload, timestamp: Date.now() },
        random,
        ['0', '1']
    );
}


// ============================================================================
// 1. TOGGLE_DIE_LOCK — 掷骰阶段锁定/解锁骰子
// ============================================================================

describe('TOGGLE_DIE_LOCK 锁定/解锁骰子', () => {
    it('GTR: 掷骰后锁定骰子，再次掷骰时锁定骰子不变', () => {
        // 第一次掷骰: [3,3,3,3,3]，锁定 die 0 后第二次掷骰: [1,1,1,1]（die 0 保持 3）
        const diceValues = [3, 3, 3, 3, 3, 1, 1, 1, 1, 1, 1, 1, 1];
        const random = createQueuedRandom(diceValues);

        const runner = new GameTestRunner({
            domain: DiceThroneDomain,
            systems: testSystems,
            playerIds: ['0', '1'],
            random,
            setup: createNoResponseSetup(),
            assertFn: assertState,
            silent: true,
        });

        const result = runner.run({
            name: '锁定骰子后重掷不影响锁定骰',
            commands: [
                cmd('ADVANCE_PHASE', '0'),       // main1 -> offensiveRoll
                cmd('ROLL_DICE', '0'),            // 掷骰 [3,3,3,3,3]
                cmd('TOGGLE_DIE_LOCK', '0', { dieId: 0 }), // 锁定 die 0
                cmd('ROLL_DICE', '0'),            // 再掷，die 0 保持
            ],
        });

        // 验证 die 0 被锁定且值不变
        const core = result.finalState.core;
        expect(core.dice[0].isKept).toBe(true);
        expect(core.dice[0].value).toBe(3);
        // 其他骰子被重掷
        expect(core.rollCount).toBe(2);
    });

    it('GTR: 锁定后解锁骰子', () => {
        const diceValues = [4, 4, 4, 4, 4, 2, 2, 2, 2, 2];
        const random = createQueuedRandom(diceValues);

        const runner = new GameTestRunner({
            domain: DiceThroneDomain,
            systems: testSystems,
            playerIds: ['0', '1'],
            random,
            setup: createNoResponseSetup(),
            assertFn: assertState,
            silent: true,
        });

        const result = runner.run({
            name: '锁定后解锁骰子',
            commands: [
                cmd('ADVANCE_PHASE', '0'),
                cmd('ROLL_DICE', '0'),
                cmd('TOGGLE_DIE_LOCK', '0', { dieId: 0 }),  // 锁定
                cmd('TOGGLE_DIE_LOCK', '0', { dieId: 0 }),  // 解锁
                cmd('ROLL_DICE', '0'),                        // 全部重掷
            ],
        });

        const core = result.finalState.core;
        expect(core.dice[0].isKept).toBe(false);
        // 解锁后 die 0 也被重掷
        expect(core.dice[0].value).toBe(2);
    });

    it('非 offensiveRoll/defensiveRoll 阶段锁定骰子失败', () => {
        const state = createInitializedState(['0', '1'], fixedRandom);
        // main1 阶段
        const result = tryCmd(state, cmd('TOGGLE_DIE_LOCK', '0', { dieId: 0 }));
        expect(result.success).toBe(false);
    });

    it('未投掷前锁定骰子失败', () => {
        const state = createInitializedState(['0', '1'], fixedRandom);
        state.sys.phase = 'offensiveRoll';

        const result = tryCmd(state, cmd('TOGGLE_DIE_LOCK', '0', { dieId: 0 }));
        expect(result.success).toBe(false);
        expect(result.error).toBe('no_roll_yet');
    });



    it('非当前玩家锁定骰子失败', () => {
        const diceValues = [3, 3, 3, 3, 3];
        const random = createQueuedRandom(diceValues);

        const runner = new GameTestRunner({
            domain: DiceThroneDomain,
            systems: testSystems,
            playerIds: ['0', '1'],
            random,
            setup: createNoResponseSetup(),
            assertFn: assertState,
            silent: true,
        });

        const result = runner.run({
            name: '非当前玩家锁定失败',
            commands: [
                cmd('ADVANCE_PHASE', '0'),
                cmd('ROLL_DICE', '0'),
            ],
        });

        // 玩家 1 尝试锁定
        const tryResult = tryCmd(result.finalState, cmd('TOGGLE_DIE_LOCK', '1', { dieId: 0 }));
        expect(tryResult.success).toBe(false);
    });

    it('确认掷骰后锁定骰子失败', () => {
        const diceValues = [3, 3, 3, 3, 3];
        const random = createQueuedRandom(diceValues);

        const runner = new GameTestRunner({
            domain: DiceThroneDomain,
            systems: testSystems,
            playerIds: ['0', '1'],
            random,
            setup: createNoResponseSetup(),
            assertFn: assertState,
            silent: true,
        });

        const result = runner.run({
            name: '确认后锁定失败',
            commands: [
                cmd('ADVANCE_PHASE', '0'),
                cmd('ROLL_DICE', '0'),
                cmd('CONFIRM_ROLL', '0'),
            ],
        });

        const tryResult = tryCmd(result.finalState, cmd('TOGGLE_DIE_LOCK', '0', { dieId: 0 }));
        expect(tryResult.success).toBe(false);
    });

    it('不存在的骰子 ID 锁定失败', () => {
        const diceValues = [3, 3, 3, 3, 3];
        const random = createQueuedRandom(diceValues);

        const runner = new GameTestRunner({
            domain: DiceThroneDomain,
            systems: testSystems,
            playerIds: ['0', '1'],
            random,
            setup: createNoResponseSetup(),
            assertFn: assertState,
            silent: true,
        });

        const result = runner.run({
            name: '无效骰子ID',
            commands: [
                cmd('ADVANCE_PHASE', '0'),
                cmd('ROLL_DICE', '0'),
            ],
        });

        const tryResult = tryCmd(result.finalState, cmd('TOGGLE_DIE_LOCK', '0', { dieId: 99 }));
        expect(tryResult.success).toBe(false);
    });
});

describe('AI legal actions', () => {
    it('setup 阶段应为本地 AI 生成选角动作', () => {
        const core = DiceThroneDomain.setup(['0', '1'], fixedRandom);
        const state: MatchState<DiceThroneCore> = {
            core,
            sys: {
                phase: 'setup',
                interaction: { queue: [] },
            } as MatchState<DiceThroneCore>['sys'],
        };

        const actions = buildDiceThroneAiLegalActions({
            playerId: '1',
            state,
        });

        expect(actions.some((action) =>
            action.kind === 'setup-select-character'
            && action.commands[0]?.type === 'SELECT_CHARACTER'
        )).toBe(true);
    });

    it('主流程阶段应生成推进回合动作', () => {
        const state = createInitializedState(['0', '1'], fixedRandom);

        const actions = buildDiceThroneAiLegalActions({
            playerId: '0',
            state,
        });

        expect(actions.some((action) => action.kind === 'advance-phase')).toBe(true);
    });

    it('本地 AI runner 应在 setup 阶段选择角色', async () => {
        const core = DiceThroneDomain.setup(['0', '1'], fixedRandom);
        const state: MatchState<DiceThroneCore> = {
            core,
            sys: {
                phase: 'setup',
                interaction: { queue: [] },
            } as MatchState<DiceThroneCore>['sys'],
        };

        const resolution = await resolveNextLocalAiAction({
            engineConfig,
            state,
            matchId: 'local:test',
            seatControllers: {
                '1': { type: 'local-ai' },
            },
        });

        expect(resolution?.playerId).toBe('1');
        expect(resolution?.action.kind).toBe('setup-select-character');
        expect(resolution?.action.commands[0]).toMatchObject({
            type: 'SELECT_CHARACTER',
            payload: { characterId: 'monk' },
        });
    });

    it('本地 AI 在已选角色后应进入准备动作，而不是重复选角', () => {
        const core = DiceThroneDomain.setup(['0', '1'], fixedRandom);
        core.selectedCharacters['1'] = 'monk';

        const state: MatchState<DiceThroneCore> = {
            core,
            sys: {
                phase: 'setup',
                interaction: { queue: [] },
            } as MatchState<DiceThroneCore>['sys'],
        };

        const actions = buildDiceThroneAiLegalActions({
            playerId: '1',
            state,
        });

        expect(actions.some((action) => action.kind === 'setup-select-character')).toBe(false);
        expect(actions).toContainEqual(expect.objectContaining({
            kind: 'setup-ready',
        }));
    });

    it('本地 AI 在 main1 应优先打出可用升级牌而不是直接推进阶段', async () => {
        const state = createSetupWithHand(['card-storm-assault-2'], { cp: 1 })(['0', '1'], fixedRandom);

        const resolution = await resolveNextLocalAiAction({
            engineConfig,
            state,
            matchId: 'local:test',
            seatControllers: {
                '0': { type: 'local-ai' },
            },
        });

        expect(resolution?.playerId).toBe('0');
        expect(resolution?.action.kind).toBe('play-upgrade-card');
        expect(resolution?.action.commands[0]).toMatchObject({
            type: 'PLAY_UPGRADE_CARD',
            payload: {
                cardId: 'card-storm-assault-2',
                targetAbilityId: 'thunder-strike',
            },
        });
    });

    it('本地 AI 在 defensiveRoll 已选防御技能后应直接掷骰，而不是重复选择技能', async () => {
        const state = createHeroMatchup('monk', 'shadow_thief')(['0', '1'], fixedRandom);
        state.sys.phase = 'defensiveRoll';
        state.core.rollCount = 0;
        state.core.pendingAttack = {
            attackerId: '0',
            defenderId: '1',
            isDefendable: true,
            sourceAbilityId: 'fist-technique-5',
            defenseAbilityId: 'shadow-defense',
        };

        const actions = buildDiceThroneAiLegalActions({
            playerId: '1',
            state,
        });
        expect(actions.some((action) => action.kind === 'select-ability')).toBe(false);
        expect(actions).toContainEqual(expect.objectContaining({
            kind: 'roll-dice',
        }));

        const resolution = await resolveNextLocalAiAction({
            engineConfig,
            state,
            matchId: 'local:test',
            seatControllers: {
                '1': { type: 'local-ai' },
            },
        });

        expect(resolution?.playerId).toBe('1');
        expect(resolution?.action.kind).toBe('roll-dice');
        expect(resolution?.action.commands[0]).toMatchObject({
            type: 'ROLL_DICE',
        });
    });

    it('防御阶段掷骰后应只暴露符合当前防御骰数量的最终技能，而不是全部防御技能', () => {
        const state = createHeroMatchup('monk', 'shadow_thief')(['0', '1'], fixedRandom);
        state.sys.phase = 'defensiveRoll';
        state.core.rollCount = 1;
        state.core.rollLimit = 1;
        state.core.rollDiceCount = 4;
        state.core.rollConfirmed = false;
        state.core.dice = state.core.dice.slice(0, 4);
        state.core.pendingAttack = {
            attackerId: '0',
            defenderId: '1',
            isDefendable: true,
            sourceAbilityId: 'fist-technique-5',
            defenseAbilityId: 'fearless-riposte',
        };

        const actions = buildDiceThroneAiLegalActions({
            playerId: '1',
            state,
        });
        const abilityIds = actions
            .filter((action) => action.kind === 'select-ability')
            .map((action) => action.metadata?.abilityId);

        expect(abilityIds).toEqual(['shadow-defense']);
        expect(actions.some((action) => action.kind === 'advance-phase')).toBe(false);
        expect(tryCmd(state, cmd('ADVANCE_PHASE', '1')).success).toBe(false);
    });

    it('本地 AI 在 defensiveRoll 骰面已确认且最终防御技能已选定后应推进阶段，而不是重复确认或重复选技能', async () => {
        const state = createHeroMatchup('monk', 'shadow_thief')(['0', '1'], fixedRandom);
        state.sys.phase = 'defensiveRoll';
        state.core.rollCount = 1;
        state.core.rollLimit = 1;
        state.core.rollDiceCount = 4;
        state.core.rollConfirmed = true;
        state.core.dice = state.core.dice.slice(0, 4);
        state.core.pendingAttack = {
            attackerId: '0',
            defenderId: '1',
            isDefendable: true,
            sourceAbilityId: 'fist-technique-5',
            defenseAbilityId: 'shadow-defense',
        };

        const actions = buildDiceThroneAiLegalActions({
            playerId: '1',
            state,
        });
        expect(actions.some((action) => action.kind === 'select-ability')).toBe(false);
        expect(actions.some((action) => action.kind === 'confirm-roll')).toBe(false);
        expect(actions).toContainEqual(expect.objectContaining({
            kind: 'advance-phase',
        }));

        const resolution = await resolveNextLocalAiAction({
            engineConfig,
            state,
            matchId: 'local:test',
            seatControllers: {
                '1': { type: 'local-ai' },
            },
        });

        expect(resolution?.playerId).toBe('1');
        expect(resolution?.action.kind).toBe('advance-phase');
        expect(resolution?.action.commands[0]).toMatchObject({
            type: 'ADVANCE_PHASE',
        });
    });

    it('本地 AI 在 defensiveRoll 应能连续自动执行到离开防御阶段，而不是在重复动作上卡住', async () => {
        const random = createQueuedRandom([1, 1, 1, 1]);
        let state = createHeroMatchup('monk', 'shadow_thief')(['0', '1'], random);
        state.sys.phase = 'defensiveRoll';
        state.core.rollCount = 0;
        state.core.rollLimit = 1;
        state.core.rollDiceCount = 0;
        state.core.rollConfirmed = false;
        state.core.pendingAttack = {
            attackerId: '0',
            defenderId: '1',
            isDefendable: true,
            sourceAbilityId: 'fist-technique-5',
            defenseAbilityId: 'shadow-defense',
        };

        const executedKinds: string[] = [];
        for (let step = 0; step < 3; step += 1) {
            const resolution = await resolveNextLocalAiAction({
                engineConfig,
                state,
                matchId: 'local:test',
                seatControllers: {
                    '1': { type: 'local-ai' },
                },
            });

            expect(resolution?.playerId).toBe('1');
            expect(resolution?.action).toBeTruthy();
            executedKinds.push(resolution!.action.kind);

            for (const command of resolution!.action.commands) {
                state = execCmd(
                    state,
                    cmd(command.type as CommandInput['type'], resolution!.playerId, command.payload ?? {}),
                    random,
                );
            }
        }

        expect(executedKinds).toEqual(['roll-dice', 'confirm-roll', 'advance-phase']);
        expect(state.sys.phase).toBe('main2');
    });

    it('本地 AI 在太极响应窗口应执行一次 token 后跳过响应，并正确关闭窗口', async () => {
        const random = createQueuedRandom([1, 1]);
        let state = createHeroMatchup('monk', 'monk')(['0', '1'], random);
        state.core.players['0'].tokens.taiji = 2;
        state.core.pendingDamage = {
            id: 'dmg-ai-token',
            sourcePlayerId: '0',
            targetPlayerId: '1',
            originalDamage: 5,
            currentDamage: 5,
            responseType: 'beforeDamageDealt',
            responderId: '0',
            isFullyEvaded: false,
        };
        state.sys.responseWindow = {
            current: {
                id: 'rw-token',
                windowType: 'afterAttackResolved',
                responderQueue: ['0'],
                currentResponderIndex: 0,
                passedPlayers: [],
            },
        };

        const executedKinds: string[] = [];
        const attemptKeys: string[] = [];
        for (let step = 0; step < 2; step += 1) {
            const resolution = await resolveNextLocalAiAction({
                engineConfig,
                state,
                matchId: 'local:test',
                seatControllers: {
                    '0': { type: 'local-ai' },
                },
            });

            expect(resolution?.playerId).toBe('0');
            expect(resolution?.action).toBeTruthy();
            expect(resolution?.attemptKey).toBeTruthy();
            executedKinds.push(resolution!.action.kind);
            attemptKeys.push(resolution!.attemptKey);

            for (const command of resolution!.action.commands) {
                state = execCmd(
                    state,
                    cmd(command.type as CommandInput['type'], resolution!.playerId, command.payload ?? {}),
                    random,
                );
            }
        }

        expect(executedKinds).toEqual(['token-response', 'skip-token-response']);
        expect(new Set(attemptKeys).size).toBe(2);
        expect(state.core.players['0'].tokens.taiji).toBe(1);
        expect(state.core.pendingDamage).toBeUndefined();
        expect(state.sys.interaction.current).toBeUndefined();
        expect(state.sys.responseWindow?.current).toBeUndefined();
        expect(state.core.activePlayerId).toBe('0');

        const next = await resolveNextLocalAiAction({
            engineConfig,
            state,
            matchId: 'local:test',
            seatControllers: {
                '0': { type: 'local-ai' },
            },
        });

        expect(next?.playerId).toBe('0');
        expect(next?.action.kind).toBe('advance-phase');
    });

    it('本地 AI 在 offensiveRoll 有低点骰时应优先使用教皇税重掷，并在重掷后继续决策', async () => {
        const random = createQueuedRandom([6]);
        let state = createHeroMatchup('paladin', 'monk')(['0', '1'], random);
        state.sys.phase = 'offensiveRoll';
        state.core.rollCount = 1;
        state.core.rollLimit = 2;
        state.core.rollDiceCount = 5;
        state.core.rollConfirmed = false;
        state.core.players['0'].resources[RESOURCE_IDS.CP] = 2;
        state.core.dice = [
            { id: 0, value: 1, symbol: 'fist', isKept: false },
            { id: 1, value: 2, symbol: 'sword', isKept: false },
            { id: 2, value: 6, symbol: 'pray', isKept: false },
            { id: 3, value: 2, symbol: 'sword', isKept: false },
            { id: 4, value: 6, symbol: 'pray', isKept: false },
        ];

        const first = await resolveNextLocalAiAction({
            engineConfig,
            state,
            matchId: 'local:test',
            seatControllers: {
                '0': { type: 'local-ai' },
            },
        });

        expect(first?.playerId).toBe('0');
        expect(first?.action.kind).toBe('use-passive-ability');
        expect(first?.action.metadata).toMatchObject({
            passiveId: 'tithes',
            actionIndex: 0,
            targetDieId: 0,
        });
        expect(first?.attemptKey).toBeTruthy();

        for (const command of first!.action.commands) {
            state = execCmd(
                state,
                cmd(command.type as CommandInput['type'], first!.playerId, command.payload ?? {}),
                random,
            );
        }

        expect(state.core.players['0'].resources[RESOURCE_IDS.CP]).toBe(1);
        expect(state.core.dice[0]?.value).toBe(6);

        const second = await resolveNextLocalAiAction({
            engineConfig,
            state,
            matchId: 'local:test',
            seatControllers: {
                '0': { type: 'local-ai' },
            },
        });

        expect(second?.playerId).toBe('0');
        expect(second?.action).toBeTruthy();
        expect(second?.attemptKey).toBeTruthy();
        expect(second?.attemptKey).not.toBe(first?.attemptKey);
    });

    it('本地 AI 在响应窗口存在可打补牌牌时，应优先出牌而不是直接 pass', async () => {
        let state = createHeroMatchup('paladin', 'monk')(['0', '1'], fixedRandom);
        state.sys.phase = 'main2';
        state.core.activePlayerId = '1';
        state.core.players['0'].resources[RESOURCE_IDS.CP] = 2;
        state.core.players['0'].hand = [
            {
                id: 'card-super-double',
                name: 'Undefendable',
                type: 'action',
                cpCost: 2,
                timing: 'instant',
                description: 'draw 3',
                effects: [{ description: '抽取3张牌', action: { type: 'drawCard', target: 'self', drawCount: 3 }, timing: 'immediate' }],
            },
        ];
        state.sys.responseWindow = {
            current: {
                id: 'rw-then-breakpoint',
                windowType: 'thenBreakpoint',
                responderQueue: ['0'],
                currentResponderIndex: 0,
                passedPlayers: [],
            },
        };

        const first = await resolveNextLocalAiAction({
            engineConfig,
            state,
            matchId: 'local:test',
            seatControllers: {
                '0': { type: 'local-ai' },
            },
        });

        expect(first?.playerId).toBe('0');
        expect(first?.action.kind).toBe('response-play-card');
        expect(first?.action.metadata).toMatchObject({ cardId: 'card-super-double' });

        for (const command of first!.action.commands) {
            state = execCmd(
                state,
                cmd(command.type as CommandInput['type'], first!.playerId, command.payload ?? {}),
            );
        }

        expect(state.sys.responseWindow?.current).toBeUndefined();
        expect(state.core.players['0'].hand.length).toBe(3);

        const second = await resolveNextLocalAiAction({
            engineConfig,
            state,
            matchId: 'local:test',
            seatControllers: {
                '0': { type: 'local-ai' },
            },
        });

        expect(second).toBeNull();
    });

    it('本地 AI 在手牌偏少时应优先使用教皇税抽牌，而不是直接推进阶段', async () => {
        const random = createQueuedRandom([6]);
        let state = createHeroMatchup('paladin', 'monk')(['0', '1'], random);
        state.sys.phase = 'main2';
        state.core.activePlayerId = '0';
        state.core.players['0'].resources[RESOURCE_IDS.CP] = 3;
        state.core.players['0'].hand = [];

        const first = await resolveNextLocalAiAction({
            engineConfig,
            state,
            matchId: 'local:test',
            seatControllers: {
                '0': { type: 'local-ai' },
            },
        });

        expect(first?.playerId).toBe('0');
        expect(first?.action.kind).toBe('use-passive-ability');
        expect(first?.action.metadata).toMatchObject({
            passiveId: 'tithes',
            actionIndex: 1,
        });

        for (const command of first!.action.commands) {
            state = execCmd(
                state,
                cmd(command.type as CommandInput['type'], first!.playerId, command.payload ?? {}),
                random,
            );
        }

        expect(state.core.players['0'].resources[RESOURCE_IDS.CP]).toBe(0);
        expect(state.core.players['0'].hand.length).toBe(1);

        const second = await resolveNextLocalAiAction({
            engineConfig,
            state,
            matchId: 'local:test',
            seatControllers: {
                '0': { type: 'local-ai' },
            },
        });

        expect(second?.playerId).toBe('0');
        expect(second?.action).toBeTruthy();
        expect(second?.attemptKey).toBeTruthy();
        expect(second?.attemptKey).not.toBe(first?.attemptKey);
    });

    it('不同难度会影响近似动作的最终选择与搜索行为', async () => {
        const state = createSetupWithHand(['card-enlightenment', 'card-boss-generous'], { cp: 0 })(['0', '1'], fixedRandom);
        const matchId = 'probe';

        const easyResolution = await resolveNextLocalAiAction({
            engineConfig,
            state,
            matchId,
            seatControllers: {
                '0': { type: 'local-ai', difficulty: 'easy' },
            },
        });
        const expertResolution = await resolveNextLocalAiAction({
            engineConfig,
            state,
            matchId,
            seatControllers: {
                '0': { type: 'local-ai', difficulty: 'expert' },
            },
        });

        expect(easyResolution?.action.kind).toBe('play-card');
        expect(expertResolution?.action.kind).toBe('play-card');
        expect(easyResolution?.action.metadata).toMatchObject({ cardId: 'card-boss-generous' });
        expect(expertResolution?.action.metadata).toMatchObject({ cardId: 'card-enlightenment' });

        const easyContext = buildAiDecisionContext({
            gameId: 'dicethrone',
            matchId,
            playerId: '0',
            visibleState: state,
            rulesVersion: null,
            decisionBudgetMs: 250,
            source: 'local',
            seatController: { type: 'local-ai', difficulty: 'easy' },
        });
        const expertContext = buildAiDecisionContext({
            gameId: 'dicethrone',
            matchId,
            playerId: '0',
            visibleState: state,
            rulesVersion: null,
            decisionBudgetMs: 250,
            source: 'local',
            seatController: { type: 'local-ai', difficulty: 'expert' },
        });

        const easyDecision = await diceThroneAiRuntime.localPolicies.baseline.decide(easyContext);
        const expertDecision = await diceThroneAiRuntime.localPolicies.baseline.decide(expertContext);
        const easyEvaluations = (easyDecision?.providerMetadata?.evaluations ?? []) as Array<{ searched?: boolean; noiseScore?: number }>;
        const expertEvaluations = (expertDecision?.providerMetadata?.evaluations ?? []) as Array<{ searched?: boolean; noiseScore?: number }>;

        expect(easyEvaluations.some((item) => item.searched)).toBe(false);
        expect(expertEvaluations.some((item) => item.searched)).toBe(true);
        expect(expertEvaluations.every((item) => item.noiseScore === 0)).toBe(true);
    });
});

describe('本地 AI setup 视角切换', () => {
    it('应先保留房主视角，房主选完后切到 AI 座位，AI 准备后回到房主', () => {
        const core = DiceThroneDomain.setup(['0', '1'], fixedRandom);
        const state: MatchState<DiceThroneCore> = {
            core,
            sys: {
                phase: 'setup',
                interaction: { queue: [] },
            } as MatchState<DiceThroneCore>['sys'],
        };

        expect(resolveLocalPregameControlledPlayerId({
            gameId: 'dicethrone',
            state,
            localPlayerId: '0',
            seatControllers: {
                '0': { type: 'human' },
                '1': { type: 'local-ai' },
            },
        })).toBe('0');

        core.selectedCharacters['0'] = 'barbarian';
        expect(resolveLocalPregameControlledPlayerId({
            gameId: 'dicethrone',
            state,
            localPlayerId: '0',
            seatControllers: {
                '0': { type: 'human' },
                '1': { type: 'local-ai' },
            },
        })).toBe('1');

        core.selectedCharacters['1'] = 'monk';
        expect(resolveLocalPregameControlledPlayerId({
            gameId: 'dicethrone',
            state,
            localPlayerId: '0',
            seatControllers: {
                '0': { type: 'human' },
                '1': { type: 'local-ai' },
            },
        })).toBe('1');

        core.readyPlayers['1'] = true;
        expect(resolveLocalPregameControlledPlayerId({
            gameId: 'dicethrone',
            state,
            localPlayerId: '0',
            seatControllers: {
                '0': { type: 'human' },
                '1': { type: 'local-ai' },
            },
        })).toBe('0');
    });
});


// ============================================================================
// 2. REROLL_DIE — 交互上下文中重掷单个骰子
// ============================================================================

describe('REROLL_DIE 交互中重掷骰子', () => {
    it('有 pendingInteraction 时重掷骰子成功', () => {
        const diceValues = [3, 3, 3, 3, 3, 5]; // 第 6 个值用于重掷
        const random = createQueuedRandom(diceValues);

        // 先推进到 offensiveRoll 并掷骰
        let state = createInitializedState(['0', '1'], random);
        state = execCmd(state, cmd('ADVANCE_PHASE', '0'), random);
        state = execCmd(state, cmd('ROLL_DICE', '0'), random);

        const dieBefore = state.core.dice[0].value;
        expect(dieBefore).toBe(3);

        // 注入 pendingInteraction（模拟卡牌效果触发重掷交互）
        injectPendingInteraction(state, {
            id: 'reroll-test',
            playerId: '0',
            sourceCardId: 'test-card',
            type: 'rerollDie',
            titleKey: 'test',
            selectCount: 1,
            selected: [],
        });

        // 重掷 die 0
        state = execCmd(state, cmd('REROLL_DIE', '0', { dieId: 0 }), random);
        expect(state.core.dice[0].value).toBe(5);
    });

    it('无 pendingInteraction 时重掷失败', () => {
        const diceValues = [3, 3, 3, 3, 3];
        const random = createQueuedRandom(diceValues);

        let state = createInitializedState(['0', '1'], random);
        state = execCmd(state, cmd('ADVANCE_PHASE', '0'), random);
        state = execCmd(state, cmd('ROLL_DICE', '0'), random);

        const result = tryCmd(state, cmd('REROLL_DIE', '0', { dieId: 0 }), random);
        expect(result.success).toBe(false);
    });

    it('非交互玩家重掷失败', () => {
        const diceValues = [3, 3, 3, 3, 3];
        const random = createQueuedRandom(diceValues);

        let state = createInitializedState(['0', '1'], random);
        state = execCmd(state, cmd('ADVANCE_PHASE', '0'), random);
        state = execCmd(state, cmd('ROLL_DICE', '0'), random);

        injectPendingInteraction(state, {
            id: 'reroll-test',
            playerId: '0',
            sourceCardId: 'test-card',
            type: 'rerollDie',
            titleKey: 'test',
            selectCount: 1,
            selected: [],
        });

        // 玩家 1 尝试重掷
        const result = tryCmd(state, cmd('REROLL_DIE', '1', { dieId: 0 }), random);
        expect(result.success).toBe(false);
    });

    it('不存在的骰子 ID 重掷失败', () => {
        const diceValues = [3, 3, 3, 3, 3];
        const random = createQueuedRandom(diceValues);

        let state = createInitializedState(['0', '1'], random);
        state = execCmd(state, cmd('ADVANCE_PHASE', '0'), random);
        state = execCmd(state, cmd('ROLL_DICE', '0'), random);

        injectPendingInteraction(state, {
            id: 'reroll-test',
            playerId: '0',
            sourceCardId: 'test-card',
            type: 'rerollDie',
            titleKey: 'test',
            selectCount: 1,
            selected: [],
        });

        const result = tryCmd(state, cmd('REROLL_DIE', '0', { dieId: 99 }), random);
        expect(result.success).toBe(false);
    });
});


// ============================================================================
// 3. RESOLVE_CHOICE — 选择交互解决
//
// 注意：RESOLVE_CHOICE 在 execute 层是 no-op（break），validate 始终返回 ok()。
// 实际选择流程通过 SYS_INTERACTION_RESPOND 命令走 InteractionSystem。
// 这里测试 RESOLVE_CHOICE 命令本身的通过性，以及通过 GTR 测试完整选择流程。
// ============================================================================

describe('RESOLVE_CHOICE 选择交互', () => {
    it('RESOLVE_CHOICE 命令始终通过验证（no-op）', () => {
        const state = createInitializedState(['0', '1'], fixedRandom);
        const result = tryCmd(state, cmd('RESOLVE_CHOICE', '0', { statusId: 'knockdown' }));
        // validate 始终返回 ok()，execute 是 break（no-op）
        expect(result.success).toBe(true);
    });

    it('完整选择流程已在 monk-coverage.test.ts 中覆盖', () => {
        // RESOLVE_CHOICE 在 execute 层是 no-op（break），validate 始终返回 ok()。
        // 实际选择流程通过 SYS_INTERACTION_RESPOND 走 InteractionSystem：
        //   CHOICE_REQUESTED 事件 → InteractionSystem 队列 simple-choice →
        //   SYS_INTERACTION_RESPOND → SYS_INTERACTION_RESOLVED → CHOICE_RESOLVED
        // 完整选择流程（禅忘二选一等）已在 monk-coverage.test.ts 中通过 GTR 覆盖。
        // 这里仅验证 RESOLVE_CHOICE 命令本身的通过性。
        const state = createInitializedState(['0', '1'], fixedRandom);

        // 在任意阶段都能通过验证（因为 validate 始终返回 ok）
        const result1 = tryCmd(state, cmd('RESOLVE_CHOICE', '0', { statusId: 'knockdown' }));
        expect(result1.success).toBe(true);

        // 不同玩家也能通过
        const result2 = tryCmd(state, cmd('RESOLVE_CHOICE', '1', { statusId: 'poison' }));
        expect(result2.success).toBe(true);
    });
});
