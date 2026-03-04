/**
 * 大杀四方 - 基地和随从选择交互 E2E 测试
 * 
 * 验证目标：
 * 1. 基地选择交互不弹出 PromptOverlay 窗口
 * 2. 随从选择交互不弹出 PromptOverlay 窗口
 * 3. 可选目标高亮显示
 * 4. 直接点击目标完成选择
 * 5. 顶部显示交互标题横幅
 */

import { test, expect } from './fixtures';
import { waitForTestHarness } from './helpers/common';

test.describe('SmashUp Base/Minion Selection', () => {
    test('基地选择：外星人地形改造 - 不弹窗，直接点击基地', async ({ smashupMatch }) => {
        const { hostPage: page } = smashupMatch;

        // 等待测试工具就绪
        await waitForTestHarness(page);

        // 注入状态：玩家1手牌中有地形改造卡
        await page.evaluate(() => {
            const harness = window.__BG_TEST_HARNESS__!;
            harness.state.patch({
                'core.players.0.hand': [
                    { uid: 'terraform-1', defId: 'alien_terraform', type: 'action' },
                ],
                'core.players.0.actionsPlayed': 0,
                'core.players.0.actionLimit': 1,
            });
        });

        // 等待手牌渲染
        await page.waitForSelector('[data-card-uid="terraform-1"]', { timeout: 5000 });

        // 点击地形改造卡
        await page.click('[data-card-uid="terraform-1"]');

        // 等待交互标题横幅出现
        await page.waitForSelector('text=地形改造：选择要替换的基地', { timeout: 5000 });

        // 验证：不应该弹出 PromptOverlay 窗口
        const promptOverlay = page.locator('[data-testid="prompt-overlay"]');
        await expect(promptOverlay).not.toBeVisible();

        // 验证：基地应该高亮（可点击）
        const bases = page.locator('[data-testid^="base-zone-"]');
        const baseCount = await bases.count();
        expect(baseCount).toBeGreaterThan(0);

        // 点击第一个基地
        await bases.first().click();

        // 等待基地牌库选择交互（第二步）
        await page.waitForSelector('text=地形改造：从基地牌库中选择一张基地进行替换', { timeout: 5000 });

        // 验证：第二步应该弹出 PromptOverlay（选择基地牌库中的卡牌）
        await expect(promptOverlay).toBeVisible();
    });

    test('随从选择：外星人至高霸主 - 不弹窗，直接点击随从', async ({ smashupMatch }) => {
        const { hostPage: page } = smashupMatch;

        await waitForTestHarness(page);

        // 注入状态：场上有随从，玩家1手牌中有至高霸主
        await page.evaluate(() => {
            const harness = window.__BG_TEST_HARNESS__!;
            harness.state.patch({
                'core.bases.0.minions': [
                    { uid: 'minion-1', defId: 'ninja_shinobi', owner: '1', controller: '1', attachedActions: [] },
                    { uid: 'minion-2', defId: 'pirate_buccaneer', owner: '1', controller: '1', attachedActions: [] },
                ],
                'core.players.0.hand': [
                    { uid: 'overlord-1', defId: 'alien_supreme_overlord', type: 'minion' },
                ],
                'core.players.0.minionsPlayed': 0,
                'core.players.0.minionLimit': 1,
            });
        });

        // 等待手牌渲染
        await page.waitForSelector('[data-card-uid="overlord-1"]', { timeout: 5000 });

        // 点击至高霸主卡
        await page.click('[data-card-uid="overlord-1"]');

        // 点击基地打出随从
        const bases = page.locator('[data-testid^="base-zone-"]');
        await bases.first().click();

        // 等待至高霸主能力触发的交互标题
        await page.waitForSelector('text=你可以将一个随从返回到其拥有者的手上', { timeout: 5000 });

        // 验证：不应该弹出 PromptOverlay 窗口
        const promptOverlay = page.locator('[data-testid="prompt-overlay"]');
        await expect(promptOverlay).not.toBeVisible();

        // 验证：随从应该高亮（可点击）
        const minions = page.locator('[data-minion-uid]');
        const minionCount = await minions.count();
        expect(minionCount).toBeGreaterThan(0);

        // 点击第一个随从
        await minions.first().click();

        // 验证：随从应该被返回手牌（交互完成）
        await page.waitForTimeout(1000);
        const state = await page.evaluate(() => window.__BG_TEST_HARNESS__!.state.read());
        const base0Minions = state.core.bases[0].minions;
        expect(base0Minions.length).toBeLessThan(2); // 至少有一个随从被返回
    });

    test('随从选择：外星人收集者 - 不弹窗，直接点击随从', async ({ smashupMatch }) => {
        const { hostPage: page } = smashupMatch;

        await waitForTestHarness(page);

        // 注入状态：场上有力量≤3的随从，玩家1手牌中有收集者
        await page.evaluate(() => {
            const harness = window.__BG_TEST_HARNESS__!;
            harness.state.patch({
                'core.bases.0.minions': [
                    { uid: 'minion-1', defId: 'ninja_shinobi', owner: '1', controller: '1', attachedActions: [] }, // 力量2
                    { uid: 'minion-2', defId: 'pirate_first_mate', owner: '1', controller: '1', attachedActions: [] }, // 力量4
                ],
                'core.players.0.hand': [
                    { uid: 'collector-1', defId: 'alien_collector', type: 'minion' },
                ],
                'core.players.0.minionsPlayed': 0,
                'core.players.0.minionLimit': 1,
            });
        });

        await page.waitForSelector('[data-card-uid="collector-1"]', { timeout: 5000 });

        // 点击收集者卡
        await page.click('[data-card-uid="collector-1"]');

        // 点击基地打出随从
        const bases = page.locator('[data-testid^="base-zone-"]');
        await bases.first().click();

        // 等待收集者能力触发的交互标题
        await page.waitForSelector('text=你可以将这个基地的一个力量≤3的随从返回其拥有者的手上', { timeout: 5000 });

        // 验证：不应该弹出 PromptOverlay 窗口
        const promptOverlay = page.locator('[data-testid="prompt-overlay"]');
        await expect(promptOverlay).not.toBeVisible();

        // 验证：只有力量≤3的随从高亮（可点击）
        // 这里我们通过点击第一个随从来验证交互工作正常
        const minions = page.locator('[data-minion-uid="minion-1"]');
        await minions.click();

        // 验证：随从应该被返回手牌
        await page.waitForTimeout(1000);
        const state = await page.evaluate(() => window.__BG_TEST_HARNESS__!.state.read());
        const base0Minions = state.core.bases[0].minions;
        expect(base0Minions.some((m: any) => m.uid === 'minion-1')).toBe(false);
    });

    test('基地选择：外星人入侵（第二步）- 不弹窗，直接点击基地', async ({ smashupMatch }) => {
        const { hostPage: page } = smashupMatch;

        await waitForTestHarness(page);

        // 注入状态：场上有随从，玩家1手牌中有入侵卡
        await page.evaluate(() => {
            const harness = window.__BG_TEST_HARNESS__!;
            harness.state.patch({
                'core.bases.0.minions': [
                    { uid: 'minion-1', defId: 'ninja_shinobi', owner: '1', controller: '1', attachedActions: [] },
                ],
                'core.bases.1.minions': [],
                'core.players.0.hand': [
                    { uid: 'invasion-1', defId: 'alien_invasion', type: 'action' },
                ],
                'core.players.0.actionsPlayed': 0,
                'core.players.0.actionLimit': 1,
            });
        });

        await page.waitForSelector('[data-card-uid="invasion-1"]', { timeout: 5000 });

        // 点击入侵卡
        await page.click('[data-card-uid="invasion-1"]');

        // 等待第一步交互：选择要移动的随从
        await page.waitForSelector('text=选择要移动的随从', { timeout: 5000 });

        // 第一步应该不弹窗（随从选择）
        const promptOverlay = page.locator('[data-testid="prompt-overlay"]');
        await expect(promptOverlay).not.toBeVisible();

        // 点击随从
        const minions = page.locator('[data-minion-uid="minion-1"]');
        await minions.click();

        // 等待第二步交互：选择目标基地
        await page.waitForSelector('text=选择要移动到的基地', { timeout: 5000 });

        // 第二步也不应该弹窗（基地选择）
        await expect(promptOverlay).not.toBeVisible();

        // 点击第二个基地
        const bases = page.locator('[data-testid^="base-zone-"]');
        await bases.nth(1).click();

        // 验证：随从应该被移动到第二个基地
        await page.waitForTimeout(1000);
        const state = await page.evaluate(() => window.__BG_TEST_HARNESS__!.state.read());
        expect(state.core.bases[1].minions.some((m: any) => m.uid === 'minion-1')).toBe(true);
    });
});
