/**
 * React 封装层
 *
 * 提供 GameProvider（在线模式）和 LocalGameProvider（本地模式）。
 *
 * 使用方式：
 * ```tsx
 * // 在线模式
 * <GameProvider config={engineConfig} matchId={matchId} playerId={playerId} credentials={creds}>
 *   <Board />
 * </GameProvider>
 *
 * // 本地模式
 * <LocalGameProvider config={engineConfig} numPlayers={2} seed={seed}>
 *   <Board />
 * </LocalGameProvider>
 *
 * // Board 内部
 * const { state, dispatch, playerId, isConnected } = useGameClient<MyCore, MyCommands>();
 * ```
 */

import {
    createContext,
    useContext,
    useEffect,
    useRef,
    useState,
    useCallback,
    useMemo,
} from 'react';
import * as React from 'react';
import type { ReactNode } from 'react';
import type { MatchState, PlayerId, Command, GameEvent, RandomFn } from '../types';
import type { EngineSystem } from '../systems/types';
import type { MatchPlayerInfo } from './protocol';
import type { GameBoardProps } from './protocol';
import type { GameEngineConfig } from './server';
import { GameTransportClient } from './client';
import {
    executePipeline,
    createSeededRandom,
    createInitialSystemState,
    type PipelineConfig,
} from '../pipeline';
import { TestHarness, isTestEnvironment } from '../testing';
import { refreshInteractionOptions } from '../systems/InteractionSystem';

// ============================================================================
// Context 类型
// ============================================================================

interface GameClientContextValue {
    /** 完整游戏状态 */
    state: MatchState<unknown> | null;
    /** 发送命令 */
    dispatch: (type: string, payload: unknown) => void;
    /** 当前玩家 ID */
    playerId: string | null;
    /** 对局玩家信息 */
    matchPlayers: MatchPlayerInfo[];
    /** 是否已连接（本地模式始终为 true） */
    isConnected: boolean;
    /** 是否为多人在线模式 */
    isMultiplayer: boolean;
    /** 重置游戏（本地模式用） */
    reset?: () => void;
}

const GameClientContext = createContext<GameClientContextValue | null>(null);

// ============================================================================
// useGameClient Hook
// ============================================================================

/**
 * 获取游戏客户端上下文
 *
 * 必须在 GameProvider 或 LocalGameProvider 内部使用。
 */
export function useGameClient<
    TCore = unknown,
    TCommandMap extends Record<string, unknown> = Record<string, unknown>,
>() {
    const ctx = useContext(GameClientContext);
    if (!ctx) {
        throw new Error('useGameClient 必须在 GameProvider 或 LocalGameProvider 内部使用');
    }
    return ctx as {
        state: MatchState<TCore> | null;
        dispatch: <K extends string & keyof TCommandMap>(type: K, payload: TCommandMap[K]) => void;
        playerId: string | null;
        matchPlayers: MatchPlayerInfo[];
        isConnected: boolean;
        isMultiplayer: boolean;
        reset?: () => void;
    };
}

// ============================================================================
// useBoardProps — 兼容层 Hook
// ============================================================================

/**
 * 将 useGameClient 的输出转换为 GameBoardProps 格式
 *
 * 过渡期使用，方便现有 Board 组件逐步迁移。
 * 新代码应直接使用 useGameClient。
 */
export function useBoardProps<TCore = unknown>(): GameBoardProps<TCore> | null {
    const ctx = useContext(GameClientContext);

    if (!ctx || !ctx.state) return null;

    const { state, dispatch, playerId, matchPlayers, isConnected, isMultiplayer, reset } = ctx;

    return {
        G: state as MatchState<TCore>,
        dispatch: dispatch as GameBoardProps<TCore>['dispatch'],
        playerID: playerId,
        matchData: matchPlayers,
        isConnected,
        isMultiplayer,
        reset,
    };
}

// ============================================================================
// GameProvider（在线模式）
// ============================================================================

export interface GameProviderProps {
    /** 服务端地址 */
    server: string;
    /** 对局 ID */
    matchId: string;
    /** 玩家 ID */
    playerId: string | null;
    /** 认证凭证 */
    credentials?: string;
    /** 子组件 */
    children: ReactNode;
    /** 错误回调 */
    onError?: (error: string) => void;
    /** 连接状态变更回调 */
    onConnectionChange?: (connected: boolean) => void;
}

