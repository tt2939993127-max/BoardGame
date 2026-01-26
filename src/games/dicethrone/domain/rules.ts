/**
 * DiceThrone 共享规则
 * 供 UI 与 domain 层共用的纯函数
 */

import type { PlayerId } from '../../../engine/types';
import { abilityManager, type AbilityContext } from '../../../systems/AbilitySystem';
import type {
    DiceThroneCore,
    Die,
    DieFace,
    TurnPhase,
    AbilityCard,
} from './types';
import { HAND_LIMIT, PHASE_ORDER } from './types';
import { RESOURCE_IDS } from './resources';

// ============================================================================
// 骰子规则
// ============================================================================

/**
 * 根据骰子值获取骰面类型
 * 优先使用 DiceSystem，兼容旧代码回退到硬编码映射
 */
export const getDieFace = (value: number): DieFace => {
    // 硬编码映射作为回退（兼容无 definitionId 的场景）
    if (value === 1 || value === 2) return 'fist';
    if (value === 3) return 'palm';
    if (value === 4 || value === 5) return 'taiji';
    return 'lotus';
};

/**
 * 统计活跃骰子的各骰面数量
 * 优先使用 die.symbol，回退到 getDieFace
 */
export const getFaceCounts = (dice: Die[]): Record<DieFace, number> => {
    return dice.reduce(
        (acc, die) => {
            // 优先使用已解析的 symbol，回退到 getDieFace
            const face = (die.symbol as DieFace) || getDieFace(die.value);
            acc[face] += 1;
            return acc;
        },
        { fist: 0, palm: 0, taiji: 0, lotus: 0 }
    );
};

/**
 * 获取活跃骰子（根据 rollDiceCount）
 */
export const getActiveDice = (state: DiceThroneCore): Die[] => {
    return state.dice.slice(0, state.rollDiceCount);
};

// ============================================================================
// 玩家顺序规则
// ============================================================================

/**
 * 获取玩家顺序列表
 */
export const getPlayerOrder = (state: DiceThroneCore): PlayerId[] => {
    return Object.keys(state.players);
};

/**
 * 获取下一位玩家 ID
 */
export const getNextPlayerId = (state: DiceThroneCore): PlayerId => {
    const order = getPlayerOrder(state);
    const currentIndex = order.indexOf(state.activePlayerId);
    const nextIndex = currentIndex === -1 ? 0 : (currentIndex + 1) % order.length;
    return order[nextIndex];
};

/**
 * 获取当前掷骰玩家 ID
 */
export const getRollerId = (state: DiceThroneCore): PlayerId => {
    if (state.turnPhase === 'defensiveRoll' && state.pendingAttack) {
        return state.pendingAttack.defenderId;
    }
    return state.activePlayerId;
};

// ============================================================================
// 阶段规则
// ============================================================================

/**
 * 检查是否可以推进阶段
 */
export const canAdvancePhase = (state: DiceThroneCore): boolean => {
    // 有待处理选择时不可推进
    // 注意：pendingChoice 已迁移到 sys.prompt，这里只检查领域层约束
    
    // 弃牌阶段手牌超限时不可推进
    if (state.turnPhase === 'discard') {
        const player = state.players[state.activePlayerId];
        if (player && player.hand.length > HAND_LIMIT) {
            return false;
        }
    }
    
    return true;
};

/**
 * 获取下一阶段
 */
export const getNextPhase = (state: DiceThroneCore): TurnPhase => {
    const currentIndex = PHASE_ORDER.indexOf(state.turnPhase);
    let nextPhase = PHASE_ORDER[(currentIndex + 1) % PHASE_ORDER.length];
    
    // 第一回合先手玩家跳过 income
    if (
        state.turnPhase === 'upkeep' &&
        state.turnNumber === 1 &&
        state.activePlayerId === state.startingPlayerId
    ) {
        nextPhase = 'main1';
    }
    
    // 进攻阶段结束后的分支
    if (state.turnPhase === 'offensiveRoll') {
        if (state.pendingAttack && state.pendingAttack.isDefendable) {
            nextPhase = 'defensiveRoll';
        } else {
            nextPhase = 'main2';
        }
    }
    
    // 弃牌阶段结束后切换玩家
    if (state.turnPhase === 'discard') {
        nextPhase = 'upkeep';
    }
    
    return nextPhase;
};

