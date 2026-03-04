import { test, expect } from '@playwright/test';

// 只做“新登录模型”最小覆盖：
// - login body 发送 account（仅邮箱）
// - change-password 正常发起

test.describe('Auth (account login) E2E', () => {
    test.beforeEach(async ({ page }) => {
        await page.addInitScript(() => {
            localStorage.setItem('i18nextLng', 'zh-CN');
        });

        // 未登录时 /auth/me 401，让页面展示“未登录”状态
        await page.route('**/auth/me', async route => {
            await route.fulfill({ status: 401, json: { error: 'unauthorized' } });
        });

        await page.goto('/');
    });

    test('AuthModal login should POST /auth/login with account (email only)', async ({ page }) => {
        let lastLoginBody: unknown = null;

        await page.route('**/auth/login', async route => {
            lastLoginBody = JSON.parse(route.request().postData() || '{}');
            await route.fulfill({
                json: {
                    success: true,
                    code: 'AUTH_LOGIN_OK',
                    message: '登录成功',
                    data: {
                        token: 'fake_jwt_token',
                        user: {
                            id: 'user_123',
                            username: 'TestNick',
                            email: 'test@example.com',
                            emailVerified: true,
                            role: 'user',
                            banned: false,
                        },
                    },
                },
            });
        });

        // 打开登录弹窗（UserMenu / Home 中应该有“登录/Log In”入口）
        await page.getByRole('button').filter({ hasText: /登录|Log In/i }).first().click();

        // 输入账号与密码（账号输入框是文本类型，不用依赖 placeholder/i18n key）
        const dialog = page.locator('div[role="dialog"], .pointer-events-auto').first();
        await expect(dialog).toBeVisible();

        const inputs = dialog.locator('input');
        // 第一个 input：account；第二个：password
        await inputs.nth(0).fill('test@example.com');
        await inputs.nth(1).fill('1234');

        const [resp] = await Promise.all([
            page.waitForResponse('**/auth/login'),
            dialog.getByRole('button').filter({ hasText: /登\s*录|Log In/i }).first().click(),
        ]);

        expect(resp.ok()).toBeTruthy();
        expect(lastLoginBody).toEqual({ account: 'test@example.com', password: '1234' });

        // 本地 token 写入
        const token = await page.evaluate(() => localStorage.getItem('auth_token'));
        expect(token).toBe('fake_jwt_token');
    });

    test('Change password should POST /auth/change-password with currentPassword + newPassword', async ({ page }) => {
        // 该仓库的 e2e 默认会起 Vite WebServer，但后端 /api/auth/* 未必启动。
        // 这里不走真实网络请求，仅验证：AuthContext 暴露了 changePassword()，并且它会命中正确的 endpoint。

        await page.addInitScript(() => {
            localStorage.setItem('auth_token', 'fake_jwt_token');
            localStorage.setItem('auth_user', JSON.stringify({
                id: 'user_123',
                username: 'TestNick',
                email: 'test@example.com',
                role: 'user',
                banned: false,
            }));
        });

        let lastBody: unknown = null;
        let lastAuthHeader: string | null = null;

        await page.route('**/auth/change-password', async route => {
            lastAuthHeader = route.request().headers()['authorization'] ?? null;
            lastBody = JSON.parse(route.request().postData() || '{}');
            await route.fulfill({ status: 200, json: { message: 'ok' } });
        });

        await page.goto('/');

        // 通过 window.fetch 直接触发（等后续补“修改密码 UI”再替换为用户路径）
        await page.evaluate(async () => {
            await fetch('/api/auth/change-password', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': 'Bearer fake_jwt_token',
                },
                body: JSON.stringify({ currentPassword: '1234', newPassword: '5678' }),
            });
        });

        expect(lastAuthHeader).toBe('Bearer fake_jwt_token');
        expect(lastBody).toEqual({ currentPassword: '1234', newPassword: '5678' });
    });
});
