# 架构设计文档

> 本文档描述 BordGame 桌游平台的整体架构设计，面向项目讲解与技术交接。
> 最后更新：2026-02-11（框架重构完成后）

---

## 1. 项目概览

BordGame 是一个 AI 驱动的现代化桌游平台，核心解决"桌游教学"与"轻量级联机"两大场景。

**核心能力**：
- 多游戏支持：井字棋（TicTacToe）、王权骰铸（DiceThrone）、召唤师战争（SummonerWars）等
- 联机对战 + 本地同屏 + 教学模式
- 撤销/重赛/Prompt 选择/响应窗口等跨游戏通用系统
- 分步教学系统（教程引导 + AI 自动行动）
- 数据驱动的游戏规则引擎

**技术栈**：React 19 + TypeScript / Vite 7 / Tailwind CSS 4 / framer-motion / boardgame.io / Canvas 2D 粒子引擎 / WebGL Shader / i18next / howler / socket.io / Node.js (Koa + NestJS) / MongoDB / Vitest + Playwright

---

## 2. 宏观分层架构

```
┌─────────────────────────────────────────────────────┐
│                     UI 层 (React)                    │
│  pages/ · components/ · contexts/ · hooks/           │
├─────────────────────────────────────────────────────┤
│                   游戏层 (games/)                     │
│  每游戏独立目录：domain/ + Board.tsx + game.ts        │
├─────────────────────────────────────────────────────┤
│                   引擎层 (engine/)                    │
│  adapter · pipeline · systems/ · primitives/         │
├─────────────────────────────────────────────────────┤
│              框架核心 (core/) + boardgame.io          │
│  类型契约 · 资源管理 · 游戏注册                        │
├─────────────────────────────────────────────────────┤
│                   服务端 (server/)                    │
│  boardgame.io Server · socket.io · MongoDB · NestJS  │
└─────────────────────────────────────────────────────┘
```

**依赖方向**（严格单向，禁止反向 import）：

```
UI 层 → 游戏层 → 引擎层 → 框架核心
                           ↓
                      boardgame.io
```

---

## 3. 引擎层（核心架构）

引擎层是整个框架重构的核心产物，位于 `src/engine/`。设计目标：**游戏无关、确定性、可序列化、支持撤销/回放/审计**。

### 3.1 统一状态形状 MatchState

所有游戏共享统一的顶层状态结构：

```typescript
interface MatchState<TCore> {
    sys: SystemState;   // 系统状态（Undo/Prompt/Flow/Log/Tutorial 等）
    core: TCore;        // 游戏领域状态（由各游戏定义）
}
```

- `sys`：引擎系统管理，跨游戏通用，包含撤销快照、Prompt 队列、阶段信息、事件流、教程状态等
- `core`：游戏领域状态，由各游戏的 `DomainCore.setup()` 初始化，完全由游戏层控制

### 3.2 Command/Event 模型

引擎采用 **命令-事件分离** 模型：

```
Command（玩家意图）→ validate → execute → Event[]（权威后果）→ reduce → 新状态
```

- **Command**：玩家操作的声明式描述（type + playerId + payload）
- **Event**：命令执行产生的权威事件，作为状态变更的唯一来源
- **reduce**：确定性 reducer，将事件应用到 core 状态（纯函数，无副作用）

这种设计保证了：
- 状态变更可追溯（所有变更都有对应事件）
- 支持撤销（回滚到快照）
- 支持回放（重放事件序列）

### 3.3 执行管线 (Pipeline)

`executePipeline()` 是命令执行的核心流程，定义在 `src/engine/pipeline.ts`：

```
1. Systems.beforeCommand hooks（系统拦截/消费命令）
   ↓
2. Domain.validate（领域校验命令合法性）
   ↓
3. Domain.execute（产生事件）+ Domain.postProcess（派生事件）
   ↓
4. Domain.interceptEvent → Domain.reduce（逐事件应用到 core）
   ↓
5. Systems.afterEvents hooks（多轮迭代，更新 sys 状态）
```

