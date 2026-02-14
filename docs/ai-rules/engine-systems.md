# 引擎与框架系统完整规范

> 本文档是 `AGENTS.md` 的补充详细规范。**触发条件**：开发/修改引擎系统、框架层代码、游戏 move/command 时阅读。
> AGENTS.md 中已有的规则摘要此处不再重复，本文档只提供详细说明、API 清单和代码模板。
> **测试与审计规范**见 `docs/ai-rules/testing-audit.md`。

---

## 引擎层概述

- **Domain Core**：Command/Event + Reducer，确定性可回放。
- **Systems**：Undo/Interaction/Log 等跨游戏能力以 hook 管线参与执行。
- **Adapter**：Boardgame.io moves 仅做输入翻译，规则主体在引擎层。自动合并系统命令到 commandTypes。
- **统一状态**：`G.sys`（系统状态） + `G.core`（领域状态）。

---

## 引擎层系统与原语清单

### `engine/systems/`
Flow / Interaction / Undo / Log / EventStream / ResponseWindow / Tutorial / Rematch / Cheat / ActionLog

### `engine/primitives/` — 纯函数/注册器

| 模块 | 职责 | 核心 API |
|------|------|---------|
| `ability.ts` | 能力定义+执行器注册表 | `createAbilityRegistry()` / `createAbilityExecutorRegistry()` / `checkAbilityCost` / `filterByTags` / `checkAbilityCondition` / `abilityText(id,field)` / `abilityEffectText(id,field)` |
| `tags.ts` | 层级 Tag 系统（层数/持续时间/前缀匹配） | `createTagContainer` / `addTag` / `removeTag` / `hasTag` / `matchTags` / `tickDurations` / `getRemovable` |
| `modifier.ts` | 数值修改器栈（flat/percent/override/compute） | `createModifierStack` / `addModifier` / `applyModifiers` / `computeModifiedValue` / `tickModifiers` |
| `attribute.ts` | base + ModifierStack → current（min/max 钳制） | `createAttributeSet` / `getBase` / `setBase` / `getCurrent` / `addAttributeModifier` / `tickAttributeModifiers` |
| `uiHints.ts` | 可交互实体查询接口 | `UIHint` / `UIHintProvider<TCore>` / `filterUIHints` / `groupUIHintsByType` / `extractPositions` |
| `visual.ts` | 基于 atlasId 的视觉资源解析器 | `VisualResolver` |
| `spriteAtlas.ts` | 精灵图集注册/裁切/查询（网格式） | `SpriteAtlasRegistry` / `globalSpriteAtlasRegistry` / `computeSpriteStyle` / `computeSpriteAspectRatio` / `generateUniformAtlasConfig` / `isSpriteAtlasConfig` |
| `actionRegistry.ts` | actionId → handler 注册表 | `ActionHandlerRegistry` |
| `condition.ts` / `effects.ts` / `dice.ts` / `resources.ts` / `target.ts` / `zones.ts` / `expression.ts` | 其他引擎原语 | — |

### `engine/fx/` — FxSystem

Cue 注册表 + 事件总线 + 渲染层 + WebGL Shader 子系统 + FeedbackPack。游戏侧通过 `fxSetup.ts` 注册渲染器并声明反馈包（音效+震动）。`useFxBus` 接受 `{ playSound, triggerShake }` 注入反馈能力，push 时自动触发 `timing='immediate'` 反馈，渲染器 `onImpact()` 触发 `timing='on-impact'` 反馈。Shader 管线（`src/engine/fx/shader/`）提供 `ShaderCanvas` + `ShaderMaterial` + `ShaderPrecompile` + GLSL 噪声库。

#### 序列特效（`pushSequence`）

`FxBus.pushSequence(steps)` 支持有序特效编排——每个步骤等上一个渲染器 `onComplete` 后再播放下一个。适用于多步骤技能效果（如"移除 token → 造成伤害"）。

```ts
fxBus.pushSequence([
  { cue: DT_FX.TOKEN, ctx: {}, params: { /* token 移除动画 */ }, delayAfter: 200 },
  { cue: DT_FX.DAMAGE, ctx: {}, params: { /* 伤害飞行数字 */ } },
]);
```

