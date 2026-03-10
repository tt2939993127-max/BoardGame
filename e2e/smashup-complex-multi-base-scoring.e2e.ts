/**
 * 大杀四方 - afterScoring 响应窗口 E2E 测试
 * 
 * 测试场景：
 * 1. 基地达到临界点，直接进入 scoreBases 阶段
 * 2. P0 手牌有 afterScoring 卡牌（"我们乃最强"）
 * 3. 验证 Me First! 响应窗口打开
 * 4. 两个玩家都 PASS Me First! 窗口
 * 5. 验证 afterScoring 响应窗口打开
 * 6. 两个玩家都 PASS afterScoring 窗口
 * 7. 验证基地计分完成
 */

import { test, expect } from './framework';

test.describe('大杀四方 - afterScoring 响应窗口', () => {
    test('基地计分后 afterScoring 响应窗口正常打开', async ({ page, game }, testInfo) => {
        test.setTimeout(180000); // 3 分钟超时

        // 1. 导航到游戏（自动启用 TestHarness）
        console.log('[TEST] 导航到游戏页面');
        await page.goto('/play/smashup');

        // 2. 等待游戏加载
        console.log('[TEST] 等待 TestHarness 注册');
        await page.waitForFunction(
            () => (window as any).__BG_TEST_HARNESS__?.state?.isRegistered(),
            { timeout: 30000 }
        );
        console.log('[TEST] TestHarness 已注册');

        // 3. 构建测试场景（从 endTurn 阶段开始，让基地达到临界点）
        console.log('[TEST] 开始构建测试场景');
        await game.setupScene({
            gameId: 'smashup',
            player0: {
                hand: [
                    // afterScoring 卡牌：我们乃最强
                    { uid: 'card-after-1', defId: 'giant_ant_we_are_the_champions', type: 'action', owner: '0' },
                ],
                field: [
                    // 基地 0：简单随从
                    // base_the_jungle breakpoint=12
                    // 力量计算：5 + 4 + 3 = 12，刚好达到 breakpoint
                    { uid: 'worker-1', defId: 'giant_ant_worker', baseIndex: 0, owner: '0', controller: '0', basePower: 5 },
                    { uid: 'soldier-1', defId: 'giant_ant_soldier', baseIndex: 0, owner: '0', controller: '0', basePower: 4 },
                ],
                factions: ['giant_ants', 'ninjas'],
            },
            player1: {
                hand: [],
                field: [
                    // 基地 0：对手随从
                    { uid: 'ninja-1', defId: 'ninja_shinobi', baseIndex: 0, owner: '1', controller: '1', basePower: 3 },
                ],
                factions: ['ninjas', 'wizards'],
            },
            bases: [
                // 基地 0：丛林绿洲（breakpoint=12）
                { defId: 'base_the_jungle', breakpoint: 12, minions: [] },
            ],
            currentPlayer: '0',
            phase: 'endTurn', // 从 endTurn 阶段开始，然后推进到 scoreBases
        });
        console.log('[TEST] setupScene 完成');

        // 4. 等待游戏完全加载
        console.log('[TEST] 等待游戏状态稳定');
        await page.waitForFunction(
            () => {
                const state = (window as any).__BG_TEST_HARNESS__?.state?.get();
                const result = {
                    phase: state?.sys?.phase,
                    factionSelection: state?.core?.factionSelection,
                    p0Hand: state?.core?.players?.['0']?.hand?.length,
                    baseMinions: state?.core?.bases?.[0]?.minions?.length,
                };
                console.log('[WAIT] 当前状态:', result);
                
                // 等待进入 endTurn 阶段
                return state?.sys?.phase === 'endTurn'
                    && state?.core?.factionSelection === undefined;
            },
            { timeout: 30000 }
        );
        console.log('[TEST] 游戏状态已稳定');

        await page.waitForTimeout(2000);
        await game.screenshot('01-initial-state', testInfo);

        // 5. 推进到 scoreBases 阶段（触发 onPhaseEnter 钩子）
        console.log('[TEST] 推进到 scoreBases 阶段');
        await page.evaluate(() => {
            const harness = (window as any).__BG_TEST_HARNESS__;
            harness.command.dispatch({ type: 'ADVANCE_PHASE', playerId: '0', payload: {} });
        });
        
        // 等待进入 scoreBases 阶段
        await page.waitForFunction(
            () => {
                const state = (window as any).__BG_TEST_HARNESS__?.state?.get();
                return state?.sys?.phase === 'scoreBases';
            },
            { timeout: 15000 }
        );
        console.log('[TEST] 已进入 scoreBases 阶段');
        
        await page.waitForTimeout(1000);
        await game.screenshot('02-entered-scorebases', testInfo);

        // 6. 等待 Me First! 响应窗口打开（onPhaseEnter 自动触发）
        console.log('[TEST] 等待 Me First! 响应窗口打开');
        await page.waitForFunction(
            () => {
                const state = (window as any).__BG_TEST_HARNESS__?.state?.get();
                return state?.sys?.responseWindow?.current?.windowType === 'meFirst';
            },
            { timeout: 15000 }
        );

        await page.waitForTimeout(1000);
        await game.screenshot('03-me-first-window', testInfo);

        // 7. 验证 Me First! 响应窗口已打开
        const meFirstState = await page.evaluate(() => {
            const harness = (window as any).__BG_TEST_HARNESS__;
            const state = harness?.state?.get();
            return {
                phase: state?.sys?.phase,
                windowType: state?.sys?.responseWindow?.current?.windowType,
                currentResponder: state?.sys?.responseWindow?.current?.responderQueue?.[state?.sys?.responseWindow?.current?.currentResponderIndex],
            };
        });
        console.log('[TEST] Me First! 窗口状态:', meFirstState);
        
        expect(meFirstState.phase).toBe('scoreBases');
        expect(meFirstState.windowType).toBe('meFirst');

        // 8. 验证 Me First! UI 可见
        await expect(page.getByTestId('me-first-overlay')).toBeVisible();
        await expect(page.getByTestId('me-first-status')).toBeVisible();
        await expect(page.getByTestId('me-first-pass-button')).toBeVisible();

        // 9. 两个玩家都 PASS Me First! 窗口
        console.log('[TEST] P0 点击 PASS 按钮');
        await page.getByTestId('me-first-pass-button').click();
        await page.waitForTimeout(1000);
        await game.screenshot('04-p0-passed-me-first', testInfo);

        console.log('[TEST] P1 点击 PASS 按钮');
        // P1 的 PASS 按钮应该自动出现
        await page.getByTestId('me-first-pass-button').click();
        await page.waitForTimeout(2000);
        await game.screenshot('05-both-passed-me-first', testInfo);

        // 10. 等待 afterScoring 响应窗口打开
        console.log('[TEST] 等待 afterScoring 响应窗口打开');
        await page.waitForFunction(
            () => {
                const state = (window as any).__BG_TEST_HARNESS__?.state?.get();
                console.log('[WAIT] 检查 afterScoring 窗口:', {
                    windowType: state?.sys?.responseWindow?.current?.windowType,
                    hasWindow: !!state?.sys?.responseWindow?.current,
                });
                return state?.sys?.responseWindow?.current?.windowType === 'afterScoring';
            },
            { timeout: 15000 }
        );

        await page.waitForTimeout(1000);
        await game.screenshot('06-afterscoring-window', testInfo);

        // 11. 验证 afterScoring 响应窗口已打开
        const afterScoringState = await page.evaluate(() => {
            const harness = (window as any).__BG_TEST_HARNESS__;
            const state = harness?.state?.get();
            return {
                phase: state?.sys?.phase,
                windowType: state?.sys?.responseWindow?.current?.windowType,
                currentResponder: state?.sys?.responseWindow?.current?.responderQueue?.[state?.sys?.responseWindow?.current?.currentResponderIndex],
            };
        });
        console.log('[TEST] afterScoring 窗口状态:', afterScoringState);
        
        expect(afterScoringState.windowType).toBe('afterScoring');

        // 12. 两个玩家都 PASS afterScoring 窗口
        console.log('[TEST] P0 点击 PASS 按钮 (afterScoring)');
        await page.getByTestId('me-first-pass-button').click();
        await page.waitForTimeout(1000);
        await game.screenshot('07-p0-passed-afterscoring', testInfo);

        console.log('[TEST] P1 点击 PASS 按钮 (afterScoring)');
        await page.getByTestId('me-first-pass-button').click();
        await page.waitForTimeout(2000);
        await game.screenshot('08-both-passed-afterscoring', testInfo);

        // 13. 验证响应窗口关闭
        const finalState = await page.evaluate(() => {
            const harness = (window as any).__BG_TEST_HARNESS__;
            const state = harness?.state?.get();
            return {
                phase: state?.sys?.phase,
                responseWindow: state?.sys?.responseWindow?.current?.id || null,
                p0Vp: state?.core?.players?.['0']?.vp,
                p1Vp: state?.core?.players?.['1']?.vp,
            };
        });
        console.log('[TEST] 最终状态:', finalState);
        
        // 响应窗口应该关闭
        expect(finalState.responseWindow).toBeNull();
        
        // 玩家应该获得分数
        expect(finalState.p0Vp).toBeGreaterThan(0);
        
        await game.screenshot('09-final-state', testInfo);

        console.log('[E2E] ✅ 测试通过：afterScoring 响应窗口正常工作');
    });
});
