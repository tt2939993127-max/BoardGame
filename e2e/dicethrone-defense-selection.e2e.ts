import { test, expect } from './framework';
import type { GameTestContext } from './framework';

async function setupDefenseEntryScene(
    game: GameTestContext,
    defenderCharacter: 'shadow_thief' | 'paladin',
): Promise<void> {
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
        phase: 'offensiveRoll',
        extra: {
            selectedCharacters: { '0': 'monk', '1': defenderCharacter },
            hostStarted: true,
            rollCount: 1,
            rollLimit: 3,
            rollConfirmed: true,
            dice: [
                { id: 0, value: 1, isKept: false },
                { id: 1, value: 2, isKept: false },
                { id: 2, value: 3, isKept: false },
                { id: 3, value: 4, isKept: false },
                { id: 4, value: 5, isKept: false },
            ],
            pendingAttack: {
                attackerId: '0',
                defenderId: '1',
                isDefendable: true,
                damage: 5,
                bonusDamage: 0,
                sourceAbilityId: 'smash',
            },
        },
    });

    await expect.poll(async () => {
        const state = await game.getState();
        return {
            phase: state?.sys?.phase ?? null,
            defenderId: state?.core?.pendingAttack?.defenderId ?? null,
            sourceAbilityId: state?.core?.pendingAttack?.sourceAbilityId ?? null,
            rollConfirmed: state?.core?.rollConfirmed ?? null,
        };
    }, { timeout: 10000 }).toMatchObject({
        phase: 'offensiveRoll',
        defenderId: '1',
        sourceAbilityId: 'smash',
        rollConfirmed: true,
    });
}

async function setupDefenseSelectionScene(
    game: GameTestContext,
    defenderCharacter: 'shadow_thief' | 'paladin',
    defenseAbilityId: string | null = null,
): Promise<void> {
    await game.openTestGame('dicethrone', { playerID: 1 });

    await game.setupScene({
        gameId: 'dicethrone',
        player0: {
            resources: { CP: 2, HP: 50 },
        },
        player1: {
            resources: { CP: 2, HP: 50 },
        },
        currentPlayer: '0',
        phase: 'defensiveRoll',
        extra: {
            selectedCharacters: { '0': 'monk', '1': defenderCharacter },
            hostStarted: true,
            rollCount: 0,
            rollLimit: 1,
            rollConfirmed: false,
            dice: [
                { id: 0, value: 1, isKept: false },
                { id: 1, value: 2, isKept: false },
                { id: 2, value: 3, isKept: false },
                { id: 3, value: 4, isKept: false },
                { id: 4, value: 5, isKept: false },
            ],
            pendingAttack: {
                attackerId: '0',
                defenderId: '1',
                isDefendable: true,
                damage: 5,
                bonusDamage: 0,
                sourceAbilityId: 'smash',
                defenseAbilityId,
            },
            activePlayerId: '1',
        },
    });

    await expect.poll(async () => {
        const state = await game.getState();
        return {
            phase: state?.sys?.phase ?? null,
            activePlayerId: state?.core?.activePlayerId ?? null,
            defenderId: state?.core?.pendingAttack?.defenderId ?? null,
            defenseAbilityId: state?.core?.pendingAttack?.defenseAbilityId ?? null,
            rollCount: state?.core?.rollCount ?? null,
        };
    }, { timeout: 10000 }).toMatchObject({
        phase: 'defensiveRoll',
        activePlayerId: '1',
        defenderId: '1',
        defenseAbilityId,
        rollCount: 0,
    });
}

