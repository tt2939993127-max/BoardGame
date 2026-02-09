/**
 * 大杀四方 - 蒸汽朋克派系能力
 *
 * 主题：战术卡（行动卡）复用、从弃牌堆取回行动卡
 */

import { registerAbility } from '../domain/abilityRegistry';
import type { AbilityContext, AbilityResult } from '../domain/abilityRegistry';
import { recoverCardsFromDiscard, grantExtraAction, moveMinion, destroyMinion, getMinionPower, setPromptContinuation } from '../domain/abilityHelpers';
import { SU_EVENTS } from '../domain/types';
import type { SmashUpEvent, CardsDrawnEvent, MinionReturnedEvent, OngoingAttachedEvent } from '../domain/types';
import { registerProtection, registerRestriction, registerTrigger } from '../domain/ongoingEffects';
import type { ProtectionCheckContext, RestrictionCheckContext, TriggerContext } from '../domain/ongoingEffects';
import { drawCards } from '../domain/utils';
import { registerPromptContinuation } from '../domain/promptContinuation';
import { getCardDef } from '../data/cards';

/** 注册蒸汽朋克派系所有能力 */
export function registerSteampunkAbilities(): void {
    // 废物利用（行动卡）：从弃牌堆取回一张行动卡到手牌
    registerAbility('steampunk_scrap_diving', 'onPlay', steampunkScrapDiving);
    // 机械师（随从 onPlay）：从弃牌堆打出一张持续行动卡
    registerAbility('steampunk_mechanic', 'onPlay', steampunkMechanic);
    // 换场（行动卡）：取回一张己方 ongoing 行动卡到手牌 + 额外行动
    registerAbility('steampunk_change_of_venue', 'onPlay', steampunkChangeOfVenue);
    // 亚哈船长（talent）：移动到有己方行动卡的基地
    registerAbility('steampunk_captain_ahab', 'talent', steampunkCaptainAhab);

    // === ongoing 效果注册 ===
    // steam_queen: 己方 ongoing 行动卡不受对手影响
    registerProtection('steampunk_steam_queen', 'action', steampunkSteamQueenChecker);
    // ornate_dome: 禁止对手打行动卡到此基地
    registerRestriction('steampunk_ornate_dome', 'play_action', steampunkOrnateDomeChecker);
    // difference_engine: 回合结束时控制者多抽1牌
    registerTrigger('steampunk_difference_engine', 'onTurnEnd', steampunkDifferenceEngineTrigger);
    // escape_hatch: 随从被消灭时回手牌
    registerTrigger('steampunk_escape_hatch', 'onMinionDestroyed', steampunkEscapeHatchTrigger);
}

/** 废物利用 onPlay：从弃牌堆取回一张行动卡到手牌 */
function steampunkScrapDiving(ctx: AbilityContext): AbilityResult {
    const player = ctx.state.players[ctx.playerId];
    const actionsInDiscard = player.discard.filter(c => c.type === 'action' && c.uid !== ctx.cardUid);
    if (actionsInDiscard.length === 0) return { events: [] };
    if (actionsInDiscard.length === 1) {
        return { events: [recoverCardsFromDiscard(ctx.playerId, [actionsInDiscard[0].uid], 'steampunk_scrap_diving', ctx.now)] };
    }
    const options = actionsInDiscard.map((c, i) => {
        const def = getCardDef(c.defId);
        const name = def?.name ?? c.defId;
        return { id: `card-${i}`, label: name, value: { cardUid: c.uid } };
    });
    return {
        events: [setPromptContinuation({
            abilityId: 'steampunk_scrap_diving',
            playerId: ctx.playerId,
            data: { promptConfig: { title: '选择要从弃牌堆取回的行动卡', options } },
        }, ctx.now)],
    };
}

// steampunk_steam_man (ongoing) - 已通过 ongoingModifiers 系统实现力量修正（按行动卡数+力量）
// steampunk_aggromotive (ongoing) - 已通过 ongoingModifiers 系统实现力量修正（有随从时+5）
// steampunk_rotary_slug_thrower (ongoing) - 已通过 ongoingModifiers 系统实现力量修正（己方随从+2）

// ============================================================================
// ongoing 效果检查器
// ============================================================================

/**
 * steam_queen 保护检查：己方 ongoing 行动卡不受对手行动卡影响
 * 
 * 规则：当 steam_queen 在场时，同基地己方随从不受对手行动卡影响
 */
