/* @vitest-environment happy-dom */
import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { LobbyMatch } from '../../services/lobbySocket';
import { useLobbyMatchPresence } from '../useLobbyMatchPresence';

const subscribeMock = vi.fn();
let lastHandler: ((matches: LobbyMatch[]) => void) | null = null;

vi.mock('../../services/lobbySocket', () => ({
    lobbySocket: {
        subscribe: (gameId: string, handler: (matches: LobbyMatch[]) => void) => {
            subscribeMock(gameId);
            lastHandler = handler;
            return () => {};
        },
    },
}));

describe('useLobbyMatchPresence', () => {
    beforeEach(() => {
        subscribeMock.mockClear();
        lastHandler = null;
    });

    it('does not mark missing before the match is seen', () => {
        const { result } = renderHook(() =>
            useLobbyMatchPresence({
                gameId: 'tictactoe',
                matchId: 'm1',
                enabled: true,
                requireSeen: true,
            })
        );

        expect(subscribeMock).toHaveBeenCalledWith('tictactoe');
        act(() => {
            lastHandler?.([]);
        });

        expect(result.current.hasSnapshot).toBe(true);
        expect(result.current.hasSeen).toBe(false);
        expect(result.current.exists).toBe(false);
        expect(result.current.isMissing).toBe(false);
    });

    it('marks missing after the match disappears', () => {
        const { result } = renderHook(() =>
            useLobbyMatchPresence({
                gameId: 'tictactoe',
                matchId: 'm1',
                enabled: true,
                requireSeen: true,
            })
        );

        const match: LobbyMatch = {
            matchID: 'm1',
            gameName: 'tictactoe',
            players: [],
        };

        act(() => {
            lastHandler?.([match]);
        });

        expect(result.current.hasSnapshot).toBe(true);
        expect(result.current.hasSeen).toBe(true);
        expect(result.current.exists).toBe(true);
        expect(result.current.isMissing).toBe(false);

        act(() => {
            lastHandler?.([]);
        });

        expect(result.current.exists).toBe(false);
        expect(result.current.isMissing).toBe(true);
    });

    it('resets hasSeen when matchId changes', () => {
        const { result, rerender } = renderHook(
            ({ matchId }: { matchId: string }) =>
                useLobbyMatchPresence({
                    gameId: 'tictactoe',
                    matchId,
                    enabled: true,
                    requireSeen: true,
                }),
            { initialProps: { matchId: 'm1' } }
        );

        act(() => {
            lastHandler?.([
                {
                    matchID: 'm1',
                    gameName: 'tictactoe',
                    players: [],
                },
            ]);
        });

        expect(result.current.hasSeen).toBe(true);
        expect(result.current.exists).toBe(true);

        rerender({ matchId: 'm2' });

        expect(result.current.hasSeen).toBe(false);
        expect(result.current.isMissing).toBe(false);

        act(() => {
            lastHandler?.([
                {
                    matchID: 'm2',
                    gameName: 'tictactoe',
                    players: [],
                },
            ]);
        });

        expect(result.current.hasSeen).toBe(true);
        expect(result.current.exists).toBe(true);

        act(() => {
            lastHandler?.([]);
        });

        expect(result.current.isMissing).toBe(true);
    });
});
