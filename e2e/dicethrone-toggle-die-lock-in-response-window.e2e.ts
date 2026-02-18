/**
 * DiceThrone - 响应窗口期间锁定骰子测试
 * 
 * 验证 TOGGLE_DIE_LOCK 命令在响应窗口期间可以正常工作
 */

import { test, expect } from './fixtures';

test.describe('DiceThrone - 响应窗口期间锁定骰子', () => {
    test('应该允许在响应窗口期间锁定骰子', async ({ diceThroneMatch }) => {
        const { page, player1, player2, readCoreState, applyCoreStateDirect } = diceThroneMatch;

        // 1. 设置初始状态：玩家 1 在进攻阶段，玩家 2 有响应卡牌
        await applyCoreStateDirect({
            activePlayerId: player1.id,
            phase: 'offensiveRoll',
            players: {
                [player1.id]: {
                    hp: 50,
                    cp: 2,
                    hand: [],
                    deck: [],
                    discard: [],
                    statusEffects: {},
                    resources: { cp: 2 },
                },
                [player2.id]: {
                    hp: 50,
                    cp: 2,
                    hand: [
                        { uid: 'card-1', defId: 'dt:card:barbarian:unbreakable', isUpgrade: false },
                    ],
                    deck: [],
                    discard: [],
                    statusEffects: {},
                    resources: { cp: 2 },
                },
            },
            dice: [
                { id: 0, value: 1, symbol: 'sword', locked: false },
                { id: 1, value: 2, symbol: 'sword', locked: false },
                { id: 2, value: 3, symbol: 'sword', locked: false },
                { id: 3, value: 4, symbol: 'shield', locked: false },
                { id: 4, value: 5, symbol: 'shield', locked: false },
            ],
            rollsRemaining: 2,
            rollDiceCount: 5,
        });

        // 2. 玩家 1 选择技能，触发响应窗口
        await page.click('[data-testid="ability-button-dt:ability:barbarian:sword_slash"]');

        // 等待响应窗口打开
        await page.waitForSelector('[data-testid="response-window"]', { timeout: 5000 });

        // 3. 验证响应窗口已打开
        const responseWindow = await page.locator('[data-testid="response-window"]');
        await expect(responseWindow).toBeVisible();

        // 4. 玩家 2 尝试锁定骰子（这应该被允许）
        const dieButton = page.locator('[data-testid="die-button-0"]');
        await dieButton.click();

        // 5. 验证骰子已被锁定
        const state = await readCoreState();
        expect(state.dice[0].locked).toBe(true);

        // 6. 玩家 2 跳过响应
        await page.click('[data-testid="response-pass-button"]');

        // 7. 验证响应窗口已关闭
        await expect(responseWindow).not.toBeVisible();
    });

    test('应该允许在响应窗口期间解锁骰子', async ({ diceThroneMatch }) => {
        const { page, player1, player2, readCoreState, applyCoreStateDirect } = diceThroneMatch;

        // 1. 设置初始状态：玩家 1 在进攻阶段，骰子已锁定
        await applyCoreStateDirect({
            activePlayerId: player1.id,
            phase: 'offensiveRoll',
            players: {
                [player1.id]: {
                    hp: 50,
                    cp: 2,
                    hand: [],
                    deck: [],
                    discard: [],
                    statusEffects: {},
                    resources: { cp: 2 },
                },
                [player2.id]: {
                    hp: 50,
                    cp: 2,
                    hand: [
                        { uid: 'card-1', defId: 'dt:card:barbarian:unbreakable', isUpgrade: false },
                    ],
                    deck: [],
                    discard: [],
                    statusEffects: {},
                    resources: { cp: 2 },
                },
            },
            dice: [
                { id: 0, value: 1, symbol: 'sword', locked: true }, // 已锁定
                { id: 1, value: 2, symbol: 'sword', locked: false },
                { id: 2, value: 3, symbol: 'sword', locked: false },
                { id: 3, value: 4, symbol: 'shield', locked: false },
                { id: 4, value: 5, symbol: 'shield', locked: false },
            ],
            rollsRemaining: 2,
            rollDiceCount: 5,
        });

        // 2. 玩家 1 选择技能，触发响应窗口
        await page.click('[data-testid="ability-button-dt:ability:barbarian:sword_slash"]');

        // 等待响应窗口打开
        await page.waitForSelector('[data-testid="response-window"]', { timeout: 5000 });

        // 3. 玩家 2 尝试解锁骰子（这应该被允许）
        const dieButton = page.locator('[data-testid="die-button-0"]');
        await dieButton.click();

        // 4. 验证骰子已被解锁
        const state = await readCoreState();
        expect(state.dice[0].locked).toBe(false);

        // 5. 玩家 2 跳过响应
        await page.click('[data-testid="response-pass-button"]');
    });

    test('应该阻止在响应窗口期间投掷骰子', async ({ diceThroneMatch }) => {
        const { page, player1, player2, applyCoreStateDirect } = diceThroneMatch;

        // 1. 设置初始状态：玩家 1 在进攻阶段
        await applyCoreStateDirect({
            activePlayerId: player1.id,
            phase: 'offensiveRoll',
            players: {
                [player1.id]: {
                    hp: 50,
                    cp: 2,
                    hand: [],
                    deck: [],
                    discard: [],
                    statusEffects: {},
                    resources: { cp: 2 },
                },
                [player2.id]: {
                    hp: 50,
                    cp: 2,
                    hand: [
                        { uid: 'card-1', defId: 'dt:card:barbarian:unbreakable', isUpgrade: false },
                    ],
                    deck: [],
                    discard: [],
                    statusEffects: {},
                    resources: { cp: 2 },
                },
            },
            dice: [
                { id: 0, value: 1, symbol: 'sword', locked: false },
                { id: 1, value: 2, symbol: 'sword', locked: false },
                { id: 2, value: 3, symbol: 'sword', locked: false },
                { id: 3, value: 4, symbol: 'shield', locked: false },
                { id: 4, value: 5, symbol: 'shield', locked: false },
            ],
            rollsRemaining: 2,
            rollDiceCount: 5,
        });

        // 2. 玩家 1 选择技能，触发响应窗口
        await page.click('[data-testid="ability-button-dt:ability:barbarian:sword_slash"]');

        // 等待响应窗口打开
        await page.waitForSelector('[data-testid="response-window"]', { timeout: 5000 });

        // 3. 验证投掷骰子按钮被禁用或不可见
        const rollButton = page.locator('[data-testid="roll-dice-button"]');
        
        // 检查按钮是否存在
        const buttonExists = await rollButton.count() > 0;
        
        if (buttonExists) {
            // 如果按钮存在，应该被禁用
            await expect(rollButton).toBeDisabled();
        } else {
            // 如果按钮不存在，这也是正确的（UI 可能隐藏了按钮）
            expect(buttonExists).toBe(false);
        }

        // 4. 玩家 2 跳过响应
        await page.click('[data-testid="response-pass-button"]');
    });
});
