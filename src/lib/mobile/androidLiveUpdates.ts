type CapacitorCoreModule = {
    Capacitor: {
        isNativePlatform(): boolean;
        getPlatform(): string;
    };
};

type PluginListenerHandle = {
    remove(): Promise<void>;
};

type BundleStatus = 'success' | 'error' | 'pending' | 'downloading';

type BundleInfo = {
    id: string;
    version: string;
    downloaded: string;
    checksum: string;
    status: BundleStatus;
};

type CurrentBundleResult = {
    bundle: BundleInfo;
    native: string;
};

type DownloadEvent = {
    percent: number;
    bundle: BundleInfo;
};

type DownloadFailedEvent = {
    version: string;
};

type UpdateFailedEvent = {
    bundle: BundleInfo;
};

type SetEvent = {
    bundle: BundleInfo;
};

type CapacitorUpdaterModule = {
    CapacitorUpdater: {
        notifyAppReady(): Promise<{ bundle: BundleInfo }>;
        current(): Promise<CurrentBundleResult>;
        list(options?: { raw?: boolean }): Promise<{ bundles: BundleInfo[] }>;
        download(options: {
            url: string;
            version: string;
            checksum?: string;
        }): Promise<BundleInfo>;
        next(options: { id: string }): Promise<BundleInfo>;
        set(options: { id: string }): Promise<void>;
        reload(): Promise<void>;
        setMultiDelay(options: {
            delayConditions: Array<{ kind: 'background' | 'kill' | 'date' | 'nativeVersion'; value?: string }>;
        }): Promise<void>;
        addListener(
            eventName: 'download',
            listenerFunc: (event: DownloadEvent) => void,
        ): Promise<PluginListenerHandle>;
        addListener(
            eventName: 'downloadFailed',
            listenerFunc: (event: DownloadFailedEvent) => void,
        ): Promise<PluginListenerHandle>;
        addListener(
            eventName: 'updateFailed',
            listenerFunc: (event: UpdateFailedEvent) => void,
        ): Promise<PluginListenerHandle>;
        addListener(
            eventName: 'downloadComplete',
            listenerFunc: (event: { bundle: BundleInfo }) => void,
        ): Promise<PluginListenerHandle>;
        addListener(
            eventName: 'set',
            listenerFunc: (event: SetEvent) => void,
        ): Promise<PluginListenerHandle>;
    };
};

export interface AndroidLiveUpdateConfig {
    enabled: boolean;
    manifestUrl: string;
    channel: string;
    appReadyTimeoutMs: number;
}

export interface AndroidOtaManifest {
    version: string;
    url: string;
    checksum?: string;
    channel?: string;
    targetNativeVersion?: string | string[];
    minNativeVersion?: string;
    maxNativeVersion?: string;
    notes?: string;
    publishedAt?: string;
    forceUpdate?: boolean;
    forceUpdateTitle?: string;
    forceUpdateMessage?: string;
}

export type AndroidLiveUpdateResult =
    | { status: 'disabled' | 'not-native' | 'manifest-missing' | 'up-to-date' }
    | { status: 'incompatible'; version: string; reason: string; requiredNativeVersion?: string }
    | { status: 'queued'; version: string; source: 'downloaded' | 'cached'; mode: 'background' | 'immediate' }
    | { status: 'error'; reason: string };

export type AndroidForceUpdatePhase =
    | 'hidden'
    | 'checking'
    | 'downloading'
    | 'applying'
    | 'native-update-required'
    | 'error';

export interface AndroidForceUpdateState {
    phase: AndroidForceUpdatePhase;
    blocking: boolean;
    version?: string;
    progressPercent?: number;
    requiredNativeVersion?: string;
    title?: string;
    message?: string;
    reason?: string;
}

export interface AndroidLiveUpdateStartOptions {
    force?: boolean;
    onForceStateChange?: (state: AndroidForceUpdateState) => void;
}

const DEFAULT_OTA_CHANNEL = 'stable';
const DEFAULT_APP_READY_TIMEOUT_MS = 10000;
const HIDDEN_FORCE_UPDATE_STATE: AndroidForceUpdateState = {
    phase: 'hidden',
    blocking: false,
};

