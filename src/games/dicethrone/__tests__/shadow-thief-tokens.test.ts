/**
 * 暗影刺客 Token/状态效果 测试
 *
 * 覆盖范围：
 * 1. Token 定义完整性（sneak、sneak_attack、poison）
 * 2. 初始状态验证
 * 3. Sneak 被动触发定义（onDamageReceived + custom action）
 * 4. Sneak Attack activeUse 定义（beforeDamageDealt）
 * 5. Poison 被动触发定义（onTurnStart）
 *
 * 注意：poison onTurnStart 伤害的执行逻辑尚未在 game.ts onPhaseEnter 中实现，
 * 此处仅测试定义属性。Sneak/SneakAttack 的实际执行在 custom action 中。
 */

import { describe, it, expect } from 'vitest';
import { SHADOW_THIEF_TOKENS, SHADOW_THIEF_INITIAL_TOKENS } from '../heroes/shadow_thief/tokens';
import { TOKEN_IDS, STATUS_IDS } from '../domain/ids';

// ============================================================================
// 1. Token 定义完整性
// ============================================================================

describe('暗影刺客 Token 定义', () => {
    it('应包含 Sneak（潜行）— buff, onDamageReceived, stackLimit=1', () => {
        const sneak = SHADOW_THIEF_TOKENS.find(t => t.id === TOKEN_IDS.SNEAK);
        expect(sneak).toBeDefined();
        expect(sneak!.category).toBe('buff');
        expect(sneak!.stackLimit).toBe(1);
        expect(sneak!.passiveTrigger).toBeDefined();
        expect(sneak!.passiveTrigger!.timing).toBe('onDamageReceived');
        expect(sneak!.passiveTrigger!.removable).toBe(false);
        // 触发 custom action: shadow_thief-sneak-prevent
        expect(sneak!.passiveTrigger!.actions).toEqual(
            expect.arrayContaining([
                expect.objectContaining({
                    type: 'custom',
                    customActionId: 'shadow_thief-sneak-prevent',
                    target: 'self',
                }),
            ])
        );
    });

    it('应包含 Sneak Attack（伏击）— consumable, beforeDamageDealt', () => {
        const sa = SHADOW_THIEF_TOKENS.find(t => t.id === TOKEN_IDS.SNEAK_ATTACK);
        expect(sa).toBeDefined();
        expect(sa!.category).toBe('consumable');
        expect(sa!.stackLimit).toBe(1);
        expect(sa!.activeUse).toBeDefined();
        expect(sa!.activeUse!.timing).toContain('beforeDamageDealt');
        expect(sa!.activeUse!.consumeAmount).toBe(1);
        expect(sa!.activeUse!.effect.type).toBe('modifyDamageDealt');
    });

    it('应包含 Poison（中毒）— debuff, onTurnStart, stackLimit=3', () => {
        const poison = SHADOW_THIEF_TOKENS.find(t => t.id === STATUS_IDS.POISON);
        expect(poison).toBeDefined();
        expect(poison!.category).toBe('debuff');
        expect(poison!.stackLimit).toBe(3);
        expect(poison!.passiveTrigger).toBeDefined();
        expect(poison!.passiveTrigger!.timing).toBe('onTurnStart');
        expect(poison!.passiveTrigger!.removable).toBe(true);
    });

    it('Token 数量应为 3', () => {
        expect(SHADOW_THIEF_TOKENS).toHaveLength(3);
    });
});

// ============================================================================
// 2. 初始状态验证
// ============================================================================

describe('暗影刺客初始 Token 状态', () => {
    it('Sneak 和 Sneak Attack 初始值为 0', () => {
        expect(SHADOW_THIEF_INITIAL_TOKENS[TOKEN_IDS.SNEAK]).toBe(0);
        expect(SHADOW_THIEF_INITIAL_TOKENS[TOKEN_IDS.SNEAK_ATTACK]).toBe(0);
    });

    it('初始状态键数量为 2（Poison 不在初始 Token 中，属于 statusEffects）', () => {
        // Poison 是 debuff，通过 statusEffects 管理，不在 initialTokens 中
        expect(Object.keys(SHADOW_THIEF_INITIAL_TOKENS)).toHaveLength(2);
    });
});

// ============================================================================
// 3. Sneak 被动触发定义验证
// ============================================================================

describe('暗影刺客 Sneak 被动触发', () => {
    it('Sneak 触发时机为 onDamageReceived（受到伤害时）', () => {
        const sneak = SHADOW_THIEF_TOKENS.find(t => t.id === TOKEN_IDS.SNEAK)!;
        expect(sneak.passiveTrigger!.timing).toBe('onDamageReceived');
    });

    it('Sneak 不可通过 CP 移除（removable=false）', () => {
        const sneak = SHADOW_THIEF_TOKENS.find(t => t.id === TOKEN_IDS.SNEAK)!;
        expect(sneak.passiveTrigger!.removable).toBe(false);
    });

    it('Sneak 触发的 custom action ID 正确', () => {
        const sneak = SHADOW_THIEF_TOKENS.find(t => t.id === TOKEN_IDS.SNEAK)!;
        const customAction = sneak.passiveTrigger!.actions!.find(
            (a: any) => a.type === 'custom'
        ) as any;
        expect(customAction).toBeDefined();
        expect(customAction.customActionId).toBe('shadow_thief-sneak-prevent');
    });
});

// ============================================================================
// 4. Sneak Attack activeUse 定义验证
// ============================================================================

describe('暗影刺客 Sneak Attack activeUse', () => {
    it('使用时机包含 beforeDamageDealt', () => {
        const sa = SHADOW_THIEF_TOKENS.find(t => t.id === TOKEN_IDS.SNEAK_ATTACK)!;
        expect(sa.activeUse!.timing).toContain('beforeDamageDealt');
    });

    it('每次消耗 1 层', () => {
        const sa = SHADOW_THIEF_TOKENS.find(t => t.id === TOKEN_IDS.SNEAK_ATTACK)!;
        expect(sa.activeUse!.consumeAmount).toBe(1);
    });

    it('效果类型为 modifyDamageDealt（实际逻辑在 custom action 中）', () => {
        const sa = SHADOW_THIEF_TOKENS.find(t => t.id === TOKEN_IDS.SNEAK_ATTACK)!;
        expect(sa.activeUse!.effect.type).toBe('modifyDamageDealt');
        // value=0 因为实际伤害由 shadow_thief-sneak-attack-use custom action 掷骰决定
        expect(sa.activeUse!.effect.value).toBe(0);
    });
});

// ============================================================================
// 5. Poison 被动触发定义验证
// ============================================================================

describe('暗影刺客 Poison 被动触发', () => {
    it('Poison 触发时机为 onTurnStart', () => {
        const poison = SHADOW_THIEF_TOKENS.find(t => t.id === STATUS_IDS.POISON)!;
        expect(poison.passiveTrigger!.timing).toBe('onTurnStart');
    });

    it('Poison 可通过 CP 移除（removable=true）', () => {
        const poison = SHADOW_THIEF_TOKENS.find(t => t.id === STATUS_IDS.POISON)!;
        expect(poison.passiveTrigger!.removable).toBe(true);
    });

    it('Poison 最大叠加 3 层', () => {
        const poison = SHADOW_THIEF_TOKENS.find(t => t.id === STATUS_IDS.POISON)!;
        expect(poison.stackLimit).toBe(3);
    });
});
