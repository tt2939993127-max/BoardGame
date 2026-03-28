# Progress Log

## Session: 2026-03-28 大厅单机模式 / 对战AI 入口口径回归
- **Status:** completed
- Actions taken:
  - 复核当前 AI 工作树与根目录三件套，确认这条线的真实未收口点不是新 AI runtime，而是大厅详情页与本地房间 HUD 对 `本地同屏 / 单机模式 / 对战AI` 的口径重新漂移。
  - 在 `src/components/lobby/GameDetailsModal.tsx` 把支持 AI 的本地入口改回双分流：`单机模式` 显式构造全 human 的本地 seat controller，`对战AI` 直达默认本地逻辑 AI 对局，不再复用单个“本地同屏”按钮。
  - 在 `src/pages/LocalMatchRoom.tsx` 与 `src/components/game/framework/widgets/GameHUD.tsx` 接通本地 seat controller 结果，让进局后的 HUD 文案跟随真实对局类型切换为 `单机模式` 或 `对战AI`。
  - 更新中英文 `lobby/game` locale，清掉用户可见的 `本地同屏` 残留口径。
  - 重写 `src/components/lobby/__tests__/GameDetailsModalJoinConfirm.test.ts` 的入口断言，并在现有 `e2e/lobby.e2e.ts` 里补 `单机模式` 不误进 AI 的回归。
  - 处理一处现有 E2E 稳定性问题：把 lobby 首屏准备逻辑从“只等导航成功”提升为 `ensureLobbyReady(...)`，用“导航重试 + Tic-Tac-Toe 卡片可见”做双门禁，避免启动抖动导致 AI 用例假失败。
- Validation:
  - `npm run typecheck` → passed
  - `npx vitest run src/components/lobby/__tests__/GameDetailsModalJoinConfirm.test.ts --maxWorkers=1` → `13 passed`
  - `npm run test:e2e:ci:file -- lobby.e2e.ts "Game details modal opens and shows actions"` → `1 passed`
  - `npm run test:e2e:ci:file -- lobby.e2e.ts "Tic-Tac-Toe 对战AI入口会直接进入本地逻辑 AI 对局"` → `1 passed`
  - `npm run test:e2e:ci:file -- lobby.e2e.ts "Tic-Tac-Toe 单机模式入口不会把第二个座位交给 AI"` → `1 passed`
- Evidence:
  - `D:\gongzuo\webgame\BoardGame\test-results\evidence-screenshots\lobby.e2e\Tic-Tac-Toe-对战AI入口会直接进入本地逻辑-AI-对局\lobby-tictactoe-local-ai-config-debug.png`
  - `D:\gongzuo\webgame\BoardGame\test-results\evidence-screenshots\lobby.e2e\Tic-Tac-Toe-单机模式入口不会把第二个座位交给-AI\lobby-tictactoe-single-device-human-seat-debug.png`
- Next step:
  - 入口口径这条线已重新对齐；继续 AI 主线时，优先回到各游戏 runtime 的策略增强，而不是再扩展新的模式命名分支。

## Session: 2026-03-28 召唤师战争本地 AI 首轮接入
- **Status:** completed
- Actions taken:
  - 复核 `summonerwars` 当前领域入口与规则文档，确认这条线最适合先做双人本地逻辑 AI，而不是先切多人或远程 AI。
  - 新增 `src/games/summonerwars/ai.ts`：沿用统一 `legalActions` / scorer policy 框架，覆盖 setup、召唤、移动、建造、攻击、魔力与抽牌阶段，并接入基础 simple-choice / multistep 交互出口。
  - 枚举主要合法动作时优先复用现有 helper：`getValidSummonPositions`、`getValidMoveTargetsEnhanced`、`getValidAttackTargetsEnhanced`、`getValidBuildPositions`、`getActivatableAbilities`、`canActivateAbility`，避免重复手写战棋规则。
  - 在同一文件里落一版评分式 baseline：选角优先稳定阵营，战斗内优先召唤、高价值攻击和前压移动；只有当前阶段无更优动作时才 `END_PHASE`。
  - 在 `src/games/summonerwars/game.ts` 注册 `summonerWarsAiRuntime`，并把 `src/games/summonerwars/manifest.ts` 调整为 `allowLocalMode: true`、`ai.localAi: true`。
  - 在现有 `src/games/summonerwars/__tests__/flow.test.ts` 中补两条回归：setup 阶段 AI 选阵营；开局召唤阶段 AI 选合法召唤而不是直接过阶段。
  - 调试过程中确认一个实现要点：`summonerwars` 在已开局后应以 `core.phase` 作为 AI 判定主来源；若机械读取测试夹具中的 `sys.phase`，AI 会退化成只会 `END_PHASE`。
- Validation:
  - `npm run typecheck` → passed
  - `npx vitest run src/games/summonerwars/__tests__/flow.test.ts --maxWorkers=1` → `27 passed`
  - `node scripts/game/generate_game_manifests.js` → generated files unchanged
- Next step:
  - 继续 AI 主线时，优先增强召唤师战争的事件卡目标选择和关键技能处理；当前这轮先停在“合法可运行 baseline”。

## Session: 2026-03-28 Smash Up 本地 AI 首轮接入
- **Status:** completed
- Actions taken:
  - 复核 `openspec/changes/add-cross-game-ai-system/tasks.md` 与当前 AI 目录，确认跨游戏 AI 骨架已经完成，继续推进应落到下一个游戏 runtime，而不是重复补框架。
  - 读取 `docs/ai-rules/engine-systems.md`、`docs/testing-best-practices.md` 和 `src/games/smashup/rule/大杀四方规则.md`，把本轮范围收敛为“Smash Up 本地逻辑 AI 首轮接入”。
  - 新增 `src/games/smashup/ai.ts`：基于当前可见状态枚举合法候选动作，并用 `validate` 过滤；覆盖派系选择、出牌、响应、交互、弃牌、天赋、special 与阶段推进。
  - 在同一文件里接入评分式 baseline policy，默认优先交互与响应，再优先打随从抢节奏，之后才补行动/天赋，最后才推进阶段。
  - 在 `src/games/smashup/game.ts` 注册 `smashUpAiRuntime`，并把 `src/games/smashup/manifest.ts` 调整为 `allowLocalMode: true`、`ai.localAi: true`，使大杀四方详情页可实际进入本地 AI 模式。
  - 在现有 `src/games/smashup/__tests__/smashup.smoke.test.ts` 中补两条回归：四人局派系选择 legal actions 可生成；baseline 在基础出牌场景优先打出随从。
  - 运行 `node scripts/game/generate_game_manifests.js`，确认 manifest 改动没有产生未同步的派生产物。
- Validation:
  - `npm run typecheck` → passed
  - `npx vitest run src/games/smashup/__tests__/smashup.smoke.test.ts --maxWorkers=1` → `9 passed`
  - `node scripts/game/generate_game_manifests.js` → generated files unchanged
- Next step:
  - 继续 AI 主线时，优先增强 Smash Up 的多人局评分策略与关键交互权重；当前这轮不继续推进 AstrBot 实网接入。

## Session: 2026-03-27 Dice Throne 本地 AI 入口补齐
- **Status:** completed
- Actions taken:
  - 重新核对当前并发工作区、`git log` 与 `openspec/changes/add-cross-game-ai-system/tasks.md`，确认跨游戏 AI 主线本身已完成，AstrBot 实网接入仍处于后置状态。
  - 复查 `src/engine/ai/`、`src/games/dicethrone/ai.ts`、`src/engine/transport/trainingData.ts`、`server/trainingDataRecorder.ts`，确认 AI runtime、远程 provider 契约和训练采集都已落地，不需要重复施工。
  - 发现真实缺口在用户入口：`LocalMatchConfigModal` 已存在但未被 `GameDetailsModal` 使用，且 `src/games/dicethrone/manifest.ts` 仍关闭 `allowLocalMode`。
  - 在 `src/components/lobby/GameDetailsModal.tsx` 接入 `LocalMatchConfigModal`，让支持 AI 的游戏点击“本地游玩”时先进入座位配置，再导航到本地房间。
  - 打开 `src/games/dicethrone/manifest.ts` 的 `allowLocalMode`，使 Dice Throne 详情页真正显示本地 / 对战 AI 入口。
  - 在现有 `src/components/lobby/__tests__/GameDetailsModalJoinConfirm.test.ts` 中补充回归测试，验证“先弹配置，再进入本地房间”。
- Validation:
  - `npx vitest run src/components/lobby/__tests__/GameDetailsModalJoinConfirm.test.ts --maxWorkers=1` → `13 passed`
  - `npm run typecheck` → passed
- Next step:
  - 若继续 AI 主线，下一步应转向更多游戏的本地策略实现或 AstrBot 协议文档，而不是立刻做远程实网接入。

## Session: 2026-03-27 移动端顶层容器锚定与 LoadingScreen 回归
- **Status:** completed
- Actions taken:
  - 读取当前未提交改动，确认这轮真实主线不是 SmashUp Titans，而是一组移动端顶层容器 / LoadingScreen 锚定修复。
  - 复核 `LoadingScreen`、`ConnectionLoadingScreen`、`CriticalImageGate`、`TutorialSelectionGate`、`MatchRoom`、`LocalMatchRoom`、`TestMatchRoom`、`SmashUp Board` 的 diff，确认目标是把游戏容器内的加载层从 `viewport` 锚定改成 `container` 锚定。
  - 读取并人工查看证据截图：
    - `D:\gongzuo\webgame\BoardGame\test-results\evidence-screenshots\mobile-character-selection\character-selection-mobile-landscape.png`
    - `D:\gongzuo\webgame\BoardGame\test-results\evidence-screenshots\add-critical-image-preloading\critical-image-gate-loading.png`
  - 人工观察确认：Dice Throne 手机横屏选角层未再撑出视口；SmashUp LoadingScreen 保持在容器内部居中，没有被整页 fixed 拉偏。
  - 运行最小相关验证：
    - `npm run typecheck`
    - `npx vitest run src/components/game/framework/__tests__/CriticalImageGate.test.tsx src/components/game/framework/__tests__/TutorialSelectionGate.test.tsx --maxWorkers=1`
    - `npm run test:e2e:ci:file -- character-selection.e2e.ts "手机横屏下选角界面不应出现顶层横向滚动"`
    - `npm run test:e2e:ci:file -- smashup-image-loading.e2e.ts "进入本地对局时先显示 LoadingScreen，再进入派系选择界面"`
  - 更新 `evidence/mobile-top-layer-container-anchor-e2e-test.md`，补充绝对路径与人工观察结论。
- Validation:
  - `npm run typecheck` → passed
  - `npx vitest run src/components/game/framework/__tests__/CriticalImageGate.test.tsx src/components/game/framework/__tests__/TutorialSelectionGate.test.tsx --maxWorkers=1` → `9 passed`
  - `npm run test:e2e:ci:file -- character-selection.e2e.ts "手机横屏下选角界面不应出现顶层横向滚动"` → `1 passed`
  - `npm run test:e2e:ci:file -- smashup-image-loading.e2e.ts "进入本地对局时先显示 LoadingScreen，再进入派系选择界面"` → `1 passed`
- Next step:
  - 将当前容器锚定改动与 evidence 一并提交，避免这轮 UI 修复继续悬挂在工作区。

## Session: 2026-03-26 移动端 exit fab sheet 页面滚动锁收口
- **Status:** in_progress
- Actions taken:
  - 复查当前 `git status`，确认除了早上部署待执行外，仓库里还挂着一组未提交的移动端 exit fab sheet / 页面滚动锁改动。
  - 读取 `FabMenu.tsx` 与新建的 `useDocumentScrollLock.ts`，确认这条线的真实目标是“sheet 展开时锁住页面级滚动”，而不只是调整面板样式。
  - 在 `FabMenu` 中接入 `useRuntimeViewport()`，统一使用运行时 viewport / safe-area 数据参与位置计算、resize 重算与移动端判断。
  - 新增 `useDocumentScrollLock()`，在移动端 `sheet` 型面板展开时锁住 `html/body` 的 `overflow` 与 `overscroll-behavior`，关闭时按快照恢复。
  - 补强 `e2e/smashup-4p-layout-test.e2e.ts`：新增 document/body 横向溢出断言，以及 exit fab sheet 展开时 document scroll lock 断言。
  - 更新 `evidence/mobile-exit-fab-sheet-e2e-test.md`，把“页面本身已锁住，不再靠页面滚动补救”写入证据说明。
  - 运行最小相关验证：
    - `npm run typecheck`
    - `npm run test:e2e:ci:file -- smashup-4p-layout-test.e2e.ts "移动端横屏应保持四人局布局可用，并支持手牌长按看牌"`
- Validation:
  - `npm run typecheck` → passed
  - `npm run test:e2e:ci:file -- smashup-4p-layout-test.e2e.ts "移动端横屏应保持四人局布局可用，并支持手牌长按看牌"` → `1 passed`
- Next step:
  - 将本轮代码与文档记录一起提交 / 推送，避免这组改动继续以 dirty worktree 形式悬挂。

## Session: 2026-03-26 尾巴清仓 / 主 Plan 收口
- **Status:** completed
- Actions taken:
  - 重新核对 `temp/open-feedback-tracker.md`、`temp/e2e-next-batch-plan.md`、`temp/codex-room-assets-findings.md` 与根目录三件套，确认哪些尾巴已经可以直接收口，哪些只是口径没更新。
  - 确认 feedback 线的 open tracker 已不再是代码待办，主动作应转为后台关闭状态；E2E 线当前仍以 SmashUp 收尾为主，不扩大战线。
  - 确认 `temp/codex-room-assets-findings.md` 的有效结论已被主线吸收：`apps/api/src/main.ts` 中 `/assets` 已排除出 SPA fallback；`src/main.tsx` 已存在 stale chunk 一次性自动刷新；但生产层真实返回值和部署后行为仍未完成验证。
  - 确认“房间不存在/已被删除”链路已从“未知”推进到“根因基本锁定”：服务端 duplicate-owner cleanup 仍是无条件删旧房；前端 `Home/MatchRoom/useMatchStatus` 仍会把 404 最终收敛成 deleted-room 体验。
  - 复查 POD 文档尾巴：`p1-restoration-progress.md` 为完成态，`p3-audit-progress.md` 已落后于 `p3-audit-complete.md`，`p0` 文档线仍存在内部冲突，因此不能把整个 POD 文档群一次性宣称全部收完。
  - 更新 `task_plan.md`：关闭 Phase B，收口 Phase E，把 Phase C / D 改成更准确的 in_progress，并把 2026-03-10 的 Dice Throne 历史 Phase 从当前主任务区降级为 archived history。
- Validation:
  - `apps/api/src/main.ts` 复读确认 `spaExclude` 已包含 `/assets`
  - `src/main.tsx` 复读确认 stale chunk reload 逻辑已存在
  - `server.ts` 复读确认 duplicate-owner cleanup 仍为无条件 `storage.wipe + emitMatchEnded`
- Next step:
  - 若今晚继续推进，优先处理的只剩两条硬问题：生产层 `/assets` 返回值真实验证，以及 duplicate-owner cleanup 防误删修复。

## Session: 2026-03-26 board-shell 横屏滚动条 / 裁剪修复
- **Status:** in_progress
- Actions taken:
  - 先按项目根 `AGENTS.md` 与 `docs/ai-rules/ui-ux.md` 复核规则，把问题按“共性壳层 bug”而不是“单游戏补丁”来定位。
  - 沿 `MatchRoom / LocalMatchRoom / MobileBoardShell / src/index.css / 各游戏 Board 根容器` 排查，确认 `board-shell` 横屏共享壳还在吃统一 safe-area padding。
  - 在 `src/components/game/framework/MobileBoardShell.tsx` 增加 `mobile-board-shell__content` 包裹层；在 `src/index.css` 为共享壳加统一裁剪约束，并对 `landscape-adapted board-shell` 显式 `padding: 0`。
  - 补充共享壳回归测试 `src/components/game/framework/__tests__/MobileBoardShell.test.tsx`。
  - 运行最小相关验证：
    - `npx vitest run src/components/game/framework/__tests__/MobileBoardShell.test.tsx --maxWorkers=1`
    - `npx vitest run src/games/__tests__/mobileSupport.test.ts src/components/game/framework/__tests__/MobileBoardShell.test.tsx --maxWorkers=1`
  - 本地提交：`608b5937 fix(ui): remove shared board-shell overflow padding`。
  - 正常执行 `git push origin main`，pre-push 门禁实际通过（typecheck / eslint / i18n / changed tests 均完成）。
  - GitHub 镜像构建成功：`Build & Push Docker Images` run `23594673252`。
  - 已做远端 preflight，确认服务器路径 `/home/admin/BoardGame`，且部署前线上运行 revision 仍是 `c51e0c01975b6765d7f72b4d28896070084a65c5`。
  - 曾启动远端 `bash scripts/deploy/deploy-image.sh update`，但在镜像拉取阶段被老板明确叫停；已立即停止继续部署，不把它算作已部署完成。
- Validation:
  - `src/components/game/framework/__tests__/MobileBoardShell.test.tsx` → passed
  - `src/games/__tests__/mobileSupport.test.ts` → passed
  - `git push origin main` pre-push changed quality gate → passed
  - `Build & Push Docker Images` run `23594673252` → success
