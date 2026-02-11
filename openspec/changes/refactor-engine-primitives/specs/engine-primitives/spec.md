# engine-primitives Specification

## Purpose
提供引擎层可复用的工具函数库，让各游戏复用底层操作逻辑（表达式求值、条件评估、区域操作、骰子操作、资源管理），同时保持领域概念由游戏层定义。

## ADDED Requirements

### Requirement: Expression Evaluation
引擎 SHALL 提供表达式求值工具，支持算术运算和变量解析。

#### Scenario: Evaluate literal expression
- **GIVEN** 表达式 `{ type: 'literal', value: 5 }`
- **WHEN** 调用 `evaluateExpression(expr, {})`
- **THEN** 返回 `5`

#### Scenario: Evaluate variable expression
- **GIVEN** 表达式 `{ type: 'var', name: 'damage' }` 和 context `{ damage: 3 }`
- **WHEN** 调用 `evaluateExpression(expr, context)`
- **THEN** 返回 `3`

#### Scenario: Evaluate nested arithmetic
- **GIVEN** 表达式 `{ type: 'add', left: { type: 'var', name: 'base' }, right: { type: 'mul', left: { type: 'literal', value: 2 }, right: { type: 'var', name: 'bonus' } } }`
- **AND** context `{ base: 10, bonus: 3 }`
- **WHEN** 调用 `evaluateExpression(expr, context)`
- **THEN** 返回 `16`（10 + 2*3）

### Requirement: Condition Evaluation
引擎 SHALL 提供条件评估工具，支持布尔组合和比较运算，并允许游戏注册自定义条件处理器。

#### Scenario: Evaluate AND condition
- **GIVEN** 条件 `{ type: 'and', conditions: [{ type: 'compare', op: 'gte', left: { type: 'var', name: 'hp' }, right: { type: 'literal', value: 5 } }, { type: 'compare', op: 'eq', left: { type: 'var', name: 'status' }, right: { type: 'literal', value: 'active' } }] }`
- **AND** context `{ hp: 10, status: 'active' }`
- **WHEN** 调用 `evaluateCondition(cond, context)`
- **THEN** 返回 `true`

#### Scenario: Register custom condition handler
- **GIVEN** 游戏注册处理器 `registerConditionHandler('hasAbility', (params, ctx) => ctx.abilities.includes(params.abilityId))`
- **AND** 条件 `{ type: 'custom', handler: 'hasAbility', params: { abilityId: 'fireball' } }`
- **AND** context `{ abilities: ['fireball', 'heal'] }`
- **WHEN** 调用 `evaluateCondition(cond, context)`
- **THEN** 返回 `true`

### Requirement: Target Resolution
引擎 SHALL 提供目标解析框架，支持内置目标类型和游戏注册的自定义解析器。

#### Scenario: Resolve self target
- **GIVEN** 目标引用 `{ type: 'self' }` 和 context `{ sourceId: 'unit-1' }`
- **WHEN** 调用 `resolveTarget(ref, context)`
- **THEN** 返回 `['unit-1']`

#### Scenario: Resolve custom target
- **GIVEN** 游戏注册解析器 `registerTargetResolver('adjacentUnits', (params, ctx) => findAdjacentUnits(ctx.sourceId, ctx.board))`
- **AND** 目标引用 `{ type: 'custom', resolver: 'adjacentUnits' }`
- **WHEN** 调用 `resolveTarget(ref, context)`
- **THEN** 调用注册的解析器并返回结果

### Requirement: Effect Execution Framework
引擎 SHALL 提供效果执行框架，不预定义效果类型，游戏注册自己的效果处理器。

#### Scenario: Register and execute effect handler
- **GIVEN** 游戏注册处理器 `registerEffectHandler('damage', (params, state) => applyDamage(state, params.targetId, params.amount))`
- **AND** 效果定义 `{ type: 'damage', targetId: 'unit-2', amount: 5 }`
- **WHEN** 调用 `executeEffect(effect, state, handlers)`
- **THEN** 调用 damage 处理器并返回更新后的 state

