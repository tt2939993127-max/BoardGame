import type { AbilityDef, AbilityEffect, EffectTiming } from '../../../../systems/presets/combat';
import { SHADOW_THIEF_DICE_FACE_IDS, TOKEN_IDS } from '../../domain/ids';

const FACE = SHADOW_THIEF_DICE_FACE_IDS;

// 文本辅助
const abilityText = (id: string, field: 'name' | 'description') => `abilities.${id}.${field}`;
const abilityEffectText = (id: string, field: string) => `abilities.${id}.effects.${field}`;

// 辅助函数
const damage = (value: number | string, description: string): AbilityEffect => ({
    description,
    action: { type: 'damage', target: 'opponent', value: typeof value === 'number' ? value : 0 },
});

const grantToken = (tokenId: string, value: number, description: string, opts?: { timing?: EffectTiming }): AbilityEffect => ({
    description,
    action: { type: 'grantToken', target: 'self', tokenId, value },
    timing: opts?.timing ?? 'postDamage',
});

const gainCp = (value: number, description: string): AbilityEffect => ({
    description,
    action: { type: 'custom', target: 'self', customActionId: 'gain-cp', params: { amount: value } },
});

// ============================================================================
// Level 1 Abilities
// ============================================================================
export const SHADOW_THIEF_ABILITIES: AbilityDef[] = [
    // 匕首打击 (Dagger Strike) I
    {
        id: 'dagger-strike',
        name: abilityText('dagger-strike', 'name'),
        type: 'offensive',
        description: abilityText('dagger-strike', 'description'),
        variants: [
            { id: 'dagger-strike-3', trigger: { type: 'diceSet', faces: { [FACE.DAGGER]: 3 } }, effects: [damage(4, abilityEffectText('dagger-strike', 'damage4')), { description: '每有[Bag]获得1CP', action: { type: 'custom', target: 'self', customActionId: 'shadow_thief-dagger-strike-cp' } }, { description: '每有[Shadow]造成毒液', action: { type: 'custom', target: 'opponent', customActionId: 'shadow_thief-dagger-strike-poison' } }], priority: 1 },
            { id: 'dagger-strike-4', trigger: { type: 'diceSet', faces: { [FACE.DAGGER]: 4 } }, effects: [damage(6, abilityEffectText('dagger-strike', 'damage6')), { description: '每有[Bag]获得1CP', action: { type: 'custom', target: 'self', customActionId: 'shadow_thief-dagger-strike-cp' } }, { description: '每有[Shadow]造成毒液', action: { type: 'custom', target: 'opponent', customActionId: 'shadow_thief-dagger-strike-poison' } }], priority: 2 },
            { id: 'dagger-strike-5', trigger: { type: 'diceSet', faces: { [FACE.DAGGER]: 5 } }, effects: [damage(8, abilityEffectText('dagger-strike', 'damage8')), { description: '每有[Bag]获得1CP', action: { type: 'custom', target: 'self', customActionId: 'shadow_thief-dagger-strike-cp' } }, { description: '每有[Shadow]造成毒液', action: { type: 'custom', target: 'opponent', customActionId: 'shadow_thief-dagger-strike-poison' } }], priority: 3 }
        ]
    },
    // 抢夺 (Pickpocket) I
    {
        id: 'pickpocket',
        name: abilityText('pickpocket', 'name'),
        type: 'offensive',
        description: abilityText('pickpocket', 'description'),
        trigger: { type: 'smallStraight' },
        effects: [
            gainCp(3, abilityEffectText('pickpocket', 'gainCp3')),
            { description: '造成一半CP的伤害', action: { type: 'custom', target: 'opponent', customActionId: 'shadow_thief-damage-half-cp' } }
        ]
    },
    // 偷窃 (Steal) I
    {
        id: 'steal',
        name: abilityText('steal', 'name'),
        type: 'offensive',
        description: abilityText('steal', 'description'),
        variants: [
            { id: 'steal-2', trigger: { type: 'diceSet', faces: { [FACE.BAG]: 2 } }, effects: [{ description: '获得2CP (若有Shadow则偷取)', action: { type: 'custom', target: 'opponent', customActionId: 'shadow_thief-steal-cp-2' } }], priority: 1 },
            { id: 'steal-3', trigger: { type: 'diceSet', faces: { [FACE.BAG]: 3 } }, effects: [{ description: '获得3CP (若有Shadow则偷取)', action: { type: 'custom', target: 'opponent', customActionId: 'shadow_thief-steal-cp-3' } }], priority: 2 },
            { id: 'steal-4', trigger: { type: 'diceSet', faces: { [FACE.BAG]: 4 } }, effects: [{ description: '获得4CP (若有Shadow则偷取)', action: { type: 'custom', target: 'opponent', customActionId: 'shadow_thief-steal-cp-4' } }], priority: 3 }
        ]
    },
    // 肾击 (Kidney Shot) I
    {
        id: 'kidney-shot',
        name: abilityText('kidney-shot', 'name'),
        type: 'offensive',
        description: abilityText('kidney-shot', 'description'),
        trigger: { type: 'largeStraight' },
        effects: [
            gainCp(4, abilityEffectText('kidney-shot', 'gainCp4')),
            { description: '造成等同CP的伤害', action: { type: 'custom', target: 'opponent', customActionId: 'shadow_thief-damage-full-cp' } }
        ]
    },
    // 暗影之舞 (Shadow Dance) I
    {
        id: 'shadow-dance',
        name: abilityText('shadow-dance', 'name'),
        type: 'offensive',
        description: abilityText('shadow-dance', 'description'),
        trigger: { type: 'diceSet', faces: { [FACE.SHADOW]: 3 } },
        effects: [
            { description: '投掷1骰造成一半伤害', action: { type: 'custom', target: 'opponent', customActionId: 'shadow_thief-shadow-dance-roll' } },
            grantToken(TOKEN_IDS.SNEAK, 1, abilityEffectText('shadow-dance', 'gainSneak')),
            grantToken(TOKEN_IDS.SNEAK_ATTACK, 1, abilityEffectText('shadow-dance', 'gainSneakAttack'))
        ]
    },
    // 聚宝盆 (Cornucopia) I
    {
        id: 'cornucopia',
        name: abilityText('cornucopia', 'name'),
        type: 'offensive',
        description: abilityText('cornucopia', 'description'),
        trigger: { type: 'diceSet', faces: { [FACE.CARD]: 2 } },
        effects: [
            { description: 'Draw 1 Card', action: { type: 'drawCard', target: 'self', value: 1 } },
            { description: '若有Shadow丢弃对手1卡', action: { type: 'custom', target: 'opponent', customActionId: 'shadow_thief-cornucopia-discard' } }
        ]
    },
    // 终极: Shadow Shank
    {
        id: 'shadow-shank',
        name: abilityText('shadow-shank', 'name'),
        type: 'offensive',
        tags: ['ultimate'],
        description: abilityText('shadow-shank', 'description'),
        trigger: { type: 'diceSet', faces: { [FACE.SHADOW]: 5 } },
        effects: [
            gainCp(3, abilityEffectText('shadow-shank', 'gainCp3')),
            { description: '造成CP+5伤害', action: { type: 'custom', target: 'opponent', customActionId: 'shadow_thief-shadow-shank-damage' } },
            // Replaced removeStatus with custom action
            { description: '移除负面效果', action: { type: 'custom', target: 'self', customActionId: 'shadow_thief-remove-all-debuffs' } },
            grantToken(TOKEN_IDS.SNEAK, 1, abilityEffectText('shadow-shank', 'gainSneak'))
        ]
    },
    // 防御: 暗影守护
    {
        id: 'shadow-defense',
        name: abilityText('shadow-defense', 'name'),
        type: 'defensive',
        description: abilityText('shadow-defense', 'description'),
        trigger: { type: 'phase', phaseId: 'defensiveRoll', diceCount: 4 },
        effects: [
            { description: '防御结算', action: { type: 'custom', target: 'self', customActionId: 'shadow_thief-defense-resolve' }, timing: 'withDamage' }
        ]
    }
];

