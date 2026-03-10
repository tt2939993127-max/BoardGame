/**
 * 测试"红热"卡牌 + 陨石技能的伤害计算
 * 
 * 用户反馈：打出"红热"卡（有 2 个火焰精通），然后使用陨石技能，
 * 期望造成 4 点伤害（2 FM + 2 红热加成），但实际只造成 2 点伤害。
 */

import { describe, it, expect } from 'vitest';
import { createDamageCalculation } from '../../../engine/primitives/damageCalculation';
import type { DiceThroneCore } from '../domain/core-types';
import type { DiceThroneEvent } from '../domain/types';
import { reduce } from '../domain/reducer';
import { createInitializedState, fixedRandom } from './test-utils';

describe('红热 + 陨石 伤害计算', () => {
    it('先加入 bonusDamage 再发起攻击时，应该在 ATTACK_INITIATED 转移到 pendingAttack', () => {
        const initial = createInitializedState(['0', '1'], fixedRandom).core;

        const withQueuedBonus = reduce(initial, {
            type: 'BONUS_DAMAGE_ADDED',
            payload: {
                playerId: '0',
                amount: 2,
                sourceCardId: 'card-red-hot',
            },
            timestamp: 1,
        } as DiceThroneEvent);

        expect(withQueuedBonus.players['0'].pendingBonusDamage).toBe(2);
        expect(withQueuedBonus.pendingAttack).toBeNull();

        const initiated = reduce(withQueuedBonus, {
            type: 'ATTACK_INITIATED',
            payload: {
                attackerId: '0',
                defenderId: '1',
                sourceAbilityId: 'meteor',
                isDefendable: false,
            },
            timestamp: 2,
        } as DiceThroneEvent);

        expect(initiated.pendingAttack?.bonusDamage).toBe(2);
        expect(initiated.players['0'].pendingBonusDamage).toBeUndefined();
    });

    it('回合切换时应该清除未消费的 pendingBonusDamage', () => {
        const initial = createInitializedState(['0', '1'], fixedRandom).core;
        const withQueuedBonus = reduce(initial, {
            type: 'BONUS_DAMAGE_ADDED',
            payload: {
                playerId: '0',
                amount: 2,
                sourceCardId: 'card-red-hot',
            },
            timestamp: 1,
        } as DiceThroneEvent);

        const afterTurnChanged = reduce(withQueuedBonus, {
            type: 'TURN_CHANGED',
            payload: {
                previousPlayerId: '0',
                nextPlayerId: '1',
                turnNumber: 2,
            },
            timestamp: 2,
        } as DiceThroneEvent);

        expect(afterTurnChanged.players['0'].pendingBonusDamage).toBeUndefined();
    });

    it('应该将 bonusDamage 加到陨石的 FM 伤害上', () => {
        // 模拟游戏状态
        const state: Partial<DiceThroneCore> = {
            players: {
                '0': {
                    id: 'player-0',
                    characterId: 'pyromancer',
                    tokens: {
                        fire_mastery: 2,  // 2 个火焰精通
                    },
                    resources: { hp: 50, cp: 5 },
                    hand: [],
                    deck: [],
                    discard: [],
                    statusEffects: {},
                    tokenStackLimits: {},
                    damageShields: [],
                    abilities: [],
                    abilityLevels: {},
                    upgradeCardByAbilityId: {},
                } as any,
                '1': {
                    id: 'player-1',
                    characterId: 'moon_elf',
                    resources: { hp: 50, cp: 5 },
                    tokens: {},
                    hand: [],
                    deck: [],
                    discard: [],
                    statusEffects: {},
                    tokenStackLimits: {},
                    damageShields: [],
                    abilities: [],
                    abilityLevels: {},
                    upgradeCardByAbilityId: {},
                } as any,
            },
            pendingAttack: {
                attackerId: '0',
                defenderId: '1',
                isDefendable: false,
                sourceAbilityId: 'meteor',
                bonusDamage: 2,  // "红热"卡牌添加的加成
                damageResolved: false,
                resolvedDamage: 0,
            },
            tokenDefinitions: [],
        };

        // 模拟 meteor-resolve 的伤害计算
        const damageCalc = createDamageCalculation({
            source: { playerId: '0', abilityId: 'meteor' },
            target: { playerId: '1' },
            baseDamage: 2,  // 2 FM
            state: state as any,
            timestamp: Date.now(),
        });

        const result = damageCalc.resolve();

        // 验证
        expect(result.baseDamage).toBe(2);  // 基础伤害是 2 FM
        expect(result.finalDamage).toBe(4);  // 最终伤害应该是 4（2 FM + 2 红热）
        
        // 验证 breakdown 中包含 bonusDamage 修正
        const bonusDamageModifier = result.modifiers.find(m => m.sourceId === 'attack_modifier');
        expect(bonusDamageModifier).toBeDefined();
        expect(bonusDamageModifier?.value).toBe(2);
    });

    it('没有 bonusDamage 时应该只造成 FM 伤害', () => {
        const state: Partial<DiceThroneCore> = {
            players: {
                '0': {
                    id: 'player-0',
                    characterId: 'pyromancer',
                    tokens: {
                        fire_mastery: 2,
                    },
                    resources: { hp: 50, cp: 5 },
                    hand: [],
                    deck: [],
                    discard: [],
                    statusEffects: {},
                    tokenStackLimits: {},
                    damageShields: [],
                    abilities: [],
                    abilityLevels: {},
                    upgradeCardByAbilityId: {},
                } as any,
                '1': {
                    id: 'player-1',
                    characterId: 'moon_elf',
                    resources: { hp: 50, cp: 5 },
                    tokens: {},
                    hand: [],
                    deck: [],
                    discard: [],
                    statusEffects: {},
                    tokenStackLimits: {},
                    damageShields: [],
                    abilities: [],
                    abilityLevels: {},
                    upgradeCardByAbilityId: {},
                } as any,
            },
            pendingAttack: {
                attackerId: '0',
                defenderId: '1',
                isDefendable: false,
                sourceAbilityId: 'meteor',
                bonusDamage: 0,  // 没有 bonusDamage
                damageResolved: false,
                resolvedDamage: 0,
            },
            tokenDefinitions: [],
        };

        const damageCalc = createDamageCalculation({
            source: { playerId: '0', abilityId: 'meteor' },
            target: { playerId: '1' },
            baseDamage: 2,
            state: state as any,
            timestamp: Date.now(),
        });

        const result = damageCalc.resolve();

        expect(result.finalDamage).toBe(2);  // 只有 2 FM，没有红热加成
    });
});