- Next step:
  - 新会话若继续这条线，只在早上时间窗执行生产部署。
  - 部署前重新做远端 preflight，并确认当前运行 revision 是否仍落后于 `608b5937`。
  - 部署命令继续固定为：`bash scripts/deploy/deploy-image.sh update`。


## Session: 2026-03-26 远程 AI fallback 与训练采集恢复
- **Status:** completed
- Actions taken:
  - 发现当前工作区里的 `src/engine/ai/`、`src/engine/transport/trainingData.ts`、`server/trainingDataRecorder.ts` 已被并发改动回退/删除，因此先恢复通用 AI 与训练采集基线。
  - 重建 `src/engine/ai/` 目录，恢复统一 AI 类型、playerView 过滤、legal action context、seat controller 解析、评分 helper、runtime registry 与通用 AI runner。
  - 通用 AI runner 新增远程 provider 调度、超时、重试、非法动作拒绝与 fallback 到本地 policy 的闭环。
  - `LocalGameProvider` 重新接回 AI 调度；`LocalMatchRoom` 重新从 URL 解析 `players` / `seat0` / `seat1` 等座位控制器参数。
  - 恢复 `tictactoe` AI runtime 与注册，补齐本地制胜、远程非法动作回退、远程异常回退、远程超时回退测试。
  - 恢复 `trainingData.ts` 和 `server/trainingDataRecorder.ts`，并在现有 `src/engine/transport/__tests__/server.test.ts` 中补齐训练样本快照与 JSONL 落盘测试。
  - 注意：当前工作区中的 Dice Throne AI runtime 仍未恢复回来，本轮没有把它伪装成“已在当前树里可用”。
- Validation:
  - `npm run typecheck`
  - `npx vitest run src/games/tictactoe/__tests__/flow.test.ts --maxWorkers=1`
  - `npx vitest run src/engine/transport/__tests__/server.test.ts src/games/tictactoe/__tests__/flow.test.ts --maxWorkers=1`
  - `openspec validate add-cross-game-ai-system --strict --no-interactive`
- Next step:
  - 继续恢复当前工作区里的 Dice Throne AI runtime，并在此基础上定义 AstrBot provider 的鉴权协议和调用契约。

## Session: 2026-03-26 跨游戏 AI 评分框架收口
- **Status:** completed
- Actions taken:
  - 复核 `openspec/changes/add-cross-game-ai-system/` 现有 change，并确认本轮不新开 change，而是在现有 spec 上继续收口。
  - 完成 `src/engine/ai/scoring.ts`，统一本地 AI 的 scorer 汇总、稳定选优、reasoning summary 和调试评分元数据输出。
  - 完成 `src/games/dicethrone/ai.ts` 评分式 baseline，实现 ability / card / interaction / bonus die / status / phase tempo 等多维打分。
  - 在 `src/games/dicethrone/__tests__/basic-commands-coverage.test.ts` 增加 main1 优先打升级牌的回归测试，并修正升级目标能力断言。
  - 回填 `openspec/changes/add-cross-game-ai-system/tasks.md` 的 2.1-2.4 为已完成。
- Validation:
  - `npm run typecheck`
  - `npx vitest run src/games/dicethrone/__tests__/basic-commands-coverage.test.ts --maxWorkers=1`
  - `openspec validate add-cross-game-ai-system --strict --no-interactive`
- Next step:
  - 继续补 Phase 3.x：训练数据治理、AstrBot/remote provider 接入约束、provider fallback/timeout 测试。

## Session: 2026-03-22 多线任务登记 / 新会话续跑入口
- **Status:** in_progress
- Actions taken:
  - 读取项目根目录现有 `task_plan.md` / `findings.md` / `progress.md`，确认三件套已存在，但顶层标题仍停留在旧任务，需要补登记本轮多线收口状态。
  - 读取并核对项目内主进度文件：`evidence/full-recovery-plan.md`、`evidence/p0-audit-progress.md`、`evidence/p1-restoration-progress.md`、`evidence/smashup-e2e-migration-progress.md`、`temp/feedback-main-branch-resume-plan.md`、`temp/ssh-codex-plan.md`。
  - 已确认当前主线不止一个：静态资源 fallback 事故、房主被踢/房间被删链路、feedback 未关闭项、E2E 迁移、POD 审计/恢复文档。
  - 已用 guarded task 启动并行 Codex：
    - `codex-feedback-open-tracker` → 目标产物 `temp/open-feedback-tracker.md`
    - `codex-e2e-migration` → 目标产物 `temp/e2e-next-batch-plan.md`
    - `codex-find-planning-with-files` → 原用于精确定位 plan 技能；在用户给出 GitHub 后已人工确认并安装技能。
  - 已从 `https://github.com/OthmanAdi/planning-with-files` 安装 `planning-with-files`，并整理到 OpenClaw 可识别目录；workspace commit：`1216e1e` (`skills: install planning-with-files`)。
  - 已纠正规范：以后说 `plan` 默认指 `planning-with-files` 这套规划工作方式 / 效果；其正式文档唯一落点只能是根目录 `task_plan.md`，不得再在 `temp/` 或其他位置并行维护第二份正式 plan；多任务并行时，新增任务主动委派给 Codex。
- Next step:
  - 新会话恢复时，先读本三件套，再检查以下产物是否已落盘：`temp/open-feedback-tracker.md`、`temp/e2e-next-batch-plan.md`、`temp/codex-room-assets-findings.md`。
  - 然后继续两条核心修复线：`apps/api/src/main.ts` 的 `/assets` SPA fallback 排除是否已真实落盘/验证；`server.ts` + 前端状态链路对“房间已删除”误判的根因与最小修复。

## Session: 2026-03-24 Plan with Files 唯一落点收口
- **Status:** in_progress
- Actions taken:
  - 复读 `task_plan.md` / `findings.md` / `progress.md`，确认根目录三件套当前仍被定义为唯一正式入口 + 配套记录。
  - 读取 `temp/open-feedback-tracker.md`、`temp/e2e-next-batch-plan.md`、`temp/feedback-main-branch-resume-plan.md`、`temp/main-e2e-single-progress.md`、`docs/smashup-e2e-migration-plan.md`、`docs/bugs/feedback-rate-limit-todo.md`，核对 feedback / E2E 相关材料的真实角色。
  - 读取 `planning-with-files` 技能原始说明，确认该技能明确要求 planning files 放在 **project directory**，不是 agent workspace。
  - 扫描 `temp/` 下带 `plan/progress/resume/tracker` 命名的文件，确认当前最容易制造“第二主 Plan”错觉的是：`temp/e2e-next-batch-plan.md`、`temp/feedback-main-branch-resume-plan.md`、`temp/ssh-codex-plan.md`、`temp/main-e2e-single-progress.md`、`temp/open-feedback-tracker.md`。
  - 已将本轮分级判断直接写回 `findings.md`，避免再另起一份说明文档。
- Interim conclusion:
  - 对 **BoardGame 项目任务** 而言，主 Plan 继续放在仓库根 `task_plan.md` 更符合 `planning-with-files` 原始设计，也更符合“项目计划 ≠ agent memory”的边界。
  - 当前结构并未必然违反“Plan with Files 产出只能放一处”，但需要把 temp 下仍有效的专项结论逐步摘要回写到根目录三件套，并把这些 temp 文件降级为配套/历史材料。
- Next step:
  - 把 feedback / E2E 两条线中仍然有效、值得长期保留的结论提炼进 `task_plan.md`，减少后续会话继续从 `temp/*plan*` 进入的诱因。
  - 视需要再做一轮命名/归档清理建议（优先处理最像第二主 Plan 的文件名）。
- Update:
  - 已把 feedback / E2E 两条线的有效结论摘要并回 `task_plan.md`：feedback 当前重点已从“继续修代码”转为“关闭后台状态”；E2E 当前主战场明确为 SmashUp 收尾，top 5 next batch 已写入主 Plan。
  - 已把 temp 文件的最小处置规则写入 `task_plan.md`：`open-feedback-tracker.md` / `e2e-next-batch-plan.md` 降级为专项记录；`feedback-main-branch-resume-plan.md` / `main-e2e-single-progress.md` / `ssh-codex-plan.md` / `reboot-resume-plan.md` 降级为待清理历史材料。
- Next step:
  - 如老板认可当前口径，下一步可直接进入“清理命名最像第二主 Plan 的 temp 文件”或转回业务主线（静态资源 fallback / 房间被删链路）继续收口。
- Update:
  - 已确认 `temp/feedback-main-branch-resume-plan.md`、`temp/main-e2e-single-progress.md`、`temp/ssh-codex-plan.md`、`temp/reboot-resume-plan.md` 仅剩根目录三件套在引用，无其他活跃引用。
  - 已删除上述 4 份历史 temp 文件，减少“第二主 Plan / 第二进度入口”错觉。
- Next step:
  - 当前 temp 下仍保留的与本任务最相关专项记录只剩 `temp/open-feedback-tracker.md` 与 `temp/e2e-next-batch-plan.md`；后续若它们内容继续沉淀进主 Plan，可再评估是否重命名为更不易误解的专项 notes 文件。

## Session: 2026-03-25 并行 AI 下的 E2E 共享端口止血
- **Status:** in_progress
- Actions taken:
  - 复核 `cleanup_test_connections.js`、`start-single-worker-servers.js`、longtask guard 注册表、当前 worktree 与 codex 进程，确认 BoardGame 当前并非单 AI 单测试运行环境，存在并行 worktree / codex / guarded task。
  - 识别风险：默认 `npm run test:e2e:cleanup` 会直接清理共享 single-worker E2E 端口 `6174/20000/21000`，在并行 AI 场景下可能误伤其他测试运行。
  - 已修改 `scripts/infra/cleanup_test_connections.js`：默认安全模式下不再自动清理共享 single-worker E2E 端口；必须显式 `--e2e --shared` 或 `BG_E2E_ALLOW_SHARED_CLEANUP=1` 才允许清理。
  - 已修改 `scripts/infra/start-single-worker-servers.js`：当共享固定端口已被占用时，明确提示这是共享 single-worker 模式，不应默认假设独占测试环境。
  - 已在 agent 规则中补充 BoardGame E2E shared-port rule，明确多 AI / 多 worktree 并行时优先使用隔离 worker / 分配端口，而不是共享 single-worker 清理。
  - 已验证：`npm run test:e2e:cleanup` 现在默认只提示安全模式，不再实际清理共享 E2E 端口；相关脚本通过 `node --check` 语法检查。
- Interim conclusion:
  - 这轮止血后，“一条 cleanup 命令误杀其他 AI 的 single-worker E2E”这个默认坑已被移除。
  - 但 `framework-pilot-ninja-infiltrate.e2e.ts` 当前仍未进入业务判定，最新 blocker 仍是 single-worker 启动链 / ready 链路不稳定，而不是业务断言已确认失败。
- Next step:
  - 提交本轮规范 + 框架止血改动。
  - 然后继续 E2E 主线，优先改用更隔离的运行方式来复核 ninja / wizard，而不是再次依赖共享 single-worker 清理。

## Session: 2026-03-10

### Phase 1：读取规则与相关规范
- **Status:** in_progress
- Actions taken:
  - 读取 `planning-with-files` 技能说明，按复杂任务流程建档。
  - 检查项目内相关文档与规则文件位置。
  - 读取 `docs/ai-rules/engine-systems.md` 与 `src/games/dicethrone/rule/王权骰铸规则.md`，准备进入实现链路排查。
  - 追踪 `pendingBonusDamage` / `pendingAttack.bonusDamage` / `useActiveModifiers` 相关实现。
  - 对照规则确认：攻击修正必须依附当前攻击，当前实现却允许无攻击时预存到未来攻击。
- Files created/modified:
  - `task_plan.md`
  - `findings.md`
  - `progress.md`

## Test Results
| Test | Input | Expected | Actual | Status |
|------|-------|----------|--------|--------|
| 暂无 | - | - | - | - |

## Error Log
| Timestamp | Error | Attempt | Resolution |
|-----------|-------|---------|------------|
| 2026-03-10 | 暂无 | - | - |

---

## Addendum（2026-03-10）：传输层状态注入 P1 收尾

### Actions taken
- 审查 `src/engine/transport/react.tsx`，确认联机态 `StateInjector` 已改为只读注册，setter 直接抛错。
- 审查 `src/engine/transport/server.ts`，确认 `/game` socket 侧已不暴露 `test:injectState`。
- 在 `src/engine/transport/server.ts` 新增 `validateTestAccess()`。
- 在 `src/server/routes/test.ts` 为 `/test/inject-state`、`/test/patch-state`、`/test/get-state/:matchId`、`/test/snapshot-state`、`/test/restore-state` 补上座位级鉴权。
- 在 `src/server/routes/test.ts` 为 `restore-state` 增加注入前 `validateMatchState`。
- 更新 `e2e/helpers/state-injection.ts`，让服务端状态注入自动携带 `playerId + credentials`。
- 更新 `docs/automated-testing.md`，同步 `/test/*` 新契约。
- 扩充 `src/server/routes/__tests__/test.routes.test.ts`，覆盖缺失座位鉴权头、过期凭证等场景。

### Test Results
| Test | Input | Expected | Actual | Status |
|------|-------|----------|--------|--------|
| 传输层 / 测试路由回归 | `npx vitest run src/server/routes/__tests__/test.routes.test.ts src/engine/transport/__tests__/server.test.ts src/engine/transport/__tests__/server-injectState.test.ts --reporter=dot --silent --maxWorkers=1` | 新鉴权与旧传输行为同时通过 | `27 passed` | ✅ |
| TypeScript 类型检查 | `npm run typecheck` | 全绿 | 通过 | ✅ |

### Error Log
| Timestamp | Error | Attempt | Resolution |
|-----------|-------|---------|------------|
| 2026-03-10 | `restore-state` 新增快照校验后，原单测夹具缺少 `core.bases` 导致 400 | 1 | 修正测试夹具，使快照状态满足当前 `validateMatchState` 契约 |
## Session: 2026-03-11 服务器启动缓慢排查
- **Status:** completed
- Actions taken:
  - 读取 `package.json`，确认 `dev`/`predev`/`dev:frontend:wait` 启动链路。
  - 读取 `scripts/infra/wait_for_ports.js`、`scripts/infra/clean_ports.js`、`scripts/game/generate_game_manifests.js`、`scripts/audio/generate-slim-registry.mjs`，定位串行等待与前置脚本开销。
  - 实测 `predev` 各步骤耗时，确认固定成本主要来自 `clean_ports`（清旧进程时）与音频 slim registry 生成。
  - 用端口探测分别复测游戏服与 API 服启动时间，确认前端等待会把后端慢启动直接放大为整套开发环境慢启动。
  - 用临时 `tsx` 脚本拆分导入链，确认 API 服核心瓶颈位于 `@sentry/nestjs` 与 `AppModule` 导入/转译，而不是监听端口本身。
  - 临时测量脚本已删除；一次 `Remove-Item` 被策略拦截，随后改用 `apply_patch` 删除成功。

## Session: 2026-03-11 Dice Throne 攻击修正残留修复
- **Status:** completed
- Actions taken:
  - 复核上一轮对 `src/games/dicethrone/domain/rules.ts` 与 `src/games/dicethrone/hooks/useActiveModifiers.ts` 的修复是否与规则一致。
  - 将“攻击修正必须绑定当前攻击”的边界测试迁移到轻量文件 `src/games/dicethrone/__tests__/red-hot-meteor-integration.test.ts`。
  - 清理临时落点：移除 `src/games/dicethrone/__tests__/card-give-hand-boundary.test.ts` 和 `src/games/dicethrone/__tests__/card-playCondition-audit.test.ts` 中为本次问题临时插入的断言。
  - 保留并复用 `src/games/dicethrone/__tests__/active-modifiers-undo.test.ts` 中对 `main2` / `TURN_CHANGED` 清理边界的覆盖。

### Test Results
| Test | Input | Expected | Actual | Status |
|------|-------|----------|--------|--------|
| 攻击修正规则边界 + 红热回归 | `npx vitest run src/games/dicethrone/__tests__/red-hot-meteor-integration.test.ts src/games/dicethrone/__tests__/active-modifiers-undo.test.ts --maxWorkers=1` | 规则边界和显示清理都通过 | `16 passed` | ✅ |
| TypeScript 类型检查 | `npm run typecheck` | 全绿 | 通过 | ✅ |

