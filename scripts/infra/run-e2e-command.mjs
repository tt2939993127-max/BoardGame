import { spawn, spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { withWindowsHide } from './windows-hide.js';
import { assertChildProcessSupport } from './assert-child-process-support.mjs';
import { runEncodingCheck } from './check-file-encoding.mjs';
import { runE2ESafetyCheck } from './check-e2e-safety.js';
import { cleanupTestConnections } from './cleanup_test_connections.js';

const playwrightCli = path.resolve(process.cwd(), 'node_modules', 'playwright', 'cli.js');
const runtimeNode = process.env.PW_NODE_BINARY || process.execPath;
const PREFLIGHT_CACHE_PATH = path.resolve(process.cwd(), '.tmp', 'e2e-preflight-cache.json');
const CLEANUP_CACHE_TTL_MS = 90_000;
const ENCODING_CACHE_TTL_MS = 90_000;
const SAFETY_CACHE_TTL_MS = 90_000;

function run(command, args, env) {
    console.log(`🎭 启动 Playwright: ${[command, ...args].join(' ')}`);
    const result = spawnSync(command, args, withWindowsHide({
        stdio: 'inherit',
        env,
        shell: false,
    }, env));

    if (result.error) {
        throw result.error;
    }

    if (typeof result.status === 'number' && result.status !== 0) {
        return result.status;
    }

    console.log('✅ Playwright 进程已结束。');
    return 0;
}

function runJsonCommand(command, args, env) {
    const result = spawnSync(command, args, withWindowsHide({
        stdio: ['ignore', 'pipe', 'pipe'],
        env,
        shell: false,
    }, env));

    if (result.error) {
        throw result.error;
    }

    if (typeof result.status === 'number' && result.status !== 0) {
        const stderr = result.stderr?.toString?.() || '';
        const stdout = result.stdout?.toString?.() || '';
        throw new Error(stderr.trim() || stdout.trim() || `命令执行失败: status=${result.status}`);
    }

    const stdout = result.stdout?.toString?.().trim() || '';
    if (!stdout) {
        throw new Error('命令未返回 JSON 输出。');
    }

    return JSON.parse(stdout);
}

function ensureManagedRuntimeWithHold(command, args, env) {
    return new Promise((resolve, reject) => {
        const child = spawn(command, args, withWindowsHide({
            stdio: ['pipe', 'pipe', 'pipe'],
            env,
            shell: false,
        }, env));

        let stdout = '';
        let stderr = '';
        let settled = false;

        const finalizeError = (fallbackMessage) => {
            if (settled) {
                return;
            }
            settled = true;
            reject(new Error(
                [
                    fallbackMessage,
                    stdout.trim() ? `stdout:\n${stdout.trim()}` : '',
                    stderr.trim() ? `stderr:\n${stderr.trim()}` : '',
                ].filter(Boolean).join('\n\n'),
            ));
        };

        child.stdout?.setEncoding('utf8');
        child.stderr?.setEncoding('utf8');

        child.stdout?.on('data', chunk => {
            stdout += chunk;
            if (settled) {
                return;
            }

            const line = stdout.split(/\r?\n/, 1)[0]?.trim();
            if (!line) {
                return;
            }

            try {
                const payload = JSON.parse(line);
                settled = true;
                resolve({ child, payload });
            } catch {
                // 等完整输出；若子进程退出仍拿不到合法 JSON，则在 close 事件里失败。
            }
        });

        child.stderr?.on('data', chunk => {
            stderr += chunk;
            process.stderr.write(chunk);
        });

        child.on('error', error => {
            finalizeError(`启动 E2E runtime manager 失败: ${error instanceof Error ? error.message : String(error)}`);
        });

        child.on('close', code => {
            if (!settled) {
                finalizeError(`E2E runtime manager 提前退出: status=${code ?? 'null'}`);
            }
        });
    });
}

async function stopHeldManager(child) {
    if (!child || child.exitCode !== null || child.killed) {
        return;
    }

    await new Promise(resolve => {
        let finished = false;
        const finish = () => {
            if (finished) {
                return;
            }
            finished = true;
            resolve();
        };

        const timer = setTimeout(() => {
            try {
                child.kill('SIGTERM');
            } catch {
                // ignore
            }
            finish();
        }, 5000);

        child.once('close', () => {
            clearTimeout(timer);
            finish();
        });

        try {
            child.stdin?.end();
        } catch {
            try {
                child.kill('SIGTERM');
            } catch {
                // ignore
            }
        }
    });
}

function createEnv(overrides = {}) {
    return {
        ...process.env,
        PW_HEADED: 'false',
        PWDEBUG: '0',
        ...overrides,
    };
}

function ensurePreflightCacheDir() {
    fs.mkdirSync(path.dirname(PREFLIGHT_CACHE_PATH), { recursive: true });
}

function readPreflightCache() {
    try {
        return JSON.parse(fs.readFileSync(PREFLIGHT_CACHE_PATH, 'utf-8'));
    } catch {
        return {};
    }
}

function writePreflightCache(cache) {
    ensurePreflightCacheDir();
    fs.writeFileSync(PREFLIGHT_CACHE_PATH, JSON.stringify(cache, null, 2));
}

function getPreflightCacheKey(mode, options = {}) {
    const explicitTarget = options.explicitTargetPath || '<none>';
    const reuseLabel = options.preferSharedSingleRun ? 'shared-single' : 'cold-start';
    return `${mode}::${reuseLabel}::${explicitTarget}`;
}

function shouldReusePreflight(cache, key, ttlMs) {
    const entry = cache[key];
    if (!entry || typeof entry.completedAt !== 'number') {
        return false;
    }

    return (Date.now() - entry.completedAt) <= ttlMs;
}

function markPreflightDone(cache, key) {
    cache[key] = {
        completedAt: Date.now(),
    };
    writePreflightCache(cache);
}

function hasExplicitPlaywrightTarget(args) {
    const targetFlags = new Set(['--grep', '-g', '--test-list']);

    for (let index = 0; index < args.length; index += 1) {
        const arg = args[index];

        if (targetFlags.has(arg)) {
            const next = args[index + 1];
            if (next && !next.startsWith('-')) {
                return true;
            }
            continue;
        }

        if (
            arg.startsWith('--grep=') ||
            arg.startsWith('--test-list=') ||
            arg === '--last-failed' ||
            arg.startsWith('--only-changed')
        ) {
            return true;
        }

        if (!arg.startsWith('-')) {
            return true;
        }
    }

    return false;
}

function createModeEnv(mode) {
    switch (mode) {
        case 'default':
            return createEnv();
        case 'dev':
            return createEnv({
                PW_USE_DEV_SERVERS: 'true',
                PW_WORKERS: '1',
            });
        case 'isolated':
            return createEnv({
                PW_USE_DEV_SERVERS: 'false',
            });
        case 'ci':
            return createEnv({
                NODE_OPTIONS: '--max-old-space-size=4096',
                PW_SERVER_WATCH: 'false',
            });
        case 'critical':
            return createEnv();
        case 'parallel':
            return createEnv({
                PW_ALLOW_FULL_RUN: 'true',
            });
        default:
            console.error(`未知模式: ${mode}`);
            process.exit(1);
    }
}

function getExplicitTargetPath(args) {
    for (const arg of args) {
        if (typeof arg === 'string' && !arg.startsWith('-') && /\.e2e\.[cm]?tsx?$/i.test(arg)) {
            return arg.replace(/\\/g, '/');
        }
    }

    return '';
}

function resolveRequestedServiceReuse(envOverrides = {}) {
    const value = (
        envOverrides.PW_E2E_SERVICE_REUSE
        ?? process.env.PW_E2E_SERVICE_REUSE
        ?? ''
    ).trim();
    return value;
}

export async function runE2ECommand({ mode, extraArgs = [], envOverrides = {} } = {}) {
    if (!mode) {
        console.error('用法: node scripts/infra/run-e2e-command.mjs <default|dev|isolated|ci|critical|parallel> [...playwrightArgs]');
        process.exit(1);
    }

    const modeEnv = {
        ...createModeEnv(mode),
        ...envOverrides,
    };
    modeEnv.PW_RUNTIME_SCOPE = modeEnv.PW_RUNTIME_SCOPE
        || process.env.PW_RUNTIME_SCOPE
        || `pw-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

    const explicitTargetPath = getExplicitTargetPath(extraArgs);
    if (hasExplicitPlaywrightTarget(extraArgs)) {
        modeEnv.PW_HAS_EXPLICIT_TARGET = 'true';
    }
    if (explicitTargetPath) {
        modeEnv.PW_TEST_TARGET = explicitTargetPath;
    }

    const requestedServiceReuse = resolveRequestedServiceReuse(envOverrides);
    const preferSharedSingleRun = requestedServiceReuse === 'shared-single';

    const shouldUseManagedSingleRuntime = (
        mode !== 'dev'
        && mode !== 'parallel'
        && modeEnv.PW_HAS_EXPLICIT_TARGET === 'true'
        && !process.env.PW_WORKERS
        && !envOverrides.PW_WORKERS
        && !process.env.PW_USE_DEV_SERVERS
        && !envOverrides.PW_USE_DEV_SERVERS
    );

    if (preferSharedSingleRun) {
        modeEnv.PW_E2E_SERVICE_REUSE = 'shared-single';
        console.log('♻️ 显式启用共享单 worker E2E runtime；将尝试复用 shared-single 服务。');
    } else if (
        modeEnv.PW_HAS_EXPLICIT_TARGET === 'true'
        && process.platform === 'win32'
        && process.env.CODEX_MANAGED_BY_NPM === '1'
        && !process.env.CI
    ) {
        console.log('🧭 Codex Windows 显式目标运行：默认使用托管 isolated-single runtime，避免 shared-single 在多 worktree/连续运行下的串扰。');
    }

    const preflightCache = readPreflightCache();
    const preflightKey = getPreflightCacheKey(mode, {
        explicitTargetPath,
        preferSharedSingleRun,
    });

    await assertChildProcessSupport('E2E', { probeFork: true, probeEsbuild: true });

    if (mode === 'ci') {
        const cleanupCacheKey = `${preflightKey}::cleanup`;
        if (shouldReusePreflight(preflightCache, cleanupCacheKey, CLEANUP_CACHE_TTL_MS)) {
            console.log('♻️ 跳过重复的 E2E 清理检查（近期已执行）。');
        } else {
            await cleanupTestConnections([]);
            markPreflightDone(preflightCache, cleanupCacheKey);
        }
    }

    const encodingCacheKey = `${preflightKey}::encoding`;
    if (shouldReusePreflight(preflightCache, encodingCacheKey, ENCODING_CACHE_TTL_MS)) {
        console.log('♻️ 跳过重复的编码检查（近期已执行）。');
    } else {
        runEncodingCheck([]);
        markPreflightDone(preflightCache, encodingCacheKey);
    }

    if (mode !== 'parallel') {
        const safetyCacheKey = `${preflightKey}::safety`;
        if (shouldReusePreflight(preflightCache, safetyCacheKey, SAFETY_CACHE_TTL_MS)) {
            console.log('♻️ 跳过重复的 E2E 环境检查（近期已执行）。');
        } else {
            await runE2ESafetyCheck(modeEnv);
            markPreflightDone(preflightCache, safetyCacheKey);
        }
    }

    let heldRuntimeManager = null;
    try {
        if (shouldUseManagedSingleRuntime) {
            const managerArgs = [
                'scripts/infra/e2e-runtime-manager.mjs',
                'ensure',
                '--json',
                '--hold',
                '--target',
                explicitTargetPath,
            ];
            if (preferSharedSingleRun) {
                managerArgs.push('--mode', 'shared-single');
            } else {
                managerArgs.push('--scope', modeEnv.PW_RUNTIME_SCOPE);
            }
            const { child, payload: managedRuntime } = await ensureManagedRuntimeWithHold(runtimeNode, managerArgs, modeEnv);
            heldRuntimeManager = child;
            const runtimeMode = managedRuntime.mode;
            const runtimePorts = managedRuntime.ports;
            modeEnv.PW_MANAGED_RUNTIME_ID = managedRuntime.runtimeId;
            modeEnv.PW_SKIP_RUNTIME_BOOTSTRAP = 'true';
            modeEnv.PW_RUNTIME_MODE = runtimeMode;
            modeEnv.PW_RUNTIME_SCOPE = managedRuntime.scope;
            modeEnv.PW_PORT = String(runtimePorts.frontend);
            modeEnv.PW_GAME_SERVER_PORT = String(runtimePorts.gameServer);
            modeEnv.GAME_SERVER_PORT = String(runtimePorts.gameServer);
            modeEnv.PW_API_SERVER_PORT = String(runtimePorts.apiServer);
            modeEnv.API_SERVER_PORT = String(runtimePorts.apiServer);
            if (runtimeMode === 'isolated-single') {
                modeEnv.PW_ISOLATE_PORTS = 'true';
                console.log(`🧭 Explicit target detected; using managed isolated runtime: frontend=${runtimePorts.frontend}, game=${runtimePorts.gameServer}, api=${runtimePorts.apiServer}`);
            } else {
                console.log(`♻️ 复用/附着共享 runtime: frontend=${runtimePorts.frontend}, game=${runtimePorts.gameServer}, api=${runtimePorts.apiServer}`);
            }
        }

        const playwrightArgs = ['test'];

        if (mode === 'critical') {
            playwrightArgs.push('e2e/smashup.e2e.ts', 'e2e/tictactoe-rematch.e2e.ts');
        }

        if (mode === 'parallel') {
            playwrightArgs.push('--config=playwright.config.parallel.ts');
        }

        playwrightArgs.push(...extraArgs);

        const exitCode = run(runtimeNode, [playwrightCli, ...playwrightArgs], modeEnv);
        if (exitCode !== 0) {
            process.exitCode = exitCode;
        }
    } finally {
        await stopHeldManager(heldRuntimeManager);
    }
}

const isDirectExecution = process.argv[1]
    ? path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)
    : false;

if (isDirectExecution) {
    await runE2ECommand({
        mode: process.argv[2],
        extraArgs: process.argv.slice(3),
    });
}
