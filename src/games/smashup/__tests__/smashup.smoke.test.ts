/**
 * 大杀四方 (Smash Up) - 冒烟测试
 *
 * 覆盖：setup、派系选择、出牌、阶段推进
 */

import { describe, expect, it, beforeAll } from 'vitest';
import { GameTestRunner } from '../../../engine/testing';
import { SmashUpDomain } from '../domain';
import { smashUpFlowHooks } from '../domain/index';
import { createFlowSystem, createBaseSystems } from '../../../engine';
import type { SmashUpCore, SmashUpCommand, SmashUpEvent } from '../domain/types';
import { SU_COMMANDS, SU_EVENTS, getCurrentPlayerId } from '../domain/types';
import { SMASHUP_FACTION_IDS } from '../domain/ids';
import { initAllAbilities } from '../abilities';
import { buildSmashUpAiLegalActions, smashUpAiRuntime } from '../ai';

const PLAYER_IDS = ['0', '1'];

beforeAll(() => {
    initAllAbilities();
});

function createRunner(playerIds = PLAYER_IDS) {
    return new GameTestRunner<SmashUpCore, SmashUpCommand, SmashUpEvent>({
        domain: SmashUpDomain,
        systems: [
            createFlowSystem<SmashUpCore>({ hooks: smashUpFlowHooks }),
            ...createBaseSystems<SmashUpCore>(),
        ],
        playerIds,
        silent: true,
    });
}

/** 蛇形选秀命令序列（多轮 afterEvents 会自动推进 factionSelect → startTurn → playCards） */
const DRAFT_COMMANDS = [
    { type: SU_COMMANDS.SELECT_FACTION, playerId: '0', payload: { factionId: SMASHUP_FACTION_IDS.ALIENS } },
    { type: SU_COMMANDS.SELECT_FACTION, playerId: '1', payload: { factionId: SMASHUP_FACTION_IDS.PIRATES } },
    { type: SU_COMMANDS.SELECT_FACTION, playerId: '1', payload: { factionId: SMASHUP_FACTION_IDS.NINJAS } },
    { type: SU_COMMANDS.SELECT_FACTION, playerId: '0', payload: { factionId: SMASHUP_FACTION_IDS.DINOSAURS } },
];

