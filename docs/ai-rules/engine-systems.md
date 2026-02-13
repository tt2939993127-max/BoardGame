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
- `engine/primitives/` - condition/effects/dice/resources/target/zones/expression/visual/actionRegistry/ability/tags/modifier/attribute/uiHints 等引擎原语模块（纯函数/注册器）
  - `ability.ts` — **AbilityRegistry + AbilityExecutorRegistry**：通用能力定义注册表和执行器注册表，替代各游戏独立实现的 abilityRegistry/abilityResolver/CombatAbilityManager 中的注册+查找部分。附带 `checkAbilityCost`、`filterByTags`、`checkAbilityCondition` 可用性工具，以及 `abilityText(id, field)` / `abilityEffectText(id, field)` i18n key 生成辅助函数。新游戏必须使用此框架而非自行实现。
  - `tags.ts` — **层级 Tag 系统**：带层数/持续时间的 tag 容器 + 层级前缀匹配（`Status.Debuff` 匹配 `Status.Debuff.Stun`）。替代 DiceThrone 的 `statusEffects` + `TokenInstance`、SummonerWars 的 `boosts` + `tempAbilities`。API：`createTagContainer/addTag/removeTag/hasTag/matchTags/tickDurations/getRemovable`。
  - `modifier.ts` — **Modifier 管线**：通用数值修改器栈（flat/percent/override/compute），按优先级排序执行。替代 DiceThrone 的 `DamageModifier`、SmashUp 的 `PowerModifierFn`。API：`createModifierStack/addModifier/applyModifiers/computeModifiedValue/tickModifiers`。
  - `attribute.ts` — **AttributeSet**：base value + ModifierStack → current value 的属性系统，支持 min/max 钳制。与 `resources.ts` 互补（resources 管消耗品，attribute 管可被 buff 修改的属性）。API：`createAttributeSet/getBase/setBase/getCurrent/addAttributeModifier/tickAttributeModifiers`。
  - `uiHints.ts` — **UI 提示系统**：轻量级的"可交互实体"查询接口。定义 `UIHint` 类型（type/position/entityId/actions）和 `UIHintProvider<TCore>` 接口，游戏层实现 `getXxxUIHints(core, filter)` 函数返回可操作实体列表（如"可移动的单位"、"可使用技能的单位"），UI 层调用 `extractPositions(hints)` 提取位置并渲染视觉提示。工具函数：`filterUIHints/groupUIHintsByType/extractPositions`。用于替代 UI 层直接计算业务逻辑，保持职责分离。
  - `visual.ts` — **VisualResolver**：基于约定的视觉资源解析器，通过实体定义（如 TokenDef）的 atlasId 自动解析图片/动画资源
  - `actionRegistry.ts` — **ActionHandlerRegistry**：统一的 actionId → handler 注册表，替代 if/else 硬编码分发
- `engine/testing/` - 测试工具
  - `referenceValidator.ts` — **validateReferences + extractRefChains**：实体引用链完整性验证，检测定义与注册表之间的断裂引用
  - `entityIntegritySuite.ts` — **createRegistryIntegritySuite / createRefChainSuite / createTriggerPathSuite / createEffectContractSuite**：四个测试套件工厂，生成标准化 describe/it 测试块，用于数据定义的自动化契约验证
  - `interactionChainAudit.ts` — **createInteractionChainAuditSuite**：交互链完整性审计套件工厂（模式 A：UI 状态机），验证多步交互技能的 UI 步骤是否覆盖执行器所需 payload 字段。三类检查：声明完整性、步骤覆盖、契约对齐
  - `interactionCompletenessAudit.ts` — **createInteractionCompletenessAuditSuite**：交互完整性审计套件工厂（模式 B：Interaction 链），验证所有创建 Interaction 的能力都有对应 handler 注册。三类检查：Handler 注册覆盖、链式完整性、孤儿 Handler
  - `abilityBehaviorAudit.ts` — **createAbilityBehaviorAuditSuite**：能力行为审计套件工厂，验证"i18n 描述说了 X 但代码没做 X"的不一致。五类检查：关键词→行为映射、ongoing 注册覆盖、能力标签执行器覆盖、自毁行为完整性、条件语句完整性
  - `cardCompletenessAudit.ts` — **createCardCompletenessAuditSuite**：卡牌完整性审计套件工厂，静态分析卡牌定义的常见遗漏。三类检查：描述条件性语言检测、卡牌结构完整性、占位符检测
- `FxSystem` (`src/engine/fx/`) - 视觉特效调度（Cue 注册表 + 事件总线 + 渲染层 + WebGL Shader 子系统 + FeedbackPack 反馈包），游戏侧通过 `fxSetup.ts` 注册渲染器并声明反馈包（音效 + 震动）。`useFxBus` 接受 `{ playSound, triggerShake }` 选项注入反馈能力，push 事件时自动触发 `timing='immediate'` 反馈，渲染器调用 `onImpact()` 时自动触发 `timing='on-impact'` 反馈。Shader 包装组件在模块顶层调用 `registerShader()` 自注册到预编译队列，`useFxBus` 挂载时调用 `flushRegisteredShaders()` 自动预编译所有已注册的 shader（`ShaderPrecompile`）。Shader 管线（`src/engine/fx/shader/`）提供 `ShaderCanvas` + `ShaderMaterial` + `ShaderPrecompile` + GLSL 噪声库，用于逐像素流体特效。

---

## 新引擎系统注意事项（强制）

