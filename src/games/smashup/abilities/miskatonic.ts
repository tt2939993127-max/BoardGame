/**
 * 大杀四方 - 米斯卡塔尼克大学派系能力
 *
 * 主题：知识研究、抽牌、行动卡操控
 */

import { registerAbility } from '../domain/abilityRegistry';
import type { AbilityContext, AbilityResult } from '../domain/abilityRegistry';
import { SU_EVENTS, MADNESS_CARD_DEF_ID } from '../domain/types';
import type { SmashUpEvent, OngoingDetachedEvent, CardsDrawnEvent, MinionCardDef } from '../domain/types';
import {
    drawMadnessCards, grantExtraAction, grantExtraMinion,
    returnMadnessCard, destroyMinion,
    getMinionPower, buildMinionTargetOptions,
} from '../domain/abilityHelpers';
import { getCardDef, getBaseDef } from '../data/cards';
import { createSimpleChoice, queueInteraction } from '../../../engine/systems/InteractionSystem';
import { registerInteractionHandler } from '../domain/abilityInteractionHandlers';


/** 这些多管闲事的小鬼 onPlay：消灭一个基地上任意数量的行动卡（MVP：自动选行动卡最多的基地，全部消灭） */
function miskatonicThoseMeddlingKids(ctx: AbilityContext): AbilityResult {
    // 找行动卡最多的基地
    let bestBaseIndex = -1;
    let bestCount = 0;
    for (let i = 0; i < ctx.state.bases.length; i++) {
        const base = ctx.state.bases[i];
        // 统计基地上的持续行动卡 + 随从附着的行动卡
        let actionCount = base.ongoingActions.length;
        for (const m of base.minions) {
            actionCount += m.attachedActions.length;
        }
        if (actionCount > bestCount) {
            bestCount = actionCount;
            bestBaseIndex = i;
        }
    }
    if (bestCount === 0) return { events: [] };

    const events: SmashUpEvent[] = [];
    const base = ctx.state.bases[bestBaseIndex];

    // 消灭基地上的持续行动卡
    for (const ongoing of base.ongoingActions) {
        const evt: OngoingDetachedEvent = {
            type: SU_EVENTS.ONGOING_DETACHED,
            payload: {
                cardUid: ongoing.uid,
                defId: ongoing.defId,
                ownerId: ongoing.ownerId,
                reason: 'miskatonic_those_meddling_kids',
            },
            timestamp: ctx.now,
        };
        events.push(evt);
    }

    // 消灭随从上附着的行动卡
    for (const m of base.minions) {
        for (const attached of m.attachedActions) {
            const evt: OngoingDetachedEvent = {
                type: SU_EVENTS.ONGOING_DETACHED,
                payload: {
                    cardUid: attached.uid,
                    defId: attached.defId,
                    ownerId: attached.ownerId,
                    reason: 'miskatonic_those_meddling_kids',
                },
                timestamp: ctx.now,
            };
            events.push(evt);
        }
    }

    return { events };
}

/** 心理分析 onPlay：抽2张牌 + 抽1张疯狂卡 */
function miskatonicPsychologicalProfiling(ctx: AbilityContext): AbilityResult {
    const events: SmashUpEvent[] = [];
    const player = ctx.state.players[ctx.playerId];
    // 抽2张牌
    const drawCount = Math.min(2, player.deck.length);
    if (drawCount > 0) {
        const drawnUids = player.deck.slice(0, drawCount).map(c => c.uid);
        const drawEvt: CardsDrawnEvent = {
            type: SU_EVENTS.CARDS_DRAWN,
            payload: { playerId: ctx.playerId, count: drawCount, cardUids: drawnUids },
            timestamp: ctx.now,
        };
        events.push(drawEvt);
    }
    // 抽1张疯狂卡
    const madnessEvt = drawMadnessCards(ctx.playerId, 1, ctx.state, 'miskatonic_psychological_profiling', ctx.now);
    if (madnessEvt) events.push(madnessEvt);
    return { events };
}

