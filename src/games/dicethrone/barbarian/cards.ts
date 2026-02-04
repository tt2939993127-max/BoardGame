/**
 * 狂战士英雄的手牌定义
 * 基于原版 Dice Throne 狂战士卡组
 * 
 * 注意：桌游中的"状态效果"实际上是以 Token 形式存在的
 * - 脑震荡 Token: 跳过下个收入阶段后移除
 * - 眩晕 Token: 无法行动，攻击结束后移除并触发额外攻击
 * 当前系统使用 StatusEffectSystem 处理这类负面效果
 */

import type { AbilityCard } from '../types';
import type { RandomFn } from '../../../engine/types';
import type { AbilityEffect, EffectTiming, EffectCondition, AbilityDef } from '../../../systems/presets/combat';
import { STATUS_IDS, BARBARIAN_DICE_FACE_IDS, DICETHRONE_CARD_ATLAS_IDS } from '../domain/ids';

const cardText = (id: string, field: 'name' | 'description') => `cards.${id}.${field}`;
const abilityText = (id: string, field: 'name' | 'description') => `abilities.${id}.${field}`;
const abilityEffectText = (id: string, field: string) => `abilities.${id}.effects.${field}`;

// ============================================
// 辅助函数
// ============================================

// 伤害效果
const damage = (value: number, description: string, opts?: { unblockable?: boolean }): AbilityEffect => ({
    description,
    action: { type: 'damage', target: 'opponent', value, unblockable: opts?.unblockable },
});

// 治疗效果
const heal = (value: number, description: string, opts?: { timing?: EffectTiming }): AbilityEffect => ({
    description,
    action: { type: 'heal', target: 'self', value },
    timing: opts?.timing ?? 'immediate',
});

// 施加状态效果（脑震荡/眩晕等负面Token）
const inflictStatus = (
    statusId: string,
    value: number,
    description: string,
    opts?: { timing?: EffectTiming; condition?: EffectCondition }
): AbilityEffect => ({
    description,
    action: { type: 'grantStatus', target: 'opponent', statusId, value },
    timing: opts?.timing ?? 'immediate',
    condition: opts?.condition,
});

// 自伤效果
const selfDamage = (value: number, description: string, opts?: { timing?: EffectTiming; condition?: EffectCondition }): AbilityEffect => ({
    description,
    action: { type: 'damage', target: 'self', value },
    timing: opts?.timing,
    condition: opts?.condition,
});

// 升级技能效果
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

// ============================================
// 升级后的技能定义
// ============================================

/**
 * 皮糙肉厚 II（升级自 thick-skin）
 * 防御投掷4骰，治疗 2×❤️
 * 如果投出2个❤️，可以防止1个即将受到的状态效果
 */
const THICK_SKIN_2: AbilityDef = {
    id: 'thick-skin',
    name: abilityText('thick-skin-2', 'name'),
    type: 'defensive',
    description: abilityText('thick-skin-2', 'description'),
    trigger: { type: 'phase', phaseId: 'defensiveRoll', diceCount: 4 },
    effects: [
        {
            description: abilityEffectText('thick-skin-2', 'healByHearts'),
            action: { type: 'custom', target: 'self', customActionId: 'thick-skin-2-heal-by-hearts' },
            timing: 'withDamage',
        },
        // 如果投出2个心，可以防止1个即将受到的状态效果
        {
            description: abilityEffectText('thick-skin-2', 'preventStatus'),
            action: { type: 'custom', target: 'self', customActionId: 'thick-skin-2-prevent-status' },
            timing: 'postDamage',
            condition: { type: 'diceCountAtLeast', face: BARBARIAN_DICE_FACE_IDS.HEART, count: 2 },
        },
    ],
};

/**
 * 悍然不顾 II（升级自 reckless-strike）
 * 大顺子触发：造成20伤害，自身受到5伤害
 * （只有成功造成至少1伤害时，自身才会受到伤害）
 */
