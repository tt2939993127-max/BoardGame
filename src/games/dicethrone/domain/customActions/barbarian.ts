/**
 * 野蛮人 (Barbarian) 专属 Custom Action 处理器
 */

import { getActiveDice, getDieFace } from '../rules';
import { RESOURCE_IDS } from '../resources';
import { STATUS_IDS } from '../ids';
import type {
    DiceThroneEvent,
    DamageDealtEvent,
    HealAppliedEvent,
    StatusAppliedEvent,
    BonusDieRolledEvent,
    DamageShieldGrantedEvent,
    BonusDieInfo,
} from '../types';
import { buildDrawEvents } from '../deckEvents';
import { registerCustomActionHandler, createDisplayOnlySettlement, type CustomActionContext } from '../effects';

// ============================================================================
// 野蛮人技能处理器
// 注意：野蛮人骰子映射为 1-3=sword, 4-5=heart, 6=strength（见 diceConfig.ts）
// ============================================================================

/**
 * 压制 (Suppress)：投掷3骰，按剑骰面数造成伤害
 */
function handleBarbarianSuppressRoll({ ctx, targetId, attackerId, sourceAbilityId, state, timestamp, random }: CustomActionContext): DiceThroneEvent[] {
    if (!random) return [];
    const events: DiceThroneEvent[] = [];
    const dice: BonusDieInfo[] = [];

    // 投掷3个骰子
    let swordCount = 0;
    for (let i = 0; i < 3; i++) {
        const value = random.d(6);
        const face = getDieFace(value);
        if (value <= 3) {
            swordCount++;
        }
        dice.push({ index: i, value, face });
        events.push({
            type: 'BONUS_DIE_ROLLED',
            payload: {
                value,
                face,
                playerId: attackerId,
                targetPlayerId: targetId,
                effectKey: 'bonusDie.effect.barbarianSuppress',
                effectParams: { value, index: i },
            },
            sourceCommandType: 'ABILITY_EFFECT',
            timestamp: timestamp + i,
        } as BonusDieRolledEvent);
    }

    // 造成剑骰面数量的伤害
    if (swordCount > 0) {
        const target = state.players[targetId];
        const targetHp = target?.resources[RESOURCE_IDS.HP] ?? 0;
        const actualDamage = target ? Math.min(swordCount, targetHp) : 0;
        ctx.damageDealt += actualDamage;
        events.push({
            type: 'DAMAGE_DEALT',
            payload: { targetId, amount: swordCount, actualDamage, sourceAbilityId },
            sourceCommandType: 'ABILITY_EFFECT',
            timestamp,
        } as DamageDealtEvent);
    }

    // 多骰展示
    events.push(createDisplayOnlySettlement(sourceAbilityId, attackerId, targetId, dice, timestamp));

    return events;
}

/**
 * 压制 II (Suppress II)：投掷3骰，按剑骰面数造成伤害（与基础版相同）
 */
function handleBarbarianSuppress2Roll(context: CustomActionContext): DiceThroneEvent[] {
    // 压制 II 的力量变体与基础版机制相同
    return handleBarbarianSuppressRoll(context);
}

/**
 * 厚皮 (Thick Skin)：根据心骰面数治疗
 * 防御阶段投掷骰子后，每个心骰面治疗1点
 */
function handleBarbarianThickSkin({ targetId, sourceAbilityId, state, timestamp }: CustomActionContext): DiceThroneEvent[] {
    const events: DiceThroneEvent[] = [];

    // 统计心骰面数量（野蛮人骰子：4-5 = heart）
    const activeDice = getActiveDice(state);
    let heartCount = 0;
    for (const die of activeDice) {
        if (die.value === 4 || die.value === 5) {
            heartCount++;
        }
    }

    if (heartCount > 0) {
        events.push({
            type: 'HEAL_APPLIED',
            payload: { targetId, amount: heartCount, sourceAbilityId },
            sourceCommandType: 'ABILITY_EFFECT',
            timestamp,
        } as HealAppliedEvent);
    }

    return events;
}

/**
 * 厚皮 II (Thick Skin II)：根据心骰面数治疗 + 防止1个状态效果
 * 防御阶段投掷骰子后，每个心骰面治疗1点，并防止1个即将受到的状态效果
 */
