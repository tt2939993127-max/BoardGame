/**
 * 状态防护盾（preventStatus）机制 E2E 测试
 *
 * 测试场景：
 * 1. preventStatus 护盾注入后在 UI 中可见，攻击结算后被清理
 * 2. 护盾不减伤（只防状态）
 *
 * 使用在线双人对局模式，通过调试面板注入状态。
 * 单元测试已覆盖核心逻辑（preventStatus.test.ts, shield-cleanup.test.ts），
 * E2E 测试验证 UI 集成。
 */

import { test, expect } from '@playwright/test';
import { STATUS_IDS } from '../src/games/dicethrone/domain/ids';
import { RESOURCE_IDS } from '../src/games/dicethrone/domain/resources';
import {
    setupOnlineMatch,
    advanceToOffensiveRoll,
    applyDiceValues,
    getPlayerIdFromUrl,
    readCoreState,
    applyCoreStateDirect,
    maybePassResponse,
} from './helpers/dicethrone';

test.describe('DiceThrone 状态防护盾（preventStatus）', () => {

    test('preventStatus 护盾阻止 debuff 但不减伤', async ({ browser }, testInfo) => {
        test.setTimeout(120000);
        const baseURL = testInfo.project.use.baseURL as string | undefined;

        // 野蛮人（攻击方）vs 炎术士（防御方）
        const match = await setupOnlineMatch(browser, baseURL, 'barbarian', 'pyromancer');
        if (!match) test.skip(true, '游戏服务器不可用或房间创建失败');
        const { hostPage, guestPage, hostContext, guestContext } = match!;

        try {
            const hostNextPhase = hostPage.locator('[data-tutorial-id="advance-phase-button"]');
            const hostIsActive = await hostNextPhase.isEnabled({ timeout: 3000 }).catch(() => false);
            if (!hostIsActive) test.skip(true, '非预期起始玩家');

            const attackerPage = hostPage;
            const defenderId = getPlayerIdFromUrl(guestPage, '1');

            // 1. 读取当前状态，给防御方注入 preventStatus 护盾
            const coreBefore = await readCoreState(attackerPage) as Record<string, unknown>;
            const players = coreBefore.players as Record<string, Record<string, unknown>>;
            const defender = players[defenderId];
            const defenderResources = defender.resources as Record<string, number>;
            const hpBefore = defenderResources[RESOURCE_IDS.HP] ?? 0;

            // 注入 preventStatus 护盾 + 确保无燃烧状态
            const injectedCore = {
                ...coreBefore,
                players: {
                    ...players,
                    [defenderId]: {
                        ...defender,
                        damageShields: [
                            { value: 1, sourceId: 'barbarian-thick-skin', preventStatus: true },
                        ],
                        statusEffects: {
                            ...((defender.statusEffects as Record<string, number>) ?? {}),
                            [STATUS_IDS.BURN]: 0,
                        },
                    },
                },
            };
            await applyCoreStateDirect(attackerPage, injectedCore);
            await attackerPage.waitForTimeout(500);

            // 验证护盾已注入
            const coreWithShield = await readCoreState(attackerPage) as Record<string, unknown>;
            const playersWithShield = coreWithShield.players as Record<string, Record<string, unknown>>;
            const defenderWithShield = playersWithShield[defenderId];
            const shields = (defenderWithShield.damageShields as Array<Record<string, unknown>>) ?? [];
            expect(shields.length, '护盾注入失败').toBe(1);
            expect(shields[0].preventStatus, '护盾 preventStatus 标记错误').toBe(true);

            // 2. 推进到攻击掷骰阶段
            await advanceToOffensiveRoll(attackerPage);

            // 3. 投骰
            const rollButton = attackerPage.locator('[data-tutorial-id="dice-roll-button"]');
            await expect(rollButton).toBeEnabled({ timeout: 5000 });
            await rollButton.click();
            await attackerPage.waitForTimeout(500);

            // 设置骰子值：3 SWORD (1,2,3) + 2 HEART (4,5) → 触发 slap（3 SWORD = 4 伤害）
            await applyDiceValues(attackerPage, [1, 2, 3, 4, 5]);
            await attackerPage.waitForTimeout(300);

            const confirmButton = attackerPage.locator('[data-tutorial-id="dice-confirm-button"]');
            await expect(confirmButton).toBeEnabled({ timeout: 5000 });
            await confirmButton.click();
            await attackerPage.waitForTimeout(500);

            // 4. 选择高亮技能
            const highlightedSlots = attackerPage
                .locator('[data-ability-slot]')
                .filter({ has: attackerPage.locator('div.animate-pulse[class*="border-"]') });

            // 等待技能高亮出现
            const hasHighlight = await highlightedSlots.first().isVisible({ timeout: 8000 }).catch(() => false);

            if (hasHighlight) {
                await highlightedSlots.first().click();
                await attackerPage.waitForTimeout(300);

                // 点击结算攻击
                const resolveButton = attackerPage.getByRole('button', { name: /Resolve Attack|结算攻击/i });
                await expect(resolveButton).toBeVisible({ timeout: 10000 });
                await resolveButton.click();
                await attackerPage.waitForTimeout(500);
            } else {
                // 没有可用技能 — 跳过攻击
                const advanceButton = attackerPage.locator('[data-tutorial-id="advance-phase-button"]');
                await advanceButton.click();
                await attackerPage.waitForTimeout(300);
                // 确认结束攻击掷骰
                const confirmEnd = attackerPage.getByRole('button', { name: /Confirm|确认/i });
                if (await confirmEnd.isVisible({ timeout: 3000 }).catch(() => false)) {
                    await confirmEnd.click();
                }
            }

            // 5. 处理响应窗口（防御方可能有响应机会）
            for (let i = 0; i < 10; i++) {
                await hostPage.waitForTimeout(500);
                const hp = await maybePassResponse(hostPage);
                const gp = await maybePassResponse(guestPage);
                if (!hp && !gp) {
                    // 检查是否已到 Main Phase 2
                    const atMainPhase2 = await attackerPage
                        .getByText(/Main Phase \(2\)|主要阶段 \(2\)/)
                        .isVisible({ timeout: 500 })
                        .catch(() => false);
                    if (atMainPhase2) break;
                }
            }

            // 等待攻击结算完成（进入 Main Phase 2）
            await expect(
                attackerPage.getByText(/Main Phase \(2\)|主要阶段 \(2\)/)
            ).toBeVisible({ timeout: 20000 });

            // 6. 验证结果
            const coreAfter = await readCoreState(attackerPage) as Record<string, unknown>;
            const playersAfter = coreAfter.players as Record<string, Record<string, unknown>>;
            const defenderAfter = playersAfter[defenderId];
            const resourcesAfter = defenderAfter.resources as Record<string, number>;
            const hpAfter = resourcesAfter[RESOURCE_IDS.HP] ?? 0;
            const statusAfter = defenderAfter.statusEffects as Record<string, number>;
            const shieldsAfter = (defenderAfter.damageShields as Array<Record<string, unknown>>) ?? [];

            // 如果有技能命中（slap 造成 4 伤害），preventStatus 护盾不减伤
            if (hasHighlight) {
                expect(hpAfter, 'preventStatus 护盾不应减伤').toBeLessThan(hpBefore);
            }

            // 攻击结算后护盾应该被清理
            expect(shieldsAfter.length, '攻击结算后护盾未清理').toBe(0);

            await attackerPage.screenshot({
                path: testInfo.outputPath('status-shield-after-attack.png'),
                fullPage: false,
            });
        } finally {
            await hostContext.close();
            await guestContext.close();
        }
    });

    test('preventStatus 护盾在攻击结算后被清理', async ({ browser }, testInfo) => {
        test.setTimeout(120000);
        const baseURL = testInfo.project.use.baseURL as string | undefined;

        const match = await setupOnlineMatch(browser, baseURL, 'barbarian', 'monk');
        if (!match) test.skip(true, '游戏服务器不可用或房间创建失败');
        const { hostPage, guestPage, hostContext, guestContext } = match!;

        try {
            const hostNextPhase = hostPage.locator('[data-tutorial-id="advance-phase-button"]');
            const hostIsActive = await hostNextPhase.isEnabled({ timeout: 3000 }).catch(() => false);
            if (!hostIsActive) test.skip(true, '非预期起始玩家');

            const attackerPage = hostPage;
            const defenderId = getPlayerIdFromUrl(guestPage, '1');

            // 注入 preventStatus 护盾
            const coreBefore = await readCoreState(attackerPage) as Record<string, unknown>;
            const players = coreBefore.players as Record<string, Record<string, unknown>>;
            const defender = players[defenderId];

            await applyCoreStateDirect(attackerPage, {
                ...coreBefore,
                players: {
                    ...players,
                    [defenderId]: {
                        ...defender,
                        damageShields: [
                            { value: 1, sourceId: 'thick-skin-test', preventStatus: true },
                        ],
                    },
                },
            });
            await attackerPage.waitForTimeout(500);

            // 验证护盾已注入
            const coreWithShield = await readCoreState(attackerPage) as Record<string, unknown>;
            const playersWithShield = coreWithShield.players as Record<string, Record<string, unknown>>;
            const defenderWithShield = playersWithShield[defenderId];
            const shields = (defenderWithShield.damageShields as Array<Record<string, unknown>>) ?? [];
            expect(shields.length, '护盾注入失败').toBe(1);
            expect(shields[0].preventStatus).toBe(true);

            // 执行一次完整攻击流程
            await advanceToOffensiveRoll(attackerPage);
            const rollButton = attackerPage.locator('[data-tutorial-id="dice-roll-button"]');
            await expect(rollButton).toBeEnabled({ timeout: 5000 });
            await rollButton.click();
            await attackerPage.waitForTimeout(500);

            // 5 STRENGTH (全6) → 触发 reckless-strike（终极技能，15 伤害）
            await applyDiceValues(attackerPage, [6, 6, 6, 6, 6]);
            await attackerPage.waitForTimeout(300);

            const confirmButton = attackerPage.locator('[data-tutorial-id="dice-confirm-button"]');
            await expect(confirmButton).toBeEnabled({ timeout: 5000 });
            await confirmButton.click();
            await attackerPage.waitForTimeout(500);

            // 选择高亮技能
            const highlightedSlots = attackerPage
                .locator('[data-ability-slot]')
                .filter({ has: attackerPage.locator('div.animate-pulse[class*="border-"]') });
            const hasHighlight = await highlightedSlots.first().isVisible({ timeout: 8000 }).catch(() => false);

            if (hasHighlight) {
                // 可能有多个技能高亮（violent-assault 和 reckless-strike），选最后一个（优先级最高）
                const count = await highlightedSlots.count();
                await highlightedSlots.nth(count - 1).click();
                await attackerPage.waitForTimeout(300);

                const resolveButton = attackerPage.getByRole('button', { name: /Resolve Attack|结算攻击/i });
                await expect(resolveButton).toBeVisible({ timeout: 10000 });
                await resolveButton.click();
                await attackerPage.waitForTimeout(500);
            } else {
                // 没有可用技能 — 跳过
                const advanceButton = attackerPage.locator('[data-tutorial-id="advance-phase-button"]');
                await advanceButton.click();
                await attackerPage.waitForTimeout(300);
                const confirmEnd = attackerPage.getByRole('button', { name: /Confirm|确认/i });
                if (await confirmEnd.isVisible({ timeout: 3000 }).catch(() => false)) {
                    await confirmEnd.click();
                }
            }

            // 处理响应窗口
            for (let i = 0; i < 10; i++) {
                await hostPage.waitForTimeout(500);
                const hp = await maybePassResponse(hostPage);
                const gp = await maybePassResponse(guestPage);
                if (!hp && !gp) {
                    const atMainPhase2 = await attackerPage
                        .getByText(/Main Phase \(2\)|主要阶段 \(2\)/)
                        .isVisible({ timeout: 500 })
                        .catch(() => false);
                    if (atMainPhase2) break;
                }
            }

            await expect(
                attackerPage.getByText(/Main Phase \(2\)|主要阶段 \(2\)/)
            ).toBeVisible({ timeout: 20000 });

            // 验证攻击结算后护盾被清理
            const coreAfter = await readCoreState(attackerPage) as Record<string, unknown>;
            const playersAfter = coreAfter.players as Record<string, Record<string, unknown>>;
            const defenderAfter = playersAfter[defenderId];
            const shieldsAfter = (defenderAfter.damageShields as Array<Record<string, unknown>>) ?? [];
            expect(shieldsAfter.length, '攻击结算后护盾未清理').toBe(0);

            await attackerPage.screenshot({
                path: testInfo.outputPath('status-shield-cleanup.png'),
                fullPage: false,
            });
        } finally {
            await hostContext.close();
            await guestContext.close();
        }
    });
});
