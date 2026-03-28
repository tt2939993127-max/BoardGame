import { test, expect } from './framework';

test.describe('DiceThrone - Status Interaction Cancel Button', () => {
    test('取消应关闭交互且不改状态', async ({ page, game }) => {
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
                selectedCharacters: { '0': 'barbarian', '1': 'moon_elf' },
                hostStarted: true,
            },
        });

        await page.evaluate(() => {
            const harness = (window as any).__BG_TEST_HARNESS__;
            const state = harness?.state?.get?.();
            if (!state) {
                throw new Error('State not available');
            }

            harness.state.patch({
                core: {
                    ...state.core,
                    players: {
                        ...state.core.players,
                        '0': {
                            ...state.core.players['0'],
                            statusEffects: { poison: 2, burn: 1 },
                        },
                    },
                },
                sys: {
                    ...state.sys,
                    interaction: {
                        ...state.sys.interaction,
                        current: {
                            id: 'test-select-status-cancel',
                            kind: 'selectStatus',
                            playerId: '0',
                            titleKey: 'interaction.selectStatusToRemove',
                            selectCount: 1,
                            targetPlayerIds: ['0'],
                            selected: [],
                        },
                    },
                },
            });
        });

        await page.waitForFunction(
            () => {
                const state = (window as any).__BG_TEST_HARNESS__?.state?.get?.();
                return state?.sys?.interaction?.current?.kind === 'selectStatus'
                    && state?.core?.players?.['0']?.statusEffects?.poison === 2
                    && state?.core?.players?.['0']?.statusEffects?.burn === 1;
            },
            { timeout: 5000, polling: 200 },
        );

        const statusBadge = page
            .locator('[data-testid="status-badge-poison"]')
            .or(page.locator('[data-status-id="poison"]'))
            .first();
        await expect(statusBadge).toBeVisible({ timeout: 5000 });

        const cancelButton = page.locator('button').filter({ hasText: /取消|Cancel/i }).first();
        const confirmButton = page.locator('button').filter({ hasText: /确认|Confirm/i }).first();

        await expect(cancelButton).toBeVisible();
        await expect(cancelButton).toBeEnabled();
        await expect(confirmButton).toBeVisible();
        await expect(confirmButton).toBeDisabled();

        await statusBadge.click();
        await expect(confirmButton).toBeEnabled();

        await cancelButton.click();

        await page.waitForFunction(
            () => {
                const state = (window as any).__BG_TEST_HARNESS__?.state?.get?.();
                return !state?.sys?.interaction?.current;
            },
            { timeout: 5000, polling: 200 },
        );

        const finalState = await page.evaluate(() => {
            const state = (window as any).__BG_TEST_HARNESS__?.state?.get?.();
            return state?.core?.players?.['0']?.statusEffects ?? {};
        });

        expect(finalState.poison ?? 0).toBe(2);
        expect(finalState.burn ?? 0).toBe(1);
    });
});
