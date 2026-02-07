/**
 * 大杀四方 (Smash Up) - 领域类型定义
 *
 * 核心概念：
 * - 每位玩家选 2 个派系混搭成 40 张牌库
 * - 回合制：出牌 → 基地记分 → 抽牌
 * - 基地力量达到临界点时记分，前三名获 VP
 * - 先到 15 VP 胜出
 */

import type { Command, GameEvent, GameOverResult, PlayerId } from '../../../engine/types';
import type { CardPreviewRef } from '../../../systems/CardSystem/types';

// ============================================================================
// 游戏阶段
// ============================================================================

/** 游戏阶段（按规则顺序） */
export type GamePhase =
    | 'startTurn'    // 1. 回合开始
    | 'playCards'    // 2. 出牌阶段
    | 'scoreBases'   // 3. 基地记分
    | 'draw'         // 4. 抽牌阶段
    | 'endTurn';     // 5. 回合结束

export const PHASE_ORDER: GamePhase[] = [
    'startTurn', 'playCards', 'scoreBases', 'draw', 'endTurn',
];

// ============================================================================
// 卡牌定义（静态数据）
// ============================================================================

/** 卡牌类别 */
export type CardType = 'minion' | 'action';

/** 行动卡子类型 */
export type ActionSubtype = 'standard' | 'ongoing' | 'special';

/** 派系 ID */
export type FactionId = string;

/** 能力标签 */
export type AbilityTag = 'onPlay' | 'ongoing' | 'special' | 'talent' | 'extra';

/** 随从卡定义 */
export interface MinionCardDef {
    id: string;
    type: 'minion';
    name: string;
    nameEn: string;
    faction: FactionId;
    power: number;
    abilityText?: string;
    abilityTextEn?: string;
    abilityTags?: AbilityTag[];
    /** 牌组中的数量 */
    count: number;
    previewRef?: CardPreviewRef;
}

/** 行动卡定义 */
export interface ActionCardDef {
    id: string;
    type: 'action';
    subtype: ActionSubtype;
    name: string;
    nameEn: string;
    faction: FactionId;
    effectText: string;
    effectTextEn: string;
    abilityTags?: AbilityTag[];
    count: number;
    previewRef?: CardPreviewRef;
}

/** 卡牌定义联合类型 */
export type CardDef = MinionCardDef | ActionCardDef;

/** 基地卡定义 */
export interface BaseCardDef {
    id: string;
    name: string;
    nameEn: string;
    breakpoint: number;
    /** VP 奖励：[1st, 2nd, 3rd] */
    vpAwards: [number, number, number];
    abilityText?: string;
    abilityTextEn?: string;
    /** 关联派系 */
    faction?: FactionId;
    previewRef?: CardPreviewRef;
}

// ============================================================================
// 运行时卡牌实例
// ============================================================================

/** 卡牌实例（运行时唯一） */
export interface CardInstance {
    uid: string;
    defId: string;
    type: CardType;
    owner: PlayerId;
}

/** 基地上的随从 */
export interface MinionOnBase {
    uid: string;
    defId: string;
    controller: PlayerId;
    owner: PlayerId;
    /** 印刷力量（冗余，避免频繁查表） */
    basePower: number;
    /** 力量修正（+1 指示物等） */
    powerModifier: number;
    /** 本回合是否已使用天赋 */
    talentUsed: boolean;
    /** 附着的行动卡 UID 列表 */
    attachedActions: string[];
}

/** 场上的基地 */
export interface BaseInPlay {
    defId: string;
    minions: MinionOnBase[];
    /** 持续行动卡 UID 列表 */
    ongoingActions: string[];
}

// ============================================================================
// 玩家状态
// ============================================================================

export interface PlayerState {
    id: PlayerId;
    vp: number;
    hand: CardInstance[];
    /** 牌库（索引 0 为顶部） */
    deck: CardInstance[];
    discard: CardInstance[];
    /** 本回合已打出随从数 */
    minionsPlayed: number;
    /** 本回合可打出随从额度（默认 1） */
    minionLimit: number;
    /** 本回合已打出行动数 */
    actionsPlayed: number;
    /** 本回合可打出行动额度（默认 1） */
    actionLimit: number;
    /** 选择的派系 */
    factions: [FactionId, FactionId];
}

// ============================================================================
// 核心游戏状态
// ============================================================================

/** 常量 */
export const HAND_LIMIT = 10;
export const STARTING_HAND_SIZE = 5;
export const DRAW_PER_TURN = 2;
export const VP_TO_WIN = 15;

export interface SmashUpCore {
    players: Record<PlayerId, PlayerState>;
    /** 玩家回合顺序 */
    turnOrder: PlayerId[];
    /** 当前玩家索引 */
    currentPlayerIndex: number;
    /** 场上基地 */
    bases: BaseInPlay[];
    /** 基地牌库（defId 列表） */
    baseDeck: string[];
    /** 回合数 */
    turnNumber: number;
    /** UID 自增计数器 */
    nextUid: number;
    /** 游戏结果 */
    gameResult?: GameOverResult;
}

// ============================================================================
// 辅助函数
// ============================================================================

export function getCurrentPlayerId(state: SmashUpCore): PlayerId {
    return state.turnOrder[state.currentPlayerIndex];
}

export function getPlayerPowerOnBase(base: BaseInPlay, playerId: PlayerId): number {
    return base.minions
        .filter(m => m.controller === playerId)
        .reduce((sum, m) => sum + m.basePower + m.powerModifier, 0);
}

