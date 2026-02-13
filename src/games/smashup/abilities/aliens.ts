/**
 * 大杀四方 - 外星人派系能�?
 *
 * 主题：干扰对手，将随从送回手牌，额外出�?
 */

import { registerAbility } from '../domain/abilityRegistry';
import type { AbilityContext, AbilityResult } from '../domain/abilityRegistry';
import { SU_EVENTS } from '../domain/types';
import type { MinionReturnedEvent, VpAwardedEvent, SmashUpEvent, SmashUpCore, CardsDrawnEvent, MinionCardDef, OngoingDetachedEvent, BaseReplacedEvent } from '../domain/types';
import { buildBaseTargetOptions, buildMinionTargetOptions, getMinionPower } from '../domain/abilityHelpers';
import { getBaseDef, getCardDef } from '../data/cards';
import { createSimpleChoice, queueInteraction } from '../../../engine/systems/InteractionSystem';
import { registerInteractionHandler } from '../domain/abilityInteractionHandlers';
import type { MatchState } from '../../../engine/types';
import { registerRestriction, registerTrigger } from '../domain/ongoingEffects';
import type { RestrictionCheckContext, TriggerContext } from '../domain/ongoingEffects';

/** 注册外星人派系所有能�?*/
export function registerAlienAbilities(): void {
    // 外星霸主：将一个随从返回拥有者手�?
    registerAbility('alien_supreme_overlord', 'onPlay', alienSupremeOverlord);
    // 采集者：收回本基地一个力量≤3的对手随�?
    registerAbility('alien_collector', 'onPlay', alienCollector);
    // 侵略者：获得1VP
    registerAbility('alien_invader', 'onPlay', alienInvader);
    // 解体（行动卡）：将一个力量≤3的随从放入拥有者手�?
    registerAbility('alien_disintegrate', 'onPlay', alienDisintegrate);
    // 麦田怪圈（行动卡）：将一个基地的所有随从返回手�?
    registerAbility('alien_crop_circles', 'onPlay', alienCropCircles);
    // 射线传递（行动卡）：展示对手随机手牌，可返回牌库顶
    registerAbility('alien_beaming_down', 'onPlay', alienBeamingDown);
    // 侦察兵（随从 onPlay）：搜索牌库找一个随从放入手�?
    registerAbility('alien_scout', 'onPlay', alienScout);
    // 地球化（行动卡）：替换一个基地，所有卡片保�?
    registerAbility('alien_terraform', 'onPlay', alienTerraform);

    // 射线探测（行动卡）：查看对手手牌 + 牌库�?
    registerAbility('alien_probe', 'onPlay', alienProbe);
    // 侦察船一（行动卡）：展示一个玩家牌库顶的一张牌
    registerAbility('alien_scout_ship_1', 'onPlay', alienScoutShip);
    // 侦察船二（行动卡）：展示一个玩家的手牌
    registerAbility('alien_scout_ship_2', 'onPlay', alienScoutShipHand);

    // === ongoing 效果注册 ===
    // 信号干扰：禁止在此基地打出任何卡�?
    registerRestriction('alien_jammed_signals', 'play_minion', alienJammedSignalsRestriction);
    registerRestriction('alien_jammed_signals', 'play_action', alienJammedSignalsRestriction);
    // 信号干扰：拥有者下回合开始时自毁
    registerTrigger('alien_jammed_signals', 'onTurnStart', alienJammedSignalsDestroyTrigger);
}

/** 外星霸主 onPlay：将一个随从返回拥有者手�?*/
function alienSupremeOverlord(ctx: AbilityContext): AbilityResult {
    const base = ctx.state.bases[ctx.baseIndex];
    if (!base) return { events: [] };
    const targets = base.minions.filter(m => m.controller !== ctx.playerId && m.uid !== ctx.cardUid);
    if (targets.length === 0) return { events: [] };
    // Prompt 选择
    const options = targets.map(t => {
        const def = getCardDef(t.defId) as MinionCardDef | undefined;
        const name = def?.name ?? t.defId;
        const power = getMinionPower(ctx.state, t, ctx.baseIndex);
        return { uid: t.uid, defId: t.defId, baseIndex: ctx.baseIndex, label: `${name} (力量 ${power})` };
    });
    const interaction = createSimpleChoice(
        `alien_supreme_overlord_${ctx.now}`, ctx.playerId,
        '选择要返回手牌的随从', buildMinionTargetOptions(options), 'alien_supreme_overlord',
    );
    return { events: [], matchState: queueInteraction(ctx.matchState, interaction) };
}

