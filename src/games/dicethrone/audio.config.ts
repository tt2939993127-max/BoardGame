/**
 * DiceThrone 音频配置
 * 
 * 职责：
 * - feedbackResolver：处理无动画的即时音效（投骰子、阶段切换、CP 变化等）
 * - 有动画的事件音效（伤害、治疗、状态、Token）由 animationSoundConfig.ts 管理
 */
import type { AudioEvent, AudioRuntimeContext, GameAudioConfig, SoundKey } from '../../lib/audio/types';
import { pickDiceRollSoundKey } from '../../lib/audio/audioUtils';
import type { DiceThroneCore, TurnPhase, SelectableCharacterId } from './domain/types';
import { findPlayerAbility } from './domain/abilityLookup';
import { findHeroCard } from './heroes';
import { CHARACTER_DATA_MAP } from './domain/characters';

const resolveTokenSfx = (state: DiceThroneCore, tokenId?: string): string | null => {
    if (!tokenId) return null;
    const def = state.tokenDefinitions?.find(token => token.id === tokenId);
    return def?.sfxKey ?? null;
};

// DT 专属 BGM
const BGM_DRAGON_DANCE_KEY = 'bgm.fantasy.fantasy_music_pack_vol.dragon_dance_rt_2.fantasy_vol5_dragon_dance_main';
const BGM_DRAGON_DANCE_INTENSE_KEY = 'bgm.fantasy.fantasy_music_pack_vol.dragon_dance_rt_2.fantasy_vol5_dragon_dance_intensity_2';
const BGM_SHIELDS_KEY = 'bgm.fantasy.fantasy_music_pack_vol.shields_and_spears_rt_2.fantasy_vol5_shields_and_spears_main';
const BGM_SHIELDS_INTENSE_KEY = 'bgm.fantasy.fantasy_music_pack_vol.shields_and_spears_rt_2.fantasy_vol5_shields_and_spears_intensity_2';
const BGM_HANG_THEM_KEY = 'bgm.fantasy.fantasy_music_pack_vol.hang_them_rt_3.fantasy_vol5_hang_them_main';
const BGM_MY_KINGDOM_KEY = 'bgm.fantasy.fantasy_music_pack_vol.my_kingdom_rt_2.fantasy_vol5_my_kingdom_main';
const BGM_HANG_THEM_INTENSE_KEY = 'bgm.fantasy.fantasy_music_pack_vol.hang_them_rt_3.fantasy_vol5_hang_them_intensity_2';
const BGM_MY_KINGDOM_INTENSE_KEY = 'bgm.fantasy.fantasy_music_pack_vol.my_kingdom_rt_2.fantasy_vol5_my_kingdom_intensity_2';
const BGM_STORMBORN_KEY = 'bgm.fantasy.fantasy_music_pack_vol.stormborn_destiny_rt_6.fantasy_vol7_stormborn_destiny_main';
const BGM_STORMBORN_INTENSE_KEY = 'bgm.fantasy.fantasy_music_pack_vol.stormborn_destiny_rt_6.fantasy_vol7_stormborn_destiny_intensity_2';
// Fantasy Vol 3/8 曲目
const BGM_OGRES_KEY = 'bgm.fantasy.fantasy_music_pack_vol.ogres_rt_1.ogres_main';
const BGM_OGRES_INTENSE_KEY = 'bgm.fantasy.fantasy_music_pack_vol.ogres_rt_1.ogres_intensity_2';
const BGM_NOCK_KEY = 'bgm.fantasy.fantasy_music_pack_vol.nock_rt_2.nock_main';
const BGM_NOCK_INTENSE_KEY = 'bgm.fantasy.fantasy_music_pack_vol.nock_rt_2.nock_intensity_2';
const BGM_FIREBORN_KEY = 'bgm.fantasy.fantasy_music_pack_vol.fireborn_rt_2.fantasy_vol8_fireborn_main';
const BGM_FIREBORN_INTENSE_KEY = 'bgm.fantasy.fantasy_music_pack_vol.fireborn_rt_2.fantasy_vol8_fireborn_intensity_2';

