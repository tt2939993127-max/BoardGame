/**
 * 响应窗口系统
 * 
 * 允许玩家在特定断点（如攻击结算前）打出响应卡或使用消耗性状态效果。
 * 
 * 核心语义：
 * - 仅当对手有可响应内容时才打开窗口
 * - 窗口打开后，对手可打出响应卡/使用状态，或选择跳过
 * - 主动玩家看到"等待对方响应"
 */

import type { MatchState, PlayerId, GameEvent, ResponseWindowState } from '../types';
import type { EngineSystem, HookResult } from './types';
import { SYSTEM_IDS } from './types';

// ============================================================================
// 响应窗口系统配置
// ============================================================================

export interface ResponseWindowSystemConfig {
    /** 检测玩家是否有可响应内容的函数（由游戏实现注入） */
    hasRespondableContent?: (state: unknown, playerId: PlayerId, windowType: string) => boolean;
}

// ============================================================================
// 响应窗口命令类型
// ============================================================================

export const RESPONSE_WINDOW_COMMANDS = {
    PASS: 'RESPONSE_PASS',
} as const;

// ============================================================================
// 响应窗口事件类型
// ============================================================================

export const RESPONSE_WINDOW_EVENTS = {
    OPENED: 'RESPONSE_WINDOW_OPENED',
    CLOSED: 'RESPONSE_WINDOW_CLOSED',
} as const;

// ============================================================================
// 响应窗口辅助函数
// ============================================================================

/**
 * 创建响应窗口
 */
export function createResponseWindow(
    id: string,
    responderId: PlayerId,
    windowType: 'preResolve' | 'thenBreakpoint',
    sourceAbilityId?: string
): ResponseWindowState['current'] {
    return {
        id,
        responderId,
        windowType,
        sourceAbilityId,
    };
}

/**
 * 打开响应窗口
 */
export function openResponseWindow<TCore>(
    state: MatchState<TCore>,
    window: ResponseWindowState['current']
): MatchState<TCore> {
    if (!window) return state;

    return {
        ...state,
        sys: {
            ...state.sys,
            responseWindow: {
                current: window,
            },
        },
    };
}

/**
 * 关闭响应窗口
 */
export function closeResponseWindow<TCore>(
    state: MatchState<TCore>
): MatchState<TCore> {
    return {
        ...state,
        sys: {
            ...state.sys,
            responseWindow: {
                current: undefined,
            },
        },
    };
}

/**
 * 检查是否有活动的响应窗口
 */
export function hasActiveResponseWindow<TCore>(
    state: MatchState<TCore>
): boolean {
    return !!state.sys.responseWindow?.current;
}

/**
 * 获取当前响应窗口的响应者 ID
 */
export function getResponseWindowResponderId<TCore>(
    state: MatchState<TCore>
): PlayerId | undefined {
    return state.sys.responseWindow?.current?.responderId;
}

// ============================================================================
// 允许在响应窗口期间执行的命令类型
// ============================================================================

const ALLOWED_COMMANDS_DURING_RESPONSE = [
    'RESPONSE_PASS',      // 跳过响应
    'PLAY_CARD',          // 打出卡牌（响应卡）
    'SYS_PROMPT_RESPOND', // Prompt 响应
];

// ============================================================================
// 创建响应窗口系统
// ============================================================================

export function createResponseWindowSystem<TCore>(
    _config: ResponseWindowSystemConfig = {}
): EngineSystem<TCore> {
    return {
        id: SYSTEM_IDS.RESPONSE_WINDOW,
        name: '响应窗口系统',
        priority: 15, // 在 Prompt(20) 之前执行

        setup: (): Partial<{ responseWindow: ResponseWindowState }> => ({
            responseWindow: {
                current: undefined,
            },
        }),

        beforeCommand: ({ state, command }): HookResult<TCore> | void => {
            const currentWindow = state.sys.responseWindow?.current;
            
            // 没有响应窗口，不干预
            if (!currentWindow) {
                return;
            }

            // 处理 RESPONSE_PASS 命令
            if (command.type === RESPONSE_WINDOW_COMMANDS.PASS) {
                // 验证是响应者发出的
                if (command.playerId !== currentWindow.responderId) {
                    return { halt: true, error: '不是你的响应窗口' };
                }

                // 关闭窗口
                const newState = closeResponseWindow(state);

                // 生成关闭事件
                const event: GameEvent = {
                    type: RESPONSE_WINDOW_EVENTS.CLOSED,
                    payload: {
                        windowId: currentWindow.id,
                        passed: true,
                    },
                    timestamp: Date.now(),
                };

                return {
                    halt: false,
                    state: newState,
                    events: [event],
                };
            }

            // 检查命令是否允许在响应窗口期间执行
            if (ALLOWED_COMMANDS_DURING_RESPONSE.includes(command.type)) {
                // 只有响应者可以执行这些命令
                if (command.playerId !== currentWindow.responderId) {
                    return { halt: true, error: '等待对方响应' };
                }
                // 允许执行
                return;
            }

            // 其他命令被阻塞
            return { halt: true, error: '等待对方响应' };
        },

        playerView: (state, _playerId): Partial<{ responseWindow: ResponseWindowState }> => {
            const currentWindow = state.sys.responseWindow?.current;

            // 所有玩家都能看到响应窗口状态（用于 UI 显示）
            return {
                responseWindow: {
                    current: currentWindow,
                },
            };
        },
    };
}
