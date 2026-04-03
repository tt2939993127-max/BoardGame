## Context

当前仓库已经有：

- `WorkflowOrchestrator -> LocalRuntime -> Repo Domain` 的代码边界
- `LangGraphWorkflowOrchestrator` 作为当前 interrupt/resume 适配层
- 仓库内 `forks/flowise/` 基线
- 一个可消费本地 journal 的只读 Flowise shell

但还没有：

- “Flowise 是主交互壳，还是只是一块预览区”的单一真相
- 把模板、仓库、工作树、决策、产物收敛到同一套 Flowise 页面骨架的布局裁决

## Goals / Non-Goals

- Goals:
  - 把 `FlowiseAI/Flowise` `flowise@3.1.1` `34cf285` 真实落到仓库独立目录。
  - 明确这批源码只作为节点画布 / workflow shell 起点，不接管领域真相。
  - 让 `AIRepoWorkbench` 以 Flowise shell 为页面主骨架，而不是继续外包一层“三栏产品壳 + 中间嵌一个画布”。
  - 删除“双图并存”的主路径，让 Flowise 成为唯一图交互面，自绘节点图降级为状态摘要轨。
- Non-Goals:
  - 本 change 不要求今天就跑起完整 Flowise dev server。
  - 本 change 不要求今天就让 Flowise 接管 `DecisionRequest`、`ArtifactBundle` 或 git worktree 生命周期。
  - 本 change 不要求今天就完成移动端适配。

## Decisions

- Decision: 上游源码落点使用 `forks/flowise/`
  - Reason: 根目录当前没有既定 `vendor/` 或 `forks/` 目录；本 change 直接建立 `forks/` 语义，比把整坨上游代码塞进 `src/`、`temp/` 或隐藏子目录更清晰。

- Decision: 采用 vendor 式源码落盘，而不是嵌套 git repo / submodule
  - Reason: 当前项目没有 submodule 规范；直接保留上游 `.git` 会把主仓库变成嵌套仓库，后续 diff、审计和打包都更混乱。

- Decision: 这批源码先视为“静态 fork 基线”
  - Reason: 当前目标是先给工作台 shell 一个真实上游起点，而不是立刻并行维护完整 Flowise 构建系统。接入代码先围绕目录基线和边界说明推进，再逐步做最小 UI/adapter 嵌入。

- Decision: Flowise shell 直接成为页面主交互骨架
  - Reason: 继续维护“主画布 + 下方 Flowise 预览”会让用户面对两套 graph interaction 语义。既然 `agentflow` 已经提供 ReactFlow、Controls、MiniMap、Background 和 header/palette 扩展点，就应把图交互统一到它身上，而不是继续修补自绘节点图。

- Decision: 通过 `renderHeader` / `renderNodePalette` 把项目能力填入 Flowise 外壳
  - Reason: 这能复用 Flowise 的页面骨架和交互分区，同时保留 `RepoSession`、模板启动、工作树管理这些本项目特有能力，不必再在外层硬包一套平级三栏。

- Decision: 保留状态轨，但不再保留第二张图
  - Reason: 运行摘要、当前节点切换和状态浏览仍有价值，但它不该再是绝对定位连线图。将其降级为非画布状态轨后，可以保留检查入口，同时避免与主 Flowise 争夺“哪套图才是真的”。

- Decision: 右侧业务面板保留为覆盖层
  - Reason: `DecisionRequest`、节点详情和 `ArtifactBundle` 仍然是本项目自己的业务 UI。将它们作为覆盖在 Flowise 主区边缘的业务层，可以保持领域真相边界，而不是强行塞进 Flowise 节点内部。

## Risks / Trade-offs

- 上游源码体积较大，会显著增加当前 worktree 改动量。
- `agentflow` vendored 类型与宿主仓库 React 类型存在桥接成本，短期内可能需要显式类型转换。
- 右侧覆盖层与底部状态轨当前按桌面布局优化，后续若推进移动端，需要重新校验遮挡、层级和可用高度。
- Node 版本兼容仍是显式风险；本 change 只锁定源码，不假装兼容问题已经被解决。

## Migration Plan

1. 创建 `forks/flowise/` 目录并 vendor 上游 `flowise@3.1.1` 源码。
2. 在仓库内补充 fork 说明文件，写清上游 tag/commit、目录边界和下一步集成方向。
3. 运行 OpenSpec 校验，确认“真实 fork 落地”这条 change 已可审计。
4. 在 `AIRepoWorkbench` 中接入只读 `FlowiseWorkbenchShell`，验证页面可消费本地 `FlowData` 映射。
5. 将 `AIRepoWorkbench` 页面主体收敛到 Flowise header/palette/canvas，移除“第二张图”的主路径地位。
6. 复跑目标 E2E 并把肉眼观察更新到证据文档，作为下一轮对话的续接依据。