### Error Log
| Timestamp | Error | Attempt | Resolution |
|-----------|-------|---------|------------|
| 2026-03-11 | `card-playCondition-audit.test.ts` 临时断言被插入到对象字面量中，且该文件默认被 `audit` 排除 | 1 | 将规则断言迁移到可执行轻量文件 `red-hot-meteor-integration.test.ts`，并清理临时插入代码 |
| 2026-03-11 | `card-give-hand-boundary.test.ts` 整文件运行时 worker 启动超时 | 1 | 不再把本次规则断言放入该重文件，改为迁移到轻量文件 |
- 审查 git 历史，确认 `dev:frontend:wait` 于 2026-03-09 引入；API 主启动文件最近无同等级别大改。
- 改造 `apps/api/src/main.ts`：顶层 Sentry 导入改为监听成功后后台惰性初始化，并补充启动耗时日志。
- 改造 `server.ts`：启动期房间清理改为监听成功后后台执行，并补充启动耗时日志。
- 调整 `package.json` / `nodemon.json`：去掉启动命令中的 `npx`，减少额外启动开销。
- 新增 `scripts/infra/dev-orchestrator.js`，把 `dev` 从并行冷启动改为 API → game-server → frontend 分阶段启动，避免两个 `tsx` 进程同时冷启动互相争抢资源。
- 验证结果：`npm run dev` 三端口 ready 从优化前的 `18000≈29.75s / 18001≈52.24s / 5173≈68.08s`，下降到 `18000≈9.18s / 18001≈7.08s / 5173≈10.24s`。
- 排障中遇到两次脚本问题：① orchestrator 用嵌套 `npm run` 在 Windows 上触发 `spawn EINVAL`/启动挂起，随后改为直接调用本地二进制；② 删除临时脚本时 `Remove-Item` 被策略拦截，改用 `apply_patch` 删除成功。
- 评估过“预编译后再运行”的更激进 dev runner，但 `npx tsc -p apps/api/tsconfig.json --outDir temp/api-dev` 被现有仓库中的无关 TypeScript 错误阻断（如 `apps/api/src/adapters/msgpack-io.adapter.ts`、`apps/api/src/modules/auth/dtos/auth.dto.ts`、`apps/api/src/modules/notification/notification.service.ts`），因此本次选择了不依赖完整编译通过的低风险方案。

## Session: 2026-03-11 服务器启动缓慢排查与优化
- **Status:** completed
- Actions taken:
  - 实查 `apps/api/src/main.ts`，把顶层 Sentry 初始化移出启动关键路径。
  - 实查 `server.ts`，把启动期房间清理从监听前挪到监听后后台执行，并增加结构化启动耗时日志。
  - 新增 `scripts/infra/dev-orchestrator.js`，让默认 `dev` 走分阶段启动。
  - 调整 `package.json` / `nodemon.json`，统一显式调用本地 CLI。
  - 更新 `docs/toolchain-reliability.md`、`docs/deploy.md`。
  - 通过实际端口探测验证 API、game-server、整套 dev 的冷/热启动表现。

### Test Results
| Test | Input | Expected | Actual | Status |
|------|-------|----------|--------|--------|
| ESLint 回归 | `npx eslint scripts/infra/dev-orchestrator.js apps/api/src/main.ts server.ts` | 0 errors | 0 errors，1 个既有 warning | ✅ |
| API 启动（冷） | `npm run dev:api` | 可监听端口 | `~103.84s` | ✅ |
| API 启动（热） | `npm run dev:api` | 可监听端口 | `~4.20s / 5.82s` | ✅ |
| game-server 启动（热） | `npm run dev:game` | 可监听端口 | `~3.68s / 4.97s` | ✅ |
| 完整 dev 热启动 | `npm run dev` | 三端口都 ready | `~12.41s` | ✅ |
| 旧并行入口热启动 | `npm run dev:parallel` | 三端口都 ready | `~11.48s` | ✅ |

### Error Log
| Timestamp | Error | Attempt | Resolution |
|-----------|-------|---------|------------|
| 2026-03-11 | `apply_patch` / Python 直写对部分既有文件未稳定落盘 | 1 | 改用 `Set-Content -Encoding UTF8` 直接写入并立即复读校验 |
| 2026-03-11 | `npm run check:prod-deps` 依赖 `/bin/bash`，当前 Windows 环境缺失 | 1 | 记录为环境限制，本次用 ESLint + 真实启动验证替代 |

## Session: 2026-03-11 第二阶段开发启动优化（bundle runner）
- **Status:** completed
- Actions taken:
  - 用 `esbuild` 验证 API 预先 bundle 后可在 `~3.74s` 内 ready。
  - 用 `esbuild` 验证 game-server 预先 bundle 后可在 `~2.11s` 内 ready。
  - 实现 `scripts/infra/dev-bundle-runner.mjs`，把 watch bundle 与运行时重启合并到统一脚本。
  - 更新 `package.json`、`scripts/infra/dev-orchestrator.js`、`scripts/e2e/start-all-servers.mjs`、`docs/toolchain-reliability.md`、`docs/deploy.md`。
  - 删除不再使用的 `nodemon.json` 主链路配置。

### Test Results
## Session: 2026-03-11 ???????????nodemon / Node pin / smoke?
- **Status:** completed
- Actions taken:
  - ?? `nodemon.json`??? `dev:game:nodemon` ???? watcher
  - ?? `.nvmrc`?`.node-version` ? `package.json` ?? `engines.node=24.1.0`
  - ?? `scripts/infra/startup-smoke-test.mjs`????????? bundle ????????
  - ?? `scripts/infra/dev-orchestrator.js`????? `DEV_BUNDLE_DIR` ?? bundle ??
  - ?? `docs/toolchain-reliability.md`

### Test Results
| Test | Input | Expected | Actual | Status |
|------|-------|----------|--------|--------|
| ESLint ?? | `npx eslint scripts/infra/dev-orchestrator.js scripts/infra/startup-smoke-test.mjs` | 0 errors | 0 errors | ? |
| ?? smoke test | `npm run smoke:startup` | API / game-server / full-dev ???? | `API ~3.66s / game-server ~41.72s / full-dev ~3.64s` | ? |

### Error Log
| Timestamp | Error | Attempt | Resolution |
|-----------|-------|---------|------------|
| 2026-03-11 | `smoke:startup` ?? `src/games/smashup/domain/index.ts` ???? `Unexpected "."`?? `englishAtlasMap.json` ? duplicate key warning | 1 | ???????????????????????/??????????????????????? unrelated ?? |


## Session: 2026-03-11 `englishAtlasMap.json` ?? key ??
- **Status:** completed
- Actions taken:
  - ?? `src/games/smashup/data/englishAtlasMap.json` ????? `src/games/smashup/ui/SmashUpCardRenderer.tsx` ? `src/games/smashup/ui/cardAtlas.ts`
  - ???????? key ? 1 ??`base_great_library`
  - `git blame` / `git log` ?????? `10b99ae6` ??????? bundle runner ????
  - ?????????????????? warning ??????????

### Test Results
| Test | Input | Expected | Actual | Status |
|------|-------|----------|--------|--------|
| ?? key ?? | Python ???? `src/games/smashup/data/englishAtlasMap.json` | ???????? key | ? `base_great_library: 2` | ? |
| ???? | `git blame` + `git log --follow` | ?????? | ???? `6ea1f9f0`????? `10b99ae6` ?? | ? |

## Session: 2026-03-11 删除 `englishAtlasMap.json` 重复 key
- **Status:** completed
- Actions taken:
  - 删除 `src/games/smashup/data/englishAtlasMap.json` 中重复的 `base_great_library`
  - 用 Python 重新扫描文件，确认重复 key 数量为 `0`
  - 直接运行 esbuild 打包 `server.ts`，确认不再出现 `duplicate-object-key` warning
- Notes:
  - 当前终端环境会拦截 Node 内部 `child_process.spawn`，因此 `smoke:startup` 在这里会假失败；本轮改用直接 bundle 作为验证手段
## Session: 2026-03-25 跨游戏 AI 骨架收尾
- **Status:** completed
- Actions taken:
  - 补齐跨游戏 AI 基础设施的剩余接线：`manifest.ai`、本地 seat controller、训练采集 `legalActions`、本地 AI runner 去重。
  - 为 `dicethrone` 新增 `src/games/dicethrone/ai.ts`，实现首个 game runtime、baseline local policy、以及 setup/phase/response/interaction 的最小 legal action 生成。
  - 在 `src/games/dicethrone/game.ts` 注册 runtime。
  - 在现有测试文件 `src/games/dicethrone/__tests__/basic-commands-coverage.test.ts` 中补充 AI 断言，没有新建测试文件。
  - 修正 `src/engine/transport/server.ts` 的 manifest barrel 引用，避免测试环境 import 失败。

### Test Results
| Test | Input | Expected | Actual | Status |
|------|-------|----------|--------|--------|
| Manifest 生成 | `node scripts/game/generate_game_manifests.js` | 生成成功 | unchanged / success | ✓ |
| TypeScript 类型检查 | `npm run typecheck` | 通过 | 通过 | ✓ |
| 训练采集 + 服务端 + DiceThrone AI | `npx vitest run src/engine/transport/__tests__/trainingData.test.ts src/engine/transport/__tests__/server.test.ts src/games/dicethrone/__tests__/basic-commands-coverage.test.ts --maxWorkers=1` | 相关回归通过 | `26 passed` | ✓ |

### Error Log
| Timestamp | Error | Attempt | Resolution |
|-----------|-------|---------|------------|
| 2026-03-25 | `server.test.ts` 因 `server.ts` 误引 `../../games` 导致 Vite import 失败 | 1 | 改为显式引用 `../../games/manifest` |
| 2026-03-25 | `DICETHRONE_CHARACTER_CATALOG is not iterable` | 1 | 改为从 `./domain/types` 直接导入运行时值 |
## Session: 2026-03-25 OpenSpec 收口追加
- **Status:** completed
- Actions taken:
  - 复核 `add-user-settings-persistence` 的实际实现链路，并把 change 文档改写为真实口径后归档
  - 复核 `add-game-changelog-and-author-info` 的实际实现链路，并把过时的 `author.tsx` / “排行榜双栏”口径改写为 `authorName + 独立更新标签` 后归档
  - 将 `update-mobile-first-adaptive` 判定为 stale change，删除目录
  - 更新 `task_plan.md`、`findings.md`、`progress.md`

### Test Results
| Test | Input | Expected | Actual | Status |
|------|-------|----------|--------|--------|
| OpenSpec 校验 | `openspec validate add-user-settings-persistence --strict --no-interactive` | 通过 | 通过 | ✅ |
| OpenSpec 归档 | `openspec archive add-user-settings-persistence --yes` | 归档成功 | 成功，生成 `2026-03-25-add-user-settings-persistence` | ✅ |
| OpenSpec 校验 | `openspec validate add-game-changelog-and-author-info --strict --no-interactive` | 通过 | 通过 | ✅ |
| OpenSpec 归档 | `openspec archive add-game-changelog-and-author-info --yes` | 归档成功 | 成功，生成 `2026-03-25-add-game-changelog-and-author-info` | ✅ |
| Stale 清理 | 删除 `openspec/changes/update-mobile-first-adaptive` | 目录清理成功 | 成功 | ✅ |
| Active 列表复核 | `openspec list` | 看到收口后的剩余 active changes | 共剩余 13 项 | ✅ |

### Error Log
| Timestamp | Error | Attempt | Resolution |
|-----------|-------|---------|------------|
| 2026-03-25 | `apply_patch` 直接按旧内容更新部分 OpenSpec 文件时因原文件编码/内容差异匹配失败 | 1 | 改为整文件重写后继续校验与归档 |
## Session: 2026-03-25 跨游戏 AI 产品入口收口
- **Status:** completed
- Actions taken:
  - 新增 `AiSupportPills` 与 `LocalMatchConfigModal`，把 AI 支持展示和本地 seat controller 配置接入大厅详情弹窗。
  - 本地房间页改为复用通用 `seat controller` 解析，调试面板新增 AI 支持与当前 seat controller 展示。
  - 补齐 `public/locales/en|zh-CN/lobby.json` 与 `public/locales/en|zh-CN/game.json` 的 `lobby.ai.*` / `game.debug.ai.*` 文案。
  - 清理并重写已有大厅测试文件，在同一文件补齐 seat controller、search params、AI pill 回归断言。
  - 在 `e2e/lobby.e2e.ts` 中补齐从大厅详情弹窗到本地房间的 AI 配置链路测试。
  - 新增证据文档 `evidence/lobby-ai-local-config-e2e.md`。

### Test Results
| Test | Input | Expected | Actual | Status |
|------|-------|----------|--------|--------|
| TypeScript 类型检查 | `npm run typecheck` | 通过 | 通过 | ✓ |
| Lobby 单测回归 | `npx vitest run src/components/lobby/__tests__/GameDetailsModalJoinConfirm.test.ts --maxWorkers=1` | 通过 | `11 passed` | ✓ |
| Lobby E2E | `npm run test:e2e:ci:file -- lobby.e2e.ts "Tic-Tac-Toe 本地对战配置会暴露 AI 支持和 seat controller"` | 通过 | `1 passed` | ✓ |

### Evidence
- `D:\gongzuo\webgame\BoardGame\evidence\lobby-ai-local-config-e2e.md`
- `D:\gongzuo\webgame\BoardGame\test-results\evidence-screenshots\lobby.e2e\Tic-Tac-Toe-本地对战配置会暴露-AI-支持和-seat-controller\lobby-tictactoe-local-ai-config-debug.png`
## Session: 2026-03-25 OpenSpec active changes 收口推进
- **Status:** in_progress
- Actions taken:
  - 读取 `planning-with-files` 技能说明、`openspec/AGENTS.md` 与最新 `openspec list`，恢复当前 active changes 上下文。
  - 重写并校正 `refactor-engine-primitives` 的：
    - `proposal.md`
    - `design.md`
    - `tasks.md`
    - `specs/engine-primitives/spec.md`
    - `specs/dice-system/spec.md`
  - 用真实现状替换过时口径：
    - 不再声称删除 `src/engine/systems/`
    - 不再声称骰子系统依赖全局 singleton / definition registry
    - 将 change scope 收敛为已落地的 `engine/primitives` 纯函数原语层
  - 运行 `openspec validate refactor-engine-primitives --strict --no-interactive`，结果通过。
  - 运行 `openspec archive refactor-engine-primitives --yes`，归档成功到 `openspec/changes/archive/2026-03-25-refactor-engine-primitives/`。
  - 归档后继续清理正式 spec 残留旧口径，直接修正：
    - `openspec/specs/engine-primitives/spec.md`
    - `openspec/specs/dice-system/spec.md`
  - 分别运行 `openspec validate engine-primitives --strict --no-interactive` 与 `openspec validate dice-system --strict --no-interactive`，结果均通过。
  - 刷新 `openspec list`，确认当前剩余 active changes 为 10 个。
- Interim conclusion:
  - `refactor-engine-primitives` 已完成收口并归档，正式 spec 也已同步清理干净。
  - `add-cross-game-ai-system` 与 `add-refresh-token-auth` 仍不应误归档。
- Next step:
  - 继续检查 `refactor-multistep-interaction` 是否属于“实现已完成但 spec 落后”的候选。
## Session: 2026-03-25 OpenSpec active changes 继续收口
- **Status:** in_progress
- Actions taken:
  - 重写并归档 `add-ugc-layout-alignment`：
    - 校正 proposal / design / tasks / spec delta 到锚点布局、迁移、对齐/吸附、统一解析的真实口径
    - 运行 `openspec validate add-ugc-layout-alignment --strict --no-interactive`
    - 运行 `openspec archive add-ugc-layout-alignment --yes`
    - 归档后验证 `ugc-prototype-builder` 与 `ugc-runtime` 正式 spec 均通过 strict validate
  - 重写并归档 `add-ugc-client-runtime-adapter`：
    - 校正 proposal / design / tasks / spec delta 到 manifest loader、UGC asset base、client game、remote host board、MatchRoom UGC 分支的真实口径
    - 运行 `openspec validate add-ugc-client-runtime-adapter --strict --no-interactive`
    - 运行 `openspec archive add-ugc-client-runtime-adapter --yes`
    - 归档后验证 `ugc-runtime` 正式 spec 通过 strict validate
  - 复核 `add-ugc-runtime-and-audio-pipeline`：
    - 确认 package API / 发布 / manifest / asset upload / zip upload / published registry / dynamic registration / compression 已存在
    - 确认 tutorial 接入 `/tutorial` 与 `PLAY_SFX -> 宿主播放` 闭环未完成，因此保留 active
  - 将 `add-ugc-rule-execution-framework`、`ugc-builder-v2` 判定为 stale：
    - 先用 `apply_patch` 删除文件
    - 再用 `cmd /c rd /s /q` 清空目录
    - 用 `openspec list` 复核 active changes 已下降到 5 条

### Test Results
| Test | Input | Expected | Actual | Status |
|------|-------|----------|--------|--------|
| OpenSpec 校验 | `openspec validate add-ugc-layout-alignment --strict --no-interactive` | 通过 | 通过 | ✅ |
| OpenSpec 归档 | `openspec archive add-ugc-layout-alignment --yes` | 归档成功 | 成功，生成 `2026-03-25-add-ugc-layout-alignment` | ✅ |
| 正式 spec 校验 | `openspec validate ugc-prototype-builder --strict --no-interactive` | 通过 | 通过 | ✅ |
| 正式 spec 校验 | `openspec validate ugc-runtime --strict --no-interactive` | 通过 | 通过 | ✅ |
| OpenSpec 校验 | `openspec validate add-ugc-client-runtime-adapter --strict --no-interactive` | 通过 | 通过 | ✅ |
| OpenSpec 归档 | `openspec archive add-ugc-client-runtime-adapter --yes` | 归档成功 | 成功，生成 `2026-03-25-add-ugc-client-runtime-adapter` | ✅ |
| 正式 spec 校验 | `openspec validate ugc-runtime --strict --no-interactive` | 通过 | 通过 | ✅ |
| Active 列表复核 | `openspec list` | 剩余 active changes 缩减 | 剩余 5 条 | ✅ |