// ============================================================================
// Upgrades (Level 2 & 3)
// ============================================================================

export const DAGGER_STRIKE_2: AbilityDef = { // (Keep existing)
    id: 'dagger-strike',
    name: abilityText('dagger-strike-2', 'name'),
    type: 'offensive',
    description: abilityText('dagger-strike-2', 'description'),
    variants: [
        { id: 'dagger-strike-3-2', trigger: { type: 'diceSet', faces: { [FACE.DAGGER]: 3 } }, effects: [damage(4, abilityEffectText('dagger-strike', 'damage4')), { description: 'Gain 1 CP', action: { type: 'custom', target: 'self', customActionId: 'gain-cp', params: { amount: 1 } } }, { description: 'Per Shadow Poison', action: { type: 'custom', target: 'opponent', customActionId: 'shadow_thief-dagger-strike-poison' } }, { description: 'Per Card Draw', action: { type: 'custom', target: 'self', customActionId: 'shadow_thief-dagger-strike-draw' } }], priority: 1 },
        { id: 'dagger-strike-4-2', trigger: { type: 'diceSet', faces: { [FACE.DAGGER]: 4 } }, effects: [damage(6, abilityEffectText('dagger-strike', 'damage6')), { description: 'Gain 1 CP', action: { type: 'custom', target: 'self', customActionId: 'gain-cp', params: { amount: 1 } } }, { description: 'Per Shadow Poison', action: { type: 'custom', target: 'opponent', customActionId: 'shadow_thief-dagger-strike-poison' } }, { description: 'Per Card Draw', action: { type: 'custom', target: 'self', customActionId: 'shadow_thief-dagger-strike-draw' } }], priority: 2 },
        { id: 'dagger-strike-5-2', trigger: { type: 'diceSet', faces: { [FACE.DAGGER]: 5 } }, effects: [damage(8, abilityEffectText('dagger-strike', 'damage8')), { description: 'Gain 1 CP', action: { type: 'custom', target: 'self', customActionId: 'gain-cp', params: { amount: 1 } } }, { description: 'Per Shadow Poison', action: { type: 'custom', target: 'opponent', customActionId: 'shadow_thief-dagger-strike-poison' } }, { description: 'Per Card Draw', action: { type: 'custom', target: 'self', customActionId: 'shadow_thief-dagger-strike-draw' } }], priority: 3 }
    ]
};

