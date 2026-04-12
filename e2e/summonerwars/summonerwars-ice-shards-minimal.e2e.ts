import { test, expect } from '../framework';
import { applyCoreState } from '../helpers/summonerwars';
import type { CellCoord, SummonerWarsCore, UnitCard } from '../src/games/summonerwars/domain/types';
import { createDeckByFactionId } from '../src/games/summonerwars/config/factions';
import { canActivateAbility } from '../src/games/summonerwars/domain/abilityHelpers';
import { getUnitAbilities } from '../src/games/summonerwars/domain/helpers';
import { createInitializedCore, placeTestUnit, resetInstanceCounter } from '../src/games/summonerwars/__tests__/test-helpers';

const deterministicRandom = {
  shuffle: <T>(arr: T[]) => [...arr],
  random: () => 0.5,
  d: () => 1,
  range: (min: number) => min,
};

const adjacentOffsets = [
  { row: -1, col: 0 },
  { row: 1, col: 0 },
  { row: 0, col: -1 },
  { row: 0, col: 1 },
];

const hasEnemyAdjacentToAllyStructure = (core: SummonerWarsCore, playerId: string): boolean => {
  for (let row = 0; row < core.board.length; row++) {
    for (let col = 0; col < core.board[row].length; col++) {
      const structure = core.board[row][col]?.structure;
      const structureUnit = core.board[row][col]?.unit;
      const isAlly = (structure && structure.owner === playerId)
        || (structureUnit && structureUnit.owner === playerId && (structureUnit.card.abilities ?? []).includes('mobile_structure'));
      if (!isAlly) continue;
      for (const offset of adjacentOffsets) {
        const adjRow = row + offset.row;
        const adjCol = col + offset.col;
        const adj = core.board[adjRow]?.[adjCol];
        if (!adj?.unit) continue;
        if (adj.unit.owner !== playerId) return true;
      }
    }
  }
  return false;
};

const findIceShardsCard = (): UnitCard => {
  const card = createDeckByFactionId('frost').deck.find(
    (entry): entry is UnitCard => entry.cardType === 'unit' && !!entry.abilities?.includes('ice_shards'),
  );
  if (!card) {
    throw new Error('未找到 ice_shards 对应单位');
  }
  return card;
};

const findEnemyUnitCard = (): UnitCard => {
  const card = createDeckByFactionId('necromancer').deck.find(
    (entry): entry is UnitCard => entry.cardType === 'unit',
  );
  if (!card) {
    throw new Error('未找到敌方测试单位');
  }
  return card;
};

const buildIceShardsSmokeCore = (): { core: SummonerWarsCore; enemyPos: CellCoord; gatePos: CellCoord } => {
  resetInstanceCounter();
  const core = createInitializedCore(['0', '1'], deterministicRandom, {
    faction0: 'frost',
    faction1: 'necromancer',
  });

  core.phase = 'build';
  core.currentPlayer = '0';
  core.selectedUnit = undefined;
  core.turnNumber = 99;
  core.abilityUsageCount = {};

  const gatePos = (() => {
    for (let row = 0; row < core.board.length; row++) {
      for (let col = 0; col < core.board[row].length; col++) {
        const structure = core.board[row][col]?.structure;
        if (structure && structure.owner === '0') {
          return { row, col };
        }
      }
    }
    return null;
  })();

  if (!gatePos) {
    throw new Error('未找到己方城门位置');
  }

  let enemyPos: CellCoord | null = null;
  for (const offset of adjacentOffsets) {
    const row = gatePos.row + offset.row;
    const col = gatePos.col + offset.col;
    if (row < 0 || row >= core.board.length || col < 0 || col >= core.board[row].length) {
      continue;
    }
    core.board[row][col] = {};
    enemyPos = { row, col };
    break;
  }

  if (!enemyPos) {
    throw new Error('未找到可放置敌方单位的相邻格');
  }

  placeTestUnit(core, { row: 4, col: 2 }, {
    card: findIceShardsCard(),
    owner: '0',
    boosts: 2,
  });

  placeTestUnit(core, enemyPos, {
    card: findEnemyUnitCard(),
    owner: '1',
  });

  return { core, enemyPos, gatePos };
};