- `delayAfter`（ms）：该步骤完成后、下一步开始前的等待时间，默认 0（立即衔接）
- 序列中某步 cue 未注册会自动跳过继续下一步
- 安全超时触发也会推进序列，避免卡死
- `cancelSequence(seqId)` 可取消正在进行的序列
- 渲染器完全不感知自己是否在序列中，无需任何适配

---

## 精灵图集系统（`engine/primitives/spriteAtlas.ts`）（强制）

### 架构

引擎层提供统一的精灵图集原语，类似 Unity SpriteAtlas / Phaser TextureAtlas：

- **`SpriteAtlasConfig`** — 网格裁切配置（imageW/imageH/cols/rows/colStarts/colWidths/rowStarts/rowHeights）
- **`SpriteAtlasRegistry`** — 注册表（`register` / `getSource` / `resolve`）
- **`globalSpriteAtlasRegistry`** — 全局单例，游戏层注册，UI 层查询
- **纯函数** — `computeSpriteStyle(index, config)` / `computeSpriteAspectRatio(index, config)` / `generateUniformAtlasConfig` / `isSpriteAtlasConfig`

### 两个注册表的区别（强制理解）

| 注册表 | 位置 | `image` 字段含义 | 消费方 |
|--------|------|-----------------|--------|
| `globalSpriteAtlasRegistry` | 引擎层 | **运行时 webp URL**（可直接用于 `backgroundImage`） | `CardSprite` 等游戏内组件 |
| `CardPreview.cardAtlasRegistry` | 框架层 | **base path**（不带扩展名，由 `buildLocalizedImageSet` 构建实际 URL） | `CardPreview` 组件（教学/选牌预览） |

**禁止合并这两个注册表**。它们的 `image` 字段语义不同，合并会导致后注册的覆盖前者，造成图片不显示。

### 使用规范

1. **裁切算法禁止在游戏层重复实现**：所有 `backgroundSize/backgroundPosition` 计算必须调用 `computeSpriteStyle`，禁止手写百分比计算。
2. **类型守卫统一使用 `isSpriteAtlasConfig`**：禁止在游戏层重复定义 `isCardAtlasConfig` / `isNumberArray`。
3. **卡牌→精灵图配置的解析必须收敛到单一函数**：每个游戏只允许有一个 `getCardSpriteConfig(card)` 函数（通常在 `spriteHelpers.ts`），所有消费点（手牌、棋盘、预览、弃牌堆、牌组构建器）统一调用，禁止各自写 `if (spriteAtlas === 'portal')` 分支。
4. **新增图集类型时**：只需在 `getCardSpriteConfig` 中添加一个分支，不需要修改任何消费点。

### 反模式

- ❌ 在 UI 组件中直接写 `if (spriteAtlas === 'xxx') return { atlasId: 'yyy', ... }` — 每个消费点都写一遍，漏一个就出 bug
- ❌ 在游戏层定义 `SpriteAtlasConfig` 类型或裁切算法 — 引擎层已提供
- ❌ 把 `registerSpriteAtlas`（webp URL）和 `registerCardAtlasSource`（base path）写入同一个 Map
- ✅ 统一在 `spriteHelpers.ts` 的 `getCardSpriteConfig(card)` 中处理所有图集类型分支
- ✅ 裁切算法调用 `computeSpriteStyle` / `computeSpriteAspectRatio`

---

## 新引擎系统注意事项（强制）

- **数据驱动优先**：规则/配置/清单做成可枚举数据，引擎解析执行，避免分支硬编码。
- **领域 ID 常量表**：所有稳定 ID 在 `domain/ids.ts` 用 `as const` 定义，导出派生类型（`StatusId`/`TokenId`）。例外：i18n key、类型定义中的字面量。
- **新机制先检查引擎**：实现前必须先搜索 `engine/primitives/` 和 `engine/systems/`，无则先在引擎层抽象。
- **新游戏能力系统必须使用 `ability.ts`**：禁止自行实现注册表。每游戏独立实例，通过 label 区分。

---

## 通用能力框架（强制）

### 核心组件（`engine/primitives/ability.ts`）

- **`AbilityDef<TEffect, TTrigger>`** — 泛型能力定义（id/name/trigger/effects/condition/tags/cost/cooldown/variants/meta）
- **`AbilityRegistry<TDef>`** — 定义注册表（`register/get/getAll/getByTag/getByTrigger/getRegisteredIds`）
- **`AbilityExecutorRegistry<TCtx, TEvent>`** — 执行器注册表，支持 `id+tag` 复合键（`register/resolve/has/getRegisteredIds`）
- **工具函数**：`checkAbilityCost` / `filterByTags` / `checkAbilityCondition`（委托 `primitives/condition`）
- **i18n 辅助**：`abilityText('frost_axe','name')` → `'abilities.frost_axe.name'`；`abilityEffectText('slash','damage')` → `'abilities.slash.effects.damage'`

