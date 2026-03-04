/**
 * DiceThrone "意不意外"卡牌测试
 * 复现用户报告的问题：提示"卡牌不在手牌中"且没有效果
 */

import { test, expect } from './fixtures';
import { waitForTestHarness } from './helpers/common';
import { setupOnlineMatch, readCoreState, applyCoreStateDirect } from './helpers/dicethrone';

test.describe('DiceThrone - 意不意外卡牌', () => {
    test('应该能正常打出并修改2颗骰子', async ({ page, context, baseURL }) => {
        const result = await setupOnlineMatch(page, context, baseURL, {
            player1Character: 'monk',
            player2Character: 'barbarian',
        });
        
        if (!result) {
            throw new Error('Failed to setup match');
        }
        
        const { player1Page, player2Page, matchId } = result;

        // 等待测试工具就绪
        await waitForTestHarness(player1Page);

        // 注入测试场景：玩家1在进攻投掷阶段，手牌中有"意不意外"卡牌，有足够的CP
        await applyCoreStateDirect(player1Page, {
            phase: 'offensiveRoll',
            activePlayerId: '1',
            rollCount: 1,
            rollConfirmed: false,
            dice: [
                { id: 0, value: 1, locked: false, playerId: '1' },
                { id: 1, value: 2, locked: false, playerId: '1' },
                { id: 2, value: 3, locked: false, playerId: '1' },
                { id: 3, value: 4, locked: false, playerId: '1' },
                { id: 4, value: 5, locked: false, playerId: '1' },
            ],
            players: {
                '1': {
                    hand: [
                        {
                            id: 'card-unexpected',
                            name: '意不意外？！',
                            type: 'action',
                            cpCost: 3,
                            timing: 'roll',
                        },
                    ],
                    resources: {
                        'resource-cp': 10,
                    },
                },
            },
        });

        // 等待状态同步
        await player1Page.waitForTimeout(500);

        // 读取当前状态，确认卡牌在手牌中
        const stateBefore = await readCoreState(player1Page);
        console.log('State before playing card:', {
            hand: stateBefore.players['1'].hand.map((c: any) => ({ id: c.id, name: c.name })),
            cp: stateBefore.players['1'].resources['resource-cp'],
            phase: stateBefore.phase,
            dice: stateBefore.dice.map((d: any) => ({ id: d.id, value: d.value })),
        });

        expect(stateBefore.players['1'].hand).toHaveLength(1);
        expect(stateBefore.players['1'].hand[0].id).toBe('card-unexpected');
        expect(stateBefore.players['1'].resources['resource-cp']).toBeGreaterThanOrEqual(3);

        // 点击"意不意外"卡牌打出
        await player1Page.click('[data-card-key^="card-unexpected"]');

        // 等待交互出现
        await player1Page.waitForTimeout(1000);

        // 检查是否出现选择骰子的交互
        const interactionVisible = await player1Page.isVisible('[data-tutorial-id="interaction-overlay"]');
        
        if (!interactionVisible) {
            // 如果交互未出现，读取状态和日志
            const stateAfter = await readCoreState(player1Page);
            console.error('Interaction not visible. State after:', {
                hand: stateAfter.players['1'].hand.map((c: any) => ({ id: c.id, name: c.name })),
                cp: stateAfter.players['1'].resources['resource-cp'],
                phase: stateAfter.phase,
                interaction: stateAfter.sys?.interaction,
            });

            // 截图保存证据
            await player1Page.screenshot({ 
                path: test.info().outputPath('unexpected-card-no-interaction.png'),
                fullPage: true,
            });

            throw new Error('交互未出现：卡牌打出后没有显示选择骰子的界面');
        }

        // 选择第1颗骰子（id=0, value=1）
        await player1Page.click('[data-die-id="0"]');

        // 等待第二个交互（选择新数值）
        await player1Page.waitForTimeout(500);

        // 选择新数值6
        await player1Page.click('button:has-text("6")');

        // 等待第二颗骰子选择交互
        await player1Page.waitForTimeout(500);

        // 选择第2颗骰子（id=1, value=2）
        await player1Page.click('[data-die-id="1"]');

        // 等待第二个交互（选择新数值）
        await player1Page.waitForTimeout(500);

        // 选择新数值6
        await player1Page.click('button:has-text("6")');

        // 等待状态更新
        await player1Page.waitForTimeout(1000);

        // 验证结果
        const stateAfter = await readCoreState(player1Page);
        console.log('State after playing card:', {
            hand: stateAfter.players['1'].hand.map((c: any) => ({ id: c.id, name: c.name })),
            cp: stateAfter.players['1'].resources['resource-cp'],
            dice: stateAfter.dice.map((d: any) => ({ id: d.id, value: d.value })),
        });

        // 验证卡牌已从手牌移除
        expect(stateAfter.players['1'].hand).toHaveLength(0);

        // 验证CP已扣除
        expect(stateAfter.players['1'].resources['resource-cp']).toBe(7); // 10 - 3 = 7

        // 验证骰子已修改
        const die0 = stateAfter.dice.find((d: any) => d.id === 0);
        const die1 = stateAfter.dice.find((d: any) => d.id === 1);
        expect(die0?.value).toBe(6);
        expect(die1?.value).toBe(6);

        // 截图保存成功状态
        await player1Page.screenshot({ 
            path: test.info().outputPath('unexpected-card-success.png'),
            fullPage: true,
        });
    });

    test('应该在骰子不足2颗时禁止打出', async ({ page, context, baseURL }) => {
        const result = await setupOnlineMatch(page, context, baseURL, {
            player1Character: 'monk',
            player2Character: 'barbarian',
        });
        
        if (!result) {
            throw new Error('Failed to setup match');
        }
        
        const { player1Page, player2Page, matchId } = result;

        await waitForTestHarness(player1Page);

        // 注入测试场景：只有1颗骰子
        await applyCoreStateDirect(player1Page, {
            phase: 'offensiveRoll',
            activePlayerId: '1',
            rollCount: 1,
            rollConfirmed: false,
            dice: [
                { id: 0, value: 1, locked: false, playerId: '1' },
            ],
            players: {
                '1': {
                    hand: [
                        {
                            id: 'card-unexpected',
                            name: '意不意外？！',
                            type: 'action',
                            cpCost: 3,
                            timing: 'roll',
                        },
                    ],
                    resources: {
                        'resource-cp': 10,
                    },
                },
            },
        });

        await player1Page.waitForTimeout(500);

        // 点击卡牌
        await player1Page.click('[data-card-key^="card-unexpected"]');

        // 等待错误提示
        await player1Page.waitForTimeout(1000);

        // 验证卡牌仍在手牌中（打出失败）
        const stateAfter = await readCoreState(player1Page);
        expect(stateAfter.players['1'].hand).toHaveLength(1);
        expect(stateAfter.players['1'].hand[0].id).toBe('card-unexpected');

        // 验证CP未扣除
        expect(stateAfter.players['1'].resources['resource-cp']).toBe(10);
    });

    test('应该在CP不足时禁止打出', async ({ page, context, baseURL }) => {
        const result = await setupOnlineMatch(page, context, baseURL, {
            player1Character: 'monk',
            player2Character: 'barbarian',
        });
        
        if (!result) {
            throw new Error('Failed to setup match');
        }
        
        const { player1Page, player2Page, matchId } = result;

        await waitForTestHarness(player1Page);

        // 注入测试场景：CP不足
        await applyCoreStateDirect(player1Page, {
            phase: 'offensiveRoll',
            activePlayerId: '1',
            rollCount: 1,
            rollConfirmed: false,
            dice: [
                { id: 0, value: 1, locked: false, playerId: '1' },
                { id: 1, value: 2, locked: false, playerId: '1' },
            ],
            players: {
                '1': {
                    hand: [
                        {
                            id: 'card-unexpected',
                            name: '意不意外？！',
                            type: 'action',
                            cpCost: 3,
                            timing: 'roll',
                        },
                    ],
                    resources: {
                        'resource-cp': 2, // 不足3
                    },
                },
            },
        });

        await player1Page.waitForTimeout(500);

        // 点击卡牌
        await player1Page.click('[data-card-key^="card-unexpected"]');

        // 等待错误提示
        await player1Page.waitForTimeout(1000);

        // 验证卡牌仍在手牌中（打出失败）
        const stateAfter = await readCoreState(player1Page);
        expect(stateAfter.players['1'].hand).toHaveLength(1);
        expect(stateAfter.players['1'].hand[0].id).toBe('card-unexpected');

        // 验证CP未扣除
        expect(stateAfter.players['1'].resources['resource-cp']).toBe(2);
    });
});
