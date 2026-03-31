## Context

当前仓库已经具备大量可执行流程知识，但这些知识仍然以“AI 助手 + 人工盯进度”的方式存在：

- `create-new-game` skill、数据录入规范、E2E 规范、PR 自动化规范都已经定义了做事步骤。
- 这些步骤散落在 `AGENTS.md`、skill、脚本、测试约定与证据文档中，尚未形成产品化工作台。
- 用户真正需要的不是一个更强的聊天框，而是一个围绕“仓库 + 工作流 + 证据交付”组织起来的网页工作台。

本次 change 的目标不是把所有工作流一次性产品化，而是**先把第一版 MVP 收敛到“新建派系”工作流**，把最关键的编排、暂停/恢复、证据回传与本地执行边界定义清楚。

## Goals / Non-Goals

- Goals:
  - 用单一、固定、可观察的“新建派系”节点流验证工作台架构。
  - 明确每个节点的输入、输出、持久化状态与暂停/恢复契约。
  - 定义 `DecisionRequest` 作为人工决策的统一协议，而不是各节点各自发问。
  - 定义 `ArtifactBundle` 作为 MVP 阶段性交付与最终交付的统一证据容器。
  - 先落地 local-first runtime 的职责边界，并为未来接入 Temporal 预留稳定接口。
  - 明确各成熟开源方案影响到哪些设计决策、哪些不照搬。
- Non-Goals:
  - 本 change 不实现通用自由画布编辑器。
  - 本 change 不要求第一版就覆盖“数据录入 / Bug 修复 / 审计 / PR merge”完整产品能力。
  - 本 change 不要求第一版就引入 Temporal、Kubernetes 或分布式调度。
  - 本 change 不把 OpenHands、Flowise、n8n、Activepieces 直接当成可嵌入组件；这里只借鉴架构与交互模式。

## MVP Boundary

### Decision: 第一版 MVP 只做“新建派系”，不做通用任务中心

第一版产品能力应收敛为：

1. 绑定一个本地仓库会话。
2. 选择并启动“新建派系”模板。
3. 通过固定节点流完成规则获取、转录、素材核对、结构化派系定义草案与人工确认。
4. 生成 `ArtifactBundle` 作为阶段性交付证据。

MVP **明确不包含** 以下内容：

- 通用节点画布编排。
- 自动写完完整代码并直接进入 PR / merge。
- 所有游戏类型、所有任务模板同时上线。
- 多租户远程执行集群。

收敛原因：

- “新建派系”天然包含来源选择、文档转录、素材缺失、结构化确认、暂停/恢复，是最能验证工作台架构的最小闭环。
- 若第一版同时承载“新建游戏”“Bug 修复”“数据录入”等多条主链路，规范会重新变成宽泛口号，难以指导实现。

## Architecture Overview

### Decision: 采用固定节点图 + 持久化运行日志，而不是自由聊天拼接

MVP 采用固定模板工作流：

- 模板：`new-faction`
- 执行模型：有向节点图，但第一版按预定义顺序推进
- 节点类型：自动节点、决策节点、门禁节点、产物节点
- 持久化单元：`WorkflowRun`、`NodeExecutionRecord`、`DecisionRequest`、`ArtifactBundle`

这样做的原因：

- 让状态迁移、恢复、审计与前端展示都有稳定结构。
- 与 LangGraph 的 durable execution / interrupt-resume 思路一致，但不要求第一版直接接入 LangGraph 运行时。
- 比自由聊天更容易限制“系统到底做到哪一步了”。

### Decision: 仓库会话与本地运行时是第一等公民

MVP 的核心不是“消息”，而是“仓库上下文中的执行”：

- `RepoSession` 表示已绑定的本地仓库。
- `WorktreeTask` 表示该仓库中某条任务线的隔离工作目录。
- `WorkflowRun` 表示一次具体模板执行。
- `LocalRuntime` 负责在本机执行脚本、读取文件、生成证据与暂停恢复。

第一版必须 local-first，原因是：

- 当前项目大量工作依赖本地文件、现有脚本、本地浏览器与本地 dev server。
- 用户当前真实使用场景就是在本机仓库中驱动 AI 任务，而不是把任务丢给远程 SaaS 黑盒。
- Dagu 的轻量本地调度思路与 OpenHands 的本地工作区执行思路都证明：先把本地闭环做稳，才能决定是否引入更重的后端编排层。

