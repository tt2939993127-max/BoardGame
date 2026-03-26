# Findings: BoardGame 多线并行调查 / 修复 / 收口

## 新发现（2026-03-26，移动端 exit fab sheet 滚动锁）
- 当前未收口的本地改动不是部署尾巴，而是另一条独立 UI 修复线：移动端横屏下 exit fab sheet 打开后，页面级滚动没有被真正锁住。
- 仅把 exit fab 面板改成底部 sheet 还不够；若 `html/body` 仍允许滚动/overscroll，用户仍可能看到页面级滚动条或继续把底层页面拖动起来。
- `FabMenu` 之前混用了裸 `window.innerWidth/innerHeight` 与 safe-area 读取；改成统一走 `useRuntimeViewport()` 后，悬浮球位置、对齐和 resize 重算会更稳定，也更适合移动端运行时 viewport 变化。
- 新增的 `useDocumentScrollLock()` 做了引用计数与样式快照恢复，适合作为可复用基础能力，而不是把 `overflow: hidden` 散落在每个面板组件里。
- 这轮最直接的验收信号不是“面板自己不滚了”，而是：exit fab sheet 展开时 `html/body` 的 `overflow-y` 为 `hidden`、`overscroll-behavior-y` 为 `none`，且 document/body 不再出现横向溢出。
- 已完成最小有效验证：`npm run typecheck` 通过；`smashup-4p-layout-test.e2e.ts` 中“移动端横屏应保持四人局布局可用，并支持手牌长按看牌”通过（1 passed）。

## 新发现（2026-03-26，尾巴收口复核）
- `temp/open-feedback-tracker.md` 仍有独立价值，但它的有效结论已经很明确：fb2 / fb3 / fb4 / fb5 代码层都已修复，后续主动作应转到后台关闭状态，不必继续把它当代码待办。
- `temp/e2e-next-batch-plan.md` 仍有独立价值，但角色应固定为 SmashUp 收尾专项记录；它支持“当前主战场仍是 SmashUp 收尾，不要扩大战线”这一结论，而不是新的主 Plan。
- `temp/codex-room-assets-findings.md` 的有效结论已被当前主线吸收：`apps/api/src/main.ts` 里 `/assets` 已排除出 SPA fallback，`src/main.tsx` 已存在 stale chunk 一次性自动刷新；但“缺失 chunk 真实不再返回 HTML”与生产层验证仍未完成。
- `temp/codex-find-planning-with-files.md` 已无继续存在的必要：技能已人工安装，且该文件当前并不存在；它应视为已完成/失效，而不是待检查项。
- POD 文档线当前不是“全部还能当真”：`p1-restoration-progress.md` 已是完成态，`p3-audit-progress.md` 明显落后于 `p3-audit-complete.md`，而 `p0` 相关文档内部仍存在“进度稿 / 最终稿 / 需要恢复清单”并存的冲突，不能整体宣称已完全收口。
- “房主被删房”这条线的状态也应从“纯未知”改成“根因已基本锁定，但修复未落地”：服务端 duplicate-owner cleanup 仍然过于激进，前端则仍会把 chunk 失效后的 404 最终折叠成“房间不存在或已被删除”。

## 新发现（2026-03-26，board-shell 横屏共享壳）
- 老板提供的截图暴露的是共性问题：底部滚动条与底部手牌/卡牌区域被裁剪，不是单游戏局部样式瑕疵。
- 这类问题的共同点是：涉及 `mobileLayoutPreset: 'board-shell'` 的横屏移动端游戏，而不是只发生在某一个 `Board.tsx`。
- 根因锁定在共享壳层：横屏 `board-shell` 仍吃统一 safe-area padding，导致缩放后的实际游戏画布再次被压缩；配合缺少统一裁剪约束，就会表现为滚动条与底部内容被切掉。
- 最小正确修复不该去每个游戏单独改高度/间距，而应修 `MobileBoardShell + src/index.css` 的共享约束。
- 已验证共享回归：`MobileBoardShell` 单测通过，`mobileSupport` 支持矩阵测试通过，说明修复没有破坏 board-shell 游戏声明链路。
- 本轮代码已推送到 `main`，提交为 `608b5937`；镜像构建已成功，但生产部署被老板明确叫停，因为已经过了允许部署的时间窗。
- 新的明确偏好：生产部署只在“早上”执行；晚上即使镜像已好，也不要继续部署。

