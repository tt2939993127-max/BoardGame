# D11/D12/D13 额度写入-消耗对称性审计报告

> 审计范围：SmashUp LIMIT_MODIFIED 写入链路 + PLAY_MINION/PLAY_ACTION 消耗链路
> 审计日期：2026-02-27

---

## 9.1 LIMIT_MODIFIED 写入链路追踪

### payload → reducer → 写入字段映射

```
LIMIT_MODIFIED payload:
  { playerId, limitType, delta, restrictToBase?, powerMax?, sameNameOnly?, sameNameDefId? }

reducer 分支逻辑：
  limitType === 'minion':
    ├─ restrictToBase !== undefined → baseLimitedMinionQuota[restrictToBase] += delta
    │                                  + sameNameOnly → baseLimitedSameNameRequired[restrictToBase] = true
    ├─ sameNameOnly === true → sameNameMinionRemaining += delta
    │                           + sameNameDefId → sameNameMinionDefId = defId (或保持 null)
    └─ 其他 → minionLimit += delta
               + powerMax → extraMinionPowerMax = min(existing, powerMax)
  limitType === 'action':
    └─ actionLimit += delta
```

### 写入字段清单

| 字段 | 写入条件 | 清理时机 |
|------|---------|---------|
| `minionLimit` | 全局随从额度 | TURN_STARTED(=1) |
| `baseLimitedMinionQuota` | restrictToBase 指定 | TURN_STARTED(=undefined) |
| `baseLimitedSameNameRequired` | restrictToBase + sameNameOnly | TURN_STARTED(=undefined) |
| `sameNameMinionRemaining` | sameNameOnly 指定 | TURN_STARTED(=undefined) |
| `sameNameMinionDefId` | sameNameDefId 指定 | TURN_STARTED(=null) |
| `extraMinionPowerMax` | powerMax 指定 | TURN_STARTED(=undefined) |
| `actionLimit` | 行动额度 | TURN_STARTED(=1) |

### 9.1 结论：✅ 写入链路完整，每个 payload 字段都有对应的 reducer 分支和清理逻辑。

---

## 9.2 PLAY_MINION 消耗链路追踪

### 消耗优先级

```
shouldIncrementPlayed = (consumesNormalLimit !== false)

消耗优先级（从高到低）：
1. 同名额度：globalFull && sameNameRemaining > 0
   → sameNameMinionRemaining -= 1, 不增加 minionsPlayed
2. 基地限定额度：globalFull && !useSameNameQuota && baseQuota > 0
   → baseLimitedMinionQuota[baseIndex] -= 1, 不增加 minionsPlayed
3. 全局额度：shouldIncrementPlayed
   → minionsPlayed += 1
4. 不消耗：consumesNormalLimit === false
   → 不增加 minionsPlayed（忍者 special、弃牌堆额外出牌等）
```

### 写入-消耗对称性验证

| 写入字段 | 写入操作 | 消耗操作 | 对称 |
|----------|---------|---------|------|
| `minionLimit` | += delta | `minionsPlayed >= minionLimit` 判定 | ✅ |
| `baseLimitedMinionQuota[i]` | += delta | -= 1 (当 globalFull && baseQuota > 0) | ✅ |
| `sameNameMinionRemaining` | += delta | -= 1 (当 globalFull && remaining > 0) | ✅ |
| `extraMinionPowerMax` | = min(existing, powerMax) | validate 层检查 `minionsPlayed >= 1 && power > max` | ✅ |
| `actionLimit` | += delta | `actionsPlayed >= actionLimit` 判定 | ✅ |

### 9.2 结论：✅ 消耗条件与写入条件完全对称。

---

## 9.3 baseLimitedMinionQuota 与 minionLimit 并存时的消耗优先级

### 优先级规则
1. 全局额度未满 → 消耗全局额度（minionsPlayed++）
2. 全局额度已满 + 同名额度剩余 → 消耗同名额度
3. 全局额度已满 + 同名额度无/已满 + 基地限定额度剩余 → 消耗基地限定额度
4. 全部已满 → validate 拒绝

### 验证

代码中的判定顺序：
```typescript
const globalFull0 = player.minionsPlayed >= player.minionLimit;
const useSameNameQuota = shouldIncrementPlayed && globalFull0 && sameNameRemaining > 0;
// ...
const globalFull = player.minionsPlayed >= player.minionLimit;
const useBaseQuota = shouldIncrementPlayed && !useSameNameQuota && globalFull && baseQuota > 0;
```

- 同名额度优先于基地限定额度（`!useSameNameQuota` 条件）✅
- 全局额度优先于特殊额度（`globalFull` 条件）✅
- 基地限定额度消耗不影响全局 `minionsPlayed` ✅
- 同名额度消耗不影响全局 `minionsPlayed` ✅

### 9.3 结论：✅ 消耗优先级正确。

---

## 9.4 HAND_SHUFFLED_INTO_DECK 复用事件语义审计

### 调用方

| 调用方 | payload 语义 | 操作范围 |
|--------|-------------|---------|
| `abilityHelpers.shuffleHandIntoDeck()` | 全部手牌洗入牌库 | `newDeckUids` = 手牌 + 原牌库 |
| `miskatonic_field_trip` handler | 部分手牌洗入牌库 | `newDeckUids` = 选中卡牌 + 原牌库 |

### reducer 行为
```typescript
// 只移除被洗入牌库的手牌，保留其余手牌
const movedUidSet = new Set(newDeckUids);
const remainingHand = player.hand.filter(c => !movedUidSet.has(c.uid));
```

reducer 通过 `movedUidSet` 精确过滤，支持全量和部分洗入两种语义。✅

### 9.4 结论：✅ 复用事件类型的 reducer 实现兼容所有调用方的 payload 语义。

---

## 总结

| 子任务 | 维度 | 结果 | 发现数 |
|--------|------|------|--------|
| 9.1 | LIMIT_MODIFIED 写入链路 | ✅ 完整 | 0 |
| 9.2 | PLAY_MINION 消耗对称性 | ✅ 对称 | 0 |
| 9.3 | 额度并存消耗优先级 | ✅ 正确 | 0 |
| 9.4 | 复用事件语义对齐 | ✅ 兼容 | 0 |

**D11/D12/D13 额度写入-消耗对称性审计结论：✅ 全部通过，未发现缺陷。**

> 注：任务 9.5（GameTestRunner 行为测试）将在后续编写。
