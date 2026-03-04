/**
 * 验证 afterScoring 响应窗口时序
 * 
 * 目标：确认响应窗口打开时，基地上的随从还在
 */

import { describe, it, expect } from 'vitest';
import { executePipeline } from '../../../engine/pipeline';
import { SmashUpDomain } from '../game';
import type { SmashUpCore, SmashUpCommand } from '../domain/types';
import { createSmashUpEventSystem } from '../domain/systems';

describe('afterScoring 响应窗口时序验证', () => {
    it('响应窗口打开时，基地上的随从还在', () => {
        // 构造初始状态：基地达到 breakpoint，有随从
        const initialCore: SmashUpCore = {
            players: {
                'p0': {
                    id: 'p0',
                    hand: [
                        {
                            uid: 'card-1',
                            defId: 'innsmouth_return_to_the_sea',
                            type: 'action',
                        },
                    ],
                    discard: [],
                    deck: [],
                    vp: 0,
                    factions: ['innsmouth', 'giant_ants'],
                },
                'p1': {
                    id: 'p1',
                    hand: [],
                    discard: [],
                    deck: [],
                    vp: 0,
                    factions: ['robot', 'ninja'],
                },
            },
            bases: [
                {
                    defId: 'base_the_hill',
                    breakpoint: 10,
                    minions: [
                        {
                            uid: 'minion-1',
                            defId: 'innsmouth_the_locals',
                            type: 'minion',
                            controller: 'p0',
                            owner: 'p0',
                            power: 5,
                            powerCounters: 0,
                        },
                        {
                            uid: 'minion-2',
                            defId: 'innsmouth_the_locals',
                            type: 'minion',
                            controller: 'p0',
                            owner: 'p0',
                            power: 5,
                            powerCounters: 0,
                        },
                    ],
                    ongoingActions: [],
                },
            ],
            baseDeck: ['base_egg_chamber'],
            madnessDeck: [],
            turnOrder: ['p0', 'p1'],
            currentPlayerIndex: 0,
            phase: 'scoreBases',
        } as SmashUpCore;
        
        // 执行计分命令
        const command: SmashUpCommand = {
            type: 'SCORE_BASES',
            payload: { playerId: 'p0' },
        };
        
        const result = executePipeline({
            domain: SmashUpDomain,
            systems: [createSmashUpEventSystem()],
            state: { core: initialCore, sys: {} },
            command,
            random: () => 0.5,
            timestamp: Date.now(),
            matchState: { core: initialCore, sys: {} },
        });
        
        console.log('[测试] 计分后状态:', {
            responseWindow: result.state.sys.responseWindow?.current?.windowType,
            baseMinions: result.state.core.bases[0].minions.length,
            afterScoringInitialPowers: result.state.sys.afterScoringInitialPowers,
        });
        
        // 验证：afterScoring 响应窗口已打开
        expect(result.state.sys.responseWindow?.current?.windowType).toBe('afterScoring');
        
        // 验证：基地上的随从还在
        expect(result.state.core.bases[0].minions.length).toBeGreaterThan(0);
        
        console.log('[测试] ✅ 响应窗口打开时，基地上的随从还在');
    });
});
