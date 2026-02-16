import type { CSSProperties } from 'react';
import { type SpriteAtlasConfig, computeSpriteStyle, isSpriteAtlasConfig } from '../../../engine/primitives/spriteAtlas';

// 向后兼容类型别名
export type CardAtlasConfig = SpriteAtlasConfig;

/**
 * 加载卡牌图集配置
 * DiceThrone 所有英雄使用统一的图集配置（4行10列），从本地 public/ 加载
 */
export const loadCardAtlasConfig = async (): Promise<CardAtlasConfig> => {
    // 所有英雄共享同一个 atlas 配置文件（与语言无关）
    const commonAtlasPath = `/assets/atlas-configs/dicethrone/ability-cards-common.atlas.json`;

    try {
        const response = await fetch(commonAtlasPath);
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }
        const data: unknown = await response.json();
        if (isSpriteAtlasConfig(data)) {
            console.log('[loadCardAtlasConfig] loaded config:', { imageW: data.imageW, rows: data.rows, cols: data.cols });
            return data;
        }
        throw new Error('Invalid atlas config format');
    } catch (error) {
        console.error('[loadCardAtlasConfig] error:', error);
        throw new Error(`未找到卡牌图集配置: ${commonAtlasPath} (${error})`);
    }
};

export const getCardAtlasStyle = (index: number, atlas: CardAtlasConfig) => {
    return computeSpriteStyle(index, atlas) as CSSProperties;
};
