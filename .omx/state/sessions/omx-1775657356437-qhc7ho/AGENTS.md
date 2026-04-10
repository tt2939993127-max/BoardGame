## Global Rules



- Always respond in 中文。

- 不使用 git 回滚/撤销历史的操作（例如 `git reset`、`git revert`、强制 `git checkout` 到旧提交）。如确需撤销，请先征得我确认，并优先给出最小风险方案。

- 当我说长期计划时，指的是用`C:\Users\zhuagenbao\.codex\skills\planning-with-files\SKILL.md`

- 改代码和做规划之前，如果项目根目录有agents的话记得读取

- 使用子 agent 处理代码分析、代码设计、方案设计、重构、实现、修复、测试或其他与改代码直接相关的任务时，必须显式使用与当前主 agent 相同的模型配置：`gpt-5.4` + `high`。不要降级到更小模型，也不要改用其他模型。

- 涉及卸载、删除、清理本地程序、模型、缓存或其他数据前，必须先核实目标对象与实际占用关系；如果用户说“已经没了”“不用管”或表述可能存在歧义，不得自行推断到其他程序或数据，必须先明确确认后再执行删除。



- 当我明确说“OpenClaw 拉 Codex”“用 `/acp spawn`”“让 OpenClaw 连接 Codex”或语义等价的表达时，默认按 ACP Agents / `/acp spawn` 路线理解并直接执行，不再追问“走 `acpx` 还是 `/acp spawn`”。涉及 OpenClaw ACP 时，先区分 `openclaw acp`、`acpx` 与 `/acp spawn` 的角色；只有在本地命令、配置、权限或环境缺失导致无法继续时，才说明阻塞点并给出最小补救步骤。



<!-- context7 -->

Use the `ctx7` CLI to fetch current documentation whenever the user asks about a library, framework, SDK, API, CLI tool, or cloud service -- even well-known ones like React, Next.js, Prisma, Express, Tailwind, Django, or Spring Boot. This includes API syntax, configuration, version migration, library-specific debugging, setup instructions, and CLI tool usage. Use even when you think you know the answer -- your training data may not reflect recent changes. Prefer this over web search for library docs.



Do not use for: refactoring, writing scripts from scratch, debugging business logic, code review, or general programming concepts.



## Steps



1. Resolve library: `npx ctx7@latest library <name> "<user's question>"`

2. Pick the best match (ID format: `/org/project`) by: exact name match, description relevance, code snippet count, source reputation (High/Medium preferred), and benchmark score (higher is better). If results don't look right, try alternate names or queries (e.g., "next.js" not "nextjs", or rephrase the question)

3. Fetch docs: `npx ctx7@latest docs <libraryId> "<user's question>"`

4. Answer using the fetched documentation



You MUST call `library` first to get a valid ID unless the user provides one directly in `/org/project` format. Use the user's full question as the query -- specific and detailed queries return better results than vague single words. Do not run more than 3 commands per question. Do not include sensitive information (API keys, passwords, credentials) in queries.



For version-specific docs, use `/org/project/version` from the `library` output (e.g., `/vercel/next.js/v14.3.0`).



If a command fails with a quota error, inform the user and suggest `npx ctx7@latest login` or setting `CONTEXT7_API_KEY` env var for higher limits. Do not silently fall back to training data.

<!-- context7 -->

<!-- OPENSPEC:START -->
# OpenSpec Instructions

These instructions are for AI assistants working in this project.

Always open `@/openspec/AGENTS.md` when the request:
- Mentions planning or proposals (words like proposal, spec, change, plan)
- Introduces new capabilities, breaking changes, architecture shifts, or big performance/security work
- Sounds ambiguous and you need the authoritative spec before coding

Use `@/openspec/AGENTS.md` to learn:
- How to create and apply change proposals
- Spec format and conventions
- Project structure and guidelines

Keep this managed block so 'openspec update' can refresh the instructions.

<!-- OPENSPEC:END -->

# 🤖 AI 开发助手指令文档 (AGENTS.md)

> 本文档定义 AI 编程助手在本项目中的行为规范、开发流程和质量标准。
> **坚持"强制优先、结果导向、可审计"，所有流程需可追溯。**
> **以当前对话为主，当我说继续指的都是当前对话的任务，除非指明否则不关心其他对话的修改**

### 规划与交接文件（强制）

#### plan / Plan with Files 术语定义（强制）

- **当用户说 `plan` 时，默认指 `planning-with-files` 这套规划工作方式 / 效果。**
- **Plan with Files 产出的正式计划文档只能放在一处：仓库根目录 `task_plan.md`。**
- `findings.md` / `progress.md` 仅允许记录事实与进度，**不得承载第二份 plan**。
- `temp/` 目录下禁止再放新的正式 plan、resume plan、progress plan；历史遗留文件只按临时材料/旧产物看待，**不得继续作为当前正式计划入口**。
- **禁止凭个人理解把 plan 分散到多个位置。** 只要属于 Plan with Files 这套流程的新任务、新子任务、新 blocker、新结论，都必须回填到 `task_plan.md`。
- 若未来需要调整唯一落点，必须先更新本节规范，再改执行位置；在此之前一律以 `task_plan.md` 为准。

- **默认禁用**：默认情况下不主动启用 `planning-with-files`；但满足下方“单一复杂任务默认启用”条件时，视为例外。
- **单一复杂任务默认启用**：如果当前对话明显是在推进一个单一的复杂任务，且预期需要持续记录阶段、发现、阻塞或跨轮进度，那么即使用户没有单独说 `plan`，也默认启用 `planning-with-files`，维护 `task_plan.md`、`findings.md`、`progress.md`。
- **已被其他任务占用时不得抢占**：如果仓库根目录现有的 `task_plan.md`、`findings.md`、`progress.md` 明显正在服务另一个未完成任务，则当前任务**不得**默认接管或混写这套文件；此时应改为在对话中汇报进度，或等待用户明确指示是否切换/接管。
- **新工作树独立任务优先视为可启用**：如果当前会话运行在新建的 `git worktree` / 独立工作树，且该工作树明显服务于当前对话的独立任务，通常可直接视为满足“单一复杂任务默认启用”条件。
- **用户一旦明确要求停用**：必须立即停止继续维护这套规划文件；该要求优先级高于上述所有默认启用条件。后续进度直接在对话中汇报，除非用户再次明确要求恢复。

#### Codex 多子代理并行模式（强制）

- **现状更新**：Codex 现已支持多 Agent / 多子代理并行；因此在满足下列条件时，允许把一个复杂任务拆成多个并行执行槽位，而不是强制单线程串行。
- **允许并行的典型场景**：
  - 多个子任务之间**代码改动面天然隔离**（不同 worktree、不同目录、不同游戏、不同文件簇）。
  - 任务属于**批量但彼此独立**的工作，如多条互不冲突的 E2E rewrite、多个互不共享代码面的 review/fix、多个可独立验证的文档/数据修订。
  - 能为每个子代理明确指定**独立 cwd / worktree / 分支 / 进度文件 / 验证命令**，避免“都在干活但说不清谁改了什么”。
- **默认仍应串行的场景**：
  - 同一个游戏/同一条功能链的多个子任务会频繁改到**同一批文件**，或需要共享未提交状态才能继续。
  - 任务依赖**单一共享基础设施**（例如共享 E2E 单 worker 端口、共享 dev server、共享测试账号、共享浏览器态），且尚未为每个子任务隔离资源。
  - 当前目标本质上是**一个需要持续收敛的复杂问题**（如单条顽固 bug、单条交互链路排障），拆子代理只会制造更多上下文同步成本。
  - 用户明确要求“先集中在一个 worktree/一个分支处理整批问题”，或已有根规范要求默认收敛到单 worktree。
- **启用并行前必须同时满足**：
  - 已判断子任务之间的改动面和验证资源**互不冲突**，或已显式做隔离（独立端口 / 独立 worktree / 独立分支）。
  - 每个子代理都有独立的**计划/进度落点**（至少一个 `temp/<task>-progress.md` 或等价证据文件），且能区分“已派出”和“已有产出”。
  - 主代理能够在汇报中明确说明：**谁负责什么、当前证据是什么、哪条已完成、哪条仍只是已派出**。
- **并行执行要求（强制）**：
  - 默认一个子代理只负责一个清晰边界的子任务；禁止让多个子代理同时写同一组关键文件。
  - 涉及 E2E/服务启动时，必须优先使用**隔离端口 / 隔离 worker 资源**；不能让多个子代理默认抢 `6173/6174/20000/21000` 这类共享资源。
  - 若任何一条子代理缺少新的 progress 时间戳、新 diff、新验证结果或新截图路径，则只能汇报为**已派出/待证明产出**，不得说成“还在持续干活”。
  - 若并行后出现资源互撞、工作树脏改互相污染或验证串扰，必须立即降回串行或重新分配隔离资源，不能硬顶。
- **汇报口径（强制）**：
  - 可以说“已并行派出 N 条子任务”，但只有在拿到**新 diff / 新验证结果 / 新截图 / 新证据文件**后，才可以说对应子代理“正在产生有效进展”或“已完成”。
  - 禁止把系统提示、空轮询结果、仅进程存活、仅 session still running，当作子代理真实产出的证据。

### 详细规范子文档（触发时强制阅读）

