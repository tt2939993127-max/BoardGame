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
    playerBoardBaseHeightVw: number;
    tipBoardHeightVw: number;
    centerBoardGapVw: number;
};

const V1_ABILITY_SLOT_LAYOUT: AbilitySlotLayoutItem[] = [
    { id: 'fist', x: 0.60, y: 1.62, w: 20.80, h: 38.50 },
    { id: 'chi', x: 23, y: 1.15, w: 20.80, h: 39.65 },
    { id: 'sky', x: 55.50, y: 1.28, w: 20.70, h: 39.11 },
    { id: 'lotus', x: 77.60, y: 1.42, w: 21.10, h: 39.38 },
    { id: 'combo', x: 0.70, y: 42.05, w: 20.70, h: 38.44 },
    { id: 'lightning', x: 22.90, y: 42.40, w: 20.90, h: 38.70 },
    { id: 'calm', x: 55.10, y: 41.75, w: 21.20, h: 39.59 },
    { id: 'meditate', x: 77.80, y: 41.63, w: 20.90, h: 39.53 },
    { id: 'ultimate', x: 0.60, y: 82.89, w: 55, h: 15.60 },
];

// v2 面板来自枪手 / 武士图片裁图坐标，顶部留白显著增加。
const V2_ABILITY_SLOT_LAYOUT: AbilitySlotLayoutItem[] = [
    { id: 'fist', x: 0.73, y: 27.27, w: 15.09, h: 29.23 },
    { id: 'chi', x: 16.84, y: 26.29, w: 14.71, h: 30.99 },
    { id: 'sky', x: 0.87, y: 59.55, w: 14.95, h: 30.36 },
    { id: 'lotus', x: 16.69, y: 59.94, w: 15.44, h: 30.36 },
    { id: 'combo', x: 67.38, y: 26.49, w: 16.02, h: 30.60 },
    { id: 'lightning', x: 83.45, y: 26.68, w: 15.82, h: 30.99 },
    { id: 'calm', x: 67.38, y: 59.94, w: 15.58, h: 30.36 },
    { id: 'meditate', x: 84.02, y: 60.72, w: 15.25, h: 29.58 },
    { id: 'ultimate', x: 33.78, y: 77.39, w: 32.27, h: 12.17 },
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
        playerBoardBaseHeightVw: 35,
        tipBoardHeightVw: 35,
        centerBoardGapVw: 0.5,
    },
    v2: {
        shellTranslateX: 1.1,
        playerBoardTranslateY: -2.85,
        magnifyButtonTop: 1.85,
        playerBoardBaseHeightVw: 35,
        tipBoardHeightVw: 29.6,
        centerBoardGapVw: 0.24,
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
