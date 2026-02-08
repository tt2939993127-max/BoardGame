/**
 * 大杀四方 - 多基地记分与平局 VP 测试
 *
 * 覆盖 Property 15: 记分循环完整性
 * 覆盖 Property 16: 平局 VP 分配（FlowHooks 层面）
 */

import { describe, expect, it, beforeAll } from 'vitest';
import { smashUpFlowHooks } from '../domain/index';
import { initAllAbilities } from '../abilities';
import type { SmashUpCore, MinionOnBase, PlayerState } from '../domain/types';
import { SU_EVENTS } from '../domain/types';
import type { GameEvent, MatchState, Command, RandomFn } from '../../../engine/types';

beforeAll(() => {
    initAllAbilities();
});

function makeMinion(uid: string, controller: string, power: number, defId = 'd1'): MinionOnBase {
    return {
        uid, defId, controller, owner: controller,
        basePower: power, powerModifier: 0,
        talentUsed: false, attachedActions: [],
    };
}

function makePlayer(id: string, factions: [string, string] = ['aliens', 'dinosaurs']): PlayerState {
    return {
        id, vp: 0, hand: [], deck: [], discard: [],
        minionsPlayed: 0, minionLimit: 1,
        actionsPlayed: 0, actionLimit: 1,
        factions,
    };
}

const mockRandom: RandomFn = {
    shuffle: <T>(arr: T[]) => [...arr],
    random: () => 0.5,
} as any;

const mockCommand: Command = { type: 'ADVANCE_PHASE', playerId: '0', payload: undefined } as any;

function callOnPhaseEnter(core: SmashUpCore): GameEvent[] {
    const result = smashUpFlowHooks.onPhaseEnter!({
        state: { core, sys: { phase: 'scoreBases' } } as MatchState<SmashUpCore>,
        from: 'playCards',
        to: 'scoreBases',
        command: mockCommand,
        random: mockRandom,
    });
    return result ?? [];
}

describe('Property 15: 多基地记分循环', () => {
    it('两个基地同时达到临界点时都被记分', () => {
        // base_the_jungle: breakpoint=12, base_tar_pits: breakpoint=16
        const core: SmashUpCore = {
            players: { '0': makePlayer('0'), '1': makePlayer('1', ['pirates', 'ninjas']) },
            turnOrder: ['0', '1'],
            currentPlayerIndex: 0,
            bases: [
                { defId: 'base_the_jungle', minions: [makeMinion('m1', '0', 15)], ongoingActions: [] },
                { defId: 'base_tar_pits', minions: [makeMinion('m2', '1', 20)], ongoingActions: [] },
            ],
            baseDeck: ['base_central_brain', 'base_locker_room'],
            turnNumber: 1,
            nextUid: 100,
        };

        const events = callOnPhaseEnter(core);
        const scoredEvents = events.filter((e: GameEvent) => e.type === SU_EVENTS.BASE_SCORED);
        expect(scoredEvents.length).toBe(2);

        const replacedEvents = events.filter((e: GameEvent) => e.type === SU_EVENTS.BASE_REPLACED);
        expect(replacedEvents.length).toBe(2);

        const scoredBaseIds = scoredEvents.map((e: any) => e.payload.baseDefId);
        expect(scoredBaseIds).toContain('base_the_jungle');
        expect(scoredBaseIds).toContain('base_tar_pits');
    });

    it('无基地达到临界点时不产生记分事件', () => {
        const core: SmashUpCore = {
            players: { '0': makePlayer('0'), '1': makePlayer('1', ['pirates', 'ninjas']) },
            turnOrder: ['0', '1'],
            currentPlayerIndex: 0,
            bases: [
                { defId: 'base_the_jungle', minions: [makeMinion('m1', '0', 5)], ongoingActions: [] },
            ],
            baseDeck: [],
            turnNumber: 1,
            nextUid: 100,
        };

        const events = callOnPhaseEnter(core);
        const scoredEvents = events.filter((e: GameEvent) => e.type === SU_EVENTS.BASE_SCORED);
        expect(scoredEvents.length).toBe(0);
    });

    it('单个基地达到临界点时正常记分', () => {
        const core: SmashUpCore = {
            players: { '0': makePlayer('0'), '1': makePlayer('1', ['pirates', 'ninjas']) },
            turnOrder: ['0', '1'],
            currentPlayerIndex: 0,
            bases: [
                { defId: 'base_the_jungle', minions: [makeMinion('m1', '0', 15)], ongoingActions: [] },
                { defId: 'base_tar_pits', minions: [makeMinion('m2', '1', 5)], ongoingActions: [] },
            ],
            baseDeck: ['base_central_brain'],
            turnNumber: 1,
            nextUid: 100,
        };

        const events = callOnPhaseEnter(core);
        const scoredEvents = events.filter((e: GameEvent) => e.type === SU_EVENTS.BASE_SCORED);
        expect(scoredEvents.length).toBe(1);
        expect((scoredEvents[0] as any).payload.baseDefId).toBe('base_the_jungle');
    });
});

