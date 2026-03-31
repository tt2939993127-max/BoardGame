## 1. Spec
- [ ] 1.1 梳理现有 `create-new-game` skill、UGC、E2E runtime、PR 自动化的可复用边界。
- [ ] 1.2 为 `ai-repo-workbench` 编写 capability spec，覆盖入口、模板工作流、决策节点、过程可视化、E2E 截图回传、提 PR 与合并门禁。
- [ ] 1.3 运行 `openspec validate add-ai-repo-workbench --strict --no-interactive` 并修复格式问题。

## 2. Architecture
- [ ] 2.1 设计工作台的核心对象模型：`RepoSession`、`WorkflowTemplate`、`WorkflowRun`、`DecisionRequest`、`ArtifactBundle`。
- [ ] 2.2 设计 skill 到工作流节点的映射方式，明确哪些节点是自动执行、哪些节点是人工决策、哪些节点是门禁验收。
- [ ] 2.3 设计 E2E 产物回传链路，确保截图、日志、证据摘要可以从执行环境返回网页。

## 3. Execution
- [ ] 3.1 设计“新建游戏”和“导入本地目录”两种仓库入口模式的隔离执行策略。
- [ ] 3.2 设计至少三条首批模板工作流：新建游戏、数据录入、Bug 修复。
- [ ] 3.3 设计从工作流通过到 `commit -> PR -> merge` 的自动推进规则与阻断条件。

## 4. UX
- [ ] 4.1 设计小白模式的最小输入面板，默认只要求需求与素材。
- [ ] 4.2 设计决策点汇总卡片，统一承载 Wiki 对照、可信网站、图片处理方式等暂停项。
- [ ] 4.3 设计执行过程面板，展示步骤状态、日志、diff、截图和最终证据。
