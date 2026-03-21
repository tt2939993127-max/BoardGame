#!/usr/bin/env node

import fs from 'node:fs/promises';
import net from 'node:net';
import path from 'node:path';
import { spawn } from 'node:child_process';

const repoRoot = process.cwd();
const smokeBundleDir = process.env.SMOKE_BUNDLE_DIR || path.join('temp', 'dev-bundles-smoke', `${Date.now()}-${process.pid}`);
const smokeTimeoutMs = Number(process.env.SMOKE_STARTUP_TIMEOUT_MS) || 120000;
const absSmokeBundleDir = path.resolve(repoRoot, smokeBundleDir);

const managedChildren = new Set();
const expectedStops = new Set();
let cleaningUp = false;

function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

function prefixOutput(label, stream, target) {
    let buffer = '';
    stream.on('data', (chunk) => {
        buffer += chunk.toString();
        const lines = buffer.split(/\r?\n/);
        buffer = lines.pop() ?? '';
        for (const line of lines) {
            target.write(`[${label}] ${line}\n`);
        }
    });
    stream.on('end', () => {
        if (buffer.length > 0) {
            target.write(`[${label}] ${buffer}\n`);
            buffer = '';
        }
    });
}

function probePort(port, host = '127.0.0.1', timeoutMs = 1000) {
    return new Promise((resolve) => {
        const socket = net.connect({ host, port });
        let settled = false;

        const finish = (ok) => {
            if (settled) {
                return;
            }
            settled = true;
            socket.destroy();
            resolve(ok);
        };

        socket.setTimeout(timeoutMs);
        socket.once('connect', () => finish(true));
        socket.once('timeout', () => finish(false));
        socket.once('error', () => finish(false));
    });
}

async function waitForPort(port, label, timeoutMs = smokeTimeoutMs) {
    const startedAt = Date.now();
    while (Date.now() - startedAt < timeoutMs) {
        if (await probePort(port)) {
            return Date.now() - startedAt;
        }
        await sleep(250);
    }
    throw new Error(`${label} 端口 ${port} 启动超时`);
}

async function waitForPorts(targets, timeoutMs = smokeTimeoutMs) {
    const startedAt = Date.now();
    await Promise.all(targets.map(({ port, label }) => waitForPort(port, label, timeoutMs)));
    return Date.now() - startedAt;
}

function getLocalMongoPort() {
    const mongoUri = process.env.MONGO_URI;
    if (!mongoUri) {
        return 27017;
    }

    const match = mongoUri.match(/^mongodb(?:\+srv)?:\/\/([^/?]+)/i);
    if (!match) {
        return null;
    }

    const firstHost = match[1].split(',')[0];
    const [hostname, port] = firstHost.split(':');
    if (hostname === 'localhost' || hostname === '127.0.0.1') {
        return Number(port) || 27017;
    }
    return null;
}

async function ensureMongoReady() {
    const mongoPort = getLocalMongoPort();
    if (!mongoPort) {
        return;
    }
    if (await probePort(mongoPort, '127.0.0.1', 500)) {
        return;
    }
    throw new Error(`检测到本地 MongoDB 端口 ${mongoPort} 未就绪，请先运行 npm run db:start`);
}

function createManagedProcess(label, args, envOverrides = {}) {
    const child = spawn(process.execPath, args, {
        cwd: repoRoot,
        env: { ...process.env, ...envOverrides },
        stdio: ['ignore', 'pipe', 'pipe'],
    });

    managedChildren.add(child);
    prefixOutput(label, child.stdout, process.stdout);
    prefixOutput(label, child.stderr, process.stderr);

    const exitPromise = new Promise((resolve, reject) => {
        child.once('error', reject);
        child.once('exit', (code, signal) => {
            managedChildren.delete(child);
            const detail = signal ? `signal=${signal}` : `code=${code ?? 0}`;
            if (expectedStops.has(child) || cleaningUp) {
                expectedStops.delete(child);
                resolve();
                return;
            }
            reject(new Error(`${label} 提前退出 (${detail})`));
        });
    });

    return { child, exitPromise };
}

function stopChildProcess(proc) {
    return new Promise((resolve) => {
        if (!proc || proc.killed || proc.exitCode !== null) {
            managedChildren.delete(proc);
            expectedStops.delete(proc);
            resolve();
            return;
        }

        expectedStops.add(proc);
        const finish = () => {
            managedChildren.delete(proc);
            expectedStops.delete(proc);
            resolve();
        };

        proc.once('exit', finish);
        try {
            if (process.platform === 'win32') {
                const killer = spawn('taskkill', ['/F', '/T', '/PID', String(proc.pid)], {
                    stdio: 'ignore',
                });
                killer.once('exit', () => {
                    setTimeout(finish, 50);
                });
            } else {
                proc.kill('SIGTERM');
                setTimeout(() => {
                    if (proc.exitCode === null) {
                        proc.kill('SIGKILL');
                    }
                }, 1000);
            }
        } catch {
            finish();
        }
    });
}

async function cleanup(code = 0) {
    if (cleaningUp) {
        return;
    }
    cleaningUp = true;
    await Promise.all(Array.from(managedChildren).map((child) => stopChildProcess(child)));
    await fs.rm(absSmokeBundleDir, { recursive: true, force: true });
    process.exit(code);
}

async function getFreePort() {
    return new Promise((resolve, reject) => {
        const server = net.createServer();
        server.unref();
        server.once('error', reject);
        server.listen(0, '127.0.0.1', () => {
            const address = server.address();
            if (!address || typeof address === 'string') {
                server.close(() => reject(new Error('无法分配空闲端口')));
                return;
            }
            server.close((error) => {
                if (error) {
                    reject(error);
                    return;
                }
                resolve(address.port);
            });
        });
    });
}

