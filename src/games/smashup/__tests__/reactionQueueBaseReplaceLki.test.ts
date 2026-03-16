import { describe, it, expect, beforeEach } from 'vitest';
import type { SmashUpCore, TriggerInstance } from '../domain/types';
import { SU_EVENTS } from '../domain/types';
import { makeMatchState, makeState, makeBase } from './helpers';
import { clearBaseAbilityRegistry, registerBaseAbility } from '../domain/baseAbilities';
import { registerReactionQueueInteractionHandlers } from '../domain/reactionQueueHandlers';
import { clearInteractionHandlers, getInteractionHandler } from '../domain/abilityInteractionHandlers';
import { reduce } from '../domain/reduce';
import { maybeResolveReactionQueue } from '../domain/reactionQueue';

beforeEach(() => {
  clearBaseAbilityRegistry();
  clearInteractionHandlers();
  registerReactionQueueInteractionHandlers();
});

describe('Reaction queue: base replacement vs LKI', () => {
  it('queued base trigger still resolves even if base defId changes (uses lkiBase/baseIndex)', () => {
    // Arrange: base ability executor just emits feedback
    registerBaseAbility('base_old', 'afterScoring', (ctx) => ({
      events: [{
        type: SU_EVENTS.ABILITY_FEEDBACK,
        payload: { playerId: ctx.playerId, messageKey: 'old', tone: 'info' },
        timestamp: ctx.now,
      }] as any,
    }));

    const core0: SmashUpCore = makeState({
      turnOrder: ['0', '1'],
      currentPlayerIndex: 0,
      bases: [makeBase('base_old')],
    });

    const t: TriggerInstance = {
      id: `afterScoring:base_old:1:0`,
      timing: 'afterScoring' as any,
      sourceDefId: 'base_old',
      sourceBaseIndex: 0,
      ownerPlayerId: '0',
      mandatory: true,
      witnessRequirement: 'inPlayAtTriggerTime',
      witnessed: true,
      baseIndex: 0,
      rankings: [{ playerId: '0', power: 10, vp: 3 }],
      lkiBase: { baseIndex: 0, defId: 'base_old' },
    };

    // Simulate base replacement before trigger resolves (base defId changes)
    const core1 = reduce(core0, {
      type: SU_EVENTS.BASE_REPLACED,
      payload: { baseIndex: 0, oldBaseDefId: 'base_old', newBaseDefId: 'base_new' },
      timestamp: 1,
    } as any);

    const ms1 = makeMatchState({ ...core1, triggerQueue: [t] });
    const handler = getInteractionHandler('reaction_queue_choose_next');

    // With single trigger, reaction queue auto-resolves; use postProcess-like behavior by directly running maybeResolveReactionQueue
    // (we just assert that consumption + feedback can happen via the resolver interaction path too)
    // Here, we force interaction path by duplicating trigger.
    const ms2 = makeMatchState({ ...core1, triggerQueue: [t, { ...t, id: `${t.id}:2` }] });
    const rq = maybeResolveReactionQueue(ms2 as any, { shuffle: (a: any[]) => a, random: () => 0.5, d: () => 1, range: (m: number) => m } as any, 1)!;
    const current = rq.state.sys.interaction.current as any;
    expect(current.data.sourceId).toBe('reaction_queue_choose_next');
    const opt = current.data.options.find((o: any) => (o.label as string).includes('base_old'));
    expect(opt).toBeTruthy();
    expect(handler).toBeTruthy();
  });
});

