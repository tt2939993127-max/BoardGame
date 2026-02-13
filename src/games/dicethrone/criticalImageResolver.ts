/**
 * DiceThrone 关键图片解析器
 *
 * 根据游戏阶段和玩家选择的角色，确定需要预加载的图集。
 *
 * - 角色选择阶段：所有角色的 player-board 为关键（选择界面展示）
 * - 确认角色后：已选角色的卡牌图集和骰子图集为关键
 */

import type { CriticalImageResolver, CriticalImageResolverResult } from '../../core/types';
import type { DiceThroneCore, CharacterId, SelectableCharacterId } from './domain/types';
import type { MatchState } from '../../engine/types';
import { DICETHRONE_CHARACTER_CATALOG } from './domain/types';

// ============================================================================
// 角色 → 图集路径映射
// ============================================================================

/**
 * 角色目录名映射（处理大小写不一致）
 * 部分角色目录为首字母大写（如 Paladin、Common）
 */
const CHARACTER_DIR_MAP: Record<SelectableCharacterId, string> = {
    monk: 'monk',
    barbarian: 'barbarian',
    pyromancer: 'pyromancer',
    shadow_thief: 'shadow_thief',
    moon_elf: 'moon_elf',
    paladin: 'Paladin',
    // 以下角色尚未实现完整资源
    ninja: 'ninja',
    treant: 'treant',
    vampire_lord: 'vampire_lord',
    cursed_pirate: 'cursed_pirate',
    gunslinger: 'gunslinger',
    samurai: 'samurai',
    tactician: 'tactician',
    huntress: 'huntress',
    seraph: 'seraph',
};

/** 已实现完整资源的角色列表 */
const IMPLEMENTED_CHARACTERS: SelectableCharacterId[] = [
    'monk',
    'barbarian',
    'pyromancer',
    'shadow_thief',
    'moon_elf',
    'paladin',
];

/** 获取角色的玩家面板图片路径 */
function getPlayerBoardPath(charId: SelectableCharacterId): string {
    const dir = CHARACTER_DIR_MAP[charId];
    return `dicethrone/images/${dir}/player-board`;
}

/** 获取角色的提示板图片路径 */
function getTipBoardPath(charId: SelectableCharacterId): string {
    const dir = CHARACTER_DIR_MAP[charId];
    return `dicethrone/images/${dir}/tip`;
}

/** 获取角色的卡牌图集路径 */
function getAbilityCardsPath(charId: SelectableCharacterId): string {
    const dir = CHARACTER_DIR_MAP[charId];
    // 特殊处理：monk 使用 monk-base-ability-cards
    if (charId === 'monk') {
        return `dicethrone/images/${dir}/monk-base-ability-cards`;
    }
    return `dicethrone/images/${dir}/ability-cards`;
}

/** 获取角色的骰子图集路径 */
function getDicePath(charId: SelectableCharacterId): string {
    const dir = CHARACTER_DIR_MAP[charId];
    return `dicethrone/images/${dir}/dice`;
}

/** 获取角色的状态图标图集路径 */
function getStatusIconsPath(charId: SelectableCharacterId): string {
    const dir = CHARACTER_DIR_MAP[charId];
    return `dicethrone/images/${dir}/status-icons-atlas`;
}

/** 通用资源路径 */
const COMMON_PATHS = {
    background: 'dicethrone/images/Common/background',
    cardBackground: 'dicethrone/images/Common/card-background',
    characterPortraits: 'dicethrone/images/Common/character-portraits',
} as const;

const COMMON_CRITICAL_PATHS = [
    COMMON_PATHS.background,
    COMMON_PATHS.cardBackground,
    COMMON_PATHS.characterPortraits,
];

// ============================================================================
// 解析器实现
// ============================================================================

/**
 * 从对局状态中提取已选角色（去重）
 */
