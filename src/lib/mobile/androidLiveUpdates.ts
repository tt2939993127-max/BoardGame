import { Capacitor } from '@capacitor/core';
import { logMobileRuntime, logMobileRuntimeCritical } from './mobileRuntimeDebug';

type PluginListenerHandle = {
    remove(): Promise<void>;
};

type CapacitorRuntimeLike = {
    getPlatform?: () => string;
    isNativePlatform?: () => boolean;
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

export interface AndroidLiveUpdateSnapshot {
    enabled: boolean;
    manifestUrl: string;
    channel: string;
    nativeAndroid: boolean;
    updaterLoaded: boolean;
    nativeVersion?: string;
    currentBundleVersion?: string;
    currentBundleId?: string;
    currentBundleStatus?: BundleStatus;
    manifestVersion?: string;
    manifestForceUpdate?: boolean;
    compatible?: boolean;
    compatibilityReason?: string;
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

let updaterLoader: Promise<CapacitorUpdaterModule | null> | null = null;
let notifyAppReadyPromise: Promise<void> | null = null;
let backgroundUpdatePromise: Promise<AndroidLiveUpdateResult> | null = null;
let listenerRegistrationPromise: Promise<PluginListenerHandle[] | null> | null = null;

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

const safeInvoke = <T,>(fn: () => T): T | undefined => {
    try {
        return fn();
    } catch {
        return undefined;
    }
};

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

const withTimeout = async <T,>(
    promise: Promise<T>,
    timeoutMs: number,
    errorMessage: string,
): Promise<T> => {
    let timer: ReturnType<typeof setTimeout> | null = null;

    try {
        return await Promise.race([
            promise,
            new Promise<T>((_, reject) => {
                timer = setTimeout(() => {
                    reject(new Error(errorMessage));
                }, timeoutMs);
            }),
        ]);
    } finally {
        if (timer) {
            clearTimeout(timer);
        }
    }
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

const emitCriticalOtaLog = (
    stage: string,
    payload?: Record<string, unknown>,
) => {
    logMobileRuntimeCritical('OTA', stage, payload);
};

const updateOtaDebugState = (_patch: Record<string, unknown>) => {};

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

const loadUpdater = async () => {
    if (!updaterLoader) {
        updaterLoader = import('@capgo/capacitor-updater')
            .then((module) => {
                const updaterModule = module as CapacitorUpdaterModule;
                emitCriticalOtaLog('updater-module-loaded', {
                    hasCapacitorUpdater: Boolean(updaterModule.CapacitorUpdater),
                });
                return updaterModule;
            })
            .catch((error) => {
                const reason = error instanceof Error ? error.message : String(error);
                emitCriticalOtaLog('updater-module-load-failed', { reason });
                return null;
            });
    }

    return updaterLoader;
};

type NativeAndroidRuntimeDiagnostics = {
    nativeAndroid: boolean;
    importCapacitorPlatform?: string;
    importCapacitorNative?: boolean;
    windowCapacitorPlatform?: string;
    windowCapacitorNative?: boolean;
    hasAndroidBridge: boolean;
    summary: string;
};

const toNativeDebugPatch = (_diagnostics: NativeAndroidRuntimeDiagnostics) => ({});

const buildNativeRuntimeDiagnostics = (): NativeAndroidRuntimeDiagnostics => {
    if (typeof window === 'undefined') {
        return {
            nativeAndroid: false,
            hasAndroidBridge: false,
            summary: 'window:none',
        };
    }

    const importCapacitorPlatform = safeInvoke(() => Capacitor.getPlatform());
    const importCapacitorNative = safeInvoke(() => Capacitor.isNativePlatform());
    const windowCapacitor = (window as typeof window & { Capacitor?: CapacitorRuntimeLike }).Capacitor;
    const windowCapacitorPlatform = safeInvoke(() => windowCapacitor?.getPlatform?.());
    const windowCapacitorNative = safeInvoke(() => windowCapacitor?.isNativePlatform?.());
    const hasAndroidBridge = Boolean((window as typeof window & { androidBridge?: unknown }).androidBridge);
    const nativeAndroid = Boolean(
        hasAndroidBridge
        || (importCapacitorNative && importCapacitorPlatform === 'android')
        || (windowCapacitorNative && windowCapacitorPlatform === 'android'),
    );

    return {
        nativeAndroid,
        importCapacitorPlatform,
        importCapacitorNative,
        windowCapacitorPlatform,
        windowCapacitorNative,
        hasAndroidBridge,
        summary: `import:${String(importCapacitorNative)}/${importCapacitorPlatform ?? '?'} win:${String(windowCapacitorNative)}/${windowCapacitorPlatform ?? '?'} bridge:${hasAndroidBridge ? '1' : '0'}`,
    };
};

const isNativeAndroidApp = async () => {
    const diagnostics = buildNativeRuntimeDiagnostics();
    emitCriticalOtaLog('native-runtime-check', diagnostics);
    return diagnostics.nativeAndroid;
};

const getConfigFromMetaEnv = () => {
    const metaEnv = (import.meta as { env?: Record<string, string | boolean | undefined> }).env ?? {};
    return readAndroidLiveUpdateConfig(metaEnv);
};

const readManifest = async (url: string): Promise<AndroidOtaManifest | null> => {
    logMobileRuntime('OTA', 'manifest-fetch-start', { url });
    emitCriticalOtaLog('manifest-fetch-start', { url });
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
            logMobileRuntime('OTA', 'manifest-fetch-404', { url }, 'warn');
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

        const manifest = {
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
        logMobileRuntime('OTA', 'manifest-fetch-success', {
            url,
            manifest,
        });
        emitCriticalOtaLog('manifest-fetch-success', {
            url,
            manifestVersion: manifest.version,
            manifestForceUpdate: manifest.forceUpdate === true,
            targetNativeVersion: manifest.targetNativeVersion,
            minNativeVersion: manifest.minNativeVersion,
            maxNativeVersion: manifest.maxNativeVersion,
        });
        return manifest;
    } catch (error) {
        console.warn('[OTA] 读取 manifest 失败', error);
        logMobileRuntime('OTA', 'manifest-fetch-failed', {
            url,
            error,
        }, 'error');
        emitCriticalOtaLog('manifest-fetch-failed', {
            url,
            error,
        });
        return null;
    }
};

export const readAndroidLiveUpdateSnapshot = async (): Promise<AndroidLiveUpdateSnapshot> => {
    const config = getConfigFromMetaEnv();
    const baseSnapshot: AndroidLiveUpdateSnapshot = {
        enabled: config.enabled,
        manifestUrl: config.manifestUrl,
        channel: config.channel,
        nativeAndroid: false,
        updaterLoaded: false,
    };

    emitCriticalOtaLog('snapshot-read-start', {
        enabled: config.enabled,
        manifestUrl: config.manifestUrl,
        channel: config.channel,
    });

    if (!config.enabled) {
        emitCriticalOtaLog('snapshot-read-disabled', baseSnapshot);
        return baseSnapshot;
    }

    const nativeDiagnostics = buildNativeRuntimeDiagnostics();
    emitCriticalOtaLog('native-runtime-check', {
        context: 'snapshot-read',
        ...nativeDiagnostics,
    });
    const nativeAndroid = nativeDiagnostics.nativeAndroid;
    if (!nativeAndroid) {
        const snapshot = {
            ...baseSnapshot,
            nativeAndroid,
        };
        emitCriticalOtaLog('snapshot-read-not-native', {
            ...snapshot,
            ...nativeDiagnostics,
        });
        return snapshot;
    }

    const updaterModule = await loadUpdater();
    if (!updaterModule) {
        const snapshot = {
            ...baseSnapshot,
            nativeAndroid: true,
            updaterLoaded: false,
        };
        emitCriticalOtaLog('snapshot-read-updater-missing', snapshot);
        return snapshot;
    }

    const manifest = await readManifest(config.manifestUrl);
    const current = await updaterModule.CapacitorUpdater.current();
    const compatibility = manifest
        ? isManifestCompatibleWithNativeVersion(manifest, current.native)
        : undefined;

    const snapshot: AndroidLiveUpdateSnapshot = {
        ...baseSnapshot,
        nativeAndroid: true,
        updaterLoaded: true,
        nativeVersion: current.native,
        currentBundleVersion: current.bundle.version,
        currentBundleId: current.bundle.id,
        currentBundleStatus: current.bundle.status,
        manifestVersion: manifest?.version,
        manifestForceUpdate: manifest?.forceUpdate === true,
        compatible: compatibility?.compatible,
        compatibilityReason: compatibility?.reason,
    };
    emitCriticalOtaLog('snapshot-read-success', snapshot);
    return snapshot;
};

const queueDownloadedBundle = async (
    updater: CapacitorUpdaterModule['CapacitorUpdater'],
    bundleId: string,
) => {
    await updater.next({ id: bundleId });
    await updater.setMultiDelay({
        // Capgo 的 background delay 需要显式毫秒值；传空值会导致“已下载但切后台不生效”的假象。
        delayConditions: [{ kind: 'background', value: '0' }],
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
            const nativeDiagnostics = buildNativeRuntimeDiagnostics();
            const nativeAndroid = nativeDiagnostics.nativeAndroid;
            logMobileRuntime('OTA', 'notify-app-ready-native-check', {
                nativeAndroid,
                ...nativeDiagnostics,
            });
            updateOtaDebugState({
                stage: 'notify-app-ready-native-check',
                ...toNativeDebugPatch(nativeDiagnostics),
            });
            if (!nativeAndroid) return;

            const updaterModule = await loadUpdater();
            logMobileRuntime('OTA', 'notify-app-ready-updater-check', {
                updaterLoaded: Boolean(updaterModule),
            });
            updateOtaDebugState({
                stage: 'notify-app-ready-updater-check',
                updaterLoaded: Boolean(updaterModule),
            });
            if (!updaterModule) return;

            try {
                await updaterModule.CapacitorUpdater.notifyAppReady();
                logMobileRuntime('OTA', 'notify-app-ready-success');
                emitCriticalOtaLog('notify-app-ready-success');
                updateOtaDebugState({
                    stage: 'notify-app-ready-success',
                });
            } catch (error) {
                console.warn('[OTA] notifyAppReady 调用失败', error);
                logMobileRuntime('OTA', 'notify-app-ready-failed', { error }, 'error');
                emitCriticalOtaLog('notify-app-ready-failed', { error });
                updateOtaDebugState({
                    stage: 'notify-app-ready-failed',
                    reason: error instanceof Error ? error.message : String(error),
                });
            }
        })();
    }

    return notifyAppReadyPromise;
};

export const registerAndroidLiveUpdateListeners = async () => {
    if (!listenerRegistrationPromise) {
        listenerRegistrationPromise = (async () => {
            const nativeDiagnostics = buildNativeRuntimeDiagnostics();
            const nativeAndroid = nativeDiagnostics.nativeAndroid;
            if (!nativeAndroid) return null;

            const updaterModule = await loadUpdater();
            logMobileRuntime('OTA', 'register-listeners-updater-check', {
                updaterLoaded: Boolean(updaterModule),
            });
            updateOtaDebugState({
                stage: 'register-listeners-updater-check',
                updaterLoaded: Boolean(updaterModule),
            });
            if (!updaterModule) return null;

            const { CapacitorUpdater } = updaterModule;
            const handles = await Promise.all([
                CapacitorUpdater.addListener('downloadComplete', (event) => {
                    console.info('[OTA] bundle 下载完成', event.bundle.version || event.bundle.id || 'unknown');
                    updateOtaDebugState({
                        stage: 'listener-download-complete',
                        currentBundleVersion: event.bundle.version,
                        currentBundleId: event.bundle.id,
                        currentBundleStatus: event.bundle.status,
                    });
                }),
                CapacitorUpdater.addListener('downloadFailed', (event) => {
                    console.warn('[OTA] bundle 下载失败', event.version || 'unknown');
                    updateOtaDebugState({
                        stage: 'listener-download-failed',
                        reason: event.version,
                    });
                }),
                CapacitorUpdater.addListener('updateFailed', (event) => {
                    console.warn('[OTA] bundle 更新失败', event.bundle.version || event.bundle.id || 'unknown');
                    updateOtaDebugState({
                        stage: 'listener-update-failed',
                        currentBundleVersion: event.bundle.version,
                        currentBundleId: event.bundle.id,
                        currentBundleStatus: event.bundle.status,
                    });
                }),
                CapacitorUpdater.addListener('set', (event) => {
                    console.info('[OTA] bundle 已切换', event.bundle.version || event.bundle.id || 'unknown');
                    updateOtaDebugState({
                        stage: 'listener-set',
                        currentBundleVersion: event.bundle.version,
                        currentBundleId: event.bundle.id,
                        currentBundleStatus: event.bundle.status,
                    });
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
            emitCriticalOtaLog('background-check-start', {
                force: options.force === true,
                enabled: config.enabled,
                manifestUrl: config.manifestUrl,
                channel: config.channel,
            });
            updateOtaDebugState({
                stage: 'background-check-start',
                resultStatus: undefined,
                reason: undefined,
            });
            logMobileRuntime('OTA', 'background-check-start', {
                force: options.force === true,
                config,
            });
            if (!config.enabled) {
                logMobileRuntime('OTA', 'background-check-disabled', { config }, 'warn');
                emitCriticalOtaLog('background-check-disabled', { config });
                updateOtaDebugState({
                    stage: 'background-check-disabled',
                    resultStatus: 'disabled',
                });
                return { status: 'disabled' } as const;
            }

            const nativeDiagnostics = buildNativeRuntimeDiagnostics();
            const nativeAndroid = nativeDiagnostics.nativeAndroid;
            logMobileRuntime('OTA', 'background-check-native-check', {
                nativeAndroid,
                ...nativeDiagnostics,
            });
            if (!nativeAndroid) {
                emitCriticalOtaLog('background-check-not-native', nativeDiagnostics);
                updateOtaDebugState({
                    stage: 'background-check-not-native',
                    resultStatus: 'not-native',
                    ...toNativeDebugPatch(nativeDiagnostics),
                });
                return { status: 'not-native' } as const;
            }

            const nativeOperationTimeoutMs = Math.max(config.appReadyTimeoutMs, 8000);

            const updaterModule = await loadUpdater();
            if (!updaterModule) {
                logMobileRuntime('OTA', 'background-check-updater-missing', {}, 'error');
                emitCriticalOtaLog('background-check-updater-missing');
                updateOtaDebugState({
                    stage: 'background-check-updater-missing',
                    resultStatus: 'error',
                    nativeAndroid: true,
                    updaterLoaded: false,
                    reason: '未能加载 OTA 插件',
                });
                return { status: 'error', reason: '未能加载 OTA 插件' } as const;
            }

            const manifest = await readManifest(config.manifestUrl);
            if (!manifest) {
                logMobileRuntime('OTA', 'background-check-manifest-missing', {
                    manifestUrl: config.manifestUrl,
                }, 'warn');
                emitCriticalOtaLog('background-check-manifest-missing', {
                    manifestUrl: config.manifestUrl,
                });
                updateOtaDebugState({
                    stage: 'background-check-manifest-missing',
                    resultStatus: 'manifest-missing',
                });
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
                const current = await withTimeout(
                    CapacitorUpdater.current(),
                    nativeOperationTimeoutMs,
                    `OTA 校验超时：读取当前 bundle 超过 ${nativeOperationTimeoutMs}ms`,
                );
                emitCriticalOtaLog('current-bundle-read', {
                    nativeVersion: current.native,
                    currentBundleVersion: current.bundle.version,
                    currentBundleId: current.bundle.id,
                    currentBundleStatus: current.bundle.status,
                    manifestVersion: manifest.version,
                });
                updateOtaDebugState({
                    stage: 'current-bundle-read',
                    nativeVersion: current.native,
                    currentBundleVersion: current.bundle.version,
                    currentBundleId: current.bundle.id,
                    currentBundleStatus: current.bundle.status,
                    manifestVersion: manifest.version,
                });
                logMobileRuntime('OTA', 'current-bundle-read', {
                    current,
                });
                const compatibility = isManifestCompatibleWithNativeVersion(manifest, current.native);
                emitCriticalOtaLog('compatibility-checked', {
                    manifestVersion: manifest.version,
                    nativeVersion: current.native,
                    compatible: compatibility.compatible,
                    reason: compatibility.reason,
                });
                updateOtaDebugState({
                    stage: 'compatibility-checked',
                    nativeVersion: current.native,
                    compatible: compatibility.compatible,
                    compatibilityReason: compatibility.reason,
                });
                logMobileRuntime('OTA', 'compatibility-checked', {
                    manifestVersion: manifest.version,
                    nativeVersion: current.native,
                    compatibility,
                });
                if (!compatibility.compatible) {
                    const requiredNativeVersion = resolveManifestRequiredNativeVersion(manifest);
                    emitCriticalOtaLog('compatibility-incompatible', {
                        manifestVersion: manifest.version,
                        nativeVersion: current.native,
                        requiredNativeVersion,
                        reason: compatibility.reason,
                        forceUpdate: isForceUpdate,
                    });
                    updateOtaDebugState({
                        stage: 'compatibility-incompatible',
                        resultStatus: 'incompatible',
                        reason: compatibility.reason,
                        compatible: false,
                    });
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
                    emitCriticalOtaLog('already-up-to-date', {
                        currentVersion: current.bundle.version,
                        manifestVersion: manifest.version,
                    });
                    logMobileRuntime('OTA', 'already-up-to-date', {
                        currentVersion: current.bundle.version,
                        manifestVersion: manifest.version,
                    });
                    emitForceState(onForceStateChange, HIDDEN_FORCE_UPDATE_STATE);
                    return { status: 'up-to-date' } as const;
                }

                const bundleList = await withTimeout(
                    CapacitorUpdater.list(),
                    nativeOperationTimeoutMs,
                    `OTA 校验超时：读取本地 bundle 列表超过 ${nativeOperationTimeoutMs}ms`,
                );
                const cachedBundle = bundleList.bundles.find((bundle) => bundle.version === manifest.version && bundle.status !== 'error');
                if (cachedBundle) {
                    emitCriticalOtaLog('cached-bundle-hit', {
                        bundleId: cachedBundle.id,
                        version: cachedBundle.version,
                        status: cachedBundle.status,
                        forceUpdate: isForceUpdate,
                    });
                    updateOtaDebugState({
                        stage: 'cached-bundle-hit',
                        currentBundleVersion: cachedBundle.version,
                        currentBundleId: cachedBundle.id,
                        currentBundleStatus: cachedBundle.status,
                    });
                    logMobileRuntime('OTA', 'cached-bundle-hit', {
                        cachedBundle,
                    });
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
                        emitCriticalOtaLog('cached-bundle-applied-immediately', {
                            bundleId: cachedBundle.id,
                            version: manifest.version,
                        });
                        updateOtaDebugState({
                            stage: 'cached-bundle-applied-immediately',
                            resultStatus: 'queued',
                            currentBundleVersion: manifest.version,
                            currentBundleId: cachedBundle.id,
                        });
                        return {
                            status: 'queued',
                            version: manifest.version,
                            source: 'cached',
                            mode: 'immediate',
                        } as const;
                    }

                    await queueDownloadedBundle(CapacitorUpdater, cachedBundle.id);
                    emitCriticalOtaLog('cached-bundle-queued', {
                        bundleId: cachedBundle.id,
                        version: manifest.version,
                    });
                    updateOtaDebugState({
                        stage: 'cached-bundle-queued',
                        resultStatus: 'queued',
                        currentBundleVersion: manifest.version,
                        currentBundleId: cachedBundle.id,
                    });
                    logMobileRuntime('OTA', 'cached-bundle-queued', {
                        bundleId: cachedBundle.id,
                        version: manifest.version,
                    });
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
                    emitForceState(onForceStateChange, {
                        phase: 'downloading',
                        blocking: true,
                        version: manifest.version,
                        title: buildForceUpdateTitle(manifest, '正在下载更新'),
                        message: buildForceUpdateMessage(manifest, '正在下载必要更新，完成后会自动切换。'),
                    });
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
                    logMobileRuntime('OTA', 'download-start', {
                        manifestVersion: manifest.version,
                        bundleUrl: normalizeUrl(manifest.url),
                        checksum: manifest.checksum ?? '',
                        forceUpdate: isForceUpdate,
                    });
                    emitCriticalOtaLog('download-start', {
                        manifestVersion: manifest.version,
                        bundleUrl: normalizeUrl(manifest.url),
                        checksum: manifest.checksum ?? '',
                        forceUpdate: isForceUpdate,
                    });
                    updateOtaDebugState({
                        stage: 'download-start',
                        manifestVersion: manifest.version,
                    });
                    const downloadedBundle = await CapacitorUpdater.download({
                        url: normalizeUrl(manifest.url),
                        version: manifest.version,
                        checksum: manifest.checksum,
                    });
                    emitCriticalOtaLog('download-finished', {
                        downloadedBundle,
                    });
                    updateOtaDebugState({
                        stage: 'download-finished',
                        currentBundleVersion: downloadedBundle.version,
                        currentBundleId: downloadedBundle.id,
                        currentBundleStatus: downloadedBundle.status,
                    });
                    logMobileRuntime('OTA', 'download-finished', {
                        downloadedBundle,
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
                        emitCriticalOtaLog('downloaded-bundle-applied-immediately', {
                            bundleId: downloadedBundle.id,
                            version: manifest.version,
                        });
                        updateOtaDebugState({
                            stage: 'downloaded-bundle-applied-immediately',
                            resultStatus: 'queued',
                            currentBundleVersion: manifest.version,
                            currentBundleId: downloadedBundle.id,
                        });
                        logMobileRuntime('OTA', 'downloaded-bundle-applied-immediately', {
                            bundleId: downloadedBundle.id,
                            version: manifest.version,
                        });
                        return {
                            status: 'queued',
                            version: manifest.version,
                            source: 'downloaded',
                            mode: 'immediate',
                        } as const;
                    }

                    await queueDownloadedBundle(CapacitorUpdater, downloadedBundle.id);
                    emitCriticalOtaLog('downloaded-bundle-queued', {
                        bundleId: downloadedBundle.id,
                        version: manifest.version,
                    });
                    updateOtaDebugState({
                        stage: 'downloaded-bundle-queued',
                        resultStatus: 'queued',
                        currentBundleVersion: manifest.version,
                        currentBundleId: downloadedBundle.id,
                    });
                    logMobileRuntime('OTA', 'downloaded-bundle-queued', {
                        bundleId: downloadedBundle.id,
                        version: manifest.version,
                    });
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
                logMobileRuntime('OTA', 'background-check-failed', {
                    manifestVersion: manifest.version,
                    reason,
                }, 'error');
                emitCriticalOtaLog('background-check-failed', {
                    manifestVersion: manifest.version,
                    reason,
                });
                updateOtaDebugState({
                    stage: 'background-check-failed',
                    resultStatus: 'error',
                    reason,
                    manifestVersion: manifest.version,
                });
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
