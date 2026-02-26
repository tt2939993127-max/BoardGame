/**
 * 暴击 Token 与 custom action 伤害技能的兼容性测试
 *
 * Bug 场景：暗影贼通过乾坤大挪移获得暴击 Token 后，
 * 使用 kidney-shot（破隐一击）等 custom action 伤害技能时，
 * 暴击选择不弹出。
 *
 * 根因：getPendingAttackExpectedDamage 只计算显式 damage action 的值，
 * 对 custom action 伤害（如 CP 系伤害）返回 0，导致暴击门控（≥5）失败。
 *
 * 修复：当显式伤害为 0 但 playerAbilityHasDamage 判定有伤害潜力时，
 * 返回门控阈值（5），确保暴击选择正常弹出。
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { GameTestRunner } from '../../../engine/testing';
import { DiceThroneDomain } from '../domain';
import {
    testSystems,
    createQueuedRandom,
    cmd,
    assertState,
    createHeroMatchup,
    advanceTo,
} from './test-utils';
import { TOKEN_IDS } from '../domain/ids';
import { RESOURCE_IDS } from '../domain/resources';
import { initializeCustomActions } from '../domain/customActions';
import { getPendingAttackExpectedDamage } from '../domain/utils';
import { getPlayerAbilityBaseDamage, playerAbilityHasDamage } from '../domain/abilityLookup';
import type { DiceThroneCore, DiceThroneCommand, DiceThroneEvent } from '../domain/types';
import type { DiceThroneExpectation } from './test-utils';

beforeAll(() => {
    initializeCustomActions();
});

describe('暴击 Token 与 custom action 伤害技能', () => {

    it('kidney-shot: getPlayerAbilityBaseDamage 返回 0 但 playerAbilityHasDamage 返回 true', () => {
        // kidney-shot 的伤害通过 custom action (shadow_thief-damage-full-cp) 计算
        // getPlayerAbilityBaseDamage 只计算显式 damage action，应返回 0
        // playerAbilityHasDamage 检查 custom action categories 包含 'damage'，应返回 true
        const setup = createHeroMatchup('shadow_thief', 'paladin');
        const random = createQueuedRandom([]);
        const state = setup(['0', '1'], random);

        const baseDamage = getPlayerAbilityBaseDamage(state.core, '0', 'kidney-shot');
        const hasDamage = playerAbilityHasDamage(state.core, '0', 'kidney-shot');

        expect(baseDamage).toBe(0);
        expect(hasDamage).toBe(true);
    });

    it('getPendingAttackExpectedDamage 对 custom action 伤害技能返回 ≥5', () => {
        const setup = createHeroMatchup('shadow_thief', 'paladin');
        const random = createQueuedRandom([]);
        const state = setup(['0', '1'], random);

        // 模拟 kidney-shot 的 pendingAttack
        const pendingAttack = {
            attackerId: '0' as const,
            defenderId: '1' as const,
            sourceAbilityId: 'kidney-shot',
            isDefendable: true,
            bonusDamage: 0,
            damage: undefined as number | undefined,
        };

        const expected = getPendingAttackExpectedDamage(state.core, pendingAttack as any);
        expect(expected).toBeGreaterThanOrEqual(5);
    });

    it('暗影贼用 kidney-shot 攻击时，持有暴击应弹出选择', () => {
        // 骰子 [1,2,3,4,5] → large straight → kidney-shot
        const random = createQueuedRandom([1, 2, 3, 4, 5]);
        const setup = createHeroMatchup('shadow_thief', 'paladin', (core) => {
            core.players['0'].tokens[TOKEN_IDS.CRIT] = 1;
            core.players['0'].resources[RESOURCE_IDS.CP] = 8; // 确保 CP 足够
        });

        const runner = new GameTestRunner<DiceThroneCore, DiceThroneCommand, DiceThroneEvent, DiceThroneExpectation>({
            domain: DiceThroneDomain,
            systems: testSystems,
            playerIds: ['0', '1'],
            random,
            setup,
            assertFn: assertState,
            silent: true,
        });

        const result = runner.run({
            name: 'kidney-shot + 暴击 Token',
            commands: [
                ...advanceTo('offensiveRoll'),
                cmd('ROLL_DICE', '0'),
                cmd('CONFIRM_ROLL', '0'),
                cmd('SELECT_ABILITY', '0', { abilityId: 'kidney-shot' }),
                cmd('ADVANCE_PHASE', '0'),
            ],
        });

        const sys = result.finalState.sys;
        // 应弹出暴击选择交互（halt）
        expect(sys.interaction.current).not.toBeUndefined();
        expect(result.finalState.core.pendingAttack?.offensiveRollEndTokenResolved).not.toBe(true);
    });

    it('暗影贼用 kidney-shot + 暴击：选择使用后 +4 伤害', () => {
        const random = createQueuedRandom([1, 2, 3, 4, 5]);
        const setup = createHeroMatchup('shadow_thief', 'paladin', (core) => {
            core.players['0'].tokens[TOKEN_IDS.CRIT] = 1;
            core.players['0'].resources[RESOURCE_IDS.CP] = 8;
        });

        const runner = new GameTestRunner<DiceThroneCore, DiceThroneCommand, DiceThroneEvent, DiceThroneExpectation>({
            domain: DiceThroneDomain,
            systems: testSystems,
            playerIds: ['0', '1'],
            random,
            setup,
            assertFn: assertState,
            silent: true,
        });

        const result = runner.run({
            name: 'kidney-shot + 使用暴击',
            commands: [
                ...advanceTo('offensiveRoll'),
                cmd('ROLL_DICE', '0'),
                cmd('CONFIRM_ROLL', '0'),
                cmd('SELECT_ABILITY', '0', { abilityId: 'kidney-shot' }),
                cmd('ADVANCE_PHASE', '0'),
                // 选择使用暴击（第一个选项）
                cmd('SYS_INTERACTION_RESPOND', '0', { optionId: 'option-0' }),
            ],
        });

        const core = result.finalState.core;
        expect(core.players['0'].tokens[TOKEN_IDS.CRIT]).toBe(0);
        expect(core.pendingAttack?.bonusDamage).toBe(4);
        expect(core.pendingAttack?.offensiveRollEndTokenResolved).toBe(true);
    });

    it('shadow-shank (终极) + 暴击：终极不可防御但暴击仍可用', () => {
        // 骰子 [6,6,6,6,6] → 5 shadow → shadow-shank
        const random = createQueuedRandom([6, 6, 6, 6, 6]);
        const setup = createHeroMatchup('shadow_thief', 'paladin', (core) => {
            core.players['0'].tokens[TOKEN_IDS.CRIT] = 1;
            core.players['0'].resources[RESOURCE_IDS.CP] = 5;
        });

        const runner = new GameTestRunner<DiceThroneCore, DiceThroneCommand, DiceThroneEvent, DiceThroneExpectation>({
            domain: DiceThroneDomain,
            systems: testSystems,
            playerIds: ['0', '1'],
            random,
            setup,
            assertFn: assertState,
            silent: true,
        });

        const result = runner.run({
            name: 'shadow-shank + 暴击 Token',
            commands: [
                ...advanceTo('offensiveRoll'),
                cmd('ROLL_DICE', '0'),
                cmd('CONFIRM_ROLL', '0'),
                cmd('SELECT_ABILITY', '0', { abilityId: 'shadow-shank' }),
                cmd('ADVANCE_PHASE', '0'),
            ],
        });

        const sys = result.finalState.sys;
        // 终极技能也应弹出暴击选择
        expect(sys.interaction.current).not.toBeUndefined();
    });
});