> 以下子文档包含各专项的完整规范与示例。**当任务涉及对应领域时，必须先阅读相关子文档再动手**，不得跳过。
> **项目内 skill 位置（强制）**：`BoardGame` 的项目专用 skill 一律放在 `./.windsurf/skills/`。凡是只服务本项目的流程、验收、审查规则，都按这个目录维护。
> **通用规范定义（强制）**：根 `AGENTS.md` 与 `docs/ai-rules/` 默认是“所有游戏通用规范”，只能约束流程、方法、验证和文档要求，不能把某个游戏当前任务里的局部字段命名、卡牌结构或专用抓取源直接写成全局默认。游戏专属口径必须落到该游戏自己的 `rule/` 文档或专项规范里。
> **根规范作用域标注（强制）**：根 `AGENTS.md` 允许出现游戏专属条目，但标题或正文必须显式写明适用游戏/模块/触发条件；只要条目里出现具体游戏名、具体抓取源、具体字段结构，就不得再被解释成“所有游戏默认规则”。

- `docs/ai-rules/golden-rules.md` — React 渲染错误、白屏、函数未定义、高频交互异常时必读。
- `docs/ai-rules/animation-effects.md` — 动画、特效、粒子效果时必读。
- `docs/ai-rules/asset-pipeline.md` — 图片或音频资源引用时必读。
- `docs/ai-rules/data-entry.md` — 按图片/规则书/Wiki/截图录入业务数据时必读。
- `docs/audio/add-audio.md` — 导入新音效素材时必读；配套参考 `docs/tools.md`、`docs/audio/audio-usage.md`、`docs/audio/audio-catalog.md`。
- `docs/ai-rules/engine-systems.md` — 引擎系统、框架层、游戏 `move/command` 时必读。
- `docs/ai-rules/undo-auto-advance.md` — 排查撤回后自动推进问题时必读；引擎层已统一处理，游戏层通常无需额外代码。
- **多 afterScoring 交互链式传递（通用方案）**：`_deferredPostScoringEvents` 必须沿交互链传递；引擎层已在 `InteractionSystem.resolveInteraction` 自动转交到下一个交互。游戏层只需在最后一个交互补发延迟事件，并在补发后立即清空，避免重复补发。详见 `evidence/smashup-multi-base-infinite-loop-fix.md` 和 `evidence/smashup-multi-base-duplicate-events-fix.md`。
- `docs/ai-rules/testing-audit.md` — 审计、审查、审核、核对描述与代码，或规划审计类 spec 时必读；以 D1-D49 通用缺陷维度为主框架。
- **审计证据文档强制落地（强制）**：凡是对外宣称“已审计/已审过/审计完成/已收口”的游戏、派系、模块或专项，必须在 `evidence/` 下存在对应审计文档；**无文档一律视为未审计**。文档至少要写明：审计范围、权威来源、逐项/逐卡结论、命中的审计维度、验证/测试证据、未覆盖风险。禁止只写“已核对正常”“已完成收口”这类不可复查结论。
- **审计文档修订义务（强制）**：如果后续发现某个“已审计”对象仍有漏项、误判或错误结论，必须回写原审计文档，明确标注哪条旧结论失效、为什么失效、对应修复和新增测试是什么；禁止保留旧文档继续充当“已收口”的证明材料。
- `docs/testing-best-practices.md` — 编写测试或测试失败时必读；配套参考 `docs/automated-testing.md`。
- `docs/ai-rules/ui-ux.md` — 任何 UI 改动都必读。
- `docs/architecture/ui-dual-platform-architecture.md` — 双端 UI 架构、页面壳层分层、共享组件跨网页/App 服务时必读。
- `docs/ai-rules/global-systems.md` — 使用或修改全局 Context（Toast/Modal/音频/教学/认证/光标）时必读。
- `docs/ai-rules/doc-index.md` — **不确定该读哪个文档时必读**。按场景查找需要阅读的文档。
- `docs/temp-files-management.md` — **创建临时文件或清理根目录时必读**。含临时文件分类规则、目录结构、.gitignore 规则、开发规范。
- `docs/git-merge-checklist.md` — 执行 `git merge` 前必读并完成预检查。
- `.windsurf/skills/adapt-game-mobile/SKILL.md` — 给现有游戏做移动端适配时必读。
- `.windsurf/skills/create-new-game/SKILL.md` — 创建/添加新游戏时必读，且必须先开 `feat/game-<gameId>` 分支。
- `docs/deploy.md` — 部署、构建产物、环境变量注入、线上/本地差异、CDN/R2 资源问题时必读。
  - **生产部署操作规范（强制）**：生产环境更新必须使用 `bash scripts/deploy/deploy-image.sh update`（基于 `docker-compose.prod.yml`）。**禁止在生产服务器上直接运行 `docker compose up -d`**（会使用默认的 `docker-compose.yml`，端口映射和环境变量与生产不同）。排查生产问题时，必须先读 `docs/deploy.md` 了解部署架构，禁止凭猜测给出服务器操作命令。
  - **Android OTA 包体规范（强制）**：Android OTA 只允许承载 H5 bundle 与轻量静态文件，**禁止**把 `public/assets/i18n/**`、大图集、大卡图或其他应走 R2 / 游戏包链路的资源打进 OTA zip。发布 Android OTA 时必须使用 `scripts/mobile/publish-android-ota.mjs` 这条受门禁保护的链路；若产物异常超过轻量包体阈值（当前脚本门禁 `20MB`）必须直接失败，禁止继续发布。

---

## 📋 角色与背景

你是一位**资深全栈游戏开发工程师**，专精 React 19 + TypeScript、自研游戏引擎（DomainCore + Pipeline + Systems）、现代化 UI/UX、AI 驱动开发。
项目是 AI 驱动的现代化桌游平台，核心解决"桌游教学"与"轻量级联机"。包含用户系统（JWT）、游戏大厅、状态机驱动的游戏核心、分步教学系统。`UGC` 相关能力处于待移除状态，不再作为默认活跃模块考虑。

### 测试编写规范（强制）

> **核心原则：E2E 测试验证 UI 交互，单元测试验证业务逻辑，绝不混淆**
> **默认禁止无校验交付**：除非用户明确指明“跳过验证 / 不跑测试 / 直接提交 / 直接 push / 无校验交付”或等价口径，否则不得在未完成与本次改动相匹配的校验前提交、push、宣称完成或要求用户验收。不能因为改动小、赶进度、门禁卡住、已有类似经验，擅自省略验证。
> **提交前必须先跑 `npm run i18n:check`**：只要本轮准备提交，无论是否改到 locale 文件、文案、E2E、页面组件或默认文案，都必须先执行一次 `npm run i18n:check`；未跑不得提交，发现缺 key 必须先补齐，禁止在 pre-push 才临时找补。

#### E2E 测试强制要求（UI 交互必须用 E2E）
1. **UI 交互必须用 E2E**：必须使用三板斧（新框架 + 专用测试模式 + 状态注入）；UI 交互、多玩家协作、动画特效都不能用单元测试代替。
2. **必须实际运行并通过**：AI 编写后立即运行 E2E；单文件/单用例优先用 `npm run test:e2e:ci:file -- <测试文件名> "<用例名>"`，整文件复跑用 `npm run test:e2e:ci -- <测试文件名>`，禁止交给用户。
3. **必须实际打开截图验收**：优先看 `test-results/evidence-screenshots/`，失败用例再补看 `test-results/playwright-artifacts/`；验收标准不是“页面出现了”，而是“本轮问题位点已按要求修好”。
3.1. **只要最终回复里提到“已跑 E2E / E2E 通过”就必须附截图绝对路径**：至少提供 1 张本轮实际核对过的关键截图完整绝对路径；没有路径不得以 E2E 结果作为收口口径。
4. **看图必须直击问题位点**：不能只扫整页，必须逐项核对用户这轮指出的具体区域、具体现象和具体目标；如果是展开类/浮层类问题，主截图必须同时包含触发控件、展开内容完整边界、关键参照物。主截图收不全或看不清边界细节时，默认“未证明修复”，必须补局部放大图。
5. **截图必须来自真实问题场景和真实业务链路**：游戏内问题优先保留从真实入口进入后的完整链路截图；禁止用大厅页、独立预览页、资源诊断页、兄弟入口截图或自造代理场景，代替问题本身已修复的证据。
6. **资源缺失不等于跳过验收**：外部 R2/CDN 资源未稳定渲染时，必须明确写出“资源未渲染”，并继续检查布局、相对大小、层级、遮挡、溢出、对齐，不能把白卡面直接当成布局失败，也不能借此跳过看图。
7. **必须先看图再写证据结论**：必须创建 `evidence/<功能名>-e2e-test.md`；每张关键截图至少写 1-3 条肉眼观察结论，直接回应本轮需求点和用户指出的问题，禁止只写“正常 / UI 正确 / 看起来没问题”。
7.1. **证据文档必须显式写“我实际看到什么”和“是否达到验收标准”**：每张关键截图都必须单独写明肉眼看到的具体现象，以及该截图对应的问题位点是否已经达到本轮验收标准；禁止只复述断言、组件名、阶段名或“理论上应该如此”。
7.2. **看到不达标就必须写“不达标”**：如果截图里出现手牌缺失、控件偏移、被遮挡、只剩边角、主元素跑到一侧、状态不完整等现象，即使 E2E 断言通过，也必须在证据文档里明确写“未达到验收标准 / 不能据此收口”，并继续修图、修实现或修测试。
8. **出现新异常或链路不真都不得收口**：即使断言通过，只要截图里还有新的视觉异常、遮挡、空白块、层级错误、异常位移，或 E2E 没覆盖真实触发链路，就不能宣称完成；先加日志定位，再审查调用链，最后修实现或修测试。

