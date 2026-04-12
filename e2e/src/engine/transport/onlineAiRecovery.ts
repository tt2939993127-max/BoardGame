import type { AiResolution, AiSeatController } from '../ai';
import type { MatchState } from '../types';
import { buildResponseWindowFingerprint } from '../systems/ResponseWindowSystem';

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

export type HiddenInteractionDescriptor = {
    id?: unknown;
    playerId?: unknown;
    kind?: unknown;
    data?: unknown;
};

type HiddenDtCardInteractionData = {
    type?: unknown;
    targetPlayerIds?: unknown;
    requiresTargetWithStatus?: unknown;
    transferConfig?: {
        sourcePlayerId?: unknown;
        statusId?: unknown;
    };
};

type HiddenPlayerState = {
    statusEffects?: Record<string, number | undefined> | null;
    tokens?: Record<string, number | undefined> | null;
};

type HiddenTokenDefinition = {
    id?: unknown;
    passiveTrigger?: {
        removable?: unknown;
    };
};

const buildRemovableStatusLookup = (state: MatchState<unknown>): Map<string, boolean> => {
    const definitions = (state.core as { tokenDefinitions?: HiddenTokenDefinition[] } | undefined)?.tokenDefinitions ?? [];
    const lookup = new Map<string, boolean>();
    for (const def of definitions) {
        const id = typeof def?.id === 'string' ? def.id : null;
        if (!id) continue;
        // removable 默认为 true，明确 false 时才视为不可移除
        const removable = def?.passiveTrigger?.removable !== false;
        lookup.set(id, removable);
    }
    return lookup;
};

const isRemovableStatusId = (lookup: Map<string, boolean>, statusId: string): boolean => {
    return lookup.get(statusId) !== false;
};

const hasAnyRemovableStatusOrToken = (
    player: HiddenPlayerState | null | undefined,
    lookup: Map<string, boolean>,
): boolean => {
    if (!player) return false;
    const effects = player.statusEffects ?? {};
    for (const [statusId, value] of Object.entries(effects)) {
        if (typeof value === 'number' && value > 0 && isRemovableStatusId(lookup, statusId)) {
            return true;
        }
    }
    const tokens = player.tokens ?? {};
    for (const [tokenId, value] of Object.entries(tokens)) {
        if (typeof value === 'number' && value > 0 && isRemovableStatusId(lookup, tokenId)) {
            return true;
        }
    }
    return false;
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
    reason: 'hidden-interaction' | 'visible-interaction' | 'response-window' | 'response-loop' | 'pending-damage' | 'active-turn' | 'action-loop';
    requiresConfirmedAdvancePhase?: boolean;
    resolution: AiResolution;
    fingerprintHint?: string;
    loopInfo?: {
        pattern: 'alternating' | 'repeat';
        kinds: string[];
        recent: string[];
    };
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
    const responseWindow = state.sys?.responseWindow?.current;
    const responseWindowFingerprint = responseWindow
        ? buildResponseWindowFingerprint(responseWindow)
        : '';
    const responseResponderId = (() => {
        const currentWindow = responseWindow;
        if (!currentWindow || !Array.isArray(currentWindow.responderQueue)) {
            return '';
        }
        const index = typeof currentWindow.currentResponderIndex === 'number' ? currentWindow.currentResponderIndex : 0;
        const responderId = currentWindow.responderQueue[index];
        return typeof responderId === 'string' ? responderId : '';
    })();
    const responderIndex = typeof responseWindow?.currentResponderIndex === 'number'
        ? responseWindow.currentResponderIndex
        : '';
    const currentPlayerId = resolveCurrentPlayerId(state) ?? '';
    const eventMarker = responseWindowFingerprint ? '' : eventStreamNextId;

    return [
        turnNumber,
        phase,
        eventMarker,
        interactionId,
        responseWindowFingerprint,
        responseResponderId,
        responderIndex,
        currentPlayerId,
    ].join('|');
}

const AI_LOOP_PHASES = new Set([
    'main1',
    'main2',
    'discard',
    'income',
    'upkeep',
    // Smash Up 阶段
    'playCards',
    'scoreBases',
    'draw',
    // DiceThrone 掷骰阶段
    'offensiveRoll',
    'targetingRoll',
    'defensiveRoll',
    // Summoner Wars 阶段
    'summon',
    'move',
    'build',
    'attack',
    'magic',
    'draw',
]);

