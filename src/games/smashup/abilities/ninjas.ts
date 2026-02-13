/**
 * 大杀四方 - 忍者派系能�?
 *
 * 主题：消灭随从、潜入基�?
 */

import { registerAbility } from '../domain/abilityRegistry';
import type { AbilityContext, AbilityResult } from '../domain/abilityRegistry';
import { destroyMinion, moveMinion, getMinionPower, grantExtraMinion, buildMinionTargetOptions, buildBaseTargetOptions } from '../domain/abilityHelpers';
import { SU_EVENTS } from '../domain/types';
import type { SmashUpEvent, SmashUpCore, MinionReturnedEvent, MinionPlayedEvent } from '../domain/types';
import { getCardDef, getBaseDef } from '../data/cards';
import type { MinionCardDef } from '../domain/types';
import { registerProtection, registerTrigger } from '../domain/ongoingEffects';
import { createSimpleChoice, queueInteraction } from '../../../engine/systems/InteractionSystem';
import { registerInteractionHandler } from '../domain/abilityInteractionHandlers';
import type { MatchState } from '../../../engine/types';

/** 注册忍者派系所有能�?*/
export function registerNinjaAbilities(): void {
    // 忍者大师：消灭本基地一个随�?
    registerAbility('ninja_master', 'onPlay', ninjaMaster);
    // 猛虎刺客：消灭本基地一个力量≤3的随�?
    registerAbility('ninja_tiger_assassin', 'onPlay', ninjaTigerAssassin);
    // 手里剑（行动卡）：消灭一个力量≤3的随从（任意基地�?
    registerAbility('ninja_seeing_stars', 'onPlay', ninjaSeeingStars);
    // 欺骗之道（行动卡）：移动己方一个随从到另一个基�?
    registerAbility('ninja_way_of_deception', 'onPlay', ninjaWayOfDeception);
    // 伪装（行动卡）：将己方一个随从返回手牌，然后打出一个随从到该基�?
    registerAbility('ninja_disguise', 'onPlay', ninjaDisguise);
    // 忍（special）：基地计分前打出到该基�?
    registerAbility('ninja_shinobi', 'special', ninjaShinobi);
    // 侍僧（special）：回手并额外打出随�?
    registerAbility('ninja_acolyte', 'special', ninjaAcolyte);
    // 隐忍（special action）：基地计分前打出手牌中的随从到该基�?
    registerAbility('ninja_hidden_ninja', 'special', ninjaHiddenNinja);

    // 注册 ongoing 拦截�?
    registerNinjaOngoingEffects();
}

/** 忍者大�?onPlay：消灭本基地一个随�?*/
function ninjaMaster(ctx: AbilityContext): AbilityResult {
    const base = ctx.state.bases[ctx.baseIndex];
    if (!base) return { events: [] };
    const targets = base.minions.filter(m => m.uid !== ctx.cardUid);
    if (targets.length === 0) return { events: [] };
    const options = targets.map(t => {
        const def = getCardDef(t.defId) as MinionCardDef | undefined;
        const name = def?.name ?? t.defId;
        const power = getMinionPower(ctx.state, t, ctx.baseIndex);
        return { uid: t.uid, defId: t.defId, baseIndex: ctx.baseIndex, label: `${name} (力量 ${power})` };
    });
    const interaction = createSimpleChoice(
        `ninja_master_${ctx.now}`, ctx.playerId,
        '选择要消灭的随从', buildMinionTargetOptions(options), 'ninja_master',
    );
    return { events: [], matchState: queueInteraction(ctx.matchState, interaction) };
}

/** 猛虎刺客 onPlay：消灭本基地一个力量≤3的随�?*/
function ninjaTigerAssassin(ctx: AbilityContext): AbilityResult {
    const base = ctx.state.bases[ctx.baseIndex];
    if (!base) return { events: [] };
    const targets = base.minions.filter(
        m => m.uid !== ctx.cardUid && getMinionPower(ctx.state, m, ctx.baseIndex) <= 3
    );
    if (targets.length === 0) return { events: [] };
    const options = targets.map(t => {
        const def = getCardDef(t.defId) as MinionCardDef | undefined;
        const name = def?.name ?? t.defId;
        const power = getMinionPower(ctx.state, t, ctx.baseIndex);
        return { uid: t.uid, defId: t.defId, baseIndex: ctx.baseIndex, label: `${name} (力量 ${power})` };
    });
    const interaction = createSimpleChoice(
        `ninja_tiger_assassin_${ctx.now}`, ctx.playerId,
        '选择要消灭的力量≤3的随从', buildMinionTargetOptions(options), 'ninja_tiger_assassin',
    );
    return { events: [], matchState: queueInteraction(ctx.matchState, interaction) };
}

