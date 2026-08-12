import { describe, expect, it } from 'vitest';
import { CHARACTER_DATA_MAP } from '../domain/characters';
import {
    getPlayableCardsInResponseWindow,
    checkPlayCard,
    hasExistingDiceToolEffect,
} from '../domain/rules';
import { RESOURCE_IDS } from '../domain/resources';
import { TOKEN_IDS } from '../domain/ids';
import { cmd, createHeroMatchup, createRunner, fixedRandom } from './test-utils';

const getAllDistinctCards = () => {
    const cards = Object.values(CHARACTER_DATA_MAP)
        .flatMap((character) => character.getStartingDeck(fixedRandom));
    return [...new Map(cards.map((card) => [card.id, card])).values()];
};

describe('DiceThrone 即时行动牌与响应窗口边界', () => {
    const allCards = getAllDistinctCards();
    const instantActions = allCards.filter((card) => card.type === 'action' && card.timing === 'instant');
    const damageResponseCards = allCards.filter((card) => (
        card.playCondition?.pendingDamage !== undefined
        || (card.timing === 'roll' && card.playCondition?.requireMinDamageDealt !== undefined)
    ));

    const prepareState = () => {
        const state = createHeroMatchup('monk', 'barbarian')(['0', '1'], fixedRandom);
        state.core.players['0'].hand = [];
        state.core.players['1'].resources[RESOURCE_IDS.CP] = 99;
        state.core.players['0'].tokens[TOKEN_IDS.ACCURACY] = 1;
        state.core.activePlayerId = '0';
        state.core.turnPhase = 'offensiveRoll';
        state.core.rollCount = 1;
        state.core.rollConfirmed = true;
        state.core.pendingAttack = {
            attackerId: '0',
            defenderId: '1',
            sourceAbilityId: 'fist-technique',
            isDefendable: true,
        } as typeof state.core.pendingAttack;
        return state;
    };

    it('整副即时行动牌都有明确时机归属，确认骰面窗口只列直接改骰牌', () => {
        const state = prepareState();
        state.core.players['1'].hand = instantActions;

        const afterRollIds = getPlayableCardsInResponseWindow(
            state.core,
            '1',
            'afterRollConfirmed',
            'offensiveRoll',
        ).map((card) => card.id);

        // 其他即时牌可能自己投出一颗奖励骰、获得资源、施加状态或打开选择，
        // 但都不能借此混入“修改已确认骰子”的响应窗口。
        expect(afterRollIds).toEqual(['card-flick']);
        expect(instantActions.map((card) => card.id)).toEqual(expect.arrayContaining([
            'card-lucky',
            'card-artificer-perfectly-calibrated',
            'card-bye-bye',
            'card-next-time',
        ]));
    });

    it('所有应响应的改骰牌仍完整保留，且只能改自己骰子的牌不会错误加入对手响应', () => {
        const state = prepareState();
        state.core.players['1'].hand = allCards;

        const afterRollIds = getPlayableCardsInResponseWindow(
            state.core,
            '1',
            'afterRollConfirmed',
            'offensiveRoll',
        ).map((card) => card.id).sort();

        const directDiceToolIds = allCards
            .filter(hasExistingDiceToolEffect)
            .map((card) => card.id)
            .sort();

        expect(directDiceToolIds).toEqual([
            'card-flick',
            'card-give-hand',
            'card-i-can-again',
            'card-just-this',
            'card-me-too',
            'card-play-six',
            'card-surprise',
            'card-unexpected',
            'card-worthy-of-me',
        ]);
        expect(afterRollIds).toEqual([
            'card-flick',
            'card-give-hand',
            'card-surprise',
            'card-unexpected',
        ]);
    });

    it('任意时机即时行动牌在对方普通回合仍能通过领域校验', () => {
        const state = prepareState();
        const anytimeCards = instantActions.filter((card) => (
            card.id !== 'card-flick'
            && card.playCondition?.pendingDamage === undefined
            && card.playCondition?.phase === undefined
        ));

        for (const card of anytimeCards) {
            expect(
                checkPlayCard(state.core, '1', card, 'main1'),
                `${card.id} 应可在对方普通回合按即时行动打出`,
            ).toEqual({ ok: true });
        }
    });

    it('非当前回合玩家实际打出拜拜了您嘞时，卡牌会离手并完成移除状态', () => {
        const runner = createRunner(fixedRandom);
        const result = runner.run({
            name: '非当前回合玩家打出拜拜了您嘞',
            setup: (playerIds, random) => {
                const state = createHeroMatchup('monk', 'barbarian')(playerIds, random);
                state.sys.phase = 'main1';
                state.core.activePlayerId = '0';
                state.core.players['0'].tokens[TOKEN_IDS.ACCURACY] = 1;
                state.core.players['1'].hand = [allCards.find((card) => card.id === 'card-bye-bye')!];
                state.core.players['1'].resources[RESOURCE_IDS.CP] = 2;
                return state;
            },
            commands: [
                cmd('PLAY_CARD', '1', { cardId: 'card-bye-bye' }),
                cmd('REMOVE_STATUS', '1', { targetPlayerId: '0', statusId: TOKEN_IDS.ACCURACY }),
            ],
        });

        expect(result.assertionErrors).toEqual([]);
        expect(result.finalState.core.players['1'].discard.map((card) => card.id)).toContain('card-bye-bye');
        expect(result.finalState.core.players['0'].tokens[TOKEN_IDS.ACCURACY]).toBe(0);
    });

    it('受伤响应牌仍只在伤害窗口放行，未被改骰窗口收紧影响', () => {
        const state = prepareState();
        state.core.pendingDamage = {
            id: 'instant-response-damage',
            sourcePlayerId: '0',
            targetPlayerId: '1',
            originalDamage: 10,
            currentDamage: 10,
            responseType: 'beforeDamageReceived',
            responderId: '1',
            isFullyEvaded: false,
        } as typeof state.core.pendingDamage;
        state.core.lastResolvedAttackDamage = 10;

        expect(damageResponseCards.map((card) => card.id)).toEqual(expect.arrayContaining([
            'card-next-time',
            'ninja-card-escape',
            'card-artificer-mechanical-strike',
            'upgrade-artificer-shock-bot-2',
            'card-dizzy',
        ]));

        for (const card of damageResponseCards) {
            expect(
                checkPlayCard(state.core, '1', card, 'main2', 'afterAttackResolved'),
                `${card.id} 应继续在伤害响应窗口可用`,
            ).toEqual({ ok: true });
            expect(
                checkPlayCard(state.core, '1', card, 'offensiveRoll', 'afterRollConfirmed'),
                `${card.id} 不能被错误放进改骰响应窗口`,
            ).toEqual({ ok: false, reason: 'wrongPhaseForCard' });
        }
    });
});
