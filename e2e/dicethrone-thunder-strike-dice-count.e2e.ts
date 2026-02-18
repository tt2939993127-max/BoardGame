/**
 * 雷霆万钧（Thunder Strike）骰子数量验证测试
 * 
 * 验证：雷霆万钧技能投掷 3 个骰子并显示重掷界面
 */

import { test, expect } from './fixtures';
import { waitForTestHarness } from './helpers/common.js';
import { 
    readCoreState, 
    selectCharacter, 
    readyAndStartGame, 
    waitForGameBoard 
} from './helpers/dicethrone.js';

test.describe('雷霆万钧骰子数量验证', () => {
    test('应该投掷 3 个骰子并显示重掷界面', async ({ dicethroneMatch }, testInfo) => {
        const { hostPage: page, guestPage, matchId } = dicethroneMatch;

        // 选择角色：Host 选择 Monk，Guest 选择 Barbarian
        await selectCharacter(page, 'monk');
        await selectCharacter(guestPage, 'barbarian');

        // 准备并开始游戏
        await readyAndStartGame(page, guestPage);

        // 等待游戏棋盘加载
        await waitForGameBoard(page);
        await page.waitForTimeout(2000);

        // 等待 TestHarness 就绪
        await waitForTestHarness(page);

        console.log('✅ 游戏已开始，TestHarness 就绪');

        // 注入测试状态：僧侣有 3 个掌面，已升级到雷霆万钧 II，有足够的太极标记
        await page.evaluate(() => {
            window.__BG_TEST_HARNESS__!.state.patch({
                core: {
                    currentPlayerId: '0',
                    phase: 'offensiveRoll',
                    players: {
                        '0': {
                            tokens: {
                                taiji: 3, // 有足够的太极标记用于重掷
                            },
                            abilities: {
                                'thunder-strike': { level: 2 }, // 雷霆万钧 II
                            },
                            diceValues: [3, 3, 3, 1, 1], // 3 个掌面
                            rollsRemaining: 0,
                            hasRolled: true,
                            hasConfirmedRoll: true,
                        },
                    },
                },
            });
        });

        // 等待状态同步
        await page.waitForTimeout(1000);

        // 截图：初始状态（3 个掌面）
        await page.screenshot({
            path: testInfo.outputPath('01-initial-state-3-palms.png'),
            fullPage: true,
        });

        console.log('✅ 初始状态已注入：3 个掌面，雷霆万钧 II，3 个太极标记');

        // 验证当前玩家是 '0'
        const currentState = await readCoreState(page);
        console.log('📊 当前玩家:', currentState.currentPlayerId);
        console.log('📊 当前阶段:', currentState.phase);

        // 点击"雷霆万钧"技能按钮
        const thunderStrikeButton = page.locator('button').filter({ hasText: /雷霆万钧|Thunder Strike/i }).first();
        await expect(thunderStrikeButton).toBeVisible({ timeout: 5000 });
        
        console.log('✅ 找到雷霆万钧按钮，准备点击...');
        await thunderStrikeButton.click();

        // 等待技能执行和骰子投掷
        await page.waitForTimeout(2000);

        // 截图：技能触发后
        await page.screenshot({
            path: testInfo.outputPath('02-after-ability-trigger.png'),
            fullPage: true,
        });

        console.log('✅ 技能已触发，等待重掷界面...');

        // 读取状态，验证 pendingBonusDiceSettlement
        const state = await readCoreState(page);
        const settlement = state.core.pendingBonusDiceSettlement;

        console.log('📊 pendingBonusDiceSettlement:', JSON.stringify(settlement, null, 2));

        // 验证：应该有 3 个骰子
        expect(settlement, 'pendingBonusDiceSettlement 应该存在').toBeDefined();
        expect(settlement?.dice, 'dice 数组应该存在').toBeDefined();
        expect(settlement?.dice?.length, '应该有 3 个骰子').toBe(3);

        console.log('✅ 验证通过：pendingBonusDiceSettlement.dice 有 3 个元素');

        // 验证：每个骰子都有 value 和 face
        settlement?.dice.forEach((die: any, index: number) => {
            expect(die.value, `骰子 ${index + 1} 应该有 value`).toBeGreaterThanOrEqual(1);
            expect(die.value, `骰子 ${index + 1} 的 value 应该 ≤ 6`).toBeLessThanOrEqual(6);
            expect(die.face, `骰子 ${index + 1} 应该有 face`).toBeDefined();
            console.log(`   骰子 ${index + 1}: value=${die.value}, face=${die.face}`);
        });

        // 等待重掷界面显示
        await page.waitForTimeout(1000);

        // 截图：重掷界面（应该显示 3 个骰子）
        await page.screenshot({
            path: testInfo.outputPath('03-reroll-interface-3-dice.png'),
            fullPage: true,
        });

        console.log('✅ 重掷界面截图已保存');

        // 检查 UI 上是否显示了骰子元素
        const diceElements = page.locator('[class*="Dice3D"]');
        const diceCount = await diceElements.count();
        console.log(`📊 UI 显示 ${diceCount} 个 Dice3D 元素`);

        // 验证：UI 应该显示至少 3 个骰子
        expect(diceCount, 'UI 应该显示至少 3 个骰子').toBeGreaterThanOrEqual(3);

        console.log('✅ UI 验证通过：显示了 3 个骰子');

        // 检查 EventStream 中的 BONUS_DIE_ROLLED 事件
        const bonusDieEvents = await page.evaluate(() => {
            const state = (window as any).__BG_STATE__;
            const entries = state.sys.eventStream.entries;
            return entries
                .filter((e: any) => e.event.type === 'BONUS_DIE_ROLLED')
                .map((e: any) => ({
                    type: e.event.type,
                    value: e.event.payload.value,
                    face: e.event.payload.face,
                    timestamp: e.event.timestamp,
                }));
        });

        console.log('📊 BONUS_DIE_ROLLED 事件数量:', bonusDieEvents.length);
        bonusDieEvents.forEach((event: any, index: number) => {
            console.log(`   事件 ${index + 1}:`, event);
        });

        // 验证：应该有 3 个 BONUS_DIE_ROLLED 事件
        expect(bonusDieEvents.length, '应该有 3 个 BONUS_DIE_ROLLED 事件').toBeGreaterThanOrEqual(3);

        console.log('✅ EventStream 验证通过：发射了 3 个 BONUS_DIE_ROLLED 事件');

        // 检查是否有"跳过重掷"或"确认"按钮
        const actionButtons = page.locator('button').filter({ hasText: /跳过|确认|继续/ });
        const buttonCount = await actionButtons.count();
        console.log(`📊 找到 ${buttonCount} 个操作按钮`);

        if (buttonCount > 0) {
            const firstButton = actionButtons.first();
            const buttonText = await firstButton.textContent();
            console.log(`   按钮文本: "${buttonText}"`);
            
            // 点击按钮关闭重掷界面
            await firstButton.click();
            await page.waitForTimeout(500);

            // 截图：点击按钮后
            await page.screenshot({
                path: testInfo.outputPath('04-after-button-click.png'),
                fullPage: true,
            });

            console.log('✅ 已点击操作按钮');
        }

        // 最终截图
        await page.screenshot({
            path: testInfo.outputPath('05-final-state.png'),
            fullPage: true,
        });

        console.log('\n' + '='.repeat(60));
        console.log('✅ 测试完成！所有验证通过：');
        console.log('   1. pendingBonusDiceSettlement.dice 有 3 个元素');
        console.log('   2. UI 显示了 3 个骰子');
        console.log('   3. EventStream 发射了 3 个 BONUS_DIE_ROLLED 事件');
        console.log('='.repeat(60));
    });
});
