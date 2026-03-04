# D5 交互语义完整性审计报告

> 审计范围：SmashUp 基础版 8 派系 + 扩展派系全部 `createSimpleChoice` / `grantExtraMinion` / `grantExtraAction` 调用
> 审计日期：2026-02-27

---

## 6.1 multi 配置与描述语义比对

### 审计方法
grep 所有 `abilities/*.ts` 中的 `multi:` 配置，提取对应卡牌描述中的数量限定词，逐个比对。

### 审计结果

| 卡牌 | 描述语义 | multi 配置 | 结果 |
|------|----------|-----------|------|
| `robot_microbot_reclaimer` | "any number of microbots" | `{ min: 0, max: microbotsInDiscard.length }` | ✅ |
| `cthulhu_recruit_by_force` | "any number" (放到牌库顶) | `{ min: 0, max: eligibleMinions.length }` | ✅ |
| `cthulhu_it_begins_again` | "any number" (洗回牌库) | `{ min: 0, max: actionsInDiscard.length }` | ✅ |
| `cthulhu_madness_unleashed` | "any number" (弃疯狂卡) | `{ min: 0, max: madnessInHand.length }` | ✅ |
| `giant_ant_claim_the_prize` | "up to 3 minions" | `{ min: 0, max: Math.min(3, options.length) }` | ✅ |
| `ghost_spirit_discard` | "discard [power] cards" (弃等量力量手牌) | `{ min: 0, max: power }` | ✅ |
| `zombie_lend_a_hand` | "any number" (洗回牌库) | 位置参数第7个 `{ min: 0, max: player.discard.length }` | ✅ |

### 无 multi 但描述为"选择一个"的卡牌（单选，默认行为正确）

所有未声明 `multi` 的 `createSimpleChoice` 调用默认为单选，与"选择一个"/"choose a"描述语义一致。抽查确认无误。

### 替代多选模式（非 multi 实现）

| 卡牌 | 描述语义 | 实现方式 | 结果 |
|------|----------|---------|------|
| `pirate_full_sail` | "move any number" | 循环+done 按钮逐个移动 | ✅ 语义正确 |
| `zombie_not_enough_bullets` | "same name from discard" | group-by-name 单选名称 | ✅ 语义正确 |
| `zombie_mall_crawl` | "same name from discard" | group-by-name 单选名称 | ✅ 语义正确 |

### 6.1 结论：✅ 全部通过，无 multi 配置与描述不一致的情况。

---

## 6.2 grantExtraMinion/grantExtraAction 约束条件审计

### 审计方法
grep 所有 `grantExtraMinion`/`grantExtraAction` 调用，提取 payload 约束（`sameNameOnly`/`restrictToBase`/`powerMax`），与卡牌描述比对。

### 有约束条件的调用

| 卡牌 | 描述约束 | 代码约束 | 结果 |
|------|----------|---------|------|
| `robot_zapbot` | "power 2 or less" | `{ powerMax: 2 }` | ✅ |
| `killer_plant_blossom` | "same name" x3 | `{ sameNameOnly: true }` x3 | ✅ |
| `innsmouth_sacred_circle` | "same name as a minion here" + "here" | `{ sameNameOnly: true }` + `restrictToBase: sacredBaseIndex` | ✅ |
| `innsmouth_spreading_the_word` | "same name as a minion in play" x2 | `{ sameNameOnly: true, sameNameDefId }` x grantCount | ✅ |
| `base_secret_garden` | "power 2 or less" + "here" | `restrictToBase: ctx.baseIndex`（powerMax 通过 BaseCardDef.restrictions 数据驱动） | ✅ |
| `base_fairy_ring` | "extra minion here" + "extra action" | `restrictToBase: ctx.baseIndex` + `grantExtraAction` | ✅ |
| `miskatonic_lost_knowledge` | "extra minion here" (ongoing 所在基地) | `restrictToBase: ctx.baseIndex` | ✅ |

### 无约束条件的调用（描述也无约束）