### 强制要求

1. 禁止自行实现注册表或全局单例
2. `getRegisteredIds()` 用于 `entity-chain-integrity.test.ts` 契约测试
3. 条件评估复用 `primitives/condition`（`AbilityDef.condition` 使用 `ConditionNode`）

### 两种执行模式（可混合）

- **声明式**：`AbilityDef` 数据 → `AbilityRegistry` → `executeEffects()` 执行效果列表（效果结构统一时）
- **命令式**：`AbilityExecutor` 函数 → `AbilityExecutorRegistry` → `resolve(id, tag?)` 调用（逻辑差异大时）

### 现有游戏迁移状态

**能力系统**：SummonerWars 已完成迁移（引擎层 Registry + ExecutorRegistry）。DiceThrone `CombatAbilityManager`、SmashUp `abilityRegistry.ts` 是历史实现（内部合理但未用引擎层），**新游戏禁止模仿**。

**状态/buff 原语（TagContainer / ModifierStack）**：
- **SummonerWars 历史债务**：`BoardUnit` 上 `tempAbilities`/`boosts`/`extraAttacks`/`healingMode`/`wasAttackedThisTurn`/`originalOwner` 为 ad-hoc 字段，未用 TagContainer，回合清理靠手动解构。**新游戏禁止模仿**，必须用 `createTagContainer()` + `tickDurations`。
- DiceThrone 已用引擎层 TagContainer；SmashUp 无 buff 系统。

---

## 技能系统反模式清单（强制）

> AGENTS.md 已列出禁止项摘要，此处提供判断标准和正确模式的关键代码。

### ❌ 技能验证硬编码

禁止 `validate.ts` 中 `switch(payload.abilityId) { case 'xxx': ... }`。
✅ 在 `AbilityDef.validation` 声明规则（`requiredPhase`/`requiresTarget`/`targetFilter`/`costCheck`/`usesPerTurn`/`customValidator`），通用 `validateAbility(def, ctx)` 自动验证。

### ❌ 技能按钮硬编码

禁止 UI 组件中 `if (abilities.includes('xxx')) { buttons.push(...) }`。
✅ 在 `AbilityDef.ui` 声明元数据（`requiresButton`/`buttonPhase`/`buttonLabel`/`buttonVariant`），通用组件遍历 `abilities.filter(a => a.ui?.requiresButton)` 自动渲染。

### ❌ 特殊逻辑硬编码

禁止 `execute.ts` 中 `if (abilityId === 'rapid_fire') { ... }`。
✅ 在 `abilityResolver.ts` 或 `customActionHandlers.ts` 注册 handler，execute.ts 只负责触发 `triggerAbilities(trigger, ctx)`。

### ❌ 技能描述多源冗余

禁止卡牌配置硬编码 `abilityText`（与 `AbilityDef.description` + i18n 三重冗余）。
✅ 卡牌配置只保留 `abilities: ['id']`，`AbilityDef` 中 `name`/`description` 存 i18n key（用 `abilityText()` 辅助函数生成），UI 层通过 `t(def.description)` 获取文本。

### 强制要求总结

1. 技能验证 → `AbilityDef.validation` + 通用函数
2. 技能按钮 → `AbilityDef.ui` + 通用组件
3. 技能逻辑 → 注册到 `abilityResolver.ts`，不改 execute.ts
4. 新增技能只需：① `abilities-*.ts` 添加 `AbilityDef` ② 注册执行器 ③ i18n JSON 添加文案
5. 描述文本单一来源：i18n JSON（通过 `AbilityDef.description` 存 i18n key）



---

## 框架解耦要求（强制）

- 禁止框架层 import 游戏层；游戏特化下沉到 `games/<gameId>/`
- 框架提供通用接口+注册表，游戏层显式注册扩展
- 新系统在 `engine/systems/` 实现并在 `index.ts` 导出；需默认启用则加入 `createBaseSystems()`
- 系统状态写入 `SystemState`，由 `setup()` 初始化，禁止塞进 `core`
- 系统命令由 adapter 自动合并，游戏层只列业务命令
- Move payload 必须包装为对象，禁止裸值；系统命令用 `UNDO_COMMANDS.*` 等常量
- 需要 `reset()` 的系统必须保证重开后回到初始值

