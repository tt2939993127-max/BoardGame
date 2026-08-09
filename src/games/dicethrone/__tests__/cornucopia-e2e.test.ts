/**
 * 聚宝盆端到端测试
 * 验证一级只抽牌，二级才追加弃牌/CP效果
 */

import { describe, it, expect } from 'vitest';
import { GameTestRunner } from '../../../engine/testing';
import { DiceThroneDomain } from '../domain';
import { diceThroneSystemsForTest } from '../game';
import { createQueuedRandom, cmd, assertState, advanceTo, getDefenderChoicePrompt } from './test-utils';
import { createInitialSystemState, executePipeline } from '../../../engine/pipeline';
import type { MatchState, PlayerId, RandomFn } from '../../../engine/types';
import type { DiceThroneCore, DiceThroneCommand } from '../domain/types';
import { initHeroState } from '../domain/characters';
import { CORNUCOPIA_2 } from '../heroes/shadow_thief/abilities';

const shadowThiefSetupCommands = [
    { type: 'SELECT_CHARACTER', playerId: '0', payload: { characterId: 'shadow_thief' } },
    { type: 'SELECT_CHARACTER', playerId: '1', payload: { characterId: 'barbarian' } },
    { type: 'PLAYER_READY', playerId: '1', payload: {} },
    { type: 'HOST_START_GAME', playerId: '0', payload: {} },
];

function createShadowThiefState(playerIds: PlayerId[], random: RandomFn): MatchState<DiceThroneCore> {
    const core = DiceThroneDomain.setup(playerIds, random);
    const sys = createInitialSystemState(playerIds, diceThroneSystemsForTest, undefined);
    let state: MatchState<DiceThroneCore> = { sys, core };
    const pipelineConfig = { domain: DiceThroneDomain, systems: diceThroneSystemsForTest };
    for (const c of shadowThiefSetupCommands) {
        const command = { type: c.type, playerId: c.playerId, payload: c.payload, timestamp: Date.now() } as DiceThroneCommand;
        const result = executePipeline(pipelineConfig, state, command, random, playerIds);
        if (result.success) state = result.state as MatchState<DiceThroneCore>;
    }
    state.core.selectedCharacters['1'] = 'shadow_thief';
    state.core.players['1'] = initHeroState('1', 'shadow_thief', random);
    return state;
}

function createShadowThiefFourPlayerState(playerIds: PlayerId[], random: RandomFn): MatchState<DiceThroneCore> {
    const core = DiceThroneDomain.setup(playerIds, random);
    const sys = createInitialSystemState(playerIds, diceThroneSystemsForTest, undefined);
    let state: MatchState<DiceThroneCore> = { sys, core };
    const pipelineConfig = { domain: DiceThroneDomain, systems: diceThroneSystemsForTest };

    const setupCommands = [
        { type: 'SELECT_CHARACTER', playerId: '0', payload: { characterId: 'shadow_thief' } },
        { type: 'SELECT_CHARACTER', playerId: '1', payload: { characterId: 'barbarian' } },
        { type: 'SELECT_CHARACTER', playerId: '2', payload: { characterId: 'samurai' } },
        { type: 'SELECT_CHARACTER', playerId: '3', payload: { characterId: 'monk' } },
        { type: 'PLAYER_READY', playerId: '1', payload: {} },
        { type: 'PLAYER_READY', playerId: '2', payload: {} },
        { type: 'PLAYER_READY', playerId: '3', payload: {} },
        { type: 'HOST_START_GAME', playerId: '0', payload: {} },
    ];

    for (const c of setupCommands) {
        const command = { type: c.type, playerId: c.playerId, payload: c.payload, timestamp: Date.now() } as DiceThroneCommand;
        const result = executePipeline(pipelineConfig, state, command, random, playerIds);
        if (result.success) state = result.state as MatchState<DiceThroneCore>;
    }

    return state;
}