function handleBarbarianThickSkin2({ targetId, sourceAbilityId, state, timestamp }: CustomActionContext): DiceThroneEvent[] {
    const events: DiceThroneEvent[] = [];

    // 统计心骰面数量
    const activeDice = getActiveDice(state);
    let heartCount = 0;
    for (const die of activeDice) {
        if (die.value === 4 || die.value === 5) {
            heartCount++;
        }
    }

    if (heartCount > 0) {
        events.push({
            type: 'HEAL_APPLIED',
            payload: { targetId, amount: heartCount, sourceAbilityId },
            sourceCommandType: 'ABILITY_EFFECT',
            timestamp,
        } as HealAppliedEvent);
    }

    // 授予伤害护盾（用于防止状态效果）
    // 注意：这里使用 grantDamageShield 的变体来实现"防止状态效果"
    // 实际实现中可能需要专用的 statusShield 机制，这里暂用护盾模拟
    events.push({
        type: 'DAMAGE_SHIELD_GRANTED',
        payload: { targetId, value: 1, sourceId: sourceAbilityId, preventStatus: true },
        sourceCommandType: 'ABILITY_EFFECT',
        timestamp,
    } as DamageShieldGrantedEvent);

    return events;
}

/**
 * 精力充沛！(Energetic)：投掷1骰
 * - 星(6) → 治疗2 + 对对手施加脑震荡
 * - 其他 → 抽1牌
 */
function handleEnergeticRoll({ targetId, attackerId, sourceAbilityId, state, timestamp, random }: CustomActionContext): DiceThroneEvent[] {
    if (!random) return [];
    const events: DiceThroneEvent[] = [];

    const dieValue = random.d(6);
    const face = getDieFace(dieValue);
    const isStrength = dieValue === 6; // 野蛮人骰子：6 = strength (星)

    events.push({
        type: 'BONUS_DIE_ROLLED',
        payload: {
            value: dieValue,
            face,
            playerId: attackerId,
            targetPlayerId: targetId,
            effectKey: isStrength ? 'bonusDie.effect.energeticStrength' : 'bonusDie.effect.energeticOther',
        },
        sourceCommandType: 'ABILITY_EFFECT',
        timestamp,
    } as BonusDieRolledEvent);

    if (isStrength) {
        // 治疗2点
        events.push({
            type: 'HEAL_APPLIED',
            payload: { targetId: attackerId, amount: 2, sourceAbilityId },
            sourceCommandType: 'ABILITY_EFFECT',
            timestamp,
        } as HealAppliedEvent);

        // 对对手施加脑震荡
        const opponentId = attackerId === '0' ? '1' : '0';
        const opponent = state.players[opponentId];
        const currentStacks = opponent?.statusEffects[STATUS_IDS.CONCUSSION] ?? 0;
        const def = state.tokenDefinitions.find(e => e.id === STATUS_IDS.CONCUSSION);
        const maxStacks = def?.stackLimit || 1;
        const newTotal = Math.min(currentStacks + 1, maxStacks);

        events.push({
            type: 'STATUS_APPLIED',
            payload: { targetId: opponentId, statusId: STATUS_IDS.CONCUSSION, stacks: 1, newTotal, sourceAbilityId },
            sourceCommandType: 'ABILITY_EFFECT',
            timestamp,
        } as StatusAppliedEvent);
    } else {
        // 抽1牌
        events.push(...buildDrawEvents(state, attackerId, 1, random, 'ABILITY_EFFECT', timestamp));
    }

    return events;
}

/**
 * 大吉大利！(Lucky)：投掷3骰，治疗 1 + 2×心骰面数
 */
function handleLuckyRollHeal({ attackerId, sourceAbilityId, timestamp, random }: CustomActionContext): DiceThroneEvent[] {
    if (!random) return [];
    const events: DiceThroneEvent[] = [];
    const dice: BonusDieInfo[] = [];

    let heartCount = 0;
    for (let i = 0; i < 3; i++) {
        const value = random.d(6);
        const face = getDieFace(value);
        if (value === 4 || value === 5) {
            heartCount++;
        }
        dice.push({ index: i, value, face });
        events.push({
            type: 'BONUS_DIE_ROLLED',
            payload: {
                value,
                face,
                playerId: attackerId,
                targetPlayerId: attackerId,
                effectKey: 'bonusDie.effect.luckyRoll',
                effectParams: { value, index: i },
            },
            sourceCommandType: 'ABILITY_EFFECT',
            timestamp: timestamp + i,
        } as BonusDieRolledEvent);
    }

    // 治疗 1 + 2×心骰面数
    const healAmount = 1 + 2 * heartCount;
    events.push({
        type: 'HEAL_APPLIED',
        payload: { targetId: attackerId, amount: healAmount, sourceAbilityId },
        sourceCommandType: 'ABILITY_EFFECT',
        timestamp,
    } as HealAppliedEvent);

    // 多骰展示
    events.push(createDisplayOnlySettlement(sourceAbilityId, attackerId, attackerId, dice, timestamp));

    return events;
}

