/**
 * DiceThrone 简单启动测试
 * 只测试到游戏开始，不测试业务逻辑
 */

import { test, expect, type Page, type TestInfo } from '@playwright/test';
import { clearEvidenceScreenshotsForTest, getEvidenceScreenshotPath } from './framework/evidenceScreenshots';
import {
    setupDTOnlineMatch,
    selectCharacter,
    waitForGameBoard,
    readyAndStartGame,
    readCoreState,
    closeDebugPanelIfOpen,
} from './helpers/dicethrone';

async function saveEvidenceScreenshot(page: Page, testInfo: TestInfo, name: string) {
    await page.screenshot({
        path: getEvidenceScreenshotPath(testInfo, name),
        fullPage: false,
    });
}

test.describe('DiceThrone Simple Start', () => {
    test('Online match: Can start a game successfully', async ({ browser }, testInfo) => {
        test.setTimeout(60000);
        const baseURL = testInfo.project.use.baseURL as string | undefined;

        const setup = await setupDTOnlineMatch(browser, baseURL);
        
        if (!setup) {
            test.skip(true, '游戏服务器不可用或创建房间失败');
            return;
        }
        
        const { hostPage, guestPage, hostContext, guestContext } = setup;

        // 选择英雄：野蛮人 vs 圣骑士
        await selectCharacter(hostPage, 'barbarian');
        await selectCharacter(guestPage, 'paladin');
        
        // 准备并开始游戏
        await readyAndStartGame(hostPage, guestPage);
        
        // 等待游戏开始
        await waitForGameBoard(hostPage);
        await waitForGameBoard(guestPage);

        // 截图验证
        await hostPage.screenshot({ path: testInfo.outputPath('host-game-started.png'), fullPage: false });
        await guestPage.screenshot({ path: testInfo.outputPath('guest-game-started.png'), fullPage: false });

        // 验证游戏界面元素存在（而不是验证 window.__BG_STATE__，因为 DiceThrone 使用新的传输层架构）
        const hostDiceButton = hostPage.locator('[data-tutorial-id="dice-roll-button"]');
        await expect(hostDiceButton).toBeVisible({ timeout: 5000 });

        const guestDiceButton = guestPage.locator('[data-tutorial-id="dice-roll-button"]');
        await expect(guestDiceButton).toBeVisible({ timeout: 5000 });

        await guestContext.close();
        await hostContext.close();
    });

    test('Online match: Gunslinger can be selected and start a game successfully', async ({ browser }, testInfo) => {
        test.setTimeout(60000);
        await clearEvidenceScreenshotsForTest(testInfo);
        const baseURL = testInfo.project.use.baseURL as string | undefined;

        const setup = await setupDTOnlineMatch(browser, baseURL);
        if (!setup) {
            test.skip(true, '游戏服务不可用或创建房间失败');
            return;
        }

        const { hostPage, guestPage, hostContext, guestContext } = setup;

        try {
            await selectCharacter(hostPage, 'gunslinger');
            await selectCharacter(guestPage, 'barbarian');

            await saveEvidenceScreenshot(hostPage, testInfo, 'gunslinger-selection');

            await readyAndStartGame(hostPage, guestPage);
            await waitForGameBoard(hostPage);
            await waitForGameBoard(guestPage);

            const hostCore = await readCoreState(hostPage) as {
                players?: Record<string, { characterId?: string }>;
                selectedCharacters?: Record<string, string>;
            };
            expect(hostCore.players?.['0']?.characterId).toBe('gunslinger');
            expect(hostCore.players?.['1']?.characterId).toBe('barbarian');
            expect(hostCore.selectedCharacters?.['0']).toBe('gunslinger');
            expect(hostCore.selectedCharacters?.['1']).toBe('barbarian');

            const hostDiceButton = hostPage.locator('[data-tutorial-id="dice-roll-button"]');
            const guestDiceButton = guestPage.locator('[data-tutorial-id="dice-roll-button"]');
            await expect(hostDiceButton).toBeVisible({ timeout: 5000 });
            await expect(guestDiceButton).toBeVisible({ timeout: 5000 });

            await closeDebugPanelIfOpen(hostPage);
            await saveEvidenceScreenshot(hostPage, testInfo, 'gunslinger-game-started');
        } finally {
            await guestContext.close();
            await hostContext.close();
        }
    });
});
