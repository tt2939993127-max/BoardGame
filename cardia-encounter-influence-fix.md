# Cardia 遭遇战影响力计算修复

## Bug 描述

**问题**：第二回合平局时 P0 错误获得印戒

**用户反馈状态数据**：
```json
{
  "encounterHistory": [
    {
      "player1Influence": 16,  // ❌ 错误：应该是 9 (7 - 5 + 7)
      "player2Influence": 9,
      "winnerId": "0"  // ❌ 错误：应该是平局
    }
  ],
  "modifierTokens": [
    {"cardId": "deck_i_card_07_...", "value": -5, "source": "ability_i_surgeon"},
    {"cardId": "deck_i_card_07_...", "value": 7, "source": "ability_i_court_guard"}
  ]
}
```

**预期行为**：
- P0 的宫廷卫士（影响力 7）
- 外科医生延迟效果（-5）
- 宫廷卫士能力（+7）
- **最终影响力应该是：7 - 5 + 7 = 9**
- **与 P1 的 9 平局，不应该有获胜者**

## 根本原因

### 问题分析

1. **事件执行顺序**（在 `execute.ts` 中）：
   ```typescript
   // executePlayCard 函数
   events.push({ type: CARDIA_EVENTS.CARD_PLAYED, ... });
   events.push({ type: CARDIA_EVENTS.MODIFIER_TOKEN_PLACED, value: -5, ... });  // 外科医生
   
   // resolveEncounter 函数（在 execute 层计算影响力）
   const player1Influence = modifiers.reduce((acc, m) => acc + m.value, baseInfluence);
   events.push({
       type: CARDIA_EVENTS.ENCOUNTER_RESOLVED,
       payload: { winner, loser }  // ❌ 没有包含影响力值
   });
   ```

2. **事件归约顺序**（在 `reduce.ts` 中）：
   ```typescript
   // 逐个归约事件
   for (const event of events) {
       core = reduce(core, event);
   }
   
   // 当归约到 ENCOUNTER_RESOLVED 时
   function reduceEncounterResolved(core, event) {
       // ❌ 问题：此时 MODIFIER_TOKEN_PLACED 还没有被归约
       // core.modifierTokens 中还没有外科医生的 -5 修正标记
       const modifiers = core.modifierTokens.filter(...);
       const influence = modifiers.reduce(...);  // 只计算了 +7，遗漏了 -5
   }
   ```

3. **时序问题**：
   - `execute` 层计算影响力时，使用的是**执行前的 core 状态**（包含所有修正标记）
   - `reduce` 层重新计算影响力时，使用的是**当前的 core 状态**（修正标记还没有被归约）
   - 导致两次计算结果不一致

### 架构缺陷

**违反了"事件携带完整信息"原则**：
- `ENCOUNTER_RESOLVED` 事件应该携带所有遭遇战结果信息（包括影响力值）
- Reducer 不应该重新计算已经在 execute 层计算好的值
- Reducer 的职责是**应用事件**，而不是**重新计算业务逻辑**

## 修复方案

### 1. 修改事件定义

**文件**：`src/games/cardia/domain/events.ts`

```typescript
export interface EncounterResolvedEvent extends GameEvent<typeof CARDIA_EVENTS.ENCOUNTER_RESOLVED> {
    payload: {
        slotIndex: number;
        winner: PlayerId | 'tie';
        loser: PlayerId | null;
        player1Influence: number;  // ✅ 新增：P0 的最终影响力
        player2Influence: number;  // ✅ 新增：P1 的最终影响力
    };
}
```

### 2. 修改 execute 层

**文件**：`src/games/cardia/domain/execute.ts`

```typescript
function resolveEncounter(...) {
    // 1. 计算最终影响力（基础影响力 + 修正标记）
    const player1Influence = player1Modifiers.reduce((acc, m) => acc + m.value, player1Card.baseInfluence);
    const player2Influence = player2Modifiers.reduce((acc, m) => acc + m.value, player2Card.baseInfluence);
    
    // ...判定胜负...
    
    // 4. 发射遭遇战解析事件
    events.push({
        type: CARDIA_EVENTS.ENCOUNTER_RESOLVED,
        timestamp,
        payload: {
            slotIndex,
            winner,
            loser,
            player1Influence,  // ✅ 修复：将计算好的影响力值放入 payload
            player2Influence,  // ✅ 修复：将计算好的影响力值放入 payload
        },
    });
}
```

### 3. 修改 reduce 层

**文件**：`src/games/cardia/domain/reduce.ts`

