# InteractionSystem 职责瘦身重构

> 状态：已实施
> 影响范围：`src/engine/systems/InteractionSystem.ts`、`src/engine/systems/SimpleChoiceSystem.ts`、`src/engine/systems/ResponseWindowSystem.ts`、`src/games/dicethrone/domain/systems.ts`、`src/games/dicethrone/game.ts`、各游戏 `game.ts` + 测试文件

## 问题

当前 `InteractionSystem` 混合了两个职责：

1. **通用交互管理**：队列、阻塞、playerView 过滤
2. **simple-choice 的完整处理**：响应校验、超时、取消 → 生成 `SYS_INTERACTION_RESOLVED` / `CANCELLED` / `EXPIRED`

DiceThrone 的 `dt:card-interaction`（骰子修改、状态选择）是多步交互，不适合 simple-choice 模型。当前它进了 `sys.interaction` 队列享受阻塞能力，但完成逻辑全在游戏层 `systems.ts` 手写——生成 `INTERACTION_COMPLETED` 事件 → 下一轮 `afterEvents` 调用 `resolveInteraction`。这导致：

- `interactionId` 对齐问题（已修过 3 个 bug）
- `INTERACTION_COMPLETED` / `INTERACTION_CANCELLED` 事件中转层多余
- `systems.ts` 里大量 workaround 代码（`statusInteractionCompleted` 标记、`_diceModCount` 计数器）
- `ResponseWindowSystem.interactionLock` 依赖这些事件做解锁，增加耦合

SmashUp 和 SummonerWars 只用 `simple-choice`，不用 `INTERACTION_COMPLETED` / `INTERACTION_CANCELLED`，不受影响。

## 目标

`InteractionSystem` 只管 4 件通用的事：

1. **队列管理**：`queueInteraction` / `resolveInteraction`（已有，不变）
2. **阻塞**：有 `current` 时阻塞 `ADVANCE_PHASE`（已有，不变）
3. **playerView 过滤**（已有，不变）
4. **暴露 `resolveInteraction` 给游戏层直接调用**（已有，但 DiceThrone 没用）

`simple-choice` 的响应处理逻辑从 `InteractionSystem` 拆出，成为独立系统 `SimpleChoiceSystem`。

## 改动清单

### 1. 拆分 `SimpleChoiceSystem`（引擎层）

从 `InteractionSystem` 中提取 `simple-choice` 相关逻辑：

**新文件** `src/engine/systems/SimpleChoiceSystem.ts`：
- `beforeCommand`：处理 `SYS_INTERACTION_RESPOND`（选项校验、多选校验）、`SYS_INTERACTION_TIMEOUT`
- 对 `simple-choice` kind 的阻塞逻辑（该玩家的非系统命令被阻塞）
- 生成 `SYS_INTERACTION_RESOLVED` / `SYS_INTERACTION_EXPIRED`
- priority: 21（在 InteractionSystem(20) 之后）

**修改** `InteractionSystem`：
- 删除 `handleSimpleChoiceRespond`、`handleSimpleChoiceTimeout` 函数
- `beforeCommand` 只保留：
  - `SYS_INTERACTION_CANCEL` 处理（通用取消，所有 kind 都能用）
  - 阻塞 `ADVANCE_PHASE`（通用）
- 删除 `simple-choice` 特有的阻塞逻辑（`current.playerId === command.playerId && !command.type.startsWith('SYS_')` 这段移到 `SimpleChoiceSystem`）

### 2. DiceThrone `dt:card-interaction` 直接调用 `resolveInteraction`（游戏层）

**修改** `src/games/dicethrone/domain/systems.ts`：

去掉 `INTERACTION_COMPLETED` 事件中转，改为直接调用 `resolveInteraction`：

```typescript
// 骰子交互完成：直接 resolve，不生成事件
if (newCount >= requiredCommandCount) {
    newState = resolveInteraction(newState);
    // 不再 nextEvents.push INTERACTION_COMPLETED
}

// 状态交互完成：直接 resolve
if (isStatusType) {
    statusInteractionCompleted = true;
    newState = resolveInteraction(newState);
    // 不再 nextEvents.push INTERACTION_COMPLETED
}

// 删除 INTERACTION_COMPLETED → resolveInteraction 的事件监听
// （不再需要 "if dtEvent.type === 'INTERACTION_COMPLETED'" 这段）
```

