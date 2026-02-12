/**
 * 大杀四方 - 巫师派系能力
 *
 * 主题：抽牌、额外打出行动卡
 */

import { registerAbility } from '../domain/abilityRegistry';
import type { AbilityContext, AbilityResult } from '../domain/abilityRegistry';
import {
    grantExtraAction,
    grantExtraMinion,
    destroyMinion,
    shuffleHandIntoDeck,
    getMinionPower,
    requestChoice,
    buildMinionTargetOptions,
} from '../domain/abilityHelpers';
import { SU_EVENTS } from '../domain/types';
import type { CardsDrawnEvent, SmashUpEvent, DeckReshuffledEvent, MinionCardDef } from '../domain/types';
import { drawCards } from '../domain/utils';
import { registerTrigger } from '../domain/ongoingEffects';
import { registerPromptContinuation } from '../domain/promptContinuation';
import { getCardDef, getBaseDef } from '../data/cards';

/** 时间法师 onPlay：额外打出一个行�?*/
function wizardChronomage(ctx: AbilityContext): AbilityResult {
    return { events: [grantExtraAction(ctx.playerId, 'wizard_chronomage', ctx.now)] };
}

/** 女巫 onPlay：抽一张牌 */
function wizardEnchantress(ctx: AbilityContext): AbilityResult {
    const player = ctx.state.players[ctx.playerId];
    const { drawnUids } = drawCards(player, 1, ctx.random);
    if (drawnUids.length === 0) return { events: [] };
    const evt: CardsDrawnEvent = {
        type: SU_EVENTS.CARDS_DRAWN,
        payload: { playerId: ctx.playerId, count: 1, cardUids: drawnUids },
        timestamp: ctx.now,
    };
    return { events: [evt] };
}

/** 秘术学习 onPlay：抽两张�?*/
function wizardMysticStudies(ctx: AbilityContext): AbilityResult {
    const player = ctx.state.players[ctx.playerId];
    const { drawnUids } = drawCards(player, 2, ctx.random);
    if (drawnUids.length === 0) return { events: [] };
    const evt: CardsDrawnEvent = {
        type: SU_EVENTS.CARDS_DRAWN,
        payload: { playerId: ctx.playerId, count: drawnUids.length, cardUids: drawnUids },
        timestamp: ctx.now,
    };
    return { events: [evt] };
}

/** 召唤 onPlay：额外打出一个随�?*/
function wizardSummon(ctx: AbilityContext): AbilityResult {
    return { events: [grantExtraMinion(ctx.playerId, 'wizard_summon', ctx.now)] };
}

/** 时间圆环 onPlay：额外打出两个行�?*/
function wizardTimeLoop(ctx: AbilityContext): AbilityResult {
    return {
        events: [
            grantExtraAction(ctx.playerId, 'wizard_time_loop', ctx.now),
            grantExtraAction(ctx.playerId, 'wizard_time_loop', ctx.now),
        ],
    };
}

/** 学徒 onPlay：展示牌库顶，如果是行动→Prompt 选择放入手牌或作为额外行动打�?*/
function wizardNeophyte(ctx: AbilityContext): AbilityResult {
    const player = ctx.state.players[ctx.playerId];
    if (player.deck.length === 0) return { events: [] };
    const topCard = player.deck[0];
    if (topCard.type !== 'action') {
        // 不是行动卡，放回牌库顶（无需事件�?
        return { events: [] };
    }
    const def = getCardDef(topCard.defId);
    const cardName = def?.name ?? topCard.defId;
    return {
        events: [requestChoice({
            abilityId: 'wizard_neophyte',
            playerId: ctx.playerId,
            promptConfig: {
                    title: `牌库顶是行动卡�?{cardName}」，选择处理方式`,
                    options: [
                        { id: 'to_hand', label: '放入手牌', value: { action: 'to_hand' } },
                        { id: 'play_extra', label: '作为额外行动打出', value: { action: 'play_extra' } },
                    ],
                },
                        continuationContext: { cardUid: topCard.uid, },
        }, ctx.now)],
    };
}

// wizard_archmage (ongoing) - 每回合额外打出一个行动，通过 onTurnStart 触发器实�?

