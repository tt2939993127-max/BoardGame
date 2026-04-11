import type { CSSProperties } from 'react';
import { type SpriteAtlasConfig, computeSpriteStyle, isSpriteAtlasConfig } from '../../../engine/primitives/spriteAtlas';
import { registerCardAtlasSource, registerLazyCardAtlasSource } from '../../../components/common/media/cardAtlasRegistry';
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

// @atlas-contract ability-cards-common.atlas.json 不规则网格；坐标来自图集人工采样（colStarts/rowStarts）。
// 枪手/武士新图集存在轻微左偏，基于抽样像素对列坐标做微调修正。
/** 默认公共配置：所有当前正式角色都沿用这份不规则网格。 */
export const COMMON_CARD_ATLAS_CONFIG = parseAtlasConfig(atlasConfigData, 'ability-cards-common.atlas.json');

const UNIFORM_GRID_ATLASES: Record<string, { rows: number; cols: number }> = {
    gunslinger: { rows: 8, cols: 10 },
    samurai: { rows: 8, cols: 10 },
};

/**
 * 初始化 DiceThrone 所有英雄的卡牌图集（模块加载时同步注册）
 * 枪手/武士使用 8x10 均匀网格，其他角色沿用公共不规则网格。
 */
export function initDiceThroneCardAtlases() {
    for (const [, atlasId] of Object.entries(DICETHRONE_CARD_ATLAS_IDS)) {
        // 从 atlasId 提取 charId：'dicethrone:monk-cards' → 'monk'
        const charId = atlasId.replace('dicethrone:', '').replace('-cards', '');
        const uniform = UNIFORM_GRID_ATLASES[charId];
        if (uniform) {
            registerLazyCardAtlasSource(atlasId, { image: ASSETS.CARDS_ATLAS(charId), grid: uniform });
            continue;
        }
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
