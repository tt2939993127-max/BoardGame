# dice-system Delta

## REMOVED Requirements

### Requirement: Singleton Pattern
**Reason**: 迁移到纯函数 API（primitives/dice），移除全局单例 diceSystem
**Migration**: 游戏直接导入并调用纯函数 `import { rollDice, calculateDiceStats } from 'engine/primitives'`

## MODIFIED Requirements

### Requirement: Dice Definition Registration
系统 SHALL 支持定义骰子模板，但不再使用全局注册器。游戏将骰子定义作为常量导出，调用时直接传入。

#### Scenario: Define custom dice
- **GIVEN** 骰子定义常量 `const MONK_DICE_DEF = { id: 'monk-dice', sides: 6, faces: [...] }`
- **WHEN** 需要使用该骰子
- **THEN** 直接传入函数 `rollDice(MONK_DICE_DEF, ctx.random)`

### Requirement: Dice Rolling
系统 SHALL 支持掷骰操作，使用纯函数 API，返回新骰子状态（不修改原状态）。

#### Scenario: Roll unlocked dice
- **GIVEN** 骰子定义和 randomFn
- **WHEN** 调用 `rollDice(definition, randomFn)`
- **THEN** 返回新骰子对象 `{ value: number, symbol: string, symbols: string[], isLocked: false }`

#### Scenario: Reroll dice respecting lock
- **GIVEN** 骰子列表包含 `{ id: 0, value: 3, isLocked: true }`
- **WHEN** 调用 `rerollDice(dice, definition, randomFn)`
- **THEN** locked dice 保持不变，unlocked dice 重掷

### Requirement: Roll Statistics
系统 SHALL 计算掷骰统计，使用纯函数 `calculateDiceStats`。

#### Scenario: Calculate statistics
- **GIVEN** 骰子结果 `[{value:1}, {value:2}, {value:3}, {value:4}, {value:5}]`
- **WHEN** 调用 `calculateDiceStats(results)`
- **THEN** 返回 `{ total: 15, hasSmallStraight: true, hasLargeStraight: true, maxOfAKind: 1, symbolCounts: {...} }`
