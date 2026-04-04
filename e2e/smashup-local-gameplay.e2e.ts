/**
 * 大杀四方 (Smash Up) - 本地模式 E2E 测试
 *
 * 直接进入 /play/smashup/local，跳过房间创建流程。
 * 通过调试面板注入状态来跳过派系选择，直接验证游戏核心流程。
 */

import { mkdir } from 'node:fs/promises';
import { dirname } from 'node:path';
import { test, expect, type Locator, type Page } from '@playwright/test';
import {
    initContext,
    blockAudioRequests,
    dismissViteOverlay,
} from './helpers/common';
import { GameTestContext } from './framework/GameTestContext';
import { getEvidenceScreenshotPath } from './framework/evidenceScreenshots';

// ============================================================================
// 本地模式入口
// ============================================================================

const gotoLocalSmashUp = async (page: Page) => {
    await page.goto('/play/smashup/local', { waitUntil: 'domcontentloaded' });
    await dismissViteOverlay(page);
    // 等待游戏加载（派系选择或游戏界面）
    await page.waitForFunction(
        () => {
            // 派系选择界面
            if (document.querySelector('h1')?.textContent?.match(/Draft Your Factions|选择你的派系/)) return true;
            // 游戏界面
            if (document.querySelector('[data-testid="su-hand-area"]')) return true;
            // 调试面板按钮（说明 Board 已渲染）
            if (document.querySelector('[data-testid="debug-toggle"]') || document.querySelector('[data-testid="debug-toggle-container"]')) return true;
            return false;
        },
        { timeout: 20000 },
    );
};

/**
 * 在本地模式下完成派系选择（两个玩家都是自己）。
 * 蛇形选秀：P0 选1个 → P1 选2个 → P0 选最后1个。
 * 流程：点击派系卡片 → 打开详情弹窗 → 点击确认按钮。
 */
const completeFactionSelectionLocal = async (page: Page) => {
    const factionHeading = page.locator('h1').filter({ hasText: /Draft Your Factions|选择你的派系/i });
    if (!await factionHeading.isVisible().catch(() => false)) return; // 已经跳过了

    // 保持原本派系归属：P0 = Pirates + Aliens，P1 = Ninjas + Dinosaurs。
    const factionNames = [
        ['Pirates', '海盗'],
        ['Ninjas', '忍者'],
        ['Dinosaurs', '恐龙'],
        ['Aliens', '外星人'],
    ];

    for (let i = 0; i < factionNames.length; i++) {
        if (await page.getByTestId('su-hand-area').isVisible().catch(() => false)) {
            return;
        }

        const aliases = factionNames[i];

        // 等待派系网格可见且没有弹窗遮挡
        await page.waitForTimeout(600);

        // 通过派系名称文本找到对应派系列表项，避免命中错误的 group 父节点
        const factionPattern = new RegExp(`^(?:${aliases.join('|')})(?:\\s*\\((?:POD|POD版)\\))?$`, 'i');
        const factionCard = page.locator('h3')
            .filter({ hasText: factionPattern })
            .first()
            .locator('xpath=ancestor::*[starts-with(@data-testid,"faction-option-")]')
            .first();
        await expect(factionCard).toBeVisible({ timeout: 5000 });
        await factionCard.click({ force: true });

        const detailPanel = page.getByTestId('faction-detail-panel');
        await expect(detailPanel).toBeVisible({ timeout: 8000 });

        // 等待弹窗出现：确认按钮或已选/已被占用的状态
        const confirmBtn = page.getByTestId('faction-confirm-button');
        await expect(confirmBtn).toBeVisible({ timeout: 8000 });
        await expect(confirmBtn).toBeEnabled({ timeout: 3000 });
        await page.waitForTimeout(400);
        await confirmBtn.click({ force: true });

        // 等待弹窗关闭（focusedFactionId 被设为 null 后弹窗消失）
        await expect(detailPanel).toBeHidden({ timeout: 5000 });
    }
    // 等待派系选择完成，游戏界面加载
    await page.waitForTimeout(1500);
};

const waitForHandArea = async (page: Page, timeout = 30000) => {
    const handArea = page.getByTestId('su-hand-area');
    await expect(handArea).toBeVisible({ timeout });
    return handArea;
};

const saveEvidenceLocatorScreenshot = async (
    locator: Locator,
    name: string,
    testInfo: Parameters<GameTestContext['screenshot']>[1],
) => {
    const path = getEvidenceScreenshotPath(testInfo, name, {
        filename: `${name}.png`,
    });
    await mkdir(dirname(path), { recursive: true });
    await locator.screenshot({ path });
};

const openFabSettingsPanel = async (page: Page) => {
    const mainFabButton = page.locator('[data-fab-id="exit"]');
    await expect(mainFabButton).toBeVisible({ timeout: 10000 });
    await mainFabButton.click();

    const settingsButton = page.locator('[data-fab-id="settings"]');
    await expect(settingsButton).toBeVisible({ timeout: 5000 });
    await settingsButton.click();

    const settingsPanel = page.getByTestId('fab-panel-settings');
    await expect(settingsPanel).toBeVisible({ timeout: 5000 });
    return settingsPanel;
};

const clickHandCard = async (page: Page, locator: Locator) => {
    await expect(locator).toBeVisible({ timeout: 10000 });
    await locator.click({ force: true });
    await page.waitForTimeout(300);
};

