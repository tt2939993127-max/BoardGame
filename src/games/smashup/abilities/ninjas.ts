/**
 * 大杀四方 - 忍者派系能力
 *
 * 主题：消灭随从、潜入基地
 */

import { registerAbility } from '../domain/abilityRegistry';
import type { AbilityContext, AbilityResult } from '../domain/abilityRegistry';
import { destroyMinion, moveMinion, getMinionPower, grantExtraMinion, setPromptContinuation, buildMinionTargetOptions } from '../domain/abilityHelpers';
import { SU_EVENTS } from '../domain/types';
import type { SmashUpEvent, MinionReturnedEvent, MinionPlayedEvent } from '../domain/types';
import { getCardDef, getBaseDef } from '../data/cards';
import type { MinionCardDef } from '../domain/types';
import { registerProtection, registerTrigger } from '../domain/ongoingEffects';
import { registerPromptContinuation } from '../domain/promptContinuation';

/** 注册忍者派系所有能力 */
export function registerNinjaAbilities(): void {
    // 忍者大师：消灭本基地一个随从
    registerAbility('ninja_master', 'onPlay', ninjaMaster);
    // 猛虎刺客：消灭本基地一个力量≤3的随从
    registerAbility('ninja_tiger_assassin', 'onPlay', ninjaTigerAssassin);
    // 手里剑（行动卡）：消灭一个力量≤3的随从（任意基地）
    registerAbility('ninja_seeing_stars', 'onPlay', ninjaSeeingStars);
    // 欺骗之道（行动卡）：移动己方一个随从到另一个基地
    registerAbility('ninja_way_of_deception', 'onPlay', ninjaWayOfDeception);
    // 伪装（行动卡）：将己方一个随从返回手牌，然后打出一个随从到该基地
    registerAbility('ninja_disguise', 'onPlay', ninjaDisguise);
    // 忍（special）：基地计分前打出到该基地
    registerAbility('ninja_shinobi', 'special', ninjaShinobi);
    // 侍僧（special）：回手并额外打出随从
    registerAbility('ninja_acolyte', 'special', ninjaAcolyte);
    // 隐忍（special action）：基地计分前打出手牌中的随从到该基地
    registerAbility('ninja_hidden_ninja', 'special', ninjaHiddenNinja);

    // 注册 ongoing 拦截器
    registerNinjaOngoingEffects();
}

/** 忍者大师 onPlay：消灭本基地一个随从 */
function ninjaMaster(ctx: AbilityContext): AbilityResult {
    const base = ctx.state.bases[ctx.baseIndex];
    if (!base) return { events: [] };
    const targets = base.minions.filter(m => m.uid !== ctx.cardUid);
    if (targets.length === 0) return { events: [] };
    if (targets.length === 1) {
        return { events: [destroyMinion(targets[0].uid, targets[0].defId, ctx.baseIndex, targets[0].owner, 'ninja_master', ctx.now)] };
    }
    const options = targets.map(t => {
        const def = getCardDef(t.defId) as MinionCardDef | undefined;
        const name = def?.name ?? t.defId;
        const power = getMinionPower(ctx.state, t, ctx.baseIndex);
        return { uid: t.uid, defId: t.defId, baseIndex: ctx.baseIndex, label: `${name} (力量 ${power})` };
    });
    return {
        events: [setPromptContinuation({
            abilityId: 'ninja_master',
            playerId: ctx.playerId,
            data: { promptConfig: { title: '选择要消灭的随从', options: buildMinionTargetOptions(options) } },
        }, ctx.now)],
    };
}

/** 猛虎刺客 onPlay：消灭本基地一个力量≤3的随从 */
function ninjaTigerAssassin(ctx: AbilityContext): AbilityResult {
    const base = ctx.state.bases[ctx.baseIndex];
    if (!base) return { events: [] };
    const targets = base.minions.filter(
        m => m.uid !== ctx.cardUid && getMinionPower(ctx.state, m, ctx.baseIndex) <= 3
    );
    if (targets.length === 0) return { events: [] };
    if (targets.length === 1) {
        return { events: [destroyMinion(targets[0].uid, targets[0].defId, ctx.baseIndex, targets[0].owner, 'ninja_tiger_assassin', ctx.now)] };
    }
    const options = targets.map(t => {
        const def = getCardDef(t.defId) as MinionCardDef | undefined;
        const name = def?.name ?? t.defId;
        const power = getMinionPower(ctx.state, t, ctx.baseIndex);
        return { uid: t.uid, defId: t.defId, baseIndex: ctx.baseIndex, label: `${name} (力量 ${power})` };
    });
    return {
        events: [setPromptContinuation({
            abilityId: 'ninja_tiger_assassin',
            playerId: ctx.playerId,
            data: { promptConfig: { title: '选择要消灭的力量≤3的随从', options: buildMinionTargetOptions(options) } },
        }, ctx.now)],
    };
}

