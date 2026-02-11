# 引擎与框架系统完整规范

> 本文档是 `AGENTS.md` 的补充，包含引擎层系统清单、框架解耦要求、EventStream 等详细规范。
> **触发条件**：开发/修改引擎系统、框架层代码、游戏 move/command 时阅读。

---

## 引擎层概述

- **Domain Core**：游戏规则以 Command/Event + Reducer 形式实现，确保确定性与可回放。
- **Systems**：Undo/Prompt/Log 等跨游戏能力以 hook 管线方式参与执行。
- **Adapter**：Boardgame.io moves 仅做输入翻译，规则主体在引擎层。
- **统一状态**：`G.sys`（系统状态） + `G.core`（领域状态）。

---

## 引擎层系统清单

- `DiceSystem` - 骰子定义/创建/掷骰/统计/触发条件
- `CardSystem` - 卡牌定义/牌组/手牌区/抽牌/弃牌/洗牌
- `ResourceSystem` - 资源定义/增减/边界/消耗检查
- `AbilitySystem` - 技能定义/触发条件/效果（含可扩展条件注册表）
- `StatusEffectSystem` - 状态效果/堆叠/持续时间
- `FxSystem` (`src/engine/fx/`) - 视觉特效调度（Cue 注册表 + 事件总线 + 渲染层 + WebGL Shader 子系统），游戏侧通过 `fxSetup.ts` 注册渲染器。Shader 管线（`src/engine/fx/shader/`）提供 `ShaderCanvas` + `ShaderMaterial` + GLSL 噪声库，用于逐像素流体特效。

---

## 新引擎系统注意事项（强制）

- **数据驱动优先（强制）**：规则/配置/清单优先做成可枚举的数据（如 manifest、常量表、定义对象），由引擎/系统解析执行；避免在组件或 move 内写大量分支硬编码，确保可扩展、可复用、可验证。
- **领域 ID 常量表（强制）**：所有领域内的稳定 ID（如状态效果、Token、骰面符号、命令类型）必须在 `domain/ids.ts` 中定义常量表，禁止在代码中直接使用字符串字面量（如 `'knockdown'`、`'taiji'`）。
  - **常量表结构**：使用 `as const` 确保类型安全，并导出派生类型（如 `StatusId`、`TokenId`）。
  - **示例**：`STATUS_IDS.KNOCKDOWN`、`TOKEN_IDS.TAIJI`、`DICE_FACE_IDS.FIST`。
  - **例外**：国际化 key（如 `t('dice.face.fist')`）、类型定义（如 `type DieFace = 'fist' | ...`）可保留字符串字面量。
- **新机制先检查引擎**：实现新游戏机制（如骰子、卡牌、资源）前，必须先检查 `src/systems/` 是否已有对应系统；若无，必须先在引擎层抽象通用类型和接口，再在游戏层实现。原因：UGC 游戏需要复用这些能力。充分考虑未来可能性而不是只看当下。

---

## 框架解耦要求（强制）

> **目标**：`src/systems/` 和 `src/engine/` 与具体游戏完全解耦，支持 UGC 复用。

- **禁止**：框架层 import 游戏层模块；框架默认注册/启用游戏特定功能；用 `@deprecated` 标记保留耦合代码。
- **正确做法**：框架提供通用接口与注册表，游戏层显式注册扩展（如 `conditionRegistry.register('diceSet', ...)`）。
- **发现耦合时**：立即报告并将游戏特定代码迁移到 `games/<gameId>/`，不得以"后续处理"搪塞。
- **系统注册**：新系统必须在 `src/engine/systems/` 实现，并在 `src/engine/systems/index.ts` 导出；如需默认启用，必须加入 `createDefaultSystems()`。
- **状态结构**：系统新增状态必须写入 `SystemState` 并由系统 `setup()` 初始化；禁止把系统状态塞进 `core`。
- **命令可枚举**：凡是系统命令（如 `UNDO_COMMANDS`），**必须加入每个游戏的 `commandTypes`**，否则 `moves` 不会注入。
- **Move payload 必须包装**：UI 调用 move 时必须传 payload 对象，结构与 domain types 保持一致（如 `toggleDieLock({ dieId })`），禁止传裸值。
- **常量使用**：UI 触发系统命令必须使用 `UNDO_COMMANDS.*` 等常量，禁止硬编码字符串。
- **重置清理**：需要 `reset()` 的系统必须保证状态在重开后回到初始值。

---

## 框架复用优先（强制）

- **禁止为特定游戏实现无法复用的系统**。所有UI组件、逻辑Hook、动画系统必须先实现为通用骨架/框架（放在 `/core/` 或 `/components/game/framework/`），游戏层通过配置/回调注入差异。
- **复用架构三层模型**：
  1. `/core/ui/` - 类型契约层（接口定义）
  2. `/components/game/framework/` - 骨架组件层（通用实现，泛型）
  3. `/games/<gameId>/` - 游戏层（样式注入、配置覆盖）