```typescript
function reduceEncounterResolved(
    core: CardiaCore,
    event: Extract<CardiaEvent, { type: typeof CARDIA_EVENTS.ENCOUNTER_RESOLVED }>
): CardiaCore {
    const { slotIndex, winner, loser, player1Influence, player2Influence } = event.payload;
    
    // ✅ 修复：直接使用 payload 中的影响力值，而不是重新计算
    // 原因：在 reduce 时，修正标记可能还没有被 reduce 到 core.modifierTokens 中
    // 影响力值已经在 execute 层计算好并放入 payload 中
    
    const encounter: EncounterState = {
        player1Card,
        player2Card,
        player1Influence,  // ✅ 直接使用 payload 中的值
        player2Influence,  // ✅ 直接使用 payload 中的值
        winnerId: winner === 'tie' ? undefined : winner,
        loserId: loser || undefined,
    };
    
    // ...后续逻辑...
}
```

## 修复验证

### 测试用例

**文件**：`src/games/cardia/__tests__/encounter-influence-fix.test.ts`

```typescript
it('应该使用 payload 中的影响力值，而不是重新计算', () => {
    const core: CardiaCore = {
        // ...初始状态...
        modifierTokens: [
            { cardId: 'card1', value: -5, source: 'ability_i_surgeon' },
        ],
    };
    
    const event = {
        type: CARDIA_EVENTS.ENCOUNTER_RESOLVED,
        payload: {
            player1Influence: 2,  // 7 - 5 = 2
            player2Influence: 9,
            winner: '1',
            loser: '0',
        },
    };
    
    const newCore = reduce(core, event);
    
    // ✅ 验证：encounterHistory 中记录的影响力应该是 payload 中的值
    expect(newCore.encounterHistory[0].player1Influence).toBe(2);
    expect(newCore.encounterHistory[0].player2Influence).toBe(9);
});
```

### 测试结果

```bash
✓ src/games/cardia/__tests__/encounter-influence-fix.test.ts (2 tests) 2ms
  ✓ 遭遇战影响力计算修复 (2)
    ✓ 应该使用 payload 中的影响力值，而不是重新计算 1ms
    ✓ 应该正确处理平局情况 0ms
```

## 影响范围

### 修改的文件

1. `src/games/cardia/domain/events.ts` - 事件定义
2. `src/games/cardia/domain/execute.ts` - 执行层逻辑
3. `src/games/cardia/domain/reduce.ts` - 归约层逻辑
4. `src/games/cardia/__tests__/encounter-influence-fix.test.ts` - 新增测试

### 向后兼容性

- ✅ **完全兼容**：只是在事件 payload 中添加了新字段，不影响现有代码
- ✅ **类型安全**：TypeScript 会在编译期检查所有使用 `ENCOUNTER_RESOLVED` 事件的地方

### 相关系统

- ✅ **不影响其他系统**：修改仅限于遭遇战解析逻辑
- ✅ **不影响 UI**：UI 读取的是 `encounterHistory`，数据结构没有变化

## 教训与最佳实践

### 1. 事件应该携带完整信息

**原则**：事件应该包含所有必要的业务数据，Reducer 不应该重新计算业务逻辑。

**反模式**：
```typescript
// ❌ 错误：事件只包含输入，Reducer 重新计算结果
events.push({ type: 'ENCOUNTER_RESOLVED', payload: { winner, loser } });

function reduce(core, event) {
    const influence = calculateInfluence(core);  // ❌ 重新计算
}
```

**正确做法**：
```typescript
// ✅ 正确：事件包含完整的计算结果
const influence = calculateInfluence(core);
events.push({ type: 'ENCOUNTER_RESOLVED', payload: { winner, loser, influence } });

function reduce(core, event) {
    const { influence } = event.payload;  // ✅ 直接使用
}
```

### 2. Execute 和 Reduce 的职责分离

**Execute 层**：
- 读取当前状态
- 执行业务逻辑
- 计算结果
- 生成事件（包含完整结果）

**Reduce 层**：
- 读取事件
- 应用状态变更
- **不重新计算业务逻辑**

### 3. 事件归约的时序问题

**问题**：事件是逐个归约的，后续事件的 Reducer 看不到前面事件的结果。

**解决方案**：
1. 事件携带完整信息（本次修复采用）
2. 或者在 execute 层一次性计算所有依赖，避免跨事件依赖

### 4. 测试策略

**单元测试**：
- 测试 Reducer 是否正确使用事件中的数据
- 不依赖完整的事件链，直接构造事件测试

**集成测试**：
- 测试完整的 execute → reduce 流程
- 验证最终状态的正确性

## 总结

这个 bug 的根本原因是**架构设计缺陷**：Reducer 重新计算了应该在 Execute 层计算的业务逻辑，导致在事件归约时序下出现数据不一致。

修复方案遵循了**事件溯源（Event Sourcing）**的最佳实践：
- 事件携带完整的业务数据
- Reducer 只负责应用状态变更，不重新计算业务逻辑
- 保证了数据的一致性和可追溯性

这个修复不仅解决了当前的 bug，还提升了代码的健壮性和可维护性。