/** 强制阅读 onPlay：目标对手抽2张疯狂卡 + 你获得1个额外行动（MVP：自动选第一个对手） */
function miskatonicMandatoryReading(ctx: AbilityContext): AbilityResult {
    const events: SmashUpEvent[] = [];
    // 选第一个对手
    const opponent = ctx.state.turnOrder.find(pid => pid !== ctx.playerId);
    if (opponent) {
        const madnessEvt = drawMadnessCards(opponent, 2, ctx.state, 'miskatonic_mandatory_reading', ctx.now);
        if (madnessEvt) events.push(madnessEvt);
    }
    events.push(grantExtraAction(ctx.playerId, 'miskatonic_mandatory_reading', ctx.now));
    return { events };
}

/** 失落的知识 onPlay：手中有≥2张疯狂卡时，抽2张牌 + 额外随从 + 额外行动 */
function miskatonicLostKnowledge(ctx: AbilityContext): AbilityResult {
    const events: SmashUpEvent[] = [];
    const player = ctx.state.players[ctx.playerId];
    // 检查手中疯狂卡数量（注意：打出此行动卡后手牌已减少，但 execute 的 state 是打出前的状态）
    // 在 execute 中 ctx.state 是命令执行前的状态，此时行动卡还在手牌中
    // 所以需要排除当前打出的卡来计算手牌中的疯狂卡
    const madnessInHand = player.hand.filter(c => c.defId === MADNESS_CARD_DEF_ID && c.uid !== ctx.cardUid).length;
    if (madnessInHand < 2) return { events };
    // 抽2张牌
    const drawCount = Math.min(2, player.deck.length);
    if (drawCount > 0) {
        const drawnUids = player.deck.slice(0, drawCount).map(c => c.uid);
        const drawEvt: CardsDrawnEvent = {
            type: SU_EVENTS.CARDS_DRAWN,
            payload: { playerId: ctx.playerId, count: drawCount, cardUids: drawnUids },
            timestamp: ctx.now,
        };
        events.push(drawEvt);
    }
    events.push(grantExtraMinion(ctx.playerId, 'miskatonic_lost_knowledge', ctx.now));
    events.push(grantExtraAction(ctx.playerId, 'miskatonic_lost_knowledge', ctx.now));
    return { events };
}

/**
 * 教授 talent：弃1张疯狂卡 → 额外行动 + 额外随从
 *
 * 官方规则：Discard a Madness card. If you do, you may play an extra action and/or an extra minion.
 */
function miskatonicProfessorTalent(ctx: AbilityContext): AbilityResult {
    const events: SmashUpEvent[] = [];
    const player = ctx.state.players[ctx.playerId];

    // 检查手中是否有疯狂卡
    const madnessCard = player.hand.find(c => c.defId === MADNESS_CARD_DEF_ID);
    if (!madnessCard) return { events: [] };

    // 弃掉疯狂卡（放入弃牌堆，不是返回疯狂牌库）
    events.push({
        type: SU_EVENTS.CARDS_DISCARDED,
        payload: { playerId: ctx.playerId, cardUids: [madnessCard.uid] },
        timestamp: ctx.now,
    } as SmashUpEvent);

    // 额外行动 + 额外随从
    events.push(grantExtraAction(ctx.playerId, 'miskatonic_professor', ctx.now));
    events.push(grantExtraMinion(ctx.playerId, 'miskatonic_professor', ctx.now));

    return { events };
}

/**
 * 图书管理员 talent：弃1张疯狂卡 → 抽1张牌
 *
 * 官方规则：Discard a Madness card. If you do, draw a card.
 */
function miskatonicLibrarianTalent(ctx: AbilityContext): AbilityResult {
    const events: SmashUpEvent[] = [];
    const player = ctx.state.players[ctx.playerId];

    // 检查手中是否有疯狂卡
    const madnessCard = player.hand.find(c => c.defId === MADNESS_CARD_DEF_ID);
    if (!madnessCard) return { events: [] };

    // 弃掉疯狂卡（放入弃牌堆）
    events.push({
        type: SU_EVENTS.CARDS_DISCARDED,
        payload: { playerId: ctx.playerId, cardUids: [madnessCard.uid] },
        timestamp: ctx.now,
    } as SmashUpEvent);

    // 抽1张牌
    if (player.deck.length > 0) {
        const drawnUid = player.deck[0].uid;
        const drawEvt: CardsDrawnEvent = {
            type: SU_EVENTS.CARDS_DRAWN,
            payload: { playerId: ctx.playerId, count: 1, cardUids: [drawnUid] },
            timestamp: ctx.now,
        };
        events.push(drawEvt);
    }

    return { events };
}

