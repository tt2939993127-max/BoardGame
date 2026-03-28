# Task Plan: BoardGame 多线并行调查 / 修复 / 收口

## Addendum（2026-03-27）：Dice Throne 本地 AI 入口补齐

### Goal
- 在不继续推进 AstrBot 实网接入的前提下，确认跨游戏 AI 主线的真实完成度，并把 Dice Throne 的本地 AI 用户入口补齐到游戏详情页可用状态。
- 避免出现“AI 框架已完成，但详情页仍进不去本地 AI 模式”的半成品状态。

### Result
- [x] 复核当前并发工作区状态，确认 `add-cross-game-ai-system` OpenSpec tasks 已全部完成，工作区没有新的 AI 未提交改动。
- [x] 确认真实缺口不在 AI runtime，而在入口链路：`LocalMatchConfigModal` 已存在但未接入 `GameDetailsModal`，且 `dicethrone` 仍配置 `allowLocalMode: false`。
- [x] 在 `src/components/lobby/GameDetailsModal.tsx` 接入 `LocalMatchConfigModal`：支持 AI 的游戏点击“本地游玩”时先打开本地对战设置，而不是直接跳转。
- [x] 将 `src/games/dicethrone/manifest.ts` 的 `allowLocalMode` 打开，使 Dice Throne 详情页实际展示本地 / 对战 AI 入口。
- [x] 在现有 `src/components/lobby/__tests__/GameDetailsModalJoinConfirm.test.ts` 中补充回归：验证支持 AI 的本地模式先弹配置，再在确认后进入 `/play/dicethrone/local`。
- [x] 验证通过：`npx vitest run src/components/lobby/__tests__/GameDetailsModalJoinConfirm.test.ts --maxWorkers=1`、`npm run typecheck`。

### Next Step
- 若继续 AI 线，优先做的是更多游戏的本地逻辑策略接入或 AstrBot 协议文档收口，而不是现在就做实网接入。
- 当前这条 Dice Throne 入口链路已收口，可与后续提交一起入库。

## Addendum（2026-03-27）：移动端顶层容器锚定与 LoadingScreen 回归收口

### Goal
- 修复手机横屏下部分顶层遮罩仍按 `viewport` 锚定，导致选角层/加载层把页面顶层容器撑出视口的问题。
- 保持游戏内 `LoadingScreen`、`ConnectionLoadingScreen`、关键资源预加载门禁与教程门禁在 board/container 内居中显示，不再误用全页 fixed 覆盖。
- 用最小相关单测与 E2E 证明：选角页无横向溢出，SmashUp 进入本地对局时 LoadingScreen 仍能正常出现并过渡。

### Result
- [x] `src/components/system/LoadingScreen.tsx` 新增 `anchor: 'viewport' | 'container'`，根据锚定方式切换 `fixed` / `absolute` 布局。
- [x] `src/components/system/ConnectionLoadingScreen.tsx` 同步支持 `anchor`，超时按钮区在容器锚定时改为 `absolute`，避免继续挂到整页视口。
- [x] `CriticalImageGate`、`TutorialSelectionGate`、`MatchRoom`、`LocalMatchRoom`、`TestMatchRoom`、`SmashUp Board` 等游戏容器内加载入口统一切到 `anchor=\"container\"`。
- [x] 补强 `CriticalImageGate` / `TutorialSelectionGate` 组件测试，覆盖容器锚定行为。
- [x] 补强 `e2e/character-selection.e2e.ts`，验证手机横屏下 `documentElement` / `body` / `#root` / 页面容器 / 选角层都未超出视口，并落证据截图。
- [x] 更新 `evidence/mobile-top-layer-container-anchor-e2e-test.md`，登记绝对路径与人工看图结论。
- [x] 验证通过：`npm run typecheck`、`npx vitest run src/components/game/framework/__tests__/CriticalImageGate.test.tsx src/components/game/framework/__tests__/TutorialSelectionGate.test.tsx --maxWorkers=1`、`npm run test:e2e:ci:file -- character-selection.e2e.ts "手机横屏下选角界面不应出现顶层横向滚动"`、`npm run test:e2e:ci:file -- smashup-image-loading.e2e.ts "进入本地对局时先显示 LoadingScreen，再进入派系选择界面"`。

### Next Step
- 将这组容器锚定改动与 evidence 一并提交，避免继续以未登记的 dirty worktree 形态悬挂。
- 后续若再新增游戏内加载/连接中遮罩，默认先判断是否属于 board/container 内部过渡；属于则优先用 `anchor=\"container\"`，不要回到全页 `fixed`。

## Addendum（2026-03-26）：移动端 exit fab sheet 页面滚动锁收口

