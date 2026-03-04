/**
 * afterScoring 响应窗口交互锁定测试
 * 
 * 验证 interactionLock 配置是否正确阻止响应窗口在交互完成前推进
 */

import { describe, it, expect } from 'vitest';
import { GameTestRunner } from '../../../engine/testing/GameTestRunner';
import { SmashUpDomain } from '../domain';
import { smashUpSystemsForTest } from '../game';
import type { SmashUpCore } from '../domain/types';
import type { MatchState, PlayerId, RandomFn } from '../../../engine/types';
import { createInitialSystemState } from '../../../engine/pipeline';

describe('afterScoring 响应窗口交互锁定', () => {
    it('打出创建交互的卡牌时，响应窗口应该等待交互完成后再推进', () => {
        const runner = new GameTestRunner<SmashUpCore, any, any>({
            domain: SmashUpDomain,
            systems: smashUpSystemsForTest,
            playerIds: ['0', '1'],
            random: {
                random: () => 0.5,
                d: (max) => Math.ceil(max / 2),
                range: (min, max) => Math.floor((min + max) / 2),
                shuffle: (arr) => [...arr],
            },
            setup: (playerIds: PlayerId[], random: RandomFn): MatchState<SmashUpCore> => {
                const core = SmashUpDomain.setup(playerIds, random);
                const sys = createInitialSystemState(playerIds, smashUpSystemsForTest, undefined);
                
                // 玩家 0 手牌：我们乃最强（创建交互）
                core.players['0'].hand = [
                    { uid: 'card-1', defId: 'giant_ant_we_are_the_champions', type: 'action', owner: '0' },
                ];
                
                // 玩家 1 无手牌
                core.players['1'].hand = [];
                
                // 基地 0：母舰（breakpoint=10），玩家 0 有 1 个随从（power=5）
                core.bases[0] = {
                    defId: 'base_the_mothership',
                    minions: [
                        { uid: 'minion-1', defId: 'ninja_shinobi', controller: '0', owner: '0', powerCounters: 0 },
                    ],
                    ongoingActions: [],
                };
                
                // 玩家 0 弃牌堆：1 个随从（用于"我们乃最强"选择来源）
                core.players['0'].discard = [
                    { uid: 'minion-2', defId: 'robot_microbot_alpha', type: 'minion', owner: '0' },
                ];
                
                // 设置阶段为 scoreBases，触发计分
                core.phase = 'scoreBases';
                core.currentPlayerIndex = 0;
                
                return { core, sys };
            },
        });
        
        // 1. 触发计分，应该打开 afterScoring 响应窗口
        runner.dispatch('ADVANCE_PHASE', { playerId: '0' });
        
        // 验证响应窗口已打开
        const state1 = runner.getState();
        expect(state1.sys.responseWindow?.current).toBeDefined();
        expect(state1.sys.responseWindow?.current?.windowType).toBe('afterScoring');
        expect(state1.sys.responseWindow?.current?.responderQueue).toEqual(['0', '1']);
        expect(state1.sys.responseWindow?.current?.currentResponderIndex).toBe(0);
        
        // 2. 玩家 0 打出"我们乃最强"（创建交互）
        runner.dispatch('su:play_action', { playerId: '0', cardUid: 'card-1', targetBaseIndex: 0 });
        
        // 验证交互已创�?
        const state2 = runner.getState();
        expect(state2.sys.interaction?.current).toBeDefined();
        expect(state2.sys.interaction?.current?.kind).toBe('simple-choice');
        
        // 【关键验证】响应窗口应该被锁定（pendingInteractionId 已设置）
        expect(state2.sys.responseWindow?.current).toBeDefined();
        expect(state2.sys.responseWindow?.current?.pendingInteractionId).toBeDefined();
        expect(state2.sys.responseWindow?.current?.currentResponderIndex).toBe(0); // 仍然是玩家 0
        
        // 【关键验证】基地应该还在（未被清除）
        expect(state2.core.bases[0]).toBeDefined();
        expect(state2.core.bases[0].minions).toHaveLength(1);
        
        // 3. 玩家 0 完成交互（选择从弃牌堆返回随从）
        const interactionId = state2.sys.interaction!.current!.id;
        runner.dispatch('SYS_INTERACTION_RESPOND', { playerId: '0', interactionId, optionId: 'discard-minion-2' });
        
        // 验证交互已完成
        const state3 = runner.getState();
        expect(state3.sys.interaction?.current).toBeUndefined();
        
        // 【关键验证】响应窗口应该已解锁并推进到下一个玩家
        expect(state3.sys.responseWindow?.current).toBeDefined();
        expect(state3.sys.responseWindow?.current?.pendingInteractionId).toBeUndefined();
        expect(state3.sys.responseWindow?.current?.currentResponderIndex).toBe(1); // 推进到玩家 1
        
        // 【关键验证】基地应该还在（因为玩家 1 还没有响应）
        expect(state3.core.bases[0]).toBeDefined();
        
        // 4. 玩家 1 跳过响应
        runner.dispatch('RESPONSE_PASS', { playerId: '1' });
        
        // 验证响应窗口已关闭
        const state4 = runner.getState();
        expect(state4.sys.responseWindow?.current).toBeUndefined();
        
        // 【关键验证】基地应该已被清除（响应窗口关闭后触发）
        expect(state4.core.bases[0]).toBeDefined();
        expect(state4.core.bases[0].minions).toHaveLength(0); // 随从已清除
    });
    
    it('打出不创建交互的卡牌时，响应窗口应该立即推进', () => {
        const runner = new GameTestRunner<SmashUpCore, any, any>({
            domain: SmashUpDomain,
            systems: smashUpSystemsForTest,
            playerIds: ['0', '1'],
            random: {
                random: () => 0.5,
                d: (max) => Math.ceil(max / 2),
                range: (min, max) => Math.floor((min + max) / 2),
                shuffle: (arr) => [...arr],
            },
            setup: (playerIds: PlayerId[], random: RandomFn): MatchState<SmashUpCore> => {
                const core = SmashUpDomain.setup(playerIds, random);
                const sys = createInitialSystemState(playerIds, smashUpSystemsForTest, undefined);
                
                // 玩家 0 手牌：重返深海（不创建交互，因为没有其他基地上的己方随从）
                core.players['0'].hand = [
                    { uid: 'card-1', defId: 'innsmouth_return_to_the_sea', type: 'action', owner: '0' },
                ];
                
                // 玩家 1 无手牌
                core.players['1'].hand = [];
                
                // 基地 0：母舰（breakpoint=10），玩家 0 有 1 个随从（power=5）
                core.bases[0] = {
                    defId: 'base_the_mothership',
                    minions: [
                        { uid: 'minion-1', defId: 'ninja_shinobi', controller: '0', owner: '0', powerCounters: 0 },
                    ],
                    ongoingActions: [],
                };
                
                // 没有其他基地上的随从，所以"重返深海"不会创建交互
                
                // 设置阶段为 scoreBases，触发计分
                core.phase = 'scoreBases';
                core.currentPlayerIndex = 0;
                
                return { core, sys };
            },
        });
        
        // 1. 触发计分并打出卡�?
        runner.dispatch('ADVANCE_PHASE', { playerId: '0' });
        runner.dispatch('su:play_action', { playerId: '0', cardUid: 'card-1', targetBaseIndex: 0 });
        
        // 验证没有交互
        const state = runner.getState();
        expect(state.sys.interaction?.current).toBeUndefined();
        
        // 【关键验证】响应窗口应该已关闭（因为玩家 1 没有可响应内容，自动跳过）
        expect(state.sys.responseWindow?.current).toBeUndefined();
        
        // 【关键验证】基地应该已被清除（响应窗口关闭后触发）
        expect(state.core.bases[0]).toBeDefined();
        expect(state.core.bases[0].minions).toHaveLength(0); // 随从已清除
    });
});