describe('smashup', () => {
    it('setup 初始化正确（派系选择阶段）', () => {
        const runner = createRunner();
        const result = runner.run({ name: 'setup 验证', commands: [] });
        const core = result.finalState.core;

        expect(core.turnOrder).toEqual(PLAYER_IDS);
        expect(core.currentPlayerIndex).toBe(0);
        expect(core.turnNumber).toBe(1);
        expect(result.finalState.sys.phase).toBe('factionSelect');
        expect(core.factionSelection).toBeDefined();
        for (const pid of PLAYER_IDS) {
            expect(core.players[pid].hand.length).toBe(0);
            expect(core.players[pid].vp).toBe(0);
        }
        expect(core.bases.length).toBe(PLAYER_IDS.length + 1);
    });

    it('派系选择完成后初始化正确', () => {
        const runner = createRunner();
        const result = runner.run({
            name: '派系选择 + 开始',
            commands: DRAFT_COMMANDS,
        });
        const core = result.finalState.core;

        for (const step of result.steps) {
            expect(step.success).toBe(true);
        }

        expect(result.finalState.sys.phase).toBe('playCards');
        expect(core.factionSelection).toBeUndefined();

        for (const pid of PLAYER_IDS) {
            expect(core.players[pid].hand.length).toBe(5);
        }

        expect(core.players['0'].factions).toEqual([SMASHUP_FACTION_IDS.ALIENS, SMASHUP_FACTION_IDS.DINOSAURS]);
        expect(core.players['1'].factions).toEqual([SMASHUP_FACTION_IDS.PIRATES, SMASHUP_FACTION_IDS.NINJAS]);
    });

    it('派系互斥选择', () => {
        const runner = createRunner();
        const result = runner.run({
            name: '派系互斥',
            commands: [
                { type: SU_COMMANDS.SELECT_FACTION, playerId: '0', payload: { factionId: SMASHUP_FACTION_IDS.ALIENS } },
                { type: SU_COMMANDS.SELECT_FACTION, playerId: '1', payload: { factionId: SMASHUP_FACTION_IDS.DINOSAURS } },
                { type: SU_COMMANDS.SELECT_FACTION, playerId: '1', payload: { factionId: SMASHUP_FACTION_IDS.ALIENS } },
            ],
        });
        expect(result.steps[0]?.success).toBe(true);
        expect(result.steps[1]?.success).toBe(true);
        expect(result.steps[2]?.success).toBe(false);
        expect(result.steps[2]?.error).toContain('已被选择');
    });

    it('出牌阶段可以打出随从', () => {
        const runner = createRunner();
        const result = runner.run({
            name: '选秀+出牌',
            commands: DRAFT_COMMANDS,
        });
        const core = result.finalState.core;
        const pid = getCurrentPlayerId(core);
        const player = core.players[pid];
        const minionCard = player.hand.find(c => c.type === 'minion');
        if (!minionCard) return;

        expect(result.finalState.sys.phase).toBe('playCards');

        const runner2 = createRunner();
        const result2 = runner2.run({
            name: '选秀+出牌执行',
            commands: [
                ...DRAFT_COMMANDS,
                {
                    type: SU_COMMANDS.PLAY_MINION,
                    playerId: pid,
                    payload: { cardUid: minionCard.uid, baseIndex: 0 },
                },
            ],
        });

        const playStep = result2.steps[result2.steps.length - 1];
        expect(playStep?.success).toBe(true);
        expect(playStep?.events).toContain(SU_EVENTS.MINION_PLAYED);

        const newPlayer = result2.finalState.core.players[pid];
        expect(newPlayer.hand.length).toBe(4);
        expect(newPlayer.minionsPlayed).toBe(1);
        const base = result2.finalState.core.bases[0];
        expect(base.minions.length).toBe(1);
        expect(base.minions[0].uid).toBe(minionCard.uid);
    });

    it('非当前玩家不能出牌', () => {
        const runner = createRunner();
        const result = runner.run({
            name: '选秀',
            commands: DRAFT_COMMANDS,
        });
        const core = result.finalState.core;
        const otherPid = PLAYER_IDS.find(p => p !== getCurrentPlayerId(core))!;
        const otherPlayer = core.players[otherPid];
        const card = otherPlayer.hand[0];
        if (!card) return;

        const runner2 = createRunner();
        const result2 = runner2.run({
            name: '非当前玩家出牌',
            commands: [
                ...DRAFT_COMMANDS,
                {
                    type: SU_COMMANDS.PLAY_MINION,
                    playerId: otherPid,
                    payload: { cardUid: card.uid, baseIndex: 0 },
                },
            ],
        });
        const playStep = result2.steps[result2.steps.length - 1];
        expect(playStep?.success).toBe(false);
    });

    it('ADVANCE_PHASE 推进阶段', () => {
        const runner = createRunner();
        const pid = PLAYER_IDS[0];

        const result = runner.run({
            name: '阶段推进',
            commands: [
                ...DRAFT_COMMANDS,
                // playCards → scoreBases(auto) → draw(auto) → endTurn(auto) → startTurn(P1, auto) → playCards(P1)
                // 多轮 afterEvents 会自动推进整个链条
                { type: 'ADVANCE_PHASE', playerId: pid, payload: undefined },
            ],
        });

        // 多轮 afterEvents 自动推进到 P1 的 playCards
        expect(result.finalState.sys.phase).toBe('playCards');
        // 当前玩家切换到 P1
        expect(result.finalState.core.currentPlayerIndex).toBe(1);
        // P0 在 draw 阶段抽了 2 张牌（5+2=7）
        expect(result.finalState.core.players['0'].hand.length).toBe(7);
        // ADVANCE_PHASE 步骤成功
        const advanceStep = result.steps[DRAFT_COMMANDS.length];
        expect(advanceStep?.success).toBe(true);
    });

    it('AI legal actions 支持四人局派系选择', () => {
        const runner = createRunner(['0', '1', '2', '3']);
        const result = runner.run({ name: '四人 setup', commands: [] });

        const currentPlayerActions = buildSmashUpAiLegalActions({
            playerId: '0',
            state: result.finalState,
        });
        const waitingPlayerActions = buildSmashUpAiLegalActions({
            playerId: '1',
            state: result.finalState,
        });

        expect(currentPlayerActions.length).toBeGreaterThan(10);
        expect(currentPlayerActions.every((action) => action.kind === 'select-faction')).toBe(true);
        expect(waitingPlayerActions).toHaveLength(0);
    });

    it('Smash Up baseline AI 在基础出牌阶段优先打随从', async () => {
        const runner = createRunner();
        const drafted = runner.run({
            name: '选秀供 AI 使用',
            commands: DRAFT_COMMANDS,
        });

        const pid = getCurrentPlayerId(drafted.finalState.core);
        const player = drafted.finalState.core.players[pid];
        const fallbackCards = [...player.hand, ...player.deck];
        const minionCard = fallbackCards.find((card) => card.type === 'minion' || card.type === 'fusion');
        const actionCard = fallbackCards.find((card) => card.type === 'action' || card.type === 'fusion');

        if (!minionCard) {
            throw new Error('测试缺少可用随从，无法验证 baseline AI');
        }

        const stateForAi = {
            ...drafted.finalState,
            core: {
                ...drafted.finalState.core,
                players: {
                    ...drafted.finalState.core.players,
                    [pid]: {
                        ...player,
                        hand: actionCard ? [minionCard, actionCard] : [minionCard],
                        minionsPlayed: 0,
                        actionsPlayed: 0,
                    },
                },
            },
        };

        const legalActions = buildSmashUpAiLegalActions({
            playerId: pid,
            state: stateForAi,
        });
        const decision = await smashUpAiRuntime.localPolicies!.baseline.decide({
            gameId: 'smashup',
            matchId: 'test-smashup-ai',
            playerId: pid,
            visibleState: stateForAi,
            interaction: null,
            responseWindow: null,
            legalActions,
            rulesVersion: null,
            decisionBudgetMs: 250,
            source: 'local',
        });
        const chosenAction = legalActions.find((action) => action.actionId === decision?.actionId);

        expect(legalActions.some((action) => action.kind === 'play-minion')).toBe(true);
        expect(chosenAction?.kind).toBe('play-minion');
    });

    it('domain 注册表加载正确', () => {
        const runner = createRunner();
        const result = runner.run({
            name: '注册表验证',
            commands: DRAFT_COMMANDS,
        });
        const core = result.finalState.core;
        for (const pid of PLAYER_IDS) {
            for (const card of core.players[pid].hand) {
                expect(card.defId).toBeTruthy();
                expect(card.uid).toBeTruthy();
                expect(card.owner).toBe(pid);
            }
        }
    });
});
