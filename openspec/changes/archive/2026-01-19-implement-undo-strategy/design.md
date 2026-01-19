# Design: Negotiated Undo System

## 1. 核心需求变更
- **协商机制**：撤回不再是即时动作，而是分为 `Request` (申请) -> `Confirm` (同意) / `Reject` (拒绝) 三阶段。
- **操作封装**：使用命令模式管理游戏变更。

## 2. 方案对比：为什么选择自定义历史与命令模式？

### 挑战：使用框架原生 `client.undo()`
如果使用原生的 `history` 栈：
1. 玩家 A 下棋（Move 1）。
2. 玩家 A 申请撤回（Move 2, 状态变更：`undoRequested = true`）。
3. 玩家 B 同意撤回（Move 3）。
   - 此时要恢复到 Move 1 之前，系统必须连续执行三次 `native undo`（撤销 Move 3, 2, 1）。
   - 这在实现上非常脆弱，且 UI 容易闪烁。

### 解决方案：自定义历史栈 (Custom History Stack)
我们在 `G` 中显式维护一个 `history` 数组，利用**备忘录模式 (Memento Pattern)** 保存关键状态快照。

#### 数据结构
```typescript
interface GameState {
    cells: Cell[];
    // ... 其他游戏状态
    
    // 基础设施状态（不包含在 history 快照中）
    sys: {
        history: GameStateSnapshot[]; // 过去的状态栈
        undoRequest: {
            requester: string;
            turn: number;
        } | null;
    }
}
```

#### 交互流程 (Command Flow)
1. **Move Action**: 玩家执行操作（如 `clickCell`）。
   - **Command.execute**: 
     - 将当前 `G`（排除 `sys`）深拷贝并 push 到 `sys.history`。
     - 执行操作逻辑。
     - 清除任何悬挂的 `undoRequest`。

2. **Request Undo**: 玩家 A 点击撤回。
   - **Command.execute**: 设置 `sys.undoRequest = { requester: 'A', ... }`。
   - *注意*：此操作**不**推入 `sys.history`（因为它是元操作）。

3. **Approve Undo**: 玩家 B 点击同意。
   - **Command.execute**: 
     - 弹出 `sys.history` 的栈顶状态。
     - 将当前 `G` 恢复为该状态。
     - 保留 `sys.history` 剩余部分。

## 3. UI 交互设计
- **申请者**: 
  - 按钮变为 "Waiting for approval..."（禁用）。
  - 可点击 "Cancel Request"。
- **被申请者**:
  - 收到通知/弹窗："Opponent wants to undo."
  - 选项：[Accept] [Reject]。

## 4. 可复用性设计 (Reusability)
我们将创建一个 `UndoManager` 或高阶函数 `withUndoSystem` 来包装游戏逻辑，使其能轻松应用到其他游戏。

```typescript
// 伪代码示例
export const withUndo = (gameLogic) => ({
    ...gameLogic,
    moves: {
        ...wrapMovesWithHistory(gameLogic.moves),
        requestUndo,
        approveUndo,
        rejectUndo,
    }
});
```

## 5. 验证计划
- **验证点 1**: 正常下棋，历史栈增长。
- **验证点 2**: 申请撤回，对手视角看到请求。
- **验证点 3**: 对手拒绝，状态不变，请求清除。
- **验证点 4**: 对手同意，棋盘回滚，`currentPlayer` 正确回退。