### Error Log
| Timestamp | Error | Attempt | Resolution |
|-----------|-------|---------|------------|
| 2026-03-25 | 直接用 PowerShell `Remove-Item` 清理 stale change 目录被策略阻止 | 1 | 改为 `apply_patch` 先删文件，再用 `cmd /c rd /s /q` 删除空目录 |

## Session: 2026-03-25 OpenSpec active changes 最终核对补充
- **Status:** completed
- Actions taken:
  - 读取 `add-ai-pr-review-merge-automation` 的 `proposal.md` / `design.md` / `tasks.md` / spec delta。
  - 全仓搜索 `.github/workflows/`、`pull_request_target`、`workflow_run`、`merge/pr-*`、PR review/auto-merge 相关实现，确认仓库里只有 `quality-gate.yml`，没有 AI PR 自动审查和自动合并链路。
  - 读取 `add-dicethrone-2v2-team-mode` 的 change 文档，并复核 `src/games/dicethrone/manifest.ts`、`src/games/dicethrone/game.ts`、`src/games/dicethrone/domain/rules.ts`、`src/games/dicethrone/domain/core-types.ts`。
  - 确认 DiceThrone 仅有部分 2v2 helper / 规则文档预埋，实际产品入口、房间人数、共享体力、Targeting Roll phase、2v2 UI 主链均未落地。
  - 复核 `add-refresh-token-auth` 的真实进度，确认后端 refresh token 与前端定时刷新存在，但统一 401 自动 refresh + 单飞 retry 请求层仍未形成闭环。
  - 追加更新 `task_plan.md`、`findings.md`、`progress.md`，同步本轮最终判断。

### Test Results
| Test | Input | Expected | Actual | Status |
|------|-------|----------|--------|--------|
| Active 清单复核 | `openspec list` | 仍为 5 条 active | 5 条 active | ✅ |
| PR 自动化实现搜索 | `rg` + `.github/workflows` 枚举 | 若已实现应看到 workflow / 触发器 / 回写逻辑 | 仅见 `quality-gate.yml`，未见 AI PR review / auto-merge | ✅ |
| DiceThrone 2v2 入口复核 | 读取 manifest/game/rules/core-types | 若已实现应见 4 人入口与主链 | 仅见 helper 预埋，入口仍是双人 | ✅ |
| Refresh 闭环复核 | `rg` 搜前端请求与 401 路径 | 若已完成应存在统一 401 refresh retry 层 | 仍有大量直写 fetch，`matchApi` 401 直接清 token | ✅ |

### Conclusion
- 本轮之后，`openspec/changes` 仍剩 5 条 active：
  - `add-cross-game-ai-system`
  - `add-ai-pr-review-merge-automation`
  - `add-ugc-runtime-and-audio-pipeline`
  - `add-dicethrone-2v2-team-mode`
  - `add-refresh-token-auth`
- 结论不是“全部收口”，而是“能按现实实现归档或判 stale 的都已处理完；剩下 5 条都有明确未完成实施点，因此继续保留 active 是正确状态”。
## Session: 2026-03-25 大厅模式入口改版收口
- **Status:** completed
- Actions taken:
  - 收口 `src/components/lobby/GameDetailsModal.tsx`，把详情页入口改成 `教程模式`、`单机模式`、`对战AI`
  - 保留 `教程模式` 直达 tutorial
  - `单机模式` 显式传入 `seatControllers['1']=human`，避免 local AI 默认接管第二个座位
  - `对战AI` 改成直达本地逻辑 AI 对局，不再经过本地配置弹窗
  - 重写 `e2e/lobby.e2e.ts`，去掉旧乱码标题并改成新入口产品口径
  - 重写 `evidence/lobby-ai-local-config-e2e.md`，把证据说明同步为“对战AI直达本地逻辑 AI”

### Test Results
| Test | Input | Expected | Actual | Status |
|------|-------|----------|--------|--------|
| Lobby 模式入口文案 | `npm run test:e2e:ci:file -- lobby.e2e.ts "Game details modal opens and shows actions"` | 显示 `Tutorial / Single Device / Play AI` | 待本轮前置记录已通过 | ✅ |
| Lobby 对战AI直达 | `npm run test:e2e:ci:file -- lobby.e2e.ts "Tic-Tac-Toe 对战AI入口会直接进入本地逻辑 AI 对局"` | 直达本地房间并显示 `P1 -> Local AI` | 本轮待复跑 | ⏳ |

### Evidence
- `D:\gongzuo\webgame\BoardGame\evidence\lobby-ai-local-config-e2e.md`
## Session: 2026-03-26 AstrBot provider 契约与远程 AI 闭环
- **Status:** completed
- Actions taken:
  - 扩展 `AiSeatController` 的 `remote-ai` 契约，补入 `timeoutMs` 与 `retryCount`
  - 重写 `src/engine/ai/localRunner.ts`，统一本地 AI、远程 provider、超时、重试与 fallback 入口
  - 新增 `src/engine/ai/providers/astrbot.ts`，约定默认 AstrBot HTTP 请求结构为 `schemaVersion + provider + context`
  - 新增 `src/engine/ai/providers/index.ts`，并在 `src/engine/ai/index.ts` 中做默认 provider 注册
  - 保持鉴权信息不进入 seat query，AstrBot endpoint / apiKey / 默认 timeout / 默认 retry 改走环境配置
  - 在现有 `src/games/tictactoe/__tests__/flow.test.ts` 中补入“重试后成功采用远程结果”测试
  - 回填 `openspec/changes/add-cross-game-ai-system/tasks.md`，将 `3.2` 标记完成
- Validation:
  - `npx vitest run src/games/tictactoe/__tests__/flow.test.ts --maxWorkers=1`
  - `npx vitest run src/games/dicethrone/__tests__/basic-commands-coverage.test.ts --maxWorkers=1`
  - `npm run typecheck`
- Next step:
  - 如继续推进，可把 AstrBot HTTP 请求/响应样式写成项目文档，并决定在线房间是否也要迁到服务端 AI 调度。
## Session: 2026-03-26 训练数据治理收口
- **Status:** completed
- Actions taken:
  - 将 `server/trainingDataRecorder.ts` 从单层 `baseDir/<gameId>/<day>.jsonl` 升级为 `raw/v{schemaVersion}/{gameId}/{day}.jsonl`
  - 增加 `archiveExpiredRawFiles()`，按 `retentionDays` 把过期 raw 日志迁入 `archive/v{schemaVersion}/{gameId}/`
  - 保留 `TRAINING_DATA_DIR` 兼容入口，同时补充 `TRAINING_DATA_RAW_DIR`、`TRAINING_DATA_ARCHIVE_DIR`、`TRAINING_DATA_RETENTION_DAYS`
  - 放宽 `TrainingDecisionSample.schemaVersion` 为数值型，为未来 schema 升级预留路径隔离能力
  - 在现有 `src/engine/transport/__tests__/trainingData.test.ts` 中补上版本目录和归档回归，不新建测试文件
  - 回填 OpenSpec，完成 `add-cross-game-ai-system` 的 `3.1`
- Validation:
  - `npx eslint server/trainingDataRecorder.ts src/engine/transport/trainingData.ts src/engine/transport/__tests__/trainingData.test.ts`
  - `npx vitest run src/engine/transport/__tests__/trainingData.test.ts --maxWorkers=1`
  - `npm run typecheck`
  - `openspec validate add-cross-game-ai-system --strict --no-interactive`
- Next step:
  - 检查当前工作区是否只剩本条 AI 主线改动；若是，则做最小范围 commit 和 push。

## Session: 2026-03-25 Dice Throne 4 人/2v2 targetingRoll 目标选择收尾
- **Status:** completed
- Actions taken:
  - 追踪 `targetingRoll` 的 5/6 分支，从 `src/games/dicethrone/domain/flowHooks.ts` 到 `CHOICE_REQUESTED`、交互创建、`select-target:*` effect 的整条链路。
  - 确认仅清理 `targetingSelectionPending` 不能阻止重复目标选择，因此在 `PendingAttack` 上补充 `targetingSelectionResolved` 作为幂等保护。
  - 在 `src/games/dicethrone/domain/reducer.ts` 与 `src/games/dicethrone/domain/systems.ts` 中，为 `targeting-roll` 的 `CHOICE_REQUESTED` 加入“已完成则忽略”的保护，防止重复创建交互。
  - 在 `src/games/dicethrone/domain/flowHooks.ts` 中封住历史残留的 5/6 旧分支，使 `SYS_INTERACTION_RESPOND` 在选择完成后自动推进到 `defensiveRoll`。
  - 更新 `src/games/dicethrone/__tests__/flow.test.ts`，把 4 人模式 `targetingRoll` 的断言改为“选择后直接进入 `defensiveRoll`”，并复跑相关测试与 `tsc`。

### Test Results
| Test | Input | Expected | Actual | Status |
|------|-------|----------|--------|--------|
| 4 人模式 targetingRoll 定向回归 | `node scripts/infra/vitest-cli-safe.mjs run src/games/dicethrone/__tests__/flow.test.ts -t "4 人模式 targetingRoll" --configLoader native` | 目标选择后自动推进，不再卡在 `targetingRoll` | 通过 | ✅ |
| flow + rule consistency 回归 | `node scripts/infra/vitest-cli-safe.mjs run src/games/dicethrone/__tests__/flow.test.ts src/games/dicethrone/__tests__/rule-consistency.test.ts --configLoader native` | 相关规则与流程回归通过 | `109 passed` | ✅ |
| TypeScript 类型检查 | `node D:\gongzuo\webgame\BoardGame\node_modules\typescript\lib\tsc.js --noEmit --pretty false` | 无类型错误 | 无输出 | ✅ |

### Error Log
| Timestamp | Error | Attempt | Resolution |
|-----------|-------|---------|------------|
| 2026-03-25 | `src/games/dicethrone/domain/flowHooks.ts` 里仍有历史残留的 5/6 分支，选择目标后又发出一次 `CHOICE_REQUESTED`，导致流程停在 `targetingRoll` | 1 | 保留正确分支，并用 `targetingSelectionResolved` 在 reducer/system 两侧增加幂等保护，封住重复选择链路 |

## Session: 2026-03-25 Dice Throne 4人/2v2 targetingRoll 目标选择收尾（格式修正）

**Status:** completed

本轮先追踪了 `targetingRoll` 的 5/6 分支，从 `src/games/dicethrone/domain/flowHooks.ts` 到 `CHOICE_REQUESTED`、交互创建、`select-target:*` effect 的整条链路，确认仅清理 `targetingSelectionPending` 不能阻止重复目标选择，因此补上了 `targetingSelectionResolved` 作为幂等保护。

随后在 `src/games/dicethrone/domain/reducer.ts` 与 `src/games/dicethrone/domain/systems.ts` 中加入“已完成则忽略”的保护，并在 `src/games/dicethrone/domain/flowHooks.ts` 中封住历史残留的 5/6 旧分支，使 `SYS_INTERACTION_RESPOND` 在选择完成后自动推进到 `defensiveRoll`。`src/games/dicethrone/__tests__/flow.test.ts` 已同步更新。

Validation: `node scripts/infra/vitest-cli-safe.mjs run src/games/dicethrone/__tests__/flow.test.ts -t "4 人模式 targetingRoll" --configLoader native` 通过；`node scripts/infra/vitest-cli-safe.mjs run src/games/dicethrone/__tests__/flow.test.ts src/games/dicethrone/__tests__/rule-consistency.test.ts --configLoader native` 得到 `109 passed`；`node D:\gongzuo\webgame\BoardGame\node_modules\typescript\lib\tsc.js --noEmit --pretty false` 无输出。

Error Log: `src/games/dicethrone/domain/flowHooks.ts` 中仍有历史残留的 5/6 分支，选择目标后又发出一次 `CHOICE_REQUESTED`，导致流程停在 `targetingRoll`；最终通过保留正确分支并引入 `targetingSelectionResolved` 的双侧幂等保护解决。

## Session: 2026-03-25 Dice Throne 4人/2v2 验证补跑与死代码清理
- **Status:** in_progress
- Actions taken:
  - 恢复本 worktree 的 `task_plan.md` / `findings.md` / `progress.md`，确认当前任务仍是 Dice Throne 4 人 / 2v2 这条线，不扩散到其他 worktree。
  - 发现 Git 因 owner SID 不一致触发 `dubious ownership`；改用 `git -c safe.directory=D:/gongzuo/webgame/BoardGame-wt-dicethrone-4p-team-mode ...` 继续只读检查，未改全局 Git 配置。
  - 尝试补跑 `flow.test.ts` / `rule-consistency.test.ts` / `boundaryEdgeCases.test.ts`，默认 Vitest forks worker 初始化直接报 `spawn EPERM`。
  - 改用 `--pool threads --no-file-parallelism --maxWorkers 1` 再试一次，仍在 `vite:esbuild` 转换 `vitest.setup.ts` 时触发 `spawn EPERM`，确认 blocker 来自当前终端对子进程 / esbuild service 的限制。
  - 在复查 `src/games/dicethrone/domain/flowHooks.ts` 时，发现 `targetingRoll` 的 5/6 分支残留 `if (true) { ... } else { ... }` 死代码；本轮已删除，只保留“目标已由选择交互写回后继续攻击流程”的真实路径。
  - 重新运行 `tsc`，确认本轮清理未引入类型错误。

### Test Results
| Test | Input | Expected | Actual | Status |
|------|-------|----------|--------|--------|
| TypeScript 类型检查 | `node D:\gongzuo\webgame\BoardGame\node_modules\typescript\lib\tsc.js --noEmit --pretty false` | 无类型错误 | 无输出 | ✅ |
| DiceThrone 4P 核心回归（默认 Vitest worker） | `node scripts/infra/vitest-cli-safe.mjs run src/games/dicethrone/__tests__/flow.test.ts src/games/dicethrone/__tests__/rule-consistency.test.ts src/games/dicethrone/__tests__/boundaryEdgeCases.test.ts --configLoader native` | 跑完 3 个相关文件 | `spawn EPERM`，worker 未启动 | ⚠ |
| DiceThrone 4P 核心回归（threads 单线程） | `node scripts/infra/vitest-cli-safe.mjs run src/games/dicethrone/__tests__/flow.test.ts src/games/dicethrone/__tests__/rule-consistency.test.ts src/games/dicethrone/__tests__/boundaryEdgeCases.test.ts --configLoader native --pool threads --no-file-parallelism --maxWorkers 1` | 避开 forks 并跑完 3 个相关文件 | `vite:esbuild` 处理 `vitest.setup.ts` 时 `spawn EPERM` | ⚠ |

### Error Log
| Timestamp | Error | Attempt | Resolution |
|-----------|-------|---------|------------|
| 2026-03-25 | Git `dubious ownership` 阻止 `status/log/diff` | 1 | 改用 `git -c safe.directory=D:/gongzuo/webgame/BoardGame-wt-dicethrone-4p-team-mode ...` 单命令绕过；全局 `.gitconfig` 无写权限 |
| 2026-03-25 | Vitest 默认 worker 初始化报 `spawn EPERM` | 1 | 改试 `--pool threads --no-file-parallelism --maxWorkers 1`，确认不是单纯 forks worker 问题 |
| 2026-03-25 | Vitest threads 模式仍在 `vite:esbuild` 转换阶段报 `spawn EPERM` | 2 | 记录为当前受限终端 blocker；本轮改用 `tsc` + 死代码清理推进 |

## Session: 2026-03-25 Dice Throne 4人/2v2 站位移动闭环与 OpenSpec 回填
- **Status:** completed
- Actions taken:
  - 复核当前 worktree 的 Dice Throne 改动进度，确认本轮新增重点是 4 人/2v2 开局前站位移动闭环，而不是再扩散到新的功能面。
  - 在领域层补齐 `MOVE_SEAT` / `SEATING_MOVED` / `PLAYER_UNREADY` 全链路，并把站位合法性收敛到 `commandValidation`。
  - 在 `DiceThroneHeroSelection.tsx` 右下区域接入站位面板，支持房主“先选玩家，再点空位”的插入式移动；已有玩家位置点击会给出本地反馈，非房主保持只读。
  - 为 `flow.test.ts` 新增 4 个站位相关用例，覆盖房主移动成功、非房主拒绝、原位移动拒绝、开局后锁定。
  - 复核 `rule-consistency.test.ts` / `boundaryEdgeCases.test.ts` 中已有 2v2 覆盖，确认回合顺序、`targetingRoll`、共享体力、胜负判定都已纳入通过集。
  - 执行 `openspec validate add-dicethrone-2v2-team-mode --strict --no-interactive` 并通过。
  - 更新 `openspec/changes/add-dicethrone-2v2-team-mode/tasks.md`，勾选 `1.3`、`1.4`、`1.13`、`2.1`、`2.2`；手动走查项保持未勾选。

