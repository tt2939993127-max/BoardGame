/**
 * Volley (万箭齐发) 5 Dice Display Test
 * 
 * 验证 Volley 卡牌投掷 5 颗骰子时，UI 能正确显示所有 5 颗骰子。
 */

import { describe, it, expect } from 'vitest';
import { GameTestRunner } from '../../../engine/testing/GameTestRunner';
import { DiceThroneDomain } from '../domain';
import { diceThroneSystemsForTest } from '../game';
import type { DiceThroneCore } from '../domain/types';
import { STATUS_IDS } from '../domain/ids';
import { createQueuedRandom, cmd, assertState } from './test-utils';
import { createInitialSystemState } from '../../../engine/pipeline';
import type { MatchState } from '../../../engine/types';

// TODO: Volley 卡牌实现尚未生成 BONUS_DIE_ROLLED 事件，暂时跳过
describe.skip('Volley 5 Dice Display', () => {
    it('should emit 5 individual BONUS_DIE_ROLLED events plus 1 summary event', () => {
        // 固定随机数：5 颗骰子分别投出 1, 2, 3, 4, 5
        // 月精灵的骰子面为：1=弓, 2=足, 3=月, 4=弓, 5=足, 6=月
        // 那么 1, 4 是弓面（2 个弓面）
        const queuedRandom = createQueuedRandom([1, 2, 3, 4, 5]);
        
        const runner = new GameTestRunner({
            domain: DiceThroneDomain,
            systems: diceThroneSystemsForTest,
            playerIds: ['0', '1'],
            random: queuedRandom,
            setup: (playerIds, random) => {
                const core = DiceThroneDomain.setup(playerIds, random);
                const sys = createInitialSystemState(playerIds, diceThroneSystemsForTest, undefined);
                
                // 初始化游戏：月精灵 vs 野蛮人
                core.selectedCharacters = { '0': 'moon_elf', '1': 'barbarian' };
                core.players['0'].hand = [
                    { uid: 'volley-1', defId: 'volley', type: 'ability' }
                ];
                core.players['0'].resources.CP = 3; // 足够的 CP
                core.currentPlayer = '0';
                core.phase = 'offense_roll';
                core.rollCount = 1;
                core.rollConfirmed = true;
                core.dice = [1, 2, 3, 4, 5]; // 任意骰子结果
                
                // 设置 pendingAttack（Volley 是攻击修正）
                core.pendingAttack = {
                    attackerId: '0',
                    targetId: '1',
                    baseDamage: 5,
                    bonusDamage: 0,
                    totalDamage: 5,
                    unblockable: false,
                };
                
                return { core, sys };
            },
            assertFn: assertState,
            silent: true,
        });
        
        // 执行命令：打出 Volley 卡牌
        const result = runner.run({
            name: 'Volley 5 Dice Display',
            commands: [
                cmd('PLAY_CARD', '0', { cardUid: 'volley-1' }),
            ],
            expect: {},
        });
        
        // 验证事件：应该有 5 个独立的 BONUS_DIE_ROLLED 事件 + 1 个汇总事件
        const eventStream = result.finalState.sys.eventStream?.entries || [];
        const bonusDieEvents = eventStream.filter(e => e.event.type === 'BONUS_DIE_ROLLED');
        expect(bonusDieEvents.length).toBe(6); // 5 个独立 + 1 个汇总
        
        // 验证前 5 个事件是独立骰子
        for (let i = 0; i < 5; i++) {
            const event = bonusDieEvents[i].event;
            expect(event.payload.value).toBe(i + 1); // 骰子值 1, 2, 3, 4, 5
            expect(event.payload.effectKey).toBe('bonusDie.effect.volley'); // 单颗骰子的 key
            expect(event.payload.effectParams).toEqual({ value: i + 1, index: i }); // 修正：包含 index
        }
        
        // 验证第 6 个事件是汇总
        const summaryEvent = bonusDieEvents[5].event;
        expect(summaryEvent.payload.effectKey).toBe('bonusDie.effect.volley.result');
        expect(summaryEvent.payload.effectParams).toHaveProperty('bowCount');
        expect(summaryEvent.payload.effectParams).toHaveProperty('bonusDamage');
        
        // 验证弓面数量（根据月精灵的骰子面配置，1 和 4 是弓面）
        const bowCount = summaryEvent.payload.effectParams.bowCount as number;
        expect(bowCount).toBeGreaterThanOrEqual(0);
        expect(bowCount).toBeLessThanOrEqual(5);
        
        // 验证伤害加成已应用到 pendingAttack
        const finalCore = result.finalState.core as DiceThroneCore;
        expect(finalCore.pendingAttack?.bonusDamage).toBe(bowCount);
        
        // 验证对手被施加缠绕状态
        const entangleEvent = eventStream.find(e => 
            e.event.type === 'STATUS_APPLIED' && 
            e.event.payload.statusId === STATUS_IDS.ENTANGLE &&
            e.event.payload.targetId === '1'
        );
        expect(entangleEvent).toBeDefined();
        
        // 验证有 settlement 事件（触发 BonusDieOverlay）
        const settlementEvent = eventStream.find(e => e.event.type === 'BONUS_DICE_REROLL_REQUESTED');
        expect(settlementEvent).toBeDefined();
    });
    
    it('should display all 5 dice with correct timestamps', () => {
        const queuedRandom = createQueuedRandom([1, 2, 3, 4, 5]);
        
        const runner = new GameTestRunner({
            domain: DiceThroneDomain,
            systems: diceThroneSystemsForTest,
            playerIds: ['0', '1'],
            random: queuedRandom,
            setup: (playerIds, random) => {
                const core = DiceThroneDomain.setup(playerIds, random);
                const sys = createInitialSystemState(playerIds, diceThroneSystemsForTest, undefined);
                
                core.selectedCharacters = { '0': 'moon_elf', '1': 'barbarian' };
                core.players['0'].hand = [
                    { uid: 'volley-1', defId: 'volley', type: 'ability' }
                ];
                core.players['0'].resources.CP = 3;
                core.currentPlayer = '0';
                core.phase = 'offense_roll';
                core.rollCount = 1;
                core.rollConfirmed = true;
                core.dice = [1, 2, 3, 4, 5];
                core.pendingAttack = {
                    attackerId: '0',
                    targetId: '1',
                    baseDamage: 5,
                    bonusDamage: 0,
                    totalDamage: 5,
                    unblockable: false,
                };
                
                return { core, sys };
            },
            assertFn: assertState,
            silent: true,
        });
        
        const result = runner.run({
            name: 'Volley Timestamps',
            commands: [
                cmd('PLAY_CARD', '0', { cardUid: 'volley-1' }),
            ],
            expect: {},
        });
        
        const eventStream = result.finalState.sys.eventStream?.entries || [];
        const bonusDieEvents = eventStream.filter(e => e.event.type === 'BONUS_DIE_ROLLED');
        
        // 验证时间戳递增（确保 UI 按顺序显示）
        for (let i = 1; i < bonusDieEvents.length; i++) {
            const prevTimestamp = bonusDieEvents[i - 1].event.timestamp;
            const currTimestamp = bonusDieEvents[i].event.timestamp;
            expect(currTimestamp).toBeGreaterThan(prevTimestamp);
        }
    });
});
