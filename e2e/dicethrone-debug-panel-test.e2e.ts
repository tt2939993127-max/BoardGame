/**
 * DiceThrone 调试面板测试
 * 验证调试面板的状态读取和注入功能
 */

import { test, expect } from '@playwright/test';
import { 
    setupDTOnlineMatch, 
    selectCharacter, 
    waitForGameBoard, 
    readyAndStartGame,
    readCoreState,
    setPlayerResource,
    ensureDebugPanelOpen,
} from './helpers/dicethrone';

test.describe('DiceThrone Debug Panel', () => {
    test('Can read and modify state through debug panel', async ({ browser }, testInfo) => {
        test.setTimeout(60000);
        const baseURL = testInfo.project.use.baseURL as string | undefined;

        const setup = await setupDTOnlineMatch(browser, baseURL);
        if (!setup) {
            test.skip(true, '游戏服务器不可用或创建房间失败');
            return;
        }
        
        const { hostPage, guestPage, hostContext, guestContext } = setup;

        // 选择英雄
        await selectCharacter(hostPage, 'barbarian');
        await selectCharacter(guestPage, 'paladin');
        
        // 准备并开始游戏
        await readyAndStartGame(hostPage, guestPage);
        
        // 等待游戏开始
        await waitForGameBoard(hostPage);
        await waitForGameBoard(guestPage);

        // 打开调试面板
        await ensureDebugPanelOpen(hostPage);
        await hostPage.screenshot({ path: testInfo.outputPath('debug-panel-open.png'), fullPage: false });

        // 读取初始状态
        const initialState = await readCoreState(hostPage);
        console.log('Initial HP:', initialState.players?.['0']?.resources?.hp);
        expect(initialState.players?.['0']?.resources?.hp).toBeGreaterThan(0);

        // 修改 HP
        await setPlayerResource(hostPage, '0', 'hp', 10);
        await hostPage.waitForTimeout(1000);

        // 验证修改成功
        const modifiedState = await readCoreState(hostPage);
        console.log('Modified HP:', modifiedState.players?.['0']?.resources?.hp);
        expect(modifiedState.players?.['0']?.resources?.hp).toBe(10);

        await hostPage.screenshot({ path: testInfo.outputPath('state-modified.png'), fullPage: false });

        await guestContext.close();
        await hostContext.close();
    });
});
