import { config } from 'dotenv';
import { createHash } from 'node:crypto';
import { createReadStream, createWriteStream, existsSync, mkdirSync, readdirSync, readFileSync, statSync, unlinkSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { Zip, ZipDeflate } from 'fflate';

const rootDir = process.cwd();

for (const file of ['.env', '.env.android', '.env.android.local', '.env.example']) {
    const fullPath = path.join(rootDir, file);
    if (!existsSync(fullPath)) continue;
    config({ path: fullPath, override: false, quiet: true });
}

const packageJson = JSON.parse(readFileSync(path.join(rootDir, 'package.json'), 'utf8'));
const args = process.argv.slice(2);
const SHARED_AUDIO_PACK_GAME_ID = 'common-audio';
const SHARED_AUDIO_PREFIX = 'common/audio/';
const STABLE_ZIP_DATE = new Date('2024-01-01T00:00:00.000Z');
const tempZipRoot = path.join(tmpdir(), 'boardgame-mobile-packages');
const runId = `${process.pid}-${Date.now()}`;
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
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
const explicitGameId = readArgValue('game', '');
const explicitVersion = readArgValue('version', '');
const dryRun = hasFlag('dry-run');
const manifestOnly = hasFlag('manifest-only');
const buildTimestamp = new Date().toISOString().replace(/[:.]/g, '-');
const assetsRoot = path.join(rootDir, 'public', 'assets');
const assetsBaseUrl = (process.env.VITE_ASSETS_BASE_URL?.trim() || 'https://assets.easyboardgame.top/official').replace(/\/+$/, '');
const packagePrefix = `official/mobile-packages/android/${channel}`;
const validChannelPattern = /^[a-z0-9][a-z0-9._-]*$/i;

if (!validChannelPattern.test(channel)) {
    throw new Error(`非法 channel: ${channel}`);
}

if (!existsSync(assetsRoot)) {
    throw new Error('public/assets 不存在，无法生成游戏包。');
}

if (!dryRun) {
    const requiredEnv = ['R2_ACCOUNT_ID', 'R2_ACCESS_KEY_ID', 'R2_SECRET_ACCESS_KEY', 'R2_BUCKET_NAME'];
    const missingEnv = requiredEnv.filter((key) => !process.env[key]);
    if (missingEnv.length > 0) {
        throw new Error(`缺少 R2 环境变量: ${missingEnv.join(', ')}`);
    }
}

const s3Client = dryRun
    ? null
    : new S3Client({
        region: 'auto',
        endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
        credentials: {
            accessKeyId: process.env.R2_ACCESS_KEY_ID,
            secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
        },
    });

const walkFiles = (dirPath, entries = []) => {
    for (const entry of readdirSync(dirPath, { withFileTypes: true })) {
        const fullPath = path.join(dirPath, entry.name);
        if (entry.isDirectory()) {
            walkFiles(fullPath, entries);
            continue;
        }
        entries.push(fullPath);
    }
    return entries;
};

const discoverPackageManagedGames = () => {
    const gamesRoot = path.join(rootDir, 'src', 'games');
    const results = [];

    for (const entry of readdirSync(gamesRoot, { withFileTypes: true })) {
        if (!entry.isDirectory()) continue;
        const manifestPath = path.join(gamesRoot, entry.name, 'manifest.ts');
        if (!existsSync(manifestPath)) continue;

        const content = readFileSync(manifestPath, 'utf8');
        if (!/mode:\s*'package-managed'/.test(content)) continue;

        const idMatch = content.match(/id:\s*'([^']+)'/);
        const gameId = idMatch?.[1]?.trim();
        if (!gameId) continue;
        results.push(gameId);
    }

    return Array.from(new Set(results)).sort((left, right) => left.localeCompare(right));
};

const shouldIncludeInGamePackage = (relativePath, gameId) => {
    const normalized = relativePath.replace(/\\/g, '/');
    return normalized.startsWith(`${gameId}/`)
        || normalized.startsWith(`atlas-configs/${gameId}/`)
        || /^i18n\/[^/]+\/[^/]+\//.test(normalized) && normalized.includes(`/${gameId}/`);
};

