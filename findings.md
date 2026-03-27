# Findings: BoardGame 多线并行调查 / 修复 / 收口

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

---

## Addendum（2026-03-25）：Dice Throne 枪手

### 规范与真相源
- `docs/ai-rules/data-entry.md` 已切换到本轮要求的口径：
  - 汉化图片可作为主真相源
  - 必须先切图，再录入
  - Wiki 仅作对照，不是真相源
  - 每个技能都必须记录触发条件/时机
  - 录入范围必须覆盖技能、提示板、atlas/json、图标和资源引用
- 枪手规则文档已补成“可审计录入包”：
  - `src/games/dicethrone/rule/枪手真相源表.md`
  - `src/games/dicethrone/rule/枪手录入核对.md`

### 图片与对照
- 已新增裁图脚本：`scripts/assets/extract-dicethrone-gunslinger-crops.mjs`
- 已生成枪手角色板与提示板的关键裁图，足够支撑当前 `枪林弹雨！`、`quick-draw`、`loaded / bounty / knockdown / evasive` 等条目核对。
- 当前仍有待裁定冲突：
  - `装填弹药` 的使用时机，汉化提示板与 Wiki `Gunslinger Status Effects` 口径不完全一致；已登记到冲突表，未擅自裁决。

### 代码链路发现
- `fill-em-with-lead` 已接入：
  - 终极技本体
  - `loaded` 奖励骰
  - 奖励骰一次重掷
  - 重掷结果按“一半向上取整”并入当前攻击 bonus damage
  - `bounty` 对伤害计算与 CP follow-up 的影响
- 本轮发现并修复了一个通用缺陷：
  - `offensiveRollEnd` Token 选择事件会带 `tokenId + value`
  - reducer 原先先按通用选择逻辑做 `+value`
  - 再由 `use-crit / use-accuracy / use-loaded` 等自定义 effect 扣除
  - `crit` / `accuracy` 因堆叠上限是 1，问题被上限掩盖
  - `loaded` 堆叠上限是 2，因此暴露成“选择使用后最终仍剩 1”
- 修复策略：
  - 对 `activeUse.timing` 含 `onOffensiveRollEnd` 且 `customId` 形如 `use-*` 的 Token，跳过 reducer 的通用 token 增量，改由 choice effect 负责真实消耗。

### 已确认结论
- `枪林弹雨！` 现在的最终伤害链路正确：
  - base 10
  - `bounty` +1
  - `loaded` 奖励骰重掷后按半数向上取整 +3
  - 最终合计 14
- `loaded` 现在会被正确消耗，不再因为通用选择链路的 `+1` 抵消。
- 动作日志已补上 `loaded` 的 `offensiveRollEndTokenEffect` 文案映射。

## Addendum（2026-03-25）：枪手卡图逐卡录入发现
- `ability-cards.webp` 实际尺寸为 `6740 x 7372`，不是 `ability-cards-common.atlas.json` 的原始尺寸；必须按比例缩放后裁图。
- 枪手卡图前 `18` 格可与通用牌一一对应，但顺序是：
  - `slot-00 transfer-status`
  - `slot-01 what-status`
  - `slot-02 one-throw-fortune`
  - `slot-03 get-away`
  - `slot-04 super-double`
  - `slot-05 double`
  - `slot-06 bye-bye`
  - `slot-07 flick`
  - `slot-08 boss-generous`
  - `slot-09 next-time`
  - `slot-10 unexpected`
  - `slot-11 worthy-of-me`
  - `slot-12 surprise`
  - `slot-13 me-too`
  - `slot-14 i-can-again`
  - `slot-15 give-hand`
  - `slot-16 just-this`
  - `slot-17 play-six`
- `slot-18` 之后是枪手专属区，但其中 `slot-22 / slot-23 / slot-24` 不是单卡单格，而是上下叠放两张卡，已额外拆出：
  - `fan-the-hammer-2`
  - `pistol-whip`
  - `take-cover-2`
  - `mark-the-target`
  - `deadeye-2`
  - `the-law`
- `slot-32` 为空白，不是正式卡位。
- 原图右下角的枪手人物图不是卡牌，但属于图片收集信息，已裁出 `hero-portrait-extra.webp` 并登记。
- 当前最重要的实现风险不是 OCR，而是“atlas 顺序假设错误”。如果直接把枪手专属卡照搬到旧 `previewRef.index` 约定里，UI 预览会错卡。

