import { test, expect } from '@playwright/test';

test.describe('Lobby E2E', () => {
    test.beforeEach(async ({ page }) => {
        await page.addInitScript(() => {
            localStorage.setItem('i18nextLng', 'en');
        });
        await page.goto('/');
        await page.waitForLoadState('domcontentloaded');
        await expect(page.getByRole('heading', { name: /Yi Board Game|易桌游/, level: 1 })).toBeVisible({ timeout: 15000 });
    });

    test('Category filters show expected games', async ({ page }) => {
        // Tools should only show Asset Slicer
        await page.getByRole('button', { name: /Tools|工具/i }).click();
        await expect(page.getByRole('heading', { name: /Asset Slicer|素材切片机/i })).toBeVisible();
        await expect(page.getByRole('heading', { name: /Dice Throne|王权骰铸/i })).toHaveCount(0);
        await expect(page.getByRole('heading', { name: /Tic-Tac-Toe|井字棋/i })).toHaveCount(0);

        // All Games should hide tools and show strategy games
        await page.getByRole('button', { name: /All Games|全部游戏/i }).click();
        await expect(page.getByRole('heading', { name: /Dice Throne|王权骰铸/i })).toBeVisible();
        await expect(page.getByRole('heading', { name: /Tic-Tac-Toe|井字棋/i })).toBeVisible();
        await expect(page.getByRole('heading', { name: /Asset Slicer|素材切片机/i })).toHaveCount(0);
    });

    test('Game details modal opens and shows actions', async ({ page }) => {
        await page.getByRole('heading', { name: /Tic-Tac-Toe|井字棋/i }).click();
        await expect(page).toHaveURL(/game=tictactoe/);

        await expect(page.getByRole('button', { name: /Create Room|创建房间/i })).toBeVisible();
        await expect(page.getByRole('button', { name: /Local|本地/i })).toBeVisible();
        await expect(page.getByRole('button', { name: /Tutorial|教程/i })).toBeVisible();

        // Switch to leaderboard tab and verify data loads (not stuck on loading)
        await page.getByRole('button', { name: /Leaderboard|排行榜/i }).click();
        // 排行榜应完成加载：显示"Top Wins/胜场排行"（有数据）或"No data/暂无数据"（空），不能一直卡在 loading
        await expect(page.getByText(/Top Wins|胜场排行|No data|暂无数据/i)).toBeVisible({ timeout: 10000 });
    });
});
