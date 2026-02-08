/**
 * 大杀四方 - 诡术师派系能力
 *
 * 主题：陷阱、干扰对手、消灭随从
 */

import { registerAbility } from '../domain/abilityRegistry';
import type { AbilityContext, AbilityResult } from '../domain/abilityRegistry';
import { destroyMinion } from '../domain/abilityHelpers';
import { SU_EVENTS } from '../domain/types';
import type { CardsDiscardedEvent, OngoingDetachedEvent, SmashUpEvent } from '../domain/types';

/** 注册诡术师派系所有能力 */
export function registerTricksterAbilities(): void {
    registerAbility('trickster_gnome', 'onPlay', tricksterGnome);
    // 带走宝物（行动卡）：每个对手随机弃两张手牌
    registerAbility('trickster_take_the_shinies', 'onPlay', tricksterTakeTheShinies);
    // 幻想破碎（行动卡）：消灭一个已打出的行动卡
    registerAbility('trickster_disenchant', 'onPlay', tricksterDisenchant);
}

/** 侏儒 onPlay：消灭力量低于己方随从数量的随从 */
function tricksterGnome(ctx: AbilityContext): AbilityResult {
    const base = ctx.state.bases[ctx.baseIndex];
    if (!base) return { events: [] };
    // 计算己方随从数量（包括刚打出的自己）
    const myMinionCount = base.minions.filter(m => m.controller === ctx.playerId).length + 1;
    const target = base.minions.find(
        m => m.uid !== ctx.cardUid && (m.basePower + m.powerModifier) < myMinionCount
    );
    if (!target) return { events: [] };
    return {
        events: [destroyMinion(target.uid, target.defId, ctx.baseIndex, target.owner, 'trickster_gnome', ctx.now)],
    };
}

/** 带走宝物 onPlay：每个其他玩家随机弃两张手牌 */
function tricksterTakeTheShinies(ctx: AbilityContext): AbilityResult {
    const events: SmashUpEvent[] = [];
    for (const pid of ctx.state.turnOrder) {
        if (pid === ctx.playerId) continue;
        const player = ctx.state.players[pid];
        if (player.hand.length === 0) continue;

        // 随机选择至多2张
        const handCopy = [...player.hand];
        const discardUids: string[] = [];
        const count = Math.min(2, handCopy.length);
        for (let i = 0; i < count; i++) {
            const idx = Math.floor(ctx.random.random() * handCopy.length);
            discardUids.push(handCopy[idx].uid);
            handCopy.splice(idx, 1);
        }

        const evt: CardsDiscardedEvent = {
            type: SU_EVENTS.CARDS_DISCARDED,
            payload: { playerId: pid, cardUids: discardUids },
            timestamp: ctx.now,
        };
        events.push(evt);
    }
    return { events };
}

/** 幻想破碎 onPlay：消灭一个已打出到随从或基地上的行动卡 */
function tricksterDisenchant(ctx: AbilityContext): AbilityResult {
    // MVP：自动选第一个找到的对手持续行动卡
    // 先搜索基地上的持续行动
    for (let i = 0; i < ctx.state.bases.length; i++) {
        const base = ctx.state.bases[i];
        for (const ongoing of base.ongoingActions) {
            if (ongoing.ownerId !== ctx.playerId) {
                const evt: OngoingDetachedEvent = {
                    type: SU_EVENTS.ONGOING_DETACHED,
                    payload: {
                        cardUid: ongoing.uid,
                        defId: ongoing.defId,
                        ownerId: ongoing.ownerId,
                        reason: 'trickster_disenchant',
                    },
                    timestamp: ctx.now,
                };
                return { events: [evt] };
            }
        }
        // 搜索随从上的附着行动
        for (const m of base.minions) {
            for (const attached of m.attachedActions) {
                if (attached.ownerId !== ctx.playerId) {
                    const evt: OngoingDetachedEvent = {
                        type: SU_EVENTS.ONGOING_DETACHED,
                        payload: {
                            cardUid: attached.uid,
                            defId: attached.defId,
                            ownerId: attached.ownerId,
                            reason: 'trickster_disenchant',
                        },
                        timestamp: ctx.now,
                    };
                    return { events: [evt] };
                }
            }
        }
    }
    return { events: [] };
}

// TODO: trickster_leprechaun (ongoing) - 其他玩家打出力量更低的随从时消灭（需要 ongoing 触发）
// TODO: trickster_brownie (ongoing) - 被影响时对手弃两张牌（需要 ongoing 效果系统）
// TODO: trickster_gremlin (ongoing) - 被消灭后抽牌+对手弃牌（需要 onDestroy 触发）
// TODO: trickster_enshrouding_mist (ongoing) - 额外打出随从到此基地（需要 ongoing 效果系统）
// TODO: trickster_hideout (ongoing) - 保护随从不受对手行动影响（需要 ongoing 效果系统）
// TODO: trickster_mark_of_sleep (action) - 对手下回合不能打行动（需要状态标记系统）
// TODO: trickster_flame_trap (ongoing) - 其他玩家打出随从时消灭（需要 ongoing 触发）
// TODO: trickster_block_the_path (ongoing) - 指定派系不能打出到此基地（需要 Prompt + 限制系统）
// TODO: trickster_pay_the_piper (ongoing) - 对手打出随从后弃牌（需要 ongoing 触发）
