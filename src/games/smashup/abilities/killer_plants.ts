/**
 * 大杀四方 - 食人花派系能力
 *
 * 主题：额外出随从、搜索牌库、力量修正
 */

import { registerAbility } from '../domain/abilityRegistry';
import type { AbilityContext, AbilityResult } from '../domain/abilityRegistry';
import { grantExtraMinion, addPowerCounter } from '../domain/abilityHelpers';
import { SU_EVENTS } from '../domain/types';
import type { SmashUpEvent, PowerCounterRemovedEvent } from '../domain/types';

/** 注册食人花派系所有能力 */
export function registerKillerPlantAbilities(): void {
    // 急速生长（行动卡）：额外打出一个随从
    registerAbility('killer_plant_insta_grow', 'onPlay', killerPlantInstaGrow);
    // 野生食人花（随从）：打出回合-2力量
    registerAbility('killer_plant_weed_eater', 'onPlay', killerPlantWeedEater);
}

/** 急速生长 onPlay：额外打出一个随从 */
function killerPlantInstaGrow(ctx: AbilityContext): AbilityResult {
    return { events: [grantExtraMinion(ctx.playerId, 'killer_plant_insta_grow', ctx.now)] };
}

/** 野生食人花 onPlay：打出回合-2力量（通过 powerModifier 实现） */
function killerPlantWeedEater(ctx: AbilityContext): AbilityResult {
    // 打出时给 -2 力量修正（本回合有效，回合结束时应清除——MVP 先用 powerModifier 实现）
    const evt: PowerCounterRemovedEvent = {
        type: SU_EVENTS.POWER_COUNTER_REMOVED,
        payload: {
            minionUid: ctx.cardUid,
            baseIndex: ctx.baseIndex,
            amount: 2,
            reason: 'killer_plant_weed_eater',
        },
        timestamp: ctx.now,
    };
    return { events: [evt] };
}

// TODO: killer_plant_venus_man_trap (talent) - 搜索牌库打出力量≤2随从（需要 Prompt + 搜索）
// TODO: killer_plant_water_lily (ongoing) - 回合开始抽牌（需要 onTurnStart 触发）
// TODO: killer_plant_sprout (ongoing) - 回合开始消灭自身+搜索打出随从（需要 onTurnStart + 搜索）
// TODO: killer_plant_budding (action) - 搜索同名卡（需要 Prompt 选随从）
// TODO: killer_plant_deep_roots (ongoing) - 保护随从不被移动（需要 ongoing 效果系统）
// TODO: killer_plant_choking_vines (ongoing) - 回合开始消灭随从（需要 onTurnStart 触发）
// TODO: killer_plant_blossom (action) - 打出三个同名额外随从（需要 Prompt 选名字）
// TODO: killer_plant_sleep_spores (ongoing) - 对手随从-1力量（需要 ongoing 力量修正）
// TODO: killer_plant_overgrowth (ongoing) - 降低爆破点（需要 ongoing 效果系统）
// TODO: killer_plant_entangled (ongoing) - 禁止移动+回合开始消灭（需要 ongoing + onTurnStart）