#### 测试文件管理（强制）
1. **禁止新建测试文件**：先搜索现有测试，在最相关文件里补充用例。
2. **典型测试优先**：同类型风险通常只保留正常流程 1 个用例 + 边界条件 1-2 个关键场景，禁止同一种交互模式反复堆叠 E2E。
3. **已有测试只有真实覆盖才可复用**：现有同类测试若没覆盖本次改动的核心路径、关键断言和风险点，不能因为“仓库里已有类似测试”就跳过。

#### 测试实现验证（强制）
1. **先验实现再验测试**：先检查验证逻辑、执行逻辑、触发时机，再跑相关测试确认没破坏功能。
2. **测试失败先怀疑实现**：优先修实现或定位链路问题，不要先改测试去迎合当前结果。

#### 测试用例设计（强制）
1. **必须使用真实场景**：测试用例要模拟真实游戏流程，不能构造不可能状态。
2. **断言必须打在核心行为上**：断言要直接证明功能是否成立，不要只验证边缘表象。

### 游戏专属补充（仅对应游戏触发）

#### 游戏名称映射（强制）
| gameId | 英文名 | 中文名 |
|--------|--------|--------|
| `smashup` | Smash Up | 大杀四方 |
| `dicethrone` | Dice Throne | 王权骰铸 |
| `summonerwars` | Summoner Wars | 召唤师战争 |
| `tictactoe` | Tic Tac Toe | 井字棋 |

#### 大杀四方 Wiki 爬虫规范（仅 `smashup` 相关任务触发）

> **涉及大杀四方时，禁止凭记忆。若用户已提供并明确指定清晰的本地图片/截图/扫描件为本轮真相源，则本地图片优先；Wiki 爬虫仅作为缺图、看不清、或用户明确要求交叉核对时的补充来源。**

**触发场景**：数据录入、数据核对、审计检查、效果描述查询

**工具**：
- `scripts/scrape-wiki-with-descriptions.mjs` — 抓取 Wiki 数据
- `scripts/final-wiki-code-comparison.mjs` — 对比代码与 Wiki

**流程**：
1. `node scripts/scrape-wiki-with-descriptions.mjs` 抓取数据
2. `node scripts/final-wiki-code-comparison.mjs` 生成差异报告
3. 根据报告用编辑工具 / 补丁修复

**注意**：
- 若用户明确指定“以本地图片/截图为准”，则先看图，只有图片不足以确定结论时才允许补跑 Wiki
- Wiki 用弯引号（`'`），代码用直引号（`'`），对比时需考虑编码差异
- Wiki 可能有勘误重复（如 Saucy Wench vs Cut Lass），代码只保留勘误版
- 数据可缓存，除非用户要求"重新抓取"

---

## ⚡ 核心行为准则 (MUST)

### 0. 面向百游戏设计规范（强制）
> **每次设计/重构前必须自检：这样能不能支持未来 100 个游戏？**

- **显式 > 隐式**：配置显式声明，不依赖命名推断或隐式规则。AI 能直接看到配置，不需要"记住"规则。
- **智能默认 + 可覆盖**：框架提供通用默认值（覆盖 90% 场景），游戏层可覆盖特殊需求（10% 场景）。
- **单一真实来源**：每个配置只在一个地方定义，不跨文件查找，不重复声明。
- **类型安全**：编译期检查，防止配置错误。运行时验证作为补充，不作为主要手段。
- **最小化游戏层代码**：新增游戏的样板代码 ≤ 20 行。框架层提供辅助函数自动生成重复逻辑。
- **框架可进化**：框架层可以添加新功能/新默认值，游戏层无需修改。
- **自检问题**：
  - 新增游戏时，这个系统需要写多少行代码？（目标：≤ 20 行）
  - 配置是显式的还是隐式的？（AI 能直接看到吗？）
  - 框架提供了默认值吗？（90% 场景能用默认吗？）
  - 类型系统能捕获错误吗？（编译期还是运行期？）
  - 第 100 个游戏的代码量和第 1 个一样少吗？

### 1. 沟通与开发原则

#### 1.1 需求理解与体验目标（强制）
- **先校准目的，不机械执行手段**：处理需求、review comment、bug 反馈前，先判断三件事：用户真正想达到的结果、最反感的结果、当前要求里哪些是手段哪些是目的。禁止把最近一句话机械放大为最终需求。
- **用户说是正常路径，就按正常路径排查**：当用户明确说“正常操作也会触发”“不是误点/乱点”时，必须沿正常用户路径做全链路分析，禁止先改写成误操作或边界误触。
- **用户报 bug 先当 bug 处理**：默认这是实际体验问题，禁止先用“可能只是动画 / 正常表现 / 你看错了”给问题降级；若要否定用户观察，必须先给出可复查证据。
- **禁止把空间问题曲解成时序/性能问题**：当用户描述的是“右偏 / 左偏 / 太宽 / 太窄 / 位置不对 / 对不齐 / 遮挡 / 比例异常”这类空间现象时，默认按布局、坐标系、锚点、目标盒子、适配条件排查；没有证据前，禁止擅自改写成“延迟 / 节流 / 动画滞后 / 性能问题”。
- **需求有歧义先澄清**：尤其是 UI/UX 场景下的“太宽 / 太挤 / 像桌面端 / 差不多 / 参考这个效果”，必须先确认比较基准和验收口径。
- **先解根因，再动表象**：不要把用户举的现象词直接当最终需求；交付标准是解决体验问题，不是只改表面症状。
- **UI 表现问题不偷换成布局枚举题**：像“密度 / 间距 / 视觉关系 / 像桌面端”这类反馈，默认聚焦密度、占位和比例，不要擅自改写成“2 列还是 3 列”。
- **禁止默认套移动端宽松模板**：用户明确要“更紧凑 / 更像桌面端”时，优先围绕目标视觉密度做方案，而不是默认扩大触控间距和留白。
- **手段与目的分离**：位置、层级、入口、展示方式、是否并排/同屏，默认都是服务更高层目标的手段；如果按字面做完用户仍可能合理不满意，说明方案不合格。
- **最正确方案优先**：给多个方案时必须明确“最正确方案”；评判优先级是架构正确性 > 可维护性 > 一致性 > 风险/成本，不能把“改动最小”当首要理由。若存在唯一最正确方案且不依赖用户偏好，可直接执行。

#### 1.2 页面、平台与共享边界（强制）
- **App / 网页边界必须显式隔离**：凡是影响用户可见 UI、自动副作用、原生插件调用、更新检查、返回行为的逻辑，必须通过真实原生运行时门禁，而不是只靠构建信号。
- **页面语义必须隔离**：首页/大厅、游戏页、App 壳层页、后台、开发工具页的文案命名空间、加载态、空状态、错误态、fallback、骨架屏、悬浮提示必须按场景隔离。
- **共享 Loading/Fallback 禁止带业务默认文案**：通用组件默认值只能是中性语义，或要求调用方显式传入；如果默认值含具体业务语义，就不能再当通用组件。
- **原生运行时探测必须统一**：判断是否在 Android/iOS 壳运行时的逻辑必须复用统一探测层，禁止页面、组件、hook、service 各写一套。
- **App 专属启动副作用必须在入口前门禁**：`main.tsx`、`App.tsx`、Provider、Manager、bootstrap 里的壳层逻辑必须在进入函数前完成平台门禁，不能把 App 逻辑挂进网页默认启动路径再内部早退。
- **共享改动必须反查未修改页面**：只要改了 `App.tsx`、路由级 fallback、全局 Modal/Toast/Loading、Provider、运行时探测、共享 hook、共享文案 key 或其他多页面入口逻辑，交付前必须确认：首页不会出现游戏页语义；游戏页不会出现首页/大厅语义；网页端不会出现 App 壳语义；后台/工具页不会继承主业务流程文案。
- **UGC 默认忽略**：`UGC`、Builder、RuntimeView、Sandbox 及相关入口默认视为待移除模块；除非本轮明确点名，否则不要为了“顺手兼容”把它们拉进方案和回归口径。

#### 1.3 代码、规则与实现边界（强制）
- **中文优先**：所有交互、UI 文本、代码注释、设计文档默认使用中文；`git commit -m` 也默认中文。
- **路径表达有主次**：对用户汇报时，截图、测试截图、测试产物必须给绝对路径；普通源码路径只在需要精确定位时给绝对路径。
- **DRY + 单一真实来源**：禁止复制粘贴、禁止多处重复定义同一配置/描述，稳定常量走常量表，技能/卡牌逻辑优先走注册表与配置驱动。
- **重构默认清理遗留**：默认允许破坏性变更并拒绝向后兼容；过时代码、接口、文档应尽量同步清理，不能留占位实现。
- **实现面向扩展**：任何未来可能被 buff / 共享 / 光环等机制修改的值，从第一天就通过统一查询入口访问，禁止直接读底层字段。
- **字段准入要收紧**：布局/契约结构只允许进入稳定、可复用、跨模块共享的数据，禁止把回放数据、UI 状态、调试缓存塞进结构层。
- **命名必须统一裁决**：出现多个命名时，必须给唯一裁决并全链路统一，不能多头并存。
- **临时方案必须登记债务**：允许临时实现，但必须写清 TODO、回填逻辑、清理触发条件。
- **样式任务不碰逻辑**：目标是样式/视觉优化时，严禁顺手改业务逻辑或交互编排；若样式问题只能通过改入口顺序、默认主按钮、菜单路径、面板展开方向等方式解决，必须先停下来征得确认。
- **目录和游戏边界严格区分**：修改/引用前必须核对完整路径和 `gameId`；当我说“规则”，默认指该游戏目录下 `rule/` 中的 Markdown。改规则/机制前必须先读规则文档；若规则文档不完整或与代码不一致，应查官方规则书或 Wiki，并同步更新文档。

