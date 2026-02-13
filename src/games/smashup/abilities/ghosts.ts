/**
 * 大杀四方 - 幽灵派系能力
 *
 * 主题：手牌少时获得增益、弃牌操�?
 */

import { registerAbility } from '../domain/abilityRegistry';
import type { AbilityContext, AbilityResult } from '../domain/abilityRegistry';
import { grantExtraMinion, grantExtraAction, destroyMinion, getMinionPower, buildMinionTargetOptions, recoverCardsFromDiscard } from '../domain/abilityHelpers';
import { SU_EVENTS } from '../domain/types';
import type { CardsDrawnEvent, VpAwardedEvent, SmashUpEvent } from '../domain/types';
import type { MinionCardDef } from '../domain/types';
import { drawCards } from '../domain/utils';
import { registerProtection, registerTrigger } from '../domain/ongoingEffects';
import type { ProtectionCheckContext, TriggerContext } from '../domain/ongoingEffects';
import { getCardDef, getBaseDef } from '../data/cards';
import { createSimpleChoice, queueInteraction } from '../../../engine/systems/InteractionSystem';
import { registerInteractionHandler } from '../domain/abilityInteractionHandlers';
import type { MatchState } from '../../../engine/types';

/** 注册幽灵派系所有能�?*/
export function registerGhostAbilities(): void {
    // 幽灵 onPlay：弃一张手�?
    registerAbility('ghost_ghost', 'onPlay', ghostGhost);
    // 招魂（行动卡）：手牌�?时抽�?�?
    registerAbility('ghost_seance', 'onPlay', ghostSeance);
    // 阴暗交易（行动卡）：手牌�?时获�?VP
    registerAbility('ghost_shady_deal', 'onPlay', ghostShadyDeal);
    // 悄然而至（行动卡）：额外打出一个随从和一个行�?
    registerAbility('ghost_ghostly_arrival', 'onPlay', ghostGhostlyArrival);
    // 灵魂（随�?onPlay）：弃等量力量的牌消灭一个随�?
    registerAbility('ghost_spirit', 'onPlay', ghostSpirit);

    // === ongoing 效果注册 ===
    // ghost_incorporeal: 打出到随从上，持续：该随从不受其他玩家卡牌影�?
    registerProtection('ghost_incorporeal', 'affect', ghostIncorporealChecker);
    // ghost_haunting: 持续：手牌≤2时，本随从不受其他玩家卡牌影�?
    registerProtection('ghost_haunting', 'affect', ghostHauntingChecker);

    // ghost_make_contact: 控制对手随从（special 能力�?
    registerAbility('ghost_make_contact', 'onPlay', ghostMakeContact);
    // 亡者崛起：弃牌→从弃牌堆打出力�?弃牌数的额外随从
    registerAbility('ghost_the_dead_rise', 'onPlay', ghostTheDeadRise);
    // 越过边界：选一个卡名，取回弃牌堆中所有同名随�?
    registerAbility('ghost_across_the_divide', 'onPlay', ghostAcrossTheDivide);

    // === ongoing 效果注册 ===
    // 幽灵之主：手牌≤2时可从弃牌堆打出
    registerTrigger('ghost_spectre', 'onTurnStart', ghostSpectreTrigger);
}

/** 幽灵 onPlay：弃一张手�?*/
function ghostGhost(ctx: AbilityContext): AbilityResult {
    const player = ctx.state.players[ctx.playerId];
    const discardable = player.hand.filter(c => c.uid !== ctx.cardUid);
    if (discardable.length === 0) return { events: [] };
    // Prompt 选择弃哪�?
    const options = discardable.map((c, i) => {
        const def = getCardDef(c.defId);
        const name = def?.name ?? c.defId;
        return { id: `card-${i}`, label: name, value: { cardUid: c.uid, defId: c.defId } };
    });
    const interaction = createSimpleChoice(
        `ghost_ghost_${ctx.now}`, ctx.playerId,
        '选择要弃掉的手牌', options as any[], 'ghost_ghost',
    );
    return { events: [], matchState: queueInteraction(ctx.matchState, interaction) };
}

