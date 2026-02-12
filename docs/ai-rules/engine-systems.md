# 引擎与框架系统完整规范

> 本文档是 `AGENTS.md` 的补充，包含引擎层系统清单、框架解耦要求、EventStream 等详细规范。
> **触发条件**：开发/修改引擎系统、框架层代码、游戏 move/command 时阅读。

---

## 引擎层概述

- **Domain Core**：游戏规则以 Command/Event + Reducer 形式实现，确保确定性与可回放。
- **Systems**：Undo/Interaction/Log 等跨游戏能力以 hook 管线方式参与执行。
- **Adapter**：Boardgame.io moves 仅做输入翻译，规则主体在引擎层。自动合并所有系统命令到 commandTypes。
- **统一状态**：`G.sys`（系统状态） + `G.core`（领域状态）。

---

## 引擎层系统清单

- `engine/systems/` - Flow/Interaction/Undo/Log/EventStream/ResponseWindow/Tutorial/Rematch/Cheat/ActionLog 等跨游戏系统
- `engine/primitives/` - condition/effects/dice/resources/target/zones/expression/visual/actionRegistry 等引擎原语模块（纯函数/注册器）
  - `visual.ts` — **VisualResolver**：基于约定的视觉资源解析器，通过实体定义（如 TokenDef）的 atlasId 自动解析图片/动画资源
  - `actionRegistry.ts` — **ActionHandlerRegistry**：统一的 actionId → handler 注册表，替代 if/else 硬编码分发
- `engine/testing/` - 测试工具
  - `referenceValidator.ts` — **validateReferences + extractRefChains**：实体引用链完整性验证，检测定义与注册表之间的断裂引用
  - `entityIntegritySuite.ts` — **createRegistryIntegritySuite / createRefChainSuite / createTriggerPathSuite / createEffectContractSuite**：四个测试套件工厂，生成标准化 describe/it 测试块，用于数据定义的自动化契约验证
- `FxSystem` (`src/engine/fx/`) - 视觉特效调度（Cue 注册表 + 事件总线 + 渲染层 + WebGL Shader 子系统 + FeedbackPack 反馈包），游戏侧通过 `fxSetup.ts` 注册渲染器并声明反馈包（音效 + 震动）。`useFxBus` 接受 `{ playSound, triggerShake }` 选项注入反馈能力，push 事件时自动触发 `timing='immediate'` 反馈，渲染器调用 `onImpact()` 时自动触发 `timing='on-impact'` 反馈。Shader 包装组件在模块顶层调用 `registerShader()` 自注册到预编译队列，`useFxBus` 挂载时调用 `flushRegisteredShaders()` 自动预编译所有已注册的 shader（`ShaderPrecompile`）。Shader 管线（`src/engine/fx/shader/`）提供 `ShaderCanvas` + `ShaderMaterial` + `ShaderPrecompile` + GLSL 噪声库，用于逐像素流体特效。

---

## 新引擎系统注意事项（强制）

- **数据驱动优先（强制）**：规则/配置/清单优先做成可枚举的数据（如 manifest、常量表、定义对象），由引擎/系统解析执行；避免在组件或 move 内写大量分支硬编码，确保可扩展、可复用、可验证。
- **领域 ID 常量表（强制）**：所有领域内的稳定 ID（如状态效果、Token、骰面符号、命令类型）必须在 `domain/ids.ts` 中定义常量表，禁止在代码中直接使用字符串字面量（如 `'knockdown'`、`'taiji'`）。
  - **常量表结构**：使用 `as const` 确保类型安全，并导出派生类型（如 `StatusId`、`TokenId`）。
  - **示例**：`STATUS_IDS.KNOCKDOWN`、`TOKEN_IDS.TAIJI`、`DICE_FACE_IDS.FIST`。
  - **例外**：国际化 key（如 `t('dice.face.fist')`）、类型定义（如 `type DieFace = 'fist' | ...`）可保留字符串字面量。