const RECKLESS_STRIKE_2: AbilityDef = {
    id: 'reckless-strike',
    name: abilityText('reckless-strike-2', 'name'),
    type: 'offensive',
    description: abilityText('reckless-strike-2', 'description'),
    trigger: { type: 'largeStraight' },
    effects: [
        damage(20, abilityEffectText('reckless-strike-2', 'damage20')),
        selfDamage(5, abilityEffectText('reckless-strike-2', 'selfDamage5'), {
            timing: 'postDamage',
            condition: { type: 'onHit' },
        }),
    ],
};

/**
 * 力大无穷 II（升级自 suppress）
 * 包含两个变体技能：
 * 1. 3剑+2星：投掷3骰，造成等同于投掷结果总和的伤害，>=10施加脑震荡
 * 2. 战吼（2剑+1心）：治疗2，造成2不可防御伤害
 */
const SUPPRESS_2: AbilityDef = {
    id: 'suppress',
    name: abilityText('suppress-2', 'name'),
    type: 'offensive',
    description: abilityText('suppress-2', 'description'),
    variants: [
        // 战吼（2剑+1心）- 较低优先级
        {
            id: 'suppress-2-battle-cry',
            trigger: { 
                type: 'diceSet', 
                faces: { 
                    [BARBARIAN_DICE_FACE_IDS.SWORD]: 2, 
                    [BARBARIAN_DICE_FACE_IDS.HEART]: 1 
                } 
            },
            effects: [
                heal(2, abilityEffectText('suppress-2-battle-cry', 'heal2')),
                damage(2, abilityEffectText('suppress-2-battle-cry', 'damage2Unblockable'), { unblockable: true }),
            ],
            priority: 0,
        },
        // 3剑+2星 - 较高优先级
        {
            id: 'suppress-2-main',
            trigger: { 
                type: 'diceSet', 
                faces: { 
                    [BARBARIAN_DICE_FACE_IDS.SWORD]: 3, 
                    [BARBARIAN_DICE_FACE_IDS.STRENGTH]: 2 
                } 
            },
            effects: [
                {
                    description: abilityEffectText('suppress-2', 'rollDice'),
                    action: {
                        type: 'rollDie',
                        target: 'self',
                        diceCount: 3,
                        damageMode: 'sumValues',
                    },
                    timing: 'withDamage',
                },
                {
                    description: abilityEffectText('suppress-2', 'concussionThreshold'),
                    action: { type: 'grantStatus', target: 'opponent', statusId: STATUS_IDS.CONCUSSION, value: 1 },
                    timing: 'postDamage',
                    condition: { type: 'rollSumGreaterThan', threshold: 9 }, // >=10
                },
            ],
            priority: 1,
        },
    ],
};

/**
 * 百折不挠 II（升级自 steadfast）
 * 3心: 治疗5 / 4心: 治疗6 / 5心: 治疗7
 * 如果投出3个相同数字，可以从自己身上移除1个状态效果
 */
