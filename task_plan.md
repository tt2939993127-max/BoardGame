# Task Plan: BoardGame 多线并行调查 / 修复 / 收口

> 当前根目录三件套已切换为 **2026-03-22 多线任务恢复入口**。下次开新会话时，先按本文件的“当前主任务 / 并行子线 / 下一步”继续，不要被后面的历史 Addendum 标题误导。
> 术语约束：当用户说 **plan** 时，默认指的是 `planning-with-files` 这套规划工作方式 / 效果；而这套流程产出的正式计划文档唯一落点就是本文件 `task_plan.md`。`findings.md` / `progress.md` 是配套记录，不是第二份 plan；`temp/*plan*` 只算历史临时材料，不得继续作为当前正式计划入口。

## Goal
- 收口并修复当前 BoardGame 多线问题：线上静态资源 `text/html` 错配、房主被踢/房间被删异常、feedback 未关闭项、E2E 迁移推进、POD 审计/恢复文档核对。
- 维持“本地执行 + guarded task + 并行 Codex”工作方式；用户新开会话后可直接续跑。
- 以最小、可验证、可分批提交的方式推进，不把本地验证误报成远端部署完成。

## Current Phase
## Latest Update (2026-03-26)
- Dice Throne 4人 / 2v2 攻击目标已完成“延后到 targetingRoll 再解析”的收口，OpenSpec `1.8` 已回填为 completed。
- 已修复 `targetingRoll -> defensiveRoll` 时唯一防御技能自动选择丢失的问题，避免进入防御阶段后报 `defense_ability_not_selected`。
- 已更新 4 人模式卡牌目标回归口径：测试先真实完成 `targetingRoll -> defensiveRoll`，不再依赖旧的“预写 defenderId”契约。
- 已补齐 2v2 队伍交替回合顺序：`getPlayerOrder/getNextPlayerId` 现在按“起始玩家所在队两手 → 敌队两手”轮转，同时 `Board.tsx` 顶部三窗继续使用 `getSeatingOrder`，避免 UI 顺序被 turn order 误带动。
- 已完成 OpenSpec 未勾选项审计并回填：`1.2`、`1.5`、`1.6`、`1.7`、`1.9`、`1.10`、`1.11`、`1.12`、`1.18` 已改为 completed；新增 4 人在线座位面板 E2E 后，`2.4` 也已完成。
- 当前仍待补的主要验证项是 `2.5-2.9`：目标交互、顶部三窗、目标面板、完整 2v2 主链路、同队响应窗口过滤。
- 当前验证结果：`flow.test.ts + rule-consistency.test.ts + boundaryEdgeCases.test.ts` 共 `149 passed`，`tsc --noEmit` 无输出。
- Phase A：登记当前多线任务并准备跨会话续跑

## Phases

### Phase A：登记当前多线任务并准备跨会话续跑
- [x] 读取项目根目录三件套，确认历史上下文
- [x] 读取当前主进度文件（`evidence/*progress*`、`full-recovery-plan`、`temp/*plan*`）
- [x] 将 2026-03-22 多线任务写回三件套
- **Status:** completed

### Phase B：收口并行外包结果
- [ ] 检查 `temp/open-feedback-tracker.md` 是否已生成并提炼未关闭反馈清单
- [ ] 检查 `temp/e2e-next-batch-plan.md` 是否已生成并确定下一批 E2E
- [ ] 检查 `temp/codex-room-assets-findings.md` / `temp/codex-find-planning-with-files.md` 等并行产物
- **Status:** in_progress

### Phase C：修复线上静态资源错配
- [ ] 复核 `apps/api/src/main.ts` 中 `/assets` 是否排除在 SPA fallback 外
- [ ] 验证修复是否能阻止旧 chunk 命中 `200 text/html`
- [ ] 核对是否存在旧 `index.html` + 新 `dist/assets` 不一致问题
- **Status:** pending

### Phase D：追查“房主被踢 / 房间被删”根因链
- [ ] 继续检查 `server.ts` 中 create / join / leave / destroy / storage.wipe / startup cleanup / ghost_connection 等链路
- [ ] 检查前端 `useMatchStatus` / `MatchRoom` / `Home` / `lobbySocket` / `matchApi` 是否把 chunk 失效或 `Match not found` 混同为“房间被删除”
- [ ] 基于代码确认仅非对局页自动刷新一次的方案 A 落点
- **Status:** pending

### Phase E：反馈 / E2E / 审计文档收口
- [ ] 只跟未关闭 / 待处理 feedback，不做全量历史拉取
- [ ] 确认 E2E 迁移当前真实 active lanes 与 top 5 next batch
- [ ] 核对 P0/P1/P3 文档是否存在冲突、过期或误导
- **Status:** pending

### Phase 1：读取规则与相关规范
- [ ] 阅读 `src/games/dicethrone/rule/` 规则文档中的攻击/攻击修正相关描述
- [ ] 阅读 `docs/ai-rules/engine-systems.md` 中与状态、命令、系统有关的规范
- [ ] 记录本次任务的已知事实与待验证点
- **Status:** in_progress

### Phase 2：定位攻击修正数据链路
- [ ] 搜索 `dicethrone` 中“攻击修正”相关状态字段、命令、事件、选择器
- [ ] 检查写入链：攻击修正在哪里创建、何时生效、何时清理
- [ ] 检查消费链：攻击流程在哪里读取攻击修正
- **Status:** pending

### Phase 3：确认根因并修复
- [ ] 对照规则判断当前行为是否正确
- [ ] 若存在缺陷，实施最小修复
- [ ] 同步更新文档或说明（若规则说明缺失/不一致）
- **Status:** pending

### Phase 4：验证
- [ ] 运行与本次修复最相关的测试
- [ ] 必要时补充最小测试覆盖正常与边界场景
- [ ] 记录验证结果
- **Status:** pending

### Phase 5：交付
- [ ] 更新 `findings.md` 与 `progress.md`
- [ ] 输出调用链检查报告、根因、修复点与验证结果
- [ ] 给出下一步建议
- **Status:** pending

## Key Questions
1. `dicethrone` 中“攻击修正”在领域层对应的状态字段是什么？
2. 该状态理论上应持续到“下一次攻击”，还是应在回合/阶段结束前清除？
3. 当前问题出在写入、消费还是清理链路？
4. 修复后是否会影响未来 100 个游戏的通用性？