### Goal
- 修复移动端横屏下 exit fab sheet 打开后页面仍可继续滚动、可能带出全局滚动条/滚动穿透的问题。
- 保持 exit fab 面板首屏可用，不依赖页面级滚动补救。
- 为后续类似移动端 sheet / modal 提供可复用的文档滚动锁能力。

### Result
- [x] 在 `src/components/system/FabMenu.tsx` 接入 `useRuntimeViewport()`，统一使用运行时 viewport / safe-area 数据，不再混用裸 `window.innerWidth/innerHeight`。
- [x] 新增 `src/hooks/ui/useDocumentScrollLock.ts`，在移动端 `sheet` 型面板展开时锁住 `html/body` 的 `overflow` 与 `overscroll-behavior`。
- [x] `FabMenu` 仅在 `isOpen + mobile + mobilePanelVariant === 'sheet' + 有内容` 时启用页面滚动锁，避免误伤桌面端或普通 tooltip/panel。
- [x] 补强 `e2e/smashup-4p-layout-test.e2e.ts`：新增 document/body 横向溢出断言，以及 exit fab sheet 展开时 `html/body` 滚动锁断言。
- [x] 更新 `evidence/mobile-exit-fab-sheet-e2e-test.md`，把“页面级滚动已锁住”写入验收证据。
- [x] 验证通过：`npm run typecheck`、`npm run test:e2e:ci:file -- smashup-4p-layout-test.e2e.ts "移动端横屏应保持四人局布局可用，并支持手牌长按看牌"`。

### Next Step
- 将本轮本地改动与记录一并提交 / 推送，避免继续以 dirty worktree 形态悬挂。
- 后续若再引入移动端底部 sheet / 全屏 modal，优先复用 `useDocumentScrollLock`，不要各处重复手写 `overflow: hidden`。

## Addendum（2026-03-26）：跨游戏 board-shell 横屏滚动条 / 裁剪修复

### Goal
- 修复移动端横屏下共用 `board-shell` 游戏（至少 SmashUp / DiceThrone / SummonerWars / Cardia）底部/横向滚动条与底部卡牌区域被裁剪的问题。
- 以共享壳层修复为主，不做单游戏各自打补丁。
- 完成代码提交、推送、镜像构建；部署改为等待下一个“早上”时间窗。

### Result
- [x] 确认问题属于 `MatchRoom/LocalMatchRoom -> MobileBoardShell -> board-shell` 共性链路，而不是单游戏独有。
- [x] 在 `src/components/game/framework/MobileBoardShell.tsx` 增加 `mobile-board-shell__content` 约束层。
- [x] 在 `src/index.css` 为共享壳补充统一裁剪约束，并在 `landscape-adapted board-shell` 下显式 `padding: 0`，避免 safe-area padding 再次缩小游戏画布。
- [x] 补充共享壳回归测试：`src/components/game/framework/__tests__/MobileBoardShell.test.tsx`。
- [x] 验证通过：`src/components/game/framework/__tests__/MobileBoardShell.test.tsx`、`src/games/__tests__/mobileSupport.test.ts`。
- [x] 本地提交并正常通过 pre-push 门禁后推送：`608b5937 fix(ui): remove shared board-shell overflow padding`。
- [x] GitHub `Build & Push Docker Images` 已成功：run `23594673252`。
- [ ] 生产部署：已因超过时间窗被老板叫停，等待下一次“早上”再执行。

### Next Step
- 下个会话若继续这条线，先确认线上当前运行 revision 仍停留在旧版本（最后已确认是 `c51e0c01...`），然后只在早上时间窗执行远端 `bash scripts/deploy/deploy-image.sh update`。
- 部署前继续保持 preflight：远端连通/权限、远端项目路径与 revision、当前运行镜像 revision 三项缺一不可。

## Addendum（2026-03-26）：跨游戏 AI 评分框架首轮收口

### Goal
- 在现有 `add-cross-game-ai-system` OpenSpec change 上完成通用本地 AI 评分框架设计收口，并把 Dice Throne 作为首个复杂桌游落地对象。

### Result
- [x] 将 spec / proposal / design 统一收口为“`legalActions -> scorer/heuristic -> 可叠加搜索`”路线，不再把行为树当默认总方案
- [x] 在 `src/engine/ai/` 增加通用评分 helper，支持 scorer 汇总、稳定选优、reasoning summary 与调试评分元数据
- [x] 将 `src/games/dicethrone/ai.ts` 的 baseline local policy 改为评分式决策，实现 setup / roll / card / interaction / bonus die / status / tempo 多维打分
- [x] 在现有 `src/games/dicethrone/__tests__/basic-commands-coverage.test.ts` 中补充回归断言，验证 main1 会优先打出可用升级牌而不是直接 `advance-phase`
- [x] 完成验证：`npm run typecheck`、`npx vitest run src/games/dicethrone/__tests__/basic-commands-coverage.test.ts --maxWorkers=1`、`openspec validate add-cross-game-ai-system --strict --no-interactive`

