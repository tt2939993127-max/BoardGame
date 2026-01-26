/**
 * DiceThrone 领域类型定义
 * 包含核心状态、命令和事件类型
 */

import type { Command, GameEvent, PlayerId } from '../../../engine/types';
import type { StatusEffectDef } from '../../../systems/StatusEffectSystem';
import type { AbilityDef, AbilityEffect } from '../../../systems/AbilitySystem';
import type { ResourcePool } from '../../../systems/ResourceSystem/types';

// ============================================================================
// 基础类型（从 types.ts 迁移）
// ============================================================================

export type TurnPhase =
    | 'setup'
    | 'upkeep'
    | 'income'
    | 'main1'
    | 'offensiveRoll'
    | 'defensiveRoll'
    | 'main2'
    | 'discard';

export type DieFace = 'fist' | 'palm' | 'taiji' | 'lotus';

/**
 * 骰子实例
 * 扩展自引擎层 DiceSystem 的 Die 接口
 */
export interface Die {
    id: number;
    /** 骰子定义 ID（如 'monk-dice'） */
    definitionId: string;
    /** 当前点数 (1-6) */
    value: number;
    /** 当前主符号（从定义解析） */
    symbol: DieFace | null;
    /** 当前所有符号 */
    symbols: string[];
    /** 是否锁定（保留不重掷） */
    isKept: boolean;
}

export interface AbilityCard {
    id: string;
    name: string;
    type: 'upgrade' | 'action';
    cpCost: number;
    timing: 'main' | 'roll' | 'instant';
    description: string;
    atlasIndex?: number;
    /** 卡牌效果列表（行动卡的即时效果，或升级卡的 replaceAbility 效果） */
    effects?: AbilityEffect[];
}

export interface PendingAttack {
    attackerId: PlayerId;
    defenderId: PlayerId;
    isDefendable: boolean;
    damage?: number;
    sourceAbilityId?: string;
    defenseAbilityId?: string;
    isUltimate?: boolean;
    preDefenseResolved?: boolean;
    bonusDamage?: number;
    extraRoll?: {
        value?: number;
        resolved?: boolean;
    };
}

export interface HeroState {
    id: string;
    characterId: 'monk';
    /** 资源池（hp, cp 等） */
    resources: ResourcePool;
    hand: AbilityCard[];
    deck: AbilityCard[];
    discard: AbilityCard[];
    statusEffects: Record<string, number>;
    abilities: AbilityDef[];
    abilityLevels: Record<string, number>;
    /** 已覆盖在技能上的升级卡信息（用于 II->III 差价计算 / 未来 UI 展示） */
    upgradeCardByAbilityId: Record<string, { cardId: string; cpCost: number }>;
}

// ============================================================================
// 核心状态
// ============================================================================

/**
 * DiceThrone 核心状态（领域层）
 */
export interface DiceThroneCore {
    players: Record<PlayerId, HeroState>;
    dice: Die[];
    rollCount: number;
    rollLimit: number;
    rollDiceCount: number;
    rollConfirmed: boolean;
    turnPhase: TurnPhase;
    activePlayerId: PlayerId;
    startingPlayerId: PlayerId;
    turnNumber: number;
    pendingAttack: PendingAttack | null;
    availableAbilityIds: string[];
    statusDefinitions: StatusEffectDef[];
    activatingAbilityId?: string;
    lastEffectSourceByPlayerId?: Record<PlayerId, string | undefined>;
    lastSoldCardId?: string;
    /** 最后一次额外骰子投掷结果（用于 UI 展示） */
    lastBonusDieRoll?: { value: number; face: DieFace; playerId: PlayerId; timestamp: number };
}

// ============================================================================
// 命令定义
// ============================================================================

/** 掷骰命令 */
export interface RollDiceCommand extends Command<'ROLL_DICE'> {
    payload: Record<string, never>;
}

/** 投掷额外骰子命令（太极连击） */
export interface RollBonusDieCommand extends Command<'ROLL_BONUS_DIE'> {
    payload: Record<string, never>;
}

/** 锁定/解锁骰子命令 */
export interface ToggleDieLockCommand extends Command<'TOGGLE_DIE_LOCK'> {
    payload: {
        dieId: number;
    };
}

/** 确认骰子结果命令 */
export interface ConfirmRollCommand extends Command<'CONFIRM_ROLL'> {
    payload: Record<string, never>;
}

/** 选择技能命令 */
export interface SelectAbilityCommand extends Command<'SELECT_ABILITY'> {
    payload: {
        abilityId: string;
    };
}

/** 抽牌命令 */
export interface DrawCardCommand extends Command<'DRAW_CARD'> {
    payload: Record<string, never>;
}

/** 弃牌命令 */
export interface DiscardCardCommand extends Command<'DISCARD_CARD'> {
    payload: {
        cardId: string;
    };
}

/** 售卖卡牌命令 */
export interface SellCardCommand extends Command<'SELL_CARD'> {
    payload: {
        cardId: string;
    };
}

/** 撤回售卖命令 */
export interface UndoSellCardCommand extends Command<'UNDO_SELL_CARD'> {
    payload: Record<string, never>;
}