const captureLayoutMotionDuringMinionPlay = async (
    page: Page,
    options: {
        selector: string;
        cardUid: string;
        baseIndex: number;
        durationMs?: number;
        dispatchDelayMs?: number;
    },
) => {
    return await page.evaluate(
        ({ selector, cardUid, baseIndex, durationMs, dispatchDelayMs }) =>
            new Promise<{
                found: boolean;
                dispatched: boolean;
                dispatchError: string | null;
                samples: Array<{ t: number; top: number }>;
            }>((resolve) => {
                const target = document.querySelector(selector) as HTMLElement | null;
                const harness = (window as Window & {
                    __BG_TEST_HARNESS__?: {
                        state?: { get?: () => any };
                        command?: { dispatch?: (command: unknown) => void };
                    };
                }).__BG_TEST_HARNESS__;

                if (!target || !harness?.state?.get || !harness?.command?.dispatch) {
                    resolve({
                        found: Boolean(target),
                        dispatched: false,
                        dispatchError: !target ? 'target-not-found' : 'harness-command-unavailable',
                        samples: [],
                    });
                    return;
                }

                const samples: Array<{ t: number; top: number }> = [];
                const startedAt = performance.now();
                let dispatched = false;
                let dispatchError: string | null = null;

                const tick = () => {
                    const now = performance.now();
                    samples.push({
                        t: now - startedAt,
                        top: target.getBoundingClientRect().top,
                    });

                    if (!dispatched && now - startedAt >= dispatchDelayMs) {
                        dispatched = true;
                        try {
                            const state = harness.state?.get?.();
                            const playerId = state?.core?.turnOrder?.[state?.core?.currentPlayerIndex ?? 0] ?? '0';
                            harness.command?.dispatch?.({
                                type: 'su:play_minion',
                                playerId,
                                payload: { cardUid, baseIndex },
                            });
                        } catch (error) {
                            dispatchError = error instanceof Error ? error.message : String(error);
                        }
                    }

                    if (now - startedAt < durationMs) {
                        requestAnimationFrame(tick);
                        return;
                    }

                    resolve({
                        found: true,
                        dispatched,
                        dispatchError,
                        samples,
                    });
                };

                requestAnimationFrame(tick);
            }),
        {
            selector: options.selector,
            cardUid: options.cardUid,
            baseIndex: options.baseIndex,
            durationMs: options.durationMs ?? 700,
            dispatchDelayMs: options.dispatchDelayMs ?? 50,
        },
    );
};

// ============================================================================
// 测试用例
// ============================================================================

