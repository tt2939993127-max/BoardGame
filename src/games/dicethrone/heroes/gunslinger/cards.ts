import type { RandomFn } from '../../../../engine/types';
import type { CardPreviewRef } from '../../../../core';
import type { AbilityCard } from '../../types';
import type { AbilityDef, AbilityEffect } from '../../domain/combat';
import {
    COMMON_CARDS,
    GUNSLINGER_COMMON_ATLAS_INDEX,
    injectCommonCardPreviewRefs,
} from '../../domain/commonCards';
import { DICETHRONE_CARD_ATLAS_IDS, DICETHRONE_HAND_CARD_ATLAS_IDS, TOKEN_IDS } from '../../domain/ids';
import {
    BOUNTY_HUNTER_2,
    DEADEYE_2,
    DUEL_2,
    FAN_THE_HAMMER_2,
    QUICK_DRAW_UPGRADED,
    REVOLVER_2,
    SHOWDOWN_2,
    SHOWDOWN_3,
    TAKE_COVER_2,
} from './abilities';

const cardText = (id: string, field: 'name' | 'description') => `cards.${id}.${field}`;

const GUNSLINGER_CARD_ATLAS_ID = DICETHRONE_HAND_CARD_ATLAS_IDS.GUNSLINGER;

const atlasPreview = (index: number): CardPreviewRef => ({
    type: 'atlas',
    atlasId: GUNSLINGER_CARD_ATLAS_ID,
    index,
});

const replaceAbility = (
    targetAbilityId: string,
    newAbilityDef: AbilityDef,
    newAbilityLevel: number,
    description: string,
): AbilityEffect => ({
    description,
    action: { type: 'replaceAbility', target: 'self', targetAbilityId, newAbilityDef, newAbilityLevel },
    timing: 'immediate',
});

const grantToken = (
    target: 'self' | 'opponent',
    tokenId: string,
    value: number,
    description: string,
): AbilityEffect => ({
    description,
    action: { type: 'grantToken', target, tokenId, value },
    timing: 'immediate',
});

const custom = (customActionId: string, description: string): AbilityEffect => ({
    description,
    action: { type: 'custom', target: 'self', customActionId },
    timing: 'immediate',
});

