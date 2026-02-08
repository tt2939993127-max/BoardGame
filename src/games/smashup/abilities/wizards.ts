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
} from '../domain/abilityHelpers';
import { SU_EVENTS } from '../domain/types';
import type { CardsDrawnEvent, SmashUpEvent } from '../domain/types';
import { drawCards } from '../domain/utils';

/** 注册巫师派系所有能力 */
export function registerWizardAbilities(): void {
    registerAbility('wizard_chronomage', 'onPlay', wizardChronomage);
    registerAbility('wizard_enchantress', 'onPlay', wizardEnchantress);
    registerAbility('wizard_mystic_studies', 'onPlay', wizardMysticStudies);
    registerAbility('wizard_summon', 'onPlay', wizardSummon);
    registerAbility('wizard_time_loop', 'onPlay', wizardTimeLoop);
    registerAbility('wizard_neophyte', 'onPlay', wizardNeophyte);
    // 变化之风：洗手牌回牌库抽5张，额外打出一个行动
    registerAbility('wizard_winds_of_change', 'onPlay', wizardWindsOfChange);
    // 献祭：消灭己方随从，抽等量力量的牌
    registerAbility('wizard_sacrifice', 'onPlay', wizardSacrifice);
}

/** 时间法师 onPlay：额外打出一个行动 */
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

/** 秘术学习 onPlay：抽两张牌 */
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

/** 召唤 onPlay：额外打出一个随从 */
function wizardSummon(ctx: AbilityContext): AbilityResult {
    return { events: [grantExtraMinion(ctx.playerId, 'wizard_summon', ctx.now)] };
}

/** 时间圆环 onPlay：额外打出两个行动 */
function wizardTimeLoop(ctx: AbilityContext): AbilityResult {
    return {
        events: [
            grantExtraAction(ctx.playerId, 'wizard_time_loop', ctx.now),
            grantExtraAction(ctx.playerId, 'wizard_time_loop', ctx.now),
        ],
    };
}

/** 学徒 onPlay：展示牌库顶，如果是行动可放入手牌（MVP：自动放入手牌） */
function wizardNeophyte(ctx: AbilityContext): AbilityResult {
    const player = ctx.state.players[ctx.playerId];
    if (player.deck.length === 0) return { events: [] };
    const topCard = player.deck[0];
    if (topCard.type === 'action') {
        // MVP：自动将行动卡放入手牌（实际应让玩家选择放入手牌或直接打出）
        const evt: CardsDrawnEvent = {
            type: SU_EVENTS.CARDS_DRAWN,
            payload: { playerId: ctx.playerId, count: 1, cardUids: [topCard.uid] },
            timestamp: ctx.now,
        };
        return { events: [evt] };
    }
    // 不是行动卡，放回牌库顶（无需事件）
    return { events: [] };
}

// TODO: wizard_archmage (ongoing) - 每回合额外打出一个行动（需要 ongoing 效果系统）
// TODO: wizard_mass_enchantment (action) - 展示其他玩家牌库顶（需要 Prompt）
// TODO: wizard_portal (action) - 展示牌库顶5张取随从（需要 Prompt）
// TODO: wizard_scry (action) - 搜索牌库找行动（需要 Prompt）

/** 变化之风 onPlay：洗手牌回牌库抽5张，额外打出一个行动 */
function wizardWindsOfChange(ctx: AbilityContext): AbilityResult {
    const player = ctx.state.players[ctx.playerId];
    const events: SmashUpEvent[] = [];

    // 1. 手牌洗入牌库
    // 注意：当前打出的行动卡（ctx.cardUid）会被 ACTION_PLAYED reducer 从手牌移除，
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

    // 2. 抽5张牌（基于洗牌后的牌库）
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

    // 3. 额外打出一个行动
    events.push(grantExtraAction(ctx.playerId, 'wizard_winds_of_change', ctx.now));

    return { events };
}

/** 献祭 onPlay：消灭己方随从，抽等量力量的牌（MVP：自动选力量最低的随从） */
function wizardSacrifice(ctx: AbilityContext): AbilityResult {
    const events: SmashUpEvent[] = [];

    // 找己方所有随从，选力量最低的（MVP 策略：牺牲最弱的）
    let weakest: { uid: string; defId: string; power: number; baseIndex: number; ownerId: string } | undefined;
    for (let i = 0; i < ctx.state.bases.length; i++) {
        for (const m of ctx.state.bases[i].minions) {
            if (m.controller !== ctx.playerId) continue;
            const totalPower = m.basePower + m.powerModifier;
            if (!weakest || totalPower < weakest.power) {
                weakest = { uid: m.uid, defId: m.defId, power: totalPower, baseIndex: i, ownerId: m.owner };
            }
        }
    }
    if (!weakest) return { events: [] };

    // 抽等量力量的牌
    const drawCount = weakest.power;
    if (drawCount > 0) {
        const player = ctx.state.players[ctx.playerId];
        const { drawnUids } = drawCards(player, drawCount, ctx.random);
        if (drawnUids.length > 0) {
            const drawEvt: CardsDrawnEvent = {
                type: SU_EVENTS.CARDS_DRAWN,
                payload: { playerId: ctx.playerId, count: drawnUids.length, cardUids: drawnUids },
                timestamp: ctx.now,
            };
            events.push(drawEvt);
        }
    }

    // 消灭该随从
    events.push(destroyMinion(
        weakest.uid, weakest.defId, weakest.baseIndex, weakest.ownerId,
        'wizard_sacrifice', ctx.now
    ));

    return { events };
}
