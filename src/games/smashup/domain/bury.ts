import type { MatchState, PlayerId, RandomFn } from '../../../engine/types';
import { createSimpleChoice, queueInteraction } from '../../../engine/systems/InteractionSystem';
import type {
    SmashUpCore,
    SmashUpEvent,
    BuriedCardOnBase,
    MinionPlayedEvent,
    ActionPlayedEvent,
    OngoingAttachedEvent,
} from './types';
import { SU_EVENTS } from './types';
import { registerInteractionHandler, type InteractionHandler } from './abilityInteractionHandlers';
import { getCardDef } from '../data/cards';
import { resolveOnPlay, resolveOnUncover, resolveSpecial } from './abilityRegistry';
import type { AbilityContext } from './abilityRegistry';
import { collectTriggers } from './ongoingEffects';
import { triggerBaseAbility } from './baseAbilities';

type UncoverChoiceValue = { cardUid: string; baseIndex: number } | { skip: true };

type BuildBuryCardEventsParams = {
    core: SmashUpCore;
    matchState?: MatchState<SmashUpCore>;
    playerId: PlayerId;
    cardUid: string;
    defId: string;
    baseIndex: number;
    trueOwnerId: PlayerId;
    buriedFrom: 'hand' | 'discard' | 'play' | 'deck';
    reason: string;
    random: RandomFn;
    now: number;
};

type UncoverBuriedCardParams = {
    matchState: MatchState<SmashUpCore>;
    playerId: PlayerId;
    cardUid: string;
    baseIndex: number;
    random: RandomFn;
    now: number;
    reason: string;
};

type ExecuteUncoveredActionParams = {
    matchState: MatchState<SmashUpCore>;
    playerId: PlayerId;
    buried: BuriedCardOnBase;
    baseIndex: number;
    random: RandomFn;
    now: number;
    targetMinionUid?: string;
};

export function registerBuryInteractionHandlers(): void {
    registerInteractionHandler('bury_uncover_start_turn', handleUncoverAtStartTurn);
    registerInteractionHandler('bury_uncover_ongoing_target', handleUncoverOngoingPickTargetMinion);
}

export function buildBuryCardEvents(params: BuildBuryCardEventsParams): SmashUpEvent[] {
    const buriedEvt: SmashUpEvent = {
        type: SU_EVENTS.CARD_BURIED,
        payload: {
            playerId: params.playerId,
            cardUid: params.cardUid,
            defId: params.defId,
            baseIndex: params.baseIndex,
            trueOwnerId: params.trueOwnerId,
            buriedFrom: params.buriedFrom,
            reason: params.reason,
        },
        timestamp: params.now,
    } as any;

    const events: SmashUpEvent[] = [buriedEvt];
    const queued = collectTriggers(params.core, 'onCardBuried', {
        state: params.core,
        matchState: params.matchState,
        playerId: params.playerId,
        baseIndex: params.baseIndex,
        buriedCardUid: params.cardUid,
        buriedCardDefId: params.defId,
        buriedCardControllerId: params.playerId,
        buriedFrom: params.buriedFrom,
        random: params.random,
        now: params.now,
    });
    if (queued) events.push(queued);
    return events;
}

