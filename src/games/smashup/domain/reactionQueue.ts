import type { MatchState, PlayerId, RandomFn } from '../../../engine/types';
import type { SmashUpCore, SmashUpEvent, TriggerConsumedEvent, TriggerInstance } from './types';
import { SU_EVENTS } from './types';
import { createSimpleChoice, queueInteraction } from '../../../engine/systems/InteractionSystem';
import { getCurrentPlayerId } from './types';
import { getTriggerExecutor } from './triggerExecutors';

function getClockwiseOrder(turnOrder: PlayerId[], startingPlayerId: PlayerId): PlayerId[] {
  const idx = turnOrder.indexOf(startingPlayerId);
  if (idx < 0) return [...turnOrder];
  return [...turnOrder.slice(idx), ...turnOrder.slice(0, idx)];
}

function chooseNextTriggerOwner(
  core: SmashUpCore,
  pending: TriggerInstance[],
): PlayerId {
  const current = getCurrentPlayerId(core);
  const mandatory = pending.filter(t => t.mandatory);
  if (mandatory.length > 0) return current;
  // optional: clockwise by ownerPlayerId (best effort)
  const order = getClockwiseOrder(core.turnOrder, current);
  for (const pid of order) {
    if (pending.some(t => t.ownerPlayerId === pid)) return pid;
  }
  return current;
}

export function maybeResolveReactionQueue(
  state: MatchState<SmashUpCore>,
  random: RandomFn,
  now: number,
): { state: MatchState<SmashUpCore>; events: SmashUpEvent[] } | undefined {
  const core = state.core;
  const pending = core.triggerQueue ?? [];
  if (pending.length === 0) return undefined;

  // if any interaction is already pending, don't interfere
  if (state.sys.interaction?.current) return undefined;

  // choose who decides ordering at this step
  const decider = chooseNextTriggerOwner(core, pending);

  // if only one trigger, execute directly
  if (pending.length === 1) {
    const t = pending[0];
    const exec = getTriggerExecutor(t.timing, t.sourceDefId);
    const consumed: TriggerConsumedEvent = {
      type: SU_EVENTS.TRIGGER_CONSUMED,
      payload: { triggerId: t.id },
      timestamp: now,
    };
    const events: SmashUpEvent[] = [consumed];
    if (exec) {
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
        random,
        now,
      } as any);
      const evts = Array.isArray(result) ? result : result.events;
      events.push(...evts);
      const ms = (!Array.isArray(result) && result.matchState) ? result.matchState : undefined;
      return { state: ms ?? state, events };
    }
    return { state, events };
  }

  // multiple triggers: ask decider to choose next trigger to resolve
  const options = pending
    .filter(t => t.mandatory ? decider === getCurrentPlayerId(core) : t.ownerPlayerId === decider)
    .map(t => ({
      id: t.id,
      label: `${t.sourceDefId} @${t.timing}`,
      value: { triggerId: t.id },
      displayMode: 'button' as const,
    }));
  if (options.length === 0) return undefined;

  const interaction = createSimpleChoice(
    `reaction_queue_${now}`,
    decider,
    '选择要结算的反应（同时触发排序）',
    options,
    { sourceId: 'reaction_queue_choose_next', targetType: 'button' },
  );
  return { state: queueInteraction(state, interaction), events: [] };
}

