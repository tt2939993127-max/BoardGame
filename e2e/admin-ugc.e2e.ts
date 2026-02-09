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

        await page.goto('/admin/ugc');
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
});
