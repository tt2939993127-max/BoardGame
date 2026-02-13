/**
 * SummonerWars 实体交互链完整性测试
 *
 * 验证 AbilityDef 中所有 custom actionId 引用都有对应的处理器。
 * 三条合法路径：
 * 1. swCustomActionRegistry → abilityResolver case 'custom' 直接调用 handler
 * 2. HANDLED_BY_UI_EVENTS → fallback ABILITY_TRIGGERED 被 useGameEvents.ts 消费
 * 3. HANDLED_BY_EXECUTE → 父技能通过 ACTIVATE_ABILITY 命令进入 execute.ts switch
 *
 * 不在任何集合中的 actionId → 断链（测试失败）
 */

import { abilityRegistry } from '../domain/abilities';
import { swCustomActionRegistry } from '../domain/customActionHandlers';
import type { AbilityDef, AbilityEffect } from '../domain/abilities';
import {
    createRegistryIntegritySuite,
    createRefChainSuite,
    createTriggerPathSuite,
    type RefChain,
} from '../../../engine/testing/entityIntegritySuite';

// ============================================================================
// 合法路径白名单（非 registry 处理的 actionId 必须显式登记）
// ============================================================================

/**
 * fallback ABILITY_TRIGGERED 事件被 useGameEvents.ts 消费的 actionId
 * 修改后必须同步更新 useGameEvents.ts 中的事件消费逻辑
 */
const HANDLED_BY_UI_EVENTS = new Set([
    'illusion_copy',          // useGameEvents → setAbilityMode('illusion')
    'blood_rune_choice',      // useGameEvents → setAbilityMode('blood_rune')
    'ice_shards_damage',      // useGameEvents → setAbilityMode('ice_shards')
    'feed_beast_check',       // useGameEvents → setAbilityMode('feed_beast')
    'rapid_fire_extra_attack', // execute.ts DECLARE_ATTACK 后检查 + 授予额外攻击
]);

/**
 * 父技能整体由 execute.ts ACTIVATE_ABILITY switch 处理，
 * custom effect 声明仅用于 AbilityDef 数据完整性，不走 abilityResolver
 * 修改后必须同步更新 execute.ts executeActivateAbility()
 */
const HANDLED_BY_EXECUTE = new Set([
    // 堕落王国
    'soul_transfer_request',  // → execute case 'soul_transfer'
    // 欺心巫族
    'mind_capture_check',     // → execute case 'mind_capture_resolve'
    'mind_capture_resolve',   // → execute case 'mind_capture_resolve'（决策分支）
    'vanish_swap',            // → execute case 'vanish'
    // 洞穴地精
    'ferocity_extra_attack',  // → execute 攻击后检查
    'grab_follow',            // → execute MOVE_UNIT 中的抓附检查
    'magic_addiction_check',  // → execute case 'magic_addiction'
    'immobile_check',         // → validate/helpers 移动校验
    // 先锋军团
    'fortress_power_retrieve', // → execute case 'fortress_power'
    'fortress_elite_boost',    // → onDamageCalculation 被动
    'guardian_force_target',   // → execute 被动检查
    'holy_arrow_discard',      // → execute case 'holy_arrow'
    'radiant_shot_boost',      // → execute 攻击前被动
    // 圣骑士
    'healing_convert',         // → swCustomActionRegistry (也在此列以保持审计完整)
    'divine_shield_check',     // → swCustomActionRegistry
    // 极地矮人
    'cold_snap_aura',          // → onDamageCalculation 被动
    'frost_bolt_boost',        // → onDamageCalculation 被动
    'greater_frost_bolt_boost', // → onDamageCalculation 被动
    'frost_axe_action',        // → execute case 'frost_axe' 或被动
    'charge_line_move',        // → execute MOVE_UNIT 冲锋检查
    'aerial_strike_aura',      // → onDamageCalculation 被动
    // 亡灵法师
    'fire_sacrifice_summon',   // → execute case 'fire_sacrifice_summon'
    'structure_shift_push_pull', // → execute case 'structure_shift'
    'extended_range',          // → helpers 攻击范围计算
    // 炽原精灵
    'ancestral_bond_transfer', // → execute case 'ancestral_bond'
    'withdraw_push_pull',      // → execute case 'withdraw'
    'speed_up_extra_move',     // → execute/helpers 移动增强
    'spirit_bond_action',      // → execute case 'spirit_bond'
    'stable_immunity',         // → abilityResolver pushPull 免疫检查
]);

// ============================================================================
// 辅助：从 AbilityDef 提取 custom actionId 引用
// ============================================================================

function extractCustomActionChains(def: AbilityDef): RefChain[] {
    return def.effects
        .filter((e): e is Extract<AbilityEffect, { type: 'custom' }> => e.type === 'custom')
        .map(e => ({
            sourceLabel: `AbilityDef.effects`,
            sourceId: def.id,
            refType: 'customAction',
            refId: e.actionId,
        }));
}

// ============================================================================
// 1. AbilityRegistry 注册完整性（工厂函数）
// ============================================================================

