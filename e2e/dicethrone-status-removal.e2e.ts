import { test, expect } from './framework';

async function readRemovalState(game: { getState: () => Promise<any> }) {
    const state = await game.getState();
    return {
        phase: state?.sys?.phase ?? null,
        opponentPoison: state?.core?.players?.['1']?.statusEffects?.poison ?? 0,
        handIds: (state?.core?.players?.['0']?.hand ?? []).map((card: any) => card.id),
        interactionKind: state?.sys?.interaction?.current?.kind ?? null,
        interactionType: state?.sys?.interaction?.current?.data?.type ?? null,
        lastEventTypes: (state?.sys?.eventStream?.entries ?? []).slice(-6).map((entry: any) => entry.event?.type),
    };
}

test.describe('DiceThrone - Status Removal', () => {
    test('card-get-away should remove opponent poison in framework scene', async ({ page, game }) => {
        await game.openTestGame('dicethrone');

        await game.setupScene({
            gameId: 'dicethrone',
            player0: {
                hand: ['card-get-away'],
                resources: { CP: 2, HP: 50 },
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
                        '1': {
                            ...state.core.players['1'],
                            statusEffects: {
                                ...(state.core.players['1']?.statusEffects ?? {}),
                                poison: 2,
                            },
                        },
                    },
                },
            });
        });

        await expect.poll(async () => {
            const state = await readRemovalState(game);
            return {
                phase: state.phase,
                handIds: state.handIds,
                opponentPoison: state.opponentPoison,
            };
        }, { timeout: 10000 }).toMatchObject({
            phase: 'main1',
            handIds: ['card-get-away'],
            opponentPoison: 2,
        });

        const removeCard = page
            .locator('[data-card-id="card-get-away"], [data-card-key^="card-get-away-"]')
            .first();
        await expect(removeCard).toBeVisible({ timeout: 5000 });
        await removeCard.click();

        await expect.poll(async () => {
            const state = await readRemovalState(game);
            return {
                interactionKind: state.interactionKind,
                interactionType: state.interactionType,
            };
        }, { timeout: 5000 }).toMatchObject({
            interactionKind: 'dt:card-interaction',
            interactionType: 'selectStatus',
        });

        const poisonBadge = page
            .locator('[data-testid="status-badge-poison"]')
            .or(page.locator('[data-status-id="poison"]'))
            .first();
        await expect(poisonBadge).toBeVisible({ timeout: 5000 });
        await poisonBadge.click();

        const confirmButton = page.getByRole('button', { name: /^(确认|Confirm)(?:\s*\(\d+\))?$/i }).first();
        await expect(confirmButton).toBeEnabled({ timeout: 5000 });
        await confirmButton.click();

        await expect.poll(async () => {
            const state = await readRemovalState(game);
            return {
                opponentPoison: state.opponentPoison,
                handIds: state.handIds,
                interactionKind: state.interactionKind,
                lastEventTypes: state.lastEventTypes,
            };
        }, { timeout: 5000 }).toMatchObject({
            opponentPoison: 0,
            handIds: [],
            interactionKind: null,
        });

        const finalState = await readRemovalState(game);

        expect(finalState.opponentPoison).toBe(0);
        expect(finalState.handIds).not.toContain('card-get-away');
        expect(finalState.lastEventTypes).toContain('CARD_PLAYED');
        expect(finalState.lastEventTypes).toContain('STATUS_REMOVED');
    });
});
