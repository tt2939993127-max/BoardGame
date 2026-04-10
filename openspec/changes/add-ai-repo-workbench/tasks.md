## 1. Spec
- [x] 1.1 梳理现有 `create-new-game` skill、UGC、E2E runtime、PR 自动化的可复用边界。
- [x] 1.2 为 `ai-repo-workbench` 编写 capability spec，覆盖入口、模板工作流、决策节点、过程可视化、E2E 截图回传、提 PR 与合并门禁。
- [x] 1.3 运行 `openspec validate add-ai-repo-workbench --strict --no-interactive` 并修复格式问题。

## 2. Architecture
- [x] 2.1 设计工作台的核心对象模型：`RepoSession`、`WorkflowTemplate`、`WorkflowRun`、`DecisionRequest`、`ArtifactBundle`。
- [x] 2.2 设计 skill 到工作流节点的映射方式，明确哪些节点是自动执行、哪些节点是人工决策、哪些节点是门禁验收。
- [x] 2.3 设计 E2E 产物回传链路，确保截图、日志、证据摘要可以从执行环境返回网页。
- [x] 2.4 补充 `WorkflowNode` 分类、checkpoint / resume 模型与 delivery 节点边界。
- [x] 2.5 补充 `DecisionRecord`、checkpoint healthState、execution-layer hand-off 的运行时数据契约。

## 3. Execution
- [x] 3.1 设计“新建游戏”和“导入本地目录”两种仓库入口模式的隔离执行策略。
- [x] 3.2 设计至少三条首批模板工作流：新建游戏、数据录入、Bug 修复。
- [x] 3.3 设计从工作流通过到 `commit -> PR -> merge` 的自动推进规则与阻断条件。
- [ ] 3.4 细化远程 GitHub 仓库接入与受保护分支降级策略。
- [x] 3.5 明确 Hard Rules → Local Model → Execution Layer 的 hand-off 语义，避免执行器重新自由解释原始消息。

## 4. UX
- [x] 4.1 设计小白模式的最小输入面板，默认只要求需求与素材。
- [x] 4.2 设计决策点汇总卡片，统一承载 Wiki 对照、可信网站、图片处理方式等暂停项。
- [x] 4.3 设计执行过程面板，展示步骤状态、日志、diff、截图和最终证据。
- [ ] 4.4 细化 ArtifactBundle 的网页展示层级与失败节点的恢复交互。
- [x] 4.5 明确监察者模式为 post-run Completion Gate，而不是前置路由或定时 `continue`。

## 5. Follow-up
- [ ] 5.1 明确与现有前端页面 / 状态管理的对接落点。
- [ ] 5.2 将首批模板拆成可实施的后续实现 change 或开发任务。
- [ ] 5.3 评估是否需要新增 repo-provider / artifact-storage 等相邻 capability，而不是把实现细节全部塞进本 spec。
- [x] 5.4 清理旧 Kiro auto-continue 入口与误导性文档引用，避免与新监察者模式混淆。
- [ ] 5.5 细化 `false-active` 监测阈值、checkpoint policy 与 watcher 恢复策略的实现方案。