- **数据驱动优先（强制）**：规则/配置/清单优先做成可枚举的数据（如 manifest、常量表、定义对象），由引擎/系统解析执行；避免在组件或 move 内写大量分支硬编码，确保可扩展、可复用、可验证。
- **领域 ID 常量表（强制）**：所有领域内的稳定 ID（如状态效果、Token、骰面符号、命令类型）必须在 `domain/ids.ts` 中定义常量表，禁止在代码中直接使用字符串字面量（如 `'knockdown'`、`'taiji'`）。
  - **常量表结构**：使用 `as const` 确保类型安全，并导出派生类型（如 `StatusId`、`TokenId`）。
  - **示例**：`STATUS_IDS.KNOCKDOWN`、`TOKEN_IDS.TAIJI`、`DICE_FACE_IDS.FIST`。
  - **例外**：国际化 key（如 `t('dice.face.fist')`）、类型定义（如 `type DieFace = 'fist' | ...`）可保留字符串字面量。
- **新机制先检查引擎**：实现新游戏机制前，必须先检查 `src/engine/primitives/` 或 `src/engine/systems/` 是否已有对应能力；若无，必须先在引擎层抽象通用类型和接口，再在游戏层实现。原因：UGC 游戏需要复用这些能力。充分考虑未来可能性而不是只看当下。
- **新游戏能力系统必须使用 `ability.ts`（强制）**：禁止自行实现能力注册表或执行器注册表。必须使用 `createAbilityRegistry()` 和 `createAbilityExecutorRegistry()`，每游戏独立实例。详见下方「通用能力框架」节。

---

## 通用能力框架使用规范（强制）

> **新游戏实现能力/技能系统时必读**

引擎层 `src/engine/primitives/ability.ts` 提供通用能力框架，替代各游戏重复实现的注册+查找+可用性检查逻辑。

### 核心组件

- **`AbilityDef<TEffect, TTrigger>`** — 泛型能力定义接口（id, name, trigger, effects, condition, tags, cost, cooldown, variants, meta）。游戏通过泛型参数特化效果和触发类型。
- **`AbilityRegistry<TDef>`** — 能力定义注册表。`register/get/getAll/getByTag/getByTrigger/getRegisteredIds`。每游戏独立实例。
- **`AbilityExecutorRegistry<TCtx, TEvent>`** — 执行器注册表。支持纯 id 和 `id+tag` 复合键。`register/resolve/has/getRegisteredIds`。
- **`checkAbilityCost(def, resources)`** — 检查资源是否满足消耗。
- **`filterByTags(defs, blockedTags)`** — 过滤被标签阻塞的能力。
- **`checkAbilityCondition(def, ctx, registry?)`** — 委托 `primitives/condition` 评估能力条件。
- **`abilityText(id, field)`** — 生成技能 i18n key（如 `abilityText('frost_axe', 'name')` → `'abilities.frost_axe.name'`）。所有游戏共用，禁止在游戏层重复定义。
- **`abilityEffectText(id, field)`** — 生成技能效果 i18n key（如 `abilityEffectText('slash', 'damage')` → `'abilities.slash.effects.damage'`）。

### 强制要求

- **禁止自行实现能力注册表**：新游戏必须使用 `createAbilityRegistry()` / `createAbilityExecutorRegistry()`，不得再创建类似 `AbilityRegistry class` 或 `registerAbility()` 全局函数。
- **禁止全局单例**：每个游戏创建自己的注册表实例，通过构造函数传入 label 以区分。
- **`getRegisteredIds()` 用于契约测试**：在 `entity-chain-integrity.test.ts` 中验证所有数据定义引用的 abilityId 均已注册。
- **条件评估复用 `primitives/condition`**：`AbilityDef.condition` 使用 `ConditionNode` 类型，通过 `checkAbilityCondition()` 评估，不再自行实现条件系统。
- **现有游戏迁移状态**：SummonerWars 已完成迁移（使用引擎层 `AbilityRegistry` + `AbilityExecutorRegistry`）。DiceThrone 的 `CombatAbilityManager`、SmashUp 的 `abilityRegistry.ts` 是引擎框架出现前的实现，内部设计合理但未使用引擎层，新游戏禁止模仿。

### 两种执行模式

- **声明式（数据驱动）**：定义 `AbilityDef` 数据 → 注册到 `AbilityRegistry` → 用 `primitives/effects` 的 `executeEffects()` 执行效果列表。适合效果结构统一的游戏。
- **命令式（函数驱动）**：注册 `AbilityExecutor` 函数到 `AbilityExecutorRegistry` → 通过 `resolve(id, tag?)` 查找并调用。适合每个能力逻辑差异大的游戏。
- 两种模式可混合使用：大多数能力走声明式，复杂能力注册 custom executor。

---

## 技能系统反模式清单（强制禁止）

> **新游戏实现技能系统时必读**。以下模式已在召唤师战争中造成严重维护问题，新游戏必须避免。

### ❌ 禁止：技能验证硬编码（validate.ts 中的 switch-case）

**反模式示例**：
```typescript
// ❌ 禁止！每个技能都要手写 case 语句
function validateActivateAbility(core, playerId, payload) {
  switch (payload.abilityId) {
    case 'revive_undead':
      if (core.phase !== 'summon') return { valid: false, error: '...' };
      if (!targetCardId) return { valid: false, error: '...' };
      // ... 20 行验证逻辑
      return { valid: true };
    
    case 'fire_sacrifice_summon':
      // ... 又是 20 行
    
    case 'life_drain':
      // ... 又是 20 行
    
    // ... 30+ 个 case 语句
  }
}
```

**问题**：
- 新增技能必须修改 validate.ts，违反开闭原则
- 验证逻辑分散在 30+ 个 case 中，无法复用
- 无法通过数据驱动自动生成验证规则

