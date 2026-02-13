/**
 * 引擎层 - 能力行为审计套件工厂
 *
 * 通用于任何游戏：给定「卡牌/能力定义」+「i18n 描述文本」+「已注册行为 ID 集合」，
 * 自动检测"描述说了 X 但代码没做 X"的不一致。
 *
 * 设计原则：
 * - 引擎层通用，与具体游戏无关
 * - 游戏层通过 adapter 提供：卡牌列表、i18n 文本、注册表 ID、关键词规则
 * - 纯声明式：关键词 → 预期行为 的映射由游戏层定义
 * - 与 entityIntegritySuite 互补：后者验证引用链，本套件验证语义一致性
 *
 * 五类检查：
 * 1. KeywordBehaviorCheck — 描述关键词 → 代码行为映射（核心）
 * 2. OngoingCollectionCheck — ongoing 卡的注册表查找位置正确性
 * 3. AbilityTagCoverageCheck — 有能力标签的卡必须有对应注册
 * 4. SelfDestructCheck — "消灭本卡"描述 → 自毁触发器存在性
 * 5. ConditionCheck — 描述中的条件语句 → 代码中的条件检查
 *
 * 使用方：各游戏的 abilityBehaviorAudit.test.ts
 */

import { describe, expect, it } from 'vitest';

// ============================================================================
// 通用类型
// ============================================================================

/** 卡牌/能力的最小抽象 */
export interface AuditableEntity {
    /** 唯一 ID */
    id: string;
    /** 显示名称（用于错误消息） */
    name: string;
    /** i18n 描述文本（已解析为实际文本，非 key） */
    descriptionText: string;
    /** 卡牌类型标签（如 'minion' | 'action'） */
    entityType: string;
    /** 子类型（如 'ongoing' | 'standard'） */
    subtype?: string;
    /** 能力标签列表 */
    abilityTags?: string[];
    /** 游戏特定元数据 */
    meta?: Record<string, unknown>;
}

// ============================================================================
// 1. KeywordBehaviorCheck — 关键词→行为映射
// ============================================================================

/** 关键词行为规则 */
export interface KeywordBehaviorRule {
    /** 规则名称（用于测试标题） */
    name: string;
    /** 描述文本中的关键词模式（正则） */
    keywordPattern: RegExp;
    /** 可选：仅对特定实体类型生效 */
    appliesTo?: (entity: AuditableEntity) => boolean;
    /**
     * 检查函数：给定匹配了关键词的实体 ID，验证对应行为是否已注册
     * 返回 true 表示通过
     */
    checkBehavior: (entityId: string, entity: AuditableEntity) => boolean;
    /** 违反时的错误描述 */
    violationMessage: (entityId: string, entity: AuditableEntity) => string;
}

export interface KeywordBehaviorCheckConfig {
    /** describe 块名称 */
    suiteName: string;
    /** 所有可审计实体 */
    entities: AuditableEntity[];
    /** 关键词→行为规则列表 */
    rules: KeywordBehaviorRule[];
}

/**
 * 生成关键词→行为映射测试
 *
 * 对每条规则：扫描所有实体的描述文本，找到匹配关键词的实体，
 * 然后验证对应行为是否已注册。
 */
export function createKeywordBehaviorCheck(config: KeywordBehaviorCheckConfig): void {
    describe(config.suiteName, () => {
        for (const rule of config.rules) {
            it(rule.name, () => {
                const violations: string[] = [];

                for (const entity of config.entities) {
                    // 跳过不适用的实体
                    if (rule.appliesTo && !rule.appliesTo(entity)) continue;
                    // 检查描述是否包含关键词
                    if (!rule.keywordPattern.test(entity.descriptionText)) continue;
                    // 验证行为是否已注册
                    if (!rule.checkBehavior(entity.id, entity)) {
                        violations.push(
                            `  [${entity.id}]（${entity.name}）: ${rule.violationMessage(entity.id, entity)}`
                        );
                    }
                }

                if (violations.length > 0) {
                    expect(violations, `${rule.name} 违反列表`).toEqual([]);
                }
            });
        }
    });
}

// ============================================================================
// 2. OngoingCollectionCheck — ongoing 卡注册表查找位置
// ============================================================================

/** ongoing 卡注册信息 */
export interface OngoingRegistration {
    /** 卡牌 defId */
    entityId: string;
    /** 注册类型（trigger / protection / restriction / powerModifier / breakpointModifier） */
    registrationType: string;
}

