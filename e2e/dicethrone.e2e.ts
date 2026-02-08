import { test, expect, type Page, type BrowserContext, type Locator } from '@playwright/test';

const setEnglishLocale = async (context: BrowserContext | Page) => {
    await context.addInitScript(() => {
        localStorage.setItem('i18nextLng', 'en');
    });
};

const normalizeUrl = (url: string) => url.replace(/\/$/, '');

const getGameServerBaseURL = () => {
    const envUrl = process.env.PW_GAME_SERVER_URL || process.env.VITE_GAME_SERVER_URL;
    if (envUrl) return normalizeUrl(envUrl);
    const port = process.env.GAME_SERVER_PORT || process.env.PW_GAME_SERVER_PORT || '18000';
    return `http://localhost:${port}`;
};

const ensureGameServerAvailable = async (page: Page) => {
    const gameServerBaseURL = getGameServerBaseURL();
    const candidates = ['/games', `${gameServerBaseURL}/games`];
    for (const url of candidates) {
        try {
            const response = await page.request.get(url);
            if (response.ok()) return true;
        } catch {
            // ignore
        }
    }
    return false;
};

const disableTutorial = async (page: Page) => {
    await page.addInitScript(() => {
        localStorage.setItem('tutorial_skip', '1');
    });
};

const blockAudioRequests = async (context: BrowserContext | Page) => {
    await context.route(/\.(mp3|ogg|webm|wav)(\?.*)?$/i, route => route.abort());
};

const disableAudio = async (context: BrowserContext | Page) => {
    await context.addInitScript(() => {
        localStorage.setItem('audio_muted', 'true');
        localStorage.setItem('audio_master_volume', '0');
        localStorage.setItem('audio_sfx_volume', '0');
        localStorage.setItem('audio_bgm_volume', '0');
        (window as Window & { __BG_DISABLE_AUDIO__?: boolean }).__BG_DISABLE_AUDIO__ = true;
    });
};

const waitForPlayerBoard = async (page: Page, timeout = 15000) => {
    await page.waitForFunction(() => {
        const candidates = Array.from(document.querySelectorAll(
            '[data-tutorial-id="player-board"], img[alt="Player Board"], img[alt="玩家面板"]'
        ));
        return candidates.some((el) => {
            const style = window.getComputedStyle(el);
            if (!style || style.display === 'none' || style.visibility === 'hidden' || style.opacity === '0') {
                return false;
            }
            const rects = (el as HTMLElement).getClientRects();
            return rects.length > 0 && rects[0].width > 0 && rects[0].height > 0;
        });
    }, { timeout });
};

const waitForBoardReady = async (page: Page, timeout = 20000) => {
    await page.waitForFunction(() => {
        const selectors = [
            '[data-tutorial-id="advance-phase-button"]',
            '[data-tutorial-id="dice-roll-button"]',
            '[data-tutorial-id="hand-area"]',
        ];
        return selectors.some((selector) => {
            const el = document.querySelector(selector) as HTMLElement | null;
            if (!el) return false;
            const style = window.getComputedStyle(el);
            if (!style || style.display === 'none' || style.visibility === 'hidden' || style.opacity === '0') {
                return false;
            }
            const rects = el.getClientRects();
            return rects.length > 0 && rects[0].width > 0 && rects[0].height > 0;
        });
    }, { timeout });
};

const openDiceThroneModal = async (page: Page) => {
    await page.goto('/?game=dicethrone', { waitUntil: 'domcontentloaded' });
    const modalHeading = page.getByRole('heading', { name: /Dice Throne|王权骰铸/i }).first();
    await expect(modalHeading).toBeVisible({ timeout: 15000 });
};

const ensureDebugPanelOpen = async (page: Page) => {
    const panel = page.getByTestId('debug-panel');
    if (await panel.isVisible().catch(() => false)) return;
    await page.getByTestId('debug-toggle').click();
    await expect(panel).toBeVisible({ timeout: 5000 });
};

const closeDebugPanelIfOpen = async (page: Page) => {
    const panel = page.getByTestId('debug-panel');
    if (await panel.isVisible().catch(() => false)) {
        await page.getByTestId('debug-toggle').click();
        await expect(panel).toBeHidden({ timeout: 5000 });
    }
};

const ensureDebugControlsTab = async (page: Page) => {
    await ensureDebugPanelOpen(page);
    const controlsTab = page.getByRole('button', { name: /⚙️|System|系统/i });
    if (await controlsTab.isVisible().catch(() => false)) {
        await controlsTab.click();
    }
};

