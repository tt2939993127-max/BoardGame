# UGC Builder 架构分析：组件是规则的载体

## 核心问题

用户指出："组件是规则的载体"，而不是简单的"预置通用能力"。

---

## DiceThrone 架构研究

### 三层架构

```
┌─────────────────────────────────────────────────────────┐
│  Systems 层（通用规则框架）                              │
│  ├ DiceSystem   - 骰子定义/掷骰/触发条件检查           │
│  ├ TokenSystem  - Token 定义/授予/消耗                 │
│  ├ CardSystem   - 卡牌定义/抽牌/弃牌                   │
│  ├ AbilitySystem- 技能定义/激活/效果                   │
│  └ ResourceSystem- 资源定义/增减                       │
├─────────────────────────────────────────────────────────┤
│  Domain 层（游戏特定逻辑）                               │
│  ├ types.ts     - 游戏状态类型                         │
│  ├ commands.ts  - 命令定义/验证                        │
│  ├ execute.ts   - 命令执行                             │
│  ├ reducer.ts   - 状态更新                             │
│  └ rules.ts     - 游戏规则                             │
├─────────────────────────────────────────────────────────┤
│  Config 层（角色/卡牌配置）                              │
│  ├ monk/diceConfig.ts     - 骰面符号映射               │
│  ├ monk/resourceConfig.ts - 资源定义                   │
│  ├ monk/abilities.ts      - 技能定义                   │
│  └ monk/cards.ts          - 卡牌定义                   │
└─────────────────────────────────────────────────────────┘
```

### 关键设计模式

**1. System 提供规则框架，游戏注册定义**

```typescript
// DiceSystem 提供通用骰子能力
interface IDiceSystem {
  registerDefinition(def: DiceDefinition): void;  // 注册骰子定义
  rollDice(dice: Die[]): RollResult;              // 掷骰
  checkTrigger(dice: Die[], trigger): boolean;    // 检查触发条件
}

// 游戏只需要配置骰面
const monkDiceDefinition: DiceDefinition = {
  id: 'monk-dice',
  sides: 6,
  faces: [
    { value: 1, symbols: ['fist'] },
    { value: 2, symbols: ['fist'] },
    { value: 3, symbols: ['palm'] },
    // ...
  ],
};

// 注册后即可使用
diceSystem.registerDefinition(monkDiceDefinition);
```

**2. 触发条件是声明式的**

```typescript
// 技能的触发条件（声明式配置，而非命令式代码）
const ability: AbilityDef = {
  id: 'combo-strike',
  trigger: { type: 'symbols', required: { fist: 3 } },  // 3个拳符号触发
  effects: [...],
};
```

---

## 分析：什么是"规则的载体"？

### 桌游的本质

桌游 = **物理载体** + **规则**

| 物理载体 | 承载的规则 |
|---|---|
| 卡牌 | 打出时的效果、触发条件、费用 |
| 棋盘 | 移动规则、占领规则、路径 |
| 骰子 | 结果映射、触发效果 |
| 棋子 | 移动方式、攻击方式 |

### 错误理解 vs 正确理解

| 错误理解 | 正确理解 |
|---|---|
| 组件 = UI 元素 | 组件 = **规则框架** + UI |
| 组件库是独立的 | 组件是 **System + 钩子 + UI** 的预置模板 |
| 用户从零写规则 | 用户**注册定义** + AI 填充钩子 |

## UGC Builder 新架构：借鉴 DiceThrone

### 核心思路

**复用现有 Systems**：DiceThrone 已有的 DiceSystem/CardSystem/TokenSystem 等是通用的，UGC 游戏可以直接注册定义来使用。

### 三层架构（UGC 版本）

