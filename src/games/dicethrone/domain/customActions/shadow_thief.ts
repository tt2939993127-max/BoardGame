/**
 * 影子盗贼 (Shadow Thief) 专属 Custom Action 处理器
 */

import { getActiveDice, getFaceCounts, getDieFace, getTokenStackLimit } from '../rules';
import { RESOURCE_IDS } from '../resources';
import { SHADOW_THIEF_DICE_FACE_IDS, STATUS_IDS, TOKEN_IDS } from '../ids';
import { CP_MAX } from '../types';
import { buildDrawEvents } from '../deckEvents';
import type {
    DiceThroneEvent,
    DamageDealtEvent,
    CpChangedEvent,
    BonusDieRolledEvent,
    StatusAppliedEvent,
    CardDiscardedEvent,
    DamageShieldGrantedEvent,
} from '../types';
import { registerCustomActionHandler, type CustomActionContext } from '../effects';

const FACE = SHADOW_THIEF_DICE_FACE_IDS;

// ============================================================================
// 影子盗贼技能处理器
// ============================================================================

/** 匕首打击：每有[Bag]获得1CP */
function handleDaggerStrikeCp({ attackerId, state, timestamp }: CustomActionContext): DiceThroneEvent[] {
    const faceCounts = getFaceCounts(getActiveDice(state));
    const bagCount = faceCounts[FACE.BAG] || 0;

    if (bagCount <= 0) return [];

    const currentCp = state.players[attackerId]?.resources[RESOURCE_IDS.CP] ?? 0;
    const newCp = Math.min(currentCp + bagCount, CP_MAX);

    return [{
        type: 'CP_CHANGED',
        payload: { playerId: attackerId, delta: bagCount, newValue: newCp },
        sourceCommandType: 'ABILITY_EFFECT',
        timestamp,
    } as CpChangedEvent];
}

/** 匕首打击 II：每有[Card]抽1张牌 */
function handleDaggerStrikeDraw({ attackerId, state, timestamp, random }: CustomActionContext): DiceThroneEvent[] {
    if (!random) return [];
    const faceCounts = getFaceCounts(getActiveDice(state));
    const cardCount = faceCounts[FACE.CARD] || 0;
    if (cardCount <= 0) return [];
    return buildDrawEvents(state, attackerId, cardCount, random, 'ABILITY_EFFECT', timestamp);
}

/** 匕首打击：每有[Shadow]造成毒液 */
function handleDaggerStrikePoison({ targetId, sourceAbilityId, state, timestamp }: CustomActionContext): DiceThroneEvent[] {
    const faceCounts = getFaceCounts(getActiveDice(state));
    const shadowCount = faceCounts[FACE.SHADOW] || 0;

    if (shadowCount <= 0) return [];

    const stacks = shadowCount;
    const target = state.players[targetId];
    const statusId = STATUS_IDS.POISON;
    const currentStacks = target?.statusEffects[statusId] ?? 0;
    const def = state.tokenDefinitions?.find(definition => definition.id === statusId);
    const maxStacks = def?.stackLimit ?? 99;
    const newTotal = Math.min(currentStacks + stacks, maxStacks);

    return [{
        type: 'STATUS_APPLIED',
        payload: { targetId, statusId, stacks, newTotal, sourceAbilityId },
        sourceCommandType: 'ABILITY_EFFECT',
        timestamp,
    } as StatusAppliedEvent];
}

/** 抢夺：获得造成伤害一半的CP */
function handleDamageHalfCp({ ctx, attackerId, timestamp, state }: CustomActionContext): DiceThroneEvent[] {
    const damage = ctx.damageDealt;
    if (damage <= 0) return [];

    const cpGain = Math.ceil(damage / 2);
    const currentCp = state.players[attackerId]?.resources[RESOURCE_IDS.CP] ?? 0;
    const newCp = Math.min(currentCp + cpGain, CP_MAX);

    return [{
        type: 'CP_CHANGED',
        payload: { playerId: attackerId, delta: cpGain, newValue: newCp },
        sourceCommandType: 'ABILITY_EFFECT',
        timestamp,
    } as CpChangedEvent];
}

/** 偷窃：获得CP (若有Shadow则偷取) */
function handleStealCp({ targetId, attackerId, sourceAbilityId, state, timestamp, ctx, random }: CustomActionContext): DiceThroneEvent[] {
    return handleStealCpWithAmount({ targetId, attackerId, sourceAbilityId, state, timestamp, ctx, random }, 2);
}


