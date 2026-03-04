# 实现计划：乐观动画（optimistic-animation）

## 概述

基于设计文档，分 4 步实现：类型扩展 → 引擎核心修改 → React 集成层修改 → 游戏层配置扩展。每步均包含对应的测试任务。

## 任务

- [x] 1. 扩展类型定义
  - 在 `src/engine/transport/latency/types.ts` 中新增 `AnimationMode`、`CommandAnimationMap`、`EventStreamWatermark` 类型
  - 在 `OptimisticConfig` 中添加可选字段 `animationMode?: CommandAnimationMap`
  - 在 `ProcessCommandResult` 中添加 `animationMode: AnimationMode` 字段
  - 在 `ReconcileResult` 中添加 `optimisticEventWatermark: EventStreamWatermark` 字段
  - _Requirements: 1.1, 1.3, 2.3, 3.2_

- [x] 2. 修改乐观更新引擎核心逻辑
  - [x] 2.1 将 `stripOptimisticEventStream` 替换为 `applyAnimationMode`
    - 新函数接受 `mode: AnimationMode` 参数
    - `'optimistic'` 模式直接返回乐观状态（保留 EventStream）
    - `'wait-confirm'` 模式保持原有剥离行为
    - 同时实现 `getMaxEventId(eventStream)` 工具函数，返回 EventStream 中最大事件 ID 或 null
    - _Requirements: 1.4, 1.5, 2.1, 2.4_

  - [x] 2.2 为 `applyAnimationMode` 编写属性测试
    - **Property A：optimistic 命令保留 EventStream 事件**
    - **Property B：wait-confirm 命令剥离 EventStream 事件**
    - **Validates: Requirements 1.4, 1.5, 2.1, 2.4**
    - 使用 `fc.record` 生成随机 EventStream 状态，验证两种模式的行为

  - [x] 2.3 修改 `createOptimisticEngine` 内部逻辑
    - 新增内部变量 `optimisticEventWatermark: EventStreamWatermark = null`
    - 新增内部函数 `getAnimationMode(type: string): AnimationMode`，查询 `commandAnimationMode` 配置，默认返回 `'wait-confirm'`
    - 修改 `processCommand`：调用 `applyAnimationMode` 替换原 `stripOptimisticEventStream`；`'optimistic'` 模式下更新水位线（取 `max`）；返回值新增 `animationMode` 字段
    - 修改 `reconcile`：返回值新增 `optimisticEventWatermark` 字段；所有 pending 命令确认完毕时重置水位线为 `null`；发生回滚时携带当前水位线并重置
    - 修改 `reset`：重置 `optimisticEventWatermark = null`
    - 修改 `replayPending`：内部调用 `applyAnimationMode` 时传入正确的 `mode`
    - _Requirements: 1.2, 1.4, 1.5, 2.3, 3.1, 3.2, 4.1, 4.2, 6.1, 6.3_

  - [x] 2.4 为 `processCommand` 和 `reconcile` 编写属性测试
    - **Property C：未声明命令默认 wait-confirm**
    - **Property E：processCommand 返回正确的 animationMode**
    - **Property F：水位线等于乐观事件最大 ID**
    - **Property H：链式命令水位线取最大值**
    - **Property I：全部确认后水位线重置**
    - **Validates: Requirements 1.2, 2.3, 3.1, 6.1, 6.3**
    - 测试文件：`src/engine/transport/latency/__tests__/optimisticAnimation.test.ts`

  - [x] 2.5 为 `reconcile` 无回滚路径编写属性测试
    - **Property D：无回滚时 EventStream 原样传递**
    - **Validates: Requirements 3.4, 4.3**

- [x] 3. 检查点 — 所有测试通过（20/20）

- [x] 4. 修改 GameProvider React 集成层
  - [x] 4.1 在 `src/engine/transport/react.tsx` 中实现 `filterPlayedEvents` 工具函数
    - 查阅 `src/engine/systems/EventStreamSystem.ts` 确认 EventStream 的实际字段结构
    - 实现将 EventStream 消费指针推进到水位线的逻辑（优先使用 `lastConsumedId` 字段；若不存在则过滤 `entries` 数组）
    - _Requirements: 3.3_

  - [x] 4.2 修改 `onStateUpdate` 回调
    - 当 `result.didRollback=true` 且 `result.optimisticEventWatermark !== null` 时，调用 `filterPlayedEvents` 过滤已播放事件
    - 当 `result.didRollback=false` 时，直接使用 `result.stateToRender`，不做过滤
    - _Requirements: 3.3, 3.4_

  - [x] 4.3 为 `filterPlayedEvents` 编写属性测试
    - **Property G：回滚时过滤水位线以下事件**
    - **Validates: Requirements 3.3**
    - 生成随机 EventStream 和水位线值，验证过滤后消费指针正确推进

- [x] 5. 扩展 DiceThrone 游戏层配置
  - 在 `src/games/dicethrone/latencyConfig.ts` 的 `optimistic` 配置中添加 `animationMode` 字段
  - 将 `ADVANCE_PHASE`、`TOGGLE_DIE_LOCK`、`CONFIRM_ROLL`、`SELECT_ABILITY`、`RESPONSE_PASS`、`SKIP_TOKEN_RESPONSE` 声明为 `'optimistic'`
  - 其余命令不声明（默认 `'wait-confirm'`）
  - _Requirements: 5.1, 5.2_

- [x] 6. 最终检查点 — 所有测试通过（20/20）

## 备注

- 标有 `*` 的子任务为可选测试任务，可跳过以加快 MVP 交付
- `filterPlayedEvents` 的具体实现依赖 `EventStreamSystem` 的实际字段结构，任务 4.1 需先查阅源码
- 所有属性测试使用 `fc.assert(fc.property(...), { numRuns: 100 })`，注释格式：`// Feature: optimistic-animation, Property X: ...`
- `stripOptimisticEventStream` 函数在引擎内部被替换后，若外部有直接引用需同步更新（任务 2.1 完成后检查）
