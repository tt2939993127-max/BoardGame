# D9 幂等与重入审查报告

## 概述

审查 Undo 操作的状态恢复、EventStream 刷新安全性、重复触发防护。

---

## 检查项 9.1：Undo 操作的状态恢复

**预期行为**：Undo 后充能、魔力、伤害标记、棋盘位置、abilityUsageCount 均正确恢复

**实际行为**：引擎层 Undo 系统通过快照恢复整个 state，不依赖逆向事件。每次命令执行前保存完整状态快照，Undo 时直接恢复到快照状态。

**代码路径**：engine/transport/ → Undo 系统 → 状态快照恢复

**验证**：
- 充能（boosts）：快照包含完整 board 状态，恢复后 boosts 值正确 ✅
- 魔力（magic）：快照包含完整 players 状态，恢复后 magic 值正确 ✅
- 伤害标记（damage）：快照包含完整 board 状态 ✅
- 棋盘位置：快照包含完整 board 状态 ✅
- abilityUsageCount：快照包含完整 core 状态 ✅

**状态**：✅ 正确（快照恢复机制天然保证幂等性）

---

## 检查项 9.2：usesPerTurn 能力 Undo 后的可用性

**预期行为**：Undo 后 abilityUsageCount 正确回退，能力可再次使用

**实际行为**：abilityUsageCount 存储在 core 状态中，Undo 恢复快照时自动回退。

reduce.ts ABILITY_TRIGGERED handler：
```typescript
const usageKey = buildUsageKey(abilityPayload.sourceUnitId, abilityPayload.abilityId);
return {
  ...updatedCore,
  abilityUsageCount: {
    ...(updatedCore.abilityUsageCount ?? {}),
    [usageKey]: ((updatedCore.abilityUsageCount ?? {})[usageKey] ?? 0) + 1,
  },
};
```

Undo 恢复快照后，abilityUsageCount 回到使用前的值，能力可再次使用。

**状态**：✅ 正确

---

## 检查项 9.3：EventStream 刷新安全性

**预期行为**：页面刷新后 EventStream 消费者跳过历史事件，不重播已处理的动画/音效

**实际行为**（useGameEvents.ts）：

### 首次挂载跳过历史

```typescript
const isFirstMount = useRef(true);

useLayoutEffect(() => {
  const entries = getEventStreamEntries(G);
  
  // 首次挂载：将指针推进到当前事件末尾，不回放历史特效
  if (isFirstMount.current) {
    isFirstMount.current = false;
    if (entries.length > 0) {
      lastSeenEventId.current = entries[entries.length - 1].id;
    }
    return;
  }
  // ...
}, [G, core, myPlayerId]);
```
✅ 首次挂载时将 `lastSeenEventId` 推进到最新事件 ID，后续只处理新事件

### Undo 导致的 EventStream 回退

```typescript
const { newEntries, nextLastSeenId, shouldReset } = computeEventStreamDelta(
  entries, lastSeenEventId.current
);

if (shouldReset) {
  pendingAttackRef.current = null;
  pendingDestroyRef.current = [];
  setDiceResult(null);
  setDyingEntities([]);
  damageBuffer.clear();
  setAbilityMode(null);
  setSoulTransferMode(null);
  setMindCaptureMode(null);
  setAfterAttackAbilityMode(null);
  setRapidFireMode(null);
  gateRef.current.reset();
}
```
✅ Undo 导致 EventStream 回退时，清理所有 UI 交互状态

### computeEventStreamDelta 逻辑

```typescript
function computeEventStreamDelta(entries, lastSeenEventId) {
  // 空 entries + 之前有数据 → shouldReset
  if (entries.length === 0) {
    return { newEntries: [], nextLastSeenId: lastSeenEventId > -1 ? -1 : lastSeenEventId, shouldReset: lastSeenEventId > -1 };
  }
  // 最新 entry ID < lastSeen → 回退（Undo）→ shouldReset + 全量重播
  if (lastSeenEventId > -1 && lastEntryId < lastSeenEventId) {
    return { newEntries: entries, nextLastSeenId: lastEntryId, shouldReset: true };
  }
  // 正常增量
  const newEntries = entries.filter(entry => entry.id > lastSeenEventId);
  return { newEntries, nextLastSeenId: ..., shouldReset: false };
}
```
✅ 三种场景均正确处理

**状态**：✅ 正确

---

## 检查项 9.4：同一 UNIT_DESTROYED 事件多触发器不重复

**预期行为**：同一个 UNIT_DESTROYED 事件被多个触发器监听时，每个触发器只执行一次

**实际行为**：触发器在 `emitDestroyWithTriggers` 中一次性生成所有事件（onKill + onDeath + onUnitDestroyed），这些事件作为独立的 GameEvent 追加到事件列表。每个触发器生成的事件是独立的，不存在重复触发的风险。

**关键机制**：
- `emitDestroyWithTriggers` 是纯函数，给定相同输入产生相同输出
- 触发器事件在 `postProcessDeathChecks` 中注入到 result 数组，每个事件只被 reduce 一次
- `destroyedCardIds` Set 防止同一单位被重复消灭

**EventStream 层面**：
- useGameEvents 通过 `lastSeenEventId` 追踪已处理事件
- 刷新后 `isFirstMount` 跳过历史事件
- Undo 后 `shouldReset` 清理状态并从新位置开始

**状态**：✅ 正确

---

## 发现汇总

| # | 严重度 | 类别 | 描述 | 状态 |
|---|--------|------|------|------|
| 无 | - | - | D9 维度未发现缺陷 | ✅ |

**结论**：Undo 通过快照恢复天然保证幂等性，EventStream 刷新安全（首次挂载跳过历史+Undo 回退清理状态），触发器不存在重复执行风险。
