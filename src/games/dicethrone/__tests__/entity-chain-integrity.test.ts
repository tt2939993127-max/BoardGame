/**
 * DiceThrone 实体交互链完整性测试
 *
 * 验证 definition → visual meta → atlas → CharacterData 链路完整无断裂。
 * 使用引擎层 entityIntegritySuite 工厂函数 + referenceValidator 原语。
 */

import { ALL_TOKEN_DEFINITIONS, CHARACTER_DATA_MAP } from '../domain/characters';
import { STATUS_EFFECT_META, TOKEN_META } from '../domain/statusEffects';
import type { TokenDef } from '../domain/tokenTypes';
import type { AbilityEffect } from '../domain/combat';
import type { AbilityCard } from '../domain/types';
import type { AbilityDef } from '../domain/combat/types';
import { getRegisteredCustomActionIds, isCustomActionCategory } from '../domain/effects';
import {
    createRegistryIntegritySuite,
    createEffectContractSuite,
    extractRefChains,
    type RefChain,
    type EffectContractRule,
} from '../../../engine/testing/entityIntegritySuite';
import type { SelectableCharacterId } from '../domain/types';

// 各英雄卡牌
import { MONK_CARDS } from '../heroes/monk/cards';
import { BARBARIAN_CARDS } from '../heroes/barbarian/cards';
import { PYROMANCER_CARDS } from '../heroes/pyromancer/cards';
import { SHADOW_THIEF_CARDS } from '../heroes/shadow_thief/cards';
import { MOON_ELF_CARDS } from '../heroes/moon_elf/cards';
import { PALADIN_CARDS } from '../heroes/paladin/cards';
import { COMMON_CARDS } from '../domain/commonCards';

// ============================================================================
// 1. TokenDef 视觉元数据完整性
// ============================================================================

createRegistryIntegritySuite<TokenDef>({
    suiteName: 'TokenDef 视觉元数据完整性',
    getDefs: () => ALL_TOKEN_DEFINITIONS,
    getId: def => def.id,
    requiredFields: [
        { name: 'frameId', check: def => !!def.frameId },
        { name: 'atlasId', check: def => !!def.atlasId },
    ],
    minCount: 1,
});

// ============================================================================
// 2. CharacterData 图集路径完整性
// ============================================================================

describe('CharacterData 图集路径完整性', () => {
    const realHeroes: SelectableCharacterId[] = [
        'monk', 'barbarian', 'pyromancer', 'shadow_thief', 'moon_elf', 'paladin',
    ];

    it.each(realHeroes)('%s 有 statusAtlasId', (heroId) => {
        const data = CHARACTER_DATA_MAP[heroId];
        expect(data.statusAtlasId).toBeTruthy();
    });

    it.each(realHeroes)('%s 有 statusAtlasPath（以 .json 结尾）', (heroId) => {
        const data = CHARACTER_DATA_MAP[heroId];
        expect(data.statusAtlasPath).toMatch(/\.json$/);
    });

    it('所有 TokenDef.atlasId 都在某个 CharacterData 的 statusAtlasId 中', () => {
        const knownAtlasIds = new Set(
            Object.values(CHARACTER_DATA_MAP).map(d => d.statusAtlasId),
        );
        const orphans = ALL_TOKEN_DEFINITIONS.filter(
            d => d.atlasId && !knownAtlasIds.has(d.atlasId),
        );
        expect(orphans.map(d => `${d.id} → ${d.atlasId}`)).toEqual([]);
    });
});

// ============================================================================
// 3. META 表覆盖率（从 TokenDef 自动派生后应 100% 覆盖）
// ============================================================================

