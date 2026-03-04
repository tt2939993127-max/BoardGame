/**
 * UGC Runtime 单元测试
 * 
 * 测试宿主桥接与视图 SDK 的类型和工厂函数
 * 
 * 注意：完整的端到端通信测试需要 jsdom 环境，
 * 请在安装 jsdom 后运行 E2E 测试。
 */

import { describe, it, expect } from 'vitest';
import { UGCHostBridge, createHostBridge } from '../runtime/hostBridge';
import { UGCViewSdk, createViewSdk, getGlobalSdk, initGlobalSdk } from '../runtime/viewSdk';
import type { UGCGameState, PlayerId, PackageId } from '../sdk/types';

// ============================================================================
// 类型和工厂函数测试（不需要 DOM）
// ============================================================================

// 模拟游戏状态
function createMockState(): UGCGameState {
    return {
        phase: 'main',
        turnNumber: 1,
        activePlayerId: 'player-1',
        players: {
            'player-1': {
                resources: { hp: 10, mp: 5 },
                handCount: 3,
                deckCount: 20,
                discardCount: 0,
                statusEffects: {},
            },
            'player-2': {
                resources: { hp: 10, mp: 5 },
                handCount: 3,
                deckCount: 20,
                discardCount: 0,
                statusEffects: {},
            },
        },
    };
}

describe('UGC Runtime', () => {
    describe('UGCHostBridge 类型', () => {
        it('应导出 UGCHostBridge 类', () => {
            expect(UGCHostBridge).toBeDefined();
            expect(typeof UGCHostBridge).toBe('function');
        });

        it('应导出 createHostBridge 工厂函数', () => {
            expect(createHostBridge).toBeDefined();
            expect(typeof createHostBridge).toBe('function');
        });
    });

    describe('UGCViewSdk 类型', () => {
        it('应导出 UGCViewSdk 类', () => {
            expect(UGCViewSdk).toBeDefined();
            expect(typeof UGCViewSdk).toBe('function');
        });

        it('应导出 createViewSdk 工厂函数', () => {
            expect(createViewSdk).toBeDefined();
            expect(typeof createViewSdk).toBe('function');
        });

        it('应导出全局 SDK 函数', () => {
            expect(getGlobalSdk).toBeDefined();
            expect(initGlobalSdk).toBeDefined();
        });

        it('应创建 SDK 实例（不启动）', () => {
            const sdk = createViewSdk();
            expect(sdk).toBeInstanceOf(UGCViewSdk);
            expect(sdk.isReady()).toBe(false);
            expect(sdk.getState()).toBeNull();
            expect(sdk.getCurrentPlayerId()).toBe('');
        });
    });

    describe('状态类型兼容性', () => {
        it('应创建有效的游戏状态', () => {
            const state = createMockState();
            
            expect(state.phase).toBe('main');
            expect(state.turnNumber).toBe(1);
            expect(state.activePlayerId).toBe('player-1');
            expect(state.players['player-1']).toBeDefined();
            expect(state.players['player-1'].resources.hp).toBe(10);
        });

        it('应支持玩家状态结构', () => {
            const state = createMockState();
            const player = state.players['player-1'];
            
            expect(player.handCount).toBe(3);
            expect(player.deckCount).toBe(20);
            expect(player.discardCount).toBe(0);
            expect(player.statusEffects).toEqual({});
        });
    });

    describe('配置类型', () => {
        it('应支持 PlayerId 类型', () => {
            const playerId: PlayerId = 'player-1';
            expect(playerId).toBe('player-1');
        });

        it('应支持 PackageId 类型', () => {
            const packageId: PackageId = 'pkg-test';
            expect(packageId).toBe('pkg-test');
        });
    });
});
