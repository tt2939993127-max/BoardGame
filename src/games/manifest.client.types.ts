import type { ReactNode } from 'react';
import type { TutorialManifest } from '../contexts/TutorialContext';
import type { GameManifestEntry } from './manifest.types';
import type { GameEngineConfig } from '../engine/transport/server';
import type { LatencyOptimizationConfig } from '../engine/transport/latency/types';

export interface GameClientManifestEntry {
    manifest: GameManifestEntry;
    thumbnail: ReactNode;
    /** 引擎配置 */
    engineConfig?: GameEngineConfig;
    /** React 棋盘组件 */
    board?: React.ComponentType<Record<string, unknown>>;
    tutorial?: TutorialManifest;
    /** 延迟优化配置（可选，不传则不启用任何优化） */
    latencyConfig?: LatencyOptimizationConfig;
}
