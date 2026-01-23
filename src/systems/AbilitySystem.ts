/**
 * 通用技能系统
 * 
 * 支持任意游戏的技能定义、触发条件判断、效果执行。
 * 设计原则：
 * - 技能定义与具体游戏解耦
 * - 支持多种触发条件类型
 * - 可程序化执行效果或保留文本描述
 */

import type { EffectAction } from './StatusEffectSystem';

// ============================================================================
// 技能触发条件类型
// ============================================================================

/**
 * 触发条件基础接口
 */
export interface TriggerConditionBase {
    type: string;
}

/**
 * 骰子组合触发条件（王权骰铸风格）
 */
export interface DiceSetTrigger extends TriggerConditionBase {
    type: 'diceSet';
    /** 骰面要求 { faceName: count } */
    faces: Record<string, number>;
}

/**
 * 骰子顺子触发条件
 */
export interface DiceStraightTrigger extends TriggerConditionBase {
    type: 'smallStraight' | 'largeStraight';
}

/**
 * 阶段触发条件
 */
export interface PhaseTrigger extends TriggerConditionBase {
    type: 'phase';
    phaseId: string;
    /** 是否需要特定骰子数 */
    diceCount?: number;
}

/**
 * 资源消耗触发条件
 */
export interface ResourceTrigger extends TriggerConditionBase {
    type: 'resource';
    resourceId: string;
    minAmount: number;
}

/**
 * 状态效果触发条件
 */
export interface StatusTrigger extends TriggerConditionBase {
    type: 'hasStatus';
    statusId: string;
    minStacks?: number;
}

/**
 * 组合触发条件（AND）
 */
export interface CompositeTrigger extends TriggerConditionBase {
    type: 'composite';
    conditions: TriggerCondition[];
    logic: 'and' | 'or';
}

/**
 * 所有触发条件类型联合
 */
export type TriggerCondition =
    | DiceSetTrigger
    | DiceStraightTrigger
    | PhaseTrigger
    | ResourceTrigger
    | StatusTrigger
    | CompositeTrigger;

// ============================================================================
// 技能效果类型
// ============================================================================

/**
 * 技能效果定义
 * 可以是程序化执行的 EffectAction，或纯文本描述
 */
export interface AbilityEffect {
    /** 效果描述（供 UI 展示） */
    description: string;
    /** 可选的程序化执行定义 */
    action?: EffectAction;
}

// ============================================================================
// 技能定义
// ============================================================================

/**
 * 技能类型
 */
export type AbilityType = 'offensive' | 'defensive' | 'utility' | 'passive';

/**
 * 技能标签（用于终极不可响应等约束）
 */
export type AbilityTag = 
    | 'ultimate'        // 终极技能
    | 'unblockable'     // 不可防御
    | 'uninterruptible' // 不可响应/中断
    | 'instant'         // 瞬发
    | 'defensive';      // 防御类

/**
 * 伤害修改器（用于太极增伤/减伤）
 */
export interface DamageModifier {
    id: string;
    /** 来源（如 'taiji'） */
    source: string;
    /** 修改类型 */
    type: 'increase' | 'decrease' | 'multiply';
    /** 修改值 */
    value: number;
    /** 消耗的资源/状态 */
    cost?: { type: 'status' | 'resource'; id: string; amount: number };
}

/**
 * 技能变体（同一技能的不同等级/触发条件）
 */
export interface AbilityVariantDef {
    id: string;
    /** 触发条件 */
    trigger: TriggerCondition;
    /** 效果列表 */
    effects: AbilityEffect[];
    /** 优先级（用于自动选择最优变体） */
    priority?: number;
}

/**
 * 技能定义
 */
export interface AbilityDef {
    /** 唯一标识 */
    id: string;
    /** 显示名称 */
    name: string;
    /** 技能类型 */
    type: AbilityType;
    /** 图标 */
    icon?: string;
    /** 描述 */
    description?: string;
    
    /** 技能标签（用于终极不可响应等约束） */
    tags?: AbilityTag[];
    
    /** 单一触发条件（简单技能） */
    trigger?: TriggerCondition;
    /** 单一效果列表 */
    effects?: AbilityEffect[];
    
    /** 技能变体（复杂技能，如拳术 3/4/5） */
    variants?: AbilityVariantDef[];
    
    /** 冷却回合数 */
    cooldown?: number;
    /** 资源消耗 */
    cost?: { resource: string; amount: number };
    
    /** 可用的伤害修改器 */
    modifiers?: DamageModifier[];
}

// ============================================================================
// 技能管理器
// ============================================================================

/**
 * 技能上下文（用于触发条件判断）
 */
export interface AbilityContext {
    /** 当前阶段 */
    currentPhase: string;
    /** 骰子值列表 */
    diceValues?: number[];
    /** 骰面计数 { faceName: count } */
    faceCounts?: Record<string, number>;
    /** 玩家资源 { resourceId: amount } */
    resources?: Record<string, number>;
    /** 玩家状态效果 { statusId: stacks } */
    statusEffects?: Record<string, number>;
    /** 当前是否在终极触发期间（禁止响应） */
    isUltimateActive?: boolean;
    /** 被禁用的标签（如终极期间禁用 instant） */
    blockedTags?: AbilityTag[];
}

/**
 * 技能管理器
 */
export class AbilityManager {
    private definitions = new Map<string, AbilityDef>();

    /**
     * 注册技能定义
     */
    registerAbility(def: AbilityDef): void {
        this.definitions.set(def.id, def);
    }