/** 聚集秘术 onPlay：展示每个对手牌库顶，选择其中一张行动卡作为额外行动打出 */
function wizardMassEnchantment(ctx: AbilityContext): AbilityResult {
    // 收集所有对手牌库顶的行动卡
    const actionCandidates: { uid: string; defId: string; pid: string; label: string }[] = [];
    for (const pid of ctx.state.turnOrder) {
        if (pid === ctx.playerId) continue;
        const opponent = ctx.state.players[pid];
        if (opponent.deck.length === 0) continue;
        const topCard = opponent.deck[0];
        if (topCard.type === 'action') {
            const def = getCardDef(topCard.defId);
            const name = def?.name ?? topCard.defId;
            actionCandidates.push({ uid: topCard.uid, defId: topCard.defId, pid, label: `${name}（来自对�?${pid}）` });
        }
    }
    if (actionCandidates.length === 0) return { events: [] };
    const options = actionCandidates.map((c, i) => ({ id: `card-${i}`, label: c.label, value: { cardUid: c.uid, defId: c.defId, pid: c.pid } }));
    return {
        events: [requestChoice({
            abilityId: 'wizard_mass_enchantment',
            playerId: ctx.playerId,
            promptConfig: { title: '选择一张行动卡作为额外行动打出', options },
        }, ctx.now)],
    };
}

/** 注册巫师派系所有能�?*/
export function registerWizardAbilities(): void {
    const abilities: Array<[string, (ctx: AbilityContext) => AbilityResult]> = [
        ['wizard_chronomage', wizardChronomage],
        ['wizard_enchantress', wizardEnchantress],
        ['wizard_mystic_studies', wizardMysticStudies],
        ['wizard_summon', wizardSummon],
        ['wizard_time_loop', wizardTimeLoop],
        ['wizard_neophyte', wizardNeophyte],
        ['wizard_winds_of_change', wizardWindsOfChange],
        ['wizard_sacrifice', wizardSacrifice],
        ['wizard_mass_enchantment', wizardMassEnchantment],
        ['wizard_portal', wizardPortal],
        ['wizard_scry', wizardScry],
    ];

    for (const [id, handler] of abilities) {
        registerAbility(id, 'onPlay', handler);
    }

    // 注册 ongoing 拦截�?
    registerWizardOngoingEffects();
}

/** 传送门 onPlay：展示牌库顶5张，将其中随从放入手牌，其余放牌库底（MVP：自动取所有随从） */
function wizardPortal(ctx: AbilityContext): AbilityResult {
    const player = ctx.state.players[ctx.playerId];
    if (player.deck.length === 0) return { events: [] };

    const events: SmashUpEvent[] = [];
    const topCards = player.deck.slice(0, 5);
    const minions = topCards.filter(c => c.type === 'minion');
    const others = topCards.filter(c => c.type !== 'minion');

    // 随从放入手牌
    if (minions.length > 0) {
        const drawEvt: CardsDrawnEvent = {
            type: SU_EVENTS.CARDS_DRAWN,
            payload: { playerId: ctx.playerId, count: minions.length, cardUids: minions.map(c => c.uid) },
            timestamp: ctx.now,
        };
        events.push(drawEvt);
    }

    // 其余放牌库底：重建牌�?= 剩余未翻到的 + 翻到的非随从放底�?
    if (others.length > 0) {
        const processedUids = new Set(topCards.map(c => c.uid));
        const remainingDeck = player.deck.filter(c => !processedUids.has(c.uid));
        const newDeckUids = [...remainingDeck.map(c => c.uid), ...others.map(c => c.uid)];
        const reshuffleEvt: DeckReshuffledEvent = {
            type: SU_EVENTS.DECK_RESHUFFLED,
            payload: { playerId: ctx.playerId, deckUids: newDeckUids },
            timestamp: ctx.now,
        };
        events.push(reshuffleEvt);
    }

    return { events };
}

/** 占卜 onPlay：搜索牌库找一张行动卡放入手牌，然后洗牌库 */
function wizardScry(ctx: AbilityContext): AbilityResult {
    const player = ctx.state.players[ctx.playerId];
    const actionCards = player.deck.filter(c => c.type === 'action');
    if (actionCards.length === 0) return { events: [] };
    const options = actionCards.map((c, i) => {
        const def = getCardDef(c.defId);
        const name = def?.name ?? c.defId;
        return { id: `card-${i}`, label: name, value: { cardUid: c.uid } };
    });
    return {
        events: [requestChoice({
            abilityId: 'wizard_scry',
            playerId: ctx.playerId,
            promptConfig: { title: '选择一张行动卡放入手牌', options },
        }, ctx.now)],
    };
}

