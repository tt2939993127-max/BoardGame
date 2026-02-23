/**
 * 计分阶段 eligible 基地锁定测试
 *
 * 规则（Wiki Phase 3 Step 4）：一旦基地在进入 scoreBases 阶段时达到 breakpoint，
 * 即使 Me First! 响应窗口中力量被降低到 breakpoint 以下，该基地仍然必定计分。
 *
 * 验证：
 * 1. getScoringEligibleBaseIndices 优先返回锁定列表
 * 2. 锁定列表不存在时回退到实时计算
 * 3. 进入 scoreBases 阶段时锁定事件被正确发射和 reduce
 * 4. 力量降低后锁定列表不变
 */

import { describe, expect, it, beforeAll } from 'vitest';
import { getScoringEligibleBaseIndices, getTotalEffectivePowerOnBase, getEffectiveBreakpoint } from '../domain/ongoingModifiers';
import { reduce } from '../domain/reduce';
import type { SmashUpCore, BaseInPlay, PlayerState, MinionOnBase } from '../domain/types';
import { SU_EVENT_TYPES } from '../domain/events';
import { initAllAbilities } from '../abilities';

beforeAll(() => {
    initAllAbilities();
});

// 真实基地 defId（来自 data/cards.ts）
// base_the_jungle: breakpoint=12, vpAwards=[2,0,0]
// base_tar_pits: breakpoint=16, vpAwards=[4,3,2]
// base_ninja_dojo: breakpoint=18, vpAwards=[2,3,2]
const BASE_JUNGLE = 'base_the_jungle';       // breakpoint=12
const BASE_TAR_PITS = 'base_tar_pits';       // breakpoint=16
const BASE_NINJA_DOJO = 'base_ninja_dojo';   // breakpoint=18

/** 构造最小 SmashUpCore 用于测试 */
function makeMinimalCore(overrides: Partial<SmashUpCore> = {}): SmashUpCore {
    const defaultPlayer: PlayerState = {
        id: '0',
        vp: 0,
        hand: [],
        deck: [],
        discard: [],
        minionsPlayed: 0,
        minionLimit: 1,
        actionsPlayed: 0,
        actionLimit: 1,
        factions: ['aliens', 'dinosaurs'],
    };
    return {
        players: {
            '0': { ...defaultPlayer, id: '0' },
            '1': { ...defaultPlayer, id: '1' },
        },
        turnOrder: ['0', '1'],
        currentPlayerIndex: 0,
        bases: [],
        baseDeck: [],
        turnNumber: 1,
        nextUid: 100,
        ...overrides,
    };
}

function makeMinion(uid: string, controller: string, basePower: number, powerModifier = 0): MinionOnBase {
    return {
        uid,
        defId: `test_minion_${uid}`,
        controller,
        owner: controller,
        basePower,
        powerCounters: 0,
        powerModifier,
        tempPowerModifier: 0,
        talentUsed: false,
        attachedActions: [],
    };
}

function makeBase(defId: string, minions: MinionOnBase[] = []): BaseInPlay {
    return { defId, minions, ongoingActions: [] };
}