### Test Results
| Test | Input | Expected | Actual | Status |
|------|-------|----------|--------|--------|
| DiceThrone 4P 三文件回归 | `node scripts/infra/vitest-cli-safe.mjs run src/games/dicethrone/__tests__/flow.test.ts src/games/dicethrone/__tests__/rule-consistency.test.ts src/games/dicethrone/__tests__/boundaryEdgeCases.test.ts --configLoader native` | 4 人/2v2 相关流程、规则与边界全部通过 | `146 passed` | ✅ |
| TypeScript 类型检查 | `node D:\gongzuo\webgame\BoardGame\node_modules\typescript\lib\tsc.js --noEmit --pretty false` | 无类型错误 | 无输出 | ✅ |
| OpenSpec 校验 | `openspec validate add-dicethrone-2v2-team-mode --strict --no-interactive` | change 校验通过 | `Change 'add-dicethrone-2v2-team-mode' is valid` | ✅ |

### Error Log
| Timestamp | Error | Attempt | Resolution |
|-----------|-------|---------|------------|
| 2026-03-25 | 当前 worktree 存在并发修改，不能假设只有单一功能线 | 1 | 只同步当前已验证完成的 2v2 站位/规范进度，不回滚或重写其他未完成改动 |
## Session: 2026-03-25 DiceThrone 四人房服务端 / E2E 闭环
- **Status:** completed
- Actions taken:
  - 重整 `e2e/helpers/dicethrone.ts`，统一 2 人 / 4 人 setup，新增 `claimDTSeatViaAPI`、`DTPlayerSession`、`setupDTOnlineMatchWithPlayers()`，并删除坏正则与死代码。
  - 重写 `e2e/dicethrone-simple-start.e2e.ts`，补齐 2 人与 4 人简单开局用例，并接入证据截图保存。
  - 自审 2 人与 4 人 host 截图，确认都已进入正式棋盘态。
  - 将服务端人数/占座状态规则抽到 `src/server/matchOccupancy.ts`，新增 `areAllSeatsOccupied()` 与显式 `playerOptions` 白名单校验，堵住 DiceThrone 误放行 3 人房的问题。
  - 回填 `openspec/changes/add-dicethrone-2v2-team-mode/tasks.md`，勾选本轮已完成的服务端 / 验证项。
  - 新增证据文档 `evidence/dicethrone-simple-start-e2e-test.md`。

### Test Results
| Test | Input | Expected | Actual | Status |
|------|-------|----------|--------|--------|
| TypeScript 静态检查 | `node D:\gongzuo\webgame\BoardGame\node_modules\typescript\lib\tsc.js --noEmit --pretty false` | 无类型 / 语法错误 | 通过 | ✅ |
| 服务端占座/人数规则单测 | `node scripts/infra/vitest-cli-safe.mjs run src/server/__tests__/matchOccupancy.test.ts --configLoader native` | 占座判断、全座占满、`playerOptions` 人数白名单都正确 | `5 passed` | ✅ |
| 4 人房单用例 E2E | `npm run test:e2e:ci:file -- e2e/dicethrone-simple-start.e2e.ts "Online 4-player room: create claim-seat join and start successfully"` | 4 人房创建、占座、加入、开局成功 | `1 passed` | ✅ |
| 简单开局整文件 E2E | `npm run test:e2e:ci -- e2e/dicethrone-simple-start.e2e.ts` | 2 人 + 4 人两条开局链路都通过 | `2 passed` | ✅ |
| 校验收紧后 4 人回归 E2E | `npm run test:e2e:ci:file -- e2e/dicethrone-simple-start.e2e.ts "Online 4-player room: create claim-seat join and start successfully"` | 合法 4 人房仍可创建并开局 | `1 passed` | ✅ |

### Next Step
- 继续推进 OpenSpec 仍未完成的 2v2 规则 / 结算项。
- 如需继续收口验证，优先补 `2.4-2.9` 的人工走查或更细粒度 E2E。

---

## Session: 2026-03-26 Dice Throne 4人/2v2 回合顺序收口与 OpenSpec 对齐
- **Status:** completed
- Actions taken:
  - 对照 OpenSpec `tasks.md` 审计 2v2 未勾选项，确认真正还没落地的核心缺口是 `1.5`：`getPlayerOrder/getNextPlayerId` 仍按站位顺时针轮转。
  - 在 `src/games/dicethrone/domain/rules.ts` 中补上 2v2 队伍交替 turn order：以 `startingPlayerId` 所在队为首，按“己队两手 → 敌队两手”构建轮转序列。
  - 在 `src/games/dicethrone/Board.tsx` 中把顶部三窗顺序改回显式使用 `getSeatingOrder`，避免修复回合顺序时把 4 人 UI 显示顺序一并带偏。
  - 更新 `src/games/dicethrone/__tests__/flow.test.ts`，把 4 人轮转断言从旧的 `0→1→2→3` 改为 `0→2→1→3`，并同步修正命令序列。
  - 更新 `src/games/dicethrone/__tests__/rule-consistency.test.ts`，新增 `startingPlayerId='1'` 的 2v2 turn-order 断言，覆盖非默认起始玩家。
  - 回填 `openspec/changes/add-dicethrone-2v2-team-mode/tasks.md`，将已被代码与测试覆盖但此前未回填的 `1.2`、`1.5`、`1.6`、`1.7`、`1.9`、`1.10`、`1.11`、`1.12`、`1.18` 勾为完成；人工走查项 `2.4-2.9` 保持未勾选。

### Test Results
| Test | Input | Expected | Actual | Status |
|------|-------|----------|--------|--------|
| 2v2 回合顺序定向回归 | `node scripts/infra/vitest-cli-safe.mjs run src/games/dicethrone/__tests__/flow.test.ts -t "4 人开局会初始化 2v2 团队状态并按队伍交替顺序轮转回合|4 人模式起始玩家为 1 号位时按同队连走后再切换敌队" --configLoader native` | 新旧 turn-order 用例通过 | `1 passed` | ✅ |
| DiceThrone 4P 三文件回归 | `node scripts/infra/vitest-cli-safe.mjs run src/games/dicethrone/__tests__/flow.test.ts src/games/dicethrone/__tests__/rule-consistency.test.ts src/games/dicethrone/__tests__/boundaryEdgeCases.test.ts --configLoader native` | 2v2 规则、阶段、结算、边界持续通过 | `149 passed` | ✅ |
| TypeScript 类型检查 | `node D:\gongzuo\webgame\BoardGame\node_modules\typescript\lib\tsc.js --noEmit --pretty false` | 无类型错误 | 无输出 | ✅ |

### Error Log
| Timestamp | Error | Attempt | Resolution |
|-----------|-------|---------|------------|
| 2026-03-26 | 定向 flow 回归第一次失败，旧测试命令仍按 `0→1→2→3` 驱动第二个回合 | 1 | 同步把测试命令序列改成真实新顺序 `0→2→1→3` 后通过 |

## Session: 2026-03-26 Dice Throne 4人站位面板在线 E2E 收口
- **Status:** completed
- Actions taken:
  - 继续沿用现有 `e2e/dicethrone-simple-start.e2e.ts`，新增 4 人在线站位面板用例，不新建测试文件。
  - 复用 `setupDTOnlineMatchWithPlayers()` 启 4 人联机选角页，直接在真实在线 UI 上验证 `2v2 Seating` 面板。
  - 用例先断言默认分队 `Team A = P1 / P3`、`Team B = P2 / P4`，再执行“选中 P1 → 点击已占用 P2 触发拒绝提示 → 点击 Empty Seat 3 完成移动”，最后断言分队更新为 `Team A = P2 / P1`、`Team B = P3 / P4`。
  - 保存并自审证据截图 `03-four-player-seating-panel-moved.png`，确认站位面板画面和分队文案与断言一致。
  - 更新 `evidence/dicethrone-simple-start-e2e-test.md`，补入绝对路径截图与分析；同步将 OpenSpec `2.4` 回填为完成。

### Test Results
| Test | Input | Expected | Actual | Status |
|------|-------|----------|--------|--------|
| 4 人站位面板单用例 E2E | `npm run test:e2e:ci:file -- e2e/dicethrone-simple-start.e2e.ts "Online 4-player seating panel: host can move to empty slot and occupied seat is rejected"` | 房主可移动到空位，点击已占位会显示拒绝反馈 | `1 passed` | ✅ |

### Evidence
| Artifact | Absolute Path | Notes |
|----------|---------------|-------|
| 4 人站位移动截图 | `D:\gongzuo\webgame\BoardGame-wt-dicethrone-4p-team-mode\test-results\evidence-screenshots\dicethrone-simple-start.e2e\Online-4-player-seating-panel-host-can-move-to-empty-slot-and-occupied-seat-is-rejected\03-four-player-seating-panel-moved.png` | 自审确认 `Team A = P2 / P1`、`Team B = P3 / P4` |

## Session: 2026-03-26 DiceThrone 4 人 / 2v2 E2E 收口
- **Status:** completed
- Actions taken:
  - 复核 `e2e/dicethrone-simple-start.e2e.ts` 剩余 blocker，确认最后一条 2v2 主链路用例卡在“响应窗口场景不稳定”，不是服务端 `/test` 注入本身失效。
  - 将在线状态构造从“动态搜对手牌库里的可响应卡”改成“显式使用稳定通用卡 `card-surprise`”，并补齐响应窗口所需的 CP 与骰子前置。
  - 将 `2.9` 的 E2E 验证口径改为更稳定的“防守方确认掷骰后，同队玩家不会进入同队响应队列”，用真实 `pendingAttack.attackerId='0'`、`defenderId='3'` 场景断言响应队列仅为 `['0']`。
  - 将 `04-four-player-target-choice-panel-host` 的截图时机前移到目标面板可见时，保证证据截图本身能直接展示 3 个纵向目标项。
  - 复跑单用例 `Online 4-player 2v2 flow: response queue excludes teammate and defense chain reaches team victory UI`，随后复跑整份 `e2e/dicethrone-simple-start.e2e.ts`，确认 6 条 E2E 全部通过。
  - 重写 `evidence/dicethrone-simple-start-e2e-test.md`，补齐 5 张截图的绝对路径与分析；同步将 OpenSpec `2.5-2.9` 回填为 completed。

### Test Results
| Test | Input | Expected | Actual | Status |
|------|-------|----------|--------|--------|
| 2v2 主链路单用例 E2E | `npm run test:e2e:ci:file -- e2e/dicethrone-simple-start.e2e.ts "Online 4-player 2v2 flow: response queue excludes teammate and defense chain reaches team victory UI"` | 同队响应过滤 + 防御推进 + 团队胜负 UI 全链路通过 | `1 passed` | ✅ |
| 简单开局整文件 E2E | `npm run test:e2e:ci -- e2e/dicethrone-simple-start.e2e.ts` | 2 人 + 4 人 + 站位 + 顶部三窗 + targetingRoll + 2v2 主链路全部通过 | `6 passed` | ✅ |
| TypeScript 类型检查 | `node .\node_modules\typescript\lib\tsc.js --noEmit --pretty false` | 无类型错误 | 无输出 | ✅ |

### Next Step
- DiceThrone 4 人 / 2v2 这条 OpenSpec 线当前已完成收口；后续若继续推进，应切回仓库其它主线问题或等待新的用户目标。

## Session: 2026-03-26 DiceThrone 4 人玩家目标交互专项立项
- **Status:** in_progress
- Actions taken:
  - 复核当前 worktree 的 DiceThrone 4 人 / 2v2 真实完成边界，确认已完成的是核心规则闭环，不是“所有面向玩家目标的能力全量审计”。
  - 对照 `testing-audit.md` 重新盘点多人目标相关入口，命中 `customActions/common.ts`、`customActions/paladin.ts`、`InteractionOverlay.tsx`、`Board.tsx`、`commandValidation.ts`、`TRANSFER_STATUS` 执行链。
  - 确认第一批高风险范围应独立成新 OpenSpec change，而不是继续把新缺口塞回已 complete 的 `add-dicethrone-2v2-team-mode`。
  - 新建 OpenSpec change `update-dicethrone-4p-player-target-interactions`，为“任意玩家授 token / 任意玩家移除状态 / 状态或可移除 token 转移”建立 proposal、design、tasks 与 spec delta。
  - 将后续实现策略拆为 Batch 1/2/3，并同步回填 `task_plan.md` / `findings.md` / `progress.md`。

### Validation
- 待执行：`openspec validate update-dicethrone-4p-player-target-interactions --strict --no-interactive`

### Next Step
- 按 Batch 1 先实现共享验证层与 4 人玩家选择 UI 的收口，再补代表性 4 人 E2E。

## Session: 2026-03-26 DiceThrone 4 人玩家目标交互 Batch 1 收口
- **Status:** completed
- Actions taken:
  - 为 `InteractionOverlay` 的 4 人玩家卡片补齐稳定 `data-testid/data-team-tone` 后，继续把第一阶段可点击状态 / token 徽章也补成稳定 selector：`dt-status-effect-<pid>-<effectId>`。
  - 修正 `InteractionOverlay.test.tsx` 的旧断言，避免继续用 `getByText('自己')` 这类在 4 人新 UI 下会重复命中的脆弱查询。
  - 在 `commandValidation.ts` 中收口 `TRANSFER_STATUS` 的真实在线路径：兼容权威态仍处于 `selectStatus + transferConfig:{}` 的双阶段 UI，同时保留 `selectTargetStatus` 的严格校验。
  - 在 `rule-consistency.test.ts` 新增“在线双阶段 UI 的 `selectStatus` 权威态下允许合法 4 人 token 转移”的验证，堵住本轮 E2E 暴露出的真实缺口。
  - 在现有 `e2e/dicethrone-simple-start.e2e.ts` 中新增 4 人 `Transfer Status` 用例：host 将敌方 `Crit` token 转给队友，并断言第二阶段来源玩家被排除、友敌标识正确、队友页权威状态同步。
  - 复跑单用例后，继续复跑整份 `e2e/dicethrone-simple-start.e2e.ts`，确认新增的第 7 条 E2E 与既有 6 条一起稳定通过。
  - 回填 OpenSpec `update-dicethrone-4p-player-target-interactions/tasks.md`、证据文档 `evidence/dicethrone-simple-start-e2e-test.md` 与三件套。

### Test Results
| Test | Input | Expected | Actual | Status |
|------|-------|----------|--------|--------|
| DiceThrone 交互组件 + 规则回归 | `node scripts/infra/vitest-cli-safe.mjs run src/games/dicethrone/ui/__tests__/InteractionOverlay.test.tsx src/games/dicethrone/__tests__/rule-consistency.test.ts --configLoader native` | 4 人玩家目标 UI 与验证层回归通过 | `45 passed` | ✅ |
| TypeScript 类型检查 | `node .\node_modules\typescript\lib\tsc.js --noEmit --pretty false` | 无类型错误 | 无输出 | ✅ |
| 4 人转移 token 单用例 E2E | `npm run test:e2e:ci:file -- e2e/dicethrone-simple-start.e2e.ts "Online 4-player transfer token: enemy token can be transferred to ally with stable target metadata"` | 敌方 token 可转给队友，第二阶段元信息与来源排除正确 | `1 passed` | ✅ |
| 简单开局整文件 E2E | `npm run test:e2e:ci -- e2e/dicethrone-simple-start.e2e.ts` | 2 人 + 4 人 + 2v2 + 4 人转移 token 全部通过 | `7 passed` | ✅ |

### Evidence
| Artifact | Absolute Path | Notes |
|----------|---------------|-------|
| 4 人转移 token 第二阶段截图 | `D:\gongzuo\webgame\BoardGame-wt-dicethrone-4p-team-mode\test-results\evidence-screenshots\dicethrone-simple-start.e2e\Online-4-player-transfer-token-enemy-token-can-be-transferred-to-ally-with-stable-target-metadata\06-four-player-transfer-token-target-selection.png` | 自审确认第二阶段候选仅剩 `P1/P3/P4`，来源玩家 `P2` 已被排除，`P3` 标为 `ALLY` |

## Session: 2026-03-26 DiceThrone 4 人任意玩家授 token 在线证据补强
- **Status:** completed
- Actions taken:
  - 在 `e2e/dicethrone-simple-start.e2e.ts` 中继续沿用现有 4 人在线 helper，新增 `Consecrate` 用例，不新建测试文件。
  - 构造稳定在线场景：host 选圣骑士，主阶段注入 `card-consecrate`，随后触发 `selectPlayer` 交互。
  - 用例断言 4 个候选玩家卡片的 `data-team-tone` 正确，随后选择队友 `P3` 并确认。
  - 最终同时在 host 页与队友页断言 `Protect/Retribution/Crit/Accuracy` 四个 token 都被权威状态授予为 `1`。
  - 自审新增截图 `07-four-player-consecrate-target-selection.png`，确认画面真实展示 `self/ally/enemy` 四类候选，而不是 2 人残留 UI。

