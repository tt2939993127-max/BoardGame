/**
 * 召唤师战争 - 阶段触发技能 execute 流程测试
 *
 * 覆盖阶段开始/结束自动触发的技能：
 * - guidance（指引）：召唤阶段开始抓2张牌（先锋军团 - 瓦伦蒂娜）
 * - blood_rune（鲜血符文）：攻击阶段开始自伤或充能（洞穴地精 - 布拉夫）
 * - ice_shards（寒冰碎屑）：建造阶段结束消耗充能AoE（极地矮人 - 贾穆德）
 * - feed_beast（喂养巨食兽）：攻击阶段结束吃友方或自毁（洞穴地精 - 巨食兽）
 */

import { describe, it, expect } from 'vitest';
import { SummonerWarsDomain, SW_COMMANDS, SW_EVENTS } from '../domain';
import type { SummonerWarsCore, CellCoord, BoardUnit, UnitCard, PlayerId, BoardStructure } from '../domain/types';
import type { RandomFn, GameEvent } from '../../../engine/types';
import { createInitializedCore } from './test-helpers';
import { resolveAbilityEffects } from '../domain/abilityResolver';
import { abilityRegistry } from '../domain/abilities';

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

const fixedTimestamp = 1000;

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

function placeStructure(
  state: SummonerWarsCore,
  pos: CellCoord,
  owner: PlayerId,
  id = `wall-${pos.row}-${pos.col}`
): void {
  state.board[pos.row][pos.col].structure = {
    cardId: id,
    card: {
      id,
      cardType: 'structure',
      name: '城墙',
      cost: 0,
      life: 3,
      isGate: false,
      deckSymbols: [],
    },
    owner,
    position: pos,
    damage: 0,
  } as BoardStructure;
}

function makeValentina(id: string): UnitCard {
  return {
    id, cardType: 'unit', name: '瓦伦蒂娜', unitClass: 'champion',
    faction: '先锋军团', strength: 3, life: 7, cost: 5,
    attackType: 'melee', attackRange: 1,
    abilities: ['guidance', 'fortress_elite'], deckSymbols: [],
  };
}

function makeBrolf(id: string): UnitCard {
  return {
    id, cardType: 'unit', name: '布拉夫', unitClass: 'champion',
    faction: '洞穴地精', strength: 3, life: 8, cost: 6,
    attackType: 'melee', attackRange: 1,
    abilities: ['blood_rune', 'power_boost'], deckSymbols: [],
  };
}

function makeJamud(id: string): UnitCard {
  return {
    id, cardType: 'unit', name: '贾穆德', unitClass: 'champion',
    faction: '极地矮人', strength: 3, life: 8, cost: 6,
    attackType: 'melee', attackRange: 1,
    abilities: ['imposing', 'ice_shards'], deckSymbols: [],
  };
}

function makeFeedBeast(id: string): UnitCard {
  return {
    id, cardType: 'unit', name: '巨食兽', unitClass: 'champion',
    faction: '洞穴地精', strength: 5, life: 9, cost: 7,
    attackType: 'melee', attackRange: 1,
    abilities: ['feed_beast'], deckSymbols: [],
  };
}

function makeAlly(id: string): UnitCard {
  return {
    id, cardType: 'unit', name: '友方士兵', unitClass: 'common',
    faction: '测试', strength: 2, life: 3, cost: 1,
    attackType: 'melee', attackRange: 1, deckSymbols: [],
  };
}

function makeEnemy(id: string): UnitCard {
  return {
    id, cardType: 'unit', name: '敌方单位', unitClass: 'common',
    faction: '测试', strength: 2, life: 3, cost: 0,
    attackType: 'melee', attackRange: 1, deckSymbols: [],
  };
}

function executeAndReduce(
  state: SummonerWarsCore,
  commandType: string,
  payload: Record<string, unknown>
): { newState: SummonerWarsCore; events: GameEvent[] } {
  const fullState = { core: state, sys: {} as any };
  const command = { type: commandType, payload, timestamp: fixedTimestamp, playerId: state.currentPlayer };
  const events = SummonerWarsDomain.execute(fullState, command, createTestRandom());
  let newState = state;
  for (const event of events) {
    newState = SummonerWarsDomain.reduce(newState, event);
  }
  return { newState, events };
}

// ============================================================================
// guidance（指引）- 先锋军团 瓦伦蒂娜
// ============================================================================