// ============================================================================
// 技能规则
// ============================================================================

/**
 * 获取当前可用的技能 ID 列表
 */
export const getAvailableAbilityIds = (
    state: DiceThroneCore,
    playerId: PlayerId
): string[] => {
    const player = state.players[playerId];
    if (!player) return [];
    
    const dice = getActiveDice(state);
    const diceValues = dice.map(d => d.value);
    const faceCounts = getFaceCounts(dice);

    const context: AbilityContext = {
        currentPhase: state.turnPhase,
        diceValues,
        faceCounts,
        resources: { cp: player.resources[RESOURCE_IDS.CP] ?? 0 },
        statusEffects: player.statusEffects,
    };

    // 根据阶段过滤技能类型
    const expectedType = state.turnPhase === 'defensiveRoll'
        ? 'defensive'
        : state.turnPhase === 'offensiveRoll'
            ? 'offensive'
            : undefined;

    // 注意：必须基于玩家当前 abilities（升级卡会替换此处定义）进行判定
    const available: string[] = [];

    for (const def of player.abilities) {
        if (expectedType && def.type !== expectedType) continue;

        if (def.variants?.length) {
            for (const variant of def.variants) {
                if (abilityManager.checkTrigger(variant.trigger, context)) {
                    available.push(variant.id);
                }
            }
            continue;
        }

        if (def.trigger && abilityManager.checkTrigger(def.trigger, context)) {
            available.push(def.id);
        }
    }

    return available;
};

// ============================================================================
// 卡牌规则
// ============================================================================

/** 卡牌打出检查结果 */
export type CardPlayCheckResult = 
    | { ok: true }
    | { ok: false; reason: CardPlayFailReason };

/** 卡牌打出失败原因（用于国际化 key，必须与 i18n 保持一致） */
export type CardPlayFailReason =
    | 'playerNotFound'
    | 'upgradeCardCannotPlay'      // 升级卡缺少目标技能
    | 'upgradeCardSkipLevel'       // 升级卡不能跳级（如 1→3）
    | 'upgradeCardMaxLevel'        // 技能已达到最高级
    | 'wrongPhaseForUpgrade'       // 升级卡只能在主要阶段
    | 'wrongPhaseForMain'          // 主要阶段卡只能在主要阶段
    | 'wrongPhaseForRoll'          // 投掷阶段卡只能在投掷阶段
    | 'notEnoughCp'                // CP 不足
    | 'unknownCardTiming';         // 未知卡牌时机

/**
 * 从升级卡效果中提取目标技能 ID
 */
export const getUpgradeTargetAbilityId = (card: AbilityCard): string | null => {
    if (card.type !== 'upgrade' || !card.effects) return null;
    const replaceAction = card.effects.find(e => e.action?.type === 'replaceAbility')?.action;
    if (replaceAction?.type === 'replaceAbility' && replaceAction.targetAbilityId) {
        return replaceAction.targetAbilityId;
    }
    return null;
};

/**
 * 检查是否可以打出卡牌（返回详细原因）
 */
