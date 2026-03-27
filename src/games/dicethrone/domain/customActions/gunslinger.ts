import { createBonusDiceWithReroll, createDisplayOnlySettlement, registerCustomActionHandler, type CustomActionContext } from '../effects';
import { registerChoiceResolvedEventHandler } from '../choiceResolvedEvents';
import { GUNSLINGER_DICE_FACE_IDS, STATUS_IDS, TOKEN_IDS } from '../ids';
import { getPlayerDieFace } from '../rules';
import { RESOURCE_IDS } from '../resources';
import { CP_MAX } from '../types';
import type {
    BonusDamageAddedEvent,
    ChoiceRequestedEvent,
    CpChangedEvent,
    DamageShieldGrantedEvent,
    DiceThroneEvent,
    StatusAppliedEvent,
} from '../events';
import { createDamageCalculation } from '../../../../engine/primitives/damageCalculation';

function createLoadedChoiceContext(
    state: CustomActionContext['state'],
    attackerId: string,
    sourceAbilityId: string,
    timestamp: number,
    random: CustomActionContext['random'],
): CustomActionContext {
    return {
        ctx: {
            attackerId,
            defenderId: state.pendingAttack?.defenderId ?? attackerId,
            sourceAbilityId,
            state,
            damageDealt: 0,
            timestamp,
        },
        targetId: state.pendingAttack?.defenderId ?? attackerId,
        attackerId,
        sourceAbilityId,
        state,
        timestamp,
        random,
        action: { type: 'custom', target: 'self', customActionId: 'gunslinger-loaded-use' },
    };
}

function handleLoadedUse({ attackerId, sourceAbilityId, state, timestamp, random }: CustomActionContext): DiceThroneEvent[] {
    if (!random) return [];

    const quickDrawLevel = state.players[attackerId]?.abilityLevels?.['quick-draw'] ?? 1;
    const canReroll = sourceAbilityId === 'fill-em-with-lead' || quickDrawLevel >= 2;

    if (canReroll) {
        return createBonusDiceWithReroll(
            createLoadedChoiceContext(state, attackerId, sourceAbilityId, timestamp, random),
            {
                diceCount: 1,
                rerollCostTokenId: TOKEN_IDS.LOADED,
                rerollCostAmount: 0,
                maxRerollCount: 1,
                dieEffectKey: 'bonusDie.effect.gunslingerLoadedDie',
                rerollEffectKey: 'bonusDie.effect.gunslingerLoadedReroll',
                showTotal: false,
                resolutionMode: 'attackBonus',
                attackBonusScale: 'halfUp',
            },
            () => [],
        );
    }

    const roll = random.d(6);
    const bonusDamage = Math.ceil(roll / 2);

    return [{
        type: 'BONUS_DAMAGE_ADDED',
        payload: {
            playerId: attackerId,
            amount: bonusDamage,
            sourceCardId: sourceAbilityId,
        },
        sourceCommandType: 'ABILITY_EFFECT',
        timestamp,
    } as BonusDamageAddedEvent];
}

function handleBountyReward({ attackerId, sourceAbilityId, state, timestamp }: CustomActionContext): DiceThroneEvent[] {
    const currentCp = state.players[attackerId]?.resources[RESOURCE_IDS.CP] ?? 0;
    const newValue = Math.min(currentCp + 1, CP_MAX);
    if (newValue === currentCp) {
        return [];
    }

    return [{
        type: 'CP_CHANGED',
        payload: {
            playerId: attackerId,
            delta: 1,
            newValue,
            sourceAbilityId,
        },
        sourceCommandType: 'ABILITY_EFFECT',
        timestamp,
    } as CpChangedEvent];
}

