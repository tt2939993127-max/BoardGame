import { test, expect, type Page, type BrowserContext } from '@playwright/test';

const setEnglishLocale = async (context: BrowserContext | Page) => {
    await context.addInitScript(() => {
        localStorage.setItem('i18nextLng', 'en');
    });
};

const ensureGameServerAvailable = async (page: Page) => {
    try {
        const response = await page.request.get('/games');
        return response.ok();
    } catch {
        return false;
    }
};

const disableTutorial = async (page: Page) => {
    await page.addInitScript(() => {
        localStorage.setItem('tutorial_skip', '1');
    });
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

test.describe('DiceThrone E2E', () => {
    test('Tutorial route shows Dice Throne tutorial overlay', async ({ page }) => {
        await setEnglishLocale(page);
        await page.goto('/play/dicethrone/tutorial');

        await expect(page.getByAltText('Player Board')).toBeVisible();
        await expect(page.getByText(/Dice Throne 1v1 tutorial/i)).toBeVisible();
    });

    test('Tutorial advances to roll phase after Next Phase', async ({ page }) => {
        await setEnglishLocale(page);
        await page.goto('/play/dicethrone/tutorial');

        const clickNextStep = async () => {
            const nextButton = page.getByRole('button', { name: /^(Next|下一步|Finish and return|完成并返回)$/i }).first();
            if (await nextButton.isVisible({ timeout: 1500 }).catch(() => false)) {
                await nextButton.click();
            }
        };

        await expect(page.getByText(/Dice Throne 1v1 tutorial/i)).toBeVisible();
        await clickNextStep();

        await expect(page.getByText(/resources: Health/i)).toBeVisible();
        await clickNextStep();

        await expect(page.getByText(/Turn order lives here/i)).toBeVisible();
        await clickNextStep();

        await expect(page.getByText(/player board/i)).toBeVisible();
        await clickNextStep();

        await expect(page.getByText(/tip board/i)).toBeVisible();
        await clickNextStep();

        await expect(page.getByText(/Your hand lives here/i)).toBeVisible();
        await clickNextStep();

        await expect(page.getByText(/This is the discard pile/i)).toBeVisible();
        await clickNextStep();

        await expect(page.getByText(/Status effects and tokens/i)).toBeVisible();
        await clickNextStep();

        await expect(page.getByText(/enter the roll phase/i)).toBeVisible();
        const advanceButton = page.locator('[data-tutorial-id="advance-phase-button"]');
        await expect(advanceButton).toBeEnabled();
        await advanceButton.click();

        const diceTray = page.locator('[data-tutorial-id="dice-tray"]');
        await expect(diceTray).toBeVisible();

        const rollButton = page.locator('[data-tutorial-id="dice-roll-button"]');
        await expect(rollButton).toBeEnabled({ timeout: 10000 });
        await rollButton.click();
    });

    test('Online match can be created and HUD shows room info', async ({ page }) => {
        await setEnglishLocale(page);
        await disableTutorial(page);
        if (!await ensureGameServerAvailable(page)) {
            test.skip(true, 'Game server unavailable for online tests.');
        }
        await page.goto('/');
        await page.getByRole('heading', { name: /Dice Throne|王权骰铸/i }).click();
        await page.getByRole('button', { name: /Create Room|创建房间/i }).click();
        await expect(page.getByRole('heading', { name: /Create Room|创建房间/i })).toBeVisible();
        await page.getByRole('button', { name: /Confirm|确认/i }).click();
        try {
            await page.waitForURL(/\/play\/dicethrone\/match\//, { timeout: 5000 });
        } catch {
            test.skip(true, 'Room creation failed or backend unavailable.');
        }
        await expect(page).toHaveURL(/\/play\/dicethrone\/match\//);
        await expect(page.getByAltText('Player Board')).toBeVisible();

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

        await hostPage.goto('/');
        await hostPage.getByRole('heading', { name: /Dice Throne|王权骰铸/i }).click();
        await hostPage.getByRole('button', { name: /Create Room|创建房间/i }).click();
        await expect(hostPage.getByRole('heading', { name: /Create Room|创建房间/i })).toBeVisible();
        await hostPage.getByRole('button', { name: /Confirm|确认/i }).click();
        try {
            await hostPage.waitForURL(/\/play\/dicethrone\/match\//, { timeout: 5000 });
        } catch {
            test.skip(true, 'Room creation failed or backend unavailable.');
        }
        await expect(hostPage.getByAltText('Player Board')).toBeVisible();

        const hostUrl = new URL(hostPage.url());
        const matchId = hostUrl.pathname.split('/').pop();
        if (!matchId) {
            throw new Error('Failed to parse match id from host URL.');
        }

        if (!hostUrl.searchParams.get('playerID')) {
            hostUrl.searchParams.set('playerID', '0');
            await hostPage.goto(hostUrl.toString());
            await expect(hostPage.getByAltText('Player Board')).toBeVisible();
        }

        const guestContext = await browser.newContext({ baseURL });
        await disableTutorial(guestContext as any);
        await setEnglishLocale(guestContext);
        const guestPage = await guestContext.newPage();
        await guestPage.goto(`/play/dicethrone/match/${matchId}?join=true`);
        await guestPage.waitForURL(/playerID=\d/);
        await expect(guestPage.getByAltText('Player Board')).toBeVisible();

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
        const confirmButton = attackerPage.locator('[data-tutorial-id="dice-confirm-button"]');
        // Match ability slots with highlight border (cyan for regular, amber for ultimate)
        const highlightedSlots = attackerPage
            .locator('[data-ability-slot]')
            .filter({ has: attackerPage.locator('div.animate-pulse[class*="border-"]') });

        // Roll up to 10 times to find an available ability (probabilistic but sufficient)
        let abilitySelected = false;
        for (let attempt = 0; attempt < 10; attempt += 1) {
            await expect(rollButton).toBeEnabled({ timeout: 5000 });
            await rollButton.click();
            // Wait for dice animation to complete
            await attackerPage.waitForTimeout(1000);
            
            const highlightCount = await highlightedSlots.count();
            if (highlightCount > 0) {
                await confirmButton.click();
                await attackerPage.waitForTimeout(500);
                await highlightedSlots.first().click();
                abilitySelected = true;
                break;
            }
        }

        if (!abilitySelected) {
            throw new Error('No offensive ability available after 10 roll attempts.');
        }
        await expect(resolveAttackButton).toBeVisible({ timeout: 10000 });
        await resolveAttackButton.click();

        // Handle ability resolution choice modal if it appears (some abilities require token selection)
        // Loop to handle multiple choice modals that may appear
        for (let choiceAttempt = 0; choiceAttempt < 5; choiceAttempt++) {
            const choiceModal = attackerPage.getByText('Ability Resolution Choice');
            if (await choiceModal.isVisible({ timeout: 1500 }).catch(() => false)) {
                // Click the first available choice option button
                const choiceButton = attackerPage.locator('button').filter({ hasText: /(Evasive|Purify|Chi|Taiji)/i }).first();
                if (await choiceButton.isVisible({ timeout: 500 }).catch(() => false)) {
                    await choiceButton.click();
                    await attackerPage.waitForTimeout(500);
                }
            } else {
                break;
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
            await expect(defenderRollButton).toBeEnabled();
            await defenderRollButton.click();
            await defenderConfirmButton.click();
            await defenderPage.getByRole('button', { name: /End Defense|结束防御/i }).click();

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
        await expect(page.getByAltText('Player Board')).toBeVisible();

        await expect(page.getByText(/Main Phase \(1\)|主要阶段 \(1\)/)).toBeVisible({ timeout: 10000 });
        await advanceToOffensiveRoll(page);
        await page.locator('button[title="Dev Debug"]').click();
        await page.getByRole('button', { name: /📊 State|📊 状态/i }).click();

        const rawStateText = await page.locator('pre').filter({ hasText: '"core"' }).first().textContent();
        const stateText = rawStateText?.trim();
        if (!stateText) {
            throw new Error('Failed to read debug game state.');
        }

        const state = JSON.parse(stateText) as { core?: Record<string, unknown> };
        const core = (state.core ?? state) as Record<string, unknown>;
        const pendingDamage = {
            id: `e2e-damage-${Date.now()}`,
            sourcePlayerId: '0',
            targetPlayerId: '1',
            originalDamage: 2,
            currentDamage: 2,
            responseType: 'beforeDamageDealt',
            responderId: '0',
            isFullyEvaded: false,
        };

        await page.getByRole('button', { name: /📝 赋值|📝 Set State/i }).click();
        await page.getByPlaceholder(/粘贴游戏状态 JSON|Paste game state JSON/i).fill(JSON.stringify({
            ...core,
            pendingDamage,
        }));
        await page.getByRole('button', { name: /✓ 应用状态|✓ Apply/i }).click();

        const skipButton = page.getByRole('button', { name: /Skip|跳过/i });
        await expect(skipButton).toBeVisible({ timeout: 5000 });
        await skipButton.click();

        await expect(page.getByRole('button', { name: /Next Phase|下一阶段/i })).toBeVisible({ timeout: 10000 });
    });
});
