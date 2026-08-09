import { test, expect } from '../framework';
import { clearEvidenceScreenshotsForTest, getEvidenceScreenshotPath, withJpegEvidenceScreenshotOptions } from '../framework/evidenceScreenshots';

test.describe('DiceThrone 调试面板', () => {
    test('状态页会反映注入后的生命值变更', async ({ page, game }) => {
        await game.openTestGame('dicethrone');

        await game.setupScene({
            gameId: 'dicethrone',
            player0: {
                resources: { CP: 0, HP: 50 },
            },
            player1: {
                resources: { HP: 50 },
            },
            currentPlayer: '0',
            phase: 'main1',
            extra: {
                selectedCharacters: { '0': 'barbarian', '1': 'paladin' },
                hostStarted: true,
            },
        });

        await page.getByTestId('debug-toggle').click();
        await expect(page.getByTestId('debug-panel')).toBeVisible({ timeout: 5000 });

        const stateTab = page.getByTestId('debug-tab-state');
        if (await stateTab.isVisible().catch(() => false)) {
            await stateTab.click();
        }

        await page.waitForFunction(
            () => {
                const raw = document.querySelector('[data-testid="debug-state-json"]')?.textContent;
                if (!raw) return false;
                try {
                    const parsed = JSON.parse(raw);
                    const core = parsed?.core ?? parsed?.G?.core ?? parsed;
                    const hp = core?.players?.['0']?.resources?.HP ?? core?.players?.['0']?.resources?.hp;
                    return hp === 50;
                } catch {
                    return false;
                }
            },
            { timeout: 5000, polling: 200 },
        );

        await page.evaluate(() => {
            (window as any).__BG_TEST_HARNESS__?.state?.patch?.({
                core: {
                    players: {
                        '0': {
                            resources: { HP: 10 },
                        },
                    },
                },
            });
        });

        await page.waitForFunction(
            () => {
                const raw = document.querySelector('[data-testid="debug-state-json"]')?.textContent;
                if (!raw) return false;
                try {
                    const parsed = JSON.parse(raw);
                    const core = parsed?.core ?? parsed?.G?.core ?? parsed;
                    const hp = core?.players?.['0']?.resources?.HP ?? core?.players?.['0']?.resources?.hp;
                    return hp === 10;
                } catch {
                    return false;
                }
            },
            { timeout: 5000, polling: 200 },
        );

        const rawState = await page.getByTestId('debug-state-json').innerText();
        const parsed = JSON.parse(rawState);
        const core = parsed?.core ?? parsed?.G?.core ?? parsed;
        const hp = core?.players?.['0']?.resources?.HP ?? core?.players?.['0']?.resources?.hp;

        expect(hp).toBe(10);
    });

    test('调试改骰会立即更新当前骰区和玩家骰盘，不生成覆盖恢复按钮', async ({ page, game }, testInfo) => {
        await clearEvidenceScreenshotsForTest(testInfo);
        await game.openTestGame('dicethrone');

        await game.setupScene({
            gameId: 'dicethrone',
            player0: {
                resources: { CP: 0, HP: 50 },
            },
            player1: {
                resources: { HP: 50 },
            },
            currentPlayer: '0',
            phase: 'offensiveRoll',
            extra: {
                selectedCharacters: { '0': 'barbarian', '1': 'paladin' },
                hostStarted: true,
            },
        });

        await page.evaluate(() => {
            const dice = [1, 2, 3, 4, 5].map((value, id) => ({
                id,
                definitionId: 'barbarian-dice',
                value,
                symbol: null,
                symbols: [],
                isKept: false,
                ownerId: '0',
            }));
            (window as any).__BG_TEST_HARNESS__?.state?.patch?.({
                core: {
                    dice,
                    rollCount: 1,
                    rollLimit: 3,
                    rollDiceCount: 5,
                    rollConfirmed: false,
                    currentRollContext: {
                        id: 'debug-current-roll',
                        kind: 'offensive',
                        ownerPlayerId: '0',
                        phase: 'offensiveRoll',
                        dice,
                        status: 'open',
                        policy: {
                            modifiableBy: 'owner',
                            rerollableBy: 'owner',
                            allowPassiveReroll: true,
                            allowRollCards: true,
                            ultimateLocked: false,
                            blocksPhaseFlow: true,
                        },
                        settlement: { mode: 'selectAttack' },
                        display: { surface: 'diceTray', replayOnly: false },
                    },
                },
            });
        });

        await expect(page.getByTestId('die-button-0')).toHaveAttribute('data-display-value', '1', { timeout: 5000 });
        await expect(page.getByTestId('restore-covered-roll-button')).toHaveCount(0);

        await page.getByTestId('debug-toggle').click();
        const debugDice = page.getByTestId('dt-debug-dice');
        await expect(debugDice).toBeVisible({ timeout: 5000 });
        const diceInputs = debugDice.locator('input[type="number"]');
        await expect(diceInputs).toHaveCount(5);
        for (let index = 0; index < 5; index += 1) {
            await diceInputs.nth(index).fill(String(6 - index));
        }
        await page.getByTestId('dt-debug-dice-apply').click();

        await page.waitForFunction(() => {
            const state = (window as any).__BG_TEST_HARNESS__?.state?.get?.();
            return JSON.stringify(state?.core?.currentRollContext?.dice?.map((die: { value: number }) => die.value))
                === JSON.stringify([6, 5, 4, 3, 2]);
        }, { timeout: 5000 });

        const debugPath = getEvidenceScreenshotPath(testInfo, '调试面板已写入当前骰区的六五四三二', { requireChineseName: true });
        await page.screenshot(withJpegEvidenceScreenshotOptions({ path: debugPath, fullPage: false, timeout: 20000 }));

        await page.getByTestId('debug-toggle').click();
        await expect(page.getByTestId('debug-panel')).toHaveCount(0);
        await expect(page.getByTestId('die-button-0')).toHaveAttribute('data-display-value', '6');
        await expect(page.getByTestId('die-button-4')).toHaveAttribute('data-display-value', '2');
        await expect(page.getByTestId('restore-covered-roll-button')).toHaveCount(0);

        const path = getEvidenceScreenshotPath(testInfo, '调试改骰后当前骰盘显示新点数', { requireChineseName: true });
        await page.getByTestId('dicethrone-board-root').screenshot(
            withJpegEvidenceScreenshotOptions({ path, timeout: 20000 }),
        );
    });

    test('奖励骰只保留确认语义，不显示覆盖恢复或结算按钮', async ({ page, game }, testInfo) => {
        await clearEvidenceScreenshotsForTest(testInfo);
        await game.openTestGame('dicethrone');

        await game.setupScene({
            gameId: 'dicethrone',
            player0: {
                resources: { CP: 0, HP: 50 },
            },
            player1: {
                resources: { HP: 50 },
            },
            currentPlayer: '0',
            phase: 'main1',
            extra: {
                selectedCharacters: { '0': 'moon_elf', '1': 'barbarian' },
                hostStarted: true,
            },
        });

        await page.evaluate(() => {
            const bonusDice = [1, 2, 3].map((value, index) => ({
                index,
                value,
                face: value <= 3 ? 'bow' : 'foot',
                effectParams: { value },
            }));
            const dice = bonusDice.map((die) => ({
                id: die.index,
                definitionId: 'bonus:volley',
                value: die.value,
                symbol: die.face,
                symbols: [die.face],
                isKept: false,
                ownerId: '0',
                displayOnly: true,
            }));
            (window as any).__BG_TEST_HARNESS__?.state?.patch?.({
                core: {
                    pendingBonusDiceSettlement: {
                        id: 'bonus-confirm-contract',
                        sourceAbilityId: 'volley',
                        attackerId: '0',
                        targetId: '1',
                        dice: bonusDice,
                        rerollCostTokenId: 'tactical-advantage',
                        rerollCostAmount: 1,
                        rerollCount: 0,
                        maxRerollCount: 1,
                        readyToSettle: false,
                        allowDiceModification: true,
                        displayOnly: true,
                        resolutionMode: 'attackBonus',
                    },
                    currentRollContext: {
                        id: 'bonus:bonus-confirm-contract',
                        kind: 'bonus',
                        ownerPlayerId: '0',
                        targetPlayerId: '1',
                        sourceAbilityId: 'volley',
                        dice,
                        status: 'open',
                        policy: {
                            modifiableBy: 'owner',
                            rerollableBy: 'owner',
                            allowPassiveReroll: true,
                            allowRollCards: true,
                            ultimateLocked: false,
                            blocksPhaseFlow: true,
                        },
                        settlement: { mode: 'attackBonus' },
                        display: { surface: 'diceTray', replayOnly: false },
                    },
                },
            });
        });

        const confirmButton = page.getByTestId('bonus-dice-confirm-button');
        await expect(confirmButton).toBeVisible({ timeout: 5000 });
        await expect(confirmButton).toHaveText('确认奖励骰');
        await expect(page.getByText('结算奖励骰', { exact: true })).toHaveCount(0);
        await expect(page.getByTestId('restore-covered-roll-button')).toHaveCount(0);

        const path = getEvidenceScreenshotPath(testInfo, '奖励骰只显示确认按钮且没有覆盖恢复按钮', { requireChineseName: true });
        await page.getByTestId('dicethrone-board-root').screenshot(
            withJpegEvidenceScreenshotOptions({ path, timeout: 20000 }),
        );
    });
});
