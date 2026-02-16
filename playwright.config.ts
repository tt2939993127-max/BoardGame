import { defineConfig, devices } from '@playwright/test';
import * as dotenv from 'dotenv';
import path from 'path';

// Load environment variables from .env file
dotenv.config({ quiet: true });

const port = process.env.PW_PORT || process.env.E2E_PORT || '3000';
const baseURL = process.env.VITE_FRONTEND_URL || `http://localhost:${port}`;
const gameServerPort = process.env.GAME_SERVER_PORT || process.env.PW_GAME_SERVER_PORT || '18000';
const reuseExistingServer = true;

// 默认使用已运行的服务器（开发模式），设置 PW_START_SERVERS=true 强制启动（CI 模式）
const shouldStartServers = process.env.PW_START_SERVERS === 'true';

// 细粒度控制（向后兼容）
const shouldStartFrontend = shouldStartServers && !process.env.PW_SKIP_FRONTEND_SERVER;
const shouldStartGameServer = shouldStartServers && !process.env.PW_SKIP_GAME_SERVER;
const shouldStartApiServer = shouldStartServers && !process.env.PW_SKIP_API_SERVER;

const webServerConfig = shouldStartServers
    ? [
        ...(shouldStartFrontend
            ? [
                {
                    command: `node scripts/ugc/ugc-publish-preview.mjs && npm run generate:manifests && npx vite --port ${port} --strictPort`,
                    url: baseURL,
                    reuseExistingServer,
                    timeout: 120000,
                },
            ]
            : []),
        ...(shouldStartGameServer
            ? [
                {
                    command: `node scripts/ugc/ugc-publish-preview.mjs && npm run generate:manifests && cross-env USE_PERSISTENT_STORAGE=false GAME_SERVER_PORT=${gameServerPort} npm run dev:game`,
                    url: `http://localhost:${gameServerPort}/games`,
                    reuseExistingServer,
                    timeout: 120000,
                },
            ]
            : []),
        ...(shouldStartApiServer
            ? [
                {
                    command: 'npm run dev:api',
                    url: 'http://localhost:18001/health',
                    reuseExistingServer,
                    timeout: 120000,
                },
            ]
            : []),
    ]
    : undefined;

export default defineConfig({
    testDir: './e2e',
    testMatch: '**/*.e2e.ts',
    timeout: 30000,
    expect: {
        timeout: 5000
    },
    // 当前所有测试共享同一个游戏服务器进程，服务端无 per-test 状态隔离，
    // 因此必须串行执行。未来添加服务端状态重置后可改为并行。
    fullyParallel: false,
    forbidOnly: !!process.env.CI,
    retries: 0,
    workers: 1,
    reporter: 'list',
    outputDir: './test-results',
    use: {
        // Priority: ENV variable > configured port > Default localhost:5173
        baseURL,
        trace: 'on-first-retry',
        screenshot: 'only-on-failure',
    },
    ...(webServerConfig ? { webServer: webServerConfig } : {}),
    projects: [
        {
            name: 'chromium',
            use: { ...devices['Desktop Chrome'] },
        },
    ],
});
