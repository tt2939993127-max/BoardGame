/**
 * 测试锁定 buff 在防御投掷造成伤害时是否生效
 */

import { describe, it, expect } from 'vitest';
import { GameTestRunner } from '../../../engine/testing';
import { DiceThroneDomain } from '../domain';
import { testSystems, createQueuedRandom, cmd, assertState, createHeroMatchup } from './test-utils';
import { STATUS_IDS } from '../domain/ids';
import { RESOURCE_IDS } from '../domain/resources';
import { INITIAL_HEALTH } from '../domain/types';
import { createDamageCalculation } from '../../../engine/primitives';

describe('锁定只修正对手攻击伤害', () => {
  it('迷影步造成的防御反伤不应被锁定 buff 加成', () => {
    // 测试场景：
    // 1. 玩家0（暗影盗贼）有锁定 buff
    // 2. 玩家1（月精灵）使用防御技能（迷影步）造成伤害给玩家0
    // 3. 验证玩家0受到的防御反击伤害不触发锁定

    // 骰子值序列：
    // [1,2,3,4,5] 玩家0攻击骰 → 肾击（5点伤害）
    // [1,2,3,4,5] 玩家1防御骰（3弓2足）→ 迷影步造成1点反伤（每2弓=1）
    const random = createQueuedRandom([1, 2, 3, 4, 5, 1, 2, 3, 4, 5]);

    const runner = new GameTestRunner({
      domain: DiceThroneDomain,
      systems: testSystems,
      playerIds: ['0', '1'],
      random,
      setup: createHeroMatchup('shadow_thief', 'moon_elf', (core) => {
        // 给玩家0施加锁定 buff
        core.players['0'].statusEffects[STATUS_IDS.TARGETED] = 1;
        core.players['0'].resources[RESOURCE_IDS.CP] = 1;
      }),
      assertFn: assertState,
      silent: true,
    });

    const result = runner.run({
      name: '锁定buff在防御投掷造成伤害时生效',
      commands: [
        cmd('ADVANCE_PHASE', '0'), // main1 → offensiveRoll
        cmd('ROLL_DICE', '0'),
        cmd('CONFIRM_ROLL', '0'),
        cmd('RESPONSE_PASS', '0'),
        cmd('RESPONSE_PASS', '1'),
        cmd('SELECT_ABILITY', '0', { abilityId: 'kidney-shot' }),
        cmd('ADVANCE_PHASE', '0'), // offensiveRoll → defensiveRoll
        cmd('ROLL_DICE', '1'),
        cmd('CONFIRM_ROLL', '1'),
        cmd('SELECT_ABILITY', '1', { abilityId: 'elusive-step' }),
        cmd('ADVANCE_PHASE', '1'), // defensiveRoll → main2（触发迷影步）
      ],
      expect: {
        turnPhase: 'main2',
        players: {
          '0': {
            // 迷影步：3弓2足 = 1点反伤（每2弓=1）
            // 锁定只看对手的攻击伤害，防御能力反伤仍为 1
            hp: INITIAL_HEALTH - 1,
            statusEffects: { [STATUS_IDS.TARGETED]: 1 }, // 锁定是持续效果，不会自动移除
          },
          '1': {
            // 玩家1受到 kidney-shot 的 5 点伤害
            // 迷影步（2足≥2）授予 50% 护盾，实际伤害 = 5 - ceil(5*0.5) = 2
            hp: INITIAL_HEALTH - 2,
          },
        },
      },
    });

    expect(result.assertionErrors).toEqual([]);
  });

  it('锁定不修正直伤（包括真实伤害）', () => {
    const state = createHeroMatchup('moon_elf', 'treant')(['0', '1'], createQueuedRandom([1])).core;
    state.players['1'].statusEffects[STATUS_IDS.TARGETED] = 1;

    const result = createDamageCalculation({
      source: { playerId: '0', abilityId: 'direct-test' },
      target: { playerId: '1' },
      baseDamage: 4,
      state,
      damageScope: 'direct',
    }).resolve();

    expect(result.finalDamage).toBe(4);
  });
});