## Addendum（2026-03-25 晚）：继续实施前的代码边界确认
- `src/games/dicethrone/heroes/gunslinger/cards.ts` 现在仍只做 `injectCommonCardPreviewRefs(COMMON_CARDS, DICETHRONE_CARD_ATLAS_IDS.GUNSLINGER)`，尚未接入任何枪手专属卡。
- `src/games/dicethrone/domain/commonCards.ts` 的默认通用牌 atlas 顺序是：
  - 专属卡 `index 0-14`
  - 通用牌 `index 15-32`
  - 这与枪手汉化卡图的真实顺序不一致；枪手必须走独立映射，不能继续复用默认 `COMMON_ATLAS_INDEX`。
- `src/games/dicethrone/domain/core-types.ts` 已有足够的卡牌表达能力：
  - `AbilityCard.previewRef`
  - `AbilityCard.playCondition`
  - `AbilityCard.isAttackModifier`
  - 因此枪手正式卡组不需要扩 schema，可以直接落地。
- `src/games/dicethrone/domain/tokenTypes.ts` 的 `rollDie` 条件效果已支持：
  - `bonusDamage`
  - `grantStatus`
  - `grantToken`
  - `cp`
  - `drawCard`
  - `effectKey`
  - 所以 `high-noon` 可以不走 custom action，直接用 `rollDie` 建模。
- 多目标选择仍是当前唯一明确能力缺口：
  - `paladin` 的 `handleConsecrate` / `handleVengeanceSelectPlayer` 证明单目标 `selectPlayer` + `tokenGrantConfigs` 已成熟可复用。
  - 但现有交互层仍是单选玩家；`the-law` 卡面“至多 2 位目标玩家”不能在本轮被完整实现。
  - 在当前 1v1 下可先实现为单目标，并继续把缺口保留在规则/进度记录里，不能宣称已完整支持。

## Addendum（2026-03-25 深夜）：枪手 `wild-west` 可用原语边界
- 现有 bonus dice 原语之前只有两种结算去向：
  - `damage`：把总值直接打到目标
  - `attackBonus`：把总值换算后并入当前攻击 `bonusDamage`
- 枪手 `wild-west` 需要的是第三种语义：
  - 有真实 1 骰展示
  - 有 `loaded` 时可重掷 1 次
  - 但骰值本身不参与伤害计算
- 这轮已确认最小正确扩展是新增 `resolutionMode: 'none'`，让 settlement 仍能走交互与 `BONUS_DICE_SETTLED` 清理链，但不再落额外伤害。
- 因而 `wild-west` 现在不需要再维持“只做 +1 的临时降级实现”，可以直接用通用 `createBonusDiceWithReroll(...)` 落地。
- 同时确认了一点：`gunslinger-card-wild-west` 的语义分类不该有 `damage`，但应该有 `dice`，因为它真实产出 `BONUS_DIE_ROLLED / BONUS_DICE_REROLL_REQUESTED`。

---

## Addendum（2026-03-26）：枪手卡牌运行时状态核对

### 新结论
- `card-the-law` 当前不是“未实现”，而是“已按 1v1 单目标兼容实现，但多目标未完成”。
- `card-high-noon` 的 `rollDie` 分支现在能正确把 `dash` 结果施加到对手 `knockdown`，没有串到自己身上。
- `upgrade-revolver-2` 的 `replaceAbility` 已经不是静态数据存在而已，运行时出牌后会真实替换玩家技能定义，并把 `abilityLevels.revolver` 写成 `2`。
- `枪手卡牌录入核对.md` 中大量“待代码落地”已经过期；如果不改，会继续误导后续录入/审计判断。

### 仍保留的缺口
- `card-the-law` 原卡面是“至多 2 位目标玩家”，当前交互层只有单目标玩家流，因此只能在 1v1 对局中兼容为唯一对手。
- 这不是数据录入问题，而是明确的交互能力缺口；已经在代码里加了显式 TODO，不应再被当作“遗漏备注”。

---

## Addendum（2026-03-26）：动作层 `unblockable` 消费缺口

### 新结论
- `EffectAction` 早就定义了 `unblockable?: boolean`，但 `resolveEffectAction()` 里的伤害路径此前没有消费它。
- 这会让卡牌动作层写明“不可防御伤害”的效果，仍错误地进入 `shouldOpenTokenResponse()`，从而给 `protect` 一类减伤 Token 留出响应窗口。
- 这不是枪手独有的建模问题，而是动作层伤害语义的通用缺口；本轮先按最小范围修到可用。

### 本轮落地
- 在 `src/games/dicethrone/domain/effects.ts` 中，`action.unblockable === true` 的动作伤害现在会跳过 Token 响应窗口。
- 在 `src/games/dicethrone/heroes/gunslinger/cards.ts` 中，`card-pistol-whip` 的 1 点伤害已显式标记为 `unblockable: true`。
- 回归验证显示：圣骑士带 `protect` 时，枪手 `pistol-whip` 仍会造成 1 点伤害，且不会消耗 `protect`。

