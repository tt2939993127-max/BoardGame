/**
 * 召唤师战争 - 卡牌图集配置
 * 底层使用引擎层 SpriteAtlasRegistry，本文件保留游戏特有的阵营映射逻辑
 *
 * 统一模式：均匀网格只声明 rows/cols，尺寸从预加载缓存自动解析。
 * cardAtlasRegistry 使用懒解析（渲染时解析），globalSpriteAtlasRegistry 在 initSpriteAtlases 时即时解析。
 */

import type { CSSProperties } from 'react';
import { getOptimizedImageUrls, getLocalizedAssetPath, getPreloadedImageElement } from '../../../core/AssetLoader';
import { registerLazyCardAtlasSource } from '../../../components/common/media/cardAtlasRegistry';
import type { FactionId } from '../domain/types';
import { resolveFactionId } from '../config/factions';
import {
  type SpriteAtlasConfig,
  type SpriteAtlasSource,
  computeSpriteStyle,
  computeSpriteAspectRatio,
  generateUniformAtlasConfig,
  globalSpriteAtlasRegistry,
} from '../../../engine/primitives/spriteAtlas';

// 向后兼容：re-export 引擎层类型
export type { SpriteAtlasConfig, SpriteAtlasSource };

/** 注册精灵图源（委托到引擎层全局注册表） */
export function registerSpriteAtlas(id: string, source: SpriteAtlasSource): void {
  globalSpriteAtlasRegistry.register(id, source);
}

/** 获取精灵图源（委托到引擎层全局注册表） */
export function getSpriteAtlasSource(id: string): SpriteAtlasSource | undefined {
  return globalSpriteAtlasRegistry.getSource(id);
}

/** 计算精灵图裁切样式（委托到引擎层） */
export function getSpriteAtlasStyle(index: number, atlas: SpriteAtlasConfig): CSSProperties {
  return computeSpriteStyle(index, atlas);
}

/** 获取帧的宽高比（委托到引擎层） */
export function getFrameAspectRatio(index: number, atlas: SpriteAtlasConfig): number {
  return computeSpriteAspectRatio(index, atlas);
}

// ========== 均匀网格声明（只需 rows/cols，尺寸从预加载缓存解析） ==========

/** 阵营图集网格声明 */
interface AtlasGridDecl {
  rows: number;
  cols: number;
}

/** 所有阵营共用的 hero 网格（2帧横排） */
const HERO_GRID: AtlasGridDecl = { rows: 1, cols: 2 };
/** 所有阵营共用的 portal 网格（2帧横排） */
const PORTAL_GRID: AtlasGridDecl = { rows: 1, cols: 2 };
/** 通用 cards 网格（2列6行） */
const CARDS_GRID: AtlasGridDecl = { rows: 6, cols: 2 };
/** dice 网格（3×3） */
const DICE_GRID: AtlasGridDecl = { rows: 3, cols: 3 };

// 向后兼容：导出旧常量名（供 devtools 等外部引用）
// 新代码不应使用这些常量，应通过注册表获取 config
// 这些是"典型尺寸"的硬编码回退，仅在预加载缓存不可用时使用
/** @deprecated 使用注册表获取 config */
export const HERO_ATLAS: SpriteAtlasConfig = generateUniformAtlasConfig(2088, 1458, 1, 2);
/** @deprecated 使用注册表获取 config */
export const PORTAL_ATLAS: SpriteAtlasConfig = generateUniformAtlasConfig(2048, 1430, 1, 2);
/** @deprecated 使用注册表获取 config */
export const CARDS_ATLAS: SpriteAtlasConfig = generateUniformAtlasConfig(2088, 4374, 6, 2);
/** @deprecated 使用注册表获取 config */
export const NECROMANCER_CARDS_ATLAS: SpriteAtlasConfig = generateUniformAtlasConfig(2100, 4410, 6, 2);
/** @deprecated 使用注册表获取 config */
export const DICE_ATLAS: SpriteAtlasConfig = generateUniformAtlasConfig(1024, 1024, 3, 3);
/** @deprecated */
export const NECROMANCER_HERO_ATLAS = HERO_ATLAS;

/** 骰子面对应的精灵图帧索引 */
export const DICE_FACE_SPRITE_MAP = {
  /** 近战面可用的帧索引 */
  melee: [0, 4, 6],
  /** 远程面可用的帧索引 */
  ranged: [3, 7],
  /** 特殊面的帧索引 */
  special: [8],
} as const;

// ========== 阵营名 → 目录名映射 ==========

/** 阵营 ID → 资源目录名（核心使用 FactionId，兼容旧中文输入） */
const FACTION_DIR_MAP: Record<FactionId, string> = {
  necromancer: 'Necromancer',
  trickster: 'Trickster',
  paladin: 'Paladin',
  goblin: 'Goblin',
  frost: 'Frost',
  barbaric: 'Barbaric',
};

/** 所有阵营目录名列表 */
const ALL_FACTION_DIRS = ['Necromancer', 'Trickster', 'Paladin', 'Goblin', 'Frost', 'Barbaric'] as const;

