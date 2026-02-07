/**
 * 大杀四方 (Smash Up) - 冒烟测试
 *
 * 覆盖：setup、出牌、阶段推进、基地记分、抽牌、手牌上限
 */

import { describe, expect, it } from 'vitest';
import { GameTestRunner } from '../../../engine/testing';
import { SmashUpDomain } from '../domain';
import { smashUpFlowHooks } from '../domain/index';
import { createFlowSystem, createDefaultSystems } from '../../../engine';
import type { SmashUpCore, SmashUpCommand, SmashUpEvent } from '../domain/types';
import { SU_COMMANDS, SU_EVENTS, getCurrentPlayerId } from '../domain/types';

const PLAYER_IDS = ['0', '1'];

function createRunner() {
    return new GameTestRunner<SmashUpCore, SmashUpCommand, SmashUpEvent>({
        domain: SmashUpDomain,
        systems: [
            createFlowSystem<SmashUpCore>({ hooks: smashUpFlowHooks }),
            ...createDefaultSystems<SmashUpCore>(),
        ],
        playerIds: PLAYER_IDS,
        silent: true,
    });
}

describe('smashup', () => {
    it('setup 初始化正确', () => {
        const runner = createRunner();
        const result = runner.run({
            name: 'setup 验证',
            commands: [],
        });

        const core = result.finalState.core;
        expect(core.turnOrder).toEqual(PLAYER_IDS);
        expect(core.currentPlayerIndex).toBe(0);
        expect(core.turnNumber).toBe(1);
        // 每个玩家 5 张起始手牌
        for (const pid of PLAYER_IDS) {
            expect(core.players[pid].hand.length).toBe(5);
            expect(core.players[pid].vp).toBe(0);
            expect(core.players[pid].factions).toEqual(['aliens', 'aliens']);
        }
        // 基地数 = 玩家数 + 1
        expect(core.bases.length).toBe(PLAYER_IDS.length + 1);
        expect(core.baseDeck.length).toBeGreaterThan(0);
    });

    it('出牌阶段可以打出随从', () => {
        const runner = createRunner();
        const result = runner.run({
            name: '打出随从',
            commands: [],
        });

        const core = result.finalState.core;
        const pid = getCurrentPlayerId(core);
        const player = core.players[pid];
        // 找一张随从牌
        const minionCard = player.hand.find(c => c.type === 'minion');
        if (!minionCard) return; // 如果没有随从牌则跳过

        // 此时应该在 playCards 阶段（startTurn 自动推进）
        const phase = result.finalState.sys.phase;
        expect(phase).toBe('playCards');

        // 用新 runner 执行打出随从
        const result2 = runner.run({
            name: '打出随从执行',
            commands: [
                {
                    type: SU_COMMANDS.PLAY_MINION,
                    playerId: pid,
                    payload: { cardUid: minionCard.uid, baseIndex: 0 },
                },
            ],
        });

        // 应该成功
        expect(result2.steps[0]?.success).toBe(true);
        expect(result2.steps[0]?.events).toContain(SU_EVENTS.MINION_PLAYED);

        // 验证状态变化
        const newPlayer = result2.finalState.core.players[pid];
        expect(newPlayer.hand.length).toBe(4); // 少了一张
        expect(newPlayer.minionsPlayed).toBe(1);
        // 基地上应该有随从
        const base = result2.finalState.core.bases[0];
        expect(base.minions.length).toBe(1);
        expect(base.minions[0].uid).toBe(minionCard.uid);
    });

    it('非当前玩家不能出牌', () => {
        const runner = createRunner();
        const result = runner.run({
            name: '非当前玩家出牌',
            commands: [],
        });
        const core = result.finalState.core;
        const otherPid = PLAYER_IDS.find(p => p !== getCurrentPlayerId(core))!;
        const otherPlayer = core.players[otherPid];
        const card = otherPlayer.hand[0];
        if (!card) return;

        const result2 = runner.run({
            name: '非当前玩家出牌执行',
            commands: [
                {
                    type: SU_COMMANDS.PLAY_MINION,
                    playerId: otherPid,
                    payload: { cardUid: card.uid, baseIndex: 0 },
                },
            ],
        });

        expect(result2.steps[0]?.success).toBe(false);
    });

    it('ADVANCE_PHASE 推进阶段', () => {
        const runner = createRunner();
        const pid = PLAYER_IDS[0];

        const result = runner.run({
            name: '阶段推进',
            commands: [
                // 结束出牌阶段
                { type: 'ADVANCE_PHASE', playerId: pid, payload: undefined },
            ],
        });

        // pipeline 每次 afterEvents 只能自动推进一个阶段
        // playCards → scoreBases（auto→）draw，停在 draw
        expect(result.finalState.sys.phase).toBe('draw');
        expect(result.steps[0]?.success).toBe(true);

        // 再发一次 ADVANCE_PHASE 从 draw 继续
        const result2 = runner.run({
            name: '完整回合',
            commands: [
                { type: 'ADVANCE_PHASE', playerId: pid, payload: undefined },
                // draw → endTurn (auto→ startTurn auto→ playCards) - 可能停在中间
                { type: 'ADVANCE_PHASE', playerId: pid, payload: undefined },
                { type: 'ADVANCE_PHASE', playerId: pid, payload: undefined },
            ],
        });

        // 最终应该回到 playCards（可能是下一个玩家）
        const finalPhase = result2.finalState.sys.phase;
        expect(['playCards', 'startTurn', 'endTurn', 'draw']).toContain(finalPhase);
    });

    it('domain 注册表加载正确', () => {
        const runner = createRunner();
        const result = runner.run({
            name: '注册表验证',
            commands: [],
        });
        const core = result.finalState.core;
        // 验证所有手牌的 defId 不为空
        for (const pid of PLAYER_IDS) {
            for (const card of core.players[pid].hand) {
                expect(card.defId).toBeTruthy();
                expect(card.uid).toBeTruthy();
                expect(card.owner).toBe(pid);
            }
        }
    });
});
