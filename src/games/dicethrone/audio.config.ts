/**
 * DiceThrone 音频配置
 * 定义游戏所需的所有音效及其映射（仅 Monk 角色）
 */
import type { AudioEvent, AudioRuntimeContext, GameAudioConfig } from '../../lib/audio/types';
import { FLOW_EVENTS } from '../../engine/systems/FlowSystem';
import { pickRandomSoundKey } from '../../lib/audio/audioUtils';
import { findPlayerAbility } from './domain/abilityLookup';
import type { DiceThroneCore, TurnPhase } from './domain/types';
import { MONK_CARDS } from './monk/cards';

// 音效资源基础路径（相对于 public/assets/）
const SFX_BASE = 'dicethrone/audio';

export const DICETHRONE_AUDIO_CONFIG: GameAudioConfig = {
    basePath: SFX_BASE,

    sounds: {
        // ============ 骰子音效 ============
        dice_roll: { src: 'dice/compressed/Dice_Roll_Velvet_001.ogg', volume: 0.8, category: { group: 'dice', sub: 'roll' } },
        dice_roll_2: { src: 'dice/compressed/Few_Dice_Roll_001.ogg', volume: 0.8, category: { group: 'dice', sub: 'roll' } },
        dice_roll_3: { src: 'dice/compressed/Many_Dice_Roll_Wood_001.ogg', volume: 0.8, category: { group: 'dice', sub: 'roll' } },
        dice_lock: { src: 'dice/compressed/Dice_Handling_001.ogg', volume: 0.5, category: { group: 'dice', sub: 'lock' } },
        dice_confirm: { src: 'ui/compressed/UIClick_Accept_Button_01.ogg', volume: 0.6, category: { group: 'dice', sub: 'confirm' } },
        bonus_die_roll: { src: 'dice/compressed/Single_Die_Roll_001.ogg', volume: 0.8, category: { group: 'dice', sub: 'bonus' } },
        die_modify: { src: 'dice/compressed/Dice_Handling_002.ogg', volume: 0.5, category: { group: 'dice', sub: 'modify' } },
        die_reroll: { src: 'dice/compressed/Dice_Roll_Velvet_002.ogg', volume: 0.8, category: { group: 'dice', sub: 'reroll' } },

        // ============ 卡牌音效 ============
        card_draw: { src: 'card/compressed/Card_Take_001.ogg', volume: 0.7, category: { group: 'card', sub: 'draw' } },
        card_play: { src: 'card/compressed/Card_Placing_001.ogg', volume: 0.8, category: { group: 'card', sub: 'play' } },
        card_discard: { src: 'card/compressed/FX_Discard_001.ogg', volume: 0.6, category: { group: 'card', sub: 'discard' } },
        card_sell: { src: 'card/compressed/Small_Coin_Drop_001.ogg', volume: 0.7, category: { group: 'card', sub: 'sell' } },
        card_sell_undo: { src: 'card/compressed/Small_Reward_001.ogg', volume: 0.6, category: { group: 'card', sub: 'sell_undo' } },
        card_reorder: { src: 'card/compressed/Cards_Scrolling_001.ogg', volume: 0.5, category: { group: 'card', sub: 'reorder' } },
        deck_shuffle: { src: 'card/compressed/Cards_Shuffle_Fast_001.ogg', volume: 0.7, category: { group: 'card', sub: 'shuffle' } },
        cp_gain: { src: 'card/compressed/Small_Coin_Drop_001.ogg', volume: 0.7, category: { group: 'system', sub: 'cp_gain' } },
        cp_spend: { src: 'card/compressed/Small_Coin_Drop_001.ogg', volume: 0.7, category: { group: 'system', sub: 'cp_spend' } },

        // ============ 战斗音效（Monk 拳脚） ============
        attack_punch: { src: 'fight/compressed/WHSH_Punch_Whooosh_01.ogg', volume: 0.8, category: { group: 'combat', sub: 'punch' } },
        attack_kick: { src: 'fight/compressed/SFX_Fight_Kick_Swoosh_1.ogg', volume: 0.8, category: { group: 'combat', sub: 'kick' } },
        attack_hit: { src: 'fight/compressed/FGHTImpt_Versatile_Punch_Hit_01.ogg', volume: 0.9, category: { group: 'combat', sub: 'hit' } },
        attack_hit_heavy: { src: 'fight/compressed/FGHTImpt_Special_Hit_01.ogg', volume: 1.0, category: { group: 'combat', sub: 'hit_heavy' } },
        attack_start: { src: 'fight/compressed/SFX_Weapon_Melee_Swoosh_Sword_1.ogg', volume: 0.85, category: { group: 'combat', sub: 'start' } },
        attack_resolve: { src: 'fight/compressed/FGHTImpt_Special_Hit_02.ogg', volume: 0.9, category: { group: 'combat', sub: 'resolve' } },
        ability_activate: { src: 'fight/compressed/SFX_Weapon_Melee_Swoosh_Small_1.ogg', volume: 0.7, category: { group: 'combat', sub: 'ability' } },
        damage_prevented: { src: 'fight/compressed/Shield_Impact_A.ogg', volume: 0.75, category: { group: 'combat', sub: 'shield' } },
        damage_dealt: { src: 'fight/compressed/SFX_Body_Hit_Generic_Small_1.ogg', volume: 0.8, category: { group: 'combat', sub: 'damage' } },

        // ============ 状态效果音效 ============
        token_gain: { src: 'token/compressed/Token_Drop_001.ogg', volume: 0.6, category: { group: 'token', sub: 'gain' } },
        token_use: { src: 'token/compressed/Tokens_Handling_001.ogg', volume: 0.5, category: { group: 'token', sub: 'use' } },
        status_apply: { src: 'status/compressed/Charged_A.ogg', volume: 0.6, category: { group: 'status', sub: 'apply' } },
        status_remove: { src: 'status/compressed/Purged_A.ogg', volume: 0.5, category: { group: 'status', sub: 'remove' } },
        heal: { src: 'status/compressed/Healed_A.ogg', volume: 0.7, category: { group: 'status', sub: 'heal' } },
        damage_shield_gain: { src: 'status/compressed/Water_Shield.ogg', volume: 0.75, category: { group: 'status', sub: 'shield' } },

        // ============ UI 音效 ============
        click: { src: 'ui/compressed/UIClick_Accept_Button_01.ogg', volume: 0.4, category: { group: 'ui', sub: 'click' } },
        hover: { src: 'ui/compressed/UIClick_Mouseover_Dialog_Option_01.ogg', volume: 0.2, category: { group: 'ui', sub: 'hover' } },
        phase_change: { src: 'ui/compressed/UIAlert_Dialog_Screen_Appears_01.ogg', volume: 0.5, category: { group: 'system', sub: 'phase_change' } },
        turn_change: { src: 'ui/compressed/Update_Chime_A.ogg', volume: 0.6, category: { group: 'system', sub: 'turn_change' } },
        response_open: { src: 'ui/compressed/Signal_Positive_Wood_Chimes_A.ogg', volume: 0.5, category: { group: 'system', sub: 'response_open' } },
        response_close: { src: 'ui/compressed/Signal_Negative_Wood_Chimes_A.ogg', volume: 0.5, category: { group: 'system', sub: 'response_close' } },
        choice_request: { src: 'status/compressed/Ready_A.ogg', volume: 0.5, category: { group: 'system', sub: 'choice_request' } },
        choice_resolve: { src: 'ui/compressed/Signal_Positive_Spring_A.ogg', volume: 0.5, category: { group: 'system', sub: 'choice_resolve' } },

        // ============ 游戏结果音效 ============
        victory: { src: 'stinger/compressed/STGR_Action_Win.ogg', volume: 1.0, category: { group: 'stinger', sub: 'victory' } },
        defeat: { src: 'stinger/compressed/STGR_Action_Lose.ogg', volume: 1.0, category: { group: 'stinger', sub: 'defeat' } },
    },

    bgm: [
        {
            key: 'battle',
            name: 'Dragon Dance',
            src: 'music/compressed/Fantasy Vol5 Dragon Dance Main.ogg',
            volume: 0.5,
            category: { group: 'bgm', sub: 'battle' },
        },
        {
            key: 'battle_intense',
            name: 'Shields and Spears',
            src: 'music/compressed/Fantasy Vol5 Shields and Spears Main.ogg',
            volume: 0.5,
            category: { group: 'bgm', sub: 'battle_intense' },
        },
    ],
    eventSoundMap: {
        [FLOW_EVENTS.PHASE_CHANGED]: 'phase_change',
        BONUS_DIE_ROLLED: 'bonus_die_roll',
        DIE_LOCK_TOGGLED: 'dice_lock',
        ROLL_CONFIRMED: 'dice_confirm',
        DIE_MODIFIED: 'die_modify',
        DIE_REROLLED: 'die_reroll',
        CARD_DRAWN: 'card_draw',
        CARD_DISCARDED: 'card_discard',
        CARD_SOLD: 'card_sell',
        SELL_UNDONE: 'card_sell_undo',
        CARD_REORDERED: 'card_reorder',
        DECK_SHUFFLED: 'deck_shuffle',
        TOKEN_GRANTED: 'token_gain',
        TOKEN_USED: 'token_use',
        STATUS_APPLIED: 'status_apply',
        STATUS_REMOVED: 'status_remove',
        HEAL_APPLIED: 'heal',
        DAMAGE_SHIELD_GRANTED: 'damage_shield_gain',
        DAMAGE_PREVENTED: 'damage_prevented',
        ATTACK_INITIATED: 'attack_start',
        ATTACK_RESOLVED: 'attack_resolve',
        CHOICE_REQUESTED: 'choice_request',
        CHOICE_RESOLVED: 'choice_resolve',
        RESPONSE_WINDOW_OPENED: 'response_open',
        RESPONSE_WINDOW_CLOSED: 'response_close',
        TURN_CHANGED: 'turn_change',
    },
    eventSoundResolver: (event, context) => {
        const runtime = context as AudioRuntimeContext<
            DiceThroneCore,
            { currentPhase: TurnPhase; isGameOver: boolean; isWinner?: boolean },
            { currentPlayerId: string }
        >;
        const { G, meta } = runtime;

        if (event.type === 'DICE_ROLLED') {
            const diceKeys = ['dice_roll', 'dice_roll_2', 'dice_roll_3'];
            return pickRandomSoundKey('dicethrone.dice_roll', diceKeys, { minGap: 1 });
        }

        if (event.type === 'CP_CHANGED') {
            const delta = (event as AudioEvent & { payload?: { delta?: number } }).payload?.delta ?? 0;
            return delta >= 0 ? 'cp_gain' : 'cp_spend';
        }

        if (event.type === 'CARD_PLAYED') {
            const cardId = (event as AudioEvent & { payload?: { cardId?: string } }).payload?.cardId;
            const card = findCardById(G, cardId);
            const hasEffectSfx = card?.effects?.some(effect => effect.sfxKey);
            if (hasEffectSfx) return null;
            return card?.sfxKey ?? 'card_play';
        }

        if (event.type === 'ABILITY_ACTIVATED') {
            const payload = (event as AudioEvent & { payload?: { playerId?: string; abilityId?: string; isDefense?: boolean } }).payload;
            if (!payload?.playerId || !payload?.abilityId) return undefined;
            const match = findPlayerAbility(G, payload.playerId, payload.abilityId);
            const explicitKey = match?.variant?.sfxKey ?? match?.ability?.sfxKey;
            if (payload.isDefense && !explicitKey) return null;
            return explicitKey ?? 'ability_activate';
        }

        if (event.type === 'DAMAGE_DEALT') {
            const payload = (event as AudioEvent & { payload?: { actualDamage?: number; targetId?: string } }).payload;
            const damage = payload?.actualDamage ?? 0;
            if (damage <= 0) return null;
            if (payload?.targetId && meta?.currentPlayerId && payload.targetId !== meta.currentPlayerId) {
                return damage >= 8 ? 'attack_hit_heavy' : 'attack_hit';
            }
            return 'damage_dealt';
        }

        return undefined;
    },
    bgmRules: [
        {
            when: (context) => {
                const { currentPhase } = context.ctx as { currentPhase?: TurnPhase };
                return currentPhase === 'offensiveRoll' || currentPhase === 'defensiveRoll';
            },
            key: 'battle_intense',
        },
        {
            when: () => true,
            key: 'battle',
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
                return isWinner ? 'victory' : 'defeat';
            },
        },
    ],
};

const findCardById = (state: DiceThroneCore, cardId?: string) => {
    if (!cardId) return undefined;
    for (const player of Object.values(state.players)) {
        const card = player.hand.find(c => c.id === cardId)
            ?? player.deck.find(c => c.id === cardId)
            ?? player.discard.find(c => c.id === cardId);
        if (card) return card;
    }
    return MONK_CARDS.find(card => card.id === cardId);
};