describe('META 表覆盖率', () => {
    it('STATUS_EFFECT_META 覆盖所有 debuff 类别 Token', () => {
        const debuffs = ALL_TOKEN_DEFINITIONS.filter(d => d.category === 'debuff');
        for (const def of debuffs) {
            expect(STATUS_EFFECT_META).toHaveProperty(def.id);
        }
    });

    it('TOKEN_META 覆盖所有非 debuff 类别 Token', () => {
        const tokens = ALL_TOKEN_DEFINITIONS.filter(d => d.category !== 'debuff');
        for (const def of tokens) {
            expect(TOKEN_META).toHaveProperty(def.id);
        }
    });

    it('META.frameId 与 TokenDef.frameId 一致', () => {
        for (const def of ALL_TOKEN_DEFINITIONS) {
            const meta = def.category === 'debuff'
                ? STATUS_EFFECT_META[def.id]
                : TOKEN_META[def.id];
            expect(meta?.frameId).toBe(def.frameId);
        }
    });

    it('META.atlasId 与 TokenDef.atlasId 一致', () => {
        for (const def of ALL_TOKEN_DEFINITIONS) {
            const meta = def.category === 'debuff'
                ? STATUS_EFFECT_META[def.id]
                : TOKEN_META[def.id];
            expect(meta?.atlasId).toBe(def.atlasId);
        }
    });
});

// ============================================================================
// 4. customActionId 引用链（使用 validateReferences）
// ============================================================================

describe('customActionId 引用链', () => {
    // 从 TokenDef 中提取 customActionId 引用
    const tokenChains = extractRefChains<TokenDef>(
        ALL_TOKEN_DEFINITIONS,
        (def) => {
            const chains: RefChain[] = [];
            const actions = def.passiveTrigger?.actions ?? [];
            for (const action of actions) {
                if (action.type === 'custom' && action.customActionId) {
                    chains.push({
                        sourceLabel: 'TokenDef.passiveTrigger',
                        sourceId: def.id,
                        refType: 'customAction',
                        refId: action.customActionId,
                    });
                }
            }
            return chains;
        },
    );

    it('TokenDef 中提取到 customActionId 引用', () => {
        // 至少 paladin-blessing-prevent 和 shadow_thief-sneak-prevent 应存在
        expect(tokenChains.length).toBeGreaterThanOrEqual(2);
    });

    it('所有 TokenDef customActionId 有对应的 handler 注册（注释参考）', () => {
        // 注意：customAction handler 在 game.ts 的 effects 模块中注册，
        // 目前还没有统一的 ActionHandlerRegistry 实例来查询。
        // 此测试验证引用存在，handler 注册验证将在 registry 迁移后完善。
        for (const chain of tokenChains) {
            expect(chain.refId).toBeTruthy();
            expect(chain.refId.length).toBeGreaterThan(0);
        }
    });
});

// ============================================================================
// 5. 每个英雄的 Token 定义 ↔ initialTokens 一致性
// ============================================================================

describe('英雄 Token 定义 ↔ initialTokens 一致性', () => {
    const realHeroes: SelectableCharacterId[] = [
        'monk', 'barbarian', 'pyromancer', 'shadow_thief', 'moon_elf', 'paladin',
    ];

    it.each(realHeroes)('%s: initialTokens 键覆盖所有 tokens 定义', (heroId) => {
        const data = CHARACTER_DATA_MAP[heroId];
        const defIds = data.tokens.map(t => t.id);
        const initKeys = Object.keys(data.initialTokens);
        // initialTokens 应覆盖 tokens 中的消耗型/buff 类，可能不含共享 debuff
        for (const key of initKeys) {
            expect(defIds).toContain(key);
        }
    });
});

// ============================================================================
// 6. 效果数据契约验证（通用守卫）
// ============================================================================

/**
 * 需要 random 的 action type 集合
 * 这些 action 在 resolveEffectAction 中检查 `if (!random) break`，
 * 如果落入不传 random 的时机（如 preDefense），会静默跳过。
 */
const ACTIONS_REQUIRING_RANDOM = new Set(['rollDie', 'drawCard']);

/**
 * 从 AbilityEffect 中提取 action type（兼容无 action 的纯描述效果）
 */