/** 变化之风 onPlay：洗手牌回牌库抽5张，额外打出一个行�?*/
function wizardWindsOfChange(ctx: AbilityContext): AbilityResult {
    const player = ctx.state.players[ctx.playerId];
    const events: SmashUpEvent[] = [];

    // 1. 手牌洗入牌库
    // 注意：当前打出的行动卡（ctx.cardUid）会�?ACTION_PLAYED reducer 从手牌移除，
    // 所以这里排除它
    const remainingHand = player.hand.filter(c => c.uid !== ctx.cardUid);
    const allCards = [...remainingHand, ...player.deck];
    const shuffled = ctx.random.shuffle([...allCards]);
    events.push(shuffleHandIntoDeck(
        ctx.playerId,
        shuffled.map(c => c.uid),
        'wizard_winds_of_change',
        ctx.now
    ));

    // 2. �?张牌（基于洗牌后的牌库）
    const drawCount = Math.min(5, shuffled.length);
    if (drawCount > 0) {
        const drawnUids = shuffled.slice(0, drawCount).map(c => c.uid);
        const drawEvt: CardsDrawnEvent = {
            type: SU_EVENTS.CARDS_DRAWN,
            payload: { playerId: ctx.playerId, count: drawCount, cardUids: drawnUids },
            timestamp: ctx.now,
        };
        events.push(drawEvt);
    }

    // 3. 额外打出一个行�?
    events.push(grantExtraAction(ctx.playerId, 'wizard_winds_of_change', ctx.now));

    return { events };
}

/** 献祭 onPlay：选择己方随从→消灭→抽等量力量的�?*/
function wizardSacrifice(ctx: AbilityContext): AbilityResult {
    // 收集己方所有随�?
    const myMinions: { uid: string; defId: string; power: number; baseIndex: number; ownerId: string; label: string }[] = [];
    for (let i = 0; i < ctx.state.bases.length; i++) {
        for (const m of ctx.state.bases[i].minions) {
            if (m.controller !== ctx.playerId) continue;
            const power = getMinionPower(ctx.state, m, i);
            const def = getCardDef(m.defId) as MinionCardDef | undefined;
            const name = def?.name ?? m.defId;
            const baseDef = getBaseDef(ctx.state.bases[i].defId);
            const baseName = baseDef?.name ?? `基地 ${i + 1}`;
            myMinions.push({ uid: m.uid, defId: m.defId, power, baseIndex: i, ownerId: m.owner, label: `${name} (力量 ${power}) @ ${baseName}` });
        }
    }
    if (myMinions.length === 0) return { events: [] };
    const options = myMinions.map(m => ({ uid: m.uid, defId: m.defId, baseIndex: m.baseIndex, label: m.label }));
    return {
        events: [requestChoice({
            abilityId: 'wizard_sacrifice',
            playerId: ctx.playerId,
            promptConfig: { title: '选择要牺牲的随从（抽取等量力量的牌）', options: buildMinionTargetOptions(options) },
        }, ctx.now)],
    };
}

/** 献祭执行：消灭随�?+ 抽牌 */
function executeSacrifice(ctx: AbilityContext, chosen: { uid: string; defId: string; power: number; baseIndex: number; ownerId: string }): AbilityResult {
    const events: SmashUpEvent[] = [];
    events.push(destroyMinion(chosen.uid, chosen.defId, chosen.baseIndex, chosen.ownerId, 'wizard_sacrifice', ctx.now));
    if (chosen.power > 0) {
        const player = ctx.state.players[ctx.playerId];
        const { drawnUids } = drawCards(player, chosen.power, ctx.random);
        if (drawnUids.length > 0) {
            events.push({ type: SU_EVENTS.CARDS_DRAWN, payload: { playerId: ctx.playerId, count: drawnUids.length, cardUids: drawnUids }, timestamp: ctx.now } as CardsDrawnEvent);
        }
    }
    return { events };
}


// ============================================================================
// Ongoing 拦截器注�?
// ============================================================================