/** 采集�?onPlay：收回本基地一个力量≤3的对手随�?*/
function alienCollector(ctx: AbilityContext): AbilityResult {
    const base = ctx.state.bases[ctx.baseIndex];
    if (!base) return { events: [] };
    const targets = base.minions.filter(
        m => m.controller !== ctx.playerId && getMinionPower(ctx.state, m, ctx.baseIndex) <= 3
    );
    if (targets.length === 0) return { events: [] };
    const options = targets.map(t => {
        const def = getCardDef(t.defId) as MinionCardDef | undefined;
        const name = def?.name ?? t.defId;
        const power = getMinionPower(ctx.state, t, ctx.baseIndex);
        return { uid: t.uid, defId: t.defId, baseIndex: ctx.baseIndex, label: `${name} (力量 ${power})` };
    });
    const interaction = createSimpleChoice(
        `alien_collector_${ctx.now}`, ctx.playerId,
        '选择要收回的力量≤3的对手随从', buildMinionTargetOptions(options), 'alien_collector',
    );
    return { events: [], matchState: queueInteraction(ctx.matchState, interaction) };
}

/** 侵略�?onPlay：获�?VP */
function alienInvader(ctx: AbilityContext): AbilityResult {
    const evt: VpAwardedEvent = {
        type: SU_EVENTS.VP_AWARDED,
        payload: { playerId: ctx.playerId, amount: 1, reason: 'alien_invader' },
        timestamp: ctx.now,
    };
    return { events: [evt] };
}

/** 解体 onPlay：将一个力量≤3的随从放入拥有者手�?*/
function alienDisintegrate(ctx: AbilityContext): AbilityResult {
    // 收集所有基地上力量�?的对手随�?
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
        `alien_disintegrate_${ctx.now}`, ctx.playerId,
        '选择要返回手牌的力量≤3的随从', buildMinionTargetOptions(options), 'alien_disintegrate',
    );
    return { events: [], matchState: queueInteraction(ctx.matchState, interaction) };
}

/** 麦田怪圈 onPlay：将一个基地的所有随从返回手牌（通过 Prompt 选择基地�?*/
function alienCropCircles(ctx: AbilityContext): AbilityResult {
    // 找到有随从的基地
    const candidates: { baseIndex: number; label: string }[] = [];
    for (let i = 0; i < ctx.state.bases.length; i++) {
        const base = ctx.state.bases[i];
        if (base.minions.length === 0) continue;
        const baseDef = getBaseDef(base.defId);
        candidates.push({
            baseIndex: i,
            label: baseDef?.name ?? `基地 ${i + 1}`,
        });
    }

    if (candidates.length === 0) return { events: [] };

    // Prompt 让玩家选择
    const interaction = createSimpleChoice(
        `alien_crop_circles_${ctx.now}`, ctx.playerId,
        '选择一个效果基地，将其所有随从返回手牌', buildBaseTargetOptions(candidates), 'alien_crop_circles',
    );
    return { events: [], matchState: queueInteraction(ctx.matchState, interaction) };
}


/** 射线探测（Probe）：选择一个效果对手，展示其手�?*/
function alienProbe(ctx: AbilityContext): AbilityResult {
    // 收集有手牌的对手
    const opponents: { pid: string; label: string }[] = [];
    for (const pid of ctx.state.turnOrder) {
        if (pid === ctx.playerId) continue;
        const opponent = ctx.state.players[pid];
        if (opponent.hand.length === 0) continue;
        opponents.push({ pid, label: `对手 ${pid}�?{opponent.hand.length}张手牌）` });
    }
    if (opponents.length === 0) return { events: [] };
    // 只有一个对手时直接展示
    if (opponents.length === 1) {
        return buildProbeRevealEvents(ctx, opponents[0].pid);
    }
    const options = opponents.map((o, i) => ({ id: `opp-${i}`, label: o.label, value: { pid: o.pid } }));
    const interaction = createSimpleChoice(
        `alien_probe_${ctx.now}`, ctx.playerId,
        '选择一个效果对手查看其手牌', options as any[], 'alien_probe_choose_opponent',
    );
    return { events: [], matchState: queueInteraction(ctx.matchState, interaction) };
}

