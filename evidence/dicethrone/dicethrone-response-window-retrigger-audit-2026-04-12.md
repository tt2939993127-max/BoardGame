# DiceThrone：response-window 重触发（重复提示/音效循环）专项审计（2026-04-12）

## 用户现象（来自线上反馈的复述）
- 我方（human）正在响应窗口中“跳过/让过”；
- 跳过后很快又再次弹出响应提示，且 `RESPONSE_WINDOW_OPENED` 音效疑似反复播放；
- 同时偶发看到 `AI 强制结束失败 / AI 自动跳过失败` 之类提示，感知为“兜底失效/卡死”。

## 强口径事实拆解（不靠猜）

### A. watchdog 误触发会制造“失败提示”噪音
当 responseWindow 存在且当前响应者是 human：
- ResponseWindowSystem 会拒绝任何“非当前响应者”的推进命令（例如 AI 侧的 `ADVANCE_PHASE`）。
- 如果 watchdog 仍试图“强制结束 AI 回合”，会被拒绝 → 触发前端的 `AI 强制结束失败（reason）` toast。

这会让玩家误以为“AI 一直在点击/兜底一直失败”，但本质是**watchdog 在不该出手的时机出手**。

**已落地修正：**
- `src/engine/transport/onlineAiRecovery.ts`：当 `responseWindow.current` 存在且当前响应者是 human 时，`resolveForceEndTurnForStalledAi()` 返回 `null`，避免误触发。
- 单测：`src/engine/transport/__tests__/server.test.ts`  
  用例：`online AI watchdog 在 responseWindow 当前响应者为 human 时不得误触发强制结束 AI 回合`。

### B. response-window “重触发”更可能来自 AI 行为链，而不是 UI 点击
DiceThrone 的响应窗口来源（领域事件）主要有：
- `afterRollConfirmed`（`CONFIRM_ROLL` 后打开）
- `afterCardPlayed`（对手生效的卡牌在非窗口内打出后打开）
- `afterAttackResolved`（攻击结算后条件触发打开）

如果 AI 在 roll 阶段出现“确认后又反复重掷/修改骰面”的行为，会导致多次 `CONFIRM_ROLL` 被执行，进而多次打开 `afterRollConfirmed` 响应窗口，使真人被重复打断（听到反复音效）。

**已落地的 AI 行为约束：**
- `src/games/dicethrone/ai.ts`：当 `rollConfirmed=true` 时，不再产出 `rerollDie` 类型的 `use-passive-ability` 动作。  
  口径：不改变真人规则，只减少 AI 对真人的重复打扰，要求 AI 尽量把“重掷决策”放在确认前做完。

**新增（本轮补齐）：AI 非当前响应者不再生成 response 动作**
- 旧行为：只要 `responseWindow` 存在，AI 就会产出 `RESPONSE_PASS` / `response-play-card`。  
  当当前响应者是 human 时，这些命令会被 ResponseWindowSystem 拒绝，造成“AI 一直在点/失败提示反复弹”的错觉。
- 修复：`buildResponseActions()` 增加 `currentResponderId` 判断：  
  - 仅当 **当前响应者 == AI** 时生成 `RESPONSE_PASS`；  
  - 仅当 **当前响应者 == AI** 或 **team 模式下允许 direct dice interference** 时生成 `response-play-card`；  
  - 否则直接返回空动作，不干扰真人响应。
- 证据：`src/games/dicethrone/__tests__/basic-commands-coverage.test.ts`  
  用例：`本地 AI 在响应窗口但不是当前响应者时不应生成响应动作`

## 未覆盖项（必须继续审计）
1) 是否仍存在“AI 在确认骰面后通过其它命令链路重置 rollConfirmed，再次确认”的路径（例如特殊卡牌/被动/系统交互组合）。  
2) 是否存在“responseWindow 在关闭后立刻被同一源事件再次打开”的领域层去重缺口（类似 `afterAttackResponseWindowSequence` 的 gating 是否需要扩展到其他窗口类型）。  
3) 音效循环是否来自 UI 侧事件消费指针问题（需要单独对 audio/eventStream consumer 做审计）。

## 关联证据
- 引擎层统一审计：`evidence/engine/online-ai-watchdog-strong-audit-2026-04-12.md`
- DiceThrone AI 总审计：`evidence/dicethrone/dicethrone-ai-interaction-audit-2026-04-11.md`

## 本轮验证（静态+单测）
> 你要求“继续审计”，本轮按强口径补了可复查的单测证据（不依赖端到端）。  

1) watchdog 门禁（responseWindow 当前响应者为 human 时不出手）：
- 测试文件：`src/engine/transport/__tests__/server.test.ts`
- 用例名：`online AI watchdog 在 responseWindow 当前响应者为 human 时不得误触发强制结束 AI 回合`

2) DiceThrone AI 行为收敛（rollConfirmed=true 后不再产出重掷被动动作）：
- 测试文件：`src/games/dicethrone/__tests__/basic-commands-coverage.test.ts`
- 用例名：
  - `本地 AI 在已确认骰面时不应再使用教皇税重掷骰子（避免反复打开响应窗口打扰真人）`
  - `本地 AI 在未确认骰面且有可重掷骰子时应能使用教皇税重掷骰子`
