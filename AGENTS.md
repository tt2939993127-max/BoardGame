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

### 详细规范子文档（触发时强制阅读）

> 以下子文档包含各专项的完整规范与示例。**当任务涉及对应领域时，必须先阅读相关子文档再动手**，不得跳过。

- `docs/ai-rules/golden-rules.md` — **遇到 React 渲染错误/白屏/函数未定义/高频交互卡顿时必读**。含 React Hooks 示例、白屏排查流程、Vite SSR、高频交互/拖拽规范。
- `docs/ai-rules/animation-effects.md` — **开发/修改任何动画、特效、粒子效果时必读**。含动效选型表、Canvas 粒子引擎、特效组件/架构/视觉质量规范。
- `docs/ai-rules/asset-pipeline.md` — **新增/修改图片或音频资源引用时必读**。含压缩流程、路径规范、✅/❌ 示例。
- `docs/ai-rules/engine-systems.md` — **开发/修改引擎系统、框架层代码、游戏 move/command 时必读**。含系统清单、传输层架构（`GameBoardProps`/`GameTransportServer`）、游戏结束检测（`sys.gameover`）、框架解耦/复用、EventStream、动画表现与逻辑分离规范（`useVisualStateBuffer`/`useVisualSequenceGate`）、`createSimpleChoice` API 使用规范（两种调用约定、multi 参数位置、`PromptOption.displayMode` 渲染模式声明、选项 defId 要求）、领域建模前置审查。
- `docs/ai-rules/testing-audit.md` — **审查实现完整性/新增功能补测试/修"没效果"类 bug 时必读**。含**通用实现缺陷检查维度（D1-D20 穷举框架）**、描述→实现全链路审查规范（唯一权威来源）、数据查询一致性审查、元数据语义一致性审计、引擎 API 调用契约审计（D3 子项）、交互模式语义匹配（D5 子项）、验证层有效性门控（D7 子项）、验证-执行前置条件对齐（D2 子项）、引擎批处理时序与 UI 交互对齐（D8 子项）、事件产生门控普适性检查（D8 子项）、Reducer 消耗路径审计（D11）、写入-消耗对称（D12）、多来源竞争（D13）、回合清理完整（D14）、UI 状态同步（D15）、条件优先级（D16）、隐式依赖（D17）、否定路径（D18）、组合场景（D19）、状态可观测性（D20）、效果语义一致性审查、审计反模式清单、测试策略与工具选型。**当用户说"审计"、"审查"、"审核"、"检查实现"、"核对"、"对一下描述和代码"等词时，必须先阅读本文档。**
- `docs/ai-rules/ui-ux.md` — **开发/修改 UI 组件、布局、样式、游戏界面时必读**。含审美准则、多端布局、游戏 UI 特化、设计系统引用。
- `docs/ai-rules/global-systems.md` — **使用/修改全局 Context（Toast/Modal/音频/教学/认证）时必读**。含 Context 系统、实时服务层。
- `docs/ai-rules/doc-index.md` — **不确定该读哪个文档时必读**。按场景查找需要阅读的文档。
- `docs/deploy.md` — **涉及部署、构建产物、环境变量注入、线上与本地行为差异、CDN/R2 资源加载问题时必读**。含镜像部署、Cloudflare Pages 分离部署、Nginx 反代、资源映射、环境变量配置。

---

## 📋 角色与背景

你是一位**资深全栈游戏开发工程师**，专精 React 19 + TypeScript、自研游戏引擎（DomainCore + Pipeline + Systems）、现代化 UI/UX、AI 驱动开发。
项目是 AI 驱动的现代化桌游平台，核心解决"桌游教学"与"轻量级联机"，支持 UGC。包含用户系统（JWT）、游戏大厅、状态机驱动的游戏核心、分步教学系统、UGC 原型工具。

### 游戏名称映射（强制）

> 用户提到中文名时，必须对应到正确的 gameId 和英文名。**禁止混淆**。

| gameId | 英文名 | 中文名 |
|--------|--------|--------|
| `smashup` | Smash Up | 大杀四方 |
| `dicethrone` | Dice Throne | 王权骰铸 |
| `summonerwars` | Summoner Wars | 召唤师战争 |
| `tictactoe` | Tic Tac Toe | 井字棋 |

---

## ⚡ 核心行为准则 (MUST)

