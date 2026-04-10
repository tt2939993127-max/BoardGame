## Context

当前项目已经拥有大量“可执行流程知识”，但这些知识散落在 skill、AGENTS、脚本和测试约定里：

- `create-new-game` skill 定义了分阶段新游戏接入流程与门禁。
- 数据录入、资源上传、审计、E2E、自审截图、PR 自动化各自已有规范。
- 现状仍然偏“AI 助手协作”，不是“产品级工作台”。

用户希望的目标不是继续扩展 UGC Builder，而是提供一个网页工作台：

- 用户可以新建游戏或导入本地已有游戏目录。
- 用户尽量只输入需求和素材。
- 系统自动选择工作流并推进。
- 模糊点集中暂停询问。
- 用户能实时看到执行过程。
- 最终交付以 E2E 截图和证据为主，而不是只返回一段文字。

## Goals / Non-Goals

- Goals:
  - 把 skill 与仓库脚本产品化为可视化工作流。
  - 让“仓库执行”而非“聊天回复”成为系统中心。
  - 明确截图/证据回传是硬门禁，不是附加项。
  - 支持从工作流直接进入 commit / PR / merge。
- Non-Goals:
  - 本 change 不要求实现通用任意节点画布编辑器。
  - 本 change 不要求继续扩展现有 UGC Builder 的 Schema/画布编辑体验。
  - 本 change 不要求把所有现有 skill 一次性全部产品化。

## Decisions

### Decision: 工作台以“模板工作流”而不是“自由画布”起步

用户目标是小白友好与可交付，不是自己搭节点。首批应以固定模板工作流为主：

- 新建游戏
- 数据录入
- 功能开发
- Bug 修复
- 审计

高级自定义应建立在模板节点稳定后，再开放有限组合能力。

### Decision: 以仓库会话为一等对象

工作台不是单纯 agent chat，需要先有明确仓库上下文：

- 新建游戏：从配置的仓库模板拉取到本地隔离工作目录，再创建执行分支。
- 导入游戏：直接绑定本地目录并扫描项目结构。

所有执行、测试、截图、PR、merge 都挂在同一个 `RepoSession` 上。

### Decision: skill 是后台流程知识，不是前台交互

现有 skill 中最有价值的是流程知识、门禁和验收标准。产品层不直接暴露 skill 文本，而是将其拆为：

- 自动执行节点
- 人工决策节点
- 门禁/验收节点

### Decision: 决策点应聚合，而不是碎片化打断

工作流运行中识别到的模糊项，应尽量汇总成一个 `DecisionRequest` 批次，例如：

- 是否与 Wiki 对照
- 是否接受可信网站作为对照源
- 图片是否允许自动重命名
- 图片裁切口径是否采用 row-major

只有在这些决策返回后，工作流才继续推进。

### Decision: 最终输出必须以 ArtifactBundle 交付

工作台的最终输出不能只是一段总结，必须至少包含：

- 关键 E2E 截图
- 截图对应的人眼观察结论
- 测试结果摘要
- 关键 diff / 变更清单
- 若进入 PR/merge，则附带 PR 链接或 merge 结果

## Core Objects

### RepoSession

- `sessionId`
- 仓库来源：`template-clone | local-import | remote-clone`
- 仓库标识（仓库名、默认分支、远端信息）
- 本地根目录 / worktree 根目录 / 临时产物目录
- 当前执行分支 / 基线 revision / head revision
- 绑定的 `gameId`、任务类型、当前 `workflowTemplateId`
- 会话级安全策略：允许写入范围、允许网络操作范围、是否允许提交/PR/merge

### DecisionRecord

DecisionRecord 是消息意图进入执行层前的统一裁决载体，用来把“老板说了什么”变成“系统准备怎么执行”。

- `decisionId`
- `runId?` / `repoSessionId?` / `sourceMessageId?`
- `rawIntent` / `normalizedIntent` / `confidence`
- `actionMode`: `draft | analyze | execute | deliver`
- `riskLevel`: `low | medium | high`
- `requiresApproval`
- `requiresPreflight`
- `blocked`
- `preferredExecutor`: `acp | exec | workflow | manual`
- `reportPolicy`: `silent | milestone | final | milestone_and_final`
- `ruleHits`
- `blockReasons`
- `suggestedNextActions`
- `createdAt` / `updatedAt`

