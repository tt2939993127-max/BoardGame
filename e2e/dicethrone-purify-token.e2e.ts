/**
 * 净化（Purify）Token E2E 测试
 * 
 * 测试场景：
 * 1. 净化可以移除单个 debuff
 * 2. 有多个 debuff 时可以选择移除哪个
 * 3. 无 debuff 时不能使用净化
 * 4. 净化消耗后正确减少层数
 */

import { test, expect } from '@playwright/test';

test.describe('净化 Token 机制', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto('/play/dicethrone/local');
        await page.waitForLoadState('networkidle');
    });

    test('净化应该可以移除 debuff', async ({ page }) => {
        // 1. 选择僧侣 vs 野蛮人
        await page.getByRole('button', { name: /僧侣|Monk/i }).click();
        await page.getByRole('button', { name: /野蛮人|Barbarian/i }).click();
        await page.getByRole('button', { name: /开始游戏|Start Game/i }).click();

        await page.waitForSelector('[data-testid="game-board"]', { timeout: 10000 });

        // 2. 给僧侣添加击倒状态
        await page.evaluate(() => {
            const dispatch = (window as any).__BG_DISPATCH__;
            if (dispatch) {
                dispatch({
                    type: 'CHEAT_MODIFY_TOKENS',
                    payload: {
                        playerId: '0', // 僧侣是玩家 0
                        tokenId: 'knockdown',
                        amount: 1,
                    },
                });
            }
        });

        await page.waitForTimeout(500);

        // 3. 验证击倒状态存在
        const knockdownToken = page.locator('[data-token-id="knockdown"]').first();
        await expect(knockdownToken).toBeVisible();

        // 4. 给僧侣添加净化 token
        await page.evaluate(() => {
            const dispatch = (window as any).__BG_DISPATCH__;
            if (dispatch) {
                dispatch({
                    type: 'CHEAT_MODIFY_TOKENS',
                    payload: {
                        playerId: '0',
                        tokenId: 'purify',
                        amount: 1,
                    },
                });
            }
        });

        await page.waitForTimeout(500);

        const purifyToken = page.locator('[data-token-id="purify"]').first();
        await expect(purifyToken).toBeVisible();

        // 5. 使用净化移除击倒
        await page.evaluate(() => {
            const dispatch = (window as any).__BG_DISPATCH__;
            if (dispatch) {
                dispatch({
                    type: 'USE_TOKEN',
                    payload: {
                        tokenId: 'purify',
                        amount: 1,
                        targetStatusId: 'knockdown',
                    },
                });
            }
        });

        await page.waitForTimeout(1000);

        // 6. 验证击倒被移除
        await expect(knockdownToken).not.toBeVisible();

        // 7. 验证净化被消耗
        await expect(purifyToken).not.toBeVisible();
    });

    test('净化应该可以移除中毒', async ({ page }) => {
        // 1. 选择僧侣 vs 影贼
        await page.getByRole('button', { name: /僧侣|Monk/i }).click();
        await page.getByRole('button', { name: /影贼|Shadow Thief/i }).click();
        await page.getByRole('button', { name: /开始游戏|Start Game/i }).click();

        await page.waitForSelector('[data-testid="game-board"]', { timeout: 10000 });

        // 2. 给僧侣添加 3 层中毒
        await page.evaluate(() => {
            const dispatch = (window as any).__BG_DISPATCH__;
            if (dispatch) {
                dispatch({
                    type: 'CHEAT_MODIFY_TOKENS',
                    payload: {
                        playerId: '0',
                        tokenId: 'poison',
                        amount: 3,
                    },
                });
            }
        });

        await page.waitForTimeout(500);

        const poisonToken = page.locator('[data-token-id="poison"]').first();
        await expect(poisonToken).toBeVisible();
        await expect(poisonToken).toContainText('3');

        // 3. 给僧侣添加净化
        await page.evaluate(() => {
            const dispatch = (window as any).__BG_DISPATCH__;
            if (dispatch) {
                dispatch({
                    type: 'CHEAT_MODIFY_TOKENS',
                    payload: {
                        playerId: '0',
                        tokenId: 'purify',
                        amount: 1,
                    },
                });
            }
        });

        await page.waitForTimeout(500);

        // 4. 使用净化移除中毒
        await page.evaluate(() => {
            const dispatch = (window as any).__BG_DISPATCH__;
            if (dispatch) {
                dispatch({
                    type: 'USE_TOKEN',
                    payload: {
                        tokenId: 'purify',
                        amount: 1,
                        targetStatusId: 'poison',
                    },
                });
            }
        });

        await page.waitForTimeout(1000);

        // 5. 验证中毒被完全移除（所有层数）
        await expect(poisonToken).not.toBeVisible();
    });

    test('净化应该可以移除燃烧', async ({ page }) => {
        // 1. 选择僧侣 vs 炎术士
        await page.getByRole('button', { name: /僧侣|Monk/i }).click();
        await page.getByRole('button', { name: /炎术士|Pyromancer/i }).click();
        await page.getByRole('button', { name: /开始游戏|Start Game/i }).click();

        await page.waitForSelector('[data-testid="game-board"]', { timeout: 10000 });

        // 2. 给僧侣添加燃烧
        await page.evaluate(() => {
            const dispatch = (window as any).__BG_DISPATCH__;
            if (dispatch) {
                dispatch({
                    type: 'CHEAT_MODIFY_TOKENS',
                    payload: {
                        playerId: '0',
                        tokenId: 'burn',
                        amount: 2,
                    },
                });
            }
        });

        await page.waitForTimeout(500);

        const burnToken = page.locator('[data-token-id="burn"]').first();
        await expect(burnToken).toBeVisible();

        // 3. 给僧侣添加净化
        await page.evaluate(() => {
            const dispatch = (window as any).__BG_DISPATCH__;
            if (dispatch) {
                dispatch({
                    type: 'CHEAT_MODIFY_TOKENS',
                    payload: {
                        playerId: '0',
                        tokenId: 'purify',
                        amount: 1,
                    },
                });
            }
        });

        await page.waitForTimeout(500);

        // 4. 使用净化移除燃烧
        await page.evaluate(() => {
            const dispatch = (window as any).__BG_DISPATCH__;
            if (dispatch) {
                dispatch({
                    type: 'USE_TOKEN',
                    payload: {
                        tokenId: 'purify',
                        amount: 1,
                        targetStatusId: 'burn',
                    },
                });
            }
        });

        await page.waitForTimeout(1000);

        // 5. 验证燃烧被移除
        await expect(burnToken).not.toBeVisible();
    });

    test('有多个 debuff 时应该可以选择移除哪个', async ({ page }) => {
        // 1. 选择僧侣 vs 炎术士
        await page.getByRole('button', { name: /僧侣|Monk/i }).click();
        await page.getByRole('button', { name: /炎术士|Pyromancer/i }).click();
        await page.getByRole('button', { name: /开始游戏|Start Game/i }).click();

        await page.waitForSelector('[data-testid="game-board"]', { timeout: 10000 });

        // 2. 给僧侣添加多个 debuff
        await page.evaluate(() => {
            const dispatch = (window as any).__BG_DISPATCH__;
            if (dispatch) {
                dispatch({
                    type: 'CHEAT_MODIFY_TOKENS',
                    payload: {
                        playerId: '0',
                        tokenId: 'burn',
                        amount: 2,
                    },
                });
                dispatch({
                    type: 'CHEAT_MODIFY_TOKENS',
                    payload: {
                        playerId: '0',
                        tokenId: 'knockdown',
                        amount: 1,
                    },
                });
            }
        });

        await page.waitForTimeout(500);

        const burnToken = page.locator('[data-token-id="burn"]').first();
        const knockdownToken = page.locator('[data-token-id="knockdown"]').first();
        await expect(burnToken).toBeVisible();
        await expect(knockdownToken).toBeVisible();

        // 3. 给僧侣添加净化
        await page.evaluate(() => {
            const dispatch = (window as any).__BG_DISPATCH__;
            if (dispatch) {
                dispatch({
                    type: 'CHEAT_MODIFY_TOKENS',
                    payload: {
                        playerId: '0',
                        tokenId: 'purify',
                        amount: 1,
                    },
                });
            }
        });

        await page.waitForTimeout(500);

        // 4. 使用净化移除击倒（选择性移除）
        await page.evaluate(() => {
            const dispatch = (window as any).__BG_DISPATCH__;
            if (dispatch) {
                dispatch({
                    type: 'USE_TOKEN',
                    payload: {
                        tokenId: 'purify',
                        amount: 1,
                        targetStatusId: 'knockdown',
                    },
                });
            }
        });

        await page.waitForTimeout(1000);

        // 5. 验证击倒被移除，燃烧仍然存在
        await expect(knockdownToken).not.toBeVisible();
        await expect(burnToken).toBeVisible();
    });

    test('多层净化可以移除多个 debuff', async ({ page }) => {
        // 1. 选择僧侣 vs 炎术士
        await page.getByRole('button', { name: /僧侣|Monk/i }).click();
        await page.getByRole('button', { name: /炎术士|Pyromancer/i }).click();
        await page.getByRole('button', { name: /开始游戏|Start Game/i }).click();

        await page.waitForSelector('[data-testid="game-board"]', { timeout: 10000 });

        // 2. 给僧侣添加多个 debuff
        await page.evaluate(() => {
            const dispatch = (window as any).__BG_DISPATCH__;
            if (dispatch) {
                dispatch({
                    type: 'CHEAT_MODIFY_TOKENS',
                    payload: {
                        playerId: '0',
                        tokenId: 'burn',
                        amount: 2,
                    },
                });
                dispatch({
                    type: 'CHEAT_MODIFY_TOKENS',
                    payload: {
                        playerId: '0',
                        tokenId: 'knockdown',
                        amount: 1,
                    },
                });
            }
        });

        await page.waitForTimeout(500);

        // 3. 给僧侣添加 2 层净化
        await page.evaluate(() => {
            const dispatch = (window as any).__BG_DISPATCH__;
            if (dispatch) {
                dispatch({
                    type: 'CHEAT_MODIFY_TOKENS',
                    payload: {
                        playerId: '0',
                        tokenId: 'purify',
                        amount: 2,
                    },
                });
            }
        });

        await page.waitForTimeout(500);

        const purifyToken = page.locator('[data-token-id="purify"]').first();
        await expect(purifyToken).toContainText('2');

        // 4. 使用第一层净化移除燃烧
        await page.evaluate(() => {
            const dispatch = (window as any).__BG_DISPATCH__;
            if (dispatch) {
                dispatch({
                    type: 'USE_TOKEN',
                    payload: {
                        tokenId: 'purify',
                        amount: 1,
                        targetStatusId: 'burn',
                    },
                });
            }
        });

        await page.waitForTimeout(1000);

        const burnToken = page.locator('[data-token-id="burn"]').first();
        await expect(burnToken).not.toBeVisible();
        await expect(purifyToken).toContainText('1'); // 剩余 1 层

        // 5. 使用第二层净化移除击倒
        await page.evaluate(() => {
            const dispatch = (window as any).__BG_DISPATCH__;
            if (dispatch) {
                dispatch({
                    type: 'USE_TOKEN',
                    payload: {
                        tokenId: 'purify',
                        amount: 1,
                        targetStatusId: 'knockdown',
                    },
                });
            }
        });

        await page.waitForTimeout(1000);

        const knockdownToken = page.locator('[data-token-id="knockdown"]').first();
        await expect(knockdownToken).not.toBeVisible();
        await expect(purifyToken).not.toBeVisible(); // 完全消耗
    });

    test('无 debuff 时不应该能使用净化', async ({ page }) => {
        // 1. 选择僧侣 vs 圣骑士
        await page.getByRole('button', { name: /僧侣|Monk/i }).click();
        await page.getByRole('button', { name: /圣骑士|Paladin/i }).click();
        await page.getByRole('button', { name: /开始游戏|Start Game/i }).click();

        await page.waitForSelector('[data-testid="game-board"]', { timeout: 10000 });

        // 2. 给僧侣添加净化（但没有 debuff）
        await page.evaluate(() => {
            const dispatch = (window as any).__BG_DISPATCH__;
            if (dispatch) {
                dispatch({
                    type: 'CHEAT_MODIFY_TOKENS',
                    payload: {
                        playerId: '0',
                        tokenId: 'purify',
                        amount: 1,
                    },
                });
            }
        });

        await page.waitForTimeout(500);

        const purifyToken = page.locator('[data-token-id="purify"]').first();
        await expect(purifyToken).toBeVisible();

        // 3. 尝试使用净化（应该失败或无效）
        const purifyCountBefore = await page.evaluate(() => {
            const state = (window as any).__BG_STATE__;
            return state?.players?.['0']?.tokens?.purify ?? 0;
        });

        await page.evaluate(() => {
            const dispatch = (window as any).__BG_DISPATCH__;
            if (dispatch) {
                try {
                    dispatch({
                        type: 'USE_TOKEN',
                        payload: {
                            tokenId: 'purify',
                            amount: 1,
                        },
                    });
                } catch (e) {
                    // 预期会失败
                }
            }
        });

        await page.waitForTimeout(1000);

        // 4. 验证净化未被消耗
        const purifyCountAfter = await page.evaluate(() => {
            const state = (window as any).__BG_STATE__;
            return state?.players?.['0']?.tokens?.purify ?? 0;
        });
        expect(purifyCountAfter).toBe(purifyCountBefore);
    });

    test('净化不能移除 buff（只能移除 debuff）', async ({ page }) => {
        // 1. 选择僧侣 vs 圣骑士
        await page.getByRole('button', { name: /僧侣|Monk/i }).click();
        await page.getByRole('button', { name: /圣骑士|Paladin/i }).click();
        await page.getByRole('button', { name: /开始游戏|Start Game/i }).click();

        await page.waitForSelector('[data-testid="game-board"]', { timeout: 10000 });

        // 2. 给僧侣添加太极（buff）
        await page.evaluate(() => {
            const dispatch = (window as any).__BG_DISPATCH__;
            if (dispatch) {
                dispatch({
                    type: 'CHEAT_MODIFY_TOKENS',
                    payload: {
                        playerId: '0',
                        tokenId: 'taiji',
                        amount: 3,
                    },
                });
            }
        });

        await page.waitForTimeout(500);

        const taijiToken = page.locator('[data-token-id="taiji"]').first();
        await expect(taijiToken).toBeVisible();

        // 3. 给僧侣添加净化
        await page.evaluate(() => {
            const dispatch = (window as any).__BG_DISPATCH__;
            if (dispatch) {
                dispatch({
                    type: 'CHEAT_MODIFY_TOKENS',
                    payload: {
                        playerId: '0',
                        tokenId: 'purify',
                        amount: 1,
                    },
                });
            }
        });

        await page.waitForTimeout(500);

        // 4. 尝试使用净化移除太极（应该失败）
        await page.evaluate(() => {
            const dispatch = (window as any).__BG_DISPATCH__;
            if (dispatch) {
                try {
                    dispatch({
                        type: 'USE_TOKEN',
                        payload: {
                            tokenId: 'purify',
                            amount: 1,
                            targetStatusId: 'taiji',
                        },
                    });
                } catch (e) {
                    // 预期会失败
                }
            }
        });

        await page.waitForTimeout(1000);

        // 5. 验证太极仍然存在
        await expect(taijiToken).toBeVisible();
        await expect(taijiToken).toContainText('3');
    });
});
