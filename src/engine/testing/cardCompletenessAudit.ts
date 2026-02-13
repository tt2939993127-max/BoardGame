/**
 * 引擎层 - 卡牌完整性审计套件工厂
 *
 * 提供通用的卡牌定义静态分析框架，检测常见遗漏：
 * - 描述中的条件性语言 vs 打出条件实现
 * - 效果结构完整性
 * - 占位符/无效配置检测
 * - 自定义契约规则
 *
 * 使用方：各游戏的 card-completeness-audit.test.ts
 */

import { describe, it, expect } from 'vitest';

// ============================================================================
// 类型定义
// ============================================================================

/** 可审计的卡牌（游戏层需适配为此接口） */
export interface AuditableCard {
    /** 唯一 ID */
    id: string;
    /** 卡牌类型（如 'action' | 'upgrade'） */
    type: string;
    /** 卡牌时机（如 'main' | 'roll' | 'instant'） */
    timing: string;
    /** 效果列表 */
    effects?: AuditableCardEffect[];
    /** 打出条件（键值对） */
    playCondition?: Record<string, unknown>;
    /** 游戏特定元数据（供自定义规则使用） */
    meta?: Record<string, unknown>;
}

/** 可审计的卡牌效果 */
export interface AuditableCardEffect {
    /** 效果描述 */
    description: string;
    /** 效果动作 */
    action?: {
        type: string;
        target?: string;
        [key: string]: unknown;
    };
    /** 效果时机 */
    timing?: string;
}

// ============================================================================
// 1. 描述条件检测
// ============================================================================

/** 描述条件规则：描述中的模式 → 必须存在的 playCondition 字段 */
export interface DescriptionConditionRule {
    /** 规则名称（用于测试标题） */
    name: string;
    /** 描述文本匹配模式（支持多语言，任一匹配即触发） */
    patterns: RegExp[];
    /** 匹配后必须存在的 playCondition 字段名 */
    requiredConditionField: string;
    /** 可选：仅对特定卡牌类型生效 */
    appliesTo?: (card: AuditableCard) => boolean;
    /** 白名单：描述匹配但条件在效果内部处理的卡牌 ID */
    whitelist?: Set<string>;
}

export interface DescriptionConditionCheckConfig {
    /** describe 块名称 */
    suiteName: string;
    /** 所有卡牌 */
    cards: AuditableCard[];
    /** 获取卡牌的多语言描述文本列表 */
    getDescriptions: (cardId: string) => string[];
    /** 条件规则列表 */
    rules: DescriptionConditionRule[];
}

/**
 * 生成描述条件检测测试
 *
 * 扫描卡牌的 i18n 描述，找到匹配条件性语言的卡牌，
 * 验证其 playCondition 中是否有对应字段。
 */
export function createDescriptionConditionCheck(config: DescriptionConditionCheckConfig): void {
    describe(config.suiteName, () => {
        for (const rule of config.rules) {
            it(rule.name, () => {
                const violations: string[] = [];

                for (const card of config.cards) {
                    if (rule.appliesTo && !rule.appliesTo(card)) continue;
                    if (rule.whitelist?.has(card.id)) continue;

                    const descriptions = config.getDescriptions(card.id);
                    const matchesAny = descriptions.some(
                        desc => rule.patterns.some(p => p.test(desc))
                    );

                    if (matchesAny) {
                        const cond = card.playCondition;
                        if (!cond || cond[rule.requiredConditionField] === undefined) {
                            violations.push(
                                `[${card.id}] 描述匹配规则"${rule.name}"，` +
                                `但缺少 playCondition.${rule.requiredConditionField}` +
                                `\n  描述: ${descriptions.filter(Boolean).join(' / ')}`
                            );
                        }
                    }
                }

                expect(violations).toEqual([]);
            });
        }
    });
}

// ============================================================================
// 2. 效果结构完整性
// ============================================================================

/** 卡牌结构规则 */
export interface CardStructureRule {
    /** 规则名称 */
    name: string;
    /** 筛选适用的卡牌 */
    appliesTo: (card: AuditableCard) => boolean;
    /** 检查函数：返回 true 表示通过 */
    check: (card: AuditableCard) => boolean;
    /** 违反时的错误描述 */
    describeViolation: (card: AuditableCard) => string;
}

export interface CardStructureCheckConfig {
    /** describe 块名称 */
    suiteName: string;
    /** 所有卡牌 */
    cards: AuditableCard[];
    /** 结构规则列表 */
    rules: CardStructureRule[];
}

/**
 * 生成卡牌结构完整性测试
 */
export function createCardStructureCheck(config: CardStructureCheckConfig): void {
    describe(config.suiteName, () => {
        for (const rule of config.rules) {
            it(rule.name, () => {
                const violations: string[] = [];

                for (const card of config.cards) {
                    if (!rule.appliesTo(card)) continue;
                    if (!rule.check(card)) {
                        violations.push(`  [${card.id}] ${rule.describeViolation(card)}`);
                    }
                }

                expect(violations).toEqual([]);
            });
        }
    });
}

// ============================================================================
// 3. 占位符检测
// ============================================================================

/** 占位符模式 */
export interface PlaceholderPattern {
    /** 规则名称 */
    name: string;
    /** 检测函数：返回 true 表示是占位符 */
    isPlaceholder: (card: AuditableCard) => boolean;
}

export interface PlaceholderCheckConfig {
    /** describe 块名称 */
    suiteName: string;
    /** 所有卡牌 */
    cards: AuditableCard[];
    /** 占位符模式列表 */
    patterns: PlaceholderPattern[];
}

/**
 * 生成占位符检测测试
 */
export function createPlaceholderCheck(config: PlaceholderCheckConfig): void {
    describe(config.suiteName, () => {
        for (const pattern of config.patterns) {
            it(pattern.name, () => {
                const violations: string[] = [];

                for (const card of config.cards) {
                    if (pattern.isPlaceholder(card)) {
                        violations.push(
                            `[${card.id}] 检测到占位符配置，请实现真实逻辑或移除`
                        );
                    }
                }

                expect(violations).toEqual([]);
            });
        }
    });
}

// ============================================================================
// 4. 组合工厂
// ============================================================================

export interface CardCompletenessAuditConfig {
    /** 顶层 describe 名称 */
    suiteName: string;
    /** 描述条件检测（可选） */
    descriptionCondition?: Omit<DescriptionConditionCheckConfig, 'suiteName'>;
    /** 卡牌结构检查（可选） */
    cardStructure?: Omit<CardStructureCheckConfig, 'suiteName'>;
    /** 占位符检测（可选） */
    placeholder?: Omit<PlaceholderCheckConfig, 'suiteName'>;
}

/**
 * 一键创建完整的卡牌完整性审计套件
 */
export function createCardCompletenessAuditSuite(config: CardCompletenessAuditConfig): void {
    describe(config.suiteName, () => {
        if (config.descriptionCondition) {
            createDescriptionConditionCheck({
                suiteName: '描述条件性语言检测',
                ...config.descriptionCondition,
            });
        }
        if (config.cardStructure) {
            createCardStructureCheck({
                suiteName: '卡牌结构完整性',
                ...config.cardStructure,
            });
        }
        if (config.placeholder) {
            createPlaceholderCheck({
                suiteName: '占位符检测',
                ...config.placeholder,
            });
        }
    });
}