const extractRecentActionKinds = (
    state: MatchState<unknown> | null | undefined,
    playerId: string,
    sampleSize = 6,
): string[] => {
    const entries = (state?.sys as { actionLog?: { entries?: Array<{ actorId?: unknown; kind?: unknown }> } } | undefined)
        ?.actionLog?.entries;
    if (!Array.isArray(entries) || entries.length === 0) {
        return [];
    }
    const filtered = entries.filter((entry) => entry?.actorId === playerId);
    return filtered
        .slice(-sampleSize)
        .map((entry) => (typeof entry?.kind === 'string' ? entry.kind : ''))
        .filter((kind) => kind.length > 0);
};

const detectAiActionLoop = (
    state: MatchState<unknown> | null | undefined,
    playerId: string,
): ForceEndTurnStalledAiResolution['loopInfo'] | null => {
    const phase = typeof state?.sys?.phase === 'string' ? state.sys.phase : '';
    if (!AI_LOOP_PHASES.has(phase)) {
        return null;
    }

    const recent = extractRecentActionKinds(state, playerId, 6);
    if (recent.length < 4) {
        return null;
    }

    const kinds = Array.from(new Set(recent));
    if (kinds.length === 1 && recent.length >= 3) {
        return {
            pattern: 'repeat',
            kinds,
            recent,
        };
    }

    if (kinds.length === 2) {
        const alternating = recent.every((kind, index) => index === 0 || kind !== recent[index - 1]);
        const counts = recent.reduce<Record<string, number>>((acc, kind) => {
            acc[kind] = (acc[kind] ?? 0) + 1;
            return acc;
        }, {});
        const enoughAlternation = alternating && kinds.every((kind) => (counts[kind] ?? 0) >= 2);
        if (enoughAlternation) {
            return {
                pattern: 'alternating',
                kinds,
                recent,
            };
        }
    }

    return null;
};

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
    const current = (state.sys as { interaction?: { current?: unknown } } | undefined)?.interaction?.current as HiddenInteractionDescriptor | undefined;
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

    const unsatisfiableReason = resolveUnsatisfiableReasonFromInteraction(state, current);
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

