/**
 * 大杀四方 - 专用事件处理系统
 * 
 * 处理领域事件到系统状态的映射：
 * - 监听 SYS_INTERACTION_RESOLVED 事件 → 从 sourceId 查找处理函数 → 生成后续领域事件
 * - 对交互解决产生的事件应用保护过滤和触发链（与 execute() 后处理对齐）
 */

import type { GameEvent } from '../../../engine/types';
import type { EngineSystem, HookResult } from '../../../engine/systems/types';
import { INTERACTION_EVENTS, resolveInteraction } from '../../../engine/systems/InteractionSystem';
import type { SmashUpCore, SmashUpEvent } from './types';
import { getInteractionHandler } from './abilityInteractionHandlers';
import { SU_EVENT_TYPES } from './events';
import { maybeResolveReactionQueue } from './reactionQueue';
import {
    getDeferredPostScoringEvents,
    getScoringSession,
    mergeDeferredPostScoringCompatibility,
    mirrorDeferredPostScoringToFirstInteraction,
    updateScoringSession,
} from './scoringSession';

// ============================================================================
// SmashUp 事件处理系统
// ============================================================================

/**
 * 创建 SmashUp 事件处理系统
 * 
 * 职责：
 * - 监听 SYS_INTERACTION_RESOLVED 事件 → 从 sourceId 查找处理函数 → 生成后续事件
 */
export function createSmashUpEventSystem(): EngineSystem<SmashUpCore> {
    return {
        id: 'smashup-event-system',
        name: '大杀四方事件处理',
        priority: 24, // 必须在 FlowSystem(25) 之前执行，确保交互处理器先于 onAutoContinueCheck 运行

        afterEvents: ({ state, events, random }): HookResult<SmashUpCore> | void => {
            let newState = state;
            const nextEvents: GameEvent[] = [];
            const pendingStartTurnInteractionReduceFlag = '_waitForStartTurnInteractionReduce';
            let latestTimestamp = 0;

            const scoringSession = getScoringSession(newState);
            if (scoringSession?.currentStep === 'awaiting-post-reduce') {
                newState = updateScoringSession(newState, (session) => session ? {
                    ...session,
                    currentStep: 'idle',
                } : session);
            }

            if ((newState.sys as any)[pendingStartTurnInteractionReduceFlag]) {
                newState = {
                    ...newState,
                    sys: {
                        ...newState.sys,
                        [pendingStartTurnInteractionReduceFlag]: undefined,
                    } as typeof newState.sys,
                };
            }

            for (const event of events) {
                // 监听 SYS_INTERACTION_RESOLVED → 从 sourceId 查找处理函数 → 生成后续事件
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
                    latestTimestamp = eventTimestamp;


                    if (payload.sourceId) {
                        const handler = getInteractionHandler(payload.sourceId);
                        if (handler) {
                            const startTurnWindowActive =
                                newState.sys.phase === 'startTurn'
                                || Boolean((newState.sys as any)._smashupStartTurnWindowActive);

                            const result = handler(
                                newState,
                                payload.playerId,
                                payload.value,
                                payload.interactionData,
                                random,
                                eventTimestamp
                            );

                            if (result) {
                                // 【关键修复】检查交互处理器是否创建了新交互
                                // 如果没有创建新交互（如返回 ABILITY_FEEDBACK），则解决当前交互
                                const hadInteractionBefore = !!newState.sys.interaction?.current;
                                const hasInteractionAfter = !!result.state.sys.interaction?.current || (result.state.sys.interaction?.queue?.length ?? 0) > (newState.sys.interaction?.queue?.length ?? 0);

                                let emittedEvents = [...result.events] as SmashUpEvent[];

                                newState = result.state;
                                newState = mirrorDeferredPostScoringToFirstInteraction(
                                    newState,
                                    getDeferredPostScoringEvents(newState, payload.interactionData),
                                );
                                
                                // 如果 handler 没有创建新交互，则解决当前交互
                                if (hadInteractionBefore && !hasInteractionAfter) {
                                    newState = resolveInteraction(newState);
                                }

                                if (
                                    emittedEvents.length === 0
                                    && !getScoringSession(newState)
                                    && !newState.sys.interaction?.current
                                    && (newState.sys.interaction?.queue?.length ?? 0) === 0
                                ) {
                                    const compatibility = mergeDeferredPostScoringCompatibility(
                                        newState,
                                        payload.interactionData,
                                        eventTimestamp,
                                    );
                                    if (compatibility) {
                                        newState = compatibility.state;
                                        emittedEvents = compatibility.events;
                                    }
                                }
                                
                                // 交互处理器返回的领域事件统一交给 pipeline.reduceEventsToCore 做一次拦截与 reduce。
                                // 这里如果手动先调用 interceptEvent，会让同一批事件在轮末 reduce 时再次被拦截，
                                // 导致像 Cthulhu 这类“交互返回 MADNESS_DRAWN，再由拦截器补标记”的链路被重复处理。
                                nextEvents.push(...emittedEvents);

                                const producedMinionPlayed = emittedEvents.some(
                                    (resultEvent) => resultEvent.type === SU_EVENT_TYPES.MINION_PLAYED,
                                );
                                if (startTurnWindowActive && producedMinionPlayed) {
                                    newState = {
                                        ...newState,
                                        sys: {
                                            ...newState.sys,
                                            [pendingStartTurnInteractionReduceFlag]: true,
                                        } as typeof newState.sys,
                                    };
                                }
                            }
                        }
                    }
                }
            }

            if (!newState.sys.interaction?.current) {
                const reactionQueueResult = maybeResolveReactionQueue(newState as { core: SmashUpCore; sys: any }, random, latestTimestamp);
                if (reactionQueueResult) {
                    newState = reactionQueueResult.state;
                    nextEvents.push(...reactionQueueResult.events as GameEvent[]);
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
