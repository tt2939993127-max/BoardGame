import type { CSSProperties } from 'react';
import { type SpriteAtlasConfig, computeSpriteStyle, isSpriteAtlasConfig } from '../../../engine/primitives/spriteAtlas';
import { registerCardAtlasSource } from '../../../components/common/media/cardAtlasRegistry';
import { DICETHRONE_CARD_ATLAS_IDS } from '../domain/ids';
import { ASSETS } from './assets';
// 直接 import src/ 下的 JSON（同步，Vite 构建时内联）
import atlasConfigData from '../../../assets/atlas-configs/dicethrone/ability-cards-common.atlas.json';

// 向后兼容类型别名
export type CardAtlasConfig = SpriteAtlasConfig;

/** 解析并验证静态 JSON 配置（支持公共网格和角色专属精确 frame） */
function parseAtlasConfig(data: unknown, label: string): SpriteAtlasConfig {
    if (isSpriteAtlasConfig(data)) return data;
    throw new Error(`[DiceThrone] 无效的图集配置: ${label}`);
}

/** 默认公共配置：所有当前正式角色都沿用这份不规则网格。 */
export const COMMON_CARD_ATLAS_CONFIG = parseAtlasConfig(atlasConfigData, 'ability-cards-common.atlas.json');

/**
 * 初始化 DiceThrone 所有英雄的卡牌图集（模块加载时同步注册）
 * 当前全部角色统一走公共 atlas。
 */
export function initDiceThroneCardAtlases() {
    for (const [, atlasId] of Object.entries(DICETHRONE_CARD_ATLAS_IDS)) {
        // 从 atlasId 提取 charId：'dicethrone:monk-cards' → 'monk'
        const charId = atlasId.replace('dicethrone:', '').replace('-cards', '');
        registerCardAtlasSource(atlasId, { image: ASSETS.CARDS_ATLAS(charId), config: COMMON_CARD_ATLAS_CONFIG });
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
