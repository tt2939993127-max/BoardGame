import { beforeAll, describe, expect, it } from 'vitest';
import type { MatchState } from '../../../engine/types';
import type { SmashUpCore, TriggerInstance } from '../domain/types';
import { initAllAbilities, resetAbilityInit } from '../abilities';
import { clearRegistry } from '../domain/abilityRegistry';
import { clearBaseAbilityRegistry } from '../domain/baseAbilities';
import { clearInteractionHandlers } from '../domain/abilityInteractionHandlers';
import { defaultTestRandom } from './testRunner';
import { makeMatchState, makePlayer, makeState, getInteractionsFromMS } from './helpers';
import { maybeResolveReactionQueue } from '../domain/reactionQueue';

beforeAll(() => {
    clearRegistry();
    clearBaseAbilityRegistry();
    resetAbilityInit();
    clearInteractionHandlers();
    initAllAbilities();
});

describe('reaction queue: preserves destroyerId context', () => {
    it('vampire_mad_monster_party_pod trigger works when resolved from queue', () => {
        const core = makeState({
            turnOrder: ['0', '1'],
            currentPlayerIndex: 0,
            players: {
                '0': makePlayer('0', {
                    hand: [{ uid: 'a-mmp', defId: 'vampire_mad_monster_party_pod', type: 'action', owner: '0' } as any],
                }),
                '1': makePlayer('1'),
            },
            bases: [
                { defId: 'base_a', minions: [], ongoingActions: [] },
                { defId: 'base_b', minions: [], ongoingActions: [] },
            ],
        });

        const trigger: TriggerInstance = {
            id: 't-mmp',
            timing: 'onMinionDestroyed',
            sourceDefId: 'vampire_mad_monster_party_pod',
            mandatory: false,
            ownerPlayerId: '0',
            witnessRequirement: 'inPlayAtTriggerTime',
            witnessed: true,
            baseIndex: 1,
            triggerMinionUid: 'dead1',
            triggerMinionDefId: 'test_dead',
            destroyerId: '0',
            reason: 'test_destroy',
        };

        const ms: MatchState<SmashUpCore> = makeMatchState({ ...(core as any), triggerQueue: [trigger] });
        const rq = maybeResolveReactionQueue(ms, defaultTestRandom, 1);
        expect(rq).toBeDefined();

        // Only one trigger => should execute directly and create the "play mad monster party" prompt.
        const after = rq!.state;
        const interactions = getInteractionsFromMS(after) as any[];
        expect(interactions.length).toBeGreaterThanOrEqual(1);
        expect(interactions[0]?.data?.sourceId).toBe('vampire_mad_monster_party_pod_play');
    });
});

