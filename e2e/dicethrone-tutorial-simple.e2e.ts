/**
 * DiceThrone 教程简化测试
 * 
 * 只测试教程能启动、显示基本步骤、并能通过点击 Next 推进
 */

import { test, expect } from '@playwright/test';
import { setEnglishLocale } from './helpers/common';
import { waitForBoardReady } from './helpers/dicethrone';

test.describe('DiceThrone Tutorial (Simplified)', () => {
    test('Tutorial starts and shows initial steps', async ({ page }, testInfo) => {
        test.setTimeout(60000);

        await setEnglishLocale(page);
        await page.goto('/play/dicethrone/tutorial');
        await waitForBoardReady(page, 30000);

        // 等待教学覆盖层出现
        const overlayNextButton = page.getByRole('button', { name: /^(Next|下一步)$/i }).first();
        await expect(overlayNextButton).toBeVisible({ timeout: 15000 });

        // 验证教学步骤存在
        const tutorialStep = page.locator('[data-tutorial-step]').first();
        await expect(tutorialStep).toBeVisible();

        // 获取当前步骤 ID
        const stepId = await tutorialStep.getAttribute('data-tutorial-step');
        console.log('Initial tutorial step:', stepId);

        // 点击 Next 按钮推进几步
        for (let i = 0; i < 5; i++) {
            if (await overlayNextButton.isVisible({ timeout: 1000 }).catch(() => false)) {
                await overlayNextButton.click();
                await page.waitForTimeout(500);
            } else {
                break;
            }
        }

        // 截图
        await page.screenshot({ path: testInfo.outputPath('tutorial-progress.png'), fullPage: false });

        // 验证教程仍在运行
        const stillHasStep = await page.locator('[data-tutorial-step]').first().isVisible({ timeout: 1000 }).catch(() => false);
        expect(stillHasStep).toBe(true);
    });

    test('Tutorial can advance through main phases', async ({ page }, testInfo) => {
        test.setTimeout(90000);

        await setEnglishLocale(page);
        await page.goto('/play/dicethrone/tutorial');
        await waitForBoardReady(page, 30000);

        // 等待教学覆盖层
        const overlayNextButton = page.getByRole('button', { name: /^(Next|下一步)$/i }).first();
        await expect(overlayNextButton).toBeVisible({ timeout: 15000 });

        // 推进到 advance 步骤（点击 Next Phase 按钮）
        const getTutorialStepId = async () => page
            .locator('[data-tutorial-step]')
            .first()
            .getAttribute('data-tutorial-step')
            .catch(() => null);

        // 点击 Next 直到到达 advance 步骤
        for (let i = 0; i < 15; i++) {
            const stepId = await getTutorialStepId();
            if (stepId === 'advance') break;
            
            if (await overlayNextButton.isVisible({ timeout: 1000 }).catch(() => false)) {
                await overlayNextButton.click();
                await page.waitForTimeout(300);
            } else {
                break;
            }
        }

        // 验证到达 advance 步骤
        const advanceStep = page.locator('[data-tutorial-step="advance"]');
        await expect(advanceStep).toBeVisible({ timeout: 5000 });

        // 点击 Next Phase 按钮
        const advanceButton = page.locator('[data-tutorial-id="advance-phase-button"]');
        await expect(advanceButton).toBeEnabled({ timeout: 5000 });
        await advanceButton.click();
        await page.waitForTimeout(500);

        // 截图
        await page.screenshot({ path: testInfo.outputPath('tutorial-after-advance.png'), fullPage: false });

        // 验证进入了新阶段（骰子相关步骤）
        const diceStep = await getTutorialStepId();
        console.log('After advance, step:', diceStep);
        expect(['dice-tray', 'dice-roll', 'play-six']).toContain(diceStep);
    });
});