export function getTotalPowerOnBase(base: BaseInPlay): number {
    return base.minions.reduce((sum, m) => sum + m.basePower + m.powerModifier, 0);
}

// ============================================================================
// 命令类型
// ============================================================================

export const SU_COMMANDS = {
    PLAY_MINION: 'su:play_minion',
    PLAY_ACTION: 'su:play_action',
    DISCARD_TO_LIMIT: 'su:discard_to_limit',
} as const;

/** 打出随从 */
export interface PlayMinionCommand extends Command<typeof SU_COMMANDS.PLAY_MINION> {
    payload: {
        cardUid: string;
        baseIndex: number;
    };
}

/** 打出行动卡 */
export interface PlayActionCommand extends Command<typeof SU_COMMANDS.PLAY_ACTION> {
    payload: {
        cardUid: string;
        targetBaseIndex?: number;
        targetMinionUid?: string;
    };
}

/** 弃牌至手牌上限 */
export interface DiscardToLimitCommand extends Command<typeof SU_COMMANDS.DISCARD_TO_LIMIT> {
    payload: {
        cardUids: string[];
    };
}

export type SmashUpCommand =
    | PlayMinionCommand
    | PlayActionCommand
    | DiscardToLimitCommand;

// ============================================================================
// 事件类型
// ============================================================================

export const SU_EVENTS = {
    MINION_PLAYED: 'su:minion_played',
    ACTION_PLAYED: 'su:action_played',
    BASE_SCORED: 'su:base_scored',
    VP_AWARDED: 'su:vp_awarded',
    CARDS_DRAWN: 'su:cards_drawn',
    CARDS_DISCARDED: 'su:cards_discarded',
    TURN_STARTED: 'su:turn_started',
    TURN_ENDED: 'su:turn_ended',
    BASE_REPLACED: 'su:base_replaced',
    DECK_RESHUFFLED: 'su:deck_reshuffled',
    MINION_RETURNED: 'su:minion_returned',
    LIMIT_MODIFIED: 'su:limit_modified',
} as const;

export interface MinionPlayedEvent extends GameEvent<typeof SU_EVENTS.MINION_PLAYED> {
    payload: {
        playerId: PlayerId;
        cardUid: string;
        defId: string;
        baseIndex: number;
        power: number;
    };
}

export interface ActionPlayedEvent extends GameEvent<typeof SU_EVENTS.ACTION_PLAYED> {
    payload: {
        playerId: PlayerId;
        cardUid: string;
        defId: string;
    };
}

export interface BaseScoredEvent extends GameEvent<typeof SU_EVENTS.BASE_SCORED> {
    payload: {
        baseIndex: number;
        baseDefId: string;
        /** 排名与 VP：按力量降序 */
        rankings: { playerId: PlayerId; power: number; vp: number }[];
    };
}

export interface VpAwardedEvent extends GameEvent<typeof SU_EVENTS.VP_AWARDED> {
    payload: {
        playerId: PlayerId;
        amount: number;
        reason: string;
    };
}

export interface CardsDrawnEvent extends GameEvent<typeof SU_EVENTS.CARDS_DRAWN> {
    payload: {
        playerId: PlayerId;
        count: number;
        cardUids: string[];
    };
}

export interface CardsDiscardedEvent extends GameEvent<typeof SU_EVENTS.CARDS_DISCARDED> {
    payload: {
        playerId: PlayerId;
        cardUids: string[];
    };
}

export interface TurnStartedEvent extends GameEvent<typeof SU_EVENTS.TURN_STARTED> {
    payload: {
        playerId: PlayerId;
        turnNumber: number;
    };
}

export interface TurnEndedEvent extends GameEvent<typeof SU_EVENTS.TURN_ENDED> {
    payload: {
        playerId: PlayerId;
        nextPlayerIndex: number;
    };
}

export interface BaseReplacedEvent extends GameEvent<typeof SU_EVENTS.BASE_REPLACED> {
    payload: {
        baseIndex: number;
        oldBaseDefId: string;
        newBaseDefId: string;
    };
}

export interface DeckReshuffledEvent extends GameEvent<typeof SU_EVENTS.DECK_RESHUFFLED> {
    payload: {
        playerId: PlayerId;
        deckUids: string[];
    };
}

/** 随从被收回手牌 */
export interface MinionReturnedEvent extends GameEvent<typeof SU_EVENTS.MINION_RETURNED> {
    payload: {
        minionUid: string;
        minionDefId: string;
        fromBaseIndex: number;
        /** 回到谁的手牌（所有者） */
        toPlayerId: PlayerId;
        /** 触发来源 */
        reason: string;
    };
}

/** 出牌额度修改 */
export interface LimitModifiedEvent extends GameEvent<typeof SU_EVENTS.LIMIT_MODIFIED> {
    payload: {
        playerId: PlayerId;
        limitType: 'minion' | 'action';
        delta: number;
        reason: string;
    };
}

export type SmashUpEvent =
    | MinionPlayedEvent
    | ActionPlayedEvent
    | BaseScoredEvent
    | VpAwardedEvent
    | CardsDrawnEvent
    | CardsDiscardedEvent
    | TurnStartedEvent
    | TurnEndedEvent
    | BaseReplacedEvent
    | DeckReshuffledEvent
    | MinionReturnedEvent
    | LimitModifiedEvent;
