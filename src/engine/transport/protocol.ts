/**
 * 传输层协议定义
 *
 * 定义客户端与服务端之间的 socket.io 事件协议和共享类型。
 */

// ============================================================================
// 玩家信息
// ============================================================================

/**
 * 对局中的玩家信息（广播给客户端）
 */
export interface MatchPlayerInfo {
    id: number;
    name?: string;
    isConnected?: boolean;
}

// ============================================================================
// 客户端 → 服务端 事件
// ============================================================================

export interface ClientToServerEvents {
    /** 同步请求：客户端连接/重连后请求当前状态 */
    'sync': (matchID: string, playerID: string | null, credentials?: string) => void;

    /** 发送命令 */
    'command': (matchID: string, commandType: string, payload: unknown, credentials?: string) => void;
}

// ============================================================================
// 服务端 → 客户端 事件
// ============================================================================

export interface ServerToClientEvents {
    /** 完整状态同步（连接/重连时） */
    'state:sync': (
        matchID: string,
        state: unknown,
        matchPlayers: MatchPlayerInfo[],
    ) => void;

    /** 增量状态更新（命令执行后） */
    'state:update': (
        matchID: string,
        state: unknown,
        matchPlayers: MatchPlayerInfo[],
    ) => void;

    /** 命令执行错误 */
    'error': (matchID: string, error: string) => void;

    /** 玩家连接状态变更 */
    'player:connected': (matchID: string, playerID: string) => void;
    'player:disconnected': (matchID: string, playerID: string) => void;
}

// ============================================================================
// Board Props 契约
// ============================================================================

/**
 * 游戏 Board 组件的标准 Props
 *
 * 提供类型安全的命令分发。
 * TCore: 游戏核心状态类型
 * TCommandMap: 命令名→payload 映射类型（可选，默认 Record<string, unknown>）
 */
export interface GameBoardProps<
    TCore = unknown,
    TCommandMap extends Record<string, unknown> = Record<string, unknown>,
> {
    /** 完整游戏状态（包含 core + sys） */
    G: import('../types').MatchState<TCore>;

    /** 类型安全的命令分发 */
    dispatch: <K extends string & keyof TCommandMap>(
        type: K,
        payload: TCommandMap[K],
    ) => void;

    /** 当前玩家 ID（在线模式为实际 playerID，本地模式为 null） */
    playerID: string | null;

    /** 对局中的玩家信息（名称、连接状态） */
    matchData?: MatchPlayerInfo[];

    /** 是否为多人在线模式 */
    isMultiplayer?: boolean;

    /** 是否已连接到服务端 */
    isConnected?: boolean;

    /** 重置游戏回调（用于重赛） */
    reset?: () => void;
}