/** 招魂 onPlay：手牌≤2时抽�?�?*/
function ghostSeance(ctx: AbilityContext): AbilityResult {
    const player = ctx.state.players[ctx.playerId];
    // 打出行动卡后手牌会减1，所以用当前手牌�?1判断
    const handAfterPlay = player.hand.length - 1;
    if (handAfterPlay > 2) return { events: [] };
    const drawCount = Math.max(0, 5 - handAfterPlay);
    if (drawCount === 0) return { events: [] };
    const { drawnUids } = drawCards(player, drawCount, ctx.random);
    if (drawnUids.length === 0) return { events: [] };
    const evt: CardsDrawnEvent = {
        type: SU_EVENTS.CARDS_DRAWN,
        payload: { playerId: ctx.playerId, count: drawnUids.length, cardUids: drawnUids },
        timestamp: ctx.now,
    };
    return { events: [evt] };
}

/** 阴暗交易 onPlay：手牌≤2时获�?VP */
function ghostShadyDeal(ctx: AbilityContext): AbilityResult {
    const player = ctx.state.players[ctx.playerId];
    const handAfterPlay = player.hand.length - 1;
    if (handAfterPlay > 2) return { events: [] };
    const evt: VpAwardedEvent = {
        type: SU_EVENTS.VP_AWARDED,
        payload: { playerId: ctx.playerId, amount: 1, reason: 'ghost_shady_deal' },
        timestamp: ctx.now,
    };
    return { events: [evt] };
}

/** 悄然而至 onPlay：额外打出一个随从和一个行�?*/
function ghostGhostlyArrival(ctx: AbilityContext): AbilityResult {
    return {
        events: [
            grantExtraMinion(ctx.playerId, 'ghost_ghostly_arrival', ctx.now),
            grantExtraAction(ctx.playerId, 'ghost_ghostly_arrival', ctx.now),
        ],
    };
}

// ghost_haunting (ongoing) - 已通过 ongoingModifiers 系统实现力量修正�?3 力量部分�?
//   不受影响部分通过 ghost_incorporeal protection 实现（注册在 registerGhostAbilities 中）
// ghost_door_to_the_beyond (ongoing) - 已通过 ongoingModifiers 系统实现力量修正（手牌≤2时同基地己方随从+2�?

/**
 * ghost_incorporeal 保护检查：ghost_haunting 附着的随从不受其他玩家卡牌影�?
 * 
 * 规则：附着�?ghost_haunting 的随从不受其他玩家卡牌影响�?
 * 实现：检查目标随从是否附着�?ghost_haunting，且攻击者不是随从控制者�?
 */
function ghostIncorporealChecker(ctx: ProtectionCheckContext): boolean {
    // 检查目标随从是否附着�?ghost_incorporeal
    const hasIncorporeal = ctx.targetMinion.attachedActions.some(a => a.defId === 'ghost_incorporeal');
    if (!hasIncorporeal) return false;
    // 只保护不受其他玩家影�?
    return ctx.sourcePlayerId !== ctx.targetMinion.controller;
}

/**
 * ghost_haunting 保护检查：手牌�?时，不散阴魂本随从不受其他玩家卡牌影�?
 */
function ghostHauntingChecker(ctx: ProtectionCheckContext): boolean {
    if (ctx.targetMinion.defId !== 'ghost_haunting') return false;
    if (ctx.sourcePlayerId === ctx.targetMinion.controller) return false;
    const player = ctx.state.players[ctx.targetMinion.controller];
    if (!player) return false;
    return player.hand.length <= 2;
}

/**
 * ghost_make_contact onPlay：控制对手一个随从（将其返回手牌�?
 */
