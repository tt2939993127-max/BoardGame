/**
 * 反馈2：通过"制高点"消灭随从没有加分
 *
 * 测试场景：
 * 1. 玩家拥有"制高点"（bear_cavalry_high_ground）行动卡在某个基地
 * 2. 对手的随从移动到该基地
 * 3. "制高点"消灭该随从
 * 4. 如果消灭者在拉莱耶（base_rlyeh）基地上，应获得1VP
 *
 * Bug根因：
 * bear_cavalry.ts中bearCavalryHighGroundTrigger调用destroyMinion时，
 * destroyerId传的是undefined，应传ongoing.ownerId
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { initAllAbilities } from '../abilities';
import { reduce } from '../domain/reducer';
import type { SmashUpCore, SmashUpEvent } from '../domain/types';
import { makeMatchState } from './helpers';
import { SU_EVENTS } from '../domain/types';

describe('反馈2：制高点消灭随从后，destroyer应被正确设置', () => {
    beforeAll(() => {
        initAllAbilities();
    });

    it('基础版制高点：消灭移动到基地的对手随从时，destroyerId应为制高点拥有者', () => {
        // 初始状态：
        // - 基地0：制高点（ongoing，玩家0拥有），玩家0的随从
        // - 基地1：玩家1的随从
        // 动作：玩家1的随从移动到基地0
        // 预期：制高点消灭该随从，destroyerId为玩家0
        const core: SmashUpCore = {
            players: {
                '0': {
                    id: '0', vp: 0, hand: [], deck: [], discard: [],
                    minionsPlayed: 0, minionLimit: 1,
                    actionsPlayed: 1, actionLimit: 1,
                    factions: ['bear_cavalry', 'minions_of_cthulhu'],
                },
                '1': {
                    id: '1', vp: 0, hand: [], deck: [], discard: [],
                    minionsPlayed: 0, minionLimit: 1,
                    actionsPlayed: 0, actionLimit: 1,
                    factions: ['robots', 'pirates'],
                },
            },
            bases: [
                {
                    defId: 'base_rlyeh',  // 拉莱耶：消灭随从获得1VP
                    minions: [
                        {
                            uid: 'm0', defId: 'bear_cavalry', controller: '0', owner: '0',
                            basePower: 5, powerCounters: 0, powerModifier: 0, tempPowerModifier: 0,
                            talentUsed: false, attachedActions: [],
                        },
                    ],
                    ongoingActions: [
                        {
                            uid: 'hg1', defId: 'bear_cavalry_high_ground',
                            ownerId: '0', cardUid: 'hg1',
                        },
                    ],
                },
                {
                    defId: 'base_the_jungle',
                    minions: [
                        {
                            uid: 'm1', defId: 'robot_zapbot', controller: '1', owner: '1',
                            basePower: 3, powerCounters: 0, powerModifier: 0, tempPowerModifier: 0,
                            talentUsed: false, attachedActions: [],
                        },
                    ],
                    ongoingActions: [],
                },
            ],
            turnOrder: ['0', '1'],
            currentPlayerIndex: 0,
            baseDeck: [],
            turnNumber: 1,
            nextUid: 100,
        } as any;

        // 随从移动事件
        const moveEvent: SmashUpEvent = {
            type: SU_EVENTS.MINION_MOVED,
            payload: {
                minionUid: 'm1',
                minionDefId: 'robot_zapbot',
                fromBaseIndex: 1,
                toBaseIndex: 0,
                reason: 'test_move',
            },
            timestamp: 1000,
        };

        const matchState = makeMatchState(core);
        const result = reduce(matchState.core, moveEvent);

        // 验证：随从被消灭
        expect(result.bases[0].minions.length).toBe(1); // 只剩玩家0的随从
        expect(result.bases[0].minions[0].uid).toBe('m0');
        expect(result.bases[1].minions.length).toBe(0);

        // 验证：destroyerId正确设置（通过拉莱耶的VP奖励验证）
        // 如果destroyerId为undefined，拉莱耶不会触发VP奖励
        // 如果destroyerId为玩家0，拉莱耶会给玩家0加1VP
        const player0Vp = result.players['0'].vp;
        const player1Vp = result.players['1'].vp;

        // 拉莱耶应给玩家0（制高点拥有者）加1VP
        expect(player0Vp).toBe(1);
        expect(player1Vp).toBe(0);

        // 验证：日志中destroyerId存在
        const destroyEvent = (matchState.core as any).turnDestroyedMinions?.find((r: any) => r.uid === 'm1');
        expect(destroyEvent).toBeDefined();
        expect(destroyEvent.destroyerId).toBe('0');
    });

    it('POD版制高点：消灭移动到基地的对手随从时，destroyerId应为制高点拥有者', () => {
        // POD版应该已经正确，这个测试确保没有回归
        const core: SmashUpCore = {
            players: {
                '0': {
                    id: '0', vp: 0, hand: [], deck: [], discard: [],
                    minionsPlayed: 0, minionLimit: 1,
                    actionsPlayed: 1, actionLimit: 1,
                    factions: ['bear_cavalry_pod', 'minions_of_cthulhu_pod'],
                },
                '1': {
                    id: '1', vp: 0, hand: [], deck: [], discard: [],
                    minionsPlayed: 0, minionLimit: 1,
                    actionsPlayed: 0, actionLimit: 1,
                    factions: ['robots_pod', 'pirates_pod'],
                },
            },
            bases: [
                {
                    defId: 'base_rlyeh_pod',
                    minions: [
                        {
                            uid: 'm0', defId: 'bear_cavalry_pod', controller: '0', owner: '0',
                            basePower: 5, powerCounters: 0, powerModifier: 0, tempPowerModifier: 0,
                            talentUsed: false, attachedActions: [],
                        },
                    ],
                    ongoingActions: [
                        {
                            uid: 'hg1', defId: 'bear_cavalry_high_ground_pod',
                            ownerId: '0', cardUid: 'hg1',
                        },
                    ],
                },
                {
                    defId: 'base_the_jungle_pod',
                    minions: [
                        {
                            uid: 'm1', defId: 'robot_zapbot_pod', controller: '1', owner: '1',
                            basePower: 3, powerCounters: 0, powerModifier: 0, tempPowerModifier: 0,
                            talentUsed: false, attachedActions: [],
                        },
                    ],
                    ongoingActions: [],
                },
            ],
            turnOrder: ['0', '1'],
            currentPlayerIndex: 0,
            baseDeck: [],
            turnNumber: 1,
            nextUid: 100,
        } as any;

        const moveEvent: SmashUpEvent = {
            type: SU_EVENTS.MINION_MOVED,
            payload: {
                minionUid: 'm1',
                minionDefId: 'robot_zapbot_pod',
                fromBaseIndex: 1,
                toBaseIndex: 0,
                reason: 'test_move',
            },
            timestamp: 1000,
        };

        const matchState = makeMatchState(core);
        const result = reduce(matchState.core, moveEvent);

        // POD版应正确给予VP
        expect(result.players['0'].vp).toBe(1);
        expect(result.players['1'].vp).toBe(0);
    });
});
