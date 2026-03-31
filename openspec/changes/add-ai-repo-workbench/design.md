## Context

当前仓库已经具备大量可执行流程知识，但这些知识仍然以“AI 助手 + 人工盯进度”的方式存在：

- `create-new-game` skill、数据录入规范、E2E 规范、PR 自动化规范都已经定义了做事步骤。
- 这些步骤散落在 `AGENTS.md`、skill、脚本、测试约定与证据文档中，尚未形成产品化工作台。
- 用户真正需要的不是一个更强的聊天框，而是一个围绕“仓库 + 工作流 + 证据交付”组织起来的网页工作台。

本次 change 的目标不是把所有工作流一次性产品化，而是**先把第一版 MVP 收敛到“新建派系”工作流**，把最关键的编排、暂停/恢复、证据回传与本地执行边界定义清楚。

## Goals / Non-Goals

- Goals:
  - 不走随意拼装路线；先建立 MVP 的当前骨架、分层边界与 fork 裁决基线，再进入实现，并允许后续按真实反馈持续完善。
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

## Skeleton-First Principles

### Decision: 这条线先建立清晰基线，再在实现中持续迭代完善

第一版不能采用“先做个聊天框 / 先打通一条最短 happy path / 以后再慢慢抽象”的路径，因为那会把最关键的架构判断延后，最后演变成产品边界、运行边界和证据边界都不稳定的临时系统。

但这里的目标也不是把后续演进空间一次性锁死，而是先明确当前成立的架构基线，再允许随着实现反馈持续修正。当前基线至少包括：

1. **产品骨架**：MVP 只暴露 `new-faction`，不把工作台伪装成通用任务中心。
2. **分层骨架**：`Workbench Surface -> WorkflowOrchestrator -> LocalRuntime -> Repo Domain -> Artifact Publisher`。
3. **人工决策骨架**：所有人工暂停点都归一到 `DecisionRequest`。
4. **交付骨架**：所有阶段性交付都归一到 `ArtifactBundle`。
5. **开源底座裁决**：在实现前明确“是否 fork 成熟开源仓库作为底座”。

若上述任一项尚未定义清楚，不进入第二模板、自由画布、远程执行、云端多租户等扩展讨论；若后续发现更优方案，应通过显式更新 spec/design 的方式演进，而不是在实现里悄悄漂移。

## 开源基线与可复用结论

### Decision: 第一版实现前必须先完成开源对照与底座决策

以下结论只建立在官方仓库 / 官方文档所表达的产品定位上，而不是只引用项目名词：

