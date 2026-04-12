# 全链路审计：AI 卡死 / response-window 重触发 / 交互循环 / 失败提示噪音（2026-04-12）

> 背景：用户在 DiceThrone / Summoner Wars 等对局中反复遇到：  
> - AI 卡死（不推进、不出牌、不结束）  
> - 点击“跳过响应/跳过阶段”后立刻又弹响应，甚至音效循环  
> - 弹出 `AI 强制结束失败` / `AI 自动跳过失败` 提示  
> - AI 出现“弃牌↔撤回弃牌”“卖↔撤回卖牌”等重复交互行为  
>
> 本文目标：不把问题当成单点 bug，而是把“全链路”拆成可审计的责任边界与可验证的兜底策略。

## 审计范围（全链路分层）

1) **UI 层（房主/观战者）**
- AI 辅助兜底与失败提示：`src/pages/MatchRoom.tsx`
- 游戏 Board 的本地自动跳过（示例：DiceThrone 响应窗口 auto-pass）：`src/games/dicethrone/Board.tsx`

2) **引擎系统层**
- ResponseWindow：`src/engine/systems/ResponseWindowSystem.ts`
- Interaction：`src/engine/systems/InteractionSystem.ts`（通过 `sys.interaction`）
- EventStream（驱动音效/动画）：`src/engine/systems/EventStreamSystem.ts` + `src/lib/audio/useGameAudio.ts`

3) **传输层**
- 服务端 watchdog + 自动上报：`src/engine/transport/server.ts`
- watchdog 候选与诊断：`src/engine/transport/onlineAiRecovery.ts`
- seatControllers 信任门禁：`src/pages/onlineAiSeats.ts`

4) **游戏层（以 DiceThrone 为代表性问题源）**
- AI 动作生成：`src/games/dicethrone/ai.ts`
- 领域事件（打开响应窗口/防止重复打开）：`src/games/dicethrone/domain/*`

## 症状 → 根因分类（强口径）

### A. “AI 不停点”错觉的常见来源
1) **watchdog 越权**：在 *human* 正在响应窗口时出手，必然被系统门禁拒绝 → 产生失败提示噪音。  
2) **AI 行为反复触发响应窗口**：例如 DiceThrone 在 `rollConfirmed=true` 后继续重掷骰子，导致 `CONFIRM_ROLL → RESPONSE_WINDOW_OPENED` 多次发生，真人听到音效反复播放。

### B. “跳过后立刻又弹响应”的两种本质
1) **机制允许的循环**（例如 Smash Up `loopUntilAllPass`）：不是 bug，属于规则/系统设计。  
2) **领域事件重复发射 / 状态去重缺失**：关闭后立刻又开，属于 bug 或规则实现缺口，需要回到领域层修复触发条件。

> 2026-04-12 补充：引擎层 `ResponseWindowSystem.afterEvents()` 已新增“语义等价 OPENED 去重”与“同批 CLOSED → 无业务进展 → 等价 OPENED 忽略”两道门禁。详见 `evidence/engine/response-window-retrigger-system-audit-2026-04-12.md`。

### C. “强制结束/自动跳过失败”提示的真实含义
这些提示来自 `MatchRoom.tsx`：表示“提交兜底命令被拒绝 + 复查后仍卡住”。  
它不是单纯 UI 问题，而是**兜底在不该出手的时机出手**或**候选动作本身无效**。

## 全链路关键门禁（已落地）

### 1) watchdog 不得在 responseWindow 当前 responder 为 human 时出手（真人保护）
**原因**：ResponseWindowSystem 按“当前响应者”门禁执行 `RESPONSE_PASS/推进`，非 responder 出手必然失败；watchdog 出手只会制造失败噪音。  

**实现**：`src/engine/transport/onlineAiRecovery.ts`  
当 `responseWindow.current` 存在且 currentResponder 是 human → `resolveForceEndTurnForStalledAi()` 返回 `null`。  

**验证（单测）**：`src/engine/transport/__tests__/server.test.ts`  
用例：`online AI watchdog 在 responseWindow 当前响应者为 human 时不得误触发强制结束 AI 回合`  
（本轮未运行测试）