**关键设计**：
- **系统消费命令**：FlowSystem 的 `ADVANCE_PHASE`、UndoSystem 的撤销命令等由系统在 `beforeCommand` 阶段拦截（`halt: true`），不会到达领域层
- **多轮 afterEvents**：系统产生的新事件（如阶段切换事件）会触发新一轮 afterEvents，让其他系统响应（最多 10 轮，防止无限循环）
- **事件拦截**：`interceptEvent` 支持替代效果（Replacement Effects），如"若你将受到伤害，改为…"
- **后处理**：`postProcess` 支持类似万智牌 State-Based Actions，扫描事件流注入派生事件

### 3.4 适配器 (Adapter)

`createGameAdapter()` 将 `DomainCore + Systems` 组装为 boardgame.io `Game` 对象，定义在 `src/engine/adapter.ts`。

适配器的职责：
- 将 boardgame.io 的 `moves` 翻译为引擎层 `Command`
- 封装 boardgame.io 的 `random` 为引擎层 `RandomFn`
- 处理模式差异（local/online/tutorial）
- 旁观者拦截（spectator 模式下阻止状态修改）
- 教程模式下的确定性随机数（`TutorialRandomPolicy`）
- `playerView` 过滤（隐藏信息）

```typescript
// 游戏只需声明领域内核 + 系统 + 命令类型
export const TicTacToe = createGameAdapter({
    domain: TicTacToeDomain,
    systems,
    commandTypes: ['CLICK_CELL', ...],
});
```

### 3.5 领域内核接口 (DomainCore)

每个游戏实现 `DomainCore<TState, TCommand, TEvent>` 接口：

```typescript
interface DomainCore<TState, TCommand, TEvent> {
    gameId: string;
    setup(playerIds, random): TState;           // 初始化 core
    validate(state, command): ValidationResult;  // 校验命令
    execute(state, command, random): TEvent[];   // 产生事件
    reduce(state, event): TState;                // 应用事件（纯函数）
    postProcess?(state, events): TEvent[];       // 派生事件
    interceptEvent?(state, event): ...;          // 替代效果
    playerView?(state, playerId): Partial;       // 隐藏信息
    isGameOver?(state): GameOverResult | undefined;
}
```

**领域层组织**（以 `src/games/<gameId>/domain/` 为例）：
- `types.ts` — 领域类型定义（core 状态、命令、事件）
- `ids.ts` — 领域 ID 常量表（`as const`，禁止字符串字面量）
- `commands.ts` — 命令校验逻辑（validate）
- `reducer.ts` — 事件处理（execute + reduce）
- `rules.ts` — 规则计算（阶段推进条件、下一阶段等）
- `index.ts` — 组装并导出 DomainCore 实例

---

## 4. 系统层 (Systems)

系统以插件方式承载跨游戏能力，通过 hook 参与 command/event 管线。位于 `src/engine/systems/`。

### 4.1 系统接口

```typescript
interface EngineSystem<TCore> {
    id: string;
    name: string;
    priority?: number;       // 越小越先执行
    setup?(playerIds): Partial<SystemState>;
    beforeCommand?(ctx): HookResult | void;
    afterEvents?(ctx): HookResult | void;
    playerView?(state, playerId): Partial<SystemState>;
}
```

### 4.2 内置系统清单

| 系统 | ID | 优先级 | 职责 |
|------|------|--------|------|
| UndoSystem | undo | 10 | 自动快照 + 多人握手撤销 |
| ResponseWindowSystem | responseWindow | 15 | 多玩家响应队列（如防御/反击窗口） |
| PromptSystem | prompt | 20 | 选择弹窗（单选/多选 + 队列） |
| FlowSystem | flow | 25 | 阶段流程管理（ADVANCE_PHASE） |
| LogSystem | log | 默认 | 持久化全量命令/事件日志 |
| EventStreamSystem | eventStream | 默认 | 实时事件消费通道（UI 特效/音效） |
| ActionLogSystem | actionLog | 默认 | 结构化操作日志（卡牌预览） |
| RematchSystem | rematch | 默认 | 重赛投票状态 |
| TutorialSystem | tutorial | 默认 | 教程步骤管理 + AI 行动 + 命令门控 |
| CheatSystem | cheat | 默认 | 开发模式作弊（资源/骰子/阶段） |
| CharacterSelectionSystem | — | — | 角色选择流程（选角/准备/开始） |

