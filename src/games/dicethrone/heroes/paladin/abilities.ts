/**
 * 圣骑士英雄的技能定义
 * 包含所有升级与基础技能
 */

import type { AbilityDef, AbilityEffect, EffectTiming, EffectCondition } from '../../domain/combat';
import { TOKEN_IDS, PALADIN_DICE_FACE_IDS as FACES } from '../../domain/ids';

// 文本辅助
const abilityText = (id: string, field: 'name' | 'description') => `abilities.${id}.${field}`;
const abilityEffectText = (id: string, field: string) => `abilities.${id}.effects.${field}`;

export const PALADIN_SFX_LIGHT = 'magic.general.modern_magic_sound_fx_pack_vol.divine_magic.divine_magic_grace_whisper_001';
export const PALADIN_SFX_HEAVY = 'magic.general.modern_magic_sound_fx_pack_vol.divine_magic.divine_magic_hallowed_beam_001';
export const PALADIN_SFX_ULTIMATE = 'magic.general.modern_magic_sound_fx_pack_vol.divine_magic.divine_magic_celestial_choir_001';

// 辅助函数
const damage = (value: number, description: string, opts?: { timing?: EffectTiming; condition?: EffectCondition; tags?: string[] }): AbilityEffect => ({
    description,
    action: { type: 'damage', target: 'opponent', value, tags: opts?.tags },
    timing: opts?.timing,
    condition: opts?.condition,
});

const heal = (value: number, description: string): AbilityEffect => ({
    description,
    action: { type: 'heal', target: 'self', value },
    timing: 'immediate',
});

const grantToken = (tokenId: string, value: number, description: string): AbilityEffect => ({
    description,
    action: { type: 'grantToken', target: 'self', tokenId, value },
    timing: 'immediate',
});

const cpGain = (value: number, description: string): AbilityEffect => ({
    description,
    action: { type: 'custom', target: 'self', customActionId: 'gain-cp', params: { amount: value } },
    timing: 'immediate',
});

// ----------------------------------------------------------------------------
// 升级技能定义
// ----------------------------------------------------------------------------

export const RIGHTEOUS_COMBAT_2: AbilityDef = {
    id: 'righteous-combat',
    name: abilityText('righteous-combat-2', 'name'),
    type: 'offensive',
    description: abilityText('righteous-combat-2', 'description'),
    sfxKey: PALADIN_SFX_HEAVY,
    variants: [
        // 执着 (Tenacity) - 2 Sword + 1 Helm
        {
            id: 'righteous-combat-2-tenacity',
            trigger: { type: 'diceSet', faces: { [FACES.SWORD]: 2, [FACES.HELM]: 1 } },
            effects: [
                heal(2, abilityEffectText('righteous-combat-2', 'heal2')),
                damage(2, abilityEffectText('righteous-combat-2', 'damage2Unblockable'), { tags: ['unblockable'] })
            ],
            priority: 0
        },
        // 主技能: 3 Sword + 2 Helm (5 Dice)
        {
            id: 'righteous-combat-2-main',
            trigger: { type: 'diceSet', faces: { [FACES.SWORD]: 3, [FACES.HELM]: 2 } },
            effects: [
                damage(5, abilityEffectText('righteous-combat-2', 'damage5')),
                {
                    description: abilityEffectText('righteous-combat-2', 'roll3'),
                    action: {
                        type: 'rollDie',
                        target: 'self',
                        diceCount: 3,
                        conditionalEffects: [
                            { face: FACES.HELM, bonusDamage: 1 },
                            { face: FACES.SWORD, bonusDamage: 2 },
                            { face: FACES.HEART, heal: 2 },
                            { face: FACES.PRAY, cp: 1 },
                        ]
                    },
                    timing: 'withDamage'
                }
            ],
            priority: 1
        }
    ]
};

