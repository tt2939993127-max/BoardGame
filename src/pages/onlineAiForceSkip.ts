import type { GameTransportClient } from '../engine/transport/client';
import type { MatchState } from '../engine/types';
import type { AiResolution } from '../engine/ai';

export {
    applyAiAutoRecoveryRejection,
    buildAiProgressMarker,
    resolveCurrentPlayerId,
    resolveForceAdvancePhaseAfterRecovery,
    resolveForceEndTurnFollowUpAfterConfirmation,
    resolveForceEndTurnForStalledAi,
    resolveForceSkippableHiddenAiInteraction,
    type AiAutoRecoveryAttemptTracker,
    type ForceEndTurnStalledAiResolution,
    type ForceSkippableHiddenAiInteraction,
} from '../engine/transport/onlineAiRecovery';

function buildAiBatchId(playerId: string, attemptKey: string): string {
    const normalizedAttemptKey = attemptKey.replace(/[^a-zA-Z0-9_-]+/g, '-').slice(0, 120);
    return `ai-${playerId}-${normalizedAttemptKey}`;
}

export function submitOnlineAiResolution(args: {
    client: Pick<GameTransportClient, 'sendBatch' | 'updateLatestState'>;
    resolution: AiResolution;
    lastAiAttemptKeyRef: { current: string | null };
    scheduleRetry: () => void;
    onConfirmed?: (authoritativeState: MatchState<unknown> | unknown) => void;
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
