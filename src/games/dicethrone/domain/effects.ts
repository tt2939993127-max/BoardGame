/**
 * DiceThrone 效果解析器
 * 将 AbilityEffect 转换为 DiceThroneEvent（事件驱动）
 */

import type { PlayerId, RandomFn } from '../../../engine/types';
import type { EffectAction, RollDieConditionalEffect } from '../../../systems/StatusEffectSystem';
import type { AbilityEffect, EffectTiming, EffectResolutionContext } from '../../../systems/AbilitySystem';
import { abilityManager } from '../../../systems/AbilitySystem';
import { getActiveDice, getFaceCounts, getDieFace } from './rules';
import { RESOURCE_IDS } from './resources';
import type {
    DiceThroneCore,
    DiceThroneEvent,
    DamageDealtEvent,
    HealAppliedEvent,
    StatusAppliedEvent,
    StatusRemovedEvent,
    ChoiceRequestedEvent,
    BonusDieRolledEvent,
    AbilityReplacedEvent,
} from './types';
import { buildDrawEvents } from './deckEvents';
import type { AbilityDef } from '../../../systems/AbilitySystem';

// ============================================================================
// 效果上下文
// ============================================================================

export interface EffectContext {
    attackerId: PlayerId;
    defenderId: PlayerId;
    sourceAbilityId: string;
    state: DiceThroneCore;
    damageDealt: number;
    /** 额外伤害累加器（用于 rollDie 的 bonusDamage 累加） */
    accumulatedBonusDamage?: number;
}

// ============================================================================
// 效果解析器
// ============================================================================

/**
 * 将单个效果动作转换为事件
 */
