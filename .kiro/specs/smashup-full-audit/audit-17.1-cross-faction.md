# 审查报告：跨派系交叉影响审查

## 审查汇总

| 指标 | 值 |
|------|-----|
| 范围 | 16 派系 + 全部基地的跨能力交互 |
| 审查维度 | 6（保护叠加、限制叠加、触发链顺序、微型机联动、疯狂卡交互、弃牌堆出牌） |
| ✅ 无问题 | 3 |
| ⚠️ 潜在风险 | 3 |
| 通过率 | 50.0% |

---

## 维度 1：保护效果叠加

### 注册总览

共 18 个保护注册，涉及 5 种保护类型：

| 保护类型 | 注册数 | 来源 |
|----------|--------|------|
| destroy | 6 | bear_cavalry_general_ivan, bear_cavalry_polar_commando, bear_cavalry_superiority, robot_warbot, base_beautiful_castle, base_pony_paradise |
| move | 4 | bear_cavalry_superiority, killer_plant_deep_roots, killer_plant_entangled, base_beautiful_castle |
| affect | 6 | bear_cavalry_superiority, ghost_incorporeal, ghost_haunting, innsmouth_in_plain_sight, ninja_infiltrate, base_beautiful_castle, dino_tooth_and_claw |
| action | 3 | ninja_smoke_bomb, trickster_hideout, dino_wildlife_preserve |

### 叠加逻辑分析

`isMinionProtected` 采用**短路 OR**：遍历所有注册的保护检查器，任一返回 `true` 即保护生效。

**潜在叠加场景：**

1. **bear_cavalry_general_ivan + robot_warbot + base_pony_paradise**：三重消灭保护叠加。框架层短路 OR 正确处理，无冲突。
2. **bear_cavalry_superiority + ghost_incorporeal + innsmouth_in_plain_sight**：三重 affect 保护叠加。各自有不同的触发条件（superiority 检查同基地、incorporeal 检查附着、in_plain_sight 检查力量 ≤2），短路 OR 正确。
3. **ninja_smoke_bomb + trickster_hideout + dino_wildlife_preserve**：三重 action 保护叠加。各自检查不同条件，无冲突。

### 结论: ✅ 无问题
保护叠加通过短路 OR 正确处理，各保护检查器有独立的触发条件，不会产生冲突。

---

## 维度 2：限制效果叠加

### 注册总览

限制效果通过两层实现：
1. **数据驱动**：`BaseCardDef.restrictions`（base_tsars_palace 力量 ≤2 禁止、base_castle_of_ice 禁止随从、base_dread_lookout 禁止行动、base_north_pole 每回合 1 随从）
2. **ongoing 效果**：`registerRestriction`（zombie_overrun 禁止其他玩家打随从、steampunk_ornate_dome 禁止对手打行动）

### 叠加逻辑分析

`isOperationRestricted` 先检查基地定义限制，再检查 ongoing 限制，任一返回 `true` 即限制生效。

**潜在叠加场景：**

1. **zombie_overrun + base_castle_of_ice**：两者都禁止打随从，叠加无冲突（都返回 true）。
2. **steampunk_ornate_dome + base_dread_lookout**：两者都禁止打行动，叠加无冲突。
3. **zombie_overrun + base_north_pole**：overrun 禁止其他玩家打随从，north_pole 限制每回合 1 随从。overrun 更严格，叠加无冲突。

### 结论: ✅ 无问题
限制叠加通过 OR 逻辑正确处理。

---

## 维度 3：触发链执行顺序

### 注册总览

共 24 个触发器注册，按时机分类：

| 时机 | 触发器数 | 来源 |
|------|----------|------|
| onTurnStart | 7 | ninja_smoke_bomb, ninja_infiltrate, zombie_overrun, trickster_enshrouding_mist, killer_plant_water_lily/sprout/choking_vines/entangled, cthulhu_complete_the_ritual, wizard_archmage |
| onTurnEnd | 3 | ninja_assassination, steampunk_difference_engine, cthulhu_furthering_the_cause, elder_thing_dunwich_horror |
| onMinionPlayed | 4 | trickster_leprechaun, trickster_flame_trap, trickster_pay_the_piper, cthulhu_altar |
| onMinionDestroyed | 3 | robot_microbot_archive, steampunk_escape_hatch, base_house_of_nine_lives |
| onMinionMoved | 2 | bear_cavalry_cub_scout, bear_cavalry_high_ground |
| beforeScoring | 2 | pirate_king, cthulhu_chosen |
| afterScoring | 2 | pirate_first_mate, alien_scout |
| onMinionAffected | 1 | trickster_brownie |

### 潜在冲突场景

#### ⚠️ 场景 A：onMinionPlayed 多触发器冲突
当随从打出到有 `trickster_leprechaun` + `trickster_flame_trap` + `cthulhu_altar` 的基地时：
- leprechaun：力量更低的对手随从被消灭
- flame_trap：对手随从被消灭
- altar：打出者额外打出行动

**风险**：leprechaun 和 flame_trap 都可能消灭同一个随从，执行顺序影响结果。如果 flame_trap 先消灭，leprechaun 的力量比较可能找不到目标。框架层按注册顺序执行，但未定义优先级。

#### ⚠️ 场景 B：onMinionDestroyed 消灭拦截冲突
当随从被消灭时，`steampunk_escape_hatch`（回手牌）和 `base_house_of_nine_lives`（移动到九命之家）可能同时触发：
- escape_hatch：附着此卡的随从被消灭时回手牌
- nine_lives：其他基地随从被消灭时可移动到九命之家

