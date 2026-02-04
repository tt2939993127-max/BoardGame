/**
 * 核心系统模块
 * 
 * 提供完全通用的游戏系统基础设施：
 * - Attribute: 通用数值属性管理
 * - Tag: 通用标签/状态管理
 * - Effect: 通用效果执行
 * - Ability: 通用技能框架
 * - GameContext: 通用游戏上下文接口
 */

// 属性系统
export {
  type AttributeDefinition,
  type AttributeSet,
  type AttributeChangeEvent,
  type AttributeChangeListener,
  AttributeManager,
  createAttributeManager,
} from './Attribute';

// 标签系统
export {
  type TagInstance,
  type TagSet,
  type TagChangeEvent,
  type TagChangeListener,
  TagManager,
  createTagManager,
} from './Tag';

// 效果系统
export {
  type Expression,
  type EffectOperation,
  type TargetRef,
  type EffectDefinition,
  type EffectCondition,
  type EffectExecutionContext,
  EffectExecutor,
  createEffectExecutor,
} from './Effect';

// 技能系统
export {
  type AbilityVariant,
  type AbilityDefinition,
  AbilityRegistry,
  createAbilityRegistry,
} from './Ability';

// 游戏上下文
export {
  type GameContext,
} from './GameContext';

// 条件系统
export {
  type BaseCondition,
  type AlwaysCondition,
  type AttributeCondition,
  type HasTagCondition,
  type HasAnyTagMatchingCondition,
  type CompositeCondition,
  type NotCondition,
  type CoreCondition,
  type ConditionContext,
  type ConditionEvaluator,
  ConditionRegistry,
  createConditionRegistry,
  defaultConditionRegistry,
} from './Condition';
