export interface UndoRequest {
    requester: string;
    turn: number;
}

export interface UndoAwareState {
    sys: {
        history: any[];
        undoRequest: UndoRequest | null;
    };
}

export class UndoManager {
    /**
     * Initializes the system state required for undo features
     */
    static createInitialState(): UndoAwareState['sys'] {
        return {
            history: [],
            undoRequest: null,
        };
    }

    /**
     * Saves a snapshot of the current G (excluding sys) to history
     * Should be called BEFORE modifying G in a move
     */
    static saveSnapshot(G: any) {
        if (!G.sys) {
            console.warn('UndoManager: G.sys is undefined, cannot save snapshot');
            return;
        }

        // Deep copy the state, EXCLUDING sys to avoid recursion/bloat
        const { sys, ...gameState } = G;

        // Basic JSON clone for serialization safety required by boardgame.io
        const snapshot = JSON.parse(JSON.stringify(gameState));

        G.sys.history.push(snapshot);
    }

    /**
     * Restores the last snapshot from history to G
     */
    static restoreSnapshot(G: any): boolean {
        if (!G.sys || G.sys.history.length === 0) return false;

        const previousState = G.sys.history.pop();

        // Restore all keys from snapshot to G
        Object.keys(previousState).forEach(key => {
            G[key] = previousState[key];
        });

        return true;
    }

    static requestUndo(G: any, playerID: string, turn: number) {
        if (!G.sys) return;
        G.sys.undoRequest = {
            requester: playerID,
            turn: turn
        };
    }

    static clearRequest(G: any) {
        if (!G.sys) return;
        G.sys.undoRequest = null;
    }
}