### WorkflowTemplate

- `templateId`
- 模板名称、适用任务类型、目标用户模式（小白 / 高级）
- 固定节点序列
- 可选分支节点与启用条件
- 默认门禁规则与默认恢复点
- 关联的 skill/脚本/规范引用

### WorkflowRun

- `runId`
- 当前运行状态：`pending | running | waiting-decision | blocked | failed | completed | canceled`
- 已完成节点、当前节点、失败节点
- 可恢复检查点与最近一次快照
- 节点级日志、耗时、产物引用
- 与 `RepoSession`、`DecisionRequest`、`ArtifactBundle` 的关联

#### Checkpoint

每次写入 checkpoint 时，至少保留：

- `currentNode`
- `inputSummary`
- `outputSummary`
- `failureReason`
- `nextAction`
- `artifactIndex`
- `healthState`: `active | waiting-decision | idle | false-active`
- `updatedAt`

### WorkflowNode

- `nodeId`
- 节点类型：`input | automation | decision | gate | artifact | delivery`
- 输入契约、输出契约、失败语义、重试策略
- 是否允许自动跳过 / 是否必须人工确认
- 对应的 skill、脚本、agent 运行器或仓库命令

### DecisionRequest

- `decisionRequestId`
- 决策项列表、默认建议值、风险等级、来源节点
- 必答/可跳过标记、截止时间、是否阻塞主链路
- 决策结果、决策人、决策时间

### ArtifactBundle

- `bundleId`
- E2E 截图与缩略图
- 证据文档 / 审计摘要 / 测试摘要
- 关键日志、关键 diff、关键文件清单
- commit / PR / merge 结果
- 对外展示卡片与对内原始索引之间的映射

## Workflow Node Taxonomy

工作台首版将 skill 与仓库知识映射为六类节点，而不是直接暴露 prompt：

1. `input`：收集最小输入（需求、素材、仓库来源）。
2. `automation`：自动执行脚本、agent、审计、录入、生成等步骤。
3. `decision`：汇总模糊项，暂停等待用户一次性确认。
4. `gate`：检查测试、审计、截图、PR 策略等是否满足放行条件。
5. `artifact`：整理截图、日志、diff、证据摘要并生成 `ArtifactBundle`。
6. `delivery`：执行 commit、PR、merge、结果通知等最终交付动作。

## Template Families

### 新建游戏

典型链路：

`输入需求/素材 -> 初始化 RepoSession -> 结构扫描与缺口分析 -> 决策批次 -> 数据/资源接入 -> 功能实现 -> 审计与 E2E -> ArtifactBundle -> commit/PR/merge`

### 数据录入

典型链路：

`输入素材 -> 规范预检查 -> 决策批次 -> 数据录入/资源上传 -> 审计 -> E2E 截图 -> ArtifactBundle -> commit/PR`

### Bug 修复

典型链路：

`输入问题描述 -> 复现与根因定位 -> 决策批次（若需要） -> 修复 -> 回归测试 -> E2E 截图 -> ArtifactBundle -> commit/PR`

## Recovery / Resume Model

- 每个 `WorkflowRun` MUST 在节点完成、节点失败、等待决策、门禁结论产生时写入 checkpoint。
- checkpoint 至少包含：当前节点、输入摘要、输出摘要、失败原因、下一步动作、关联产物索引。
- 工作台刷新、进程重启或 agent 重连后，系统应从最近 checkpoint 恢复展示，并允许继续执行或重新运行当前节点。
- 对长任务，恢复界面必须区分“真实活跃”“等待决策”“假活跃/健康检查失败”。
- 若运行长期无新 checkpoint、无产物变化、无健康心跳，系统应将其从 `active` 降级为 `false-active` 候选，而不是持续伪装为运行中。

## Artifact Return Path

