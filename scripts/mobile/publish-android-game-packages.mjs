import { config } from 'dotenv';
import { createHash } from 'node:crypto';
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';

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
const explicitGameId = readArgValue('game', '');
const explicitVersion = readArgValue('version', '');
const dryRun = hasFlag('dry-run');
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

    const zipEntries = {};
    for (const entry of includedFiles) {
        zipEntries[entry.relativePath] = new Uint8Array(readFileSync(entry.fullPath));
    }

    return {
        zipEntries,
        includedFiles,
    };
};

const uploadObject = async (key, body, contentType, cacheControl) => {
    if (!s3Client) {
        throw new Error('dry-run 模式下不应执行上传');
    }
    await s3Client.send(new PutObjectCommand({
        Bucket: process.env.R2_BUCKET_NAME,
        Key: key,
        Body: body,
        ContentType: contentType,
        CacheControl: cacheControl,
    }));
};

const CRC32_TABLE = (() => {
    const table = new Uint32Array(256);
    for (let index = 0; index < 256; index += 1) {
        let value = index;
        for (let bit = 0; bit < 8; bit += 1) {
            value = (value & 1) ? (0xedb88320 ^ (value >>> 1)) : (value >>> 1);
        }
        table[index] = value >>> 0;
    }
    return table;
})();

const crc32 = (buffer) => {
    let value = 0xffffffff;
    for (const byte of buffer) {
        value = CRC32_TABLE[(value ^ byte) & 0xff] ^ (value >>> 8);
    }
    return (value ^ 0xffffffff) >>> 0;
};

const toDosTime = (date = new Date()) => {
    const seconds = Math.floor(date.getSeconds() / 2);
    return (
        (date.getHours() << 11)
        | (date.getMinutes() << 5)
        | seconds
    ) & 0xffff;
};

const toDosDate = (date = new Date()) => {
    const year = Math.max(1980, date.getFullYear());
    return (
        ((year - 1980) << 9)
        | ((date.getMonth() + 1) << 5)
        | date.getDate()
    ) & 0xffff;
};

const createStoredZipBuffer = (entries) => {
    const now = new Date();
    const dosTime = toDosTime(now);
    const dosDate = toDosDate(now);
    const localParts = [];
    const centralParts = [];
    let offset = 0;

    for (const [relativePath, content] of entries) {
        const fileNameBuffer = Buffer.from(relativePath, 'utf8');
        const fileDataBuffer = Buffer.isBuffer(content) ? content : Buffer.from(content);
        const entryCrc32 = crc32(fileDataBuffer);

        const localHeader = Buffer.alloc(30);
        localHeader.writeUInt32LE(0x04034b50, 0);
        localHeader.writeUInt16LE(20, 4);
        localHeader.writeUInt16LE(0x0800, 6);
        localHeader.writeUInt16LE(0, 8);
        localHeader.writeUInt16LE(dosTime, 10);
        localHeader.writeUInt16LE(dosDate, 12);
        localHeader.writeUInt32LE(entryCrc32, 14);
        localHeader.writeUInt32LE(fileDataBuffer.length, 18);
        localHeader.writeUInt32LE(fileDataBuffer.length, 22);
        localHeader.writeUInt16LE(fileNameBuffer.length, 26);
        localHeader.writeUInt16LE(0, 28);

        localParts.push(localHeader, fileNameBuffer, fileDataBuffer);

        const centralHeader = Buffer.alloc(46);
        centralHeader.writeUInt32LE(0x02014b50, 0);
        centralHeader.writeUInt16LE(20, 4);
        centralHeader.writeUInt16LE(20, 6);
        centralHeader.writeUInt16LE(0x0800, 8);
        centralHeader.writeUInt16LE(0, 10);
        centralHeader.writeUInt16LE(dosTime, 12);
        centralHeader.writeUInt16LE(dosDate, 14);
        centralHeader.writeUInt32LE(entryCrc32, 16);
        centralHeader.writeUInt32LE(fileDataBuffer.length, 20);
        centralHeader.writeUInt32LE(fileDataBuffer.length, 24);
        centralHeader.writeUInt16LE(fileNameBuffer.length, 28);
        centralHeader.writeUInt16LE(0, 30);
        centralHeader.writeUInt16LE(0, 32);
        centralHeader.writeUInt16LE(0, 34);
        centralHeader.writeUInt16LE(0, 36);
        centralHeader.writeUInt32LE(0, 38);
        centralHeader.writeUInt32LE(offset, 42);

        centralParts.push(centralHeader, fileNameBuffer);
        offset += localHeader.length + fileNameBuffer.length + fileDataBuffer.length;
    }

    const centralDirectoryBuffer = Buffer.concat(centralParts);
    const endOfCentralDirectory = Buffer.alloc(22);
    endOfCentralDirectory.writeUInt32LE(0x06054b50, 0);
    endOfCentralDirectory.writeUInt16LE(0, 4);
    endOfCentralDirectory.writeUInt16LE(0, 6);
    endOfCentralDirectory.writeUInt16LE(entries.length, 8);
    endOfCentralDirectory.writeUInt16LE(entries.length, 10);
    endOfCentralDirectory.writeUInt32LE(centralDirectoryBuffer.length, 12);
    endOfCentralDirectory.writeUInt32LE(offset, 16);
    endOfCentralDirectory.writeUInt16LE(0, 20);

    return Buffer.concat([...localParts, centralDirectoryBuffer, endOfCentralDirectory]);
};

