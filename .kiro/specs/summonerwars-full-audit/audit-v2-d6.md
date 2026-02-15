# D6 副作用传播审查报告

## 概述

审查 UNIT_DESTROYED 事件的完整消费链、自伤致死传播、连锁消灭递归安全性、控制权转移后的消灭归属。

---

## 检查项 6.1：UNIT_DESTROYED 事件消费链完整性

**预期行为**：UNIT_DAMAGED → 伤害≥生命 → UNIT_DESTROYED → 弃置+魔力+1 → 触发 onKill/onDeath/onUnitDestroyed 链

**实际行为**：`postProcessDeathChecks`（execute/helpers.ts:178-244）遍历事件列表，对每个 UNIT_DAMAGED 模拟累计伤害，致死时注入 `emitDestroyWithTriggers` 生成的完整触发链：
1. UNIT_DESTROYED 事件（含 killerPlayerId、skipMagicReward 标记）
2. onKill 触发（感染 infection、灵魂转移 soul_transfer 等）
3. onDeath 触发（献祭 sacrifice 等）
4. onUnitDestroyed 触发（血腥狂怒 blood_rage、殉葬火堆充能等）

**代码路径**：`execute/helpers.ts:postProcessDeathChecks` → `emitDestroyWithTriggers` → `triggerAbilities('onKill')` → `triggerAbilities('onDeath')` → `triggerAllUnitsAbilities('onUnitDestroyed')`

**状态**：✅ 正确

**证据**：
- `emitDestroyWithTriggers`（helpers.ts:130-175）按固定顺序生成 4 类事件
- `postProcessDeathChecks` 使用 `destroyedCardIds` Set 防止同一单位重复注入 DESTROYED
- reduce.ts UNIT_DESTROYED handler 正确处理：棋盘移除 + 弃牌堆增加 + 附加卡同步弃置 + 击杀方魔力+1（clampMagic）

---

## 检查项 6.2：连锁消灭递归安全性

**预期行为**：连锁消灭（如献祭伤害导致另一单位死亡）应递归处理所有死亡，且不产生无限循环

**实际行为**：`postProcessDeathChecks` 使用 while 循环遍历 result 数组，注入的新事件会被后续迭代处理（支持连锁）。安全上限 `maxEvents = events.length + 200`，超过则停止处理。

**代码路径**：`execute/helpers.ts:196` → `while (idx < result.length && result.length < maxEvents)`

**状态**：✅ 正确

**证据**：
```typescript
const maxEvents = events.length + 200; // 安全上限
while (idx < result.length && result.length < maxEvents) {
  // ... 处理 UNIT_DAMAGED → 注入 UNIT_DESTROYED + 触发链
  workingState = reduceEvent(workingState, event);
  idx++;
}
```
- `destroyedCardIds` Set 确保同一单位不会被重复消灭
- 每次注入后 `workingState` 通过 `reduceEvent` 更新，后续伤害检测基于最新状态
- 200 事件安全上限足够覆盖极端场景（棋盘最多约 30 个单位）

---

## 检查项 6.3：UNIT_DESTROYED 消费者清单

| 消费者 | 触发类型 | 触发条件 | 行为 |
|--------|---------|---------|------|
| reduce.ts UNIT_DESTROYED | reducer | 所有消灭 | 棋盘移除 + 弃牌堆增加 + 附加卡弃置 + 击杀方魔力+1 |
| sacrifice（献祭） | onDeath | 被消灭单位拥有 sacrifice | 对相邻所有敌方单位造成1伤 |
| infection（感染） | onKill | 击杀者拥有 infection | 从弃牌堆召唤疫病体到被消灭位置 |
| blood_rage（血腥狂怒） | onUnitDestroyed | 当前回合玩家拥有 blood_rage 的单位 | 充能+1 |
| soulless（无魂） | UNIT_DESTROYED payload | skipMagicReward=true | 击杀方不获得魔力 |
| 殉葬火堆 | onUnitDestroyed | 主动事件区有殉葬火堆 | 充能+1（getFuneralPyreChargeEvents） |
| 不屈不挠（relentless） | reduce.ts | 主动事件区有 relentless + 被消灭为友方士兵 + 非自毁 | 返回手牌而非弃牌堆 |
| 圣洁审判 | reduce.ts | 主动事件区有 holy_judgment + 有充能 | 充能-1，归零时自动弃置 |

**状态**：✅ 所有消费者已确认

---

## 检查项 6.4：自伤致死 → 游戏结束链路

**预期行为**：revive_undead 自伤2 / blood_rune 自伤1 → 召唤师死亡 → sys.gameover

**实际行为**：自伤通过 UNIT_DAMAGED 事件实现，`postProcessDeathChecks` 检测到召唤师伤害≥生命时注入 UNIT_DESTROYED。引擎层 `executePipeline` 在每次命令执行后调用 `domain.isGameOver()` 检测召唤师是否存活，写入 `sys.gameover`。

**代码路径**：
- revive_undead executor → UNIT_DAMAGED(damage:2) → postProcessDeathChecks → UNIT_DESTROYED
- blood_rune executor → UNIT_DAMAGED(damage:1) → postProcessDeathChecks → UNIT_DESTROYED
- executePipeline → isGameOver() → sys.gameover

**状态**：✅ 正确

**证据**：postProcessDeathChecks 不区分伤害来源，统一检测 `newDamage >= getEffectiveLife(unit, workingState)`

---

## 检查项 6.5：事件卡伤害传播

**预期行为**：歼灭/地狱火之刃/寒冰冲撞等事件卡效果产生的伤害应正确传播到死亡检测

**实际行为**：事件卡效果通过 execute 层生成 UNIT_DAMAGED 事件，所有命令执行后统一经过 `postProcessDeathChecks` 后处理。

**状态**：✅ 正确

---

## 检查项 6.6：控制权转移后的消灭归属

**预期行为**：
- mind_capture 永久控制后被消灭：魔力归属击杀方（新拥有者的对手）
- mind_control 临时控制后被消灭：魔力归属击杀方

**实际行为**：
- CONTROL_TRANSFERRED 在 reduce.ts 中修改 `unit.owner`（永久）或同时保存 `originalOwner`（临时）
- UNIT_DESTROYED 在 reduce.ts 中使用 `killerPlayerId` 判断魔力归属：`killerPlayerId !== actualOwner && !skipMagicReward` 时击杀方+1魔力
- `actualOwner` 取 payload.owner（即消灭时的 owner），已经是控制权转移后的值

**代码路径**：reduce.ts CONTROL_TRANSFERRED → `cell.unit.owner = newOwner` → UNIT_DESTROYED → `rewardPlayerId = killerPlayerId !== actualOwner ? killerPlayerId : undefined`

**状态**：✅ 正确

**证据**：mind_control 临时控制的单位在回合结束时通过 TURN_CHANGED reducer 归还（`originalOwner` 恢复）。如果在控制期间被消灭，owner 已是控制方，魔力归属正确。

---

## 发现汇总

| # | 严重度 | 类别 | 描述 | 状态 |
|---|--------|------|------|------|
| 无 | - | - | D6 维度未发现缺陷 | ✅ |

**结论**：副作用传播链路完整，连锁消灭有安全上限（+200），所有消费者触发条件和顺序正确。