function resolveEffectAction(
    action: EffectAction,
    ctx: EffectContext,
    bonusDamage?: number,
    random?: RandomFn
): DiceThroneEvent[] {
    const events: DiceThroneEvent[] = [];
    const timestamp = Date.now();
    const { attackerId, defenderId, sourceAbilityId, state } = ctx;
    const targetId = action.target === 'self' ? attackerId : defenderId;

    switch (action.type) {
        case 'damage': {
            const totalValue = (action.value ?? 0) + (bonusDamage ?? 0);
            const target = state.players[targetId];
            const targetHp = target?.resources[RESOURCE_IDS.HP] ?? 0;
            const actualDamage = target ? Math.min(totalValue, targetHp) : 0;
            
            const event: DamageDealtEvent = {
                type: 'DAMAGE_DEALT',
                payload: {
                    targetId,
                    amount: totalValue,
                    actualDamage,
                    sourceAbilityId,
                },
                sourceCommandType: 'ABILITY_EFFECT',
                timestamp,
            };
            events.push(event);
            ctx.damageDealt += actualDamage;
            break;
        }

        case 'heal': {
            const event: HealAppliedEvent = {
                type: 'HEAL_APPLIED',
                payload: {
                    targetId,
                    amount: action.value ?? 0,
                    sourceAbilityId,
                },
                sourceCommandType: 'ABILITY_EFFECT',
                timestamp,
            };
            events.push(event);
            break;
        }

        case 'grantStatus': {
            if (!action.statusId) break;
            const target = state.players[targetId];
            const currentStacks = target?.statusEffects[action.statusId] ?? 0;
            const def = state.statusDefinitions.find(e => e.id === action.statusId);
            const maxStacks = def?.stackLimit || 99;
            const stacksToAdd = action.value ?? 1;
            const newTotal = Math.min(currentStacks + stacksToAdd, maxStacks);
            
            const event: StatusAppliedEvent = {
                type: 'STATUS_APPLIED',
                payload: {
                    targetId,
                    statusId: action.statusId,
                    stacks: stacksToAdd,
                    newTotal,
                    sourceAbilityId,
                },
                sourceCommandType: 'ABILITY_EFFECT',
                timestamp,
            };
            events.push(event);
            break;
        }

        case 'removeStatus': {
            if (!action.statusId) break;
            const event: StatusRemovedEvent = {
                type: 'STATUS_REMOVED',
                payload: {
                    targetId,
                    statusId: action.statusId,
                    stacks: action.value ?? 1,
                },
                sourceCommandType: 'ABILITY_EFFECT',
                timestamp,
            };
            events.push(event);
            break;
        }

        case 'choice': {
            // 选择效果：生成 CHOICE_REQUESTED 事件
            if (!action.choiceOptions || action.choiceOptions.length === 0) break;
            const choiceEvent: ChoiceRequestedEvent = {
                type: 'CHOICE_REQUESTED',
                payload: {
                    playerId: targetId,
                    sourceAbilityId,
                    titleKey: action.choiceTitleKey || 'choices.default',
                    options: action.choiceOptions,
                },
                sourceCommandType: 'ABILITY_EFFECT',
                timestamp,
            };
            events.push(choiceEvent);
            break;
        }

        case 'rollDie': {
            // 投掷骰子效果：投掷并根据结果触发条件效果
            if (!random || !action.conditionalEffects) break;
            const diceCount = action.diceCount ?? 1;
            
            for (let i = 0; i < diceCount; i++) {
                const value = random.d(6);
                const face = getDieFace(value);
                
                // 生成 BONUS_DIE_ROLLED 事件
                const bonusDieEvent: BonusDieRolledEvent = {
                    type: 'BONUS_DIE_ROLLED',
                    payload: { value, face, playerId: targetId },
                    sourceCommandType: 'ABILITY_EFFECT',
                    timestamp,
                };
                events.push(bonusDieEvent);
                
                // 查找匹配的条件效果
                const matchedEffect = action.conditionalEffects.find(e => e.face === face);
                if (matchedEffect) {
                    events.push(...resolveConditionalEffect(matchedEffect, ctx, targetId, sourceAbilityId, timestamp));
                }
            }
            break;
        }

        case 'custom': {
            const actionId = action.customActionId;
            if (!actionId) break;

            if (actionId === 'meditation-taiji') {
                const faceCounts = getFaceCounts(getActiveDice(state));
                const stacksToAdd = faceCounts.taiji;
                const target = state.players[targetId];
                const currentStacks = target?.statusEffects.taiji ?? 0;
                const def = state.statusDefinitions.find(e => e.id === 'taiji');
                const maxStacks = def?.stackLimit || 99;
                const newTotal = Math.min(currentStacks + stacksToAdd, maxStacks);
                const event: StatusAppliedEvent = {
                    type: 'STATUS_APPLIED',
                    payload: {
                        targetId,
                        statusId: 'taiji',
                        stacks: stacksToAdd,
                        newTotal,
                        sourceAbilityId,
                    },
                    sourceCommandType: 'ABILITY_EFFECT',
                    timestamp,
                };
                events.push(event);
                break;
            }

            if (actionId === 'meditation-damage') {
                const faceCounts = getFaceCounts(getActiveDice(state));
                const amount = faceCounts.fist;
                const target = state.players[targetId];
                const targetHp = target?.resources[RESOURCE_IDS.HP] ?? 0;
                const actualDamage = target ? Math.min(amount, targetHp) : 0;
                const event: DamageDealtEvent = {
                    type: 'DAMAGE_DEALT',
                    payload: {
                        targetId,
                        amount,
                        actualDamage,
                        sourceAbilityId,
                    },
                    sourceCommandType: 'ABILITY_EFFECT',
                    timestamp,
                };
                events.push(event);
                ctx.damageDealt += actualDamage;
                break;
            }
            break;
        }

        case 'drawCard': {
            // 抽牌效果（牌库为空则洗弃牌堆）
            if (!random) break;
            const count = action.drawCount ?? 1;
            events.push(...buildDrawEvents(state, targetId, count, random, 'ABILITY_EFFECT', timestamp));
            break;
        }

        case 'replaceAbility': {
            // 替换技能效果（升级卡使用）
            const { targetAbilityId, newAbilityDef, newAbilityLevel } = action;
            if (!targetAbilityId || !newAbilityDef) break;

            const currentLevel = state.players[targetId]?.abilityLevels?.[targetAbilityId] ?? 1;
            let resolvedLevel = newAbilityLevel ?? Math.min(3, currentLevel + 1);
            resolvedLevel = Math.max(1, Math.min(3, Math.floor(resolvedLevel)));

            const replaceEvent: AbilityReplacedEvent = {
                type: 'ABILITY_REPLACED',
                payload: {
                    playerId: targetId,
                    oldAbilityId: targetAbilityId,
                    newAbilityDef: newAbilityDef as AbilityDef,
                    cardId: sourceAbilityId,
                    newLevel: resolvedLevel,
                },
                sourceCommandType: 'ABILITY_EFFECT',
                timestamp,
            };
            events.push(replaceEvent);
            break;
        }
    }

    return events;
}

