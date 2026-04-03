import { clearGameAssetBaseOverrides, setGameAssetBaseOverride } from '../../core';
import { logMobileRuntime, logMobileRuntimeCritical } from '../../lib/mobile/mobileRuntimeDebug';
import { runMockGamePackageInstall } from './mockInstallRunner';
import { createNativeGamePackageInstallHandle, listInstalledNativeGamePackages } from './nativeGamePackagePlugin';
import {
    clearStoredGamePackageState,
    readStoredGamePackageState,
    STALE_IN_PROGRESS_ERROR_MESSAGE,
    writeStoredGamePackageState,
} from './storage';
import type { GamePackageInstallHandle, ResolvedGamePackageManifest, StoredGamePackageState } from './types';
import { hasUsableInstalledGamePackageVersion, mergeGamePackageState } from './types';

type GamePackageStateListener = (state: StoredGamePackageState) => void;

const stateCache = new Map<string, StoredGamePackageState>();
const fallbackCache = new Map<string, StoredGamePackageState>();
const listenerRegistry = new Map<string, Set<GamePackageStateListener>>();
const activeInstallRegistry = new Map<string, GamePackageInstallHandle>();
const appliedAssetBaseOverrides = new Map<string, string>();
const isDevRuntime = typeof import.meta !== 'undefined' && import.meta.env?.DEV;

const hasInstalledVersion = (state: Pick<StoredGamePackageState, 'status' | 'installedVersion'>) =>
    state.status === 'installed' && hasUsableInstalledGamePackageVersion(state.installedVersion);

const isInProgressStatus = (status: StoredGamePackageState['status']) =>
    status === 'queued'
    || status === 'manifest'
    || status === 'downloading'
    || status === 'verifying';

const withTimeout = async <T>(promise: Promise<T>, timeoutMs: number, timeoutMessage: string): Promise<T> => {
    let timeoutId: ReturnType<typeof setTimeout> | undefined;
    try {
        return await Promise.race([
            promise,
            new Promise<T>((_, reject) => {
                timeoutId = setTimeout(() => reject(new Error(timeoutMessage)), timeoutMs);
            }),
        ]);
    } finally {
        if (timeoutId !== undefined) {
            clearTimeout(timeoutId);
        }
    }
};

const normalizeIncompleteInstalledState = (
    state: StoredGamePackageState,
    fallbackState: StoredGamePackageState,
    source: 'cache' | 'storage' | 'native-hydration',
): StoredGamePackageState => {
    if (state.status !== 'installed' || hasInstalledVersion(state)) {
        return state;
    }

    const normalizedState = mergeGamePackageState(fallbackState, {
        status: 'not-installed',
        progressPercent: undefined,
        progressMode: undefined,
        installedVersion: undefined,
        localAssetBaseUrl: undefined,
        errorMessage: undefined,
        updatedAt: state.updatedAt,
    });

    logMobileRuntime('PackageManagerService', 'normalize-incomplete-installed-state', {
        gameId: state.gameId,
        source,
        previousState: state,
        normalizedState,
    }, 'warn');

    return normalizedState;
};

const applyAssetBaseOverride = (gameId: string, assetBaseUrl?: string) => {
    if (!assetBaseUrl) {
        appliedAssetBaseOverrides.delete(gameId);
        setGameAssetBaseOverride(gameId, undefined);
        return;
    }

    appliedAssetBaseOverrides.set(gameId, assetBaseUrl);
    setGameAssetBaseOverride(gameId, assetBaseUrl);
};

const normalizeStateBeforeEmit = (
    state: StoredGamePackageState,
): StoredGamePackageState => {
    const fallbackState = fallbackCache.get(state.gameId) ?? mergeGamePackageState(state, {});
    return normalizeIncompleteInstalledState(state, fallbackState, 'cache');
};

const emitState = (state: StoredGamePackageState) => {
    const normalizedState = normalizeStateBeforeEmit(state);
    logMobileRuntime('PackageManagerService', 'emit-state', {
        gameId: normalizedState.gameId,
        state: normalizedState,
    });
    applyAssetBaseOverride(normalizedState.gameId, normalizedState.localAssetBaseUrl);
    stateCache.set(normalizedState.gameId, normalizedState);
    writeStoredGamePackageState(normalizedState);
    const listeners = listenerRegistry.get(normalizedState.gameId);
    listeners?.forEach((listener) => listener(normalizedState));
};

