/**
 * 通用属性系统（Attribute System）
 * 
 * 参考 UE GAS，提供完全通用的数值属性管理。
 * 不预设 HP/MP 等具体概念，由游戏层定义属性含义。
 */

// ============================================================================
// 属性定义
// ============================================================================

/**
 * 属性定义 - 描述一个属性的元数据
 */
export interface AttributeDefinition {
  /** 唯一标识（如 'health', 'mana', 'gold'） */
  id: string;
  /** 显示名称 */
  name: string;
  /** 最小值（默认无限制） */
  min?: number;
  /** 最大值（默认无限制） */
  max?: number;
  /** 初始值 */
  initialValue: number;
  /** 可选的属性分类（如 'resource', 'stat', 'modifier'） */
  category?: string;
}

/**
 * 属性集合 - 实体的所有属性值
 */
export type AttributeSet = Record<string, number>;

/**
 * 属性变化事件
 */
export interface AttributeChangeEvent {
  entityId: string;
  attrId: string;
  oldValue: number;
  newValue: number;
  delta: number;
  source?: string;
}

/**
 * 属性变化监听器
 */
export type AttributeChangeListener = (event: AttributeChangeEvent) => void;

// ============================================================================
// 属性管理器
// ============================================================================

/**
 * 通用属性管理器
 * 管理实体的属性定义和当前值
 */
export class AttributeManager {
  /** 属性定义表 */
  private definitions = new Map<string, AttributeDefinition>();
  /** 实体属性值表 { entityId: { attrId: value } } */
  private entityAttributes = new Map<string, AttributeSet>();
  /** 变化监听器 */
  private listeners: AttributeChangeListener[] = [];

  // --------------------------------------------------------------------------
  // 定义管理
  // --------------------------------------------------------------------------

  /**
   * 注册属性定义
   */
  registerAttribute(def: AttributeDefinition): void {
    this.definitions.set(def.id, def);
  }

  /**
   * 批量注册属性定义
   */
  registerAttributes(defs: AttributeDefinition[]): void {
    defs.forEach(def => this.registerAttribute(def));
  }

  /**
   * 获取属性定义
   */
  getDefinition(attrId: string): AttributeDefinition | undefined {
    return this.definitions.get(attrId);
  }

  /**
   * 获取所有属性定义
   */
  getAllDefinitions(): AttributeDefinition[] {
    return Array.from(this.definitions.values());
  }

  // --------------------------------------------------------------------------
  // 实体属性操作
  // --------------------------------------------------------------------------

  /**
   * 初始化实体属性（使用已注册的定义）
   */
  initializeEntity(entityId: string, overrides?: Partial<AttributeSet>): void {
    const attrs: AttributeSet = {};
    for (const def of this.definitions.values()) {
      attrs[def.id] = overrides?.[def.id] ?? def.initialValue;
    }
    this.entityAttributes.set(entityId, attrs);
  }

  /**
   * 获取实体属性值
   */
  getAttribute(entityId: string, attrId: string): number {
    const attrs = this.entityAttributes.get(entityId);
    if (!attrs) return 0;
    return attrs[attrId] ?? 0;
  }

  /**
   * 设置实体属性值（自动应用边界约束）
   */
  setAttribute(entityId: string, attrId: string, value: number, source?: string): number {
    let attrs = this.entityAttributes.get(entityId);
    if (!attrs) {
      attrs = {};
      this.entityAttributes.set(entityId, attrs);
    }

    const def = this.definitions.get(attrId);
    const oldValue = attrs[attrId] ?? 0;
    
    // 应用边界约束
    let newValue = value;
    if (def) {
      if (def.min !== undefined) newValue = Math.max(def.min, newValue);
      if (def.max !== undefined) newValue = Math.min(def.max, newValue);
    }
    
    attrs[attrId] = newValue;

    // 触发变化事件
    if (oldValue !== newValue) {
      this.notifyChange({
        entityId,
        attrId,
        oldValue,
        newValue,
        delta: newValue - oldValue,
        source,
      });
    }

    return newValue;
  }

  /**
   * 修改实体属性值（增量）
   */
  modifyAttribute(entityId: string, attrId: string, delta: number, source?: string): number {
    const currentValue = this.getAttribute(entityId, attrId);
    return this.setAttribute(entityId, attrId, currentValue + delta, source);
  }

  /**
   * 获取实体的所有属性
   */
  getEntityAttributes(entityId: string): AttributeSet | undefined {
    return this.entityAttributes.get(entityId);
  }

  /**
   * 移除实体
   */
  removeEntity(entityId: string): void {
    this.entityAttributes.delete(entityId);
  }

  // --------------------------------------------------------------------------
  // 事件监听
  // --------------------------------------------------------------------------

  /**
   * 添加属性变化监听器
   */
  addChangeListener(listener: AttributeChangeListener): () => void {
    this.listeners.push(listener);
    return () => {
      const index = this.listeners.indexOf(listener);
      if (index !== -1) this.listeners.splice(index, 1);
    };
  }

  private notifyChange(event: AttributeChangeEvent): void {
    for (const listener of this.listeners) {
      listener(event);
    }
  }

  // --------------------------------------------------------------------------
  // 序列化
  // --------------------------------------------------------------------------

  /**
   * 导出所有实体属性（用于游戏状态持久化）
   */
  exportState(): Record<string, AttributeSet> {
    const result: Record<string, AttributeSet> = {};
    for (const [entityId, attrs] of this.entityAttributes) {
      result[entityId] = { ...attrs };
    }
    return result;
  }

  /**
   * 导入实体属性
   */
  importState(state: Record<string, AttributeSet>): void {
    this.entityAttributes.clear();
    for (const [entityId, attrs] of Object.entries(state)) {
      this.entityAttributes.set(entityId, { ...attrs });
    }
  }
}

/**
 * 创建属性管理器实例
 */
export function createAttributeManager(): AttributeManager {
  return new AttributeManager();
}
