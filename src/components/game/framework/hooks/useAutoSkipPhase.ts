/**
 * UI 引擎框架 - 自动跳过阶段 Hook
 *
 * 当游戏阶段无可用操作且无活跃交互时，延迟后自动推进阶段。
 * 游戏层注入判定逻辑，框架统一处理守卫、延迟和 cleanup。
 *
 * 撤回保护：当检测到 undo 快照数减少（即发生了撤回恢复），
 * 在冷却期内抑制自动跳过，避免撤回后立刻被自动推进覆盖。
 */

import { useEffect, useRef } from 'react';

export interface UseAutoSkipPhaseConfig {
  /** 是否为当前玩家回合 */
  isMyTurn: boolean;
  /** 游戏是否结束 */
  isGameOver: boolean;
  /** 当前阶段是否有可用操作（游戏层提供） */
  hasAvailableActions: boolean;
  /** 是否存在活跃的交互模式（多步骤事件、技能选择等） */
  hasActiveInteraction: boolean;
  /** 推进阶段的回调 */
  advancePhase: () => void;
  /** 自动跳过前的延迟（毫秒），默认 300 */
  delay?: number;
  /** 额外的全局禁用判定（如 hostStarted 等游戏特定条件） */
  enabled?: boolean;
  /** 当前 undo 快照数量（用于检测撤回恢复） */
  undoSnapshotCount?: number;
  /** 撤回恢复后的冷却时间（毫秒），默认 2000 */
  undoCooldown?: number;
}

/** 撤回恢复后默认冷却 2 秒 */
const DEFAULT_UNDO_COOLDOWN = 2000;

/**
 * 自动跳过无操作阶段。
 *
 * 当以下条件全部满足时，延迟后调用 advancePhase：
 * 1. enabled !== false（默认启用）
 * 2. 是当前玩家回合
 * 3. 游戏未结束
 * 4. 无活跃交互模式
 * 5. hasAvailableActions 为 false
 * 6. 不在撤回恢复冷却期内
 */
export function useAutoSkipPhase({
  isMyTurn,
  isGameOver,
  hasAvailableActions,
  hasActiveInteraction,
  advancePhase,
  delay = 300,
  enabled = true,
  undoSnapshotCount,
  undoCooldown = DEFAULT_UNDO_COOLDOWN,
}: UseAutoSkipPhaseConfig): void {
  // 撤回恢复检测：快照数减少 → 进入冷却期
  const prevSnapshotCountRef = useRef(undoSnapshotCount ?? 0);
  const suppressUntilRef = useRef(0);

  useEffect(() => {
    if (undoSnapshotCount == null) return;
    const prev = prevSnapshotCountRef.current;
    prevSnapshotCountRef.current = undoSnapshotCount;

    // 快照数减少说明发生了撤回恢复
    if (undoSnapshotCount < prev) {
      suppressUntilRef.current = Date.now() + undoCooldown;
    }
  }, [undoSnapshotCount, undoCooldown]);

  useEffect(() => {
    if (!enabled) return;
    if (!isMyTurn || isGameOver) return;
    if (hasActiveInteraction) return;
    if (hasAvailableActions) return;

    // 撤回冷却期内不自动跳过
    if (Date.now() < suppressUntilRef.current) return;

    const timer = setTimeout(advancePhase, delay);
    return () => clearTimeout(timer);
  }, [enabled, isMyTurn, isGameOver, hasActiveInteraction, hasAvailableActions, advancePhase, delay]);
}