**ActionLogSystem 约束（重要）**：
- ActionLogSystem 只负责收集日志；文案与语义由游戏层 `formatEntry` 提供。
- `formatEntry` 支持返回多条日志（命令级 + 事件级），覆盖所有**玩家可见的状态变化**，但不记录纯 UI 交互。
- 日志必须使用 i18n key；卡牌类日志用 `ActionLogSegment` 的 card 片段供 hover 预览。
- 事件级日志必须从事件 payload/当前棋盘解析实体信息，避免依赖 UI 状态。

### 4.3 FlowSystem（阶段管理）

FlowSystem 是复杂游戏的核心系统，通过 `FlowHooks` 实现游戏特化：

```typescript
interface FlowHooks<TCore> {
    initialPhase: string;
    canAdvance?(args): CanAdvanceResult;
    getNextPhase(args): string;
    onPhaseExit?(args): GameEvent[] | PhaseExitResult | void;
    onPhaseEnter?(args): GameEvent[] | void;
    getActivePlayerId?(args): PlayerId;
    onAutoContinueCheck?(args): { autoContinue: boolean; playerId: string } | void;
}
```

**设计原则**：
- `sys.phase` 是阶段的**单一权威来源**
- `ADVANCE_PHASE` 命令统一由 FlowSystem 消费
- 游戏层只通过 FlowHooks 定义阶段规则，不直接操作 phase
- 支持阶段覆盖（`overrideNextPhase`）、阶段跳过（`halt`）、自动推进（`onAutoContinueCheck`）

### 4.4 UndoSystem（撤销系统）

- 基于快照的撤销（`beforeCommand` 时存储完整状态快照）
- 白名单机制：只对指定命令类型做快照（`snapshotCommandAllowlist`）
- 多人握手：请求 → 批准/拒绝/取消
- 撤销时清空 EventStream（防止特效重播）

### 4.5 默认系统集合

```typescript
function createDefaultSystems<TCore>(config?): EngineSystem<TCore>[] {
    return [
        createLogSystem(),
        createActionLogSystem(config?.actionLog),
        createUndoSystem(config?.undo),
        createPromptSystem(),
        createRematchSystem(),
        createResponseWindowSystem(),
        createTutorialSystem(),
        createEventStreamSystem(),
    ];
}
```

游戏可在此基础上追加系统（如 FlowSystem、CheatSystem、游戏专用系统）。

---

## 5. 引擎原语层 (Primitives)

位于 `src/engine/primitives/`，提供跨游戏复用的纯函数工具库。

**核心原则**：复用工具函数，不复用领域概念。提供框架让游戏注册自己的处理器，而非预定义效果类型。

| 模块 | 职责 |
|------|------|
| `expression.ts` | 表达式树求值（算术 + 变量 + 条件） |
| `condition.ts` | 条件评估（布尔组合 + 比较 + 自定义处理器注册） |
| `effects.ts` | 效果执行框架（游戏注册处理器，引擎只负责调度） |
| `resources.ts` | 资源管理（get/set/modify/canAfford/pay + 边界钳制） |
| `dice.ts` | 骰子操作（创建/掷骰/统计/顺子判断） |
| `zones.ts` | 卡牌区域操作（hand/deck/discard 间的标准移动） |
| `target.ts` | 目标解析框架（内置 self/opponent/all + 自定义解析器） |
| `visual.ts` | 视觉资源解析器（基于实体定义自动解析图片/动画） |
| `actionRegistry.ts` | 统一的 actionId → handler 注册表 |

**注册器模式**（以 condition 为例）：

```typescript
// 引擎层：提供框架
const registry = createConditionHandlerRegistry();

// 游戏层：注册自定义处理器
registerConditionHandler(registry, 'hasDiceSet', (params, ctx) => {
    // 游戏特定逻辑
});

// 引擎层：评估（不关心具体语义）
evaluateCondition(node, ctx, registry);
```

---

## 6. 游戏层

每个游戏位于 `src/games/<gameId>/`，结构如下：

