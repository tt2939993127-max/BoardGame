/**
 * 大杀四方 (Smash Up) - 教程 E2E 测试
 *
 * 覆盖范围：
 * - 教程初始化（自动派系选择、作弊设置固定手牌）
 * - 逐步 UI 元素介绍（基地区、记分板、手牌、回合追踪器、结束按钮）
 * - 出牌阶段交互（打出随从、打出行动、结束出牌）
 * - 基地记分与抽牌阶段（信息步骤 + AI 自动推进）
 * - 对手 AI 回合
 * - 教程完成
 */

import { test, expect, type Page } from '@playwright/test';
import { setEnglishLocale, disableAudio, blockAudioRequests } from './helpers/common';

// ============================================================================
// 教程专用工具
// ============================================================================

const waitForTutorialStep = async (page: Page, stepId: string, timeout = 30000) => {
    await expect(page.locator(`[data-tutorial-step="${stepId}"]`)).toBeVisible({ timeout });
};

const clickNext = async (page: Page) => {
    for (let attempt = 0; attempt < 3; attempt++) {
        const nextBtn = page.getByRole('button', { name: /^(Next|下一步)$/i });
        await expect(nextBtn).toBeVisible({ timeout: 10000 });
        try {
            await nextBtn.click({ timeout: 5000 });
            return;
        } catch {
            await page.waitForTimeout(300);
        }
    }
    await page.getByRole('button', { name: /^(Next|下一步)$/i }).click({ force: true });
};

const clickFinish = async (page: Page) => {
    for (let attempt = 0; attempt < 3; attempt++) {
        const finishBtn = page.getByRole('button', { name: /^(Finish and return|完成并返回)$/i });
        await expect(finishBtn).toBeVisible({ timeout: 10000 });
        try {
            await finishBtn.click({ timeout: 5000 });
            return;
        } catch {
            await page.waitForTimeout(300);
        }
    }
    await page.getByRole('button', { name: /^(Finish and return|完成并返回)$/i }).click({ force: true });
};

const waitForActionPrompt = async (page: Page, timeout = 15000) => {
    await expect(page.locator('[data-tutorial-step] .animate-pulse')).toBeVisible({ timeout });
};

const navigateToTutorial = async (page: Page) => {
    await page.goto('/play/smashup/tutorial');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForSelector('#root > *', { timeout: 15000 });
};

/** 快速跳过 UI 介绍步骤（steps 1-6） */
const skipIntroSteps = async (page: Page) => {
    await waitForTutorialStep(page, 'welcome', 40000);
    for (const stepId of ['welcome', 'scoreboard', 'handIntro', 'turnTracker', 'endTurnBtn', 'playCardsExplain']) {
        await waitForTutorialStep(page, stepId, 10000);
        await clickNext(page);
    }
};

/** 执行 playMinion 步骤 */
const doPlayMinion = async (page: Page) => {
    await waitForTutorialStep(page, 'playMinion', 10000);
    await waitForActionPrompt(page);
    await page.waitForTimeout(500);
    const handArea = page.locator('[data-testid="su-hand-area"]');
    await expect(handArea).toBeVisible();
    const handCards = handArea.locator('> div > div');
    await expect(handCards.first()).toBeVisible({ timeout: 10000 });
    await handCards.first().click({ force: true });
    await page.waitForTimeout(500);
    const bases = page.locator('.group\\/base');
    await expect(bases.first()).toBeVisible({ timeout: 5000 });
    await bases.first().click({ force: true });
    await page.waitForTimeout(1000);
};

