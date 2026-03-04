# 单元测试示例：神圣护盾技能

> **文件位置**：`src/games/summonerwars/__tests__/divine-shield.test.ts`  
> **测试框架**：Vitest  
> **测试对象**：SummonerWars 游戏中科琳的"神圣护盾"技能

---

## 📋 功能说明

**神圣护盾**：科琳 3 格内的友方城塞单位被攻击时，投掷 2 个骰子减伤。

---

## 🎯 测试覆盖场景

### ✅ 场景 1：正常触发护盾

**测试目标**：验证护盾在正确条件下触发

```typescript
it('科琳3格内友方城塞单位被攻击时触发护盾', () => {
  // 1. 准备测试状态
  const state = createPaladinState();
  initializeBoard(state);

  // 2. 放置科琳（拥有 divine_shield）在 [4][2]
  const colleen = placeTestUnit(state.core, { row: 4, col: 2 }, {
    card: colleenCard,
    owner: '1',
  });

  // 3. 放置友方城塞单位在 [4][4]（距离科琳 2 格）
  placeTestUnit(state.core, { row: 4, col: 4 }, {
    card: fortressGuardCard,
    owner: '1',
  });

  // 4. 放置攻击者在 [3][4]（相邻城塞守卫）
  placeTestUnit(state.core, { row: 3, col: 4 }, {
    card: attackerCard,
    owner: '0',
  });

  // 5. 执行攻击命令
  const events = executeCommand(state, {
    type: SW_COMMANDS.DECLARE_ATTACK,
    payload: {
      attacker: { row: 3, col: 4 },
      target: { row: 4, col: 4 },
    },
    playerId: '0',
  }, testRandom);

  // 6. 验证护盾事件
  const shieldEvent = events.find(
    e => e.type === SW_EVENTS.DAMAGE_REDUCED && 
         e.payload.sourceAbilityId === 'divine_shield'
  );
  
  expect(shieldEvent).toBeDefined();
  expect(shieldEvent.payload.sourceUnitId).toBe(colleen.instanceId);
  expect(shieldEvent.payload.shieldDice).toHaveLength(2);
});
```

**验证点**：
- ✅ 产生 `DAMAGE_REDUCED` 事件
- ✅ 事件来源是 `divine_shield`
- ✅ 护盾骰子数量为 2

---

### ✅ 场景 2：最小伤害保证

**测试目标**：验证护盾减伤后，攻击至少造成 1 点伤害

```typescript
it('神圣护盾减伤后战力最少为1', () => {
  // 放置弱攻击者（只有1点战力）
  const weakAttackerCard: UnitCard = {
    strength: 1,  // 只有 1 点战力
    // ...
  };
  
  // 执行攻击
  const events = executeCommand(state, attackCommand, testRandom);
  
  // 验证最终伤害至少为 1
  const attackEvent = events.find(e => e.type === SW_EVENTS.UNIT_ATTACKED);
  expect(attackEvent.payload.hits).toBeGreaterThanOrEqual(1);
});
```

**验证点**：
- ✅ 即使护盾减伤，最终 hits ≥ 1
- ✅ 防止护盾完全抵消伤害

---

### ❌ 场景 3：非城塞单位不触发

**测试目标**：验证护盾只保护城塞单位

```typescript
it('非城塞单位不触发神圣护盾', () => {
  // 放置友方非城塞单位（isFortress: false）
  const normalUnitCard: UnitCard = {
    isFortress: false,  // 不是城塞单位
    // ...
  };
  
  // 执行攻击
  const events = executeCommand(state, attackCommand, testRandom);
  
  // 验证没有护盾事件
  const shieldEvents = events.filter(
    e => e.type === SW_EVENTS.DAMAGE_REDUCED && 
         e.payload.sourceAbilityId === 'divine_shield'
  );
  expect(shieldEvents).toHaveLength(0);
});
```

**验证点**：
- ❌ 不产生 `DAMAGE_REDUCED` 事件
- ✅ 护盾只对城塞单位生效

---

### ❌ 场景 4：超出距离不触发

**测试目标**：验证护盾有 3 格距离限制

```typescript
it('超过3格距离不触发神圣护盾', () => {
  // 放置科琳在 [4][0]
  placeTestUnit(state.core, { row: 4, col: 0 }, {
    card: colleenCard,
    owner: '1',
  });

  // 放置友方城塞单位在 [4][4]（距离 4 格，超出范围）
  placeTestUnit(state.core, { row: 4, col: 4 }, {
    card: fortressGuardCard,
    owner: '1',
  });
  
  // 执行攻击
  const events = executeCommand(state, attackCommand, testRandom);
  
  // 验证没有护盾事件
  const shieldEvents = events.filter(
    e => e.type === SW_EVENTS.DAMAGE_REDUCED && 
         e.payload.sourceAbilityId === 'divine_shield'
  );
  expect(shieldEvents).toHaveLength(0);
});
```

**验证点**：
- ❌ 距离超过 3 格不触发
- ✅ 护盾有范围限制

---

## 🛠️ 测试工具

### GameTestRunner（未使用，但推荐）

本测试使用传统的 `executeCommand` 方式，但推荐使用 `GameTestRunner`：

```typescript
import { GameTestRunner } from '@/engine/testing/GameTestRunner';

const runner = new GameTestRunner(createGame());

// 设置状态
runner.setState({ core: { /* ... */ } });

// 执行命令
const result = runner.dispatch('DECLARE_ATTACK', payload);

// 验证结果
expect(result.success).toBe(true);
expect(result.events).toContainEqual(expect.objectContaining({
  type: 'DAMAGE_REDUCED'
}));
```

---

## 📊 测试覆盖率

| 场景 | 覆盖 | 说明 |
|------|------|------|
| ✅ 正常触发 | 100% | 距离内 + 城塞单位 + 被攻击 |
| ✅ 最小伤害 | 100% | 护盾减伤后 hits ≥ 1 |
| ❌ 非城塞单位 | 100% | 只保护城塞单位 |
| ❌ 超出距离 | 100% | 3 格距离限制 |
| ✅ 护盾骰子 | 100% | 投掷 2 个骰子 |

---

## 🚀 运行测试

```bash
# 运行单个测试文件
npm run test -- divine-shield

# 运行所有 SummonerWars 测试
npm run test -- summonerwars

# 监听模式（开发时推荐）
npm run test:watch -- divine-shield
```

---

## 💡 测试设计原则

1. **独立性**：每个测试用例独立运行，不依赖其他测试
2. **可重复性**：使用固定随机数（`testRandom`），确保结果稳定
3. **全面性**：覆盖正常流程 + 边界条件 + 异常情况
4. **可读性**：测试名称清晰描述场景，代码结构清晰
5. **快速性**：纯逻辑测试，无 UI 依赖，毫秒级完成

---

## 📚 相关文档

- [自动化测试指南](../automated-testing.md)
- [测试工具快速参考](../testing-tools-quick-reference.md)
- [测试审计规范](../ai-rules/testing-audit.md)