test.describe('SmashUp 本地模式 E2E', () => {
    test.setTimeout(90000);

    test.beforeEach(async ({ context }) => {
        await initContext(context, { storageKey: '__smashup_local_reset' });
        await blockAudioRequests(context);
    });

    test('本地模式：派系选择 → 游戏界面加载', async ({ page }, testInfo) => {
        await gotoLocalSmashUp(page);
        await completeFactionSelectionLocal(page);

        // 验证游戏界面加载
        await waitForHandArea(page);

        // 验证有手牌
        const handArea = page.getByTestId('su-hand-area');
        const cards = handArea.locator('> div > div');
        await expect(cards.first()).toBeVisible({ timeout: 10000 });
        const cardCount = await cards.count();
        expect(cardCount).toBe(5);

        // 验证基地可见
        const bases = page.locator('.group\\/base');
        const baseCount = await bases.count();
        expect(baseCount).toBeGreaterThanOrEqual(3);

        // 验证结束回合按钮可见（P0 的回合）
        const finishBtn = page.getByRole('button', { name: /Finish Turn|结束回合/i });
        await expect(finishBtn).toBeVisible({ timeout: 5000 });

        await page.screenshot({ path: testInfo.outputPath('local-game-loaded.png') });
    });

    test('本地模式：出牌 → 结束回合 → 回合切换', async ({ page }, testInfo) => {
        await page.goto('/play/smashup?p0=pirates,aliens&p1=ninjas,dinosaurs&seed=24680', {
            waitUntil: 'domcontentloaded',
        });
        await dismissViteOverlay(page);
        await waitForHandArea(page);

        // P0 出第一张牌到第一个基地
        const handArea = page.getByTestId('su-hand-area');
        const firstCard = handArea.locator('> div > div').first();
        await clickHandCard(page, firstCard);
        await page.waitForTimeout(600);

        // 点击第一个基地
        const bases = page.locator('.group\\/base');
        await bases.first().locator('> div').first().click();
        await page.waitForTimeout(1000);

        // 处理可能出现的 Prompt
        const promptOverlay = page.locator('.fixed.inset-0.z-\\[100\\]');
        if (await promptOverlay.isVisible().catch(() => false)) {
            const options = promptOverlay.locator('button:not([disabled])');
            if (await options.first().isVisible().catch(() => false)) {
                await options.first().click();
                await page.waitForTimeout(600);
            }
        }

        // 结束回合
        const finishBtn = page.getByRole('button', { name: /Finish Turn|结束回合/i });
        if (await finishBtn.isVisible().catch(() => false)) {
            await finishBtn.click();
            await page.waitForTimeout(1000);
        }

        await page.screenshot({ path: testInfo.outputPath('after-play-card.png') });
    });

    test('本地模式：游戏状态正确初始化', async ({ page }, testInfo) => {
        await page.goto('/play/smashup?p0=pirates,aliens&p1=ninjas,dinosaurs&seed=24680', {
            waitUntil: 'domcontentloaded',
        });
        await dismissViteOverlay(page);
        await waitForHandArea(page);

        // 验证游戏界面核心元素
        const handArea = page.getByTestId('su-hand-area');
        await expect(handArea).toBeVisible({ timeout: 5000 });

        // 验证有手牌
        const cards = handArea.locator('> div > div');
        await expect(cards.first()).toBeVisible({ timeout: 5000 });
        const cardCount = await cards.count();
        expect(cardCount).toBe(5);

        // 验证基地可见
        const bases = page.locator('.group\\/base');
        const baseCount = await bases.count();
        expect(baseCount).toBeGreaterThanOrEqual(3);

        // 验证结束回合按钮可见
        const finishBtn = page.getByRole('button', { name: /Finish Turn|结束回合/i });
        await expect(finishBtn).toBeVisible({ timeout: 5000 });

        await page.screenshot({ path: testInfo.outputPath('game-state-initialized.png') });
    });

    test('本地模式：多回合循环正常', async ({ page }, testInfo) => {
        await gotoLocalSmashUp(page);
        await completeFactionSelectionLocal(page);
        await waitForHandArea(page);

        // 连续 3 个回合：出牌 → 结束回合
        for (let round = 0; round < 3; round++) {
            const finishBtn = page.getByRole('button', { name: /Finish Turn|结束回合/i });
            const isTurn = await finishBtn.isVisible().catch(() => false);

            if (isTurn) {
                // 直接结束回合（不出牌）
                await finishBtn.click();
                await page.waitForTimeout(1500);

                // 处理弃牌
                const discardHeading = page.getByText(/Too Many Cards|手牌过多/i);
                if (await discardHeading.isVisible().catch(() => false)) {
                    const handCards = page.getByTestId('su-hand-area').locator('> div > div');
                    await handCards.first().click();
                    await page.waitForTimeout(200);
                    const throwBtn = page.getByRole('button', { name: /Throw Away|丢弃并继续/i });
                    if (await throwBtn.isEnabled().catch(() => false)) {
                        await throwBtn.click();
                        await page.waitForTimeout(600);
                    }
                }

                // 处理 Me First
                const meFirstPass = page.getByTestId('me-first-pass-button');
                if (await meFirstPass.isVisible().catch(() => false)) {
                    await meFirstPass.click();
                    await page.waitForTimeout(600);
                }
            }
        }

        // 验证游戏仍在运行（手牌区可见）
        await expect(page.getByTestId('su-hand-area')).toBeVisible({ timeout: 5000 });

        await page.screenshot({ path: testInfo.outputPath('after-3-rounds.png') });
    });

    test('本地模式：拖拽出牌会显示拖拽命中 UI，并在松手后真正落到基地', async ({ page }, testInfo) => {
        const game = new GameTestContext(page);

        await page.addInitScript(() => {
            localStorage.setItem('smashup_interaction_mode', 'drag');
        });

        await game.openTestGame('smashup', {
            p0: 'pirates,aliens',
            p1: 'robots,zombies',
            skipFactionSelect: true,
            skipInitialization: false,
            seed: 24680,
        }, 45000);

        await game.setupScene({
            gameId: 'smashup',
            player0: {
                hand: [
                    { uid: 'drag-minion-1', defId: 'pirate_first_mate', type: 'minion' },
                ],
                factions: ['pirates', 'aliens'],
                minionsPlayed: 0,
                minionLimit: 1,
                actionsPlayed: 0,
                actionLimit: 1,
            },
            player1: {
                hand: [],
                factions: ['robots', 'zombies'],
                minionsPlayed: 0,
                minionLimit: 1,
                actionsPlayed: 0,
                actionLimit: 1,
            },
            bases: [
                { defId: 'base_the_homeworld' },
                { defId: 'base_the_mothership' },
            ],
            currentPlayer: '0',
            phase: 'playCards',
        });

        await game.waitForPhase('playCards');
        await game.waitForCurrentPlayer('0');
        await expect(page.getByTestId('su-hand-area')).toBeVisible({ timeout: 10000 });
        await expect.poll(async () => {
            return await page.evaluate(() => localStorage.getItem('smashup_interaction_mode'));
        }).toBe('drag');

        const card = page.locator('[data-card-uid="drag-minion-1"]');
        const base = page.locator('[data-base-index="0"]').first();
        await expect(card).toBeVisible({ timeout: 5000 });
        await expect(base).toBeVisible({ timeout: 5000 });

        const cardBox = await card.boundingBox();
        const baseBox = await base.boundingBox();
        expect(cardBox).not.toBeNull();
        expect(baseBox).not.toBeNull();
        if (!cardBox || !baseBox) {
            throw new Error('无法获取拖拽起点或基地落点的坐标');
        }

        const startX = cardBox.x + cardBox.width / 2;
        const startY = cardBox.y + cardBox.height / 2;
        const targetX = baseBox.x + baseBox.width / 2;
        const targetY = baseBox.y + Math.min(baseBox.height * 0.35, 120);

        await page.mouse.move(startX, startY);
        await page.mouse.down();
        await page.mouse.move(targetX, targetY, { steps: 18 });

        await expect(page.getByTestId('su-drag-arrow')).toBeVisible({ timeout: 5000 });
        await game.screenshot('smashup-drag-selection-ui', testInfo);

        await page.mouse.up();

        await expect.poll(async () => {
            return await page.evaluate(() => {
                const state = window.__BG_TEST_HARNESS__!.state.get();
                return state.core.bases[0].minions.some((minion: { uid: string }) => minion.uid === 'drag-minion-1');
            });
        }, { timeout: 5000 }).toBe(true);
        await expect(page.locator('[data-card-uid="drag-minion-1"]')).toHaveCount(0, { timeout: 5000 });

        await game.screenshot('smashup-drag-play-resolved-ui', testInfo);
    });

    test('本地模式：手机横屏下拖拽箭头起点应贴着手牌而不是漂到屏幕中部', async ({ page }, testInfo) => {
        const game = new GameTestContext(page);

        await page.setViewportSize({ width: 812, height: 375 });
        await page.addInitScript(() => {
            localStorage.setItem('smashup_interaction_mode', 'drag');
        });

        await game.openTestGame('smashup', {
            p0: 'robots,zombies',
            p1: 'pirates,aliens',
            skipFactionSelect: true,
            skipInitialization: false,
            seed: 54321,
        }, 45000);

        await game.setupScene({
            gameId: 'smashup',
            player0: {
                hand: [
                    { uid: 'mobile-drag-minion-1', defId: 'robot_hoverbot', type: 'minion' },
                ],
                factions: ['robots', 'zombies'],
                minionsPlayed: 0,
                minionLimit: 1,
                actionsPlayed: 0,
                actionLimit: 1,
            },
            player1: {
                hand: [],
                factions: ['pirates', 'aliens'],
                minionsPlayed: 0,
                minionLimit: 1,
                actionsPlayed: 0,
                actionLimit: 1,
            },
            bases: [
                { defId: 'base_the_homeworld' },
                { defId: 'base_the_mothership' },
            ],
            currentPlayer: '0',
            phase: 'playCards',
        });

        await game.waitForPhase('playCards');
        await game.waitForCurrentPlayer('0');
        await expect(page.getByTestId('su-hand-area')).toBeVisible({ timeout: 10000 });
        await expect.poll(async () => {
            return await page.evaluate(() => localStorage.getItem('smashup_interaction_mode'));
        }).toBe('drag');

        const card = page.locator('[data-card-uid="mobile-drag-minion-1"]');
        const base = page.locator('[data-base-index="0"]').first();
        await expect(card).toBeVisible({ timeout: 5000 });
        await expect(base).toBeVisible({ timeout: 5000 });

        const cardBox = await card.boundingBox();
        const baseBox = await base.boundingBox();
        expect(cardBox).not.toBeNull();
        expect(baseBox).not.toBeNull();
        if (!cardBox || !baseBox) {
            throw new Error('无法获取移动端拖拽所需的卡牌或基地坐标');
        }

        const startX = cardBox.x + cardBox.width / 2;
        const startY = cardBox.y + cardBox.height * 0.62;
        const targetX = baseBox.x + baseBox.width / 2;
        const targetY = baseBox.y + Math.min(baseBox.height * 0.35, 96);

        await page.mouse.move(startX, startY);
        await page.mouse.down();
        await page.mouse.move(targetX, targetY, { steps: 18 });

        const dragArrow = page.getByTestId('su-drag-arrow');
        await expect(dragArrow).toBeVisible({ timeout: 5000 });

        const dragMetrics = await dragArrow.evaluate((node) => {
            const line = node.querySelector('path');
            const d = line?.getAttribute('d') ?? '';
            const match = d.match(/M\s*([0-9.+-]+)\s+([0-9.+-]+)/i);
            return {
                path: d,
                startX: match ? Number.parseFloat(match[1]) : Number.NaN,
                startY: match ? Number.parseFloat(match[2]) : Number.NaN,
            };
        });

        expect(Number.isFinite(dragMetrics.startX), `拖拽箭头路径缺少起点: ${dragMetrics.path}`).toBe(true);
        expect(Number.isFinite(dragMetrics.startY), `拖拽箭头路径缺少起点: ${dragMetrics.path}`).toBe(true);
        expect(
            dragMetrics.startX,
            `移动端拖拽箭头起点 X 应落在手牌附近，当前=${dragMetrics.startX}，卡牌范围=${cardBox.x}-${cardBox.x + cardBox.width}`,
        ).toBeGreaterThanOrEqual(cardBox.x - 24);
        expect(
            dragMetrics.startX,
            `移动端拖拽箭头起点 X 应落在手牌附近，当前=${dragMetrics.startX}，卡牌范围=${cardBox.x}-${cardBox.x + cardBox.width}`,
        ).toBeLessThanOrEqual(cardBox.x + cardBox.width + 24);
        expect(
            dragMetrics.startY,
            `移动端拖拽箭头起点 Y 应落在手牌附近，当前=${dragMetrics.startY}，卡牌范围=${cardBox.y}-${cardBox.y + cardBox.height}`,
        ).toBeGreaterThanOrEqual(cardBox.y - 24);
        expect(
            dragMetrics.startY,
            `移动端拖拽箭头起点 Y 应落在手牌附近，当前=${dragMetrics.startY}，卡牌范围=${cardBox.y}-${cardBox.y + cardBox.height}`,
        ).toBeLessThanOrEqual(cardBox.y + cardBox.height + 24);

        await game.screenshot('smashup-mobile-drag-origin-follows-hand', testInfo);
        await saveEvidenceLocatorScreenshot(dragArrow, 'smashup-mobile-drag-origin-arrow', testInfo);

        await page.mouse.up();

        await expect.poll(async () => {
            return await page.evaluate(() => {
                const state = window.__BG_TEST_HARNESS__!.state.get();
                return state.core.bases[0].minions.some((minion: { uid: string }) => minion.uid === 'mobile-drag-minion-1');
            });
        }, { timeout: 5000 }).toBe(true);
    });

    test('本地模式：悬浮球设置面板显示 Smash Up 偏好设置', async ({ page }, testInfo) => {
        const game = new GameTestContext(page);

        await page.addInitScript(() => {
            localStorage.setItem('smashup_interaction_mode', 'drag');
            localStorage.setItem('smashup_overlay_zh_enabled', 'true');
            localStorage.setItem('hud_fab_position', JSON.stringify({
                leftPercent: 0.82,
                topPercent: 0.66,
            }));
        });

        await gotoLocalSmashUp(page);
        await completeFactionSelectionLocal(page);
        await waitForHandArea(page);

        const settingsPanel = await openFabSettingsPanel(page);
        await expect(settingsPanel.getByText(/大杀四方|Smash Up/i)).toBeVisible({ timeout: 5000 });
        await expect(settingsPanel.getByText(/交互模式|Interaction mode/i)).toBeVisible();
        await expect(settingsPanel.getByRole('button', { name: /点击|Click/i })).toBeVisible();
        await expect(settingsPanel.getByRole('button', { name: /拖拽|Drag/i })).toBeVisible();
        await expect(settingsPanel.getByText(/中文覆盖层|Chinese overlay/i)).toBeVisible();
        const overlayButton = settingsPanel.locator('button').filter({ hasText: /中文覆盖层|Chinese overlay/i }).first();
        await expect(overlayButton).toHaveAttribute('aria-pressed', 'true');
        await expect(overlayButton.locator('[aria-hidden="true"]')).toBeVisible();
        const overlayLayout = await overlayButton.evaluate((element) => {
            const button = element as HTMLElement;
            const toggle = button.querySelector('[aria-hidden="true"]') as HTMLElement | null;
            return {
                buttonClientWidth: button.clientWidth,
                buttonScrollWidth: button.scrollWidth,
                toggleWidth: toggle?.getBoundingClientRect().width ?? 0,
                toggleHeight: toggle?.getBoundingClientRect().height ?? 0,
            };
        });
        expect(overlayLayout.buttonScrollWidth, '中文覆盖层按钮不应出现横向溢出').toBeLessThanOrEqual(overlayLayout.buttonClientWidth);
        expect(overlayLayout.toggleWidth, '开启态应显示固定宽度 toggle').toBeGreaterThanOrEqual(40);
        expect(overlayLayout.toggleHeight, 'toggle 高度不应塌缩').toBeGreaterThanOrEqual(20);
        await expect.poll(async () => {
            return await page.evaluate(() => localStorage.getItem('smashup_interaction_mode'));
        }).toBe('drag');

        await game.screenshot('smashup-settings-panel-open', testInfo);
        await saveEvidenceLocatorScreenshot(settingsPanel, 'smashup-settings-preference-detail', testInfo);
    });

    test('本地模式：首个随从进入基地时分数条应平滑下移而不是单帧跳变', async ({ page }, testInfo) => {
        const game = new GameTestContext(page);

        await game.openTestGame('smashup', {
            p0: 'pirates,aliens',
            p1: 'robots,zombies',
            skipFactionSelect: true,
            skipInitialization: false,
            seed: 24680,
        }, 45000);

        await game.setupScene({
            gameId: 'smashup',
            player0: {
                hand: [
                    { uid: 'first-minion-motion-card', defId: 'pirate_first_mate', type: 'minion' },
                ],
                factions: ['pirates', 'aliens'],
                minionsPlayed: 0,
                minionLimit: 1,
                actionsPlayed: 0,
                actionLimit: 1,
            },
            player1: {
                hand: [],
                factions: ['robots', 'zombies'],
                minionsPlayed: 0,
                minionLimit: 1,
                actionsPlayed: 0,
                actionLimit: 1,
            },
            bases: [
                { defId: 'base_the_homeworld' },
                { defId: 'base_the_mothership' },
            ],
            currentPlayer: '0',
            phase: 'playCards',
        });

        const playerColumn = page.getByTestId('su-base-player-column-0-0');
        const emptySlot = page.getByTestId('su-base-empty-slot-0-0');
        const scoreBadge = page.getByTestId('su-base-score-0-0');
        await expect(playerColumn).toBeVisible({ timeout: 10000 });
        await expect(scoreBadge).toBeVisible({ timeout: 10000 });
        await expect(emptySlot).toBeVisible({ timeout: 10000 });
        await saveEvidenceLocatorScreenshot(playerColumn, 'smashup-first-minion-layout-before', testInfo);

        const motion = await captureLayoutMotionDuringMinionPlay(page, {
            selector: '[data-testid="su-base-score-0-0"]',
            cardUid: 'first-minion-motion-card',
            baseIndex: 0,
        });

        expect(motion.found, '未找到首列分数条观测点').toBe(true);
        expect(motion.dispatched, '未成功触发首个随从打出命令').toBe(true);
        expect(motion.dispatchError, `首个随从打出命令执行失败: ${motion.dispatchError}`).toBeNull();

        await expect.poll(async () => {
            return await page.evaluate(() => {
                const state = window.__BG_TEST_HARNESS__!.state.get();
                return state.core.bases[0].minions.some((minion: { uid: string }) => minion.uid === 'first-minion-motion-card');
            });
        }, { timeout: 5000 }).toBe(true);

        await expect(page.locator('[data-minion-uid="first-minion-motion-card"]')).toBeVisible({ timeout: 5000 });
        await expect(emptySlot).toHaveCount(0);

        const sampledTops = motion.samples.map((sample) => Math.round(sample.top * 10) / 10);
        const distinctTops = Array.from(new Set(sampledTops));
        const intermediateTops = distinctTops.slice(1, -1);
        const totalTravel = Math.abs(distinctTops[distinctTops.length - 1] - distinctTops[0]);

        expect(motion.samples.length, '分数条采样帧数过少，无法判断是否发生平滑动画').toBeGreaterThanOrEqual(8);
        expect(totalTravel, '首个随从进入后分数条应发生可见位移').toBeGreaterThan(4);
        expect(
            intermediateTops.length,
            `期望分数条出现至少两个中间位置，实际采样序列: ${distinctTops.join(', ')}`,
        ).toBeGreaterThanOrEqual(2);

        console.log('[smashup-first-minion-layout-motion]', JSON.stringify({
            sampleCount: motion.samples.length,
            distinctTops,
            totalTravel,
        }));

        await saveEvidenceLocatorScreenshot(playerColumn, 'smashup-first-minion-layout-after', testInfo);
    });

    test('本地模式：默认模式下点击随从会进入部署选择，点击基地后才真正打出', async ({ page }, testInfo) => {
        const game = new GameTestContext(page);

        await page.addInitScript(() => {
            localStorage.setItem('smashup_interaction_mode', 'click');
        });

        await game.openTestGame('smashup', {
            p0: 'pirates,aliens',
            p1: 'robots,zombies',
            skipFactionSelect: true,
            skipInitialization: false,
            seed: 24680,
        }, 45000);

        await game.setupScene({
            gameId: 'smashup',
            player0: {
                hand: [
                    { uid: 'click-preview-card', defId: 'pirate_first_mate', type: 'minion' },
                ],
                factions: ['pirates', 'aliens'],
                minionsPlayed: 0,
                minionLimit: 1,
                actionsPlayed: 0,
                actionLimit: 1,
            },
            player1: {
                hand: [],
                factions: ['robots', 'zombies'],
                minionsPlayed: 0,
                minionLimit: 1,
                actionsPlayed: 0,
                actionLimit: 1,
            },
            bases: [
                { defId: 'base_the_homeworld' },
                { defId: 'base_the_mothership' },
            ],
            currentPlayer: '0',
            phase: 'playCards',
        });

        const card = page.locator('[data-card-uid="click-preview-card"]');
        const cardFrame = card.locator('> div').first();
        const firstBase = page.locator('[data-base-index="0"]').first();
        await expect(card).toBeVisible({ timeout: 10000 });
        await clickHandCard(page, card);

        await expect(cardFrame).toHaveClass(/ring-cyan-400/);
        await expect.poll(async () => {
            return await page.evaluate(() => {
                const state = window.__BG_TEST_HARNESS__!.state.get();
                return {
                    baseMinionCount: state.core.bases[0].minions.length,
                    minionsPlayed: state.core.players['0'].minionsPlayed,
                    stillInHand: state.core.players['0'].hand.some((entry: { uid: string }) => entry.uid === 'click-preview-card'),
                };
            });
        }).toEqual({
            baseMinionCount: 0,
            minionsPlayed: 0,
            stillInHand: true,
        });

        await firstBase.click({ force: true });
        await expect.poll(async () => {
            return await page.evaluate(() => {
                const state = window.__BG_TEST_HARNESS__!.state.get();
                return {
                    playedToBase: state.core.bases[0].minions.some((minion: { uid: string }) => minion.uid === 'click-preview-card'),
                    minionsPlayed: state.core.players['0'].minionsPlayed,
                    stillInHand: state.core.players['0'].hand.some((entry: { uid: string }) => entry.uid === 'click-preview-card'),
                };
            });
        }).toEqual({
            playedToBase: true,
            minionsPlayed: 1,
            stillInHand: false,
        });

        await game.screenshot('smashup-click-minion-select-then-deploy', testInfo);
    });

    test('本地模式：手机横屏保留常驻放大按钮，点击按钮只放大不触发出牌', async ({ page }, testInfo) => {
        const game = new GameTestContext(page);

        await page.setViewportSize({ width: 812, height: 375 });
        await page.addInitScript(() => {
            (window as Window & { __BG_FORCE_COARSE_POINTER__?: boolean }).__BG_FORCE_COARSE_POINTER__ = true;
            localStorage.setItem('smashup_interaction_mode', 'click');
        });

        await game.openTestGame('smashup', {
            p0: 'pirates,aliens',
            p1: 'robots,zombies',
            skipFactionSelect: true,
            skipInitialization: false,
            seed: 24680,
        }, 45000);

        await game.setupScene({
            gameId: 'smashup',
            player0: {
                hand: [
                    { uid: 'mobile-inspect-card', defId: 'pirate_first_mate', type: 'minion' },
                ],
                factions: ['pirates', 'aliens'],
                minionsPlayed: 0,
                minionLimit: 1,
                actionsPlayed: 0,
                actionLimit: 1,
            },
            player1: {
                hand: [],
                factions: ['robots', 'zombies'],
                minionsPlayed: 0,
                minionLimit: 1,
                actionsPlayed: 0,
                actionLimit: 1,
            },
            bases: [
                { defId: 'base_the_homeworld' },
                { defId: 'base_the_mothership' },
            ],
            currentPlayer: '0',
            phase: 'playCards',
        });

        const card = page.locator('[data-card-uid="mobile-inspect-card"]');
        const inspectButton = page.locator('[data-testid="su-hand-card-inspect-mobile-inspect-card"]');
        const magnifyOverlay = page.getByTestId('su-card-magnify-overlay');

        await expect(card).toBeVisible({ timeout: 10000 });
        await expect.poll(async () => {
            return await page.evaluate(() => {
                return (window as Window & { __BG_FORCE_COARSE_POINTER__?: boolean }).__BG_FORCE_COARSE_POINTER__ === true;
            });
        }).toBe(true);
        await expect(inspectButton).toBeVisible({ timeout: 5000 });
        await expect(inspectButton).toHaveCSS('opacity', '1');

        await inspectButton.click();
        await expect(magnifyOverlay).toBeVisible({ timeout: 5000 });
        await expect.poll(async () => {
            return await page.evaluate(() => {
                const state = window.__BG_TEST_HARNESS__!.state.get();
                return {
                    baseMinionCount: state.core.bases[0].minions.length,
                    minionsPlayed: state.core.players['0'].minionsPlayed,
                    stillInHand: state.core.players['0'].hand.some((entry: { uid: string }) => entry.uid === 'mobile-inspect-card'),
                };
            });
        }).toEqual({
            baseMinionCount: 0,
            minionsPlayed: 0,
            stillInHand: true,
        });

        await game.screenshot('smashup-mobile-inspect-button-preview', testInfo);
    });

    test('本地模式：拖拽模式下无目标行动卡拖到场上才会释放', async ({ page }, testInfo) => {
        const game = new GameTestContext(page);

        await page.addInitScript(() => {
            localStorage.setItem('smashup_interaction_mode', 'drag');
        });

        await game.openTestGame('smashup', {
            p0: 'dinosaurs,pirates',
            p1: 'robots,zombies',
            skipFactionSelect: true,
            skipInitialization: false,
            seed: 24680,
        }, 45000);

        await game.setupScene({
            gameId: 'smashup',
            player0: {
                hand: [
                    { uid: 'drag-action-card', defId: 'dino_howl', type: 'action' },
                ],
                factions: ['dinosaurs', 'pirates'],
                minionsPlayed: 0,
                minionLimit: 1,
                actionsPlayed: 0,
                actionLimit: 1,
            },
            player1: {
                hand: [],
                factions: ['robots', 'zombies'],
                minionsPlayed: 0,
                minionLimit: 1,
                actionsPlayed: 0,
                actionLimit: 1,
            },
            bases: [
                {
                    defId: 'base_the_homeworld',
                    minions: [
                        { uid: 'ally-1', defId: 'pirate_first_mate', owner: '0', controller: '0' },
                    ],
                },
                { defId: 'base_the_mothership' },
            ],
            currentPlayer: '0',
            phase: 'playCards',
        });

        await game.waitForPhase('playCards');
        await game.waitForCurrentPlayer('0');
        await expect.poll(async () => {
            return await page.evaluate(() => localStorage.getItem('smashup_interaction_mode'));
        }).toBe('drag');

        const card = page.locator('[data-card-uid="drag-action-card"]');
        const handArea = page.getByTestId('su-hand-area');
        await expect(card).toBeVisible({ timeout: 10000 });
        await expect(handArea).toBeVisible({ timeout: 10000 });

        const cardBox = await card.boundingBox();
        const handAreaBox = await handArea.boundingBox();
        expect(cardBox).not.toBeNull();
        expect(handAreaBox).not.toBeNull();
        if (!cardBox || !handAreaBox) {
            throw new Error('无法获取行动卡或手牌区坐标');
        }

        const startX = cardBox.x + cardBox.width / 2;
        const startY = cardBox.y + cardBox.height / 2;
        const targetY = Math.max(40, handAreaBox.y - 120);

        await page.mouse.move(startX, startY);
        await page.mouse.down();
        await page.mouse.move(startX, targetY, { steps: 18 });

        await expect(page.getByTestId('su-drag-arrow')).toBeVisible({ timeout: 5000 });
        await expect.poll(async () => {
            return await page.evaluate(() => {
                const state = window.__BG_TEST_HARNESS__!.state.get();
                return {
                    actionsPlayed: state.core.players['0'].actionsPlayed,
                    stillInHand: state.core.players['0'].hand.some((entry: { uid: string }) => entry.uid === 'drag-action-card'),
                };
            });
        }).toEqual({
            actionsPlayed: 0,
            stillInHand: true,
        });

        await page.mouse.up();

        await expect.poll(async () => {
            return await page.evaluate(() => {
                const state = window.__BG_TEST_HARNESS__!.state.get();
                const ally = state.core.bases[0].minions.find((minion: { uid: string }) => minion.uid === 'ally-1');
                return {
                    actionsPlayed: state.core.players['0'].actionsPlayed,
                    stillInHand: state.core.players['0'].hand.some((entry: { uid: string }) => entry.uid === 'drag-action-card'),
                    allyTempPowerModifier: ally?.tempPowerModifier ?? 0,
                };
            });
        }).toEqual({
            actionsPlayed: 1,
            stillInHand: false,
            allyTempPowerModifier: 1,
        });

        await game.screenshot('smashup-drag-action-release-to-board', testInfo);
    });

    test('本地模式：默认模式下无目标行动卡需要二次点击确认', async ({ page }, testInfo) => {
        const game = new GameTestContext(page);

        await page.addInitScript(() => {
            localStorage.setItem('smashup_interaction_mode', 'click');
        });

        await game.openTestGame('smashup', {
            p0: 'pirates,aliens',
            p1: 'robots,zombies',
            skipFactionSelect: true,
            skipInitialization: false,
            seed: 24680,
        }, 45000);

        await game.setupScene({
            gameId: 'smashup',
            player0: {
                hand: [
                    { uid: 'double-click-action-card', defId: 'dino_howl', type: 'action' },
                ],
                factions: ['dinosaurs', 'pirates'],
                minionsPlayed: 0,
                minionLimit: 1,
                actionsPlayed: 0,
                actionLimit: 1,
            },
            player1: {
                hand: [],
                factions: ['robots', 'zombies'],
                minionsPlayed: 0,
                minionLimit: 1,
                actionsPlayed: 0,
                actionLimit: 1,
            },
            bases: [
                {
                    defId: 'base_the_homeworld',
                    minions: [
                        { uid: 'ally-1', defId: 'pirate_first_mate', owner: '0', controller: '0' },
                    ],
                },
                { defId: 'base_the_mothership' },
            ],
            currentPlayer: '0',
            phase: 'playCards',
        });

        const card = page.locator('[data-card-uid="double-click-action-card"]');
        const cardFrame = card.locator('> div').first();
        await expect(card).toBeVisible({ timeout: 10000 });
        await clickHandCard(page, card);

        await expect(cardFrame).toHaveClass(/ring-cyan-400/);
        await expect.poll(async () => {
            return await page.evaluate(() => {
                const state = window.__BG_TEST_HARNESS__!.state.get();
                return {
                    actionsPlayed: state.core.players['0'].actionsPlayed,
                    stillInHand: state.core.players['0'].hand.some((entry: { uid: string }) => entry.uid === 'double-click-action-card'),
                    allyTempPowerModifier: state.core.bases[0].minions.find((minion: { uid: string }) => minion.uid === 'ally-1')?.tempPowerModifier ?? 0,
                };
            });
        }, { timeout: 5000 }).toEqual({
            actionsPlayed: 0,
            stillInHand: true,
            allyTempPowerModifier: 0,
        });

        await clickHandCard(page, card);

        await expect.poll(async () => {
            return await page.evaluate(() => {
                const state = window.__BG_TEST_HARNESS__!.state.get();
                return {
                    actionsPlayed: state.core.players['0'].actionsPlayed,
                    stillInHand: state.core.players['0'].hand.some((entry: { uid: string }) => entry.uid === 'double-click-action-card'),
                    allyTempPowerModifier: state.core.bases[0].minions.find((minion: { uid: string }) => minion.uid === 'ally-1')?.tempPowerModifier ?? 0,
                };
            });
        }, { timeout: 5000 }).toEqual({
            actionsPlayed: 1,
            stillInHand: false,
            allyTempPowerModifier: 1,
        });

        await game.screenshot('smashup-click-action-double-confirm', testInfo);
    });

    test('本地模式：无有效目标的无目标行动卡第一次点击就提示并且不会选中使用', async ({ page }, testInfo) => {
        const game = new GameTestContext(page);

        await page.addInitScript(() => {
            localStorage.setItem('smashup_interaction_mode', 'click');
        });

        await game.openTestGame('smashup', {
            p0: 'pirates,aliens',
            p1: 'robots,zombies',
            skipFactionSelect: true,
            skipInitialization: false,
            seed: 24680,
        }, 45000);

        await game.setupScene({
            gameId: 'smashup',
            player0: {
                hand: [
                    { uid: 'no-target-toast-action-card', defId: 'dino_howl', type: 'action' },
                ],
                factions: ['dinosaurs', 'pirates'],
                minionsPlayed: 0,
                minionLimit: 1,
                actionsPlayed: 0,
                actionLimit: 1,
            },
            player1: {
                hand: [],
                factions: ['robots', 'zombies'],
                minionsPlayed: 0,
                minionLimit: 1,
                actionsPlayed: 0,
                actionLimit: 1,
            },
            bases: [
                {
                    defId: 'base_the_homeworld',
                    minions: [
                        { uid: 'enemy-1', defId: 'robot_microbot_alpha', owner: '1', controller: '1' },
                    ],
                },
                { defId: 'base_the_mothership' },
            ],
            currentPlayer: '0',
            phase: 'playCards',
        });

        const card = page.locator('[data-card-uid="no-target-toast-action-card"]');
        const cardFrame = card.locator('> div').first();
        const toastMessage = page.getByText('场上没有符合条件的目标').last();

        await expect(card).toBeVisible({ timeout: 10000 });
        await clickHandCard(page, card);

        await expect(toastMessage).toBeVisible({ timeout: 5000 });
        await expect(cardFrame).not.toHaveClass(/ring-cyan-400/);
        await expect.poll(async () => {
            return await page.evaluate(() => {
                const state = window.__BG_TEST_HARNESS__!.state.get();
                return {
                    actionsPlayed: state.core.players['0'].actionsPlayed,
                    stillInHand: state.core.players['0'].hand.some((entry: { uid: string }) => entry.uid === 'no-target-toast-action-card'),
                    enemyTempPowerModifier: state.core.bases[0].minions.find((minion: { uid: string }) => minion.uid === 'enemy-1')?.tempPowerModifier ?? 0,
                };
            });
        }, { timeout: 5000 }).toEqual({
            actionsPlayed: 0,
            stillInHand: true,
            enemyTempPowerModifier: 0,
        });

        await game.screenshot('smashup-click-action-no-target-toast', testInfo);
    });
});
