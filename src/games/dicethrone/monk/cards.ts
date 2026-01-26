/**
 * 僧侣英雄的手牌定义
 * 完整33张手牌配置
 */

import type { AbilityCard } from '../types';
import type { RandomFn } from '../../../engine/types';
import type { AbilityEffect, AbilityDef } from '../../../systems/AbilitySystem';

// 辅助函数：创建伤害效果
const damage = (value: number, description: string): AbilityEffect => ({
    description,
    action: { type: 'damage', target: 'opponent', value },
    timing: 'immediate',
});

// 辅助函数：创建状态效果（给自己）
const grantStatus = (statusId: string, value: number, description: string): AbilityEffect => ({
    description,
    action: { type: 'grantStatus', target: 'self', statusId, value },
    timing: 'immediate',
});

// 辅助函数：给对手施加状态
const inflictStatus = (statusId: string, value: number, description: string): AbilityEffect => ({
    description,
    action: { type: 'grantStatus', target: 'opponent', statusId, value },
    timing: 'immediate',
});

// 辅助函数：抽卡效果
const drawCards = (count: number, description: string): AbilityEffect => ({
    description,
    action: { type: 'drawCard', target: 'self', drawCount: count },
    timing: 'immediate',
});

// 辅助函数：移除状态效果
const removeStatus = (statusId: string, value: number, description: string, target: 'self' | 'opponent' = 'self'): AbilityEffect => ({
    description,
    action: { type: 'removeStatus', target, statusId, value },
    timing: 'immediate',
});

// 辅助函数：创建 replaceAbility 效果
const replaceAbility = (
    targetAbilityId: string,
    newAbilityDef: AbilityDef,
    newAbilityLevel: number,
    description: string
): AbilityEffect => ({
    description,
    action: { type: 'replaceAbility', target: 'self', targetAbilityId, newAbilityDef, newAbilityLevel },
    timing: 'immediate',
});

// 文本辅助
const abilityText = (id: string, field: 'name' | 'description') => `abilities.${id}.${field}`;
const abilityEffectText = (id: string, field: string) => `abilities.${id}.effects.${field}`;

// ============================================
// 升级后的技能定义
// ============================================

// 拳法 II（升级自 fist-technique）
const FIST_TECHNIQUE_2: AbilityDef = {
    id: 'fist-technique', // 保持原 ID 以维护 UI 槽位映射
    name: abilityText('fist-technique-2', 'name'),
    type: 'offensive',
    description: abilityText('fist-technique-2', 'description'),
    variants: [
        {
            id: 'fist-technique-2-3',
            trigger: { type: 'diceSet', faces: { fist: 3 } },
            effects: [damage(5, abilityEffectText('fist-technique-2-3', 'damage5'))],
            priority: 1,
        },
        {
            id: 'fist-technique-2-4',
            trigger: { type: 'diceSet', faces: { fist: 4 } },
            effects: [damage(8, abilityEffectText('fist-technique-2-4', 'damage8'))],
            priority: 2,
        },
        {
            id: 'fist-technique-2-5',
            trigger: { type: 'diceSet', faces: { fist: 5 } },
            effects: [damage(11, abilityEffectText('fist-technique-2-5', 'damage11'))],
            priority: 3,
        },
    ],
};

// 拳法 III（升级自 fist-technique-2）
const FIST_TECHNIQUE_3: AbilityDef = {
    id: 'fist-technique',
    name: abilityText('fist-technique-3', 'name'),
    type: 'offensive',
    description: abilityText('fist-technique-3', 'description'),
    variants: [
        {
            id: 'fist-technique-3-3',
            trigger: { type: 'diceSet', faces: { fist: 3 } },
            effects: [damage(6, abilityEffectText('fist-technique-3-3', 'damage6'))],
            priority: 1,
        },
        {
            id: 'fist-technique-3-4',
            trigger: { type: 'diceSet', faces: { fist: 4 } },
            effects: [damage(10, abilityEffectText('fist-technique-3-4', 'damage10'))],
            priority: 2,
        },
        {
            id: 'fist-technique-3-5',
            trigger: { type: 'diceSet', faces: { fist: 5 } },
            effects: [damage(14, abilityEffectText('fist-technique-3-5', 'damage14'))],
            priority: 3,
        },
    ],
};

