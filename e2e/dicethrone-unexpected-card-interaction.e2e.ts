/**
 * DiceThrone "意不意外" 卡牌交互流程 E2E 测试
 * 
 * 目的：验证新交互系统下骰子修改卡牌的完整流程
 * 用于指导单元测试迁移
 */

import { test, expect } from '@playwright/test';
import { waitForTestHarness } from './helpers/common';
import { setupOnlineMatch, waitForPhase, readCoreState, applyCoreStateDirect } from './helpers/dicethrone';

test.describe('DiceThrone 意不意外卡牌交互', () => {
    test('完整交互流程：选择骰子 → 修改值', async ({ page }) => {
        // 1. 创建对局
        const { roomId, player1Page, player2Page } = await setupOnlineMatch(page, 'dicethrone', {
            player1Character: 'monk',
            player2Character: 'monk',
        });

        // 2. 等待测试工具就绪
        await waitForTestHarness(player1Page);

        // 3. 注入初始状态：玩家1手牌包含"意不意外"，有足够CP
        await applyCoreStateDirect(player1Page, (core) => {
            // 清空手牌，只保留"意不意外"
            core.players['0'].hand = [
                {
                    uid: 'test-card-unexpected',
                    defId: 'card-unexpected',
                    atlasId: 'card-unexpected',
                }
            ];
            core.players['0'].resources.cp = 10;
            core.players['0'].deck = [];
            core.players['1'].hand = [];
            core.players['1'].deck = [];
        });

        // 4. 推进到进攻掷骰阶段
        await waitForPhase(player1Page, 'offensiveRoll');

        // 5. 掷骰
        await player1Page.evaluate(() => {
            window.__BG_TEST_HARNESS__!.dice.setValues([1, 2, 3, 4, 5]);
        });
        await player1Page.click('[data-testid="roll-dice-button"]');
        await player1Page.waitForTimeout(2500);

        // 6. 确认掷骰
        await player1Page.click('button:has-text("确认")');
        await player1Page.waitForTimeout(500);

        // 7. 打出"意不意外"卡牌
        await player1Page.click('[data-testid="card-unexpected"]');
        await player1Page.waitForTimeout(1000);

        // 8. 检查交互状态
        const interaction1 = await player1Page.evaluate(() => {
            const state = window.__BG_TEST_HARNESS__!.state.get();
            return state.sys.interaction.current;
        });

        console.log('第一个交互:', JSON.stringify(interaction1, null, 2));

        // 9. 根据交互类型响应
        if (interaction1) {
            if (interaction1.kind === 'dt:select-die') {
                // 选择骰子交互：选择前两颗骰子
                console.log('检测到选择骰子交互');
                // TODO: 实现骰子选择 UI 交互
                // 这需要了解 UI 如何渲染 dt:select-die 交互
            } else if (interaction1.kind === 'simple-choice') {
                // 简单选择交互：查看选项
                const data = interaction1.data as any;
                console.log('选项:', data.options);
                
                // 选择第一个选项
                await player1Page.evaluate((optionId) => {
                    window.__BG_TEST_HARNESS__!.command.dispatch({
                        type: 'SYS_INTERACTION_RESPOND',
                        playerId: '0',
                        payload: { optionId },
                    });
                }, data.options[0].id);
                
                await player1Page.waitForTimeout(1000);
            }
        }

        // 10. 检查后续交互
        const interaction2 = await player1Page.evaluate(() => {
            const state = window.__BG_TEST_HARNESS__!.state.get();
            return state.sys.interaction.current;
        });

        console.log('第二个交互:', JSON.stringify(interaction2, null, 2));

        // 11. 验证最终状态
        const finalState = await readCoreState(player1Page);
        console.log('最终骰子值:', finalState.dice.map((d: any) => d.value));

        // 清理
        await player1Page.close();
        await player2Page.close();
    });

    test('通过命令直接测试交互流程', async ({ page }) => {
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
            core.players['0'].deck = [];
            core.players['1'].hand = [];
            core.players['1'].deck = [];
        });

        // 4. 推进到进攻掷骰阶段并掷骰
        await waitForPhase(player1Page, 'offensiveRoll');
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

        // 5. 打出卡牌
        await player1Page.evaluate(() => {
            window.__BG_TEST_HARNESS__!.command.dispatch({
                type: 'PLAY_CARD',
                playerId: '0',
                payload: { cardId: 'test-card-unexpected' },
            });
        });
        await player1Page.waitForTimeout(1000);

        // 6. 检查交互并记录完整流程
        let step = 1;
        const maxSteps = 10;
        
        while (step <= maxSteps) {
            const interaction = await player1Page.evaluate(() => {
                const state = window.__BG_TEST_HARNESS__!.state.get();
                return state.sys.interaction.current;
            });

            if (!interaction) {
                console.log(`步骤 ${step}: 无交互，流程结束`);
                break;
            }

            console.log(`步骤 ${step}: 交互类型=${interaction.kind}`);
            console.log(`  ID: ${interaction.id}`);
            console.log(`  PlayerId: ${interaction.playerId}`);
            console.log(`  Data:`, JSON.stringify(interaction.data, null, 2));

            // 自动响应第一个选项
            if (interaction.kind === 'simple-choice') {
                const data = interaction.data as any;
                if (data.options && data.options.length > 0) {
                    const optionId = data.options[0].id;
                    console.log(`  响应: optionId=${optionId}`);
                    
                    await player1Page.evaluate((optionId) => {
                        window.__BG_TEST_HARNESS__!.command.dispatch({
                            type: 'SYS_INTERACTION_RESPOND',
                            playerId: '0',
                            payload: { optionId },
                        });
                    }, optionId);
                    
                    await player1Page.waitForTimeout(500);
                }
            } else {
                console.log(`  未知交互类型，跳过`);
                break;
            }

            step++;
        }

        // 7. 验证最终状态
        const finalState = await readCoreState(player1Page);
        console.log('最终骰子值:', finalState.dice.map((d: any) => d.value));
        console.log('最终弃牌堆:', finalState.players['0'].discard.length);

        // 清理
        await player1Page.close();
        await player2Page.close();
    });
});
