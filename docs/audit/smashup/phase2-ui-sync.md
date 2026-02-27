# D15 — UI 状态同步审计报告

> 审计日期：2026-02-27
> 审计范围：Board.tsx 额度显示、BaseZone.tsx 力量显示、deployableBaseIndices 计算
> 审计方法：代码审查

---

## 11.1 随从额度显示聚合完整性

**审计目标**：Board.tsx 中"剩余随从次数"是否聚合了所有额度来源。

**代码位置**：Board.tsx ~L1250（额度指示器 IIFE）

**额度来源清单**：

| 来源 | 字段 | UI 是否聚合 |
|------|------|------------|
| 全局额度 | `minionLimit - minionsPlayed` | ✅ `globalRemaining` |
| 基地限定额度 | `baseLimitedMinionQuota` | ✅ `baseQuotaTotal = Object.values(...).reduce(...)` |
| 同名额度 | `sameNameMinionRemaining` | ✅ `sameNameRemaining` |

**总额度计算**：
```typescript
const totalRemaining = globalRemaining + baseQuotaTotal + sameNameRemaining;
```

**Tooltip 明细**：
- 通用额度：`globalRemaining / minionLimit` ✅
- 基地限定额度：逐基地展示 `+count → baseName` ✅
- 力量限制：`extraMinionPowerMax !== undefined` 时显示 ✅
- 同名额度：`sameNameRemaining > 0` 时显示，含锁定 defId 名称 ✅

**结论**：✅ 通过 — 所有额度来源均已聚合，Tooltip 明细完整。

---

## 11.2 deployableBaseIndices 计算正确性

**审计目标**：可部署基地索引是否根据所有约束条件正确过滤。

**代码位置**：Board.tsx ~L520-600（`useMemo` 计算）

**约束检查链**：

| 约束 | 检查逻辑 | 正确性 |
|------|----------|--------|
| 力量上限 | `extraMinionPowerMax !== undefined && minionsPlayed >= 1` → 检查 `basePower > max` | ✅ 仅在额外出牌时生效 |
| 同名锁定 | `globalRemaining <= 0 && sameNameRemaining > 0 && baseQuotaTotal <= 0` → 检查 `defId !== sameNameMinionDefId` | ✅ 仅在只剩同名额度时阻止 |
| 操作限制 | `isOperationRestricted(core, i, playerID, 'play_minion', ...)` | ✅ 逐基地检查 |
| 基地限定额度 | `onlyBaseQuota` 时检查 `baseLimitedMinionQuota[i] > 0` | ✅ 无额度的基地被 `continue` 跳过 |
| 基地限定同名约束 | `baseLimitedSameNameRequired[i]` → 检查基地上是否有同 defId 随从 | ✅ 不满足时 `continue` |
| 随从 playConstraint | `minionDef.playConstraint` → `checkPlayConstraintUI(...)` | ✅ 数据驱动 |
| 行动卡 playConstraint | `actionDef.playConstraint` → `checkPlayConstraintUI(...)` | ✅ 数据驱动 |
| 行动卡操作限制 | `isOperationRestricted(core, i, playerID, 'play_action')` | ✅ 逐基地检查 |

**优先级逻辑**：
- `onlyBaseQuota = globalRemaining <= 0 && sameNameRemaining <= 0`：只有在全局和同名额度都用完时才进入基地限定模式
- 基地限定模式下，先检查额度 > 0，再检查同名约束，最后检查 playConstraint

**结论**：✅ 通过 — 所有约束条件均已正确过滤，优先级逻辑合理。

---

## 11.3 力量修正 UI 渲染

**审计目标**：力量指示物/永久修正/临时修正/持续修正的 UI 渲染是否直接读取 reducer 写入的字段。

**代码位置**：BaseZone.tsx（MinionCard 组件 + 基地力量汇总）

### 随从力量显示

MinionCard 接收 `effectivePower` prop，由父组件通过 `getEffectivePower(core, m, baseIndex)` 计算。

**`getEffectivePower` 计算公式**（ongoingModifiers.ts）：
```
max(0, basePower + powerCounters + powerModifier + tempPowerModifier + ongoingModifier)
```

**力量来源完整性**：

| 来源 | 字段/函数 | UI 是否包含 |
|------|-----------|------------|
| 基础力量 | `minion.basePower` | ✅ |
| 力量指示物 | `minion.powerCounters` | ✅ |
| 永久修正 | `minion.powerModifier` | ✅ |
| 临时修正 | `minion.tempPowerModifier` | ✅ |
| 持续能力修正 | `getOngoingPowerModifier(state, minion, baseIndex)` | ✅ |

### 力量增幅徽章

- 条件：`effectivePower !== minion.basePower` 时显示
- 颜色：增益绿色 / 减益红色 / 无变化灰色
- Tooltip：调用 `getEffectivePowerBreakdown()` 展示完整明细（基础/指示物/永久修正/临时修正/持续修正逐项）

### 基地总力量

- `getTotalEffectivePowerOnBase(core, base, baseIndex)` = 所有随从 `getEffectivePower` 之和 + `getOngoingCardPowerContribution`（ongoing 卡力量贡献）
- 爆点：`getEffectiveBreakpoint(core, baseIndex)` 包含持续修正对爆点的影响

### 玩家力量分组

- `minionTotal = minions.reduce((sum, m) => sum + getEffectivePower(core, m, baseIndex), 0)`
- `ongoingBonus = getOngoingCardPowerContribution(base, pid)`
- `modifierDelta = total - basePowerTotal`：用于颜色指示（绿/红/白）

**结论**：✅ 通过 — 所有力量修正来源均通过 `getEffectivePower` 统一计算，UI 直接消费计算结果，无遗漏。

---

## 总结

| 子项 | 结论 | 缺陷 |
|------|------|------|
| 11.1 随从额度显示 | ✅ 通过 | 0 |
| 11.2 deployableBaseIndices | ✅ 通过 | 0 |
| 11.3 力量修正 UI | ✅ 通过 | 0 |

**D15 维度结论**：✅ 全部通过，UI 状态与 reducer 写入字段完全同步，无遗漏来源。