// 清修 II（升级自 meditation）
const MEDITATION_2: AbilityDef = {
    id: 'meditation',
    name: abilityText('meditation-2', 'name'),
    type: 'defensive',
    description: abilityText('meditation-2', 'description'),
    trigger: { type: 'phase', phaseId: 'defensiveRoll', diceCount: 4 },
    effects: [
        { description: abilityEffectText('meditation-2', 'taijiByResult'), action: { type: 'custom', target: 'self', customActionId: 'meditation-2-taiji' }, timing: 'withDamage' },
        { description: abilityEffectText('meditation-2', 'damageByFist'), action: { type: 'custom', target: 'opponent', customActionId: 'meditation-2-damage' }, timing: 'withDamage' },
    ],
};

// 清修 III（升级自 meditation-2）
const MEDITATION_3: AbilityDef = {
    id: 'meditation',
    name: abilityText('meditation-3', 'name'),
    type: 'defensive',
    description: abilityText('meditation-3', 'description'),
    trigger: { type: 'phase', phaseId: 'defensiveRoll', diceCount: 4 },
    effects: [
        { description: abilityEffectText('meditation-3', 'taijiByResult'), action: { type: 'custom', target: 'self', customActionId: 'meditation-3-taiji' }, timing: 'withDamage' },
        { description: abilityEffectText('meditation-3', 'damageByFist'), action: { type: 'custom', target: 'opponent', customActionId: 'meditation-3-damage' }, timing: 'withDamage' },
    ],
};

// 花开见佛 II（升级自 lotus-palm）
const LOTUS_PALM_2: AbilityDef = {
    id: 'lotus-palm',
    name: abilityText('lotus-palm-2', 'name'),
    type: 'offensive',
    description: abilityText('lotus-palm-2', 'description'),
    tags: ['unblockable'],
    variants: [
        {
            id: 'lotus-palm-2-4',
            trigger: { type: 'diceSet', faces: { lotus: 4 } },
            effects: [
                damage(7, abilityEffectText('lotus-palm-2-4', 'damage7')),
                grantStatus('taiji', 5, abilityEffectText('lotus-palm-2-4', 'taijiCapMax')),
            ],
            priority: 1,
        },
        {
            id: 'lotus-palm-2-5',
            trigger: { type: 'diceSet', faces: { lotus: 5 } },
            effects: [
                damage(10, abilityEffectText('lotus-palm-2-5', 'damage10')),
                grantStatus('taiji', 5, abilityEffectText('lotus-palm-2-5', 'taijiCapMax')),
            ],
            priority: 2,
        },
    ],
};

// 太极连环拳 II（升级自 taiji-combo）
const TAIJI_COMBO_2: AbilityDef = {
    id: 'taiji-combo',
    name: abilityText('taiji-combo-2', 'name'),
    type: 'offensive',
    description: abilityText('taiji-combo-2', 'description'),
    trigger: { type: 'diceSet', faces: { fist: 3, palm: 1 } },
    effects: [
        {
            description: abilityEffectText('taiji-combo-2', 'rollDie'),
            action: {
                type: 'rollDie',
                target: 'self',
                diceCount: 1,
                conditionalEffects: [
                    { face: 'fist', bonusDamage: 3 },
                    { face: 'palm', bonusDamage: 4 },
                    { face: 'taiji', grantStatus: { statusId: 'taiji', value: 3 } },
                    {
                        face: 'lotus',
                        triggerChoice: {
                            titleKey: 'choices.evasiveOrPurify',
                            options: [
                                { statusId: 'evasive', value: 1 },
                                { statusId: 'purify', value: 1 },
                            ],
                        },
                    },
                ],
            },
            timing: 'withDamage',
        },
        damage(8, abilityEffectText('taiji-combo-2', 'damage8')),
    ],
};