#### 1.4 分支、协作与 Git 纪律（强制）
- **开工先查分支职责**：开始任何实质工作前，必须确认当前分支/工作树与当前任务职责一致。若当前分支明显服务于另一任务线、另一游戏、另一 PR 或另一 worktree，禁止直接在此继续改。
- **分支和 worktree 有固定职责**：新分支必须从主分支创建；仓库根目录默认只承担 `main` 主工作树职责；未获确认时禁止自行创建 `git worktree`。
- **并发改动默认存在**：默认假设工作区里始终有其他 AI 或用户并发改动，禁止把“工作区干净”当作前提；看到陌生改动时，不得擅自回滚、清空、隐藏或覆盖。
- **Git 回退和 stash 默认禁止**：未经用户明确许可，禁止执行 `git stash*`、历史回滚、`git restore`、`git checkout --` 等会影响现有工作区状态的命令；修 bug 必须通过编辑工具直接改代码。
- **merge / push 要走项目门禁**：`git merge` 前必须读 `docs/git-merge-checklist.md`；`--no-verify` 默认禁止，仅在文档/配置/样式且无逻辑变更，或用户明确要求无校验推进时才可例外。
- **Push 阻塞先分辨来源**：如果 `pre-push` 或强制校验失败来自工作区未提交改动而不是待推送提交本身，不得直接卡死整次 push；应先定位来源，再决定是否隔离。
- **命令超时统一按 30 分钟上限**：shell/脚本/测试/推送命令默认最长 30 分钟，用户明确要求 `push` 时不要先用短超时试错。
- **文件移动/复制优先安全方案**：禁止 `robocopy /MOVE`；先复制、再验证、最后按需删除源文件。
- **PR 默认要走到终态**：涉及 GitHub PR 的审查、修复、推送、合并时，默认完成标准不是“代码已推到分支”，而是原始 PR 已 merge 或明确记录 blocker；同时必须登记原问题、额外回归、规则口径变化三类信息。

#### 1.5 排查与证据链（修 bug 时强制）
- **用户反馈默认就是 bug**：先全链路排查，禁止先猜“可能正常”。
- **看截图前先搜代码**：先定位相关实现，再确认理论渲染与数据来源，最后拿截图对照代码预期；禁止看图就猜、不搜就改。
- **调用链逐层检查三件事**：存在性、契约、返回值。不得只查“我改的那一层”，也不得看到一个定义就假设唯一。
- **代码审查优先于日志**：先审查调用链、early return、数据流和消费链；代码审查仍找不到问题，才在关键决策点补日志。
- **回归问题先找最后正常证据**：优先用 `git log`、`git show`、历史截图、evidence、测试产物定位最后正常版本；找到后默认优先恢复历史正确行为，而不是另造新方案。
- **方案前先列事实 / 未知 / 假设**：证据不足时不得直接改代码试错，也不得靠放开限制、扩大白名单、关闭校验来“绕过去”。
- **必要时沿完整数据流排查**：按写入-消费时间线、`API → Context → UI` 或其他真实消费链路一路查到底。
- **修完单点必须横向扩审**：基于根因关键词、状态字段、事件类型、调用模式，用 `rg` 扫同模块 / 同游戏 / 同类共享实现，确认是否有同类问题。
- **先做根因分级，再决定修法**：区分数据/录入缺陷、单点实现缺陷、共享抽象缺陷、架构/时序/系统边界缺陷；后两类默认优先改共享抽象或边界，不继续堆补丁。若只能临时止血，必须登记技术债。
- **连续两次未解决就升级模式**：切换成“假设列表 → 验证方法 → 多方案对比”；总结里至少写清调用链检查结果、根因分类、扩审结果，以及为何选择局部修复或重构。

## AI 执行基线（强制）
- **先搜代码、读规则、看真相源，再改实现**：禁止凭记忆改代码。
- **用户报 bug 先做调用链审查，再决定是否加日志**。
- **React 渲染错误 / 白屏 / 高频交互异常先看 `docs/ai-rules/golden-rules.md`**。
- **动画 / 特效先看 `docs/ai-rules/animation-effects.md`；UI / 双端 / 布局先看 `docs/ai-rules/ui-ux.md` 与 `docs/architecture/ui-dual-platform-architecture.md`；引擎 / 领域 / move / command 先看 `docs/ai-rules/engine-systems.md`；资源 / 图集 / 音频 / CDN 先看 `docs/ai-rules/asset-pipeline.md`、`docs/audio/add-audio.md`、`docs/tools.md`。**

## React 核心规范（强制）

> **遇到 React 渲染错误、白屏、函数未定义、高频交互异常时，必须先阅读 `docs/ai-rules/golden-rules.md`**

- **React Hooks**：禁止在条件语句或 return 之后调用 Hooks。
- **弹窗**：禁止 `window.prompt/alert/location.reload`，统一用 Modal + 状态更新。
- **CSS 布局**：`overflow` 会被父级覆盖；改滚动或裁剪问题前，必须先检查父容器链路。`flex-col` 容器中带 `overflow-y-auto` 的滚动子元素必须加 `min-h-0`。
- **层级问题先证伪再改**：先用 `elementsFromPoint` 证明谁在最上层，再改 `z-index`；Portal 外层必须显式设层级。
- **WebSocket / 端口**：`vite.config.ts` 的 `hmr` 严禁自定义端口；端口占用用 `npm run clean:ports` 或 `npm run test:e2e:cleanup` 清理，禁止 `taskkill /F /IM node.exe`。
- **回归类 bug 先 diff**：修“之前正常现在不行”的问题时，必须先 `git show` / `git diff` 找变更点。

### 动画/动效（核心规则）

> **开发/修改动画或特效时必须先阅读 `docs/ai-rules/animation-effects.md`**

- 粒子 / 多阶段特效优先 Canvas 2D；流体 / 逐像素特效优先 WebGL Shader；简单形变优先 `framer-motion`；普通 UI 过渡优先 CSS transition。
- 禁止 `transition-all`；优先 `transform/opacity`；`backdrop-filter` 保持静态。
- 新增特效前先搜 `src/components/common/animations/`，优先复用。
- 棋盘层特效默认用俯视角物理（如 `gravity: 0`），全屏 UI 层例外。
- Canvas 尺寸用 `offsetWidth/offsetHeight`，不要用会受 `transform: scale()` 影响的 `getBoundingClientRect()`。

## 🛠️ 技术栈

React 19 + TypeScript / Vite 7 / Tailwind CSS 4 / framer-motion / Canvas 2D 粒子引擎 / i18next / howler / socket.io / Node.js (Koa + NestJS) / MongoDB (Docker) / Vitest + Playwright

### TypeScript 规范（强制）
- 禁止 `any`，优先 `unknown` + 类型守卫；框架边界例外必须注释说明。
- 游戏状态类型放 `src/games/<游戏名>/types.ts`，框架类型放 `src/core/types.ts`，引擎原语类型放 `src/engine/primitives/`，系统类型放 `src/engine/systems/`。
- 影响规则正确性的参数禁止声明成可选参数；应拆成“纯查询版本”和“依赖状态版本”两个函数。
- 所有命令分发通过 `dispatch(COMMANDS.XXX, payload)` 调用，禁止点号访问分发器私有结构。

### 文件修改与编码（强制）
- **修改前先验证**：先搜索相关代码，再读取目标代码确认假设，最后再改；禁止基于记忆或猜测改代码。
- **工具选择**：中文很多、改动大、逻辑复杂、多文件批量改时优先用 Node.js 脚本并显式 `utf-8` 读写；小范围单文件修改优先用编辑工具 / 补丁。PowerShell 默认只读。
- **UTF-8 规则**：读取含中文源码、规则、Markdown、plan 文件时，必须显式按 UTF-8 处理；终端乱码时要改用 Node / Python 显式 UTF-8 读取确认真实内容，不能拿乱码输出当补丁上下文。
- **修改后立即验证**：重新读取文件确认改动；对改动文件跑 `npx eslint <文件路径>`；必要时再补类型检查、单测或 E2E。
- **准备提交时追加 i18n 门禁**：只要要执行 `git commit`，提交前必须先跑 `npm run i18n:check`，不要把缺失 key 留到 `pre-push` 或 CI 才暴露。
- **失败即停**：验证失败后，先说明失败原因和文件状态，再继续；不要在同一问题上无穷叠补丁。

## 📂 项目目录结构（概要）

> 完整目录树见 `docs/project-map.md`
> **宏观图优先（强制）**：用户只说"功能/模块"时，先用目录树归类到正确层级，再搜索收敛到具体文件。

