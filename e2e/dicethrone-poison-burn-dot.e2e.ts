/**
 * 中毒（Poison）和燃烧（Burn）持续伤害 E2E 测试
 * 
 * 测试场景：
 * 1. 中毒在回合开始时造成伤害并减少层数
 * 2. 燃烧在回合开始时造成伤害并减少层数
 * 3. 多层中毒/燃烧正确计算伤害
 * 4. 层数递减到 0 后自动移除
 */

import { test, expect } from '@playwright/test';

test.describe('中毒和燃烧持续伤害机制', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto('/play/dicethrone/local');
        await page.waitForLoadState('networkidle');
    });

    test('中毒应该在回合开始时造成伤害并减少层数', async ({ page }) => {
        // 1. 选择影贼 vs 圣骑士
        await page.getByRole('button', { name: /影贼|Shadow Thief/i }).click();
        await page.getByRole('button', { name: /圣骑士|Paladin/i }).click();
        await page.getByRole('button', { name: /开始游戏|Start Game/i }).click();

        await page.waitForSelector('[data-testid="game-board"]', { timeout: 10000 });

        // 2. 给圣骑士添加 2 层中毒
        await page.evaluate(() => {
            const dispatch = (window as any).__BG_DISPATCH__;
            if (dispatch) {
                dispatch({
                    type: 'CHEAT_MODIFY_TOKENS',
                    payload: {
                        playerId: '1', // 圣骑士是玩家 1
                        tokenId: 'poison',
                        amount: 2,
                    },
                });
            }
        });

        await page.waitForTimeout(500);

        // 3. 验证中毒状态存在
        const poisonToken = page.locator('[data-token-id="poison"]').first();
        await expect(poisonToken).toBeVisible();
        await expect(poisonToken).toContainText('2');

        // 4. 记录圣骑士当前 HP
        const hpBefore = await page.evaluate(() => {
            const state = (window as any).__BG_STATE__;
            return state?.players?.['1']?.resources?.hp ?? 0;
        });

        // 5. 推进到圣骑士回合开始
        await page.evaluate(() => {
            const dispatch = (window as any).__BG_DISPATCH__;
            if (dispatch) {
                // 结束影贼回合
                dispatch({
                    type: 'CHEAT_END_TURN',
                });
            }
        });

        await page.waitForTimeout(1500);

        // 6. 验证圣骑士受到 2 点伤害（2 层中毒）
        const hpAfter = await page.evaluate(() => {
            const state = (window as any).__BG_STATE__;
            return state?.players?.['1']?.resources?.hp ?? 0;
        });
        expect(hpAfter).toBe(hpBefore - 2);

        // 7. 验证中毒减少 1 层
        await expect(poisonToken).toBeVisible();
        await expect(poisonToken).toContainText('1');
    });

    test('燃烧应该在回合开始时造成伤害并减少层数', async ({ page }) => {
        // 1. 选择炎术士 vs 圣骑士
        await page.getByRole('button', { name: /炎术士|Pyromancer/i }).click();
        await page.getByRole('button', { name: /圣骑士|Paladin/i }).click();
        await page.getByRole('button', { name: /开始游戏|Start Game/i }).click();

        await page.waitForSelector('[data-testid="game-board"]', { timeout: 10000 });

        // 2. 给圣骑士添加 3 层燃烧
        await page.evaluate(() => {
            const dispatch = (window as any).__BG_DISPATCH__;
            if (dispatch) {
                dispatch({
                    type: 'CHEAT_MODIFY_TOKENS',
                    payload: {
                        playerId: '1',
                        tokenId: 'burn',
                        amount: 3,
                    },
                });
            }
        });

        await page.waitForTimeout(500);

        // 3. 验证燃烧状态存在
        const burnToken = page.locator('[data-token-id="burn"]').first();
        await expect(burnToken).toBeVisible();
        await expect(burnToken).toContainText('3');

        // 4. 记录圣骑士当前 HP
        const hpBefore = await page.evaluate(() => {
            const state = (window as any).__BG_STATE__;
            return state?.players?.['1']?.resources?.hp ?? 0;
        });

        // 5. 推进到圣骑士回合开始
        await page.evaluate(() => {
            const dispatch = (window as any).__BG_DISPATCH__;
            if (dispatch) {
                dispatch({
                    type: 'CHEAT_END_TURN',
                });
            }
        });

        await page.waitForTimeout(1500);

        // 6. 验证圣骑士受到 3 点伤害（3 层燃烧）
        const hpAfter = await page.evaluate(() => {
            const state = (window as any).__BG_STATE__;
            return state?.players?.['1']?.resources?.hp ?? 0;
        });
        expect(hpAfter).toBe(hpBefore - 3);

        // 7. 验证燃烧减少 1 层
        await expect(burnToken).toBeVisible();
        await expect(burnToken).toContainText('2');
    });

    test('中毒层数递减到 0 后应该自动移除', async ({ page }) => {
        // 1. 选择影贼 vs 圣骑士
        await page.getByRole('button', { name: /影贼|Shadow Thief/i }).click();
        await page.getByRole('button', { name: /圣骑士|Paladin/i }).click();
        await page.getByRole('button', { name: /开始游戏|Start Game/i }).click();

        await page.waitForSelector('[data-testid="game-board"]', { timeout: 10000 });

        // 2. 给圣骑士添加 1 层中毒
        await page.evaluate(() => {
            const dispatch = (window as any).__BG_DISPATCH__;
            if (dispatch) {
                dispatch({
                    type: 'CHEAT_MODIFY_TOKENS',
                    payload: {
                        playerId: '1',
                        tokenId: 'poison',
                        amount: 1,
                    },
                });
            }
        });

        await page.waitForTimeout(500);

        const poisonToken = page.locator('[data-token-id="poison"]').first();
        await expect(poisonToken).toBeVisible();

        // 3. 推进到圣骑士回合开始
        await page.evaluate(() => {
            const dispatch = (window as any).__BG_DISPATCH__;
            if (dispatch) {
                dispatch({
                    type: 'CHEAT_END_TURN',
                });
            }
        });

        await page.waitForTimeout(1500);

        // 4. 验证中毒被完全移除
        await expect(poisonToken).not.toBeVisible();
    });

    test('多层中毒应该持续多个回合', async ({ page }) => {
        // 1. 选择影贼 vs 圣骑士
        await page.getByRole('button', { name: /影贼|Shadow Thief/i }).click();
        await page.getByRole('button', { name: /圣骑士|Paladin/i }).click();
        await page.getByRole('button', { name: /开始游戏|Start Game/i }).click();

        await page.waitForSelector('[data-testid="game-board"]', { timeout: 10000 });

        // 2. 给圣骑士添加 3 层中毒（上限）
        await page.evaluate(() => {
            const dispatch = (window as any).__BG_DISPATCH__;
            if (dispatch) {
                dispatch({
                    type: 'CHEAT_MODIFY_TOKENS',
                    payload: {
                        playerId: '1',
                        tokenId: 'poison',
                        amount: 3,
                    },
                });
            }
        });

        await page.waitForTimeout(500);

        const poisonToken = page.locator('[data-token-id="poison"]').first();
        await expect(poisonToken).toContainText('3');

        const hpInitial = await page.evaluate(() => {
            const state = (window as any).__BG_STATE__;
            return state?.players?.['1']?.resources?.hp ?? 0;
        });

        // 3. 第一个回合开始
        await page.evaluate(() => {
            const dispatch = (window as any).__BG_DISPATCH__;
            if (dispatch) {
                dispatch({
                    type: 'CHEAT_END_TURN',
                });
            }
        });

        await page.waitForTimeout(1500);

        let hpCurrent = await page.evaluate(() => {
            const state = (window as any).__BG_STATE__;
            return state?.players?.['1']?.resources?.hp ?? 0;
        });
        expect(hpCurrent).toBe(hpInitial - 3); // 受到 3 点伤害
        await expect(poisonToken).toContainText('2'); // 剩余 2 层

        // 4. 第二个回合开始
        await page.evaluate(() => {
            const dispatch = (window as any).__BG_DISPATCH__;
            if (dispatch) {
                // 圣骑士回合结束，回到影贼
                dispatch({
                    type: 'CHEAT_END_TURN',
                });
                // 影贼回合结束，回到圣骑士
                dispatch({
                    type: 'CHEAT_END_TURN',
                });
            }
        });

        await page.waitForTimeout(1500);

        hpCurrent = await page.evaluate(() => {
            const state = (window as any).__BG_STATE__;
            return state?.players?.['1']?.resources?.hp ?? 0;
        });
        expect(hpCurrent).toBe(hpInitial - 3 - 2); // 累计受到 5 点伤害
        await expect(poisonToken).toContainText('1'); // 剩余 1 层

        // 5. 第三个回合开始
        await page.evaluate(() => {
            const dispatch = (window as any).__BG_DISPATCH__;
            if (dispatch) {
                dispatch({
                    type: 'CHEAT_END_TURN',
                });
                dispatch({
                    type: 'CHEAT_END_TURN',
                });
            }
        });

        await page.waitForTimeout(1500);

        hpCurrent = await page.evaluate(() => {
            const state = (window as any).__BG_STATE__;
            return state?.players?.['1']?.resources?.hp ?? 0;
        });
        expect(hpCurrent).toBe(hpInitial - 3 - 2 - 1); // 累计受到 6 点伤害
        await expect(poisonToken).not.toBeVisible(); // 完全移除
    });

    test('中毒和燃烧可以同时存在', async ({ page }) => {
        // 1. 选择炎术士 vs 影贼
        await page.getByRole('button', { name: /炎术士|Pyromancer/i }).click();
        await page.getByRole('button', { name: /影贼|Shadow Thief/i }).click();
        await page.getByRole('button', { name: /开始游戏|Start Game/i }).click();

        await page.waitForSelector('[data-testid="game-board"]', { timeout: 10000 });

        // 2. 给影贼同时添加中毒和燃烧
        await page.evaluate(() => {
            const dispatch = (window as any).__BG_DISPATCH__;
            if (dispatch) {
                dispatch({
                    type: 'CHEAT_MODIFY_TOKENS',
                    payload: {
                        playerId: '1',
                        tokenId: 'poison',
                        amount: 2,
                    },
                });
                dispatch({
                    type: 'CHEAT_MODIFY_TOKENS',
                    payload: {
                        playerId: '1',
                        tokenId: 'burn',
                        amount: 2,
                    },
                });
            }
        });

        await page.waitForTimeout(500);

        // 3. 验证两种状态都存在
        const poisonToken = page.locator('[data-token-id="poison"]').first();
        const burnToken = page.locator('[data-token-id="burn"]').first();
        await expect(poisonToken).toBeVisible();
        await expect(burnToken).toBeVisible();

        // 4. 记录当前 HP
        const hpBefore = await page.evaluate(() => {
            const state = (window as any).__BG_STATE__;
            return state?.players?.['1']?.resources?.hp ?? 0;
        });

        // 5. 推进到影贼回合开始
        await page.evaluate(() => {
            const dispatch = (window as any).__BG_DISPATCH__;
            if (dispatch) {
                dispatch({
                    type: 'CHEAT_END_TURN',
                });
            }
        });

        await page.waitForTimeout(1500);

        // 6. 验证受到 4 点伤害（2 中毒 + 2 燃烧）
        const hpAfter = await page.evaluate(() => {
            const state = (window as any).__BG_STATE__;
            return state?.players?.['1']?.resources?.hp ?? 0;
        });
        expect(hpAfter).toBe(hpBefore - 4);

        // 7. 验证两种状态都减少 1 层
        await expect(poisonToken).toContainText('1');
        await expect(burnToken).toContainText('1');
    });

    test('中毒可以被净化移除', async ({ page }) => {
        // 1. 选择影贼 vs 僧侣（僧侣有净化）
        await page.getByRole('button', { name: /影贼|Shadow Thief/i }).click();
        await page.getByRole('button', { name: /僧侣|Monk/i }).click();
        await page.getByRole('button', { name: /开始游戏|Start Game/i }).click();

        await page.waitForSelector('[data-testid="game-board"]', { timeout: 10000 });

        // 2. 给僧侣添加中毒
        await page.evaluate(() => {
            const dispatch = (window as any).__BG_DISPATCH__;
            if (dispatch) {
                dispatch({
                    type: 'CHEAT_MODIFY_TOKENS',
                    payload: {
                        playerId: '1',
                        tokenId: 'poison',
                        amount: 2,
                    },
                });
            }
        });

        await page.waitForTimeout(500);

        // 3. 给僧侣添加净化 token
        await page.evaluate(() => {
            const dispatch = (window as any).__BG_DISPATCH__;
            if (dispatch) {
                dispatch({
                    type: 'CHEAT_MODIFY_TOKENS',
                    payload: {
                        playerId: '1',
                        tokenId: 'purify',
                        amount: 1,
                    },
                });
            }
        });

        await page.waitForTimeout(500);

        const poisonToken = page.locator('[data-token-id="poison"]').first();
        await expect(poisonToken).toBeVisible();

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

        // 5. 验证中毒被完全移除
        await expect(poisonToken).not.toBeVisible();

        // 6. 推进到僧侣回合开始，验证不受伤害
        const hpBefore = await page.evaluate(() => {
            const state = (window as any).__BG_STATE__;
            return state?.players?.['1']?.resources?.hp ?? 0;
        });

        await page.evaluate(() => {
            const dispatch = (window as any).__BG_DISPATCH__;
            if (dispatch) {
                dispatch({
                    type: 'CHEAT_END_TURN',
                });
            }
        });

        await page.waitForTimeout(1500);

        const hpAfter = await page.evaluate(() => {
            const state = (window as any).__BG_STATE__;
            return state?.players?.['1']?.resources?.hp ?? 0;
        });
        expect(hpAfter).toBe(hpBefore); // 未受伤害
    });
});