createRegistryIntegritySuite<AbilityDef>({
    suiteName: 'AbilityRegistry 注册完整性',
    getDefs: () => abilityRegistry.getAll(),
    getId: def => def.id,
    requiredFields: [
        { name: 'id', check: def => !!def.id },
        { name: 'name', check: def => !!def.name },
    ],
    minCount: 20,
});

// ============================================================================
// 2. Custom ActionId 全量断链检测（工厂函数）
// ============================================================================

const registeredIds = swCustomActionRegistry.getRegisteredIds();
const allHandledIds = new Set([
    ...registeredIds,
    ...HANDLED_BY_UI_EVENTS,
    ...HANDLED_BY_EXECUTE,
]);

createRefChainSuite<AbilityDef>({
    suiteName: 'Custom ActionId 引用链',
    getDefs: () => abilityRegistry.getAll(),
    extractChains: extractCustomActionChains,
    registries: { customAction: allHandledIds },
    minChainCount: 4,
    orphanCheck: { label: 'swCustomActionRegistry', registeredIds },
    staleWhitelists: [
        { label: 'HANDLED_BY_UI_EVENTS', ids: HANDLED_BY_UI_EVENTS },
        { label: 'HANDLED_BY_EXECUTE', ids: HANDLED_BY_EXECUTE },
    ],
});

// ============================================================================
// 3. Activated 技能 UI 触发路径完整性
// ============================================================================

/**
 * activated 技能的 UI 触发路径声明
 *
 * 所有 trigger: 'activated' 的技能需要玩家主动操作才能触发，
 * 必须在此处显式声明其 UI 入口，否则测试失败。
 *
 * 新增 activated 技能时必须同步更新此映射。
 */
const ACTIVATED_UI_CONFIRMED = new Map<string, string>([
    // afterMove 自动触发（execute.ts MOVE_UNIT → ABILITY_TRIGGERED → useGameEvents → Board）
    ['inspire',        'afterMove:auto — MOVE_UNIT 自动充能相邻友方，无 UI 交互'],
    ['spirit_bond',    'afterMove:ui  — StatusBanners 充能自身/转移选择 + cell interaction'],
    ['ancestral_bond', 'afterMove:ui  — StatusBanners + cell interaction 选目标'],
    ['structure_shift', 'afterMove:ui  — StatusBanners + cell interaction 选建筑'],
    ['frost_axe',      'afterMove:ui  — StatusBanners 充能自身/附加士兵 + cell interaction'],
    ['vanish',         'button:attack — Board.tsx 攻击阶段按钮 + cell interaction 0费友方单位'],
    // 手动触发（Board.tsx 静态按钮 → ACTIVATE_ABILITY）
    ['prepare',        'button:move   — Board.tsx 移动阶段按钮'],
    ['revive_undead',  'button:summon — Board.tsx 召唤阶段按钮 + CardSelectorOverlay'],
    ['fire_sacrifice_summon', 'button:summon — AbilityButtonsPanel 召唤阶段按钮 + cell interaction 选友方单位'],
    ['mind_capture_resolve', 'modal:decision — mind_capture 触发后的决策 Modal（控制/伤害）'],
]);

/**
 * 已知 UI 缺失的 activated 技能（TODO 待实装）
 * 此集合中的技能不会导致测试失败，但会在测试输出中打印警告
 */
const ACTIVATED_UI_TODO = new Map<string, string>([
]);

/**
 * CONFIRMED 技能中已知未完成的分支（粒度更细的缺口追踪）
 *
 * 技能整体触发路径已通，但个别分支/交互尚未实装。
 * 与 ACTIVATED_UI_TODO 不同：TODO 是整个技能无 UI，此处是部分分支缺失。
 */
const ACTIVATED_INCOMPLETE_BRANCHES = new Map<string, string[]>([
]);

createTriggerPathSuite<AbilityDef>({
    suiteName: 'Activated 技能 UI 触发路径',
    getItems: () => abilityRegistry.getByTrigger('activated'),
    getId: a => a.id,
    getLabel: a => a.name,
    confirmed: ACTIVATED_UI_CONFIRMED,
    todo: ACTIVATED_UI_TODO,
    incompleteBranches: ACTIVATED_INCOMPLETE_BRANCHES,
    minCount: 5,
});

// ============================================================================
// 4. swCustomActionRegistry 基本健康检查
// ============================================================================

describe('swCustomActionRegistry 健康检查', () => {
    it('至少注册了 6 个 handler', () => {
        expect(swCustomActionRegistry.size).toBeGreaterThanOrEqual(6);
    });

    it('包含核心 handler', () => {
        expect(swCustomActionRegistry.has('soul_transfer_request')).toBe(true);
        expect(swCustomActionRegistry.has('mind_capture_check')).toBe(true);
        expect(swCustomActionRegistry.has('judgment_draw')).toBe(true);
        expect(swCustomActionRegistry.has('guidance_draw')).toBe(true);
        expect(swCustomActionRegistry.has('divine_shield_check')).toBe(true);
        expect(swCustomActionRegistry.has('healing_convert')).toBe(true);
    });
});
