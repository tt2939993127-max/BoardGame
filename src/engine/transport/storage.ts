/**
 * 存储层接口定义
 *
 * 提供项目自有的存储抽象。
 * MongoStorage / HybridStorage 将适配此接口。
 */

// ============================================================================
// 元数据类型
// ============================================================================

/**
 * 玩家元数据
 */
export interface PlayerMetadata {
    name?: string;
    credentials?: string;
    isConnected?: boolean;
    /** 真实用户标识（user:<userId> 或 guest:<guestId>） */
    ownerKey?: string;
}

/**
 * 房间状态枚举
 *
 * 生命周期：waiting → playing → finished
 *                 ↘ abandoned（全员离开且超时）
 *
 * - waiting:   房间已创建，等待玩家加入（至少有一个空座位）
 * - playing:   所有座位已满，游戏进行中
 * - finished:  游戏正常结束（gameover 已设置）
 * - abandoned: 全员断线超时或房主销毁
 */
export type MatchStatus = 'waiting' | 'playing' | 'finished' | 'abandoned';

/**
 * 从 metadata 推断房间状态（兼容旧数据）
 *
 * 旧数据没有 status 字段，需要从 gameover + players 隐式推断。
 * 新数据直接读 status 字段。
 */
export function resolveMatchStatus(metadata: MatchMetadata): MatchStatus {
    // 新数据：直接返回显式状态
    if (metadata.status) return metadata.status;

    // 旧数据兼容推断
    if (metadata.gameover) return 'finished';

    // 检查是否所有座位都已占满
    const players = metadata.players;
    if (players) {
        const seats = Object.values(players);
        const allSeated = seats.length > 0 && seats.every(p => p.name || p.credentials);
        if (allSeated) return 'playing';
    }

    return 'waiting';
}

/**
 * 对局元数据
 */
export interface MatchMetadata {
    gameName: string;
    players: Record<string, PlayerMetadata>;
    createdAt: number;
    updatedAt: number;
    gameover?: unknown;
    setupData?: unknown;
    /** 房间状态（缺省时按 gameover/players 隐式推断，兼容旧数据） */
    status?: MatchStatus;
    /** 内存房间断线时间戳（HybridStorage 使用） */
    disconnectedSince?: number | null;
}

// ============================================================================
// 存储状态类型
// ============================================================================

/**
 * 存储中的对局状态
 *
 * 只需要 G（即 MatchState<TCore>）和一个递增版本号。
 */
export interface StoredMatchState {
    /** 游戏状态（MatchState<TCore> 的序列化形式） */
    G: unknown;
    /** 状态版本号（每次 setState 递增，用于并发检测） */
    _stateID: number;
    /** 随机种子（用于服务端重启后恢复确定性随机序列） */
    randomSeed?: string;
    /** 随机游标（累计消耗次数） */
    randomCursor?: number;
}

// ============================================================================
// 创建对局参数
// ============================================================================

/**
 * 创建对局的初始数据
 */
export interface CreateMatchData {
    initialState: StoredMatchState;
    metadata: MatchMetadata;
}

// ============================================================================
// Fetch 选项与结果
// ============================================================================

/**
 * fetch 选项（按需获取字段，减少 IO）
 */
export interface FetchOpts {
    state?: boolean;
    metadata?: boolean;
}

/**
 * fetch 结果
 */
export interface FetchResult {
    state?: StoredMatchState;
    metadata?: MatchMetadata;
}

// ============================================================================
// 列表查询选项
// ============================================================================

export interface ListMatchesOpts {
    gameName?: string;
    where?: {
        isGameover?: boolean;
        updatedBefore?: number;
        updatedAfter?: number;
    };
}

// ============================================================================
// 核心存储接口
// ============================================================================

/**
 * 对局存储接口
 *
 * 所有存储实现（MongoStorage、HybridStorage）必须实现此接口。
 */
export interface MatchStorage {
    /** 连接存储后端 */
    connect(): Promise<void>;

    /** 创建对局 */
    createMatch(matchID: string, data: CreateMatchData): Promise<void>;

    /** 更新对局状态 */
    setState(matchID: string, state: StoredMatchState): Promise<void>;

    /** 更新对局元数据 */
    setMetadata(matchID: string, metadata: MatchMetadata): Promise<void>;

    /** 获取对局数据（按需获取字段） */
    fetch(matchID: string, opts: FetchOpts): Promise<FetchResult>;

    /** 删除对局 */
    wipe(matchID: string): Promise<void>;

    /** 列出对局 ID */
    listMatches(opts?: ListMatchesOpts): Promise<string[]>;
}
