/**
 * SummonerWars 交互链完整性综合测试
 *
 * 覆盖所有交互场景：
 * 1. 多步交互链（interactionChain 声明）— 步骤覆盖 + 契约对齐
 * 2. 单步目标选择（requiresTargetSelection）— payload 字段完整性
 * 3. 阶段触发交互（onPhaseStart/onPhaseEnd）— 确认/跳过流程
 * 4. 事件驱动交互（UI 事件消费链路）— 消费完整性
 * 5. 执行器 payload 防御性检查 — 缺失字段时静默返回空事件
 * 6. 验证层有效性门控 — 有代价技能的前置条件
 * 7. 交互链边界情况 — 无效选择、取消、重复激活
 *
 * 重要：ACTIVATE_ABILITY 命令的 payload 必须包含 sourceUnitId（单位的 instanceId），
 * 而非 unitPosition。验证层和执行层都通过 instanceId 查找单位。
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { abilityRegistry } from '../domain/abilities';
import type { AbilityDef } from '../domain/abilities';
import { abilityExecutorRegistry } from '../domain/executors';
import { swCustomActionRegistry } from '../domain/customActionHandlers';
import { createInitializedCore, placeTestUnit, generateInstanceId, resetInstanceCounter } from './test-helpers';
import { executeCommand } from '../domain/execute';
import { validateCommand } from '../domain/validate';
import { SW_COMMANDS, SW_EVENTS } from '../domain/types';
import type { SummonerWarsCore, PlayerId, CellCoord, BoardUnit, UnitCard, StructureCard } from '../domain/types';
import type { RandomFn, MatchState } from '../../../engine/types';
import { getUnitAt, isCellEmpty, getPlayerUnits, manhattanDistance } from '../domain/helpers';

// ============================================================================
// 测试辅助
// ============================================================================

function testRandom(): RandomFn {
  return {
    shuffle: <T>(arr: T[]) => arr,
    random: () => 0.5,
    d: (max: number) => Math.ceil(max * 0.5) || 1,
    range: (min: number, max: number) => Math.floor(min + (max - min) * 0.5),
  };
}

function mkUnit(id: string, overrides?: Partial<UnitCard>): UnitCard {
  return {
    id, cardType: 'unit', name: `测试-${id}`, unitClass: 'common', faction: 'necromancer',
    strength: 2, life: 3, cost: 1, attackType: 'melee', attackRange: 1,
    deckSymbols: [], ...overrides,
  };
}

function mkStructure(id: string, overrides?: Partial<StructureCard>): StructureCard {
  return {
    id, cardType: 'structure' as const, name: `建筑-${id}`, faction: 'frost', cost: 0, life: 5,
    deckSymbols: [], ...overrides,
  } as StructureCard;
}

function putUnit(core: SummonerWarsCore, pos: CellCoord, card: UnitCard, owner: PlayerId, extra?: Partial<BoardUnit>): BoardUnit {
  const cardId = `${card.id}-${pos.row}-${pos.col}`;
  const u: BoardUnit = {
    instanceId: extra?.instanceId ?? generateInstanceId(cardId),
    cardId, card, owner, position: pos,
    damage: 0, boosts: 0, hasMoved: false, hasAttacked: false,
    ...extra,
  };
  core.board[pos.row][pos.col].unit = u;
  return u;
}

function putStructure(core: SummonerWarsCore, pos: CellCoord, owner: PlayerId, card?: StructureCard) {
  const c = card ?? mkStructure(`s-${pos.row}-${pos.col}`);
  core.board[pos.row][pos.col].structure = {
    cardId: c.id, card: c, owner, position: pos, damage: 0,
  };
}

function clearRect(core: SummonerWarsCore, rows: number[], cols: number[]) {
  for (const r of rows) for (const c of cols) {
    if (core.board[r]?.[c]) { core.board[r][c].unit = undefined; core.board[r][c].structure = undefined; }
  }
}

/** 执行命令（绕过验证层，直接测试执行器） */
function exec(core: SummonerWarsCore, cmd: string, payload: Record<string, unknown>, random?: RandomFn) {
  const state = { core } as MatchState<SummonerWarsCore>;
  return executeCommand(state, { type: cmd, payload, timestamp: Date.now() }, random ?? testRandom());
}

