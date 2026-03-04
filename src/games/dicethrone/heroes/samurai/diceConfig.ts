/**
 * Samurai 武士骰子定义
 * TODO: 等待清晰图片后补充完整的骰子配置
 */

import type { DiceDefinition } from '../../../../engine/primitives';

// TODO: 添加武士骰子面 ID 到 domain/ids.ts
export const SAMURAI_DICE_FACE_IDS = {
    // TODO: 根据 dice.png 确认骰子面类型
} as const;

/**
 * Samurai 骰子定义
 * 
 * TODO: 根据 dice.png 确认完整的骰面映射
 */
export const samuraiDiceDefinition: DiceDefinition = {
    id: 'samurai-dice',
    name: 'Samurai Dice',
    sides: 6,
    category: 'hero',
    faces: [
        // TODO: 补充完整的 6 个面定义
        { value: 1, symbols: [] },
        { value: 2, symbols: [] },
        { value: 3, symbols: [] },
        { value: 4, symbols: [] },
        { value: 5, symbols: [] },
        { value: 6, symbols: [] },
    ],
    assets: {
        spriteSheet: '/game-data/dicethrone/samurai/dice-sprite.png',
    },
};

export type SamuraiDieFace = typeof SAMURAI_DICE_FACE_IDS[keyof typeof SAMURAI_DICE_FACE_IDS];
