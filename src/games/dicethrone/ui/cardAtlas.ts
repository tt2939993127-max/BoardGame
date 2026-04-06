import type { CSSProperties } from 'react';
import { type SpriteAtlasConfig, computeSpriteStyle, isSpriteAtlasConfig } from '../../../engine/primitives/spriteAtlas';
import { registerCardAtlasSource } from '../../../components/common/media/cardAtlasRegistry';
import { DICETHRONE_CARD_ATLAS_IDS } from '../domain/ids';
import { ASSETS } from './assets';
// 直接 import src/ 下的 JSON（同步，Vite 构建时内联）
import atlasConfigData from '../../../assets/atlas-configs/dicethrone/ability-cards-common.atlas.json';
import gunslingerAtlasConfigData from '../../../assets/atlas-configs/dicethrone/ability-cards-gunslinger.atlas.json';

// 向后兼容类型别名
export type CardAtlasConfig = SpriteAtlasConfig;

/** 解析并验证静态 JSON 配置（公共网格或英雄专属精确 frame） */
function parseAtlasConfig(data: unknown, label: string): SpriteAtlasConfig {
    if (isSpriteAtlasConfig(data)) return data;
    throw new Error(`[DiceThrone] 无效的图集配置: ${label}`);
}

/** 默认公共配置：老派系与武士仍复用这份不规则网格。 */
export const COMMON_CARD_ATLAS_CONFIG = parseAtlasConfig(atlasConfigData, 'ability-cards-common.atlas.json');
/** 枪手例外：复合展示位拆成逐 frame 精确配置。 */
export const GUNSLINGER_CARD_ATLAS_CONFIG = parseAtlasConfig(gunslingerAtlasConfigData, 'ability-cards-gunslinger.atlas.json');

const HERO_CARD_ATLAS_CONFIGS: Partial<Record<string, SpriteAtlasConfig>> = {
    gunslinger: GUNSLINGER_CARD_ATLAS_CONFIG,
};

/**
 * 初始化 DiceThrone 所有英雄的卡牌图集（模块加载时同步注册）
 * 默认走公共 atlas；个别英雄可按真相源切到专属精确 frame 配置。
 */
export function initDiceThroneCardAtlases() {
    for (const [, atlasId] of Object.entries(DICETHRONE_CARD_ATLAS_IDS)) {
        // 从 atlasId 提取 charId：'dicethrone:monk-cards' → 'monk'
        const charId = atlasId.replace('dicethrone:', '').replace('-cards', '');
        const config = HERO_CARD_ATLAS_CONFIGS[charId] ?? COMMON_CARD_ATLAS_CONFIG;
        registerCardAtlasSource(atlasId, { image: ASSETS.CARDS_ATLAS(charId), config });
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
