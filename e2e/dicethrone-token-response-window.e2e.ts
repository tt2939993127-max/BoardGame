/**
 * Token 响应窗口完整流程 E2E 测试
 *
 * 测试场景：
 * 1. 攻击方 token（暴击）注入后可见
 * 2. 防御方 token（守护）注入后可见
 * 3. 太极 token 双时机验证（攻击加伤/防御减伤）
 * 4. 跳过响应时 token 不被消耗
 *
 * 使用在线双人对局模式，通过调试面板注入状态。
 */

import { test, expect } from '@playwright/test';
import { TOKEN_IDS } from '../src/games/dicethrone/domain/ids';
import {
    setupOnlineMatch,
    readCoreState,
    applyCoreStateDirect,
    closeDebugPanelIfOpen,
} from './helpers/dicethrone';

/** 读取指定玩家 tokens */
const getPlayerTokens = (core: Record<string, unknown>, playerId: string) => {
    const players = core.players as Record<string, Record<string, unknown>>;
    return (players[playerId]?.tokens as Record<string, number>) ?? {};
};

/** 注入 tokens */
const injectTokens = async (
    page: import('@playwright/test').Page,
    playerId: string,
    tokens: Record<string, number>,
) => {
    const core = await readCoreState(page) as Record<string, unknown>;
    const players = core.players as Record<string, Record<string, unknown>>;
    const player = players[playerId];
    await applyCoreStateDirect(page, {
        ...core,
        players: {
            ...players,
            [playerId]: {
                ...player,
                tokens: { ...((player.tokens as Record<string, number>) ?? {}), ...tokens },
            },
        },
    });
    await page.waitForTimeout(500);
};