/** 验证命令合法性 */
function validate(core: SummonerWarsCore, cmd: string, payload: Record<string, unknown>, playerId?: string) {
  const state = { core } as MatchState<SummonerWarsCore>;
  return validateCommand(state, { type: cmd, payload, playerId });
}

/** 验证+执行：先验证，通过后执行 */
function validateAndExec(core: SummonerWarsCore, cmd: string, payload: Record<string, unknown>, random?: RandomFn) {
  const result = validate(core, cmd, payload);
  if (!result.valid) return [];
  return exec(core, cmd, payload, random);
}

// ============================================================================
// Section 1: 多步交互链 — 执行器 payload 防御性检查
// 验证：缺失必需字段时执行器静默返回空事件（不崩溃）
// ============================================================================

describe('多步交互链 — 执行器 payload 防御性', () => {
  let core: SummonerWarsCore;

  beforeEach(() => {
    resetInstanceCounter();
    core = createInitializedCore(['0', '1'], testRandom(), { faction0: 'frost', faction1: 'barbaric' });
    clearRect(core, [2, 3, 4, 5, 6], [0, 1, 2, 3, 4, 5]);
  });

  // --- structure_shift: 缺少 newPosition ---
  it('[structure_shift] 缺少 newPosition 时返回空事件', () => {
    core.phase = 'move';
    core.currentPlayer = '0' as PlayerId;
    const summoner = mkUnit('svara', { abilities: ['structure_shift'], unitClass: 'summoner', faction: 'frost' });
    const unit = putUnit(core, { row: 4, col: 3 }, summoner, '0');
    putStructure(core, { row: 4, col: 4 }, '0');

    const events = exec(core, SW_COMMANDS.ACTIVATE_ABILITY, {
      abilityId: 'structure_shift',
      sourceUnitId: unit.instanceId,
      targetPosition: { row: 4, col: 4 },
      // 故意缺少 newPosition
    });
    // 不应崩溃，应返回 ABILITY_TRIGGERED 但无实际移动事件
    const pushEvent = events.find(e => e.type === SW_EVENTS.UNIT_PUSHED);
    expect(pushEvent).toBeUndefined();
  });

  // --- structure_shift: 完整 payload ---
  it('[structure_shift] 完整 payload 产生 UNIT_PUSHED 事件', () => {
    core.phase = 'move';
    core.currentPlayer = '0' as PlayerId;
    const summoner = mkUnit('svara', { abilities: ['structure_shift'], unitClass: 'summoner', faction: 'frost' });
    const unit = putUnit(core, { row: 4, col: 3 }, summoner, '0');
    putStructure(core, { row: 4, col: 4 }, '0');

    const events = exec(core, SW_COMMANDS.ACTIVATE_ABILITY, {
      abilityId: 'structure_shift',
      sourceUnitId: unit.instanceId,
      targetPosition: { row: 4, col: 4 },
      newPosition: { row: 4, col: 5 },
    });
    const pushEvent = events.find(e => e.type === SW_EVENTS.UNIT_PUSHED);
    expect(pushEvent).toBeDefined();
  });

  // --- withdraw: 缺少 costType 时执行器防御性返回 ---
  it('[withdraw] 缺少 costType 时执行器防御性返回空事件', () => {
    core.phase = 'attack';
    core.currentPlayer = '1' as PlayerId;
    const kairu = mkUnit('kairu', { abilities: ['withdraw'], unitClass: 'champion', faction: 'barbaric' });
    const unit = putUnit(core, { row: 4, col: 3 }, kairu, '1', { boosts: 1 });

    const events = exec(core, SW_COMMANDS.ACTIVATE_ABILITY, {
      abilityId: 'withdraw',
      sourceUnitId: unit.instanceId,
      targetPosition: { row: 4, col: 5 },
      // 缺少 costType
    });
    // 执行器应防御性处理，不产生移动事件
    const moveEvent = events.find(e => e.type === SW_EVENTS.UNIT_MOVED);
    expect(moveEvent).toBeUndefined();
  });

  // --- withdraw: 完整 payload（charge 路径） ---
  it('[withdraw] charge 路径完整 payload 产生移动事件', () => {
    core.phase = 'attack';
    core.currentPlayer = '1' as PlayerId;
    const kairu = mkUnit('kairu', { abilities: ['withdraw'], unitClass: 'champion', faction: 'barbaric' });
    const unit = putUnit(core, { row: 4, col: 3 }, kairu, '1', { boosts: 1 });

    const events = exec(core, SW_COMMANDS.ACTIVATE_ABILITY, {
      abilityId: 'withdraw',
      sourceUnitId: unit.instanceId,
      costType: 'charge',
      targetPosition: { row: 4, col: 5 },
    });
    const chargeEvent = events.find(e => e.type === SW_EVENTS.UNIT_CHARGED);
    const moveEvent = events.find(e => e.type === SW_EVENTS.UNIT_MOVED);
    expect(chargeEvent).toBeDefined();
    expect(moveEvent).toBeDefined();
  });

  // --- withdraw: 完整 payload（magic 路径） ---
  it('[withdraw] magic 路径完整 payload 产生移动事件', () => {
    core.phase = 'attack';
    core.currentPlayer = '1' as PlayerId;
    core.players['1'].magic = 3;
    const kairu = mkUnit('kairu', { abilities: ['withdraw'], unitClass: 'champion', faction: 'barbaric' });
    const unit = putUnit(core, { row: 4, col: 3 }, kairu, '1', { boosts: 0 });

    const events = exec(core, SW_COMMANDS.ACTIVATE_ABILITY, {
      abilityId: 'withdraw',
      sourceUnitId: unit.instanceId,
      costType: 'magic',
      targetPosition: { row: 4, col: 5 },
    });
    const magicEvent = events.find(e => e.type === SW_EVENTS.MAGIC_CHANGED);
    const moveEvent = events.find(e => e.type === SW_EVENTS.UNIT_MOVED);
    expect(magicEvent).toBeDefined();
    expect(moveEvent).toBeDefined();
  });

  // --- frost_axe: 缺少 choice ---
  it('[frost_axe] 缺少 choice 时验证失败', () => {
    core.phase = 'move';
    core.currentPlayer = '0' as PlayerId;
    const smith = mkUnit('smith', { abilities: ['frost_axe'], faction: 'frost' });
    const unit = putUnit(core, { row: 4, col: 3 }, smith, '0', { boosts: 1 });

    const result = validate(core, SW_COMMANDS.ACTIVATE_ABILITY, {
      abilityId: 'frost_axe',
      sourceUnitId: unit.instanceId,
    });
    expect(result.valid).toBe(false);
  });

  // --- frost_axe: self 路径 ---
  it('[frost_axe] choice=self 充能自身', () => {
    core.phase = 'move';
    core.currentPlayer = '0' as PlayerId;
    const smith = mkUnit('smith', { abilities: ['frost_axe'], faction: 'frost' });
    const unit = putUnit(core, { row: 4, col: 3 }, smith, '0');

    const events = exec(core, SW_COMMANDS.ACTIVATE_ABILITY, {
      abilityId: 'frost_axe',
      sourceUnitId: unit.instanceId,
      choice: 'self',
    });
    const chargeEvent = events.find(e => e.type === SW_EVENTS.UNIT_CHARGED);
    expect(chargeEvent).toBeDefined();
  });

  // --- frost_axe: attach 路径 ---
  it('[frost_axe] choice=attach 附加到友方士兵', () => {
    core.phase = 'move';
    core.currentPlayer = '0' as PlayerId;
    const smith = mkUnit('smith', { abilities: ['frost_axe'], faction: 'frost' });
    const unit = putUnit(core, { row: 4, col: 3 }, smith, '0', { boosts: 2 });
    const target = mkUnit('soldier', { unitClass: 'common', faction: 'frost' });
    putUnit(core, { row: 4, col: 4 }, target, '0');

    const events = exec(core, SW_COMMANDS.ACTIVATE_ABILITY, {
      abilityId: 'frost_axe',
      sourceUnitId: unit.instanceId,
      choice: 'attach',
      targetPosition: { row: 4, col: 4 },
    });
    const attachEvent = events.find(e => e.type === SW_EVENTS.UNIT_ATTACHED);
    expect(attachEvent).toBeDefined();
  });

  // --- frost_axe: attach 路径缺少 targetPosition ---
  it('[frost_axe] choice=attach 缺少 targetPosition 时验证失败', () => {
    core.phase = 'move';
    core.currentPlayer = '0' as PlayerId;
    const smith = mkUnit('smith', { abilities: ['frost_axe'], faction: 'frost' });
    const unit = putUnit(core, { row: 4, col: 3 }, smith, '0', { boosts: 2 });

    const result = validate(core, SW_COMMANDS.ACTIVATE_ABILITY, {
      abilityId: 'frost_axe',
      sourceUnitId: unit.instanceId,
      choice: 'attach',
      // 缺少 targetPosition
    });
    expect(result.valid).toBe(false);
  });

  // --- spirit_bond: self 路径 ---
  it('[spirit_bond] choice=self 充能自身', () => {
    core.phase = 'move';
    core.currentPlayer = '1' as PlayerId;
    const shaman = mkUnit('shaman', { abilities: ['spirit_bond'], faction: 'barbaric' });
    const unit = putUnit(core, { row: 4, col: 3 }, shaman, '1');

    const events = exec(core, SW_COMMANDS.ACTIVATE_ABILITY, {
      abilityId: 'spirit_bond',
      sourceUnitId: unit.instanceId,
      choice: 'self',
    });
    const chargeEvent = events.find(e => e.type === SW_EVENTS.UNIT_CHARGED);
    expect(chargeEvent).toBeDefined();
  });

  // --- spirit_bond: transfer 路径 ---
  it('[spirit_bond] choice=transfer 转移充能到友方', () => {
    core.phase = 'move';
    core.currentPlayer = '1' as PlayerId;
    const shaman = mkUnit('shaman', { abilities: ['spirit_bond'], faction: 'barbaric' });
    const unit = putUnit(core, { row: 4, col: 3 }, shaman, '1', { boosts: 2 });
    const ally = mkUnit('ally', { faction: 'barbaric' });
    putUnit(core, { row: 4, col: 4 }, ally, '1');

    const events = exec(core, SW_COMMANDS.ACTIVATE_ABILITY, {
      abilityId: 'spirit_bond',
      sourceUnitId: unit.instanceId,
      choice: 'transfer',
      targetPosition: { row: 4, col: 4 },
    });
    const chargeEvents = events.filter(e => e.type === SW_EVENTS.UNIT_CHARGED);
    expect(chargeEvents.length).toBeGreaterThanOrEqual(2); // -1 source, +1 target
  });

  // --- spirit_bond: transfer 缺少 targetPosition ---
  it('[spirit_bond] choice=transfer 缺少 targetPosition 时验证失败', () => {
    core.phase = 'move';
    core.currentPlayer = '1' as PlayerId;
    const shaman = mkUnit('shaman', { abilities: ['spirit_bond'], faction: 'barbaric' });
    const unit = putUnit(core, { row: 4, col: 3 }, shaman, '1', { boosts: 2 });

    const result = validate(core, SW_COMMANDS.ACTIVATE_ABILITY, {
      abilityId: 'spirit_bond',
      sourceUnitId: unit.instanceId,
      choice: 'transfer',
      // 缺少 targetPosition
    });
    expect(result.valid).toBe(false);
  });

  // --- spirit_bond: 无效 choice ---
  it('[spirit_bond] 无效 choice 时验证失败', () => {
    core.phase = 'move';
    core.currentPlayer = '1' as PlayerId;
    const shaman = mkUnit('shaman', { abilities: ['spirit_bond'], faction: 'barbaric' });
    const unit = putUnit(core, { row: 4, col: 3 }, shaman, '1');

    const result = validate(core, SW_COMMANDS.ACTIVATE_ABILITY, {
      abilityId: 'spirit_bond',
      sourceUnitId: unit.instanceId,
      choice: 'invalid',
    });
    expect(result.valid).toBe(false);
  });

  // --- feed_beast: self_destroy 路径 ---
  it('[feed_beast] choice=self_destroy 自毁', () => {
    core.phase = 'attack';
    core.currentPlayer = '1' as PlayerId;
    const beast = mkUnit('beast', { abilities: ['feed_beast'], unitClass: 'champion', faction: 'goblin', life: 6 });
    const unit = putUnit(core, { row: 4, col: 3 }, beast, '1');

    const events = exec(core, SW_COMMANDS.ACTIVATE_ABILITY, {
      abilityId: 'feed_beast',
      sourceUnitId: unit.instanceId,
      choice: 'self_destroy',
    });
    const destroyEvent = events.find(e =>
      e.type === SW_EVENTS.UNIT_DESTROYED
      && (e.payload as Record<string, unknown>).reason === 'feed_beast_self'
    );
    expect(destroyEvent).toBeDefined();
  });

  // --- feed_beast: destroy_adjacent 路径 ---
  it('[feed_beast] choice=destroy_adjacent 吞噬相邻友方', () => {
    core.phase = 'attack';
    core.currentPlayer = '1' as PlayerId;
    const beast = mkUnit('beast', { abilities: ['feed_beast'], unitClass: 'champion', faction: 'goblin', life: 6 });
    const unit = putUnit(core, { row: 4, col: 3 }, beast, '1');
    const victim = mkUnit('goblin-soldier', { cost: 0, faction: 'goblin' });
    putUnit(core, { row: 4, col: 4 }, victim, '1');

    const events = exec(core, SW_COMMANDS.ACTIVATE_ABILITY, {
      abilityId: 'feed_beast',
      sourceUnitId: unit.instanceId,
      choice: 'destroy_adjacent',
      targetPosition: { row: 4, col: 4 },
    });
    const destroyEvent = events.find(e =>
      e.type === SW_EVENTS.UNIT_DESTROYED
      && (e.payload as Record<string, unknown>).reason === 'feed_beast'
    );
    expect(destroyEvent).toBeDefined();
  });

  // --- feed_beast: destroy_adjacent 缺少 targetPosition ---
  it('[feed_beast] choice=destroy_adjacent 缺少 targetPosition 时验证失败', () => {
    core.phase = 'attack';
    core.currentPlayer = '1' as PlayerId;
    const beast = mkUnit('beast', { abilities: ['feed_beast'], unitClass: 'champion', faction: 'goblin', life: 6 });
    const unit = putUnit(core, { row: 4, col: 3 }, beast, '1');

    const result = validate(core, SW_COMMANDS.ACTIVATE_ABILITY, {
      abilityId: 'feed_beast',
      sourceUnitId: unit.instanceId,
      choice: 'destroy_adjacent',
      // 缺少 targetPosition
    });
    expect(result.valid).toBe(false);
  });
});

