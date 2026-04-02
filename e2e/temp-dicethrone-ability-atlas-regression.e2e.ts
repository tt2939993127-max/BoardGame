import { test, expect } from './framework';
import type { Page } from '@playwright/test';

async function waitForHandReady(page: Page, expectedCount: number): Promise<void> {
  await page.waitForFunction((count) => {
    const handArea = document.querySelector('[data-testid="hand-area"]');
    if (!handArea) return false;
    const cards = Array.from(handArea.querySelectorAll('[data-card-id]'));
    return cards.length === count
      && cards.every((card) => card.getAttribute('data-is-flipped') === 'true')
      && handArea.querySelectorAll('.atlas-shimmer').length === 0;
  }, expectedCount, { timeout: 15000, polling: 100 });
}

async function collectHandDiag(page: Page) {
  return await page.evaluate(() => {
    const handArea = document.querySelector('[data-testid="hand-area"]');
    if (!handArea) return { missing: true };
    const cards = Array.from(handArea.querySelectorAll('[data-card-id]')).map((card) => {
      const atlasDiv = Array.from(card.querySelectorAll('div')).find((node) => {
        const bg = window.getComputedStyle(node as HTMLElement).backgroundImage;
        return bg.includes('ability-cards.webp');
      }) as HTMLElement | undefined;
      return {
        cardId: card.getAttribute('data-card-id'),
        hasAbilityAtlas: Boolean(atlasDiv),
        atlasBackgroundImage: atlasDiv ? window.getComputedStyle(atlasDiv).backgroundImage : null,
      };
    });
    return {
      missing: false,
      shimmerCount: handArea.querySelectorAll('.atlas-shimmer').length,
      cards,
    };
  });
}

async function setupHeroScene(page: Page, game: any, heroId: 'samurai' | 'gunslinger', hand: string[]) {
  await game.setupScene({
    gameId: 'dicethrone',
    player0: {
      hand,
      resources: { CP: 10, HP: 50 },
    },
    player1: {
      resources: { HP: 50 },
    },
    currentPlayer: '0',
    phase: 'main1',
    extra: {
      selectedCharacters: { '0': heroId, '1': 'barbarian' },
      hostStarted: true,
    },
  });

  await game.waitForPhase('main1', 10000);
  await waitForHandReady(page, hand.length);
}

test.describe('DiceThrone ability atlas regression', () => {
  test('samurai and gunslinger hands should render from ability atlas without shimmer', async ({ page, game }, testInfo) => {
    test.setTimeout(120000);
    await game.openTestGame('dicethrone');

    await setupHeroScene(page, game, 'samurai', [
      'upgrade-solemnity-2',
      'upgrade-masamune-2',
      'upgrade-slot-06-2',
    ]);

    const samuraiDiag = await collectHandDiag(page);
    console.log('samurai-ability-atlas-diag:', JSON.stringify(samuraiDiag));
    expect(samuraiDiag).toMatchObject({ missing: false, shimmerCount: 0 });
    expect(samuraiDiag.cards.every((card: any) => card.hasAbilityAtlas)).toBe(true);
    await page.screenshot({ path: testInfo.outputPath('samurai-ability-atlas.png'), fullPage: true });

    await setupHeroScene(page, game, 'gunslinger', [
      'upgrade-fan-the-hammer-2',
      'card-pistol-whip',
      'upgrade-slot-05-2',
    ]);

    const gunslingerDiag = await collectHandDiag(page);
    console.log('gunslinger-ability-atlas-diag:', JSON.stringify(gunslingerDiag));
    expect(gunslingerDiag).toMatchObject({ missing: false, shimmerCount: 0 });
    expect(gunslingerDiag.cards.every((card: any) => card.hasAbilityAtlas)).toBe(true);
    await page.screenshot({ path: testInfo.outputPath('gunslinger-ability-atlas.png'), fullPage: true });
  });
});
