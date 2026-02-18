import React, {
    createContext,
    useCallback,
    useContext,
    useEffect,
    useMemo,
    useRef,
    useState,
} from 'react';
import { useToast } from './ToastContext';
import type { TutorialAiAction, TutorialManifest, TutorialState, TutorialStepSnapshot } from '../engine/types';
export type { TutorialManifest } from '../engine/types';
import { DEFAULT_TUTORIAL_STATE } from '../engine/types';
import { TUTORIAL_COMMANDS } from '../engine/systems/TutorialSystem';

type TutorialNextReason = 'manual' | 'auto';

interface TutorialController {
    start: (manifest: TutorialManifest) => void;
    next: (reason?: TutorialNextReason) => void;
    close: () => void;
    consumeAi: (stepId?: string) => void;
    animationComplete: () => void;
    dispatchCommand: (commandType: string, payload?: unknown) => void;
}

interface TutorialContextType {
    tutorial: TutorialState;
    currentStep: TutorialStepSnapshot | null;
    isActive: boolean;
    isLastStep: boolean;
    /** 是否正在等待动画完成 */
    isPendingAnimation: boolean;
    /** AI 命令正在自动执行中（ref，同步可读，此期间命令失败不应提示用户） */
    isAiExecuting: boolean;
    isAiExecutingRef: React.MutableRefObject<boolean>;
    startTutorial: (manifest: TutorialManifest) => void;
    nextStep: (reason?: TutorialNextReason) => void;
    closeTutorial: () => void;
    consumeAi: (stepId?: string) => void;
    /** 动画完成回调：通知教程系统动画已播放完毕，可以推进到下一步 */
    animationComplete: () => void;
    bindDispatch: (dispatch: (type: string, payload?: unknown) => void) => void;
    syncTutorialState: (tutorial: TutorialState) => void;
}

const TutorialContext = createContext<TutorialContextType | undefined>(undefined);

type DispatchFn = (type: string, payload?: unknown) => void;

const buildTutorialController = (dispatch: DispatchFn): TutorialController => {
    const dispatchCommand = (commandType: string, payload?: unknown) => {
        dispatch(commandType, payload ?? {});
    };

    return {
        dispatchCommand,
        start: (manifest) => dispatchCommand(TUTORIAL_COMMANDS.START, { manifest }),
        next: (reason) => dispatchCommand(TUTORIAL_COMMANDS.NEXT, { reason }),
        close: () => dispatchCommand(TUTORIAL_COMMANDS.CLOSE, {}),
        consumeAi: (stepId) => dispatchCommand(TUTORIAL_COMMANDS.AI_CONSUMED, { stepId }),
        animationComplete: () => dispatchCommand(TUTORIAL_COMMANDS.ANIMATION_COMPLETE, {}),
    };
};

const shouldAutoAdvance = (step: TutorialStepSnapshot): boolean => {
    if (!step.advanceOnEvents) return true;
    return step.advanceOnEvents.length === 0;
};

const hasAiActions = (step: TutorialStepSnapshot): boolean =>
    Array.isArray(step.aiActions) && step.aiActions.length > 0;

const normalizeTutorialState = (nextTutorial: TutorialState): TutorialState => {
    const steps = Array.isArray(nextTutorial.steps) ? nextTutorial.steps : [];
    const derivedStep = nextTutorial.step ?? steps[nextTutorial.stepIndex] ?? null;
    return {
        ...nextTutorial,
        steps,
        step: derivedStep,
    };
};