### Decision: 人工输入必须通过 `DecisionRequest` 聚合，而不是让节点随时发散追问

系统中的所有人工确认都必须落到统一结构：

- 节点不得直接自由发问。
- 节点只能创建 `DecisionRequest` 并暂停。
- 前端只渲染 `DecisionRequest`，并把用户回答回写为 `DecisionResolution`。

这样做的原因：

- 对齐 Activepieces 的 approval / human input 卡片思路。
- 对齐 LangGraph interrupt：中断点必须是显式对象，而不是隐式对话状态。
- 便于后续把同一个决策对象迁移到 Temporal signal/update 接口，而不需要重写业务节点。

### Decision: `ArtifactBundle` 是 MVP 交付核心，不以“聊天总结”替代

每次运行至少要产出一个结构化 `ArtifactBundle`：

- 阶段性 bundle：如规则转录完成、素材核对完成、派系定义确认完成。
- 最终 bundle：本次 `new-faction` 模板主流程完成后的统一交付。

MVP 中 bundle 的最小内容不是 E2E，而是：

- 规则来源证据
- 规范化规则文本
- 素材核对结果
- 结构化派系定义草案 / 已确认版本
- 决策日志
- 阶段风险与后续建议

说明：

- 第一版工作流在“结构化派系定义确认”结束，不直接产出可运行 UI，因此 E2E 状态可以是 `not_applicable`。
- 后续若扩展到“自动写代码并启动验收”，再将 E2E 证据提升为该模板的强制门禁。

## Core Data Model

### RepoSession

`RepoSession` 表示一个已绑定的仓库上下文。

建议字段：

```ts
type RepoSession = {
  id: string
  sourceType: 'init-template' | 'import-local' | 'clone-remote'
  rootPath: string
  defaultBranch: string
  activeWorktreeId?: string
  repoFingerprint: string
  createdAt: string
  metadata: {
    repoName: string
    originUrl?: string
    gameFamily?: string
  }
}
```

### WorktreeTask

`WorktreeTask` 表示绑定在某个仓库会话上的隔离任务工作目录。

```ts
type WorktreeTask = {
  id: string
  repoSessionId: string
  branchName: string
  worktreePath: string
  taskKind: 'new-faction'
  status: 'ready' | 'running' | 'paused' | 'completed' | 'failed' | 'archived'
  runtimeIds: string[]
  artifactBundleIds: string[]
}
```

### WorkflowTemplate

```ts
type WorkflowTemplate = {
  id: 'new-faction'
  version: string
  entrySchemaId: string
  nodeGraph: WorkflowNodeDefinition[]
  completionNodeId: string
}
```

### WorkflowRun

```ts
type WorkflowRun = {
  id: string
  templateId: 'new-faction'
  templateVersion: string
  repoSessionId: string
  worktreeTaskId: string
  status: 'pending' | 'running' | 'waiting_decision' | 'blocked' | 'completed' | 'failed' | 'cancelled'
  currentNodeId?: string
  checkpointVersion: number
  startedAt: string
  finishedAt?: string
  latestDecisionRequestId?: string
}
```

### NodeExecutionRecord

每个节点都必须有独立的执行记录。

```ts
type NodeExecutionRecord = {
  nodeId: string
  runId: string
  status: 'pending' | 'running' | 'waiting_decision' | 'blocked' | 'completed' | 'failed' | 'skipped'
  attempt: number
  inputRef: string
  outputRef?: string
  stateRef?: string
  startedAt?: string
  finishedAt?: string
  errorCode?: string
  errorSummary?: string
}
```

### DecisionRequest

`DecisionRequest` 是人工参与的统一中断对象。

```ts
type DecisionRequest = {
  id: string
  runId: string
  nodeId: string
  phase: 'rules' | 'assets' | 'definition' | 'delivery'
  kind: 'single_select' | 'multi_select' | 'form' | 'approval'
  title: string
  summary: string
  blocking: boolean
  rationale?: string
  options?: Array<{
    id: string
    label: string
    description: string
    payload?: Record<string, unknown>
  }>
  formFields?: Array<{
    id: string
    label: string
    fieldType: 'text' | 'textarea' | 'url' | 'file' | 'boolean' | 'json'
    required: boolean
    defaultValue?: unknown
    helpText?: string
  }>
  recommendedOptionId?: string
  evidenceRefs: string[]
  createdAt: string
  resumeToken: string
  resolution?: {
    actorId: string
    chosenOptionIds?: string[]
    fieldValues?: Record<string, unknown>
    comment?: string
    decidedAt: string
  }
}
```

