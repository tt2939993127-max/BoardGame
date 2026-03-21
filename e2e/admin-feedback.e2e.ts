import { test, expect, type Page } from '@playwright/test';

type StoredUser = {
    id: string;
    username: string;
    role: 'user' | 'developer' | 'admin';
    banned: boolean;
};

const ADMIN_E2E_TIMEOUT_MS = 180_000;
const ADMIN_NAVIGATION_TIMEOUT_MS = 60_000;
const ADMIN_PAGE_READY_TIMEOUT_MS = 90_000;
const HTML_NAVIGATION_HEADERS = {
    Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
};

const setStoredAuth = async (page: Page, user: StoredUser) => {
    await page.addInitScript((storedUser) => {
        localStorage.setItem('i18nextLng', 'zh-CN');
        localStorage.setItem('auth_token', 'fake_admin_token');
        localStorage.setItem('auth_user', JSON.stringify(storedUser));
    }, user);
};

const mockClipboard = async (page: Page) => {
    await page.addInitScript(() => {
        let copied = '';
        Object.defineProperty(navigator, 'clipboard', {
            configurable: true,
            value: {
                writeText: async (text: string) => {
                    copied = text;
                },
                readText: async () => copied,
            },
        });
    });
};

const gotoFrontendRoute = async (page: Page, targetPath: string) => {
    await expect.poll(async () => {
        try {
            const readyResponse = await page.request.get('/__ready', {
                failOnStatusCode: false,
            });
            if (readyResponse.status() !== 200) {
                return `ready:${readyResponse.status()}`;
            }

            const response = await page.request.get(targetPath, {
                failOnStatusCode: false,
                headers: HTML_NAVIGATION_HEADERS,
            });
            if (response.status() !== 200) {
                return `status:${response.status()}`;
            }

            const body = await response.text();
            return body.includes('<!doctype html>') ? 'ready' : 'not-html';
        } catch (error) {
            return `network:${error instanceof Error ? error.name : 'unknown'}`;
        }
    }, {
        timeout: ADMIN_NAVIGATION_TIMEOUT_MS,
        intervals: [500, 1000, 2000],
        message: `等待前端路由可访问: ${targetPath}`,
    }).toBe('ready');

    await page.goto(targetPath, { waitUntil: 'commit' });
};

test.describe('后台反馈管理 E2E', () => {
    test.describe.configure({ timeout: ADMIN_E2E_TIMEOUT_MS });

    test.beforeEach(async ({ page, context }) => {
        page.setDefaultNavigationTimeout(ADMIN_NAVIGATION_TIMEOUT_MS);
        await context.grantPermissions(['clipboard-read', 'clipboard-write']);
        await mockClipboard(page);

        await page.route('**/auth/me', async (route) => {
            await route.fulfill({
                status: 200,
                json: {
                    user: {
                        id: 'admin_1',
                        username: 'Admin',
                        role: 'admin',
                        banned: false,
                    },
                },
            });
        });

        await page.route('**/*', async (route) => {
            const url = new URL(route.request().url());
            if (url.pathname === '/notifications') {
                await route.fulfill({ status: 200, json: { notifications: [] } });
                return;
            }
            if (url.pathname === '/auth/friends') {
                await route.fulfill({ status: 200, json: { friends: [] } });
                return;
            }
            if (url.pathname === '/auth/friends/requests') {
                await route.fulfill({ status: 200, json: { requests: [] } });
                return;
            }
            if (url.pathname === '/auth/messages/conversations') {
                await route.fulfill({ status: 200, json: { conversations: [] } });
                return;
            }
            await route.fallback();
        });
    });

    test('反馈管理可导出 AI payload 并刷新 viewer', async ({ page }) => {
        page.on('console', (msg) => {
            if (msg.type() === 'error' || msg.type() === 'warning') {
                // eslint-disable-next-line no-console
                console.log(`[browser:${msg.type()}] ${msg.text()}`);
            }
        });
        page.on('pageerror', (err) => {
            // eslint-disable-next-line no-console
            console.log(`[pageerror] ${err.message}`);
        });
        await setStoredAuth(page, {
            id: 'admin_1',
            username: 'Admin',
            role: 'admin',
            banned: false,
        });

        const feedbackItem = {
            _id: 'feedback_001',
            userId: {
                _id: 'user_001',
                username: '测试员',
            },
            content: '这张牌效果不对，会把弃牌堆单位放回手牌。',
            type: 'bug',
            severity: 'medium',
            status: 'open',
            gameName: '大杀四方',
            contactInfo: 'tester@example.com',
            actionLog: JSON.stringify([
                { step: 'play-card', cardId: 'card-001' },
                { step: 'select-target', targetId: 'minion-77' },
            ]),
            stateSnapshot: JSON.stringify({
                gameId: 'smashup',
                turn: 3,
                currentPlayer: 'P1',
                field: [{ id: 'minion-77', owner: 'P1' }],
            }),
            createdAt: '2026-03-14T10:00:00.000Z',
        };

        await page.route('**/admin/feedback?*', async (route) => {
            const request = route.request();
            if (request.method() !== 'GET') {
                return route.fallback();
            }
            const url = new URL(request.url());
            if (url.pathname !== '/admin/feedback') {
                return route.fallback();
            }
            return route.fulfill({
                status: 200,
                json: {
                    items: [feedbackItem],
                    total: 1,
                    limit: 100,
                    page: 1,
                },
            });
        });

        await gotoFrontendRoute(page, '/admin/feedback');

        const row = page.locator('[data-testid="feedback-row"][data-feedback-id="feedback_001"]');
        await expect(row).toBeVisible({ timeout: ADMIN_PAGE_READY_TIMEOUT_MS });
        await row.click();

        await expect(page.getByTestId('feedback-action-log-toggle')).toBeVisible();
        await expect(page.getByTestId('feedback-state-snapshot-toggle')).toBeVisible();
        await expect(page.getByTestId('feedback-copy-ai-payload')).toBeVisible();

        await page.getByTestId('feedback-copy-ai-payload').click();

        const viewer = page.getByTestId('feedback-ai-payload-viewer');
        await expect(viewer).toBeVisible();

        const payloadText = await viewer.inputValue();
        const payload = JSON.parse(payloadText) as {
            feedbackId: string;
            content: string;
            operationLogs: unknown[];
            stateSnapshot: { gameId?: string } | null;
        };

        expect(payload.feedbackId).toBe('feedback_001');
        expect(payload.content).toContain('这张牌效果不对');
        expect(Array.isArray(payload.operationLogs)).toBeTruthy();
        expect(payload.operationLogs).toHaveLength(2);
        expect(payload.stateSnapshot).not.toBeNull();
        expect(payload.stateSnapshot?.gameId).toBe('smashup');

        await page.screenshot({
            path: 'test-results/admin-feedback-ai-payload.png',
            fullPage: true,
        });
    });
});
