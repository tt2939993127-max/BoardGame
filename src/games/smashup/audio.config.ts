/**
 * 大杀四方 (Smash Up) 音频配置
 * 仅保留事件解析/规则，音效资源统一来自 registry
 */
import type { GameAudioConfig } from '../../lib/audio/types';
import { createFeedbackResolver, collectPreloadKeys } from '../../lib/audio/defineEvents';
import { pickRandomSoundKey } from '../../lib/audio/audioUtils';
import type { FactionId, GamePhase, SmashUpCore } from './domain/types';
import { SU_EVENTS, SU_EVENT_TYPES } from './domain/events';
import { SMASHUP_FACTION_IDS } from './domain/ids';
import { getCardDef, getFactionCards, getFactionTitans, getTitanDef } from './data/cards';

type SmashUpAudioCtx = {
    currentPhase: GamePhase;
    isGameOver: boolean;
    isWinner?: boolean;
};

const BGM_NORMAL_KEY = 'bgm.general.casual_music_pack_vol.tiki_party_rt_2.casual_tiki_party_main';
const BGM_BATTLE_KEY = 'bgm.funk.funk_music_pack.move_your_feet_rt_2.funk_move_your_feet_main';
const BGM_BUBBLEGUM_KEY = 'bgm.general.casual_music_pack_vol.bubblegum_rt_2.casual_bubblegum_main';
const BGM_FIELD_DAY_KEY = 'bgm.general.casual_music_pack_vol.field_day_rt_2.casual_field_day_main';
const BGM_LIZARDS_KEY = 'bgm.general.casual_music_pack_vol.lizards_rt_1.casual_lizards_main';
const BGM_BUBBLEGUM_INTENSE_KEY = 'bgm.general.casual_music_pack_vol.bubblegum_rt_2.casual_bubblegum_intensity_2';
const BGM_FIELD_DAY_INTENSE_KEY = 'bgm.general.casual_music_pack_vol.field_day_rt_2.casual_field_day_intensity_2';
const BGM_SUNSET_KEY = 'bgm.general.casual_music_pack_vol.sunset_rt_1.casual_sunset_main';
const BGM_SUNSET_INTENSE_KEY = 'bgm.general.casual_music_pack_vol.sunset_rt_1.casual_sunset_intensity_2';
const BGM_SUNNY_DAYS_KEY = 'bgm.funk.funk_music_pack.sunny_days_rt_2.funk_sunny_days_main';
const BGM_SUNNY_DAYS_INTENSE_KEY = 'bgm.funk.funk_music_pack.sunny_days_rt_2.funk_sunny_days_intensity_2';
const BGM_BIG_SHOT_KEY = 'bgm.funk.funk_music_pack.big_shot_rt_4.funk_big_shot_main';
const BGM_BIG_SHOT_INTENSE_KEY = 'bgm.funk.funk_music_pack.big_shot_rt_4.funk_big_shot_intensity_2';
const BGM_MOVE_YOUR_FEET_INTENSE_KEY = 'bgm.funk.funk_music_pack.move_your_feet_rt_2.funk_move_your_feet_intensity_2';
const BGM_TIKI_INTENSE_KEY = 'bgm.general.casual_music_pack_vol.tiki_party_rt_2.casual_tiki_party_intensity_2';
const BGM_NOBODY_KNOWS_KEY = 'bgm.funk.funk_music_pack.nobody_knows_rt_4.funk_nobody_knows_intensity_1';
const BGM_NOBODY_KNOWS_INTENSE_KEY = 'bgm.funk.funk_music_pack.nobody_knows_rt_4.funk_nobody_knows_intensity_2';
const STINGER_WIN_KEY = 'stinger.mini_games_sound_effects_and_music_pack.stinger.stgr_action_win';
const STINGER_LOSE_KEY = 'stinger.mini_games_sound_effects_and_music_pack.stinger.stgr_action_lose';

const UNEARTH_KEY = 'system.general.casual_mobile_sound_fx_pack_vol.interactions.misc_interactions.shovel_and_dig';
const BURIED_RETURN_TO_HAND_KEY = 'magic.general.spells_variations_vol_1.close_temporal_rift_summoning.magspel_close_temporal_rift_summoning_01_krst';

