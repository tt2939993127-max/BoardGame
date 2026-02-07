/**
 * 召唤师战争 - 欺心巫族 execute 流程补充测试
 *
 * 覆盖 abilities-trickster.test.ts 中缺失的 ACTIVATE_ABILITY 流程：
 * - mind_capture_resolve（心灵捕获决策）：控制 vs 伤害
 * - telekinesis / high_telekinesis（念力/高阶念力）：推拉目标
 * - mind_transmission（读心传念）：给友方士兵额外攻击
 */

import { describe, it, expect } from 'vitest';
import { SummonerWarsDomain, SW_COMMANDS, SW_EVENTS } from '../domain';
import type { SummonerWarsCore, CellCoord, BoardUnit, UnitCard, PlayerId } from '../domain/types';
import type { RandomFn, GameEvent } from '../../../engine/types';
import { createInitializedCore } from './test-helpers';

// ============================================================================
// 辅助函数
// ============================================================================

function createTestRandom(): RandomFn {
  return {
    shuffle: <T>(arr: T[]) => arr,
    random: () => 0.5,
    d: (max: number) => Math.ceil(max / 2),
    range: (min: number, max: number) => Math.floor((min + max) / 2),
  };
}

function createTricksterState(): SummonerWarsCore {
  return createInitializedCore(['0', '1'], createTestRandom(), {
    faction0: 'trickster',
    faction1: 'necromancer',
  });
}

function placeUnit(
  state: SummonerWarsCore,
  pos: CellCoord,
  overrides: Partial<BoardUnit> & { card: UnitCard; owner: PlayerId }
): BoardUnit {
  const unit: BoardUnit = {
    cardId: overrides.cardId ?? `test-${pos.row}-${pos.col}`,
    card: overrides.card,
    owner: overrides.owner,
    position: pos,
    damage: overrides.damage ?? 0,
    boosts: overrides.boosts ?? 0,
    hasMoved: overrides.hasMoved ?? false,
    hasAttacked: overrides.hasAttacked ?? false,
  };
  state.board[pos.row][pos.col].unit = unit;
  return unit;
}

function clearArea(state: SummonerWarsCore, rows: number[], cols: number[]) {
  for (const r of rows) {
    for (const c of cols) {
      state.board[r][c].unit = undefined;
      state.board[r][c].structure = undefined;
    }
  }
}

function makeSummoner(id: string): UnitCard {
  return {
    id, cardType: 'unit', name: '泰珂露', unitClass: 'summoner',
    faction: '欺心巫族', strength: 3, life: 13, cost: 0,
    attackType: 'ranged', attackRange: 3,
    abilities: ['mind_capture'], deckSymbols: [],
  };
}

function makeTelekinetic(id: string): UnitCard {
  return {
    id, cardType: 'unit', name: '掷术师', unitClass: 'common',
    faction: '欺心巫族', strength: 1, life: 4, cost: 1,
    attackType: 'ranged', attackRange: 3,
    abilities: ['evasion', 'rebound', 'telekinesis'], deckSymbols: [],
  };
}

function makeKara(id: string): UnitCard {
  return {
    id, cardType: 'unit', name: '卡拉', unitClass: 'champion',
    faction: '欺心巫族', strength: 4, life: 8, cost: 7,
    attackType: 'ranged', attackRange: 3,
    abilities: ['high_telekinesis', 'stable', 'mind_transmission'], deckSymbols: [],
  };
}

function makeEnemy(id: string, overrides?: Partial<UnitCard>): UnitCard {
  return {
    id, cardType: 'unit', name: '敌方单位', unitClass: 'common',
    faction: '测试', strength: 2, life: 3, cost: 0,
    attackType: 'melee', attackRange: 1, deckSymbols: [],
    ...overrides,
  };
}

function makeAllyCommon(id: string): UnitCard {
  return {
    id, cardType: 'unit', name: '友方士兵', unitClass: 'common',
    faction: '欺心巫族', strength: 2, life: 3, cost: 1,
    attackType: 'melee', attackRange: 1, deckSymbols: [],
  };
}

function executeAndReduce(
  state: SummonerWarsCore,
  commandType: string,
  payload: Record<string, unknown>
): { newState: SummonerWarsCore; events: GameEvent[] } {
  const fullState = { core: state, sys: {} as any };
  const command = { type: commandType, payload, timestamp: Date.now(), playerId: state.currentPlayer };
  const events = SummonerWarsDomain.execute(fullState, command, createTestRandom());
  let newState = state;
  for (const event of events) {
    newState = SummonerWarsDomain.reduce(newState, event);
  }
  return { newState, events };
}


