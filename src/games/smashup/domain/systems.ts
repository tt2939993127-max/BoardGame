/**
 * 大杀四方 - 专用事件处理系统
 * 
 * 处理领域事件到系统状态的映射：
 * - 监听 SYS_INTERACTION_RESOLVED 事件 → 从 sourceId 查找处理函数 → 生成后续领域事件
 * - 对交互解决产生的事件应用保护过滤和触发链（与 execute() 后处理对齐）
 */

import type { GameEvent, MatchState, SystemState } from '../../../engine/types';
import type { EngineSystem, HookResult } from '../../../engine/systems/types';
import { createSimpleChoice, INTERACTION_EVENTS, queueInteraction, resolveInteraction } from '../../../engine/systems/InteractionSystem';
import type {
    SmashUpCore,
    SmashUpEvent,
    SmashUpSystemState,
    PendingPostScoringAction,
    MinionPlayedEvent,
    MinionDestroyedEvent,
    MinionMovedEvent,
    MinionReturnedEvent,
    CardToDeckBottomEvent,
    CardToDeckTopEvent,
} from './types';
import { getInteractionHandler } from './abilityInteractionHandlers';
import { addPowerCounter, buildValidatedMoveEvents } from './abilityHelpers';
import { SU_EVENT_TYPES } from './events';
import { reduce } from './reduce';
import { resolveLiveBaseIndex } from './utils';
import { maybeResolveReactionQueue } from './reactionQueue';
import {
    getDeferredPostScoringEvents,
    getScoringSession,
    mergeDeferredPostScoringCompatibility,
    mirrorDeferredPostScoringToFirstInteraction,
} from './scoringSession';

// ============================================================================
// SmashUp 事件处理系统
// ============================================================================

function buildPendingPostScoringActionEvents(
    state: { core: SmashUpCore },
    actions: PendingPostScoringAction[],
    timestamp: number,
): SmashUpEvent[] {
    const events: SmashUpEvent[] = [];
    let virtualCore = state.core;
    for (const action of actions) {
        if (action.kind === 'playMinionOnReplacementBase') {
            const player = virtualCore.players[action.playerId];
            const cardStillInDeck = player?.deck.some(card =>
                card.uid === action.cardUid
                && card.defId === action.defId
                && card.type === 'minion',
            );
            const liveBaseIndex = resolveLiveBaseIndex(virtualCore, action.baseIndex, action.targetBaseDefId);
            if (!player || !cardStillInDeck || liveBaseIndex === undefined) {
                continue;
            }
            const playEvent = {
                type: SU_EVENT_TYPES.MINION_PLAYED,
                payload: {
                    playerId: action.playerId,
                    cardUid: action.cardUid,
                    defId: action.defId,
                    baseIndex: liveBaseIndex,
                    baseDefId: action.targetBaseDefId,
                    power: action.power,
                    fromDeck: true,
                    consumesNormalLimit: false,
                },
                timestamp,
            } as MinionPlayedEvent;
            events.push(playEvent);
            virtualCore = reduce(virtualCore, playEvent as SmashUpEvent);
            continue;
        }

        const liveTargetBaseIndex = resolveLiveBaseIndex(virtualCore, action.toBaseIndex, action.targetBaseDefId);
        if (liveTargetBaseIndex === undefined) {
            continue;
        }
        const moveEvents = buildValidatedMoveEvents(virtualCore, {
            minionUid: action.minionUid,
            minionDefId: action.minionDefId,
            fromBaseIndex: action.fromBaseIndex,
            toBaseIndex: liveTargetBaseIndex,
            reason: action.reason,
            now: timestamp,
        });
        events.push(...moveEvents);
        for (const event of moveEvents) {
            virtualCore = reduce(virtualCore, event as SmashUpEvent);
        }
    }
    return events;
}