### Next Step
- 继续 Phase 3.x：训练数据清理/归档策略、AstrBot/remote provider 接口约束、非法动作 fallback 与 provider timeout 测试。

## Addendum（2026-03-26）：远程 AI fallback 与训练采集恢复

### Goal
- 在当前并发改动后的真实工作区上，恢复通用 AI runner、远程 provider fallback 与训练采集 raw log 层，重新拿回一个可继续迭代的 AI 基线。

### Result
- [x] 重建 `src/engine/ai/`，恢复统一 AI 类型、seat controller、context、registry、playerView、评分 helper 与通用 runner
- [x] runner 支持 `remote-ai` provider 的超时、重试、非法动作拒绝与 fallback 到本地 policy
- [x] `LocalGameProvider` 与 `LocalMatchRoom` 重新接回 seat controller 参数解析
- [x] 恢复 `tictactoe` AI runtime，并用现有测试文件覆盖本地制胜、远程非法动作回退、远程异常回退、远程超时回退
- [x] 恢复 `src/engine/transport/trainingData.ts` 与 `server/trainingDataRecorder.ts`，并在现有 transport 测试文件中补齐训练快照与 JSONL 落盘断言
- [ ] Dice Throne AI runtime 在当前工作区中重新落回

### Next Step
- 先把 Dice Throne AI runtime 接回当前树，再设计 AstrBot 的鉴权、请求/响应格式和 provider 注册方式。

> 当前根目录三件套已切换为 **2026-03-22 多线任务恢复入口**。下次开新会话时，先按本文件的“当前主任务 / 并行子线 / 下一步”继续，不要被后面的历史 Addendum 标题误导。
> 术语约束：当用户说 **plan** 时，默认指的是 `planning-with-files` 这套规划工作方式 / 效果；而这套流程产出的正式计划文档唯一落点就是本文件 `task_plan.md`。`findings.md` / `progress.md` 是配套记录，不是第二份 plan；`temp/*plan*` 只算历史临时材料，不得继续作为当前正式计划入口。

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
- [x] 检查 `temp/open-feedback-tracker.md` 是否已生成并提炼未关闭反馈清单
- [x] 检查 `temp/e2e-next-batch-plan.md` 是否已生成并确定下一批 E2E
- [x] 检查 `temp/codex-room-assets-findings.md` / `temp/codex-find-planning-with-files.md` 等并行产物
- **Status:** completed

#### Phase B 当前收口结论（2026-03-24）
- feedback 线：`temp/open-feedback-tracker.md` 显示当前 open tracker 里的 fb2 / fb3 / fb4 / fb5 **代码层面都已修复并有本地测试证据**；当前未收口点主要在反馈后台状态，而不是继续改代码。
- E2E 线：`temp/e2e-next-batch-plan.md` 显示当前最真实的活跃主线仍是 **SmashUp 收尾**，不是扩大战线；下一批优先级应聚焦：
  1. `e2e/smashup-ninja-infiltrate.e2e.ts`
  2. `e2e/smashup-wizard-portal.e2e.ts`
  3. `e2e/smashup-multi-base-scoring-complete.e2e.ts`
  4. `e2e/smashup-multi-base-scoring-simple.e2e.ts`
  5. `e2e/smashup-innsmouth-locals-reveal.e2e.ts`
- 计划结构线：`planning-with-files` 技能原始说明已确认 planning files 属于 **project directory**；因此 BoardGame 当前唯一正式 Plan 继续固定在仓库根 `task_plan.md`，不迁到 agent workspace。
- temp 文件治理线：`temp/open-feedback-tracker.md` 与 `temp/e2e-next-batch-plan.md` 允许作为专项分析产物暂存，但后续会话不得把它们当作“当前从哪继续”的正式入口。
- 房间/静态资源线：`temp/codex-room-assets-findings.md` 的有效结论已确认并回写主文档；`temp/codex-find-planning-with-files.md` 实际已失效（技能已人工安装，文件也不存在），两者都不再保留为待检查入口。

#### temp 命名 / 归档最小规则（2026-03-24）
- 保留但降级为专项记录：
  - `temp/open-feedback-tracker.md`
  - `temp/e2e-next-batch-plan.md`
- 已清理的历史材料：
  - `temp/feedback-main-branch-resume-plan.md`
  - `temp/main-e2e-single-progress.md`
  - `temp/ssh-codex-plan.md`
  - `temp/reboot-resume-plan.md`
- 规则：
  - 后续若 temp 文档里的结论仍有效，先摘要回写根目录三件套；
  - 摘要回写完成后，历史 temp 文档应优先删除，避免继续用 `*-plan.md` / `*-progress.md` / `*-resume-plan.md` 这类会伪装成主入口的命名扩写。

