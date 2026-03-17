import { beforeAll, describe, expect, it } from 'vitest';
import { SU_COMMANDS, SU_EVENTS, MADNESS_CARD_DEF_ID } from '../domain/types';
import { initAllAbilities, resetAbilityInit } from '../abilities';
import { clearRegistry } from '../domain/abilityRegistry';
import { clearBaseAbilityRegistry } from '../domain/baseAbilities';
import { clearInteractionHandlers } from '../domain/abilityInteractionHandlers';
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

