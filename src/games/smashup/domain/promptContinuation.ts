/**
 * 大杀四方 - Prompt 继续执行注册表
 *
 * 当能力需要目标选择时：
 * 1. 能力执行器生成 CHOICE_REQUESTED 事件
 * 2. 事件系统创建 Interaction，continuationContext 嵌入 descriptor.data
 * 3. 玩家选择后，SYS_INTERACTION_RESOLVED 事件触发
 * 4. 事件系统从 interactionData.continuationContext 提取 abilityId，调用本注册表的继续函数
 * 5. 继续函数生成后续事件
 */

import type { PlayerId, RandomFn } from '../../../engine/types';
import type { SmashUpCore, SmashUpEvent } from './types';

// ============================================================================
// 继续函数类型
// ============================================================================

/** 交互继续执行上下文 */
export interface PromptContinuationCtx {
    state: SmashUpCore;
    playerId: PlayerId;
    /** 交互解决后的选择值 */
    selectedValue: unknown;
    /** 能力特定上下文（来源：interactionData.continuationContext.extra） */
    data?: Record<string, unknown>;
    random: RandomFn;
    now: number;
}

/** 交互继续执行函数 */
export type PromptContinuationFn = (ctx: PromptContinuationCtx) => SmashUpEvent[];

// ============================================================================
// 注册表
// ============================================================================

const continuationRegistry = new Map<string, PromptContinuationFn>();

/** 注册交互继续函数 */
export function registerPromptContinuation(
    abilityId: string,
    fn: PromptContinuationFn
): void {
    continuationRegistry.set(abilityId, fn);
}

/** 解析交互继续函数 */
export function resolvePromptContinuation(
    abilityId: string
): PromptContinuationFn | undefined {
    return continuationRegistry.get(abilityId);
}

/** 清空注册表（测试用） */
export function clearPromptContinuationRegistry(): void {
    continuationRegistry.clear();
}
