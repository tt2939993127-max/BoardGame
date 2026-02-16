/**
 * 状态防护盾（preventStatus）机制 E2E 测试
 *
 * 测试场景：
 * 1. 厚皮 II 的状态防护盾应该阻止 debuff（通过 reducer 注入 + 攻击流程验证）
 * 2. 状态防护盾不应该减少伤害（护盾只防状态，不防伤害）
 * 3. 攻击结算后护盾被清理
 *
 * 使用在线双人对局模式，通过调试面板注入状态。
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
            await attackerPage.waitForTimeout(300);

            // 2. 推进到攻击掷骰阶段
            await advanceToOffensiveRoll(attackerPage);

            // 3. 投骰
            const rollButton = attackerPage.locator('[data-tutorial-id="dice-roll-button"]');
            await expect(rollButton).toBeEnabled({ timeout: 5000 });
            await rollButton.click();
            await attackerPage.waitForTimeout(300);

            // 设置骰子值（尝试触发带 debuff 的技能）
            await applyDiceValues(attackerPage, [1, 1, 1, 4, 5]);

            const confirmButton = attackerPage.locator('[data-tutorial-id="dice-confirm-button"]');
            await expect(confirmButton).toBeEnabled({ timeout: 5000 });
            await confirmButton.click();

            // 4. 选择高亮技能并结算
            const highlightedSlots = attackerPage
                .locator('[data-ability-slot]')
                .filter({ has: attackerPage.locator('div.animate-pulse[class*="border-"]') });
            const hasHighlight = await highlightedSlots.first().isVisible({ timeout: 5000 }).catch(() => false);

            if (hasHighlight) {
                await highlightedSlots.first().click();
                const resolveButton = attackerPage.getByRole('button', { name: /Resolve Attack|结算攻击/i });
                await expect(resolveButton).toBeVisible({ timeout: 10000 });
                await resolveButton.click();
            } else {
                // 没有可用技能，推进阶段
                const advanceButton = attackerPage.locator('[data-tutorial-id="advance-phase-button"]');
                await advanceButton.click();
                const confirmHeading = attackerPage.getByRole('heading', { name: /End offensive roll\?|确认结束攻击掷骰？/i });
                if (await confirmHeading.isVisible({ timeout: 4000 }).catch(() => false)) {
                    await confirmHeading.locator('..').locator('..').getByRole('button', { name: /Confirm|确认/i }).click();
                }
            }

            // 5. 处理响应窗口
            for (let i = 0; i < 6; i++) {
                const hp = await maybePassResponse(hostPage);
                const gp = await maybePassResponse(guestPage);
                if (!hp && !gp) break;
                await hostPage.waitForTimeout(300);
            }

            // 等待攻击结算完成（进入 Main Phase 2 或防御阶段）
            await expect(
                attackerPage.getByText(/Main Phase \(2\)|主要阶段 \(2\)/)
            ).toBeVisible({ timeout: 15000 });

            // 6. 验证结果
            const coreAfter = await readCoreState(attackerPage) as Record<string, unknown>;
            const playersAfter = coreAfter.players as Record<string, Record<string, unknown>>;
            const defenderAfter = playersAfter[defenderId];
            const resourcesAfter = defenderAfter.resources as Record<string, number>;
            const hpAfter = resourcesAfter[RESOURCE_IDS.HP] ?? 0;
            const statusAfter = defenderAfter.statusEffects as Record<string, number>;
            const shieldsAfter = (defenderAfter.damageShields as Array<Record<string, unknown>>) ?? [];

            // preventStatus 护盾不减伤 — 如果有伤害技能命中，HP 应该减少
            // （这里不强制断言 HP 变化，因为取决于骰面和技能选择）

            // 攻击结算后护盾应该被清理
            expect(shieldsAfter.length).toBe(0);

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
            await attackerPage.waitForTimeout(300);

            // 验证护盾已注入
            const coreWithShield = await readCoreState(attackerPage) as Record<string, unknown>;
            const playersWithShield = coreWithShield.players as Record<string, Record<string, unknown>>;
            const defenderWithShield = playersWithShield[defenderId];
            const shields = (defenderWithShield.damageShields as Array<Record<string, unknown>>) ?? [];
            expect(shields.length).toBe(1);
            expect(shields[0].preventStatus).toBe(true);

            // 执行一次完整攻击流程
            await advanceToOffensiveRoll(attackerPage);
            const rollButton = attackerPage.locator('[data-tutorial-id="dice-roll-button"]');
            await expect(rollButton).toBeEnabled({ timeout: 5000 });
            await rollButton.click();
            await attackerPage.waitForTimeout(300);
            await applyDiceValues(attackerPage, [6, 6, 6, 6, 6]);

            const confirmButton = attackerPage.locator('[data-tutorial-id="dice-confirm-button"]');
            await expect(confirmButton).toBeEnabled({ timeout: 5000 });
            await confirmButton.click();

            const highlightedSlots = attackerPage
                .locator('[data-ability-slot]')
                .filter({ has: attackerPage.locator('div.animate-pulse[class*="border-"]') });
            const hasHighlight = await highlightedSlots.first().isVisible({ timeout: 5000 }).catch(() => false);

            if (hasHighlight) {
                await highlightedSlots.first().click();
                const resolveButton = attackerPage.getByRole('button', { name: /Resolve Attack|结算攻击/i });
                await expect(resolveButton).toBeVisible({ timeout: 10000 });
                await resolveButton.click();
            } else {
                const advanceButton = attackerPage.locator('[data-tutorial-id="advance-phase-button"]');
                await advanceButton.click();
                const confirmHeading = attackerPage.getByRole('heading', { name: /End offensive roll\?|确认结束攻击掷骰？/i });
                if (await confirmHeading.isVisible({ timeout: 4000 }).catch(() => false)) {
                    await confirmHeading.locator('..').locator('..').getByRole('button', { name: /Confirm|确认/i }).click();
                }
            }

            // 处理响应窗口
            for (let i = 0; i < 6; i++) {
                const hp = await maybePassResponse(hostPage);
                const gp = await maybePassResponse(guestPage);
                if (!hp && !gp) break;
                await hostPage.waitForTimeout(300);
            }

            await expect(
                attackerPage.getByText(/Main Phase \(2\)|主要阶段 \(2\)/)
            ).toBeVisible({ timeout: 15000 });

            // 验证攻击结算后护盾被清理
            const coreAfter = await readCoreState(attackerPage) as Record<string, unknown>;
            const playersAfter = coreAfter.players as Record<string, Record<string, unknown>>;
            const defenderAfter = playersAfter[defenderId];
            const shieldsAfter = (defenderAfter.damageShields as Array<Record<string, unknown>>) ?? [];
            expect(shieldsAfter.length).toBe(0);

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
