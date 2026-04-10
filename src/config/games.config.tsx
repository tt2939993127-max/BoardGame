import type { ReactNode } from 'react';
import { ManifestGameThumbnail } from '../components/lobby/thumbnails';
import { GAME_CLIENT_MANIFEST } from '../games/manifest.client';
import type { GameCategory, GameManifestEntry } from '../games/manifest.types';
import { resolveGameManifestEntry } from '../games/mobileSupport';
import { isNativeAndroidRuntime } from '../lib/mobile/androidRuntime';

export interface GameConfig extends GameManifestEntry {
    thumbnail: ReactNode;
    isUgc?: boolean;
}

const registrySubscribers = new Set<() => void>();
const ugcGameIds = new Set<string>();

export const shouldIncludeManifestInRegistry = (
    manifest: GameManifestEntry,
    options: {
        isNativeAndroidAppRuntime: boolean;
        isDev: boolean;
    },
) => {
    if (manifest.type === 'tool' && !options.isDev) {
        return false;
    }

    return options.isNativeAndroidAppRuntime
        ? manifest.shellTargets.includes('app-webview')
        : manifest.shellTargets.includes('pwa');
};

const buildGameRegistry = () => {
    const isNativeAndroidAppRuntime = isNativeAndroidRuntime();
    const registry: Record<string, GameConfig> = {};
    for (const entry of GAME_CLIENT_MANIFEST) {
        const { manifest, thumbnail } = entry;
        if (!thumbnail) {
            throw new Error(`[GameManifest] 缺少缩略图配置: ${manifest.id}`);
        }
        const resolvedManifest = resolveGameManifestEntry(manifest);
        if (!shouldIncludeManifestInRegistry(resolvedManifest, {
            isNativeAndroidAppRuntime,
            isDev: import.meta.env.DEV,
        })) {
            continue;
        }
        registry[resolvedManifest.id] = {
            ...resolvedManifest,
            thumbnail,
            isUgc: false,
        };
    }
    return registry;
};

export let GAMES_REGISTRY: Record<string, GameConfig> = buildGameRegistry();

const notifyRegistryUpdate = () => {
    registrySubscribers.forEach((listener) => listener());
};

// HMR: 当 manifest.client 更新时，重新构建注册表
if (import.meta.hot) {
    import.meta.hot.accept('../games/manifest.client', () => {
        GAMES_REGISTRY = buildGameRegistry();
        notifyRegistryUpdate();
    });
}

export const subscribeGameRegistry = (listener: () => void) => {
    registrySubscribers.add(listener);
    return () => registrySubscribers.delete(listener);
};

const clearUgcEntries = () => {
    for (const id of ugcGameIds) {
        delete GAMES_REGISTRY[id];
    }
    ugcGameIds.clear();
};

export const refreshUgcGames = async () => {
    clearUgcEntries();
};

export const getAllGames = () => Object.values(GAMES_REGISTRY).filter(g => g.enabled);
export const getGameById = (id: string) => GAMES_REGISTRY[id];
export const getGamesByCategory = (category: string) => {
    const games = getAllGames();
    if (category === 'All') {
        // "全部游戏" 选项下不再显示工具类项目
        return games.filter(g => g.type !== 'tool');
    }
    // 同时匹配 category 和 tags，让一个游戏可以出现在多个分类下
    return games.filter(g => g.category === category || g.tags?.includes(category));
};

export default GAMES_REGISTRY;
