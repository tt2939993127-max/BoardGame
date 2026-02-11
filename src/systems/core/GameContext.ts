/**
 * 通用游戏上下文接口（GameContext）
 * 
 * 提供完全通用的游戏状态访问接口，不预设任何游戏类型。
 * 游戏层实现此接口以支持技能系统的效果执行。
 */

import type { TargetRef } from './Effect';

// ============================================================================
// 通用游戏上下文接口
// ============================================================================

/**
 * 通用游戏上下文接口
 * 
 * 设计原则：
 * - 只提供属性和标签操作（通用）
 * - 不预设 applyDamage/applyHeal 等战斗类操作
 * - 游戏特定操作通过 executeCustomAction 扩展
 */
export interface GameContext {
  // --------------------------------------------------------------------------
  // 属性操作
  // --------------------------------------------------------------------------

  /**
   * 获取实体属性值
   */
  getAttribute(entityId: string, attrId: string): number;

  /**
   * 设置实体属性值
   */
  setAttribute(entityId: string, attrId: string, value: number): void;

  /**
   * 修改实体属性值（增量），返回修改后的值
   */
  modifyAttribute(entityId: string, attrId: string, delta: number): number;

  // --------------------------------------------------------------------------
  // 标签操作
  // --------------------------------------------------------------------------

  /**
   * 检查实体是否有标签
   */
  hasTag(entityId: string, tagId: string): boolean;

  /**
   * 获取标签层数（无标签返回 0）
   */
  getTagStacks(entityId: string, tagId: string): number;

  /**
   * 添加标签
   */
  addTag(entityId: string, tagId: string, stacks?: number, duration?: number): void;

  /**
   * 移除标签
   */
  removeTag(entityId: string, tagId: string, stacks?: number): void;

  /**
   * 获取匹配模式的所有标签 ID
   */
  getTagsMatching(entityId: string, pattern: string): string[];

  // --------------------------------------------------------------------------
  // 目标解析
  // --------------------------------------------------------------------------

  /**
   * 解析目标引用，返回实体 ID 列表
   */
  resolveTargets(ref: TargetRef): string[];

  // --------------------------------------------------------------------------
  // 自定义操作（游戏扩展点）
  // --------------------------------------------------------------------------

  /**
   * 执行自定义操作
   * 游戏层通过此方法扩展特定逻辑（如抽牌、移动棋子等）
   */
  executeCustomAction?(actionId: string, params?: Record<string, unknown>): void;
}
