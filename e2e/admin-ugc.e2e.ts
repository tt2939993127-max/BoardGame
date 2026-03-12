import path from 'node:path';
import { test, expect } from '@playwright/test';

test.describe('Admin UGC 管理 E2E', () => {
    test.beforeEach(async ({ page }) => {
        await page.addInitScript(() => {
            localStorage.setItem('i18nextLng', 'zh-CN');
            localStorage.setItem('auth_token', 'fake_admin_token');
            localStorage.setItem(
                'auth_user',
                JSON.stringify({
                    id: 'admin_1',
                    username: 'Admin',
                    role: 'admin',
                    banned: false,
                })
            );
        });
    });

    test('UGC 包列表/下架/删除流程', async ({ page }) => {
        const now = new Date().toISOString();
        let packages = [
            {
                packageId: 'ugc-pub-a',
                name: '测试 UGC 包 A',
                ownerId: 'user-a',
                status: 'published',
                publishedAt: now,
                createdAt: now,
                updatedAt: now,
            },
            {
                packageId: 'ugc-draft-b',
                name: '测试 UGC 包 B',
                ownerId: 'user-b',
                status: 'draft',
                publishedAt: null,
                createdAt: now,
                updatedAt: now,
            },
        ];

        await page.route('**/admin/ugc/packages**', async (route) => {
            const request = route.request();
            const url = new URL(request.url());
            const segments = url.pathname.split('/').filter(Boolean);

            if (request.method() === 'GET') {
                return route.fulfill({
                    status: 200,
                    json: {
                        items: packages,
                        page: 1,
                        limit: 10,
                        total: packages.length,
                        hasMore: false,
                    },
                });
            }

            if (request.method() === 'POST' && segments[segments.length - 1] === 'unpublish') {
                const packageId = segments[segments.length - 2];
                const target = packages.find(item => item.packageId === packageId);
                if (!target) {
                    return route.fulfill({ status: 404, json: { error: 'not found' } });
                }
                target.status = 'draft';
                target.publishedAt = null;
                target.updatedAt = new Date().toISOString();
                return route.fulfill({ status: 200, json: { package: target } });
            }

            if (request.method() === 'DELETE') {
                const packageId = segments[segments.length - 1];
                packages = packages.filter(item => item.packageId !== packageId);
                return route.fulfill({ status: 200, json: { deleted: true, assetsDeleted: 0 } });
            }

            return route.fulfill({ status: 404, json: { error: 'unknown' } });
        });

        await page.goto('/admin/ugc', { waitUntil: 'domcontentloaded' });
        await expect(page.getByRole('heading', { name: 'UGC 管理' })).toBeVisible({ timeout: 15000 });

        const publishedRow = page.locator('tr', { hasText: 'ugc-pub-a' });
        const draftRow = page.locator('tr', { hasText: 'ugc-draft-b' });

        await expect(publishedRow).toBeVisible();
        await expect(draftRow).toBeVisible();
        await expect(publishedRow.getByText('已发布')).toBeVisible();

        page.once('dialog', dialog => dialog.accept());
        await Promise.all([
            page.waitForResponse(resp => resp.url().includes('/admin/ugc/packages/ugc-pub-a/unpublish') && resp.status() === 200),
            publishedRow.getByRole('button', { name: '下架' }).click(),
        ]);

        await expect(publishedRow.getByText('草稿')).toBeVisible();
        await expect(publishedRow.getByRole('button', { name: '下架' })).toBeDisabled();

        page.once('dialog', dialog => dialog.accept());
        await Promise.all([
            page.waitForResponse(resp => resp.url().includes('/admin/ugc/packages/ugc-draft-b') && resp.status() === 200),
            draftRow.getByRole('button', { name: '删除' }).click(),
        ]);

        await expect(page.locator('tr', { hasText: 'ugc-draft-b' })).toHaveCount(0);
    });

    test('用户详情页可提升管理员并展示审计提示', async ({ page }, testInfo) => {
        const now = new Date().toISOString();
        const user = {
            id: 'user-role-1',
            username: '测试用户',
            email: 'user-role@example.com',
            role: 'user',
            banned: false,
            createdAt: now,
            lastOnline: now,
            avatar: '',
        };
        const roleUpdates: string[] = [];

        await page.route('**/admin/users/**', async (route) => {
            const request = route.request();
            if (request.resourceType() === 'document') {
                return route.continue();
            }

            const url = new URL(request.url());
            const segments = url.pathname.split('/').filter(Boolean);
            const targetId = segments[segments.length - 1];

            if (request.method() === 'GET' && targetId === user.id) {
                return route.fulfill({
                    status: 200,
                    json: {
                        user,
                        stats: {
                            totalMatches: 3,
                            wins: 2,
                            winRate: 66.7,
                        },
                    },
                });
            }

            if (request.method() === 'PATCH' && segments[segments.length - 1] === 'role' && segments[segments.length - 2] === user.id) {
                const body = request.postDataJSON() as { role?: 'user' | 'admin' };
                if (!body.role) {
                    return route.fulfill({ status: 400, json: { error: '缺少角色' } });
                }

                user.role = body.role;
                roleUpdates.push(body.role);
                return route.fulfill({
                    status: 200,
                    json: {
                        message: '用户角色已更新',
                        changed: true,
                        user: {
                            id: user.id,
                            username: user.username,
                            role: user.role,
                        },
                    },
                });
            }

            return route.fulfill({ status: 404, json: { error: 'unknown user route' } });
        });

        await page.route('**/admin/matches**', async (route) => {
            const request = route.request();
            const url = new URL(request.url());
            if (request.method() === 'GET' && url.searchParams.get('search') === user.id) {
                return route.fulfill({
                    status: 200,
                    json: {
                        items: [],
                        page: 1,
                        limit: 100,
                        total: 0,
                    },
                });
            }

            return route.fulfill({ status: 404, json: { error: 'unknown matches route' } });
        });

        await page.goto(`/admin/users/${user.id}`, { waitUntil: 'domcontentloaded' });
        await expect(page.getByRole('heading', { name: user.username })).toBeVisible({ timeout: 15000 });

        const promoteButton = page.getByRole('button', { name: '设为管理员' });
        await expect(promoteButton).toBeVisible();

        await promoteButton.click();
        await expect(page.getByText(`确认将 ${user.username} 提升为管理员？本次操作会写入审计日志。`)).toBeVisible();

        await Promise.all([
            page.waitForResponse(resp =>
                resp.url().includes(`/admin/users/${user.id}/role`) &&
                resp.request().method() === 'PATCH' &&
                resp.status() === 200
            ),
            page.getByRole('button', { name: '确认提升' }).click(),
        ]);

        await expect(page.getByRole('button', { name: '撤销管理员' })).toBeVisible();
        await expect(page.getByText('ADMIN', { exact: true })).toBeVisible();
        expect(roleUpdates).toEqual(['admin']);

        const evidenceScreenshotPath = path.join(
            process.cwd(),
            'evidence',
            'screenshots',
            'admin-user-role-button-e2e.png'
        );
        await page.screenshot({
            path: testInfo.outputPath('admin-user-role-updated.png'),
            fullPage: true,
        });
        await page.screenshot({
            path: evidenceScreenshotPath,
            fullPage: true,
        });
    });

    test('用户详情页显示详情接口返回的近期对局记录', async ({ page }, testInfo) => {
        const now = new Date().toISOString();
        const user = {
            id: 'user-match-1',
            username: '对局用户',
            email: 'user-match@example.com',
            role: 'user',
            banned: false,
            createdAt: now,
            lastOnline: now,
            avatar: '',
        };
        let matchesRequestCount = 0;

        await page.route('**/admin/users/**', async (route) => {
            const request = route.request();
            if (request.resourceType() === 'document') {
                return route.continue();
            }

            const url = new URL(request.url());
            const segments = url.pathname.split('/').filter(Boolean);
            const targetId = segments[segments.length - 1];

            if (request.method() === 'GET' && targetId === user.id) {
                return route.fulfill({
                    status: 200,
                    json: {
                        user,
                        stats: {
                            totalMatches: 1,
                            wins: 1,
                            winRate: 100,
                        },
                        recentMatches: [
                            {
                                matchID: 'match-user-1',
                                gameName: 'tictactoe',
                                result: 'win',
                                opponent: '对手甲',
                                endedAt: now,
                            },
                        ],
                    },
                });
            }

            return route.fulfill({ status: 404, json: { error: 'unknown user route' } });
        });

        await page.route('**/admin/matches**', async (route) => {
            matchesRequestCount += 1;
            return route.fulfill({
                status: 200,
                json: {
                    items: [],
                    page: 1,
                    limit: 100,
                    total: 0,
                },
            });
        });

        await page.goto(`/admin/users/${user.id}`, { waitUntil: 'domcontentloaded' });
        await expect(page.getByRole('heading', { name: user.username })).toBeVisible({ timeout: 15000 });
        await expect(page.getByText('共 1 条')).toBeVisible();
        await expect(page.locator('tr', { hasText: '对手甲' })).toBeVisible();
        await expect(page.locator('tr', { hasText: '对手甲' }).getByText('胜利')).toBeVisible();
        await expect(page.locator('tr', { hasText: '对手甲' }).getByText('tictactoe')).toBeVisible();
        expect(matchesRequestCount).toBe(0);

        const evidenceScreenshotPath = path.join(
            process.cwd(),
            'evidence',
            'screenshots',
            'admin-user-recent-matches-e2e.png'
        );
        await page.screenshot({
            path: testInfo.outputPath('admin-user-recent-matches.png'),
            fullPage: true,
        });
        await page.screenshot({
            path: evidenceScreenshotPath,
            fullPage: true,
        });
    });
});