```
┌─────────────────────────────────────────────────────────┐
│  Systems 层（平台预置，不可修改）                        │
│  ├ DiceSystem   - 骰子                                 │
│  ├ CardSystem   - 卡牌/牌堆/手牌                       │
│  ├ TokenSystem  - Token/状态效果                       │
│  ├ BoardSystem  - 棋盘（网格/六边形）                   │
│  └ ResourceSystem- 资源（HP/金币/...）                 │
├─────────────────────────────────────────────────────────┤
│  Definition 层（用户配置 + AI 生成）                     │
│  ├ 骰子定义：骰面符号映射（用户设置 Tag）               │
│  ├ 卡牌定义：费用/效果/打出条件                        │
│  ├ Token定义：堆叠上限/触发条件                        │
│  ├ 技能定义：触发条件/效果列表                         │
│  └ 资源定义：最大值/初始值                             │
├─────────────────────────────────────────────────────────┤
│  Rules 层（AI 生成）                                    │
│  ├ setup        - 初始化（AI 生成）                    │
│  ├ commands     - 玩家操作（AI 生成）                  │
│  ├ phaseLogic   - 每阶段逻辑（AI 生成）                │
│  └ endIf        - 胜负判定（AI 生成）                  │
├─────────────────────────────────────────────────────────┤
│  UI 模板层（平台预置，用户可选）                         │
│  ├ 阶段流程模板：DiceThrone 风格 / 三国杀风格 / ...    │
│  ├ 卡牌模板：默认 / 三国杀 / DiceThrone / 自定义       │
│  └ 布局模板：默认 / 对战 / 多人 / ...                  │
└─────────────────────────────────────────────────────────┘
```

### 预置 vs AI 生成

| 部分 | 来源 | 说明 |
|---|---|---|
| **UI 模板** | 预置 | 默认阶段流程布局，可选不同风格 |
| **阶段结构** | 预置 | 默认阶段列表（可从模板继承，如 DiceThrone） |
| **阶段逻辑** | AI 生成 | 每个阶段做什么（抽几张、弃到几张...） |
| **胜利条件** | AI 生成 | endIf 逻辑（HP≤0/达成目标/...） |
| **Commands** | AI 生成 | 玩家操作逻辑 |

### 跨组件交互：提示词驱动

用户用自然语言描述跨组件交互，AI 生成代码：

**用户输入**：
> "在投掷阶段，玩家可以花费 1 太极 Token 操作对手的一颗骰子"

**AI 生成的 Command**：
```typescript
{
  id: 'MANIPULATE_OPPONENT_DIE',
  validate: (state, { dieId }) => {
    // 必须在投掷阶段
    if (state.turnPhase !== 'roll') return { valid: false };
    // 必须有太极 Token
    if (state.players[playerId].tokens.taiji < 1) return { valid: false };
    return { valid: true };
  },
  execute: (state, { dieId }, random) => {
    // 消耗 Token
    state.players[playerId].tokens.taiji -= 1;
    // 修改对手骰子
    const opponent = getOpponent(state, playerId);
    const die = state.dice[dieId];
    // ... 修改逻辑
  },
}
```

### 提示词生成策略

生成 AI 提示词时，包含：

1. **当前存在的组件**：
   ```
   ## 当前游戏组件
   - 骰子系统（5颗骰子，符号：拳/掌/太极/莲花）
   - 卡牌系统（手牌区/牌堆/弃牌堆）
   - Token：太极（最大3）、闪避（最大1）
   - 资源：HP（最大50）、CP（无上限）
   ```

2. **跨组件交互方式**：
   ```
   ## 跨组件交互
   - 骰子 → Token：投掷结果可获得 Token
   - Token → 骰子：消耗 Token 可修改骰子
   - 卡牌 → 骰子：打出卡牌可重掷骰子
   - 卡牌 → Token：打出卡牌可消耗/获得 Token
   ```

3. **阶段上下文**：
   ```
   ## 当前阶段
   投掷阶段：玩家可投掷骰子、使用卡牌修改骰子、消耗 Token
   ```

4. **角色/技能数据**（用于 UI 生成）：
   ```
   ## 角色技能
   - 武将：张飞
   - 限定技「咆哮」：出牌阶段，你可以弃置所有手牌，对一名其他角色造成 X 点伤害
   - 技能状态：已使用/未使用
   ```

---

## 设计原则

### 1. Systems 层通用性

Systems 层的新机制对 **UGC 游戏**和**代码开发游戏**都通用：

```typescript
// 代码开发的游戏（如 DiceThrone）
import { diceSystem } from '@/systems/DiceSystem';
diceSystem.registerDefinition(monkDiceDefinition);

// UGC 游戏（沙箱执行）
sandbox.diceSystem.registerDefinition(userDiceDefinition);
```

### 2. UI 生成：角色数据驱动

生成 UI 时，提示词包含角色数据，确保：
- 技能按钮正确渲染
- 点击事件绑定到正确的 Command
- 限定技/觉醒技等特殊状态正确显示