- 执行环境生成的截图、日志、测试结果必须先落到会话级产物目录。
- 工作台服务将这些原始文件索引为 `ArtifactBundle`，再生成网页可浏览的卡片化摘要。
- 截图卡片至少包含：图片、来源节点、时间戳、关联观察结论、可跳转原始文件。
- 若某节点宣称完成但未生成要求的截图/证据，后续 `gate` 必须判定失败。

## Delivery and Merge Policy

- `commit`、`PR`、`merge` 都属于 `delivery` 节点，不属于普通自动节点。
- 模板必须显式声明自己支持到哪一层交付：仅产物、可自动 commit、可自动 PR、可自动 merge。
- 自动 merge 必须依赖独立 `gate` 输出，且复用 `pr-automation` 中“原始 PR 是唯一 merge 单元”的约束。
- 对受保护分支或缺少权限的仓库，工作台应自动降级为“生成 PR/交付建议”，不得假装已完成 merge。

## Risks / Trade-offs

- 若直接做自由画布，复杂度高且不利于小白，初期会失控。
- 若只做纯自动推进，不做决策聚合，用户仍会觉得在“被 AI 追问”。
- 若不把截图回传纳入主链路，系统会退化为“文本型自动化”，不满足生产验收。
- 若仓库隔离策略不清晰，容易污染主工作树或误改非目标目录。

## Migration Plan

1. 先新增 `ai-repo-workbench` capability，明确主能力边界。
2. 以 `create-new-game` 为第一条被产品化的 workflow 模板来源。
3. 逐步把“数据录入”“Bug 修复”“审计”映射为模板工作流。
4. 后续再评估是否需要修改或弱化 `ugc-prototype-builder` 的产品定位。

## Completion Gate（监察者模式）

监察者模式默认不是全局常开能力，而是**显式启用模式**：只有当老板明确说出“开检查”“检查模式”“开监察”“监察模式”等触发口令时，系统才进入该模式。

在未显式启用时，系统仍可保留普通的 checkpoint / resume / blocker 机制，但不得套用监察者模式的额外后置裁决、持续健康监控、或更强的里程碑通知语义。

监察者模式不再定义为前置路由器，也不等于任何“定时发 `continue`”恢复脚本。

它应位于执行器之后，作为每轮执行完成后的本地裁决层：

1. 执行器先产出结构化结果包
2. Completion Gate 判断 `continue | finish`
3. `continue` 生成内部下一步指令并写 continue record
4. `finish` 生成用户可见总结，并包含 continue 轨迹摘要

### Completion Gate 输入

- `task_goal`
- `step_result`
- `validation`
- `blockers`
- `has_explicit_next_step`
- `candidate_next_step`
- `draft_user_message`
- `evidence_refs`

### Completion Gate 输出

#### continue

- `decision=continue`
- `reason`
- `next_instruction`
- `archive=true`
- `should_notify_user=false`

#### finish

- `decision=finish`
- `reason`
- `user_message`
- `should_notify_user=true`
- `archive=optional`

### Execution Layer Hand-off

Completion Gate 之前的执行层至少需要接收以下裁决字段：

- `normalized_intent`
- `action_mode`
- `preferred_executor`
- `requires_preflight`
- `checkpoint_policy`
- `report_policy`

这意味着整体分层应为：

1. **Hard Rules**：确定性规则层，负责生产部署、外部发信、目录边界、版本完整性等硬拦截
2. **Local Model Layer**：负责意图归一化、歧义解释、裁决摘要、候选执行器选择
3. **Execution Layer**：负责真正调用 ACP / exec / workflow / ClawFlow / delivery nodes

### False-active / Watcher Recovery Policy

`false-active` 不是“进程还活着但我感觉不对”的模糊状态，而是一个**基于证据的健康判定结果**。首版策略应尽量简单、可解释、可恢复：

#### 1. 健康信号来源

每个 `WorkflowRun` 至少维护三类健康信号：

- `checkpointHeartbeatAt`：最近一次 checkpoint 写入时间
- `artifactHeartbeatAt`：最近一次新产物落盘/索引时间
- `executorHeartbeatAt`：执行器最近一次明确存活心跳或状态回报时间

