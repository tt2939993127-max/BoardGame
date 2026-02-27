/**
 * DiceThrone 护盾日志显示 E2E 测试
 * 
 * 验证护盾减伤在 ActionLog 中的实际显示效果
 */

import { test, expect } from '@playwright/test';
import { setupDTOnlineMatch, selectCharacter, waitForGameBoard } from './helpers/dicethrone';

test.describe('DiceThrone 护盾日志显示', () => {
    test('多个护盾叠加时不应该重复显示', async ({ browser }, testInfo) => {
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

        // 使用调试面板注入测试场景
        await hostPage.evaluate(() => {
            const harness = (window as any).__BG_TEST_HARNESS__;
            if (!harness) throw new Error('TestHarness not available');

            // 注入场景：p1 有两个护盾，p2 发动攻击
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
                    pendingAttack: {
                        attackerId: 'p2',
                        defenderId: 'p1',
                        sourceAbilityId: 'test-attack',
                        isUltimate: false,
                        isDefendable: true,
                    },
                },
            });
        });

        // 执行伤害命令
        await hostPage.evaluate(() => {
            const harness = (window as any).__BG_TEST_HARNESS__;
            harness.command.dispatch({
                type: 'TEST_DAMAGE',
                playerId: 'p2',
                payload: {
                    targetId: 'p1',
                    amount: 8,
                    sourceAbilityId: 'test-attack',
                },
            });
        });

        // 等待 ActionLog 更新
        await hostPage.waitForTimeout(500);

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

        // 验证日志内容
        expect(logContent).not.toBeNull();
        expect(logContent!.displayText).toBe('0'); // 8 - 6 - 2 = 0

        // 验证护盾行数量：应该只有 2 个，不应该有重复
        const shieldLines = logContent!.lines.filter((line: any) => line.value < 0);
        expect(shieldLines).toHaveLength(2);

        // 验证护盾值
        const shieldValues = shieldLines.map((line: any) => line.value).sort((a: number, b: number) => a - b);
        expect(shieldValues).toEqual([-6, -2]); // 下次一定消耗6点，神圣防御消耗2点

        // 截图保存（用于人工验证）
        await hostPage.screenshot({
            path: testInfo.outputPath('shield-logging-visual.png'),
            fullPage: true,
        });
    });
});
