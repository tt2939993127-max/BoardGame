import type { Page } from '@playwright/test';
import { test, expect } from './framework';
import type { GameTestContext } from './framework';
import { getCardDef } from '../src/games/smashup/data/cards';

const ALIEN_CARD_IDS = ['alien_probe', 'alien_terraform', 'alien_crop_circles'] as const;
const BASES = ['base_the_homeworld', 'base_the_mothership'] as const;

const ALIEN_CARDS = ALIEN_CARD_IDS.map((defId) => {
    const def = getCardDef(defId);
    if (!def) {
        throw new Error(`Missing card definition: ${defId}`);
    }
    return {
        defId,
        name: def.name,
        nameEn: def.nameEn,
    };
});

async function readCardTitleInfo(page: Page, cardUid: string): Promise<{ rootTitle: string | null; nestedTitle: string | null }> {
    return page.locator(`[data-card-uid="${cardUid}"]`).evaluate((root) => {
        const titledNode = root.querySelector('[title]') as HTMLElement | null;
        return {
            rootTitle: root.getAttribute('title'),
            nestedTitle: titledNode?.getAttribute('title') ?? null,
        };
    });
}

function resolveDisplayedTitle(titleInfo: { rootTitle: string | null; nestedTitle: string | null }): string | null {
    return titleInfo.nestedTitle ?? titleInfo.rootTitle;
}

async function openAlienHandScene(game: GameTestContext, page: Page): Promise<void> {
    await game.openTestGame('smashup', {}, 20000);
    await game.setupScene({
        gameId: 'smashup',
        player0: {
            hand: [...ALIEN_CARD_IDS],
            deck: [],
            discard: [],
            actionsPlayed: 0,
            actionLimit: 1,
            minionsPlayed: 0,
            minionLimit: 1,
        },
        player1: {
            hand: [],
            deck: [],
            discard: [],
        },
        bases: BASES.map((defId) => ({
            defId,
            minions: [],
            ongoingActions: [],
        })),
        currentPlayer: '0',
        phase: 'playCards',
    });

    await expect(page.getByTestId('su-hand-area')).toBeVisible({ timeout: 10000 });
    await expect.poll(async () => {
        const player = await game.getPlayerState('0');
        return player?.hand?.map((card: { defId: string }) => card.defId) ?? [];
    }).toEqual([...ALIEN_CARD_IDS]);
}

test.describe('SmashUp alien card names', () => {
    test('binds the correct title text for key alien action cards in hand', async ({ page, game }, testInfo) => {
        await openAlienHandScene(game, page);

        const player = await game.getPlayerState('0');

        for (const card of ALIEN_CARDS) {
            const handCard = player.hand.find((entry: { defId: string; uid: string }) => entry.defId === card.defId);
            expect(handCard, `Card missing from hand: ${card.defId}`).toBeTruthy();
            const cardLocator = page.locator(`[data-card-uid="${handCard.uid}"]`);
            await expect(cardLocator).toBeVisible({ timeout: 5000 });

            await expect.poll(
                async () => resolveDisplayedTitle(await readCardTitleInfo(page, handCard.uid)),
                { timeout: 5000 },
            ).toBe(card.name);

            const titleInfo = await readCardTitleInfo(page, handCard.uid);
            const displayedTitle = resolveDisplayedTitle(titleInfo);
            expect(displayedTitle, `Incorrect title for ${card.defId}`).toBe(card.name);
            if (card.nameEn) {
                expect(displayedTitle).not.toBe(card.nameEn);
            }
        }

        await game.screenshot('alien-card-names-hand', testInfo);
    });
});