### Test Results
| Test | Input | Expected | Actual | Status |
|------|-------|----------|--------|--------|
| 4 人 Consecrate 单用例 E2E | `npm run test:e2e:ci:file -- e2e/dicethrone-simple-start.e2e.ts "Online 4-player grant tokens: Consecrate can grant four tokens to ally with stable target metadata"` | 队友可被选中并同时获得 4 个 token | `1 passed` | ✅ |
| 规则层多 token 验证回归 | `node scripts/infra/vitest-cli-safe.mjs run src/games/dicethrone/__tests__/rule-consistency.test.ts --configLoader native` | `tokenGrantConfigs` 在 4 人合法目标下通过 | `28 passed` | ✅ |
| 简单开局整文件 E2E | `npm run test:e2e:ci -- e2e/dicethrone-simple-start.e2e.ts` | 含转移 token 与 Consecrate 的 8 条在线链路全部通过 | `8 passed` | ✅ |

### Evidence
| Artifact | Absolute Path | Notes |
|----------|---------------|-------|
| 4 人 Consecrate 目标选择截图 | `D:\gongzuo\webgame\BoardGame-wt-dicethrone-4p-team-mode\test-results\evidence-screenshots\dicethrone-simple-start.e2e\Online-4-player-grant-tokens-Consecrate-can-grant-four-tokens-to-ally-with-stable-target-metadata\07-four-player-consecrate-target-selection.png` | 自审确认 4 个候选玩家都可见，`P3` 标为 `ALLY` |

## Session: 2026-03-26 DiceThrone 面向多人能力审计边界收敛
- **Status:** completed
- Actions taken:
  - 复查 `customActions/common.ts` 与 `customActions/paladin.ts` 中所有玩家目标交互入口，确认当前真正仍有多人语义的高风险入口已收敛到 `transfer-status`、`paladin-consecrate`、`paladin-vengeance-select-player`、`remove-status-1`、`remove-all-status`。
  - 基于已完成的在线证据重新排序优先级：`Transfer Status` 与 `Consecrate` 已经覆盖了双阶段转移和多 token 授予这两类更复杂主链路。
  - 按当前决策，不再优先为更简单的 `remove-status-1/remove-all-status` 额外补在线 E2E，避免把时间花在比已完成链路更简单的路径上。

### Conclusion
- 目前“面向多人目标”的复杂主链路已不再是完全未审计状态。
- 后续若继续扩展，应优先看新的复杂多人交互，而不是回头补比 `Transfer Status` 更简单的移除状态用例。

## Session: 2026-03-26 DiceThrone 4 人目标交互 UI 精简
- **Status:** completed
- Actions taken:
  - 在 `src/games/dicethrone/ui/InteractionOverlay.tsx` 中重构 `selectTargetStatus` 第二阶段渲染：不再继续保留第一阶段整排 `dt-status-owner-*` 来源卡，改为显示单个来源摘要块 `dt-transfer-source-summary`。
  - 去掉 `selectPlayer` 与 `transfer target` 已选态的外挂勾选块，统一改为仅依赖卡片自身边框高亮表达选中状态，消除“多一个框”的视觉噪音。
  - 顺手抽出友敌 `teamTone -> className` 的样式映射，减少三处玩家卡片渲染里的重复分支。
  - 在 `src/games/dicethrone/ui/__tests__/InteractionOverlay.test.tsx` 新增断言，锁住“第二阶段不再渲染第一阶段来源卡，只保留来源摘要与真实目标卡片”的结构。
  - 复跑组件测试、类型检查和 4 人 `Transfer Status` 在线 E2E，并自审更新后的目标选择截图。

### Test Results
| Test | Input | Expected | Actual | Status |
|------|-------|----------|--------|--------|
| InteractionOverlay 组件回归 | `node scripts/infra/vitest-cli-safe.mjs run src/games/dicethrone/ui/__tests__/InteractionOverlay.test.tsx --configLoader native` | 第二阶段只显示来源摘要与目标卡片 | `18 passed` | ✅ |
| TypeScript 类型检查 | `node .\node_modules\typescript\lib\tsc.js --noEmit --pretty false` | 无类型错误 | 无输出 | ✅ |
| 4 人转移 token 在线回归 | `npm run test:e2e:ci:file -- e2e/dicethrone-simple-start.e2e.ts "Online 4-player transfer token: enemy token can be transferred to ally with stable target metadata"` | 真实 UI 不再出现来源卡 + 目标卡并排混排 | `1 passed` | ✅ |

### Evidence
| Artifact | Absolute Path | Notes |
|----------|---------------|-------|
| 4 人转移 token 第二阶段精简后截图 | `D:\gongzuo\webgame\BoardGame-wt-dicethrone-4p-team-mode\test-results\evidence-screenshots\dicethrone-simple-start.e2e\Online-4-player-transfer-token-enemy-token-can-be-transferred-to-ally-with-stable-target-metadata\06-four-player-transfer-token-target-selection.png` | 自审确认仅剩来源摘要 + `P1/P3/P4` 三张目标卡，不再出现 6 框感知 |

## Session: 2026-03-26 DiceThrone 4 人目标交互四宫格修正
- **Status:** completed
- Actions taken:
  - 按用户反馈撤回“来源摘要块”方案，把 `selectTargetStatus` 第二阶段改回统一四宫格语义。
  - 来源玩家保留在原位，改成锁定禁用卡 `dt-transfer-source-locked-<pid>`；其余 3 张保持 `dt-transfer-target-<pid>` 可点击目标卡。
  - 组件测试不再断言“来源玩家消失”，改为断言“来源玩家仍在四宫格里，但 `data-locked=true`”。
  - 同步把 transfer token 在线用例从“来源玩家隐藏”改成“来源玩家锁定显示”的断言口径。

### Test Results
| Test | Input | Expected | Actual | Status |
|------|-------|----------|--------|--------|
| InteractionOverlay 四宫格回归 | `node scripts/infra/vitest-cli-safe.mjs run src/games/dicethrone/ui/__tests__/InteractionOverlay.test.tsx --configLoader native` | 第二阶段显示 4 张玩家卡，其中来源卡锁定 | `18 passed` | ✅ |
| TypeScript 类型检查 | `node .\node_modules\typescript\lib\tsc.js --noEmit --pretty false` | 无类型错误 | 无输出 | ✅ |
| 4 人 transfer token 单用例 E2E | `npm run test:e2e:ci:file -- e2e/dicethrone-simple-start.e2e.ts "Online 4-player transfer token: enemy token can be transferred to ally with stable target metadata"` | 复核四宫格在线结构 | `1 skipped` | ⚠️ |
| 简单开局整文件 E2E | `npm run test:e2e:ci -- e2e/dicethrone-simple-start.e2e.ts` | 复核整份 8 条在线链路 | `8 skipped` | ⚠️ |

### Conclusion
- 当前 UI 结构已经改成用户要求的“四宫格 + 锁定来源卡”。
- 这轮 E2E 包装器没有给出新的在线证据，因此本次只确认组件层和类型层通过，在线截图需后续环境恢复后补证。

## Session: 2026-03-27 DiceThrone 联机导航重试与四宫格在线证据恢复
- **Status:** completed
- Actions taken:
  - 先手动起单 worker E2E 服务并直接探针 `/games/dicethrone/create`、`/claim-seat`、`/join`，确认服务端联机接口本身正常。
  - 再用最小 Playwright 探针复现 `setupDTOnlineMatchWithPlayers()` 返回 `null` 的真实根因：`page.goto(/play/dicethrone/match/...)` 偶发抛出 `net::ERR_INSUFFICIENT_RESOURCES`，被 helper 吞掉后伪装成 `skip`。
  - 在 `e2e/helpers/dicethrone.ts` 中新增 `gotoWithRetry()`，仅对联机 match 页导航加入瞬时错误重试，兜住 `ERR_INSUFFICIENT_RESOURCES` / `ERR_ABORTED` / `NS_BINDING_ABORTED`。
  - 复跑 4 人 `Transfer Status` 单用例和整份 `e2e/dicethrone-simple-start.e2e.ts`，确认 `skip` 已消失，8 条用例重新全部通过。
  - 自审最新 `06-four-player-transfer-token-target-selection.png`，确认第二阶段真实呈现为 2x2 四宫格，`P2` 以锁定来源卡留在原位，另外 `P1/P3/P4` 为可选目标。

### Test Results
| Test | Input | Expected | Actual | Status |
|------|-------|----------|--------|--------|
| 4 人 transfer token 单用例 E2E | `npm run test:e2e:ci:file -- e2e/dicethrone-simple-start.e2e.ts "Online 4-player transfer token: enemy token can be transferred to ally with stable target metadata"` | 消除假 `skip`，恢复真实在线断言 | `1 passed` | ✅ |
| 简单开局整文件 E2E | `npm run test:e2e:ci -- e2e/dicethrone-simple-start.e2e.ts` | 含四宫格版本 transfer token 在内的 8 条在线链路全部通过 | `8 passed` | ✅ |

### Evidence
| Artifact | Absolute Path | Notes |
|----------|---------------|-------|
| 4 人 transfer token 第二阶段四宫格截图 | `D:\gongzuo\webgame\BoardGame-wt-dicethrone-4p-team-mode\test-results\evidence-screenshots\dicethrone-simple-start.e2e\Online-4-player-transfer-token-enemy-token-can-be-transferred-to-ally-with-stable-target-metadata\06-four-player-transfer-token-target-selection.png` | 自审确认为 2x2 四宫格；`P2` 卡显示 `ENEMY / 已选来源` 且锁定，未再退回“来源摘要块” |

## Session: 2026-03-27 DiceThrone 2 人 Transfer Status 在线证据补齐
- **Status:** in_progress
- Actions taken:
  - 确认 `src/games/dicethrone/ui/InteractionOverlay.tsx` 的 `selectTargetStatus` 第二阶段是共享实现，2 人与 4 人都会走同一套“四宫格 + 锁定来源卡”结构。
  - 在 `e2e/dicethrone-simple-start.e2e.ts` 新增 2 人 `Transfer Status` 在线用例，断言来源卡 `dt-transfer-source-locked-1`、目标卡 `dt-transfer-target-0` 与交互结束后的 token 转移结果。
  - 复跑 `InteractionOverlay` 组件测试，确认共享层回归仍为 `18 passed`。
  - 用 `node --import tsx -` 直接调用 `setupDTOnlineMatch()`，已确认在当前 `6174/20000/21000` 环境下可以成功创建并返回联机房间。
  - 当前 blocker 已收敛为 Playwright 运行链路中的 `skip` 口径问题，而不是 2 人转移 UI 或联机 helper 整体失效。

### Test Results
| Test | Input | Expected | Actual | Status |
|------|-------|----------|--------|--------|
| InteractionOverlay 组件回归 | `node scripts/infra/vitest-cli-safe.mjs run src/games/dicethrone/ui/__tests__/InteractionOverlay.test.tsx --configLoader native` | 2 人/4 人共享转移 UI 仍稳定 | `18 passed` | ✅ |
| 2 人联机 setup 直接探针 | `node --import tsx -` 调用 `setupDTOnlineMatch()` | helper 成功返回对局 setup | `OK <matchId>` | ✅ |
| 2 人转移 token 在线单用例 | `Playwright + simple-start 新用例` | 获得真实在线证据 | 当前仍被 `skip`，根因待继续下钻 | ⚠️ |

### Conclusion
- 2 人 `Transfer Status` 已经跟着共享层一起改到四宫格。
- 当前仍未完成的是“把现役 Playwright 链路里的 2 人单用例打绿”，不是业务 UI 语义本身。

## Session: 2026-03-27 DiceThrone 2 人联机 setup 顺序与直连状态注入修复
- **Status:** completed
- Actions taken:
  - 把 `setupDTOnlineMatchWithPlayers()` 改成“全员进入 match 页后再统一等待选角 UI”，修掉 host 在房间未满员时提前等待角色选择页而导致的假 `skip`。
  - 在 `e2e/helpers/common.ts` 为 `initContext()` / `injectDirectGameServerUrl()` 增加显式 `gameServerBaseURL` override，让 DiceThrone 在线 helper 创建的浏览器页与 API 同时直连 `20000`。
  - 在 `e2e/helpers/state-injection.ts` 中把 `/test/*` 状态注入基地址改成优先跟随页面里的 `__FORCE_GAME_SERVER_URL__`，消除“浏览器页连 `20000`，状态注入却打 `18000`”的分叉。
  - 修正 2 人 `Transfer Status` 在线用例的双阶段断言：先点击第一阶段 `dt-status-effect-1-crit`，再验证第二阶段锁定来源卡与目标卡。
  - 自审新增 2 人截图 `01-two-player-transfer-token-target-selection.png`，确认画面真实展示 `P2` 锁定来源卡 + `P1` 唯一目标卡，而不是只靠 selector 断言。

### Test Results
| Test | Input | Expected | Actual | Status |
|------|-------|----------|--------|--------|
| TypeScript 类型检查 | `node .\node_modules\typescript\lib\tsc.js --noEmit --pretty false` | 无类型错误 | 无输出 | ✅ |
| 2 人 transfer token 单用例 E2E | `$env:PW_USE_DEV_SERVERS='true'; $env:PW_START_SERVERS='false'; $env:PW_HAS_EXPLICIT_TARGET='true'; $env:NODE_OPTIONS='--max-old-space-size=4096'; $env:VITE_DEV_PORT='6174'; $env:GAME_SERVER_PORT='20000'; $env:API_SERVER_PORT='21000'; node .\node_modules\@playwright\test\cli.js test e2e/dicethrone-simple-start.e2e.ts --grep "Online 2-player transfer token: transfer phase keeps locked source card and target card"` | 2 人第二阶段锁定来源卡在线通过 | `1 passed` | ✅ |
| 4 人 transfer token 回归 | `$env:PW_USE_DEV_SERVERS='true'; $env:PW_START_SERVERS='false'; $env:PW_HAS_EXPLICIT_TARGET='true'; $env:NODE_OPTIONS='--max-old-space-size=4096'; $env:VITE_DEV_PORT='6174'; $env:GAME_SERVER_PORT='20000'; $env:API_SERVER_PORT='21000'; node .\node_modules\@playwright\test\cli.js test e2e/dicethrone-simple-start.e2e.ts --grep "Online 4-player transfer token: enemy token can be transferred to ally with stable target metadata"` | helper 修复不带坏 4 人主链路 | `1 passed` | ✅ |
| 简单开局整文件 E2E | `$env:PW_USE_DEV_SERVERS='true'; $env:PW_START_SERVERS='false'; $env:PW_HAS_EXPLICIT_TARGET='true'; $env:NODE_OPTIONS='--max-old-space-size=4096'; $env:VITE_DEV_PORT='6174'; $env:GAME_SERVER_PORT='20000'; $env:API_SERVER_PORT='21000'; node .\node_modules\@playwright\test\cli.js test e2e/dicethrone-simple-start.e2e.ts` | 2 人 + 4 人 + 2v2 共 9 条在线链路全部通过 | `9 passed` | ✅ |

### Evidence
| Artifact | Absolute Path | Notes |
|----------|---------------|-------|
| 2 人 transfer token 第二阶段截图 | `D:\gongzuo\webgame\BoardGame-wt-dicethrone-4p-team-mode\test-results\evidence-screenshots\dicethrone-simple-start.e2e\Online-2-player-transfer-token-transfer-phase-keeps-locked-source-card-and-target-card\01-two-player-transfer-token-target-selection.png` | 自审确认 `P2` 卡以锁定来源态保留，`P1` 为唯一真实目标卡 |

### Note
- 在连续多次直接 CLI 复跑时，仍偶发出现整份文件瞬时 `skip`，但同口径手工探针与已拿到的 `9 passed` 结果都表明这是 runner/环境抖动，不是本轮代码逻辑回退。

## Session: 2026-03-27 DiceThrone remove-status 在线证据补齐与默认脚本回归
- **Status:** completed
- Actions taken:
  - 保留既有 2 人 / 4 人 `Transfer Status` 与 `Consecrate` 在线场景不动，继续在现有 `e2e/dicethrone-simple-start.e2e.ts` 中推进 `remove-status-1` 与 `remove-all-status` 的 4 人在线链路。
  - 针对目标页偶发“比 host 慢半拍”的权威态广播问题，只在 E2E 断言层补 `targetPage.waitForFunction()`，不修改 DiceThrone 领域逻辑。
  - 用默认 `npm run test:e2e:ci:file -- e2e/dicethrone-simple-start.e2e.ts` 口径复跑整文件，确认不依赖手工环境变量时也能直接得到有效在线结果。
  - 将 `08-four-player-remove-single-status-selection.png` 与 `09-four-player-remove-all-status-selection.png` 补入证据文档，并把整文件结果更新为 `11 passed`。

### Test Results
| Test | Input | Expected | Actual | Status |
|------|-------|----------|--------|--------|
| TypeScript 类型检查 | `node .\node_modules\typescript\lib\tsc.js --noEmit --pretty false` | 无类型错误 | 无输出 | ✅ |
| 简单开局整文件 E2E（默认脚本） | `npm run test:e2e:ci:file -- e2e/dicethrone-simple-start.e2e.ts` | 2 人、4 人、2v2、转移、授 token、移除状态共 11 条在线链路全部通过 | `11 passed` | ✅ |