export interface OngoingCollectionCheckConfig {
    /** describe 块名称 */
    suiteName: string;
    /**
     * 所有 ongoing 类型的行动卡 ID 集合
     * （subtype === 'ongoing' && entityType === 'action'）
     */
    ongoingActionIds: Set<string>;
    /**
     * 所有已注册的 ongoing 效果（trigger/protection/restriction/modifier）
     * 的 sourceDefId 列表
     */
    registeredOngoingIds: OngoingRegistration[];
    /**
     * 白名单：某些 ongoing 行动卡可能不需要注册效果
     * （如纯被动效果由其他系统处理）
     */
    whitelist?: Set<string>;
}

/**
 * 生成 ongoing 行动卡注册覆盖检查
 *
 * 确保每张 ongoing 行动卡都在某个注册表中有对应条目。
 */
export function createOngoingCollectionCheck(config: OngoingCollectionCheckConfig): void {
    describe(config.suiteName, () => {
        it('所有 ongoing 行动卡都有对应的效果注册', () => {
            const registeredIds = new Set(config.registeredOngoingIds.map(r => r.entityId));
            const whitelist = config.whitelist ?? new Set();
            const missing: string[] = [];

            for (const id of config.ongoingActionIds) {
                if (whitelist.has(id)) continue;
                if (!registeredIds.has(id)) {
                    missing.push(id);
                }
            }

            if (missing.length > 0) {
                expect(
                    missing,
                    `以下 ongoing 行动卡未注册任何效果（trigger/protection/restriction/modifier）`
                ).toEqual([]);
            }
        });

        it('所有注册的 ongoing 效果来源都是有效的卡牌 ID', () => {
            // 这里不限制只检查 ongoing 行动卡，因为随从也可以注册 ongoing 效果
            // 但至少确保 ID 不是空的或明显错误的
            const invalidEntries: string[] = [];
            for (const reg of config.registeredOngoingIds) {
                if (!reg.entityId || reg.entityId.trim() === '') {
                    invalidEntries.push(`空 ID (${reg.registrationType})`);
                }
            }
            expect(invalidEntries).toEqual([]);
        });
    });
}

// ============================================================================
// 3. AbilityTagCoverageCheck — 能力标签覆盖
// ============================================================================

export interface AbilityTagCoverageConfig {
    /** describe 块名称 */
    suiteName: string;
    /** 所有可审计实体 */
    entities: AuditableEntity[];
    /**
     * 已注册的能力执行器 ID 集合
     * 格式取决于游戏：可以是 "defId::tag" 或纯 "defId"
     */
    registeredAbilityIds: Set<string>;
    /**
     * 从实体 + abilityTag 生成注册表 key 的函数
     * 例如 SmashUp: (id, tag) => `${id}::${tag}`
     */
    makeRegistryKey: (entityId: string, tag: string) => string;
    /**
     * 白名单：某些标签不需要注册执行器
     * 例如 'ongoing' 标签由 ongoingEffects 系统处理
     */
    exemptTags?: Set<string>;
}

/**
 * 生成能力标签覆盖测试
 *
 * 确保每个有 abilityTag 的实体都有对应的执行器注册。
 */
export function createAbilityTagCoverageCheck(config: AbilityTagCoverageConfig): void {
    describe(config.suiteName, () => {
        it('所有能力标签都有对应的执行器注册', () => {
            const exemptTags = config.exemptTags ?? new Set();
            const missing: string[] = [];

            for (const entity of config.entities) {
                if (!entity.abilityTags || entity.abilityTags.length === 0) continue;
                for (const tag of entity.abilityTags) {
                    if (exemptTags.has(tag)) continue;
                    const key = config.makeRegistryKey(entity.id, tag);
                    if (!config.registeredAbilityIds.has(key)) {
                        missing.push(`  [${entity.id}] tag="${tag}" → key="${key}" 未注册`);
                    }
                }
            }

            if (missing.length > 0) {
                expect(missing, '以下能力标签缺少执行器注册').toEqual([]);
            }
        });
    });
}

// ============================================================================
// 4. SelfDestructCheck — 自毁行为完整性
// ============================================================================

export interface SelfDestructCheckConfig {
    /** describe 块名称 */
    suiteName: string;
    /** 所有可审计实体 */
    entities: AuditableEntity[];
    /** 描述中表示"消灭本卡"的正则模式列表 */
    selfDestructPatterns: RegExp[];
    /**
     * 检查函数：给定实体 ID，验证是否有自毁触发器注册
     * 返回 true 表示已注册
     */
    hasSelfDestructBehavior: (entityId: string, entity: AuditableEntity) => boolean;
    /** 白名单 */
    whitelist?: Set<string>;
}

/**
 * 生成自毁行为完整性测试
 *
 * 扫描描述中包含"消灭本卡"模式的实体，验证代码中有对应的自毁逻辑。
 */