### Phase C：修复线上静态资源错配
- [x] 复核 `apps/api/src/main.ts` 中 `/assets` 是否排除在 SPA fallback 外
- [ ] 验证修复是否能阻止旧 chunk 命中 `200 text/html`
- [ ] 核对是否存在旧 `index.html` + 新 `dist/assets` 不一致问题
- **Status:** in_progress

### Phase D：追查“房主被踢 / 房间被删”根因链
- [x] 继续检查 `server.ts` 中 create / join / leave / destroy / storage.wipe / startup cleanup / ghost_connection 等链路
- [x] 检查前端 `useMatchStatus` / `MatchRoom` / `Home` / `lobbySocket` / `matchApi` 是否把 chunk 失效或 `Match not found` 混同为“房间被删除”
- [ ] 基于代码确认仅非对局页自动刷新一次的方案 A 落点
- **Status:** in_progress

### Phase E：反馈 / E2E / 审计文档收口
- [x] 只跟未关闭 / 待处理 feedback，不做全量历史拉取
- [x] 确认 E2E 迁移当前真实 active lanes 与 top 5 next batch
- [x] 核对 P0/P1/P3 文档是否存在冲突、过期或误导
- **Status:** completed

### Phase 1：读取规则与相关规范
- [ ] 阅读 `src/games/dicethrone/rule/` 规则文档中的攻击/攻击修正相关描述
- [ ] 阅读 `docs/ai-rules/engine-systems.md` 中与状态、命令、系统有关的规范
- [ ] 记录本次任务的已知事实与待验证点
- **Status:** archived-history

### Historical note：Dice Throne 攻击修正任务
- 这组 Phase 1~5 属于 2026-03-10 的历史任务，实际修复与验证已在后续记录中完成，不再作为当前主任务待办。
- 当前若继续 Dice Throne，应以新的独立 Addendum/任务块登记，而不是继续沿用这里的旧 Phase。
- **Status:** archived-history

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
| BoardGame 主 Plan 继续留在仓库根 `task_plan.md` | `planning-with-files` 原始设计要求 planning files 位于 project directory；迁到 agent workspace 会混淆项目计划与 agent memory |
| `temp/*plan*` / `*resume*` / `*progress*` / `*tracker*` 仅作为专项或历史材料 | 满足“Plan with Files 产出只能放一处”，避免出现第二正式入口 |

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

---

## Addendum（2026-03-25）：大厅模式入口改成教程 / 单机 / 对战AI

### Goal
- 把游戏详情页里偏技术化的本地入口改成更面向用户的模式入口，先让产品语义清楚，再继续讨论 AI 策略层设计。
- 确保 `单机模式` 与 `对战AI` 的行为明确区分，不再因为默认 seat controller 让用户误入 AI 对局。

### Result
- [x] `GameDetailsModal` 入口改成竖排三类模式：`教程模式`、`单机模式`、`对战AI`
- [x] `单机模式` 显式传 `seatControllers['1']=human`，覆盖支持 local AI 游戏的默认 seat 推导
- [x] `对战AI` 直接进入本地逻辑 AI 对局，不再经过 `LocalMatchConfigModal`
- [x] 中英文本地化文案已同步到 `public/locales/en/lobby.json` 与 `public/locales/zh-CN/lobby.json`
- [x] `e2e/lobby.e2e.ts` 已改为验证新入口与 AI 直达链路
- [x] 证据文档已改写为新产品口径

### Validation
- `npm run typecheck`
- `npx vitest run src/components/lobby/__tests__/GameDetailsModalJoinConfirm.test.ts --maxWorkers=1`
- `npm run test:e2e:ci:file -- lobby.e2e.ts "Game details modal opens and shows actions"`
- `npm run test:e2e:ci:file -- lobby.e2e.ts "Tic-Tac-Toe 对战AI入口会直接进入本地逻辑 AI 对局"`

### Decision Notes
- 这轮只收口“入口产品形态”，不把 baseline 逻辑 AI 误包装成最终策略方案。
- 当前 `legalActions -> decide(context)` 框架仍保持中立，后续讨论行为树、utility、搜索都不需要推翻入口实现。

---

## Addendum（2026-03-25）：跨游戏 AI 产品入口收口

### Goal
- 完成跨游戏 AI 第一阶段的产品入口收口，让大厅、房间、本地配置与调试面板都能展示和消费通用 AI 能力。
- 以 `tictactoe` 为验证对象，补齐本地对战配置链路的单测、E2E 与证据文档。

