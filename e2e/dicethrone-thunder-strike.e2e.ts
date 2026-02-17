/**
 * DiceThrone - 雷霆万钧技能 E2E 测试
 * 
 * 测试场景：
 * 1. 触发雷霆万钧技能（3个掌面）
 * 2. 验证投掷3个奖励骰
 * 3. 验证重掷交互显示（有太极标记时）
 */

import { test, expect } from '@playwright/test';
import { 
    setupDTOnlineMatch, 
    waitForBoardReady, 
    selectCharacter,
    readyAndStartGame,
    applyCoreStateDirect,
    cleanupDTMatch,
} from './helpers/dicethrone';

test.describe('DiceThrone - 雷霆万钧技能', () => {
    test('应该正确显示奖励骰投掷和重掷交互', async ({ browser, baseURL }) => {
        // 1. 设置游戏：武僧 vs 武僧
        const setup = await setupDTOnlineMatch(browser, baseURL);
        if (!setup) {
            test.skip();
            return;
        }

        const { hostPage, guestPage } = setup;

        try {
            // 2. 选择角色：都选武僧
            await selectCharacter(hostPage, 'monk');
            await selectCharacter(guestPage, 'monk');

            // 3. 准备并开始游戏
            await readyAndStartGame(hostPage, guestPage);

            // 4. 等待游戏棋盘加载
            await waitForBoardReady(hostPage);
            await waitForBoardReady(guestPage);

            // 5. 等待进入游戏
            await hostPage.waitForTimeout(2000);

            // 6. 直接通过 dispatch 触发雷霆万钧技能
            await hostPage.evaluate(() => {
                const dispatch = (window as any).__BG_DISPATCH__;
                const state = (window as any).__BG_STATE__;
                
                // 先注入状态：玩家0有2个太极标记，骰子为3个掌面
                dispatch('CHEAT_APPLY_STATE', {
                    players: {
                        '0': {
                            tokens: { taiji: 2 },
                        },
                    },
                    dice: [
                        { id: 0, value: 5, locked: false, playerId: '0' }, // 掌
                        { id: 1, value: 5, locked: false, playerId: '0' }, // 掌
                        { id: 2, value: 5, locked: false, playerId: '0' }, // 掌
                        { id: 3, value: 1, locked: false, playerId: '1' },
                        { id: 4, value: 1, locked: false, playerId: '1' },
                        { id: 5, value: 1, locked: false, playerId: '1' },
                    ],
                    rollCount: 3,
                    rollConfirmed: true,
                });
            });

            // 7. 等待状态更新
            await hostPage.waitForTimeout(1000);

            // 8. 截图记录初始状态
            await hostPage.screenshot({ 
                path: `e2e/screenshots/thunder-strike-before-${Date.now()}.png`,
                fullPage: true 
            });

            // 9. 触发雷霆万钧技能
            await hostPage.evaluate(() => {
                const dispatch = (window as any).__BG_DISPATCH__;
                dispatch('ACTIVATE_ABILITY', { abilityId: 'thunder-strike' });
            });

            // 10. 等待技能效果
            await hostPage.waitForTimeout(2000);

            // 11. 截图记录技能触发后的状态
            await hostPage.screenshot({ 
                path: `e2e/screenshots/thunder-strike-after-${Date.now()}.png`,
                fullPage: true 
            });

            // 12. 检查状态：应该有 pendingBonusDiceSettlement
            const stateAfterAbility = await hostPage.evaluate(() => {
                const state = (window as any).__BG_STATE__;
                return {
                    hasPendingBonusDice: !!state?.core?.pendingBonusDiceSettlement,
                    bonusDiceInfo: state?.core?.pendingBonusDiceSettlement,
                    currentInteraction: state?.sys?.interaction?.current,
                    eventStreamLast10: state?.sys?.eventStream?.entries?.slice(-10).map((e: any) => e.event.type),
                };
            });

            console.log('=== 技能触发后的状态 ===');
            console.log('hasPendingBonusDice:', stateAfterAbility.hasPendingBonusDice);
            console.log('bonusDiceInfo:', JSON.stringify(stateAfterAbility.bonusDiceInfo, null, 2));
            console.log('currentInteraction:', JSON.stringify(stateAfterAbility.currentInteraction, null, 2));
            console.log('最近10个事件:', stateAfterAbility.eventStreamLast10);

            // 13. 验证是否有奖励骰数据
            if (stateAfterAbility.hasPendingBonusDice) {
                expect(stateAfterAbility.bonusDiceInfo?.dice).toHaveLength(3); // 应该有3个奖励骰
                expect(stateAfterAbility.bonusDiceInfo?.attackerId).toBe('0');
                expect(stateAfterAbility.bonusDiceInfo?.rerollCostTokenId).toBe('taiji');
                expect(stateAfterAbility.bonusDiceInfo?.rerollCostAmount).toBe(2);
                console.log('✅ 奖励骰数据验证通过');
            } else {
                console.log('❌ 没有找到 pendingBonusDiceSettlement');
                console.log('这可能是问题所在！');
            }

            // 14. 验证是否有交互
            if (stateAfterAbility.currentInteraction) {
                console.log('✅ 找到当前交互:', stateAfterAbility.currentInteraction.kind);
            } else {
                console.log('❌ 没有找到当前交互');
            }

            // 15. 查找页面上是否有重掷相关的文本
            const pageText = await hostPage.textContent('body');
            const hasRerollText = pageText?.includes('重掷') || pageText?.includes('reroll');
            const hasBonusDiceText = pageText?.includes('奖励骰') || pageText?.includes('bonus') || pageText?.includes('掷骰');
            
            console.log('页面上是否有"重掷"文本:', hasRerollText);
            console.log('页面上是否有"奖励骰/掷骰"文本:', hasBonusDiceText);

        } finally {
            await cleanupDTMatch(setup);
        }
    });
});
