/**
 * 王权骰铸 - 顿悟卡牌 E2E 测试
 * 
 * 验证投掷莲花时获得2太极+1闪避+1净化
 */

import { test, expect } from './fixtures';

test.describe('王权骰铸 - 顿悟卡牌', () => {
    test('投出莲花 → 获得2太极+1闪避+1净化', async ({ dicethroneMatch }) => {
        const { hostPage, guestPage, matchId } = dicethroneMatch;

        console.log(`[Test] 对局创建成功: ${matchId}`);

        // 等待游戏棋盘加载
        await expect(hostPage.locator('[data-testid="game-board"]').or(hostPage.locator('.game-board'))).toBeVisible({ timeout: 10000 });
        console.log('[Test] 游戏棋盘已加载');

        // 等待初始化完成
        await hostPage.waitForTimeout(2000);

        // 读取初始状态
        const initialState = await hostPage.evaluate(() => {
            const state = (window as any).__BG_CORE_STATE__;
            return {
                phase: state?.sys?.phase,
                activePlayer: state?.core?.activePlayerId,
                player0Hand: state?.core?.players?.['0']?.hand?.length || 0,
                player0Tokens: state?.core?.players?.['0']?.tokens || {},
            };
        });
        console.log('[Test] 初始状态:', initialState);

        // 注入顿悟卡到手牌
        await hostPage.evaluate(() => {
            const state = (window as any).__BG_CORE_STATE__;
            if (state?.core?.players?.['0']) {
                // 清空手牌，只保留顿悟卡
                state.core.players['0'].hand = [{
                    id: 'card-enlightenment',
                    name: '顿悟',
                    type: 'action',
                    cpCost: 0,
                    timing: 'main',
                    description: '投掷1骰：莲花→获得2气+闪避+净化；否则抽1牌',
                }];
                // 确保有足够CP
                state.core.players['0'].resources.cp = 5;
                // 清空 Token
                state.core.players['0'].tokens = {
                    taiji: 0,
                    evasive: 0,
                    purify: 0,
                    knockdown: 0,
                };
            }
        });
        console.log('[Test] 已注入顿悟卡到手牌');

        // 注入骰子结果：莲花(6)
        await hostPage.evaluate(() => {
            (window as any).__BG_INJECT_DICE_VALUES__ = [6];
        });
        console.log('[Test] 已注入骰子结果: 莲花(6)');

        // 等待状态更新
        await hostPage.waitForTimeout(500);

        // 点击顿悟卡
        const enlightenmentCard = hostPage.locator('[data-card-id="card-enlightenment"]').first();
        await expect(enlightenmentCard).toBeVisible({ timeout: 5000 });
        await enlightenmentCard.click();
        console.log('[Test] 已点击顿悟卡');

        // 等待效果执行
        await hostPage.waitForTimeout(3000);

        // 读取最终状态
        const finalState = await hostPage.evaluate(() => {
            const state = (window as any).__BG_CORE_STATE__;
            const player0 = state?.core?.players?.['0'];
            return {
                tokens: player0?.tokens || {},
                hand: player0?.hand?.length || 0,
                discard: player0?.discard?.length || 0,
                events: state?.sys?.eventStream?.entries?.slice(-10).map((e: any) => e.event.type) || [],
            };
        });
        console.log('[Test] 最终状态:', finalState);
        console.log('[Test] 最近10个事件:', finalState.events);

        // 验证 Token
        console.log('\n=== 验证结果 ===');
        console.log(`太极: ${finalState.tokens.taiji || 0} (期望: 2)`);
        console.log(`闪避: ${finalState.tokens.evasive || 0} (期望: 1)`);
        console.log(`净化: ${finalState.tokens.purify || 0} (期望: 1)`);

        expect(finalState.tokens.taiji || 0).toBe(2);
        expect(finalState.tokens.evasive || 0).toBe(1);
        expect(finalState.tokens.purify || 0).toBe(1);
        
        console.log('[Test] ✅ 测试通过：玩家获得了 2太极+1闪避+1净化');
    });
});