## Decisions Made
| Decision | Rationale |
|----------|-----------|
| 先查规则再查代码 | 先确认期望行为，避免按错误假设修代码 |
| 先做全链路检查再决定是否修复 | 遵守 bug 排查规范，避免盲改 |
| 使用项目根目录计划文件持续记录 | 便于中断恢复与审计 |

## Errors Encountered
| Error | Attempt | Resolution |
|-------|---------|------------|
| 暂无 | - | - |

---

## Addendum（2026-03-10）：传输层状态注入 P1 收尾

### Goal
- 核对并收尾 `src/engine/transport/react.tsx` 与 `src/engine/transport/server.ts` 两个高优先级状态注入 / 鉴权问题。

### Result
- [x] 确认联机 `GameProvider` 的 `StateInjector` 已经只读，客户端不能再把 `playerView` 过滤后的状态回灌服务端。
- [x] 确认 `/game` socket 不再暴露 `test:injectState`。
- [x] 为 `/test/*` 路由补上座位级鉴权（`playerId + credentials`）。
- [x] 为 `restore-state` 增加快照结构校验，避免无效状态直接注入权威状态。
- [x] 跑通目标 Vitest 与 `npm run typecheck`。

### Validation
- `npx vitest run src/server/routes/__tests__/test.routes.test.ts src/engine/transport/__tests__/server.test.ts src/engine/transport/__tests__/server-injectState.test.ts --reporter=dot --silent --maxWorkers=1`
- `npm run typecheck`

---

## Addendum（2026-03-11）：服务器启动缓慢排查

### Goal
- 量化 
pm run dev / 相关服务启动链路的各阶段耗时。
- 定位是预处理、依赖服务、后端冷启动还是前端等待导致体感缓慢。
- 给出按收益排序的优化建议，必要时指出最可能的根因。

### Phases
- [ ] 读取启动脚本与入口
- [ ] 实测预处理与各服务耗时
- [ ] 定位主要瓶颈
- [ ] 输出结论与优化建议

### Current Status
- in_progress

---

## Addendum（2026-03-11）：Dice Throne 攻击修正残留修复

### Goal
- 修复 `dicethrone` 中“攻击修正卡在没有当前攻击时也能打出，并一直残留到后续攻击/后续 UI”的问题。

### Result
- [x] 在 `src/games/dicethrone/domain/rules.ts` 增加当前攻击绑定校验：攻击修正卡必须存在 `pendingAttack`，且只能由当前攻击方打出。
- [x] 在 `src/games/dicethrone/hooks/useActiveModifiers.ts` 增加重置边界：`ATTACK_RESOLVED`、`TURN_CHANGED`、`SYS_PHASE_CHANGED -> main2` 都会清空旧攻击修正显示。
- [x] 将规则边界断言落到轻量可执行测试 `src/games/dicethrone/__tests__/red-hot-meteor-integration.test.ts`，避免落到被排除或超重的测试文件。

### Validation
- `npx vitest run src/games/dicethrone/__tests__/red-hot-meteor-integration.test.ts src/games/dicethrone/__tests__/active-modifiers-undo.test.ts --maxWorkers=1`
- `npm run typecheck`

### Status
- completed

### Result（2026-03-11 更新）
- [x] 回归分析完成：确认 `dev:frontend:wait`（2026-03-09）放大了后端慢启动体感；API 主启动文件近期未见同等级别逻辑扩张。
- [x] 低风险优化完成：API Sentry 改为后台惰性初始化；game-server 启动清理改为监听后后台执行；`dev` 改为分阶段编排；启动命令去除 `npx`。
- [x] 验证完成：`npm run dev` 三端口 ready 从 `18000≈29.75s / 18001≈52.24s / 5173≈68.08s` 降到 `18000≈9.18s / 18001≈7.08s / 5173≈10.24s`。
- [x] 当前阶段可交付。

---

## Addendum（2026-03-11）：API / game-server 启动缓慢排查与优化

### Goal
- 量化 `npm run dev`、`dev:api`、`dev:game` 的启动耗时。
- 找出 API / game-server 为什么会拖慢整套开发环境。
- 在不改业务逻辑、以安全优先的前提下优化启动链路。

### Result
- [x] API：顶层 `@sentry/nestjs` 静态导入已移出关键路径，改为监听成功后后台惰性初始化。
- [x] game-server：启动期房间清理已改为监听成功后后台执行，并增加结构化启动耗时日志。
- [x] 启动编排：新增 `scripts/infra/dev-orchestrator.js`，默认 `npm run dev` 改为 API → game-server → frontend 分阶段启动；保留 `dev:parallel` 便于对照。
- [x] 启动命令：`package.json` / `nodemon.json` 改为显式本地 CLI（`node ./node_modules/tsx/dist/cli.mjs`、`node ./node_modules/nodemon/bin/nodemon.js`），不再依赖全局安装。
- [x] 文档同步：`docs/toolchain-reliability.md`、`docs/deploy.md` 已更新为当前实现。

### Validation
- `npx eslint scripts/infra/dev-orchestrator.js apps/api/src/main.ts server.ts` → 0 errors，1 个既有 warning（`server.ts` `prefer-const`）
- `npm run dev:api`：冷启动一次测得 `~103.84s`；热启动 `~4.20s / 5.82s`
- `npm run dev:game`：热启动 `~3.68s / 4.97s`
- `npm run dev`：热启动 `~12.41s`
- `npm run dev:parallel`：热启动 `~11.48s`

### Key Finding
- API 与 game-server 进程内部真正的业务启动耗时并不高：
  - API 自报 `bootstrap_ms≈212ms`
  - game-server 自报 `bootstrap_ms≈4ms`
- 体感慢的主要来源是 `tsx` / ESM / Node 冷编译与模块图初始化，而不是监听后继续执行的业务逻辑。

### Status
- completed

### Error Log
| Error | Attempt | Resolution |
|-------|---------|------------|
| `apply_patch` / Python 直写在当前仓库对部分既有文件未稳定落盘 | 1 | 改用 `Set-Content -Encoding UTF8` 直接写入，随后立即复读校验 |
| `npm run check:prod-deps` 依赖 `/bin/bash`，当前 Windows 环境缺失 | 1 | 记录为环境限制，本次以 ESLint + 实际启动验证替代 |

