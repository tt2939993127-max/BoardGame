/**
 * SummonerWars 关键图片解析器
 *
 * 根据游戏阶段和玩家选择的阵营，确定需要预加载的精灵图集。
 *
 * - 派系选择阶段：召唤师 (hero.png) 图集为关键，tip 图片为暖加载（不阻塞）
 * - 确认派系后：已选派系的卡牌 (cards.png) 图集为关键
 */

import type { CriticalImageResolver, CriticalImageResolverResult } from '../../core/types';
import type { SummonerWarsCore, FactionId } from './domain/types';
import type { MatchState } from '../../engine/types';

// ============================================================================
// 阵营 → 图集路径映射
// ============================================================================

/** 阵营目录名（与资源目录一致） */
const FACTION_DIR_MAP: Record<FactionId, string> = {
    necromancer: 'Necromancer',
    trickster: 'Trickster',
    paladin: 'Paladin',
    goblin: 'Goblin',
    frost: 'Frost',
    barbaric: 'Barbaric',
};

/** 所有阵营 ID 列表 */
const ALL_FACTIONS: FactionId[] = ['necromancer', 'trickster', 'paladin', 'goblin', 'frost', 'barbaric'];

/** 获取阵营的 hero 图集路径 */
function getHeroAtlasPath(factionId: FactionId): string {
    const dir = FACTION_DIR_MAP[factionId];
    return `summonerwars/hero/${dir}/hero`;
}

/** 获取阵营的 cards 图集路径 */
function getCardsAtlasPath(factionId: FactionId): string {
    const dir = FACTION_DIR_MAP[factionId];
    return `summonerwars/hero/${dir}/cards`;
}

/** 获取阵营的 tip 图片路径 */
function getTipImagePath(factionId: FactionId): string {
    const dir = FACTION_DIR_MAP[factionId];
    return `summonerwars/hero/${dir}/tip`;
}

/** 通用资源（传送门、骰子、地图、卡背） */
const COMMON_PATHS = {
    portal: 'summonerwars/common/Portal',
    dice: 'summonerwars/common/dice',
    map: 'summonerwars/common/map',
    cardback: 'summonerwars/common/cardback',
} as const;

// ============================================================================
// 解析器实现
// ============================================================================

/**
 * 从对局状态中提取已选阵营（去重）
 */
function extractSelectedFactions(core: SummonerWarsCore): FactionId[] {
    const selected = new Set<FactionId>();

    // 从 selectedFactions 中提取已确认的阵营
    for (const factionId of Object.values(core.selectedFactions)) {
        if (factionId && factionId !== 'unselected') {
            selected.add(factionId as FactionId);
        }
    }

    return [...selected];
}

/**
 * 检查是否处于派系选择阶段
 */
function isInFactionSelectPhase(core: SummonerWarsCore): boolean {
    return core.phase === 'factionSelect';
}

/**
 * SummonerWars 关键图片解析器
 *
 * 策略：
 * 1. 派系选择阶段：
 *    - 关键：所有阵营的 hero 图集（选择界面需要展示所有召唤师）
 *    - 暖加载：所有 tip 图片（非阻塞）
 * 2. 确认派系后（游戏进行中）：
 *    - 关键：已选阵营的 cards 图集 + 通用资源（传送门）
 *    - 暖加载：未选阵营的 cards 图集（后台预取）
 */
export const summonerWarsCriticalImageResolver: CriticalImageResolver = (
    gameState: unknown,
): CriticalImageResolverResult => {
    const state = gameState as MatchState<SummonerWarsCore>;
    const core = state?.core;

    // 无状态时，预加载所有 hero 图集（准备进入选择阶段）
    if (!core) {
        const allHeroAtlases = ALL_FACTIONS.map(getHeroAtlasPath);
        const allTipImages = ALL_FACTIONS.map(getTipImagePath);
        return {
            critical: [COMMON_PATHS.map, COMMON_PATHS.cardback, ...allHeroAtlases],
            warm: allTipImages,
        };
    }

    const selectedFactions = extractSelectedFactions(core);
    const inFactionSelect = isInFactionSelectPhase(core);

    if (inFactionSelect) {
        // 派系选择阶段：hero 图集为关键，tip 图片为暖加载
        const allHeroAtlases = ALL_FACTIONS.map(getHeroAtlasPath);
        const allTipImages = ALL_FACTIONS.map(getTipImagePath);

        return {
            critical: [COMMON_PATHS.map, COMMON_PATHS.cardback, ...allHeroAtlases],
            warm: allTipImages,
        };
    }

    // 游戏进行中：已选阵营的 cards 图集为关键
    if (selectedFactions.length === 0) {
        // 异常情况：游戏已开始但无已选阵营，回退到全部预加载
        const allCardsAtlases = ALL_FACTIONS.map(getCardsAtlasPath);
        return {
            critical: [
                COMMON_PATHS.map,
                COMMON_PATHS.cardback,
                COMMON_PATHS.portal,
                COMMON_PATHS.dice,
                ...allCardsAtlases,
            ],
            warm: [],
        };
    }

    // 已选阵营的 cards 图集
    const selectedCardsAtlases = selectedFactions.map(getCardsAtlasPath);
    // 已选阵营的 hero 图集（游戏中也需要显示召唤师）
    const selectedHeroAtlases = selectedFactions.map(getHeroAtlasPath);

    // 未选阵营的 cards 图集放到暖加载
    const unselectedFactions = ALL_FACTIONS.filter(f => !selectedFactions.includes(f));
    const unselectedCardsAtlases = unselectedFactions.map(getCardsAtlasPath);

    return {
        critical: [
            COMMON_PATHS.map,
            COMMON_PATHS.cardback,
            COMMON_PATHS.portal,
            COMMON_PATHS.dice,
            ...selectedHeroAtlases,
            ...selectedCardsAtlases,
        ],
        warm: unselectedCardsAtlases,
    };
};
