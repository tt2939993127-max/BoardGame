# GAS风格通用能力系统设计方案

> 参考UE的Gameplay Ability System (GAS)，设计完全通用的能力系统
> ⚠️ 现状说明：原实现基于已移除的旧 systems 层。当前架构已迁移为 `src/engine/primitives/` + 游戏层组合（如 `src/games/<gameId>/domain/` 内的局部预设），本文作为概念设计参考。

## 实现状态

- ✅ **已完成（旧架构）** - 2024年重构
- ✅ **已迁移** - 2026年：去除旧 systems 层，使用 `src/engine/primitives/` + 游戏层组合
- ✅ **通用能力框架** - 2026-02：`engine/primitives/ability.ts` 提供 `AbilityRegistry`、`AbilityExecutorRegistry`、`AbilityDef` 泛型类型、可用性检查工具函数
- ✅ **层级 Tag 系统** - 2026-02：`engine/primitives/tags.ts` 提供 `TagContainer`、层级前缀匹配（`Status.Debuff.*`）、层数/持续时间/叠加模式、`tickDurations` 回合结算
- ✅ **Modifier 管线** - 2026-02：`engine/primitives/modifier.ts` 提供 `ModifierStack`、flat/percent/override/compute 四种修改器类型、优先级排序管线、条件跳过、`tickModifiers` 回合结算
- ✅ **AttributeSet** - 2026-02：`engine/primitives/attribute.ts` 提供 base+modifier→current 属性系统，集成 `ModifierStack`，支持 min/max 钳制、`tickAttributeModifiers` 回合结算

## 目标

- 不预设任何特定游戏类型（战斗/棋盘/卡牌）
- 数据驱动，能力/效果通过数据定义
- 可扩展，游戏可在不修改系统的情况下添加新能力类型

## 架构分层

```
src/engine/
└── primitives/              # 通用原语工具（无领域概念）
    ├── ability.ts           # ★ 通用能力框架（AbilityRegistry + AbilityExecutorRegistry + 可用性检查）
    ├── expression.ts
    ├── condition.ts
    ├── target.ts
    ├── effects.ts
    ├── zones.ts
    ├── dice.ts
    ├── resources.ts
    ├── tags.ts              # ★ 层级 Tag 系统（TagContainer + 层级前缀匹配 + stacks/duration + tickDurations）
    ├── modifier.ts          # ★ Modifier 管线（flat/percent/override/compute + 优先级排序 + tickModifiers）
    ├── attribute.ts         # ★ AttributeSet（base + modifier → current，集成 ModifierStack）
    └── index.ts
src/games/<gameId>/domain/   # 游戏层组合/预设（按需）
└── combat/                  # （可选）战斗类游戏局部预设
```

## 核心抽象
> 说明：Ability（§5）、Tag（§2）、Modifier 管线、AttributeSet 均已在 `engine/primitives/` 中实现。GameContext 为概念参考。

### 1. Attribute（属性）— ✅ 已实现

通用数值属性，不预设HP/MP等。实现位于 `engine/primitives/attribute.ts`，集成 `modifier.ts`：

```typescript
import { createAttributeSet, getBase, getCurrent, addAttributeModifier, tickAttributeModifiers } from '@/engine/primitives';

const set = createAttributeSet([{ id: 'attack', name: '攻击力', initialValue: 10, min: 0, max: 100 }]);
const buffed = addAttributeModifier(set, 'attack', { id: 'rage', type: 'percent', value: 50 });
getCurrent(buffed, 'attack'); // 15（10 * 1.5）
```

旧概念参考（已实现替代）：
```typescript
// 旧架构概念位置，已由 attribute.ts 替代
interface AttributeDefinition {
  id: string;           // 用户定义的属性名，如 'health', 'mana', 'gold'
  name: string;         // 显示名称
  min?: number;         // 最小值
  max?: number;         // 最大值
  initialValue: number; // 初始值
  category?: string;    // 可选分类
}

// 使用示例
const attrManager = createAttributeManager();
attrManager.registerAttribute({ id: 'health', name: '生命值', min: 0, max: 50, initialValue: 50 });
attrManager.initializeEntity('player1');
attrManager.modifyAttribute('player1', 'health', -5); // 扣血
```

