/**
 * DiceThrone - 雷霆万钧技能 E2E 测试
 * 
 * 测试场景：
 * 1. 触发雷霆万钧技能（3个掌面）
 * 2. 验证投掷3个奖励骰
 * 3. 验证重掷交互显示（有太极标记时）
 * 
 * 使用 TestHarness 控制骰子投掷，确保测试稳定可靠。
 */

import { test, expect } from '@playwright/test';
import {
    setupDTOnlineMatch,
    selectCharacter,
    readyAndStartGame,
    waitForGameBoard,
} from './helpers/dicethrone';
import { waitForTestHarness } from './helpers/common';

test.describe('DiceThrone - 雷霆万钧技能', () => {
    test('应该正确显示奖励骰投掷和重掷交互（有太极标记）', async ({ browser }, testInfo) => {
        test.setTimeout(120000);
        const baseURL = testInfo.project.use.baseURL as string | undefined;

        const setup = await setupDTOnlineMatch(browser, baseURL);
        
        if (!setup) {
            test.skip(true, '游戏服务器不可用或创建房间失败');
            return;
        }
        
        const { hostPage, guestPage, hostContext, guestContext, matchId } = setup;

        console.log(`[Test] 对局创建成功: ${matchId}`);

        // 选择角色：都选武僧
        await selectCharacter(hostPage, 'monk');
        await selectCharacter(guestPage, 'monk');
        console.log('[Test] 角色选择完成');

        // 准备并开始游戏
        await readyAndStartGame(hostPage, guestPage);
        console.log('[Test] 游戏开始');

        // 等待游戏棋盘加载
        await waitForGameBoard(hostPage);
        await waitForGameBoard(guestPage);
        console.log('[Test] 游戏棋盘已加载');

        // 等待测试工具就绪
        await waitForTestHarness(hostPage);
        console.log('[Test] 测试工具已就绪');

        // 检查测试工具状态
        const status = await hostPage.evaluate(() => {
            return window.__BG_TEST_HARNESS__!.getStatus();
        });
        console.log('[Test] 测试工具状态:', status);

        // 修改状态：添加太极标记
        await hostPage.evaluate(() => {
            window.__BG_TEST_HARNESS__!.state.patch({
                core: {
                    players: {
                        '0': {
                            tokens: { taiji: 2 }
                        }
                    }
                }
            });
        });
        console.log('[Test] 已设置玩家0有2个太极标记');

        // 等待状态更新
        await hostPage.waitForTimeout(500);

        // 关闭调试面板（避免遮挡按钮）
        const debugPanel = hostPage.getByTestId('debug-panel');
        if (await debugPanel.isVisible().catch(() => false)) {
            await hostPage.getByTestId('debug-toggle').click();
            await hostPage.waitForTimeout(300);
        }

        // 推进到 offensiveRoll 阶段（如果还没有）
        const currentPhase = await hostPage.evaluate(() => {
            const state = window.__BG_TEST_HARNESS__!.state.get();
            return state?.sys?.phase;
        });
        
        if (currentPhase !== 'offensiveRoll') {
            // 点击推进阶段按钮
            const advanceButton = hostPage.locator('button').filter({ hasText: /推进阶段|Advance Phase/i });
            if (await advanceButton.isVisible().catch(() => false)) {
                await advanceButton.click();
                await hostPage.waitForTimeout(1000);
            }
        }

        // 注入骰子值：3个掌面（值为3）+ 2个拳头（值为1）
        // 武僧骰子映射：1,2=拳头 3=掌 4,5=太极 6=莲花
        await hostPage.evaluate(() => {
            window.__BG_TEST_HARNESS__!.dice.setValues([3, 3, 3, 1, 1]);
        });
        console.log('[Test] 已注入骰子值: [3,3,3,1,1]（3个掌面）');

        // 点击掷骰按钮
        const rollButton = hostPage.locator('[data-tutorial-id="dice-roll-button"]');
        await expect(rollButton).toBeVisible({ timeout: 5000 });
        await rollButton.click();
        console.log('[Test] 已点击掷骰按钮');

        // 等待掷骰动画完成
        await hostPage.waitForTimeout(2500);

        // 点击确认按钮
        const confirmButton = hostPage.locator('button').filter({ hasText: /确认|Confirm/i });
        await expect(confirmButton).toBeVisible({ timeout: 5000 });
        await confirmButton.click();
        console.log('[Test] 已确认掷骰');

        // 等待技能按钮出现
        await hostPage.waitForTimeout(1000);

        // 验证骰子值
        const stateAfterConfirm = await hostPage.evaluate(() => {
            return window.__BG_TEST_HARNESS__!.state.get();
        });
        const diceValues = stateAfterConfirm.core.dice?.map((d: any) => d.value) || [];
        console.log('[Test] 骰子值:', diceValues);
        
        // 验证至少有3个掌面（值为3）
        const palmCount = diceValues.filter((v: number) => v === 3).length;
        expect(palmCount).toBeGreaterThanOrEqual(3);
        console.log('[Test] ✅ 骰子验证通过：有', palmCount, '个掌面');

        // 点击雷霆万钧技能按钮
        const thunderStrikeButton = hostPage.locator('button').filter({ hasText: /雷霆万钧|Thunder Strike/i });
        await expect(thunderStrikeButton).toBeVisible({ timeout: 5000 });
        await thunderStrikeButton.click();
        console.log('[Test] 已点击雷霆万钧技能');

        // 等待技能激活
        await hostPage.waitForTimeout(1000);

        // 推进阶段（offensiveRoll → defensiveRoll）
        const advanceButton1 = hostPage.locator('button').filter({ hasText: /推进阶段|Advance Phase/i });
        await expect(advanceButton1).toBeVisible({ timeout: 5000 });
        await advanceButton1.click();
        console.log('[Test] 已推进到防御阶段');

        // 等待进入防御阶段
        await hostPage.waitForTimeout(1000);

        // 注入 Guest 的骰子值（随意值，不影响测试）
        await guestPage.evaluate(() => {
            window.__BG_TEST_HARNESS__!.dice.setValues([1, 2, 3, 4, 5]);
        });

        // Guest 掷骰
        const guestRollButton = guestPage.locator('[data-tutorial-id="dice-roll-button"]');
        await expect(guestRollButton).toBeVisible({ timeout: 5000 });
        await guestRollButton.click();
        await guestPage.waitForTimeout(1500);

        // Guest 确认掷骰
        const guestConfirmButton = guestPage.locator('button').filter({ hasText: /确认|Confirm/i });
        await expect(guestConfirmButton).toBeVisible({ timeout: 5000 });
        await guestConfirmButton.click();
        console.log('[Test] Guest 已确认掷骰');

        // Guest 跳过防御技能
        await guestPage.waitForTimeout(1000);
        const passButton = guestPage.locator('button').filter({ hasText: /跳过|Pass/i });
        if (await passButton.isVisible().catch(() => false)) {
            await passButton.click();
            console.log('[Test] Guest 已跳过防御技能');
        }

        // Guest 推进阶段（defensiveRoll → main2，触发攻击结算）
        const advanceButton2 = guestPage.locator('button').filter({ hasText: /推进阶段|Advance Phase/i });
        await expect(advanceButton2).toBeVisible({ timeout: 5000 });
        await advanceButton2.click();
        console.log('[Test] 已推进到攻击结算');

        // 等待奖励骰投掷和重掷交互显示
        await hostPage.waitForTimeout(3000);

        // 读取最终状态
        const finalState = await hostPage.evaluate(() => {
            return window.__BG_TEST_HARNESS__!.state.get();
        });
        console.log('[Test] 最终状态:', {
            hasPendingBonusDice: !!finalState.core.pendingBonusDiceSettlement,
            bonusDiceCount: finalState.core.pendingBonusDiceSettlement?.dice?.length,
            rerollCostTokenId: finalState.core.pendingBonusDiceSettlement?.rerollCostTokenId,
            rerollCostAmount: finalState.core.pendingBonusDiceSettlement?.rerollCostAmount,
        });

        // 验证页面上是否显示重掷相关的文本
        const pageText = await hostPage.textContent('body');
        const hasRerollText = pageText?.includes('重掷') || 
                             pageText?.includes('reroll') || 
                             pageText?.includes('太极');
        
        console.log('[Test] 页面是否显示重掷文本:', hasRerollText);
        expect(hasRerollText).toBeTruthy();

        // 验证状态
        expect(finalState.core.pendingBonusDiceSettlement).toBeDefined();
        expect(finalState.core.pendingBonusDiceSettlement?.dice).toHaveLength(3);
        expect(finalState.core.pendingBonusDiceSettlement?.rerollCostTokenId).toBe('taiji');
        expect(finalState.core.pendingBonusDiceSettlement?.rerollCostAmount).toBe(2);
        
        console.log('[Test] ✅ 测试通过：奖励骰投掷和重掷交互正确显示');

        // 清理
        await guestContext.close();
        await hostContext.close();
    });
});
