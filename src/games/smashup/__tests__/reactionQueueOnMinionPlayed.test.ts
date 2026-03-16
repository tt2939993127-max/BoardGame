import { describe, it, expect, beforeEach } from 'vitest';
import { SU_EVENTS } from '../domain/types';
import type { SmashUpEvent, SmashUpCore } from '../domain/types';
import { makeMatchState, makePlayer } from './helpers';
import { clearInteractionHandlers } from '../domain/abilityInteractionHandlers';
import { registerReactionQueueInteractionHandlers } from '../domain/reactionQueueHandlers';
import { clearOngoingEffectRegistry, registerTrigger, collectTriggers } from '../domain/ongoingEffects';
import { maybeResolveReactionQueue } from '../domain/reactionQueue';

beforeEach(() => {
  clearOngoingEffectRegistry();
  clearInteractionHandlers();
  registerReactionQueueInteractionHandlers();
});

function core2p(): SmashUpCore {
  return {
    players: {
      '0': makePlayer('0'),
      '1': makePlayer('1'),
    },
    bases: [{ defId: 'base_a', minions: [], ongoingActions: [] }],
    turnOrder: ['0', '1'],
    currentPlayerIndex: 0,
    baseDeck: [],
    nextUid: 1,
    turnNumber: 1,
    baseDiscard: [],
  } as any;
}

describe('reaction queue: onMinionPlayed ordering', () => {
  it('multiple mandatory onMinionPlayed triggers create ordering interaction for current player', () => {
    registerTrigger('test_on_play_a', 'onMinionPlayed', (ctx) => ([
      { type: SU_EVENTS.ABILITY_TRIGGERED, payload: { sourceDefId: 'test_on_play_a', timing: ctx.timing, playerId: ctx.playerId }, timestamp: ctx.now } as any,
    ]));
    registerTrigger('test_on_play_b', 'onMinionPlayed', (ctx) => ([
      { type: SU_EVENTS.ABILITY_TRIGGERED, payload: { sourceDefId: 'test_on_play_b', timing: ctx.timing, playerId: ctx.playerId }, timestamp: ctx.now } as any,
    ]));

    const core = core2p();
    // make trigger sources active (in-play minions) and include played minion
    core.bases[0].minions.push({ uid: 's1', defId: 'test_on_play_a', owner: '0', controller: '0', basePower: 1, powerCounters: 0, powerModifier: 0, tempPowerModifier: 0, talentUsed: false, attachedActions: [] } as any);
    core.bases[0].minions.push({ uid: 's2', defId: 'test_on_play_b', owner: '0', controller: '0', basePower: 1, powerCounters: 0, powerModifier: 0, tempPowerModifier: 0, talentUsed: false, attachedActions: [] } as any);
    core.bases[0].minions.push({ uid: 'm1', defId: 'test_minion', owner: '0', controller: '0', basePower: 2, powerCounters: 0, powerModifier: 0, tempPowerModifier: 0, talentUsed: false, attachedActions: [] } as any);

    const queued = collectTriggers(core, 'onMinionPlayed', {
      state: core,
      matchState: makeMatchState(core),
      playerId: '0',
      baseIndex: 0,
      triggerMinionUid: 'm1',
      triggerMinionDefId: 'test_minion',
      triggerMinion: core.bases[0].minions.find(m => m.uid === 'm1') as any,
      random: { shuffle: (a: any[]) => a } as any,
      now: 10,
    });
    expect(queued).toBeDefined();

    const triggers = (queued as any).payload.triggers;
    const ms0 = makeMatchState({ ...core, triggerQueue: triggers });
    const rq = maybeResolveReactionQueue(ms0, { shuffle: (a: any[]) => a } as any, 10);
    expect(rq).toBeDefined();
    const current = rq!.state.sys.interaction.current as any;
    expect(current?.data?.sourceId).toBe('reaction_queue_choose_next');
  });
});

