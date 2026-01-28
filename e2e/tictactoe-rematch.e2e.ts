import { test, expect, type Page, type BrowserContext } from '@playwright/test';

const setEnglishLocale = async (context: BrowserContext | Page) => {
    await context.addInitScript(() => {
        localStorage.setItem('i18nextLng', 'en');
    });
};

const ensureHostPlayerId = async (page: Page): Promise<URL> => {
    const url = new URL(page.url());
    if (!url.searchParams.get('playerID')) {
        url.searchParams.set('playerID', '0');
        await page.goto(url.toString());
        await expect(page.locator('[data-tutorial-id="cell-0"]')).toBeVisible();
    }
    return new URL(page.url());
};

const clickCell = async (page: Page, id: number) => {
    await page.locator(`[data-tutorial-id="cell-${id}"]`).click();
};

const waitForNewMatch = async (page: Page, oldMatchId: string) => {
    await page.waitForURL((url) => {
        const parsed = new URL(url);
        if (!parsed.pathname.includes('/play/tictactoe/match/')) return false;
        const matchId = parsed.pathname.split('/').pop();
        return !!matchId && matchId !== oldMatchId;
    }, { timeout: 15000 });
    const parsed = new URL(page.url());
    return parsed.pathname.split('/').pop();
};

test.describe('TicTacToe Rematch E2E', () => {
    test('Online rematch navigates to new match and refresh stays in new match', async ({ browser }, testInfo) => {
        const baseURL = testInfo.project.use.baseURL as string | undefined;

        const hostContext = await browser.newContext({ baseURL });
        await setEnglishLocale(hostContext);
        const hostPage = await hostContext.newPage();

        await hostPage.goto('/');
        await hostPage.getByRole('heading', { name: 'Tic-Tac-Toe' }).click();
        await hostPage.getByRole('button', { name: 'Create Room' }).click();
        await expect(hostPage.getByRole('heading', { name: 'Create Room' })).toBeVisible();
        await hostPage.getByRole('button', { name: 'Confirm' }).click();

        await hostPage.waitForURL(/\/play\/tictactoe\/match\//);
        await expect(hostPage.locator('[data-tutorial-id="cell-0"]')).toBeVisible();

        const hostUrl = await ensureHostPlayerId(hostPage);
        const matchId = hostUrl.pathname.split('/').pop();
        if (!matchId) {
            throw new Error('Failed to parse match id from host URL.');
        }

        const guestContext = await browser.newContext({ baseURL });
        await setEnglishLocale(guestContext);
        const guestPage = await guestContext.newPage();

        await guestPage.goto(`/play/tictactoe/match/${matchId}?join=true`);
        await guestPage.waitForURL(/playerID=\d/);
        await expect(guestPage.locator('[data-tutorial-id="cell-0"]')).toBeVisible();

        await clickCell(hostPage, 0);
        await clickCell(guestPage, 1);
        await clickCell(hostPage, 4);
        await clickCell(guestPage, 2);
        await clickCell(hostPage, 8);

        const playAgainHost = hostPage.getByRole('button', { name: 'Play Again' });
        const playAgainGuest = guestPage.getByRole('button', { name: 'Play Again' });
        await expect(playAgainHost).toBeVisible();
        await expect(playAgainGuest).toBeVisible();

        await playAgainHost.click();
        await playAgainGuest.click();

        const nextMatchIdHost = await waitForNewMatch(hostPage, matchId);
        const nextMatchIdGuest = await waitForNewMatch(guestPage, matchId);

        expect(nextMatchIdHost).toBeTruthy();
        expect(nextMatchIdHost).toEqual(nextMatchIdGuest);

        await hostPage.reload();
        await guestPage.reload();

        await expect(hostPage).toHaveURL(new RegExp(`/play/tictactoe/match/${nextMatchIdHost}`));
        await expect(guestPage).toHaveURL(new RegExp(`/play/tictactoe/match/${nextMatchIdHost}`));

        await expect(hostPage.getByText('Both confirmed, restarting...')).toHaveCount(0);
        await expect(guestPage.getByText('Both confirmed, restarting...')).toHaveCount(0);
        await expect(hostPage.getByRole('button', { name: 'Play Again' })).toHaveCount(0);
        await expect(guestPage.getByRole('button', { name: 'Play Again' })).toHaveCount(0);

        await hostContext.close();
        await guestContext.close();
    });
});
