import type { AbilityCard } from '../../types';
import { DICETHRONE_CARD_ATLAS_IDS } from '../../domain/ids';
import { COMMON_CARDS, injectCommonCardPreviewRefs } from '../../domain/commonCards';
import type { RandomFn } from '../../../../engine/types';
import { DAGGER_STRIKE_2, PICKPOCKET_2, KIDNEY_SHOT_2, SHADOW_ASSAULT, PIERCING_ATTACK, SHADOW_DEFENSE_2, FEARLESS_RIPOSTE_2, SHADOW_DANCE_2, STEAL_2, CORNUCOPIA_2 } from './abilities';

/** 卡牌文本 i18n key 生成 */
const cardText = (id: string, field: 'name' | 'description') => `cards.${id}.${field}`;

export const SHADOW_THIEF_CARDS: AbilityCard[] = [
    // 1. 抢夺 II
    {
        id: 'upgrade-pickpocket-2',
        name: cardText('upgrade-pickpocket-2', 'name'),
        type: 'upgrade',
        cpCost: 2,
        timing: 'main',
        description: cardText('upgrade-pickpocket-2', 'description'),
        previewRef: { type: 'atlas', atlasId: DICETHRONE_CARD_ATLAS_IDS.SHADOW_THIEF, index: 1 },
        effects: [{ description: '升级抢夺至 II 级', action: { type: 'replaceAbility', target: 'self', targetAbilityId: 'pickpocket', newAbilityDef: PICKPOCKET_2, newAbilityLevel: 2 }, timing: 'immediate' }]
    },
    // 2. 肾击 II
    {
        id: 'upgrade-kidney-shot-2',
        name: cardText('upgrade-kidney-shot-2', 'name'),
        type: 'upgrade',
        cpCost: 2,
        timing: 'main',
        description: cardText('upgrade-kidney-shot-2', 'description'),
        previewRef: { type: 'atlas', atlasId: DICETHRONE_CARD_ATLAS_IDS.SHADOW_THIEF, index: 2 },
        effects: [{ description: '升级肾击至 II 级', action: { type: 'replaceAbility', target: 'self', targetAbilityId: 'kidney-shot', newAbilityDef: KIDNEY_SHOT_2, newAbilityLevel: 2 }, timing: 'immediate' }]
    },
    // 3. 暗影突袭
    {
        id: 'upgrade-shadow-assault',
        name: cardText('upgrade-shadow-assault', 'name'),
        type: 'upgrade',
        cpCost: 2,
        timing: 'main',
        description: cardText('upgrade-shadow-assault', 'description'),
        previewRef: { type: 'atlas', atlasId: DICETHRONE_CARD_ATLAS_IDS.SHADOW_THIEF, index: 3 },
        effects: [{ description: '将暗影之舞升级为暗影突袭', action: { type: 'replaceAbility', target: 'self', targetAbilityId: 'shadow-dance', newAbilityDef: SHADOW_ASSAULT, newAbilityLevel: 2 }, timing: 'immediate' }]
    },
    // 4. 穿刺攻击
    {
        id: 'upgrade-piercing-attack',
        name: cardText('upgrade-piercing-attack', 'name'),
        type: 'upgrade',
        cpCost: 2,
        timing: 'main',
        description: cardText('upgrade-piercing-attack', 'description'),
        previewRef: { type: 'atlas', atlasId: DICETHRONE_CARD_ATLAS_IDS.SHADOW_THIEF, index: 4 },
        effects: [{ description: '将偷窃升级为穿刺攻击', action: { type: 'replaceAbility', target: 'self', targetAbilityId: 'steal', newAbilityDef: PIERCING_ATTACK, newAbilityLevel: 2 }, timing: 'immediate' }]
    },

    // 5. 遁入暗影!
    {
        id: 'action-into-the-shadows',
        name: cardText('action-into-the-shadows', 'name'),
        type: 'action',
        cpCost: 4,
        timing: 'instant',
        description: cardText('action-into-the-shadows', 'description'),
        previewRef: { type: 'atlas', atlasId: DICETHRONE_CARD_ATLAS_IDS.SHADOW_THIEF, index: 14 },
        effects: [{ description: '获得1个暗影标记', action: { type: 'grantToken', target: 'self', tokenId: 'shadow', value: 1 }, timing: 'immediate' }]
    },
    // 6. 与影同行!
    {
        id: 'action-one-with-shadows',
        name: cardText('action-one-with-shadows', 'name'),
        type: 'action',
        cpCost: 0,
        timing: 'main',
        description: cardText('action-one-with-shadows', 'description'),
        previewRef: { type: 'atlas', atlasId: DICETHRONE_CARD_ATLAS_IDS.SHADOW_THIEF, index: 6 },
        effects: [{ description: '投掷1骰结算', action: { type: 'custom', target: 'self', customActionId: 'shadow_thief-one-with-shadows' }, timing: 'immediate' }]
    },
    // 7. 暗影守护 II
    {
        id: 'upgrade-shadow-defense-2',
        name: cardText('upgrade-shadow-defense-2', 'name'),
        type: 'upgrade',
        cpCost: 2,
        timing: 'main',
        description: cardText('upgrade-shadow-defense-2', 'description'),
        previewRef: { type: 'atlas', atlasId: DICETHRONE_CARD_ATLAS_IDS.SHADOW_THIEF, index: 6 },
        effects: [{ description: '升级暗影守护至 II 级', action: { type: 'replaceAbility', target: 'self', targetAbilityId: 'shadow-defense', newAbilityDef: SHADOW_DEFENSE_2, newAbilityLevel: 2 }, timing: 'immediate' }]
    },
    // 8. 后发制人 II
    {
        id: 'upgrade-fearless-riposte-2',
        name: cardText('upgrade-fearless-riposte-2', 'name'),
        type: 'upgrade',
        cpCost: 4,
        timing: 'main',
        description: cardText('upgrade-fearless-riposte-2', 'description'),
        previewRef: { type: 'atlas', atlasId: DICETHRONE_CARD_ATLAS_IDS.SHADOW_THIEF, index: 7 },
        effects: [{ description: '升级恐惧反击至后发制人 II', action: { type: 'replaceAbility', target: 'self', targetAbilityId: 'fearless-riposte', newAbilityDef: FEARLESS_RIPOSTE_2, newAbilityLevel: 2 }, timing: 'immediate' }]
    },
    // 9. 淬毒!
    {
        id: 'action-poison-tip',
        name: cardText('action-poison-tip', 'name'),
        type: 'action',
        cpCost: 2,
        timing: 'instant',
        description: cardText('action-poison-tip', 'description'),
        previewRef: { type: 'atlas', atlasId: DICETHRONE_CARD_ATLAS_IDS.SHADOW_THIEF, index: 8 },
        effects: [{ description: '对对手施加中毒', action: { type: 'grantStatus', target: 'opponent', statusId: 'poison', value: 1 }, timing: 'immediate' }]
    },
    // 10. 卡牌戏法!
    {
        id: 'action-card-trick',
        name: cardText('action-card-trick', 'name'),
        type: 'action',
        cpCost: 2,
        timing: 'main',
        description: cardText('action-card-trick', 'description'),
        previewRef: { type: 'atlas', atlasId: DICETHRONE_CARD_ATLAS_IDS.SHADOW_THIEF, index: 9 },
        effects: [{ description: '卡牌戏法结算', action: { type: 'custom', target: 'opponent', customActionId: 'shadow_thief-card-trick' }, timing: 'immediate' }]
    },
    // 10.5 暗影操控!
    {
        id: 'action-shadow-manipulation',
        name: cardText('action-shadow-manipulation', 'name'),
        type: 'action',
        cpCost: 4,
        timing: 'roll',
        description: cardText('action-shadow-manipulation', 'description'),
        previewRef: { type: 'atlas', atlasId: DICETHRONE_CARD_ATLAS_IDS.SHADOW_THIEF, index: 13 },
        playCondition: { requireDiceExists: true, requireHasRolled: true },
        effects: [{ description: '暗影操控结算', action: { type: 'custom', target: 'self', customActionId: 'shadow_thief-shadow-manipulation' }, timing: 'immediate' }]
    },
    // 11. 匕首打击 II
    {
        id: 'upgrade-dagger-strike-2',
        name: cardText('upgrade-dagger-strike-2', 'name'),
        type: 'upgrade',
        cpCost: 2,
        timing: 'main',
        description: cardText('upgrade-dagger-strike-2', 'description'),
        previewRef: { type: 'atlas', atlasId: DICETHRONE_CARD_ATLAS_IDS.SHADOW_THIEF, index: 10 },
        effects: [{ description: '升级匕首打击至 II 级', action: { type: 'replaceAbility', target: 'self', targetAbilityId: 'dagger-strike', newAbilityDef: DAGGER_STRIKE_2, newAbilityLevel: 2 }, timing: 'immediate' }]
    },
    // 12. 暗影之舞 II
    {
        id: 'upgrade-shadow-dance-2',
        name: cardText('upgrade-shadow-dance-2', 'name'),
        type: 'upgrade',
        cpCost: 1,
        timing: 'main',
        description: cardText('upgrade-shadow-dance-2', 'description'),
        previewRef: { type: 'atlas', atlasId: DICETHRONE_CARD_ATLAS_IDS.SHADOW_THIEF, index: 10 },
        effects: [{ description: '升级暗影之舞至 II 级', action: { type: 'replaceAbility', target: 'self', targetAbilityId: 'shadow-dance', newAbilityDef: SHADOW_DANCE_2, newAbilityLevel: 2 }, timing: 'immediate' }]
    },
    // 13. 偷窃 II
    {
        id: 'upgrade-steal-2',
        name: cardText('upgrade-steal-2', 'name'),
        type: 'upgrade',
        cpCost: 1,
        timing: 'main',
        description: cardText('upgrade-steal-2', 'description'),
        previewRef: { type: 'atlas', atlasId: DICETHRONE_CARD_ATLAS_IDS.SHADOW_THIEF, index: 11 },
        effects: [{ description: '升级偷窃至 II 级', action: { type: 'replaceAbility', target: 'self', targetAbilityId: 'steal', newAbilityDef: STEAL_2, newAbilityLevel: 2 }, timing: 'immediate' }]
    },
    // 14. 聚宝盆 II
    {
        id: 'upgrade-cornucopia-2',
        name: cardText('upgrade-cornucopia-2', 'name'),
        type: 'upgrade',
        cpCost: 2,
        timing: 'main',
        description: cardText('upgrade-cornucopia-2', 'description'),
        previewRef: { type: 'atlas', atlasId: DICETHRONE_CARD_ATLAS_IDS.SHADOW_THIEF, index: 12 },
        effects: [{ description: '升级聚宝盆至 II 级', action: { type: 'replaceAbility', target: 'self', targetAbilityId: 'cornucopia', newAbilityDef: CORNUCOPIA_2, newAbilityLevel: 2 }, timing: 'immediate' }]
    },

    // 注入通用卡牌
    ...injectCommonCardPreviewRefs(COMMON_CARDS, DICETHRONE_CARD_ATLAS_IDS.SHADOW_THIEF),
];

export const getShadowThiefStartingDeck = (random: RandomFn): AbilityCard[] => {
    const deck: AbilityCard[] = [];
    SHADOW_THIEF_CARDS.forEach(card => {
        deck.push({ ...card });
        if (card.type !== 'upgrade') deck.push({ ...card });
    });
    return random.shuffle(deck);
};
