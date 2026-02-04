/**
 * DiceThrone 技能查询工具
 * 
 * 注意：升级卡会在运行时替换玩家的技能定义（player.abilities），
 * 因此所有与技能相关的判定（可用技能/技能效果/不可防御标签等）
 * 都必须以 player.abilities 为准，而不是全局注册表。
 */

import type { PlayerId } from '../../../engine/types';
import type { AbilityDef, AbilityEffect, AbilityTag, AbilityVariantDef } from '../../../systems/presets/combat';
import type { DiceThroneCore } from './types';

export type PlayerAbilityMatch = { ability: AbilityDef; variant?: AbilityVariantDef };

/**
 * 在玩家技能列表中查找技能（支持变体 ID）
 */
export function findPlayerAbility(
    state: DiceThroneCore,
    playerId: PlayerId,
    abilityId: string
): PlayerAbilityMatch | null {
    const player = state.players[playerId];
    if (!player) return null;

    for (const ability of player.abilities) {
        if (ability.variants?.length) {
            const variant = ability.variants.find(v => v.id === abilityId);
            if (variant) return { ability, variant };
        }

        if (ability.id === abilityId) {
            return { ability };
        }
    }

    return null;
}

/**
 * 获取技能效果列表（若是变体 ID，返回变体 effects）
 */
export function getPlayerAbilityEffects(
    state: DiceThroneCore,
    playerId: PlayerId,
    abilityId: string
): AbilityEffect[] {
    const match = findPlayerAbility(state, playerId, abilityId);
    if (!match) return [];
    return match.variant?.effects ?? match.ability.effects ?? [];
}

/**
 * 判断该技能是否包含伤害效果（用于是否进入防御投掷阶段）
 */
export function playerAbilityHasDamage(
    state: DiceThroneCore,
    playerId: PlayerId,
    abilityId: string
): boolean {
    const effects = getPlayerAbilityEffects(state, playerId, abilityId);
    return effects.some(e => e.action?.type === 'damage' && (e.action.value ?? 0) > 0);
}

/**
 * 判断该技能（所属的 AbilityDef）是否包含指定标签
 * 注意：标签目前定义在 AbilityDef 上，而不是 Variant 上。
 */
export function playerAbilityHasTag(
    state: DiceThroneCore,
    playerId: PlayerId,
    abilityId: string,
    tag: AbilityTag
): boolean {
    const match = findPlayerAbility(state, playerId, abilityId);
    return match?.ability.tags?.includes(tag) ?? false;
}