const getCurrentOrStoredState = (
    gameId: string,
    fallbackState: StoredGamePackageState,
): StoredGamePackageState => {
    const cached = stateCache.get(gameId);
    if (cached) {
        const normalizedCached = normalizeIncompleteInstalledState(
            mergeGamePackageState(fallbackState, cached),
            fallbackState,
            'cache',
        );
        if (isInProgressStatus(normalizedCached.status) && !activeInstallRegistry.has(gameId)) {
            return mergeGamePackageState(fallbackState, {
                status: 'failed',
                progressPercent: undefined,
                progressMode: undefined,
                errorMessage: normalizedCached.errorMessage ?? STALE_IN_PROGRESS_ERROR_MESSAGE,
                updatedAt: normalizedCached.updatedAt ?? Date.now(),
            });
        }
        return normalizedCached;
    }

    const stored = readStoredGamePackageState(gameId, fallbackState);
    const normalizedState = normalizeIncompleteInstalledState(stored, fallbackState, 'storage');
    stateCache.set(gameId, normalizedState);
    return normalizedState;
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
    logMobileRuntime('PackageManagerService', 'sync-game-package-state', {
        gameId,
        fallbackState,
    });
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
    logMobileRuntime('PackageManagerService', 'reset-game-package-state', {
        gameId,
        hasExplicitFallbackState: Boolean(fallbackState),
    });
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
    logMobileRuntime('PackageManagerService', 'hydrate-installed-native-packages', {
        installedPackages,
    });
    const seenGameIds = new Set<string>();

    clearGameAssetBaseOverrides();
    appliedAssetBaseOverrides.clear();

    for (const installedPackage of installedPackages) {
        const fallbackState = fallbackCache.get(installedPackage.gameId);
        if (!fallbackState) {
            continue;
        }

        const hydratedState = normalizeIncompleteInstalledState(mergeGamePackageState(fallbackState, {
            status: 'installed',
            progressMode: undefined,
            progressPercent: undefined,
            installedVersion: installedPackage.installedVersion,
            localAssetBaseUrl: installedPackage.assetBaseUrl,
            updatedAt: installedPackage.installedAt ?? Date.now(),
        }), fallbackState, 'native-hydration');

        seenGameIds.add(installedPackage.gameId);
        applyAssetBaseOverride(
            installedPackage.gameId,
            hasInstalledVersion(hydratedState) ? installedPackage.assetBaseUrl : undefined,
        );
        emitState(hydratedState);
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
    logMobileRuntime('PackageManagerService', 'start-install', {
        gameId: manifest.gameId,
        manifest,
    });
    if (!manifest.assetPackUrl) {
        const fallbackState = fallbackCache.get(manifest.gameId) ?? {
            gameId: manifest.gameId,
            runtimeChannel: manifest.runtimeChannel,
            status: 'not-installed' as const,
            modulePackId: manifest.modulePackId,
            assetPackId: manifest.assetPackId,
            modulePackBytes: manifest.modulePackBytes,
            assetPackBytes: manifest.assetPackBytes,
            updatedAt: Date.now(),
        };
        const failedState = mergeGamePackageState(fallbackState, {
            status: 'failed',
            progressMode: undefined,
            progressPercent: undefined,
            errorMessage: '当前还没有可下载的游戏包，请先发布一版。',
        });
        logMobileRuntimeCritical('PackageManagerService', 'start-install-missing-asset-pack-url', {
            gameId: manifest.gameId,
            manifestSource: manifest.source,
            assetPackId: manifest.assetPackId,
            assetPackVersion: manifest.assetPackVersion,
        });
        emitState(failedState);
        return Promise.resolve(failedState);
    }
    stopActiveInstall(manifest.gameId);

    const queuedState: StoredGamePackageState = {
        gameId: manifest.gameId,
        runtimeChannel: manifest.runtimeChannel,
        status: 'queued',
        progressMode: 'indeterminate',
        modulePackId: manifest.modulePackId,
        assetPackId: manifest.assetPackId,
        modulePackBytes: manifest.modulePackBytes,
        assetPackBytes: manifest.assetPackBytes,
        updatedAt: Date.now(),
    };
    emitState(queuedState);

    let resolvedHandle: GamePackageInstallHandle | null = null;
    let cancelledBeforeReady = false;

    const handle: GamePackageInstallHandle = {
        cancel: () => {
            cancelledBeforeReady = true;
            resolvedHandle?.cancel();
        },
        finished: (async () => {
            try {
                logMobileRuntimeCritical('PackageManagerService', 'install-handle-creating', {
                    gameId: manifest.gameId,
                    manifestSource: manifest.source,
                    assetPackVersion: manifest.assetPackVersion,
                });
                const nativeHandle = await withTimeout(
                    createNativeGamePackageInstallHandle(manifest, {
                        onStateChange: emitState,
                        onInstalledAssetBaseUrl: applyAssetBaseOverride,
                    }),
                    3000,
                    '创建原生安装器超时，请重新发起。',
                );
                logMobileRuntime('PackageManagerService', 'install-handle-resolved', {
                    gameId: manifest.gameId,
                    source: nativeHandle ? 'native' : 'mock',
                });
                logMobileRuntimeCritical('PackageManagerService', 'install-handle-resolved', {
                    gameId: manifest.gameId,
                    source: nativeHandle ? 'native' : 'mock',
                });
                if (nativeHandle) {
                    resolvedHandle = nativeHandle;
                } else if (isDevRuntime) {
                    resolvedHandle = runMockGamePackageInstall(manifest, {
                        failureMessage,
                        onStateChange: emitState,
                    });
                } else {
                    const failedState: StoredGamePackageState = {
                        ...queuedState,
                        status: 'failed',
                        progressMode: undefined,
                        progressPercent: undefined,
                        errorMessage: failureMessage,
                        updatedAt: Date.now(),
                    };
                    logMobileRuntime('PackageManagerService', 'install-native-handle-missing', {
                        gameId: manifest.gameId,
                        runtime: 'production',
                    }, 'error');
                    emitState(failedState);
                    resolvedHandle = {
                        cancel: () => {},
                        finished: Promise.resolve(failedState),
                    };
                }

                if (cancelledBeforeReady) {
                    resolvedHandle.cancel();
                }

                return resolvedHandle.finished;
            } catch (error) {
                const failedState: StoredGamePackageState = {
                    ...queuedState,
                    status: 'failed',
                    progressMode: undefined,
                    progressPercent: undefined,
                    errorMessage: error instanceof Error ? error.message : (failureMessage || '安装失败'),
                    updatedAt: Date.now(),
                };
                logMobileRuntime('PackageManagerService', 'install-early-failure', {
                    gameId: manifest.gameId,
                    error: error instanceof Error ? error.message : String(error),
                }, 'error');
                logMobileRuntimeCritical('PackageManagerService', 'install-early-failure', {
                    gameId: manifest.gameId,
                    error: error instanceof Error ? error.message : String(error),
                });
                emitState(failedState);
                return failedState;
            }
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
    logMobileRuntime('PackageManagerService', 'reset-for-tests');
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