/** 手里�?onPlay：消灭一个力量≤3的随从（任意基地�?*/
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
    const options = targets.map(t => ({ uid: t.uid, defId: t.defId, baseIndex: t.baseIndex, label: t.label }));
    const interaction = createSimpleChoice(
        `ninja_seeing_stars_${ctx.now}`, ctx.playerId,
        '选择要消灭的力量≤2的随从', buildMinionTargetOptions(options), 'ninja_seeing_stars',
    );
    return { events: [], matchState: queueInteraction(ctx.matchState, interaction) };
}

// ninja_poison (ongoing) - 已通过 ongoingModifiers 系统实现力量修正�?4力量�?

/** 欺骗之道 onPlay：选择己方一个随从移动到另一个基�?*/
function ninjaWayOfDeception(ctx: AbilityContext): AbilityResult {
    const myMinions: { uid: string; defId: string; baseIndex: number; label: string }[] = [];
    for (let i = 0; i < ctx.state.bases.length; i++) {
        for (const m of ctx.state.bases[i].minions) {
            if (m.controller !== ctx.playerId) continue;
            const power = getMinionPower(ctx.state, m, i);
            const def = getCardDef(m.defId) as MinionCardDef | undefined;
            const name = def?.name ?? m.defId;
            const baseDef = getBaseDef(ctx.state.bases[i].defId);
            const baseName = baseDef?.name ?? `基地 ${i + 1}`;
            myMinions.push({ uid: m.uid, defId: m.defId, baseIndex: i, label: `${name} (力量 ${power}) @ ${baseName}` });
        }
    }
    if (myMinions.length === 0) return { events: [] };
    const options = myMinions.map(m => ({ uid: m.uid, defId: m.defId, baseIndex: m.baseIndex, label: m.label }));
    const interaction = createSimpleChoice(
        `ninja_way_of_deception_${ctx.now}`, ctx.playerId,
        '选择要移动的己方随从', buildMinionTargetOptions(options), 'ninja_way_of_deception_choose_minion',
    );
    return { events: [], matchState: queueInteraction(ctx.matchState, interaction) };
}

/** 伪装 onPlay：选择己方一个随从返回手牌，然后选择手牌中一个随从打出到该基�?*/
function ninjaDisguise(ctx: AbilityContext): AbilityResult {
    // 收集己方所有随�?
    const myMinions: { uid: string; defId: string; baseIndex: number; owner: string; label: string }[] = [];
    for (let i = 0; i < ctx.state.bases.length; i++) {
        for (const m of ctx.state.bases[i].minions) {
            if (m.controller !== ctx.playerId) continue;
            const power = getMinionPower(ctx.state, m, i);
            const def = getCardDef(m.defId) as MinionCardDef | undefined;
            const name = def?.name ?? m.defId;
            const baseDef = getBaseDef(ctx.state.bases[i].defId);
            const baseName = baseDef?.name ?? `基地 ${i + 1}`;
            myMinions.push({ uid: m.uid, defId: m.defId, baseIndex: i, owner: m.owner, label: `${name} (力量 ${power}) @ ${baseName}` });
        }
    }
    if (myMinions.length === 0) return { events: [] };
    const options = myMinions.map(m => ({ uid: m.uid, defId: m.defId, baseIndex: m.baseIndex, label: m.label }));
    const interaction = createSimpleChoice(
        `ninja_disguise_return_${ctx.now}`, ctx.playerId,
        '选择要返回手牌的己方随从', buildMinionTargetOptions(options), 'ninja_disguise_choose_return',
    );
    return { events: [], matchState: queueInteraction(ctx.matchState, { ...interaction, data: { ...interaction.data, continuationContext: { cardUid: ctx.cardUid } } }) };
}

// ============================================================================
// Special 时机能力
// ============================================================================

/**
 * �?special：基地计分前，可以从手牌打出到该基地
 * MVP：自动打出（如果在手牌中�?
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
 * 侍僧 special：将此随从从基地返回手牌，然后额外打出一个随�?
 * MVP：自动执�?
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

    // 额外打出一个随�?
    events.push(grantExtraMinion(ctx.playerId, 'ninja_acolyte', ctx.now));

    return { events };
}

/** 隐忍 special action：基地计分前，选择手牌中一个随从打出到该基�?*/
function ninjaHiddenNinja(ctx: AbilityContext): AbilityResult {
    const player = ctx.state.players[ctx.playerId];
    const minionCards = player.hand.filter(c => c.type === 'minion');
    if (minionCards.length === 0) return { events: [] };
    const options = minionCards.map((c, i) => {
        const def = getCardDef(c.defId) as MinionCardDef | undefined;
        const name = def?.name ?? c.defId;
        const power = def?.power ?? 0;
        return { id: `hand-${i}`, label: `${name} (力量 ${power})`, value: { cardUid: c.uid, defId: c.defId, power } };
    });
    const interaction = createSimpleChoice(
        `ninja_hidden_ninja_${ctx.now}`, ctx.playerId,
        '选择要打出到该基地的随从', options as any[], 'ninja_hidden_ninja',
    );
    return { events: [], matchState: queueInteraction(ctx.matchState, { ...interaction, data: { ...interaction.data, continuationContext: { baseIndex: ctx.baseIndex } } }) };
}

