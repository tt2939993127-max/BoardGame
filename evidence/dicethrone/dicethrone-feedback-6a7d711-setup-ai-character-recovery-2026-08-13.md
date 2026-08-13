# DiceThrone 反馈 6a7d711 setup AI 选角卡死修复

## 范围

- 反馈记录：`6a7d71172b841ba4e6115296`
- 对局：`dicethrone / 4imWV8AwAgf`
- 入口：`/play/dicethrone/match/4imWV8AwAgf?playerID=0`
- 原始症状保真版：真人玩家已经选择 `tianshi`，AI 座位仍停在未选择角色，页面停在开局 setup，无法进入对局。

## 四层归因

1. 现实故障现象
   - DiceThrone 本地在线对局处于 `setup` 阶段。
   - 真人座位 `0` 已选 `tianshi`。
   - AI 座位 `1` 仍是 `unselected`，且没有自动 ready，因此无法正常开局。

2. 直接触发条件
   - 服务端 watchdog 在“真人是当前操作者”的场景下，只会在允许的公开阶段探测 AI 的合法动作。
   - DiceThrone 的 `setup` 阶段原先没有声明为公开开局 AI 可探测阶段，所以服务端没有代普通 AI 执行 `SELECT_CHARACTER`。

3. 恢复动作
   - DiceThrone 引擎配置声明 `onlineAiRecovery.publicPregameLegalActionPhases = ['setup']`。
   - 公共 watchdog 不再硬编码 `factionSelect / summon`，改为读取游戏配置判断“真人当前操作者时是否允许探测 AI legal-only 动作”。
   - 回归中，服务端 watchdog 对 AI 座位执行：
     - `SELECT_CHARACTER`
     - `PLAYER_READY`

4. 根本机制
   - 这是在线 AI 服务端权威重构后的配置化缺口，不是已证实的客户端/服务器状态不同步循环。
   - 公共层原本仍残留具体游戏阶段硬编码，只覆盖了阵营选择类开局阶段，漏掉 DiceThrone 这种“角色选择型 setup”。
   - 修复后，公开开局阶段语义由游戏配置声明，公共层只消费配置，不再猜某个游戏的阶段名。

## 改动文件

- `src/games/dicethrone/game.ts`
  - 添加 `publicPregameLegalActionPhases: ['setup']`。
- `src/engine/transport/server.ts`
  - `resolveOnlineAiLegalActionOnlyCandidate()` 改为调用共享语义 helper。
- `src/engine/transport/onlineAiWatchdogGameSemantics.ts`
  - 作为公开开局 / human-turn legal-only 探测的共享判断入口。
- `src/engine/transport/__tests__/server.test.ts`
  - 增加 DiceThrone 真实 engine/domain/AI runtime 回归：真人先选 `tianshi`，watchdog 后 AI 自动选角色并 ready。
- `e2e/dicethrone/legacy-root/dicethrone-simple-start.e2e.ts`
  - 增加真实在线入口回归：本地在线 DiceThrone AI 房间中，真人选完角色后 AI 自动选角并 ready。

## 验证记录

### 服务端 watchdog 最小矩阵

命令：

```powershell
node scripts/infra/vitest-cli-safe.mjs run src/engine/transport/__tests__/server.test.ts --configLoader native --pool forks --no-file-parallelism --maxWorkers 1 -t "DiceThrone 普通 setup 阶段应代普通 AI 选择角色|factionSelect 阶段应走 legal-action recovery|summonerwars 公开选阵营阶段也应代 AI 执行 legal action|手动代 AI 选角色阶段不应上报|human active main2|通用: human active|Splendor 未开局|online AI watchdog 在 summonerwars 应使用 END_PHASE 推进阶段|online AI watchdog 在 human active 的 off-turn targetingRoll 阶段也应代 AI 执行合法动作"
```

结果：

- 9 passed。
- DiceThrone 日志显示 AI 座位依次执行 `SELECT_CHARACTER` 和 `PLAYER_READY`。
- SummonerWars 公开选阵营、手动 setup guard、off-turn targetingRoll 相关回归同时通过。

### 在线 AI 决策视图总门禁

命令：

```powershell
npm run test:ai:decision-view
```

结果：

- 4 个测试文件通过。
- 445 passed。
- 输出中存在测试环境主动断开的 `socket hang up` 噪声，但命令退出码为 0。

### 类型检查

命令：

```powershell
npm run typecheck
```

结果：

- 通过。

### Targeted lint

命令：

```powershell
npx eslint src/engine/transport/server.ts src/engine/transport/onlineAiWatchdogGameSemantics.ts src/engine/transport/__tests__/server.test.ts src/games/dicethrone/game.ts e2e/dicethrone/legacy-root/dicethrone-simple-start.e2e.ts
```

结果：

- 0 errors。
- `e2e/dicethrone/legacy-root/dicethrone-simple-start.e2e.ts` 有既有 `any` / unused warning；本轮不扩大处理范围。

### 真实入口 E2E

命令：

```powershell
node scripts/infra/run-e2e-command.mjs ci e2e/dicethrone/legacy-root/dicethrone-simple-start.e2e.ts --grep "Online AI setup: host"
```

结果：

- 1 passed。
- 入口是真实本地在线对局路径，不是直接注入状态的单元测试。
- 验证事实：
  - 真人选 `tianshi`。
  - AI 座位 `1` 的 `selectedCharacters['1']` 不再是 `unselected`。
  - AI 座位 `1` 的 `readyPlayers['1'] === true`。
  - AI 座位 `1` 的 `players['1'].characterId` 与选中角色一致。

## 人类保护与边界

- 本修复只允许在游戏配置声明的公开开局阶段探测 AI legal-only 动作。
- 仍保留 human 当前正常响应 / 手动代 AI setup selection 的保护，不替真人选择、不替真人 ready。
- 本轮没有证明“客户端服务器状态不一致导致无限发送”是根因；当前证据证明的是公开开局阶段配置缺失导致 watchdog 没有出手。

## 当前结论

当前反馈形状已修复并回到真实入口验证：DiceThrone 本地在线 AI 对局中，真人选完角色后，普通 AI 会由服务端自动执行选角与 ready，不再卡在 AI 未选角色的 setup 状态。
