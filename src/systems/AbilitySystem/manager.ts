/**
 * 技能管理器
 */

import type { EffectAction } from '../TokenSystem/types';
import type {
    AbilityContext,
    TriggerCondition,
    EffectCondition,
    EffectResolutionContext,
} from './conditions';
import {
    evaluateTriggerCondition,
    evaluateEffectCondition,
} from './conditions';
import type {
    AbilityDef,
    AbilityEffect,
    AbilityTag,
    DamageModifier,
    EffectTiming,
    GameContext,
    EffectResolutionConfig,
} from './types';

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
        return evaluateTriggerCondition(trigger, context);
    }

    /**
     * 检查技能是否被标签阻塞
     */
    private isBlockedByTags(def: AbilityDef, blockedTags?: string[]): boolean {
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

    // ========================================================================
    // 效果过滤与条件检查
    // ========================================================================

    /**
     * 获取指定时机的效果列表
     */
    getEffectsByTiming(effects: AbilityEffect[], timing: EffectTiming): AbilityEffect[] {
        return effects.filter(effect => {
            const effectTiming = this.getEffectTiming(effect);
            return effectTiming === timing;
        });
    }

    /**
     * 获取效果的实际触发时机（应用默认值）
     */
    getEffectTiming(effect: AbilityEffect): EffectTiming {
        if (effect.timing) return effect.timing;
        // 默认时机：伤害效果为 withDamage，非伤害效果为 preDefense
        if (effect.action?.type === 'damage') return 'withDamage';
        return 'preDefense';
    }

    /**
     * 检查效果条件是否满足
     */
    checkEffectCondition(effect: AbilityEffect, resolutionCtx: EffectResolutionContext): boolean {
        const condition: EffectCondition = effect.condition ?? { type: 'always' };
        return evaluateEffectCondition(condition, resolutionCtx);
    }

    /**
     * 结算指定时机的所有效果（使用 GameContext）
     * 返回本次结算造成的总伤害
     */
    resolveEffects(
        effects: AbilityEffect[],
        timing: EffectTiming,
        resolutionCtx: EffectResolutionContext,
        gameCtx: GameContext,
        config?: EffectResolutionConfig
    ): number {
        let totalDamage = 0;
        let bonusApplied = false;
        const timedEffects = this.getEffectsByTiming(effects, timing);

        for (const effect of timedEffects) {
            if (!effect.action) continue;
            if (!this.checkEffectCondition(effect, resolutionCtx)) continue;

            const damage = this.executeEffect(
                effect.action,
                resolutionCtx,
                gameCtx,
                config && !bonusApplied ? config.bonusDamage : undefined
            );

            if (damage > 0 && config?.bonusDamageOnce) {
                bonusApplied = true;
            }

            totalDamage += damage;
            resolutionCtx.damageDealt += damage;
        }

        return totalDamage;
    }

    /**
     * 执行单个效果（内部方法）
     * 通过 GameContext 接口调用游戏特定操作
     */
    private executeEffect(
        action: EffectAction,
        ctx: EffectResolutionContext,
        gameCtx: GameContext,
        bonusDamage?: number
    ): number {
        const { attackerId, defenderId, sourceAbilityId } = ctx;
        const targetId = action.target === 'self' ? attackerId : defenderId;

        switch (action.type) {
            case 'damage': {
                const totalValue = (action.value ?? 0) + (bonusDamage ?? 0);
                return gameCtx.applyDamage(targetId, totalValue, sourceAbilityId);
            }
            case 'heal': {
                gameCtx.applyHeal(targetId, action.value ?? 0, sourceAbilityId);
                return 0;
            }
            case 'grantStatus': {
                if (action.statusId) {
                    gameCtx.grantStatus(targetId, action.statusId, action.value ?? 1, sourceAbilityId);
                }
                return 0;
            }
            case 'removeStatus': {
                if (action.statusId) {
                    gameCtx.removeStatus(targetId, action.statusId, action.value, sourceAbilityId);
                }
                return 0;
            }
            case 'custom': {
                if (action.customActionId && gameCtx.executeCustomAction) {
                    gameCtx.executeCustomAction(action.customActionId, attackerId, defenderId, sourceAbilityId);
                }
                return 0;
            }
            default:
                return 0;
        }
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
}

/** 全局技能管理器实例 */
export const abilityManager = new AbilityManager();
