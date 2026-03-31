## 0. Baseline & Architecture Alignment
- [ ] 0.0 将“先完成开源参考对照与底座决策，才能开始第一版实现”写成显式门槛，未满足前不得进入 runtime / UI / 节点开发。
- [ ] 0.1 在 `design.md` 前置补齐《开源基线与可复用结论》，基于官方仓库 / 官方文档比较 LangGraph、OpenHands、Flowise、n8n、Activepieces、Temporal、Dagu 的成熟做法。
- [ ] 0.2 对每个候选明确写出“它具体提供什么 / 哪些能力可直接借鉴 / 哪些不适合我们”，禁止只点名不展开。
- [ ] 0.3 输出一张硬决策表，显式比较 `fork OpenHands / Flowise / n8n / Activepieces` 与“在现有 BoardGame 基础上扩展实现”的可行性，并写明为什么 fork / 不 fork。
- [ ] 0.4 建立五层骨架的当前基线：`Workbench Surface -> WorkflowOrchestrator -> LocalRuntime -> Repo Domain -> Artifact Publisher`，后续实现不得绕过主分层；若需要调整，必须显式更新文档而不是隐式漂移。 
- [ ] 0.5 明确 LangGraph 只允许位于 `WorkflowOrchestrator` 层，并写清它与 `LocalRuntime`、`RepoSession`、`WorktreeTask`、`DecisionRequest`、`ArtifactBundle` 的边界。
- [ ] 0.6 若继续沿用当前技术路线，必须同步记录“为什么成立、风险在哪里、还需要哪些优化”，不能只保留结论。

## 1. Runtime Foundation
- [ ] 1.1 定义 `RepoSession`、`WorktreeTask`、`WorkflowRun`、`NodeExecutionRecord` 的持久化 schema，并约束 `new-faction` MVP 必须运行在单一 `WorktreeTask` 内。
- [ ] 1.2 定义 `WorkflowOrchestrator` 与 `LocalRuntime` 的分层接口；如采用 LangGraph，只允许它藏在 orchestrator 适配层后面。
- [ ] 1.3 实现 `LocalRuntime` 的最小执行接口：`runNode`、`pauseForDecision`、`resumeRun`、`publishArtifactBundle`。
- [ ] 1.4 选择并落地本地状态存储方案（文件 journal / SQLite / 等价实现），确保节点状态、决策对象与产物索引可在进程重启后恢复。

## 2. New-Faction Workflow
- [ ] 2.1 实现 `new-faction` 固定节点图：`capture-faction-intent -> select-rule-source -> acquire-rule-material -> transcribe-or-normalize-rules -> inspect-assets -> draft-faction-definition -> review-faction-definition -> publish-artifact-bundle`。
- [ ] 2.2 为每个节点定义输入 schema、输出 schema、持久化状态键与失败/重试语义，禁止未建模的隐式共享状态。
- [ ] 2.3 实现规则来源分支：支持 Wiki、上传文档、上传 PDF、其他 URL 四类来源，并统一汇总为 `rawSourceSet`。
- [ ] 2.4 实现 PDF 转录 / 文本规范化节点，保证输出 `normalizedRuleCorpus` 与来源映射。
- [ ] 2.5 实现素材检查节点，支持“补素材后继续”和“先走纯规则模式”两种恢复路径。

## 3. Human-in-the-Loop
- [ ] 3.1 实现 `DecisionRequest` 领域对象及前后端传输结构，至少支持 `single_select`、`form`、`approval` 三类决策。
- [ ] 3.2 为规则来源选择、素材缺失继续策略、派系定义确认三个节点接入 `DecisionRequest`，并支持 `resumeToken` 幂等恢复。
- [ ] 3.3 在运行详情页渲染决策卡片，展示 `summary`、`rationale`、`evidenceRefs`、推荐选项与用户最终 resolution。

## 4. Artifact & Evidence
- [ ] 4.1 实现 `ArtifactBundle` 生成逻辑，至少包含规则来源索引、规范化规则文本、素材核对清单、派系定义快照、决策日志与 `e2eStatus`。
- [ ] 4.2 为 MVP 明确 `e2eStatus = not_applicable` 的生成条件与前端展示，避免把缺少 E2E 误判为失败。
- [ ] 4.3 在运行详情页展示节点输入/输出摘要、关键日志、失败原因与 bundle 证据索引。

## 5. UX Surface
- [ ] 5.1 在工作台入口明确第一版只暴露 `new-faction` 模板，不把其他模板伪装成“即将可用”的主功能。
- [ ] 5.2 设计运行详情页的节点时间线视图，展示 `pending / running / waiting_decision / blocked / completed / failed` 状态。
- [ ] 5.3 提供 bundle 预览面板，让用户能直接查看规则文本、素材缺失项、定义草案与确认后的最终版本。

## 6. Validation
- [ ] 6.1 为节点状态迁移、`DecisionRequest` 幂等恢复、`ArtifactBundle` 最小字段完整性补充自动化测试。
- [ ] 6.2 为“Wiki 路径”“PDF 路径”“素材缺失路径”三条典型主流程补最小集成验证。
- [ ] 6.3 运行 `openspec validate add-ai-repo-workbench --strict --no-interactive`，并在实现落地时同步补充用户可见的证据文档。

## 7. Future-Proofing
- [ ] 7.1 把执行器接口与领域模型解耦，确保后续接入 Temporal 或替换 LangGraph 实现时，无需改写 `DecisionRequest`、节点 I/O schema 与 `ArtifactBundle`。
- [ ] 7.2 为 Temporal 适配预留边界说明：Temporal 只接管 durable orchestration，不接管仓库安全策略、前端展示与证据结构。