```
/ (repo root)
├── server.ts                      # 游戏服务入口（Koa + socket.io + GameTransportServer）
├── server/                        # 服务端共享模块
│   ├── logger.ts                  # 日志系统（Winston + 按日期轮转）
│   └── middleware/                # Koa 中间件
│       └── logging.ts             # HTTP 请求日志 + 错误处理
├── logs/                          # 日志文件目录（自动轮转，不提交到 git）
│   ├── app-YYYY-MM-DD.log         # 所有日志（保留 30 天）
│   └── error-YYYY-MM-DD.log       # 错误日志（保留 90 天）
├── src/
│   ├── pages/                    # 页面入口（Home/MatchRoom/LocalMatchRoom）
│   ├── components/               # 通用 UI 组件
│   │   └── game/framework/       # 跨游戏复用骨架
│   ├── contexts/                 # 全局状态注入（Auth/Audio/Modal/Undo/GameMode/Rematch）
│   ├── engine/                   # 引擎层（adapter/pipeline/systems/primitives）
│   ├── core/                     # 框架核心类型与资源加载
│   ├── games/                    # 具体游戏实现（按 gameId 隔离）
│   │   └── <gameId>/domain/      # 领域层
│   ├── lib/                      # 底层工具库（i18n/audio）
│   ├── services/                 # socket 通信封装
│   ├── hooks/                    # 通用 Hooks
│   └── ugc/                      # UGC 相关目录（待移除）
├── public/                       # 静态资源（含本地化 JSON）
├── docs/                         # 研发文档
│   └── logging-system.md         # 日志系统文档
├── e2e/                          # Playwright E2E 测试
└── openspec/                     # 变更规范与提案
```

### 关键文件速查

| 用途 | 路径 |
|------|------|
| 框架核心类型 | `src/core/types.ts` |
| 引擎类型（SystemState/GameOverResult） | `src/engine/types.ts` |
| 引擎管线（executePipeline） | `src/engine/pipeline.ts` |
| 引擎适配器（createGameEngine） | `src/engine/adapter.ts` |
| 引擎系统 | `src/engine/systems/` |
| 引擎原语模块 | `src/engine/primitives/` |
| 传输层服务端 | `src/engine/transport/server.ts` |
| 传输层客户端 | `src/engine/transport/client.ts` |
| 传输层 React 集成 | `src/engine/transport/react.tsx` |
| Board Props 契约 | `src/engine/transport/protocol.ts` |
| 乐观更新引擎 | `src/engine/transport/latency/optimisticEngine.ts` |
| 延迟优化类型 | `src/engine/transport/latency/types.ts` |
| 国际化入口 | `src/lib/i18n/` |
| 音频管理器 | `src/lib/audio/AudioManager.ts` |
| **日志系统** | **`server/logger.ts`**（生产日志，详见 `docs/logging-system.md`） |
| **日志中间件** | **`server/middleware/logging.ts`**（HTTP 请求日志 + 错误处理） |
| 游戏逻辑 | `src/games/<游戏名>/game.ts` |
| 游戏 UI | `src/games/<游戏名>/Board.tsx` |
| 领域 ID 常量表 | `src/games/<游戏名>/domain/ids.ts` |
| **游戏规则文档** | **`src/games/<游戏名>/rule/*.md`**（改规则/机制前必读） |
| 应用入口 | `src/App.tsx` |
| **光标主题系统** | **`src/core/cursor/`**（类型/注册表/偏好 Context/注入组件） |
| **游戏光标自注册** | **`src/games/<游戏名>/cursor.ts`** + `src/games/cursorRegistry.ts` |

---

## 🎯 设计原则（强制）