export const RIGHTEOUS_COMBAT_3: AbilityDef = {
    id: 'righteous-combat',
    name: abilityText('righteous-combat-3', 'name'),
    type: 'offensive',
    description: abilityText('righteous-combat-3', 'description'),
    sfxKey: PALADIN_SFX_HEAVY,
    variants: [
        // 执着
        {
            id: 'righteous-combat-3-tenacity',
            trigger: { type: 'diceSet', faces: { [FACES.SWORD]: 2, [FACES.HELM]: 1 } },
            effects: [
                heal(2, abilityEffectText('righteous-combat-3', 'heal2')),
                damage(2, abilityEffectText('righteous-combat-3', 'damage2Unblockable'), { tags: ['unblockable'] })
            ],
            priority: 0
        },
        // 主技能: 6 Damage
        {
            id: 'righteous-combat-3-main',
            trigger: { type: 'diceSet', faces: { [FACES.SWORD]: 3, [FACES.HELM]: 2 } },
            effects: [
                damage(6, abilityEffectText('righteous-combat-3', 'damage6')),
                {
                    description: abilityEffectText('righteous-combat-3', 'roll3'),
                    action: {
                        type: 'rollDie',
                        target: 'self',
                        diceCount: 3,
                        conditionalEffects: [
                            { face: FACES.HELM, bonusDamage: 1 },
                            { face: FACES.SWORD, bonusDamage: 2 },
                            { face: FACES.HEART, heal: 2 },
                            { face: FACES.PRAY, cp: 1 },
                        ]
                    },
                    timing: 'withDamage'
                }
            ],
            priority: 1
        }
    ]
};

export const BLESSING_OF_MIGHT_2: AbilityDef = {
    id: 'blessing-of-might',
    name: abilityText('blessing-of-might-2', 'name'),
    type: 'offensive',
    description: abilityText('blessing-of-might-2', 'description'),
    sfxKey: PALADIN_SFX_HEAVY,
    variants: [
        // 进攻姿态 (Offensive Stance): 2 Sword + 1 Pray
        {
            id: 'blessing-of-might-2-stance',
            trigger: { type: 'diceSet', faces: { [FACES.SWORD]: 2, [FACES.PRAY]: 1 } },
            effects: [
                damage(2, abilityEffectText('blessing-of-might-2', 'damage2Unblockable'), { tags: ['unblockable'] }),
                {
                    description: abilityEffectText('blessing-of-might-2', 'choice'),
                    action: {
                        type: 'choice',
                        target: 'self',
                        choiceTitleKey: 'choices.critOrAccuracy',
                        choiceOptions: [
                            { tokenId: TOKEN_IDS.CRIT, value: 1 },
                            { tokenId: TOKEN_IDS.ACCURACY, value: 1 }
                        ]
                    },
                    timing: 'immediate'
                }
            ],
            priority: 0
        },
        // 神力信徒 II (Might Disciple II): 3 Sword + 1 Pray
        {
            id: 'blessing-of-might-2-main',
            trigger: { type: 'diceSet', faces: { [FACES.SWORD]: 3, [FACES.PRAY]: 1 } },
            effects: [
                damage(4, abilityEffectText('blessing-of-might-2', 'damage4Unblockable'), { tags: ['unblockable'] }),
                grantToken(TOKEN_IDS.CRIT, 1, abilityEffectText('blessing-of-might-2', 'gainCrit')),
                grantToken(TOKEN_IDS.ACCURACY, 1, abilityEffectText('blessing-of-might-2', 'gainAccuracy')),
            ],
            priority: 1
        }
    ]
};

export const HOLY_LIGHT_2: AbilityDef = {
    id: 'holy-light',
    name: abilityText('holy-light-2', 'name'),
    type: 'offensive',
    description: abilityText('holy-light-2', 'description'),
    sfxKey: PALADIN_SFX_LIGHT,
    trigger: { type: 'diceSet', faces: { [FACES.HEART]: 2 } },
    effects: [
        heal(1, abilityEffectText('holy-light-2', 'heal1')),
        {
            description: abilityEffectText('holy-light-2', 'roll3'),
            action: { type: 'custom', target: 'self', customActionId: 'paladin-holy-light-roll-3' },
            timing: 'immediate'
        }
    ]
};

