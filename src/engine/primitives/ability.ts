/**
 * 通用能力框架
 *
 * 提供能力定义、注册、查找、执行器分发和可用性检查的通用骨架。
 * 引擎层不预定义具体的触发类型或效果类型，游戏通过泛型特化。
 *
 * 设计原则：
 * - 泛型驱动：TEffect / TTrigger 由游戏层定义
 * - 每游戏独立实例（非全局单例），避免游戏间污染
 * - 提供 getRegisteredIds() 支持 entity-chain-integrity 测试
 * - 与 primitives/condition、primitives/effects 正交互补
 */

import type { ConditionNode, ConditionHandlerRegistry, ConditionContext } from './condition';
import { evaluateCondition } from './condition';

// ============================================================================
// 能力定义类型
// ============================================================================

/**
 * 通用能力定义
 *
 * @typeParam TEffect  效果定义类型（游戏层定义，如 DiceThrone 的 AbilityEffect）
 * @typeParam TTrigger 触发时机类型（游戏层定义，如 SummonerWars 的 AbilityTrigger 字符串联合）
 */
export interface AbilityDef<TEffect = unknown, TTrigger = string> {
  /** 唯一标识 */
  id: string;
  /** 显示名称 */
  name: string;
  /** 描述文本 */
  description?: string;
  /** 触发时机 */
  trigger?: TTrigger;
  /** 触发条件（使用 engine/primitives/condition 的 ConditionNode） */
  condition?: ConditionNode;
  /** 效果列表 */
  effects: TEffect[];
  /** 标签（如 'ultimate', 'passive'） */
  tags?: string[];
  /** 资源消耗 { resourceId: amount } */
  cost?: Record<string, number>;
  /** 冷却回合数 */
  cooldown?: number;
  /** 技能变体（同一技能的不同等级/触发条件） */
  variants?: AbilityVariant<TEffect, TTrigger>[];
  /** 游戏特定扩展元数据 */
  meta?: Record<string, unknown>;
}

/**
 * 能力变体定义
 */
export interface AbilityVariant<TEffect = unknown, TTrigger = string> {
  /** 变体 ID */
  id: string;
  /** 变体触发条件 */
  trigger: TTrigger;
  /** 变体效果列表 */
  effects: TEffect[];
  /** 变体专属标签 */
  tags?: string[];
  /** 优先级（数值越大越优先） */
  priority?: number;
}

// ============================================================================
// 执行上下文与结果
// ============================================================================

/**
 * 最小能力执行上下文
 *
 * 游戏层通过 interface 扩展添加游戏特定字段。
 */
export interface AbilityContext {
  /** 能力来源实体 ID */
  sourceId: string;
  /** 能力拥有者（玩家 ID） */
  ownerId: string;
  /** 时间戳 */
  timestamp: number;
  /** 游戏特定扩展 */
  [key: string]: unknown;
}

/**
 * 能力执行结果
 *
 * @typeParam TEvent 事件类型（游戏层定义）
 */
export interface AbilityResult<TEvent = unknown> {
  /** 产生的事件列表 */
  events: TEvent[];
  /** 需要玩家交互时返回交互配置 */
  interaction?: unknown;
}

/**
 * 能力执行器函数签名（命令式模式）
 *
 * 适用于每个能力是独立函数的游戏（如 SmashUp）。
 */
export type AbilityExecutor<
  TCtx extends AbilityContext = AbilityContext,
  TEvent = unknown,
> = (ctx: TCtx) => AbilityResult<TEvent>;

// ============================================================================
// AbilityRegistry — 能力定义注册表
// ============================================================================

/**
 * 通用能力定义注册表
 *
 * 替代各游戏独立实现的 registry/manager 中的注册+查找部分。
 * 每个游戏创建自己的实例，不使用全局单例。
 *
 * 使用示例：
 * ```
 * // SummonerWars
 * const registry = new AbilityRegistry<SWAbilityDef>('sw-abilities');
 * registry.registerAll(necromancerAbilities);
 * registry.getByTrigger('afterAttack');
 *
 * // DiceThrone
 * const registry = new AbilityRegistry<DTAbilityDef>('dt-abilities');
 * registry.register(monkSlashDef);
 * registry.getByTag('ultimate');
 * ```
 */
export class AbilityRegistry<TDef extends AbilityDef = AbilityDef> {
  private definitions = new Map<string, TDef>();
  private label: string;

  constructor(label = 'AbilityRegistry') {
    this.label = label;
  }

  /** 注册能力定义 */
  register(def: TDef): void {
    if (this.definitions.has(def.id)) {
      console.warn(`[${this.label}] "${def.id}" 已存在，将被覆盖`);
    }
    this.definitions.set(def.id, def);
  }

  /** 批量注册 */
  registerAll(defs: TDef[]): void {
    for (const def of defs) {
      this.register(def);
    }
  }

  /** 获取能力定义 */
  get(id: string): TDef | undefined {
    return this.definitions.get(id);
  }

  /** 检查是否已注册 */
  has(id: string): boolean {
    return this.definitions.has(id);
  }

  /** 获取所有已注册的定义 */
  getAll(): TDef[] {
    return Array.from(this.definitions.values());
  }

  /** 按标签筛选（定义的 tags 包含指定 tag） */
  getByTag(tag: string): TDef[] {
    return this.getAll().filter(def => def.tags?.includes(tag));
  }

  /** 按触发时机筛选 */
  getByTrigger(trigger: unknown): TDef[] {
    return this.getAll().filter(def => def.trigger === trigger);
  }