function ghostMakeContact(ctx: AbilityContext): AbilityResult {
    const targets: { uid: string; defId: string; baseIndex: number; owner: string; power: number; label: string }[] = [];
    for (let i = 0; i < ctx.state.bases.length; i++) {
        for (const m of ctx.state.bases[i].minions) {
            if (m.controller === ctx.playerId) continue;
            const power = getMinionPower(ctx.state, m, i);
            const def = getCardDef(m.defId) as MinionCardDef | undefined;
            const name = def?.name ?? m.defId;
            const baseDef = getBaseDef(ctx.state.bases[i].defId);
            const baseName = baseDef?.name ?? `基地 ${i + 1}`;
            targets.push({ uid: m.uid, defId: m.defId, baseIndex: i, owner: m.owner, power, label: `${name} (力量 ${power}) @ ${baseName}` });
        }
    }
    if (targets.length === 0) return { events: [] };
    // Prompt 选择
    const options = targets.map(t => ({ uid: t.uid, defId: t.defId, baseIndex: t.baseIndex, label: t.label }));
    const interaction = createSimpleChoice(
        `ghost_make_contact_${ctx.now}`, ctx.playerId,
        '选择要控制的对手随从', buildMinionTargetOptions(options), 'ghost_make_contact',
    );
    return { events: [], matchState: queueInteraction(ctx.matchState, interaction) };
}

/**
 * 灵魂 onPlay：选择一个随从，弃等量力量的手牌来消灭它
 */
function ghostSpirit(ctx: AbilityContext): AbilityResult {
    const player = ctx.state.players[ctx.playerId];
    const discardable = player.hand.filter(c => c.uid !== ctx.cardUid);
    if (discardable.length === 0) return { events: [] };

    // 找所有可消灭的对手随从（力量 �?可弃手牌数）
    const targets: { uid: string; defId: string; baseIndex: number; owner: string; power: number; label: string }[] = [];
    for (let i = 0; i < ctx.state.bases.length; i++) {
        for (const m of ctx.state.bases[i].minions) {
            if (m.controller === ctx.playerId) continue;
            const power = getMinionPower(ctx.state, m, i);
            if (power <= discardable.length) {
                const def = getCardDef(m.defId) as MinionCardDef | undefined;
                const name = def?.name ?? m.defId;
                const baseDef = getBaseDef(ctx.state.bases[i].defId);
                const baseName = baseDef?.name ?? `基地 ${i + 1}`;
                targets.push({ uid: m.uid, defId: m.defId, baseIndex: i, owner: m.owner, power, label: `${name} (力量 ${power}, 需�?${power} 张牌) @ ${baseName}` });
            }
        }
    }
    if (targets.length === 0) return { events: [] };
    // Prompt 选择
    const options = targets.map(t => ({ uid: t.uid, defId: t.defId, baseIndex: t.baseIndex, label: t.label }));
    const interaction = createSimpleChoice(
        `ghost_spirit_${ctx.now}`, ctx.playerId,
        '选择要消灭的随从（需弃等量力量的手牌）', buildMinionTargetOptions(options), 'ghost_spirit',
    );
    return { events: [], matchState: queueInteraction(ctx.matchState, interaction) };
}

// ============================================================================
// 亡者崛起：弃任意数量牌→从弃牌堆打出力�?弃牌数的额外随从
// ============================================================================

/** 亡者崛�?onPlay：Prompt 选择弃牌数量 */
function ghostTheDeadRise(ctx: AbilityContext): AbilityResult {
    const player = ctx.state.players[ctx.playerId];
    const discardable = player.hand.filter(c => c.uid !== ctx.cardUid);
    if (discardable.length === 0) return { events: [] };
    // 检查弃牌堆中有没有随从可打出（至少力量<1，即力量0的也不行，需力量<弃牌数）
    // 先让玩家选弃几张�?
    const options = discardable.map((c, i) => {
        const def = getCardDef(c.defId);
        const name = def?.name ?? c.defId;
        return { id: `card-${i}`, label: name, value: { cardUid: c.uid, defId: c.defId } };
    });
    const interaction = createSimpleChoice(
        `ghost_the_dead_rise_discard_${ctx.now}`, ctx.playerId,
        '亡者崛起：选择要弃掉的手牌（弃牌越多可打出力量越高的随从）', options as any[], 'ghost_the_dead_rise_discard',
    );
    return { events: [], matchState: queueInteraction(ctx.matchState, interaction) };
}