export const TutorialProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [tutorial, setTutorial] = useState<TutorialState>({ ...DEFAULT_TUTORIAL_STATE });
    const [isControllerReady, setIsControllerReady] = useState(false);
    const isAiExecutingRef = useRef(false);
    const [isAiExecuting, setIsAiExecuting] = useState(false);
    const controllerRef = useRef<TutorialController | null>(null);
    const pendingStartRef = useRef<TutorialManifest | null>(null);
    const executedAiStepsRef = useRef<Set<string>>(new Set());
    // 兜底 timer：防止 bindDispatch 永远不执行导致教程卡死
    const fallbackTimerRef = useRef<number | undefined>(undefined);
    const toast = useToast();

    const bindDispatch = useCallback((dispatch: DispatchFn) => {
        // 清除兜底 timer（正常路径：bindDispatch 被调用）
        if (fallbackTimerRef.current !== undefined) {
            window.clearTimeout(fallbackTimerRef.current);
            fallbackTimerRef.current = undefined;
        }
        
        controllerRef.current = buildTutorialController(dispatch);
        setIsControllerReady(true);
        if (pendingStartRef.current) {
            controllerRef.current.start(pendingStartRef.current);
            pendingStartRef.current = null;
        }
    }, []);

    const syncTutorialState = useCallback((nextTutorial: TutorialState) => {
        const normalized = normalizeTutorialState(nextTutorial);
        setTutorial(normalized);
        if (!normalized.active) {
            executedAiStepsRef.current = new Set();
        }
    }, []);

    const startTutorial = useCallback((manifest: TutorialManifest) => {
        // 防重入：如果已经有 pending 的 manifest，且是同一个，跳过
        if (pendingStartRef.current?.id === manifest.id) {
            return;
        }
        
        // 清除旧的兜底 timer
        if (fallbackTimerRef.current !== undefined) {
            window.clearTimeout(fallbackTimerRef.current);
            fallbackTimerRef.current = undefined;
        }
        
        // 立即重置 tutorial state，清除上一个教程的残留数据：
        // 1. 避免旧教程的提示（TutorialOverlay）在新教程加载期间继续显示
        // 2. 使 MatchRoom 的 isTutorialReset 判断成立（manifestId=null, steps=[]），允许重新启动
        setTutorial({ ...DEFAULT_TUTORIAL_STATE });
        executedAiStepsRef.current = new Set();
        // 始终存入 pendingStartRef，由 bindDispatch 消费。
        // 不直接调用 controllerRef.current.start()，因为 controllerRef 可能残留上一个对局
        // （联机 Board 卸载后 controllerRef 不会被清空），直接 dispatch 会发给已断开的联机服务器。
        pendingStartRef.current = manifest;
        
        // 清空旧 controller，强制等待新 Board 挂载后重新 bindDispatch
        controllerRef.current = null;
        setIsControllerReady(false);
        
        // 兜底机制：10 秒后如果 tutorial.active 仍然是 false，强制启动
        fallbackTimerRef.current = window.setTimeout(() => {
            console.warn('[TutorialContext] 教程启动超时（10秒），尝试兜底处理');
            fallbackTimerRef.current = undefined;
            
            // 检查是否真的卡住了（pendingStartRef 还有值说明 bindDispatch 没被调用）
            if (pendingStartRef.current && !controllerRef.current) {
                console.error('[TutorialContext] 兜底失败：Board 未挂载，无法启动教程');
                toast.error('教程加载超时，请刷新页面重试');
            } else if (pendingStartRef.current && controllerRef.current) {
                console.warn('[TutorialContext] 兜底：强制启动教程');
                controllerRef.current.start(pendingStartRef.current);
                pendingStartRef.current = null;
            }
        }, 10000);
    }, []);

    const nextStep = useCallback((reason?: TutorialNextReason) => {
        controllerRef.current?.next(reason);
    }, []);

    const closeTutorial = useCallback(() => {
        controllerRef.current?.close();
    }, []);

    const consumeAi = useCallback((stepId?: string) => {
        controllerRef.current?.consumeAi(stepId);
    }, []);

    const animationComplete = useCallback(() => {
        controllerRef.current?.animationComplete();
    }, []);

    // AI 动作执行 effect
    // 使用 ref 管理 timer，避免 tutorial 对象频繁变化导致 timer 被 React effect cleanup 取消
    const aiTimerRef = useRef<number | undefined>(undefined);

    useEffect(() => {
        if (!tutorial.active || !tutorial.step || !hasAiActions(tutorial.step)) return;
        if (!isControllerReady) return;

        const stepId = tutorial.step.id;
        if (executedAiStepsRef.current.has(stepId)) return;
        executedAiStepsRef.current.add(stepId);

        // 缓存当前步骤的 autoAdvance 判断和 aiActions，避免闭包引用被清理后的状态
        const shouldAutoAdvanceAfterAi = shouldAutoAdvance(tutorial.step);
        const aiActions = tutorial.step.aiActions ? [...tutorial.step.aiActions] : [];

        // 使用 ref 管理 timer，不在 cleanup 中取消
        // 这样即使 tutorial 对象变化触发 effect 重新执行，timer 也不会被取消
        if (aiTimerRef.current !== undefined) {
            window.clearTimeout(aiTimerRef.current);
        }

        // setup 步骤（首步）使用更短延迟，加速教程初始化
        const delay = tutorial.stepIndex === 0 ? 300 : 1000;

        aiTimerRef.current = window.setTimeout(() => {
            aiTimerRef.current = undefined;
            const controller = controllerRef.current;
            if (!controller) return;

            setIsAiExecuting(true);
            isAiExecutingRef.current = true;
            aiActions.forEach((action: TutorialAiAction) => {
                // 注入 __tutorialAiCommand 标记，让 LocalGameProvider 在命令失败时静默
                // 同时注入 __tutorialPlayerId 供 adapter 识别 AI 执行者
                const actionPayload: Record<string, unknown> = {
                    ...(action.payload as Record<string, unknown> ?? {}),
                    __tutorialAiCommand: true,
                };
                if (action.playerId) {
                    actionPayload.__tutorialPlayerId = action.playerId;
                }
                controller.dispatchCommand(action.commandType, actionPayload);
            });
            isAiExecutingRef.current = false;
            setIsAiExecuting(false);
            controller.consumeAi(stepId);

            // 同步调用 next，避免 consumeAi 触发状态更新后 effect 清理导致 advanceTimer 被取消
            if (shouldAutoAdvanceAfterAi) {
                controller.next('auto');
            }
        }, delay);

        // 不返回 cleanup 函数 — timer 通过 aiTimerRef 管理
        // 只在新步骤的 AI actions 需要执行时才清除旧 timer
    }, [tutorial, isControllerReady]);

    const value = useMemo<TutorialContextType>(() => {
        const currentStep = tutorial.step ?? tutorial.steps[tutorial.stepIndex] ?? null;
        return {
            tutorial,
            currentStep,
            isActive: tutorial.active,
            isLastStep: tutorial.active && tutorial.stepIndex >= tutorial.steps.length - 1,
            isPendingAnimation: tutorial.active && !!tutorial.pendingAnimationAdvance,
            isAiExecuting,
            isAiExecutingRef,
            startTutorial,
            nextStep,
            closeTutorial,
            consumeAi,
            animationComplete,
            bindDispatch,
            syncTutorialState,
        };
    }, [tutorial, isAiExecuting, bindDispatch, closeTutorial, consumeAi, animationComplete, nextStep, startTutorial, syncTutorialState]);

    return (
        <TutorialContext.Provider value={value}>
            {children}
        </TutorialContext.Provider>
    );
};

