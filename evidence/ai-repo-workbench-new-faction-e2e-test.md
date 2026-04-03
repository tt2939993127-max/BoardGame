# AI Repo Workbench Skeleton E2E Test

## 目标

验证 `AI 仓库工作台` 当前不再只是 `new-faction` 单模板页面，而是已经具备：

- `RepoSession` 可见
- `WorktreeTask` 可登记、可聚焦
- `WorkflowRun` 可绑定当前工作树启动
- 主工作区以参考工作流产品的节点画布而不是长时间线作为主视图
- `new-faction` 作为首个模板仍能跑到 `ArtifactBundle`

## 执行命令

```powershell
npm run typecheck
node .\scripts\infra\vitest-cli-safe.mjs run src\components\lobby\__tests__\GameDetailsModalJoinConfirm.test.ts --configLoader native --maxWorkers 1
npm run test:e2e:ci:file -- lobby.e2e.ts "AI 仓库工作台可从工具入口进入并完成 new-faction 纵切片"
npx openspec validate add-ai-repo-workbench --strict --no-interactive
```

## 结果

- `typecheck` 通过
- `GameDetailsModalJoinConfirm.test.ts` 通过：`28 passed`
- `lobby.e2e.ts` 指定用例通过：`1 passed`
- `openspec validate add-ai-repo-workbench --strict --no-interactive` 通过

## 截图路径

- 等待决策态（原始产物）：`D:\gongzuo\webgame\BoardGame-wt-ai-repo-workbench\test-results\evidence-screenshots\lobby.e2e\AI-仓库工作台可从工具入口进入并完成-new-faction-纵切片\ai-repo-workbench-node-graph-waiting-decision.png`
- 完成态（原始产物）：`D:\gongzuo\webgame\BoardGame-wt-ai-repo-workbench\test-results\evidence-screenshots\lobby.e2e\AI-仓库工作台可从工具入口进入并完成-new-faction-纵切片\ai-repo-workbench-node-graph-complete.png`
- 等待决策态（固化副本）：`D:\gongzuo\webgame\BoardGame-wt-ai-repo-workbench\evidence\assets\ai-repo-workbench-e2e\node-graph-waiting-decision.png`
- 完成态（固化副本）：`D:\gongzuo\webgame\BoardGame-wt-ai-repo-workbench\evidence\assets\ai-repo-workbench-e2e\node-graph-complete.png`

## 截图 1：工作台骨架 + 工作树管理 + 节点图等待决策

![工作台骨架等待决策态](assets/ai-repo-workbench-e2e/node-graph-waiting-decision.png)

- 左侧已经不是“只有模板卡片”的页面，而是同时存在 `RepoSession` 卡片、`Worktree Manager` 卡片和模板卡片，说明工作台骨架已成为一等对象。
- 左侧底部现在明确区分 `WorkflowOrchestrator` 与 `LocalRuntime` 两张架构卡，说明执行层已经不再被混写成单一 journal 页面，界面口径和当前代码分层保持一致。
- 左侧模板卡片里已经出现 `端到端验证` 的节点开关，而且按钮状态是“已关闭”，说明流程节点不是写死执行，用户可以在启动前决定本轮是否走 E2E。
- `Worktree Manager` 中能看到新登记的 `feat/managed-worktree-e2e`，并出现“已聚焦”标识，说明本轮运行目标工作树不是写死的单一路径。
- 中间主区标题已经带上 `星环游牧者 / new-faction / feat/managed-worktree-e2e`，说明 `WorkflowRun` 的归属已经绑定到当前聚焦工作树。
- 中间主区的第一屏已经是节点画布，节点之间有明确连线，主图不再是一列顺排卡片；图上 `select-rule-source` 为“等待决策”，其后节点仍处于待执行，主链路停在正确的人审点。
- 右侧 `DecisionRequest` 面板仍然单独存在，并明确给出 `Wiki（推荐）`、`上传 PDF`、`上传文档`、`其他 URL` 四个选项，说明“骨架管理”和“模板内决策”没有被混成一团。

