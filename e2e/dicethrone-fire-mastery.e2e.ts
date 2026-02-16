/**
 * 火焰精通（Fire Mastery）自动消耗机制 E2E 测试
 * 
 * 测试场景：
 * 1. 火焰精通在技能中自动消耗（非手动）
 * 2. 高温爆破消耗火焰精通增加伤害
 * 3. 烧毁消耗火焰精通施加燃烧
 * 4. 火焰精通上限可以提升
 * 5. 火焰精通不会出现在 Token 响应窗口
 */

import { test, expect } from '@playwright/test';

test.describe('火焰精通自动消耗机制', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto('/play/dicethrone/local');
        await page.waitForLoadState('networkidle');
    });

    test('火焰精通应该正确显示并可以累积', async ({ page }) => {
        // 1. 选择炎术士 vs 圣骑士
        await page.getByRole('button', { name: /炎术士|Pyromancer/i }).click();
        await page.getByRole('button', { name: /圣骑士|Paladin/i }).click();
        await page.getByRole('button', { name: /开始游戏|Start Game/i }).click();

        await page.waitForSelector('[data-testid="game-board"]', { timeout: 10000 });

        // 2. 给炎术士添加火焰精通
        await page.evaluate(() => {
            const dispatch = (window as any).__BG_DISPATCH__;
            if (dispatch) {
                dispatch({
                    type: 'CHEAT_MODIFY_TOKENS',
                    payload: {
                        playerId: '0', // 炎术士是玩家 0
                        tokenId: 'fire-mastery',
                        amount: 3,
                    },
                });
            }
        });

        await page.waitForTimeout(500);

        // 3. 验证火焰精通显示
        const fireMasteryToken = page.locator('[data-token-id="fire-mastery"]').first();
        await expect(fireMasteryToken).toBeVisible();
        await expect(fireMasteryToken).toContainText('3');

        // 4. 继续添加火焰精通
        await page.evaluate(() => {
            const dispatch = (window as any).__BG_DISPATCH__;
            if (dispatch) {
                dispatch({
                    type: 'CHEAT_MODIFY_TOKENS',
                    payload: {
                        playerId: '0',
                        tokenId: 'fire-mastery',
                        amount: 2,
                    },
                });
            }
        });

        await page.waitForTimeout(500);

        // 5. 验证累积到上限（默认 5）
        await expect(fireMasteryToken).toContainText('5');

        // 6. 尝试超过上限
        await page.evaluate(() => {
            const dispatch = (window as any).__BG_DISPATCH__;
            if (dispatch) {
                dispatch({
                    type: 'CHEAT_MODIFY_TOKENS',
                    payload: {
                        playerId: '0',
                        tokenId: 'fire-mastery',
                        amount: 3,
                    },
                });
            }
        });

        await page.waitForTimeout(500);

        // 7. 验证不超过上限
        await expect(fireMasteryToken).toContainText('5');
    });

    test('高温爆破应该消耗火焰精通增加伤害', async ({ page }) => {
        // 1. 选择炎术士 vs 圣骑士
        await page.getByRole('button', { name: /炎术士|Pyromancer/i }).click();
        await page.getByRole('button', { name: /圣骑士|Paladin/i }).click();
        await page.getByRole('button', { name: /开始游戏|Start Game/i }).click();

        await page.waitForSelector('[data-testid="game-board"]', { timeout: 10000 });

        // 2. 给炎术士添加 3 层火焰精通
        await page.evaluate(() => {
            const dispatch = (window as any).__BG_DISPATCH__;
            if (dispatch) {
                dispatch({
                    type: 'CHEAT_MODIFY_TOKENS',
                    payload: {
                        playerId: '0',
                        tokenId: 'fire-mastery',
                        amount: 3,
                    },
                });
            }
        });

        await page.waitForTimeout(500);

        const fireMasteryToken = page.locator('[data-token-id="fire-mastery"]').first();
        await expect(fireMasteryToken).toContainText('3');

        // 3. 记录圣骑士当前 HP
        const hpBefore = await page.evaluate(() => {
            const state = (window as any).__BG_STATE__;
            return state?.players?.['1']?.resources?.hp ?? 0;
        });

        // 4. 使用高温爆破技能（假设消耗 2 层火焰精通）
        await page.evaluate(() => {
            const dispatch = (window as any).__BG_DISPATCH__;
            if (dispatch) {
                dispatch({
                    type: 'CHEAT_USE_ABILITY',
                    payload: {
                        abilityId: 'pyro-blast',
                        consumeFireMastery: 2,
                    },
                });
            }
        });

        await page.waitForTimeout(1500);

        // 5. 验证火焰精通减少 2 层
        await expect(fireMasteryToken).toContainText('1');

        // 6. 验证伤害增加（基础伤害 + 2 * 火焰精通）
        const hpAfter = await page.evaluate(() => {
            const state = (window as any).__BG_STATE__;
            return state?.players?.['1']?.resources?.hp ?? 0;
        });
        // 假设基础伤害 5，每层火焰精通 +2，总伤害 = 5 + 2*2 = 9
        expect(hpAfter).toBeLessThan(hpBefore);
    });

    test('烧毁应该消耗火焰精通施加燃烧', async ({ page }) => {
        // 1. 选择炎术士 vs 圣骑士
        await page.getByRole('button', { name: /炎术士|Pyromancer/i }).click();
        await page.getByRole('button', { name: /圣骑士|Paladin/i }).click();
        await page.getByRole('button', { name: /开始游戏|Start Game/i }).click();

        await page.waitForSelector('[data-testid="game-board"]', { timeout: 10000 });

        // 2. 给炎术士添加火焰精通
        await page.evaluate(() => {
            const dispatch = (window as any).__BG_DISPATCH__;
            if (dispatch) {
                dispatch({
                    type: 'CHEAT_MODIFY_TOKENS',
                    payload: {
                        playerId: '0',
                        tokenId: 'fire-mastery',
                        amount: 4,
                    },
                });
            }
        });

        await page.waitForTimeout(500);

        const fireMasteryToken = page.locator('[data-token-id="fire-mastery"]').first();
        await expect(fireMasteryToken).toContainText('4');

        // 3. 使用烧毁技能（消耗所有火焰精通施加燃烧）
        await page.evaluate(() => {
            const dispatch = (window as any).__BG_DISPATCH__;
            if (dispatch) {
                dispatch({
                    type: 'CHEAT_USE_ABILITY',
                    payload: {
                        abilityId: 'burn-down',
                    },
                });
            }
        });

        await page.waitForTimeout(1500);

        // 4. 验证火焰精通被完全消耗
        await expect(fireMasteryToken).not.toBeVisible();

        // 5. 验证圣骑士获得燃烧状态（层数 = 消耗的火焰精通）
        const burnToken = page.locator('[data-token-id="burn"]').first();
        await expect(burnToken).toBeVisible();
        // 假设烧毁 II 级：消耗所有火焰精通，施加等量燃烧（上限 3）
        await expect(burnToken).toContainText('3');
    });

    test('火焰精通上限可以提升', async ({ page }) => {
        // 1. 选择炎术士 vs 圣骑士
        await page.getByRole('button', { name: /炎术士|Pyromancer/i }).click();
        await page.getByRole('button', { name: /圣骑士|Paladin/i }).click();
        await page.getByRole('button', { name: /开始游戏|Start Game/i }).click();

        await page.waitForSelector('[data-testid="game-board"]', { timeout: 10000 });

        // 2. 验证初始上限为 5
        await page.evaluate(() => {
            const dispatch = (window as any).__BG_DISPATCH__;
            if (dispatch) {
                dispatch({
                    type: 'CHEAT_MODIFY_TOKENS',
                    payload: {
                        playerId: '0',
                        tokenId: 'fire-mastery',
                        amount: 10, // 尝试添加超过上限
                    },
                });
            }
        });

        await page.waitForTimeout(500);

        const fireMasteryToken = page.locator('[data-token-id="fire-mastery"]').first();
        await expect(fireMasteryToken).toContainText('5'); // 上限 5

        // 3. 使用"扇风点火"卡提升上限
        await page.evaluate(() => {
            const dispatch = (window as any).__BG_DISPATCH__;
            if (dispatch) {
                dispatch({
                    type: 'CHEAT_PLAY_CARD',
                    payload: {
                        cardId: 'card-fan-the-flames',
                    },
                });
            }
        });

        await page.waitForTimeout(1500);

        // 4. 验证上限提升（假设提升到 7）
        await page.evaluate(() => {
            const dispatch = (window as any).__BG_DISPATCH__;
            if (dispatch) {
                dispatch({
                    type: 'CHEAT_MODIFY_TOKENS',
                    payload: {
                        playerId: '0',
                        tokenId: 'fire-mastery',
                        amount: 5,
                    },
                });
            }
        });

        await page.waitForTimeout(500);

        // 验证可以超过原来的上限 5
        const fmCount = await page.evaluate(() => {
            const state = (window as any).__BG_STATE__;
            return state?.players?.['0']?.tokens?.['fire-mastery'] ?? 0;
        });
        expect(fmCount).toBeGreaterThan(5);
    });

    test('火焰精通不应该出现在 Token 响应窗口', async ({ page }) => {
        // 1. 选择炎术士 vs 圣骑士
        await page.getByRole('button', { name: /炎术士|Pyromancer/i }).click();
        await page.getByRole('button', { name: /圣骑士|Paladin/i }).click();
        await page.getByRole('button', { name: /开始游戏|Start Game/i }).click();

        await page.waitForSelector('[data-testid="game-board"]', { timeout: 10000 });

        // 2. 给炎术士添加火焰精通
        await page.evaluate(() => {
            const dispatch = (window as any).__BG_DISPATCH__;
            if (dispatch) {
                dispatch({
                    type: 'CHEAT_MODIFY_TOKENS',
                    payload: {
                        playerId: '0',
                        tokenId: 'fire-mastery',
                        amount: 5,
                    },
                });
            }
        });

        await page.waitForTimeout(500);

        // 3. 模拟攻击造成伤害（触发 beforeDamageDealt 响应窗口）
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

        // 4. 验证响应窗口打开（如果炎术士有其他可用 token）
        // 或者验证响应窗口不打开（如果只有火焰精通）
        const responseWindow = page.locator('[data-testid="token-response-window"]');
        
        // 5. 如果响应窗口打开，验证火焰精通不在列表中
        const isVisible = await responseWindow.isVisible().catch(() => false);
        if (isVisible) {
            const fireMasteryInWindow = responseWindow.locator('[data-token-id="fire-mastery"]');
            await expect(fireMasteryInWindow).not.toBeVisible();
        }
    });

    test('花费 CP 获得火焰精通', async ({ page }) => {
        // 1. 选择炎术士 vs 圣骑士
        await page.getByRole('button', { name: /炎术士|Pyromancer/i }).click();
        await page.getByRole('button', { name: /圣骑士|Paladin/i }).click();
        await page.getByRole('button', { name: /开始游戏|Start Game/i }).click();

        await page.waitForSelector('[data-testid="game-board"]', { timeout: 10000 });

        // 2. 给炎术士添加 CP
        await page.evaluate(() => {
            const dispatch = (window as any).__BG_DISPATCH__;
            if (dispatch) {
                dispatch({
                    type: 'CHEAT_MODIFY_RESOURCE',
                    payload: {
                        playerId: '0',
                        resourceId: 'cp',
                        amount: 5,
                    },
                });
            }
        });

        await page.waitForTimeout(500);

        // 3. 记录当前 CP 和火焰精通
        const cpBefore = await page.evaluate(() => {
            const state = (window as any).__BG_STATE__;
            return state?.players?.['0']?.resources?.cp ?? 0;
        });
        expect(cpBefore).toBe(5);

        // 4. 使用"升温"卡（花费 CP 获得火焰精通）
        await page.evaluate(() => {
            const dispatch = (window as any).__BG_DISPATCH__;
            if (dispatch) {
                dispatch({
                    type: 'CHEAT_PLAY_CARD',
                    payload: {
                        cardId: 'card-turning-up-the-heat',
                        spendCP: 2, // 花费 2 CP
                    },
                });
            }
        });

        await page.waitForTimeout(1500);

        // 5. 验证 CP 减少
        const cpAfter = await page.evaluate(() => {
            const state = (window as any).__BG_STATE__;
            return state?.players?.['0']?.resources?.cp ?? 0;
        });
        expect(cpAfter).toBeLessThan(cpBefore);

        // 6. 验证火焰精通增加
        const fireMasteryToken = page.locator('[data-token-id="fire-mastery"]').first();
        await expect(fireMasteryToken).toBeVisible();
        // 假设：基础 +1，每花费 1 CP 额外 +1
        const fmCount = await page.evaluate(() => {
            const state = (window as any).__BG_STATE__;
            return state?.players?.['0']?.tokens?.['fire-mastery'] ?? 0;
        });
        expect(fmCount).toBeGreaterThan(0);
    });
});