export function uncoverBuriedCard(params: UncoverBuriedCardParams): {
    state: MatchState<SmashUpCore>;
    events: SmashUpEvent[];
} {
    const { matchState, playerId, cardUid, baseIndex, random, now, reason } = params;
    const base = matchState.core.bases[baseIndex];
    const buried = (base?.buriedCards ?? []).find(card => card.uid === cardUid);
    if (!base || !buried) return { state: matchState, events: [] };

    const def = getCardDef(buried.defId);
    if (!def) {
        return {
            state: matchState,
            events: [{
                type: SU_EVENTS.BURIED_CARD_UNCOVERED,
                payload: { playerId, cardUid, baseIndex, reason, discardWithoutPlay: true },
                timestamp: now,
            } as SmashUpEvent],
        };
    }

    const uncoverEvent: SmashUpEvent = {
        type: SU_EVENTS.BURIED_CARD_UNCOVERED,
        payload: { playerId, cardUid, baseIndex, reason },
        timestamp: now,
    } as any;
    const uncoverTriggers = collectTriggers(matchState.core, 'onBuriedCardUncovered', {
        state: matchState.core,
        matchState,
        playerId,
        baseIndex,
        buriedCardUid: buried.uid,
        buriedCardDefId: buried.defId,
        buriedCardControllerId: buried.controllerId,
        buriedFrom: buried.buriedFrom,
        random,
        now,
    });

    const onUncoverExecutor = resolveOnUncover(buried.defId);
    if (onUncoverExecutor) {
        const events: SmashUpEvent[] = [{
            type: SU_EVENTS.BURIED_CARD_UNCOVERED,
            payload: { playerId, cardUid, baseIndex, reason, discardWithoutPlay: true },
            timestamp: now,
        } as SmashUpEvent];
        const ctx: AbilityContext = {
            state: matchState.core,
            matchState,
            playerId,
            cardUid,
            defId: buried.defId,
            baseIndex,
            random,
            now,
        };
        const result = onUncoverExecutor(ctx);
        events.push(...result.events);
        if (uncoverTriggers) events.push(uncoverTriggers);
        return { state: result.matchState ?? matchState, events };
    }

    if (def.type === 'minion') {
        const played: MinionPlayedEvent = {
            type: SU_EVENTS.MINION_PLAYED,
            payload: {
                playerId,
                cardUid,
                defId: buried.defId,
                baseIndex,
                baseDefId: base.defId,
                power: (def as any).power ?? 0,
                fromBuried: true,
                consumesNormalLimit: false,
            },
            timestamp: now,
        };
        const events: SmashUpEvent[] = [uncoverEvent, played];
        if (uncoverTriggers) events.push(uncoverTriggers);
        return { state: matchState, events };
    }

    if (def.type === 'action') {
        const actionDef = def as any;
        const subtype = actionDef.subtype as string;
        const specialTiming = actionDef.specialTiming ?? 'beforeScoring';
        if (subtype !== 'special' && !isStandardActionTimingAllowed(matchState)) {
            const events: SmashUpEvent[] = [{
                type: SU_EVENTS.BURIED_CARD_UNCOVERED,
                payload: { playerId, cardUid, baseIndex, reason, discardWithoutPlay: true },
                timestamp: now,
            } as SmashUpEvent];
            if (uncoverTriggers) events.push(uncoverTriggers);
            return { state: matchState, events };
        }
        if (subtype === 'special' && !isSpecialTimingAllowed(matchState, specialTiming)) {
            const events: SmashUpEvent[] = [{
                type: SU_EVENTS.BURIED_CARD_UNCOVERED,
                payload: { playerId, cardUid, baseIndex, reason, discardWithoutPlay: true },
                timestamp: now,
            } as SmashUpEvent];
            if (uncoverTriggers) events.push(uncoverTriggers);
            return { state: matchState, events };
        }

        const executeResult = executeUncoveredAction({
            matchState,
            playerId,
            buried,
            baseIndex,
            random,
            now,
        });
        const events: SmashUpEvent[] = [uncoverEvent, ...executeResult.events];
        if (uncoverTriggers) events.push(uncoverTriggers);
        return { state: executeResult.state, events };
    }

    return { state: matchState, events: [uncoverEvent] };
}