## 截图 2：工作台骨架 + 节点图完成态 + ArtifactBundle

![工作台骨架完成态](assets/ai-repo-workbench-e2e/node-graph-complete.png)

- 左侧 `RepoSession`、`Worktree Manager`、模板区在完成态仍然保留，页面没有在运行结束后退化成单纯结果页。
- 中间主区顶部的进度摘要和节点画布都已经进入收尾状态，说明主链路确实跑到了完成态，而不是停在中间某个隐式步骤。
- 节点图中的 `run-e2e-validation` 节点明确显示为“已跳过”，这和启动前用户把 `端到端验证` 开关关掉完全一致，证明“关闭节点”已经进入正式执行语义。
- 节点详情区已经收敛成单节点 `Inspector`，不再把全部节点纵向堆成一长列；当前被选中节点仍能完整展示输入/输出快照，说明画布化后没有丢掉结构化执行记录。
- 右侧 `ArtifactBundle` 面板已经真实展示 `规则来源索引`、`规范化规则文本`、`素材核对清单`、`派系定义快照`、`决策日志`，而不是只给一句总结文案。
- `ArtifactBundle` 已明确展示 `e2eStatus: skipped`；这说明“本轮没有跑模板内 E2E”是用户关闭节点后的显式结果，而不是系统漏做。

## 结论

- `AI Repo Workbench` 当前已经从“单模板演示页”推进到“工作台骨架 + 首个模板”的状态。
- 这次 E2E 覆盖的主链路是：`工具入口 -> 进入工作台 -> 登记并聚焦工作树 -> 关闭 E2E 节点 -> 在该工作树启动 new-faction -> 节点图停在真实决策点 -> 节点图完整跑完 -> ArtifactBundle 展示`。
- 仍然存在的真实边界是：当前 `worktree` 管理还是 local journal 层面的管理骨架，尚未直接驱动真实 git worktree 生命周期；这部分后续需要把本地 runtime 和 git 操作真正接上。

## 2026-04-01 LangGraph 接入复验

### 本轮执行命令

```powershell
npm run typecheck
npm run test:e2e:ci:file -- lobby.e2e.ts "AI 仓库工作台可从工具入口进入并完成 new-faction 纵切片"
```

### 本轮肉眼观察

- 等待决策态截图里，右侧 `DecisionRequest` 卡片仍清晰显示四种规则来源选项，中间节点图停在 `select-rule-source`，说明异步入口和 LangGraph interrupt 接入后，没有把首个人审点吞掉。
- 完成态截图里，顶部 `WorkflowRun` 摘要、中央节点画布和右侧 `ArtifactBundle` 三栏仍同时存在，没有退化成只剩结果卡的单栏页面。
- 完成态截图里，`publish-artifact-bundle` 已进入完成态，右侧 `ArtifactBundle` 面板正常渲染规则来源索引、规范化规则文本、素材核对清单和决策日志，说明这轮异步化没有打断终态交付。
- 两张图里都没有出现新的错误横幅；左侧架构说明也已经改成“LangGraph-backed orchestrator + 本地 fallback”的口径，页面文案与当前实现一致。

## 2026-04-01 Flowise Shell 预览接入复验

### 本轮执行命令

```powershell
npm run typecheck
npm run test:e2e:ci:file -- lobby.e2e.ts "AI 仓库工作台可从工具入口进入并完成 new-faction 纵切片"
```

### 本轮肉眼观察

