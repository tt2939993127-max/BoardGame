import { expect, test, type Page } from '@playwright/test';

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
        localStorage.setItem('auth_token', `fake_${storedUser.role}_token`);
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
            if (readyResponse.status() !== 200) return `ready:${readyResponse.status()}`;

            const response = await page.request.get(targetPath, {
                failOnStatusCode: false,
                headers: HTML_NAVIGATION_HEADERS,
            });
            if (response.status() !== 200) return `status:${response.status()}`;

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
            const authHeader = route.request().headers().authorization ?? '';
            const role = authHeader.includes('fake_developer_token') ? 'developer' : 'admin';
            await route.fulfill({
                status: 200,
                json: {
                    user: {
                        id: role === 'developer' ? 'developer_1' : 'admin_1',
                        username: role === 'developer' ? 'Developer' : 'Admin',
                        role,
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

    test('反馈页可展示分诊上下文并复制完整分诊包', async ({ page }) => {
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
                email: 'tester@example.com',
            },
            content: '这张卡效果不对，会把弃牌堆单位放回手牌。',
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
            clientContext: {
                route: '/play/smashup/match/abc',
                mode: 'online',
                matchId: 'abc',
                playerId: '0',
                gameId: 'smashup',
                appVersion: 'test-build',
                viewport: { width: 1440, height: 900 },
                language: 'zh-CN',
                timezone: 'Asia/Shanghai',
            },
            errorContext: {
                name: 'TypeError',
                message: 'Cannot read properties of undefined',
                source: 'react.error_boundary',
            },
            createdAt: '2026-03-14T10:00:00.000Z',
        };

        await page.route('**/admin/feedback?*', async (route) => {
            if (route.request().method() !== 'GET') return route.fallback();
            const url = new URL(route.request().url());
            if (url.pathname !== '/admin/feedback') return route.fallback();

            return route.fulfill({
                status: 200,
                json: {
                    items: [feedbackItem],
                    total: 1,
                    limit: 20,
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
        await expect(row.locator('div').filter({ hasText: /^\/play\/smashup\/match\/abc$/ })).toBeVisible();
        await expect(row.getByTestId('feedback-error-context-panel').getByText('TypeError', { exact: true })).toBeVisible();

        await page.getByTestId('feedback-copy-ai-payload').click();

        const viewer = page.getByTestId('feedback-ai-payload-viewer');
        await expect(viewer).toBeVisible();

        const payloadText = await viewer.inputValue();
        const payload = JSON.parse(payloadText) as {
            feedbackId: string;
            content: string;
            reporterEmail: string | null;
            clientContext: { matchId?: string } | null;
            errorContext: { name?: string } | null;
            operationLogs: unknown[];
            stateSnapshot: { gameId?: string } | null;
        };

        expect(payload.feedbackId).toBe('feedback_001');
        expect(payload.content).toContain('这张卡效果不对');
        expect(payload.reporterEmail).toBe('tester@example.com');
        expect(payload.clientContext?.matchId).toBe('abc');
        expect(payload.errorContext?.name).toBe('TypeError');
        expect(Array.isArray(payload.operationLogs)).toBeTruthy();
        expect(payload.operationLogs).toHaveLength(2);
        expect(payload.stateSnapshot?.gameId).toBe('smashup');

        await page.screenshot({
            path: 'test-results/admin-feedback-ai-payload.png',
            fullPage: true,
        });
    });

    test('反馈列表按页请求并可切换分页', async ({ page }) => {
        await setStoredAuth(page, {
            id: 'admin_1',
            username: 'Admin',
            role: 'admin',
            banned: false,
        });

        const requests: string[] = [];

        await page.route('**/admin/feedback?*', async (route) => {
            if (route.request().method() !== 'GET') return route.fallback();

            const url = new URL(route.request().url());
            const currentPage = url.searchParams.get('page') ?? '1';
            const limit = url.searchParams.get('limit') ?? '';
            requests.push(`${currentPage}:${limit}`);

            if (currentPage === '2') {
                return route.fulfill({
                    status: 200,
                    json: {
                        items: [{
                            _id: 'feedback_page_2',
                            content: '第二页反馈',
                            type: 'other',
                            severity: 'low',
                            status: 'open',
                            createdAt: '2026-03-14T11:00:00.000Z',
                        }],
                        total: 21,
                        limit: 20,
                        page: 2,
                    },
                });
            }

            return route.fulfill({
                status: 200,
                json: {
                    items: [{
                        _id: 'feedback_page_1',
                        content: '第一页反馈',
                        type: 'bug',
                        severity: 'medium',
                        status: 'open',
                        createdAt: '2026-03-14T10:00:00.000Z',
                    }],
                    total: 21,
                    limit: 20,
                    page: 1,
                },
            });
        });

        await gotoFrontendRoute(page, '/admin/feedback');

        await expect(page.locator('[data-testid="feedback-row"][data-feedback-id="feedback_page_1"]')).toBeVisible({
            timeout: ADMIN_PAGE_READY_TIMEOUT_MS,
        });
        await expect(page.getByTestId('feedback-pagination-indicator')).toHaveText('1 / 2');

        await page.getByTestId('feedback-pagination-next').click();

        await expect(page.locator('[data-testid="feedback-row"][data-feedback-id="feedback_page_2"]')).toBeVisible({
            timeout: ADMIN_PAGE_READY_TIMEOUT_MS,
        });
        await expect(page.getByTestId('feedback-pagination-indicator')).toHaveText('2 / 2');
        expect(requests[0]).toBe('1:20');
        expect(requests.every((entry) => entry.endsWith(':20'))).toBeTruthy();
        expect(requests.includes('2:20')).toBeTruthy();

        await page.screenshot({
            path: 'test-results/evidence-screenshots/admin-feedback-pagination.png',
            fullPage: true,
        });
    });

    test('developer 可以进入反馈页但只读', async ({ page }) => {
        await setStoredAuth(page, {
            id: 'developer_1',
            username: 'Developer',
            role: 'developer',
            banned: false,
        });

        await page.route('**/admin/feedback?*', async (route) => {
            if (route.request().method() !== 'GET') return route.fallback();
            return route.fulfill({
                status: 200,
                json: {
                    items: [{
                        _id: 'feedback_readonly_001',
                        content: '开发者应可查看这条反馈',
                        type: 'suggestion',
                        severity: 'low',
                        status: 'open',
                        createdAt: '2026-03-14T10:00:00.000Z',
                    }],
                    total: 1,
                    limit: 20,
                    page: 1,
                },
            });
        });

        await gotoFrontendRoute(page, '/admin/feedback');

        await expect(page.getByText('只读')).toBeVisible({ timeout: ADMIN_PAGE_READY_TIMEOUT_MS });
        await expect(page.getByText('开发者可以查看与复制反馈分诊包，但状态更新和删除仍然只有管理员可用。')).toBeVisible({
            timeout: ADMIN_PAGE_READY_TIMEOUT_MS,
        });
        await expect(page.locator('input[type="checkbox"]')).toHaveCount(0);

        const row = page.locator('[data-testid="feedback-row"][data-feedback-id="feedback_readonly_001"]');
        await expect(row).toBeVisible({ timeout: ADMIN_PAGE_READY_TIMEOUT_MS });
        await row.click();
        await expect(page.getByTestId('feedback-copy-ai-payload')).toBeVisible();

        await page.screenshot({
            path: 'test-results/admin-feedback-developer-readonly.png',
            fullPage: true,
        });
    });
});
