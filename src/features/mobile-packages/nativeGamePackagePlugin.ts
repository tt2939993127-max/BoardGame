import type { GamePackageInstallHandle, ResolvedGamePackageManifest, StoredGamePackageState } from './types';
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
        capacitorCoreLoader = runtimeImport<CapacitorCoreModule>('@capacitor/core')
            .then((module) => module as CapacitorCoreModule)
            .catch(() => null);
    }

    return capacitorCoreLoader;
};

const getNativePlugin = async () => {
    if (!nativePluginLoader) {
        nativePluginLoader = (async () => {
            const capacitorCore = await loadCapacitorCore();
            if (!capacitorCore) {
                return null;
            }
            if (!capacitorCore.Capacitor.isNativePlatform() || capacitorCore.Capacitor.getPlatform() !== 'android') {
                return null;
            }
            return capacitorCore.registerPlugin<NativeGamePackagePlugin>('GamePackage');
        })();
    }

    return nativePluginLoader;
};

export const listInstalledNativeGamePackages = async (): Promise<NativeInstalledGamePackage[]> => {
    const plugin = await getNativePlugin();
    if (!plugin) {
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

    return installedPackages.filter((item) => Boolean(item.gameId));
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
        return null;
    }

    if (!manifest.assetPackUrl) {
        return createNativeFailureHandle(manifest, '当前还没有可下载的游戏包，请先发布一版。', options);
    }

    let cancelled = false;
    let currentState = buildBaseState(manifest);
    let listenerHandle: PluginListenerHandle | null = null;

    const finished = (async () => {
        try {
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
                options.onStateChange(currentState);
            });

            const result = await plugin.installGamePackage({
                gameId: manifest.gameId,
                runtimeChannel: manifest.runtimeChannel,
                assetPackId: manifest.assetPackId,
                assetPackVersion: manifest.assetPackVersion,
                assetPackUrl: manifest.assetPackUrl,
                assetPackChecksum: manifest.assetPackChecksum,
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
            options.onStateChange(currentState);
            return currentState;
        } catch (error) {
            if (cancelled) {
                return currentState;
            }

            const nextState = mergeGamePackageState(currentState, {
                status: 'failed',
                progressMode: undefined,
                progressPercent: undefined,
                errorMessage: error instanceof Error ? error.message : String(error ?? '安装失败'),
            });
            currentState = nextState;
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
            void plugin.cancelInstall({ gameId: manifest.gameId }).catch(() => {});
        },
        finished,
    };
};