/** 构建 Probe 展示手牌事件 */
function buildProbeRevealEvents(ctx: AbilityContext, targetPid: string): AbilityResult {
    const target = ctx.state.players[targetPid];
    const cards = target.hand.map(c => ({ uid: c.uid, defId: c.defId }));
    const revealEvt: SmashUpEvent = {
        type: SU_EVENTS.REVEAL_HAND,
        payload: {
            targetPlayerId: targetPid,
            viewerPlayerId: ctx.playerId,
            cards,
            reason: 'alien_probe',
        },
        timestamp: ctx.now,
    };
    // TODO: Probe 还需要查看牌库顶并选择放回顶部或底部（需要额�?Prompt 流程，待 pendingReveal 确认后触发）
    return { events: [revealEvt] };
}

/** 侦察船一（Scout Ship I）：展示一个玩家牌库顶的一张牌 */
function alienScoutShip(ctx: AbilityContext): AbilityResult {
    // 收集所有玩家（包括自己�?
    const players: { pid: string; label: string }[] = [];
    for (const pid of ctx.state.turnOrder) {
        const player = ctx.state.players[pid];
        if (player.deck.length === 0) continue;
        const isSelf = pid === ctx.playerId;
        players.push({ pid, label: isSelf ? `自己�?{player.deck.length}张牌库）` : `对手 ${pid}�?{player.deck.length}张牌库）` });
    }
    if (players.length === 0) return { events: [] };
    if (players.length === 1) {
        return buildScoutShipDeckTopReveal(ctx, players[0].pid);
    }
    const options = players.map((p, i) => ({ id: `p-${i}`, label: p.label, value: { pid: p.pid } }));
    const interaction = createSimpleChoice(
        `alien_scout_ship_${ctx.now}`, ctx.playerId,
        '选择一个效果玩家展示其牌库顶顶', options as any[], 'alien_scout_ship_choose_player',
    );
    return { events: [], matchState: queueInteraction(ctx.matchState, interaction) };
}

/** 构建侦察船牌库顶展示事件 */
function buildScoutShipDeckTopReveal(ctx: AbilityContext, targetPid: string): AbilityResult {
    const target = ctx.state.players[targetPid];
    const topCard = target.deck[0];
    if (!topCard) return { events: [] };
    const revealEvt: SmashUpEvent = {
        type: SU_EVENTS.REVEAL_DECK_TOP,
        payload: {
            targetPlayerId: targetPid,
            viewerPlayerId: ctx.playerId,
            cards: [{ uid: topCard.uid, defId: topCard.defId }],
            count: 1,
            reason: 'alien_scout_ship',
        },
        timestamp: ctx.now,
    };
    return { events: [revealEvt] };
}

/** 侦察船二（Scout Ship II）：展示一个玩家的手牌 */
function alienScoutShipHand(ctx: AbilityContext): AbilityResult {
    // 收集有手牌的对手（侦察船二展示手牌，通常选对手）
    const players: { pid: string; label: string }[] = [];
    for (const pid of ctx.state.turnOrder) {
        if (pid === ctx.playerId) continue;
        const player = ctx.state.players[pid];
        if (player.hand.length === 0) continue;
        players.push({ pid, label: `对手 ${pid}�?{player.hand.length}张手牌）` });
    }
    if (players.length === 0) return { events: [] };
    if (players.length === 1) {
        return buildScoutShipHandReveal(ctx, players[0].pid);
    }
    const options = players.map((p, i) => ({ id: `p-${i}`, label: p.label, value: { pid: p.pid } }));
    const interaction = createSimpleChoice(
        `alien_scout_ship_hand_${ctx.now}`, ctx.playerId,
        '选择一个效果对手展示其手牌', options as any[], 'alien_scout_ship_hand_choose_opponent',
    );
    return { events: [], matchState: queueInteraction(ctx.matchState, interaction) };
}

/** 构建侦察船手牌展示事�?*/
function buildScoutShipHandReveal(ctx: AbilityContext, targetPid: string): AbilityResult {
    const target = ctx.state.players[targetPid];
    const cards = target.hand.map(c => ({ uid: c.uid, defId: c.defId }));
    const revealEvt: SmashUpEvent = {
        type: SU_EVENTS.REVEAL_HAND,
        payload: {
            targetPlayerId: targetPid,
            viewerPlayerId: ctx.playerId,
            cards,
            reason: 'alien_scout_ship',
        },
        timestamp: ctx.now,
    };
    return { events: [revealEvt] };
}

