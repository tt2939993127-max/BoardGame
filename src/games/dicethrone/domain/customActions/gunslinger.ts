import { createBonusDiceWithReroll, createDisplayOnlySettlement, registerCustomActionHandler, resolveEffectsToEvents, type CustomActionContext } from '../effects';
import { registerChoiceResolvedEventHandler } from '../choiceResolvedEvents';
import { GUNSLINGER_DICE_FACE_IDS, STATUS_IDS, TOKEN_IDS } from '../ids';
import { getOpponents, getPlayerDieFace, getTokenStackLimit } from '../rules';
import { RESOURCE_IDS } from '../resources';
import { CP_MAX } from '../types';
import type { PendingInteraction } from '../core-types';
import type {
    BonusDamageAddedEvent,
    CompareRollRequestedEvent,
    CpChangedEvent,
    DamageDealtEvent,
    DamageShieldGrantedEvent,
    DiceThroneEvent,
    InteractionRequestedEvent,
    StatusAppliedEvent,
} from '../events';
import { createDamageCalculation } from '../../../../engine/primitives/damageCalculation';

function createCompareRollEvent(params: {
    playerId: string;
    sourceAbilityId: string;
    titleKey: string;
    contestants: Array<{
        playerId: string;
        labelKey: string;
        roll: number;
        face?: string;
        characterId?: string;
        effectKey: string;
        effectParams: Record<string, string | number>;
    }>;
    resultKey: string;
    resultParams?: Record<string, string | number>;
    resultTone?: 'neutral' | 'success' | 'warning' | 'danger';
    options?: Array<{
        value: number;
        customId?: string;
        labelKey?: string;
        disabled?: boolean;
    }>;
    confirmValue?: {
        value: number;
        customId?: string;
    };
    autoConfirmDelayMs?: number;
    timestamp: number;
}): CompareRollRequestedEvent {
    return {
        type: 'COMPARE_ROLL_REQUESTED',
        payload: {
            playerId: params.playerId,
            sourceAbilityId: params.sourceAbilityId,
            titleKey: params.titleKey,
            contestants: params.contestants,
            resultKey: params.resultKey,
            resultParams: params.resultParams,
            resultTone: params.resultTone,
            options: params.options,
            confirmValue: params.confirmValue,
            autoConfirmDelayMs: params.autoConfirmDelayMs,
        },
        sourceCommandType: 'ABILITY_EFFECT',
        timestamp: params.timestamp,
    };
}

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

