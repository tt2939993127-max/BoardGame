import { test, expect } from './fixtures';
import { GameTestContext } from './framework/GameTestContext';

/**
 * E2E 测试："我们乃最强"计分后转移力量指示物
 * 
 * 测试场景：
 * 1. 基地达到 breakpoint，打开 Me First! 窗口
 * 2. 玩家打出"我们乃最强"（specialTiming: 'afterScoring'）
 * 3. 基地计分后，触发交互选择源随从和目标随从
 * 4. 验证力量指示物成功转移
 */
test.describe('大杀四方 - 我们乃最强（计分后转移力量指示物）', () => {
    test('Me First! 窗口打出，计分后触发交互并转移力量指示物', async ({ smashupMatch }, testInfo) => {
        const { host, guest } = smashupMatch;
        const game = new GameTestContext(host.page);

        // 1. 等待游戏开始
        await host.page.waitForSelector('[data-testid^="base-zone-"]', { timeout: 10000 });

        // 2. 注入测试场景：基地即将计分，P0 手牌有"我们乃最强"
        await host.page.evaluate(() => {
            const harness = (window as any).__BG_TEST_HARNESS__;
            
            // 创建基地和随从
            harness.state.patch({
                'core.bases.0.breakpoint': 12,
                'core.bases.0.minions': [
                    {
                        uid: 'm1',
                        defId: 'giant_ant_worker',
                        controller: '0',
                        owner: '0',
                        power: 3,
                        powerCounters: 2, // 有 2 个力量指示物
                    },
                    {
                        uid: 'm2',
                        defId: 'giant_ant_soldier',
                        controller: '0',
                        owner: '0',
                        power: 4,
                        powerCounters: 0, // 没有力量指示物
                    },
                ],
                'core.players.0.hand': [
                    {
                        uid: 'champ1',
                        defId: 'giant_ant_we_are_the_champions',
                        type: 'action',
                        owner: '0',
                    },
                ],
                'core.currentPlayerIndex': 0,
                'core.phase': 'playCards',
            });

            // 设置基地总力量达到 breakpoint（触发 Me First! 窗口）
            const base = harness.state.get('core.bases.0');
            const totalPower = base.minions.reduce((sum: number, m: any) => {
                return sum + m.power + (m.powerCounters || 0);
            }, 0);
            
            console.log('[TEST] Base setup:', {
                breakpoint: base.breakpoint,
                totalPower,
                minions: base.minions.map((m: any) => ({
                    defId: m.defId,
                    power: m.power,
                    powerCounters: m.powerCounters,
                })),
            });
        });

        // 3. 截图：初始状态
        await host.page.screenshot({ path: 'test-results/we-are-champions-01-initial.png' });

        // 4. P0 推进到计分阶段（触发 Me First! 窗口）
        await host.page.evaluate(() => {
            const harness = (window as any).__BG_TEST_HARNESS__;
            harness.dispatch('ADVANCE_PHASE', {});
        });

        await host.page.waitForTimeout(500);

        // 5. 验证 Me First! 窗口打开
        const meFirsWindowVisible = await host.page.locator('text=/Me First!|抢先一步/i').isVisible();
        expect(meFirsWindowVisible).toBe(true);

        // 6. 截图：Me First! 窗口
        await host.page.screenshot({ path: 'test-results/we-are-champions-02-me-first-window.png' });

        // 7. P0 打出"我们乃最强"（选择基地 0）
        await host.page.evaluate(() => {
            const harness = (window as any).__BG_TEST_HARNESS__;
            harness.dispatch('PLAY_ACTION', {
                cardUid: 'champ1',
                targetBaseIndex: 0,
            });
        });

        await host.page.waitForTimeout(500);

        // 8. 截图：打出"我们乃最强"后
        await host.page.screenshot({ path: 'test-results/we-are-champions-03-card-played.png' });

        // 9. P1 pass（触发计分）
        await host.page.evaluate(() => {
            const harness = (window as any).__BG_TEST_HARNESS__;
            harness.dispatch('RESPONSE_WINDOW_PASS', {});
        });

        await host.page.waitForTimeout(1000);

        // 10. 验证计分后交互弹出：选择源随从
        const sourcePromptVisible = await host.page.locator('text=/选择转出力量指示物的随从|我们乃最强/i').isVisible();
        expect(sourcePromptVisible).toBe(true);

        // 11. 截图：选择源随从交互
        await host.page.screenshot({ path: 'test-results/we-are-champions-04-choose-source.png' });

        // 12. 选择源随从（工蚁，有 2 个力量指示物）
        const sourceOption = await host.page.locator('text=/工蚁/i').first();
        await sourceOption.click();

        await host.page.waitForTimeout(500);

        // 13. 验证选择目标随从交互弹出
        const targetPromptVisible = await host.page.locator('text=/选择接收力量指示物的随从/i').isVisible();
        expect(targetPromptVisible).toBe(true);

        // 14. 截图：选择目标随从交互
        await host.page.screenshot({ path: 'test-results/we-are-champions-05-choose-target.png' });

        // 15. 选择目标随从（士兵，没有力量指示物）
        const targetOption = await host.page.locator('text=/士兵/i').first();
        await targetOption.click();

        await host.page.waitForTimeout(500);

        // 16. 验证选择数量交互弹出（滑条）
        const amountPromptVisible = await host.page.locator('text=/选择要转移的力量指示物数量/i').isVisible();
        expect(amountPromptVisible).toBe(true);

        // 17. 截图：选择数量交互
        await host.page.screenshot({ path: 'test-results/we-are-champions-06-choose-amount.png' });

        // 18. 确认转移（默认转移全部 2 个）
        const confirmButton = await host.page.locator('button:has-text("确认")').first();
        await confirmButton.click();

        await host.page.waitForTimeout(1000);

        // 19. 验证力量指示物转移成功
        const finalState = await host.page.evaluate(() => {
            const harness = (window as any).__BG_TEST_HARNESS__;
            const base = harness.state.get('core.bases.0');
            return {
                minions: base?.minions?.map((m: any) => ({
                    defId: m.defId,
                    powerCounters: m.powerCounters || 0,
                })) || [],
            };
        });

        console.log('[TEST] Final state:', finalState);

        // 验证：工蚁的力量指示物减少到 0
        const worker = finalState.minions.find((m: any) => m.defId === 'giant_ant_worker');
        expect(worker?.powerCounters).toBe(0);

        // 验证：士兵的力量指示物增加到 2
        const soldier = finalState.minions.find((m: any) => m.defId === 'giant_ant_soldier');
        expect(soldier?.powerCounters).toBe(2);

        // 20. 截图：最终状态
        await host.page.screenshot({ path: 'test-results/we-are-champions-07-final.png' });
    });
});
