/**
 * 通用标签系统（Tag System）
 * 
 * 参考 UE GAS 的 GameplayTag，提供灵活的标签管理。
 * 用于状态标记、能力约束、条件查询等场景。
 * 支持层级标签（如 'status.debuff.stun'）和持续时间。
 */

// ============================================================================
// 标签类型
// ============================================================================

/**
 * 标签实例 - 带有元数据的标签
 */
export interface TagInstance {
  /** 标签 ID（支持层级，如 'status.debuff.stun'） */
  id: string;
  /** 层数（用于可叠加效果） */
  stacks: number;
  /** 剩余持续回合（undefined 表示永久） */
  duration?: number;
  /** 来源（如技能 ID） */
  source?: string;
  /** 添加时间戳 */
  addedAt?: number;
}

/**
 * 标签集合
 */
export type TagSet = Map<string, TagInstance>;

/**
 * 标签变化事件
 */
export interface TagChangeEvent {
  entityId: string;
  tagId: string;
  type: 'added' | 'removed' | 'updated';
  instance?: TagInstance;
  previousStacks?: number;
}

/**
 * 标签变化监听器
 */
export type TagChangeListener = (event: TagChangeEvent) => void;

// ============================================================================
// 标签管理器
// ============================================================================

/**
 * 通用标签管理器
 */
export class TagManager {
  /** 实体标签表 { entityId: TagSet } */
  private entityTags = new Map<string, TagSet>();
  /** 变化监听器 */
  private listeners: TagChangeListener[] = [];

  // --------------------------------------------------------------------------
  // 标签操作
  // --------------------------------------------------------------------------

  /**
   * 添加标签（如已存在则叠加层数）
   */
  addTag(
    entityId: string,
    tagId: string,
    options?: { stacks?: number; duration?: number; source?: string }
  ): TagInstance {
    let tags = this.entityTags.get(entityId);
    if (!tags) {
      tags = new Map();
      this.entityTags.set(entityId, tags);
    }

    const existing = tags.get(tagId);
    const stacks = options?.stacks ?? 1;

    if (existing) {
      // 叠加层数
      const previousStacks = existing.stacks;
      existing.stacks += stacks;
      // 更新持续时间（取较大值）
      if (options?.duration !== undefined) {
        existing.duration = Math.max(existing.duration ?? 0, options.duration);
      }
      this.notifyChange({
        entityId,
        tagId,
        type: 'updated',
        instance: existing,
        previousStacks,
      });
      return existing;
    } else {
      // 新增标签
      const instance: TagInstance = {
        id: tagId,
        stacks,
        duration: options?.duration,
        source: options?.source,
        addedAt: Date.now(),
      };
      tags.set(tagId, instance);
      this.notifyChange({
        entityId,
        tagId,
        type: 'added',
        instance,
      });
      return instance;
    }
  }

  /**
   * 移除标签（减少层数或完全移除）
   */
  removeTag(entityId: string, tagId: string, stacks?: number): boolean {
    const tags = this.entityTags.get(entityId);
    if (!tags) return false;

    const existing = tags.get(tagId);
    if (!existing) return false;

    if (stacks === undefined || stacks >= existing.stacks) {
      // 完全移除
      tags.delete(tagId);
      this.notifyChange({
        entityId,
        tagId,
        type: 'removed',
        previousStacks: existing.stacks,
      });
    } else {
      // 减少层数
      const previousStacks = existing.stacks;
      existing.stacks -= stacks;
      this.notifyChange({
        entityId,
        tagId,
        type: 'updated',
        instance: existing,
        previousStacks,
      });
    }

    return true;
  }

  /**
   * 检查是否有标签
   */
  hasTag(entityId: string, tagId: string): boolean {
    const tags = this.entityTags.get(entityId);
    return tags?.has(tagId) ?? false;
  }

