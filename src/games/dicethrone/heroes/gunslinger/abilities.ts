/**
 * Gunslinger (枪手) 技能定义
 */

import type { AbilityDef } from '../../domain/combat';
import { TOKEN_IDS, STATUS_IDS, GUNSLINGER_DICE_FACE_IDS } from '../../domain/ids';

const abilityText = (id: string, field: 'name' | 'description') => `abilities.${id}.${field}`;
const abilityEffectText = (id: string, key: string) => `abilities.${id}.effects.${key}`;

// 骰子面简写
const BULLET = GUNSLINGER_DICE_FACE_IDS.BULLET;
const DASH = GUNSLINGER_DICE_FACE_IDS.DASH;
const BULLSEYE = GUNSLINGER_DICE_FACE_IDS.BULLSEYE;

/**
 * 左轮手枪 - 基础攻击
 * 3个子弹 → 3伤害
 * 4个子弹 → 4伤害
 * 5个子弹 → 5伤害
 */
const REVOLVER: AbilityDef = {
    id: 'revolver',
    name: abilityText('revolver', 'name'),
    description: abilityText('revolver', 'description'),
    cpCost: 0,
    category: 'offensive',
    trigger: { type: 'diceSet', faces: { [BULLET]: 3 } },
    effects: [
        {
            description: abilityEffectText('revolver', 'damage3'),
            action: { type: 'damage', target: 'opponent', value: 3 },
            timing: 'immediate',
        },
    ],
    variants: [
        {
            id: 'revolver-4',
            trigger: { type: 'diceSet', faces: { [BULLET]: 4 } },
            effects: [
                {
                    description: abilityEffectText('revolver-4', 'damage4'),
                    action: { type: 'damage', target: 'opponent', value: 4 },
                    timing: 'immediate',
                },
            ],
        },
        {
            id: 'revolver-5',
            trigger: { type: 'diceSet', faces: { [BULLET]: 5 } },
            effects: [
                {
                    description: abilityEffectText('revolver-5', 'damage5'),
                    action: { type: 'damage', target: 'opponent', value: 5 },
                    timing: 'immediate',
                },
            ],
        },
    ],
};

/**
 * 左轮手枪 II - 升级版
 * CP消耗：2CP
 * 3个子弹 → 4伤害
 * 4个子弹 → 5伤害
 * 5个子弹 → 6伤害
 * 若有4颗骰子数字一样，造成击倒效果
 */
export const REVOLVER_2: AbilityDef = {
    id: 'revolver-2',
    name: abilityText('revolver-2', 'name'),
    description: abilityText('revolver-2', 'description'),
    cpCost: 2,
    category: 'offensive',
    trigger: { type: 'diceSet', faces: { [BULLET]: 3 } },
    effects: [
        {
            description: abilityEffectText('revolver-2', 'damage4'),
            action: { type: 'damage', target: 'opponent', value: 4 },
            timing: 'immediate',
        },
    ],
    variants: [
        {
            id: 'revolver-2-4',
            trigger: { type: 'diceSet', faces: { [BULLET]: 4 } },
            effects: [
                {
                    description: abilityEffectText('revolver-2-4', 'damage5'),
                    action: { type: 'damage', target: 'opponent', value: 5 },
                    timing: 'immediate',
                },
                // 若有4颗骰子数字一样，造成击倒效果
                {
                    description: abilityEffectText('revolver-2-4', 'knockdownIfFourOfKind'),
                    action: { type: 'inflictStatus', target: 'opponent', statusId: STATUS_IDS.KNOCKDOWN, value: 1 },
                    timing: 'immediate',
                    condition: { type: 'fourOfAKind' },
                },
            ],
        },
        {
            id: 'revolver-2-5',
            trigger: { type: 'diceSet', faces: { [BULLET]: 5 } },
            effects: [
                {
                    description: abilityEffectText('revolver-2-5', 'damage6'),
                    action: { type: 'damage', target: 'opponent', value: 6 },
                    timing: 'immediate',
                },
            ],
        },
    ],
};

/**
 * 赏金猎人 - 施加赏金效果
 * 2个子弹 + 2个准心 → 造成赏金效果，再造成 1 不可防御伤害
 */
