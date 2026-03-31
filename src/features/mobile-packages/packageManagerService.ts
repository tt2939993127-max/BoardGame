import { runMockGamePackageInstall } from './mockInstallRunner';
import { clearStoredGamePackageState, readStoredGamePackageState, writeStoredGamePackageState } from './storage';
import type { GamePackageInstallHandle, ResolvedGamePackageManifest, StoredGamePackageState } from './types';
import { mergeGamePackageState } from './types';

type GamePackageStateListener = (state: StoredGamePackageState) => void;

const stateCache = new Map<string, StoredGamePackageState>();
const fallbackCache = new Map<string, StoredGamePackageState>();
const listenerRegistry = new Map<string, Set<GamePackageStateListener>>();
const activeInstallRegistry = new Map<string, GamePackageInstallHandle>();

const emitState = (state: StoredGamePackageState) => {
    stateCache.set(state.gameId, state);
    writeStoredGamePackageState(state);
    const listeners = listenerRegistry.get(state.gameId);
    listeners?.forEach((listener) => listener(state));
};

const getCurrentOrStoredState = (
    gameId: string,
    fallbackState: StoredGamePackageState,
): StoredGamePackageState => {
    const cached = stateCache.get(gameId);
    if (cached) {
        return mergeGamePackageState(fallbackState, cached);
    }

    const stored = readStoredGamePackageState(gameId, fallbackState);
    stateCache.set(gameId, stored);
    return stored;
};

const stopActiveInstall = (gameId: string) => {
    const handle = activeInstallRegistry.get(gameId);
    if (!handle) {
        return;
    }

    handle.cancel();
    activeInstallRegistry.delete(gameId);
};

export const syncGamePackageState = (
    gameId: string,
    fallbackState: StoredGamePackageState,
): StoredGamePackageState => {
    fallbackCache.set(gameId, fallbackState);
    const nextState = getCurrentOrStoredState(gameId, fallbackState);
    emitState(nextState);
    return nextState;
};

export const subscribeGamePackageState = (
    gameId: string,
    listener: GamePackageStateListener,
) => {
    const listeners = listenerRegistry.get(gameId) ?? new Set<GamePackageStateListener>();
    listeners.add(listener);
    listenerRegistry.set(gameId, listeners);

    return () => {
        const current = listenerRegistry.get(gameId);
        if (!current) {
            return;
        }

        current.delete(listener);
        if (current.size === 0) {
            listenerRegistry.delete(gameId);
        }
    };
};

export const resetGamePackageState = (
    gameId: string,
    fallbackState?: StoredGamePackageState,
): StoredGamePackageState => {
    stopActiveInstall(gameId);
    const resolvedFallback = fallbackState ?? fallbackCache.get(gameId);
    if (!resolvedFallback) {
        throw new Error(`[MobilePackages] 缺少 ${gameId} 的 fallbackState`);
    }

    fallbackCache.set(gameId, resolvedFallback);
    clearStoredGamePackageState(gameId);
    const nextState = mergeGamePackageState(resolvedFallback, {
        status: 'not-installed',
        progressPercent: undefined,
        progressMode: undefined,
        errorMessage: undefined,
        updatedAt: Date.now(),
    });
    emitState(nextState);
    return nextState;
};

export const startGamePackageInstall = (
    manifest: ResolvedGamePackageManifest,
    failureMessage: string,
): Promise<StoredGamePackageState> => {
    stopActiveInstall(manifest.gameId);

    const handle = runMockGamePackageInstall(manifest, {
        failureMessage,
        onStateChange: emitState,
    });
    activeInstallRegistry.set(manifest.gameId, handle);

    return handle.finished.finally(() => {
        if (activeInstallRegistry.get(manifest.gameId) === handle) {
            activeInstallRegistry.delete(manifest.gameId);
        }
    });
};

export const resetGamePackageManagerForTests = () => {
    for (const [gameId, handle] of activeInstallRegistry.entries()) {
        handle.cancel();
        activeInstallRegistry.delete(gameId);
    }
    stateCache.clear();
    fallbackCache.clear();
    listenerRegistry.clear();
};