function steampunkSteamQueenChecker(ctx: ProtectionCheckContext): boolean {
    // steam_queen 保护同基地己方随从
    const base = ctx.state.bases[ctx.targetBaseIndex];
    if (!base) return false;
    // 检查 steam_queen 是否在同基地
    const queenOnBase = base.minions.some(m => m.defId === 'steampunk_steam_queen');
    if (!queenOnBase) return false;
    // 只保护 steam_queen 控制者的随从
    const queenController = base.minions.find(m => m.defId === 'steampunk_steam_queen')?.controller;
    return ctx.targetMinion.controller === queenController && ctx.sourcePlayerId !== queenController;
}

/**
 * ornate_dome 限制检查：禁止对手打行动卡到此基地
 */
function steampunkOrnateDomeChecker(ctx: RestrictionCheckContext): boolean {
    const base = ctx.state.bases[ctx.baseIndex];
    if (!base) return false;
    const dome = base.ongoingActions.find(o => o.defId === 'steampunk_ornate_dome');
    if (!dome) return false;
    // 只限制非拥有者
    return ctx.playerId !== dome.ownerId;
}

/**
 * difference_engine 触发：回合结束时控制者多抽1牌
 */
function steampunkDifferenceEngineTrigger(ctx: TriggerContext): SmashUpEvent[] {
    const events: SmashUpEvent[] = [];
    for (const base of ctx.state.bases) {
        for (const m of base.minions) {
            if (m.defId !== 'steampunk_difference_engine') continue;
            if (m.controller !== ctx.playerId) continue;
            const player = ctx.state.players[m.controller];
            if (!player || player.deck.length === 0) continue;
            const drawnUid = player.deck[0].uid;
            const evt: CardsDrawnEvent = {
                type: SU_EVENTS.CARDS_DRAWN,
                payload: { playerId: m.controller, count: 1, cardUids: [drawnUid] },
                timestamp: ctx.now,
            };
            events.push(evt);
        }
    }
    return events;
}

/**
 * escape_hatch 触发：己方随从被消灭时回手牌（而非进弃牌堆）
 * 
 * 规则：当 escape_hatch 附着在基地上时，该基地上拥有者的随从被消灭时回手牌
 */
function steampunkEscapeHatchTrigger(ctx: TriggerContext): SmashUpEvent[] {
    if (ctx.baseIndex === undefined || !ctx.triggerMinionUid) return [];
    const base = ctx.state.bases[ctx.baseIndex];
    if (!base) return [];

    const hatch = base.ongoingActions.find(o => o.defId === 'steampunk_escape_hatch');
    if (!hatch) return [];

    // 找被消灭的随从
    const minion = base.minions.find(m => m.uid === ctx.triggerMinionUid);
    if (!minion) return [];
    // 只保护 hatch 拥有者的随从
    if (minion.controller !== hatch.ownerId) return [];

    const evt: MinionReturnedEvent = {
        type: SU_EVENTS.MINION_RETURNED,
        payload: {
            minionUid: minion.uid,
            minionDefId: minion.defId,
            fromBaseIndex: ctx.baseIndex,
            toPlayerId: minion.owner,
            reason: 'steampunk_escape_hatch',
        },
        timestamp: ctx.now,
    };
    return [evt];
}

// ============================================================================
// 新增能力实现
// ============================================================================

/**
 * 机械师 onPlay：从弃牌堆打出一张持续行动卡到基地
 */
function steampunkMechanic(ctx: AbilityContext): AbilityResult {
    const player = ctx.state.players[ctx.playerId];
    const actionsInDiscard = player.discard.filter(c => c.type === 'action' && c.uid !== ctx.cardUid);
    if (actionsInDiscard.length === 0) return { events: [] };
    if (actionsInDiscard.length === 1) {
        return { events: [recoverCardsFromDiscard(ctx.playerId, [actionsInDiscard[0].uid], 'steampunk_mechanic', ctx.now)] };
    }
    const options = actionsInDiscard.map((c, i) => {
        const def = getCardDef(c.defId);
        const name = def?.name ?? c.defId;
        return { id: `card-${i}`, label: name, value: { cardUid: c.uid } };
    });
    return {
        events: [setPromptContinuation({
            abilityId: 'steampunk_mechanic',
            playerId: ctx.playerId,
            data: { promptConfig: { title: '选择要从弃牌堆打出的行动卡', options } },
        }, ctx.now)],
    };
}

