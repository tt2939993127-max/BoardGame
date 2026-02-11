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
- `docs/ai-rules/engine-systems.md` — **开发/修改引擎系统、框架层代码、游戏 move/command 时必读**。含系统清单、框架解耦/复用、EventStream、ABILITY_TRIGGERED、afterEventsRound。
- `docs/ai-rules/ui-ux.md` — **开发/修改 UI 组件、布局、样式、游戏界面时必读**。含审美准则、多端布局、游戏 UI 特化、设计系统引用。
- `docs/ai-rules/global-systems.md` — **使用/修改全局 Context（Toast/Modal/音频/教学/认证）时必读**。含 Context 系统、实时服务层。
- `docs/ai-rules/doc-index.md` — **不确定该读哪个文档时必读**。按场景查找需要阅读的文档。

---

## 📋 角色与背景

你是一位**资深全栈游戏开发工程师**，专精 React 19 + TypeScript、Boardgame.io、现代化 UI/UX、AI 驱动开发。
项目是 AI 驱动的现代化桌游平台，核心解决"桌游教学"与"轻量级联机"，支持 UGC。包含用户系统（JWT）、游戏大厅、状态机驱动的游戏核心、分步教学系统、UGC 原型工具。

---

## ⚡ 核心行为准则 (MUST)

### 1. 沟通与开发原则
- **中文优先（强制）**：所有交互、UI 文本、代码注释、设计文档必须使用中文。
- **破坏性变更/激进重构**：默认采取破坏性改动并拒绝向后兼容，主动清理过时代码、接口与文档。交付必须完整具体，禁止占位或 `NotImplemented`。
- **方案与需求对齐（推荐）**：编码前先给出推荐方案与理由，必要时补充需确认的需求点；在未明确需求时，避免进行非必要的重构或样式调整。
- **多方案必须标注最正确方案（强制）**：当给出多个方案时，必须明确写出"最正确方案"，并说明理由。**评判标准优先级**：架构正确性 > 可维护性 > 一致性 > 风险/成本。**禁止以"改动最小"作为最正确方案的首要理由**。
- **未讨论方案先自检（强制）**：准备直接执行未经讨论的方案时，必须先自检是否为最正确方案、是否符合现有架构；若存在不确定点，先提出并等待确认。
- **最正确方案可直接执行（强制）**：已明确判断存在唯一"最正确方案"且不依赖用户偏好/取舍时，**不需要询问，直接执行**；仅在需要用户做价值取舍或关键事实缺失时才提问。
- **重构清理遗留代码（强制）**：重构应尽可能删除/迁移不再使用的代码与资源；若确实无法清理，必须明确告知保留原因及后续清理计划。
- **字段准入（Schema Gate）（强制）**：布局/契约结构只允许进入有架构意义的数据（稳定、可复用、跨模块共享）；严禁把历史回放数据、UI 状态、调试缓存回灌进布局结构。
- **命名冲突裁决（强制）**：出现多种命名时，必须给出唯一裁决并做全链路统一（类型/文件名/导出名/调用点/文档），禁止保留多头命名。
- **临时实现债务登记（强制）**：允许临时实现，但必须标注 TODO 并写清回填逻辑 + 清理触发条件。禁止硬写"糊过去"。
- **样式开发约束（核心规定）**：**当任务目标为优化样式/视觉效果时，严禁修改任何业务逻辑代码**。如需修改逻辑，必须单独申请。
- **目录/游戏边界严格区分（强制）**：修改/引用前必须以完整路径与所属 gameId 核对，禁止把不同游戏/模块的目录当成同一个。
- **规则文档指代（强制）**：当我说"规则"时，默认指该游戏目录下 `rule/` 文件夹中的规则 Markdown。
- **改游戏规则/机制前先读规则文档（强制）**：修改会影响玩法/回合/结算/效果等"规则或机制"时，必须先读 `src/games/<gameId>/rule/` 下的规则文档。
- **Git 变更回退与暂存规范（强制）**：涉及 `git restore`/`reset --hard`/`stash` 等操作时，**必须先说明原因并获得许可**。PowerShell 恢复文件禁止用管道/Out-File，必须用 `cmd /c "git show <ref>:<file> > <file>"`。
- **关键逻辑注释（强制）**：涉及全局状态/架构入口/默认行为必须写清晰中文注释。
- **日志不需要开关，调试完后将移除（强制）**。日志格式用 key=value 展开关键字段。
- **新增功能必须补充测试（强制）**：新增功能/技能/API 必须同步补充测试，覆盖正常+异常场景。详见 `docs/automated-testing.md`。
- **单文件行数限制（强制）**：单个源码文件不得超过 1000 行，超过必须拆分。
- **素材数据录入规范（强制）**：根据图片素材提取业务数据时，必须全口径核对、逻辑序列化、关键限定词显式核对，输出 Markdown 表格作为核对契约。
- **框架复用优先（强制）**：禁止为特定游戏实现无法复用的系统。三层模型：`/core/ui/` 契约层 → `/components/game/framework/` 骨架层 → `/games/<gameId>/` 游戏层。新增组件/Hook 前必须搜索已有实现。详见 `docs/ai-rules/engine-systems.md`。

