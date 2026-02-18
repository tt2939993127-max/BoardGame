d工会# 需求文档：乐观动画（optimistic-animation）

## 介绍

本功能在现有乐观更新引擎（OptimisticEngine）基础上，为**确定性命令**引入乐观动画播放能力。

当前问题：`stripOptimisticEventStream` 会将乐观执行产生的 EventStream 事件全部剥离，导致动画必须等待服务端确认（50–200ms RTT）才能播放，用户感知到明显卡顿。

目标：对确定性命令，乐观执行时同时保留 EventStream 事件，立即触发动画；服务端确认到达时，若结果一致则动画已播完正常收尾，若结果不一致则快速 snap 到正确状态并避免重复播放动画。对非确定性命令（掷骰子、抽牌等），继续等服务端确认后播动画。

## 词汇表

- **OptimisticEngine**：乐观更新引擎，位于 `src/engine/transport/latency/optimisticEngine.ts`，负责本地预测和服务端调和
- **EventStream**：`sys.eventStream`，引擎事件流系统，动画/特效 Hook 消费此流触发表现层效果
- **确定性命令（Deterministic Command）**：不依赖随机数、结果可在客户端精确预测的命令（如 `ADVANCE_PHASE`、`TOGGLE_DIE_LOCK`）
- **非确定性命令（Non-deterministic Command）**：依赖服务端随机数的命令（如 `ROLL_DICE`、`DRAW_CARD`），结果未知，不可预测
- **乐观动画（Optimistic Animation）**：在服务端确认前，基于乐观预测状态立即播放的动画
- **调和（Reconcile）**：服务端确认状态到达后，与乐观预测状态对比并决定是否回滚的过程
- **回滚（Rollback）**：乐观预测与服务端确认不一致时，快速切换到正确状态的操作
- **EventStream 水位线（Watermark）**：记录已消费到的最新事件 ID，用于防止回滚时重复播放已播过的动画
- **AnimationMode**：命令级别的动画播放策略，`'optimistic'` 表示立即播放，`'wait-confirm'` 表示等待确认
- **CommandAnimationMap**：游戏层配置，声明每个命令的 AnimationMode
- **GameProvider**：React 集成层，位于 `src/engine/transport/react.tsx`

## 需求

### 需求 1：命令级别动画模式声明

**用户故事：** 作为游戏开发者，我希望能为每个命令声明动画播放策略，以便引擎自动决定是否立即播放乐观动画。

#### 验收标准

1. THE CommandAnimationMap SHALL 支持将命令类型映射到 `'optimistic'` 或 `'wait-confirm'` 两种 AnimationMode
2. WHEN 命令未在 CommandAnimationMap 中声明时，THE OptimisticEngine SHALL 默认使用 `'wait-confirm'` 策略（保守默认）
3. THE OptimisticConfig SHALL 接受可选的 `animationMode` 字段，类型为 CommandAnimationMap
4. WHERE 命令同时声明为 `'deterministic'` 且 AnimationMode 为 `'optimistic'`，THE OptimisticEngine SHALL 在乐观执行时保留 EventStream 事件
5. WHERE 命令声明为 `'non-deterministic'` 或 AnimationMode 为 `'wait-confirm'`，THE OptimisticEngine SHALL 继续剥离 EventStream 事件

### 需求 2：乐观动画立即播放

**用户故事：** 作为玩家，我希望确定性操作（如阶段推进、骰子锁定）的动画立即响应，而不是等待网络往返。

#### 验收标准

1. WHEN 玩家执行 AnimationMode 为 `'optimistic'` 的确定性命令时，THE OptimisticEngine SHALL 在 `processCommand` 返回的 `stateToRender` 中包含乐观执行产生的 EventStream 事件
2. WHEN 乐观状态包含 EventStream 事件时，THE GameProvider SHALL 立即将该状态传递给 React 状态，触发动画 Hook 消费
3. THE OptimisticEngine SHALL 在 `processCommand` 返回值中通过 `animationMode` 字段告知调用方本次命令的动画策略
4. WHEN AnimationMode 为 `'wait-confirm'` 时，THE OptimisticEngine SHALL 保持原有行为，剥离 EventStream 事件

### 需求 3：回滚时防止动画重复播放

**用户故事：** 作为玩家，我希望在极少数服务端不一致的情况下，不会看到同一个动画播放两次。

#### 验收标准

1. THE OptimisticEngine SHALL 在每次乐观执行后，记录本次乐观动画产生的 EventStream 事件 ID 范围（水位线）
2. WHEN 服务端确认状态到达且发生回滚时，THE OptimisticEngine SHALL 在 `ReconcileResult` 中携带 `optimisticEventWatermark` 字段，标记已播放的事件 ID 上界
3. WHEN `ReconcileResult.didRollback` 为 `true` 时，THE GameProvider SHALL 将服务端确认状态的 EventStream 中、ID 小于等于水位线的事件标记为已消费（跳过），避免重复播放
4. WHEN `ReconcileResult.didRollback` 为 `false` 时，THE GameProvider SHALL 直接使用服务端确认状态，不做 EventStream 过滤

### 需求 4：非确定性命令保持原有行为

**用户故事：** 作为玩家，我希望掷骰子、抽牌等随机操作的动画仍然在服务端确认后播放，以确保动画结果与实际结果一致。

#### 验收标准

1. WHEN 命令声明为 `'non-deterministic'` 时，THE OptimisticEngine SHALL 不执行本地预测，`processCommand` 返回 `stateToRender: null`
2. WHEN 命令未在 CommandAnimationMap 中声明时，THE OptimisticEngine SHALL 使用 `'wait-confirm'` 策略，剥离 EventStream 事件
3. WHILE 存在未确认的乐观命令时，THE OptimisticEngine SHALL 对非确定性命令的 EventStream 事件不做任何过滤，服务端确认后原样传递

### 需求 5：游戏层配置扩展

**用户故事：** 作为游戏开发者，我希望在现有 `latencyConfig` 中声明动画模式，不需要修改引擎层代码。

#### 验收标准

1. THE diceThroneLatencyConfig SHALL 支持在 `optimistic.animationMode` 字段中声明每个命令的 AnimationMode
2. WHEN 游戏层未配置 `animationMode` 时，THE OptimisticEngine SHALL 对所有命令使用 `'wait-confirm'` 策略（向后兼容）
3. THE OptimisticConfig 类型 SHALL 在不破坏现有游戏配置的前提下扩展 `animationMode` 可选字段

### 需求 6：EventStream 水位线的正确性

**用户故事：** 作为引擎开发者，我希望水位线机制在链式乐观命令场景下也能正确工作。

#### 验收标准

1. WHEN 存在多个连续的乐观命令时，THE OptimisticEngine SHALL 维护所有乐观动画事件的累积水位线（取最大事件 ID）
2. WHEN 服务端确认第 N 个命令时，THE OptimisticEngine SHALL 仅将第 N 个命令对应的乐观事件纳入水位线计算，不影响后续 pending 命令的水位线
3. WHEN 所有 pending 命令均已确认时，THE OptimisticEngine SHALL 重置水位线为初始值
4. IF 乐观执行产生的 EventStream 为空（无新事件），THEN THE OptimisticEngine SHALL 不更新水位线
