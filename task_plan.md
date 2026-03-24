# Task Plan: BoardGame 多线并行调查 / 修复 / 收口

> 当前根目录三件套已切换为 **2026-03-22 多线任务恢复入口**。下次开新会话时，先按本文件的“当前主任务 / 并行子线 / 下一步”继续，不要被后面的历史 Addendum 标题误导。
> 术语约束：当用户说 **plan** 时，默认指的就是本文件 `task_plan.md`；`findings.md` / `progress.md` 是配套记录，不是第二份 plan；`temp/*plan*` 只算临时材料。

## Goal
- 收口并修复当前 BoardGame 多线问题：线上静态资源 `text/html` 错配、房主被踢/房间被删异常、feedback 未关闭项、E2E 迁移推进、POD 审计/恢复文档核对。
- 维持“本地执行 + guarded task + 并行 Codex”工作方式；用户新开会话后可直接续跑。
- 以最小、可验证、可分批提交的方式推进，不把本地验证误报成远端部署完成。

## Current Phase
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