  /**
   * 获取标签实例
   */
  getTag(entityId: string, tagId: string): TagInstance | undefined {
    const tags = this.entityTags.get(entityId);
    return tags?.get(tagId);
  }

  /**
   * 获取标签层数（无标签返回 0）
   */
  getTagStacks(entityId: string, tagId: string): number {
    return this.getTag(entityId, tagId)?.stacks ?? 0;
  }

  /**
   * 获取匹配模式的所有标签
   * @param pattern 支持 '*' 通配符，如 'status.*' 匹配所有状态标签
   */
  getTagsMatching(entityId: string, pattern: string): TagInstance[] {
    const tags = this.entityTags.get(entityId);
    if (!tags) return [];

    const regex = new RegExp('^' + pattern.replace(/\./g, '\\.').replace(/\*/g, '.*') + '$');
    const result: TagInstance[] = [];
    
    for (const instance of tags.values()) {
      if (regex.test(instance.id)) {
        result.push(instance);
      }
    }

    return result;
  }

  /**
   * 检查是否有任意匹配模式的标签
   */
  hasAnyTagMatching(entityId: string, pattern: string): boolean {
    return this.getTagsMatching(entityId, pattern).length > 0;
  }

  /**
   * 获取实体的所有标签
   */
  getAllTags(entityId: string): TagInstance[] {
    const tags = this.entityTags.get(entityId);
    return tags ? Array.from(tags.values()) : [];
  }

  /**
   * 清除实体的所有标签
   */
  clearTags(entityId: string): void {
    const tags = this.entityTags.get(entityId);
    if (tags) {
      for (const tagId of tags.keys()) {
        this.notifyChange({ entityId, tagId, type: 'removed' });
      }
      tags.clear();
    }
  }

  /**
   * 移除实体
   */
  removeEntity(entityId: string): void {
    this.entityTags.delete(entityId);
  }

  // --------------------------------------------------------------------------
  // 持续时间处理
  // --------------------------------------------------------------------------

  /**
   * 处理回合结束时的标签持续时间
   * 返回本回合移除的标签列表
   */
  processTurnEnd(entityId: string): string[] {
    const tags = this.entityTags.get(entityId);
    if (!tags) return [];

    const expired: string[] = [];

    for (const [tagId, instance] of tags) {
      if (instance.duration !== undefined) {
        instance.duration--;
        if (instance.duration <= 0) {
          expired.push(tagId);
        }
      }
    }

    // 移除过期标签
    for (const tagId of expired) {
      this.removeTag(entityId, tagId);
    }

    return expired;
  }

  // --------------------------------------------------------------------------
  // 事件监听
  // --------------------------------------------------------------------------

  /**
   * 添加标签变化监听器
   */
  addChangeListener(listener: TagChangeListener): () => void {
    this.listeners.push(listener);
    return () => {
      const index = this.listeners.indexOf(listener);
      if (index !== -1) this.listeners.splice(index, 1);
    };
  }

  private notifyChange(event: TagChangeEvent): void {
    for (const listener of this.listeners) {
      listener(event);
    }
  }

  // --------------------------------------------------------------------------
  // 序列化
  // --------------------------------------------------------------------------

  /**
   * 导出所有实体标签（用于游戏状态持久化）
   */
  exportState(): Record<string, TagInstance[]> {
    const result: Record<string, TagInstance[]> = {};
    for (const [entityId, tags] of this.entityTags) {
      result[entityId] = Array.from(tags.values());
    }
    return result;
  }

  /**
   * 导入实体标签
   */
  importState(state: Record<string, TagInstance[]>): void {
    this.entityTags.clear();
    for (const [entityId, instances] of Object.entries(state)) {
      const tags: TagSet = new Map();
      for (const instance of instances) {
        tags.set(instance.id, instance);
      }
      this.entityTags.set(entityId, tags);
    }
  }
}

/**
 * 创建标签管理器实例
 */
export function createTagManager(): TagManager {
  return new TagManager();
}
