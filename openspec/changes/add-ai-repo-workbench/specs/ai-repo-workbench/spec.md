## ADDED Requirements

### Requirement: 工作台 SHALL 以仓库会话作为执行起点

系统 SHALL 提供“新建游戏”和“导入本地目录”两种仓库会话入口，并要求后续工作流、测试、截图、PR 与 merge 全部绑定到同一仓库会话。

#### Scenario: 新建游戏仓库会话
- **WHEN** 用户在工作台选择“新建游戏”
- **THEN** 系统 MUST 从配置的仓库模板拉取到本地隔离工作目录
- **AND** 为本次任务创建新的执行分支或等价隔离执行上下文

#### Scenario: 导入本地目录仓库会话
- **WHEN** 用户在工作台选择“导入游戏”并指定本地目录
- **THEN** 系统 MUST 扫描该目录的项目结构与仓库状态
- **AND** 将该目录绑定为本次工作流的唯一执行根目录

### Requirement: 工作台 SHALL 提供基于 skill 的模板工作流

系统 SHALL 提供与项目 skill 对齐的模板工作流，而不是只提供无约束聊天入口。

#### Scenario: 选择任务模板
- **WHEN** 用户在工作台选择“新建游戏”“数据录入”“功能开发”“Bug 修复”或“审计”
- **THEN** 系统 MUST 加载对应的模板工作流
- **AND** 该模板 MUST 预置固定的执行节点、决策节点与门禁节点

#### Scenario: create-new-game skill 被映射为模板
- **WHEN** 用户选择“新建游戏”模板
- **THEN** 系统 MUST 按 `create-new-game` skill 的前置确认、阶段推进与验收门禁组织工作流
- **AND** 不得把该流程退化为单轮提示词生成

### Requirement: 用户输入 SHALL 最小化并以决策批次补足歧义

系统 SHALL 允许用户以“需求 + 素材”为主要输入启动工作流，并把模糊项汇总成结构化决策批次，而不是持续碎片化追问。

#### Scenario: 最小输入启动
- **WHEN** 用户只提供需求描述与图片/路径等素材
- **THEN** 系统 MUST 先尝试推断适用工作流与默认参数
- **AND** 仅在关键事实缺失时创建待确认决策批次

#### Scenario: 决策批次汇总
- **WHEN** 系统在运行中发现多个待确认项
- **THEN** 系统 MUST 将这些问题汇总到同一个决策卡片或批次中展示
- **AND** 典型决策项 MUST 支持图片处理方式、Wiki 对照、可信网站、命名策略等结构化选项

### Requirement: 工作台 SHALL 可视化展示执行过程

系统 SHALL 在网页中持续展示工作流步骤状态、关键日志、变更摘要与当前阻塞点，使用户可以理解执行过程而不必反复催促 AI。

#### Scenario: 实时步骤状态
- **WHEN** 工作流运行中
- **THEN** 系统 MUST 显示每个节点的状态（待执行、进行中、待确认、已完成、失败）
- **AND** 当前节点的输入、输出摘要与日志 MUST 可查看

#### Scenario: 阻塞原因可见
- **WHEN** 工作流因人工决策、测试失败或执行错误而暂停
- **THEN** 系统 MUST 显示明确的阻塞节点、阻塞原因与可继续动作

### Requirement: 工作台 SHALL 回传结构化产物而不是只返回文本

系统 SHALL 为每次工作流生成结构化产物包 `ArtifactBundle`，用于网页查看、审计和最终交付。

#### Scenario: 产物包生成
- **WHEN** 工作流达到阶段性完成或最终完成
- **THEN** 系统 MUST 生成包含日志摘要、关键 diff、测试结果和证据索引的产物包
- **AND** 网页 MUST 能查看这些产物而不是只显示一段文本总结

### Requirement: 最终交付 MUST 包含 E2E 截图与人工观察结论

系统 MUST 将端到端截图视为工作台的重要交付产物，并要求截图与对应观察结论回传到网页。

#### Scenario: 工作流完成后回传截图
- **WHEN** 工作流模板要求进行端到端验证
- **THEN** 系统 MUST 执行对应 E2E 测试并收集关键截图
- **AND** 将截图路径、缩略预览与证据摘要回传到网页工作台

#### Scenario: 截图不能只作为附件存在
- **WHEN** E2E 截图已生成
- **THEN** 系统 MUST 为每张关键截图附带至少一条人工观察结论或等价审核结论
- **AND** 不得仅以“测试通过”替代截图验收结果

### Requirement: 模板工作流 SHALL 支持从执行到交付的全链路推进

