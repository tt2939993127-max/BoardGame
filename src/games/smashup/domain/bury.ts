import type { MatchState, PlayerId, RandomFn } from '../../../engine/types';
import { createSimpleChoice, queueInteraction } from '../../../engine/systems/InteractionSystem';
import type { SmashUpCore, SmashUpEvent, BuriedCardOnBase, MinionPlayedEvent, ActionPlayedEvent, OngoingAttachedEvent } from './types';
import { SU_EVENTS } from './types';
import { registerInteractionHandler, type InteractionHandler } from './abilityInteractionHandlers';
import { getCardDef } from '../data/cards';
import { resolveOnPlay } from './abilityRegistry';
import type { AbilityContext } from './abilityRegistry';

type UncoverChoiceValue = { cardUid: string; baseIndex: number } | { skip: true };

export function registerBuryInteractionHandlers(): void {
    registerInteractionHandler('bury_uncover_start_turn', handleUncoverAtStartTurn);
    registerInteractionHandler('bury_uncover_ongoing_target', handleUncoverOngoingPickTargetMinion);
}

const handleUncoverAtStartTurn: InteractionHandler = (state, playerId, value, _data, random, now) => {
    const v = value as UncoverChoiceValue;
    if ((v as any)?.skip) return { state, events: [] };
    const { cardUid, baseIndex } = v as any;
    const base = state.core.bases[baseIndex];
    const buried = (base?.buriedCards ?? []).find(c => c.uid === cardUid) as BuriedCardOnBase | undefined;
    if (!base || !buried) return { state, events: [] };

    const def = getCardDef(buried.defId);
    if (!def) {
        // 无法识别的卡：直接弃置到真正所有者弃牌堆
        const evt: SmashUpEvent = {
            type: SU_EVENTS.BURIED_CARDS_DISCARDED_WITH_BASE,
            payload: { baseIndex, reason: 'bury_uncover_unknown_def' },
            timestamp: now,
        } as any;
        return { state, events: [evt] };
    }

    // 揭开视为“额外打出”该卡（Wiki）
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
        return { state, events: [played] };
    }

    if (def.type === 'action') {
        const actionDef = def as any;
        const subtype = actionDef.subtype as string;
        const isOngoing = subtype === 'ongoing';
        const playedEvt: ActionPlayedEvent = {
            type: SU_EVENTS.ACTION_PLAYED,
            payload: { playerId, cardUid, defId: buried.defId, isExtraAction: true, fromBuried: true },
            timestamp: now,
        };

        const events: SmashUpEvent[] = [playedEvt];

        if (isOngoing) {
            // Play-on-base ongoing: attach to this base; play-on-minion needs target on this base.
            const ongoingTarget = actionDef.ongoingTarget ?? 'base';
            if (ongoingTarget === 'base') {
                const attach: OngoingAttachedEvent = {
                    type: SU_EVENTS.ONGOING_ATTACHED,
                    payload: {
                        cardUid,
                        defId: buried.defId,
                        ownerId: playerId,
                        targetType: 'base',
                        targetBaseIndex: baseIndex,
                    },
                    timestamp: now,
                } as any;
                events.push(attach);
            } else {
                const minionsHere = base.minions;
                if (minionsHere.length === 0) {
                    // 无法打到随从上：弃置无效（ACTION_PLAYED reducer 会入弃牌堆）
                    return { state, events };
                }
                if (minionsHere.length === 1) {
                    const attach: OngoingAttachedEvent = {
                        type: SU_EVENTS.ONGOING_ATTACHED,
                        payload: {
                            cardUid,
                            defId: buried.defId,
                            ownerId: playerId,
                            targetType: 'minion',
                            targetBaseIndex: baseIndex,
                            targetMinionUid: minionsHere[0].uid,
                        },
                        timestamp: now,
                    } as any;
                    events.push(attach);
                } else {
                    // 需要选择目标随从
                    const options = minionsHere.map((m, i) => ({
                        id: `m-${i}`,
                        label: getCardDef(m.defId)?.name ?? m.defId,
                        value: { targetMinionUid: m.uid },
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
                    (interaction.data as any).continuationContext = { cardUid, defId: buried.defId, baseIndex };
                    return { state: queueInteraction(state, interaction), events };
                }
            }

            // ongoing 的 onPlay（如果有）也要执行（与 PLAY_ACTION 一致）
            const executor = resolveOnPlay(buried.defId);
            if (executor) {
                const ctx: AbilityContext = {
                    state: state.core,
                    matchState: state,
                    playerId,
                    cardUid,
                    defId: buried.defId,
                    baseIndex,
                    random,
                    now,
                };
                const result = executor(ctx);
                events.push(...result.events);
                if (result.matchState) {
                    return { state: result.matchState, events };
                }
            }

            return { state, events };
        }

        // standard/special: resolve onPlay immediately
        const executor = resolveOnPlay(buried.defId);
        if (executor) {
            const ctx: AbilityContext = {
                state: state.core,
                matchState: state,
                playerId,
                cardUid,
                defId: buried.defId,
                baseIndex,
                random,
                now,
            };
            const result = executor(ctx);
            events.push(...result.events);
            if (result.matchState) {
                return { state: result.matchState, events };
            }
        }
        return { state, events };
    }

    return { state, events: [] };
};

const handleUncoverOngoingPickTargetMinion: InteractionHandler = (state, playerId, value, data, random, now) => {
    const ctx = data?.continuationContext as { cardUid: string; defId: string; baseIndex: number } | undefined;
    if (!ctx) return { state, events: [] };
    const v = value as any;
    const targetMinionUid = v?.targetMinionUid as string | undefined;
    if (!targetMinionUid) return { state, events: [] };

    const attach: OngoingAttachedEvent = {
        type: SU_EVENTS.ONGOING_ATTACHED,
        payload: {
            cardUid: ctx.cardUid,
            defId: ctx.defId,
            ownerId: playerId,
            targetType: 'minion',
            targetBaseIndex: ctx.baseIndex,
            targetMinionUid,
        },
        timestamp: now,
    } as any;

    const events: SmashUpEvent[] = [attach];

    const executor = resolveOnPlay(ctx.defId);
    if (executor) {
        const abilityCtx: AbilityContext = {
            state: state.core,
            matchState: state,
            playerId,
            cardUid: ctx.cardUid,
            defId: ctx.defId,
            baseIndex: ctx.baseIndex,
            targetMinionUid,
            random,
            now,
        };
        const result = executor(abilityCtx);
        events.push(...result.events);
        if (result.matchState) {
            return { state: result.matchState, events };
        }
    }

    return { state, events };
};

