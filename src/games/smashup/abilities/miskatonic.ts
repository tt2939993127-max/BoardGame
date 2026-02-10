/**
 * 大杀四方 - 米斯卡塔尼克大学派系能力
 *
 * 主题：知识/研究、抽牌、行动卡操控
 */

import { registerAbility } from '../domain/abilityRegistry';
import type { AbilityContext, AbilityResult } from '../domain/abilityRegistry';
import { SU_EVENTS, MADNESS_CARD_DEF_ID } from '../domain/types';
import type { SmashUpEvent, OngoingDetachedEvent, CardsDrawnEvent, MinionReturnedEvent, MinionCardDef } from '../domain/types';
import {
    drawMadnessCards, grantExtraAction, grantExtraMinion,
    returnMadnessCard, destroyMinion, recoverCardsFromDiscard,
    getMinionPower, setPromptContinuation, buildMinionTargetOptions,
} from '../domain/abilityHelpers';
import { registerPromptContinuation } from '../domain/promptContinuation';
import { getCardDef, getBaseDef } from '../data/cards';

/** 注册米斯卡塔尼克大学派系所有能力 */
export function registerMiskatonicAbilities(): void {
    // 这些多管闲事的小鬼（行动卡）：消灭一个基地上所有行动卡
    registerAbility('miskatonic_those_meddling_kids', 'onPlay', miskatonicThoseMeddlingKids);
    // 心理分析（行动卡）：抽2张牌 + 抽1张疯狂卡
    registerAbility('miskatonic_psychological_profiling', 'onPlay', miskatonicPsychologicalProfiling);
    // 强制阅读（行动卡）：目标对手抽2张疯狂卡 + 你获得1个额外行动
    registerAbility('miskatonic_mandatory_reading', 'onPlay', miskatonicMandatoryReading);
    // 失落的知识（行动卡）：手中有≥2张疯狂卡时，抽2张牌 + 额外随从 + 额外行动
    registerAbility('miskatonic_lost_knowledge', 'onPlay', miskatonicLostKnowledge);
    // 也许能行（行动卡）：弃2张疯狂卡消灭一个随从
    registerAbility('miskatonic_it_might_just_work', 'onPlay', miskatonicItMightJustWork);
    // 不可见之书（行动卡）：查看对手手牌 + 抽1张疯狂卡 + 2个额外行动
    registerAbility('miskatonic_book_of_iter_the_unseen', 'onPlay', miskatonicBookOfIterTheUnseen);
    // 门口之物（行动卡）：搜索牌库找1张卡 + 抽1张疯狂卡
    registerAbility('miskatonic_thing_on_the_doorstep', 'onPlay', miskatonicThingOnTheDoorstep);
    // 图书管理员（随从 onPlay）：抽2张牌或从弃牌堆取回2张行动卡
    registerAbility('miskatonic_the_librarian', 'onPlay', miskatonicTheLibrarian);
    // 教授（随从 onPlay）：返回本基地力量≤3的随从到手牌
    registerAbility('miskatonic_professor', 'onPlay', miskatonicProfessor);
    // 研究员（随从 talent）：抽1张牌 + 额外行动
    registerAbility('miskatonic_fellow', 'talent', miskatonicFellow);
    // 学生（special）：疯狂卡转移给对手
    registerAbility('miskatonic_student', 'special', miskatonicStudent);
    // 实地考察（行动卡）：手牌放牌库底+抽等量牌
    registerAbility('miskatonic_field_trip', 'onPlay', miskatonicFieldTrip);
}

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
    // 检查手中疯狂卡数量（注意：打出此行动卡后手牌已减少，但 execute 时 state 是打出前的状态）
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
 * 研究员 talent：抽1张牌 + 额外行动
 * 
 * 规则：抽一张牌，本回合可以额外打出一个行动卡。
 */
function miskatonicFellow(ctx: AbilityContext): AbilityResult {
    const events: SmashUpEvent[] = [];
    const player = ctx.state.players[ctx.playerId];

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

    // 额外行动
    events.push(grantExtraAction(ctx.playerId, 'miskatonic_fellow', ctx.now));

    return { events };
}

/**
 * 图书管理员 onPlay：抽2张牌或从弃牌堆取回2张行动卡
 * MVP：优先从弃牌堆取回行动卡（如果有≥2张），否则抽2张牌
 */
function miskatonicTheLibrarian(ctx: AbilityContext): AbilityResult {
    const player = ctx.state.players[ctx.playerId];
    const actionsInDiscard = player.discard.filter(c => c.type === 'action');

    if (actionsInDiscard.length >= 2) {
        // 取回2张行动卡
        return {
            events: [recoverCardsFromDiscard(
                ctx.playerId,
                actionsInDiscard.slice(0, 2).map(c => c.uid),
                'miskatonic_the_librarian',
                ctx.now
            )],
        };
    }

    // 抽2张牌
    const drawCount = Math.min(2, player.deck.length);
    if (drawCount === 0) return { events: [] };
    const drawnUids = player.deck.slice(0, drawCount).map(c => c.uid);
    const drawEvt: CardsDrawnEvent = {
        type: SU_EVENTS.CARDS_DRAWN,
        payload: { playerId: ctx.playerId, count: drawCount, cardUids: drawnUids },
        timestamp: ctx.now,
    };
    return { events: [drawEvt] };
}

/**
 * 教授 onPlay：返回本基地一个力量≤3的随从到手牌
 */