function getActionType(effect: AbilityEffect): string | undefined {
    return effect.action?.type;
}

// --------------------------------------------------------------------------
// 6a. 技能效果契约（abilities）
// --------------------------------------------------------------------------

/** 收集所有英雄的所有技能定义 */
function getAllAbilityDefs(): Array<{ heroId: string; ability: AbilityDef }> {
    const result: Array<{ heroId: string; ability: AbilityDef }> = [];
    for (const [heroId, data] of Object.entries(CHARACTER_DATA_MAP)) {
        for (const ability of data.abilities as AbilityDef[]) {
            result.push({ heroId, ability });
        }
    }
    return result;
}

/** 从技能定义中提取所有效果（含变体） */
function extractAbilityEffects(entry: { heroId: string; ability: AbilityDef }): AbilityEffect[] {
    const effects: AbilityEffect[] = [];
    if (entry.ability.effects) {
        effects.push(...entry.ability.effects);
    }
    if (entry.ability.variants) {
        for (const variant of entry.ability.variants) {
            effects.push(...variant.effects);
        }
    }
    return effects;
}

/** 技能效果契约规则 */
const abilityEffectRules: EffectContractRule<AbilityEffect>[] = [
    {
        name: '需要 random 的 action 必须有显式 timing（非 preDefense 默认值）',
        appliesTo: (e) => {
            const t = getActionType(e);
            return t !== undefined && ACTIONS_REQUIRING_RANDOM.has(t);
        },
        check: (e) => e.timing !== undefined,
        describeViolation: (e) =>
            `action.type="${e.action!.type}" 缺少 timing（会落入 preDefense，不传 random 导致静默跳过）`,
    },
    {
        name: '需要 random 的 custom action（dice 类别）必须有显式 timing',
        appliesTo: (e) => {
            if (getActionType(e) !== 'custom') return false;
            const id = e.action!.customActionId;
            // 只检查 dice 类别的 custom action（使用 random 投骰）
            return !!id && isCustomActionCategory(id, 'dice');
        },
        check: (e) => e.timing !== undefined,
        describeViolation: (e) =>
            `dice 类别 custom action "${e.action!.customActionId}" 缺少 timing（会落入 preDefense，不传 random 导致静默跳过）`,
    },
    {
        name: 'rollDie 必须有 conditionalEffects',
        appliesTo: (e) => getActionType(e) === 'rollDie',
        check: (e) => Array.isArray(e.action!.conditionalEffects) && e.action!.conditionalEffects.length > 0,
        describeViolation: () =>
            `rollDie 缺少 conditionalEffects（投掷后无条件效果，骰子结果不会产生任何作用）`,
    },
    {
        name: 'custom action 的 customActionId 必须在注册表中',
        appliesTo: (e) => getActionType(e) === 'custom' && !!e.action!.customActionId,
        check: (e) => getRegisteredCustomActionIds().has(e.action!.customActionId!),
        describeViolation: (e) =>
            `customActionId="${e.action!.customActionId}" 未在 customActionRegistry 中注册`,
    },
    {
        name: 'replaceAbility 必须有 targetAbilityId 和 newAbilityDef',
        appliesTo: (e) => getActionType(e) === 'replaceAbility',
        check: (e) => !!e.action!.targetAbilityId && !!e.action!.newAbilityDef,
        describeViolation: () =>
            `replaceAbility 缺少 targetAbilityId 或 newAbilityDef`,
    },
];

createEffectContractSuite({
    suiteName: '技能效果数据契约',
    getSources: getAllAbilityDefs,
    getSourceId: (entry) => `${entry.heroId}/${entry.ability.id}`,
    extractEffects: extractAbilityEffects,
    rules: abilityEffectRules,
    minSourceCount: 20,
});

// --------------------------------------------------------------------------
// 6b. 卡牌效果契约（cards）
// --------------------------------------------------------------------------

