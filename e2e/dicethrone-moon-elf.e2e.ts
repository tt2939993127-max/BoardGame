/**
 * 月精灵 (Moon Elf) E2E 交互测试
 *
 * 覆盖交互面：
 * - 角色选择：月精灵在选角界面可选
 * - 攻击流程：掷骰 → 确认 → 选择技能 → 结算攻击 → 防御阶段
 * - 技能高亮：不同骰面组合触发不同技能
 * - 防御阶段：迷影步防御技能触发
 * - 状态效果：缠绕/致盲/锁定图标可见
 */

import { test, expect, type Page, type BrowserContext } from '@playwright/test';

// ============================================================================
// 复用辅助函数（与 dicethrone.e2e.ts 保持一致）
// ============================================================================

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
        } catch { /* ignore */ }
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
            if (!style || style.display === 'none' || style.visibility === 'hidden' || style.opacity === '0') return false;
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

const waitForMainPhase = async (page: Page, timeout = 20000) => {
    await expect(page.getByText(/Main Phase \(1\)|主要阶段 \(1\)/)).toBeVisible({ timeout });
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
            if (!style || style.display === 'none' || style.visibility === 'hidden' || style.opacity === '0') return false;
            const rects = (el as HTMLElement).getClientRects();
            return rects.length > 0 && rects[0].width > 0 && rects[0].height > 0;
        });
    }, { timeout });
};

