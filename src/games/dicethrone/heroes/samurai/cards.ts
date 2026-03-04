/**
 * Samurai (武士) 卡牌定义
 * TODO: 等待清晰图片后补充完整的卡牌定义
 */

import type { AbilityCard } from '../../types';
import type { RandomFn } from '../../../../engine/types';

// TODO: 根据 ability-cards.png 补充完整卡牌定义
export const SAMURAI_CARDS: AbilityCard[] = [
    // TODO: 补充卡牌定义
];

/**
 * 获取武士的起始牌库（洗牌后）
 */
export function getSamuraiStartingDeck(random: RandomFn): AbilityCard[] {
    const deck = [...SAMURAI_CARDS];
    return random.shuffle(deck);
}
