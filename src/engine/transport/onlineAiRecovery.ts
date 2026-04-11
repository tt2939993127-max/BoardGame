import type { AiResolution, AiSeatController } from '../ai';
import type { MatchState } from '../types';

type HiddenSimpleChoiceOption = {
    id?: unknown;
    disabled?: unknown;
    value?: { skip?: unknown; __cancel__?: unknown; done?: unknown; __emergency_skip__?: unknown };
};

type HiddenSimpleChoiceInteraction = {
    id?: unknown;
    playerId?: unknown;
    kind?: unknown;
    data?: {
        title?: unknown;
        sourceId?: unknown;
        multi?: { min?: unknown };
        options?: HiddenSimpleChoiceOption[];
    };
};

export type ForceSkippableHiddenAiInteraction = {
    playerId: string;
    interactionId: string;
    sourceId?: string;
    title?: string;
    resolution: AiResolution;
};

export type ForceEndTurnStalledAiResolution = {
    playerId: string;
    reason: 'hidden-interaction' | 'visible-interaction' | 'response-window' | 'pending-damage' | 'active-turn';
    requiresConfirmedAdvancePhase?: boolean;
    resolution: AiResolution;
};

export type AiAutoRecoveryAttemptTracker = {
    firstSeenAt: number;
    autoSubmittedAt: number | null;
    lastReportedFailureReason: string | null;
};

export function applyAiAutoRecoveryRejection<T extends AiAutoRecoveryAttemptTracker>(
    tracker: T,
    reason: string,
    now: number,
): { shouldNotify: boolean; nextTracker: T } {
    return {
        shouldNotify: tracker.lastReportedFailureReason !== reason,
        nextTracker: {
            ...tracker,
            firstSeenAt: now,
            autoSubmittedAt: null,
            lastReportedFailureReason: reason,
        },
    };
}

export function resolveCurrentPlayerId(sharedState: MatchState<unknown> | null | undefined): string | null {
    const core = sharedState?.core as {
        activePlayerId?: unknown;
        currentPlayer?: unknown;
        turnOrder?: unknown;
        currentPlayerIndex?: unknown;
    } | undefined;
    if (!core) return null;
    if (typeof core.activePlayerId === 'string') return core.activePlayerId;
    if (typeof core.currentPlayer === 'string') return core.currentPlayer;
    if (Array.isArray(core.turnOrder) && typeof core.currentPlayerIndex === 'number') {
        const current = core.turnOrder[core.currentPlayerIndex];
        return typeof current === 'string' ? current : null;
    }
    return null;
}

export function buildAiProgressMarker(state: MatchState<unknown>): string {
    const turnNumber = typeof state.sys?.turnNumber === 'number' ? state.sys.turnNumber : '';
    const phase = typeof state.sys?.phase === 'string' ? state.sys.phase : '';
    const eventStreamNextId = typeof state.sys?.eventStream?.nextId === 'number'
        ? state.sys.eventStream.nextId
        : '';
    const interactionId = typeof state.sys?.interaction?.current?.id === 'string'
        ? state.sys.interaction.current.id
        : '';
    const responderIndex = typeof state.sys?.responseWindow?.current?.currentResponderIndex === 'number'
        ? state.sys.responseWindow.current.currentResponderIndex
        : '';
    const currentPlayerId = resolveCurrentPlayerId(state) ?? '';

    return [
        turnNumber,
        phase,
        eventStreamNextId,
        interactionId,
        responderIndex,
        currentPlayerId,
    ].join('|');
}

function buildForceEndTurnResolution(args: {
    playerId: string;
    suffix: string;
    commands: Array<{ type: string; payload: unknown }>;
}): AiResolution {
    return {
        playerId: args.playerId,
        attemptKey: `force-end-turn:${args.playerId}:${args.suffix}`,
        source: 'local-ai',
        action: {
            actionId: `force-end-turn:${args.suffix}`,
            kind: 'force-end-turn',
            label: '强制结束 AI 回合',
            commands: args.commands,
        },
    };
}