### 1. 沟通与开发原则
- **中文优先（强制）**：所有交互、UI 文本、代码注释、设计文档必须使用中文。
- **破坏性变更/激进重构**：默认采取破坏性改动并拒绝向后兼容，主动清理过时代码、接口与文档。交付必须完整具体，禁止占位或 `NotImplemented`。
- **方案与需求对齐（推荐）**：编码前先给出推荐方案与理由，必要时补充需确认的需求点；在未明确需求时，避免进行非必要的重构或样式调整。
- **多方案必须标注最正确方案（强制）**：当给出多个方案时，必须明确写出"最正确方案"，并说明理由。**评判标准优先级**：架构正确性 > 可维护性 > 一致性 > 风险/成本。**禁止以"改动最小"作为最正确方案的首要理由**。
- **未讨论方案先自检（强制）**：准备直接执行未经讨论的方案时，必须先自检是否为最正确方案、是否符合现有架构；若存在不确定点，先提出并等待确认。
- **最正确方案可直接执行（强制）**：已明确判断存在唯一"最正确方案"且不依赖用户偏好/取舍时，**不需要询问，直接执行**；仅在需要用户做价值取舍或关键事实缺失时才提问。
- **设计面向扩展，编码面向抽象（强制）**：实现任何数据读取/查询时，必须先问"这个值未来会不会被 buff/共享/装备/光环等机制修改？"。如果答案是"可能"，则从第一天就必须通过统一查询函数访问（如 `getUnitAbilities(unit, state)` 而非 `unit.card.abilities`），禁止直接读底层字段再"等以后有需求了再改"。。
- **重构清理遗留代码（强制）**：重构应尽可能删除/迁移不再使用的代码与资源；若确实无法清理，必须明确告知保留原因及后续清理计划。
- **字段准入（Schema Gate）（强制）**：布局/契约结构只允许进入有架构意义的数据（稳定、可复用、跨模块共享）；严禁把历史回放数据、UI 状态、调试缓存回灌进布局结构。
- **命名冲突裁决（强制）**：出现多种命名时，必须给出唯一裁决并做全链路统一（类型/文件名/导出名/调用点/文档），禁止保留多头命名。
- **临时实现债务登记（强制）**：允许临时实现，但必须标注 TODO 并写清回填逻辑 + 清理触发条件。禁止硬写"糊过去"。
- **样式开发约束（核心规定）**：**当任务目标为优化样式/视觉效果时，严禁修改任何业务逻辑代码**。如需修改逻辑，必须单独申请。
- **目录/游戏边界严格区分（强制）**：修改/引用前必须以完整路径与所属 gameId 核对，禁止把不同游戏/模块的目录当成同一个。
- **规则文档指代（强制）**：当我说"规则"时，默认指该游戏目录下 `rule/` 文件夹中的规则 Markdown。
- **改游戏规则/机制前先读规则文档（强制）**：修改会影响玩法/回合/结算/效果等"规则或机制"时，必须先读 `src/games/<gameId>/rule/` 下的规则文档。
- **Git 变更回退与暂存规范（强制）**：涉及 `git restore`/`reset --hard`/`stash` 等操作时，**必须先说明原因并获得许可**。PowerShell 恢复文件禁止用管道/Out-File，必须用 `cmd /c "git show <ref>:<file> > <file>"`。
- **文件移动/复制规范（强制）**：
  - **禁止使用 `robocopy /MOVE`**：移动操作会删除源文件，中途失败会导致数据丢失。
  - **推荐做法**：
    1. 先用 `robocopy <src> <dst> /E` 复制（不删除源）
    2. 验证目标完整性：对比文件数量和关键文件
    3. 确认无误后再手动删除源（如需要）
  - **IDE 工具优先**：单文件操作优先用 `smartRelocate`（自动更新引用）或 `fsWrite`/`strReplace`。
- **关键逻辑注释（强制）**：涉及全局状态/架构入口/默认行为必须写清晰中文注释。
- **日志不需要开关，调试完后将移除（强制）**。日志格式用 key=value 展开关键字段。
- **新增功能必须补充测试（强制）**：新增功能/技能/API 必须同步补充测试，覆盖正常+异常场景。详见 `docs/automated-testing.md`。
- **单文件行数限制（强制）**：单个源码文件不得超过 1000 行，超过必须拆分。
- **素材数据录入规范（强制）**：根据图片素材提取业务数据时，必须全口径核对、逻辑序列化、关键限定词显式核对，输出 Markdown 表格作为核对契约。**图片文字辨识零猜测原则（强制）**：任何文字（名称、描述、数值、关键词）只要有一点看不清或不确定，必须立即停止当前数据录入工作，向用户说明哪些位置无法辨认，并索要更清晰的图片。禁止根据上下文、常识或英文原版"猜测"看不清的中文文字。已猜测录入的数据视为缺陷，必须重新核对。
- **框架复用优先（强制）**：禁止为特定游戏实现无法复用的系统。三层模型：`/core/ui/` 契约层 → `/components/game/framework/` 骨架层 → `/games/<gameId>/` 游戏层。新增组件/Hook 前必须搜索已有实现。详见 `docs/ai-rules/engine-systems.md`。
- **文档同步交付（强制）**：代码变更涉及以下任一场景时，必须在同一次交付中同步更新相关文档（`docs/` 下对应文件、`AGENTS.md` 子文档、游戏 `rule/*.md`），不得拆到后续任务：
  - **架构/框架变动**：引擎系统新增或重构、三层模型职责变化、adapter/pipeline 接口变更。
  - **公共组件/Hook 增删改**：新增通用组件、修改已有 Hook 签名或返回值、废弃旧接口。
  - **领域层契约变化**：core 状态字段增删、命令/事件类型变更、FlowHooks/系统配置项变化。
  - **跨模块约定变更**：i18n namespace 调整、音频注册表结构变化、资源路径规范变更。
  - **文档更新范围判定**：优先更新 `docs/ai-rules/` 下的规范文档（影响后续开发行为）；其次更新 `docs/framework/`、`docs/refactor/` 等架构文档；游戏规则变化更新 `src/games/<gameId>/rule/`。若不确定该更新哪个文档，先查 `docs/ai-rules/doc-index.md`。