#### Scenario: Unregistered effect type throws error
- **GIVEN** 效果定义 `{ type: 'unknownEffect' }`
- **AND** 无对应处理器注册
- **WHEN** 调用 `executeEffect(effect, state, handlers)`
- **THEN** 抛出错误 `Unknown effect type: unknownEffect`

### Requirement: Card Zone Operations
引擎 SHALL 提供卡牌区域操作工具函数，支持常见的牌堆操作。

#### Scenario: Draw cards from deck
- **GIVEN** deck `['card-1', 'card-2', 'card-3']` 和 hand `[]`
- **WHEN** 调用 `drawCards({ deck, hand }, 2)`
- **THEN** 返回 `{ deck: ['card-3'], hand: ['card-1', 'card-2'] }`

#### Scenario: Shuffle deck
- **GIVEN** deck `['a', 'b', 'c', 'd']` 和 random seed
- **WHEN** 调用 `shuffleDeck(deck, randomFn)`
- **THEN** 返回打乱顺序的新数组，原数组不变

#### Scenario: Move card between zones
- **GIVEN** source zone `['card-1', 'card-2']`、target zone `['card-3']`、cardId `'card-1'`
- **WHEN** 调用 `moveCard(source, target, 'card-1')`
- **THEN** 返回 `{ source: ['card-2'], target: ['card-3', 'card-1'] }`

### Requirement: Dice Operations
引擎 SHALL 提供骰子操作纯函数，支持掷骰、锁定、重掷和统计计算。

#### Scenario: Roll dice
- **GIVEN** 骰子定义 `{ sides: 6, faces: [...] }` 和 randomFn
- **WHEN** 调用 `rollDice(definition, randomFn)`
- **THEN** 返回 `{ value: number, symbol: string, symbols: string[] }`

#### Scenario: Roll respects lock state
- **GIVEN** 骰子列表包含 locked dice `{ id: 0, value: 3, isLocked: true }`
- **WHEN** 调用 `rerollDice(dice, definition, randomFn)`
- **THEN** locked dice 保持原值，unlocked dice 重掷

#### Scenario: Calculate dice statistics
- **GIVEN** 骰子结果 `[{ value: 1 }, { value: 2 }, { value: 3 }, { value: 4 }, { value: 5 }]`
- **WHEN** 调用 `calculateDiceStats(results)`
- **THEN** 返回 `{ total: 15, hasSmallStraight: true, hasLargeStraight: true, maxOfAKind: 1, symbolCounts: {...} }`

### Requirement: Resource Management
引擎 SHALL 提供资源管理工具函数，支持获取、设置、修改和边界钳制。

#### Scenario: Modify resource with clamping
- **GIVEN** resources `{ gold: 10 }`、修改 `{ gold: -15 }`、边界 `{ gold: { min: 0, max: 100 } }`
- **WHEN** 调用 `modifyResource(resources, 'gold', -15, bounds)`
- **THEN** 返回 `{ gold: 0 }`（钳制到最小值）

#### Scenario: Set resource absolute value
- **GIVEN** resources `{ mana: 5 }`
- **WHEN** 调用 `setResource(resources, 'mana', 10)`
- **THEN** 返回 `{ mana: 10 }`

## Design Decisions

### Pure Functions Only
所有 primitives 模块导出纯函数，不使用 class 或 singleton。符合 boardgame.io 的纯函数状态更新要求。

### Registry Pattern for Extensibility
condition/target/effects 模块使用注册器模式，引擎提供框架和内置类型，游戏在 setup 阶段注册自定义处理器。

### Immutable Operations
所有操作返回新对象/数组，不修改原数据。符合 React/boardgame.io 的不可变数据原则。

## Related Specs
- `dice-system` — 骰子操作的前身，部分能力迁移到 primitives/dice