---

## 框架复用优先（强制）

三层模型：`/core/ui/` 契约层 → `/components/game/framework/` 骨架层 → `/games/<gameId>/` 游戏层。

**新增前强制检查**：搜索 `/core/`、`/components/game/framework/`、`/engine/` 确认无已有实现。

**框架层 Hooks 清单**（`/components/game/framework/hooks/`）：
- `useGameBoard` — 棋盘核心状态
- `useHandArea` — 手牌区状态
- `useResourceTray` — 资源栏状态
- `useDragCard` — 卡牌拖拽交互
- `useAutoSkipPhase` — 无可用操作时自动跳过（注入 `hasAvailableActions` + `hasActiveInteraction`）
- `useVisualSequenceGate` — 视觉序列门控（`beginSequence`/`endSequence`/`scheduleInteraction`/`isVisualBusy`/`reset`）
- `useVisualStateBuffer` — 视觉状态缓冲/双缓冲（`freeze`/`freezeBatch`/`release`/`clear`/`get`/`snapshot`/`isBuffering`）

**系统层设计原则**：接口+通用骨架在系统层，游戏特化下沉；每游戏独立实例禁止全局单例；UGC 通过 AI 生成符合接口的代码动态注册。

---

## 动画表现与逻辑分离规范（强制）

> 引擎架构核心原则：**逻辑层同步完成状态计算，表现层按动画节奏异步展示**。两层通过框架 Hook 解耦，游戏层无需关心时序管理。
> 视觉特效的技术选型、粒子引擎、FX 系统等详见 `docs/ai-rules/animation-effects.md`。本节只覆盖引擎层的表现-逻辑分离基础设施。

### 架构约束

引擎管线（`executePipeline`）在一个 tick 内同步完成所有 reduce，core 状态立即反映最终值。但表现层需要按动画节奏逐步展示（骰子 → 攻击动画 → impact 瞬间数值变化 → 摧毁特效）。**引擎层不为表现延迟状态计算**，表现层自行管理视觉时序。

### 框架基础设施

引擎提供两个互补的框架 Hook，所有游戏统一使用：

| Hook | 职责 | 核心 API |
|------|------|---------|
| `useVisualStateBuffer` | 数值属性的视觉冻结/双缓冲 | `freeze`/`freezeBatch`/`release`/`clear`/`get`/`snapshot`/`isBuffering` |
| `useVisualSequenceGate` | 交互事件的延迟调度（动画期间不弹交互框） | `beginSequence`/`endSequence`/`scheduleInteraction`/`isVisualBusy`/`reset` |

#### useVisualStateBuffer（视觉状态缓冲）

在动画期间冻结受影响属性的视觉值，UI 读快照而非 core 真实值：

1. **冻结**（`freeze`）：事件到来时，对受影响的 key 快照当前值（回退到变化前）
2. **读取**（`get`）：UI 组件优先读快照值，无快照时回退到 core 真实值
3. **释放**（`release`）：动画 impact 瞬间删除指定 key，UI 回退到 core 真实值
4. **清空**（`clear`）：动画序列结束时清空所有快照

#### 释放时机：FxLayer onEffectImpact

FxLayer 提供 `onEffectImpact?: (id: string, cue: string) => void` 回调，在飞行动画到达目标（冲击帧）时触发。游戏层通过维护 `fxId → bufferKey` 映射，在 impact 回调中释放对应 key：

```typescript
// push 时记录映射
const fxId = fxBus.push(DT_FX.DAMAGE, {}, { damage, startPos, endPos });
if (fxId) fxImpactMap.set(fxId, `hp-${targetId}`);

// FxLayer onEffectImpact 时释放
<FxLayer
  bus={fxBus}
  onEffectImpact={(id) => {
    const key = fxImpactMap.get(id);
    if (key) { damageBuffer.release([key]); fxImpactMap.delete(id); }
  }}
/>
```

#### 两个 Hook 的协作

- `gate.beginSequence()` + `buffer.freeze()` — 动画开始（冻结数值 + 挂起交互）
- `buffer.release()` — impact 瞬间（数值变化可见）
- `buffer.clear()` + `gate.endSequence()` — 动画结束（交互队列排空）