```typescript
// 提示词包含
const promptContext = {
  character: {
    id: 'zhangfei',
    skills: [
      { 
        id: 'paoxiao', 
        name: '咆哮', 
        type: 'limited',  // 限定技
        used: false,
        description: '...',
      }
    ],
  },
  // AI 生成的 UI 代码可以：
  // 1. 渲染技能按钮
  // 2. 绑定 onClick={() => executeCommand('USE_SKILL', { skillId: 'paoxiao' })}
  // 3. 根据 used 状态禁用按钮
};
```

### 3. 通用数据 UI（底层系统，所有游戏复用）

#### 3.1 DataTable - 数据表格组件

根据 Schema **自动生成表格 UI**，适用于卡牌/技能/角色/Token 等所有列表数据：

```typescript
// 底层通用组件 - 所有游戏复用
interface DataTableProps<T> {
  schema: SchemaDefinition;      // 数据模型定义
  data: T[];                     // 数据列表
  onChange: (data: T[]) => void; // 数据变更回调
  onBatchAI?: (selected: T[], operation: string) => void;  // 批量 AI 生成
}

// 使用示例
<DataTable
  schema={CardDefinitionSchema}
  data={allCards}
  onChange={updateCards}
  onBatchAI={batchGenerate}
/>
```

**自动功能**：
- 从 Schema 生成列（string→文本列，number→数字列，enum→下拉列...）
- 排序/筛选/分页/搜索
- 内联编辑（双击单元格）
- 批量选中 → AI 批量生成/修改

```
┌─────────────────────────────────────────────────────────────────────┐
│  ☐ 全选  │ 名称  │ 花色 │ 点数 │ 类型   │ 效果         │ 操作     │
├─────────────────────────────────────────────────────────────────────┤
│  ☑       │ 杀    │ ♠    │ 7    │ 基本牌 │ [已生成]     │ 编辑 删除│
│  ☑       │ 闪    │ ♥    │ 2    │ 基本牌 │ [已生成]     │ 编辑 删除│
│  ☐       │ 桃    │ ♥    │ 3    │ 基本牌 │ [待生成]     │ 编辑 删除│
│  ...                                                               │
├─────────────────────────────────────────────────────────────────────┤
│  已选 2 项  │ [批量生成效果] [批量翻译] [批量删除]                  │
└─────────────────────────────────────────────────────────────────────┘
```

#### 3.2 SchemaEditor - 单条数据编辑器

根据 Schema **自动生成表单 UI**：

| 字段类型 | 编辑组件 |
|---|---|
| `string` | 文本输入框 |
| `number` | 数字输入框 / 滑块 |
| `boolean` | 开关 |
| `enum` | 下拉选择 |
| `array<string>` | Tag 编辑器 |
| `effects[]` | **特殊效果编辑器**（需 AI 生成） |

```
┌─────────────────────────────────────────────────────┐
│  数据表格（DataTable）         │  编辑器（SchemaEditor）│
│  ┌─────────────────────────┐   │  名称: [杀      ]  │
│  │ 杀     ♠  7  基本牌     │   │  花色: [♠ 黑桃 ▼] │
│  │ 闪     ♥  2  基本牌     │   │  点数: [1-13  ▼]  │
│  │ 桃     ♥  3  基本牌     │   │  类型: [基本牌 ▼] │
│  │ 无中生有 ♠  5  锦囊牌   │◀──│  距离: [无限   ]  │
│  │ 决斗   ♠  1  锦囊牌     │   │  ─────────────── │
│  │ ...                     │   │  效果: [AI生成▶] │
│  └─────────────────────────┘   │                   │
└─────────────────────────────────────────────────────┘
```

#### 3.3 CardView - 卡牌渲染组件

**通用渲染组件**，接收数据 + 模板，渲染卡牌：

```typescript
// 底层通用组件 - 所有游戏复用
interface CardViewProps {
  data: CardData;           // 卡牌数据
  template?: string;        // 牌面模板（默认/三国杀/DiceThrone/自定义）
  size?: 'sm' | 'md' | 'lg';
  onClick?: () => void;
  onDrag?: (e: DragEvent) => void;
}

// 使用示例 - 同一组件渲染不同游戏的卡牌
<CardView data={shaCard} template="sanguosha" />
<CardView data={monkCard} template="dicethrone" />
```

### 4. 批量生成/修改

支持一次获取**全部数据 + 提示词**来批量生成或修改：

