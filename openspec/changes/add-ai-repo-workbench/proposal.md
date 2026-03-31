# Change: AI 仓库工作台

## Why
- 当前项目已经具备 `create-new-game`、数据录入、资源上传、审计、E2E、PR 自动化等流程知识，但这些能力仍散落在 skill、脚本、规范与人工盯进度中，缺少一个围绕仓库与工作流组织的产品化工作台。
- 这条线不是“先做个聊天壳、以后再补架构”的教程式渐进方案，而是要先把执行骨架定准：仓库会话、工作流运行、人工决策、证据回传、本地执行边界都要先冻结，再进入实现。
- 用户的真实场景以本地仓库、本地文件、本地浏览器与本地 dev server 为中心；如果核心链路过早迁到远端服务器，不但延迟高，也会削弱仓库语义、目录语义与证据交付的稳定性。
- 在扩到“数据录入 / Bug 修复 / 审计 / PR / merge”之前，必须先用一个最能验证编排能力的闭环模板把底座跑通；“新建派系”正好覆盖规则来源选择、PDF 转录、素材缺失暂停、结构化定义确认与产物打包这些关键能力。

## What Changes
- 新增 `ai-repo-workbench` capability，但第一版 **明确只上线 `new-faction` 这一条正式模板**，不把工作台表述成已经完成的通用任务中心。
- 前置形成《开源基线与可复用结论》，对照 LangGraph、OpenHands、Flowise、n8n、Activepieces、Temporal、Dagu，明确“借鉴什么 / 不借鉴什么 / 为什么当前不直接 fork 现成底座”。
- 把“开源参考对照 + 产品底座决策”提升为**第一版实现前置门禁**：每个候选都必须回答“它具体提供什么 / 哪些能力可直接借鉴 / 哪些不适合我们”，并显式比较 `fork OpenHands / Flowise / n8n / Activepieces` 是否优于在现有 BoardGame 基础上扩展。
- 冻结五层骨架：`RepoSession / WorktreeTask` 仓库层，`WorkflowRun / NodeExecutionRecord / DecisionRequest / ArtifactBundle` 领域层，`WorkflowOrchestrator` 编排层，`LocalRuntime` 执行层，工作台前端展示层。
- 明确 LangGraph 只允许位于 `WorkflowOrchestrator` 层，用于节点图推进、interrupt/resume 与 durable execution 思路；它不拥有 `RepoSession`、`WorktreeTask`、`DecisionRequest`、`ArtifactBundle` 的领域定义。
- 将仓库入口收敛为更贴近产品语义的“初始化项目 / 导入项目 / 获取项目到本地”，并保持 local-first 执行；前端展示项目入口，核心运行依赖本机仓库上下文。
- 把“新建派系”固定为第一版唯一主链路，要求每个节点都有明确输入/输出/状态，所有人工输入都通过统一 `DecisionRequest` 聚合，所有阶段性交付都通过 `ArtifactBundle` 回传。
- 保留未来引入 Temporal 的接口边界，但不把 Temporal 设为 MVP 前置依赖。

## Impact
- Affected specs:
  - `ai-repo-workbench`（新增）
- Affected code:
  - 未来会影响工作台前端、仓库执行器、工作流编排层、本地运行时、决策卡片与产物展示链路
  - 设计上与现有 `ugc-prototype-builder`、`ugc-runtime`、`e2e-runtime-management`、`add-ai-pr-review-merge-automation` 相邻，但本 proposal 先冻结 `ai-repo-workbench` 的独立骨架与实施顺序
  - 实现前必须先完成开源基线对照、fork 裁决、LangGraph 分层边界确认，再扩更多模板
