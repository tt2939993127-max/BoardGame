/**
 * 通用条件系统（Condition System）
 * 
 * 提供可扩展的条件评估框架：
 * - 核心条件类型由框架提供
 * - 游戏特定条件通过注册表扩展
 * - 支持 UGC 自定义条件
 */

// ============================================================================
// 基础条件接口
// ============================================================================

/**
 * 条件基础接口 - 所有条件必须实现
 */
export interface BaseCondition {
  type: string;
}

// ============================================================================
// 核心条件类型
// ============================================================================

/**
 * 无条件（始终为真）
 */
export interface AlwaysCondition extends BaseCondition {
  type: 'always';
}

/**
 * 属性比较条件
 */
export interface AttributeCondition extends BaseCondition {
  type: 'attribute';
  entityId?: string;  // 未指定时使用上下文默认实体
  attrId: string;
  op: '<' | '<=' | '=' | '>=' | '>';
  value: number;
}

/**
 * 标签存在条件
 */
export interface HasTagCondition extends BaseCondition {
  type: 'hasTag';
  entityId?: string;
  tagId: string;
  minStacks?: number;
}

/**
 * 标签模式匹配条件
 */
export interface HasAnyTagMatchingCondition extends BaseCondition {
  type: 'hasAnyTagMatching';
  entityId?: string;
  pattern: string;
}

/**
 * 复合条件
 */
export interface CompositeCondition extends BaseCondition {
  type: 'composite';
  conditions: BaseCondition[];
  logic: 'and' | 'or';
}

/**
 * 取反条件
 */
export interface NotCondition extends BaseCondition {
  type: 'not';
  condition: BaseCondition;
}

/**
 * 核心条件类型联合
 */
export type CoreCondition =
  | AlwaysCondition
  | AttributeCondition
  | HasTagCondition
  | HasAnyTagMatchingCondition
  | CompositeCondition
  | NotCondition;

// ============================================================================
// 条件上下文
// ============================================================================

/**
 * 条件评估上下文
 */
export interface ConditionContext {
  /** 默认实体 ID（未指定 entityId 时使用） */
  defaultEntityId?: string;
  /** 获取属性值 */
  getAttribute(entityId: string, attrId: string): number;
  /** 检查标签 */
  hasTag(entityId: string, tagId: string): boolean;
  /** 获取标签层数 */
  getTagStacks(entityId: string, tagId: string): number;
  /** 匹配标签模式 */
  hasAnyTagMatching(entityId: string, pattern: string): boolean;
  /** 游戏特定扩展数据 */
  [key: string]: unknown;
}

// ============================================================================
// 条件评估器
// ============================================================================

/**
 * 条件评估器函数类型
 */
export type ConditionEvaluator<T extends BaseCondition = BaseCondition> = (
  condition: T,
  context: ConditionContext
) => boolean;

/**
 * 条件注册表
 */
export class ConditionRegistry {
  private evaluators = new Map<string, ConditionEvaluator>();

  constructor() {
    // 注册核心条件评估器
    this.registerCoreConditions();
  }

  private registerCoreConditions(): void {
    this.register('always', () => true);

    this.register('attribute', (cond: AttributeCondition, ctx) => {
      const entityId = cond.entityId ?? ctx.defaultEntityId ?? '';
      const value = ctx.getAttribute(entityId, cond.attrId);
      switch (cond.op) {
        case '<': return value < cond.value;
        case '<=': return value <= cond.value;
        case '=': return value === cond.value;
        case '>=': return value >= cond.value;
        case '>': return value > cond.value;
      }
    });

    this.register('hasTag', (cond: HasTagCondition, ctx) => {
      const entityId = cond.entityId ?? ctx.defaultEntityId ?? '';
      const stacks = ctx.getTagStacks(entityId, cond.tagId);
      return stacks >= (cond.minStacks ?? 1);
    });

    this.register('hasAnyTagMatching', (cond: HasAnyTagMatchingCondition, ctx) => {
      const entityId = cond.entityId ?? ctx.defaultEntityId ?? '';
      return ctx.hasAnyTagMatching(entityId, cond.pattern);
    });

    this.register('composite', (cond: CompositeCondition, ctx) => {
      const results = cond.conditions.map(c => this.evaluate(c, ctx));
      return cond.logic === 'and'
        ? results.every(Boolean)
        : results.some(Boolean);
    });

    this.register('not', (cond: NotCondition, ctx) => {
      return !this.evaluate(cond.condition, ctx);
    });
  }

  /**
   * 注册条件评估器
   */
  register<T extends BaseCondition>(type: string, evaluator: ConditionEvaluator<T>): void {
    this.evaluators.set(type, evaluator as ConditionEvaluator);
  }

  /**
   * 评估条件
   */
  evaluate(condition: BaseCondition, context: ConditionContext): boolean {
    const evaluator = this.evaluators.get(condition.type);
    if (!evaluator) {
      console.warn(`未知条件类型: ${condition.type}`);
      return false;
    }
    return evaluator(condition, context);
  }

  /**
   * 获取所有已注册的条件类型
   */
  getRegisteredTypes(): string[] {
    return Array.from(this.evaluators.keys());
  }
}

/**
 * 创建条件注册表实例
 */
export function createConditionRegistry(): ConditionRegistry {
  return new ConditionRegistry();
}

/**
 * 默认条件注册表（共享实例）
 */
export const defaultConditionRegistry = new ConditionRegistry();
