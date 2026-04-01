## ADDED Requirements

### Requirement: 工作台 MVP SHALL 先交付 repo / worktree / run 管理骨架，并以 `new-faction` 作为首个正式模板

系统在 `ai-repo-workbench` capability 的第一版 MUST 先把 `RepoSession / WorktreeTask / WorkflowRun` 做成可见、可管理、可挂载模板的工作台骨架；`new-faction` 是首个正式模板，但不是整个工作台本体。

#### Scenario: 工作台首页先暴露骨架对象与首个模板
- **WHEN** 用户首次进入 `ai-repo-workbench`
- **THEN** 系统 MUST 先展示当前 `RepoSession`、已管理的 `WorktreeTask` 列表与运行状态入口
- **AND** 系统 MUST 将 `new-faction` 作为第一版首个可启动的正式模板
- **AND** 不得把“数据录入”“Bug 修复”“审计”“PR merge”渲染为已具备同等实现完成度的模板

#### Scenario: 模板运行绑定到受管理工作树
- **WHEN** 用户启动 `new-faction`
- **THEN** 系统 MUST 先绑定一个 `RepoSession` 与某个已聚焦的 `WorktreeTask`
- **AND** 后续节点执行 MUST 只在该仓库执行上下文内推进

#### Scenario: 工作树可以被登记和聚焦
- **WHEN** 用户在工作台中登记新的 worktree 路径与分支
- **THEN** 系统 MUST 把该 worktree 作为可管理对象加入工作树列表
- **AND** 系统 MUST 支持把某个 worktree 聚焦为后续模板运行的目标上下文

### Requirement: MVP 架构基线 SHALL 在实现前被显式定义

系统 MUST 在进入实现前先明确工作台当前采用的五层骨架：`Workbench Surface -> WorkflowOrchestrator -> LocalRuntime -> Repo Domain -> Artifact Publisher`，避免首版退化成随意拼装；后续若有更优认识，可以在保持主语义可迁移的前提下继续演进。 

#### Scenario: 骨架先于节点实现被定义
- **WHEN** 团队开始实现 `new-faction` MVP
- **THEN** 设计文档 MUST 明确当前五层职责边界与调用方向
- **AND** 不得在未定义骨架前直接以聊天式流程或临时工具调用替代正式工作流分层

#### Scenario: 后续演进时保持主语义连续
- **WHEN** 后续有人尝试增加 `new-faction` 之外的第二个模板或调整现有分层
- **THEN** 变更 MUST 先显式更新 design/spec 中的五层边界说明
- **AND** 不得通过引入自由画布或通用聊天入口绕过既有 `Repo Domain` 与 `Artifact Publisher` 主语义

### Requirement: `new-faction` 模板 SHALL 按画布式固定节点图推进

系统 MUST 将“新建派系”实现为画布式固定节点图，而不是自由聊天式的隐式步骤拼接。

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

#### Scenario: 可选节点可以在启动前被关闭
- **WHEN** 用户在启动某次 `new-faction` 运行前关闭可选节点（例如 `run-e2e-validation`）
- **THEN** 系统 MUST 记录该节点本次为禁用状态
- **AND** 该节点 MUST 在节点图和执行记录中显示为 `skipped`
- **AND** 系统 MUST 不得把“用户主动关闭节点”和“节点遗漏未实现”混为一谈

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

#### Scenario: E2E 节点关闭时的显式标记
- **WHEN** 用户在本次运行中关闭 `run-e2e-validation`
- **THEN** `ArtifactBundle.outputs.e2eStatus` MUST 被标记为 `skipped`
- **AND** 系统 MUST 明确说明这是“用户关闭了节点”，而不是隐式缺少 E2E

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

#### Scenario: 开源对照缺失时不得开始第一版实现
- **WHEN** 《开源基线与可复用结论》尚未完成，或仍停留在“只点名项目、不展开能力与边界”的状态
- **THEN** 团队 MUST 视为前置条件未满足
- **AND** 不得开始第一版 runtime、工作台 UI、模板节点或 repo-aware 执行逻辑实现

#### Scenario: fork 裁决必须显式比较产品底座
- **WHEN** 设计文档给出第一版产品底座结论
- **THEN** 文档 MUST 显式比较 `fork OpenHands / Flowise / n8n / Activepieces` 与“在现有 BoardGame 基础上扩展”的可行性与代价
- **AND** 文档 MUST 给出“fork / 不 fork”的明确结论，而不是只列出项目名词

