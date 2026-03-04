/**
 * DiceThrone 护盾日志显示 E2E 测试
 * 
 * 验证护盾减伤在 ActionLog 中的实际显示效果
 */

import { test, expect } from '@playwright/test';
import { setupDTOnlineMatch, selectCharacter, waitForGameBoard } from './helpers/dicethrone';

test.describe('DiceThrone 护盾日志显示', () => {
    test('多个护盾叠加时应显示正确的最终伤害', async ({ browser }, testInfo) => {
        const baseURL = testInfo.project.use.baseURL as string | undefined;
        const setup = await setupDTOnlineMatch(browser, baseURL);

        if (!setup) {
            test.skip(true, '游戏服务器不可用或创建房间失败');
            return;
        }

        const { hostPage, guestPage } = setup;

        // 选择角色
        await selectCharacter(hostPage, 'paladin');
        await selectCharacter(guestPage, 'shadow_thief');
        await waitForGameBoard(hostPage);

        // 等待 TestHarness 就绪
        await hostPage.waitForFunction(() => {
            return typeof (window as any).__BG_TEST_HARNESS__ !== 'undefined';
        }, { timeout: 10000 });

        // 使用调试面板注入测试场景：p1 有两个护盾（下次一定6点 + 神圣防御3点）
        await hostPage.evaluate(() => {
            const harness = (window as any).__BG_TEST_HARNESS__;
            if (!harness) throw new Error('TestHarness not available');

            // 注入护盾
            harness.state.patch({
                core: {
                    players: {
                        p1: {
                            damageShields: [
                                { sourceId: 'card-next-time', value: 6, preventStatus: false },
                                { sourceId: 'holy-defense', value: 3, preventStatus: false },
                            ],
                        },
                    },
                },
            });
        });

        // 等待状态更新
        await hostPage.waitForTimeout(500);

        // 执行 10 点伤害（应该扣除 6 + 3 = 9 点护盾，最终 1 点伤害）
        await hostPage.evaluate(() => {
            const harness = (window as any).__BG_TEST_HARNESS__;
            
            // 先创建 pendingAttack
            harness.state.patch({
                core: {
                    pendingAttack: {
                        attackerId: 'p2',
                        defenderId: 'p1',
                        sourceAbilityId: 'test-attack',
                        isUltimate: false,
                        isDefendable: true,
                    },
                },
            });
            
            // 然后执行伤害
            harness.command.dispatch({
                type: 'TEST_DAMAGE',
                playerId: 'p2',
                payload: {
                    targetId: 'p1',
                    amount: 10,
                    sourceAbilityId: 'test-attack',
                },
            });
        });

        // 等待 ActionLog 更新
        await hostPage.waitForTimeout(1000);

        // 截图（用于人工验证）
        await hostPage.screenshot({
            path: testInfo.outputPath('shield-logging-before-check.png'),
            fullPage: true,
        });

        // 读取 ActionLog 内容
        const logContent = await hostPage.evaluate(() => {
            const state = (window as any).__BG_STATE__;
            if (!state) return null;

            const entries = state.sys?.actionLog?.entries ?? [];
            const damageEntry = entries.find((e: any) => e.kind === 'DAMAGE_DEALT');
            
            if (!damageEntry) return null;

            const breakdownSeg = damageEntry.segments.find((s: any) => s.type === 'breakdown');
            if (!breakdownSeg || breakdownSeg.type !== 'breakdown') return null;

            return {
                displayText: breakdownSeg.displayText,
                lines: breakdownSeg.lines.map((line: any) => ({
                    label: line.label,
                    value: line.value,
                    color: line.color,
                })),
            };
        });

        console.log('ActionLog content:', JSON.stringify(logContent, null, 2));

        // 验证日志内容
        expect(logContent).not.toBeNull();
        
        // 验证护盾行数量：应该只有 2 个，不应该有重复
        const shieldLines = logContent!.lines.filter((line: any) => line.value < 0);
        expect(shieldLines.length).toBe(2);

        // 验证护盾值
        const shieldValues = shieldLines.map((line: any) => line.value).sort((a: number, b: number) => a - b);
        expect(shieldValues).toEqual([-6, -3]); // 下次一定消耗6点，神圣防御消耗3点

        // 关键验证：displayText 应该是最终伤害 1 点（10 - 6 - 3 = 1），而不是基础伤害 10 点
        expect(logContent!.displayText).toBe('1');

        // 最终截图
        await hostPage.screenshot({
            path: testInfo.outputPath('shield-logging-final.png'),
            fullPage: true,
        });
    });
});
