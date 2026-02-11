/**
 * 大杀四方 - 幽灵派系能力
 *
 * 主题：手牌少时获得增益、弃牌操作
 */

import { registerAbility } from '../domain/abilityRegistry';
import type { AbilityContext, AbilityResult } from '../domain/abilityRegistry';
import { grantExtraMinion, grantExtraAction, destroyMinion, getMinionPower, setPromptContinuation, buildMinionTargetOptions } from '../domain/abilityHelpers';
import { SU_EVENTS } from '../domain/types';
import type { CardsDrawnEvent, CardsDiscardedEvent, VpAwardedEvent, SmashUpEvent, MinionReturnedEvent } from '../domain/types';
import type { MinionCardDef } from '../domain/types';
import { drawCards } from '../domain/utils';
import { registerProtection } from '../domain/ongoingEffects';
import type { ProtectionCheckContext } from '../domain/ongoingEffects';
import { registerPromptContinuation } from '../domain/promptContinuation';
import { getCardDef, getBaseDef } from '../data/cards';

/** 注册幽灵派系所有能力 */
export function registerGhostAbilities(): void {
    // 幽灵 onPlay：弃一张手牌
    registerAbility('ghost_ghost', 'onPlay', ghostGhost);
    // 招魂（行动卡）：手牌≤2时抽到5张
    registerAbility('ghost_seance', 'onPlay', ghostSeance);
    // 阴暗交易（行动卡）：手牌≤2时获得1VP
    registerAbility('ghost_shady_deal', 'onPlay', ghostShadyDeal);
    // 悄然而至（行动卡）：额外打出一个随从和一个行动
    registerAbility('ghost_ghostly_arrival', 'onPlay', ghostGhostlyArrival);
    // 灵魂（随从 onPlay）：弃等量力量的牌消灭一个随从
    registerAbility('ghost_spirit', 'onPlay', ghostSpirit);

    // === ongoing 效果注册 ===
    // ghost_incorporeal: 打出到随从上，持续：该随从不受其他玩家卡牌影响
    registerProtection('ghost_incorporeal', 'affect', ghostIncorporealChecker);
    // ghost_haunting: 持续：手牌≤2时，本随从不受其他玩家卡牌影响
    registerProtection('ghost_haunting', 'affect', ghostHauntingChecker);

    // ghost_make_contact: 控制对手随从（special 能力）
    registerAbility('ghost_make_contact', 'onPlay', ghostMakeContact);
}

/** 幽灵 onPlay：弃一张手牌 */
function ghostGhost(ctx: AbilityContext): AbilityResult {
    const player = ctx.state.players[ctx.playerId];
    const discardable = player.hand.filter(c => c.uid !== ctx.cardUid);
    if (discardable.length === 0) return { events: [] };
    if (discardable.length === 1) {
        const evt: CardsDiscardedEvent = {
            type: SU_EVENTS.CARDS_DISCARDED,
            payload: { playerId: ctx.playerId, cardUids: [discardable[0].uid] },
            timestamp: ctx.now,
        };
        return { events: [evt] };
    }
    // 多张手牌：Prompt 选择弃哪张
    const options = discardable.map((c, i) => {
        const def = getCardDef(c.defId);
        const name = def?.name ?? c.defId;
        return { id: `card-${i}`, label: name, value: { cardUid: c.uid } };
    });
    return {
        events: [setPromptContinuation({
            abilityId: 'ghost_ghost',
            playerId: ctx.playerId,
            data: { promptConfig: { title: '选择要弃掉的手牌', options } },
        }, ctx.now)],
    };
}