- **新增任何系统/组件/Hook前强制检查清单**：
  1. `find_by_name` 搜索 `/core/`、`/components/game/framework/`、`/engine/` 等目录，检查是否已有相关实现
  2. `grep_search` 搜索关键词（如 "Skeleton"、功能名、Hook名），确认是否已有可复用实现
  3. 若已有实现，必须复用；若需扩展，在框架层扩展而非游戏/模块层重复实现
  4. 若确实需要新建，必须先设计为可跨游戏/跨模块复用的通用实现
- **判定标准**：如果为了复用需要增加大量不必要代码，说明框架设计有问题，必须重新设计而非硬塞。
- **适用范围**：手牌区、出牌区、资源栏、阶段指示器等UI骨架组件。
- **系统层设计原则**：
  - **接口 + 通用逻辑骨架**：系统层包含可跨游戏复用的接口定义和通用逻辑（如边界检查、叠加计算），不包含游戏特化逻辑。
  - **游戏特化下沉**：游戏特有概念放在`/games/<gameId>/`目录。
  - **预设扩展**：常见游戏类型（战斗类、棋盘类）可提供预设扩展，游戏按需引用。
  - **每游戏独立实例**：禁止全局单例，每个游戏创建自己的系统实例并注册定义。
  - **UGC通过AI生成代码**：AI提示词包含系统接口规范，生成符合规范的定义代码，运行时动态注册。
  - **Schema自包含作为备选**：简单UGC场景可用Schema字段直接包含min/max等约束，不依赖系统注册。

---

## EventStreamSystem 使用规范（强制）

> **特效/动画事件消费必须使用 EventStreamSystem**

- UI 层消费事件驱动特效/动画/音效时，**必须**使用 `getEventStreamEntries(G)`（`EventStreamSystem`），**禁止**使用 `getEvents(G)`（`LogSystem`）。
- **原因**：`LogSystem` 是持久化全量日志，刷新后完整恢复；`EventStreamSystem` 是实时消费通道，每条 entry 带稳定自增 `id`，撤销时会清空（避免重播）。用 LogSystem + `useRef(0)` 做消费指针，刷新后指针归零会导致历史事件全部重演。
- **正确模式**：用 `lastSeenEventId = useRef(-1)` 追踪已消费的 `entry.id`；首次挂载时将指针推进到末尾（跳过历史）；后续只处理 `entry.id > lastSeenEventId` 的新事件。
- **参考实现**：`src/games/summonerwars/Board.tsx` 的事件消费 effect、`src/lib/audio/useGameAudio.ts` 的音效去重。

---

## ABILITY_TRIGGERED 事件规范（强制）

- 必须用 `createAbilityTriggeredEvent()` 创建，payload 类型为 `AbilityTriggeredPayload`（`types.ts`），`sourcePosition` 必填。
- **禁止**直接手写 `{ type: SW_EVENTS.ABILITY_TRIGGERED, payload: { ... } }`。
- 回归守卫：`phase-ability-integration.test.ts` 遍历全量技能自动检查。

---

## afterEventsRound 对自动推进链的限制（强制）

- `FlowSystem.afterEvents` 在 `afterEventsRound > 0` 时传空 events 给 `onAutoContinueCheck`，防止事件在多轮中被误读。
- **后果**：`executePipeline` 单次调用中，基于事件检测的自动推进链最多跨越**一个阶段**。例如 `discard → upkeep` 后 upkeep 可自动推进到 income（round 0），但 income 不会继续自动推进到 main1（round 1 events 为空）。
- **对测试的影响**：`createInitializedState`（通过 `applySetupCommands` 调用 `executePipeline`）返回的状态仍然是 **upkeep**（不是 main1），测试中仍需手动 `cmd('ADVANCE_PHASE')` 推进 upkeep → main1。
- **回合切换后**：`discard → upkeep` 的手动推进会触发 upkeep 自动推进到 income，因此测试中 `// upkeep -> income` 的手动推进需要删除，但 `// income -> main1` 仍需保留。
- **详见**：`docs/refactor/dicethrone-auto-advance-upkeep-income.md`

---

## 重赛系统说明

- **多人模式**：重赛投票通过 **socket.io 房间层**实现（`RematchContext` + `matchSocket.ts`），**不走 boardgame.io move**，以绕过 `ctx.gameover` 后禁止 move 的限制。
- **单人模式**：直接调用 `reset()` 函数。
- **架构**：
  - 服务端：`server.ts` 中的 `REMATCH_EVENTS` 事件处理
  - 客户端：`src/services/matchSocket.ts` 服务 + `src/contexts/RematchContext.tsx` 上下文
  - UI：`RematchActions` 组件通过 `useRematch()` hook 获取状态和投票回调