export function GameProvider({
    server,
    matchId,
    playerId,
    credentials,
    children,
    onError,
    onConnectionChange,
}: GameProviderProps) {
    const [state, setState] = useState<MatchState<unknown> | null>(null);
    const [matchPlayers, setMatchPlayers] = useState<MatchPlayerInfo[]>([]);
    const [isConnected, setIsConnected] = useState(false);
    const clientRef = useRef<GameTransportClient | null>(null);

    // 用 ref 存储回调，避免回调引用变化导致 effect 重新执行（断开重连）
    const onErrorRef = useRef(onError);
    onErrorRef.current = onError;
    const onConnectionChangeRef = useRef(onConnectionChange);
    onConnectionChangeRef.current = onConnectionChange;

    useEffect(() => {
        const client = new GameTransportClient({
            server,
            matchID: matchId,
            playerID: playerId,
            credentials,
            onStateUpdate: (newState, players) => {
                // 实时刷新交互选项（如果策略是 realtime）
                const refreshedState = refreshInteractionOptions(newState as MatchState<unknown>);
                
                setState(refreshedState);
                setMatchPlayers(players);
            },
            onConnectionChange: (connected) => {
                setIsConnected(connected);
                onConnectionChangeRef.current?.(connected);
            },
            onError: (error) => {
                onErrorRef.current?.(error);
            },
        });

        clientRef.current = client;
        client.connect();

        return () => {
            client.disconnect();
            clientRef.current = null;
        };
    }, [server, matchId, playerId, credentials]);

    const dispatch = useCallback((type: string, payload: unknown) => {
        clientRef.current?.sendCommand(type, payload);
    }, []);

    // 注册测试工具访问器（仅在测试环境生效）
    useEffect(() => {
        if (!isTestEnvironment()) return;
        
        const harness = TestHarness.getInstance();
        
        // 注册状态访问器
        harness.state.register(
            () => state,
            (newState) => setState(newState as MatchState<unknown>)
        );
        
        // 注册命令分发器
        harness.command.register(async (command) => {
            dispatch(command.type, command.payload);
        });
        
        console.log('[GameProvider] 测试工具访问器已注册');
    }, [state, dispatch]);

    const value = useMemo<GameClientContextValue>(() => ({
        state,
        dispatch,
        playerId,
        matchPlayers,
        isConnected,
        isMultiplayer: true,
    }), [state, dispatch, playerId, matchPlayers, isConnected]);

    return (
        <GameClientContext.Provider value={value}>
            {children}
        </GameClientContext.Provider>
    );
}

// ============================================================================
// LocalGameProvider（本地模式）
// ============================================================================

export interface LocalGameProviderProps {
    /** 游戏引擎配置 */
    config: GameEngineConfig;
    /** 玩家数量 */
    numPlayers: number;
    /** 随机种子 */
    seed: string;
    /** 子组件 */
    children: ReactNode;
    /** 命令被拒绝时的回调（验证失败） */
    onCommandRejected?: (commandType: string, error: string) => void;
}

