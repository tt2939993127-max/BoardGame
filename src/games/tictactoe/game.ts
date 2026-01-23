import type { Game, Move } from 'boardgame.io';
import { INVALID_MOVE } from 'boardgame.io/core';
import { UndoManager, type UndoAwareState } from '../../core/UndoManager';

// 1. 定义状态 (G)
export interface TicTacToeState extends UndoAwareState {
    cells: (string | null)[]; // 棋盘格子，null 表示未占用，playerID 表示占用的玩家
}

// 2. 定义 Move (动作)

/**
 * 点击格子
 */
const clickCell: Move<TicTacToeState> = ({ G, playerID, events }, id: number) => {
    // 如果格子已被占用，则是非法移动
    if (G.cells[id] !== null) {
        return INVALID_MOVE;
    }

    // 在修改状态前保存快照，以便后续可能的撤回
    UndoManager.saveSnapshot(G);

    G.cells[id] = playerID;

    // 显式结束回合，确保状态机阶段转换一致
    events.endTurn();
};

/**
 * 申请撤销上一步
 */
const requestUndo: Move<TicTacToeState> = ({ G, playerID, ctx }) => {
    // 只有存在历史记录时才允许撤销
    if (G.sys.history.length === 0) return INVALID_MOVE;

    // 防止重复申请
    if (G.sys.undoRequest) return INVALID_MOVE;

    UndoManager.requestUndo(G, playerID, ctx.turn);
};

/**
 * 同意撤销申请
 */
const approveUndo: Move<TicTacToeState> = ({ G, events }) => {
    if (!G.sys.undoRequest) return INVALID_MOVE;

    const requester = G.sys.undoRequest.requester;

    if (UndoManager.restoreSnapshot(G)) {
        UndoManager.clearRequest(G);
        // 将控制权交还给发起撤销请求的玩家（即上一步行动的玩家）
        events.endTurn({ next: requester });
    }
};

/**
 * 拒绝撤销申请
 */
const rejectUndo: Move<TicTacToeState> = ({ G }) => {
    UndoManager.clearRequest(G);
};

/**
 * 取消已发出的撤销申请
 */
const cancelRequest: Move<TicTacToeState> = ({ G, playerID }) => {
    if (G.sys.undoRequest?.requester === playerID) {
        UndoManager.clearRequest(G);
    }
};

/**
 * 井字棋游戏定义
 */
export const TicTacToe: Game<TicTacToeState> = {
    name: 'tictactoe',
    setup: () => ({
        cells: Array(9).fill(null),
        sys: UndoManager.createInitialState()
    }),

    turn: {
        activePlayers: {
            currentPlayer: 'play', // 当前玩家处于 'play' 阶段
            others: 'wait'         // 对方玩家处于 'wait' 阶段
        },
        stages: {
            play: {
                moves: { clickCell, approveUndo, rejectUndo }
            },
            wait: {
                moves: { requestUndo, cancelRequest }
            }
        }
    },

    endIf: ({ G, ctx }) => {
        if (IsVictory(G.cells)) {
            return { winner: ctx.currentPlayer }; // 返回胜利者
        }
        if (IsDraw(G.cells)) {
            return { draw: true }; // 返回平局
        }
    },
};

/**
 * 检查是否有人获胜
 */
function IsVictory(cells: (string | null)[]) {
    const positions = [
        [0, 1, 2], [3, 4, 5], [6, 7, 8],
        [0, 3, 6], [1, 4, 7], [2, 5, 8],
        [0, 4, 8], [2, 4, 6]
    ];
    for (let pos of positions) {
        const symbol = cells[pos[0]];
        let winner = symbol;
        for (let i of pos) {
            if (cells[i] !== symbol) {
                winner = null;
                break;
            }
        }
        if (winner != null) return true;
    }
    return false;
}

/**
 * 检查是否平局
 */
function IsDraw(cells: (string | null)[]) {
    return cells.filter(c => c === null).length === 0;
}

export default TicTacToe;
