/**
 * afterScoring 响应窗口跳过后基地清理测试
 * 
 * 问题：用户跳过 afterScoring 响应窗口后，基地没有被清理
 * 根因：ResponseWindowSystem 发出 RESPONSE_WINDOW_CLOSED 事件，但没有代码监听并补发 BASE_CLEARED
 * 修复：SmashUpEventSystem 监听 RESPONSE_WINDOW_CLOSED，补发 BASE_CLEARED 和 BASE_REPLACED
 */

import { describe, it, expect } from 'vitest';
import { GameTestRunner } from '../../../engine/testing/GameTestRunner';
import { SmashUpDomain } from '../game';
import type { SmashUpCore, SmashUpCommand, SmashUpEvent } from '../domain/types';
import { RESPONSE_WINDOW_EVENTS } from '../../../engine/systems/ResponseWindowSystem';
import { SU_EVENT_TYPES } from '../domain/events';
import { executePipeline } from '../../../engine/pipeline';
import type { PipelineConfig } from '../../../engine/types';
import { createSmashUpEventSystem } from '../domain/systems';

describe('afterScoring 响应窗口跳过后基地清理', () => {
    it('SmashUpEventSystem 监听 RESPONSE_WINDOW_CLOSED 事件并补发 BASE_CLEARED', () => {
        // 构造初始状态：afterScoring 响应窗口打开，基地需要被清理
        const initialState = {
            core: {
                players: {
                    '0': {
                        id: '0',
                        hand: [],
                        discard: [],
                        deck: [],
                        field: [],
                        vp: 0,
                        factions: ['robot', 'ninja'],
                    },
                    '1': {
                        id: '1',
                        hand: [],
                        discard: [],
                        deck: [],
                        field: [],
                        vp: 0,
                        factions: ['wizard', 'pirate'],
                    },
                },
                bases: [
                    {
                        defId: 'base_the_jungle',
                        breakpoint: 12,
                        minions: [],
                        ongoingCards: [],
                    },
                ],
                baseDeck: ['base_tar_pits', 'base_the_mothership'],
                turnOrder: ['0', '1'],
                currentPlayerIndex: 0,
                phase: 'scoreBases',
            },
            sys: {
                responseWindow: {
                    current: {
                        id: 'afterScoring-0',
                        responderQueue: ['0', '1'],
                        currentResponderIndex: 0,
                        passedPlayers: [],
                        windowType: 'afterScoring',
                    },
                },
                afterScoringInitialPowers: {
                    baseIndex: 0,
                    powers: { '0': 0, '1': 0 },
                },
                interaction: {
                    current: null,
                    queue: [],
                },
            },
        };

        // 构造 RESPONSE_WINDOW_CLOSED 事件
        const closedEvent = {
            type: RESPONSE_WINDOW_EVENTS.CLOSED,
            payload: {
                windowId: 'afterScoring-0',
                allPassed: true,
            },
            timestamp: Date.now(),
        };

        // 使用 SmashUpEventSystem 处理事件
        const system = createSmashUpEventSystem();
        const result = system.afterEvents!({
            state: initialState as any,
            events: [closedEvent],
            random: () => 0.5,
        });

        // 验证：系统返回了新状态和事件
        expect(result).toBeDefined();
        expect(result!.state).toBeDefined();
        expect(result!.events).toBeDefined();

        // 验证：发出了 BASE_CLEARED 事件
        const events = result!.events!;
        const baseClearedEvent = events.find(e => e.type === SU_EVENT_TYPES.BASE_CLEARED);
        expect(baseClearedEvent).toBeDefined();
        expect((baseClearedEvent as any).payload.baseIndex).toBe(0);

        // 验证：发出了 BASE_REPLACED 事件
        const baseReplacedEvent = events.find(e => e.type === SU_EVENT_TYPES.BASE_REPLACED);
        expect(baseReplacedEvent).toBeDefined();
        expect((baseReplacedEvent as any).payload.baseIndex).toBe(0);
        expect((baseReplacedEvent as any).payload.newBaseDefId).toBe('base_tar_pits');

        // 验证：afterScoringInitialPowers 被清理
        expect(result!.state.sys.afterScoringInitialPowers).toBeUndefined();
    });
});
