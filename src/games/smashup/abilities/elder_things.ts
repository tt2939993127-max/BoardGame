/**
 * 大杀四方 - 远古之物派系能力
 *
 * 主题：疯狂卡操控、惩罚持有疯狂卡的对手
 * 克苏鲁扩展派系，核心机制围绕 Madness 牌库。
 */

import { registerAbility } from '../domain/abilityRegistry';
import type { AbilityContext, AbilityResult } from '../domain/abilityRegistry';
import {
    drawMadnessCards,
    grantExtraAction,
    destroyMinion,
    getMinionPower,
    setPromptContinuation,
    buildMinionTargetOptions,
    recoverCardsFromDiscard,
} from '../domain/abilityHelpers';
import { SU_EVENTS, MADNESS_CARD_DEF_ID } from '../domain/types';
import type {
    SmashUpEvent,
    CardsDrawnEvent,
    CardsDiscardedEvent,
    DeckReshuffledEvent,
    MinionCardDef,
} from '../domain/types';
import { drawCards } from '../domain/utils';
import { registerPromptContinuation } from '../domain/promptContinuation';
import { getCardDef, getBaseDef } from '../data/cards';

/** 注册远古之物派系所有能力 */
export function registerElderThingAbilities(): void {
    // 拜亚基 onPlay：如果其他玩家有随从在本基地，抽一张疯狂卡
    registerAbility('elder_thing_byakhee', 'onPlay', elderThingByakhee);
    // 米-格 onPlay：每个对手可抽疯狂卡，不抽的让你抽一张牌（MVP：对手全部抽疯狂卡）
    registerAbility('elder_thing_mi_go', 'onPlay', elderThingMiGo);
    // 精神错乱（行动卡）：每个对手抽两张疯狂卡
    registerAbility('elder_thing_insanity', 'onPlay', elderThingInsanity);
    // 疯狂接触（行动卡）：每个对手抽一张疯狂卡，你抽一张牌并额外打出一张行动
    registerAbility('elder_thing_touch_of_madness', 'onPlay', elderThingTouchOfMadness);
    // 疯狂之力（行动卡）：所有对手弃掉手牌中的疯狂卡并洗弃牌堆回牌库
    registerAbility('elder_thing_power_of_madness', 'onPlay', elderThingPowerOfMadness);
    // 散播恐怖（行动卡）：每位对手随机弃牌直到弃出非疯狂卡
    registerAbility('elder_thing_spreading_horror', 'onPlay', elderThingSpreadingHorror);
    // 开始召唤（行动卡）：弃牌堆随从放牌库顶 + 额外行动
    registerAbility('elder_thing_begin_the_summoning', 'onPlay', elderThingBeginTheSummoning);
    // 深不可测的目的（行动卡）：对手展示手牌，有疯狂卡的必须消灭一个随从
    registerAbility('elder_thing_unfathomable_goals', 'onPlay', elderThingUnfathomableGoals);
}

/** 拜亚基 onPlay：如果其他玩家有随从在本基地，抽一张疯狂卡 */
function elderThingByakhee(ctx: AbilityContext): AbilityResult {
    const base = ctx.state.bases[ctx.baseIndex];
    if (!base) return { events: [] };

    const hasOpponentMinion = base.minions.some(
        m => m.controller !== ctx.playerId && m.uid !== ctx.cardUid
    );
    if (!hasOpponentMinion) return { events: [] };

    const evt = drawMadnessCards(ctx.playerId, 1, ctx.state, 'elder_thing_byakhee', ctx.now);
    return { events: evt ? [evt] : [] };
}

/** 米-格 onPlay：每个对手可抽疯狂卡，不抽的让你抽一张牌（MVP：对手全部抽疯狂卡） */
function elderThingMiGo(ctx: AbilityContext): AbilityResult {
    const events: SmashUpEvent[] = [];
    for (const pid of ctx.state.turnOrder) {
        if (pid === ctx.playerId) continue;
        const evt = drawMadnessCards(pid, 1, ctx.state, 'elder_thing_mi_go', ctx.now);
        if (evt) {
            events.push(evt);
        } else {
            // 疯狂牌库空了，对手无法抽 → 你抽一张牌
            const player = ctx.state.players[ctx.playerId];
            const { drawnUids } = drawCards(player, 1, ctx.random);
            if (drawnUids.length > 0) {
                const drawEvt: CardsDrawnEvent = {
                    type: SU_EVENTS.CARDS_DRAWN,
                    payload: { playerId: ctx.playerId, count: 1, cardUids: drawnUids },
                    timestamp: ctx.now,
                };
                events.push(drawEvt);
            }
        }
    }
    return { events };
}