---

## Addendum（2026-03-26）：枪手 `high-noon` 三分支与剩余升级卡回归补齐

### 新结论
- `card-high-noon` 的三个骰面分支现在都已被运行时锁定：
  - `bullet`：造成 `2` 点伤害，且不会触发 `protect`
  - `dash`：只对对手施加 `knockdown`
  - `bullseye`：只对对手施加 `bounty`
- `high-noon` 的 `bullet` 分支虽然没有走 `EffectAction.unblockable` 字段，但当前 `rollDie -> accumulatedBonusDamage` 这条链路本身不会打开 Token 响应窗口，因此实际行为与汉化卡面一致。
- 枪手剩余未覆盖的升级卡替换路径已基本补齐：
  - `upgrade-showdown-2`
  - `upgrade-showdown-3`
  - `upgrade-fan-the-hammer-2`
  - `upgrade-take-cover-2`
  - `upgrade-deadeye-2`
  - `upgrade-duel-2`
  - `upgrade-quick-draw`
- 这些升级卡当前都能在运行时正确写入 `abilityLevels`，并把玩家技能定义替换成对应升级版对象，不再只是静态数据存在。

### 继续确认
- `upgrade-quick-draw` 不只是“替换成升级被动定义”：
  - 出牌后，`loaded` 的通用使用会真正进入一次可重掷的奖励骰结算
  - 重掷完成后会正确回到 `defensiveRoll`
  - 本次回归中，初始掷出 `6`、重掷为 `2`，最终只为当前攻击提供 `+1`

### 仍保留的缺口
- `card-the-law` 仍只支持当前 `1v1` 唯一对手兼容路径，多目标交互未做。
---

## Addendum（2026-03-26）：Dice Throne 武士真相源启动发现
- 当前工作树最初没有 `public/assets/i18n/zh-CN/dicethrone/images/samurai/`，但主仓库 `BoardGame/public/.../samurai/` 已存在汉化压缩图与 3 张独立状态 icon。
- 本轮已将以下主真相源复制进当前工作树：
  - `compressed/player-board.webp`
  - `compressed/tip.webp`
  - `compressed/ability-cards.webp`
  - `compressed/dice.webp`
  - `icons/compressed/荣誉.webp`
  - `icons/compressed/耻辱.webp`
  - `icons/compressed/反击.webp`
- 武士提示板 OCR 已稳定读出：
  - `耻辱`：在骰攻击段计算攻击伤害时移除 1 枚，令该次攻击伤害力 `-1`
  - `荣誉`：花费 `1` 枚令攻击伤害 `+1`，或花费 `2` 枚令攻击伤害 `+3`
  - `反击`：被攻击时可花费 1 枚并掷 1 颗骰，对对手造成其结果一半（无条件进位）的攻击修正伤害
- 武士角色板 OCR 已稳定确认以下能力名或效果链：
  - `武士道`
  - `肃穆之仪`
  - `武道`
  - `正宗`
  - `昂首无畏`
  - `征夷大将军！`
  - `slot-02`、`slot-06` 中文名仍不稳定，不能硬写定论
- 武士卡图 OCR 已稳定确认：
  - 前 `18` 格为通用卡
  - `slot-18` ~ `slot-31` 为武士专属与升级卡
  - `slot-32` ~ `slot-39` 当前为空白格
- 当前已确认一个明确实现风险：
  - Samurai Status Effects 页把 `反击` 英文写作 `Retribution`
  - 但项目里 `TOKEN_IDS.RETRIBUTION` 已被圣骑士占用，且语义不同
  - 因此武士后续不能复用圣骑士 token id，必须给出独立命名裁决
- 本轮已补齐派生资源：
  - `public/assets/i18n/zh-CN/dicethrone/images/samurai/compressed/status-icons-atlas.webp`
  - `public/assets/i18n/zh-CN/dicethrone/images/samurai/status-icons-atlas.json`

---

## Addendum（2026-03-26）：Dice Throne 武士 `stand-tall` 防御目标取反
### 新结论
- `src/games/dicethrone/domain/attack.ts` 在结算防御技时，会把防御方作为 `EffectContext.attackerId` 传入，这是当前效果系统的既有约定，不是 bug。
- `src/games/dicethrone/domain/customActions/samurai.ts` 里的 `handleStandTall()` 之前错误地把 `ctx.attackerId` 当成原始进攻方，导致 `katana` 分支的 1 点反打实际打回了武士自己。
- 这个 bug 会把最终血量伪装成“只减了 2 点、没有反打”，因为自伤 1 点会把正确的 3 点减伤表象冲掉，容易误判成护盾计算问题。