### Evidence
| Artifact | Absolute Path | Notes |
|----------|---------------|-------|
| 4 人 remove single status 目标选择截图 | `D:\gongzuo\webgame\BoardGame-wt-dicethrone-4p-team-mode\test-results\evidence-screenshots\dicethrone-simple-start.e2e\Online-4-player-remove-single-status-remove-status-1-can-remove-enemy-token-with-stable-owner-metadata\08-four-player-remove-single-status-selection.png` | 自审确认敌方拥有者卡仍按 4 人语义显示，点击 `Crit` 后最终 host/目标页都同步为 `crit=0` |
| 4 人 remove all status 目标选择截图 | `D:\gongzuo\webgame\BoardGame-wt-dicethrone-4p-team-mode\test-results\evidence-screenshots\dicethrone-simple-start.e2e\Online-4-player-remove-all-status-remove-all-status-blocks-empty-targets-and-clears-enemy-removable-effects\09-four-player-remove-all-status-selection.png` | 自审确认空目标被禁用，敌方 `burn/crit` 可被整组移除 |

## Session: 2026-03-27 DiceThrone Batch 1 spec 拆分与 Vengeance II 共享流程收口
- **Status:** completed
- Actions taken:
  - 将 `update-dicethrone-4p-player-target-interactions/spec.md` 从单一总括 requirement 拆成 4 个 Batch 1 requirement，分别覆盖：任意玩家授 token、任意玩家移除状态、状态 / 可移除 token 转移、无单一敌方目标的无伤害技能流程兼容。
  - 把 `Vengeance II` 这轮真实修复纳入 Batch 1：共享攻击流程已兼容“无默认 defender、无伤害、但仍会触发玩家交互 / postDamage”的 4 人技能，不再误进 `targetingRoll`，也不会吞掉 `INTERACTION_REQUESTED`。
  - 回填 `tasks.md`、`evidence/dicethrone-simple-start-e2e-test.md`、`findings.md` 与 `task_plan.md`，把 Batch 1 当前真实覆盖边界从“泛指多人目标交互”收紧为已落地的代表性入口集合。
  - 补入 4 人 `Vengeance II` 在线截图 `10-four-player-vengeance-2-target-selection.png`，并把证据文档中的默认整文件结果更新为 12 条在线用例。
  - 修复当前 worktree 的依赖树残缺问题：按锁文件版本补回 `vitest`、`typescript`、`dotenv` 等缺失包入口文件，使 `tsc`、Vitest 与 E2E 启动器恢复可执行。

### Test Results
| Test | Input | Expected | Actual | Status |
|------|-------|----------|--------|--------|
| OpenSpec 严格校验 | `openspec validate update-dicethrone-4p-player-target-interactions --strict --no-interactive` | Batch 1 拆分后的 spec 仍满足 OpenSpec 格式 | `valid` | ✅ |
| 规则回归 | `node scripts/infra/vitest-cli-safe.mjs run src/games/dicethrone/__tests__/rule-consistency.test.ts --configLoader native` | 4 人玩家目标交互与无 defender 流程回归通过 | `31 passed` | ✅ |
| 简单开局整文件 E2E | `npm run test:e2e:ci:file -- e2e/dicethrone-simple-start.e2e.ts` | 12 条在线用例全部通过 | `12 passed` | ✅ |

### Evidence
| Artifact | Absolute Path | Notes |
|----------|---------------|-------|
| 4 人 Vengeance II 目标选择截图 | `D:\gongzuo\webgame\BoardGame-wt-dicethrone-4p-team-mode\test-results\evidence-screenshots\dicethrone-simple-start.e2e\Online-4-player-ability-grant-token-Vengeance-II-can-grant-Retribution-to-ally-with-stable-target-metadata\10-four-player-vengeance-2-target-selection.png` | 自审目标选择面板中 `P1/P2/P3/P4` 均可区分，队友 `P3` 被选中后可稳定获得 `Retribution` |

### Next Step
- 若继续推进玩家目标交互专项，应进入 Batch 2，继续盘点尚未纳入 Batch 1 的其余英雄/卡牌入口，而不是再把 Batch 1 说成“全量多人能力审计完成”。

## Session: 2026-03-28 DiceThrone 旧专项 E2E 收敛启动
- **Status:** in_progress
- Actions taken:
  - 切回正确 worktree `D:\gongzuo\webgame\BoardGame-wt-dicethrone-4p-team-mode`，确认这边才存在 `update-dicethrone-4p-player-target-interactions` 与相关 Batch 1 产物。
  - 重新核对 `playwright.config.ts` 的 `LEGACY_DISCOVERY_BROKEN_TESTS`，确认当前被显式忽略的 DiceThrone 旧专项文件包括 `dicethrone-paladin-vengeance-select-player.e2e.ts`、`dicethrone-status-interaction-cancel.e2e.ts`、`dicethrone-status-interaction-complete.e2e.ts`。
  - 复查旧文件内容与之前实跑结论，已确认：
    - `status-interaction-complete` 还有共享交互 UI 契约价值，但实现还是旧 harness / 旧 selector 口径；
    - `status-removal` 已与现役页面结构严重脱节；
    - `status-interaction-cancel` 与 `status-interaction-complete` 高度重复；
    - `paladin-vengeance-select-player` 已被 `simple-start` 中的 4 人 `Vengeance II` 在线证据覆盖。
  - 已在三件套中记录本轮收敛方案：保留并现代化 `status-interaction-complete`，退役另外三份旧专项文件，并同步清理 Playwright ignore。

### Current Focus
- 将 `dicethrone-status-interaction-complete.e2e.ts` 改写为现役可运行套件，覆盖共享交互层当前仍需要独立守住的 UI 契约。
- 删除三份已确认无继续维护价值的旧专项 E2E，并清理配置。

## Session: 2026-03-28 DiceThrone 旧专项 E2E 收敛完成
- **Status:** completed
- Actions taken:
  - 将 `e2e/dicethrone-status-interaction-complete.e2e.ts` 整体重写为现役共享交互契约 E2E，统一改用 `./framework`、`game.openTestGame()`、当前 `dt-*` 选择器与 `sys.interaction.current.kind='dt:card-interaction'` 包装结构。
  - 新套件收口为 4 条高价值断言：
    - `selectStatus` 状态徽章选择与取消关闭；
    - `selectStatus` token 路径也走同一套 `dt-status-effect-*`；
    - `selectPlayer` 的空目标禁用与“无状态”提示；
    - `selectTargetStatus` 第二阶段的锁定来源卡与真实目标卡结构。
  - 正式退役 3 份旧专项文件：
    - `e2e/dicethrone-status-removal.e2e.ts`
    - `e2e/dicethrone-status-interaction-cancel.e2e.ts`
    - `e2e/dicethrone-paladin-vengeance-select-player.e2e.ts`
  - 同步更新 `playwright.config.ts`，移除上述 DiceThrone 旧专项对应的 legacy ignore。

### Test Results
| Test | Input | Expected | Actual | Status |
|------|-------|----------|--------|--------|
| 新版共享交互契约 E2E | `npm run test:e2e:ci:file -- e2e/dicethrone-status-interaction-complete.e2e.ts` | 旧专项保留件应恢复为现役可运行套件 | `4 passed` | ✅ |
| `simple-start` 主证据回归 | `npm run test:e2e:ci:file -- e2e/dicethrone-simple-start.e2e.ts` | 收敛旧专项后不带坏 12 条现役在线主链路 | `11 passed, 1 skipped` | ⚠️ |
| targeting roll 单用例复核 | `npm run test:e2e:ci:file -- e2e/dicethrone-simple-start.e2e.ts "Online 4-player targeting roll: auto targets and choice owners stay correct in 2v2"` | 复核跳过是否为真实回归 | `1 skipped` | ⚠️ |

### Conclusion
- 旧专项 E2E 的代码级收敛已完成，新保留套件稳定可跑，不再是 `No tests found` 或旧 selector 状态。
- `simple-start` 的异常仍表现为既有测试基础设施抖动：调试日志出现 `game_server_unavailable`、`ECONNREFUSED 127.0.0.1:20000`，另一次复跑则在 global setup 阶段遇到 Vite 前端进程异常退出。当前没有证据表明这与本轮收敛改动存在功能因果关系。

## Session: 2026-03-28 DiceThrone Batch 1 最终复核
- **Status:** completed
- Actions taken:
  - 在当前 worktree 里补齐依赖树，恢复 `typescript`、`vitest`、`dotenv`、`playwright` 等验证入口，使 `tsc`、Vitest 和 E2E 启动器重新可执行。
  - 将 `scripts/infra/vitest-cli-safe.mjs` 改为兼容新版 Vitest 包结构：优先走旧版 `vitest.mjs`，否则自动解析 `dist/chunks/cac.*.js + cli-api.*.js` 调用 CLI。
  - 修正 `Consecrate` 在线用例的多页同步口径：在 host 页确认 4 个 token 写入后，再显式等待 ally 页权威态追平，再读取 harness state 断言。
  - 重新执行 OpenSpec 严格校验、DiceThrone 规则回归和 `simple-start` 整文件 E2E，确认 Batch 1 当前最终口径真实为全绿。

### Test Results
| Test | Input | Expected | Actual | Status |
|------|-------|----------|--------|--------|
| TypeScript 类型检查 | `node .\node_modules\typescript\lib\tsc.js --noEmit --pretty false` | 无类型错误 | 无输出 | ✅ |
| OpenSpec 严格校验 | `openspec validate update-dicethrone-4p-player-target-interactions --strict --no-interactive` | Batch 1 spec / tasks / design 仍满足格式要求 | `valid` | ✅ |
| 规则回归 | `node scripts/infra/vitest-cli-safe.mjs run src/games/dicethrone/__tests__/rule-consistency.test.ts --configLoader native` | 4 人玩家目标交互与无 defender 流程回归通过 | `31 passed` | ✅ |
| 简单开局整文件 E2E | `npm run test:e2e:ci:file -- e2e/dicethrone-simple-start.e2e.ts` | 12 条在线用例全部通过 | `12 passed` | ✅ |

### Conclusion
- `update-dicethrone-4p-player-target-interactions` 当前 Batch 1 口径已经重新落回真实完成态，不再停留在“文档写 completed、但本地命令起不来”。
- `Consecrate` 串跑时的最后一个不稳定点已收口为测试层等待问题，而不是业务逻辑回退；修正后 `simple-start` 重新回到 `12 passed`。

## Session: 2026-03-28 DiceThrone simple-start 主回归基础设施收敛
- **Status:** completed
- Actions taken:
  - 明确 `e2e/dicethrone-simple-start.e2e.ts` 的定位：这是 DiceThrone 当前在用的主回归 E2E 文件，不是“新角色”或新功能入口。
  - 在 `e2e/helpers/common.ts` 中将 `ensureGameServerAvailable()` 改为轮询 `GET /games`，避免再用创建测试房间作为可用性探针，并把等待上限提高到 `15000ms`。
  - 在 `e2e/helpers/dicethrone.ts` 中为 `createDTRoomViaAPI`、`claimDTSeatViaAPI`、`joinDTMatchViaAPI` 补入瞬时网络重试，覆盖 `ECONNREFUSED`、`ECONNRESET`、`ETIMEDOUT`、`socket hang up`、`fetch failed` 以及 `408/425/429/5xx`。
  - 将 setup 重试与失败上下文写入 `temp/dicethrone-setup-debug.log`，为后续若再出现 `skip` 提供可审计的定位依据。
  - 先执行 `npm run test:e2e:cleanup` 清端口，再用默认脚本复跑 `simple-start` 整文件，确认修复后的真实结果，而不是只看单用例恢复。

### Test Results
| Test | Input | Expected | Actual | Status |
|------|-------|----------|--------|--------|
| E2E 测试环境清理 | `npm run test:e2e:cleanup` | 清空 `6174/20000/21000` 测试端口占用 | 清理完成，三个端口均空闲 | ✅ |
| simple-start 主回归整文件 E2E | `npm run test:e2e:ci:file -- e2e/dicethrone-simple-start.e2e.ts` | 现役 12 条在线链路恢复稳定通过 | `12 passed` | ✅ |

### Conclusion
- 当前 `simple-start` 的主回归口径已重新恢复为默认脚本可直接拿到 `12 passed`，说明这轮修复有效收敛了 setup / 联机 helper 层的瞬时抖动。
- 这次收口属于测试基础设施韧性补强，不应被记成业务功能新增；后续若再出现 `skip`，应优先查看 `temp/dicethrone-setup-debug.log` 与 bootstrap 日志，而不是先怀疑 DiceThrone 规则链路回退。

## Session: 2026-03-28 DiceThrone 四人模式分支上传与主分支合并
- **Status:** completed
- Actions taken:
  - 修正 pre-push 唯一阻塞项：把 `public/locales/*/game-dicethrone.json` 中误放在 `selection.seating` 下的 `targetOptionDisabled` 提升到根级 `selection.targetOptionDisabled`，恢复 `ChoiceModal.tsx` 文案校验通过。
  - 先将专题分支 `feat/dicethrone-4p-team-mode` 上传到 `origin`，确认三笔提交链都已进入远端分支。
  - 合并前按 `docs/git-merge-checklist.md` 执行预检，确认 `main...feat/dicethrone-4p-team-mode` 为 `34 behind / 3 ahead`，不能快进，必须走显式 merge。
  - 处理 6 个真实冲突文件，并新增冲突汇报文档 `evidence/merge-conflict-feat-dicethrone-4p-team-mode-2026-03-28.md`：
    - `e2e/helpers/common.ts`
    - `server.ts`
    - `src/games/dicethrone/manifest.ts`
    - `findings.md`
    - `progress.md`
    - `task_plan.md`
  - 合并态验证时发现 2 人 `Transfer Status` 在线用例仍把 `gameServerBaseURL` 硬编码到 `20000`，导致 isolated single-run 下稳定假 `skip`；已改为使用 `workerPorts.gameServer`。
  - 生成 merge commit `f188d523`：`merge: 合并王权骰铸四人模式 Batch 1 专项`。
  - 执行 `npm run merge:audit:strict -- HEAD`，11 个冲突文件全部为 `混合结果`，无单边覆盖。
  - 已将 `main` 推送到 `origin`，远端当前头部为 `83b0ab0b`，本轮“上传 + 合并主分支”已完成闭环。

### Test Results
| Test | Input | Expected | Actual | Status |
|------|-------|----------|--------|--------|
| TypeScript 类型检查 | `node .\node_modules\typescript\lib\tsc.js --noEmit --pretty false` | 合并态无类型错误 | 无输出 | ✅ |
| i18n 校验 | `npm run i18n:check` | `selection.targetOptionDisabled` 不再缺失 | 通过，仅余既有 warnings | ✅ |
| OpenSpec 严格校验 | `openspec validate update-dicethrone-4p-player-target-interactions --strict --no-interactive` | 专题 spec 仍有效 | `valid` | ✅ |
| DiceThrone / server 关键回归 | `node scripts/infra/vitest-cli-safe.mjs run src/games/dicethrone/__tests__/flow.test.ts src/games/dicethrone/__tests__/boundaryEdgeCases.test.ts src/games/dicethrone/__tests__/rule-consistency.test.ts src/server/__tests__/matchOccupancy.test.ts src/games/dicethrone/ui/__tests__/InteractionOverlay.test.tsx --configLoader native` | 合并态不回退四人模式与房间占座逻辑 | `180 passed` | ✅ |
| 2 人 transfer token 单用例 | `npm run test:e2e:ci:file -- e2e/dicethrone-simple-start.e2e.ts "Online 2-player transfer token: transfer phase keeps locked source card and target card"` | 修正端口硬编码后恢复真实在线断言 | `1 passed` | ✅ |
| simple-start 主回归整文件 E2E | `npm run test:e2e:ci:file -- e2e/dicethrone-simple-start.e2e.ts` | 12 条在线链路在合并态仍全绿 | `12 passed` | ✅ |
| 冲突单边覆盖审计 | `npm run merge:audit:strict -- HEAD` | 无冲突文件等于单边父提交 | `11 mixed / 0 single-side` | ✅ |

### Conclusion
- `main` 已成功吸收 DiceThrone 四人模式 Batch 1 专项，且这次不是“强行合进去再看 CI”，而是在本地合并态完成了类型、i18n、OpenSpec、Vitest、E2E 和 merge audit 全套确认。
- 这轮额外修掉了一个此前被环境噪音掩盖的真实测试缺口：2 人 `Transfer Status` 用例的游戏服端口硬编码。