/** 收集所有英雄卡牌 + 通用卡牌 */
function getAllCards(): AbilityCard[] {
    return [
        ...MONK_CARDS,
        ...BARBARIAN_CARDS,
        ...PYROMANCER_CARDS,
        ...SHADOW_THIEF_CARDS,
        ...MOON_ELF_CARDS,
        ...PALADIN_CARDS,
        ...COMMON_CARDS,
    ];
}

/** 卡牌效果契约规则 */
const cardEffectRules: EffectContractRule<AbilityEffect>[] = [
    {
        name: '主阶段行动卡的 custom/rollDie/drawCard 效果必须有 timing: immediate',
        appliesTo: (e) => {
            const t = getActionType(e);
            if (t === undefined) return false;
            if (t !== 'custom' && !ACTIONS_REQUIRING_RANDOM.has(t)) return false;
            // 攻击修改器卡（timing: 'withDamage'）走战斗结算路径，不要求 immediate
            // TODO: 攻击修改器卡的执行路径需要独立架构支持
            if (e.timing === 'withDamage') return false;
            return true;
        },
        check: (e) => e.timing === 'immediate',
        describeViolation: (e) =>
            `action.type="${e.action!.type}" 缺少 timing: 'immediate'（卡牌效果只执行 immediate 时机，缺失会导致效果完全不执行）`,
    },
    {
        name: 'custom action 的 customActionId 必须在注册表中',
        appliesTo: (e) => getActionType(e) === 'custom' && !!e.action!.customActionId,
        check: (e) => getRegisteredCustomActionIds().has(e.action!.customActionId!),
        describeViolation: (e) =>
            `customActionId="${e.action!.customActionId}" 未在 customActionRegistry 中注册`,
    },
    {
        name: '升级卡的 replaceAbility 必须有 timing: immediate',
        appliesTo: (e) => getActionType(e) === 'replaceAbility',
        check: (e) => e.timing === 'immediate',
        describeViolation: () =>
            `replaceAbility 缺少 timing: 'immediate'（升级卡效果不会执行）`,
    },
    {
        name: 'replaceAbility 必须有 targetAbilityId 和 newAbilityDef',
        appliesTo: (e) => getActionType(e) === 'replaceAbility',
        check: (e) => !!e.action!.targetAbilityId && !!e.action!.newAbilityDef,
        describeViolation: () =>
            `replaceAbility 缺少 targetAbilityId 或 newAbilityDef`,
    },
];

createEffectContractSuite({
    suiteName: '卡牌效果数据契约',
    getSources: () => getAllCards().filter(c => c.effects && c.effects.length > 0),
    getSourceId: (card) => card.id,
    extractEffects: (card) => card.effects ?? [],
    rules: cardEffectRules,
    minSourceCount: 10,
});

// --------------------------------------------------------------------------
// 6c. TokenDef 被动触发契约
// --------------------------------------------------------------------------

/** TokenDef 被动触发效果契约规则 */
const tokenPassiveRules: EffectContractRule<{ tokenId: string; action: AbilityEffect['action'] }>[] = [
    {
        name: 'custom action 的 customActionId 必须在注册表中',
        appliesTo: (e) => e.action?.type === 'custom' && !!e.action.customActionId,
        check: (e) => getRegisteredCustomActionIds().has(e.action!.customActionId!),
        describeViolation: (e) =>
            `customActionId="${e.action!.customActionId}" 未在 customActionRegistry 中注册`,
    },
];

createEffectContractSuite({
    suiteName: 'TokenDef 被动触发数据契约',
    getSources: () => ALL_TOKEN_DEFINITIONS.filter(d => d.passiveTrigger?.actions?.length),
    getSourceId: (def) => def.id,
    extractEffects: (def) =>
        (def.passiveTrigger?.actions ?? []).map(a => ({ tokenId: def.id, action: a })),
    rules: tokenPassiveRules,
    minSourceCount: 1,
});
