# GAS风格通用能力系统设计方案

> 参考UE的Gameplay Ability System (GAS)，设计完全通用的能力系统

## 实现状态

✅ **已完成** - 2024年重构

## 目标

- 不预设任何特定游戏类型（战斗/棋盘/卡牌）
- 数据驱动，能力/效果通过数据定义
- 可扩展，游戏可在不修改系统的情况下添加新能力类型

## 架构分层

```
src/systems/
├── core/                    # 完全通用的基础设施
│   ├── Attribute.ts         # 通用属性管理
│   ├── Tag.ts               # 通用标签管理
│   ├── Effect.ts            # 通用效果执行
│   ├── Condition.ts         # 可扩展条件系统
│   ├── Ability.ts           # 通用技能框架
│   ├── GameContext.ts       # 通用游戏上下文
│   └── index.ts
├── presets/                 # 游戏类型预设
│   ├── combat/              # 战斗类游戏预设
│   │   ├── types.ts         # EffectTiming, DamageModifier 等
│   │   ├── CombatAbilityManager.ts
│   │   └── index.ts
│   └── index.ts
└── index.ts                 # 统一导出
```

## 核心抽象

### 1. Attribute（属性）

通用数值属性，不预设HP/MP等：

```typescript
// 位置：src/systems/core/Attribute.ts
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
// 位置：src/systems/core/Tag.ts
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
// 位置：src/systems/core/Effect.ts
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
// 位置：src/systems/core/Condition.ts
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
// 位置：src/systems/core/Ability.ts
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
// 位置：src/systems/core/GameContext.ts
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

位于 `src/systems/presets/combat/`，提供回合制战斗游戏的便捷抽象：

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

| 旧设计 | 新版 (core/) |
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
  createAttributeManager, 
  createTagManager, 
  createGameContext,
  createAbilityRegistry,
} from '@/systems';

// 1. 创建管理器
const attrs = createAttributeManager();
const tags = createTagManager();
const abilities = createAbilityRegistry();

// 2. 注册属性定义
attrs.registerAttributes([
  { id: 'health', name: '生命值', min: 0, max: 100, initialValue: 100 },
  { id: 'gold', name: '金币', min: 0, initialValue: 0 },
]);

// 3. 创建游戏上下文
const ctx = createGameContext(attrs, tags);

// 4. 注册技能
abilities.register({ id: 'fireball', name: '火球术', ... });
```

### 战斗类游戏

```typescript
import { 
  createCombatAbilityManager,
  type CombatAbilityDef,
} from '@/systems';

const combatManager = createCombatAbilityManager();
combatManager.registerAbility({
  id: 'slash',
  name: '斩击',
  type: 'offensive',
  effects: [{ description: '造成 3 点伤害', action: { type: 'damage', value: 3 } }],
});
```

## 完成清单

- [x] 实现通用 AttributeSystem (`core/Attribute.ts`)
- [x] 实现通用 TagSystem (`core/Tag.ts`)
- [x] 实现通用 EffectSystem (`core/Effect.ts`)
- [x] 实现通用 ConditionSystem (`core/Condition.ts`)
- [x] 实现通用 AbilitySystem (`core/Ability.ts`)
- [x] 重构 GameContext 为通用接口 (`core/GameContext.ts`)
- [x] 将战斗预设移到 `presets/combat/`
- [x] 更新导出和文档