**正确做法**：
```typescript
// ✅ 技能定义中包含验证规则
interface AbilityDef {
  id: string;
  validation?: {
    requiredPhase?: GamePhase;
    requiresTarget?: 'unit' | 'position' | 'card';
    targetFilter?: ConditionNode;
    costCheck?: { magic?: number; charge?: number };
    usesPerTurn?: number;
    customValidator?: (ctx: ValidationContext) => ValidationResult;
  };
}

// ✅ 通用验证函数
function validateAbility(ability: AbilityDef, ctx: ValidationContext): ValidationResult {
  if (ability.validation?.requiredPhase && ctx.phase !== ability.validation.requiredPhase) {
    return { valid: false, error: `只能在${ability.validation.requiredPhase}阶段使用` };
  }
  
  if (ability.validation?.usesPerTurn) {
    const usageKey = `${ctx.sourceUnitId}:${ability.id}`;
    const count = ctx.core.abilityUsageCount[usageKey] ?? 0;
    if (count >= ability.validation.usesPerTurn) {
      return { valid: false, error: `每回合只能使用${ability.validation.usesPerTurn}次` };
    }
  }
  
  // ... 其他通用验证
  
  if (ability.validation?.customValidator) {
    return ability.validation.customValidator(ctx);
  }
  
  return { valid: true };
}
```

---

### ❌ 禁止：技能按钮硬编码（UI 组件中的 if 语句）

**反模式示例**：
```typescript
// ❌ 禁止！每个技能都要手写 if 语句和按钮
function AbilityButtonsPanel({ unit, core, phase }) {
  const buttons = [];
  
  if (abilities.includes('revive_undead') && phase === 'summon') {
    const hasUndeadInDiscard = /* ... 10 行检查逻辑 */;
    if (hasUndeadInDiscard) {
      buttons.push(<GameButton onClick={...}>复活死灵</GameButton>);
    }
  }
  
  if (abilities.includes('fire_sacrifice_summon') && phase === 'summon') {
    const hasOtherUnits = /* ... 10 行检查逻辑 */;
    if (hasOtherUnits) {
      buttons.push(<GameButton onClick={...}>火祀召唤</GameButton>);
    }
  }
  
  // ... 9 个 if 语句
  
  return <div>{buttons}</div>;
}
```

**问题**：
- 新增技能必须修改 UI 组件，违反单一职责原则
- 可用性检查逻辑与 validate.ts 重复
- 无法自动生成按钮

**正确做法**：
```typescript
// ✅ 技能定义中包含 UI 元数据
interface AbilityDef {
  id: string;
  ui?: {
    requiresButton?: boolean;
    buttonPhase?: GamePhase;
    buttonLabel?: string; // i18n key
    buttonVariant?: 'primary' | 'secondary' | 'danger';
  };
}

// ✅ 通用按钮渲染
function AbilityButtonsPanel({ unit, core, phase, validate }) {
  const abilities = getUnitAbilities(unit);
  const buttons = abilities
    .filter(a => a.ui?.requiresButton && a.ui.buttonPhase === phase)
    .map(ability => {
      const validationResult = validate(ability, { unit, core, phase });
      return (
        <GameButton
          key={ability.id}
          onClick={() => activateAbility(ability.id)}
          disabled={!validationResult.valid}
          title={validationResult.error}
          variant={ability.ui.buttonVariant}
        >
          {t(ability.ui.buttonLabel)}
        </GameButton>
      );
    });
  
  return <div>{buttons}</div>;
}
```

---

### ❌ 禁止：特殊逻辑硬编码（execute.ts 中的 if 语句）

**反模式示例**：
```typescript
// ❌ 禁止！在 execute.ts 中硬编码技能逻辑
function executeAttack(core, attacker, target) {
  // ... 攻击逻辑
  
  const afterAttackEvents = triggerAbilities('afterAttack', ctx);
  
  // ❌ 硬编码检查特定技能
  const hasRapidFireTrigger = afterAttackEvents.some(e =>
    e.type === 'ABILITY_TRIGGERED' && e.payload.abilityId === 'rapid_fire_extra_attack'
  );
  if (hasRapidFireTrigger && attacker.boosts >= 1) {
    events.push({ type: 'UNIT_CHARGED', payload: { delta: -1 } });
    events.push({ type: 'EXTRA_ATTACK_GRANTED', payload: { ... } });
  }
  
  return events;
}
```

**问题**：
- 技能逻辑泄漏到 execute.ts，无法复用
- 新增类似技能必须修改 execute.ts
- 违反单一职责原则

**正确做法**：
```typescript
// ✅ 在 abilityResolver.ts 中注册处理函数
swCustomActionRegistry.register('rapid_fire_extra_attack', ({ ctx, abilityId }) => {
  const events: GameEvent[] = [];
  
  if ((ctx.sourceUnit.boosts ?? 0) >= 1) {
    events.push({
      type: SW_EVENTS.UNIT_CHARGED,
      payload: { position: ctx.sourcePosition, delta: -1, sourceAbilityId: abilityId },
      timestamp: ctx.timestamp,
    });
    events.push({
      type: SW_EVENTS.EXTRA_ATTACK_GRANTED,
      payload: { targetPosition: ctx.sourcePosition, targetUnitId: ctx.sourceUnit.cardId, sourceAbilityId: abilityId },
      timestamp: ctx.timestamp,
    });
  }
  
  return events;
});

// ✅ execute.ts 只负责触发，不关心具体逻辑
function executeAttack(core, attacker, target) {
  // ... 攻击逻辑
  const afterAttackEvents = triggerAbilities('afterAttack', ctx);
  // 所有 afterAttack 技能的逻辑都在 abilityResolver.ts 中处理
  return [...attackEvents, ...afterAttackEvents];
}
```

---

### ❌ 禁止：技能描述文本多源冗余（卡牌配置中的 abilityText）

