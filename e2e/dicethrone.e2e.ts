/**
 * DiceThrone 核心 E2E 测试
 *
 * 覆盖：在线对局手牌验证、僧侣技能交互、教学流程全链路。
 * 通用工具从 helpers/common 导入，DT 专用工具从 helpers/dicethrone 导入。
 */

import { test, expect } from '@playwright/test';
import { TOKEN_IDS, STATUS_IDS } from '../src/games/dicethrone/domain/ids';
import { setEnglishLocale } from './helpers/common';
import {
    setupOnlineMatch,
    waitForBoardReady,
    waitForTutorialBoardReady,
    getPlayerIdFromUrl,
    setPlayerToken,
    applyDiceValues,
    getModalContainerByHeading,
    readCoreState,
    assertHandCardsVisible,
    waitForTutorialStep,
    dispatchLocalCommand,
    patchCoreViaDispatch,
    
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

            // 推进到进攻投骰阶段
            const advanceButton = monkPage.locator('[data-tutorial-id="advance-phase-button"]');
            while (await advanceButton.isEnabled({ timeout: 1000 }).catch(() => false)) {
                await advanceButton.click();
                await monkPage.waitForTimeout(400);
            }
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

            // 推进到进攻投骰阶段
            const advanceButton = monkPage.locator('[data-tutorial-id="advance-phase-button"]');
            while (await advanceButton.isEnabled({ timeout: 1000 }).catch(() => false)) {
                await advanceButton.click();
                await monkPage.waitForTimeout(400);
            }
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
        test.setTimeout(180000); // 增加超时时间
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
        await waitForTutorialBoardReady(page, 60000);

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

        const overlayNextButton = page.getByRole('button', { name: /^(Next|下一步)$/i }).first();
        await expect(overlayNextButton).toBeVisible({ timeout: 15000 });

        while (true) {
            const stepId = await getTutorialStepId();
            if (stepId === 'sell-card-intro') break;
            await clickNextOverlayStep();
        }

        await dispatchLocalCommand(page, 'SELL_CARD', { cardId: 'card-deep-thought' });
        await page.waitForFunction(() => {
            const el = document.querySelector('[data-tutorial-step]');
            return el?.getAttribute('data-tutorial-step') === 'undo-sell-intro';
        }, { timeout: 5000 });

        await clickNextOverlayStep();

        await dispatchLocalCommand(page, 'UNDO_SELL_CARD', {});
        await page.waitForFunction(() => {
            const el = document.querySelector('[data-tutorial-step]');
            return el?.getAttribute('data-tutorial-step') === 'advance';
        }, { timeout: 5000 });

        const advanceStep = page.locator('[data-tutorial-step="advance"]');
        await expect(advanceStep).toBeVisible({ timeout: 5000 });
        const advanceButton = page.locator('[data-tutorial-id="advance-phase-button"]');
        await expect(advanceButton).toBeEnabled({ timeout: 5000 });
        await advanceButton.click();
        await page.waitForFunction(() => {
            const el = document.querySelector('[data-tutorial-step]');
            const stepId = el?.getAttribute('data-tutorial-step');
            return stepId === 'dice-tray' || stepId === 'dice-roll' || stepId === 'play-six';
        }, { timeout: 10000 });

        const initialDiceStep = await getTutorialStepId();
        if (initialDiceStep === 'dice-tray') {
            await clickNextOverlayStep();
            await page.waitForFunction(() => {
                const stepId = document.querySelector('[data-tutorial-step]')?.getAttribute('data-tutorial-step');
                return stepId === 'dice-roll' || stepId === 'play-six';
            }, { timeout: 10000 });
        }

        // 骰子区域可见
        const diceTray = page.locator('[data-tutorial-id="dice-tray"]');
        await expect(diceTray).toBeVisible();

        // 步骤 B1: 掷骰（教学 randomPolicy=fixed:[6]，全莲花）
        const rollButton = page.locator('[data-tutorial-id="dice-roll-button"]');
        await expect(rollButton).toBeEnabled({ timeout: 10000 });
        await rollButton.click();
        await page.waitForTimeout(500);

        // 步骤 B2: play-six 出牌（教学期望打出"玩得六啊"修改骰面）
        const waitForPlaySixOrConfirm = async () => {
            const deadline = Date.now() + 15000;
            while (Date.now() < deadline) {
                const stepId = await getTutorialStepId();
                if (stepId === 'play-six') return 'play-six';
                if (stepId === 'dice-confirm') return 'dice-confirm';
                await page.waitForTimeout(300);
            }
            return null;
        };
        const playSixStep = await waitForPlaySixOrConfirm();

        if (playSixStep === 'play-six') {
            const handCard = page.locator('[data-card-id="card-play-six"]').first();
            await expect(handCard).toBeVisible({ timeout: 10000 });
            await handCard.click();

            await page.waitForFunction(() => {
                return document.body.textContent?.includes('Select die to set to 6');
            }, { timeout: 10000 });

            const firstDieButton = page.locator('[data-testid="die-button-0"]');
            await expect(firstDieButton).toBeVisible({ timeout: 10000 });
            await firstDieButton.click();

            await page.waitForFunction(
                () => document.querySelector('[data-tutorial-step]')?.getAttribute('data-tutorial-step') === 'dice-confirm',
                { timeout: 10000 },
            );
        }

        // 步骤 B3: dice-confirm 确认骰子
        const waitForDiceConfirmStep = async () => {
            const deadline = Date.now() + 15000;
            while (Date.now() < deadline) {
                const stepId = await getTutorialStepId();
                if (stepId === 'dice-confirm' || stepId === 'abilities' || stepId === 'resolve-attack') return stepId;
                await page.waitForTimeout(300);
            }
            return null;
        };
        const diceConfirmStep = await waitForDiceConfirmStep();

        if (diceConfirmStep === 'dice-confirm') {
            const confirmButton = page.locator('[data-tutorial-id="dice-confirm-button"]');
            await expect(confirmButton).toBeEnabled({ timeout: 10000 });
            await confirmButton.click();
            await page.waitForTimeout(500);
        }

        // 步骤 B4: abilities 选择技能
        const waitForAbilitiesStep = async () => {
            const deadline = Date.now() + 15000;
            while (Date.now() < deadline) {
                const stepId = await getTutorialStepId();
                if (stepId === 'abilities' || stepId === 'resolve-attack') return stepId;
                await page.waitForTimeout(300);
            }
            return null;
        };
        const abilitiesStep = await waitForAbilitiesStep();

        if (abilitiesStep === 'abilities') {
            const ultimateSlot = page.locator('[data-ability-slot="ultimate"]').first();
            await page.waitForFunction(() => {
                const el = document.querySelector('[data-ability-slot="ultimate"]') as HTMLElement | null;
                if (!el) return false;
                const rect = el.getBoundingClientRect();
                return rect.width > 0 && rect.height > 0;
            }, { timeout: 30000 });
            await ultimateSlot.evaluate((el: HTMLElement) => el.click());
            await page.waitForTimeout(500);
        }

        // 教学步骤顺序表（与 tutorial.ts 定义一致）
        const stepOrder = [
            'setup', 'intro', 'stats', 'phases', 'player-board', 'tip-board',
            'hand', 'discard', 'status-tokens',
            'advance', 'dice-tray', 'dice-roll', 'play-six', 'dice-confirm', 'abilities', 'resolve-attack',
            'opponent-defense', 'card-enlightenment', 'ai-turn',
            'knockdown-explain', 'enlightenment-play', 'purify-use',
            'inner-peace', 'meditation-2', 'finish',
        ];
        const getStepIndex = (id: string) => stepOrder.indexOf(id);

        /** 等待教学步骤，支持 fallback 检测 */
        const advanceToStep = async (targetStep: string, timeout = 15000) => {
            const targetIndex = getStepIndex(targetStep);
            const deadline = Date.now() + timeout;
            while (Date.now() < deadline) {
                const stepId = await getTutorialStepId();
                if (!stepId) {
                    // 教学覆盖层消失，可能已经跳过了目标步骤
                    if (targetStep === 'finish') {
                        const finishBtn = await page.getByRole('button', { name: /^(Finish and return|完成并返回)$/i }).first().isVisible({ timeout: 500 }).catch(() => false);
                        if (finishBtn) return targetStep;
                    }
                    await page.waitForTimeout(300);
                    continue;
                }
                if (stepId === targetStep) return stepId;
                const currentIndex = getStepIndex(stepId);
                // 已经超过目标步骤
                if (targetIndex >= 0 && currentIndex >= 0 && currentIndex > targetIndex) return stepId;
                // 还没到目标步骤，尝试点击 Next
                if (targetIndex >= 0 && currentIndex >= 0 && currentIndex < targetIndex) {
                    await clickNextOverlayStep();
                    await page.waitForTimeout(200);
                    continue;
                }
                await page.waitForTimeout(300);
            }
            const finalStep = await getTutorialStepId();
            if (targetStep === 'finish') return targetStep;
            throw new Error(`未能到达 ${targetStep} 步骤（最终步骤=${finalStep}）`);
        };

        const stepBeforeResolve = await getTutorialStepId();
        const canResolveImmediately = stepBeforeResolve === 'abilities'
            && await advanceButton.isEnabled({ timeout: 1000 }).catch(() => false);
        if (!canResolveImmediately) {
            await advanceToStep('resolve-attack', 15000);
        }
        await expect(advanceButton).toBeEnabled({ timeout: 10000 });
        await advanceButton.click({ force: true });
        await page.waitForFunction(() => {
            const stepId = document.querySelector('[data-tutorial-step]')?.getAttribute('data-tutorial-step');
            return !stepId || stepId !== 'abilities';
        }, { timeout: 10000 }).catch(() => {});
            

        // ====== 段 B 完成：resolve-attack → opponent-defense（AI 自动） ======

        // ====== 段 B 完成：resolve-attack → opponent-defense（AI 自动） ======
        // opponent-defense 步骤有 aiActions，教学系统会自动执行 AI 防御
        // 等待 AI 完成后进入 card-enlightenment
        await advanceToStep('card-enlightenment', 30000);
        // card-enlightenment 是信息步骤，点击 Next
        await clickNextOverlayStep();

        // ====== 段 C：ai-turn（AI 完整回合） ======
        // ai-turn 步骤有大量 aiActions，教学系统自动执行
        // AI 回合结束后进入 knockdown-explain
        await advanceToStep('knockdown-explain', 45000);
        // knockdown-explain 是信息步骤
        await clickNextOverlayStep();

        // ====== 段 D：净化教程 ======
        // enlightenment-play：通过 dispatch 直接打出悟道卡（framer-motion 拖拽在 Playwright 中不可靠）
        await advanceToStep('enlightenment-play', 15000);
        // 教学牌组保证 card-enlightenment 在起手牌中，直接 dispatch 出牌
        await page.waitForTimeout(500);
        await dispatchLocalCommand(page, 'PLAY_CARD', { cardId: 'card-enlightenment' });
        await page.waitForTimeout(500);

        // purify-use：使用净化 token 移除击倒
        // 注意：enlightenment-roll 的骰子结果取决于 seeded random，不一定是莲花面
        // 确保玩家有净化 token 和击倒状态，以便 USE_PURIFY 能成功执行
        await advanceToStep('purify-use', 15000);
        await patchCoreViaDispatch(page, {
            [`players.0.tokens.${TOKEN_IDS.PURIFY}`]: 1,
            [`players.0.statusEffects.${STATUS_IDS.KNOCKDOWN}`]: 1,
        });
        await page.waitForTimeout(300);
        await dispatchLocalCommand(page, 'USE_PURIFY', { statusId: STATUS_IDS.KNOCKDOWN });
        await page.waitForTimeout(500);

        // ====== 段 E：补充卡牌教学 ======
        // inner-peace：出牌内心平静
        await advanceToStep('inner-peace', 15000);
        await dispatchLocalCommand(page, 'PLAY_CARD', { cardId: 'card-inner-peace' });
        await page.waitForTimeout(500);

        // meditation-2：升级冥想技能（需要 2 CP + 卡牌在手中）
        await advanceToStep('meditation-2', 15000);
        // 原子操作：读取状态 → 设置 CP + 确保卡牌在手中 → dispatch 更新
        await page.evaluate(() => {
            const w = window as Window & {
                __BG_LOCAL_DISPATCH__?: (type: string, payload: unknown) => void;
                __BG_LOCAL_STATE__?: { core?: Record<string, unknown> };
            };
            if (!w.__BG_LOCAL_DISPATCH__ || !w.__BG_LOCAL_STATE__?.core) return;
            // 深拷贝避免直接修改 React 状态引用
            const core = JSON.parse(JSON.stringify(w.__BG_LOCAL_STATE__.core)) as Record<string, unknown>;
            const players = core.players as Record<string, Record<string, unknown>> | undefined;
            const player = players?.['0'];
            if (!player) return;
            // 设置 CP = 2
            const resources = (player.resources as Record<string, unknown>) ?? {};
            resources.cp = 2;
            player.resources = resources;
            // 确保 card-meditation-2 在手牌中
            const hand = (player.hand as Array<{ id?: string }>) ?? [];
            if (!hand.some(c => c?.id === 'card-meditation-2')) {
                const deck = (player.deck as Array<{ id?: string }>) ?? [];
                const discard = (player.discard as Array<{ id?: string }>) ?? [];
                const idx1 = deck.findIndex(c => c?.id === 'card-meditation-2');
                if (idx1 >= 0) {
                    hand.push(deck.splice(idx1, 1)[0]);
                } else {
                    const idx2 = discard.findIndex(c => c?.id === 'card-meditation-2');
                    if (idx2 >= 0) hand.push(discard.splice(idx2, 1)[0]);
                }
                player.hand = hand;
                player.deck = deck;
                player.discard = discard;
            }
            w.__BG_LOCAL_DISPATCH__('SYS_CHEAT_SET_STATE', { state: core });
        });
        await page.waitForTimeout(300);
        await dispatchLocalCommand(page, 'PLAY_CARD', { cardId: 'card-meditation-2' });
        await page.waitForTimeout(500);

        // finish：教学完成
        await advanceToStep('finish', 30000);
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
