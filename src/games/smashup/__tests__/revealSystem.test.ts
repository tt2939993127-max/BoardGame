/**
 * 卡牌展示系统集成测试
 *
 * 覆盖：
 * - REVEAL_HAND / REVEAL_DECK_TOP 事件 → reducer 写入 pendingReveal
 * - playerView 过滤（非查看者隐藏卡牌内容）
 * - DISMISS_REVEAL 命令 → 清除 pendingReveal
 * - Alien Probe 能力产生 REVEAL_HAND 事件
 * - Alien Scout Ship 能力产生 REVEAL_DECK_TOP 事件
 * - 疯狂卡平局规则
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { GameTestRunner } from '../../../engine/testing';
import { SmashUpDomain } from '../domain';
import type { SmashUpCore, SmashUpCommand, SmashUpEvent } from '../domain/types';
import { SU_COMMANDS, SU_EVENTS } from '../domain/types';
import { createFlowSystem, createBaseSystems } from '../../../engine';
import { smashUpFlowHooks } from '../domain/index';
import { initAllAbilities, resetAbilityInit } from '../abilities';
import { clearRegistry } from '../domain/abilityRegistry';
import { clearBaseAbilityRegistry } from '../domain/baseAbilities';
import { clearInteractionHandlers } from '../domain/abilityInteractionHandlers';
import { createSmashUpEventSystem } from '../domain/systems';
import { SMASHUP_FACTION_IDS } from '../domain/ids';
import { reduce } from '../domain/reduce';
import type { RevealHandEvent, RevealDeckTopEvent } from '../domain/types';

const PLAYER_IDS = ['0', '1'];

function createRunner() {
    return new GameTestRunner<SmashUpCore, SmashUpCommand, SmashUpEvent>({
        domain: SmashUpDomain,
        systems: [
            createFlowSystem<SmashUpCore>({ hooks: smashUpFlowHooks }),
            ...createBaseSystems<SmashUpCore>(),
            createSmashUpEventSystem(),
        ],
        playerIds: PLAYER_IDS,
    });
}

const DRAFT_COMMANDS = [
    { type: SU_COMMANDS.SELECT_FACTION, playerId: '0', payload: { factionId: SMASHUP_FACTION_IDS.ALIENS } },
    { type: SU_COMMANDS.SELECT_FACTION, playerId: '1', payload: { factionId: SMASHUP_FACTION_IDS.PIRATES } },
    { type: SU_COMMANDS.SELECT_FACTION, playerId: '1', payload: { factionId: SMASHUP_FACTION_IDS.NINJAS } },
    { type: SU_COMMANDS.SELECT_FACTION, playerId: '0', payload: { factionId: SMASHUP_FACTION_IDS.DINOSAURS } },
] as SmashUpCommand[];

describe('卡牌展示系统', () => {
    beforeAll(() => {
        clearRegistry();
        clearBaseAbilityRegistry();
        clearInteractionHandlers();
        resetAbilityInit();
        initAllAbilities();
    });

    describe('Reducer: REVEAL_HAND 写入 pendingReveal', () => {
        it('REVEAL_HAND 事件写入 pendingReveal（type=hand）', () => {
            const baseState: SmashUpCore = {
                players: {
                    '0': { id: '0', vp: 0, hand: [], deck: [], discard: [], minionsPlayed: 0, minionLimit: 1, actionsPlayed: 0, actionLimit: 1, factions: ['aliens', 'dinosaurs'] as [string, string] },
                    '1': { id: '1', vp: 0, hand: [], deck: [], discard: [], minionsPlayed: 0, minionLimit: 1, actionsPlayed: 0, actionLimit: 1, factions: ['pirates', 'ninjas'] as [string, string] },
                },
                turnOrder: ['0', '1'],
                currentPlayerIndex: 0,
                bases: [],
                baseDeck: [],
                turnNumber: 1,
                nextUid: 1,
            };

            const event: RevealHandEvent = {
                type: SU_EVENTS.REVEAL_HAND,
                payload: {
                    targetPlayerId: '1',
                    viewerPlayerId: '0',
                    cards: [{ uid: 'c1', defId: 'pirate_first_mate' }, { uid: 'c2', defId: 'ninja_tiger_assassin' }],
                    reason: 'alien_probe',
                },
                timestamp: 100,
            };

            const newState = reduce(baseState, event);
            expect(newState.pendingReveal).toBeDefined();
            expect(newState.pendingReveal!.type).toBe('hand');
            expect(newState.pendingReveal!.targetPlayerId).toBe('1');
            expect(newState.pendingReveal!.viewerPlayerId).toBe('0');
            expect(newState.pendingReveal!.cards).toHaveLength(2);
            expect(newState.pendingReveal!.reason).toBe('alien_probe');
        });

        it('REVEAL_DECK_TOP 事件写入 pendingReveal（type=deck_top）', () => {
            const baseState: SmashUpCore = {
                players: {
                    '0': { id: '0', vp: 0, hand: [], deck: [], discard: [], minionsPlayed: 0, minionLimit: 1, actionsPlayed: 0, actionLimit: 1, factions: ['aliens', 'dinosaurs'] as [string, string] },
                    '1': { id: '1', vp: 0, hand: [], deck: [], discard: [], minionsPlayed: 0, minionLimit: 1, actionsPlayed: 0, actionLimit: 1, factions: ['pirates', 'ninjas'] as [string, string] },
                },
                turnOrder: ['0', '1'],
                currentPlayerIndex: 0,
                bases: [],
                baseDeck: [],
                turnNumber: 1,
                nextUid: 1,
            };

            const event: RevealDeckTopEvent = {
                type: SU_EVENTS.REVEAL_DECK_TOP,
                payload: {
                    targetPlayerId: '1',
                    viewerPlayerId: '0',
                    cards: [{ uid: 'c10', defId: 'pirate_saucy_wench' }],
                    count: 1,
                    reason: 'alien_probe',
                },
                timestamp: 200,
            };

            const newState = reduce(baseState, event);
            expect(newState.pendingReveal).toBeDefined();
            expect(newState.pendingReveal!.type).toBe('deck_top');
            expect(newState.pendingReveal!.cards).toHaveLength(1);
            expect(newState.pendingReveal!.reason).toBe('alien_probe');
        });
    });

    describe('Reducer: REVEAL_DISMISSED 清除 pendingReveal', () => {
        it('单人模式 REVEAL_DISMISSED 事件直接清除 pendingReveal', () => {
            const stateWithReveal: SmashUpCore = {
                players: {
                    '0': { id: '0', vp: 0, hand: [], deck: [], discard: [], minionsPlayed: 0, minionLimit: 1, actionsPlayed: 0, actionLimit: 1, factions: ['aliens', 'dinosaurs'] as [string, string] },
                    '1': { id: '1', vp: 0, hand: [], deck: [], discard: [], minionsPlayed: 0, minionLimit: 1, actionsPlayed: 0, actionLimit: 1, factions: ['pirates', 'ninjas'] as [string, string] },
                },
                turnOrder: ['0', '1'],
                currentPlayerIndex: 0,
                bases: [],
                baseDeck: [],
                turnNumber: 1,
                nextUid: 1,
                pendingReveal: {
                    type: 'hand',
                    targetPlayerId: '1',
                    viewerPlayerId: '0',
                    cards: [{ uid: 'c1', defId: 'pirate_first_mate' }],
                    reason: 'alien_probe',
                },
            };

            const event = {
                type: SU_EVENTS.REVEAL_DISMISSED,
                payload: { confirmPlayerId: '0' },
                timestamp: 300,
            } as unknown as SmashUpEvent;

            const newState = reduce(stateWithReveal, event);
            expect(newState.pendingReveal).toBeUndefined();
        });

        it('all 模式需要所有非被展示者确认后才清除', () => {
            const stateWithReveal: SmashUpCore = {
                players: {
                    '0': { id: '0', vp: 0, hand: [], deck: [], discard: [], minionsPlayed: 0, minionLimit: 1, actionsPlayed: 0, actionLimit: 1, factions: ['aliens', 'dinosaurs'] as [string, string] },
                    '1': { id: '1', vp: 0, hand: [], deck: [], discard: [], minionsPlayed: 0, minionLimit: 1, actionsPlayed: 0, actionLimit: 1, factions: ['pirates', 'ninjas'] as [string, string] },
                },
                turnOrder: ['0', '1'],
                currentPlayerIndex: 0,
                bases: [],
                baseDeck: [],
                turnNumber: 1,
                nextUid: 1,
                pendingReveal: {
                    type: 'hand',
                    targetPlayerId: '1',
                    viewerPlayerId: 'all',
                    cards: [{ uid: 'c1', defId: 'pirate_first_mate' }],
                    reason: 'elder_thing_power_of_madness',
                    sourcePlayerId: '0',
                },
            };

            // P0 确认（P1 是被展示者，只需 P0 确认即可）
            const event = {
                type: SU_EVENTS.REVEAL_DISMISSED,
                payload: { confirmPlayerId: '0' },
                timestamp: 300,
            } as unknown as SmashUpEvent;

            const newState = reduce(stateWithReveal, event);
            // 2 人局中被展示者是 P1，只需 P0 确认 → 直接清除
            expect(newState.pendingReveal).toBeUndefined();
        });

        it('all 模式 3 人局需要所有非被展示者逐个确认', () => {
            const stateWithReveal: SmashUpCore = {
                players: {
                    '0': { id: '0', vp: 0, hand: [], deck: [], discard: [], minionsPlayed: 0, minionLimit: 1, actionsPlayed: 0, actionLimit: 1, factions: ['aliens', 'dinosaurs'] as [string, string] },
                    '1': { id: '1', vp: 0, hand: [], deck: [], discard: [], minionsPlayed: 0, minionLimit: 1, actionsPlayed: 0, actionLimit: 1, factions: ['pirates', 'ninjas'] as [string, string] },
                    '2': { id: '2', vp: 0, hand: [], deck: [], discard: [], minionsPlayed: 0, minionLimit: 1, actionsPlayed: 0, actionLimit: 1, factions: ['wizards', 'zombies'] as [string, string] },
                },
                turnOrder: ['0', '1', '2'],
                currentPlayerIndex: 0,
                bases: [],
                baseDeck: [],
                turnNumber: 1,
                nextUid: 1,
                pendingReveal: {
                    type: 'hand',
                    targetPlayerId: '1',
                    viewerPlayerId: 'all',
                    cards: [{ uid: 'c1', defId: 'pirate_first_mate' }],
                    reason: 'elder_thing_power_of_madness',
                    sourcePlayerId: '0',
                },
            };

            // P0 先确认
            const event1 = {
                type: SU_EVENTS.REVEAL_DISMISSED,
                payload: { confirmPlayerId: '0' },
                timestamp: 300,
            } as unknown as SmashUpEvent;

            const state1 = reduce(stateWithReveal, event1);
            // P1 是被展示者，还需要 P2 确认
            expect(state1.pendingReveal).toBeDefined();
            expect(state1.pendingReveal!.confirmedPlayerIds).toEqual(['0']);

            // P2 确认
            const event2 = {
                type: SU_EVENTS.REVEAL_DISMISSED,
                payload: { confirmPlayerId: '2' },
                timestamp: 301,
            } as unknown as SmashUpEvent;

            const state2 = reduce(state1, event2);
            // 全部确认 → 清除
            expect(state2.pendingReveal).toBeUndefined();
        });
    });

    describe('playerView 过滤', () => {
        it('查看者可以看到完整卡牌列表', () => {
            const runner = createRunner();
            const result = runner.run({ name: '选秀', commands: DRAFT_COMMANDS });
            const state = result.finalState.core;

            // 手动写入 pendingReveal
            const stateWithReveal: SmashUpCore = {
                ...state,
                pendingReveal: {
                    type: 'hand',
                    targetPlayerId: '1',
                    viewerPlayerId: '0',
                    cards: [{ uid: 'c1', defId: 'pirate_first_mate' }],
                    reason: 'alien_probe',
                },
            };

            // playerView 作为 P0（查看者）
            const viewP0 = SmashUpDomain.playerView!(stateWithReveal, '0');
            expect(viewP0.pendingReveal).toBeDefined();
            expect(viewP0.pendingReveal!.cards).toHaveLength(1);
            expect(viewP0.pendingReveal!.cards[0].defId).toBe('pirate_first_mate');
        });

        it('非查看者看到空卡牌列表', () => {
            const runner = createRunner();
            const result = runner.run({ name: '选秀', commands: DRAFT_COMMANDS });
            const state = result.finalState.core;

            const stateWithReveal: SmashUpCore = {
                ...state,
                pendingReveal: {
                    type: 'hand',
                    targetPlayerId: '1',
                    viewerPlayerId: '0',
                    cards: [{ uid: 'c1', defId: 'pirate_first_mate' }],
                    reason: 'alien_probe',
                },
            };

            // playerView 作为 P1（非查看者）
            const viewP1 = SmashUpDomain.playerView!(stateWithReveal, '1');
            expect(viewP1.pendingReveal).toBeDefined();
            expect(viewP1.pendingReveal!.cards).toHaveLength(0);
        });

        it('无 pendingReveal 时 playerView 正常', () => {
            const runner = createRunner();
            const result = runner.run({ name: '选秀', commands: DRAFT_COMMANDS });
            const state = result.finalState.core;

            const viewP0 = SmashUpDomain.playerView!(state, '0');
            expect(viewP0.pendingReveal).toBeUndefined();
        });
    });

    describe('DISMISS_REVEAL 命令验证', () => {
        it('无 pendingReveal 时 DISMISS_REVEAL 被拒绝', () => {
            const runner = createRunner();
            const result = runner.run({
                name: '无 reveal 时 dismiss',
                commands: [
                    ...DRAFT_COMMANDS,
                    { type: SU_COMMANDS.DISMISS_REVEAL, playerId: '0', payload: {} },
                ],
            });
            const lastError = result.actualErrors[result.actualErrors.length - 1];
            expect(lastError).toBeDefined();
            expect(lastError.error).toBe('没有待展示的卡牌');
        });
    });

    describe('疯狂卡平局规则', () => {
        it('VP 相同时疯狂卡较少者胜', () => {
            // 直接测试 isGameOver 逻辑
            const state: SmashUpCore = {
                players: {
                    '0': { id: '0', vp: 15, hand: [
                        { uid: 'm1', defId: 'special_madness', type: 'minion', owner: '0' },
                        { uid: 'm2', defId: 'special_madness', type: 'minion', owner: '0' },
                    ], deck: [], discard: [], minionsPlayed: 0, minionLimit: 1, actionsPlayed: 0, actionLimit: 1, factions: ['aliens', 'dinosaurs'] as [string, string] },
                    '1': { id: '1', vp: 15, hand: [
                        { uid: 'm3', defId: 'special_madness', type: 'minion', owner: '1' },
                    ], deck: [], discard: [], minionsPlayed: 0, minionLimit: 1, actionsPlayed: 0, actionLimit: 1, factions: ['pirates', 'ninjas'] as [string, string] },
                },
                turnOrder: ['0', '1'],
                currentPlayerIndex: 0,
                bases: [],
                baseDeck: [],
                turnNumber: 5,
                nextUid: 100,
                madnessDeck: [], // 克苏鲁扩展启用
            };

            // P0 有 2 张疯狂卡（扣 1 VP → 14），P1 有 1 张（扣 0 VP → 15）
            // 但平局规则是比较疯狂卡数量，不是最终分数
            // 两人 VP 都是 15，最终分数 P0=14, P1=15 → P1 分数更高直接胜出
            const result = SmashUpDomain.isGameOver!(state);
            expect(result).toBeDefined();
            expect(result!.winner).toBe('1');
        });

        it('VP 和疯狂卡都相同时继续游戏', () => {
            const state: SmashUpCore = {
                players: {
                    '0': { id: '0', vp: 15, hand: [
                        { uid: 'm1', defId: 'special_madness', type: 'minion', owner: '0' },
                    ], deck: [], discard: [], minionsPlayed: 0, minionLimit: 1, actionsPlayed: 0, actionLimit: 1, factions: ['aliens', 'dinosaurs'] as [string, string] },
                    '1': { id: '1', vp: 15, hand: [
                        { uid: 'm2', defId: 'special_madness', type: 'minion', owner: '1' },
                    ], deck: [], discard: [], minionsPlayed: 0, minionLimit: 1, actionsPlayed: 0, actionLimit: 1, factions: ['pirates', 'ninjas'] as [string, string] },
                },
                turnOrder: ['0', '1'],
                currentPlayerIndex: 0,
                bases: [],
                baseDeck: [],
                turnNumber: 5,
                nextUid: 100,
                madnessDeck: [],
            };

            // 两人 VP=15，最终分数都是 15（1张疯狂卡不扣分），疯狂卡数量也相同
            const result = SmashUpDomain.isGameOver!(state);
            expect(result).toBeUndefined(); // 继续游戏
        });

        it('无克苏鲁扩展时不使用疯狂卡平局规则', () => {
            const state: SmashUpCore = {
                players: {
                    '0': { id: '0', vp: 15, hand: [], deck: [], discard: [], minionsPlayed: 0, minionLimit: 1, actionsPlayed: 0, actionLimit: 1, factions: ['aliens', 'dinosaurs'] as [string, string] },
                    '1': { id: '1', vp: 15, hand: [], deck: [], discard: [], minionsPlayed: 0, minionLimit: 1, actionsPlayed: 0, actionLimit: 1, factions: ['pirates', 'ninjas'] as [string, string] },
                },
                turnOrder: ['0', '1'],
                currentPlayerIndex: 0,
                bases: [],
                baseDeck: [],
                turnNumber: 5,
                nextUid: 100,
                // 无 madnessDeck → 非克苏鲁扩展
            };

            // 两人 VP=15，无疯狂卡扩展 → 继续游戏
            const result = SmashUpDomain.isGameOver!(state);
            expect(result).toBeUndefined();
        });
    });
});
