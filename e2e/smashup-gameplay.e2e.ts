import { test, expect } from './framework';

const SMASHUP_GAMEPLAY_QUERY = {
    p0: 'aliens,pirates',
    p1: 'ninjas,robots',
    skipFactionSelect: true,
    skipInitialization: false,
    seed: 12345,
};

const NINJA_DIRECT_CLICK_QUERY = {
    p0: 'ninjas,pirates',
    p1: 'robots,zombies',
    skipFactionSelect: true,
    skipInitialization: false,
    seed: 67890,
};

const WEREWOLF_STANDING_STONES_QUERY = {
    p0: 'werewolves,ghosts',
    p1: 'aliens,pirates',
    skipFactionSelect: true,
    skipInitialization: false,
    seed: 24680,
};

test.describe('SmashUp - 核心流程与交互稳定性', () => {
    test('主流程：打出随从到基地后结束回合，应切到对手的出牌阶段', async ({ page, game }, testInfo) => {
        test.setTimeout(90000);

        await game.openTestGame('smashup', SMASHUP_GAMEPLAY_QUERY, 45000);

        await game.setupScene({
            gameId: 'smashup',
            player0: {
                hand: [
                    { uid: 'hand-pirate-first-mate', defId: 'pirate_first_mate', type: 'minion' },
                    { uid: 'hand-alien-scout', defId: 'alien_scout', type: 'minion' },
                ],
                factions: ['aliens', 'pirates'],
                minionsPlayed: 0,
                minionLimit: 1,
                actionsPlayed: 0,
                actionLimit: 1,
            },
            player1: {
                hand: [
                    { uid: 'opponent-hand-ninja-shinobi', defId: 'ninja_shinobi', type: 'minion' },
                ],
                factions: ['ninjas', 'robots'],
                minionsPlayed: 0,
                minionLimit: 1,
                actionsPlayed: 0,
                actionLimit: 1,
            },
            bases: [
                { defId: 'base_the_homeworld' },
                { defId: 'base_the_mothership' },
            ],
            currentPlayer: '0',
            phase: 'playCards',
        });

        await game.waitForPhase('playCards');
        await game.waitForCurrentPlayer('0');

        const handArea = page.getByTestId('su-hand-area');
        await expect(handArea.locator('[data-card-uid="hand-pirate-first-mate"]')).toBeVisible();
        await expect(page.locator('[data-base-index="0"]')).toBeVisible();
        await expect(page.getByRole('button', { name: /^(结束回合|Finish Turn|End)$/i })).toBeVisible();

        await game.playCard('pirate_first_mate', { targetBaseIndex: 0 });
        await game.waitForNoInteraction();
        await page.waitForFunction(
            (cardUid) => {
                const harness = (window as any).__BG_TEST_HARNESS__;
                const state = harness?.state?.get?.();
                return state?.core?.bases?.[0]?.minions?.some((minion: any) => minion.uid === cardUid) === true;
            },
            'hand-pirate-first-mate',
            { timeout: 5000, polling: 200 },
        );

        await expect(handArea.locator('[data-card-uid="hand-pirate-first-mate"]')).toHaveCount(0);
        await expect(page.locator('[data-minion-uid="hand-pirate-first-mate"]')).toBeVisible();
        const stateAfterPlay = await game.getState();
        expect(stateAfterPlay.core.bases[0]?.defId).toBe('base_the_homeworld');
        expect(stateAfterPlay.core.bases[0]?.minions?.some((minion: any) => minion.uid === 'hand-pirate-first-mate')).toBe(true);
        await game.screenshot('main-flow-after-play-minion', testInfo);

        await game.advancePhase();
        await game.waitForCurrentPlayer('1', 10000);
        await game.waitForPhase('playCards', 10000);

        const currentPlayerId = await game.getCurrentPlayerId();
        expect(currentPlayerId).toBe('1');

        const player0 = await game.getPlayerState('0');
        expect(player0.hand.some((card: any) => card.uid === 'hand-alien-scout')).toBe(true);

        await game.screenshot('main-flow-next-player-turn', testInfo);
    });

    test('交互稳定性：ninja_acolyte_play 应直点手牌，不应退化成 PromptOverlay 卡牌面板', async ({ page, game }, testInfo) => {
        test.setTimeout(90000);

        await game.openTestGame('smashup', NINJA_DIRECT_CLICK_QUERY, 45000);

        await game.setupScene({
            gameId: 'smashup',
            player0: {
                hand: [
                    { uid: 'hand-shinobi', defId: 'ninja_shinobi', type: 'minion' },
                    { uid: 'hand-first-mate', defId: 'pirate_first_mate', type: 'minion' },
                ],
                field: [
                    { uid: 'acolyte-direct', defId: 'ninja_acolyte', baseIndex: 0, owner: '0', controller: '0', power: 2 },
                ],
                factions: ['ninjas', 'pirates'],
                minionsPlayed: 0,
                minionLimit: 1,
                actionsPlayed: 0,
                actionLimit: 1,
            },
            player1: {
                factions: ['robots', 'zombies'],
            },
            bases: [
                { defId: 'base_the_mothership' },
                { defId: 'base_tortuga' },
            ],
            currentPlayer: '0',
            phase: 'playCards',
        });

        await game.waitForPhase('playCards');
        await expect(page.locator('[data-minion-uid="acolyte-direct"]')).toBeVisible();

        await page.locator('[data-minion-uid="acolyte-direct"]').click({ force: true });
        await game.waitForInteraction('ninja_acolyte_play', 10000);

        await expect(page.locator('[data-card-uid="hand-shinobi"]')).toBeVisible();
        await expect(page.getByTestId('prompt-card-0')).not.toBeVisible();
        await game.screenshot('ninja-acolyte-hand-direct-click', testInfo);

        await page.click('[data-card-uid="hand-shinobi"]');
        await game.waitForNoInteraction();

        const finalState = await game.getState();
        expect(finalState.core.bases[0].minions.some((minion: any) =>
            minion.defId === 'ninja_shinobi' && minion.owner === '0'
        )).toBe(true);
        expect(finalState.core.bases[0].minions.some((minion: any) => minion.uid === 'acolyte-direct')).toBe(false);
        expect(finalState.core.players['0'].hand.some((card: any) => card.uid === 'acolyte-direct')).toBe(true);
        expect(finalState.core.players['0'].minionsPlayed).toBe(0);

        await game.screenshot('ninja-acolyte-after-direct-click', testInfo);
    });

    test('巨石阵应允许己方随从上的附着天赋第2次发动，并占用基地双才能名额', async ({ page, game }, testInfo) => {
        test.setTimeout(90000);

        await game.openTestGame('smashup', WEREWOLF_STANDING_STONES_QUERY, 45000);

        await game.setupScene({
            gameId: 'smashup',
            player0: {
                factions: ['werewolves', 'ghosts'],
                minionsPlayed: 0,
                minionLimit: 1,
                actionsPlayed: 0,
                actionLimit: 1,
            },
            player1: {
                factions: ['aliens', 'pirates'],
                minionsPlayed: 0,
                minionLimit: 1,
                actionsPlayed: 0,
                actionLimit: 1,
            },
            bases: [
                {
                    defId: 'base_standing_stones',
                    minions: [
                        {
                            uid: 'wolf-host',
                            defId: 'werewolf_pack_alpha',
                            owner: '0',
                            controller: '0',
                            attachedActions: [
                                { uid: 'oa1', defId: 'werewolf_leader_of_the_pack', ownerId: '0', talentUsed: true },
                            ],
                        },
                        {
                            uid: 'enemy-minion',
                            defId: 'ghosts_spectre',
                            owner: '1',
                            controller: '1',
                        },
                    ],
                    ongoingActions: [],
                },
                { defId: 'base_the_mothership', minions: [], ongoingActions: [] },
            ],
            currentPlayer: '0',
            phase: 'playCards',
            extra: {
                core: {
                    standingStonesDoubleTalentMinionUid: undefined,
                },
            },
        });

        await game.waitForPhase('playCards');
        await game.waitForCurrentPlayer('0');

        const hostMinion = page.locator('[data-minion-uid="wolf-host"]');
        const attachedAction = page.locator('[data-attached-action-uid="oa1"]');

        await expect.poll(async () => {
            const state = await game.getState();
            return state.core.bases[0].minions.some((minion: any) => minion.uid === 'wolf-host');
        }, { timeout: 5000 }).toBe(true);

        await page.waitForFunction(
            (uid) => !!document.querySelector(`[data-minion-uid="${uid}"]`),
            'wolf-host',
            { timeout: 10000, polling: 200 },
        );
        await expect(hostMinion).toBeVisible({ timeout: 5000 });
        await hostMinion.hover();
        await expect(attachedAction).toBeVisible({ timeout: 5000 });

        const beforeState = await game.getState();
        const beforeHost = beforeState.core.bases[0].minions.find((minion: any) => minion.uid === 'wolf-host');
        expect(beforeHost?.attachedActions?.find((action: any) => action.uid === 'oa1')?.talentUsed).toBe(true);
        expect(beforeState.core.standingStonesDoubleTalentMinionUid).toBeUndefined();
        expect(beforeState.core.players['0'].extraTalentUsesConsumed).toBeUndefined();
        expect(beforeState.core.players['0'].actionLimit).toBe(1);

        await game.screenshot('werewolf-standing-stones-before-second-talent', testInfo);

        await attachedAction.click({ force: true });

        await expect.poll(async () => {
            const state = await game.getState();
            const player0 = state.core.players['0'];
            const host = state.core.bases[0].minions.find((minion: any) => minion.uid === 'wolf-host');
            const attached = host?.attachedActions?.find((action: any) => action.uid === 'oa1');
            return {
                actionLimit: player0.actionLimit,
                extraTalentUsesConsumed: player0.extraTalentUsesConsumed ?? null,
                standingStonesDoubleTalentMinionUid: state.core.standingStonesDoubleTalentMinionUid ?? null,
                attachedTalentUsed: attached?.talentUsed ?? false,
            };
        }, { timeout: 5000 }).toEqual({
            actionLimit: 2,
            extraTalentUsesConsumed: null,
            standingStonesDoubleTalentMinionUid: 'wolf-host',
            attachedTalentUsed: true,
        });

        await hostMinion.hover();
        await expect(attachedAction).toBeVisible({ timeout: 5000 });
        await game.screenshot('werewolf-standing-stones-after-second-talent', testInfo);
    });
});
