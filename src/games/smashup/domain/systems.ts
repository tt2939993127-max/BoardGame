/**
 * 大杀四方 - 专用事件处理系统
 * 
 * 处理领域事件到系统状态的映射：
 * - 监听 SYS_INTERACTION_RESOLVED 事件 → 从 sourceId 查找处理函数 → 生成后续领域事件
 * - 对交互解决产生的事件应用保护过滤和触发链（与 execute() 后处理对齐）
 */

import type { GameEvent, MatchState } from '../../../engine/types';
import type { EngineSystem, HookResult } from '../../../engine/systems/types';
import { createSimpleChoice, INTERACTION_EVENTS, queueInteraction, resolveInteraction } from '../../../engine/systems/InteractionSystem';
import type { SmashUpCore, SmashUpEvent } from './types';
import { getInteractionHandler } from './abilityInteractionHandlers';
import { addPowerCounter } from './abilityHelpers';
import { SU_EVENT_TYPES } from './events';
import { SU_EVENTS } from './events';
import { maybeResolveReactionQueue } from './reactionQueue';
import {
    getDeferredPostScoringEvents,
    getScoringSession,
    mergeDeferredPostScoringCompatibility,
    mirrorDeferredPostScoringToFirstInteraction,
    updateScoringSession,
} from './scoringSession';
import { postProcessSystemEvents } from './index';
import { getCardDef } from '../data/cards';

const BODY_SHOP_PENDING_DISTRIBUTIONS_KEY = '_pendingBodyShopDistributions';

interface BodyShopPendingDistribution {
    playerId: string;
    targetMinionUid: string;
    totalCounters: number;
}

function getPendingBodyShopDistributions(state: { sys: Record<string, unknown> }): BodyShopPendingDistribution[] {
    const raw = state.sys[BODY_SHOP_PENDING_DISTRIBUTIONS_KEY];
    return Array.isArray(raw) ? raw as BodyShopPendingDistribution[] : [];
}

function setPendingBodyShopDistributions(
    state: MatchState<SmashUpCore>,
    items: BodyShopPendingDistribution[],
): MatchState<SmashUpCore> {
    return {
        ...state,
        sys: {
            ...state.sys,
            [BODY_SHOP_PENDING_DISTRIBUTIONS_KEY]: items.length > 0 ? items : undefined,
        } as typeof state.sys,
    };
}

function materializeBodyShopDistribution(
    state: MatchState<SmashUpCore>,
    pending: BodyShopPendingDistribution,
    timestamp: number,
): { state: MatchState<SmashUpCore>; events: SmashUpEvent[] } {
    const candidates: { uid: string; defId: string; baseIndex: number; label: string }[] = [];
    for (let baseIndex = 0; baseIndex < state.core.bases.length; baseIndex++) {
        for (const minion of state.core.bases[baseIndex].minions) {
            if (minion.controller !== pending.playerId) continue;
            if (minion.uid === pending.targetMinionUid) continue;
            const def = getCardDef(minion.defId);
            candidates.push({
                uid: minion.uid,
                defId: minion.defId,
                baseIndex,
                label: def?.name ?? minion.defId,
            });
        }
    }

    if (candidates.length === 0) {
        return { state, events: [] };
    }

    if (candidates.length === 1) {
        return {
            state,
            events: [addPowerCounter(candidates[0].uid, candidates[0].baseIndex, pending.totalCounters, 'frankenstein_body_shop', timestamp)],
        };
    }

    const options = candidates.map((candidate, index) => ({
        id: `minion-${index}`,
        label: candidate.label,
        value: {
            minionUid: candidate.uid,
            minionDefId: candidate.defId,
            baseIndex: candidate.baseIndex,
            remaining: pending.totalCounters,
        },
        _source: 'field' as const,
        displayMode: 'card' as const,
    }));

    const interaction = createSimpleChoice(
        `frankenstein_body_shop_distribute_${timestamp}`,
        pending.playerId,
        `选择随从放置+1指示物（剩余 ${pending.totalCounters} 个）`,
        options,
        { sourceId: 'frankenstein_body_shop_distribute', targetType: 'minion' },
    );

    return {
        state: queueInteraction(state, interaction),
        events: [],
    };
}

function reconcilePendingBodyShopDistributions(
    state: MatchState<SmashUpCore>,
    events: readonly GameEvent[],
    fallbackTimestamp: number,
): { state: MatchState<SmashUpCore>; events: SmashUpEvent[] } {
    const pending = getPendingBodyShopDistributions(state);
    if (pending.length === 0) {
        return { state, events: [] };
    }

    let nextState = state;
    const remaining: BodyShopPendingDistribution[] = [];
    const emitted: SmashUpEvent[] = [];

    for (const item of pending) {
        const matchedDestroy = events.find((event) =>
            event.type === SU_EVENTS.MINION_DESTROYED
            && (event as any).payload?.minionUid === item.targetMinionUid,
        );
        const matchedSave = events.find((event) => {
            if (event.type === SU_EVENTS.MINION_RETURNED || event.type === SU_EVENTS.MINION_MOVED) {
                return (event as any).payload?.minionUid === item.targetMinionUid;
            }
            if (event.type === SU_EVENTS.CARD_TO_DECK_BOTTOM || event.type === SU_EVENTS.CARD_TO_DECK_TOP) {
                return (event as any).payload?.cardUid === item.targetMinionUid;
            }
            return false;
        });

        if (matchedSave) {
            continue;
        }

        if (matchedDestroy) {
            const timestamp = typeof matchedDestroy.timestamp === 'number' ? matchedDestroy.timestamp : fallbackTimestamp;
            const result = materializeBodyShopDistribution(nextState, item, timestamp);
            nextState = result.state;
            emitted.push(...result.events);
            continue;
        }

        remaining.push(item);
    }

    return {
        state: setPendingBodyShopDistributions(nextState, remaining),
        events: emitted,
    };
}

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
                const eventTimestamp = typeof event.timestamp === 'number' ? event.timestamp : 0;
                latestTimestamp = Math.max(latestTimestamp, eventTimestamp);

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
                                
                                if (emittedEvents.length > 0) {
                                    const postProcessed = postProcessSystemEvents(
                                        newState.core,
                                        emittedEvents,
                                        random,
                                        newState,
                                    );
                                    emittedEvents = postProcessed.events;
                                    if (postProcessed.matchState) {
                                        newState = postProcessed.matchState;
                                    }
                                }

                                // 交互处理器返回的领域事件需要先经过与 execute() 同步的后处理，
                                // 再统一交给 pipeline.reduceEventsToCore 做一次拦截与 reduce。
                                // 这里不能手动先调用 interceptEvent，否则像 Cthulhu 这类
                                // “交互返回 MADNESS_DRAWN，再由拦截器补标记”的链路会被重复处理。
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

                        if (payload.sourceId === 'giant_ant_drone_prevent_destroy') {
                            const targetMinionUid = (payload.interactionData?.continuationContext as { targetMinionUid?: string } | undefined)?.targetMinionUid;
                            const selected = payload.value as { skip?: boolean } | undefined;
                            if (targetMinionUid && !selected?.skip) {
                                const pending = getPendingBodyShopDistributions(newState)
                                    .filter((item) => item.targetMinionUid !== targetMinionUid);
                                newState = setPendingBodyShopDistributions(newState, pending);
                            }
                        }
                    }
                }
            }

            const bodyShopFollowUp = reconcilePendingBodyShopDistributions(newState, events, latestTimestamp);
            newState = bodyShopFollowUp.state;
            if (bodyShopFollowUp.events.length > 0) {
                nextEvents.push(...bodyShopFollowUp.events);
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
