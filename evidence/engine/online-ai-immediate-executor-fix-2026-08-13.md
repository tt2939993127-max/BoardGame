# 在线 AI 即时执行器修复证据（2026-08-13）

## 原始症状

- 用户反馈：DiceThrone 在线局里，真人选择角色后，AI 如果还没选择角色，页面表现为没有立刻继续，像是开局卡住。
- 保真范围：这里处理的是“普通 AI 未开启手动前置选择时，应由服务端立刻继续选角 / ready”；开启 `manualSetupSelection` 的 AI 仍应等待房主人工代选。

## 证据链

### 1. 现实故障现象

- 红测 `DiceThrone 在线普通 AI 应在人类选角命令成功后立即由服务端继续选角，不依赖 watchdog 轮询` 首跑失败。
- 失败状态：真人 `0` 已执行 `SELECT_CHARACTER`，`selectedCharacters['0'] === 'tianshi'`；AI `1` 仍为 `unselected`。
- 这证明 DiceThrone AI 没有在真人选角命令成功后被服务端即时触发。

### 2. 直接触发条件

- 服务端单条命令入口 `handleCommand()` 在命令成功后只执行 `executeCommandInternal()`、`drainCommandQueue()`、释放串行锁并返回。
- 批量命令入口 `handleBatch()` 成功后也只广播和确认 batch。
- 玩家同步入口 `handleSync()` 原本只发送当前状态，不会在“房间已停在 AI 可行动作”时触发 AI。

### 3. 既有恢复动作

- `runOnlineAiRecoveryTick()` 可以通过 watchdog 轮询找到 `seat-legal-only` / `active-turn-legal-only` 等候选，再执行合法 AI 动作。
- 这只是周期恢复路径；它能救场，但不是“人类命令成功后立刻接续”的正式执行入口。

### 4. 根本机制

- 在线 AI server-authority 重构删除旧浏览器 AI seat 执行器后，服务端没有在命令生命周期中建立“正常 AI 即时执行入口”。
- 结果是：AI 能生成合法 `setup-select-character`，服务端 watchdog 也能代打，但普通命令成功 / 玩家同步后没有立即调用该合法动作执行链。
- 所以根因不是 DiceThrone AI 策略不会选角，而是在线传输层缺少命令后与同步后的服务端 AI 接续触发点。

## 修复内容

- `src/engine/transport/server.ts`
  - 新增 `buildOnlineAiSeatControllers()`，统一在线 AI 座位控制器解析，避免 watchdog 与正常执行器各自拼一套判断。
  - 新增 `runOnlineAiImmediateExecution(match, trigger)`，在服务端串行锁外启动 AI 接续执行。
  - `handleCommand()` 成功后触发即时 AI。
  - `handleBatch()` 成功后触发即时 AI。
  - `handleSync()` 在 human seat 同步后触发即时 AI，用于重连 / 进房时房间已停在 AI 可行动作的场景。
  - `runOnlineAiRecoveryTick()` 改为复用同一个座位解析入口。

## AI-only / human guard

- 只有 `seatControllers` 判定为非 human 的 seat 会被执行。
- 人类 socket 命令仍被 `resolveOnlineAiSeatControllerType(match, info.playerID) !== 'human'` 拦截，旧浏览器 AI seat 不能提交正式命令。
- 同步触发只在人类座位 `handleSync()` 后启动；旁观者同步不改变对局。
- 即时执行器只尝试 AI legal action；如果没有合法动作，删除临时 tracker 后退出，不执行强制关窗或裸推进阶段。强制恢复仍留给 watchdog。
- `manualSetupSelection` 仍由 `shouldSuppressOnlineAiWatchdogForManualFactionSelection()` 和服务端 `manual-setup-selection` 通路控制，普通 AI 自动选角不覆盖手动代选语义。

## 验证

- `node scripts/infra/vitest-cli-safe.mjs run src/engine/transport/__tests__/server.test.ts --configLoader native -t "DiceThrone 在线普通 AI 应在人类选角命令成功后立即|DiceThrone 在线普通 AI 应在人类同步进房后继续|房主只能请求服务端执行当前权威的 AI 准备选择|非房主不能请求服务端替 AI 执行准备选择|服务端拒绝不属于人工准备选择"`  
  - 5 passed。
- `node scripts/infra/vitest-cli-safe.mjs run src/engine/transport/__tests__/server.test.ts --configLoader native -t "online AI watchdog 在 DiceThrone 普通 setup 阶段应代普通 AI 选择角色|DiceThrone 在线普通 AI 应在人类选角命令成功后立即|DiceThrone 在线普通 AI 应在人类同步进房后继续"`  
  - 3 passed。
- `node scripts/infra/vitest-cli-safe.mjs run src/pages/__tests__/matchManualSetup.test.ts --configLoader native`  
  - 3 passed。
- `node scripts/infra/vitest-cli-safe.mjs run src/pages/__tests__/matchSeatValidation.test.ts --configLoader native -t "DiceThrone|manual setup|角色选择|manualSetupSelection"`  
  - 6 passed / 145 skipped。
- `node scripts/infra/vitest-cli-safe.mjs run src/games/dicethrone/__tests__/basic-commands-coverage.test.ts --configLoader native -t "setup-select-character|角色|选角|setup"`  
  - 9 passed / 115 skipped。
- `npx eslint src/engine/transport/server.ts src/engine/transport/__tests__/server.test.ts`  
  - passed。

## 残余说明

- 这次没有关闭线上 / 本地反馈记录：当前排查没有重新命中一条可唯一对应“DiceThrone AI 未选角”的 open 反馈对象，不能把 CPU watchdog 或旧系统反馈误关成本问题。
- 测试期间 `matchSeatValidation` 命令结束后仍出现若干 `ECONNRESET` 噪声；对应测试进程 exit code 为 0，断言均已通过，本轮不把该噪声当作 DiceThrone AI 选角问题处理。