async function setupSelfResponseAbilityScene(
    page: import('@playwright/test').Page,
    game: GameTestContext,
): Promise<void> {
    await game.openTestGame('dicethrone');

    await game.setupScene({
        gameId: 'dicethrone',
        player0: {
            resources: { cp: 2, hp: 50 },
        },
        player1: {
            resources: { cp: 2, hp: 50 },
        },
        currentPlayer: '1',
        phase: 'offensiveRoll',
        extra: {
            selectedCharacters: { '0': 'barbarian', '1': 'monk' },
            hostStarted: true,
            rollCount: 1,
            rollLimit: 3,
            rollConfirmed: true,
            pendingAttack: null,
            dice: Array.from({ length: 5 }, (_, index) => ({
                id: index,
                definitionId: 'monk-dice',
                value: 1,
                symbol: 'fist',
                symbols: ['fist'],
                isKept: false,
            })),
        },
    });

    await page.evaluate(() => {
        const harness = (window as any).__BG_TEST_HARNESS__;
        if (typeof harness?.state?.patch !== 'function') {
            throw new Error('TestHarness state.patch 不可用');
        }

        harness.state.patch({
            sys: {
                responseWindow: {
                    current: {
                        id: 'self-response-ability-window',
                        windowType: 'afterRollConfirmed',
                        sourceId: 'after-roll-confirmed',
                        responderQueue: ['0'],
                        currentResponderIndex: 0,
                        passedPlayers: [],
                        actionTakenThisRound: false,
                        consecutivePassRounds: 0,
                    },
                },
            },
        });
    });

    await expect.poll(async () => {
        const state = await game.getState();
        const responseWindow = state?.sys?.responseWindow?.current;
        return {
            phase: state?.sys?.phase ?? null,
            activePlayerId: state?.core?.activePlayerId ?? null,
            rollConfirmed: state?.core?.rollConfirmed ?? null,
            responderId: responseWindow?.responderQueue?.[responseWindow.currentResponderIndex] ?? null,
            responseWindowId: responseWindow?.id ?? null,
        };
    }, { timeout: 5000 }).toMatchObject({
        phase: 'offensiveRoll',
        activePlayerId: '1',
        rollConfirmed: true,
        responderId: '0',
        responseWindowId: 'self-response-ability-window',
    });
}

test.describe('DiceThrone - 防御技能选择', () => {
    test('影贼防御选择场景应高亮可选技能', async ({ page, game }, testInfo) => {
        await setupDefenseSelectionScene(game, 'shadow_thief', null);

        const highlightedSlots = page
            .locator('[data-ability-slot]')
            .filter({ has: page.locator('div.animate-pulse[class*="border-"]') });
        await expect(highlightedSlots.first()).toBeVisible({ timeout: 5000 });
        expect(await highlightedSlots.count()).toBeGreaterThanOrEqual(2);
        await game.screenshot('shadow-thief-defense-selectable-abilities', testInfo);
    });

    test('圣骑防御场景应显示 holy-defense 并允许投骰', async ({ page, game }) => {
        await setupDefenseSelectionScene(game, 'paladin', 'holy-defense');

        await expect.poll(async () => {
            const state = await game.getState();
            return {
                phase: state?.sys?.phase ?? null,
                defenseAbilityId: state?.core?.pendingAttack?.defenseAbilityId ?? null,
            };
        }, { timeout: 5000 }).toMatchObject({
            phase: 'defensiveRoll',
            defenseAbilityId: 'holy-defense',
        });

        const state = await game.getState();
        expect(state.core.pendingAttack?.defenseAbilityId).toBe('holy-defense');
        await expect(page.locator('[data-tutorial-id="dice-roll-button"]')).toBeEnabled({ timeout: 5000 });
    });

    test('自己处于响应窗口时应高亮对方可选技能', async ({ page, game }, testInfo) => {
        await setupSelfResponseAbilityScene(page, game);

        const highlightedSlots = page
            .locator('[data-ability-slot]')
            .filter({ has: page.locator('div.animate-pulse[class*="border-"]') });

        await expect(highlightedSlots.first()).toBeVisible({ timeout: 5000 });
        expect(await highlightedSlots.count()).toBeGreaterThan(0);
        await game.screenshot('self-response-window-opponent-highlight', testInfo);

        await game.passResponseWindow('0');

        await expect.poll(async () => {
            const state = await game.getState();
            return {
                responseWindowId: state?.sys?.responseWindow?.current?.id ?? null,
                phase: state?.sys?.phase ?? null,
            };
        }, { timeout: 5000 }).toMatchObject({
            responseWindowId: null,
            phase: 'offensiveRoll',
        });
    });
});
