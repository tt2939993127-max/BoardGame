import { test, expect } from '@playwright/test';

/**
 * 账户设置弹窗 E2E 测试
 * 
 * 覆盖：
 * - 从 UserMenu 打开账户设置弹窗
 * - 修改昵称（正常 + 校验）
 * - 修改密码（正常 + 校验）
 * - 邮箱显示与操作入口
 */

test.describe('账户设置', () => {
    test.beforeEach(async ({ page }) => {
        await page.addInitScript(() => {
            localStorage.setItem('i18nextLng', 'zh-CN');
            localStorage.setItem('auth_token', 'fake_jwt_token');
            localStorage.setItem('auth_user', JSON.stringify({
                id: 'user_123',
                username: '旧昵称',
                email: 'test@example.com',
                emailVerified: true,
                avatar: null,
                role: 'user',
                banned: false,
            }));
        });

        // mock /auth/me
        await page.route('**/auth/me', async route => {
            await route.fulfill({
                json: {
                    user: {
                        id: 'user_123',
                        username: '旧昵称',
                        email: 'test@example.com',
                        emailVerified: true,
                        avatar: null,
                        role: 'user',
                        banned: false,
                    },
                },
            });
        });

        // mock 通知接口
        await page.route('**/notifications', async route => {
            await route.fulfill({ json: { notifications: [] } });
        });
    });

    test('打开账户设置弹窗并显示用户信息', async ({ page }) => {
        await page.goto('/');

        // 点击用户名/头像打开菜单
        await page.getByText('旧昵称').click();

        // 点击"账户设置"
        await page.getByText('账户设置').click();

        // 验证弹窗打开
        const modal = page.locator('.pointer-events-auto').first();
        await expect(modal).toBeVisible();

        // 验证显示当前昵称
        await expect(modal.getByText('旧昵称')).toBeVisible();

        // 验证显示邮箱
        await expect(modal.getByText('test@example.com')).toBeVisible();

        // 验证密码区域显示
        await expect(modal.getByText('••••••')).toBeVisible();
    });

    test('修改昵称成功', async ({ page }) => {
        let lastBody: unknown = null;

        await page.route('**/auth/update-username', async route => {
            lastBody = JSON.parse(route.request().postData() || '{}');
            await route.fulfill({
                json: {
                    message: '昵称修改成功',
                    user: {
                        id: 'user_123',
                        username: '新昵称',
                        email: 'test@example.com',
                        emailVerified: true,
                        role: 'user',
                        banned: false,
                    },
                },
            });
        });

        await page.goto('/');
        await page.getByText('旧昵称').click();
        await page.getByText('账户设置').click();

        const modal = page.locator('.pointer-events-auto').first();
        await expect(modal).toBeVisible();

        // 找到昵称行的"修改"按钮（第二个，第一个是头像的）
        const editButtons = modal.getByText('修改');
        // 昵称行的修改按钮
        await editButtons.nth(1).click();

        // 清空并输入新昵称
        const input = modal.locator('input[type="text"]');
        await input.clear();
        await input.fill('新昵称');

        // 点击确认（绿色勾）
        await modal.locator('button[aria-label="保存"]').click();

        // 验证请求发送正确
        await expect.poll(() => lastBody).toEqual({ username: '新昵称' });

        // 验证 UI 更新
        await expect(modal.getByText('新昵称')).toBeVisible();
    });

    test('修改密码成功', async ({ page }) => {
        let lastBody: unknown = null;

        await page.route('**/auth/change-password', async route => {
            lastBody = JSON.parse(route.request().postData() || '{}');
            await route.fulfill({ status: 200, json: { message: 'ok' } });
        });

        await page.goto('/');
        await page.getByText('旧昵称').click();
        await page.getByText('账户设置').click();

        const modal = page.locator('.pointer-events-auto').first();
        await expect(modal).toBeVisible();

        // 点击密码行的"修改"按钮
        await modal.getByText('修改').nth(2).click();

        // 填写密码表单
        const inputs = modal.locator('input[type="password"]');
        await inputs.nth(0).fill('oldpass');
        await inputs.nth(1).fill('newpass1234');
        await inputs.nth(2).fill('newpass1234');

        // 点击"修改密码"按钮
        await modal.getByText('修改密码').click();

        // 验证请求
        await expect.poll(() => lastBody).toEqual({
            currentPassword: 'oldpass',
            newPassword: 'newpass1234',
        });
    });

    test('密码不一致时显示错误', async ({ page }) => {
        await page.goto('/');
        await page.getByText('旧昵称').click();
        await page.getByText('账户设置').click();

        const modal = page.locator('.pointer-events-auto').first();
        await expect(modal).toBeVisible();

        // 点击密码行的"修改"按钮
        await modal.getByText('修改').nth(2).click();

        // 填写不一致的密码
        const inputs = modal.locator('input[type="password"]');
        await inputs.nth(0).fill('oldpass');
        await inputs.nth(1).fill('newpass1234');
        await inputs.nth(2).fill('different');

        await modal.getByText('修改密码').click();

        // 验证错误提示
        await expect(modal.getByText('两次输入的密码不一致')).toBeVisible();
    });

    test('UserMenu 不再显示旧的"设置头像"和"绑定邮箱"', async ({ page }) => {
        await page.goto('/');
        await page.getByText('旧昵称').click();

        // 菜单中应该有"账户设置"
        await expect(page.getByText('账户设置')).toBeVisible();

        // 菜单中不应该有旧的"设置头像"和"绑定邮箱"
        await expect(page.getByText('设置头像')).not.toBeVisible();
        await expect(page.getByText('绑定邮箱')).not.toBeVisible();
        await expect(page.getByText('已绑定邮箱')).not.toBeVisible();
    });
});