function extractSelectedCharacters(core: DiceThroneCore): SelectableCharacterId[] {
    const selected = new Set<SelectableCharacterId>();

    for (const charId of Object.values(core.selectedCharacters)) {
        if (charId && charId !== 'unselected') {
            selected.add(charId as SelectableCharacterId);
        }
    }

    return [...selected];
}

/**
 * 检查是否处于角色选择阶段
 */
function isInSetupPhase(core: DiceThroneCore): boolean {
    return !core.hostStarted;
}

/**
 * DiceThrone 关键图片解析器
 *
 * 策略：
 * 1. 角色选择阶段：
 *    - 关键：所有已实现角色的 player-board（选择界面需要展示）
 *    - 暖加载：未选角色的 ability-cards（后台预取）
 * 2. 确认角色后（游戏进行中）：
 *    - 关键：已选角色的 ability-cards + dice + 通用资源
 *    - 暖加载：未选角色的资源（后台预取）
 */
export const diceThroneCriticalImageResolver: CriticalImageResolver = (
    gameState: unknown,
): CriticalImageResolverResult => {
    const state = gameState as MatchState<DiceThroneCore>;
    const core = state?.core;

    // 无状态时，预加载所有角色的 player-board（准备进入选择阶段）
    // 骰子图集为暖加载
    if (!core) {
        const allPlayerBoards = IMPLEMENTED_CHARACTERS.map(getPlayerBoardPath);
        return {
            critical: [...COMMON_CRITICAL_PATHS, ...allPlayerBoards],
            warm: IMPLEMENTED_CHARACTERS.map(getDicePath),
            phaseKey: 'no-state',
        };
    }

    const selectedCharacters = extractSelectedCharacters(core);
    const inSetup = isInSetupPhase(core);

    if (inSetup) {
        // 角色选择阶段：player-board 和 tip-board 为关键（选择界面需要预览）
        // 暖加载：所有角色的 ability-cards / dice / status-icons（后台预取，
        // 确保游戏开始时卡牌图片大概率已缓存）
        const allPlayerBoards = IMPLEMENTED_CHARACTERS.map(getPlayerBoardPath);
        const allTipBoards = IMPLEMENTED_CHARACTERS.map(getTipBoardPath);

        const warmPaths: string[] = [];
        for (const charId of IMPLEMENTED_CHARACTERS) {
            warmPaths.push(getAbilityCardsPath(charId));
            warmPaths.push(getDicePath(charId));
            warmPaths.push(getStatusIconsPath(charId));
        }

        return {
            critical: [...COMMON_CRITICAL_PATHS, ...allPlayerBoards, ...allTipBoards],
            warm: warmPaths,
            phaseKey: 'setup',
        };
    }

    // 游戏进行中：已选角色的资源为关键
    if (selectedCharacters.length === 0) {
        // 异常情况：游戏已开始但无已选角色
        return {
            critical: [...COMMON_CRITICAL_PATHS],
            warm: [],
            phaseKey: 'playing:none',
        };
    }

    // 已选角色的资源
    const criticalPaths: string[] = [...COMMON_CRITICAL_PATHS];

    for (const charId of selectedCharacters) {
        criticalPaths.push(getPlayerBoardPath(charId));
        criticalPaths.push(getTipBoardPath(charId));
        criticalPaths.push(getAbilityCardsPath(charId));
        criticalPaths.push(getStatusIconsPath(charId));
    }

    // 未选角色的资源放到暖加载
    const unselectedCharacters = IMPLEMENTED_CHARACTERS.filter(
        c => !selectedCharacters.includes(c)
    );
    const warmPaths: string[] = [];
    for (const charId of unselectedCharacters) {
        warmPaths.push(getAbilityCardsPath(charId));
        warmPaths.push(getDicePath(charId));
    }

    // phaseKey 包含已选角色，确保对手选角后能重新触发预加载
    const sortedChars = [...selectedCharacters].sort().join(',');
    return {
        critical: criticalPaths,
        warm: warmPaths,
        phaseKey: `playing:${sortedChars}`,
    };
};
