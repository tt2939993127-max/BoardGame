## ADDED Requirements

### Requirement: 工作台 MVP SHALL 收敛到单一 `new-faction` 模板

系统在 `ai-repo-workbench` capability 的第一版 MUST 只把“新建派系”作为主工作流模板，而不是同时承诺通用任务中心。

#### Scenario: 工作台首页暴露 MVP 模板
- **WHEN** 用户首次进入 `ai-repo-workbench`
- **THEN** 系统 MUST 将 `new-faction` 作为第一版唯一可启动的正式模板
- **AND** 不得把“数据录入”“Bug 修复”“审计”“PR merge”渲染为已具备同等实现完成度的模板

#### Scenario: 启动模板时建立仓库执行上下文
- **WHEN** 用户启动 `new-faction`
- **THEN** 系统 MUST 先绑定一个 `RepoSession` 与单一 `WorktreeTask`
- **AND** 后续节点执行 MUST 只在该仓库执行上下文内推进

### Requirement: MVP 架构骨架 SHALL 在实现前被显式冻结

系统 MUST 在进入实现前先固定工作台的五层骨架：`Workbench Surface -> WorkflowOrchestrator -> LocalRuntime -> Repo Domain -> Artifact Publisher`，避免首版退化成教程式渐进拼装。

#### Scenario: 骨架先于节点实现被定义
- **WHEN** 团队开始实现 `new-faction` MVP
- **THEN** 设计文档 MUST 明确五层职责边界与调用方向
- **AND** 不得在未定义骨架前直接以聊天式流程或临时工具调用替代正式工作流分层

#### Scenario: 新增第二模板前仍需保持骨架稳定
- **WHEN** 后续有人尝试增加 `new-faction` 之外的第二个模板
- **THEN** 现有五层骨架 MUST 已经是唯一真实来源
- **AND** 不得通过引入自由画布或通用聊天入口绕过既有 `Repo Domain` 与 `Artifact Publisher` 边界

### Requirement: `new-faction` 模板 SHALL 按固定节点图推进

系统 MUST 将“新建派系”实现为固定节点图，而不是自由聊天式的隐式步骤拼接。

#### Scenario: 标准主链路推进
- **WHEN** `new-faction` 模板启动成功
- **THEN** 系统 MUST 按顺序推进 `capture-faction-intent -> select-rule-source -> acquire-rule-material -> transcribe-or-normalize-rules -> inspect-assets -> draft-faction-definition -> review-faction-definition -> publish-artifact-bundle`
- **AND** 每个节点 MUST 有明确的输入、输出与持久化状态记录

#### Scenario: PDF 规则来源进入转录分支
- **WHEN** 用户在 `select-rule-source` 选择上传 PDF 作为规则来源
- **THEN** 系统 MUST 在 `acquire-rule-material` 后进入 `transcribe-or-normalize-rules`
- **AND** 输出规范化规则文本与来源映射后才能进入后续节点

#### Scenario: 素材缺失时进入可恢复暂停
- **WHEN** `inspect-assets` 识别到关键素材缺失
- **THEN** 节点 MUST 进入 `waiting_decision` 或等价暂停状态
- **AND** 系统 MUST 提供“补素材后继续”与“先走纯规则模式”这两类恢复路径

### Requirement: 每个节点 SHALL 产出结构化输入、输出与执行状态

系统 MUST 为每个节点保存独立的 `NodeExecutionRecord`，而不是把状态散落在临时日志或聊天文本中。

#### Scenario: 节点执行完成后落盘
- **WHEN** 任一节点执行成功
- **THEN** 系统 MUST 保存该节点的 `inputRef`、`outputRef`、`stateRef`、`attempt`、开始时间与完成时间
- **AND** 这些记录 MUST 能被运行详情页直接读取并展示

#### Scenario: 节点失败后可见
- **WHEN** 任一节点执行失败
- **THEN** 系统 MUST 将该节点标记为 `failed`
- **AND** 保存结构化的 `errorCode` 与 `errorSummary`
- **AND** 不得只把失败信息留在终端标准输出里

#### Scenario: 节点等待人工决策
- **WHEN** 任一节点因人工确认而暂停
- **THEN** 系统 MUST 将该节点标记为 `waiting_decision`
- **AND** 关联到一个显式的 `DecisionRequest`

### Requirement: 人工暂停点 SHALL 使用统一的 `DecisionRequest` 契约

系统 MUST 用统一的 `DecisionRequest` 结构承载所有人工决策，而不是让不同节点输出不一致的临时问答格式。

#### Scenario: 创建决策请求
- **WHEN** `select-rule-source`、`inspect-assets` 或 `review-faction-definition` 需要用户输入
- **THEN** 系统 MUST 创建一个包含 `id`、`runId`、`nodeId`、`kind`、`title`、`summary`、`blocking`、`evidenceRefs`、`resumeToken` 的 `DecisionRequest`
- **AND** 如有推荐路径，系统 SHOULD 填充 `recommendedOptionId`

#### Scenario: 决策请求被恢复
- **WHEN** 用户对某个 `DecisionRequest` 提交回答
- **THEN** 系统 MUST 将回答写入 `resolution`
- **AND** 使用 `resumeToken` 恢复原始 `WorkflowRun`
- **AND** 重复提交同一 `resumeToken` 时 MUST 保持幂等，不得重复推进节点

#### Scenario: 决策请求可审计
- **WHEN** 用户完成任一决策
- **THEN** 系统 MUST 记录操作者、决定时间、选择结果与可选备注
- **AND** 这些信息 MUST 可被打包进后续 `ArtifactBundle`