  /** 获取所有已注册的 ID（用于引用完整性验证） */
  getRegisteredIds(): Set<string> {
    return new Set(this.definitions.keys());
  }

  /** 注册表大小 */
  get size(): number {
    return this.definitions.size;
  }

  /** 清空（测试用） */
  clear(): void {
    this.definitions.clear();
  }
}

// ============================================================================
// AbilityExecutorRegistry — 能力执行器注册表
// ============================================================================

/**
 * 能力执行器注册表
 *
 * 将能力 ID（可选 + tag）映射到执行函数。
 * 支持简单 key（id）和复合 key（id + tag），替代 SmashUp 的 `(defId, tag) → executor` 模式。
 *
 * 使用示例：
 * ```
 * // SmashUp 风格（id + tag）
 * const executors = new AbilityExecutorRegistry<SmashUpCtx, SmashUpEvent>('su-executors');
 * executors.register('ninja-master', handleNinjaMasterOnPlay, 'onPlay');
 * executors.register('ninja-master', handleNinjaMasterTalent, 'talent');
 * executors.resolve('ninja-master', 'onPlay');
 *
 * // SummonerWars 风格（纯 id）
 * const executors = new AbilityExecutorRegistry<SWCtx, GameEvent>('sw-executors');
 * executors.register('soul_transfer', handleSoulTransfer);
 * executors.resolve('soul_transfer');
 * ```
 */
export class AbilityExecutorRegistry<
  TCtx extends AbilityContext = AbilityContext,
  TEvent = unknown,
> {
  private entries = new Map<string, AbilityExecutor<TCtx, TEvent>>();
  private label: string;

  constructor(label = 'AbilityExecutorRegistry') {
    this.label = label;
  }

  /** 构建内部 key */
  private makeKey(abilityId: string, tag?: string): string {
    return tag ? `${abilityId}::${tag}` : abilityId;
  }

  /** 注册执行器 */
  register(
    abilityId: string,
    executor: AbilityExecutor<TCtx, TEvent>,
    tag?: string,
  ): void {
    const key = this.makeKey(abilityId, tag);
    if (this.entries.has(key)) {
      console.warn(`[${this.label}] "${key}" 已存在，将被覆盖`);
    }
    this.entries.set(key, executor);
  }

  /** 查找执行器 */
  resolve(abilityId: string, tag?: string): AbilityExecutor<TCtx, TEvent> | undefined {
    return this.entries.get(this.makeKey(abilityId, tag));
  }

  /** 检查是否已注册 */
  has(abilityId: string, tag?: string): boolean {
    return this.entries.has(this.makeKey(abilityId, tag));
  }

  /**
   * 获取所有已注册的 key（用于引用完整性验证）
   *
   * 返回格式：无 tag 时为 "abilityId"，有 tag 时为 "abilityId::tag"
   */
  getRegisteredIds(): Set<string> {
    return new Set(this.entries.keys());
  }

  /** 注册表大小 */
  get size(): number {
    return this.entries.size;
  }

  /** 清空（测试用） */
  clear(): void {
    this.entries.clear();
  }
}

// ============================================================================
// 可用性检查工具函数
// ============================================================================

/**
 * 检查资源是否满足能力消耗
 *
 * @param def       能力定义（需含 cost 字段）
 * @param resources 当前可用资源 { resourceId: amount }
 * @returns         资源是否足够
 */
export function checkAbilityCost(
  def: Pick<AbilityDef, 'cost'>,
  resources: Record<string, number>,
): boolean {
  if (!def.cost) return true;
  for (const [resourceId, required] of Object.entries(def.cost)) {
    if ((resources[resourceId] ?? 0) < required) return false;
  }
  return true;
}

/**
 * 过滤被标签阻塞的能力
 *
 * @param defs        能力定义列表
 * @param blockedTags 被阻塞的标签集合
 * @returns           未被阻塞的能力定义
 */
export function filterByTags<TDef extends AbilityDef>(
  defs: TDef[],
  blockedTags: ReadonlySet<string> | readonly string[],
): TDef[] {
  const blocked = blockedTags instanceof Set
    ? blockedTags
    : new Set(blockedTags);
  if (blocked.size === 0) return defs;
  return defs.filter(def =>
    !def.tags?.some(tag => blocked.has(tag)),
  );
}

/**
 * 检查能力条件是否满足
 *
 * 将 AbilityDef.condition（ConditionNode）委托给 primitives/condition 评估。
 * 无条件时视为满足。
 *
 * @param def              能力定义
 * @param conditionCtx     条件评估上下文
 * @param conditionRegistry 自定义条件处理器注册表（CustomCondition 需要）
 * @returns                条件是否满足
 */
export function checkAbilityCondition(
  def: Pick<AbilityDef, 'condition'>,
  conditionCtx: ConditionContext,
  conditionRegistry?: ConditionHandlerRegistry,
): boolean {
  if (!def.condition) return true;
  return evaluateCondition(def.condition, conditionCtx, conditionRegistry);
}

// ============================================================================
// 工厂函数（便捷创建）
// ============================================================================

/** 创建能力定义注册表 */
export function createAbilityRegistry<TDef extends AbilityDef = AbilityDef>(
  label?: string,
): AbilityRegistry<TDef> {
  return new AbilityRegistry<TDef>(label);
}

/** 创建能力执行器注册表 */
export function createAbilityExecutorRegistry<
  TCtx extends AbilityContext = AbilityContext,
  TEvent = unknown,
>(label?: string): AbilityExecutorRegistry<TCtx, TEvent> {
  return new AbilityExecutorRegistry<TCtx, TEvent>(label);
}
