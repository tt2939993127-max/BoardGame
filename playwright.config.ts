import { defineConfig, devices } from '@playwright/test';
import * as dotenv from 'dotenv';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { DEV_SERVER_PORTS, E2E_SINGLE_WORKER_PORTS } from './scripts/infra/e2e-port-config.js';

dotenv.config({ quiet: true });

const configuredWorkers = Number.parseInt(process.env.PW_WORKERS || '1', 10);
const isMultiWorker = configuredWorkers > 1;

const SINGLE_WORKER_PORTS = E2E_SINGLE_WORKER_PORTS;
const DEV_PORTS = DEV_SERVER_PORTS;

const forceStartServers = process.env.PW_START_SERVERS === 'true';
const useDevServers = process.env.PW_USE_DEV_SERVERS === 'true';
const shouldStartServers = forceStartServers || !useDevServers;
const shouldReuseExistingServers = !forceStartServers && !process.env.CI;
const headedMode = process.env.PW_HEADED === 'true' || process.env.PWDEBUG === '1';
process.env.PW_REUSE_EXISTING_SERVERS = shouldReuseExistingServers ? 'true' : 'false';

const ports = useDevServers ? DEV_PORTS : SINGLE_WORKER_PORTS;

function collectFrameworkBackedTests(rootDir: string): string[] {
    const matches: string[] = [];

    const walk = (currentDir: string) => {
        for (const entry of fs.readdirSync(currentDir, { withFileTypes: true })) {
            const absolutePath = path.join(currentDir, entry.name);

            if (entry.isDirectory()) {
                walk(absolutePath);
                continue;
            }

            if (!entry.isFile() || !entry.name.endsWith('.e2e.ts')) {
                continue;
            }

            const content = fs.readFileSync(absolutePath, 'utf-8');
            const usesFrameworkFixture =
                content.includes("from './framework'") ||
                content.includes('from "./framework"') ||
                content.includes("from '../framework'") ||
                content.includes('from "../framework"');

            if (!usesFrameworkFixture) {
                continue;
            }

            matches.push(path.relative(process.cwd(), absolutePath).replace(/\\/g, '/'));
        }
    };

    walk(rootDir);
    return matches;
}

if (!isMultiWorker) {
    process.env.GAME_SERVER_PORT = String(ports.gameServer);
    process.env.PW_GAME_SERVER_PORT = String(ports.gameServer);
    process.env.API_SERVER_PORT = String(ports.apiServer);
    process.env.PW_API_SERVER_PORT = String(ports.apiServer);
}

const frontendPort = process.env.PW_PORT || process.env.E2E_PORT || String(ports.frontend);
const singleWorkerBaseURL = process.env.VITE_FRONTEND_URL || `http://localhost:${frontendPort}`;
const multiWorkerSafeTests = collectFrameworkBackedTests(path.join(process.cwd(), 'e2e'));
const explicitTestMatch = process.env.PW_TEST_MATCH?.trim();

const LEGACY_DISCOVERY_BROKEN_TESTS = [
    '**/dicethrone-paladin-vengeance-select-player.e2e.ts',
    '**/dicethrone-toggle-die-lock-in-response-window.e2e.ts',
    '**/dicethrone-status-interaction-cancel.e2e.ts',
    '**/dicethrone-status-interaction-complete.e2e.ts',
    '**/ninja-hidden-ninja-skip-option.e2e.ts',
    '**/summonerwars-illusion-fix.e2e.ts',
];

if (isMultiWorker) {
    console.log(`✅ E2E 测试模式：多 worker 并行（${configuredWorkers} workers，隔离端口）`);
} else if (useDevServers) {
    console.log(`⚠️ E2E 测试模式：使用开发服务器（${DEV_PORTS.frontend}/${DEV_PORTS.gameServer}/${DEV_PORTS.apiServer}）`);
} else {
    console.log(`✅ E2E 测试模式：单 worker（${SINGLE_WORKER_PORTS.frontend}/${SINGLE_WORKER_PORTS.gameServer}/${SINGLE_WORKER_PORTS.apiServer}）`);
}

const testMatch = explicitTestMatch
    ? explicitTestMatch
    : isMultiWorker && multiWorkerSafeTests.length > 0
        ? multiWorkerSafeTests
        : '**/*.e2e.ts';

export default defineConfig({
    testDir: './e2e',
    testMatch,
    testIgnore: LEGACY_DISCOVERY_BROKEN_TESTS,
    timeout: 30000,
    expect: {
        timeout: 5000,
    },
    fullyParallel: isMultiWorker,
    forbidOnly: !!process.env.CI,
    retries: 0,
    workers: configuredWorkers,
    reporter: 'list',
    outputDir: './test-results',
    preserveOutput: 'always',
    globalSetup: shouldStartServers ? './e2e/global-setup.ts' : undefined,
    globalTeardown: shouldStartServers ? './e2e/global-teardown.ts' : undefined,
    use: {
        ...(!isMultiWorker ? { baseURL: singleWorkerBaseURL } : {}),
        headless: !headedMode,
        trace: 'on-first-retry',
        screenshot: 'only-on-failure',
    },
    projects: [
        {
            name: 'chromium',
            use: { ...devices['Desktop Chrome'] },
        },
    ],
});
