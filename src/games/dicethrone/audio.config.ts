/**
 * DiceThrone 音频配置
 * 定义游戏所需的所有音效及其映射（仅 Monk 角色）
 */
import type { GameAudioConfig } from '../../lib/audio/types';

// 音效资源基础路径（相对于 public/assets/）
const SFX_BASE = 'dicethrone/audio';

export const DICETHRONE_AUDIO_CONFIG: GameAudioConfig = {
    basePath: SFX_BASE,

    sounds: {
        // ============ 骰子音效 ============
        dice_roll: { src: 'dice/compressed/SFX_Dice_Roll_1.ogg', volume: 0.8 },
        dice_roll_2: { src: 'dice/compressed/SFX_Dice_Roll_2.ogg', volume: 0.8 },
        dice_roll_3: { src: 'dice/compressed/SFX_Dice_Roll_3.ogg', volume: 0.8 },
        dice_lock: { src: 'ui/compressed/SFX_UI_Click_Generic_Retro.ogg', volume: 0.5 },
        dice_confirm: { src: 'ui/compressed/SFX_UI_Click_Buy.ogg', volume: 0.6 },

        // ============ 卡牌音效 ============
        card_draw: { src: 'card/compressed/SFX_Card_Draw_1.ogg', volume: 0.7 },
        card_play: { src: 'card/compressed/SFX_Card_Play_1.ogg', volume: 0.8 },
        card_discard: { src: 'card/compressed/SFX_Card_Deal_1.ogg', volume: 0.6 },
        card_sell: { src: 'ui/compressed/SFX_UI_Click_Buy.ogg', volume: 0.7 },

        // ============ 战斗音效（Monk 拳脚） ============
        attack_punch: { src: 'fight/compressed/SFX_Fight_Punch_Swoosh_1.ogg', volume: 0.8 },
        attack_kick: { src: 'fight/compressed/SFX_Fight_Kick_Swoosh_1.ogg', volume: 0.8 },
        attack_hit: { src: 'fight/compressed/SFX_Fight_Hit_1.ogg', volume: 0.9 },
        attack_hit_heavy: { src: 'fight/compressed/SFX_Fight_Hit_v2_1.ogg', volume: 1.0 },
        damage_dealt: { src: 'fight/compressed/SFX_Body_Hit_Generic_Medium_1.ogg', volume: 0.8 },

        // ============ 状态效果音效 ============
        token_gain: { src: 'ui/compressed/SFX_UI_Fillup_Gem_1.ogg', volume: 0.6 },
        token_use: { src: 'ui/compressed/SFX_UI_Click_Generic_Cute.ogg', volume: 0.5 },
        status_apply: { src: 'ui/compressed/SFX_UI_Fillup_Star_1.ogg', volume: 0.6 },
        status_remove: { src: 'ui/compressed/SFX_UI_Click_Close_Cute.ogg', volume: 0.5 },
        heal: { src: 'ui/compressed/SFX_UI_Fillup_Gold_1.ogg', volume: 0.7 },

        // ============ UI 音效 ============
        click: { src: 'ui/compressed/SFX_UI_Click_Generic_Retro.ogg', volume: 0.4 },
        hover: { src: 'ui/compressed/SFX_UI_Click_Generic_Cute.ogg', volume: 0.2 },
        phase_change: { src: 'ui/compressed/SFX_UI_Click_Open_Retro.ogg', volume: 0.5 },
        turn_change: { src: 'ui/compressed/SFX_UI_Countdown_Retro_End.ogg', volume: 0.6 },

        // ============ 游戏结果音效 ============
        victory: { src: 'stinger/compressed/STGR_Action_Win.ogg', volume: 1.0 },
        defeat: { src: 'stinger/compressed/STGR_Action_Lose.ogg', volume: 1.0 },
    },

    bgm: [
        {
            key: 'battle',
            name: 'Dragon Dance',
            src: 'music/compressed/Fantasy Vol5 Dragon Dance Main.ogg',
            volume: 0.5,
        },
        {
            key: 'battle_intense',
            name: 'Shields and Spears',
            src: 'music/compressed/Fantasy Vol5 Shields and Spears Main.ogg',
            volume: 0.5,
        },
    ],

    // Move 名称映射到音效（可选，用于 useGameAudio 自动触发）
    moves: {
        ROLL_DICE: 'dice_roll',
        TOGGLE_DIE_LOCK: 'dice_lock',
        CONFIRM_ROLL: 'dice_confirm',
        DRAW_CARD: 'card_draw',
        PLAY_CARD: 'card_play',
        DISCARD_CARD: 'card_discard',
        SELL_CARD: 'card_sell',
        ADVANCE_PHASE: 'phase_change',
    },
};

// 导出音效 key 常量，供组件直接引用
export const AUDIO_KEYS = {
    // 骰子
    DICE_ROLL: 'dice_roll',
    DICE_LOCK: 'dice_lock',
    DICE_CONFIRM: 'dice_confirm',
    // 卡牌
    CARD_DRAW: 'card_draw',
    CARD_PLAY: 'card_play',
    CARD_DISCARD: 'card_discard',
    CARD_SELL: 'card_sell',
    // 战斗
    ATTACK_PUNCH: 'attack_punch',
    ATTACK_KICK: 'attack_kick',
    ATTACK_HIT: 'attack_hit',
    ATTACK_HIT_HEAVY: 'attack_hit_heavy',
    DAMAGE_DEALT: 'damage_dealt',
    // 状态
    TOKEN_GAIN: 'token_gain',
    TOKEN_USE: 'token_use',
    STATUS_APPLY: 'status_apply',
    STATUS_REMOVE: 'status_remove',
    HEAL: 'heal',
    // UI
    CLICK: 'click',
    HOVER: 'hover',
    PHASE_CHANGE: 'phase_change',
    TURN_CHANGE: 'turn_change',
    // 游戏结果
    VICTORY: 'victory',
    DEFEAT: 'defeat',
} as const;