// ============================================================================
// 心灵捕获决策 (mind_capture_resolve) 测试
// ============================================================================

describe('泰珂露 - 心灵捕获决策 (mind_capture_resolve)', () => {
  it('选择控制：转移目标控制权', () => {
    const state = createTricksterState();
    clearArea(state, [3, 4, 5], [1, 2, 3, 4]);

    placeUnit(state, { row: 4, col: 2 }, {
      cardId: 'test-summoner',
      card: makeSummoner('test-summoner'),
      owner: '0',
    });

    placeUnit(state, { row: 4, col: 4 }, {
      cardId: 'test-enemy',
      card: makeEnemy('test-enemy'),
      owner: '1',
    });

    state.phase = 'attack';
    state.currentPlayer = '0';

    const { events, newState } = executeAndReduce(state, SW_COMMANDS.ACTIVATE_ABILITY, {
      abilityId: 'mind_capture_resolve',
      sourceUnitId: 'test-summoner',
      choice: 'control',
      targetPosition: { row: 4, col: 4 },
    });

    // 应有控制权转移事件
    const ctEvents = events.filter(e => e.type === SW_EVENTS.CONTROL_TRANSFERRED);
    expect(ctEvents.length).toBe(1);
    expect((ctEvents[0].payload as any).newOwner).toBe('0');

    // 目标单位应变为玩家0控制
    expect(newState.board[4][4].unit?.owner).toBe('0');
  });

  it('选择伤害：对目标造成伤害', () => {
    const state = createTricksterState();
    clearArea(state, [3, 4, 5], [1, 2, 3, 4]);

    placeUnit(state, { row: 4, col: 2 }, {
      cardId: 'test-summoner',
      card: makeSummoner('test-summoner'),
      owner: '0',
    });

    placeUnit(state, { row: 4, col: 4 }, {
      cardId: 'test-enemy',
      card: makeEnemy('test-enemy', { life: 5 }),
      owner: '1',
    });

    state.phase = 'attack';
    state.currentPlayer = '0';

    const { events, newState } = executeAndReduce(state, SW_COMMANDS.ACTIVATE_ABILITY, {
      abilityId: 'mind_capture_resolve',
      sourceUnitId: 'test-summoner',
      choice: 'damage',
      targetPosition: { row: 4, col: 4 },
      hits: 3,
    });

    // 应有伤害事件
    const damageEvents = events.filter(
      e => e.type === SW_EVENTS.UNIT_DAMAGED
        && (e.payload as any).position?.row === 4
        && (e.payload as any).position?.col === 4
    );
    expect(damageEvents.length).toBe(1);
    expect((damageEvents[0].payload as any).damage).toBe(3);

    // 目标受到3点伤害
    expect(newState.board[4][4].unit?.damage).toBe(3);
  });

  it('选择伤害且致命时消灭目标', () => {
    const state = createTricksterState();
    clearArea(state, [3, 4, 5], [1, 2, 3, 4]);

    placeUnit(state, { row: 4, col: 2 }, {
      cardId: 'test-summoner',
      card: makeSummoner('test-summoner'),
      owner: '0',
    });

    placeUnit(state, { row: 4, col: 4 }, {
      cardId: 'test-enemy',
      card: makeEnemy('test-enemy', { life: 2 }),
      owner: '1',
    });

    state.phase = 'attack';
    state.currentPlayer = '0';

    const { events, newState } = executeAndReduce(state, SW_COMMANDS.ACTIVATE_ABILITY, {
      abilityId: 'mind_capture_resolve',
      sourceUnitId: 'test-summoner',
      choice: 'damage',
      targetPosition: { row: 4, col: 4 },
      hits: 3,
    });

    // 应有消灭事件
    const destroyEvents = events.filter(e => e.type === SW_EVENTS.UNIT_DESTROYED);
    expect(destroyEvents.length).toBe(1);
    expect(newState.board[4][4].unit).toBeUndefined();
  });

  it('无效选择时验证拒绝', () => {
    const state = createTricksterState();
    clearArea(state, [3, 4, 5], [1, 2, 3]);

    placeUnit(state, { row: 4, col: 2 }, {
      cardId: 'test-summoner',
      card: makeSummoner('test-summoner'),
      owner: '0',
    });

    state.phase = 'attack';
    state.currentPlayer = '0';

    const fullState = { core: state, sys: {} as any };
    const result = SummonerWarsDomain.validate(fullState, {
      type: SW_COMMANDS.ACTIVATE_ABILITY,
      payload: {
        abilityId: 'mind_capture_resolve',
        sourceUnitId: 'test-summoner',
        choice: 'invalid',
      },
      playerId: '0',
      timestamp: Date.now(),
    });
    expect(result.valid).toBe(false);
  });
});