/** 精神错乱 onPlay：每个对手抽两张疯狂卡 */
function elderThingInsanity(ctx: AbilityContext): AbilityResult {
    const events: SmashUpEvent[] = [];
    for (const pid of ctx.state.turnOrder) {
        if (pid === ctx.playerId) continue;
        const evt = drawMadnessCards(pid, 2, ctx.state, 'elder_thing_insanity', ctx.now);
        if (evt) events.push(evt);
    }
    return { events };
}

/** 疯狂接触 onPlay：每个对手抽一张疯狂卡，你抽一张牌并额外打出一张行动 */
function elderThingTouchOfMadness(ctx: AbilityContext): AbilityResult {
    const events: SmashUpEvent[] = [];

    // 对手各抽一张疯狂卡
    for (const pid of ctx.state.turnOrder) {
        if (pid === ctx.playerId) continue;
        const evt = drawMadnessCards(pid, 1, ctx.state, 'elder_thing_touch_of_madness', ctx.now);
        if (evt) events.push(evt);
    }

    // 你抽一张牌
    const player = ctx.state.players[ctx.playerId];
    const { drawnUids } = drawCards(player, 1, ctx.random);
    if (drawnUids.length > 0) {
        const drawEvt: CardsDrawnEvent = {
            type: SU_EVENTS.CARDS_DRAWN,
            payload: { playerId: ctx.playerId, count: 1, cardUids: drawnUids },
            timestamp: ctx.now,
        };
        events.push(drawEvt);
    }

    // 额外打出一张行动
    events.push(grantExtraAction(ctx.playerId, 'elder_thing_touch_of_madness', ctx.now));

    return { events };
}

/** 疯狂之力 onPlay：所有对手弃掉手牌中的疯狂卡并洗弃牌堆回牌库 */
function elderThingPowerOfMadness(ctx: AbilityContext): AbilityResult {
    const events: SmashUpEvent[] = [];

    for (const pid of ctx.state.turnOrder) {
        if (pid === ctx.playerId) continue;
        const opponent = ctx.state.players[pid];

        // 找出手牌中的疯狂卡
        const madnessInHand = opponent.hand.filter(c => c.defId === MADNESS_CARD_DEF_ID);
        if (madnessInHand.length > 0) {
            const discardEvt: CardsDiscardedEvent = {
                type: SU_EVENTS.CARDS_DISCARDED,
                payload: { playerId: pid, cardUids: madnessInHand.map(c => c.uid) },
                timestamp: ctx.now,
            };
            events.push(discardEvt);
        }

        // 洗弃牌堆回牌库（包括刚弃掉的疯狂卡）
        const allDiscardCards = [...opponent.discard, ...madnessInHand];
        if (allDiscardCards.length > 0) {
            const newDeck = ctx.random.shuffle([...opponent.deck, ...allDiscardCards]);
            const reshuffleEvt: DeckReshuffledEvent = {
                type: SU_EVENTS.DECK_RESHUFFLED,
                payload: { playerId: pid, deckUids: newDeck.map(c => c.uid) },
                timestamp: ctx.now,
            };
            events.push(reshuffleEvt);
        }
    }

    return { events };
}

/** 散播恐怖 onPlay：每位对手随机弃牌直到弃出一张非疯狂卡 */
function elderThingSpreadingHorror(ctx: AbilityContext): AbilityResult {
    const events: SmashUpEvent[] = [];

    for (const pid of ctx.state.turnOrder) {
        if (pid === ctx.playerId) continue;
        const opponent = ctx.state.players[pid];
        if (opponent.hand.length === 0) continue;

        // 随机排列手牌，依次弃掉直到弃出非疯狂卡
        const shuffledHand = ctx.random.shuffle([...opponent.hand]);
        const discardUids: string[] = [];
        for (const card of shuffledHand) {
            discardUids.push(card.uid);
            if (card.defId !== MADNESS_CARD_DEF_ID) break; // 弃出非疯狂卡，停止
        }

        if (discardUids.length > 0) {
            const discardEvt: CardsDiscardedEvent = {
                type: SU_EVENTS.CARDS_DISCARDED,
                payload: { playerId: pid, cardUids: discardUids },
                timestamp: ctx.now,
            };
            events.push(discardEvt);
        }
    }

    return { events };
}

