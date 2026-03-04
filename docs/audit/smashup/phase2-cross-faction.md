# D33 — 跨派系同类能力实现路径一致性审计报告

> 审计日期：2026-02-27
> 审计范围：基础版 8 派系 + 扩展派系的同类能力实现路径比对
> 审计方法：代码审查（grep 同类操作 → 比对实现模式）

---

## 14.1 按能力类型分组比对

### 消灭随从

所有派系统一使用 `destroyMinion()` 辅助函数（`abilityHelpers.ts`），参数签名一致：
`destroyMinion(uid, defId, baseIndex, ownerId, destroyerId, reason, timestamp)`

| 派系 | 卡牌 | 实现模式 | 一致性 |
|------|------|----------|--------|
| 忍者 | assassination/master/tiger_assassin/seeing_stars | `destroyMinion()` | ✅ |
| 海盗 | saucy_wench/broadside/cannon/powderkeg | `destroyMinion()` | ✅ |
| 机器人 | nukebot/microbot_guard | `destroyMinion()` | ✅ |
| 捣蛋鬼 | gnome/leprechaun(trigger) | `destroyMinion()` / 直接构建事件 | ✅ |
| 巫师 | sacrifice | `destroyMinion()` | ✅ |
| 吸血鬼 | heavy_drinker/nightstalker/big_gulp/dinner_date | `destroyMinion()` | ✅ |
| 狼人 | chew_toy/let_the_dog_out | `destroyMinion()` | ✅ |
| 杀手植物 | sprout(自毁)/choking_vines | `destroyMinion()` | ✅ |
| 弗兰肯 | body_shop/blitzed | `destroyMinion()` | ✅ |
| 幽灵 | spirit | `destroyMinion()` | ✅ |
| 密大 | thing_on_the_doorstep | `destroyMinion()` | ✅ |
| 远古 | unfathomable_goals | `destroyMinion()` | ✅ |

**结论**：✅ 全部一致，无不合理差异。

### 移动随从

所有派系统一使用 `moveMinion()` 辅助函数：
`moveMinion(uid, defId, fromBase, toBase, reason, timestamp)`

| 派系 | 卡牌 | 实现模式 | 一致性 |
|------|------|----------|--------|
| 海盗 | buccaneer/king/first_mate/shanghai/sea_dogs/dinghy/full_sail | `moveMinion()` | ✅ |
| 忍者 | way_of_deception | `moveMinion()` | ✅ |
| 外星人 | invasion | `moveMinion()` | ✅ |
| 黑熊骑兵 | commission/bear_cavalry/youre_screwed/bear_rides_you/borscht | `moveMinion()` | ✅ |
| 蒸汽朋克 | captain_ahab/zeppelin | `moveMinion()` | ✅ |
| 巨蚁 | headlong | `moveMinion()` | ✅ |

**结论**：✅ 全部一致。

### 额外出牌（grantExtraMinion/grantExtraAction）

所有派系统一使用 `grantExtraMinion()` / `grantExtraAction()` 辅助函数，生成 `LIMIT_MODIFIED` 事件。

| 派系 | 卡牌 | 额度类型 | 约束 | 一致性 |
|------|------|----------|------|--------|
| 巫师 | summon | 全局随从 | 无 | ✅ |
| 机器人 | microbot_fixer/reclaimer/zapbot/hoverbot | 全局随从 | zapbot: powerMax=2 | ✅ |
| 丧尸 | outbreak/they_keep_coming | 全局随从 | 无 | ✅ |
| 杀手植物 | insta_grow/sprout/venus_man_trap/blossom | 全局随从 | blossom: sameNameOnly | ✅ |
| 幽灵 | ghostly_arrival/the_dead_rise | 全局随从 | 无 | ✅ |
| 弗兰肯 | the_monster/its_alive | 全局随从 | 无 | ✅ |
| 黑熊骑兵 | commission | 全局随从 | 无 | ✅ |
| 外星人 | abduction/terraform | 全局随从 | 无 | ✅ |
| 密大 | lost_knowledge/professor | 全局随从/基地限定 | lost_knowledge: restrictToBase | ✅ |
| 印斯茅斯 | sacred_circle/spreading_the_word/recruitment | 全局/基地限定 | sameNameOnly | ✅ |
| 基地 | secret_garden/fairy_ring | 基地限定 | powerMax/restrictToBase | ✅ |

**结论**：✅ 全部一致，约束通过 `options` 参数传递，模式统一。

### 抽牌

所有派系统一使用 `CARDS_DRAWN` 事件类型。

**结论**：✅ 全部一致。

### 力量修正

| 类型 | 辅助函数 | 使用派系 | 一致性 |
|------|----------|----------|--------|
| 临时修正 | `addTempPower()` | 狼人/海盗 | ✅ |
| 永久修正 | `POWER_MODIFIED` 事件 | 密大 | ✅ |
| 力量指示物 | `addPowerCounter()` | 吸血鬼/弗兰肯/巨蚁 | ✅ |
| 持续修正 | `registerOngoingPowerModifier()` | 多派系 ongoing | ✅ |

**结论**：✅ 四种力量修正类型各有明确的辅助函数/事件，无混用。

### 弃牌堆回收

| 派系 | 卡牌 | 实现模式 | 一致性 |
|------|------|----------|--------|
| 丧尸 | they_keep_coming/mall_crawl | 交互选择 → MINION_PLAYED(fromDiscard) | ✅ |
| 幽灵 | the_dead_rise | 交互选择 → MINION_PLAYED(fromDiscard) | ✅ |
| 弗兰肯 | body_shop | 交互选择 → 消灭+回收 | ✅ |

**结论**：✅ 弃牌堆出牌统一使用 `fromDiscard: true` 标记。

### 返回手牌

所有派系统一使用 `MINION_RETURNED` 事件类型。

**结论**：✅ 全部一致。

---

## 14.2 注册模式一致性

| 模式 | 使用场景 | 一致性 |
|------|----------|--------|
| `registerAbility(defId, fn)` | onPlay 能力 | ✅ 所有派系统一 |
| `registerTrigger(defId, timing, fn)` | ongoing trigger | ✅ 所有派系统一 |
| `registerInteractionHandler(sourceId, fn)` | 交互解决 | ✅ 所有派系统一 |
| `registerOngoingPowerModifier(defId, ...)` | 持续力量修正 | ✅ 所有派系统一 |
| `registerProtection(defId, ...)` | 保护效果 | ✅ 所有派系统一 |

---

## 14.3 不合理差异标记

**未发现不合理差异**。所有派系均使用统一的辅助函数和注册模式。

唯一的模式差异是捣蛋鬼 `leprechaun` 的 trigger 中直接构建 `MINION_DESTROYED` 事件（而非调用 `destroyMinion()`），但这是因为 trigger 回调的上下文不同（没有 `ctx.now`，使用 `trigCtx` 的时间戳），属于合理差异。

---

## 总结

| 子项 | 结论 | 缺陷 |
|------|------|------|
| 14.1 能力类型分组比对 | 7 类能力全部一致 | 0 |
| 14.2 注册模式一致性 | 5 种注册模式全部统一 | 0 |
| 14.3 不合理差异 | 无 | 0 |

**D33 维度结论**：✅ 全部通过，跨派系实现路径高度一致。
