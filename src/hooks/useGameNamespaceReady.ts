import { useCallback, useEffect, useState } from 'react';
import type { i18n as I18nInstance } from 'i18next';
import { logger } from '../lib/logger';
import { logMobileRuntime, logMobileRuntimeCritical } from '../lib/mobile/mobileRuntimeDebug';

interface GameNamespaceState {
    requestKey: string | null;
    isReady: boolean;
    error: string | null;
}

interface UseGameNamespaceReadyOptions {
    required?: boolean;
}

export const GAME_NAMESPACE_LOAD_TIMEOUT_MS = 4000;

const createGameNamespaceTimeoutMessage = (gameId: string, namespace: string) => (
    `游戏文案加载超时：${gameId}/${namespace}（${GAME_NAMESPACE_LOAD_TIMEOUT_MS}ms）`
);

const withTimeout = async <T,>(promise: Promise<T>, timeoutMs: number, timeoutMessage: string): Promise<T> => {
    let timeoutId: ReturnType<typeof setTimeout> | undefined;
    try {
        return await Promise.race([
            promise,
            new Promise<T>((_, reject) => {
                timeoutId = setTimeout(() => {
                    reject(new Error(timeoutMessage));
                }, timeoutMs);
            }),
        ]);
    } finally {
        if (timeoutId !== undefined) {
            clearTimeout(timeoutId);
        }
    }
};

/**
 * 管理游戏级 i18n namespace 的加载状态。
 * 加载失败时保留错误，避免页面继续渲染 raw key。
 */
export function useGameNamespaceReady(
    gameId: string | undefined,
    i18n: I18nInstance,
    options: UseGameNamespaceReadyOptions = {},
) {
    const [retryTick, setRetryTick] = useState(0);
    const languageKey = i18n.resolvedLanguage ?? i18n.language;
    const required = options.required ?? true;
    const namespace = gameId ? `game-${gameId}` : null;
    const requestKey = gameId && required ? `${gameId}:${languageKey}:${retryTick}` : null;
    const hasLoadedNamespace = Boolean(namespace && gameId && required && i18n.hasLoadedNamespace(namespace));
    const [state, setState] = useState<GameNamespaceState>(() => {
        if (!gameId || !required) {
            return { requestKey: null, isReady: true, error: null };
        }
        return {
            requestKey: null,
            isReady: i18n.hasLoadedNamespace(`game-${gameId}`),
            error: null,
        };
    });

    const retry = useCallback(() => {
        setRetryTick((tick) => tick + 1);
    }, []);

    useEffect(() => {
        if (!namespace || !gameId || !required) {
            return;
        }

        if (hasLoadedNamespace) {
            logMobileRuntime('GameNamespace', 'load-cache-hit', {
                gameId,
                namespace,
                language: languageKey,
                resolvedLanguage: i18n.resolvedLanguage,
            });
            return;
        }

        if (!requestKey) return;

        let isActive = true;
        const startedAt = Date.now();
        const timeoutMessage = createGameNamespaceTimeoutMessage(gameId, namespace);
        logMobileRuntime('GameNamespace', 'load-start', {
            gameId,
            namespace,
            language: languageKey,
            resolvedLanguage: i18n.resolvedLanguage,
        });

        withTimeout(i18n.loadNamespaces(namespace), GAME_NAMESPACE_LOAD_TIMEOUT_MS, timeoutMessage)
            .then(() => {
                if (!isActive) return;
                logMobileRuntime('GameNamespace', 'load-success', {
                    gameId,
                    namespace,
                    language: languageKey,
                    resolvedLanguage: i18n.resolvedLanguage,
                    durationMs: Date.now() - startedAt,
                });
                setState({ requestKey, isReady: true, error: null });
            })
            .catch((error: unknown) => {
                const message = error instanceof Error ? error.message : String(error);
                const isTimeout = message === timeoutMessage;
                const payload = {
                    gameId,
                    namespace,
                    language: languageKey,
                    resolvedLanguage: i18n.resolvedLanguage,
                    error: message,
                    durationMs: Date.now() - startedAt,
                };
                logger.error('[i18n] 游戏 namespace 加载失败', {
                    ...payload,
                    timeoutMs: GAME_NAMESPACE_LOAD_TIMEOUT_MS,
                });
                logMobileRuntime(
                    'GameNamespace',
                    isTimeout ? 'load-timeout' : 'load-failed',
                    payload,
                    isTimeout ? 'warn' : 'error',
                );
                if (isTimeout) {
                    logMobileRuntimeCritical('GameNamespace', 'load-timeout', payload);
                }
                if (!isActive) return;
                setState({ requestKey, isReady: false, error: message });
            });

        return () => {
            isActive = false;
        };
    }, [gameId, hasLoadedNamespace, i18n, languageKey, namespace, requestKey, required]);

    const resolvedState = (() => {
        if (!requestKey || !gameId || !required) {
            return { isReady: true, error: null };
        }
        if (hasLoadedNamespace) {
            return { isReady: true, error: null };
        }
        if (state.requestKey !== requestKey) {
            return { isReady: false, error: null };
        }
        return { isReady: state.isReady, error: state.error };
    })();

    return {
        isGameNamespaceReady: resolvedState.isReady,
        gameNamespaceError: resolvedState.error,
        retryGameNamespaceLoad: retry,
    };
}
