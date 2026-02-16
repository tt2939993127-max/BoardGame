/**
 * 大杀四方 - 弃牌堆出牌交互 E2E 测试
 *
 * 验证弃牌堆面板统一交互流程：
 * 1. 打开弃牌堆 → 显示所有卡牌，可打出的卡牌金色描边高亮
 * 2. 点击可打出卡牌 → 选中状态
 * 3. 选中后基地高亮 → 点击基地部署
 */

import { test, expect, type Page } from '@playwright/test';
import {
    initContext,
    dismissViteOverlay,
} from './helpers/common';

// ============================================================================
// 工具函数
// ============================================================================

const ensureDebugPanelOpen = async (page: Page) => {
    const panel = page.getByTestId('debug-panel');
    if (await panel.isVisible().catch(() => false)) return;
    await page.getByTestId('debug-toggle').click();
    await expect(panel).toBeVisible({ timeout: 5000 });
};

const closeDebugPanel = async (page: Page) => {
    const panel = page.getByTestId('debug-panel');
    if (await panel.isVisible().catch(() => false)) {
        await page.getByTestId('debug-toggle').click();
        await expect(panel).toBeHidden({ timeout: 5000 });
    }
};

const readCoreState = async (page: Page) => {
    const panel = page.getByTestId('debug-panel');
    if (!await panel.isVisible().catch(() => false)) {
        await page.getByTestId('debug-toggle').click();
        await expect(panel).toBeVisible({ timeout: 5000 });
    }
    const stateTab = page.getByTestId('debug-tab-state');
    if (await stateTab.isVisible().catch(() => false)) await stateTab.click();
    const raw = await page.getByTestId('debug-state-json').innerText();
    return JSON.parse(raw) as { core?: Record<string, unknown> };
};

const applyCoreState = async (page: Page, coreState: unknown) => {
    await ensureDebugPanelOpen(page);
    const stateTab = page.getByTestId('debug-tab-state');
    if (await stateTab.isVisible().catch(() => false)) await stateTab.click();
    const toggleBtn = page.getByTestId('debug-state-toggle-input');
    if (await toggleBtn.isVisible().catch(() => false)) await toggleBtn.click();
    const input = page.getByTestId('debug-state-input');
    await expect(input).toBeVisible({ timeout: 3000 });
    await input.fill(JSON.stringify(coreState));
    await page.getByTestId('debug-state-apply').click();
    await page.waitForTimeout(500);
};

const gotoLocalSmashUp = async (page: Page) => {
    await page.goto('/play/smashup/local', { waitUntil: 'domcontentloaded' });
    await dismissViteOverlay(page);
    await page.waitForFunction(
        () => {
            if (document.querySelector('[data-testid="su-hand-area"]')) return true;
            if (document.querySelector('[data-testid="debug-toggle"]')) return true;
            if (document.querySelector('h1')?.textContent?.match(/Draft Your Factions|选择你的派系/)) return true;
            return false;
        },
        { timeout: 20000 },
    );
};

const completeFactionSelectionLocal = async (page: Page) => {
    const factionHeading = page.locator('h1').filter({ hasText: /Draft Your Factions|选择你的派系/i });
    if (!await factionHeading.isVisible().catch(() => false)) return;
    const factionCards = page.locator('.grid > div');
    const confirmBtn = page.getByRole('button', { name: /Confirm Selection|确认选择/i });
    // 蛇形选秀：P0选1 → P1选2 → P0选1
    for (let i = 0; i < 4; i++) {
        await factionCards.nth(i).click();
        await expect(confirmBtn).toBeVisible({ timeout: 5000 });
        await confirmBtn.click();
        await page.waitForTimeout(500);
    }
    await page.waitForTimeout(1000);
};

const waitForHandArea = async (page: Page, timeout = 30000) => {
    const handArea = page.getByTestId('su-hand-area');
    await expect(handArea).toBeVisible({ timeout });
    return handArea;
};

// ============================================================================
// 测试用例
// ============================================================================

