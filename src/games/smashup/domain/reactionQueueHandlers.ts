import type { MatchState, PlayerId, RandomFn } from '../../../engine/types';
import type { SmashUpCore, SmashUpEvent, TriggerConsumedEvent } from './types';
import { SU_EVENTS } from './types';
import { getTriggerExecutor } from './triggerExecutors';
import { registerInteractionHandler } from './abilityInteractionHandlers';

export function registerReactionQueueInteractionHandlers(): void {
  registerInteractionHandler('reaction_queue_choose_next', (state, _playerId, value, _iData, random, timestamp) => {
    const { triggerId } = (value ?? {}) as { triggerId?: string };
    if (!triggerId) return { state, events: [] };
    const core = state.core;
    const pending = core.triggerQueue ?? [];
    const t = pending.find(x => x.id === triggerId);
    if (!t) return { state, events: [] };

    const consumed: TriggerConsumedEvent = {
      type: SU_EVENTS.TRIGGER_CONSUMED,
      payload: { triggerId },
      timestamp,
    };
    const exec = getTriggerExecutor(t.timing, t.sourceDefId);
    const events: SmashUpEvent[] = [consumed];
    if (!exec) return { state, events };

    const result = exec({
      state: core,
      matchState: state,
      timing: t.timing,
      playerId: t.ownerPlayerId,
      baseIndex: t.baseIndex,
      triggerMinionUid: t.triggerMinionUid,
      triggerMinionDefId: t.triggerMinionDefId,
      reason: t.reason,
      affectType: t.affectType,
      random: random as RandomFn,
      now: timestamp,
    } as any);

    const evts = Array.isArray(result) ? result : result.events;
    events.push(...evts);
    const nextState = (!Array.isArray(result) && result.matchState) ? result.matchState : state;
    return { state: nextState, events };
  });
}