/** 注册巫师派系�?ongoing 拦截�?*/
function registerWizardOngoingEffects(): void {
    // 大法师：回合开始时，控制者额外打出一个行�?
    registerTrigger('wizard_archmage', 'onTurnStart', (trigCtx) => {
        // 找到 archmage 的控制�?
        let archmageController: string | undefined;
        for (const base of trigCtx.state.bases) {
            const archmage = base.minions.find(m => m.defId === 'wizard_archmage');
            if (archmage) {
                archmageController = archmage.controller;
                break;
            }
        }
        if (!archmageController) return [];
        // 只在控制者的回合触发
        if (archmageController !== trigCtx.playerId) return [];

        return [{
            type: SU_EVENTS.LIMIT_MODIFIED,
            payload: {
                playerId: archmageController,
                limitType: 'action' as const,
                delta: 1,
                reason: 'wizard_archmage',
            },
            timestamp: trigCtx.now,
        }];
    });
}


// ============================================================================
// Prompt 继续函数
// ============================================================================

/** 注册巫师派系�?Prompt 继续函数 */
export function registerWizardPromptContinuations(): void {
    // 学徒：选择放入手牌 or 作为额外行动打出
    registerPromptContinuation('wizard_neophyte', (ctx) => {
        const { action } = ctx.selectedValue as { action: 'to_hand' | 'play_extra' };
        const data = ctx.data as { cardUid: string };
        const cardUid = data.cardUid;
        if (action === 'to_hand') {
            return [{
                type: SU_EVENTS.CARDS_DRAWN,
                payload: { playerId: ctx.playerId, count: 1, cardUids: [cardUid] },
                timestamp: ctx.now,
            } as SmashUpEvent];
        }
        // play_extra: 放入手牌 + 额外行动
        return [
            { type: SU_EVENTS.CARDS_DRAWN, payload: { playerId: ctx.playerId, count: 1, cardUids: [cardUid] }, timestamp: ctx.now } as SmashUpEvent,
            grantExtraAction(ctx.playerId, 'wizard_neophyte', ctx.now),
        ];
    });

    // 聚集秘术：选择对手行动卡→转移 + 额外行动
    registerPromptContinuation('wizard_mass_enchantment', (ctx) => {
        const { cardUid, defId, pid } = ctx.selectedValue as { cardUid: string; defId: string; pid: string };
        return [
            { type: SU_EVENTS.CARD_TRANSFERRED, payload: { cardUid, defId, fromPlayerId: pid, toPlayerId: ctx.playerId, reason: 'wizard_mass_enchantment' }, timestamp: ctx.now } as SmashUpEvent,
            grantExtraAction(ctx.playerId, 'wizard_mass_enchantment', ctx.now),
        ];
    });

    // 占卜：选择行动卡→放入手牌
    registerPromptContinuation('wizard_scry', (ctx) => {
        const { cardUid } = ctx.selectedValue as { cardUid: string };
        return [{
            type: SU_EVENTS.CARDS_DRAWN,
            payload: { playerId: ctx.playerId, count: 1, cardUids: [cardUid] },
            timestamp: ctx.now,
        } as SmashUpEvent];
    });

    // 献祭：选择随从→消�?+ 抽牌
    registerPromptContinuation('wizard_sacrifice', (ctx) => {
        const { minionUid, baseIndex } = ctx.selectedValue as { minionUid: string; baseIndex: number };
        const base = ctx.state.bases[baseIndex];
        if (!base) return [];
        const minion = base.minions.find(m => m.uid === minionUid);
        if (!minion) return [];
        const power = getMinionPower(ctx.state, minion, baseIndex);
        const events: SmashUpEvent[] = [
            destroyMinion(minion.uid, minion.defId, baseIndex, minion.owner, 'wizard_sacrifice', ctx.now),
        ];
        if (power > 0) {
            const player = ctx.state.players[ctx.playerId];
            const { drawnUids } = drawCards(player, power, ctx.random);
            if (drawnUids.length > 0) {
                events.push({ type: SU_EVENTS.CARDS_DRAWN, payload: { playerId: ctx.playerId, count: drawnUids.length, cardUids: drawnUids }, timestamp: ctx.now } as SmashUpEvent);
            }
        }
        return events;
    });
}