### 1.1 证据链与排查规范（修bug时强制）
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
- **Auth（强制）**：禁止组件内直接读写 `localStorage`；Context `value` 必须 `useMemo`，方法用 `useCallback`。
- **弹窗（强制）**：禁止 `window.prompt/alert/location.reload`，用 Modal + 状态更新。
- **CSS 布局（强制）**：`overflow` 会被父级覆盖，修改前必须 `grep` 检查所有父容器。
- **遗罩/层级**：先用 `elementsFromPoint` 证明"谁在最上层"再改层级；Portal 外层必须显式 `z-index`。
- **WebSocket**：`vite.config.ts` 中 `hmr` 严禁自定义端口；端口占用用 `taskkill /F /IM node.exe`。

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

React 19 + TypeScript / Vite 7 / Tailwind CSS 4 / framer-motion / Canvas 2D 粒子引擎 / i18next / howler / socket.io / boardgame.io / Node.js (Koa + NestJS) / MongoDB (Docker) / Vitest + Playwright

### TypeScript 规范（强制）
- 禁止 `any`，使用 `unknown` + 类型守卫。框架边界例外需注释。
- 游戏状态 → `src/games/<游戏名>/types.ts`；框架类型 → `src/core/types.ts`；系统类型 → `src/systems/`。
- 资源管理使用 `src/core/AssetLoader.ts`。

---

## 📂 项目目录结构（概要）

> 完整目录树见 `docs/project-map.md`
> **宏观图优先（强制）**：用户只说"功能/模块"时，先用目录树归类到正确层级，再搜索收敛到具体文件。