/** 重排卡牌到末尾命令 */
export interface ReorderCardToEndCommand extends Command<'REORDER_CARD_TO_END'> {
    payload: {
        cardId: string;
    };
}

/** 打出卡牌命令 */
export interface PlayCardCommand extends Command<'PLAY_CARD'> {
    payload: {
        cardId: string;
    };
}

/** 打出升级卡命令 */
export interface PlayUpgradeCardCommand extends Command<'PLAY_UPGRADE_CARD'> {
    payload: {
        cardId: string;
        targetAbilityId: string;
    };
}

/** 解决选择命令 */
export interface ResolveChoiceCommand extends Command<'RESOLVE_CHOICE'> {
    payload: {
        statusId: string;
    };
}

/** 推进阶段命令 */
export interface AdvancePhaseCommand extends Command<'ADVANCE_PHASE'> {
    payload: Record<string, never>;
}

/** 跳过响应窗口命令 */
export interface ResponsePassCommand extends Command<'RESPONSE_PASS'> {
    payload: Record<string, never>;
}

/** 所有 DiceThrone 命令 */
export type DiceThroneCommand =
    | RollDiceCommand
    | RollBonusDieCommand
    | ToggleDieLockCommand
    | ConfirmRollCommand
    | SelectAbilityCommand
    | DrawCardCommand
    | DiscardCardCommand
    | SellCardCommand
    | UndoSellCardCommand
    | ReorderCardToEndCommand
    | PlayCardCommand
    | PlayUpgradeCardCommand
    | ResolveChoiceCommand
    | AdvancePhaseCommand
    | ResponsePassCommand;

// ============================================================================
// 事件定义
// ============================================================================

/** 骰子结果事件 */
export interface DiceRolledEvent extends GameEvent<'DICE_ROLLED'> {
    payload: {
        results: number[];
        rollerId: PlayerId;
    };
}

/** 额外骰子结果事件 */
export interface BonusDieRolledEvent extends GameEvent<'BONUS_DIE_ROLLED'> {
    payload: {
        value: number;
        face: DieFace;
        playerId: PlayerId;
    };
}

/** 骰子锁定事件 */
export interface DieLockToggledEvent extends GameEvent<'DIE_LOCK_TOGGLED'> {
    payload: {
        dieId: number;
        isKept: boolean;
    };
}

/** 骰子确认事件 */
export interface RollConfirmedEvent extends GameEvent<'ROLL_CONFIRMED'> {
    payload: {
        playerId: PlayerId;
        availableAbilityIds: string[];
    };
}

/** 阶段切换事件 */
export interface PhaseChangedEvent extends GameEvent<'PHASE_CHANGED'> {
    payload: {
        from: TurnPhase;
        to: TurnPhase;
        activePlayerId: PlayerId;
    };
}

/** 技能激活事件 */
export interface AbilityActivatedEvent extends GameEvent<'ABILITY_ACTIVATED'> {
    payload: {
        abilityId: string;
        playerId: PlayerId;
        isDefense?: boolean;
    };
}

/** 伤害事件 */
export interface DamageDealtEvent extends GameEvent<'DAMAGE_DEALT'> {
    payload: {
        targetId: PlayerId;
        amount: number;
        actualDamage: number;
        sourceAbilityId?: string;
    };
}

/** 治疗事件 */
export interface HealAppliedEvent extends GameEvent<'HEAL_APPLIED'> {
    payload: {
        targetId: PlayerId;
        amount: number;
        sourceAbilityId?: string;
    };
}

/** 状态施加事件 */
export interface StatusAppliedEvent extends GameEvent<'STATUS_APPLIED'> {
    payload: {
        targetId: PlayerId;
        statusId: string;
        stacks: number;
        newTotal: number;
        sourceAbilityId?: string;
    };
}

/** 状态移除事件 */
export interface StatusRemovedEvent extends GameEvent<'STATUS_REMOVED'> {
    payload: {
        targetId: PlayerId;
        statusId: string;
        stacks: number;
    };
}

/** 抽牌事件 */
export interface CardDrawnEvent extends GameEvent<'CARD_DRAWN'> {
    payload: {
        playerId: PlayerId;
        cardId: string;
    };
}

/** 弃牌事件 */
export interface CardDiscardedEvent extends GameEvent<'CARD_DISCARDED'> {
    payload: {
        playerId: PlayerId;
        cardId: string;
    };
}

/** 售卖卡牌事件 */
export interface CardSoldEvent extends GameEvent<'CARD_SOLD'> {
    payload: {
        playerId: PlayerId;
        cardId: string;
        cpGained: number;
    };
}

/** 撤回售卖事件 */
export interface SellUndoneEvent extends GameEvent<'SELL_UNDONE'> {
    payload: {
        playerId: PlayerId;
        cardId: string;
    };
}

/** 打出卡牌事件 */
export interface CardPlayedEvent extends GameEvent<'CARD_PLAYED'> {
    payload: {
        playerId: PlayerId;
        cardId: string;
        cpCost: number;
    };
}