### 2) 服务端 watchdog 能在 AI seat 未建连时处理“隐藏交互阻塞”
**原因**：某些隐藏交互只在 AI seat 的 `playerView` 可见，sharedState 只表现为 `isBlocked=true`。若服务端不构造 seatView，则 AI seat 未建连时 watchdog 可能失明。  

**实现**：`src/engine/transport/server.ts`  
在 `sys.interaction.current == null && isBlocked == true` 时，为每个 AI seat 构造一次 `applyPlayerView` 并传入 `resolveForceEndTurnForStalledAi`。  

### 3) DiceThrone：AI 不在已确认骰面后继续做重掷类被动动作（减少 response-window 重触发）
**原因**：`rollConfirmed=true` 后重掷会重置确认状态，引发再次 `CONFIRM_ROLL → RESPONSE_WINDOW_OPENED`，对真人造成重复打扰与音效循环体验。  

**实现**：`src/games/dicethrone/ai.ts`  
当 `state.core.rollConfirmed === true` 时，不再产出 `rerollDie` 类型 `use-passive-ability`。  

**验证（单测）**：`src/games/dicethrone/__tests__/basic-commands-coverage.test.ts`  
- `本地 AI 在已确认骰面时不应再使用教皇税重掷骰子（避免反复打开响应窗口打扰真人）`  
- `本地 AI 在未确认骰面且有可重掷骰子时应能使用教皇税重掷骰子`  
（本轮未运行测试）

### 4) watchdog 推进策略升级：active-turn / 交互恢复后可连续推进多个阶段，直到交还给真人回合
**背景症状**：用户在 DiceThrone 遇到“提示跳过了一个阶段，但没有直接回到我的回合，随后仍可能卡死”。  
**根因**：watchdog 过去在 `candidate.reason === 'active-turn'` 时只会执行一次 `ADVANCE_PHASE`，不会继续 follow-up；并且对 `requiresConfirmedAdvancePhase` 也只允许推进 1 次。  
在“AI 回合需要多次 phase advance 才能结束”的游戏里，这会导致 watchdog 看似成功（marker 变化），但实际上仍停留在 AI 回合中间阶段。

**实现**：`src/engine/transport/server.ts`（`runOnlineAiRecoverySequence`）  
- 去掉对 `candidate.reason === 'active-turn'` 的单步限制；进入统一的 follow-up 循环。  
- follow-up 循环里允许多次推进（`allowAdvancePhase: true`），并以 `progressMarker` 去重/循环检测兜底。  
- 仍然只对 **AI seat** 生效：`resolveForceEndTurnRecoveryStep` 会在 `currentPlayerId !== candidate.playerId` 时立即停止，不会把人类回合也推进掉。

**验证（单测）**：`src/engine/transport/__tests__/server.test.ts`  
用例：`online AI watchdog 在 active-turn 卡死时应持续推进直到交还给真人回合（或遇到 blocker/步数上限）`  
（本轮未运行测试）

### 7) 自动反馈携带“无法选择原因”与选项诊断
**实现**：`src/engine/transport/server.ts`  
- `buildUnsatisfiableInteractionStateSnapshot()` 会附带：  
  - `interaction.seatSelectability`（可选项可用性诊断）  
  - `resolveUnsatisfiableReasonFromInteraction()` 的原因枚举  
  - `disabledReason/disabledReasonKey`（若 options 提供）  
**用途**：当 watchdog 失败或强制跳过触发时，上报日志能够携带“为什么无法选择”。  
（本轮未运行测试）

### 5) watchdog 不依赖 enableAi 才启动（改为 seatControllers 判断）
**原因**：部分老房间缺少 `enableAi` 标记，但仍有 AI seatControllers；若强依赖 enableAi 会导致 watchdog 不启动。  
**实现**：`src/engine/transport/server.ts` 内 `shouldTrustOnlineAiSeatControllersForWatchdog()` 仅依赖 seatControllers 中是否存在 AI 类型。  
**风险门禁**：仍以 `seatControllers[playerId].type === 'human'` 作为保护，避免误伤真人。  
**验证（单测）**：`src/engine/transport/__tests__/server.test.ts`  
用例：`online AI watchdog 缺少 enableAi 标记时仍应根据 seatControllers 启动`  
（本轮未运行测试）

