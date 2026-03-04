/**
 * 大杀四方 - 多基地计分完整流程 E2E 测试
 * 
 * 验证用户反馈的所有问题都已修复：
 * 1. 托尔图加被清空和替换了 2 次 ❌
 * 2. 伦格高原被清空和替换了 2 次 ❌
 * 3. 伦格高原被计分了 2 次 ❌
 * 4. 大副重复触发 ❌
 * 5. 重复选了两轮计分基地 ❌
 */

import { test, expect } from './fixtures';

test.describe('多基地计分完整流程', () => {
    test('验证多基地计分不重复（托尔图加 + 伦格高原 + 大副）', async ({ smashupMatch }) => {
        const { hostPage: page } = smashupMatch;

        // 1. 注入测试场景：2 个基地同时达到计分条件
        // 托尔图加（海盗湾）：P0 力量 11，P1 力量 10，breakpoint=20
        // 伦格高原：P0 力量 10，P1 力量 9，breakpoint=18
        // 两个基地都有 afterScoring 交互
        await page.evaluate(() => {
            const harness = (window as any).__BG_TEST_HARNESS__;
            
            // 创建托尔图加基地（海盗湾，afterScoring: 亚军移动随从）
            const tortuga = {
                defId: 'base_tortuga',
                minions: [
                    { uid: 'm0', defId: 'pirate_first_mate', owner: '0', controller: '0', power: 3 },
                    { uid: 'm1', defId: 'test_minion', owner: '0', controller: '0', power: 8 },
                    { uid: 'm2', defId: 'test_minion', owner: '1', controller: '1', power: 10 },
                ],
                ongoingActions: [],
            };
            
            // 创建伦格高原基地（有 afterScoring 交互）
            const plateau = {
                defId: 'base_rumble_in_r_lyeh',
                minions: [
                    { uid: 'm3', defId: 'test_minion', owner: '0', controller: '0', power: 10 },
                    { uid: 'm4', defId: 'test_minion', owner: '1', controller: '1', power: 9 },
                ],
                ongoingActions: [],
            };
            
            // 创建第三个基地（不达标）
            const jungle = {
                defId: 'base_the_jungle',
                minions: [],
                ongoingActions: [],
            };
            
            harness.state.patch({
                'core.bases': [tortuga, plateau, jungle],
                'core.baseDeck': ['base_tar_pits', 'base_central_brain', 'base_ninja_dojo'],
                'sys.phase': 'playCards',
            });
        });

        // 2. 推进到 scoreBases 阶段
        await page.click('[data-testid="advance-phase-button"]');
        await page.waitForTimeout(500);

        // 3. 应该看到多基地选择交互（2 个选项：托尔图加、伦格高原）
        await expect(page.locator('text=选择先记分的基地')).toBeVisible();
        
        // 截图：多基地选择
        await page.screenshot({ path: 'test-results/multi-base-scoring-choice.png' });

        // 4. 选择先计分托尔图加
        await page.click('text=托尔图加');
        await page.waitForTimeout(500);

        // 5. 应该看到大副的 afterScoring 交互（P1 亚军移动随从）
        await expect(page.locator('text=移动随从')).toBeVisible();
        
        // 截图：大副交互
        await page.screenshot({ path: 'test-results/first-mate-interaction.png' });

        // 6. P1 选择跳过移动
        await page.click('text=跳过');
        await page.waitForTimeout(500);

        // 7. 应该看到新的多基地选择交互（只剩伦格高原）
        await expect(page.locator('text=计分最后一个基地')).toBeVisible();
        
        // 截图：最后一个基地选择
        await page.screenshot({ path: 'test-results/last-base-choice.png' });

        // 8. 选择计分伦格高原
        await page.click('text=伦格高原');
        await page.waitForTimeout(500);

        // 9. 应该看到伦格高原的 afterScoring 交互
        // （具体交互取决于基地能力）
        await page.waitForTimeout(500);

        // 10. 验证 EventStream 中的事件不重复
        const eventStats = await page.evaluate(() => {
            const harness = (window as any).__BG_TEST_HARNESS__;
            const events = harness.state.get('sys.eventStream.entries') || [];
            const eventTypes = events.map((e: any) => e.event.type);
            
            return {
                baseScoredCount: eventTypes.filter((e: string) => e === 'su:base_scored').length,
                baseClearedCount: eventTypes.filter((e: string) => e === 'su:base_cleared').length,
                baseReplacedCount: eventTypes.filter((e: string) => e === 'su:base_replaced').length,
                allEvents: eventTypes,
            };
        });

        console.log('=== 事件统计 ===');
        console.log('BASE_SCORED:', eventStats.baseScoredCount);
        console.log('BASE_CLEARED:', eventStats.baseClearedCount);
        console.log('BASE_REPLACED:', eventStats.baseReplacedCount);

        // 验证：每个基地只计分一次
        expect(eventStats.baseScoredCount).toBe(2); // 托尔图加 + 伦格高原

        // 验证：每个基地只被清空和替换一次
        expect(eventStats.baseClearedCount).toBe(2); // 托尔图加 + 伦格高原
        expect(eventStats.baseReplacedCount).toBe(2); // 托尔图加 + 伦格高原

        // 11. 截图：最终状态
        await page.screenshot({ path: 'test-results/multi-base-scoring-final.png' });
    });
});