```
src/games/<gameId>/
├── domain/              # 领域层（纯逻辑，无 UI 依赖）
│   ├── types.ts         # 领域类型
│   ├── ids.ts           # 常量表
│   ├── commands.ts      # 命令校验
│   ├── reducer.ts       # 事件处理
│   ├── rules.ts         # 规则计算
│   └── index.ts         # DomainCore 导出
├── ui/                  # UI 子组件
├── __tests__/           # 领域测试
├── Board.tsx            # 棋盘 UI 组件
├── game.ts              # 游戏定义（适配器组装）
├── manifest.ts          # 游戏清单元数据
├── tutorial.ts          # 教程配置
└── types.ts             # 对外类型重导出
```

### 6.1 游戏注册

采用**清单驱动**的注册机制：

1. `manifest.ts`：纯数据元信息（id、标题、分类、是否启用等）
2. `manifest.generated.ts`：脚本生成的权威清单聚合
3. `registry.ts`：运行时从清单构建 `GameImplementation` 映射表
4. 服务端 / 客户端各有独立清单（`manifest.server.ts` / `manifest.client.tsx`）

```typescript
interface GameManifestEntry {
    id: string;
    type: 'game' | 'tool';
    enabled: boolean;
    category: 'strategy' | 'casual' | 'party' | 'abstract' | 'tools';
    allowLocalMode?: boolean;
    // ...
}
```

### 6.2 游戏复杂度梯度

| 游戏 | 复杂度 | 使用的系统 |
|------|--------|-----------|
| TicTacToe | 简单 | Log + ActionLog + Undo + Prompt + Rematch + Tutorial |
| DiceThrone | 复杂 | 上述 + FlowSystem + EventStream + CheatSystem + 游戏专用系统 |
| SummonerWars | 复杂 | 上述 + FlowSystem + EventStream + CheatSystem + 技能注册表 |

---

## 7. UI 与上下文层

### 7.1 Context 系统

全局状态通过 React Context 注入，位于 `src/contexts/`：

| Context | 职责 |
|---------|------|
| AuthContext | JWT 登录态、用户信息 |
| AudioContext | 音频管理（BGM/SFX/音量） |
| ModalStackContext | 弹窗栈管理 |
| ToastContext | Toast 通知（去重 + TTL） |
| SocialContext | 好友/消息/在线状态 |
| RematchContext | 重赛投票（socket 层） |
| UndoContext | 撤销 UI 桥（`useSyncExternalStore`） |
| TutorialContext | 教程 UI 桥 |
| GameModeContext | 模式注入（local/online/tutorial） |
| DebugContext | 调试玩家视角切换 |

### 7.2 三层 UI 复用模型

```
/core/ui/                        → 类型契约层（接口定义）
/components/game/framework/      → 骨架组件层（跨游戏复用）
/games/<gameId>/                 → 游戏层（样式注入、配置覆盖）
```

骨架组件包括：HandAreaSkeleton、PlayerPanelSkeleton、ResourceTraySkeleton、PhaseIndicatorSkeleton、SpotlightSkeleton 等。

框架层工具 Hooks（`/components/game/framework/hooks/`）：

| Hook | 职责 |
|------|------|
| `useGameBoard` | 棋盘核心状态（视角、连接、布局） |
| `useHandArea` | 手牌区状态（拖拽、选中、过滤） |
| `useResourceTray` | 资源栏状态 |
| `useDragCard` | 卡牌拖拽交互 |
| `useAutoSkipPhase` | 无可用操作时自动跳过阶段，内置多步骤交互守卫 |
| `useVisualSequenceGate` | 视觉序列门控：beginSequence/endSequence 括住动画，scheduleInteraction 延迟交互，支持嵌套、isVisualBusy、reset |

### 7.3 FX 特效系统

位于 `src/engine/fx/`，提供事件驱动的特效调度：

- **FxRegistry**：Cue 注册表（事件类型 → 渲染器映射）
- **useFxBus**：事件总线 Hook（消费 EventStream 触发特效）
- **FxLayer**：特效渲染层
- **WebGL Shader 子系统**：`ShaderCanvas` + `ShaderMaterial` + GLSL 噪声库

---

## 8. 服务端架构

