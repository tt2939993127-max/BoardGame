import { beforeAll, describe, expect, it } from 'vitest';
import { initAllAbilities, resetAbilityInit } from '../abilities';
import { clearRegistry } from '../domain/abilityRegistry';
import { clearBaseAbilityRegistry } from '../domain/baseAbilities';
import { clearInteractionHandlers } from '../domain/abilityInteractionHandlers';
import { makeMatchState, makePlayer, makeState, applyEvents } from './helpers';
import { runCommand, defaultTestRandom } from './testRunner';
import { SU_COMMANDS, SU_EVENTS } from '../domain/types';
import { INTERACTION_COMMANDS } from '../../../engine/systems/InteractionSystem';
import { buildBuryCardEvents } from '../domain/bury';

beforeAll(() => {
    clearRegistry();
    clearBaseAbilityRegistry();
    resetAbilityInit();
    clearInteractionHandlers();
    initAllAbilities();
});

describe('bury engine', () => {
    it('at startTurn, player may uncover one buried card and play it as extra', () => {
        const core = makeState({
            turnOrder: ['0', '1'],
            currentPlayerIndex: 1, // endTurn -> startTurn will advance to player 0
            turnNumber: 1,
            players: {
                '0': makePlayer('0', { hand: [], deck: [], discard: [] }),
                '1': makePlayer('1', { hand: [], deck: [], discard: [] }),
            },
            bases: [{
                defId: 'base_a',
                minions: [],
                ongoingActions: [],
                buriedCards: [{
                    uid: 'b1',
                    defId: 'robot_warbot',
                    trueOwnerId: '0',
                    controllerId: '0',
                    buriedFrom: 'hand',
                }],
            }],
        });

        const ms0 = makeMatchState(core);
        const enter = runCommand(ms0, { type: 'ADVANCE_PHASE' as any, playerId: '1', payload: {}, timestamp: 1 } as any, defaultTestRandom);
        // onPhaseEnter(startTurn) should queue uncover interaction
        const interaction = enter.finalState.sys.interaction.current;
        expect(interaction?.data?.sourceId).toBe('bury_uncover_start_turn');
        const opt = (interaction as any).data.options.find((o: any) => o.value?.cardUid === 'b1');
        expect(opt).toBeTruthy();

        const res = runCommand(
            enter.finalState,
            { type: INTERACTION_COMMANDS.RESPOND, playerId: '0', payload: { optionId: opt.id } } as any,
            defaultTestRandom,
        );
        // buried card removed
        expect(res.finalState.core.bases[0].buriedCards?.length ?? 0).toBe(0);
        // minion now in play
        expect(res.finalState.core.bases[0].minions.some(m => m.uid === 'b1')).toBe(true);
    });

    it('base cleared discards buried cards to true owners without uncovering', () => {
        const core = makeState({
            players: {
                '0': makePlayer('0', { hand: [], deck: [], discard: [] }),
                '1': makePlayer('1', { hand: [], deck: [], discard: [] }),
            },
            bases: [{
                defId: 'base_a',
                minions: [],
                ongoingActions: [],
                buriedCards: [{
                    uid: 'b2',
                    defId: 'robot_warbot',
                    trueOwnerId: '1',
                    controllerId: '0',
                    buriedFrom: 'hand',
                }],
            }],
        });
        const core2 = applyEvents(core, [{
            type: SU_EVENTS.BASE_CLEARED,
            payload: { baseIndex: 0, baseDefId: 'base_a' },
            timestamp: 1,
        } as any]);
        expect(core2.players['1'].discard.some(c => c.uid === 'b2')).toBe(true);
    });

    it('uncovering You Can Take It With You draws three cards and discards the card', () => {
        const core = makeState({
            turnOrder: ['0', '1'],
            currentPlayerIndex: 1,
            turnNumber: 1,
            players: {
                '0': makePlayer('0', {
                    hand: [],
                    deck: [
                        { uid: 'd1', defId: 'robot_warbot', type: 'minion', owner: '0' } as any,
                        { uid: 'd2', defId: 'robot_zapbot', type: 'minion', owner: '0' } as any,
                        { uid: 'd3', defId: 'robot_microbot_alpha', type: 'minion', owner: '0' } as any,
                    ],
                    discard: [],
                }),
                '1': makePlayer('1', { hand: [], deck: [], discard: [] }),
            },
            bases: [{
                defId: 'base_pyramids',
                minions: [],
                ongoingActions: [],
                buriedCards: [{
                    uid: 'yk',
                    defId: 'ancient_egyptians_you_can_take_it_with_you',
                    trueOwnerId: '0',
                    controllerId: '0',
                    buriedFrom: 'play',
                }],
            }],
        });

        const enter = runCommand(makeMatchState(core), { type: 'ADVANCE_PHASE' as any, playerId: '1', payload: {}, timestamp: 1 } as any, defaultTestRandom);
        const interaction = enter.finalState.sys.interaction.current as any;
        const option = interaction.data.options.find((entry: any) => entry.value?.cardUid === 'yk');
        const resolved = runCommand(
            enter.finalState,
            { type: INTERACTION_COMMANDS.RESPOND, playerId: '0', payload: { optionId: option.id } } as any,
            defaultTestRandom,
        );

        expect(resolved.finalState.core.players['0'].hand).toHaveLength(3);
        expect(resolved.finalState.core.players['0'].discard.some(card => card.uid === 'yk')).toBe(true);
        expect(resolved.finalState.core.bases[0].buriedCards?.length ?? 0).toBe(0);
        expect(resolved.finalState.core.bases[0].minions).toHaveLength(0);
    });

    it('burying a card from play removes the in-play minion and attached action', () => {
        const core = makeState({
            players: {
                '0': makePlayer('0', { hand: [], deck: [], discard: [] }),
                '1': makePlayer('1', { hand: [], deck: [], discard: [] }),
            },
            bases: [{
                defId: 'base_a',
                minions: [{
                    uid: 'mummy-1',
                    defId: 'ancient_egyptians_mummy',
                    controller: '0',
                    owner: '0',
                    basePower: 2,
                    powerCounters: 0,
                    powerModifier: 0,
                    tempPowerModifier: 0,
                    talentUsed: false,
                    attachedActions: [{ uid: 'attach-1', defId: 'ninja_poison', ownerId: '1' }],
                } as any],
                ongoingActions: [],
            }],
        });

        const events = buildBuryCardEvents({
            core,
            playerId: '0',
            cardUid: 'mummy-1',
            defId: 'ancient_egyptians_mummy',
            baseIndex: 0,
            trueOwnerId: '0',
            buriedFrom: 'play',
            reason: 'test_bury_from_play',
            random: defaultTestRandom,
            now: 10,
        });
        const next = applyEvents(core, events);

        expect(next.bases[0].minions.some(minion => minion.uid === 'mummy-1')).toBe(false);
        expect(next.bases[0].buriedCards?.some(card => card.uid === 'mummy-1')).toBe(true);
        expect(next.players['1'].discard.some(card => card.uid === 'attach-1')).toBe(true);
    });
});

