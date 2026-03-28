import type { Page } from '@playwright/test';
import { test, expect } from './framework';
import type { GameTestContext } from './framework';

type StatusEffects = Record<string, number>;

type StatusInteraction = {
    id: string;
    kind: string;
    playerId: string;
    titleKey: string;
    selectCount: number;
    targetPlayerIds: string[];
    selected: unknown[];
    transferConfig?: {
        sourcePlayerId: string;
        statusId: string;
    };
};

async function openStatusScene(page: Page, game: GameTestContext): Promise<void> {
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

    await page.waitForFunction(
        () => {
            const state = (window as any).__BG_TEST_HARNESS__?.state?.get?.();
            return state?.sys?.phase === 'main1'
                && state?.core?.activePlayerId === '0'
                && state?.core?.players?.['0']
                && state?.core?.players?.['1'];
        },
        { timeout: 5000, polling: 200 },
    );
}

async function injectInteractionState(
    page: Page,
    options: {
        player0StatusEffects?: StatusEffects;
        player1StatusEffects?: StatusEffects;
        interaction: StatusInteraction;
    },
): Promise<void> {
    await page.evaluate(({ player0StatusEffects, player1StatusEffects, interaction }) => {
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
                        statusEffects: player0StatusEffects ?? {},
                    },
                    '1': {
                        ...state.core.players['1'],
                        statusEffects: player1StatusEffects ?? {},
                    },
                },
            },
            sys: {
                ...state.sys,
                interaction: {
                    ...state.sys.interaction,
                    current: interaction,
                },
            },
        });
    }, options);
}

async function readPlayerStatusEffects(page: Page, playerId: '0' | '1'): Promise<StatusEffects> {
    return page.evaluate((targetPlayerId) => {
        const state = (window as any).__BG_TEST_HARNESS__?.state?.get?.();
        return state?.core?.players?.[targetPlayerId]?.statusEffects ?? {};
    }, playerId);
}