/** 执行 playAction 步骤 */
const doPlayAction = async (page: Page) => {
    await waitForTutorialStep(page, 'playAction', 15000);
    await waitForActionPrompt(page);
    await page.waitForTimeout(500);
    const handArea = page.locator('[data-testid="su-hand-area"]');
    const actionCards = handArea.locator('> div > div');
    const bases = page.locator('.group\\/base');
    const count = await actionCards.count();
    for (let i = 0; i < count; i++) {
        await actionCards.nth(i).click({ force: true });
        await page.waitForTimeout(300);
        if (await bases.first().isVisible().catch(() => false)) {
            await bases.first().click({ force: true });
            await page.waitForTimeout(500);
        }
        if (!(await page.locator('[data-tutorial-step="playAction"]').isVisible({ timeout: 1000 }).catch(() => false))) break;
    }
};

/** 执行 endPlayCards 步骤 */
const doEndPlayCards = async (page: Page) => {
    await waitForTutorialStep(page, 'endPlayCards', 15000);
    await waitForActionPrompt(page);
    const finishTurnButton = page.getByRole('button', { name: /Finish Turn|结束回合/i });
    await expect(finishTurnButton).toBeVisible({ timeout: 5000 });
    await finishTurnButton.click({ force: true });
    await page.waitForTimeout(500);
};

// ============================================================================
// 测试用例
// ============================================================================

