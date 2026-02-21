import { GAME_CLIENT_MANIFEST } from './manifest.client';
import type { GameImplementation } from '../core/types';
import type { GameClientRuntimeModule } from './manifest.client.types';

// 重新导出类型供外部使用
export type { GameImplementation } from '../core/types';

/** 游戏运行时缓存：加载一次后缓存，避免重复 import */
const runtimeCache = new Map<string, GameClientRuntimeModule>();
/** 正在加载中的 Promise，防止并发重复加载 */
const loadingPromises = new Map<string, Promise<GameClientRuntimeModule>>();

/** 游戏 ID → loadRuntime 函数的映射 */
const loaderMap = new Map<string, () => Promise<GameClientRuntimeModule>>();

// 构建 loader 映射（同步，不触发实际加载）
for (const entry of GAME_CLIENT_MANIFEST) {
    const { manifest, loadRuntime } = entry;
    if (manifest.type !== 'game' || !manifest.enabled || !loadRuntime) continue;
    loaderMap.set(manifest.id, loadRuntime);
}

/**
 * 异步加载游戏实现（Board/engineConfig/tutorial/latencyConfig）
 * 首次调用触发动态 import，后续调用返回缓存
 */
export const loadGameImplementation = async (gameId: string): Promise<GameImplementation | null> => {
    // 1. 缓存命中
    const cached = runtimeCache.get(gameId);
    if (cached) return cached;

    // 2. 正在加载中，复用 Promise
    const existing = loadingPromises.get(gameId);
    if (existing) return existing;

    // 3. 查找 loader
    const loader = loaderMap.get(gameId);
    if (!loader) return null;

    // 4. 发起加载
    const promise = loader().then((runtime) => {
        runtimeCache.set(gameId, runtime);
        loadingPromises.delete(gameId);
        return runtime;
    }).catch((err) => {
        loadingPromises.delete(gameId);
        throw err;
    });

    loadingPromises.set(gameId, promise);
    return promise;
};

/**
 * 同步获取已缓存的游戏实现（未加载则返回 null）
 * 用于已确认加载完成的场景
 */
export const getGameImplementation = (gameId: string): GameImplementation | null => {
    return runtimeCache.get(gameId) ?? null;
};

/**
 * 检查游戏是否已注册（不触发加载）
 */
export const hasGameImplementation = (gameId: string): boolean => {
    return loaderMap.has(gameId);
};

// ---- 向后兼容：保留 GAME_IMPLEMENTATIONS 供不方便改异步的地方使用 ----
// 注意：这个对象在首次访问时是空的，游戏实现需要通过 loadGameImplementation 加载后才会填充
export const GAME_IMPLEMENTATIONS: Record<string, GameImplementation> = new Proxy(
    {} as Record<string, GameImplementation>,
    {
        get(_, prop: string) {
            return runtimeCache.get(prop);
        },
        has(_, prop: string) {
            return runtimeCache.has(prop);
        },
    }
);
