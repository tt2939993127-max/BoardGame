import { beforeAll, describe, expect, it } from 'vitest';
import { initAllAbilities, resetAbilityInit } from '../abilities';
import { clearRegistry } from '../domain/abilityRegistry';
import { clearBaseAbilityRegistry } from '../domain/baseAbilities';
import { clearInteractionHandlers } from '../domain/abilityInteractionHandlers';
import { makeCard, makeMatchState, makeMinion, makePlayer, makeState, getInteractionsFromMS } from './helpers';
import { runCommand, defaultTestRandom } from './testRunner';
import { SU_COMMANDS, SU_EVENTS } from '../domain/types';
import { INTERACTION_COMMANDS } from '../../../engine/systems/InteractionSystem';

beforeAll(() => {
    clearRegistry();
    clearBaseAbilityRegistry();
    resetAbilityInit();
    clearInteractionHandlers();
    initAllAbilities();
});

describe('vampires_pod: Nightstalker POD', () => {
    it('talent requires having destroyed a minion this turn', () => {
        const core = makeState({
            players: {
                '0': makePlayer('0', { hand: [makeCard('ns', 'vampire_nightstalker_pod', 'minion', '0')] }),
                '1': makePlayer('1', { hand: [makeCard('m1', 'robot_microbot', 'minion', '1')] }),
            },
            turnOrder: ['0', '1'],
            currentPlayerIndex: 0,
            turnNumber: 1,
            bases: [{ defId: 'base_a', minions: [], ongoingActions: [] }],
        });

        const played = runCommand(
            makeMatchState(core),
            { type: SU_COMMANDS.PLAY_MINION, playerId: '0', payload: { cardUid: 'ns', baseIndex: 0 } },
            defaultTestRandom,
        );

        // No destroyed-this-turn => should not add temp power
        const use1 = runCommand(
            played.finalState,
            { type: SU_COMMANDS.USE_TALENT, playerId: '0', payload: { minionUid: 'ns', baseIndex: 0 } } as any,
            defaultTestRandom,
        );
        expect(use1.success).toBe(true);
        expect(use1.events.some(e => e.type === SU_EVENTS.TEMP_POWER_ADDED)).toBe(false);

        // Fresh state: mark as destroyed-this-turn, reset talentUsed, then talent should work
        const core2 = {
            ...played.finalState.core,
            destroyedMinionByPlayersThisTurn: ['0'] as any,
            players: {
                ...played.finalState.core.players,
                '0': {
                    ...played.finalState.core.players['0'],
                    deck: [makeCard('d1', 'robot_microbot', 'minion', '0')],
                },
            },
            bases: played.finalState.core.bases.map((b, i) => i !== 0 ? b : ({
                ...b,
                minions: b.minions.map(m => m.uid === 'ns' ? { ...m, talentUsed: false } : m),
            })),
        };
        const use2 = runCommand(
            makeMatchState(core2),
            { type: SU_COMMANDS.USE_TALENT, playerId: '0', payload: { minionUid: 'ns', baseIndex: 0 } } as any,
            defaultTestRandom,
        );
        expect(use2.success).toBe(true);
        expect(use2.events.some(e => e.type === SU_EVENTS.TEMP_POWER_ADDED)).toBe(true);
    });
});

describe('vampires_pod: Cull The Weak POD', () => {
    it('searches the deck for up to two minions, mills them, then places counters afterward', () => {
        const core = makeState({
            players: {
                '0': makePlayer('0', {
                    hand: [
                        makeCard('a1', 'vampire_cull_the_weak_pod', 'action', '0'),
                    ],
                    deck: [
                        makeCard('d1', 'test_minion', 'minion', '0'),
                        makeCard('d2', 'test_minion_2', 'minion', '0'),
                        makeCard('d3', 'test_action', 'action', '0'),
                    ],
                }),
                '1': makePlayer('1'),
            },
            bases: [{
                defId: 'base_a',
                minions: [
                    makeMinion('m1', 'vampire_nightstalker_pod', '0', 4),
                    makeMinion('m2', 'vampire_fledgling_vampire_pod', '0', 2),
                ],
                ongoingActions: [],
            }],
        });

        const played = runCommand(
            makeMatchState(core),
            { type: SU_COMMANDS.PLAY_ACTION, playerId: '0', payload: { cardUid: 'a1' } },
            defaultTestRandom,
        );

        const counterPrompt = getInteractionsFromMS(played.finalState)[0];
        expect(counterPrompt?.data?.sourceId).toBe('vampire_cull_the_weak_pod');
        expect(counterPrompt?.data?.options).toHaveLength(2);
        expect(counterPrompt?.data?.continuationContext?.discardedCount).toBe(2);
        expect(counterPrompt?.data?.continuationContext?.discardUids).toEqual(['d1', 'd2']);

        const firstTarget = counterPrompt?.data?.options?.find((o: any) => o?.value?.minionUid === 'm1');
        expect(firstTarget).toBeDefined();

        const afterSearch = runCommand(
            played.finalState,
            { type: INTERACTION_COMMANDS.RESPOND, playerId: '0', payload: { optionId: firstTarget.id } } as any,
            defaultTestRandom,
        );

        expect(afterSearch.events.some(e => e.type === SU_EVENTS.CARDS_MILLED)).toBe(true);
        expect(afterSearch.events.some(e => e.type === SU_EVENTS.CARDS_DISCARDED)).toBe(false);
        expect(afterSearch.finalState.core.players['0'].discard.map(c => c.uid)).toEqual(
            expect.arrayContaining(['d1', 'd2']),
        );
        expect(afterSearch.finalState.core.players['0'].deck.map(c => c.uid)).toEqual(['d3']);

        const afterCounter = runCommand(
            afterSearch.finalState,
            { type: INTERACTION_COMMANDS.RESPOND, playerId: '0', payload: { optionId: firstTarget.id } } as any,
            defaultTestRandom,
        );

        expect(getInteractionsFromMS(afterCounter.finalState)).toHaveLength(0);
        expect(afterCounter.finalState.core.bases[0].minions.find(m => m.uid === 'm1')?.powerCounters).toBe(2);
    });
});
