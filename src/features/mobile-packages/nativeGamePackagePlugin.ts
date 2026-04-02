import { Capacitor, registerPlugin } from '@capacitor/core';
import type { GamePackageInstallHandle, ResolvedGamePackageManifest, StoredGamePackageState } from './types';
import { logMobileRuntime, logMobileRuntimeCritical } from '../../lib/mobile/mobileRuntimeDebug';
import { mergeGamePackageState } from './types';

type PluginListenerHandle = {
    remove(): Promise<void>;
};

type NativeGamePackagePlugin = {
    listInstalledPackages(): Promise<{
        packages: Array<{
            gameId: string;
            runtimeChannel?: string;
            installedAt?: number;
            assetPackVersion?: string;
            assetRootPath?: string;
        }>;
    }>;
    installGamePackage(options: {
        gameId: string;
        runtimeChannel: string;
        assetPackId?: string;
        assetPackVersion?: string;
        assetPackUrl: string;
        assetPackChecksum?: string;
    }): Promise<{
        gameId: string;
        runtimeChannel?: string;
        installedAt?: number;
        assetPackVersion?: string;
        assetRootPath?: string;
    }>;
    fetchRemoteJson(options: {
        url: string;
    }): Promise<{
        status?: number;
        body?: string;
        contentType?: string;
    }>;
    cancelInstall(options: { gameId: string }): Promise<void>;
    addListener(
        eventName: 'installStateChanged',
        listenerFunc: (event: {
            gameId?: string;
            status?: StoredGamePackageState['status'];
            progressPercent?: number;
            progressMode?: StoredGamePackageState['progressMode'];
            errorMessage?: string;
            installedAt?: number;
            assetPackVersion?: string;
            assetRootPath?: string;
        }) => void,
    ): Promise<PluginListenerHandle>;
};

interface NativeInstallRunnerOptions {
    onStateChange: (state: StoredGamePackageState) => void;
    onInstalledAssetBaseUrl?: (gameId: string, assetBaseUrl?: string) => void;
}

export interface NativeInstalledGamePackage {
    gameId: string;
    runtimeChannel: string;
    installedAt?: number;
    installedVersion?: string;
    assetBaseUrl?: string;
}

export interface NativeRemoteJsonResponse {
    status?: number;
    body?: string;
    contentType?: string;
}

const isAndroidShellBuild = import.meta.env.MODE === 'android';
let nativePluginLoader: Promise<NativeGamePackagePlugin | null> | null = null;
const nativeGamePackagePlugin = registerPlugin<NativeGamePackagePlugin>('GamePackage');

const buildBaseState = (manifest: ResolvedGamePackageManifest): StoredGamePackageState => ({
    gameId: manifest.gameId,
    runtimeChannel: manifest.runtimeChannel,
    status: 'not-installed',
    modulePackId: manifest.modulePackId,
    assetPackId: manifest.assetPackId,
    modulePackBytes: manifest.modulePackBytes,
    assetPackBytes: manifest.assetPackBytes,
    updatedAt: Date.now(),
});

const clampPercent = (value: number | undefined) => {
    if (typeof value !== 'number' || !Number.isFinite(value)) {
        return undefined;
    }
    return Math.max(0, Math.min(100, Math.round(value)));
};

const toAssetBaseUrl = async (assetRootPath?: string) => {
    if (!assetRootPath) {
        return undefined;
    }

    try {
        return Capacitor.convertFileSrc(assetRootPath);
    } catch {
        return undefined;
    }
};

const getNativePlugin = async () => {
    if (!nativePluginLoader) {
        nativePluginLoader = (async () => {
            if (!isAndroidShellBuild) {
                logMobileRuntime('NativeGamePackagePlugin', 'capacitor-core-skip-non-android', {
                    mode: import.meta.env.MODE,
                });
                return null;
            }
            const isNative = Capacitor.isNativePlatform();
            const platform = Capacitor.getPlatform();
            logMobileRuntimeCritical('NativeGamePackagePlugin', 'get-plugin-platform-check', {
                isNative,
                platform,
            });
            if (!isNative || platform !== 'android') {
                return null;
            }
            logMobileRuntimeCritical('NativeGamePackagePlugin', 'get-plugin-registered', {
                hasPlugin: true,
                methods: Object.keys(nativeGamePackagePlugin).slice(0, 10),
            });
            return nativeGamePackagePlugin;
        })();
    }

    return nativePluginLoader;
};