export function resolveForceEndTurnRecoveryStep(args: {
    authoritativeState: MatchState<unknown> | null | undefined;
    seatControllers: Record<string, AiSeatController>;
    playerId: string;
    allowAdvancePhase?: boolean;
}): AiResolution | null {
    const { authoritativeState, seatControllers, playerId } = args;
    const allowAdvancePhase = args.allowAdvancePhase !== false;
    if (!authoritativeState) {
        return null;
    }
    if (seatControllers[playerId]?.type === 'human') {
        return null;
    }

    const pendingDamage = (authoritativeState.core as { pendingDamage?: { responderId?: unknown; id?: unknown } } | undefined)?.pendingDamage;
    const pendingResponderId = typeof pendingDamage?.responderId === 'string' ? pendingDamage.responderId : null;
    if (pendingResponderId === playerId) {
        return buildForceEndTurnResolution({
            playerId,
            suffix: `pending-damage-step:${playerId}:${pendingDamage?.id ?? 'unknown'}`,
            commands: [{ type: 'SKIP_TOKEN_RESPONSE', payload: {} }],
        });
    }
    if (pendingDamage) {
        return null;
    }

    const currentInteraction = authoritativeState.sys?.interaction as { current?: unknown } | undefined;
    const visibleCurrent = currentInteraction?.current as HiddenInteractionDescriptor | undefined;
    if (visibleCurrent?.playerId && String(visibleCurrent.playerId) === playerId) {
        const resolution = buildForceEndTurnFromInteractionState(
            authoritativeState,
            playerId,
            'visible-interaction',
        );
        if (resolution) {
            return resolution.resolution;
        }
    }
    if (visibleCurrent?.playerId) {
        return null;
    }

    const responseWindow = authoritativeState.sys?.responseWindow as {
        current?: { responderQueue?: unknown; currentResponderIndex?: unknown };
    } | undefined;
    const responderQueue = Array.isArray(responseWindow?.current?.responderQueue)
        ? responseWindow?.current?.responderQueue
        : [];
    const responderIndex = typeof responseWindow?.current?.currentResponderIndex === 'number'
        ? responseWindow.current.currentResponderIndex
        : 0;
    const responderId = responderQueue[responderIndex];
    if (typeof responderId === 'string' && responderId === playerId) {
        return buildForceEndTurnResolution({
            playerId,
            suffix: `response-window-step:${playerId}`,
            commands: [{ type: 'RESPONSE_PASS', payload: {} }],
        });
    }
    if (responseWindow?.current) {
        return null;
    }

    if (resolveCurrentPlayerId(authoritativeState) !== playerId) {
        return null;
    }

    if (!allowAdvancePhase) {
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

export function resolveUnsatisfiableReasonFromInteraction(
    state: MatchState<unknown>,
    current: HiddenInteractionDescriptor | undefined,
): string | null {
    if (!current) {
        return null;
    }

    if (current.kind === 'simple-choice') {
        const data = (current as HiddenSimpleChoiceInteraction).data;
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

    if (current.kind !== 'dt:card-interaction') {
        return null;
    }

    const data = current.data as HiddenDtCardInteractionData | undefined;
    const players = (state.core as { players?: Record<string, HiddenPlayerState> } | undefined)?.players ?? {};
    const removableLookup = buildRemovableStatusLookup(state);
    const rawTargets = Array.isArray(data?.targetPlayerIds)
        ? data?.targetPlayerIds
        : Object.keys(players);
    const targetIds = rawTargets
        .map((playerId) => String(playerId))
        .filter((playerId) => Boolean(players[playerId]));

    if (targetIds.length === 0) {
        return 'empty-options';
    }

    const interactionType = typeof data?.type === 'string' ? data.type : '';
    const requiresTargetWithStatus = data?.requiresTargetWithStatus === true
        || interactionType === 'selectStatus'
        || interactionType === 'selectTargetStatus';

    if (interactionType === 'selectTargetStatus') {
        const sourcePlayerId = typeof data?.transferConfig?.sourcePlayerId === 'string'
            ? data.transferConfig?.sourcePlayerId
            : null;
        const statusId = typeof data?.transferConfig?.statusId === 'string'
            ? data.transferConfig?.statusId
            : null;
        if (!sourcePlayerId || !statusId) {
            return 'empty-options';
        }
        const sourcePlayer = players[sourcePlayerId];
        const sourceHasStatus = ((sourcePlayer?.statusEffects?.[statusId] ?? 0) > 0
            || (sourcePlayer?.tokens?.[statusId] ?? 0) > 0)
            && isRemovableStatusId(removableLookup, statusId);
        if (!sourceHasStatus) {
            return 'empty-options';
        }
        const eligibleTargets = targetIds.filter((playerId) => playerId !== sourcePlayerId);
        if (eligibleTargets.length === 0) {
            return 'empty-options';
        }
    }

    if (requiresTargetWithStatus) {
        const hasAnyStatus = targetIds.some((playerId) => hasAnyRemovableStatusOrToken(players[playerId], removableLookup));
        if (!hasAnyStatus) {
            return 'empty-options';
        }
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
        const responseWindowType = typeof (responseWindow?.current as { windowType?: unknown } | undefined)?.windowType === 'string'
            ? (responseWindow?.current as { windowType?: string }).windowType
            : 'unknown-window';
        const phase = typeof args.sharedState?.sys?.phase === 'string' ? args.sharedState.sys.phase : 'unknown-phase';
        const fingerprintHint = `response-window:${responderId}:${phase}:${responseWindowType}:${responderQueue.join('|')}`;
        return {
            playerId: responderId,
            reason: 'response-window',
            fingerprintHint,
            requiresConfirmedAdvancePhase: true,
            resolution: buildForceEndTurnResolution({
                playerId: responderId,
                suffix: fingerprintHint,
                commands: [{ type: 'RESPONSE_PASS', payload: {} }],
            }),
        };
    }

    // 关键门禁（强口径）：
    // 当响应窗口存在但当前响应者是 human 时，watchdog 不得尝试“强制结束 AI 回合 / 推进阶段”，
    // 否则会被 ResponseWindowSystem 的“当前响应者门禁”拒绝，产生误报与重复失败提示。
    // 这类场景本质上是在等待真人响应（或真人主动 pass），不应由 AI watchdog 干预。
    if (responseWindow?.current && typeof responderId === 'string' && args.seatControllers[responderId]?.type === 'human') {
        return null;
    }

    const currentPlayerId = resolveCurrentPlayerId(args.sharedState);
    if (currentPlayerId && args.seatControllers[currentPlayerId]?.type !== 'human') {
        const loopInfo = detectAiActionLoop(args.sharedState, currentPlayerId);
        if (loopInfo) {
            const phase = typeof args.sharedState?.sys?.phase === 'string' ? args.sharedState.sys.phase : 'unknown-phase';
            const fingerprintHint = `action-loop:${currentPlayerId}:${phase}:${loopInfo.kinds.join('|')}`;
            return {
                playerId: currentPlayerId,
                reason: 'action-loop',
                fingerprintHint,
                loopInfo,
                resolution: buildForceEndTurnResolution({
                    playerId: currentPlayerId,
                    suffix: fingerprintHint,
                    commands: [{ type: 'ADVANCE_PHASE', payload: {} }],
                }),
            };
        }

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
