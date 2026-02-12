/**
 * SummonerWars E2E 测试专用工具函数
 *
 * 包含：大厅/房间创建、阵营选择、调试面板操作、棋盘交互、游戏 UI 等待。
 * 通用函数（locale/audio/storage/server）从 ./common 导入。
 */

import { expect, type Browser, type BrowserContext, type Page } from '@playwright/test';
import {
    initContext,
    getGameServerBaseURL,
    waitForMatchAvailable,
    dismissViteOverlay,
    attachPageDiagnostics,
    waitForHomeGameList,
    dismissLobbyConfirmIfNeeded,
    createGuestId,
} from './common';

export const GAME_NAME = 'summonerwars';

// ============================================================================
// 大厅 / 房间创建（UI 方式）
// ============================================================================

/** 确保 SW 游戏卡片可见 */
export const ensureSummonerWarsCard = async (page: Page) => {
    await waitForHomeGameList(page);
    let card = page.locator('[data-game-id="summonerwars"]');
    if (await card.count() === 0) {
        const strategyTab = page.getByRole('button', { name: /Strategy|策略/i });
        if (await strategyTab.isVisible().catch(() => false)) await strategyTab.click();
        card = page.locator('[data-game-id="summonerwars"]');
    }
    await expect(card).toHaveCount(1, { timeout: 15000 });
    await card.first().scrollIntoViewIfNeeded();
    return card.first();
};

/** 打开 SW 游戏弹窗 */
export const ensureSummonerWarsModalOpen = async (page: Page) => {
    const modalRoot = page.locator('#modal-root');
    const modalHeading = modalRoot.getByRole('heading', { name: /Summoner Wars|召唤师战争/i });
    try {
        await expect(modalHeading).toBeVisible({ timeout: 2000 });
    } catch {
        const gameCard = await ensureSummonerWarsCard(page);
        await gameCard.click();
        await expect(modalHeading).toBeVisible({ timeout: 15000 });
    }
    return { modalRoot, modalHeading };
};

