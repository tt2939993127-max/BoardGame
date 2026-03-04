/**
 * DiceThrone "意不意外" 卡牌简单 E2E 测试
 * 
 * 目的：验证卡牌是否能正常打出并产生交互
 */

import { test, expect } from '@playwright/test';
import { waitForTestHarness } from './helpers/common';
import { setupOnlineMatch, readCoreState, applyCoreStateDirect, waitForMainPhase } from './helpers/dicethrone';

test.describe('DiceThrone 意不意外卡牌', () => {
    test('验证卡牌能正常打出', async ({ page }) => {
        // 1. 创建对局
        const { roomId, player1Page, player2Page } = await setupOnlineMatch(page, 'dicethrone', {
            player1Character: 'monk',
            player2Character: 'monk',
        });

        // 2. 等待测试工具就绪
        await waitForTestHarness(player1Page);

        // 3. 注入初始状态
        await applyCoreStateDirect(player1Page, (core) => {
            core.players['0'].hand = [
                {
                    uid: 'test-card-unexpected',
                    defId: 'card-unexpected',
                    atlasId: 'card-unexpected',
                }
            ];
            core.players['0'].resources.cp = 10;
        });

        // 4. 等待进入主要阶段
        await waitForMainPhase(player1Page);
        
        // 推进到进攻掷骰阶段
        await player1Page.evaluate(() => {
            window.__BG_TEST_HARNESS__!.command.dispatch({
                type: 'ADVANCE_PHASE',
                playerId: '0',
                payload: {},
            });
        });
        await player1Page.waitForTimeout(500);

        // 5. 掷骰
        await player1Page.evaluate(() => {
            window.__BG_TEST_HARNESS__!.dice.setValues([1, 2, 3, 4, 5]);
        });
        
        await player1Page.evaluate(() => {
            window.__BG_TEST_HARNESS__!.command.dispatch({
                type: 'ROLL_DICE',
                playerId: '0',
                payload: {},
            });
        });
        await player1Page.waitForTimeout(2500);

        await player1Page.evaluate(() => {
            window.__BG_TEST_HARNESS__!.command.dispatch({
                type: 'CONFIRM_ROLL',
                playerId: '0',
                payload: {},
            });
        });
        await player1Page.waitForTimeout(500);

        // 6. 打出卡牌
        const playCardResult = await player1Page.evaluate(() => {
            return window.__BG_TEST_HARNESS__!.command.dispatch({
                type: 'PLAY_CARD',
                playerId: '0',
                payload: { cardId: 'test-card-unexpected' },
            });
        });
        
        console.log('打出卡牌结果:', playCardResult);
        await player1Page.waitForTimeout(1000);

        // 7. 检查交互状态
        const interaction = await player1Page.evaluate(() => {
            const state = window.__BG_TEST_HARNESS__!.state.get();
            return {
                current: state.sys.interaction.current,
                queue: state.sys.interaction.queue,
            };
        });

        console.log('交互状态:', JSON.stringify(interaction, null, 2));

        // 8. 验证交互已创建
        expect(interaction.current).toBeTruthy();
        
        // 9. 如果是 simple-choice，打印选项
        if (interaction.current && interaction.current.kind === 'simple-choice') {
            const data = interaction.current.data as any;
            console.log('选项数量:', data.options?.length);
            console.log('选项:', data.options);
        }

        // 清理
        await player1Page.close();
        await player2Page.close();
    });
});