function handleStealCp2(params: CustomActionContext) { return handleStealCpWithAmount(params, 2); }
function handleStealCp3(params: CustomActionContext) { return handleStealCpWithAmount(params, 3); }
function handleStealCp4(params: CustomActionContext) { return handleStealCpWithAmount(params, 4); }

function handleStealCpWithAmount({ targetId, attackerId, state, timestamp }: CustomActionContext, amount: number): DiceThroneEvent[] {
    const faceCounts = getFaceCounts(getActiveDice(state));
    const hasShadow = (faceCounts[FACE.SHADOW] || 0) > 0;
    const events: DiceThroneEvent[] = [];

    let gained = amount;

    if (hasShadow) {
        // Steal from opponent
        const targetCp = state.players[targetId]?.resources[RESOURCE_IDS.CP] ?? 0;
        const stolen = Math.min(targetCp, amount);
        if (stolen > 0) {
            events.push({
                type: 'CP_CHANGED',
                payload: { playerId: targetId, delta: -stolen, newValue: targetCp - stolen },
                sourceCommandType: 'ABILITY_EFFECT',
                timestamp,
            } as CpChangedEvent);
        }
        gained = stolen;
    } else {
        // Just gain from bank
        gained = amount;
    }

    if (gained > 0) {
        const currentCp = state.players[attackerId]?.resources[RESOURCE_IDS.CP] ?? 0;
        const newCp = Math.min(currentCp + gained, CP_MAX);
        events.push({
            type: 'CP_CHANGED',
            payload: { playerId: attackerId, delta: gained, newValue: newCp },
            sourceCommandType: 'ABILITY_EFFECT',
            timestamp: timestamp + 1,
        } as CpChangedEvent);
    }

    return events;
}

/** 肾击：造成等同CP的伤害 (Gain passed beforehand, so use current CP) */
function handleDamageFullCp({ attackerId, targetId, sourceAbilityId, state, timestamp, ctx }: CustomActionContext): DiceThroneEvent[] {
    const currentCp = state.players[attackerId]?.resources[RESOURCE_IDS.CP] ?? 0;
    if (currentCp <= 0) return [];

    // Deal damage
    const target = state.players[targetId];
    const targetHp = target?.resources[RESOURCE_IDS.HP] ?? 0;
    const actualDamage = Math.min(currentCp, targetHp);

    ctx.damageDealt += actualDamage;

    return [{
        type: 'DAMAGE_DEALT',
        payload: { targetId, amount: currentCp, actualDamage, sourceAbilityId },
        sourceCommandType: 'ABILITY_EFFECT',
        timestamp,
    } as DamageDealtEvent];
}

/** 暗影之舞：投掷1骰造成一半伤害 */
function handleShadowDanceRoll({ targetId, sourceAbilityId, state, timestamp, random, ctx }: CustomActionContext): DiceThroneEvent[] {
    if (!random) return [];
    const events: DiceThroneEvent[] = [];
    const dieValue = random.d(6);
    const face = getDieFace(dieValue);

    // Emit Roll Event
    events.push({
        type: 'BONUS_DIE_ROLLED',
        payload: { value: dieValue, face, playerId: ctx.attackerId, targetPlayerId: targetId, effectKey: 'bonusDie.effect.shadowDamage', effectParams: { value: dieValue } },
        sourceCommandType: 'ABILITY_EFFECT',
        timestamp,
    } as BonusDieRolledEvent);

    // Damage = ceil(value / 2)
    const damageAmt = Math.ceil(dieValue / 2);
    if (damageAmt > 0) {
        const target = state.players[targetId];
        const targetHp = target?.resources[RESOURCE_IDS.HP] ?? 0;
        const actualDamage = Math.min(damageAmt, targetHp);

        ctx.damageDealt += actualDamage;

        events.push({
            type: 'DAMAGE_DEALT',
            payload: { targetId, amount: damageAmt, actualDamage, sourceAbilityId },
            sourceCommandType: 'ABILITY_EFFECT',
            timestamp: timestamp + 1,
        } as DamageDealtEvent);
    }

    return events;
}

/** 聚宝盆：若有Shadow丢弃对手1卡 */
function handleCornucopiaDiscard({ targetId, state, timestamp, random }: CustomActionContext): DiceThroneEvent[] {
    const faceCounts = getFaceCounts(getActiveDice(state));
    const hasShadow = (faceCounts[FACE.SHADOW] || 0) > 0;

    if (!hasShadow) return [];
    if (!random) return [];

    const targetHand = state.players[targetId]?.hand || [];
    if (targetHand.length === 0) return [];

    // Random discard
    const randomIndex = Math.floor(random.random() * targetHand.length);
    const cardId = targetHand[randomIndex].id;

    return [{
        type: 'CARD_DISCARDED',
        payload: { playerId: targetId, cardId },
        sourceCommandType: 'ABILITY_EFFECT',
        timestamp,
    } as CardDiscardedEvent];
}