function buildForceEndTurnFromInteractionState(
    state: MatchState<unknown>,
    playerId: string,
    reason: 'hidden-interaction' | 'visible-interaction',
): ForceEndTurnStalledAiResolution | null {
    const current = (state.sys as { interaction?: { current?: unknown } } | undefined)?.interaction?.current as HiddenSimpleChoiceInteraction | undefined;
    if (!current || String(current.playerId) !== playerId || typeof current.id !== 'string') {
        return null;
    }

    const forceSkipPayload = buildForceSkipPayloadFromSeatState(state, playerId);
    if (forceSkipPayload) {
        return {
            playerId,
            reason,
            requiresConfirmedAdvancePhase: true,
            resolution: buildForceEndTurnResolution({
                playerId,
                suffix: `${reason}:${forceSkipPayload.interactionId}`,
                commands: [{ type: 'SYS_INTERACTION_RESPOND', payload: forceSkipPayload.payload }],
            }),
        };
    }

    const unsatisfiableReason = resolveUnsatisfiableReasonFromInteraction(current);
    return {
        playerId,
        reason,
        requiresConfirmedAdvancePhase: true,
        resolution: buildForceEndTurnResolution({
            playerId,
            suffix: `${reason}:${current.id}`,
            commands: [{
                type: 'SYS_INTERACTION_CANCEL',
                payload: unsatisfiableReason ? { reason: unsatisfiableReason } : {},
            }],
        }),
    };
}

function buildForceEndTurnFollowUpSuffix(state: MatchState<unknown>, playerId: string): string {
    const turnNumber = typeof state.sys?.turnNumber === 'number' ? state.sys.turnNumber : 'unknown-turn';
    const phase = typeof state.sys?.phase === 'string' ? state.sys.phase : 'unknown-phase';
    const eventStreamNextId = typeof state.sys?.eventStream?.nextId === 'number'
        ? state.sys.eventStream.nextId
        : 'unknown-events';
    return `follow-up:${playerId}:${turnNumber}:${phase}:${eventStreamNextId}`;
}

export function resolveForceAdvancePhaseAfterRecovery(args: {
    authoritativeState: MatchState<unknown> | null | undefined;
    seatControllers: Record<string, AiSeatController>;
    playerId: string;
}): AiResolution | null {
    const { authoritativeState, seatControllers, playerId } = args;
    if (!authoritativeState) {
        return null;
    }
    if (seatControllers[playerId]?.type === 'human') {
        return null;
    }
    if (resolveCurrentPlayerId(authoritativeState) !== playerId) {
        return null;
    }

    const currentInteraction = authoritativeState.sys?.interaction as {
        current?: unknown;
        isBlocked?: unknown;
    } | undefined;
    if (currentInteraction?.current || currentInteraction?.isBlocked === true) {
        return null;
    }

    const responseWindow = authoritativeState.sys?.responseWindow as {
        current?: unknown;
    } | undefined;
    if (responseWindow?.current) {
        return null;
    }

    const pendingDamage = (authoritativeState.core as { pendingDamage?: unknown } | undefined)?.pendingDamage;
    if (pendingDamage) {
        return null;
    }

    return buildForceEndTurnResolution({
        playerId,
        suffix: buildForceEndTurnFollowUpSuffix(authoritativeState, playerId),
        commands: [{ type: 'ADVANCE_PHASE', payload: {} }],
    });
}

export function resolveForceEndTurnFollowUpAfterConfirmation(args: {
    candidate: ForceEndTurnStalledAiResolution;
    authoritativeState: MatchState<unknown> | null | undefined;
    seatControllers: Record<string, AiSeatController>;
}): AiResolution | null {
    const { candidate, authoritativeState, seatControllers } = args;
    if (!candidate.requiresConfirmedAdvancePhase) {
        return null;
    }

    return resolveForceAdvancePhaseAfterRecovery({
        authoritativeState,
        seatControllers,
        playerId: candidate.playerId,
    });
}

