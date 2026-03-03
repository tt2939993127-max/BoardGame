/**
 * 晕眩（Daze）额外攻击简化测试
 * 
 * 验证核心规则：
 * 1. 攻击方有晕眩时可以正常攻击（晕眩不阻止进攻）
 * 2. 攻击结算后触发额外攻击，有晕眩的攻击方再次攻击同一目标
 * 3. 额外攻击中，目标可以正常防御（除非目标也有晕眩）
 */

import { describe, it, expect } from 'vitest';
import { GameTestRunner } from '../../../engine/testing/GameTestRunner';
import type { DiceThroneCore, DiceThroneCommand, DiceThroneEvent } from '../domain/types';
import { DiceThroneDomain } from '../domain';
import { STATUS_IDS } from '../domain/ids';
import { testSystems, cmd, type DiceThroneExpectation, createHeroMatchup } from './test-utils';
import type { RandomFn } from '../../../engine/types';

const fixedRandom: RandomFn = {
    random: () => 0.5,
    d: (sides: number) => sides,
    range: (min, max) => Math.floor((min + max) / 2),
    shuffle: <T>(arr: T[]) => arr,
};

describe('晕眩（Daze）额外攻击 - 简化测试', () => {
    it('攻击方有晕眩时可以正常攻击（晕眩不阻止进攻）', () => {
        const runner = new GameTestRunner<DiceThroneCore, DiceThroneCommand, DiceThroneEvent, DiceThroneExpectation>({
            domain: DiceThroneDomain,
            systems: testSystems,
            playerIds: ['0', '1'],
            random: fixedRandom,
        });

        const result = runner.run({
            name: '晕眩不阻止进攻',
            setup: createHeroMatchup('barbarian', 'monk', (core) => {
                // 给攻击方（Player 0）添加晕眩状态
                core.players['0'].statusEffects[STATUS_IDS.DAZE] = 1;
            }),
            commands: [
                // Player 0 进行攻击（有晕眩）
                cmd('ADVANCE_PHASE', '0'), // main1 → offensiveRoll
                cmd('ROLL_DICE', '0'),
                cmd('CONFIRM_ROLL', '0'),
                cmd('SELECT_ABILITY', '0', { abilityId: 'violent-assault' }), // 应该成功
            ],
        });

        expect(result.passed).toBe(true);
        
        // 验证攻击成功
        const core = result.finalState.core;
        expect(core.pendingAttack).toBeDefined();
        expect(core.pendingAttack!.sourceAbilityId).toBe('violent-assault');
    });

    it('晕眩触发额外攻击后，有晕眩的攻击方再次攻击同一目标', () => {
        const runner = new GameTestRunner<DiceThroneCore, DiceThroneCommand, DiceThroneEvent, DiceThroneExpectation>({
            domain: DiceThroneDomain,
            systems: testSystems,
            playerIds: ['0', '1'],
            random: fixedRandom,
        });

        const result = runner.run({
            name: '晕眩触发额外攻击',
            setup: createHeroMatchup('barbarian', 'monk', (core) => {
                // 给攻击方（Player 0）添加晕眩状态
                core.players['0'].statusEffects[STATUS_IDS.DAZE] = 1;
            }),
            commands: [
                // Player 0 进行攻击（有晕眩）
                cmd('ADVANCE_PHASE', '0'), // main1 → offensiveRoll
                cmd('ROLL_DICE', '0'),
                cmd('CONFIRM_ROLL', '0'),
                cmd('SELECT_ABILITY', '0', { abilityId: 'violent-assault' }), // 不可防御攻击
                cmd('ADVANCE_PHASE', '0'), // offensiveRoll → 触发额外攻击 → offensiveRoll
            ],
        });

        expect(result.passed).toBe(true);
        
        // 验证晕眩状态已被移除
        const core = result.finalState.core;
        expect(core.players['0'].statusEffects[STATUS_IDS.DAZE] ?? 0).toBe(0);
        
        // 验证进入了额外攻击的 offensiveRoll 阶段
        expect(result.finalState.sys.phase).toBe('offensiveRoll');
        expect(core.extraAttackInProgress).toBeDefined();
        expect(core.extraAttackInProgress!.attackerId).toBe('0'); // 有晕眩的攻击方继续攻击
        expect(core.extraAttackInProgress!.originalActivePlayerId).toBe('0'); // 原回合玩家
    });
});