/** 终极：Shadow Shank Damage (Deal CP + 5) */
function handleShadowShankDamage({ attackerId, targetId, sourceAbilityId, state, timestamp, ctx }: CustomActionContext): DiceThroneEvent[] {
    const currentCp = state.players[attackerId]?.resources[RESOURCE_IDS.CP] ?? 0;
    const damageAmt = currentCp + 5;

    const target = state.players[targetId];
    const targetHp = target?.resources[RESOURCE_IDS.HP] ?? 0;
    const actualDamage = Math.min(damageAmt, targetHp);

    ctx.damageDealt += actualDamage;

    return [{
        type: 'DAMAGE_DEALT',
        payload: { targetId, amount: damageAmt, actualDamage, sourceAbilityId }, // Is ultimate usually undefendable? `isUltimate` in PendingAttack.
        sourceCommandType: 'ABILITY_EFFECT',
        timestamp,
    } as DamageDealtEvent];
}

/** 防御：暗影守护结算 */
function handleDefenseResolve({ sourceAbilityId, state, timestamp, ctx }: CustomActionContext): DiceThroneEvent[] {
    // Defense: Roll 4 dice (active dice).
    const faces = getFaceCounts(getActiveDice(state));
    const events: DiceThroneEvent[] = [];

    // 1 Dagger = 1 Dmg to opponent
    const daggers = faces[FACE.DAGGER] || 0;
    if (daggers > 0) {
        const opponentId = ctx.attackerId; // Original attacker

        const target = state.players[opponentId];
        if (target) {
            const hp = target.resources[RESOURCE_IDS.HP];
            const actual = Math.min(daggers, hp);
            events.push({
                type: 'DAMAGE_DEALT',
                payload: { targetId: opponentId, amount: daggers, actualDamage: actual, sourceAbilityId },
                sourceCommandType: 'ABILITY_EFFECT',
                timestamp: timestamp
            } as DamageDealtEvent);
        }
    }

    // 1 Bag = Draw 1 Card? (My guess)
    /*
    const bags = faces[FACE.BAG] || 0;
    if (bags > 0) {
         // events.push(...buildDrawEvents(state, targetId, bags, ctx.random!, 'ABILITY_EFFECT', timestamp));
         // Need to import buildDrawEvents if used.
    }
    */

    // 1 Shadow = Prevent 1 Dmg (Heal/Shield?)
    // Let's implement generic shadow thief defense pattern:
    // Dagger: 1 Dmg
    // Shadow: Prevent 1 Dmg (Heal/Shield?)
    // Bag: Draw 1 Card?

    // Assuming Shadow = Prevent 1 Damage.
    const shadows = faces[FACE.SHADOW] || 0;
    if (shadows > 0) {
        // Grant Damage Shield? Or assume immediate prevention?
        // Defense happens *before* damage resolution in standard flow (PreDefenseResolved).
        // But `timing: 'withDamage'` implies this effect runs alongside damage calculation?
        // Defense abilities usually reduce `PendingAttack.damage`.
        // CustomAction doesn't explicitly modify PendingAttack.
        // BUT, `DAMAGE_SHIELD_GRANTED` can be used. Or `HEAL`.
        // Or if we emit `DAMAGE_PREVENTED`?
        // Let's use `DAMAGE_SHIELD_GRANTED`.
        const selfId = ctx.defenderId;
        events.push({
            type: 'DAMAGE_SHIELD_GRANTED',
            payload: { targetId: selfId, value: shadows, sourceId: sourceAbilityId, preventStatus: false },
            sourceCommandType: 'ABILITY_EFFECT',
            timestamp
        } as DamageShieldGrantedEvent);
    }

    return events;
}


/** 移除所有负面状态 */
function handleRemoveAllDebuffs({ targetId, state, timestamp }: CustomActionContext): DiceThroneEvent[] {
    const target = state.players[targetId];
    if (!target) return [];

    const events: DiceThroneEvent[] = [];
    const debuffs = (state.tokenDefinitions || [])
        .filter(def => def.category === 'debuff')
        .map(def => def.id);

    debuffs.forEach(debuffId => {
        const stacks = target.statusEffects[debuffId] ?? 0;
        if (stacks > 0) {
            events.push({
                type: 'STATUS_REMOVED',
                payload: { targetId, statusId: debuffId, stacks },
                sourceCommandType: 'ABILITY_EFFECT',
                timestamp
            } as any);
        }
    });

    return events;
}


