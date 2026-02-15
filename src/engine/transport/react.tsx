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
                setState(newState as MatchState<unknown>);
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
            const coreCurrentPlayer = (prev.core as { currentPlayer?: string })?.currentPlayer;
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

            return result.state;
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
    if (!props) return Loading ?? null;
    return <Board {...props} />;
}