describe('瓦伦蒂娜 - 指引 (guidance)', () => {
  it('abilityResolver 直接生成 CARD_DRAWN 事件（无需 UI 交互）', () => {
    const def = abilityRegistry.get('guidance');
    expect(def).toBeDefined();
    expect(def!.trigger).toBe('onPhaseStart');

    // 模拟 resolveAbilityEffects 调用
    const state = createInitializedCore(['0', '1'], createTestRandom(), {
      faction0: 'paladin',
      faction1: 'necromancer',
    });
    clearArea(state, [3, 4, 5], [1, 2, 3, 4]);

    const unit = placeUnit(state, { row: 4, col: 2 }, {
      cardId: 'test-valentina',
      card: makeValentina('test-valentina'),
      owner: '0',
    });

    // 确保牌组有牌
    state.players['0'].deck = [
      makeAlly('deck-1'), makeAlly('deck-2'), makeAlly('deck-3'),
    ];

    const events = resolveAbilityEffects(def!, {
      state,
      sourceUnit: unit,
      sourcePosition: { row: 4, col: 2 },
      ownerId: '0',
      timestamp: fixedTimestamp,
    });

    // 应有 ABILITY_TRIGGERED + CARD_DRAWN 事件
    const triggerEvents = events.filter(e => e.type === SW_EVENTS.ABILITY_TRIGGERED);
    expect(triggerEvents.length).toBe(1);
    expect((triggerEvents[0].payload as any).abilityId).toBe('guidance');

    const drawEvents = events.filter(e => e.type === SW_EVENTS.CARD_DRAWN);
    expect(drawEvents.length).toBe(1);
    expect((drawEvents[0].payload as any).count).toBe(2);
  });

  it('ACTIVATE_ABILITY 命令也能正确执行抓牌', () => {
    const state = createInitializedCore(['0', '1'], createTestRandom(), {
      faction0: 'paladin',
      faction1: 'necromancer',
    });
    clearArea(state, [3, 4, 5], [1, 2, 3, 4]);

    placeUnit(state, { row: 4, col: 2 }, {
      cardId: 'test-valentina',
      card: makeValentina('test-valentina'),
      owner: '0',
    });

    state.phase = 'summon';
    state.currentPlayer = '0';
    state.players['0'].deck = [makeAlly('d1'), makeAlly('d2'), makeAlly('d3')];
    const handBefore = state.players['0'].hand.length;

    const { events, newState } = executeAndReduce(state, SW_COMMANDS.ACTIVATE_ABILITY, {
      abilityId: 'guidance',
      sourceUnitId: 'test-valentina',
    });

    const drawEvents = events.filter(e => e.type === SW_EVENTS.CARD_DRAWN);
    expect(drawEvents.length).toBeGreaterThanOrEqual(1);
    expect(newState.players['0'].hand.length).toBe(handBefore + 2);
  });

  it('牌组不足时只抓剩余数量', () => {
    const state = createInitializedCore(['0', '1'], createTestRandom(), {
      faction0: 'paladin',
      faction1: 'necromancer',
    });
    clearArea(state, [3, 4, 5], [1, 2, 3, 4]);

    placeUnit(state, { row: 4, col: 2 }, {
      cardId: 'test-valentina',
      card: makeValentina('test-valentina'),
      owner: '0',
    });

    state.phase = 'summon';
    state.currentPlayer = '0';
    state.players['0'].deck = [makeAlly('d1')]; // 只有1张

    const { events } = executeAndReduce(state, SW_COMMANDS.ACTIVATE_ABILITY, {
      abilityId: 'guidance',
      sourceUnitId: 'test-valentina',
    });

    const drawEvents = events.filter(e => e.type === SW_EVENTS.CARD_DRAWN);
    expect(drawEvents.length).toBeGreaterThanOrEqual(1);
    // 应该只抓1张
    const totalDrawn = drawEvents.reduce((sum, e) => sum + ((e.payload as any).count ?? 0), 0);
    expect(totalDrawn).toBe(1);
  });
});


// ============================================================================
// blood_rune（鲜血符文）- 洞穴地精 布拉夫
// ============================================================================

