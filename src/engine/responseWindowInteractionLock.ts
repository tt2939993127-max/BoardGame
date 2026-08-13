import type { MatchState } from './types';

export type ResponseWindowCurrentSummary = {
    id: string | null;
    windowType: string | null;
    sourceId: string | null;
    responderQueue: string[];
    currentResponderIndex: number;
    currentResponderId: string | null;
    pendingInteractionId: string | null;
};

export type ResponseWindowPrivateInteractionLockConsistencyReason =
    | 'not-response-window-decision'
    | 'missing-shared-window'
    | 'missing-private-window'
    | 'responder-mismatch'
    | 'id-mismatch'
    | 'window-type-mismatch'
    | 'source-mismatch'
    | 'pending-interaction-mismatch'
    | 'missing-private-interaction'
    | 'interaction-id-mismatch'
    | 'interaction-owner-mismatch'
    | 'ok';

export type ResponseWindowPrivateInteractionLockConsistency = {
    ok: boolean;
    reason: ResponseWindowPrivateInteractionLockConsistencyReason;
    isResponseWindowDecision: boolean;
    isLockedPrivateInteraction: boolean;
    sharedWindow: ResponseWindowCurrentSummary | null;
    privateWindow: ResponseWindowCurrentSummary | null;
    privateInteractionId: string | null;
    privateInteractionPlayerId: string | null;
};

function nonEmptyString(value: unknown): string | null {
    return typeof value === 'string' && value.length > 0 ? value : null;
}

function readCurrentInteractionSummary(state: MatchState<unknown> | null | undefined): {
    id: string | null;
    playerId: string | null;
} {
    const current = (state?.sys?.interaction as {
        current?: {
            id?: unknown;
            playerId?: unknown;
        } | null;
    } | undefined)?.current;
    return {
        id: nonEmptyString(current?.id),
        playerId: nonEmptyString(current?.playerId),
    };
}

export function resolveResponseWindowCurrent(
    state: MatchState<unknown> | null | undefined,
): ResponseWindowCurrentSummary | null {
    const current = (state?.sys?.responseWindow as {
        current?: {
            id?: unknown;
            windowType?: unknown;
            sourceId?: unknown;
            responderQueue?: unknown;
            currentResponderIndex?: unknown;
            pendingInteractionId?: unknown;
        } | null;
    } | undefined)?.current;
    if (!current) {
        return null;
    }

    const rawResponderQueue = Array.isArray(current.responderQueue)
        ? current.responderQueue
        : [];
    const responderQueue = rawResponderQueue.filter((value): value is string => typeof value === 'string');
    const rawResponderIndex = typeof current.currentResponderIndex === 'number'
        ? current.currentResponderIndex
        : 0;
    const currentResponderIndex = Number.isInteger(rawResponderIndex) && rawResponderIndex >= 0
        ? rawResponderIndex
        : 0;
    const currentResponderId = typeof rawResponderQueue[currentResponderIndex] === 'string'
        ? rawResponderQueue[currentResponderIndex]
        : null;

    return {
        id: nonEmptyString(current.id),
        windowType: nonEmptyString(current.windowType),
        sourceId: nonEmptyString(current.sourceId),
        responderQueue,
        currentResponderIndex,
        currentResponderId,
        pendingInteractionId: nonEmptyString(current.pendingInteractionId),
    };
}

export function hasPendingResponseWindowInteractionLock(
    state: MatchState<unknown> | null | undefined,
): boolean {
    return Boolean(resolveResponseWindowCurrent(state)?.pendingInteractionId);
}

export function responseWindowSeatViewBelongsToResponder(args: {
    sharedWindow: ResponseWindowCurrentSummary | null;
    seatWindow: ResponseWindowCurrentSummary | null;
    responderId: string;
}): boolean {
    const { sharedWindow, seatWindow, responderId } = args;
    if (!sharedWindow || !seatWindow) {
        return false;
    }
    if (sharedWindow.currentResponderId !== responderId || seatWindow.currentResponderId !== responderId) {
        return false;
    }
    if (sharedWindow.id && seatWindow.id) {
        return sharedWindow.id === seatWindow.id;
    }
    if (sharedWindow.windowType && seatWindow.windowType && sharedWindow.windowType !== seatWindow.windowType) {
        return false;
    }
    if (sharedWindow.sourceId && seatWindow.sourceId && sharedWindow.sourceId !== seatWindow.sourceId) {
        return false;
    }
    if (
        sharedWindow.responderQueue.length > 0
        && seatWindow.responderQueue.length > 0
        && sharedWindow.responderQueue.join('|') !== seatWindow.responderQueue.join('|')
    ) {
        return false;
    }
    return true;
}

export function resolveResponseWindowPrivateInteractionLockConsistency(args: {
    sharedState: MatchState<unknown> | null | undefined;
    privateOverlay: MatchState<unknown> | null | undefined;
    playerId: string;
}): ResponseWindowPrivateInteractionLockConsistency {
    const sharedWindow = resolveResponseWindowCurrent(args.sharedState);
    const privateWindow = resolveResponseWindowCurrent(args.privateOverlay);
    const privateInteraction = readCurrentInteractionSummary(args.privateOverlay);
    const base = {
        isResponseWindowDecision: !!sharedWindow || !!privateWindow,
        isLockedPrivateInteraction: false,
        sharedWindow,
        privateWindow,
        privateInteractionId: privateInteraction.id,
        privateInteractionPlayerId: privateInteraction.playerId,
    };

    if (!base.isResponseWindowDecision) {
        return {
            ...base,
            ok: true,
            reason: 'not-response-window-decision',
        };
    }
    if (!sharedWindow) {
        return {
            ...base,
            ok: false,
            reason: 'missing-shared-window',
        };
    }
    if (!privateWindow) {
        return {
            ...base,
            ok: false,
            reason: 'missing-private-window',
        };
    }
    if (sharedWindow.currentResponderId !== privateWindow.currentResponderId) {
        return {
            ...base,
            ok: false,
            reason: 'responder-mismatch',
        };
    }
    if (sharedWindow.id !== privateWindow.id) {
        return {
            ...base,
            ok: false,
            reason: 'id-mismatch',
        };
    }
    if (sharedWindow.windowType !== privateWindow.windowType) {
        return {
            ...base,
            ok: false,
            reason: 'window-type-mismatch',
        };
    }
    if (sharedWindow.sourceId !== privateWindow.sourceId) {
        return {
            ...base,
            ok: false,
            reason: 'source-mismatch',
        };
    }
    if (sharedWindow.pendingInteractionId !== privateWindow.pendingInteractionId) {
        return {
            ...base,
            ok: false,
            reason: 'pending-interaction-mismatch',
        };
    }
    if (!sharedWindow.pendingInteractionId) {
        return {
            ...base,
            ok: true,
            reason: 'ok',
        };
    }
    if (!privateInteraction.id) {
        return {
            ...base,
            ok: false,
            reason: 'missing-private-interaction',
        };
    }
    if (privateInteraction.id !== sharedWindow.pendingInteractionId) {
        return {
            ...base,
            ok: false,
            reason: 'interaction-id-mismatch',
        };
    }
    if (privateInteraction.playerId !== args.playerId) {
        return {
            ...base,
            ok: false,
            reason: 'interaction-owner-mismatch',
        };
    }
    return {
        ...base,
        ok: true,
        reason: 'ok',
        isLockedPrivateInteraction: true,
    };
}