function resolveUnsatisfiableReasonFromInteraction(
    current: HiddenSimpleChoiceInteraction | undefined,
): string | null {
    if (!current || current.kind !== 'simple-choice') {
        return null;
    }

    const data = current.data;
    const options = Array.isArray(data?.options) ? data.options : [];
    const enabledOptions = options.filter((option) => option?.disabled !== true);
    const minCount = typeof data?.multi?.min === 'number' ? data.multi.min : 1;

    if (minCount <= 0) {
        return null;
    }
    if (options.length === 0) {
        return 'empty-options';
    }
    if (enabledOptions.length === 0) {
        return 'all-options-disabled';
    }
    if (enabledOptions.length < minCount) {
        return 'min-selection-unreachable';
    }
    return null;
}

function buildForceSkipPayloadFromSeatState(state: MatchState<unknown>, playerId: string): {
    interactionId: string;
    payload: { optionId?: string; optionIds?: string[] };
    sourceId?: string;
    title?: string;
} | null {
    const current = (state.sys as { interaction?: { current?: unknown } } | undefined)?.interaction?.current as
        | HiddenSimpleChoiceInteraction
        | undefined;

    if (!current || String(current.playerId) !== playerId || current.kind !== 'simple-choice' || typeof current.id !== 'string') {
        return null;
    }

    const data = current.data;
    const enabledOptions = Array.isArray(data?.options)
        ? data.options.filter((option): option is HiddenSimpleChoiceOption & { id: string } =>
            Boolean(option) && option.disabled !== true && typeof option.id === 'string')
        : [];

    const skipOption = enabledOptions.find((option) =>
        option.id === 'skip'
        || option.value?.skip === true
        || option.id === '__emergency_skip__'
        || option.value?.__emergency_skip__ === true,
    );
    if (skipOption?.id) {
        return {
            interactionId: current.id,
            payload: { optionId: skipOption.id },
            sourceId: typeof data?.sourceId === 'string' ? data.sourceId : undefined,
            title: typeof data?.title === 'string' ? data.title : undefined,
        };
    }

    const cancelOption = enabledOptions.find((option) =>
        option.id === '__cancel__' || option.value?.__cancel__ === true,
    );
    if (cancelOption?.id) {
        return {
            interactionId: current.id,
            payload: { optionId: cancelOption.id },
            sourceId: typeof data?.sourceId === 'string' ? data.sourceId : undefined,
            title: typeof data?.title === 'string' ? data.title : undefined,
        };
    }

    const minCount = typeof data?.multi?.min === 'number' ? data.multi.min : 1;
    if (minCount === 0) {
        return {
            interactionId: current.id,
            payload: { optionIds: [] },
            sourceId: typeof data?.sourceId === 'string' ? data.sourceId : undefined,
            title: typeof data?.title === 'string' ? data.title : undefined,
        };
    }

    const doneOption = enabledOptions.find((option) =>
        option.id === 'done' || option.value?.done === true,
    );
    if (doneOption?.id) {
        return {
            interactionId: current.id,
            payload: { optionId: doneOption.id },
            sourceId: typeof data?.sourceId === 'string' ? data.sourceId : undefined,
            title: typeof data?.title === 'string' ? data.title : undefined,
        };
    }

    return null;
}

export function resolveForceSkippableHiddenAiInteraction(args: {
    sharedState: MatchState<unknown> | null | undefined;
    seatControllers: Record<string, AiSeatController>;
    seatStates: Record<string, MatchState<unknown> | null | undefined>;
}): ForceSkippableHiddenAiInteraction | null {
    const sharedInteraction = args.sharedState?.sys?.interaction as { current?: unknown; isBlocked?: unknown } | undefined;
    if (!sharedInteraction || sharedInteraction.current || sharedInteraction.isBlocked !== true) {
        return null;
    }

    for (const [playerId, controller] of Object.entries(args.seatControllers)) {
        if (controller.type === 'human') {
            continue;
        }
        const seatState = args.seatStates[playerId];
        if (!seatState) {
            continue;
        }
        const forceSkipPayload = buildForceSkipPayloadFromSeatState(seatState, playerId);
        if (!forceSkipPayload) {
            continue;
        }

        return {
            playerId,
            interactionId: forceSkipPayload.interactionId,
            sourceId: forceSkipPayload.sourceId,
            title: forceSkipPayload.title,
            resolution: {
                playerId,
                attemptKey: `force-skip:${playerId}:${forceSkipPayload.interactionId}`,
                source: 'local-ai',
                action: {
                    actionId: `force-skip:${forceSkipPayload.interactionId}`,
                    kind: 'interaction-choice',
                    label: '强制跳过 AI 可选效果',
                    commands: [{
                        type: 'SYS_INTERACTION_RESPOND',
                        payload: forceSkipPayload.payload,
                    }],
                },
            },
        };
    }

    return null;
}

