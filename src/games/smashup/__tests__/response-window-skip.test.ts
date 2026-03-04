/**
 * 响应窗口跳过逻辑测试
 * 验证修复：重新开始一轮时跳过没有可响应内容的玩家
 */

import { describe, it, expect } from 'vitest';
import { GameTestRunner } from '../../../engine/testing';
import { SmashUpDomain } from '../domain';
import { smashUpSystemsForTest } from '../game';
import type { SmashUpCore, MinionOnBase } from '../domain/types';
import type { MatchState, PlayerId, RandomFn } from '../../../engine/types';
import { createInitialSystemState } from '../../../engine/pipeline';

describe('响应窗口跳过逻辑', () => {
    it('重新开始一轮时应跳过没有可响应内容的玩家', () => {
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
                
                // 构造场景：
                // - 玩家 0 手牌中有 special 卡（wizard_portal）
                // - 玩家 1 手牌中没有 special 卡
                // - 基地即将计分
                core.factionSelection = undefined;
                sys.phase = 'playCards';
                
                // 替换第一个基地为低临界点基地
                core.bases[0] = {
                    defId: 'base_the_mothership', // 临界点 20
                    minions: [],
                    ongoingActions: [],
                };
                
                // 添加足够的随从达到临界点（25 > 20）
                const fakeMinions: MinionOnBase[] = Array.from({ length: 5 }, (_, i) => ({
                    uid: `fake-${i}`,
                    defId: 'test_minion',
                    owner: '0',
                    controller: '0',
                    basePower: 5,
                    powerModifier: 0,
                    tempPowerModifier: 0,
                    powerCounters: 0,
                    attachedActions: [],
                    talentUsed: false,
                }));
                core.bases[0].minions = fakeMinions;
                
                // 玩家 0 有 special 卡（pirate_full_sail - 简单的 special 卡，不需要交互），玩家 1 没有
                core.players['0'].hand = [
                    { uid: 'card-1', defId: 'pirate_full_sail', type: 'action', owner: '0' },
                ];
                core.players['1'].hand = [
                    { uid: 'card-2', defId: 'robot_microbot_alpha', type: 'minion', owner: '1' },
                ];
                
                return { core, sys };
            },
        });
        
        // 推进到 scoreBases 阶段
        runner.dispatch('ADVANCE_PHASE', { playerId: '0' });
        
        // 验证：Me First! 窗口打开，且当前响应者是玩家 0（有 special 卡）
        const state1 = runner.getState();
        expect(state1.sys.responseWindow?.current).toBeDefined();
        expect(state1.sys.responseWindow?.current?.windowType).toBe('meFirst');
        expect(state1.sys.responseWindow?.current?.responderQueue).toEqual(['0', '1']);
        expect(state1.sys.responseWindow?.current?.currentResponderIndex).toBe(0);
        
        // 玩家 0 打出 special 卡（pirate_full_sail - 不创建交互）
        runner.dispatch('su:play_action', {
            playerId: '0',
            cardUid: 'card-1',
            targetBaseIndex: 0,
        });
        
        // 验证：窗口仍然打开，推进到玩家 1，但玩家 1 没有 special 卡，应该被跳过，重新回到玩家 0
        const state2 = runner.getState();
        console.log('[Test] After player 0 plays card:', {
            hasWindow: !!state2.sys.responseWindow?.current,
            currentResponderIndex: state2.sys.responseWindow?.current?.currentResponderIndex,
            actionTakenThisRound: state2.sys.responseWindow?.current?.actionTakenThisRound,
        });
        
        // 【关键验证】重新开始一轮时，应该跳过玩家 1（没有 special 卡），直接回到玩家 0
        // 如果修复生效，currentResponderIndex 应该是 0
        // 如果修复未生效，currentResponderIndex 会是 1（玩家 1 没有牌但仍然轮到他）
        expect(state2.sys.responseWindow?.current).toBeDefined();
        expect(state2.sys.responseWindow?.current?.currentResponderIndex).toBe(0);
        
        // 玩家 0 pass
        runner.dispatch('RESPONSE_PASS', { playerId: '0' });
        
        // 验证：窗口关闭（因为玩家 1 没有 special 卡，被自动跳过）
        const state3 = runner.getState();
        expect(state3.sys.responseWindow?.current).toBeUndefined();
    });
    
    it('所有玩家都没有可响应内容时应立即关闭窗口', () => {
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
                
                // 构造场景：两个玩家都没有 special 卡
                core.factionSelection = undefined;
                sys.phase = 'playCards';
                
                // 替换第一个基地为低临界点基地
                core.bases[0] = {
                    defId: 'base_the_mothership', // 临界点 20
                    minions: [],
                    ongoingActions: [],
                };
                
                // 添加足够的随从达到临界点（25 > 20）
                const fakeMinions: MinionOnBase[] = Array.from({ length: 5 }, (_, i) => ({
                    uid: `fake-${i}`,
                    defId: 'test_minion',
                    owner: '0',
                    controller: '0',
                    basePower: 5,
                    powerModifier: 0,
                    tempPowerModifier: 0,
                    powerCounters: 0,
                    attachedActions: [],
                    talentUsed: false,
                }));
                core.bases[0].minions = fakeMinions;
                
                // 两个玩家都没有 special 卡
                core.players['0'].hand = [
                    { uid: 'card-1', defId: 'robot_microbot_alpha', type: 'minion', owner: '0' },
                ];
                core.players['1'].hand = [
                    { uid: 'card-2', defId: 'robot_microbot_alpha', type: 'minion', owner: '1' },
                ];
                
                return { core, sys };
            },
        });
        
        // 推进到 scoreBases 阶段
        runner.dispatch('ADVANCE_PHASE', { playerId: '0' });
        
        // 验证：窗口应该立即关闭（因为所有玩家都没有 special 卡）
        const state = runner.getState();
        expect(state.sys.responseWindow?.current).toBeUndefined();
    });
});