/**
 * 处理 rollDie 的条件效果
 */
function resolveConditionalEffect(
    effect: RollDieConditionalEffect,
    ctx: EffectContext,
    targetId: PlayerId,
    sourceAbilityId: string,
    timestamp: number
): DiceThroneEvent[] {
    const events: DiceThroneEvent[] = [];
    const { state } = ctx;
    
    // 处理 bonusDamage
    if (effect.bonusDamage) {
        ctx.accumulatedBonusDamage = (ctx.accumulatedBonusDamage ?? 0) + effect.bonusDamage;
    }
    
    // 处理 grantStatus
    if (effect.grantStatus) {
        const { statusId, value } = effect.grantStatus;
        const target = state.players[targetId];
        const currentStacks = target?.statusEffects[statusId] ?? 0;
        const def = state.statusDefinitions.find(e => e.id === statusId);
        const maxStacks = def?.stackLimit || 99;
        const newTotal = Math.min(currentStacks + value, maxStacks);
        
        const event: StatusAppliedEvent = {
            type: 'STATUS_APPLIED',
            payload: {
                targetId,
                statusId,
                stacks: value,
                newTotal,
                sourceAbilityId,
            },
            sourceCommandType: 'ABILITY_EFFECT',
            timestamp,
        };
        events.push(event);
    }
    
    // 处理 triggerChoice
    if (effect.triggerChoice) {
        const choiceEvent: ChoiceRequestedEvent = {
            type: 'CHOICE_REQUESTED',
            payload: {
                playerId: targetId,
                sourceAbilityId,
                titleKey: effect.triggerChoice.titleKey,
                options: effect.triggerChoice.options,
            },
            sourceCommandType: 'ABILITY_EFFECT',
            timestamp,
        };
        events.push(choiceEvent);
    }
    
    return events;
}

/**
 * 解析指定时机的所有效果，生成事件
 */
export function resolveEffectsToEvents(
    effects: AbilityEffect[],
    timing: EffectTiming,
    ctx: EffectContext,
    config?: { bonusDamage?: number; bonusDamageOnce?: boolean; random?: RandomFn }
): DiceThroneEvent[] {
    const events: DiceThroneEvent[] = [];
    let bonusApplied = false;

    // 构建 EffectResolutionContext 用于条件检查
    const resolutionCtx: EffectResolutionContext = {
        attackerId: ctx.attackerId,
        defenderId: ctx.defenderId,
        sourceAbilityId: ctx.sourceAbilityId,
        damageDealt: ctx.damageDealt,
        attackerStatusEffects: ctx.state.players[ctx.attackerId]?.statusEffects,
        defenderStatusEffects: ctx.state.players[ctx.defenderId]?.statusEffects,
    };

    const timedEffects = abilityManager.getEffectsByTiming(effects, timing);

    for (const effect of timedEffects) {
        if (!effect.action) continue;
        if (!abilityManager.checkEffectCondition(effect, resolutionCtx)) continue;

        // 计算额外伤害：包括配置的 bonusDamage + rollDie 累加的 accumulatedBonusDamage
        let totalBonus = 0;
        if (config && !bonusApplied && config.bonusDamage) {
            totalBonus += config.bonusDamage;
        }
        if (ctx.accumulatedBonusDamage) {
            totalBonus += ctx.accumulatedBonusDamage;
        }
        
        const effectEvents = resolveEffectAction(effect.action, ctx, totalBonus || undefined, config?.random);
        events.push(...effectEvents);

        // 如果产生伤害且只允许一次加成
        if (effectEvents.some(e => e.type === 'DAMAGE_DEALT') && config?.bonusDamageOnce) {
            bonusApplied = true;
            // 伤害已应用，清空累加的额外伤害
            ctx.accumulatedBonusDamage = 0;
        }

        // 更新 resolutionCtx.damageDealt 用于后续条件检查
        resolutionCtx.damageDealt = ctx.damageDealt;
    }

    return events;
}
