# DiceThrone AI 交互审计（2026-04-12）

## 1. 审计范围
- AI 决策与可行动作：`src/games/dicethrone/ai.ts`
- 响应窗口开关链路：
  - `src/games/dicethrone/domain/execute.ts`（CONFIRM_ROLL / 交互完成后）
  - `src/games/dicethrone/domain/executeCards.ts`（PLAY_CARD）
  - `src/games/dicethrone/domain/flowHooks.ts`（afterAttackResolved）
- 响应窗口系统：`src/engine/systems/ResponseWindowSystem.ts`
- 交互/命令校验：`src/games/dicethrone/domain/commandValidation.ts`
- 响应窗口 guard：`src/games/dicethrone/domain/responseWindowGuards.ts`
- watchdog / 自动兜底：`src/engine/transport/onlineAiRecovery.ts` + `src/engine/transport/server.ts`

## 2. 权威来源
- 项目规则与审计规范：`docs/ai-rules/testing-audit.md`
- 引擎响应窗口系统实现与注释

## 3. 选用审计维度
- D8（时序正确）
- D9（幂等与重入）
- D39（交互完成后仍卡住/无法继续）
- D40/D41/D45（交互/事件链重复触发、重入）

## 4. 逐项结论（含证据）

### 4.1 响应窗口反复触发的结构风险（D8/D9/D39/D45）
- 现状：
  - `CONFIRM_ROLL` 每次执行都会在 `execute.ts` 中打开 `afterRollConfirmed` 响应窗口；
  - 防重复依赖 `rollConfirmedSequence` 与 `afterRollResponseWindowSequence`（`responseWindowGuards.ts` + reducer `handleResponseWindowOpened`）。
- 关键时序点：
  - `handleDieModified` / `handleDieRerolled` 只要 **执行者等于 rollerId** 就会把 `rollConfirmed=false`（`reducer.ts`）。
  - 如果“响应卡/交互”让当前掷骰玩家在响应窗口后再次修改骰面，随后再次 `CONFIRM_ROLL` → 将 **必然重新触发 response window**。
- 风险结论：
  - 当响应链路中存在“修改骰面 → 需要再次确认”的循环时，响应窗口会不断被重新打开（尤其在 AI 自动选择中更明显）。
  - 该路径在代码层面是 **可重复触发且没有幂等上限** 的（D9/D45），可导致“跳过后又立刻出现”的体验（D39）。
- 证据位置：
  - `execute.ts`：`CONFIRM_ROLL` 内打开响应窗口
  - `responseWindowGuards.ts`：仅按 `rollConfirmedSequence` 判定
  - `reducer.ts`：`DIE_MODIFIED` / `DIE_REROLLED` 重置 `rollConfirmed`

### 4.2 响应窗口“语义等价”判定可能过严（D9/D45）
- 现状：
  - `ResponseWindowSystem.isSemanticallyEquivalentWindow` 需要 `windowType + sourceId + responderQueue` 全量一致才判等。
- 风险结论：
  - 当响应窗口 reopen 的 `sourceId` 被外层逻辑变动（例如 timestamp 派生 id 或不同来源拼接）时，系统会把 reopen 视为新的窗口而非重复，从而 **无法抑制短周期重触发**。
  - 当前 DiceThrone 的 `afterRollConfirmed` 未显式携带 sourceId，因此该点对该窗口影响较小；但对其它窗口类型（如 `afterCardPlayed`）属于潜在复发风险。
- 证据位置：`src/engine/systems/ResponseWindowSystem.ts`（isSemanticallyEquivalentWindow）。

### 4.3 watchdog 兜底与“重复响应窗口”不完全闭环（D39/D45）
- 现状：
  - watchdog 的 progressMarker 使用 `responseWindowId`（`onlineAiRecovery.ts`），
    responseWindowId 为 timestamp 派生时，每次 reopen 都会产生新的 marker。
- 风险结论：
  - 若“窗口不断 reopen”但 `responseWindowId` 每次变化，watchdog 的 **loop_detected** 可能无法触发。
  - 这会导致“卡住但兜底不触发”的体验（用户反馈一致）。
- 证据位置：
  - `onlineAiRecovery.ts`：`buildAiProgressMarker` 包含 `responseWindowId`
  - `server.ts`：基于 marker 变化判定是否有进展。

### 4.4 AI 交互行为的已知护栏（对照）
- 已有护栏：
  - AI 不生成 `UNDO_SELL_CARD`（`ai.ts` 中明确注释）以避免 sell ↔ undo 循环。
  - 被动重掷 (`USE_PASSIVE_ABILITY` + rerollDie) 在 `rollConfirmed=true` 时被抑制，减少响应窗口重触发。
- 结论：
  - 已有护栏覆盖 **卖牌撤回** 与 **确认后被动重掷**，但仍可能被“响应卡/交互导致的骰面修改”绕开，无法覆盖所有重复响应窗口场景。

## 5. 问题清单（需修复/纳入重构）
1. **重复响应窗口没有全链路“语义幂等”门禁**
   - 触发点：`CONFIRM_ROLL` + `rollConfirmed` 被重置
   - 影响：响应窗口“跳过后立即重开”
   - 建议：在响应窗口 reopen 路径引入语义去重/冷却机制（与 rollConfirmedSequence 解耦），或建立“同一 roll 结算链只允许一次 response window”的显式标记。
2. **watchdog loop 检测对 responseWindowId 过敏**
   - 触发点：`responseWindowId` 每次 reopen 都变
   - 影响：兜底不触发
   - 建议：改用“语义 fingerprint（windowType + responderQueue + phase + currentPlayer）”作为 loop marker 的主键，避免 timestamp 导致的假进展。

## 6. 已验证 / 未覆盖
- 本轮未运行 E2E（用户要求“审计留档即可”）。
- 证据全部来自静态代码审计。

## 7. 未覆盖风险
- 响应窗口与 InteractionSystem 的并发重入（多步交互 + responseAdvanceEvents）仍需结合具体链路做动态验证。
- DiceThrone 之外其它游戏的 AI 响应链尚未合并在本审计中（见各游戏独立审计文档）。