/** 与影共生: 投掷1骰，Shadow->Sneak Attack + 2CP，否则抽1卡 */
function handleOneWithShadows({ targetId, state, timestamp, random }: CustomActionContext): DiceThroneEvent[] {
    if (!random) return [];

    const dieValue = random.d(6);
    const face = getDieFace(dieValue);
    const events: DiceThroneEvent[] = [];

    events.push({
        type: 'BONUS_DIE_ROLLED',
        payload: { value: dieValue, face, playerId: targetId, targetPlayerId: targetId, effectKey: 'bonusDie.effect.default' },
        sourceCommandType: 'ABILITY_EFFECT',
        timestamp
    } as BonusDieRolledEvent);

    if (face === FACE.SHADOW) {
        const currentSneakAttack = state.players[targetId]?.tokens[TOKEN_IDS.SNEAK_ATTACK] ?? 0;
        const sneakAttackLimit = getTokenStackLimit(state, targetId, TOKEN_IDS.SNEAK_ATTACK);
        const newSneakAttackTotal = Math.min(currentSneakAttack + 1, sneakAttackLimit);
        events.push({
            type: 'TOKEN_GRANTED',
            payload: { targetId, tokenId: TOKEN_IDS.SNEAK_ATTACK, amount: 1, newTotal: newSneakAttackTotal, sourceAbilityId: 'action-one-with-shadows' },
            sourceCommandType: 'ABILITY_EFFECT',
            timestamp
        } as any);

        const currentCp = state.players[targetId]?.resources[RESOURCE_IDS.CP] ?? 0;
        events.push({
            type: 'CP_CHANGED',
            payload: { playerId: targetId, delta: 2, newValue: Math.min(currentCp + 2, CP_MAX) },
            sourceCommandType: 'ABILITY_EFFECT',
            timestamp
        } as CpChangedEvent);
    } else {
        events.push(...buildDrawEvents(state, targetId, 1, random, 'ABILITY_EFFECT', timestamp));
    }
    return events;
}

/** 卡牌戏法: 对手弃1。自己抽1 (若有Sneak抽2) */
function handleCardTrick({ targetId, attackerId, state, timestamp, random }: CustomActionContext): DiceThroneEvent[] {
    const events: DiceThroneEvent[] = [];

    // 1. 对手随机弃1张
    if (random) {
        const opponentHand = state.players[targetId]?.hand || [];
        if (opponentHand.length > 0) {
            const idx = Math.floor(random.random() * opponentHand.length);
            events.push({
                type: 'CARD_DISCARDED',
                payload: { playerId: targetId, cardId: opponentHand[idx].id },
                sourceCommandType: 'ABILITY_EFFECT',
                timestamp
            } as CardDiscardedEvent);
        }
    }

    // 2. 自己抽1或2张（有潜行时抽2）
    const selfTokens = state.players[attackerId]?.tokens || {};
    const hasSneak = (selfTokens[TOKEN_IDS.SNEAK] || 0) > 0;
    const drawCount = hasSneak ? 2 : 1;

    if (random) {
        events.push(...buildDrawEvents(state, attackerId, drawCount, random, 'ABILITY_EFFECT', timestamp));
    }

    return events;
}

