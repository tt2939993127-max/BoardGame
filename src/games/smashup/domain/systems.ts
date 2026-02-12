/**
 * 大杀四方 - 专用事件处理系统
 * 
 * 处理领域事件到系统状态的映射（单向，非桥接）：
 * 1. CHOICE_REQUESTED → 创建引擎层 Interaction(simple-choice)，continuationContext 嵌入 descriptor.data
 * 2. SYS_INTERACTION_RESOLVED → 从 interactionData 提取 continuationContext，调用继续函数生成后续领域事件
 */

import type { GameEvent } from '../../../engine/types';
import type { EngineSystem, HookResult } from '../../../engine/systems/types';
import { INTERACTION_EVENTS, queueInteraction, createSimpleChoice } from '../../../engine/systems/InteractionSystem';
import type { SmashUpCore, ChoiceRequestedEvent } from './types';
import { SU_EVENTS } from './types';
import { resolvePromptContinuation } from './promptContinuation';

/** continuationContext 在 Interaction data 中的形状 */
interface SmashUpContinuationData {
    abilityId: string;
    playerId: string;
    extra?: Record<string, unknown>;
}

// ============================================================================
// SmashUp 事件处理系统
// ============================================================================

/**
 * 创建 SmashUp 事件处理系统
 * 
 * 职责：
 * - 监听 CHOICE_REQUESTED 事件 → 创建引擎层 Interaction，将 continuationContext 嵌入 descriptor.data
 * - 监听 SYS_INTERACTION_RESOLVED 事件 → 从 interactionData 提取 continuationContext → 调用继续函数 → 生成后续事件
 */
export function createSmashUpEventSystem(): EngineSystem<SmashUpCore> {
    return {
        id: 'smashup-event-system',
        name: '大杀四方事件处理',
        priority: 50, // 在 InteractionSystem(20) 之后执行

        afterEvents: ({ state, events, random }): HookResult<SmashUpCore> | void => {
            let newState = state;
            const nextEvents: GameEvent[] = [];

            for (const event of events) {
                // 1. 监听 CHOICE_REQUESTED → 创建引擎层 Interaction
                if (event.type === SU_EVENTS.CHOICE_REQUESTED) {
                    const payload = (event as ChoiceRequestedEvent).payload;
                    const eventTimestamp = typeof event.timestamp === 'number' ? event.timestamp : 0;

                    const { abilityId, playerId, promptConfig, continuationContext, targetPlayerId } = payload;

                    // 支持 targetPlayerId：能力可指定由其他玩家做选择（如 shoggoth 让对手选择）
                    const promptPlayerId = targetPlayerId || playerId;

                    const interaction = createSimpleChoice(
                        `su-${abilityId}-${eventTimestamp}`,
                        promptPlayerId,
                        promptConfig.title,
                        promptConfig.options,
                        abilityId, // sourceId
                        undefined,
                        promptConfig.multi
                    );

                    // 扩展 interaction.data 以携带 continuationContext
                    const extendedInteraction = {
                        ...interaction,
                        data: {
                            ...(interaction.data as Record<string, unknown>),
                            continuationContext: {
                                abilityId,
                                playerId,
                                extra: continuationContext,
                            } satisfies SmashUpContinuationData,
                        },
                    };

                    newState = queueInteraction(newState, extendedInteraction);
                }

                // 2. 监听 SYS_INTERACTION_RESOLVED → 从 interactionData 提取 continuationContext → 调用继续函数
                if (event.type === INTERACTION_EVENTS.RESOLVED) {
                    const payload = event.payload as {
                        interactionId: string;
                        playerId: string;
                        optionId: string | null;
                        value: unknown;
                        sourceId?: string;
                        interactionData?: Record<string, unknown>;
                    };
                    const eventTimestamp = typeof event.timestamp === 'number' ? event.timestamp : 0;

                    const contCtx = payload.interactionData?.continuationContext as SmashUpContinuationData | undefined;
                    if (contCtx) {
                        const continueFn = resolvePromptContinuation(contCtx.abilityId);
                        if (continueFn) {
                            const continuationEvents = continueFn({
                                state: newState.core,
                                playerId: contCtx.playerId,
                                selectedValue: payload.value,
                                data: contCtx.extra,
                                random,
                                now: eventTimestamp,
                            });
                            nextEvents.push(...continuationEvents);
                        }
                    }
                }
            }

            if (newState !== state || nextEvents.length > 0) {
                return {
                    state: newState,
                    events: nextEvents.length > 0 ? nextEvents : undefined,
                };
            }
        },
    };
}
