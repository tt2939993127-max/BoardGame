/**
 * 测试：afterScoring 响应窗口中，基地上的随从是否可访问
 * 
 * 验证：
 * 1. 打开 afterScoring 响应窗口时，基地上的随从还在
 * 2. 玩家打出 afterScoring 卡牌时，可以访问基地上的随从
 * 3. 响应窗口关闭后，才会清空基地
 */

import { describe, it, expect } from 'vitest';
import { runCommand } from '../../../engine/testing/helpers';
import { SmashUpDomain } from '../game';
import type { SmashUpCore } from '../domain/types';

describe('afterScoring 响应窗口中随从可访问性', () => {
    it('打开 afterScoring 响应窗口时，基地上的随从还在', () => {
        const runner = new GameTestRunner(smashUpGame);
        
        // 初始化游戏
        runner.setup({
            players: ['p0', 'p1'],
            initialState: (core: SmashUpCore) => {
                // 设置基地
                core.bases = [
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
                                power: 3,
                                powerCounters: 0,
                            },
                            {
                                uid: 'minion-2',
                                defId: 'innsmouth_the_locals',
                                type: 'minion',
                                controller: 'p0',
                                owner: 'p0',
                                power: 3,
                                powerCounters: 0,
                            },
                        ],
                        ongoingActions: [],
                    },
                ];
                
                // 玩家 0 手牌中有 afterScoring 卡牌
                core.players.p0.hand = [
                    {
                        uid: 'card-1',
                        defId: 'innsmouth_return_to_the_sea',
                        type: 'action',
                    },
                ];
                
                // 设置回合
                core.currentPlayerIndex = 0;
                core.phase = 'scoreBases';
                
                return core;
            },
        });
        
        // 执行计分命令
        runner.dispatch('SCORE_BASES', { playerId: 'p0' });
        
        // 验证：afterScoring 响应窗口已打开
        const state1 = runner.getState();
        expect(state1.sys.responseWindow?.current?.windowType).toBe('afterScoring');
        
        // 验证：基地上的随从还在
        expect(state1.core.bases[0].minions).toHaveLength(2);
        expect(state1.core.bases[0].minions[0].uid).toBe('minion-1');
        expect(state1.core.bases[0].minions[1].uid).toBe('minion-2');
        
        console.log('[测试] afterScoring 响应窗口打开时，基地上的随从还在 ✅');
    });
    
    it('玩家打出 afterScoring 卡牌时，可以访问基地上的随从', () => {
        const runner = new GameTestRunner(smashUpGame);
        
        // 初始化游戏
        runner.setup({
            players: ['p0', 'p1'],
            initialState: (core: SmashUpCore) => {
                // 设置基地
                core.bases = [
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
                                power: 3,
                                powerCounters: 0,
                            },
                            {
                                uid: 'minion-2',
                                defId: 'innsmouth_the_locals',
                                type: 'minion',
                                controller: 'p0',
                                owner: 'p0',
                                power: 3,
                                powerCounters: 0,
                            },
                        ],
                        ongoingActions: [],
                    },
                ];
                
                // 玩家 0 手牌中有 afterScoring 卡牌
                core.players.p0.hand = [
                    {
                        uid: 'card-1',
                        defId: 'innsmouth_return_to_the_sea',
                        type: 'action',
                    },
                ];
                
                // 设置回合
                core.currentPlayerIndex = 0;
                core.phase = 'scoreBases';
                
                return core;
            },
        });
        
        // 执行计分命令
        runner.dispatch('SCORE_BASES', { playerId: 'p0' });
        
        // 验证：afterScoring 响应窗口已打开
        const state1 = runner.getState();
        expect(state1.sys.responseWindow?.current?.windowType).toBe('afterScoring');
        
        // 打出 afterScoring 卡牌
        runner.dispatch('PLAY_ACTION', {
            playerId: 'p0',
            cardUid: 'card-1',
            baseIndex: 0,
        });
        
        // 验证：创建了交互（选择要返回手牌的随从）
        const state2 = runner.getState();
        expect(state2.sys.interaction?.current).toBeDefined();
        expect(state2.sys.interaction?.current?.data?.sourceId).toBe('innsmouth_return_to_the_sea');
        
        // 验证：基地上的随从还在（交互选项应该能看到这些随从）
        expect(state2.core.bases[0].minions).toHaveLength(2);
        
        console.log('[测试] 打出 afterScoring 卡牌时，基地上的随从还在 ✅');
    });
    
    it('响应窗口关闭后，才会清空基地', () => {
        const runner = new GameTestRunner(smashUpGame);
        
        // 初始化游戏
        runner.setup({
            players: ['p0', 'p1'],
            initialState: (core: SmashUpCore) => {
                // 设置基地
                core.bases = [
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
                                power: 3,
                                powerCounters: 0,
                            },
                        ],
                        ongoingActions: [],
                    },
                ];
                
                // 玩家 0 手牌中有 afterScoring 卡牌
                core.players.p0.hand = [
                    {
                        uid: 'card-1',
                        defId: 'innsmouth_return_to_the_sea',
                        type: 'action',
                    },
                ];
                
                // 设置回合
                core.currentPlayerIndex = 0;
                core.phase = 'scoreBases';
                
                return core;
            },
        });
        
        // 执行计分命令
        runner.dispatch('SCORE_BASES', { playerId: 'p0' });
        
        // 验证：afterScoring 响应窗口已打开，基地上的随从还在
        const state1 = runner.getState();
        expect(state1.sys.responseWindow?.current?.windowType).toBe('afterScoring');
        expect(state1.core.bases[0].minions).toHaveLength(1);
        
        // 跳过响应窗口
        runner.dispatch('PASS_RESPONSE', { playerId: 'p0' });
        runner.dispatch('PASS_RESPONSE', { playerId: 'p1' });
        
        // 验证：响应窗口已关闭
        const state2 = runner.getState();
        expect(state2.sys.responseWindow?.current).toBeUndefined();
        
        // 验证：基地已被清空
        expect(state2.core.bases[0].minions).toHaveLength(0);
        
        console.log('[测试] 响应窗口关闭后，基地被清空 ✅');
    });
});