// ============================================================================
// Ongoing 拦截器注�?
// ============================================================================

/** 注册忍者派系的 ongoing 拦截�?*/
function registerNinjaOngoingEffects(): void {
    // 烟雾弹：保护同基地己方随从不受对手行动卡影响
    registerProtection('ninja_smoke_bomb', 'action', (ctx) => {
        // 只保护烟雾弹所在基地的、烟雾弹拥有者的随从
        for (const base of ctx.state.bases) {
            const bomb = base.ongoingActions.find(o => o.defId === 'ninja_smoke_bomb');
            if (!bomb) continue;
            const baseIdx = ctx.state.bases.indexOf(base);
            if (baseIdx !== ctx.targetBaseIndex) continue;
            // 只保护烟雾弹拥有者的随从，且来源是对�?
            return ctx.targetMinion.controller === bomb.ownerId && ctx.sourcePlayerId !== bomb.ownerId;
        }
        return false;
    });

    // 烟雾弹：拥有者回合开始时自毁
    registerTrigger('ninja_smoke_bomb', 'onTurnStart', (trigCtx) => {
        const events: SmashUpEvent[] = [];
        for (const base of trigCtx.state.bases) {
            for (const ongoing of base.ongoingActions) {
                if (ongoing.defId !== 'ninja_smoke_bomb') continue;
                if (ongoing.ownerId !== trigCtx.playerId) continue;
                events.push({
                    type: SU_EVENTS.ONGOING_DETACHED,
                    payload: {
                        cardUid: ongoing.uid,
                        defId: ongoing.defId,
                        ownerId: ongoing.ownerId,
                        reason: 'ninja_smoke_bomb_self_destruct',
                    },
                    timestamp: trigCtx.now,
                });
            }
        }
        return events;
    });

    // 暗杀：回合结束时消灭目标随从（附着在随从上�?ongoing�?
    registerTrigger('ninja_assassination', 'onTurnEnd', (trigCtx) => {
        const events: SmashUpEvent[] = [];
        // 查找所有附着�?assassination 的随�?
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

    // 渗透：附着此卡的随从不受基地能力影响（广义保护�?
    registerProtection('ninja_infiltrate', 'affect', (ctx) => {
        // 检查目标随从是否附着�?infiltrate
        return ctx.targetMinion.attachedActions.some(a => a.defId === 'ninja_infiltrate');
    });
}

// ============================================================================
// 交互解决处理函数（InteractionHandler）
// ============================================================================

/** 注册忍者派系的交互解决处理函数 */
export function registerNinjaInteractionHandlers(): void {
    // 忍者大师：选择目标后消灭
    registerInteractionHandler('ninja_master', (state, _playerId, value, _iData, _random, timestamp) => {
        const { minionUid, baseIndex } = value as { minionUid: string; baseIndex: number };
        const base = state.core.bases[baseIndex];
        if (!base) return undefined;
        const target = base.minions.find(m => m.uid === minionUid);
        if (!target) return undefined;
        return { state, events: [destroyMinion(target.uid, target.defId, baseIndex, target.owner, 'ninja_master', timestamp)] };
    });

    // 猛虎刺客：选择目标后消灭
    registerInteractionHandler('ninja_tiger_assassin', (state, _playerId, value, _iData, _random, timestamp) => {
        const { minionUid, baseIndex } = value as { minionUid: string; baseIndex: number };
        const base = state.core.bases[baseIndex];
        if (!base) return undefined;
        const target = base.minions.find(m => m.uid === minionUid);
        if (!target) return undefined;
        return { state, events: [destroyMinion(target.uid, target.defId, baseIndex, target.owner, 'ninja_tiger_assassin', timestamp)] };
    });

    // 手里剑：选择目标后消灭
    registerInteractionHandler('ninja_seeing_stars', (state, _playerId, value, _iData, _random, timestamp) => {
        const { minionUid, baseIndex } = value as { minionUid: string; baseIndex: number };
        const base = state.core.bases[baseIndex];
        if (!base) return undefined;
        const target = base.minions.find(m => m.uid === minionUid);
        if (!target) return undefined;
        return { state, events: [destroyMinion(target.uid, target.defId, baseIndex, target.owner, 'ninja_seeing_stars', timestamp)] };
    });

    // 欺骗之道：选择随从后，链式选择目标基地
    registerInteractionHandler('ninja_way_of_deception_choose_minion', (state, playerId, value, _iData, _random, timestamp) => {
        const { minionUid, baseIndex } = value as { minionUid: string; baseIndex: number };
        const base = state.core.bases[baseIndex];
        if (!base) return undefined;
        const minion = base.minions.find(m => m.uid === minionUid);
        if (!minion) return undefined;
        const candidates: { baseIndex: number; label: string }[] = [];
        for (let i = 0; i < state.core.bases.length; i++) {
            if (i === baseIndex) continue;
            const baseDef = getBaseDef(state.core.bases[i].defId);
            candidates.push({ baseIndex: i, label: baseDef?.name ?? `基地 ${i + 1}` });
        }
        if (candidates.length === 0) return undefined;
        const next = createSimpleChoice(
            `ninja_way_of_deception_base_${timestamp}`, playerId,
            '选择目标基地', buildBaseTargetOptions(candidates), 'ninja_way_of_deception_choose_base',
        );
        return { state: queueInteraction(state, { ...next, data: { ...next.data, continuationContext: { minionUid, minionDefId: minion.defId, fromBaseIndex: baseIndex } } }), events: [] };
    });

    // 欺骗之道：选择基地后移动
    registerInteractionHandler('ninja_way_of_deception_choose_base', (state, _playerId, value, iData, _random, timestamp) => {
        const { baseIndex: destBase } = value as { baseIndex: number };
        const ctx = (iData as any)?.continuationContext as { minionUid: string; minionDefId: string; fromBaseIndex: number };
        if (!ctx) return undefined;
        return { state, events: [moveMinion(ctx.minionUid, ctx.minionDefId, ctx.fromBaseIndex, destBase, 'ninja_way_of_deception', timestamp)] };
    });

    // 伪装：选择随从返回手牌后，链式选择手牌随从打出
    registerInteractionHandler('ninja_disguise_choose_return', (state, playerId, value, iData, _random, timestamp) => {
        const { minionUid, baseIndex } = value as { minionUid: string; baseIndex: number };
        const base = state.core.bases[baseIndex];
        if (!base) return undefined;
        const minion = base.minions.find(m => m.uid === minionUid);
        if (!minion) return undefined;
        const events: SmashUpEvent[] = [{
            type: SU_EVENTS.MINION_RETURNED,
            payload: { minionUid, minionDefId: minion.defId, fromBaseIndex: baseIndex, toPlayerId: minion.owner, reason: 'ninja_disguise' },
            timestamp,
        } as MinionReturnedEvent];
        const cardUid = ((iData as any)?.continuationContext as { cardUid?: string })?.cardUid;
        const player = state.core.players[playerId];
        const minionCards = player.hand.filter(c => c.type === 'minion' && c.uid !== cardUid && c.uid !== minionUid);
        if (minionCards.length === 0) return { state, events };
        const handOptions = minionCards.map((c, i) => {
            const def = getCardDef(c.defId) as MinionCardDef | undefined;
            const name = def?.name ?? c.defId;
            const power = def?.power ?? 0;
            return { id: `hand-${i}`, label: `${name} (力量 ${power})`, value: { cardUid: c.uid, defId: c.defId, power, baseIndex } };
        });
        const next = createSimpleChoice(
            `ninja_disguise_play_${timestamp}`, playerId,
            '选择要打出的手牌随从', handOptions as any[], 'ninja_disguise_choose_play',
        );
        return { state: queueInteraction(state, { ...next, data: { ...next.data, continuationContext: { baseIndex } } }), events };
    });

    // 伪装：选择打出的随从
    registerInteractionHandler('ninja_disguise_choose_play', (state, playerId, value, _iData, _random, timestamp) => {
        const { cardUid, defId, power, baseIndex } = value as { cardUid: string; defId: string; power: number; baseIndex: number };
        return { state, events: [{ type: SU_EVENTS.MINION_PLAYED, payload: { playerId, cardUid, defId, baseIndex, power }, timestamp } as MinionPlayedEvent] };
    });

    // 隐忍：选择手牌随从打出到基地
    registerInteractionHandler('ninja_hidden_ninja', (state, playerId, value, iData, _random, timestamp) => {
        const { cardUid, defId, power } = value as { cardUid: string; defId: string; power: number };
        const baseIndex = ((iData as any)?.continuationContext as { baseIndex: number })?.baseIndex;
        if (baseIndex === undefined) return undefined;
        return { state, events: [{ type: SU_EVENTS.MINION_PLAYED, payload: { playerId, cardUid, defId, baseIndex, power }, timestamp } as MinionPlayedEvent] };
    });
}