async function getDistinctFreePorts(count) {
    const ports = [];
    while (ports.length < count) {
        const port = await getFreePort();
        if (!ports.includes(port)) {
            ports.push(port);
        }
    }
    return ports;
}

function formatDuration(ms) {
    return `${(ms / 1000).toFixed(2)}s`;
}

async function fetchJson(url, label, timeoutMs = 5000) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    try {
        const response = await fetch(url, {
            signal: controller.signal,
            headers: {
                Accept: 'application/json',
            },
        });
        const contentType = response.headers.get('content-type') || '';
        const text = await response.text();

        if (!response.ok) {
            throw new Error(`${label} 返回 HTTP ${response.status}`);
        }
        if (!contentType.includes('application/json')) {
            const snippet = text.slice(0, 120).replace(/\s+/g, ' ');
            throw new Error(`${label} 未返回 JSON，content-type=${contentType || '(empty)'}，body=${snippet}`);
        }

        try {
            return JSON.parse(text);
        } catch (error) {
            throw new Error(`${label} JSON 解析失败: ${error instanceof Error ? error.message : String(error)}`);
        }
    } finally {
        clearTimeout(timer);
    }
}

async function verifyApiRoutes(apiPort) {
    const baseUrl = `http://127.0.0.1:${apiPort}`;
    const health = await fetchJson(`${baseUrl}/health`, 'health');
    if (health?.status !== 'ok') {
        throw new Error(`health 返回异常: ${JSON.stringify(health)}`);
    }

    const notifications = await fetchJson(`${baseUrl}/notifications`, 'notifications');
    if (!notifications || !Array.isArray(notifications.notifications)) {
        throw new Error(`notifications 返回结构异常: ${JSON.stringify(notifications)}`);
    }

    const changelogs = await fetchJson(`${baseUrl}/game-changelogs/dicethrone`, 'game-changelogs');
    if (!changelogs || !Array.isArray(changelogs.changelogs)) {
        throw new Error(`game-changelogs 返回结构异常: ${JSON.stringify(changelogs)}`);
    }
}

async function runProcessSmoke(label, args, envOverrides, port, verifier) {
    console.log(`[smoke] 启动 ${label}...`);
    const managed = createManagedProcess(label, args, envOverrides);
    try {
        const durationMs = await Promise.race([
            waitForPort(port, label),
            managed.exitPromise,
        ]);
        await sleep(250);
        if (typeof verifier === 'function') {
            await verifier();
        }
        return durationMs;
    } finally {
        await stopChildProcess(managed.child);
    }
}

async function runFullDevSmoke() {
    const [apiPort, gamePort, frontendPort] = await getDistinctFreePorts(3);

    console.log('[smoke] 启动整套 dev 链路...');
    const managed = createManagedProcess('smoke-dev', ['scripts/infra/dev-orchestrator.js'], {
        API_SERVER_PORT: String(apiPort),
        GAME_SERVER_PORT: String(gamePort),
        VITE_DEV_PORT: String(frontendPort),
        DEV_BUNDLE_DIR: smokeBundleDir,
    });

    try {
        const durationMs = await Promise.race([
            waitForPorts([
                { port: apiPort, label: 'smoke-dev:api' },
                { port: gamePort, label: 'smoke-dev:game' },
                { port: frontendPort, label: 'smoke-dev:frontend' },
            ]),
            managed.exitPromise,
        ]);
        await sleep(500);
        return durationMs;
    } finally {
        await stopChildProcess(managed.child);
    }
}

async function main() {
    await ensureMongoReady();
    await fs.rm(absSmokeBundleDir, { recursive: true, force: true });

    const [apiPort, gamePort] = await getDistinctFreePorts(2);

    const apiDurationMs = await runProcessSmoke(
        'smoke-api',
        [
            'scripts/infra/dev-bundle-runner.mjs',
            '--label', 'smoke-api',
            '--entry', 'apps/api/src/main.ts',
            '--outfile', path.join(smokeBundleDir, 'api', 'main.mjs'),
            '--tsconfig', 'apps/api/tsconfig.json',
        ],
        {
            API_SERVER_PORT: String(apiPort),
        },
        apiPort,
        () => verifyApiRoutes(apiPort),
    );

    const gameDurationMs = await runProcessSmoke(
        'smoke-game',
        [
            'scripts/infra/dev-bundle-runner.mjs',
            '--label', 'smoke-game',
            '--entry', 'server.ts',
            '--outfile', path.join(smokeBundleDir, 'game', 'server.mjs'),
            '--tsconfig', 'tsconfig.server.json',
        ],
        {
            GAME_SERVER_PORT: String(gamePort),
        },
        gamePort,
    );

    const devDurationMs = await runFullDevSmoke();

    console.log('[smoke] 启动冒烟测试通过');
    console.log(`[smoke] API: ${formatDuration(apiDurationMs)}`);
    console.log(`[smoke] game-server: ${formatDuration(gameDurationMs)}`);
    console.log(`[smoke] full-dev: ${formatDuration(devDurationMs)}`);
}

process.on('SIGINT', () => {
    void cleanup(1);
});
process.on('SIGTERM', () => {
    void cleanup(1);
});

main()
    .then(() => cleanup(0))
    .catch(async (error) => {
        console.error('[smoke] 失败:', error instanceof Error ? error.message : String(error));
        await cleanup(1);
    });
