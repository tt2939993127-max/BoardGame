import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { createReadStream, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import test from 'node:test';
import {
    publishPrimaryAssetBatch,
    publishStagedAssetsToUploadEndpoint,
    stagePrimaryAssetUploads,
} from './publish-primary-assets.mjs';

test('服务器发布成功即完成，不产生对象存储灾备状态', async () => {
    let publishedObjects = [];
    const result = await publishPrimaryAssetBatch([
        {
            key: 'official/app-updates/android/stable/latest.json',
            body: '{"version":"test"}\n',
            contentType: 'application/json',
        },
        {
            key: 'official/app-updates/android/stable/manifests/test.json',
            body: '{"version":"test"}\n',
            contentType: 'application/json',
        },
    ], {
        publishServer: async ({ objects }) => {
            publishedObjects = objects;
        },
    });

    assert.equal(result.serverPublished, true);
    assert.equal(result.objectCount, 2);
    assert.equal(publishedObjects[0].key, 'official/app-updates/android/stable/latest.json');
    assert.equal('objectStorageBackup' in publishedObjects[0], false);
    assert.equal('objectStorageBackup' in publishedObjects[1], false);
});

test('旧的对象存储灾备标记会被忽略', async () => {
    let publishedObjects = [];
    const result = await publishPrimaryAssetBatch([
        {
            key: 'official/common/rebuildable/file.json',
            body: '{}\n',
            objectStorageBackup: true,
        },
    ], {
        publishServer: async ({ objects }) => {
            publishedObjects = objects;
        },
    });

    assert.equal(result.serverPublished, true);
    assert.equal(result.objectCount, 1);
    assert.equal('objectStorageBackup' in publishedObjects[0], false);
});

test('服务器发布失败时必须阻止发布完成', async () => {
    await assert.rejects(
        publishPrimaryAssetBatch([
            {
                key: 'official/app-updates/android/stable/latest.json',
                body: '{}\n',
            },
        ], {
            publishServer: async () => {
                throw new Error('server unavailable');
            },
        }),
        /server unavailable/,
    );
});

test('支持以文件流作为发布对象', async () => {
    const sourcePath = path.join(tmpdir(), `boardgame-primary-publish-${process.pid}.txt`);
    writeFileSync(sourcePath, 'stream-body');
    const staged = await stagePrimaryAssetUploads([
        {
            key: 'official/common/test/stream.txt',
            body: () => createReadStream(sourcePath),
            size: 11,
        },
    ]);

    assert.equal(staged.objects[0].size, 11);
    rmSync(staged.stagingRoot, { recursive: true, force: true });
    rmSync(sourcePath, { force: true });
});

test('拒绝越出 official 目录的对象 key', async () => {
    await assert.rejects(
        stagePrimaryAssetUploads([{ key: '../secret', body: 'x' }]),
        /key 非法/,
    );
});

test('通过专用 HTTP 上传入口分块提交 staging tar 后再完成发布', async () => {
    const receivedChunks = [];
    let receivedAuthorization = '';
    let completed = false;
    const server = createServer((req, res) => {
        receivedAuthorization = req.headers.authorization || '';
        if (req.method === 'POST' && req.url?.startsWith('/asset-publish/complete/')) {
            completed = true;
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end('{"ok":true}');
            return;
        }
        if (req.method !== 'POST' || !req.url?.startsWith('/asset-publish/chunks/')) {
            res.writeHead(404);
            res.end();
            return;
        }
        const buffers = [];
        req.on('data', (chunk) => {
            buffers.push(chunk);
        });
        req.on('end', () => {
            receivedChunks.push({
                contentRange: req.headers['content-range'] || '',
                contentType: req.headers['content-type'] || '',
                bytes: Buffer.concat(buffers),
            });
            res.writeHead(204);
            res.end();
        });
    });
    await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
    const address = server.address();
    const uploadUrl = `http://127.0.0.1:${address.port}/asset-publish`;
    const staged = await stagePrimaryAssetUploads([
        {
            key: 'official/common/test/http-upload.json',
            body: '{"ok":true}\n',
            contentType: 'application/json',
        },
    ]);

    try {
        await publishStagedAssetsToUploadEndpoint({
            stagingRoot: staged.stagingRoot,
            uploadUrl,
            token: 'asset-token',
            chunkSizeBytes: 128,
        });
        assert.equal(receivedAuthorization, 'Bearer asset-token');
        assert.ok(receivedChunks.length > 1);
        assert.match(receivedChunks[0].contentRange, /^bytes 0-127\/\d+$/);
        assert.ok(receivedChunks.every((chunk) => chunk.contentType === 'application/octet-stream'));
        assert.ok(receivedChunks.every((chunk) => chunk.bytes.length > 0 && chunk.bytes.length <= 128));
        assert.equal(completed, true);
    } finally {
        rmSync(staged.stagingRoot, { recursive: true, force: true });
        await new Promise((resolve) => server.close(resolve));
    }
});