系统 SHALL 允许模板工作流覆盖从实现、上传、审计、测试到提交交付的完整链路，而不是只做到代码修改。

#### Scenario: 数据录入模板全链路推进
- **WHEN** 用户启动数据录入类工作流
- **THEN** 系统 MUST 支持按模板顺序推进数据录入、资源上传、审计、E2E、提交与 PR
- **AND** 仅在前置门禁通过后才能进入下一步

#### Scenario: 自动推进到 PR / merge
- **WHEN** 工作流模板声明允许自动提交交付
- **THEN** 系统 MAY 自动执行 commit、创建 PR、触发 merge
- **AND** 在任一门禁失败时 MUST 停止推进

### Requirement: 仓库自动化操作 MUST 受隔离与门禁约束

系统 MUST 对分支、目录、提交、PR、merge 施加明确的隔离与门禁约束，避免工作流自动化污染非目标工作区。

#### Scenario: 执行目录隔离
- **WHEN** 工作流需要写入代码或资源
- **THEN** 系统 MUST 仅在当前仓库会话绑定的目标目录内执行
- **AND** 不得隐式写入未绑定的其他项目目录

#### Scenario: merge 前门禁
- **WHEN** 工作流尝试自动 merge
- **THEN** 系统 MUST 先确认模板要求的审计、测试、截图证据与 PR 状态全部通过
- **AND** 任一门禁未满足时不得自动 merge

### Requirement: 工作流运行 SHALL 以结构化节点执行与展示

系统 SHALL 将工作流拆分为结构化节点，并在运行时保留节点级状态、输入输出摘要与失败语义，而不是只展示一条聊天记录。

#### Scenario: 节点状态可追踪
- **WHEN** 任一模板工作流开始执行
- **THEN** 系统 MUST 为每个节点分配稳定标识与节点类型
- **AND** 网页 MUST 能查看节点级状态、输入摘要、输出摘要与失败原因

#### Scenario: 节点类型受约束
- **WHEN** 模板定义工作流节点
- **THEN** 节点类型 MUST 受限于 `input`、`automation`、`decision`、`gate`、`artifact`、`delivery`
- **AND** `delivery` 节点不得与普通 `automation` 节点混淆

### Requirement: 决策请求 MUST 以批次形式可恢复

系统 MUST 将同一阶段产生的模糊项聚合为结构化 `DecisionRequest`，并支持中断后恢复，不得因为页面刷新或 agent 重连而丢失待确认项。

#### Scenario: 同阶段多项歧义聚合
- **WHEN** 同一阶段出现多个待确认问题
- **THEN** 系统 MUST 生成单个 `DecisionRequest` 批次承载这些问题
- **AND** 每个问题 MUST 提供来源节点、默认建议值与是否阻塞主链路的标记

#### Scenario: 决策批次可恢复
- **WHEN** 工作台页面刷新、执行器重启或会话暂时中断
- **THEN** 系统 MUST 重新展示未完成的 `DecisionRequest`
- **AND** 不得重复生成语义等价但标识不同的决策批次

### Requirement: 工作流运行 MUST 支持 checkpoint 与恢复

系统 MUST 为长任务和可中断任务保存 checkpoint，使运行状态可恢复、可审计、可重新附着。

#### Scenario: 节点完成后写 checkpoint
- **WHEN** 节点完成、失败、等待决策或 gate 产出结论
- **THEN** 系统 MUST 写入新的 checkpoint
- **AND** checkpoint MUST 包含当前节点、下一步动作、关键产物索引与最近错误摘要

#### Scenario: 从最近 checkpoint 恢复
- **WHEN** 用户重新打开工作台或执行器重新附着到既有运行
- **THEN** 系统 MUST 从最近 checkpoint 恢复运行视图
- **AND** 用户 MUST 能看到该运行是“继续执行”“等待决策”还是“失败待处理”

#### Scenario: checkpoint 区分 false-active
- **WHEN** 长任务长时间没有新 checkpoint、没有新产物也没有健康心跳
- **THEN** 系统 MUST 将该运行标记为 `false-active` 候选而不是继续显示为正常运行
- **AND** 恢复界面 MUST 提供恢复、重试或升级为 blocker 的后续动作

### Requirement: 监察者模式 MUST 作为 post-run Completion Gate 工作

系统 MUST 将监察者模式定义为每轮执行结果之后的后置裁决层，而不是前置路由器或定时 `continue` 恢复器。

#### Scenario: 执行结果触发 continue
- **WHEN** 当前目标尚未达成且存在明确下一步
- **THEN** Completion Gate MUST 输出 `continue`
- **AND** 系统 MUST 生成内部 `next_instruction` 而不打扰用户

