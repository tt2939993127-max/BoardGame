/**
 * DiceThrone 作弊系统配置
 * 从 game.ts 提取
 */

import type { CheatResourceModifier } from '../../../engine';
import { HEROES_DATA } from '../heroes';
import type { AbilityCard, DiceThroneCore, Die } from './types';
import { getDieFaceByDefinition } from './rules';
import { setCurrentRollContextDice } from './rollContext';

const getCardSourceAtlasIndex = (card: { sourceAtlasIndex?: number; previewRef?: { type: string; index?: number } }) => (
    typeof card.sourceAtlasIndex === 'number'
        ? card.sourceAtlasIndex
        : card.previewRef?.type === 'atlas'
            ? card.previewRef.index
            : undefined
);

const cloneAbilityCard = (card: AbilityCard): AbilityCard => ({ ...card });

const applyDiceValues = (dice: Die[], values: number[]): Die[] => (
    dice.map((die, index) => {
        const value = values[index] ?? die.value;
        const face = getDieFaceByDefinition(die.definitionId, value) ?? die.symbol ?? null;
        return {
            ...die,
            value,
            symbol: face,
            symbols: face ? [face] : [],
        };
    })
);

const getHeroCardPool = (characterId: string | null | undefined): AbilityCard[] => {
    if (!characterId) return [];
    return HEROES_DATA[characterId]?.cards ?? [];
};

const appendCardToHand = (
    core: DiceThroneCore,
    playerId: string,
    card: AbilityCard,
): DiceThroneCore => {
    const player = core.players[playerId];
    if (!player) return core;

    return {
        ...core,
        players: {
            ...core.players,
            [playerId]: {
                ...player,
                hand: [...player.hand, cloneAbilityCard(card)],
            },
        },
    };
};

export const diceThroneCheatModifier: CheatResourceModifier<DiceThroneCore> = {
    getResource: (core, playerId, resourceId) => {
        return core.players[playerId]?.resources[resourceId];
    },
    setResource: (core, playerId, resourceId, value) => {
        const player = core.players[playerId];
        if (!player) return core;
        return {
            ...core,
            players: {
                ...core.players,
                [playerId]: {
                    ...player,
                    resources: {
                        ...player.resources,
                        [resourceId]: value,
                    },
                },
            },
        };
    },
    setStatus: (core, playerId, statusId, amount) => {
        const player = core.players[playerId];
        if (!player) return core;
        return {
            ...core,
            players: {
                ...core.players,
                [playerId]: {
                    ...player,
                    statusEffects: {
                        ...player.statusEffects,
                        [statusId]: amount,
                    },
                },
            },
        };
    },
    setPhase: (core, _phase) => {
        // 阶段现由 sys.phase 管理，core 不再存储 turnPhase
        return core;
    },
    setDice: (core, values) => {
        let nextCore: DiceThroneCore = {
            ...core,
            dice: applyDiceValues(core.dice, values),
            rollCount: core.rollCount || 1, // 确保至少有一次 roll
            rollConfirmed: false, // 允许用户重新确认
        };

        if (core.currentRollContext) {
            nextCore = setCurrentRollContextDice(
                nextCore,
                applyDiceValues(core.currentRollContext.dice, values),
            );
        }

        const isCurrentBonusRoll = core.currentRollContext?.kind === 'bonus'
            || (!core.currentRollContext && Boolean(core.pendingBonusDiceSettlement));
        if (isCurrentBonusRoll && core.pendingBonusDiceSettlement) {
            nextCore = {
                ...nextCore,
                pendingBonusDiceSettlement: {
                    ...core.pendingBonusDiceSettlement,
                    dice: core.pendingBonusDiceSettlement.dice.map((die, index) => ({
                        ...die,
                        value: values[index] ?? die.value,
                        effectParams: {
                            ...die.effectParams,
                            value: values[index] ?? die.value,
                        },
                    })),
                },
            };
        }

        return nextCore;
    },
    setToken: (core, playerId, tokenId, amount) => {
        const player = core.players[playerId];
        if (!player) return core;
        return {
            ...core,
            players: {
                ...core.players,
                [playerId]: {
                    ...player,
                    tokens: {
                        ...player.tokens,
                        [tokenId]: amount,
                    },
                },
            },
        };
    },
    dealCardByIndex: (core, playerId, deckIndex) => {
        const player = core.players[playerId];
        if (!player || deckIndex < 0 || deckIndex >= player.deck.length) return core;

        // 从牌库指定位置取出卡牌
        const newDeck = [...player.deck];
        const [card] = newDeck.splice(deckIndex, 1);

        return {
            ...core,
            players: {
                ...core.players,
                [playerId]: {
                    ...player,
                    deck: newDeck,
                    hand: [...player.hand, card],
                },
            },
        };
    },
    dealCardByAtlasIndex: (core, playerId, atlasIndex) => {
        const player = core.players[playerId];
        if (!player) return core;

        const matchedDeckEntries = player.deck
            .map((card, deckIndex) => ({ card, deckIndex }))
            .filter(({ card }) => getCardSourceAtlasIndex(card) === atlasIndex);
        if (matchedDeckEntries.length > 1) return core;
        if (matchedDeckEntries.length === 1) {
            const newDeck = [...player.deck];
            const [{ deckIndex }] = matchedDeckEntries;
            const [card] = newDeck.splice(deckIndex, 1);

            return {
                ...core,
                players: {
                    ...core.players,
                    [playerId]: {
                        ...player,
                        deck: newDeck,
                        hand: [...player.hand, card],
                    },
                },
            };
        }

        // 调试模式允许从角色完整卡池直接补牌，不受“当前剩余牌库”限制。
        const matchedPoolCards = getHeroCardPool(player.characterId)
            .filter((card) => getCardSourceAtlasIndex(card) === atlasIndex);
        if (matchedPoolCards.length !== 1) return core;

        return appendCardToHand(core, playerId, matchedPoolCards[0]);
    },
    addCardToHandByCardId: (core, playerId, cardId) => {
        const player = core.players[playerId];
        if (!player) return core;

        const card = getHeroCardPool(player.characterId).find((entry) => entry.id === cardId);
        if (!card) return core;

        return appendCardToHand(core, playerId, card);
    },
};