---

## Addendum（2026-03-11）：第二阶段开发启动优化（bundle runner）

### Goal
- 把核心后端开发启动从“运行时转译”升级到“预先 bundle + watch 重建 + 运行产物”。
- 继续压低 API / game-server 的首次冷启动。

### Result
- [x] 新增 `scripts/infra/dev-bundle-runner.mjs`，用 `esbuild` 负责 watch bundle，并在成功构建后拉起 / 重启运行时。
- [x] `dev:api` / `dev:game` / `dev:game:lite` 已切到 bundle runner。
- [x] `dev` 默认入口已调整为“API + game-server 并行 bundle，端口 ready 后再启动 frontend”。
- [x] `scripts/e2e/start-all-servers.mjs` 已同步改为 bundle runner，避免 E2E 开发服仍走旧 `tsx` 冷启动路径。
- [x] `nodemon.json` 已移除，不再作为主开发链路配置。


## Addendum?2026-03-11?????????nodemon / Node pin / smoke test?
### Goal
- ?? `nodemon` ?????????????????????????
- ?????????? Node `24.1.0`
- ????????? smoke test????????????????

### Result
- [x] ?? `nodemon.json`???? `npm run dev:game:nodemon`
- [x] ?? `.nvmrc`?`.node-version`??? `package.json` ?? `engines.node: 24.1.0`
- [x] `scripts/infra/dev-orchestrator.js` ?? `DEV_BUNDLE_DIR`????? bundle ????
- [x] ?? `scripts/infra/startup-smoke-test.mjs` ? `npm run smoke:startup`
- [x] `docs/toolchain-reliability.md` ???????????

### Validation
- `npx eslint scripts/infra/dev-orchestrator.js scripts/infra/startup-smoke-test.mjs`
- `npm run smoke:startup`

### Status
- completed


## Addendum?2026-03-11??`englishAtlasMap.json` ?? key ??
### Goal
- ?? `base_great_library` ?? key ????????????

### Result
- [x] ???? key ? 1 ??????????
- [x] ??????? SmashUp ????????????????
- [x] ????????????????????????????
- [x] ?????? `10b99ae6` ?????????????

### Status
- completed

## Addendum（2026-03-11）：删除 `englishAtlasMap.json` 重复 key
### Goal
- 删除 `src/games/smashup/data/englishAtlasMap.json` 中重复的 `base_great_library`
- 验证 game-server 打包日志不再出现 `duplicate-object-key`

### Result
- [x] 已删除后半段重复的 `base_great_library`
- [x] Python 扫描确认重复 key 数量为 `0`
- [x] 直接运行 esbuild 打包 `server.ts`，日志中不再出现 `duplicate-object-key`

### Status
- completed

## Addendum: 2026-03-25 Dice Throne 4 人/2v2 targetingRoll 目标选择收尾

### Goal
- 修复 4 人/2v2 模式下 `targetingRoll` 掷出 `5/6` 后，目标选择会重复创建交互并停留在 `targetingRoll` 的问题。
- 核对当前实现与测试口径，确认选择目标后的正确推进行为。

### Result
- [x] 在 `src/games/dicethrone/domain/core-types.ts` 的 `PendingAttack` 上补充 `targetingSelectionResolved`，为目标选择建立稳定的“已完成”标记。
- [x] 在 `src/games/dicethrone/domain/choiceEffects.ts` 中，`select-target:*` 选择后同时写回 `defenderId`、清理 `targetingSelectionPending`，并设置 `targetingSelectionResolved = true`。
- [x] 在 `src/games/dicethrone/domain/reducer.ts` 与 `src/games/dicethrone/domain/systems.ts` 中，为 `targeting-roll` 的 `CHOICE_REQUESTED` 增加幂等保护；若目标选择已完成，则忽略重复请求。
- [x] 在 `src/games/dicethrone/domain/flowHooks.ts` 中封住历史残留的 5/6 旧分支，确保选择目标后同一条命令链自动推进到 `defensiveRoll`。
- [x] 更新 `src/games/dicethrone/__tests__/flow.test.ts`，将测试口径改为“选择目标后直接进入 `defensiveRoll`”。

### Validation
- `node scripts/infra/vitest-cli-safe.mjs run src/games/dicethrone/__tests__/flow.test.ts -t "4 人模式 targetingRoll" --configLoader native`
- `node scripts/infra/vitest-cli-safe.mjs run src/games/dicethrone/__tests__/flow.test.ts src/games/dicethrone/__tests__/rule-consistency.test.ts --configLoader native`
- `node D:\gongzuo\webgame\BoardGame\node_modules\typescript\lib\tsc.js --noEmit --pretty false`
- 结果：`109 passed`，`tsc` 无输出。

### Status
- completed

## Addendum: 2026-03-28 DiceThrone 旧专项 E2E 收敛

### Goal
- 收敛 DiceThrone 玩家目标交互的旧专项 E2E 债务，避免 `simple-start` 已经拿到 12 条在线证据，但旧文件仍停留在 `No tests found`、旧 selector、旧流程口径。
- 保留一份仍有独立价值的共享交互 UI 契约 E2E，退役明显过时且与现役覆盖重复的旧专项文件。

### Plan
- [x] 盘点 `dicethrone-status-interaction-complete.e2e.ts`、`dicethrone-status-removal.e2e.ts`、`dicethrone-status-interaction-cancel.e2e.ts`、`dicethrone-paladin-vengeance-select-player.e2e.ts` 的真实状态与保留价值。
- [x] 将 `dicethrone-status-interaction-complete.e2e.ts` 升级为现役可运行的共享交互契约 E2E，并对齐当前 `dt-*` 选择器与 `sys.interaction.current` 包装结构。
- [x] 正式退役 `dicethrone-status-removal.e2e.ts`、`dicethrone-status-interaction-cancel.e2e.ts`、`dicethrone-paladin-vengeance-select-player.e2e.ts`，同步清理 `playwright.config.ts` 中对应的 legacy ignore。
- [x] 串行复跑 `dicethrone-status-interaction-complete.e2e.ts` 与 `dicethrone-simple-start.e2e.ts`，确认新套件已稳定通过；`simple-start` 则出现环境级 `skip / Vite 异常退出`，已登记为 runner 噪音而非代码回归。