**风险**：两者都试图"拯救"同一个随从，执行顺序决定哪个生效。框架层 `processDestroyTriggers` 的 `pendingSaveMinionUids` 机制可能只处理第一个。

#### 场景 C：onTurnStart 多触发器
回合开始时可能同时触发 7+ 个触发器。框架层按注册顺序执行，各触发器独立产生事件，通常无冲突（各自操作不同的卡牌/基地）。

### 结论: ⚠️ 潜在风险
场景 A 和 B 存在执行顺序依赖，框架层未定义优先级机制。建议：
1. 为 `onMinionPlayed` 触发器添加优先级排序
2. 为 `onMinionDestroyed` 拦截添加互斥检查

---

## 维度 4：robot_microbot_alpha "视为微型机"联动

### 实现分析

`robot_microbot_alpha` 的"所有随从视为微型机"效果通过以下方式实现：
- `ongoing_modifiers.ts`：`registerPowerModifier('robot_microbot_alpha', ...)` — 只对 alpha 自身生效，按场上其他己方随从数量加力量
- `robots.ts`：`microbotDefIds` 集合包含 alpha 自身，用于 `robot_microbot_archive` 的消灭触发检查

### 跨派系影响

1. **与其他派系的"消灭随从"效果**：alpha 的力量修正是被动的，不影响其他派系的消灭逻辑
2. **与 base_beautiful_castle 的力量 ≥5 保护**：alpha 的力量随场上随从数增长，可能达到 5+ 触发保护
3. **"视为微型机"语义**：i18n 说"你的所有随从均视为微型机"，但实现只对 alpha 自身加力量，不改变其他随从的 defId 或类型。其他随从不会被 `robot_microbot_archive` 的消灭触发识别为微型机

### 结论: ⚠️ 潜在风险
"视为微型机"的语义未完全实现 — 其他己方随从不会触发微型机相关效果（如 archive 的消灭抽牌）。这是一个已知的简化实现。

---

## 维度 5：疯狂卡机制与非克苏鲁派系交互

### 初始化逻辑

`hasCthulhuExpansionFaction()` 检查是否有克苏鲁扩展派系（cthulhu/elder_things/innsmouth/miskatonic_university），有则初始化 `madnessDeck`。

### 跨派系影响

1. **非克苏鲁派系 + 克苏鲁扩展基地**：如果基地牌库中有克苏鲁扩展基地（如 base_mountains_of_madness），但无克苏鲁派系，`madnessDeck` 为 `undefined`，基地能力中的 `drawMadnessCards` 会返回 `undefined`，安全降级
2. **克苏鲁派系 + 非克苏鲁派系混搭**：疯狂卡只影响有克苏鲁派系的玩家（通过 `drawMadnessCards` 分发），但 `base_the_asylum` 等基地能力对所有玩家触发。非克苏鲁玩家手牌中不会有疯狂卡，所以基地能力的 Prompt 不会出现疯狂卡选项
3. **VP 惩罚**：`madnessDeck !== undefined` 时所有玩家都受疯狂卡 VP 惩罚（每 2 张扣 1 VP），但非克苏鲁玩家通常不会持有疯狂卡

### 结论: ✅ 无问题
疯狂卡系统通过 `madnessDeck` 存在性检查安全降级，非克苏鲁派系不受影响。

---

## 维度 6：弃牌堆出牌系统跨派系交互

### 注册总览

3 个 `DiscardPlayProvider`：
1. **zombie_tenacious_z**：弃牌堆中的顽强丧尸可作为额外随从打出（每回合限一次）
2. **zombie_theyre_coming_to_get_you**：ongoing 行动卡，可从弃牌堆打出随从到此基地
3. **ghost_spectre**：手牌 ≤2 时可从弃牌堆打出幽灵之主（额外打出）

### 跨派系影响

1. **僵尸 + 幽灵混搭**：两个弃牌堆出牌能力可能同时生效。`getPlayableFromDiscard` 遍历所有 provider，合并结果。同一张卡可能被多个 provider 标记为可打出，但打出时只消耗一次
2. **弃牌堆出牌 + 保护效果**：从弃牌堆打出的随从与正常打出的随从享受相同的保护效果
3. **弃牌堆出牌 + 基地限制**：从弃牌堆打出的随从同样受基地限制（如 base_tsars_palace 力量 ≤2 禁止）

### 结论: ✅ 无问题
弃牌堆出牌系统通过 provider 模式正确合并，与保护/限制系统兼容。

---

## 全局交叉影响总结

| 维度 | 结论 | 风险等级 |
|------|------|----------|
| 保护效果叠加 | ✅ 短路 OR 正确处理 | 低 |
| 限制效果叠加 | ✅ OR 逻辑正确 | 低 |
| 触发链执行顺序 | ⚠️ onMinionPlayed/onMinionDestroyed 多触发器冲突 | 中 |
| 微型机联动 | ⚠️ "视为微型机"语义未完全实现 | 中 |
| 疯狂卡交互 | ✅ 安全降级 | 低 |
| 弃牌堆出牌 | ✅ provider 模式兼容 | 低 |

### 建议修复优先级

1. **P1 - 触发链优先级**：为 `onMinionPlayed` 和 `onMinionDestroyed` 触发器添加优先级机制，确保消灭拦截（escape_hatch/nine_lives）优先于消灭触发（archive/cave_of_shinies）
2. **P2 - 微型机语义**：明确 `robot_microbot_alpha` 的"视为微型机"是否应影响其他随从的 `robot_microbot_archive` 触发。如果是，需要在 archive 的检查中添加"alpha 在场时所有己方随从视为微型机"逻辑
3. **P3 - 文档补充**：在引擎文档中明确触发器执行顺序规则（注册顺序 vs 优先级）
