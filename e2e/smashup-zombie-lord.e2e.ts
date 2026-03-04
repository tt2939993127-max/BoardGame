/**
 * 大杀四方 - 僵尸领主（zombie_lord）循环链交互 E2E 测试（联机模式）
 *
 * 验证完整 UI 交互流程：
 * 1. 打出僵尸领主 → 弃牌堆面板自动打开，显示可选随从（力量≤2）
 * 2. 点击弃牌堆中的随从 → 选中状态，基地高亮
 * 3. 点击基地 → 随从部署到基地，弃牌堆面板刷新（循环或完成）
 * 4. 点击"完成" → 交互结束
 *
 * 注意：smashup allowLocalMode=false，必须使用联机模式测试
 */

import { test, expect } from '@playwright/test';
import {
    readFullState, applyCoreStateDirect, closeDebugPanel,
    waitForHandArea, getCurrentPlayer, makeCard,
    setupSUOnlineMatch,
} from './smashup-debug-helpers';

// ============================================================================
// 测试用例
// ============================================================================

test.describe('SmashUp 僵尸领主循环链交互（联机模式）', () => {
    test.setTimeout(180000);

    test('僵尸领主：弃牌堆面板自动打开 → 选随从 → 选基地 → 完成', async ({ browser }, testInfo) => {
        const baseURL = testInfo.project.use.baseURL as string | undefined;
        // P0: zombies + aliens, P1: pirates + ninjas
        const setup = await setupSUOnlineMatch(browser, baseURL, ['zombies', 'pirates', 'ninjas', 'aliens']);
        if (!setup) { test.skip(true, '游戏服务器不可用或创建房间失败'); return; }
        const { hostPage, guestPage, hostContext, guestContext } = setup;

        try {
            // 等待进入游戏
            await waitForHandArea(hostPage, 30000);

            // 读取当前状态，确认 P0 是当前玩家
            const fullState = await readFullState(hostPage);
            const core = (fullState.core ?? fullState) as Record<string, unknown>;
            const { currentPid, player } = getCurrentPlayer(core);
            const nextUid = (core.nextUid as number) ?? 100;

            // 确认 P0 是当前回合玩家（host）
            expect(currentPid).toBe('0');

            // 注入状态：手牌中放一张僵尸领主，弃牌堆放两个力量≤2的随从
            const hand = player.hand as any[];
            hand.length = 0;
            hand.push(makeCard(`card_${nextUid}`, 'zombie_lord', 'minion', currentPid));

            const discard = player.discard as any[];
            discard.length = 0;
            discard.push(
                makeCard(`card_${nextUid + 1}`, 'zombie_walker', 'minion', currentPid),
                makeCard(`card_${nextUid + 2}`, 'zombie_tenacious_z', 'minion', currentPid),
            );
            core.nextUid = nextUid + 3;

            // 确保有空基地（当前玩家无随从的基地）
            const bases = core.bases as { defId: string; minions: any[]; ongoingActions: any[] }[];
            for (const base of bases) {
                base.minions = base.minions.filter((m: any) => m.controller !== currentPid);
            }

            // 重置随从额度
            player.minionsPlayed = 0;
            player.minionLimit = 1;

            await applyCoreStateDirect(hostPage, core);
            await closeDebugPanel(hostPage);
            await hostPage.waitForTimeout(1000);

            await hostPage.screenshot({ path: testInfo.outputPath('step0-initial.png'), fullPage: true });

            // Step 1: 打出僵尸领主到第一个基地
            const handArea = hostPage.getByTestId('su-hand-area');
            const handCards = handArea.locator('> div > div');
            await expect(handCards.first()).toBeVisible({ timeout: 5000 });
            await handCards.first().click();
            await hostPage.waitForTimeout(500);

            // 点击第一个基地
            await hostPage.evaluate(() => {
                const bases = document.querySelectorAll('.group\\/base');
                if (bases.length === 0) return;
                const selectors = ['[class*="w-[14vw]"]', '.cursor-pointer'];
                for (const sel of selectors) {
                    const el = bases[0].querySelector(sel) as HTMLElement;
                    if (el) { el.click(); return; }
                }
                (bases[0] as HTMLElement).click();
            });
            await hostPage.waitForTimeout(2000);

            await hostPage.screenshot({ path: testInfo.outputPath('step1-after-play.png'), fullPage: true });

            // Step 2: 验证弃牌堆面板自动打开（核心验证点）
            const discardPanel = hostPage.locator('[data-discard-view-panel]');
            const panelVisible = await discardPanel.isVisible().catch(() => false);
            const amberHighlights = await hostPage.locator('[class*="ring-amber"]').count();

            console.log(`弃牌堆面板可见: ${panelVisible}, ring-amber 高亮数: ${amberHighlights}`);
            await hostPage.screenshot({ path: testInfo.outputPath('step2-panel-auto-open.png'), fullPage: true });

            // 面板必须自动打开
            expect(panelVisible || amberHighlights > 0).toBe(true);

            // Step 3: 点击一张高亮的弃牌堆随从
            const clickCardResult = await hostPage.evaluate(() => {
                const amberCards = document.querySelectorAll('[class*="ring-amber"]');
                for (const card of amberCards) {
                    const clickTarget = card.closest('.flex-shrink-0') || card.parentElement;
                    if (clickTarget) {
                        (clickTarget as HTMLElement).click();
                        return 'clicked';
                    }
                }
                return 'no-card-found';
            });
            console.log('选择弃牌堆随从:', clickCardResult);
            expect(clickCardResult).toBe('clicked');
            await hostPage.waitForTimeout(500);

            await hostPage.screenshot({ path: testInfo.outputPath('step3-card-selected.png'), fullPage: true });

            // 验证选中提示
            const selectHint = hostPage.getByText(/Click.*base|点击基地/i);
            await expect(selectHint).toBeVisible({ timeout: 3000 });

            // Step 4: 点击一个高亮的基地部署随从
            const baseDeployResult = await hostPage.evaluate(() => {
                const selectableBases = document.querySelectorAll('[class*="ring-amber-400"]');
                for (const el of selectableBases) {
                    if (el.classList.toString().includes('w-[14vw]')) {
                        (el as HTMLElement).click();
                        return 'clicked-base';
                    }
                }
                return 'no-selectable-base';
            });
            console.log('点击基地:', baseDeployResult);
            expect(baseDeployResult).toBe('clicked-base');
            await hostPage.waitForTimeout(1500);

            await hostPage.screenshot({ path: testInfo.outputPath('step4-after-deploy.png'), fullPage: true });

            // Step 5: 验证最终状态
            const afterState = await readFullState(hostPage);
            const afterCore = (afterState.core ?? afterState) as Record<string, unknown>;
            const afterBases = afterCore.bases as { minions: { defId: string; controller: string }[] }[];

            let totalMinions = 0;
            for (const base of afterBases) {
                totalMinions += base.minions.filter(m => m.controller === currentPid).length;
            }
            // 至少有僵尸领主(1) + 从弃牌堆部署的随从(≥1) = ≥2
            console.log(`当前玩家基地上随从总数: ${totalMinions}`);
            expect(totalMinions).toBeGreaterThanOrEqual(2);
        } finally {
            await hostContext.close();
            await guestContext.close();
        }
    });

    test('僵尸领主：弃牌堆无力量≤2随从时不弹面板', async ({ browser }, testInfo) => {
        const baseURL = testInfo.project.use.baseURL as string | undefined;
        const setup = await setupSUOnlineMatch(browser, baseURL, ['zombies', 'pirates', 'ninjas', 'aliens']);
        if (!setup) { test.skip(true, '游戏服务器不可用或创建房间失败'); return; }
        const { hostPage, guestPage, hostContext, guestContext } = setup;

        try {
            await waitForHandArea(hostPage, 30000);

            const fullState = await readFullState(hostPage);
            const core = (fullState.core ?? fullState) as Record<string, unknown>;
            const { currentPid, player } = getCurrentPlayer(core);
            const nextUid = (core.nextUid as number) ?? 100;

            // 手牌只放僵尸领主，弃牌堆放一个力量>2的随从（不符合条件）
            const hand = player.hand as any[];
            hand.length = 0;
            hand.push(makeCard(`card_${nextUid}`, 'zombie_lord', 'minion', currentPid));

            const discard = player.discard as any[];
            discard.length = 0;
            // zombie_grave_digger 力量4，不符合≤2条件
            discard.push(makeCard(`card_${nextUid + 1}`, 'zombie_grave_digger', 'minion', currentPid));
            core.nextUid = nextUid + 2;

            player.minionsPlayed = 0;
            player.minionLimit = 1;

            await applyCoreStateDirect(hostPage, core);
            await closeDebugPanel(hostPage);
            await hostPage.waitForTimeout(1000);

            // 打出僵尸领主
            const handArea = hostPage.getByTestId('su-hand-area');
            const handCards = handArea.locator('> div > div');
            await expect(handCards.first()).toBeVisible({ timeout: 5000 });
            await handCards.first().click();
            await hostPage.waitForTimeout(500);

            await hostPage.evaluate(() => {
                const bases = document.querySelectorAll('.group\\/base');
                if (bases.length > 0) {
                    const selectors = ['[class*="w-[14vw]"]', '.cursor-pointer'];
                    for (const sel of selectors) {
                        const el = bases[0].querySelector(sel) as HTMLElement;
                        if (el) { el.click(); return; }
                    }
                    (bases[0] as HTMLElement).click();
                }
            });
            await hostPage.waitForTimeout(1500);

            await hostPage.screenshot({ path: testInfo.outputPath('no-eligible-minions.png'), fullPage: true });

            // 弃牌堆面板不应自动打开
            const discardPanel = hostPage.locator('[data-discard-view-panel]');
            const panelVisible = await discardPanel.isVisible().catch(() => false);
            const amberHighlights = await hostPage.locator('[class*="ring-amber"]').count();

            console.log(`无合格随从时面板: ${panelVisible}, 高亮数: ${amberHighlights}`);
            expect(panelVisible).toBe(false);
            expect(amberHighlights).toBe(0);
        } finally {
            await hostContext.close();
            await guestContext.close();
        }
    });
});