### 2. Tag（标签）— ✅ 已实现

带层数和持续时间的层级标签系统。实现位于 `engine/primitives/tags.ts`：

```typescript
import { createTagContainer, addTag, hasTag, matchTags, tickDurations } from '@/engine/primitives';

let tags = createTagContainer();
tags = addTag(tags, 'Status.Debuff.Stun', { stacks: 2, duration: 3, source: 'ability-1' });
hasTag(tags, 'Status.Debuff'); // true（层级前缀匹配）
matchTags(tags, 'Status.Debuff'); // [['Status.Debuff.Stun', entry]]
const { container, expired } = tickDurations(tags); // 回合结算
```

旧概念参考（已实现替代）：
```typescript
// 旧架构概念位置，已由 tags.ts 替代
interface TagInstance {
  id: string;           // 支持层级，如 'Status.Debuff.Stun'
  stacks: number;
  duration?: number;
  source?: string;
}
```

### 3. Effect（效果）

通用效果操作，不预设"伤害"/"治疗"：

```typescript
// 概念位置（旧架构，已移除）
type EffectOperation =
  | { type: 'modifyAttribute'; target: TargetRef; attrId: string; value: Expression }
  | { type: 'setAttribute'; target: TargetRef; attrId: string; value: Expression }
  | { type: 'addTag'; target: TargetRef; tagId: string; stacks?: number; duration?: number }
  | { type: 'removeTag'; target: TargetRef; tagId: string; stacks?: number }
  | { type: 'custom'; actionId: string; params?: Record<string, unknown> };

// Expression 支持动态计算
type Expression =
  | number
  | { type: 'attribute'; entityId: string; attrId: string }
  | { type: 'multiply'; left: Expression; right: Expression }
  // ...更多运算
```

### 4. Condition（条件）

可扩展的条件系统：

```typescript
// 概念位置（旧架构，已移除）
// 核心条件类型
type CoreCondition =
  | { type: 'always' }
  | { type: 'attribute'; attrId: string; op: '<' | '<=' | '=' | '>=' | '>'; value: number }
  | { type: 'hasTag'; tagId: string; minStacks?: number }
  | { type: 'composite'; conditions: BaseCondition[]; logic: 'and' | 'or' }
  | { type: 'not'; condition: BaseCondition };

// 游戏可扩展自定义条件
const registry = createConditionRegistry();
registry.register('diceSet', (cond, ctx) => {
  // 自定义骰子组合判断逻辑
});
```

### 5. Ability（能力）— ✅ 已实现

通用能力框架（`engine/primitives/ability.ts`）：

```typescript
import {
  AbilityRegistry,
  AbilityExecutorRegistry,
  createAbilityRegistry,
  createAbilityExecutorRegistry,
  checkAbilityCost,
  filterByTags,
  checkAbilityCondition,
  type AbilityDef,
  type AbilityVariant,
  type AbilityContext,
  type AbilityResult,
  type AbilityExecutor,
} from '@/engine/primitives';

// 游戏层通过泛型特化
type MyDef = AbilityDef<MyEffect, MyTrigger>;
const registry = createAbilityRegistry<MyDef>('my-game');
registry.registerAll(myAbilities);
```

### 6. GameContext（通用上下文）

不预设战斗操作：

```typescript
// 概念位置（旧架构，已移除）
interface GameContext {
  // 属性操作
  getAttribute(entityId: string, attrId: string): number;
  setAttribute(entityId: string, attrId: string, value: number): void;
  modifyAttribute(entityId: string, attrId: string, delta: number): number;
  
  // 标签操作
  hasTag(entityId: string, tagId: string): boolean;
  getTagStacks(entityId: string, tagId: string): number;
  addTag(entityId: string, tagId: string, stacks?: number, duration?: number): void;
  removeTag(entityId: string, tagId: string, stacks?: number): void;
  getTagsMatching(entityId: string, pattern: string): string[];
  
  // 目标解析
  resolveTargets(ref: TargetRef, sourceId: string): string[];
  
  // 自定义操作（游戏扩展点）
  executeCustomAction?(actionId: string, params?: Record<string, unknown>): void;
}

// 快速创建
const ctx = createGameContext(attrManager, tagManager, {
  resolveTargets: (ref, sourceId) => { /* 游戏特定逻辑 */ },
  executeCustomAction: (actionId, params) => { /* 游戏特定逻辑 */ },
});
```