const BOUNTY_HUNTER: AbilityDef = {
    id: 'bounty-hunter',
    name: abilityText('bounty-hunter', 'name'),
    description: abilityText('bounty-hunter', 'description'),
    cpCost: 0,
    category: 'offensive',
    trigger: { type: 'diceSet', faces: { [BULLET]: 2, [BULLSEYE]: 2 } },
    effects: [
        {
            description: abilityEffectText('bounty-hunter', 'inflictBounty'),
            action: { type: 'grantToken', target: 'opponent', tokenId: TOKEN_IDS.BOUNTY, value: 1 },
            timing: 'immediate',
        },
        {
            description: abilityEffectText('bounty-hunter', 'damage1Unblockable'),
            action: { type: 'damage', target: 'opponent', value: 1, unblockable: true },
            timing: 'immediate',
        },
    ],
};

/**
 * 枪战决斗 - 对决骰子比大小
 * 小顺-4颗连续骰数
 * 你与目标对手各掷一颗骰，比较骰点大小：
 * - 骰点 >= 对手：造成 7 伤害
 * - 骰点 < 对手：造成 5 伤害
 */
const GUNFIGHT_DUEL: AbilityDef = {
    id: 'gunfight-duel',
    name: abilityText('gunfight-duel', 'name'),
    description: abilityText('gunfight-duel', 'description'),
    cpCost: 0,
    category: 'offensive',
    trigger: { type: 'straight', length: 4 }, // 小顺-4颗连续骰数
    effects: [
        {
            description: abilityEffectText('gunfight-duel', 'duelRoll'),
            action: {
                type: 'custom',
                target: 'opponent',
                customActionId: 'gunfight-duel-roll',
                // 自定义逻辑：双方各掷1骰，比较大小
                // 胜利/平局 → 7伤害
                // 失败 → 5伤害
            },
            timing: 'immediate',
        },
    ],
};

/**
 * 死亡之眼 - 终极技能
 * 4个准心 → 造成击倒效果，再造成 6 不可防御伤害
 */
const DEATHS_EYE: AbilityDef = {
    id: 'deaths-eye',
    name: abilityText('deaths-eye', 'name'),
    description: abilityText('deaths-eye', 'description'),
    cpCost: 0,
    category: 'offensive',
    trigger: { type: 'diceSet', faces: { [BULLSEYE]: 4 } },
    effects: [
        {
            description: abilityEffectText('deaths-eye', 'inflictKnockdown'),
            action: { type: 'inflictStatus', target: 'opponent', statusId: STATUS_IDS.KNOCKDOWN, value: 1 },
            timing: 'immediate',
        },
        {
            description: abilityEffectText('deaths-eye', 'damage6Unblockable'),
            action: { type: 'damage', target: 'opponent', value: 6, unblockable: true },
            timing: 'immediate',
        },
    ],
};

/**
 * 快速拔枪 - 被动技能
 * 在你的维持阶段期间，获得装填弹药指示物
 */
const QUICK_DRAW: AbilityDef = {
    id: 'quick-draw',
    name: abilityText('quick-draw', 'name'),
    description: abilityText('quick-draw', 'description'),
    cpCost: 0,
    category: 'passive',
    trigger: { type: 'phaseStart', phase: 'upkeep' }, // 维持阶段开始时
    effects: [
        {
            description: abilityEffectText('quick-draw', 'gainLoaded'),
            action: { type: 'grantToken', target: 'self', tokenId: TOKEN_IDS.LOADED, value: 1 },
            timing: 'immediate',
        },
    ],
};

/**
 * 掩护射击 - 获得闪避并攻击
 * 2个子弹 + 3个冲刺 → 获得闪避指示物，造成 5 伤害
 */
const COVERING_FIRE: AbilityDef = {
    id: 'covering-fire',
    name: abilityText('covering-fire', 'name'),
    description: abilityText('covering-fire', 'description'),
    cpCost: 0,
    category: 'offensive',
    trigger: { type: 'diceSet', faces: { [BULLET]: 2, [DASH]: 3 } },
    effects: [
        {
            description: abilityEffectText('covering-fire', 'gainEvasive'),
            action: { type: 'grantToken', target: 'self', tokenId: TOKEN_IDS.EVASIVE, value: 1 },
            timing: 'preDefense',
        },
        {
            description: abilityEffectText('covering-fire', 'damage5'),
            action: { type: 'damage', target: 'opponent', value: 5 },
            timing: 'immediate',
        },
    ],
};

