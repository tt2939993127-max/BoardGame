import { SHADOW_THIEF_DICE_FACE_IDS as FACE } from '../../domain/ids';

/**
 * Shadow Thief 骰子配置
 * 
 * 1, 2: Dagger
 * 3, 4: Bag
 * 5: Card
 * 6: Shadow
 */
export const SHADOW_THIEF_DICE_CONFIG = {
    [FACE.DAGGER]: { symbol: 'dagger', label: '匕首', value: [1, 2] },
    [FACE.BAG]: { symbol: 'bag', label: '背包', value: [3, 4] },
    [FACE.CARD]: { symbol: 'card', label: '卡牌', value: [5] },
    [FACE.SHADOW]: { symbol: 'shadow', label: '暗影', value: [6] },
};

export const SHADOW_THIEF_DICE_SPRITE_SHEET = 'dicethrone:shadow_thief-dice';
