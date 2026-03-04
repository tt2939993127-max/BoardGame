import type { CSSProperties } from 'react';
import { type SpriteAtlasConfig, computeSpriteStyle, isSpriteAtlasConfig } from '../../../engine/primitives/spriteAtlas';
import { registerCardAtlasSource } from '../../../components/common/media/cardAtlasRegistry';
import { DICETHRONE_CARD_ATLAS_IDS } from '../domain/ids';
import { ASSETS } from './assets';
// 直接 import src/ 下的 JSON（同步，Vite 构建时内联）
import atlasConfigData from '../../../assets/atlas-configs/dicethrone/ability-cards-common.atlas.json';

// 向后兼容类型别名
export type CardAtlasConfig = SpriteAtlasConfig;

/** 解析并验证静态 JSON 配置（不规则网格，所有英雄共享） */
function parseAtlasConfig(): SpriteAtlasConfig {
    const data: unknown = atlasConfigData;
    if (isSpriteAtlasConfig(data)) return data;
    throw new Error('[DiceThrone] 无效的图集配置: ability-cards-common.atlas.json');
}

/** 所有英雄共享的不规则网格配置（4行10列，帧间距不均匀） */
export const COMMON_CARD_ATLAS_CONFIG = parseAtlasConfig();

/**
 * 初始化 DiceThrone 所有英雄的卡牌图集（模块加载时同步注册）
 * 所有英雄共享同一个不规则网格 JSON 配置，只是图片不同。
 */
export function initDiceThroneCardAtlases() {
    const config = COMMON_CARD_ATLAS_CONFIG;
    for (const [, atlasId] of Object.entries(DICETHRONE_CARD_ATLAS_IDS)) {
        // 从 atlasId 提取 charId：'dicethrone:monk-cards' → 'monk'
        const charId = atlasId.replace('dicethrone:', '').replace('-cards', '');
        const imageBase = ASSETS.CARDS_ATLAS(charId);
        registerCardAtlasSource(atlasId, { image: imageBase, config });
    }
}

// 模块加载时同步注册
initDiceThroneCardAtlases();

/** @deprecated 使用 initDiceThroneCardAtlases 代替（同步注册，无需 await） */
export const loadCardAtlasConfig = async (): Promise<CardAtlasConfig> => {
    return COMMON_CARD_ATLAS_CONFIG;
};

export const getCardAtlasStyle = (index: number, atlas: CardAtlasConfig) => {
    return computeSpriteStyle(index, atlas) as CSSProperties;
};
