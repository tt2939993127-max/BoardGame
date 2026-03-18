import { beforeAll, describe, expect, it } from 'vitest';
import { SU_COMMANDS, SU_EVENTS, MADNESS_CARD_DEF_ID } from '../domain/types';
import { initAllAbilities, resetAbilityInit } from '../abilities';
import { clearRegistry } from '../domain/abilityRegistry';
import { clearBaseAbilityRegistry } from '../domain/baseAbilities';
import { clearInteractionHandlers } from '../domain/abilityInteractionHandlers';
import { getEffectivePower } from '../domain/ongoingModifiers';
import { INTERACTION_COMMANDS } from '../../../engine/systems/InteractionSystem';
import { makeCard, makeMatchState, makeMinion, makePlayer, makeState, getInteractionsFromMS } from './helpers';
import { runCommand, defaultTestRandom } from './testRunner';

beforeAll(() => {
    clearRegistry();
    clearBaseAbilityRegistry();
    resetAbilityInit();
    clearInteractionHandlers();
    initAllAbilities();
});

describe('elder_things_pod: Elder Thing POD', () => {
    it('if cannot destroy two other minions, must go to deck bottom', () => {
        const core = makeState({
            players: {
                '0': makePlayer('0', { hand: [makeCard('c1', 'elder_thing_elder_thing_pod', 'minion', '0')] }),
                '1': makePlayer('1'),
            },
            bases: [{ defId: 'base_a', minions: [], ongoingActions: [] }],
        });
        const play = runCommand(
            makeMatchState(core),
            { type: SU_COMMANDS.PLAY_MINION, playerId: '0', payload: { cardUid: 'c1', baseIndex: 0 } },
            defaultTestRandom,
        );
        const prompt: any = getInteractionsFromMS(play.finalState)[0]?.data;
        expect(prompt?.sourceId).toBe('elder_thing_elder_thing_pod_mode');
        const destroyOpt = prompt.options.find((o: any) => o.id === 'destroy');
        expect(destroyOpt?.disabled).toBe(true);
    });
});

describe('elder_things_pod: Unfathomable Goals POD', () => {
    it('extra thresholds from revealed madness snapshot', () => {
        const core = makeState({
            players: {
                '0': makePlayer('0', { hand: [makeCard('a1', 'elder_thing_unfathomable_goals_pod', 'action', '0')] }),
                '1': makePlayer('1', { hand: [makeCard('m1', MADNESS_CARD_DEF_ID, 'action', '1'), makeCard('m2', MADNESS_CARD_DEF_ID, 'action', '1')] }),
                '2': makePlayer('2', { hand: [makeCard('m3', MADNESS_CARD_DEF_ID, 'action', '2'), makeCard('m4', MADNESS_CARD_DEF_ID, 'action', '2')] }),
            },
            turnOrder: ['0', '1', '2'],
            bases: [{ defId: 'base_a', minions: [], ongoingActions: [] }],
            madnessDeck: [],
        });
        const res = runCommand(
            makeMatchState(core),
            { type: SU_COMMANDS.PLAY_ACTION, playerId: '0', payload: { cardUid: 'a1' } },
            defaultTestRandom,
        );
        const types = res.events.map(e => e.type);
        // Expect both extra minion and extra action limits granted.
        const limits = res.events.filter(e => e.type === SU_EVENTS.LIMIT_MODIFIED) as any[];
        expect(limits.length).toBeGreaterThanOrEqual(2);
    });
});

describe('elder_things_pod: Insanity POD', () => {
    it('removes itself from game (in the box) after resolving', () => {
        const core = makeState({
            players: {
                '0': makePlayer('0', { hand: [makeCard('a1', 'elder_thing_insanity_pod', 'action', '0')] }),
                '1': makePlayer('1'),
                '2': makePlayer('2'),
            },
            turnOrder: ['0', '1', '2'],
            bases: [{ defId: 'base_a', minions: [], ongoingActions: [] }],
            madnessDeck: [
                makeCard('m1', MADNESS_CARD_DEF_ID, 'action', '1'),
                makeCard('m2', MADNESS_CARD_DEF_ID, 'action', '1'),
                makeCard('m3', MADNESS_CARD_DEF_ID, 'action', '2'),
                makeCard('m4', MADNESS_CARD_DEF_ID, 'action', '2'),
            ],
        });
        const res = runCommand(
            makeMatchState(core),
            { type: SU_COMMANDS.PLAY_ACTION, playerId: '0', payload: { cardUid: 'a1' } },
            defaultTestRandom,
        );
        const finalP0 = res.finalState.core.players['0'];
        expect(finalP0.discard.some(c => c.uid === 'a1')).toBe(false);
        expect((finalP0.removedFromGame ?? []).some(c => c.uid === 'a1')).toBe(true);
    });
});

