/**
 * 大杀四方 - 僵尸派系能力
 *
 * 主题：从弃牌堆复活随从、弃牌堆操作
 */

import { registerAbility } from '../domain/abilityRegistry';
import type { AbilityContext, AbilityResult } from '../domain/abilityRegistry';
import { SU_EVENTS } from '../domain/types';
import type {
    CardsDrawnEvent,
    CardsDiscardedEvent,
    DeckReshuffledEvent,
    SmashUpEvent,
} from '../domain/types';
import { recoverCardsFromDiscard, grantExtraMinion } from '../domain/abilityHelpers';

/** 注册僵尸派系所有能力 */
export function registerZombieAbilities(): void {
    registerAbility('zombie_grave_digger', 'onPlay', zombieGraveDigger);
    registerAbility('zombie_walker', 'onPlay', zombieWalker);
    registerAbility('zombie_grave_robbing', 'onPlay', zombieGraveRobbing);
    registerAbility('zombie_not_enough_bullets', 'onPlay', zombieNotEnoughBullets);
    registerAbility('zombie_lend_a_hand', 'onPlay', zombieLendAHand);
    registerAbility('zombie_outbreak', 'onPlay', zombieOutbreak);
    registerAbility('zombie_mall_crawl', 'onPlay', zombieMallCrawl);
    // 僵尸领主：在没有己方随从的基地从弃牌堆额外打出力量≤2的随从
    registerAbility('zombie_lord', 'onPlay', zombieLord);
}

/** 掘墓者 onPlay：从弃牌堆取回一个随从到手牌（MVP：自动选第一个随从） */
function zombieGraveDigger(ctx: AbilityContext): AbilityResult {
    const player = ctx.state.players[ctx.playerId];
    const minionInDiscard = player.discard.find(c => c.type === 'minion');
    if (!minionInDiscard) return { events: [] };
    return {
        events: [recoverCardsFromDiscard(
            ctx.playerId, [minionInDiscard.uid], 'zombie_grave_digger', ctx.now
        )],
    };
}

/** 行尸 onPlay：查看牌库顶，可弃掉或放回（MVP：自动弃掉） */
function zombieWalker(ctx: AbilityContext): AbilityResult {
    const player = ctx.state.players[ctx.playerId];
    if (player.deck.length === 0) return { events: [] };
    const topCard = player.deck[0];
    const evt: CardsDiscardedEvent = {
        type: SU_EVENTS.CARDS_DISCARDED,
        payload: { playerId: ctx.playerId, cardUids: [topCard.uid] },
        timestamp: ctx.now,
    };
    return { events: [evt] };
}

/** 掘墓 onPlay：从弃牌堆取回一张卡到手牌（MVP：自动选第一张） */
function zombieGraveRobbing(ctx: AbilityContext): AbilityResult {
    const player = ctx.state.players[ctx.playerId];
    if (player.discard.length === 0) return { events: [] };
    const card = player.discard[0];
    return {
        events: [recoverCardsFromDiscard(
            ctx.playerId, [card.uid], 'zombie_grave_robbing', ctx.now
        )],
    };
}

/** 子弹不够 onPlay：取回弃牌堆中所有同名随从（MVP：自动选第一个随从名） */
function zombieNotEnoughBullets(ctx: AbilityContext): AbilityResult {
    const player = ctx.state.players[ctx.playerId];
    const minionsInDiscard = player.discard.filter(c => c.type === 'minion');
    if (minionsInDiscard.length === 0) return { events: [] };
    const targetDefId = minionsInDiscard[0].defId;
    const sameNameMinions = minionsInDiscard.filter(c => c.defId === targetDefId);
    return {
        events: [recoverCardsFromDiscard(
            ctx.playerId,
            sameNameMinions.map(c => c.uid),
            'zombie_not_enough_bullets',
            ctx.now
        )],
    };
}

/** 借把手 onPlay：将弃牌堆全部洗回牌库（MVP：全部洗回） */
function zombieLendAHand(ctx: AbilityContext): AbilityResult {
    const player = ctx.state.players[ctx.playerId];
    if (player.discard.length === 0) return { events: [] };
    const combined = [...player.deck, ...player.discard];
    const shuffled = ctx.random.shuffle([...combined]);
    const evt: DeckReshuffledEvent = {
        type: SU_EVENTS.DECK_RESHUFFLED,
        payload: {
            playerId: ctx.playerId,
            deckUids: shuffled.map(c => c.uid),
        },
        timestamp: ctx.now,
    };
    return { events: [evt] };
}

/** 爆发 onPlay：在没有己方随从的基地额外打出随从 */
function zombieOutbreak(ctx: AbilityContext): AbilityResult {
    const hasEmptyBase = ctx.state.bases.some(
        base => !base.minions.some(m => m.controller === ctx.playerId)
    );
    if (!hasEmptyBase) return { events: [] };
    return { events: [grantExtraMinion(ctx.playerId, 'zombie_outbreak', ctx.now)] };
}

/** 僵尸领主 onPlay：在每个没有己方随从的基地从弃牌堆额外打出力量≤2的随从（MVP：给予额外随从额度，每个空基地一个） */
function zombieLord(ctx: AbilityContext): AbilityResult {
    const events: SmashUpEvent[] = [];
    let emptyBaseCount = 0;
    for (const base of ctx.state.bases) {
        if (!base.minions.some(m => m.controller === ctx.playerId)) {
            emptyBaseCount++;
        }
    }
    for (let i = 0; i < emptyBaseCount; i++) {
        events.push(grantExtraMinion(ctx.playerId, 'zombie_lord', ctx.now));
    }
    return { events };
}

/** 进发商场 onPlay：搜索牌库同名卡放入弃牌堆（MVP：自动选第一张） */
function zombieMallCrawl(ctx: AbilityContext): AbilityResult {
    const player = ctx.state.players[ctx.playerId];
    if (player.deck.length === 0) return { events: [] };
    const targetDefId = player.deck[0].defId;
    const sameNameCards = player.deck.filter(c => c.defId === targetDefId);
    const events: SmashUpEvent[] = [];
    // 先抽出这些卡（模拟搜索）
    const drawEvt: CardsDrawnEvent = {
        type: SU_EVENTS.CARDS_DRAWN,
        payload: {
            playerId: ctx.playerId,
            count: sameNameCards.length,
            cardUids: sameNameCards.map(c => c.uid),
        },
        timestamp: ctx.now,
    };
    events.push(drawEvt);
    // 再弃掉
    const discardEvt: CardsDiscardedEvent = {
        type: SU_EVENTS.CARDS_DISCARDED,
        payload: {
            playerId: ctx.playerId,
            cardUids: sameNameCards.map(c => c.uid),
        },
        timestamp: ctx.now,
    };
    events.push(discardEvt);
    return { events };
}