/** 手里剑 onPlay：消灭一个力量≤3的随从（任意基地） */
function ninjaSeeingStars(ctx: AbilityContext): AbilityResult {
    const targets: { uid: string; defId: string; baseIndex: number; owner: string; label: string }[] = [];
    for (let i = 0; i < ctx.state.bases.length; i++) {
        for (const m of ctx.state.bases[i].minions) {
            if (m.controller !== ctx.playerId && getMinionPower(ctx.state, m, i) <= 3) {
                const def = getCardDef(m.defId) as MinionCardDef | undefined;
                const name = def?.name ?? m.defId;
                const baseDef = getBaseDef(ctx.state.bases[i].defId);
                const baseName = baseDef?.name ?? `基地 ${i + 1}`;
                const power = getMinionPower(ctx.state, m, i);
                targets.push({ uid: m.uid, defId: m.defId, baseIndex: i, owner: m.owner, label: `${name} (力量 ${power}) @ ${baseName}` });
            }
        }
    }
    if (targets.length === 0) return { events: [] };
    if (targets.length === 1) {
        return { events: [destroyMinion(targets[0].uid, targets[0].defId, targets[0].baseIndex, targets[0].owner, 'ninja_seeing_stars', ctx.now)] };
    }
    const options = targets.map(t => ({ uid: t.uid, defId: t.defId, baseIndex: t.baseIndex, label: t.label }));
    return {
        events: [setPromptContinuation({
            abilityId: 'ninja_seeing_stars',
            playerId: ctx.playerId,
            data: { promptConfig: { title: '选择要消灭的力量≤3的随从', options: buildMinionTargetOptions(options) } },
        }, ctx.now)],
    };
}

// ninja_poison (ongoing) - 已通过 ongoingModifiers 系统实现力量修正（-4力量）

/** 欺骗之道 onPlay：移动己方一个随从到另一个基地（MVP：自动选力量最高的移到随从最少的基地） */
function ninjaWayOfDeception(ctx: AbilityContext): AbilityResult {
    let strongest: { uid: string; defId: string; baseIndex: number; power: number } | undefined;
    for (let i = 0; i < ctx.state.bases.length; i++) {
        for (const m of ctx.state.bases[i].minions) {
            if (m.controller !== ctx.playerId) continue;
            const power = getMinionPower(ctx.state, m, i);
            if (!strongest || power > strongest.power) {
                strongest = { uid: m.uid, defId: m.defId, baseIndex: i, power };
            }
        }
    }
    if (!strongest) return { events: [] };

    // 移到随从最少的其他基地
    let bestBase = -1;
    let bestCount = Infinity;
    for (let i = 0; i < ctx.state.bases.length; i++) {
        if (i === strongest.baseIndex) continue;
        if (ctx.state.bases[i].minions.length < bestCount) {
            bestCount = ctx.state.bases[i].minions.length;
            bestBase = i;
        }
    }
    if (bestBase < 0) return { events: [] };

    return { events: [moveMinion(strongest.uid, strongest.defId, strongest.baseIndex, bestBase, 'ninja_way_of_deception', ctx.now)] };
}

/**
 * 伪装 onPlay：将己方一个随从返回手牌，然后打出一个随从到该基地
 * MVP：自动选力量最低的己方随从返回，然后从手牌打出力量最高的随从
 */
