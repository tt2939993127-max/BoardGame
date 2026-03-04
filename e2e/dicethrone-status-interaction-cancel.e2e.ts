/**
 * DiceThrone 状态选择交互 - 取消按钮测试
 * 
 * 验证状态选择交互的 UI 正确显示，包括取消按钮
 */
import { test, expect } from './fixtures';
import { setupOnlineMatch, readCoreState, waitForTestHarness } from './helpers/common';

test.describe('DiceThrone - Status Interaction Cancel Button', () => {
    test('should show cancel button in status selection interaction', async ({ page }) => {
        // 1. 创建对局
        const { roomId } = await setupOnlineMatch(page, 'dicethrone', {
            player0Character: 'barbarian',
            player1Character: 'moon-elf',
        });

        // 2. 等待测试工具就绪
        await waitForTestHarness(page);

        // 3. 注入状态：玩家 0 有多个状态效果
        await page.evaluate(() => {
            window.__BG_TEST_HARNESS__!.state.patch({
                'players.0.statusEffects': { poison: 2, burn: 1 },
            });
        });

        // 4. 验证状态已注入
        const state = await readCoreState(page);
        expect(state.players['0'].statusEffects.poison).toBe(2);
        expect(state.players['0'].statusEffects.burn).toBe(1);

        // 5. 触发移除状态交互（使用调试面板）
        // 打开调试面板
        await page.click('[data-testid="debug-panel-toggle"]');
        
        // 等待调试面板展开
        await page.waitForSelector('[data-testid="debug-panel-content"]', { state: 'visible' });

        // 点击"移除状态"按钮（假设调试面板有此功能）
        // 如果没有，我们需要通过命令直接创建交互
        await page.evaluate(() => {
            // 直接创建一个状态选择交互
            window.__BG_TEST_HARNESS__!.command.dispatch({
                type: 'CREATE_STATUS_INTERACTION',
                payload: {
                    kind: 'selectStatus',
                    playerId: '0',
                    titleKey: 'interaction.selectStatusToRemove',
                    selectCount: 1,
                    targetPlayerIds: ['0'],
                },
            });
        });

        // 6. 验证弹窗显示
        await expect(page.locator('text=选择要移除的状态效果')).toBeVisible({ timeout: 5000 });

        // 7. 验证取消按钮存在且可用
        const cancelButton = page.locator('button:has-text("取消")');
        await expect(cancelButton).toBeVisible();
        await expect(cancelButton).toBeEnabled();

        // 8. 验证确认按钮存在（初始应该禁用，因为没有选择）
        const confirmButton = page.locator('button:has-text("确认")');
        await expect(confirmButton).toBeVisible();
        await expect(confirmButton).toBeDisabled();

        // 9. 选择一个状态
        await page.click('[data-testid="status-badge-poison"]');

        // 10. 验证确认按钮变为可用
        await expect(confirmButton).toBeEnabled();

        // 11. 点击取消按钮
        await cancelButton.click();

        // 12. 验证弹窗关闭
        await expect(page.locator('text=选择要移除的状态效果')).not.toBeVisible();

        // 13. 验证状态未改变
        const finalState = await readCoreState(page);
        expect(finalState.players['0'].statusEffects.poison).toBe(2);
        expect(finalState.players['0'].statusEffects.burn).toBe(1);
    });

    test('should close interaction without changes when cancel is clicked', async ({ page }) => {
        // 1. 创建对局
        const { roomId } = await setupOnlineMatch(page, 'dicethrone', {
            player0Character: 'barbarian',
            player1Character: 'moon-elf',
        });

        // 2. 等待测试工具就绪
        await waitForTestHarness(page);

        // 3. 注入状态：玩家 0 有状态效果
        await page.evaluate(() => {
            window.__BG_TEST_HARNESS__!.state.patch({
                'players.0.statusEffects': { poison: 3 },
            });
        });

        // 4. 创建状态选择交互
        await page.evaluate(() => {
            window.__BG_TEST_HARNESS__!.command.dispatch({
                type: 'CREATE_STATUS_INTERACTION',
                payload: {
                    kind: 'selectStatus',
                    playerId: '0',
                    titleKey: 'interaction.selectStatusToRemove',
                    selectCount: 1,
                    targetPlayerIds: ['0'],
                },
            });
        });

        // 5. 等待弹窗显示
        await expect(page.locator('text=选择要移除的状态效果')).toBeVisible();

        // 6. 选择一个状态
        await page.click('[data-testid="status-badge-poison"]');

        // 7. 点击取消（不是确认）
        await page.click('button:has-text("取消")');

        // 8. 验证弹窗关闭
        await expect(page.locator('text=选择要移除的状态效果')).not.toBeVisible();

        // 9. 验证状态未改变（仍然是 3 层中毒）
        const finalState = await readCoreState(page);
        expect(finalState.players['0'].statusEffects.poison).toBe(3);
    });
});
