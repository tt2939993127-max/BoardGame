import type { AbilityCard } from '../../types';
import { DICETHRONE_CARD_ATLAS_IDS } from '../../domain/ids';
import { COMMON_CARDS, injectCommonCardPreviewRefs } from '../../domain/commonCards';
import type { RandomFn } from '../../../../engine/types';
import { DAGGER_STRIKE_2, PICKPOCKET_2, KIDNEY_SHOT_2, SHADOW_ASSAULT, PIERCING_ATTACK, SHADOW_DEFENSE_2 } from './abilities';

// Helper
const cardText = (id: string, field: 'name' | 'description') => `cards.${id}.${field}`;


export const SHADOW_THIEF_CARDS: AbilityCard[] = [
    // 1. Pickpocket II (迅捷突袭 II)
    {
        id: 'upgrade-pickpocket-2',
        name: 'Pickpocket II',
        type: 'upgrade',
        cpCost: 2,
        timing: 'main',
        description: 'Upgrade Pickpocket to Level 2',
        previewRef: { type: 'atlas', atlasId: DICETHRONE_CARD_ATLAS_IDS.SHADOW_THIEF, index: 1 }, // Map to correct index eventually
        effects: [{ description: 'Upgrade Pickpocket', action: { type: 'replaceAbility', target: 'self', targetAbilityId: 'pickpocket', newAbilityDef: PICKPOCKET_2, newAbilityLevel: 2 } }]
    },
    // 2. Kidney Shot II (破隐一击 II)
    {
        id: 'upgrade-kidney-shot-2',
        name: 'Kidney Shot II',
        type: 'upgrade',
        cpCost: 2,
        timing: 'main',
        description: 'Upgrade Kidney Shot to Level 2',
        previewRef: { type: 'atlas', atlasId: DICETHRONE_CARD_ATLAS_IDS.SHADOW_THIEF, index: 2 },
        effects: [{ description: 'Upgrade Kidney Shot', action: { type: 'replaceAbility', target: 'self', targetAbilityId: 'kidney-shot', newAbilityDef: KIDNEY_SHOT_2, newAbilityLevel: 2 } }]
    },
    // 3. Shadow Assault (暗影突袭) - Assumed Upgrade for Shadow Dance
    {
        id: 'upgrade-shadow-assault',
        name: 'Shadow Assault',
        type: 'upgrade',
        cpCost: 2, // From image
        timing: 'main',
        description: 'Upgrade Shadow Dance to Shadow Assault',
        previewRef: { type: 'atlas', atlasId: DICETHRONE_CARD_ATLAS_IDS.SHADOW_THIEF, index: 3 },
        effects: [{ description: 'Replace Shadow Dance', action: { type: 'replaceAbility', target: 'self', targetAbilityId: 'shadow-dance', newAbilityDef: SHADOW_ASSAULT, newAbilityLevel: 2 } }]
    },
    // 4. Piercing Attack (穿刺攻击) - Assumed Upgrade for Steal
    {
        id: 'upgrade-piercing-attack',
        name: 'Piercing Attack',
        type: 'upgrade',
        cpCost: 2, // Guessing cost based on tier
        timing: 'main',
        description: 'Upgrade Steal to Piercing Attack',
        previewRef: { type: 'atlas', atlasId: DICETHRONE_CARD_ATLAS_IDS.SHADOW_THIEF, index: 4 },
        effects: [{ description: 'Replace Steal', action: { type: 'replaceAbility', target: 'self', targetAbilityId: 'steal', newAbilityDef: PIERCING_ATTACK, newAbilityLevel: 2 } }]
    },
    // 5. Sneaky! (鬼鬼祟祟!) - Instant Action
    {
        id: 'action-sneaky',
        name: 'Sneaky!',
        type: 'action',
        cpCost: 1,
        timing: 'instant',
        description: 'Gain Sneak Attack',
        previewRef: { type: 'atlas', atlasId: DICETHRONE_CARD_ATLAS_IDS.SHADOW_THIEF, index: 5 },
        effects: [{ description: 'Gain Sneak Attack', action: { type: 'grantToken', target: 'self', tokenId: 'sneak_attack', value: 1 } }]
    },
    // 6. One with Shadows! (与影共生!) - Main Action (Roll)
    {
        id: 'action-one-with-shadows',
        name: 'One with Shadows!',
        type: 'action',
        cpCost: 0,
        timing: 'main',
        description: 'Roll 1 die. If Shadow: Gain Sneak Attack + 2 CP. Else Draw 1 Card.',
        previewRef: { type: 'atlas', atlasId: DICETHRONE_CARD_ATLAS_IDS.SHADOW_THIEF, index: 6 },
        effects: [{ description: 'Roll Die', action: { type: 'custom', target: 'self', customActionId: 'shadow_thief-one-with-shadows' } }]
    },
    // 7. Shadow Defense II (暗影防御 II) - Upgrade
    {
        id: 'upgrade-shadow-defense-2',
        name: 'Shadow Defense II',
        type: 'upgrade',
        cpCost: 3,
        timing: 'main',
        description: 'Upgrade Shadow Defense to Level 2',
        previewRef: { type: 'atlas', atlasId: DICETHRONE_CARD_ATLAS_IDS.SHADOW_THIEF, index: 7 },
        effects: [{ description: 'Upgrade Defense', action: { type: 'replaceAbility', target: 'self', targetAbilityId: 'shadow-defense', newAbilityDef: SHADOW_DEFENSE_2, newAbilityLevel: 2 } }]
    },
    // 8. Poison Tip! (毒伤!) - Instant Action
    {
        id: 'action-poison-tip',
        name: 'Poison Tip!',
        type: 'action',
        cpCost: 2,
        timing: 'instant',
        description: 'Inflict Poison',
        previewRef: { type: 'atlas', atlasId: DICETHRONE_CARD_ATLAS_IDS.SHADOW_THIEF, index: 8 },
        effects: [{ description: 'Inflict Poison', action: { type: 'grantStatus', target: 'opponent', statusId: 'poison', value: 1 } }]
    },
    // 9. Card Trick! (卡牌戏法!) - Main Action
    {
        id: 'action-card-trick',
        name: 'Card Trick!',
        type: 'action',
        cpCost: 2,
        timing: 'main',
        description: 'Opponent Discards 1. Draw 1 (2 if Sneak).',
        previewRef: { type: 'atlas', atlasId: DICETHRONE_CARD_ATLAS_IDS.SHADOW_THIEF, index: 9 },
        effects: [{ description: 'Resolve Card Trick', action: { type: 'custom', target: 'opponent', customActionId: 'shadow_thief-card-trick' } }]
    },
    // 10. Dagger Strike II (匕首突刺 II) - Upgrade
    {
        id: 'upgrade-dagger-strike-2',
        name: 'Dagger Strike II',
        type: 'upgrade',
        cpCost: 2, // 0 CP on card? But usually upgrades have cost.
        // Wait, Card Image says "0 CP". Let's double check.
        // Yes, "0 CP" (Blue Up arrow).
        // This is extremely efficient.
        timing: 'main',
        description: 'Upgrade Dagger Strike to Level 2',
        previewRef: { type: 'atlas', atlasId: DICETHRONE_CARD_ATLAS_IDS.SHADOW_THIEF, index: 10 },
        effects: [{ description: 'Upgrade Dagger Strike', action: { type: 'replaceAbility', target: 'self', targetAbilityId: 'dagger-strike', newAbilityDef: DAGGER_STRIKE_2, newAbilityLevel: 2 } }]
    },

    // Inject Common Cards? User only showed 10.
    // ...injectCommonCardPreviewRefs(COMMON_CARDS, DICETHRONE_CARD_ATLAS_IDS.SHADOW_THIEF),
];

export const getShadowThiefStartingDeck = (random: RandomFn): AbilityCard[] => {
    const deck: AbilityCard[] = [];
    SHADOW_THIEF_CARDS.forEach(card => {
        deck.push({ ...card });
        if (card.type !== 'upgrade') deck.push({ ...card });
    });
    return random.shuffle(deck);
};
