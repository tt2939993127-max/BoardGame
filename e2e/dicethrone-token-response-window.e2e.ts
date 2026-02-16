/**
 * Token 响应窗口完整流程 E2E 测试
 * 
 * 测试场景：
 * 1. 攻击方有加伤 token 时打开响应窗口
 * 2. 防御方有减伤 token 时打开响应窗口
 * 3. 可以选择使用多层 token
 * 4. 跳过响应窗口
 * 5. 太极双时机（攻击加伤，防御减伤）
 */

import { test, expect } from '@playwright/test';

test.describe('Token 响应窗口完整流程', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto('/play/dicethrone/local');
        await page.waitForLoadState('networkidle');
    });

    test('攻击方有暴击 token 时应该打开响应窗口', async ({ page }) => {
        // 1. 选择圣骑士 vs 影贼
        await page.getByRole('button', { name: /圣骑士|Paladin/i }).click();
        await page.getByRole('button', { name: /影贼|Shadow Thief/i }).click();
        await page.getByRole('button', { name: /开始游戏|Start Game/i }).click();

        await page.waitForSelector('[data-testid="game-board"]', { timeout: 10000 });

        // 2. 给圣骑士添加 2 层暴击 token
        await page.evaluate(() => {
            const dispatch = (window as any).__BG_DISPATCH__;
            if (dispatch) {
                dispatch({
                    type: 'CHEAT_MODIFY_TOKENS',
                    payload: {
                        playerId: '0',
                        tokenId: 'crit',
                        amount: 2,
                    },
                });
            }
        });

        await page.waitForTimeout(500);

        // 3. 模拟攻击造成 5 点伤害
        await page.evaluate(() => {
            const dispatch = (window as any).__BG_DISPATCH__;
            if (dispatch) {
                // 创建待处理伤害
                dispatch({
                    type: 'CHEAT_CREATE_PENDING_DAMAGE',
                    payload: {
                        sourcePlayerId: '0',
                        targetPlayerId: '1',
                        damage: 5,
                        responseType: 'beforeDamageDealt',
                    },
                });
            }
        });

        await page.waitForTimeout(1000);

        // 4. 验证响应窗口打开
        const responseWindow = page.locator('[data-testid="token-response-window"]');
        await expect(responseWindow).toBeVisible({ timeout: 5000 });

        // 5. 验证暴击 token 可选
        const critToken = responseWindow.locator('[data-token-id="crit"]');
        await expect(critToken).toBeVisible();
        await expect(critToken).toContainText('2'); // 2 层

        // 6. 选择使用 1 层暴击
        const useButton = critToken.locator('button', { hasText: /使用|Use/i });
        await useButton.click();

        await page.waitForTimeout(1000);

        // 7. 验证伤害增加
        const pendingDamage = await page.evaluate(() => {
            const state = (window as any).__BG_STATE__;
            return state?.pendingDamage?.currentDamage ?? 0;
        });
        expect(pendingDamage).toBe(6); // 5 + 1

        // 8. 确认响应
        const confirmButton = responseWindow.locator('button', { hasText: /确认|Confirm/i });
        await confirmButton.click();

        await page.waitForTimeout(1000);

        // 9. 验证响应窗口关闭
        await expect(responseWindow).not.toBeVisible();

        // 10. 验证暴击 token 减少 1 层
        const critTokenAfter = await page.evaluate(() => {
            const state = (window as any).__BG_STATE__;
            return state?.players?.['0']?.tokens?.crit ?? 0;
        });
        expect(critTokenAfter).toBe(1);
    });

    test('防御方有守护 token 时应该打开响应窗口', async ({ page }) => {
        // 1. 选择圣骑士 vs 影贼
        await page.getByRole('button', { name: /圣骑士|Paladin/i }).click();
        await page.getByRole('button', { name: /影贼|Shadow Thief/i }).click();
        await page.getByRole('button', { name: /开始游戏|Start Game/i }).click();

        await page.waitForSelector('[data-testid="game-board"]', { timeout: 10000 });

        // 2. 给影贼添加 3 层守护 token
        await page.evaluate(() => {
            const dispatch = (window as any).__BG_DISPATCH__;
            if (dispatch) {
                dispatch({
                    type: 'CHEAT_MODIFY_TOKENS',
                    payload: {
                        playerId: '1',
                        tokenId: 'protect',
                        amount: 3,
                    },
                });
            }
        });

        await page.waitForTimeout(500);

        // 3. 模拟攻击造成 5 点伤害
        await page.evaluate(() => {
            const dispatch = (window as any).__BG_DISPATCH__;
            if (dispatch) {
                dispatch({
                    type: 'CHEAT_CREATE_PENDING_DAMAGE',
                    payload: {
                        sourcePlayerId: '0',
                        targetPlayerId: '1',
                        damage: 5,
                        responseType: 'beforeDamageReceived',
                    },
                });
            }
        });

        await page.waitForTimeout(1000);

        // 4. 验证响应窗口打开
        const responseWindow = page.locator('[data-testid="token-response-window"]');
        await expect(responseWindow).toBeVisible({ timeout: 5000 });

        // 5. 验证守护 token 可选
        const protectToken = responseWindow.locator('[data-token-id="protect"]');
        await expect(protectToken).toBeVisible();
        await expect(protectToken).toContainText('3');

        // 6. 选择使用 2 层守护
        const amountInput = protectToken.locator('input[type="number"]');
        await amountInput.fill('2');

        const useButton = protectToken.locator('button', { hasText: /使用|Use/i });
        await useButton.click();

        await page.waitForTimeout(1000);

        // 7. 验证伤害减少
        const pendingDamage = await page.evaluate(() => {
            const state = (window as any).__BG_STATE__;
            return state?.pendingDamage?.currentDamage ?? 0;
        });
        expect(pendingDamage).toBe(3); // 5 - 2

        // 8. 确认响应
        const confirmButton = responseWindow.locator('button', { hasText: /确认|Confirm/i });
        await confirmButton.click();

        await page.waitForTimeout(1000);

        // 9. 验证守护 token 减少 2 层
        const protectTokenAfter = await page.evaluate(() => {
            const state = (window as any).__BG_STATE__;
            return state?.players?.['1']?.tokens?.protect ?? 0;
        });
        expect(protectTokenAfter).toBe(1);
    });

    test('应该可以跳过响应窗口', async ({ page }) => {
        // 1. 选择圣骑士 vs 影贼
        await page.getByRole('button', { name: /圣骑士|Paladin/i }).click();
        await page.getByRole('button', { name: /影贼|Shadow Thief/i }).click();
        await page.getByRole('button', { name: /开始游戏|Start Game/i }).click();

        await page.waitForSelector('[data-testid="game-board"]', { timeout: 10000 });

        // 2. 给圣骑士添加暴击 token
        await page.evaluate(() => {
            const dispatch = (window as any).__BG_DISPATCH__;
            if (dispatch) {
                dispatch({
                    type: 'CHEAT_MODIFY_TOKENS',
                    payload: {
                        playerId: '0',
                        tokenId: 'crit',
                        amount: 1,
                    },
                });
            }
        });

        await page.waitForTimeout(500);

        // 3. 模拟攻击
        await page.evaluate(() => {
            const dispatch = (window as any).__BG_DISPATCH__;
            if (dispatch) {
                dispatch({
                    type: 'CHEAT_CREATE_PENDING_DAMAGE',
                    payload: {
                        sourcePlayerId: '0',
                        targetPlayerId: '1',
                        damage: 5,
                        responseType: 'beforeDamageDealt',
                    },
                });
            }
        });

        await page.waitForTimeout(1000);

        // 4. 验证响应窗口打开
        const responseWindow = page.locator('[data-testid="token-response-window"]');
        await expect(responseWindow).toBeVisible({ timeout: 5000 });

        // 5. 点击跳过按钮
        const skipButton = responseWindow.locator('button', { hasText: /跳过|Skip/i });
        await skipButton.click();

        await page.waitForTimeout(1000);

        // 6. 验证响应窗口关闭
        await expect(responseWindow).not.toBeVisible();

        // 7. 验证伤害未修改
        const pendingDamage = await page.evaluate(() => {
            const state = (window as any).__BG_STATE__;
            return state?.pendingDamage?.currentDamage ?? 0;
        });
        expect(pendingDamage).toBe(5); // 未修改

        // 8. 验证 token 未消耗
        const critTokenAfter = await page.evaluate(() => {
            const state = (window as any).__BG_STATE__;
            return state?.players?.['0']?.tokens?.crit ?? 0;
        });
        expect(critTokenAfter).toBe(1);
    });

    test('太极 token 在攻击时应该加伤', async ({ page }) => {
        // 1. 选择僧侣 vs 圣骑士
        await page.getByRole('button', { name: /僧侣|Monk/i }).click();
        await page.getByRole('button', { name: /圣骑士|Paladin/i }).click();
        await page.getByRole('button', { name: /开始游戏|Start Game/i }).click();

        await page.waitForSelector('[data-testid="game-board"]', { timeout: 10000 });

        // 2. 给僧侣添加太极 token
        await page.evaluate(() => {
            const dispatch = (window as any).__BG_DISPATCH__;
            if (dispatch) {
                dispatch({
                    type: 'CHEAT_MODIFY_TOKENS',
                    payload: {
                        playerId: '0',
                        tokenId: 'taiji',
                        amount: 2,
                    },
                });
            }
        });

        await page.waitForTimeout(500);

        // 3. 模拟攻击（beforeDamageDealt）
        await page.evaluate(() => {
            const dispatch = (window as any).__BG_DISPATCH__;
            if (dispatch) {
                dispatch({
                    type: 'CHEAT_CREATE_PENDING_DAMAGE',
                    payload: {
                        sourcePlayerId: '0',
                        targetPlayerId: '1',
                        damage: 5,
                        responseType: 'beforeDamageDealt',
                    },
                });
            }
        });

        await page.waitForTimeout(1000);

        // 4. 验证响应窗口打开
        const responseWindow = page.locator('[data-testid="token-response-window"]');
        await expect(responseWindow).toBeVisible({ timeout: 5000 });

        // 5. 使用 1 层太极
        const taijiToken = responseWindow.locator('[data-token-id="taiji"]');
        const useButton = taijiToken.locator('button', { hasText: /使用|Use/i });
        await useButton.click();

        await page.waitForTimeout(1000);

        // 6. 验证伤害增加（攻击时 +1）
        const pendingDamage = await page.evaluate(() => {
            const state = (window as any).__BG_STATE__;
            return state?.pendingDamage?.currentDamage ?? 0;
        });
        expect(pendingDamage).toBe(6); // 5 + 1
    });

    test('太极 token 在防御时应该减伤', async ({ page }) => {
        // 1. 选择僧侣 vs 圣骑士
        await page.getByRole('button', { name: /僧侣|Monk/i }).click();
        await page.getByRole('button', { name: /圣骑士|Paladin/i }).click();
        await page.getByRole('button', { name: /开始游戏|Start Game/i }).click();

        await page.waitForSelector('[data-testid="game-board"]', { timeout: 10000 });

        // 2. 给僧侣添加太极 token
        await page.evaluate(() => {
            const dispatch = (window as any).__BG_DISPATCH__;
            if (dispatch) {
                dispatch({
                    type: 'CHEAT_MODIFY_TOKENS',
                    payload: {
                        playerId: '0',
                        tokenId: 'taiji',
                        amount: 2,
                    },
                });
            }
        });

        await page.waitForTimeout(500);

        // 3. 模拟受到攻击（beforeDamageReceived）
        await page.evaluate(() => {
            const dispatch = (window as any).__BG_DISPATCH__;
            if (dispatch) {
                dispatch({
                    type: 'CHEAT_CREATE_PENDING_DAMAGE',
                    payload: {
                        sourcePlayerId: '1',
                        targetPlayerId: '0',
                        damage: 5,
                        responseType: 'beforeDamageReceived',
                    },
                });
            }
        });

        await page.waitForTimeout(1000);

        // 4. 验证响应窗口打开
        const responseWindow = page.locator('[data-testid="token-response-window"]');
        await expect(responseWindow).toBeVisible({ timeout: 5000 });

        // 5. 使用 1 层太极
        const taijiToken = responseWindow.locator('[data-token-id="taiji"]');
        const useButton = taijiToken.locator('button', { hasText: /使用|Use/i });
        await useButton.click();

        await page.waitForTimeout(1000);

        // 6. 验证伤害减少（防御时 -1）
        const pendingDamage = await page.evaluate(() => {
            const state = (window as any).__BG_STATE__;
            return state?.pendingDamage?.currentDamage ?? 0;
        });
        expect(pendingDamage).toBe(4); // 5 - 1
    });
});
