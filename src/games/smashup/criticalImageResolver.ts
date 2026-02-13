/**
 * SmashUp 关键图片解析器
 *
 * 派系选择阶段只需要卡牌图集，基地图集可以在后台暖加载。
 */

import type { CriticalImageResolver, CriticalImageResolverResult } from '../../core/types';

// ============================================================================
// 图集路径定义
// ============================================================================

/** 卡牌图集图片路径（相对于 /assets/） */
const CARD_ATLAS_PATHS = {
    CARDS1: 'smashup/cards/cards1',
    CARDS2: 'smashup/cards/cards2',
    CARDS3: 'smashup/cards/cards3',
    CARDS4: 'smashup/cards/cards4',
} as const;

/** 基地图集图片路径（暖加载） */
const BASE_ATLAS_PATHS = [
    'smashup/base/base1',
    'smashup/base/base2',
    'smashup/base/base3',
    'smashup/base/base4',
] as const;

/** 所有卡牌图集路径集合 */
const ALL_CARD_ATLAS_SET = new Set(Object.values(CARD_ATLAS_PATHS));

// ============================================================================
// 解析器实现
// ============================================================================

/**
 * SmashUp 关键图片解析器
 *
 * - 关键图片：**所有卡牌图集**（派系选择界面需要立即展示所有派系的卡牌）
 * - 暖图片：基地图集（派系选择阶段不显示基地，可以后台加载）
 */
export const smashUpCriticalImageResolver: CriticalImageResolver = (): CriticalImageResolverResult => {
    return {
        critical: [...ALL_CARD_ATLAS_SET],
        warm: [...BASE_ATLAS_PATHS],
    };
};