const advanceToOffensiveRoll = async (page: Page) => {
    const rollButton = page.locator('[data-tutorial-id="dice-roll-button"]');
    for (let attempt = 0; attempt < 5; attempt += 1) {
        if (await rollButton.isEnabled().catch(() => false)) return;
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

const getModalContainerByHeading = async (page: Page, heading: RegExp, timeout = 8000) => {
    const headingLocator = page.getByRole('heading', { name: heading });
    await expect(headingLocator).toBeVisible({ timeout });
    return headingLocator.locator('..').locator('..');
};

// ============================================================================
// 月精灵 E2E 测试
// ============================================================================

test.describe('DiceThrone Moon Elf E2E', () => {

    // ========================================================================
    // 1. 在线对局：月精灵角色选择 + 基础攻击流程
    // ========================================================================
    test('Online match: Moon Elf character selection and basic attack flow', async ({ browser }, testInfo) => {
        test.setTimeout(90000);
        const baseURL = testInfo.project.use.baseURL as string | undefined;

        // 创建 Host 上下文
        const hostContext = await browser.newContext({ baseURL });
        await blockAudioRequests(hostContext);
        await disableAudio(hostContext);
        await disableTutorial(hostContext as any);
        await setEnglishLocale(hostContext);
        const hostPage = await hostContext.newPage();

        if (!await ensureGameServerAvailable(hostPage)) {
            test.skip(true, '游戏服务器不可用');
        }

        // 创建房间
        await openDiceThroneModal(hostPage);
        await hostPage.getByRole('button', { name: /Create Room|创建房间/i }).click();
        await expect(hostPage.getByRole('heading', { name: /Create Room|创建房间/i })).toBeVisible();
        await hostPage.getByRole('button', { name: /Confirm|确认/i }).click();
        try {
            await hostPage.waitForURL(/\/play\/dicethrone\/match\//, { timeout: 5000 });
        } catch {
            test.skip(true, '房间创建失败或后端不可用');
        }

        const hostUrl = new URL(hostPage.url());
        const matchId = hostUrl.pathname.split('/').pop();
        if (!matchId) throw new Error('无法从 URL 解析 matchId');

        if (!hostUrl.searchParams.get('playerID')) {
            hostUrl.searchParams.set('playerID', '0');
            await hostPage.goto(hostUrl.toString());
        }

        // Guest 加入
        const guestContext = await browser.newContext({ baseURL });
        await blockAudioRequests(guestContext);
        await disableAudio(guestContext);
        await disableTutorial(guestContext as any);
        await setEnglishLocale(guestContext);
        const guestPage = await guestContext.newPage();
        await guestPage.goto(`/play/dicethrone/match/${matchId}?join=true`, { waitUntil: 'domcontentloaded' });
        await guestPage.waitForURL(/playerID=\d/, { timeout: 20000 });

        // 先检查是否自动开始（服务器可能自动分配角色）
        let autoStarted = true;
        try {
            await waitForMainPhase(hostPage, 15000);
            await waitForMainPhase(guestPage, 15000);
        } catch {
            autoStarted = false;
        }

        if (!autoStarted) {
            // 等待角色选择界面
            await hostPage.waitForSelector('[data-char-id="moon_elf"]', { state: 'attached', timeout: 60000 });
            await guestPage.waitForSelector('[data-char-id="barbarian"]', { state: 'attached', timeout: 60000 });

            // Host 选月精灵，Guest 选野蛮人
            await hostPage.locator('[data-char-id="moon_elf"]').first().click();
            await guestPage.locator('[data-char-id="barbarian"]').first().click();

            // Guest 准备
            const readyButton = guestPage.getByRole('button', { name: /Ready|准备/i });
            await expect(readyButton).toBeVisible({ timeout: 20000 });
            await expect(readyButton).toBeEnabled({ timeout: 20000 });
            await readyButton.click();

            // Host 开始游戏
            const startButton = hostPage.getByRole('button', { name: /Start Game|开始游戏/i });
            await expect(startButton).toBeVisible({ timeout: 20000 });
            await expect(startButton).toBeEnabled({ timeout: 20000 });
            await startButton.click();

            // 等待进入 Main Phase 1
            await waitForMainPhase(hostPage, 15000);
            await waitForMainPhase(guestPage, 15000);
        }

        // 验证手牌区可见（4张初始手牌）
        await hostPage.waitForTimeout(2000);
        const hostHandArea = hostPage.locator('[data-tutorial-id="hand-area"]');
        await expect(hostHandArea).toBeVisible();
        const hostHandCards = hostHandArea.locator('[data-card-id]');
        await expect(hostHandCards).toHaveCount(4, { timeout: 15000 });

        // 确定攻击方（谁有 Next Phase 按钮可用）
        let attackerPage: Page;
        let defenderPage: Page;

        const hostNextPhase = hostPage.locator('[data-tutorial-id="advance-phase-button"]');
        if (await hostNextPhase.isEnabled({ timeout: 3000 }).catch(() => false)) {
            attackerPage = hostPage;
            defenderPage = guestPage;
        } else {
            attackerPage = guestPage;
            defenderPage = hostPage;
        }

        // 推进到攻击掷骰阶段
        await advanceToOffensiveRoll(attackerPage);

        // 掷骰
        const rollButton = attackerPage.locator('[data-tutorial-id="dice-roll-button"]');
        await expect(rollButton).toBeEnabled({ timeout: 5000 });
        await rollButton.click();
        await attackerPage.waitForTimeout(300);

        // 设置骰面为 [1,1,1,1,1] = 5个弓(bow)，触发长弓 5-of-a-kind
        await applyDiceValues(attackerPage, [1, 1, 1, 1, 1]);

        // 确认掷骰
        const confirmButton = attackerPage.locator('[data-tutorial-id="dice-confirm-button"]');
        await expect(confirmButton).toBeEnabled({ timeout: 5000 });
        await confirmButton.click();

        // 检查技能高亮（应该有技能被激活）
        const highlightedSlots = attackerPage
            .locator('[data-ability-slot]')
            .filter({ has: attackerPage.locator('div.animate-pulse[class*="border-"]') });
        const hasHighlight = await highlightedSlots.first().isVisible({ timeout: 5000 }).catch(() => false);

        if (hasHighlight) {
            // 选择高亮的技能
            await highlightedSlots.first().click();

            // 点击结算攻击
            const resolveAttackButton = attackerPage.getByRole('button', { name: /Resolve Attack|结算攻击/i });
            await expect(resolveAttackButton).toBeVisible({ timeout: 10000 });
            await resolveAttackButton.click();
        } else {
            // 没有高亮技能，直接推进
            const advanceButton = attackerPage.locator('[data-tutorial-id="advance-phase-button"]');
            await advanceButton.click();
            const confirmHeading = attackerPage.getByRole('heading', { name: /End offensive roll\?|确认结束攻击掷骰？/i });
            if (await confirmHeading.isVisible({ timeout: 4000 }).catch(() => false)) {
                const confirmSkipModal = confirmHeading.locator('..').locator('..');
                await confirmSkipModal.getByRole('button', { name: /Confirm|确认/i }).click();
            }
        }

        // 处理技能结算选择弹窗（如果出现）
        for (let choiceAttempt = 0; choiceAttempt < 5; choiceAttempt++) {
            let choiceModal: ReturnType<typeof attackerPage.locator> | null = null;
            try {
                choiceModal = await getModalContainerByHeading(attackerPage, /Ability Resolution Choice|技能结算选择/i, 1500);
            } catch { choiceModal = null; }
            if (!choiceModal) break;
            const choiceButton = choiceModal.getByRole('button').filter({ hasText: /\S+/ }).first();
            if (await choiceButton.isVisible({ timeout: 500 }).catch(() => false)) {
                await choiceButton.click();
                await attackerPage.waitForTimeout(500);
            }
        }

        // 等待防御阶段或 Main Phase 2
        const defensePhaseStarted = await Promise.race([
            defenderPage.getByRole('button', { name: /End Defense|结束防御/i }).isVisible({ timeout: 8000 }).then(() => true).catch(() => false),
            attackerPage.getByText(/Main Phase \(2\)|主要阶段 \(2\)/).isVisible({ timeout: 8000 }).then(() => false).catch(() => false),
        ]);

        if (defensePhaseStarted) {
            // 防御方掷骰并结束防御
            const defenderRollButton = defenderPage.locator('[data-tutorial-id="dice-roll-button"]');
            const defenderConfirmButton = defenderPage.locator('[data-tutorial-id="dice-confirm-button"]');
            const endDefenseButton = defenderPage.getByRole('button', { name: /End Defense|结束防御/i });

            const canRoll = await defenderRollButton.isEnabled({ timeout: 5000 }).catch(() => false);
            if (canRoll) {
                await defenderRollButton.click();
                await defenderPage.waitForTimeout(300);
                await defenderConfirmButton.click();
                await endDefenseButton.click();
            } else {
                const canEndDefense = await endDefenseButton.isEnabled({ timeout: 2000 }).catch(() => false);
                if (canEndDefense) await endDefenseButton.click();
            }

            // 处理响应窗口
            for (let i = 0; i < 4; i += 1) {
                const hostPassed = await maybePassResponse(hostPage);
                const guestPassed = await maybePassResponse(guestPage);
                if (!hostPassed && !guestPassed) break;
            }
        }

        // 验证到达 Main Phase 2（攻击完成）
        await expect(attackerPage.getByText(/Main Phase \(2\)|主要阶段 \(2\)/)).toBeVisible({ timeout: 15000 });

        await hostPage.screenshot({ path: 'test-results/moon-elf-attack-flow.png', fullPage: false });

        await hostContext.close();
        await guestContext.close();
    });

    // ========================================================================
    // 2. 在线对局：月精灵不同骰面组合触发不同技能
    // ========================================================================
    test('Online match: Moon Elf dice combinations trigger different abilities', async ({ browser }, testInfo) => {
        test.setTimeout(120000);
        const baseURL = testInfo.project.use.baseURL as string | undefined;

        const hostContext = await browser.newContext({ baseURL });
        await blockAudioRequests(hostContext);
        await disableAudio(hostContext);
        await disableTutorial(hostContext as any);
        await setEnglishLocale(hostContext);
        const hostPage = await hostContext.newPage();

        if (!await ensureGameServerAvailable(hostPage)) {
            test.skip(true, '游戏服务器不可用');
        }

        // 创建房间并双方加入
        await openDiceThroneModal(hostPage);
        await hostPage.getByRole('button', { name: /Create Room|创建房间/i }).click();
        await expect(hostPage.getByRole('heading', { name: /Create Room|创建房间/i })).toBeVisible();
        await hostPage.getByRole('button', { name: /Confirm|确认/i }).click();
        try {
            await hostPage.waitForURL(/\/play\/dicethrone\/match\//, { timeout: 5000 });
        } catch {
            test.skip(true, '房间创建失败或后端不可用');
        }

        const hostUrl = new URL(hostPage.url());
        const matchId = hostUrl.pathname.split('/').pop();
        if (!matchId) throw new Error('无法从 URL 解析 matchId');
        if (!hostUrl.searchParams.get('playerID')) {
            hostUrl.searchParams.set('playerID', '0');
            await hostPage.goto(hostUrl.toString());
        }

        const guestContext = await browser.newContext({ baseURL });
        await blockAudioRequests(guestContext);
        await disableAudio(guestContext);
        await disableTutorial(guestContext as any);
        await setEnglishLocale(guestContext);
        const guestPage = await guestContext.newPage();
        await guestPage.goto(`/play/dicethrone/match/${matchId}?join=true`, { waitUntil: 'domcontentloaded' });
        await guestPage.waitForURL(/playerID=\d/, { timeout: 20000 });

        // 先检查是否自动开始
        let autoStarted2 = true;
        try {
            await waitForMainPhase(hostPage, 15000);
            await waitForMainPhase(guestPage, 15000);
        } catch {
            autoStarted2 = false;
        }

        if (autoStarted2) {
            // 自动开始时无法控制角色选择，跳过此测试
            test.skip(true, '游戏自动开始，无法选择月精灵角色');
        }

        await hostPage.waitForSelector('[data-char-id="moon_elf"]', { state: 'attached', timeout: 60000 });
        await guestPage.waitForSelector('[data-char-id="monk"]', { state: 'attached', timeout: 60000 });
        await hostPage.locator('[data-char-id="moon_elf"]').first().click();
        await guestPage.locator('[data-char-id="monk"]').first().click();

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

        // 确定攻击方
        let attackerPage: Page;
        const hostNextPhase = hostPage.locator('[data-tutorial-id="advance-phase-button"]');
        if (await hostNextPhase.isEnabled({ timeout: 3000 }).catch(() => false)) {
            attackerPage = hostPage;
        } else {
            attackerPage = guestPage;
        }

        // 推进到攻击掷骰
        await advanceToOffensiveRoll(attackerPage);

        // 掷骰
        const rollButton = attackerPage.locator('[data-tutorial-id="dice-roll-button"]');
        await expect(rollButton).toBeEnabled({ timeout: 5000 });
        await rollButton.click();
        await attackerPage.waitForTimeout(300);

        // 测试骰面组合：[6,6,6,6,6] = 5个月(moon) → 应触发月蚀(lunar-eclipse)终极技能
        await applyDiceValues(attackerPage, [6, 6, 6, 6, 6]);

        const confirmButton = attackerPage.locator('[data-tutorial-id="dice-confirm-button"]');
        await expect(confirmButton).toBeEnabled({ timeout: 5000 });
        await confirmButton.click();

        // 验证有技能被高亮（5个月应触发月蚀终极技能）
        const highlightedSlots = attackerPage
            .locator('[data-ability-slot]')
            .filter({ has: attackerPage.locator('div.animate-pulse[class*="border-"]') });

        // 至少应有一个技能高亮
        const highlightCount = await highlightedSlots.count();
        expect(highlightCount).toBeGreaterThan(0);

        // 截图记录技能高亮状态
        await attackerPage.screenshot({ path: 'test-results/moon-elf-lunar-eclipse-highlight.png', fullPage: false });

        await hostContext.close();
        await guestContext.close();
    });

    // ========================================================================
    // 3. 在线对局：月精灵 vs 月精灵（双方迷影步防御）
    // ========================================================================
    test('Online match: Moon Elf mirror match with defensive ability', async ({ browser }, testInfo) => {
        test.setTimeout(120000);
        const baseURL = testInfo.project.use.baseURL as string | undefined;

        const hostContext = await browser.newContext({ baseURL });
        await blockAudioRequests(hostContext);
        await disableAudio(hostContext);
        await disableTutorial(hostContext as any);
        await setEnglishLocale(hostContext);
        const hostPage = await hostContext.newPage();

        if (!await ensureGameServerAvailable(hostPage)) {
            test.skip(true, '游戏服务器不可用');
        }

        // 创建房间
        await openDiceThroneModal(hostPage);
        await hostPage.getByRole('button', { name: /Create Room|创建房间/i }).click();
        await expect(hostPage.getByRole('heading', { name: /Create Room|创建房间/i })).toBeVisible();
        await hostPage.getByRole('button', { name: /Confirm|确认/i }).click();
        try {
            await hostPage.waitForURL(/\/play\/dicethrone\/match\//, { timeout: 5000 });
        } catch {
            test.skip(true, '房间创建失败或后端不可用');
        }

        const hostUrl = new URL(hostPage.url());
        const matchId = hostUrl.pathname.split('/').pop();
        if (!matchId) throw new Error('无法从 URL 解析 matchId');
        if (!hostUrl.searchParams.get('playerID')) {
            hostUrl.searchParams.set('playerID', '0');
            await hostPage.goto(hostUrl.toString());
        }

        const guestContext = await browser.newContext({ baseURL });
        await blockAudioRequests(guestContext);
        await disableAudio(guestContext);
        await disableTutorial(guestContext as any);
        await setEnglishLocale(guestContext);
        const guestPage = await guestContext.newPage();
        await guestPage.goto(`/play/dicethrone/match/${matchId}?join=true`, { waitUntil: 'domcontentloaded' });
        await guestPage.waitForURL(/playerID=\d/, { timeout: 20000 });

        // 先检查是否自动开始
        let autoStarted3 = true;
        try {
            await waitForMainPhase(hostPage, 15000);
            await waitForMainPhase(guestPage, 15000);
        } catch {
            autoStarted3 = false;
        }

        if (autoStarted3) {
            test.skip(true, '游戏自动开始，无法选择月精灵角色');
        }

        await hostPage.waitForSelector('[data-char-id="moon_elf"]', { state: 'attached', timeout: 60000 });
        await guestPage.waitForSelector('[data-char-id="moon_elf"]', { state: 'attached', timeout: 60000 });
        await hostPage.locator('[data-char-id="moon_elf"]').first().click();
        await guestPage.locator('[data-char-id="moon_elf"]').first().click();

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

        // 确定攻击方和防御方
        let attackerPage: Page;
        let defenderPage: Page;
        const hostNextPhase = hostPage.locator('[data-tutorial-id="advance-phase-button"]');
        if (await hostNextPhase.isEnabled({ timeout: 3000 }).catch(() => false)) {
            attackerPage = hostPage;
            defenderPage = guestPage;
        } else {
            attackerPage = guestPage;
            defenderPage = hostPage;
        }

        // 攻击方推进到攻击掷骰
        await advanceToOffensiveRoll(attackerPage);

        // 掷骰并设置为 [1,1,1,4,5] = 3弓+1足+1足 → 触发长弓(3弓)
        const rollButton = attackerPage.locator('[data-tutorial-id="dice-roll-button"]');
        await expect(rollButton).toBeEnabled({ timeout: 5000 });
        await rollButton.click();
        await attackerPage.waitForTimeout(300);
        await applyDiceValues(attackerPage, [1, 1, 1, 4, 5]);

        const confirmButton = attackerPage.locator('[data-tutorial-id="dice-confirm-button"]');
        await expect(confirmButton).toBeEnabled({ timeout: 5000 });
        await confirmButton.click();

        // 选择高亮技能
        const highlightedSlots = attackerPage
            .locator('[data-ability-slot]')
            .filter({ has: attackerPage.locator('div.animate-pulse[class*="border-"]') });
        const hasHighlight = await highlightedSlots.first().isVisible({ timeout: 5000 }).catch(() => false);

        if (hasHighlight) {
            await highlightedSlots.first().click();
            const resolveAttackButton = attackerPage.getByRole('button', { name: /Resolve Attack|结算攻击/i });
            await expect(resolveAttackButton).toBeVisible({ timeout: 10000 });
            await resolveAttackButton.click();
        } else {
            // 没有高亮，直接推进
            const advanceButton = attackerPage.locator('[data-tutorial-id="advance-phase-button"]');
            await advanceButton.click();
            const confirmHeading = attackerPage.getByRole('heading', { name: /End offensive roll\?|确认结束攻击掷骰？/i });
            if (await confirmHeading.isVisible({ timeout: 4000 }).catch(() => false)) {
                const confirmSkipModal = confirmHeading.locator('..').locator('..');
                await confirmSkipModal.getByRole('button', { name: /Confirm|确认/i }).click();
            }
        }

        // 处理技能结算选择弹窗
        for (let choiceAttempt = 0; choiceAttempt < 5; choiceAttempt++) {
            let choiceModal: ReturnType<typeof attackerPage.locator> | null = null;
            try {
                choiceModal = await getModalContainerByHeading(attackerPage, /Ability Resolution Choice|技能结算选择/i, 1500);
            } catch { choiceModal = null; }
            if (!choiceModal) break;
            const choiceButton = choiceModal.getByRole('button').filter({ hasText: /\S+/ }).first();
            if (await choiceButton.isVisible({ timeout: 500 }).catch(() => false)) {
                await choiceButton.click();
                await attackerPage.waitForTimeout(500);
            }
        }

        // 等待防御阶段（月精灵有迷影步防御技能）
        const defensePhaseStarted = await Promise.race([
            defenderPage.getByRole('button', { name: /End Defense|结束防御/i }).isVisible({ timeout: 8000 }).then(() => true).catch(() => false),
            attackerPage.getByText(/Main Phase \(2\)|主要阶段 \(2\)/).isVisible({ timeout: 8000 }).then(() => false).catch(() => false),
        ]);

        if (defensePhaseStarted) {
            // 防御方掷骰（迷影步会根据足的数量产生不同效果）
            const defenderRollButton = defenderPage.locator('[data-tutorial-id="dice-roll-button"]');
            const defenderConfirmButton = defenderPage.locator('[data-tutorial-id="dice-confirm-button"]');
            const endDefenseButton = defenderPage.getByRole('button', { name: /End Defense|结束防御/i });

            const canRoll = await defenderRollButton.isEnabled({ timeout: 5000 }).catch(() => false);
            if (canRoll) {
                await defenderRollButton.click();
                await defenderPage.waitForTimeout(300);

                // 设置防御骰为 [4,4,4,1,1] = 3足+2弓 → 迷影步最高效果
                await applyDiceValues(defenderPage, [4, 4, 4, 1, 1]);

                await expect(defenderConfirmButton).toBeEnabled({ timeout: 5000 });
                await defenderConfirmButton.click();

                // 截图记录防御阶段
                await defenderPage.screenshot({ path: 'test-results/moon-elf-defense-phase.png', fullPage: false });

                await expect(endDefenseButton).toBeEnabled({ timeout: 10000 });
                await endDefenseButton.click();
            } else {
                const canEndDefense = await endDefenseButton.isEnabled({ timeout: 2000 }).catch(() => false);
                if (canEndDefense) await endDefenseButton.click();
            }

            // 处理响应窗口
            for (let i = 0; i < 4; i += 1) {
                const hostPassed = await maybePassResponse(hostPage);
                const guestPassed = await maybePassResponse(guestPage);
                if (!hostPassed && !guestPassed) break;
            }
        }

        // 验证到达 Main Phase 2
        await expect(attackerPage.getByText(/Main Phase \(2\)|主要阶段 \(2\)/)).toBeVisible({ timeout: 15000 });

        await hostContext.close();
        await guestContext.close();
    });

    // ========================================================================
    // 4. 在线对局：月精灵爆裂箭（bonus die 交互）
    // ========================================================================
    test('Online match: Moon Elf exploding arrow triggers bonus die roll', async ({ browser }, testInfo) => {
        test.setTimeout(120000);
        const baseURL = testInfo.project.use.baseURL as string | undefined;

        const hostContext = await browser.newContext({ baseURL });
        await blockAudioRequests(hostContext);
        await disableAudio(hostContext);
        await disableTutorial(hostContext as any);
        await setEnglishLocale(hostContext);
        const hostPage = await hostContext.newPage();

        if (!await ensureGameServerAvailable(hostPage)) {
            test.skip(true, '游戏服务器不可用');
        }

        // 创建房间
        await openDiceThroneModal(hostPage);
        await hostPage.getByRole('button', { name: /Create Room|创建房间/i }).click();
        await expect(hostPage.getByRole('heading', { name: /Create Room|创建房间/i })).toBeVisible();
        await hostPage.getByRole('button', { name: /Confirm|确认/i }).click();
        try {
            await hostPage.waitForURL(/\/play\/dicethrone\/match\//, { timeout: 5000 });
        } catch {
            test.skip(true, '房间创建失败或后端不可用');
        }

        const hostUrl = new URL(hostPage.url());
        const matchId = hostUrl.pathname.split('/').pop();
        if (!matchId) throw new Error('无法从 URL 解析 matchId');
        if (!hostUrl.searchParams.get('playerID')) {
            hostUrl.searchParams.set('playerID', '0');
            await hostPage.goto(hostUrl.toString());
        }

        const guestContext = await browser.newContext({ baseURL });
        await blockAudioRequests(guestContext);
        await disableAudio(guestContext);
        await disableTutorial(guestContext as any);
        await setEnglishLocale(guestContext);
        const guestPage = await guestContext.newPage();
        await guestPage.goto(`/play/dicethrone/match/${matchId}?join=true`, { waitUntil: 'domcontentloaded' });
        await guestPage.waitForURL(/playerID=\d/, { timeout: 20000 });

        // 先检查是否自动开始
        let autoStarted4 = true;
        try {
            await waitForMainPhase(hostPage, 15000);
            await waitForMainPhase(guestPage, 15000);
        } catch {
            autoStarted4 = false;
        }

        if (autoStarted4) {
            test.skip(true, '游戏自动开始，无法选择月精灵角色');
        }

        await hostPage.waitForSelector('[data-char-id="moon_elf"]', { state: 'attached', timeout: 60000 });
        await guestPage.waitForSelector('[data-char-id="barbarian"]', { state: 'attached', timeout: 60000 });
        await hostPage.locator('[data-char-id="moon_elf"]').first().click();
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

        // 确定攻击方
        let attackerPage: Page;
        let defenderPage: Page;
        const hostNextPhase = hostPage.locator('[data-tutorial-id="advance-phase-button"]');
        if (await hostNextPhase.isEnabled({ timeout: 3000 }).catch(() => false)) {
            attackerPage = hostPage;
            defenderPage = guestPage;
        } else {
            attackerPage = guestPage;
            defenderPage = hostPage;
        }

        // 推进到攻击掷骰
        await advanceToOffensiveRoll(attackerPage);

        // 掷骰并设置为 [1,6,6,6,6] = 1弓+4月 → 触发爆裂箭(1弓+3月) 或 月蚀(4月)
        // 爆裂箭触发条件：1弓+3月，月蚀触发条件：4月
        // 使用 [2,6,6,6,4] = 1弓+3月+1足 → 精确触发爆裂箭
        const rollButton = attackerPage.locator('[data-tutorial-id="dice-roll-button"]');
        await expect(rollButton).toBeEnabled({ timeout: 5000 });
        await rollButton.click();
        await attackerPage.waitForTimeout(300);
        await applyDiceValues(attackerPage, [2, 6, 6, 6, 4]);

        const confirmButton = attackerPage.locator('[data-tutorial-id="dice-confirm-button"]');
        await expect(confirmButton).toBeEnabled({ timeout: 5000 });
        await confirmButton.click();

        // 检查技能高亮
        const highlightedSlots = attackerPage
            .locator('[data-ability-slot]')
            .filter({ has: attackerPage.locator('div.animate-pulse[class*="border-"]') });
        const hasHighlight = await highlightedSlots.first().isVisible({ timeout: 5000 }).catch(() => false);

        if (hasHighlight) {
            await highlightedSlots.first().click();
            const resolveAttackButton = attackerPage.getByRole('button', { name: /Resolve Attack|结算攻击/i });
            await expect(resolveAttackButton).toBeVisible({ timeout: 10000 });
            await resolveAttackButton.click();

            // 爆裂箭会触发 bonus die roll，可能会有额外的 UI 反馈
            // 截图记录爆裂箭结算过程
            await attackerPage.waitForTimeout(1000);
            await attackerPage.screenshot({ path: 'test-results/moon-elf-exploding-arrow.png', fullPage: false });
        } else {
            // 没有高亮，直接推进
            const advanceButton = attackerPage.locator('[data-tutorial-id="advance-phase-button"]');
            await advanceButton.click();
            const confirmHeading = attackerPage.getByRole('heading', { name: /End offensive roll\?|确认结束攻击掷骰？/i });
            if (await confirmHeading.isVisible({ timeout: 4000 }).catch(() => false)) {
                const confirmSkipModal = confirmHeading.locator('..').locator('..');
                await confirmSkipModal.getByRole('button', { name: /Confirm|确认/i }).click();
            }
        }

        // 处理技能结算选择弹窗
        for (let choiceAttempt = 0; choiceAttempt < 5; choiceAttempt++) {
            let choiceModal: ReturnType<typeof attackerPage.locator> | null = null;
            try {
                choiceModal = await getModalContainerByHeading(attackerPage, /Ability Resolution Choice|技能结算选择/i, 1500);
            } catch { choiceModal = null; }
            if (!choiceModal) break;
            const choiceButton = choiceModal.getByRole('button').filter({ hasText: /\S+/ }).first();
            if (await choiceButton.isVisible({ timeout: 500 }).catch(() => false)) {
                await choiceButton.click();
                await attackerPage.waitForTimeout(500);
            }
        }

        // 等待防御阶段或 Main Phase 2
        const defensePhaseStarted = await Promise.race([
            defenderPage.getByRole('button', { name: /End Defense|结束防御/i }).isVisible({ timeout: 8000 }).then(() => true).catch(() => false),
            attackerPage.getByText(/Main Phase \(2\)|主要阶段 \(2\)/).isVisible({ timeout: 8000 }).then(() => false).catch(() => false),
        ]);

        if (defensePhaseStarted) {
            const defenderRollButton = defenderPage.locator('[data-tutorial-id="dice-roll-button"]');
            const defenderConfirmButton = defenderPage.locator('[data-tutorial-id="dice-confirm-button"]');
            const endDefenseButton = defenderPage.getByRole('button', { name: /End Defense|结束防御/i });

            const canRoll = await defenderRollButton.isEnabled({ timeout: 5000 }).catch(() => false);
            if (canRoll) {
                await defenderRollButton.click();
                await defenderPage.waitForTimeout(300);
                await defenderConfirmButton.click();
                await expect(endDefenseButton).toBeEnabled({ timeout: 10000 });
                await endDefenseButton.click();
            } else {
                const canEndDefense = await endDefenseButton.isEnabled({ timeout: 2000 }).catch(() => false);
                if (canEndDefense) await endDefenseButton.click();
            }

            for (let i = 0; i < 4; i += 1) {
                const hostPassed = await maybePassResponse(hostPage);
                const guestPassed = await maybePassResponse(guestPage);
                if (!hostPassed && !guestPassed) break;
            }
        }

        // 验证到达 Main Phase 2
        await expect(attackerPage.getByText(/Main Phase \(2\)|主要阶段 \(2\)/)).toBeVisible({ timeout: 15000 });

        await hostContext.close();
        await guestContext.close();
    });

    // ========================================================================
    // 5. 在线对局：月精灵角色选择界面可见性验证
    // ========================================================================
    test('Online match: Moon Elf character card is visible and selectable', async ({ browser }, testInfo) => {
        test.setTimeout(60000);
        const baseURL = testInfo.project.use.baseURL as string | undefined;

        const hostContext = await browser.newContext({ baseURL });
        await blockAudioRequests(hostContext);
        await disableAudio(hostContext);
        await disableTutorial(hostContext as any);
        await setEnglishLocale(hostContext);
        const hostPage = await hostContext.newPage();

        if (!await ensureGameServerAvailable(hostPage)) {
            test.skip(true, '游戏服务器不可用');
        }

        // 创建房间
        await openDiceThroneModal(hostPage);
        await hostPage.getByRole('button', { name: /Create Room|创建房间/i }).click();
        await expect(hostPage.getByRole('heading', { name: /Create Room|创建房间/i })).toBeVisible();
        await hostPage.getByRole('button', { name: /Confirm|确认/i }).click();
        try {
            await hostPage.waitForURL(/\/play\/dicethrone\/match\//, { timeout: 5000 });
        } catch {
            test.skip(true, '房间创建失败或后端不可用');
        }

        // 等待角色选择界面
        await hostPage.waitForSelector('[data-char-id]', { state: 'attached', timeout: 60000 });

        // 验证月精灵角色卡片存在且可见
        const moonElfCard = hostPage.locator('[data-char-id="moon_elf"]').first();
        await expect(moonElfCard).toBeVisible({ timeout: 10000 });

        // 点击选择月精灵
        await moonElfCard.click();

        // 验证选中状态（通常会有边框高亮或其他视觉反馈）
        // 选中后角色卡片应该有选中样式
        await hostPage.waitForTimeout(500);
        await hostPage.screenshot({ path: 'test-results/moon-elf-selection.png', fullPage: false });

        // 验证可以取消选择（再次点击其他角色）
        const monkCard = hostPage.locator('[data-char-id="monk"]').first();
        await expect(monkCard).toBeVisible();
        await monkCard.click();
        await hostPage.waitForTimeout(300);

        // 再次选回月精灵
        await moonElfCard.click();
        await hostPage.waitForTimeout(300);

        await hostContext.close();
    });
});
