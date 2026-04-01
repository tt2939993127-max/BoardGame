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

## Open Questions

- 工作台首版是否要求支持远程 GitHub 仓库，还是先只支持本地仓库与固定模板仓库。
- E2E 截图回传是落对象存储、数据库还是文件系统索引。
- 自动 merge 的默认策略是只支持非保护分支，还是支持受保护分支下的 PR merge。
