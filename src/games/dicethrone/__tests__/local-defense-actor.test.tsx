/* @vitest-environment happy-dom */

import { describe, expect, it, vi } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import type { MatchState } from '../../../engine/types';
import { useLocalProviderViewModel } from '../../../engine/transport/useLocalProviderViewModel';
import engineConfig from '../game';

const createDefensiveState = (): MatchState<unknown> => ({
    core: {
        activePlayerId: '0',
        pendingAttack: {
            attackerId: '0',
            defenderId: '1',
        },
    },
    sys: {
        phase: 'defensiveRoll',
        interaction: { queue: [] },
        undo: { snapshots: [], maxSnapshots: 0 },
        log: { entries: [], maxEntries: 0 },
        eventStream: { entries: [], maxEntries: 0, nextId: 1 },
        actionLog: { entries: [], maxEntries: 0 },
        rematch: { votes: {}, ready: false },
        responseWindow: {},
    },
} as MatchState<unknown>);

describe('DiceThrone 本地防御阶段操作者', () => {
    it('防御方不是主动回合玩家时，本地推进命令必须以防御方身份发送', () => {
        const dispatch = vi.fn();
        const localActorResolver = (engineConfig as typeof engineConfig & {
            resolveLocalRuntimeControlledPlayerId?: (args: {
                state: MatchState<unknown>;
                fallbackPlayerId: string | null;
            }) => string | null | undefined;
        }).resolveLocalRuntimeControlledPlayerId;

        expect(localActorResolver).toBeTypeOf('function');
        const { result } = renderHook(() => useLocalProviderViewModel({
            state: createDefensiveState(),
            dispatch,
            reset: vi.fn(),
            playerIds: ['0', '1'],
            seatControllers: {},
            localPregameControlledPlayerId: null,
            followCurrentTurnPlayer: true,
            localPlayerId: null,
            resolveLocalRuntimeControlledPlayerId: localActorResolver,
        }));

        act(() => {
            result.current.dispatch('ADVANCE_PHASE', {});
        });

        expect(dispatch).toHaveBeenCalledWith('ADVANCE_PHASE', {
            __internalPlayerId: '1',
        });
    });
});
