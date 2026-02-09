import { test, expect } from '@playwright/test';

test('SmashUp 出牌调试 — 检查卡牌和基地选择器', async ({ page }) => {
    test.setTimeout(60000);

    // 禁用音频
    await page.addInitScript(() => {
        localStorage.setItem('i18nextLng', 'en');
        localStorage.setItem('audio_muted', 'true');
        (window as Window & { __BG_DISABLE_AUDIO__?: boolean }).__BG_DISABLE_AUDIO__ = true;
    });
    await page.context().route(/\.(mp3|ogg|webm|wav)(\?.*)?$/i, route => route.abort());

    // 导航到教学
    await page.goto('/play/smashup/tutorial');
    await page.waitForLoadState('networkidle');

    // 等待 welcome 步骤
    await expect(page.locator('[data-tutorial-step="welcome"]')).toBeVisible({ timeout: 40000 });

    // 快速跳过到 playMinion 步骤
    const introSteps = ['welcome', 'scoreboard', 'handIntro', 'turnTracker', 'endTurnBtn', 'playCardsExplain'];
    for (const stepId of introSteps) {
        await expect(page.locator(`[data-tutorial-step="${stepId}"]`)).toBeVisible({ timeout: 10000 });
        const nextBtn = page.getByRole('button', { name: /^(Next|下一步)$/i });
        await nextBtn.click();
    }

    // 到达 playMinion 步骤
    await expect(page.locator('[data-tutorial-step="playMinion"]')).toBeVisible({ timeout: 10000 });

    // 检查手牌区
    const handArea = page.locator('[data-tutorial-id="su-hand-area"]');
    await expect(handArea).toBeVisible();

    // 检查手牌数量
    const handCards = handArea.locator('[data-testid="su-hand-area"]').locator('> div > div');
    const cardCount = await handCards.count();
    console.log(`=== 手牌数量: ${cardCount} ===`);

    // 检查基地数量
    const bases = page.locator('.group\\/base');
    const baseCount = await bases.count();
    console.log(`=== 基地数量: ${baseCount} ===`);

    // 点击第一张手牌
    console.log('=== 点击第一张手牌 ===');
    await handCards.first().click({ force: true });
    await page.waitForTimeout(1000);

    // 检查是否有基地高亮（isDeployMode）
    const highlightedBase = page.locator('.group\\/base.scale-105');
    const highlightCount = await highlightedBase.count();
    console.log(`=== 高亮基地数量: ${highlightCount} ===`);

    // 截图
    await page.screenshot({ path: 'test-results/smashup-before-base-click.png' });

    // 点击第一个基地
    console.log('=== 点击第一个基地 ===');
    await bases.first().click({ force: true });
    await page.waitForTimeout(2000);

    // 截图
    await page.screenshot({ path: 'test-results/smashup-after-base-click.png' });

    // 检查是否推进到 playAction 步骤
    const isOnPlayAction = await page.locator('[data-tutorial-step="playAction"]')
        .isVisible({ timeout: 5000 }).catch(() => false);
    console.log(`=== 是否推进到 playAction: ${isOnPlayAction} ===`);

    expect(isOnPlayAction).toBe(true);
});
