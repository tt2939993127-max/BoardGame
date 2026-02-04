/**
 * 通用效果系统（Effect System）
 * 
 * 提供完全通用的效果操作，不预设"伤害"/"治疗"等具体概念。
 * 所有效果归结为：修改属性、管理标签、执行自定义操作。
 */

// ============================================================================
// 效果操作类型
// ============================================================================

/**
 * 表达式类型（用于动态计算效果值）
 */
export type Expression =
  | number
  | { type: 'attribute'; entityId: string; attrId: string }
  | { type: 'multiply'; left: Expression; right: Expression }
  | { type: 'add'; left: Expression; right: Expression }
  | { type: 'subtract'; left: Expression; right: Expression }
  | { type: 'min'; left: Expression; right: Expression }
  | { type: 'max'; left: Expression; right: Expression };

/**
 * 通用效果操作
 */
export type EffectOperation =
  // 属性操作
  | { type: 'modifyAttribute'; target: TargetRef; attrId: string; value: Expression }
  | { type: 'setAttribute'; target: TargetRef; attrId: string; value: Expression }
  // 标签操作
  | { type: 'addTag'; target: TargetRef; tagId: string; stacks?: number; duration?: number }
  | { type: 'removeTag'; target: TargetRef; tagId: string; stacks?: number }
  // 自定义操作（游戏扩展点）
  | { type: 'custom'; actionId: string; params?: Record<string, unknown> };

/**
 * 目标引用
 */
export type TargetRef =
  | 'self'           // 效果来源
  | 'target'         // 当前目标
  | 'allPlayers'     // 所有玩家
  | 'allEnemies'     // 所有敌人
  | { entityId: string };  // 指定实体

/**
 * 效果定义
 */
export interface EffectDefinition {
  /** 唯一标识 */
  id: string;
  /** 显示名称 */
  name?: string;
  /** 描述 */
  description?: string;
  /** 操作列表（按顺序执行） */
  operations: EffectOperation[];
  /** 触发条件（可选） */
  condition?: EffectCondition;
}

// ============================================================================
// 效果条件（简化版，复杂条件使用条件系统）
// ============================================================================

/**
 * 效果条件
 */
export type EffectCondition =
  | { type: 'always' }
  | { type: 'hasTag'; target: TargetRef; tagId: string; minStacks?: number }
  | { type: 'attributeCompare'; target: TargetRef; attrId: string; op: '<' | '<=' | '=' | '>=' | '>'; value: Expression }
  | { type: 'and'; conditions: EffectCondition[] }
  | { type: 'or'; conditions: EffectCondition[] }
  | { type: 'not'; condition: EffectCondition };

// ============================================================================
// 效果执行上下文
// ============================================================================

/**
 * 效果执行上下文接口
 * 游戏层实现此接口以支持效果执行
 */
export interface EffectExecutionContext {
  /** 效果来源实体 ID */
  sourceId: string;
  /** 当前目标实体 ID */
  targetId?: string;
  /** 效果来源标识（如技能 ID） */
  sourceAbilityId?: string;

  // 属性操作
  getAttribute(entityId: string, attrId: string): number;
  setAttribute(entityId: string, attrId: string, value: number): void;
  modifyAttribute(entityId: string, attrId: string, delta: number): number;

  // 标签操作
  hasTag(entityId: string, tagId: string): boolean;
  getTagStacks(entityId: string, tagId: string): number;
  addTag(entityId: string, tagId: string, stacks?: number, duration?: number): void;
  removeTag(entityId: string, tagId: string, stacks?: number): void;

  // 目标解析（游戏层实现具体逻辑）
  resolveTargets(ref: TargetRef): string[];

  // 自定义操作（可选扩展点）
  executeCustomAction?(actionId: string, params?: Record<string, unknown>): void;
}

// ============================================================================
// 效果执行器
// ============================================================================

/**
 * 效果执行器
 */