export const listInstalledNativeGamePackages = async (): Promise<NativeInstalledGamePackage[]> => {
    const plugin = await getNativePlugin();
    if (!plugin) {
        logMobileRuntime('NativeGamePackagePlugin', 'list-installed-no-plugin', {}, 'warn');
        return [];
    }

    const response = await plugin.listInstalledPackages();
    const installedPackages = await Promise.all(
        (response.packages ?? []).map(async (item) => ({
            gameId: item.gameId,
            runtimeChannel: item.runtimeChannel?.trim() || 'stable',
            installedAt: typeof item.installedAt === 'number' && Number.isFinite(item.installedAt)
                ? item.installedAt
                : undefined,
            installedVersion: typeof item.assetPackVersion === 'string' && item.assetPackVersion.trim()
                ? item.assetPackVersion.trim()
                : undefined,
            assetBaseUrl: await toAssetBaseUrl(item.assetRootPath),
        })),
    );

    const filteredPackages = installedPackages.filter((item) => Boolean(item.gameId));
    logMobileRuntime('NativeGamePackagePlugin', 'list-installed-success', {
        packages: filteredPackages,
    });
    return filteredPackages;
};

export const fetchRemoteJsonThroughNativePlugin = async (
    url: string,
): Promise<NativeRemoteJsonResponse | null> => {
    const plugin = await getNativePlugin();
    if (!plugin) {
        logMobileRuntimeCritical('NativeGamePackagePlugin', 'fetch-remote-json-no-plugin', { url });
        return null;
    }

    try {
        return await plugin.fetchRemoteJson({ url });
    } catch (error) {
        logMobileRuntimeCritical('NativeGamePackagePlugin', 'fetch-remote-json-failed', {
            url,
            error: error instanceof Error ? error.message : String(error),
        });
        return null;
    }
};

const createNativeFailureHandle = (
    manifest: ResolvedGamePackageManifest,
    errorMessage: string,
    options: NativeInstallRunnerOptions,
): GamePackageInstallHandle => {
    const baseState = buildBaseState(manifest);
    const failedState = mergeGamePackageState(baseState, {
        status: 'failed',
        errorMessage,
        progressMode: undefined,
        progressPercent: undefined,
    });
    options.onStateChange(failedState);

    return {
        cancel: () => {},
        finished: Promise.resolve(failedState),
    };
};