const STEADFAST_2: AbilityDef = {
    id: 'steadfast',
    name: abilityText('steadfast-2', 'name'),
    type: 'defensive',
    description: abilityText('steadfast-2', 'description'),
    variants: [
        {
            id: 'steadfast-2-3',
            trigger: { type: 'diceSet', faces: { [BARBARIAN_DICE_FACE_IDS.HEART]: 3 } },
            effects: [
                heal(5, abilityEffectText('steadfast-2-3', 'heal5')),
                // 3个相同数字时可移除1个状态效果
                {
                    description: abilityEffectText('steadfast-2', 'removeStatus'),
                    action: { type: 'custom', target: 'self', customActionId: 'steadfast-2-remove-status' },
                    timing: 'postDamage',
                    condition: { type: 'threeOfAKind' },
                },
            ],
            priority: 1,
        },
        {
            id: 'steadfast-2-4',
            trigger: { type: 'diceSet', faces: { [BARBARIAN_DICE_FACE_IDS.HEART]: 4 } },
            effects: [
                heal(6, abilityEffectText('steadfast-2-4', 'heal6')),
                {
                    description: abilityEffectText('steadfast-2', 'removeStatus'),
                    action: { type: 'custom', target: 'self', customActionId: 'steadfast-2-remove-status' },
                    timing: 'postDamage',
                    condition: { type: 'threeOfAKind' },
                },
            ],
            priority: 2,
        },
        {
            id: 'steadfast-2-5',
            trigger: { type: 'diceSet', faces: { [BARBARIAN_DICE_FACE_IDS.HEART]: 5 } },
            effects: [
                heal(7, abilityEffectText('steadfast-2-5', 'heal7')),
                {
                    description: abilityEffectText('steadfast-2', 'removeStatus'),
                    action: { type: 'custom', target: 'self', customActionId: 'steadfast-2-remove-status' },
                    timing: 'postDamage',
                    condition: { type: 'threeOfAKind' },
                },
            ],
            priority: 3,
        },
    ],
};

/**
 * 撼地重击 II（升级自 violent-assault + all-out-strike 的组合升级）
 * 包含两个变体技能：
 * 1. 5星：施加眩晕，然后造成7不可防御伤害
 * 2. 粉碎重击（3星）：施加脑震荡，然后造成2不可防御伤害
 */
const VIOLENT_ASSAULT_2: AbilityDef = {
    id: 'violent-assault',
    name: abilityText('violent-assault-2', 'name'),
    type: 'offensive',
    description: abilityText('violent-assault-2', 'description'),
    variants: [
        // 粉碎重击（3星）- 较低优先级
        {
            id: 'violent-assault-2-crush',
            trigger: { type: 'diceSet', faces: { [BARBARIAN_DICE_FACE_IDS.STRENGTH]: 3 } },
            effects: [
                inflictStatus(STATUS_IDS.CONCUSSION, 1, abilityEffectText('violent-assault-2-crush', 'inflictConcussion')),
                damage(2, abilityEffectText('violent-assault-2-crush', 'damage2Unblockable'), { unblockable: true }),
            ],
            priority: 0,
        },
        // 撼地重击（5星）- 较高优先级
        {
            id: 'violent-assault-2-main',
            trigger: { type: 'diceSet', faces: { [BARBARIAN_DICE_FACE_IDS.STRENGTH]: 5 } },
            effects: [
                inflictStatus(STATUS_IDS.DAZE, 1, abilityEffectText('violent-assault-2', 'inflictDaze')),
                damage(7, abilityEffectText('violent-assault-2', 'damage7Unblockable'), { unblockable: true }),
            ],
            priority: 1,
        },
    ],
};

// ============================================
// 卡牌定义
// ============================================

/**
 * 狂战士手牌定义
 * previewRef.atlas 对应 barbarian-ability-cards.png 图集中的位置（从左到右、从上到下，0起始）
 * 
 * 卡牌时机：
 * - main (蓝色): 仅在 Main Phase 1/2 打出
 * - roll (橙色): 在掷骰阶段打出  
 * - instant (红色): 任意时机打出
 * 
 * 卡牌类型：
 * - action: 行动卡（打出后进入弃牌堆）
 * - upgrade: 升级卡（永久升级英雄技能）
 */
