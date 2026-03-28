# Findings: BoardGame 多线并行调查 / 修复 / 收口

## 当前主任务（2026-03-22）
- 2026-03-26 新确认：Dice Throne 4人 / 2v2 的 `targetingRoll` 已不再在攻击发起时预写 `defenderId`，目标解析契约已经切换为“先进 `targetingRoll`，后写回 defender”。
- `FlowSystem` 的 `onPhaseEnter` 读取的是 phase 切换后的 `nextState`，但看不到 `onPhaseExit` 里刚产生且尚未 reduce 的领域事件；因此 2v2 在 `targetingRoll` 退出时如果才写回 defender，就会漏掉 `defensiveRoll` 的唯一防御技能自动选择。
- 最小正确修复不是回退到旧的“预写 defender”，而是在 `targetingRoll` exit 且 defender 已解析、攻击可防御时，提前补发唯一防御技能的 `ABILITY_ACTIVATED`，让后续 `ROLL_DICE` 校验直接成立。
- 旧的 4 人模式卡牌目标回归用例依赖了“只要进入战斗就已有 defenderId”的过时假设；在新契约下，测试必须先真实跑完 `targetingRoll -> defensiveRoll`，再断言 `executeCardCommand()` 的对手目标命中当前战斗对手。
- 当前已从单点问题切换为 **多线并行收口**：
  1. 线上静态资源旧 chunk 命中 SPA fallback，返回 `200 text/html`
  2. 房主未点销毁却被踢出并提示“房间不存在或已被删除”
  3. feedback 主线只跟未关闭 / 待处理项
  4. E2E 迁移主线整理下一批
  5. 核对项目内 progress / plan / evidence 文档，作为跨会话恢复入口
- 用户已明确：以后说 **plan**，默认指的是 `planning-with-files` 这套规划工作方式 / 效果。
- 用户的硬约束是：**Plan with Files 产出的正式计划文档只能放在一处**；当前唯一允许位置是仓库根目录 `task_plan.md`。
- `findings.md` / `progress.md` 只做配套记录；`temp/*plan*` 一律不再作为当前正式计划入口。

## 已知事实
- 线上静态资源故障当前最强信号不是 Host/容器整体宕机，而是旧 `/assets/*.js` 请求被错误回退成 `index.html`，表现为 `200 OK` + `Content-Type: text/html`，进而触发 `Failed to load module script` / `MIME type "text/html"`。
- 本地已沿 `apps/api/src/main.ts` 确认过一个修复方向：把 `/assets` 排除出 SPA fallback；但是否最终落盘、验证、提交、部署，仍需下一会话复核。
- `server.ts` 已先修过一个显式错误：重复 owner 清理链路里的 logger 调用曾报 `gameLogger.info is not a function`。
- “房主被踢 / 房间被删”仍未闭环，需同时查服务端房间生命周期和前端状态误判链。
- 方案 A 已确定为本次升级自恢复策略：**仅非对局页**在 chunk / dynamic import 失败时自动刷新一次；`MatchRoom` 对局页不做 silent auto reload。
- feedback 后续默认只跟**未关闭 / 待处理**。
- 用户反馈：`dicethrone` 中“攻击修正只要不使用攻击就一直在”。
- 当前任务目标是“检查一下”，优先确认行为是否符合规则，再决定是否需要修复。
- 本任务涉及游戏机制与状态链路，需要同时核对规则文档与实现。

## 当前并行任务与状态
- `codex-feedback-open-tracker`：已启动 guarded task，目标产物 `temp/open-feedback-tracker.md`。
- `codex-e2e-migration`：已启动 guarded task，目标产物 `temp/e2e-next-batch-plan.md`。
- `codex-find-planning-with-files`：原用于定位 plan 技能；用户后续直接给出 GitHub 地址后已人工安装技能，本任务可视为完成/失效。

## 已读规范 / 文档
- `docs/ai-rules/engine-systems.md`
- `src/games/dicethrone/rule/王权骰铸规则.md`

## 新发现（2026-03-10）
- 规则文档 `src/games/dicethrone/rule/王权骰铸规则.md` 第 7.2 节明确写到：
  - 攻击修正“只能用于攻击”。
  - 打出时机是“防御能力启动前或后”。
- 这意味着攻击修正必须依附于一个已存在的攻击，不能在没有 `pendingAttack` 的情况下预先排队到未来攻击。
- 代码调用链现状：
  - `checkPlayCard()` / `isCardPlayableInResponseWindow()` 目前只按 `timing=roll` 和 `playCondition` 做通用校验，没有额外约束 `card.isAttackModifier` 必须绑定当前攻击。
  - `executeCardCommand()` 对卡牌效果统一使用 `attackerId = actingPlayerId`、`defenderId = opponentId` 构造上下文，没有显式声明“当前攻击上下文”。
  - `handleBonusDamageAdded()` 在没有 `pendingAttack` 时，会把伤害累计到 `players[playerId].pendingBonusDamage`，等待未来 `ATTACK_INITIATED` 时再转移到 `pendingAttack.bonusDamage`。
- 因此存在一条真实的错误链路：
  - 攻击修正卡可在“没有当前攻击”的情况下被打出；
  - 其加伤会被写入 `pendingBonusDamage`；
  - 只要后续不发起攻击，它就会一直保留到 `main2` 或 `TURN_CHANGED`；
  - 同时 `useActiveModifiers()` 只把 `ATTACK_RESOLVED` 当成重置边界，导致 UI 指示器在“放弃攻击/进入 main2”后也可能继续显示。

## 待验证点
- “攻击修正”在规则上是否明确限定为“下一次攻击”或“本回合”。
- 代码里攻击修正的存储位置、写入时机、消费时机、清理时机。
- 是否存在阶段推进、回合结束、放弃攻击等路径没有清理状态。

## 调用链检查模板
- 写入链：来源效果 → 命令/事件 → reducer/state
- 消费链：攻击声明/结算 → 读取修正 → 计算伤害
- 清理链：攻击后 / 回合结束 / 阶段切换 / 取消攻击

