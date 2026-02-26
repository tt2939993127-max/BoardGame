/**
 * 回归测试：护盾双重扣减 bug
 *
 * 场景：防御方打出"下次一定！"（card-next-time，6 点护盾），
 * 攻击方使用炽热波纹 II（fiery-combo-2）造成伤害。
 * 
 * Bug：createDamageCalculation 默认 autoCollectShields=true 会在计算管线中
 * 预扣护盾减免，然后 reducer handleDamageDealt 又消耗护盾再次扣减，
 * 导致伤害被双重抵消，防御方不掉血。
 *
 * 修复：将 autoCollectShields 默认值改为 false，护盾统一由 reducer 消耗。
 */
import { describe, it, expect } from 'vitest';
import { reduce } from '../domain/reducer';
import type { DiceThroneCore, DamageDealtEvent, DamageShieldGrantedEvent, AttackInitiatedEvent, AttackResolvedEvent } from '../domain/types';
import { createDamageCalculation } from '../../../engine/primitives/damageCalculation';

// 最小化 core 状态
function createMinimalCore(): DiceThroneCore {
    return {
        players: {
            '0': {
                id: 'player-0',
                characterId: 'pyromancer',
                resources: { cp: 5, hp: 50 },
                hand: [],
                deck: [],
                discard: [],
                statusEffects: {},
                tokens: { fire_mastery: 5 },
                tokenStackLimits: { fire_mastery: 5 },
                damageShields: [],
                abilities: [],
                abilityLevels: {},
                upgradeCardByAbilityId: {},
            },
            '1': {
                id: 'player-1',
                characterId: 'shadow_thief',
                resources: { cp: 5, hp: 12 },
                hand: [],
                deck: [],
                discard: [],
                statusEffects: {},
                tokens: {},
                tokenStackLimits: {},
                damageShields: [{ value: 6, sourceId: 'card-next-time', preventStatus: false }],
                abilities: [],
                abilityLevels: {},
                upgradeCardByAbilityId: {},
            },
        },
        selectedCharacters: { '0': 'pyromancer', '1': 'shadow_thief' },
        readyPlayers: { '0': true, '1': true },
        hostPlayerId: '0',
        hostStarted: true,
        dice: [],
        rollCount: 0,
        rollLimit: 3,
        rollDiceCount: 5,
        rollConfirmed: false,
        activePlayerId: '0',
        startingPlayerId: '0',
        turnNumber: 1,
        pendingAttack: {
            attackerId: '0',
            defenderId: '1',
            sourceAbilityId: 'fiery-combo',
            isDefendable: true,
            damageResolved: false,
            resolvedDamage: 0,
        },
        tokenDefinitions: [],
    } as any;
}

describe('护盾双重扣减回归测试', () => {
    it('createDamageCalculation 默认不收集护盾（autoCollectShields 默认 false）', () => {
        const state = {
            core: {
                players: {
                    '0': { tokens: {}, statusEffects: {} },
                    '1': {
                        tokens: {},
                        statusEffects: {},
                        damageShields: [{ value: 6, sourceId: 'card-next-time' }],
                    },
                },
                tokenDefinitions: [],
            },
        };

        const calc = createDamageCalculation({
            baseDamage: 11,
            source: { playerId: '0', abilityId: 'fiery-combo' },
            target: { playerId: '1' },
            state,
            // autoCollectShields 不设置，默认 false
        });

        const result = calc.resolve();
        // 护盾不参与计算管线，finalDamage = baseDamage = 11
        expect(result.finalDamage).toBe(11);
    });

    it('DAMAGE_DEALT 经过 reducer 后护盾正确消耗，伤害正确扣血', () => {
        const core = createMinimalCore();
        const hpBefore = core.players['1'].resources.hp; // 12

        // 模拟 11 点伤害（baseDamage 6 + FM 5）
        const damageEvent: DamageDealtEvent = {
            type: 'DAMAGE_DEALT',
            payload: {
                targetId: '1',
                amount: 11,
                actualDamage: 11,
                sourceAbilityId: 'fiery-combo',
            },
            sourceCommandType: 'ABILITY_EFFECT',
            timestamp: 1000,
        };

        const afterDamage = reduce(core, damageEvent);

        // 护盾 6 点抵消，剩余 5 点伤害
        expect(afterDamage.players['1'].resources.hp).toBe(hpBefore - 5); // 12 - 5 = 7
        // 护盾被消耗
        expect(afterDamage.players['1'].damageShields).toEqual([]);
        // pendingAttack.resolvedDamage 记录净掉血
        expect(afterDamage.pendingAttack?.resolvedDamage).toBe(5);
    });

    it('ATTACK_RESOLVED 后 lastResolvedAttackDamage 为净掉血值', () => {
        const core = createMinimalCore();

        // 先 reduce DAMAGE_DEALT
        const damageEvent: DamageDealtEvent = {
            type: 'DAMAGE_DEALT',
            payload: {
                targetId: '1',
                amount: 11,
                actualDamage: 11,
                sourceAbilityId: 'fiery-combo',
            },
            sourceCommandType: 'ABILITY_EFFECT',
            timestamp: 1000,
        };
        const afterDamage = reduce(core, damageEvent);

        // 再 reduce ATTACK_RESOLVED
        const resolvedEvent: AttackResolvedEvent = {
            type: 'ATTACK_RESOLVED',
            payload: {
                attackerId: '0',
                defenderId: '1',
                sourceAbilityId: 'fiery-combo',
                totalDamage: 11,
            },
            sourceCommandType: 'ABILITY_EFFECT',
            timestamp: 1001,
        };
        const afterResolved = reduce(afterDamage, resolvedEvent);

        // lastResolvedAttackDamage = 净掉血 5（不是 0）
        expect(afterResolved.lastResolvedAttackDamage).toBe(5);
    });
});