### 本轮落地
- 已把 `handleStandTall()` 中的原始进攻方改为读取 `ctx.defenderId`。
- 武士回归现在稳定验证：`1 katana + 1 helm + 1 rising_sun` 会对原攻击者造成 1 点伤害，并为武士提供 3 点减伤。
- 顺手清理了 `src/games/dicethrone/__tests__/token-execution.test.ts` 中既有的 unused 变量 warning，避免本轮验证结果带噪音。

### 仍保留的缺口
- `honor` 仍只支持 `1 -> +1`，未实现图上 `2 -> +3`。
- `Masamune II` 升级差异仍未最终核定。
- `slot-30` / `slot-31` 两张武士攻击修正牌仍待接入。

---

## Addendum��2026-03-27����Dice Throne ��ʿ Honor �������������տ�

### �½���
- `Honor` ��������ʿר��Ӳ�������⣬����ͨ��ͨ�� token ������չ��أ�
  - `TokenUseEffect.valueByAmount`
  - `ActiveUseConfig.allowedConsumeAmounts`
  - `PendingDamage.tokenUsageTotals`
- ���׻�������֤֧�����ֺϷ�·����
  - һ������ `2` �� `Honor`��ֱ�ӵõ� `+3`
  - ��ͬһ��Ӧ�����������θ����� `1` �㣬��һ�θ� `+1`���ڶ���ֻ����ֵ `+2`���ܼ���Ϊ `+3`
- ͬһ��Ӧ���ڴﵽ�ۼ� `2` ��󣬼�ʹ������ϻ��ж��� `Honor`��`getUsableTokensForTiming()` Ҳ����������`validateCommand()` Ҳ��ܾ������μ���ʹ�á�

### �������
- �޸��� `src/games/dicethrone/heroes/samurai/tokens.ts` �Ļ�ע�ͺ��ظ� `effect`��
- �޸��� `src/games/dicethrone/ui/TokenResponseModal.tsx` �Ļ��ַ����ͻ� JSX���ָ������ȶ� lint ��״̬��
- �� `src/games/dicethrone/__tests__/token-execution.test.ts` ������ `Honor` ��ֱ���������������Ļع顣

### �Ա�����ȱ��
- `Masamune II` ����������δ���պ˶���
- `slot-30` / `slot-31` ������ʿ�����������Դ����롣

---

## Addendum（2026-03-27）：Dice Throne 武士 `slot-31 / 残心` 已闭环

### 新结论
- `slot-31` 的证据强度已经足够落地，不需要继续等待更高分辨率素材：
  - 本地裁图可稳定确认它是攻击修正牌 `残心！`
  - 核心语义稳定指向“额外掷 5 颗骰子，然后按武士骰面结算”
  - 该后半段与 `Masamune` 的 5 骰结算同构，可直接复用既有 custom action
- `slot-31` 当前费用落地为 `2CP`，依据是右上角费用区模板比对；这是带证据的临时裁决，不是 OCR 猜值。

### 本轮落地
- 在 `src/games/dicethrone/heroes/samurai/cards.ts` 新增 `card-zanshin`。
- 在 `src/games/dicethrone/__tests__/cross-hero.test.ts` 增加 `card-zanshin` 的跨英雄回归。
- 回填本地化卡名：
  - `public/locales/zh-CN/game-dicethrone.json`
  - `public/locales/en/game-dicethrone.json`

### 仍保留的缺口
- `slot-30 / 舍生取义` 仍只有高层摘要，完整效果与费用都不足以安全落地。
- `Masamune II` 升级差异仍未最终核定，不能因为 `slot-31` 已接入就顺手视为完成。
## Addendum 2026-03-27 slot-31 evidence
- slot-31 has enough local-image evidence to implement now.
- core meaning is stable: roll 5 extra dice, then resolve by samurai faces.
- current 2CP cost is a documented evidence-based judgment, not a guess.
- slot-30 and Masamune II are still unresolved.
---

## Addendum（2026-03-27）：Dice Throne 武士 slot-30 证据裁决
- `slot-30 / 舍生取义` 当前已经具备足够的本地图证，可先落地，不需要继续等待额外 OCR 才能编码。
- 主体语义已经稳定收敛为：掷 `1` 颗骰子并按武士骰面结算。
  - `katana`：`+2` 伤害
  - `helm`：对对手施加 `2 shame`
  - `rising_sun`：获得 `1 samurai_retribution`
- `cpCost` 目前落地为 `2CP`；该值来自左上费用区模板比对，属于有证据的暂定裁决，不是无依据猜测。
- `slot-30` 与 `slot-31` 现均已接入；武士当前真正剩余的规则缺口收缩为 `Masamune II` 升级差异未最终核定。