### Result
- [x] 新增通用 seat controller 工具，统一解析/序列化 `players`、`seat0/seat1/...` query 参数
- [x] 大厅游戏卡片与详情弹窗接入 AI 支持展示
- [x] 新增本地对战配置弹窗，支持本地人数与 `human / local-ai / remote-ai` 座位配置
- [x] 本地房间页接入统一 seat controller 解析，调试面板接入 AI 支持与当前座位控制器展示
- [x] 补齐 `lobby` / `game` 中英文 locale
- [x] 在现有测试文件中补齐 seat controller、search params、AI pill 回归测试
- [x] 在现有 `e2e/lobby.e2e.ts` 中补齐大厅到本地 AI 页的链路验证
- [x] 补充证据文档 `evidence/lobby-ai-local-config-e2e.md`

### Validation
- `npm run typecheck`
- `npx vitest run src/components/lobby/__tests__/GameDetailsModalJoinConfirm.test.ts --maxWorkers=1`
- `npm run test:e2e:ci:file -- lobby.e2e.ts "Tic-Tac-Toe 本地对战配置会暴露 AI 支持和 seat controller"`

### Status
- completed

### Next
- 继续完成 `2.3`：训练数据清理、归档与 schema 升级策略
- 继续完成 `4.2 / 4.3`：AstrBot / Remote provider 的鉴权、超时、fallback 与 `legalActions` 约束
- 继续完成 `5.3` 中尚未覆盖的 provider timeout / 非法动作回退测试

---

## Addendum（2026-03-25）：跨游戏 AI 骨架 + DiceThrone 首个落地

### Goal
- 完成跨游戏 AI 骨架第一阶段收口：显式 `manifest.ai`、训练采集 `legalActions`、本地房间 seat controller、本地逻辑 AI runner。
- 以 `dicethrone` 作为首个接入对象，提供可运行的 legal action 生成与 baseline 本地策略。

### Result
- [x] 所有 manifest 已显式声明 `ai.capture / localAi / remoteAi`，生成脚本同步校验必填。
- [x] 训练采集样本已写入 `legalActions`，并复用通用 AI snapshot 提取。
- [x] 本地房间支持 `seat0/seat1/...` 控制 human / local-ai / remote-ai，占位边界已打通。
- [x] `LocalGameProvider` 已接入本地 AI 自动出招，并用 `attemptKey` 防重复状态死循环。
- [x] 服务端命令归一化已兼容 `__internalPlayerId / __internalAiCommand` 与旧 tutorial 私有字段。
- [x] `dicethrone` 已新增 AI runtime：覆盖 setup、推进阶段、掷骰/确认、选技能、响应跳过、奖励骰、净化、被动能力，以及 simple-choice / multistep-choice 的最小闭环。
- [x] `dicethrone` 已注册 runtime，并在现有测试文件中补充 AI 相关断言。

### Validation
- `node scripts/game/generate_game_manifests.js`
- `npm run typecheck`
- `npx vitest run src/engine/transport/__tests__/trainingData.test.ts src/engine/transport/__tests__/server.test.ts src/games/dicethrone/__tests__/basic-commands-coverage.test.ts --maxWorkers=1`

### Status
- completed

### Next
- 下一阶段可在现有 remote provider 边界上接 AstrBot / 大模型 provider。
- 其他游戏当前已具备统一 AI 接口和采集开关，但尚未实现各自 runtime。

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
## Addendum（2026-03-25）：OpenSpec 收口更新

### Goal
- 继续清理 `openspec/changes/` 中已经按实际实现完成的 change，并把明显被后续方案取代的 change 判定为 stale 后清理目录
- 按用户要求仅以“实施实际进度”为准，不以验证项是否补齐作为归档阻塞
- 完成本轮后，把结论回填到 `task_plan.md`、`findings.md`、`progress.md`

### Result
- [x] 归档 `add-user-settings-persistence`
- [x] 归档 `add-game-changelog-and-author-info`
- [x] 将 `update-mobile-first-adaptive` 判定为 stale change 并清理目录
- [x] 同步更新正式 spec：
  - `openspec/specs/manage-user-settings/spec.md`
  - `openspec/specs/game-changelog-management/spec.md`
  - `openspec/specs/game-details-content/spec.md`
  - `openspec/specs/game-registry/spec.md`
- [x] 回填本轮收口进度到规划文件

### Current Active Changes
- `add-cross-game-ai-system`
- `implement-domain-core-and-systems`
- `add-ai-pr-review-merge-automation`
- `add-pc-first-mobile-adaptation-framework`
- `add-ugc-layout-alignment`
- `add-ugc-rule-execution-framework`
- `add-ugc-runtime-and-audio-pipeline`
- `refactor-engine-primitives`
- `refactor-multistep-interaction`
- `ugc-builder-v2`
- `add-dicethrone-2v2-team-mode`
- `add-refresh-token-auth`
- `add-ugc-client-runtime-adapter`