const MOVE_KEY = 'card.handling.mini_games_sound_effects_and_music_pack.card.sfx_card_play_1';
const MADNESS_KEY = 'magic.dark.32.dark_spell_01';
const SPHINX_TITAN_PLAY_KEY = 'magic.general.spells_variations_vol_3.stonebound_summon.magspel_stonebound_summon_02_krst_none';
const SPHINX_TITAN_MOVE_KEY = 'magic.general.spells_variations_vol_2.breeze_of_the_ancients.magelem_breeze_of_the_ancients_01_krst_none';
const PECOS_BILL_TITAN_PLAY_KEY = 'combat.general.mini_games_sound_effects_and_music_pack.gun.shoot.sfx_gun_generic_a_shoot_2';
const PECOS_BILL_TITAN_MOVE_KEY = 'combat.general.mini_games_sound_effects_and_music_pack.gun.reload.sfx_gun_mechanic_set_a';
const BEAR_CAVALRY_TITAN_PLAY_KEY = 'monster.general.files.10.growl_with_slobber_01';
const BEAR_CAVALRY_TITAN_MOVE_KEY = 'monster.general.files.9.growl_01';
const GHOST_TITAN_PLAY_KEY = 'dark_fantasy_studio.ghostly.ghostly_33';
const GHOST_TITAN_MOVE_KEY = 'dark_fantasy_studio.ghostly.ghostly_34';
const CHANGERBOTS_TITAN_PLAY_KEY = 'cyberpunk.cyberpunk_sound_fx_pack_vol.android_esque.robotic_limb_single_a3';
const CHANGERBOTS_TITAN_MOVE_KEY = 'cyberpunk.cyberpunk_sound_fx_pack_vol.android_esque.robotic_limb_single_a1';
const BOULDER_TITAN_PLAY_KEY = 'magic.general.spells_variations_vol_2.stonecrash_impact.magelem_stonecrash_impact_01_krst_none';
const HEAVY_OBJECT_MOVE_KEY = 'system.general.casual_mobile_sound_fx_pack_vol.interactions.puzzles.heavy_object_move';
const PUZZLE_HEAVY_OBJECT_MOVE_KEY = 'system.general.casual_mobile_sound_fx_pack_vol.interactions.puzzles.puzzle_heavy_object_move';
const GIANT_ANT_TITAN_PLAY_KEY = 'cyberpunk.cyberpunk_sound_fx_pack_vol.buzz_and_hum.buzzing';
const GIANT_ANT_TITAN_MOVE_KEY = 'cyberpunk.cyberpunk_sound_fx_pack_vol.buzz_and_hum.buzz_and_hum_a';
const INNSMOUTH_TITAN_PLAY_KEY = 'magic.general.modern_magic_sound_fx_pack_vol.water_magic.water_magic_maelstrom_roar_004';
const INNSMOUTH_TITAN_MOVE_KEY = 'magic.general.modern_magic_sound_fx_pack_vol.water_magic.water_magic_tidal_rush_004';
const KAIJU_TITAN_PLAY_KEY = 'monster.general.files.15.long_roar_01';
const RAINBOROC_TITAN_PLAY_KEY = 'dark_fantasy_studio.birds.birds_1';
const RAINBOROC_TITAN_MOVE_KEY = 'dark_fantasy_studio.birds.birds_2';
const EMPEROR_PENGUIN_TITAN_PLAY_KEY = 'dark_fantasy_studio.birds.birds_3';
const EMPEROR_PENGUIN_TITAN_MOVE_KEY = 'dark_fantasy_studio.birds.birds_4';
const BIG_FUNNY_GIANT_TITAN_PLAY_KEY = 'monster.general.khron_studio_monster_library_vol_4_assets.behemoth.behemoth_roar.creamnstr_behemoth_roar_01';
const MOON_ZERO_THREE_TITAN_PLAY_KEY = 'cyberpunk.cyberpunk_sound_fx_pack_vol.drones.hover_thing_approach';
const MOON_ZERO_THREE_TITAN_MOVE_KEY = 'cyberpunk.cyberpunk_sound_fx_pack_vol.drones.hover_thing_passing';
const VAMPIRE_TITAN_MOVE_KEY = 'magic.general.modern_magic_sound_fx_pack_vol.dark_magic.dark_magic_grave_whisper_004';
const WEREWOLF_TITAN_MOVE_KEY = 'fantasy.gothic_fantasy_sound_fx_pack_vol.creatures.werewolf_attack_004';
const MEGABOT_TITAN_PLAY_KEY = 'cyberpunk.cyberpunk_sound_fx_pack_vol.android_esque.robotic_limb_single_a4';
const MEGABOT_TITAN_MOVE_KEY = 'cyberpunk.cyberpunk_sound_fx_pack_vol.android_esque.robotic_limb_single_a1';
const CTHULHU_TITAN_PLAY_KEY = 'magic.general.modern_magic_sound_fx_pack_vol.water_magic.water_magic_maelstrom_roar_001';
const CTHULHU_TITAN_MOVE_KEY = 'magic.general.modern_magic_sound_fx_pack_vol.water_magic.water_magic_tidal_rush_001';
const VAMPIRE_TITAN_PLAY_KEY = 'magic.general.modern_magic_sound_fx_pack_vol.dark_magic.dark_magic_shadow_wail_001';
const WEREWOLF_TITAN_PLAY_KEY = 'fantasy.gothic_fantasy_sound_fx_pack_vol.creatures.werewolf_attack_001';
const WIZARD_TITAN_PLAY_KEY = 'magic.general.spells_variations_vol_1.arcane_blast.magspel_arcane_blast_01_krst';
const WIZARD_TITAN_MOVE_KEY = 'magic.general.spells_variations_vol_3.shield_blessing.magspel_shield_blessing_01_krst_none';
const KRAKEN_TITAN_PLAY_KEY = 'magic.general.modern_magic_sound_fx_pack_vol.water_magic.water_magic_maelstrom_roar_001';
const KRAKEN_TITAN_MOVE_KEY = 'magic.general.modern_magic_sound_fx_pack_vol.water_magic.water_magic_tidal_rush_001';
const TIME_BOX_TITAN_PLAY_KEY = 'magic.general.spells_variations_vol_1.temporal_rift_summoning.magspel_temporal_rift_summoning_krst';
const TIME_BOX_TITAN_MOVE_KEY = 'magic.general.spells_variations_vol_1.temporal_rift_whoosh.magspel_temporal_rift_whoosh_01_krst';