function handleShowdownBonus({ attackerId, sourceAbilityId, state, timestamp, random, action }: CustomActionContext): DiceThroneEvent[] {
    if (!random) return [];

    const attackerRoll = random.d(6);
    const defenderRoll = random.d(6);
    const amount = typeof action.params?.bonusDamageOnWin === 'number'
        ? action.params.bonusDamageOnWin
        : 2;
    const defenderId = state.pendingAttack?.defenderId;
    if (!defenderId) {
        return [];
    }

    return [createCompareRollEvent({
        playerId: attackerId,
        sourceAbilityId,
        titleKey: 'compareRoll.gunslinger.showdown.title',
        contestants: [
            {
                playerId: attackerId,
                labelKey: 'compareRoll.gunslinger.showdown.attackerLabel',
                roll: attackerRoll,
                face: getPlayerDieFace(state, attackerId, attackerRoll) ?? undefined,
                characterId: state.players[attackerId]?.characterId,
                effectKey: 'compareRoll.rolled',
                effectParams: { value: attackerRoll },
            },
            {
                playerId: defenderId,
                labelKey: 'compareRoll.gunslinger.showdown.defenderLabel',
                roll: defenderRoll,
                face: getPlayerDieFace(state, defenderId, defenderRoll) ?? undefined,
                characterId: state.players[defenderId]?.characterId,
                effectKey: 'compareRoll.rolled',
                effectParams: { value: defenderRoll },
            },
        ],
        resultKey: attackerRoll >= defenderRoll
            ? 'compareRoll.gunslinger.showdown.win'
            : 'compareRoll.gunslinger.showdown.lose',
        resultParams: attackerRoll >= defenderRoll ? { bonus: amount } : undefined,
        resultTone: attackerRoll >= defenderRoll ? 'success' : 'neutral',
        confirmValue: attackerRoll >= defenderRoll
            ? { value: amount, customId: 'gunslinger-showdown-apply-bonus' }
            : undefined,
        autoConfirmDelayMs: 1500,
        timestamp,
    })];
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

    return [createCompareRollEvent({
        playerId: originalDefenderId,
        sourceAbilityId,
        titleKey: 'compareRoll.gunslinger.duel.title',
        contestants: [
            {
                playerId: originalDefenderId,
                labelKey: 'compareRoll.gunslinger.duel.defenderLabel',
                roll: defenderRoll,
                face: getPlayerDieFace(state, originalDefenderId, defenderRoll) ?? undefined,
                characterId: state.players[originalDefenderId]?.characterId,
                effectKey: 'compareRoll.rolled',
                effectParams: { value: defenderRoll },
            },
            {
                playerId: originalAttackerId,
                labelKey: 'compareRoll.gunslinger.duel.attackerLabel',
                roll: attackerRoll,
                face: getPlayerDieFace(state, originalAttackerId, attackerRoll) ?? undefined,
                characterId: state.players[originalAttackerId]?.characterId,
                effectKey: 'compareRoll.rolled',
                effectParams: { value: attackerRoll },
            },
        ],
        resultKey: duelWon
            ? 'compareRoll.gunslinger.duel.win'
            : 'compareRoll.gunslinger.duel.lose',
        resultTone: duelWon ? 'success' : 'warning',
        options: duelWon
            ? [
                { value: 3, customId: 'gunslinger-duel-deal-3', labelKey: 'choices.gunslingerDuel.deal3' },
                { value: 50, customId: 'gunslinger-duel-prevent-half', labelKey: 'choices.gunslingerDuel.preventHalf' },
            ]
            : undefined,
        confirmValue: duelWon
            ? undefined
            : { value: 1, customId: 'gunslinger-duel-lose-damage' },
        autoConfirmDelayMs: duelWon ? undefined : 1500,
        timestamp,
    })];
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

function createKnockdownEvent(
    state: CustomActionContext['state'],
    targetId: string,
    sourceAbilityId: string,
    timestamp: number,
): StatusAppliedEvent {
    const currentStacks = state.players[targetId]?.statusEffects[STATUS_IDS.KNOCKDOWN] ?? 0;
    return {
        type: 'STATUS_APPLIED',
        payload: {
            targetId,
            statusId: STATUS_IDS.KNOCKDOWN,
            stacks: 1,
            newTotal: Math.min(currentStacks + 1, 1),
            sourceAbilityId,
        },
        sourceCommandType: 'ABILITY_EFFECT',
        timestamp,
    } as StatusAppliedEvent;
}

function createBountyEvent(
    state: CustomActionContext['state'],
    targetId: string,
    sourceAbilityId: string,
    timestamp: number,
): DiceThroneEvent {
    const currentBounty = state.players[targetId]?.tokens[TOKEN_IDS.BOUNTY] ?? 0;
    const newBountyTotal = Math.min(currentBounty + 1, getTokenStackLimit(state, targetId, TOKEN_IDS.BOUNTY));
    return {
        type: 'TOKEN_GRANTED',
        payload: {
            targetId,
            tokenId: TOKEN_IDS.BOUNTY,
            amount: Math.max(0, newBountyTotal - currentBounty),
            newTotal: newBountyTotal,
            sourceAbilityId,
        },
        sourceCommandType: 'ABILITY_EFFECT',
        timestamp,
    } as DiceThroneEvent;
}

function createSingleOpponentInteraction(
    state: CustomActionContext['state'],
    attackerId: string,
    sourceAbilityId: string,
    timestamp: number,
    resolveCustomActionId: string,
): InteractionRequestedEvent | null {
    const opponentIds = getOpponents(state, attackerId);
    if (opponentIds.length <= 1) {
        return null;
    }

    const interaction: PendingInteraction = {
        id: `${sourceAbilityId}-${timestamp}`,
        playerId: attackerId,
        sourceCardId: sourceAbilityId,
        type: 'selectPlayer',
        titleKey: 'interaction.selectPlayer',
        selectCount: 1,
        selected: [],
        targetPlayerIds: opponentIds,
        resolveCustomActionId,
    };

    return {
        type: 'INTERACTION_REQUESTED',
        payload: { interaction },
        sourceCommandType: 'ABILITY_EFFECT',
        timestamp,
    } as InteractionRequestedEvent;
}

function createUnblockableDamageEvent(
    state: CustomActionContext['state'],
    targetId: string,
    amount: number,
    sourceAbilityId: string,
    timestamp: number,
): DamageDealtEvent {
    const hp = state.players[targetId]?.resources[RESOURCE_IDS.HP] ?? 0;
    return {
        type: 'DAMAGE_DEALT',
        payload: {
            targetId,
            amount,
            actualDamage: Math.min(amount, hp),
            sourceAbilityId,
            unblockable: true,
        },
        sourceCommandType: 'ABILITY_EFFECT',
        timestamp,
    } as DamageDealtEvent;
}

function resolveSingleOpponentCard(
    ctx: CustomActionContext,
    resolveCustomActionId: string,
    resolveDirect: (targetId: string, context: CustomActionContext) => DiceThroneEvent[],
): DiceThroneEvent[] {
    const interactionEvent = createSingleOpponentInteraction(
        ctx.state,
        ctx.attackerId,
        ctx.sourceAbilityId,
        ctx.timestamp,
        resolveCustomActionId,
    );
    if (interactionEvent) {
        return [interactionEvent];
    }

    const targetId = getOpponents(ctx.state, ctx.attackerId)[0];
    if (!targetId) {
        return [];
    }
    return resolveDirect(targetId, ctx);
}

function handleMarkTheTarget(ctx: CustomActionContext): DiceThroneEvent[] {
    return resolveSingleOpponentCard(ctx, 'gunslinger-card-mark-the-target-resolve', (targetId, { state, sourceAbilityId, timestamp }) => ([
        createBountyEvent(state, targetId, sourceAbilityId, timestamp),
    ]));
}

function handleMarkTheTargetResolve({ targetId, state, sourceAbilityId, timestamp }: CustomActionContext): DiceThroneEvent[] {
    return [createBountyEvent(state, targetId, sourceAbilityId, timestamp)];
}

function handleWanted(ctx: CustomActionContext): DiceThroneEvent[] {
    return resolveSingleOpponentCard(ctx, 'gunslinger-card-wanted-resolve', (targetId, { state, sourceAbilityId, timestamp }) => ([
        createBountyEvent(state, targetId, sourceAbilityId, timestamp),
    ]));
}

function handleWantedResolve({ targetId, state, sourceAbilityId, timestamp }: CustomActionContext): DiceThroneEvent[] {
    return [createBountyEvent(state, targetId, sourceAbilityId, timestamp)];
}

function handlePistolWhip(ctx: CustomActionContext): DiceThroneEvent[] {
    return resolveSingleOpponentCard(ctx, 'gunslinger-card-pistol-whip-resolve', (targetId, context) => (
        handlePistolWhipResolve({ ...context, targetId, ctx: { ...context.ctx, defenderId: targetId } })
    ));
}

function handlePistolWhipResolve({ attackerId, targetId, state, sourceAbilityId, timestamp }: CustomActionContext): DiceThroneEvent[] {
    return resolveEffectsToEvents([
        {
            description: '对手获得击倒。',
            action: { type: 'grantStatus', target: 'opponent', statusId: STATUS_IDS.KNOCKDOWN, value: 1 },
            timing: 'immediate',
        },
        {
            description: '造成 1 点不可防御伤害。',
            action: { type: 'damage', target: 'opponent', value: 1, unblockable: true },
            timing: 'immediate',
        },
    ], 'immediate', {
        attackerId,
        defenderId: targetId,
        sourceAbilityId,
        state,
        damageDealt: 0,
        timestamp,
    });
}

function handleHighNoon(ctx: CustomActionContext): DiceThroneEvent[] {
    return resolveSingleOpponentCard(ctx, 'gunslinger-card-high-noon-resolve', (targetId, context) => (
        handleHighNoonResolve({ ...context, targetId, ctx: { ...context.ctx, defenderId: targetId } })
    ));
}

function handleHighNoonResolve({ attackerId, targetId, sourceAbilityId, state, timestamp, random }: CustomActionContext): DiceThroneEvent[] {
    if (!random) {
        return [];
    }

    const value = random.d(6);
    const face = getPlayerDieFace(state, attackerId, value) ?? GUNSLINGER_DICE_FACE_IDS.BULLET;
    const effectKeyMap: Record<string, string> = {
        [GUNSLINGER_DICE_FACE_IDS.BULLET]: 'bonusDie.effect.gunslingerHighNoonBullet',
        [GUNSLINGER_DICE_FACE_IDS.DASH]: 'bonusDie.effect.gunslingerHighNoonDash',
        [GUNSLINGER_DICE_FACE_IDS.BULLSEYE]: 'bonusDie.effect.gunslingerHighNoonBullseye',
    };
    const effectKey = effectKeyMap[face] ?? 'bonusDie.effect.default';

    const events: DiceThroneEvent[] = [{
        type: 'BONUS_DIE_ROLLED',
        payload: {
            value,
            face,
            playerId: targetId,
            targetPlayerId: targetId,
            effectKey,
        },
        sourceCommandType: 'ABILITY_EFFECT',
        timestamp,
    } as DiceThroneEvent];

    events.push(createDisplayOnlySettlement(
        sourceAbilityId,
        targetId,
        targetId,
        [{ index: 0, value, face, effectKey }],
        timestamp + 1,
    ));

    if (face === GUNSLINGER_DICE_FACE_IDS.BULLET) {
        events.push(createUnblockableDamageEvent(state, targetId, 2, sourceAbilityId, timestamp + 2));
        return events;
    }

    if (face === GUNSLINGER_DICE_FACE_IDS.DASH) {
        events.push(createKnockdownEvent(state, targetId, sourceAbilityId, timestamp + 2));
        return events;
    }

    events.push(createBountyEvent(state, targetId, sourceAbilityId, timestamp + 2));
    return events;
}

function handleTheLaw({ attackerId, sourceAbilityId, state, timestamp }: CustomActionContext): DiceThroneEvent[] {
    const opponentIds = getOpponents(state, attackerId);

    if (opponentIds.length <= 1) {
        const targetId = opponentIds[0];
        if (!targetId) return [];

        const currentBounty = state.players[targetId]?.tokens[TOKEN_IDS.BOUNTY] ?? 0;
        const newBountyTotal = Math.min(currentBounty + 1, getTokenStackLimit(state, targetId, TOKEN_IDS.BOUNTY));
        return [
            {
                type: 'TOKEN_GRANTED',
                payload: {
                    targetId,
                    tokenId: TOKEN_IDS.BOUNTY,
                    amount: Math.max(0, newBountyTotal - currentBounty),
                    newTotal: newBountyTotal,
                    sourceAbilityId,
                },
                sourceCommandType: 'ABILITY_EFFECT',
                timestamp,
            } as DiceThroneEvent,
            createKnockdownEvent(state, targetId, sourceAbilityId, timestamp + 1),
        ];
    }

    const interaction: PendingInteraction = {
        id: `${sourceAbilityId}-${timestamp}`,
        playerId: attackerId,
        sourceCardId: sourceAbilityId,
        type: 'selectPlayer',
        titleKey: 'interaction.gunslingerTheLaw',
        selectCount: 2,
        selected: [],
        targetPlayerIds: opponentIds,
        tokenGrantConfig: { tokenId: TOKEN_IDS.BOUNTY, amount: 1 },
        statusGrantConfig: { statusId: STATUS_IDS.KNOCKDOWN, amount: 1 },
    };

    return [{
        type: 'INTERACTION_REQUESTED',
        payload: { interaction },
        sourceCommandType: 'ABILITY_EFFECT',
        timestamp,
    } as InteractionRequestedEvent];
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
        requiresSelectedDefender: true,
    });
    registerCustomActionHandler('gunslinger-card-eat-my-lead', handleEatMyLead, {
        categories: ['card', 'dice', 'status'],
        requiresSelectedDefender: true,
    });
    registerCustomActionHandler('gunslinger-card-pistol-whip', handlePistolWhip, {
        categories: ['card', 'status', 'damage'],
        requiresInteraction: true,
    });
    registerCustomActionHandler('gunslinger-card-pistol-whip-resolve', handlePistolWhipResolve, {
        categories: ['card', 'status', 'damage'],
    });
    registerCustomActionHandler('gunslinger-card-mark-the-target', handleMarkTheTarget, {
        categories: ['card', 'token'],
        requiresInteraction: true,
    });
    registerCustomActionHandler('gunslinger-card-mark-the-target-resolve', handleMarkTheTargetResolve, {
        categories: ['card', 'token'],
    });
    registerCustomActionHandler('gunslinger-card-wanted', handleWanted, {
        categories: ['card', 'token'],
        requiresInteraction: true,
    });
    registerCustomActionHandler('gunslinger-card-wanted-resolve', handleWantedResolve, {
        categories: ['card', 'token'],
    });
    registerCustomActionHandler('gunslinger-card-high-noon', handleHighNoon, {
        categories: ['card', 'token', 'status', 'damage', 'dice'],
        requiresInteraction: true,
    });
    registerCustomActionHandler('gunslinger-card-high-noon-resolve', handleHighNoonResolve, {
        categories: ['card', 'token', 'status', 'damage', 'dice'],
    });
    registerCustomActionHandler('gunslinger-card-the-law', handleTheLaw, {
        categories: ['card', 'token', 'status'],
        requiresInteraction: true,
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

    registerChoiceResolvedEventHandler('gunslinger-duel-lose-damage', ({ state, playerId, sourceAbilityId, timestamp }) => {
        const originalAttackerId = state.pendingAttack?.attackerId;
        if (!originalAttackerId) return [];

        const damageCalc = createDamageCalculation({
            source: { playerId, abilityId: sourceAbilityId },
            target: { playerId: originalAttackerId },
            baseDamage: 1,
            state,
            timestamp,
        });
        return damageCalc.toEvents() as DiceThroneEvent[];
    });

    registerChoiceResolvedEventHandler('gunslinger-showdown-apply-bonus', ({ playerId, sourceAbilityId, value, timestamp }) => ([{
        type: 'BONUS_DAMAGE_ADDED',
        payload: {
            playerId,
            amount: value,
            sourceCardId: sourceAbilityId,
        },
        sourceCommandType: 'ABILITY_EFFECT',
        timestamp,
    } as BonusDamageAddedEvent]));

    registerChoiceResolvedEventHandler('use-loaded', ({ state, playerId, sourceAbilityId, timestamp, random }) => (
        handleLoadedUse(createLoadedChoiceContext(state, playerId, sourceAbilityId ?? state.pendingAttack?.sourceAbilityId ?? 'token-use', timestamp, random))
    ));
}