| 候选 | 它具体提供什么 | 哪些能力可直接借鉴 | 哪些不适合我们 | 主要来源 |
| --- | --- | --- | --- | --- |
| LangGraph interrupts / durable execution | 提供图式 agent/workflow 编排、`interrupt` 暂停、checkpoint 持久化、thread/run 级恢复，以及对 deterministic / idempotent / side-effect 包装的明确约束。 | 直接借鉴 `waiting_decision` / resume 语义、checkpoint 思路、可重放节点契约，以及“副作用必须幂等化并与恢复边界解耦”的要求。 | 不适合把 LangGraph graph DSL 直接当成产品底座；它不提供本项目需要的仓库会话、worktree、证据 bundle 与产品化工作台语义。 | `https://docs.langchain.com/oss/python/langgraph/interrupts`、`https://docs.langchain.com/oss/python/langgraph/durable-execution` |
| OpenHands | 提供面向真实代码仓库的 AI 开发产品：SDK、CLI、本地 GUI、REST API、云/企业形态，以及在本地/沙箱中执行工具与修改代码的能力。 | 直接借鉴“仓库是第一等公民”“工具执行反馈必须可见”“GUI/CLI 共用执行后端”这三点；也借鉴 repository customization 与本地运行时视角。 | 不适合直接作为底座：其主心智仍是对话式通用 coding agent；本地 process sandbox 默认无隔离；Python 主栈与现有 React + Node 产品壳不对齐。 | `https://github.com/OpenHands/OpenHands`、`https://docs.all-hands.dev/openhands/usage/sandboxes/process` |
| Flowise | 提供可视化 AgentFlow V2，强调独立节点、显式连线、Flow State、执行队列、loops / conditions / HITL 与 checkpoint 恢复。 | 直接借鉴节点时间线可视化、显式共享状态、HITL checkpoint 恢复、结构化 JSON 输出节点思路。 | 不适合直接作为底座：它的核心是通用 AI workflow builder，天然会把产品推回“自由拖拽平台”；而第一版只做固定模板 `new-faction`。 | `https://docs.flowiseai.com/using-flowise/agentflowv2` |
| n8n | 提供通用 workflow automation，重点在执行历史、Wait 节点、Webhook/Form 恢复，以及面向 AI tool call 的 human review。 | 直接借鉴等待后落库恢复、审批/人工 review 卡片、运行详情对失败节点和输入输出的展示。 | 不适合直接作为底座：其强项是 SaaS/集成自动化，不是本地仓库任务语义；连接器、凭据系统和集成市场都会稀释 `RepoSession / WorktreeTask / ArtifactBundle` 主语义。 | `https://docs.n8n.io/integrations/builtin/core-nodes/n8n-nodes-base.wait/`、`https://docs.n8n.io/advanced-ai/human-in-the-loop-tools/` |
| Activepieces | 提供 piece-based 自动化平台，支持 flow control hooks、webhook/delay pause、approval / human input / chat / form 等低门槛人机交互。 | 直接借鉴 `ctx.run.pause/stop` 这种明确控制流接口，以及 approval / chat / form 的低认知负担交互。 | 不适合直接作为底座：其主语义是 piece / trigger / action，不是 repo/worktree；若硬 fork，仍需大规模逆向改造领域模型。 | `https://github.com/activepieces/activepieces`、`https://www.activepieces.com/docs/build-pieces/piece-reference/flow-control` |
| Temporal | 提供强 durable orchestration、Event History、command/event 回放、signals / queries，以及对 deterministic workflow code 的强约束。 | 直接借鉴“事件历史是恢复真相源”“signal / update 负责外部输入恢复”“工作流代码必须确定性”这些编排原则；适合作为未来 `LocalRuntime` 的替代执行器。 | 不适合第一版直接接入：它是基础设施级编排内核，不是现成产品底座；过早引入会把 MVP 升级成分布式 workflow 平台工程。 | `https://docs.temporal.io/workflows`、`https://docs.temporal.io/encyclopedia/event-history` |
| Dagu | 提供 local-first、YAML/file-based、单二进制、轻运维 Web UI，以及 shell/http/docker/ssh 等步骤编排。 | 直接借鉴 local-first、轻运维、执行详情可见性与低基础设施成本的取向。 | 不适合直接作为底座：它是 shell-first / scheduler-first 的 DAG 引擎，更像运维编排器，不是 repo-aware AI workbench。 | `https://github.com/dagu-org/dagu`、`https://docs.dagu.sh/writing-workflows/examples` |

这不是“可选调研”，而是 **MVP 实现前的硬前置门槛**：

1. 在 `LocalRuntime`、工作台 UI、模板节点或任何 repo-aware runtime 代码开始实现前，必须先完成这一节并形成明确裁决。
2. 若这一节仍停留在“听过项目名”“觉得像”“应该能借鉴”的层面，则视为前置条件未满足，不得进入第一版实现。
3. 后续如果因为新证据而改变底座判断，必须先更新本节，再更新实现任务；禁止跳过文档直接漂移。

基于这组官方基线，第一版可复用结论固定如下：

1. **工作台的核心不是聊天，也不是自由画布，而是“仓库模板工作流 + 决策暂停 + 证据交付”。**
2. **LangGraph 最多是编排层基础设施，不是领域模型来源。**
3. **仓库本地执行语义必须由本项目自定义的 `RepoSession / WorktreeTask / ArtifactBundle` 持有，而不是从现成自动化平台反推。**
4. **UI 可以借鉴 Flowise / Activepieces，执行可见性可以借鉴 n8n，仓库执行体验可以借鉴 OpenHands，durable orchestration 原则可以借鉴 LangGraph / Temporal，local-first 运营方式可以借鉴 Dagu，但产品骨架不能被任何单个外部项目接管。**