## 结论
- 初步结论：这是实现缺陷，不是规则如此。
- 最小正确修复应同时覆盖：
  - 出牌校验/UI 可出牌判断：攻击修正必须绑定当前 `pendingAttack`，且只能由当前攻击方使用；
  - UI 指示器清理：在 `ATTACK_RESOLVED` 之外，还要在攻击被放弃并进入 `main2` 时清空。

---

## Addendum（2026-03-10）：传输层状态注入 P1 结论

### `src/engine/transport/react.tsx`
- 已确认联机 `GameProvider` 的 `StateInjector` 是只读注册：
  - 读取：允许
  - 写入：直接抛错，提示改走服务端 `/test` API
- 结论：客户端不再能把 `playerView` 过滤后的玩家视图整体写回权威状态。

### `src/engine/transport/server.ts` / `src/server/routes/test.ts`
- `/game` socket 侧仍然不暴露 `test:injectState`，已有传输层单测覆盖。
- 新增 `validateTestAccess()`，让 `/test/*` 路由复用 metadata + `authenticate` 做座位级校验。
- `/test/*` 现在要求：
  - `X-Test-Token`
  - `X-Test-Player-Id`
  - `X-Test-Player-Credentials`
- `restore-state` 现在会在注入前再次跑 `validateMatchState`，防止无效/跨对局快照直接写回权威状态。
- 结论：服务端测试注入链路的鉴权缺口已补上；review 里旧的 `socketIndex` 描述对当前实现已不再适用，因为当前注入入口是 `/test` HTTP 路由，不是 `/game` socket 事件。

### 本轮修改文件
- `src/engine/transport/server.ts`
- `src/server/routes/test.ts`
- `e2e/helpers/state-injection.ts`
- `src/server/routes/__tests__/test.routes.test.ts`
- `docs/automated-testing.md`

### 本轮验证
- `npx vitest run src/server/routes/__tests__/test.routes.test.ts src/engine/transport/__tests__/server.test.ts src/engine/transport/__tests__/server-injectState.test.ts --reporter=dot --silent --maxWorkers=1` → `27 passed`
- `npm run typecheck` → 通过

### 后续可选跟进
- 仍有一些历史联机 E2E 直接在在线对局页调用 `window.__BG_TEST_HARNESS__.state.patch()`。
- 现在联机 `GameProvider` 已明确禁写，这些历史测试后续应逐步迁移到 `e2e/helpers/state-injection.ts`（服务端 `/test/*` 注入）。
## 2026-03-11 服务器启动缓慢排查
- `npm run dev` 启动前会先执行 `predev`：`clean_ports.js` + `generate_game_manifests.js` + `generate-slim-registry.mjs` + `docker compose up -d mongodb`。
- 前端不会立刻启动，而是先执行 `scripts/infra/wait_for_ports.js`，默认等待 `18000`（游戏服）和 `18001`（API）两个端口都 ready 后才启动 Vite。
- 因此用户体感上的“启动慢”是串行叠加：前置脚本 + 后端服务冷启动 + 前端等待。
- 实测 `predev` 前置链：
  - `clean_ports` 首次约 `8.02s`（有残留进程时）；空跑第二次约 `1.07s`
  - `generate_game_manifests` 约 `0.51s`
  - `generate-slim-registry.mjs` 约 `3.04s`
  - `docker compose up -d mongodb` 约 `0.72s`
- `generate-slim-registry.mjs` 每次会扫描 `src/` 下约 `1273` 个 `.ts/.tsx` 文件，并读取约 `3.2MB` 的音频全量 registry，因此稳定占用约 `2.3s~3.0s`。
- 游戏服 `npx tsx server.ts` 在热缓存后约 `3.17s` 可打开 `18000`，但一次干净冷启动测到约 `93.13s`；结合临时导入测量（`manifest.server.generated` 约 `644ms`、`ugcRegistration` 约 `471ms`、`server/db` 约 `12ms`），更像是 `tsx/esbuild` 首次冷缓存转译成本，而不是单个业务模块长期稳定过慢。
- `server.ts` 在模块顶层会先执行 `await connectDB()` 与 `await buildServerEngines()`；其中 `buildServerEngines()` 会调用 `buildUgcServerGames()` 访问 Mongo，因此游戏服监听端口前一定会完成数据库连接与引擎构建。
- API 服 `npx tsx --tsconfig apps/api/tsconfig.json apps/api/src/main.ts` 是当前最稳定、最明显的瓶颈：干净环境下多次在 `60s~120s` 内都无法打开 `18001`。
- 用 `tsx` 临时拆分 API 导入链后，关键耗时为：
  - `@nestjs/core` 约 `469ms`
  - `@sentry/nestjs` 约 `83342ms`
  - `AppModule` 约 `51041ms`
- 结论：API 冷启动的核心瓶颈不是 `app.listen()` 或端口绑定，而是 `tsx` 运行期对 `@sentry/nestjs` 与整个 `AppModule` 模块图的导入/转译。
- 由于前端 `dev:frontend:wait` 必须等 `18000` 和 `18001` 都 ready，API 服的超慢启动会直接放大成“整个开发服务器启动很慢”。

## 2026-03-11 Dice Throne 攻击修正残留问题
- 规则依据：`src/games/dicethrone/rule/王权骰铸规则.md` 第 7.2 节明确“攻击修正只能用于攻击”，且时机是防御能力启动前或后，因此不能在没有当前攻击时预存到未来攻击。
- 根因 1：`src/games/dicethrone/domain/rules.ts` 之前允许攻击修正卡在无 `pendingAttack` 时通过 `checkPlayCard()` / `isCardPlayableInResponseWindow()` 校验。
- 根因 2：`src/games/dicethrone/hooks/useActiveModifiers.ts` 之前只把 `ATTACK_RESOLVED` 当成清理边界，导致攻击被放弃后进 `main2` 或直接切回合时，旧修正指示仍可继续显示。
- 修复方案：
  - 规则层增加 `isAttackModifierPlayableForCurrentAttack(...)`，要求攻击修正卡必须绑定当前 `pendingAttack`，且 `playerId` 必须等于 `pendingAttack.attackerId`。
  - UI Hook 增加重置边界：`ATTACK_RESOLVED`、`TURN_CHANGED`、`FLOW_EVENTS.PHASE_CHANGED -> main2`。
  - 将规则边界断言迁入 `src/games/dicethrone/__tests__/red-hot-meteor-integration.test.ts`，避免放在被默认排除的 `audit` 文件或启动超时的重测试文件里。

