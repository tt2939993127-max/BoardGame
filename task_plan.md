# Task Plan: BoardGame 多线并行调查 / 修复 / 收口

## Addendum（2026-03-28）：大厅单机模式 / 对战AI 入口口径回归修正

### Goal
- 修正当前工作树里大厅详情页与本地房间 HUD 的产品语义漂移，恢复 `单机模式`、`对战AI`、`教程模式` 的明确分流，不再把 AI 对局继续叫成“本地同屏”。
- 保持这轮只处理入口口径、默认 seat controller 和相关验证，不扩展到新的 AI 策略实现。

### Result
- [x] `src/components/lobby/GameDetailsModal.tsx` 对支持 AI 的游戏改成双入口：`单机模式` 显式写入全 human 的本地 seat controller，`对战AI` 直达默认本地逻辑 AI 对局。
- [x] `src/pages/LocalMatchRoom.tsx` 与 `src/components/game/framework/widgets/GameHUD.tsx` 接通本地 seat controller 结果，纯真人本地局显示 `单机模式`，存在 AI 座位时显示 `对战AI`。
- [x] 中英文大厅 / 游戏 HUD 文案去掉 `本地同屏` 的用户口径残留，统一为 `单机模式` / `对战AI`。
- [x] 在现有 `src/components/lobby/__tests__/GameDetailsModalJoinConfirm.test.ts` 与 `e2e/lobby.e2e.ts` 中补回归，并把 lobby E2E 首屏 ready 逻辑收敛为 `ensureLobbyReady(...)`，减少启动抖动导致的假失败。
- [x] 验证通过：`npm run typecheck`、`npx vitest run src/components/lobby/__tests__/GameDetailsModalJoinConfirm.test.ts --maxWorkers=1`、`npm run test:e2e:ci:file -- lobby.e2e.ts "Game details modal opens and shows actions"`、`npm run test:e2e:ci:file -- lobby.e2e.ts "Tic-Tac-Toe 对战AI入口会直接进入本地逻辑 AI 对局"`、`npm run test:e2e:ci:file -- lobby.e2e.ts "Tic-Tac-Toe 单机模式入口不会把第二个座位交给 AI"`。

### Next Step
- 若继续 AI 主线，最正确的下一步仍是补各游戏 runtime 的第二层策略，而不是再回头改入口命名；这条入口语义线已经重新和当前实现对齐。

## Addendum（2026-03-28）：召唤师战争本地 AI 首轮接入

### Goal
- 沿用现有跨游戏 AI runtime，把召唤师战争接成第二个真正可运行的战术类本地 AI 试点，优先拿到“选角可走、基础回合可走、不会乱发非法命令”的 baseline。
- 保持范围只落在 `summonerwars` 自己：legal actions 枚举、评分式本地策略、manifest / game 接线，以及现有测试文件中的最小回归。

### Result
- [x] 新增 `src/games/summonerwars/ai.ts`，把召唤师战争接到统一 `legalActions -> scored local policy` 框架，覆盖 `setup`、`summon`、`move`、`build`、`attack`、`magic`、`draw` 与基础交互。
- [x] setup 阶段按真实规则建模为 AI 可行动阶段：房主可选阵营并在条件满足后开始游戏，非房主在选完阵营后可 ready。
- [x] 基于现有领域 helper 枚举主要合法动作：召唤、移动、建造、攻击、无目标主动技能、弃牌换魔力、阶段推进；复杂事件与多目标技能这轮不强求覆盖。
- [x] 落一版评分式 baseline：优先处理交互，选角优先稳定阵营，战斗内优先召唤与高价值攻击，再做移动施压，只有当前阶段没有更高收益动作时才结束阶段。
- [x] 在 `src/games/summonerwars/game.ts` 注册 `summonerWarsAiRuntime`，并将 `src/games/summonerwars/manifest.ts` 打开到 `allowLocalMode: true` / `ai.localAi: true`，使召唤师战争可以进入本地 AI 模式。
- [x] 在现有 `src/games/summonerwars/__tests__/flow.test.ts` 中补回归：验证 setup 阶段 AI 会为房主选择阵营，召唤阶段 AI 会选合法召唤而不是直接结束阶段。
- [x] 验证通过：`npm run typecheck`、`npx vitest run src/games/summonerwars/__tests__/flow.test.ts --maxWorkers=1`、`node scripts/game/generate_game_manifests.js`。

### Next Step
- 若继续 AI 主线，下一步最正确的是补召唤师战争的第二层策略：事件卡目标选择、关键 activated / beforeAttack 技能、以及更强的移动压制评分，而不是现在就转去远程 AI。
- 当前这轮已经把召唤师战争接进了通用本地 AI 主链；AstrBot / remote provider 仍保持后置。

## Addendum（2026-03-28）：Smash Up 本地 AI 首轮接入

### Goal
- 在不继续推进 AstrBot 实网接入的前提下，把大杀四方接到现有跨游戏 AI 主线里，先拿到“本地逻辑 AI 可进局、可走基础回合、4 人座位自然支持”的第一版。
- 保持这轮范围收敛在通用 AI runtime 复用、Smash Up legal actions 枚举、baseline 决策和本地入口开放，不碰当前工作区里并发中的 `bear_cavalry` bug 修复。

### Result
- [x] 新增 `src/games/smashup/ai.ts`，把 Smash Up 接到统一 `legalActions -> scored local policy` 框架，覆盖 `factionSelect`、`playCards`、`scoreBases`、`draw`、响应窗口与基础交互选择。
- [x] 基于当前可见状态枚举本地 AI 候选动作：派系选择、打出随从、打出行动、弃牌至上限、发动天赋、激活 special、阶段推进；复杂目标组合先走“广枚举 + validate 过滤”的保守路线。
- [x] 落一版桌游友好的 baseline scorer：优先交互与响应、优先打随从抢节奏、再补行动与天赋，只有在阶段内无更优动作时才推进阶段。
- [x] 在 `src/games/smashup/game.ts` 注册 `smashUpAiRuntime`，并把 `src/games/smashup/manifest.ts` 打开到 `allowLocalMode: true` / `ai.localAi: true`，让大杀四方在产品入口层真正暴露本地 AI。
- [x] 在现有 `src/games/smashup/__tests__/smashup.smoke.test.ts` 补回归：验证 4 人局派系选择 legal actions 可生成，以及 baseline 在基础出牌阶段优先打随从。
- [x] 验证通过：`npm run typecheck`、`npx vitest run src/games/smashup/__tests__/smashup.smoke.test.ts --maxWorkers=1`、`node scripts/game/generate_game_manifests.js`。

### Next Step
- 若继续 AI 主线，下一步最正确的是补 Smash Up 的第二层策略：围绕基地压力、VP 竞争、多玩家顺时针关系和高价值交互做更细的评分，而不是先上行为树。
- 远程 AI / AstrBot 仍保持后置；等 Smash Up 与更多游戏的本地策略稳定后，再考虑把远程 provider 向在线房间迁移。

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
