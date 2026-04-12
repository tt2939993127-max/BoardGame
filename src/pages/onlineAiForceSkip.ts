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

    const batchId = buildAiBatchId(resolution.playerId, resolution.attemptKey);
    const commandTypes = resolution.action.commands.map(c => c.type);
    const timestamp = new Date().toISOString();

    console.log('=== KIRO DEBUG: SUBMIT AI RESOLUTION START ===');
    console.log('[submitOnlineAiResolution] Submitting AI action:', {
        timestamp,
        playerId: resolution.playerId,
        actionId: resolution.action.actionId,
        actionKind: resolution.action.kind,
        attemptKey: resolution.attemptKey,
        batchId,
        commandCount: resolution.action.commands.length,
        commandTypes,
        commandPayloads: resolution.action.commands.map(c => c.payload),
    });

    lastAiAttemptKeyRef.current = resolution.attemptKey;

    // Add timeout protection (15 seconds)
    let callbackTriggered = false;
    const timeoutMs = 15000;
    const timeoutTimer = setTimeout(() => {
        if (!callbackTriggered) {
            console.warn('[submitOnlineAiResolution] Timeout - no callback received within', timeoutMs, 'ms', {
                playerId: resolution.playerId,
                attemptKey: resolution.attemptKey,
                batchId,
            });
            callbackTriggered = true;
            if (lastAiAttemptKeyRef.current === resolution.attemptKey) {
                lastAiAttemptKeyRef.current = null;
            }
            scheduleRetry();
            onRejected?.('timeout');
        }
    }, timeoutMs);

    client.sendBatch(
        batchId,
        resolution.action.commands.map((command) => ({
            type: command.type,
            payload: command.payload,
        })),
        (authoritativeState) => {
            if (callbackTriggered) {
                console.warn('[submitOnlineAiResolution] onConfirmed called after timeout', {
                    playerId: resolution.playerId,
                    attemptKey: resolution.attemptKey,
                    batchId,
                });
                return;
            }
            callbackTriggered = true;
            clearTimeout(timeoutTimer);

            const confirmTimestamp = new Date().toISOString();
            console.log('=== KIRO DEBUG: SUBMIT AI RESOLUTION CONFIRMED ===');
            console.log('[submitOnlineAiResolution] Action confirmed:', {
                confirmTimestamp,
                playerId: resolution.playerId,
                attemptKey: resolution.attemptKey,
                batchId,
                hasAuthoritativeState: !!authoritativeState,
                authoritativeStateType: typeof authoritativeState,
            });

            // Update client state FIRST before clearing attemptKey
            // This ensures the next AI action resolution sees the updated state
            if (authoritativeState && typeof authoritativeState === 'object') {
                console.log('[submitOnlineAiResolution] Updating client latestState before clearing attemptKey');
                client.updateLatestState(authoritativeState);
            }

            // Clear the attempt key on successful confirmation
            // This allows the next AI action resolution to generate a fresh attemptKey
            // with the new interaction ID (if the game state has updated)
            console.log('[submitOnlineAiResolution] Clearing attemptKey after confirmation:', {
                currentAttemptKey: lastAiAttemptKeyRef.current,
                resolutionAttemptKey: resolution.attemptKey,
                willClear: lastAiAttemptKeyRef.current === resolution.attemptKey,
            });
            if (lastAiAttemptKeyRef.current === resolution.attemptKey) {
                lastAiAttemptKeyRef.current = null;
            }

            onConfirmed?.(authoritativeState);
        },
        (reason) => {
            if (callbackTriggered) {
                console.warn('[submitOnlineAiResolution] onRejected called after timeout', {
                    playerId: resolution.playerId,
                    attemptKey: resolution.attemptKey,
                    batchId,
                    reason,
                });
                return;
            }
            callbackTriggered = true;
            clearTimeout(timeoutTimer);

            const rejectTimestamp = new Date().toISOString();
            console.log('=== KIRO DEBUG: SUBMIT AI RESOLUTION REJECTED ===');
            console.log('[submitOnlineAiResolution] Action rejected:', {
                rejectTimestamp,
                playerId: resolution.playerId,
                attemptKey: resolution.attemptKey,
                batchId,
                reason,
            });

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