### Validation
- `npm run test:e2e:ci:file -- e2e/dicethrone-status-interaction-complete.e2e.ts`
- `npm run test:e2e:ci:file -- e2e/dicethrone-simple-start.e2e.ts`
- `npm run test:e2e:ci:file -- e2e/dicethrone-simple-start.e2e.ts "Online 4-player targeting roll: auto targets and choice owners stay correct in 2v2"`

### Status
- completed

## Addendum: 2026-03-27 DiceThrone 联机导航重试与四宫格在线证据恢复

### Goal
- 修掉把联机 E2E 伪装成 `skip` 的真 blocker，并补回四宫格版本 `Transfer Status` 的在线证据。
- 确认 `setupDTOnlineMatchWithPlayers()` 返回 `null` 时，问题究竟在接口、导航还是角色页等待。

### Result
- [x] 手动探针已确认 `/games/dicethrone/create`、`/claim-seat`、`/join` 正常，服务端不是本轮 skip 根因。
- [x] 已复现并定位 `page.goto(/play/dicethrone/match/...) -> net::ERR_INSUFFICIENT_RESOURCES`，这才是 helper 吞错后导致 `skip` 的真实来源。
- [x] `e2e/helpers/dicethrone.ts` 已为联机 match 页跳转加入瞬时错误重试。
- [x] 4 人 `Transfer Status` 单用例重新恢复为 `1 passed`。
- [x] 整份 `e2e/dicethrone-simple-start.e2e.ts` 已恢复为 `8 passed`。
- [x] 最新 `06-four-player-transfer-token-target-selection.png` 已确认四宫格在线结构成立。

### Validation
- `npm run test:e2e:ci:file -- e2e/dicethrone-simple-start.e2e.ts "Online 4-player transfer token: enemy token can be transferred to ally with stable target metadata"`
- `npm run test:e2e:ci -- e2e/dicethrone-simple-start.e2e.ts`

### Status
- completed

## Addendum: 2026-03-26 DiceThrone 4 人目标交互四宫格修正

### Goal
- 按用户反馈把 `Transfer Status` 第二阶段从“来源摘要 + 3 目标卡”改成更一致的四宫格。
- 保持“先选一个玩家，再选另一个玩家”的统一语义，不再把第一个玩家降格成异类说明块。

### Result
- [x] `InteractionOverlay.tsx` 已改为第二阶段四宫格：来源玩家保留在原位，作为锁定禁用卡显示。
- [x] 来源卡新增稳定标识 `dt-transfer-source-locked-<pid>`，其余目标卡继续使用 `dt-transfer-target-<pid>`。
- [x] `InteractionOverlay.test.tsx` 已更新为“四宫格 + 来源锁定”的结构断言。
- [x] TypeScript 与组件测试已通过。
- [ ] 新的在线四宫格截图尚未补到。

### Validation
- `node .\node_modules\typescript\lib\tsc.js --noEmit --pretty false`
- `node scripts/infra/vitest-cli-safe.mjs run src/games/dicethrone/ui/__tests__/InteractionOverlay.test.tsx --configLoader native`
- `npm run test:e2e:ci:file -- e2e/dicethrone-simple-start.e2e.ts "Online 4-player transfer token: enemy token can be transferred to ally with stable target metadata"`：本轮结果为 `skipped`
- `npm run test:e2e:ci -- e2e/dicethrone-simple-start.e2e.ts`：本轮结果为 `8 skipped`

### Status
- completed

## Addendum: 2026-03-26 DiceThrone 4 人目标交互 UI 精简

### Goal
- 处理用户对 4 人目标交互 UI 的直接反馈：去掉重复选中框，解决第二阶段像“六个方框”的视觉噪音。
- 在不改动目标选择语义的前提下，仅重构 `InteractionOverlay` 的信息层级与卡片呈现。

### Result
- [x] `selectTargetStatus` 第二阶段已改为“来源摘要 + 目标卡片”结构，不再保留第一阶段整排来源卡。
- [x] 已选目标不再外挂额外勾选框，统一只保留卡片自身高亮。
- [x] `InteractionOverlay` 里重复的友敌样式分支已抽到单一映射函数，便于后续继续收口多人交互 UI。
- [x] 组件测试已补上结构断言，防止后续把第一阶段卡片重新带回第二阶段。
- [x] 在线 4 人 `Transfer Status` 回归已通过，并复核最新截图符合“3 个目标卡”的视觉预期。

### Validation
- `node scripts/infra/vitest-cli-safe.mjs run src/games/dicethrone/ui/__tests__/InteractionOverlay.test.tsx --configLoader native`
- `node .\node_modules\typescript\lib\tsc.js --noEmit --pretty false`
- `npm run test:e2e:ci:file -- e2e/dicethrone-simple-start.e2e.ts "Online 4-player transfer token: enemy token can be transferred to ally with stable target metadata"`

### Status
- completed

## Addendum: 2026-03-26 DiceThrone 面向多人能力审计边界

### Goal
- 在 Batch 1 已补完 `Transfer Status` 与 `Consecrate` 在线证据后，收敛剩余“面向多人目标”能力的优先级，避免继续把精力花在更简单路径上。

### Result
- [x] 已确认当前高风险玩家目标入口主要集中在 `paladin-vengeance-select-player`、`paladin-consecrate`、`remove-status-1`、`remove-all-status`、`transfer-status`。
- [x] 更复杂的 `transfer-status` 与 `paladin-consecrate` 已有 4 人在线证据。
- [x] 当前决策：`remove-status-1/remove-all-status` 这类更简单移除交互暂不优先补在线 E2E。

### Status
- completed

## Addendum: 2026-03-26 DiceThrone 4 人任意玩家授 token 在线证据补强

### Goal
- 在 Batch 1 已完成的基础上，再补一条更强的在线证据，证明“任意玩家授 token”不是只停留在规则层和通用验证层。
- 以 `Consecrate` 作为代表性多人能力，覆盖 `tokenGrantConfigs` 多 token 授予。

### Result
- [x] 新增在线 4 人 `Consecrate` 用例，host 可把 `Protect/Retribution/Crit/Accuracy` 同时授予队友。
- [x] 补充 `rule-consistency.test.ts` 中 `GRANT_TOKENS + tokenGrantConfigs` 的正向 4 人验证。
- [x] 更新证据文档与截图，当前 `dicethrone-simple-start.e2e.ts` 已扩展为 `8 passed`。