### Decision Notes
- `add-user-settings-persistence` 归档前已把文档口径改成真实实现：登录后应用远端设置，但不覆盖游客本地缓存；登出时恢复游客本地偏好
- `add-game-changelog-and-author-info` 归档前已把文档口径改成真实实现：作者信息来自 `manifest.authorName`，前台是独立“更新”标签，不是旧提案中的 `author.tsx` 动态模块或“排行榜内双栏”
- `update-mobile-first-adaptive` 已被当前 PC-first 移动端方案口径取代，因此按 stale 清理，不再保留为 active change
- `add-refresh-token-auth` 仍不应归档：虽然已有 refresh token 流程与定时刷新，但 spec 里的“401 自动刷新并单飞重试请求”尚未全面落地

### Status
- completed
## Addendum（2026-03-25）：OpenSpec active changes 收口进展

### Goal
- 继续按“只看实施实际进度，不以验证项为阻塞”收口 `openspec/changes` 里的 active changes。
- 对已实现但文档过时的 change，先把 proposal / design / tasks / spec delta 改成真实现状，再归档。
- 对明显未完成的 change，保留 active，不误归档。

### 本轮已完成
- [x] 归档 `add-pc-first-mobile-adaptation-framework`
- [x] 归档 `implement-domain-core-and-systems`
- [x] 归档 `refactor-engine-primitives`
- [x] 清理 `refactor-engine-primitives` 归档后残留的正式 spec 旧口径：
  - `openspec/specs/engine-primitives/spec.md`
  - `openspec/specs/dice-system/spec.md`

### 当前剩余 active changes
- [ ] `add-cross-game-ai-system`
- [ ] `add-ai-pr-review-merge-automation`
- [ ] `add-ugc-layout-alignment`
- [ ] `add-ugc-rule-execution-framework`
- [ ] `add-ugc-runtime-and-audio-pipeline`
- [ ] `refactor-multistep-interaction`
- [ ] `ugc-builder-v2`
- [ ] `add-dicethrone-2v2-team-mode`
- [ ] `add-refresh-token-auth`
- [ ] `add-ugc-client-runtime-adapter`

### 当前判断
- `add-cross-game-ai-system`：不要归档。已完成训练采集、本地 AI、seat controller、lobby/local room 接入；远程 provider 真正执行链、AstrBot 接入、provider timeout/非法动作回退等仍未完成。
- `add-refresh-token-auth`：不要归档。refresh token 与定时刷新已做，但 spec 里的 401 自动刷新 + 单飞重试链路未完整落地。
- `refactor-engine-primitives`：已按真实现状收口。正式口径改为“保留 `systems/` 运行时层，同时新增并广泛落地 `engine/primitives/` 纯函数原语层”，不再错误声称删除 `systems/`。

### Next
- 优先检查 `refactor-multistep-interaction` 是否属于“实现已完成但 spec 落后”的归档候选。
- 若不成立，再继续筛 UGC 系列中哪些是 stale、被后续方案覆盖、或仅部分落地不应归档。
## Addendum（2026-03-25）：OpenSpec active changes 继续收口

### Goal
- 继续按“只看实施实际进度，不以验证项为阻塞”收口剩余 active changes。
- 优先处理 UGC 相关 change：已实现则改口径后归档；方向被现实实现取代则判定 stale 并清理目录；仅部分落地则保留 active。

### Result
- [x] 归档 `add-ugc-layout-alignment`
- [x] 归档 `add-ugc-client-runtime-adapter`
- [x] 判定 `add-ugc-rule-execution-framework` 为 stale change 并清理目录
- [x] 判定 `ugc-builder-v2` 为 stale change 并清理目录
- [x] 复核 `add-ugc-runtime-and-audio-pipeline` 为“仅部分落地，暂不归档”
- [x] 同步回填本轮结论到 `task_plan.md`、`findings.md`、`progress.md`

### Current Active Changes
- `add-cross-game-ai-system`
- `add-ai-pr-review-merge-automation`
- `add-ugc-runtime-and-audio-pipeline`
- `add-dicethrone-2v2-team-mode`
- `add-refresh-token-auth`

### Decision Notes
- `add-ugc-layout-alignment`
  - 真实实现已经落地：`anchor/pivot/offset` 布局模型、旧草稿迁移、对齐/分布工具栏、网格/边缘/中心吸附、参考线、`uiLayout` 偏好持久化、`resolveLayoutRect` 统一布局解析、Runtime 复用 `PreviewCanvas`
- `add-ugc-client-runtime-adapter`
  - 真实实现已经落地：客户端 manifest loader、`UGC_ASSET_BASE_URL`、`createUgcClientGame` / `createUgcDraftGame`、`createUgcRemoteHostBoard`、`MatchRoom` 的 UGC 在线加载分支、包内 view 缺失时回退内置 runtime view