function ninjaDisguise(ctx: AbilityContext): AbilityResult {
    const events: SmashUpEvent[] = [];

    // 找己方力量最低的随从
    let weakest: { uid: string; defId: string; baseIndex: number; power: number; owner: string } | undefined;
    for (let i = 0; i < ctx.state.bases.length; i++) {
        for (const m of ctx.state.bases[i].minions) {
            if (m.controller !== ctx.playerId) continue;
            const power = getMinionPower(ctx.state, m, i);
            if (!weakest || power < weakest.power) {
                weakest = { uid: m.uid, defId: m.defId, baseIndex: i, power, owner: m.owner };
            }
        }
    }
    if (!weakest) return { events: [] };

    // 返回手牌
    const returnEvt: MinionReturnedEvent = {
        type: SU_EVENTS.MINION_RETURNED,
        payload: {
            minionUid: weakest.uid,
            minionDefId: weakest.defId,
            fromBaseIndex: weakest.baseIndex,
            toPlayerId: weakest.owner,
            reason: 'ninja_disguise',
        },
        timestamp: ctx.now,
    };
    events.push(returnEvt);

    // 从手牌找力量最高的随从打出到同一基地（排除当前打出的行动卡）
    const player = ctx.state.players[ctx.playerId];
    const minionCards = player.hand.filter(c => c.type === 'minion' && c.uid !== ctx.cardUid);
    if (minionCards.length === 0) return { events };

    // 按力量排序
    let bestCard: { uid: string; defId: string; power: number } | undefined;
    for (const c of minionCards) {
        const def = getCardDef(c.defId);
        if (!def || def.type !== 'minion') continue;
        const power = (def as MinionCardDef).power;
        if (!bestCard || power > bestCard.power) {
            bestCard = { uid: c.uid, defId: c.defId, power };
        }
    }
    if (!bestCard) return { events };

    const playEvt: MinionPlayedEvent = {
        type: SU_EVENTS.MINION_PLAYED,
        payload: {
            playerId: ctx.playerId,
            cardUid: bestCard.uid,
            defId: bestCard.defId,
            baseIndex: weakest.baseIndex,
            power: bestCard.power,
        },
        timestamp: ctx.now,
    };
    events.push(playEvt);

    return { events };
}


// ============================================================================
// Special 时机能力
// ============================================================================

/**
 * 忍 special：基地计分前，可以从手牌打出到该基地
 * MVP：自动打出（如果在手牌中）
 */
function ninjaShinobi(ctx: AbilityContext): AbilityResult {
    // 检查该随从是否在手牌中
    const player = ctx.state.players[ctx.playerId];
    const inHand = player.hand.find(c => c.defId === 'ninja_shinobi');
    if (!inHand) return { events: [] };

    const def = getCardDef('ninja_shinobi');
    if (!def || def.type !== 'minion') return { events: [] };

    const playEvt: MinionPlayedEvent = {
        type: SU_EVENTS.MINION_PLAYED,
        payload: {
            playerId: ctx.playerId,
            cardUid: inHand.uid,
            defId: 'ninja_shinobi',
            baseIndex: ctx.baseIndex,
            power: (def as MinionCardDef).power,
        },
        timestamp: ctx.now,
    };
    return { events: [playEvt] };
}

/**
 * 侍僧 special：将此随从从基地返回手牌，然后额外打出一个随从
 * MVP：自动执行
 */
function ninjaAcolyte(ctx: AbilityContext): AbilityResult {
    const events: SmashUpEvent[] = [];

    // 返回手牌
    const returnEvt: MinionReturnedEvent = {
        type: SU_EVENTS.MINION_RETURNED,
        payload: {
            minionUid: ctx.cardUid,
            minionDefId: ctx.defId,
            fromBaseIndex: ctx.baseIndex,
            toPlayerId: ctx.playerId,
            reason: 'ninja_acolyte',
        },
        timestamp: ctx.now,
    };
    events.push(returnEvt);

    // 额外打出一个随从
    events.push(grantExtraMinion(ctx.playerId, 'ninja_acolyte', ctx.now));

    return { events };
}

/**
 * 隐忍 special action：基地计分前，从手牌打出一个随从到该基地
 * MVP：自动选手牌中力量最高的随从
 */
function ninjaHiddenNinja(ctx: AbilityContext): AbilityResult {
    const player = ctx.state.players[ctx.playerId];
    const minionCards = player.hand.filter(c => c.type === 'minion');
    if (minionCards.length === 0) return { events: [] };

    // 选力量最高的随从
    let bestCard: { uid: string; defId: string; power: number } | undefined;
    for (const c of minionCards) {
        const def = getCardDef(c.defId);
        if (!def || def.type !== 'minion') continue;
        const power = (def as MinionCardDef).power;
        if (!bestCard || power > bestCard.power) {
            bestCard = { uid: c.uid, defId: c.defId, power };
        }
    }
    if (!bestCard) return { events: [] };

    const playEvt: MinionPlayedEvent = {
        type: SU_EVENTS.MINION_PLAYED,
        payload: {
            playerId: ctx.playerId,
            cardUid: bestCard.uid,
            defId: bestCard.defId,
            baseIndex: ctx.baseIndex,
            power: bestCard.power,
        },
        timestamp: ctx.now,
    };
    return { events: [playEvt] };
}