- **新机制先检查引擎**：实现新游戏机制前，必须先检查 `src/engine/primitives/` 或 `src/engine/systems/` 是否已有对应能力；若无，必须先在引擎层抽象通用类型和接口，再在游戏层实现。原因：UGC 游戏需要复用这些能力。充分考虑未来可能性而不是只看当下。

---

## 效果数据契约测试规范（强制）

> **新增游戏/英雄/卡牌/Token 定义时，必须同步编写契约测试**

### 背景

数据驱动架构中，效果定义（abilities/cards/tokens）的隐式契约（如"需要 random 的 action 必须有显式 timing"）无法被 TypeScript 类型系统捕获。这些契约违反会导致效果静默跳过、功能不触发等难以排查的 bug。

### 工厂函数

引擎层提供 `createEffectContractSuite<TSource, TEffect>` 工厂（`src/engine/testing/entityIntegritySuite.ts`），接受：

- `getSources()` — 获取所有数据源（如英雄定义、卡牌数组）
- `getSourceId()` — 从数据源提取 ID（用于错误定位）
- `extractEffects()` — 从数据源提取所有效果
- `rules: EffectContractRule[]` — 契约规则列表
- `minSourceCount` — 最少数据源数量（防止空跑）

每条 `EffectContractRule` 定义：
- `name` — 规则名称（测试标题）
- `appliesTo(effect)` — 筛选适用的效果子集
- `check(effect)` — 返回 true 表示通过
- `describeViolation(effect)` — 违反时的错误描述

### 使用方式

每个游戏在 `__tests__/entity-chain-integrity.test.ts` 中注册契约规则：

```typescript
import { createEffectContractSuite, type EffectContractRule } from '../../../engine/testing/entityIntegritySuite';

const rules: EffectContractRule<MyEffect>[] = [
    {
        name: '需要 random 的 action 必须有显式 timing',
        appliesTo: (e) => ACTIONS_REQUIRING_RANDOM.has(e.action?.type),
        check: (e) => e.timing !== undefined,
        describeViolation: (e) => `action "${e.action.type}" 缺少 timing`,
    },
];

createEffectContractSuite({
    suiteName: '技能效果数据契约',
    getSources: getAllAbilityDefs,
    getSourceId: (entry) => `${entry.heroId}/${entry.ability.id}`,
    extractEffects: extractAbilityEffects,
    rules,
    minSourceCount: 20,
});
```

### 三类契约（DiceThrone 参考）

| 类别 | 数据源 | 典型规则 |
|------|--------|----------|
| 技能效果 | `AbilityDef.effects` + `variants` | random action 需 timing、rollDie 需 conditionalEffects、customActionId 需注册 |
| 卡牌效果 | `AbilityCard.effects` | 主阶段卡 custom/rollDie/drawCard 需 `timing: 'immediate'`、replaceAbility 需完整字段 |
| Token 被动触发 | `TokenDef.passiveTrigger.actions` | customActionId 需注册 |

### 强制要求

- **新增英雄/卡牌/Token**：必须确保现有契约规则覆盖新数据，运行测试验证通过。
- **新增效果类型/action type**：必须评估是否需要新增契约规则。
- **新增游戏**：必须创建 `entity-chain-integrity.test.ts` 并注册该游戏的契约规则。
- **参考实现**：`src/games/dicethrone/__tests__/entity-chain-integrity.test.ts`

---

## 禁止 if/else 硬编码 actionId 分发（强制）

- 处理多个 actionId/effectType/customId 时，**禁止**使用 if/else 或 switch-case 硬编码分发。
- **正确做法**：使用 `ActionHandlerRegistry`（引擎层）或游戏层注册表（如 SmashUp 的 `registerAbility()`、SummonerWars 的 `swCustomActionRegistry`）。
- **原因**：注册表模式支持 entity-chain-integrity 测试自动检测断裂引用，if/else 无法被静态分析。
- **参考**：
  - DiceThrone: `registerCustomActionHandler()` in `effects.ts`
  - SummonerWars: `swCustomActionRegistry` in `customActionHandlers.ts`
  - SmashUp: `registerAbility()` in `abilityRegistry.ts`

