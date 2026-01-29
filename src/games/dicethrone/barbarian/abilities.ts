/**
 * 狂战士英雄的技能定义
 * 使用通用 AbilitySystem
 */

import type { AbilityDef, AbilityEffect, EffectTiming, EffectCondition } from '../../../systems/AbilitySystem';
import { STATUS_IDS, BARBARIAN_DICE_FACE_IDS } from '../domain/ids';

const abilityText = (id: string, field: 'name' | 'description') => `abilities.${id}.${field}`;
const abilityEffectText = (id: string, field: string) => `abilities.${id}.effects.${field}`;

// 辅助函数：创建伤害效果
const damage = (value: number, description: string, opts?: { timing?: EffectTiming; condition?: EffectCondition; unblockable?: boolean }): AbilityEffect => ({
    description,
    action: { type: 'damage', target: 'opponent', value, unblockable: opts?.unblockable },
    timing: opts?.timing,
    condition: opts?.condition,
});

// 辅助函数：创建治疗效果
const heal = (value: number, description: string, opts?: { timing?: EffectTiming; condition?: EffectCondition }): AbilityEffect => ({
    description,
    action: { type: 'heal', target: 'self', value },
    timing: opts?.timing,
    condition: opts?.condition,
});

// 辅助函数：创建状态效果
const grantStatus = (statusId: string, value: number, description: string, opts?: { timing?: EffectTiming; condition?: EffectCondition }): AbilityEffect => ({
    description,
    action: { type: 'grantStatus', target: 'opponent', statusId, value },
    timing: opts?.timing,
    condition: opts?.condition,
});

// 辅助函数：创建自伤效果
const selfDamage = (value: number, description: string, opts?: { timing?: EffectTiming; condition?: EffectCondition }): AbilityEffect => ({
    description,
    action: { type: 'damage', target: 'self', value },
    timing: opts?.timing,
    condition: opts?.condition,
});

/**
 * 狂战士技能定义
 */