**反模式示例**：
```typescript
// ❌ 禁止！卡牌配置中硬编码技能描述文本
// config/factions/frost.ts
const ICE_SMITH: UnitCardDef = {
  id: 'frost-ice-smith',
  abilities: ['frost_axe'],
  abilityText: '冰霜战斧：在本单位移动之后，你可以将其充能...', // ❌ 硬编码中文
};

// domain/abilities-frost.ts — 同一段文本又写了一遍
const FROST_AXE: AbilityDef = {
  id: 'frost_axe',
  name: '冰霜战斧',
  description: '在本单位移动之后，你可以将其充能...', // ❌ 重复！
};

// public/locales/zh-CN/game-summonerwars.json — 第三遍
// "statusBanners.ability.frostAxe": "冰霜战斧：充能或消耗充能附加" // ❌ 又一遍！
```

**问题**：
- 修改技能描述需要同步 3 个位置，极易遗漏导致不一致
- 卡牌配置中的 `abilityText` 无法走 i18n 多语言流程
- 违反 DRY 原则，增加维护成本

**正确做法**：
```typescript
// ✅ 卡牌配置只保留 ID 引用
const ICE_SMITH: UnitCardDef = {
  id: 'frost-ice-smith',
  abilities: ['frost_axe'],
  // 无 abilityText 字段！描述从 abilityRegistry 或 i18n 获取
};

// ✅ AbilityDef 中 description 存储 i18n key
const FROST_AXE: AbilityDef = {
  id: 'frost_axe',
  name: 'abilities.frost_axe.name',        // i18n key
  description: 'abilities.frost_axe.desc',  // i18n key
};

// ✅ 使用引擎层 abilityText() 辅助函数（从 engine/primitives/ability 导入）
import { abilityText } from '../../../engine/primitives/ability';
const FROST_AXE: AbilityDef = {
  id: 'frost_axe',
  name: abilityText('frost_axe', 'name'),
  description: abilityText('frost_axe', 'description'),
};

// ✅ UI 层获取描述文本
function getAbilityDescription(abilityId: string): string {
  const def = abilityRegistry.get(abilityId);
  return def ? t(def.description) : '';
}
```

---

### 强制要求总结

1. **技能验证必须数据驱动**：在 `AbilityDef.validation` 中声明规则，通用函数自动验证
2. **技能按钮必须自动生成**：在 `AbilityDef.ui` 中声明元数据，通用组件自动渲染
3. **技能逻辑必须注册**：复杂逻辑在 `abilityResolver.ts` 或 `customActionHandlers.ts` 中注册，不得在 execute.ts 中硬编码
4. **新增技能只需添加配置**：不得修改 validate.ts、execute.ts、UI 组件
5. **技能定义单一数据源**：`AbilityDef` 是技能元数据的唯一真实来源（Single Source of Truth），卡牌/单位配置只保留 `abilities: ['id']` 引用，禁止硬编码 `abilityText` 描述文本
6. **技能描述文本禁止多源冗余**：描述文本只允许存在于 i18n JSON 中（通过 `AbilityDef.description` 存储 i18n key），禁止在卡牌配置、AbilityDef、i18n 三处同时维护相同文本

**参考实现**：
- ✅ DiceThrone 的 `CombatAbilityManager`（虽然是历史实现，但验证逻辑在能力定义中）
- ✅ 引擎层 `abilityText()` / `abilityEffectText()` 辅助函数（`engine/primitives/ability.ts` 导出，所有游戏共用，返回 i18n key）
- ✅ SmashUp 的 `registerAbility()` 注册表模式
- ✅ SummonerWars 的 `AbilityExecutorRegistry` 执行器注册（已完成迁移）
- ✅ SmashUp 的 `resolveCardText(def, t)` 从 i18n 获取卡牌文本（已完成迁移）
- ✅ SummonerWars 的 `domain/executors/` 按派系注册执行器（已完成迁移）

### 现有游戏技能架构债务清单

> 以下是已知的历史债务状态。已清理的标记为 ✅，剩余的新游戏禁止模仿。

| 游戏 | 问题 | 状态 | 说明 |
|------|------|------|------|
| SummonerWars | `config/factions/*.ts` 硬编码 `abilityText` | ✅ 已清理 | 字段已删除，技能文本统一走 i18n |
| SummonerWars | `execute/abilities.ts` 巨型 switch-case | ✅ 已清理 | 已替换为 `AbilityExecutorRegistry`，按派系拆分到 `executors/` |
| SummonerWars | `domain/abilities.ts` 自建 `AbilityRegistry` 类 | ✅ 已清理 | 已改用引擎层 `AbilityRegistry<AbilityDef>` |
| SummonerWars | UI 层硬编码技能按钮 | ✅ 已清理 | `AbilityButtonsPanel` 已改为数据驱动（遍历 `AbilityDef.ui` 配置） |
| SmashUp | `data/cards.ts` + `data/factions/*.ts` 硬编码 `abilityText` | ✅ 已清理 | 字段已删除，卡牌文本统一走 i18n，`resolveCardText` 从 i18n 获取 |
| SmashUp | `domain/abilityRegistry.ts` 自建注册表 | 🟡 轻微 | 未使用引擎层，但模式本身合理（函数注册表） |
| DiceThrone | `CombatAbilityManager` 自建管理器 | 🟡 轻微 | 未使用引擎层，但内部设计合理（i18n key + 数据驱动） |

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

## 交互链完整性审计规范（强制）

> **多步交互技能（UI 需要 ≥2 步用户输入才能构建完整 payload）必须声明 `interactionChain`**

### 背景

静态引用链测试（`entityIntegritySuite`）和行为审计（`abilityBehaviorAudit`）只能检测"引用是否存在"和"关键词-行为映射"，无法检测"UI 多步交互链断裂"——例如 `structure_shift` 技能 UI 选了建筑但没有第二步选方向，导致 `payload.newPosition` 为 `undefined`，执行器静默返回空事件。