## 新发现（2026-03-26，第二轮）
- 当前工作区存在并发回退：此前已经设计/实现过的 `engine/ai`、训练采集文件和部分游戏 AI runtime 并不都还在树上，继续开发前必须先确认“当前文件系统状态”，不能假设上一轮完成的代码仍然存在。
- 已恢复的当前态能力包括：统一 AI runner、远程 provider 超时/异常/非法动作 fallback、井字棋 AI runtime、训练数据 raw JSONL 采集层。
- 当前树里 Dice Throne AI runtime 仍未恢复，因此 OpenSpec 历史完成记录与当前工作区状态暂时不完全一致；后续继续时要以“当前树可运行状态”为准，而不是只看历史记录。
- 训练采集仍然适合先走 raw log / JSONL 层；等 AstrBot provider 稳定后，再讨论是否补 Mongo 索引层或离线清洗层。

## 新发现（2026-03-26）
- 对桌游场景，默认 AI 路线已经收敛为：`legalActions` 枚举之后做启发式评分，再按需要叠加搜索；行为树不再作为通用默认方案。
- 当前通用本地 AI 框架已经具备跨游戏复用的最小闭环：统一上下文、统一动作表示、统一评分 helper、统一本地 runner。
- Dice Throne 已经从“动作 kind 优先级硬编码”迁移到“多 scorer 评分式 baseline”，说明该框架足以承载复杂于 Tic-Tac-Toe 的桌游对象。
- 训练采集链路与本地逻辑 AI 现在是解耦的：本地 AI 先用规则与评分跑通，训练样本继续作为后续 remote AI / 模型微调的数据基础。
- 下一阶段最值得做的不是继续堆 Dice Throne 特例逻辑，而是补 remote provider 约束与数据治理，避免后续 AstrBot 接入时绕过 `legalActions` / validate。

## 当前主任务（2026-03-22）
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

## Plan with Files 唯一落点核对（2026-03-24）
- 直接依据 `planning-with-files` 技能原始说明核对：该技能明确要求 **planning files go in your project directory**，并把 `task_plan.md` / `findings.md` / `progress.md` 视为项目目录内的持久工作记忆，而不是 agent workspace 文件。
- 因此，若当前要讨论的是 **BoardGame 项目任务** 的唯一正式 Plan 落点，那么根目录 `task_plan.md` 与技能原始设计是对齐的；把主 Plan 迁到 agent workspace，反而会把“项目任务计划”和“agent 自身记忆”混在一起，削弱跨会话恢复与仓库内审计能力。
- 需要严格区分的不是“项目根 vs agent workspace 都可放主 Plan”，而是：
  - **项目任务计划** → `D:\gongzuo\webgame\BoardGame\task_plan.md`
  - **项目任务研究/会话记录** → `findings.md` / `progress.md`
  - **agent 自身记忆** → agent workspace 下的 memory/ 等目录，不能写回项目仓库
- 当前仓库内和本任务最相关的分级可收敛为：

| 路径 | 分级 | 角色 | 处理建议 |
| --- | --- | --- | --- |
| `task_plan.md` | 正式入口 | BoardGame 当前唯一正式 Plan | 保持唯一入口，不迁到 agent workspace |
| `findings.md` | 配套记录 | 研究发现、规则、判断依据 | 继续保留；不得表述成第二份 plan |
| `progress.md` | 配套记录 | 会话执行日志、验证、handoff | 继续保留；不得表述成第二份 plan |
| `temp/open-feedback-tracker.md` | 专项配套记录 | feedback 未关闭项盘点 | 内容应摘要并回写主 Plan，不得充当主入口 |
| `temp/e2e-next-batch-plan.md` | 专项配套记录 | E2E 下一批候选与排序 | 内容应摘要并回写主 Plan，不得充当主入口 |
| `temp/feedback-main-branch-resume-plan.md` | 历史临时材料 | feedback 主分支收口历史 handoff | 2026-03-24 已删除；有效结论已回写根目录三件套 |
| `temp/main-e2e-single-progress.md` | 历史临时材料 | 单次 E2E 试跑记录 | 2026-03-24 已删除；有效结论已回写根目录三件套 |
| `docs/smashup-e2e-migration-plan.md` | 领域历史文档 | SmashUp E2E 曾经的专题计划 | 不属于当前唯一主 Plan；若与现状冲突，应视为历史/专题文档 |
| `docs/bugs/feedback-rate-limit-todo.md` | 领域 backlog 文档 | feedback 速率限制待办 | 属于专题 backlog，不属于主 Plan |