// 僵尸随从：DFS zombie_voices（语义高度匹配）
const ZOMBIE_MINION_KEYS = [
    'dark_fantasy_studio.zombie_voices.zombies_1',
];
// 僵尸行动：保留原有暗影哀嚎/墓穴低语
const ZOMBIE_ACTION_KEYS = [
    'magic.general.modern_magic_sound_fx_pack_vol.dark_magic.dark_magic_shadow_wail_001',
    'magic.general.modern_magic_sound_fx_pack_vol.dark_magic.dark_magic_shadow_wail_002',
    'magic.general.modern_magic_sound_fx_pack_vol.dark_magic.dark_magic_grave_whisper_003',
];
const WIZARD_MINION_KEYS = [
    'magic.general.spells_variations_vol_1.arcane_blast.magspel_arcane_blast_01_krst',
    'magic.general.spells_variations_vol_1.arcane_blast.magspel_arcane_blast_02_krst',
    'magic.general.spells_variations_vol_1.arcane_blast.magspel_arcane_blast_03_krst',
];
const WIZARD_ACTION_KEYS = [
    'magic.general.spells_variations_vol_1.little_arcane_blast.magspel_little_arcane_blast_01_krst',
    'magic.general.spells_variations_vol_1.little_arcane_blast.magspel_little_arcane_blast_02_krst',
    'magic.general.spells_variations_vol_1.little_arcane_blast.magspel_little_arcane_blast_03_krst',
];
const DINO_MINION_KEYS = [
    'monster.general.files.14.short_roar_01',
    'monster.general.files.14.short_roar_02',
    'monster.general.files.15.long_roar_01',
];
const DINO_ACTION_KEYS = [
    'magic.general.spells_variations_vol_2.beastly_chomp.creamnstr_beastly_chomp_01_krst_none',
    'magic.general.spells_variations_vol_2.beastly_chomp.creamnstr_beastly_chomp_02_krst_none',
    'magic.fire.3.fire_earthquake',
];
const ALIEN_MINION_KEYS = [
    'combat.general.mini_games_sound_effects_and_music_pack.gun.shoot.sfx_gun_scifi_charge_generic_1',
    'combat.general.mini_games_sound_effects_and_music_pack.gun.shoot.sfx_gun_scifi_charge_generic_2',
    'combat.general.mini_games_sound_effects_and_music_pack.gun.shoot.sfx_gun_scifi_charge_generic_3',
];
const ALIEN_ACTION_KEYS = [
    'combat.general.mini_games_sound_effects_and_music_pack.gun.shoot.sfx_gun_scifi_shoot_1',
    'combat.general.mini_games_sound_effects_and_music_pack.gun.shoot.sfx_gun_scifi_shoot_2',
    'combat.general.mini_games_sound_effects_and_music_pack.gun.shoot.sfx_gun_scifi_shoot_3',
];
const PIRATE_MINION_KEYS = [
    'combat.general.mini_games_sound_effects_and_music_pack.gun.shoot.sfx_gun_retro_shoot_1',
    'combat.general.mini_games_sound_effects_and_music_pack.gun.shoot.sfx_gun_retro_shoot_2',
    'combat.general.mini_games_sound_effects_and_music_pack.gun.shoot.sfx_gun_retro_shoot_3',
];
const PIRATE_ACTION_KEYS = [
    'combat.general.mini_games_sound_effects_and_music_pack.gun.shoot.sfx_gun_generic_b_shoot_1',
    'combat.general.mini_games_sound_effects_and_music_pack.gun.shoot.sfx_gun_generic_b_shoot_2',
    'combat.general.mini_games_sound_effects_and_music_pack.gun.shoot.sfx_gun_generic_b_shoot_3',
];
const NINJA_MINION_KEYS = [
    'combat.general.forged_in_fury_vol_1.katana.double_katana_whoosh.dsgnwhsh_double_katana_whoosh_01_krst',
    'combat.general.forged_in_fury_vol_1.katana.double_katana_whoosh.dsgnwhsh_double_katana_whoosh_02_krst',
    'combat.general.forged_in_fury_vol_1.katana.double_katana_whoosh.dsgnwhsh_double_katana_whoosh_03_krst',
];
const NINJA_ACTION_KEYS = [
    'combat.general.forged_in_fury_vol_1.katana.katana_only_hit_layer.fghtimpt_katana_only_hit_layer_01_krst',
    'combat.general.forged_in_fury_vol_1.katana.katana_only_hit_layer.fghtimpt_katana_only_hit_layer_02_krst',
    'combat.general.forged_in_fury_vol_1.katana.katana_only_hit_layer.fghtimpt_katana_only_hit_layer_03_krst',
];
const ROBOT_MINION_KEYS = [
    'cyberpunk.cyberpunk_sound_fx_pack_vol.android_esque.robotic_limb_single_a3',
    'cyberpunk.cyberpunk_sound_fx_pack_vol.android_esque.robotic_limb_single_a4',
    'cyberpunk.cyberpunk_sound_fx_pack_vol.android_esque.robotic_limb_single_b2',
];
const ROBOT_ACTION_KEYS = [
    'cyberpunk.cyberpunk_sound_fx_pack_vol.android_esque.robotic_limb_single_a1',
    'cyberpunk.cyberpunk_sound_fx_pack_vol.android_esque.robotic_limb_single_a2',
    'cyberpunk.cyberpunk_sound_fx_pack_vol.android_esque.robotic_limb_single_b1',
];
// 幽灵随从：DFS ghostly 系列（语义匹配，最短音效）
const GHOST_MINION_KEYS = [
    'dark_fantasy_studio.ghostly.ghostly_33',
    'dark_fantasy_studio.ghostly.ghostly_34',
    'dark_fantasy_studio.ghostly.ghostly_35',
];
const GHOST_ACTION_KEYS = [
    'magic.general.spells_variations_vol_3.wailing_rite.magevil_wailing_rite_04_krst_none',
    'magic.general.spells_variations_vol_3.wailing_rite.magevil_wailing_rite_05_krst_none',
    'magic.general.spells_variations_vol_3.wailing_rite.magevil_wailing_rite_06_krst_none',
];
const TRICKSTER_MINION_KEYS = [
    'monster.general.khron_studio_monster_library_vol_3_assets.goblin.goblin_attack.creahmn_goblin_attack_01',
    'monster.general.khron_studio_monster_library_vol_3_assets.goblin.goblin_attack.creahmn_goblin_attack_02',
    'monster.general.khron_studio_monster_library_vol_3_assets.goblin.goblin_attack.creahmn_goblin_attack_03',
];
const TRICKSTER_ACTION_KEYS = [
    'magic.general.spells_variations_vol_2.twinkle_tweak.magspel_twinkle_tweak_01_krst_none',
    'magic.general.spells_variations_vol_2.twinkle_tweak.magspel_twinkle_tweak_02_krst_none',
    'magic.general.spells_variations_vol_2.twinkle_tweak.magspel_twinkle_tweak_03_krst_none',
];
// 蒸汽朋克：DFS steam 系列（最短音效，随从/行动各一个）
const STEAMPUNK_MINION_KEYS = [
    'dark_fantasy_studio.steam.steam_26',
];
const STEAMPUNK_ACTION_KEYS = [
    'dark_fantasy_studio.steam.steam_28',
];
const KILLER_PLANT_MINION_KEYS = [
    'ambient.khron_studio_sound_of_survival_vol_1_assets.items.item_or_weapon_hit_plants.weapmisc_item_or_weapon_hit_plants_01_krst',
    'ambient.khron_studio_sound_of_survival_vol_1_assets.items.item_or_weapon_hit_plants.weapmisc_item_or_weapon_hit_plants_02_krst',
    'ambient.khron_studio_sound_of_survival_vol_1_assets.items.item_or_weapon_hit_plants.weapmisc_item_or_weapon_hit_plants_03_krst',
];
const KILLER_PLANT_ACTION_KEYS = [
    'fantasy.poison_sword_whoosh_01',
    'fantasy.poison_sword_whoosh_02',
    'fantasy.poison_sword_whoosh_03',
];
const BEAR_CAVALRY_MINION_KEYS = [
    'monster.general.files.10.growl_with_slobber_01',
    'monster.general.files.10.growl_with_slobber_02',
    'monster.general.files.10.growl_with_slobber_03',
];
const BEAR_CAVALRY_ACTION_KEYS = [
    'monster.general.files.9.growl_01',
    'monster.general.files.9.growl_02',
    'monster.general.files.9.growl_03',
];
const CTHULHU_MINION_KEYS = [
    'magic.general.modern_magic_sound_fx_pack_vol.water_magic.water_magic_maelstrom_roar_001',
    'magic.general.modern_magic_sound_fx_pack_vol.water_magic.water_magic_maelstrom_roar_002',
    'magic.general.modern_magic_sound_fx_pack_vol.water_magic.water_magic_maelstrom_roar_003',
];
const CTHULHU_ACTION_KEYS = [
    'magic.general.modern_magic_sound_fx_pack_vol.water_magic.water_magic_tidal_rush_001',
    'magic.general.modern_magic_sound_fx_pack_vol.water_magic.water_magic_tidal_rush_002',
    'magic.general.modern_magic_sound_fx_pack_vol.water_magic.water_magic_tidal_rush_003',
];
const ELDER_THING_MINION_KEYS = [
    'magic.general.spells_variations_vol_1.shadowstrike_beam.magspel_shadowstrike_beam_01_krst',
    'magic.general.spells_variations_vol_1.shadowstrike_beam.magspel_shadowstrike_beam_02_krst',
    'magic.general.spells_variations_vol_1.shadowstrike_beam.magspel_shadowstrike_beam_03_krst',
];
const ELDER_THING_ACTION_KEYS = [
    'magic.general.modern_magic_sound_fx_pack_vol.arcane_spells.arcane_spells_astral_flare_001',
    'magic.general.modern_magic_sound_fx_pack_vol.arcane_spells.arcane_spells_astral_flare_002',
    'magic.general.modern_magic_sound_fx_pack_vol.arcane_spells.arcane_spells_astral_flare_003',
];
const INNSMOUTH_MINION_KEYS = [
    'magic.general.modern_magic_sound_fx_pack_vol.water_magic.water_magic_maelstrom_roar_004',
    'magic.general.modern_magic_sound_fx_pack_vol.water_magic.water_magic_maelstrom_roar_005',
    'magic.general.modern_magic_sound_fx_pack_vol.water_magic.water_magic_maelstrom_roar_006',
];
const INNSMOUTH_ACTION_KEYS = [
    'magic.general.modern_magic_sound_fx_pack_vol.water_magic.water_magic_tidal_rush_004',
    'magic.general.modern_magic_sound_fx_pack_vol.water_magic.water_magic_tidal_rush_005',
    'magic.general.modern_magic_sound_fx_pack_vol.water_magic.water_magic_tidal_rush_006',
];
const MISKATONIC_MINION_KEYS = [
    'magic.general.modern_magic_sound_fx_pack_vol.arcane_spells.arcane_spells_glyphic_resonance_001',
    'magic.general.modern_magic_sound_fx_pack_vol.arcane_spells.arcane_spells_glyphic_resonance_002',
    'magic.general.modern_magic_sound_fx_pack_vol.arcane_spells.arcane_spells_glyphic_resonance_003',
];
const MISKATONIC_ACTION_KEYS = [
    'magic.general.modern_magic_sound_fx_pack_vol.arcane_spells.arcane_spells_aetherial_pulse_001',
    'magic.general.modern_magic_sound_fx_pack_vol.arcane_spells.arcane_spells_aetherial_pulse_002',
    'magic.general.modern_magic_sound_fx_pack_vol.arcane_spells.arcane_spells_aetherial_pulse_003',
];
const ANCIENT_EGYPTIAN_MINION_KEYS = [
    'magic.general.spells_variations_vol_3.stonebound_summon.magspel_stonebound_summon_01_krst_none',
    'magic.general.spells_variations_vol_3.stonebound_summon.magspel_stonebound_summon_02_krst_none',
];
const ANCIENT_EGYPTIAN_ACTION_KEYS = [
    'magic.general.spells_variations_vol_2.breeze_of_the_ancients.magelem_breeze_of_the_ancients_01_krst_none',
    'magic.general.spells_variations_vol_2.breeze_of_the_ancients.magelem_breeze_of_the_ancients_02_krst_none',
];
const COWBOY_MINION_KEYS = [
    'combat.general.mini_games_sound_effects_and_music_pack.gun.shoot.sfx_gun_generic_a_shoot_1',
    'combat.general.mini_games_sound_effects_and_music_pack.gun.shoot.sfx_gun_generic_a_shoot_2',
];
const COWBOY_ACTION_KEYS = [
    'combat.general.mini_games_sound_effects_and_music_pack.gun.reload.sfx_gun_mechanic_set_a',
    'combat.general.mini_games_sound_effects_and_music_pack.gun.reload.sfx_gun_mechanic_set_b',
];
const SAMURAI_MINION_KEYS = [
    'combat.general.forged_in_fury_vol_1.katana.double_katana_whoosh.dsgnwhsh_double_katana_whoosh_01_krst',
    'combat.general.forged_in_fury_vol_1.katana.double_katana_whoosh.dsgnwhsh_double_katana_whoosh_02_krst',
];
const SAMURAI_ACTION_KEYS = [
    'combat.general.forged_in_fury_vol_1.katana.katana_only_hit_layer_with_metal.fghtimpt_katana_only_hit_layer_with_metal_07_krst',
    'combat.general.forged_in_fury_vol_1.katana.katana_only_hit_layer_with_metal.fghtimpt_katana_only_hit_layer_with_metal_08_krst',
];
const VIKING_MINION_KEYS = [
    'combat.general.forged_in_fury_vol_1.heavy_axe.heavy_axe_short_whoosh.weapaxe_heavy_axe_short_whoosh_01_krst',
    'combat.general.forged_in_fury_vol_1.heavy_axe.heavy_axe_short_whoosh.weapaxe_heavy_axe_short_whoosh_02_krst',
];
const VIKING_ACTION_KEYS = [
    'combat.general.forged_in_fury_vol_1.heavy_axe.heavy_axe_strike.weapaxe_heavy_axe_strike_01_krst',
    'combat.general.forged_in_fury_vol_1.heavy_axe.heavy_axe_strike.weapaxe_heavy_axe_strike_02_krst',
];