```typescript
// 批量生成接口
interface BatchGenerateRequest {
  items: Array<{
    id: string;
    type: 'card' | 'skill' | 'character';
    data: Record<string, unknown>;  // 当前数据
    prompt?: string;                 // 可选的额外提示
  }>;
  globalContext: string;  // 游戏全局上下文
  operation: 'generate_effects' | 'translate' | 'balance';
}

// 示例：批量生成 50 张卡牌的效果
const request: BatchGenerateRequest = {
  items: cards.map(card => ({
    id: card.id,
    type: 'card',
    data: { name: card.name, cost: card.cost, description: card.description },
  })),
  globalContext: `三国杀规则：回合结构、基本牌/锦囊牌/装备牌...`,
  operation: 'generate_effects',
};
```

---

## 旧设计（保留参考）

### 组件结构

```typescript
interface GameComponent {
  id: string;
  name: string;
  type: 'card' | 'deck' | 'board' | 'dice' | 'piece' | ...;
  
  // 预置的 Schema 模板（用户可扩展）
  schema: SchemaTemplate;
  
  // 预置的钩子（用户填充实现）
  hooks: HookDefinition[];
  
  // 预置的 UI 渲染（用户可覆盖）
  defaultView: string;
}
```

### 示例：卡牌组件

```typescript
const CardComponent: GameComponent = {
  id: 'card',
  name: '卡牌',
  type: 'card',
  
  schema: {
    // 预置字段（用户可扩展）
    id: { type: 'string', required: true },
    name: { type: 'string' },
    cost: { type: 'number', default: 0 },
    tags: { type: 'array', of: 'string' },
    // [用户可添加自定义字段]
  },
  
  hooks: [
    // 预置钩子（用户填充实现）
    { name: 'onPlay', description: '卡牌被打出时', params: ['card', 'player', 'target?'] },
    { name: 'onDraw', description: '卡牌被抽到时', params: ['card', 'player'] },
    { name: 'onDiscard', description: '卡牌被弃置时', params: ['card', 'player'] },
    { name: 'onDestroy', description: '卡牌被销毁时', params: ['card'] },
    { name: 'canPlay', description: '判断是否可打出', params: ['card', 'player'], returns: 'boolean' },
  ],
  
  defaultView: `<Card face={card.face} back={card.back} />`,
};
```

### 示例：骰子组件

```typescript
const DiceComponent: GameComponent = {
  id: 'dice',
  name: '骰子',
  type: 'dice',
  
  schema: {
    faces: { type: 'array', of: 'any', description: '骰面内容' },
    currentFace: { type: 'number', description: '当前面' },
  },
  
  hooks: [
    { name: 'onRoll', description: '骰子被投掷后', params: ['result', 'player'] },
    { name: 'mapResult', description: '将骰面映射为效果', params: ['face'], returns: 'Effect' },
    { name: 'canReroll', description: '判断是否可重投', params: ['dice', 'player'], returns: 'boolean' },
  ],
  
  defaultView: `<Dice faces={dice.faces} current={dice.currentFace} />`,
};
```

## 工作流程

```
1. 用户选择组件（如"卡牌"）
   ↓
2. 获得预置的 Schema + 钩子框架
   ↓
3. 用户扩展 Schema（添加自定义字段）
   ↓
4. AI 帮助生成钩子实现代码
   ↓
5. 组合多个组件形成完整游戏
```

## 架构对比

### 之前的架构（扁平分层）

```
Tags → Schemas → Effects → Instances → Rules → View
       ↑
       从零开始定义
```

### 新架构（组件驱动）

```
组件库（预置规则框架）
├─ 卡牌组件（Schema + 钩子 + UI）
├─ 牌堆组件（Schema + 钩子 + UI）
├─ 骰子组件（Schema + 钩子 + UI）
└─ ...

用户选择组件 → 扩展 Schema → 填充钩子 → AI 辅助生成
```

## 关键差异

| 方面 | 之前 | 新架构 |
|---|---|---|
| Schema 来源 | 用户从零定义 | **组件预置** + 用户扩展 |
| 钩子 | 用户自行设计 | **组件预置**框架 |
| AI 作用 | 生成整个 Schema | **填充**预置钩子 |
| 学习成本 | 高（需理解完整架构） | 低（选择组件即可开始） |

## 待确认

1. 组件是否应该有继承关系？（如 Card extends Entity）
2. 组件的 hooks 是强制还是可选？
3. 如何处理跨组件交互？（如卡牌效果修改骰子）