let capacitorCoreLoader: Promise<CapacitorCoreModule | null> | null = null;
let updaterLoader: Promise<CapacitorUpdaterModule | null> | null = null;
let notifyAppReadyPromise: Promise<void> | null = null;
let backgroundUpdatePromise: Promise<AndroidLiveUpdateResult> | null = null;
let listenerRegistrationPromise: Promise<PluginListenerHandle[] | null> | null = null;

const runtimeImport = async <TModule,>(specifier: string): Promise<TModule> => {
    const importer = new Function('s', 'return import(s)') as (value: string) => Promise<TModule>;
    return importer(specifier);
};

const parseBooleanEnv = (value: string | boolean | undefined) => {
    if (typeof value === 'boolean') return value;
    return /^(1|true|yes|on)$/i.test((value || '').trim());
};

const parseTimeoutEnv = (value: string | boolean | undefined) => {
    if (typeof value !== 'string') return DEFAULT_APP_READY_TIMEOUT_MS;
    const parsed = Number.parseInt(value.trim(), 10);
    return Number.isFinite(parsed) && parsed >= 1000 ? parsed : DEFAULT_APP_READY_TIMEOUT_MS;
};

const normalizeUrl = (value: string) => value.replace(/\/+$/, '');
const isAbsoluteHttpUrl = (value: string) => /^https?:\/\//i.test(value);

const normalizeComparableVersion = (value: string) => {
    const [main] = value.split('+');
    return main.trim();
};

const parseVersionParts = (value: string) => normalizeComparableVersion(value)
    .split('.')
    .map((part) => {
        const parsed = Number.parseInt(part, 10);
        return Number.isFinite(parsed) ? parsed : 0;
    });

const clampPercent = (value: number | undefined) => {
    if (typeof value !== 'number' || !Number.isFinite(value)) {
        return undefined;
    }
    return Math.max(0, Math.min(100, Math.round(value)));
};

const emitForceState = (
    onForceStateChange: AndroidLiveUpdateStartOptions['onForceStateChange'],
    state: AndroidForceUpdateState,
) => {
    onForceStateChange?.(state);
};

const resolveManifestRequiredNativeVersion = (manifest: AndroidOtaManifest) => {
    if (typeof manifest.targetNativeVersion === 'string' && manifest.targetNativeVersion.trim()) {
        return manifest.targetNativeVersion.trim();
    }

    if (Array.isArray(manifest.targetNativeVersion) && manifest.targetNativeVersion.length === 1) {
        const onlyVersion = manifest.targetNativeVersion[0]?.trim();
        if (onlyVersion) {
            return onlyVersion;
        }
    }

    const minVersion = manifest.minNativeVersion?.trim();
    if (minVersion) {
        return minVersion;
    }

    return undefined;
};

const buildForceUpdateTitle = (manifest: AndroidOtaManifest, fallback: string) => {
    const customTitle = manifest.forceUpdateTitle?.trim();
    return customTitle || fallback;
};

const buildForceUpdateMessage = (
    manifest: AndroidOtaManifest,
    fallback: string,
) => {
    const customMessage = manifest.forceUpdateMessage?.trim();
    return customMessage || fallback;
};

export const compareVersion = (left: string, right: string) => {
    const leftParts = parseVersionParts(left);
    const rightParts = parseVersionParts(right);
    const maxLength = Math.max(leftParts.length, rightParts.length);

    for (let index = 0; index < maxLength; index += 1) {
        const leftValue = leftParts[index] ?? 0;
        const rightValue = rightParts[index] ?? 0;
        if (leftValue === rightValue) continue;
        return leftValue > rightValue ? 1 : -1;
    }

    return 0;
};

export const readAndroidLiveUpdateConfig = (
    env: Record<string, string | boolean | undefined>,
): AndroidLiveUpdateConfig => {
    const manifestUrl = typeof env.VITE_ANDROID_OTA_MANIFEST_URL === 'string'
        ? env.VITE_ANDROID_OTA_MANIFEST_URL.trim()
        : '';

    return {
        enabled: parseBooleanEnv(env.VITE_ANDROID_OTA_ENABLED) && isAbsoluteHttpUrl(manifestUrl),
        manifestUrl,
        channel: typeof env.VITE_ANDROID_OTA_CHANNEL === 'string' && env.VITE_ANDROID_OTA_CHANNEL.trim()
            ? env.VITE_ANDROID_OTA_CHANNEL.trim()
            : DEFAULT_OTA_CHANNEL,
        appReadyTimeoutMs: parseTimeoutEnv(env.VITE_ANDROID_OTA_APP_READY_TIMEOUT_MS),
    };
};

