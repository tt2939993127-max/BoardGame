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
        setMultiDelay(options: {
            delayConditions: Array<{ kind: 'background' | 'kill' | 'date' | 'nativeVersion'; value?: string }>;
        }): Promise<void>;
        addListener(
            eventName: 'downloadFailed' | 'updateFailed' | 'downloadComplete',
            listenerFunc: (event: { bundleId?: string; version?: string; error?: string }) => void,
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
}

export type AndroidLiveUpdateResult =
    | { status: 'disabled' | 'not-native' | 'manifest-missing' | 'up-to-date' }
    | { status: 'incompatible'; version: string; reason: string }
    | { status: 'queued'; version: string; source: 'downloaded' | 'cached' }
    | { status: 'error'; reason: string };

const DEFAULT_OTA_CHANNEL = 'stable';
const DEFAULT_APP_READY_TIMEOUT_MS = 10000;

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
                    console.info('[OTA] bundle 下载完成', event.version || event.bundleId || 'unknown');
                }),
                CapacitorUpdater.addListener('downloadFailed', (event) => {
                    console.warn('[OTA] bundle 下载失败', event.error || 'unknown');
                }),
                CapacitorUpdater.addListener('updateFailed', (event) => {
                    console.warn('[OTA] bundle 更新失败', event.error || 'unknown');
                }),
            ]);

            return handles;
        })();
    }

    return listenerRegistrationPromise;
};

export const startAndroidLiveUpdateBackgroundCheck = async (): Promise<AndroidLiveUpdateResult> => {
    if (!backgroundUpdatePromise) {
        backgroundUpdatePromise = (async () => {
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

            try {
                const { CapacitorUpdater } = updaterModule;
                const current = await CapacitorUpdater.current();
                const compatibility = isManifestCompatibleWithNativeVersion(manifest, current.native);
                if (!compatibility.compatible) {
                    return {
                        status: 'incompatible',
                        version: manifest.version,
                        reason: compatibility.reason || 'bundle 与当前原生版本不兼容',
                    } as const;
                }

                if (current.bundle.version === manifest.version) {
                    return { status: 'up-to-date' } as const;
                }

                const bundleList = await CapacitorUpdater.list();
                const cachedBundle = bundleList.bundles.find((bundle) => bundle.version === manifest.version && bundle.status !== 'error');
                if (cachedBundle) {
                    await queueDownloadedBundle(CapacitorUpdater, cachedBundle.id);
                    return {
                        status: 'queued',
                        version: manifest.version,
                        source: 'cached',
                    } as const;
                }

                const downloadedBundle = await CapacitorUpdater.download({
                    url: normalizeUrl(manifest.url),
                    version: manifest.version,
                    checksum: manifest.checksum,
                });
                await queueDownloadedBundle(CapacitorUpdater, downloadedBundle.id);

                return {
                    status: 'queued',
                    version: manifest.version,
                    source: 'downloaded',
                } as const;
            } catch (error) {
                return {
                    status: 'error',
                    reason: error instanceof Error ? error.message : String(error),
                } as const;
            }
        })();
    }

    return backgroundUpdatePromise;
};
