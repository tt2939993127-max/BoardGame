import type { ReactNode } from 'react';
import { GAME_CLIENT_MANIFEST } from '../games/manifest.client';
import type { GameManifestEntry } from '../games/manifest.types';

export interface GameConfig extends GameManifestEntry {
    thumbnail: ReactNode;
}

const buildGameRegistry = () => {
    const registry: Record<string, GameConfig> = {};
    for (const entry of GAME_CLIENT_MANIFEST) {
        const { manifest, thumbnail } = entry;
        if (!thumbnail) {
            throw new Error(`[GameManifest] 缺少缩略图配置: ${manifest.id}`);
        }
        registry[manifest.id] = {
            ...manifest,
            thumbnail,
        };
    }
    return registry;
};

export const GAMES_REGISTRY: Record<string, GameConfig> = buildGameRegistry();

export const getAllGames = () => Object.values(GAMES_REGISTRY).filter(g => g.enabled);
export const getGameById = (id: string) => GAMES_REGISTRY[id];
export const getGamesByCategory = (category: string) => {
    const games = getAllGames();
    if (category === 'All') {
        // "全部游戏" 选项下不再显示工具类项目
        return games.filter(g => g.type !== 'tool');
    }
    return games.filter(g => g.category === category);
};

export default GAMES_REGISTRY;