export const isManifestCompatibleWithNativeVersion = (
    manifest: AndroidOtaManifest,
    nativeVersion: string,
): { compatible: boolean; reason?: string } => {
    const targetVersions = Array.isArray(manifest.targetNativeVersion)
        ? manifest.targetNativeVersion
        : manifest.targetNativeVersion
            ? [manifest.targetNativeVersion]
            : [];

    if (targetVersions.length > 0 && !targetVersions.includes(nativeVersion)) {
        return {
            compatible: false,
            reason: `目标 nativeVersion 不匹配，当前=${nativeVersion}`,
        };
    }

    if (manifest.minNativeVersion && compareVersion(nativeVersion, manifest.minNativeVersion) < 0) {
        return {
            compatible: false,
            reason: `当前 nativeVersion=${nativeVersion} 低于最小要求=${manifest.minNativeVersion}`,
        };
    }

    if (manifest.maxNativeVersion && compareVersion(nativeVersion, manifest.maxNativeVersion) > 0) {
        return {
            compatible: false,
            reason: `当前 nativeVersion=${nativeVersion} 高于最大允许=${manifest.maxNativeVersion}`,
        };
    }

    return { compatible: true };
};

const loadCapacitorCore = async () => {
    if (!capacitorCoreLoader) {
        capacitorCoreLoader = runtimeImport<CapacitorCoreModule>('@capacitor/core')
            .then((module) => module as CapacitorCoreModule)
            .catch(() => null);
    }

    return capacitorCoreLoader;
};

const loadUpdater = async () => {
    if (!updaterLoader) {
        updaterLoader = runtimeImport<CapacitorUpdaterModule>('@capgo/capacitor-updater')
            .then((module) => module as CapacitorUpdaterModule)
            .catch(() => null);
    }

    return updaterLoader;
};

const isNativeAndroidApp = async () => {
    if (typeof window === 'undefined') return false;
    const runtime = (window as typeof window & { Capacitor?: { isNativePlatform?: () => boolean } }).Capacitor;
    if (typeof runtime?.isNativePlatform !== 'function') return false;

    const capacitorCore = await loadCapacitorCore();
    return Boolean(capacitorCore?.Capacitor.isNativePlatform() && capacitorCore.Capacitor.getPlatform() === 'android');
};

const getConfigFromMetaEnv = () => {
    const metaEnv = (import.meta as { env?: Record<string, string | boolean | undefined> }).env ?? {};
    return readAndroidLiveUpdateConfig(metaEnv);
};

const readManifest = async (url: string): Promise<AndroidOtaManifest | null> => {
    try {
        const response = await fetch(url, {
            method: 'GET',
            headers: {
                Accept: 'application/json',
                'Cache-Control': 'no-cache',
            },
            cache: 'no-store',
        });
        if (response.status === 404) {
            return null;
        }
        if (!response.ok) {
            throw new Error(`manifest request failed: ${response.status}`);
        }

        const contentType = response.headers.get('content-type') || '';
        if (!contentType.includes('application/json')) {
            throw new Error(`manifest content-type invalid: ${contentType || 'unknown'}`);
        }

        const data = await response.json() as Partial<AndroidOtaManifest>;
        if (!data.version || !data.url || !isAbsoluteHttpUrl(data.url)) {
            throw new Error('manifest 缺少 version/url 或 url 非法');
        }

        return {
            version: data.version,
            url: data.url,
            checksum: data.checksum,
            channel: data.channel,
            targetNativeVersion: data.targetNativeVersion,
            minNativeVersion: data.minNativeVersion,
            maxNativeVersion: data.maxNativeVersion,
            notes: data.notes,
            publishedAt: data.publishedAt,
            forceUpdate: data.forceUpdate === true,
            forceUpdateTitle: data.forceUpdateTitle,
            forceUpdateMessage: data.forceUpdateMessage,
        };
    } catch (error) {
        console.warn('[OTA] 读取 manifest 失败', error);
        return null;
    }
};

const queueDownloadedBundle = async (
    updater: CapacitorUpdaterModule['CapacitorUpdater'],
    bundleId: string,
) => {
    await updater.next({ id: bundleId });
    await updater.setMultiDelay({
        delayConditions: [{ kind: 'background' }],
    });
};