### 本轮验证
- `npx vitest run src/games/dicethrone/__tests__/red-hot-meteor-integration.test.ts src/games/dicethrone/__tests__/active-modifiers-undo.test.ts --maxWorkers=1` → `16 passed`
- `npm run typecheck` → 通过
- Git 历史显示：`package.json` 的 `dev:frontend:wait` 是在 2026-03-09（commit `60e16b72`）加入的；它让前端必须等待后端端口 ready 才启动，因此把后端慢启动从“后台慢一点”放大成“整个开发环境看起来没起来”。
- 同时，`apps/api/src/main.ts` 与 `apps/api/src/app.module.ts` 当前启动主链的 blame 基本都停留在 2026-03-04（commit `9c9dd78d`），没有看到同一时期内大规模新增启动逻辑；这说明“之前正常、现在变慢”更像是启动编排/本地环境问题，而不是最近业务代码突然在 API 启动期多做了大量工作。
- 当前本地 `.env` 含有非空 `SENTRY_DSN`，而 `.env.example` 默认是空值；因此你本机会走到 Sentry 初始化路径，这也是“别人/以前不慢、现在你这里慢”的一个强候选差异。
- 当前仓库没有 `.nvmrc` / `.node-version` 等 Node 版本钉死文件，当前运行时是 Node `v24.1.0`。结合前面对 `tsx`/ESM 冷启动路径的异常耗时观察，可以合理推断：本地 Node/工具链变化也是导致体感回归的重要变量。
- 在不改业务逻辑的前提下，最安全的 API 启动优化是：移除顶层 `@sentry/nestjs` 导入，改为端口监听成功后后台惰性初始化；这样不影响功能，只是把错误采集从关键启动路径移到后台。
- 在不改业务逻辑的前提下，最安全的 game-server 启动优化是：把启动期 Mongo 清理从监听前改为监听后后台执行；房间清理仍会发生，但不再阻塞 `18000` ready。
- 真实验证结果：
  - 单独 `npm run dev:api`：`18001` 约 `3.42s` ready。
  - 单独 `npm run dev:game`：`18000` 约 `7.33s` ready。
  - 旧的并行 `dev`（优化前测得）：`18000` 约 `29.75s`，`18001` 约 `52.24s`，`5173` 约 `68.08s`。
  - 新的分阶段 `dev`（优化后测得）：`18001` 约 `7.08s`，`18000` 约 `9.18s`，`5173` 约 `10.24s`。
- 这说明当前最大的实际根因之一是：**两个 `tsx` 后端在旧 `dev` 脚本里并行冷启动，互相争抢 CPU / 磁盘 / 转译缓存，导致总 ready 时间远大于单独启动时间之和**。分阶段编排后，总启动时间显著下降。

---

## 2026-03-11 API / game-server 启动缓慢排查

### 关键事实
- `dev:frontend:wait` 会等待 `18000` 与 `18001` 都 ready，因此任一后端慢都会放大成“整套 dev 很慢”。
- API 端口日志显示：`bootstrap_ms≈212ms`，说明 Nest 应用真正启动很快，慢点主要在 Node/`tsx` 冷编译与模块加载。
- game-server 端口日志显示：`bootstrap_ms≈4ms`，说明监听后的房间清理并不是主要瓶颈；主要慢点同样在监听前的运行时冷启动与模块初始化。
- game-server 在文件顶层就有 `await connectDB()` 与 `await buildServerEngines()`；这是它对“第一次冷启动”更敏感的重要原因。

### 本次已落地的低风险优化
- `apps/api/src/main.ts`
  - 顶层 Sentry 静态导入改为后台惰性初始化
  - 增加结构化启动耗时日志
- `server.ts`
  - 启动期房间清理改为监听成功后后台执行
  - 增加结构化启动耗时日志
- `scripts/infra/dev-orchestrator.js`
  - 默认 `dev` 改为分阶段启动
- `package.json` / `nodemon.json`
  - 显式使用本地 CLI，避免全局安装与 PATH 差异

### 实测结果
- `npm run dev:api`
  - 冷启动一次：约 `103.84s`
  - 热启动：约 `4.20s ~ 5.82s`
- `npm run dev:game`
  - 热启动：约 `3.68s ~ 4.97s`
- `npm run dev`
  - 热启动：约 `12.41s`
- `npm run dev:parallel`
  - 热启动：约 `11.48s`

### 结论
- “之前正常、现在变慢”的高概率原因是多因素叠加：
### ???????2026-03-11?
- `nodemon` ????????????????? fallback / debug watcher?????????????????
- Node ?????????????????????????????????????? `24.1.0`?
- ?? smoke test ????**???? + ?? bundle ??**??????????????? dev ??????? watcher ???????
- `npm run smoke:startup` ?????? `game-server` ?? cold run ??? `~41.72s`??????? `src/games/smashup/domain/index.ts` ???????? `src/games/smashup/data/englishAtlasMap.json` ? duplicate key warning?
- ?? `src/games/smashup/domain/index.ts` ?????????????????????????????/??????????????????????? unrelated ???


### 2026-03-11?`englishAtlasMap.json` ?? key ??
- ???? 1 ??`base_great_library` ? `src/games/smashup/data/englishAtlasMap.json` ??? 2 ??
- ?????????? `atlasId: tts_atlas_a9e2eeadeb`?`index: 10`??????????????????????? bundler warning?
- ??????
  - `src/games/smashup/ui/SmashUpCardRenderer.tsx` ????? `defId` / `defId_pod` ????????
  - `src/games/smashup/ui/cardAtlas.ts` ???????? `atlasId` ???????
- ??????????????????? `englishAtlasMap.json` ?????????????????????????
- ?????
  - ????? `6ea1f9f0` ???
  - ???? `10b99ae6` ????????????????? `base_pirate_cove` / `base_wizard_academy` ?????????????? `base_great_library` ???????