function handleShowdownBonus({ attackerId, sourceAbilityId, timestamp, random, action }: CustomActionContext): DiceThroneEvent[] {
    if (!random) return [];

    const attackerRoll = random.d(6);
    const defenderRoll = random.d(6);
    if (attackerRoll < defenderRoll) {
        return [];
    }

    const amount = typeof action.params?.bonusDamageOnWin === 'number'
        ? action.params.bonusDamageOnWin
        : 2;

    return [{
        type: 'BONUS_DAMAGE_ADDED',
        payload: {
            playerId: attackerId,
            amount,
            sourceCardId: sourceAbilityId,
        },
        sourceCommandType: 'ABILITY_EFFECT',
        timestamp,
    } as BonusDamageAddedEvent];
}

function handleDuelResolve({ sourceAbilityId, state, timestamp, random, action }: CustomActionContext): DiceThroneEvent[] {
    if (!random) return [];

    const defenderRoll = state.dice[0]?.value ?? 1;
    const attackerRoll = random.d(6);
    const originalAttackerId = state.pendingAttack?.attackerId;
    const originalDefenderId = state.pendingAttack?.defenderId;
    if (!originalAttackerId || !originalDefenderId) return [];

    const winOnTie = action.params?.winOnTie === true;
    const duelWon = winOnTie ? defenderRoll >= attackerRoll : defenderRoll > attackerRoll;

    if (duelWon) {
        return [{
            type: 'CHOICE_REQUESTED',
            payload: {
                playerId: originalDefenderId,
                sourceAbilityId,
                titleKey: 'choices.gunslingerDuel.title',
                options: [
                    { value: 3, customId: 'gunslinger-duel-deal-3', labelKey: 'choices.gunslingerDuel.deal3' },
                    { value: 50, customId: 'gunslinger-duel-prevent-half', labelKey: 'choices.gunslingerDuel.preventHalf' },
                ],
            },
            sourceCommandType: 'ABILITY_EFFECT',
            timestamp,
        } as ChoiceRequestedEvent];
    }

    const damageCalc = createDamageCalculation({
        source: { playerId: originalDefenderId, abilityId: sourceAbilityId },
        target: { playerId: originalAttackerId },
        baseDamage: 1,
        state,
        timestamp,
    });
    return damageCalc.toEvents() as DiceThroneEvent[];
}

function handleWildWest({ attackerId, sourceAbilityId, state, timestamp, random, action }: CustomActionContext): DiceThroneEvent[] {
    const events: DiceThroneEvent[] = [{
        type: 'BONUS_DAMAGE_ADDED',
        payload: {
            playerId: attackerId,
            amount: 1,
            sourceCardId: sourceAbilityId,
        },
        sourceCommandType: 'ABILITY_EFFECT',
        timestamp,
    } as BonusDamageAddedEvent];

    if (!random) return events;

    return events.concat(createBonusDiceWithReroll(
        {
            ctx: {
                attackerId,
                defenderId: state.pendingAttack?.defenderId ?? attackerId,
                sourceAbilityId,
                state,
                damageDealt: 0,
                timestamp,
            },
            targetId: state.pendingAttack?.defenderId ?? attackerId,
            attackerId,
            sourceAbilityId,
            state,
            timestamp,
            random,
            action,
        },
        {
            diceCount: 1,
            rerollCostTokenId: TOKEN_IDS.LOADED,
            rerollCostAmount: 1,
            maxRerollCount: 1,
            dieEffectKey: 'bonusDie.effect.gunslingerLoadedDie',
            rerollEffectKey: 'bonusDie.effect.gunslingerLoadedReroll',
            showTotal: false,
            resolutionMode: 'none',
        },
        () => [],
    ));
}

