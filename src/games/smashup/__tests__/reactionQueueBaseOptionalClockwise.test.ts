import { describe, it, expect, beforeEach } from 'vitest';
import type { SmashUpCore, TriggerInstance } from '../domain/types';
import { makeMatchState, makeState, makeBase } from './helpers';
import { clearBaseAbilityRegistry, registerBaseAbility } from '../domain/baseAbilities';
import { registerReactionQueueInteractionHandlers } from '../domain/reactionQueueHandlers';
import { clearInteractionHandlers } from '../domain/abilityInteractionHandlers';
import { maybeResolveReactionQueue } from '../domain/reactionQueue';
import { collectBaseAbilityTriggers } from '../domain/baseAbilityQueue';

function core3p(overrides?: Partial<SmashUpCore>): SmashUpCore {
  return makeState({
    turnOrder: ['0', '1', '2'],
    currentPlayerIndex: 0,
    bases: [makeBase('base_a'), makeBase('base_b')],
    ...overrides,
  });
}

beforeEach(() => {
  clearBaseAbilityRegistry();
  clearInteractionHandlers();
  registerReactionQueueInteractionHandlers();
});

describe('Reaction queue: optional base triggers resolve clockwise', () => {
  it('optional triggers choose next by clockwise ownerPlayerId starting at current player', () => {
    // Two optional base abilities, owned by different players.
    registerBaseAbility('base_a', 'onTurnStart', () => ({ events: [] }), { mandatory: false });
    registerBaseAbility('base_b', 'onTurnStart', () => ({ events: [] }), { mandatory: false });

    const core = core3p();
    const q1 = collectBaseAbilityTriggers({ core, timing: 'onTurnStart', ownerPlayerId: '1', baseIndex: 0, now: 1 })!;
    const q2 = collectBaseAbilityTriggers({ core, timing: 'onTurnStart', ownerPlayerId: '2', baseIndex: 1, now: 1 })!;
    const triggers: TriggerInstance[] = [
      ...(q1 as any).payload.triggers,
      ...(q2 as any).payload.triggers,
    ];

    const ms0 = makeMatchState({ ...core, triggerQueue: triggers });
    const rq = maybeResolveReactionQueue(ms0, { shuffle: (a: any[]) => a, random: () => 0.5, d: () => 1, range: (m: number) => m } as any, 1);
    expect(rq).toBeDefined();
    const current = (rq!.state.sys.interaction.current as any);

    // Optional: decider should be first clockwise owner among pending: '1'
    expect(current.playerId).toBe('1');
    expect(current.data.sourceId).toBe('reaction_queue_choose_next');
  });
});