#### Scenario: fork 裁决不能覆盖本地仓库语义
- **WHEN** 某开源项目的通用自动化模式与本项目的本地仓库工作流发生冲突
- **THEN** 系统 MUST 优先保持 `RepoSession / WorktreeTask / ArtifactBundle` 这套本地仓库语义
- **AND** 不得为了贴合外部框架或 fork 底座而牺牲本地执行与证据交付边界

#### Scenario: Flowise fork 必须锁定已验证版本
- **WHEN** 团队决定以 `Flowise` 作为当前 fork 起点
- **THEN** 系统 MUST 锁定一个明确的上游 tag / commit，作为可审计的 fork 基线
- **AND** 不得直接追踪 upstream `main`
- **AND** 升级到后续版本前 MUST 先记录兼容性、风险和迁移影响

#### Scenario: Flowise 只负责画布与 workflow shell
- **WHEN** 团队实施 `Flowise` fork
- **THEN** `Flowise` MUST 只承载节点画布、连线交互与 workflow shell
- **AND** 不得接管 `RepoSession`、`WorktreeTask`、`WorkflowRun`、`DecisionRequest`、`ArtifactBundle` 的领域真相

### Requirement: 当前技术选型 SHALL 附带成立理由、风险与优化项

系统若继续采用“Flowise fork 作为节点画布 / workflow shell + local-first runtime + 显式领域模型 + 可插拔 orchestrator”的路线，设计文档 MUST 同时说明为什么成立、风险在哪里、还需要哪些优化。

#### Scenario: 技术选型结论可审计
- **WHEN** 设计文档主张继续沿用当前技术选型
- **THEN** 文档 MUST 同时列出成立原因、主要风险与后续优化项
- **AND** 不得只给出结论而省略代价与边界

### Requirement: 远程仓库接入 MUST 先落地本地执行上下文

系统若支持远程 GitHub 仓库，MUST 先把远端仓库获取到本地可管理执行上下文，再允许模板运行；不得把远程 URL 直接当成可执行仓库会话。

#### Scenario: clone-remote 生成本地 RepoSession
- **WHEN** 用户选择通过 GitHub 仓库 URL 启动工作台
- **THEN** 系统 MUST 先完成 clone/fetch 到受管理的本地目录
- **AND** 再基于该本地目录生成 `RepoSession`
- **AND** 不得在未落地本地路径前启动 `WorkflowRun`

#### Scenario: import-local 与 clone-remote 区分可见
- **WHEN** 用户查看当前仓库会话来源
- **THEN** 系统 MUST 明确区分 `import-local` 与 `clone-remote`
- **AND** 展示仓库指纹、来源 URL（若有）与当前本地执行根目录

### Requirement: 交付上限 MUST 受仓库权限与分支保护约束

系统 MUST 把交付上限建模为显式策略，并在缺少权限、受保护分支或仓库策略不允许时安全降级。

#### Scenario: 受保护分支禁止自动 merge
- **WHEN** 当前仓库目标分支受保护，或机器人/当前执行上下文无 merge 权限
- **THEN** 系统 MUST 将交付上限降级为 `PR` 或更低
- **AND** 在运行结果中明确说明阻断来自权限/策略，而不是任务本身失败

#### Scenario: 无 push 权限时停在产物或 patch
- **WHEN** 当前执行上下文缺少 push 或创建 PR 的权限
- **THEN** 系统 MUST 至少输出 `ArtifactBundle`、关键 diff 摘要与后续人工动作建议
- **AND** 不得把该运行标记为“已提交/已建 PR”

### Requirement: ArtifactBundle 网页展示 SHALL 分层呈现摘要与原始证据

系统 SHALL 在网页中分层展示 ArtifactBundle，使用户先看到运行级摘要，再逐层下钻到节点证据与原始文件。

#### Scenario: 运行级摘要卡片可见
- **WHEN** 用户打开某次运行的 ArtifactBundle
- **THEN** 系统 MUST 先展示运行级摘要卡片
- **AND** 至少包含模板名、仓库/工作树、最终状态、关键观察结论与交付上限

#### Scenario: 节点证据与原始文件可下钻
- **WHEN** 用户展开某个节点的证据
- **THEN** 系统 MUST 显示该节点的输入/输出摘要、失败原因或观察结论
- **AND** 提供跳转到截图、日志、规范化文本或其他原始文件的入口

#### Scenario: 失败节点保留恢复入口
- **WHEN** 运行停在失败或等待决策状态
- **THEN** 系统 MUST 在对应节点卡片上展示恢复入口或下一步建议
- **AND** 不得只把失败信息埋在原始日志里
