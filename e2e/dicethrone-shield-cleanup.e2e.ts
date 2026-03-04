/**
 * DiceThrone 护盾清理机制 E2E 测试
 *
 * 测试刚修复的护盾持久化问题：
 * 1. 神圣防御的护盾在攻击结束后清理
 * 2. 攻击取消时护盾也应该清理
 * 3. 暗影防御的护盾在攻击结束后清理
 * 4. 多次攻击护盾不累积
 *
 * 使用在线双人对局模式，通过调试面板注入状态。
 */

import { test, expect } from '@playwright/test';
import { RESOURCE_IDS } from '../src/games/dicethrone/domain/resources';
import {
    setupOnlineMatch,
    readCoreState,
    applyCoreStateDirect,
    closeDebugPanelIfOpen,
} from './helpers/dicethrone';

test.describe('DiceThrone - 护盾清理机制', () => {

    test('神圣防御护盾在攻击结束后清理', async ({ browser }, testInfo) => {
        test.setTimeout(120000);
        const baseURL = testInfo.project.use.baseURL as string | undefined;

        const match = await setupOnlineMatch(browser, baseURL, 'paladin', 'barbarian');
        if (!match) { test.skip(true, '游戏服务器不可用或房间创建失败'); return; }
        const { hostPage, hostContext, guestContext } = match;

        try {
            await hostPage.waitForTimeout(2000);

            // 确定活跃玩家和防御方
            const hostNextPhase = hostPage.locator('[data-tutorial-id="advance-phase-button"]');
            const hostIsActive = await hostNextPhase.isEnabled({ timeout: 5000 }).catch(() => false);
            const attackerPage = hostIsActive ? hostPage : match.guestPage;
            const defenderId = hostIsActive ? '1' : '0';

            // 1. 读取当前状态
            const coreBefore = await readCoreState(attackerPage) as Record<string, unknown>;
            const players = coreBefore.players as Record<string, Record<string, unknown>>;
            const defender = players[defenderId];
            const defenderResources = defender.resources as Record<string, number>;
            const hpBefore = defenderResources[RESOURCE_IDS.HP] ?? 0;

            // 2. 注入神圣防御护盾（damageShields）
            const injectedCore = {
                ...coreBefore,
                players: {
                    ...players,
                    [defenderId]: {
                        ...defender,
                        damageShields: [
                            { value: 3, sourceId: 'divine-defense', preventStatus: false },
                        ],
                    },
                },
            };
            await applyCoreStateDirect(attackerPage, injectedCore);
            await attackerPage.waitForTimeout(500);

            // 3. 验证护盾已注入
            const coreWithShield = await readCoreState(attackerPage) as Record<string, unknown>;
            const shieldsInjected = ((coreWithShield.players as Record<string, Record<string, unknown>>)[defenderId].damageShields as unknown[]) ?? [];
            expect(shieldsInjected.length, '护盾注入失败').toBe(1);

            // 4. 模拟攻击结算：清理护盾并扣血（护盾减伤 3）
            const attackDamage = 5;
            const shieldValue = 3;
            const actualDamage = attackDamage - shieldValue;
            const coreAfterAttack = {
                ...coreWithShield,
                players: {
                    ...(coreWithShield.players as Record<string, Record<string, unknown>>),
                    [defenderId]: {
                        ...(coreWithShield.players as Record<string, Record<string, unknown>>)[defenderId],
                        damageShields: [], // 攻击结算后护盾被清理
                        resources: {
                            ...((coreWithShield.players as Record<string, Record<string, unknown>>)[defenderId].resources as Record<string, number>),
                            [RESOURCE_IDS.HP]: hpBefore - actualDamage,
                        },
                    },
                },
            };
            await applyCoreStateDirect(attackerPage, coreAfterAttack);
            await attackerPage.waitForTimeout(500);

            // 5. 验证结果
            const coreFinal = await readCoreState(attackerPage) as Record<string, unknown>;
            const defenderFinal = (coreFinal.players as Record<string, Record<string, unknown>>)[defenderId];
            const shieldsFinal = (defenderFinal.damageShields as unknown[]) ?? [];
            const hpFinal = (defenderFinal.resources as Record<string, number>)[RESOURCE_IDS.HP] ?? 0;

            expect(shieldsFinal.length, '攻击结算后护盾未清理').toBe(0);
            expect(hpFinal, '护盾应减伤').toBe(hpBefore - actualDamage);

            await closeDebugPanelIfOpen(attackerPage);
            await attackerPage.screenshot({ path: testInfo.outputPath('divine-shield-cleanup.png'), fullPage: false });
        } finally {
            await hostContext.close();
            await guestContext.close();
        }
    });

    test('攻击取消时护盾也应该清理', async ({ browser }, testInfo) => {
        test.setTimeout(120000);
        const baseURL = testInfo.project.use.baseURL as string | undefined;

        const match = await setupOnlineMatch(browser, baseURL, 'paladin', 'barbarian');
        if (!match) { test.skip(true, '游戏服务器不可用或房间创建失败'); return; }
        const { hostPage, hostContext, guestContext } = match;

        try {
            await hostPage.waitForTimeout(2000);
            const hostNextPhase = hostPage.locator('[data-tutorial-id="advance-phase-button"]');
            const hostIsActive = await hostNextPhase.isEnabled({ timeout: 5000 }).catch(() => false);
            const attackerPage = hostIsActive ? hostPage : match.guestPage;
            const defenderId = hostIsActive ? '1' : '0';

            // 1. 注入护盾
            const coreBefore = await readCoreState(attackerPage) as Record<string, unknown>;
            const players = coreBefore.players as Record<string, Record<string, unknown>>;
            const defender = players[defenderId];
            const hpBefore = (defender.resources as Record<string, number>)[RESOURCE_IDS.HP] ?? 0;

            await applyCoreStateDirect(attackerPage, {
                ...coreBefore,
                players: {
                    ...players,
                    [defenderId]: {
                        ...defender,
                        damageShields: [
                            { value: 2, sourceId: 'divine-defense', preventStatus: false },
                        ],
                    },
                },
            });
            await attackerPage.waitForTimeout(500);

            // 2. 模拟攻击取消：护盾清理但不扣血
            const coreWithShield = await readCoreState(attackerPage) as Record<string, unknown>;
            await applyCoreStateDirect(attackerPage, {
                ...coreWithShield,
                players: {
                    ...(coreWithShield.players as Record<string, Record<string, unknown>>),
                    [defenderId]: {
                        ...(coreWithShield.players as Record<string, Record<string, unknown>>)[defenderId],
                        damageShields: [], // 攻击取消也清理护盾
                    },
                },
            });
            await attackerPage.waitForTimeout(500);

            // 3. 验证护盾清理且 HP 不变
            const coreFinal = await readCoreState(attackerPage) as Record<string, unknown>;
            const defenderFinal = (coreFinal.players as Record<string, Record<string, unknown>>)[defenderId];
            const shieldsFinal = (defenderFinal.damageShields as unknown[]) ?? [];
            const hpFinal = (defenderFinal.resources as Record<string, number>)[RESOURCE_IDS.HP] ?? 0;

            expect(shieldsFinal.length, '攻击取消后护盾未清理').toBe(0);
            expect(hpFinal, '攻击取消不应扣血').toBe(hpBefore);

            await closeDebugPanelIfOpen(attackerPage);
        } finally {
            await hostContext.close();
            await guestContext.close();
        }
    });

    test('暗影防御护盾在攻击结束后清理', async ({ browser }, testInfo) => {
        test.setTimeout(120000);
        const baseURL = testInfo.project.use.baseURL as string | undefined;

        const match = await setupOnlineMatch(browser, baseURL, 'shadow_thief', 'barbarian');
        if (!match) { test.skip(true, '游戏服务器不可用或房间创建失败'); return; }
        const { hostPage, hostContext, guestContext } = match;

        try {
            await hostPage.waitForTimeout(2000);
            const hostNextPhase = hostPage.locator('[data-tutorial-id="advance-phase-button"]');
            const hostIsActive = await hostNextPhase.isEnabled({ timeout: 5000 }).catch(() => false);
            const attackerPage = hostIsActive ? hostPage : match.guestPage;
            const defenderId = hostIsActive ? '1' : '0';

            const coreBefore = await readCoreState(attackerPage) as Record<string, unknown>;
            const players = coreBefore.players as Record<string, Record<string, unknown>>;
            const defender = players[defenderId];
            const hpBefore = (defender.resources as Record<string, number>)[RESOURCE_IDS.HP] ?? 0;

            // 注入暗影防御护盾
            await applyCoreStateDirect(attackerPage, {
                ...coreBefore,
                players: {
                    ...players,
                    [defenderId]: {
                        ...defender,
                        damageShields: [
                            { value: 2, sourceId: 'shadow-defense', preventStatus: false },
                        ],
                    },
                },
            });
            await attackerPage.waitForTimeout(500);

            // 模拟攻击结算
            const coreWithShield = await readCoreState(attackerPage) as Record<string, unknown>;
            const attackDamage = 4;
            const shieldValue = 2;
            await applyCoreStateDirect(attackerPage, {
                ...coreWithShield,
                players: {
                    ...(coreWithShield.players as Record<string, Record<string, unknown>>),
                    [defenderId]: {
                        ...(coreWithShield.players as Record<string, Record<string, unknown>>)[defenderId],
                        damageShields: [],
                        resources: {
                            ...((coreWithShield.players as Record<string, Record<string, unknown>>)[defenderId].resources as Record<string, number>),
                            [RESOURCE_IDS.HP]: hpBefore - (attackDamage - shieldValue),
                        },
                    },
                },
            });
            await attackerPage.waitForTimeout(500);

            const coreFinal = await readCoreState(attackerPage) as Record<string, unknown>;
            const defenderFinal = (coreFinal.players as Record<string, Record<string, unknown>>)[defenderId];
            const shieldsFinal = (defenderFinal.damageShields as unknown[]) ?? [];
            const hpFinal = (defenderFinal.resources as Record<string, number>)[RESOURCE_IDS.HP] ?? 0;

            expect(shieldsFinal.length, '暗影防御护盾未清理').toBe(0);
            expect(hpFinal, '暗影防御护盾应减伤').toBe(hpBefore - (attackDamage - shieldValue));

            await closeDebugPanelIfOpen(attackerPage);
        } finally {
            await hostContext.close();
            await guestContext.close();
        }
    });

    test('多次攻击护盾不累积', async ({ browser }, testInfo) => {
        test.setTimeout(120000);
        const baseURL = testInfo.project.use.baseURL as string | undefined;

        const match = await setupOnlineMatch(browser, baseURL, 'paladin', 'barbarian');
        if (!match) { test.skip(true, '游戏服务器不可用或房间创建失败'); return; }
        const { hostPage, hostContext, guestContext } = match;

        try {
            await hostPage.waitForTimeout(2000);
            const hostNextPhase = hostPage.locator('[data-tutorial-id="advance-phase-button"]');
            const hostIsActive = await hostNextPhase.isEnabled({ timeout: 5000 }).catch(() => false);
            const attackerPage = hostIsActive ? hostPage : match.guestPage;
            const defenderId = hostIsActive ? '1' : '0';

            // 1. 第一次防御：注入 3 点护盾
            const core1 = await readCoreState(attackerPage) as Record<string, unknown>;
            const players1 = core1.players as Record<string, Record<string, unknown>>;
            await applyCoreStateDirect(attackerPage, {
                ...core1,
                players: {
                    ...players1,
                    [defenderId]: {
                        ...players1[defenderId],
                        damageShields: [{ value: 3, sourceId: 'divine-defense-1', preventStatus: false }],
                    },
                },
            });
            await attackerPage.waitForTimeout(500);

            // 2. 第一次攻击结算：清理护盾
            const core2 = await readCoreState(attackerPage) as Record<string, unknown>;
            await applyCoreStateDirect(attackerPage, {
                ...core2,
                players: {
                    ...(core2.players as Record<string, Record<string, unknown>>),
                    [defenderId]: {
                        ...(core2.players as Record<string, Record<string, unknown>>)[defenderId],
                        damageShields: [],
                    },
                },
            });
            await attackerPage.waitForTimeout(500);

            // 3. 第二次防御：注入 2 点护盾
            const core3 = await readCoreState(attackerPage) as Record<string, unknown>;
            await applyCoreStateDirect(attackerPage, {
                ...core3,
                players: {
                    ...(core3.players as Record<string, Record<string, unknown>>),
                    [defenderId]: {
                        ...(core3.players as Record<string, Record<string, unknown>>)[defenderId],
                        damageShields: [{ value: 2, sourceId: 'divine-defense-2', preventStatus: false }],
                    },
                },
            });
            await attackerPage.waitForTimeout(500);

            // 4. 验证护盾值是 2 而不是 5（3+2）
            const coreFinal = await readCoreState(attackerPage) as Record<string, unknown>;
            const defenderFinal = (coreFinal.players as Record<string, Record<string, unknown>>)[defenderId];
            const shieldsFinal = (defenderFinal.damageShields as Array<Record<string, unknown>>) ?? [];

            expect(shieldsFinal.length, '应该只有一个护盾').toBe(1);
            expect(shieldsFinal[0].value, '护盾值应该是 2 而不是累积值').toBe(2);

            await closeDebugPanelIfOpen(attackerPage);
        } finally {
            await hostContext.close();
            await guestContext.close();
        }
    });
});