### 8.1 入口与协议

- `server.ts`：主入口，组装 boardgame.io Server + socket.io
- boardgame.io 提供游戏状态同步（WebSocket）
- socket.io 提供大厅/社交/重赛/聊天等独立实时通道

### 8.2 服务层

```
server.ts                        # 游戏服务入口
├── boardgame.io Server          # 游戏状态同步
├── socket.io namespace          # 大厅/重赛/聊天
├── HybridStorage                # 状态持久化（MongoDB）
└── NestJS API (server/)         # RESTful API（认证/好友/评论等）
```

### 8.3 实时通信

| 通道 | 文件 | 用途 |
|------|------|------|
| lobbySocket | `src/services/lobbySocket.ts` | 房间列表实时订阅 |
| matchSocket | `src/services/matchSocket.ts` | 对局内重赛投票 + 聊天 |
| socialSocket | `src/services/socialSocket.ts` | 好友在线/消息/邀请 |

---

## 9. 测试架构

### 9.1 测试分层

| 层级 | 框架 | 目录 | 覆盖范围 |
|------|------|------|---------|
| 领域测试 | Vitest + GameTestRunner | `src/games/<gameId>/__tests__/` | 游戏规则、命令校验、状态流转 |
| 系统测试 | Vitest | `src/engine/systems/__tests__/` | 引擎系统逻辑 |
| 原语测试 | Vitest | `src/engine/primitives/__tests__/` | 引擎原语函数 |
| API 测试 | Vitest | `apps/api/test/` | NestJS API 集成 |
| E2E 测试 | Playwright | `e2e/` | 完整用户流程 + 交互面 |

### 9.2 GameTestRunner

引擎级的通用测试运行器，通过 `executePipeline` 执行测试，确保 sys/core/Systems 行为一致：

```typescript
const runner = new GameTestRunner({
    domain: MyGameDomain,
    systems: [...],
    playerIds: ['0', '1'],
    assertFn: myAssertFn,
});

runner.runAll([
    {
        name: '正常流程',
        commands: [
            { type: 'CLICK_CELL', playerId: '0', payload: { cellId: 0 } },
        ],
        expect: { winner: '0' },
    },
    {
        name: '非法操作',
        commands: [...],
        expect: { expectError: { command: 'CLICK_CELL', error: 'cell_occupied' } },
    },
]);
```

### 9.3 测试规模

当前测试规模：**177 个测试文件 / 2145 个测试用例**，全部通过。

---

## 10. 关键数据流

### 10.1 玩家操作的完整链路

```
用户点击 UI
  → Board.tsx 调用 moves.CLICK_CELL({ cellId: 0 })
    → boardgame.io 序列化 move
      → Adapter createMoveHandler 构造 Command
        → executePipeline(config, state, command, random, playerIds)
          → Systems.beforeCommand（Undo 快照、Flow 拦截等）
          → Domain.validate → Domain.execute → Event[]
          → Domain.reduce（逐事件更新 core）
          → Systems.afterEvents（多轮：Log/EventStream/ActionLog/Flow 自动推进）
        ← PipelineResult { success, state, events }
      → Object.assign(G, result.state)  // Immer 代理写入
    → boardgame.io 广播状态
  → React 重渲染 Board.tsx
```

### 10.2 EventStream 消费链路（特效/音效）

```
事件产生 → EventStreamSystem 追加 entry（带自增 id）
  → UI 层 useEffect 监听 G.sys.eventStream.entries
    → 对比 lastSeenEventId，只处理新事件
      → FxRegistry 查找渲染器 → 播放特效
      → AudioManager 查找音效 key → 播放音效
```

---

## 11. 模式差异

| 特性 | local | online | tutorial |
|------|-------|--------|----------|
| 入口 | `/play/:gameId/local` | MatchRoom | MatchRoom |
| 领域校验 | `skipValidation=true` | 严格校验 | `skipValidation=true` |
| 玩家身份 | hotseat（core.currentPlayer） | 按 playerID 限制 | hotseat + AI 行动 |
| 随机数 | boardgame.io 随机 | boardgame.io 随机 | TutorialRandomPolicy 覆盖 |
| 旁观者 | 不适用 | 阻止 move | 不适用 |