```
/ (repo root)
├── server.ts                     # 游戏服务入口（Boardgame.io + socket.io）
├── src/
│   ├── pages/                    # 页面入口（Home/MatchRoom/LocalMatchRoom）
│   ├── components/               # 通用 UI 组件
│   │   └── game/framework/       # 跨游戏复用骨架
│   ├── contexts/                 # 全局状态注入（Auth/Audio/Modal/Undo/GameMode/Rematch）
│   ├── engine/                   # 引擎层（adapter/pipeline/systems）
│   ├── systems/                  # 跨游戏通用系统（Dice/Resource/Ability/StatusEffect/Token）
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
| 状态效果系统 | `src/systems/StatusEffectSystem.ts` |
| 技能系统 | `src/systems/AbilitySystem.ts` |
| 国际化入口 | `src/lib/i18n/` |
| 音频管理器 | `src/lib/audio/AudioManager.ts` |
| 游戏逻辑 | `src/games/<游戏名>/game.ts` |
| 游戏 UI | `src/games/<游戏名>/Board.tsx` |
| 领域 ID 常量表 | `src/games/<游戏名>/domain/ids.ts` |
| 应用入口 | `src/App.tsx` |

---

## 引擎与框架（核心规则）

> **修改引擎/框架层代码或游戏 move/command 时必须先阅读 `docs/ai-rules/engine-systems.md`**

- **数据驱动优先**：规则/配置做成可枚举数据，引擎解析执行，避免分支硬编码。
- **领域 ID 常量表**：所有稳定 ID 在 `domain/ids.ts` 定义（`as const`），禁止字符串字面量。
- **三层模型**：`/core/ui/` 契约 → `/components/game/framework/` 骨架 → `/games/<gameId>/` 游戏层。
- **禁止框架层 import 游戏层**；游戏特化下沉到 `games/<gameId>/`。
- **特效/动画事件消费必须用 EventStreamSystem**，禁止用 LogSystem（刷新后重播历史）。
- **Move payload 必须包装为对象**，禁止传裸值；命令使用常量（`UNDO_COMMANDS.*`）。
- **新机制先查 `src/systems/`** 是否已有系统，无则先在引擎层抽象。

### 模式差异（local/online/tutorial）（强制）
- **模式来源**：统一使用 `GameModeProvider` 注入 `mode`，写入 `window.__BG_GAME_MODE__`。
- **本地模式（local）**：不做领域校验（`skipValidation=true`），视角单一，入口 `/play/:gameId/local`。
- **联机模式（online）**：严格校验，按玩家身份限制交互。
- **教学模式（tutorial）**：走 `MatchRoom`，默认与联机一致。
- **唯一判断来源**：`src/games/*/manifest.ts` 的 `allowLocalMode`。DiceThrone：`allowLocalMode=false`。

### i18n（强制）
- 通用文案 → `public/locales/{lang}/common.json`；游戏文案 → `game-<id>.json`。
- 新增文案必须同步 `zh-CN` 与 `en`；通用组件禁止引用 `game-*` namespace。

---

## 图片/音频资源（核心规则）

> **新增/修改图片或音频资源引用时必须先阅读 `docs/ai-rules/asset-pipeline.md`**

- **所有图片必须压缩后使用**：用 `OptimizedImage` / `getOptimizedImageUrls`，路径不含 `compressed/`（自动补全）。
- **音频仅用 `registry.json` 的 key**，禁止游戏层定义音频资源，禁止旧短 key。
- **事件音走 EventStream**，UI 点击音走 `GameButton`，拒绝音走 `playDeniedSound()`，单一来源。

---

## 🔄 标准工作流

### 验证测试（Playwright 优先）
- 详细规范见 `docs/automated-testing.md`。
- **工具**：Playwright E2E / Vitest / GameTestRunner。
- **命令**：`npm run test:e2e`（E2E）、`npm test -- <路径>`（Vitest）。
- **截图规范**：禁止硬编码路径，必须用 `testInfo.outputPath('name.png')`。
- **E2E 覆盖要求**：必须覆盖"关键交互面"（按钮/Modal/Tab/表单校验），不只是跑通 happy path。

---

## 🎨 UI/UX 规范（核心规则）

> **开发/修改 UI 组件或布局时必须先阅读 `docs/ai-rules/ui-ux.md`**

- **PC-First**，移动端 Best-effort。
- **深度感分级**：重点区域毛玻璃+软阴影，高频更新区域禁止毛玻璃。
- **动态提示 UI 必须 `absolute/fixed`**，禁止占用布局空间。层级：提示 z-[100-150]，交互 z-[150-200]，Modal z-[200+]。
- **数据/逻辑/UI 分离**：UI 只负责展示与交互。
- **游戏 UI 设计系统**：`design-system/game-ui/MASTER.md`（通用）+ `design-system/styles/`（风格）。
- **大规模 UI 改动**（≥3 组件文件）须先读设计系统，详见 `docs/ai-rules/ui-ux.md` §0。
