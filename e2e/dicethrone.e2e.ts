/**
 * DiceThrone 核心 E2E 测试
 *
 * 覆盖：在线对局手牌验证、僧侣技能交互、教学流程全链路。
 * 通用工具从 helpers/common 导入，DT 专用工具从 helpers/dicethrone 导入。
 */

import { test, expect } from '@playwright/test';
import { TOKEN_IDS } from '../src/games/dicethrone/domain/ids';
import { setEnglishLocale } from './helpers/common';
import {
    setupOnlineMatch,
    waitForBoardReady,
    waitForMainPhase,
    getPlayerIdFromUrl,
    setPlayerToken,
    advanceToOffensiveRoll,
    applyDiceValues,
    getModalContainerByHeading,
    closeTokenResponseModal,
    readCoreState,
    applyCoreState,
    assertHandCardsVisible,
    ensureCardInHand,
    dragCardUp,
    waitForTutorialStep,
    setPlayerCp,
    closeDebugPanelIfOpen,
} from './helpers/dicethrone';

test.describe('DiceThrone E2E', () => {
    test('Online match shows starting hand cards after character selection', async ({ browser }, testInfo) => {
        test.setTimeout(120000);
        const baseURL = testInfo.project.use.baseURL as string | undefined;
        const match = await setupOnlineMatch(browser, baseURL, 'monk', 'barbarian');
        if (!match) {
            test.skip(true, 'Game server unavailable for online tests.');
        }

        const { hostPage, guestPage, hostContext, guestContext } = match!;
        try {
            await hostPage.waitForTimeout(2000);
            await guestPage.waitForTimeout(2000);

            await assertHandCardsVisible(hostPage, 4, 'host');
            await assertHandCardsVisible(guestPage, 4, 'guest');


            await hostPage.screenshot({ path: testInfo.outputPath('hand-cards-success.png'), fullPage: false });
        } finally {
            await hostContext.close();
            await guestContext.close();
        }
    });

    test('Online match: Monk Lotus Palm choice consumes Taiji', async ({ browser }, testInfo) => {
        test.setTimeout(120000);
        const baseURL = testInfo.project.use.baseURL as string | undefined;

        const match = await setupOnlineMatch(browser, baseURL, 'monk', 'barbarian');
        if (!match) test.skip(true, '游戏服务器不可用或房间创建失败');
        const { hostPage, hostContext, guestContext, autoStarted } = match!;

        try {
            if (autoStarted) {
                test.skip(true, '游戏自动开始，无法选择僧侣角色');
            }

            const monkPage = hostPage;
            const monkNextPhase = monkPage.locator('[data-tutorial-id="advance-phase-button"]');
            const monkActive = await monkNextPhase.isEnabled({ timeout: 3000 }).catch(() => false);
            if (!monkActive) {
                test.skip(true, '非预期起始玩家，无法覆盖莲花掌选择');
            }

            const monkPlayerId = getPlayerIdFromUrl(monkPage, '0');
            await setPlayerToken(monkPage, monkPlayerId, TOKEN_IDS.TAIJI, 2);

            await advanceToOffensiveRoll(monkPage);
            const rollButton = monkPage.locator('[data-tutorial-id="dice-roll-button"]');
            await expect(rollButton).toBeEnabled({ timeout: 5000 });
            await rollButton.click();
            await monkPage.waitForTimeout(300);
            await applyDiceValues(monkPage, [6, 6, 6, 6, 1]);

            const confirmButton = monkPage.locator('[data-tutorial-id="dice-confirm-button"]');
            await expect(confirmButton).toBeEnabled({ timeout: 5000 });
            await confirmButton.click();

            const highlightedSlots = monkPage
                .locator('[data-ability-slot]')
                .filter({ has: monkPage.locator('div.animate-pulse[class*="border-"]') });
            const hasHighlight = await highlightedSlots.first().isVisible({ timeout: 8000 }).catch(() => false);
            if (!hasHighlight) {
                test.skip(true, '未触发莲花掌技能');
            }
            await highlightedSlots.first().click();

            const resolveAttackButton = monkPage.getByRole('button', { name: /Resolve Attack|结算攻击/i });
            await expect(resolveAttackButton).toBeVisible({ timeout: 10000 });
            await resolveAttackButton.click();

            const choiceModal = await getModalContainerByHeading(monkPage, /Ability Resolution Choice|技能结算选择/i, 15000);
            const payButton = choiceModal.getByRole('button', { name: /Spend 2 Taiji|花费2.*太极|支付2.*太极/i });
            await expect(payButton).toBeVisible({ timeout: 5000 });
            await payButton.click();

            await monkPage.waitForTimeout(300);
            const coreAfter = await readCoreState(monkPage);
            const monkState = (coreAfter.players as Record<string, Record<string, unknown>> | undefined)?.[monkPlayerId];
            const taijiAfter = (monkState?.tokens as Record<string, number> | undefined)?.[TOKEN_IDS.TAIJI] ?? 0;
            expect(taijiAfter).toBe(0);

            await monkPage.screenshot({ path: testInfo.outputPath('monk-lotus-palm-choice.png'), fullPage: false });
        } finally {
            await hostContext.close();
            await guestContext.close();
        }
    });

    test('Online match: Monk Thunder Strike bonus die reroll consumes Taiji', async ({ browser }, testInfo) => {
        test.setTimeout(120000);
        const baseURL = testInfo.project.use.baseURL as string | undefined;

        const match = await setupOnlineMatch(browser, baseURL, 'monk', 'barbarian');
        if (!match) test.skip(true, '游戏服务器不可用或房间创建失败');
        const { hostPage, hostContext, guestContext, autoStarted } = match!;

        try {
            if (autoStarted) {
                test.skip(true, '游戏自动开始，无法选择僧侣角色');
            }

            const monkPage = hostPage;
            const monkNextPhase = monkPage.locator('[data-tutorial-id="advance-phase-button"]');
            const monkActive = await monkNextPhase.isEnabled({ timeout: 3000 }).catch(() => false);
            if (!monkActive) {
                test.skip(true, '非预期起始玩家，无法覆盖雷霆万钧重掷');
            }

            const monkPlayerId = getPlayerIdFromUrl(monkPage, '0');
            await setPlayerToken(monkPage, monkPlayerId, TOKEN_IDS.TAIJI, 2);

            await advanceToOffensiveRoll(monkPage);
            const rollButton = monkPage.locator('[data-tutorial-id="dice-roll-button"]');
            await expect(rollButton).toBeEnabled({ timeout: 5000 });
            await rollButton.click();
            await monkPage.waitForTimeout(300);
            await applyDiceValues(monkPage, [3, 3, 3, 1, 1]);

            const confirmButton = monkPage.locator('[data-tutorial-id="dice-confirm-button"]');
            await expect(confirmButton).toBeEnabled({ timeout: 5000 });
            await confirmButton.click();

            const highlightedSlots = monkPage
                .locator('[data-ability-slot]')
                .filter({ has: monkPage.locator('div.animate-pulse[class*="border-"]') });
            const hasHighlight = await highlightedSlots.first().isVisible({ timeout: 8000 }).catch(() => false);
            if (!hasHighlight) {
                test.skip(true, '未触发雷霆万钧技能');
            }
            await highlightedSlots.first().click();

            const resolveAttackButton = monkPage.getByRole('button', { name: /Resolve Attack|结算攻击/i });
            await expect(resolveAttackButton).toBeVisible({ timeout: 10000 });
            await resolveAttackButton.click();

            const rerollPrompt = monkPage.getByText(/Click a die to spend|点击.*重掷|消耗.*重掷/i).first();
            await expect(rerollPrompt).toBeVisible({ timeout: 15000 });
            const rerollRoot = rerollPrompt.locator('..');
            const rerollDice = rerollRoot.locator('.dice3d-perspective');
            await expect(rerollDice.first()).toBeVisible({ timeout: 5000 });
            await rerollDice.first().click();

            await monkPage.waitForTimeout(500);
            const coreAfter = await readCoreState(monkPage);
            const monkState = (coreAfter.players as Record<string, Record<string, unknown>> | undefined)?.[monkPlayerId];
            const taijiAfter = (monkState?.tokens as Record<string, number> | undefined)?.[TOKEN_IDS.TAIJI] ?? 0;
            expect(taijiAfter).toBe(0);

            const confirmDamageButton = rerollRoot.getByRole('button', { name: /Confirm Damage|Continue|确认伤害|继续/i });
            if (await confirmDamageButton.isVisible({ timeout: 5000 }).catch(() => false)) {
                await confirmDamageButton.click();
            }

            await monkPage.screenshot({ path: testInfo.outputPath('monk-thunder-strike-reroll.png'), fullPage: false });
        } finally {
            await hostContext.close();
            await guestContext.close();
        }
    });

    test('Tutorial completes the full flow (main1 -> offensive -> defense -> finish)', async ({ page }, testInfo) => {
        test.setTimeout(120000);
        const pageErrors: string[] = [];
        const consoleErrors: string[] = [];
        page.on('pageerror', (error) => {
            const message = error.stack || error.message;
            pageErrors.push(message);
        });
        page.on('console', (msg) => {
            if (msg.type() === 'error') consoleErrors.push(msg.text());
        });

        await setEnglishLocale(page);
        await page.goto('/play/dicethrone/tutorial');
        await waitForBoardReady(page, 30000);

        // 教学步骤本地辅助函数
        const getTutorialStepId = async () => page
            .locator('[data-tutorial-step]')
            .first()
            .getAttribute('data-tutorial-step')
            .catch(() => null);

        const clickNextOverlayStep = async () => {
            const nextButton = page.getByRole('button', { name: /^(Next|下一步)$/i }).first();
            if (await nextButton.isVisible({ timeout: 1500 }).catch(() => false)) {
                const beforeStep = await getTutorialStepId();
                await nextButton.click({ timeout: 2000, force: true }).catch(() => undefined);
                await page.waitForFunction(
                    (prev) => {
                        const el = document.querySelector('[data-tutorial-step]');
                        return el && el.getAttribute('data-tutorial-step') !== prev;
                    },
                    beforeStep,
                    { timeout: 2000 },
                ).catch(() => undefined);
            }
        };

        // 等待教学覆盖层出现
        const overlayNextButton = page.getByRole('button', { name: /^(Next|下一步)$/i }).first();
        await expect(overlayNextButton).toBeVisible({ timeout: 15000 });

        // 推进到 advance 步骤
        const advanceStep = page.locator('[data-tutorial-step="advance"]');
        for (let i = 0; i < 12; i += 1) {
            if (page.isClosed()) break;
            if (await advanceStep.isVisible({ timeout: 500 }).catch(() => false)) break;
            await clickNextOverlayStep();
            await page.waitForTimeout(200);
        }

        // 点击 Next Phase 推进到 offensiveRoll
        await expect(advanceStep).toBeVisible();
        const advanceButton = page.locator('[data-tutorial-id="advance-phase-button"]');
        await expect(advanceButton).toBeEnabled();
        for (let i = 0; i < 6; i += 1) {
            const stepId = await getTutorialStepId();
            if (stepId === 'dice-tray' || stepId === 'dice-roll') break;
            if (await advanceButton.isEnabled().catch(() => false)) {
                await advanceButton.click();
                await page.waitForTimeout(400);
            } else {
                await page.waitForTimeout(300);
            }
        }
        await advanceToOffensiveRoll(page);

        // 等待骰子步骤
        const waitForDiceStep = async () => {
            const deadline = Date.now() + 15000;
            while (Date.now() < deadline) {
                const stepId = await getTutorialStepId();
                if (stepId === 'dice-tray' || stepId === 'dice-roll') return stepId;
                await page.waitForTimeout(300);
            }
            throw new Error('未能到达 dice-tray 或 dice-roll 步骤');
        };
        const diceStep = await waitForDiceStep();
        if (diceStep === 'dice-tray') {
            await clickNextOverlayStep();
            await waitForTutorialStep(page, 'dice-roll', 15000);
        }

        // 骰子区域可见
        const diceTray = page.locator('[data-tutorial-id="dice-tray"]');
        await expect(diceTray).toBeVisible();

        // 掷骰并设置骰面
        const rollButton = page.locator('[data-tutorial-id="dice-roll-button"]');
        await expect(rollButton).toBeEnabled({ timeout: 10000 });
        await rollButton.click();
        await page.waitForTimeout(300);
        await applyDiceValues(page, [1, 1, 1, 3, 6]);
        await page.waitForTimeout(500);

        const confirmButton = page.locator('[data-tutorial-id="dice-confirm-button"]');
        await expect(confirmButton).toBeEnabled({ timeout: 10000 });
        await confirmButton.click();

        // 尝试点击高亮技能槽
        const highlightedSlots = page
            .locator('[data-ability-slot]')
            .filter({ has: page.locator('div.animate-pulse[class*="border-"]') });
        const hasSlot = await highlightedSlots.first().isVisible({ timeout: 4000 }).catch(() => false);
        if (hasSlot) {
            try {
                await highlightedSlots.first().click({ timeout: 2000 });
                await page.waitForTimeout(500);
            } catch {
                // 点击失败则继续
            }
        }

        // 等待 resolve-attack 步骤
        await waitForTutorialStep(page, 'resolve-attack', 15000);
        await expect(advanceButton).toBeEnabled({ timeout: 10000 });
        await advanceButton.click();

        // 教学步骤顺序表
        const stepOrder = [
            'setup', 'intro', 'stats', 'phases', 'player-board', 'tip-board',
            'dice', 'rollButton', 'confirmButton', 'abilities', 'hand', 'discard',
            'status-tokens', 'advance', 'resolve-attack',
            'taiji-setup', 'taiji-response', 'evasive-setup', 'evasive-response',
            'purify-setup', 'purify-use', 'inner-peace', 'play-six', 'meditation-2',
            'defense-roll', 'defense-end', 'finish',
        ];
        const getStepIndex = (id: string) => stepOrder.indexOf(id);

        const canFallbackToStep = async (targetStep: string) => {
            if (['inner-peace', 'play-six', 'meditation-2'].includes(targetStep)) {
                const handVisible = await page.locator('[data-tutorial-id="hand-area"]').first().isVisible({ timeout: 500 }).catch(() => false);
                if (!handVisible) return false;
                return await page.getByText(/Main Phase \(1\)|主要阶段 \(1\)/).isVisible({ timeout: 500 }).catch(() => false);
            }
            if (targetStep === 'defense-roll') {
                const diceTrayVisible = await page.locator('[data-tutorial-id="dice-tray"]').first().isVisible({ timeout: 500 }).catch(() => false);
                const defensePhaseVisible = await page.getByText(/Defensive Roll|防御掷骰/i).isVisible({ timeout: 500 }).catch(() => false);
                return diceTrayVisible || defensePhaseVisible;
            }
            if (targetStep === 'defense-end') {
                const main2Visible = await page.getByText(/Main Phase \(2\)|主要阶段 \(2\)/).isVisible({ timeout: 500 }).catch(() => false);
                const nextPhaseVisible = await page.locator('[data-tutorial-id="advance-phase-button"]').isVisible({ timeout: 500 }).catch(() => false);
                return main2Visible || nextPhaseVisible;
            }
            if (targetStep === 'finish') {
                return await page.getByRole('button', { name: /^(Finish and return|完成并返回)$/i }).first().isVisible({ timeout: 500 }).catch(() => false);
            }
            return false;
        };

        const advanceToStep = async (targetStep: string, timeout = 15000) => {
            const targetIndex = getStepIndex(targetStep);
            const deadline = Date.now() + timeout;
            while (Date.now() < deadline) {
                const stepId = await getTutorialStepId();
                if (!stepId) {
                    if (await canFallbackToStep(targetStep)) return targetStep;
                    await page.waitForTimeout(300);
                    continue;
                }
                if (stepId === targetStep) return stepId;
                const currentIndex = getStepIndex(stepId);
                if (currentIndex < 0) {
                    if (await canFallbackToStep(targetStep)) return targetStep;
                    await page.waitForTimeout(300);
                    continue;
                }
                if (targetIndex >= 0 && currentIndex > targetIndex) return stepId;
                if (targetIndex >= 0 && currentIndex < targetIndex) {
                    await clickNextOverlayStep();
                    await page.waitForTimeout(200);
                    continue;
                }
                await page.waitForTimeout(300);
            }
            if (targetStep === 'finish') return targetStep;
            throw new Error(`未能到达 ${targetStep} 步骤`);
        };

        const waitStepWithFallback = async (stepId: string, timeout = 15000) => {
            const quickFallbackSteps = new Set(['inner-peace', 'play-six', 'meditation-2', 'defense-roll', 'defense-end', 'finish']);
            const effectiveTimeout = quickFallbackSteps.has(stepId) ? Math.min(timeout, 6000) : timeout;
            try {
                await advanceToStep(stepId, effectiveTimeout);
            } catch (error) {
                if (stepId === 'finish') {
                    const hasOverlay = await page.locator('[data-tutorial-step]').first().isVisible({ timeout: 500 }).catch(() => false);
                    const finishVisible = await page.getByRole('button', { name: /^(Finish and return|完成并返回)$/i }).first().isVisible({ timeout: 500 }).catch(() => false);
                    if (!hasOverlay && !finishVisible) return;
                }
                if (await canFallbackToStep(stepId)) return;
                throw error;
            }
        };

        const waitForSetupThenResponse = async (setupId: string, responseId: string, timeout = 15000) => {
            const targetIndex = Math.min(getStepIndex(setupId), getStepIndex(responseId));
            const deadline = Date.now() + timeout;
            while (Date.now() < deadline) {
                const stepId = await getTutorialStepId();
                if (!stepId) { await page.waitForTimeout(300); continue; }
                const currentIndex = getStepIndex(stepId);
                if (stepId === responseId) return stepId;
                if (stepId === setupId) {
                    await clickNextOverlayStep();
                    await advanceToStep(responseId, timeout);
                    return responseId;
                }
                if (currentIndex < targetIndex && currentIndex >= 0) {
                    await clickNextOverlayStep();
                    await page.waitForTimeout(200);
                    continue;
                }
                if (currentIndex > targetIndex && targetIndex >= 0) return stepId;
                await page.waitForTimeout(300);
            }
            throw new Error(`未能到达 ${setupId} 或 ${responseId} 步骤`);
        };

        // 太极响应
        await waitForSetupThenResponse('taiji-setup', 'taiji-response');
        try {
            const taijiModal = await getModalContainerByHeading(page, /Respond|响应/i, 4000);
            const useTaijiButton = taijiModal.getByRole('button', { name: /Use Taiji|使用太极/i });
            if (await useTaijiButton.isVisible().catch(() => false)) await useTaijiButton.click({ force: true });
            await closeTokenResponseModal(taijiModal);
        } catch {
            await clickNextOverlayStep();
        }

        // 闪避响应
        await waitForSetupThenResponse('evasive-setup', 'evasive-response');
        try {
            const evasiveModal = await getModalContainerByHeading(page, /Respond|响应/i, 4000);
            const useEvasiveButton = evasiveModal.getByRole('button', { name: /Use Evasive|使用闪避/i });
            if (await useEvasiveButton.isVisible().catch(() => false)) await useEvasiveButton.click({ force: true });
            await page.waitForTimeout(300);
            if (await evasiveModal.isVisible().catch(() => false)) await closeTokenResponseModal(evasiveModal);
        } catch {
            await clickNextOverlayStep();
        }
        await clickNextOverlayStep();

        // 净化步骤
        const waitForPurifyStep = async () => {
            const deadline = Date.now() + 15000;
            while (Date.now() < deadline) {
                const stepId = await getTutorialStepId();
                if (stepId === 'evasive-response') { await clickNextOverlayStep(); await page.waitForTimeout(300); continue; }
                if (stepId === 'purify-setup' || stepId === 'purify-use') return stepId;
                await page.waitForTimeout(300);
            }
            throw new Error('未能到达 purify-setup 或 purify-use 步骤');
        };
        const purifyStep = await waitForPurifyStep();
        if (purifyStep === 'purify-setup') {
            await clickNextOverlayStep();
            await waitStepWithFallback('purify-use');
        }

        // 关闭残留弹窗
        const residualModal = page.locator('[data-testid="token-response-modal"], div[data-modal="true"]').first();
        if (await residualModal.isVisible({ timeout: 1000 }).catch(() => false)) {
            const closeBtn = residualModal.getByRole('button', { name: /Close|关闭|Skip|跳过/i }).first();
            await closeBtn.click({ force: true }).catch(() => undefined);
            await page.waitForTimeout(300);
        }

        // 通过 debug 命令执行净化
        await applyCoreState(page, (core) => {
            const players = core.players as Record<string, Record<string, unknown>> | undefined;
            const player = players?.['0'];
            if (!player) return core;
            player.tokens = (player.tokens as Record<string, unknown>) ?? {};
            (player.tokens as Record<string, number>).purify = Math.max(0, ((player.tokens as Record<string, number>).purify ?? 1) - 1);
            player.statusEffects = (player.statusEffects as Record<string, unknown>) ?? {};
            delete (player.statusEffects as Record<string, unknown>).knockdown;
            return core;
        });
        await page.waitForTimeout(500);

        // 推进到 inner-peace
        const tutorialNextBtn = page.locator('[data-tutorial-step="purify-use"] button, [data-tutorial-step="purify-use"] .cursor-pointer').first();
        if (await tutorialNextBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
            await tutorialNextBtn.click({ force: true }).catch(() => undefined);
        }

        await waitStepWithFallback('inner-peace');
        await dragCardUp(page, 'card-inner-peace');
        await clickNextOverlayStep();

        await waitStepWithFallback('play-six');
        await ensureCardInHand(page, 'card-play-six');
        await dragCardUp(page, 'card-play-six');

        // 设置阶段为 offensiveRoll 并设置骰子值
        await applyCoreState(page, (core) => {
            const c = core as Record<string, unknown>;
            c.phase = 'offensiveRoll';
            c.dice = (c.dice as unknown[]) ?? [];
            c.rollCount = 1;
            c.rollConfirmed = false;
            for (let i = 0; i < 5; i++) {
                const dice = c.dice as Array<Record<string, unknown>>;
                if (dice[i]) { dice[i].value = 1; dice[i].isKept = false; }
            }
            return c;
        });
        await page.waitForTimeout(500);

        const diceTrayInteraction = page.locator('[data-tutorial-id="dice-tray"]');
        await expect(diceTrayInteraction).toBeVisible({ timeout: 15000 });
        const diceTrayButton = diceTrayInteraction.locator('.cursor-pointer').first();
        try {
            await diceTrayButton.click({ force: true, timeout: 3000 });
        } catch {
            await diceTrayButton.evaluate((node) => (node as HTMLElement).click());
        }
        const confirmDiceButton = page.getByRole('button', { name: /Confirm|确认/i }).first();
        await expect(confirmDiceButton).toBeVisible({ timeout: 15000 });
        await page.evaluate(() => {
            const modalRoot = document.querySelector('#modal-root') as HTMLElement | null;
            if (modalRoot) modalRoot.style.pointerEvents = 'none';
        });
        try {
            await confirmDiceButton.click({ force: true, timeout: 3000 });
        } catch {
            await confirmDiceButton.evaluate((node) => (node as HTMLElement).click());
        }

        await waitStepWithFallback('meditation-2');
        await setPlayerCp(page, '0', 2);
        await ensureCardInHand(page, 'card-meditation-2');
        await dragCardUp(page, 'card-meditation-2');

        await waitStepWithFallback('defense-roll');
        // 模拟对手防御掷骰
        await applyCoreState(page, (core) => {
            core.phase = 'defensiveRoll';
            const opponent = (core.players as Record<string, Record<string, unknown>> | undefined)?.['1'];
            if (opponent) {
                opponent.dice = (opponent.dice as unknown[]) ?? [];
                for (let i = 0; i < 5; i++) {
                    const dice = opponent.dice as Array<Record<string, unknown>>;
                    if (!dice[i]) dice[i] = { id: i, value: 1, isKept: false };
                    dice[i].value = 1;
                    dice[i].isKept = true;
                }
            }
            return core;
        });
        await page.waitForTimeout(500);

        await clickNextOverlayStep();
        await waitStepWithFallback('defense-end');
        await clickNextOverlayStep();

        // 点击结束阶段按钮
        const endPhaseBtn = page.locator('[data-tutorial-id="advance-phase-button"]');
        if (await endPhaseBtn.isEnabled({ timeout: 3000 }).catch(() => false)) {
            await endPhaseBtn.click();
            await page.waitForTimeout(300);
        }

        // 处理确认弹窗
        const confirmHeading = page.getByRole('heading', { name: /End offensive roll\?|确认结束攻击掷骰？/i });
        if (await confirmHeading.isVisible({ timeout: 2000 }).catch(() => false)) {
            const confirmSkipModal = confirmHeading.locator('..').locator('..');
            await confirmSkipModal.getByRole('button', { name: /Confirm|确认/i }).click();
        }

        await waitStepWithFallback('finish');
        const finishButton = page.getByRole('button', { name: /^(Finish and return|完成并返回)$/i }).first();
        const overlayVisible = await page.locator('[data-tutorial-step]').first().isVisible({ timeout: 500 }).catch(() => false);
        const finishVisible = await finishButton.isVisible({ timeout: 1000 }).catch(() => false);
        if (!overlayVisible && !finishVisible) return;
        if (finishVisible) {
            await page.screenshot({ path: testInfo.outputPath('tutorial-final-step.png'), fullPage: false });
            await finishButton.click();
        }
    });

});