本轮未额外把这些开源仓库拉到本地做对照；原因是官方文档与官方仓库首页已经足以回答“产品提供什么 / 可借鉴什么 / 为什么不适合作为底座”。若后续进入实现并需要核对具体目录边界，再按需做浅克隆。

## Fork 评估与底座裁决

### Decision: 当前不直接 fork 成熟开源仓库，采用“自研领域骨架 + 选择性吸收能力”

老板要求的关键问题不是“能不能 fork”，而是“fork 之后会不会把产品重心带偏”。因此本 change 必须先给出显式裁决：

| 候选底座 | 贴合度 | 能直接省掉什么 | 真正要付出的改造成本 | 为什么不作为第一版底座 / 为什么采用 | 结论 |
| --- | --- | --- | --- | --- | --- |
| OpenHands | 中高 | 能直接复用 repo 选取、工具执行、CLI/GUI 共后端、本地/容器 runtime 经验。 | 要把以 `conversation / agent / task` 为中心的产品骨架改造成 `RepoSession / WorkflowTemplate / DecisionRequest / ArtifactBundle`；还要处理 Python 主栈与现有 React + Node 产品壳错位。 | 它更像“通用 coding agent 产品”，而我们当前要的是“固定模板的 repo-aware 工作台”。若 fork，第一阶段大部分工作都会变成对主语义做逆向改造。 | **不 fork** |
| Flowise | 中 | 能直接复用节点图 UI、运行流可视化、共享 flow state、HITL checkpoint 交互。 | 要把 visual builder 主心智收缩成固定模板产品，还要把 `$flow.state` 风格的运行态改造为可审计领域对象；同时接入现有认证、上传、OpenSpec 和证据体系。 | 它适合作为“节点编排交互参考”，不适合作为“第一版产品底座”；否则会反向驱动我们先做画布，而不是先做模板。 | **不 fork** |
| n8n | 中低 | 能直接复用等待/恢复、执行历史、失败节点可见性、人审 tool-call 的成熟模式。 | 要绕开 connector/credential/marketplace 这条 iPaaS 主线，把自动化平台改造成 repo-local 工作台；此外 fair-code 许可也会让底座策略与未来分发方式变复杂。 | 它解决的是“自动化集成编排”，不是“仓库任务语义”；fork 后需要长期对抗其产品默认值。 | **不 fork** |
| Activepieces | 中 | 能直接复用 TypeScript 栈、approval/form/chat 这套低心智负担的 HITL 交互，以及 flow pause/stop 控制流。 | 仍需把 piece/trigger/action 生态改造成 repo/worktree/workflow 模型，并补齐工作台级证据 bundle、仓库会话、模板化节点契约。 | 它在技术栈上最接近我们，但产品语义仍是 automation builder，不是 repo-aware workbench；直接 fork 依然会花大量精力对抗错误主语义。 | **不 fork** |
| 现有 BoardGame 基础上扩展 | 高 | 直接复用现有 React 19、Node、认证、上传、本地脚本链路、OpenSpec、E2E、证据文档与 repo 内规则资产。 | 需要自建最小 `WorkflowOrchestrator`、`DecisionRequest`、运行详情页、`ArtifactBundle` 与 durable journal。 | 虽然要补 runtime 骨架，但这是“新增正确主语义”，不是“拆旧主语义再重装”；实现路径更短，也更符合当前产品目标。 | **采用** |

### Fork 裁决标准

本次不是按“谁更成熟”拍脑袋选，而是按下面五条标准做裁决：

1. **主语义是否一致**：候选底座是否天然围绕 repo / worktree / 模板工作流 / 证据交付，而不是 conversation、canvas 或 integration marketplace。
2. **技术栈是否顺手**：是否能在不重建整个产品壳的前提下接入现有 React 19、Node、认证、上传和本地脚本链路。
3. **改造成本是加法还是逆向改造**：我们是在补少量缺件，还是必须先拆掉它最核心的默认抽象。
4. **本地仓库语义是否可保真**：是否能把 `RepoSession / WorktreeTask / ArtifactBundle` 维持为唯一真实来源，而不是被外部框架状态反客为主。
5. **后续演进是否稳**：第一版之后接 LangGraph / Temporal 或扩模板时，是否还能保持领域边界稳定。

