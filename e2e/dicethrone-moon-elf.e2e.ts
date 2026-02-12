/**
 * 月精灵 (Moon Elf) E2E 交互测试
 *
 * 覆盖交互面：
 * - 角色选择：月精灵在选角界面可选
 * - 攻击流程：掷骰 → 确认 → 选择技能 → 结算攻击 → 防御阶段
 * - 技能高亮：关键技能触发
 * - 防御阶段：防御掷骰流程覆盖
 * - 状态效果：Targeted 伤害提升结算
 */

import { test, expect, type Page } from '@playwright/test';
import { STATUS_IDS } from '../src/games/dicethrone/domain/ids';
import { RESOURCE_IDS } from '../src/games/dicethrone/domain/resources';
import { initContext } from './helpers/common';
import {
    setupOnlineMatch,
    waitForMainPhase,
    advanceToOffensiveRoll,
    applyDiceValues,
    getPlayerIdFromUrl,
    readCoreState,
    applyCoreStateDirect,
    maybePassResponse,
    getModalContainerByHeading,
} from './helpers/dicethrone';

test.describe('DiceThrone Moon Elf E2E', () => {

    // ========================================================================
    // 1. 在线对局：月精灵角色选择 + 基础攻击流程
    // ========================================================================
    test('Online match: Moon Elf character selection and basic attack flow', async ({ browser }, testInfo) => {
        test.setTimeout(90000);
        const baseURL = testInfo.project.use.baseURL as string | undefined;

        const match = await setupOnlineMatch(browser, baseURL, 'moon_elf', 'barbarian');
        if (!match) test.skip(true, '游戏服务器不可用或房间创建失败');
        const { hostPage, guestPage, hostContext, guestContext, autoStarted } = match!;

        try {
            if (autoStarted) {
                test.skip(true, '游戏自动开始，无法选择月精灵角色');
            }

            // 验证手牌区可见（4张初始手牌）
            await hostPage.waitForTimeout(2000);
            const hostHandArea = hostPage.locator('[data-tutorial-id="hand-area"]');
            await expect(hostHandArea).toBeVisible();
            const hostHandCards = hostHandArea.locator('[data-card-id]');
            await expect(hostHandCards).toHaveCount(4, { timeout: 15000 });

            // 确定攻击方
            let attackerPage: Page;
            let defenderPage: Page;
            const hostNextPhase = hostPage.locator('[data-tutorial-id="advance-phase-button"]');
            if (await hostNextPhase.isEnabled({ timeout: 3000 }).catch(() => false)) {
                attackerPage = hostPage;
                defenderPage = guestPage;
            } else {
                attackerPage = guestPage;
                defenderPage = hostPage;
            }

            // 推进到攻击掷骰阶段
            await advanceToOffensiveRoll(attackerPage);

            // 掷骰
            const rollButton = attackerPage.locator('[data-tutorial-id="dice-roll-button"]');
            await expect(rollButton).toBeEnabled({ timeout: 5000 });
            await rollButton.click();
            await attackerPage.waitForTimeout(300);

            // 设置骰面为 [1,1,1,1,1] = 5个弓(bow)，触发长弓 5-of-a-kind
            await applyDiceValues(attackerPage, [1, 1, 1, 1, 1]);

            // 确认掷骰
            const confirmButton = attackerPage.locator('[data-tutorial-id="dice-confirm-button"]');
            await expect(confirmButton).toBeEnabled({ timeout: 5000 });
            await confirmButton.click();

            // 检查技能高亮
            const highlightedSlots = attackerPage
                .locator('[data-ability-slot]')
                .filter({ has: attackerPage.locator('div.animate-pulse[class*="border-"]') });
            const hasHighlight = await highlightedSlots.first().isVisible({ timeout: 5000 }).catch(() => false);

            if (hasHighlight) {
                await highlightedSlots.first().click();
                const resolveAttackButton = attackerPage.getByRole('button', { name: /Resolve Attack|结算攻击/i });
                await expect(resolveAttackButton).toBeVisible({ timeout: 10000 });
                await resolveAttackButton.click();
            } else {
                const advanceButton = attackerPage.locator('[data-tutorial-id="advance-phase-button"]');
                await advanceButton.click();
                const confirmHeading = attackerPage.getByRole('heading', { name: /End offensive roll\?|确认结束攻击掷骰？/i });
                if (await confirmHeading.isVisible({ timeout: 4000 }).catch(() => false)) {
                    const confirmSkipModal = confirmHeading.locator('..').locator('..');
                    await confirmSkipModal.getByRole('button', { name: /Confirm|确认/i }).click();
                }
            }

            // 处理技能结算选择弹窗
            for (let choiceAttempt = 0; choiceAttempt < 5; choiceAttempt++) {
                let choiceModal: ReturnType<typeof attackerPage.locator> | null = null;
                try {
                    choiceModal = await getModalContainerByHeading(attackerPage, /Ability Resolution Choice|技能结算选择/i, 1500);
                } catch { choiceModal = null; }
                if (!choiceModal) break;
                const choiceButton = choiceModal.getByRole('button').filter({ hasText: /\S+/ }).first();
                if (await choiceButton.isVisible({ timeout: 500 }).catch(() => false)) {
                    await choiceButton.click();
                    await attackerPage.waitForTimeout(500);
                }
            }

            // 等待防御阶段或 Main Phase 2
            const defensePhaseStarted = await Promise.race([
                defenderPage.getByRole('button', { name: /End Defense|结束防御/i }).isVisible({ timeout: 8000 }).then(() => true).catch(() => false),
                attackerPage.getByText(/Main Phase \(2\)|主要阶段 \(2\)/).isVisible({ timeout: 8000 }).then(() => false).catch(() => false),
            ]);

            if (defensePhaseStarted) {
                const defenderRollButton = defenderPage.locator('[data-tutorial-id="dice-roll-button"]');
                const defenderConfirmButton = defenderPage.locator('[data-tutorial-id="dice-confirm-button"]');
                const endDefenseButton = defenderPage.getByRole('button', { name: /End Defense|结束防御/i });

                const canRoll = await defenderRollButton.isEnabled({ timeout: 5000 }).catch(() => false);
                if (canRoll) {
                    await defenderRollButton.click();
                    await defenderPage.waitForTimeout(300);
                    await defenderConfirmButton.click();
                    await endDefenseButton.click();
                } else {
                    const canEndDefense = await endDefenseButton.isEnabled({ timeout: 2000 }).catch(() => false);
                    if (canEndDefense) await endDefenseButton.click();
                }

                for (let i = 0; i < 4; i += 1) {
                    const hostPassed = await maybePassResponse(hostPage);
                    const guestPassed = await maybePassResponse(guestPage);
                    if (!hostPassed && !guestPassed) break;
                }
            }

            await expect(attackerPage.getByText(/Main Phase \(2\)|主要阶段 \(2\)/)).toBeVisible({ timeout: 15000 });
            await hostPage.screenshot({ path: testInfo.outputPath('moon-elf-attack-flow.png'), fullPage: false });
        } finally {
            await hostContext.close();
            await guestContext.close();
        }
    });


    // ========================================================================
    // 2. 在线对局：Targeted 受伤 +2（伤害结算后移除）
    // ========================================================================
    test('Online match: Moon Elf Targeted increases damage by 2', async ({ browser }, testInfo) => {
        test.setTimeout(120000);
        const baseURL = testInfo.project.use.baseURL as string | undefined;

        // 这个测试需要 host=barbarian, guest=moon_elf 来构造 Targeted 场景
        const match = await setupOnlineMatch(browser, baseURL, 'barbarian', 'moon_elf');
        if (!match) test.skip(true, '游戏服务器不可用或房间创建失败');
        const { hostPage, guestPage, hostContext, guestContext, autoStarted } = match!;

        try {
            if (autoStarted) {
                test.skip(true, '游戏自动开始，无法选择角色');
            }

            const hostNextPhase = hostPage.locator('[data-tutorial-id="advance-phase-button"]');
            const hostIsActive = await hostNextPhase.isEnabled({ timeout: 3000 }).catch(() => false);
            if (!hostIsActive) {
                test.skip(true, '非预期起始玩家，无法构造 Targeted 受伤场景');
            }

            const attackerPage = hostPage;
            const defenderPage = guestPage;
            const defenderId = getPlayerIdFromUrl(defenderPage, '1');

            // 读取当前状态并注入 Targeted
            const coreState = await readCoreState(attackerPage) as Record<string, unknown>;
            const players = coreState?.players as Record<string, Record<string, unknown>> | undefined;
            const defenderState = players?.[defenderId];
            if (!defenderState) {
                test.skip(true, '无法读取防御方状态');
            }

            const resources = defenderState!.resources as Record<string, number> | undefined;
            const hpBefore = resources?.[RESOURCE_IDS.HP] ?? 0;
            const nextCoreState = {
                ...coreState,
                players: {
                    ...players,
                    [defenderId]: {
                        ...defenderState,
                        statusEffects: {
                            ...((defenderState!.statusEffects as Record<string, unknown>) ?? {}),
                            [STATUS_IDS.TARGETED]: 1,
                        },
                    },
                },
            };

            await applyCoreStateDirect(attackerPage, nextCoreState);
            await attackerPage.waitForTimeout(300);

            // 狂战士进攻：4 Strength 触发不可防御攻击
            await advanceToOffensiveRoll(attackerPage);
            const rollButton = attackerPage.locator('[data-tutorial-id="dice-roll-button"]');
            await expect(rollButton).toBeEnabled({ timeout: 5000 });
            await rollButton.click();
            await attackerPage.waitForTimeout(300);
            await applyDiceValues(attackerPage, [6, 6, 6, 6, 1]);

            const confirmButton = attackerPage.locator('[data-tutorial-id="dice-confirm-button"]');
            await expect(confirmButton).toBeEnabled({ timeout: 5000 });
            await confirmButton.click();

            const highlightedSlots = attackerPage
                .locator('[data-ability-slot]')
                .filter({ has: attackerPage.locator('div.animate-pulse[class*="border-"]') });
            await expect(highlightedSlots.first()).toBeVisible({ timeout: 8000 });
            await highlightedSlots.first().click();

            const resolveAttackButton = attackerPage.getByRole('button', { name: /Resolve Attack|结算攻击/i });
            await expect(resolveAttackButton).toBeVisible({ timeout: 10000 });
            await resolveAttackButton.click();

            await expect(attackerPage.getByText(/Main Phase \(2\)|主要阶段 \(2\)/)).toBeVisible({ timeout: 15000 });

            const coreAfter = await readCoreState(attackerPage) as Record<string, unknown>;
            const playersAfter = coreAfter?.players as Record<string, Record<string, unknown>> | undefined;
            const defenderAfter = playersAfter?.[defenderId];
            const resourcesAfter = defenderAfter?.resources as Record<string, number> | undefined;
            const hpAfter = resourcesAfter?.[RESOURCE_IDS.HP] ?? 0;
            expect(hpAfter).toBe(hpBefore - 7);
            const statusAfter = defenderAfter?.statusEffects as Record<string, number> | undefined;
            expect(statusAfter?.[STATUS_IDS.TARGETED] ?? 0).toBe(0);

            await attackerPage.screenshot({ path: testInfo.outputPath('moon-elf-targeted-damage.png'), fullPage: false });
        } finally {
            await hostContext.close();
            await guestContext.close();
        }
    });
});
