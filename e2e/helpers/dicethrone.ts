/**
 * DiceThrone E2E 测试专用工具函数
 *
 * 包含：调试面板操作、角色状态注入、在线对局创建、教学流程辅助。
 * 通用函数（locale/audio/storage/server）从 ./common 导入。
 */

import { expect, type Browser, type BrowserContext, type Page } from '@playwright/test';
import {
    initContext,
    getGameServerBaseURL,
    ensureGameServerAvailable,
    waitForMatchAvailable,
    seedMatchCredentials,
    joinMatchViaAPI,
} from './common';

export const GAME_NAME = 'dicethrone';

// ============================================================================
// 棋盘就绪检测
// ============================================================================

/** 等待棋盘 UI 就绪（手牌区/骰子区/教学覆盖层任一可见） */
export const waitForBoardReady = async (page: Page, timeout = 20000) => {
    await page.waitForFunction(
        () => {
            const selectors = [
                '[data-tutorial-id="advance-phase-button"]',
                '[data-tutorial-id="dice-roll-button"]',
                '[data-tutorial-id="hand-area"]',
            ];
            const hasBoard = selectors.some((sel) => {
                const el = document.querySelector(sel) as HTMLElement | null;
                if (!el) return false;
                const style = window.getComputedStyle(el);
                if (!style || style.display === 'none' || style.visibility === 'hidden' || style.opacity === '0') return false;
                const rects = el.getClientRects();
                return rects.length > 0 && rects[0].width > 0 && rects[0].height > 0;
            });
            if (hasBoard) return true;
            if (document.querySelector('[data-tutorial-step]')) return true;
            return false;
        },
        { timeout },
    );
};

/** 等待主要阶段 (1) 可见 */
export const waitForMainPhase = async (page: Page, timeout = 20000) => {
    await expect(page.getByText(/Main Phase \(1\)|主要阶段 \(1\)/)).toBeVisible({ timeout });
};

// ============================================================================
// 角色选择
// ============================================================================

/** 检查角色选择界面是否可见 */
export const isCharacterSelectionVisible = async (page: Page) => {
    const heading = page.getByText(/Select Your Hero|选择你的英雄/i).first();
    if (await heading.isVisible({ timeout: 1500 }).catch(() => false)) return true;
    return await page.locator('[data-char-id]').first().isVisible({ timeout: 1500 }).catch(() => false);
};

// ============================================================================
// 大厅 / 房间创建
// ============================================================================

/** 打开 DiceThrone 游戏弹窗 */
export const openDiceThroneModal = async (page: Page) => {
    await page.goto('/?game=dicethrone', { waitUntil: 'domcontentloaded' });
    const modalRoot = page.locator('#modal-root');
    const modalHeading = modalRoot.getByRole('heading', { name: /Dice Throne|王权骰铸/i }).first();
    const modalReadyButton = modalRoot
        .locator('button:visible', { hasText: /Create Room|创建房间|Return to match|返回当前对局/i })
        .first();
    const gameCard = page.locator('[data-game-id="dicethrone"]').first();

    const headingVisible = await modalHeading.isVisible({ timeout: 1500 }).catch(() => false);
    const buttonVisible = await modalReadyButton.isVisible({ timeout: 1500 }).catch(() => false);
    if (headingVisible || buttonVisible) return;

    await expect(gameCard).toBeVisible({ timeout: 15000 });
    await gameCard.evaluate((node) => (node as HTMLElement | null)?.click());

    await expect
        .poll(
            async () => {
                const h = await modalHeading.isVisible().catch(() => false);
                const b = await modalReadyButton.isVisible().catch(() => false);
                return h || b;
            },
            { timeout: 20000 },
        )
        .toBe(true);
};