export const checkPlayCard = (
    state: DiceThroneCore,
    playerId: PlayerId,
    card: AbilityCard
): CardPlayCheckResult => {
    const player = state.players[playerId];
    if (!player) return { ok: false, reason: 'playerNotFound' };
    
    const phase = state.turnPhase;
    const playerCp = player.resources[RESOURCE_IDS.CP] ?? 0;
    
    // 升级卡：自动提取目标技能并验证
    if (card.type === 'upgrade') {
        if (phase !== 'main1' && phase !== 'main2') {
            return { ok: false, reason: 'wrongPhaseForUpgrade' };
        }
        
        const targetAbilityId = getUpgradeTargetAbilityId(card);
        if (!targetAbilityId) {
            return { ok: false, reason: 'upgradeCardCannotPlay' };
        }
        
        // 检查技能等级（必须逐级升级）
        const currentLevel = player.abilityLevels[targetAbilityId] ?? 1;
        const replaceAction = card.effects?.find(e => e.action?.type === 'replaceAbility')?.action;
        const desiredLevel = (replaceAction?.type === 'replaceAbility' ? replaceAction.newAbilityLevel : undefined) ?? (currentLevel + 1);
        if (currentLevel >= 3) {
            return { ok: false, reason: 'upgradeCardMaxLevel' };
        }
        if (desiredLevel !== currentLevel + 1) {
            return { ok: false, reason: 'upgradeCardSkipLevel' };
        }
        
        // 计算实际 CP 消耗
        const previousUpgradeCost = player.upgradeCardByAbilityId[targetAbilityId]?.cpCost;
        let actualCost = card.cpCost;
        if (previousUpgradeCost !== undefined && currentLevel > 1) {
            actualCost = Math.max(0, card.cpCost - previousUpgradeCost);
        }
        
        if (actualCost > 0 && playerCp < actualCost) {
            return { ok: false, reason: 'notEnoughCp' };
        }
        
        return { ok: true };
    }
    
    // 检查阶段
    if (card.timing === 'main') {
        if (phase !== 'main1' && phase !== 'main2') {
            return { ok: false, reason: 'wrongPhaseForMain' };
        }
    } else if (card.timing === 'roll') {
        if (phase !== 'offensiveRoll' && phase !== 'defensiveRoll') {
            return { ok: false, reason: 'wrongPhaseForRoll' };
        }
    } else if (card.timing !== 'instant') {
        return { ok: false, reason: 'unknownCardTiming' };
    }
    
    // 检查 CP
    if (card.cpCost > 0 && playerCp < card.cpCost) {
        return { ok: false, reason: 'notEnoughCp' };
    }
    
    return { ok: true };
};

/**
 * 检查是否可以打出卡牌（简化版，返回 boolean）
 * @deprecated 使用 checkPlayCard 获取详细原因
 */
export const canPlayCard = (
    state: DiceThroneCore,
    playerId: PlayerId,
    card: AbilityCard
): boolean => {
    return checkPlayCard(state, playerId, card).ok;
};

/** 升级卡打出失败原因 */
export type UpgradeCardPlayFailReason =
    | 'playerNotFound'
    | 'notUpgradeCard'
    | 'wrongPhaseForUpgrade'
    | 'upgradeCardCannotPlay'     // 升级卡缺少 replaceAbility 效果
    | 'upgradeCardTargetMismatch' // 目标技能不匹配
    | 'upgradeCardMaxLevel'
    | 'upgradeCardSkipLevel'
    | 'notEnoughCp';

/** 升级卡打出检查结果 */
export type UpgradeCardPlayCheckResult =
    | { ok: true }
    | { ok: false; reason: UpgradeCardPlayFailReason };

/**
 * 检查是否可以打出升级卡（返回详细原因）
 */