export const VENGEANCE_2: AbilityDef = {
    id: 'vengeance',
    name: abilityText('vengeance-2', 'name'), // Retribution II
    type: 'offensive',
    description: abilityText('vengeance-2', 'description'),
    sfxKey: PALADIN_SFX_HEAVY,
    variants: [
        // 复仇 (Vengeance) - Variant 1 (Sword Helm Heart Pray - 4 different symbols)
        // Wait, "Sword Helm Heart Pray" = Small Straight?
        // Dice values: Sword(1,2), Helm(3,4), Heart(5), Pray(6).
        // 1,3,5,6 or 2,4,5,6. It is technically a partial straight.
        // It's defined as a DiceSet of 1 of each face.
        {
            id: 'vengeance-2-mix',
            trigger: { type: 'allSymbolsPresent', symbols: [FACES.SWORD, FACES.HELM, FACES.HEART, FACES.PRAY] },
            effects: [
                grantToken(TOKEN_IDS.RETRIBUTION, 1, abilityEffectText('vengeance-2', 'gainRetribution')),
                heal(1, abilityEffectText('vengeance-2', 'heal1')),
                damage(3, abilityEffectText('vengeance-2', 'damage3Unblockable'), { tags: ['unblockable'] })
            ],
            priority: 0
        },
        // 反击 II (Retribution II) - Variant 2 (3 Helm + 1 Pray)
        {
            id: 'vengeance-2-main',
            trigger: { type: 'diceSet', faces: { [FACES.HELM]: 3, [FACES.PRAY]: 1 } },
            effects: [
                grantToken(TOKEN_IDS.RETRIBUTION, 1, abilityEffectText('vengeance-2', 'gainRetributionToAny')), // Screenshot: "1 Player gains Retribution".
                cpGain(4, abilityEffectText('vengeance-2', 'gain4CP'))
            ],
            priority: 1
        }
    ]
};

export const RIGHTEOUS_PRAYER_2: AbilityDef = {
    id: 'righteous-prayer',
    name: abilityText('righteous-prayer-2', 'name'),
    type: 'offensive',
    description: abilityText('righteous-prayer-2', 'description'),
    sfxKey: PALADIN_SFX_HEAVY,
    variants: [
        // 繁盛 (Prosperity): 3 Pray
        {
            id: 'righteous-prayer-2-prosperity',
            trigger: { type: 'diceSet', faces: { [FACES.PRAY]: 3 } },
            effects: [cpGain(4, abilityEffectText('righteous-prayer-2', 'gain4CP'))],
            priority: 0
        },
        // 正义祷告 II: 4 Pray
        {
            id: 'righteous-prayer-2-main',
            trigger: { type: 'diceSet', faces: { [FACES.PRAY]: 4 } },
            effects: [
                damage(8, abilityEffectText('righteous-prayer-2', 'damage8Unblockable'), { tags: ['unblockable'] }),
                grantToken(TOKEN_IDS.CRIT, 1, abilityEffectText('righteous-prayer-2', 'gainCrit')),
                cpGain(2, abilityEffectText('righteous-prayer-2', 'gain2CP')),
            ],
            priority: 1
        }
    ]
};

