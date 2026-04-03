# BoardGame Flowise Fork Notes

## 上游基线

- upstream: `FlowiseAI/Flowise`
- tag: `flowise@3.1.1`
- commit: `34cf28546b700998e88a8f14d6f6d0754f572da4`
- license: `Apache-2.0`

## 当前落点

- 本目录 `forks/flowise/` 是 BoardGame 仓库内的固定 fork 基线。
- 这里保存的是 vendor 进主仓库的上游源码，不保留上游 `.git`。

## 集成边界

- Flowise 只负责节点画布与 workflow shell。
- `RepoSession / WorktreeTask / WorkflowRun / DecisionRequest / ArtifactBundle` 继续由 BoardGame 自己的 domain/runtime 持有。
- 当前 `src/pages/devtools/AIRepoWorkbench.tsx` 仍是项目内自绘 shell；本目录源码入仓不代表 UI 已经全量切到 Flowise。

## 下一步

1. 从本目录中挑出与 AgentFlow V2 画布、HITL shell、共享状态最相关的前端壳与执行入口。
2. 在 BoardGame 内做最小适配层，让 Flowise shell 调用本地 `WorkflowOrchestrator` / `LocalRuntime`。
3. 处理 Node 版本与构建隔离，避免直接把上游默认运行方式塞进当前主应用。