## 对老板新规的符合性判断（2026-03-24）
- **结论：当前结构在原则上可符合新规，但存在“视觉上像多份 plan”的风险。**
- 真正符合新规的前提是：
  1. 只承认 `task_plan.md` 是当前正式入口；
  2. `findings.md` / `progress.md` 只写配套信息，不重复维护完整任务拆解；
  3. `temp/*plan*` / `*resume*` / `*progress*` / `*tracker*` 只作为专项临时材料或历史材料，不能再被当作“当前任务从哪继续”的入口。
- 目前最大风险不是 `task_plan.md` 放错位置，而是 temp 下带 `plan/progress/resume` 命名的文件容易持续制造“第二主计划”错觉；其中 `temp/feedback-main-branch-resume-plan.md`、`temp/main-e2e-single-progress.md`、`temp/ssh-codex-plan.md`、`temp/reboot-resume-plan.md` 已于 2026-03-24 清理，后续应继续避免新增同类命名入口。

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
## Session: 2026-03-25 跨游戏 AI 骨架收尾
- **Status:** completed
- 关键发现：
  - `manifest.ai` 必须显式声明并纳入生成脚本校验，否则跨游戏 AI 能力会退回到隐式约定，后续扩展不可审计。
  - 训练采集与后续模型接入可以共用一套结构：`playerView` 后可见状态 + `interaction/responseWindow` snapshot + `legalActions`。
  - 本地 AI 运行时需要状态级去重；`attemptKey` 以玩家、阶段、交互和 legal action 集合做指纹，足以挡住第一层重复尝试。
  - `dicethrone` 首个落地的关键不在“做强”，而在“做通”。
  - 最小闭环覆盖 setup、阶段推进、掷骰、确认、选技能、响应跳过、奖励骰和基础交互后，逻辑 AI 已可持续推进对局。
  - 新增运行时代码时，`DICETHRONE_CHARACTER_CATALOG` 需要从 `./domain/types` 直接取值；`./domain` barrel 并未导出它。
  - 服务端 manifest 查询应走 `src/games/manifest.ts` barrel，而不是不存在的 `../../games`。
- 本轮核心落点：
  - `src/games/dicethrone/ai.ts`：新增 runtime、legal action 构建、baseline policy
  - `src/games/dicethrone/game.ts`：注册 runtime
  - `src/engine/transport/server.ts`：修正 manifest 引用并完成采集链路接入
  - `src/games/dicethrone/__tests__/basic-commands-coverage.test.ts`：在现有测试文件补 AI 断言
## 2026-03-25 OpenSpec 收口补充发现

### `add-user-settings-persistence` 已实现，可归档
- 后端已存在完整用户设置模块：
  - `apps/api/src/modules/user-settings/user-settings.controller.ts`
  - `apps/api/src/modules/user-settings/user-settings.service.ts`
  - `apps/api/src/modules/user-settings/schemas/user-audio-settings.schema.ts`
- 前端已接入登录同步与首登迁移：
  - `src/api/user-settings.ts`
  - `src/contexts/AudioContext.tsx`
  - `src/lib/audio/AudioManager.ts`
- 关键实现口径：
  - 登录后读取远端设置并应用到当前会话
  - 若服务器无记录，则把本地偏好迁移到服务器
  - 远端 apply 使用 `persist=false`，不会覆盖游客本地缓存
  - 登出时通过 `restoreLocalSettings()` 恢复游客本地偏好