// 狼人：统一用攻击音效（风格一致）
const WEREWOLF_MINION_KEYS = [
    'fantasy.gothic_fantasy_sound_fx_pack_vol.creatures.werewolf_attack_001',
    'fantasy.gothic_fantasy_sound_fx_pack_vol.creatures.werewolf_attack_002',
    'fantasy.gothic_fantasy_sound_fx_pack_vol.creatures.werewolf_attack_003',
];
const WEREWOLF_ACTION_KEYS = [
    'fantasy.gothic_fantasy_sound_fx_pack_vol.creatures.werewolf_attack_001',
    'fantasy.gothic_fantasy_sound_fx_pack_vol.creatures.werewolf_attack_002',
    'fantasy.gothic_fantasy_sound_fx_pack_vol.creatures.werewolf_attack_003',
];

// 科学怪人：统一用电流音效（风格一致）
const FRANKENSTEIN_MINION_KEYS = [
    'magic.general.spells_variations_vol_1.electrified_whoosh.magspel_electrified_whoosh_01_krst',
    'magic.general.spells_variations_vol_1.electrified_whoosh.magspel_electrified_whoosh_02_krst',
];
const FRANKENSTEIN_ACTION_KEYS = [
    'magic.general.spells_variations_vol_1.electrified_whoosh.magspel_electrified_whoosh_01_krst',
    'magic.general.spells_variations_vol_1.electrified_whoosh.magspel_electrified_whoosh_02_krst',
];

// 吸血鬼：统一用暗影魔法音效（风格一致）
const VAMPIRE_MINION_KEYS = [
    'magic.general.modern_magic_sound_fx_pack_vol.dark_magic.dark_magic_shadow_wail_001',
    'magic.general.modern_magic_sound_fx_pack_vol.dark_magic.dark_magic_shadow_wail_002',
    'magic.general.modern_magic_sound_fx_pack_vol.dark_magic.dark_magic_grave_whisper_003',
];
const VAMPIRE_ACTION_KEYS = [
    'magic.general.modern_magic_sound_fx_pack_vol.dark_magic.dark_magic_shadow_wail_001',
    'magic.general.modern_magic_sound_fx_pack_vol.dark_magic.dark_magic_shadow_wail_002',
    'magic.general.modern_magic_sound_fx_pack_vol.dark_magic.dark_magic_grave_whisper_003',
];

