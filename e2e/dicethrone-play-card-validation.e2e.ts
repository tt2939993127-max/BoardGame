/**
 * DiceThrone - 测试打牌验证和"卡牌不在手牌中"错误
 * 
 * 目的：自动化测试用户报告的"打牌时所有卡牌都提示卡牌不在手牌中"问题
 */

import { test, expect } from './fixtures';
import { waitForTestHarness } from './helpers/common';

test.describe('DiceThrone - 打牌验证测试', () => {
    test('应该能够正常打出手牌中的卡牌', async ({ dicethroneMatch }) => {
        const { hostPage: page, matchId } = dicethroneMatch;

        // 等待游戏加载
        await page.waitForSelector('[data-testid="game-board"]', { timeout: 10000 });

        // 等待 TestHarness 就绪
        await waitForTestHarness(page);

        // 监听控制台日志，捕获验证日志
        const consoleLogs: string[] = [];
        page.on('console', msg => {
            const text = msg.text();
            if (text.includes('[validateCommand]') || 
                text.includes('[validatePlayCard]') ||
                text.includes('card_not_in_hand')) {
                consoleLogs.push(text);
            }
        });

        // 注入测试状态：玩家0在主要阶段，有手牌和足够的CP
        await page.evaluate(() => {
            const harness = window.__BG_TEST_HARNESS__!;
            
            // 获取当前状态
            const state = harness.state.get();
            if (!state) throw new Error('State not available');

            // 构造测试状态：玩家0在main1阶段，有手牌
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
                                CP: 5, // 足够的CP
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
                                {
                                    id: 'test-card-2',
                                    name: '测试卡牌2',
                                    type: 'action',
                                    timing: 'main',
                                    cpCost: 1,
                                    effects: [],
                                    previewRef: 'dicethrone:barbarian-cards#1',
                                },
                            ],
                        },
                        '1': state.core.players['1'],
                    },
                },
            };

            harness.state.patch(testState);
        });

        // 等待状态更新
        await page.waitForTimeout(500);

        // 验证手牌区域可见
        const handArea = page.locator('[data-tutorial-id="hand-area"]');
        await expect(handArea).toBeVisible();

        // 获取第一张卡牌
        const firstCard = page.locator('[data-card-key]').first();
        await expect(firstCard).toBeVisible();

        // 获取卡牌的 data-card-key 属性
        const cardKey = await firstCard.getAttribute('data-card-key');
        console.log('卡牌 key:', cardKey);

        // 点击卡牌尝试打出
        await firstCard.click();

        // 等待一下让命令处理
        await page.waitForTimeout(1000);

        // 检查控制台日志
        console.log('捕获的控制台日志:');
        consoleLogs.forEach(log => console.log('  ', log));

        // 验证：应该看到验证日志
        const hasValidateCommand = consoleLogs.some(log => log.includes('[validateCommand]'));
        const hasValidatePlayCard = consoleLogs.some(log => log.includes('[validatePlayCard]'));
        const hasCardNotInHand = consoleLogs.some(log => log.includes('card_not_in_hand'));

        // 断言
        expect(hasValidateCommand).toBe(true); // 应该有验证入口日志
        expect(hasValidatePlayCard).toBe(true); // 应该有 validatePlayCard 日志
        
        // 如果出现 card_not_in_hand 错误，测试失败并显示详细信息
        if (hasCardNotInHand) {
            const errorLogs = consoleLogs.filter(log => log.includes('card_not_in_hand'));
            console.error('❌ 发现 card_not_in_hand 错误:');
            errorLogs.forEach(log => console.error('  ', log));
            
            // 获取客户端状态用于调试
            const clientState = await page.evaluate(() => {
                const harness = window.__BG_TEST_HARNESS__!;
                const state = harness.state.get();
                if (!state) return null;
                
                const player = state.core.players['0'];
                return {
                    phase: state.core.turnPhase,
                    activePlayerId: state.core.activePlayerId,
                    handCardIds: player.hand.map((c: any) => c.id),
                    cp: player.resources.CP,
                };
            });
            
            console.error('客户端状态:', clientState);
            
            throw new Error('打牌时出现 card_not_in_hand 错误，但卡牌应该在手牌中');
        }

        // 验证卡牌被成功打出（从手牌中移除）
        const handAfter = await page.evaluate(() => {
            const harness = window.__BG_TEST_HARNESS__!;
            const state = harness.state.get();
            return state?.core.players['0'].hand.length ?? 0;
        });

        // 手牌数量应该减少（从2张变成1张）
        expect(handAfter).toBeLessThan(2);
    });

    test('应该能够检测到真正的"卡牌不在手牌中"错误', async ({ dicethroneMatch }) => {
        const { hostPage: page, matchId } = dicethroneMatch;

        await page.waitForSelector('[data-testid="game-board"]', { timeout: 10000 });
        await waitForTestHarness(page);

        const consoleLogs: string[] = [];
        page.on('console', msg => {
            const text = msg.text();
            if (text.includes('[validateCommand]') || 
                text.includes('[validatePlayCard]') ||
                text.includes('card_not_in_hand')) {
                consoleLogs.push(text);
            }
        });

        // 注入测试状态：玩家0在主要阶段，但手牌为空
        await page.evaluate(() => {
            const harness = window.__BG_TEST_HARNESS__!;
            const state = harness.state.get();
            if (!state) throw new Error('State not available');

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
                            hand: [], // 空手牌
                        },
                        '1': state.core.players['1'],
                    },
                },
            };

            harness.state.patch(testState);
        });

        await page.waitForTimeout(500);

        // 尝试通过命令分发器直接发送打牌命令（模拟卡牌ID不在手牌中的情况）
        await page.evaluate(() => {
            const harness = window.__BG_TEST_HARNESS__!;
            harness.command.dispatch({
                type: 'PLAY_CARD',
                playerId: '0',
                payload: { cardId: 'non-existent-card-id' },
                timestamp: Date.now(),
            });
        });

        await page.waitForTimeout(1000);

        // 验证：应该看到 card_not_in_hand 错误
        const hasCardNotInHand = consoleLogs.some(log => log.includes('card_not_in_hand'));
        expect(hasCardNotInHand).toBe(true);

        // 验证：应该看到详细的验证日志
        const hasValidatePlayCard = consoleLogs.some(log => 
            log.includes('[validatePlayCard]') && log.includes('验证失败')
        );
        expect(hasValidatePlayCard).toBe(true);

        console.log('✅ 正确检测到 card_not_in_hand 错误');
        consoleLogs.forEach(log => console.log('  ', log));
    });

    test('应该能够检测状态不同步问题', async ({ dicethroneMatch }) => {
        const { hostPage: page, matchId } = dicethroneMatch;

        await page.waitForSelector('[data-testid="game-board"]', { timeout: 10000 });
        await waitForTestHarness(page);

        const consoleLogs: string[] = [];
        page.on('console', msg => {
            const text = msg.text();
            if (text.includes('[validateCommand]') || 
                text.includes('[validatePlayCard]') ||
                text.includes('card_not_in_hand')) {
                consoleLogs.push(text);
            }
        });

        // 注入测试状态：客户端显示有卡牌
        await page.evaluate(() => {
            const harness = window.__BG_TEST_HARNESS__!;
            const state = harness.state.get();
            if (!state) throw new Error('State not available');

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
                                    id: 'client-card-1',
                                    name: '客户端卡牌',
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
        });

        await page.waitForTimeout(500);

        // 验证客户端状态
        const clientHand = await page.evaluate(() => {
            const harness = window.__BG_TEST_HARNESS__!;
            const state = harness.state.get();
            return state?.core.players['0'].hand.map((c: any) => c.id) ?? [];
        });

        console.log('客户端手牌:', clientHand);
        expect(clientHand).toContain('client-card-1');

        // 尝试打出这张卡牌（通过命令分发器）
        await page.evaluate(() => {
            const harness = window.__BG_TEST_HARNESS__!;
            harness.command.dispatch({
                type: 'PLAY_CARD',
                playerId: '0',
                payload: { cardId: 'client-card-1' },
                timestamp: Date.now(),
            });
        });

        await page.waitForTimeout(1000);

        // 在本地模式下，命令应该成功执行（因为客户端状态中有这张卡）
        // 但在在线模式下，如果服务端状态不同步，会出现 card_not_in_hand 错误

        console.log('捕获的日志:');
        consoleLogs.forEach(log => console.log('  ', log));

        // 验证：应该看到验证日志
        const hasValidateCommand = consoleLogs.some(log => log.includes('[validateCommand]'));
        expect(hasValidateCommand).toBe(true);
    });
});
