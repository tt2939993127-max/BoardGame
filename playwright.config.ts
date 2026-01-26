import { defineConfig, devices } from '@playwright/test';
import * as dotenv from 'dotenv';
import path from 'path';

// Load environment variables from .env file
dotenv.config();

export default defineConfig({
    testDir: './e2e',
    timeout: 30000,
    expect: {
        timeout: 5000
    },
    fullyParallel: true,
    forbidOnly: !!process.env.CI,
    retries: 0,
    workers: 1,
    reporter: 'list',
    use: {
        // Priority: ENV variable > Default localhost:5173
        baseURL: process.env.VITE_FRONTEND_URL || 'http://localhost:5173',
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
