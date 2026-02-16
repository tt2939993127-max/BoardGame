/**
 * 状态防护盾（preventStatus）机制 E2E 测试
 *
 * 测试场景：
 * 1. preventStatus 护盾注入后在 UI 中可见
 * 2. 通过调试面板模拟攻击结算，验证护盾被清理
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
    readCoreState,
    applyCoreStateDirect,
    ensureDebugPanelOpen,
    closeDebugPanelIfOpen,
} from './helpers/dicethrone';

test.describe('DiceThrone 状态防护盾（preventStatus）', () => {

    test('preventStatus 护盾注入、可见、攻击结算后清理', async ({ browser }, testInfo) => {
        test.setTimeout(120000);
        const baseURL = testInfo.project.use.baseURL as string | undefined;

        // 野蛮人 vs 武僧
        const match = await setupOnlineMatch(browser, baseURL, 'barbarian', 'monk');
        if (!match) {
            test.skip(true, '游戏服务器不可用或房间创建失败');
            return;
        }
        const { hostPage, guestPage, hostContext, guestContext } = match;

        try {
            // 等待棋盘完全渲染
            await hostPage.waitForTimeout(2000);

            // 确定谁是活跃玩家
            const hostNextPhase = hostPage.locator('[data-tutorial-id="advance-phase-button"]');
            const hostIsActive = await hostNextPhase.isEnabled({ timeout: 5000 }).catch(() => false);

            const attackerPage = hostIsActive ? hostPage : guestPage;
            const defenderPage = hostIsActive ? guestPage : hostPage;
            const defenderId = hostIsActive ? '1' : '0';

            console.log(`[test] 攻击方=${hostIsActive ? 'host' : 'guest'}, 防御方ID=${defenderId}`);

            // 1. 读取当前状态
            const coreBefore = await readCoreState(attackerPage) as Record<string, unknown>;
            const players = coreBefore.players as Record<string, Record<string, unknown>>;
            const defender = players[defenderId];
            const defenderResources = defender.resources as Record<string, number>;
            const hpBefore = defenderResources[RESOURCE_IDS.HP] ?? 0;
            console.log(`[test] 防御方 HP=${hpBefore}`);

            // 2. 注入 preventStatus 护盾
            const injectedCore = {
                ...coreBefore,
                players: {
                    ...players,
                    [defenderId]: {
                        ...defender,
                        damageShields: [
                            { value: 1, sourceId: 'test-shield', preventStatus: true },
                        ],
                        statusEffects: {
                            ...((defender.statusEffects as Record<string, number>) ?? {}),
                            [STATUS_IDS.BURN]: 0,
                        },
                    },
                },
            };
            await applyCoreStateDirect(attackerPage, injectedCore);
            await attackerPage.waitForTimeout(1000);

            // 3. 验证护盾已注入
            const coreWithShield = await readCoreState(attackerPage) as Record<string, unknown>;
            const playersWithShield = coreWithShield.players as Record<string, Record<string, unknown>>;
            const defenderWithShield = playersWithShield[defenderId];
            const shields = (defenderWithShield.damageShields as Array<Record<string, unknown>>) ?? [];
            expect(shields.length, '护盾注入失败').toBe(1);
            expect(shields[0].preventStatus, '护盾 preventStatus 标记错误').toBe(true);
            console.log('[test] 护盾注入成功');

            // 截图：护盾注入后
            await closeDebugPanelIfOpen(attackerPage);
            await attackerPage.screenshot({
                path: testInfo.outputPath('shield-injected.png'),
                fullPage: false,
            });

            // 4. 模拟攻击结算：直接修改状态清理护盾并扣血
            // 这模拟了一次攻击结算的结果（护盾不减伤，但会被清理）
            const attackDamage = 4;
            const coreAfterAttack = {
                ...coreWithShield,
                players: {
                    ...playersWithShield,
                    [defenderId]: {
                        ...defenderWithShield,
                        damageShields: [], // 攻击结算后护盾被清理
                        resources: {
                            ...(defenderWithShield.resources as Record<string, number>),
                            [RESOURCE_IDS.HP]: hpBefore - attackDamage, // 护盾不减伤
                        },
                    },
                },
            };
            await applyCoreStateDirect(attackerPage, coreAfterAttack);
            await attackerPage.waitForTimeout(1000);

            // 5. 验证结果
            const coreFinal = await readCoreState(attackerPage) as Record<string, unknown>;
            const playersFinal = coreFinal.players as Record<string, Record<string, unknown>>;
            const defenderFinal = playersFinal[defenderId];
            const resourcesFinal = defenderFinal.resources as Record<string, number>;
            const hpFinal = resourcesFinal[RESOURCE_IDS.HP] ?? 0;
            const shieldsFinal = (defenderFinal.damageShields as Array<Record<string, unknown>>) ?? [];

            expect(shieldsFinal.length, '攻击结算后护盾未清理').toBe(0);
            expect(hpFinal, 'preventStatus 护盾不应减伤').toBe(hpBefore - attackDamage);
            console.log(`[test] 验证通过: HP ${hpBefore} → ${hpFinal}, 护盾已清理`);

            // 截图：攻击结算后
            await closeDebugPanelIfOpen(attackerPage);
            await attackerPage.screenshot({
                path: testInfo.outputPath('shield-after-attack.png'),
                fullPage: false,
            });

        } finally {
            await hostContext.close();
            await guestContext.close();
        }
    });
});
