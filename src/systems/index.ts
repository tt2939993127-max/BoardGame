/**
 * 通用游戏系统模块导出
 * 
 * 架构分层：
 * - core/: 完全通用的基础设施（Attribute、Tag、Effect、Condition、Ability）
 * - presets/: 游戏类型预设（combat 战斗类、cardgame 卡牌类等）
 * - 具体系统: TokenSystem、DiceSystem 等
 * 
 * 迁移指南：
 * - 统一使用 core/ 和 presets/combat/
 */

// ============================================================================
// 核心系统（完全通用）- 推荐使用
// ============================================================================

export * as Core from './core';

// 同时提供扁平导出便于引用
export {
  // Attribute
  type AttributeDefinition,
  type AttributeSet,
  type AttributeChangeEvent,
  AttributeManager,
  createAttributeManager,
  // Tag
  type TagInstance,
  type TagSet,
  type TagChangeEvent,
  TagManager,
  createTagManager,
  // Effect
  type Expression,
  type EffectOperation,
  type TargetRef,
  type EffectDefinition,
  EffectExecutor,
  createEffectExecutor,
  // Ability
  type AbilityVariant,
  type AbilityDefinition as CoreAbilityDefinition,
  AbilityRegistry,
  createAbilityRegistry,
  // GameContext
  type GameContext as CoreGameContext,
  // Condition
  type BaseCondition,
  type CoreCondition,
  type ConditionContext as CoreConditionContext,
  ConditionRegistry,
  createConditionRegistry,
  defaultConditionRegistry,
} from './core';

// ============================================================================
// 游戏预设 - 命名空间导出
// ============================================================================

export * as Presets from './presets';

// Combat 预设扁平导出
export {
  type EffectTiming,
  type DamageModifier,
  type AbilityEffect,
  type AbilityType,
  type AbilityTag,
  type AbilityVariantDef,
  type AbilityDef,
  type GameContext,
  type EffectResolutionConfig,
  CombatAbilityManager,
  createCombatAbilityManager,
} from './presets/combat';

// ============================================================================
// TokenSystem（统一的 Token 系统）
// ============================================================================

export * from './TokenSystem';

// ============================================================================
// AbilitySystem 已移除（不再保留向后兼容）
// ============================================================================