export function LocalGameProvider({
    config,
    numPlayers,
    seed,
    children,
    onCommandRejected,
}: LocalGameProviderProps) {
    const playerIds = useMemo(
        () => Array.from({ length: numPlayers }, (_, i) => String(i)),
        [numPlayers],
    );

    const randomRef = useRef<RandomFn>(createSeededRandom(seed));
    const onCommandRejectedRef = useRef(onCommandRejected);
    onCommandRejectedRef.current = onCommandRejected;

    const [state, setState] = useState<MatchState<unknown>>(() => {
        const random = randomRef.current;
        const core = config.domain.setup(playerIds, random);
        const sys = createInitialSystemState(
            playerIds,
            config.systems as EngineSystem[],
        );
        return { sys, core };
    });

    const dispatch = useCallback((type: string, payload: unknown) => {
        setState((prev) => {
            const payloadRecord = payload && typeof payload === 'object'
                ? (payload as Record<string, unknown>)
                : null;
            const tutorialOverrideId = typeof payloadRecord?.__tutorialPlayerId === 'string'
                ? payloadRecord.__tutorialPlayerId
                : undefined;
            const normalizedPayload = payloadRecord && '__tutorialPlayerId' in payloadRecord
                ? (() => {
                    const { __tutorialPlayerId: _ignored, ...rest } = payloadRecord;
                    return rest;
                })()
                : payload;
            const coreAny = prev.core as Record<string, unknown>;
            // 兼容两种当前玩家字段：currentPlayer（直接字段）或 turnOrder[currentPlayerIndex]（索引模式）
            const coreCurrentPlayer = typeof coreAny.currentPlayer === 'string'
                ? coreAny.currentPlayer
                : (Array.isArray(coreAny.turnOrder) && typeof coreAny.currentPlayerIndex === 'number'
                    ? (coreAny.turnOrder as string[])[coreAny.currentPlayerIndex as number]
                    : undefined);
            const resolvedPlayerId = tutorialOverrideId ?? coreCurrentPlayer ?? '0';

            const command: Command = {
                type,
                // 本地同屏默认使用当前回合玩家；教程 AI 可通过 __tutorialPlayerId 强制指定执行者。
                playerId: resolvedPlayerId,
                payload: normalizedPayload,
                timestamp: Date.now(),
                skipValidation: true,
            };

            const pipelineConfig: PipelineConfig<unknown, Command, GameEvent> = {
                domain: config.domain,
                systems: config.systems as EngineSystem<unknown>[],
                systemsConfig: config.systemsConfig,
            };

            const result = executePipeline(
                pipelineConfig,
                prev,
                command,
                randomRef.current,
                playerIds,
            );

            if (!result.success) {
                console.warn('[LocalGame] 命令执行失败:', type, result.error);
                onCommandRejectedRef.current?.(type, result.error ?? 'command_failed');
                return prev;
            }

            // 实时刷新交互选项（如果策略是 realtime）
            const refreshedState = refreshInteractionOptions(result.state);
            return refreshedState;
        });
    }, [config, playerIds]);

    const reset = useCallback(() => {
        randomRef.current = createSeededRandom(seed);
        const random = randomRef.current;
        const core = config.domain.setup(playerIds, random);
        const sys = createInitialSystemState(
            playerIds,
            config.systems as EngineSystem[],
        );
        setState({ sys, core });
    }, [config, playerIds, seed]);

    const matchPlayers = useMemo<MatchPlayerInfo[]>(
        () => playerIds.map((id) => ({ id: Number(id), isConnected: true })),
        [playerIds],
    );

    const value = useMemo<GameClientContextValue>(() => ({
        state,
        dispatch,
        playerId: null, // 本地模式无特定玩家身份
        matchPlayers,
        isConnected: true,
        isMultiplayer: false,
        reset,
    }), [state, dispatch, matchPlayers, reset]);

    // 注册测试工具访问器（仅在测试环境生效）
    useEffect(() => {
        if (!isTestEnvironment()) return;
        
        const harness = TestHarness.getInstance();
        
        // 注册状态访问器
        harness.state.register(
            () => state,
            (newState) => setState(newState as MatchState<unknown>)
        );
        
        // 注册命令分发器
        harness.command.register(async (command) => {
            dispatch(command.type, command.payload);
        });
        
        console.log('[LocalGameProvider] 测试工具访问器已注册');
    }, [state, dispatch]);

    // E2E 测试支持：在本地/教程模式下暴露 dispatch 和 state 到 window，供 Playwright 直接操作
    useEffect(() => {
        if (typeof window === 'undefined') return;
        const w = window as Window & {
            __BG_LOCAL_DISPATCH__?: typeof dispatch;
            __BG_LOCAL_STATE__?: typeof state;
        };
        w.__BG_LOCAL_DISPATCH__ = dispatch;
        w.__BG_LOCAL_STATE__ = state;
        return () => {
            delete w.__BG_LOCAL_DISPATCH__;
            delete w.__BG_LOCAL_STATE__;
        };
    }, [dispatch, state]);

    return (
        <GameClientContext.Provider value={value}>
            {children}
        </GameClientContext.Provider>
    );
}


// ============================================================================
// BoardBridge — 兼容层桥接组件
// ============================================================================

/**
 * 将 Provider 上下文转换为 props 注入到 Board 组件
 *
 * Board 组件通过 props 接收 G/dispatch 等，
 * BoardBridge 从 Context 读取并注入。
 *
 * 使用 ErrorBoundary 确保 Board 组件在渲染错误时不会崩溃整个应用。
 * 使用条件渲染确保 Board 只在 props 完全就绪时才渲染。
 *
 * ```tsx
 * <GameProvider ...>
 *   <BoardBridge board={DiceThroneBoard} />
 * </GameProvider>
 * ```
 */
