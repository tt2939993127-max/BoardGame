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

export const GUNSLINGER_ABILITIES: AbilityDef[] = [
    REVOLVER,
    BOUNTY_HUNTER,
    GUNFIGHT_DUEL,
    DEATHS_EYE,
    QUICK_DRAW,
    COVERING_FIRE,
];