describe('Property 16: 平局 VP 分配（FlowHooks 层面）', () => {
    it('两位玩家力量相同时都获得第一名 VP', () => {
        // base_tar_pits: breakpoint=16, vpAwards=[4,3,2]
        const core: SmashUpCore = {
            players: { '0': makePlayer('0'), '1': makePlayer('1', ['pirates', 'ninjas']) },
            turnOrder: ['0', '1'],
            currentPlayerIndex: 0,
            bases: [{
                defId: 'base_tar_pits',
                minions: [makeMinion('m1', '0', 10), makeMinion('m2', '1', 10)],
                ongoingActions: [],
            }],
            baseDeck: ['base_central_brain'],
            turnNumber: 1,
            nextUid: 100,
        };

        const events = callOnPhaseEnter(core);
        const scoredEvents = events.filter((e: GameEvent) => e.type === SU_EVENTS.BASE_SCORED);
        expect(scoredEvents.length).toBe(1);

        const rankings = (scoredEvents[0] as any).payload.rankings;
        expect(rankings.length).toBe(2);
        // 两位玩家力量相同，都应获得第一名 VP (4)
        expect(rankings[0].vp).toBe(4);
        expect(rankings[1].vp).toBe(4);
        expect(rankings[0].power).toBe(rankings[1].power);
    });

    it('三位玩家中两位并列第一时第三名获得第三名 VP', () => {
        // base_tar_pits: breakpoint=16, vpAwards=[4,3,2]
        const core: SmashUpCore = {
            players: {
                '0': makePlayer('0'),
                '1': makePlayer('1', ['pirates', 'ninjas']),
                '2': makePlayer('2', ['robots', 'wizards']),
            },
            turnOrder: ['0', '1', '2'],
            currentPlayerIndex: 0,
            bases: [{
                defId: 'base_tar_pits',
                minions: [makeMinion('m1', '0', 8), makeMinion('m2', '1', 8), makeMinion('m3', '2', 3)],
                ongoingActions: [],
            }],
            baseDeck: ['base_central_brain'],
            turnNumber: 1,
            nextUid: 100,
        };

        const events = callOnPhaseEnter(core);
        const scoredEvents = events.filter((e: GameEvent) => e.type === SU_EVENTS.BASE_SCORED);
        const rankings = (scoredEvents[0] as any).payload.rankings;
        expect(rankings.length).toBe(3);

        const p0 = rankings.find((r: any) => r.playerId === '0');
        const p1 = rankings.find((r: any) => r.playerId === '1');
        const p2 = rankings.find((r: any) => r.playerId === '2');
        // P0 和 P1 并列第一 → 都拿 4VP
        expect(p0.vp).toBe(4);
        expect(p1.vp).toBe(4);
        // P2 第三名（slot=2）→ 拿第三名 VP (2)
        expect(p2.vp).toBe(2);
    });

    it('并列第二时两位玩家都获得第二名 VP', () => {
        // base_tar_pits: breakpoint=16, vpAwards=[4,3,2]
        const core: SmashUpCore = {
            players: {
                '0': makePlayer('0'),
                '1': makePlayer('1', ['pirates', 'ninjas']),
                '2': makePlayer('2', ['robots', 'wizards']),
            },
            turnOrder: ['0', '1', '2'],
            currentPlayerIndex: 0,
            bases: [{
                defId: 'base_tar_pits',
                minions: [makeMinion('m1', '0', 10), makeMinion('m2', '1', 5), makeMinion('m3', '2', 5)],
                ongoingActions: [],
            }],
            baseDeck: ['base_central_brain'],
            turnNumber: 1,
            nextUid: 100,
        };

        const events = callOnPhaseEnter(core);
        const scoredEvents = events.filter((e: GameEvent) => e.type === SU_EVENTS.BASE_SCORED);
        const rankings = (scoredEvents[0] as any).payload.rankings;
        expect(rankings.length).toBe(3);

        const p0 = rankings.find((r: any) => r.playerId === '0');
        const p1 = rankings.find((r: any) => r.playerId === '1');
        const p2 = rankings.find((r: any) => r.playerId === '2');
        expect(p0.vp).toBe(4); // 第一名
        expect(p1.vp).toBe(3); // 并列第二
        expect(p2.vp).toBe(3); // 并列第二
    });

    it('零力量玩家不获得 VP', () => {
        // base_the_jungle: breakpoint=12, vpAwards=[2,0,0]
        const core: SmashUpCore = {
            players: { '0': makePlayer('0'), '1': makePlayer('1', ['pirates', 'ninjas']) },
            turnOrder: ['0', '1'],
            currentPlayerIndex: 0,
            bases: [{
                defId: 'base_the_jungle',
                minions: [makeMinion('m1', '0', 15)],
                ongoingActions: [],
            }],
            baseDeck: ['base_central_brain'],
            turnNumber: 1,
            nextUid: 100,
        };

        const events = callOnPhaseEnter(core);
        const scoredEvents = events.filter((e: GameEvent) => e.type === SU_EVENTS.BASE_SCORED);
        const rankings = (scoredEvents[0] as any).payload.rankings;
        // P1 没有随从，不应出现在排名中
        expect(rankings.length).toBe(1);
        expect(rankings[0].playerId).toBe('0');
    });
});
