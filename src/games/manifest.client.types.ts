import type { ReactNode } from 'react';
import type { TutorialManifest } from '../contexts/TutorialContext';
import type { GameManifestEntry } from './manifest.types';
import type { GameEngineConfig } from '../engine/transport/server';
import type { LatencyOptimizationConfig } from '../engine/transport/latency/types';

/** 游戏运行时实现（Board/engineConfig/tutorial/latencyConfig），按需懒加载 */
export interface GameClientRuntimeModule {
    engineConfig: GameEngineConfig;
    board: React.ComponentType<Record<string, unknown>>;
    tutorial?: TutorialManifest;
    latencyConfig?: LatencyOptimizationConfig;
}

export interface GameClientManifestEntry {
    manifest: GameManifestEntry;
    thumbnail: ReactNode;
    /** 懒加载游戏运行时实现（仅 type=game 时存在） */
    loadRuntime?: () => Promise<GameClientRuntimeModule>;

    // ---- 以下字段已废弃，保留仅为向后兼容过渡 ----
    /** @deprecated 使用 loadRuntime() 替代 */
    engineConfig?: GameEngineConfig;
    /** @deprecated 使用 loadRuntime() 替代 */
    board?: React.ComponentType<Record<string, unknown>>;
    /** @deprecated 使用 loadRuntime() 替代 */
    tutorial?: TutorialManifest;
    /** @deprecated 使用 loadRuntime() 替代 */
    latencyConfig?: LatencyOptimizationConfig;
}