function executeUncoveredAction(params: ExecuteUncoveredActionParams): {
    state: MatchState<SmashUpCore>;
    events: SmashUpEvent[];
} {
    const { matchState, playerId, buried, baseIndex, random, now, targetMinionUid } = params;
    const base = matchState.core.bases[baseIndex];
    if (!base) return { state: matchState, events: [] };

    const actionDef = getCardDef(buried.defId) as any;
    if (!actionDef || actionDef.type !== 'action') return { state: matchState, events: [] };

    const playedEvt: ActionPlayedEvent = {
        type: SU_EVENTS.ACTION_PLAYED,
        payload: { playerId, cardUid: buried.uid, defId: buried.defId, isExtraAction: true, fromBuried: true },
        timestamp: now,
    };

    const events: SmashUpEvent[] = [playedEvt];
    let currentState = matchState;
    const subtype = actionDef.subtype as string;
    const isOngoing = subtype === 'ongoing';

    let resolvedActionTargetMinionUid = targetMinionUid;

    if (isOngoing) {
        const ongoingTarget = actionDef.ongoingTarget ?? 'base';
        if (ongoingTarget === 'base') {
            events.push({
                type: SU_EVENTS.ONGOING_ATTACHED,
                payload: {
                    cardUid: buried.uid,
                    defId: buried.defId,
                    ownerId: playerId,
                    targetType: 'base',
                    targetBaseIndex: baseIndex,
                },
                timestamp: now,
            } as OngoingAttachedEvent);
        } else {
            const minionsHere = base.minions;
            if (!targetMinionUid && minionsHere.length === 0) {
                return { state: currentState, events };
            }
            if (!targetMinionUid && minionsHere.length > 1) {
                const options = minionsHere.map((minion, index) => ({
                    id: `m-${index}`,
                    label: getCardDef(minion.defId)?.name ?? minion.defId,
                    value: { targetMinionUid: minion.uid },
                    _source: 'field' as const,
                    displayMode: 'card' as const,
                }));
                const interaction = createSimpleChoice(
                    `bury_uncover_ongoing_target_${now}`,
                    playerId,
                    '选择要附着的随从',
                    options as any[],
                    { sourceId: 'bury_uncover_ongoing_target', targetType: 'minion' },
                );
                (interaction.data as any).continuationContext = { cardUid: buried.uid, defId: buried.defId, baseIndex };
                return { state: queueInteraction(currentState, interaction), events };
            }

            const resolvedTargetMinionUid = targetMinionUid ?? minionsHere[0]?.uid;
            if (!resolvedTargetMinionUid) return { state: currentState, events };
            resolvedActionTargetMinionUid = resolvedTargetMinionUid;
            events.push({
                type: SU_EVENTS.ONGOING_ATTACHED,
                payload: {
                    cardUid: buried.uid,
                    defId: buried.defId,
                    ownerId: playerId,
                    targetType: 'minion',
                    targetBaseIndex: baseIndex,
                    targetMinionUid: resolvedTargetMinionUid,
                },
                timestamp: now,
            } as OngoingAttachedEvent);
        }
    }

    const executor = subtype === 'special'
        ? (resolveSpecial(buried.defId) ?? resolveOnPlay(buried.defId))
        : resolveOnPlay(buried.defId);
    if (executor) {
        const ctx: AbilityContext = {
            state: currentState.core,
            matchState: currentState,
            playerId,
            cardUid: buried.uid,
            defId: buried.defId,
            baseIndex,
            targetMinionUid: resolvedActionTargetMinionUid,
            random,
            now,
        };
        const result = executor(ctx);
        events.push(...result.events);
        if (result.matchState) currentState = result.matchState;
    }

    const baseAbilityResult = triggerBaseAbility(base.defId, 'onActionPlayed', {
        state: currentState.core,
        matchState: currentState,
        baseIndex,
        baseDefId: base.defId,
        playerId,
        actionTargetBaseIndex: baseIndex,
        actionTargetType: resolvedActionTargetMinionUid ? 'minion' : 'base',
        actionTargetMinionUid: resolvedActionTargetMinionUid,
        now,
    });
    events.push(...baseAbilityResult.events);
    if (baseAbilityResult.matchState) currentState = baseAbilityResult.matchState;

    return { state: currentState, events };
}

function isSpecialTimingAllowed(
    matchState: MatchState<SmashUpCore>,
    specialTiming: 'beforeScoring' | 'afterScoring',
): boolean {
    const windowType = matchState.sys.responseWindow?.current?.windowType;
    if (specialTiming === 'beforeScoring') {
        return windowType === 'meFirst' || matchState.sys.phase === 'scoreBases';
    }
    return windowType === 'afterScoring';
}

function isStandardActionTimingAllowed(matchState: MatchState<SmashUpCore>): boolean {
    const startTurnWindowActive = matchState.sys.phase === 'startTurn'
        || Boolean((matchState.sys as any)._smashupStartTurnWindowActive);
    return startTurnWindowActive || matchState.sys.phase === 'playCards';
}

const handleUncoverAtStartTurn: InteractionHandler = (state, playerId, value, _data, random, now) => {
    const resolved = value as UncoverChoiceValue;
    if ((resolved as any)?.skip) return { state, events: [] };
    return uncoverBuriedCard({
        matchState: state,
        playerId,
        cardUid: (resolved as any).cardUid,
        baseIndex: (resolved as any).baseIndex,
        random,
        now,
        reason: 'bury_uncover_start_turn',
    });
};

const handleUncoverOngoingPickTargetMinion: InteractionHandler = (state, playerId, value, data, random, now) => {
    const ctx = data?.continuationContext as { cardUid: string; defId: string; baseIndex: number } | undefined;
    if (!ctx) return { state, events: [] };
    const targetMinionUid = (value as any)?.targetMinionUid as string | undefined;
    if (!targetMinionUid) return { state, events: [] };

    const buried = (state.core.bases[ctx.baseIndex]?.buriedCards ?? []).find(card => card.uid === ctx.cardUid);
    if (!buried) return { state, events: [] };

    return executeUncoveredAction({
        matchState: state,
        playerId,
        buried,
        baseIndex: ctx.baseIndex,
        random,
        now,
        targetMinionUid,
    });
};
