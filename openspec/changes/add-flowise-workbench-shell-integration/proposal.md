# Change: 落地 Flowise fork 并收敛为工作台主交互壳

## Why

`add-ai-repo-workbench` 已经完成“选择 Flowise 作为 fork 起点”的架构裁决，但仅把 Flowise 当成下方预览区并不能解决真实问题。页面同时维护一套 Flowise 画布和一套项目内自绘节点图，会让节点命中、空间感、状态反馈和布局语言持续分裂，下一轮对话也很难判断哪块才是主交互面。

## What Changes

- 在仓库中引入锁定到 `flowise@3.1.1` / `34cf285` 的真实 Flowise fork 源码落点。
- 明确上游源码目录、Node 版本隔离、与现有 BoardGame domain/runtime 的集成边界。
- 补充最小接入壳说明，固定“Flowise 只负责节点画布 / workflow shell，本地 orchestrator/runtime 继续持有领域真相”。
- 将 `AIRepoWorkbench` 页面收敛为 Flowise 主布局：Flowise 画布成为唯一图交互面，模板/仓库/工作树能力填入 header + palette，原自绘节点图降级为状态轨。
- 同步更新 E2E 断言与证据文档，明确下一轮工作应继续围绕 Flowise 主壳而不是再维护第二套 graph UI。

## Impact

- Affected specs: `ai-repo-workbench`
- Affected code:
  - `forks/flowise/**`
  - `src/features/ai-repo-workbench/flowiseForkBaseline.ts`
  - `src/features/ai-repo-workbench/FlowiseWorkbenchShell.tsx`
  - `src/pages/devtools/AIRepoWorkbench.tsx`
  - `e2e/lobby.e2e.ts`
  - `evidence/ai-repo-workbench-new-faction-e2e-test.md`
  - `openspec/changes/add-flowise-workbench-shell-integration/**`