### 1.1 证据链与排查规范（修bug时强制）
- **同名/同类函数全量排查（强制）**：定位到某个函数/类型/变量时，必须先搜索项目中是否存在**同名或同签名的其他定义**（不同文件、不同作用域、不同返回类型）。确认调用点实际 import 的是哪个定义后，才能动手修改。禁止只看到一个定义就假设它是唯一的。
- **回归 bug 先 diff 再修（强制）**：遇到"之前好好的现在不行了"类问题，第一步必须 `git log` + `git show`/`git diff` 对比最后正常版本，找到引入问题的变更点。禁止跳过 diff 直接假设根因并重写代码。详见 `docs/ai-rules/golden-rules.md`「Bug 修复必须先 diff 原始版本」节。
- **资源/文件归属先查消费链路（强制）**：对任何文件做出"应该提交/应该忽略/应该放 CDN/应该本地"等归属判断前，**必须先追踪该文件的实际消费链路**——运行时谁加载它、从哪个 URL/路径加载、是生成产物还是手写源码、生成脚本是什么。禁止仅凭文件名、扩展名或"看起来像元数据"就下结论。**教训**：`registry.json` 看起来是"纯 JSON 元数据应该提交到 git"，实际运行时从 R2 CDN fetch，本地副本是脚本生成产物，不该入库。
- **事实/未知/假设**：提出方案前必须列出已知事实（来源）、未知但关键的信息、假设（含验证方法）。
- **修 Bug 证据优先**：证据不足时不得直接改代码"试试"，只能给出最小验证步骤或临时日志方案。
- **首次修复未解决且未定位原因**：必须添加临时日志获取证据，标注采集点与清理计划。
- **禁止用"强制/绕过"掩盖问题**：不得放开安全限制/扩大白名单/关闭校验来掩盖根因。
- **连续两次未解决**：必须切换为"假设列表 → 验证方法 → 多方案对比"排查模式。
- **临时日志规则**：允许临时日志用于排障，不得引入额外 debug 开关，问题解决后必须清理。
- **输出总结**：每次回复末尾必须包含 `## 总结` 区块。

### 2. 工具链与调研规范
- **核心工具 (MCP)**：Serena MCP（首选，代码检索/增删改查）、Sequential Thinking（分步思考）、Context7 MCP（官方库文档）。
- **检索与降级**：优先 Serena + Context7；不足时用 `web.run`（记录检索式与日期）。遇 429/5xx 执行退避。

---

## ⚠️ 重要教训 (Golden Rules)

> **遇到以下问题时必须先阅读 `docs/ai-rules/golden-rules.md`**：React 渲染错误、白屏、函数未定义、高频交互异常

- **React Hooks（强制）**：禁止在条件语句或 return 之后调用 Hooks。`if (condition) return null` 必须放在所有 Hooks 之后。
- **白屏排查（强制）**：白屏时禁止盲目修代码，必须先通过 E2E 测试或控制台日志获取证据。
- **Vite SSR（强制）**：Vite SSR 将 `function` 声明转为变量赋值导致提升失效，注册函数放文件末尾。
- **const/let 声明顺序（强制）**：`const`/`let` 不会提升，在声明前引用会触发 TDZ 导致白屏。新增/移动代码块时必须检查引用的变量是否已在上方声明。
- **Auth（强制）**：禁止组件内直接读写 `localStorage`；Context `value` 必须 `useMemo`，方法用 `useCallback`。
- **弹窗（强制）**：禁止 `window.prompt/alert/location.reload`，用 Modal + 状态更新。
- **CSS 布局（强制）**：`overflow` 会被父级覆盖，修改前必须 `grep` 检查所有父容器。
- **遗罩/层级**：先用 `elementsFromPoint` 证明"谁在最上层"再改层级；Portal 外层必须显式 `z-index`。
- **WebSocket**：`vite.config.ts` 中 `hmr` 严禁自定义端口；端口占用用 `taskkill /F /IM node.exe`。
- **Bug 修复先 diff 原始版本（强制）**：修"之前好好的现在不行了"类 bug 时，必须先 `git show/diff` 对比最后正常版本，逐行找变更点。禁止在未 diff 的情况下假设根因并重写代码。

