/**
 * DiceThrone 卡牌交叉审计测试
 *
 * 覆盖人工审核中发现的三类 bug 模式：
 * 1. i18n 完整性：使用 cardText() 的卡牌必须在 zh-CN 和 en JSON 中有对应条目
 * 2. grantToken target 合理性：grantToken 不应使用 target:'select'（通常是 self/opponent）
 * 3. bonusCp 参数消费：ability 传了 params.bonusCp 的 custom action handler 必须实际读取它
 * 4. 技能 custom action 伤害计算中 bonusCp 一致性
 */

import { describe, it, expect } from 'vitest';
import type { AbilityCard } from '../domain/types';
import type { AbilityDef, AbilityEffect } from '../domain/combat';
import { CHARACTER_DATA_MAP } from '../domain/characters';
import { getCustomActionHandler } from '../domain/effects';

// 各英雄卡牌
import { MONK_CARDS } from '../heroes/monk/cards';
import { BARBARIAN_CARDS } from '../heroes/barbarian/cards';
import { PYROMANCER_CARDS } from '../heroes/pyromancer/cards';
import { SHADOW_THIEF_CARDS } from '../heroes/shadow_thief/cards';
import { MOON_ELF_CARDS } from '../heroes/moon_elf/cards';
import { PALADIN_CARDS } from '../heroes/paladin/cards';
import { COMMON_CARDS } from '../domain/commonCards';

// i18n
import zhCN from '../../../../public/locales/zh-CN/game-dicethrone.json';
import en from '../../../../public/locales/en/game-dicethrone.json';

// ============================================================================
// 辅助
// ============================================================================

/** 所有英雄专属卡 + 通用卡（去重） */
function getAllUniqueCards(): AbilityCard[] {
    const seen = new Set<string>();
    const result: AbilityCard[] = [];
    const all = [
        ...MONK_CARDS, ...BARBARIAN_CARDS, ...PYROMANCER_CARDS,
        ...SHADOW_THIEF_CARDS, ...MOON_ELF_CARDS, ...PALADIN_CARDS,
        ...COMMON_CARDS,
    ];
    for (const card of all) {
        if (!seen.has(card.id)) {
            seen.add(card.id);
            result.push(card);
        }
    }
    return result;
}

/** 收集所有英雄的所有技能定义（含升级） */
function getAllAbilityEffectsFlat(): Array<{
    heroId: string;
    abilityId: string;
    variantId?: string;
    effect: AbilityEffect;
}> {
    const result: Array<{ heroId: string; abilityId: string; variantId?: string; effect: AbilityEffect }> = [];
    for (const [heroId, data] of Object.entries(CHARACTER_DATA_MAP)) {
        for (const ability of data.abilities as AbilityDef[]) {
            if (ability.effects) {
                for (const effect of ability.effects) {
                    result.push({ heroId, abilityId: ability.id, effect });
                }
            }
            if (ability.variants) {
                for (const variant of ability.variants) {
                    for (const effect of variant.effects) {
                        result.push({ heroId, abilityId: ability.id, variantId: variant.id, effect });
                    }
                }
            }
        }
    }
    return result;
}

// ============================================================================
// 1. i18n 完整性：使用 cardText() 的卡牌必须有 i18n 条目
// ============================================================================

describe('卡牌 i18n 完整性', () => {
    const allCards = getAllUniqueCards();
    const zhCards = (zhCN as Record<string, unknown>).cards as Record<string, { name?: string; description?: string }> ?? {};
    const enCards = (en as Record<string, unknown>).cards as Record<string, { name?: string; description?: string }> ?? {};

    /**
     * 检测使用 cardText() 的卡牌：
     * cardText() 生成 `cards.<id>.name` / `cards.<id>.description` 格式的 i18n key。
     * 如果 card.name 以 'cards.' 开头，说明使用了 cardText()。
     */
    function usesCardText(card: AbilityCard): boolean {
        return typeof card.name === 'string' && card.name.startsWith('cards.');
    }

    it('使用 cardText() 的卡牌在 zh-CN 中有对应条目', () => {
        const violations: string[] = [];
        for (const card of allCards) {
            if (!usesCardText(card)) continue;
            if (!zhCards[card.id]) {
                violations.push(`[${card.id}] 使用 cardText() 但 zh-CN cards 中无对应条目`);
            }
        }
        expect(violations).toEqual([]);
    });

    it('使用 cardText() 的卡牌在 en 中有对应条目', () => {
        const violations: string[] = [];
        for (const card of allCards) {
            if (!usesCardText(card)) continue;
            if (!enCards[card.id]) {
                violations.push(`[${card.id}] 使用 cardText() 但 en cards 中无对应条目`);
            }
        }
        expect(violations).toEqual([]);
    });

    it('i18n 条目必须同时包含 name 和 description', () => {
        const violations: string[] = [];
        for (const card of allCards) {
            if (!usesCardText(card)) continue;
            for (const [locale, cardsMap] of [['zh-CN', zhCards], ['en', enCards]] as const) {
                const entry = cardsMap[card.id];
                if (!entry) continue; // 缺失条目由上面的测试覆盖
                if (!entry.name) violations.push(`[${card.id}] ${locale} 缺少 name`);
                if (!entry.description) violations.push(`[${card.id}] ${locale} 缺少 description`);
            }
        }
        expect(violations).toEqual([]);
    });
});