### 核心类型（`engine/primitives/ability.ts`）

```typescript
/** 交互步骤声明 */
interface InteractionStep {
  step: string;           // 步骤 ID（如 'selectBuilding'）
  inputType: 'unit' | 'position' | 'card' | 'direction' | 'choice' | 'cards';
  producesField: string;  // 此步骤产出的 payload 字段名
  optional?: boolean;     // 是否可跳过
}

/** Payload 契约声明 */
interface PayloadContract {
  required: string[];     // 执行器必需的 payload 字段
  optional?: string[];    // 可选字段
}

/** 交互链声明 */
interface InteractionChain {
  steps: InteractionStep[];
  payloadContract: PayloadContract;
}
```

### 使用方式

#### 1. AbilityDef 中声明 `interactionChain`

```typescript
// domain/abilities-frost.ts
{
  id: 'structure_shift',
  trigger: 'activated',
  interactionChain: {
    steps: [
      { step: 'selectBuilding', inputType: 'position', producesField: 'targetPosition' },
      { step: 'selectDirection', inputType: 'direction', producesField: 'newPosition' },
    ],
    payloadContract: { required: ['targetPosition', 'newPosition'] },
  },
}
```

#### 2. 执行器注册时声明 `payloadContract`

```typescript
// executors/frost.ts
abilityExecutorRegistry.register('structure_shift', handler, {
  payloadContract: { required: ['targetPosition', 'newPosition'] },
});
```

#### 3. 测试文件使用工厂函数

```typescript
// __tests__/interactionChainAudit.test.ts
import { createInteractionChainAuditSuite } from '../../../engine/testing/interactionChainAudit';

createInteractionChainAuditSuite({
  suiteName: 'SummonerWars 交互链完整性',
  abilities: buildAuditableAbilities(),
  requiresMultiStep,
  declarationWhitelist: new Set(['mind_capture_resolve']),
});
```

### 三类检查

| 检查 | 说明 | 检测的 bug |
|------|------|-----------|
| 声明完整性 | 多步交互技能是否都声明了 `interactionChain` | 新增多步技能忘记声明 |
| 步骤覆盖 | `steps` 产出 ⊇ `payloadContract.required` | UI 缺少某个交互步骤（如缺少"选方向"） |
| 契约对齐 | AbilityDef 的 `payloadContract` 与执行器的 `payloadContract` 双向一致 | 两端字段不同步 |

### 循环依赖注意事项

`executors/index.ts` 使用副作用导入模式，与 `abilities.ts` 存在模块初始化顺序问题。测试文件中使用手动 `EXECUTOR_CONTRACTS` Map 而非动态导入 `abilityExecutorRegistry`。执行器上的 `payloadContract` 仍然注册（供未来运行时校验使用）。

### 强制要求

- **新增多步交互技能**：必须在 `AbilityDef` 中声明 `interactionChain`，在执行器 `register()` 中声明 `payloadContract`
- **新增游戏**：如有多步交互技能，必须创建 `interactionChainAudit.test.ts`
- **白名单**：由特殊系统处理的多步技能（如 Modal 决策驱动）可加入 `declarationWhitelist`，但必须注释原因

### 参考实现

- 引擎层工厂：`src/engine/testing/interactionChainAudit.ts`
- 引擎层类型：`src/engine/primitives/ability.ts`（`InteractionStep`、`PayloadContract`、`InteractionChain`）
- SummonerWars 测试：`src/games/summonerwars/__tests__/interactionChainAudit.test.ts`
- SummonerWars 声明示例：`src/games/summonerwars/domain/abilities-frost.ts`（`structure_shift`、`frost_axe`）

---

## 交互完整性审计规范 — 模式 B：Interaction 链（强制）

> **使用 InteractionSystem（createSimpleChoice + InteractionHandler）的游戏必须创建此审计**

### 背景

SmashUp 风格的游戏使用 `createSimpleChoice(sourceId)` 创建交互 → 玩家选择 → `registerInteractionHandler(sourceId)` 处理。风险点：
- 能力创建了 Interaction 但没注册对应 handler → 选择后无响应
- 多步链中间步骤的 handler 缺失 → 链断裂

### 三类检查

| 检查 | 说明 | 检测的 bug |
|------|------|-----------|
| Handler 注册覆盖 | 所有 sourceId 都有对应 handler | 能力创建了交互但没注册处理函数 |
| 链式完整性 | handler 产出的后续 sourceId 也有对应 handler | 多步链中间断裂 |
| 孤儿 Handler | 注册了 handler 但无能力引用 | 死代码/重构遗留 |

### 使用方式

```typescript
// __tests__/interactionCompletenessAudit.test.ts
import { createInteractionCompletenessAuditSuite } from '../../../engine/testing/interactionCompletenessAudit';

const INTERACTION_SOURCES = [
  { id: 'alien_supreme_overlord', name: '外星霸主', interactionSourceIds: ['alien_supreme_overlord'] },
  // ...
];

const HANDLER_CHAINS = [
  { sourceId: 'zombie_lord_choose_minion', producesSourceIds: ['zombie_lord_choose_base'] },
  // ...
];

createInteractionCompletenessAuditSuite({
  suiteName: 'SmashUp 交互完整性',
  sources: INTERACTION_SOURCES,
  registeredHandlerIds: getRegisteredInteractionHandlerIds(),
  chains: HANDLER_CHAINS,
});
```

### 与模式 A 的关系

两种模式覆盖不同的交互风险：
- **模式 A（interactionChainAudit）**：UI 状态机逐步收集 payload → 执行器。检查 payload 字段覆盖。
- **模式 B（interactionCompletenessAudit）**：执行器创建 Interaction → handler 处理。检查 handler 注册覆盖。