- ????????????? + ???????????????????????? warning?????????????????? bug?

### 2026-03-11：重复 key 删除结果
- 已删除 `src/games/smashup/data/englishAtlasMap.json` 中后半段重复的 `base_great_library`
- 删除后重新扫描，重复 key 数量为 `0`
- 直接执行 esbuild 打包 `server.ts`，未再出现 `duplicate-object-key` / `base_great_library` warning
- 当前终端环境会拦截 Node 内部 `child_process.spawn`，因此这里不用 `smoke:startup` 作为最终验证，而改用直接 bundle 验证

## 2026-03-25 Dice Throne 4 人/2v2 targetingRoll 收尾发现

- 根因不是 `customId` 或 payload 丢失，而是目标选择完成后缺少稳定的“已完成”标记，同时 `src/games/dicethrone/domain/flowHooks.ts` 里还残留了一段旧的 5/6 分支，会再次发出 `CHOICE_REQUESTED`。
- 仅把 `targetingSelectionPending` 改回 `false` 不足以阻止同一条命令链里的重复选择；需要一个能跨 reducer、system、effect 共享的幂等信号，因此新增 `pendingAttack.targetingSelectionResolved`。
- 4 人/2v2 模式下，`targetingRoll` 掷出 `5/6` 的正确行为是：玩家完成目标选择后应直接进入 `defensiveRoll`，不需要再手动 `ADVANCE_PHASE`。
- 直接检查 flow hook 事件链时，选择目标后应看到 `SYS_INTERACTION_RESOLVED`、`CHOICE_RESOLVED(select-target:1)`、`ATTACK_PRE_DEFENSE_RESOLVED`、`SYS_PHASE_CHANGED { from: 'targetingRoll', to: 'defensiveRoll' }`，说明推进链路本来就应该在响应命令内完成。
- `src/games/dicethrone/__tests__/flow.test.ts` 的断言口径已同步为“目标选择后自动推进”，避免后续又把手动 `ADVANCE_PHASE` 误当成正确行为。

## 2026-03-25 Dice Throne 4人/2v2 targetingRoll 收尾发现（格式修正）

本次卡在 `targetingRoll` 的根因不是 `customId` 或 payload 丢失，而是目标选择完成后缺少稳定的“已完成”标记，同时 `src/games/dicethrone/domain/flowHooks.ts` 里还残留了一段旧的 5/6 分支，会再次发出 `CHOICE_REQUESTED`。

仅把 `targetingSelectionPending` 改回 `false` 不足以阻止同一条命令链里的重复选择，因此需要一个能跨 reducer、system、effect 共享的幂等信号；这也是新增 `pendingAttack.targetingSelectionResolved` 的原因。

4 人/2v2 模式下，`targetingRoll` 掷出 `5/6` 的正确行为是：玩家完成目标选择后直接进入 `defensiveRoll`，不需要再手动 `ADVANCE_PHASE`。`flow.test.ts` 的断言口径也已与此对齐。
## 2026-03-25 Dice Throne 4人/2v2 验证补跑发现

- 当前受限终端可以完成 `tsc`，但无法在 Vitest 初始化阶段启动 worker / esbuild service；默认 forks worker 报 `spawn EPERM`，改成 `--pool threads --no-file-parallelism --maxWorkers 1` 后，仍在 `vite:esbuild` 处理 `vitest.setup.ts` 时触发同样的 `spawn EPERM`。
- 这说明当前 blocker 是终端对子进程 / esbuild service 的限制，不是这批 DiceThrone 4 人改动自身的编译错误；至少静态类型检查仍为绿色。
- `src/games/dicethrone/domain/flowHooks.ts` 的 `targetingRoll` 5/6 分支里残留了一个 `if (true) { ... } else { ... }` 的死代码块，本轮已清理，只保留真实执行路径。
- 当前 Git 命令也受 `dubious ownership` 影响，但可通过 `git -c safe.directory=D:/gongzuo/webgame/BoardGame-wt-dicethrone-4p-team-mode ...` 在单命令级绕过；由于 `C:/Users/zhuagenbao/.gitconfig` 无写权限，不能持久写入 `safe.directory`。

## 2026-03-25 Dice Throne 4人/2v2 站位移动闭环发现

- 4 人 team mode 的站位调整不需要新增“空座位槽”状态；对当前 `seatingOrder` 采用“移除玩家后按目标下标重新插入”的模型，就能直接支撑“先点玩家，再点空位”的 UI 交互。
- 站位调整真正需要守住的边界是：`setup` 阶段、4 人 team mode、房主权限、开局后锁定、目标下标合法、禁止移动到原位。把这些统一放进领域校验后，前端只负责交互引导，不需要各处散落判断。
- `SEATING_MOVED` 事件直接携带完整 `seatingOrder` 比“只传 source/target 再让 reducer 重算”更稳，因为 reducer 可以据此一次性重建 `teamIdByPlayerId`，避免座位、队伍、左右对手三套派生关系短暂失步。
- 这轮最小 UI 接法不是重做整个选角页，而是在右下既有红框区加一个站位面板。这样既满足 spec，也降低了与并发改动冲突的概率。
- `PLAYER_UNREADY` 此前已经在 `Board.tsx` 被 UI 调用，但 `resolveMoves`、领域执行、事件与 reducer 没有全链路接通；这属于典型的“入口已存在、领域没闭环”的历史缺口，这轮已顺手补齐。
## Addendum（2026-03-25）：DiceThrone 四人房服务端 / E2E 闭环发现