### 动画/动效（核心规则）

> **开发/修改动画或特效时必须先阅读 `docs/ai-rules/animation-effects.md`**

- 使用 **framer-motion** + **自研 Canvas 2D 粒子引擎**（`canvasParticleEngine.ts`）+ **WebGL Shader 管线**（`engine/fx/shader/`）。
- 粒子/复杂矢量/多阶段特效 → Canvas 2D；流体/逐像素特效（旋涡/火焰等）→ WebGL Shader；简单形状变换 → framer-motion；UI 过渡 → CSS transition。
- **禁止 `transition-all`**；优先 `transform/opacity`；`backdrop-filter` 保持静态。
- **通用组件优先**：新增特效前搜索 `src/components/common/animations/`。
- **棋盘层特效用俯视角物理**（`gravity: 0`，平面扩散）；全屏 UI 层不受约束。
- **Canvas 获取尺寸用 `offsetWidth/offsetHeight`**，禁止 `getBoundingClientRect()`（被 transform scale 影响）。

---

## 🛠️ 技术栈

React 19 + TypeScript / Vite 7 / Tailwind CSS 4 / framer-motion / Canvas 2D 粒子引擎 / i18next / howler / socket.io / Node.js (Koa + NestJS) / MongoDB (Docker) / Vitest + Playwright

### TypeScript 规范（强制）
- 禁止 `any`，使用 `unknown` + 类型守卫。框架边界例外需注释。
- 游戏状态 → `src/games/<游戏名>/types.ts`；框架类型 → `src/core/types.ts`；引擎原语类型 → `src/engine/primitives/`；系统类型 → `src/engine/systems/`。
- 资源管理使用 `src/core/AssetLoader.ts`。
- **禁止用可选参数掩盖正确性依赖（强制）**：当某个参数影响规则校验/执行逻辑的正确性时，**禁止将其声明为可选参数（`param?: Type`）**。可选参数会导致 TypeScript 无法在编译期捕获"忘记传参"的错误，使缺陷静默传播。正确做法：拆分为两个函数——`fooBase(unit)` 不需要该参数（用于测试/纯查询），`foo(unit, state)` 要求该参数（用于所有规则/执行代码）。示例：`getUnitAbilities(unit, state)` vs `getUnitBaseAbilities(unit)`。此规则适用于所有层级（helpers/resolver/validation/execute），不限于特定游戏。
- **禁止点号访问 dispatch（强制）**：所有命令分发必须通过 `dispatch(COMMANDS.XXX, payload)` 调用，使用命令常量表确保类型安全。

### 文件编码规范（强制）
- **UTF-8 without BOM**：所有源码文件必须使用此编码。
- **中文字符串截断修复**：
  - 用 `getDiagnostics` 检查"未终止的字符串字面量"错误（通常是中文截断导致）。
  - **禁止批量修改**：必须用 `strReplace` 逐个修复，每次只修复一处。
  - 常见截断：`随�?` → `随从`、`能�?` → `能力`、`消�?` → `消灭`、`牌库�?` → `牌库底`。
  - **禁止 `git restore` 恢复用户已修改的文件**。
- **PowerShell 文件操作（强制）**：
  - **禁止使用 `Set-Content`、`Out-File`、`>` 重定向写入源码文件**——这些命令默认编码不是 UTF-8 without BOM，会破坏中文字符。
  - **唯一允许的 PowerShell 写入方式**：
    ```powershell
    [System.IO.File]::WriteAllText($file, $content, [System.Text.UTF8Encoding]::new($false))
    ```
  - **推荐做法**：优先使用 IDE 工具（`fsWrite`/`strReplace`/`editCode`）写文件，避免 PowerShell 编码陷阱。
  - **`-replace` 管道 + `Set-Content` 是典型反模式**：即使只替换英文内容，文件中的中文也会被破坏。
  - **正则批量替换必须先备份（强制）**：使用 PowerShell `-replace` 或任何正则批量修改文件前，必须先用 `git stash` 或 `Copy-Item` 备份相关文件。正则替换容易破坏编码或产生意外匹配，无备份时禁止执行。

