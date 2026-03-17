import { describe, it, expect, beforeEach } from 'vitest';
import { clearOngoingEffectRegistry, registerTrigger, collectTriggers } from '../domain/ongoingEffects';
import { clearInteractionHandlers } from '../domain/abilityInteractionHandlers';
import { registerReactionQueueInteractionHandlers } from '../domain/reactionQueueHandlers';
import { maybeResolveReactionQueue } from '../domain/reactionQueue';
import { makeMatchState, makeState, makeBase, makeMinion } from './helpers';

beforeEach(() => {
  clearOngoingEffectRegistry();
  clearInteractionHandlers();
  registerReactionQueueInteractionHandlers();
});

describe('reaction queue: onTurnStart ordering', () => {
  it('multiple mandatory onTurnStart triggers open ordering interaction for current player', () => {
    registerTrigger('test_turn_start_a', 'onTurnStart', () => []);
    registerTrigger('test_turn_start_b', 'onTurnStart', () => []);

    const core = makeState({
      turnOrder: ['0', '1'],
      currentPlayerIndex: 0,
      bases: [
        makeBase('test_base_1', [
          makeMinion('a1', 'test_turn_start_a', '0', 3),
          makeMinion('b1', 'test_turn_start_b', '0', 3),
        ]),
      ],
    });

    const queued = collectTriggers(core, 'onTurnStart', {
      state: core,
      matchState: makeMatchState(core),
      playerId: '0',
      random: { shuffle: (a: any[]) => a } as any,
      now: 1,
    });
    expect(queued).toBeDefined();
    const triggers = (queued as any).payload.triggers;
    const ms0 = makeMatchState({ ...core, triggerQueue: triggers });

    const rq = maybeResolveReactionQueue(ms0, { shuffle: (a: any[]) => a } as any, 1);
    expect(rq).toBeDefined();
    const current = rq!.state.sys.interaction.current as any;
    expect(current?.data?.sourceId).toBe('reaction_queue_choose_next');
  });
});

