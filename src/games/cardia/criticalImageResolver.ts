/**
 * Cardia 关键图片解析器
 *
 * Cardia 游戏的所有卡牌图片在游戏开始时就需要加载完成，
 * 因为玩家可以随时查看手牌、弃牌堆、场上卡牌的大图。
 */

import type { CriticalImageResolver, CriticalImageResolverResult } from '../../core/types';

/**
 * Cardia 关键图片解析器
 *
 * 所有卡牌图片都作为关键图片预加载，确保游戏过程中不会出现加载延迟。
 */
export const cardiaCriticalImageResolver: CriticalImageResolver = (): CriticalImageResolverResult => {
    const criticalImages: string[] = [];
    
    // 标题和辅助图片
    criticalImages.push('cardia/cards/title');
    criticalImages.push('cardia/cards/helper1');
    criticalImages.push('cardia/cards/helper2');
    
    // Deck I 卡牌（1-16）
    for (let i = 1; i <= 16; i++) {
        criticalImages.push(`cardia/cards/deck1/${i}`);
    }
    
    // Deck II 卡牌（1-16）
    for (let i = 1; i <= 16; i++) {
        criticalImages.push(`cardia/cards/deck2/${i}`);
    }
    
    // 地点卡牌（1-8）
    for (let i = 1; i <= 8; i++) {
        criticalImages.push(`cardia/cards/locations/${i}`);
    }
    
    return {
        critical: criticalImages,
        warm: [],
        phaseKey: 'playing', // Cardia 没有派系选择阶段，直接进入游戏
    };
};
