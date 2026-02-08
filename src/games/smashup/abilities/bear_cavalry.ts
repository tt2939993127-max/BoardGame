/**
 * 大杀四方 - 黑熊骑兵派系能力
 *
 * 主题：消灭对手最弱随从、移动对手随从
 */

import { registerAbility } from '../domain/abilityRegistry';
import type { AbilityContext, AbilityResult } from '../domain/abilityRegistry';
import { destroyMinion, grantExtraMinion } from '../domain/abilityHelpers';
import type { SmashUpEvent, MinionOnBase } from '../domain/types';

/** 注册黑熊骑兵派系所有能力 */
export function registerBearCavalryAbilities(): void {
    // 黑熊擒抱（行动卡）：每位对手消灭自己最弱随从
    registerAbility('bear_cavalry_bear_hug', 'onPlay', bearCavalryBearHug);
    // 委任（行动卡）：额外打出一个随从
    registerAbility('bear_cavalry_commission', 'onPlay', bearCavalryCommission);
}

/** 黑熊擒抱 onPlay：每位其他玩家消灭自己战斗力最低的随从 */
function bearCavalryBearHug(ctx: AbilityContext): AbilityResult {
    const events: SmashUpEvent[] = [];
    const opponents = ctx.state.turnOrder.filter(pid => pid !== ctx.playerId);

    for (const opId of opponents) {
        // 收集该对手在所有基地上的随从
        let weakest: { minion: MinionOnBase; baseIndex: number } | null = null;
        for (let i = 0; i < ctx.state.bases.length; i++) {
            for (const m of ctx.state.bases[i].minions) {
                if (m.controller !== opId) continue;
                const power = m.basePower + m.powerModifier;
                if (!weakest || power < (weakest.minion.basePower + weakest.minion.powerModifier)) {
                    weakest = { minion: m, baseIndex: i };
                }
            }
        }
        if (weakest) {
            events.push(destroyMinion(
                weakest.minion.uid, weakest.minion.defId,
                weakest.baseIndex, weakest.minion.owner,
                'bear_cavalry_bear_hug', ctx.now
            ));
        }
    }

    return { events };
}

/** 委任 onPlay：额外打出一个随从 */
function bearCavalryCommission(ctx: AbilityContext): AbilityResult {
    return { events: [grantExtraMinion(ctx.playerId, 'bear_cavalry_commission', ctx.now)] };
}

// TODO: bear_cavalry_bear_cavalry (onPlay) - 移动对手随从到另一基地（需要 Prompt 选目标）
// TODO: bear_cavalry_youre_screwed (action) - 移动对手随从（需要 Prompt）
// TODO: bear_cavalry_bear_necessities (action) - 消灭随从或战术（需要 Prompt 选目标）
// TODO: bear_cavalry_youre_pretty_much_borscht (action) - 移动所有对手随从（需要 Prompt）
// TODO: bear_cavalry_bear_rides_you (action) - 移动己方随从（需要 Prompt）
// TODO: bear_cavalry_general_ivan (ongoing) - 己方随从不能被消灭（需要 ongoing 效果系统）
// TODO: bear_cavalry_polar_commando (ongoing) - 唯一随从时+2且不可消灭（需要 ongoing）
// TODO: bear_cavalry_cub_scout (ongoing) - 对手随从移入时消灭弱者（需要 onMinionMoved 触发）
// TODO: bear_cavalry_superiority (ongoing) - 保护己方随从（需要 ongoing 效果系统）
// TODO: bear_cavalry_high_ground (ongoing) - 消灭移入的对手随从（需要 onMinionMoved 触发）
