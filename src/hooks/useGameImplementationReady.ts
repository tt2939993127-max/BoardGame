import { useCallback, useEffect, useState } from 'react';
import { getGameImplementation, loadGameImplementation } from '../games/registry';

interface GameImplementationState {
    isReady: boolean;
    error: string | null;
}

interface UseGameImplementationReadyOptions {
    enabled?: boolean;
}

const createMissingClientMessage = (gameId: string) => `未找到游戏客户端：${gameId}`;

export function useGameImplementationReady(
    gameId: string | undefined,
    options: UseGameImplementationReadyOptions = {},
) {
    const [retryTick, setRetryTick] = useState(0);
    const enabled = options.enabled ?? true;
    const [state, setState] = useState<GameImplementationState>(() => {
        if (!gameId || !enabled) {
            return { isReady: true, error: null };
        }
        return {
            isReady: Boolean(getGameImplementation(gameId)),
            error: null,
        };
    });

    const retry = useCallback(() => {
        setRetryTick((tick) => tick + 1);
    }, []);

    useEffect(() => {
        if (!gameId || !enabled) {
            queueMicrotask(() => {
                setState({ isReady: true, error: null });
            });
            return;
        }

        if (getGameImplementation(gameId)) {
            queueMicrotask(() => {
                setState({ isReady: true, error: null });
            });
            return;
        }

        let isActive = true;
        setState({ isReady: false, error: null });

        loadGameImplementation(gameId)
            .then((implementation) => {
                if (!isActive) return;
                if (!implementation) {
                    setState({ isReady: false, error: createMissingClientMessage(gameId) });
                    return;
                }
                setState({ isReady: true, error: null });
            })
            .catch((error: unknown) => {
                if (!isActive) return;
                const message = error instanceof Error ? error.message : String(error);
                setState({ isReady: false, error: message });
            });

        return () => {
            isActive = false;
        };
    }, [enabled, gameId, retryTick]);

    return {
        isGameImplementationReady: state.isReady,
        gameImplementationError: state.error,
        retryGameImplementationLoad: retry,
    };
}