test.describe('DiceThrone - Status Interaction Complete', () => {
    test('selectStatus: should allow selecting status and enabling confirm', async ({ page, game }) => {
        await openStatusScene(page, game);

        await injectInteractionState(page, {
            player0StatusEffects: { poison: 3 },
            interaction: {
                id: 'test-select-status',
                kind: 'selectStatus',
                playerId: '0',
                titleKey: 'interaction.selectStatusToRemove',
                selectCount: 1,
                targetPlayerIds: ['0'],
                selected: [],
            },
        });

        const statusBadge = page
            .locator('[data-testid="status-badge-poison"]')
            .or(page.locator('[data-status-id="poison"]'))
            .first();
        const confirmButton = page.locator('button').filter({ hasText: /确认|Confirm/i }).first();

        await expect(statusBadge).toBeVisible({ timeout: 5000 });
        await expect(confirmButton).toBeDisabled();

        await statusBadge.click();

        await expect(confirmButton).toBeEnabled({ timeout: 3000 });
    });

    test('selectPlayer: should show player selection UI', async ({ page, game }) => {
        await openStatusScene(page, game);

        await injectInteractionState(page, {
            player0StatusEffects: { poison: 2 },
            player1StatusEffects: { burn: 1 },
            interaction: {
                id: 'test-select-player',
                kind: 'selectPlayer',
                playerId: '0',
                titleKey: 'interaction.selectPlayerToRemoveAllStatus',
                selectCount: 1,
                targetPlayerIds: ['0', '1'],
                selected: [],
            },
        });

        await expect(page.getByText(/选择玩家|Select Player/i)).toBeVisible({ timeout: 5000 });
        await expect(page.locator('text=自己').or(page.locator('text=Self'))).toBeVisible();
        await expect(page.locator('text=对手').or(page.locator('text=Opponent'))).toBeVisible();

        const cancelButton = page.locator('button').filter({ hasText: /取消|Cancel/i }).first();
        await expect(cancelButton).toBeVisible();
        await expect(cancelButton).toBeEnabled();

        await cancelButton.click();
        await expect(page.getByText(/选择玩家|Select Player/i)).not.toBeVisible({ timeout: 3000 });
    });

    test('selectTargetStatus: should show two-phase transfer UI', async ({ page, game }) => {
        await openStatusScene(page, game);

        await injectInteractionState(page, {
            player0StatusEffects: { poison: 2, burn: 1 },
            interaction: {
                id: 'test-transfer-status',
                kind: 'selectTargetStatus',
                playerId: '0',
                titleKey: 'interaction.selectStatusToTransfer',
                selectCount: 1,
                targetPlayerIds: ['0'],
                selected: [],
                transferConfig: {
                    sourcePlayerId: '0',
                    statusId: '',
                },
            },
        });

        await expect(page.getByText(/选择要转移的状态|Select Status/i)).toBeVisible({ timeout: 5000 });

        await page.evaluate(() => {
            const harness = (window as any).__BG_TEST_HARNESS__;
            const state = harness?.state?.get?.();
            if (!state) {
                throw new Error('State not available');
            }

            harness.state.patch({
                sys: {
                    ...state.sys,
                    interaction: {
                        ...state.sys.interaction,
                        current: {
                            id: 'test-transfer-status-phase2',
                            kind: 'selectTargetStatus',
                            playerId: '0',
                            titleKey: 'interaction.selectStatusToTransfer',
                            selectCount: 1,
                            targetPlayerIds: ['0', '1'],
                            selected: [],
                            transferConfig: {
                                sourcePlayerId: '0',
                                statusId: 'poison',
                            },
                        },
                    },
                },
            });
        });

        await expect(page.getByText(/选择目标玩家|Select Target Player/i)).toBeVisible({ timeout: 5000 });

        const cancelButton = page.locator('button').filter({ hasText: /取消|Cancel/i }).first();
        await expect(cancelButton).toBeVisible();
        await expect(cancelButton).toBeEnabled();

        await cancelButton.click();
        await expect(page.getByText(/选择目标玩家|Select Target Player/i)).not.toBeVisible({ timeout: 3000 });
    });

    test('should handle multiple status types correctly', async ({ page, game }) => {
        await openStatusScene(page, game);

        await injectInteractionState(page, {
            player0StatusEffects: {
                poison: 3,
                burn: 2,
                bleed: 1,
                stun: 1,
            },
            interaction: {
                id: 'test-multiple-status',
                kind: 'selectStatus',
                playerId: '0',
                titleKey: 'interaction.selectStatusToRemove',
                selectCount: 1,
                targetPlayerIds: ['0'],
                selected: [],
            },
        });

        await expect(page.getByText(/选择要移除的状态|Select Status/i)).toBeVisible({ timeout: 5000 });

        const statusBadges = page
            .locator('[data-testid^="status-badge-"]')
            .or(page.locator('[data-status-id]'));
        await expect(statusBadges).toHaveCount(4, { timeout: 5000 });

        const cancelButton = page.locator('button').filter({ hasText: /取消|Cancel/i }).first();
        await expect(cancelButton).toBeVisible();
        await cancelButton.click();

        const finalState = await readPlayerStatusEffects(page, '0');
        expect(finalState.poison ?? 0).toBe(3);
        expect(finalState.burn ?? 0).toBe(2);
        expect(finalState.bleed ?? 0).toBe(1);
        expect(finalState.stun ?? 0).toBe(1);
    });

    test('should show "no status" message when player has no status', async ({ page, game }) => {
        await openStatusScene(page, game);

        await injectInteractionState(page, {
            player0StatusEffects: {},
            player1StatusEffects: {},
            interaction: {
                id: 'test-no-status',
                kind: 'selectPlayer',
                playerId: '0',
                titleKey: 'interaction.selectPlayerToRemoveAllStatus',
                selectCount: 1,
                targetPlayerIds: ['0', '1'],
                selected: [],
            },
        });

        await expect(page.getByText(/选择玩家|Select Player/i)).toBeVisible({ timeout: 5000 });
        await expect(page.getByText(/无状态|No Status/i).first()).toBeVisible();

        const cancelButton = page.locator('button').filter({ hasText: /取消|Cancel/i }).first();
        await expect(cancelButton).toBeVisible();
        await cancelButton.click();
    });
});
