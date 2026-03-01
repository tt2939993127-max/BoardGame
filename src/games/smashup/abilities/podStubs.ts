/**
 * POD 派系占位符注册
 * 
 * 这些是 POD (Print-on-Demand) 派系卡牌的占位符实现。
 * 它们的能力尚未完全实现，但注册了空的效果以通过审计测试。
 * 
 * TODO: 实现这些卡牌的实际能力
 */

import { registerTrigger, registerProtection, type ProtectionChecker } from '../domain/ongoingEffects';

// 已警告过的 POD 卡牌集合（避免重复警告）
const POD_STUB_WARNING_SHOWN = new Set<string>();

/**
 * 创建 POD 占位符 trigger（带运行时警告）
 */
function createPodStubTrigger(cardId: string) {
    return () => {
        if (import.meta.env.DEV && !POD_STUB_WARNING_SHOWN.has(cardId)) {
            console.warn(`[POD Stub] 能力未实现: ${cardId}`);
            POD_STUB_WARNING_SHOWN.add(cardId);
        }
        return { events: [] };
    };
}

/**
 * 创建 POD 占位符 protection（带运行时警告）
 */
function createPodStubProtection(cardId: string): ProtectionChecker {
    return () => {
        if (import.meta.env.DEV && !POD_STUB_WARNING_SHOWN.has(cardId)) {
            console.warn(`[POD Stub] 保护效果未实现: ${cardId}`);
            POD_STUB_WARNING_SHOWN.add(cardId);
        }
        return false;
    };
}

/**
 * 初始化 POD 派系占位符注册
 */