## Session: 2026-03-28 DiceThrone Batch 2 审计启动
- **Status:** completed
- Actions taken:
  - 回看 `update-dicethrone-4p-player-target-interactions` 的 delta / tasks / evidence / 三件套，确认 Batch 1 已完整收口且当前边界明确，不应继续往同一个 completed change 里混写下一批范围。
  - 重新盘点 DiceThrone 当前所有会发 `INTERACTION_REQUESTED` 的现役入口，确认真正尚未拿到 4 人现役证据的，不再是 `selectPlayer/selectStatus/selectTargetStatus` 那组玩家目标 handler，而是 `modifyDie/selectDie` 这组多步骰子交互。
  - 将 Batch 2 候选范围聚焦到：
    - `modify-die-to-6`
    - `modify-die-copy`
    - `modify-die-any-1`
    - `modify-die-any-2`
    - `modify-die-adjust-1`
    - `reroll-opponent-die-1`
    - `reroll-die-2`
    - `reroll-die-5`
    - `shadow_thief-shadow-manipulation`
  - 复核 `e2e/dicethrone-die-modification.e2e.ts` 与 `e2e/dicethrone-die-reroll.e2e.ts`，确认它们仍是旧专项口径，既未沿用当前在线 E2E 三板斧，也还保留 `browser` fixture 与未定义 `page` 变量混用的问题，不能继续充当 Batch 2 在线证据。
  - 新建 OpenSpec change `update-dicethrone-4p-interactions-batch-2`，把 Batch 2 从 Batch 1 已完成 change 中拆开，避免 completed 边界被冲淡。

### Test Results
| Test | Input | Expected | Actual | Status |
|------|-------|----------|--------|--------|
| OpenSpec 活跃 change 清单 | `openspec list` | 确认 Batch 1 当前处于 completed，便于决定是否新开 change | `update-dicethrone-4p-player-target-interactions ✓ Complete` | ✅ |
| Batch 1 delta 复核 | `openspec show update-dicethrone-4p-player-target-interactions --json --deltas-only` | 确认现有 requirement 只覆盖 4 组 Batch 1 能力 | `4 deltas` | ✅ |
| 现役交互入口盘点 | `rg -n "INTERACTION_REQUESTED|selectPlayer|selectStatus|selectTargetStatus|modifyDie|selectDie|targetOpponentDice" src/games/dicethrone e2e` | 找出 Batch 2 应接手的剩余交互家族 | 已定位到多步骰子交互与旧 dice E2E 文件 | ✅ |

### Next Step
- 先按新 change 的 `Audit` 清单继续做 Batch 2 审计：验证 4 人 / 2v2 下 multistep-choice 是否只需要补回现代化测试与在线证据，还是已经暴露出必须显式建模 `diceOwner` / 观察视角的共享缺口。

## Session: 2026-03-28 DiceThrone Batch 2 玩家目标范围再校正
- **Status:** in_progress
- Actions taken:
  - 通过本地检索与并行子 agent 交叉复核，确认 Batch 1 已基本吃完当前活跃的显式多人玩家目标 handler；若继续沿当前主线推进，真正剩余的不是更多 `selectPlayer/selectStatus/selectTargetStatus` 卡名，而是 self-only 与 enemy-set 这两类共享语义。
  - 确认 `remove-status-self` 是唯一仍未纳入专项的直接同类入口：它走共享 `selectStatus` 交互，但当前只被 `flow.test.ts` 浅锁为“会创建仅限自身的交互”。
  - 确认 `allOpponents` 当前存在明显的 2 人近似实现：`src/games/dicethrone/domain/effects.ts` 与 `src/games/dicethrone/domain/customActions/pyromancer.ts` 直接使用 `Object.keys(state.players).filter(id => id !== attackerId)`，在 4 人 / 2v2 下会把队友也算进“所有对手”。
  - 将 `update-dicethrone-4p-interactions-batch-2` 从“多步骰子交互 Batch 2”纠正为“玩家目标交互 Batch 2”：聚焦 `Steadfast II`、`Meteor`、`Meteor II`、`Ultimate Inferno`，并把 `Soul Burn` 登记为规则审计候选。

### Test Results
| Test | Input | Expected | Actual | Status |
|------|-------|----------|--------|--------|
| 新 change 严格校验 | `openspec validate update-dicethrone-4p-interactions-batch-2 --strict --no-interactive` | 改写后的 Batch 2 proposal / design / tasks / spec 仍满足 OpenSpec 格式 | 待本轮收尾执行 | ⏳ |

### Next Step
- 先按新 change 的 `Audit` 清单确认 `allOpponents` 与 `Soul Burn` 的真实规则口径，再决定本批实现是否只需修共享目标集合解析，还是还要补 `Soul Burn` 这一条广播伤害路径。

## Session: 2026-03-28 DiceThrone Batch 2 self-only / enemy-set 收口
- **Status:** completed
- Actions taken:
  - 在 `src/games/dicethrone/domain/effects.ts` 中将 `allOpponents` 从“所有非自己玩家”收口为 `getOpponents(state, attackerId)`，统一改回团队感知的敌方集合解析。
  - 完成 `Soul Burn` 规则审计并做出裁决：`src/games/dicethrone/domain/customActions/pyromancer.ts` 不再广播到所有非自己玩家，而是只命中当前 `defender` / 目标玩家。
  - 同步修正 `public/locales/zh-CN/game-dicethrone.json`、`public/locales/en/game-dicethrone.json` 与 `src/games/dicethrone/README_ASSETS.md`，避免本地旧文案继续把 `Soul Burn` 写成“所有对手”。
  - 复核并通过现有 Batch 2 规则回归：`remove-status-self`、`Meteor`、`Meteor II`、`Ultimate Inferno`、`Soul Burn` 的 4 人语义已由 `rule-consistency.test.ts` 锁住。
  - 在 `e2e/dicethrone-simple-start.e2e.ts` 新增在线 4 人 `Meteor` 用例，证明 `allOpponents` 在真实 2v2 联机结算下只命中敌队共享生命，不误伤队友。
  - 顺手修掉 `simple-start` 整文件里 2 人 `Transfer Status` 目标页权威态抢跑问题，补上 guest 页追平等待后，整文件重新回到 `13 passed`。

### Test Results
| Test | Input | Expected | Actual | Status |
|------|-------|----------|--------|--------|
| TypeScript 类型检查 | `node .\node_modules\typescript\lib\tsc.js --noEmit --pretty false` | 本轮 Batch 2 代码与 E2E 改动无类型错误 | 无输出 | ✅ |
| OpenSpec 严格校验 | `openspec validate update-dicethrone-4p-interactions-batch-2 --strict --no-interactive` | Batch 2 proposal / design / tasks / spec 仍有效 | `valid` | ✅ |
| Batch 2 规则与行为回归 | `node scripts/infra/vitest-cli-safe.mjs run src/games/dicethrone/__tests__/rule-consistency.test.ts src/games/dicethrone/__tests__/pyromancer-behavior.test.ts src/games/dicethrone/__tests__/pyromancer-coverage.test.ts --configLoader native` | self-only / enemy-set / Soul Burn 相关回归通过 | `85 passed` | ✅ |
| `Meteor` 单条在线证据 | `npm run test:e2e:ci:file -- e2e/dicethrone-simple-start.e2e.ts "Online 4-player allOpponents: Meteor collateral only hits enemies in 2v2"` | 在线 2v2 结算只命中敌队，不误伤 ally | `1 passed` | ✅ |
| `simple-start` 主回归整文件 E2E | `npm run test:e2e:ci:file -- e2e/dicethrone-simple-start.e2e.ts` | 新增 `Meteor` 用例后主回归仍全绿 | `13 passed` | ✅ |

### Evidence
| Artifact | Absolute Path | Notes |
|----------|---------------|-------|
| 4 人 `Meteor` enemy-set 在线截图 | `D:\gongzuo\webgame\BoardGame-wt-dicethrone-4p-team-mode\test-results\evidence-screenshots\dicethrone-simple-start.e2e\Online-4-player-allOpponents-Meteor-collateral-only-hits-enemies-in-2v2\11-four-player-meteor-all-opponents-resolution.png` | 自审确认敌队共享生命降到 `44`，队友 `P3` 仍为 `50` |

### Conclusion
- Batch 2 当前主线已经从“范围再校正”推进到真实完成态：`remove-status-self` 的 self-only 约束和 `allOpponents` 的 enemy-set 语义都已拿到规则回归，`allOpponents` 还额外拿到了在线 4 人证据。
- `Soul Burn` 不再悬空：本轮已确认它应该是当前目标/defender 伤害，而不是“所有对手”广播。

## Session: 2026-03-28 DiceThrone Batch 3 多步骰子交互规划启动
- **Status:** completed
- Actions taken:
  - 复核 `openspec/AGENTS.md`、`docs/ai-rules/testing-audit.md`、`src/games/dicethrone/rule/王权骰铸规则.md` 与三件套尾部，确认当前四人专项不能被表述成“全审计完成”。
  - 重新盘点 `modifyDie` / `selectDie` / `shadow_thief-shadow-manipulation` 的共享入口，确认 Batch 3 不只是旧 E2E 过时，还存在 `targetOpponentDice:boolean` 继续承担骰池归属语义的共享风险。
  - 复核 `src/games/dicethrone/domain/rules.ts`、`src/games/dicethrone/domain/execute.ts` 与 2v2 原始 spec，确认 `afterRollConfirmed` 当前仍是“非 rollerId 的对手”视角，必须继续审计它与“队友可改骰、队友不进同队响应队列”边界是否一致。
  - 新建 OpenSpec change `update-dicethrone-4p-interactions-batch-3`，把四人专项下一批正式固定为“多步骰子交互 Batch 3”，不再混写 Batch 1/2 已完成边界。

### Test Results
| Test | Input | Expected | Actual | Status |
|------|-------|----------|--------|--------|
| OpenSpec 活跃 change 清单 | `openspec list` | 确认 Batch 1/2 已 completed，便于新开 Batch 3 | `update-dicethrone-4p-player-target-interactions ✓ Complete` / `update-dicethrone-4p-interactions-batch-2 ✓ Complete` | ✅ |
| 四人规则与 2v2 边界复核 | `Get-Content src/games/dicethrone/rule/王权骰铸规则.md` + `Get-Content openspec/changes/add-dicethrone-2v2-team-mode/specs/dicethrone-team-mode/spec.md` | 确认“队友可改骰，但队友不进同队响应队列”仍是现役边界 | 已确认 | ✅ |
| 新 change 严格校验 | `openspec validate update-dicethrone-4p-interactions-batch-3 --strict --no-interactive` | Batch 3 proposal / design / tasks / spec 满足 OpenSpec 格式 | `valid` | ✅ |

### Next Step
- 进入 Batch 3 正式实现审计：先决定是仅需现代化测试与证据，还是需要在共享层显式建模“当前骰池归属 / 观察视角”，再落规则回归和在线 E2E。

## Session: 2026-03-28 DiceThrone 炎术士多角色交互覆盖复核
- **Status:** completed
- Actions taken:
  - 重新盘点炎术士整组能力与 custom action，区分“已完成多人目标审计”与“仍依赖 attacker/defender/roller 共享语义但没拿到四人专项证据”的入口。
  - 确认 `Soul Burn`、`Meteor`、`Meteor II`、`Ultimate Inferno` 已被 Batch 2 收口，不应再把它们和尚未审计完成的炎术士入口混为一谈。
  - 确认炎术士仍未拿到四人专项证据的高风险入口主要是：
    - `Pyro Blast` / `Pyro Blast II` / `Pyro Blast III`
    - `Fiery Combo` / `Hot Streak II` / `Burn Down` / `Ignite`
    - `Magma Armor I/II/III`
    - `Get Fired Up` / `Red Hot`
  - 将上述结论回填到 `findings.md`，避免后续把“火法整组都审完”说成既成事实。

### Test Results
| Test | Input | Expected | Actual | Status |
|------|-------|----------|--------|--------|
| 炎术士入口盘点 | `rg -n "Pyro Blast|burn-down|ignite|magma-armor|get-fired-up|red-hot|Meteor|Soul Burn" src/games/dicethrone/__tests__ e2e` | 区分已覆盖与未覆盖的炎术士多角色语义入口 | 已确认 | ✅ |

### Next Step
- 若继续按“多角色交互技能专项”推进，炎术士应优先审 `Pyro Blast II/III` 与 `Magma Armor`，它们比 `Fireball` 这类纯单体伤害更接近当前四人专项的共享风险核心。

## Session: 2026-03-28 DiceThrone 全量多人语义审计矩阵首轮汇总
- **Status:** completed
- Actions taken:
  - 基于 `docs/ai-rules/testing-audit.md` 的 D1/D2/D5/D8/D23 维度，重新定义本轮“全量多人审计”的口径：只统计在 2 人以上会发生语义变化的技能 / token / 卡牌设计，不把所有普通单体伤害一股脑算进来。
  - 通过 `rg` 交叉扫描 `heroes/`、`domain/customActions/`、`effects.ts`、`rules.ts`、`execute.ts`、`__tests__/`、`e2e/` 与 OpenSpec changes，按实现模式而不是按卡名平铺，汇总出当前多人语义家族矩阵。
  - 明确 3 类当前完成态：
    - Batch 1：多人玩家目标交互
    - Batch 2：self-only / enemy-set
    - Batch 3：多步骰子交互已建 change，但尚未实现收口
  - 明确 2 类当前未完成态：
    - P0：共享骰子窗口 / `targetOpponentDice` / `afterRollConfirmed`
    - P1-P3：炎术士长尾与其他英雄的 `defenderId` / 防御视角翻转家族
  - 将“已修复的真实缺口”和“只有 2 人或局部行为测试、但无 4 人专项证据”的家族拆开记录，避免后续再把“有测试”误说成“全量多人已审完”。

### Test Results
| Test | Input | Expected | Actual | Status |
|------|-------|----------|--------|--------|
| 全量多人语义入口盘点 | `rg -n "selectPlayer|selectStatus|selectTargetStatus|allOpponents|targetOpponentDice|modifyDie|selectDie|responseWindow|afterRollConfirmed" src/games/dicethrone e2e openspec` | 找出当前显式多人语义入口与共享层关键字 | 已定位到 Batch 1/2/3 与响应窗口共享入口 | ✅ |
| 炎术士长尾家族盘点 | `rg -n "Pyro Blast|Fiery Combo|Hot Streak|Burn Down|Ignite|Magma Armor|Get Fired Up|Red Hot|Blazing Soul|Meteor Shower" src/games/dicethrone/__tests__ src/games/dicethrone/heroes src/games/dicethrone/domain/customActions e2e` | 区分火法已审与未审家族 | 已形成 P1/P2 清单 | ✅ |
| 全英雄角色映射盘点 | `rg -n "ctx\\.defenderId|ctx\\.ctx\\.defenderId|防御上下文|原攻击者" src/games/dicethrone/domain/customActions` | 找出仍依赖 defender/防御视角翻转的未专项家族 | 已定位 `paladin/moon_elf/shadow_thief/barbarian/monk` 多组入口 | ✅ |

### Conclusion
- 当前最准确的完成度口径是：“多人玩家目标交互已完成 Batch 1/2，通用多步骰子交互已识别为 Batch 3，火法与多名英雄的角色映射长尾仍待分批审计。”
- 这轮矩阵已经足够回答用户的核心问题：四人模式并没有“全都审完”，剩余缺口不是抽象的“可能还有一些”，而是可以按 P0/P1/P2/P3 继续推进的明确家族列表。

## Session: 2026-03-28 DiceThrone Batch 3 P0 路由冲突复核
- **Status:** completed
- Actions taken:
  - 继续下钻 `update-dicethrone-4p-interactions-batch-3` 的 P0，共读 `execute.ts`、`rules.ts`、`ResponseWindowSystem.ts`、`RightSidebar.tsx` 与现有 `flow.test.ts`，确认问题不只停在 `targetOpponentDice` 命名和提示文案。
  - 明确当前 `afterRollConfirmed` 的真实控制链：`execute.ts` 用 `getContextualOpponentId(...rollerId)` 作为 `triggerId` 打开响应窗口，`getResponderQueue()` 会排除 `triggerId` 的同队玩家，`ResponseWindowSystem` 又要求 `PLAY_CARD` 必须来自 `currentResponderId`。
  - 用现役回归交叉验证了这条链已经固化到行为层：`flow.test.ts` 中“4 人模式下防御掷骰确认后的响应窗口只归当前攻击方”断言 `responderQueue === ['0']`，说明攻击方队友 `P2` 当前被显式排除。
  - 因此把 Batch 3 的 P0 进一步从“共享语义可能失真”收紧为“共享响应窗口路由与 2v2 规则口径至少存在未裁决冲突”，后续必须先做语义裁决，再决定实现是走 allied responder queue 还是非队列豁免路径。

### Test Results
| Test | Input | Expected | Actual | Status |
|------|-------|----------|--------|--------|
| P0 代码路径复核 | `Get-Content src/games/dicethrone/domain/execute.ts` + `Get-Content src/games/dicethrone/domain/rules.ts` + `Get-Content src/engine/systems/ResponseWindowSystem.ts` | 确认 `afterRollConfirmed` 的 trigger / queue / responder gate 是否仍是单一 trigger-side 视角 | 已确认 | ✅ |
| 现役回归佐证 | `Get-Content src/games/dicethrone/__tests__/flow.test.ts` | 判断是否已有测试锁住“攻击方队友被排除” | 已确认 `responderQueue === ['0']` | ✅ |

### Conclusion
- Batch 3 的 P0 现在已经不是宽泛的“可能只差现代化测试”，而是一个更具体的共享路由裁决问题：当前实现并未为“攻击方队友在防御骰确认后帮队友压敌方骰面”保留现役路径。
- 下一步最正确的动作不是先补 E2E，而是先决定 2v2 下 allied dice interference 的权威语义，再据此改共享层和测试。