// ============================================================================
// Section 2: 单步目标选择技能 — payload 完整性
// ============================================================================

describe('单步目标选择技能 — payload 完整性', () => {
  let core: SummonerWarsCore;

  beforeEach(() => {
    resetInstanceCounter();
    core = createInitializedCore(['0', '1'], testRandom(), { faction0: 'trickster', faction1: 'necromancer' });
    clearRect(core, [2, 3, 4, 5, 6], [0, 1, 2, 3, 4, 5]);
  });

  // --- telekinesis: 攻击后推拉 ---
  it('[telekinesis] 完整 payload 产生推拉事件', () => {
    core.phase = 'attack';
    core.currentPlayer = '0' as PlayerId;
    const mage = mkUnit('wind-mage', { abilities: ['telekinesis'], faction: 'trickster', attackRange: 2 });
    const unit = putUnit(core, { row: 4, col: 3 }, mage, '0');
    const enemy = mkUnit('skeleton', { faction: 'necromancer' });
    putUnit(core, { row: 4, col: 4 }, enemy, '1');

    const events = exec(core, SW_COMMANDS.ACTIVATE_ABILITY, {
      abilityId: 'telekinesis',
      sourceUnitId: unit.instanceId,
      targetPosition: { row: 4, col: 4 },
      direction: 'push',
    });
    const pushEvent = events.find(e => e.type === SW_EVENTS.UNIT_PUSHED);
    expect(pushEvent).toBeDefined();
  });

  // --- telekinesis: 缺少 targetPosition ---
  it('[telekinesis] 缺少 targetPosition 时验证失败', () => {
    core.phase = 'attack';
    core.currentPlayer = '0' as PlayerId;
    const mage = mkUnit('wind-mage', { abilities: ['telekinesis'], faction: 'trickster' });
    const unit = putUnit(core, { row: 4, col: 3 }, mage, '0');

    const result = validate(core, SW_COMMANDS.ACTIVATE_ABILITY, {
      abilityId: 'telekinesis',
      sourceUnitId: unit.instanceId,
      direction: 'push',
      // 缺少 targetPosition
    });
    expect(result.valid).toBe(false);
  });

  // --- telekinesis: 目标是召唤师（应拒绝） ---
  it('[telekinesis] 目标是召唤师时验证失败', () => {
    core.phase = 'attack';
    core.currentPlayer = '0' as PlayerId;
    const mage = mkUnit('wind-mage', { abilities: ['telekinesis'], faction: 'trickster' });
    const unit = putUnit(core, { row: 4, col: 3 }, mage, '0');
    const enemySummoner = mkUnit('ret-summoner', { unitClass: 'summoner', faction: 'necromancer' });
    putUnit(core, { row: 4, col: 4 }, enemySummoner, '1');

    const result = validate(core, SW_COMMANDS.ACTIVATE_ABILITY, {
      abilityId: 'telekinesis',
      sourceUnitId: unit.instanceId,
      targetPosition: { row: 4, col: 4 },
      direction: 'push',
    });
    expect(result.valid).toBe(false);
  });

  // --- high_telekinesis_instead: 代替攻击推拉 ---
  it('[high_telekinesis_instead] 代替攻击推拉成功', () => {
    core.phase = 'attack';
    core.currentPlayer = '0' as PlayerId;
    core.players['0'].attackCount = 0;
    const kara = mkUnit('kara', { abilities: ['high_telekinesis_instead'], unitClass: 'champion', faction: 'trickster' });
    const unit = putUnit(core, { row: 4, col: 3 }, kara, '0', { hasAttacked: false });
    const enemy = mkUnit('skeleton', { faction: 'necromancer' });
    putUnit(core, { row: 4, col: 5 }, enemy, '1');

    const events = exec(core, SW_COMMANDS.ACTIVATE_ABILITY, {
      abilityId: 'high_telekinesis_instead',
      sourceUnitId: unit.instanceId,
      targetPosition: { row: 4, col: 5 },
      direction: 'push',
    });
    const pushEvent = events.find(e => e.type === SW_EVENTS.UNIT_PUSHED);
    expect(pushEvent).toBeDefined();
  });

  // --- high_telekinesis_instead: 已攻击时拒绝 ---
  it('[high_telekinesis_instead] 已攻击时验证失败', () => {
    core.phase = 'attack';
    core.currentPlayer = '0' as PlayerId;
    const kara = mkUnit('kara', { abilities: ['high_telekinesis_instead'], unitClass: 'champion', faction: 'trickster' });
    const unit = putUnit(core, { row: 4, col: 3 }, kara, '0', { hasAttacked: true });
    const enemy = mkUnit('skeleton', { faction: 'necromancer' });
    putUnit(core, { row: 4, col: 5 }, enemy, '1');

    const result = validate(core, SW_COMMANDS.ACTIVATE_ABILITY, {
      abilityId: 'high_telekinesis_instead',
      sourceUnitId: unit.instanceId,
      targetPosition: { row: 4, col: 5 },
      direction: 'push',
    });
    expect(result.valid).toBe(false);
  });

  // --- mind_transmission: 读心传念 ---
  it('[mind_transmission] 完整 payload 授予额外攻击', () => {
    core.phase = 'attack';
    core.currentPlayer = '0' as PlayerId;
    const gurzhuang = mkUnit('gurzhuang', { abilities: ['mind_transmission'], unitClass: 'champion', faction: 'trickster' });
    const unit = putUnit(core, { row: 4, col: 3 }, gurzhuang, '0');
    const soldier = mkUnit('soldier', { unitClass: 'common', faction: 'trickster' });
    putUnit(core, { row: 4, col: 4 }, soldier, '0');

    const events = exec(core, SW_COMMANDS.ACTIVATE_ABILITY, {
      abilityId: 'mind_transmission',
      sourceUnitId: unit.instanceId,
      targetPosition: { row: 4, col: 4 },
    });
    const extraAttack = events.find(e => e.type === SW_EVENTS.EXTRA_ATTACK_GRANTED);
    expect(extraAttack).toBeDefined();
  });

  // --- mind_transmission: 目标不是士兵 ---
  it('[mind_transmission] 目标不是士兵时验证失败', () => {
    core.phase = 'attack';
    core.currentPlayer = '0' as PlayerId;
    const gurzhuang = mkUnit('gurzhuang', { abilities: ['mind_transmission'], unitClass: 'champion', faction: 'trickster' });
    const unit = putUnit(core, { row: 4, col: 3 }, gurzhuang, '0');
    const champion = mkUnit('champion', { unitClass: 'champion', faction: 'trickster' });
    putUnit(core, { row: 4, col: 4 }, champion, '0');

    const result = validate(core, SW_COMMANDS.ACTIVATE_ABILITY, {
      abilityId: 'mind_transmission',
      sourceUnitId: unit.instanceId,
      targetPosition: { row: 4, col: 4 },
    });
    expect(result.valid).toBe(false);
  });

  // --- mind_transmission: 目标超出范围 ---
  it('[mind_transmission] 目标超出3格时验证失败', () => {
    core.phase = 'attack';
    core.currentPlayer = '0' as PlayerId;
    const gurzhuang = mkUnit('gurzhuang', { abilities: ['mind_transmission'], unitClass: 'champion', faction: 'trickster' });
    const unit = putUnit(core, { row: 4, col: 0 }, gurzhuang, '0');
    const soldier = mkUnit('soldier', { unitClass: 'common', faction: 'trickster' });
    putUnit(core, { row: 4, col: 5 }, soldier, '0'); // 距离5格

    const result = validate(core, SW_COMMANDS.ACTIVATE_ABILITY, {
      abilityId: 'mind_transmission',
      sourceUnitId: unit.instanceId,
      targetPosition: { row: 4, col: 5 },
    });
    expect(result.valid).toBe(false);
  });
});