// 雷霆一击 II（升级自 thunder-strike）
const THUNDER_STRIKE_2: AbilityDef = {
    id: 'thunder-strike',
    name: abilityText('thunder-strike-2', 'name'),
    type: 'offensive',
    description: abilityText('thunder-strike-2', 'description'),
    trigger: { type: 'diceSet', faces: { palm: 3 } },
    effects: [
        damage(12, abilityEffectText('thunder-strike-2', 'damage12')),
        { description: abilityEffectText('thunder-strike-2', 'rerollOne') },
    ],
};

// 定水神拳 II（升级自 calm-water）
const CALM_WATER_2: AbilityDef = {
    id: 'calm-water',
    name: abilityText('calm-water-2', 'name'),
    type: 'offensive',
    description: abilityText('calm-water-2', 'description'),
    trigger: { type: 'largeStraight' },
    effects: [
        damage(9, abilityEffectText('calm-water-2', 'damage9')),
        grantStatus('taiji', 3, abilityEffectText('calm-water-2', 'gainTaiji3')),
        grantStatus('evasive', 1, abilityEffectText('calm-water-2', 'gainEvasive')),
    ],
};

// 和谐之力 II（升级自 harmony）
const HARMONY_2: AbilityDef = {
    id: 'harmony',
    name: abilityText('harmony-2', 'name'),
    type: 'offensive',
    description: abilityText('harmony-2', 'description'),
    trigger: { type: 'smallStraight' },
    effects: [
        damage(7, abilityEffectText('harmony-2', 'damage7')),
        grantStatus('taiji', 3, abilityEffectText('harmony-2', 'gainTaiji3')),
    ],
};

// 禅忘 II（升级自 zen-forget）
const ZEN_FORGET_2: AbilityDef = {
    id: 'zen-forget',
    name: abilityText('zen-forget-2', 'name'),
    type: 'offensive',
    description: abilityText('zen-forget-2', 'description'),
    trigger: { type: 'diceSet', faces: { taiji: 3 } },
    effects: [
        grantStatus('taiji', 5, abilityEffectText('zen-forget-2', 'gainTaiji5')),
        grantStatus('evasive', 1, abilityEffectText('zen-forget-2', 'gainEvasive')),
        grantStatus('purify', 1, abilityEffectText('zen-forget-2', 'gainPurify')),
    ],
};

const cardText = (id: string, field: 'name' | 'description') => `cards.${id}.${field}`;

/**
 * 卡牌时机颜色对应
 * - main (蓝色): 仅在 Main Phase 1/2 打出
 * - roll (橙色): 在掷骰阶段打出
 * - instant (红色): 任意时机打出
 * 
 * 卡牌类型
 * - action: 行动卡（打出后进入弃牌堆）
 * - upgrade: 升级卡（永久升级英雄能力）
 */

/**
 * 僧侣手牌定义
 * atlasIndex 对应 monk-ability-cards.png 图集中的位置（从左到右、从上到下，0起始）
 */