const buildGamePackageEntries = (gameId) => {
    const allFiles = walkFiles(assetsRoot);
    const includedFiles = allFiles
        .map((fullPath) => ({
            fullPath,
            relativePath: path.relative(assetsRoot, fullPath).replace(/\\/g, '/'),
        }))
        .filter((entry) => shouldIncludeInGamePackage(entry.relativePath, gameId))
        .sort((left, right) => left.relativePath.localeCompare(right.relativePath));
    return { includedFiles };
};

const shouldIncludeInSharedAudioPackage = (relativePath) => {
    const normalized = relativePath.replace(/\\/g, '/');
    return normalized === 'common/audio' || normalized.startsWith(SHARED_AUDIO_PREFIX);
};

const buildSharedAudioPackageEntries = () => {
    const allFiles = walkFiles(assetsRoot);
    const includedFiles = allFiles
        .map((fullPath) => ({
            fullPath,
            relativePath: path.relative(assetsRoot, fullPath).replace(/\\/g, '/'),
        }))
        .filter((entry) => shouldIncludeInSharedAudioPackage(entry.relativePath))
        .sort((left, right) => left.relativePath.localeCompare(right.relativePath));
    return { includedFiles };
};

const fetchRemoteJson = async (url) => {
    const response = await fetch(`${url}${url.includes('?') ? '&' : '?'}ts=${Date.now()}`, {
        headers: {
            Accept: 'application/json',
            'Cache-Control': 'no-cache',
            Pragma: 'no-cache',
        },
    });
    if (!response.ok) {
        throw new Error(`拉取远端 JSON 失败: ${response.status} ${url}`);
    }
    return await response.json();
};

const uploadObject = async (key, body, contentType, cacheControl, contentLength) => {
    if (!s3Client) {
        throw new Error('dry-run 模式下不应执行上传');
    }
    let lastError = null;
    for (let attempt = 1; attempt <= 3; attempt += 1) {
        try {
            await s3Client.send(new PutObjectCommand({
                Bucket: process.env.R2_BUCKET_NAME,
                Key: key,
                Body: body,
                ContentType: contentType,
                CacheControl: cacheControl,
                ...(typeof contentLength === 'number' ? { ContentLength: contentLength } : {}),
            }));
            return;
        } catch (error) {
            lastError = error;
            const statusCode = error?.$metadata?.httpStatusCode;
            const message = error instanceof Error ? error.message : String(error);
            const shouldRetry = attempt < 3 && (
                (typeof statusCode === 'number' && statusCode >= 500)
                || message.includes('Deserialization error')
                || message.includes('502')
                || message.includes('503')
            );
            if (!shouldRetry) {
                throw error;
            }
            await sleep(1000 * attempt);
        }
    }
    throw lastError;
};

const createAndroidCompatibleZipFile = async (includedFiles, zipFilePath) => {
    mkdirSync(path.dirname(zipFilePath), { recursive: true });
    try {
        unlinkSync(zipFilePath);
    } catch {}

    return await new Promise((resolve, reject) => {
        const output = createWriteStream(zipFilePath);
        const hash = createHash('sha256');
        let zipEnded = false;
        let totalBytes = 0;
        let settled = false;

        const finishWithError = (error) => {
            if (settled) return;
            settled = true;
            try {
                output.destroy();
            } catch {}
            reject(error);
        };

        output.on('error', finishWithError);
        output.on('finish', () => {
            if (settled) return;
            settled = true;
            resolve({
                zipFilePath,
                bytes: totalBytes,
                checksum: hash.digest('hex'),
            });
        });

        const zip = new Zip((error, chunk, final) => {
            if (error) {
                finishWithError(error);
                return;
            }

            const buffer = Buffer.from(chunk);
            hash.update(buffer);
            totalBytes += buffer.length;
            output.write(buffer);
            if (final && !zipEnded) {
                zipEnded = true;
                output.end();
            }
        });

        (async () => {
            try {
                for (const entry of includedFiles) {
                    await new Promise((entryResolve, entryReject) => {
                        // Android java.util.zip.ZipInputStream 不接受
                        // “STORED + data descriptor” 这种 fflate ZipPassThrough 流式格式，
                        // 否则只会读到第一个 entry 并抛出：
                        // "only DEFLATED entries can have EXT descriptor"。
                        // 这里改用 DEFLATE level 0，保持体积基本不变，同时让原生解压稳定兼容。
                        const zipEntry = new ZipDeflate(entry.relativePath, { level: 0 });
                        zipEntry.mtime = STABLE_ZIP_DATE;
                        zip.add(zipEntry);

                        const input = createReadStream(entry.fullPath);
                        input.on('error', entryReject);
                        input.on('data', (chunk) => {
                            zipEntry.push(new Uint8Array(chunk), false);
                        });
                        input.on('end', () => {
                            zipEntry.push(new Uint8Array(0), true);
                            entryResolve();
                        });
                    });
                }
                zip.end();
            } catch (error) {
                finishWithError(error);
            }
        })().catch(finishWithError);
    });
};