- 当前真正的阻塞不是业务逻辑，而是 `e2e/helpers/dicethrone.ts` 曾被坏正则和不可达旧代码污染，导致 Playwright 在解析阶段直接报 `Unterminated regular expression`。
- `initContext()` 已统一注入英文 locale，所以 `waitForCharacterSelection()` 只匹配 `Select Your Hero` 即可稳定工作。
- 4 人联机 setup 采用 `create -> claim-seat(host) -> join(guest1/2/3)` 即可覆盖本次服务端关键链路；不需要为每个 guest 再走一次 `claim-seat` 才能验证 4 座 metadata 与 `playing` 状态流转。
- E2E 断言确认：`GET /games/dicethrone/:matchId` 在 4 个 seat 全部占用后返回 `players=[0,1,2,3]`、每个 seat 都带 `name`、`status === 'playing'`。
- 实际截图确认 4 人房顶部存在 3 个他人窗口，且已进入主阶段并显示投骰区，说明不是“接口绿了但 UI 还卡在准备页”。
- 新发现的服务端缺口是：`/games/:name/create` 原本只按 `minPlayers/maxPlayers` 校验，DiceThrone 会错误放行 3 人房。现在已改为优先按 manifest `playerOptions` 白名单校验，`[2,4]` 不再接受 `3`。
- 证据文档已新增：`evidence/dicethrone-simple-start-e2e-test.md`。

---

## 2026-03-26 Dice Throne 4人/2v2 回合顺序与 OpenSpec 审计发现

- `getPlayerOrder/getNextPlayerId` 之前仍按 `seatingOrder` 顺时针轮转，这与 OpenSpec 要求的“起始玩家所在队连走两手，再切到敌队两手”不一致；`flow.test.ts` 里原先期待 `0→1→2→3` 其实把旧错误行为固化成了测试。
- 2v2 回合顺序和 4 人 UI 排布不能共用同一个顺序函数。`Board.tsx` 顶部三窗如果继续依赖 `getPlayerOrder`，修正 turn order 后会把观察顺序也一起改掉，因此要把 UI 继续绑定到 `getSeatingOrder`。
- 现有实现与测试已足够支撑这些 OpenSpec 项为已完成：`1.2`（队伍状态模型）、`1.6/1.7`（Targeting Roll 与目标选择）、`1.9`（共享体力伤害/治疗/上限）、`1.10`（同队响应过滤与队友干预边界）、`1.11`（队伍胜负判定）、`1.12`（`playerView` 与 4 人 Board 映射）、`1.18`（规则/边界/服务端/E2E 覆盖）。
- 本轮补上 `startingPlayerId='1'` 的 turn-order 规则测试后，可以确认 2v2 顺序不是写死在默认 host=0 场景上。
- 4 人选角页的站位面板已可以直接被在线 E2E 稳定选择：使用 `2v2 Seating` 标题 + `Seat n` / `Empty` / `Team A/B` 文案即可覆盖“默认站位展示 → 点击空位移动 → 点击已占位拒绝”这一整条真实 UI 链路，不必额外改组件结构或新增测试专用入口。

## 2026-03-26 DiceThrone 4 人 / 2v2 E2E 收口发现

- 旧的“进攻方确认掷骰后只应出现敌方响应者”假设不稳定，根因不是在线注入接口，而是 `CONFIRM_ROLL` 在 `offensiveRoll` 下会使用 `getContextualOpponentId()` 选择当前语境对手；在 4 人座位顺序 `0,1,2,3` 下，玩家 `0` 的默认语境对手优先落到左侧敌人 `3`，不是 `1`。
- 因此要稳定验证“队友不响应队友”，应走“防守方确认掷骰后”的链路：当 `pendingAttack.attackerId='0'`、`defenderId='3'` 时，防守方 `3` 确认掷骰后，语境对手稳定是 `0`，此时同队玩家 `2` 会被正确排除在响应队列外。
- 在线 `/test/get-state` 返回的是权威状态，但响应窗口是否打开仍严格依赖真实前置条件；仅补 `rollCount` 和手牌不够，还必须补齐可操作骰子，否则 `requireDiceExists` 会把响应卡全部过滤掉。
- 目标面板证据截图必须在面板可见时截取；若等点击后再截，虽然断言仍能通过，但截图会落在后续防守阶段，不能直接作为 `2.7` 的可视证据。
- 现有 `e2e/dicethrone-simple-start.e2e.ts` 已足够覆盖 OpenSpec `2.5-2.9`，不需要再新建 E2E 文件；关键是把状态构造函数改成“显式稳定场景”，避免依赖在线对局里的动态抽牌结果。

## 2026-03-26 DiceThrone 4 人玩家目标交互专项审计发现

- 这次收口完成的是 2v2 核心规则闭环，不等于“所有面向玩家目标的技能/卡牌都已做 4 人审计”。多人能力兼容需要独立切一轮。
- `customActions/common.ts` 里的“移除 1 个状态 / 移除所有状态 / 转移状态”与 `customActions/paladin.ts` 里的 `Vengeance II`、`Consecrate`，都已经把候选目标扩成 `Object.keys(state.players)`；说明领域入口具备 4 人潜力，但这不代表验证和 UI 已完整跟上。
- `InteractionOverlay.tsx` 当前在 4 人玩家选择卡片里仍以 `self/opponent` 为主语义，组件测试也主要按 `['0','1']` 写断言；在 4 人下，这种口径不足以证明多个敌/友候选都能被稳定区分与正确点击。
- `validateGrantTokens` 与 `validateTransferStatus` 目前仅校验“存在 pendingInteraction 且 playerId 匹配”，没有进一步核对目标玩家是否在 `targetPlayerIds` 中、转移目标是否与来源玩家不同，属于共享验证层缺口。
- `TRANSFER_STATUS` 执行层本身已经同时支持状态与 token 的转移，并且会拦截 `removable: false` 的 token；因此第一批重点不是重写 execute，而是把验证、交互与 4 人 E2E 补齐到和执行层能力一致。
- 现有 `dicethrone-paladin-vengeance-select-player.e2e.ts` 仍是 2 人版本，只证明了“自己/对手”二选一，不足以作为 4 人“任意玩家授 token”的证据。

## 2026-03-26 DiceThrone 4 人玩家目标交互 Batch 1 收口发现

- `TRANSFER_STATUS` 的真实在线 blocker 不在 execute，而在验证层与 UI 双阶段建模错位：`Board.tsx` 只在本地把交互从 `selectStatus` 推演成 `selectTargetStatus`，服务端权威态仍停在 `selectStatus + transferConfig:{}`；若 `validateTransferStatus` 只接受 `selectTargetStatus`，在线点击确认后会被验证层拒绝。
- 正确做法不是放松成“任何 transfer 命令都放行”，而是兼容两种合法权威态：
  - `selectTargetStatus`：继续严格校验 `sourcePlayerId/statusId` 与交互上下文完全匹配。
  - `selectStatus + transferConfig:{}`：允许从命令 payload 读取 `fromPlayerId/statusId`，但仍必须校验来源玩家在候选集内、来源上真实存在该状态或 token、目标在候选集内且不等于来源。