// 巨蚁：统一用嗡鸣音效（风格一致）
const GIANT_ANT_MINION_KEYS = [
    'cyberpunk.cyberpunk_sound_fx_pack_vol.buzz_and_hum.buzzing',
    'cyberpunk.cyberpunk_sound_fx_pack_vol.buzz_and_hum.buzz_and_hum_a',
    'cyberpunk.cyberpunk_sound_fx_pack_vol.buzz_and_hum.buzz_and_hum_b',
];
const GIANT_ANT_ACTION_KEYS = [
    'cyberpunk.cyberpunk_sound_fx_pack_vol.buzz_and_hum.buzzing',
    'cyberpunk.cyberpunk_sound_fx_pack_vol.buzz_and_hum.buzz_and_hum_a',
    'cyberpunk.cyberpunk_sound_fx_pack_vol.buzz_and_hum.buzz_and_hum_b',
];

const FACTION_SFX_KEYS: Record<string, string[]> = {
    [SMASHUP_FACTION_IDS.ZOMBIES]: [...ZOMBIE_MINION_KEYS, ...ZOMBIE_ACTION_KEYS],
    [SMASHUP_FACTION_IDS.WIZARDS]: [...WIZARD_MINION_KEYS, ...WIZARD_ACTION_KEYS],
    [SMASHUP_FACTION_IDS.DINOSAURS]: [...DINO_MINION_KEYS, ...DINO_ACTION_KEYS],
    [SMASHUP_FACTION_IDS.ALIENS]: [...ALIEN_MINION_KEYS, ...ALIEN_ACTION_KEYS],
    [SMASHUP_FACTION_IDS.PIRATES]: [...PIRATE_MINION_KEYS, ...PIRATE_ACTION_KEYS],
    [SMASHUP_FACTION_IDS.NINJAS]: [...NINJA_MINION_KEYS, ...NINJA_ACTION_KEYS],
    [SMASHUP_FACTION_IDS.ROBOTS]: [...ROBOT_MINION_KEYS, ...ROBOT_ACTION_KEYS],
    [SMASHUP_FACTION_IDS.GHOSTS]: [...GHOST_MINION_KEYS, ...GHOST_ACTION_KEYS],
    [SMASHUP_FACTION_IDS.TRICKSTERS]: [...TRICKSTER_MINION_KEYS, ...TRICKSTER_ACTION_KEYS],
    [SMASHUP_FACTION_IDS.STEAMPUNKS]: [...STEAMPUNK_MINION_KEYS, ...STEAMPUNK_ACTION_KEYS],
    [SMASHUP_FACTION_IDS.KILLER_PLANTS]: [...KILLER_PLANT_MINION_KEYS, ...KILLER_PLANT_ACTION_KEYS],
    [SMASHUP_FACTION_IDS.BEAR_CAVALRY]: [...BEAR_CAVALRY_MINION_KEYS, ...BEAR_CAVALRY_ACTION_KEYS],
    [SMASHUP_FACTION_IDS.MINIONS_OF_CTHULHU]: [...CTHULHU_MINION_KEYS, ...CTHULHU_ACTION_KEYS, MADNESS_KEY],
    [SMASHUP_FACTION_IDS.ELDER_THINGS]: [...ELDER_THING_MINION_KEYS, ...ELDER_THING_ACTION_KEYS, MADNESS_KEY],
    [SMASHUP_FACTION_IDS.INNSMOUTH]: [...INNSMOUTH_MINION_KEYS, ...INNSMOUTH_ACTION_KEYS, MADNESS_KEY],
    [SMASHUP_FACTION_IDS.MISKATONIC_UNIVERSITY]: [...MISKATONIC_MINION_KEYS, ...MISKATONIC_ACTION_KEYS, MADNESS_KEY],
    [SMASHUP_FACTION_IDS.ANCIENT_EGYPTIANS]: [...ANCIENT_EGYPTIAN_MINION_KEYS, ...ANCIENT_EGYPTIAN_ACTION_KEYS],
    [SMASHUP_FACTION_IDS.ANCIENT_EGYPTIANS_POD]: [...ANCIENT_EGYPTIAN_MINION_KEYS, ...ANCIENT_EGYPTIAN_ACTION_KEYS],
    [SMASHUP_FACTION_IDS.COWBOYS]: [...COWBOY_MINION_KEYS, ...COWBOY_ACTION_KEYS],
    [SMASHUP_FACTION_IDS.COWBOYS_POD]: [...COWBOY_MINION_KEYS, ...COWBOY_ACTION_KEYS],
    [SMASHUP_FACTION_IDS.SAMURAI]: [...SAMURAI_MINION_KEYS, ...SAMURAI_ACTION_KEYS],
    [SMASHUP_FACTION_IDS.SAMURAI_POD]: [...SAMURAI_MINION_KEYS, ...SAMURAI_ACTION_KEYS],
    [SMASHUP_FACTION_IDS.VIKINGS]: [...VIKING_MINION_KEYS, ...VIKING_ACTION_KEYS],
    [SMASHUP_FACTION_IDS.VIKINGS_POD]: [...VIKING_MINION_KEYS, ...VIKING_ACTION_KEYS],
    [SMASHUP_FACTION_IDS.WEREWOLVES]: [...WEREWOLF_MINION_KEYS, ...WEREWOLF_ACTION_KEYS],
    [SMASHUP_FACTION_IDS.FRANKENSTEIN]: [...FRANKENSTEIN_MINION_KEYS, ...FRANKENSTEIN_ACTION_KEYS],
    [SMASHUP_FACTION_IDS.VAMPIRES]: [...VAMPIRE_MINION_KEYS, ...VAMPIRE_ACTION_KEYS],
    [SMASHUP_FACTION_IDS.GIANT_ANTS]: [...GIANT_ANT_MINION_KEYS, ...GIANT_ANT_ACTION_KEYS],
};

const collectFactionPreloadKeys = (factionIds: string[]): string[] => {
    const keys = new Set<string>();
    for (const factionId of factionIds) {
        const list = FACTION_SFX_KEYS[factionId];
        if (list) list.forEach(key => keys.add(key));
        const typedFactionId = factionId as FactionId;
        for (const card of getFactionCards(typedFactionId)) {
            if ('soundKey' in card && card.soundKey) keys.add(card.soundKey);
        }
        for (const titan of getFactionTitans(typedFactionId)) {
            const policy = SMASHUP_TITAN_SOUND_POLICY[titan.id];
            if (!policy) continue;
            if (policy.play !== 'generic') keys.add(policy.play);
            if (policy.move !== 'generic') keys.add(policy.move);
        }
    }
    return Array.from(keys);
};

type TitanSoundDecision = 'generic' | string;