export const useTutorial = () => {
    const context = useContext(TutorialContext);
    if (!context) {
        throw new Error('useTutorial must be used within a TutorialProvider');
    }
    return context;
};

export const useTutorialBridge = (tutorial: TutorialState, dispatch: (type: string, payload?: unknown) => void) => {
    const context = useContext(TutorialContext);
    const lastSyncSignatureRef = useRef<string | null>(null);
    // 用 ref 保持最新的 context 和 dispatch，供挂载时的 effect 使用
    const contextRef = useRef(context);
    const dispatchRef = useRef(dispatch);
    contextRef.current = context;
    dispatchRef.current = dispatch;

    useEffect(() => {
        if (!context) return;
        const signature = `${tutorial.active}-${tutorial.stepIndex}-${tutorial.step?.id ?? ''}-${tutorial.steps?.length ?? 0}-${tutorial.aiActions?.length ?? 0}-${tutorial.pendingAnimationAdvance ?? false}`;
        if (lastSyncSignatureRef.current === signature) return;
        lastSyncSignatureRef.current = signature;
        context.syncTutorialState(tutorial);
    }, [context, tutorial]);

    // 每次 Board 挂载时无条件重新绑定 dispatch。
    // 不能只依赖 [context, dispatch] 的引用变化：当 Board 因 isGameNamespaceReady 切换而卸载/重挂载时，
    // LocalGameProvider 的 dispatch 引用可能不变（useCallback 依赖稳定），导致 effect 不重新执行，
    // pendingStartRef 里的 manifest 永远不被消费，教程卡在初始化。
    useEffect(() => {
        // 通过 ref 访问最新值，避免闭包捕获旧引用
        contextRef.current?.bindDispatch((...args) => dispatchRef.current(...args));
    // 空依赖：每次挂载执行一次
    }, []);  
};