### ArtifactBundle

```ts
type ArtifactBundle = {
  id: string
  runId: string
  scope: 'milestone' | 'final'
  stage: 'rules-acquired' | 'assets-checked' | 'definition-confirmed'
  status: 'ready' | 'partial' | 'failed'
  summary: string
  evidence: Array<{
    id: string
    kind: 'source-link' | 'uploaded-file' | 'transcript' | 'json-snapshot' | 'markdown-report' | 'screenshot' | 'log'
    label: string
    path?: string
    url?: string
    observation?: string
  }>
  outputs: {
    normalizedRuleCorpus?: string
    assetChecklist?: string
    factionDefinitionJson?: string
    decisionLog?: string
    unresolvedRisks?: string
    e2eStatus: 'not_applicable' | 'pending' | 'passed' | 'failed'
  }
  createdAt: string
}
```

## New-Faction Node Flow

### Decision: 用单一主链路 + 少量分支节点表达 MVP

MVP 主链路如下：

1. `capture-faction-intent`
2. `select-rule-source`
3. `acquire-rule-material`
4. `transcribe-or-normalize-rules`
5. `inspect-assets`
6. `draft-faction-definition`
7. `review-faction-definition`
8. `publish-artifact-bundle`

其中：

- `select-rule-source` 一定会暂停等待人工决策。
- `inspect-assets` 仅在缺素材或来源冲突时暂停。
- `review-faction-definition` 一定是人工确认节点。
- `publish-artifact-bundle` 负责生成 MVP 证据，并把 `e2eStatus` 标记为 `not_applicable`。

### Node Catalog

| 节点 | 类型 | 主要输入 | 主要输出 | 持久化状态 | 暂停条件 | 失败条件 |
| --- | --- | --- | --- | --- | --- | --- |
| `capture-faction-intent` | 自动 | 用户最小输入、仓库会话 | 规范化任务意图、派系名、目标游戏 | `intentSnapshot` | 无 | 缺少最小输入 |
| `select-rule-source` | 决策 | 任务意图、可用来源建议 | 已选规则来源、上传/链接元数据 | `selectedSource` | 等待用户选择来源 | 无有效来源 |
| `acquire-rule-material` | 自动 | 来源选择、上传文件、URL | 原始规则材料列表 | `rawSourceSet` | 来源不可访问且需替代时 | 下载/读取失败 |
| `transcribe-or-normalize-rules` | 自动 | 原始规则材料 | 规范化规则文本、来源映射 | `normalizedRuleCorpus` | OCR 质量过低需人工介入时 | 转录失败且无法恢复 |
| `inspect-assets` | 自动/决策 | 规则文本、已上传素材 | 素材清单、缺失项、继续策略 | `assetInspection` | 缺失关键素材或素材命名冲突 | 素材目录不可读 |
| `draft-faction-definition` | 自动 | 规则文本、素材清单、约束模板 | JSON/Markdown 派系定义草案 | `definitionDraft` | 无 | 草案结构校验失败 |
| `review-faction-definition` | 决策 | 草案、来源证据、素材结果 | 已确认定义或修订意见 | `definitionApproval` | 等待用户确认/修订 | 用户拒绝且未给修订信息 |
| `publish-artifact-bundle` | 自动 | 全部节点产物 | `ArtifactBundle` | `bundleRef` | 无 | 证据文件缺失 |

### Node Input / Output / State 细化

#### `capture-faction-intent`

- 输入：
  - `repoSessionId`
  - `gameId`
  - `factionName`
  - `userPrompt`
  - 可选素材列表
- 输出：
  - `intentSnapshot.json`
  - 规范化名称与 slug
- 状态：
  - `pending -> running -> completed`
  - 若缺少 `gameId` 或 `factionName`，直接 `failed`

#### `select-rule-source`

- 输入：
  - `intentSnapshot`
  - 预设来源候选：Wiki / PDF / 其他 URL / 本地文档
- 输出：
  - `DecisionRequest`
  - `selectedSource.json`
