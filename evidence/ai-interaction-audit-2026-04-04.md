# AI 交互链专项审计 2026-04-04

## 审计范围

- 共享 AI 决策入口
  - `src/engine/ai/context.ts`
  - `src/engine/ai/localRunner.ts`
- 在线 AI 提交链
  - `src/pages/MatchRoom.tsx`
  - `src/engine/transport/client.ts`
  - `src/engine/transport/server.ts`
- 本地 AI 执行链
  - `src/engine/transport/react.tsx`
- 游戏侧交互枚举
  - `src/games/dicethrone/ai.ts`
  - `src/games/summonerwars/ai.ts`
- 回归测试
  - `src/pages/__tests__/matchSeatValidation.test.ts`
  - `src/engine/transport/__tests__/patch.test.ts`
  - `src/games/dicethrone/__tests__/basic-commands-coverage.test.ts`
  - `src/games/summonerwars/__tests__/flow.test.ts`

## 权威来源

- `src/engine/systems/InteractionSystem.ts:192-193`
  - `isBlocked` 的契约是“其他玩家有未完成交互时，当前玩家不应发送命令”。
- 当前仓库实现与现有 transport / AI 测试。

## 命中维度

- `D3` 数据流闭环
- `D5` 交互完整
- `D8` 时序正确
- `D39` 流程控制标志清理完整性
- `D47` 回归覆盖完整性

## 逐项结论

### 1. 在线 AI 使用主玩家过滤视角，导致看不到 seat 私有交互

- 结论：`已修复`
- 修复点：
  - `src/engine/ai/localRunner.ts` 已支持 `visibleStateResolver`
  - `src/pages/MatchRoom.tsx:207` 起，在线 AI 优先使用各 seat 自己同步到的 `latestState`
- 回归：
  - `src/pages/__tests__/matchSeatValidation.test.ts:183`

### 2. 共享 AI 不消费 `isBlocked`，多 seat 下会抢跑普通动作

- 结论：`已修复`
- 修复点：
  - `src/engine/ai/context.ts:25-36`
  - 当当前视角 `isBlocked=true` 且没有可见交互时，直接压空 `legalActions`
- 回归：
  - `src/pages/__tests__/matchSeatValidation.test.ts:375`

### 3. 在线 AI 逐条 `sendCommand`，多命令动作存在半提交风险

- 旧结论：`未修复`
- 新结论：`已修复`
- 修复点：
  - `src/pages/MatchRoom.tsx:258`
  - 在线 AI 现在统一走 `client.sendBatch(...)`
  - `src/pages/MatchRoom.tsx:266` 在 `batch:confirmed` 时回写对应 AI seat 的 `latestState`
- 影响：
  - `interaction-multistep` 这类“一次 AI 动作对应多条命令”的场景，不再拆成无确认的多次单发。

### 4. 在线 AI 提交失败后 attemptKey 不回退，会被永久去重

- 旧结论：`未修复`
- 新结论：`已修复`
- 修复点：
  - `src/pages/MatchRoom.tsx:257-274`
  - 仅在真正提交前写入 `lastAiAttemptKeyRef`
  - `batch:rejected` / 断连拒绝后会清空该 attemptKey，并触发一次 retry tick
- 证据：
  - reject 回调链路由 `sendBatch()` 提供
  - transport 侧回归见 `src/engine/transport/__tests__/patch.test.ts:553`

### 5. 本地 AI 命令失败后没有状态推进，也会被 attemptKey 卡死

- 旧结论：`未修复`
- 新结论：`已修复`
- 修复点：
  - `src/engine/transport/react.tsx:91` 新增 `buildAiProgressMarker(...)`
  - `src/engine/transport/react.tsx:1005-1011`
  - 本地 AI 发完命令后，如果短时间内状态 marker 没有前进，则清空 `attemptKey` 并触发一次 retry tick
- 说明：
  - 这是本地 provider 层的共享保护，不依赖具体游戏。

### 6. 游戏侧 `simple-choice multi` 只会固定取前几个选项，无法覆盖组合型主动选择

- 旧结论：`未修复`
- 新结论：`已修复`
- 影响范围：
  - `DiceThrone`
  - `SummonerWars`
- 根因：
  - 两个游戏的 AI 都把 `multi` 交互错误降级成“拿前 `minCount` 个选项”，没有枚举合法组合。
  - 这会导致“交叉交互 / 主动多选 / 精确多选”一旦依赖特定组合，AI 表面有响应能力，实际拿不到正确动作。
- 修复点：
  - `src/games/dicethrone/ai.ts`
  - `src/games/summonerwars/ai.ts`
  - 统一补上 `enumerateInteractionOptionCombinations(...)`
  - `min=0` 时显式生成空选动作
- 回归：
  - `src/games/dicethrone/__tests__/basic-commands-coverage.test.ts:507`
  - `src/games/summonerwars/__tests__/flow.test.ts:825`

## 仍然保留的风险

### 风险 1

- 当前没有补“在线 AI 真正完成一轮 batch 提交后自动继续响应”的 E2E。
- 现有证据停在：
  - 页面桥接级回归
  - transport callback 单测
- 未覆盖：
  - 真 socket 同步与 batch 确认之间的真实竞态

### 风险 2

- 本地 AI 的失败回退目前是“状态未前进判定 + retry tick”策略，已经能止住卡死，但还没有专门单测去锁“命令被领域层拒绝时一定会自动重试”。

### 风险 3

- 当前已覆盖 `simple-choice multi` 的组合枚举，但还没有针对“多步交互里每一步都带主动选择、且前一步会改变后一步可选集”的跨游戏回归。
- 这类问题更像游戏侧策略/合法动作生成耦合风险，不再是共享 AI 框架卡死，但仍建议后续按高风险游戏补 1 条真实链路回归。

## 本轮验证

- `node scripts/infra/vitest-cli-safe.mjs run src/pages/__tests__/matchSeatValidation.test.ts --configLoader native`
  - 结果：`22 passed`
- `node scripts/infra/vitest-cli-safe.mjs run src/engine/transport/__tests__/patch.test.ts --configLoader native`
  - 结果：`24 passed`
- `node scripts/infra/vitest-cli-safe.mjs run src/games/dicethrone/__tests__/basic-commands-coverage.test.ts --configLoader native`
  - 结果：`40 passed`
- `node scripts/infra/vitest-cli-safe.mjs run src/games/summonerwars/__tests__/flow.test.ts --configLoader native`
  - 结果：`30 passed`
- `node scripts/infra/vitest-cli-safe.mjs run src/games/smashup/__tests__/scoreBases-auto-continue.test.ts --configLoader native`
  - 结果：`13 passed`
- `npm run typecheck`
  - 结果：通过

## 修订记录

- 2026-04-04 初版：确认在线 seat 私有视角与 `isBlocked` 共享问题。
- 2026-04-04 修订：补齐在线 batch 提交、在线 attemptKey 回退、本地 attemptKey 无进展回退，并同步更新结论为已修复。
- 2026-04-04 修订：补齐 `DiceThrone` / `SummonerWars` 的 `simple-choice multi` 组合枚举修复，并补对应回归测试。