export const createNativeGamePackageInstallHandle = async (
    manifest: ResolvedGamePackageManifest,
    options: NativeInstallRunnerOptions,
): Promise<GamePackageInstallHandle | null> => {
    const plugin = await getNativePlugin();
    if (!plugin) {
        logMobileRuntime('NativeGamePackagePlugin', 'create-install-handle-no-plugin', {
            gameId: manifest.gameId,
        }, 'warn');
        return null;
    }

    if (!manifest.assetPackUrl) {
        logMobileRuntimeCritical('NativeGamePackagePlugin', 'missing-asset-pack-url', {
            gameId: manifest.gameId,
            source: manifest.source,
            assetPackId: manifest.assetPackId,
            assetPackVersion: manifest.assetPackVersion,
            hasModulePackUrl: Boolean(manifest.modulePackUrl),
        });
        return createNativeFailureHandle(manifest, '当前还没有可下载的游戏包，请先发布一版。', options);
    }

    let cancelled = false;
    let currentState = buildBaseState(manifest);
    let listenerHandle: PluginListenerHandle | null = null;

    const finished = (async () => {
        try {
            logMobileRuntimeCritical('NativeGamePackagePlugin', 'install-start', {
                gameId: manifest.gameId,
                manifestSource: manifest.source,
                assetPackId: manifest.assetPackId,
                assetPackVersion: manifest.assetPackVersion,
                assetPackUrl: manifest.assetPackUrl,
            });
            listenerHandle = await plugin.addListener('installStateChanged', async (event) => {
                if (event.gameId !== manifest.gameId) {
                    return;
                }

                const assetBaseUrl = await toAssetBaseUrl(event.assetRootPath);
                if (assetBaseUrl) {
                    options.onInstalledAssetBaseUrl?.(manifest.gameId, assetBaseUrl);
                }

                currentState = mergeGamePackageState(currentState, {
                    status: event.status,
                    progressPercent: clampPercent(event.progressPercent),
                    progressMode: event.progressMode,
                    errorMessage: event.errorMessage,
                    installedVersion: event.assetPackVersion?.trim() || undefined,
                    localAssetBaseUrl: assetBaseUrl,
                });
                logMobileRuntimeCritical('NativeGamePackagePlugin', 'install-state-changed', {
                    gameId: manifest.gameId,
                    status: event.status,
                    progressMode: event.progressMode,
                    progressPercent: event.progressPercent,
                    errorMessage: event.errorMessage,
                    assetPackVersion: event.assetPackVersion,
                });
                options.onStateChange(currentState);
            });

            const result = await plugin.installGamePackage({
                gameId: manifest.gameId,
                runtimeChannel: manifest.runtimeChannel,
                assetPackId: manifest.assetPackId,
                assetPackVersion: manifest.assetPackVersion,
                assetPackUrl: manifest.assetPackUrl!,
                assetPackChecksum: manifest.assetPackChecksum,
            });
            logMobileRuntimeCritical('NativeGamePackagePlugin', 'install-native-call-resolved', {
                gameId: manifest.gameId,
                result,
            });

            const assetBaseUrl = await toAssetBaseUrl(result.assetRootPath);
            if (assetBaseUrl) {
                options.onInstalledAssetBaseUrl?.(manifest.gameId, assetBaseUrl);
            }

            currentState = mergeGamePackageState(currentState, {
                status: 'installed',
                progressMode: undefined,
                progressPercent: undefined,
                errorMessage: undefined,
                installedVersion: result.assetPackVersion?.trim() || manifest.assetPackVersion,
                localAssetBaseUrl: assetBaseUrl,
                updatedAt: typeof result.installedAt === 'number' && Number.isFinite(result.installedAt)
                    ? result.installedAt
                    : Date.now(),
            });
            logMobileRuntimeCritical('NativeGamePackagePlugin', 'install-finished', {
                gameId: manifest.gameId,
                installedVersion: currentState.installedVersion,
                localAssetBaseUrl: currentState.localAssetBaseUrl,
            });
            options.onStateChange(currentState);
            return currentState;
        } catch (error) {
            if (cancelled) {
                logMobileRuntime('NativeGamePackagePlugin', 'install-cancelled', {
                    gameId: manifest.gameId,
                    currentState,
                }, 'warn');
                return currentState;
            }

            const nextState = mergeGamePackageState(currentState, {
                status: 'failed',
                progressMode: undefined,
                progressPercent: undefined,
                errorMessage: error instanceof Error ? error.message : String(error ?? '安装失败'),
            });
            currentState = nextState;
            logMobileRuntimeCritical('NativeGamePackagePlugin', 'install-failed', {
                gameId: manifest.gameId,
                error: error instanceof Error ? error.message : String(error),
                status: nextState.status,
                errorMessage: nextState.errorMessage,
            });
            options.onStateChange(nextState);
            return nextState;
        } finally {
            if (listenerHandle) {
                await listenerHandle.remove().catch(() => {});
            }
        }
    })();

    return {
        cancel: () => {
            cancelled = true;
            logMobileRuntime('NativeGamePackagePlugin', 'install-cancel-requested', {
                gameId: manifest.gameId,
            }, 'warn');
            void plugin.cancelInstall({ gameId: manifest.gameId }).catch(() => {});
        },
        finished,
    };
};
