import { test, expect } from './framework';

const waitForFactionSelection = async (page: import('@playwright/test').Page) => {
  await expect(
    page.locator('h1').filter({ hasText: /选择你的阵营|Choose your faction/i }),
  ).toBeVisible({ timeout: 10000 });
};

const openDeckBuilder = async (page: import('@playwright/test').Page) => {
  const customDeckEntry = page.locator('.grid > div').filter({
    hasText: /Custom Deck|自定义牌组/i,
  });
  await expect(customDeckEntry).toBeVisible({ timeout: 5000 });
  await customDeckEntry.click();
};

const waitForDeckBuilderOpen = async (page: import('@playwright/test').Page) => {
  await expect(
    page.locator('h1').filter({ hasText: /Custom Deck Builder|牌组构建/i }),
  ).toBeVisible({ timeout: 5000 });
};

const waitForDeckBuilderClosed = async (page: import('@playwright/test').Page) => {
  await expect(
    page.locator('h1').filter({ hasText: /Custom Deck Builder|牌组构建/i }),
  ).toBeHidden({ timeout: 5000 });
};

test.describe('SummonerWars 自定义牌组入口', () => {
  test('阵营选择页保留自定义牌组入口', async ({ page, game }, testInfo) => {
    await game.openTestGame('summonerwars');
    await waitForFactionSelection(page);

    const customDeckEntry = page.locator('.grid > div').filter({
      hasText: /Custom Deck|自定义牌组/i,
    });
    await expect(customDeckEntry).toBeVisible({ timeout: 5000 });
    await expect(customDeckEntry.getByText(/Click to Build|点击构建/i)).toBeVisible();

    await game.screenshot('custom-deck-entry', testInfo);
  });

  test('打开构建器后可浏览阵营并选择召唤师', async ({ page, game }, testInfo) => {
    await game.openTestGame('summonerwars');
    await waitForFactionSelection(page);

    await openDeckBuilder(page);
    await waitForDeckBuilderOpen(page);

    const factionButtons = page.locator('.w-\\[18vw\\] button');
    await expect(factionButtons.first()).toBeVisible({ timeout: 5000 });
    await factionButtons.first().click();

    await expect(
      page.locator('h3').filter({ hasText: /Summoners|召唤师/i }),
    ).toBeVisible({ timeout: 5000 });

    const firstSummonerCard = page.locator('.flex-1.overflow-y-auto .grid > div').first();
    await expect(firstSummonerCard).toBeVisible({ timeout: 5000 });
    await firstSummonerCard.click();

    await expect(page.getByText(/Starting Cards|起始卡牌/i)).toBeVisible({ timeout: 5000 });
    await game.screenshot('custom-deck-builder-selection', testInfo);
  });

  test('点击遮罩可关闭构建器并回到阵营选择', async ({ page, game }, testInfo) => {
    await game.openTestGame('summonerwars');
    await waitForFactionSelection(page);

    await openDeckBuilder(page);
    await waitForDeckBuilderOpen(page);

    await page.mouse.click(10, 10);
    await waitForDeckBuilderClosed(page);
    await waitForFactionSelection(page);

    await game.screenshot('custom-deck-builder-closed', testInfo);
  });
});