describe('计分阶段 eligible 基地锁定', () => {
    describe('getScoringEligibleBaseIndices', () => {
        it('有锁定列表时优先返回锁定列表', () => {
            // 基地力量为 0（远低于 breakpoint=12），但锁定列表包含该基地
            const core = makeMinimalCore({
                bases: [makeBase(BASE_JUNGLE)],
                scoringEligibleBaseIndices: [0],
            });
            const result = getScoringEligibleBaseIndices(core);
            expect(result).toEqual([0]);
        });

        it('锁定列表为空数组时回退到实时计算', () => {
            const core = makeMinimalCore({
                bases: [makeBase(BASE_JUNGLE)],  // breakpoint=12, 力量=0
                scoringEligibleBaseIndices: [],
            });
            const result = getScoringEligibleBaseIndices(core);
            expect(result).toEqual([]);  // 力量 0 < breakpoint 12
        });

        it('锁定列表不存在时回退到实时计算', () => {
            const core = makeMinimalCore({
                bases: [
                    makeBase(BASE_JUNGLE, [  // breakpoint=12
                        makeMinion('m1', '0', 6),
                        makeMinion('m2', '1', 8),
                    ]),
                ],
            });
            const result = getScoringEligibleBaseIndices(core);
            // 总力量 14 >= breakpoint 12
            expect(result).toEqual([0]);
        });

        it('力量降低后锁定列表不受影响', () => {
            // 模拟：进入 scoreBases 时力量=14 >= breakpoint=12，锁定了 [0]
            // Me First! 中承受压力降低力量到 10 < 12
            const core = makeMinimalCore({
                bases: [
                    makeBase(BASE_JUNGLE, [  // breakpoint=12
                        makeMinion('m1', '0', 5),
                        makeMinion('m2', '1', 5),  // 总力量=10 < 12
                    ]),
                ],
                scoringEligibleBaseIndices: [0],  // 进入阶段时锁定
            });

            // 实时计算应该返回空（力量不够）
            const totalPower = getTotalEffectivePowerOnBase(core, core.bases[0], 0);
            const bp = getEffectiveBreakpoint(core, 0);
            expect(totalPower).toBeLessThan(bp);

            // 但统一查询函数应该返回锁定列表
            const result = getScoringEligibleBaseIndices(core);
            expect(result).toEqual([0]);
        });
    });

    describe('SCORING_ELIGIBLE_BASES_LOCKED 事件 reduce', () => {
        it('正确写入 scoringEligibleBaseIndices', () => {
            const core = makeMinimalCore({ bases: [makeBase(BASE_JUNGLE)] });
            expect(core.scoringEligibleBaseIndices).toBeUndefined();

            const updated = reduce(core, {
                type: SU_EVENT_TYPES.SCORING_ELIGIBLE_BASES_LOCKED,
                payload: { baseIndices: [0, 2] },
                timestamp: 1,
            } as any);
            expect(updated.scoringEligibleBaseIndices).toEqual([0, 2]);
        });
    });

    describe('BASE_CLEARED 事件清理锁定列表', () => {
        it('计分后从锁定列表中移除已计分基地', () => {
            const core = makeMinimalCore({
                bases: [
                    makeBase(BASE_JUNGLE),
                    makeBase(BASE_TAR_PITS),
                    makeBase(BASE_NINJA_DOJO),
                ],
                scoringEligibleBaseIndices: [0, 2],
            });

            // 清除基地 0
            const updated = reduce(core, {
                type: SU_EVENT_TYPES.BASE_CLEARED,
                payload: { baseIndex: 0, baseDefId: BASE_JUNGLE },
                timestamp: 1,
            } as any);
            // 基地 0 被移除，原索引 2 变为 1（数组收缩）
            expect(updated.scoringEligibleBaseIndices).toEqual([1]);
        });

        it('所有基地计分完后锁定列表清空', () => {
            const core = makeMinimalCore({
                bases: [makeBase(BASE_JUNGLE)],
                scoringEligibleBaseIndices: [0],
            });

            const updated = reduce(core, {
                type: SU_EVENT_TYPES.BASE_CLEARED,
                payload: { baseIndex: 0, baseDefId: BASE_JUNGLE },
                timestamp: 1,
            } as any);
            expect(updated.scoringEligibleBaseIndices).toBeUndefined();
        });
    });

    describe('TURN_STARTED 事件清理锁定列表', () => {
        it('回合开始时清空锁定列表', () => {
            const core = makeMinimalCore({
                bases: [makeBase(BASE_JUNGLE)],
                scoringEligibleBaseIndices: [0],
            });

            const updated = reduce(core, {
                type: SU_EVENT_TYPES.TURN_STARTED,
                payload: { playerId: '0', turnNumber: 2 },
                timestamp: 1,
            } as any);
            expect(updated.scoringEligibleBaseIndices).toBeUndefined();
        });
    });
});