---

## 12. 目录结构总览

```
/ (repo root)
├── server.ts                     # 游戏服务入口
├── src/
│   ├── engine/                   # 引擎层
│   │   ├── adapter.ts            #   boardgame.io 适配器工厂
│   │   ├── pipeline.ts           #   Command/Event 执行管线
│   │   ├── types.ts              #   核心类型定义
│   │   ├── notifications.ts      #   引擎通知分发
│   │   ├── systems/              #   系统层（10+ 个系统）
│   │   ├── primitives/           #   原语层（纯函数工具库）
│   │   ├── testing/              #   GameTestRunner
│   │   ├── hooks/                #   引擎级 React Hooks
│   │   └── fx/                   #   特效系统（Canvas + WebGL）
│   ├── core/                     #   框架核心类型与资源管理
│   ├── games/                    #   游戏实现
│   │   ├── <gameId>/domain/      #     领域层
│   │   ├── <gameId>/Board.tsx    #     棋盘 UI
│   │   ├── <gameId>/game.ts      #     适配器组装
│   │   ├── manifest.ts           #     权威游戏清单
│   │   └── registry.ts           #     运行时注册表
│   ├── components/               #   通用 UI 组件
│   │   ├── game/framework/       #     跨游戏复用骨架
│   │   ├── common/               #     通用组件（动画/弹窗/媒体）
│   │   └── system/               #     系统级 UI（悬浮球/Toast/Modal）
│   ├── contexts/                 #   全局 Context（Auth/Audio/Modal 等）
│   ├── pages/                    #   页面入口
│   ├── services/                 #   socket 通信封装
│   ├── hooks/                    #   通用 Hooks
│   ├── lib/                      #   底层工具库（i18n/audio）
│   └── ugc/                      #   UGC Builder
├── server/                       #   服务端共享模块
├── e2e/                          #   Playwright E2E 测试
├── docs/                         #   研发文档
└── openspec/                     #   变更规范与提案
```

---

## 13. 设计决策与约束

### 13.1 为什么 Command/Event 而非直接 Reducer

- **可审计**：所有状态变更都有对应事件记录
- **可撤销**：快照基于完整状态，事件流用于回放验证
- **系统介入点**：beforeCommand/afterEvents hook 让系统在不侵入领域代码的情况下参与
- **派生事件**：postProcess/interceptEvent 支持复杂规则交互（万智牌式 SBA、替代效果）

### 13.2 为什么 sys/core 分离

- **系统状态独立**：Undo/Prompt/Tutorial 等系统不会与游戏状态耦合
- **领域纯净**：reduce 只操作 core，系统状态由系统自己在 afterEvents 中更新
- **playerView 分层**：领域层和系统层各自过滤，互不干扰

### 13.3 为什么原语层不预定义效果类型

- **避免过早抽象**：不同游戏的"伤害""治疗"语义差异大
- **注册器模式**：游戏注册自己的处理器，引擎只负责调度
- **UGC 友好**：AI 可基于接口规范生成符合框架的效果处理器

### 13.4 确定性保证

- 所有随机数通过 `RandomFn` 接口注入（由 boardgame.io 提供确定性随机）
- 教程模式通过 `TutorialRandomPolicy` 覆盖随机数
- `reduce` 必须是纯函数，禁止读取外部状态
- 时间戳由管线统一分配，不使用 `Date.now()`

---

## 附录：关键文件索引

| 用途 | 路径 |
|------|------|
| 引擎核心类型 | `src/engine/types.ts` |
| 执行管线 | `src/engine/pipeline.ts` |
| 适配器工厂 | `src/engine/adapter.ts` |
| 系统层入口 | `src/engine/systems/index.ts` |
| 原语层入口 | `src/engine/primitives/index.ts` |
| 框架核心类型 | `src/core/types.ts` |
| 游戏清单 | `src/games/manifest.ts` |
| 游戏注册表 | `src/games/registry.ts` |
| 测试运行器 | `src/engine/testing/index.ts` |
| 测试规范 | `docs/automated-testing.md` |
| 引擎系统规范 | `docs/ai-rules/engine-systems.md` |