| 卡牌 | 描述 | 代码 | 结果 |
|------|------|------|------|
| `wizard_summon` | "Play an extra minion" | `grantExtraMinion(无约束)` | ✅ |
| `wizard_chronomage` | "extra action this turn" | `grantExtraAction(无约束)` | ✅ |
| `wizard_time_loop` | "two extra actions" | `grantExtraAction` x2 | ✅ |
| `wizard_winds_of_change` | "extra action" | `grantExtraAction(无约束)` | ✅ |
| `killer_plant_insta_grow` | "Play an extra minion" | `grantExtraMinion(无约束)` | ✅ |
| `ghost_ghostly_arrival` | "extra minion and/or extra action" | `grantExtraMinion` + `grantExtraAction` | ✅ |
| `robot_microbot_fixer` | "extra minion" (首次打出) | `grantExtraMinion(无约束)` | ✅ |
| `robot_microbot_reclaimer` | "extra minion" (首次打出) | `grantExtraMinion(无约束)` | ✅ |
| `robot_hoverbot` | "play it as extra minion" (牌库顶) | `grantExtraMinion(无约束)` | ✅ |
| `zombie_outbreak` | "extra minion on a base where you have no minions" | `grantExtraMinion(无约束)` — 基地限制通过交互选择实现 | ✅ |
| `zombie_they_keep_coming` | "extra minion from discard" | `grantExtraMinion(无约束)` — 来源限制通过交互选择实现 | ✅ |
| `miskatonic_professor` | "extra action and/or extra minion" | `grantExtraAction` + `grantExtraMinion` | ✅ |
| `innsmouth_recruitment` | "for each card drawn, play an extra minion" | `grantExtraMinion` x actualDrawn | ✅ |
| `frankenstein_the_monster` | "extra minion" (移除指示物) | `grantExtraMinion(无约束)` | ✅ |
| `frankenstein_its_alive` | "extra minion" | `grantExtraMinion(无约束)` | ✅ |
| `bear_cavalry_commission` | "Play an extra minion" | `grantExtraMinion(无约束)` — 通过交互选择手牌 | ✅ |
| `werewolf_leader_of_the_pack` | "extra action" (力量最高时) | `grantExtraAction(无约束)` | ✅ |
| `steampunk_change_of_venue` | "Play it as an extra action" | `grantExtraAction(无约束)` | ✅ |
| `elder_thing_touch_of_madness` | "extra action" | `grantExtraAction(无约束)` | ✅ |
| `killer_plant_sprout` | "play it here as extra minion" (搜索牌库) | `grantExtraMinion(无约束)` — 基地限制通过 MINION_PLAYED 事件指定 | ✅ |
| `killer_plant_venus_man_trap` | "play it here as extra minion" (搜索牌库) | `grantExtraMinion(无约束)` — 同上 | ✅ |
| `ghost_the_dead_rise` | "extra minion from discard" | `grantExtraMinion(无约束)` — 来源限制通过交互选择实现 | ✅ |

### 6.2 结论：✅ 全部通过。所有约束条件与描述一致。

---

## 6.3 授予额度语义 vs createSimpleChoice 弹窗误用审计

### 审计方法
检查描述为"额外打出"语义的能力，是否误用 `createSimpleChoice` 弹窗代替 `grantExtra*` 额度授予。

### 审计结果

所有"额外打出"语义的能力均正确使用 `grantExtraMinion`/`grantExtraAction` 授予额度。
部分能力在授予额度的同时使用 `createSimpleChoice` 进行目标选择（如 `bear_cavalry_commission` 选手牌随从、`zombie_outbreak` 选基地），这是正确的组合模式——额度授予 + 交互选择并行。

**无误用情况。**

### 6.3 结论：✅ 全部通过。

---

## 6.4 targetType 声明与非目标选项 UI 可达性审计

### 审计方法
grep 所有声明了 `targetType` 的 `createSimpleChoice` 调用，检查是否包含 skip/done/cancel 等非目标选项，以及这些选项在 Board.tsx 的 targetType 渲染模式下是否可达。

### 审计结果

#### targetType: 'minion' 的调用（含 skip/cancel 选项）

