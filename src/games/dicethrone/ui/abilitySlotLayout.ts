/**
 * DiceThrone 技能槽布局（游戏级配置）
 * - 使用百分比坐标，基于玩家面板图片
 * - 所有用户共享一致配置
 */
export interface AbilitySlotLayoutItem {
    id: string;
    x: number;
    y: number;
    w: number;
    h: number;
}

export const DEFAULT_ABILITY_SLOT_LAYOUT: AbilitySlotLayoutItem[] = [
    { id: 'fist', x: 0.60, y: 1.62, w: 20.80, h: 38.50 },
    { id: 'chi', x: 23, y: 1.15, w: 20.80, h: 39.65 },
    { id: 'sky', x: 55.50, y: 1.28, w: 20.70, h: 39.11 },
    { id: 'lotus', x: 77.60, y: 1.42, w: 21.10, h: 39.38 },
    { id: 'combo', x: 0.70, y: 42.05, w: 20.70, h: 38.44 },
    { id: 'lightning', x: 22.90, y: 42.40, w: 20.90, h: 38.70 },
    { id: 'calm', x: 55.10, y: 41.75, w: 21.20, h: 39.59 },
    { id: 'meditate', x: 77.80, y: 41.63, w: 20.90, h: 39.53 },
    { id: 'ultimate', x: 0.10, y: 83.50, w: 55, h: 15.60 },
];