describe('布拉夫 - 鲜血符文 (blood_rune)', () => {
  it('选择自伤：对自身造成1点伤害', () => {
    const state = createInitializedCore(['0', '1'], createTestRandom(), {
      faction0: 'goblin',
      faction1: 'necromancer',
    });
    clearArea(state, [3, 4, 5], [1, 2, 3, 4]);

    placeUnit(state, { row: 4, col: 2 }, {
      cardId: 'test-brolf',
      card: makeBrolf('test-brolf'),
      owner: '0',
    });

    state.phase = 'attack';
    state.currentPlayer = '0';

    const { events, newState } = executeAndReduce(state, SW_COMMANDS.ACTIVATE_ABILITY, {
      abilityId: 'blood_rune',
      sourceUnitId: 'test-brolf',
      choice: 'damage',
    });

    const dmgEvents = events.filter(e => e.type === SW_EVENTS.UNIT_DAMAGED);
    expect(dmgEvents.length).toBe(1);
    expect((dmgEvents[0].payload as any).damage).toBe(1);
    expect(newState.board[4][2].unit?.damage).toBe(1);
  });

  it('选择充能：消耗1魔力并充能', () => {
    const state = createInitializedCore(['0', '1'], createTestRandom(), {
      faction0: 'goblin',
      faction1: 'necromancer',
    });
    clearArea(state, [3, 4, 5], [1, 2, 3, 4]);

    placeUnit(state, { row: 4, col: 2 }, {
      cardId: 'test-brolf',
      card: makeBrolf('test-brolf'),
      owner: '0',
    });

    state.phase = 'attack';
    state.currentPlayer = '0';
    state.players['0'].magic = 3;

    const { events, newState } = executeAndReduce(state, SW_COMMANDS.ACTIVATE_ABILITY, {
      abilityId: 'blood_rune',
      sourceUnitId: 'test-brolf',
      choice: 'charge',
    });

    const magicEvents = events.filter(e => e.type === SW_EVENTS.MAGIC_CHANGED);
    expect(magicEvents.length).toBe(1);
    expect((magicEvents[0].payload as any).delta).toBe(-1);

    const chargeEvents = events.filter(e => e.type === SW_EVENTS.UNIT_CHARGED);
    expect(chargeEvents.length).toBe(1);

    expect(newState.players['0'].magic).toBe(2);
    expect(newState.board[4][2].unit?.boosts).toBe(1);
  });

  it('魔力不足时不能选择充能', () => {
    const state = createInitializedCore(['0', '1'], createTestRandom(), {
      faction0: 'goblin',
      faction1: 'necromancer',
    });
    clearArea(state, [3, 4, 5], [1, 2, 3, 4]);

    placeUnit(state, { row: 4, col: 2 }, {
      cardId: 'test-brolf',
      card: makeBrolf('test-brolf'),
      owner: '0',
    });

    state.phase = 'attack';
    state.currentPlayer = '0';
    state.players['0'].magic = 0;

    const fullState = { core: state, sys: {} as any };
    const result = SummonerWarsDomain.validate(fullState, {
      type: SW_COMMANDS.ACTIVATE_ABILITY,
      payload: { abilityId: 'blood_rune', sourceUnitId: 'test-brolf', choice: 'charge' },
      timestamp: fixedTimestamp,
      playerId: '0',
    });
    expect(result.valid).toBe(false);
  });

  it('abilityResolver 生成 ABILITY_TRIGGERED 事件（供 UI 检测）', () => {
    const def = abilityRegistry.get('blood_rune');
    expect(def).toBeDefined();
    expect(def!.trigger).toBe('onPhaseStart');

    const state = createInitializedCore(['0', '1'], createTestRandom(), {
      faction0: 'goblin',
      faction1: 'necromancer',
    });
    clearArea(state, [3, 4, 5], [1, 2, 3, 4]);

    const unit = placeUnit(state, { row: 4, col: 2 }, {
      cardId: 'test-brolf',
      card: makeBrolf('test-brolf'),
      owner: '0',
    });

    const events = resolveAbilityEffects(def!, {
      state,
      sourceUnit: unit,
      sourcePosition: { row: 4, col: 2 },
      ownerId: '0',
      timestamp: fixedTimestamp,
    });

    // 应有 ABILITY_TRIGGERED 事件（包含 sourcePosition 供 UI 定位）
    const triggerEvents = events.filter(e => e.type === SW_EVENTS.ABILITY_TRIGGERED);
    expect(triggerEvents.length).toBe(2); // 1个技能激活 + 1个 custom else 分支
    const customEvent = triggerEvents.find(e => (e.payload as any).abilityId === 'blood_rune_choice');
    expect(customEvent).toBeDefined();
    expect((customEvent!.payload as any).sourcePosition).toBeDefined();
  });
});


// ============================================================================
// ice_shards（寒冰碎屑）- 极地矮人 贾穆德
// ============================================================================