export const checkPlayUpgradeCard = (
    state: DiceThroneCore,
    playerId: PlayerId,
    card: AbilityCard,
    targetAbilityId: string
): UpgradeCardPlayCheckResult => {
    const player = state.players[playerId];
    if (!player) return { ok: false, reason: 'playerNotFound' };
    
    // 必须是升级卡
    if (card.type !== 'upgrade') return { ok: false, reason: 'notUpgradeCard' };
    
    // 仅 Main Phase 可用
    if (state.turnPhase !== 'main1' && state.turnPhase !== 'main2') {
        return { ok: false, reason: 'wrongPhaseForUpgrade' };
    }

    // 升级卡必须带 replaceAbility 效果
    const replaceAction = card.effects?.find(e => e.action?.type === 'replaceAbility')?.action;
    if (!replaceAction || replaceAction.type !== 'replaceAbility') {
        return { ok: false, reason: 'upgradeCardCannotPlay' };
    }
    
    // 目标技能必须与拖拽目标一致
    if (!replaceAction.targetAbilityId || replaceAction.targetAbilityId !== targetAbilityId) {
        return { ok: false, reason: 'upgradeCardTargetMismatch' };
    }

    // 检查技能等级（必须逐级升级，不允许跳级）
    const currentLevel = player.abilityLevels[targetAbilityId] ?? 1;
    const desiredLevel = replaceAction.newAbilityLevel ?? Math.min(3, currentLevel + 1);
    if (currentLevel >= 3) {
        return { ok: false, reason: 'upgradeCardMaxLevel' };
    }
    if (desiredLevel !== currentLevel + 1) {
        return { ok: false, reason: 'upgradeCardSkipLevel' };
    }

    // 计算实际 CP 消耗
    const previousUpgradeCost = player.upgradeCardByAbilityId[targetAbilityId]?.cpCost;
    let actualCost = card.cpCost;
    if (previousUpgradeCost !== undefined && currentLevel > 1) {
        actualCost = Math.max(0, card.cpCost - previousUpgradeCost);
    }
    
    const playerCp = player.resources[RESOURCE_IDS.CP] ?? 0;
    if (actualCost > 0 && playerCp < actualCost) {
        return { ok: false, reason: 'notEnoughCp' };
    }
    
    return { ok: true };
};

/**
 * 检查是否可以打出升级卡（简化版，返回 boolean）
 * @deprecated 使用 checkPlayUpgradeCard 获取详细原因
 */
export const canPlayUpgradeCard = (
    state: DiceThroneCore,
    playerId: PlayerId,
    card: AbilityCard,
    targetAbilityId: string
): boolean => {
    return checkPlayUpgradeCard(state, playerId, card, targetAbilityId).ok;
};

/**
 * 检查是否可以售卖卡牌
 */
export const canSellCard = (
    state: DiceThroneCore,
    playerId: PlayerId
): boolean => {
    // 仅当前玩家可售卖
    return playerId === state.activePlayerId;
};

/**
 * 检查是否可以撤回售卖
 */
export const canUndoSell = (
    state: DiceThroneCore,
    playerId: PlayerId
): boolean => {
    return playerId === state.activePlayerId && !!state.lastSoldCardId;
};

// ============================================================================
// 响应窗口检测
// ============================================================================

/**
 * 检测玩家是否有可响应的内容（卡牌或消耗性状态效果）
 * 用于决定是否打开响应窗口
 * 
 * @param state 游戏状态
 * @param playerId 要检测的玩家 ID
 * @param windowType 窗口类型（preResolve = 攻击结算前）
 */
export const hasRespondableContent = (
    state: DiceThroneCore,
    playerId: PlayerId,
    windowType: 'preResolve' | 'thenBreakpoint'
): boolean => {
    const player = state.players[playerId];
    if (!player) return false;

    const phase = state.turnPhase;
    const playerCp = player.resources[RESOURCE_IDS.CP] ?? 0;

    // 检查手牌中是否有可响应的卡牌
    for (const card of player.hand) {
        // 跳过升级卡
        if (card.type === 'upgrade') continue;
        
        // 检查 CP 是否足够
        if (card.cpCost > playerCp) continue;

        // instant 卡牌可以在任何时候打出
        if (card.timing === 'instant') {
            return true;
        }

        // roll 卡牌可以在掷骰阶段打出
        if (card.timing === 'roll' && (phase === 'offensiveRoll' || phase === 'defensiveRoll')) {
            return true;
        }
    }

    // 检查是否有可消耗的状态效果（timing=manual）
    for (const statusDef of state.statusDefinitions) {
        if (statusDef.timing !== 'manual') continue;
        const stacks = player.statusEffects[statusDef.id] ?? 0;
        if (stacks > 0) {
            return true;
        }
    }

    return false;
};

// ============================================================================
// 权限检查
// ============================================================================

/**
 * 检查玩家是否有权执行操作
 */
export const isMoveAllowed = (
    playerId: PlayerId | null | undefined,
    expectedId: PlayerId | undefined
): boolean => {
    if (playerId === null || playerId === undefined) return true;
    return expectedId !== undefined && playerId === expectedId;
};