/** 开始召唤 onPlay：从弃牌堆选一个随从放牌库顶 + 额外行动 */
function elderThingBeginTheSummoning(ctx: AbilityContext): AbilityResult {
    const events: SmashUpEvent[] = [];
    const player = ctx.state.players[ctx.playerId];
    const minionsInDiscard = player.discard.filter(c => c.type === 'minion');

    if (minionsInDiscard.length === 0) {
        // 没有随从可选，仍给额外行动
        events.push(grantExtraAction(ctx.playerId, 'elder_thing_begin_the_summoning', ctx.now));
        return { events };
    }
    if (minionsInDiscard.length === 1) {
        const chosen = minionsInDiscard[0];
        const newDeckUids = [chosen.uid, ...player.deck.map(c => c.uid)];
        events.push({ type: SU_EVENTS.DECK_RESHUFFLED, payload: { playerId: ctx.playerId, deckUids: newDeckUids }, timestamp: ctx.now } as DeckReshuffledEvent);
        events.push(grantExtraAction(ctx.playerId, 'elder_thing_begin_the_summoning', ctx.now));
        return { events };
    }
    // 多个随从：Prompt 选择
    const options = minionsInDiscard.map((c, i) => {
        const def = getCardDef(c.defId);
        const name = def?.name ?? c.defId;
        return { id: `card-${i}`, label: name, value: { cardUid: c.uid } };
    });
    return {
        events: [setPromptContinuation({
            abilityId: 'elder_thing_begin_the_summoning',
            playerId: ctx.playerId,
            data: { promptConfig: { title: '选择要放到牌库顶的随从', options } },
        }, ctx.now)],
    };
}

/** 深不可测的目的 onPlay：对手展示手牌，有疯狂卡的必须消灭一个自己的随从 */
function elderThingUnfathomableGoals(ctx: AbilityContext): AbilityResult {
    const events: SmashUpEvent[] = [];

    for (const pid of ctx.state.turnOrder) {
        if (pid === ctx.playerId) continue;
        const opponent = ctx.state.players[pid];
        const hasMadness = opponent.hand.some(c => c.defId === MADNESS_CARD_DEF_ID);
        if (!hasMadness) continue;

        // 收集该对手的所有随从
        const opMinions: { uid: string; defId: string; baseIndex: number; owner: string; power: number }[] = [];
        for (let i = 0; i < ctx.state.bases.length; i++) {
            for (const m of ctx.state.bases[i].minions) {
                if (m.controller !== pid) continue;
                opMinions.push({ uid: m.uid, defId: m.defId, baseIndex: i, owner: m.owner, power: getMinionPower(ctx.state, m, i) });
            }
        }
        if (opMinions.length === 0) continue;
        if (opMinions.length === 1) {
            events.push(destroyMinion(opMinions[0].uid, opMinions[0].defId, opMinions[0].baseIndex, opMinions[0].owner, 'elder_thing_unfathomable_goals', ctx.now));
            continue;
        }
        // 多个随从：对手应选择（MVP：自动选最弱的，因为 Prompt 目前只支持当前玩家选择）
        opMinions.sort((a, b) => a.power - b.power);
        events.push(destroyMinion(opMinions[0].uid, opMinions[0].defId, opMinions[0].baseIndex, opMinions[0].owner, 'elder_thing_unfathomable_goals', ctx.now));
    }

    return { events };
}

// TODO: elder_thing_elder_thing (onPlay) - 消灭两个己方随从或放牌库底 + 不受对手影响（需要 Prompt + ongoing 保护）
// TODO: elder_thing_shoggoth (onPlay) - 限制打出条件 + 对手选择抽疯狂卡或被消灭随从（需要 Prompt 多人选择）
// TODO: elder_thing_dunwich_horror (ongoing) - +5力量但回合结束消灭（需要 ongoing + onTurnEnd 触发）
// TODO: elder_thing_the_price_of_power (special) - 计分前按对手疯狂卡数+力量（需要 beforeScoring 时机）


// ============================================================================
// Prompt 继续函数
// ============================================================================

/** 注册远古之物派系的 Prompt 继续函数 */
export function registerElderThingPromptContinuations(): void {
    // 开始召唤：选择弃牌堆随从后放牌库顶 + 额外行动
    registerPromptContinuation('elder_thing_begin_the_summoning', (ctx) => {
        const { cardUid } = ctx.selectedValue as { cardUid: string };
        const player = ctx.state.players[ctx.playerId];
        const newDeckUids = [cardUid, ...player.deck.map(c => c.uid)];
        return [
            { type: SU_EVENTS.DECK_RESHUFFLED, payload: { playerId: ctx.playerId, deckUids: newDeckUids }, timestamp: ctx.now },
            grantExtraAction(ctx.playerId, 'elder_thing_begin_the_summoning', ctx.now),
        ];
    });
}
