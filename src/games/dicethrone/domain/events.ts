/**
 * DiceThrone 事件类型定义
 */

import type { GameEvent, PlayerId, ResponseWindowType } from '../../../engine/types';
import type {
    DieFace,
    SelectableCharacterId,
    PendingInteraction,
    PendingDamage,
    PendingBonusDiceSettlement,
    BonusDieInfo,
} from './core-types';
import type { AbilityDef } from './combat';

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
        /** 效果目标玩家（若与 playerId 不同，则双方都显示特写） */
        targetPlayerId?: PlayerId;
        /** 可选的自定义效果描述 key（i18n），用于非骰面效果的特写 */
        effectKey?: string;
        /** 效果描述的插值参数 */
        effectParams?: Record<string, string | number>;
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
    };
}

/** 角色选择事件 */
export interface CharacterSelectedEvent extends GameEvent<'CHARACTER_SELECTED'> {
    payload: {
        playerId: PlayerId;
        characterId: SelectableCharacterId;
        /** 初始牌库（已洗牌） */
        initialDeckCardIds: string[];
    };
}

/** 英雄初始化事件（选角结束进入游戏前） */
export interface HeroInitializedEvent extends GameEvent<'HERO_INITIALIZED'> {
    payload: {
        playerId: PlayerId;
        characterId: SelectableCharacterId;
    };
}

/** 房主开始事件 */
export interface HostStartedEvent extends GameEvent<'HOST_STARTED'> {
    payload: {
        playerId: PlayerId;
    };
}

/** 玩家准备事件 */
export interface PlayerReadyEvent extends GameEvent<'PLAYER_READY'> {
    payload: {
        playerId: PlayerId;
    };
}

// PhaseChangedEvent 已废弃，阶段切换现在由 FlowSystem 的 SYS_PHASE_CHANGED 统一处理
// 参见 src/engine/systems/FlowSystem.ts

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

/** Token 授予事件 */
export interface TokenGrantedEvent extends GameEvent<'TOKEN_GRANTED'> {
    payload: {
        targetId: PlayerId;
        tokenId: string;
        amount: number;
        newTotal: number;
        sourceAbilityId?: string;
    };
}

/** Token 消耗事件 */
export interface TokenConsumedEvent extends GameEvent<'TOKEN_CONSUMED'> {
    payload: {
        playerId: PlayerId;
        tokenId: string;
        amount: number;
        newTotal: number;
    };
}

/** Token 堆叠上限变化事件 */
export interface TokenLimitChangedEvent extends GameEvent<'TOKEN_LIMIT_CHANGED'> {
    payload: {
        playerId: PlayerId;
        tokenId: string;
        delta: number;
        newLimit: number;
        sourceAbilityId?: string;
    };
}

/** 护盾授予事件 */
export interface DamageShieldGrantedEvent extends GameEvent<'DAMAGE_SHIELD_GRANTED'> {
    payload: {
        targetId: PlayerId;
        value: number;
        sourceId?: string;
        /** 是否用于防止本次攻击的状态效果 */
        preventStatus?: boolean;
    };
}

/** 伤害减免事件（用于提前抵消即将到来的伤害） */
export interface PreventDamageEvent extends GameEvent<'PREVENT_DAMAGE'> {
    payload: {
        targetId: PlayerId;
        /** 要减免的伤害值 */
        amount: number;
        sourceAbilityId?: string;
        /** 是否仅用于当前伤害结算（无 pendingDamage 时不转为护盾） */
        applyImmediately?: boolean;
    };
}

