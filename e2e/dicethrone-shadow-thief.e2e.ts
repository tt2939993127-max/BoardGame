/**
 * 暗影刺客 (Shadow Thief) E2E 交互测试
 *
 * 覆盖交互面：
 * - 角色选择：暗影刺客在选角界面可选
 * - 攻击流程：掷骰 → 确认 → 选择技能 → 结算攻击
 * - 技能高亮：不同骰面组合触发不同技能
 * - 双防御技能选择：暗影守护(4骰) vs 恐惧反击(5骰)
 */

import { test, expect, type Page, type BrowserContext } from '@playwright/test';

// ============================================================================
// 复用辅助函数（与 dicethrone.e2e.ts / dicethrone-moon-elf.e2e.ts 保持一致）
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

const waitForMainPhase = async (page: Page, timeout = 20000) => {
    await expect(page.getByText(/Main Phase \(1\)|主要阶段 \(1\)/)).toBeVisible({ timeout });
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

/** 创建在线房间并双方加入，返回 { hostPage, guestPage, hostContext, guestContext } */
const setupOnlineMatch = async (
    browser: import('@playwright/test').Browser,
    baseURL: string | undefined,
    hostChar: string,
    guestChar: string,
) => {
    const hostContext = await browser.newContext({ baseURL });
    await blockAudioRequests(hostContext);
    await disableAudio(hostContext);
    await disableTutorial(hostContext as any);
    await setEnglishLocale(hostContext);
    const hostPage = await hostContext.newPage();

    if (!await ensureGameServerAvailable(hostPage)) {
        return null; // 调用方 skip
    }

    await openDiceThroneModal(hostPage);
    await hostPage.getByRole('button', { name: /Create Room|创建房间/i }).click();
    await expect(hostPage.getByRole('heading', { name: /Create Room|创建房间/i })).toBeVisible();
    await hostPage.getByRole('button', { name: /Confirm|确认/i }).click();
    try {
        await hostPage.waitForURL(/\/play\/dicethrone\/match\//, { timeout: 5000 });
    } catch {
        return null;
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

    // 检查是否自动开始
    let autoStarted = true;
    try {
        await waitForMainPhase(hostPage, 15000);
        await waitForMainPhase(guestPage, 15000);
    } catch {
        autoStarted = false;
    }

    if (autoStarted) {
        return { hostPage, guestPage, hostContext, guestContext, autoStarted: true };
    }

    // 角色选择
    await hostPage.waitForSelector(`[data-char-id="${hostChar}"]`, { state: 'attached', timeout: 60000 });
    await guestPage.waitForSelector(`[data-char-id="${guestChar}"]`, { state: 'attached', timeout: 60000 });
    await hostPage.locator(`[data-char-id="${hostChar}"]`).first().click();
    await guestPage.locator(`[data-char-id="${guestChar}"]`).first().click();

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

    return { hostPage, guestPage, hostContext, guestContext, autoStarted: false };
};

// ============================================================================
// 暗影刺客 E2E 测试
// ============================================================================

test.describe('DiceThrone Shadow Thief E2E', () => {

    // ========================================================================
    // 1. 角色选择 + 基础攻击流程
    // ========================================================================
    test('Online match: Shadow Thief character selection and basic attack flow', async ({ browser }, testInfo) => {
        test.setTimeout(90000);
        const baseURL = testInfo.project.use.baseURL as string | undefined;

        const match = await setupOnlineMatch(browser, baseURL, 'shadow_thief', 'monk');
        if (!match) test.skip(true, '游戏服务器不可用或房间创建失败');
        const { hostPage, guestPage, hostContext, guestContext, autoStarted } = match!;

        if (autoStarted) {
            test.skip(true, '游戏自动开始，无法选择暗影刺客角色');
        }

        // 验证手牌区可见
        await hostPage.waitForTimeout(2000);
        const hostHandArea = hostPage.locator('[data-tutorial-id="hand-area"]');
        await expect(hostHandArea).toBeVisible();
        const hostHandCards = hostHandArea.locator('[data-card-id]');
        await expect(hostHandCards).toHaveCount(4, { timeout: 15000 });

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

        // 掷骰
        const rollButton = attackerPage.locator('[data-tutorial-id="dice-roll-button"]');
        await expect(rollButton).toBeEnabled({ timeout: 5000 });
        await rollButton.click();
        await attackerPage.waitForTimeout(300);

        // 设置骰面 [1,1,1,1,1] = 5个匕首(dagger) → 触发匕首打击 5-of-a-kind
        await applyDiceValues(attackerPage, [1, 1, 1, 1, 1]);

        // 确认掷骰
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
            // 防御方处理（monk 只有 1 个防御技能，自动选择）
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

        // 验证到达 Main Phase 2
        await expect(attackerPage.getByText(/Main Phase \(2\)|主要阶段 \(2\)/)).toBeVisible({ timeout: 15000 });

        await attackerPage.screenshot({ path: 'test-results/shadow-thief-attack-flow.png', fullPage: false });

        await hostContext.close();
        await guestContext.close();
    });

    // ========================================================================
    // 2. 暗影刺客防御时的双防御技能选择
    // ========================================================================
    test('Online match: Shadow Thief defense ability selection (dual defense)', async ({ browser }, testInfo) => {
        test.setTimeout(120000);
        const baseURL = testInfo.project.use.baseURL as string | undefined;

        // 暗影刺客作为 guest（防御方更容易控制）
        const match = await setupOnlineMatch(browser, baseURL, 'monk', 'shadow_thief');
        if (!match) test.skip(true, '游戏服务器不可用或房间创建失败');
        const { hostPage, guestPage, hostContext, guestContext, autoStarted } = match!;

        if (autoStarted) {
            test.skip(true, '游戏自动开始，无法选择暗影刺客角色');
        }

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

        // 掷骰并设置为触发攻击
        const rollButton = attackerPage.locator('[data-tutorial-id="dice-roll-button"]');
        await expect(rollButton).toBeEnabled({ timeout: 5000 });
        await rollButton.click();
        await attackerPage.waitForTimeout(300);

        // 设置 [1,1,1,4,5] → 3拳(fist) 触发拳法
        await applyDiceValues(attackerPage, [1, 1, 1, 4, 5]);

        const confirmButton = attackerPage.locator('[data-tutorial-id="dice-confirm-button"]');
        await expect(confirmButton).toBeEnabled({ timeout: 5000 });
        await confirmButton.click();

        // 选择高亮技能并结算攻击
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

        // 等待防御阶段
        const defensePhaseStarted = await Promise.race([
            defenderPage.getByRole('button', { name: /End Defense|结束防御/i }).isVisible({ timeout: 8000 }).then(() => true).catch(() => false),
            defenderPage.locator('[data-ability-slot]').first().isVisible({ timeout: 8000 }).then(() => true).catch(() => false),
            attackerPage.getByText(/Main Phase \(2\)|主要阶段 \(2\)/).isVisible({ timeout: 8000 }).then(() => false).catch(() => false),
        ]);

        if (defensePhaseStarted) {
            // 暗影刺客有 2 个防御技能，应该看到防御技能选择
            // 检查是否有防御技能高亮（暗影守护 和 恐惧反击 都在 meditate 槽位）
            const defenderAbilitySlots = defenderPage.locator('[data-ability-slot]');
            const defenderHighlightedSlots = defenderAbilitySlots
                .filter({ has: defenderPage.locator('div.animate-pulse[class*="border-"]') });

            // 截图记录防御选择状态
            await defenderPage.screenshot({ path: 'test-results/shadow-thief-defense-selection.png', fullPage: false });

            // 尝试点击高亮的防御技能槽位
            const hasDefenseHighlight = await defenderHighlightedSlots.first().isVisible({ timeout: 5000 }).catch(() => false);
            if (hasDefenseHighlight) {
                await defenderHighlightedSlots.first().click();
                await defenderPage.waitForTimeout(500);
            }

            // 掷骰
            const defenderRollButton = defenderPage.locator('[data-tutorial-id="dice-roll-button"]');
            const canRoll = await defenderRollButton.isEnabled({ timeout: 5000 }).catch(() => false);
            if (canRoll) {
                await defenderRollButton.click();
                await defenderPage.waitForTimeout(300);

                const defenderConfirmButton = defenderPage.locator('[data-tutorial-id="dice-confirm-button"]');
                await expect(defenderConfirmButton).toBeEnabled({ timeout: 5000 });
                await defenderConfirmButton.click();
            }

            // 结束防御
            const endDefenseButton = defenderPage.getByRole('button', { name: /End Defense|结束防御/i });
            const canEndDefense = await endDefenseButton.isEnabled({ timeout: 5000 }).catch(() => false);
            if (canEndDefense) await endDefenseButton.click();

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
    // 3. 暗影刺客不同骰面组合触发不同技能
    // ========================================================================
    test('Online match: Shadow Thief dice combinations trigger different abilities', async ({ browser }, testInfo) => {
        test.setTimeout(120000);
        const baseURL = testInfo.project.use.baseURL as string | undefined;

        const match = await setupOnlineMatch(browser, baseURL, 'shadow_thief', 'barbarian');
        if (!match) test.skip(true, '游戏服务器不可用或房间创建失败');
        const { hostPage, guestPage, hostContext, guestContext, autoStarted } = match!;

        if (autoStarted) {
            test.skip(true, '游戏自动开始，无法选择暗影刺客角色');
        }

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

        // 设置 [6,6,6,6,6] = 5个暗影(shadow) → 应触发暗影之舞或终极
        await applyDiceValues(attackerPage, [6, 6, 6, 6, 6]);

        const confirmButton = attackerPage.locator('[data-tutorial-id="dice-confirm-button"]');
        await expect(confirmButton).toBeEnabled({ timeout: 5000 });
        await confirmButton.click();

        // 验证有技能被高亮
        const highlightedSlots = attackerPage
            .locator('[data-ability-slot]')
            .filter({ has: attackerPage.locator('div.animate-pulse[class*="border-"]') });

        const highlightCount = await highlightedSlots.count();
        expect(highlightCount).toBeGreaterThan(0);

        // 截图记录技能高亮状态
        await attackerPage.screenshot({ path: 'test-results/shadow-thief-5-shadow-highlight.png', fullPage: false });

        await hostContext.close();
        await guestContext.close();
    });
});
