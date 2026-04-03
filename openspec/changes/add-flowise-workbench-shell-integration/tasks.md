## 1. Fork Baseline
- [x] 1.1 在仓库中创建 `forks/flowise/` 作为上游源码固定落点。
- [x] 1.2 将 `FlowiseAI/Flowise` 的 `flowise@3.1.1`（commit `34cf285`）源码 vendor 到该目录，且不得保留嵌套 `.git`。
- [x] 1.3 补充仓库内 fork 说明，明确 tag、commit、边界和升级策略。

## 2. Shell Integration Boundary
- [x] 2.1 明确 Flowise fork 只负责节点画布 / workflow shell，不接管 `RepoSession / WorktreeTask / WorkflowRun / DecisionRequest / ArtifactBundle`。
- [x] 2.2 明确 Node 版本与构建隔离风险，避免误判为“已可直接启动全量替换”。

## 3. Validation
- [x] 3.1 运行 `npx openspec validate add-flowise-workbench-shell-integration --strict --no-interactive`。

## 4. Minimal Preview Shell
- [x] 4.1 新增最小只读 `FlowiseWorkbenchShell` 组件，消费当前 `WorkflowTemplateDefinition + NodeExecutionRecord + WorkflowRun` 映射出的 `FlowData`。
- [x] 4.2 为 `FlowiseWorkbenchShell` 打开 `renderHeader` / `renderNodePalette` 扩展口，使模板、RepoSession、工作树管理可以填入同一套 Flowise 页面骨架。
- [x] 4.3 将 `AIRepoWorkbench` 页面收敛为 Flowise 主布局：Flowise 画布成为唯一图交互面，原自绘节点图降级为非画布状态轨，右侧业务面板改为覆盖层。
- [x] 4.4 运行目标 E2E 并同步更新测试断言与证据文档，明确截图验收口径已经切到 Flowise 主布局而不是“双图并存”。
