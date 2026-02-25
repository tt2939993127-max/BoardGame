/**
 * useEventStreamCursor
 * 
 * 通用 EventStream 消费游标管理 hook。
 * 封装"首次挂载跳过历史 + Undo 恢复重置游标"的标准逻辑，
 * 消费者只需关注新事件的处理。
 * 
 * 所有判断在 consumeNew() 内同步完成，不依赖 useEffect 时序，
 * 因此消费者无论用 useEffect 还是 useLayoutEffect 都能正确工作。
 * 
 * 解决的问题：
 * - UndoSystem 恢复快照后 eventStream.entries 被清空、nextId 回退，
 *   若消费者的游标不重置，后续新事件 ID < 旧游标值会被全部跳过。
 * - entries 中最大 ID < 游标值（快照恢复后 nextId 回退），
 *   同样需要重置游标并通知消费者。
 * 
 * 乐观引擎兼容：
 * - 乐观引擎在 processCommand/reconcile 过程中可能导致 entries 暂时为空
 *   （如 wait-confirm 模式剥离 EventStream），这不是 Undo 回退。
 * - 只有当 entries 的最大 ID 真正回退（小于游标值）时才判定为 Undo 回退。
 * - entries 暂时为空时保持游标不变，等待下次有内容时正常消费。
 * 
 * 乐观回滚兼容：
 * - 乐观引擎回滚时，EventStream 事件 ID 空间可能与乐观预测重叠。
 * - 通过 EventStreamRollbackContext 自动接收回滚水位线信号，
 *   重置游标到基线位置，确保对手的新事件能被正常消费。
 * - 消费者无需任何修改，回滚信号由 GameProvider 自动注入。
 */

import { useCallback, useRef } from 'react';
import type { EventStreamEntry } from '../types';
import { useEventStreamRollback } from './EventStreamRollbackContext';

export interface UseEventStreamCursorConfig {
    /** eventStream 的 entries 数组 */
    entries: EventStreamEntry[];
    /**
     * 重连令牌（可选）
     *
     * 当此值变化时（如从 0 变为 1），游标自动重置到当前 entries 最新位置，
     * 跳过所有已有事件，防止重连后重播历史动画。
     * GameProvider 在 onConnectionChange(true) 时递增此值。
     */
    reconnectToken?: number;
}

export interface ConsumeResult {
    /** 新事件列表（游标已自动推进） */
    entries: EventStreamEntry[];
    /** 是否发生了 Undo 回退（消费者可据此清理 UI 状态） */
    didReset: boolean;
}

export interface UseEventStreamCursorReturn {
    /**
     * 获取自上次调用以来的新事件（自动推进游标）。
     * 
     * 在 useEffect / useLayoutEffect 中调用均可。
     */
    consumeNew: () => ConsumeResult;
    /** 当前游标值（只读，调试用） */
    getCursor: () => number;
    /**
     * 重置游标到当前 entries 最新位置（跳过所有已有事件）。
     * 
     * 用于重连场景：断线重连后服务端发送完整状态，
     * 客户端不应重播断线期间的历史事件。
     * GameProvider 在 onConnectionChange(true) 时调用。
     */
    resetToLatest: () => void;
}

/**
 * 管理 EventStream 消费游标。
 * 
 * 自动从 EventStreamRollbackContext 读取乐观回滚信号，
 * 消费者无需手动传递回滚水位线。
 * 
 * 使用方式（简单场景）：
 * ```ts
 * const { consumeNew } = useEventStreamCursor({ entries });
 * useEffect(() => {
 *   const { entries: newEntries } = consumeNew();
 *   if (newEntries.length === 0) return;
 *   // ... 处理 newEntries
 * }, [entries, consumeNew]);
 * ```
 * 
 * 使用方式（需要 reset 清理）：
 * ```ts
 * const { consumeNew } = useEventStreamCursor({ entries });
 * useLayoutEffect(() => {
 *   const { entries: newEntries, didReset } = consumeNew();
 *   if (didReset) { clearPendingAttack(); setAbilityMode(null); }
 *   if (newEntries.length === 0) return;
 *   // ... 处理 newEntries
 * }, [entries, consumeNew]);
 * ```
 */
export function useEventStreamCursor(config: UseEventStreamCursorConfig): UseEventStreamCursorReturn {
    const { entries, reconnectToken } = config;

    // 从 Context 自动读取乐观回滚信号（GameProvider 注入）
    const rollback = useEventStreamRollback();

    const lastSeenIdRef = useRef<number>(-1);
    const isFirstCallRef = useRef(true);
    const lastReconnectTokenRef = useRef(reconnectToken ?? 0);
    const lastRollbackSeqRef = useRef(rollback.seq);

    const consumeNew = useCallback((): ConsumeResult => {
        const curLen = entries.length;

        // ── 重连检测：reconnectToken 变化时重置游标 ──
        const currentToken = reconnectToken ?? 0;
        if (currentToken !== lastReconnectTokenRef.current) {
            lastReconnectTokenRef.current = currentToken;
            if (curLen > 0) {
                lastSeenIdRef.current = entries[curLen - 1].id;
            }
            return { entries: [], didReset: false };
        }

        // ── 乐观回滚检测：seq 变化时重置游标到水位线 ──
        // 乐观引擎回滚后，entries 已被 filterPlayedEvents 过滤到 id > watermark。
        // 游标可能停留在乐观事件的高 ID 位置，需要回退到水位线，
        // 使得对手命令产生的新事件（id > watermark）能被正常消费。
        if (rollback.seq !== lastRollbackSeqRef.current) {
            lastRollbackSeqRef.current = rollback.seq;
            if (rollback.watermark !== null) {
                lastSeenIdRef.current = rollback.watermark;
                // 立即消费 watermark 之后的新事件
                const newEntries = entries.filter(e => e.id > rollback.watermark!);
                if (newEntries.length > 0) {
                    lastSeenIdRef.current = newEntries[newEntries.length - 1].id;
                }
                return { entries: newEntries, didReset: false };
            }
        }

        // ── 首次调用：跳过历史事件 ──
        if (isFirstCallRef.current) {
            isFirstCallRef.current = false;
            if (curLen > 0) {
                lastSeenIdRef.current = entries[curLen - 1].id;
            }
            return { entries: [], didReset: false };
        }

        // ── entries 为空：保持游标不变，不消费 ──
        // 乐观引擎的 wait-confirm 模式会暂时剥离 EventStream，
        // 这不是 Undo 回退，不应重置游标。
        if (curLen === 0) {
            return { entries: [], didReset: false };
        }

        // ── Undo 回退检测：最大 ID 真正回退 ──
        const maxId = entries[curLen - 1].id;
        if (maxId < lastSeenIdRef.current) {
            lastSeenIdRef.current = maxId;
            return { entries: [], didReset: true };
        }

        // ── 正常消费 ──
        const newEntries = entries.filter(e => e.id > lastSeenIdRef.current);
        if (newEntries.length > 0) {
            lastSeenIdRef.current = newEntries[newEntries.length - 1].id;
        }
        return { entries: newEntries, didReset: false };
    }, [entries, reconnectToken, rollback.seq, rollback.watermark]);

    const getCursor = useCallback(() => lastSeenIdRef.current, []);

    const resetToLatest = useCallback(() => {
        const curLen = entries.length;
        if (curLen > 0) {
            lastSeenIdRef.current = entries[curLen - 1].id;
        }
    }, [entries]);

    return { consumeNew, getCursor, resetToLatest };
}