// ============================================================================
// 越过边界：选一个卡名，取回弃牌堆中所有同名随�?
// ============================================================================

/** 越过边界 onPlay：按 defId 分组弃牌堆随从，选一组取�?*/
function ghostAcrossTheDivide(ctx: AbilityContext): AbilityResult {
    const player = ctx.state.players[ctx.playerId];
    const minionsInDiscard = player.discard.filter(c => c.type === 'minion');
    if (minionsInDiscard.length === 0) return { events: [] };
    // �?defId 分组
    const groups = new Map<string, { defId: string; uids: string[]; name: string }>();
    for (const c of minionsInDiscard) {
        if (!groups.has(c.defId)) {
            const def = getCardDef(c.defId);
            groups.set(c.defId, { defId: c.defId, uids: [], name: def?.name ?? c.defId });
        }
        groups.get(c.defId)!.uids.push(c.uid);
    }
    const groupList = Array.from(groups.values());
    const options = groupList.map((g, i) => ({
        id: `group-${i}`, label: `${g.name} (×${g.uids.length})`, value: { defId: g.defId },
    }));
    const interaction = createSimpleChoice(
        `ghost_across_the_divide_${ctx.now}`, ctx.playerId,
        '越过边界：选择一个卡名（取回所有同名随从）', options as any[], 'ghost_across_the_divide',
    );
    return { events: [], matchState: queueInteraction(ctx.matchState, interaction) };
}

// ============================================================================
// 幽灵之主：手牌≤2时可从弃牌堆打出
// ============================================================================

/** 幽灵之主触发：回合开始时检查弃牌堆 + 手牌条件 */
function ghostSpectreTrigger(ctx: TriggerContext): SmashUpEvent[] {
    const player = ctx.state.players[ctx.playerId];
    if (!player) return [];
    if (player.hand.length > 2) return [];
    const spectreInDiscard = player.discard.filter(c => c.defId === 'ghost_spectre');
    if (spectreInDiscard.length === 0) return [];
    const card = spectreInDiscard[0];
    const def = getCardDef(card.defId) as MinionCardDef | undefined;
    const name = def?.name ?? card.defId;
    const power = def?.power ?? 0;
    // TODO: ghostSpectreTrigger 返回事件数组，无法直接返回 matchState，继续使用旧系统
    return [];
}

// ============================================================================
// Prompt 继续函数
// ============================================================================

