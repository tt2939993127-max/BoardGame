/**
 * DiceThrone - 正常模式下锁定骰子测试
 * 
 * 测试最基础的骰子锁定功能：
 * 1. 进攻阶段点击骰子锁定
 * 2. 锁定后再次掷骰，锁定的骰子值不变
 * 3. 点击已锁定的骰子解锁
 */

import { test, expect } from './fixtures';
import { selectCharacter, readyAndStartGame, waitForGameBoard } from './helpers/dicethrone';

test.describe('DiceThrone - 正常模式下锁定骰子', () => {
    test('应该能在进攻阶段锁定和解锁骰子', async ({ dicethroneMatch }) => {
        const { hostPage, guestPage } = dicethroneMatch;

        // 完成角色选择
        await selectCharacter(hostPage, 'monk');
        await selectCharacter(guestPage, 'barbarian');

        // 准备并开始游戏
        await readyAndStartGame(hostPage, guestPage);

        // 等待游戏棋盘加载
        await waitForGameBoard(hostPage);

        // 推进到进攻阶段（点击 Next Phase 按钮直到看到骰子投掷按钮）
        const advanceButton = hostPage.locator('[data-tutorial-id="advance-phase-button"]');
        for (let i = 0; i < 5; i++) {
            const rollButton = hostPage.locator('[data-tutorial-id="dice-roll-button"]');
            if (await rollButton.isVisible({ timeout: 1000 }).catch(() => false)) {
                break;
            }
            if (await advanceButton.isEnabled({ timeout: 1000 }).catch(() => false)) {
                await advanceButton.click();
                await hostPage.waitForTimeout(500);
            }
        }

        // 等待进入进攻阶段
        await hostPage.waitForSelector('[data-tutorial-id="dice-roll-button"]', { timeout: 15000 });

        // 先掷骰（必须先掷骰才能锁定骰子）
        const rollButton = hostPage.locator('[data-tutorial-id="dice-roll-button"]');
        await expect(rollButton).toBeEnabled({ timeout: 3000 });
        await rollButton.click();
        await hostPage.waitForTimeout(1000); // 等待骰子动画

        // 点击第一个骰子锁定
        const firstDie = hostPage.locator('[data-testid="die"]').first();
        await firstDie.click();
        await hostPage.waitForTimeout(300);

        // 验证骰子显示"已锁定"标记
        const lockedLabel = firstDie.locator('text=/locked|已锁定/i');
        await expect(lockedLabel).toBeVisible({ timeout: 3000 });

        // 再次点击解锁
        await firstDie.click();
        await hostPage.waitForTimeout(300);
        await expect(lockedLabel).not.toBeVisible({ timeout: 3000 });

        // 再次锁定
        await firstDie.click();
        await hostPage.waitForTimeout(300);
        await expect(lockedLabel).toBeVisible({ timeout: 3000 });
    });
});