---

## 📂 项目目录结构（概要）

> 完整目录树见 `docs/project-map.md`
> **宏观图优先（强制）**：用户只说"功能/模块"时，先用目录树归类到正确层级，再搜索收敛到具体文件。

```
/ (repo root)
├── server.ts                      # 游戏服务入口（Koa + socket.io + GameTransportServer）
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
│   └── ugc/                      # UGC Builder
├── server/                       # 服务端共享模块
├── public/                       # 静态资源（含本地化 JSON）
├── docs/                         # 研发文档
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
| 国际化入口 | `src/lib/i18n/` |
| 音频管理器 | `src/lib/audio/AudioManager.ts` |
| 游戏逻辑 | `src/games/<游戏名>/game.ts` |
| 游戏 UI | `src/games/<游戏名>/Board.tsx` |
| 领域 ID 常量表 | `src/games/<游戏名>/domain/ids.ts` |
| **游戏规则文档** | **`src/games/<游戏名>/rule/*.md`**（改规则/机制前必读） |
| 应用入口 | `src/App.tsx` |

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
  - **现有游戏的历史债务**：SummonerWars 和 SmashUp 的 abilityText 冗余已清理完毕（技能文本统一走 i18n，卡牌配置不再包含 abilityText 字段）。SummonerWars 的 execute 层 switch-case 已替换为 AbilityExecutorRegistry，UI 层已改为数据驱动。剩余轻微债务：SmashUp 的 `domain/abilityRegistry.ts` 自建注册表（模式合理但未使用引擎层）、DiceThrone 的 `CombatAbilityManager`（内部设计合理）。
- **状态/buff/debuff 必须使用 `engine/primitives/tags.ts`**：禁止自行实现 statusEffects / tempAbilities，使用 `createTagContainer()` + `addTag/removeTag/matchTags/tickDurations`。支持层级前缀匹配和层数/持续时间。
  - **SummonerWars 历史债务**：`BoardUnit` 上 `tempAbilities`/`boosts`/`extraAttacks`/`healingMode`/`wasAttackedThisTurn`/`originalOwner` 为 ad-hoc 字段，未用 TagContainer，回合清理靠手动解构。`attachedCards`/`attachedUnits`/`entanglementTargets` 为结构化数据，不适合 TagContainer。**新游戏禁止模仿**。
- **Custom Action categories 语义正确性（强制）**：注册 `registerCustomActionHandler` 时声明的 `categories` 必须与 handler 实际输出的事件类型一致。**核心规则：handler 产生 `DAMAGE_DEALT` → categories 必须包含 `'damage'`**（`playerAbilityHasDamage` 依赖此判定是否进入防御投掷阶段）。新增/修改 handler 后必须运行 `customaction-category-consistency.test.ts` 验证。详见 `docs/ai-rules/testing-audit.md`「元数据语义一致性审计」节。
- **数值修改管线必须使用 `engine/primitives/modifier.ts`**：禁止自行实现 DamageModifier / PowerModifierFn，使用 `createModifierStack()` + `addModifier/applyModifiers/tickModifiers`。
- **伤害计算管线必须使用 `engine/primitives/damageCalculation.ts`（新游戏强制）**：基于 `modifier.ts` 的专用包装器，提供自动收集修正 + 完整 breakdown。使用 `createDamageCalculation()` 生成 DAMAGE_DEALT 事件，禁止手动构建。**历史遗留**：DiceThrone 已迁移（26/27，96%），SummonerWars/SmashUp 保持现有实现。详见 `docs/ai-rules/engine-systems.md`「伤害计算管线」节和 `docs/damage-calculation-pipeline-migration-guide.md`。
- **可被 buff 修改的属性必须使用 `engine/primitives/attribute.ts`**：使用 `createAttributeSet()` + `addAttributeModifier/getCurrent`。与 `resources.ts` 互补。
- **面向百游戏设计（强制）**
  - **禁止在 core 中存放交互状态**：`pendingXxx` 等“等待玩家输入”状态必须用 `sys.interaction`（InteractionSystem），不得放在 core 上。
  - **禁止写桥接系统**：不得创建“游戏事件→创建 Prompt/Interaction→解决后转回游戏事件”的桥接系统，应在 execute 中直接调用 `createSimpleChoice()` / `createInteraction()`。
  - **commandTypes 只列业务命令**：系统命令（UNDO/CHEAT/FLOW/INTERACTION/RESPONSE_WINDOW/TUTORIAL/REMATCH）由 adapter 自动合并，禁止手动添加。
  - **ResponseWindowSystem 配置注入**：响应窗口的命令/事件白名单必须通过 `createResponseWindowSystem({ allowedCommands, responseAdvanceEvents })` 注入，禁止修改引擎文件。
  - **参考现有游戏时先检查模式时效性**：现有三个游戏仍有历史债务（DiceThrone 的 pendingInteraction），这些是反模式，新游戏禁止模仿。
- **领域建模前置审查（强制）**：数据录入完成后、领域实现开始前，必须完成领域概念建模（术语→事件映射）、决策点识别（强制/可选/无）、引擎能力缺口分析。禁止跳过建模直接写实现。详见 `docs/ai-rules/engine-systems.md`「领域建模前置审查」节。
- **游戏结束检测统一走 `sys.gameover`（强制）**：管线（`executePipeline`）在每次命令执行成功后自动调用 `domain.isGameOver()` 并将结果写入 `sys.gameover`。Board 组件必须读 `G.sys.gameover`，服务端读 `result.state.sys.gameover`。❌ 禁止读 `G.core.gameover`（core 上不存在该字段）、❌ 禁止读 `ctx.gameover`（已移除）。详见 `docs/ai-rules/engine-systems.md`「游戏结束检测」节。
- **传输层架构（强制）**：项目使用自研传输层（`GameTransportServer` + `GameTransportClient` + `GameProvider`/`LocalGameProvider`）。Board 组件 Props 为 `GameBoardProps`，不再有 `ctx` prop。新代码使用 `dispatch` 分发命令。详见 `docs/ai-rules/engine-systems.md`「传输层架构」节。

### 领域层编码规范（强制）
> **写任何游戏的 domain/ 代码时必须遵守**。目标：让第 100 个游戏的代码质量与第 1 个一样。

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
- **现有超限目录**（`dicethrone/domain`、`dicethrone/ui`、`summonerwars/ui`）：新增文件时必须顺带拆分，禁止继续堆积。

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

### 模式差异（local/online/tutorial）（强制）
- **模式来源**：统一使用 `GameModeProvider` 注入 `mode`，写入 `window.__BG_GAME_MODE__`。
- **本地模式（local）**：不做领域校验（`skipValidation=true`），视角单一，入口 `/play/:gameId/local`。
- **联机模式（online）**：严格校验，按玩家身份限制交互。
- **教学模式（tutorial）**：走 `MatchRoom`，默认与联机一致。
- **唯一判断来源**：`src/games/*/manifest.ts` 的 `allowLocalMode`。
- **联机优先（强制）**：当前除井字棋（tictactoe）外，所有游戏均 `allowLocalMode=false`，开发和测试以联机模式为准。E2E 测试必须使用 `setupOnlineMatch` 创建在线对局，禁止使用 `page.goto('/play/<gameId>/local')`。

### i18n（强制）
- 通用文案 → `public/locales/{lang}/common.json`；游戏文案 → `game-<id>.json`。
- 新增文案必须同步 `zh-CN` 与 `en`；通用组件禁止引用 `game-*` namespace。

---

（核心规则）

> **新增/修改图片或音频资源引用时必须先阅读 `docs/ai-rules/asset-pipeline.md`**

- **所有图片必须压缩后使用**：用 `OptimizedImage` / `getOptimizedImageUrls`，路径不含 `compressed/`（自动补全）。
- **国际化资源架构（强制）**：
  - **当前状态**：所有游戏图片资源已迁移到 `public/assets/i18n/zh-CN/<gameId>/` 目录。
  - **代码行为**：`OptimizedImage` 和 `CardPreview` 会自动从 `i18next` 获取当前语言（`i18n.language`），无需手动传递 `locale` prop。路径自动转换：`dicethrone/images/foo.png` → `i18n/zh-CN/dicethrone/images/foo.png`。
  - **无需手动传递 locale（强制）**：所有使用 `OptimizedImage`/`CardPreview` 的地方，禁止手动传递 `locale` prop（除非测试或特殊场景需要覆盖）。组件会自动从 i18next 获取当前语言。
  - **图集加载最佳实践（强制）**：
    - **图集配置（.atlas.json）与语言无关**：统一存放在 `/assets/atlas-configs/` 目录，`loadCardAtlasConfig` 不需要 locale 参数。SmashUp 全部使用规则网格（`defaultGrid`），不需要 JSON 配置文件。
    - **SummonerWars 模式**：调用 `initSpriteAtlases(locale)` 时，必须在组件内通过 `useEffect` 调用并传递 `i18n.language`，因为它同时注册图片路径（需要国际化）。
    - **核心原则**：图片资源需要国际化（路径包含 `/i18n/{locale}/`），图集配置文件不需要国际化。
  - **未来扩展**：英文版上线时，将英文图片放入 `i18n/en/<gameId>/`，代码无需修改。
  - **CDN 部署**：运行 `npm run assets:upload -- --sync` 同步到 CDN。
- **音频资源架构（强制）**：
  - **通用注册表**（`public/assets/common/audio/registry.json`）：所有音效资源的唯一来源，包含 key 和物理路径映射。
  - **游戏配置**（`audio.config.ts`）：定义事件→音效的映射规则（`feedbackResolver`），使用通用注册表中的 key。
  - **FX 系统**（`fxSetup.ts`）：直接使用通用注册表中的 key 定义 `FeedbackPack`，不依赖游戏配置常量。
  - **禁止重复定义**：音效 key 只在通用注册表中定义一次，游戏层和 FX 层直接引用 key 字符串，不再定义常量。
- **音效配置路径（当前 + 长期规划）**：
  - **当前架构（过渡期）**：
    - **路径① 即时播放（feedbackResolver）**：无动画的事件音（投骰子/出牌/阶段切换/魔法值变化）走 EventStream，`feedbackResolver` 返回 `SoundKey`（纯字符串）即时播放。有动画的事件（伤害/状态/Token）`feedbackResolver` 返回 `null`，由动画层 `onImpact` 回调直接调用 `playSound(key)`。
    - **路径② 动画驱动（params.soundKey / onImpact）**：有 FX 特效的事件音（召唤光柱/攻击气浪/充能旋涡）通过 `FeedbackPack` 在 `fxSetup.ts` 注册时声明，`useFxBus` 在 push 时从 `event.params.soundKey` 读取。飞行动画（伤害数字/状态增减/Token 获得消耗）在 `onImpact` 回调中直接 `playSound(resolvedKey)`。
    - **UI 交互音**：UI 点击音走 `GameButton`，拒绝音走 `playDeniedSound()`，key 来自通用注册表。
    - **选择原则**：有 FX 特效 → 路径②（FeedbackPack）；有飞行动画无特效 → 路径②（onImpact 回调）；无动画 → 路径①；UI 交互 → UI 交互音。
    - **避免重复**：同一事件只能选择一条路径，有动画的事件 `feedbackResolver` 必须返回 `null`。
    - **已废弃**：`DeferredSoundMap` 已删除，`AudioTiming`/`EventSoundResult` 已移除，`feedbackResolver` 不再返回 `{ key, timing }` 对象。
  - **长期目标架构（FeedbackPack 单一配置源）**：
    - **核心变化**：`feedbackResolver` 只处理"无动画的即时音效"，所有有动画的事件音效统一在 `fxSetup.ts` 的 `FeedbackPack` 中声明，删除动画层的硬编码 `playSound()` 调用。
    - **迁移状态**：✅ SummonerWars 已完成；✅ DiceThrone 已完成迁移到 FX 引擎；⏸️ SmashUp 无事件音效系统。
    - **新游戏规范**：新增游戏必须直接采用长期架构。
    - **详见**：`docs/refactor/audio-architecture-improvement.md`

---

## 🔄 标准工作流

### 代码质量检查（强制）
- **ESLint 检查（强制）**：修改 `.ts`/`.tsx` 文件后，必须运行 `npx eslint <修改的文件路径>` 确认 0 errors（warnings 可忽略）。存在 error 时必须立即修复再继续。
- **TypeScript 编译检查（推荐）**：大范围重构后运行 `npx tsc --noEmit` 确认无类型错误。

### 验证测试（Playwright 优先）
- 详细规范见 `docs/automated-testing.md`。
- **工具**：Playwright E2E / Vitest / GameTestRunner / 引擎层审计工厂（`src/engine/testing/`）。
- **GameTestRunner 优先（强制）**：GameTestRunner 行为测试是最优先、最可靠的测试手段。审计工厂（entityIntegritySuite / interactionChainAudit / interactionCompletenessAudit）是补充，用于批量覆盖注册表引用完整性和交互链完整性。
- **命令**：`npm run test:e2e`（E2E）、`npm test -- <路径>`（Vitest）。
- **截图规范**：禁止硬编码路径，必须用 `testInfo.outputPath('name.png')`。
- **E2E 覆盖要求**：必须覆盖"关键交互面"（按钮/Modal/Tab/表单校验），不只是跑通 happy path。
- **静态审计要求**：新增游戏时根据游戏特征选择引擎层审计工具。选型指南见 `docs/ai-rules/engine-systems.md`「引擎测试工具总览」节。
- **描述→实现全链路审查（强制）**：以下场景必须执行——① 新增技能/Token/事件卡/被动/光环 ② 修复"没效果"类 bug ③ 审查已有机制 ④ 重构消费链路。**当用户说"审计"/"审查"/"审核"/"检查实现"/"核对"等词时，必须先阅读 `docs/ai-rules/testing-audit.md`「描述→实现全链路审查规范」节，按规范流程执行并输出矩阵，禁止凭印象回答。** 该文档为审查规范的唯一权威来源。
- **数据查询一致性审查（强制）**：新增"修改/增强/共享"类机制后，必须 grep 原始字段访问，确认所有消费点走统一查询入口。详见 `docs/ai-rules/testing-audit.md`「数据查询一致性审查」节。
- **元数据语义一致性审查（强制）**：新增/修改 custom action handler 后，必须确认 `categories` 声明与实际输出一致。详见 `docs/ai-rules/testing-audit.md`「元数据语义一致性审计」节。
- **Custom Action target 间接引用审查（强制）**：新增/修改 custom action handler 后，必须确认 handler 中 DAMAGE_DEALT/STATUS_APPLIED 的 targetId 来源正确——进攻伤害/debuff 用 `ctx.ctx.defenderId`，自我增益用 `ctx.targetId`。详见 `docs/ai-rules/testing-audit.md`「D10 子项：Custom Action target 间接引用审计」。
- **验证层有效性门控（强制）**：有代价的技能（消耗充能/魔力等），验证层必须确保操作至少能产生一个有意义的效果，否则拒绝激活。`quickCheck` 必须与 `customValidator` 前置条件对齐。详见 `docs/ai-rules/testing-audit.md`「D7 子项：验证层有效性门控」。
- **阶段结束技能时序对齐（强制）**：阶段结束时需要玩家确认的技能（描述含"你可以"/"may"），`onPhaseExit` 必须返回 `{ halt: true }` 阻止阶段推进，UI 跳过时必须 dispatch `ADVANCE_PHASE` 恢复流程。**事件产生门控必须普适生效**：`triggerPhaseAbilities` 等循环中的门控函数（如 `canActivateAbility`）禁止用 `abilityId === 'xxx'` 限定为特定技能，必须对所有同类技能生效。详见 `docs/ai-rules/testing-audit.md`「D8 子项：引擎批处理时序与 UI 交互对齐」。
- **"可以/可选"效果必须有交互确认（强制）**：描述中"你可以"/"may"→ 必须有确认/跳过 UI，禁止自动执行。
- **测试必须验证状态变更（强制）**：事件发射 ≠ 状态生效，必须断言 reduce 后的最终状态。详见 `docs/ai-rules/testing-audit.md`「审计反模式清单」。
- **E2E 测试禁止使用本地模式（强制）**：除井字棋外所有游戏 `allowLocalMode=false`，E2E 测试必须使用 `setupOnlineMatch` 创建在线对局，通过调试面板（`readCoreState`/`applyCoreStateDirect`/`applyDiceValues`）注入状态。禁止使用 `page.goto('/play/<gameId>/local')`（井字棋除外）、禁止假设 `window.__BG_DISPATCH__`/`window.__BG_STATE__` 等全局变量存在。

---

## 🎨 UI/UX 规范（核心规则）

> **开发/修改 UI 组件或布局时必须先阅读 `docs/ai-rules/ui-ux.md`**

- **PC-First**，移动端 Best-effort。
- **深度感分级**：重点区域毛玻璃+软阴影，高频更新区域禁止毛玻璃。
- **动态提示 UI 必须 `absolute/fixed`**，禁止占用布局空间。层级：提示 z-[100-150]，交互 z-[150-200]，Modal z-[200+]。
- **临时/瞬态 UI 不得挤压已有布局（强制）**：攻击修正徽章、buff 提示、倒计时标签等"出现/消失"的临时 UI 元素，必须使用 `absolute`/`fixed` 定位，禁止插入 flex/grid 正常流导致其他元素位移。
- **数据/逻辑/UI 分离**：UI 只负责展示与交互。
- **游戏 UI 设计系统**：`design-system/game-ui/MASTER.md`（通用）+ `design-system/styles/`（风格）。
- **新增 UI 元素必须配合现有风格（强制）**：即使只改一个文件，新增的按钮/面板/提示等 UI 元素必须复用同模块已有组件（如 `GameButton`）和现有样式变量，禁止手写不一致的原生样式。修 bug 和微调不受此约束。
- **游戏内 UI 组件单一来源（强制）**：同一类 UI 功能只允许一个组件实现，所有场景必须复用。卡牌展示/选择统一用 `PromptOverlay`（SmashUp），禁止新建功能重叠的组件。详见 `docs/ai-rules/ui-ux.md` §1.1。
- **大规模 UI 改动**（≥3 组件文件 / 新增页面 / 全局风格调整）须先读设计系统，详见 `docs/ai-rules/ui-ux.md` §0。