- 状态：
  - `running -> waiting_decision -> completed`
  - 用户提交回答后通过 `resumeToken` 恢复

#### `acquire-rule-material`

- 输入：
  - `selectedSource`
  - 上传文件句柄 / URL / 本地路径
- 输出：
  - `rawSourceSet.json`
  - 原始文档索引
- 状态：
  - 可重试
  - 下载失败或路径无权限时 `failed`

#### `transcribe-or-normalize-rules`

- 输入：
  - `rawSourceSet`
- 输出：
  - `normalizedRuleCorpus.md`
  - `sourceMapping.json`
  - 可选 `ocrWarnings.json`
- 状态：
  - 文本质量不足时可创建新的 `DecisionRequest` 请求用户补充更清晰文档或接受低可信转录

#### `inspect-assets`

- 输入：
  - `normalizedRuleCorpus`
  - 用户上传素材
- 输出：
  - `assetChecklist.md`
  - `missingAssets.json`
  - `continueMode`（补素材 / 纯规则继续）
- 状态：
  - 素材完整时直接 `completed`
  - 素材缺失时 `waiting_decision`

#### `draft-faction-definition`

- 输入：
  - `normalizedRuleCorpus`
  - `assetChecklist`
  - 目标 schema
- 输出：
  - `faction-definition.draft.json`
  - `faction-definition.draft.md`
- 状态：
  - 需通过 schema 校验；失败则 `failed`

#### `review-faction-definition`

- 输入：
  - 草案 JSON / Markdown
  - 关键来源证据
  - 缺失风险
- 输出：
  - `DecisionRequest`
  - `faction-definition.confirmed.json` 或 `revision-notes.md`
- 状态：
  - `waiting_decision`
  - 若用户要求修订，则跳回 `draft-faction-definition`

#### `publish-artifact-bundle`

- 输入：
  - 已确认派系定义
  - 决策日志
  - 规则来源与素材检查结果
- 输出：
  - `artifact-bundle.json`
  - 可供前端预览的证据索引
- 状态：
  - 生成成功后整个 run `completed`

## DecisionRequest Contract

### Decision: 统一结构优先于灵活字段

所有人工决策必须符合以下契约：

1. **必须可恢复**：每个 `DecisionRequest` 都有 `resumeToken`。
2. **必须可解释**：必须包含 `summary`、`rationale`、`evidenceRefs`。
3. **必须可渲染**：前端只需识别 `kind + options + formFields` 就能展示。
4. **必须可审计**：`resolution` 要记录操作者、时间、填写内容。
5. **必须幂等**：同一个 `resumeToken` 重复提交只更新同一请求，不生成重复节点结果。

对于“新建派系”MVP，至少存在三类 `DecisionRequest`：

- 规则来源选择
- 素材缺失后的继续策略
- 派系定义确认 / 驳回并修订

## ArtifactBundle Contract

### Decision: MVP 证据以“定义完成”而非“运行完成”为准

由于第一版工作流停在“结构化派系定义确认”，因此 `ArtifactBundle` 的 MVP 交付标准为：

- 至少 1 份规则来源索引
- 至少 1 份规范化规则文本
- 至少 1 份素材核对清单
- 至少 1 份结构化派系定义快照
- 至少 1 份决策日志
- 明确写出 `e2eStatus = not_applicable`

这样做的原因：

- 第一版尚未生成可运行代码，不应为了形式感伪造 E2E 交付。
- 但必须显式声明为什么没有 E2E，避免后续调用方误判为遗漏。

后续模板若扩展到“派系代码脚手架 + 启动服务 + E2E 验收”，则同一 `ArtifactBundle` 结构只需把 `e2eStatus` 从 `not_applicable` 升级为 `passed/failed` 并追加截图证据。

## Local-First Runtime Boundary

### Decision: 当前先做 `LocalRuntime`，只把 Temporal 作为未来编排适配层

MVP 当前职责由 `LocalRuntime` 承担：

- 绑定本地仓库目录与 worktree。
- 读取 / 写入本地文件。
- 调用仓库脚本、测试命令、转录命令与验证命令。
- 保存 `WorkflowRun`、节点状态、决策对象与证据索引。
- 在节点暂停后等待前端恢复。
- 把日志、证据、错误摘要回传到网页。

MVP **不** 让 `LocalRuntime` 负责：

