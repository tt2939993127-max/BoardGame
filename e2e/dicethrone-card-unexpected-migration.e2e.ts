/**
 * DiceThrone "意不意外" 卡牌测试（使用 fixture）
 * 
 * 目的：验证卡牌交互流程，为单元测试迁移提供参考
 */

import { test, expect } from './fixtures';
import { waitForTestHarness } from './helpers/common';
import { readCoreState, applyCoreStateDirect } from './helpers/dicethrone';

test.describe('DiceThrone 意不意外卡牌交互', () => {
    test('验证卡牌打出后的交互流程', async ({ dicethroneMatch }) => {
        const { hostPage } = dicethroneMatch;

        // 1. 等待测试工具就绪
        await waitForTestHarness(hostPage);

        // 2. 注入初始状态：手牌包含"意不意外"，有足够CP
        await applyCoreStateDirect(hostPage, (core: any) => {
            core.players['0'].hand = [
                {
                    uid: 'test-card-unexpected',
                    defId: 'card-unexpected',
                    atlasId: 'card-unexpected',
                }
            ];
            core.players['0'].resources.cp = 10;
        });

        // 3. 推进到进攻掷骰阶段
        await hostPage.evaluate(() => {
            window.__BG_TEST_HARNESS__!.command.dispatch({
                type: 'ADVANCE_PHASE',
                playerId: '0',
                payload: {},
            });
        });
        await hostPage.waitForTimeout(500);

        // 4. 掷骰
        await hostPage.evaluate(() => {
            window.__BG_TEST_HARNESS__!.dice.setValues([1, 2, 3, 4, 5]);
        });
        
        await hostPage.evaluate(() => {
            window.__BG_TEST_HARNESS__!.command.dispatch({
                type: 'ROLL_DICE',
                playerId: '0',
                payload: {},
            });
        });
        await hostPage.waitForTimeout(2500);

        await hostPage.evaluate(() => {
            window.__BG_TEST_HARNESS__!.command.dispatch({
                type: 'CONFIRM_ROLL',
                playerId: '0',
                payload: {},
            });
        });
        await hostPage.waitForTimeout(500);

        // 5. 打出卡牌
        await hostPage.evaluate(() => {
            window.__BG_TEST_HARNESS__!.command.dispatch({
                type: 'PLAY_CARD',
                playerId: '0',
                payload: { cardId: 'test-card-unexpected' },
            });
        });
        await hostPage.waitForTimeout(1000);

        // 6. 检查交互状态
        const interaction = await hostPage.evaluate(() => {
            const state = window.__BG_TEST_HARNESS__!.state.get();
            return {
                current: state.sys.interaction.current,
                queue: state.sys.interaction.queue,
            };
        });

        console.log('交互状态:', JSON.stringify(interaction, null, 2));

        // 7. 验证交互已创建
        expect(interaction.current).toBeTruthy();
        
        // 8. 记录交互类型和数据
        if (interaction.current) {
            console.log('交互类型:', interaction.current.kind);
            console.log('交互数据:', JSON.stringify(interaction.current.data, null, 2));
            
            // 如果是 simple-choice，尝试响应
            if (interaction.current.kind === 'simple-choice') {
                const data = interaction.current.data as any;
                if (data.options && data.options.length > 0) {
                    console.log('选项数量:', data.options.length);
                    console.log('第一个选项:', data.options[0]);
                    
                    // 响应第一个选项
                    await hostPage.evaluate((optionId) => {
                        window.__BG_TEST_HARNESS__!.command.dispatch({
                            type: 'SYS_INTERACTION_RESPOND',
                            playerId: '0',
                            payload: { optionId },
                        });
                    }, data.options[0].id);
                    
                    await hostPage.waitForTimeout(1000);
                    
                    // 检查后续交互
                    const nextInteraction = await hostPage.evaluate(() => {
                        const state = window.__BG_TEST_HARNESS__!.state.get();
                        return state.sys.interaction.current;
                    });
                    
                    console.log('后续交互:', JSON.stringify(nextInteraction, null, 2));
                }
            }
        }

        // 9. 验证最终状态
        const finalState = await readCoreState(hostPage);
        console.log('最终骰子值:', finalState.dice.map((d: any) => d.value));
        console.log('最终弃牌堆:', finalState.players['0'].discard.length);
    });
});