### 核心原则
- **DRY (Don't Repeat Yourself)**：相同逻辑只实现一次，通过函数/组件/配置复用。禁止复制粘贴代码。
- **KISS (Keep It Simple, Stupid)**：优先选择最简单的解决方案。复杂度必须有明确收益（性能/可维护性/扩展性）。
- **YAGNI (You Aren't Gonna Need It)**：只实现当前需要的功能，不做"未来可能用到"的预设计。扩展性通过抽象而非预实现。

### SOLID 原则
- **单一职责（SRP）**：一个类/函数只做一件事。`validate.ts` 只做校验，`execute.ts` 只做执行，`reduce.ts` 只做状态更新。
- **开闭原则（OCP）**：对扩展开放，对修改关闭。新增技能/卡牌不应修改 `validate.ts`/`execute.ts`，应通过注册表扩展。
- **里氏替换（LSP）**：子类型必须能替换父类型。所有 `AbilityDef` 必须符合相同接口，不得有特殊假设。
- **接口隔离（ISP）**：不强迫依赖不需要的接口。UI 组件只接收必要的 props，不传递整个 `state`。
- **依赖倒置（DIP）**：依赖抽象而非具体实现。游戏层依赖引擎接口（`createAbilityRegistry`），不依赖具体实现。

### 常用设计模式（强制）
- **注册表模式（Registry）**：技能/卡牌/事件处理器必须通过注册表管理，禁止 `switch-case` 硬编码。
  - ✅ `abilityRegistry.register(id, def)` + `abilityRegistry.get(id)`
  - ❌ `switch (abilityId) { case 'fireball': ... case 'heal': ... }`
- **工厂模式（Factory）**：复杂对象创建通过工厂函数，隐藏构造细节。
  - ✅ `createSimpleChoice(id, playerId, title, options)`
  - ❌ 手动构建 `{ type: 'choice', id, playerId, data: { ... } }`
- **策略模式（Strategy）**：算法/行为通过配置注入，不硬编码。
  - ✅ `AbilityDef` 中声明 `validation` / `effects` / `ui` 配置
  - ❌ 在 `validate.ts` 中为每个技能写独立验证逻辑
- **观察者模式（Observer）**：事件驱动架构，通过 `EventStreamSystem` 解耦。
  - ✅ `emit(event)` → 订阅者自动响应
  - ❌ 直接调用 UI 更新函数
- **组合优于继承**：优先用组合/配置而非类继承。
  - ✅ `{ ...baseAbility, effects: [...baseEffects, customEffect] }`
  - ❌ `class FireballAbility extends BaseAbility`

### 反模式清单（禁止）
- ❌ **God Object**：一个对象/文件包含过多职责（如 `game.ts` 超过 1000 行）
- ❌ **Magic Number/String**：硬编码数值/字符串，应用常量表（`domain/ids.ts`）
- ❌ **Copy-Paste Programming**：复制代码后微调，应提取公共函数
- ❌ **Premature Optimization**：在性能问题出现前优化，应先保证正确性
- ❌ **Feature Envy**：函数频繁访问其他对象的数据，应移到该对象内部
- ❌ **Shotgun Surgery**：一个改动需要修改多个文件，说明职责划分不清

---

## 引擎与框架（核心规则）

> **修改引擎/框架层代码或游戏 move/command 时必须先阅读 `docs/ai-rules/engine-systems.md`**

- **数据驱动优先**：规则/配置做成可枚举数据，引擎解析执行，避免分支硬编码。
- **数据结构完整性（强制）**：数据定义必须包含所有执行所需的字段，禁止在执行层"猜测"或"自动推断"缺失的关键信息。
  - ✅ 正确：`grantStatus: { statusId, value, target: 'opponent' }` — 目标显式声明
  - ❌ 错误：`grantStatus: { statusId, value }` + 执行层根据 category 猜测目标 — 数据不完整
  - **例外**：允许为向后兼容提供默认值（如 `target` 未指定时自动推断），但必须在类型注释中说明
  - **契约测试必须检查**：数据语义正确性（debuff 目标、buff 目标、数值范围），不只是结构完整性
- **领域 ID 常量表**：所有稳定 ID 在 `domain/ids.ts` 定义（`as const`），禁止字符串字面量。
- **三层模型**：`/core/ui/` 契约 → `/components/game/framework/` 骨架 → `/games/<gameId>/` 游戏层。
- **禁止框架层 import 游戏层**；游戏特化下沉到 `games/<gameId>/`。
- **动画表现与逻辑分离（强制）**：引擎层同步完成状态计算，表现层按动画节奏异步展示。数值属性（HP/damage/资源）必须经 `useVisualStateBuffer.get()` 中转渲染，禁止直接读 core 值。交互事件（技能确认框等）必须经 `useVisualSequenceGate` 延迟调度。详见 `docs/ai-rules/engine-systems.md`「动画表现与逻辑分离规范」节。
  - **日志层与动画层必须使用相同的数据源（强制）**：所有消费同一数据的层级（日志格式化、动画跳字、UI 显示）必须读取同一份权威数据，禁止各层重复实现伤害、护盾、扣减等计算，导致显示不一致。
- **特效/动画事件消费必须用 EventStreamSystem**，禁止用 LogSystem（刷新后重播历史）。**所有消费 EventStream 的 Hook/Effect 必须在首次挂载时跳过历史事件**（将消费指针推进到当前最新 entry.id），否则刷新后会重播。详见 `docs/ai-rules/engine-systems.md`「EventStreamSystem 使用规范」的两种强制模板和检查清单。
- **Move payload 必须包装为对象**，禁止传裸值；命令使用常量（`UNDO_COMMANDS.*`）。
- **新机制先查 `src/engine/primitives/` 或 `src/engine/systems/`** 是否已有能力，无则先在引擎层抽象。
- **新游戏能力系统必须使用 `engine/primitives/ability.ts`**：禁止自行实现能力注册表，必须使用 `createAbilityRegistry()` + `createAbilityExecutorRegistry()`。详见 `docs/ai-rules/engine-systems.md`「通用能力框架」节。
- **禁止技能系统硬编码（强制）**：
  - ❌ 禁止在 validate.ts 中用 switch-case 硬编码技能验证（每个技能一个 case）
  - ❌ 禁止在 UI 组件中用 if 语句硬编码技能按钮（每个技能一个 if）
  - ❌ 禁止在 execute.ts 中硬编码特定技能的逻辑（如 rapid_fire）
  - ✅ 正确做法：在 `AbilityDef` 中声明 `validation` 和 `ui` 配置，使用通用验证函数和自动按钮渲染
  - 详见 `docs/ai-rules/engine-systems.md`「技能系统反模式清单」节
- **技能定义单一数据源（强制）**：
  - **`AbilityDef`（或等效的能力定义对象）是技能的唯一真实来源**，包含 id、name、description、validation、effects、ui 等全部元数据。
  - ❌ 禁止在卡牌/单位配置中硬编码 `abilityText` 描述文本（与 `AbilityDef.description` 或 i18n 重复）。卡牌配置只保留 `abilities: ['ability_id']`（ID 引用数组），描述文本统一从 `abilityRegistry.get(id).description` 或 i18n key 获取。
  - ❌ 禁止同一技能的描述文本出现在 3 个以上位置（卡牌配置 `abilityText` + `AbilityDef.description` + i18n JSON = 三重冗余）。
  - ❌ 禁止 execute 层用 `switch (abilityId)` 巨型分发，必须使用 `AbilityExecutorRegistry` 或 `ActionHandlerRegistry` 注册模式。
  - ✅ 新增技能时只需：① 在 `abilities-*.ts` 添加 `AbilityDef` ② 在 `abilityResolver.ts` 注册执行器 ③ 在 i18n JSON 添加文案。不得修改 validate.ts、execute.ts、UI 组件。
- **状态/buff/debuff 必须使用 `engine/primitives/tags.ts`**：禁止自行实现 statusEffects / tempAbilities，使用 `createTagContainer()` + `addTag/removeTag/matchTags/tickDurations`。支持层级前缀匹配和层数/持续时间。
  - **例外边界**：结构化挂载关系数据不属于 TagContainer 目标；TagContainer 只处理状态、层数、持续时间这类标签型数据。
- **Custom Action categories 语义正确性（强制）**：注册 `registerCustomActionHandler` 时声明的 `categories` 必须与 handler 实际输出的事件类型一致。**核心规则：handler 产生 `DAMAGE_DEALT` → categories 必须包含 `'damage'`**（`playerAbilityHasDamage` 依赖此判定是否进入防御投掷阶段）。新增/修改 handler 后必须运行 `customaction-category-consistency.test.ts` 验证。详见 `docs/ai-rules/testing-audit.md`「元数据语义一致性审计」节。
- **数值修改管线必须使用 `engine/primitives/modifier.ts`**：禁止自行实现 DamageModifier / PowerModifierFn，使用 `createModifierStack()` + `addModifier/applyModifiers/tickModifiers`。
- **伤害计算管线必须使用 `engine/primitives/damageCalculation.ts`（新游戏强制）**：基于 `modifier.ts` 的专用包装器，提供自动收集修正 + 完整 breakdown。使用 `createDamageCalculation()` 生成 `DAMAGE_DEALT` 事件，禁止手动构建。详见 `docs/ai-rules/engine-systems.md` 和 `docs/damage-calculation-pipeline-migration-guide.md`。
- **ActionLog 伤害来源标注必须使用 `engine/primitives/actionLogHelpers.ts`（强制）**：禁止在游戏层手写 breakdown 构建逻辑。每个游戏实现一次 `DamageSourceResolver`（约 15 行），调用 `buildDamageBreakdownSegment`（有修改器明细）或 `buildDamageSourceAnnotation`（轻量来源标注）。详见 `docs/ai-rules/engine-systems.md`「ActionLogSystem 使用规范 → 伤害来源标注」节。
  - **Options Pattern 扩展（强制）**：引擎层扩展必须使用 Options Pattern（默认行为 + 可选覆盖），确保向后兼容。`buildDamageBreakdownSegment` 的 `options` 参数可选，老游戏代码不需要修改。新功能（如护盾自动渲染）通过 `options.renderShields` 覆盖默认行为。详见 `docs/bugs/engine-options-pattern-summary.md`。
- **可被 buff 修改的属性必须使用 `engine/primitives/attribute.ts`**：使用 `createAttributeSet()` + `addAttributeModifier/getCurrent`。与 `resources.ts` 互补。
- **面向百游戏设计（强制）**
  - **禁止在 core 中存放交互状态**：`pendingXxx` 等“等待玩家输入”状态必须用 `sys.interaction`（InteractionSystem），不得放在 core 上。
  - **禁止写桥接系统**：不得创建“游戏事件→创建 Prompt/Interaction→解决后转回游戏事件”的桥接系统，应在 execute 中直接调用 `createSimpleChoice()` / `createInteraction()`。
  - **commandTypes 只列业务命令**：系统命令（UNDO/CHEAT/FLOW/INTERACTION/RESPONSE_WINDOW/TUTORIAL/REMATCH）由 adapter 自动合并，禁止手动添加。
  - **ResponseWindowSystem 配置注入**：响应窗口的命令/事件白名单必须通过 `createResponseWindowSystem({ allowedCommands, responseAdvanceEvents })` 注入，禁止修改引擎文件。
  - **参考现有实现时先检查模式时效性**：仓库里的旧模式只能当兼容事实，不能直接当成新游戏范式。
- **领域建模前置审查（强制）**：数据录入完成后、领域实现开始前，必须完成领域概念建模（术语→事件映射）、决策点识别（强制/可选/无）、引擎能力缺口分析。禁止跳过建模直接写实现。详见 `docs/ai-rules/engine-systems.md`「领域建模前置审查」节。
- **游戏结束检测统一走 `sys.gameover`（强制）**：管线（`executePipeline`）在每次命令执行成功后自动调用 `domain.isGameOver()` 并将结果写入 `sys.gameover`。Board 组件必须读 `G.sys.gameover`，服务端读 `result.state.sys.gameover`。❌ 禁止读 `G.core.gameover`（core 上不存在该字段）、❌ 禁止读 `ctx.gameover`（已移除）。详见 `docs/ai-rules/engine-systems.md`「游戏结束检测」节。
- **传输层架构（强制）**：项目使用自研传输层（`GameTransportServer` + `GameTransportClient` + `GameProvider`/`LocalGameProvider`）。Board 组件 Props 为 `GameBoardProps`，不再有 `ctx` prop。新代码使用 `dispatch` 分发命令。详见 `docs/ai-rules/engine-systems.md`「传输层架构」节。

### 领域层编码规范（强制）
> **写任何游戏的 domain/ 代码时必须遵守**。目标：让第 100 个游戏的代码质量与第 1 个一样。

#### 动态选项生成（强制）
- **问题**：同时触发多个交互时，后续交互可能带着已失效的选项。
- **规则**：默认不自动刷新；需要刷新时显式声明。简单引用型选项用 `autoRefresh`，复杂过滤/多来源选项用 `optionsGenerator`。
- **参数位置**：`multi` 必须放在 `createSimpleChoice(..., config)` 的 `config` 对象里，不能散落到外层。

#### Reducer 必须结构共享（强制）
- `reduce(core, event)` 中**禁止 `JSON.parse(JSON.stringify())`**（全量深拷贝）。
- 正确做法：只 spread 变更路径。例：`{ ...core, players: { ...core.players, [pid]: { ...player, hp: player.hp - dmg } } }`。
- 嵌套超过 3 层时，提取 helper：`updatePlayer(core, pid, patch)` / `updateResource(player, resId, delta)`。
- 需要批量变更时可用 Immer（`produce`），但单字段更新优先 spread。

#### 文件结构默认拆分（强制）
> 原则：中等以上复杂度的游戏（命令数 ≥5 或有多阶段回合）从第一天就用拆分结构，不等超限。
- **types 默认拆分**：`core-types.ts`（状态接口）+ `commands.ts`（命令类型）+ `events.ts`（事件类型），`types.ts` 为 re-export barrel。仅当命令+事件总共 <10 个时允许合并在单文件。
- **game.ts 默认拆分**：FlowHooks → `domain/flowHooks.ts`，CheatModifier → `domain/cheatModifier.ts`。game.ts 只做组装。
- **Board.tsx 默认拆分**：业务 hooks → `hooks/`，子区域组件 → `ui/`。Board.tsx 只做布局组装。
- **reducer.ts / execute.ts**：当命令/事件类型超过 15 个时，按实体/子系统拆分到子目录，主文件只做分发。
- **统一底线**：无论是否默认拆分，任何单文件超过 1000 行必须立即拆分。

#### 目录结构规范（强制）
- **按子域分类建目录**：新增文件时按业务子域归入对应子目录，禁止平铺堆积在父目录。同一目录下同级文件不得超过 15 个（不含 index.ts/types.ts）。
- **子目录命名**：kebab-case，反映业务含义（`combat/`、`overlays/`、`cards/`），禁止 `misc/`、`utils/`、`new/` 等无意义名称。
- **拆分后保留 barrel**：父目录 `index.ts` 统一 re-export，消费方 import 路径不变。
- **嵌套深度上限 5 层**（从 `src/` 起算），超过优先扁平化。
- **已知超限目录**：`dicethrone/domain`、`dicethrone/ui`、`summonerwars/ui`。在这些目录新增文件时必须顺带拆分，禁止继续堆积。

#### 游戏内工具函数单一来源（强制）
- 每个游戏的 `domain/utils.ts` **从第一天就建立**，放置 `applyEvents`、`getOpponentId`、`updatePlayer` 等共享工具。
- 引擎层已提供的能力（如游戏模式判断）禁止在游戏层重新实现，应 import 引擎层导出。
- 禁止在 `game.ts`、`execute.ts`、`rules.ts` 中重复定义相同逻辑的辅助函数。

#### Core 状态准入（强制）
- **准入条件**：字段必须被 `reduce()` 消费，且影响 `validate()` / `execute()` / `isGameOver()` 的决策。
- **禁止放入 core 的**：纯 UI 展示状态（如 `lastPlayedCard`、`lastBonusDieRoll`）→ 应通过 EventStreamSystem 事件传递给 UI；交互等待状态（如 `pendingXxx`）→ 应使用 `sys.interaction`。
- **例外**：如果某个"展示"字段同时影响规则判定（如 `pendingAttack` 影响防御阶段流转），则允许放在 core，但必须注释说明其规则依赖。

#### 性能反模式清单（强制）
- ❌ `JSON.parse(JSON.stringify(state))` — 用结构共享替代
- ❌ reducer 内创建新数组/对象但内容未变 — 先检查是否需要变更再 spread
- ❌ `Array.filter().map()` 链式调用处理大数组 — 合并为单次 `reduce()` 遍历
- ❌ 在 `execute()` 中调用 `reduce()` 模拟状态推演超过 3 次 — 重构为事件后处理或 `postProcess`

### 模式差异（online/tutorial）（强制）

> **⚠️ 核心规定：项目默认全部使用联机模式（online），本地模式已废弃**

- **模式来源**：统一使用 `GameModeProvider` 注入 `mode`，写入 `window.__BG_GAME_MODE__`。
- **联机模式（online）**：严格校验，按玩家身份限制交互。**这是唯一支持的模式**。
- **教学模式（tutorial）**：走 `MatchRoom`，默认与联机一致。
- **本地模式（已废弃）**：所有游戏 `allowLocalMode=false`，不再支持本地模式。
- **开发和测试**：全部以联机模式为准，禁止依赖本地模式的全局变量（`window.__BG_DISPATCH__`/`window.__BG_STATE__`）。
- **E2E 测试**：必须使用 `setupOnlineMatch` 创建在线对局，通过调试面板（`readCoreState`/`applyCoreStateDirect`/`applyDiceValues`）注入状态。禁止使用 `page.goto('/play/<gameId>/local')`。
- **观战模式**：`playerID` 为 `null` 时，Board 组件应默认显示玩家 0 的视角（或当前回合玩家），确保 UI 正常渲染。

### i18n（强制）
- 通用文案 → `public/locales/{lang}/common.json`；游戏文案 → `game-<id>.json`。
- 新增文案必须同步 `zh-CN` 与 `en`；通用组件禁止引用 `game-*` namespace。

---

（核心规则）

> **新增/修改图片或音频资源引用时必须先阅读 `docs/ai-rules/asset-pipeline.md`**

- **所有图片必须压缩后使用**：用 `OptimizedImage` / `getOptimizedImageUrls`，路径不含 `compressed/`（自动补全）。
- **图片压缩规范（强制）**：
  - **生成与运行时**：未压缩先跑 `npm run assets:compress`；运行时统一走 `OptimizedImage` / `getOptimizedImageUrls`，路径不写 `compressed/`。
  - **统一链路优先**：图片组件、精灵图、3D 骰子、CSS background 精灵图都必须优先复用 `AssetLoader`、`OptimizedImage`、`CardPreview`、`getLocalizedImageUrls`、`getOptimizedImageUrls`；确需特殊渲染，也只能在统一链路上做最小封装。
  - **回归先查接线一致性**：图片从“之前正常”变成空白/错图/偶发失败时，先查是否偏离统一图片链路、是否引入组件内特判、是否绕过语言化/压缩/缓存逻辑，禁止继续叠加特例。
- **国际化资源架构（强制）**：
  - **资源落点**：当前图片资源统一落在 `public/assets/i18n/zh-CN/<gameId>/` 目录。
  - **代码行为**：`OptimizedImage` 和 `CardPreview` 会自动从 `i18next` 获取当前语言（`i18n.language`），无需手动传递 `locale` prop。路径会自动从 `<gameId>/images/foo.png` 转成 `i18n/<locale>/<gameId>/images/foo.png`。
  - **无需手动传递 locale（强制）**：所有使用 `OptimizedImage`/`CardPreview` 的地方，禁止手动传递 `locale` prop（除非测试或特殊场景需要覆盖）。组件会自动从 i18next 获取当前语言。
  - **图集加载最佳实践（强制）**：
    - **均匀网格**：使用 `registerLazyCardAtlasSource(id, { image, grid: { rows, cols } })`，尺寸从预加载缓存自动解析，零配置文件。
    - **不规则网格**：使用 `registerCardAtlasSource(id, { image, config })`，`config` 从静态 JSON import。
    - **注册时机**：模块顶层同步注册，禁止在 `useEffect` 中异步注册（消除首帧 shimmer）。
    - **核心原则**：图片资源需要国际化（路径包含 `/i18n/{locale}/`），图集配置文件不需要国际化。
  - **未来扩展**：英文版上线时，将英文图片放入 `i18n/en/<gameId>/`，代码无需修改。
  - **CDN 部署**：运行 `npm run assets:upload -- --sync` 同步到 CDN。
- **音频架构（强制）**：
  - **设计规范**：显式 > 隐式、智能默认 + 可覆盖、单一真实来源、类型安全
  - **事件定义**（`domain/events.ts`）：使用 `defineEvents()` 定义音频策略；`immediate` 事件必须写完整形式 `{ audio: 'immediate', sound: KEY }`，不能偷写成字符串。
  - **音效策略**：`'ui'`（本地交互）| `'immediate'`（即时反馈）| `'fx'`（动画驱动）| `'silent'`（无音效）
  - **feedbackResolver**：基础版 `createFeedbackResolver(EVENTS)`（1 行），高级版保留特殊逻辑 + 调用基础版（~30 行）
  - **禁止重复播放**：每个事件的音效只在一个地方播放（UI 层 / EventStream / FX 系统）
  - **百游戏标准**：新增游戏事件定义 ≤ 20 行，feedbackResolver 1 行或 ~30 行，UI 组件 0 行音效代码

---

## 🔄 标准工作流

### 代码质量检查（强制）
- **ESLint 检查（强制）**：修改 `.ts`/`.tsx` 文件后，必须运行 `npx eslint <修改的文件路径>` 确认 0 errors（warnings 可忽略）。存在 error 时必须立即修复再继续。
- **审查默认只做静态分析（强制）**：当用户要“检查/审查/看一下然后提交”，且当前改动对应功能在之前轮次已经完成过测试时，默认只做静态分析，不重复跑同类功能测试。最低要求是：代码改动跑 `eslint` 确认 0 errors；涉及 OpenSpec 变更时补跑 `openspec validate --all --strict --no-interactive`。理由必须按项目口径执行：已完成功能默认视为已测试过，且 `push` 后还会继续执行测试。
- **TypeScript 编译检查（推荐）**：大范围重构后运行 `npx tsc --noEmit` 确认无类型错误。
- **生产依赖验证（强制）**：修改 `server.ts`、`src/server/`、`src/engine/transport/server.ts` 的 import 或修改 `package.json` 的 dependencies 时，必须运行 `npm run check:prod-deps` 确认无幽灵依赖。**教训**：`nanoid` 未显式声明，靠 devDependencies 间接提升偶然可用，生产环境 `--omit=dev` 后直接崩溃。

### 验证测试（Playwright 优先）
- 详细规范见 `docs/automated-testing.md`。
- **工具**：Playwright E2E / Vitest / GameTestRunner / 引擎层审计工厂（`src/engine/testing/`）。
- **E2E 测试环境与工具（强制）**：
  - **环境依赖**：E2E 测试依赖前端开发服务器（Vite）、游戏服务器（game-server）、API 服务器（api-server）三个进程同时运行
  - **推荐工作流**：终端 1 运行 `npm run dev`，终端 2 运行 `npm run test:e2e`（开发模式）；或单终端运行 `npm run test:e2e:ci`（CI 模式）
  - **Fixture 使用（强制）**：新增 E2E 测试必须使用 `e2e/fixtures/index.ts` 提供的 fixture。使用 `import { test, expect } from './fixtures'` 替代 `@playwright/test`
  - **状态注入方案（强制）**：所有 E2E 测试必须使用状态注入方案，跳过前置步骤直接构造目标场景。详见 `docs/e2e-state-injection-guide.md`
  - **联机模式（强制）**：所有游戏 `allowLocalMode=false`，E2E 测试必须使用 `setupOnlineMatch` 创建在线对局，通过调试面板注入状态
  - **TestHarness 工具**：使用 `window.__BG_TEST_HARNESS__` 注入骰子结果、状态、命令
  - **测试失败排查**：详见 `docs/automated-testing.md`「E2E 测试环境依赖」节
- **E2E 测试必须由 AI 自主运行（强制）**：
  - **禁止交给用户手动运行**：AI 完成编写后必须立即运行。
  - **运行命令**：单文件/单用例优先 `npm run test:e2e:ci:file -- <测试文件名> "<用例名>"`；整文件运行用 `npm run test:e2e:ci -- <测试文件名>` 或 `npm run test:e2e -- <测试文件名>`。
  - **证据保留**：证据文档放 `evidence/`；主截图优先引用 `test-results/evidence-screenshots/`，失败排障再看 `test-results/playwright-artifacts/`。写证据前必须先实际查看截图，用户上传截图直接看对话附件。
  - **测试文件命名规范**：E2E 测试文件必须以 `.e2e.ts` 结尾
- **GameTestRunner 优先**：行为测试是最优先、最可靠的测试手段。审计工厂是补充，用于批量覆盖注册表引用完整性和交互链完整性
- **测试触发条件**：新增/修改业务逻辑、引擎代码、领域层代码、数据结构、API 接口、修复逻辑错误类 bug。不需要测试：纯样式、文案、文档、资源文件、格式化、重命名
- **测试命令**：`npm run test:e2e:ci`（CI 模式）、`npm run test:e2e:cleanup`（清理端口）
- **截图规范**：禁止硬编码路径，必须用 `testInfo.outputPath('name.png')`
- **禁止杀掉所有 Node.js 进程**：优先清理单个测试的端口，谨慎使用 `test:e2e:cleanup`
- **E2E 覆盖要求（强制）**：
  - 必须覆盖**不同交互类型**与**不同入口语义**的完整流程，不按卡牌数量机械铺满
  - 同类型交互只保留一个代表性端到端用例；只有当入口、控件形态、链路阶段、布局风险或跨系统协作明显不同，才允许新增第二条
  - 每种需要保留的端到端交互，至少要有 1 条“完整流程用例”：从真实 UI 入口进入，到最终结算完成，包含最终态断言，并保留 `resolved` / `after` 类截图之一
  - 若某条 E2E 只覆盖“交互出现”“可进入下一步”“中间态选择器可操作”，标题必须明确写成入口/中间态验证；**禁止**用“可消灭”“可移动”“已完成”“结算后”等完成态措辞夸大覆盖范围
  - 业务最终状态、事件顺序、边界分支优先下沉到 smoke / GameTestRunner；E2E 只保留对 UI 可操作性、真实链路、布局证据有独立价值的代表性流程
  - 删除或替换旧 E2E 后，必须同步清理或归档其稳定截图证据，避免历史产物伪装成“当前仍受该 E2E 覆盖”
- **静态审计**：新增游戏时根据特征选择引擎层审计工具，选型指南见 `docs/ai-rules/engine-systems.md`
- **描述→实现全链路审查**：新增技能/修复"没效果"bug/审查机制/重构消费链路/规划审计 spec 时必须执行，详见 `docs/ai-rules/testing-audit.md`
- **审计 Spec 必须覆盖 D1-D49**：规划审计类 spec 时必须逐条评估维度，包含静态检查和运行时行为测试
- **数据查询一致性审查**：新增修改/增强/共享类机制后，grep 原始字段访问，确认走统一查询入口
- **元数据语义一致性审查**：新增/修改 custom action handler 后，确认 `categories` 声明与实际输出一致
- **验证层有效性门控**：有代价的技能必须确保至少能产生一个有意义的效果
- **阶段结束技能时序对齐**："你可以"/"may" 技能必须返回 `{ halt: true }` 阻止阶段推进
- **测试必须验证状态变更**：事件发射 ≠ 状态生效，必须断言 reduce 后的最终状态
- **多系统协作测试**：必须同时断言所有相关系统的状态字段
---

## 🎨 UI/UX 规范（核心规则）

> **任何 UI 改动前都必须先阅读 `docs/ai-rules/ui-ux.md`**

- **双端默认视角（强制）**：现在默认按“网页 + App / 桌面 + 移动”双端并行设计。任何页面、共享组件、游戏 UI、交互方案在设计阶段都必须同时判断桌面端和移动端如何落地，**禁止**把移动端当作发布前再补的收尾项。
- **PC 仍是固定构图类权威基线（强制）**：对于棋盘、战区、固定栏位、几何关系明确的复杂游戏界面，桌面端仍是结构权威来源；移动端默认做条件化适配与同构缩放，不是另起一套手机稿。
- **manifest 决定“游戏是否支持”，不是“架构是否考虑移动”（强制）**：某个游戏可以通过 `mobileProfile` 显式声明 `none`/`tablet-only` 等能力边界；但共享页面层、壳层、组件层、交互层依然必须按可扩展双端架构设计，避免以后接移动端时重做整条链路。
- **移动端适配基线**：当前默认包含横屏建议、非游戏页竖屏自适应、双指缩放/拖拽平移和 `44px` 触控下限；详细规则见 `docs/mobile-adaptation.md`。
- **双端分层（强制）**：
  - 页面层统一负责路由、加载态、方向提示、对局根 `data-*` 属性和运行时终端门禁。
  - 壳层统一负责安全区、缩放舞台、顶部 rail / side dock / bottom rail；游戏 Board 不得各写一套移动外壳。
  - 交互层允许按设备改“触发方式”，但 `可用 / 已用 / 不可用 / 可选目标` 的真值来源必须与领域校验共用，不得桌面和移动各算一份。
  - App 壳专属能力必须继续通过统一运行时探测 helper 隔离，不能让网页端共享 UI 直接感知原生桥。
- **单位规范（强制）**：
  - 文本、按钮、表单、日志、普通 HUD：默认使用 `rem`，必要时配 `clamp()`，**禁止**再用裸 `vw` 作为主字号或主控件尺寸。
  - 固定构图类主布局：默认使用“`px` 设计尺寸 + 外层统一 `scale`”或 `aspect-ratio + %`，**禁止**再把裸 `vw` 当作主适配手段。
  - 触控命中区：使用 `px/rem` 下限（如 `44px`），不要跟 viewport 宽度一起漂。
  - `vw/vh` 只允许作为局部比例辅助单位、装饰偏移或历史桌面区域的过渡方案；一旦进入 `board-shell` / 双端同构主链路，优先迁移到统一缩放或 `rem/clamp`。
- **深度感分级**：重点区域毛玻璃+软阴影，高频更新区域禁止毛玻璃。
- **动态提示 UI 必须 `absolute/fixed`**，禁止占用布局空间。层级：提示 z-[100-150]，交互 z-[150-200]，Modal z-[200+]。
- **临时/瞬态 UI 不得挤压已有布局（强制）**：攻击修正徽章、buff 提示、倒计时标签等"出现/消失"的临时 UI 元素，必须使用 `absolute`/`fixed` 定位，禁止插入 flex/grid 正常流导致其他元素位移。
- **数据/逻辑/UI 分离**：UI 只负责展示与交互。
- **游戏 UI 设计系统**：`design-system/game-ui/MASTER.md`（通用）+ `design-system/styles/`（风格）。
- **新增 UI 元素必须配合现有风格（强制）**：即使只改一个文件，新增的按钮/面板/提示等 UI 元素必须复用同模块已有组件（如 `GameButton`）和现有样式变量，禁止手写不一致的原生样式。修 bug 和微调不受此约束。
- **游戏内 UI 组件单一来源（强制）**：同一类 UI 功能只允许一个主组件实现，所有场景复用该主组件；卡牌展示、选择、提示这类共享交互不得并行维护两套功能重叠实现。若某游戏已有既定主组件，就继续沿用，不要另起炉灶。详见 `docs/ai-rules/ui-ux.md` §1.1。
- **大规模 UI 改动**（≥3 组件文件 / 新增页面 / 全局风格调整）须先读设计系统，详见 `docs/ai-rules/ui-ux.md` §0。

<!-- OMX:RUNTIME:START -->
<session_context>
**Session:** omx-1775657356437-qhc7ho | 2026-04-08T14:09:16.517Z

**Codebase Map:**
  src/: App, main, vite-env.d
  src/api/: user-settings.test, custom-deck, layout, review, user-settings
  src/components/: ConfirmModal.test, EndgameOverlay.test, GameHUDChatPreview.test, ManifestGameThumbnail.test, ToastContext-dedupe.test, ToastItem.test, actionLogFormat.test, AccountSettingsModal, AdminGuard, AuthModal
  src/config/: games.config, server, toolRoutes
  src/contexts/: AudioContext, AuthContext, DebugContext, GameModeContext, MatchRoomExitContext, ModalStackContext, RematchContext, SocialContext, ToastContext, TutorialContext
  src/core/: AssetLoader, CriticalImageResolverRegistry, WarmPreloadScheduler, AssetLoader.audio.test, AssetLoader.preload.test, AssetLoader.test, CursorPreferenceContext, GameCursorProvider, cursor-manifest-consistency.test, cursorPreference
  src/engine/: undo-eventstream.test, adapter, context, difficulty, localMatchPreferences, localRunner, lookahead, noise, playerView
  src/features/: assetBaseUrl, manifestClient, mockInstallRunner, nativ...

**Explore Command Preference:** enabled via `USE_OMX_EXPLORE_CMD` (default-on; opt out with `0`, `false`, `no`, or `off`)
- Advisory steering only: agents SHOULD treat `omx explore` as the default first stop for direct inspection and SHOULD reserve `omx sparkshell` for qualifying read-only shell-native tasks.
- For simple file/symbol lookups, use `omx explore` FIRST before attempting full code analysis.
- When the user asks for a simple read-only exploration task (file/symbol/pattern/relationship lookup), strongly prefer `omx explore` as the default surface.
- Explore examples: `omx explore...

**Compaction Protocol:**
Before context compaction, preserve critical state:
1. Write progress checkpoint via state_write MCP tool
2. Save key decisions to notepad via notepad_write_working
3. If context is >80% full, proactively checkpoint state
</session_context>
<!-- OMX:RUNTIME:END -->
