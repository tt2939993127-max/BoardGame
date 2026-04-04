import { beforeAll, describe, expect, it } from 'vitest';
import { initAllAbilities, resetAbilityInit } from '../abilities';
import { clearRegistry } from '../domain/abilityRegistry';
import { clearBaseAbilityRegistry } from '../domain/baseAbilities';
import { clearInteractionHandlers } from '../domain/abilityInteractionHandlers';
import { makeMatchState, makePlayer, makeState, applyEvents } from './helpers';
import { runCommand, defaultTestRandom } from './testRunner';
import { SU_COMMANDS, SU_EVENTS } from '../domain/types';
import { INTERACTION_COMMANDS } from '../../../engine/systems/InteractionSystem';
import { buildBuryCardEvents, buildBuriedCardReturnedToHandEvent } from '../domain/bury';
import { SMASHUP_AUDIO_CONFIG } from '../audio.config';

beforeAll(() => {
    clearRegistry();
    clearBaseAbilityRegistry();
    resetAbilityInit();
    clearInteractionHandlers();
    initAllAbilities();
});

describe('bury engine', () => {
    it('audio config wires bury, uncover, and new faction feedback', () => {
        const context = {
            G: undefined,
            ctx: { currentPhase: 'playCards', isGameOver: false },
            meta: {},
        } as any;

        expect(SMASHUP_AUDIO_CONFIG.feedbackResolver({
            type: SU_EVENTS.CARD_BURIED,
            payload: { defId: 'ancient_egyptians_mummy' },
        } as any, context)).toBe('card.handling.decks_and_cards_sound_fx_pack.cards_scrolling_001');

        expect(SMASHUP_AUDIO_CONFIG.feedbackResolver({
            type: SU_EVENTS.BURIED_CARD_UNCOVERED,
            payload: { defId: 'ancient_egyptians_mummy' },
        } as any, context)).toBe('card.handling.decks_and_cards_sound_fx_pack.card_take_001');

        expect(SMASHUP_AUDIO_CONFIG.feedbackResolver({
            type: SU_EVENTS.MINION_PLAYED,
            payload: { defId: 'ancient_egyptians_mummy' },
        } as any, context)).toBeTruthy();

        expect(SMASHUP_AUDIO_CONFIG.feedbackResolver({
            type: SU_EVENTS.ACTION_PLAYED,
            payload: { defId: 'cowboys_high_noon' },
        } as any, context)).toBeTruthy();

        expect(SMASHUP_AUDIO_CONFIG.feedbackResolver({
            type: SU_EVENTS.TALENT_USED,
            payload: { defId: 'ancient_egyptians_pyramid_engineer' },
        } as any, context)).toBeTruthy();

        expect(SMASHUP_AUDIO_CONFIG.contextualPreloadKeys?.({
            G: makeState({
                players: {
                    '0': makePlayer('0', { factions: ['ancient_egyptians', 'samurai_pod'] as any }),
                    '1': makePlayer('1', { factions: ['cowboys_pod', 'vikings'] as any }),
                },
            }),
            ctx: { currentPhase: 'playCards', isGameOver: false },
            meta: {},
        } as any)).toEqual(expect.arrayContaining([
            'magic.general.spells_variations_vol_3.stonebound_summon.magspel_stonebound_summon_01_krst_none',
            'combat.general.forged_in_fury_vol_1.katana.double_katana_whoosh.dsgnwhsh_double_katana_whoosh_01_krst',
            'combat.general.mini_games_sound_effects_and_music_pack.gun.shoot.sfx_gun_generic_a_shoot_1',
            'combat.general.forged_in_fury_vol_1.heavy_axe.heavy_axe_short_whoosh.weapaxe_heavy_axe_short_whoosh_01_krst',
        ]));
    });

    it('playing You Can Take It With You requires a chosen base and buries onto that base', () => {
        const core = makeState({
            players: {
                '0': makePlayer('0', {
                    hand: [{ uid: 'yk-play', defId: 'ancient_egyptians_you_can_take_it_with_you', type: 'action', owner: '0' } as any],
                    deck: [],
                    discard: [],
                    factions: ['ancient_egyptians', 'robots'] as any,
                }),
                '1': makePlayer('1', { hand: [], deck: [], discard: [] }),
            },
            bases: [
                { defId: 'base_a', minions: [], ongoingActions: [] },
                { defId: 'base_pyramids', minions: [], ongoingActions: [] },
            ],
        });

        const result = runCommand(
            makeMatchState(core),
            { type: SU_COMMANDS.PLAY_ACTION, playerId: '0', payload: { cardUid: 'yk-play', targetBaseIndex: 1 } } as any,
            defaultTestRandom,
        );

        expect(result.success).toBe(true);
        expect(result.finalState.core.players['0'].hand.some(card => card.uid === 'yk-play')).toBe(false);
        expect(result.finalState.core.bases[0].buriedCards?.some(card => card.uid === 'yk-play') ?? false).toBe(false);
        expect(result.finalState.core.bases[1].buriedCards?.some(card => card.uid === 'yk-play') ?? false).toBe(true);
    });

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

    it('at startTurn, uncovering a buried onTurnStart minion should still resolve in the same window', () => {
        const core = makeState({
            turnOrder: ['0', '1'],
            currentPlayerIndex: 1,
            turnNumber: 1,
            players: {
                '0': makePlayer('0', {
                    hand: [],
                    deck: [{ uid: 'draw-1', defId: 'robot_warbot', type: 'minion', owner: '0' } as any],
                    discard: [],
                }),
                '1': makePlayer('1', { hand: [], deck: [], discard: [] }),
            },
            bases: [{
                defId: 'base_a',
                minions: [],
                ongoingActions: [],
                buriedCards: [{
                    uid: 'wl-buried',
                    defId: 'killer_plant_water_lily_pod',
                    trueOwnerId: '0',
                    controllerId: '0',
                    buriedFrom: 'hand',
                }],
            }],
        });

        const enter = runCommand(
            makeMatchState(core),
            { type: 'ADVANCE_PHASE' as any, playerId: '1', payload: {}, timestamp: 10 } as any,
            defaultTestRandom,
        );

        const interaction = enter.finalState.sys.interaction.current as any;
        expect(interaction?.data?.sourceId).toBe('bury_uncover_start_turn');
        const option = interaction.data.options.find((entry: any) => entry.value?.cardUid === 'wl-buried');
        expect(option).toBeTruthy();

        const resolved = runCommand(
            enter.finalState,
            { type: INTERACTION_COMMANDS.RESPOND, playerId: '0', payload: { optionId: option.id }, timestamp: 11 } as any,
            defaultTestRandom,
        );

        expect(resolved.success).toBe(true);
        const drawEvents = resolved.events.filter(event => event.type === SU_EVENTS.CARDS_DRAWN);
        expect(drawEvents).toHaveLength(1);
        expect((drawEvents[0] as any).payload.cardUids).toEqual(['draw-1']);
        expect(resolved.finalState.core.players['0'].hand.map(card => card.uid)).toEqual(['draw-1']);
        expect(resolved.finalState.core.bases[0].minions.some(m => m.uid === 'wl-buried')).toBe(true);
        expect(resolved.finalState.sys.phase).toBe('playCards');
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

    it('BURIED_CARD_RETURNED_TO_HAND 会把埋葬牌直接移回手牌而不翻开或进弃牌堆', () => {
        const core = makeState({
            players: {
                '0': makePlayer('0', { hand: [], deck: [], discard: [] }),
                '1': makePlayer('1', { hand: [], deck: [], discard: [] }),
            },
            bases: [{
                defId: 'base_pyramids',
                minions: [],
                ongoingActions: [],
                buriedCards: [{
                    uid: 'buried-return',
                    defId: 'robot_warbot',
                    trueOwnerId: '0',
                    controllerId: '0',
                    buriedFrom: 'hand',
                }],
            }],
        });

        const event = buildBuriedCardReturnedToHandEvent({
            core,
            playerId: '0',
            cardUid: 'buried-return',
            baseIndex: 0,
            source: 'sphinx-start-turn',
            now: 20,
        });
        expect(event).toBeDefined();

        const next = applyEvents(core, [event!]);
        expect(next.bases[0].buriedCards?.some(card => card.uid === 'buried-return') ?? false).toBe(false);
        expect(next.players['0'].hand).toEqual(expect.arrayContaining([
            expect.objectContaining({
                uid: 'buried-return',
                defId: 'robot_warbot',
                owner: '0',
            }),
        ]));
        expect(next.players['0'].discard).toHaveLength(0);
        expect(next.bases[0].minions).toHaveLength(0);
    });
});