// ============================================================================
// ongoing 效果触发�?
// ============================================================================

/** 信号干扰 restriction：禁止在有此卡的基地打出任何卡片 */
function alienJammedSignalsRestriction(ctx: RestrictionCheckContext): boolean {
    const base = ctx.state.bases[ctx.baseIndex];
    if (!base) return false;
    return base.ongoingActions.some(o => o.defId === 'alien_jammed_signals');
}

/** 信号干扰 onTurnStart：拥有者回合开始时自毁 */
function alienJammedSignalsDestroyTrigger(ctx: TriggerContext): SmashUpEvent[] {
    const events: SmashUpEvent[] = [];
    for (let i = 0; i < ctx.state.bases.length; i++) {
        const base = ctx.state.bases[i];
        for (const ongoing of base.ongoingActions) {
            if (ongoing.defId !== 'alien_jammed_signals') continue;
            if (ongoing.ownerId !== ctx.playerId) continue;
            events.push({
                type: SU_EVENTS.ONGOING_DETACHED,
                payload: {
                    cardUid: ongoing.uid,
                    defId: ongoing.defId,
                    ownerId: ongoing.ownerId,
                    reason: 'alien_jammed_signals_self_destruct',
                },
                timestamp: ctx.now,
            } as OngoingDetachedEvent);
        }
    }
    return events;
}

/** 地球�?onPlay：选择一个效果基地替换为基地牌库顶的基地，所有卡片保�?*/
function alienTerraform(ctx: AbilityContext): AbilityResult {
    if (ctx.state.baseDeck.length === 0) return { events: [] };
    const candidates: { baseIndex: number; label: string }[] = [];
    for (let i = 0; i < ctx.state.bases.length; i++) {
        const baseDef = getBaseDef(ctx.state.bases[i].defId);
        candidates.push({ baseIndex: i, label: baseDef?.name ?? `基地 ${i + 1}` });
    }
    if (candidates.length === 0) return { events: [] };
    const interaction = createSimpleChoice(
        `alien_terraform_${ctx.now}`, ctx.playerId,
        '选择要替换的基地（上面的卡片会保留）', buildBaseTargetOptions(candidates), 'alien_terraform',
    );
    return { events: [], matchState: queueInteraction(ctx.matchState, interaction) };
}

/** 侦察�?onPlay：搜索牌库找一个随从放入手牌，然后洗牌�?*/
function alienScout(ctx: AbilityContext): AbilityResult {
    const player = ctx.state.players[ctx.playerId];
    const minionCards = player.deck.filter(c => c.type === 'minion');
    if (minionCards.length === 0) return { events: [] };
    const options = minionCards.map((c, i) => {
        const def = getCardDef(c.defId) as MinionCardDef | undefined;
        const name = def?.name ?? c.defId;
        const power = def?.power ?? 0;
        return { id: `card-${i}`, label: `${name} (力量 ${power})`, value: { cardUid: c.uid, defId: c.defId } };
    });
    const interaction = createSimpleChoice(
        `alien_scout_${ctx.now}`, ctx.playerId,
        '选择一个效果随从放入手牌', options as any[], 'alien_scout',
    );
    return { events: [], matchState: queueInteraction(ctx.matchState, interaction) };
}

/** 射线传�?onPlay：选择一个效果对手，展示其随机手牌，选择放回牌库顶顶或保留 */
function alienBeamingDown(ctx: AbilityContext): AbilityResult {
    // 收集有手牌的对手
    const opponents: { pid: string; label: string }[] = [];
    for (const pid of ctx.state.turnOrder) {
        if (pid === ctx.playerId) continue;
        const opponent = ctx.state.players[pid];
        if (opponent.hand.length === 0) continue;
        opponents.push({ pid, label: `对手 ${pid}�?{opponent.hand.length}张手牌）` });
    }
    if (opponents.length === 0) return { events: [] };
    const options = opponents.map((o, i) => ({ id: `opp-${i}`, label: o.label, value: { pid: o.pid } }));
    const interaction = createSimpleChoice(
        `alien_beaming_down_${ctx.now}`, ctx.playerId,
        '选择一个效果对手展示其随机手牌', options as any[], 'alien_beaming_down_choose_opponent',
    );
    return { events: [], matchState: queueInteraction(ctx.matchState, interaction) };
}

