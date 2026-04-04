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
        currentPlayer: '0',
        phase: 'offensiveRoll',
        extra: {
            selectedCharacters: { '0': 'monk', '1': 'barbarian' },
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
        activePlayerId: '0',
        rollConfirmed: true,
        responderId: '0',
        responseWindowId: 'self-response-ability-window',
    });
}

test.describe('DiceThrone - 防御技能选择', () => {
    test('影贼双防御应先要求选择防御技能，再进入防御掷骰', async ({ page, game }) => {
        await setupDefenseEntryScene(game, 'shadow_thief');

        await game.advancePhase();

        await expect.poll(async () => {
            const state = await game.getState();
            return {
                phase: state?.sys?.phase ?? null,
                defenseAbilityId: state?.core?.pendingAttack?.defenseAbilityId ?? null,
                rollCount: state?.core?.rollCount ?? null,
            };
        }, { timeout: 5000 }).toMatchObject({
            phase: 'defensiveRoll',
            defenseAbilityId: null,
            rollCount: 0,
        });

        const highlightedSlots = page
            .locator('[data-ability-slot]')
            .filter({ has: page.locator('div.animate-pulse[class*="border-"]') });
        await expect(highlightedSlots.first()).toBeVisible({ timeout: 5000 });
        expect(await highlightedSlots.count()).toBeGreaterThanOrEqual(2);

        await highlightedSlots.first().click();

        await expect.poll(async () => {
            const state = await game.getState();
            return {
                phase: state?.sys?.phase ?? null,
                defenseAbilityId: state?.core?.pendingAttack?.defenseAbilityId ?? null,
            };
        }, { timeout: 5000 }).toSatisfy(({ phase, defenseAbilityId }) => {
            return phase === 'defensiveRoll'
                && (defenseAbilityId === 'shadow-defense' || defenseAbilityId === 'fearless-riposte');
        });

        await expect(page.locator('[data-tutorial-id="dice-roll-button"]')).toBeEnabled({ timeout: 5000 });
    });

    test('圣骑单防御应自动选择 holy-defense 并直接进入防御掷骰', async ({ page, game }) => {
        await setupDefenseEntryScene(game, 'paladin');

        await game.advancePhase();

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

    test('自己处于响应窗口时不应提前高亮技能，结束响应后再恢复高亮', async ({ page, game }, testInfo) => {
        await setupSelfResponseAbilityScene(page, game);

        const highlightedSlots = page
            .locator('[data-ability-slot]')
            .filter({ has: page.locator('div.animate-pulse[class*="border-"]') });

        await expect(highlightedSlots).toHaveCount(0);
        await game.screenshot('self-response-window-no-ability-highlight', testInfo);

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

        await page.getByTestId('dt-top-header-1').click();
        await expect(highlightedSlots.first()).toBeVisible({ timeout: 5000 });
        expect(await highlightedSlots.count()).toBeGreaterThan(0);
        await game.screenshot('self-response-window-highlight-restored', testInfo);
    });
});
