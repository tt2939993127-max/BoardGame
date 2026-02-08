/**
 * 大杀四方 - 能力执行辅助函数
 *
 * 提供常用的能力效果生成器（消灭随从、移动随从、抽牌、额外出牌等）。
 * 所有函数返回事件数组，由 reducer 统一归约。
 */

import type { PlayerId } from '../../../engine/types';
import type {
    SmashUpCore,
    SmashUpEvent,
    MinionOnBase,
    LimitModifiedEvent,
    MinionDestroyedEvent,
    MinionMovedEvent,
    PowerCounterAddedEvent,
    PowerCounterRemovedEvent,
    CardRecoveredFromDiscardEvent,
    HandShuffledIntoDeckEvent,
} from './types';
import { SU_EVENTS } from './types';

// ============================================================================
// 随从消灭
// ============================================================================

/** 生成消灭随从事件 */
export function destroyMinion(
    minionUid: string,
    minionDefId: string,
    fromBaseIndex: number,
    ownerId: PlayerId,
    reason: string,
    now: number
): MinionDestroyedEvent {
    return {
        type: SU_EVENTS.MINION_DESTROYED,
        payload: { minionUid, minionDefId, fromBaseIndex, ownerId, reason },
        timestamp: now,
    };
}

// ============================================================================
// 随从移动
// ============================================================================

/** 生成移动随从事件 */
export function moveMinion(
    minionUid: string,
    minionDefId: string,
    fromBaseIndex: number,
    toBaseIndex: number,
    reason: string,
    now: number
): MinionMovedEvent {
    return {
        type: SU_EVENTS.MINION_MOVED,
        payload: { minionUid, minionDefId, fromBaseIndex, toBaseIndex, reason },
        timestamp: now,
    };
}

// ============================================================================
// 力量指示物
// ============================================================================

/** 生成添加力量指示物事件 */
export function addPowerCounter(
    minionUid: string,
    baseIndex: number,
    amount: number,
    reason: string,
    now: number
): PowerCounterAddedEvent {
    return {
        type: SU_EVENTS.POWER_COUNTER_ADDED,
        payload: { minionUid, baseIndex, amount, reason },
        timestamp: now,
    };
}

/** 生成移除力量指示物事件 */
export function removePowerCounter(
    minionUid: string,
    baseIndex: number,
    amount: number,
    reason: string,
    now: number
): PowerCounterRemovedEvent {
    return {
        type: SU_EVENTS.POWER_COUNTER_REMOVED,
        payload: { minionUid, baseIndex, amount, reason },
        timestamp: now,
    };
}

// ============================================================================
// 额外出牌额度
// ============================================================================

/** 生成额外随从额度事件 */
export function grantExtraMinion(
    playerId: PlayerId,
    reason: string,
    now: number
): LimitModifiedEvent {
    return {
        type: SU_EVENTS.LIMIT_MODIFIED,
        payload: { playerId, limitType: 'minion', delta: 1, reason },
        timestamp: now,
    };
}

/** 生成额外行动额度事件 */
export function grantExtraAction(
    playerId: PlayerId,
    reason: string,
    now: number
): LimitModifiedEvent {
    return {
        type: SU_EVENTS.LIMIT_MODIFIED,
        payload: { playerId, limitType: 'action', delta: 1, reason },
        timestamp: now,
    };
}

// ============================================================================
// 查找辅助
// ============================================================================

/** 在所有基地中查找随从 */
export function findMinionOnBases(
    core: SmashUpCore,
    minionUid: string
): { minion: MinionOnBase; baseIndex: number } | undefined {
    for (let i = 0; i < core.bases.length; i++) {
        const m = core.bases[i].minions.find(m => m.uid === minionUid);
        if (m) return { minion: m, baseIndex: i };
    }
    return undefined;
}

/** 获取基地上指定玩家的随从 */
export function getPlayerMinionsOnBase(
    core: SmashUpCore,
    baseIndex: number,
    playerId: PlayerId
): MinionOnBase[] {
    const base = core.bases[baseIndex];
    if (!base) return [];
    return base.minions.filter(m => m.controller === playerId);
}

/** 获取基地上其他玩家的随从 */
export function getOpponentMinionsOnBase(
    core: SmashUpCore,
    baseIndex: number,
    playerId: PlayerId
): MinionOnBase[] {
    const base = core.bases[baseIndex];
    if (!base) return [];
    return base.minions.filter(m => m.controller !== playerId);
}

// ============================================================================
// 弃牌堆操作
// ============================================================================

/** 生成从弃牌堆取回卡牌到手牌事件 */
export function recoverCardsFromDiscard(
    playerId: PlayerId,
    cardUids: string[],
    reason: string,
    now: number
): CardRecoveredFromDiscardEvent {
    return {
        type: SU_EVENTS.CARD_RECOVERED_FROM_DISCARD,
        payload: { playerId, cardUids, reason },
        timestamp: now,
    };
}

// ============================================================================
// 手牌/牌库操作
// ============================================================================

/** 生成手牌洗入牌库事件 */
export function shuffleHandIntoDeck(
    playerId: PlayerId,
    newDeckUids: string[],
    reason: string,
    now: number
): HandShuffledIntoDeckEvent {
    return {
        type: SU_EVENTS.HAND_SHUFFLED_INTO_DECK,
        payload: { playerId, newDeckUids, reason },
        timestamp: now,
    };
}
