import { test, expect } from './framework';

async function longPressTouch(locator: any, page: any, pointerId: number) {
    const box = await locator.boundingBox();
    expect(box, '长按目标应该先可见').not.toBeNull();

    const clientX = box!.x + box!.width / 2;
    const clientY = box!.y + box!.height / 2;

    await locator.dispatchEvent('pointerdown', {
        bubbles: true,
        pointerId,
        pointerType: 'touch',
        clientX,
        clientY,
    });
    await page.waitForTimeout(520);
    await locator.dispatchEvent('pointerup', {
        bubbles: true,
        pointerId,
        pointerType: 'touch',
        clientX,
        clientY,
    });
}

async function closeMagnifyOverlay(page: any) {
    const overlay = page.locator('[data-testid="su-card-magnify-overlay"]');
    await expect(overlay).toBeVisible({ timeout: 5000 });
    await overlay.getByRole('button').click();
    await expect(overlay).toHaveCount(0);
}

async function clickCenter(locator: any, page: any) {
    const box = await locator.boundingBox();
    expect(box, '点击目标应该先可见').not.toBeNull();
    await page.mouse.click(box!.x + box!.width / 2, box!.y + box!.height / 2);
}

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

function buildFourPlayerMobileScene() {
    const scene = buildFourPlayerMultiBaseScene();

    return {
        ...scene,
        bases: [
            {
                ...scene.bases[0],
                minions: [
                    {
                        uid: 'p0-b0-armor-stego',
                        defId: 'dino_armor_stego_pod',
                        owner: '0',
                        controller: '0',
                        talentUsed: false,
                        attachedActions: [
                            { uid: 'p0-b0-armor-stego-upgrade', defId: 'dino_tooth_and_claw_pod', ownerId: '0' },
                        ],
                    },
                    ...scene.bases[0].minions.filter((minion) => minion.controller !== '0'),
                ],
                ongoingActions: [
                    { uid: 'p0-b0-base-ongoing', defId: 'zombie_overrun', ownerId: '0', talentUsed: false },
                ],
            },
            ...scene.bases.slice(1),
        ],
        extra: {
            ...scene.extra,
            core: {
                ...scene.extra.core,
                players: {
                    ...scene.extra.core.players,
                    '0': {
                        ...scene.extra.core.players['0'],
                        hand: [
                            { uid: 'p0-mobile-hand-terraform', defId: 'alien_terraform', type: 'action', owner: '0' },
                            { uid: 'p0-mobile-hand-invader', defId: 'alien_invader', type: 'minion', owner: '0' },
                        ],
                    },
                },
            },
        },
    };
}

