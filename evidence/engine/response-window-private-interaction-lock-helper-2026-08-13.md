# Response Window Private Interaction Lock Helper Evidence - 2026-08-13

## Scope

- 对象：响应窗口被私有交互锁住的共享状态不变量。
- 涉及链路：在线 AI 决策视图、online AI watchdog、手动强制恢复。
- 本轮目标：把 `pendingInteractionId` 锁、当前响应者、seat 私有交互一致性收口到唯一 helper，避免各消费者各写一套字段拆解和判断。

## Symptom

- 现实故障：响应窗口表面仍存在，但真正要处理的是某个座位私有的状态/选项交互；共享视图看不到该私有交互时，AI 决策可能被误判为可继续或恢复层可能走错兜底。
- 用户可见风险：AI 卡住、响应窗口不能收口、手动强制恢复与 watchdog 对同一状态给出不同动作。

## Root Cause Layer

- 根因类型：共享抽象缺陷 / 架构时序边界缺陷。
- 机制：`responseWindow.current.pendingInteractionId` 表示“当前响应窗口被某个交互锁住”，但 AI 决策、watchdog、手动恢复此前分别读取 `id / windowType / sourceId / responderQueue / currentResponderIndex / pendingInteractionId`，没有共享同一个生命周期判断。
- 表层条件：某些 shared state 没有 `sys.interaction.current`，但 seat playerView 里存在同一个私有交互；或 pending 锁仍存在但 seat 私有交互已经缺失。

## Fix

- 新增唯一 helper：`src/engine/responseWindowInteractionLock.ts`。
- 共享语义：
  - `resolveResponseWindowCurrent()` 统一解析当前窗口、当前响应者和 pending 交互锁。
  - `hasPendingResponseWindowInteractionLock()` 只接受非空 `pendingInteractionId`，不会把没有响应窗口的状态误判成锁。
  - `resolveResponseWindowPrivateInteractionLockConsistency()` 统一判断 shared/private 窗口、pending 交互 ID、私有交互 owner 是否一致。
  - `responseWindowSeatViewBelongsToResponder()` 统一判断 seat view 是否属于同一个响应者窗口。
- 消费者替换：
  - `src/engine/ai/onlineDecisionView.ts` 不再手写响应窗口和 pending lock freshness 判断。
  - `src/engine/transport/onlineAiRecovery.ts` 的 watchdog、fingerprint、hidden interaction 优先级和手动强制恢复共用 helper 结果。

## Human Guard

- 当前响应者是 human 时，watchdog 和手动恢复仍不替真人 `RESPONSE_PASS` 或选私有交互。
- 只有当前响应者是 AI，且存在可证明的 hidden interaction 或 orphan pending lock，才进入 AI-only 恢复动作。

## Regression Coverage

- `npx tsc --noEmit --pretty false --incremental false --project tsconfig.json`：通过。
- `npx eslint src/engine/responseWindowInteractionLock.ts src/engine/ai/onlineDecisionView.ts src/engine/transport/onlineAiRecovery.ts`：通过。
- `npm run spec:lint`：通过。
- `node scripts/infra/vitest-cli-safe.mjs run src/engine/ai/__tests__/onlineDecisionView.test.ts --configLoader native`：9 passed。
- `node scripts/infra/vitest-cli-safe.mjs run src/engine/transport/__tests__/onlineAiRecovery-gameover.test.ts --configLoader native`：51 passed。
- `node scripts/infra/vitest-cli-safe.mjs run src/engine/transport/__tests__/server.test.ts --configLoader native -t "pendingInteractionId 锁|hidden interaction|没有私有交互"`：5 passed。
- `node scripts/infra/vitest-cli-safe.mjs run src/games/dicethrone/__tests__/response-window-interaction-lock.test.ts --configLoader native`：22 passed。
- `node scripts/infra/vitest-cli-safe.mjs run src/games/dicethrone/__tests__/artificer-mechanics.test.ts --configLoader native -t "这玩意儿真棒|治疗机器人通过正式响应命令|电能脉冲选择治疗机器人"`：4 passed / 58 skipped。
- `node scripts/infra/vitest-cli-safe.mjs run src/games/dicethrone/ui/__tests__/InteractionOverlay.test.tsx --configLoader native -t "simple-choice modal"`：2 passed / 29 skipped。
- `node scripts/infra/vitest-cli-safe.mjs run src/games/dicethrone/__tests__/card-timing-response-boundaries.test.ts src/games/dicethrone/__tests__/paladin-tokens.test.ts --configLoader native -t "拜拜了您|确认骰面窗口|即时行动牌"`：10 passed / 20 skipped。
- `npm run test:ai:decision-view`：4 files passed, 450 tests passed。

## Norm Backfill

- canonical-source：`.spec/knowledge/standards/shared-refactor-guard.md`。
- 新增规则：共享状态不变量一旦被两个以上消费者读取或判断，必须抽成唯一 selector/helper；禁止 AI 决策、watchdog、手动恢复、UI 或 transport 各自重复拆字段和拼 fallback 条件。