// ============================================================================
// 2. grantToken target 合理性
// ============================================================================

describe('卡牌效果 target 合理性', () => {
    const allCards = getAllUniqueCards();

    it('grantToken 效果不应使用 target:select（应为 self 或 opponent）', () => {
        const violations: string[] = [];
        for (const card of allCards) {
            if (!card.effects) continue;
            for (const effect of card.effects) {
                if (!effect.action) continue;
                if (effect.action.type === 'grantToken' && effect.action.target === 'select') {
                    violations.push(
                        `[${card.id}] grantToken 使用 target:'select'（tokenId: ${effect.action.tokenId}）` +
                        `— grantToken 通常给自己(self)或对手(opponent)，select 会被解析为 defenderId`
                    );
                }
            }
        }
        expect(violations).toEqual([]);
    });

    it('grantStatus 效果不应使用 target:self（状态通常施加给对手）', () => {
        // 白名单：某些卡牌确实给自己施加状态（如自伤效果）
        const WHITELIST = new Set<string>([]);
        const violations: string[] = [];
        for (const card of allCards) {
            if (WHITELIST.has(card.id)) continue;
            if (!card.effects) continue;
            for (const effect of card.effects) {
                if (!effect.action) continue;
                if (effect.action.type === 'grantStatus' && effect.action.target === 'self') {
                    violations.push(
                        `[${card.id}] grantStatus 使用 target:'self'（statusId: ${effect.action.statusId}）` +
                        `— 状态通常施加给对手，请确认是否正确`
                    );
                }
            }
        }
        expect(violations).toEqual([]);
    });
});

// ============================================================================
// 3. 技能效果 target 合理性（abilities 层）
// ============================================================================

describe('技能效果 target 合理性', () => {
    const allEffects = getAllAbilityEffectsFlat();

    it('grantToken 效果不应使用 target:select', () => {
        const violations: string[] = [];
        for (const { heroId, abilityId, variantId, effect } of allEffects) {
            if (!effect.action) continue;
            if (effect.action.type === 'grantToken' && effect.action.target === 'select') {
                const label = variantId ? `${heroId}/${abilityId}/${variantId}` : `${heroId}/${abilityId}`;
                violations.push(
                    `[${label}] grantToken 使用 target:'select'（tokenId: ${effect.action.tokenId}）`
                );
            }
        }
        expect(violations).toEqual([]);
    });
});

// ============================================================================
// 4. bonusCp 参数一致性
// ============================================================================

describe('bonusCp 参数消费一致性', () => {
    const allEffects = getAllAbilityEffectsFlat();

    /**
     * 找出所有传了 params.bonusCp 的 custom action 效果，
     * 验证对应 handler 函数体中包含 bonusCp 读取逻辑。
     *
     * 检测方法：将 handler 函数转为字符串（Function.prototype.toString），
     * 检查是否包含 'bonusCp' 字样。这是一种轻量级的静态分析。
     */
    it('传递 params.bonusCp 的 custom action handler 必须读取 bonusCp', () => {
        const violations: string[] = [];

        for (const { heroId, abilityId, variantId, effect } of allEffects) {
            if (!effect.action) continue;
            if (effect.action.type !== 'custom') continue;

            const params = (effect.action as Record<string, unknown>).params as Record<string, unknown> | undefined;
            if (!params || params.bonusCp === undefined) continue;

            const actionId = effect.action.customActionId;
            if (!actionId) continue;

            const handler = getCustomActionHandler(actionId);
            if (!handler) {
                violations.push(
                    `[${heroId}/${abilityId}] customActionId="${actionId}" 传了 bonusCp=${params.bonusCp} 但 handler 未注册`
                );
                continue;
            }

            // 将 handler 函数转为字符串，检查是否读取了 bonusCp
            const handlerSource = handler.toString();
            if (!handlerSource.includes('bonusCp')) {
                const label = variantId ? `${heroId}/${abilityId}/${variantId}` : `${heroId}/${abilityId}`;
                violations.push(
                    `[${label}] customActionId="${actionId}" 接收 params.bonusCp=${params.bonusCp} 但 handler 函数体中未读取 bonusCp`
                );
            }
        }

        expect(violations).toEqual([]);
    });

    /**
     * 卡牌层同样检查：卡牌效果中传了 params.bonusCp 的 custom action
     */
    it('卡牌效果中传递 params.bonusCp 的 custom action handler 必须读取 bonusCp', () => {
        const violations: string[] = [];
        const allCards = getAllUniqueCards();

        for (const card of allCards) {
            if (!card.effects) continue;
            for (const effect of card.effects) {
                if (!effect.action || effect.action.type !== 'custom') continue;

                const params = (effect.action as Record<string, unknown>).params as Record<string, unknown> | undefined;
                if (!params || params.bonusCp === undefined) continue;

                const actionId = (effect.action as Record<string, unknown>).customActionId as string;
                if (!actionId) continue;

                const handler = getCustomActionHandler(actionId);
                if (!handler) continue; // handler 注册检查由 entity-chain-integrity 覆盖

                const handlerSource = handler.toString();
                if (!handlerSource.includes('bonusCp')) {
                    violations.push(
                        `[card:${card.id}] customActionId="${actionId}" 接收 params.bonusCp=${params.bonusCp} 但 handler 未读取 bonusCp`
                    );
                }
            }
        }

        expect(violations).toEqual([]);
    });
});