/** 招魂 onPlay：手牌≤2时抽到5张 */
function ghostSeance(ctx: AbilityContext): AbilityResult {
    const player = ctx.state.players[ctx.playerId];
    // 打出行动卡后手牌会减1，所以用当前手牌数-1判断
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

/** 阴暗交易 onPlay：手牌≤2时获得1VP */
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

/** 悄然而至 onPlay：额外打出一个随从和一个行动 */
function ghostGhostlyArrival(ctx: AbilityContext): AbilityResult {
    return {
        events: [
            grantExtraMinion(ctx.playerId, 'ghost_ghostly_arrival', ctx.now),
            grantExtraAction(ctx.playerId, 'ghost_ghostly_arrival', ctx.now),
        ],
    };
}

// ghost_haunting (ongoing) - 已通过 ongoingModifiers 系统实现力量修正（+3 力量部分）
//   不受影响部分通过 ghost_incorporeal protection 实现（注册在 registerGhostAbilities 中）
// ghost_door_to_the_beyond (ongoing) - 已通过 ongoingModifiers 系统实现力量修正（手牌≤2时同基地己方随从+2）

/**
 * ghost_incorporeal 保护检查：ghost_haunting 附着的随从不受其他玩家卡牌影响
 * 
 * 规则：附着了 ghost_haunting 的随从不受其他玩家卡牌影响。
 * 实现：检查目标随从是否附着了 ghost_haunting，且攻击者不是随从控制者。
 */
function ghostIncorporealChecker(ctx: ProtectionCheckContext): boolean {
    // 检查目标随从是否附着了 ghost_incorporeal
    const hasIncorporeal = ctx.targetMinion.attachedActions.some(a => a.defId === 'ghost_incorporeal');
    if (!hasIncorporeal) return false;
    // 只保护不受其他玩家影响
    return ctx.sourcePlayerId !== ctx.targetMinion.controller;
}

/**
 * ghost_haunting 保护检查：手牌≤2时，不散阴魂本随从不受其他玩家卡牌影响
 */
function ghostHauntingChecker(ctx: ProtectionCheckContext): boolean {
    if (ctx.targetMinion.defId !== 'ghost_haunting') return false;
    if (ctx.sourcePlayerId === ctx.targetMinion.controller) return false;
    const player = ctx.state.players[ctx.targetMinion.controller];
    if (!player) return false;
    return player.hand.length <= 2;
}

/**
 * ghost_make_contact onPlay：控制对手一个随从（将其返回手牌）
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
    if (targets.length === 1) {
        const t = targets[0];
        const evt: MinionReturnedEvent = {
            type: SU_EVENTS.MINION_RETURNED,
            payload: { minionUid: t.uid, minionDefId: t.defId, fromBaseIndex: t.baseIndex, toPlayerId: t.owner, reason: 'ghost_make_contact' },
            timestamp: ctx.now,
        };
        return { events: [evt] };
    }
    // 多目标：Prompt 选择
    const options = targets.map(t => ({ uid: t.uid, defId: t.defId, baseIndex: t.baseIndex, label: t.label }));
    return {
        events: [setPromptContinuation({
            abilityId: 'ghost_make_contact',
            playerId: ctx.playerId,
            data: { promptConfig: { title: '选择要控制的对手随从', options: buildMinionTargetOptions(options) } },
        }, ctx.now)],
    };
}

/**
 * 灵魂 onPlay：选择一个随从，弃等量力量的手牌来消灭它
 */
function ghostSpirit(ctx: AbilityContext): AbilityResult {
    const player = ctx.state.players[ctx.playerId];
    const discardable = player.hand.filter(c => c.uid !== ctx.cardUid);
    if (discardable.length === 0) return { events: [] };

    // 找所有可消灭的对手随从（力量 ≤ 可弃手牌数）
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
                targets.push({ uid: m.uid, defId: m.defId, baseIndex: i, owner: m.owner, power, label: `${name} (力量 ${power}, 需弃 ${power} 张牌) @ ${baseName}` });
            }
        }
    }
    if (targets.length === 0) return { events: [] };
    if (targets.length === 1) {
        return spiritDestroyTarget(ctx, targets[0], discardable);
    }
    // 多目标：Prompt 选择
    const options = targets.map(t => ({ uid: t.uid, defId: t.defId, baseIndex: t.baseIndex, label: t.label }));
    return {
        events: [setPromptContinuation({
            abilityId: 'ghost_spirit',
            playerId: ctx.playerId,
            data: { promptConfig: { title: '选择要消灭的随从（需弃等量力量的手牌）', options: buildMinionTargetOptions(options) } },
        }, ctx.now)],
    };
}

/** 灵魂辅助：弃牌并消灭目标 */
function spiritDestroyTarget(
    ctx: AbilityContext,
    target: { uid: string; defId: string; baseIndex: number; owner: string; power: number },
    discardable: { uid: string }[],
): AbilityResult {
    const events: SmashUpEvent[] = [];
    const toDiscard = discardable.slice(0, target.power);
    if (toDiscard.length > 0) {
        events.push({
            type: SU_EVENTS.CARDS_DISCARDED,
            payload: { playerId: ctx.playerId, cardUids: toDiscard.map(c => c.uid) },
            timestamp: ctx.now,
        } as CardsDiscardedEvent);
    }
    events.push(destroyMinion(target.uid, target.defId, target.baseIndex, target.owner, 'ghost_spirit', ctx.now));
    return { events };
}


// ============================================================================
// Prompt 继续函数
// ============================================================================

/** 注册幽灵派系的 Prompt 继续函数 */
export function registerGhostPromptContinuations(): void {
    // 幽灵：选择弃哪张手牌
    registerPromptContinuation('ghost_ghost', (ctx) => {
        const { cardUid } = ctx.selectedValue as { cardUid: string };
        return [{
            type: SU_EVENTS.CARDS_DISCARDED,
            payload: { playerId: ctx.playerId, cardUids: [cardUid] },
            timestamp: ctx.now,
        }];
    });

    // 灵魂：选择目标后弃牌并消灭
    registerPromptContinuation('ghost_spirit', (ctx) => {
        const { minionUid, baseIndex } = ctx.selectedValue as { minionUid: string; baseIndex: number };
        const base = ctx.state.bases[baseIndex];
        if (!base) return [];
        const target = base.minions.find(m => m.uid === minionUid);
        if (!target) return [];
        const power = getMinionPower(ctx.state, target, baseIndex);
        const player = ctx.state.players[ctx.playerId];
        const discardable = player.hand.filter(c => c.uid !== minionUid);
        const toDiscard = discardable.slice(0, power);
        const events: SmashUpEvent[] = [];
        if (toDiscard.length > 0) {
            events.push({
                type: SU_EVENTS.CARDS_DISCARDED,
                payload: { playerId: ctx.playerId, cardUids: toDiscard.map(c => c.uid) },
                timestamp: ctx.now,
            });
        }
        events.push(destroyMinion(target.uid, target.defId, baseIndex, target.owner, 'ghost_spirit', ctx.now));
        return events;
    });

    // 心灵接触：选择目标后返回手牌
    registerPromptContinuation('ghost_make_contact', (ctx) => {
        const { minionUid, baseIndex } = ctx.selectedValue as { minionUid: string; baseIndex: number };
        const base = ctx.state.bases[baseIndex];
        if (!base) return [];
        const target = base.minions.find(m => m.uid === minionUid);
        if (!target) return [];
        return [{
            type: SU_EVENTS.MINION_RETURNED,
            payload: { minionUid: target.uid, minionDefId: target.defId, fromBaseIndex: baseIndex, toPlayerId: target.owner, reason: 'ghost_make_contact' },
            timestamp: ctx.now,
        }];
    });
}
