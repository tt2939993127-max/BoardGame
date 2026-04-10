import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { E2E_SINGLE_WORKER_PORTS } from './e2e-port-config.js';
import { allocateAvailablePortsFrom, arePortsBindable } from './port-allocator.js';
import { withWindowsHide } from './windows-hide.js';

const playwrightCli = path.resolve(process.cwd(), 'node_modules', 'playwright', 'cli.js');

function run(command, args, env) {
    const result = spawnSync(command, args, withWindowsHide({
        stdio: 'inherit',
        env,
        shell: false,
    }, env));

    if (result.error) {
        throw result.error;
    }

    if (typeof result.status === 'number' && result.status !== 0) {
        process.exit(result.status);
    }
}

function createEnv(overrides = {}) {
    return {
        ...process.env,
        PW_HEADED: 'false',
        PWDEBUG: '0',
        ...overrides,
    };
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

const mode = process.argv[2];
const extraArgs = process.argv.slice(3);

if (!mode) {
    console.error('用法: node scripts/infra/run-e2e-command.mjs <default|dev|isolated|ci|critical|parallel> [...playwrightArgs]');
    process.exit(1);
}

const modeEnv = (() => {
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
                CI: 'true',
                NODE_OPTIONS: '--max-old-space-size=4096',
                PW_START_SERVERS: 'true',
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
})();

if (hasExplicitPlaywrightTarget(extraArgs)) {
    modeEnv.PW_HAS_EXPLICIT_TARGET = 'true';
}

const resolvedWorkers = Number.parseInt(modeEnv.PW_WORKERS || process.env.PW_WORKERS || '1', 10);
const useDevServers = modeEnv.PW_USE_DEV_SERVERS === 'true';

if (!useDevServers && resolvedWorkers <= 1) {
    const preferredPorts = E2E_SINGLE_WORKER_PORTS;
    const bindable = await arePortsBindable(preferredPorts);
    if (!bindable) {
        const fallbackPorts = await allocateAvailablePortsFrom(preferredPorts);
        modeEnv.PW_E2E_FRONTEND_PORT = String(fallbackPorts.frontend);
        modeEnv.PW_E2E_GAME_SERVER_PORT = String(fallbackPorts.gameServer);
        modeEnv.PW_E2E_API_SERVER_PORT = String(fallbackPorts.apiServer);
        modeEnv.GAME_SERVER_PORT = String(fallbackPorts.gameServer);
        modeEnv.PW_GAME_SERVER_PORT = String(fallbackPorts.gameServer);
        modeEnv.API_SERVER_PORT = String(fallbackPorts.apiServer);
        modeEnv.PW_API_SERVER_PORT = String(fallbackPorts.apiServer);

        console.warn(
            `⚠️ 默认单 worker E2E 端口不可绑定，改用本次运行专用端口：${fallbackPorts.frontend}/${fallbackPorts.gameServer}/${fallbackPorts.apiServer}`,
        );
        console.warn(
            `   原默认端口：${preferredPorts.frontend}/${preferredPorts.gameServer}/${preferredPorts.apiServer}`,
        );
    }
}

run(process.execPath, ['scripts/infra/assert-child-process-support.mjs', 'E2E', '--probe-fork', '--probe-esbuild'], modeEnv);

if (mode === 'ci') {
    run(process.execPath, ['scripts/infra/cleanup_test_connections.js'], modeEnv);
}

run(process.execPath, ['scripts/infra/check-file-encoding.mjs'], modeEnv);

if (mode !== 'parallel') {
    run(process.execPath, ['scripts/infra/check-e2e-safety.js'], modeEnv);
}

const playwrightArgs = ['test'];

if (mode === 'critical') {
    playwrightArgs.push('e2e/smashup.e2e.ts', 'e2e/tictactoe-rematch.e2e.ts');
}

if (mode === 'parallel') {
    playwrightArgs.push('--config=playwright.config.parallel.ts');
}

playwrightArgs.push(...extraArgs);

run(process.execPath, [playwrightCli, ...playwrightArgs], modeEnv);