export class EffectExecutor {
  /**
   * 执行效果定义
   */
  execute(effect: EffectDefinition, ctx: EffectExecutionContext): void {
    // 检查条件
    if (effect.condition && !this.evaluateCondition(effect.condition, ctx)) {
      return;
    }

    // 执行操作列表
    for (const op of effect.operations) {
      this.executeOperation(op, ctx);
    }
  }

  /**
   * 执行单个操作
   */
  private executeOperation(op: EffectOperation, ctx: EffectExecutionContext): void {
    switch (op.type) {
      case 'modifyAttribute': {
        const targets = ctx.resolveTargets(op.target);
        const value = this.evaluateExpression(op.value, ctx);
        for (const entityId of targets) {
          ctx.modifyAttribute(entityId, op.attrId, value);
        }
        break;
      }
      case 'setAttribute': {
        const targets = ctx.resolveTargets(op.target);
        const value = this.evaluateExpression(op.value, ctx);
        for (const entityId of targets) {
          ctx.setAttribute(entityId, op.attrId, value);
        }
        break;
      }
      case 'addTag': {
        const targets = ctx.resolveTargets(op.target);
        for (const entityId of targets) {
          ctx.addTag(entityId, op.tagId, op.stacks, op.duration);
        }
        break;
      }
      case 'removeTag': {
        const targets = ctx.resolveTargets(op.target);
        for (const entityId of targets) {
          ctx.removeTag(entityId, op.tagId, op.stacks);
        }
        break;
      }
      case 'custom': {
        ctx.executeCustomAction?.(op.actionId, op.params);
        break;
      }
    }
  }

  /**
   * 计算表达式值
   */
  evaluateExpression(expr: Expression, ctx: EffectExecutionContext): number {
    if (typeof expr === 'number') {
      return expr;
    }

    switch (expr.type) {
      case 'attribute':
        return ctx.getAttribute(expr.entityId, expr.attrId);
      case 'multiply':
        return this.evaluateExpression(expr.left, ctx) * this.evaluateExpression(expr.right, ctx);
      case 'add':
        return this.evaluateExpression(expr.left, ctx) + this.evaluateExpression(expr.right, ctx);
      case 'subtract':
        return this.evaluateExpression(expr.left, ctx) - this.evaluateExpression(expr.right, ctx);
      case 'min':
        return Math.min(
          this.evaluateExpression(expr.left, ctx),
          this.evaluateExpression(expr.right, ctx)
        );
      case 'max':
        return Math.max(
          this.evaluateExpression(expr.left, ctx),
          this.evaluateExpression(expr.right, ctx)
        );
    }
  }

  /**
   * 评估条件
   */
  evaluateCondition(cond: EffectCondition, ctx: EffectExecutionContext): boolean {
    switch (cond.type) {
      case 'always':
        return true;
      case 'hasTag': {
        const targets = ctx.resolveTargets(cond.target);
        return targets.some(entityId => {
          const stacks = ctx.getTagStacks(entityId, cond.tagId);
          return stacks >= (cond.minStacks ?? 1);
        });
      }
      case 'attributeCompare': {
        const targets = ctx.resolveTargets(cond.target);
        const compareValue = this.evaluateExpression(cond.value, ctx);
        return targets.some(entityId => {
          const attrValue = ctx.getAttribute(entityId, cond.attrId);
          switch (cond.op) {
            case '<': return attrValue < compareValue;
            case '<=': return attrValue <= compareValue;
            case '=': return attrValue === compareValue;
            case '>=': return attrValue >= compareValue;
            case '>': return attrValue > compareValue;
          }
        });
      }
      case 'and':
        return cond.conditions.every(c => this.evaluateCondition(c, ctx));
      case 'or':
        return cond.conditions.some(c => this.evaluateCondition(c, ctx));
      case 'not':
        return !this.evaluateCondition(cond.condition, ctx);
    }
  }
}

/**
 * 创建效果执行器实例
 */
export function createEffectExecutor(): EffectExecutor {
  return new EffectExecutor();
}