export const HOLY_STRIKE_2: AbilityDef = {
    id: 'holy-strike',
    name: abilityText('holy-strike-2', 'name'), // Holy Strike II
    type: 'offensive',
    description: abilityText('holy-strike-2', 'description'),
    sfxKey: PALADIN_SFX_HEAVY,
    variants: [
        {
            id: 'holy-strike-2-small',
            trigger: { type: 'smallStraight' },
            effects: [heal(1, abilityEffectText('holy-strike-2', 'heal1')), damage(7, abilityEffectText('holy-strike-2', 'damage7'))],
            priority: 0
        },
        {
            id: 'holy-strike-2-large',
            trigger: { type: 'largeStraight' },
            effects: [heal(2, abilityEffectText('holy-strike-2', 'heal2')), damage(9, abilityEffectText('holy-strike-2', 'damage9'))],
            priority: 1
        }
    ]
};

export const HOLY_DEFENSE_2: AbilityDef = {
    id: 'holy-defense',
    name: abilityText('holy-defense-2', 'name'),
    type: 'defensive',
    description: abilityText('holy-defense-2', 'description'),
    trigger: { type: 'phase', phaseId: 'defensiveRoll', diceCount: 4 },
    effects: [
        {
            description: abilityEffectText('holy-defense-2', 'effect'),
            action: { type: 'custom', target: 'self', customActionId: 'paladin-holy-defense-2' },
            timing: 'withDamage'
        }
    ]
};

export const HOLY_DEFENSE_3: AbilityDef = {
    id: 'holy-defense',
    name: abilityText('holy-defense-3', 'name'),
    type: 'defensive',
    description: abilityText('holy-defense-3', 'description'),
    trigger: { type: 'phase', phaseId: 'defensiveRoll', diceCount: 4 },
    effects: [
        {
            description: abilityEffectText('holy-defense-3', 'effect'),
            action: { type: 'custom', target: 'self', customActionId: 'paladin-holy-defense-3' },
            timing: 'withDamage'
        }
    ]
};

// ----------------------------------------------------------------------------
// 基础技能定义
// ----------------------------------------------------------------------------