一个游戏可以同时使用两种模式（如果同时有两种交互风格）。

### 参考实现

- 引擎层工厂：`src/engine/testing/interactionCompletenessAudit.ts`
- SmashUp 测试：`src/games/smashup/__tests__/interactionCompletenessAudit.test.ts`

---

## 能力行为审计规范（推荐）

> **卡牌/能力数量多的游戏（≥30 张卡或 ≥15 个能力）推荐创建此审计**

### 背景

卡牌的 i18n 描述文本说了某个效果（比如"回合开始时抽牌"），但代码里忘了注册对应的触发器/执行器。在卡牌数量多的游戏里很容易出现。`abilityBehaviorAudit` 通过声明式规则自动扫描描述→代码的一致性。

### 五类检查

| 检查 | 说明 | 检测的 bug |
|------|------|-----------|
| 关键词→行为映射 | 描述匹配正则 → 验证对应行为已注册 | 描述说"回合开始时抽牌"但没注册 onTurnStart 触发器 |
| ongoing 注册覆盖 | subtype=ongoing 的行动卡必须在注册表中有条目 | ongoing 卡没注册任何效果（trigger/protection/restriction/modifier） |
| 能力标签执行器覆盖 | 有 abilityTags 的卡必须有对应执行器 | 卡牌定义了 onPlay 标签但 abilityRegistry 没有执行器 |
| 自毁行为完整性 | 描述含"消灭本卡"→ 必须有自毁触发器 | 描述说消灭自己但代码没实现 |
| 条件语句完整性 | 描述含"如果你有随从"→ 代码有条件检查 | 描述有条件但代码无条件分支 |

### 使用方式

```typescript
import { createAbilityBehaviorAuditSuite } from '../../../engine/testing';

createAbilityBehaviorAuditSuite({
  suiteName: 'SmashUp 能力行为审计',
  keywordBehavior: {
    entities: auditableEntities,
    rules: [
      {
        name: '回合开始触发器',
        keywordPattern: /回合开始时/,
        checkBehavior: (id) => triggerRegistry.has(id),
        violationMessage: (id) => `描述含"回合开始时"但未注册 onTurnStart 触发器`,
      },
    ],
  },
  ongoingCollection: { ongoingActionIds, registeredOngoingIds },
  abilityTagCoverage: { entities, registeredAbilityIds, makeRegistryKey: (id, tag) => `${id}::${tag}` },
  selfDestruct: { entities, selfDestructPatterns: [/消灭本卡/], hasSelfDestructBehavior: (id) => ... },
  condition: { entities, rules: [...] },
});
```

### 参考实现

- 引擎层工厂：`src/engine/testing/abilityBehaviorAudit.ts`
- 输入接口：`AuditableEntity`（id + name + descriptionText + entityType + subtype + abilityTags）

---

## 卡牌完整性审计规范（推荐）

> **有卡牌系统的游戏（行动卡/升级卡/装备卡等）推荐创建此审计**

### 背景

卡牌定义中的常见遗漏：描述暗示了打出条件但 `playCondition` 未实现、效果结构不完整、占位符配置未清理。`cardCompletenessAudit` 通过声明式规则自动检测这些问题。

### 三类检查

| 检查 | 说明 | 检测的 bug |
|------|------|-----------|
| 描述条件性语言检测 | i18n 描述匹配条件模式 → 验证 playCondition 有对应字段 | 描述说"造成至少3伤害后"但没有 requireMinDamageDealt |
| 卡牌结构完整性 | 声明式结构规则（appliesTo + check） | 升级卡缺少 replaceAbility、行动卡无效果、骰子卡缺前置条件 |
| 占位符检测 | 检测无效/占位配置 | playCondition 只有 `requireDiceExists: false`（占位） |

### 使用方式

```typescript
import { createCardCompletenessAuditSuite, type AuditableCard } from '../../../engine/testing';

// 游戏层适配：将游戏卡牌类型映射为 AuditableCard
const auditableCards: AuditableCard[] = gameCards.map(card => ({
  id: card.id,
  type: card.type,
  timing: card.timing,
  effects: card.effects?.map(e => ({ description: e.description, action: e.action })),
  playCondition: card.playCondition,
}));

createCardCompletenessAuditSuite({
  suiteName: 'DiceThrone 卡牌完整性审计',
  descriptionCondition: {
    cards: actionCards,
    getDescriptions: (id) => [zhDesc[id], enDesc[id]].filter(Boolean),
    rules: [
      { name: '伤害条件', patterns: [/造成.*至少.*\d+.*伤害/], requiredConditionField: 'requireMinDamageDealt' },
    ],
  },
  cardStructure: {
    cards: auditableCards,
    rules: [
      { name: '升级卡必须有效果', appliesTo: c => c.type === 'upgrade', check: c => ..., describeViolation: c => ... },
    ],
  },
  placeholder: {
    cards: auditableCards,
    patterns: [
      { name: '占位 playCondition', isPlaceholder: c => ... },
    ],
  },
});
```

### 与 abilityBehaviorAudit 的关系

两者互补：
- `abilityBehaviorAudit`：面向能力/卡牌的**行为注册**（触发器、执行器、ongoing 效果），检测"描述说了但代码没注册"
- `cardCompletenessAudit`：面向卡牌的**定义结构**（playCondition、effects、timing），检测"配置不完整或有占位符"

一个游戏可以同时使用两者。

### 参考实现

- 引擎层工厂：`src/engine/testing/cardCompletenessAudit.ts`
- DiceThrone 测试：`src/games/dicethrone/__tests__/card-completeness-audit.test.ts`

---

## 引擎测试工具总览

> 新增游戏时，根据游戏特征选择需要的审计工具。

