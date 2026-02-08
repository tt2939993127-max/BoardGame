/**
 * 大杀四方 - 幽灵派系能力
 *
 * 主题：手牌少时获得增益、弃牌操作
 */

import { registerAbility } from '../domain/abilityRegistry';
import type { AbilityContext, AbilityResult } from '../domain/abilityRegistry';
import { grantExtraMinion, grantExtraAction } from '../domain/abilityHelpers';
import { SU_EVENTS } from '../domain/types';
import type { CardsDrawnEvent, CardsDiscardedEvent, VpAwardedEvent } from '../domain/types';
import { drawCards } from '../domain/utils';

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
}

/** 幽灵 onPlay：弃一张手牌（MVP：自动弃第一张非自身的手牌） */
function ghostGhost(ctx: AbilityContext): AbilityResult {
    const player = ctx.state.players[ctx.playerId];
    // 排除刚打出的自己
    const discardable = player.hand.filter(c => c.uid !== ctx.cardUid);
    if (discardable.length === 0) return { events: [] };
    const card = discardable[0];
    const evt: CardsDiscardedEvent = {
        type: SU_EVENTS.CARDS_DISCARDED,
        payload: { playerId: ctx.playerId, cardUids: [card.uid] },
        timestamp: ctx.now,
    };
    return { events: [evt] };
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

// TODO: ghost_spectre (ability) - 手牌≤2时从弃牌堆打出（需要 ability 时机系统）
// TODO: ghost_haunting (ongoing) - 手牌≤2时+3力量且不受影响（需要 ongoing 效果系统）
// TODO: ghost_spirit (onPlay) - 弃等量力量的牌消灭随从（需要 Prompt 选择目标+数量）
// TODO: ghost_incorporeal (ongoing) - 不受其他玩家卡牌影响（需要 ongoing 效果系统）
// TODO: ghost_make_contact (ongoing) - 控制对手随从（需要 ongoing 效果系统）
// TODO: ghost_door_to_the_beyond (ongoing) - 手牌≤2时随从+2力量（需要 ongoing 力量修正）
// TODO: ghost_the_dead_rise (action) - 弃牌后从弃牌堆打出随从（需要 Prompt）
// TODO: ghost_across_the_divide (action) - 从弃牌堆取回同名随从（需要 Prompt 选名字）