// ============================================================================
// Prompt 继续函数
// ============================================================================

/** 将基地上所有随从返回手牌（辅助函数�?*/
function returnAllMinionsFromBase(
    state: SmashUpCore,
    baseIndex: number,
    now: number
): SmashUpEvent[] {
    const base = state.bases[baseIndex];
    if (!base) return [];
    const events: SmashUpEvent[] = [];
    for (const m of base.minions) {
        const evt: MinionReturnedEvent = {
            type: SU_EVENTS.MINION_RETURNED,
            payload: {
                minionUid: m.uid,
                minionDefId: m.defId,
                fromBaseIndex: baseIndex,
                toPlayerId: m.owner,
                reason: 'alien_crop_circles',
            },
            timestamp: now,
        };
        events.push(evt);
    }
    return events;
}

/** 注册外星人派系的交互解决处理函数 */
export function registerAlienInteractionHandlers(): void {
    // 麦田怪圈：选择基地后，返回该基地所有随从
    registerInteractionHandler('alien_crop_circles', (state, _playerId, value, _iData, _random, timestamp) => {
        const { baseIndex } = value as { baseIndex: number };
        return { state, events: returnAllMinionsFromBase(state.core, baseIndex, timestamp) };
    });

    // 外星霸主：选择目标后返回手牌
    registerInteractionHandler('alien_supreme_overlord', (state, _playerId, value, _iData, _random, timestamp) => {
        const { minionUid, baseIndex } = value as { minionUid: string; baseIndex: number };
        const base = state.core.bases[baseIndex];
        if (!base) return undefined;
        const target = base.minions.find(m => m.uid === minionUid);
        if (!target) return undefined;
        return { state, events: [{
            type: SU_EVENTS.MINION_RETURNED,
            payload: { minionUid: target.uid, minionDefId: target.defId, fromBaseIndex: baseIndex, toPlayerId: target.owner, reason: 'alien_supreme_overlord' },
            timestamp,
        } as MinionReturnedEvent] };
    });

    // 采集者：选择目标后返回手牌
    registerInteractionHandler('alien_collector', (state, _playerId, value, _iData, _random, timestamp) => {
        const { minionUid, baseIndex } = value as { minionUid: string; baseIndex: number };
        const base = state.core.bases[baseIndex];
        if (!base) return undefined;
        const target = base.minions.find(m => m.uid === minionUid);
        if (!target) return undefined;
        return { state, events: [{
            type: SU_EVENTS.MINION_RETURNED,
            payload: { minionUid: target.uid, minionDefId: target.defId, fromBaseIndex: baseIndex, toPlayerId: target.owner, reason: 'alien_collector' },
            timestamp,
        } as MinionReturnedEvent] };
    });

    // 解体：选择目标后返回手牌
    registerInteractionHandler('alien_disintegrate', (state, _playerId, value, _iData, _random, timestamp) => {
        const { minionUid, baseIndex } = value as { minionUid: string; baseIndex: number };
        const base = state.core.bases[baseIndex];
        if (!base) return undefined;
        const target = base.minions.find(m => m.uid === minionUid);
        if (!target) return undefined;
        return { state, events: [{
            type: SU_EVENTS.MINION_RETURNED,
            payload: { minionUid: target.uid, minionDefId: target.defId, fromBaseIndex: baseIndex, toPlayerId: target.owner, reason: 'alien_disintegrate' },
            timestamp,
        } as MinionReturnedEvent] };
    });

    // 侦察兵：选择随从放入手牌
    registerInteractionHandler('alien_scout', (state, playerId, value, _iData, _random, timestamp) => {
        const { cardUid } = value as { cardUid: string };
        return { state, events: [{
            type: SU_EVENTS.CARDS_DRAWN,
            payload: { playerId, count: 1, cardUids: [cardUid] },
            timestamp,
        } as CardsDrawnEvent] };
    });

    // 射线传递：选择对手后随机展示手牌，链式选择处理方式
    registerInteractionHandler('alien_beaming_down_choose_opponent', (state, playerId, value, _iData, random, timestamp) => {
        const { pid } = value as { pid: string };
        const opponent = state.core.players[pid];
        if (!opponent || opponent.hand.length === 0) return undefined;
        const idx = Math.floor(random.random() * opponent.hand.length);
        const card = opponent.hand[idx];
        const def = getCardDef(card.defId);
        const cardName = def?.name ?? card.defId;
        const next = createSimpleChoice(
            `alien_beaming_down_decide_${timestamp}`, playerId,
            `对手 ${pid} 的随机手牌是「${cardName}」，选择处理方式`,
            [
                { id: 'to_deck', label: '放回牌库顶', value: { action: 'to_deck' } },
                { id: 'keep', label: '保留在手牌', value: { action: 'keep' } },
            ] as any[],
            'alien_beaming_down_decide',
        );
        return { state: queueInteraction(state, { ...next, data: { ...next.data, continuationContext: { cardUid: card.uid, defId: card.defId, ownerId: pid } } }), events: [] };
    });

    // 射线传递：选择放回牌库顶或保留
    registerInteractionHandler('alien_beaming_down_decide', (state, _playerId, value, iData, _random, timestamp) => {
        const { action } = value as { action: 'to_deck' | 'keep' };
        if (action === 'keep') return { state, events: [] };
        const ctx = (iData as any)?.continuationContext as { cardUid: string; defId: string; ownerId: string };
        if (!ctx) return undefined;
        return { state, events: [{
            type: SU_EVENTS.CARD_TO_DECK_TOP,
            payload: { cardUid: ctx.cardUid, defId: ctx.defId, ownerId: ctx.ownerId, reason: 'alien_beaming_down' },
            timestamp,
        } as SmashUpEvent] };
    });

    // 地球化：选择基地后替换为基地牌库顶的基地（卡片保留）
    registerInteractionHandler('alien_terraform', (state, _playerId, value, _iData, _random, timestamp) => {
        const { baseIndex } = value as { baseIndex: number };
        const base = state.core.bases[baseIndex];
        if (!base) return undefined;
        if (state.core.baseDeck.length === 0) return undefined;
        return { state, events: [{
            type: SU_EVENTS.BASE_REPLACED,
            payload: { baseIndex, oldBaseDefId: base.defId, newBaseDefId: state.core.baseDeck[0], keepCards: true },
            timestamp,
        } as BaseReplacedEvent] };
    });

    // 射线探测：选择对手后展示手牌
    registerInteractionHandler('alien_probe_choose_opponent', (state, playerId, value, _iData, _random, timestamp) => {
        const { pid } = value as { pid: string };
        const target = state.core.players[pid];
        if (!target || target.hand.length === 0) return undefined;
        const cards = target.hand.map(c => ({ uid: c.uid, defId: c.defId }));
        return { state, events: [{
            type: SU_EVENTS.REVEAL_HAND,
            payload: { targetPlayerId: pid, viewerPlayerId: playerId, cards, reason: 'alien_probe' },
            timestamp,
        } as SmashUpEvent] };
    });

    // 侦察船一：选择玩家后展示牌库顶
    registerInteractionHandler('alien_scout_ship_choose_player', (state, playerId, value, _iData, _random, timestamp) => {
        const { pid } = value as { pid: string };
        const target = state.core.players[pid];
        if (!target || target.deck.length === 0) return undefined;
        const topCard = target.deck[0];
        return { state, events: [{
            type: SU_EVENTS.REVEAL_DECK_TOP,
            payload: { targetPlayerId: pid, viewerPlayerId: playerId, cards: [{ uid: topCard.uid, defId: topCard.defId }], count: 1, reason: 'alien_scout_ship' },
            timestamp,
        } as SmashUpEvent] };
    });

    // 侦察船二：选择对手后展示手牌
    registerInteractionHandler('alien_scout_ship_hand_choose_opponent', (state, playerId, value, _iData, _random, timestamp) => {
        const { pid } = value as { pid: string };
        const target = state.core.players[pid];
        if (!target || target.hand.length === 0) return undefined;
        const cards = target.hand.map(c => ({ uid: c.uid, defId: c.defId }));
        return { state, events: [{
            type: SU_EVENTS.REVEAL_HAND,
            payload: { targetPlayerId: pid, viewerPlayerId: playerId, cards, reason: 'alien_scout_ship' },
            timestamp,
        } as SmashUpEvent] };
    });
}
