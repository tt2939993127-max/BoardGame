import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { createServer } from 'node:net';
import process from 'node:process';
import test from 'node:test';

const rootDir = process.cwd();
const token = 'asset-upload-test-token';

const reservePort = async () => new Promise((resolve, reject) => {
    const server = createServer();
    server.once('error', reject);
    server.listen(0, '127.0.0.1', () => {
        const { port } = server.address();
        server.close((error) => error ? reject(error) : resolve(port));
    });
});

const waitForReady = async (baseUrl, child) => {
    const deadline = Date.now() + 10_000;
    while (Date.now() < deadline) {
        if (child.exitCode !== null) {
            throw new Error(`deploy runner exited early: ${child.exitCode}`);
        }
        try {
            const response = await fetch(`${baseUrl}/health`);
            if (response.ok) return;
        } catch {}
        await new Promise((resolve) => setTimeout(resolve, 50));
    }
    throw new Error('deploy runner did not become ready');
};

const stopRunner = async (child) => {
    if (child.exitCode !== null) return;
    child.kill('SIGTERM');
    await new Promise((resolve) => child.once('exit', resolve));
};

test('分块上传要求专用令牌，并在完成时交给归档校验', async () => {
    const port = await reservePort();
    const baseUrl = `http://127.0.0.1:${port}`;
    const child = spawn(process.execPath, ['scripts/deploy/deploy-runner.mjs'], {
        cwd: rootDir,
        env: {
            ...process.env,
            BG_DEPLOY_RUNNER_HOST: '127.0.0.1',
            BG_DEPLOY_RUNNER_PORT: String(port),
            BG_DEPLOY_RUNNER_TOKEN: 'deploy-runner-test-token',
            BG_ASSET_PUBLISH_TOKEN: token,
            BG_ASSET_PUBLISH_PORT: '',
        },
        stdio: 'ignore',
    });

    try {
        await waitForReady(baseUrl, child);
        const uploadId = randomUUID();
        const body = Buffer.from('not a tar archive');
        const chunkUrl = `${baseUrl}/asset-publish/chunks/${uploadId}`;
        const headers = {
            'Content-Range': `bytes 0-${body.length - 1}/${body.length}`,
            'Content-Type': 'application/octet-stream',
        };

        const unauthorized = await fetch(chunkUrl, {
            method: 'POST',
            headers,
            body,
        });
        assert.equal(unauthorized.status, 401);

        const chunk = await fetch(chunkUrl, {
            method: 'POST',
            headers: {
                ...headers,
                Authorization: `Bearer ${token}`,
            },
            body,
        });
        assert.equal(chunk.status, 204);

        const complete = await fetch(`${baseUrl}/asset-publish/complete/${uploadId}`, {
            method: 'POST',
            headers: { Authorization: `Bearer ${token}` },
        });
        assert.equal(complete.status, 503);
        const result = await complete.json();
        assert.match(result.error, /list asset archive failed/);
    } finally {
        await stopRunner(child);
    }
});