const DICE_ROLL_SINGLE_KEY = 'dice.decks_and_cards_sound_fx_pack.dice_roll_velvet_001';
const DICE_ROLL_MULTI_KEYS = [
    'dice.decks_and_cards_sound_fx_pack.few_dice_roll_001',
    'dice.decks_and_cards_sound_fx_pack.dice_roll_velvet_003',
    'dice.decks_and_cards_sound_fx_pack.few_dice_roll_005',
];
const DICE_ROLL_KEYS = [DICE_ROLL_SINGLE_KEY, ...DICE_ROLL_MULTI_KEYS];

export const DICETHRONE_AUDIO_CONFIG: GameAudioConfig = {
    criticalSounds: [
        ...DICE_ROLL_KEYS,
        'dice.decks_and_cards_sound_fx_pack.dice_handling_001',
        'ui.general.khron_studio_rpg_interface_essentials_inventory_dialog_ucs_system_192khz.dialog.dialog_choice.uiclick_dialog_choice_01_krst_none',
        'ui.general.ui_menu_sound_fx_pack_vol.signals.positive.signal_positive_bells_a',
        'ui.general.ui_menu_sound_fx_pack_vol.signals.update.update_chime_a',
        'card.handling.decks_and_cards_sound_fx_pack.card_placing_001',
        'card.handling.decks_and_cards_sound_fx_pack.card_take_001',
        'card.fx.decks_and_cards_sound_fx_pack.fx_discard_001',
        'magic.general.modern_magic_sound_fx_pack_vol.arcane_spells.arcane_spells_mana_surge_001',
        'status.general.player_status_sound_fx_pack.fantasy.fantasy_dispel_001',
        'combat.general.fight_fury_vol_2.versatile_punch_hit.fghtimpt_versatile_punch_hit_01_krst',
    ],
    bgm: [
        // --- normal 组（4 首）---
        { key: BGM_STORMBORN_KEY, name: 'Stormborn Destiny', src: '', volume: 0.5, category: { group: 'bgm', sub: 'battle' } },
        { key: BGM_HANG_THEM_KEY, name: 'Hang Them', src: '', volume: 0.5, category: { group: 'bgm', sub: 'battle' } },
        { key: BGM_MY_KINGDOM_KEY, name: 'My Kingdom', src: '', volume: 0.5, category: { group: 'bgm', sub: 'battle' } },
        { key: BGM_STORMBORN_INTENSE_KEY, name: 'Stormborn Destiny (Intensity 2)', src: '', volume: 0.5, category: { group: 'bgm', sub: 'battle' } },
        // --- battle 组（11 首）---
        { key: BGM_DRAGON_DANCE_KEY, name: 'Dragon Dance', src: '', volume: 0.5, category: { group: 'bgm', sub: 'battle_intense' } },
        { key: BGM_SHIELDS_KEY, name: 'Shields and Spears', src: '', volume: 0.5, category: { group: 'bgm', sub: 'battle_intense' } },
        { key: BGM_OGRES_KEY, name: 'Ogres', src: '', volume: 0.5, category: { group: 'bgm', sub: 'battle_intense' } },
        { key: BGM_HANG_THEM_INTENSE_KEY, name: 'Hang Them (Intensity 2)', src: '', volume: 0.5, category: { group: 'bgm', sub: 'battle_intense' } },
        { key: BGM_MY_KINGDOM_INTENSE_KEY, name: 'My Kingdom (Intensity 2)', src: '', volume: 0.5, category: { group: 'bgm', sub: 'battle_intense' } },
        { key: BGM_DRAGON_DANCE_INTENSE_KEY, name: 'Dragon Dance (Intensity 2)', src: '', volume: 0.5, category: { group: 'bgm', sub: 'battle_intense' } },
        { key: BGM_SHIELDS_INTENSE_KEY, name: 'Shields and Spears (Intensity 2)', src: '', volume: 0.5, category: { group: 'bgm', sub: 'battle_intense' } },
        { key: BGM_OGRES_INTENSE_KEY, name: 'Ogres (Intensity 2)', src: '', volume: 0.5, category: { group: 'bgm', sub: 'battle_intense' } },
        { key: BGM_NOCK_KEY, name: 'Nock!', src: '', volume: 0.5, category: { group: 'bgm', sub: 'battle_intense' } },
        { key: BGM_NOCK_INTENSE_KEY, name: 'Nock! (Intensity 2)', src: '', volume: 0.5, category: { group: 'bgm', sub: 'battle_intense' } },
        { key: BGM_FIREBORN_KEY, name: 'Fireborn', src: '', volume: 0.5, category: { group: 'bgm', sub: 'battle_intense' } },
        { key: BGM_FIREBORN_INTENSE_KEY, name: 'Fireborn (Intensity 2)', src: '', volume: 0.5, category: { group: 'bgm', sub: 'battle_intense' } },
    ],
    bgmGroups: {
        normal: [
            BGM_STORMBORN_KEY,
            BGM_HANG_THEM_KEY,
            BGM_MY_KINGDOM_KEY,
            BGM_STORMBORN_INTENSE_KEY,
        ],
        battle: [
            BGM_DRAGON_DANCE_KEY,
            BGM_SHIELDS_KEY,
            BGM_OGRES_KEY,
            BGM_HANG_THEM_INTENSE_KEY,
            BGM_MY_KINGDOM_INTENSE_KEY,
            BGM_DRAGON_DANCE_INTENSE_KEY,
            BGM_SHIELDS_INTENSE_KEY,
            BGM_OGRES_INTENSE_KEY,
            BGM_NOCK_KEY,
            BGM_NOCK_INTENSE_KEY,
            BGM_FIREBORN_KEY,
            BGM_FIREBORN_INTENSE_KEY,
        ],
    },
    feedbackResolver: (event, context): SoundKey | null => {
        const runtime = context as AudioRuntimeContext<
            DiceThroneCore,
            { currentPhase: TurnPhase; isGameOver: boolean; isWinner?: boolean },
            { currentPlayerId: string }
        >;
        const { G } = runtime;

        if (event.type === 'DICE_ROLLED') {
            const results = (event as AudioEvent & { payload?: { results?: number[] } }).payload?.results ?? [];
            return pickDiceRollSoundKey(
                'dicethrone.dice_roll',
                results.length,
                { single: DICE_ROLL_SINGLE_KEY, multiple: DICE_ROLL_MULTI_KEYS },
                { minGap: 1 }
            );
        }

        if (event.type === 'CP_CHANGED') {
            // CP 变化音效由 FX 飞行动画 onImpact 播放，feedbackResolver 不再处理
            return null;
        }

        if (event.type === 'CARD_PLAYED') {
            const cardId = (event as AudioEvent & { payload?: { cardId?: string } }).payload?.cardId;
            const card = findCardById(G, cardId);
            const hasEffectSfx = card?.effects?.some(effect => effect.sfxKey);
            if (hasEffectSfx) return null;
            return card?.sfxKey ?? 'card.handling.decks_and_cards_sound_fx_pack.card_placing_001';
        }

        if (event.type === 'ABILITY_ACTIVATED') {
            return null;
        }

        // DAMAGE_DEALT：音效由动画层在 onImpact 播放（配置见 domain/animationSoundConfig.ts）
        if (event.type === 'DAMAGE_DEALT') return null;

        // HEAL_APPLIED：音效由动画层在 onImpact 播放（配置见 domain/animationSoundConfig.ts）
        if (event.type === 'HEAL_APPLIED') return null;

        const type = event.type;
        const eventPlayerId = (event as AudioEvent & { payload?: { playerId?: string } }).payload?.playerId;
        const currentPlayerId = runtime.meta?.currentPlayerId;
        const shouldTraceSelectionAudio =
            type === 'CHARACTER_SELECTED'
            || type === 'PLAYER_READY'
            || type === 'HOST_STARTED'
            || type === 'SYS_PHASE_CHANGED';

        const traceSelectionAudio = (action: string, key: string | null, reason: string) => {
            if (!shouldTraceSelectionAudio) return;
            console.log(
                `[DT_AUDIO_TRACE] source=feedback_resolver action=${action} type=${type} key=${key ?? 'null'} reason=${reason} eventPlayerId=${eventPlayerId ?? 'none'} currentPlayerId=${currentPlayerId ?? 'none'} turnNumber=${G.turnNumber}`
            );
        };

        if (type === 'CHARACTER_SELECTED') {
            // 角色选择点击音由本地 UI 按钮负责，避免通过事件流广播给其他客户端
            traceSelectionAudio('skip', null, 'character_selected_local_ui');
            return null;
        }

        if (type === 'PLAYER_READY') {
            // 自己点击 Ready 时已在本地按钮播放点击音，事件音仅用于提示“其他玩家已准备”
            if (!currentPlayerId) {
                traceSelectionAudio('skip', null, 'current_player_unready');
                return null;
            }
            if (eventPlayerId && currentPlayerId && eventPlayerId === currentPlayerId) {
                traceSelectionAudio('skip', null, 'local_player_ready');
                return null;
            }
            const key = 'ui.general.ui_menu_sound_fx_pack_vol.signals.positive.signal_positive_bells_a';
            traceSelectionAudio('play', key, 'other_player_ready');
            return key;
        }

        if (type === 'HOST_STARTED') {
            // Host 自己点击开始时已在本地按钮播放点击音，事件音仅用于提示“他人已开始”
            if (!currentPlayerId) {
                traceSelectionAudio('skip', null, 'current_player_unready');
                return null;
            }
            if (eventPlayerId && currentPlayerId && eventPlayerId === currentPlayerId) {
                traceSelectionAudio('skip', null, 'local_player_started');
                return null;
            }
            const key = 'ui.fantasy_ui_sound_fx_pack_vol.signals.signal_update_b_003';
            traceSelectionAudio('play', key, 'other_player_started');
            return key;
        }

        if (type === 'SYS_PHASE_CHANGED') {
            const phasePayload = (event as AudioEvent & { payload?: { from?: string; to?: string } }).payload;
            const phaseFrom = phasePayload?.from;

            // 开局从 setup 自动连推到主阶段时，避免与“开始对局”提示音叠加造成一次点击多次响
            if (phaseFrom === 'setup') {
                traceSelectionAudio('skip', null, 'startup_phase_from_setup');
                return null;
            }
            if (G.turnNumber === 1 && (phaseFrom === 'upkeep' || phaseFrom === 'income')) {
                traceSelectionAudio('skip', null, 'startup_phase_autocontinue');
                return null;
            }
            const key = 'fantasy.gothic_fantasy_sound_fx_pack_vol.musical.drums_of_fate_002';
            traceSelectionAudio('play', key, 'phase_changed_default');
            return key;
        }

        if (type === 'TURN_CHANGED') {
            return 'ui.general.ui_menu_sound_fx_pack_vol.signals.update.update_chime_a';
        }

        if (type.startsWith('BONUS_')) {
            if (type.includes('REROLL')) {
                return 'dice.decks_and_cards_sound_fx_pack.dice_roll_velvet_002';
            }
            return 'dice.decks_and_cards_sound_fx_pack.single_die_roll_001';
        }

        if (type.startsWith('DIE_')) {
            if (type.includes('LOCK')) {
                return 'dice.decks_and_cards_sound_fx_pack.single_die_roll_005';
            }
            if (type.includes('MODIFIED')) {
                return 'dice.decks_and_cards_sound_fx_pack.single_die_roll_005';
            }
            if (type.includes('REROLL')) {
                return 'dice.decks_and_cards_sound_fx_pack.dice_roll_velvet_002';
            }
        }

        if (type.startsWith('ROLL_')) {
            if (type.includes('CONFIRM') || type.includes('LIMIT')) {
                return 'ui.general.khron_studio_rpg_interface_essentials_inventory_dialog_ucs_system_192khz.buttons.tab_switching_button.uiclick_tab_switching_button_01_krst_none';
            }
        }

        // STATUS / TOKEN 事件：有飞行动画，音效由动画层 onImpact 播放（配置见 domain/animationSoundConfig.ts）
        if (type === 'STATUS_APPLIED') return null;
        if (type === 'STATUS_REMOVED') return null;
        if (type === 'TOKEN_GRANTED') return null;
        if (type === 'TOKEN_USED' || type === 'TOKEN_CONSUMED') return null;

        if (type.startsWith('TOKEN_')) {
            if (type.includes('RESPONSE_CLOSED')) {
                return 'ui.general.ui_menu_sound_fx_pack_vol.signals.negative.signal_negative_spring_a';
            }
            if (type.includes('RESPONSE_REQUESTED')) {
                return 'status.general.player_status_sound_fx_pack_vol.action_and_interaction.ready_a';
            }
        }

        if (type.startsWith('CHOICE_')) {
            if (type.includes('RESOLVED')) {
                return 'ui.general.ui_menu_sound_fx_pack_vol.signals.positive.signal_positive_bells_a';
            }
            return 'status.general.player_status_sound_fx_pack_vol.action_and_interaction.ready_a';
        }

        if (type.startsWith('RESPONSE_WINDOW_')) {
            if (type.includes('OPEN')) {
                return 'ui.general.ui_menu_sound_fx_pack_vol.signals.positive.signal_positive_spring_a';
            }
            if (type.includes('CLOSED')) {
                return 'ui.general.ui_menu_sound_fx_pack_vol.signals.negative.signal_negative_spring_a';
            }
            return null;
        }

        if (type === 'DAMAGE_SHIELD_GRANTED') {
            return 'magic.water.10.water_shield';
        }

        if (type === 'DAMAGE_PREVENTED') {
            return 'fantasy.medieval_fantasy_sound_fx_pack_vol.armor.shield_impact_a';
        }

        if (type.startsWith('ATTACK_')) {
            if (type.includes('INITIATED')) {
                const payload = (event as AudioEvent & { payload?: { attackerId?: string; sourceAbilityId?: string } }).payload;
                if (payload?.attackerId && payload?.sourceAbilityId) {
                    const match = findPlayerAbility(G, payload.attackerId, payload.sourceAbilityId);
                    const explicitKey = match?.variant?.sfxKey ?? match?.ability?.sfxKey;
                    if (explicitKey) return null;
                }
                return 'combat.general.mini_games_sound_effects_and_music_pack.weapon_swoosh.sfx_weapon_melee_swoosh_sword_1';
            }
            if (type.includes('PRE_DEFENSE')) {
                return 'combat.general.mini_games_sound_effects_and_music_pack.weapon_swoosh.sfx_weapon_melee_swoosh_small_1';
            }
        }

        if (type === 'DECK_SHUFFLED' || type === 'CARD_REORDERED' || type.startsWith('CARD_') || type === 'SELL_UNDONE') {
            const cardSoundMap: Record<string, string> = {
                CARD_DRAWN: 'card.handling.decks_and_cards_sound_fx_pack.card_take_001',
                CARD_DISCARDED: 'card.fx.decks_and_cards_sound_fx_pack.fx_discard_001',
                CARD_SOLD: 'card.fx.decks_and_cards_sound_fx_pack.fx_discard_for_gold_001',
                SELL_UNDONE: 'card.fx.decks_and_cards_sound_fx_pack.fx_boost_001',
                CARD_REORDERED: 'card.handling.decks_and_cards_sound_fx_pack.cards_scrolling_001',
                DECK_SHUFFLED: 'card.handling.decks_and_cards_sound_fx_pack.cards_shuffle_fast_001',
            };
            return cardSoundMap[type] ?? null;
        }

        return null;
    },
    bgmRules: [
        {
            when: (context) => {
                const { currentPhase } = context.ctx as { currentPhase?: TurnPhase };
                return currentPhase === 'offensiveRoll' || currentPhase === 'defensiveRoll';
            },
            key: BGM_DRAGON_DANCE_KEY,
            group: 'battle',
        },
        {
            when: () => true,
            key: BGM_STORMBORN_KEY,
            group: 'normal',
        },
    ],
    stateTriggers: [
        {
            condition: (prev, next) => {
                const prevOver = (prev.ctx as { isGameOver?: boolean }).isGameOver;
                const nextOver = (next.ctx as { isGameOver?: boolean }).isGameOver;
                return !prevOver && !!nextOver;
            },
            resolveSound: (_prev, next) => {
                const isWinner = (next.ctx as { isWinner?: boolean }).isWinner;
                return isWinner
                    ? 'stinger.mini_games_sound_effects_and_music_pack.stinger.stgr_action_win'
                    : 'stinger.mini_games_sound_effects_and_music_pack.stinger.stgr_action_lose';
            },
        },
    ],
    contextualPreloadKeys: (context) => {
        const core = context.G as DiceThroneCore | undefined;
        if (!core) return [];
        const selected = new Set<SelectableCharacterId>();
        for (const charId of Object.values(core.selectedCharacters ?? {})) {
            if (charId && charId !== 'unselected') {
                selected.add(charId as SelectableCharacterId);
            }
        }
        if (selected.size === 0) return [];

        const keys = new Set<string>();

        // 通用战斗音效（选角后立即预加载，消除首次攻击延迟）
        const MELEE_LIGHT_KEYS = [
            'combat.general.mini_games_sound_effects_and_music_pack.weapon_swoosh.sfx_weapon_melee_swoosh_small_1',
            'combat.general.mini_games_sound_effects_and_music_pack.weapon_swoosh.sfx_weapon_melee_swoosh_sword_1',
        ];
        const MELEE_HEAVY_KEYS = [
            'fantasy.dark_sword_whoosh_01',
            'fantasy.dark_sword_whoosh_02',
            'fantasy.dark_sword_whoosh_03',
        ];
        const DAMAGE_HEAVY_KEY = 'combat.general.fight_fury_vol_2.special_hit.fghtimpt_special_hit_01_krst';
        const DAMAGE_LIGHT_KEY = 'combat.general.fight_fury_vol_2.versatile_punch_hit.fghtimpt_versatile_punch_hit_01_krst';
        const UNIT_DESTROY_KEY = 'combat.general.fight_fury_vol_2.body_hitting_the_ground_with_blood.fghtbf_body_hitting_the_ground_with_blood_01_krst';

        MELEE_LIGHT_KEYS.forEach(key => keys.add(key));
        MELEE_HEAVY_KEYS.forEach(key => keys.add(key));
        keys.add(DAMAGE_HEAVY_KEY);
        keys.add(DAMAGE_LIGHT_KEY);
        keys.add(UNIT_DESTROY_KEY);

        // 已选角色的专属音效（技能 + Token）
        for (const charId of selected) {
            const data = CHARACTER_DATA_MAP[charId];
            if (!data) continue;
            // 技能 sfxKey
            for (const ability of data.abilities) {
                if (ability.sfxKey) keys.add(ability.sfxKey);
            }
            // Token sfxKey
            for (const token of data.tokens) {
                if (token.sfxKey) keys.add(token.sfxKey);
            }
        }

        return Array.from(keys);
    },
};

const findCardById = (state: DiceThroneCore, cardId?: string) => {
    if (!cardId) return undefined;
    for (const player of Object.values(state.players)) {
        const card = player.hand.find(c => c.id === cardId)
            ?? player.deck.find(c => c.id === cardId)
            ?? player.discard.find(c => c.id === cardId);
        if (card) return card;
    }
    return findHeroCard(cardId);
};

const findAbilityById = (state: DiceThroneCore, abilityId?: string) => {
    if (!abilityId) return null;
    const players = state.players ?? {};
    for (const playerId of Object.keys(players)) {
        const match = findPlayerAbility(state, playerId, abilityId);
        if (match) return match;
    }
    return null;
};