// ============================================================================
// 念力 (telekinesis) ACTIVATE_ABILITY 测试
// ============================================================================

describe('掷术师 - 念力 (telekinesis) ACTIVATE_ABILITY', () => {
  it('推拉2格内敌方士兵1格', () => {
    const state = createTricksterState();
    clearArea(state, [2, 3, 4, 5, 6], [0, 1, 2, 3, 4, 5]);

    placeUnit(state, { row: 4, col: 2 }, {
      cardId: 'test-telekinetic',
      card: makeTelekinetic('test-telekinetic'),
      owner: '0',
    });

    placeUnit(state, { row: 4, col: 4 }, {
      cardId: 'test-enemy',
      card: makeEnemy('test-enemy'),
      owner: '1',
    });

    state.phase = 'attack';
    state.currentPlayer = '0';

    const { events, newState } = executeAndReduce(state, SW_COMMANDS.ACTIVATE_ABILITY, {
      abilityId: 'telekinesis',
      sourceUnitId: 'test-telekinetic',
      targetPosition: { row: 4, col: 4 },
      direction: 'push',
    });

    // 应有推拉事件
    const pushEvents = events.filter(e => e.type === SW_EVENTS.UNIT_PUSHED);
    expect(pushEvents.length).toBe(1);

    // 敌方被推到 (4,5)
    expect(newState.board[4][5].unit?.cardId).toBe('test-enemy');
    expect(newState.board[4][4].unit).toBeUndefined();
  });

  it('拉近敌方士兵1格', () => {
    const state = createTricksterState();
    clearArea(state, [2, 3, 4, 5, 6], [0, 1, 2, 3, 4, 5]);

    placeUnit(state, { row: 4, col: 2 }, {
      cardId: 'test-telekinetic',
      card: makeTelekinetic('test-telekinetic'),
      owner: '0',
    });

    placeUnit(state, { row: 4, col: 4 }, {
      cardId: 'test-enemy',
      card: makeEnemy('test-enemy'),
      owner: '1',
    });

    state.phase = 'attack';
    state.currentPlayer = '0';

    const { events, newState } = executeAndReduce(state, SW_COMMANDS.ACTIVATE_ABILITY, {
      abilityId: 'telekinesis',
      sourceUnitId: 'test-telekinetic',
      targetPosition: { row: 4, col: 4 },
      direction: 'pull',
    });

    // 应有拉动事件
    const pullEvents = events.filter(e => e.type === SW_EVENTS.UNIT_PULLED);
    expect(pullEvents.length).toBe(1);

    // 敌方被拉到 (4,3)
    expect(newState.board[4][3].unit?.cardId).toBe('test-enemy');
    expect(newState.board[4][4].unit).toBeUndefined();
  });

  it('稳固单位免疫推拉', () => {
    const state = createTricksterState();
    clearArea(state, [2, 3, 4, 5, 6], [0, 1, 2, 3, 4, 5]);

    placeUnit(state, { row: 4, col: 2 }, {
      cardId: 'test-telekinetic',
      card: makeTelekinetic('test-telekinetic'),
      owner: '0',
    });

    // 稳固单位
    placeUnit(state, { row: 4, col: 4 }, {
      cardId: 'test-stable',
      card: makeEnemy('test-stable', { abilities: ['stable'] }),
      owner: '1',
    });

    state.phase = 'attack';
    state.currentPlayer = '0';

    const { events, newState } = executeAndReduce(state, SW_COMMANDS.ACTIVATE_ABILITY, {
      abilityId: 'telekinesis',
      sourceUnitId: 'test-telekinetic',
      targetPosition: { row: 4, col: 4 },
      direction: 'push',
    });

    // 不应有推拉事件（稳固免疫）
    const pushEvents = events.filter(e => e.type === SW_EVENTS.UNIT_PUSHED);
    expect(pushEvents.length).toBe(0);

    // 单位不动
    expect(newState.board[4][4].unit?.cardId).toBe('test-stable');
  });

  it('不能推拉召唤师', () => {
    const state = createTricksterState();
    clearArea(state, [3, 4, 5], [1, 2, 3, 4]);

    placeUnit(state, { row: 4, col: 2 }, {
      cardId: 'test-telekinetic',
      card: makeTelekinetic('test-telekinetic'),
      owner: '0',
    });

    placeUnit(state, { row: 4, col: 3 }, {
      cardId: 'test-enemy-summoner',
      card: makeEnemy('test-enemy-summoner', { unitClass: 'summoner' }),
      owner: '1',
    });

    state.phase = 'attack';
    state.currentPlayer = '0';

    const fullState = { core: state, sys: {} as any };
    const result = SummonerWarsDomain.validate(fullState, {
      type: SW_COMMANDS.ACTIVATE_ABILITY,
      payload: {
        abilityId: 'telekinesis',
        sourceUnitId: 'test-telekinetic',
        targetPosition: { row: 4, col: 3 },
        direction: 'push',
      },
      playerId: '0',
      timestamp: Date.now(),
    });
    expect(result.valid).toBe(false);
    expect(result.error).toContain('召唤师');
  });

  it('超过2格时验证拒绝', () => {
    const state = createTricksterState();
    clearArea(state, [1, 2, 3, 4, 5, 6], [0, 1, 2, 3, 4, 5]);

    placeUnit(state, { row: 4, col: 2 }, {
      cardId: 'test-telekinetic',
      card: makeTelekinetic('test-telekinetic'),
      owner: '0',
    });

    placeUnit(state, { row: 1, col: 2 }, {
      cardId: 'test-far-enemy',
      card: makeEnemy('test-far-enemy'),
      owner: '1',
    });

    state.phase = 'attack';
    state.currentPlayer = '0';

    const fullState = { core: state, sys: {} as any };
    const result = SummonerWarsDomain.validate(fullState, {
      type: SW_COMMANDS.ACTIVATE_ABILITY,
      payload: {
        abilityId: 'telekinesis',
        sourceUnitId: 'test-telekinetic',
        targetPosition: { row: 1, col: 2 },
        direction: 'push',
      },
      playerId: '0',
      timestamp: Date.now(),
    });
    expect(result.valid).toBe(false);
    expect(result.error).toContain('2格');
  });
});