### Validation
- `node scripts/infra/vitest-cli-safe.mjs run src/games/dicethrone/__tests__/rule-consistency.test.ts --configLoader native`
- `npm run test:e2e:ci:file -- e2e/dicethrone-simple-start.e2e.ts "Online 4-player grant tokens: Consecrate can grant four tokens to ally with stable target metadata"`
- `npm run test:e2e:ci -- e2e/dicethrone-simple-start.e2e.ts`

### Status
- completed

## Addendum: 2026-03-26 DiceThrone 4 人玩家目标交互 Batch 1 收口

### Goal
- 收口 OpenSpec `update-dicethrone-4p-player-target-interactions` 的 Batch 1：任意玩家授 token、任意玩家移除状态、状态 / 可移除 token 转移。
- 先补共享验证层与 4 人玩家选择 UI，再用 1 条代表性在线 E2E 把 `Transfer Status` 升级到 4 人版本。

### Result
- [x] `commandValidation.ts` 已收紧 `GRANT_TOKENS` 候选目标校验，并修正 `TRANSFER_STATUS` 为兼容真实在线双阶段 UI。
- [x] `InteractionOverlay.tsx` 已为 4 人玩家卡片与状态 / token 徽章输出稳定 `data-testid` / `data-team-tone` 元信息。
- [x] 组件测试与规则测试已补齐：既覆盖 4 人敌我标识，也覆盖 `TRANSFER_STATUS` 在 `selectStatus` 权威态下的真实在线验证路径。
- [x] 在线 E2E 已新增 4 人 `Transfer Status` 用例：敌方 `Crit` token 可转给队友，第二阶段来源玩家被排除，host 与队友页权威状态一致。
- [x] OpenSpec `update-dicethrone-4p-player-target-interactions/tasks.md` 已全部回填为 completed。

### Validation
- `node .\node_modules\typescript\lib\tsc.js --noEmit --pretty false`
- `node scripts/infra/vitest-cli-safe.mjs run src/games/dicethrone/ui/__tests__/InteractionOverlay.test.tsx src/games/dicethrone/__tests__/rule-consistency.test.ts --configLoader native`
- `npm run test:e2e:ci:file -- e2e/dicethrone-simple-start.e2e.ts "Online 4-player transfer token: enemy token can be transferred to ally with stable target metadata"`
- `npm run test:e2e:ci -- e2e/dicethrone-simple-start.e2e.ts`

### Status
- completed

## Addendum: 2026-03-26 DiceThrone 4 人玩家目标交互专项审计

### Goal
- 在 2v2 核心规则收口后，单独审计并补齐“面向玩家目标”的多人能力与交互。
- 采用新的 OpenSpec change 分批推进，避免继续污染已完成的 `add-dicethrone-2v2-team-mode`。

### Batch Strategy
- Batch 1：任意玩家授 token、任意玩家移除状态、状态 / 可移除 token 转移。
- Batch 2：其余基于 `selectPlayer` / `targetPlayerIds` 的多人技能与卡牌。
- Batch 3：需要额外 UI/动画/特殊交互语义的长尾能力。

### Current Findings
- `customActions/common.ts` 与 `customActions/paladin.ts` 已经把多名玩家候选扩为 `Object.keys(state.players)`，说明共享入口并非完全 2 人写死。
- `InteractionOverlay.test.tsx` 与 `dicethrone-paladin-vengeance-select-player.e2e.ts` 仍主要按 `['0','1']` 与“自己/对手”两选项口径验证，不能证明 4 人版本正确。
- `validateGrantTokens` / `validateTransferStatus` 目前只校验“存在 pendingInteraction + playerId 匹配”，验证层过宽，需要纳入第一批高风险收口。

### Active Change
- `update-dicethrone-4p-player-target-interactions`

### Status
- in_progress

## Addendum: 2026-03-25 Dice Throne 4人/2v2 targetingRoll 目标选择收尾（格式修正）

### Goal
修复 4 人/2v2 模式下 `targetingRoll` 掷出 `5/6` 后，目标选择会重复创建交互并停留在 `targetingRoll` 的问题；同时确认选择目标后的正确推进口径。

### Result
本轮收尾补上了 `pendingAttack.targetingSelectionResolved`，并在 `choiceEffects.ts`、`reducer.ts`、`systems.ts`、`flowHooks.ts` 上把目标选择完成态和重复 `CHOICE_REQUESTED` 的幂等保护接完整。`flow.test.ts` 也已同步改为“选择目标后直接进入 `defensiveRoll`”。

### Validation
已执行 `node scripts/infra/vitest-cli-safe.mjs run src/games/dicethrone/__tests__/flow.test.ts -t "4 人模式 targetingRoll" --configLoader native`、`node scripts/infra/vitest-cli-safe.mjs run src/games/dicethrone/__tests__/flow.test.ts src/games/dicethrone/__tests__/rule-consistency.test.ts --configLoader native`、`node D:\gongzuo\webgame\BoardGame\node_modules\typescript\lib\tsc.js --noEmit --pretty false`。结果为 `109 passed`，`tsc` 无输出。

### Status
completed

## Addendum: 2026-03-27 DiceThrone 2 人 Transfer Status 在线证据补齐

### Goal
- 确认共享 `InteractionOverlay` 改成“四宫格 + 锁定来源卡”后，2 人 `Transfer Status` 也同步吃到同一套 UI。
- 为 2 人联机场景补一条现役在线 E2E，不再只靠共享组件测试推断。

### Result
- [x] 已确认 2 人与 4 人共用 `selectTargetStatus` 第二阶段渲染，2 人也会显示 `dt-transfer-source-locked-*` + `dt-transfer-target-*`。
- [x] 已在 `e2e/dicethrone-simple-start.e2e.ts` 中新增 2 人 `Transfer Status` 在线用例。
- [x] 直接 Playwright 探针已确认 `setupDTOnlineMatch()` 在当前服务环境下可以成功返回房间，不是 helper 完全失效。
- [ ] 现役 Playwright 运行链路里的 `skip` 根因尚未彻底收口。
- [ ] 2 人在线单用例通过与证据截图待补。

### Validation
- `node scripts/infra/vitest-cli-safe.mjs run src/games/dicethrone/ui/__tests__/InteractionOverlay.test.tsx --configLoader native`
- `node --import tsx -` 直接探针 `setupDTOnlineMatch()` 返回成功房间