/**
 * 心理学家 onPlay：将手牌或弃牌堆中的1张疯狂卡返回疯狂牌库
 *
 * 官方规则：You may return a Madness card from your hand or discard pile to the Madness deck.
 */
function miskatonicPsychologistOnPlay(ctx: AbilityContext): AbilityResult {
    const player = ctx.state.players[ctx.playerId];
    // 优先从手牌中找疯狂卡
    const madnessInHand = player.hand.find(c => c.defId === MADNESS_CARD_DEF_ID && c.uid !== ctx.cardUid);
    if (madnessInHand) {
        return { events: [returnMadnessCard(ctx.playerId, madnessInHand.uid, 'miskatonic_psychologist', ctx.now)] };
    }
    // 其次从弃牌堆中找
    const madnessInDiscard = player.discard.find(c => c.defId === MADNESS_CARD_DEF_ID);
    if (madnessInDiscard) {
        return { events: [returnMadnessCard(ctx.playerId, madnessInDiscard.uid, 'miskatonic_psychologist', ctx.now)] };
    }
    return { events: [] };
}

/**
 * 研究员 onPlay：抽1张疯狂卡
 *
 * 官方规则：You may draw a Madness card.
 */
function miskatonicResearcherOnPlay(ctx: AbilityContext): AbilityResult {
    const madnessEvt = drawMadnessCards(ctx.playerId, 1, ctx.state, 'miskatonic_researcher', ctx.now);
    if (madnessEvt) return { events: [madnessEvt] };
    return { events: [] };
}

// ============================================================================
// Priority 2: 需要 Prompt 的疯狂卡能力
// ============================================================================

/**
 * 也许能行 onPlay：弃2张疯狂卡消灭一个随从
 */
function miskatonicItMightJustWork(ctx: AbilityContext): AbilityResult {
    const player = ctx.state.players[ctx.playerId];
    const madnessInHand = player.hand.filter(
        c => c.defId === MADNESS_CARD_DEF_ID && c.uid !== ctx.cardUid
    );
    if (madnessInHand.length < 2) return { events: [] };

    // 收集所有可消灭的随从
    const allMinions: { uid: string; defId: string; baseIndex: number; owner: string; label: string }[] = [];
    for (let i = 0; i < ctx.state.bases.length; i++) {
        for (const m of ctx.state.bases[i].minions) {
            const def = getCardDef(m.defId) as MinionCardDef | undefined;
            const name = def?.name ?? m.defId;
            const power = getMinionPower(ctx.state, m, i);
            const baseDef = getBaseDef(ctx.state.bases[i].defId);
            const baseName = baseDef?.name ?? `基地 ${i + 1}`;
            allMinions.push({ uid: m.uid, defId: m.defId, baseIndex: i, owner: m.owner, label: `${name} (力量 ${power}) @ ${baseName}` });
        }
    }
    if (allMinions.length === 0) return { events: [] };
    // Prompt 选择
    const options = allMinions.map(t => ({ uid: t.uid, defId: t.defId, baseIndex: t.baseIndex, label: t.label }));
    const interaction = createSimpleChoice(
        `miskatonic_it_might_just_work_${ctx.now}`, ctx.playerId,
        '选择要消灭的随从（弃2张疯狂卡）', buildMinionTargetOptions(options), 'miskatonic_it_might_just_work',
    );
    (interaction.data as any).continuationContext = { madnessUids: [madnessInHand[0].uid, madnessInHand[1].uid] };
    return { events: [], matchState: queueInteraction(ctx.matchState, interaction) };
}

/**
 * 不可见之书 onPlay：查看对手手牌 + 抽1张疯狂卡 + 2个额外行动
 *
 * MVP：查看手牌为信息展示（暂不实现 UI），直接给疯狂卡和额外行动
 */