/**
 * 换场 onPlay：取回一张己方 ongoing 行动卡到手牌 + 额外行动
 */
function steampunkChangeOfVenue(ctx: AbilityContext): AbilityResult {
    // 收集所有己方 ongoing 行动卡
    const myOngoings: { uid: string; defId: string; ownerId: string; baseIndex: number; label: string }[] = [];
    for (let i = 0; i < ctx.state.bases.length; i++) {
        const base = ctx.state.bases[i];
        for (const o of base.ongoingActions) {
            if (o.ownerId === ctx.playerId) {
                const def = getCardDef(o.defId);
                const name = def?.name ?? o.defId;
                myOngoings.push({ uid: o.uid, defId: o.defId, ownerId: o.ownerId, baseIndex: i, label: name });
            }
        }
    }
    if (myOngoings.length === 0) {
        // 没有 ongoing 行动卡，仍给额外行动
        return { events: [grantExtraAction(ctx.playerId, 'steampunk_change_of_venue', ctx.now)] };
    }
    if (myOngoings.length === 1) {
        return {
            events: [
                { type: SU_EVENTS.ONGOING_DETACHED, payload: { cardUid: myOngoings[0].uid, defId: myOngoings[0].defId, ownerId: myOngoings[0].ownerId, reason: 'steampunk_change_of_venue' }, timestamp: ctx.now },
                grantExtraAction(ctx.playerId, 'steampunk_change_of_venue', ctx.now),
            ],
        };
    }
    const options = myOngoings.map((o, i) => ({
        id: `ongoing-${i}`, label: o.label, value: { cardUid: o.uid, defId: o.defId, ownerId: o.ownerId },
    }));
    return {
        events: [setPromptContinuation({
            abilityId: 'steampunk_change_of_venue',
            playerId: ctx.playerId,
            data: { promptConfig: { title: '选择要取回的持续行动卡', options } },
        }, ctx.now)],
    };
}

/**
 * 亚哈船长 talent：移动到有己方行动卡的基地
 * MVP：自动选第一个有己方 ongoing 行动卡的其他基地
 */
function steampunkCaptainAhab(ctx: AbilityContext): AbilityResult {
    // 找 captain_ahab 当前所在基地
    let currentBaseIndex = -1;
    for (let i = 0; i < ctx.state.bases.length; i++) {
        if (ctx.state.bases[i].minions.some(m => m.uid === ctx.cardUid)) {
            currentBaseIndex = i;
            break;
        }
    }
    if (currentBaseIndex === -1) return { events: [] };

    // 找有己方 ongoing 行动卡的其他基地
    for (let i = 0; i < ctx.state.bases.length; i++) {
        if (i === currentBaseIndex) continue;
        const base = ctx.state.bases[i];
        if (base.ongoingActions.some(o => o.ownerId === ctx.playerId)) {
            return {
                events: [moveMinion(ctx.cardUid, ctx.defId, currentBaseIndex, i, 'steampunk_captain_ahab', ctx.now)],
            };
        }
    }
    return { events: [] };
}


// ============================================================================
// Prompt 继续函数
// ============================================================================

/** 注册蒸汽朋克派系的 Prompt 继续函数 */
export function registerSteampunkPromptContinuations(): void {
    // 废物利用：选择弃牌堆行动卡后取回
    registerPromptContinuation('steampunk_scrap_diving', (ctx) => {
        const { cardUid } = ctx.selectedValue as { cardUid: string };
        return [recoverCardsFromDiscard(ctx.playerId, [cardUid], 'steampunk_scrap_diving', ctx.now)];
    });

    // 机械师：选择弃牌堆行动卡后取回
    registerPromptContinuation('steampunk_mechanic', (ctx) => {
        const { cardUid } = ctx.selectedValue as { cardUid: string };
        return [recoverCardsFromDiscard(ctx.playerId, [cardUid], 'steampunk_mechanic', ctx.now)];
    });

    // 换场：选择 ongoing 行动卡后取回 + 额外行动
    registerPromptContinuation('steampunk_change_of_venue', (ctx) => {
        const { cardUid, defId, ownerId } = ctx.selectedValue as { cardUid: string; defId: string; ownerId: string };
        return [
            { type: SU_EVENTS.ONGOING_DETACHED, payload: { cardUid, defId, ownerId, reason: 'steampunk_change_of_venue' }, timestamp: ctx.now },
            grantExtraAction(ctx.playerId, 'steampunk_change_of_venue', ctx.now),
        ];
    });
}