/** 注册幽灵派系的交互解决处理函数 */
export function registerGhostInteractionHandlers(): void {
    // 幽灵：选择弃哪张手牌
    registerInteractionHandler('ghost_ghost', (state, playerId, value, _iData, _random, timestamp) => {
        const { cardUid } = value as { cardUid: string };
        return { state, events: [{
            type: SU_EVENTS.CARDS_DISCARDED,
            payload: { playerId, cardUids: [cardUid] },
            timestamp,
        }] };
    });

    // 灵魂：选择目标后弃牌并消灭
    registerInteractionHandler('ghost_spirit', (state, playerId, value, _iData, _random, timestamp) => {
        const { minionUid, baseIndex } = value as { minionUid: string; baseIndex: number };
        const base = state.core.bases[baseIndex];
        if (!base) return undefined;
        const target = base.minions.find(m => m.uid === minionUid);
        if (!target) return undefined;
        const power = getMinionPower(state.core, target, baseIndex);
        const player = state.core.players[playerId];
        const discardable = player.hand.filter(c => c.uid !== minionUid);
        const toDiscard = discardable.slice(0, power);
        const events: SmashUpEvent[] = [];
        if (toDiscard.length > 0) {
            events.push({
                type: SU_EVENTS.CARDS_DISCARDED,
                payload: { playerId, cardUids: toDiscard.map(c => c.uid) },
                timestamp,
            });
        }
        events.push(destroyMinion(target.uid, target.defId, baseIndex, target.owner, 'ghost_spirit', timestamp));
        return { state, events };
    });

    // 心灵接触：选择目标后返回手牌
    registerInteractionHandler('ghost_make_contact', (state, _playerId, value, _iData, _random, timestamp) => {
        const { minionUid, baseIndex } = value as { minionUid: string; baseIndex: number };
        const base = state.core.bases[baseIndex];
        if (!base) return undefined;
        const target = base.minions.find(m => m.uid === minionUid);
        if (!target) return undefined;
        return { state, events: [{
            type: SU_EVENTS.MINION_RETURNED,
            payload: { minionUid: target.uid, minionDefId: target.defId, fromBaseIndex: baseIndex, toPlayerId: target.owner, reason: 'ghost_make_contact' },
            timestamp,
        }] };
    });

    // 亡者崛起：多选弃牌后→链式选择弃牌堆中力量<弃牌数的随从
    registerInteractionHandler('ghost_the_dead_rise_discard', (state, playerId, value, _iData, _random, timestamp) => {
        const selectedCards = value as Array<{ cardUid: string }>;
        if (!Array.isArray(selectedCards) || selectedCards.length === 0) return undefined;
        const discardUids = selectedCards.map(v => v.cardUid);
        const discardCount = discardUids.length;
        const events: SmashUpEvent[] = [{
            type: SU_EVENTS.CARDS_DISCARDED,
            payload: { playerId, cardUids: discardUids },
            timestamp,
        }];
        const player = state.core.players[playerId];
        const eligible = player.discard.filter(c => {
            if (c.type !== 'minion') return false;
            const def = getCardDef(c.defId) as MinionCardDef | undefined;
            return def !== undefined && def.power < discardCount;
        });
        if (eligible.length === 0) return { state, events };
        const options = eligible.map((c, i) => {
            const def = getCardDef(c.defId) as MinionCardDef | undefined;
            const name = def?.name ?? c.defId;
            const power = def?.power ?? 0;
            return { id: `card-${i}`, label: `${name} (力量 ${power})`, value: { cardUid: c.uid, defId: c.defId, power } };
        });
        const next = createSimpleChoice(
            `ghost_the_dead_rise_play_${timestamp}`, playerId,
            `选择力量<${discardCount}的随从从弃牌堆打出`, options as any[], 'ghost_the_dead_rise_play',
        );
        return { state: queueInteraction(state, next), events };
    });

    // 亡者崛起：选择随从后打出
    registerInteractionHandler('ghost_the_dead_rise_play', (state, playerId, value, _iData, _random, timestamp) => {
        const { cardUid, defId, power } = value as { cardUid: string; defId: string; power: number };
        return { state, events: [
            grantExtraMinion(playerId, 'ghost_the_dead_rise', timestamp),
            { type: SU_EVENTS.MINION_PLAYED, payload: { playerId, cardUid, defId, baseIndex: 0, power, fromDiscard: true }, timestamp } as SmashUpEvent,
        ] };
    });

    // 越过边界：选卡名后取回所有同名随从
    registerInteractionHandler('ghost_across_the_divide', (state, playerId, value, _iData, _random, timestamp) => {
        const { defId } = value as { defId: string };
        const player = state.core.players[playerId];
        const sameNameMinions = player.discard.filter(c => c.type === 'minion' && c.defId === defId);
        if (sameNameMinions.length === 0) return { state, events: [] };
        return { state, events: [recoverCardsFromDiscard(playerId, sameNameMinions.map(c => c.uid), 'ghost_across_the_divide', timestamp)] };
    });

    // 幽灵之主：选择打出或跳过
    registerInteractionHandler('ghost_spectre', (state, playerId, value, _iData, _random, timestamp) => {
        const val = value as { action: string; cardUid?: string; defId?: string; power?: number };
        if (val.action === 'skip') return { state, events: [] };
        return { state, events: [
            grantExtraMinion(playerId, 'ghost_spectre', timestamp),
            { type: SU_EVENTS.MINION_PLAYED, payload: { playerId, cardUid: val.cardUid!, defId: val.defId!, baseIndex: 0, power: val.power!, fromDiscard: true }, timestamp } as SmashUpEvent,
        ] };
    });
}
