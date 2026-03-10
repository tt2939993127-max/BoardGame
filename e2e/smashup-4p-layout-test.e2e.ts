import { test, expect } from './framework';

const INITIAL_BASE_IDS = ['base_the_jungle', 'base_dread_lookout', 'base_tsars_palace'] as const;
const REPLACEMENT_BASE_DECK = [
    'base_central_brain',
    'base_cave_of_shinies',
    'base_rhodes_plaza',
    'base_the_factory',
] as const;
const EXPECTED_FINAL_BASE_IDS = ['base_cave_of_shinies', 'base_rhodes_plaza', 'base_central_brain'] as const;
const EXPECTED_FINAL_VP = {
    '0': 7,
    '1': 4,
    '2': 8,
    '3': 10,
} as const;

function createPlayerState(
    playerId: string,
    vp: number,
    factions: [string, string],
) {
    return {
        id: playerId,
        vp,
        hand: [],
        deck: [],
        discard: [],
        factions,
        minionsPlayed: 1,
        minionLimit: 1,
        actionsPlayed: 1,
        actionLimit: 1,
    };
}

function buildFourPlayerMultiBaseScene() {
    return {
        gameId: 'smashup',
        currentPlayer: '0' as const,
        phase: 'playCards',
        bases: [
            {
                defId: 'base_the_jungle',
                breakpoint: 12,
                minions: [
                    { uid: 'p2-b0-spectre', defId: 'ghost_spectre', owner: '2', controller: '2' },
                    { uid: 'p0-b0-grave-digger', defId: 'zombie_grave_digger', owner: '0', controller: '0' },
                    { uid: 'p1-b0-invader', defId: 'alien_invader', owner: '1', controller: '1' },
                    { uid: 'p3-b0-ghost', defId: 'ghost_ghost', owner: '3', controller: '3' },
                ],
            },
            {
                defId: 'base_dread_lookout',
                breakpoint: 20,
                minions: [
                    { uid: 'p3-b1-king-rex', defId: 'dino_king_rex', owner: '3', controller: '3' },
                    { uid: 'p1-b1-tiger-assassin', defId: 'ninja_tiger_assassin', owner: '1', controller: '1' },
                    { uid: 'p1-b1-collector', defId: 'alien_collector', owner: '1', controller: '1' },
                    { uid: 'p0-b1-grave-digger', defId: 'zombie_grave_digger', owner: '0', controller: '0' },
                    { uid: 'p2-b1-chronomage', defId: 'wizard_chronomage', owner: '2', controller: '2' },
                ],
            },
            {
                defId: 'base_tsars_palace',
                breakpoint: 22,
                minions: [
                    { uid: 'p0-b2-king-rex', defId: 'dino_king_rex', owner: '0', controller: '0' },
                    { uid: 'p2-b2-spirit-a', defId: 'ghost_spirit', owner: '2', controller: '2' },
                    { uid: 'p2-b2-spirit-b', defId: 'ghost_spirit', owner: '2', controller: '2' },
                    { uid: 'p3-b2-spectre', defId: 'ghost_spectre', owner: '3', controller: '3' },
                    { uid: 'p1-b2-tiger-assassin', defId: 'ninja_tiger_assassin', owner: '1', controller: '1' },
                ],
            },
        ],
        extra: {
            core: {
                turnOrder: ['0', '1', '2', '3'],
                turnNumber: 5,
                nextUid: 9000,
                baseDeck: [...REPLACEMENT_BASE_DECK],
                players: {
                    '0': createPlayerState('0', 1, ['dinosaurs', 'zombies']),
                    '1': createPlayerState('1', 2, ['aliens', 'ninjas']),
                    '2': createPlayerState('2', 3, ['ghosts', 'wizards']),
                    '3': createPlayerState('3', 4, ['dinosaurs', 'ghosts']),
                },
            },
        },
    };
}

