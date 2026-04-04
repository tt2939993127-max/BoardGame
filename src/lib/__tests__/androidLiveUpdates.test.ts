import {
    compareVersion,
    isManifestCompatibleWithNativeVersion,
    readAndroidLiveUpdateConfig,
} from '../mobile/androidLiveUpdates';
import {
    getSocketIoTransports,
    shouldTryAllSocketTransports,
} from '../socketConnectionConfig';
import {
    isAndroidNativeUpdateAvailable,
    readAndroidNativeUpdateConfig,
    type AndroidAppInfo,
} from '../mobile/androidNativeUpdates';
import { detectNativeAndroidRuntime } from '../mobile/androidRuntime';
import {
    resolveOtaForceUpdateOptions,
} from '../../../scripts/mobile/ota-publish-config.mjs';

afterEach(() => {
    vi.clearAllMocks();
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
});

describe('androidLiveUpdates', () => {
    it('读取 OTA 配置时，只有启用且 manifest URL 合法才算开启', () => {
        expect(readAndroidLiveUpdateConfig({
            VITE_ANDROID_OTA_ENABLED: 'true',
            VITE_ANDROID_OTA_MANIFEST_URL: 'https://assets.easyboardgame.top/official/app-updates/android/stable/latest.json',
            VITE_ANDROID_OTA_CHANNEL: 'stable',
            VITE_ANDROID_OTA_APP_READY_TIMEOUT_MS: '15000',
        })).toEqual({
            enabled: true,
            manifestUrl: 'https://assets.easyboardgame.top/official/app-updates/android/stable/latest.json',
            channel: 'stable',
            appReadyTimeoutMs: 15000,
        });

        expect(readAndroidLiveUpdateConfig({
            VITE_ANDROID_OTA_ENABLED: 'true',
            VITE_ANDROID_OTA_MANIFEST_URL: '/relative.json',
        }).enabled).toBe(false);
    });

    it('版本比较按数值段处理', () => {
        expect(compareVersion('1.2.0', '1.1.9')).toBe(1);
        expect(compareVersion('1.2.0', '1.2.0')).toBe(0);
        expect(compareVersion('1.2.0', '1.2.1')).toBe(-1);
        expect(compareVersion('1.2.0+20260329', '1.2.0')).toBe(0);
    });

    it('manifest 兼容性支持 targetNativeVersion 精确命中', () => {
        expect(isManifestCompatibleWithNativeVersion({
            version: '0.5.0-ota.1',
            url: 'https://example.com/bundle.zip',
            targetNativeVersion: '0.5.0',
        }, '0.5.0')).toEqual({ compatible: true });

        expect(isManifestCompatibleWithNativeVersion({
            version: '0.5.0-ota.1',
            url: 'https://example.com/bundle.zip',
            targetNativeVersion: ['0.5.0', '0.5.1'],
        }, '0.5.2').compatible).toBe(false);
    });

    it('manifest 兼容性支持 min/max nativeVersion 门控', () => {
        expect(isManifestCompatibleWithNativeVersion({
            version: '0.5.0-ota.1',
            url: 'https://example.com/bundle.zip',
            minNativeVersion: '0.5.0',
            maxNativeVersion: '0.5.9',
        }, '0.5.3')).toEqual({ compatible: true });

        expect(isManifestCompatibleWithNativeVersion({
            version: '0.5.0-ota.1',
            url: 'https://example.com/bundle.zip',
            minNativeVersion: '0.5.4',
        }, '0.5.3').compatible).toBe(false);

        expect(isManifestCompatibleWithNativeVersion({
            version: '0.5.0-ota.1',
            url: 'https://example.com/bundle.zip',
            maxNativeVersion: '0.5.2',
        }, '0.5.3').compatible).toBe(false);
    });

    it('OTA 发布默认不再写强制更新字段', () => {
        expect(resolveOtaForceUpdateOptions()).toEqual({
            forceUpdate: false,
            forceUpdateTitle: '',
            forceUpdateMessage: '',
        });
    });

    it('显式开启强制更新时才写入强更文案', () => {
        expect(resolveOtaForceUpdateOptions({
            forceUpdateFlag: true,
            forceUpdateTitle: '自定义标题',
            forceUpdateMessage: '自定义正文',
        })).toEqual({
            forceUpdate: true,
            forceUpdateTitle: '自定义标题',
            forceUpdateMessage: '自定义正文',
        });
    });

    it('显式关闭强制更新时保持后台生效语义', () => {
        expect(resolveOtaForceUpdateOptions({
            noForceUpdateFlag: true,
            forceUpdateTitle: '自定义标题',
            forceUpdateMessage: '自定义正文',
        })).toEqual({
            forceUpdate: false,
            forceUpdateTitle: '',
            forceUpdateMessage: '',
        });
    });

    it('强制 OTA manifest 若当前 bundle 已是最新版，不应先闪出 blocking gate', async () => {
        vi.resetModules();
        vi.stubEnv('VITE_ANDROID_OTA_ENABLED', 'true');
        vi.stubEnv('VITE_ANDROID_OTA_MANIFEST_URL', 'https://assets.easyboardgame.top/official/app-updates/android/stable/latest.json');
        vi.stubEnv('VITE_ANDROID_OTA_CHANNEL', 'stable');
        vi.stubEnv('VITE_ANDROID_OTA_APP_READY_TIMEOUT_MS', '15000');

        vi.doMock('@capacitor/core', () => ({
            Capacitor: {
                isNativePlatform: () => true,
                getPlatform: () => 'android',
            },
            registerPlugin: vi.fn(() => ({})),
        }));

        const currentMock = vi.fn().mockResolvedValue({
            native: '0.5.1',
            bundle: {
                id: 'bundle-current',
                version: '0.5.1-ota-2026-04-04T03-34-46-472Z',
                downloaded: '2026-04-04T03:40:00.000Z',
                checksum: 'abc',
                status: 'success',
            },
        });

        vi.doMock('@capgo/capacitor-updater', () => ({
            CapacitorUpdater: {
                notifyAppReady: vi.fn(),
                current: currentMock,
                list: vi.fn(),
                download: vi.fn(),
                next: vi.fn(),
                set: vi.fn(),
                reload: vi.fn(),
                setMultiDelay: vi.fn(),
                addListener: vi.fn(async () => ({ remove: async () => undefined })),
            },
        }));

        vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
            status: 200,
            ok: true,
            headers: {
                get: (name: string) => (name.toLowerCase() === 'content-type' ? 'application/json' : null),
            },
            json: async () => ({
                version: '0.5.1-ota-2026-04-04T03-34-46-472Z',
                url: 'https://assets.easyboardgame.top/official/app-updates/android/stable/bundles/0.5.1-ota-2026-04-04T03-34-46-472Z.zip',
                checksum: 'abc',
                channel: 'stable',
                forceUpdate: true,
                forceUpdateTitle: '正在更新',
                forceUpdateMessage: '正在下载必要更新，请稍候',
            }),
        }));

        const { startAndroidLiveUpdateBackgroundCheck } = await import('../mobile/androidLiveUpdates');
        const states: Array<{ phase: string; blocking: boolean }> = [];

        const result = await startAndroidLiveUpdateBackgroundCheck({
            force: true,
            envOverride: {
                VITE_ANDROID_OTA_ENABLED: 'true',
                VITE_ANDROID_OTA_MANIFEST_URL: 'https://assets.easyboardgame.top/official/app-updates/android/stable/latest.json',
                VITE_ANDROID_OTA_CHANNEL: 'stable',
                VITE_ANDROID_OTA_APP_READY_TIMEOUT_MS: '15000',
            },
            onForceStateChange: (state) => {
                states.push({ phase: state.phase, blocking: state.blocking });
            },
        });

        expect(result).toEqual({ status: 'up-to-date' });
        expect(currentMock).toHaveBeenCalledTimes(1);
        expect(states.some((state) => state.blocking)).toBe(false);
    });

    it('强制 OTA manifest 若发现新版本，也只后台排队等待重进 App 生效', async () => {
        vi.resetModules();

        vi.doMock('@capacitor/core', () => ({
            Capacitor: {
                isNativePlatform: () => true,
                getPlatform: () => 'android',
            },
            registerPlugin: vi.fn(() => ({})),
        }));

        const currentMock = vi.fn().mockResolvedValue({
            native: '0.5.1',
            bundle: {
                id: 'bundle-current',
                version: '0.5.1-ota-2026-04-04T03-00-00-000Z',
                downloaded: '2026-04-04T03:10:00.000Z',
                checksum: 'old',
                status: 'success',
            },
        });
        const listMock = vi.fn().mockResolvedValue({ bundles: [] });
        const downloadMock = vi.fn().mockResolvedValue({
            id: 'bundle-next',
            version: '0.5.1-ota-2026-04-04T03-34-46-472Z',
            downloaded: '2026-04-04T03:45:00.000Z',
            checksum: 'new',
            status: 'success',
        });
        const setMultiDelayMock = vi.fn().mockResolvedValue(undefined);
        const nextMock = vi.fn().mockResolvedValue(undefined);
        const setMock = vi.fn().mockResolvedValue(undefined);

        vi.doMock('@capgo/capacitor-updater', () => ({
            CapacitorUpdater: {
                notifyAppReady: vi.fn(),
                current: currentMock,
                list: listMock,
                download: downloadMock,
                next: nextMock,
                set: setMock,
                reload: vi.fn(),
                setMultiDelay: setMultiDelayMock,
                addListener: vi.fn(async () => ({ remove: async () => undefined })),
            },
        }));

        vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
            status: 200,
            ok: true,
            headers: {
                get: (name: string) => (name.toLowerCase() === 'content-type' ? 'application/json' : null),
            },
            json: async () => ({
                version: '0.5.1-ota-2026-04-04T03-34-46-472Z',
                url: 'https://assets.easyboardgame.top/official/app-updates/android/stable/bundles/0.5.1-ota-2026-04-04T03-34-46-472Z.zip',
                checksum: 'new',
                channel: 'stable',
                forceUpdate: true,
                forceUpdateTitle: '正在更新',
                forceUpdateMessage: '正在下载必要更新，请稍候',
            }),
        }));

        const { startAndroidLiveUpdateBackgroundCheck } = await import('../mobile/androidLiveUpdates');
        const states: Array<{ phase: string; blocking: boolean }> = [];

        const result = await startAndroidLiveUpdateBackgroundCheck({
            force: true,
            envOverride: {
                VITE_ANDROID_OTA_ENABLED: 'true',
                VITE_ANDROID_OTA_MANIFEST_URL: 'https://assets.easyboardgame.top/official/app-updates/android/stable/latest.json',
                VITE_ANDROID_OTA_CHANNEL: 'stable',
                VITE_ANDROID_OTA_APP_READY_TIMEOUT_MS: '15000',
            },
            onForceStateChange: (state) => {
                states.push({ phase: state.phase, blocking: state.blocking });
            },
        });

        expect(result).toEqual({
            status: 'queued',
            version: '0.5.1-ota-2026-04-04T03-34-46-472Z',
            source: 'downloaded',
            mode: 'background',
        });
        expect(downloadMock).toHaveBeenCalledTimes(1);
        expect(nextMock).toHaveBeenCalledWith({ id: 'bundle-next' });
        expect(setMultiDelayMock).toHaveBeenCalledWith({
            delayConditions: [{ kind: 'background', value: '0' }],
        });
        expect(setMock).not.toHaveBeenCalled();
        expect(states.some((state) => state.blocking)).toBe(false);
    });

    it('手动按钮触发 OTA 时应立即应用并自动重启', async () => {
        vi.resetModules();

        vi.doMock('@capacitor/core', () => ({
            Capacitor: {
                isNativePlatform: () => true,
                getPlatform: () => 'android',
            },
            registerPlugin: vi.fn(() => ({})),
        }));

        const currentMock = vi.fn().mockResolvedValue({
            native: '0.5.1',
            bundle: {
                id: 'bundle-current',
                version: '0.5.1-ota-2026-04-04T03-00-00-000Z',
                downloaded: '2026-04-04T03:10:00.000Z',
                checksum: 'old',
                status: 'success',
            },
        });
        const listMock = vi.fn().mockResolvedValue({ bundles: [] });
        const downloadMock = vi.fn().mockResolvedValue({
            id: 'bundle-next',
            version: '0.5.1-ota-2026-04-04T03-34-46-472Z',
            downloaded: '2026-04-04T03:45:00.000Z',
            checksum: 'new',
            status: 'success',
        });
        const nextMock = vi.fn().mockResolvedValue(undefined);
        const setMultiDelayMock = vi.fn().mockResolvedValue(undefined);
        const setMock = vi.fn().mockResolvedValue(undefined);
        const reloadMock = vi.fn().mockResolvedValue(undefined);

        vi.doMock('@capgo/capacitor-updater', () => ({
            CapacitorUpdater: {
                notifyAppReady: vi.fn(),
                current: currentMock,
                list: listMock,
                download: downloadMock,
                next: nextMock,
                set: setMock,
                reload: reloadMock,
                setMultiDelay: setMultiDelayMock,
                addListener: vi.fn(async () => ({ remove: async () => undefined })),
            },
        }));

        vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
            status: 200,
            ok: true,
            headers: {
                get: (name: string) => (name.toLowerCase() === 'content-type' ? 'application/json' : null),
            },
            json: async () => ({
                version: '0.5.1-ota-2026-04-04T03-34-46-472Z',
                url: 'https://assets.easyboardgame.top/official/app-updates/android/stable/bundles/0.5.1-ota-2026-04-04T03-34-46-472Z.zip',
                checksum: 'new',
                channel: 'stable',
                forceUpdate: false,
            }),
        }));

        const { startAndroidLiveUpdateBackgroundCheck } = await import('../mobile/androidLiveUpdates');
        const states: Array<{ phase: string; blocking: boolean }> = [];

        const result = await startAndroidLiveUpdateBackgroundCheck({
            force: true,
            applyMode: 'immediate',
            envOverride: {
                VITE_ANDROID_OTA_ENABLED: 'true',
                VITE_ANDROID_OTA_MANIFEST_URL: 'https://assets.easyboardgame.top/official/app-updates/android/stable/latest.json',
                VITE_ANDROID_OTA_CHANNEL: 'stable',
                VITE_ANDROID_OTA_APP_READY_TIMEOUT_MS: '15000',
            },
            onForceStateChange: (state) => {
                states.push({ phase: state.phase, blocking: state.blocking });
            },
        });

        expect(result).toEqual({
            status: 'queued',
            version: '0.5.1-ota-2026-04-04T03-34-46-472Z',
            source: 'downloaded',
            mode: 'immediate',
        });
        expect(downloadMock).toHaveBeenCalledTimes(1);
        expect(setMock).toHaveBeenCalledWith({ id: 'bundle-next' });
        expect(reloadMock).toHaveBeenCalledTimes(1);
        expect(nextMock).not.toHaveBeenCalled();
        expect(setMultiDelayMock).not.toHaveBeenCalled();
        expect(states.some((state) => state.blocking)).toBe(true);
    });

    it('读取原生 APK 自更新配置时，只有启用且 manifest URL 合法才算开启', () => {
        expect(readAndroidNativeUpdateConfig({
            VITE_ANDROID_NATIVE_UPDATE_ENABLED: 'true',
            VITE_ANDROID_NATIVE_UPDATE_MANIFEST_URL: 'https://assets.easyboardgame.top/official/native-app-updates/android/stable/latest.json',
            VITE_ANDROID_NATIVE_UPDATE_CHANNEL: 'stable',
        })).toEqual({
            enabled: true,
            manifestUrl: 'https://assets.easyboardgame.top/official/native-app-updates/android/stable/latest.json',
            channel: 'stable',
        });

        expect(readAndroidNativeUpdateConfig({
            VITE_ANDROID_NATIVE_UPDATE_ENABLED: 'true',
            VITE_ANDROID_NATIVE_UPDATE_MANIFEST_URL: '/relative.json',
        }).enabled).toBe(false);
    });

    it('原生 APK 自更新优先比较 versionCode，否则回退到 versionName', () => {
        const appInfo: AndroidAppInfo = {
            versionName: '0.5.0',
            versionCode: 500,
            canRequestPackageInstalls: true,
        };

        expect(isAndroidNativeUpdateAvailable({
            version: '0.5.0',
            versionCode: 501,
            url: 'https://example.com/app.apk',
        }, appInfo)).toBe(true);

        expect(isAndroidNativeUpdateAvailable({
            version: '0.5.1',
            url: 'https://example.com/app.apk',
        }, {
            ...appInfo,
            versionCode: undefined,
        })).toBe(true);

        expect(isAndroidNativeUpdateAvailable({
            version: '0.4.9',
            versionCode: 499,
            url: 'https://example.com/app.apk',
        }, appInfo)).toBe(false);
    });

    it('Android 运行时边界必须看真实原生环境，而不是只看构建模式或孤立桥对象', () => {
        expect(detectNativeAndroidRuntime({
            capacitor: {
                isNativePlatform: () => false,
                getPlatform: () => 'web',
            },
        })).toBe(false);

        expect(detectNativeAndroidRuntime({
            capacitor: {
                isNativePlatform: () => true,
                getPlatform: () => 'android',
            },
        })).toBe(true);

        expect(detectNativeAndroidRuntime({
            capacitor: {
                isNativePlatform: () => false,
                getPlatform: () => 'web',
            },
            windowObject: {
                androidBridge: {},
            },
        })).toBe(false);

        expect(detectNativeAndroidRuntime({
            capacitor: {
                isNativePlatform: () => false,
                getPlatform: () => 'web',
            },
            windowObject: {
                Capacitor: {
                    isNativePlatform: () => true,
                    getPlatform: () => 'android',
                },
            },
        })).toBe(false);

        expect(detectNativeAndroidRuntime({
            capacitor: {},
            windowObject: {
                Capacitor: {
                    isNativePlatform: () => true,
                    getPlatform: () => 'android',
                },
            },
        })).toBe(true);
    });
});

describe('socketConnectionConfig', () => {
    it('允许 polling 回退时仍然优先 websocket', () => {
        expect(getSocketIoTransports()).toEqual(['websocket', 'polling']);
        expect(shouldTryAllSocketTransports()).toBe(true);
    });
});