const publishSingleGamePackage = async (gameId) => {
    const builtAt = new Date().toISOString().replace(/[:.]/g, '-');
    const packageVersion = explicitVersion || `${packageJson.version}-${gameId}-pkg-${builtAt}`;
    const { zipEntries, includedFiles } = buildGamePackageEntries(gameId);
    const zipBuffer = createStoredZipBuffer(
        Object.entries(zipEntries).map(([relativePath, content]) => [relativePath, Buffer.from(content)]),
    );
    const checksum = createHash('sha256').update(zipBuffer).digest('hex');
    const bundleKey = `${packagePrefix}/bundles/${gameId}/${packageVersion}.zip`;
    const versionManifestKey = `${packagePrefix}/manifests/${gameId}/${packageVersion}.json`;
    const latestManifestKey = `${packagePrefix}/games/${gameId}.json`;
    const bundleUrl = `${assetsBaseUrl}/mobile-packages/android/${channel}/bundles/${encodeURIComponent(gameId)}/${encodeURIComponent(packageVersion)}.zip`;
    const manifest = {
        gameId,
        runtimeChannel: channel,
        publishedAt: new Date().toISOString(),
        modulePack: null,
        assetPack: {
            id: gameId,
            version: packageVersion,
            url: bundleUrl,
            checksum,
            bytes: zipBuffer.length,
            fileCount: includedFiles.length,
        },
    };

    if (!dryRun) {
        await uploadObject(bundleKey, zipBuffer, 'application/zip', 'public, max-age=31536000, immutable');
        await uploadObject(versionManifestKey, `${JSON.stringify(manifest, null, 2)}\n`, 'application/json', 'public, max-age=60, must-revalidate');
        await uploadObject(latestManifestKey, `${JSON.stringify(manifest, null, 2)}\n`, 'application/json', 'public, max-age=60, must-revalidate');
    }

    return {
        gameId,
        packageVersion,
        zipBytes: zipBuffer.length,
        fileCount: includedFiles.length,
        checksum,
        bundleKey,
        latestManifestKey,
        bundleUrl,
    };
};

const targetGames = explicitGameId
    ? [explicitGameId]
    : discoverPackageManagedGames();

if (targetGames.length === 0) {
    throw new Error('没有发现 package-managed 游戏，无法发布游戏包。');
}

for (const gameId of targetGames) {
    const result = await publishSingleGamePackage(gameId);
    console.log(dryRun ? '游戏包预演完成（未上传）' : '游戏包已发布');
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