- 测试已覆盖：
  - `apps/api/test/user-settings.e2e-spec.ts`
  - `src/api/__tests__/user-settings.test.ts`

### `add-game-changelog-and-author-info` 已实现，但原 change 文档过时
- 后端已实现游戏更新日志模块与公开/后台接口：
  - `apps/api/src/modules/game-changelog/`
  - `GET /game-changelogs/:gameId`
  - `admin/game-changelogs` CRUD
- 后台已实现 `user / developer / admin` 与 `developerGameIds`：
  - `apps/api/src/modules/auth/schemas/user.schema.ts`
  - `apps/api/src/modules/admin/admin-user-role.service.ts`
  - `src/pages/admin/Users.tsx`
  - `src/pages/admin/UserDetail.tsx`
  - `src/pages/admin/components/UserRoleModal.tsx`
  - `src/pages/admin/GameChangelogs.tsx`
- 前台已实现作者入口与独立更新标签：
  - `src/components/lobby/GameDetailsModal.tsx`
  - `src/components/lobby/GameDetailsChangelogSection.tsx`
  - `src/components/lobby/gameDetailsContent.ts`
- 关键现实口径：
  - 作者信息来自 `manifest.authorName`
  - 未声明时回退为“佚名”
  - 作者弹窗是通用说明，不是旧提案里的 `author.tsx` 动态内容注入
  - 更新日志位于独立“更新”标签，不是旧提案里的“排行榜内双栏并排”
- 测试已覆盖：
  - `apps/api/test/game-changelog.service.test.ts`
  - `apps/api/test/admin.e2e-spec.ts`
  - `src/components/lobby/__tests__/gameDetailsContent.test.ts`

### `update-mobile-first-adaptive` 应判定为 stale change
- 该 change 的目标是“mobile-first”
- 现行项目口径和后续 change 已转为“PC 优先、移动端条件覆盖”：
  - `.windsurf/skills/adapt-game-mobile/SKILL.md`
  - `openspec/changes/add-pc-first-mobile-adaptation-framework/`
- 因此它不是“继续实现即可归档”，而是已经被后续方案方向性替代，适合直接清理目录

### 当前仍不要误归档
- `add-refresh-token-auth`
  - 已有 refresh token 与定时刷新
  - 但 spec 里的“401 自动刷新并单飞重试请求”尚未全面落地
  - 典型缺口仍是前端若干调用链未统一做 401 refresh + retry
## 2026-03-25 跨游戏 AI 产品入口收口补充发现
- 当前第一阶段已经形成稳定的通用产品链路：`manifest.ai -> lobby 展示 -> 本地对战配置 -> local room seat controller -> debug panel 展示`。
- `seat controller` 的通用 query 方案已经固定为：
  - `players`
  - `seat0 / seat1 / ...`
  - 值支持 `human`、`local-ai[:policyId[:fallbackPolicyId]]`、`remote-ai:providerId[:fallbackPolicyId]`
- `tictactoe` 适合作为第一条产品验证链路，因为本地 AI 默认值简单，E2E 可稳定验证 `P1 -> Local AI`。
- 本轮新增测试后，已覆盖：
  - 默认 `seat1=local-ai`
  - 显式 `seat1=human` 覆盖默认
  - `buildLocalMatchSearchParams(...)` 输出 `players / seat1 / seat2`
  - `AiSupportPills` 只渲染 enabled capability
- 当前仍未完成的不是产品入口，而是远程 provider 规则：
  - AstrBot 接入鉴权和超时边界
  - provider 返回非法动作时的回退与约束
  - 训练数据生命周期治理
- 本轮证据已经落到：
  - `D:\gongzuo\webgame\BoardGame\evidence\lobby-ai-local-config-e2e.md`
  - `D:\gongzuo\webgame\BoardGame\test-results\evidence-screenshots\lobby.e2e\Tic-Tac-Toe-本地对战配置会暴露-AI-支持和-seat-controller\lobby-tictactoe-local-ai-config-debug.png`
## Addendum（2026-03-25）：OpenSpec 收口事实更新