/** 通过 API 创建房间并注入凭据 */
export const createRoomViaAPI = async (page: Page): Promise<string | null> => {
    try {
        const guestId = `${Date.now()}_${Math.floor(Math.random() * 10000)}`;
        await page.addInitScript(
            (id) => {
                localStorage.setItem('guest_id', id);
                sessionStorage.setItem('guest_id', id);
                document.cookie = `bg_guest_id=${encodeURIComponent(id)}; path=/; SameSite=Lax`;
            },
            guestId,
        );

        const res = await page.request.post(
            `${getGameServerBaseURL()}/games/dicethrone/create`,
            { data: { numPlayers: 2, setupData: { guestId, ownerKey: `guest:${guestId}`, ownerType: 'guest' } } },
        );
        if (!res.ok()) return null;
        const resData = (await res.json().catch(() => null)) as { matchID?: string } | null;
        const matchID = resData?.matchID;
        if (!matchID) return null;

        const claimRes = await page.request.post(
            `${getGameServerBaseURL()}/games/dicethrone/${matchID}/claim-seat`,
            { data: { playerID: '0', playerName: 'Host-E2E', guestId } },
        );
        if (!claimRes.ok()) return null;
        const claimData = (await claimRes.json().catch(() => null)) as { playerCredentials?: string } | null;
        const credentials = claimData?.playerCredentials;
        if (!credentials) return null;

        await seedMatchCredentials(page, GAME_NAME, matchID, '0', credentials);
        return matchID;
    } catch {
        return null;
    }
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

/** 切换到调试面板的控制 Tab */
export const ensureDebugControlsTab = async (page: Page) => {
    await ensureDebugPanelOpen(page);
    const controlsTab = page.getByRole('button', { name: /⚙️|System|系统/i });
    if (await controlsTab.isVisible().catch(() => false)) await controlsTab.click();
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
    const parsed = JSON.parse(raw) as { core?: Record<string, unknown> };
    return JSON.parse(JSON.stringify(parsed?.core ?? parsed)) as Record<string, unknown>;
};

/** 写入 core 状态（通过 updater 函数） */
export const applyCoreState = async (
    page: Page,
    updater: (core: Record<string, unknown>) => Record<string, unknown>,
) => {
    const core = await readCoreState(page);
    const nextCore = updater(core);
    const stateInput = page.getByTestId('debug-state-input');
    if (!await stateInput.isVisible().catch(() => false)) {
        await page.getByTestId('debug-state-toggle-input').click();
    }
    await stateInput.fill(JSON.stringify(nextCore));
    await page.getByTestId('debug-state-apply').click();
    await closeDebugPanelIfOpen(page);
};

/** 直接写入 core 状态对象 */
export const applyCoreStateDirect = async (page: Page, coreState: unknown) => {
    await ensureDebugStateTab(page);
    await page.getByTestId('debug-state-toggle-input').click();
    const input = page.getByTestId('debug-state-input');
    await expect(input).toBeVisible({ timeout: 3000 });
    await input.fill(JSON.stringify(coreState));
    await page.getByTestId('debug-state-apply').click();
    await expect(input).toBeHidden({ timeout: 5000 }).catch(() => {});
};

/** 设置骰子值 */
export const applyDiceValues = async (page: Page, values: number[]) => {
    await ensureDebugControlsTab(page);
    const diceSection = page.getByTestId('dt-debug-dice');
    const diceInputs = diceSection.locator('input[type="number"]');
    await expect(diceInputs).toHaveCount(5);
    for (let i = 0; i < 5; i += 1) {
        await diceInputs.nth(i).fill(String(values[i] ?? 1));
    }
    await diceSection.getByTestId('dt-debug-dice-apply').click();
    await closeDebugPanelIfOpen(page);
};

// ============================================================================
// 玩家状态操作
// ============================================================================

/** 设置玩家 CP 值 */
export const setPlayerCp = async (page: Page, playerId: string, value: number) => {
    await applyCoreState(page, (core) => {
        const players = core.players as Record<string, Record<string, unknown>> | undefined;
        const player = players?.[playerId];
        if (!player) return core;
        player.resources = (player.resources as Record<string, unknown>) ?? {};
        (player.resources as Record<string, unknown>).cp = value;
        return core;
    });
};

/** 设置玩家 Token 值 */
export const setPlayerToken = async (page: Page, playerId: string, tokenId: string, value: number) => {
    await applyCoreState(page, (core) => {
        const players = core.players as Record<string, Record<string, unknown>> | undefined;
        const player = players?.[playerId];
        if (!player) return core;
        player.tokens = (player.tokens as Record<string, unknown>) ?? {};
        (player.tokens as Record<string, number>)[tokenId] = value;
        return core;
    });
};

/** 确保指定卡牌在手牌中 */
export const ensureCardInHand = async (page: Page, cardId: string, playerId = '0') => {
    await applyCoreState(page, (core) => {
        const players = core.players as Record<string, Record<string, unknown>> | undefined;
        const player = players?.[playerId];
        if (!player) return core;
        const takeCard = (list: Array<{ id?: string }>) => {
            const idx = list.findIndex((c) => c?.id === cardId);
            if (idx === -1) return null;
            return list.splice(idx, 1)[0];
        };
        player.hand = (player.hand as Array<{ id?: string }>) ?? [];
        player.deck = (player.deck as Array<{ id?: string }>) ?? [];
        player.discard = (player.discard as Array<{ id?: string }>) ?? [];
        const card =
            takeCard(player.hand as Array<{ id?: string }>) ??
            takeCard(player.deck as Array<{ id?: string }>) ??
            takeCard(player.discard as Array<{ id?: string }>);
        if (card) (player.hand as Array<{ id?: string }>).push(card);
        return core;
    });
};

// ============================================================================
// 交互辅助
// ============================================================================

/** 从 URL 获取 playerID */
export const getPlayerIdFromUrl = (page: Page, fallback: string) => {
    try {
        return new URL(page.url()).searchParams.get('playerID') ?? fallback;
    } catch {
        return fallback;
    }
};

/** 推进到攻击掷骰阶段 */
export const advanceToOffensiveRoll = async (page: Page, timeout = 15000) => {
    const offensivePhaseText = page.getByText(/Offensive Roll|进攻掷骰/i);
    const nextPhaseButton = page.locator('[data-tutorial-id="advance-phase-button"]');
    const deadline = Date.now() + timeout;
    while (Date.now() < deadline) {
        if (await offensivePhaseText.isVisible().catch(() => false)) return;
        if (await nextPhaseButton.isEnabled().catch(() => false)) {
            await nextPhaseButton.click();
            await page.waitForTimeout(500);
            continue;
        }
        await page.waitForTimeout(300);
    }
    throw new Error('未能在超时内到达 offensiveRoll 阶段');
};

/** 拖拽卡牌向上（出牌） */
export const dragCardUp = async (page: Page, cardId: string, distance = 220) => {
    const card = page.locator(`[data-card-key^="${cardId}-"]`).first();
    await expect(card).toBeVisible({ timeout: 15000 });
    const box = await card.boundingBox();
    if (!box) throw new Error(`卡牌 ${cardId} 没有 boundingBox`);
    const startX = box.x + box.width / 2;
    const startY = box.y + box.height / 2;
    await page.mouse.move(startX, startY);
    await page.mouse.down();
    await page.mouse.move(startX, startY - distance, { steps: 10 });
    await page.mouse.up();
};

/** 等待教学步骤 */
export const waitForTutorialStep = async (page: Page, stepId: string, timeout = 15000) => {
    await page.waitForFunction(
        (target) => {
            const el = document.querySelector('[data-tutorial-step]');
            return el && el.getAttribute('data-tutorial-step') === target;
        },
        stepId,
        { timeout },
    );
};

/** 关闭 Token 响应弹窗 */
export const closeTokenResponseModal = async (modal: ReturnType<Page['locator']>) => {
    const button = modal.getByRole('button', { name: /Skip|Confirm|跳过|确认/i }).first();
    if (await button.isVisible().catch(() => false)) await button.click({ force: true });
};

/** 通过 heading 定位弹窗容器 */
export const getModalContainerByHeading = async (page: Page, heading: RegExp, timeout = 8000) => {
    const headingLocator = page.getByRole('heading', { name: heading });
    await expect(headingLocator).toBeVisible({ timeout });
    return headingLocator.locator('..').locator('..');
};

/** 尝试点击 Pass 按钮 */
export const maybePassResponse = async (page: Page) => {
    const passButton = page.getByRole('button', { name: /Pass|跳过/i });
    if (await passButton.isVisible()) {
        await passButton.click();
        return true;
    }
    return false;
};

/** 检查房间是否已不存在 */
export const isRoomMissing = async (page: Page) => {
    return await page
        .getByText(/房间不存在|Returning to lobby|Room not found/i)
        .first()
        .isVisible({ timeout: 500 })
        .catch(() => false);
};

/** 验证手牌数量和可见性 */
export const assertHandCardsVisible = async (page: Page, expectedCount: number, label: string) => {
    const handArea = page.locator('[data-tutorial-id="hand-area"]');
    await expect(handArea, `[${label}] 手牌区域未显示`).toBeVisible();
    const handCards = page.locator('[data-card-key]');
    let attempts = 0;
    const maxAttempts = 15;
    while (attempts < maxAttempts) {
        const cardCount = await handCards.count();
        if (cardCount === expectedCount) {
            const firstCard = handCards.first();
            const firstOpacity = await firstCard.evaluate((el) => window.getComputedStyle(el).opacity);
            const firstBox = await firstCard.boundingBox();
            if (parseFloat(firstOpacity) === 0) throw new Error(`[${label}] 手牌透明度为 0`);
            if (!firstBox || firstBox.width === 0 || firstBox.height === 0) throw new Error(`[${label}] 手牌没有尺寸`);
            return;
        }
        await page.waitForTimeout(1000);
        attempts++;
    }
    const finalCount = await handCards.count();
    throw new Error(`[${label}] 期望 ${expectedCount} 张手牌，实际 ${finalCount} 张`);
};

// ============================================================================
// 在线对局创建（双人）
// ============================================================================

export interface DiceThroneMatchSetup {
    hostPage: Page;
    guestPage: Page;
    hostContext: BrowserContext;
    guestContext: BrowserContext;
    autoStarted: boolean;
}

/** 检测对局启动状态 */
export const detectMatchStartState = async (
    page: Page,
    timeout = 20000,
): Promise<'started' | 'selection' | 'unknown'> => {
    const deadline = Date.now() + timeout;
    while (Date.now() < deadline) {
        if (await isRoomMissing(page).catch(() => false)) return 'unknown';
        const inMainPhase = await page
            .getByText(/Main Phase \(1\)|主要阶段 \(1\)/)
            .isVisible({ timeout: 500 })
            .catch(() => false);
        if (inMainPhase) return 'started';
        if (await isCharacterSelectionVisible(page)) return 'selection';
        await page.waitForTimeout(500);
    }
    return 'unknown';
};

/** 等待房间就绪（角色选择/主阶段/手牌任一出现） */
export const waitForRoomReady = async (page: Page, timeout = 45000) => {
    const deadline = Date.now() + timeout;
    while (Date.now() < deadline) {
        if (await isRoomMissing(page)) throw new Error('房间不存在');
        const hasMainPhase = await page.getByText(/Main Phase \(1\)|主要阶段 \(1\)/).first().isVisible({ timeout: 500 }).catch(() => false);
        if (hasMainPhase) return;
        const hasSelection = await page.getByText(/Select Your Hero|选择你的英雄/i).first().isVisible({ timeout: 500 }).catch(() => false);
        const hasCharCard = await page.locator('[data-char-id]').first().isVisible({ timeout: 500 }).catch(() => false);
        if (hasSelection || hasCharCard) return;
        const hasHandCard = await page.locator('[data-card-key]').first().isVisible({ timeout: 500 }).catch(() => false);
        if (hasHandCard) return;
        const hasPlayerBoard = await page.locator('[data-tutorial-id="player-board"], img[alt="Player Board"], img[alt="玩家面板"]').first().isVisible({ timeout: 500 }).catch(() => false);
        if (hasPlayerBoard) return;
        await page.waitForTimeout(300);
    }
    throw new Error('房间未在超时内就绪');
};

/**
 * 创建在线双人对局。
 * 返回 null 表示服务器不可用或创建失败（调用方应 skip）。
 */
export const setupOnlineMatch = async (
    browser: Browser,
    baseURL: string | undefined,
    hostChar: string,
    guestChar: string,
): Promise<DiceThroneMatchSetup | null> => {
    // 房主上下文
    const hostContext = await browser.newContext({ baseURL });
    await initContext(hostContext, { storageKey: '__dt_storage_reset' });
    const hostPage = await hostContext.newPage();

    if (!(await ensureGameServerAvailable(hostPage))) return null;

    const matchId = await createRoomViaAPI(hostPage);
    if (!matchId) return null;

    if (!(await waitForMatchAvailable(hostPage, GAME_NAME, matchId, 20000))) return null;

    await hostPage.goto(`/play/dicethrone/match/${matchId}?playerID=0`, { waitUntil: 'domcontentloaded' });

    // 客人上下文
    const guestContext = await browser.newContext({ baseURL });
    await initContext(guestContext, { storageKey: '__dt_storage_reset' });
    const guestPage = await guestContext.newPage();

    const guestCredentials = await joinMatchViaAPI(guestPage, GAME_NAME, matchId, '1', 'Guest-E2E');
    if (!guestCredentials) {
        await hostContext.close();
        await guestContext.close();
        return null;
    }
    await seedMatchCredentials(guestContext, GAME_NAME, matchId, '1', guestCredentials);
    await guestPage.goto(`/play/dicethrone/match/${matchId}?playerID=1`, { waitUntil: 'domcontentloaded' });

    try {
        await waitForRoomReady(hostPage, 60000);
        await waitForRoomReady(guestPage, 60000);
    } catch {
        if ((await isRoomMissing(hostPage).catch(() => false)) || (await isRoomMissing(guestPage).catch(() => false))) {
            await hostContext.close();
            await guestContext.close();
            return null;
        }
        throw new Error('房间就绪超时');
    }

    const hostStartState = await detectMatchStartState(hostPage, 20000);
    const guestStartState = await detectMatchStartState(guestPage, 20000);
    let autoStarted = hostStartState === 'started' || guestStartState === 'started';

    if (autoStarted) {
        try {
            await waitForMainPhase(hostPage, 20000);
            await waitForMainPhase(guestPage, 20000);
        } catch {
            autoStarted = false;
        }
    }

    if (!autoStarted) {
        // 等待角色选择
        const selectionDeadline = Date.now() + 25000;
        let hostReady = hostStartState === 'selection';
        let guestReady = guestStartState === 'selection';
        while (Date.now() < selectionDeadline) {
            const hostMainPhase = await hostPage.getByText(/Main Phase \(1\)|主要阶段 \(1\)/).isVisible({ timeout: 500 }).catch(() => false);
            const guestMainPhase = await guestPage.getByText(/Main Phase \(1\)|主要阶段 \(1\)/).isVisible({ timeout: 500 }).catch(() => false);
            if (hostMainPhase && guestMainPhase) {
                autoStarted = true;
                break;
            }
            if (!hostReady) hostReady = await isCharacterSelectionVisible(hostPage);
            if (!guestReady) guestReady = await isCharacterSelectionVisible(guestPage);
            if (hostReady && guestReady) break;
            await hostPage.waitForTimeout(500);
        }

        if (autoStarted) {
            await waitForMainPhase(hostPage, 20000);
            await waitForMainPhase(guestPage, 20000);
            return { hostPage, guestPage, hostContext, guestContext, autoStarted };
        }

        if (!hostReady || !guestReady) throw new Error('角色选择界面未加载');

        await hostPage.waitForSelector(`[data-char-id="${hostChar}"]`, { state: 'visible', timeout: 10000 });
        await guestPage.waitForSelector(`[data-char-id="${guestChar}"]`, { state: 'visible', timeout: 10000 });
        await hostPage.locator(`[data-char-id="${hostChar}"]`).first().evaluate((n) => (n as HTMLElement).click());
        await guestPage.locator(`[data-char-id="${guestChar}"]`).first().evaluate((n) => (n as HTMLElement).click());
        await hostPage.waitForTimeout(1000);
        await guestPage.waitForTimeout(1000);

        const readyButton = guestPage.getByRole('button', { name: /Ready|准备/i });
        await expect(readyButton).toBeVisible({ timeout: 20000 });
        await expect(readyButton).toBeEnabled({ timeout: 20000 });
        await readyButton.click();

        const startButton = hostPage.getByRole('button', { name: /Start Game|开始游戏/i });
        await expect(startButton).toBeVisible({ timeout: 20000 });
        await expect(startButton).toBeEnabled({ timeout: 20000 });
        await startButton.click();

        await waitForMainPhase(hostPage, 15000);
        await waitForMainPhase(guestPage, 15000);
    }

    return { hostPage, guestPage, hostContext, guestContext, autoStarted };
};