/** 技能替换事件（升级卡使用） */
export interface AbilityReplacedEvent extends GameEvent<'ABILITY_REPLACED'> {
    payload: {
        playerId: PlayerId;
        /** 被替换的技能 ID（原技能 ID，不变） */
        oldAbilityId: string;
        /** 新技能定义（会在 reducer 中强制保持 oldAbilityId） */
        newAbilityDef: AbilityDef;
        /** 触发升级的卡牌 ID（用于从手牌移除） */
        cardId: string;
        /** 升级后的等级（用于 abilityLevels 追踪） */
        newLevel: number;
    };
}

/** CP 变化事件 */
export interface CpChangedEvent extends GameEvent<'CP_CHANGED'> {
    payload: {
        playerId: PlayerId;
        delta: number;
        newValue: number;
    };
}

/** 卡牌重排事件 */
export interface CardReorderedEvent extends GameEvent<'CARD_REORDERED'> {
    payload: {
        playerId: PlayerId;
        cardId: string;
    };
}

/** 牌库洗牌事件（从弃牌堆洗回牌库时触发） */
export interface DeckShuffledEvent extends GameEvent<'DECK_SHUFFLED'> {
    payload: {
        playerId: PlayerId;
        /** 洗牌后的牌库顺序（从顶到底） */
        deckCardIds: string[];
    };
}

/** 攻击发起事件 */
export interface AttackInitiatedEvent extends GameEvent<'ATTACK_INITIATED'> {
    payload: {
        attackerId: PlayerId;
        defenderId: PlayerId;
        sourceAbilityId: string;
        isDefendable: boolean;
    };
}

/** 进攻方前置防御结算事件 */
export interface AttackPreDefenseResolvedEvent extends GameEvent<'ATTACK_PRE_DEFENSE_RESOLVED'> {
    payload: {
        attackerId: PlayerId;
        defenderId: PlayerId;
        sourceAbilityId?: string;
    };
}

/** 攻击结算事件 */
export interface AttackResolvedEvent extends GameEvent<'ATTACK_RESOLVED'> {
    payload: {
        attackerId: PlayerId;
        defenderId: PlayerId;
        sourceAbilityId?: string;
        defenseAbilityId?: string;
        totalDamage: number;
    };
}

/** 选择请求事件 */
export interface ChoiceRequestedEvent extends GameEvent<'CHOICE_REQUESTED'> {
    payload: {
        playerId: PlayerId;
        sourceAbilityId: string;
        titleKey: string;
        options: Array<{ statusId: string; value: number }>;
    };
}

/** 选择完成事件 */
export interface ChoiceResolvedEvent extends GameEvent<'CHOICE_RESOLVED'> {
    payload: {
        playerId: PlayerId;
        statusId: string;
        value: number;
        sourceAbilityId?: string;
    };
}

/** 回合切换事件 */
export interface TurnChangedEvent extends GameEvent<'TURN_CHANGED'> {
    payload: {
        previousPlayerId: PlayerId;
        nextPlayerId: PlayerId;
        turnNumber: number;
    };
}

/** 响应窗口打开事件 */
export interface ResponseWindowOpenedEvent extends GameEvent<'RESPONSE_WINDOW_OPENED'> {
    payload: {
        windowId: string;
        responderId: PlayerId;
        windowType: 'preResolve' | 'thenBreakpoint';
        sourceAbilityId?: string;
    };
}

/** 响应窗口关闭事件 */
export interface ResponseWindowClosedEvent extends GameEvent<'RESPONSE_WINDOW_CLOSED'> {
    payload: {
        windowId: string;
        passed: boolean;
    };
}

/** 所有 DiceThrone 事件 */
export type DiceThroneEvent =
    | DiceRolledEvent
    | BonusDieRolledEvent
    | DieLockToggledEvent
    | RollConfirmedEvent
    | PhaseChangedEvent
    | AbilityActivatedEvent
    | DamageDealtEvent
    | HealAppliedEvent
    | StatusAppliedEvent
    | StatusRemovedEvent
    | CardDrawnEvent
    | CardDiscardedEvent
    | CardSoldEvent
    | SellUndoneEvent
    | CardPlayedEvent
    | CpChangedEvent
    | CardReorderedEvent
    | DeckShuffledEvent
    | AttackInitiatedEvent
    | AttackPreDefenseResolvedEvent
    | AttackResolvedEvent
    | ChoiceRequestedEvent
    | ChoiceResolvedEvent
    | TurnChangedEvent
    | AbilityReplacedEvent
    | ResponseWindowOpenedEvent
    | ResponseWindowClosedEvent;

// ============================================================================
// 常量
// ============================================================================

export const INITIAL_HEALTH = 50;
export const INITIAL_CP = 2; // 规则：起始 CP 为 2（1v1）
export const CP_MAX = 15;
export const HAND_LIMIT = 6;

export const PHASE_ORDER: TurnPhase[] = [
    'upkeep',
    'income',
    'main1',
    'offensiveRoll',
    'defensiveRoll',
    'main2',
    'discard',
];