export const BARBARIAN_ABILITIES: AbilityDef[] = [
    // ========================================
    // 拍击 (Slap) - 进攻型
    // ========================================
    {
        id: 'slap',
        name: abilityText('slap', 'name'),
        type: 'offensive',
        description: abilityText('slap', 'description'),
        variants: [
            {
                id: 'slap-2',
                trigger: { type: 'diceSet', faces: { [BARBARIAN_DICE_FACE_IDS.SWORD]: 2 } },
                effects: [damage(4, abilityEffectText('slap-2', 'damage4'))],
                priority: 1,
            },
            {
                id: 'slap-3',
                trigger: { type: 'diceSet', faces: { [BARBARIAN_DICE_FACE_IDS.SWORD]: 3 } },
                effects: [damage(6, abilityEffectText('slap-3', 'damage6'))],
                priority: 2,
            },
            {
                id: 'slap-4',
                trigger: { type: 'diceSet', faces: { [BARBARIAN_DICE_FACE_IDS.SWORD]: 4 } },
                effects: [damage(8, abilityEffectText('slap-4', 'damage8'))],
                priority: 3,
            },
        ],
    },

    // ========================================
    // 全力一击 (All-Out Strike) - 进攻型
    // ========================================
    {
        id: 'all-out-strike',
        name: abilityText('all-out-strike', 'name'),
        type: 'offensive',
        description: abilityText('all-out-strike', 'description'),
        trigger: { type: 'diceSet', faces: { [BARBARIAN_DICE_FACE_IDS.STRENGTH]: 3 } },
        effects: [
            damage(4, abilityEffectText('all-out-strike', 'damage4Unblockable'), { unblockable: true }),
        ],
    },

    // ========================================
    // 强力一击 (Powerful Strike) - 进攻型，小顺子
    // ========================================
    {
        id: 'powerful-strike',
        name: abilityText('powerful-strike', 'name'),
        type: 'offensive',
        description: abilityText('powerful-strike', 'description'),
        trigger: { type: 'smallStraight' },
        effects: [
            damage(9, abilityEffectText('powerful-strike', 'damage9')),
        ],
    },

    // ========================================
    // 暴力猛击 (Violent Assault) - 进攻型
    // ========================================
    {
        id: 'violent-assault',
        name: abilityText('violent-assault', 'name'),
        type: 'offensive',
        description: abilityText('violent-assault', 'description'),
        trigger: { type: 'diceSet', faces: { [BARBARIAN_DICE_FACE_IDS.STRENGTH]: 4 } },
        effects: [
            // 先造成晕眩
            grantStatus(STATUS_IDS.DAZE, 1, abilityEffectText('violent-assault', 'inflictDaze')),
            // 然后造成5点不可防御伤害
            damage(5, abilityEffectText('violent-assault', 'damage5Unblockable'), { 
                unblockable: true,
                timing: 'postDamage',
            }),
        ],
    },

    // ========================================
    // 坚韧不拔 (Steadfast) - 防御型
    // ========================================
    {
        id: 'steadfast',
        name: abilityText('steadfast', 'name'),
        type: 'defensive',
        description: abilityText('steadfast', 'description'),
        variants: [
            {
                id: 'steadfast-3',
                trigger: { type: 'diceSet', faces: { [BARBARIAN_DICE_FACE_IDS.HEART]: 3 } },
                effects: [heal(4, abilityEffectText('steadfast-3', 'heal4'))],
                priority: 1,
            },
            {
                id: 'steadfast-4',
                trigger: { type: 'diceSet', faces: { [BARBARIAN_DICE_FACE_IDS.HEART]: 4 } },
                effects: [heal(5, abilityEffectText('steadfast-4', 'heal5'))],
                priority: 2,
            },
            {
                id: 'steadfast-5',
                trigger: { type: 'diceSet', faces: { [BARBARIAN_DICE_FACE_IDS.HEART]: 5 } },
                effects: [heal(6, abilityEffectText('steadfast-5', 'heal6'))],
                priority: 3,
            },
        ],
    },

    // ========================================
    // 压制 (Suppress) - 进攻型
    // ========================================
    {
        id: 'suppress',
        name: abilityText('suppress', 'name'),
        type: 'offensive',
        description: abilityText('suppress', 'description'),
        trigger: { 
            type: 'diceSet', 
            faces: { 
                [BARBARIAN_DICE_FACE_IDS.SWORD]: 3, 
                [BARBARIAN_DICE_FACE_IDS.STRENGTH]: 3 
            } 
        },
        effects: [
            // 投掷3个骰子，造成骰子点数总和的伤害
            {
                description: abilityEffectText('suppress', 'rollDice'),
                action: {
                    type: 'rollDie',
                    target: 'self',
                    diceCount: 3,
                    damageMode: 'sumValues', // 伤害 = 骰子点数之和
                },
                timing: 'withDamage',
            },
            // 如果总数大于14，造成脑震荡
            {
                description: abilityEffectText('suppress', 'concussionThreshold'),
                action: { type: 'grantStatus', target: 'opponent', statusId: STATUS_IDS.CONCUSSION, value: 1 },
                timing: 'postDamage',
                condition: { type: 'rollSumGreaterThan', threshold: 14 },
            },
        ],
    },

    // ========================================
    // 鲁莽一击 (Reckless Strike) - 进攻型，大顺子
    // ========================================
    {
        id: 'reckless-strike',
        name: abilityText('reckless-strike', 'name'),
        type: 'offensive',
        description: abilityText('reckless-strike', 'description'),
        trigger: { type: 'largeStraight' },
        effects: [
            // 造成15伤害
            damage(15, abilityEffectText('reckless-strike', 'damage15')),
            // 成功造成伤害时，对自己造成4伤害
            selfDamage(4, abilityEffectText('reckless-strike', 'selfDamage4'), {
                timing: 'postDamage',
                condition: { type: 'onHit' },
            }),
        ],
    },

    // ========================================
    // 厚皮 (Thick Skin) - 防御型
    // ========================================
    {
        id: 'thick-skin',
        name: abilityText('thick-skin', 'name'),
        type: 'defensive',
        description: abilityText('thick-skin', 'description'),
        trigger: { type: 'phase', phaseId: 'defensiveRoll', diceCount: 3 },
        effects: [
            // 恢复 2 × 心符号数量 的血
            {
                description: abilityEffectText('thick-skin', 'healByHearts'),
                action: { 
                    type: 'custom', 
                    target: 'self', 
                    customActionId: 'thick-skin-heal-by-hearts' 
                },
                timing: 'withDamage',
            },
        ],
    },

    // ========================================
    // RAGE! 狂怒 (Ultimate) - 终极技能
    // ========================================
    {
        id: 'rage',
        name: abilityText('rage', 'name'),
        type: 'offensive',
        description: abilityText('rage', 'description'),
        tags: ['ultimate'],
        trigger: { type: 'diceSet', faces: { [BARBARIAN_DICE_FACE_IDS.STRENGTH]: 5 } },
        effects: [
            // 造成晕眩
            grantStatus(STATUS_IDS.DAZE, 1, abilityEffectText('rage', 'inflictDaze')),
            // 造成15伤害
            damage(15, abilityEffectText('rage', 'damage15')),
        ],
    },
];