### 本轮新增已归档
- `add-pc-first-mobile-adaptation-framework`
  - 真实现状是 manifest 驱动的 PC-first mobile support，已包含移动端元数据、方向提示、通用 shell、board shell 缩放兜底。
- `implement-domain-core-and-systems`
  - 真实现状是 `MatchState = { sys, core }`、`DomainCore`、pipeline + systems 生命周期均已落地；旧 change 混入的 `boardgameio-adapter` / `ugc-optional` 不应跟着归档。
- `refactor-engine-primitives`
  - 真实现状不是“删除 systems 层”，而是新增并广泛使用 `src/engine/primitives/`。
  - `src/engine/systems/` 仍然存在并承载 Flow / Interaction / Undo / ResponseWindow / ActionLog 等运行时系统。
  - primitives 已至少包含：
    - `expression` / `condition` / `target` / `effects`
    - `zones` / `dice` / `resources`
    - `ability` / `abilityConstraints` / `tags` / `modifier` / `attribute`
    - `damageCalculation` / `actionRegistry` / `grid` / `uiHints`
    - `spriteAtlas` / `actionLogHelpers` / `mulligan` / `visual`
  - DiceThrone / SummonerWars / SmashUp / Cardia 均已有 primitives 落地引用。

### 本轮新增正式 spec 修正
- `openspec/specs/engine-primitives/spec.md`
  - 已去掉 archive 生成后的占位 Purpose，改为真实职责描述。
- `openspec/specs/dice-system/spec.md`
  - 已去掉旧的 singleton / 全局注册口径。
  - 当前正式口径改为：
    - 游戏显式提供 `DiceDefinition`
    - 引擎通过 `createDie` / `rollDie` / `rollDice` / `calculateDiceStats` / `checkSymbolsTrigger` / `checkTotalTrigger` 消费

### 仍不能误归档
- `add-cross-game-ai-system`
  - 已完成：manifest.ai / seat controller / 本地 AI runner / 训练数据 `legalActions` / lobby 与 local room 的 AI 支持入口。
  - 未完成：Remote provider 真正执行链、AstrBot 接入、provider timeout / fallback / 非法动作回退闭环。
- `add-refresh-token-auth`
  - 已完成：refresh token 存在，且有定时刷新。
  - 未完成：spec 要求的 401 自动刷新并单飞重试请求链路未确认全面落地。
## Addendum（2026-03-25）：OpenSpec 收口事实继续更新

### 新增已归档
- `add-ugc-layout-alignment`
  - `src/ugc/utils/layout.ts` 已提供 `resolveLayoutRect`、`resolveAnchorFromPosition`、`migrateLayoutComponents`
  - `src/ugc/builder/ui/SceneCanvas.tsx` 已使用锚点模型、支持网格/边缘/中心吸附和参考线
  - `src/ugc/builder/pages/UnifiedBuilder.tsx` 已提供对齐/分布工具栏与 `uiLayout` 持久化
  - `src/ugc/builder/ui/RenderPreview.tsx` 与 `src/ugc/runtime/UGCRuntimeView.tsx` 共享布局渲染路径
- `add-ugc-client-runtime-adapter`
  - `src/ugc/client/loader.ts` 已解析 manifest、入口 URL、`commandTypes` 与玩家人数范围
  - `src/ugc/client/game.ts` 已提供 `createUgcClientGame()` / `createUgcDraftGame()`
  - `src/ugc/client/board.tsx` 已提供 `createUgcRemoteHostBoard()`，缺省回退 `/dev/ugc/runtime-view`
  - `src/pages/MatchRoom.tsx` 已存在 `isUgc` 分支，提供 loading / error / board 三态

### 新增明确不能归档
- `add-ugc-runtime-and-audio-pipeline`
  - 已有：`apps/api/src/modules/ugc/ugc.controller.ts` / `ugc.service.ts` 的 package、publish、manifest、asset 上传链路
  - 已有：`src/server/ugcRegistration.ts` 的 published UGC 动态注册
  - 已有：`src/ugc/server/compression/imageCompressor.ts` / `audioCompressor.ts`
  - 未有：UGC tutorial 接入 `MatchRoom` 的 `/play/:gameId/tutorial` 真正加载 UGC tutorial manifest
  - 未有：`PLAY_SFX` 到宿主实际音频播放的闭环；`onPlaySfx` 仅存在于 `src/ugc/runtime/hostBridge.ts` 配置接口，当前 UGC board/host 未接入实际播放器