/**
 * 根据阵营名获取精灵图 atlas ID
 * @param faction 阵营 ID（如 'necromancer'，兼容旧中文）
 * @param atlasType 'hero' | 'cards'
 */
export function getFactionAtlasId(faction: FactionId | string, atlasType: 'hero' | 'cards'): string {
  const factionId = resolveFactionId(faction);
  const dir = FACTION_DIR_MAP[factionId] ?? 'Necromancer';
  return `sw:${dir.toLowerCase()}:${atlasType}`;
}

/** 根据卡牌 ID 前缀推断阵营 */
const CARD_ID_PREFIX_MAP: Record<string, FactionId> = {
  necro: 'necromancer',
  trick: 'trickster',
  paladin: 'paladin',
  goblin: 'goblin',
  frost: 'frost',
  barb: 'barbaric',
};

/**
 * 根据卡牌数据解析精灵图 atlas ID
 * 优先使用 faction 字段（UnitCard），回退到 ID 前缀推断
 */
export function resolveCardAtlasId(card: { id: string; faction?: FactionId | string }, atlasType: 'hero' | 'cards'): string {
  if (card.faction) {
    return getFactionAtlasId(card.faction, atlasType);
  }
  for (const [prefix, faction] of Object.entries(CARD_ID_PREFIX_MAP)) {
    if (card.id.startsWith(prefix)) {
      return getFactionAtlasId(faction, atlasType);
    }
  }
  return getFactionAtlasId('necromancer', atlasType);
}

/**
 * 从预加载缓存解析图片尺寸并生成均匀网格配置
 * 如果缓存中没有（边缘情况），返回 null
 */
function resolveUniformConfig(imagePath: string, grid: AtlasGridDecl, locale: string): SpriteAtlasConfig | null {
  const img = getPreloadedImageElement(imagePath, locale);
  if (img && img.naturalWidth > 0 && img.naturalHeight > 0) {
    return generateUniformAtlasConfig(img.naturalWidth, img.naturalHeight, grid.rows, grid.cols);
  }
  return null;
}

/** 初始化精灵图注册（所有阵营） */
export function initSpriteAtlases(locale?: string): void {
  const effectiveLocale = locale || 'zh-CN';
  
  for (const dir of ALL_FACTION_DIRS) {
    const heroBase = `summonerwars/hero/${dir}/hero`;
    const localizedHeroBase = getLocalizedAssetPath(heroBase, effectiveLocale);
    const heroUrls = getOptimizedImageUrls(localizedHeroBase);
    // globalSpriteAtlasRegistry：即时解析尺寸（initSpriteAtlases 在 CriticalImageGate 之后调用）
    const heroConfig = resolveUniformConfig(heroBase, HERO_GRID, effectiveLocale);
    if (heroConfig) {
      registerSpriteAtlas(`sw:${dir.toLowerCase()}:hero`, {
        image: heroUrls.webp,
        config: heroConfig,
      });
    }
    // cardAtlasRegistry：懒解析（渲染时从缓存读取尺寸）
    registerLazyCardAtlasSource(`sw:${dir.toLowerCase()}:hero`, {
      image: heroBase,
      grid: HERO_GRID,
    });

    const cardsBase = `summonerwars/hero/${dir}/cards`;
    const localizedCardsBase = getLocalizedAssetPath(cardsBase, effectiveLocale);
    const cardsUrls = getOptimizedImageUrls(localizedCardsBase);
    // 每个阵营的 cards 图片尺寸可能不同（如 Necromancer），从缓存自动解析
    const cardsConfig = resolveUniformConfig(cardsBase, CARDS_GRID, effectiveLocale);
    if (cardsConfig) {
      registerSpriteAtlas(`sw:${dir.toLowerCase()}:cards`, {
        image: cardsUrls.webp,
        config: cardsConfig,
      });
    }
    registerLazyCardAtlasSource(`sw:${dir.toLowerCase()}:cards`, {
      image: cardsBase,
      grid: CARDS_GRID,
    });
  }

  // 骰子精灵图
  const diceBase = 'summonerwars/common/dice';
  const localizedDiceBase = getLocalizedAssetPath(diceBase, effectiveLocale);
  const diceUrls = getOptimizedImageUrls(localizedDiceBase);
  const diceConfig = resolveUniformConfig(diceBase, DICE_GRID, effectiveLocale);
  if (diceConfig) {
    registerSpriteAtlas('sw:dice', {
      image: diceUrls.webp,
      config: diceConfig,
    });
  }
  registerLazyCardAtlasSource('sw:dice', {
    image: diceBase,
    grid: DICE_GRID,
  });

  // 传送门精灵图（所有阵营共用）
  const portalBase = 'summonerwars/common/Portal';
  const localizedPortalBase = getLocalizedAssetPath(portalBase, effectiveLocale);
  const portalUrls = getOptimizedImageUrls(localizedPortalBase);
  const portalConfig = resolveUniformConfig(portalBase, PORTAL_GRID, effectiveLocale);
  if (portalConfig) {
    registerSpriteAtlas('sw:portal', {
      image: portalUrls.webp,
      config: portalConfig,
    });
  }
  registerLazyCardAtlasSource('sw:portal', {
    image: portalBase,
    grid: PORTAL_GRID,
  });
}