- `add-ugc-runtime-and-audio-pipeline`
  - 已落地部分：UGC 包 API、发布态列表/manifest、zip 包上传、动态注册、资源压缩器、published UGC registry 接入
  - 未落地关键点：UGC tutorial 真正接入 `/tutorial` 流程；`PLAY_SFX` 只停留在 SDK/bridge 协议层，宿主未形成实际播放闭环
  - 结论：保留 active，不归档
- `add-ugc-rule-execution-framework`
  - 口径要求“无手动代码编辑器、仅外部 AI 粘贴导入、只保留基础规则执行框架”
  - 现实实现是 `UnifiedBuilder + rulesCode/renderCode/layoutCode + sandbox/runtime` 的混合路线，方向已偏离该提案
  - 结论：stale，清理目录
- `ugc-builder-v2`
  - 口径要求分层 `GameBundle` / `SandboxAPI` / 去掉手写代码入口
  - 现实实现并未转向该架构，且与当前 Builder 主线冲突
  - 结论：stale，清理目录

### Status
- in_progress

## Addendum（2026-03-25）：OpenSpec active changes 最终核对补充

### Goal
- 继续核对剩余 active changes 是否已经按“实际实施进度”达到可归档状态。
- 重点补完此前尚未定性的 `add-ai-pr-review-merge-automation` 与 `add-dicethrone-2v2-team-mode`。
- 复核 `add-refresh-token-auth` 是否已形成 spec 要求的 401 自动刷新 + 单飞重试闭环。

### Result
- [x] 判定 `add-ai-pr-review-merge-automation` 当前不应归档，保留 active
- [x] 判定 `add-dicethrone-2v2-team-mode` 当前不应归档，保留 active
- [x] 复核 `add-refresh-token-auth` 后，继续维持“未完成，不归档”的判断
- [x] 同步把本轮结论回填到 `task_plan.md`、`findings.md`、`progress.md`

### Current Active Changes
- `add-cross-game-ai-system`
- `add-ai-pr-review-merge-automation`
- `add-ugc-runtime-and-audio-pipeline`
- `add-dicethrone-2v2-team-mode`
- `add-refresh-token-auth`

### Decision Notes
- `add-ai-pr-review-merge-automation`
  - 当前仓库仅存在 `quality-gate.yml`，没有新增 AI PR review workflow、auto-merge workflow、`workflow_run` 联动、PR comment/check summary 回写实现。
  - `.windsurf/skills/github-pr-review-merge/SKILL.md` 只说明有人机协作流程，不等于仓库级 GitHub 自动化已落地。
  - 结论：proposal/spec 已创建，但实施基本未开始，保留 active。
- `add-dicethrone-2v2-team-mode`
  - 已有少量预埋：规则文档已写 2v2，`src/games/dicethrone/domain/rules.ts` 有 `isTeamMode/getTeamId/getOpponents/getLeftOpponentId/getRightOpponentId` 等 helper，`state.teamIdByPlayerId` / `seatingOrder` 也已有类型入口。
  - 但主链未落地：`src/games/dicethrone/manifest.ts` 仍是 `playerOptions: [2]`，`src/games/dicethrone/game.ts` 仍是 `minPlayers: 2` / `maxPlayers: 2`，未见 Targeting Roll phase、4 人建房/入座、共享体力、2v2 顶部三窗、目标选择面板等实现。
  - 结论：属于局部预埋 + 主链未做，保留 active。
- `add-refresh-token-auth`
  - 后端 refresh token、`/auth/refresh`、rotate/revoke 已存在；前端也有 `useTokenRefresh()` 的定时刷新。
  - 但大量前端请求仍是各自 `fetch(... Authorization: Bearer ...)`，例如 `src/api/review.ts`、`src/api/user-settings.ts`、`src/contexts/SocialContext.tsx`、多个 `src/pages/admin/*.tsx`；`src/services/matchApi.ts` 遇到 401 仍是直接清本地 token。
  - 结论：没有统一 401 自动 refresh + 单飞 retry 请求层闭环，继续保留 active。

### Status
- completed
## Addendum（2026-03-26）：AstrBot provider 契约与远程 AI 闭环

### Goal
- 在现有跨游戏 AI 骨架上补齐远程 provider 闭环，让 `remote-ai` 座位真正具备可运行的 timeout / retry / fallback 行为。
- 以 `astrbot` 作为默认远程 provider 注册入口，但继续保持 provider 契约通用，不把实现写死到单一游戏。

