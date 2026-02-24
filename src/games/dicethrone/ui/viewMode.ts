/**
 * 视角与自动观战计算工具
 * - 防御阶段仅在存在 pendingAttack 时强制切到防守方
 * - 响应窗口期间：当前响应者是对手时自动切到对手视角（非强制，可手动切回）
 */
import type { PlayerId, ResponseWindowState } from '../../../engine/types';
import type { PendingAttack, TurnPhase } from '../domain/types';

export type ViewMode = 'self' | 'opponent';

export interface ViewModeParams {
    currentPhase: TurnPhase;
    pendingAttack: PendingAttack | null;
    activePlayerId: PlayerId;
    rootPlayerId: PlayerId;
    manualViewMode: ViewMode;
    /** 响应窗口状态（可选，用于自动切换视角） */
    responseWindow?: ResponseWindowState['current'];
    /** 当前本地玩家是否是响应者（只有响应者才需要自动切到对手视角） */
    isLocalPlayerResponder?: boolean;
}

export interface ViewModeResult {
    rollerId: PlayerId;
    /** 防御阶段强制观战（不可手动切回） */
    shouldAutoObserve: boolean;
    /** 响应窗口期间自动切到对手视角（非强制，manualViewMode 可覆盖） */
    isResponseAutoSwitch: boolean;
    viewMode: ViewMode;
    isSelfView: boolean;
}

export const computeViewModeState = (params: ViewModeParams): ViewModeResult => {
    const { currentPhase, pendingAttack, activePlayerId, rootPlayerId, manualViewMode, responseWindow, isLocalPlayerResponder } = params;
    const rollerId = currentPhase === 'defensiveRoll'
        ? (pendingAttack?.defenderId ?? activePlayerId)
        : activePlayerId;

    // 防御阶段：强制切到防守方视角（不可手动切回）
    const shouldAutoObserve = currentPhase === 'defensiveRoll' && Boolean(pendingAttack) && rootPlayerId !== rollerId;

    // 响应窗口：只有当自己是响应者时，才自动切到对手视角看对方打出了什么技能
    // 被响应者（攻击方）不需要切换，应保持自己视角操作骰子和技能
    const isResponseAutoSwitch = Boolean(responseWindow) && Boolean(isLocalPlayerResponder);

    const viewMode = shouldAutoObserve ? 'opponent' : manualViewMode;
    const isSelfView = viewMode === 'self';

    return {
        rollerId,
        shouldAutoObserve,
        isResponseAutoSwitch,
        viewMode,
        isSelfView,
    };
};