/** 伤害被护盾阻挡事件 */
export interface DamagePreventedEvent extends GameEvent<'DAMAGE_PREVENTED'> {
    payload: {
        targetId: PlayerId;
        /** 原始伤害 */
        originalDamage: number;
        /** 被护盾抵消的伤害 */
        preventedAmount: number;
        /** 消耗的护盾来源 */
        shieldSourceId: string;
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
        /** 是否为终极技能（不可被干扰） */
        isUltimate?: boolean;
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

/** 攻击变为不可防御事件 */
export interface AttackMadeUndefendableEvent extends GameEvent<'ATTACK_MADE_UNDEFENDABLE'> {
    payload: {
        attackerId: PlayerId;
        tokenId?: string;
    };
}

/** 选择请求事件 */
export interface ChoiceRequestedEvent extends GameEvent<'CHOICE_REQUESTED'> {
    payload: {
        playerId: PlayerId;
        sourceAbilityId: string;
        titleKey: string;
        options: Array<{
            /** 被动状态 ID（如 STATUS_IDS.KNOCKDOWN） */
            statusId?: string;
            /** Token ID（如 taiji/evasive/purify） */
            tokenId?: string;
            /** 数值（通常为 +1；也允许为负数表示消耗） */
            value: number;
            /** 自定义选择 ID（用于非 status/token 的选择，或区分不同语义） */
            customId?: string;
            /** 选项显示文案 key（i18n）。若不提供，将根据 statusId/tokenId 自动推导 */
            labelKey?: string;
        }>;
    };
}

/** 选择完成事件 */
export interface ChoiceResolvedEvent extends GameEvent<'CHOICE_RESOLVED'> {
    payload: {
        playerId: PlayerId;
        /** 状态 ID（被动状态如击倒） */
        statusId?: string;
        /** Token ID（太极、闪避、净化） */
        tokenId?: string;
        /** 数值（通常为 +1；也允许为负数表示消耗） */
        value: number;
        /** 自定义选择 ID（用于非 status/token 的选择，或区分不同语义） */
        customId?: string;
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

/** 响应窗口打开事件（多响应者队列） */
export interface ResponseWindowOpenedEvent extends GameEvent<'RESPONSE_WINDOW_OPENED'> {
    payload: {
        windowId: string;
        /** 响应者队列（按顺序轮询） */
        responderQueue: PlayerId[];
        windowType: ResponseWindowType;
        /** 来源卡牌/技能 ID */
        sourceId?: string;
    };
}

/** 响应窗口关闭事件 */
export interface ResponseWindowClosedEvent extends GameEvent<'RESPONSE_WINDOW_CLOSED'> {
    payload: {
        windowId: string;
        /** 所有人都跳过了 */
        allPassed?: boolean;
    };
}

/** 响应者变更事件（窗口内部轮询） */
export interface ResponseWindowResponderChangedEvent extends GameEvent<'RESPONSE_WINDOW_RESPONDER_CHANGED'> {
    payload: {
        windowId: string;
        previousResponderId: PlayerId;
        nextResponderId: PlayerId;
    };
}

/** 骰子修改事件 */
export interface DieModifiedEvent extends GameEvent<'DIE_MODIFIED'> {
    payload: {
        dieId: number;
        oldValue: number;
        newValue: number;
        /** 执行修改的玩家 ID */
        playerId: PlayerId;
        sourceCardId?: string;
    };
}

/** 骰子重掷事件 */
export interface DieRerolledEvent extends GameEvent<'DIE_REROLLED'> {
    payload: {
        dieId: number;
        oldValue: number;
        newValue: number;
        playerId: PlayerId;
        sourceCardId?: string;
    };
}

/** 投掷次数变化事件 */
export interface RollLimitChangedEvent extends GameEvent<'ROLL_LIMIT_CHANGED'> {
    payload: {
        playerId: PlayerId;
        delta: number;
        newLimit: number;
        sourceCardId?: string;
    };
}

/** 交互请求事件 */
export interface InteractionRequestedEvent extends GameEvent<'INTERACTION_REQUESTED'> {
    payload: {
        interaction: PendingInteraction;
    };
}

/** 交互完成事件 */
export interface InteractionCompletedEvent extends GameEvent<'INTERACTION_COMPLETED'> {
    payload: {
        interactionId: string;
        sourceCardId: string;
    };
}

/** 交互取消事件 */
export interface InteractionCancelledEvent extends GameEvent<'INTERACTION_CANCELLED'> {
    payload: {
        interactionId: string;
        /** 源卡牌 ID（用于还原卡牌） */
        sourceCardId: string;
        /** 源卡牌 CP 消耗（用于返还 CP） */
        cpCost: number;
        /** 执行交互的玩家 ID */
        playerId: PlayerId;
    };
}

// ============================================================================
// Token 响应窗口事件
// ============================================================================

/** Token 响应窗口打开事件 */
export interface TokenResponseRequestedEvent extends GameEvent<'TOKEN_RESPONSE_REQUESTED'> {
    payload: {
        /** 待处理的伤害信息 */
        pendingDamage: PendingDamage;
    };
}

/** Token 使用事件 */
export interface TokenUsedEvent extends GameEvent<'TOKEN_USED'> {
    payload: {
        playerId: PlayerId;
        tokenId: string;
        amount: number;
        /** 效果类型 */
        effectType: 'damageBoost' | 'damageReduction' | 'evasionAttempt' | 'removeDebuff';
        /** 伤害修改量（加伤/减伤） */
        damageModifier?: number;
        /** 闪避投骰结果（仅 evasionAttempt） */
        evasionRoll?: {
            value: number;
            success: boolean;
        };
    };
}

/** Token 响应窗口关闭事件 */
export interface TokenResponseClosedEvent extends GameEvent<'TOKEN_RESPONSE_CLOSED'> {
    payload: {
        pendingDamageId: string;
        /** 最终伤害值 */
        finalDamage: number;
        /** 是否完全闪避 */
        fullyEvaded: boolean;
    };
}

/** 技能重选事件（骰面被修改后触发） */
export interface AbilityReselectionRequiredEvent extends GameEvent<'ABILITY_RESELECTION_REQUIRED'> {
    payload: {
        playerId: PlayerId;
        /** 原来选择的技能 ID */
        previousAbilityId?: string;
        /** 触发原因 */
        reason: 'dieModified' | 'dieRerolled';
    };
}

// ============================================================================
// 奖励骰重掷事件
// ============================================================================

/** 奖励骰重掷请求事件（延后结算流程启动） */
export interface BonusDiceRerollRequestedEvent extends GameEvent<'BONUS_DICE_REROLL_REQUESTED'> {
    payload: {
        /** 待结算的奖励骰信息 */
        settlement: PendingBonusDiceSettlement;
    };
}

/** 奖励骰重掷事件（单颗重掷） */
export interface BonusDieRerolledEvent extends GameEvent<'BONUS_DIE_REROLLED'> {
    payload: {
        /** 重掷的骰子索引 */
        dieIndex: number;
        /** 旧点数 */
        oldValue: number;
        /** 新点数 */
        newValue: number;
        /** 新骰面符号 */
        newFace: DieFace;
        /** 消耗的 Token ID */
        costTokenId: string;
        /** 消耗的 Token 数量 */
        costAmount: number;
        /** 玩家 ID */
        playerId: PlayerId;
        /** 效果目标玩家（UI 展示用） */
        targetPlayerId?: PlayerId;
        /** 重掷特写文案 key（UI 展示用） */
        effectKey?: string;
        /** 重掷特写参数（UI 展示用） */
        effectParams?: Record<string, string | number>;
    };
}

/** 奖励骰结算事件（重掷交互结束，执行伤害结算） */
export interface BonusDiceSettledEvent extends GameEvent<'BONUS_DICE_SETTLED'> {
    payload: {
        /** 最终骰子结果 */
        finalDice: BonusDieInfo[];
        /** 总伤害 */
        totalDamage: number;
        /** 是否触发阈值效果 */
        thresholdTriggered: boolean;
        /** 攻击者玩家 ID */
        attackerId: PlayerId;
        /** 目标玩家 ID */
        targetId: PlayerId;
        /** 来源技能 ID */
        sourceAbilityId: string;
    };
}

/** 额外攻击触发事件（晕眩 daze 触发：攻击结算后对手获得一次额外攻击） */
export interface ExtraAttackTriggeredEvent extends GameEvent<'EXTRA_ATTACK_TRIGGERED'> {
    payload: {
        /** 额外攻击的发起者（原攻击的防御方） */
        attackerId: PlayerId;
        /** 额外攻击的目标（原攻击方，即被 daze 的玩家） */
        targetId: PlayerId;
        /** 触发来源（状态效果 ID） */
        sourceStatusId: string;
    };
}

/** 所有 DiceThrone 事件 */
export type DiceThroneEvent =
    | DiceRolledEvent
    | BonusDieRolledEvent
    | DieLockToggledEvent
    | RollConfirmedEvent
    | CharacterSelectedEvent
    | HeroInitializedEvent
    | HostStartedEvent
    | PlayerReadyEvent
    | AbilityActivatedEvent
    | DamageDealtEvent
    | HealAppliedEvent
    | StatusAppliedEvent
    | StatusRemovedEvent
    | TokenGrantedEvent
    | TokenConsumedEvent
    | TokenLimitChangedEvent
    | DamageShieldGrantedEvent
    | PreventDamageEvent
    | DamagePreventedEvent
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
    | AttackMadeUndefendableEvent
    | ChoiceRequestedEvent
    | ChoiceResolvedEvent
    | TurnChangedEvent
    | AbilityReplacedEvent
    | ResponseWindowOpenedEvent
    | ResponseWindowClosedEvent
    | ResponseWindowResponderChangedEvent
    | DieModifiedEvent
    | DieRerolledEvent
    | RollLimitChangedEvent
    | InteractionRequestedEvent
    | InteractionCompletedEvent
    | InteractionCancelledEvent
    | TokenResponseRequestedEvent
    | TokenUsedEvent
    | TokenResponseClosedEvent
    | AbilityReselectionRequiredEvent
    | BonusDiceRerollRequestedEvent
    | BonusDieRerolledEvent
    | BonusDiceSettledEvent
    | ExtraAttackTriggeredEvent;
