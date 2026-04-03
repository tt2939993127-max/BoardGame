import { useCallback, useEffect, useState } from 'react';
import { getGameImplementation, loadGameImplementation } from '../games/registry';

interface GameImplementationState {
    requestKey: string | null;
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
    const requestKey = enabled && gameId ? `${gameId}:${retryTick}` : null;
    const hasLoadedImplementation = Boolean(gameId && enabled && getGameImplementation(gameId));
    const [state, setState] = useState<GameImplementationState>(() => {
        if (!gameId || !enabled) {
            return { requestKey: null, isReady: true, error: null };
        }
        return {
            requestKey: null,
            isReady: Boolean(getGameImplementation(gameId)),
            error: null,
        };
    });

    const retry = useCallback(() => {
        setRetryTick((tick) => tick + 1);
    }, []);

    useEffect(() => {
        if (!requestKey || !gameId || hasLoadedImplementation) {
            return;
        }

        let isActive = true;

        loadGameImplementation(gameId)
            .then((implementation) => {
                if (!isActive) return;
                if (!implementation) {
                    setState({
                        requestKey,
                        isReady: false,
                        error: createMissingClientMessage(gameId),
                    });
                    return;
                }
                setState({ requestKey, isReady: true, error: null });
            })
            .catch((error: unknown) => {
                if (!isActive) return;
                const message = error instanceof Error ? error.message : String(error);
                setState({ requestKey, isReady: false, error: message });
            });

        return () => {
            isActive = false;
        };
    }, [gameId, hasLoadedImplementation, requestKey]);

    const resolvedState = (() => {
        if (!requestKey || !gameId || !enabled) {
            return { isReady: true, error: null };
        }
        if (hasLoadedImplementation) {
            return { isReady: true, error: null };
        }
        if (state.requestKey !== requestKey) {
            return { isReady: false, error: null };
        }
        return { isReady: state.isReady, error: state.error };
    })();

    return {
        isGameImplementationReady: resolvedState.isReady,
        gameImplementationError: resolvedState.error,
        retryGameImplementationLoad: retry,
    };
}