## 战斗类游戏预设

不再提供全局预设；战斗类游戏可在 `src/games/<gameId>/domain/combat/` 维护局部预设（如 DiceThrone）：

```typescript
// 效果时机
type EffectTiming = 'immediate' | 'preDefense' | 'withDamage' | 'postDamage';

// 战斗上下文（扩展通用 GameContext）
interface CombatGameContext {
  applyDamage(targetId: string, amount: number, sourceAbilityId?: string): number;
  applyHeal(targetId: string, amount: number, sourceAbilityId?: string): void;
  grantStatus(targetId: string, statusId: string, stacks: number): void;
  // ...
}

// 战斗技能管理器
const combatManager = createCombatAbilityManager();
combatManager.registerAbility({ /* CombatAbilityDef */ });
```

## 与旧设计的对比

| 旧设计 | 新版（primitives + 游戏层） |
|---------------------|--------------|
| `applyDamage(target, amount)` | `modifyAttribute(target, 'health', -amount)` |
| `applyHeal(target, amount)` | `modifyAttribute(target, 'health', amount)` |
| `grantStatus(target, statusId)` | `addTag(target, 'status.' + statusId)` |
| `EffectTiming` 硬编码 | 游戏预设或自定义 |
| `AbilityTag: ultimate` | 用户定义 Tags |
| 单一 GameContext | 通用接口 + 游戏扩展 |

## 使用指南

### 新游戏（推荐路径）

```typescript
import {
  createAbilityRegistry,
  createAbilityExecutorRegistry,
  createConditionHandlerRegistry,
  createEffectHandlerRegistry,
  checkAbilityCost,
  filterByTags,
  checkAbilityCondition,
  type AbilityDef,
  type AbilityContext,
} from '@/engine/primitives';

// 1. 定义游戏特化类型
interface MyEffect { type: string; value: number; }
type MyTrigger = 'onAttack' | 'onDefend' | 'passive';
type MyDef = AbilityDef<MyEffect, MyTrigger>;

// 2. 创建注册表实例（每游戏独立）
const abilityDefs = createAbilityRegistry<MyDef>('my-game');
const abilityExecutors = createAbilityExecutorRegistry<MyCtx, MyEvent>('my-game-executors');
const conditionHandlers = createConditionHandlerRegistry();
const effectHandlers = createEffectHandlerRegistry<MyState, MyEvent>();

// 3. 注册定义和处理器
abilityDefs.registerAll(allAbilities);
abilityExecutors.register('fireball', handleFireball, 'onPlay');

// 4. 使用
const available = filterByTags(abilityDefs.getByTrigger('onAttack'), blockedTags);
if (checkAbilityCost(def, resources) && checkAbilityCondition(def, ctx, conditionHandlers)) {
  const executor = abilityExecutors.resolve(def.id, 'onPlay');
  const result = executor?.(ctx);
}
```

### 战斗类游戏（局部预设）

```typescript
import { 
  createCombatAbilityManager,
  type CombatAbilityDef,
} from '@/games/<gameId>/domain/combat';

const combatManager = createCombatAbilityManager();
combatManager.registerAbility({
  id: 'slash',
  name: '斩击',
  type: 'offensive',
  effects: [{ description: '造成 3 点伤害', action: { type: 'damage', value: 3 } }],
});
```

## 完成清单（归档）

- [x] 通用能力系统概念设计
- [x] 战斗类预设概念设计
- [x] 迁移为 `engine/primitives/` + 游戏层组合（2026）
- [x] 清理旧 systems 层与文档
- [x] 通用能力框架 `ability.ts`（AbilityRegistry + AbilityExecutorRegistry + 可用性工具）— 2026-02
- [x] 层级 Tag 系统 `tags.ts`（TagContainer + 层级前缀匹配 + stacks/duration + tickDurations）— 2026-02
- [x] Modifier 管线 `modifier.ts`（flat/percent/override/compute + 优先级管线 + tickModifiers）— 2026-02
- [x] AttributeSet `attribute.ts`（base + modifier → current + min/max + tickAttributeModifiers）— 2026-02