- 4 人状态 / 可移除 token 交互要想稳定 E2E，不能只给玩家卡片加 test id；第一阶段的可点击状态徽章也必须有稳定 selector。为 `SelectableEffectsContainer` 增加 `getItemTestId()` 后，`InteractionOverlay` 才能输出 `dt-status-effect-<pid>-<effectId>` 这类稳定入口。
- `Transfer Status` 是 Batch 1 最有代表性的在线链路，因为它同时覆盖“来源玩家选择、第二阶段目标候选、来源玩家排除、友敌标识、权威状态广播”五个风险点；单独跑通这一条，比继续扩 2 人 `Vengeance` 旧 E2E 更能说明 4 人兼容已开始收口。

## 2026-03-26 DiceThrone 4 人授 token 在线证据补强发现

- 只靠 `GRANT_TOKENS` 的规则层测试还不足以证明“任意玩家授 token”真的完成 4 人兼容；因为最容易漏的是 `tokenGrantConfigs` 多 token 路径，以及在线玩家选择面板是否还能稳定区分多个敌/友候选。
- `Consecrate` 比 `Vengeance II` 更适合作为第二条在线证据：它一次授予 `Protect/Retribution/Crit/Accuracy` 四个 token，能同时覆盖 `tokenGrantConfigs`、`selectPlayer`、多玩家候选渲染和权威状态同步。
- 实测表明 `Board.tsx -> engineMoves.grantTokens()` 这一段在 4 人下已经能把 ally 目标稳定带到服务端，并由 `execute.ts` 正确生成四个 `TOKEN_GRANTED` 事件；这说明当前 `selectPlayer + tokenGrantConfigs` 主链路已经具备在线可验证性。

## 2026-03-26 DiceThrone 面向多人能力审计边界更新

- 按当前代码检索，真正属于“面向玩家目标”的多人高风险入口主要集中在：
  - `customActions/paladin.ts`：`paladin-vengeance-select-player`、`paladin-consecrate`
  - `customActions/common.ts`：`remove-status-1`、`remove-all-status`、`transfer-status`
- 其中更复杂、风险更高的两类已经拿到 4 人在线证据：
  - `transfer-status`：双阶段状态 / token 转移
  - `paladin-consecrate`：任意玩家多 token 授予
- `remove-status-1` / `remove-all-status` 仍属于玩家目标交互，但复杂度低于已收口的 `Transfer Status`；按当前决策，不再优先补它们的在线 E2E，把时间留给后续更复杂或更高风险的多人交互。

## 2026-03-26 DiceThrone 4 人目标交互 UI 精简发现

- 用户指出的“为什么选中还额外多一个框、为什么四人会像有六个框”是对的，根因在 `InteractionOverlay.tsx` 的 `selectTargetStatus` 第二阶段：它同时渲染了第一阶段的来源状态卡和第二阶段的目标玩家卡，视觉上把“来源展示”和“目标选择”叠在了一个 modal 里。
- 正确收口不是再给卡片加更多提示，而是减少并行信息：第二阶段只保留一个紧凑的来源摘要块，再显示真实可选目标卡片。来源玩家继续整排保留会让 4 人场景从“3 个目标”膨胀成“1 排来源 + 1 排目标”的 6 框感知。
- 已选目标的外挂勾选块也属于重复信号。卡片自身边框高亮已经足够表达“当前选中”，再在卡片外侧加一个独立小框只会制造“多了一层框”的噪音。
- 在线截图 `06-four-player-transfer-token-target-selection.png` 复核后确认，新版第二阶段已收口为“1 个来源摘要 + 3 张候选目标卡”，符合用户对 4 人目标选择密度和层级的直觉预期。

## 2026-03-26 DiceThrone 4 人目标交互四宫格修正发现

- 用户继续指出“既然本质是先选一个再选另一个，就不该把来源做成异类摘要块，而应保持四宫格”是对的；上一版把来源卡降成摘要，虽然去掉了 6 框，但也把原本统一的玩家选择语义拆坏了。
- 更正确的结构是：第二阶段仍展示同一组 4 个玩家卡，其中来源玩家保留在原位，但转为 `locked/disabled` 态；其余 3 张仍是可点击目标。这样用户看到的仍是“四人里先选一个，再选另一个”，而不是“先选一个，再读一段说明，再选另一个”。
- 因此 `selectTargetStatus` 第二阶段现已改为四宫格：来源玩家卡使用 `dt-transfer-source-locked-<pid>`，保留座位/敌我/被转移 token 信息，但不可点击；另外 3 张继续使用 `dt-transfer-target-<pid>`。
- 这次在线 E2E 包装器整份 `dicethrone-simple-start.e2e.ts` 都走成了 `skip`，说明当前没拿到新的在线证据；所以这轮只能确认组件层和类型层已经改对，不能把它表述成“新截图已复核完成”。

## 2026-03-27 DiceThrone 联机 E2E 跳过根因修复

- 导致 `setupDTOnlineMatchWithPlayers()` 返回 `null` 的真实原因不是“游戏服务器不可用”，而是浏览器偶发在 `page.goto(/play/dicethrone/match/...)` 阶段抛出 `net::ERR_INSUFFICIENT_RESOURCES`；因为 helper 直接吞掉异常并返回 `null`，测试表面上才会退化成 `skip`。
- 手工 API 探针已确认 `/games/dicethrone/create`、`/claim-seat`、`/join` 都能正常返回；也就是说联机链路的服务端并没有坏，问题集中在前端 match 页导航的瞬时资源错误。
- 最小正确修复不是改业务断言，也不是把 `skip` 改成硬失败，而是在 `e2e/helpers/dicethrone.ts` 为联机 match 页导航增加小范围重试，专门兜住 `ERR_INSUFFICIENT_RESOURCES`、`ERR_ABORTED`、`NS_BINDING_ABORTED` 这类瞬时错误。
- 修复后，4 人 `Transfer Status` 单用例重新恢复为 `1 passed`，整份 `e2e/dicethrone-simple-start.e2e.ts` 也恢复为 `8 passed`；同时新截图确认第二阶段确实是“四宫格 + 锁定来源卡”，不是只靠测试选择器蒙混过关。

