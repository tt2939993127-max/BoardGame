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

### Decision: 多工作树并行必须成为首版能力

这个工作台的直接使用者包含仓库维护者本人，因此不能假设“一次只做一条任务”。首版就应支持：

- 一个仓库下同时存在多个任务会话
- 每个任务会话绑定一个独立 worktree
- 每个 worktree 拥有独立运行时、端口、日志和产物
- 用户可以从网页任务看板切换不同 worktree 的执行状态

这样才能同时推进“新游戏接入”“Bug 修复”“数据录入”等任务，而不互相污染。

### Decision: 服务运行时会话必须是一等对象

工作台不能只会“改代码”和“跑测试”，还必须支持用户手动验收。因此需要独立的 `DevRuntimeSession`：

- 绑定到某个 `RepoSession`
- 支持启动 / 查询 / 停止
- 返回前端地址、API 地址、游戏服务地址与健康状态
- 在网页上显示运行日志

首版优先复用现有脚本能力：

- 完整开发服务：`npm run dev`
- 轻量开发服务：`npm run dev:lite`

工作台不应要求用户回到终端手动起服。

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

### Decision: 手动测试不是旁路，而是工作流内显式阶段

对于新建游戏、数据录入、复杂功能开发等任务，工作台应允许在自动步骤完成后进入“启动服务并手动测试”阶段：

1. 系统自动启动开发服务
2. 工作台展示访问入口与日志
3. 用户确认是否通过手测
4. 通过后再进入 E2E、PR 或 merge

这样可以避免“自动流程已经改完，但用户还得自己回终端起服务验证”的割裂体验。

## Core Objects

### RepoSession

- 仓库来源：clone / import
- 本地根目录
- 工作分支 / 隔离目录
- gameId / 任务类型 / 当前 workflow

### WorktreeTask

- 任务 id
- 绑定的 `RepoSession`
- worktree 根目录
- 分支名
- 当前 workflow run
- 运行时会话列表
- 产物索引

### WorkflowTemplate

- 模板 id
- 适用任务类型
- 固定节点序列
- 可选分支节点
- 默认门禁规则

### WorkflowRun

- 当前运行状态
- 已完成节点
- 阻塞节点
- 可恢复检查点
- 关联日志与产物

### DecisionRequest

- 决策项列表
- 默认建议值
- 来源节点
- 必答/可跳过标记

### ArtifactBundle

- E2E 截图
- 证据文档
- 测试摘要
- 关键日志
- diff 摘要
- PR / merge 结果

### DevRuntimeSession

- 绑定仓库会话与当前 workflow run
- 绑定具体 `WorktreeTask`
- 启动模式：`dev` / `dev:lite`
- 访问地址与端口
- 健康检查状态
- 启动日志与停止时间

## Task Board Model

工作台首页不应只有“创建任务”按钮，还应有任务看板：

- 按 worktree 列出所有活动任务
- 显示任务类型、分支、当前步骤、阻塞状态、服务状态
- 支持一键进入某任务的执行详情
- 支持查看哪些任务已经完成、暂停或可归档

## First Release Flows

### Flow A: 新建游戏

1. 用户输入需求与素材
2. 系统创建 `RepoSession`
3. 系统选择“新建游戏”模板
4. 汇总决策批次
5. 按 `create-new-game` skill 拆分节点推进
6. 自动启动开发服务供用户手测
7. 用户确认后继续自动测试与截图
8. 生成 `ArtifactBundle`
9. 进入 commit / PR / merge 门禁

### Flow B: 数据录入

1. 用户输入需求与图集/图片路径
2. 系统识别目标游戏与素材类型
3. 决策批次确认命名策略、Wiki/可信站点对照与上传方式
4. 自动完成 intake、压缩、上传、审计
5. 启动服务供用户手测素材呈现
6. 执行 E2E 并收集截图
7. 生成 `ArtifactBundle`
8. 进入 commit / PR / merge

### Flow C: Bug 修复

1. 用户输入问题描述
2. 系统导入目标目录并建立 `RepoSession`
3. 自动复现、定位、修复
4. 启动服务供用户手测修复结果
5. 跑回归与 E2E
6. 回传截图、日志、diff
7. 进入 commit / PR / merge

## Open Source Inspirations

以下开源项目值得主动参考，但不应照搬：

- **OpenHands**：参考其“SDK + CLI + Local GUI + Cloud”四层产品结构，以及面向软件开发任务的工作区执行模式。  
  链接：<https://github.com/OpenHands/OpenHands>
- **Flowise**：参考其可视化 agent / workflow 构建体验，以及 `server + ui + components` 的工作台分层。  
  链接：<https://github.com/FlowiseAI/Flowise>
- **n8n**：参考其执行记录、可视化编排、模板库、自托管和技术团队友好的流程产品化方式。  
  链接：<https://github.com/n8n-io/n8n>
- **Activepieces**：参考其 approval / human input / 非技术用户友好的工作流 builder 体验。  
  链接：<https://github.com/activepieces/activepieces>
- **LangGraph**：参考其 durable execution 与 interrupt / resume 模型，用于工作流暂停、恢复与人工决策节点。  
  链接：<https://docs.langchain.com/oss/javascript/langgraph/durable-execution>  
  链接：<https://docs.langchain.com/oss/javascript/langgraph/interrupts>
- **Temporal**：参考其“持久化工作流 + Web UI + CLI”模式，用于后端编排层而不是前台 builder。  
  链接：<https://github.com/temporalio/temporal>
- **Dagu**：参考其 local-first、Web UI、低运维开销的工作流运行器思路。  
  链接：<https://github.com/dagu-org/dagu>

这些项目可分别提供：

- 工作台界面参考
- 执行记录与状态持久化参考
- 人工审批节点参考
- 自托管与运行时隔离参考

但本项目的核心差异是：执行对象不是通用 SaaS 自动化，而是**本地仓库、worktree、测试、截图、PR 与 merge**。

## Borrowing Rules

参考成熟项目时，采用以下裁剪原则：

1. **前台交互优先借鉴 `OpenHands + Flowise + n8n`**
   - 借鉴任务看板、执行日志、工作区入口、节点状态可视化。
   - 不照搬其通用 agent chat 或通用 SaaS 自动化布局。
2. **人工审批节点优先借鉴 `Activepieces + LangGraph interrupt`**
   - 借鉴 approval / human input / interrupt-resume 机制。
   - 本项目的审批项必须落到“素材处理、对照源、手测确认、是否推进 merge”。
3. **后端编排优先借鉴 `LangGraph + Temporal + Dagu`**
   - 借鉴持久化执行、恢复检查点、Web UI 运行记录、本地优先执行器。
   - 但最终执行对象必须是 `RepoSession / WorktreeTask / DevRuntimeSession / ArtifactBundle`。
4. **不追求通用平台化优先于交付闭环**
   - 这些项目很多是通用自动化平台。
   - 本项目首要目标是把“需求 -> 本地服务 -> 手测 -> E2E 截图 -> PR/merge”做通。

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
- 手动测试阶段是否允许用户直接在网页点击“重启服务”“切换 `dev/dev:lite`”“复制访问地址”。
- worktree 的默认命名、归档和清理策略是否要暴露给用户配置，还是只提供安全默认值。