---

## 框架解耦要求（强制）

> **目标**：`src/engine/primitives/` 和 `src/engine/systems/` 与具体游戏完全解耦，支持 UGC 复用。

- **禁止**：框架层 import 游戏层模块；框架默认注册/启用游戏特定功能；用 `@deprecated` 标记保留耦合代码。
- **正确做法**：框架提供通用接口与注册表，游戏层显式注册扩展（如 `conditionRegistry.register('diceSet', ...)`）。
- **发现耦合时**：立即报告并将游戏特定代码迁移到 `games/<gameId>/`，不得以"后续处理"搪塞。
- **系统注册**：新系统必须在 `src/engine/systems/` 实现，并在 `src/engine/systems/index.ts` 导出；如需默认启用，必须加入 `createDefaultSystems()`。
- **状态结构**：系统新增状态必须写入 `SystemState` 并由系统 `setup()` 初始化；禁止把系统状态塞进 `core`。
- **命令可枚举**：系统命令（FLOW/UNDO/REMATCH/INTERACTION/TUTORIAL/RESPONSE_WINDOW/CHEAT）**由 adapter 自动合并**到 `commandTypes`，游戏层只需列出业务命令，禁止手动添加系统命令。
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
- **框架层 Hooks 清单**（`/components/game/framework/hooks/`）：
  - `useGameBoard` — 棋盘核心状态（视角、连接、布局）
  - `useHandArea` — 手牌区状态（拖拽、选中、过滤）
  - `useResourceTray` — 资源栏状态
  - `useDragCard` — 卡牌拖拽交互
  - `useAutoSkipPhase` — 无可用操作时自动跳过阶段，内置多步骤交互守卫（游戏层注入 `hasAvailableActions` + `hasActiveInteraction`）
  - `useVisualSequenceGate` — 视觉序列门控（类似 Unity 动画事件）：`beginSequence`/`endSequence` 括住阻塞性动画，期间 `scheduleInteraction(fn)` 自动入队延迟到序列结束后执行；支持嵌套计数、`isVisualBusy` 响应式标记（用于门控游戏结束 overlay 等）、`reset()` 清空
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

## ActionLogSystem 使用规范（强制）

> **操作日志必须由游戏层提供语义化文案**

- ActionLogSystem 只负责收集/落库日志，严禁在系统层硬编码游戏文案。
- `formatEntry` 必须返回 i18n key 的文本片段（`ActionLogSegment`），禁止直接拼接硬编码字符串。
- 需要覆盖所有**玩家可见的状态变化**（伤害、治疗、摧毁、移动、资源变化、VP 等），但**不记录纯 UI 行为**。
- 支持多条日志返回：命令级日志 + 同步事件级日志，确保回放时可完整还原过程。
- 卡牌类日志必须使用 `card` 片段以支持 hover 预览（并确保 cardId 可从事件或棋盘解析得到）。

### 音效与动画的分流规则（强制）

- **无动画事件**（投骰子、出牌、阶段切换等）：`feedbackResolver` 返回 `{ key, timing: 'immediate' }`，框架层立即播放。
- **有动画事件**（伤害、治疗、状态增减、Token 增减）：`feedbackResolver` 返回 `{ key, timing: 'on-impact' }`，框架层将音效写入 `DeferredSoundMap`，动画层在冲击帧调用 `playDeferredSound(eventId)` 消费。
- **FX 特效绑定音效/震动**：通过 `FeedbackPack` 在 `fxSetup.ts` 注册时声明，`useFxBus` 自动在 push（immediate）或渲染器 `onImpact()`（on-impact）时触发。禁止在 `useGameEvents` 中手动传 `params.onImpact` 回调。
- **原因**：引擎管线在一个 batch 内同步生成所有事件，但动画有飞行时间；若在事件生成时立即播音，所有音效会同时响起而动画尚未到达，视听不同步。

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

---

## 领域层编码规范详解（强制）