export function resolveForceEndTurnForStalledAi(args: {
    sharedState: MatchState<unknown> | null | undefined;
    seatControllers: Record<string, AiSeatController>;
    seatStates: Record<string, MatchState<unknown> | null | undefined>;
}): ForceEndTurnStalledAiResolution | null {
    const pendingDamage = (args.sharedState?.core as { pendingDamage?: { responderId?: unknown; id?: unknown } } | undefined)?.pendingDamage;
    const pendingResponderId = typeof pendingDamage?.responderId === 'string' ? pendingDamage.responderId : null;
    if (pendingResponderId && args.seatControllers[pendingResponderId]?.type !== 'human') {
        return {
            playerId: pendingResponderId,
            reason: 'pending-damage',
            resolution: buildForceEndTurnResolution({
                playerId: pendingResponderId,
                suffix: `pending-damage:${pendingResponderId}:${pendingDamage?.id ?? 'unknown'}`,
                commands: [{ type: 'SKIP_TOKEN_RESPONSE', payload: {} }],
            }),
        };
    }

    const currentInteraction = args.sharedState?.sys?.interaction as { current?: unknown; isBlocked?: unknown } | undefined;
    const visibleCurrent = currentInteraction?.current as HiddenSimpleChoiceInteraction | undefined;
    if (visibleCurrent?.playerId && args.seatControllers[String(visibleCurrent.playerId)]?.type !== 'human') {
        return buildForceEndTurnFromInteractionState(
            args.sharedState as MatchState<unknown>,
            String(visibleCurrent.playerId),
            'visible-interaction',
        );
    }

    if (currentInteraction?.current == null && currentInteraction?.isBlocked === true) {
        for (const [playerId, controller] of Object.entries(args.seatControllers)) {
            if (controller.type === 'human') continue;
            const seatState = args.seatStates[playerId];
            if (!seatState) continue;
            const hiddenResolution = buildForceEndTurnFromInteractionState(seatState, playerId, 'hidden-interaction');
            if (hiddenResolution) {
                return hiddenResolution;
            }
        }
    }

    const responseWindow = args.sharedState?.sys?.responseWindow as {
        current?: {
            responderQueue?: unknown;
            currentResponderIndex?: unknown;
        };
    } | undefined;
    const responderQueue = Array.isArray(responseWindow?.current?.responderQueue)
        ? responseWindow?.current?.responderQueue
        : [];
    const responderIndex = typeof responseWindow?.current?.currentResponderIndex === 'number'
        ? responseWindow.current.currentResponderIndex
        : 0;
    const responderId = responderQueue[responderIndex];
    if (typeof responderId === 'string' && args.seatControllers[responderId]?.type !== 'human') {
        return {
            playerId: responderId,
            reason: 'response-window',
            requiresConfirmedAdvancePhase: true,
            resolution: buildForceEndTurnResolution({
                playerId: responderId,
                suffix: `response-window:${responderId}`,
                commands: [{ type: 'RESPONSE_PASS', payload: {} }],
            }),
        };
    }

    const currentPlayerId = resolveCurrentPlayerId(args.sharedState);
    if (currentPlayerId && args.seatControllers[currentPlayerId]?.type !== 'human') {
        return {
            playerId: currentPlayerId,
            reason: 'active-turn',
            resolution: buildForceEndTurnResolution({
                playerId: currentPlayerId,
                suffix: `active-turn:${currentPlayerId}`,
                commands: [{ type: 'ADVANCE_PHASE', payload: {} }],
            }),
        };
    }

    return null;
}