允许模板按节点类型声明期望信号，例如：

- 审计 / 脚本节点：优先依赖 `checkpointHeartbeatAt`
- E2E / 长测节点：同时依赖 `artifactHeartbeatAt` 与 `executorHeartbeatAt`
- 等待用户决策节点：只要状态为 `waiting-decision`，就不参与 false-active 判定

#### 2. 判定分层

首版不要直接二元化为“活着 / 死了”，而是走三段：

1. `active`：在阈值窗口内持续收到至少一种有效健康信号
2. `idle`：当前无新进展，但仍未越过 false-active 阈值；适合展示“暂无新产物，继续观察”
3. `false-active`：超过阈值窗口，且没有 checkpoint、没有新产物、也没有执行器心跳

也就是说，`idle` 是观察态，`false-active` 才是需要恢复动作的异常态。

#### 3. 阈值策略

首版采用“模板默认值 + 节点可覆盖”的轻量策略，而不是复杂自学习：

- 默认 `idleAfterMs`：5 分钟
- 默认 `falseActiveAfterMs`：15 分钟
- 长 E2E / build / external automation 节点可上调到 20~30 分钟
- 高频短任务节点可下调到 2~5 分钟

阈值必须写进 `checkpoint_policy`，避免 watcher 和执行器各自猜一套。

#### 4. 恢复动作

一旦进入 `false-active`，系统必须生成明确恢复建议，而不是只改一个状态灯：

- `resume-from-last-checkpoint`
- `rerun-current-node`
- `mark-blocked`
- `request-human-review`

是否自动恢复，取决于节点声明的 `retryPolicy` 与副作用等级：

- **可重入、无外部副作用**的节点，可以自动尝试一次恢复
- **涉及部署、发信、PR、merge、外部写操作**的节点，不得自动重试，只能升级为 blocker / human review

#### 5. 与监察者模式的边界

false-active 监测能力本身可以作为底层运行时能力存在；但只有在老板显式开启“检查/监察模式”时，系统才应主动加强：

- 更频繁的 watcher 巡检
- 更积极的里程碑通知
- Completion Gate 后的持续恢复跟踪

未开启监察者模式时，系统可以记录 false-active 候选并在工作台展示，但不应默认升级为强打扰式监督流程。

#### 6. 最小数据契约

为避免前后端、执行器、watcher 各讲各话，`checkpoint_policy` 至少应包含：

- `idleAfterMs`
- `falseActiveAfterMs`
- `expectedSignals[]`
- `autoResumeAllowed`
- `maxAutoResumeAttempts`
- `recoveryActions[]`

而每次健康判定结果至少应落出：

- `healthState`
- `healthReason`
- `lastHealthyAt`
- `missingSignals[]`
- `recommendedRecoveryAction`

### Continue Record

每次 `continue` 都必须留下结构化记录，至少包含：

- 时间戳
- 当前目标
- 本轮执行摘要
- 裁决原因
- 下一步内部指令
- 证据引用

这些记录既用于恢复，也必须在最终 `finish` 总结时被压缩成过程摘要回传给用户。

### 与旧 Kiro auto-continue 的关系

旧的 Kiro auto-continue / window-title monitor 文档与脚本，只解决“输入 continue 恢复会话”的历史问题，不再被视为监察者模式本体。

保留价值的是：

- checkpoint / resume 思路
- false-active 判定
- 长任务健康语义

需要清理或归档的是：

- 把定时发 `continue` 当作 watcher / supervisor 的入口
- 继续在 README / CLAUDE / package scripts 中暴露这些旧入口

## Open Questions

- 远程 GitHub 仓库接入首版是否直接支持，还是先限制为本地仓库与固定模板仓库。
- ArtifactBundle 首版落点是对象存储、数据库索引还是文件系统索引。
- 自动 merge 默认是否只支持非保护分支，受保护分支是否统一降级为 PR/建议交付。
- DecisionRecord 与 WorkflowRun 是直接绑定单次消息，还是允许一个 run 聚合多个源消息。