| 工具 | 文件 | 适用场景 | 已使用的游戏 |
|------|------|---------|-------------|
| GameTestRunner | `index.ts` | 命令序列执行 + 状态断言 | DiceThrone、SummonerWars、SmashUp |
| entityIntegritySuite | `entityIntegritySuite.ts` | 数据定义契约（注册表完整性/引用链/触发路径/效果契约） | SmashUp、DiceThrone |
| referenceValidator | `referenceValidator.ts` | 实体引用链提取与验证 | SmashUp |
| abilityBehaviorAudit | `abilityBehaviorAudit.ts` | 描述→代码一致性（关键词行为/ongoing/标签/自毁/条件） | SmashUp |
| cardCompletenessAudit | `cardCompletenessAudit.ts` | 卡牌定义结构（playCondition/效果/占位符） | DiceThrone |
| interactionChainAudit | `interactionChainAudit.ts` | UI 状态机 payload 覆盖（模式 A） | SummonerWars |
| interactionCompletenessAudit | `interactionCompletenessAudit.ts` | Interaction handler 注册覆盖（模式 B） | SmashUp |

### 新游戏选型指南

- 有多步 UI 交互（逐步收集 payload）→ `interactionChainAudit`
- 有 InteractionSystem（createSimpleChoice + handler）→ `interactionCompletenessAudit`
- 有卡牌系统（行动卡/升级卡）→ `cardCompletenessAudit`
- 卡牌/能力数量多（≥30）→ `abilityBehaviorAudit`
- 有注册表 + 数据定义 → `entityIntegritySuite`
- 所有游戏 → `GameTestRunner`

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
- **系统注册**：新系统必须在 `src/engine/systems/` 实现，并在 `src/engine/systems/index.ts` 导出；如需默认启用，必须加入 `createBaseSystems()`。
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

### 首次挂载跳过历史事件（强制模板）

> **所有消费 EventStream 的 Hook/Effect 都必须遵循此模式，无一例外。**
> 刷新后 `eventStream.entries` 仍包含历史事件，若不在首次挂载时跳过，后续任何 state 变化都会导致历史事件被当作新事件触发动画/音效。

**模式 A：过滤式消费（推荐，适用于需要处理多条新事件的场景）**

```typescript
const lastSeenIdRef = useRef<number>(-1);
const isFirstMountRef = useRef(true);

// 首次挂载：将指针推进到末尾，跳过所有历史事件
useEffect(() => {
    if (isFirstMountRef.current && eventStreamEntries.length > 0) {
        lastSeenIdRef.current = eventStreamEntries[eventStreamEntries.length - 1].id;
        isFirstMountRef.current = false;
    }
}, [eventStreamEntries]);

// 后续：只处理 id > lastSeenId 的新事件
useEffect(() => {
    if (isFirstMountRef.current) return;
    const newEntries = eventStreamEntries.filter(e => e.id > lastSeenIdRef.current);
    if (newEntries.length === 0) return;
    // ... 处理 newEntries
    lastSeenIdRef.current = newEntries[newEntries.length - 1].id;
}, [eventStreamEntries]);
```

**模式 B：单条最新事件消费（适用于只关心最近一条特定事件的场景）**

```typescript
// ⚠️ 关键：初始值必须用当前最新事件的 id，而非 null/-1
const lastProcessedIdRef = useRef<number | null>(latestEntry?.id ?? null);

useEffect(() => {
    if (!latestEntry) return;
    if (lastProcessedIdRef.current === latestEntry.id) return;
    lastProcessedIdRef.current = latestEntry.id;
    // ... 处理 latestEntry
}, [latestEntry]);
```

**禁止的写法**：
```typescript
// ❌ 禁止！初始值为 null/-1 且无首次挂载跳过逻辑
const lastIdRef = useRef<number | null>(null);
useEffect(() => {
    if (lastIdRef.current === entry.id) return; // 首次渲染时 null !== 历史id，会触发重播
    // ...
}, [entry]);

// ❌ 禁止！仅靠 mountedRef 守卫但遗漏了某些 effect
// mountedRef 只能挡住首帧，后续 state 变化导致 entries 引用变化时仍会重播历史事件
```

**检查清单（新增消费 EventStream 的代码时必须逐项确认）**：
1. ✅ 是否在首次挂载时将消费指针推进到当前最新事件？
2. ✅ 后续 effect 是否只处理 `id > lastSeenId` 的事件？
3. ✅ 如果用模式 B（单条消费），`useRef` 初始值是否为 `currentEntry?.id ?? null`？
4. ✅ 是否所有消费同一 EventStream 的 effect 都遵循了相同模式？（同一 Hook 内不能混用有守卫和无守卫的 effect）

- **参考实现**：
  - 模式 A：`src/games/dicethrone/hooks/useCardSpotlight.ts`、`src/games/dicethrone/hooks/useActiveModifiers.ts`
  - 模式 B：`src/games/dicethrone/hooks/useAnimationEffects.ts` 的 `lastDamageEventIdRef`
  - 音效去重：`src/lib/audio/useGameAudio.ts`

---

## ActionLogSystem 使用规范（强制）

> **操作日志必须由游戏层提供语义化文案**

- ActionLogSystem 只负责收集/落库日志，严禁在系统层硬编码游戏文案。
- `formatEntry` 必须返回 i18n key 的文本片段（`ActionLogSegment`），禁止直接拼接硬编码字符串。
- 需要覆盖所有**玩家可见的状态变化**（伤害、治疗、摧毁、移动、资源变化、VP 等），但**不记录纯 UI 行为**。
- 支持多条日志返回：命令级日志 + 同步事件级日志，确保回放时可完整还原过程。
- 卡牌类日志必须使用 `card` 片段以支持 hover 预览（并确保 cardId 可从事件或棋盘解析得到）。

