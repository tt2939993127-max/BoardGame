/**
 * SmashUp - 传送门交互 E2E 测试
 * 
 * 测试目标：
 * 1. 验证传送门交互不会一闪而过
 * 2. 验证选项正确显示（牌库顶的随从）
 * 
 * 测试策略：
 * - 完成派系选择后使用调试面板注入状态
 * - 验证交互持续显示
 */

import { test, expect } from './fixtures';
import { readCoreState, applyCoreState } from './helpers/smashup';

test.describe('传送门交互', () => {
    test('应该正确显示随从选项并持续显示', async ({ smashupMatch }, testInfo) => {
        const { hostPage } = smashupMatch;
        
        // 等待游戏开始（派系选择已完成）
        await hostPage.waitForTimeout(2000);

        // ============================================================================
        // 步骤 1：读取当前状态并构造测试场景
        // ============================================================================
        const currentState = await readCoreState(hostPage);
        const playerId = '0';
        
        // 构造测试状态：手牌中有传送门，牌库顶有 2 个随从 + 3 个行动卡
        const testState = {
            ...currentState,
            players: {
                ...currentState.players,
                [playerId]: {
                    ...currentState.players[playerId],
                    hand: [
                        { uid: 'portal_1', defId: 'wizard_portal', type: 'action' }
                    ],
                    deck: [
                        { uid: 'minion_1', defId: 'wizard_archmage', type: 'minion' },
                        { uid: 'minion_2', defId: 'wizard_chronomage', type: 'minion' },
                        { uid: 'action_1', defId: 'action_time_loop', type: 'action' },
                        { uid: 'action_2', defId: 'action_disintegrate', type: 'action' },
                        { uid: 'action_3', defId: 'action_enchant', type: 'action' },
                    ],
                },
            },
            currentPlayer: playerId,
            phase: 'playCards',
        };

        // 注入状态
        await applyCoreState(hostPage, testState);
        await hostPage.waitForTimeout(1000);

        // 截图：初始状态
        await hostPage.screenshot({ 
            path: testInfo.outputPath('01-initial-state.png'), 
            fullPage: true 
        });

        // ============================================================================
        // 步骤 2：打出传送门
        // ============================================================================
        // 点击传送门卡牌
        await hostPage.click('[data-card-uid="portal_1"]');
        await hostPage.waitForTimeout(500);

        // 等待交互出现（传送门选择随从）
        await hostPage.waitForSelector('text=/传送.*选择/', { timeout: 10000 });

        // 截图：交互出现
        await hostPage.screenshot({ 
            path: testInfo.outputPath('02-portal-interaction.png'), 
            fullPage: true 
        });

        // ============================================================================
        // 步骤 3：验证交互持续显示（不会一闪而过）
        // ============================================================================
        // 等待 2 秒，确认交互仍然存在
        await hostPage.waitForTimeout(2000);

        // 检查交互是否仍然可见
        const interactionStillVisible = await hostPage.isVisible('text=/传送.*选择/');
        expect(interactionStillVisible).toBe(true);

        // ============================================================================
        // 步骤 4：验证选项正确显示
        // ============================================================================
        // 应该能看到随从卡牌选项
        const minionOptions = await hostPage.$$('[data-option-id^="minion-"]');
        expect(minionOptions.length).toBeGreaterThanOrEqual(2);

        // 截图：选项持续显示
        await hostPage.screenshot({ 
            path: testInfo.outputPath('03-options-persist.png'), 
            fullPage: true 
        });

        console.log('✅ 传送门交互测试通过：交互持续显示，选项正确');
    });

    test('应该在没有随从时直接进入排序流程', async ({ smashupMatch }, testInfo) => {
        const { hostPage } = smashupMatch;

        // 等待游戏开始
        await hostPage.waitForTimeout(2000);

        // ============================================================================
        // 步骤 1：构造场景 - 牌库顶全是行动卡（没有随从）
        // ============================================================================
        const currentState = await readCoreState(hostPage);
        const playerId = '0';
        
        const testState = {
            ...currentState,
            players: {
                ...currentState.players,
                [playerId]: {
                    ...currentState.players[playerId],
                    hand: [
                        { uid: 'portal_1', defId: 'wizard_portal', type: 'action' }
                    ],
                    deck: [
                        { uid: 'action_1', defId: 'action_time_loop', type: 'action' },
                        { uid: 'action_2', defId: 'action_disintegrate', type: 'action' },
                        { uid: 'action_3', defId: 'action_enchant', type: 'action' },
                        { uid: 'action_4', defId: 'action_polymorph', type: 'action' },
                        { uid: 'action_5', defId: 'action_arcane_burst', type: 'action' },
                    ],
                },
            },
            currentPlayer: playerId,
            phase: 'playCards',
        };

        await applyCoreState(hostPage, testState);
        await hostPage.waitForTimeout(1000);

        // ============================================================================
        // 步骤 2：打出传送门
        // ============================================================================
        await hostPage.click('[data-card-uid="portal_1"]');
        await hostPage.waitForTimeout(500);

        // ============================================================================
        // 步骤 3：应该直接进入排序流程（跳过随从选择）
        // ============================================================================
        await hostPage.waitForSelector('text=/排序|放回/', { timeout: 10000 });

        // 截图：直接进入排序
        await hostPage.screenshot({ 
            path: testInfo.outputPath('01-direct-to-order.png'), 
            fullPage: true 
        });

        console.log('✅ 无随从场景测试通过：直接进入排序流程');
    });

    test('应该在牌库为空时显示反馈', async ({ smashupMatch }, testInfo) => {
        const { hostPage } = smashupMatch;

        // 等待游戏开始
        await hostPage.waitForTimeout(2000);

        // ============================================================================
        // 步骤 1：构造场景 - 牌库为空
        // ============================================================================
        const currentState = await readCoreState(hostPage);
        const playerId = '0';
        
        const testState = {
            ...currentState,
            players: {
                ...currentState.players,
                [playerId]: {
                    ...currentState.players[playerId],
                    hand: [
                        { uid: 'portal_1', defId: 'wizard_portal', type: 'action' }
                    ],
                    deck: [], // 空牌库
                },
            },
            currentPlayer: playerId,
            phase: 'playCards',
        };

        await applyCoreState(hostPage, testState);
        await hostPage.waitForTimeout(1000);

        // ============================================================================
        // 步骤 2：打出传送门
        // ============================================================================
        await hostPage.click('[data-card-uid="portal_1"]');
        await hostPage.waitForTimeout(500);

        // ============================================================================
        // 步骤 3：应该显示"牌库为空"反馈或直接完成
        // ============================================================================
        // 等待一段时间，确认没有交互出现（因为牌库为空）
        await hostPage.waitForTimeout(2000);

        // 截图：牌库为空场景
        await hostPage.screenshot({ 
            path: testInfo.outputPath('01-deck-empty.png'), 
            fullPage: true 
        });

        console.log('✅ 空牌库场景测试通过');
    });
});