### 已接入的游戏

| 游戏 | 冻结属性 | 冻结时机 | 释放时机 |
|------|---------|---------|---------|
| SummonerWars | 棋盘单位 damage（key=`"row-col"`） | `UNIT_ATTACKED` + `UNIT_DAMAGED` 事件 | 近战 `onAttackHit` / 远程 `onEffectImpact(COMBAT_SHOCKWAVE)` |
| DiceThrone | 玩家 HP（key=`"hp-{playerId}"`） | `DAMAGE_DEALT` / `HEAL_APPLIED` 事件 | `onEffectImpact(DAMAGE/HEAL)` |

### 适用场景

- 棋盘单位 damage / HP / 护甲等数值属性
- 玩家 HP、资源值（金币/魔法值等）
- 任何 UI 展示的数值属性，且该数值有对应的飞行动画/特效

### 新游戏接入（强制）

新游戏有数值变化动画时，必须使用 `useVisualStateBuffer` 管理视觉时序，禁止直接读 core 值渲染。典型接入流程：
1. 在事件消费 Hook 中创建 `useVisualStateBuffer`，事件到来时 `freeze` 对应 key
2. 在 `fxBus.push` 时记录 `fxId → bufferKey` 映射
3. 在 `FxLayer.onEffectImpact` 回调中 `release` 对应 key
4. UI 组件通过 `buffer.get(key, coreValue)` 读取视觉值

### 禁止事项

- ❌ 禁止在 UI 组件中用 `useState<Map>` 自行实现快照逻辑，必须使用 `useVisualStateBuffer`
- ❌ 禁止在 reducer/execute 层延迟事件处理来解决动画时序问题（引擎层必须同步完成）
- ❌ 禁止用 `setTimeout` 延迟读取 core 值来"等动画播完"
- ❌ 新游戏禁止直接读 core 数值属性渲染 HP/血条，必须经过 `useVisualStateBuffer.get()` 中转

---

## EventStreamSystem 使用规范（强制）

特效/动画/音效消费必须用 `getEventStreamEntries(G)`（EventStreamSystem），禁止用 `getEvents(G)`（LogSystem）。原因：LogSystem 持久化全量日志刷新后完整恢复，EventStream 实时消费通道带自增 `id`，撤销时清空。

### 首次挂载跳过历史事件（强制）

> 所有消费 EventStream 的 Hook/Effect 必须遵循，无例外。

**模式 A：过滤式消费（推荐，处理多条新事件）**
```typescript
const lastSeenIdRef = useRef<number>(-1);
const isFirstMountRef = useRef(true);
// 首次挂载：指针推进到末尾
useEffect(() => {
  if (isFirstMountRef.current && entries.length > 0) {
    lastSeenIdRef.current = entries[entries.length - 1].id;
    isFirstMountRef.current = false;
  }
}, [entries]);
// 后续：只处理 id > lastSeenId
useEffect(() => {
  if (isFirstMountRef.current) return;
  const newEntries = entries.filter(e => e.id > lastSeenIdRef.current);
  if (newEntries.length === 0) return;
  // ... 处理 newEntries
  lastSeenIdRef.current = newEntries[newEntries.length - 1].id;
}, [entries]);
```

**模式 B：单条最新事件消费**
```typescript
// 关键：初始值用当前最新 id，非 null/-1
const lastProcessedIdRef = useRef<number | null>(latestEntry?.id ?? null);
useEffect(() => {
  if (!latestEntry || lastProcessedIdRef.current === latestEntry.id) return;
  lastProcessedIdRef.current = latestEntry.id;
  // ... 处理 latestEntry
}, [latestEntry]);
```

**禁止**：初始值为 `null/-1` 且无首次挂载跳过逻辑；仅靠 `mountedRef` 守卫（后续 state 变化仍会重播）。

**检查清单**：① 首次挂载是否推进指针到最新？② 后续是否只处理 `id > lastSeenId`？③ 模式 B 的 `useRef` 初始值是否为 `currentEntry?.id ?? null`？④ 同一 Hook 内所有 effect 是否一致？

**参考**：模式 A → `dicethrone/hooks/useCardSpotlight.ts`、`useActiveModifiers.ts`、`useAnimationEffects.ts`；模式 B → `lib/audio/useGameAudio.ts`

---

## ActionLogSystem 使用规范（强制）

