/**
 * 大杀四方 (Smash Up) - 本地模式 E2E 测试
 *
 * 直接进入 /play/smashup/local，跳过房间创建流程。
 * 通过调试面板注入状态来跳过派系选择，直接验证游戏核心流程。
 */

import { test, expect, type Page } from '@playwright/test';
import {
    initContext,
    blockAudioRequests,
    dismissViteOverlay,
} from './helpers/common';

// ============================================================================
// 本地模式入口
// ============================================================================

const gotoLocalSmashUp = async (page: Page) => {
    await page.goto('/play/smashup/local', { waitUntil: 'domcontentloaded' });
    await dismissViteOverlay(page);
    // 等待游戏加载（派系选择或游戏界面）
    await page.waitForFunction(
        () => {
            // 派系选择界面
            if (document.querySelector('h1')?.textContent?.match(/Draft Your Factions|选择你的派系/)) return true;
            // 游戏界面
            if (document.querySelector('[data-testid="su-hand-area"]')) return true;
            // 调试面板按钮（说明 Board 已渲染）
            if (document.querySelector('[data-testid="debug-toggle"]') || document.querySelector('[data-testid="debug-toggle-container"]')) return true;
            return false;
        },
        { timeout: 20000 },
    );
};

/**
 * 在本地模式下完成派系选择（两个玩家都是自己）。
 * 蛇形选秀：P0选1 → P1选2 → P1选3 → P0选4。
 * 流程：点击派系卡片 → 打开详情弹窗 → 点击确认按钮。
 */
const completeFactionSelectionLocal = async (page: Page) => {
    const factionHeading = page.locator('h1').filter({ hasText: /Draft Your Factions|选择你的派系/i });
    if (!await factionHeading.isVisible().catch(() => false)) return; // 已经跳过了

    // 按名称依次选择 4 个派系（蛇形选秀：P0, P1, P1, P0）
    const factionNames = ['Pirates', 'Ninjas', 'Dinosaurs', 'Aliens'];

    for (let i = 0; i < factionNames.length; i++) {
        const name = factionNames[i];

        // 等待派系网格可见且没有弹窗遮挡
        await page.waitForTimeout(600);

        // 通过派系名称文本找到对应卡片的父级可点击容器
        const factionCard = page.locator('h3').filter({ hasText: new RegExp(`^${name}$`, 'i') }).first()
            .locator('xpath=ancestor::div[contains(@class,"group")]').first();
        await expect(factionCard).toBeVisible({ timeout: 5000 });
        await factionCard.click({ force: true });
        
        // 等待弹窗出现：确认按钮或已选/已被占用的状态
        const confirmBtn = page.getByRole('button', { name: /Confirm Selection|确认选择/i });
        await expect(confirmBtn).toBeVisible({ timeout: 8000 });
        await expect(confirmBtn).toBeEnabled({ timeout: 3000 });
        await page.waitForTimeout(400);
        await confirmBtn.click({ force: true });

        // 等待弹窗关闭（focusedFactionId 被设为 null 后弹窗消失）
        await expect(confirmBtn).toBeHidden({ timeout: 5000 });
    }
    // 等待派系选择完成，游戏界面加载
    await page.waitForTimeout(1500);
};

const waitForHandArea = async (page: Page, timeout = 30000) => {
    const handArea = page.getByTestId('su-hand-area');
    await expect(handArea).toBeVisible({ timeout });
    return handArea;
};

// ============================================================================
// 测试用例
// ============================================================================