/**
 * 枪林弹雨 - 终极招式（Ultimate）
 * 5个准心 → 获得闪避，造成赏金+击倒效果，再造成 10 不可防御伤害
 * 特殊：花费装填弹药可以重掷此骰一次
 * 终极招式：对手仅可以改变骰子来阻止，不能使用任何行动来改变、避免或取消此技能
 */
const BULLET_STORM: AbilityDef = {
    id: 'bullet-storm',
    name: abilityText('bullet-storm', 'name'),
    description: abilityText('bullet-storm', 'description'),
    cpCost: 0,
    category: 'offensive',
    trigger: { type: 'diceSet', faces: { [BULLSEYE]: 5 } },
    tags: ['ultimate'], // 终极招式标记
    effects: [
        {
            description: abilityEffectText('bullet-storm', 'gainEvasive'),
            action: { type: 'grantToken', target: 'self', tokenId: TOKEN_IDS.EVASIVE, value: 1 },
            timing: 'immediate',
        },
        {
            description: abilityEffectText('bullet-storm', 'inflictBounty'),
            action: { type: 'grantToken', target: 'opponent', tokenId: TOKEN_IDS.BOUNTY, value: 1 },
            timing: 'immediate',
        },
        {
            description: abilityEffectText('bullet-storm', 'inflictKnockdown'),
            action: { type: 'inflictStatus', target: 'opponent', statusId: STATUS_IDS.KNOCKDOWN, value: 1 },
            timing: 'immediate',
        },
        {
            description: abilityEffectText('bullet-storm', 'damage10Unblockable'),
            action: { type: 'damage', target: 'opponent', value: 10, unblockable: true },
            timing: 'immediate',
        },
        // 特殊：花费装填弹药可以重掷此骰一次
        {
            description: abilityEffectText('bullet-storm', 'rerollOption'),
            action: {
                type: 'custom',
                target: 'self',
                customActionId: 'bullet-storm-reroll-option',
                // 如果有装填弹药 Token，可以选择花费1个来重掷此骰
            },
            timing: 'immediate',
        },
    ],
};

/**
 * 左轮速射 - 大顺攻击
 * 大顺-5颗连续骰数 → 获得2个闪避指示物，造成 7 伤害
 */
const RAPID_FIRE: AbilityDef = {
    id: 'rapid-fire',
    name: abilityText('rapid-fire', 'name'),
    description: abilityText('rapid-fire', 'description'),
    cpCost: 0,
    category: 'offensive',
    trigger: { type: 'straight', length: 5 }, // 大顺-5颗连续骰数
    effects: [
        {
            description: abilityEffectText('rapid-fire', 'gainEvasive2'),
            action: { type: 'grantToken', target: 'self', tokenId: TOKEN_IDS.EVASIVE, value: 2 },
            timing: 'preDefense',
        },
        {
            description: abilityEffectText('rapid-fire', 'damage7'),
            action: { type: 'damage', target: 'opponent', value: 7 },
            timing: 'immediate',
        },
    ],
};

/**
 * 对决 - 防御技能
 * 掷1颗骰子，掷骰防御阶段你与攻击方各掷一颗比较大小：
 * - 若大于攻击方：可选择造成 3 不可防御伤害或抵挡 ½ 进攻伤害
 * - 若小于攻击方：则造成 1 不可防御伤害
 */
const DUEL: AbilityDef = {
    id: 'duel',
    name: abilityText('duel', 'name'),
    description: abilityText('duel', 'description'),
    cpCost: 0,
    category: 'defensive',
    trigger: { type: 'manual' }, // 防御阶段手动触发
    effects: [
        {
            description: abilityEffectText('duel', 'duelRoll'),
            action: {
                type: 'custom',
                target: 'opponent',
                customActionId: 'duel-defensive-roll',
                // 自定义逻辑：双方各掷1骰，比较大小
                // 胜利 → 选择：3不可防御伤害 或 抵挡½伤害
                // 失败 → 1不可防御伤害
            },
            timing: 'defensive',
        },
    ],
};

export const GUNSLINGER_ABILITIES: AbilityDef[] = [
    REVOLVER,
    BOUNTY_HUNTER,
    // GUNFIGHT_DUEL, // TODO: 需要实现 gunfight-duel-roll custom action
    DEATHS_EYE,
    QUICK_DRAW,
    COVERING_FIRE,
    // BULLET_STORM, // TODO: 需要实现 bullet-storm-reroll-option custom action
    // RAPID_FIRE,
    // DUEL, // TODO: 需要实现 duel-defensive-roll custom action
];