- ActionLogSystem 只负责收集/落库，禁止系统层硬编码游戏文案
- `formatEntry` 必须返回 i18n key 的 `ActionLogSegment`，禁止拼接硬编码字符串
- 覆盖所有玩家可见状态变化（伤害/治疗/摧毁/移动/资源/VP），不记录内部系统事件
- 支持多条日志返回（命令级+同步事件级）
- 卡牌类日志必须用 `card` 片段支持 hover 预览

### 音效与动画分流（强制）

- **无动画事件** → `feedbackResolver` 返回 `SoundKey`，框架层立即播放
- **有动画事件** → `feedbackResolver` 返回 `null`，动画层 `onImpact` 回调 `playSound(key)`
- **FX 特效** → `FeedbackPack` 在 `fxSetup.ts` 声明；运行时依赖数据用 `{ source: 'params' }`，`useFxBus` 从 `event.params.soundKey` 读取
- **原因**：引擎同步生成所有事件，动画有飞行时间，立即播音会视听不同步

---

## ABILITY_TRIGGERED 事件规范（强制）

必须用 `createAbilityTriggeredEvent()` 创建，payload 类型 `AbilityTriggeredPayload`，`sourcePosition` 必填。禁止手写 `{ type: SW_EVENTS.ABILITY_TRIGGERED, payload: {...} }`。回归守卫：`phase-ability-integration.test.ts`。

---

## afterEventsRound 限制（强制）

`FlowSystem.afterEvents` 在 `afterEventsRound > 0` 时传空 events 给 `onAutoContinueCheck`，基于事件的自动推进链单次 `executePipeline` 最多跨一个阶段。测试中 `createInitializedState` 返回 upkeep（非 main1），仍需手动 `cmd('ADVANCE_PHASE')` 推进。详见 `docs/refactor/dicethrone-auto-advance-upkeep-income.md`。

---

## flowHalted 状态追踪（强制）

`FlowSystem` 在 `onPhaseExit` 返回 `halt: true` 时，自动在 `sys.flowHalted` 中设置 `true`；阶段成功推进后设置 `false`。

- **用途**：`onAutoContinueCheck` 中，战斗阶段（如 `offensiveRoll`/`defensiveRoll`）只在 `state.sys.flowHalted === true` 时才尝试自动推进。这样可以精确区分"onPhaseExit halt 后的阻塞清除"和"卡牌效果中的阻塞清除"。
- **禁止**：在业务数据（如 `PendingBonusDiceSettlement`）中打 `phaseExitHalt` 标记来区分来源。流程控制信息应由引擎层追踪，不应污染业务数据。
- **所有游戏受益**：新游戏的 `onAutoContinueCheck` 可直接读取 `state.sys.flowHalted` 判断是否处于 halt 恢复状态。

---

## 阶段推进权限的 UI 消费（强制）

- 领域层 `rules.ts` 定义 `canAdvancePhase(core, phase)` 做规则校验
- FlowSystem 通过 `flowHooks.canAdvance` 调用，作为服务端兜底
- UI 层禁止重复实现领域校验，应复用领域层函数
- 正确模式：游戏状态 Hook 中计算 `canAdvancePhase`（领域校验 + `!hasPendingInteraction`），Board 叠加 `isFocusPlayer`
- **参考**：`dicethrone/hooks/useDiceThroneState.ts`

---

## 重赛系统

- **多人**：socket.io 房间层投票（`RematchContext` + `matchSocket.ts`），不走 boardgame.io move（绕过 `ctx.gameover` 限制）
- **单人**：直接 `reset()`
- 服务端 `server.ts` REMATCH_EVENTS → 客户端 `matchSocket.ts` + `RematchContext.tsx` → UI `RematchActions` + `useRematch()`

---

## 领域层编码规范详解（强制）

### Reducer 结构共享

✅ 只 spread 变更路径，值未变时返回原引用：
```typescript
const target = core.players[targetId];
if (!target) return core;
const newHp = Math.max(0, target.hp - amount);
if (newHp === target.hp) return core;
return { ...core, players: { ...core.players, [targetId]: { ...target, hp: newHp } } };
```
❌ 禁止 `JSON.parse(JSON.stringify(core))`。嵌套 ≥3 层提取 `updatePlayer(core, pid, updater)` helper。

### types.ts 默认拆分模板

