import { config } from 'dotenv';
import { createHash } from 'node:crypto';
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { zipSync, strToU8 } from 'fflate';
import {
    resolveOtaForceUpdateOptions,
} from './ota-publish-config.mjs';

const rootDir = process.cwd();

for (const file of ['.env', '.env.android', '.env.android.local', '.env.example']) {
    const fullPath = path.join(rootDir, file);
    if (!existsSync(fullPath)) continue;
    config({ path: fullPath, override: false, quiet: true });
}

const packageJson = JSON.parse(readFileSync(path.join(rootDir, 'package.json'), 'utf8'));
const args = process.argv.slice(2);
const readArgValue = (name, fallback = '') => {
    const prefix = `--${name}=`;
    const direct = args.find((arg) => arg.startsWith(prefix));
    if (direct) {
        return direct.slice(prefix.length);
    }
    const index = args.findIndex((arg) => arg === `--${name}`);
    if (index >= 0 && args[index + 1]) {
        return args[index + 1];
    }
    return fallback;
};
const hasFlag = (name) => args.includes(`--${name}`);

const channel = readArgValue('channel', process.env.VITE_ANDROID_OTA_CHANNEL?.trim() || 'stable');
const nativeVersion = readArgValue('native-version', packageJson.version);
const explicitTargetNativeVersion = readArgValue('target-native-version', '');
const minNativeVersion = readArgValue('min-native-version', '');
const maxNativeVersion = readArgValue('max-native-version', '');
const explicitBundleVersion = readArgValue('version', '');
const notes = readArgValue('notes', 'Android embedded OTA bundle');
const {
    forceUpdate,
    forceUpdateTitle,
    forceUpdateMessage,
} = resolveOtaForceUpdateOptions({
    forceUpdateFlag: hasFlag('force-update'),
    noForceUpdateFlag: hasFlag('no-force-update'),
    forceUpdateTitle: readArgValue('force-update-title', ''),
    forceUpdateMessage: readArgValue('force-update-message', ''),
});
const dryRun = hasFlag('dry-run');
const skipLatest = hasFlag('skip-latest');
const distDir = path.join(rootDir, 'dist');
const androidBuildMetaPath = path.join(distDir, 'android-build-meta.json');
const builtAt = new Date().toISOString().replace(/[:.]/g, '-');
const bundleVersion = explicitBundleVersion || `${packageJson.version}-ota-${builtAt}`;
const manifestPrefix = `official/app-updates/android/${channel}`;
const bundleKey = `${manifestPrefix}/bundles/${bundleVersion}.zip`;
const versionManifestKey = `${manifestPrefix}/manifests/${bundleVersion}.json`;
const latestManifestKey = `${manifestPrefix}/latest.json`;
const assetsBaseUrl = (process.env.VITE_ASSETS_BASE_URL?.trim() || 'https://assets.easyboardgame.top/official').replace(/\/+$/, '');
const bundleUrl = `${assetsBaseUrl}/app-updates/android/${channel}/bundles/${encodeURIComponent(bundleVersion)}.zip`;
const validChannelPattern = /^[a-z0-9][a-z0-9._-]*$/i;

if (!validChannelPattern.test(channel)) {
    throw new Error(`非法 channel: ${channel}。仅允许字母、数字、点、下划线、短横线。`);
}

if (!existsSync(distDir)) {
    throw new Error('dist 目录不存在。请先执行 Android Web 构建（例如 `npm run build:android:web` 或 `node scripts/mobile/android.mjs sync`）。');
}
if (!existsSync(androidBuildMetaPath)) {
    throw new Error('dist/android-build-meta.json 缺失。OTA 发布只接受 Android 链路产出的 dist，请先执行 `npm run mobile:android:sync`。');
}

const androidBuildMeta = JSON.parse(readFileSync(androidBuildMetaPath, 'utf8'));
if (androidBuildMeta.mode !== 'android') {
    throw new Error(`dist/android-build-meta.json 的 mode 非 android，当前值为: ${String(androidBuildMeta.mode || '')}`);
}
if (typeof androidBuildMeta.backendUrl !== 'string' || !/^https?:\/\//i.test(androidBuildMeta.backendUrl.trim())) {
    throw new Error('dist/android-build-meta.json 缺少合法 backendUrl。请先执行 `npm run mobile:android:sync`。');
}

