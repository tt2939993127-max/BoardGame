# D7 资源守恒审查报告

## 概述

审查魔力、充能、伤害标记、手牌/弃牌堆/棋盘在全流程中的守恒性。

---

## 检查项 7.1：魔力守恒（[0, 15] 范围约束）

**预期行为**：所有魔力变化路径都经过 clampMagic，值始终在 [0, 15] 范围内

**实际行为**：

### 7.1.1 MAGIC_CHANGED 事件路径（主路径）

reduce.ts MAGIC_CHANGED handler：
```typescript
magic: clampMagic(core.players[playerId].magic + delta)
```
✅ 始终调用 clampMagic

### 7.1.2 UNIT_DESTROYED 内联魔力奖励

reduce.ts UNIT_DESTROYED handler 中击杀方魔力+1：
```typescript
magic: clampMagic(core.players[rewardPlayerId].magic + 1)
```
✅ 始终调用 clampMagic

### 7.1.3 STRUCTURE_DESTROYED 内联魔力奖励

reduce.ts STRUCTURE_DESTROYED handler 中击杀方魔力+1：
```typescript
magic: clampMagic(core.players[rewardPlayerId].magic + 1)
```
✅ 始终调用 clampMagic

### 7.1.4 clampMagic 实现

helpers.ts:482：
```typescript
function clampMagic(value: number): number {
  return Math.max(MAGIC_MIN, Math.min(MAGIC_MAX, value));
}
```
✅ MAGIC_MIN=0, MAGIC_MAX=15

**魔力变化产生点清单**：

| 来源 | delta | 路径 | clampMagic |
|------|-------|------|-----------|
| 弃牌换魔力 | +N（弃牌数） | execute → MAGIC_CHANGED | ✅ |
| 消灭敌方单位 | +1 | reduce UNIT_DESTROYED | ✅ |
| 消灭敌方建筑 | +1 | reduce STRUCTURE_DESTROYED | ✅ |
| 召唤单位 | -cost | execute → MAGIC_CHANGED | ✅ |
| 建造建筑 | -cost | execute → MAGIC_CHANGED | ✅ |
| 打出事件卡 | -cost | execute → MAGIC_CHANGED | ✅ |
| blood_rune 自伤 | -1 | executor → MAGIC_CHANGED | ✅ |
| magic_addiction | -1 | flowHooks onTurnEnd → MAGIC_CHANGED | ✅ |
| holy_arrow 弃牌 | +N | execute DECLARE_ATTACK → MAGIC_CHANGED | ✅ |

**状态**：✅ 所有路径均调用 clampMagic

---

## 检查项 7.2：充能守恒

### 7.2.1 UNIT_CHARGED 事件处理

reduce.ts UNIT_CHARGED handler：
```typescript
const finalValue = newValue !== undefined ? newValue : Math.max(0, currentBoosts + delta);
cell.unit = { ...cell.unit, boosts: finalValue };
```
- 使用 `Math.max(0, ...)` 确保充能不低于 0 ✅
- 支持 delta 模式和 newValue 绝对值模式 ✅

### 7.2.2 blood_rage 衰减

flowHooks.ts onTurnEnd → triggerAllUnitsAbilities('onTurnEnd') → blood_rage executor 生成 UNIT_CHARGED(delta: -2)
- reduce.ts 中 `Math.max(0, currentBoosts + delta)` 确保不低于 0 ✅

### 7.2.3 ancestral_bond 转移守恒

**预期**：源单位减少量 = 目标单位增加量

**实际**：ancestral_bond executor 生成两个 UNIT_CHARGED 事件：
- 源单位 UNIT_CHARGED(delta: -transferAmount)
- 目标单位 UNIT_CHARGED(delta: +transferAmount)

**已验证**：ancestral_bond executor（barbaric.ts）读取 `selfCharges = sourceUnit.boosts ?? 0`，仅当 `selfCharges > 0` 时才生成转移事件，且源 delta=-selfCharges、目标 delta=+selfCharges，守恒正确。spirit_bond 转移同理（固定转移1点，前置检查 `boosts >= 1`）。

**状态**：✅ 充能转移守恒正确

---

## 检查项 7.3：手牌/弃牌堆/棋盘守恒

### 7.3.1 弃牌换魔力

execute.ts 弃牌阶段：每弃一张牌生成 CARD_DISCARDED + MAGIC_CHANGED(delta:+1)
- reduce.ts CARD_DISCARDED：手牌移除 + 弃牌堆增加 ✅
- 弃牌数 = 魔力增加量 ✅

### 7.3.2 抽牌至5张

flowHooks.ts onPhaseExit(draw)：
```typescript
const drawCount = Math.max(0, HAND_SIZE - player.hand.length);
const actualDraw = Math.min(drawCount, player.deck.length);
```
- reduce.ts CARD_DRAWN：牌库移除 + 手牌增加 ✅
- 牌库为空时 `actualDraw = 0`，不抽牌 ✅
- 不洗混弃牌堆（召唤师战争规则：牌库耗尽不洗牌）✅

### 7.3.3 消灭 → 弃置

reduce.ts UNIT_DESTROYED：
```typescript
discard: [...ownerWithEvents.discard, destroyedCard, ...attachedUnitCards, ...attachedEventCards]
```
- 棋盘移除（`cell.unit = undefined`）✅
- 弃牌堆增加（被消灭卡 + 附加单位卡 + 附加事件卡）✅
- 不屈不挠例外：返回手牌而非弃牌堆 ✅

### 7.3.4 复活死灵（revive_undead）

reduce.ts UNIT_SUMMONED(fromDiscard: true)：
```typescript
const { discard: newDiscard } = removeFromDiscard(player.discard, cardId);
// + 棋盘放置新单位
```
- 弃牌堆移除 + 棋盘增加 ✅

### 7.3.5 事件卡生命周期

| 操作 | 手牌 | 主动事件区 | 弃牌堆 | 棋盘 |
|------|------|-----------|--------|------|
| 打出即时事件 | -1 | 0 | +1 | 0 |
| 打出主动事件 | -1 | +1 | 0 | 0 |
| 打出附加事件 | -1 | 0 | 0 | +1(attachedCards) |
| 主动事件弃置 | 0 | -1 | +1 | 0 |
| 附加单位被消灭 | 0 | 0 | +1 | -1(attachedCards) |

reduce.ts EVENT_PLAYED / ACTIVE_EVENT_DISCARDED / UNIT_DESTROYED 均正确处理 ✅

**状态**：✅ 手牌/弃牌堆/棋盘守恒正确

---

## 检查项 7.4：伤害标记守恒

### 7.4.1 UNIT_DAMAGED

reduce.ts：`cell.unit = { ...cell.unit, damage: newDamage, wasAttackedThisTurn: true }`
- 伤害只增不减（除治疗）✅

### 7.4.2 UNIT_HEALED

reduce.ts：`cell.unit = { ...cell.unit, damage: Math.max(0, cell.unit.damage - amount) }`
- `Math.max(0, ...)` 确保伤害不低于 0 ✅

**状态**：✅ 正确

---

## 发现汇总

| # | 严重度 | 类别 | 描述 | 状态 |
|---|--------|------|------|------|
| 无 | - | - | D7 维度未发现缺陷 | ✅ |

**结论**：魔力守恒完整（所有路径均调用 clampMagic），充能转移守恒正确（ancestral_bond/spirit_bond 均前置检查+精确转移），伤害标记守恒正确，手牌/弃牌堆/棋盘守恒正确。