    /**
     * 批量注册
     */
    registerAbilities(defs: AbilityDef[]): void {
        defs.forEach(def => this.registerAbility(def));
    }

    /**
     * 获取技能定义
     */
    getDefinition(id: string): AbilityDef | undefined {
        return this.definitions.get(id);
    }

    /**
     * 检查触发条件是否满足
     */
    checkTrigger(trigger: TriggerCondition, context: AbilityContext): boolean {
        switch (trigger.type) {
            case 'diceSet':
                return this.checkDiceSet(trigger, context);
            case 'smallStraight':
                return this.checkSmallStraight(context);
            case 'largeStraight':
                return this.checkLargeStraight(context);
            case 'phase':
                return this.checkPhase(trigger, context);
            case 'resource':
                return this.checkResource(trigger, context);
            case 'hasStatus':
                return this.checkStatus(trigger, context);
            case 'composite':
                return this.checkComposite(trigger, context);
            default:
                return false;
        }
    }

    /**
     * 检查技能是否被标签阻塞
     */
    private isBlockedByTags(def: AbilityDef, blockedTags?: AbilityTag[]): boolean {
        if (!blockedTags || blockedTags.length === 0) return false;
        if (!def.tags || def.tags.length === 0) return false;
        return def.tags.some(tag => blockedTags.includes(tag));
    }

    /**
     * 检查技能是否有指定标签
     */
    hasTag(abilityId: string, tag: AbilityTag): boolean {
        const def = this.definitions.get(abilityId);
        return def?.tags?.includes(tag) ?? false;
    }

    /**
     * 获取当前可用的技能 ID 列表
     */
    getAvailableAbilities(
        abilityIds: string[],
        context: AbilityContext
    ): string[] {
        const available: string[] = [];

        for (const abilityId of abilityIds) {
            const def = this.definitions.get(abilityId);
            if (!def) continue;

            // 检查标签阻塞（如终极期间禁用响应）
            if (this.isBlockedByTags(def, context.blockedTags)) continue;

            // 检查变体
            if (def.variants?.length) {
                for (const variant of def.variants) {
                    if (this.checkTrigger(variant.trigger, context)) {
                        available.push(variant.id);
                    }
                }
                continue;
            }

            // 检查单一触发条件
            if (def.trigger && this.checkTrigger(def.trigger, context)) {
                available.push(def.id);
            }
        }

        return available;
    }

    /**
     * 计算伤害修改后的最终值
     */
    applyDamageModifiers(
        baseDamage: number,
        modifiers: DamageModifier[],
        availableResources: Record<string, number>
    ): { finalDamage: number; consumedResources: Record<string, number> } {
        let damage = baseDamage;
        const consumed: Record<string, number> = {};

        for (const mod of modifiers) {
            // 检查是否有足够资源支付
            if (mod.cost) {
                const available = availableResources[mod.cost.id] ?? 0;
                if (available < mod.cost.amount) continue;
                consumed[mod.cost.id] = (consumed[mod.cost.id] ?? 0) + mod.cost.amount;
            }

            switch (mod.type) {
                case 'increase':
                    damage += mod.value;
                    break;
                case 'decrease':
                    damage = Math.max(0, damage - mod.value);
                    break;
                case 'multiply':
                    damage = Math.floor(damage * mod.value);
                    break;
            }
        }

        return { finalDamage: damage, consumedResources: consumed };
    }

    // ========================================================================
    // 私有方法：触发条件检查
    // ========================================================================

    private checkDiceSet(trigger: DiceSetTrigger, context: AbilityContext): boolean {
        if (!context.faceCounts) return false;
        return Object.entries(trigger.faces).every(([face, required]) => {
            return (context.faceCounts?.[face] ?? 0) >= required;
        });
    }

    private checkSmallStraight(context: AbilityContext): boolean {
        if (!context.diceValues) return false;
        const unique = Array.from(new Set(context.diceValues));
        const sequences = [[1, 2, 3, 4], [2, 3, 4, 5], [3, 4, 5, 6]];
        return sequences.some(seq => seq.every(v => unique.includes(v)));
    }

    private checkLargeStraight(context: AbilityContext): boolean {
        if (!context.diceValues) return false;
        const unique = Array.from(new Set(context.diceValues));
        const sequences = [[1, 2, 3, 4, 5], [2, 3, 4, 5, 6]];
        return sequences.some(seq => seq.every(v => unique.includes(v)));
    }

    private checkPhase(trigger: PhaseTrigger, context: AbilityContext): boolean {
        if (context.currentPhase !== trigger.phaseId) return false;
        if (trigger.diceCount !== undefined && context.diceValues) {
            return context.diceValues.length >= trigger.diceCount;
        }
        return true;
    }

    private checkResource(trigger: ResourceTrigger, context: AbilityContext): boolean {
        const amount = context.resources?.[trigger.resourceId] ?? 0;
        return amount >= trigger.minAmount;
    }

    private checkStatus(trigger: StatusTrigger, context: AbilityContext): boolean {
        const stacks = context.statusEffects?.[trigger.statusId] ?? 0;
        return stacks >= (trigger.minStacks ?? 1);
    }

    private checkComposite(trigger: CompositeTrigger, context: AbilityContext): boolean {
        if (trigger.logic === 'and') {
            return trigger.conditions.every(c => this.checkTrigger(c, context));
        }
        return trigger.conditions.some(c => this.checkTrigger(c, context));
    }
}

// ============================================================================
// 单例导出
// ============================================================================

/** 全局技能管理器实例 */
export const abilityManager = new AbilityManager();