| 卡牌 | targetType | 非目标选项 | 可达性 | 结果 |
|------|-----------|-----------|--------|------|
| `robot_microbot_guard` | minion | 无 skip | N/A — 强制选择 | ✅ |
| `wizard_sacrifice` | minion | `autoCancelOption: true` | 通过 autoCancelOption 机制渲染取消按钮 | ✅ |
| `werewolf_chew_toy` | minion | 通过 `resolveOrPrompt` 自动处理 | ✅ |
| `werewolf_chew_toy_target` | minion | 无 skip | 强制选择 | ✅ |
| `werewolf_let_the_dog_out` | minion | 无 skip | 强制选择 | ✅ |
| `werewolf_let_the_dog_out_targets` | minion | 无 skip | 强制选择 | ✅ |
| `vampire_heavy_drinker` | minion | 通过 `resolveOrPrompt` | ✅ |
| `vampire_nightstalker` | minion | 通过 `resolveOrPrompt` | ✅ |
| `vampire_dinner_date` | minion | 通过 `resolveOrPrompt` | ✅ |
| `vampire_dinner_date_target` | minion | 无 skip | 强制选择 | ✅ |
| `vampire_big_gulp` | minion | 通过 `resolveOrPrompt` | ✅ |
| `vampire_cull_the_weak` | minion | 通过 `resolveOrPrompt` | ✅ |
| `steampunk_change_of_venue_target` | minion | 无 skip | 强制选择 | ✅ |
| `base_cat_fanciers_alley` | minion | skip 选项 | Board.tsx 的 PromptOverlay 渲染 skip 按钮 | ✅ |

#### targetType: 'base' 的调用

| 卡牌 | targetType | 非目标选项 | 可达性 | 结果 |
|------|-----------|-----------|--------|------|
| `zombie_outbreak_choose_base` | base | 无 skip | 强制选择 | ✅ |
| `zombie_they_keep_coming_choose_base` | base | 无 skip | 强制选择 | ✅ |
| `robot_tech_center` | base | `autoCancelOption: true` | 通过 autoCancelOption 渲染 | ✅ |
| `steampunk_captain_ahab` | base | 通过 `resolveOrPrompt` | ✅ |
| `steampunk_mechanic_target` | base | 无 skip | 强制选择 | ✅ |
| `steampunk_change_of_venue_target` | base | 无 skip | 强制选择 | ✅ |
| `vampire_crack_of_dusk_base` | base | 无 skip | 强制选择 | ✅ |
| `bear_cavalry_commission_choose_base` | base | 无 skip | 强制选择 | ✅ |
| `bear_cavalry_commission_move_dest` | base | 无 skip | 强制选择 | ✅ |

#### targetType: 'hand' 的调用

| 卡牌 | targetType | 非目标选项 | 可达性 | 结果 |
|------|-----------|-----------|--------|------|
| `zombie_outbreak_choose_minion` | hand | 无 skip | 强制选择 | ✅ |
| `bear_cavalry_commission_choose_minion` | hand | 无 skip | 强制选择 | ✅ |
| `ghost_spirit_discard` | hand | skip 选项（multi min:0） | 通过 multi 的 done 按钮可达 | ✅ |
| `vampire_cull_the_weak_choose_card` | hand | 无 skip | 强制选择 | ✅ |

#### targetType: 'ongoing' 的调用

| 卡牌 | targetType | 非目标选项 | 可达性 | 结果 |
|------|-----------|-----------|--------|------|
| `trickster_disenchant` | ongoing | 无 skip | 强制选择 | ✅ |
| `steampunk_change_of_venue` | ongoing | 无 skip | 强制选择 | ✅ |

#### targetType: 'generic' / 'discard_minion' 的调用

| 卡牌 | targetType | 非目标选项 | 可达性 | 结果 |
|------|-----------|-----------|--------|------|
| `steampunk_zeppelin` | generic | 无 skip | 强制选择 | ✅ |
| `vampire_crack_of_dusk` | generic | 通过 `resolveOrPrompt` | ✅ |
| `zombie_lord` | discard_minion | 无 skip | 强制选择 | ✅ |

### 6.4 结论：✅ 全部通过。所有 targetType 声明的交互中，非目标选项（skip/cancel/done）均可通过 autoCancelOption、resolveOrPrompt、multi done 按钮或 PromptOverlay skip 按钮正确到达。

---

## 6.5 跨派系同类交互模式一致性审计

### 审计方法
按交互模式分组，比对不同派系中同类型交互的 `targetType`/`displayMode`/停止按钮 value key 一致性。