const removeListenerSafely = async (handle: PluginListenerHandle | null) => {
    if (!handle) return;
    try {
        await handle.remove();
    } catch {
        // 忽略监听器清理失败，避免覆盖主错误。
    }
};

const applyBundleImmediately = async (
    updater: CapacitorUpdaterModule['CapacitorUpdater'],
    bundleId: string,
) => {
    await updater.set({ id: bundleId });
};

export const notifyAndroidBundleReady = async () => {
    if (!notifyAppReadyPromise) {
        notifyAppReadyPromise = (async () => {
            const nativeAndroid = await isNativeAndroidApp();
            if (!nativeAndroid) return;

            const updaterModule = await loadUpdater();
            if (!updaterModule) return;

            try {
                await updaterModule.CapacitorUpdater.notifyAppReady();
            } catch (error) {
                console.warn('[OTA] notifyAppReady 调用失败', error);
            }
        })();
    }

    return notifyAppReadyPromise;
};

export const registerAndroidLiveUpdateListeners = async () => {
    if (!listenerRegistrationPromise) {
        listenerRegistrationPromise = (async () => {
            const nativeAndroid = await isNativeAndroidApp();
            if (!nativeAndroid) return null;

            const updaterModule = await loadUpdater();
            if (!updaterModule) return null;

            const { CapacitorUpdater } = updaterModule;
            const handles = await Promise.all([
                CapacitorUpdater.addListener('downloadComplete', (event) => {
                    console.info('[OTA] bundle 下载完成', event.bundle.version || event.bundle.id || 'unknown');
                }),
                CapacitorUpdater.addListener('downloadFailed', (event) => {
                    console.warn('[OTA] bundle 下载失败', event.version || 'unknown');
                }),
                CapacitorUpdater.addListener('updateFailed', (event) => {
                    console.warn('[OTA] bundle 更新失败', event.bundle.version || event.bundle.id || 'unknown');
                }),
                CapacitorUpdater.addListener('set', (event) => {
                    console.info('[OTA] bundle 已切换', event.bundle.version || event.bundle.id || 'unknown');
                }),
            ]);

            return handles;
        })();
    }

    return listenerRegistrationPromise;
};