test.describe('SmashUp 弃牌堆出牌交互', () => {
    test.setTimeout(120000);

    test.beforeEach(async ({ context }) => {
        await initContext(context, { storageKey: '__smashup_discard_play_reset' });
    });

    test('弃牌堆面板：可打出卡牌高亮 → 选中 → 部署到基地', async ({ page }, testInfo) => {
        await gotoLocalSmashUp(page);
        await completeFactionSelectionLocal(page);
        await waitForHandArea(page);

        // 读取当前状态并注入弃牌堆中的顽强丧尸
        const fullState = await readCoreState(page);
        const core = (fullState.core ?? fullState) as Record<string, unknown>;
        const players = core.players as Record<string, Record<string, unknown>>;
        const turnOrder = core.turnOrder as string[];
        const currentPid = turnOrder[(core.currentPlayerIndex as number) ?? 0];
        const player = players[currentPid];

        // 向弃牌堆注入顽强丧尸和一些普通卡（模拟真实弃牌堆）
        const discard = player.discard as { uid: string; defId: string }[];
        const nextUid = (core.nextUid as number) ?? 100;
        // 添加 2 张顽强丧尸 + 1 张普通随从到弃牌堆
        discard.push(
            { uid: `card_${nextUid}`, defId: 'zombie_tenacious_z' },
            { uid: `card_${nextUid + 1}`, defId: 'zombie_tenacious_z' },
            { uid: `card_${nextUid + 2}`, defId: 'zombie_walker' },
        );
        core.nextUid = nextUid + 3;
        // 确保未使用过弃牌堆出牌能力
        player.usedDiscardPlayAbilities = [];

        await applyCoreState(page, core);
        await closeDebugPanel(page);
        await page.waitForTimeout(1000);

        // Step 1: 点击弃牌堆打开面板
        const discardToggle = page.locator('[data-discard-toggle]');
        await expect(discardToggle).toBeVisible({ timeout: 5000 });
        await discardToggle.click();
        await page.waitForTimeout(800);

        // 验证弃牌堆面板出现
        const discardPanel = page.locator('[data-discard-view-panel]');
        await expect(discardPanel).toBeVisible({ timeout: 5000 });

        // 截图 1：弃牌堆面板，可打出卡牌应有金色描边
        await page.screenshot({ path: testInfo.outputPath('step1-discard-panel-with-highlights.png'), fullPage: true });

        // 验证面板中有卡牌
        const panelCards = discardPanel.locator('.flex-shrink-0');
        const cardCount = await panelCards.count();
        expect(cardCount).toBeGreaterThanOrEqual(3); // 至少有我们注入的 3 张

        // 验证有金色描边的卡牌（ring-amber = 可打出高亮）
        const highlightedCards = discardPanel.locator('[class*="ring-amber"]');
        const highlightCount = await highlightedCards.count();
        expect(highlightCount).toBeGreaterThan(0);

        // Step 2: 点击一张高亮的卡牌（顽强丧尸）
        await highlightedCards.first().click();
        await page.waitForTimeout(500);

        // 截图 2：卡牌选中状态
        await page.screenshot({ path: testInfo.outputPath('step2-card-selected.png'), fullPage: true });

        // 验证选中提示文本出现（"点击基地放置随从"）
        const selectHint = page.getByText(/Click.*base|点击基地/i);
        await expect(selectHint).toBeVisible({ timeout: 3000 });

        // Step 3: 点击一个基地部署
        const bases = page.locator('.group\\/base');
        const baseCount = await bases.count();
        expect(baseCount).toBeGreaterThanOrEqual(1);

        // 截图 3：基地高亮状态（选中卡牌后基地应该有高亮指示）
        await page.screenshot({ path: testInfo.outputPath('step3-bases-highlighted.png'), fullPage: true });

        // 点击第一个基地
        await bases.first().locator('> div').first().click();
        await page.waitForTimeout(1000);

        // 截图 4：部署完成后
        await page.screenshot({ path: testInfo.outputPath('step4-after-deploy.png'), fullPage: true });

        // 验证弃牌堆数量减少（卡牌被打出）
        // 重新打开弃牌堆查看
        await discardToggle.click();
        await page.waitForTimeout(500);
        const afterPanel = page.locator('[data-discard-view-panel]');
        if (await afterPanel.isVisible().catch(() => false)) {
            const afterCards = afterPanel.locator('.flex-shrink-0');
            const afterCount = await afterCards.count();
            // 打出一张后应该少一张
            expect(afterCount).toBeLessThan(cardCount);
        }

        await page.screenshot({ path: testInfo.outputPath('step5-after-deploy-discard.png'), fullPage: true });
    });
});