describe('聚宝盆效果端到端测试', () => {
    it('聚宝盆 I 级：2 Card + 1 Shadow → 只抽2牌，不弃对手牌', () => {
        // 骰子序列：进攻掷骰 5 次 → [5,5,6,1,2] = 2 Card + 1 Shadow + 2 Dagger
        const queuedRandom = createQueuedRandom([5, 5, 6, 1, 2]);
        
        let player1InitialHandCount = 0;

        const runner = new GameTestRunner({
            domain: DiceThroneDomain,
            systems: diceThroneSystemsForTest,
            playerIds: ['0', '1'],
            random: queuedRandom,
            setup: (playerIds, random) => {
                const state = createShadowThiefState(playerIds, random);
                // 清空玩家0手牌（避免响应窗口干扰）
                state.core.players['0'].hand = [];
                // 记录玩家1初始手牌数
                player1InitialHandCount = state.core.players['1'].hand.length;
                return state;
            },
            assertFn: assertState,
            silent: true,
        });

        const result = runner.run({
            name: '聚宝盆 I 级只抽牌不弃牌',
            commands: [
                cmd('ADVANCE_PHASE', '0'), // main1 → offensiveRoll
                cmd('ROLL_DICE', '0'),     // 掷骰 → [5,5,6,1,2]
                cmd('CONFIRM_ROLL', '0'),
                cmd('SELECT_ABILITY', '0', { abilityId: 'cornucopia' }),
                cmd('ADVANCE_PHASE', '0'), // offensiveRoll → main2（触发聚宝盆）
            ],
            expect: {
                turnPhase: 'main2',
                players: {
                    '0': {
                        // 玩家0应该抽了2张牌（1×2个Card面 = 2张）
                        handCount: 2,
                    },
                    '1': { handCount: player1InitialHandCount },
                },
            },
        });

        expect(result.assertionErrors).toHaveLength(0);

        // 额外验证：检查事件流
        const eventStream = result.finalState.sys.eventStream?.entries || [];
        const cardDrawnEvents = eventStream.filter(e => e.event.type === 'CARD_DRAWN');
        const cardDiscardedEvents = eventStream.filter(e => e.event.type === 'CARD_DISCARDED');

        console.log(`CARD_DRAWN 事件数: ${cardDrawnEvents.length}`);
        console.log(`CARD_DISCARDED 事件数: ${cardDiscardedEvents.length}`);

        expect(cardDrawnEvents.length).toBe(2); // 抽2张牌（1×2个Card面）
        expect(cardDiscardedEvents.length).toBe(0);
    });

    it('聚宝盆 I 级：2 Card + 0 Shadow → 抽2牌 + 不弃牌', () => {
        // 骰子序列：进攻掷骰 5 次 → [5,5,1,2,3] = 2 Card + 0 Shadow + 3 其他
        const queuedRandom = createQueuedRandom([5, 5, 1, 2, 3]);
        
        let player1InitialHandCount = 0;

        const runner = new GameTestRunner({
            domain: DiceThroneDomain,
            systems: diceThroneSystemsForTest,
            playerIds: ['0', '1'],
            random: queuedRandom,
            setup: (playerIds, random) => {
                const state = createShadowThiefState(playerIds, random);
                state.core.players['0'].hand = [];
                player1InitialHandCount = state.core.players['1'].hand.length;
                return state;
            },
            assertFn: assertState,
            silent: true,
        });

        const result = runner.run({
            name: '聚宝盆 I 级无Shadow不弃牌',
            commands: [
                cmd('ADVANCE_PHASE', '0'),
                cmd('ROLL_DICE', '0'),
                cmd('CONFIRM_ROLL', '0'),
                cmd('SELECT_ABILITY', '0', { abilityId: 'cornucopia' }),
                cmd('ADVANCE_PHASE', '0'),
            ],
            expect: {
                turnPhase: 'main2',
                players: {
                    '0': { handCount: 2 }, // 1×2个Card面 = 2张
                    '1': { handCount: player1InitialHandCount }, // 手牌数不变
                },
            },
        });

        expect(result.assertionErrors).toHaveLength(0);

        // 验证没有弃牌事件
        const eventStream = result.finalState.sys.eventStream?.entries || [];
        const cardDiscardedEvents = eventStream.filter(e => e.event.type === 'CARD_DISCARDED');
        expect(cardDiscardedEvents.length).toBe(0);

        console.log(`✅ 无Shadow时不弃牌`);
    });

    it('4 人模式：一级不要求 targetingRoll，只抽牌不弃任一对手牌', () => {
        const queuedRandom = createQueuedRandom([5, 5, 6, 1, 2]);

        let player1InitialHandCount = 0;
        let player2InitialHandCount = 0;
        let player3InitialHandCount = 0;

        const runner = new GameTestRunner({
            domain: DiceThroneDomain,
            systems: diceThroneSystemsForTest,
            playerIds: ['0', '1', '2', '3'],
            random: queuedRandom,
            setup: (playerIds, random) => {
                const state = createShadowThiefFourPlayerState(playerIds, random);
                state.core.players['0'].hand = [];
                player1InitialHandCount = state.core.players['1'].hand.length;
                player2InitialHandCount = state.core.players['2'].hand.length;
                player3InitialHandCount = state.core.players['3'].hand.length;
                return state;
            },
            assertFn: assertState,
            silent: true,
        });

        const result = runner.run({
            name: '聚宝盆 I 级 4 人不要求 targetingRoll 且不弃牌回归',
            commands: [
                ...advanceTo('offensiveRoll', '0'),
                cmd('ROLL_DICE', '0'),
                cmd('CONFIRM_ROLL', '0'),
                cmd('SELECT_ABILITY', '0', { abilityId: 'cornucopia' }),
                cmd('ADVANCE_PHASE', '0'),
            ],
            expect: {
                turnPhase: 'main2',
                players: {
                    '0': { handCount: 2 },
                    '1': { handCount: player1InitialHandCount },
                    '2': { handCount: player2InitialHandCount },
                    '3': { handCount: player3InitialHandCount },
                },
            },
        });

        expect(result.assertionErrors).toHaveLength(0);

        const eventStream = result.finalState.sys.eventStream?.entries || [];
        const cardDrawnEvents = eventStream.filter(e => e.event.type === 'CARD_DRAWN');
        const cardDiscardedEvents = eventStream.filter(e => e.event.type === 'CARD_DISCARDED');

        expect(cardDrawnEvents.length).toBe(2);
        expect(cardDiscardedEvents.length).toBe(0);
    });

    it('4 人模式：卡牌大师 II 的弃牌需要先索敌并只作用于选中的对手', () => {
        const queuedRandom = createQueuedRandom([5, 5, 6, 1, 2, 6]);
        const playerIds: PlayerId[] = ['0', '1', '2', '3'];
        let player1InitialHandCount = 0;
        let player3InitialHandCount = 0;

        const runner = new GameTestRunner({
            domain: DiceThroneDomain,
            systems: diceThroneSystemsForTest,
            playerIds,
            random: queuedRandom,
            setup: (playerIds, random) => {
                const state = createShadowThiefFourPlayerState(playerIds, random);
                state.core.players['0'].hand = [];
                state.core.players['0'].abilities = state.core.players['0'].abilities.map((ability) => (
                    ability.id === 'cornucopia' ? CORNUCOPIA_2 : ability
                ));
                state.core.players['0'].abilityLevels.cornucopia = 2;
                player1InitialHandCount = state.core.players['1'].hand.length;
                player3InitialHandCount = state.core.players['3'].hand.length;
                return state;
            },
            assertFn: assertState,
            silent: true,
        });

        const result = runner.run({
            name: '卡牌大师 II 4 人索敌后弃选中对手牌',
            commands: [
                ...advanceTo('offensiveRoll', '0'),
                cmd('ROLL_DICE', '0'),
                cmd('CONFIRM_ROLL', '0'),
                cmd('SELECT_ABILITY', '0', { abilityId: 'cornucopia' }),
                cmd('ADVANCE_PHASE', '0'),
                cmd('ROLL_DICE', '0'),
                cmd('CONFIRM_ROLL', '0'),
                cmd('ADVANCE_PHASE', '0'),
            ],
        });

        expect(result.finalState.sys.phase).toBe('targetingRoll');
        const defenderPrompt = getDefenderChoicePrompt(result.finalState);
        expect(defenderPrompt.playerId).toBe('0');
        const options = defenderPrompt.options as Array<{ customId: string }>;
        expect(options.map((option) => option.customId).sort()).toEqual(['select-target:1', 'select-target:3']);

        const resolveResult = executePipeline(
            { domain: DiceThroneDomain, systems: diceThroneSystemsForTest },
            result.finalState,
            {
                type: 'SELECT_DEFENDER_TARGET',
                playerId: '0',
                payload: { defenderId: '3' },
                timestamp: Date.now(),
            } as DiceThroneCommand,
            queuedRandom,
            playerIds,
        );

        expect(resolveResult.success).toBe(true);
        if (!resolveResult.success) return;

        const finalState = resolveResult.state as MatchState<DiceThroneCore>;
        expect(finalState.sys.phase).toBe('main2');
        expect(finalState.core.players['0'].hand).toHaveLength(2);
        expect(finalState.core.players['1'].hand).toHaveLength(player1InitialHandCount);
        expect(finalState.core.players['3'].hand).toHaveLength(player3InitialHandCount - 1);
    });
});