- 跨机器调度
- 分布式任务队列
- 长期运行数月的高可用工作流编排
- 多租户隔离

### Future Temporal Boundary

若后续引入 Temporal，其职责边界应当是：

- **Temporal 负责**：
  - 持久化 workflow history
  - 长时间暂停与恢复
  - 重试策略、超时策略、signal/update 接口
  - 远程 worker 调度
- **Workbench 领域层仍负责**：
  - `RepoSession` / `WorktreeTask` / `WorkflowRun` / `DecisionRequest` / `ArtifactBundle` 领域模型
  - “新建派系”节点定义与节点 I/O schema
  - 前端交互与证据展示
  - 本地文件与仓库安全策略

因此，第一版实现时必须先把下面这些接口稳定下来：

- `runNode(nodeId, context)`
- `pauseForDecision(decisionRequest)`
- `resumeRun(runId, resolution)`
- `publishArtifactBundle(runId, stage)`

未来若切到 Temporal，只替换这些接口背后的执行器，不重写业务节点语义。

## Open Source Reference Mapping

### Decision: 只借鉴成熟项目中与“仓库工作流”直接相关的部分

| 参考项目 | 借鉴点 | 不照搬点 | 对本设计的直接影响 |
| --- | --- | --- | --- |
| LangGraph | `interrupt`、durable execution、resume 语义 | 不引入通用 agent graph DSL 作为首版产品 | `DecisionRequest` 与 `waiting_decision` / checkpoint 设计 |
| OpenHands | 本地工作区执行、对代码仓库的真实操作、工具运行反馈 | 不以聊天框作为主入口，不复刻其全量代理能力 | `RepoSession`、`WorktreeTask`、本地工具执行视角 |
| Flowise | 节点式执行可视化、运行记录面板 | 不开放自由拖拽编排器 | 前端用节点卡片展示输入/输出/状态 |
| n8n | 执行历史、失败节点可见性、阶段性运行数据 | 不引入通用 SaaS 集成市场 | `NodeExecutionRecord`、运行轨迹与错误可见性 |
| Activepieces | approval / human input 卡片、低认知负担的人机交互 | 不做面向大众自动化的广场模板体系 | 决策节点 UI 与阻塞态设计 |
| Temporal | 长时工作流、signal/update、可靠恢复 | 第一版不直接接入、不把基础设施侵入领域模型 | 未来编排适配边界 |
| Dagu | local-first、轻量 Web UI、低运维调度观 | 不走 shell-first 全局调度器产品路线 | 先做本地执行器而非先上分布式平台 |

### 采用规则

1. 借鉴交互与编排语义，不复制别人的产品边界。
2. 凡是会把 MVP 从“新建派系”拉回“通用自动化平台”的能力，一律延后。
3. 凡是会破坏本地仓库安全边界的“云端透明执行”能力，一律不进入第一版。

## Risks / Trade-offs

- 只做“新建派系”会显得范围小，但这是为了验证最关键的暂停/恢复与证据交付链路。
- 不立即接入 Temporal，会让第一版可靠性上限受限，但能显著降低启动复杂度。
- 统一 `DecisionRequest` 会增加节点开发规范成本，但长期能避免交互碎片化。
- 把 `ArtifactBundle` 作为硬产物会增加每个节点的落盘负担，但能换来审计、可视化与后续自动化兼容性。

## Migration Plan

1. 先发布 `ai-repo-workbench` capability spec，明确 MVP 只支持 `new-faction`。
2. 先用 local-first runtime 打通节点执行、暂停/恢复、证据回传。
3. 第二阶段再增加“生成派系代码骨架 + 本地预览 + E2E”子流程。
4. 第三阶段再评估是否需要把执行器切换为 Temporal-backed runtime。
5. 在 `new-faction` 验证稳定后，再复制同一套领域模型到“数据录入 / Bug 修复”等模板。

## Open Questions

- `faction-definition` 的正式 schema 是放在工作台侧单独维护，还是直接复用游戏目录内 schema。
- `DecisionRequest.evidenceRefs` 是只引用本地文件，还是允许对象存储 URL。
- 第一版是否允许“无素材纯规则模式”直接完成，还是要求至少上传占位素材清单。
- `LocalRuntime` 的状态存储是文件型 journal、SQLite，还是仓库外部的小型本地数据库。