### Status
- in_progress

## Addendum: 2026-03-25 Dice Throne 4人/2v2 站位移动闭环与规范回填

### Goal
- 在已打通 `targetingRoll` 目标选择链路的基础上，补齐 4 人/2v2 开局前站位移动的最小可用闭环。
- 将本轮实现结果同步回 OpenSpec `tasks.md` 与 plan-with-files 三件套，避免实现进度只停留在代码层。

### Result
- [x] 在领域层新增 `MOVE_SEAT` 命令与 `SEATING_MOVED` 事件，使用“移除玩家后按目标下标插入”的插入式站位模型更新 `seatingOrder`。
- [x] 补齐站位校验：仅允许 `setup` 阶段、仅 4 人 team mode、仅房主操作、开始后锁定、目标下标必须合法、禁止移动到原位。
- [x] 在 `SEATING_MOVED` reducer 中基于新 `seatingOrder` 重建 `teamIdByPlayerId`，确保左右对手与队伍归属随站位同步更新。
- [x] 在选角界面右下区域接入站位面板：默认显示当前顺序，房主可“先选玩家，再点空位”，点已有玩家会给出本地提示，非房主只读。
- [x] 顺手把此前 UI 已调用但领域层未打通的 `PLAYER_UNREADY` 完整接通。
- [x] 同步更新 OpenSpec：已勾选 `1.3`、`1.4`、`1.13`、`2.1`、`2.2`。
- [ ] 手动走查类验证项（`2.4+`）仍未完成，本轮不冒进误勾。

### Validation
- `node D:\gongzuo\webgame\BoardGame\node_modules\typescript\lib\tsc.js --noEmit --pretty false`
- `node scripts/infra/vitest-cli-safe.mjs run src/games/dicethrone/__tests__/flow.test.ts src/games/dicethrone/__tests__/rule-consistency.test.ts src/games/dicethrone/__tests__/boundaryEdgeCases.test.ts --configLoader native`
- `openspec validate add-dicethrone-2v2-team-mode --strict --no-interactive`

### Status
completed
## Addendum: 2026-03-25 Dice Throne 4人/2v2 验证补跑与收尾清理

### Goal
- 复核当前 worktree 中未提交的 Dice Throne 4 人/2v2 改动是否已达到可提交状态。
- 清理 `targetingRoll` 收尾中残留的明显死代码，避免把无效分支带入后续提交。

### Result
- [x] 核对 `src/games/dicethrone/domain/flowHooks.ts`，确认 `targetingRoll` 的 5/6 分支里残留了一段 `if (true) { ... } else { ... }` 的死代码。
- [x] 删除上述死代码，仅保留“目标已由选择交互写回后继续后续攻击流程”的真实路径。
- [x] 重新执行 `node D:\gongzuo\webgame\BoardGame\node_modules\typescript\lib\tsc.js --noEmit --pretty false`，结果无输出。
- [ ] 在当前受限终端内重跑 Vitest 相关回归。

### Validation
- `node D:\gongzuo\webgame\BoardGame\node_modules\typescript\lib\tsc.js --noEmit --pretty false`

### Blocker
- 当前 Codex Windows 受限终端会在 Vitest 启动 worker / esbuild transform 时触发 `spawn EPERM`，默认 forks worker 与 `--pool threads --no-file-parallelism --maxWorkers 1` 两条路径都无法完成测试初始化，因此这轮无法在此环境内补跑 `flow.test.ts` / `rule-consistency.test.ts` / `boundaryEdgeCases.test.ts`。
- Git 也因仓库 owner SID 与当前用户 SID 不同触发 `dubious ownership`；当前用 `git -c safe.directory=D:/gongzuo/webgame/BoardGame-wt-dicethrone-4p-team-mode ...` 绕过，未修改全局配置（`C:/Users/zhuagenbao/.gitconfig` 无写权限）。

### Status
in_progress

## Addendum: 2026-03-25 Dice Throne 4人/2v2 验证 blocker 解除与整套回归

### Goal
确认当前 worktree 中的 Dice Throne 4 人/2v2 改动已经脱离此前误报的 Vitest `spawn EPERM` blocker，并补齐可提交级别的验证结论。

### Result
已重新跑通 4 人/2v2 `targetingRoll` 的 3 个核心回归、`tsc --noEmit`，以及整套 `npm run test:dicethrone`。当前结论是这批改动在本机环境可以正常执行 Vitest，不存在此前记录里的持续性测试阻塞。

### Validation
`node scripts/infra/vitest-cli-safe.mjs run src/games/dicethrone/__tests__/flow.test.ts src/games/dicethrone/__tests__/rule-consistency.test.ts src/games/dicethrone/__tests__/boundaryEdgeCases.test.ts --configLoader native` 通过，结果为 `142 passed`。`node D:\gongzuo\webgame\BoardGame\node_modules\typescript\lib\tsc.js --noEmit --pretty false` 无输出。`npm run test:dicethrone` 通过，结果为 `96 passed file suites`、`1076 passed`、`3 skipped`。

### Status
completed
## Addendum（2026-03-25）：DiceThrone 四人房服务端 / E2E 闭环

> 当前 worktree：`D:\gongzuo\webgame\BoardGame-wt-dicethrone-4p-team-mode`
> 下次继续时优先看这一节，不要先跳回下面历史任务。

### 当前目标
- 收口 DiceThrone 四人 / 2v2 模式中与服务端建房、占座、加入、开局验证相关的实现与文档。
- 维护 OpenSpec `add-dicethrone-2v2-team-mode` 与 `planning-with-files` 三件套的最新状态。

### 本轮已完成
- [x] 重整 `e2e/helpers/dicethrone.ts`，清掉坏正则、乱码导致的语法错误与 `return` 后死代码。
- [x] 重写 `e2e/dicethrone-simple-start.e2e.ts`，补齐 2 人与 4 人简单开局场景。
- [x] 收紧服务端人数校验：有 `playerOptions` 时优先按白名单校验，DiceThrone 不再错误接受 3 人房。
- [x] 抽出 `areAllSeatsOccupied()` 统一 waiting -> playing 判定，并补 `src/server/__tests__/matchOccupancy.test.ts`。
- [x] 跑通 `node D:\gongzuo\webgame\BoardGame\node_modules\typescript\lib\tsc.js --noEmit --pretty false`。
- [x] 跑通 `npm run test:e2e:ci:file -- e2e/dicethrone-simple-start.e2e.ts "Online 4-player room: create claim-seat join and start successfully"`。
- [x] 跑通 `npm run test:e2e:ci -- e2e/dicethrone-simple-start.e2e.ts`。
- [x] 回填 OpenSpec `1.17` / `2.3`，并整理 `tasks.md` 格式。