export const SMASHUP_TITAN_SOUND_POLICY: Record<string, { play: TitanSoundDecision; move: TitanSoundDecision }> = {
    bear_cavalry_major_ursa: { play: BEAR_CAVALRY_TITAN_PLAY_KEY, move: BEAR_CAVALRY_TITAN_MOVE_KEY },
    ghosts_creampuff_man: { play: GHOST_TITAN_PLAY_KEY, move: GHOST_TITAN_MOVE_KEY },
    changerbots_mergacon: { play: CHANGERBOTS_TITAN_PLAY_KEY, move: CHANGERBOTS_TITAN_MOVE_KEY },
    explorers_very_large_boulder: { play: BOULDER_TITAN_PLAY_KEY, move: HEAVY_OBJECT_MOVE_KEY },
    giant_ants_death_on_six_legs: { play: GIANT_ANT_TITAN_PLAY_KEY, move: GIANT_ANT_TITAN_MOVE_KEY },
    innsmouth_dagon: { play: INNSMOUTH_TITAN_PLAY_KEY, move: INNSMOUTH_TITAN_MOVE_KEY },
    ignobles_the_hill_that_strolls: { play: PUZZLE_HEAVY_OBJECT_MOVE_KEY, move: HEAVY_OBJECT_MOVE_KEY },
    itty_critters_rainboroc: { play: RAINBOROC_TITAN_PLAY_KEY, move: RAINBOROC_TITAN_MOVE_KEY },
    kaiju_gorgodzolla: { play: KAIJU_TITAN_PLAY_KEY, move: HEAVY_OBJECT_MOVE_KEY },
    magical_girls_walking_castle: { play: PUZZLE_HEAVY_OBJECT_MOVE_KEY, move: HEAVY_OBJECT_MOVE_KEY },
    mega_troopers_megabot: { play: MEGABOT_TITAN_PLAY_KEY, move: MEGABOT_TITAN_MOVE_KEY },
    cthulhu_cthulhu_titan: { play: CTHULHU_TITAN_PLAY_KEY, move: CTHULHU_TITAN_MOVE_KEY },
    penguins_emperor_penguin: { play: EMPEROR_PENGUIN_TITAN_PLAY_KEY, move: EMPEROR_PENGUIN_TITAN_MOVE_KEY },
    tricksters_big_funny_giant: { play: BIG_FUNNY_GIANT_TITAN_PLAY_KEY, move: HEAVY_OBJECT_MOVE_KEY },
    vampires_ancient_lord: { play: VAMPIRE_TITAN_PLAY_KEY, move: VAMPIRE_TITAN_MOVE_KEY },
    werewolves_great_wolf_spirit: { play: WEREWOLF_TITAN_PLAY_KEY, move: WEREWOLF_TITAN_MOVE_KEY },
    wizards_arcane_protector: { play: WIZARD_TITAN_PLAY_KEY, move: WIZARD_TITAN_MOVE_KEY },
    pirates_the_kraken: { play: KRAKEN_TITAN_PLAY_KEY, move: KRAKEN_TITAN_MOVE_KEY },
    super_spies_moon_zero_three: { play: MOON_ZERO_THREE_TITAN_PLAY_KEY, move: MOON_ZERO_THREE_TITAN_MOVE_KEY },
    time_travelers_time_box: { play: TIME_BOX_TITAN_PLAY_KEY, move: TIME_BOX_TITAN_MOVE_KEY },
    sphinx: { play: SPHINX_TITAN_PLAY_KEY, move: SPHINX_TITAN_MOVE_KEY },
    pecos_bill: { play: PECOS_BILL_TITAN_PLAY_KEY, move: PECOS_BILL_TITAN_MOVE_KEY },
};

const resolveTitanSound = (defId: string | undefined, kind: 'play' | 'move'): string | null => {
    if (!defId) return null;
    const titanDef = getTitanDef(defId);
    if (!titanDef) return null;
    const policy = SMASHUP_TITAN_SOUND_POLICY[defId];
    if (!policy) return null;
    const decision = policy[kind];
    return decision === 'generic' ? null : decision;
};

/**
 * 解析卡牌音效 key
 * 优先级：卡牌配置的 soundKey > 派系默认音效池
 */
