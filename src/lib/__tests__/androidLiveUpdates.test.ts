import {
    compareVersion,
    isManifestCompatibleWithNativeVersion,
    readAndroidLiveUpdateConfig,
} from '../mobile/androidLiveUpdates';
import {
    isAndroidNativeUpdateAvailable,
    readAndroidNativeUpdateConfig,
    type AndroidAppInfo,
} from '../mobile/androidNativeUpdates';
import { detectNativeAndroidRuntime } from '../mobile/androidRuntime';
import {
    DEFAULT_FORCE_UPDATE_MESSAGE,
    DEFAULT_FORCE_UPDATE_TITLE,
    resolveOtaForceUpdateOptions,
} from '../../../scripts/mobile/ota-publish-config.mjs';

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

    it('OTA 发布默认走强制更新并补齐默认文案', () => {
        expect(resolveOtaForceUpdateOptions()).toEqual({
            forceUpdate: true,
            forceUpdateTitle: DEFAULT_FORCE_UPDATE_TITLE,
            forceUpdateMessage: DEFAULT_FORCE_UPDATE_MESSAGE,
        });
    });

    it('显式关闭强制更新时不再写入强更文案', () => {
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
    });
});
