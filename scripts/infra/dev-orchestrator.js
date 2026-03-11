import fs from 'node:fs';
import net from 'node:net';
import path from 'node:path';
import { spawn } from 'node:child_process';

const managedChildren = [];
let shuttingDown = false;
const repoRoot = process.cwd();

function resolveLocalCli(...segments) {
    const cliPath = path.join(repoRoot, ...segments);
    if (!fs.existsSync(cliPath)) {
        throw new Error(`missing local cli: ${cliPath}`);
    }
    return cliPath;
}

const tsxCliPath = resolveLocalCli('node_modules', 'tsx', 'dist', 'cli.mjs');
const nodemonCliPath = resolveLocalCli('node_modules', 'nodemon', 'bin', 'nodemon.js');

function createChildEnv() {
    const delimiter = process.platform === 'win32' ? ';' : ':';
    const localBin = path.join(repoRoot, 'node_modules', '.bin');
    return {
        ...process.env,
        PATH: `${localBin}${delimiter}${process.env.PATH || ''}`,
    };
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

function startCommand(label, command, args = []) {
    const child = spawn(command, args, {
        cwd: repoRoot,
        env: createChildEnv(),
        stdio: ['ignore', 'pipe', 'pipe'],
    });

    managedChildren.push(child);
    prefixOutput(label, child.stdout, process.stdout);
    prefixOutput(label, child.stderr, process.stderr);

    child.on('exit', (code, signal) => {
        if (shuttingDown) {
            return;
        }
        const detail = signal ? `signal=${signal}` : `code=${code ?? 0}`;
        console.error(`[dev-orchestrator] ${label} exited unexpectedly (${detail})`);
        shutdown(typeof code === 'number' ? code : 1);
    });

    return child;
}

function probePort(port, host = '127.0.0.1', timeoutMs = 1000) {
    return new Promise((resolve) => {
        const socket = net.connect({ host, port });
        let settled = false;
        const finish = (ok) => {
            if (settled) return;
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

async function waitForPort(port, label, timeoutMs = 120000) {
    const startedAt = Date.now();
    while (Date.now() - startedAt < timeoutMs) {
        if (await probePort(port)) {
            const elapsed = ((Date.now() - startedAt) / 1000).toFixed(2);
            console.log(`[dev-orchestrator] ${label} ready on ${port} in ${elapsed}s`);
            return;
        }
        await new Promise((resolve) => setTimeout(resolve, 250));
    }
    throw new Error(`${label} port ${port} startup timeout`);
}

function shutdown(code = 0) {
    if (shuttingDown) {
        return;
    }
    shuttingDown = true;

    for (const child of managedChildren) {
        if (child.killed) continue;
        try {
            if (process.platform === 'win32') {
                spawn('taskkill', ['/F', '/T', '/PID', String(child.pid)]);
            } else {
                child.kill('SIGTERM');
            }
        } catch {
        }
    }

    setTimeout(() => process.exit(code), 200);
}

process.on('SIGINT', () => shutdown(0));
process.on('SIGTERM', () => shutdown(0));

async function main() {
    console.log('[dev-orchestrator] starting api first');
    startCommand('dev:api', process.execPath, [tsxCliPath, '--tsconfig', 'apps/api/tsconfig.json', 'apps/api/src/main.ts']);
    await waitForPort(Number(process.env.API_SERVER_PORT) || 18001, 'api');

    console.log('[dev-orchestrator] starting game server');
    startCommand('dev:game', process.execPath, [nodemonCliPath]);
    await waitForPort(Number(process.env.GAME_SERVER_PORT) || 18000, 'game');

    console.log('[dev-orchestrator] starting frontend');
    startCommand('dev:frontend', process.execPath, ['scripts/infra/vite-with-logging.js']);
}

main().catch((error) => {
    console.error('[dev-orchestrator] startup failed:', error instanceof Error ? error.message : String(error));
    shutdown(1);
});
