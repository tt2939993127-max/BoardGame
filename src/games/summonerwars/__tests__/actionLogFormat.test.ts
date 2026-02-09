/**
 * 召唤师战争 - ActionLog 格式化测试
 */

import { describe, expect, it } from 'vitest';
import type { ActionLogEntry, Command, GameEvent, MatchState } from '../../../engine/types';
import { SW_COMMANDS, SW_EVENTS } from '../domain/types';
import type { SummonerWarsCore } from '../domain/types';
import { formatSummonerWarsActionEntry } from '../game';
import { SPRITE_INDEX as NECRO_SPRITE_INDEX } from '../config/factions/necromancer';

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

    const entry = formatSummonerWarsActionEntry({
      command,
      state: { core: createCore() } as MatchState<SummonerWarsCore>,
      events: [] as GameEvent[],
    }) as ActionLogEntry;

    const cardSegments = entry.segments.filter((segment) => segment.type === 'card');
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

    const entry = formatSummonerWarsActionEntry({
      command,
      state: { core: createCore() } as MatchState<SummonerWarsCore>,
      events: [
        {
          type: SW_EVENTS.UNIT_MOVED,
          payload: { unitId: 'necro-elut-bar-0' },
          timestamp: 1,
        } as GameEvent,
      ],
    }) as ActionLogEntry;

    const cardSegment = entry.segments.find((segment) => segment.type === 'card');
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

    const entry = formatSummonerWarsActionEntry({
      command,
      state: { core: createCore() } as MatchState<SummonerWarsCore>,
      events: [] as GameEvent[],
    }) as ActionLogEntry;

    expect(entry.segments.some((segment) => segment.type === 'card' && segment.cardId === 'necro-funeral-pyre-0-1')).toBe(true);
    expect(entry.segments.some((segment) => segment.type === 'text' && segment.text.includes('1,3'))).toBe(true);
  });

  it('DISCARD_FOR_MAGIC 包含多张卡牌', () => {
    const command: Command = {
      type: SW_COMMANDS.DISCARD_FOR_MAGIC,
      playerId: '0',
      payload: {
        cardIds: ['necro-funeral-pyre-0-1', 'necro-hellfire-blade-0'],
      },
    };

    const entry = formatSummonerWarsActionEntry({
      command,
      state: { core: createCore() } as MatchState<SummonerWarsCore>,
      events: [] as GameEvent[],
    }) as ActionLogEntry;

    const cardSegments = entry.segments.filter((segment) => segment.type === 'card');
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

    const entry = formatSummonerWarsActionEntry({
      command,
      state: { core: createCore() } as MatchState<SummonerWarsCore>,
      events: [] as GameEvent[],
    }) as ActionLogEntry;

    const cardSegment = entry.segments.find((segment) => segment.type === 'card');
    expect(cardSegment?.cardId).toBe('necro-funeral-pyre-0-1');
    expect(NECRO_SPRITE_INDEX.EVENT_FUNERAL_PYRE).toBeGreaterThanOrEqual(0);
  });
});
