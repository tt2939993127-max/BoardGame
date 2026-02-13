/**
 * DiceThrone 卡牌完整性审计测试
 *
 * 使用引擎层 cardCompletenessAudit 工厂函数，静态分析检测卡牌定义中的常见遗漏：
 * - playCondition 缺失（描述暗示条件但未实现）
 * - 骰子操作卡缺少骰子前置条件
 * - 升级卡结构完整性
 * - 行动卡效果完整性
 * - 占位符检测
 *
 * 目标：新增卡牌时自动捕获遗漏，避免手动审计。
 */

import { describe, it, expect } from 'vitest';
import type { AbilityCard, CardPlayCondition } from '../domain/types';
import { isCustomActionCategory } from '../domain/effects';
import {
    createCardCompletenessAuditSuite,
    createCardStructureCheck,
    type AuditableCard,
    type AuditableCardEffect,
} from '../../../engine/testing/cardCompletenessAudit';

// 各英雄卡牌
import { MONK_CARDS } from '../heroes/monk/cards';
import { BARBARIAN_CARDS } from '../heroes/barbarian/cards';
import { PYROMANCER_CARDS } from '../heroes/pyromancer/cards';
import { SHADOW_THIEF_CARDS } from '../heroes/shadow_thief/cards';
import { MOON_ELF_CARDS } from '../heroes/moon_elf/cards';
import { PALADIN_CARDS } from '../heroes/paladin/cards';
import { COMMON_CARDS } from '../domain/commonCards';

// i18n 描述（用于条件性语言检测）
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

/** AbilityCard → AuditableCard 适配 */
function toAuditableCards(cards: AbilityCard[]): AuditableCard[] {
    return cards.map(card => ({
        id: card.id,
        type: card.type,
        timing: card.timing,
        effects: card.effects?.map(e => ({
            description: e.description ?? '',
            action: e.action ? {
                type: e.action.type,
                target: e.action.target,
                customActionId: (e.action as Record<string, unknown>).customActionId,
            } : undefined,
            timing: e.timing,
        } as AuditableCardEffect)),
        playCondition: card.playCondition as Record<string, unknown> | undefined,
        meta: { name: card.name },
    }));
}

/** 获取卡牌的 i18n 描述列表（中英文） */
function getDescriptions(cardId: string): string[] {
    const cards = (zhCN as Record<string, unknown>).cards as Record<string, { description?: string }> ?? {};
    const cardsEn = (en as Record<string, unknown>).cards as Record<string, { description?: string }> ?? {};
    return [cards[cardId]?.description, cardsEn[cardId]?.description].filter((d): d is string => !!d);
}

/** 检查卡牌是否有骰子修改效果（改骰面/重掷，不含投掷新骰） */
function hasDiceModifyEffect(card: AuditableCard): boolean {
    if (!card.effects) return false;
    return card.effects.some(e => {
        if (!e.action) return false;
        if (e.action.type === 'custom' && e.action['customActionId']) {
            const id = e.action['customActionId'] as string;
            return id.includes('modify-die') || id.includes('reroll');
        }
        return false;
    });
}

// ============================================================================
// 数据准备
// ============================================================================

const allCards = getAllUniqueCards();
const auditableCards = toAuditableCards(allCards);
const actionCards = auditableCards.filter(c => c.type === 'action');

// ============================================================================
// 使用工厂函数创建审计套件
// ============================================================================

createCardCompletenessAuditSuite({
    suiteName: 'DiceThrone 卡牌完整性审计',

    // 1. 描述条件性语言检测
    descriptionCondition: {
        cards: actionCards,
        getDescriptions,
        rules: [
            {
                name: '描述中包含"造成至少N伤害"条件的卡牌必须有 requireMinDamageDealt',
                patterns: [
                    /如果.*造成.*至少.*\d+.*伤害/,
                    /[Ii]f you have dealt at least \d+ damage/,
                ],
                requiredConditionField: 'requireMinDamageDealt',
            },
            {
                name: '描述中包含"防御结束后"条件的卡牌必须有 requireMinDamageDealt',
                patterns: [
                    /在.*防御.*结束后/,
                    /[Aa]fter.*defense/,
                ],
                requiredConditionField: 'requireMinDamageDealt',
            },
        ],
    },

    // 2. 卡牌结构检查
    cardStructure: {
        cards: auditableCards,
        rules: [
            // 骰子修改卡前置条件
            {
                name: '修改/重掷骰子的卡牌必须有 requireDiceExists 或 requireHasRolled',
                appliesTo: (card) => card.type === 'action' && hasDiceModifyEffect(card) && card.id !== 'card-give-hand',
                check: (card) => {
                    const cond = card.playCondition;
                    return !!(cond && (cond['requireDiceExists'] === true || cond['requireHasRolled'] === true));
                },
                describeViolation: (card) => `有骰子修改效果但缺少 requireDiceExists/requireHasRolled 条件（timing: ${card.timing}）`,
            },
            // 升级卡必须有 replaceAbility 或 custom 效果
            {
                name: '升级卡必须有 replaceAbility 或 custom 效果',
                appliesTo: (card) => card.type === 'upgrade',
                check: (card) => {
                    return card.effects?.some(e => e.action?.type === 'replaceAbility' || e.action?.type === 'custom') ?? false;
                },
                describeViolation: () => '升级卡缺少 replaceAbility 或 custom 效果',
            },
            // 升级卡 timing 必须是 main
            {
                name: '升级卡的 timing 必须是 main',
                appliesTo: (card) => card.type === 'upgrade',
                check: (card) => card.timing === 'main',
                describeViolation: (card) => `升级卡 timing 应为 'main'，实际为 '${card.timing}'`,
            },
            // 行动卡必须有至少一个效果
            {
                name: '行动卡必须有至少一个效果',
                appliesTo: (card) => card.type === 'action',
                check: (card) => (card.effects?.length ?? 0) > 0,
                describeViolation: () => '行动卡缺少 effects',
            },
            // 行动卡效果必须有 action
            {
                name: '行动卡效果必须有 action（纯描述效果无意义）',
                appliesTo: (card) => card.type === 'action' && (card.effects?.length ?? 0) > 0,
                check: (card) => card.effects!.every(e => !!e.action),
                describeViolation: (card) => {
                    const noAction = card.effects?.filter(e => !e.action).map(e => e.description) ?? [];
                    return `有无 action 的效果: ${noAction.join(', ')}`;
                },
            },
        ],
    },

    // 3. 占位符检测
    placeholder: {
        cards: auditableCards,
        patterns: [
            {
                name: '不存在仅含 requireDiceExists: false 的占位 playCondition',
                isPlaceholder: (card) => {
                    if (!card.playCondition) return false;
                    const keys = Object.keys(card.playCondition);
                    return keys.length === 1 && keys[0] === 'requireDiceExists' && card.playCondition['requireDiceExists'] === false;
                },
            },
        ],
    },
});