命令数 ≥5 或多阶段回合时从第一天用：
```
domain/
  types.ts          # re-export barrel: export * from './core-types'; export * from './commands'; export * from './events';
  core-types.ts     # 状态接口
  commands.ts       # 命令类型
  events.ts         # 事件类型
```

### Core 状态决策树

1. 被 `reduce()` 写入？→ 否：不属于 core
2. 被 `validate()`/`execute()`/`isGameOver()` 读取并影响决策？→ 否：不属于 core
3. "等待玩家输入"？→ 放 `sys.interaction`
4. 仅 UI 展示？→ 走 EventStreamSystem
5. 确实影响规则 → 允许放入 core，**必须注释规则依赖**

### 游戏内工具函数

`domain/utils.ts` 从第一天建立，放 `applyEvents`/`getOpponentId`/`updatePlayer` 等。≥2 个 domain 文件使用的函数必须放此处。引擎层已有的能力禁止重新实现。

---

## UIHints 使用规范（推荐）

引擎层 `engine/primitives/uiHints.ts` 提供轻量级"可交互实体"查询接口。游戏层实现 `UIHintProvider<TCore>` 函数返回 `UIHint[]`，UI 层用 `extractPositions(hints)` 渲染视觉提示。不在 core 中存储（派生数据），用 `useMemo` 缓存。

**参考**：`summonerwars/domain/uiHints.ts` → `summonerwars/ui/useCellInteraction.ts`

---

## 动态赋予效果的 UI 提示（强制）

任何动态赋予的效果（基地能力/持续行动卡/buff/debuff/光环/条件触发）必须有 UI 提示：
1. 持续力量修正 → 显示修正后值，与基础值有视觉区分
2. 持续保护/限制 → 图标或文字提示
3. 基地能力效果 → 基地卡上清晰展示
4. 临时 buff/debuff → 视觉标记，效果结束自动消失
5. 条件触发 → 条件满足时视觉反馈

**UI 展示方式不明确时必须询问用户确认**，禁止自行猜测。

---

## 描述→实现全链路审查规范

> **已迁移至 `docs/ai-rules/testing-audit.md`「描述→实现全链路审查规范」节，该文档为唯一权威来源。**
> 当用户说"审查"/"审核"/"检查实现"/"核对"等词时，必须先阅读 `docs/ai-rules/testing-audit.md`，按规范流程执行审查并输出矩阵，禁止凭印象回答。


---

## 领域建模前置审查（强制）

> 阶段 2 完成后、阶段 3 开始前执行。禁止跳过领域建模直接写实现。

核心原则：**规则文本 → 领域模型 → 实现**，禁止从规则文本直接跳到实现。

### 1. 领域概念建模

从规则文档提取所有领域概念（术语/状态/角色/阶段），为每个概念建立：
- **定义**：该概念的精确语义边界（如"影响"= 移动 | 消灭 | 改力量 | 附着 | 控制权变更 | 取消能力）
- **映射**：概念→具体事件类型/状态字段的对应关系

产出：术语→事件映射表，录入 `rule/` 或 `domain/types.ts` 注释。

**反模式**：规则说"被影响时触发"，实现时直接绑定 `onDestroyed` + `onMoved` 两个具体事件，遗漏了"影响"概念下的其他 4 种事件。正确做法：先定义"影响"包含哪些事件，再设计一个聚合抽象（如 `onAffected`）覆盖全部。

### 2. 决策点识别

规则中所有需要玩家做选择的点必须在建模阶段标记，不得在实现时跳过或自动化：
- **强制决策**："选择一个目标"/"指定"→ 必须有交互
- **可选决策**："你可以"/"may"→ 必须有确认/跳过 UI
- **无决策**：自动结算，无需交互

对每个决策点评估当前引擎是否支持该交互模式。不支持则提前规划扩展或标注 TODO。

**反模式**：规则说"你可以将它移动到这里"，实现时自动移动跳过玩家选择，因为引擎层拦截器不支持异步交互。正确做法：建模时识别出该决策点，提前评估引擎能力。

### 3. 引擎能力缺口分析

将建模产出（概念/决策点/交互模式）与引擎层能力逐一比对，列出缺口和扩展计划。

### 门禁检查清单

- [ ] 所有领域概念已定义精确语义边界和事件映射
- [ ] 所有玩家决策点已标记（强制/可选/无）
- [ ] 引擎能力缺口已识别并有计划
