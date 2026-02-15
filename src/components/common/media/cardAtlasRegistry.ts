import type { SpriteAtlasSource } from '../../../engine/primitives/spriteAtlas';

export type CardAtlasSource = SpriteAtlasSource;

// CardPreview 专用注册表：存储 base path（不带扩展名），由 AtlasCard 构建本地化 URL。
const cardAtlasRegistry = new Map<string, CardAtlasSource>();

/** 注册卡牌图集源（CardPreview 专用） */
export function registerCardAtlasSource(id: string, source: CardAtlasSource): void {
    cardAtlasRegistry.set(id, source);
}

/** 获取卡牌图集源（CardPreview 专用） */
export function getCardAtlasSource(id: string): CardAtlasSource | undefined {
    return cardAtlasRegistry.get(id);
}