### 新增 stale change 判定
- `add-ugc-rule-execution-framework`
  - 提案要求“无手动代码编辑器、仅外部 AI 粘贴导入”
  - 现实实现保留 `rulesCode`、render code、property hooks、sandbox 预览，主线已不是该提案方向
- `ugc-builder-v2`
  - 提案要求分层 `GameBundle` / `SandboxAPI` / 去掉手写代码入口
  - 现实实现未转向该架构，且与当前 `UnifiedBuilder` 主线冲突

### 当前 active changes（2026-03-25 本轮收口后）
- `add-cross-game-ai-system`
- `add-ai-pr-review-merge-automation`
- `add-ugc-runtime-and-audio-pipeline`
- `add-dicethrone-2v2-team-mode`
- `add-refresh-token-auth`

## Addendum（2026-03-25）：大厅模式入口产品化收口
- 当前用户质疑点是合理的：不能在还没讨论清楚策略层之前，就把“AI 已经定案”传达给用户。
- 因此入口层应该先表达“模式”，而不是表达“配置器”：
  - `教程模式`：学习 / 演示
  - `单机模式`：本地双人或多人同屏，不涉及 AI
  - `对战AI`：直达本地逻辑 AI
- `单机模式` 必须显式覆盖 `seat1=human`。否则在支持 `localAi` 的游戏里，默认 seat 推导会把第二个座位变成 `local-ai`，这和“单机模式”的用户预期冲突。
- `对战AI` 改成直达后，当前产品语义更准确：
  - 入口层面已经清楚区分“本地真人对战”和“本地逻辑 AI 对战”
  - 运行层面仍然只是 baseline 逻辑 AI，不代表策略范式已经定成行为树
- 现有 AI 框架的真实抽象仍然是 `legalActions -> decide(context)`：
  - 这更像一个通用决策接口
  - 上层可以接规则优先级、utility scoring、搜索、MCTS，甚至后续再包一层行为树
  - 所以当前入口改动不会锁死后续策略演进方向

## Addendum（2026-03-25）：OpenSpec 收口事实最终补充

### `add-ai-pr-review-merge-automation` 目前只有变更文档，没有仓库级自动化落地
- `openspec/changes/add-ai-pr-review-merge-automation/tasks.md` 12 个实现项全部未勾选。
- `.github/workflows/` 目前只有：
  - `android-release-build.yml`
  - `docker-publish.yml`
  - `quality-gate.yml`
- 全仓搜索未见：
  - AI PR review workflow
  - auto-merge workflow
  - `workflow_run` merge gate
  - `pull_request_target` / `issue_comment` 驱动的 PR 自动审查实现
  - 原始 PR comment / check summary 的自动回写实现
- `.windsurf/skills/github-pr-review-merge/SKILL.md` 只是项目内 skill 说明，不是 GitHub Actions / bot 自动化实现。
- 结论：该 change 尚未进入实施阶段，应继续保留 active。

### `add-dicethrone-2v2-team-mode` 有局部预埋，但远未达到归档条件
- 已存在的局部预埋：
  - `src/games/dicethrone/rule/王权骰铸规则.md` 已补入 2v2 / Targeting Roll 规则文档。
  - `src/games/dicethrone/domain/rules.ts` 已有 `isTeamMode`、`getTeamId`、`areTeammates`、`getTeammateId`、`getOpponents`、`getLeftOpponentId`、`getRightOpponentId`。
  - `src/games/dicethrone/domain/core-types.ts` / `types` 侧已有 `teamIdByPlayerId`、`seatingOrder` 相关入口痕迹。