结论上，四个外部产品底座都属于“需要大规模逆向改造主语义”，而“在现有 BoardGame 基础上扩展”属于“补齐缺失骨架但保留正确主语义”。因此第一版底座裁决不是“谨慎保守”，而是**从架构正确性出发的唯一最优解**。

最终裁决：

- **最正确方案：不直接 fork，上层自定义领域骨架，下层按需吸收成熟项目的局部模式。**
- 理由不是“改动最小”，而是**架构正确性最高**：我们要先把 `RepoSession / WorktreeTask / DecisionRequest / ArtifactBundle` 这套仓库工作台语义定成唯一真实来源，任何直接 fork 都会先继承对方的主语义，再被迫做大规模逆向改造。
- 与其把 OpenHands / Flowise / n8n / Activepieces 其中之一硬改成 repo-aware workbench，不如在现有 BoardGame 基础上直接扩展；这样能保留现有用户系统、上传链路、规则文档、OpenSpec、E2E 与证据体系，避免“先拆自己，再装回去”。
- 若未来目标切换为“聊天式 coding agent 平台”，再重新评估以 OpenHands 为底座；若未来目标切换为“通用自动化 / SaaS 集成市场”，再重新评估 n8n / Activepieces。当前目标下，两类 fork 都不是最正确路线。

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

### Decision: 先建立五层骨架基线，再实现固定节点图

MVP 的骨架不是“聊天框 + 若干工具调用”，而是当前明确采用的五层：

1. `Workbench Surface`：模板入口、运行详情、决策卡片、证据预览。
2. `WorkflowOrchestrator`：节点图推进、checkpoint、interrupt / resume、状态迁移。
3. `LocalRuntime`：worktree、文件、命令、日志、脚本与本地安全边界。
4. `Repo Domain`：`RepoSession`、`WorktreeTask`、`WorkflowRun`、`DecisionRequest`、`ArtifactBundle`。
5. `Artifact Publisher`：bundle 组装、证据索引、阶段产物发布。

只有在这五层边界先被明确后，固定节点图才有意义；否则实现细节会反过来绑死领域模型。后续如果实践证明某层拆分需要调整，应通过文档和 schema 一起演进，而不是跳过分层直接堆实现。

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

### LangGraph Layer Boundary

若采用 LangGraph，它**只允许位于 `WorkflowOrchestrator` 层**，用于表达节点推进、中断恢复与 checkpoint；它不能越级拥有仓库领域对象。

| 对象 / 层 | 应由谁负责 | LangGraph 可以知道什么 | LangGraph 不得拥有什么 |
| --- | --- | --- | --- |
| `WorkflowOrchestrator` | LangGraph 适配器或等价自研 orchestrator | 节点 ID、运行状态、resume token、checkpoint key、节点间状态转移 | 仓库真实路径策略、worktree 生命周期策略、最终交付语义 |
| `LocalRuntime` | 本项目 runtime 层 | 被 orchestrator 调用的 side-effect task 结果 | runtime 内部文件句柄、shell policy、仓库权限边界 |
| `RepoSession` | 本项目领域层 | 一个可序列化的会话引用 / sessionId | 作为 LangGraph 原生 thread state 的唯一真源 |
| `WorktreeTask` | 本项目领域层 + runtime | taskId、状态引用、执行结果摘要 | worktree 的创建/复用/销毁规则本身 |
| `DecisionRequest` | 本项目领域层 | interrupt 点所需的最小 resume token 与状态引用 | 决策卡片 schema 的定义权、审计日志结构 |
| `ArtifactBundle` | `Artifact Publisher` + 领域层 | 产物发布动作的触发时机 | bundle 的最终 schema、证据索引结构、E2E 状态定义 |

因此，LangGraph 的正确位置是：

- **上接** `Workbench Surface` 暴露的运行 / 恢复操作；
- **下接** `LocalRuntime` 暴露的 side-effect task；
- **旁路引用** `Repo Domain` 的稳定 schema；
- **不直接拥有** 仓库语义、决策协议与证据协议。

进一步约束：