if (!dryRun) {
    const requiredEnv = ['R2_ACCOUNT_ID', 'R2_ACCESS_KEY_ID', 'R2_SECRET_ACCESS_KEY', 'R2_BUCKET_NAME'];
    const missingEnv = requiredEnv.filter((key) => !process.env[key]);
    if (missingEnv.length > 0) {
        throw new Error(`缺少 R2 环境变量: ${missingEnv.join(', ')}`);
    }
}

const s3Client = new S3Client({
    region: 'auto',
    endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: {
        accessKeyId: process.env.R2_ACCESS_KEY_ID,
        secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
    },
});

const collectFiles = (dirPath, baseDir, entries = {}) => {
    for (const entry of readdirSync(dirPath, { withFileTypes: true })) {
        const fullPath = path.join(dirPath, entry.name);
        if (entry.isDirectory()) {
            collectFiles(fullPath, baseDir, entries);
            continue;
        }

        const relativePath = path.relative(baseDir, fullPath).replace(/\\/g, '/');
        entries[relativePath] = new Uint8Array(readFileSync(fullPath));
    }
    return entries;
};

const zipBuffer = Buffer.from(zipSync(collectFiles(distDir, distDir), { level: 9 }));
const checksum = createHash('sha256').update(zipBuffer).digest('hex');
const normalizedTargetNativeVersion = explicitTargetNativeVersion
    ? explicitTargetNativeVersion
        .split(',')
        .map((value) => value.trim())
        .filter(Boolean)
    : [];
const shouldUseDefaultTargetNativeVersion = !explicitTargetNativeVersion && !minNativeVersion && !maxNativeVersion;
const resolvedTargetNativeVersion = shouldUseDefaultTargetNativeVersion
    ? [nativeVersion]
    : normalizedTargetNativeVersion;
const manifest = {
    version: bundleVersion,
    url: bundleUrl,
    checksum,
    channel,
    ...(resolvedTargetNativeVersion.length > 0
        ? {
            targetNativeVersion: resolvedTargetNativeVersion.length === 1
                ? resolvedTargetNativeVersion[0]
                : resolvedTargetNativeVersion,
        }
        : {}),
    ...(minNativeVersion ? { minNativeVersion } : {}),
    ...(maxNativeVersion ? { maxNativeVersion } : {}),
    ...(forceUpdate ? { forceUpdate: true } : {}),
    ...(forceUpdateTitle ? { forceUpdateTitle } : {}),
    ...(forceUpdateMessage ? { forceUpdateMessage } : {}),
    publishedAt: new Date().toISOString(),
    size: zipBuffer.length,
    notes,
};

const uploadObject = async (key, body, contentType, cacheControl) => {
    await s3Client.send(new PutObjectCommand({
        Bucket: process.env.R2_BUCKET_NAME,
        Key: key,
        Body: body,
        ContentType: contentType,
        CacheControl: cacheControl,
    }));
};

if (!dryRun) {
    await uploadObject(bundleKey, zipBuffer, 'application/zip', 'public, max-age=31536000, immutable');
    await uploadObject(versionManifestKey, `${JSON.stringify(manifest, null, 2)}\n`, 'application/json', 'public, max-age=60, must-revalidate');
    if (!skipLatest) {
        await uploadObject(latestManifestKey, `${JSON.stringify(manifest, null, 2)}\n`, 'application/json', 'public, max-age=60, must-revalidate');
    }
}

const distStats = statSync(path.join(distDir, 'index.html'));
console.log(dryRun ? 'OTA bundle 预演完成（未上传）' : 'OTA bundle 已发布');
console.log(`channel=${channel}`);
console.log(`bundleVersion=${bundleVersion}`);
console.log(`nativeVersion=${nativeVersion}`);
console.log(`mode=${dryRun ? 'dry-run' : 'publish'}`);
console.log(`forceUpdate=${forceUpdate ? 'true' : 'false'}`);
console.log(`skipLatest=${skipLatest ? 'true' : 'false'}`);
console.log(`zipBytes=${zipBuffer.length}`);
console.log(`indexMtime=${distStats.mtime.toISOString()}`);
console.log(`androidBuildBackendUrl=${androidBuildMeta.backendUrl}`);
console.log(`androidBuildBuiltAt=${androidBuildMeta.builtAt || '(unknown)'}`);
console.log(`bundleKey=${bundleKey}`);
console.log(`latestManifestKey=${latestManifestKey}`);
console.log(`bundleUrl=${bundleUrl}`);
console.log(`checksum=${checksum}`);
console.log(`manifest=${JSON.stringify(manifest)}`);
