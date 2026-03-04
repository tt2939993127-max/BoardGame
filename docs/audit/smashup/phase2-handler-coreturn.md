# D24 — Handler 共返状态一致性审计报告

> 审计日期：2026-02-27
> 审计范围：所有同时返回非空 `events` 数组和 `queueInteraction` 的 handler
> 审计方法：代码审查（grep 共返模式 → 追踪 events 影响的字段 → 比对 interaction 选项来源）

---

## 15.1 共返 Handler 清单

| 派系 | Handler | events 内容 | interaction 选项来源 | 是否存在冲突 |
|------|---------|-------------|---------------------|-------------|
| 丧尸 | `zombie_outbreak_choose_base` | `grantExtraMinion` (LIMIT_MODIFIED) | 手牌随从列表 | ✅ 无冲突 |
| 丧尸 | `zombie_they_keep_coming` (多基地) | `grantExtraMinion` (LIMIT_MODIFIED) | 基地列表 | ✅ 无冲突 |
| 巫师 | `wizard_neophyte` | REVEAL 事件 | 牌库顶卡牌（已 peek） | ✅ 无冲突 |
| 巫师 | `wizard_archmage` | CARDS_DRAWN 事件 | 手牌排序（continuationContext 中已快照） | ✅ 无冲突 |
| 蒸汽朋克 | `steampunk_mechanic` | `recoverCardsFromDiscard` | 后续交互选项（continuationContext 中已快照） | ✅ 无冲突 |
| 巨蚁 | `giant_ant_a_kind_of_magic` | `removePowerCounter` 事件 | 分配交互（continuationContext 中已快照 total/snapshots） | ✅ 无冲突 |
| 弗兰肯 | `frankenstein_blitzed` | `removePowerCounter` 事件 | 下一个移除目标（从 state 重新构建） | ⚠️ 需检查 |

---

## 15.2 逐项分析

### 丧尸 zombie_outbreak / zombie_they_keep_coming

**events**：`grantExtraMinion` → 写入 `player.minionLimit += 1`
**interaction 选项**：手牌随从列表 / 基地列表
**冲突分析**：`minionLimit` 变化不影响手牌内容或基地列表。✅ 无冲突。

### 巫师 wizard_neophyte

**events**：REVEAL 事件（展示牌库顶）
**interaction 选项**：从 `continuationContext.allTopCards` 构建（已在 events 之前 peek 并快照）
**冲突分析**：REVEAL 事件不修改牌库，选项已快照。✅ 无冲突。

### 巫师 wizard_archmage

**events**：CARDS_DRAWN 事件（抽牌到手牌）
**interaction 选项**：从 `continuationContext.remaining` 构建（已快照 uid 列表）
**冲突分析**：CARDS_DRAWN 会修改 `player.hand` 和 `player.deck`，但选项从 continuationContext 快照构建，不依赖 state。✅ 无冲突。

### 蒸汽朋克 steampunk_mechanic

**events**：`recoverCardsFromDiscard`（弃牌堆→手牌）
**interaction 选项**：后续交互从 continuationContext 构建
**冲突分析**：恢复事件修改 `player.discard` 和 `player.hand`，但后续交互选项不依赖这些字段。✅ 无冲突。

### 巨蚁 giant_ant_a_kind_of_magic

**events**：`removePowerCounter` 事件（移除力量指示物）
**interaction 选项**：分配交互从 `continuationContext.total` 和 `snapshots` 构建
**冲突分析**：力量指示物移除后，分配总量已在 continuationContext 中快照。✅ 无冲突。

### 弗兰肯 frankenstein_blitzed ⚠️

**events**：`removePowerCounter` 事件
**interaction 选项**：`createBlitzedRemoveInteraction(state, ...)` 从当前 state 构建

**冲突分析**：`removePowerCounter` 事件会修改随从的 `powerCounters`。下一个交互的选项从 `state` 构建（而非 events 应用后的 state）。但这里的选项是"选择下一个要移除指示物的随从"，选项过滤条件是 `powerCounters > 0`。

**关键问题**：如果 events 中的 `removePowerCounter` 将某随从的 `powerCounters` 减到 0，该随从仍会出现在下一个交互的选项中（因为选项基于 events 应用前的 state 构建）。

**实际影响评估**：框架层的 `refreshInteractionOptions` 会在交互弹出前自动刷新选项。但 `refreshInteractionOptions` 的自动刷新只处理 `cardUid`/`minionUid`/`baseIndex` 类型的选项（检查是否在手牌/场上/基地存在），不检查 `powerCounters > 0` 这种业务条件。

**风险等级**：💡 低风险改进建议。实际场景中，blitzed 的交互链是连续移除指示物，每次移除 1 个。如果某随从只有 1 个指示物，移除后它不应再出现在选项中。但由于 events 和 interaction 是同时返回的，框架会先 reduce events 再弹出 interaction，此时 state 已更新，`createBlitzedRemoveInteraction` 使用的是 handler 入参的 `state`（旧 state），而非 reduce 后的新 state。

**但**：仔细检查 handler 签名 — `registerInteractionHandler` 的 `state` 参数是 `MatchState`，handler 返回的 `state` 会被框架用于后续处理。框架在处理 handler 返回时，会先 reduce events，再弹出 queue 中的下一个 interaction。所以实际上 `queueInteraction(state, nextInteraction)` 中的 `state` 是旧 state，但 interaction 被放入 queue 后，弹出时框架会用最新 state。加上 `refreshInteractionOptions` 的自动刷新，选项中的 `minionUid` 类型选项会被检查是否仍在场上。

**最终结论**：💡 理论上存在选项过时风险，但实际场景中：(1) 移除指示物不会导致随从离场，`minionUid` 检查仍通过；(2) 玩家选择了 `powerCounters=0` 的随从时，执行层会发现无指示物可移除，产生空操作。建议在 `createBlitzedRemoveInteraction` 中使用 `optionsGenerator` 确保选项基于最新 state。

---

## 15.3 丧尸"弃牌后从弃牌堆选"模式

**重点检查**：丧尸派系的 `zombie_they_keep_coming` 是"从弃牌堆选随从→打出"模式。

**分析**：
- 第一步交互：从弃牌堆选择随从（选项基于当前弃牌堆）
- handler 返回：`grantExtraMinion` event + `queueInteraction`（选择基地）
- `grantExtraMinion` 不修改弃牌堆，选择基地的选项也不依赖弃牌堆

**结论**：✅ 无冲突。丧尸的弃牌堆选择在第一步交互中完成，后续交互只选基地。

---

## 总结

| 子项 | 结论 | 缺陷 |
|------|------|------|
| 15.1 共返 Handler 清单 | 7 个共返 handler | — |
| 15.2 逐项分析 | 6 个无冲突，1 个低风险 | 💡 1 |
| 15.3 丧尸弃牌堆模式 | 无冲突 | 0 |

**D24 维度结论**：✅ 基本通过。1 个低风险改进建议（frankenstein_blitzed 的选项可能包含已无指示物的随从，建议使用 `optionsGenerator`）。