async function expectLocatorInsideViewport(
    locator: any,
    name: string,
    viewportWidth: number,
    viewportHeight: number,
) {
    const box = await locator.boundingBox();
    expect(box, `${name} 应该有可见的布局盒`).not.toBeNull();
    expect(box!.x, `${name} 不应超出左边界`).toBeGreaterThanOrEqual(-2);
    expect(box!.y, `${name} 不应超出上边界`).toBeGreaterThanOrEqual(-2);
    expect(box!.x + box!.width, `${name} 不应超出右边界`).toBeLessThanOrEqual(viewportWidth + 2);
    expect(box!.y + box!.height, `${name} 不应超出下边界`).toBeLessThanOrEqual(viewportHeight + 2);
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

    test('移动端横屏应保持四人局布局可用，并支持手牌长按看牌', async ({ page, game }, testInfo) => {
        test.setTimeout(90000);

        await page.setViewportSize({ width: 812, height: 375 });
        await page.addInitScript(() => {
            const query = '(pointer: coarse)';
            const originalMatchMedia = window.matchMedia.bind(window);
            window.matchMedia = ((media: string) => {
                if (media !== query) {
                    return originalMatchMedia(media);
                }

                return {
                    matches: true,
                    media,
                    onchange: null,
                    addListener: () => {},
                    removeListener: () => {},
                    addEventListener: () => {},
                    removeEventListener: () => {},
                    dispatchEvent: () => true,
                } as MediaQueryList;
            }) as typeof window.matchMedia;
        });

        await game.openTestGame('smashup', {
            numPlayers: 4,
            skipInitialization: true,
        });
        await game.setupScene(buildFourPlayerMobileScene());

        await page.waitForFunction(() => {
            const state = (window as any).__BG_TEST_HARNESS__?.state?.get?.();
            return window.innerWidth === 812
                && window.matchMedia('(pointer: coarse)').matches
                && state?.sys?.phase === 'playCards'
                && (state?.core?.players?.['0']?.hand?.length ?? 0) === 2;
        }, { timeout: 10000, polling: 200 });

        const scoreBoard = page.locator('[data-tutorial-id="su-scoreboard"]');
        const handArea = page.locator('[data-testid="su-hand-area"]');
        const deckStack = page.locator('[data-testid="su-deck-stack"]');
        const discardToggle = page.locator('[data-testid="su-discard-toggle"]');
        const firstBase = page.locator('[data-base-index="0"]');
        const handCard = page.locator('[data-card-uid="p0-mobile-hand-terraform"]').first();
        const inspectButton = page.locator('[data-testid="su-hand-card-inspect-p0-mobile-hand-terraform"]');
        const talentMinion = page.locator('[data-minion-uid="p0-b0-armor-stego"]');
        const baseOngoingCard = page.locator('[data-ongoing-uid="p0-b0-base-ongoing"]');
        const attachedActionCard = page.locator('[data-attached-action-uid="p0-b0-armor-stego-upgrade"]');
        const magnifyOverlay = page.locator('[data-testid="su-card-magnify-overlay"]');

        await expect(scoreBoard).toBeVisible({ timeout: 15000 });
        await expect(handArea).toBeVisible({ timeout: 15000 });
        await expect(deckStack).toBeVisible({ timeout: 15000 });
        await expect(discardToggle).toBeVisible({ timeout: 15000 });
        await expect(firstBase).toBeVisible({ timeout: 15000 });
        await expect(handCard).toBeVisible({ timeout: 15000 });
        await expect(inspectButton).toHaveCSS('opacity', '1');
        await expect(talentMinion).toBeVisible({ timeout: 15000 });
        await expect(baseOngoingCard).toBeVisible({ timeout: 15000 });
        await expect(talentMinion).toHaveAttribute('data-attached-actions-visible', 'false');

        const viewport = page.viewportSize();
        expect(viewport).not.toBeNull();

        await expectLocatorInsideViewport(scoreBoard, '记分板', viewport!.width, viewport!.height);
        await expectLocatorInsideViewport(deckStack, '牌库', viewport!.width, viewport!.height);
        await expectLocatorInsideViewport(discardToggle, '弃牌堆', viewport!.width, viewport!.height);
        await expectLocatorInsideViewport(handCard, '手牌卡牌', viewport!.width, viewport!.height);

        const handCardBox = await handCard.boundingBox();
        expect(handCardBox, '手牌卡牌应提供尺寸').not.toBeNull();
        expect(handCardBox!.width, '移动端手牌宽度不应过小').toBeGreaterThan(48);

        await game.screenshot('04-mobile-landscape-layout', testInfo);

        await firstBase.click();
        await expect(magnifyOverlay).toHaveCount(0);

        await clickCenter(talentMinion, page);
        await expect(talentMinion).toHaveAttribute('data-expanded', 'true');
        await expect(talentMinion).toHaveAttribute('data-attached-actions-visible', 'true');
        await expect(talentMinion).toHaveAttribute('data-activation-armed', 'true');
        await expect.poll(async () => {
            const state = await game.getState();
            return state.core.bases[0].minions.find((minion: any) => minion.uid === 'p0-b0-armor-stego')?.talentUsed ?? false;
        }, { timeout: 5000 }).toBe(false);
        await expect(magnifyOverlay).toHaveCount(0);

        await game.screenshot('05-mobile-single-tap-expands-attached-actions', testInfo);

        await clickCenter(talentMinion, page);
        await expect.poll(async () => {
            const state = await game.getState();
            return state.core.bases[0].minions.find((minion: any) => minion.uid === 'p0-b0-armor-stego')?.talentUsed ?? false;
        }, { timeout: 5000 }).toBe(true);
        await expect(talentMinion).toHaveAttribute('data-attached-actions-visible', 'true');
        await expect(talentMinion).toHaveAttribute('data-activation-armed', 'false');

        await game.screenshot('06-mobile-second-tap-uses-talent', testInfo);

        await longPressTouch(talentMinion, page, 1);
        await expect(magnifyOverlay).toBeVisible({ timeout: 5000 });
        await game.screenshot('07-mobile-minion-long-press-magnify', testInfo);
        await closeMagnifyOverlay(page);

        await longPressTouch(firstBase, page, 2);
        await expect(magnifyOverlay).toBeVisible({ timeout: 5000 });
        await game.screenshot('08-mobile-base-long-press-magnify', testInfo);
        await closeMagnifyOverlay(page);

        await longPressTouch(baseOngoingCard, page, 3);
        await expect(magnifyOverlay).toBeVisible({ timeout: 5000 });
        await game.screenshot('09-mobile-base-ongoing-long-press-magnify', testInfo);
        await closeMagnifyOverlay(page);

        await longPressTouch(attachedActionCard, page, 4);
        await expect(magnifyOverlay).toBeVisible({ timeout: 5000 });
        await game.screenshot('10-mobile-attached-action-long-press-magnify', testInfo);
        await closeMagnifyOverlay(page);

        await longPressTouch(handCard, page, 5);
        await expect(magnifyOverlay).toBeVisible({ timeout: 5000 });
        await game.screenshot('11-mobile-hand-long-press-magnify', testInfo);
        await closeMagnifyOverlay(page);

        const stateAfterLongPress = await game.getState();
        expect(stateAfterLongPress.core.players['0'].hand.some((card: any) => card.uid === 'p0-mobile-hand-terraform')).toBe(true);
        expect(stateAfterLongPress.core.bases[0].minions.find((minion: any) => minion.uid === 'p0-b0-armor-stego')?.talentUsed).toBe(true);
    });
});