const buildSharedAudioPackageVersion = (checksum) => (
    explicitVersion
        ? `${explicitVersion}-shared-audio`
        : `${packageJson.version}-shared-audio-${checksum.slice(0, 12)}`
);

const buildSharedAudioManifestPayload = ({
    packageVersion,
    checksum,
    bytes,
    fileCount,
}) => ({
    gameId: SHARED_AUDIO_PACK_GAME_ID,
    runtimeChannel: channel,
    publishedAt: new Date().toISOString(),
    modulePack: null,
    assetPack: {
        id: SHARED_AUDIO_PACK_GAME_ID,
        version: packageVersion,
        url: `${assetsBaseUrl}/mobile-packages/android/${channel}/bundles/shared/${encodeURIComponent(SHARED_AUDIO_PACK_GAME_ID)}/${encodeURIComponent(packageVersion)}.zip`,
        checksum,
        bytes,
        fileCount,
    },
});

const buildGameManifestPayload = ({
    gameId,
    packageVersion,
    checksum,
    bytes,
    fileCount,
    sharedAudioPackResult,
    modulePack = null,
}) => ({
    gameId,
    runtimeChannel: channel,
    publishedAt: new Date().toISOString(),
    modulePack,
    assetPack: {
        id: gameId,
        version: packageVersion,
        url: `${assetsBaseUrl}/mobile-packages/android/${channel}/bundles/${encodeURIComponent(gameId)}/${encodeURIComponent(packageVersion)}.zip`,
        checksum,
        bytes,
        fileCount,
    },
    sharedAudioPack: sharedAudioPackResult
        ? {
            id: sharedAudioPackResult.gameId,
            version: sharedAudioPackResult.packageVersion,
            url: sharedAudioPackResult.bundleUrl,
            checksum: sharedAudioPackResult.checksum,
            bytes: sharedAudioPackResult.zipBytes,
            fileCount: sharedAudioPackResult.fileCount,
        }
        : null,
});

const loadRemoteSharedAudioPackResult = async () => {
    const manifest = await fetchRemoteJson(`${assetsBaseUrl}/mobile-packages/android/${channel}/shared/${SHARED_AUDIO_PACK_GAME_ID}.json`);
    const assetPack = manifest?.assetPack;
    if (!assetPack?.version || !assetPack?.url || !assetPack?.checksum) {
        throw new Error('远端 shared audio manifest 不完整，无法执行 manifest-only');
    }
    return {
        gameId: SHARED_AUDIO_PACK_GAME_ID,
        packageVersion: assetPack.version,
        zipBytes: assetPack.bytes,
        fileCount: assetPack.fileCount,
        checksum: assetPack.checksum,
        bundleKey: `${packagePrefix}/bundles/shared/${SHARED_AUDIO_PACK_GAME_ID}/${assetPack.version}.zip`,
        latestManifestKey: `${packagePrefix}/shared/${SHARED_AUDIO_PACK_GAME_ID}.json`,
        bundleUrl: assetPack.url,
    };
};

const loadRemoteGameManifest = async (gameId) => {
    const manifest = await fetchRemoteJson(`${assetsBaseUrl}/mobile-packages/android/${channel}/games/${gameId}.json`);
    if (!manifest?.assetPack?.version || !manifest?.assetPack?.url || !manifest?.assetPack?.checksum) {
        throw new Error(`远端游戏 manifest 不完整，无法执行 manifest-only: ${gameId}`);
    }
    return manifest;
};

