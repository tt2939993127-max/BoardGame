# Design: Summoner Wars 本地 UI 交互迁移到 InteractionSystem

## 背景
Summoner Wars 当前存在两类“等待玩家输入”路径：
1. 领域事件触发后，`useGameEvents` / `StatusBanners` / `useCellInteraction` 在客户端本地创建 mode（如 `soulTransferMode`、`mindCaptureMode`、`grabFollowMode`、`abilityMode`）
2. 事件卡与技能多步骤选择由 `useEventCardModes` / `abilityMode` 维护本地状态，再组合多个 `PLAY_EVENT` / `ACTIVATE_ABILITY` / `DECLARE_ATTACK` 命令

这些状态不进入 `sys.interaction`，结果是：
- AI 无法从 sharedState / playerView 读取真实待处理交互
- hidden interaction 与本地 mode 形成双轨
- watchdog 只能粗暴止血，不能沿正确交互链闭环

## 设计目标
1. **引擎拥有交互真相源**：所有“等待玩家输入”的状态进入 `sys.interaction`
2. **真人/AI 共用同一交互入口**：UI 与 AI 都消费同一交互描述符，不再各自维护一套真值
3. **先迁移 AI 卡死关键链路，再扩展到其余本地多步骤模式**
4. **不误伤真人**：response-window / active turn / hidden interaction 的真人保护保持不变

## 迁移分层

### Phase A：AI 卡死关键链路（优先）
- `SUMMON_FROM_DISCARD_REQUESTED`（感染）
- `GRAB_FOLLOW_REQUESTED`（抓附跟随）
- `SOUL_TRANSFER_REQUESTED`（灵魂转移）
- `MIND_CAPTURE_REQUESTED`（心灵捕获）
- `ABILITY_TRIGGERED(actionId=ice_shards_damage)`
- `ABILITY_TRIGGERED(actionId=feed_beast_check)`

这些链路的共同特征：
- 由领域事件触发
- 玩家必须/可选完成后续决策
- 当前仅在前端本地 mode 中可见
- 最直接影响 AI 可解性与 watchdog 诊断

### Phase B：本地多步骤技能 / 事件卡链路（逐步）
- `afterAttackAbilityMode`
- `rapidFireMode`
- `withdrawMode`
- `telekinesisTargetMode`
- `eventTargetMode`
- `bloodSummonMode`
- `annihilateMode`
- `mindControlMode`
- `stunMode`
- `hypnoticLureMode`
- `chantEntanglementMode`
- `sneakMode`
- `glacialShiftMode`
- 仍然由 `abilityMode` 驱动的多步技能选择

## 交互建模原则

### 1. simple-choice
适用于：
- 单步确认/跳过
- 单步位置选择
- 单步单位选择
- 固定数量较小的选项（如“控制/伤害”、“确认/跳过”）

建议 data 结构：
- `title` / `subtitle`
- `options[]`（携带 command 所需 value）
- `targetType`（`button` / `minion` / `generic`）
- `sourceId`
- `autoResolveIfSingle`（只用于真正强制效果）

### 2. multistep-choice
适用于：
- 需要先选目标，再选位置/方向/卡牌的链路
- 需要保留本地中间进度，但最终由一次确认生成业务命令
- 需要 AI 读取“当前已经走到哪一步”

建议 data 结构：
- `presentation.kind`（如 `sw:board-sequence`）
- `steps[]`（每步类型：unit/position/card/confirm）
- `initialResult`
- `localReducer`
- `canConfirm`
- `toCommands`
- `sourceId`

## 风险与缓解

### 风险 1：本地 mode 与引擎交互双轨并存
- **风险**：UI 仍读旧 mode，AI 读新 interaction，产生双真相源
- **缓解**：每迁移一条链路，就删除对应 mode 的“等待玩家输入”职责，仅保留纯展示状态

### 风险 2：隐藏信息泄露
- **风险**：把原本只在本地看见的目标/手牌候选暴露给对手
- **缓解**：交互描述符严格通过 `playerView` 过滤；需要隐藏的 value 只对 owner 可见

### 风险 3：迁移后出现空选项/无解交互
- **风险**：InteractionSystem 接入不完整导致新卡死
- **缓解**：每条交互必须显式声明 cancel/skip/done/autoResolve 语义，并补 AI 无解测试

### 风险 4：response-window / phase-halt 与新交互冲突
- **风险**：同一时刻既有响应窗口又有新交互，造成门禁冲突
- **缓解**：遵循现有 InteractionSystem/ResponseWindowSystem 锁语义；不新增旁路 UI 状态机

## 验证策略
- Summoner Wars 最相关现有测试文件内补用例，不新建散乱测试文件
- 覆盖：
  - AI 能从 `sys.interaction` 看见并解决交互
  - hidden interaction 仅 owner 可见，但服务端/AI seat 可诊断
  - human responder / human active turn 不被 AI 恢复逻辑误伤
  - 无解选项可 cancel/skip，不会卡死
- 回写 `evidence/summonerwars/` 与 `evidence/engine/`
