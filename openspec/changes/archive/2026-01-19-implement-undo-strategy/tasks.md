# Tasks: Implement Undo Strategy

## 1. Implementation
- [x] 1.1 Define `UndoAwareState` interface and `UndoManager` helper class in `src/games/common/UndoManager.ts`.
- [x] 1.2 Update `TicTacToeState` in `game.ts` to include `sys: { history: any[], undoRequest: any }`.
- [x] 1.3 Implement `requestUndo`, `approveUndo`, `rejectUndo` moves in `game.ts`.
- [x] 1.4 Wrap `clickCell` to call `UndoManager.saveSnapshot(G)` before modifying state.
- [x] 1.5 Create `src/components/game/GameControls.tsx` with Request/Accept/Reject UI logic.
- [x] 1.6 Integrate `GameControls` into `Board.tsx` and connect to Moves.
- [x] 1.7 Fix Logic: Restrict undo requests to non-active players (waiting turn) and approvals to active players.
- [x] 1.8 Verify flow using Debug Panel to switch Player IDs manually (Hotseat mode workaround).