function miskatonicBookOfIterTheUnseen(ctx: AbilityContext): AbilityResult {
    const events: SmashUpEvent[] = [];
    // 抽1张疯狂卡
    const madnessEvt = drawMadnessCards(ctx.playerId, 1, ctx.state, 'miskatonic_book_of_iter_the_unseen', ctx.now);
    if (madnessEvt) events.push(madnessEvt);
    // 2个额外行动
    events.push(grantExtraAction(ctx.playerId, 'miskatonic_book_of_iter_the_unseen', ctx.now));
    events.push(grantExtraAction(ctx.playerId, 'miskatonic_book_of_iter_the_unseen', ctx.now));
    // 查看对手手牌：收集有手牌的对手
    const opponents: { pid: string; label: string }[] = [];
    for (const pid of ctx.state.turnOrder) {
        if (pid === ctx.playerId) continue;
        const opponent = ctx.state.players[pid];
        if (opponent.hand.length === 0) continue;
        opponents.push({ pid, label: `对手 ${pid}（${opponent.hand.length}张手牌）` });
    }
    if (opponents.length === 1) {
        // 只有一个对手，直接展示
        const target = ctx.state.players[opponents[0].pid];
        const cards = target.hand.map(c => ({ uid: c.uid, defId: c.defId }));
        events.push({
            type: SU_EVENTS.REVEAL_HAND,
            payload: {
                targetPlayerId: opponents[0].pid,
                viewerPlayerId: ctx.playerId,
                cards,
                reason: 'miskatonic_book_of_iter',
            },
            timestamp: ctx.now,
        });
    } else if (opponents.length > 1) {
        // 多个对手，生成选择 Prompt
        const options = opponents.map((o, i) => ({ id: `opp-${i}`, label: o.label, value: { pid: o.pid } }));
        const interaction = createSimpleChoice(
            `miskatonic_book_of_iter_choose_opponent_${ctx.now}`, ctx.playerId,
            '选择一个对手查看其手牌', options as any[], 'miskatonic_book_of_iter_choose_opponent',
        );
        return { events, matchState: queueInteraction(ctx.matchState, interaction) };
    }
    return { events };
}

/**
 * 门口之物 onPlay：搜索牌库找1张卡放入手牌 + 抽1张疯狂卡
 *
 * MVP：自动选牌库中第一张非疯狂卡（不创建 Prompt）
 */
function miskatonicThingOnTheDoorstep(ctx: AbilityContext): AbilityResult {
    const events: SmashUpEvent[] = [];
    const player = ctx.state.players[ctx.playerId];

    // 从牌库中找第一张非疯狂卡
    const targetCard = player.deck.find(c => c.defId !== MADNESS_CARD_DEF_ID);
    if (targetCard) {
        const drawEvt: CardsDrawnEvent = {
            type: SU_EVENTS.CARDS_DRAWN,
            payload: { playerId: ctx.playerId, count: 1, cardUids: [targetCard.uid] },
            timestamp: ctx.now,
        };
        events.push(drawEvt);
    }

    // 抽1张疯狂卡
    const madnessEvt = drawMadnessCards(ctx.playerId, 1, ctx.state, 'miskatonic_thing_on_the_doorstep', ctx.now);
    if (madnessEvt) events.push(madnessEvt);

    return { events };
}

/**
 * 实地考察 onPlay：手牌放牌库底 + 抽等量牌
 * MVP：将所有手牌放牌库底，然后抽等量牌
 */
function miskatonicFieldTrip(ctx: AbilityContext): AbilityResult {
    const player = ctx.state.players[ctx.playerId];
    // 排除刚打出的自己
    const handCards = player.hand.filter(c => c.uid !== ctx.cardUid);
    if (handCards.length === 0) return { events: [] };

    const events: SmashUpEvent[] = [];
    // 手牌放牌库底
    const newDeckUids = [...player.deck.map(c => c.uid), ...handCards.map(c => c.uid)];
    events.push({
        type: SU_EVENTS.HAND_SHUFFLED_INTO_DECK,
        payload: { playerId: ctx.playerId, newDeckUids, reason: 'miskatonic_field_trip' },
        timestamp: ctx.now,
    });
    // 抽等量牌（从新牌库顶部抽取）
    const drawCount = Math.min(handCards.length, newDeckUids.length);
    if (drawCount > 0) {
        const drawnUids = newDeckUids.slice(0, drawCount);
        events.push({
            type: SU_EVENTS.CARDS_DRAWN,
            payload: { playerId: ctx.playerId, count: drawCount, cardUids: drawnUids },
            timestamp: ctx.now,
        } as CardsDrawnEvent);
    }
    return { events };
}

