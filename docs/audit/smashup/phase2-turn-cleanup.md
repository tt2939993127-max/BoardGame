# D14 回合清理完整性审计报告

> 审计范围：SmashUp 全部回合内临时字段的写入与清理
> 审计日期：2026-02-27

---

## 10.1 回合内临时字段清单

### 玩家级字段（`state.players[pid]`）

| 字段 | 写入时机 | 用途 |
|------|---------|------|
| `minionsPlayed` | MINION_PLAYED reduce | 已打出随从计数 |
| `minionLimit` | LIMIT_MODIFIED reduce | 随从额度上限 |
| `actionsPlayed` | ACTION_PLAYED reduce | 已打出行动计数 |
| `actionLimit` | LIMIT_MODIFIED reduce / TURN_STARTED | 行动额度上限 |
| `minionsPlayedPerBase` | MINION_PLAYED reduce | 每基地打出随从计数 |
| `usedDiscardPlayAbilities` | MINION_PLAYED reduce | 已使用的弃牌堆出牌能力 |
| `baseLimitedMinionQuota` | LIMIT_MODIFIED reduce | 基地限定随从额度 |
| `baseLimitedSameNameRequired` | LIMIT_MODIFIED reduce | 基地限定同名约束 |
| `extraMinionPowerMax` | LIMIT_MODIFIED reduce | 额外出牌力量上限 |
| `sameNameMinionRemaining` | LIMIT_MODIFIED reduce | 同名额度剩余 |
| `sameNameMinionDefId` | LIMIT_MODIFIED reduce | 同名锁定 defId |
| `pendingMinionPlayEffects` | 打出随从后效果队列 | 待执行的打出后效果 |

### 全局级字段（`state`）

| 字段 | 写入时机 | 用途 |
|------|---------|------|
| `turnDestroyedMinions` | MINION_DESTROYED reduce | 本回合消灭记录 |
| `minionsMovedToBaseThisTurn` | MINION_MOVED reduce | 本回合移动追踪 |
| `tempBreakpointModifiers` | BREAKPOINT_MODIFIED reduce | 临时临界点修正 |
| `specialLimitUsed` | SPECIAL_LIMIT_USED reduce | special 能力限制组使用记录 |
| `standingStonesDoubleTalentMinionUid` | TALENT_USED reduce | 巨石阵双才能追踪 |
| `pendingAfterScoringSpecials` | SPECIAL_AFTER_SCORING_ARMED reduce | 计分后延迟 special |
| `scoringEligibleBaseIndices` | onPhaseEnter(scoreBases) | 锁定的 eligible 基地 |
| `sleepMarkedPlayers` | 上回合写入 | 沉睡标记 |

### 随从/行动卡级字段（`base.minions[i]` / `base.ongoingActions[i]`）

| 字段 | 写入时机 | 用途 |
|------|---------|------|
| `talentUsed` | TALENT_USED reduce | 天赋已使用标记 |
| `playedThisTurn` | MINION_PLAYED reduce | 本回合打出标记 |
| `tempPowerModifier` | TEMP_POWER_ADDED reduce | 临时力量修正 |

---

## 10.2 TURN_STARTED 清理验证

### 玩家级字段清理

| 字段 | TURN_STARTED 清理值 | 对齐 |
|------|-------------------|------|
| `minionsPlayed` | `0` | ✅ |
| `minionLimit` | `1` | ✅ |
| `actionsPlayed` | `0` | ✅ |
| `actionLimit` | `1`（沉睡标记时 `0`） | ✅ |
| `minionsPlayedPerBase` | `undefined` | ✅ |
| `usedDiscardPlayAbilities` | `undefined` | ✅ |
| `baseLimitedMinionQuota` | `undefined` | ✅ |
| `baseLimitedSameNameRequired` | `undefined`（隐式，随 baseLimitedMinionQuota 清除） | ⚠️ 见下方 |
| `extraMinionPowerMax` | `undefined` | ✅ |
| `sameNameMinionRemaining` | `undefined` | ✅ |
| `sameNameMinionDefId` | `null` | ✅ |
| `pendingMinionPlayEffects` | `undefined` | ✅ |

### 全局级字段清理

| 字段 | TURN_STARTED 清理值 | 对齐 |
|------|-------------------|------|
| `turnDestroyedMinions` | `[]` | ✅ |
| `minionsMovedToBaseThisTurn` | `undefined` | ✅ |
| `tempBreakpointModifiers` | `undefined` | ✅ |
| `specialLimitUsed` | `undefined` | ✅ |
| `standingStonesDoubleTalentMinionUid` | `undefined` | ✅ |
| `pendingAfterScoringSpecials` | `undefined` | ✅ |
| `scoringEligibleBaseIndices` | `undefined` | ✅ |
| `sleepMarkedPlayers` | 清除当前玩家的标记 | ✅ |

### 随从/行动卡级字段清理

| 字段 | TURN_STARTED 清理值 | 对齐 |
|------|-------------------|------|
| `talentUsed` | `false`（仅当前玩家控制的） | ✅ |
| `playedThisTurn` | `undefined`（仅当前玩家控制的） | ✅ |
| `tempPowerModifier` | `0`（所有随从） | ✅ |

---

## ⚠️ 发现：baseLimitedSameNameRequired 未显式清理

`baseLimitedSameNameRequired` 在 TURN_STARTED 中未被显式设置为 `undefined`。但由于 `baseLimitedMinionQuota` 被清理为 `undefined`，而 `baseLimitedSameNameRequired` 仅在 `baseLimitedMinionQuota` 存在时才有意义（validate 层先检查 quota > 0），因此实际不会产生功能缺陷。

**严重程度**：💡 改进建议（非功能缺陷）
**建议**：在 TURN_STARTED 中显式清理 `baseLimitedSameNameRequired: undefined`，保持代码清晰。

---

## 总结

| 子任务 | 维度 | 结果 | 发现数 |
|--------|------|------|--------|
| 10.1 | 临时字段清单 | 完成 | N/A |
| 10.2 | TURN_STARTED 清理验证 | ✅ 功能正确 | 💡 1 个改进建议 |

**D14 回合清理完整性审计结论：✅ 功能正确，1 个代码清晰度改进建议（`baseLimitedSameNameRequired` 显式清理）。**

> 注：任务 10.3（GameTestRunner 行为测试）将在后续编写。