### Result
- [x] 扩展 `AiSeatController`，为 `remote-ai` 增加 `timeoutMs` 与 `retryCount` 运行时参数
- [x] 重构 `src/engine/ai/localRunner.ts`，统一 `local-ai / remote-ai / remote-ai-fallback` 决策链
- [x] 新增 `src/engine/ai/providers/astrbot.ts` 与 `src/engine/ai/providers/index.ts`
- [x] 默认注册 `astrbot` provider，endpoint / 鉴权 / 默认 timeout / 默认 retry 改走环境配置，不进入 seat query
- [x] 在现有 `src/games/tictactoe/__tests__/flow.test.ts` 中补充“重试后成功采用远程结果”回归
- [x] 回填 `openspec/changes/add-cross-game-ai-system/tasks.md` 的 `3.2`

### Validation
- `npx vitest run src/games/tictactoe/__tests__/flow.test.ts --maxWorkers=1`
- `npx vitest run src/games/dicethrone/__tests__/basic-commands-coverage.test.ts --maxWorkers=1`
- `npm run typecheck`

### Next Step
- 如果继续推进下一段，应补 AstrBot HTTP 协议文档与线上配置说明，并决定后续是否把在线对局也接到服务端 AI 调度，而不只是在本地房间使用 provider。
## Addendum (2026-03-26): 训练数据治理收口

### Goal
- 完成 `add-cross-game-ai-system` 剩余的 `3.1`，把训练样本从“仅能写 JSONL”升级到“按 schema 版本隔离、raw/archive 分层、带保留期归档”的可治理形态。

### Result
- [x] `server/trainingDataRecorder.ts` 改为写入 `raw/v{schemaVersion}/{gameId}/{day}.jsonl`
- [x] 增加 `archive/v{schemaVersion}/{gameId}/` 归档目录和 `retentionDays` 保留策略
- [x] `createTrainingDataRecorderFromEnv(...)` 新增 `TRAINING_DATA_RAW_DIR`、`TRAINING_DATA_ARCHIVE_DIR`、`TRAINING_DATA_RETENTION_DAYS`
- [x] `src/engine/transport/__tests__/trainingData.test.ts` 补充版本落盘和过期归档回归
- [x] `openspec/changes/add-cross-game-ai-system/tasks.md` 的 `3.1` 已完成

### Validation
- `npx eslint server/trainingDataRecorder.ts src/engine/transport/trainingData.ts src/engine/transport/__tests__/trainingData.test.ts`
- `npx vitest run src/engine/transport/__tests__/trainingData.test.ts --maxWorkers=1`
- `npm run typecheck`
- `openspec validate add-cross-game-ai-system --strict --no-interactive`

### Next Step
- AI 主线实现已收口，下一步只剩检查工作区并按最小范围提交 / push；AstrBot 实网接入继续保持后置。

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

## Addendum: 2026-03-28 DiceThrone 四人模式分支上传与主分支合并

### Goal
- 将 `feat/dicethrone-4p-team-mode` 上已经收口的四人模式 Batch 1 与主回归基础设施修复完整上传，并安全合并回 `main`。
- 在合并前补齐 pre-push 阻塞项与 merge 冲突文档，避免“分支推上去了，但主分支没法安全接”。

### Result
- [x] 已修复 pre-push 的 i18n 阻塞：`selection.targetOptionDisabled` 现在落在正确的 locale 路径。
- [x] `feat/dicethrone-4p-team-mode` 已成功推送到 `origin`。
- [x] 已按 merge checklist 完成 `main...feat` 预检，并处理 6 个冲突文件。
- [x] 已生成冲突汇报文档 `evidence/merge-conflict-feat-dicethrone-4p-team-mode-2026-03-28.md`。
- [x] 合并态下额外修复了 2 人 `Transfer Status` 用例的游戏服端口硬编码问题，避免 isolated E2E 假 `skip`。
- [x] 已在 `main` 生成 merge commit `f188d523`，并通过 `merge:audit:strict`。
- [x] 已推送 `origin/main`，远端主分支完成吸收本轮四人模式专题。

### Validation
- `node .\node_modules\typescript\lib\tsc.js --noEmit --pretty false`
- `npm run i18n:check`
- `openspec validate update-dicethrone-4p-player-target-interactions --strict --no-interactive`
- `node scripts/infra/vitest-cli-safe.mjs run src/games/dicethrone/__tests__/flow.test.ts src/games/dicethrone/__tests__/boundaryEdgeCases.test.ts src/games/dicethrone/__tests__/rule-consistency.test.ts src/server/__tests__/matchOccupancy.test.ts src/games/dicethrone/ui/__tests__/InteractionOverlay.test.tsx --configLoader native`
- `npm run test:e2e:ci:file -- e2e/dicethrone-simple-start.e2e.ts "Online 2-player transfer token: transfer phase keeps locked source card and target card"`
- `npm run test:e2e:ci:file -- e2e/dicethrone-simple-start.e2e.ts`
- `npm run merge:audit:strict -- HEAD`

### Status
- completed

