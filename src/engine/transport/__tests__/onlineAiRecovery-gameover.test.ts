/**
 * 测试：游戏结束后 AI 恢复机制应该停止
 * 
 * Bug: 当 AI 对战获胜后，游戏无法正常结束
 * Root Cause: resolveForceEndTurnForStalledAi 没有检查 state.sys.gameover
 * Fix: 在函数开头添加游戏结束检查，如果游戏已结束则返回 null
 */

import { describe, it, expect } from 'vitest';
import { resolveForceEndTurnForStalledAi, resolveForceAdvancePhaseAfterRecovery } from '../onlineAiRecovery';
import type { MatchState } from '../../types';
import type { AiSeatController } from '../../ai';

describe('onlineAiRecovery - 游戏结束检查', () => {
    it('游戏结束后应该返回 null，不再尝试强制推进 AI', () => {
        // 构造一个游戏已结束的状态
        const sharedState: MatchState<unknown> = {
            core: {
                currentPlayerId: '1', // AI 玩家
                phase: 'end',
            },
            sys: {
                // 游戏已结束
                gameover: {
                    winner: '0',
                },
                interaction: {
                    current: null,
                    isBlocked: false,
                },
            },
        };

        const seatControllers: Record<string, AiSeatController> = {
            '0': { type: 'human' },
            '1': { type: 'local-ai', policyId: 'baseline' },
        };

        // 调用函数
        const result = resolveForceEndTurnForStalledAi({
            sharedState,
            seatControllers,
            seatStates: {},
        });

        // 验证：应该返回 null，不再尝试强制推进
        expect(result).toBeNull();
    });

    it('游戏未结束时应该正常返回强制推进方案', () => {
        // 构造一个游戏未结束的状态
        const sharedState: MatchState<unknown> = {
            core: {
                activePlayerId: '1', // AI 玩家（使用 activePlayerId 而不是 currentPlayerId）
                phase: 'play',
            },
            sys: {
                // 游戏未结束
                gameover: undefined,
                interaction: {
                    current: null,
                    isBlocked: false,
                },
            },
        };

        const seatControllers: Record<string, AiSeatController> = {
            '0': { type: 'human' },
            '1': { type: 'local-ai', policyId: 'baseline' },
        };

        // 调用函数
        const result = resolveForceEndTurnForStalledAi({
            sharedState,
            seatControllers,
            seatStates: {},
        });

        // 验证：应该返回强制推进方案
        expect(result).not.toBeNull();
        expect(result?.playerId).toBe('1');
        expect(result?.reason).toBe('active-turn');
    });

    it('游戏结束后即使有交互也应该返回 null', () => {
        // 构造一个游戏已结束且有交互的状态
        const sharedState: MatchState<unknown> = {
            core: {
                currentPlayerId: '1', // AI 玩家
                phase: 'ability',
            },
            sys: {
                // 游戏已结束
                gameover: {
                    winner: '0',
                },
                interaction: {
                    current: {
                        id: 'test-interaction',
                        playerId: '1',
                        kind: 'simple-choice',
                        data: {
                            options: [
                                { id: 'option1', label: '选项1' },
                            ],
                        },
                    },
                    isBlocked: false,
                },
            },
        };

        const seatControllers: Record<string, AiSeatController> = {
            '0': { type: 'human' },
            '1': { type: 'local-ai', policyId: 'baseline' },
        };

        // 调用函数
        const result = resolveForceEndTurnForStalledAi({
            sharedState,
            seatControllers,
            seatStates: {},
        });

        // 验证：应该返回 null，不再尝试处理交互
        expect(result).toBeNull();
    });

    it('游戏结束后即使有响应窗口也应该返回 null', () => {
        // 构造一个游戏已结束且有响应窗口的状态
        const sharedState: MatchState<unknown> = {
            core: {
                currentPlayerId: '0',
                phase: 'play',
            },
            sys: {
                // 游戏已结束
                gameover: {
                    winner: '0',
                },
                interaction: {
                    current: null,
                    isBlocked: false,
                },
                responseWindow: {
                    current: {
                        responderQueue: ['1'],
                        currentResponderIndex: 0,
                    },
                },
            },
        };

        const seatControllers: Record<string, AiSeatController> = {
            '0': { type: 'human' },
            '1': { type: 'local-ai', policyId: 'baseline' },
        };

        // 调用函数
        const result = resolveForceEndTurnForStalledAi({
            sharedState,
            seatControllers,
            seatStates: {},
        });

        // 验证：应该返回 null，不再尝试处理响应窗口
        expect(result).toBeNull();
    });
});


describe('resolveForceAdvancePhaseAfterRecovery - 游戏结束检查', () => {
    it('游戏结束后应该返回 null，不再尝试推进阶段', () => {
        // 构造一个游戏已结束的状态
        const authoritativeState: MatchState<unknown> = {
            core: {
                activePlayerId: '1', // AI 玩家
                phase: 'end',
            },
            sys: {
                // 游戏已结束
                gameover: {
                    winner: '0',
                },
                interaction: {
                    current: null,
                    isBlocked: false,
                },
            },
        };

        const seatControllers: Record<string, AiSeatController> = {
            '0': { type: 'human' },
            '1': { type: 'local-ai', policyId: 'baseline' },
        };

        // 调用函数
        const result = resolveForceAdvancePhaseAfterRecovery({
            authoritativeState,
            seatControllers,
            playerId: '1',
        });

        // 验证：应该返回 null，不再尝试推进阶段
        expect(result).toBeNull();
    });

    it('游戏未结束时应该正常返回推进阶段方案', () => {
        // 构造一个游戏未结束的状态
        const authoritativeState: MatchState<unknown> = {
            core: {
                activePlayerId: '1', // AI 玩家
                phase: 'play',
            },
            sys: {
                // 游戏未结束
                gameover: undefined,
                interaction: {
                    current: null,
                    isBlocked: false,
                },
            },
        };

        const seatControllers: Record<string, AiSeatController> = {
            '0': { type: 'human' },
            '1': { type: 'local-ai', policyId: 'baseline' },
        };

        // 调用函数
        const result = resolveForceAdvancePhaseAfterRecovery({
            authoritativeState,
            seatControllers,
            playerId: '1',
        });

        // 验证：应该返回推进阶段方案
        expect(result).not.toBeNull();
        expect(result?.playerId).toBe('1');
        expect(result?.action.commands[0]?.type).toBe('ADVANCE_PHASE');
    });
});