const publishSharedAudioPackage = async () => {
    const { includedFiles } = buildSharedAudioPackageEntries();
    if (includedFiles.length === 0) {
        return null;
    }

    const tempZipPath = path.join(tempZipRoot, `${runId}-shared-${SHARED_AUDIO_PACK_GAME_ID}.zip`);
    const zipResult = await createAndroidCompatibleZipFile(includedFiles, tempZipPath);
    const checksum = zipResult.checksum;
    const packageVersion = buildSharedAudioPackageVersion(checksum);
    const bundleKey = `${packagePrefix}/bundles/shared/${SHARED_AUDIO_PACK_GAME_ID}/${packageVersion}.zip`;
    const versionManifestKey = `${packagePrefix}/manifests/shared/${SHARED_AUDIO_PACK_GAME_ID}/${packageVersion}.json`;
    const latestManifestKey = `${packagePrefix}/shared/${SHARED_AUDIO_PACK_GAME_ID}.json`;
    const bundleUrl = `${assetsBaseUrl}/mobile-packages/android/${channel}/bundles/shared/${encodeURIComponent(SHARED_AUDIO_PACK_GAME_ID)}/${encodeURIComponent(packageVersion)}.zip`;
    const manifest = buildSharedAudioManifestPayload({
        packageVersion,
        checksum,
        bytes: zipResult.bytes,
        fileCount: includedFiles.length,
    });

    try {
        if (!dryRun) {
            await uploadObject(
                bundleKey,
                createReadStream(zipResult.zipFilePath),
                'application/zip',
                'public, max-age=31536000, immutable',
                zipResult.bytes,
            );
            await uploadObject(versionManifestKey, `${JSON.stringify(manifest, null, 2)}\n`, 'application/json', 'public, max-age=60, must-revalidate');
            await uploadObject(latestManifestKey, `${JSON.stringify(manifest, null, 2)}\n`, 'application/json', 'public, max-age=60, must-revalidate');
        }
    } finally {
        try {
            unlinkSync(zipResult.zipFilePath);
        } catch {}
    }

    return {
        gameId: SHARED_AUDIO_PACK_GAME_ID,
        packageVersion,
        zipBytes: zipResult.bytes,
        fileCount: includedFiles.length,
        checksum,
        bundleKey,
        latestManifestKey,
        bundleUrl,
    };
};

const publishSingleGamePackage = async (gameId, sharedAudioPackResult) => {
    const packageVersion = explicitVersion || `${packageJson.version}-${gameId}-pkg-${buildTimestamp}`;
    const { includedFiles } = buildGamePackageEntries(gameId);
    const tempZipPath = path.join(tempZipRoot, `${runId}-${gameId}.zip`);
    const zipResult = await createAndroidCompatibleZipFile(includedFiles, tempZipPath);
    const checksum = zipResult.checksum;
    const bundleKey = `${packagePrefix}/bundles/${gameId}/${packageVersion}.zip`;
    const versionManifestKey = `${packagePrefix}/manifests/${gameId}/${packageVersion}.json`;
    const latestManifestKey = `${packagePrefix}/games/${gameId}.json`;
    const bundleUrl = `${assetsBaseUrl}/mobile-packages/android/${channel}/bundles/${encodeURIComponent(gameId)}/${encodeURIComponent(packageVersion)}.zip`;
    const manifest = buildGameManifestPayload({
        gameId,
        packageVersion,
        checksum,
        bytes: zipResult.bytes,
        fileCount: includedFiles.length,
        sharedAudioPackResult,
        modulePack: null,
    });

    try {
        if (!dryRun) {
            await uploadObject(
                bundleKey,
                createReadStream(zipResult.zipFilePath),
                'application/zip',
                'public, max-age=31536000, immutable',
                zipResult.bytes,
            );
            await uploadObject(versionManifestKey, `${JSON.stringify(manifest, null, 2)}\n`, 'application/json', 'public, max-age=60, must-revalidate');
            await uploadObject(latestManifestKey, `${JSON.stringify(manifest, null, 2)}\n`, 'application/json', 'public, max-age=60, must-revalidate');
        }
    } finally {
        try {
            unlinkSync(zipResult.zipFilePath);
        } catch {}
    }

    return {
        gameId,
        packageVersion,
        zipBytes: zipResult.bytes,
        fileCount: includedFiles.length,
        checksum,
        bundleKey,
        latestManifestKey,
        bundleUrl,
    };
};