describe('elder_things_pod: The Price of Power POD', () => {
    it('normal play without target base should prompt to choose a base, then give +1 counters', () => {
        const core = makeState({
            players: {
                '0': makePlayer('0', {
                    hand: [makeCard('a1', 'elder_thing_the_price_of_power_pod', 'action', '0')],
                }),
                '1': makePlayer('1', {
                    hand: [makeCard('mad1', MADNESS_CARD_DEF_ID, 'action', '1')],
                }),
            },
            bases: [
                {
                    defId: 'base_the_homeworld',
                    minions: [
                        makeMinion('p0m1', 'test_minion', '0', 3, { powerCounters: 0, powerModifier: 0 }),
                        makeMinion('p1m1', 'test_enemy', '1', 3, { powerCounters: 0, powerModifier: 0 }),
                    ],
                    ongoingActions: [],
                },
                {
                    defId: 'base_rhodes_plaza',
                    minions: [
                        makeMinion('p0m2', 'test_minion_2', '0', 2, { powerCounters: 0, powerModifier: 0 }),
                    ],
                    ongoingActions: [],
                },
            ],
        });

        const played = runCommand(
            makeMatchState(core),
            { type: SU_COMMANDS.PLAY_ACTION, playerId: '0', payload: { cardUid: 'a1' } },
            defaultTestRandom,
        );

        const prompt: any = getInteractionsFromMS(played.finalState)[0]?.data;
        expect(prompt?.sourceId).toBe('elder_thing_the_price_of_power_pod_choose_base');
        const baseOpt = prompt?.options?.find((o: any) => o?.value?.baseIndex === 0);
        expect(baseOpt).toBeDefined();

        const chosen = runCommand(
            played.finalState,
            { type: INTERACTION_COMMANDS.RESPOND, playerId: '0', payload: { optionId: baseOpt.id } } as any,
            defaultTestRandom,
        );

        const powerEvents = chosen.events.filter(e => e.type === SU_EVENTS.POWER_COUNTER_ADDED) as any[];
        expect(powerEvents).toHaveLength(1);
        expect(powerEvents[0]?.payload?.amount).toBe(1);
        expect(chosen.finalState.core.bases[0].minions.find(m => m.uid === 'p0m1')?.powerCounters).toBe(1);
    });

    it('can be played in meFirst window and should use the stronger +2 version', () => {
        const core = makeState({
            players: {
                '0': makePlayer('0', {
                    hand: [makeCard('a1', 'elder_thing_the_price_of_power_pod', 'action', '0')],
                }),
                '1': makePlayer('1', {
                    hand: [
                        makeCard('mad1', MADNESS_CARD_DEF_ID, 'action', '1'),
                        makeCard('mad2', MADNESS_CARD_DEF_ID, 'action', '1'),
                    ],
                }),
            },
            bases: [
                {
                    defId: 'base_the_homeworld',
                    minions: [
                        makeMinion('p0m1', 'test_minion', '0', 3, { powerCounters: 0, powerModifier: 0 }),
                        makeMinion('p1m1', 'test_enemy', '1', 3, { powerCounters: 0, powerModifier: 0 }),
                    ],
                    ongoingActions: [],
                },
            ],
            scoringEligibleBaseIndices: [0],
        });
        const ms = makeMatchState(core);
        ms.sys.phase = 'scoreBases' as any;
        (ms.sys as any).responseWindow = {
            current: {
                id: 'rw-1',
                responderQueue: ['0', '1'],
                currentResponderIndex: 0,
                passedPlayers: [],
                actionTakenThisRound: false,
                pendingInteractionId: undefined,
                windowType: 'meFirst',
            },
            history: [],
        };

        const played = runCommand(
            ms,
            { type: SU_COMMANDS.PLAY_ACTION, playerId: '0', payload: { cardUid: 'a1', targetBaseIndex: 0 } },
            defaultTestRandom,
        );

        const powerEvents = played.events.filter(e => e.type === SU_EVENTS.POWER_COUNTER_ADDED) as any[];
        expect(powerEvents).toHaveLength(2);
        expect(powerEvents.every(e => e.payload.amount === 2)).toBe(true);
        expect(played.finalState.core.bases[0].minions.find(m => m.uid === 'p0m1')?.powerCounters).toBe(4);
    });
});