- 等待决策态截图里，现有自绘 `节点画布` 下方已经新增 `Flowise Shell 预览` 区块，说明 Flowise 已经真实进入页面，而不是继续只停留在 fork/spec 口径。
- 这个 `Flowise Shell 预览` 区块里能看到与主链路同顺序的只读节点和连线，`select-rule-source` 仍是蓝色等待态，说明它消费的是当前 journal 映射出的运行状态，而不是另一套脱节的演示数据。
- 完成态截图里，`Flowise Shell 预览` 中大部分节点已转为绿色完成态，`run-e2e-validation` 保持黄点停用/终止样式，和上方主画布里的“已跳过”语义保持同一轮执行结果。
- 两张图里原有的 `DecisionRequest` 和 `ArtifactBundle` 侧栏都还在，说明这次接入的是只读 workflow shell，没有让 Flowise 反向接管本地 orchestrator、人工决策或产物面板。
- Flowise 预览没有把页面主布局挤成单栏，左侧工作台骨架、中间主工作区和右侧决策/产物栏依旧并列存在，说明最小壳接入没有破坏当前稳定的桌面布局。

## 2026-04-02 Flowise 主布局收敛复验

### 本轮执行命令

```powershell
node scripts/infra/run-e2e-command.mjs ci e2e/lobby.e2e.ts --grep "仓库工作台"
openspec validate add-flowise-workbench-shell-integration --strict --no-interactive
```

### 本轮肉眼观察

- 等待决策态截图里，页面第一眼已经是 Flowise 主壳：顶部是工作台 header，左侧是模板与工作树 palette，中间只有一张 Flowise 图，下面不再存在第二张“伪主图”。
- 左侧 palette 里同时放下了 `new-faction` 模板卡、`RepoSession` 卡和工作树管理，说明仓库/模板能力已经收进 Flowise 自己的骨架，而不是外层再包一层产品。
- 右侧仍保留 `DecisionRequest / 节点 / ArtifactBundle` 业务面板，但它现在是覆盖在画布边缘的浮层，说明页面骨架已统一，领域业务层没有被硬塞进 Flowise 节点内部。
- 底部只剩一条深色节点状态轨，能看状态、能切换节点，但没有绝对定位连线和第二套缩略图交互，这证明“双图并存”已经从主路径下线。
- 完成态截图里，主画布仍是同一套 Flowise 交互面；状态轨中的 `run-e2e-validation` 继续显示为“已跳过”，右侧 `ArtifactBundle` 仍能展示规则来源索引、规范化规则文本、素材核对清单和决策日志，说明页面收敛没有破坏原有业务链路。

### 本轮结论

- 当前可作为下一轮对话的单一口径是：`AIRepoWorkbench` 已经进入“Flowise 作为主布局与唯一图交互面”的阶段。
- 后续若继续推进，应优先围绕 Flowise 主壳补选择态、节点检查和响应式细节，而不是回头再维护第二套自绘节点图。

## 2026-04-01 server mode fallback 根因修复

### 现象

- E2E 用例在进入工作台后，`workbench-journal-mode` 长期显示 `journal: localStorage fallback`，导致断言 `server-file + git worktree` 失败。

### 根因

- 后端路由并非缺失，`AiRepoWorkbenchController` 已注册 `/devtools/ai-repo-workbench/journal/query`。
- 真实错误是运行时依赖注入失效：`AiRepoWorkbenchController.queryJournal` 调用时 `workbenchService` 为 `undefined`，抛出 `Cannot read properties of undefined (reading 'getJournal')`，前端首屏拉取 journal 失败后自动回退到 local 模式。

### 修复

- 在 `apps/api/src/modules/ai-repo-workbench/ai-repo-workbench.controller.ts` 为构造器注入改为显式 token：
  - `@Inject(AiRepoWorkbenchService) private readonly workbenchService: AiRepoWorkbenchService`

### 复验

- 直接探针 `POST http://127.0.0.1:21100/devtools/ai-repo-workbench/journal/query` 返回 `201`，且响应体包含 journal 数据。
- 复跑目标用例：
  - `npm run test:e2e:ci:file -- lobby.e2e.ts "AI 仓库工作台可从工具入口进入并完成 new-faction 纵切片"`
  - 结果 `1 passed`，且测试日志显示托管 isolated runtime（`6274/20101/21101`）下通过。