describe('贾穆德 - 寒冰碎屑 (ice_shards)', () => {
  it('消耗1充能，对建筑相邻敌方造成1伤', () => {
    const state = createInitializedCore(['0', '1'], createTestRandom(), {
      faction0: 'frost',
      faction1: 'necromancer',
    });
    clearArea(state, [2, 3, 4, 5], [1, 2, 3, 4]);

    placeUnit(state, { row: 3, col: 2 }, {
      cardId: 'test-jamud',
      card: makeJamud('test-jamud'),
      owner: '0',
      boosts: 2,
    });

    // 放置友方建筑
    placeStructure(state, { row: 4, col: 3 }, '0');

    // 放置建筑相邻的敌方单位
    placeUnit(state, { row: 4, col: 4 }, {
      cardId: 'test-enemy1',
      card: makeEnemy('test-enemy1'),
      owner: '1',
    });
    placeUnit(state, { row: 3, col: 3 }, {
      cardId: 'test-enemy2',
      card: makeEnemy('test-enemy2'),
      owner: '1',
    });

    state.phase = 'build';
    state.currentPlayer = '0';

    const { events, newState } = executeAndReduce(state, SW_COMMANDS.ACTIVATE_ABILITY, {
      abilityId: 'ice_shards',
      sourceUnitId: 'test-jamud',
    });

    // 应消耗1充能
    expect(newState.board[3][2].unit?.boosts).toBe(1);

    // 应对建筑相邻的敌方造成伤害
    const dmgEvents = events.filter(e => e.type === SW_EVENTS.UNIT_DAMAGED);
    expect(dmgEvents.length).toBeGreaterThanOrEqual(1);
  });

  it('没有充能时验证失败', () => {
    const state = createInitializedCore(['0', '1'], createTestRandom(), {
      faction0: 'frost',
      faction1: 'necromancer',
    });
    clearArea(state, [3, 4, 5], [1, 2, 3, 4]);

    placeUnit(state, { row: 3, col: 2 }, {
      cardId: 'test-jamud',
      card: makeJamud('test-jamud'),
      owner: '0',
      boosts: 0,
    });

    state.phase = 'build';
    state.currentPlayer = '0';

    const fullState = { core: state, sys: {} as any };
    const result = SummonerWarsDomain.validate(fullState, {
      type: SW_COMMANDS.ACTIVATE_ABILITY,
      payload: { abilityId: 'ice_shards', sourceUnitId: 'test-jamud' },
      timestamp: fixedTimestamp,
      playerId: '0',
    });
    expect(result.valid).toBe(false);
  });

  it('abilityResolver 生成 ABILITY_TRIGGERED 事件（供 UI 检测）', () => {
    const def = abilityRegistry.get('ice_shards');
    expect(def).toBeDefined();
    expect(def!.trigger).toBe('onPhaseEnd');

    const state = createInitializedCore(['0', '1'], createTestRandom(), {
      faction0: 'frost',
      faction1: 'necromancer',
    });
    clearArea(state, [3, 4, 5], [1, 2, 3, 4]);

    const unit = placeUnit(state, { row: 3, col: 2 }, {
      cardId: 'test-jamud',
      card: makeJamud('test-jamud'),
      owner: '0',
      boosts: 1,
    });

    const events = resolveAbilityEffects(def!, {
      state,
      sourceUnit: unit,
      sourcePosition: { row: 3, col: 2 },
      ownerId: '0',
      timestamp: fixedTimestamp,
    });

    const triggerEvents = events.filter(e => e.type === SW_EVENTS.ABILITY_TRIGGERED);
    expect(triggerEvents.length).toBe(2); // 1个技能激活 + 1个 custom else 分支
    const customEvent = triggerEvents.find(e => (e.payload as any).abilityId === 'ice_shards_damage');
    expect(customEvent).toBeDefined();
    expect((customEvent!.payload as any).sourcePosition).toBeDefined();
  });
});


// ============================================================================
// feed_beast（喂养巨食兽）- 洞穴地精 巨食兽
// ============================================================================

