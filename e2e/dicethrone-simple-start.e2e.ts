import { test, expect } from './framework';
import type { GameTestContext } from './framework';

async function readStartState(game: GameTestContext) {
    const state = await game.getState();
    return {
        phase: state?.sys?.phase ?? null,
        activePlayerId: state?.core?.activePlayerId ?? null,
        playerCount: Object.keys(state?.core?.players ?? {}).length,
    };
}

test.describe('DiceThrone 本地启动冒烟', () => {
    test('framework 场景应直接渲染基础战局与关键控件', async ({ page, game }) => {
        await game.openTestGame('dicethrone');

        await game.setupScene({
            gameId: 'dicethrone',
            player0: {
                resources: { CP: 2, HP: 50 },
            },
            player1: {
                resources: { CP: 2, HP: 50 },
            },
            currentPlayer: '0',
            phase: 'main1',
            extra: {
                selectedCharacters: { '0': 'barbarian', '1': 'paladin' },
                hostStarted: true,
            },
        });

        await game.waitForPhase('main1', 10000);
        await expect.poll(async () => readStartState(game), { timeout: 10000 }).toMatchObject({
            phase: 'main1',
            activePlayerId: '0',
            playerCount: 2,
        });

        await expect(page.locator('[data-tutorial-id="hand-area"]')).toBeVisible({ timeout: 5000 });
        await expect(page.locator('[data-tutorial-id="advance-phase-button"]')).toBeVisible({ timeout: 5000 });
        await expect(page.locator('[data-tutorial-id="dice-roll-button"]')).toBeVisible({ timeout: 5000 });
    });
});
