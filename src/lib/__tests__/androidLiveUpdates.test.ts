import {
    compareVersion,
    isManifestCompatibleWithNativeVersion,
    readAndroidLiveUpdateConfig,
} from '../mobile/androidLiveUpdates';

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
});