function handleEatMyLead({ attackerId, sourceAbilityId, state, timestamp, random }: CustomActionContext): DiceThroneEvent[] {
    if (!random) return [];

    const dice = Array.from({ length: 5 }, (_, index) => {
        const value = random.d(6);
        const face = getPlayerDieFace(state, attackerId, value) ?? '';
        return { index, value, face, effectKey: 'bonusDie.effect.gunslingerEatMyLeadDie' };
    });

    const bonusDamage = dice.filter(die => die.face === GUNSLINGER_DICE_FACE_IDS.BULLET).length;
    const events: DiceThroneEvent[] = [];

    for (const die of dice) {
        events.push({
            type: 'BONUS_DIE_ROLLED',
            payload: {
                value: die.value,
                face: die.face,
                playerId: attackerId,
                targetPlayerId: state.pendingAttack?.defenderId ?? attackerId,
                effectKey: die.effectKey,
                effectParams: { value: die.value, index: die.index },
            },
            sourceCommandType: 'ABILITY_EFFECT',
            timestamp: timestamp + die.index,
        } as DiceThroneEvent);
    }

    events.push(createDisplayOnlySettlement(
        sourceAbilityId,
        attackerId,
        state.pendingAttack?.defenderId ?? attackerId,
        dice,
        timestamp + 10,
    ));

    if (bonusDamage > 0) {
        events.push({
            type: 'BONUS_DAMAGE_ADDED',
            payload: {
                playerId: attackerId,
                amount: bonusDamage,
                sourceCardId: sourceAbilityId,
            },
            sourceCommandType: 'ABILITY_EFFECT',
            timestamp: timestamp + 11,
        } as BonusDamageAddedEvent);
    }

    if (bonusDamage > 4 && state.pendingAttack?.defenderId) {
        const defenderId = state.pendingAttack.defenderId;
        const currentStacks = state.players[defenderId]?.statusEffects[STATUS_IDS.KNOCKDOWN] ?? 0;
        events.push({
            type: 'STATUS_APPLIED',
            payload: {
                targetId: defenderId,
                statusId: STATUS_IDS.KNOCKDOWN,
                stacks: 1,
                newTotal: Math.min(currentStacks + 1, 1),
                sourceAbilityId,
            },
            sourceCommandType: 'ABILITY_EFFECT',
            timestamp: timestamp + 12,
        } as StatusAppliedEvent);
    }

    return events;
}

export function registerGunslingerCustomActions(): void {
    registerCustomActionHandler('gunslinger-loaded-use', handleLoadedUse, {
        categories: ['token', 'dice'],
    });
    registerCustomActionHandler('gunslinger-bounty-reward', handleBountyReward, {
        categories: ['token', 'resource', 'passive'],
    });
    registerCustomActionHandler('gunslinger-showdown-bonus', handleShowdownBonus, {
        categories: ['dice'],
    });
    registerCustomActionHandler('gunslinger-duel-resolve', handleDuelResolve, {
        categories: ['choice', 'damage', 'defense'],
        phases: ['defensiveRoll'],
    });
    registerCustomActionHandler('gunslinger-card-wild-west', handleWildWest, {
        categories: ['card', 'dice'],
    });
    registerCustomActionHandler('gunslinger-card-eat-my-lead', handleEatMyLead, {
        categories: ['card', 'dice', 'status'],
    });

    registerChoiceResolvedEventHandler('gunslinger-duel-deal-3', ({ state, playerId, sourceAbilityId, timestamp }) => {
        const originalAttackerId = state.pendingAttack?.attackerId;
        if (!originalAttackerId) return [];

        const damageCalc = createDamageCalculation({
            source: { playerId, abilityId: sourceAbilityId },
            target: { playerId: originalAttackerId },
            baseDamage: 3,
            state,
            timestamp,
        });
        return damageCalc.toEvents() as DiceThroneEvent[];
    });

    registerChoiceResolvedEventHandler('gunslinger-duel-prevent-half', ({ playerId, sourceAbilityId, timestamp }) => ([{
        type: 'DAMAGE_SHIELD_GRANTED',
        payload: {
            targetId: playerId,
            value: 0,
            reductionPercent: 50,
            sourceId: sourceAbilityId ?? 'duel',
            preventStatus: false,
        },
        sourceCommandType: 'ABILITY_EFFECT',
        timestamp,
    } as DamageShieldGrantedEvent]));

    registerChoiceResolvedEventHandler('use-loaded', ({ state, playerId, sourceAbilityId, timestamp, random }) => (
        handleLoadedUse(createLoadedChoiceContext(state, playerId, sourceAbilityId ?? state.pendingAttack?.sourceAbilityId ?? 'token-use', timestamp, random))
    ));
}
