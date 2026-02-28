import { describe, expect, it } from 'vitest';
import type { EventStreamEntry } from '../../../engine/types';
import type { AttackResolvedEvent, DamageDealtEvent } from '../domain/events';
import {
  collectDamageAnimationContext,
  resolveAnimationDamage,
} from '../hooks/useAnimationEffects';

describe('useAnimationEffects 伤害动画净值计算', () => {
  it('Token 响应关闭批次：使用 ATTACK_RESOLVED.totalDamage 作为动画伤害', () => {
    const damageEvent: DamageDealtEvent = {
      type: 'DAMAGE_DEALT',
      payload: {
        targetId: '1',
        amount: 6,
        actualDamage: 6,
        sourceAbilityId: 'dagger-strike-4',
      },
      timestamp: 11,
    };

    const resolvedEvent: AttackResolvedEvent = {
      type: 'ATTACK_RESOLVED',
      payload: {
        attackerId: '0',
        defenderId: '1',
        sourceAbilityId: 'dagger-strike-4',
        defenseAbilityId: 'elusive-step',
        totalDamage: 3,
      },
      timestamp: 11,
    };

    const entries: EventStreamEntry[] = [
      {
        id: 1,
        event: {
          type: 'TOKEN_RESPONSE_CLOSED',
          payload: {
            pendingDamageId: 'pd-1',
            finalDamage: 6,
            fullyEvaded: false,
          },
          timestamp: 11,
        },
      },
      { id: 2, event: damageEvent },
      { id: 3, event: resolvedEvent },
    ];

    const ctx = collectDamageAnimationContext(entries);
    expect(ctx.resolvedDamageByTarget.get('1')).toBe(3);
    expect(resolveAnimationDamage(6, '1', ctx.percentShields, ctx.resolvedDamageByTarget, ctx.fixedShieldsByTarget)).toBe(3);
  });

  it('无 Token 响应关闭时，不应使用 ATTACK_RESOLVED 覆盖动画伤害', () => {
    const entries: EventStreamEntry[] = [
      {
        id: 1,
        event: {
          type: 'ATTACK_RESOLVED',
          payload: {
            attackerId: '0',
            defenderId: '1',
            totalDamage: 3,
          },
          timestamp: 10,
        },
      },
    ];

    const ctx = collectDamageAnimationContext(entries);
    expect(ctx.resolvedDamageByTarget.size).toBe(0);
    expect(resolveAnimationDamage(6, '1', ctx.percentShields, ctx.resolvedDamageByTarget, ctx.fixedShieldsByTarget)).toBe(6);
  });

  it('同批次百分比护盾应按净伤害播放动画', () => {
    const entries: EventStreamEntry[] = [
      {
        id: 1,
        event: {
          type: 'DAMAGE_SHIELD_GRANTED',
          payload: {
            targetId: '1',
            reductionPercent: 50,
          },
          timestamp: 12,
        },
      },
    ];

    const ctx = collectDamageAnimationContext(entries);
    expect(ctx.percentShields.get('1')).toBe(50);
    expect(resolveAnimationDamage(6, '1', ctx.percentShields, ctx.resolvedDamageByTarget, ctx.fixedShieldsByTarget)).toBe(3);
  });

  it('固定值护盾应从动画伤害中扣除', () => {
    const damageEvent: DamageDealtEvent = {
      type: 'DAMAGE_DEALT',
      payload: {
        targetId: '1',
        amount: 8,
        actualDamage: 8,
        sourceAbilityId: 'shadow-shank',
        shieldsConsumed: [
          { id: 'card-next-time', absorbed: 6, value: 6, name: 'card-next-time' },
          { id: 'holy-defense', absorbed: 2, value: 3, name: 'holy-defense' },
        ],
      },
      timestamp: 11,
    };

    const entries: EventStreamEntry[] = [
      { id: 1, event: damageEvent },
    ];

    const ctx = collectDamageAnimationContext(entries);
    expect(ctx.fixedShieldsByTarget.get('1')).toBe(8); // 6 + 2 = 8
    expect(resolveAnimationDamage(8, '1', ctx.percentShields, ctx.resolvedDamageByTarget, ctx.fixedShieldsByTarget)).toBe(0);
  });

  it('百分比护盾 + 固定值护盾组合应正确计算动画伤害', () => {
    const damageEvent: DamageDealtEvent = {
      type: 'DAMAGE_DEALT',
      payload: {
        targetId: '1',
        amount: 10,
        actualDamage: 10,
        sourceAbilityId: 'shadow-shank',
        shieldsConsumed: [
          { id: 'card-next-time', absorbed: 5, value: 6, name: 'card-next-time' },
        ],
      },
      timestamp: 11,
    };

    const entries: EventStreamEntry[] = [
      {
        id: 1,
        event: {
          type: 'DAMAGE_SHIELD_GRANTED',
          payload: {
            targetId: '1',
            reductionPercent: 50,
          },
          timestamp: 11,
        },
      },
      { id: 2, event: damageEvent },
    ];

    const ctx = collectDamageAnimationContext(entries);
    expect(ctx.percentShields.get('1')).toBe(50);
    expect(ctx.fixedShieldsByTarget.get('1')).toBe(5);
    // 10 伤害 → 50% 护盾吸收 5 → 剩余 5 → 固定值护盾吸收 5 → 最终 0
    expect(resolveAnimationDamage(10, '1', ctx.percentShields, ctx.resolvedDamageByTarget, ctx.fixedShieldsByTarget)).toBe(0);
  });
});
