/**
 * 大杀四方 - 米斯卡塔尼克大学派系能力
 *
 * 主题：知识/研究、抽牌、行动卡操控
 */

import { registerAbility } from '../domain/abilityRegistry';
import type { AbilityContext, AbilityResult } from '../domain/abilityRegistry';
import { SU_EVENTS } from '../domain/types';
import type { SmashUpEvent, OngoingDetachedEvent } from '../domain/types';

/** 注册米斯卡塔尼克大学派系所有能力 */
export function registerMiskatonicAbilities(): void {
    // 这些多管闲事的小鬼（行动卡）：消灭一个基地上所有行动卡
    registerAbility('miskatonic_those_meddling_kids', 'onPlay', miskatonicThoseMeddlingKids);
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

// TODO: miskatonic_the_librarian (onPlay) - 抽2张或取回2张行动卡（需要 Prompt 选择）
// TODO: miskatonic_professor (onPlay) - 返回力量≤3随从到手牌（需要 Prompt 选目标）
// TODO: miskatonic_fellow (talent) - 抽牌+额外行动（需要 talent 系统）
// TODO: miskatonic_student (special) - 疯狂卡转移（需要 Madness）
// TODO: miskatonic_book_of_iter_the_unseen - 查看手牌+疯狂卡+额外行动（需要 Madness + Prompt）
// TODO: miskatonic_mandatory_reading - 对手抽疯狂卡（需要 Madness）
// TODO: miskatonic_lost_knowledge - 手中有疯狂卡时增益（需要 Madness）
// TODO: miskatonic_thing_on_the_doorstep - 搜索牌库+疯狂卡（需要 Madness + Prompt）
// TODO: miskatonic_psychological_profiling - 抽牌+疯狂卡（需要 Madness）
// TODO: miskatonic_it_might_just_work - 弃疯狂卡消灭随从（需要 Madness + Prompt）
// TODO: miskatonic_field_trip - 手牌放牌库底+抽牌（需要 Prompt 选卡）
