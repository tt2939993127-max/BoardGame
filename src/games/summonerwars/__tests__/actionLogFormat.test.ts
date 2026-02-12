/**
 * 召唤师战争 - ActionLog 格式化测试
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { ActionLogEntry, Command, GameEvent, MatchState } from '../../../engine/types';
import { SW_COMMANDS, SW_EVENTS } from '../domain/types';
import type { SummonerWarsCore } from '../domain/types';
import { formatSummonerWarsActionEntry } from '../actionLog';
import { SPRITE_INDEX as NECRO_SPRITE_INDEX } from '../config/factions/necromancer';
import i18n from '../../../lib/i18n';

const formatMockText = (key: string, params?: Record<string, string | number>) => {
  if (!params || Object.keys(params).length === 0) return String(key);
  const serialized = Object.entries(params)
    .map(([paramKey, value]) => `${paramKey}=${value}`)
    .join(',');
  return `${key}:${serialized}`;
};

beforeEach(() => {
  vi.spyOn(i18n, 't').mockImplementation((...args) => {
    const [key, params] = args as [unknown, Record<string, string | number> | undefined];
    return formatMockText(String(key), params);
  });
});

afterEach(() => {
  vi.restoreAllMocks();
});

const normalizeEntries = (result: ActionLogEntry | ActionLogEntry[] | null): ActionLogEntry[] => {
  if (!result) return [];
  return Array.isArray(result) ? result : [result];
};

const createCore = (): SummonerWarsCore => ({
  board: [],
  players: {} as SummonerWarsCore['players'],
  phase: 'summon',
  currentPlayer: '0',
  turnNumber: 1,
  selectedFactions: { '0': 'necromancer', '1': 'trickster' },
  readyPlayers: { '0': true, '1': true },
  hostPlayerId: '0',
  hostStarted: true,
});

describe('formatSummonerWarsActionEntry', () => {
  it('ACTIVATE_ABILITY 带来源与目标卡牌', () => {
    const command: Command = {
      type: SW_COMMANDS.ACTIVATE_ABILITY,
      playerId: '0',
      payload: {
        abilityId: 'revive_undead',
        sourceUnitId: 'necro-elut-bar-0',
        targetCardId: 'necro-funeral-pyre-0-1',
      },
    };

    const entry = normalizeEntries(formatSummonerWarsActionEntry({
      command,
      state: { core: createCore() } as MatchState<SummonerWarsCore>,
      events: [] as GameEvent[],
    }));

    const cardSegments = entry[0].segments.filter((segment) => segment.type === 'card');
    expect(cardSegments).toHaveLength(2);
    expect(cardSegments[0]).toMatchObject({
      cardId: 'necro-elut-bar-0',
      previewText: '伊路特-巴尔',
    });
    expect(cardSegments[1]).toMatchObject({
      cardId: 'necro-funeral-pyre-0-1',
      previewText: '殉葬火堆',
    });
  });

  it('MOVE_UNIT 使用 UNIT_MOVED 事件解析移动单位', () => {
    const command: Command = {
      type: SW_COMMANDS.MOVE_UNIT,
      playerId: '0',
      payload: { from: { row: 1, col: 1 }, to: { row: 2, col: 1 } },
    };

    const entry = normalizeEntries(formatSummonerWarsActionEntry({
      command,
      state: { core: createCore() } as MatchState<SummonerWarsCore>,
      events: [
        {
          type: SW_EVENTS.UNIT_MOVED,
          payload: { unitId: 'necro-elut-bar-0' },
          timestamp: 1,
        } as GameEvent,
      ],
    }));

    const cardSegment = entry[0].segments.find((segment) => segment.type === 'card');
    expect(cardSegment).toMatchObject({
      cardId: 'necro-elut-bar-0',
      previewText: '伊路特-巴尔',
    });
  });

  it('SUMMON_UNIT 生成卡牌片段与坐标', () => {
    const command: Command = {
      type: SW_COMMANDS.SUMMON_UNIT,
      playerId: '0',
      payload: { cardId: 'necro-funeral-pyre-0-1', position: { row: 0, col: 2 } },
    };

    const entry = normalizeEntries(formatSummonerWarsActionEntry({
      command,
      state: { core: createCore() } as MatchState<SummonerWarsCore>,
      events: [] as GameEvent[],
    }));

    expect(entry[0].segments.some((segment) => segment.type === 'card' && segment.cardId === 'necro-funeral-pyre-0-1')).toBe(true);
    const positionLabel = i18n.t('game-summonerwars:actionLog.position', { row: 1, col: 3 });
    expect(entry[0].segments.some((segment) => segment.type === 'text' && segment.text.includes(positionLabel))).toBe(true);
  });

  it('DISCARD_FOR_MAGIC 包含多张卡牌', () => {
    const command: Command = {
      type: SW_COMMANDS.DISCARD_FOR_MAGIC,
      playerId: '0',
      payload: {
        cardIds: ['necro-funeral-pyre-0-1', 'necro-hellfire-blade-0'],
      },
    };

    const entry = normalizeEntries(formatSummonerWarsActionEntry({
      command,
      state: { core: createCore() } as MatchState<SummonerWarsCore>,
      events: [] as GameEvent[],
    }));

    const cardSegments = entry[0].segments.filter((segment) => segment.type === 'card');
    expect(cardSegments).toHaveLength(2);
    expect(cardSegments.map((segment) => segment.cardId)).toEqual([
      'necro-funeral-pyre-0-1',
      'necro-hellfire-blade-0',
    ]);
  });

  it('cardPreviewHelper 事件卡使用正确精灵索引', () => {
    const command: Command = {
      type: SW_COMMANDS.PLAY_EVENT,
      playerId: '0',
      payload: { cardId: 'necro-funeral-pyre-0-1' },
    };

    const entry = normalizeEntries(formatSummonerWarsActionEntry({
      command,
      state: { core: createCore() } as MatchState<SummonerWarsCore>,
      events: [] as GameEvent[],
    }));

    const cardSegment = entry[0].segments.find((segment) => segment.type === 'card');
    expect(cardSegment?.cardId).toBe('necro-funeral-pyre-0-1');
    expect(NECRO_SPRITE_INDEX.EVENT_FUNERAL_PYRE).toBeGreaterThanOrEqual(0);
  });

  it('UNIT_DAMAGED 生成事件日志', () => {
    const command: Command = {
      type: SW_COMMANDS.SUMMON_UNIT,
      playerId: '0',
      payload: { cardId: 'necro-undead-warrior-0', position: { row: 0, col: 0 } },
    };

    const result = normalizeEntries(formatSummonerWarsActionEntry({
      command,
      state: { core: createCore() } as MatchState<SummonerWarsCore>,
      events: [
        {
          type: SW_EVENTS.UNIT_DAMAGED,
          payload: { position: { row: 0, col: 0 }, damage: 2, cardId: 'necro-undead-warrior-0' },
          timestamp: 2,
        } as GameEvent,
      ],
    }));

    const damagedEntry = result.find((entry) => entry.kind === SW_EVENTS.UNIT_DAMAGED);
    expect(damagedEntry).toBeTruthy();
    const expectedText = i18n.t('game-summonerwars:actionLog.unitDamaged', { amount: 2 });
    const text = damagedEntry?.segments
      .map((segment) => (segment.type === 'text' ? segment.text : ''))
      .join('');
    expect(text).toContain(expectedText);
  });

  it('CONTROL_TRANSFERRED 记录控制权转移', () => {
    const command: Command = {
      type: SW_COMMANDS.MOVE_UNIT,
      playerId: '0',
      payload: { from: { row: 0, col: 0 }, to: { row: 0, col: 1 } },
    };

    const result = normalizeEntries(formatSummonerWarsActionEntry({
      command,
      state: { core: createCore() } as MatchState<SummonerWarsCore>,
      events: [
        {
          type: SW_EVENTS.CONTROL_TRANSFERRED,
          payload: { targetPosition: { row: 0, col: 0 }, targetUnitId: 'necro-undead-warrior-0', newOwner: '1', temporary: true },
          timestamp: 3,
        } as GameEvent,
      ],
    }));

    const controlEntry = result.find((entry) => entry.kind === SW_EVENTS.CONTROL_TRANSFERRED);
    expect(controlEntry).toBeTruthy();
    const expectedText = i18n.t('game-summonerwars:actionLog.controlTransferred', {
      player: i18n.t('game-summonerwars:actionLog.playerLabel', { playerId: '1' }),
    });
    const text = controlEntry?.segments
      .map((segment) => (segment.type === 'text' ? segment.text : ''))
      .join('');
    expect(text).toContain(expectedText);
    expect(text).toContain(i18n.t('game-summonerwars:actionLog.controlTransferredTemporary'));
  });
});
