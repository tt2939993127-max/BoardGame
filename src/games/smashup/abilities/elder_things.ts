/**
 * 大杀四方 - 远古之物派系能力
 *
 * 主题：疯狂卡操控、惩罚持有疯狂卡的对�?
 * 克苏鲁扩展派系，核心机制围绕 Madness 牌库�?
 */

import { registerAbility } from '../domain/abilityRegistry';
import type { AbilityContext, AbilityResult } from '../domain/abilityRegistry';
import {
    drawMadnessCards,
    grantExtraAction,
    destroyMinion,
    getMinionPower,
    requestChoice,
    buildMinionTargetOptions,
    addPowerCounter,
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
import { registerTrigger, registerProtection } from '../domain/ongoingEffects';
import type { TriggerContext, ProtectionCheckContext } from '../domain/ongoingEffects';
import type { SmashUpCore, CardToDeckBottomEvent } from '../domain/types';

/** 注册远古之物派系所有能�?*/
export function registerElderThingAbilities(): void {
    // 拜亚�?onPlay：如果其他玩家有随从在本基地，抽一张疯狂卡
    registerAbility('elder_thing_byakhee', 'onPlay', elderThingByakhee);
    // �?�?onPlay：每个对手可抽疯狂卡，不收回抽的让你抽一张牌（MVP：对手全部抽疯狂卡）
    registerAbility('elder_thing_mi_go', 'onPlay', elderThingMiGo);
    // 精神错乱（行动卡）：每个对手抽两张疯狂卡
    registerAbility('elder_thing_insanity', 'onPlay', elderThingInsanity);
    // 疯狂接触（行动卡）：每个对手抽一张疯狂卡，你抽一张牌并额外打出一张行�?
    registerAbility('elder_thing_touch_of_madness', 'onPlay', elderThingTouchOfMadness);
    // 疯狂之力（行动卡）：所有对手弃掉手牌中的疯狂卡并洗弃牌堆回牌库
    registerAbility('elder_thing_power_of_madness', 'onPlay', elderThingPowerOfMadness);
    // 散播恐怖（行动卡）：每位对手随机弃牌直到弃出非疯狂�?
    registerAbility('elder_thing_spreading_horror', 'onPlay', elderThingSpreadingHorror);
    // 开始召唤（行动卡）：弃牌堆随从放牌库顶 + 额外行动
    registerAbility('elder_thing_begin_the_summoning', 'onPlay', elderThingBeginTheSummoning);
    // 深不收回可测的目的（行动卡）：对手展示手牌，有疯狂卡的必须消灭一个随�?
    registerAbility('elder_thing_unfathomable_goals', 'onPlay', elderThingUnfathomableGoals);

    // 远古之物 onPlay：消灭两个己方随从或放牌库底 + 不收回受对手影响
    registerAbility('elder_thing_elder_thing', 'onPlay', elderThingElderThingOnPlay);
    // 修格�?onPlay：对手选择抽疯狂卡或被消灭随从
    registerAbility('elder_thing_shoggoth', 'onPlay', elderThingShoggoth);

    // === ongoing 效果注册 ===
    // 郦威奇恐怖：回合结束时消灭附着了此卡的随从
    registerTrigger('elder_thing_dunwich_horror', 'onTurnEnd', elderThingDunwichHorrorTrigger);
    // 力量的代价：基地计分前按对手疑狂卡数给己方随�?力量
    registerTrigger('elder_thing_the_price_of_power', 'beforeScoring', elderThingPriceOfPowerBeforeScoring);
    // 远古之物：不收回受对手卡牌影响（保护 destroy + move�?
    registerProtection('elder_thing_elder_thing', 'destroy', elderThingProtectionChecker);
    registerProtection('elder_thing_elder_thing', 'move', elderThingProtectionChecker);
}

/** 拜亚�?onPlay：如果其他玩家有随从在本基地，抽一张疯狂卡 */
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

/** �?�?onPlay：每个对手可抽疯狂卡，不收回抽的让你抽一张牌（MVP：对手全部抽疯狂卡） */
function elderThingMiGo(ctx: AbilityContext): AbilityResult {
    const events: SmashUpEvent[] = [];
    for (const pid of ctx.state.turnOrder) {
        if (pid === ctx.playerId) continue;
        const evt = drawMadnessCards(pid, 1, ctx.state, 'elder_thing_mi_go', ctx.now);
        if (evt) {
            events.push(evt);
        } else {
            // 疯狂牌库空了，对手无法抽 �?你抽一张牌
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

/** 精神错乱 onPlay：每个对手抽两张疯狂�?*/
function elderThingInsanity(ctx: AbilityContext): AbilityResult {
    const events: SmashUpEvent[] = [];
    for (const pid of ctx.state.turnOrder) {
        if (pid === ctx.playerId) continue;
        const evt = drawMadnessCards(pid, 2, ctx.state, 'elder_thing_insanity', ctx.now);
        if (evt) events.push(evt);
    }
    return { events };
}

/** 疯狂接触 onPlay：每个对手抽一张疯狂卡，你抽一张牌并额外打出一张行�?*/
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

    // 额外打出一张行�?
    events.push(grantExtraAction(ctx.playerId, 'elder_thing_touch_of_madness', ctx.now));

    return { events };
}

/** 疯狂之力 onPlay：所有对手弃掉手牌中的疯狂卡并洗弃牌堆回牌库 */
function elderThingPowerOfMadness(ctx: AbilityContext): AbilityResult {
    const events: SmashUpEvent[] = [];

    for (const pid of ctx.state.turnOrder) {
        if (pid === ctx.playerId) continue;
        const opponent = ctx.state.players[pid];

        // 找出手牌中的疯狂�?
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

/** 散播恐�?onPlay：每位对手随机弃牌直到弃出一张非疯狂�?*/
function elderThingSpreadingHorror(ctx: AbilityContext): AbilityResult {
    const events: SmashUpEvent[] = [];

    for (const pid of ctx.state.turnOrder) {
        if (pid === ctx.playerId) continue;
        const opponent = ctx.state.players[pid];
        if (opponent.hand.length === 0) continue;

        // 随机排列手牌，依次弃掉直到弃出非疯狂�?
        const shuffledHand = ctx.random.shuffle([...opponent.hand]);
        const discardUids: string[] = [];
        for (const card of shuffledHand) {
            discardUids.push(card.uid);
            if (card.defId !== MADNESS_CARD_DEF_ID) break; // 弃出非疯狂卡，停�?
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

/** 开始召�?onPlay：从弃牌堆选一个随从放牌库�?+ 额外行动 */
function elderThingBeginTheSummoning(ctx: AbilityContext): AbilityResult {
    const events: SmashUpEvent[] = [];
    const player = ctx.state.players[ctx.playerId];
    const minionsInDiscard = player.discard.filter(c => c.type === 'minion');

    if (minionsInDiscard.length === 0) {
        // 没有随从可选，仍给额外行动
        events.push(grantExtraAction(ctx.playerId, 'elder_thing_begin_the_summoning', ctx.now));
        return { events };
    }
    // Prompt 选择
    const options = minionsInDiscard.map((c, i) => {
        const def = getCardDef(c.defId);
        const name = def?.name ?? c.defId;
        return { id: `card-${i}`, label: name, value: { cardUid: c.uid } };
    });
    return {
        events: [requestChoice({
            abilityId: 'elder_thing_begin_the_summoning',
            playerId: ctx.playerId,
            promptConfig: { title: '选择要放到牌库顶的随从', options },
        }, ctx.now)],
    };
}

/** 深不收回可测的目�?onPlay：对手展示手牌，有疯狂卡的必须消灭一个自己的随从 */
function elderThingUnfathomableGoals(ctx: AbilityContext): AbilityResult {
    const events: SmashUpEvent[] = [];

    for (const pid of ctx.state.turnOrder) {
        if (pid === ctx.playerId) continue;
        const opponent = ctx.state.players[pid];
        const hasMadness = opponent.hand.some(c => c.defId === MADNESS_CARD_DEF_ID);
        if (!hasMadness) continue;

        // 收集该对手的所有随�?
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
        // 多个随从：对手应选择（MVP：自动选最弱的，因�?Prompt 目前只支持当前玩家选择�?
        opMinions.sort((a, b) => a.power - b.power);
        events.push(destroyMinion(opMinions[0].uid, opMinions[0].defId, opMinions[0].baseIndex, opMinions[0].owner, 'elder_thing_unfathomable_goals', ctx.now));
    }

    return { events };
}

// ============================================================================
// 远古之物 (Elder Thing) - onPlay + 保护
// ============================================================================

/** 远古之物保护检查：不收回受对手卡牌影响 */
function elderThingProtectionChecker(ctx: ProtectionCheckContext): boolean {
    // 只保�?elder_thing_elder_thing 自身，且只拦截对手发起的效果
    if (ctx.targetMinion.defId !== 'elder_thing_elder_thing') return false;
    return ctx.sourcePlayerId !== ctx.targetMinion.controller;
}

/** 远古之物 onPlay：消灭两个己方其他随从或将本随从放到牌库底�?*/
function elderThingElderThingOnPlay(ctx: AbilityContext): AbilityResult {
    // 收集己方其他随从
    const otherMinions: { uid: string; defId: string; baseIndex: number; owner: string; label: string }[] = [];
    for (let i = 0; i < ctx.state.bases.length; i++) {
        for (const m of ctx.state.bases[i].minions) {
            if (m.controller === ctx.playerId && m.uid !== ctx.cardUid) {
                const def = getCardDef(m.defId) as MinionCardDef | undefined;
                const name = def?.name ?? m.defId;
                const baseDef = getBaseDef(ctx.state.bases[i].defId);
                const baseName = baseDef?.name ?? `基地 ${i + 1}`;
                otherMinions.push({ uid: m.uid, defId: m.defId, baseIndex: i, owner: m.owner, label: `${name} @ ${baseName}` });
            }
        }
    }

    // 不收回足2个其他随从→必须放牌库底
    if (otherMinions.length < 2) {
        const evt: CardToDeckBottomEvent = {
            type: SU_EVENTS.CARD_TO_DECK_BOTTOM,
            payload: { cardUid: ctx.cardUid, defId: ctx.defId, ownerId: ctx.playerId, reason: 'elder_thing_elder_thing' },
            timestamp: ctx.now,
        };
        return { events: [evt] };
    }

    // �?2 个其他随从→ Prompt 选择
    const options = [
        { id: 'destroy', label: '消灭两个己方其他随从', value: { choice: 'destroy' } },
        { id: 'deckbottom', label: '将本随从放到牌库底底', value: { choice: 'deckbottom' } },
    ];
    return {
        events: [requestChoice({
            abilityId: 'elder_thing_elder_thing_choice',
            playerId: ctx.playerId,
            promptConfig: { title: '选择远古之物的效果', options },
                        continuationContext: { cardUid: ctx.cardUid, defId: ctx.defId, baseIndex: ctx.baseIndex, },
        }, ctx.now)],
    };
}

// ============================================================================
// 修格�?(Shoggoth) - onPlay
// ============================================================================

/** 修格�?onPlay：每个对手可抽疯狂卡，不收回抽则消灭该对手在此基地的一个随�?*/
function elderThingShoggoth(ctx: AbilityContext): AbilityResult {
    // 收集需要响应的对手列表
    const opponents = ctx.state.turnOrder.filter(pid => pid !== ctx.playerId);
    if (opponents.length === 0) return { events: [] };

    // 开始第一个对手的 Prompt
    return {
        events: [buildShoggothPromptForOpponent(ctx.state, ctx.playerId, ctx.baseIndex, opponents, 0, ctx.now)],
    };
}

/** 为指定对手构�?Shoggoth Prompt */
function buildShoggothPromptForOpponent(
    state: SmashUpCore,
    ownerId: string,
    baseIndex: number,
    opponents: string[],
    opponentIdx: number,
    now: number,
): SmashUpEvent {
    const targetPid = opponents[opponentIdx];
    const options = [
        { id: 'draw_madness', label: '抽一张疯狂卡', value: { choice: 'draw_madness' } },
        { id: 'decline', label: '拒绝（被消灭一个随从）', value: { choice: 'decline' } },
    ];
    return requestChoice({
        abilityId: 'elder_thing_shoggoth_opponent',
        playerId: ownerId,
        promptConfig: { title: '修格斯：你可以抽一张疯狂卡，否则你在此基地的一个随从将被消灭', options },
                        continuationContext: { targetPlayerId: targetPid,
            baseIndex,
            opponents: opponents,
            opponentIdx, },
    }, now);
}

/** 力量的代�?beforeScoring：对手手牌中的疑狂卡，每张给己方随从+2力量 */
function elderThingPriceOfPowerBeforeScoring(ctx: TriggerContext): SmashUpEvent[] {
    const events: SmashUpEvent[] = [];
    const scoringBaseIndex = ctx.baseIndex;
    if (scoringBaseIndex === undefined) return events;

    const base = ctx.state.bases[scoringBaseIndex];
    if (!base) return events;

    // 查找此基地上�?ongoing 行动�?
    for (const ongoing of base.ongoingActions) {
        if (ongoing.defId !== 'elder_thing_the_price_of_power') continue;
        const ownerId = ongoing.ownerId;

        // 统计有随从在此基地的对手手牌中疑狂卡总数
        let totalMadness = 0;
        for (const pid of ctx.state.turnOrder) {
            if (pid === ownerId) continue;
            if (!base.minions.some(m => m.controller === pid)) continue;
            const opponent = ctx.state.players[pid];
            totalMadness += opponent.hand.filter(c => c.defId === MADNESS_CARD_DEF_ID).length;
        }
        if (totalMadness === 0) continue;

        // 给己方在此基地的随从加力量（轮流分配�?
        const myMinions = base.minions.filter(m => m.controller === ownerId);
        if (myMinions.length === 0) continue;
        for (let i = 0; i < totalMadness; i++) {
            const target = myMinions[i % myMinions.length];
            events.push(addPowerCounter(target.uid, scoringBaseIndex, 2, 'elder_thing_the_price_of_power', ctx.now));
        }
    }
    return events;
}

/** 邓威奇恐怖触发：回合结束时消灭附着了此卡的随从 */
function elderThingDunwichHorrorTrigger(ctx: TriggerContext): SmashUpEvent[] {
    const events: SmashUpEvent[] = [];
    for (let i = 0; i < ctx.state.bases.length; i++) {
        for (const m of ctx.state.bases[i].minions) {
            if (!m.attachedActions.some(a => a.defId === 'elder_thing_dunwich_horror')) continue;
            events.push(destroyMinion(m.uid, m.defId, i, m.owner, 'elder_thing_dunwich_horror', ctx.now));
        }
    }
    return events;
}


// ============================================================================
// Prompt 继续函数
// ============================================================================

/** 注册远古之物派系�?Prompt 继续函数 */
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

    // 远古之物：选择消灭两个随从或放牌库�?
    registerPromptContinuation('elder_thing_elder_thing_choice', (ctx) => {
        const { choice } = ctx.selectedValue as { choice: string };
        const data = ctx.data as { cardUid: string; defId: string; baseIndex: number };

        if (choice === 'deckbottom') {
            // 将本随从放到牌库底�?
            return [{
                type: SU_EVENTS.CARD_TO_DECK_BOTTOM,
                payload: { cardUid: data.cardUid, defId: data.defId, ownerId: ctx.playerId, reason: 'elder_thing_elder_thing' },
                timestamp: ctx.now,
            }];
        }

        // choice === 'destroy' �?Prompt 选择第一个要消灭的随�?
        const myMinions: { uid: string; defId: string; baseIndex: number; label: string }[] = [];
        for (let i = 0; i < ctx.state.bases.length; i++) {
            for (const m of ctx.state.bases[i].minions) {
                if (m.controller === ctx.playerId && m.uid !== data.cardUid) {
                    const def = getCardDef(m.defId) as MinionCardDef | undefined;
                    const name = def?.name ?? m.defId;
                    const baseDef = getBaseDef(ctx.state.bases[i].defId);
                    const baseName = baseDef?.name ?? `基地 ${i + 1}`;
                    myMinions.push({ uid: m.uid, defId: m.defId, baseIndex: i, label: `${name} @ ${baseName}` });
                }
            }
        }
        return [requestChoice({
            abilityId: 'elder_thing_elder_thing_destroy_first',
            playerId: ctx.playerId,
            promptConfig: { title: '选择第一个要消灭的己方随从', options: buildMinionTargetOptions(myMinions) },
                        continuationContext: { elderThingUid: data.cardUid, },
        }, ctx.now)];
    });

    // 远古之物：选择第一个随从后消灭，然后选第二个
    registerPromptContinuation('elder_thing_elder_thing_destroy_first', (ctx) => {
        const { minionUid, baseIndex } = ctx.selectedValue as { minionUid: string; baseIndex: number };
        const data = ctx.data as { elderThingUid: string };
        const base = ctx.state.bases[baseIndex];
        if (!base) return [];
        const target = base.minions.find(m => m.uid === minionUid);
        if (!target) return [];

        const events: SmashUpEvent[] = [destroyMinion(target.uid, target.defId, baseIndex, target.owner, 'elder_thing_elder_thing', ctx.now)];

        // 收集剩余己方随从（排除已消灭的和远古之物自身�?
        const remaining: { uid: string; defId: string; baseIndex: number; label: string }[] = [];
        for (let i = 0; i < ctx.state.bases.length; i++) {
            for (const m of ctx.state.bases[i].minions) {
                if (m.controller === ctx.playerId && m.uid !== minionUid && m.uid !== data.elderThingUid) {
                    const def = getCardDef(m.defId) as MinionCardDef | undefined;
                    const name = def?.name ?? m.defId;
                    const baseDef = getBaseDef(ctx.state.bases[i].defId);
                    const baseName = baseDef?.name ?? `基地 ${i + 1}`;
                    remaining.push({ uid: m.uid, defId: m.defId, baseIndex: i, label: `${name} @ ${baseName}` });
                }
            }
        }
        if (remaining.length === 0) return events;
        if (remaining.length === 1) {
            // 只剩一个，直接消灭
            const r = remaining[0];
            const rm = ctx.state.bases[r.baseIndex]?.minions.find(m => m.uid === r.uid);
            if (rm) events.push(destroyMinion(rm.uid, rm.defId, r.baseIndex, rm.owner, 'elder_thing_elder_thing', ctx.now));
            return events;
        }
        // Prompt 选择第二�?
        events.push(requestChoice({
            abilityId: 'elder_thing_elder_thing_destroy_second',
            playerId: ctx.playerId,
            promptConfig: { title: '选择第二个要消灭的己方随从', options: buildMinionTargetOptions(remaining) },
        }, ctx.now));
        return events;
    });

    // 远古之物：消灭第二个随从
    registerPromptContinuation('elder_thing_elder_thing_destroy_second', (ctx) => {
        const { minionUid, baseIndex } = ctx.selectedValue as { minionUid: string; baseIndex: number };
        const base = ctx.state.bases[baseIndex];
        if (!base) return [];
        const target = base.minions.find(m => m.uid === minionUid);
        if (!target) return [];
        return [destroyMinion(target.uid, target.defId, baseIndex, target.owner, 'elder_thing_elder_thing', ctx.now)];
    });

    // 修格斯：对手选择抽疯狂卡或被消灭随从
    registerPromptContinuation('elder_thing_shoggoth_opponent', (ctx) => {
        const { choice } = ctx.selectedValue as { choice: string };
        const data = ctx.data as { baseIndex: number; opponents: string[]; opponentIdx: number; targetPlayerId: string };
        const targetPid = data.targetPlayerId;
        const events: SmashUpEvent[] = [];

        if (choice === 'draw_madness') {
            // 对手抽一张疯狂卡
            const evt = drawMadnessCards(targetPid, 1, ctx.state, 'elder_thing_shoggoth', ctx.now);
            if (evt) events.push(evt);
        } else {
            // 消灭该对手在此基地的一个随从（MVP：自动选力量最低的�?
            const base = ctx.state.bases[data.baseIndex];
            if (base) {
                const opMinions = base.minions
                    .filter(m => m.controller === targetPid)
                    .sort((a, b) => getMinionPower(ctx.state, a, data.baseIndex) - getMinionPower(ctx.state, b, data.baseIndex));
                if (opMinions.length > 0) {
                    events.push(destroyMinion(opMinions[0].uid, opMinions[0].defId, data.baseIndex, opMinions[0].owner, 'elder_thing_shoggoth', ctx.now));
                }
            }
        }

        // 继续下一个对�?
        const nextIdx = data.opponentIdx + 1;
        if (nextIdx < data.opponents.length) {
            events.push(buildShoggothPromptForOpponent(
                ctx.state, ctx.playerId, data.baseIndex, data.opponents, nextIdx, ctx.now
            ));
        }
        return events;
    });
}
