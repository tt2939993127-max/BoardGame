/**
 * 教程端到端测试（含 TutorialSystem 活跃状态）
 *
 * 通过 SYS_TUTORIAL_START 启动教程，TutorialSystem 全程参与命令拦截和步骤推进。
 * 模拟客户端 TutorialContext 的行为：执行 AI 操作 → consumeAi → 手动推进。
 *
 * 教程流程：
 *   setup → intro系列 → 首次攻击 → 对手防御 → 卡牌介绍 → AI回合（掌击+攻击）
 *   → 击倒说明 → 悟道（获取净化）→ 净化移除击倒 → 静心 → 清修升级 → 结束
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { DiceThroneDomain } from '../domain';
import { testSystems, createQueuedRandom } from './test-utils';
import { executePipeline, createInitialSystemState } from '../../../engine/pipeline';
import type { DiceThroneCore, DiceThroneCommand } from '../domain/types';
import type { MatchState, PlayerId, TutorialAiAction } from '../../../engine/types';
import { TOKEN_IDS, STATUS_IDS } from '../domain/ids';
import { RESOURCE_IDS } from '../domain/resources';
import { INITIAL_CP } from '../domain/types';
import { DiceThroneTutorial } from '../tutorial';
import { TUTORIAL_COMMANDS } from '../../../engine/systems/TutorialSystem';

describe('教程端到端测试（TutorialSystem 活跃）', () => {
    const playerIds: PlayerId[] = ['0', '1'];
    const manifest = DiceThroneTutorial;

    beforeEach(() => {
        vi.useFakeTimers();
        vi.setSystemTime(new Date('2025-01-01T00:00:00Z'));
        (globalThis as any).__BG_GAME_MODE__ = 'tutorial';
    });

    afterEach(() => {
        vi.useRealTimers();
        delete (globalThis as any).__BG_GAME_MODE__;
    });

    const pipelineConfig = {
        domain: DiceThroneDomain,
        systems: testSystems,
    };

    const exec = (
        state: MatchState<DiceThroneCore>,
        type: string,
        playerId: PlayerId,
        payload: Record<string, unknown> = {},
        label = '',
    ): MatchState<DiceThroneCore> => {
        const command = { type, playerId, payload, timestamp: Date.now() } as DiceThroneCommand;
        const result = executePipeline(pipelineConfig, state, command, random, playerIds);
        if (!result.success) {
            const t = state.sys.tutorial;
            const desc = label ? ` [${label}]` : '';
            throw new Error(
                `Command ${type} (p${playerId})${desc} failed: ${result.error}\n` +
                `  phase=${state.sys.phase} active=${state.core.activePlayerId}\n` +
                `  tutorialStep=${t.step?.id ?? 'none'} stepIndex=${t.stepIndex} active=${t.active}`
            );
        }
        return result.state as MatchState<DiceThroneCore>;
    };

    const tryExec = (
        state: MatchState<DiceThroneCore>,
        type: string,
        playerId: PlayerId,
        payload: Record<string, unknown> = {},
    ): { state: MatchState<DiceThroneCore>; success: boolean; error?: string } => {
        const command = { type, playerId, payload, timestamp: Date.now() } as DiceThroneCommand;
        const result = executePipeline(pipelineConfig, state, command, random, playerIds);
        if (result.success) {
            return { state: result.state as MatchState<DiceThroneCore>, success: true };
        }
        return { state, success: false, error: result.error };
    };

    /** 模拟客户端消费 AI 操作 */
    const consumeAiActions = (
        state: MatchState<DiceThroneCore>,
        stepId: string,
        aiActions: TutorialAiAction[],
        label: string,
    ): MatchState<DiceThroneCore> => {
        let s = state;
        for (let i = 0; i < aiActions.length; i++) {
            const action = aiActions[i];
            const pid = action.playerId ?? s.core.activePlayerId;
            const result = tryExec(s, action.commandType, pid as PlayerId, action.payload as Record<string, unknown>);
            if (!result.success) {
                throw new Error(
                    `AI action[${i}] ${action.commandType} (p${pid}) in step [${label}] failed: ${result.error}\n` +
                    `  phase=${s.sys.phase} active=${s.core.activePlayerId}\n` +
                    `  tutorialStep=${s.sys.tutorial.step?.id ?? 'none'} stepIndex=${s.sys.tutorial.stepIndex}`
                );
            }
            s = result.state;
        }
        s = exec(s, TUTORIAL_COMMANDS.AI_CONSUMED, '0', { stepId }, `${label}: consumeAi`);
        return s;
    };

    /** 手动推进教程步骤 */
    const nextStep = (
        state: MatchState<DiceThroneCore>,
        label: string,
    ): MatchState<DiceThroneCore> => {
        return exec(state, TUTORIAL_COMMANDS.NEXT, '0', { reason: 'manual' }, label);
    };

    const random = createQueuedRandom(manifest.randomPolicy!.values!);

    // 教程测试已适配新的交互系统（使用 SYS_INTERACTION_RESPOND）
    it('完整教程流程', () => {
        let s: MatchState<DiceThroneCore> = {
            core: DiceThroneDomain.setup(playerIds, random),
            sys: createInitialSystemState(playerIds, testSystems, undefined),
        };

        // 启动教程
        s = exec(s, TUTORIAL_COMMANDS.START, '0', { manifest }, 'tutorial start');
        expect(s.sys.tutorial.active).toBe(true);
        expect(s.sys.tutorial.step?.id).toBe('setup');

        // ============================================================
        // 段 A — 初始化 + UI 介绍
        // ============================================================
        const setupStep = manifest.steps[0];
        s = consumeAiActions(s, 'setup', setupStep.aiActions!, 'A: setup');
        expect(s.sys.phase).toBe('main1');
        expect(s.core.activePlayerId).toBe('0');

        // 介绍步骤：手动跳过
        const introSteps = ['intro', 'stats', 'phases', 'player-board', 'tip-board', 'hand', 'discard', 'status-tokens'];
        for (const expectedId of introSteps) {
            expect(s.sys.tutorial.step?.id).toBe(expectedId);
            s = nextStep(s, `A: skip ${expectedId}`);
        }
        expect(s.sys.tutorial.step?.id).toBe('advance');

        // ============================================================
        // 段 B — 首次攻击 (Turn 1, P0)
        // ============================================================
        // 验证初始 CP（首回合先手跳过 income，CP = INITIAL_CP）
        const cpBefore = s.core.players['0'].resources[RESOURCE_IDS.CP] ?? 0;
        expect(cpBefore).toBe(INITIAL_CP);

        s = exec(s, 'ADVANCE_PHASE', '0', {}, 'B: main1→offensive');
        expect(s.sys.phase).toBe('offensiveRoll');
        expect(s.sys.tutorial.step?.id).toBe('dice-tray');

        s = nextStep(s, 'B: skip dice-tray');
        expect(s.sys.tutorial.step?.id).toBe('dice-roll');

        s = exec(s, 'ROLL_DICE', '0', {}, 'B: roll');
        expect(s.sys.tutorial.step?.id).toBe('play-six');

        s = exec(s, 'PLAY_CARD', '0', { cardId: 'card-play-six' }, 'B: play-six');
        // card-play-six cpCost=1 → CP 应从 INITIAL_CP 减到 INITIAL_CP-1
        expect(s.core.players['0'].resources[RESOURCE_IDS.CP]).toBe(INITIAL_CP - 1);
        
        // 新交互系统：card-play-six 创建 multistep-choice 交互（骰子修改）
        const sysCurrentInteraction = s.sys.interaction.current;
        expect(sysCurrentInteraction).toBeDefined();
        expect(sysCurrentInteraction?.kind).toBe('multistep-choice');
        
        // 使用 MODIFY_DIE 命令响应 multistep-choice（将第 0 颗骰子改为 6）
        // card-play-six 允许将1颗骰子改为6（set 模式，maxSteps=1，自动确认）
        s = exec(s, 'MODIFY_DIE', '0', { dieId: 0, newValue: 6 }, 'B: modify-die-to-6');
        // set 模式 maxSteps=1：MODIFY_DIE 后 MultistepChoiceSystem 自动确认，交互已完成
        expect(s.sys.tutorial.step?.id).toBe('dice-confirm');

        s = exec(s, 'CONFIRM_ROLL', '0', {}, 'B: confirm');
        expect(s.sys.tutorial.step?.id).toBe('abilities');

        s = exec(s, 'SELECT_ABILITY', '0', { abilityId: 'fist-technique-4' }, 'B: select-ability');
        expect(s.sys.tutorial.step?.id).toBe('resolve-attack');

        s = exec(s, 'ADVANCE_PHASE', '0', {}, 'B: offensive→defensive');
        expect(s.sys.phase).toBe('defensiveRoll');
        expect(s.sys.tutorial.step?.id).toBe('opponent-defense');

        // opponent-defense: AI 防御掷骰
        const opponentDefenseStep = s.sys.tutorial.step!;
        s = consumeAiActions(s, 'opponent-defense', opponentDefenseStep.aiActions!, 'B: opponent-defense');
        expect(s.sys.phase).toBe('main2');
        expect(s.sys.tutorial.step?.id).toBe('draw-for-discard');

        // ============================================================
        // 段 C — 弃牌教学
        // ============================================================
        // draw-for-discard：AI 自动抽 4 张牌，手牌从 3 张变 7 张
        const drawForDiscardStep = s.sys.tutorial.step!;
        expect(drawForDiscardStep.id).toBe('draw-for-discard');
        const drawForDiscardManifestStep = manifest.steps.find(step => step.id === 'draw-for-discard')!;
        s = consumeAiActions(s, 'draw-for-discard', drawForDiscardManifestStep.aiActions!, 'C: draw-for-discard');
        expect(s.core.players['0'].hand.length).toBe(7);
        expect(s.sys.tutorial.step?.id).toBe('discard-card');
        expect(s.sys.tutorial.step?.allowedCommands).toContain('SELL_CARD');

        // 弃掉一张多余的牌（走 SELL_CARD 路径，与 UI 拖拽行为一致）
        s = exec(s, 'SELL_CARD', '0', { cardId: 'card-inner-peace' }, 'C: discard-card');
        expect(s.core.players['0'].hand.length).toBe(6);
        expect(s.sys.tutorial.step?.id).toBe('card-enlightenment');

        // ============================================================
        // 段 C — 卡牌介绍 + AI 回合
        // ============================================================
        s = nextStep(s, 'C: skip card-enlightenment');
        expect(s.sys.tutorial.step?.id).toBe('ai-turn');

        // AI 完整回合：结束P0回合 → AI打掌击+攻击 → AI结束 → P0 main1
        const aiTurnStep = s.sys.tutorial.step!;
        s = consumeAiActions(s, 'ai-turn', aiTurnStep.aiActions!, 'C: ai-turn');
        expect(s.sys.phase).toBe('main1');
        expect(s.core.activePlayerId).toBe('0');
        expect(s.core.players['0'].statusEffects[STATUS_IDS.KNOCKDOWN]).toBe(1);
        expect(s.sys.tutorial.step?.id).toBe('knockdown-explain');

        // ============================================================
        // 段 D — 净化教程（自然游戏流）
        // ============================================================
        s = nextStep(s, 'D: skip knockdown-explain');
        expect(s.sys.tutorial.step?.id).toBe('enlightenment-play');

        // 玩家打出悟道（random=6 → 莲花 → 获得太极+闪避+净化）
        s = exec(s, 'PLAY_CARD', '0', { cardId: 'card-enlightenment' }, 'D: play-enlightenment');
        expect(s.core.players['0'].tokens[TOKEN_IDS.PURIFY]).toBeGreaterThanOrEqual(1);
        expect(s.sys.tutorial.step?.id).toBe('purify-use');

        // 玩家使用净化移除击倒
        s = exec(s, 'USE_PURIFY', '0', { statusId: STATUS_IDS.KNOCKDOWN }, 'D: use-purify');
        expect(s.core.players['0'].statusEffects[STATUS_IDS.KNOCKDOWN] ?? 0).toBe(0);
        expect(s.core.players['0'].tokens[TOKEN_IDS.PURIFY]).toBe(0);

        // ============================================================
        // 段 E — 补充卡牌教学
        // ============================================================
        expect(s.sys.tutorial.step?.id).toBe('inner-peace');

        s = exec(s, 'PLAY_CARD', '0', { cardId: 'card-inner-peace' }, 'E: play-inner-peace');
        expect(s.core.players['0'].tokens[TOKEN_IDS.TAIJI]).toBeGreaterThanOrEqual(2);
        expect(s.sys.tutorial.step?.id).toBe('meditation-2');

        // 验证段 D/E 开始时 CP（经过 income 阶段应有 CP 恢复）
        // Turn 1 P0 打 card-play-six 后 CP=1，经过 Turn 2 P1 回合后 P0 income +1 → CP=2
        const cpBeforeMeditation = s.core.players['0'].resources[RESOURCE_IDS.CP] ?? 0;
        expect(cpBeforeMeditation).toBeGreaterThanOrEqual(2); // 必须 ≥2 才能支付 meditation-2 的费用

        s = exec(s, 'PLAY_CARD', '0', { cardId: 'card-meditation-2' }, 'E: play-meditation-2');
        // card-meditation-2 cpCost=2 → CP 应减少 2
        expect(s.core.players['0'].resources[RESOURCE_IDS.CP]).toBe(cpBeforeMeditation - 2);
        expect(s.core.players['0'].abilityLevels?.['meditation']).toBe(2);
        expect(s.sys.tutorial.step?.id).toBe('finish');

        // 教程完成
        s = nextStep(s, 'E: finish');
        expect(s.sys.tutorial.active).toBe(false);
    });

    it('CP 不足时无法打出 meditation-2（防止教程卡主）', () => {
        let s: MatchState<DiceThroneCore> = {
            core: DiceThroneDomain.setup(playerIds, random),
            sys: createInitialSystemState(playerIds, testSystems, undefined),
        };

        // 启动教程并完成 setup
        s = exec(s, TUTORIAL_COMMANDS.START, '0', { manifest }, 'tutorial start');
        const setupStep = manifest.steps[0];
        s = consumeAiActions(s, 'setup', setupStep.aiActions!, 'setup');

        // 跳过所有介绍步骤到 advance
        const introSteps = ['intro', 'stats', 'phases', 'player-board', 'tip-board', 'hand', 'discard', 'status-tokens'];
        for (const id of introSteps) s = nextStep(s, `skip ${id}`);

        // 段 B：推进到 offensiveRoll，跳过 dice-tray
        s = exec(s, 'ADVANCE_PHASE', '0', {}, 'main1→offensive');
        s = nextStep(s, 'skip dice-tray');

        // 掷骰 → 打 play-six（消耗 1 CP）→ 修改骰子 → 确认 → 选技能 → 推进
        s = exec(s, 'ROLL_DICE', '0', {}, 'roll');
        s = exec(s, 'PLAY_CARD', '0', { cardId: 'card-play-six' }, 'play-six');
        s = exec(s, 'MODIFY_DIE', '0', { dieId: 0, newValue: 6 }, 'modify-die');
        s = exec(s, 'CONFIRM_ROLL', '0', {}, 'confirm');
        s = exec(s, 'SELECT_ABILITY', '0', { abilityId: 'fist-technique-4' }, 'select-ability');
        s = exec(s, 'ADVANCE_PHASE', '0', {}, 'offensive→defensive');

        // AI 防御
        const opponentDefenseStep = s.sys.tutorial.step!;
        s = consumeAiActions(s, 'opponent-defense', opponentDefenseStep.aiActions!, 'opponent-defense');

        // draw-for-discard：AI 抽 4 张牌
        const drawForDiscardStep = s.sys.tutorial.step!;
        expect(drawForDiscardStep.id).toBe('draw-for-discard');
        const drawForDiscardManifestStep = manifest.steps.find(step => step.id === 'draw-for-discard')!;
        s = consumeAiActions(s, 'draw-for-discard', drawForDiscardManifestStep.aiActions!, 'draw-for-discard');
        // 弃牌步骤（走 SELL_CARD 路径，与 UI 拖拽行为一致）
        s = exec(s, 'SELL_CARD', '0', { cardId: 'card-inner-peace' }, 'discard-card');

        // 段 C：跳过卡牌介绍，执行 AI 回合
        s = nextStep(s, 'skip card-enlightenment');
        const aiTurnStep = s.sys.tutorial.step!;
        s = consumeAiActions(s, 'ai-turn', aiTurnStep.aiActions!, 'ai-turn');

        // 此时 P0 应已经过 income 阶段，CP 应恢复到 ≥2
        // Turn 1 P0 打 play-six 后 CP=1，Turn 2 P1 结束后 P0 income +1 → CP=2
        const cpAfterAiTurn = s.core.players['0'].resources[RESOURCE_IDS.CP] ?? 0;
        expect(cpAfterAiTurn).toBeGreaterThanOrEqual(2);

        // 段 D：跳过击倒说明，打悟道，净化
        s = nextStep(s, 'skip knockdown-explain');
        s = exec(s, 'PLAY_CARD', '0', { cardId: 'card-enlightenment' }, 'play-enlightenment');
        s = exec(s, 'USE_PURIFY', '0', { statusId: STATUS_IDS.KNOCKDOWN }, 'use-purify');

        // 段 E：打静心（cost=0），此时 CP 应仍 ≥2
        s = exec(s, 'PLAY_CARD', '0', { cardId: 'card-inner-peace' }, 'play-inner-peace');
        const cpBeforeMeditation2 = s.core.players['0'].resources[RESOURCE_IDS.CP] ?? 0;
        expect(cpBeforeMeditation2).toBeGreaterThanOrEqual(2); // 必须 ≥2，否则 meditation-2 无法打出

        // 验证 meditation-2（cost=2）可以成功打出，不会卡主
        const result = tryExec(s, 'PLAY_CARD', '0', { cardId: 'card-meditation-2' });
        expect(result.success).toBe(true);
        if (result.success) {
            expect(result.state.core.players['0'].resources[RESOURCE_IDS.CP]).toBe(cpBeforeMeditation2 - 2);
        }
    });

    it('meditation-2 步骤白名单约束下 CP 不足时必须能通过卖牌自救', () => {
        // 构造一个 CP=1 的状态，处于 meditation-2 步骤
        // 验证：白名单只允许 PLAY_CARD/SELL_CARD/REORDER_CARD_TO_END
        //   - PLAY_CARD meditation-2（cost=2）→ 应失败（CP 不足）
        //   - SELL_CARD（获得 1 CP）→ 应成功（白名单允许）
        //   - 卖牌后 CP=2，再 PLAY_CARD meditation-2 → 应成功
        let s: MatchState<DiceThroneCore> = {
            core: DiceThroneDomain.setup(playerIds, random),
            sys: createInitialSystemState(playerIds, testSystems, undefined),
        };

        s = exec(s, TUTORIAL_COMMANDS.START, '0', { manifest }, 'tutorial start');
        const setupStep = manifest.steps[0];
        s = consumeAiActions(s, 'setup', setupStep.aiActions!, 'setup');

        const introSteps = ['intro', 'stats', 'phases', 'player-board', 'tip-board', 'hand', 'discard', 'status-tokens'];
        for (const id of introSteps) s = nextStep(s, `skip ${id}`);

        s = exec(s, 'ADVANCE_PHASE', '0', {}, 'main1→offensive');
        s = nextStep(s, 'skip dice-tray');
        s = exec(s, 'ROLL_DICE', '0', {}, 'roll');
        s = exec(s, 'PLAY_CARD', '0', { cardId: 'card-play-six' }, 'play-six');
        s = exec(s, 'MODIFY_DIE', '0', { dieId: 0, newValue: 6 }, 'modify-die');
        s = exec(s, 'CONFIRM_ROLL', '0', {}, 'confirm');
        s = exec(s, 'SELECT_ABILITY', '0', { abilityId: 'fist-technique-4' }, 'select-ability');
        s = exec(s, 'ADVANCE_PHASE', '0', {}, 'offensive→defensive');
        const opponentDefenseStep = s.sys.tutorial.step!;
        s = consumeAiActions(s, 'opponent-defense', opponentDefenseStep.aiActions!, 'opponent-defense');
        // draw-for-discard：AI 抽 4 张牌
        const drawForDiscardStep2 = s.sys.tutorial.step!;
        expect(drawForDiscardStep2.id).toBe('draw-for-discard');
        const drawForDiscardManifestStep2 = manifest.steps.find(step => step.id === 'draw-for-discard')!;
        s = consumeAiActions(s, 'draw-for-discard', drawForDiscardManifestStep2.aiActions!, 'draw-for-discard');
        // 弃牌步骤（走 SELL_CARD 路径，与 UI 拖拽行为一致）
        s = exec(s, 'SELL_CARD', '0', { cardId: 'card-inner-peace' }, 'discard-card');
        s = nextStep(s, 'skip card-enlightenment');
        const aiTurnStep = s.sys.tutorial.step!;
        s = consumeAiActions(s, 'ai-turn', aiTurnStep.aiActions!, 'ai-turn');
        s = nextStep(s, 'skip knockdown-explain');
        s = exec(s, 'PLAY_CARD', '0', { cardId: 'card-enlightenment' }, 'play-enlightenment');
        s = exec(s, 'USE_PURIFY', '0', { statusId: STATUS_IDS.KNOCKDOWN }, 'use-purify');
        s = exec(s, 'PLAY_CARD', '0', { cardId: 'card-inner-peace' }, 'play-inner-peace');

        // 强制将 CP 设为 1，模拟 income 未恢复的最坏情况
        s = {
            ...s,
            core: {
                ...s.core,
                players: {
                    ...s.core.players,
                    '0': {
                        ...s.core.players['0'],
                        resources: { ...s.core.players['0'].resources, [RESOURCE_IDS.CP]: 1 },
                    },
                },
            },
        };

        expect(s.sys.tutorial.step?.id).toBe('meditation-2');
        expect(s.sys.tutorial.step?.allowedCommands).toContain('SELL_CARD');
        expect(s.sys.tutorial.step?.allowedCommands).toContain('PLAY_CARD');

        // CP=1 时 PLAY_CARD meditation-2（cost=2）应被游戏逻辑拒绝
        const failResult = tryExec(s, 'PLAY_CARD', '0', { cardId: 'card-meditation-2' });
        expect(failResult.success).toBe(false); // CP 不足，卡主

        // 白名单允许 SELL_CARD，卖一张牌获得 1 CP（CP: 1→2）
        // 手牌里还有 card-enlightenment，可以卖掉
        const sellResult = tryExec(s, 'SELL_CARD', '0', { cardId: 'card-enlightenment' });
        expect(sellResult.success).toBe(true); // 白名单允许，不会被拦截
        if (sellResult.success) {
            const cpAfterSell = sellResult.state.core.players['0'].resources[RESOURCE_IDS.CP] ?? 0;
            expect(cpAfterSell).toBe(2); // 卖牌后 CP=2

            // 现在 CP=2，meditation-2 可以打出
            const playResult = tryExec(sellResult.state, 'PLAY_CARD', '0', { cardId: 'card-meditation-2' });
            expect(playResult.success).toBe(true); // 不再卡主
        }
    });
});
