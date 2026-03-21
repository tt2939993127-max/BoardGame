import { beforeAll, describe, expect, it } from 'vitest';
import { initAllAbilities, resetAbilityInit } from '../abilities';
import { clearRegistry } from '../domain/abilityRegistry';
import { clearBaseAbilityRegistry } from '../domain/baseAbilities';
import { clearInteractionHandlers } from '../domain/abilityInteractionHandlers';
import { makeMatchState, makePlayer, makeState, applyEvents } from './helpers';
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
});