export function createSelfDestructCheck(config: SelfDestructCheckConfig): void {
    describe(config.suiteName, () => {
        it('描述中有"消灭本卡"的实体都有自毁行为注册', () => {
            const whitelist = config.whitelist ?? new Set();
            const violations: string[] = [];

            for (const entity of config.entities) {
                if (whitelist.has(entity.id)) continue;
                const hasSelfDestructText = config.selfDestructPatterns.some(
                    p => p.test(entity.descriptionText)
                );
                if (!hasSelfDestructText) continue;
                if (!config.hasSelfDestructBehavior(entity.id, entity)) {
                    violations.push(
                        `  [${entity.id}]（${entity.name}）: 描述含"消灭本卡"但未注册自毁行为`
                    );
                }
            }

            if (violations.length > 0) {
                expect(violations, '以下实体缺少自毁行为').toEqual([]);
            }
        });
    });
}

// ============================================================================
// 5. ConditionCheck — 条件语句完整性
// ============================================================================

/** 条件规则 */
export interface ConditionRule {
    /** 规则名称 */
    name: string;
    /** 描述中的条件模式（正则） */
    conditionPattern: RegExp;
    /** 可选：仅对特定实体类型生效 */
    appliesTo?: (entity: AuditableEntity) => boolean;
    /**
     * 检查函数：验证代码中是否有对应的条件检查
     * 返回 true 表示通过
     */
    hasConditionCheck: (entityId: string, entity: AuditableEntity) => boolean;
    /** 违反时的错误描述 */
    violationMessage: string;
}

export interface ConditionCheckConfig {
    /** describe 块名称 */
    suiteName: string;
    /** 所有可审计实体 */
    entities: AuditableEntity[];
    /** 条件规则列表 */
    rules: ConditionRule[];
}

/**
 * 生成条件语句完整性测试
 *
 * 扫描描述中包含条件语句的实体，验证代码中有对应的条件检查。
 */
export function createConditionCheck(config: ConditionCheckConfig): void {
    describe(config.suiteName, () => {
        for (const rule of config.rules) {
            it(rule.name, () => {
                const violations: string[] = [];

                for (const entity of config.entities) {
                    if (rule.appliesTo && !rule.appliesTo(entity)) continue;
                    if (!rule.conditionPattern.test(entity.descriptionText)) continue;
                    if (!rule.hasConditionCheck(entity.id, entity)) {
                        violations.push(
                            `  [${entity.id}]（${entity.name}）: ${rule.violationMessage}`
                        );
                    }
                }

                if (violations.length > 0) {
                    expect(violations, `${rule.name} 违反列表`).toEqual([]);
                }
            });
        }
    });
}

// ============================================================================
// 组合工厂：一键创建完整审计套件
// ============================================================================

export interface FullAuditSuiteConfig {
    /** 顶层 describe 名称 */
    suiteName: string;
    /** 关键词行为检查（可选） */
    keywordBehavior?: Omit<KeywordBehaviorCheckConfig, 'suiteName'>;
    /** ongoing 集合检查（可选） */
    ongoingCollection?: Omit<OngoingCollectionCheckConfig, 'suiteName'>;
    /** 能力标签覆盖检查（可选） */
    abilityTagCoverage?: Omit<AbilityTagCoverageConfig, 'suiteName'>;
    /** 自毁行为检查（可选） */
    selfDestruct?: Omit<SelfDestructCheckConfig, 'suiteName'>;
    /** 条件语句检查（可选） */
    condition?: Omit<ConditionCheckConfig, 'suiteName'>;
}

/**
 * 一键创建完整的能力行为审计套件
 *
 * 游戏层只需提供配置，引擎层自动生成所有测试。
 */
export function createAbilityBehaviorAuditSuite(config: FullAuditSuiteConfig): void {
    describe(config.suiteName, () => {
        if (config.keywordBehavior) {
            createKeywordBehaviorCheck({
                suiteName: '关键词→行为映射',
                ...config.keywordBehavior,
            });
        }
        if (config.ongoingCollection) {
            createOngoingCollectionCheck({
                suiteName: 'ongoing 行动卡注册覆盖',
                ...config.ongoingCollection,
            });
        }
        if (config.abilityTagCoverage) {
            createAbilityTagCoverageCheck({
                suiteName: '能力标签执行器覆盖',
                ...config.abilityTagCoverage,
            });
        }
        if (config.selfDestruct) {
            createSelfDestructCheck({
                suiteName: '自毁行为完整性',
                ...config.selfDestruct,
            });
        }
        if (config.condition) {
            createConditionCheck({
                suiteName: '条件语句完整性',
                ...config.condition,
            });
        }
    });
}
