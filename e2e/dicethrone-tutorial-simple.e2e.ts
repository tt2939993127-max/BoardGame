/**
 * DiceThrone 教程简化测试
 * 
 * 只测试教程能启动、显示基本步骤、并能通过点击 Next 推进
 */

import { mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { test, expect } from '@playwright/test';
import { setChineseLocale } from './helpers/common';
import { dispatchLocalCommand, waitForTutorialBoardReady } from './helpers/dicethrone';

test.describe('DiceThrone Tutorial (Simplified)', () => {
    test('Tutorial starts and shows initial steps', async ({ page }, testInfo) => {
        test.setTimeout(120000);

        await setChineseLocale(page);
        await page.goto('/play/dicethrone/tutorial');
        await waitForTutorialBoardReady(page, 60000);

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
        test.setTimeout(120000);

        await setChineseLocale(page);
        await page.goto('/play/dicethrone/tutorial');
        await waitForTutorialBoardReady(page, 60000);

        const getTutorialStepId = async () => page
            .locator('[data-tutorial-step]')
            .first()
            .getAttribute('data-tutorial-step')
            .catch(() => null);

        const clickNextOverlayStep = async () => {
            const nextButton = page.getByRole('button', { name: /^(Next|下一步)$/i }).first();
            await expect(nextButton).toBeVisible({ timeout: 5000 });
            const beforeStep = await getTutorialStepId();
            await nextButton.click({ force: true });
            await page.waitForFunction(
                (prev) => {
                    const el = document.querySelector('[data-tutorial-step]');
                    return el && el.getAttribute('data-tutorial-step') !== prev;
                },
                beforeStep,
                { timeout: 5000 },
            );
        };

        // 信息步：setup 之后一路点到卖牌教学
        while (true) {
            const stepId = await getTutorialStepId();
            if (stepId === 'sell-card-intro') break;
            await clickNextOverlayStep();
        }

        // 强制步骤：卖掉 deep thought
        await dispatchLocalCommand(page, 'SELL_CARD', { cardId: 'card-deep-thought' });
        await page.waitForFunction(() => {
            const el = document.querySelector('[data-tutorial-step]');
            return el?.getAttribute('data-tutorial-step') === 'undo-sell-intro';
        }, { timeout: 5000 });

        // 信息步：撤回介绍
        await clickNextOverlayStep();

        // 强制步骤：撤回卖牌
        await dispatchLocalCommand(page, 'UNDO_SELL_CARD', {});
        await page.waitForFunction(() => {
            const el = document.querySelector('[data-tutorial-step]');
            return el?.getAttribute('data-tutorial-step') === 'advance';
        }, { timeout: 5000 });

        // 验证到达 advance 步骤
        const advanceStep = page.locator('[data-tutorial-step="advance"]');
        await expect(advanceStep).toBeVisible({ timeout: 5000 });

        // 点击 Next Phase 按钮
        const advanceButton = page.locator('[data-tutorial-id="advance-phase-button"]');
        await expect(advanceButton).toBeEnabled({ timeout: 5000 });
        await advanceButton.click();
        await page.waitForFunction(() => {
            const el = document.querySelector('[data-tutorial-step]');
            const stepId = el?.getAttribute('data-tutorial-step');
            return stepId === 'dice-tray' || stepId === 'dice-roll' || stepId === 'play-six';
        }, { timeout: 10000 });

        // 截图
        await page.screenshot({ path: testInfo.outputPath('tutorial-after-advance.png'), fullPage: false });

        // 验证进入了新阶段（骰子相关步骤）
        const diceStep = await getTutorialStepId();
        console.log('After advance, step:', diceStep);
        expect(['dice-tray', 'dice-roll', 'play-six']).toContain(diceStep);
    });

    test('Tutorial roll visual should not block next required action', async ({ page }, testInfo) => {
        test.setTimeout(120000);

        await setChineseLocale(page);
        await page.goto('/play/dicethrone/tutorial');
        await waitForTutorialBoardReady(page, 60000);

        const getTutorialStepId = async () => page
            .locator('[data-tutorial-step]')
            .first()
            .getAttribute('data-tutorial-step')
            .catch(() => null);

        const clickNextOverlayStep = async () => {
            const nextButton = page.getByRole('button', { name: /^(Next|下一步)$/i }).first();
            const beforeStep = await getTutorialStepId();
            await expect(nextButton).toBeVisible({ timeout: 5000 });
            await nextButton.click({ force: true });
            await page.waitForFunction(
                (prev) => {
                    const el = document.querySelector('[data-tutorial-step]');
                    return el && el.getAttribute('data-tutorial-step') !== prev;
                },
                beforeStep,
                { timeout: 5000 },
            );
        };

        while (true) {
            const stepId = await getTutorialStepId();
            if (stepId === 'sell-card-intro') break;
            await clickNextOverlayStep();
        }

        await dispatchLocalCommand(page, 'SELL_CARD', { cardId: 'card-deep-thought' });
        await page.waitForFunction(() => document.querySelector('[data-tutorial-step]')?.getAttribute('data-tutorial-step') === 'undo-sell-intro', { timeout: 5000 });
        await clickNextOverlayStep();
        await dispatchLocalCommand(page, 'UNDO_SELL_CARD', {});
        await page.waitForFunction(() => document.querySelector('[data-tutorial-step]')?.getAttribute('data-tutorial-step') === 'advance', { timeout: 5000 });

        const advanceButton = page.locator('[data-tutorial-id="advance-phase-button"]');
        await expect(advanceButton).toBeEnabled({ timeout: 5000 });
        await advanceButton.click();
        await page.waitForFunction(() => {
            const stepId = document.querySelector('[data-tutorial-step]')?.getAttribute('data-tutorial-step');
            return stepId === 'dice-tray' || stepId === 'dice-roll';
        }, { timeout: 10000 });

        if (await page.locator('[data-tutorial-step="dice-tray"]').isVisible().catch(() => false)) {
            await clickNextOverlayStep();
        }

        const rollButton = page.locator('[data-tutorial-id="dice-roll-button"]');
        await expect(rollButton).toBeEnabled({ timeout: 10000 });
        await rollButton.click();

        const handCard = page.locator('[data-card-id="card-play-six"]').first();
        await expect(handCard).toBeVisible({ timeout: 10000 });
        await handCard.click();

        await page.waitForFunction(() => {
            return document.body.textContent?.includes('选择要设为6的骰子');
        }, { timeout: 10000 });

        const firstDieButton = page.locator('[data-testid="die-button-0"]');
        await expect(firstDieButton).toBeVisible({ timeout: 10000 });
        await firstDieButton.click();

        await page.waitForFunction(
            () => document.querySelector('[data-tutorial-step]')?.getAttribute('data-tutorial-step') === 'dice-confirm',
            { timeout: 10000 },
        );

        const evidencePath = join(
            process.cwd(),
            'test-results',
            'evidence-screenshots',
            'dicethrone-tutorial-simple.e2e',
            'tutorial-roll-visual-should-not-block-next-required-action',
            'tutorial-roll-visual-non-blocking.png',
        );
        mkdirSync(dirname(evidencePath), { recursive: true });
        await page.screenshot({ path: evidencePath, fullPage: false });
        await page.screenshot({ path: testInfo.outputPath('tutorial-roll-visual-non-blocking.png'), fullPage: false });

        expect(await getTutorialStepId()).toBe('dice-confirm');
    });
});