/** 通过 UI 创建 SW 房间，返回 matchId */
export const createSummonerWarsRoom = async (page: Page): Promise<string | null> => {
    attachPageDiagnostics(page);
    await page.goto('/?game=summonerwars', { waitUntil: 'domcontentloaded' });
    await dismissViteOverlay(page);
    await dismissLobbyConfirmIfNeeded(page);

    const { modalRoot } = await ensureSummonerWarsModalOpen(page);
    const lobbyTab = modalRoot.getByRole('button', { name: /Lobby|在线大厅/i });
    if (await lobbyTab.isVisible().catch(() => false)) await lobbyTab.click();

    // 检查是否已有对局
    const returnButton = modalRoot
        .locator('button:visible', { hasText: /Return to match|返回当前对局/i })
        .first();
    if (await returnButton.isVisible().catch(() => false)) {
        await returnButton.click();
        await page.waitForURL(/\/play\/summonerwars\/match\//, { timeout: 10000 });
        return new URL(page.url()).pathname.split('/').pop() ?? null;
    }

    const createButton = modalRoot
        .locator('button:visible', { hasText: /Create Room|创建房间/i })
        .first();
    await expect(createButton).toBeVisible({ timeout: 20000 });
    await createButton.click();
    await expect(
        page.getByRole('heading', { name: /Create Room|创建房间/i }),
    ).toBeVisible({ timeout: 10000 });
    const confirmButton = page.getByRole('button', { name: /Confirm|确认/i });
    await expect(confirmButton).toBeEnabled({ timeout: 5000 });
    await confirmButton.click();

    try {
        await page.waitForURL(/\/play\/summonerwars\/match\//, { timeout: 8000 });
    } catch {
        return null;
    }

    const matchId = new URL(page.url()).pathname.split('/').pop() ?? null;
    if (!matchId) return null;
    if (!(await waitForMatchAvailable(page, GAME_NAME, matchId, 15000))) return null;
    return matchId;
};

/** 通过 API 创建 SW 房间，返回 { matchId, ownerGuestId } */
export const createSummonerWarsRoomViaAPI = async (
    page: Page,
): Promise<{ matchId: string; ownerGuestId: string } | null> => {
    const gameServerBaseURL = getGameServerBaseURL();
    const ownerGuestId = createGuestId('host');
    try {
        const response = await page.request.post(
            `${gameServerBaseURL}/games/summonerwars/create`,
            { data: { numPlayers: 2, setupData: { guestId: ownerGuestId } } },
        );
        if (!response.ok()) return null;
        const data = (await response.json().catch(() => null)) as { matchID?: string } | null;
        const matchId = data?.matchID ?? null;
        if (!matchId) return null;
        if (!(await waitForMatchAvailable(page, GAME_NAME, matchId, 15000))) return null;
        return { matchId, ownerGuestId };
    } catch {
        return null;
    }
};

// ============================================================================
// URL / UI 辅助
// ============================================================================

/** 确保 URL 中包含 playerID 参数 */
export const ensurePlayerIdInUrl = async (page: Page, playerId: string) => {
    const url = new URL(page.url());
    if (url.searchParams.get('playerID') !== playerId) {
        url.searchParams.set('playerID', playerId);
        await page.goto(url.toString());
    }
};

/** 隐藏 FAB 菜单避免遮挡点击 */
export const disableFabMenu = async (page: Page) => {
    await page
        .addStyleTag({
            content:
                '[data-testid="fab-menu"] { pointer-events: none !important; opacity: 0 !important; }',
        })
        .catch(() => {});
};

/** 禁用 SW 自动跳过 */
export const disableSummonerWarsAutoSkip = async (context: BrowserContext | Page) => {
    await context.addInitScript(() => {
        (window as Window & { __SW_DISABLE_AUTO_SKIP__?: boolean }).__SW_DISABLE_AUTO_SKIP__ = true;
    });
};

/** 启用 E2E 调试模式 */
export const enableE2EDebug = async (context: BrowserContext | Page) => {
    await context.addInitScript(() => {
        (window as Window & { __BG_E2E_DEBUG__?: boolean }).__BG_E2E_DEBUG__ = true;
    });
};

// ============================================================================
// 游戏 UI 等待
// ============================================================================

/** 等待 SW 游戏 UI 就绪 */
export const waitForSummonerWarsUI = async (page: Page, timeout = 20000) => {
    await expect(page.getByTestId('sw-action-banner')).toBeVisible({ timeout });
    await expect(page.getByTestId('sw-hand-area')).toBeVisible({ timeout });
    await expect(page.getByTestId('sw-map-container')).toBeVisible({ timeout });
    await expect(page.getByTestId('sw-end-phase')).toBeVisible({ timeout });
    await disableFabMenu(page);
};

/** 等待阵营选择界面 */
export const waitForFactionSelection = async (page: Page, timeout = 20000) => {
    await expect(
        page.locator('h1').filter({ hasText: /选择你的阵营|Choose your faction/i }),
    ).toBeVisible({ timeout });
};

/** 选择阵营（点击阵营卡片） */
export const selectFaction = async (page: Page, factionIndex: number) => {
    const factionCards = page.locator('.grid > div');
    const card = factionCards.nth(factionIndex);
    await expect(card).toBeVisible({ timeout: 5000 });
    await card.click();
};

/** 完成双方阵营选择并开始游戏 */
export const completeFactionSelection = async (hostPage: Page, guestPage: Page) => {
    const selectionHeading = (page: Page) =>
        page.locator('h1').filter({ hasText: /选择你的阵营|Choose your faction/i });
    await expect(selectionHeading(hostPage)).toBeVisible({ timeout: 20000 });
    await expect(selectionHeading(guestPage)).toBeVisible({ timeout: 20000 });

    const factionCards = (page: Page) => page.locator('.grid > div');
    await factionCards(hostPage).nth(0).click();
    await hostPage.waitForTimeout(500);
    await factionCards(guestPage).nth(1).click();
    await guestPage.waitForTimeout(500);

    const readyButton = guestPage.locator('button').filter({ hasText: /准备|Ready/i });
    await expect(readyButton).toBeVisible({ timeout: 5000 });
    await readyButton.click();
    await hostPage.waitForTimeout(500);

    const startButton = hostPage.locator('button').filter({ hasText: /开始游戏|Start Game/i });
    await expect(startButton).toBeVisible({ timeout: 5000 });
    await expect(startButton).toBeEnabled({ timeout: 5000 });
    await startButton.click();

    await expect(hostPage.getByTestId('sw-end-phase')).toBeVisible({ timeout: 30000 });
    await expect(guestPage.getByTestId('sw-end-phase')).toBeVisible({ timeout: 30000 });
};

// ============================================================================
// 调试面板操作
// ============================================================================

/** 打开调试面板 */
export const ensureDebugPanelOpen = async (page: Page) => {
    const panel = page.getByTestId('debug-panel');
    if (await panel.isVisible().catch(() => false)) return;
    await page.getByTestId('debug-toggle').click();
    await expect(panel).toBeVisible({ timeout: 5000 });
};

/** 关闭调试面板 */
export const closeDebugPanelIfOpen = async (page: Page) => {
    const panel = page.getByTestId('debug-panel');
    if (await panel.isVisible().catch(() => false)) {
        await page.getByTestId('debug-toggle').click();
        await expect(panel).toBeHidden({ timeout: 5000 });
    }
};

/** 切换到调试面板的状态 Tab */
export const ensureDebugStateTab = async (page: Page) => {
    await ensureDebugPanelOpen(page);
    const stateTab = page.getByTestId('debug-tab-state');
    if (await stateTab.isVisible().catch(() => false)) await stateTab.click();
};

/** 读取当前 core 状态 */
export const readCoreState = async (page: Page) => {
    await ensureDebugStateTab(page);
    const raw = await page.getByTestId('debug-state-json').innerText();
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    return (parsed?.core ?? parsed?.G ?? parsed) as Record<string, unknown>;
};

/** 直接写入 core 状态对象 */
export const applyCoreState = async (page: Page, coreState: unknown) => {
    await ensureDebugStateTab(page);
    await page.getByTestId('debug-state-toggle-input').click();
    const input = page.getByTestId('debug-state-input');
    await expect(input).toBeVisible({ timeout: 3000 });
    await input.fill(JSON.stringify(coreState));
    await page.getByTestId('debug-state-apply').click();
    await expect(input).toBeHidden({ timeout: 5000 }).catch(() => {});
};

// ============================================================================
// 棋盘交互
// ============================================================================

/** 点击棋盘元素（通过 evaluate 触发 click 事件） */
export const clickBoardElement = async (page: Page, selector: string) => {
    const clicked = await page.evaluate((sel) => {
        const el = document.querySelector(sel);
        if (!el) return false;
        el.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
        return true;
    }, selector);
    if (!clicked) throw new Error(`棋盘元素未找到 ${selector}`);
};

/** 等待指定阶段 */
export const waitForPhase = async (page: Page, phase: string) => {
    await expect
        .poll(() => page.getByTestId('sw-action-banner').getAttribute('data-phase'))
        .toBe(phase);
};

/** 深拷贝状态 */
export const cloneState = <T>(value: T): T => JSON.parse(JSON.stringify(value)) as T;

// ============================================================================
// 在线对局创建（双人，基于 initContext）
// ============================================================================

export interface SummonerWarsMatchSetup {
    hostContext: BrowserContext;
    guestContext: BrowserContext;
    hostPage: Page;
    guestPage: Page;
    matchId: string;
}

/**
 * 创建 SW 在线双人对局（UI 方式创建房间 + guest 通过 join URL 加入）。
 * 返回 null 表示服务器不可用或创建失败。
 */
export const setupOnlineMatchViaUI = async (
    browser: Browser,
    baseURL: string | undefined,
): Promise<SummonerWarsMatchSetup | null> => {
    const hostContext = await browser.newContext({ baseURL });
    await initContext(hostContext, { storageKey: '__sw_storage_reset' });
    await disableSummonerWarsAutoSkip(hostContext);
    const hostPage = await hostContext.newPage();

    if (!(await ensureGameServerAvailable(hostPage))) return null;

    const matchId = await createSummonerWarsRoom(hostPage);
    if (!matchId) return null;

    await ensurePlayerIdInUrl(hostPage, '0');

    const guestContext = await browser.newContext({ baseURL });
    await initContext(guestContext, { storageKey: '__sw_storage_reset' });
    await disableSummonerWarsAutoSkip(guestContext);
    const guestPage = await guestContext.newPage();

    await guestPage.goto(`/play/summonerwars/match/${matchId}?join=true`, {
        waitUntil: 'domcontentloaded',
    });
    await guestPage.waitForURL(/playerID=\d/, { timeout: 20000 });

    return { hostContext, guestContext, hostPage, guestPage, matchId };
};