## 2026-03-27 DiceThrone 2 人 Transfer Status 进度确认

- 2 人转移没有被漏掉；因为 `selectTargetStatus` 第二阶段现在是共享组件逻辑，2 人也会显示来源锁定卡 `dt-transfer-source-locked-*` 和真实目标卡 `dt-transfer-target-*`。
- 新增到 `e2e/dicethrone-simple-start.e2e.ts` 的 2 人在线用例，已经把 UI 结构断言和 token 转移结果都写进去了；当前缺的不是测试设计，而是把它从 `skip` 推到真实执行。
- 直接 `tsx + Playwright` 探针已证明 `setupDTOnlineMatch()` 在同一组端口服务下可以成功返回 `OK <matchId>`；因此现有 `skip` 更像是项目 Playwright 运行链路里的目标/环境口径问题，而不是 2 人联机 helper 或 `Transfer Status` 业务本身损坏。

## 2026-03-27 DiceThrone 2 人联机 setup 真正 blocker 收口

- 2 人联机 helper 的第一个真 blocker 不是选角组件改坏，而是时序错位：host 在只有自己占座时就提前等待角色选择页，但真实页面此时只会显示 `Waiting for opponent...`。正确顺序必须是“所有玩家进入 match 页后，再统一等待选角 UI”。
- 第二个真 blocker 不是 `/create` / `/join` API，而是“同一条测试链路分叉到了两个游戏服端口”：
  - API helper 显式打到了 `http://127.0.0.1:20000`
  - 浏览器页里的 `__FORCE_GAME_SERVER_URL__` 却仍被 `initContext()` 按旧环境注成了 `18000`
  - `/test/get-state` / `/test/inject-state` 也继续跟着旧默认口径打到 `18000`
  这会表现为：房间能创建、凭证能拿到，但 match 页一直 `CONNECTING / Loading match resources...`，或者状态注入直接 `ECONNREFUSED 127.0.0.1:18000`。
- 因此最小正确修复不是继续堆选择器等待，也不是把用例改回本地 `/test` 场景，而是把同一个 `gameServerBaseURL` override 贯穿到：
  - `initContext()` 注入的 `__FORCE_GAME_SERVER_URL__`
  - DiceThrone 在线 helper 的上下文创建
  - `/test/*` 状态注入 helper
  只有这样浏览器 WebSocket、API 调房、状态注入三条链路才会重新指向同一台游戏服。
- 2 人 `Transfer Status` 在线用例自身也有一个测试设计缺口：它一开始直接断言第二阶段 `dt-transfer-source-locked-1`，但真实流程必须先在第一阶段点击 `dt-status-effect-1-crit` 才会进入第二阶段。这不是业务 bug，而是测试漏走了一步用户操作。
- 在显式 `6174/20000/21000` 环境下，`dicethrone-simple-start.e2e.ts` 已拿到 `9 passed` 的有效在线结果；但连续多次直接 CLI 复跑时仍偶发整份 `skip`。当前判断这是 Playwright runner / 本机环境的瞬时不稳定，不是本轮修复的代码回退。

## 2026-03-27 DiceThrone remove-status 在线证据与默认脚本回归

- 当前默认 `npm run test:e2e:ci:file -- e2e/dicethrone-simple-start.e2e.ts` 口径已经能直接拿到 `11 passed`，不再需要手工先写显式 `6174/20000/21000` 环境变量才能证明多人目标交互成立。
- `remove-status-1` / `remove-all-status` 真正容易误判的点不在 host 页执行，而在目标页权威态同步：host 页往往会先看到 `crit/burn` 被清空，但目标页广播会慢半拍。如果只在 host 页断言，很容易把测试写成“假绿”。
- 对这两类移除交互，最小正确修复不是改领域逻辑，而是在 E2E 中显式等待目标页 `__BG_TEST_HARNESS__` 状态追平后再断言。这样既不放宽业务约束，也避免把多页广播时序误报成规则 bug。
- 到这一步，玩家目标交互第一批三类高风险链路都已拿到 4 人在线证据：
  - `transfer-status`
  - `paladin-consecrate`
  - `remove-status-1` / `remove-all-status`

## 2026-03-27 DiceThrone Vengeance II 与 Batch 1 spec 边界校正

- 用户指出“spec 不止这个”是对的。当前 `proposal/design/tasks` 已按 Batch 1 写清范围，但原 `spec.md` 仍只有一个总括 requirement，容易被误读成“所有 4 人玩家目标交互都已审计完成”。
- 更准确的 spec 结构应把 Batch 1 拆成明确 requirement：`任意玩家授 token`、`任意玩家移除状态`、`状态/可移除 token 转移`、`无单一敌方目标的无伤害技能流程兼容`。这样才能把“本轮已收口哪些共享根因”和“尚未纳入的后续批次”分开。
- `Vengeance II` 在 4 人 / 2v2 下最初不弹玩家选择，根因不是 E2E 断言或 abilityId 写错，而是共享攻击流程不支持“无默认 defender、无伤害、但仍会触发玩家交互与 postDamage”的技能。
- 这条共享层缺口具体表现为：
  - `preDefense` 在 `defenderId` 为空时被错误短路；
  - 4 人模式下无脑进入 `targetingRoll`；
  - `INTERACTION_REQUESTED` 没被当成阻塞事件，导致 phase 提前推进；
  - 无 `defenderId` 的攻击没能完整跑完 `withDamage/postDamage`，使后续资源结果丢失。
- 正确修复不是给 `Vengeance II` 单独开特判，而是把共享攻击流程收紧到“按攻击真实语义推进”：
  - 无单一敌方目标的无伤害技能不再误进 `targetingRoll`；
  - `INTERACTION_REQUESTED` 会阻塞流程，等待玩家完成交互；
  - 无 `defenderId` 的攻击也能完成 `postDamage` 结算。
