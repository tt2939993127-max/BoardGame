import { test, expect } from '@playwright/test';

test.describe('Auth Modal E2E', () => {
    test.beforeEach(async ({ page }) => {
        await page.addInitScript(() => {
            localStorage.setItem('i18nextLng', 'en');
        });
        await page.goto('/');
        await expect(page.getByRole('heading', { name: /Yi Board Game|易桌游/, level: 1 })).toBeVisible();
    });

    test('Login modal renders required fields', async ({ page }) => {
        await page.getByRole('button', { name: /Log In|登录/i }).click();
        await expect(page.getByRole('heading', { name: /Welcome Back|欢迎回来/i })).toBeVisible();
        await expect(page.getByPlaceholder(/Enter email|输入邮箱|邮箱/i)).toBeVisible();
        await expect(page.locator('input[type="password"]')).toBeVisible();
    });

    test('Register modal renders confirm password field', async ({ page }) => {
        await page.getByRole('button', { name: /Sign Up|注册/i }).click();
        await expect(page.getByRole('heading', { name: /Create Account|创建账户/i })).toBeVisible();
        await expect(page.getByPlaceholder(/your@email\.com/i)).toBeVisible();
        await expect(page.getByPlaceholder(/000000/)).toBeVisible();
        await expect(page.getByPlaceholder(/Nickname|昵称/i)).toBeVisible();
        await expect(page.locator('input[type="password"]')).toHaveCount(2);
        await expect(page.locator('input[type="password"]').nth(1)).toBeVisible();
    });
});
