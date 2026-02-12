# GAS风格通用能力系统设计方案

> 参考UE的Gameplay Ability System (GAS)，设计完全通用的能力系统
> ⚠️ 现状说明：原实现基于已移除的旧 systems 层。当前架构已迁移为 `src/engine/primitives/` + 游戏层组合（如 `src/games/<gameId>/domain/` 内的局部预设），本文作为概念设计参考。

## 实现状态

- ✅ **已完成（旧架构）** - 2024年重构
- ✅ **已迁移** - 2026年：去除旧 systems 层，使用 `src/engine/primitives/` + 游戏层组合

## 目标

- 不预设任何特定游戏类型（战斗/棋盘/卡牌）
- 数据驱动，能力/效果通过数据定义
- 可扩展，游戏可在不修改系统的情况下添加新能力类型

## 架构分层

```
src/engine/
└── primitives/              # 通用原语工具（无领域概念）
    ├── expression.ts
    ├── condition.ts
    ├── target.ts
    ├── effects.ts
    ├── zones.ts
    ├── dice.ts
    ├── resources.ts
    └── index.ts
src/games/<gameId>/domain/   # 游戏层组合/预设（按需）
└── combat/                  # （可选）战斗类游戏局部预设
```

## 核心抽象
> 说明：以下接口为概念性说明，当前未作为统一模块提供；如需使用请在游戏层结合 primitives 实现。

### 1. Attribute（属性）

通用数值属性，不预设HP/MP等：

```typescript
// 概念位置（旧架构，已移除）
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

### 2. Tag（标签）

带层数和持续时间的标签系统：

```typescript
// 概念位置（旧架构，已移除）
interface TagInstance {
  id: string;           // 支持层级，如 'status.debuff.stun'
  stacks: number;       // 层数
  duration?: number;    // 剩余持续回合
  source?: string;      // 来源
}

// 使用示例
const tagManager = createTagManager();
tagManager.addTag('player1', 'status.poison', { stacks: 2, duration: 3 });
tagManager.getTagsMatching('player1', 'status.*'); // 获取所有状态
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

### 5. Ability（能力）

通用能力框架：

```typescript
// 概念位置（旧架构，已移除）
interface AbilityDefinition {
  id: string;
  name: string;
  description?: string;
  tags?: string[];
  trigger?: EffectCondition;
  effects?: EffectDefinition[];
  variants?: AbilityVariant[];
  cooldown?: number;
  cost?: Record<string, number>;
}
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

### 新项目

```typescript
import {
  createConditionHandlerRegistry,
  registerConditionHandler,
  evaluateCondition,
  createEffectHandlerRegistry,
  registerEffectHandler,
  executeEffects,
} from '@/engine/primitives';

const conditionRegistry = createConditionHandlerRegistry();
registerConditionHandler(conditionRegistry, 'diceSet', (params, ctx) => {
  // 自定义条件逻辑
  return true;
});

const effectRegistry = createEffectHandlerRegistry();
registerEffectHandler(effectRegistry, 'damage', (effect, state) => {
  // 返回新状态 + 事件
  return { state, events: [] };
});

if (evaluateCondition(ability.trigger, ctx, conditionRegistry)) {
  const result = executeEffects(ability.effects, state, effectRegistry);
}
```

### 战斗类游戏

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