// ============================================================================
// 高阶念力 (high_telekinesis) ACTIVATE_ABILITY 测试
// ============================================================================

describe('卡拉 - 高阶念力 (high_telekinesis) ACTIVATE_ABILITY', () => {
  it('推拉3格内敌方士兵1格', () => {
    const state = createTricksterState();
    // 清除包括 row 0，确保推拉目标位置为空
    clearArea(state, [0, 1, 2, 3, 4, 5, 6], [0, 1, 2, 3, 4, 5]);

    placeUnit(state, { row: 4, col: 2 }, {
      cardId: 'test-kara',
      card: makeKara('test-kara'),
      owner: '0',
    });

    // 3格距离的敌方
    placeUnit(state, { row: 1, col: 2 }, {
      cardId: 'test-enemy',
      card: makeEnemy('test-enemy'),
      owner: '1',
    });

    state.phase = 'attack';
    state.currentPlayer = '0';

    const { events, newState } = executeAndReduce(state, SW_COMMANDS.ACTIVATE_ABILITY, {
      abilityId: 'high_telekinesis',
      sourceUnitId: 'test-kara',
      targetPosition: { row: 1, col: 2 },
      direction: 'push',
    });

    // 应有推拉事件
    const pushEvents = events.filter(e => e.type === SW_EVENTS.UNIT_PUSHED);
    expect(pushEvents.length).toBe(1);

    // 敌方被推到 (0,2)
    expect(newState.board[0][2].unit?.cardId).toBe('test-enemy');
  });

  it('超过3格时验证拒绝', () => {
    const state = createTricksterState();
    clearArea(state, [0, 1, 2, 3, 4, 5, 6, 7], [0, 1, 2, 3, 4, 5]);

    placeUnit(state, { row: 4, col: 2 }, {
      cardId: 'test-kara',
      card: makeKara('test-kara'),
      owner: '0',
    });

    placeUnit(state, { row: 0, col: 2 }, {
      cardId: 'test-far-enemy',
      card: makeEnemy('test-far-enemy'),
      owner: '1',
    });

    state.phase = 'attack';
    state.currentPlayer = '0';

    const fullState = { core: state, sys: {} as any };
    const result = SummonerWarsDomain.validate(fullState, {
      type: SW_COMMANDS.ACTIVATE_ABILITY,
      payload: {
        abilityId: 'high_telekinesis',
        sourceUnitId: 'test-kara',
        targetPosition: { row: 0, col: 2 },
        direction: 'push',
      },
      playerId: '0',
      timestamp: Date.now(),
    });
    expect(result.valid).toBe(false);
    expect(result.error).toContain('3格');
  });
});

// ============================================================================
// 读心传念 (mind_transmission) ACTIVATE_ABILITY 测试
// ============================================================================

