import { GAME_CLIENT_MANIFEST } from './manifest.client';
import type { GameImplementation } from '../core/types';

// 重新导出类型供外部使用
export type { GameImplementation } from '../core/types';

// 权威清单驱动：仅导出启用且类型为 game 的实现映射，并校验一致性。
const buildGameImplementations = () => {
    const implementations: Record<string, GameImplementation> = {};
    const manifestGameIds = new Set<string>();

    for (const entry of GAME_CLIENT_MANIFEST) {
        const { manifest, game, board, tutorial } = entry;
        if (manifest.type !== 'game') continue;
        if (manifestGameIds.has(manifest.id)) {
            throw new Error(`[GameManifest] 游戏 ID 重复: ${manifest.id}`);
        }
        manifestGameIds.add(manifest.id);

        if (!manifest.enabled) continue;
        if (!game || !board) {
            throw new Error(`[GameManifest] 游戏实现缺失: ${manifest.id}`);
        }
        implementations[manifest.id] = { game, board, tutorial };
    }

    return implementations;
};

export const GAME_IMPLEMENTATIONS: Record<string, GameImplementation> = buildGameImplementations();