export const PALADIN_ABILITIES: AbilityDef[] = [
    // 1. 正义冲击 (Righteous Combat)
    {
        id: 'righteous-combat',
        name: abilityText('righteous-combat', 'name'),
        type: 'offensive',
        description: abilityText('righteous-combat', 'description'),
        sfxKey: PALADIN_SFX_HEAVY,
        trigger: { type: 'diceSet', faces: { [FACES.SWORD]: 3, [FACES.HELM]: 1 } },
        effects: [
            damage(5, abilityEffectText('righteous-combat', 'damage5')),
            {
                description: abilityEffectText('righteous-combat', 'roll2'),
                action: {
                    type: 'rollDie',
                    target: 'self',
                    diceCount: 2,
                    conditionalEffects: [
                        { face: FACES.HELM, bonusDamage: 1 },
                        { face: FACES.SWORD, bonusDamage: 2 },
                        { face: FACES.HEART, heal: 2 },
                        { face: FACES.PRAY, cp: 1 },
                    ]
                },
                timing: 'withDamage'
            }
        ]
    },

    // 2. 力量祝福 (Blessing of Might)
    {
        id: 'blessing-of-might',
        name: abilityText('blessing-of-might', 'name'),
        type: 'offensive',
        description: abilityText('blessing-of-might', 'description'),
        sfxKey: PALADIN_SFX_HEAVY,
        trigger: { type: 'diceSet', faces: { [FACES.SWORD]: 3, [FACES.PRAY]: 1 } },
        effects: [
            damage(3, abilityEffectText('blessing-of-might', 'damage3'), { tags: ['unblockable'] }),
            grantToken(TOKEN_IDS.CRIT, 1, abilityEffectText('blessing-of-might', 'gainCrit')),
            grantToken(TOKEN_IDS.ACCURACY, 1, abilityEffectText('blessing-of-might', 'gainAccuracy')),
        ]
    },

    // 3. 神圣冲击 (Holy Strike) - Small/Large
    {
        id: 'holy-strike',
        name: abilityText('holy-strike', 'name'),
        type: 'offensive',
        description: abilityText('holy-strike', 'description'),
        sfxKey: PALADIN_SFX_HEAVY,
        variants: [
            { id: 'holy-strike-small', trigger: { type: 'smallStraight' }, effects: [heal(1, abilityEffectText('holy-strike', 'heal1')), damage(5, abilityEffectText('holy-strike', 'damage5'))], priority: 0 },
            { id: 'holy-strike-large', trigger: { type: 'largeStraight' }, effects: [heal(2, abilityEffectText('holy-strike-large', 'heal2')), damage(8, abilityEffectText('holy-strike-large', 'damage8'))], priority: 1 }
        ]
    },

    // 4. 圣光 (Holy Light)
    {
        id: 'holy-light',
        name: abilityText('holy-light', 'name'),
        type: 'offensive',
        description: abilityText('holy-light', 'description'),
        sfxKey: PALADIN_SFX_LIGHT,
        trigger: { type: 'diceSet', faces: { [FACES.HEART]: 2 } },
        effects: [
            heal(1, abilityEffectText('holy-light', 'heal1')),
            {
                description: abilityEffectText('holy-light', 'rollEffect'),
                action: { type: 'custom', target: 'self', customActionId: 'paladin-holy-light-roll' },
                timing: 'immediate'
            }
        ]
    },

    // 5. 复仇 (Vengeance)
    {
        id: 'vengeance',
        name: abilityText('vengeance', 'name'),
        type: 'offensive',
        description: abilityText('vengeance', 'description'),
        sfxKey: PALADIN_SFX_HEAVY,
        trigger: { type: 'diceSet', faces: { [FACES.HELM]: 3, [FACES.PRAY]: 1 } },
        effects: [
            grantToken(TOKEN_IDS.RETRIBUTION, 1, abilityEffectText('vengeance', 'gainRetribution')),
            cpGain(2, abilityEffectText('vengeance', 'gain2CP')),
        ]
    },

    // 6. 正义祈祷 (Righteous Prayer)
    {
        id: 'righteous-prayer',
        name: abilityText('righteous-prayer', 'name'),
        type: 'offensive',
        description: abilityText('righteous-prayer', 'description'),
        sfxKey: PALADIN_SFX_HEAVY,
        trigger: { type: 'diceSet', faces: { [FACES.PRAY]: 4 } },
        effects: [
            damage(8, abilityEffectText('righteous-prayer', 'damage8')),
            grantToken(TOKEN_IDS.CRIT, 1, abilityEffectText('righteous-prayer', 'gainCrit')),
            cpGain(2, abilityEffectText('righteous-prayer', 'gain2CP')),
        ]
    },

    // 7. 神圣防御 (Holy Defense)
    {
        id: 'holy-defense',
        name: abilityText('holy-defense', 'name'),
        type: 'defensive',
        description: abilityText('holy-defense', 'description'),
        trigger: { type: 'phase', phaseId: 'defensiveRoll', diceCount: 3 },
        effects: [
            {
                description: abilityEffectText('holy-defense', 'effect'),
                action: { type: 'custom', target: 'self', customActionId: 'paladin-holy-defense' },
                timing: 'withDamage'
            }
        ]
    },

    // 8. 坚毅信念 (Unyielding Faith)
    {
        id: 'unyielding-faith',
        name: abilityText('unyielding-faith', 'name'),
        type: 'offensive',
        description: abilityText('unyielding-faith', 'description'),
        sfxKey: PALADIN_SFX_ULTIMATE,
        tags: ['ultimate'],
        trigger: { type: 'diceSet', faces: { [FACES.PRAY]: 5 } },
        effects: [
            heal(5, abilityEffectText('unyielding-faith', 'heal5')),
            damage(10, abilityEffectText('unyielding-faith', 'damage10'), { tags: ['unblockable'] }),
            grantToken(TOKEN_IDS.BLESSING_OF_DIVINITY, 1, abilityEffectText('unyielding-faith', 'gainBlessing')),
        ]
    }
];
