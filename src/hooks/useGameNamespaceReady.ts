import { useCallback, useEffect, useState } from 'react';
import type { i18n as I18nInstance } from 'i18next';
import { logger } from '../lib/logger';

interface GameNamespaceState {
    isReady: boolean;
    error: string | null;
}

/**
 * 管理游戏级 i18n namespace 的加载状态。
 * 加载失败时保留错误，避免页面继续渲染 raw key。
 */
export function useGameNamespaceReady(gameId: string | undefined, i18n: I18nInstance) {
    const [retryTick, setRetryTick] = useState(0);
    const languageKey = i18n.resolvedLanguage ?? i18n.language;
    const [state, setState] = useState<GameNamespaceState>(() => {
        if (!gameId) return { isReady: true, error: null };
        return {
            isReady: i18n.hasLoadedNamespace(`game-${gameId}`),
            error: null,
        };
    });

    const retry = useCallback(() => {
        setRetryTick((tick) => tick + 1);
    }, []);

    useEffect(() => {
        if (!gameId) {
            setState({ isReady: true, error: null });
            return;
        }

        const namespace = `game-${gameId}`;
        if (i18n.hasLoadedNamespace(namespace)) {
            setState({ isReady: true, error: null });
            return;
        }

        let isActive = true;
        setState({ isReady: false, error: null });

        i18n.loadNamespaces(namespace)
            .then(() => {
                if (!isActive) return;
                setState({ isReady: true, error: null });
            })
            .catch((error: unknown) => {
                const message = error instanceof Error ? error.message : String(error);
                logger.error('[i18n] 游戏 namespace 加载失败', {
                    gameId,
                    namespace,
                    language: languageKey,
                    resolvedLanguage: i18n.resolvedLanguage,
                    error: message,
                });
                if (!isActive) return;
                setState({ isReady: false, error: message });
            });

        return () => {
            isActive = false;
        };
    }, [gameId, i18n, languageKey, retryTick]);

    return {
        isGameNamespaceReady: state.isReady,
        gameNamespaceError: state.error,
        retryGameNamespaceLoad: retry,
    };
}