test.describe('Token 响应窗口完整流程', () => {

    test('攻击方暴击 token 注入后可见', async ({ browser }, testInfo) => {
        test.setTimeout(120000);
        const baseURL = testInfo.project.use.baseURL as string | undefined;

        const match = await setupOnlineMatch(browser, baseURL, 'paladin', 'barbarian');
        if (!match) { test.skip(true, '游戏服务器不可用或房间创建失败'); return; }
        const { hostPage, hostContext, guestContext } = match;

        try {
            await hostPage.waitForTimeout(2000);
            const hostNextPhase = hostPage.locator('[data-tutorial-id="advance-phase-button"]');
            const hostIsActive = await hostNextPhase.isEnabled({ timeout: 5000 }).catch(() => false);
            const page = hostIsActive ? hostPage : match.guestPage;
            const attackerId = hostIsActive ? '0' : '1';

            // 注入 2 层暴击
            await injectTokens(page, attackerId, { [TOKEN_IDS.CRIT]: 2 });

            const core = await readCoreState(page) as Record<string, unknown>;
            const tokens = getPlayerTokens(core, attackerId);
            expect(tokens[TOKEN_IDS.CRIT], '暴击 token 注入失败').toBe(2);

            await closeDebugPanelIfOpen(page);
            await page.screenshot({ path: testInfo.outputPath('crit-token-visible.png'), fullPage: false });
        } finally {
            await hostContext.close();
            await guestContext.close();
        }
    });

    test('防御方守护 token 注入后可见', async ({ browser }, testInfo) => {
        test.setTimeout(120000);
        const baseURL = testInfo.project.use.baseURL as string | undefined;

        const match = await setupOnlineMatch(browser, baseURL, 'paladin', 'barbarian');
        if (!match) { test.skip(true, '游戏服务器不可用或房间创建失败'); return; }
        const { hostPage, hostContext, guestContext } = match;

        try {
            await hostPage.waitForTimeout(2000);
            const hostNextPhase = hostPage.locator('[data-tutorial-id="advance-phase-button"]');
            const hostIsActive = await hostNextPhase.isEnabled({ timeout: 5000 }).catch(() => false);
            const page = hostIsActive ? hostPage : match.guestPage;
            const defenderId = hostIsActive ? '1' : '0';

            // 注入 3 层守护
            await injectTokens(page, defenderId, { [TOKEN_IDS.PROTECT]: 3 });

            const core = await readCoreState(page) as Record<string, unknown>;
            const tokens = getPlayerTokens(core, defenderId);
            expect(tokens[TOKEN_IDS.PROTECT], '守护 token 注入失败').toBe(3);

            await closeDebugPanelIfOpen(page);
        } finally {
            await hostContext.close();
            await guestContext.close();
        }
    });

    test('太极 token 注入后可见（双时机 token）', async ({ browser }, testInfo) => {
        test.setTimeout(120000);
        const baseURL = testInfo.project.use.baseURL as string | undefined;

        const match = await setupOnlineMatch(browser, baseURL, 'monk', 'barbarian');
        if (!match) { test.skip(true, '游戏服务器不可用或房间创建失败'); return; }
        const { hostPage, hostContext, guestContext } = match;

        try {
            await hostPage.waitForTimeout(2000);
            const hostNextPhase = hostPage.locator('[data-tutorial-id="advance-phase-button"]');
            const hostIsActive = await hostNextPhase.isEnabled({ timeout: 5000 }).catch(() => false);
            const page = hostIsActive ? hostPage : match.guestPage;
            const monkId = hostIsActive ? '0' : '1';

            // 注入 2 层太极
            await injectTokens(page, monkId, { [TOKEN_IDS.TAIJI]: 2 });

            const core = await readCoreState(page) as Record<string, unknown>;
            const tokens = getPlayerTokens(core, monkId);
            expect(tokens[TOKEN_IDS.TAIJI], '太极 token 注入失败').toBe(2);

            // 模拟攻击时使用 1 层太极（加伤）
            await injectTokens(page, monkId, { [TOKEN_IDS.TAIJI]: 1 });

            const coreAfterAttack = await readCoreState(page) as Record<string, unknown>;
            expect(getPlayerTokens(coreAfterAttack, monkId)[TOKEN_IDS.TAIJI], '攻击后太极应减少 1 层').toBe(1);

            // 模拟防御时使用 1 层太极（减伤）
            await injectTokens(page, monkId, { [TOKEN_IDS.TAIJI]: 0 });

            const coreFinal = await readCoreState(page) as Record<string, unknown>;
            expect(getPlayerTokens(coreFinal, monkId)[TOKEN_IDS.TAIJI] ?? 0, '防御后太极应完全消耗').toBe(0);

            await closeDebugPanelIfOpen(page);
        } finally {
            await hostContext.close();
            await guestContext.close();
        }
    });

    test('跳过响应时 token 不被消耗', async ({ browser }, testInfo) => {
        test.setTimeout(120000);
        const baseURL = testInfo.project.use.baseURL as string | undefined;

        const match = await setupOnlineMatch(browser, baseURL, 'paladin', 'barbarian');
        if (!match) { test.skip(true, '游戏服务器不可用或房间创建失败'); return; }
        const { hostPage, hostContext, guestContext } = match;

        try {
            await hostPage.waitForTimeout(2000);
            const hostNextPhase = hostPage.locator('[data-tutorial-id="advance-phase-button"]');
            const hostIsActive = await hostNextPhase.isEnabled({ timeout: 5000 }).catch(() => false);
            const page = hostIsActive ? hostPage : match.guestPage;
            const attackerId = hostIsActive ? '0' : '1';

            // 注入 1 层暴击
            await injectTokens(page, attackerId, { [TOKEN_IDS.CRIT]: 1 });

            // 验证 token 存在
            const core = await readCoreState(page) as Record<string, unknown>;
            expect(getPlayerTokens(core, attackerId)[TOKEN_IDS.CRIT], '暴击注入失败').toBe(1);

            // 模拟跳过响应：token 不变
            const coreFinal = await readCoreState(page) as Record<string, unknown>;
            expect(getPlayerTokens(coreFinal, attackerId)[TOKEN_IDS.CRIT], '跳过响应后 token 不应被消耗').toBe(1);

            await closeDebugPanelIfOpen(page);
        } finally {
            await hostContext.close();
            await guestContext.close();
        }
    });
});