const publishGameManifestOnly = async (gameId, sharedAudioPackResult) => {
    const remoteManifest = await loadRemoteGameManifest(gameId);
    const assetPack = remoteManifest.assetPack;
    const manifest = buildGameManifestPayload({
        gameId,
        packageVersion: assetPack.version,
        checksum: assetPack.checksum,
        bytes: assetPack.bytes,
        fileCount: assetPack.fileCount,
        sharedAudioPackResult,
        modulePack: remoteManifest.modulePack ?? null,
    });
    const versionManifestKey = `${packagePrefix}/manifests/${gameId}/${assetPack.version}.json`;
    const latestManifestKey = `${packagePrefix}/games/${gameId}.json`;

    if (!dryRun) {
        await uploadObject(versionManifestKey, `${JSON.stringify(manifest, null, 2)}\n`, 'application/json', 'public, max-age=60, must-revalidate');
        await uploadObject(latestManifestKey, `${JSON.stringify(manifest, null, 2)}\n`, 'application/json', 'public, max-age=60, must-revalidate');
    }

    return {
        gameId,
        packageVersion: assetPack.version,
        zipBytes: assetPack.bytes,
        fileCount: assetPack.fileCount,
        checksum: assetPack.checksum,
        bundleKey: `${packagePrefix}/bundles/${gameId}/${assetPack.version}.zip`,
        latestManifestKey,
        bundleUrl: assetPack.url,
        manifestOnly: true,
    };
};

const targetGames = explicitGameId
    ? [explicitGameId]
    : discoverPackageManagedGames();

if (targetGames.length === 0) {
    throw new Error('没有发现 package-managed 游戏，无法发布游戏包。');
}

const sharedAudioPackResult = manifestOnly
    ? await loadRemoteSharedAudioPackResult()
    : await publishSharedAudioPackage();

if (sharedAudioPackResult) {
    if (manifestOnly) {
        console.log('公共音频包已复用远端 latest manifest');
    } else {
        console.log(dryRun ? '公共音频包预演完成（未上传）' : '公共音频包已发布');
    }
    console.log(`gameId=${sharedAudioPackResult.gameId}`);
    console.log(`channel=${channel}`);
    console.log(`packageVersion=${sharedAudioPackResult.packageVersion}`);
    console.log(`zipBytes=${sharedAudioPackResult.zipBytes}`);
    console.log(`fileCount=${sharedAudioPackResult.fileCount}`);
    console.log(`bundleKey=${sharedAudioPackResult.bundleKey}`);
    console.log(`latestManifestKey=${sharedAudioPackResult.latestManifestKey}`);
    console.log(`bundleUrl=${sharedAudioPackResult.bundleUrl}`);
    console.log(`checksum=${sharedAudioPackResult.checksum}`);
    console.log('---');
}

for (const gameId of targetGames) {
    const result = manifestOnly
        ? await publishGameManifestOnly(gameId, sharedAudioPackResult)
        : await publishSingleGamePackage(gameId, sharedAudioPackResult);
    if (manifestOnly) {
        console.log(dryRun ? '游戏 manifest 预演完成（未上传）' : '游戏 manifest 已补刷');
    } else {
        console.log(dryRun ? '游戏包预演完成（未上传）' : '游戏包已发布');
    }
    console.log(`gameId=${result.gameId}`);
    console.log(`channel=${channel}`);
    console.log(`packageVersion=${result.packageVersion}`);
    console.log(`zipBytes=${result.zipBytes}`);
    console.log(`fileCount=${result.fileCount}`);
    console.log(`bundleKey=${result.bundleKey}`);
    console.log(`latestManifestKey=${result.latestManifestKey}`);
    console.log(`bundleUrl=${result.bundleUrl}`);
    console.log(`checksum=${result.checksum}`);
    console.log('---');
}

if (explicitGameId && existsSync(path.join(assetsRoot, 'i18n', 'zh-CN', explicitGameId))) {
    const stats = statSync(path.join(assetsRoot, 'i18n', 'zh-CN', explicitGameId));
    console.log(`gameRootMtime=${stats.mtime.toISOString()}`);
}

process.exit(0);