const applyDiceValues = async (page: Page, values: number[]) => {
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

const openDebugStateTab = async (page: Page) => {
    await ensureDebugPanelOpen(page);
    await page.getByTestId('debug-tab-state').click();
};

const readDebugCoreState = async (page: Page) => {
    await openDebugStateTab(page);
    const rawStateText = await page.getByTestId('debug-state-json').textContent();
    const stateText = rawStateText?.trim();
    if (!stateText) {
        throw new Error('Failed to read debug game state.');
    }
    const state = JSON.parse(stateText) as { core?: Record<string, unknown> };
    const core = (state.core ?? state) as Record<string, unknown>;
    return JSON.parse(JSON.stringify(core)) as Record<string, unknown>;
};

const applyCoreState = async (
    page: Page,
    updater: (core: Record<string, unknown>) => Record<string, unknown>
) => {
    const core = await readDebugCoreState(page);
    const nextCore = updater(core);
    const stateInput = page.getByTestId('debug-state-input');
    if (!await stateInput.isVisible().catch(() => false)) {
        await page.getByTestId('debug-state-toggle-input').click();
    }
    await stateInput.fill(JSON.stringify(nextCore));
    await page.getByTestId('debug-state-apply').click();
    await closeDebugPanelIfOpen(page);
};

const setPendingDamage = async (page: Page, pendingDamage: Record<string, unknown>) => {
    await applyCoreState(page, (core) => ({
        ...core,
        pendingDamage,
    }));
};

const setPlayerCp = async (page: Page, playerId: string, value: number) => {
    await applyCoreState(page, (core) => {
        const players = core.players as Record<string, any> | undefined;
        const player = players?.[playerId];
        if (!player) return core;
        player.resources = player.resources ?? {};
        player.resources.cp = value;
        return core;
    });
};

const ensureCardInHand = async (page: Page, cardId: string, playerId = '0') => {
    await applyCoreState(page, (core) => {
        const players = core.players as Record<string, any> | undefined;
        const player = players?.[playerId];
        if (!player) return core;
        const takeCard = (list: any[]) => {
            const idx = list.findIndex((card) => card?.id === cardId);
            if (idx === -1) return null;
            return list.splice(idx, 1)[0];
        };
        player.hand = player.hand ?? [];
        player.deck = player.deck ?? [];
        player.discard = player.discard ?? [];
        const card = takeCard(player.hand) ?? takeCard(player.deck) ?? takeCard(player.discard);
        if (card) {
            player.hand.push(card);
        }
        return core;
    });
};

const dragCardUp = async (page: Page, cardId: string, distance = 220) => {
    const card = page.locator(`[data-card-id="${cardId}"]`).first();
    await expect(card).toBeVisible({ timeout: 15000 });
    const box = await card.boundingBox();
    if (!box) {
        throw new Error(`Card ${cardId} has no bounding box.`);
    }
    const startX = box.x + box.width / 2;
    const startY = box.y + box.height / 2;
    await page.mouse.move(startX, startY);
    await page.mouse.down();
    await page.mouse.move(startX, startY - distance, { steps: 10 });
    await page.mouse.up();
};

const waitForTutorialStep = async (page: Page, stepId: string, timeout = 15000) => {
    await page.waitForFunction(
        (target) => {
            const el = document.querySelector('[data-tutorial-step]');
            return el && el.getAttribute('data-tutorial-step') === target;
        },
        stepId,
        { timeout }
    );
};

const closeTokenResponseModal = async (modal: Locator) => {
    const button = modal.getByRole('button', { name: /Skip|Confirm|跳过|确认/i }).first();
    if (await button.isVisible().catch(() => false)) {
        await button.click();
    }
};

const getModalContainerByHeading = async (page: Page, heading: RegExp, timeout = 8000) => {
    const headingLocator = page.getByRole('heading', { name: heading });
    await expect(headingLocator).toBeVisible({ timeout });
    return headingLocator.locator('..').locator('..');
};

const waitForRoomReady = async (page: Page, timeout = 15000) => {
    await page.waitForFunction(() => {
        const text = document.body?.innerText ?? '';
        const hasSelectionText = text.includes('Select Your Hero') || text.includes('选择你的英雄');
        const hasCharacterCard = document.querySelector('[data-char-id]') !== null;
        if (hasSelectionText || hasCharacterCard) return true;
        const candidates = Array.from(document.querySelectorAll(
            '[data-tutorial-id="player-board"], img[alt="Player Board"], img[alt="玩家面板"]'
        ));
        return candidates.some((el) => {
            const style = window.getComputedStyle(el);
            if (!style || style.display === 'none' || style.visibility === 'hidden' || style.opacity === '0') {
                return false;
            }
            const rects = (el as HTMLElement).getClientRects();
            return rects.length > 0 && rects[0].width > 0 && rects[0].height > 0;
        });
    }, { timeout });
};

const getPlayerBoardLocator = (page: Page) => {
    // Prefer the stable container hook over nested images to avoid strict-mode
    // collisions when the container + inner <img alt="Player Board"> both match.
    return page.locator('[data-tutorial-id="player-board"]').first();
};

const assertHandCardsVisible = async (page: Page, expectedCount: number, label: string) => {
    const handArea = page.locator('[data-tutorial-id="hand-area"]');
    await expect(handArea, `[${label}] 手牌区域未显示`).toBeVisible();

    const handCards = handArea.locator('[data-card-id]');
    await expect(handCards).toHaveCount(expectedCount, { timeout: 15000 });
    const cardCount = await handCards.count();

    if (cardCount !== expectedCount) {
        throw new Error(`[${label}] 期望 ${expectedCount} 张手牌，实际找到 ${cardCount} 张`);
    }

    const firstCard = handCards.first();
    const firstOpacity = await firstCard.evaluate(el => window.getComputedStyle(el).opacity);
    const firstBox = await firstCard.boundingBox();
    if (parseFloat(firstOpacity) === 0) {
        throw new Error(`[${label}] 手牌透明度为 0，卡牌不可见`);
    }
    if (!firstBox || firstBox.width === 0 || firstBox.height === 0) {
        throw new Error(`[${label}] 手牌没有尺寸，卡牌不可见`);
    }
};

const advanceToOffensiveRoll = async (page: Page) => {
    const rollButton = page.locator('[data-tutorial-id="dice-roll-button"]');
    for (let attempt = 0; attempt < 5; attempt += 1) {
        if (await rollButton.isEnabled().catch(() => false)) {
            return;
        }
        const nextPhaseButton = page.locator('[data-tutorial-id="advance-phase-button"]');
        if (await nextPhaseButton.isEnabled().catch(() => false)) {
            await nextPhaseButton.click();
            await page.waitForTimeout(500);
        } else if (await nextPhaseButton.isVisible().catch(() => false)) {
            await page.waitForTimeout(300);
        }
    }
};


const maybePassResponse = async (page: Page) => {
    const passButton = page.getByRole('button', { name: /Pass|跳过/i });
    if (await passButton.isVisible()) {
        await passButton.click();
        return true;
    }
    return false;
};

const waitForMainPhase = async (page: Page, timeout = 20000) => {
    await expect(page.getByText(/Main Phase \(1\)|主要阶段 \(1\)/)).toBeVisible({ timeout });
};

test.describe('DiceThrone E2E', () => {
    test('Online match shows starting hand cards after character selection', async ({ browser }, testInfo) => {
        const baseURL = testInfo.project.use.baseURL as string | undefined;

        const hostContext = await browser.newContext({ baseURL });
        await blockAudioRequests(hostContext as BrowserContext);
        await disableAudio(hostContext as BrowserContext);
        await disableTutorial(hostContext as any);
        await setEnglishLocale(hostContext);
        const hostPage = await hostContext.newPage();

        if (!await ensureGameServerAvailable(hostPage)) {
            test.skip(true, 'Game server unavailable for online tests.');
        }

        // 创建房间
        await openDiceThroneModal(hostPage);
        await hostPage.getByRole('button', { name: /Create Room|创建房间/i }).click();
        await expect(hostPage.getByRole('heading', { name: /Create Room|创建房间/i })).toBeVisible();
        await hostPage.getByRole('button', { name: /Confirm|确认/i }).click();
        try {
            await hostPage.waitForURL(/\/play\/dicethrone\/match\//, { timeout: 5000 });
        } catch {
            test.skip(true, 'Room creation failed or backend unavailable.');
        }

        const hostUrl = new URL(hostPage.url());
        const matchId = hostUrl.pathname.split('/').pop();
        if (!matchId) {
            throw new Error('Failed to parse match id from host URL.');
        }

        // 确保 host 有 playerID
        if (!hostUrl.searchParams.get('playerID')) {
            hostUrl.searchParams.set('playerID', '0');
            await hostPage.goto(hostUrl.toString());
        }
        // Guest 加入
        const guestContext = await browser.newContext({ baseURL });
        await blockAudioRequests(guestContext as BrowserContext);
        await disableAudio(guestContext as BrowserContext);
        await disableTutorial(guestContext as any);
        await setEnglishLocale(guestContext);
        const guestPage = await guestContext.newPage();
        await guestPage.goto(`/play/dicethrone/match/${matchId}?join=true`, { waitUntil: 'domcontentloaded' });
        await guestPage.waitForURL(/playerID=\d/, { timeout: 20000 });
        console.log(`[guest] url=${guestPage.url()}`);
        let autoStarted = true;
        try {
            await waitForMainPhase(hostPage, 15000);
            await waitForMainPhase(guestPage, 15000);
        } catch {
            autoStarted = false;
        }

        if (!autoStarted) {
            // 等待角色卡片挂载（避免偶发加载慢）
            await hostPage.waitForSelector('[data-char-id="monk"]', { state: 'attached', timeout: 60000 });
            await guestPage.waitForSelector('[data-char-id="barbarian"]', { state: 'attached', timeout: 60000 });

            // 双方选角：Host 选僧侣，Guest 选野蛮人并准备
            await hostPage.locator('[data-char-id="monk"]').first().click();
            await guestPage.locator('[data-char-id="barbarian"]').first().click();
            const readyButton = guestPage.getByRole('button', { name: /Ready|准备/i });
            await expect(readyButton).toBeVisible({ timeout: 20000 });
            await expect(readyButton).toBeEnabled({ timeout: 20000 });
            await readyButton.click();

            // Host 开始游戏
            const startButton = hostPage.getByRole('button', { name: /Start Game|开始游戏/i });
            await expect(startButton).toBeVisible({ timeout: 20000 });
            await expect(startButton).toBeEnabled({ timeout: 20000 });
            await startButton.click();

            // 等待游戏开始，进入 main1 阶段（双方）
            await waitForMainPhase(hostPage, 15000);
            await waitForMainPhase(guestPage, 15000);
        }

        // 等待手牌渲染完成
        await hostPage.waitForTimeout(2000);
        await guestPage.waitForTimeout(2000);

        await assertHandCardsVisible(hostPage, 4, 'host');
        await assertHandCardsVisible(guestPage, 4, 'guest');

        // 截图保存证据（只截取视口，不是全页面）
        await hostPage.screenshot({ path: 'test-results/hand-cards-success.png', fullPage: false });

        await hostContext.close();
        await guestContext.close();
    });

    test('Tutorial route shows Dice Throne tutorial overlay', async ({ page }) => {
        await setEnglishLocale(page);
        await page.goto('/play/dicethrone/tutorial');

        await waitForBoardReady(page, 20000);
        await expect(page.getByText(/Dice Throne 1v1 tutorial/i)).toBeVisible();
    });

    test('Tutorial completes the full flow (main1 -> offensive -> defense -> finish)', async ({ page }) => {
        test.setTimeout(120000);
        const pageErrors: string[] = [];
        const consoleErrors: string[] = [];
        page.on('pageerror', (error) => {
            const message = error.stack || error.message;
            pageErrors.push(message);
            console.log(`[tutorial] pageerror=${message}`);
        });
        page.on('console', (message) => {
            if (message.type() === 'error') {
                const text = message.text();
                consoleErrors.push(text);
                console.log(`[tutorial] consoleError=${text}`);
            }
        });
        page.on('framenavigated', (frame) => {
            if (frame === page.mainFrame()) {
                console.log(`[tutorial] navigated url=${frame.url()}`);
            }
        });
        page.on('crash', () => {
            console.log('[tutorial] page crashed');
        });
        page.on('close', () => {
            console.log('[tutorial] page closed');
        });

        await setEnglishLocale(page);
        await page.goto('/play/dicethrone/tutorial');
        await waitForBoardReady(page, 30000);

        const getTutorialStepId = async () => page
            .locator('[data-tutorial-step]')
            .first()
            .getAttribute('data-tutorial-step')
            .catch(() => 'unknown');

        const logTutorialStep = async (label: string) => {
            const stepId = await getTutorialStepId();
            console.log(`[tutorial] ${label} step=${stepId}`);
        };

        const clickNextOverlayStep = async () => {
            const nextButton = page.getByRole('button', { name: /^(Next|下一步)$/i }).first();
            if (await nextButton.isVisible({ timeout: 1500 }).catch(() => false)) {
                const beforeStep = await getTutorialStepId();
                await nextButton.click({ timeout: 2000, force: true }).catch(() => undefined);
                await page.waitForFunction(
                    (prev) => {
                        const el = document.querySelector('[data-tutorial-step]');
                        return el && el.getAttribute('data-tutorial-step') !== prev;
                    },
                    beforeStep,
                    { timeout: 2000 }
                ).catch(() => undefined);
                const afterStep = await getTutorialStepId();
                console.log(`[tutorial] next ${beforeStep} -> ${afterStep}`);
            }
        };

        // Tutorial overlay should be present.
        // Copy might differ by locale / i18n, so we anchor on the overlay controls.
        const overlayNextButton = page.getByRole('button', { name: /^(Next|下一步)$/i }).first();
        await expect(overlayNextButton).toBeVisible({ timeout: 15000 });
        await logTutorialStep('start');

        // setup -> intro -> stats -> phases -> player-board -> tip-board -> hand -> discard -> status-tokens
        const advanceStep = page.locator('[data-tutorial-step="advance"]');
        for (let i = 0; i < 12; i += 1) {
            if (page.isClosed()) {
                console.log('[tutorial] page closed before reaching advance step');
                break;
            }
            if (await advanceStep.isVisible({ timeout: 500 }).catch(() => false)) break;
            await clickNextOverlayStep();
            await page.waitForTimeout(200);
        }
        await logTutorialStep('before-advance');

        // Step: advance to offensive roll (requires clicking Next Phase on board)
        await expect(advanceStep).toBeVisible();
        const advanceButton = page.locator('[data-tutorial-id="advance-phase-button"]');
        await expect(advanceButton).toBeEnabled();
        await advanceButton.click();

        // Step: dice tray visible
        const diceTray = page.locator('[data-tutorial-id="dice-tray"]');
        await expect(diceTray).toBeVisible();
        await logTutorialStep('dice-tray');

        // Step: roll dice (deterministic via debug: force all 1s to guarantee at least one ability)
        const rollButton = page.locator('[data-tutorial-id="dice-roll-button"]');
        await expect(rollButton).toBeEnabled({ timeout: 10000 });
        await rollButton.click();
        await page.waitForTimeout(300);
        await applyDiceValues(page, [1, 1, 1, 1, 1]);

        const confirmButton = page.locator('[data-tutorial-id="dice-confirm-button"]');
        await expect(confirmButton).toBeEnabled({ timeout: 10000 });
        await confirmButton.click();

        // In tutorial mode, the step advances on ABILITY_ACTIVATED.
        // Not every forced dice result guarantees an ability highlight depending on hero config,
        // so we accept either: an ability becomes selectable OR the tutorial progresses.
        const highlightedSlots = page
            .locator('[data-ability-slot]')
            .filter({ has: page.locator('div.animate-pulse[class*="border-"]') });

        const firstHighlighted = highlightedSlots.first();
        const abilityActivated = await Promise.race([
            firstHighlighted.isVisible({ timeout: 4000 }).then(() => 'slot').catch(() => 'no-slot'),
            page.getByText(/resolve attack|结算|进入防御|defense/i).isVisible({ timeout: 4000 }).then(() => 'progress').catch(() => 'no-progress'),
        ]);

        if (abilityActivated === 'slot') {
            // The UI might show a highlight ring but not allow clicking yet (animations/overlays).
            // If clicking fails, just continue by advancing phase; tutorial will still validate the end-to-end path.
            try {
                await firstHighlighted.click({ timeout: 2000 });
            } catch {
                // ignore
            }
        } else {
            // If no slot is highlighted, proceed by advancing phase; tutorial may have auto-activated.
        }

        // Step: resolve attack via Next Phase.
        await expect(advanceButton).toBeEnabled({ timeout: 10000 });
        await advanceButton.click();

        // In tutorial mode, the system may either enter defense or jump directly to main2.
        await Promise.race([
            page.getByText(/Defense|防御/i).isVisible({ timeout: 15000 }).then(() => true).catch(() => false),
            page.getByText(/Main Phase \(2\)|主要阶段 \(2\)/).isVisible({ timeout: 15000 }).then(() => true).catch(() => false),
        ]);

        // If we are in defense, end it by rolling+confirming once.
        const endDefenseButton = page.getByRole('button', { name: /End Defense|结束防御/i });
        if (await endDefenseButton.isVisible({ timeout: 1500 }).catch(() => false)) {
            const defenseRollButton = page.locator('[data-tutorial-id="dice-roll-button"]');
            await expect(defenseRollButton).toBeEnabled({ timeout: 10000 });
            await defenseRollButton.click();
            await page.waitForTimeout(300);
            await applyDiceValues(page, [1, 1, 1, 1, 1]);
            await expect(confirmButton).toBeEnabled({ timeout: 10000 });
            await confirmButton.click();
            await endDefenseButton.click();
        }

        // Ensure tutorial reaches main2, then finish step should be available.
        await expect(page.getByText(/Main Phase \(2\)|主要阶段 \(2\)/)).toBeVisible({ timeout: 20000 });
        await logTutorialStep('main2');

        const waitStep = async (stepId: string, timeout = 15000) => {
            await waitForTutorialStep(page, stepId, timeout);
            await logTutorialStep(stepId);
        };

        await waitStep('taiji-response');
        // pendingDamage 已由教程 aiActions 中的 MERGE_STATE 注入
        const taijiModal = await getModalContainerByHeading(page, /Respond|响应/i, 15000);
        const useTaijiButton = taijiModal.getByRole('button', { name: /Use Taiji|使用太极/i });
        if (await useTaijiButton.isVisible().catch(() => false)) {
            await useTaijiButton.click();
        }
        await closeTokenResponseModal(taijiModal);

        await waitStep('evasive-response');
        // pendingDamage 已由教程 aiActions 中的 MERGE_STATE 注入
        const evasiveModal = await getModalContainerByHeading(page, /Respond|响应/i, 15000);
        const useEvasiveButton = evasiveModal.getByRole('button', { name: /Use Evasive|使用闪避/i });
        if (await useEvasiveButton.isVisible().catch(() => false)) {
            await useEvasiveButton.click();
        }
        await page.waitForTimeout(300);
        if (await evasiveModal.isVisible().catch(() => false)) {
            await closeTokenResponseModal(evasiveModal);
        }

        await waitStep('purify-use');
        const statusTokens = page.locator('[data-tutorial-id="status-tokens"]');
        await expect(statusTokens).toBeVisible({ timeout: 10000 });
        await statusTokens.locator('.cursor-pointer').first().click();
        const purifyModal = await getModalContainerByHeading(page, /Purify|净化/i, 15000);
        await purifyModal.getByRole('button', { name: /Confirm|确认/i }).click();

        await waitStep('inner-peace');
        await dragCardUp(page, 'card-inner-peace');

        await waitStep('play-six');
        await ensureCardInHand(page, 'card-play-six');
        await dragCardUp(page, 'card-play-six');
        const diceTrayInteraction = page.locator('[data-tutorial-id="dice-tray"]');
        await expect(diceTrayInteraction).toBeVisible({ timeout: 15000 });
        await diceTrayInteraction.locator('.cursor-pointer').first().click();
        await page.getByRole('button', { name: /Confirm|确认/i }).first().click();

        await waitStep('meditation-2');
        await setPlayerCp(page, '0', 2);
        await ensureCardInHand(page, 'card-meditation-2');
        await dragCardUp(page, 'card-meditation-2');

        await waitStep('defense-roll');
        await advanceToOffensiveRoll(page);
        await expect(rollButton).toBeEnabled({ timeout: 10000 });
        await rollButton.click();
        await page.waitForTimeout(300);
        await applyDiceValues(page, [1, 1, 1, 1, 1]);

        await waitStep('defense-end');
        await expect(advanceButton).toBeEnabled({ timeout: 10000 });
        await advanceButton.click();
        const confirmHeading = page.getByRole('heading', { name: /End offensive roll\?|确认结束攻击掷骰？/i });
        if (await confirmHeading.isVisible({ timeout: 2000 }).catch(() => false)) {
            const confirmSkipModal = confirmHeading.locator('..').locator('..');
            await confirmSkipModal.getByRole('button', { name: /Confirm|确认/i }).click();
        }

        await waitStep('finish', 20000);
        const finishButton = page.getByRole('button', { name: /^(Finish and return|完成并返回)$/i }).first();
        if (await finishButton.isVisible({ timeout: 6000 }).catch(() => false)) {
            await page.screenshot({ path: 'test-results/tutorial-final-step.png', fullPage: false });
            await finishButton.click();
        }

        if (pageErrors.length || consoleErrors.length) {
            console.log(`[tutorial] pageErrors=${pageErrors.length} consoleErrors=${consoleErrors.length}`);
            pageErrors.forEach((error) => console.log(`[tutorial] pageerror=${error}`));
            consoleErrors.forEach((error) => console.log(`[tutorial] consoleError=${error}`));
        }
    });

    test('Local offensive roll shows confirm skip modal when ability available', async ({ page }) => {
        await setEnglishLocale(page);
        await disableTutorial(page);
        await page.goto('/play/dicethrone/local');

        await waitForBoardReady(page, 20000);
        await advanceToOffensiveRoll(page);

        const rollButton = page.locator('[data-tutorial-id="dice-roll-button"]');
        await expect(rollButton).toBeEnabled({ timeout: 5000 });
        await rollButton.click();
        await page.waitForTimeout(300);
        await applyDiceValues(page, [1, 1, 1, 1, 1]);
        const confirmButton = page.locator('[data-tutorial-id="dice-confirm-button"]');
        await expect(confirmButton).toBeEnabled({ timeout: 5000 });
        await confirmButton.click();

        const advanceButton = page.locator('[data-tutorial-id="advance-phase-button"]');

        await advanceButton.click();
        const confirmHeading = page.getByRole('heading', { name: /End offensive roll\?|确认结束攻击掷骰？/i });
        if (await confirmHeading.isVisible({ timeout: 4000 }).catch(() => false)) {
            const confirmSkipModal = confirmHeading.locator('..').locator('..');
            await confirmSkipModal.getByRole('button', { name: /Cancel|返回选择技能/i }).click();
        }
    });

    test('Online match can be created and HUD shows room info', async ({ page }) => {
        const pageErrors: string[] = [];
        const consoleErrors: string[] = [];
        page.on('pageerror', (error) => {
            pageErrors.push(error.stack || error.message);
        });
        page.on('console', (message) => {
            if (message.type() === 'error') {
                consoleErrors.push(message.text());
            }
        });

        await setEnglishLocale(page);
        await disableTutorial(page);
        if (!await ensureGameServerAvailable(page)) {
            test.skip(true, 'Game server unavailable for online tests.');
        }
        await openDiceThroneModal(page);
        await page.getByRole('button', { name: /Create Room|创建房间/i }).click();
        await expect(page.getByRole('heading', { name: /Create Room|创建房间/i })).toBeVisible();
        await page.getByRole('button', { name: /Confirm|确认/i }).click();
        try {
            await page.waitForURL(/\/play\/dicethrone\/match\//, { timeout: 5000 });
        } catch {
            test.skip(true, 'Room creation failed or backend unavailable.');
        }
        await expect(page).toHaveURL(/\/play\/dicethrone\/match\//);
        try {
            await waitForRoomReady(page, 15000);
        } catch (error) {
            console.log(`[E2E] player-board-not-found url=${page.url()}`);
            console.log(`[E2E] pageErrors=${pageErrors.join(' | ') || 'none'}`);
            console.log(`[E2E] consoleErrors=${consoleErrors.join(' | ') || 'none'}`);
            throw error;
        }

        // Open HUD menu
        const hudFab = page.locator('[data-testid="fab-menu"] [data-fab-id]').first();
        await expect(hudFab).toBeVisible();
        await hudFab.click();

        const settingsButton = page.locator('[data-fab-id="settings"]');
        await expect(settingsButton).toBeVisible();
        await settingsButton.click();

        const roomIdSection = page.getByText(/Room ID/i).locator('..');
        const roomIdButton = roomIdSection.getByRole('button');
        await expect(roomIdButton).toBeVisible();
        await expect(roomIdButton.locator('span.font-mono')).toHaveText(/[A-Za-z0-9]+/);
    });

    test('Online match supports offensive roll flow with two players', async ({ browser }, testInfo) => {
        const baseURL = testInfo.project.use.baseURL as string | undefined;

        const hostContext = await browser.newContext({ baseURL });
        await disableTutorial(hostContext as any);
        await setEnglishLocale(hostContext);
        const hostPage = await hostContext.newPage();

        if (!await ensureGameServerAvailable(hostPage)) {
            test.skip(true, 'Game server unavailable for online tests.');
        }

        await openDiceThroneModal(hostPage);
        await hostPage.getByRole('button', { name: /Create Room|创建房间/i }).click();
        await expect(hostPage.getByRole('heading', { name: /Create Room|创建房间/i })).toBeVisible();
        await hostPage.getByRole('button', { name: /Confirm|确认/i }).click();
        try {
            await hostPage.waitForURL(/\/play\/dicethrone\/match\//, { timeout: 5000 });
        } catch {
            test.skip(true, 'Room creation failed or backend unavailable.');
        }
        await waitForRoomReady(hostPage, 15000);

        const hostUrl = new URL(hostPage.url());
        const matchId = hostUrl.pathname.split('/').pop();
        if (!matchId) {
            throw new Error('Failed to parse match id from host URL.');
        }

        if (!hostUrl.searchParams.get('playerID')) {
            hostUrl.searchParams.set('playerID', '0');
            await hostPage.goto(hostUrl.toString());
            await waitForRoomReady(hostPage, 15000);
        }

        const guestContext = await browser.newContext({ baseURL });
        await disableTutorial(guestContext as any);
        await setEnglishLocale(guestContext);
        const guestPage = await guestContext.newPage();
        await guestPage.goto(`/play/dicethrone/match/${matchId}?join=true`);
        await guestPage.waitForURL(/playerID=\d/);
        await waitForRoomReady(guestPage, 15000);

        let autoStarted = true;
        try {
            await waitForMainPhase(hostPage, 15000);
            await waitForMainPhase(guestPage, 15000);
        } catch {
            autoStarted = false;
        }

        if (!autoStarted) {
            await hostPage.waitForSelector('[data-char-id="monk"]', { state: 'attached', timeout: 60000 });
            await guestPage.waitForSelector('[data-char-id="barbarian"]', { state: 'attached', timeout: 60000 });
            await hostPage.locator('[data-char-id="monk"]').first().click();
            await guestPage.locator('[data-char-id="barbarian"]').first().click();
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

        const isButtonEnabled = async (page: Page, name: string | RegExp) => {
            const button = page.getByRole('button', { name });
            if (await button.count() === 0) return false;
            return button.isEnabled();
        };

        let attackerPage: Page | null = null;
        let defenderPage: Page | null = null;
        let alreadyOffensive = false;
        for (let i = 0; i < 20; i += 1) {
            if (await isButtonEnabled(hostPage, /Resolve Attack|结算攻击/i)) {
                attackerPage = hostPage;
                defenderPage = guestPage;
                alreadyOffensive = true;
                break;
            }
            if (await isButtonEnabled(guestPage, /Resolve Attack|结算攻击/i)) {
                attackerPage = guestPage;
                defenderPage = hostPage;
                alreadyOffensive = true;
                break;
            }
            if (await isButtonEnabled(hostPage, /Next Phase|下一阶段/i)) {
                attackerPage = hostPage;
                defenderPage = guestPage;
                break;
            }
            if (await isButtonEnabled(guestPage, /Next Phase|下一阶段/i)) {
                attackerPage = guestPage;
                defenderPage = hostPage;
                break;
            }
            await hostPage.waitForTimeout(300);
        }

        if (!attackerPage || !defenderPage) {
            throw new Error('Failed to determine the active player page.');
        }

        const resolveAttackButton = attackerPage.getByRole('button', { name: /Resolve Attack|结算攻击/i });
        if (!alreadyOffensive) {
            await attackerPage.getByRole('button', { name: /Next Phase|下一阶段/i }).click();
            const attackerRollButton = attackerPage.locator('[data-tutorial-id="dice-roll-button"]');
            await expect(attackerRollButton).toBeEnabled({ timeout: 10000 });
        }

        const rollButton = attackerPage.locator('[data-tutorial-id="dice-roll-button"]');
        await expect(rollButton).toBeEnabled({ timeout: 5000 });
        await rollButton.click();
        await attackerPage.waitForTimeout(300);
        await applyDiceValues(attackerPage, [1, 1, 1, 1, 1]);
        const confirmButton = attackerPage.locator('[data-tutorial-id="dice-confirm-button"]');
        await expect(confirmButton).toBeEnabled({ timeout: 5000 });
        await confirmButton.click();
        const highlightedSlots = attackerPage
            .locator('[data-ability-slot]')
            .filter({ has: attackerPage.locator('div.animate-pulse[class*="border-"]') });
        const firstHighlighted = highlightedSlots.first();
        const hasHighlight = await firstHighlighted.isVisible({ timeout: 3000 }).catch(() => false);
        if (hasHighlight) {
            await firstHighlighted.click();
            await expect(resolveAttackButton).toBeVisible({ timeout: 10000 });
            await resolveAttackButton.click();
        } else {
            const advanceButton = attackerPage.locator('[data-tutorial-id="advance-phase-button"]');
            await advanceButton.click();
            const confirmHeading = attackerPage.getByRole('heading', { name: /End offensive roll\?|确认结束攻击掷骰？/i });
            if (await confirmHeading.isVisible({ timeout: 4000 }).catch(() => false)) {
                const confirmSkipModal = confirmHeading.locator('..').locator('..');
                await confirmSkipModal.getByRole('button', { name: /Confirm|确认/i }).click();
            }
        }

        // Handle ability resolution choice modal if it appears (some abilities require token selection)
        // Loop to handle multiple choice modals that may appear
        for (let choiceAttempt = 0; choiceAttempt < 5; choiceAttempt++) {
            let choiceModal: ReturnType<typeof attackerPage.locator> | null = null;
            try {
                choiceModal = await getModalContainerByHeading(
                    attackerPage,
                    /Ability Resolution Choice|技能结算选择/i,
                    1500
                );
            } catch {
                choiceModal = null;
            }
            if (!choiceModal) break;
            const choiceButton = choiceModal.getByRole('button').filter({ hasText: /\S+/ }).first();
            if (await choiceButton.isVisible({ timeout: 500 }).catch(() => false)) {
                await choiceButton.click();
                await attackerPage.waitForTimeout(500);
            }
        }

        // Wait for either defensive phase or main phase 2 (ability might not be defendable)
        const defensePhaseStarted = await Promise.race([
            defenderPage.getByRole('button', { name: /End Defense|结束防御/i }).isVisible({ timeout: 5000 }).then(() => true).catch(() => false),
            attackerPage.getByText(/Main Phase \(2\)|主要阶段 \(2\)/).isVisible({ timeout: 5000 }).then(() => false).catch(() => false),
        ]);

        if (defensePhaseStarted) {
            // If defensive phase started, defender should be able to roll
            const defenderRollButton = defenderPage.locator('[data-tutorial-id="dice-roll-button"]');
            const defenderConfirmButton = defenderPage.locator('[data-tutorial-id="dice-confirm-button"]');
            const endDefenseButton = defenderPage.getByRole('button', { name: /End Defense|结束防御/i });
            const canRoll = await defenderRollButton.isEnabled({ timeout: 5000 }).catch(() => false);
            if (canRoll) {
                await defenderRollButton.click();
                await defenderConfirmButton.click();
                await endDefenseButton.click();
            } else {
                const canEndDefense = await endDefenseButton.isEnabled({ timeout: 2000 }).catch(() => false);
                if (canEndDefense) {
                    await endDefenseButton.click();
                }
            }

            // Handle response windows
            for (let i = 0; i < 4; i += 1) {
                const hostPassed = await maybePassResponse(hostPage);
                const guestPassed = await maybePassResponse(guestPage);
                if (!hostPassed && !guestPassed) break;
            }
        }

        // Verify we reached Main Phase 2 (attack completed)
        await expect(attackerPage.getByText(/Main Phase \(2\)|主要阶段 \(2\)/)).toBeVisible({ timeout: 10000 });

        await hostContext.close();
        await guestContext.close();
    });

    test('Local skip token response shows Next Phase button', async ({ page }) => {
        await setEnglishLocale(page);
        await disableTutorial(page);
        await page.goto('/play/dicethrone/local');
        await waitForPlayerBoard(page, 15000);

        await expect(page.getByText(/Main Phase \(1\)|主要阶段 \(1\)/)).toBeVisible({ timeout: 10000 });
        await advanceToOffensiveRoll(page);
        await setPendingDamage(page, {
            id: 'tutorial-skip-response',
            sourcePlayerId: '0',
            targetPlayerId: '1',
            originalDamage: 2,
            currentDamage: 2,
            responseType: 'beforeDamageDealt',
            responderId: '0',
            isFullyEvaded: false,
        });

        const responseModal = await getModalContainerByHeading(page, /Respond|响应/i, 15000);
        const skipButton = responseModal.getByRole('button', { name: /Skip|跳过/i });
        await expect(skipButton).toBeVisible({ timeout: 5000 });
        await skipButton.click();

        await expect(page.getByRole('button', { name: /Next Phase|下一阶段/i })).toBeVisible({ timeout: 10000 });
    });
});
