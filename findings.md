# Findings: BoardGame 多线并行调查 / 修复 / 收口

## 新发现（2026-03-27，Dice Throne 本地 AI 入口）
- 跨游戏 AI 主线当前并不是“框架还没做完”，而是已经完成到可运行状态；真实缺口转移到了用户入口层。
- `LocalMatchConfigModal`、seat controller、`LocalMatchRoom`、Dice Throne 评分式本地 AI、远程 provider 契约和训练采集都已存在，说明“本地 AI 能不能跑”这个问题实际上已经解决。
- 真正导致用户在详情页看不到“对战 AI / 单机模式”的原因有两个：
  - `src/games/dicethrone/manifest.ts` 仍写着 `allowLocalMode: false`，直接把本地入口隐藏掉了。
  - `src/components/lobby/GameDetailsModal.tsx` 的“本地游玩”此前仍是直接跳 `/local`，没有接已经做好的 `LocalMatchConfigModal`。
- 因此这条线的最小正确修复不是继续写 AI 逻辑，也不是提前接 AstrBot，而是把“现有 AI 能力”真正暴露给用户。
- 当前补齐后，Dice Throne 的本地入口已经与通用 AI 框架接通；后续再做 AstrBot 或更多游戏 AI 时，可以沿用同一套详情页 -> 座位配置 -> 本地房间链路。

## 新发现（2026-03-27，移动端顶层容器锚定）
- 当前未提交改动的真实主线是“游戏容器内的加载/连接中遮罩误用 viewport 锚定”，而不是新的玩法或领域逻辑改动。
- `LoadingScreen` 之前只有“全页 fixed”与“普通 relative”两种布局语义，不足以表达“占满当前游戏容器，但不要逃逸到整个页面视口”的第三种场景；新增 `anchor=\"container\"` 后，这个语义才被显式建模出来。
- 这次修复的关键不在单个页面，而在一组共同入口：`CriticalImageGate`、`TutorialSelectionGate`、`BoardBridge.loading`、`ConnectionLoadingScreen`、以及游戏板本身的防御性 loading fallback。
- 人工查看证据图后可以确认两个核心结果：
  - `D:\gongzuo\webgame\BoardGame\test-results\evidence-screenshots\mobile-character-selection\character-selection-mobile-landscape.png` 中，Dice Throne 选角层被约束在横屏容器内，没有再把页面向右撑出。
  - `D:\gongzuo\webgame\BoardGame\test-results\evidence-screenshots\add-critical-image-preloading\critical-image-gate-loading.png` 中，SmashUp LoadingScreen 的法阵和文案都位于容器视觉中心，没有被顶层 fixed 层拉偏。
- 这轮验证说明 `anchor=\"container\"` 没有破坏原有加载链路：SmashUp 仍能从 LoadingScreen 正常过渡到派系选择界面。
- 后续若再遇到“游戏内某个 loading/遮罩把整个页面盖住、导致移动端顶层容器溢出或定位异常”的问题，应优先检查是否误用了 `viewport` 锚定，而不是直接继续调外层 CSS。

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

## 2026-03-28 DiceThrone simple-start 基础设施抖动收敛发现

- `simple-start` 不是“新角色”或“新功能”，而是当前 DiceThrone 在用的主回归 E2E 文件；它的问题如果不澄清，后续很容易把一次测试基础设施修复误记成业务能力新增。
- 先前 `setupDTOnlineMatchWithPlayers()` 偶发返回 `null`，表面上会把测试退化成 `skip`，但根因并不总是游戏逻辑失败，而是 setup 探针与网络层过于脆弱：
  - 旧版 `ensureGameServerAvailable()` 用创建房间当健康检查，本身就会把瞬时连接抖动放大成“服务器不可用”；
  - 房间创建 / claim-seat / join 这几步缺少小范围重试，遇到 `ECONNREFUSED`、`ECONNRESET`、`ETIMEDOUT`、`socket hang up`、`fetch failed` 或 `408/425/429/5xx` 时会直接短路。
- 这轮最小正确修复不是改业务断言，也不是把 `skip` 改成硬失败，而是把 setup 层做成更接近真实联机环境的韧性实现：
  - 用只读的 `GET /games` 轮询代替创建房间探针；
  - 将 server available timeout 提高到 `15000ms`；
  - 对 create / claim-seat / join 增加瞬时网络重试；
  - 把重试与失败上下文写入 `temp/dicethrone-setup-debug.log`，让后续排障有可审计落点。
- 修复后最关键的事实不是单用例恢复，而是默认整文件脚本 `npm run test:e2e:ci:file -- e2e/dicethrone-simple-start.e2e.ts` 已重新拿到 `12 passed`；这说明当前 `simple-start` 的残余问题不再表现为稳定可复现的 setup 回退。

