import type { GamePackageInstallHandle, ResolvedGamePackageManifest, StoredGamePackageState } from './types';
import { logMobileRuntime, logMobileRuntimeCritical } from '../../lib/mobile/mobileRuntimeDebug';
import { mergeGamePackageState } from './types';

type CapacitorCoreModule = {
    Capacitor: {
        isNativePlatform(): boolean;
        getPlatform(): string;
        convertFileSrc(value: string): string;
    };
    registerPlugin: <TPlugin>(name: string) => TPlugin;
};

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

let capacitorCoreLoader: Promise<CapacitorCoreModule | null> | null = null;
let nativePluginLoader: Promise<NativeGamePackagePlugin | null> | null = null;

const runtimeImport = async <TModule,>(specifier: string): Promise<TModule> => {
    const importer = new Function('s', 'return import(s)') as (value: string) => Promise<TModule>;
    return importer(specifier);
};

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

    const capacitorCore = await loadCapacitorCore();
    if (!capacitorCore) {
        return undefined;
    }

    try {
        return capacitorCore.Capacitor.convertFileSrc(assetRootPath);
    } catch {
        return undefined;
    }
};

const loadCapacitorCore = async () => {
    if (!capacitorCoreLoader) {
        capacitorCoreLoader = (async () => {
            try {
                const mod = await runtimeImport<CapacitorCoreModule>('@capacitor/core');
                logMobileRuntimeCritical('NativeGamePackagePlugin', 'capacitor-core-import-ok', {
                    hasCapacitor: Boolean(mod?.Capacitor),
                    hasRegisterPlugin: typeof mod?.registerPlugin === 'function',
                });
                return mod as CapacitorCoreModule;
            } catch (importError) {
                logMobileRuntimeCritical('NativeGamePackagePlugin', 'capacitor-core-import-failed', {
                    error: importError instanceof Error ? importError.message : String(importError),
                });
            }

            // Fallback: use window.Capacitor global injected by the Capacitor bridge
            const win = typeof window !== 'undefined' ? window as unknown as Record<string, unknown> : null;
            const globalCap = win?.Capacitor as CapacitorCoreModule['Capacitor'] | undefined;
            if (globalCap && typeof globalCap.isNativePlatform === 'function') {
                logMobileRuntimeCritical('NativeGamePackagePlugin', 'capacitor-core-global-fallback', {
                    isNative: globalCap.isNativePlatform(),
                    platform: globalCap.getPlatform(),
                });
                const globalRegisterPlugin = (win as Record<string, unknown>)?.capacitorRegisterPlugin
                    ?? (win?.Capacitor as Record<string, unknown>)?.registerPlugin;
                return {
                    Capacitor: globalCap,
                    registerPlugin: typeof globalRegisterPlugin === 'function'
                        ? globalRegisterPlugin as CapacitorCoreModule['registerPlugin']
                        : <TPlugin,>(name: string) => {
                            const plugins = (win?.Capacitor as Record<string, unknown>)?.Plugins as Record<string, unknown> | undefined;
                            return (plugins?.[name] ?? {}) as TPlugin;
                        },
                } satisfies CapacitorCoreModule;
            }

            logMobileRuntimeCritical('NativeGamePackagePlugin', 'capacitor-core-unavailable');
            return null;
        })();
    }

    return capacitorCoreLoader;
};

const getNativePlugin = async () => {
    if (!nativePluginLoader) {
        nativePluginLoader = (async () => {
            const capacitorCore = await loadCapacitorCore();
            if (!capacitorCore) {
                logMobileRuntimeCritical('NativeGamePackagePlugin', 'get-plugin-no-core');
                return null;
            }
            const isNative = capacitorCore.Capacitor.isNativePlatform();
            const platform = capacitorCore.Capacitor.getPlatform();
            logMobileRuntimeCritical('NativeGamePackagePlugin', 'get-plugin-platform-check', {
                isNative,
                platform,
            });
            if (!isNative || platform !== 'android') {
                return null;
            }
            const plugin = capacitorCore.registerPlugin<NativeGamePackagePlugin>('GamePackage');
            logMobileRuntimeCritical('NativeGamePackagePlugin', 'get-plugin-registered', {
                hasPlugin: Boolean(plugin),
                methods: plugin ? Object.keys(plugin).slice(0, 10) : [],
            });
            return plugin;
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
        logMobileRuntime('NativeGamePackagePlugin', 'create-install-handle-missing-asset-pack-url', {
            gameId: manifest.gameId,
            manifest,
        }, 'warn');
        return createNativeFailureHandle(manifest, '当前还没有可下载的游戏包，请先发布一版。', options);
    }

    let cancelled = false;
    let currentState = buildBaseState(manifest);
    let listenerHandle: PluginListenerHandle | null = null;

    const finished = (async () => {
        try {
            logMobileRuntime('NativeGamePackagePlugin', 'install-start', {
                gameId: manifest.gameId,
                manifest,
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
                logMobileRuntime('NativeGamePackagePlugin', 'install-state-changed', {
                    gameId: manifest.gameId,
                    event,
                    currentState,
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
            logMobileRuntime('NativeGamePackagePlugin', 'install-native-call-resolved', {
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
            logMobileRuntime('NativeGamePackagePlugin', 'install-finished', {
                gameId: manifest.gameId,
                currentState,
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
            logMobileRuntime('NativeGamePackagePlugin', 'install-failed', {
                gameId: manifest.gameId,
                error,
                currentState,
            }, 'error');
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
