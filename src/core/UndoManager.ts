/**
 * 撤销管理器
 * 
 * 提供游戏状态快照保存、恢复以及撤回请求处理的核心逻辑。
 */

export interface UndoRequest {
    requester: string;
    turn: number;
}

/**
 * 支持撤回功能的游戏状态接口
 * 游戏状态需要继承此接口以使用 UndoManager
 */
export interface UndoAwareState {
    sys: {
        /** 历史快照列表，用于撤回功能（存储序列化后的状态） */
        history: string[];
        /** 当前挂起的撤回请求 */
        undoRequest: UndoRequest | null;
    };
}

/**
 * 撤回管理器类
 */
export class UndoManager {
    /**
     * 初始化撤回功能所需的系统状态
     */
    static createInitialState(): UndoAwareState['sys'] {
        return {
            history: [],
            undoRequest: null,
        };
    }

    /**
     * 将当前游戏状态（排除系统内部状态 sys）保存到历史记录中
     * 应该在 move 中修改 G 之前调用
     */
    static saveSnapshot<T extends UndoAwareState>(G: T): void {
        if (!G.sys) {
            console.warn('UndoManager: G.sys 未定义，无法保存快照');
            return;
        }

        const { sys, ...gameState } = G;
        const snapshot = JSON.stringify(gameState);
        G.sys.history.push(snapshot);
    }

    /**
     * 从历史记录中恢复上一个状态快照到 G
     * @returns 是否恢复成功
     */
    static restoreSnapshot<T extends UndoAwareState>(G: T): boolean {
        if (!G.sys || G.sys.history.length === 0) return false;

        const snapshotJson = G.sys.history.pop();
        if (!snapshotJson) return false;

        const previousState = JSON.parse(snapshotJson) as Omit<T, 'sys'>;

        Object.keys(previousState).forEach(key => {
            (G as Record<string, unknown>)[key] = (previousState as Record<string, unknown>)[key];
        });

        return true;
    }

    /**
     * 发起撤回请求
     */
    static requestUndo<T extends UndoAwareState>(G: T, playerID: string, turn: number): void {
        if (!G.sys) return;
        G.sys.undoRequest = {
            requester: playerID,
            turn: turn
        };
    }

    /**
     * 清除撤回请求
     */
    static clearRequest<T extends UndoAwareState>(G: T): void {
        if (!G.sys) return;
        G.sys.undoRequest = null;
    }
}