- 未落地的主链能力：
  - `src/games/dicethrone/manifest.ts` 仍为 `playerOptions: [2]`
  - `src/games/dicethrone/game.ts` 仍为 `minPlayers: 2` / `maxPlayers: 2`
  - 未见 4 人建房与 4 座位入座链路
  - 未见共享体力结算主链
  - 未见 2v2 `Targeting Roll` phase 接入
  - 未见顶部三窗、目标选择面板、站位面板等 UI 主链
  - 大量攻击/防御/效果代码仍按单一 `defenderId` + 双人假设运作
- 结论：这是“少量底层 helper 预埋 + 产品主链未做”，必须继续保留 active。

### `add-refresh-token-auth` 仍缺统一 401 自动刷新 + 单飞重试闭环
- 已完成部分：
  - `apps/api/src/modules/auth/auth.controller.ts` 已有 refresh/logout 接口与 refresh cookie 下发。
  - `apps/api/src/modules/auth/auth.service.ts` 已有 refresh issue / rotate / revoke。
  - `src/hooks/useTokenRefresh.ts` 已有定时刷新与页面恢复可见时刷新。
- 缺口仍然明确：
  - 全仓仍有大量业务请求直接手写 `fetch` + `Authorization: Bearer ${token}`
  - 例如：
    - `src/api/review.ts`
    - `src/api/user-settings.ts`
    - `src/contexts/SocialContext.tsx`
    - `src/core/cursor/cursorPreference.ts`
    - 多个 `src/pages/admin/*.tsx`
  - `src/services/matchApi.ts` 遇到 401 仍是直接清本地 token，不是 refresh 后重试。
- 结论：refresh token 已上线，但 spec 里的统一请求层自动续签闭环并未全面落地，不能归档。
## 新发现（2026-03-26，AstrBot provider 闭环）
- 当前工作区在 AI 这条线上存在“测试口径比实现更完整”的漂移：`tictactoe` 测试已经假定存在 `remote-ai` 的 `timeout / retry / fallback / source` 语义，但原始 `localRunner` 只覆盖 `local-ai`。
- 远程 provider 的正确边界不应把鉴权信息塞进 `seat0=remote-ai:...` 这种 query 参数里；更合理的做法是：
  - seat controller 只保留 provider 选择与运行时调参（如 `providerId / timeoutMs / retryCount / fallbackPolicyId`）
  - endpoint / apiKey / 默认 timeout / 默认 retry 由 provider 注册层读取环境配置
- AstrBot 默认 provider 现已按通用 HTTP provider 方式接入，发送的是结构化 `AiDecisionContext`，而不是拼 prompt 字符串后把返回结果直接当命令执行。
- 远程 AI 的 fallback 仍然坚持统一门控：
  - provider 返回非法 actionId -> 不执行，回退到本地 policy 或首个合法动作
  - provider 抛错 -> 不阻塞对局，回退
  - provider 超时 -> 不无限等待，回退
  - provider 重试成功 -> 直接采用远程结果，但仍只允许命中 `legalActions`
- 这轮实现后，`LocalGameProvider` 终于和 `tictactoe`/`dicethrone` 测试口径重新对齐：统一入口为 `resolveNextAiAction(...)`，而不再是“React 侧假定有远程 AI，Runner 侧实际上没有”。
## 新发现（2026-03-26，训练数据治理）
- 当前训练样本最合适的第一阶段治理方式不是直接进 Mongo，而是保留 JSONL raw log，但把目录结构升级为“`raw/archive + schemaVersion`”三层隔离。
- `schemaVersion` 只要出现在样本本身，就应该直接参与路径分层；这样未来出现 v2/v3 样本时，不需要迁移旧日志，也不会把不同版本混写到同一文件。
- 对低活跃站点，raw 保留期默认 30 天即可，过期后迁入 archive 目录，比一开始就做数据库清洗管线更轻、更稳，也更符合当前用户量。
- 归档策略不需要额外守护进程也能落地：在 recorder 的日常写入路径上做“每天最多一次”的归档检查，就足以把治理成本控制在很低水平。
- 这条链路完成后，后续无论是做离线清洗、抽样评估、微调数据准备，还是接 AstrBot/远程 AI，都可以直接消费同一批版本化日志，不需要再回头补采集。