async function openFourPlayerScoreScene(page: any, game: any) {
    await game.openTestGame('smashup', {
        numPlayers: 4,
        skipInitialization: true,
    });
    await game.setupScene(buildFourPlayerMultiBaseScene());
    await expect.poll(async () => {
        const text = await page.evaluate(() => document.body?.innerText ?? '');
        return text.includes('Loading match resources...');
    }, { timeout: 20000 }).toBe(false);
    await expect(page.locator('[data-tutorial-id="su-scoreboard"]')).toBeVisible({ timeout: 15000 });
}

async function getBaseOptions(game: any) {
    const options = await game.getInteractionOptions();
    return options.map((option: any) => ({
        id: option.id as string,
        baseDefId: option.value?.baseDefId as string | undefined,
        baseIndex: option.value?.baseIndex as number | undefined,
        label: option.label as string,
    }));
}

async function selectBaseByDefId(game: any, baseDefId: string) {
    const options = await getBaseOptions(game);
    const option = options.find((entry: any) => entry.baseDefId === baseDefId);
    expect(option, `未找到基地选项 ${baseDefId}`).toBeTruthy();
    await game.selectOption(option!.id);
}

test.describe('大杀四方四人局三基地同时计分', () => {
    test('四人局三基地同时计分时，正确弹出多基地选择交互', async ({ page, game }, testInfo) => {
        test.setTimeout(90000);

        await openFourPlayerScoreScene(page, game);

        const scoreBoard = page.locator('[data-tutorial-id="su-scoreboard"]');
        await expect(scoreBoard).toContainText('P1');
        await expect(scoreBoard).toContainText('P2');
        await expect(scoreBoard).toContainText('P3');

        await game.advancePhase();
        await game.waitForInteraction('multi_base_scoring', 15000);

        await expect(page.getByText('选择先记分的基地')).toBeVisible();

        const baseOptions = await getBaseOptions(game);
        expect(baseOptions).toHaveLength(3);
        expect(baseOptions.map((option: any) => option.baseDefId).sort()).toEqual([...INITIAL_BASE_IDS].sort());

        await game.screenshot('01-four-player-multi-base-prompt', testInfo);
    });

    test('四人局三基地同时计分会按选择顺序依次结算并更新四名玩家VP', async ({ page, game }, testInfo) => {
        test.setTimeout(90000);

        await openFourPlayerScoreScene(page, game);

        await game.advancePhase();
        await game.waitForInteraction('multi_base_scoring', 15000);

        await selectBaseByDefId(game, 'base_tsars_palace');

        await expect.poll(async () => {
            return (await getBaseOptions(game)).map((option: any) => option.baseDefId).sort();
        }).toEqual(['base_dread_lookout', 'base_the_jungle']);
        await expect(page.getByText('选择先记分的基地')).toBeVisible();

        await game.screenshot('02-after-first-base-choice', testInfo);

        await selectBaseByDefId(game, 'base_the_jungle');

        await expect.poll(async () => {
            const state = await game.getState();
            return state.sys?.interaction?.current ? 'active' : 'idle';
        }, { timeout: 15000 }).toBe('idle');

        const finalState = await game.getState();

        expect(finalState.core.turnOrder).toEqual(['0', '1', '2', '3']);
        expect(finalState.core.players['0'].vp).toBe(EXPECTED_FINAL_VP['0']);
        expect(finalState.core.players['1'].vp).toBe(EXPECTED_FINAL_VP['1']);
        expect(finalState.core.players['2'].vp).toBe(EXPECTED_FINAL_VP['2']);
        expect(finalState.core.players['3'].vp).toBe(EXPECTED_FINAL_VP['3']);
        expect(finalState.core.bases.map((base: any) => base.defId)).toEqual([...EXPECTED_FINAL_BASE_IDS]);
        expect(finalState.core.baseDeck).toEqual(['base_the_factory']);

        for (const base of finalState.core.bases) {
            expect(base.minions).toHaveLength(0);
            expect(base.ongoingActions).toHaveLength(0);
        }

        await game.screenshot('03-final-four-player-state', testInfo);
    });
});