function miskatonicProfessor(ctx: AbilityContext): AbilityResult {
    const base = ctx.state.bases[ctx.baseIndex];
    if (!base) return { events: [] };
    const targets = base.minions.filter(
        m => m.controller !== ctx.playerId && m.uid !== ctx.cardUid && getMinionPower(ctx.state, m, ctx.baseIndex) <= 3
    );
    if (targets.length === 0) return { events: [] };
    if (targets.length === 1) {
        return { events: [{ type: SU_EVENTS.MINION_RETURNED, payload: { minionUid: targets[0].uid, minionDefId: targets[0].defId, fromBaseIndex: ctx.baseIndex, toPlayerId: targets[0].owner, reason: 'miskatonic_professor' }, timestamp: ctx.now } as MinionReturnedEvent] };
    }
    const options = targets.map(t => {
        const def = getCardDef(t.defId) as MinionCardDef | undefined;
        const name = def?.name ?? t.defId;
        const power = getMinionPower(ctx.state, t, ctx.baseIndex);
        return { uid: t.uid, defId: t.defId, baseIndex: ctx.baseIndex, label: `${name} (力量 ${power})` };
    });
    return {
        events: [setPromptContinuation({
            abilityId: 'miskatonic_professor',
            playerId: ctx.playerId,
            data: { promptConfig: { title: '选择要返回手牌的力量≤3的随从', options: buildMinionTargetOptions(options) } },
        }, ctx.now)],
    };
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
    if (allMinions.length === 1) {
        return {
            events: [
                returnMadnessCard(ctx.playerId, madnessInHand[0].uid, 'miskatonic_it_might_just_work', ctx.now),
                returnMadnessCard(ctx.playerId, madnessInHand[1].uid, 'miskatonic_it_might_just_work', ctx.now),
                destroyMinion(allMinions[0].uid, allMinions[0].defId, allMinions[0].baseIndex, allMinions[0].owner, 'miskatonic_it_might_just_work', ctx.now),
            ],
        };
    }
    // 多目标：Prompt 选择
    const options = allMinions.map(t => ({ uid: t.uid, defId: t.defId, baseIndex: t.baseIndex, label: t.label }));
    return {
        events: [setPromptContinuation({
            abilityId: 'miskatonic_it_might_just_work',
            playerId: ctx.playerId,
            data: { madnessUids: [madnessInHand[0].uid, madnessInHand[1].uid], promptConfig: { title: '选择要消灭的随从（弃2张疯狂卡）', options: buildMinionTargetOptions(options) } },
        }, ctx.now)],
    };
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
    // TODO: 查看对手手牌的 UI 展示（需要 REVEAL_HAND 事件 + UI 支持）
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

/** 注册米斯卡塔尼克大学的 Prompt 继续函数 */
export function registerMiskatonicPromptContinuations(): void {
    // 教授：选择目标后返回手牌
    registerPromptContinuation('miskatonic_professor', (ctx) => {
        const { minionUid, baseIndex } = ctx.selectedValue as { minionUid: string; baseIndex: number };
        const base = ctx.state.bases[baseIndex];
        if (!base) return [];
        const target = base.minions.find(m => m.uid === minionUid);
        if (!target) return [];
        return [{
            type: SU_EVENTS.MINION_RETURNED,
            payload: { minionUid: target.uid, minionDefId: target.defId, fromBaseIndex: baseIndex, toPlayerId: target.owner, reason: 'miskatonic_professor' },
            timestamp: ctx.now,
        }];
    });

    // 也许能行：选择目标后弃疯狂卡并消灭
    registerPromptContinuation('miskatonic_it_might_just_work', (ctx) => {
        const { minionUid, baseIndex } = ctx.selectedValue as { minionUid: string; baseIndex: number };
        const data = ctx.data as { madnessUids: string[] };
        const base = ctx.state.bases[baseIndex];
        if (!base) return [];
        const target = base.minions.find(m => m.uid === minionUid);
        if (!target) return [];
        const events: SmashUpEvent[] = [];
        for (const uid of data.madnessUids) {
            events.push(returnMadnessCard(ctx.playerId, uid, 'miskatonic_it_might_just_work', ctx.now));
        }
        events.push(destroyMinion(target.uid, target.defId, baseIndex, target.owner, 'miskatonic_it_might_just_work', ctx.now));
        return events;
    });
}

// ============================================================================
// 新增能力实现
// ============================================================================

/**
 * 学生 special：将一张疯狂卡转移给对手
 * MVP：自动选手中第一张疯狂卡，转移给第一个对手
 */
function miskatonicStudent(ctx: AbilityContext): AbilityResult {
    const player = ctx.state.players[ctx.playerId];
    const madnessCard = player.hand.find(c => c.defId === MADNESS_CARD_DEF_ID);
    if (!madnessCard) return { events: [] };

    const opponent = ctx.state.turnOrder.find(pid => pid !== ctx.playerId);
    if (!opponent) return { events: [] };

    const events: SmashUpEvent[] = [];
    // 返回疯狂卡到疯狂牌库
    events.push(returnMadnessCard(ctx.playerId, madnessCard.uid, 'miskatonic_student', ctx.now));
    // 对手抽1张疯狂卡
    const madnessEvt = drawMadnessCards(opponent, 1, ctx.state, 'miskatonic_student', ctx.now);
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
    // 抽等量牌（从新牌库顶部抽）
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