const resolveFactionSound = (defId: string | undefined, cardType: 'minion' | 'action' | 'talent'): string | null => {
    if (!defId) return null;
    
    // 特殊卡牌：疯狂卡
    if (defId === 'special_madness') {
        return MADNESS_KEY;
    }
    
    // 优先使用卡牌配置的 soundKey
    const cardDef = getCardDef(defId);
    if (cardDef && 'soundKey' in cardDef && cardDef.soundKey) {
        return cardDef.soundKey;
    }
    
    // Fallback 到派系默认音效池
    if (defId.startsWith('zombie_')) {
        const keys = cardType === 'action' ? ZOMBIE_ACTION_KEYS : ZOMBIE_MINION_KEYS;
        return pickRandomSoundKey(`smashup.zombie.${cardType}`, keys, { minGap: 1 });
    }
    if (defId.startsWith('wizard_')) {
        const keys = cardType === 'action' ? WIZARD_ACTION_KEYS : WIZARD_MINION_KEYS;
        return pickRandomSoundKey(`smashup.wizard.${cardType}`, keys, { minGap: 1 });
    }
    if (defId.startsWith('dino_')) {
        const keys = cardType === 'action' ? DINO_ACTION_KEYS : DINO_MINION_KEYS;
        return pickRandomSoundKey(`smashup.dino.${cardType}`, keys, { minGap: 1 });
    }
    if (defId.startsWith('alien_')) {
        const keys = cardType === 'action' ? ALIEN_ACTION_KEYS : ALIEN_MINION_KEYS;
        return pickRandomSoundKey(`smashup.alien.${cardType}`, keys, { minGap: 1 });
    }
    if (defId.startsWith('pirate_')) {
        const keys = cardType === 'action' ? PIRATE_ACTION_KEYS : PIRATE_MINION_KEYS;
        return pickRandomSoundKey(`smashup.pirate.${cardType}`, keys, { minGap: 1 });
    }
    if (defId.startsWith('ninja_')) {
        const keys = cardType === 'action' ? NINJA_ACTION_KEYS : NINJA_MINION_KEYS;
        return pickRandomSoundKey(`smashup.ninja.${cardType}`, keys, { minGap: 1 });
    }
    if (defId.startsWith('robot_')) {
        const keys = cardType === 'action' ? ROBOT_ACTION_KEYS : ROBOT_MINION_KEYS;
        return pickRandomSoundKey(`smashup.robot.${cardType}`, keys, { minGap: 1 });
    }
    if (defId.startsWith('ghost_')) {
        const keys = cardType === 'action' ? GHOST_ACTION_KEYS : GHOST_MINION_KEYS;
        return pickRandomSoundKey(`smashup.ghost.${cardType}`, keys, { minGap: 1 });
    }
    if (defId.startsWith('trickster_')) {
        const keys = cardType === 'action' ? TRICKSTER_ACTION_KEYS : TRICKSTER_MINION_KEYS;
        return pickRandomSoundKey(`smashup.trickster.${cardType}`, keys, { minGap: 1 });
    }
    if (defId.startsWith('steampunk_')) {
        const keys = cardType === 'action' ? STEAMPUNK_ACTION_KEYS : STEAMPUNK_MINION_KEYS;
        return pickRandomSoundKey(`smashup.steampunk.${cardType}`, keys, { minGap: 1 });
    }
    if (defId.startsWith('killer_plant_')) {
        const keys = cardType === 'action' ? KILLER_PLANT_ACTION_KEYS : KILLER_PLANT_MINION_KEYS;
        return pickRandomSoundKey(`smashup.killer_plant.${cardType}`, keys, { minGap: 1 });
    }
    if (defId.startsWith('bear_cavalry_')) {
        const keys = cardType === 'action' ? BEAR_CAVALRY_ACTION_KEYS : BEAR_CAVALRY_MINION_KEYS;
        return pickRandomSoundKey(`smashup.bear_cavalry.${cardType}`, keys, { minGap: 1 });
    }
    if (defId.startsWith('cthulhu_')) {
        const keys = cardType === 'action' ? CTHULHU_ACTION_KEYS : CTHULHU_MINION_KEYS;
        return pickRandomSoundKey(`smashup.cthulhu.${cardType}`, keys, { minGap: 1 });
    }
    if (defId.startsWith('elder_thing_')) {
        const keys = cardType === 'action' ? ELDER_THING_ACTION_KEYS : ELDER_THING_MINION_KEYS;
        return pickRandomSoundKey(`smashup.elder_thing.${cardType}`, keys, { minGap: 1 });
    }
    if (defId.startsWith('innsmouth_')) {
        const keys = cardType === 'action' ? INNSMOUTH_ACTION_KEYS : INNSMOUTH_MINION_KEYS;
        return pickRandomSoundKey(`smashup.innsmouth.${cardType}`, keys, { minGap: 1 });
    }
    if (defId.startsWith('miskatonic_')) {
        const keys = cardType === 'action' ? MISKATONIC_ACTION_KEYS : MISKATONIC_MINION_KEYS;
        return pickRandomSoundKey(`smashup.miskatonic.${cardType}`, keys, { minGap: 1 });
    }
    if (defId.startsWith('ancient_egyptians_')) {
        const keys = cardType === 'action' ? ANCIENT_EGYPTIAN_ACTION_KEYS : ANCIENT_EGYPTIAN_MINION_KEYS;
        return pickRandomSoundKey(`smashup.ancient_egyptians.${cardType}`, keys, { minGap: 1 });
    }
    if (defId.startsWith('cowboys_')) {
        const keys = cardType === 'action' ? COWBOY_ACTION_KEYS : COWBOY_MINION_KEYS;
        return pickRandomSoundKey(`smashup.cowboys.${cardType}`, keys, { minGap: 1 });
    }
    if (defId.startsWith('samurai_')) {
        const keys = cardType === 'action' ? SAMURAI_ACTION_KEYS : SAMURAI_MINION_KEYS;
        return pickRandomSoundKey(`smashup.samurai.${cardType}`, keys, { minGap: 1 });
    }
    if (defId.startsWith('vikings_')) {
        const keys = cardType === 'action' ? VIKING_ACTION_KEYS : VIKING_MINION_KEYS;
        return pickRandomSoundKey(`smashup.vikings.${cardType}`, keys, { minGap: 1 });
    }
    if (defId.startsWith('werewolf_')) {
        const keys = cardType === 'action' ? WEREWOLF_ACTION_KEYS : WEREWOLF_MINION_KEYS;
        return pickRandomSoundKey(`smashup.werewolf.${cardType}`, keys, { minGap: 1 });
    }
    if (defId.startsWith('frankenstein_')) {
        const keys = cardType === 'action' ? FRANKENSTEIN_ACTION_KEYS : FRANKENSTEIN_MINION_KEYS;
        return pickRandomSoundKey(`smashup.frankenstein.${cardType}`, keys, { minGap: 1 });
    }
    if (defId.startsWith('vampire_')) {
        const keys = cardType === 'action' ? VAMPIRE_ACTION_KEYS : VAMPIRE_MINION_KEYS;
        return pickRandomSoundKey(`smashup.vampire.${cardType}`, keys, { minGap: 1 });
    }
    if (defId.startsWith('giant_ant_')) {
        const keys = cardType === 'action' ? GIANT_ANT_ACTION_KEYS : GIANT_ANT_MINION_KEYS;
        return pickRandomSoundKey(`smashup.giant_ant.${cardType}`, keys, { minGap: 1 });
    }
    
    // 未配置音效池的派系，返回 null（静默）
    return null;
};

// 创建基础 feedbackResolver（框架自动处理 events.ts 中的 sound 配置）
const baseFeedbackResolver = createFeedbackResolver(SU_EVENTS);