describe('elder_things_pod: Dunwich Horror POD', () => {
    it('grants only +5 power while attached', () => {
        const minion = makeMinion('m1', 'test_minion', '0', 3, {
            attachedActions: [{ uid: 'dh1', defId: 'elder_thing_dunwich_horror_pod', ownerId: '0' }],
        });
        const state = makeState({
            bases: [{ defId: 'base_a', minions: [minion], ongoingActions: [] }],
        });

        expect(getEffectivePower(state, minion, 0)).toBe(8);
    });

    it('playing it should not emit an extra permanent +5 event', () => {
        const core = makeState({
            players: {
                '0': makePlayer('0', {
                    hand: [makeCard('a1', 'elder_thing_dunwich_horror_pod', 'action', '0')],
                }),
                '1': makePlayer('1'),
            },
            bases: [
                {
                    defId: 'base_the_homeworld',
                    minions: [
                        makeMinion('target', 'test_minion', '0', 3, { powerCounters: 0, powerModifier: 0 }),
                    ],
                    ongoingActions: [],
                },
            ],
        });

        const played = runCommand(
            makeMatchState(core),
            {
                type: SU_COMMANDS.PLAY_ACTION,
                playerId: '0',
                payload: { cardUid: 'a1', targetBaseIndex: 0, targetMinionUid: 'target' },
            },
            defaultTestRandom,
        );

        expect(played.events.filter(e => e.type === SU_EVENTS.PERMANENT_POWER_ADDED)).toHaveLength(0);
        const target = played.finalState.core.bases[0].minions.find(m => m.uid === 'target');
        expect(target?.powerModifier).toBe(0);
        expect(getEffectivePower(played.finalState.core, target!, 0)).toBe(8);
    });
});

describe('elder_things (base): Elder Thing', () => {
    it('if you cannot destroy two other minions, destroy option disabled and you can put it to deck bottom (FAQ)', () => {
        const core = makeState({
            players: {
                '0': makePlayer('0', {
                    hand: [makeCard('et1', 'elder_thing_elder_thing', 'minion', '0')],
                }),
                '1': makePlayer('1'),
            },
            bases: [
                {
                    defId: 'base_a',
                    minions: [
                        makeMinion('m1', 'robot_microbot', '0', 1),
                    ],
                    ongoingActions: [],
                },
            ],
        });

        const played = runCommand(
            makeMatchState(core),
            { type: SU_COMMANDS.PLAY_MINION, playerId: '0', payload: { cardUid: 'et1', baseIndex: 0 } },
            defaultTestRandom,
        );

        // Choose "destroy" mode
        const choiceInteraction: any = getInteractionsFromMS(played.finalState)[0];
        const choicePrompt: any = choiceInteraction?.data;
        expect(choicePrompt?.sourceId).toBe('elder_thing_elder_thing_choice');
        const destroyOpt = choicePrompt.options.find((o: any) => o.id === 'destroy');
        expect(destroyOpt?.disabled).toBe(true);
        const deckBottomOpt = choicePrompt.options.find((o: any) => o.id === 'deckbottom');
        expect(deckBottomOpt).toBeTruthy();

        const afterChoice = runCommand(
            played.finalState,
            { type: INTERACTION_COMMANDS.RESPOND, playerId: '0', payload: { optionId: deckBottomOpt.id } },
            defaultTestRandom,
        );
        expect(afterChoice.events.some(e => e.type === SU_EVENTS.CARD_TO_DECK_BOTTOM)).toBe(true);

        const base0 = afterChoice.finalState.core.bases[0];
        // Existing minion should remain (destroy none)
        expect(base0.minions.some(m => m.uid === 'm1')).toBe(true);
        // Elder Thing should not be in play (moved to bottom of deck)
        expect(base0.minions.some(m => m.defId === 'elder_thing_elder_thing')).toBe(false);
        // and not in discard
        expect(afterChoice.finalState.core.players['0'].discard.some(c => c.uid === 'et1')).toBe(false);
    });
});