describe('巨食兽 - 喂养巨食兽 (feed_beast)', () => {
  it('选择相邻友方单位移除', () => {
    const state = createInitializedCore(['0', '1'], createTestRandom(), {
      faction0: 'goblin',
      faction1: 'necromancer',
    });
    clearArea(state, [3, 4, 5], [1, 2, 3, 4]);

    placeUnit(state, { row: 4, col: 2 }, {
      cardId: 'test-beast',
      card: makeFeedBeast('test-beast'),
      owner: '0',
    });

    placeUnit(state, { row: 4, col: 3 }, {
      cardId: 'test-ally',
      card: makeAlly('test-ally'),
      owner: '0',
    });

    state.phase = 'attack';
    state.currentPlayer = '0';

    const { events, newState } = executeAndReduce(state, SW_COMMANDS.ACTIVATE_ABILITY, {
      abilityId: 'feed_beast',
      sourceUnitId: 'test-beast',
      targetPosition: { row: 4, col: 3 },
    });

    // 友方单位应被摧毁
    const destroyEvents = events.filter(e => e.type === SW_EVENTS.UNIT_DESTROYED);
    expect(destroyEvents.length).toBe(1);
    expect((destroyEvents[0].payload as any).reason).toBe('feed_beast');
    expect(newState.board[4][3].unit).toBeUndefined();
    // 巨食兽应存活
    expect(newState.board[4][2].unit).toBeDefined();
  });

  it('选择自毁', () => {
    const state = createInitializedCore(['0', '1'], createTestRandom(), {
      faction0: 'goblin',
      faction1: 'necromancer',
    });
    clearArea(state, [3, 4, 5], [1, 2, 3, 4]);

    placeUnit(state, { row: 4, col: 2 }, {
      cardId: 'test-beast',
      card: makeFeedBeast('test-beast'),
      owner: '0',
    });

    state.phase = 'attack';
    state.currentPlayer = '0';

    const { events, newState } = executeAndReduce(state, SW_COMMANDS.ACTIVATE_ABILITY, {
      abilityId: 'feed_beast',
      sourceUnitId: 'test-beast',
      choice: 'self_destroy',
    });

    const destroyEvents = events.filter(e => e.type === SW_EVENTS.UNIT_DESTROYED);
    expect(destroyEvents.length).toBe(1);
    expect((destroyEvents[0].payload as any).reason).toBe('feed_beast_self');
    expect(newState.board[4][2].unit).toBeUndefined();
  });

  it('不能选择非相邻的友方单位', () => {
    const state = createInitializedCore(['0', '1'], createTestRandom(), {
      faction0: 'goblin',
      faction1: 'necromancer',
    });
    clearArea(state, [2, 3, 4, 5], [1, 2, 3, 4]);

    placeUnit(state, { row: 4, col: 2 }, {
      cardId: 'test-beast',
      card: makeFeedBeast('test-beast'),
      owner: '0',
    });

    placeUnit(state, { row: 2, col: 2 }, {
      cardId: 'test-far-ally',
      card: makeAlly('test-far-ally'),
      owner: '0',
    });

    state.phase = 'attack';
    state.currentPlayer = '0';

    const fullState = { core: state, sys: {} as any };
    const result = SummonerWarsDomain.validate(fullState, {
      type: SW_COMMANDS.ACTIVATE_ABILITY,
      payload: { abilityId: 'feed_beast', sourceUnitId: 'test-beast', targetPosition: { row: 2, col: 2 } },
      timestamp: fixedTimestamp,
      playerId: '0',
    });
    expect(result.valid).toBe(false);
  });

  it('abilityResolver 生成 ABILITY_TRIGGERED 事件（供 UI 检测）', () => {
    const def = abilityRegistry.get('feed_beast');
    expect(def).toBeDefined();
    expect(def!.trigger).toBe('onPhaseEnd');

    const state = createInitializedCore(['0', '1'], createTestRandom(), {
      faction0: 'goblin',
      faction1: 'necromancer',
    });
    clearArea(state, [3, 4, 5], [1, 2, 3, 4]);

    const unit = placeUnit(state, { row: 4, col: 2 }, {
      cardId: 'test-beast',
      card: makeFeedBeast('test-beast'),
      owner: '0',
    });

    const events = resolveAbilityEffects(def!, {
      state,
      sourceUnit: unit,
      sourcePosition: { row: 4, col: 2 },
      ownerId: '0',
      timestamp: fixedTimestamp,
    });

    const triggerEvents = events.filter(e => e.type === SW_EVENTS.ABILITY_TRIGGERED);
    expect(triggerEvents.length).toBe(2); // 1个技能激活 + 1个 custom else 分支
    const customEvent = triggerEvents.find(e => (e.payload as any).abilityId === 'feed_beast_check');
    expect(customEvent).toBeDefined();
    expect((customEvent!.payload as any).sourcePosition).toBeDefined();
  });
});