export const PICKPOCKET_2: AbilityDef = {
    id: 'pickpocket',
    name: abilityText('pickpocket-2', 'name'),
    type: 'offensive',
    description: abilityText('pickpocket-2', 'description'),
    trigger: { type: 'smallStraight' },
    effects: [
        gainCp(4, abilityEffectText('pickpocket-2', 'gainCp4')),
        { description: '造成一半CP的伤害 (向上取整)', action: { type: 'custom', target: 'opponent', customActionId: 'shadow_thief-damage-half-cp' } }
    ]
};

export const KIDNEY_SHOT_2: AbilityDef = {
    id: 'kidney-shot',
    name: abilityText('kidney-shot-2', 'name'),
    type: 'offensive',
    description: abilityText('kidney-shot-2', 'description'),
    trigger: { type: 'largeStraight' },
    effects: [
        gainCp(4, abilityEffectText('kidney-shot-2', 'gainCp4')),
        { description: '造成等同CP的伤害', action: { type: 'custom', target: 'opponent', customActionId: 'shadow_thief-damage-full-cp' } }
    ]
};

// "Shadow Assault" (暗影突袭) - Replaces Shadow Dance (or Steal?)
// Based on image: Dagger x2 + Shadow x2
// This feels like a variation of Shadow Dance (Shadow theme).
export const SHADOW_ASSAULT: AbilityDef = {
    id: 'shadow-dance', // Replaces Shadow Dance slot
    name: abilityText('shadow-assault', 'name'),
    type: 'offensive',
    description: abilityText('shadow-assault', 'description'),
    // Trigger: 2 Daggers, 2 Shadows
    trigger: { type: 'diceSet', faces: { [FACE.DAGGER]: 2, [FACE.SHADOW]: 2 } }, // Assuming DiceSet supports mixed faces? If not, need composite?
    // Check DiceSet implementation: usually 'faces' is { faceId: count }. Yes.
    effects: [
        { description: '造成1/2 CP伤害 (向上取整)', action: { type: 'custom', target: 'opponent', customActionId: 'shadow_thief-damage-half-cp' } },
        { description: '施加中毒', action: { type: 'grantStatus', target: 'opponent', statusId: 'poison', value: 1 } }
    ]
};

// "Piercing Attack" (穿刺攻击) - Replaces Steal (or Cornucopia?)
// Based on image: Dagger, Bag, Card, Shadow (Small Straight-ish?)
export const PIERCING_ATTACK: AbilityDef = {
    id: 'steal', // Replaces Steal slot (Guess)
    name: abilityText('piercing-attack', 'name'),
    type: 'offensive',
    description: abilityText('piercing-attack', 'description'),
    trigger: { type: 'diceSet', faces: { [FACE.DAGGER]: 1, [FACE.BAG]: 1, [FACE.CARD]: 1, [FACE.SHADOW]: 1 } },
    effects: [
        gainCp(1, 'Gain 1 CP'),
        grantToken(TOKEN_IDS.SNEAK_ATTACK, 1, 'Gain Sneak Attack'),
        { description: 'Draw 1 Card', action: { type: 'drawCard', target: 'self', value: 1 } },
        { description: 'Inflict Poison', action: { type: 'grantStatus', target: 'opponent', statusId: 'poison', value: 1 } }
    ]
};

export const SHADOW_DEFENSE_2: AbilityDef = {
    id: 'shadow-defense',
    name: abilityText('shadow-defense-2', 'name'),
    type: 'defensive',
    description: abilityText('shadow-defense-2', 'description'),
    trigger: { type: 'phase', phaseId: 'defensiveRoll', diceCount: 5 }, // 5 Dice for Level 2
    effects: [
        { description: '防御结算 II', action: { type: 'custom', target: 'self', customActionId: 'shadow_thief-defense-resolve-2' }, timing: 'withDamage' }
    ]
};
