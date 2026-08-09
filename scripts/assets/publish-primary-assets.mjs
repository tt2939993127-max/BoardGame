import { spawn } from 'node:child_process';
import { createHash, randomUUID } from 'node:crypto';
import http from 'node:http';
import https from 'node:https';
import {
    createReadStream,
    createWriteStream,
    mkdirSync,
    mkdtempSync,
    rmSync,
    statSync,
    writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { pipeline } from 'node:stream/promises';
import { setTimeout as delay } from 'node:timers/promises';
import { URL } from 'node:url';

export const SERVER_PUBLISH_MANIFEST_FILE = '.boardgame-publish-manifest.json';
const DEFAULT_SSH_TARGET = 'admin@8.148.71.102';
const MAX_PROCESS_OUTPUT_CHARS = 256 * 1024;
const DEFAULT_UPLOAD_CHUNK_BYTES = 8 * 1024 * 1024;

const appendProcessOutput = (current, chunk) => {
    const next = current + chunk.toString();
    if (next.length <= MAX_PROCESS_OUTPUT_CHARS) {
        return next;
    }
    return next.slice(-MAX_PROCESS_OUTPUT_CHARS);
};

const removeStagingRoot = async (stagingRoot) => {
    for (let attempt = 1; attempt <= 3; attempt += 1) {
        try {
            rmSync(stagingRoot, { recursive: true, force: true });
            return;
        } catch (error) {
            if (attempt === 3) {
                console.warn(`[server-primary] 临时目录清理失败，稍后可手动删除: ${stagingRoot} (${error.code || error.message})`);
                return;
            }
            await delay(250 * attempt);
        }
    }
};

const waitForProcess = (child, label) => new Promise((resolve, reject) => {
    let stderr = '';
    let stdout = '';

    child.stderr?.on('data', (chunk) => {
        stderr = appendProcessOutput(stderr, chunk);
    });
    child.stdout?.on('data', (chunk) => {
        stdout = appendProcessOutput(stdout, chunk);
    });
    child.on('error', reject);
    child.on('close', (code) => {
        if (code === 0) {
            resolve({ stdout, stderr });
            return;
        }
        reject(new Error(`${label} 失败，exit=${code}: ${stderr.trim() || stdout.trim()}`));
    });
});

const resolveAssetUploadToken = () => (
    process.env.ASSET_SERVER_UPLOAD_TOKEN?.trim()
    || process.env.BG_ASSET_PUBLISH_TOKEN?.trim()
    || process.env.BG_DEPLOY_RUNNER_TOKEN?.trim()
    || ''
);

const normalizeAssetKey = (key) => {
    const normalized = String(key || '').replace(/\\/g, '/').replace(/^\/+/, '');
    const segments = normalized.split('/');
    if (
        !normalized.startsWith('official/')
        || segments.some((segment) => !segment || segment === '.' || segment === '..')
        || normalized.includes('\0')
        || normalized.includes('\n')
        || normalized.includes('\r')
    ) {
        throw new Error(`服务器发布对象 key 非法: ${key}`);
    }
    return normalized;
};

const hashFile = async (filePath) => {
    const hash = createHash('sha256');
    for await (const chunk of createReadStream(filePath)) {
        hash.update(chunk);
    }
    return hash.digest('hex');
};

const materializeBody = async (body, targetPath) => {
    const resolvedBody = typeof body === 'function' ? body() : body;
    mkdirSync(path.dirname(targetPath), { recursive: true });

    if (typeof resolvedBody === 'string' || Buffer.isBuffer(resolvedBody) || ArrayBuffer.isView(resolvedBody)) {
        writeFileSync(targetPath, resolvedBody);
        return;
    }
    if (resolvedBody && typeof resolvedBody.pipe === 'function') {
        await pipeline(resolvedBody, createWriteStream(targetPath));
        return;
    }
    throw new Error(`服务器发布对象不支持当前 body 类型: ${typeof resolvedBody}`);
};

export const stagePrimaryAssetUploads = async (uploads) => {
    if (!Array.isArray(uploads) || uploads.length === 0) {
        throw new Error('服务器发布批次不能为空');
    }

    const stagingRoot = mkdtempSync(path.join(tmpdir(), 'boardgame-asset-publish-'));
    const objects = [];
    const seenKeys = new Set();

    try {
        for (const upload of uploads) {
            const key = normalizeAssetKey(upload.key);
            if (seenKeys.has(key)) {
                throw new Error(`服务器发布批次包含重复 key: ${key}`);
            }
            seenKeys.add(key);

            const targetPath = path.join(stagingRoot, ...key.split('/'));
            await materializeBody(upload.body, targetPath);
            const stats = statSync(targetPath);
            if (typeof upload.size === 'number' && upload.size !== stats.size) {
                throw new Error(`服务器发布对象大小不一致: ${key} expected=${upload.size} actual=${stats.size}`);
            }
            objects.push({
                key,
                size: stats.size,
                sha256: await hashFile(targetPath),
                contentType: upload.contentType || 'application/octet-stream',
                cacheControl: upload.cacheControl || '',
            });
        }

        writeFileSync(
            path.join(stagingRoot, SERVER_PUBLISH_MANIFEST_FILE),
            `${JSON.stringify({
                schemaVersion: 1,
                createdAt: new Date().toISOString(),
                objects,
            }, null, 2)}\n`,
        );
        return { stagingRoot, objects };
    } catch (error) {
        await removeStagingRoot(stagingRoot);
        throw error;
    }
};

const resolvePositiveInteger = (value, fallback, label) => {
    if (value === undefined) return fallback;
    const parsed = Number(value);
    if (!Number.isSafeInteger(parsed) || parsed <= 0) {
        throw new Error(`${label} 必须是正整数`);
    }
    return parsed;
};

const appendUploadPath = (endpointUrl, suffix) => {
    const url = new URL(endpointUrl);
    url.pathname = `${url.pathname.replace(/\/+$/, '')}/${suffix}`;
    return url;
};

const sendAssetUploadRequest = ({ endpointUrl, token, headers = {}, body }) => new Promise((resolve, reject) => {
    const client = endpointUrl.protocol === 'https:' ? https : http;
    let settled = false;
    const fail = (error) => {
        if (settled) return;
        settled = true;
        reject(error);
    };
    const request = client.request(endpointUrl, {
        method: 'POST',
        headers: {
            Authorization: `Bearer ${token}`,
            ...headers,
        },
    }, (response) => {
        let responseBody = '';
        response.setEncoding('utf8');
        response.on('data', (chunk) => {
            responseBody = appendProcessOutput(responseBody, chunk);
        });
        response.on('end', () => {
            if (response.statusCode && response.statusCode >= 200 && response.statusCode < 300) {
                settled = true;
                resolve(responseBody.trim());
                return;
            }
            fail(new Error(
                `素材上传入口发布失败，status=${response.statusCode}: ${responseBody.trim() || response.statusMessage || ''}`,
            ));
        });
    });
    request.on('error', fail);
    if (!body) {
        request.end();
        return;
    }
    pipeline(body, request).catch(fail);
});

const createAssetUploadArchive = async (stagingRoot) => {
    const archiveRoot = mkdtempSync(path.join(tmpdir(), 'boardgame-asset-upload-'));
    const archivePath = path.join(archiveRoot, 'upload.tar');
    const tarProcess = spawn('tar', ['-C', stagingRoot, '-cf', '-', '.'], {
        stdio: ['ignore', 'pipe', 'pipe'],
        windowsHide: true,
    });
    try {
        const [tarResult] = await Promise.all([
            waitForProcess(tarProcess, '创建服务器发布归档'),
            pipeline(tarProcess.stdout, createWriteStream(archivePath)),
        ]);
        if (tarResult.stderr.trim()) {
            console.warn(`[server-primary] tar: ${tarResult.stderr.trim()}`);
        }
        return { archiveRoot, archivePath, size: statSync(archivePath).size };
    } catch (error) {
        if (!tarProcess.killed) {
            tarProcess.kill('SIGTERM');
        }
        await removeStagingRoot(archiveRoot);
        throw error;
    }
};

export const publishStagedAssetsToUploadEndpoint = async ({
    stagingRoot,
    uploadUrl = process.env.ASSET_SERVER_UPLOAD_URL?.trim() || '',
    token = resolveAssetUploadToken(),
    chunkSizeBytes = resolvePositiveInteger(
        process.env.ASSET_SERVER_UPLOAD_CHUNK_BYTES,
        DEFAULT_UPLOAD_CHUNK_BYTES,
        '素材上传分块大小',
    ),
}) => {
    if (!uploadUrl) {
        throw new Error('缺少素材上传入口 ASSET_SERVER_UPLOAD_URL');
    }
    if (!token) {
        throw new Error('缺少素材上传 token：请配置 ASSET_SERVER_UPLOAD_TOKEN 或 BG_ASSET_PUBLISH_TOKEN');
    }

    let endpointUrl;
    try {
        endpointUrl = new URL(uploadUrl);
    } catch {
        throw new Error(`素材上传入口 URL 无效: ${uploadUrl}`);
    }
    if (endpointUrl.protocol !== 'http:' && endpointUrl.protocol !== 'https:') {
        throw new Error(`素材上传入口协议无效: ${uploadUrl}`);
    }

    const safeChunkSizeBytes = resolvePositiveInteger(chunkSizeBytes, DEFAULT_UPLOAD_CHUNK_BYTES, '素材上传分块大小');
    const archive = await createAssetUploadArchive(stagingRoot);
    const uploadId = randomUUID();
    try {
        for (let start = 0; start < archive.size; start += safeChunkSizeBytes) {
            const end = Math.min(start + safeChunkSizeBytes, archive.size) - 1;
            await sendAssetUploadRequest({
                endpointUrl: appendUploadPath(endpointUrl, `chunks/${uploadId}`),
                token,
                headers: {
                    'Content-Type': 'application/octet-stream',
                    'Content-Length': String(end - start + 1),
                    'Content-Range': `bytes ${start}-${end}/${archive.size}`,
                },
                body: createReadStream(archive.archivePath, { start, end }),
            });
        }
        const responseBody = await sendAssetUploadRequest({
            endpointUrl: appendUploadPath(endpointUrl, `complete/${uploadId}`),
            token,
            headers: { 'Content-Length': '0' },
        });
        if (responseBody) {
            console.log(responseBody);
        }
    } catch (error) {
        throw error;
    } finally {
        await removeStagingRoot(archive.archiveRoot);
    }
};

export const publishStagedAssetsBySsh = async ({ stagingRoot }) => {
    const sshTarget = process.env.ASSET_SERVER_SSH_TARGET?.trim() || DEFAULT_SSH_TARGET;
    const sshArgs = [
        '-o', 'BatchMode=yes',
        '-o', 'ConnectTimeout=20',
        '-o', 'ServerAliveInterval=20',
        '-o', 'ServerAliveCountMax=3',
        '-o', 'StrictHostKeyChecking=yes',
    ];
    const privateKeyPath = process.env.ASSET_SERVER_SSH_KEY_PATH?.trim();
    const knownHostsPath = process.env.ASSET_SERVER_SSH_KNOWN_HOSTS_PATH?.trim();
    if (privateKeyPath) {
        sshArgs.push('-o', 'IdentitiesOnly=yes', '-i', privateKeyPath);
    }
    if (knownHostsPath) {
        sshArgs.push('-o', `UserKnownHostsFile=${knownHostsPath}`);
    }
    sshArgs.push(sshTarget, 'boardgame-asset-publish');

    const tarProcess = spawn('tar', ['-C', stagingRoot, '-cf', '-', '.'], {
        stdio: ['ignore', 'pipe', 'pipe'],
        windowsHide: true,
    });
    const sshProcess = spawn('ssh', sshArgs, {
        stdio: ['pipe', 'pipe', 'pipe'],
        windowsHide: true,
    });
    sshProcess.stdin.on('error', () => {
        // SSH 退出码会提供完整错误；忽略管道提前关闭产生的重复错误。
    });
    tarProcess.stdout.pipe(sshProcess.stdin);

    const [tarResult, sshResult] = await Promise.all([
        waitForProcess(tarProcess, '创建服务器发布归档'),
        waitForProcess(sshProcess, '服务器主源发布'),
    ]);
    if (tarResult.stderr.trim()) {
        console.warn(`[server-primary] tar: ${tarResult.stderr.trim()}`);
    }
    if (sshResult.stdout.trim()) {
        console.log(sshResult.stdout.trim());
    }
    if (sshResult.stderr.trim()) {
        console.warn(`[server-primary] ssh: ${sshResult.stderr.trim()}`);
    }
};

export const publishStagedAssetsToServer = async (staged) => {
    const uploadUrl = process.env.ASSET_SERVER_UPLOAD_URL?.trim();
    if (uploadUrl) {
        await publishStagedAssetsToUploadEndpoint({
            stagingRoot: staged.stagingRoot,
            uploadUrl,
        });
        return;
    }
    await publishStagedAssetsBySsh(staged);
};

export const publishPrimaryAssetBatch = async (uploads, options = {}) => {
    const staged = await stagePrimaryAssetUploads(uploads);
    const publishServer = options.publishServer || publishStagedAssetsToServer;

    try {
        await publishServer(staged);
        console.log(`serverPrimaryPublish=completed objects=${staged.objects.length}`);
        return {
            serverPublished: true,
            objectCount: staged.objects.length,
        };
    } finally {
        await removeStagingRoot(staged.stagingRoot);
    }
};