### 当前判断
- 服务端 4 人房的 `create -> claim-seat(host) -> join(guest1/2/3) -> status=playing` 闭环已被自动化验证覆盖。
- 当前 blocker 已从“E2E helper 语法损坏”转为“剩余 2v2 规则/战斗逻辑项尚未完成”。

### 下一步
- 继续检查并推进 OpenSpec 仍未勾选的 `1.5-1.12`、`1.18`。
- 若要继续收口 UI / 交互链路，优先补 `2.4-2.9` 对应的手动走查或更细的 E2E。

---
## Addendum: 2026-03-26 DiceThrone 4 人 / 2v2 E2E 收口

### Goal
- 收口 OpenSpec `add-dicethrone-2v2-team-mode` 剩余验证项 `2.5-2.9`。
- 以现有 `e2e/dicethrone-simple-start.e2e.ts` 为唯一测试文件补齐 4 人 2v2 的目标交互、顶部三窗、目标面板、同队响应过滤、团队胜负 UI 证据。

### Result
- [x] 在线 4 人顶部三窗链路已通过 E2E 断言，验证 `dt-top-header-1/2/3` 的 `data-team-tone` 与 `data-player-id`。
- [x] `Targeting Roll` 四个分支已通过 E2E 断言：`1/2` 自动锁左敌，`3/4` 自动锁右敌，`5` 由防守队选择，`6` 由进攻方选择。
- [x] 目标面板截图时机已前移到面板可见时，证据截图真实展示 3 个纵向目标项。
- [x] 同队响应过滤改为走稳定的“防守方确认掷骰后”链路，E2E 断言响应队列仅为 `['0']`，不会包含同队玩家 `2`。
- [x] 2v2 主链路已通过 E2E 断言收口到团队胜负 UI，host 端显示 `Victory`，敌方端显示 `Defeat`。
- [x] OpenSpec `2.5-2.9` 已回填为 completed。

### Validation
- `node .\node_modules\typescript\lib\tsc.js --noEmit --pretty false`
- `npm run test:e2e:ci:file -- e2e/dicethrone-simple-start.e2e.ts "Online 4-player 2v2 flow: response queue excludes teammate and defense chain reaches team victory UI"`
- `npm run test:e2e:ci -- e2e/dicethrone-simple-start.e2e.ts`

### Status
- completed

## Addendum: 2026-03-27 DiceThrone 2 人联机 setup 顺序 / 直连游戏服修复

### Goal
- 把 2 人 `Transfer Status` 在线用例从“共享 UI 已改，但 Playwright 仍走 skip”推进到真实在线通过。
- 在不新建测试文件的前提下，补回 2 人第二阶段锁定来源卡的在线证据，并确认 helper 修复没有带坏 4 人主链路。

### Result
- [x] 修正 `setupDTOnlineMatchWithPlayers()` 的联机时序：host 不再在房间未满员时提前等待选角页，而是等所有玩家都进入 match 页后再统一等待角色选择 UI。
- [x] `initContext()` 已支持显式 `gameServerBaseURL` override，DiceThrone 在线 helper 创建的浏览器上下文现在会把 `__FORCE_GAME_SERVER_URL__` 正确注入到 `20000`，不再出现 API 走 `20000`、浏览器页却连回 `18000` 的分叉。
- [x] `/test/*` 状态注入 helper 已改为优先跟随当前页面实际生效的 `__FORCE_GAME_SERVER_URL__`，避免 `get-state/inject-state` 继续打到错误端口。
- [x] 2 人 `Transfer Status` 用例已补齐真实双阶段：先点第一阶段 `dt-status-effect-1-crit`，再断言第二阶段 `dt-transfer-source-locked-1` 与 `dt-transfer-target-0`。
- [x] 2 人第二阶段在线截图已补充到证据文档。
- [x] 已跑通显式 `6174/20000/21000` 环境下的 `dicethrone-simple-start.e2e.ts` 全文件回归，结果 `9 passed`。

### Validation
- `node .\node_modules\typescript\lib\tsc.js --noEmit --pretty false`
- `$env:PW_USE_DEV_SERVERS='true'; $env:PW_START_SERVERS='false'; $env:PW_HAS_EXPLICIT_TARGET='true'; $env:NODE_OPTIONS='--max-old-space-size=4096'; $env:VITE_DEV_PORT='6174'; $env:GAME_SERVER_PORT='20000'; $env:API_SERVER_PORT='21000'; node .\node_modules\@playwright\test\cli.js test e2e/dicethrone-simple-start.e2e.ts --grep "Online 2-player transfer token: transfer phase keeps locked source card and target card"`
- `$env:PW_USE_DEV_SERVERS='true'; $env:PW_START_SERVERS='false'; $env:PW_HAS_EXPLICIT_TARGET='true'; $env:NODE_OPTIONS='--max-old-space-size=4096'; $env:VITE_DEV_PORT='6174'; $env:GAME_SERVER_PORT='20000'; $env:API_SERVER_PORT='21000'; node .\node_modules\@playwright\test\cli.js test e2e/dicethrone-simple-start.e2e.ts --grep "Online 4-player transfer token: enemy token can be transferred to ally with stable target metadata"`
- `$env:PW_USE_DEV_SERVERS='true'; $env:PW_START_SERVERS='false'; $env:PW_HAS_EXPLICIT_TARGET='true'; $env:NODE_OPTIONS='--max-old-space-size=4096'; $env:VITE_DEV_PORT='6174'; $env:GAME_SERVER_PORT='20000'; $env:API_SERVER_PORT='21000'; node .\node_modules\@playwright\test\cli.js test e2e/dicethrone-simple-start.e2e.ts`

### Status
- completed

## Addendum: 2026-03-27 DiceThrone remove-status 在线证据补齐