### 6) 前端 seat 校验不应误把真人房识别成 AI 房
**原因**：UI 侧若把真人房识别成 AI 房，会导致提示/按钮出现错位，并可能误导用户“AI 被强制跳过”。  
**实现**：`src/pages/onlineAiSeats.ts` + `src/pages/__tests__/matchSeatValidation.test.ts`  
用例：  
- `缺少 enableAi 标记时，即使残留了 seatControllers 也不得把真人房识别成 AI 房`  
- `显式 enableAi=false 时，应忽略残留的 AI seatControllers 与本地旧凭据`  
（本轮未运行测试）

## 音效循环：链路判定（不是“音效系统坏了”）

音效消费位于 `src/lib/audio/useGameAudio.ts`：  
- 使用 eventStream entry 的 `eventId`/签名指针跳过历史，避免重播；  
- 同一批次 key 去重（`playedKeys`）+ 全局 80ms 节流。  

因此如果你听到“响应打开音效不停响”，通常是：  
**事件真的在不停产生（例如 `RESPONSE_WINDOW_OPENED` 不断被重新发射）**，而不是音效系统重复播放同一条历史事件。

DiceThrone 的响应窗口音效还有额外门禁：只对 responderQueue 包含自己时播放（避免信息泄露）。  
因此“我方一直听到响应音效”几乎可以判定为：**我方被不断纳入 responderQueue**（窗口在重复打开或重复切换）。

## 未覆盖项（必须继续治理的全链路问题）

1) **responseWindow 关闭后立刻重开**的领域根因：  
需要逐窗口类型（afterRollConfirmed/afterCardPlayed/afterAttackResolved）检查“去重字段/序列号”是否齐全（DiceThrone 已对 afterAttackResolved 做过序列去重，但 afterRollConfirmed 仍属“状态驱动”的自然重开）。  

2) **stale responderQueue / currentResponderIndex 错乱**：  
如果队列里 currentResponder 被错误保留为 human，watchdog 现在会刻意不接管；这类 bug 必须在 ResponseWindowSystem 或领域事件源头修复。  

3) **Summoner Wars 的“响应重触发/音效循环”**：  
已完成专项审计与最小修复（`flowHalted` 重复提示/音效回放），并把 6 条核心交互迁到 `InteractionSystem`（infection / grab follow / soul transfer / mind capture / ice_shards / feed_beast），详见 `evidence/summonerwars/summonerwars-ai-interaction-audit-2026-04-12.md`。  
本轮未运行 E2E。  
**仍保留的结构性风险**：Summoner Wars 仍有多条“领域事件 → UI 本地 mode”链路未落到 `InteractionSystem`（Phase B 范围），AI 仍看不到这类交互，存在“AI 看不见但真人能操作”的隐性分叉风险，需要后续继续治理。  

4) **AI 循环动作的检测覆盖面**：  
`onlineAiRecovery.ts` 的 action-loop detector 只覆盖部分 phase 且仅 repeat/alternating；三步以上循环仍可能漏检。  
此外它依赖 `sys.actionLog.entries[].kind`，而 DiceThrone 的 ActionLog 允许列表 **不包含** `DISCARD_CARD` / `UNDO_SELL_CARD` 等交互命令，  
因此“弃牌↔撤回（卖牌）”这类循环很可能**不会被检测到**（actionLog 没有记录 → detector 看不到）。  

## 关联审计文档（单一真相源索引）
- 引擎 watchdog 强口径审计：`evidence/engine/online-ai-watchdog-strong-audit-2026-04-12.md`
- 引擎 ResponseWindow 重触发专项：`evidence/engine/response-window-retrigger-system-audit-2026-04-12.md`
- DiceThrone AI 总审计：`evidence/dicethrone/dicethrone-ai-interaction-audit-2026-04-11.md`
- DiceThrone response-window 重触发专项：`evidence/dicethrone/dicethrone-response-window-retrigger-audit-2026-04-12.md`
- Smash Up AI 强口径审计：`evidence/smashup-ai-interaction-audit-2026-04-11.md`
- Summoner Wars watchdog 链审计：`evidence/summonerwars/summonerwars-ai-interaction-audit-2026-04-12.md`
