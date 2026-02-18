/**
 * 大杀四方 - 刷新基地功能 E2E 测试
 */

import { test, expect } from '@playwright/test';
import { setupOnlineMatch } from './helpers/state-injection';

test.describe('SmashUp 刷新基地功能', () => {
    test('应该能通过调试面板刷新所有基地', async ({ page }) => {
        // 设置在线对局
        const { matchId } = await setupOnlineMatch(page, 'smashup', {
            playerID: '0',
            setupData: {
                factions: {
                    '0': ['aliens', 'dinosaurs'],
                    '1': ['ghosts', 'bear_cavalry'],
                },
            },
        });

        // 等待游戏加载
        await page.waitForSelector('[data-testid="debug-toggle"]', { timeout: 10000 });

        // 打开调试面板
        await page.click('[data-testid="debug-toggle"]');
        await page.waitForSelector('[data-testid="debug-panel"]');

        // 切换到 Controls 标签
        await page.click('[data-testid="debug-tab-controls"]');

        // 等待刷新基地面板出现
        await page.waitForSelector('[data-testid="su-debug-refresh-base"]', { timeout: 5000 });

        // 读取初始状态
        const initialState = await page.evaluate(() => {
            const state = (window as any).__BG_STATE__;
            return {
                bases: state.core.bases.map((b: any) => ({
                    defId: b.defId,
                    minionCount: b.minions.length,
                    actionCount: b.ongoingActions.length,
                })),
                baseDeckLength: state.core.baseDeck.length,
                nextBases: state.core.baseDeck.slice(0, state.core.bases.length),
            };
        });

        console.log('初始状态:', initialState);

        // 验证初始状态
        expect(initialState.bases.length).toBeGreaterThan(0);
        expect(initialState.baseDeckLength).toBeGreaterThanOrEqual(initialState.bases.length);

        const oldBaseDefIds = initialState.bases.map((b: any) => b.defId);
        const newBaseDefIds = initialState.nextBases;

        // 点击刷新所有基地按钮
        await page.click('[data-testid="su-debug-refresh-all-bases-apply"]');

        // 等待状态更新
        await page.waitForTimeout(500);

        // 读取更新后的状态
        const updatedState = await page.evaluate(() => {
            const state = (window as any).__BG_STATE__;
            return {
                bases: state.core.bases.map((b: any) => ({
                    defId: b.defId,
                    minionCount: b.minions.length,
                    actionCount: b.ongoingActions.length,
                })),
                baseDeckLength: state.core.baseDeck.length,
            };
        });

        console.log('更新后状态:', updatedState);

        // 验证所有基地都已刷新
        for (let i = 0; i < initialState.bases.length; i++) {
            expect(updatedState.bases[i].defId).toBe(newBaseDefIds[i]);
            expect(updatedState.bases[i].defId).not.toBe(oldBaseDefIds[i]);
            
            // 验证新基地是空的
            expect(updatedState.bases[i].minionCount).toBe(0);
            expect(updatedState.bases[i].actionCount).toBe(0);
        }

        // 验证基地牌库减少了相应数量
        expect(updatedState.baseDeckLength).toBe(initialState.baseDeckLength - initialState.bases.length);

        console.log(`✅ 所有基地刷新成功: ${oldBaseDefIds.join(', ')} → ${newBaseDefIds.join(', ')}`);
    });

    test('基地牌库不足时刷新按钮应该被禁用', async ({ page }) => {
        // 设置在线对局
        await setupOnlineMatch(page, 'smashup', {
            playerID: '0',
            setupData: {
                factions: {
                    '0': ['aliens', 'dinosaurs'],
                    '1': ['ghosts', 'bear_cavalry'],
                },
            },
        });

        // 等待游戏加载
        await page.waitForSelector('[data-testid="debug-toggle"]', { timeout: 10000 });

        // 打开调试面板
        await page.click('[data-testid="debug-toggle"]');
        await page.waitForSelector('[data-testid="debug-panel"]');

        // 切换到 Controls 标签
        await page.click('[data-testid="debug-tab-controls"]');

        // 等待刷新基地面板出现
        await page.waitForSelector('[data-testid="su-debug-refresh-base"]', { timeout: 5000 });

        // 设置基地牌库不足（场上3个基地，牌库只有2张）
        await page.evaluate(() => {
            const dispatch = (window as any).__BG_DISPATCH__;
            const state = (window as any).__BG_STATE__;
            dispatch('SYS_CHEAT_SET_STATE', {
                state: {
                    ...state.core,
                    baseDeck: state.core.baseDeck.slice(0, 2), // 只保留2张
                },
            });
        });

        await page.waitForTimeout(500);

        // 验证刷新所有基地按钮被禁用
        const isDisabled = await page.isDisabled('[data-testid="su-debug-refresh-all-bases-apply"]');
        expect(isDisabled).toBe(true);

        console.log('✅ 基地牌库不足时按钮正确禁用');
    });
});
