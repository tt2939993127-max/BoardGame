import { describe, it, expect } from 'vitest';
import type { MatchMetadata, StoredMatchState } from '../../engine/transport/storage';
import { shouldForceCancelInteraction } from '../interactionAdjudication';

const buildMetadata = (connected: boolean): MatchMetadata => ({
    gameName: 'dicethrone',
    players: {
        0: { isConnected: connected },
        1: { isConnected: true },
    },
    createdAt: Date.now(),
    updatedAt: Date.now(),
});

const buildState = (pendingInteraction?: { id: string; playerId: string }) => {
    const matchState = {
        core: {
            pendingInteraction,
        },
        sys: {
            responseWindow: {
                current: pendingInteraction
                    ? { pendingInteractionId: pendingInteraction.id }
                    : undefined,
            },
        },
    };

    return {
        G: matchState,
        ctx: { gameover: undefined },
    } as unknown as StoredMatchState;
};

describe('interactionAdjudication', () => {
    it('离线且交互锁匹配时返回取消', () => {
        const result = shouldForceCancelInteraction({
            state: buildState({ id: 'i1', playerId: '0' }),
            metadata: buildMetadata(false),
            playerId: '0',
        });
        expect(result.shouldCancel).toBe(true);
        expect(result.interactionId).toBe('i1');
    });

    it('在线时不取消', () => {
        const result = shouldForceCancelInteraction({
            state: buildState({ id: 'i1', playerId: '0' }),
            metadata: buildMetadata(true),
            playerId: '0',
        });
        expect(result.shouldCancel).toBe(false);
        expect(result.reason).toBe('player_connected');
    });

    it('无交互时不取消', () => {
        const result = shouldForceCancelInteraction({
            state: buildState(undefined),
            metadata: buildMetadata(false),
            playerId: '0',
        });
        expect(result.shouldCancel).toBe(false);
        expect(result.reason).toBe('no_pending_interaction');
    });
});
