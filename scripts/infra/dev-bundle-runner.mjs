import path from 'node:path';
import { spawn } from 'node:child_process';
import { context } from 'esbuild';
import { assertChildProcessSupport } from './assert-child-process-support.mjs';

await assertChildProcessSupport('bundle-runner / esbuild watch', { probeEsbuild: true });

const repoRoot = process.cwd();
const args = parseArgs(process.argv.slice(2));

const label = args.label || 'bundle-runner';
const entry = requireArg(args, 'entry');
const outfile = requireArg(args, 'outfile');
const tsconfig = requireArg(args, 'tsconfig');
const absOutfile = path.resolve(repoRoot, outfile);

let currentBuildStartedAt = 0;
let child = null;
let shuttingDown = false;
let buildVersion = 0;
let restartQueue = Promise.resolve();

function parseArgs(argv) {
    const parsed = {};
    for (let index = 0; index < argv.length; index += 1) {
        const token = argv[index];
        if (!token.startsWith('--')) {
            continue;
        }
        const key = token.slice(2);
        const value = argv[index + 1];
        parsed[key] = value;
        index += 1;
    }
    return parsed;
}

function requireArg(parsed, key) {
    const value = parsed[key];
    if (!value) {
        throw new Error(`missing required arg --${key}`);
    }
    return value;
}

function prefixOutput(prefix, stream, target) {
    let buffer = '';
    stream.on('data', (chunk) => {
        buffer += chunk.toString();
        const lines = buffer.split(/\r?\n/);
        buffer = lines.pop() ?? '';
        for (const line of lines) {
            target.write(`[${prefix}] ${line}\n`);
        }
    });
    stream.on('end', () => {
        if (buffer.length > 0) {
            target.write(`[${prefix}] ${buffer}\n`);
            buffer = '';
        }
    });
}

function stopChildProcess(proc) {
    return new Promise((resolve) => {
        if (!proc || proc.killed || proc.exitCode !== null) {
            resolve();
            return;
        }

        const finish = () => resolve();
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

async function restartRuntime(reason) {
    if (child) {
        const previous = child;
        child = null;
        await stopChildProcess(previous);
    }

    if (shuttingDown) {
        return;
    }

    console.log(`[bundle-runner] ${label} ${reason} -> starting ${outfile}`);
    child = spawn(process.execPath, ['--enable-source-maps', absOutfile], {
        cwd: repoRoot,
        env: process.env,
        stdio: ['ignore', 'pipe', 'pipe'],
    });
    prefixOutput(`${label}:runtime`, child.stdout, process.stdout);
    prefixOutput(`${label}:runtime`, child.stderr, process.stderr);
    child.on('exit', (code, signal) => {
        if (shuttingDown) {
            return;
        }
        const detail = signal ? `signal=${signal}` : `code=${code ?? 0}`;
        console.error(`[bundle-runner] ${label} runtime exited (${detail})`);
        child = null;
    });
}

function queueRestart(reason) {
    restartQueue = restartQueue.then(() => restartRuntime(reason)).catch((error) => {
        console.error(`[bundle-runner] ${label} restart failed:`, error instanceof Error ? error.message : String(error));
    });
    return restartQueue;
}

async function shutdown(code = 0, buildContext = null) {
    if (shuttingDown) {
        return;
    }
    shuttingDown = true;
    if (buildContext) {
        try {
            await buildContext.dispose();
        } catch {
        }
    }
    if (child) {
        const previous = child;
        child = null;
        await stopChildProcess(previous);
    }
    process.exit(code);
}

const rebuildPlugin = {
    name: 'restart-runtime-on-build',
    setup(build) {
        build.onStart(() => {
            currentBuildStartedAt = Date.now();
            console.log(`[bundle-runner] ${label} building ${entry}`);
        });

        build.onEnd(async (result) => {
            const durationMs = Date.now() - currentBuildStartedAt;
            if (result.errors.length > 0) {
                console.error(`[bundle-runner] ${label} build failed (${result.errors.length} errors, ${durationMs}ms); keeping previous runtime`);
                return;
            }

            buildVersion += 1;
            const action = buildVersion === 1 ? 'initial build ready' : 'rebuilt';
            console.log(`[bundle-runner] ${label} ${action} in ${durationMs}ms`);
            await queueRestart(buildVersion === 1 ? 'ready' : 'reloaded');
        });
    },
};

const buildContext = await context({
    absWorkingDir: repoRoot,
    entryPoints: [entry],
    outfile,
    bundle: true,
    platform: 'node',
    format: 'esm',
    packages: 'external',
    sourcemap: true,
    logLevel: 'info',
    tsconfig,
    plugins: [rebuildPlugin],
});

process.on('SIGINT', () => {
    void shutdown(0, buildContext);
});
process.on('SIGTERM', () => {
    void shutdown(0, buildContext);
});

try {
    await buildContext.watch();
} catch (error) {
    console.error(`[bundle-runner] ${label} watch failed:`, error instanceof Error ? error.message : String(error));
    await shutdown(1, buildContext);
}