/**
 * 再来点儿！(More Please)：投掷5骰
 * - 增加 1×剑骰面数 伤害到当前攻击
 * - 施加脑震荡
 */
function handleMorePleaseRollDamage({ ctx, targetId, attackerId, sourceAbilityId, state, timestamp, random }: CustomActionContext): DiceThroneEvent[] {
    if (!random) return [];
    const events: DiceThroneEvent[] = [];
    const dice: BonusDieInfo[] = [];

    let swordCount = 0;
    for (let i = 0; i < 5; i++) {
        const value = random.d(6);
        const face = getDieFace(value);
        if (value <= 3) {
            swordCount++;
        }
        dice.push({ index: i, value, face });
        events.push({
            type: 'BONUS_DIE_ROLLED',
            payload: {
                value,
                face,
                playerId: attackerId,
                targetPlayerId: targetId,
                effectKey: 'bonusDie.effect.morePleaseRoll',
                effectParams: { value, index: i },
            },
            sourceCommandType: 'ABILITY_EFFECT',
            timestamp: timestamp + i,
        } as BonusDieRolledEvent);
    }

    // 直接造成剑骰面数量的伤害（修复：原 accumulatedBonusDamage 无法跨上下文传递）
    if (swordCount > 0) {
        const target = state.players[targetId];
        const targetHp = target?.resources[RESOURCE_IDS.HP] ?? 0;
        const actualDamage = target ? Math.min(swordCount, targetHp) : 0;
        ctx.damageDealt += actualDamage;
        events.push({
            type: 'DAMAGE_DEALT',
            payload: { targetId, amount: swordCount, actualDamage, sourceAbilityId },
            sourceCommandType: 'ABILITY_EFFECT',
            timestamp,
        } as DamageDealtEvent);
    }

    // 对对手施加脑震荡
    const opponentId = attackerId === '0' ? '1' : '0';
    const opponent = state.players[opponentId];
    const currentStacks = opponent?.statusEffects[STATUS_IDS.CONCUSSION] ?? 0;
    const def = state.tokenDefinitions.find(e => e.id === STATUS_IDS.CONCUSSION);
    const maxStacks = def?.stackLimit || 1;
    const newTotal = Math.min(currentStacks + 1, maxStacks);

    events.push({
        type: 'STATUS_APPLIED',
        payload: { targetId: opponentId, statusId: STATUS_IDS.CONCUSSION, stacks: 1, newTotal, sourceAbilityId },
        sourceCommandType: 'ABILITY_EFFECT',
        timestamp,
    } as StatusAppliedEvent);

    // 多骰展示
    events.push(createDisplayOnlySettlement(sourceAbilityId, attackerId, targetId, dice, timestamp));

    return events;
}

// ============================================================================
// 注册所有野蛮人 Custom Action 处理器
// ============================================================================

export function registerBarbarianCustomActions(): void {
    registerCustomActionHandler('barbarian-suppress-roll', handleBarbarianSuppressRoll, {
        categories: ['dice', 'other'],
    });
    registerCustomActionHandler('barbarian-suppress-2-roll', handleBarbarianSuppress2Roll, {
        categories: ['dice', 'other'],
    });
    registerCustomActionHandler('barbarian-thick-skin', handleBarbarianThickSkin, {
        categories: ['other'],
    });
    registerCustomActionHandler('barbarian-thick-skin-2', handleBarbarianThickSkin2, {
        categories: ['other'],
    });
    registerCustomActionHandler('energetic-roll', handleEnergeticRoll, {
        categories: ['dice', 'resource'],
    });
    registerCustomActionHandler('lucky-roll-heal', handleLuckyRollHeal, {
        categories: ['dice', 'resource'],
    });
    registerCustomActionHandler('more-please-roll-damage', handleMorePleaseRollDamage, {
        categories: ['dice', 'other'],
    });
}
