/**
 * SmashUp 关键图片解析器
 *
 * 根据玩家已选派系，确定需要预加载的卡牌图集图片路径。
 * 基地图集始终为关键资源，卡牌图集按派系动态确定。
 */

import type { CriticalImageResolver, CriticalImageResolverResult } from '../../core/types';
import type { SmashUpCore } from './domain/types';
import type { MatchState } from '../../engine/types';

// ============================================================================
// 派系 → 卡牌图集映射
// ============================================================================

/** 卡牌图集图片路径（相对于 /assets/） */
const CARD_ATLAS_PATHS = {
    CARDS1: 'smashup/cards/cards1',
    CARDS2: 'smashup/cards/cards2',
    CARDS3: 'smashup/cards/cards3',
    CARDS4: 'smashup/cards/cards4',
} as const;

/** 基地图集图片路径（始终为关键资源） */
const BASE_ATLAS_PATHS = [
    'smashup/base/base1',
    'smashup/base/base2',
    'smashup/base/base3',
    'smashup/base/base4',
] as const;

/** 派系 → 所属卡牌图集 */
const FACTION_TO_CARD_ATLAS: Record<string, string> = {
    // CARDS1: 基础版 Part 1
    pirates: CARD_ATLAS_PATHS.CARDS1,
    ninjas: CARD_ATLAS_PATHS.CARDS1,
    aliens: CARD_ATLAS_PATHS.CARDS1,
    dinosaurs: CARD_ATLAS_PATHS.CARDS1,
    // CARDS2: 克苏鲁扩展
    minions_of_cthulhu: CARD_ATLAS_PATHS.CARDS2,
    miskatonic_university: CARD_ATLAS_PATHS.CARDS2,
    elder_things: CARD_ATLAS_PATHS.CARDS2,
    innsmouth: CARD_ATLAS_PATHS.CARDS2,
    madness: CARD_ATLAS_PATHS.CARDS2,
    // CARDS3: Awesome Level 9000
    ghosts: CARD_ATLAS_PATHS.CARDS3,
    bear_cavalry: CARD_ATLAS_PATHS.CARDS3,
    killer_plants: CARD_ATLAS_PATHS.CARDS3,
    steampunks: CARD_ATLAS_PATHS.CARDS3,
    // CARDS4: 基础版 Part 2
    tricksters: CARD_ATLAS_PATHS.CARDS4,
    zombies: CARD_ATLAS_PATHS.CARDS4,
    wizards: CARD_ATLAS_PATHS.CARDS4,
    robots: CARD_ATLAS_PATHS.CARDS4,
};

/** 所有卡牌图集路径集合（用于暖加载） */
const ALL_CARD_ATLAS_SET = new Set(Object.values(CARD_ATLAS_PATHS));

// ============================================================================
// 解析器实现
// ============================================================================

/**
 * 从对局状态中提取所有已选派系
 */
function extractSelectedFactions(core: SmashUpCore): string[] {
    const factions: string[] = [];

    // 优先从玩家已确认的派系中提取
    for (const player of Object.values(core.players)) {
        if (player.factions) {
            factions.push(...player.factions);
        }
    }

    // 回退：从派系选择阶段状态中提取
    if (factions.length === 0 && core.factionSelection) {
        factions.push(...core.factionSelection.takenFactions);
    }

    return factions;
}

/**
 * SmashUp 关键图片解析器
 *
 * - 关键图片：基地图集 + 已选派系对应的卡牌图集
 * - 暖图片：未被选中的其余卡牌图集
 */
export const smashUpCriticalImageResolver: CriticalImageResolver = (
    gameState: unknown,
): CriticalImageResolverResult => {
    const state = gameState as MatchState<SmashUpCore>;
    const core = state?.core;
    if (!core) {
        return { critical: [...BASE_ATLAS_PATHS], warm: [...ALL_CARD_ATLAS_SET] };
    }

    const selectedFactions = extractSelectedFactions(core);

    // 确定需要的卡牌图集（去重）
    const neededAtlases = new Set<string>();
    for (const factionId of selectedFactions) {
        const atlas = FACTION_TO_CARD_ATLAS[factionId];
        if (atlas) neededAtlases.add(atlas);
    }

    // 如果没有选到任何派系（可能还在选择阶段），所有卡牌图集都放到暖加载
    if (neededAtlases.size === 0) {
        return {
            critical: [...BASE_ATLAS_PATHS],
            warm: [...ALL_CARD_ATLAS_SET],
        };
    }

    // 未命中的图集放到暖加载
    const warmAtlases = [...ALL_CARD_ATLAS_SET].filter((a) => !neededAtlases.has(a));

    return {
        critical: [...BASE_ATLAS_PATHS, ...neededAtlases],
        warm: warmAtlases,
    };
};