export const GUNSLINGER_CARDS: AbilityCard[] = [
    {
        id: 'upgrade-revolver-2',
        name: cardText('upgrade-revolver-2', 'name'),
        type: 'upgrade',
        cpCost: 2,
        timing: 'main',
        description: cardText('upgrade-revolver-2', 'description'),
        previewRef: atlasPreview(0),
        effects: [replaceAbility('revolver', REVOLVER_2, 2, '升级左轮手枪至 II 级。')],
    },
    {
        id: 'upgrade-bounty-hunter-2',
        name: cardText('upgrade-bounty-hunter-2', 'name'),
        type: 'upgrade',
        cpCost: 1,
        timing: 'main',
        description: cardText('upgrade-bounty-hunter-2', 'description'),
        previewRef: atlasPreview(1),
        effects: [replaceAbility('bounty-hunter', BOUNTY_HUNTER_2, 2, '升级赏金猎人至 II 级。')],
    },
    {
        id: 'upgrade-showdown-2',
        name: cardText('upgrade-showdown-2', 'name'),
        type: 'upgrade',
        cpCost: 1,
        timing: 'main',
        description: cardText('upgrade-showdown-2', 'description'),
        previewRef: atlasPreview(2),
        effects: [replaceAbility('showdown', SHOWDOWN_2, 2, '升级摊到牌面至 II 级。')],
    },
    {
        id: 'upgrade-showdown-3',
        name: cardText('upgrade-showdown-3', 'name'),
        type: 'upgrade',
        cpCost: 2,
        timing: 'main',
        description: cardText('upgrade-showdown-3', 'description'),
        previewRef: atlasPreview(3),
        effects: [replaceAbility('showdown', SHOWDOWN_3, 3, '升级摊到牌面至 III 级。')],
    },
    {
        id: 'upgrade-fan-the-hammer-2',
        name: cardText('upgrade-fan-the-hammer-2', 'name'),
        type: 'upgrade',
        cpCost: 2,
        timing: 'main',
        description: cardText('upgrade-fan-the-hammer-2', 'description'),
        previewRef: atlasPreview(4),
        effects: [replaceAbility('fan-the-hammer', FAN_THE_HAMMER_2, 2, '升级左轮速射至 II 级。')],
    },
    {
        id: 'card-pistol-whip',
        name: cardText('card-pistol-whip', 'name'),
        type: 'action',
        cpCost: 1,
        timing: 'main',
        description: cardText('card-pistol-whip', 'description'),
        previewRef: atlasPreview(5),
        effects: [
            grantToken('self', TOKEN_IDS.EVASIVE, 1, '获得 1 个闪避。'),
            custom('gunslinger-card-pistol-whip', '选择 1 位敌方玩家，使其获得击倒并受到 1 点伤害。'),
        ],
    },
    {
        id: 'upgrade-take-cover-2',
        name: cardText('upgrade-take-cover-2', 'name'),
        type: 'upgrade',
        cpCost: 2,
        timing: 'main',
        description: cardText('upgrade-take-cover-2', 'description'),
        previewRef: atlasPreview(6),
        effects: [replaceAbility('take-cover', TAKE_COVER_2, 2, '升级掩护射击至 II 级。')],
    },
    {
        id: 'card-mark-the-target',
        name: cardText('card-mark-the-target', 'name'),
        type: 'action',
        cpCost: 0,
        timing: 'main',
        description: cardText('card-mark-the-target', 'description'),
        previewRef: atlasPreview(7),
        effects: [
            grantToken('self', TOKEN_IDS.EVASIVE, 2, '获得 2 个闪避。'),
            custom('gunslinger-card-mark-the-target', '选择 1 位敌方玩家，使其获得 1 个赏金。'),
        ],
    },
    {
        id: 'upgrade-deadeye-2',
        name: cardText('upgrade-deadeye-2', 'name'),
        type: 'upgrade',
        cpCost: 2,
        timing: 'main',
        description: cardText('upgrade-deadeye-2', 'description'),
        previewRef: atlasPreview(8),
        effects: [replaceAbility('deadeye', DEADEYE_2, 2, '升级死亡之眼至 II 级。')],
    },
    {
        id: 'card-the-law',
        name: cardText('card-the-law', 'name'),
        type: 'action',
        cpCost: 2,
        timing: 'main',
        description: cardText('card-the-law', 'description'),
        previewRef: atlasPreview(9),
        effects: [
            grantToken('self', TOKEN_IDS.EVASIVE, 1, '获得 1 个闪避。'),
            custom('gunslinger-card-the-law', '选择至多 2 位目标玩家。每名目标玩家获得 1 个赏金并受到 1 层击倒。'),
        ],
    },
    {
        id: 'upgrade-duel-2',
        name: cardText('upgrade-duel-2', 'name'),
        type: 'upgrade',
        cpCost: 3,
        timing: 'main',
        description: cardText('upgrade-duel-2', 'description'),
        previewRef: atlasPreview(10),
        effects: [replaceAbility('duel', DUEL_2, 2, '升级对决至 II 级。')],
    },
    {
        id: 'upgrade-quick-draw',
        name: cardText('upgrade-quick-draw', 'name'),
        type: 'upgrade',
        cpCost: 2,
        timing: 'main',
        description: cardText('upgrade-quick-draw', 'description'),
        previewRef: atlasPreview(11),
        effects: [replaceAbility('quick-draw', QUICK_DRAW_UPGRADED, 2, '升级快速拔枪至 II 级。')],
    },
    {
        id: 'card-wanted',
        name: cardText('card-wanted', 'name'),
        type: 'action',
        cpCost: 2,
        timing: 'main',
        description: cardText('card-wanted', 'description'),
        previewRef: atlasPreview(12),
        effects: [
            custom('gunslinger-card-wanted', '选择 1 位敌方玩家，使其获得 1 个赏金。'),
        ],
    },
    {
        id: 'card-spin-the-chamber',
        name: cardText('card-spin-the-chamber', 'name'),
        type: 'action',
        cpCost: 1,
        timing: 'main',
        description: cardText('card-spin-the-chamber', 'description'),
        previewRef: atlasPreview(13),
        effects: [
            grantToken('self', TOKEN_IDS.LOADED, 1, '获得 1 个装填。'),
        ],
    },
    {
        id: 'card-high-noon',
        name: cardText('card-high-noon', 'name'),
        type: 'action',
        cpCost: 1,
        timing: 'main',
        description: cardText('card-high-noon', 'description'),
        previewRef: atlasPreview(14),
        effects: [
            custom('gunslinger-card-high-noon', '选择 1 位敌方玩家，掷 1 颗骰子并按结果结算。'),
        ],
    },
    {
        id: 'card-wild-west',
        name: cardText('card-wild-west', 'name'),
        type: 'action',
        cpCost: 1,
        timing: 'roll',
        description: cardText('card-wild-west', 'description'),
        previewRef: atlasPreview(15),
        isAttackModifier: true,
        playCondition: { requireDiceExists: true, requireHasRolled: true },
        effects: [
            custom('gunslinger-card-wild-west', '本次攻击伤害 +1。'),
        ],
    },
    {
        id: 'card-eat-my-lead',
        name: cardText('card-eat-my-lead', 'name'),
        type: 'action',
        cpCost: 2,
        timing: 'roll',
        description: cardText('card-eat-my-lead', 'description'),
        previewRef: atlasPreview(16),
        isAttackModifier: true,
        playCondition: { requireDiceExists: true, requireHasRolled: true },
        effects: [
            custom('gunslinger-card-eat-my-lead', '额外掷 5 颗骰子；每个子弹令本次攻击 +1。若加值大于 4，再施加击倒。'),
        ],
    },

    ...injectCommonCardPreviewRefs(
        COMMON_CARDS,
        DICETHRONE_CARD_ATLAS_IDS.GUNSLINGER,
        GUNSLINGER_COMMON_ATLAS_INDEX,
    ),
];

export const getGunslingerStartingDeck = (random: RandomFn): AbilityCard[] => {
    const deck = GUNSLINGER_CARDS.map(card => ({ ...card }));
    return random.shuffle(deck);
};
