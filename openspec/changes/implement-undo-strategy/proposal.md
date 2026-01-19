# Change: Implement Negotiated Undo Strategy

## Why
玩家需要一种方式来修正误操作或改变策略。为了保证竞技的公平性，特别是在本地多人模式下，撤回操作不应单方面执行，而应经过对手的同意。这一机制也为未来在线联机模式的撤回协议打下基础。

## What Changes
- **New Logic**: 引入 `UndoManager` 和 `UndoAwareState`（在 `G.sys` 中）来管理自定义的历史快照，不使用 Boardgame.io 原生的 `ctx.events.endGame` 或 `client.undo` 来回滚，而是手动管理状态恢复。
- **New Flow**: 实现“申请(Request) -> 同意(Approve) -> 执行(Execute)”的撤回流程。
- **UI Components**: 创建 `<GameControls>` 组件，支持显示“请求中”、“等待同意”、“同意/拒绝”等状态。
- **Specs**: 新增 `undo-system` 能力规范。

## Impact
- **Affected Specs**: `undo-system` (New).
- **Affected Code**: 
    - `src/games/default/game.ts`: `G` 状态结构变更，新增 `sys` 字段；Move 逻辑增强。
    - `src/games/default/Board.tsx`: 增加 UI 控制入口。
    - `src/components/game/`: 新增 `GameControls.tsx`。