取消流程同理：`SYS_INTERACTION_CANCELLED` → 直接 `resolveInteraction` + 生成领域 `INTERACTION_CANCELLED`（用于 reducer 返还卡牌），不再绕一圈。

但取消有个特殊点：`InteractionSystem` 的 `SYS_INTERACTION_CANCEL` 处理已经调用了 `resolveInteraction`，所以 `systems.ts` 收到 `SYS_INTERACTION_CANCELLED` 时 current 已经被清了。这个不需要改，保持现状。

### 3. `ResponseWindowSystem.interactionLock` 改为状态驱动

**问题**：当前 `interactionLock` 通过监听 `INTERACTION_COMPLETED` / `INTERACTION_CANCELLED` 事件来解锁。如果 DiceThrone 不再生成这些事件，锁就永远不释放。

**方案**：改为状态驱动——每轮 `afterEvents` 检查 `sys.interaction.current` 是否已清空：

```typescript
// ResponseWindowSystem.afterEvents 中：
if (interactionLock && currentWindow?.pendingInteractionId) {
    // 如果 sys.interaction.current 已被清空（交互已完成/取消），解锁
    if (!state.sys.interaction.current) {
        // 解锁 + 推进响应者
        const unlockedWindow = { ...currentWindow, pendingInteractionId: undefined };
        // ... advanceToNextResponder 逻辑不变
    }
}
```

这样 `interactionLock` 不再依赖特定事件类型，任何 kind 的交互完成都能自动解锁。

**修改** `src/games/dicethrone/game.ts`：
- `interactionLock.resolveEvents` 配置项可以删除（不再需要）
- `interactionLock` 简化为只需要 `requestEvent`

### 4. 清理

- 删除 `INTERACTION_COMPLETED` 事件类型定义（`events.ts`）
- 删除 `reducer.ts` 中 `INTERACTION_COMPLETED` 的空 case
- 删除 `systems.ts` 中 `statusInteractionCompleted` 标记和 `_diceModCount` 计数器
- 删除 `systems.ts` 中 `INTERACTION_COMPLETED / INTERACTION_CANCELLED → resolveInteraction` 的事件监听
- 更新 `interaction-cleanup.test.ts`

`INTERACTION_CANCELLED` 领域事件保留——reducer 需要它来返还卡牌和 CP。但它不再用于触发 `resolveInteraction`（已由 `InteractionSystem` 的 `SYS_INTERACTION_CANCEL` 处理完成）。

## 不变的部分

- `createSimpleChoice` / `queueInteraction` / `resolveInteraction` / `asSimpleChoice` 等工厂函数和辅助函数：位置不变，仍在 `InteractionSystem.ts` 中导出
- SmashUp / SummonerWars：零改动（只用 `simple-choice`，由新的 `SimpleChoiceSystem` 处理）
- `dt:token-response` / `dt:bonus-dice`：已经是直接调 `resolveInteraction` 的模式，不受影响
- `optionsGenerator` / 通用刷新逻辑：不变
- UI 层：不变

## 改动量评估

| 文件 | 改动 |
|------|------|
| `engine/systems/InteractionSystem.ts` | 删除 ~120 行 simple-choice 处理逻辑 |
| `engine/systems/SimpleChoiceSystem.ts` | 新增 ~130 行（从 InteractionSystem 搬过来） |
| `engine/systems/ResponseWindowSystem.ts` | 修改 interactionLock 解锁逻辑 ~20 行 |
| `dicethrone/domain/systems.ts` | 删除 ~40 行事件中转，改为直接调用 |
| `dicethrone/domain/events.ts` | 删除 InteractionCompletedEvent 类型 |
| `dicethrone/domain/reducer.ts` | 删除空 case |
| `dicethrone/game.ts` | 简化 interactionLock 配置 |
| 各游戏 `game.ts` | systems 数组加 `createSimpleChoiceSystem()` |
| 测试文件 | 更新断言 |

净减代码量约 30 行。核心收益不是代码量，是消除 `INTERACTION_COMPLETED` 事件中转层和 `interactionId` 对齐问题。
