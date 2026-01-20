import type { Game, Move } from 'boardgame.io';
import { INVALID_MOVE } from 'boardgame.io/core';
import { UndoManager, type UndoAwareState } from '../common/UndoManager';

// 1. Define State (G)
export interface TicTacToeState extends UndoAwareState {
    cells: (string | null)[];
}

// 2. Define Moves
const clickCell: Move<TicTacToeState> = ({ G, playerID, events }, id: number) => {
    if (G.cells[id] !== null) {
        return INVALID_MOVE;
    }

    // Save state before modification
    UndoManager.saveSnapshot(G);

    G.cells[id] = playerID;

    // Explicitly end turn to ensure consistent stage transition
    events.endTurn();
};

const requestUndo: Move<TicTacToeState> = ({ G, playerID, ctx }) => {
    // Only allow if history exists
    if (G.sys.history.length === 0) return INVALID_MOVE;

    // Prevent duplicate requests
    if (G.sys.undoRequest) return INVALID_MOVE;

    UndoManager.requestUndo(G, playerID, ctx.turn);
};

const approveUndo: Move<TicTacToeState> = ({ G, events }) => {
    if (!G.sys.undoRequest) return INVALID_MOVE;

    const requester = G.sys.undoRequest.requester;

    if (UndoManager.restoreSnapshot(G)) {
        UndoManager.clearRequest(G);
        // Pass control back to the player who requested (who made the move)
        events.endTurn({ next: requester });
    }
};

const rejectUndo: Move<TicTacToeState> = ({ G }) => {
    UndoManager.clearRequest(G);
};

const cancelRequest: Move<TicTacToeState> = ({ G, playerID }) => {
    if (G.sys.undoRequest?.requester === playerID) {
        UndoManager.clearRequest(G);
    }
};

export const TicTacToe: Game<TicTacToeState> = {
    name: 'TicTacToe',
    setup: () => ({
        cells: Array(9).fill(null),
        sys: UndoManager.createInitialState()
    }),

    turn: {
        activePlayers: {
            currentPlayer: 'play',
            others: 'wait'
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
            return { winner: ctx.currentPlayer };
        }
        if (IsDraw(G.cells)) {
            return { draw: true };
        }
    },
};

// Helper functions
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

function IsDraw(cells: (string | null)[]) {
    return cells.filter(c => c === null).length === 0;
}