export function BoardBridge<TCore = unknown>({
    board: Board,
    loading: Loading,
}: {
    board: React.ComponentType<GameBoardProps<TCore>>;
    loading?: React.ReactNode;
}) {
    const props = useBoardProps<TCore>();
    
    // 确保 props 完全就绪后才渲染 Board
    // 这避免了 React 18 并发渲染可能导致的 Provider 时序问题
    if (!props) {
        return Loading ?? null;
    }
    
    // 使用 key 强制在 props 变化时重新挂载组件
    // 这确保了组件状态的清洁重置
    const stableKey = props.playerID ?? 'board';
    
    return (
        <BoardErrorBoundary fallback={Loading}>
            <Board key={stableKey} {...props} />
        </BoardErrorBoundary>
    );
}

/**
 * Board 组件的错误边界
 * 
 * 捕获 Board 渲染过程中的错误，防止整个应用崩溃。
 * 常见错误包括：
 * - AudioProvider 未初始化
 * - 其他 Context Provider 缺失
 * - 组件内部逻辑错误
 * 
 * 自动重试机制：
 * - 捕获错误后等待 500ms 自动重试
 * - 最多重试 5 次
 * - 重试期间显示 loading fallback
 */
class BoardErrorBoundary extends React.Component<
    { children: React.ReactNode; fallback?: React.ReactNode },
    { hasError: boolean; error?: Error; retryCount: number }
> {
    private retryTimer: NodeJS.Timeout | null = null;
    private readonly maxRetries = 5;

    constructor(props: { children: React.ReactNode; fallback?: React.ReactNode }) {
        super(props);
        this.state = { hasError: false, retryCount: 0 };
    }

    static getDerivedStateFromError(error: Error) {
        return { hasError: true, error };
    }

    componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
        console.error('[BoardBridge] Board 组件渲染错误:', error, errorInfo);
        console.error('[BoardBridge] 错误堆栈:', error.stack);
        
        // 检查是否为可恢复错误
        const isRecoverable = error.message?.includes('AudioProvider') || 
                              error.message?.includes('useAudio') ||
                              error.message?.includes('Context');
        
        if (isRecoverable && this.state.retryCount < this.maxRetries) {
            // 指数退避：500ms, 1000ms, 2000ms, 4000ms, 5000ms (最大)
            const delay = Math.min(500 * Math.pow(2, this.state.retryCount), 5000);
            
            console.warn(`[BoardBridge] 检测到可恢复错误，将在 ${delay}ms 后重试 (${this.state.retryCount + 1}/${this.maxRetries})`);
            
            this.retryTimer = setTimeout(() => {
                console.log(`[BoardBridge] 重试渲染 (${this.state.retryCount + 1}/${this.maxRetries})`);
                this.setState(prev => ({
                    hasError: false,
                    error: undefined,
                    retryCount: prev.retryCount + 1
                }));
            }, delay);
        } else {
            if (this.state.retryCount >= this.maxRetries) {
                console.error('[BoardBridge] 已达到最大重试次数，放弃重试');
            } else {
                console.error('[BoardBridge] 错误不可恢复，不进行重试');
            }
        }
    }

    componentDidUpdate(prevProps: { children: React.ReactNode }) {
        // 如果 children 变化，重置错误状态和重试计数
        if (this.state.hasError && prevProps.children !== this.props.children) {
            console.log('[BoardBridge] children 变化，重置错误状态');
            this.setState({ hasError: false, error: undefined, retryCount: 0 });
        }
    }

    componentWillUnmount() {
        if (this.retryTimer) {
            clearTimeout(this.retryTimer);
            this.retryTimer = null;
        }
    }

    render() {
        if (this.state.hasError) {
            // 如果还在重试范围内，显示 loading fallback
            if (this.state.retryCount < this.maxRetries && this.props.fallback) {
                return this.props.fallback;
            }
            
            // 超过重试次数或没有 fallback，显示错误信息
            if (this.props.fallback && this.state.retryCount >= this.maxRetries) {
                return this.props.fallback;
            }
            
            return (
                <div className="w-full h-full flex items-center justify-center text-red-300 text-sm p-4">
                    <div className="text-center">
                        <div className="mb-2">游戏加载失败</div>
                        <div className="text-xs text-white/50 mb-2">
                            {this.state.error?.message || '未知错误'}
                        </div>
                        {this.state.retryCount >= this.maxRetries && (
                            <div className="text-xs text-white/30">
                                已重试 {this.maxRetries} 次
                            </div>
                        )}
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}
