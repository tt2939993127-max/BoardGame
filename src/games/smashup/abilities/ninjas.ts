/**
 * 大杀四方 - 忍者派系能力
 *
 * 主题：消灭随从、潜入基地
 */

import { registerAbility } from '../domain/abilityRegistry';
import type { AbilityContext, AbilityResult } from '../domain/abilityRegistry';
import { destroyMinion } from '../domain/abilityHelpers';

/** 注册忍者派系所有能力 */
export function registerNinjaAbilities(): void {
    // 忍者大师：消灭本基地一个随从
    registerAbility('ninja_master', 'onPlay', ninjaMaster);
    // 猛虎刺客：消灭本基地一个力量≤3的随从
    registerAbility('ninja_tiger_assassin', 'onPlay', ninjaTigerAssassin);
    // 手里剑（行动卡）：消灭一个力量≤3的随从（任意基地）
    registerAbility('ninja_seeing_stars', 'onPlay', ninjaSeeingStars);
}

/** 忍者大师 onPlay：消灭本基地一个随从（MVP：自动选力量最低的对手随从） */
function ninjaMaster(ctx: AbilityContext): AbilityResult {
    const base = ctx.state.bases[ctx.baseIndex];
    if (!base) return { events: [] };

    const targets = base.minions
        .filter(m => m.uid !== ctx.cardUid)
        .sort((a, b) => (a.basePower + a.powerModifier) - (b.basePower + b.powerModifier));
    const target = targets[0];
    if (!target) return { events: [] };

    return {
        events: [
            destroyMinion(target.uid, target.defId, ctx.baseIndex, target.owner, 'ninja_master', ctx.now),
        ],
    };
}

/** 猛虎刺客 onPlay：消灭本基地一个力量≤3的随从（MVP：自动选第一个） */
function ninjaTigerAssassin(ctx: AbilityContext): AbilityResult {
    const base = ctx.state.bases[ctx.baseIndex];
    if (!base) return { events: [] };

    const target = base.minions.find(
        m => m.uid !== ctx.cardUid && (m.basePower + m.powerModifier) <= 3
    );
    if (!target) return { events: [] };

    return {
        events: [
            destroyMinion(target.uid, target.defId, ctx.baseIndex, target.owner, 'ninja_tiger_assassin', ctx.now),
        ],
    };
}

/** 手里剑 onPlay：消灭一个力量≤3的随从（任意基地，MVP：自动选第一个对手随从） */
function ninjaSeeingStars(ctx: AbilityContext): AbilityResult {
    for (let i = 0; i < ctx.state.bases.length; i++) {
        const base = ctx.state.bases[i];
        const target = base.minions.find(
            m => m.controller !== ctx.playerId && (m.basePower + m.powerModifier) <= 3
        );
        if (target) {
            return {
                events: [
                    destroyMinion(target.uid, target.defId, i, target.owner, 'ninja_seeing_stars', ctx.now),
                ],
            };
        }
    }
    return { events: [] };
}

// TODO: ninja_shinobi (special) - 基地计分前打出到该基地（需要 beforeScoring 时机）
// TODO: ninja_acolyte (special) - 回手并额外打出随从（需要 special 时机）
// TODO: ninja_way_of_deception (action) - 移动自己随从（需要 Prompt）
// TODO: ninja_smoke_bomb (ongoing) - 保护随从不受对手行动影响（需要 ongoing 效果系统）
// TODO: ninja_assassination (ongoing) - 回合结束消灭目标随从（需要 endTurn 触发）
// TODO: ninja_hidden_ninja (special action) - 基地计分前打出随从（需要 beforeScoring 时机）
// TODO: ninja_disguise (action) - 替换随从（需要 Prompt）
// TODO: ninja_infiltrate (ongoing) - 无视基地能力（需要 ongoing 效果系统）
// TODO: ninja_poison (ongoing) - 随从-4力量（需要 ongoing 力量修正系统）
