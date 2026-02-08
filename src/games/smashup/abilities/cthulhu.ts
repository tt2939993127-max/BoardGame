/**
 * 大杀四方 - 克苏鲁之仆派系能力
 *
 * 主题：疯狂卡操控、弃牌堆回收、额外行动
 */

import { registerAbility } from '../domain/abilityRegistry';
import type { AbilityContext, AbilityResult } from '../domain/abilityRegistry';
import { SU_EVENTS } from '../domain/types';
import type {
    SmashUpEvent,
    DeckReshuffledEvent,
    CardsDrawnEvent,
    MinionCardDef,
} from '../domain/types';
import { getCardDef } from '../data/cards';

/** 注册克苏鲁之仆派系所有能力 */
export function registerCthulhuAbilities(): void {
    // 强制招募（行动卡）：弃牌堆力量≤3随从放牌库顶
    registerAbility('cthulhu_recruit_by_force', 'onPlay', cthulhuRecruitByForce);
    // 再次降临（行动卡）：弃牌堆行动卡洗回牌库
    registerAbility('cthulhu_it_begins_again', 'onPlay', cthulhuItBeginsAgain);
    // 克苏鲁的馈赠（行动卡）：从牌库顶找2张行动卡放入手牌
    registerAbility('cthulhu_fhtagn', 'onPlay', cthulhuFhtagn);
}

/** 强制招募 onPlay：将弃牌堆中力量≤3的随从放到牌库顶（MVP：全部放入） */
function cthulhuRecruitByForce(ctx: AbilityContext): AbilityResult {
    const player = ctx.state.players[ctx.playerId];
    const events: SmashUpEvent[] = [];

    // 从弃牌堆找力量≤3的随从
    const eligibleMinions = player.discard.filter(c => {
        if (c.type !== 'minion') return false;
        const def = getCardDef(c.defId);
        return def && def.type === 'minion' && (def as MinionCardDef).power <= 3;
    });

    if (eligibleMinions.length === 0) return { events: [] };

    // 随从放牌库顶：先随从，再原牌库
    // DECK_RESHUFFLED reducer 会合并 deck+discard，按 deckUids 排序
    // 所以我们需要把弃牌堆中非目标卡也包含在 deckUids 中（它们会留在弃牌堆被合并）
    const newDeck = [...eligibleMinions, ...player.deck];
    const evt: DeckReshuffledEvent = {
        type: SU_EVENTS.DECK_RESHUFFLED,
        payload: {
            playerId: ctx.playerId,
            deckUids: newDeck.map(c => c.uid),
        },
        timestamp: ctx.now,
    };
    events.push(evt);

    return { events };
}

/** 再次降临 onPlay：将弃牌堆中任意数量的行动卡洗回牌库（MVP：全部洗回） */
function cthulhuItBeginsAgain(ctx: AbilityContext): AbilityResult {
    const player = ctx.state.players[ctx.playerId];
    const actionsInDiscard = player.discard.filter(c => c.type === 'action');
    if (actionsInDiscard.length === 0) return { events: [] };

    // 合并牌库 + 弃牌堆行动卡，洗牌
    const newDeckCards = [...player.deck, ...actionsInDiscard];
    const shuffled = ctx.random.shuffle([...newDeckCards]);
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

/** 克苏鲁的馈赠 onPlay：从牌库顶展示直到找到2张行动卡，放入手牌，其余放牌库底 */
function cthulhuFhtagn(ctx: AbilityContext): AbilityResult {
    const player = ctx.state.players[ctx.playerId];
    if (player.deck.length === 0) return { events: [] };

    const events: SmashUpEvent[] = [];
    const foundActions: string[] = [];
    const otherCards: string[] = [];

    // 从牌库顶逐张检查
    for (const card of player.deck) {
        if (card.type === 'action' && foundActions.length < 2) {
            foundActions.push(card.uid);
        } else if (foundActions.length < 2) {
            otherCards.push(card.uid);
        } else {
            // 已找到2张行动卡，剩余保持原序
            break;
        }
    }

    if (foundActions.length === 0) return { events: [] };

    // 行动卡放入手牌（用 CARDS_DRAWN 事件）
    const drawEvt: CardsDrawnEvent = {
        type: SU_EVENTS.CARDS_DRAWN,
        payload: {
            playerId: ctx.playerId,
            count: foundActions.length,
            cardUids: foundActions,
        },
        timestamp: ctx.now,
    };
    events.push(drawEvt);

    // 其余卡放牌库底：重建牌库 = 未翻到的牌 + 其余翻到的非行动卡
    const processedUids = new Set([...foundActions, ...otherCards]);
    const remainingDeck = player.deck.filter(c => !processedUids.has(c.uid));
    // 新牌库 = 剩余未翻到的 + 翻到的非行动卡放底部
    const newDeckUids = [...remainingDeck.map(c => c.uid), ...otherCards];

    if (otherCards.length > 0) {
        const reshuffleEvt: DeckReshuffledEvent = {
            type: SU_EVENTS.DECK_RESHUFFLED,
            payload: {
                playerId: ctx.playerId,
                deckUids: newDeckUids,
            },
            timestamp: ctx.now,
        };
        events.push(reshuffleEvt);
    }

    return { events };
}

// TODO: cthulhu_star_spawn (talent) - 转移疯狂卡（需要 Madness + talent 系统）
// TODO: cthulhu_chosen (special) - 计分前抽疯狂卡+2力量（需要 Madness + beforeScoring）
// TODO: cthulhu_servitor (talent) - 消灭自身+弃牌堆行动放牌库顶（需要 talent + Prompt）
// TODO: cthulhu_altar (ongoing) - 打出随从时额外行动（需要 ongoing 触发系统）
// TODO: cthulhu_complete_the_ritual (ongoing) - 回合开始清场换基地（需要 onTurnStart）
// TODO: cthulhu_furthering_the_cause (ongoing) - 回合结束时条件获VP（需要 onTurnEnd 触发）
// TODO: cthulhu_whispers_in_darkness - 疯狂卡+额外行动（需要 Madness）
// TODO: cthulhu_corruption - 疯狂卡+消灭随从（需要 Madness + Prompt）
// TODO: cthulhu_madness_unleashed - 弃疯狂卡换抽牌+额外行动（需要 Madness）
// TODO: cthulhu_seal_is_broken - 疯狂卡+1VP（需要 Madness）
