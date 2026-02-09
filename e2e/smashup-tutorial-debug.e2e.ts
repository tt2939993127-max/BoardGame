/**
 * SmashUp 教学调试 - 专注 opponentTurn 步骤
 * 通过注入浏览器端日志收集器来追踪事件流
 */
import { test, expect, type Page, type BrowserContext } from '@playwright/test';

const setEnglishLocale = async (context: BrowserContext) => {
    await context.addInitScript(() => { localStorage.setItem('i18nextLng', 'en'); });
};
const disableAudio = async (context: BrowserContext) => {
    await context.addInitScript(() => {
        localStorage.setItem('audio_muted', 'true');
        localStorage.setItem('audio_master_volume', '0');
        (window as Window & { __BG_DISABLE_AUDIO__?: boolean }).__BG_DISABLE_AUDIO__ = true;
    });
};
const blockAudioRequests = async (context: BrowserContext) => {
    await context.route(/\.(mp3|ogg|webm|wav)(\?.*)?$/i, route => route.abort());
};

const waitForStep = async (page: Page, stepId: string, timeout = 30000) => {
    await expect(page.locator(`[data-tutorial-step="${stepId}"]`)).toBeVisible({ timeout });
};
const clickNext = async (page: Page) => {
    const btn = page.getByRole('button', { name: /^(Next|下一步)$/i });
    await expect(btn).toBeVisible({ timeout: 10000 });
    await btn.click({ force: true });
    await page.waitForTimeout(300);
};
const waitForActionPrompt = async (page: Page) => {
    await expect(page.locator('[data-tutorial-step] .animate-pulse')).toBeVisible({ timeout: 15000 });
};

test.describe('SmashUp Tutorial Debug', () => {
    test('追踪 opponentTurn 事件流', async ({ context, page }, testInfo) => {
        test.setTimeout(180000);
        await setEnglishLocale(context);
        await disableAudio(context);
        await blockAudioRequests(context);

        // 收集浏览器控制台日志
        const consoleLogs: string[] = [];
        page.on('console', msg => {
            const text = msg.text();
            if (text.includes('FlowSystem') || text.includes('TutorialSystem') ||
                text.includes('TURN_') || text.includes('autoContinue') ||
                text.includes('tutorial') || text.includes('ADVANCE_PHASE')) {
                consoleLogs.push(`[${msg.type()}] ${text}`);
            }
        });

        await page.goto('/play/smashup/tutorial');
        await page.waitForLoadState('domcontentloaded');
        await page.waitForSelector('#root > *', { timeout: 15000 });

        // 快速推进到 opponentTurn 之前
        await waitForStep(page, 'welcome', 40000);
        await clickNext(page);
        for (const s of ['scoreboard', 'handIntro', 'turnTracker', 'endTurnBtn', 'playCardsExplain']) {
            await waitForStep(page, s, 10000);
            await clickNext(page);
        }

        // playMinion
        await waitForStep(page, 'playMinion', 10000);
        await waitForActionPrompt(page);
        await page.waitForTimeout(500);
        const handArea = page.locator('[data-testid="su-hand-area"]');
        const cards = handArea.locator('> div > div');
        await expect(cards.first()).toBeVisible({ timeout: 10000 });
        await cards.first().click({ force: true });
        await page.waitForTimeout(500);
        const bases = page.locator('.group\\/base');
        await expect(bases.first()).toBeVisible({ timeout: 5000 });
        await bases.first().click({ force: true });
        await page.waitForTimeout(1000);

        // playAction
        await waitForStep(page, 'playAction', 15000);
        await waitForActionPrompt(page);
        await page.waitForTimeout(500);
        const actionCards = handArea.locator('> div > div');
        const count = await actionCards.count();
        for (let i = 0; i < count; i++) {
            await actionCards.nth(i).click({ force: true });
            await page.waitForTimeout(300);
            if (await bases.first().isVisible().catch(() => false)) {
                await bases.first().click({ force: true });
                await page.waitForTimeout(500);
            }
            if (!await page.locator('[data-tutorial-step="playAction"]').isVisible({ timeout: 1000 }).catch(() => false)) break;
        }

        // endPlayCards
        await waitForStep(page, 'endPlayCards', 15000);
        await waitForActionPrompt(page);
        const finishBtn = page.getByRole('button', { name: /Finish Turn|结束回合/i });
        await expect(finishBtn).toBeVisible({ timeout: 5000 });
        await finishBtn.click({ force: true });
        await page.waitForTimeout(500);

        // baseScoring + vpAwards
        await waitForStep(page, 'baseScoring', 15000);
        await clickNext(page);
        await waitForStep(page, 'vpAwards', 10000);
        await clickNext(page);

        // drawExplain + handLimit + endDraw
        await waitForStep(page, 'drawExplain', 20000);
        await clickNext(page);
        await waitForStep(page, 'handLimit', 10000);
        await clickNext(page);
        await waitForStep(page, 'endDraw', 10000);

        // 清空之前的日志，只关注 endDraw → opponentTurn → talentIntro 的事件流
        consoleLogs.length = 0;
        console.log('\n=== 点击 endDraw 的 Next，进入 opponentTurn ===\n');

        await clickNext(page);

        // 等待 talentIntro 或超时
        const found = await page.locator('[data-tutorial-step="talentIntro"]')
            .isVisible({ timeout: 45000 }).catch(() => false);

        console.log(`\n=== talentIntro 是否出现: ${found} ===`);
        console.log(`=== 收集到 ${consoleLogs.length} 条日志 ===\n`);
        consoleLogs.forEach(l => console.log(l));

        // 如果没找到 talentIntro，检查当前教学状态
        if (!found) {
            const tutorialState = await page.evaluate(() => {
                // 尝试从 DOM 获取当前教学步骤
                const stepEl = document.querySelector('[data-tutorial-step]');
                const stepId = stepEl?.getAttribute('data-tutorial-step') ?? 'none';
                // 检查是否有遮罩
                const mask = document.querySelector('[data-tutorial-mask]');
                return {
                    currentStepId: stepId,
                    hasMask: !!mask,
                    bodyText: document.body.innerText.substring(0, 500),
                };
            });
            console.log('\n=== 当前教学状态 ===');
            console.log(JSON.stringify(tutorialState, null, 2));
        }

        await page.screenshot({ path: testInfo.outputPath('debug-opponentTurn.png') });
        expect(found).toBe(true);
    });
});