describe('卡拉 - 读心传念 (mind_transmission) ACTIVATE_ABILITY', () => {
  it('给3格内友方士兵额外攻击', () => {
    const state = createTricksterState();
    clearArea(state, [2, 3, 4, 5, 6], [0, 1, 2, 3, 4, 5]);

    placeUnit(state, { row: 4, col: 2 }, {
      cardId: 'test-kara',
      card: makeKara('test-kara'),
      owner: '0',
    });

    placeUnit(state, { row: 4, col: 4 }, {
      cardId: 'test-ally',
      card: makeAllyCommon('test-ally'),
      owner: '0',
    });

    state.phase = 'attack';
    state.currentPlayer = '0';

    const { events } = executeAndReduce(state, SW_COMMANDS.ACTIVATE_ABILITY, {
      abilityId: 'mind_transmission',
      sourceUnitId: 'test-kara',
      targetPosition: { row: 4, col: 4 },
    });

    // 应有额外攻击事件
    const extraAttackEvents = events.filter(e => e.type === SW_EVENTS.EXTRA_ATTACK_GRANTED);
    expect(extraAttackEvents.length).toBe(1);
    expect((extraAttackEvents[0].payload as any).targetUnitId).toBe('test-ally');
    expect((extraAttackEvents[0].payload as any).sourceAbilityId).toBe('mind_transmission');
  });

  it('不能给敌方单位额外攻击', () => {
    const state = createTricksterState();
    clearArea(state, [3, 4, 5], [1, 2, 3, 4]);

    placeUnit(state, { row: 4, col: 2 }, {
      cardId: 'test-kara',
      card: makeKara('test-kara'),
      owner: '0',
    });

    placeUnit(state, { row: 4, col: 3 }, {
      cardId: 'test-enemy',
      card: makeEnemy('test-enemy'),
      owner: '1',
    });

    state.phase = 'attack';
    state.currentPlayer = '0';

    const fullState = { core: state, sys: {} as any };
    const result = SummonerWarsDomain.validate(fullState, {
      type: SW_COMMANDS.ACTIVATE_ABILITY,
      payload: {
        abilityId: 'mind_transmission',
        sourceUnitId: 'test-kara',
        targetPosition: { row: 4, col: 3 },
      },
      playerId: '0',
      timestamp: Date.now(),
    });
    expect(result.valid).toBe(false);
    expect(result.error).toContain('友方');
  });

  it('不能给冠军单位额外攻击（只能选择士兵）', () => {
    const state = createTricksterState();
    clearArea(state, [3, 4, 5], [1, 2, 3, 4]);

    placeUnit(state, { row: 4, col: 2 }, {
      cardId: 'test-kara',
      card: makeKara('test-kara'),
      owner: '0',
    });

    // 友方冠军
    placeUnit(state, { row: 4, col: 3 }, {
      cardId: 'test-champion',
      card: { ...makeAllyCommon('test-champion'), unitClass: 'champion' },
      owner: '0',
    });

    state.phase = 'attack';
    state.currentPlayer = '0';

    const fullState = { core: state, sys: {} as any };
    const result = SummonerWarsDomain.validate(fullState, {
      type: SW_COMMANDS.ACTIVATE_ABILITY,
      payload: {
        abilityId: 'mind_transmission',
        sourceUnitId: 'test-kara',
        targetPosition: { row: 4, col: 3 },
      },
      playerId: '0',
      timestamp: Date.now(),
    });
    expect(result.valid).toBe(false);
    expect(result.error).toContain('士兵');
  });

  it('超过3格时验证拒绝', () => {
    const state = createTricksterState();
    clearArea(state, [0, 1, 2, 3, 4, 5, 6, 7], [0, 1, 2, 3, 4, 5]);

    placeUnit(state, { row: 4, col: 2 }, {
      cardId: 'test-kara',
      card: makeKara('test-kara'),
      owner: '0',
    });

    placeUnit(state, { row: 0, col: 2 }, {
      cardId: 'test-far-ally',
      card: makeAllyCommon('test-far-ally'),
      owner: '0',
    });

    state.phase = 'attack';
    state.currentPlayer = '0';

    const fullState = { core: state, sys: {} as any };
    const result = SummonerWarsDomain.validate(fullState, {
      type: SW_COMMANDS.ACTIVATE_ABILITY,
      payload: {
        abilityId: 'mind_transmission',
        sourceUnitId: 'test-kara',
        targetPosition: { row: 0, col: 2 },
      },
      playerId: '0',
      timestamp: Date.now(),
    });
    expect(result.valid).toBe(false);
    expect(result.error).toContain('3格');
  });
});