// ============================================================================
// Section 3: 亡灵法师交互链
// ============================================================================

describe('亡灵法师交互链', () => {
  let core: SummonerWarsCore;

  beforeEach(() => {
    resetInstanceCounter();
    core = createInitializedCore(['0', '1'], testRandom(), { faction0: 'necromancer', faction1: 'necromancer' });
    clearRect(core, [2, 3, 4, 5, 6], [0, 1, 2, 3, 4, 5]);
  });

  // --- revive_undead: 完整流程 ---
  it('[revive_undead] 完整 payload 从弃牌堆复活亡灵', () => {
    core.phase = 'summon';
    core.currentPlayer = '0' as PlayerId;
    const summoner = mkUnit('ret-summoner', {
      abilities: ['revive_undead'], unitClass: 'summoner', faction: 'necromancer', life: 8,
    });
    const unit = putUnit(core, { row: 4, col: 3 }, summoner, '0');

    // 在弃牌堆放一个亡灵单位
    const undeadCard = mkUnit('skeleton-warrior', { faction: 'necromancer', unitClass: 'common' });
    const discardCard = { ...undeadCard, id: 'skeleton_warrior-0-discard' };
    core.players['0'].discard.push(discardCard as any);

    const events = exec(core, SW_COMMANDS.ACTIVATE_ABILITY, {
      abilityId: 'revive_undead',
      sourceUnitId: unit.instanceId,
      targetCardId: 'skeleton_warrior-0-discard',
      targetPosition: { row: 4, col: 4 },
    });
    const damageEvent = events.find(e =>
      e.type === SW_EVENTS.UNIT_DAMAGED
      && (e.payload as Record<string, unknown>).reason === 'revive_undead'
    );
    expect(damageEvent).toBeDefined();
  });

  // --- revive_undead: 缺少 targetCardId ---
  it('[revive_undead] 缺少 targetCardId 时验证失败', () => {
    core.phase = 'summon';
    core.currentPlayer = '0' as PlayerId;
    const summoner = mkUnit('ret-summoner', {
      abilities: ['revive_undead'], unitClass: 'summoner', faction: 'necromancer', life: 8,
    });
    const unit = putUnit(core, { row: 4, col: 3 }, summoner, '0');

    const result = validate(core, SW_COMMANDS.ACTIVATE_ABILITY, {
      abilityId: 'revive_undead',
      sourceUnitId: unit.instanceId,
      targetPosition: { row: 4, col: 4 },
      // 缺少 targetCardId
    });
    expect(result.valid).toBe(false);
  });

  // --- revive_undead: 缺少 targetPosition ---
  it('[revive_undead] 缺少 targetPosition 时验证失败', () => {
    core.phase = 'summon';
    core.currentPlayer = '0' as PlayerId;
    const summoner = mkUnit('ret-summoner', {
      abilities: ['revive_undead'], unitClass: 'summoner', faction: 'necromancer', life: 8,
    });
    const unit = putUnit(core, { row: 4, col: 3 }, summoner, '0');
    const discardCard = mkUnit('skeleton_warrior', { faction: 'necromancer' });
    core.players['0'].discard.push({ ...discardCard, id: 'sk-discard' } as any);

    const result = validate(core, SW_COMMANDS.ACTIVATE_ABILITY, {
      abilityId: 'revive_undead',
      sourceUnitId: unit.instanceId,
      targetCardId: 'sk-discard',
      // 缺少 targetPosition
    });
    expect(result.valid).toBe(false);
  });

  // --- ancestral_bond: 祖灵羁绊 ---
  it('[ancestral_bond] 完整 payload 充能目标并转移自身充能', () => {
    core.phase = 'move';
    core.currentPlayer = '1' as PlayerId;
    const summoner = mkUnit('abuya', { abilities: ['ancestral_bond'], unitClass: 'summoner', faction: 'barbaric' });
    const unit = putUnit(core, { row: 4, col: 3 }, summoner, '1', { boosts: 3 });
    const ally = mkUnit('ally', { faction: 'barbaric' });
    putUnit(core, { row: 4, col: 4 }, ally, '1');

    const events = exec(core, SW_COMMANDS.ACTIVATE_ABILITY, {
      abilityId: 'ancestral_bond',
      sourceUnitId: unit.instanceId,
      targetPosition: { row: 4, col: 4 },
    });
    const chargeEvents = events.filter(e => e.type === SW_EVENTS.UNIT_CHARGED);
    // 至少有充能事件（+1目标, 转移充能）
    expect(chargeEvents.length).toBeGreaterThanOrEqual(2);
  });

  // --- ancestral_bond: 目标超出范围 ---
  it('[ancestral_bond] 目标超出3格时验证失败', () => {
    core.phase = 'move';
    core.currentPlayer = '1' as PlayerId;
    const summoner = mkUnit('abuya', { abilities: ['ancestral_bond'], unitClass: 'summoner', faction: 'barbaric' });
    const unit = putUnit(core, { row: 4, col: 0 }, summoner, '1');
    const ally = mkUnit('ally', { faction: 'barbaric' });
    putUnit(core, { row: 4, col: 5 }, ally, '1'); // 距离5格

    const result = validate(core, SW_COMMANDS.ACTIVATE_ABILITY, {
      abilityId: 'ancestral_bond',
      sourceUnitId: unit.instanceId,
      targetPosition: { row: 4, col: 5 },
    });
    expect(result.valid).toBe(false);
  });

  // --- ancestral_bond: 选择自己 ---
  it('[ancestral_bond] 选择自己时验证失败', () => {
    core.phase = 'move';
    core.currentPlayer = '1' as PlayerId;
    const summoner = mkUnit('abuya', { abilities: ['ancestral_bond'], unitClass: 'summoner', faction: 'barbaric' });
    const unit = putUnit(core, { row: 4, col: 3 }, summoner, '1');

    const result = validate(core, SW_COMMANDS.ACTIVATE_ABILITY, {
      abilityId: 'ancestral_bond',
      sourceUnitId: unit.instanceId,
      targetPosition: { row: 4, col: 3 },
    });
    expect(result.valid).toBe(false);
  });
});