function isSameDeferredEvent(
    emittedEvent: SmashUpEvent,
    deferredEvent: { type: string; payload: unknown; timestamp: number },
): boolean {
    if (emittedEvent.type !== deferredEvent.type) return false;
    const emittedPayload = (emittedEvent as GameEvent).payload;
    return JSON.stringify(emittedPayload) === JSON.stringify(deferredEvent.payload)
        && (typeof emittedEvent.timestamp === 'number' ? emittedEvent.timestamp : 0) === deferredEvent.timestamp;
}

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
        beforeCommand: ({ state }) => {
            const sys = state.sys as Record<string, unknown>;
            if (!sys._processedDestroyEvents && !sys._processedPlayedEvents && !sys._processedTitanPositionEvents) {
                return;
            }
            return {
                state: {
                    ...state,
                    sys: {
                        ...state.sys,
                        _processedDestroyEvents: undefined,
                        _processedPlayedEvents: undefined,
                        _processedTitanPositionEvents: undefined,
                    } as typeof state.sys,
                },
            };
        },

        afterEvents: ({ state, events, random }): HookResult<SmashUpCore> | void => {
            let newState = state;
            const nextEvents: GameEvent[] = [];
            const pendingStartTurnInteractionReduceFlag = '_waitForStartTurnInteractionReduce';
            const pendingReduceFlag = '_waitForPostScoringReduce';
            let latestTimestamp = 0;

            // 同一轮 afterEvents 中，后续系统看不到本轮新发出事件的 reduce 结果。
            // 上一轮如果刚补发了 BASE_CLEARED / BASE_REPLACED，需要先等 pipeline 在轮末完成 reduce，
            // 本轮开始时再清掉阻塞标记，允许 FlowSystem 继续自动推进。
            if ((newState.sys as any)[pendingReduceFlag]) {
                const scoringSession = (newState.sys as any).smashupScoring;
                newState = {
                    ...newState,
                    sys: {
                        ...newState.sys,
                        ...(scoringSession?.currentStep === 'awaiting-post-reduce'
                            ? {
                                smashupScoring: {
                                    ...scoringSession,
                                    currentStep: 'idle',
                                },
                            }
                            : {}),
                        [pendingReduceFlag]: undefined,
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
                            const activeSys = newState.sys as SmashUpSystemState;
                            const startTurnWindowActive =
                                newState.sys.phase === 'startTurn'
                                || Boolean(activeSys._smashupStartTurnWindowActive);

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
                                nextEvents.push(...emittedEvents);

                                // 补发延迟的 BASE_CLEARED/BASE_REPLACED 事件
                                // afterScoring 基地能力创建交互时，清除事件被延迟到交互解决后发出，
                                // 确保 targetType: 'minion' 的场上点选交互能看到随从
                                const ctx = payload.interactionData?.continuationContext as Record<string, unknown> | undefined;
                                const deferred = ctx?._deferredPostScoringEvents as { type: string; payload: unknown; timestamp: number }[] | undefined;
                                const scoringSession = (newState.sys as typeof newState.sys & {
                                    smashupScoring?: { currentBaseRef?: unknown; currentStep?: string };
                                }).smashupScoring;
                                const scoringSessionOwnsDeferredFlush =
                                    !!scoringSession?.currentBaseRef
                                    && (scoringSession.currentStep === 'awaiting-interactions'
                                        || scoringSession.currentStep === 'awaiting-response-window');
                                if (deferred && deferred.length > 0) {
                                    if (scoringSessionOwnsDeferredFlush) {
                                        // session-first 计分链会在 scoreBases onPhaseExit 里统一补发 deferred，
                                        // 这里保留 continuationContext 传递，但不能再兼容性补发一次。
                                        continue;
                                    }
                                    // 【关键修复】无论是否有后续交互，都立即设置 flowHalted=true
                                    // 防止 FlowSystem.afterEvents 在交互解决后重新进入 onPhaseExit('scoreBases')
                                    // 导致同一个基地被重复计分（因为 BASE_CLEARED 还没有从 scoringEligibleBaseIndices 中移除基地）
                                    newState.sys.flowHalted = true;
                                    
                                    // 仅在没有后续交互时补发（链式交互需要等最后一个解决后再清除）
                                    if (!newState.sys.interaction?.current && (!newState.sys.interaction?.queue || newState.sys.interaction.queue.length === 0)) {
                                        const handlerAlreadyEmittedDeferred = deferred.every(d =>
                                            nextEvents.some(event => isSameDeferredEvent(event, d))
                                        );
                                        if (!handlerAlreadyEmittedDeferred) {
                                            for (const d of deferred) {
                                                nextEvents.push({ type: d.type, payload: d.payload, timestamp: d.timestamp } as GameEvent);
                                            }
                                        }
                                        const postDeferredCore = deferred.reduce(
                                            (core, d) => reduce(core, {
                                                type: d.type,
                                                payload: d.payload,
                                                timestamp: d.timestamp,
                                            } as SmashUpEvent),
                                            newState.core,
                                        );
                                        const pendingActions = newState.core.pendingPostScoringActions ?? [];
                                        if (pendingActions.length > 0) {
                                            nextEvents.push(...buildPendingPostScoringActionEvents({
                                                core: postDeferredCore,
                                            }, pendingActions, eventTimestamp));
                                            newState = {
                                                ...newState,
                                                core: {
                                                    ...newState.core,
                                                    pendingPostScoringActions: undefined,
                                                },
                                            };
                                        }
                                        newState = {
                                            ...newState,
                                            sys: {
                                                ...newState.sys,
                                                [pendingReduceFlag]: true,
                                            } as typeof newState.sys,
                                        };
                                    } else {
                                        // 还有后续交互：把 deferred events 传递到下一个交互的 continuationContext
                                        const nextInteraction = newState.sys.interaction.current ?? newState.sys.interaction.queue?.[0];
                                        if (nextInteraction?.data) {
                                            const nextData = nextInteraction.data as Record<string, unknown>;
                                            const nextCtx = (nextData.continuationContext ?? {}) as Record<string, unknown>;
                                            nextCtx._deferredPostScoringEvents = deferred;
                                            nextData.continuationContext = nextCtx;
                                        }
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

            if (!newState.sys.interaction?.current) {
                const lastEvent = events.length > 0 ? events[events.length - 1] : undefined;
                const reactionNow = typeof lastEvent?.timestamp === 'number' ? lastEvent.timestamp : 0;
                const reactionResult = maybeResolveReactionQueue(newState as any, random, reactionNow);
                if (reactionResult) {
                    newState = reactionResult.state;
                    nextEvents.push(...reactionResult.events);
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