export const MONK_CARDS: AbilityCard[] = [
    // ============================================
    // 第一行 (atlasIndex 0-10)
    // ============================================
    
    // --- 行动卡 - main (蓝色) ---
    {
        id: 'card-enlightenment',
        name: cardText('card-enlightenment', 'name'),
        type: 'action',
        cpCost: 0,
        timing: 'main',
        description: cardText('card-enlightenment', 'description'),
        atlasIndex: 0,
        // 效果需要投骰 + 条件分支，暂不实现
    },
    // --- 行动卡 - instant (红色) ---
    {
        id: 'card-inner-peace',
        name: cardText('card-inner-peace', 'name'),
        type: 'action',
        cpCost: 0,
        timing: 'instant',
        description: cardText('card-inner-peace', 'description'),
        atlasIndex: 1,
        effects: [
            grantStatus('taiji', 1, '获得1太极'),
        ],
    },
    {
        id: 'card-deep-thought',
        name: cardText('card-deep-thought', 'name'),
        type: 'action',
        cpCost: 3,
        timing: 'instant',
        description: cardText('card-deep-thought', 'description'),
        atlasIndex: 2,
        effects: [
            grantStatus('taiji', 5, '获得5太极'),
        ],
    },
    // --- 行动卡 - main (蓝色) ---
    {
        id: 'card-buddha-light',
        name: cardText('card-buddha-light', 'name'),
        type: 'action',
        cpCost: 3,
        timing: 'main',
        description: cardText('card-buddha-light', 'description'),
        atlasIndex: 3,
        effects: [
            grantStatus('taiji', 1, '获得1太极'),
            grantStatus('evasive', 1, '获得1闪避'),
            grantStatus('purify', 1, '获得1净化'),
            inflictStatus('stun', 1, '对手倒地'),
        ],
    },
    {
        id: 'card-palm-strike',
        name: cardText('card-palm-strike', 'name'),
        type: 'action',
        cpCost: 0,
        timing: 'main',
        description: cardText('card-palm-strike', 'description'),
        atlasIndex: 4,
        effects: [
            inflictStatus('stun', 1, '对手倒地'),
        ],
    },
    // --- 升级卡 (绿色) ---
    {
        id: 'card-meditation-3',
        name: cardText('card-meditation-3', 'name'),
        type: 'upgrade',
        cpCost: 3,
        timing: 'main',
        description: cardText('card-meditation-3', 'description'),
        atlasIndex: 5,
        effects: [
            replaceAbility('meditation', MEDITATION_3, 3, '升级清修至 III 级'),
        ],
    },
    // --- 行动卡 - roll (橙色) ---
    {
        id: 'card-play-six',
        name: cardText('card-play-six', 'name'),
        type: 'action',
        cpCost: 1,
        timing: 'roll',
        description: cardText('card-play-six', 'description'),
        atlasIndex: 6,
    },
    // --- 升级卡 (绿色) ---
    {
        id: 'card-meditation-2',
        name: cardText('card-meditation-2', 'name'),
        type: 'upgrade',
        cpCost: 2,
        timing: 'main',
        description: cardText('card-meditation-2', 'description'),
        atlasIndex: 7,
        effects: [
            replaceAbility('meditation', MEDITATION_2, 2, '升级清修至 II 级'),
        ],
    },
    {
        id: 'card-zen-fist-2',
        name: cardText('card-zen-fist-2', 'name'),
        type: 'upgrade',
        cpCost: 2,
        timing: 'main',
        description: cardText('card-zen-fist-2', 'description'),
        atlasIndex: 8,
        effects: [
            replaceAbility('calm-water', CALM_WATER_2, 2, '升级定水神拳至 II 级'),
        ],
    },
    {
        id: 'card-storm-assault-2',
        name: cardText('card-storm-assault-2', 'name'),
        type: 'upgrade',
        cpCost: 2,
        timing: 'main',
        description: cardText('card-storm-assault-2', 'description'),
        atlasIndex: 9,
        effects: [
            replaceAbility('thunder-strike', THUNDER_STRIKE_2, 2, '升级雷霆一击至 II 级'),
        ],
    },
    {
        id: 'card-combo-punch-2',
        name: cardText('card-combo-punch-2', 'name'),
        type: 'upgrade',
        cpCost: 2,
        timing: 'main',
        description: cardText('card-combo-punch-2', 'description'),
        atlasIndex: 10,
        effects: [
            replaceAbility('taiji-combo', TAIJI_COMBO_2, 2, '升级太极连环拳至 II 级'),
        ],
    },

    // ============================================
    // 第二行 (atlasIndex 11-20)
    // ============================================
    
    // --- 升级卡 ---
    {
        id: 'card-lotus-bloom-2',
        name: cardText('card-lotus-bloom-2', 'name'),
        type: 'upgrade',
        cpCost: 2,
        timing: 'main',
        description: cardText('card-lotus-bloom-2', 'description'),
        atlasIndex: 11,
        effects: [
            replaceAbility('lotus-palm', LOTUS_PALM_2, 2, '升级花开见佛至 II 级'),
        ],
    },
    {
        id: 'card-mahayana-2',
        name: cardText('card-mahayana-2', 'name'),
        type: 'upgrade',
        cpCost: 1,
        timing: 'main',
        description: cardText('card-mahayana-2', 'description'),
        atlasIndex: 12,
        effects: [
            replaceAbility('harmony', HARMONY_2, 2, '升级和谐之力至 II 级'),
        ],
    },
    {
        id: 'card-thrust-punch-2',
        name: cardText('card-thrust-punch-2', 'name'),
        type: 'upgrade',
        cpCost: 2,
        timing: 'main',
        description: cardText('card-thrust-punch-2', 'description'),
        atlasIndex: 13,
        effects: [
            replaceAbility('fist-technique', FIST_TECHNIQUE_2, 2, '升级拳法至 II 级'),
        ],
    },
    {
        id: 'card-thrust-punch-3',
        name: cardText('card-thrust-punch-3', 'name'),
        type: 'upgrade',
        cpCost: 2,
        timing: 'main',
        description: cardText('card-thrust-punch-3', 'description'),
        atlasIndex: 14,
        effects: [
            replaceAbility('fist-technique', FIST_TECHNIQUE_3, 3, '升级拳法至 III 级'),
        ],
    },
    {
        id: 'card-contemplation-2',
        name: cardText('card-contemplation-2', 'name'),
        type: 'upgrade',
        cpCost: 2,
        timing: 'main',
        description: cardText('card-contemplation-2', 'description'),
        atlasIndex: 15,
        effects: [
            replaceAbility('zen-forget', ZEN_FORGET_2, 2, '升级禅忘至 II 级'),
        ],
    },
    // --- 行动卡 - roll (橙色) ---
    {
        id: 'card-just-this',
        name: cardText('card-just-this', 'name'),
        type: 'action',
        cpCost: 0,
        timing: 'roll',
        description: cardText('card-just-this', 'description'),
        atlasIndex: 16,
    },
    {
        id: 'card-give-hand',
        name: cardText('card-give-hand', 'name'),
        type: 'action',
        cpCost: 1,
        timing: 'roll',
        description: cardText('card-give-hand', 'description'),
        atlasIndex: 17,
    },
    {
        id: 'card-i-can-again',
        name: cardText('card-i-can-again', 'name'),
        type: 'action',
        cpCost: 1,
        timing: 'roll',
        description: cardText('card-i-can-again', 'description'),
        atlasIndex: 18,
    },
    {
        id: 'card-me-too',
        name: cardText('card-me-too', 'name'),
        type: 'action',
        cpCost: 1,
        timing: 'roll',
        description: cardText('card-me-too', 'description'),
        atlasIndex: 19,
    },

    // ============================================
    // 第三行 (atlasIndex 20-29)
    // ============================================
    
    // --- 行动卡 - roll (橙色) ---
    {
        id: 'card-surprise',
        name: cardText('card-surprise', 'name'),
        type: 'action',
        cpCost: 2,
        timing: 'roll',
        description: cardText('card-surprise', 'description'),
        atlasIndex: 20,
    },
    {
        id: 'card-worthy-of-me',
        name: cardText('card-worthy-of-me', 'name'),
        type: 'action',
        cpCost: 1,
        timing: 'roll',
        description: cardText('card-worthy-of-me', 'description'),
        atlasIndex: 21,
    },
    {
        id: 'card-unexpected',
        name: cardText('card-unexpected', 'name'),
        type: 'action',
        cpCost: 3,
        timing: 'roll',
        description: cardText('card-unexpected', 'description'),
        atlasIndex: 22,
    },
    // --- 行动卡 - instant (红色) ---
    {
        id: 'card-next-time',
        name: cardText('card-next-time', 'name'),
        type: 'action',
        cpCost: 1,
        timing: 'instant',
        description: cardText('card-next-time', 'description'),
        atlasIndex: 23,
    },
    {
        id: 'card-boss-generous',
        name: cardText('card-boss-generous', 'name'),
        type: 'action',
        cpCost: 0,
        timing: 'instant',
        description: cardText('card-boss-generous', 'description'),
        atlasIndex: 24,
    },
    // --- 红色 instant ---
    {
        id: 'card-flick',
        name: cardText('card-flick', 'name'),
        type: 'action',
        cpCost: 1,
        timing: 'instant',
        description: cardText('card-flick', 'description'),
        atlasIndex: 25,
    },
    {
        id: 'card-bye-bye',
        name: cardText('card-bye-bye', 'name'),
        type: 'action',
        cpCost: 2,
        timing: 'instant',
        description: cardText('card-bye-bye', 'description'),
        atlasIndex: 26,
    },
    {
        id: 'card-double',
        name: cardText('card-double', 'name'),
        type: 'action',
        cpCost: 1,
        timing: 'instant',
        description: cardText('card-double', 'description'),
        atlasIndex: 27,
    },
    {
        id: 'card-super-double',
        name: cardText('card-super-double', 'name'),
        type: 'action',
        cpCost: 2,
        timing: 'instant',
        description: cardText('card-super-double', 'description'),
        atlasIndex: 28,
    },
    // --- 蓝色 main ---
    {
        id: 'card-get-away',
        name: cardText('card-get-away', 'name'),
        type: 'action',
        cpCost: 1,
        timing: 'main',
        description: cardText('card-get-away', 'description'),
        atlasIndex: 29,
    },

    // ============================================
    // 第四行 (atlasIndex 30-32)
    // ============================================
    
    // --- 行动卡 - main (蓝色) ---
    {
        id: 'card-one-throw-fortune',
        name: cardText('card-one-throw-fortune', 'name'),
        type: 'action',
        cpCost: 0,
        timing: 'main',
        description: cardText('card-one-throw-fortune', 'description'),
        atlasIndex: 30,
    },
    {
        id: 'card-what-status',
        name: cardText('card-what-status', 'name'),
        type: 'action',
        cpCost: 2,
        timing: 'main',
        description: cardText('card-what-status', 'description'),
        atlasIndex: 31,
    },
    {
        id: 'card-transfer-status',
        name: cardText('card-transfer-status', 'name'),
        type: 'action',
        cpCost: 2,
        timing: 'main',
        description: cardText('card-transfer-status', 'description'),
        atlasIndex: 32,
    },
];

/**
 * 获取僧侣初始牌库
 * 返回洗牌后的卡牌副本
 * @param random 引擎层随机数生成器（确保回放确定性）
 */
export const getMonkStartingDeck = (random: RandomFn): AbilityCard[] => {
    // 复制所有卡牌
    const deck = MONK_CARDS.map(card => ({ ...card }));
    // 使用引擎层的确定性洗牌
    return random.shuffle(deck);
};

/**
 * 根据 atlasIndex 获取图集裁切坐标
 * 图集单卡尺寸: 328×529
 */
export const getCardAtlasPosition = (atlasIndex: number): { x: number; y: number; width: number; height: number } => {
    const CARD_WIDTH = 328;
    const CARD_HEIGHT = 529;
    const CARDS_PER_ROW = 5; // 假设每行5张

    const col = atlasIndex % CARDS_PER_ROW;
    const row = Math.floor(atlasIndex / CARDS_PER_ROW);

    return {
        x: col * CARD_WIDTH,
        y: row * CARD_HEIGHT,
        width: CARD_WIDTH,
        height: CARD_HEIGHT,
    };
};