- `rule-consistency.test.ts` 新增/调整的回归已经覆盖这类共享根因，而不是只锁一条 UI 路径：
  - 4 人模式下有真实单一敌方目标的攻击仍进入 `targetingRoll`；
  - 无单一敌方目标的无伤害技能不会误进 `targetingRoll`；
  - 无默认 `defender` 的 4 人无伤害技能仍会发出 `INTERACTION_REQUESTED` 并继续后续结算。
- `Vengeance II` 现在已经拿到真实 4 人在线证据，说明 Batch 1 中“任意玩家授 token”这一类不再只靠 `Consecrate` 代表；同时也证明共享攻击流程已不再把这类技能吞掉。
- 到当前版本，Batch 1 已拿到 4 人在线证据的代表性入口是：
  - `transfer-status`
  - `paladin-consecrate`
  - `paladin-vengeance-select-player` / `Vengeance II`
  - `remove-status-1`
  - `remove-all-status`
- 这轮还确认了一个测试层陷阱：E2E 文件如果直接从 `domain/rules.ts` 调 `getAvailableAbilityIds()` 做 Node 侧调试，而没有显式调用 `registerDiceThroneConditions()`，会因为 `diceSet/allSymbolsPresent` 未注册而误报“技能不可用”。浏览器端通过 `domain/index.ts` 会自动注册条件，但测试进程不会。

## 2026-03-28 DiceThrone worktree 依赖树残缺导致的验证假失败

- 本轮最后的真实 blocker 不是业务逻辑，而是 `BoardGame-wt-dicethrone-4p-team-mode/node_modules` 里多个关键包只剩局部目录，缺了包根入口文件；直接表现为 `tsc.js`、`vitest.mjs`、`dotenv/config`、`playwright/cli.js` 等路径解析失败。
- 这种失败会把“验证命令起不来”伪装成“代码又坏了”，但根因与 DiceThrone 4 人玩家目标交互无关；修复前应先区分是测试环境损坏，还是业务回归。
- 在当前 worktree 里，最直接可行的恢复方式是重新执行一次 `npm install`，把锁文件对应的缺失入口补回；补完后，`openspec validate`、`rule-consistency.test.ts`、`dicethrone-simple-start.e2e.ts` 已分别恢复为 `valid`、`31 passed`、`12 passed`。

## 2026-03-28 DiceThrone Consecrate 多页同步等待补正

- `Consecrate` 单用例本身是绿的，整文件串跑时真正失败的不是授 token 逻辑，而是 ally 页权威态比 host 页慢半拍，导致测试在 `readHarnessState(allyPage)` 时抢跑。
- 这类失败和前面的 `remove-status-1` / `remove-all-status` 属于同一类多页广播时序问题；最小正确修复仍然是 E2E 补显式等待，而不是去动领域逻辑。
- 现已在 `Consecrate` 用例中补上 `allyPage.waitForFunction()`，要求队友页的 `Protect / Retribution / Crit / Accuracy` 四个 token 都追平后再读 harness state。
- 补完后，`dicethrone-simple-start.e2e.ts` 默认整文件回归重新稳定为 `12 passed`，因此此前旧专项收敛阶段记录的 `11 passed, 1 skipped` 已被新的有效结果覆盖。

## 2026-03-28 DiceThrone 旧专项 E2E 收敛审计

- `dicethrone-status-interaction-complete.e2e.ts` 仍有独立价值，因为它对应的是共享交互层 UI 契约：`selectStatus`、`selectPlayer`、`selectTargetStatus` 的按钮可用性、禁用态和第二阶段卡片结构。这些断言不应继续散落在已偏业务化的旧文件里。
- `dicethrone-status-removal.e2e.ts` 已经不是“待修一下就能用”的状态，而是同时依赖旧页面结构、旧英雄入口、旧 `hero-card/status-area/target-selector` 选择器。继续修它，本质上是在重写一份与 `simple-start` 高度重复的文件。
- `dicethrone-status-interaction-cancel.e2e.ts` 与 `status-interaction-complete` 在测试主题上高度重复，只是旧版把“取消按钮”拆成了单独文件；保留它只会制造重复维护点。
- `dicethrone-paladin-vengeance-select-player.e2e.ts` 已经被当前 4 人 `Vengeance II` 在线证据实质取代，而且它本身还保留 2 人 self/opponent 旧语义、重复函数定义与过时的 `+4 CP` 绑定断言，不适合作为现役专项继续存在。
- 因此这轮最正确的收敛方案是：
  - 保留并现代化 `dicethrone-status-interaction-complete.e2e.ts`
  - 退役 `dicethrone-status-removal.e2e.ts`
  - 退役 `dicethrone-status-interaction-cancel.e2e.ts`
  - 退役 `dicethrone-paladin-vengeance-select-player.e2e.ts`
  - 同步清理 `playwright.config.ts` 里的对应 legacy ignore
- `Board.tsx` 当前并不会直接读取裸 `InteractionDescriptor`；状态交互弹窗的真实入口是 `sys.interaction.current.kind === 'dt:card-interaction'`，再从 `data` 解包出 `InteractionDescriptor`。因此任何 harness 级 E2E 若直接往 `current` 塞裸对象，页面上不会出现交互弹窗。
- 这轮 `simple-start` 的异常不是收敛改动带来的功能回退，而是 runner / 服务启动层噪音：
  - 一次整文件回归结果为 `11 passed, 1 skipped`，唯一跳过的是 `targeting roll` 用例；
  - 单独复跑同一 targeting roll 用例也直接走到 `setupDTOnlineMatchWithPlayers()` 返回 `null`；
  - 调试日志已记录 `game_server_unavailable`、`apiRequestContext.post: connect ECONNREFUSED 127.0.0.1:20000`，另一次整文件复跑则在 global setup 阶段出现 Vite 前端进程异常退出。
- 因此本轮可以下的代码结论是：旧专项 E2E 收敛本身已完成，且新 `status-interaction-complete` 套件稳定可跑；`simple-start` 的 residual risk 仍然是既有 E2E 基础设施抖动，不是本轮删除/重写旧专项文件造成的行为变化。
