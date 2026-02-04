/**
 * 通用技能定义（Ability）
 * 
 * 提供完全通用的技能框架，不预设战斗/卡牌等游戏类型。
 */

import type { EffectDefinition, EffectCondition } from './Effect';

// ============================================================================
// 技能定义
// ============================================================================

/**
 * 技能变体（同一技能的不同触发条件/效果）
 */
export interface AbilityVariant {
  /** 变体 ID */
  id: string;
  /** 触发条件 */
  trigger?: EffectCondition;
  /** 效果列表 */
  effects: EffectDefinition[];
  /** 优先级（用于自动选择最优变体） */
  priority?: number;
  /** 变体特有标签 */
  tags?: string[];
}

/**
 * 技能定义
 */
export interface AbilityDefinition {
  /** 唯一标识 */
  id: string;
  /** 显示名称 */
  name: string;
  /** 描述 */
  description?: string;
  /** 图标 */
  icon?: string;
  /** 音效 key */
  sfxKey?: string;

  /** 技能标签（用于分类和约束） */
  tags?: string[];

  /** 单一触发条件（简单技能） */
  trigger?: EffectCondition;
  /** 单一效果列表 */
  effects?: EffectDefinition[];

  /** 技能变体（复杂技能） */
  variants?: AbilityVariant[];

  /** 冷却回合数 */
  cooldown?: number;
  /** 资源消耗 { attrId: amount } */
  cost?: Record<string, number>;
}

// ============================================================================
// 技能管理器
// ============================================================================

/**
 * 通用技能管理器
 */
export class AbilityRegistry {
  private definitions = new Map<string, AbilityDefinition>();

  /**
   * 注册技能定义
   */
  register(def: AbilityDefinition): void {
    this.definitions.set(def.id, def);
  }

  /**
   * 批量注册
   */
  registerAll(defs: AbilityDefinition[]): void {
    defs.forEach(def => this.register(def));
  }

  /**
   * 获取技能定义
   */
  get(id: string): AbilityDefinition | undefined {
    return this.definitions.get(id);
  }

  /**
   * 获取所有技能定义
   */
  getAll(): AbilityDefinition[] {
    return Array.from(this.definitions.values());
  }

  /**
   * 按标签过滤技能
   */
  getByTag(tag: string): AbilityDefinition[] {
    return this.getAll().filter(def => def.tags?.includes(tag));
  }

  /**
   * 检查技能是否有指定标签
   */
  hasTag(abilityId: string, tag: string): boolean {
    return this.definitions.get(abilityId)?.tags?.includes(tag) ?? false;
  }

  /**
   * 清空所有定义
   */
  clear(): void {
    this.definitions.clear();
  }
}

/**
 * 创建技能注册表实例
 */
export function createAbilityRegistry(): AbilityRegistry {
  return new AbilityRegistry();
}