/** 注册米斯卡塔尼克大学派系所有能力（放在所有函数定义之后，避免 Vite SSR 提升失效） */
export function registerMiskatonicAbilities(): void {
    // === 行动卡 ===
    // 这些多管闲事的小鬼：消灭一个基地上所有行动卡
    registerAbility('miskatonic_those_meddling_kids', 'onPlay', miskatonicThoseMeddlingKids);
    // 心理分析：抽2张牌 + 抽1张疯狂卡
    registerAbility('miskatonic_psychological_profiling', 'onPlay', miskatonicPsychologicalProfiling);
    // 强制阅读：目标对手抽2张疯狂卡 + 你获得1个额外行动
    registerAbility('miskatonic_mandatory_reading', 'onPlay', miskatonicMandatoryReading);
    // 失落的知识：手中有≥2张疯狂卡时，抽2张牌 + 额外随从 + 额外行动
    registerAbility('miskatonic_lost_knowledge', 'onPlay', miskatonicLostKnowledge);
    // 也许能行：弃2张疯狂卡消灭一个随从
    registerAbility('miskatonic_it_might_just_work', 'onPlay', miskatonicItMightJustWork);
    // 不可见之书：查看对手手牌 + 抽1张疯狂卡 + 2个额外行动
    registerAbility('miskatonic_book_of_iter_the_unseen', 'onPlay', miskatonicBookOfIterTheUnseen);
    // 门口之物：搜索牌库找1张卡 + 抽1张疯狂卡
    registerAbility('miskatonic_thing_on_the_doorstep', 'onPlay', miskatonicThingOnTheDoorstep);
    // 实地考察：手牌放牌库底 + 抽等量牌
    registerAbility('miskatonic_field_trip', 'onPlay', miskatonicFieldTrip);

    // === 随从 ===
    // 教授（power 5, talent）：弃1张疯狂卡 → 额外行动 + 额外随从
    registerAbility('miskatonic_professor', 'talent', miskatonicProfessorTalent);
    // 图书管理员（power 4, talent）：弃1张疯狂卡 → 抽1张牌
    registerAbility('miskatonic_librarian', 'talent', miskatonicLibrarianTalent);
    // 心理学家（power 3, onPlay）：将手牌或弃牌堆中的1张疯狂卡返回疯狂牌库
    registerAbility('miskatonic_psychologist', 'onPlay', miskatonicPsychologistOnPlay);
    // 研究员（power 2, onPlay）：抽1张疯狂卡
    registerAbility('miskatonic_researcher', 'onPlay', miskatonicResearcherOnPlay);
}

/** 注册米斯卡塔尼克大学的交互解决处理函数 */
export function registerMiskatonicInteractionHandlers(): void {
    // 教授的交互处理器已移除（教授现在是 talent，不需要选择目标）

    registerInteractionHandler('miskatonic_it_might_just_work', (state, playerId, value, iData, _random, timestamp) => {
        const { minionUid, baseIndex } = value as { minionUid: string; baseIndex: number };
        const ctx = (iData as any)?.continuationContext as { madnessUids: string[] };
        if (!ctx) return undefined;
        const base = state.core.bases[baseIndex];
        if (!base) return undefined;
        const target = base.minions.find(m => m.uid === minionUid);
        if (!target) return undefined;
        const events: SmashUpEvent[] = [];
        for (const uid of ctx.madnessUids) {
            events.push(returnMadnessCard(playerId, uid, 'miskatonic_it_might_just_work', timestamp));
        }
        events.push(destroyMinion(target.uid, target.defId, baseIndex, target.owner, 'miskatonic_it_might_just_work', timestamp));
        return { state, events };
    });

    registerInteractionHandler('miskatonic_book_of_iter_choose_opponent', (state, playerId, value, _iData, _random, timestamp) => {
        const { pid } = value as { pid: string };
        const target = state.core.players[pid];
        if (!target || target.hand.length === 0) return { state, events: [] };
        const cards = target.hand.map(c => ({ uid: c.uid, defId: c.defId }));
        return { state, events: [{
            type: SU_EVENTS.REVEAL_HAND,
            payload: {
                targetPlayerId: pid,
                viewerPlayerId: playerId,
                cards,
                reason: 'miskatonic_book_of_iter',
            },
            timestamp,
        }] };
    });
}