1. `RepoSession`、`WorktreeTask`、`DecisionRequest`、`ArtifactBundle` 必须先独立建模，再决定是否用 LangGraph 驱动节点推进。
2. 即使采用 LangGraph，也只在内部适配层使用 `StateGraph` / `interrupt` / `Command` 语义，对外 API 不暴露 LangGraph 专有类型。
3. LangGraph checkpoint 中只保存可重放的运行状态与引用，不直接塞入大文件内容、截图二进制或完整仓库快照。

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

## Selection Validity / Risks / Optimizations

### Decision: 当前技术选型仍成立，但必须带着风险表推进

当前推荐组合仍然成立：

- **领域骨架**：`RepoSession / WorktreeTask / WorkflowRun / DecisionRequest / ArtifactBundle`
- **执行策略**：local-first `LocalRuntime`
- **编排策略**：固定模板工作流；LangGraph 仅作为可插拔 orchestrator 适配层
- **产品收敛**：只做 `new-faction`
- **开源策略**：不 fork，局部吸收成熟模式

成立原因：

1. 目标问题首先是**仓库工作台**，不是通用 agent playground。
2. MVP 最关键的复杂度来自**暂停 / 恢复 / 决策 / 证据交付**，而不是任意画布编排。
3. 本项目必须保留强本地仓库语义与可审计交付，这要求领域模型先于底层框架。

主要风险：

| 风险 | 触发方式 | 当前控制策略 |
| --- | --- | --- |
| 领域骨架定义得不够清楚，后续又被实现细节反推 | 先写节点代码，再补 schema | 先定义当前 schema、接口与层次边界，再做节点实现；若实现中发现更优抽象，再显式回写文档 |
| LangGraph 侵入过深，导致领域对象被其线程状态绑架 | 直接把 session / artifact 全塞进 graph state | 只允许保存引用与可重放状态，不让 LangGraph 成为领域真源 |
| 不 fork 带来初期自研成本 | 前期需要自建运行详情、决策卡片、bundle 发布 | 只自研领域骨架与必要 UI，其他交互模式按成熟项目收敛 |
| local-first 在可靠性上弱于成熟编排平台 | 进程重启 / 长时暂停 / 重试策略不足 | 先用本地 durable journal，接口层提前为 Temporal 预留适配面 |

还需要的优化：

1. 增加 `WorkflowOrchestrator` 抽象接口，避免 LangGraph 成为事实标准实现。
2. 优先选择可恢复的本地持久化（推荐 SQLite + artifact index），避免只靠临时文件。
3. 强制节点 side effect task 幂等化，保证暂停恢复后不重复执行文件写入 / 命令副作用。
4. 在运行详情页把“领域状态”与“执行器状态”分开展示，避免用户把 LangGraph / runtime 细节误认为产品对象。

## Risks / Trade-offs

- 只做“新建派系”会显得范围小，但这是为了验证最关键的暂停/恢复与证据交付链路。
- 不立即接入 Temporal，会让第一版可靠性上限受限，但能显著降低启动复杂度。
- 统一 `DecisionRequest` 会增加节点开发规范成本，但长期能避免交互碎片化。
- 把 `ArtifactBundle` 作为硬产物会增加每个节点的落盘负担，但能换来审计、可视化与后续自动化兼容性。

## Migration Plan

1. 先完成《开源基线与可复用结论》与底座决策，锁定“在现有 BoardGame 基础上扩展，不 fork 外部产品”。
2. 再发布 `ai-repo-workbench` capability spec，明确 MVP 只支持 `new-faction`。
3. 先用 local-first runtime 打通节点执行、暂停/恢复、证据回传。
4. 第二阶段再增加“生成派系代码骨架 + 本地预览 + E2E”子流程。
5. 第三阶段再评估是否需要把执行器切换为 Temporal-backed runtime。
6. 在 `new-faction` 验证稳定后，再复制同一套领域模型到“数据录入 / Bug 修复”等模板。

## Open Questions

- `faction-definition` 的正式 schema 是放在工作台侧单独维护，还是直接复用游戏目录内 schema。
- `DecisionRequest.evidenceRefs` 是只引用本地文件，还是允许对象存储 URL。
- 第一版是否允许“无素材纯规则模式”直接完成，还是要求至少上传占位素材清单。
- `LocalRuntime` 的状态存储是文件型 journal、SQLite，还是仓库外部的小型本地数据库。