export const BARBARIAN_CARDS: AbilityCard[] = [
    // ============================================
    // 行动卡 - main (蓝色)
    // ============================================
    
    /**
     * 精力充沛！
     * 投掷1骰：如果投出力量(星)，治疗2并对1名对手施加脑震荡Token
     * 否则抽取1张牌
     */
    {
        id: 'card-energetic',
        name: cardText('card-energetic', 'name'),
        type: 'action',
        cpCost: 0,
        timing: 'main',
        description: cardText('card-energetic', 'description'),
        previewRef: { type: 'atlas', atlasId: DICETHRONE_CARD_ATLAS_IDS.BARBARIAN, index: 0 },
        i18n: {
            'zh-CN': { name: '精力充沛！', description: '投掷1骰：如果投出⭐，治疗2并对1名对手施加脑震荡；否则抽取1张牌。' },
            'en': { name: 'Energetic!', description: 'Roll 1 die: if ⭐, heal 2 and inflict Concussion on 1 opponent; otherwise draw 1 card.' },
        },
        effects: [
            {
                description: '投掷1骰：⭐→治疗2+脑震荡；否则抽1牌',
                action: { type: 'custom', target: 'self', customActionId: 'energetic-roll' },
                timing: 'immediate',
            },
        ],
    },

    /**
     * 头昏目眩！
     * 条件卡：如果你在1名对手的防御结束后，成功对其造成至少8伤害
     * 则将本卡打出以施加脑震荡Token
     */
    {
        id: 'card-dizzy',
        name: cardText('card-dizzy', 'name'),
        type: 'action',
        cpCost: 0,
        timing: 'main',
        description: cardText('card-dizzy', 'description'),
        previewRef: { type: 'atlas', atlasId: DICETHRONE_CARD_ATLAS_IDS.BARBARIAN, index: 3 },
        i18n: {
            'zh-CN': { name: '头昏目眩！', description: '如果你在1名对手的防御结束后，成功对其造成至少8伤害，则将本卡打出以施加脑震荡。' },
            'en': { name: 'Dizzy!', description: 'If you deal at least 8 damage to an opponent after their defense, play this card to inflict Concussion.' },
        },
        // 条件：需要在防御结束后、造成>=8伤害时使用
        playCondition: {
            // TODO: 需要添加 requireDamageDealt 条件
        },
        effects: [
            inflictStatus(STATUS_IDS.CONCUSSION, 1, '施加脑震荡'),
        ],
    },

    /**
     * 当头棒喝！
     * 直接对1名对手施加脑震荡Token
     */
    {
        id: 'card-head-blow',
        name: cardText('card-head-blow', 'name'),
        type: 'action',
        cpCost: 1,
        timing: 'main',
        description: cardText('card-head-blow', 'description'),
        previewRef: { type: 'atlas', atlasId: DICETHRONE_CARD_ATLAS_IDS.BARBARIAN, index: 4 },
        i18n: {
            'zh-CN': { name: '当头棒喝！', description: '对1名对手施加脑震荡。' },
            'en': { name: 'Head Blow!', description: 'Inflict Concussion on 1 opponent.' },
        },
        effects: [
            inflictStatus(STATUS_IDS.CONCUSSION, 1, '施加脑震荡'),
        ],
    },

    // ============================================
    // 行动卡 - roll (橙色)
    // ============================================

    /**
     * 大吉大利！
     * 投掷3骰：治疗 1 + 2×❤️（心符号数量）
     */
    {
        id: 'card-lucky',
        name: cardText('card-lucky', 'name'),
        type: 'action',
        cpCost: 0,
        timing: 'roll',
        description: cardText('card-lucky', 'description'),
        previewRef: { type: 'atlas', atlasId: DICETHRONE_CARD_ATLAS_IDS.BARBARIAN, index: 1 },
        i18n: {
            'zh-CN': { name: '大吉大利！', description: '投掷3骰：治疗 1 + 2×❤️。' },
            'en': { name: 'Lucky!', description: 'Roll 3 dice: heal 1 + 2×❤️.' },
        },
        effects: [
            {
                description: '投掷3骰，治疗 1 + 2×心数量',
                action: { type: 'custom', target: 'self', customActionId: 'lucky-roll-heal' },
                timing: 'immediate',
            },
        ],
    },

    /**
     * 再来点儿！
     * 攻击修正卡：投掷5骰，增加 1×剑 伤害，施加脑震荡Token
     */
    {
        id: 'card-more-please',
        name: cardText('card-more-please', 'name'),
        type: 'action',
        cpCost: 2,
        timing: 'roll',
        description: cardText('card-more-please', 'description'),
        previewRef: { type: 'atlas', atlasId: DICETHRONE_CARD_ATLAS_IDS.BARBARIAN, index: 2 },
        i18n: {
            'zh-CN': { name: '再来点儿！', description: '【攻击修正】投掷5骰：增加 1×⚔️ 伤害，施加脑震荡。' },
            'en': { name: 'More Please!', description: '[Attack Modifier] Roll 5 dice: +1×⚔️ damage, inflict Concussion.' },
        },
        // 只能在进攻投掷阶段使用
        playCondition: {
            phase: 'offensiveRoll',
            requireOwnTurn: true,
        },
        effects: [
            {
                description: '投掷5骰，增加 1×剑 伤害',
                action: { type: 'custom', target: 'self', customActionId: 'more-please-roll-damage' },
                timing: 'immediate',
            },
            inflictStatus(STATUS_IDS.CONCUSSION, 1, '施加脑震荡'),
        ],
    },

    // ============================================
    // 升级卡 (绿色)
    // ============================================

    /**
     * 皮糙肉厚 II
     * 防御投掷4骰，治疗 2×❤️
     * 如果投出2个❤️，可以防止1个即将受到的状态效果（如脑震荡Token）
     */
    {
        id: 'card-thick-skin-2',
        name: cardText('card-thick-skin-2', 'name'),
        type: 'upgrade',
        cpCost: 3,
        timing: 'main',
        description: cardText('card-thick-skin-2', 'description'),
        previewRef: { type: 'atlas', atlasId: DICETHRONE_CARD_ATLAS_IDS.BARBARIAN, index: 5 },
        i18n: {
            'zh-CN': { name: '皮糙肉厚 II', description: '防御投掷4骰。治疗 2×❤️。如果投出❤️❤️，你还可以防止1个即将受到的状态效果。' },
            'en': { name: 'Thick Skin II', description: 'Defensive roll 4 dice. Heal 2×❤️. If ❤️❤️, you may also prevent 1 incoming status effect.' },
        },
        effects: [
            replaceAbility('thick-skin', THICK_SKIN_2, 2, '升级厚皮至 II 级'),
        ],
    },

    /**
     * 悍然不顾 II
     * 大顺子触发：造成20伤害，自身受到5伤害
     * （只有成功造成至少1伤害时，自身才会受到伤害）
     */
    {
        id: 'card-reckless-strike-2',
        name: cardText('card-reckless-strike-2', 'name'),
        type: 'upgrade',
        cpCost: 2,
        timing: 'main',
        description: cardText('card-reckless-strike-2', 'description'),
        previewRef: { type: 'atlas', atlasId: DICETHRONE_CARD_ATLAS_IDS.BARBARIAN, index: 6 },
        i18n: {
            'zh-CN': { name: '悍然不顾 II', description: '大顺子触发：造成20伤害，自身受到5伤害。（只有成功造成至少1伤害时，自身才会受到伤害）' },
            'en': { name: 'Reckless Strike II', description: 'Large Straight: Deal 20 damage, take 5 self-damage. (Self-damage only if at least 1 damage dealt)' },
        },
        effects: [
            replaceAbility('reckless-strike', RECKLESS_STRIKE_2, 2, '升级鲁莽一击至 II 级'),
        ],
    },

    /**
     * 力大无穷 II
     * 3剑+2星：投掷3骰，造成等同于投掷结果总和的伤害，>=10施加脑震荡Token
     * 战吼（2剑+1心）：治疗2，造成2不可防御伤害
     */
    {
        id: 'card-suppress-2',
        name: cardText('card-suppress-2', 'name'),
        type: 'upgrade',
        cpCost: 2,
        timing: 'main',
        description: cardText('card-suppress-2', 'description'),
        previewRef: { type: 'atlas', atlasId: DICETHRONE_CARD_ATLAS_IDS.BARBARIAN, index: 7 },
        i18n: {
            'zh-CN': { name: '力大无穷 II', description: '⚔️⚔️⚔️⭐⭐: 投掷3骰，造成等同于投掷结果总和的伤害。如果>=10，施加脑震荡。\n战吼(⚔️⚔️❤️): 治疗2，造成2不可防御伤害。' },
            'en': { name: 'Mighty II', description: '⚔️⚔️⚔️⭐⭐: Roll 3 dice, deal damage equal to sum. If >=10, inflict Concussion.\nBattle Cry(⚔️⚔️❤️): Heal 2, deal 2 undefendable damage.' },
        },
        effects: [
            replaceAbility('suppress', SUPPRESS_2, 2, '升级压制至 II 级'),
        ],
    },

    /**
     * 百折不挠 II
     * 3心: 治疗5 / 4心: 治疗6 / 5心: 治疗7
     * 如果投出3个相同数字，可以从自己身上移除1个状态效果Token
     */
    {
        id: 'card-steadfast-2',
        name: cardText('card-steadfast-2', 'name'),
        type: 'upgrade',
        cpCost: 2,
        timing: 'main',
        description: cardText('card-steadfast-2', 'description'),
        previewRef: { type: 'atlas', atlasId: DICETHRONE_CARD_ATLAS_IDS.BARBARIAN, index: 8 },
        i18n: {
            'zh-CN': { name: '百折不挠 II', description: '❤️❤️❤️: 治疗5 / ❤️❤️❤️❤️: 治疗6 / ❤️❤️❤️❤️❤️: 治疗7。如果投出3个相同数字，你可以从自己身上移除1个状态效果。' },
            'en': { name: 'Steadfast II', description: '3❤️: Heal 5 / 4❤️: Heal 6 / 5❤️: Heal 7. If 3 of a kind, you may remove 1 status effect from yourself.' },
        },
        effects: [
            replaceAbility('steadfast', STEADFAST_2, 2, '升级坚韧不拔至 II 级'),
        ],
    },

    /**
     * 撼地重击 II
     * 5星：施加眩晕Token，然后造成7不可防御伤害
     * 粉碎重击（3星）：施加脑震荡Token，然后造成2不可防御伤害
     */
    {
        id: 'card-violent-assault-2',
        name: cardText('card-violent-assault-2', 'name'),
        type: 'upgrade',
        cpCost: 2,
        timing: 'main',
        description: cardText('card-violent-assault-2', 'description'),
        previewRef: { type: 'atlas', atlasId: DICETHRONE_CARD_ATLAS_IDS.BARBARIAN, index: 9 },
        i18n: {
            'zh-CN': { name: '撼地重击 II', description: '⭐⭐⭐⭐⭐: 施加眩晕，然后造成7不可防御伤害。\n粉碎重击(⭐⭐⭐): 施加脑震荡，然后造成2不可防御伤害。' },
            'en': { name: 'Ground Slam II', description: '5⭐: Inflict Daze, then deal 7 undefendable damage.\nCrush(3⭐): Inflict Concussion, then deal 2 undefendable damage.' },
        },
        effects: [
            replaceAbility('violent-assault', VIOLENT_ASSAULT_2, 2, '升级暴力猛击至 II 级'),
        ],
    },
];

/**
 * 获取狂战士初始牌库
 * 返回洗牌后的卡牌副本
 * @param random 引擎层随机数生成器（确保回放确定性）
 */
export const getBarbarianStartingDeck = (random: RandomFn): AbilityCard[] => {
    // 复制所有卡牌
    const deck = BARBARIAN_CARDS.map(card => ({ ...card }));
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
    const CARDS_PER_ROW = 10;

    const col = atlasIndex % CARDS_PER_ROW;
    const row = Math.floor(atlasIndex / CARDS_PER_ROW);

    return {
        x: col * CARD_WIDTH,
        y: row * CARD_HEIGHT,
        width: CARD_WIDTH,
        height: CARD_HEIGHT,
    };
};