#### Scenario: 自然收口触发 finish
- **WHEN** 任务达到自然收口、出现真实阻塞或需要用户决策
- **THEN** Completion Gate MUST 输出 `finish`
- **AND** 系统 MUST 生成面向用户的结果总结

### Requirement: Continue Record MUST 留档并进入最终总结

系统 MUST 为每次 `continue` 写入结构化留档，并在最终 `finish` 时把这些过程记录压缩进用户可见总结。

#### Scenario: continue 留档
- **WHEN** Completion Gate 输出 `continue`
- **THEN** 系统 MUST 记录本轮执行摘要、裁决原因、下一步指令与证据引用
- **AND** 这些记录 MUST 与当前 `WorkflowRun` 关联

#### Scenario: finish 汇总 continue 历史
- **WHEN** Completion Gate 输出 `finish`
- **THEN** 用户可见总结 MUST 包含最终结果与 continue 过程摘要
- **AND** 不得只返回最后一轮结果而丢失中间推进轨迹

### Requirement: 进入执行层前 MUST 生成 DecisionRecord

系统 MUST 在用户意图进入执行层之前生成结构化 `DecisionRecord`，用于承载规范化意图、风险判断、执行偏好和门禁命中结果。

#### Scenario: 用户消息被规范化
- **WHEN** 用户提交新的仓库任务、修复请求、交付请求或部署请求
- **THEN** 系统 MUST 先生成 `DecisionRecord`
- **AND** 其中 MUST 包含 `normalizedIntent`、`actionMode`、`riskLevel`、`preferredExecutor` 与 `reportPolicy`

#### Scenario: 硬规则命中导致阻塞
- **WHEN** 生产部署前置检查、目录边界、版本完整性或外部发信等硬规则被命中
- **THEN** `DecisionRecord` MUST 记录 `ruleHits` 与 `blockReasons`
- **AND** 系统 MUST 在阻塞解除前禁止把该请求直接下发给执行器

### Requirement: ArtifactBundle MUST 同时保存原始证据与网页摘要

系统 MUST 将执行环境产物整理为 `ArtifactBundle`，同时保存原始文件索引与网页可浏览摘要，避免只有卡片没有原始证据，或只有文件没有人类可读结论。

#### Scenario: 截图产物可追溯
- **WHEN** 工作流生成关键 E2E 截图
- **THEN** 系统 MUST 保存截图原始路径、来源节点、时间戳与观察结论
- **AND** 网页 MUST 能查看缩略图并跳转到原始证据

#### Scenario: 产物缺失导致 gate 失败
- **WHEN** 模板要求截图、日志或测试摘要，但 `ArtifactBundle` 缺少对应证据
- **THEN** 后续 gate MUST 判定未通过
- **AND** 工作台 MUST 显示缺失的是哪类证据而不是只显示笼统失败

### Requirement: 交付动作 SHALL 显式声明上限并支持安全降级

系统 SHALL 让每个模板显式声明其自动交付上限（仅产物 / commit / PR / merge），并在权限或分支策略不允许时安全降级。

#### Scenario: 模板只允许到 PR
- **WHEN** 某模板声明自动交付上限为 `PR`
- **THEN** 系统 MAY 自动 commit 并创建 PR
- **AND** 即使后续门禁通过也不得继续自动 merge

#### Scenario: 受保护分支触发降级
- **WHEN** 仓库策略、分支保护或权限限制禁止自动 merge
- **THEN** 系统 MUST 降级为输出 PR 链接与待办说明
- **AND** 不得将该运行标记为“已 merge 完成”

### Requirement: 执行层 hand-off MUST 保留裁决语义

系统 MUST 在 Local Model / Hard Rules 完成裁决后，以结构化 hand-off 把执行语义传给真正的执行层，而不是只传一段自由文本。

#### Scenario: 裁决结果传给执行器
- **WHEN** `DecisionRecord` 已完成并允许进入执行层
- **THEN** 系统 MUST 向执行器传递至少 `normalized_intent`、`action_mode`、`preferred_executor`、`requires_preflight`、`checkpoint_policy` 与 `report_policy`
- **AND** 执行器 MUST 以这些字段为边界推进，而不是重新自由解释原始消息

#### Scenario: 需要 preflight 的任务不能直接执行
- **WHEN** hand-off 中 `requires_preflight=true`
- **THEN** 执行器 MUST 先完成对应 preflight 节点或检查
- **AND** 不得跳过前置核验直接进入部署、merge 或其他高风险动作