### 音效与动画的分流规则（强制）

- **无动画事件**（投骰子、出牌、阶段切换等）：`feedbackResolver` 返回 `SoundKey`（纯字符串），框架层立即播放。
- **有动画事件**（伤害、治疗、状态增减、Token 增减）：`feedbackResolver` **必须返回 `null`**，音效由动画层在冲击帧 `onImpact` 回调中直接 `playSound(resolvedKey)`。
- **FX 特效绑定音效/震动**：通过 `FeedbackPack` 在 `fxSetup.ts` 注册时声明。若音效 key 依赖运行时数据，使用 `FeedbackPack.sound: { source: 'params' }`，由 `useFxBus` 从 `event.params.soundKey` 读取并在 push（immediate）或渲染器 `onImpact()`（on-impact）时触发。禁止在 `useGameEvents` 中手动传 `params.onImpact` 回调。
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

## 阶段推进权限的 UI 消费规范（强制）

- **领域层**（`rules.ts`）定义 `canAdvancePhase(core, phase)` 做规则校验（选角门禁、防御阶段 rollConfirmed、弃牌超限等）。
- **FlowSystem** 通过 `flowHooks.canAdvance` 调用领域层校验，作为服务端兜底。
- **UI 层**禁止重复实现领域校验逻辑（如手动检查 `rollConfirmed`），应复用领域层函数。
- **正确模式**：在游戏状态 Hook（如 `useDiceThroneState`）中计算 `canAdvancePhase`，组合领域校验 + 交互状态判断（`!hasPendingInteraction`），Board 叠加 `isFocusPlayer` 后直接消费。
- **参考实现**：`src/games/dicethrone/hooks/useDiceThroneState.ts` 的 `canAdvancePhase` 字段。

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


---

## UI 提示系统使用规范（推荐）

> **适用场景**：需要在 UI 层显示"可交互实体"的视觉提示（如可移动的单位、可使用技能的单位、可放置卡牌的位置）

### 设计原则

- **职责分离**：引擎层定义接口，游戏层实现逻辑，UI 层消费数据
- **轻量级**：引擎层只有类型定义和工具函数，无具体实现
- **可选使用**：游戏可以选择不使用此系统

### 核心类型

```typescript
// 引擎层 (engine/primitives/uiHints.ts)
interface UIHint {
  type: 'actionable' | 'ability' | 'target' | 'placement' | 'selection';
  position: Position;
  entityId?: string;
  actions?: string[];  // 可用的操作列表
  meta?: Record<string, unknown>;
}

type UIHintProvider<TCore = unknown> = (
  core: TCore,
  filter?: UIHintFilter
) => UIHint[];
```

### 使用流程

#### 1. 游戏层实现 UIHintProvider

```typescript
// games/summonerwars/domain/uiHints.ts
export function getSummonerWarsUIHints(
  core: SummonerWarsCore,
  filter?: UIHintFilter
): UIHint[] {
  const hints: UIHint[] = [];
  const playerId = filter?.playerId as PlayerId;
  const phase = filter?.phase as GamePhase;

  // 可移动/攻击的单位
  if (!filter?.types || filter.types.includes('actionable')) {
    hints.push(...getActionableUnitHints(core, playerId, phase));
  }

  // 可使用技能的单位
  if (!filter?.types || filter.types.includes('ability')) {
    hints.push(...getAbilityReadyHints(core, playerId, phase));
  }

  return hints;
}
```

#### 2. UI 层消费数据

```typescript
// games/summonerwars/ui/useCellInteraction.ts
import { getSummonerWarsUIHints } from '../domain/uiHints';
import { extractPositions } from '../../../engine/primitives/uiHints';

const abilityReadyPositions = useMemo(() => {
  if (!isMyTurn) return [];
  
  const hints = getSummonerWarsUIHints(core, {
    types: ['ability'],
    playerId: myPlayerId,
    phase: currentPhase,
  });
  
  return extractPositions(hints);
}, [core, currentPhase, isMyTurn, myPlayerId]);
```

#### 3. 渲染视觉提示

```typescript
// UI 组件中
{abilityReadyPositions.map(pos => (
  <AbilityReadyIndicator key={`${pos.row}-${pos.col}`} position={pos} />
))}
```

### 工具函数

- `extractPositions(hints)` — 提取位置列表
- `filterUIHints(hints, filter)` — 过滤提示
- `groupUIHintsByType(hints)` — 按类型分组

### 优势

1. **职责清晰**：UI 层不包含业务逻辑，只负责渲染
2. **易于测试**：游戏层的纯函数，可以单独测试
3. **易于扩展**：新游戏只需实现一个函数
4. **类型安全**：使用 TypeScript 泛型，编译时检查

### 示例：其他游戏

```typescript
// Dice Throne
export function getDiceThroneUIHints(core, filter): UIHint[] {
  const hints: UIHint[] = [];
  
  // 可使用的技能卡
  if (!filter?.types || filter.types.includes('ability')) {
    const usableCards = getUsableAbilityCards(core, filter?.playerId);
    hints.push(...usableCards.map(card => ({
      type: 'ability' as const,
      position: { row: 0, col: 0 },
      entityId: card.id,
      actions: [card.abilityId],
    })));
  }
  
  return hints;
}
```

### 注意事项

- **不要在 core 中存储 UI 提示**：UI 提示是派生数据，应该在需要时计算
- **使用 useMemo 缓存**：避免每次渲染都重新计算
- **支持过滤器**：只计算需要的提示类型，提高性能

### 参考实现

- 引擎层：`src/engine/primitives/uiHints.ts`
- 召唤师战争：`src/games/summonerwars/domain/uiHints.ts`
- UI 层使用：`src/games/summonerwars/ui/useCellInteraction.ts`