### Goal
- 把 `remove-status-1` 与 `remove-all-status` 从“已有规则层/组件层覆盖”推进到真实 4 人在线证据。
- 用默认 `npm run test:e2e:ci:file -- e2e/dicethrone-simple-start.e2e.ts` 口径证明 `dicethrone-simple-start.e2e.ts` 已扩展为完整的 11 条在线回归。

### Result
- [x] `remove-status-1` 用例已在 4 人在线场景中断言敌方 `Crit` 被清掉，且目标页权威态同步追平。
- [x] `remove-all-status` 用例已在 4 人在线场景中断言空目标禁用、敌方 `burn/crit` 被整组清空，且目标页权威态同步追平。
- [x] 证据文档已补入 `08-four-player-remove-single-status-selection.png` 与 `09-four-player-remove-all-status-selection.png`。
- [x] 默认整文件脚本已复跑为 `11 passed`，当前 `dicethrone-simple-start.e2e.ts` 覆盖 2 人 / 4 人 / 2v2 / 玩家目标交互主链路。

### Validation
- `node .\node_modules\typescript\lib\tsc.js --noEmit --pretty false`
- `npm run test:e2e:ci:file -- e2e/dicethrone-simple-start.e2e.ts`

### Status
- completed

## Addendum: 2026-03-27 DiceThrone 玩家目标交互 Batch 1 spec 纠偏

### Goal
- 把 `update-dicethrone-4p-player-target-interactions` 的 spec 从“单一总括 requirement”纠正为真实的 Batch 1 requirement 集，避免把本轮范围误读成“所有多人玩家目标交互已全量审计”。
- 将 `Vengeance II` 这轮共享攻击流程修复与 4 人在线证据正式纳入 OpenSpec 与三件套。

### Result
- [x] `spec.md` 已拆成 4 个 Batch 1 requirement：任意玩家授 token、任意玩家移除状态、状态 / 可移除 token 转移、无单一敌方目标的无伤害技能流程兼容。
- [x] `tasks.md` 已回填 Batch 1 的真实实现与验证边界，明确纳入 `Transfer Status`、`Consecrate`、`Vengeance II`、`remove-status-1`、`remove-all-status`。
- [x] `evidence/dicethrone-simple-start-e2e-test.md` 已补入 4 人 `Vengeance II` 截图与分析，并将默认整文件覆盖更新为 12 条在线用例。
- [x] `findings.md` 已记录用户指出的 spec 边界问题，以及 `Vengeance II` 根因位于共享攻击流程而非单卡脚本。
- [x] 已重新执行 OpenSpec / 规则回归 / 简单开局整文件 E2E，最终结果分别为 `valid`、`31 passed`、`12 passed`。
- [x] 已修复当前 worktree 残缺的 `node_modules` 入口文件问题；`typescript` / `vitest` / `dotenv` / `playwright` 相关验证脚本恢复可执行。

### Validation
- `openspec validate update-dicethrone-4p-player-target-interactions --strict --no-interactive`
- `node scripts/infra/vitest-cli-safe.mjs run src/games/dicethrone/__tests__/rule-consistency.test.ts --configLoader native`
- `npm run test:e2e:ci:file -- e2e/dicethrone-simple-start.e2e.ts`

### Status
- completed

## Addendum: 2026-03-28 DiceThrone Batch 1 最终复核收口

### Goal
- 把 `update-dicethrone-4p-player-target-interactions` 从“文档与代码都已写完”推进到“当前 worktree 下验证命令也真实可执行且全绿”。
- 收口 `Consecrate` 串跑时 ally 页权威态慢半拍导致的最后一个 E2E 抢跑问题。

### Result
- [x] 当前 worktree 的依赖树已恢复到可执行状态，`typescript` / `vitest` / `dotenv` / `playwright` 相关入口不再缺失。
- [x] `scripts/infra/vitest-cli-safe.mjs` 已兼容新版 Vitest 包结构，规则回归命令恢复可执行。
- [x] `Consecrate` 用例已补齐 ally 页 token 追平等待，串跑时不再因多页广播慢半拍而误报失败。
- [x] 已重新执行 `tsc`、OpenSpec、规则回归与 `simple-start` 整文件 E2E，最终结果分别为：无输出、`valid`、`31 passed`、`12 passed`。

### Validation
- `node .\node_modules\typescript\lib\tsc.js --noEmit --pretty false`
- `openspec validate update-dicethrone-4p-player-target-interactions --strict --no-interactive`
- `node scripts/infra/vitest-cli-safe.mjs run src/games/dicethrone/__tests__/rule-consistency.test.ts --configLoader native`
- `npm run test:e2e:ci:file -- e2e/dicethrone-simple-start.e2e.ts`

### Status
- completed

## Addendum: 2026-03-28 DiceThrone simple-start 主回归 E2E 基础设施收敛

### Goal
- 沿用户指定的“1”继续处理 `simple-start` 这份现役主回归 E2E 的基础设施抖动，而不是继续扩展新功能或新卡牌覆盖。
- 将本轮 helper 修复与整文件复跑结果回填到三件套，避免后续又把 `simple-start` 误读成“新角色”或“新增业务链路”。

### Result
- [x] 已明确 `e2e/dicethrone-simple-start.e2e.ts` 的定位：它是王权骰铸当前在用的主回归 E2E 文件，集中承载开局、2v2、多人目标交互等现役在线链路。
- [x] `ensureGameServerAvailable()` 已改为轮询 `GET /games`，不再用“创建测试房间”当探针；超时从 `5000ms` 提高到 `15000ms`。
- [x] `createDTRoomViaAPI`、`claimDTSeatViaAPI`、`joinDTMatchViaAPI` 已补入瞬时网络重试，覆盖 `ECONNREFUSED`、`ECONNRESET`、`ETIMEDOUT`、`socket hang up`、`fetch failed` 以及 `408/425/429/5xx`。
- [x] setup 重试与失败信息已写入 `temp/dicethrone-setup-debug.log`，后续若再出现 `skip` 可直接区分是房间链路抖动还是 runner / Vite 启动层异常。
- [x] 默认脚本口径下已重新执行 `simple-start` 整文件回归，结果恢复为 `12 passed`，说明本轮收敛已把主回归重新拉回稳定全绿。

### Validation
- `npm run test:e2e:cleanup`
- `npm run test:e2e:ci:file -- e2e/dicethrone-simple-start.e2e.ts`

### Status
- completed