/** 暗影防御 II 结算 */
function handleDefenseResolve2({ sourceAbilityId, state, timestamp, ctx }: CustomActionContext): DiceThroneEvent[] {
    const faces = getFaceCounts(getActiveDice(state));
    const events: DiceThroneEvent[] = [];
    const selfId = ctx.defenderId;
    const opponentId = ctx.attackerId;

    const daggers = faces[FACE.DAGGER] || 0;
    if (daggers >= 2) {
        const statusId = STATUS_IDS.POISON;
        const currentStacks = state.players[opponentId]?.statusEffects[statusId] ?? 0;
        const def = state.tokenDefinitions?.find(definition => definition.id === statusId);
        const maxStacks = def?.stackLimit ?? 99;
        const newTotal = Math.min(currentStacks + 1, maxStacks);
        events.push({
            type: 'STATUS_APPLIED',
            payload: { targetId: opponentId, statusId, stacks: 1, newTotal, sourceAbilityId },
            sourceCommandType: 'ABILITY_EFFECT',
            timestamp
        } as any);
    }

    const shadows = faces[FACE.SHADOW] || 0;
    if (shadows >= 2) {
        const currentSneakAttack = state.players[selfId]?.tokens[TOKEN_IDS.SNEAK_ATTACK] ?? 0;
        const sneakAttackLimit = getTokenStackLimit(state, selfId, TOKEN_IDS.SNEAK_ATTACK);
        const newSneakAttackTotal = Math.min(currentSneakAttack + 1, sneakAttackLimit);
        const currentSneak = state.players[selfId]?.tokens[TOKEN_IDS.SNEAK] ?? 0;
        const sneakLimit = getTokenStackLimit(state, selfId, TOKEN_IDS.SNEAK);
        const newSneakTotal = Math.min(currentSneak + 1, sneakLimit);
        events.push({
            type: 'TOKEN_GRANTED',
            payload: { targetId: selfId, tokenId: TOKEN_IDS.SNEAK_ATTACK, amount: 1, newTotal: newSneakAttackTotal, sourceAbilityId },
            sourceCommandType: 'ABILITY_EFFECT',
            timestamp
        } as any);
        events.push({
            type: 'TOKEN_GRANTED',
            payload: { targetId: selfId, tokenId: TOKEN_IDS.SNEAK, amount: 1, newTotal: newSneakTotal, sourceAbilityId },
            sourceCommandType: 'ABILITY_EFFECT',
            timestamp
        } as any);
    } else if (shadows >= 1) {
        const currentSneakAttack = state.players[selfId]?.tokens[TOKEN_IDS.SNEAK_ATTACK] ?? 0;
        const sneakAttackLimit = getTokenStackLimit(state, selfId, TOKEN_IDS.SNEAK_ATTACK);
        const newSneakAttackTotal = Math.min(currentSneakAttack + 1, sneakAttackLimit);
        events.push({
            type: 'TOKEN_GRANTED',
            payload: { targetId: selfId, tokenId: TOKEN_IDS.SNEAK_ATTACK, amount: 1, newTotal: newSneakAttackTotal, sourceAbilityId },
            sourceCommandType: 'ABILITY_EFFECT',
            timestamp
        } as any);
    }

    return events;
}

// ============================================================================
// 注册
// ============================================================================

export function registerShadowThiefCustomActions(): void {
    registerCustomActionHandler('shadow_thief-dagger-strike-cp', handleDaggerStrikeCp, { categories: ['resource'] });
    registerCustomActionHandler('shadow_thief-dagger-strike-poison', handleDaggerStrikePoison, { categories: ['status'] });
    registerCustomActionHandler('shadow_thief-dagger-strike-draw', handleDaggerStrikeDraw, { categories: ['resource'] });
    registerCustomActionHandler('shadow_thief-damage-half-cp', handleDamageHalfCp, { categories: ['resource'] });

    registerCustomActionHandler('shadow_thief-steal-cp', handleStealCp, { categories: ['resource'] });
    registerCustomActionHandler('shadow_thief-steal-cp-2', handleStealCp2, { categories: ['resource'] });
    registerCustomActionHandler('shadow_thief-steal-cp-3', handleStealCp3, { categories: ['resource'] });
    registerCustomActionHandler('shadow_thief-steal-cp-4', handleStealCp4, { categories: ['resource'] });

    registerCustomActionHandler('shadow_thief-damage-full-cp', handleDamageFullCp, { categories: ['other'] });
    registerCustomActionHandler('shadow_thief-shadow-dance-roll', handleShadowDanceRoll, { categories: ['dice'] });
    registerCustomActionHandler('shadow_thief-cornucopia-discard', handleCornucopiaDiscard, { categories: ['other'] });
    registerCustomActionHandler('shadow_thief-shadow-shank-damage', handleShadowShankDamage, { categories: ['other'] });

    registerCustomActionHandler('shadow_thief-defense-resolve', handleDefenseResolve, { categories: ['other'] });
    registerCustomActionHandler('shadow_thief-defense-resolve-2', handleDefenseResolve2, { categories: ['other'] });

    registerCustomActionHandler('shadow_thief-one-with-shadows', handleOneWithShadows, { categories: ['dice', 'resource'] });
    registerCustomActionHandler('shadow_thief-card-trick', handleCardTrick, { categories: ['other'] });

    registerCustomActionHandler('shadow_thief-remove-all-debuffs', handleRemoveAllDebuffs, { categories: ['status'] });
}
