import { existsSync } from 'node:fs';
import path from 'node:path';
import dotenv from 'dotenv';
import type { CapacitorConfig } from '@capacitor/cli';

const rootDir = process.cwd();

for (const file of ['.env', '.env.android', '.env.android.local']) {
    const fullPath = path.join(rootDir, file);
    if (!existsSync(fullPath)) continue;
    dotenv.config({ path: fullPath, override: true, quiet: true });
}

const appId = process.env.CAPACITOR_APP_ID?.trim() || 'top.easyboardgame.app';
const appName = process.env.CAPACITOR_APP_NAME?.trim() || '易桌游';
const mode = (process.env.ANDROID_WEBVIEW_MODE?.trim().toLowerCase() || 'embedded');
const remoteUrl = process.env.ANDROID_REMOTE_WEB_URL?.trim() || '';
const isHttpRemoteUrl = /^http:\/\//i.test(remoteUrl);
const otaEnabled = /^(1|true|yes|on)$/i.test(process.env.VITE_ANDROID_OTA_ENABLED?.trim() || '');
const otaAppReadyTimeout = Number.parseInt(process.env.VITE_ANDROID_OTA_APP_READY_TIMEOUT_MS?.trim() || '', 10);

if (mode !== 'embedded' && mode !== 'remote') {
    throw new Error(`ANDROID_WEBVIEW_MODE 只支持 embedded 或 remote，当前值为: ${mode}`);
}

if (mode === 'remote' && !/^https?:\/\//i.test(remoteUrl)) {
    throw new Error('ANDROID_REMOTE_WEB_URL 必须是绝对 HTTP/HTTPS 地址，且仅在 remote 模式下使用。');
}

const server: NonNullable<CapacitorConfig['server']> = {
    androidScheme: 'https',
};

if (mode === 'remote') {
    server.url = remoteUrl;
    server.cleartext = isHttpRemoteUrl;
}

const config: CapacitorConfig = {
    appId,
    appName,
    webDir: 'dist',
    server,
    plugins: otaEnabled
        ? {
            CapacitorUpdater: {
                autoUpdate: false,
                appReadyTimeout: Number.isFinite(otaAppReadyTimeout) && otaAppReadyTimeout >= 1000
                    ? otaAppReadyTimeout
                    : 10000,
                autoDeleteFailed: true,
                autoDeletePrevious: true,
                resetWhenUpdate: true,
                keepUrlPathAfterReload: true,
                allowManualBundleError: true,
                defaultChannel: process.env.VITE_ANDROID_OTA_CHANNEL?.trim() || undefined,
            },
        }
        : undefined,
};

export default config;
