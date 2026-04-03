import { GAME_CLIENT_MANIFEST } from './manifest.client';
import type { GameImplementation } from '../core/types';
import type { GameClientRuntimeModule } from './manifest.client.types';
import { logMobileRuntime, logMobileRuntimeCritical } from '../lib/mobile/mobileRuntimeDebug';

// 重新导出类型供外部使用
export type { GameImplementation } from '../core/types';

/** 游戏运行时缓存：加载一次后缓存，避免重复 import */
const runtimeCache = new Map<string, GameClientRuntimeModule>();
/** 正在加载中的 Promise，防止并发重复加载 */
const loadingPromises = new Map<string, Promise<GameClientRuntimeModule>>();

/** 游戏 ID → loadRuntime 函数的映射 */
const loaderMap = new Map<string, () => Promise<GameClientRuntimeModule>>();

export const GAME_IMPLEMENTATION_LOAD_TIMEOUT_MS = 4000;

const createGameImplementationTimeoutMessage = (gameId: string) => (
    `游戏客户端加载超时：${gameId}（${GAME_IMPLEMENTATION_LOAD_TIMEOUT_MS}ms）`
);

const withTimeout = async <T,>(promise: Promise<T>, timeoutMs: number, timeoutMessage: string): Promise<T> => {
    let timeoutId: ReturnType<typeof setTimeout> | undefined;
    try {
        return await Promise.race([
            promise,
            new Promise<T>((_, reject) => {
                timeoutId = setTimeout(() => {
                    reject(new Error(timeoutMessage));
                }, timeoutMs);
            }),
        ]);
    } finally {
        if (timeoutId !== undefined) {
            clearTimeout(timeoutId);
        }
    }
};

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
    if (cached) {
        logMobileRuntime('GameRuntime', 'load-cache-hit', { gameId });
        return cached;
    }

    // 2. 正在加载中，复用 Promise
    const existing = loadingPromises.get(gameId);
    if (existing) {
        logMobileRuntime('GameRuntime', 'load-reuse-inflight', { gameId });
        return existing;
    }

    // 3. 查找 loader
    const loader = loaderMap.get(gameId);
    if (!loader) {
        logMobileRuntime('GameRuntime', 'load-missing-loader', { gameId }, 'warn');
        return null;
    }

    // 4. 发起加载
    const startedAt = Date.now();
    const timeoutMessage = createGameImplementationTimeoutMessage(gameId);
    logMobileRuntime('GameRuntime', 'load-start', { gameId });

    const rawPromise = loader().then((runtime) => {
        runtimeCache.set(gameId, runtime);
        logMobileRuntime('GameRuntime', 'load-success', {
            gameId,
            durationMs: Date.now() - startedAt,
        });
        return runtime;
    });

    const promise = withTimeout(rawPromise, GAME_IMPLEMENTATION_LOAD_TIMEOUT_MS, timeoutMessage)
        .catch((error: unknown) => {
            const message = error instanceof Error ? error.message : String(error);
            const isTimeout = message === timeoutMessage;
            const payload = {
                gameId,
                error: message,
                durationMs: Date.now() - startedAt,
            };

            logMobileRuntime(
                'GameRuntime',
                isTimeout ? 'load-timeout' : 'load-failed',
                payload,
                isTimeout ? 'warn' : 'error',
            );
            logMobileRuntimeCritical('GameRuntime', isTimeout ? 'load-timeout' : 'load-failed', payload);
            throw error;
        })
        .finally(() => {
            if (loadingPromises.get(gameId) === promise) {
                loadingPromises.delete(gameId);
            }
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
