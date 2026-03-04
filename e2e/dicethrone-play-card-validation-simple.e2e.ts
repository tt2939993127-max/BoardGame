/**
 * DiceThrone - 简化的打牌验证测试
 * 
 * 目的：快速诊断"卡牌不在手牌中"错误的根本原因
 */

import { test, expect } from './fixtures';
import { waitForTestHarness } from './helpers/common';
import { selectCharacter, waitForGameBoard } from './helpers/dicethrone';

test.describe('DiceThrone - 打牌验证诊断', () => {
    test('诊断：打牌时的验证日志', async ({ dicethroneMatch }) => {
        const { hostPage, guestPage, matchId } = dicethroneMatch;

        console.log(`[Test] 对局 ID: ${matchId}`);

        // 完成角色选择
        await selectCharacter(hostPage, 'monk');
        await selectCharacter(guestPage, 'barbarian');

        // 等待游戏开始
        await waitForGameBoard(hostPage);
        await waitForTestHarness(hostPage);

        console.log('[Test] 游戏已开始，TestHarness 就绪');

        // 监听所有控制台日志
        const consoleLogs: string[] = [];
        hostPage.on('console', (msg) => {
            const text = msg.text();
            consoleLogs.push(`[${msg.type()}] ${text}`);
            
            // 实时打印关键日志
            if (text.includes('[validateCommand]') || 
                text.includes('[validatePlayCard]') ||
                text.includes('[validateSellCard]') ||
                text.includes('[validateReorderCardToEnd]') ||
                text.includes('[validatePlayUpgradeCard]') ||
                text.includes('[validateUsePassiveAbility]') ||
                text.includes('card_not_in_hand')) {
                console.log(`  ${text}`);
            }
        });

        // 注入测试状态：玩家0在main1阶段，有手牌和足够的CP
        await hostPage.evaluate(() => {
            const harness = window.__BG_TEST_HARNESS__!;
            const state = harness.state.get();
            if (!state) throw new Error('State not available');

            // 构造测试状态
            const testState = {
                ...state,
                sys: {
                    ...state.sys,
                    phase: 'main1',
                },
                core: {
                    ...state.core,
                    turnPhase: 'main1',
                    activePlayerId: '0',
                    players: {
                        '0': {
                            ...state.core.players['0'],
                            resources: {
                                ...state.core.players['0'].resources,
                                CP: 5,
                            },
                            hand: [
                                {
                                    id: 'test-card-1',
                                    name: '测试卡牌1',
                                    type: 'action',
                                    timing: 'main',
                                    cpCost: 2,
                                    effects: [],
                                    previewRef: 'dicethrone:barbarian-cards#0',
                                },
                            ],
                        },
                        '1': state.core.players['1'],
                    },
                },
            };

            harness.state.patch(testState);
            console.log('[Test] 状态已注入');
        });

        await hostPage.waitForTimeout(1000);

        // 验证手牌区域可见
        const handArea = hostPage.locator('[data-tutorial-id="hand-area"]');
        await expect(handArea).toBeVisible({ timeout: 5000 });

        // 获取第一张卡牌
        const firstCard = hostPage.locator('[data-card-key]').first();
        await expect(firstCard).toBeVisible({ timeout: 5000 });

        const cardKey = await firstCard.getAttribute('data-card-key');
        console.log(`[Test] 准备点击卡牌: ${cardKey}`);

        // 点击卡牌
        await firstCard.click();
        console.log('[Test] 已点击卡牌');

        // 等待命令处理
        await hostPage.waitForTimeout(2000);

        // 输出所有捕获的日志
        console.log('\n========== 捕获的控制台日志 ==========');
        consoleLogs.forEach(log => console.log(log));
        console.log('=====================================\n');

        // 分析日志
        const hasValidateCommand = consoleLogs.some(log => log.includes('[validateCommand]'));
        const hasValidatePlayCard = consoleLogs.some(log => log.includes('[validatePlayCard]'));
        const hasCardNotInHand = consoleLogs.some(log => log.includes('card_not_in_hand'));

        console.log('\n========== 日志分析 ==========');
        console.log(`✓ 有 [validateCommand] 日志: ${hasValidateCommand}`);
        console.log(`✓ 有 [validatePlayCard] 日志: ${hasValidatePlayCard}`);
        console.log(`✗ 有 card_not_in_hand 错误: ${hasCardNotInHand}`);
        console.log('==============================\n');

        // 如果没有任何验证日志，说明命令根本没到达验证层
        if (!hasValidateCommand) {
            console.error('❌ 严重问题：命令没有到达验证层！');
            console.error('可能原因：');
            console.error('  1. 命令分发器没有调用');
            console.error('  2. 命令类型不匹配');
            console.error('  3. 命令被中间件拦截');
            
            // 获取客户端状态用于调试
            const debugInfo = await hostPage.evaluate(() => {
                const harness = window.__BG_TEST_HARNESS__!;
                const state = harness.state.get();
                if (!state) return null;
                
                return {
                    phase: state.core.turnPhase,
                    activePlayerId: state.core.activePlayerId,
                    handCardIds: state.core.players['0'].hand.map((c: any) => c.id),
                    cp: state.core.players['0'].resources.CP,
                };
            });
            
            console.error('客户端状态:', JSON.stringify(debugInfo, null, 2));
        }

        // 如果有 card_not_in_hand 错误，输出详细信息
        if (hasCardNotInHand) {
            console.error('\n❌ 发现 card_not_in_hand 错误！');
            
            const errorLogs = consoleLogs.filter(log => log.includes('card_not_in_hand'));
            console.error('错误日志:');
            errorLogs.forEach(log => console.error(`  ${log}`));
            
            // 获取客户端状态
            const clientState = await hostPage.evaluate(() => {
                const harness = window.__BG_TEST_HARNESS__!;
                const state = harness.state.get();
                if (!state) return null;
                
                return {
                    phase: state.core.turnPhase,
                    activePlayerId: state.core.activePlayerId,
                    handCardIds: state.core.players['0'].hand.map((c: any) => c.id),
                    cp: state.core.players['0'].resources.CP,
                };
            });
            
            console.error('客户端状态:', JSON.stringify(clientState, null, 2));
            
            throw new Error('打牌时出现 card_not_in_hand 错误');
        }

        // 验证：应该看到验证日志
        expect(hasValidateCommand).toBe(true);
    });
});
