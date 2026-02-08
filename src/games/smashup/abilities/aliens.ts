/**
 * 大杀四方 - 外星人派系能力
 *
 * 主题：干扰对手，将随从送回手牌，额外出牌
 */

import { registerAbility } from '../domain/abilityRegistry';
import type { AbilityContext, AbilityResult } from '../domain/abilityRegistry';
import { SU_EVENTS } from '../domain/types';
import type { MinionReturnedEvent, VpAwardedEvent, SmashUpEvent, CardsDiscardedEvent } from '../domain/types';

/** 注册外星人派系所有能力 */
export function registerAlienAbilities(): void {
    // 外星霸主：将一个随从返回拥有者手牌
    registerAbility('alien_supreme_overlord', 'onPlay', alienSupremeOverlord);
    // 采集者：收回本基地一个力量≤3的对手随从
    registerAbility('alien_collector', 'onPlay', alienCollector);
    // 侵略者：获得1VP
    registerAbility('alien_invader', 'onPlay', alienInvader);
    // 解体（行动卡）：将一个力量≤3的随从放入拥有者手牌
    registerAbility('alien_disintegrate', 'onPlay', alienDisintegrate);
    // 麦田怪圈（行动卡）：将一个基地的所有随从返回手牌
    registerAbility('alien_crop_circles', 'onPlay', alienCropCircles);
    // 射线传递（行动卡）：展示对手随机手牌，可返回牌库顶
    registerAbility('alien_beaming_down', 'onPlay', alienBeamingDown);
}

/** 外星霸主 onPlay：将一个随从返回拥有者手牌（MVP：自动选本基地力量最高的对手随从） */
function alienSupremeOverlord(ctx: AbilityContext): AbilityResult {
    const base = ctx.state.bases[ctx.baseIndex];
    if (!base) return { events: [] };
    // 选本基地力量最高的对手随从
    const targets = base.minions
        .filter(m => m.controller !== ctx.playerId && m.uid !== ctx.cardUid)
        .sort((a, b) => (b.basePower + b.powerModifier) - (a.basePower + a.powerModifier));
    const target = targets[0];
    if (!target) return { events: [] };
    const evt: MinionReturnedEvent = {
        type: SU_EVENTS.MINION_RETURNED,
        payload: {
            minionUid: target.uid,
            minionDefId: target.defId,
            fromBaseIndex: ctx.baseIndex,
            toPlayerId: target.owner,
            reason: 'alien_supreme_overlord',
        },
        timestamp: ctx.now,
    };
    return { events: [evt] };
}

/** 采集者 onPlay：收回本基地一个力量≤3的对手随从 */
function alienCollector(ctx: AbilityContext): AbilityResult {
    const base = ctx.state.bases[ctx.baseIndex];
    if (!base) return { events: [] };
    const target = base.minions.find(
        m => m.controller !== ctx.playerId && (m.basePower + m.powerModifier) <= 3
    );
    if (!target) return { events: [] };
    const evt: MinionReturnedEvent = {
        type: SU_EVENTS.MINION_RETURNED,
        payload: {
            minionUid: target.uid,
            minionDefId: target.defId,
            fromBaseIndex: ctx.baseIndex,
            toPlayerId: target.owner,
            reason: 'alien_collector',
        },
        timestamp: ctx.now,
    };
    return { events: [evt] };
}

/** 侵略者 onPlay：获得1VP */
function alienInvader(ctx: AbilityContext): AbilityResult {
    const evt: VpAwardedEvent = {
        type: SU_EVENTS.VP_AWARDED,
        payload: { playerId: ctx.playerId, amount: 1, reason: 'alien_invader' },
        timestamp: ctx.now,
    };
    return { events: [evt] };
}

/** 解体 onPlay：将一个力量≤3的随从放入拥有者手牌（MVP：自动选第一个对手随从） */
function alienDisintegrate(ctx: AbilityContext): AbilityResult {
    for (let i = 0; i < ctx.state.bases.length; i++) {
        const base = ctx.state.bases[i];
        const target = base.minions.find(
            m => m.controller !== ctx.playerId && (m.basePower + m.powerModifier) <= 3
        );
        if (target) {
            const evt: MinionReturnedEvent = {
                type: SU_EVENTS.MINION_RETURNED,
                payload: {
                    minionUid: target.uid,
                    minionDefId: target.defId,
                    fromBaseIndex: i,
                    toPlayerId: target.owner,
                    reason: 'alien_disintegrate',
                },
                timestamp: ctx.now,
            };
            return { events: [evt] };
        }
    }
    return { events: [] };
}

/** 麦田怪圈 onPlay：将一个基地的所有随从返回手牌（MVP：自动选对手随从最多的基地） */
function alienCropCircles(ctx: AbilityContext): AbilityResult {
    let bestBaseIndex = -1;
    let bestCount = 0;
    for (let i = 0; i < ctx.state.bases.length; i++) {
        const count = ctx.state.bases[i].minions.filter(m => m.controller !== ctx.playerId).length;
        if (count > bestCount) {
            bestCount = count;
            bestBaseIndex = i;
        }
    }
    if (bestBaseIndex === -1) return { events: [] };

    const events: SmashUpEvent[] = [];
    const base = ctx.state.bases[bestBaseIndex];
    // 返回该基地所有随从（包括自己的）
    for (const m of base.minions) {
        const evt: MinionReturnedEvent = {
            type: SU_EVENTS.MINION_RETURNED,
            payload: {
                minionUid: m.uid,
                minionDefId: m.defId,
                fromBaseIndex: bestBaseIndex,
                toPlayerId: m.owner,
                reason: 'alien_crop_circles',
            },
            timestamp: ctx.now,
        };
        events.push(evt);
    }
    return { events };
}

// TODO: alien_scout (onPlay) - 搜索牌库找随从（需要 Prompt）
// TODO: alien_probe (action) - 查看对手手牌和牌库顶（需要 Prompt + 信息展示）
// TODO: alien_terraform (action) - 替换基地（需要 Prompt）
// TODO: alien_scout_ship_1/2 (action) - 展示牌库顶/手牌（信息展示，需要 UI）
// TODO: alien_jammed_signals (ongoing) - 禁止打出卡牌（需要 ongoing 效果系统）

/** 射线传递 onPlay：展示对手随机手牌，可返回牌库顶（MVP：自动弃掉该卡） */
function alienBeamingDown(ctx: AbilityContext): AbilityResult {
    // 找一个有手牌的对手
    for (const pid of ctx.state.turnOrder) {
        if (pid === ctx.playerId) continue;
        const opponent = ctx.state.players[pid];
        if (opponent.hand.length === 0) continue;

        // 随机选一张手牌
        const idx = Math.floor(ctx.random.random() * opponent.hand.length);
        const card = opponent.hand[idx];

        // MVP：将其弃掉（实际应放回牌库顶，需要 CARD_TO_DECK_TOP 事件）
        // TODO: 实现 CARD_TO_DECK_TOP 事件后改为放回牌库顶
        const evt: CardsDiscardedEvent = {
            type: SU_EVENTS.CARDS_DISCARDED,
            payload: { playerId: pid, cardUids: [card.uid] },
            timestamp: ctx.now,
        };
        return { events: [evt] };
    }
    return { events: [] };
}
