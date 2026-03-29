import type { CharacterId } from '../domain/types';

/**
 * DiceThrone 技能槽布局（游戏级配置）
 * - 使用百分比坐标，基于玩家面板图片
 * - 所有角色显式声明使用的布局版本
 */
export interface AbilitySlotLayoutItem {
    id: string;
    x: number;
    y: number;
    w: number;
    h: number;
}

export type DiceThronePlayerBoardLayoutVersion = 'v1' | 'v2';

type PlayerBoardDimensions = {
    width: number;
    height: number;
};

type PlayerBoardUiTuning = {
    shellTranslateX: number;
    playerBoardTranslateY: number;
    magnifyButtonTop: number;
};

const V1_ABILITY_SLOT_LAYOUT: AbilitySlotLayoutItem[] = [
    { id: 'fist', x: 0.60, y: 1.62, w: 20.80, h: 38.50 },
    { id: 'chi', x: 23.00, y: 1.15, w: 20.80, h: 39.65 },
    { id: 'sky', x: 55.50, y: 1.28, w: 20.70, h: 39.11 },
    { id: 'lotus', x: 77.60, y: 1.42, w: 21.10, h: 39.38 },
    { id: 'combo', x: 0.70, y: 42.05, w: 20.70, h: 38.44 },
    { id: 'lightning', x: 22.90, y: 42.40, w: 20.90, h: 38.70 },
    { id: 'calm', x: 55.10, y: 41.75, w: 21.20, h: 39.59 },
    { id: 'meditate', x: 77.80, y: 41.63, w: 20.90, h: 39.53 },
    { id: 'ultimate', x: 0.60, y: 82.89, w: 55.00, h: 15.60 },
];

// v2 面板来自枪手 / 武士图片裁图坐标，顶部留白显著增加。
const V2_ABILITY_SLOT_LAYOUT: AbilitySlotLayoutItem[] = [
    { id: 'fist', x: 0.00, y: 13.60, w: 16.11, h: 38.80 },
    { id: 'chi', x: 16.11, y: 13.60, w: 16.60, h: 38.80 },
    { id: 'sky', x: 0.00, y: 51.15, w: 16.11, h: 39.15 },
    { id: 'lotus', x: 16.11, y: 51.15, w: 16.60, h: 39.15 },
    { id: 'combo', x: 67.38, y: 13.60, w: 16.60, h: 38.80 },
    { id: 'lightning', x: 83.74, y: 13.60, w: 16.26, h: 38.80 },
    { id: 'calm', x: 67.38, y: 51.15, w: 16.60, h: 39.15 },
    { id: 'meditate', x: 83.74, y: 51.15, w: 16.26, h: 39.15 },
    { id: 'ultimate', x: 31.74, y: 70.75, w: 36.62, h: 27.20 },
];

export const DICETHRONE_PLAYER_BOARD_LAYOUTS: Record<DiceThronePlayerBoardLayoutVersion, AbilitySlotLayoutItem[]> = {
    v1: V1_ABILITY_SLOT_LAYOUT,
    v2: V2_ABILITY_SLOT_LAYOUT,
};

export const DEFAULT_ABILITY_SLOT_LAYOUT: AbilitySlotLayoutItem[] = DICETHRONE_PLAYER_BOARD_LAYOUTS.v1;

export const DICETHRONE_PLAYER_BOARD_DIMENSIONS: Record<string, PlayerBoardDimensions> = {
    barbarian: { width: 2048, height: 1675 },
    gunslinger: { width: 2048, height: 1254 },
    monk: { width: 2048, height: 1673 },
    moon_elf: { width: 2048, height: 1670 },
    paladin: { width: 2048, height: 1680 },
    pyromancer: { width: 2048, height: 1674 },
    samurai: { width: 2048, height: 1248 },
    shadow_thief: { width: 2048, height: 1686 },
};

export const DICETHRONE_PLAYER_BOARD_LAYOUT_VERSION_BY_CHARACTER: Record<string, DiceThronePlayerBoardLayoutVersion> = {
    monk: 'v1',
    barbarian: 'v1',
    pyromancer: 'v1',
    moon_elf: 'v1',
    shadow_thief: 'v1',
    paladin: 'v1',
    gunslinger: 'v2',
    samurai: 'v2',
};

const DICETHRONE_PLAYER_BOARD_UI_TUNING: Record<DiceThronePlayerBoardLayoutVersion, PlayerBoardUiTuning> = {
    v1: {
        shellTranslateX: 0,
        playerBoardTranslateY: 0,
        magnifyButtonTop: 0.48,
    },
    v2: {
        shellTranslateX: 1.1,
        playerBoardTranslateY: -1.45,
        magnifyButtonTop: 1.85,
    },
};

export const getPlayerBoardLayoutVersion = (characterId?: string | null): DiceThronePlayerBoardLayoutVersion => (
    DICETHRONE_PLAYER_BOARD_LAYOUT_VERSION_BY_CHARACTER[characterId ?? ''] ?? 'v1'
);

export const getAbilitySlotLayoutByVersion = (version: DiceThronePlayerBoardLayoutVersion): AbilitySlotLayoutItem[] => (
    DICETHRONE_PLAYER_BOARD_LAYOUTS[version]
);

export const getAbilitySlotLayoutForCharacter = (characterId?: CharacterId | string | null): AbilitySlotLayoutItem[] => (
    getAbilitySlotLayoutByVersion(getPlayerBoardLayoutVersion(characterId))
);

export const getPlayerBoardDimensions = (characterId?: CharacterId | string | null): PlayerBoardDimensions => (
    DICETHRONE_PLAYER_BOARD_DIMENSIONS[characterId ?? ''] ?? DICETHRONE_PLAYER_BOARD_DIMENSIONS.monk
);

export const getPlayerBoardAspectRatio = (characterId?: CharacterId | string | null): number => {
    const { width, height } = getPlayerBoardDimensions(characterId);
    return width / height;
};

export const getPlayerBoardUiTuning = (characterId?: CharacterId | string | null): PlayerBoardUiTuning => (
    DICETHRONE_PLAYER_BOARD_UI_TUNING[getPlayerBoardLayoutVersion(characterId)]
);
