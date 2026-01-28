import { test, expect } from '@playwright/test';

const mockUser = {
    id: 'user-review-test',
    username: 'ReviewerBot',
    email: 'reviewer@example.com',
    emailVerified: true
};

test.describe('Game Review System', () => {
    test.beforeEach(async ({ page }) => {
        // Mock user login
        await page.route('**/auth/me', async route => {
            await route.fulfill({ json: { user: mockUser } });
        });

        // Mock initial stats (empty)
        await page.route('**/auth/reviews/*/stats', async route => {
            await route.fulfill({
                json: {
                    gameId: 'tictactoe',
                    positive: 0,
                    negative: 0,
                    total: 0,
                    rate: 0
                }
            });
        });

        // Mock my review (not reviewed yet)
        await page.route('**/auth/reviews/*/mine', async route => {
            await route.fulfill({ status: 404 });
        });

        // Mock reviews list (empty)
        await page.route('**/auth/reviews/*?*', async route => {
            await route.fulfill({
                json: {
                    items: [],
                    page: 1,
                    limit: 5,
                    total: 0,
                    hasMore: false
                }
            });
        });

        await page.goto('/?game=tictactoe');
    });

    test('should allow a logged-in user to post a review', async ({ page }) => {
        // 1. Check if review section is visible
        const reviewSection = page.getByRole('heading', { name: '游戏评价' });
        await expect(reviewSection).toBeVisible();

        // 2. Mock create review response
        await page.route('**/auth/reviews/tictactoe', async route => {
            if (route.request().method() === 'POST') {
                await route.fulfill({
                    status: 201,
                    json: {
                        message: 'Review saved',
                        review: {
                            isPositive: true,
                            content: 'Great game!',
                            createdAt: new Date().toISOString(),
                            user: { _id: mockUser.id, username: mockUser.username }
                        }
                    }
                });
            }
        });

        // 3. Select game if needed (ensure we are on tictactoe)
        // Find the select element inside the review section
        const select = reviewSection.locator('..').locator('select');
        // Or just strictly select by role if it's the only combobox or easy to pinpoint
        await page.getByRole('combobox').selectOption('tictactoe');

        // 4. Fill and submit form
        // Use a more flexible locator in case of i18n delay or mismatch
        const positiveBtn = page.getByRole('button', { name: /推荐|Positive|form\.positive/i });
        await expect(positiveBtn).toBeVisible();
        await positiveBtn.click();

        const textarea = page.getByPlaceholder('写点什么...');
        await textarea.fill('Great game!');

        const submitBtn = page.getByRole('button', { name: '发布评论' });

        // Mock refresh stats after submit
        await page.route('**/auth/reviews/tictactoe/stats', async route => {
            await route.fulfill({
                json: {
                    gameId: 'tictactoe',
                    positive: 1,
                    negative: 0,
                    total: 1,
                    rate: 100
                }
            });
        });

        // Mock refresh list after submit
        await page.route('**/auth/reviews/tictactoe?*', async route => {
            await route.fulfill({
                json: {
                    items: [{
                        isPositive: true,
                        content: 'Great game!',
                        createdAt: new Date().toISOString(),
                        user: { _id: mockUser.id, username: mockUser.username }
                    }],
                    page: 1,
                    limit: 5,
                    total: 1,
                    hasMore: false
                }
            });
        });

        // Mock refresh my review
        await page.route('**/auth/reviews/tictactoe/mine', async route => {
            await route.fulfill({
                json: {
                    isPositive: true,
                    content: 'Great game!',
                    user: { _id: mockUser.id }
                }
            });
        });

        await submitBtn.click();

        // 4. Verify toast or update
        await expect(page.getByText('评价已发布')).toBeVisible();
        await expect(page.getByText('100% 好评')).toBeVisible(); // stats updated
        await expect(page.getByText('ReviewerBot', { exact: true })).toBeVisible(); // list updated
    });
});
