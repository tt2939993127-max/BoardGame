import { clearGameAssetBaseOverrides, setGameAssetBaseOverride } from '../../core';
import { runMockGamePackageInstall } from './mockInstallRunner';
import { createNativeGamePackageInstallHandle, listInstalledNativeGamePackages } from './nativeGamePackagePlugin';
import { clearStoredGamePackageState, readStoredGamePackageState, writeStoredGamePackageState } from './storage';
import type { GamePackageInstallHandle, ResolvedGamePackageManifest, StoredGamePackageState } from './types';
import { mergeGamePackageState } from './types';

type GamePackageStateListener = (state: StoredGamePackageState) => void;

const stateCache = new Map<string, StoredGamePackageState>();
const fallbackCache = new Map<string, StoredGamePackageState>();
const listenerRegistry = new Map<string, Set<GamePackageStateListener>>();
const activeInstallRegistry = new Map<string, GamePackageInstallHandle>();
const appliedAssetBaseOverrides = new Map<string, string>();

const applyAssetBaseOverride = (gameId: string, assetBaseUrl?: string) => {
    if (!assetBaseUrl) {
        appliedAssetBaseOverrides.delete(gameId);
        setGameAssetBaseOverride(gameId, undefined);
        return;
    }

    appliedAssetBaseOverrides.set(gameId, assetBaseUrl);
    setGameAssetBaseOverride(gameId, assetBaseUrl);
};

const emitState = (state: StoredGamePackageState) => {
    applyAssetBaseOverride(state.gameId, state.localAssetBaseUrl);
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
        installedVersion: undefined,
        localAssetBaseUrl: undefined,
        errorMessage: undefined,
        updatedAt: Date.now(),
    });
    emitState(nextState);
    return nextState;
};

export const hydrateInstalledNativeGamePackages = async () => {
    const installedPackages = await listInstalledNativeGamePackages();
    const seenGameIds = new Set<string>();

    clearGameAssetBaseOverrides();
    appliedAssetBaseOverrides.clear();

    for (const installedPackage of installedPackages) {
        seenGameIds.add(installedPackage.gameId);
        applyAssetBaseOverride(installedPackage.gameId, installedPackage.assetBaseUrl);

        const fallbackState = fallbackCache.get(installedPackage.gameId);
        if (!fallbackState) {
            continue;
        }

        emitState(mergeGamePackageState(fallbackState, {
            status: 'installed',
            progressMode: undefined,
            progressPercent: undefined,
            installedVersion: installedPackage.installedVersion,
            localAssetBaseUrl: installedPackage.assetBaseUrl,
            updatedAt: installedPackage.installedAt ?? Date.now(),
        }));
    }

    for (const gameId of fallbackCache.keys()) {
        if (seenGameIds.has(gameId)) {
            continue;
        }
        if (!appliedAssetBaseOverrides.has(gameId)) {
            setGameAssetBaseOverride(gameId, undefined);
        }
    }
};

export const startGamePackageInstall = (
    manifest: ResolvedGamePackageManifest,
    failureMessage: string,
): Promise<StoredGamePackageState> => {
    stopActiveInstall(manifest.gameId);

    let resolvedHandle: GamePackageInstallHandle | null = null;
    let cancelledBeforeReady = false;

    const handle: GamePackageInstallHandle = {
        cancel: () => {
            cancelledBeforeReady = true;
            resolvedHandle?.cancel();
        },
        finished: (async () => {
            const nativeHandle = await createNativeGamePackageInstallHandle(manifest, {
                onStateChange: emitState,
                onInstalledAssetBaseUrl: applyAssetBaseOverride,
            });
            resolvedHandle = nativeHandle ?? runMockGamePackageInstall(manifest, {
                failureMessage,
                onStateChange: emitState,
            });

            if (cancelledBeforeReady) {
                resolvedHandle.cancel();
            }

            return resolvedHandle.finished;
        })(),
    };

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
    appliedAssetBaseOverrides.clear();
    clearGameAssetBaseOverrides();
};
