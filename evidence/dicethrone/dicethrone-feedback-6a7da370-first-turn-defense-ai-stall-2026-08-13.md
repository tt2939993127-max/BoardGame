# DiceThrone 本地反馈：第一回合防御 AI 卡死

## 范围

- 反馈内容：`卡死了`
- 本地反馈 ID：`6a7da3708817d623a4e4ef2e`
- 对局：`if-nk5Sa3uy`
- 入口：`/play/dicethrone/match/if-nk5Sa3uy?playerID=0`
- 现场：真人 0 号位第一回合发动 `holy-radiance` 后进入 `defensiveRoll`，AI 1 号位工匠防御技能 `tinker` 已选出，但未继续掷防御骰。

## 结论分层

1. 现实故障：玩家看到第一回合卡在防御掷骰阶段，AI 防御方没有继续操作。
2. 直接条件：服务端即时 AI 恢复能找到 AI 合法动作，但同一个 `defensiveRoll` legal-only 候选在第一步执行后仍使用同一个去重 key。
3. 恢复动作：后台 watchdog 后续可以继续代 AI 执行动作，所以这不是 DiceThrone AI 无动作，也不是防御掷骰命令非法。
4. 根本机制：即时恢复链路把“同一阶段同一 AI 候选”当成同一执行步去重；当 AI 在同一阶段需要连续执行多步（例如打牌/掷骰/确认）时，第一步推进了状态，但后续步骤因为去重 key 未包含进度标记而被截断。

## 修复

- 修改 `src/engine/transport/server.ts`：即时恢复的本轮去重 key 对 `legalActionOnly` 候选追加当前进度标记。
- 保留原本的步数上限；如果状态没有真实推进，仍会被同一进度 key 阻断，不会变成无限循环。

## 回归

- 新增 `src/engine/transport/__tests__/server.test.ts` 用例：
  - `DiceThrone 在线普通 AI 应在人类回合 defensiveRoll 立即连续掷骰并确认，不被同阶段去重截断`
  - 覆盖真人当前回合、AI 作为防御方、无周期 watchdog 轮询的即时执行路径。

## 验证

- 原始反馈快照复跑结果：即时执行 `PLAY_CARD → ROLL_DICE → CONFIRM_ROLL`，`rollCount=1`，`rollConfirmed=true`，后续停在真人可响应的 `afterRollConfirmed` 窗口。
- 定向测试：
  - `node scripts/infra/vitest-cli-safe.mjs run src/engine/transport/__tests__/server.test.ts --configLoader native --pool forks --no-file-parallelism --maxWorkers 1 -t "DiceThrone 在线普通 AI 应在人类回合 defensiveRoll 立即连续掷骰并确认"`
  - 结果：1 passed。
- 相关回归：
  - `node scripts/infra/vitest-cli-safe.mjs run src/engine/transport/__tests__/server.test.ts --configLoader native --pool forks --no-file-parallelism --maxWorkers 1 -t "DiceThrone 在线普通 AI|offline AI watchdog 在 AI seat 已离线|remote-ai seat 已离线|human 当前响应窗口|human active|active-turn-legal-only resolved|legal-only 合法动作"`
  - 结果：18 passed。
- 类型与 lint：
  - `npm run typecheck`：通过。
  - `npx eslint src/engine/transport/server.ts src/engine/transport/__tests__/server.test.ts`：通过。

