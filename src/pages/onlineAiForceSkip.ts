import type { MatchState } from '../engine/types';
import { type AiResolution, type AiSeatController } from '../engine/ai';
import { GameTransportClient } from '../engine/transport/client';

type HiddenSimpleChoiceOption = {
    id?: unknown;
    disabled?: unknown;
    value?: { skip?: unknown; __cancel__?: unknown };
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

function buildAiBatchId(playerId: string, attemptKey: string): string {
    const normalizedAttemptKey = attemptKey.replace(/[^a-zA-Z0-9_-]+/g, '-').slice(0, 120);
    return `ai-${playerId}-${normalizedAttemptKey}`;
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
        option.id === 'skip' || option.value?.skip === true,
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

export function submitOnlineAiResolution(args: {
    client: Pick<GameTransportClient, 'sendBatch' | 'updateLatestState'>;
    resolution: AiResolution;
    lastAiAttemptKeyRef: { current: string | null };
    scheduleRetry: () => void;
    onConfirmed?: (authoritativeState: unknown) => void;
    onRejected?: (reason: string) => void;
}): void {
    const {
        client,
        resolution,
        lastAiAttemptKeyRef,
        scheduleRetry,
        onConfirmed,
        onRejected,
    } = args;

    lastAiAttemptKeyRef.current = resolution.attemptKey;
    client.sendBatch(
        buildAiBatchId(resolution.playerId, resolution.attemptKey),
        resolution.action.commands.map((command) => ({
            type: command.type,
            payload: command.payload,
        })),
        (authoritativeState) => {
            if (authoritativeState && typeof authoritativeState === 'object') {
                client.updateLatestState(authoritativeState);
            }
            onConfirmed?.(authoritativeState);
        },
        (reason) => {
            if (lastAiAttemptKeyRef.current === resolution.attemptKey) {
                lastAiAttemptKeyRef.current = null;
            }
            if (reason !== 'unauthorized') {
                scheduleRetry();
            }
            onRejected?.(reason);
        },
    );
}
