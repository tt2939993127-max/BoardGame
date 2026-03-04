/**
 * SummonerWars 关键图片解析器
 *
 * 根据游戏阶段和玩家选择的阵营，确定需要预加载的精灵图集。
 *
 * - 阵营选择阶段（hostStarted=false）：
 *   - critical：hero 图集（选角界面需要展示）+ 地图 + 卡背
 *   - warm：骰子/传送门/tip（选角用不到，后台软加载，进入游戏时已缓存）
 * - 游戏进行中（hostStarted=true）：
 *   - critical：已选阵营 cards + hero + 通用资源（骰子/传送门/地图/卡背）
 *   - warm：未选阵营 cards
 *
 * 注意：阵营选择阶段的判断依据是 hostStarted 而非 phase 字段，
 * 因为初始状态 phase='summon' 但 hostStarted=false 表示仍在选角。
 */

import type { CriticalImageResolver, CriticalImageResolverResult } from '../../core/types';
import type { SummonerWarsCore, FactionId } from './domain/types';
import type { MatchState } from '../../engine/types';

// ============================================================================
// 阵营 → 图集路径映射
// ============================================================================

const FACTION_DIR_MAP: Record<FactionId, string> = {
    necromancer: 'Necromancer',
    trickster: 'Trickster',
    paladin: 'Paladin',
    goblin: 'Goblin',
    frost: 'Frost',
    barbaric: 'Barbaric',
};

const ALL_FACTIONS: FactionId[] = ['necromancer', 'trickster', 'paladin', 'goblin', 'frost', 'barbaric'];

function getHeroAtlasPath(factionId: FactionId): string {
    const dir = FACTION_DIR_MAP[factionId];
    return `summonerwars/hero/${dir}/hero`;
}

function getCardsAtlasPath(factionId: FactionId): string {
    const dir = FACTION_DIR_MAP[factionId];
    return `summonerwars/hero/${dir}/cards`;
}

function getTipImagePath(factionId: FactionId): string {
    const dir = FACTION_DIR_MAP[factionId];
    return `summonerwars/hero/${dir}/tip`;
}

/** 选角界面需要的关键资源（地图背景 + 卡背） */
const SELECTION_CRITICAL = [
    'summonerwars/common/map',
    'summonerwars/common/cardback',
] as const;

/** 游戏中才用到的通用资源（选角阶段暖加载，游戏阶段提升为关键） */
const GAMEPLAY_COMMON = [
    'summonerwars/common/Portal',
    'summonerwars/common/dice',
] as const;

// ============================================================================
// 解析器实现
// ============================================================================

function extractSelectedFactions(core: SummonerWarsCore): FactionId[] {
    const selected = new Set<FactionId>();
    for (const factionId of Object.values(core.selectedFactions)) {
        if (factionId && factionId !== 'unselected') {
            selected.add(factionId as FactionId);
        }
    }
    return [...selected];
}

/**
 * 判断是否处于阵营选择阶段
 * 初始状态 phase='summon' 但 hostStarted=false，此时仍在选角
 */
function isInFactionSelectPhase(core: SummonerWarsCore): boolean {
    return !core.hostStarted;
}

export const summonerWarsCriticalImageResolver: CriticalImageResolver = (
    gameState: unknown,
): CriticalImageResolverResult => {
    const state = gameState as MatchState<SummonerWarsCore>;
    const core = state?.core;

    // 无状态时，预加载选角界面所需资源
    if (!core) {
        const allHeroAtlases = ALL_FACTIONS.map(getHeroAtlasPath);
        const allTipImages = ALL_FACTIONS.map(getTipImagePath);
        return {
            critical: [...SELECTION_CRITICAL, ...allHeroAtlases],
            warm: [...GAMEPLAY_COMMON, ...allTipImages],
            phaseKey: 'init',
        };
    }

    if (isInFactionSelectPhase(core)) {
        // 教程模式下 setup 阶段不预加载全量选角资源：
        // 教程会自动执行 SELECT_FACTION + HOST_START_GAME，用户看不到选角界面，
        // 预加载全部阵营的 hero 图集是浪费。等进入 playing 阶段后按实际选角结果预加载。
        const isTutorial = state.sys?.tutorial?.active === true;
        if (isTutorial) {
            return {
                critical: [...SELECTION_CRITICAL],
                warm: [],
                phaseKey: 'tutorial-setup',
            };
        }

        // 正常选角阶段：hero 图集 + 地图/卡背为关键
        // 骰子/传送门/tip 选角用不到，放 warm 后台软加载
        const allHeroAtlases = ALL_FACTIONS.map(getHeroAtlasPath);
        const allTipImages = ALL_FACTIONS.map(getTipImagePath);

        return {
            critical: [...SELECTION_CRITICAL, ...allHeroAtlases],
            warm: [...GAMEPLAY_COMMON, ...allTipImages],
            phaseKey: 'factionSelect',
        };
    }

    // 游戏进行中：通用资源 + 已选阵营资源全部为关键
    const selectedFactions = extractSelectedFactions(core);

    if (selectedFactions.length === 0) {
        // 异常：游戏已开始但无已选阵营，全量预加载
        const allCardsAtlases = ALL_FACTIONS.map(getCardsAtlasPath);
        const allHeroAtlases = ALL_FACTIONS.map(getHeroAtlasPath);
        return {
            critical: [...SELECTION_CRITICAL, ...GAMEPLAY_COMMON, ...allHeroAtlases, ...allCardsAtlases],
            warm: [],
            phaseKey: 'playing',
        };
    }

    const selectedCardsAtlases = selectedFactions.map(getCardsAtlasPath);
    const selectedHeroAtlases = selectedFactions.map(getHeroAtlasPath);
    const unselectedFactions = ALL_FACTIONS.filter(f => !selectedFactions.includes(f));
    const unselectedCardsAtlases = unselectedFactions.map(getCardsAtlasPath);

    // 教程模式下不 warm 预加载未选阵营：教程阵营固定，未选阵营永远不会出现
    const isTutorial = state.sys?.tutorial?.active === true;

    return {
        critical: [
            ...SELECTION_CRITICAL,
            ...GAMEPLAY_COMMON,
            ...selectedHeroAtlases,
            ...selectedCardsAtlases,
        ],
        warm: isTutorial ? [] : [...unselectedCardsAtlases],
        phaseKey: 'playing',
    };
};