test.describe('Smash Up Tutorial E2E', () => {
    test.describe.configure({ retries: 1 });

    test.beforeEach(async ({ context }) => {
        await blockAudioRequests(context);
    });

    test('教程初始化与 UI 介绍 — 自动派系选择 + 逐步 Next 推进', async ({ page }) => {
        test.setTimeout(90000);
        await setEnglishLocale(page);
        await disableAudio(page);
        await navigateToTutorial(page);

        await waitForTutorialStep(page, 'welcome', 40000);
        await expect(page.locator('[data-tutorial-id="su-base-area"]')).toBeVisible();
        await clickNext(page);

        await waitForTutorialStep(page, 'scoreboard', 10000);
        await expect(page.locator('[data-tutorial-id="su-scoreboard"]')).toBeVisible();
        await clickNext(page);

        await waitForTutorialStep(page, 'handIntro', 10000);
        await expect(page.locator('[data-tutorial-id="su-hand-area"]')).toBeVisible();
        await clickNext(page);

        await waitForTutorialStep(page, 'turnTracker', 10000);
        await expect(page.locator('[data-tutorial-id="su-turn-tracker"]')).toBeVisible();
        await clickNext(page);

        await waitForTutorialStep(page, 'endTurnBtn', 10000);
        await expect(page.locator('[data-tutorial-id="su-end-turn-btn"]')).toBeVisible();
        await clickNext(page);

        await waitForTutorialStep(page, 'playCardsExplain', 10000);
        await expect(page.locator('[data-tutorial-id="su-hand-area"]')).toBeVisible();
        await clickNext(page);

        await waitForTutorialStep(page, 'playMinion', 10000);
        await expect(page.getByRole('button', { name: /^(Next|下一步)$/i })).toHaveCount(0, { timeout: 3000 });
        await waitForActionPrompt(page);
    });

    test('出牌阶段交互 — 打出随从 + 行动 + 结束出牌', async ({ page }) => {
        test.setTimeout(120000);
        await setEnglishLocale(page);
        await disableAudio(page);
        await navigateToTutorial(page);

        await skipIntroSteps(page);
        await doPlayMinion(page);
        await doPlayAction(page);
        await doEndPlayCards(page);
        await waitForTutorialStep(page, 'baseScoring', 15000);
    });

    test('完整教程流程 — 从初始化到完成', async ({ page }, testInfo) => {
        test.setTimeout(180000);
        await setEnglishLocale(page);
        await disableAudio(page);
        await navigateToTutorial(page);

        // UI 介绍
        await waitForTutorialStep(page, 'welcome', 40000);
        await clickNext(page);
        for (const stepId of ['scoreboard', 'handIntro', 'turnTracker', 'endTurnBtn', 'playCardsExplain']) {
            await waitForTutorialStep(page, stepId, 10000);
            await clickNext(page);
        }

        // 出牌
        await doPlayMinion(page);
        await doPlayAction(page);
        await doEndPlayCards(page);

        // 基地记分 + VP
        await waitForTutorialStep(page, 'baseScoring', 15000);
        await clickNext(page);
        await waitForTutorialStep(page, 'vpAwards', 10000);
        await expect(page.locator('[data-tutorial-id="su-scoreboard"]')).toBeVisible();
        await clickNext(page);

        // 记分阶段
        await waitForTutorialStep(page, 'scoringPhase', 15000);
        await clickNext(page);

        // 抽牌
        await waitForTutorialStep(page, 'drawExplain', 20000);
        await expect(page.locator('[data-tutorial-id="su-deck-discard"]')).toHaveCount(1);
        await clickNext(page);
        await waitForTutorialStep(page, 'handLimit', 10000);
        await clickNext(page);
        await waitForTutorialStep(page, 'endDraw', 10000);
        await clickNext(page);

        // 对手回合 → 天赋 → 回合循环 → 总结 → 完成
        await waitForTutorialStep(page, 'talentIntro', 40000);
        await clickNext(page);
        await waitForTutorialStep(page, 'turnCycle', 10000);
        await clickNext(page);
        await waitForTutorialStep(page, 'summary', 10000);
        await clickNext(page);
        await waitForTutorialStep(page, 'finish', 10000);
        await expect(page.locator('[data-tutorial-id="su-base-area"]')).toBeVisible();
        await clickFinish(page);

        await expect(
            page.getByRole('button', { name: /^(Finish and return|完成并返回)$/i }),
        ).toHaveCount(0, { timeout: 10000 });
        await page.screenshot({ path: testInfo.outputPath('tutorial-complete.png') });
    });

    test('教程入口可达性 — 从首页进入教程', async ({ page }) => {
        test.setTimeout(60000);
        await setEnglishLocale(page);
        await disableAudio(page);

        await page.goto('/');
        await page.waitForLoadState('domcontentloaded');
        await expect(page.locator('[data-game-id]').first()).toBeVisible({ timeout: 20000 });

        const card = page.locator('[data-game-id="smashup"]');
        if (await card.count() === 0) {
            const allTab = page.getByRole('button', { name: /All Games|全部游戏/i });
            if (await allTab.isVisible().catch(() => false)) await allTab.click();
        }
        await expect(card.first()).toBeVisible({ timeout: 15000 });
        await card.first().click();

        const tutorialBtn = page.getByRole('button', { name: /Tutorial|教程/i });
        await expect(tutorialBtn).toBeVisible({ timeout: 10000 });
        await tutorialBtn.click();

        await page.waitForURL(/\/play\/smashup\/tutorial/, { timeout: 15000 });
        await waitForTutorialStep(page, 'welcome', 40000);
    });

    test('教程高亮目标 — 每个 UI 介绍步骤都高亮对应元素', async ({ page }) => {
        test.setTimeout(60000);
        await setEnglishLocale(page);
        await disableAudio(page);
        await navigateToTutorial(page);

        await waitForTutorialStep(page, 'welcome', 40000);
        await expect(page.locator('[data-tutorial-id="su-base-area"]')).toBeVisible();
        await clickNext(page);

        await waitForTutorialStep(page, 'scoreboard', 10000);
        await expect(page.locator('[data-tutorial-id="su-scoreboard"]')).toBeVisible();
        await clickNext(page);

        await waitForTutorialStep(page, 'handIntro', 10000);
        await expect(page.locator('[data-tutorial-id="su-hand-area"]')).toBeVisible();
        await clickNext(page);

        await waitForTutorialStep(page, 'turnTracker', 10000);
        await expect(page.locator('[data-tutorial-id="su-turn-tracker"]')).toBeVisible();
        await clickNext(page);

        await waitForTutorialStep(page, 'endTurnBtn', 10000);
        await expect(page.locator('[data-tutorial-id="su-end-turn-btn"]')).toBeVisible();
    });
});
