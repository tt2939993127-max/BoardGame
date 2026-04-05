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
import { SMASHUP_AUDIO_CONFIG, SMASHUP_TITAN_SOUND_POLICY } from '../audio.config';
import { TITAN_CARD_DEFS } from '../data/titans';

const CARD_SCROLL_KEY = 'card.handling.decks_and_cards_sound_fx_pack.cards_scrolling_001';
const BURY_KEY = 'magic.general.spells_variations_vol_3.stonebound_summon.magspel_stonebound_summon_01_krst_none';
const UNEARTH_KEY = 'system.general.casual_mobile_sound_fx_pack_vol.interactions.misc_interactions.shovel_and_dig';
const BURIED_RETURN_TO_HAND_KEY = 'magic.general.spells_variations_vol_1.close_temporal_rift_summoning.magspel_close_temporal_rift_summoning_01_krst';
const SPHINX_TITAN_PLAY_KEY = 'magic.general.spells_variations_vol_3.stonebound_summon.magspel_stonebound_summon_02_krst_none';
const SPHINX_TITAN_MOVE_KEY = 'magic.general.spells_variations_vol_2.breeze_of_the_ancients.magelem_breeze_of_the_ancients_01_krst_none';
const PECOS_BILL_TITAN_PLAY_KEY = 'combat.general.mini_games_sound_effects_and_music_pack.gun.shoot.sfx_gun_generic_a_shoot_2';
const PECOS_BILL_TITAN_MOVE_KEY = 'combat.general.mini_games_sound_effects_and_music_pack.gun.reload.sfx_gun_mechanic_set_a';
const RAINBOROC_TITAN_PLAY_KEY = 'dark_fantasy_studio.birds.birds_1';
const RAINBOROC_TITAN_MOVE_KEY = 'dark_fantasy_studio.birds.birds_2';
const EMPEROR_PENGUIN_TITAN_PLAY_KEY = 'dark_fantasy_studio.birds.birds_3';
const EMPEROR_PENGUIN_TITAN_MOVE_KEY = 'dark_fantasy_studio.birds.birds_4';
const BIG_FUNNY_GIANT_TITAN_PLAY_KEY = 'monster.general.khron_studio_monster_library_vol_4_assets.behemoth.behemoth_roar.creamnstr_behemoth_roar_01';
const MOON_ZERO_THREE_TITAN_PLAY_KEY = 'cyberpunk.cyberpunk_sound_fx_pack_vol.drones.hover_thing_approach';
const MOON_ZERO_THREE_TITAN_MOVE_KEY = 'cyberpunk.cyberpunk_sound_fx_pack_vol.drones.hover_thing_passing';
const VAMPIRE_TITAN_MOVE_KEY = 'magic.general.modern_magic_sound_fx_pack_vol.dark_magic.dark_magic_grave_whisper_004';
const WEREWOLF_TITAN_MOVE_KEY = 'fantasy.gothic_fantasy_sound_fx_pack_vol.creatures.werewolf_attack_004';
const WIZARD_TITAN_MOVE_KEY = 'magic.general.spells_variations_vol_3.shield_blessing.magspel_shield_blessing_01_krst_none';
const SAMURAI_ACTION_KEY = 'combat.general.forged_in_fury_vol_1.katana.katana_only_hit_layer_with_metal.fghtimpt_katana_only_hit_layer_with_metal_07_krst';
const ANCIENT_EGYPTIANS_TOMB_TRAP_KEY = 'magic.general.simple_magic_sound_fx_pack_vol.nature.summon_bramble_trap';
const COWBOYS_DYNAMITE_SURPRISE_KEY = 'puzzle.24.bomb_explosion_01';
const SAMURAI_HONORABLE_COMBAT_KEY = 'combat.general.forged_in_fury_vol_1.katana.katana_only_hit_layer_with_metal.fghtimpt_katana_only_hit_layer_with_metal_09_krst';
const VIKINGS_CAST_THE_RUNES_KEY = 'magic.general.spells_variations_vol_2.rune_blastwave.magspel_rune_blastwave_01_krst_none';

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

        const buriedSound = SMASHUP_AUDIO_CONFIG.feedbackResolver({
            type: SU_EVENTS.CARD_BURIED,
            payload: { defId: 'ancient_egyptians_mummy' },
        } as any, context);
        expect(buriedSound).toBe(BURY_KEY);
        expect(buriedSound).not.toBe(CARD_SCROLL_KEY);

        expect(SMASHUP_AUDIO_CONFIG.feedbackResolver({
            type: SU_EVENTS.BURIED_CARD_UNCOVERED,
            payload: { defId: 'ancient_egyptians_mummy' },
        } as any, context)).toBe(UNEARTH_KEY);
        expect(SMASHUP_AUDIO_CONFIG.feedbackResolver({
            type: SU_EVENTS.BURIED_CARD_UNCOVERED,
            payload: { defId: 'ancient_egyptians_mummy' },
        } as any, context)).not.toBe(CARD_SCROLL_KEY);

        expect(SMASHUP_AUDIO_CONFIG.feedbackResolver({
            type: SU_EVENTS.BURIED_CARD_RETURNED_TO_HAND,
            payload: { defId: 'ancient_egyptians_mummy' },
        } as any, context)).toBe(BURIED_RETURN_TO_HAND_KEY);
        expect(SMASHUP_AUDIO_CONFIG.feedbackResolver({
            type: SU_EVENTS.BURIED_CARD_RETURNED_TO_HAND,
            payload: { defId: 'ancient_egyptians_mummy' },
        } as any, context)).not.toBe(UNEARTH_KEY);

        expect(SMASHUP_AUDIO_CONFIG.feedbackResolver({
            type: SU_EVENTS.TITAN_PLAYED,
            payload: { defId: 'sphinx' },
        } as any, context)).toBe(SPHINX_TITAN_PLAY_KEY);
        expect(SMASHUP_AUDIO_CONFIG.feedbackResolver({
            type: SU_EVENTS.TITAN_MOVED,
            payload: { defId: 'sphinx' },
        } as any, context)).toBe(SPHINX_TITAN_MOVE_KEY);
        expect(SMASHUP_AUDIO_CONFIG.feedbackResolver({
            type: SU_EVENTS.TITAN_PLAYED,
            payload: { defId: 'pecos_bill' },
        } as any, context)).toBe(PECOS_BILL_TITAN_PLAY_KEY);
        expect(SMASHUP_AUDIO_CONFIG.feedbackResolver({
            type: SU_EVENTS.TITAN_MOVED,
            payload: { defId: 'pecos_bill' },
        } as any, context)).toBe(PECOS_BILL_TITAN_MOVE_KEY);
        expect(SMASHUP_AUDIO_CONFIG.feedbackResolver({
            type: SU_EVENTS.TITAN_PLAYED,
            payload: { defId: 'penguins_emperor_penguin' },
        } as any, context)).toBe(EMPEROR_PENGUIN_TITAN_PLAY_KEY);
        expect(SMASHUP_AUDIO_CONFIG.feedbackResolver({
            type: SU_EVENTS.TITAN_PLAYED,
            payload: { defId: 'tricksters_big_funny_giant' },
        } as any, context)).toBe(BIG_FUNNY_GIANT_TITAN_PLAY_KEY);
        expect(SMASHUP_AUDIO_CONFIG.feedbackResolver({
            type: SU_EVENTS.TITAN_PLAYED,
            payload: { defId: 'super_spies_moon_zero_three' },
        } as any, context)).toBe(MOON_ZERO_THREE_TITAN_PLAY_KEY);
        expect(SMASHUP_AUDIO_CONFIG.feedbackResolver({
            type: SU_EVENTS.TITAN_MOVED,
            payload: { defId: 'wizards_arcane_protector' },
        } as any, context)).toBe(WIZARD_TITAN_MOVE_KEY);
        expect(SMASHUP_AUDIO_CONFIG.feedbackResolver({
            type: SU_EVENTS.TITAN_PLAYED,
            payload: { defId: 'explorers_very_large_boulder' },
        } as any, context)).not.toBe(CARD_SCROLL_KEY);
        expect(SMASHUP_AUDIO_CONFIG.feedbackResolver({
            type: SU_EVENTS.TITAN_MOVED,
            payload: { defId: 'pirates_the_kraken' },
        } as any, context)).not.toBe(CARD_SCROLL_KEY);

        expect(SMASHUP_AUDIO_CONFIG.feedbackResolver({
            type: SU_EVENTS.MINION_PLAYED,
            payload: { defId: 'ancient_egyptians_mummy' },
        } as any, context)).toBeTruthy();

        expect(SMASHUP_AUDIO_CONFIG.feedbackResolver({
            type: SU_EVENTS.ACTION_PLAYED,
            payload: { defId: 'cowboys_high_noon' },
        } as any, context)).toBeTruthy();

        expect(SMASHUP_AUDIO_CONFIG.feedbackResolver({
            type: SU_EVENTS.ACTION_PLAYED,
            payload: { defId: 'ancient_egyptians_tomb_trap' },
        } as any, context)).toBe(ANCIENT_EGYPTIANS_TOMB_TRAP_KEY);
        expect(SMASHUP_AUDIO_CONFIG.feedbackResolver({
            type: SU_EVENTS.ACTION_PLAYED,
            payload: { defId: 'cowboys_dynamite_surprise' },
        } as any, context)).toBe(COWBOYS_DYNAMITE_SURPRISE_KEY);
        expect(SMASHUP_AUDIO_CONFIG.feedbackResolver({
            type: SU_EVENTS.ACTION_PLAYED,
            payload: { defId: 'samurai_honorable_combat' },
        } as any, context)).toBe(SAMURAI_HONORABLE_COMBAT_KEY);
        expect(SMASHUP_AUDIO_CONFIG.feedbackResolver({
            type: SU_EVENTS.ACTION_PLAYED,
            payload: { defId: 'vikings_cast_the_runes' },
        } as any, context)).toBe(VIKINGS_CAST_THE_RUNES_KEY);

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
            SAMURAI_ACTION_KEY,
            ANCIENT_EGYPTIANS_TOMB_TRAP_KEY,
            COWBOYS_DYNAMITE_SURPRISE_KEY,
            SAMURAI_HONORABLE_COMBAT_KEY,
            VIKINGS_CAST_THE_RUNES_KEY,
            SPHINX_TITAN_PLAY_KEY,
            PECOS_BILL_TITAN_MOVE_KEY,
        ]));
    });

    it('所有泰坦都必须显式声明 play/move 音频策略', () => {
        const titanIds = TITAN_CARD_DEFS.map(def => def.id).sort();
        const policyIds = Object.keys(SMASHUP_TITAN_SOUND_POLICY).sort();
        expect(policyIds).toEqual(titanIds);
        expect(SMASHUP_TITAN_SOUND_POLICY.sphinx.play).toBe(SPHINX_TITAN_PLAY_KEY);
        expect(SMASHUP_TITAN_SOUND_POLICY.pecos_bill.move).toBe(PECOS_BILL_TITAN_MOVE_KEY);
        expect(SMASHUP_TITAN_SOUND_POLICY.itty_critters_rainboroc).toEqual({
            play: RAINBOROC_TITAN_PLAY_KEY,
            move: RAINBOROC_TITAN_MOVE_KEY,
        });
        expect(SMASHUP_TITAN_SOUND_POLICY.penguins_emperor_penguin).toEqual({
            play: EMPEROR_PENGUIN_TITAN_PLAY_KEY,
            move: EMPEROR_PENGUIN_TITAN_MOVE_KEY,
        });
        expect(SMASHUP_TITAN_SOUND_POLICY.tricksters_big_funny_giant.play).toBe(BIG_FUNNY_GIANT_TITAN_PLAY_KEY);
        expect(SMASHUP_TITAN_SOUND_POLICY.super_spies_moon_zero_three).toEqual({
            play: MOON_ZERO_THREE_TITAN_PLAY_KEY,
            move: MOON_ZERO_THREE_TITAN_MOVE_KEY,
        });
        expect(SMASHUP_TITAN_SOUND_POLICY.kaiju_gorgodzolla.move).not.toBe('generic');
        expect(SMASHUP_TITAN_SOUND_POLICY.vampires_ancient_lord.move).toBe(VAMPIRE_TITAN_MOVE_KEY);
        expect(SMASHUP_TITAN_SOUND_POLICY.werewolves_great_wolf_spirit.move).toBe(WEREWOLF_TITAN_MOVE_KEY);
        expect(SMASHUP_TITAN_SOUND_POLICY.wizards_arcane_protector.move).toBe(WIZARD_TITAN_MOVE_KEY);
        expect(
            Object.entries(SMASHUP_TITAN_SOUND_POLICY)
                .filter(([, policy]) => policy.play === 'generic' || policy.move === 'generic'),
        ).toEqual([]);
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

