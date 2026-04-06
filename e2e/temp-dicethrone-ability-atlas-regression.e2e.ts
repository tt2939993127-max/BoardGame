import { mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { test, expect } from './framework';
import type { Page } from '@playwright/test';

type HandDiagCard = {
  cardId: string | null;
  hasExpectedAsset: boolean;
  observedAsset: string | null;
};

type HandDiag = {
  missing: boolean;
  shimmerCount?: number;
  cards?: HandDiagCard[];
};

type TestGameController = {
  openTestGame: (gameId: string) => Promise<void>;
  setupScene: (scene: Record<string, unknown>) => Promise<void>;
  waitForPhase: (phase: string, timeoutMs?: number) => Promise<void>;
};

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

async function collectHandDiag(page: Page, expectedAssets: Record<string, string>): Promise<HandDiag> {
  return await page.evaluate((assetMap) => {
    const handArea = document.querySelector('[data-testid="hand-area"]');
    if (!handArea) return { missing: true };
    const cards = Array.from(handArea.querySelectorAll('[data-card-id]')).map((card) => {
      const cardId = card.getAttribute('data-card-id');
      const expectedAsset = cardId ? assetMap[cardId] : null;
      const targetNode = Array.from(card.querySelectorAll('*')).find((node) => {
        if (!expectedAsset) return false;
        if (node instanceof HTMLImageElement) {
          const candidates = [
            node.currentSrc,
            node.getAttribute('src'),
            node.getAttribute('data-debug-current-src'),
            node.getAttribute('data-debug-rendered-src'),
          ].filter(Boolean);
          return candidates.some((candidate) => candidate?.includes(expectedAsset));
        }
        if (node instanceof HTMLElement) {
          const bg = window.getComputedStyle(node).backgroundImage;
          return Boolean(bg) && bg.includes(expectedAsset);
        }
        return false;
      });
      const observedAsset = targetNode instanceof HTMLImageElement
        ? targetNode.getAttribute('data-debug-current-src')
          || targetNode.getAttribute('data-debug-rendered-src')
          || targetNode.getAttribute('src')
          || targetNode.currentSrc
        : targetNode instanceof HTMLElement
          ? window.getComputedStyle(targetNode).backgroundImage
          : null;
      return {
        cardId,
        hasExpectedAsset: Boolean(targetNode),
        observedAsset,
      };
    });
    return {
      missing: false,
      shimmerCount: handArea.querySelectorAll('.atlas-shimmer').length,
      cards,
    };
  }, expectedAssets);
}

async function setupHeroScene(
  page: Page,
  game: TestGameController,
  heroId: 'samurai' | 'gunslinger',
  hand: string[],
) {
  await game.openTestGame('dicethrone');
  await game.setupScene({
    gameId: 'dicethrone',
    player0: {
      hand,
      discard: [],
      resources: { cp: 10, hp: 50 },
    },
    player1: {
      hand: [],
      discard: [],
      resources: { cp: 2, hp: 50 },
    },
    currentPlayer: '0',
    phase: 'main1',
    extra: {
      selectedCharacters: { '0': heroId, '1': 'barbarian' },
      hostStarted: true,
      pendingAttack: null,
      pendingDamage: undefined,
      rollCount: 0,
      rollConfirmed: false,
    },
  });

  await game.waitForPhase('main1', 10000);
  await expect.poll(async () => {
    const state = await (game as any).getState();
    const handIds = state?.core?.players?.['0']?.hand?.map((card: any) => card.id) ?? [];
    return {
      phase: state?.sys?.phase ?? null,
      activePlayerId: state?.core?.activePlayerId ?? null,
      characterId: state?.core?.selectedCharacters?.['0'] ?? null,
      cp: state?.core?.players?.['0']?.resources?.cp
        ?? state?.core?.players?.['0']?.resources?.CP
        ?? null,
      hp: state?.core?.players?.['0']?.resources?.hp
        ?? state?.core?.players?.['0']?.resources?.HP
        ?? null,
      handIds,
    };
  }, { timeout: 10000 }).toMatchObject({
    phase: 'main1',
    activePlayerId: '0',
    characterId: heroId,
    handIds: hand,
  });

  await page.evaluate(() => {
    (window as any).__BG_LAST_COMMAND_REJECTED__ = null;
  });

  await waitForHandReady(page, hand.length);
}

async function injectOffensiveRollDice(
  page: Page,
  game: TestGameController,
  values: number[],
  playerId = '0',
  definitionId = 'gunslinger-dice',
) {
  await page.evaluate(async ({ values, playerId, definitionId }) => {
    const harness = (window as any).__BG_TEST_HARNESS__;
    const state = harness?.state?.get?.();
    if (!harness || !state) {
      throw new Error('TestHarness state not ready');
    }

    const { getDieFaceByValue } = await import('/src/games/dicethrone/domain/diceRegistry.ts');
    const nextDice = values.map((value, index) => {
      const face = getDieFaceByValue(definitionId, value);
      return {
        id: index,
        definitionId,
        value,
        symbol: face?.symbol ?? null,
        symbols: face?.symbols ?? (face?.symbol ? [face.symbol] : []),
        isKept: false,
      };
    });

    harness.state.set({
      ...state,
      sys: {
        ...state.sys,
        phase: 'offensiveRoll',
        interaction: {
          current: undefined,
          queue: [],
        },
      },
      core: {
        ...state.core,
        activePlayerId: playerId,
        dice: nextDice,
        rollCount: 1,
        rollConfirmed: true,
        pendingAttack: null,
        pendingDamage: undefined,
      },
    });
    (window as any).__BG_LAST_COMMAND_REJECTED__ = null;
  }, { values, playerId, definitionId });

  await game.waitForPhase('offensiveRoll', 10000);
}

test.describe('DiceThrone hand card preview regression', () => {
  test('samurai and gunslinger hand cards should use ability atlas without shimmer', async ({ page, game }) => {
    test.setTimeout(120000);
    await game.openTestGame('dicethrone');
    const evidenceDir = join(process.cwd(), 'test-results', 'evidence-screenshots', 'dicethrone-hand-preview-regression');
    mkdirSync(evidenceDir, { recursive: true });

    await setupHeroScene(page, game, 'samurai', [
      'upgrade-solemnity-2',
      'upgrade-budo-2',
      'upgrade-masamune-2',
    ]);

    const samuraiDiag = await collectHandDiag(page, {
      'upgrade-solemnity-2': 'ability-cards.webp',
      'upgrade-budo-2': 'ability-cards.webp',
      'upgrade-masamune-2': 'ability-cards.webp',
    });
    console.log('samurai-hand-preview-diag:', JSON.stringify(samuraiDiag));
    expect(samuraiDiag).toMatchObject({ missing: false, shimmerCount: 0 });
    expect(samuraiDiag.cards?.every((card) => card.hasExpectedAsset)).toBe(true);
    await page.screenshot({ path: join(evidenceDir, 'samurai-hand-preview.png'), fullPage: true });

    await setupHeroScene(page, game, 'gunslinger', [
      'upgrade-fan-the-hammer-2',
      'card-pistol-whip',
      'upgrade-duel-2',
    ]);

    const gunslingerDiag = await collectHandDiag(page, {
      'upgrade-fan-the-hammer-2': 'ability-cards.webp',
      'card-pistol-whip': 'ability-cards.webp',
      'upgrade-duel-2': 'ability-cards.webp',
    });
    console.log('gunslinger-hand-preview-diag:', JSON.stringify(gunslingerDiag));
    expect(gunslingerDiag).toMatchObject({ missing: false, shimmerCount: 0 });
    expect(gunslingerDiag.cards?.every((card) => card.hasExpectedAsset)).toBe(true);
    await page.screenshot({ path: join(evidenceDir, 'gunslinger-hand-preview.png'), fullPage: true });
  });

  test('gunslinger deadeye upgrade should resolve without wrong spotlight in normal play', async ({ page, game }, testInfo) => {
    test.setTimeout(120000);

    await setupHeroScene(page, game, 'gunslinger', [
      'upgrade-deadeye-2',
    ]);

    const handDiag = await collectHandDiag(page, {
      'upgrade-deadeye-2': 'ability-cards.webp',
    });
    expect(handDiag).toMatchObject({ missing: false, shimmerCount: 0 });
    expect(handDiag.cards?.some((card) => card.cardId === 'upgrade-deadeye-2' && card.hasExpectedAsset)).toBe(true);
    await game.screenshot('gunslinger-deadeye-upgrade-hand-before-play', testInfo);

    const handCard = page.locator('[data-testid="hand-area"] [data-card-id="upgrade-deadeye-2"]').first();
    await expect(handCard).toBeVisible({ timeout: 10000 });
    await handCard.click();

    await expect.poll(async () => {
      const state = await (game as any).getState();
      const player = state?.core?.players?.['0'];
      return {
        reject: await page.evaluate(() => (window as any).__BG_LAST_COMMAND_REJECTED__ ?? null),
        phase: state?.sys?.phase ?? null,
      deadeyeLevel: player?.abilityLevels?.deadeye ?? 0,
      cp: player?.resources?.cp ?? null,
      handIds: player?.hand?.map((card: any) => card.id) ?? [],
      discardIds: player?.discard?.map((card: any) => card.id) ?? [],
      upgradeCard: player?.upgradeCardByAbilityId?.deadeye ?? null,
      lastEventTypes: (state?.sys?.eventStream?.entries ?? [])
        .slice(-6)
        .map((entry: any) => entry?.event?.type ?? null),
    };
  }, { timeout: 15000 }).toMatchObject({
      reject: null,
      phase: 'main1',
      deadeyeLevel: 2,
      cp: 8,
      handIds: [],
      discardIds: [],
      upgradeCard: {
        cardId: 'upgrade-deadeye-2',
        cpCost: 2,
      },
      lastEventTypes: ['CP_CHANGED', 'CARD_PLAYED', 'ABILITY_REPLACED'],
    });

    await expect(page.locator('[data-testid="card-spotlight-overlay"]')).toBeHidden({ timeout: 1000 });
    await expect(page.locator('[data-testid="bonus-die-overlay"]')).toBeHidden({ timeout: 1000 });
    await game.screenshot('gunslinger-deadeye-upgrade-after-play', testInfo);
  });

  test('gunslinger fan-the-hammer upgrade should resolve as upgrade in normal play', async ({ page, game }, testInfo) => {
    test.setTimeout(120000);

    await setupHeroScene(page, game, 'gunslinger', [
      'upgrade-fan-the-hammer-2',
    ]);

    const handDiag = await collectHandDiag(page, {
      'upgrade-fan-the-hammer-2': 'ability-cards.webp',
    });
    expect(handDiag).toMatchObject({ missing: false, shimmerCount: 0 });
    expect(handDiag.cards?.some((card) => card.cardId === 'upgrade-fan-the-hammer-2' && card.hasExpectedAsset)).toBe(true);
    await game.screenshot('gunslinger-fan-the-hammer-upgrade-hand-before-play', testInfo);

    const handCard = page.locator('[data-testid="hand-area"] [data-card-id="upgrade-fan-the-hammer-2"]').first();
    await expect(handCard).toBeVisible({ timeout: 10000 });
    await handCard.click();

    await expect.poll(async () => {
      const state = await (game as any).getState();
      const player = state?.core?.players?.['0'];
      return {
        reject: await page.evaluate(() => (window as any).__BG_LAST_COMMAND_REJECTED__ ?? null),
        phase: state?.sys?.phase ?? null,
        fanTheHammerLevel: player?.abilityLevels?.['fan-the-hammer'] ?? 0,
        cp: player?.resources?.cp ?? null,
        handIds: player?.hand?.map((card: any) => card.id) ?? [],
        discardIds: player?.discard?.map((card: any) => card.id) ?? [],
        upgradeCard: player?.upgradeCardByAbilityId?.['fan-the-hammer'] ?? null,
        lastEventTypes: (state?.sys?.eventStream?.entries ?? [])
          .slice(-6)
          .map((entry: any) => entry?.event?.type ?? null),
      };
    }, { timeout: 15000 }).toMatchObject({
      reject: null,
      phase: 'main1',
      fanTheHammerLevel: 2,
      cp: 8,
      handIds: [],
      discardIds: [],
      upgradeCard: {
        cardId: 'upgrade-fan-the-hammer-2',
        cpCost: 2,
      },
      lastEventTypes: ['CP_CHANGED', 'CARD_PLAYED', 'ABILITY_REPLACED'],
    });

    await expect(page.locator('[data-testid="card-spotlight-overlay"]')).toBeHidden({ timeout: 1000 });
    await expect(page.locator('[data-testid="bonus-die-overlay"]')).toBeHidden({ timeout: 1000 });
    await game.screenshot('gunslinger-fan-the-hammer-upgrade-after-play', testInfo);
  });

  test('gunslinger fan-the-hammer upgraded slot should still deal 8 damage when selected in UI', async ({ page, game }, testInfo) => {
    test.setTimeout(120000);

    await setupHeroScene(page, game, 'gunslinger', [
      'upgrade-fan-the-hammer-2',
    ]);

    const handCard = page.locator('[data-testid="hand-area"] [data-card-id="upgrade-fan-the-hammer-2"]').first();
    await expect(handCard).toBeVisible({ timeout: 10000 });
    await handCard.click();

    await expect.poll(async () => {
      const state = await (game as any).getState();
      const player = state?.core?.players?.['0'];
      return {
        reject: await page.evaluate(() => (window as any).__BG_LAST_COMMAND_REJECTED__ ?? null),
        phase: state?.sys?.phase ?? null,
        fanTheHammerLevel: player?.abilityLevels?.['fan-the-hammer'] ?? 0,
      };
    }, { timeout: 15000 }).toMatchObject({
      reject: null,
      phase: 'main1',
      fanTheHammerLevel: 2,
    });

    await injectOffensiveRollDice(page, game, [1, 2, 3, 4, 5]);
    await game.screenshot('gunslinger-fan-the-hammer-upgraded-slot-before-select', testInfo);

    const upgradedSlot = page.locator('[data-ability-slot="calm"]').first();
    await expect(upgradedSlot).toBeVisible({ timeout: 10000 });
    await upgradedSlot.click();

    await expect.poll(async () => {
      const state = await (game as any).getState();
      const expectedDamage = await page.evaluate(async () => {
        const harness = (window as any).__BG_TEST_HARNESS__;
        const state = harness?.state?.get?.();
        if (!state?.core?.pendingAttack) return null;
        const { getPendingAttackExpectedDamage } = await import('/src/games/dicethrone/domain/utils.ts');
        return getPendingAttackExpectedDamage(state.core, state.core.pendingAttack);
      });
      return {
        reject: await page.evaluate(() => (window as any).__BG_LAST_COMMAND_REJECTED__ ?? null),
        phase: state?.sys?.phase ?? null,
        pendingAttack: state?.core?.pendingAttack
          ? {
            sourceAbilityId: state.core.pendingAttack.sourceAbilityId ?? null,
            expectedDamage,
            attackerId: state.core.pendingAttack.attackerId ?? null,
            defenderId: state.core.pendingAttack.defenderId ?? null,
          }
          : null,
      };
    }, { timeout: 15000 }).toMatchObject({
      reject: null,
      phase: 'offensiveRoll',
      pendingAttack: {
        sourceAbilityId: 'fan-the-hammer',
        expectedDamage: 8,
        attackerId: '0',
        defenderId: '1',
      },
    });

    await game.screenshot('gunslinger-fan-the-hammer-upgraded-slot-after-select', testInfo);
  });
});