export const startAndroidLiveUpdateBackgroundCheck = async (
    options: AndroidLiveUpdateStartOptions = {},
): Promise<AndroidLiveUpdateResult> => {
    if (options.force) {
        backgroundUpdatePromise = null;
    }

    if (!backgroundUpdatePromise) {
        backgroundUpdatePromise = (async () => {
            const { onForceStateChange } = options;
            emitForceState(onForceStateChange, HIDDEN_FORCE_UPDATE_STATE);

            const config = getConfigFromMetaEnv();
            if (!config.enabled) {
                return { status: 'disabled' } as const;
            }

            const nativeAndroid = await isNativeAndroidApp();
            if (!nativeAndroid) {
                return { status: 'not-native' } as const;
            }

            const updaterModule = await loadUpdater();
            if (!updaterModule) {
                return { status: 'error', reason: '未能加载 OTA 插件' } as const;
            }

            const manifest = await readManifest(config.manifestUrl);
            if (!manifest) {
                return { status: 'manifest-missing' } as const;
            }

            const isForceUpdate = manifest.forceUpdate === true;
            if (isForceUpdate) {
                emitForceState(onForceStateChange, {
                    phase: 'checking',
                    blocking: true,
                    version: manifest.version,
                    title: buildForceUpdateTitle(manifest, '正在准备更新'),
                    message: buildForceUpdateMessage(manifest, '正在检查并准备新版本，请稍候。'),
                });
            }

            try {
                const { CapacitorUpdater } = updaterModule;
                const current = await CapacitorUpdater.current();
                const compatibility = isManifestCompatibleWithNativeVersion(manifest, current.native);
                if (!compatibility.compatible) {
                    const requiredNativeVersion = resolveManifestRequiredNativeVersion(manifest);
                    if (isForceUpdate) {
                        emitForceState(onForceStateChange, {
                            phase: 'native-update-required',
                            blocking: true,
                            version: manifest.version,
                            requiredNativeVersion,
                            title: buildForceUpdateTitle(manifest, '需要更新 App'),
                            message: buildForceUpdateMessage(
                                manifest,
                                requiredNativeVersion
                                    ? `当前 App 版本过旧，需要升级到 ${requiredNativeVersion} 或更高版本后继续使用。`
                                    : '当前 App 版本过旧，需要先安装新版本后继续使用。',
                            ),
                            reason: compatibility.reason,
                        });
                    } else {
                        emitForceState(onForceStateChange, HIDDEN_FORCE_UPDATE_STATE);
                    }
                    return {
                        status: 'incompatible',
                        version: manifest.version,
                        reason: compatibility.reason || 'bundle 与当前原生版本不兼容',
                        requiredNativeVersion,
                    } as const;
                }

                if (current.bundle.version === manifest.version) {
                    emitForceState(onForceStateChange, HIDDEN_FORCE_UPDATE_STATE);
                    return { status: 'up-to-date' } as const;
                }

                const bundleList = await CapacitorUpdater.list();
                const cachedBundle = bundleList.bundles.find((bundle) => bundle.version === manifest.version && bundle.status !== 'error');
                if (cachedBundle) {
                    if (isForceUpdate) {
                        emitForceState(onForceStateChange, {
                            phase: 'applying',
                            blocking: true,
                            version: manifest.version,
                            progressPercent: 100,
                            title: buildForceUpdateTitle(manifest, '正在切换新版本'),
                            message: buildForceUpdateMessage(manifest, '更新包已准备完成，正在重启并切换到新版本。'),
                        });
                        await applyBundleImmediately(CapacitorUpdater, cachedBundle.id);
                        return {
                            status: 'queued',
                            version: manifest.version,
                            source: 'cached',
                            mode: 'immediate',
                        } as const;
                    }

                    await queueDownloadedBundle(CapacitorUpdater, cachedBundle.id);
                    emitForceState(onForceStateChange, HIDDEN_FORCE_UPDATE_STATE);
                    return {
                        status: 'queued',
                        version: manifest.version,
                        source: 'cached',
                        mode: isForceUpdate ? 'immediate' : 'background',
                    } as const;
                }

                let downloadHandle: PluginListenerHandle | null = null;
                if (isForceUpdate) {
                    downloadHandle = await CapacitorUpdater.addListener('download', (event) => {
                        emitForceState(onForceStateChange, {
                            phase: 'downloading',
                            blocking: true,
                            version: manifest.version,
                            progressPercent: clampPercent(event.percent),
                            title: buildForceUpdateTitle(manifest, '正在下载更新'),
                            message: buildForceUpdateMessage(manifest, '正在下载必要更新，完成后会自动切换。'),
                        });
                    });
                }

                try {
                    const downloadedBundle = await CapacitorUpdater.download({
                        url: normalizeUrl(manifest.url),
                        version: manifest.version,
                        checksum: manifest.checksum,
                    });

                    await removeListenerSafely(downloadHandle);

                    if (isForceUpdate) {
                        emitForceState(onForceStateChange, {
                            phase: 'applying',
                            blocking: true,
                            version: manifest.version,
                            progressPercent: 100,
                            title: buildForceUpdateTitle(manifest, '正在切换新版本'),
                            message: buildForceUpdateMessage(manifest, '更新已下载完成，正在重启并切换到新版本。'),
                        });
                        await applyBundleImmediately(CapacitorUpdater, downloadedBundle.id);
                        return {
                            status: 'queued',
                            version: manifest.version,
                            source: 'downloaded',
                            mode: 'immediate',
                        } as const;
                    }

                    await queueDownloadedBundle(CapacitorUpdater, downloadedBundle.id);
                    emitForceState(onForceStateChange, HIDDEN_FORCE_UPDATE_STATE);
                    return {
                        status: 'queued',
                        version: manifest.version,
                        source: 'downloaded',
                        mode: isForceUpdate ? 'immediate' : 'background',
                    } as const;
                } catch (error) {
                    await removeListenerSafely(downloadHandle);
                    throw error;
                }
            } catch (error) {
                const reason = error instanceof Error ? error.message : String(error);
                if (isForceUpdate) {
                    emitForceState(onForceStateChange, {
                        phase: 'error',
                        blocking: true,
                        version: manifest.version,
                        title: buildForceUpdateTitle(manifest, '更新失败'),
                        message: buildForceUpdateMessage(manifest, '下载或切换新版本失败，请重试。'),
                        reason,
                    });
                }
                return {
                    status: 'error',
                    reason,
                } as const;
            }
        })();
    }

    return backgroundUpdatePromise;
};