export const SMASHUP_AUDIO_CONFIG: GameAudioConfig = {
    // 自动收集 SU_EVENTS 中所有 immediate/ui 策略的音效 key（零维护）
    criticalSounds: [
        ...collectPreloadKeys(SU_EVENTS),
        // 基地得分（FX on-impact，需手动预加载）
        'ui.general.mini_games_sound_effects_and_music_pack.success.sfx_success_point_medium',
    ],
    bgm: [
        {
            key: BGM_NORMAL_KEY,
            name: 'Tiki Party',
            src: '',
            volume: 0.5,
            category: { group: 'bgm', sub: 'battle' },
        },
        {
            key: BGM_TIKI_INTENSE_KEY,
            name: 'Tiki Party (Intense)',
            src: '',
            volume: 0.5,
            category: { group: 'bgm', sub: 'battle_intense' },
        },
        {
            key: BGM_BUBBLEGUM_KEY,
            name: 'Bubblegum',
            src: '',
            volume: 0.5,
            category: { group: 'bgm', sub: 'battle' },
        },
        {
            key: BGM_FIELD_DAY_KEY,
            name: 'Field Day',
            src: '',
            volume: 0.5,
            category: { group: 'bgm', sub: 'battle' },
        },
        {
            key: BGM_LIZARDS_KEY,
            name: 'Lizards',
            src: '',
            volume: 0.5,
            category: { group: 'bgm', sub: 'battle' },
        },
        {
            key: BGM_BUBBLEGUM_INTENSE_KEY,
            name: 'Bubblegum (Intense)',
            src: '',
            volume: 0.5,
            category: { group: 'bgm', sub: 'battle_intense' },
        },
        {
            key: BGM_FIELD_DAY_INTENSE_KEY,
            name: 'Field Day (Intense)',
            src: '',
            volume: 0.5,
            category: { group: 'bgm', sub: 'battle_intense' },
        },
        {
            key: BGM_SUNSET_KEY,
            name: 'Sunset',
            src: '',
            volume: 0.5,
            category: { group: 'bgm', sub: 'battle' },
        },
        {
            key: BGM_SUNSET_INTENSE_KEY,
            name: 'Sunset (Intense)',
            src: '',
            volume: 0.5,
            category: { group: 'bgm', sub: 'battle_intense' },
        },
        {
            key: BGM_SUNNY_DAYS_KEY,
            name: 'Sunny Days',
            src: '',
            volume: 0.5,
            category: { group: 'bgm', sub: 'battle' },
        },
        {
            key: BGM_SUNNY_DAYS_INTENSE_KEY,
            name: 'Sunny Days (Intense)',
            src: '',
            volume: 0.5,
            category: { group: 'bgm', sub: 'battle_intense' },
        },
        {
            key: BGM_BIG_SHOT_KEY,
            name: 'Big Shot',
            src: '',
            volume: 0.5,
            category: { group: 'bgm', sub: 'battle' },
        },
        {
            key: BGM_BIG_SHOT_INTENSE_KEY,
            name: 'Big Shot (Intense)',
            src: '',
            volume: 0.5,
            category: { group: 'bgm', sub: 'battle_intense' },
        },
        {
            key: BGM_BATTLE_KEY,
            name: 'Move Your Feet',
            src: '',
            volume: 0.5,
            category: { group: 'bgm', sub: 'battle' },
        },
        {
            key: BGM_MOVE_YOUR_FEET_INTENSE_KEY,
            name: 'Move Your Feet (Intense)',
            src: '',
            volume: 0.5,
            category: { group: 'bgm', sub: 'battle_intense' },
        },
        {
            key: BGM_NOBODY_KNOWS_KEY,
            name: 'Nobody Knows',
            src: '',
            volume: 0.5,
            category: { group: 'bgm', sub: 'battle' },
        },
        {
            key: BGM_NOBODY_KNOWS_INTENSE_KEY,
            name: 'Nobody Knows (Intense)',
            src: '',
            volume: 0.5,
            category: { group: 'bgm', sub: 'battle_intense' },
        },
    ],
    bgmGroups: {
        normal: [
            BGM_NOBODY_KNOWS_KEY,
            BGM_NORMAL_KEY,
            BGM_BUBBLEGUM_KEY,
            BGM_FIELD_DAY_KEY,
            BGM_LIZARDS_KEY,
            BGM_SUNSET_KEY,
            BGM_SUNNY_DAYS_KEY,
        ],
        battle: [
            BGM_BATTLE_KEY,
            BGM_MOVE_YOUR_FEET_INTENSE_KEY,
            BGM_BIG_SHOT_KEY,
            BGM_BIG_SHOT_INTENSE_KEY,
            BGM_TIKI_INTENSE_KEY,
            BGM_BUBBLEGUM_INTENSE_KEY,
            BGM_FIELD_DAY_INTENSE_KEY,
        ],
    },
    feedbackResolver: (event) => {
        const type = event.type;
        
        // ========== 特殊处理逻辑（覆盖框架默认）==========
        
        // FACTION_SELECTED：UI 层已播放，EventStream 跳过
        if (type === SU_EVENT_TYPES.FACTION_SELECTED) {
            return null;
        }
        
        // MINION_MOVED：移动音效
        if (type === SU_EVENT_TYPES.MINION_MOVED) {
            return MOVE_KEY;
        }

        if (type === SU_EVENT_TYPES.BURIED_CARD_UNCOVERED) {
            return UNEARTH_KEY;
        }

        if (type === SU_EVENT_TYPES.BURIED_CARD_RETURNED_TO_HAND) {
            return BURIED_RETURN_TO_HAND_KEY;
        }

        // MINION_PLAYED：根据阵营选择音效
        if (type === SU_EVENT_TYPES.MINION_PLAYED) {
            const defId = (event.payload as { defId?: string })?.defId;
            const factionSound = resolveFactionSound(defId, 'minion');
            if (factionSound) return factionSound;
            // 回退到框架默认
        }

        if (type === SU_EVENT_TYPES.TITAN_PLAYED) {
            const defId = (event.payload as { defId?: string })?.defId;
            const titanSound = resolveTitanSound(defId, 'play');
            if (titanSound) return titanSound;
        }

        if (type === SU_EVENT_TYPES.TITAN_MOVED) {
            const defId = (event.payload as { defId?: string })?.defId;
            const titanSound = resolveTitanSound(defId, 'move');
            if (titanSound) return titanSound;
        }
        
        // ACTION_PLAYED / ONGOING_ATTACHED：根据阵营选择音效
        if (type === SU_EVENT_TYPES.ACTION_PLAYED || type === SU_EVENT_TYPES.ONGOING_ATTACHED) {
            const defId = (event.payload as { defId?: string })?.defId;
            const factionSound = resolveFactionSound(defId, 'action');
            if (factionSound) return factionSound;
            // 回退到框架默认
        }
        
        // TALENT_USED：根据阵营选择音效
        if (type === SU_EVENT_TYPES.TALENT_USED) {
            const defId = (event.payload as { defId?: string })?.defId;
            const factionSound = resolveFactionSound(defId, 'talent');
            if (factionSound) return factionSound;
            // 回退到框架默认
        }
        
        // ========== 使用框架自动生成的默认音效 ==========
        return baseFeedbackResolver(event);
    },
    bgmRules: [
        {
            when: (context) => {
                const { currentPhase } = context.ctx as SmashUpAudioCtx;
                return currentPhase === 'playCards' || currentPhase === 'scoreBases';
            },
            key: BGM_BATTLE_KEY,
            group: 'battle',
        },
        {
            when: () => true,
            key: BGM_NOBODY_KNOWS_KEY,
            group: 'normal',
        },
    ],
    stateTriggers: [
        {
            condition: (prev, next) => {
                const prevOver = (prev.ctx as SmashUpAudioCtx).isGameOver;
                const nextOver = (next.ctx as SmashUpAudioCtx).isGameOver;
                return !prevOver && !!nextOver;
            },
            resolveSound: (_prev, next) => {
                const { isWinner } = next.ctx as SmashUpAudioCtx;
                if (isWinner === undefined) return null;
                return isWinner ? STINGER_WIN_KEY : STINGER_LOSE_KEY;
            },
        },
    ],
    contextualPreloadKeys: (context) => {
        const core = context.G as SmashUpCore | undefined;
        if (!core) return [];
        const selected = new Set<string>();
        if (core.factionSelection) {
            for (const list of Object.values(core.factionSelection.playerSelections)) {
                list?.forEach((faction) => selected.add(faction));
            }
        } else {
            for (const player of Object.values(core.players ?? {})) {
                player.factions?.forEach((faction) => selected.add(faction));
            }
        }
        if (selected.size === 0) return [];
        return collectFactionPreloadKeys(Array.from(selected));
    },
};