### Requirement: `ArtifactBundle` SHALL 作为 MVP 阶段交付与证据容器

系统 MUST 为 `new-faction` 的阶段性完成与最终完成生成结构化 `ArtifactBundle`，并将其作为工作台交付对象。

#### Scenario: `definition-confirmed` 阶段生成 MVP 证据
- **WHEN** `review-faction-definition` 已确认通过
- **THEN** 系统 MUST 生成一个 `ArtifactBundle`
- **AND** 该 bundle MUST 包含规则来源索引、规范化规则文本、素材核对清单、结构化派系定义快照与决策日志

#### Scenario: MVP 无 E2E 时的显式标记
- **WHEN** `new-faction` MVP 在尚未生成可运行代码的阶段结束
- **THEN** `ArtifactBundle.outputs.e2eStatus` MUST 被标记为 `not_applicable`
- **AND** 系统 MUST 明确说明当前阶段未进入 E2E 验证，而不是把 E2E 缺失视为隐式遗漏

#### Scenario: 证据可预览
- **WHEN** 前端加载某个 `ArtifactBundle`
- **THEN** 系统 MUST 能展示其中的证据索引、摘要与关键观察结论
- **AND** 不得只返回一段纯文本总结替代 bundle 内容

### Requirement: LangGraph 若被采用 SHALL 只位于编排层

系统 MAY 在 `WorkflowOrchestrator` 层采用 LangGraph，但 MUST 保持它与 `LocalRuntime`、`RepoSession`、`WorktreeTask`、`DecisionRequest`、`ArtifactBundle` 的边界清晰。

#### Scenario: LangGraph 负责中断恢复而不拥有仓库语义
- **WHEN** 实现选择 LangGraph 作为 `WorkflowOrchestrator`
- **THEN** LangGraph MUST 只负责节点推进、checkpoint、interrupt / resume 与可重放状态
- **AND** 不得成为 `RepoSession`、`WorktreeTask`、`DecisionRequest` 或 `ArtifactBundle` 的领域真源

#### Scenario: LangGraph 对外不泄漏专有类型
- **WHEN** 前端、runtime 或 artifact publisher 与 orchestrator 交互
- **THEN** 对外交互 MUST 使用本项目定义的稳定接口与领域 schema
- **AND** 不得要求调用方直接依赖 LangGraph 的 `StateGraph`、`Command` 或其他专有类型

### Requirement: local-first runtime SHALL 明确当前职责并预留 Temporal 边界

系统 MUST 在第一版采用 local-first runtime，同时为未来引入 Temporal 预留稳定接口边界。

#### Scenario: 当前由 local runtime 承担的职责
- **WHEN** `new-faction` 模板在第一版运行
- **THEN** 本地运行时 MUST 负责仓库绑定、worktree 执行、文件读写、节点推进、暂停恢复、日志收集与 `ArtifactBundle` 生成
- **AND** 不得要求第一版先引入 Temporal 才能运行

#### Scenario: Temporal 作为未来编排适配层
- **WHEN** 后续版本需要更强的 durable orchestration 或远程 worker
- **THEN** 系统 MAY 让 Temporal 接管运行历史、信号恢复、超时与重试
- **AND** `RepoSession`、`DecisionRequest`、节点 I/O schema 与 `ArtifactBundle` 的领域结构 MUST 保持不变

### Requirement: 开源基线与 fork 裁决 SHALL 先于第一版实现被文档化

系统在进入 `ai-repo-workbench` 第一版实现前 MUST 先形成《开源基线与可复用结论》，并显式裁决是否直接 fork OpenHands、Flowise、n8n、Activepieces 中的任一成熟开源仓库；研究范围至少覆盖 LangGraph、OpenHands、Flowise、n8n、Activepieces、Temporal、Dagu。

#### Scenario: 开源基线先于第一版实现
- **WHEN** 团队准备开始 `ai-repo-workbench` 第一版 runtime、前端或节点实现
- **THEN** 文档 MUST 已经比较 LangGraph、OpenHands、Flowise、n8n、Activepieces、Temporal、Dagu 的成熟做法
- **AND** 每个候选 MUST 至少明确“它具体提供什么 / 哪些能力可直接借鉴 / 哪些不适合我们”

#### Scenario: fork 裁决必须显式比较产品底座
- **WHEN** 设计文档给出第一版产品底座结论
- **THEN** 文档 MUST 显式比较 `fork OpenHands / Flowise / n8n / Activepieces` 与“在现有 BoardGame 基础上扩展”的可行性与代价
- **AND** 文档 MUST 给出“fork / 不 fork”的明确结论，而不是只列出项目名词

#### Scenario: fork 裁决不能覆盖本地仓库语义
- **WHEN** 某开源项目的通用自动化模式与本项目的本地仓库工作流发生冲突
- **THEN** 系统 MUST 优先保持 `RepoSession / WorktreeTask / ArtifactBundle` 这套本地仓库语义
- **AND** 不得为了贴合外部框架或 fork 底座而牺牲本地执行与证据交付边界

### Requirement: 当前技术选型 SHALL 附带成立理由、风险与优化项

系统若继续采用“local-first runtime + 显式领域模型 + 可插拔 orchestrator + 不直接 fork”的路线，设计文档 MUST 同时说明为什么成立、风险在哪里、还需要哪些优化。

#### Scenario: 技术选型结论可审计
- **WHEN** 设计文档主张继续沿用当前技术选型
- **THEN** 文档 MUST 同时列出成立原因、主要风险与后续优化项
- **AND** 不得只给出结论而省略代价与边界