> 本节是 AGENTS.md「领域层编码规范」的详细补充。写任何游戏的 domain/ 代码时必须遵守。

### Reducer 结构共享范例

✅ 正确写法（只 spread 变更路径）：
```typescript
const handleDamageDealt = (core: GameCore, event: DamageDealtEvent): GameCore => {
    const { targetId, amount } = event.payload;
    const target = core.players[targetId];
    if (!target) return core;  // 无变更时返回原引用
    const newHp = Math.max(0, target.hp - amount);
    if (newHp === target.hp) return core;  // 值未变，跳过
    return {
        ...core,
        players: {
            ...core.players,
            [targetId]: { ...target, hp: newHp },
        },
    };
};
```

❌ 禁止写法（全量深拷贝）：
```typescript
// 禁止！每次事件都全量 clone 整个状态树，含 deck/hand/tokenDefinitions 等大结构
const handleDamageDealt = (core: GameCore, event: DamageDealtEvent): GameCore => {
    const newState = JSON.parse(JSON.stringify(core));  // ❌
    newState.players[event.payload.targetId].hp -= event.payload.amount;
    return newState;
};
```

**嵌套 ≥3 层时提取 helper**：
```typescript
// domain/utils.ts
export const updatePlayer = <T extends { players: Record<string, P> }, P>(
    core: T, pid: string, updater: (p: P) => P
): T => {
    const player = core.players[pid];
    if (!player) return core;
    const updated = updater(player);
    if (updated === player) return core;
    return { ...core, players: { ...core.players, [pid]: updated } };
};

// 使用时
return updatePlayer(core, targetId, p => ({ ...p, hp: Math.max(0, p.hp - amount) }));
```

### types.ts 默认拆分模板

中等以上复杂度游戏（命令数 ≥5 或有多阶段回合）从第一天就用此结构：
```
domain/
  types.ts            # re-export barrel: export * from './core-types'; export * from './commands'; export * from './events';
  core-types.ts       # 状态接口（PlayerState, GameCore, 基础类型如 DieFace/CharacterId）
  commands.ts         # 命令类型定义（interface XxxCommand, type GameCommand 联合）
  events.ts           # 事件类型定义（interface XxxEvent, type GameEvent 联合）
```

`types.ts` 为 re-export barrel：
```typescript
// 统一导出，外部仍 import from './types'
export * from './core-types';
export * from './commands';
export * from './events';
```

### Core 状态设计决策树

添加字段到 core 前，按顺序检查：
1. **该字段是否被 `reduce()` 写入？** → 否：不属于 core
2. **该字段是否被 `validate()` / `execute()` / `isGameOver()` 读取并影响决策？** → 否：不属于 core
3. **该字段是“等待玩家输入”的交互状态吗？** → 是：放 `sys.interaction`
4. **该字段仅用于 UI 展示（如最后一次操作的视觉反馈）？** → 是：通过 EventStreamSystem 事件传递
5. **以上都不是，确实影响规则** → 允许放入 core，**必须注释规则依赖**

示例：
- `pendingAttack`：影响防御阶段流转和伤害结算 → ✅ 属于 core（需注释）
- `lastBonusDieRoll`：仅用于 UI 展示奖励骰结果 → ❌ 应走 EventStream
- `pendingInteraction`：等待玩家输入 → ❌ 应走 `sys.interaction`

### 游戏内工具函数规则

每个游戏的 `domain/utils.ts` **从第一天就建立**：
```
domain/
  utils.ts            # 游戏内共享工具
    applyEvents()     # 批量应用事件到 core
    getGameMode()     # 读取当前游戏模式
    getOpponentId()   # 获取对手 ID
    updatePlayer()    # 结构共享 helper
```

**规则**：
- `utils.ts` 从项目初始化时就创建，不等“需要时”再加。
- 一个函数在 ≥2 个 domain 文件中使用，就必须放在 `utils.ts`。禁止复制粘贴。
- 引擎层已提供的能力（如 `adapter.ts` 的游戏模式判断）禁止在游戏层重新实现。