test.describe('SmashUp 本地模式 E2E', () => {
    test.setTimeout(90000);

    test.beforeEach(async ({ context }) => {
        await initContext(context, { storageKey: '__smashup_local_reset' });
        await blockAudioRequests(context);
    });

    test('本地模式：派系选择 → 游戏界面加载', async ({ page }, testInfo) => {
        await gotoLocalSmashUp(page);
        await completeFactionSelectionLocal(page);

        // 验证游戏界面加载
        await waitForHandArea(page);

        // 验证有手牌
        const handArea = page.getByTestId('su-hand-area');
        const cards = handArea.locator('> div > div');
        await expect(cards.first()).toBeVisible({ timeout: 10000 });
        const cardCount = await cards.count();
        expect(cardCount).toBe(5);

        // 验证基地可见
        const bases = page.locator('.group\\/base');
        const baseCount = await bases.count();
        expect(baseCount).toBeGreaterThanOrEqual(3);

        // 验证结束回合按钮可见（P0 的回合）
        const finishBtn = page.getByRole('button', { name: /Finish Turn|结束回合/i });
        await expect(finishBtn).toBeVisible({ timeout: 5000 });

        await page.screenshot({ path: testInfo.outputPath('local-game-loaded.png') });
    });

    test('本地模式：出牌 → 结束回合 → 回合切换', async ({ page }, testInfo) => {
        await gotoLocalSmashUp(page);
        await completeFactionSelectionLocal(page);
        await waitForHandArea(page);

        // P0 出第一张牌到第一个基地
        const handArea = page.getByTestId('su-hand-area');
        const firstCard = handArea.locator('> div > div').first();
        await firstCard.click();
        await page.waitForTimeout(600);

        // 点击第一个基地
        const bases = page.locator('.group\\/base');
        await bases.first().locator('> div').first().click();
        await page.waitForTimeout(1000);

        // 处理可能出现的 Prompt
        const promptOverlay = page.locator('.fixed.inset-0.z-\\[100\\]');
        if (await promptOverlay.isVisible().catch(() => false)) {
            const options = promptOverlay.locator('button:not([disabled])');
            if (await options.first().isVisible().catch(() => false)) {
                await options.first().click();
                await page.waitForTimeout(600);
            }
        }

        // 结束回合
        const finishBtn = page.getByRole('button', { name: /Finish Turn|结束回合/i });
        if (await finishBtn.isVisible().catch(() => false)) {
            await finishBtn.click();
            await page.waitForTimeout(1000);
        }

        await page.screenshot({ path: testInfo.outputPath('after-play-card.png') });
    });

    test('本地模式：游戏状态正确初始化', async ({ page }, testInfo) => {
        await gotoLocalSmashUp(page);
        await completeFactionSelectionLocal(page);
        await waitForHandArea(page);

        // 验证游戏界面核心元素
        const handArea = page.getByTestId('su-hand-area');
        await expect(handArea).toBeVisible({ timeout: 5000 });

        // 验证有手牌
        const cards = handArea.locator('> div > div');
        await expect(cards.first()).toBeVisible({ timeout: 5000 });
        const cardCount = await cards.count();
        expect(cardCount).toBe(5);

        // 验证基地可见
        const bases = page.locator('.group\\/base');
        const baseCount = await bases.count();
        expect(baseCount).toBeGreaterThanOrEqual(3);

        // 验证结束回合按钮可见
        const finishBtn = page.getByRole('button', { name: /Finish Turn|结束回合/i });
        await expect(finishBtn).toBeVisible({ timeout: 5000 });

        await page.screenshot({ path: testInfo.outputPath('game-state-initialized.png') });
    });

    test('本地模式：多回合循环正常', async ({ page }, testInfo) => {
        await gotoLocalSmashUp(page);
        await completeFactionSelectionLocal(page);
        await waitForHandArea(page);

        // 连续 3 个回合：出牌 → 结束回合
        for (let round = 0; round < 3; round++) {
            const finishBtn = page.getByRole('button', { name: /Finish Turn|结束回合/i });
            const isTurn = await finishBtn.isVisible().catch(() => false);

            if (isTurn) {
                // 直接结束回合（不出牌）
                await finishBtn.click();
                await page.waitForTimeout(1500);

                // 处理弃牌
                const discardHeading = page.getByText(/Too Many Cards|手牌过多/i);
                if (await discardHeading.isVisible().catch(() => false)) {
                    const handCards = page.getByTestId('su-hand-area').locator('> div > div');
                    await handCards.first().click();
                    await page.waitForTimeout(200);
                    const throwBtn = page.getByRole('button', { name: /Throw Away|丢弃并继续/i });
                    if (await throwBtn.isEnabled().catch(() => false)) {
                        await throwBtn.click();
                        await page.waitForTimeout(600);
                    }
                }

                // 处理 Me First
                const meFirstPass = page.getByTestId('me-first-pass-button');
                if (await meFirstPass.isVisible().catch(() => false)) {
                    await meFirstPass.click();
                    await page.waitForTimeout(600);
                }
            }
        }

        // 验证游戏仍在运行（手牌区可见）
        await expect(page.getByTestId('su-hand-area')).toBeVisible({ timeout: 5000 });

        await page.screenshot({ path: testInfo.outputPath('after-3-rounds.png') });
    });
});