test.describe('召唤师战争 - ice_shards 最小化链路', () => {
  test('build 结束时出现 confirm/skip 选择', async ({ page, game }, testInfo) => {
    await game.openTestGame('summonerwars');

    const { core, enemyPos, gatePos } = buildIceShardsSmokeCore();
    const hasEnemyAdjacentToGate = adjacentOffsets.some((offset) =>
      enemyPos.row === gatePos.row + offset.row && enemyPos.col === gatePos.col + offset.col,
    );
    console.log('[ice_shards] gatePos', gatePos, 'enemyPos', enemyPos, 'adjacent', hasEnemyAdjacentToGate);
    console.log('[ice_shards] hasEnemyAdjacentToAllyStructure', hasEnemyAdjacentToAllyStructure(core, '0'));
    const units = core.board.flatMap((row) => row.map((cell) => cell.unit).filter(Boolean)) as NonNullable<
      SummonerWarsCore['board'][number][number]['unit']
    >[];
    const iceShardsUnit = units.find((unit) => getUnitAbilities(unit, core).includes('ice_shards'));
    const canActivate = iceShardsUnit
      ? canActivateAbility(core, iceShardsUnit, 'ice_shards', '0')
      : false;
    console.log('[ice_shards] unitFound', !!iceShardsUnit, 'canActivate', canActivate, 'boosts', iceShardsUnit?.boosts);
    const baseState = await game.getState();
    await applyCoreState(page, {
      ...(baseState ?? {}),
      core,
      sys: {
        ...(baseState?.sys ?? {}),
        phase: core.phase,
        flowHalted: false,
        summonerWars: {
          ...(baseState?.sys?.summonerWars ?? {}),
          phaseEndAbilityResolved: {},
        },
        interaction: {
          ...(baseState?.sys?.interaction ?? {}),
          current: null,
          queue: [],
        },
      },
    });

    await expect(page.getByTestId('sw-map-container')).toBeVisible({ timeout: 10000 });
    await expect(page.getByTestId('sw-end-phase')).toBeVisible({ timeout: 5000 });

    const beforeClickState = await game.getState();
    const beforeResolvedKeys = Object.keys(beforeClickState?.sys?.summonerWars?.phaseEndAbilityResolved ?? {});
    console.log('[ice_shards] before click sys', {
      sysPhase: beforeClickState?.sys?.phase,
      flowHalted: beforeClickState?.sys?.flowHalted,
      resolvedCount: beforeResolvedKeys.length,
    });

    const injectedState = await game.getState();
    expect(injectedState?.core?.board?.[enemyPos.row]?.[enemyPos.col]?.unit?.owner).toBe('1');

    await page.getByTestId('sw-end-phase').click();

    const afterClickState = await game.getState();
    const afterResolvedKeys = Object.keys(afterClickState?.sys?.summonerWars?.phaseEndAbilityResolved ?? {});
    const currentInteraction = afterClickState?.sys?.interaction?.current;
    const interactionData = currentInteraction?.data as { sw?: { type?: string } } | undefined;
    console.log('[ice_shards] after click state', {
      phase: afterClickState?.core?.phase,
      currentPlayer: afterClickState?.core?.currentPlayer,
      flowHalted: afterClickState?.sys?.flowHalted,
      resolvedCount: afterResolvedKeys.length,
      interactionId: currentInteraction?.id,
      interactionKind: currentInteraction?.kind,
      interactionSwType: interactionData?.sw?.type,
    });

    await expect(page.getByRole('button', { name: /^(确认|Confirm)$/i })).toBeVisible({ timeout: 5000 });
    await expect(page.getByRole('button', { name: /^(跳过|Skip)$/i })).toBeVisible({ timeout: 5000 });

    await game.screenshot('ice-shards-phase-end-choice', testInfo);
  });
});
