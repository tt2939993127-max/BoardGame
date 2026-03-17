import { describe, it, expect, beforeEach } from 'vitest';
import type { SmashUpCore, SmashUpEvent, TriggerInstance } from '../domain/types';
import { SU_EVENTS } from '../domain/types';
import { makeMatchState, makeState, makeBase } from './helpers';
import { clearBaseAbilityRegistry, registerBaseAbility } from '../domain/baseAbilities';
import { registerReactionQueueInteractionHandlers } from '../domain/reactionQueueHandlers';
import { clearInteractionHandlers, getInteractionHandler } from '../domain/abilityInteractionHandlers';
import { maybeResolveReactionQueue } from '../domain/reactionQueue';
import { collectBaseAbilityTriggers } from '../domain/baseAbilityQueue';

function core2b(overrides?: Partial<SmashUpCore>): SmashUpCore {
  return makeState({
    turnOrder: ['0', '1'],
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

describe('Reaction queue: base abilities', () => {
  it('two base abilities same timing -> ordering prompt for current player', () => {
    // Arrange: register two base abilities that emit different feedback
    registerBaseAbility('base_a', 'onTurnStart', (ctx) => ({
      events: [{
        type: SU_EVENTS.ABILITY_FEEDBACK,
        payload: { playerId: ctx.playerId, messageKey: 'a', tone: 'info' },
        timestamp: ctx.now,
      }] as any,
    }));
    registerBaseAbility('base_b', 'onTurnStart', (ctx) => ({
      events: [{
        type: SU_EVENTS.ABILITY_FEEDBACK,
        payload: { playerId: ctx.playerId, messageKey: 'b', tone: 'info' },
        timestamp: ctx.now,
      }] as any,
    }));

    const core = core2b();

    const qA = collectBaseAbilityTriggers({ core, timing: 'onTurnStart', ownerPlayerId: '0', baseIndex: 0, now: 1 })!;
    const qB = collectBaseAbilityTriggers({ core, timing: 'onTurnStart', ownerPlayerId: '0', baseIndex: 1, now: 1 })!;
    const triggers: TriggerInstance[] = [
      ...(qA as any).payload.triggers,
      ...(qB as any).payload.triggers,
    ];

    const ms0 = makeMatchState({ ...core, triggerQueue: triggers });

    // Act: multiple mandatory triggers -> choose-next interaction
    const rq = maybeResolveReactionQueue(ms0, { shuffle: (a: any[]) => a, random: () => 0.5, d: () => 1, range: (m: number) => m } as any, 1);
    expect(rq).toBeDefined();
    const ms1 = rq!.state;
    const current = ms1.sys.interaction.current as any;
    expect(current?.data?.sourceId).toBe('reaction_queue_choose_next');

    // Pick base_b first
    const optB = current.data.options.find((o: any) => (o.label as string).includes('base_b'));
    expect(optB).toBeDefined();
    const handler = getInteractionHandler('reaction_queue_choose_next')!;
    const r2 = handler(ms1 as any, '0', optB.value, current.data, { shuffle: (a: any[]) => a } as any, 2);
    expect(r2).toBeDefined();
    const evts = r2!.events as SmashUpEvent[];
    expect(evts[0].type).toBe(SU_EVENTS.TRIGGER_CONSUMED);
    expect(evts.some(e => e.type === SU_EVENTS.ABILITY_FEEDBACK)).toBe(true);
  });
});