### 审计结果

#### 模式 A："选择场上随从"（targetType: 'minion'）

| 派系 | 卡牌 | targetType | skip 机制 | 一致性 |
|------|------|-----------|----------|--------|
| 机器人 | `robot_microbot_guard` | minion | 无（强制） | ✅ |
| 巫师 | `wizard_sacrifice` | minion | autoCancelOption | ✅ |
| 狼人 | `werewolf_chew_toy` | minion | resolveOrPrompt | ✅ |
| 吸血鬼 | `vampire_heavy_drinker` | minion | resolveOrPrompt | ✅ |
| 吸血鬼 | `vampire_big_gulp` | minion | resolveOrPrompt | ✅ |
| 蒸汽朋克 | `steampunk_change_of_venue_target` | minion | 无（强制） | ✅ |
| 熊骑兵 | `bear_cavalry_commission_move_minion` | minion | 无（强制） | ✅ |

**一致性评估**：所有"选择场上随从"交互统一使用 `targetType: 'minion'`。可选操作通过 `resolveOrPrompt` 或 `autoCancelOption` 提供跳过，强制操作无 skip。✅ 一致。

#### 模式 B："选择基地"（targetType: 'base'）

| 派系 | 卡牌 | targetType | 一致性 |
|------|------|-----------|--------|
| 丧尸 | `zombie_outbreak_choose_base` | base | ✅ |
| 丧尸 | `zombie_they_keep_coming_choose_base` | base | ✅ |
| 机器人 | `robot_tech_center` | base | ✅ |
| 蒸汽朋克 | `steampunk_captain_ahab` | base | ✅ |
| 吸血鬼 | `vampire_crack_of_dusk_base` | base | ✅ |
| 熊骑兵 | `bear_cavalry_commission_choose_base` | base | ✅ |

**一致性评估**：✅ 全部统一使用 `targetType: 'base'`。

#### 模式 C："选择手牌"（targetType: 'hand'）

| 派系 | 卡牌 | targetType | 一致性 |
|------|------|-----------|--------|
| 丧尸 | `zombie_outbreak_choose_minion` | hand | ✅ |
| 熊骑兵 | `bear_cavalry_commission_choose_minion` | hand | ✅ |
| 幽灵 | `ghost_spirit_discard` | hand | ✅ |
| 吸血鬼 | `vampire_cull_the_weak_choose_card` | hand | ✅ |

**一致性评估**：✅ 全部统一使用 `targetType: 'hand'`。

#### 模式 D："多选+done 按钮"（multi 配置）

| 派系 | 卡牌 | skip value key | 一致性 |
|------|------|---------------|--------|
| 机器人 | `robot_microbot_reclaimer` | `{ skip: true }` (在 options 中) | ✅ |
| 克苏鲁 | `cthulhu_recruit_by_force` | `{ skip: true }` | ✅ |
| 克苏鲁 | `cthulhu_it_begins_again` | `{ skip: true }` | ✅ |
| 克苏鲁 | `cthulhu_madness_unleashed` | `{ skip: true }` | ✅ |
| 巨蚁 | `giant_ant_claim_the_prize` | multi min:0 自动 done | ✅ |
| 幽灵 | `ghost_spirit_discard` | multi min:0 + skip 选项 | ✅ |

**一致性评估**：✅ 多选模式统一使用 `multi: { min: 0, max: N }` + skip/done 选项。

### 6.5 结论：✅ 跨派系同类交互模式高度一致，无不合理差异。

---

## 总结

| 子任务 | 维度 | 结果 | 发现数 |
|--------|------|------|--------|
| 6.1 | multi 配置 vs 描述语义 | ✅ 全部通过 | 0 |
| 6.2 | grantExtra* 约束条件 vs 描述 | ✅ 全部通过 | 0 |
| 6.3 | 授予额度语义误用检查 | ✅ 无误用 | 0 |
| 6.4 | targetType + 非目标选项可达性 | ✅ 全部通过 | 0 |
| 6.5 | 跨派系交互模式一致性 | ✅ 高度一致 | 0 |

**D5 交互语义完整性审计结论：✅ 全部通过，未发现缺陷。**