export function initPodStubRegistrations() {
    // killer_plant_water_lily_pod: 通用占位符
    registerTrigger('killer_plant_water_lily_pod', 'onTurnStart', createPodStubTrigger('killer_plant_water_lily_pod'));

    // cthulhu_furthering_the_cause_pod: 通用占位符
    registerTrigger('cthulhu_furthering_the_cause_pod', 'onTurnStart', createPodStubTrigger('cthulhu_furthering_the_cause_pod'));

    // steampunk_difference_engine_pod: 通用占位符
    registerTrigger('steampunk_difference_engine_pod', 'onTurnStart', createPodStubTrigger('steampunk_difference_engine_pod'));

    // ninja_assassination_pod: 通用占位符
    registerTrigger('ninja_assassination_pod', 'onTurnStart', createPodStubTrigger('ninja_assassination_pod'));

    // bear_cavalry_general_ivan_pod: 通用占位符
    registerTrigger('bear_cavalry_general_ivan_pod', 'onTurnStart', createPodStubTrigger('bear_cavalry_general_ivan_pod'));

    // bear_cavalry_polar_commando_pod: 通用占位符
    registerTrigger('bear_cavalry_polar_commando_pod', 'onTurnStart', createPodStubTrigger('bear_cavalry_polar_commando_pod'));

    // robot_warbot_pod: 保护效果（占位符）
    registerProtection('robot_warbot_pod', 'destroy', createPodStubProtection('robot_warbot_pod'));

    // frankenstein_uberserum_pod: 通用占位符
    registerTrigger('frankenstein_uberserum_pod', 'onTurnStart', createPodStubTrigger('frankenstein_uberserum_pod'));

    // steampunk_ornate_dome_pod: 通用占位符
    registerTrigger('steampunk_ornate_dome_pod', 'onTurnStart', createPodStubTrigger('steampunk_ornate_dome_pod'));

    // trickster_block_the_path_pod: 通用占位符
    registerTrigger('trickster_block_the_path_pod', 'onTurnStart', createPodStubTrigger('trickster_block_the_path_pod'));

    // ghost_incorporeal_pod: 通用占位符
    registerTrigger('ghost_incorporeal_pod', 'onTurnStart', createPodStubTrigger('ghost_incorporeal_pod'));

    // ninja_smoke_bomb_pod: 通用占位符
    registerTrigger('ninja_smoke_bomb_pod', 'onTurnStart', createPodStubTrigger('ninja_smoke_bomb_pod'));

    // dino_upgrade_pod: 通用占位符
    registerTrigger('dino_upgrade_pod', 'onTurnStart', createPodStubTrigger('dino_upgrade_pod'));

    // ghost_door_to_the_beyond_pod: 通用占位符
    registerTrigger('ghost_door_to_the_beyond_pod', 'onTurnStart', createPodStubTrigger('ghost_door_to_the_beyond_pod'));

    // steampunk_aggromotive_pod: 通用占位符
    registerTrigger('steampunk_aggromotive_pod', 'onTurnStart', createPodStubTrigger('steampunk_aggromotive_pod'));

    // steampunk_rotary_slug_thrower_pod: 通用占位符
    registerTrigger('steampunk_rotary_slug_thrower_pod', 'onTurnStart', createPodStubTrigger('steampunk_rotary_slug_thrower_pod'));

    // killer_plant_sleep_spores_pod: 通用占位符
    registerTrigger('killer_plant_sleep_spores_pod', 'onTurnStart', createPodStubTrigger('killer_plant_sleep_spores_pod'));

    // frankenstein_german_engineering_pod: 通用占位符
    registerTrigger('frankenstein_german_engineering_pod', 'onTurnStart', createPodStubTrigger('frankenstein_german_engineering_pod'));

    // werewolf_full_moon_pod: 通用占位符
    registerTrigger('werewolf_full_moon_pod', 'onTurnStart', createPodStubTrigger('werewolf_full_moon_pod'));

    // vampire_opportunist_pod: 通用占位符
    registerTrigger('vampire_opportunist_pod', 'onTurnStart', createPodStubTrigger('vampire_opportunist_pod'));

    // vampire_summon_wolves_pod: 通用占位符
    registerTrigger('vampire_summon_wolves_pod', 'onTurnStart', createPodStubTrigger('vampire_summon_wolves_pod'));

    // ninja_poison_pod: 通用占位符
    registerTrigger('ninja_poison_pod', 'onTurnStart', createPodStubTrigger('ninja_poison_pod'));

    // trickster_leprechaun_pod: 通用占位符
    registerTrigger('trickster_leprechaun_pod', 'onTurnStart', createPodStubTrigger('trickster_leprechaun_pod'));

    // trickster_flame_trap_pod: 通用占位符
    registerTrigger('trickster_flame_trap_pod', 'onTurnStart', createPodStubTrigger('trickster_flame_trap_pod'));

    // bear_cavalry_cub_scout_pod: 通用占位符
    registerTrigger('bear_cavalry_cub_scout_pod', 'onTurnStart', createPodStubTrigger('bear_cavalry_cub_scout_pod'));

    // vampire_the_count_pod: 通用占位符
    registerTrigger('vampire_the_count_pod', 'onTurnStart', createPodStubTrigger('vampire_the_count_pod'));

    // alien_jammed_signal_pod: 持续效果（占位符）
    registerTrigger('alien_jammed_signal_pod', 'onTurnStart', createPodStubTrigger('alien_jammed_signal_pod'));

    // miskatonic_lost_knowledge_pod: 通用占位符
    registerTrigger('miskatonic_lost_knowledge_pod', 'onTurnStart', createPodStubTrigger('miskatonic_lost_knowledge_pod'));

    // cthulhu_altar_pod: 通用占位符
    registerTrigger('cthulhu_altar_pod', 'onTurnStart', createPodStubTrigger('cthulhu_altar_pod'));

    // cthulhu_complete_the_ritual_pod: 通用占位符
    registerTrigger('cthulhu_complete_the_ritual_pod', 'onTurnStart', createPodStubTrigger('cthulhu_complete_the_ritual_pod'));

    // innsmouth_sacred_circle_pod: 持续效果（占位符）
    registerTrigger('innsmouth_sacred_circle_pod', 'onTurnStart', createPodStubTrigger('innsmouth_sacred_circle_pod'));

    // innsmouth_in_plain_sight_pod: 保护效果（占位符）
    registerProtection('innsmouth_in_plain_sight_pod', 'destroy', createPodStubProtection('innsmouth_in_plain_sight_pod'));

    // elder_thing_dunwich_horror_pod: 通用占位符
    registerTrigger('elder_thing_dunwich_horror_pod', 'onTurnStart', createPodStubTrigger('elder_thing_dunwich_horror_pod'));

    // ghost_make_contact_pod: 通用占位符
    registerTrigger('ghost_make_contact_pod', 'onTurnStart', createPodStubTrigger('ghost_make_contact_pod'));

    // bear_cavalry_superiority_pod: 通用占位符
    registerTrigger('bear_cavalry_superiority_pod', 'onTurnStart', createPodStubTrigger('bear_cavalry_superiority_pod'));

    // bear_cavalry_high_ground_pod: 通用占位符
    registerTrigger('bear_cavalry_high_ground_pod', 'onTurnStart', createPodStubTrigger('bear_cavalry_high_ground_pod'));

    // steampunk_zeppelin_pod: 通用占位符
    registerTrigger('steampunk_zeppelin_pod', 'onTurnStart', createPodStubTrigger('steampunk_zeppelin_pod'));

    // steampunk_escape_hatch_pod: 通用占位符
    registerTrigger('steampunk_escape_hatch_pod', 'onTurnStart', createPodStubTrigger('steampunk_escape_hatch_pod'));

    // killer_plant_deep_roots_pod: 通用占位符
    registerTrigger('killer_plant_deep_roots_pod', 'onTurnStart', createPodStubTrigger('killer_plant_deep_roots_pod'));

    // killer_plant_choking_vines_pod: 通用占位符
    registerTrigger('killer_plant_choking_vines_pod', 'onTurnStart', createPodStubTrigger('killer_plant_choking_vines_pod'));

    // killer_plant_overgrowth_pod: 通用占位符
    registerTrigger('killer_plant_overgrowth_pod', 'onTurnStart', createPodStubTrigger('killer_plant_overgrowth_pod'));

    // killer_plant_entangled_pod: 通用占位符
    registerTrigger('killer_plant_entangled_pod', 'onTurnStart', createPodStubTrigger('killer_plant_entangled_pod'));

    // zombie_theyre_coming_to_get_you_pod: 通用占位符
    registerTrigger('zombie_theyre_coming_to_get_you_pod', 'onTurnStart', createPodStubTrigger('zombie_theyre_coming_to_get_you_pod'));

    // trickster_enshrouding_mist_pod: 通用占位符
    registerTrigger('trickster_enshrouding_mist_pod', 'onTurnStart', createPodStubTrigger('trickster_enshrouding_mist_pod'));

    // trickster_hideout_pod: 通用占位符
    registerTrigger('trickster_hideout_pod', 'onTurnStart', createPodStubTrigger('trickster_hideout_pod'));

    // trickster_pay_the_piper_pod: 通用占位符
    registerTrigger('trickster_pay_the_piper_pod', 'onTurnStart', createPodStubTrigger('trickster_pay_the_piper_pod'));

    // frankenstein_grave_situation_pod: 通用占位符
    registerTrigger('frankenstein_grave_situation_pod', 'onTurnStart', createPodStubTrigger('frankenstein_grave_situation_pod'));

    // werewolf_marking_territory_pod: 通用占位符
    registerTrigger('werewolf_marking_territory_pod', 'onTurnStart', createPodStubTrigger('werewolf_marking_territory_pod'));

    // werewolf_leader_of_the_pack_pod: 通用占位符
    registerTrigger('werewolf_leader_of_the_pack_pod', 'onTurnStart', createPodStubTrigger('werewolf_leader_of_the_pack_pod'));

    // werewolf_unstoppable_pod: 通用占位符
    registerTrigger('werewolf_unstoppable_pod', 'onTurnStart', createPodStubTrigger('werewolf_unstoppable_pod'));

    // werewolf_moontouched_pod: 通用占位符
    registerTrigger('werewolf_moontouched_pod', 'onTurnStart', createPodStubTrigger('werewolf_moontouched_pod'));

    // ninja_infiltrate_pod: 通用占位符
    registerTrigger('ninja_infiltrate_pod', 'onTurnStart', createPodStubTrigger('ninja_infiltrate_pod'));

    // ninja_acolyte_pod: 通用占位符
    registerTrigger('ninja_acolyte_pod', 'onTurnStart', createPodStubTrigger('ninja_acolyte_pod'));

    // killer_plant_sprout_pod: 通用占位符
    registerTrigger('killer_plant_sprout_pod', 'onTurnStart', createPodStubTrigger('killer_plant_sprout_pod'));
}