// ============================================================================
// Ongoing 拦截器注册
// ============================================================================

/** 注册忍者派系的 ongoing 拦截器 */
function registerNinjaOngoingEffects(): void {
    // 烟雾弹：保护同基地己方随从不受对手行动卡影响
    registerProtection('ninja_smoke_bomb', 'action', (ctx) => {
        // 只保护烟雾弹所在基地的、烟雾弹拥有者的随从
        for (const base of ctx.state.bases) {
            const bomb = base.ongoingActions.find(o => o.defId === 'ninja_smoke_bomb');
            if (!bomb) continue;
            const baseIdx = ctx.state.bases.indexOf(base);
            if (baseIdx !== ctx.targetBaseIndex) continue;
            // 只保护烟雾弹拥有者的随从，且来源是对手
            return ctx.targetMinion.controller === bomb.ownerId && ctx.sourcePlayerId !== bomb.ownerId;
        }
        return false;
    });

    // 暗杀：回合结束时消灭目标随从（附着在随从上的 ongoing）
    registerTrigger('ninja_assassination', 'onTurnEnd', (trigCtx) => {
        const events: SmashUpEvent[] = [];
        // 查找所有附着了 assassination 的随从
        for (let i = 0; i < trigCtx.state.bases.length; i++) {
            const base = trigCtx.state.bases[i];
            for (const m of base.minions) {
                const hasAssassination = m.attachedActions.some(a => a.defId === 'ninja_assassination');
                if (hasAssassination) {
                    events.push({
                        type: SU_EVENTS.MINION_DESTROYED,
                        payload: {
                            minionUid: m.uid,
                            minionDefId: m.defId,
                            fromBaseIndex: i,
                            ownerId: m.owner,
                            reason: 'ninja_assassination',
                        },
                        timestamp: trigCtx.now,
                    });
                }
            }
        }
        return events;
    });

    // 渗透：附着此卡的随从不受基地能力影响（广义保护）
    registerProtection('ninja_infiltrate', 'affect', (ctx) => {
        // 检查目标随从是否附着了 infiltrate
        return ctx.targetMinion.attachedActions.some(a => a.defId === 'ninja_infiltrate');
    });
}

// ============================================================================
// Prompt 继续函数
// ============================================================================

/** 注册忍者派系的 Prompt 继续函数 */
export function registerNinjaPromptContinuations(): void {
    // 忍者大师：选择目标后消灭
    registerPromptContinuation('ninja_master', (ctx) => {
        const { minionUid, baseIndex } = ctx.selectedValue as { minionUid: string; baseIndex: number };
        const base = ctx.state.bases[baseIndex];
        if (!base) return [];
        const target = base.minions.find(m => m.uid === minionUid);
        if (!target) return [];
        return [destroyMinion(target.uid, target.defId, baseIndex, target.owner, 'ninja_master', ctx.now)];
    });

    // 猛虎刺客：选择目标后消灭
    registerPromptContinuation('ninja_tiger_assassin', (ctx) => {
        const { minionUid, baseIndex } = ctx.selectedValue as { minionUid: string; baseIndex: number };
        const base = ctx.state.bases[baseIndex];
        if (!base) return [];
        const target = base.minions.find(m => m.uid === minionUid);
        if (!target) return [];
        return [destroyMinion(target.uid, target.defId, baseIndex, target.owner, 'ninja_tiger_assassin', ctx.now)];
    });

    // 手里剑：选择目标后消灭
    registerPromptContinuation('ninja_seeing_stars', (ctx) => {
        const { minionUid, baseIndex } = ctx.selectedValue as { minionUid: string; baseIndex: number };
        const base = ctx.state.bases[baseIndex];
        if (!base) return [];
        const target = base.minions.find(m => m.uid === minionUid);
        if (!target) return [];
        return [destroyMinion(target.uid, target.defId, baseIndex, target.owner, 'ninja_seeing_stars', ctx.now)];
    });
}
