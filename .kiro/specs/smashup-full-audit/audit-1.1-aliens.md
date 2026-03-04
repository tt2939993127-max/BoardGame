# 审查 1.1：外星人（Aliens）派系语义审计

> 审查日期：2026-02-15
> 权威描述来源：`public/locales/zh-CN/game-smashup.json`

## 审查汇总

| 指标 | 数值 |
|------|------|
| 总交互链数 | 12 |
| ✅ 通过 | 10 |
| ⚠️ 语义偏差 | 2 |
| ❌ 缺失实现 | 0 |
| 📝 测试缺失 | 8 |
| 通过率 | 83.3% |

## 严重问题清单

| 优先级 | 交互链 | 问题 | 反模式 |
|--------|--------|------|--------|
| P1 | alien_scout | ✅ 已修复 — afterScoring 链式交互确认是否回手 | — |
| P1 | alien_supreme_overlord | ✅ 已修复 — 添加跳过选项 | — |
| P1 | alien_collector | ✅ 已修复 — 添加跳过选项 | — |
| ⚠️ | alien_crop_circles | 描述"任意数量"已实现循环多选，但无法撤销已选随从 | #2 轻微 |
| ⚠️ | alien_jammed_signal | 描述"所有玩家无视此基地的能力"，实现通过 `registerBaseAbilitySuppression` 全局压制，但无 onPlay 附着到基地的显式流程 | 架构层面 |
| P3 | 全部 | 多数能力缺少行为测试 | #4 |

---

## 审查矩阵

### 交互链 1：alien_supreme_overlord — 返回随从到手牌（可选）

**权威描述**：「你可以将一个随从返回到其拥有者的手上。」

| 层 | 状态 | 证据 |
|----|------|------|
| 定义层 | ✅ | `data/factions/aliens.ts` — `abilityTags: ['onPlay']`, power: 5 |
| 注册层 | ✅ | `aliens.ts:31` — `registerAbility('alien_supreme_overlord', 'onPlay', alienSupremeOverlord)` |
| 执行层 | ✅ | 遍历所有基地所有随从（排除自身），构建选项列表。包含 `skip` 跳过选项，符合"你可以"语义。handler 检查 `isMinionProtected` |
| 状态层 | ✅ | `MINION_RETURNED` 事件，reduce 正确处理 |
| 验证层 | N/A | |
| UI 层 | ✅ | `createSimpleChoice` 含跳过选项 |
| i18n 层 | ✅ | zh-CN/en 均有条目 |
| 测试层 | 📝 | 仅注册覆盖审计，无行为测试 |

### 交互链 2：alien_invader — 获得1VP

**权威描述**：「获得1VP。」

| 层 | 状态 | 证据 |
|----|------|------|
| 定义层 | ✅ | `data/factions/aliens.ts` — `abilityTags: ['onPlay']`, power: 3 |
| 注册层 | ✅ | `aliens.ts:33` — `registerAbility('alien_invader', 'onPlay', alienInvader)` |
| 执行层 | ✅ | 直接发射 `VP_AWARDED { amount: 1 }` 事件，无交互需求 |
| 状态层 | ✅ | `VP_AWARDED` 被 reduce 处理 |
| 验证层 | N/A | |
| UI 层 | N/A | 无交互 |
| i18n 层 | ✅ | 双语条目存在 |
| 测试层 | 📝 | 无行为测试 |

### 交互链 3：alien_scout — 基地计分后回手（special，可选）

**权威描述**：「特殊：在这个基地计分后，你可以将此随从放回手牌而非弃牌堆。」

| 层 | 状态 | 证据 |
|----|------|------|
| 定义层 | ✅ | `data/factions/aliens.ts` — `abilityTags: ['special']`, power: 3 |
| 注册层 | ✅ | `aliens.ts:34` — `registerTrigger('alien_scout', 'afterScoring', alienScoutAfterScoring)` |
| 执行层 | ✅ | 链式处理多个侦察兵，每个创建"返回手牌/留在基地"二选一交互。无 matchState 时回退自动回手 |
| 状态层 | ✅ | `MINION_RETURNED` 被 reduce 处理 |
| 验证层 | N/A | |
| UI 层 | ✅ | `createSimpleChoice` 含"返回手牌"/"留在基地"选项 |
| i18n 层 | ✅ | 双语条目存在 |
| 测试层 | 📝 | 无行为测试 |

### 交互链 4：alien_collector — 返回力量≤3随从（可选）

**权威描述**：「你可以将这个基地的一个力量为3或以下的随从返回其拥有者的手上。」

| 层 | 状态 | 证据 |
|----|------|------|
| 定义层 | ✅ | `data/factions/aliens.ts` — `abilityTags: ['onPlay']`, power: 2 |
| 注册层 | ✅ | `aliens.ts:32` — `registerAbility('alien_collector', 'onPlay', alienCollector)` |
| 执行层 | ✅ | 过滤本基地 `getMinionPower <= 3`，包含 `skip` 跳过选项。handler 检查 `isMinionProtected` |
| 状态层 | ✅ | `MINION_RETURNED` 被 reduce 处理 |
| 验证层 | N/A | |
| UI 层 | ✅ | `createSimpleChoice` 含跳过选项 |
| i18n 层 | ✅ | 双语条目存在 |
| 测试层 | 📝 | 无行为测试 |

### 交互链 5：alien_invasion — 移动随从到另一基地

**权威描述**：「将一个随从移动到另一个基地。」

| 层 | 状态 | 证据 |
|----|------|------|
| 定义层 | ✅ | 标准行动卡 |
| 注册层 | ✅ | `aliens.ts:36` — `registerAbility('alien_invasion', 'onPlay', alienInvasion)` |
| 执行层 | ✅ | 两步链：选随从→选目标基地→`moveMinion`。描述无敌我限定，实现遍历所有随从，正确 |
| 状态层 | ✅ | `MINION_MOVED` 被 reduce 处理 |
| 验证层 | N/A | |
| UI 层 | ✅ | 两步 `createSimpleChoice` |
| i18n 层 | ✅ | 双语条目存在 |
| 测试层 | 📝 | 无行为测试 |

### 交互链 6：alien_disintegrator — 力量≤3随从放牌库底

**权威描述**：「将一个力量为3或以下的随从放到它的拥有者的牌库底。」

| 层 | 状态 | 证据 |
|----|------|------|
| 定义层 | ✅ | 标准行动卡 |
| 注册层 | ✅ | `aliens.ts:37` — `registerAbility('alien_disintegrator', 'onPlay', alienDisintegrator)` |
| 执行层 | ✅ | 遍历所有基地过滤 `getMinionPower <= 3`，handler 发射 `CARD_TO_DECK_BOTTOM`。描述无敌我限定，实现无限定，正确 |
| 状态层 | ✅ | `CARD_TO_DECK_BOTTOM` 被 reduce 处理 |
| 验证层 | N/A | |
| UI 层 | ✅ | `createSimpleChoice` |
| i18n 层 | ✅ | 双语条目存在 |
| 测试层 | 📝 | 无行为测试 |

### 交互链 7：alien_beam_up — 返回随从到手牌

**权威描述**：「将一个随从返回其拥有者的手上。」

| 层 | 状态 | 证据 |
|----|------|------|
| 定义层 | ✅ | 标准行动卡 |
| 注册层 | ✅ | `aliens.ts:38` — `registerAbility('alien_beam_up', 'onPlay', alienBeamUp)` |
| 执行层 | ✅ | 遍历所有基地所有随从，handler 检查 `isMinionProtected`，发射 `MINION_RETURNED` |
| 状态层 | ✅ | `MINION_RETURNED` 被 reduce 处理 |
| 验证层 | N/A | |
| UI 层 | ✅ | `createSimpleChoice` |
| i18n 层 | ✅ | 双语条目存在 |
| 测试层 | 📝 | 无行为测试 |

### 交互链 8：alien_crop_circles — 任意数量随从返回手牌

**权威描述**：「将任意数量的随从从一个基地中返回到其拥有者的手牌中。」

| 层 | 状态 | 证据 |
|----|------|------|
| 定义层 | ✅ | 标准行动卡 |
| 注册层 | ✅ | `aliens.ts:39` — `registerAbility('alien_crop_circles', 'onPlay', alienCropCircles)` |
| 执行层 | ✅ | 两步链：选基地→循环多选随从（done 完成）→批量 `MINION_RETURNED`。`buildCropCirclesReturnEvents` 检查 `isMinionProtected` |
| 状态层 | ✅ | `MINION_RETURNED` 被 reduce 处理 |
| 验证层 | N/A | |
| UI 层 | ⚠️ | 循环多选已实现，但无法撤销已选随从（轻微偏差，不影响正确性） |
| i18n 层 | ✅ | 双语条目存在 |
| 测试层 | 📝 | 无行为测试 |

### 交互链 9：alien_probe — 查看手牌+牌库顶放置

**权威描述**：「查看一个玩家的手牌。查看该玩家牌库顶的一张牌，将其放回牌库顶或放到牌库底。」

| 层 | 状态 | 证据 |
|----|------|------|
| 定义层 | ✅ | 标准行动卡 |
| 注册层 | ✅ | `aliens.ts:40` — `registerAbility('alien_probe', 'onPlay', alienProbe)` |
| 执行层 | ✅ | 使用 `resolveOrPrompt` 选择目标玩家（单对手自动执行）。展示手牌（`revealHand`），牌库顶卡名显示在 Prompt 标题中，选择放回顶部/底部。handler 正确处理 `CARD_TO_DECK_BOTTOM` |
| 状态层 | ✅ | `HAND_REVEALED` + `CARD_TO_DECK_BOTTOM` 被 reduce 处理 |
| 验证层 | N/A | |
| UI 层 | ✅ | 多步 `createSimpleChoice` |
| i18n 层 | ✅ | 双语条目存在 |
| 测试层 | ✅ | 有基本测试 |

### 交互链 10：alien_terraform — 替换基地+额外随从

**权威描述**：「从基地牌库搜寻一张基地。将它与场上一张基地交换（弃掉上面所有行动卡）。洗混基地牌库。你可以在新基地上额外打出一个随从。」

| 层 | 状态 | 证据 |
|----|------|------|
| 定义层 | ✅ | 标准行动卡 |
| 注册层 | ✅ | `aliens.ts:41` — `registerAbility('alien_terraform', 'onPlay', alienTerraform)` |
| 执行层 | ✅ | 三步链：选被替换基地→从基地牌库选新基地→可选打出手牌随从。先分离 ongoing 行动卡，发射 `BASE_REPLACED` + `shuffleBaseDeck`。额外随从通过 `grantExtraMinion` + `MINION_PLAYED` 原子发放。"你可以"有 skip 选项 |
| 状态层 | ✅ | `ONGOING_DETACHED` + `BASE_REPLACED` + `BASE_DECK_SHUFFLED` + `MINION_PLAYED` 被 reduce 处理 |
| 验证层 | N/A | |
| UI 层 | ✅ | 三步 `createSimpleChoice`，含跳过选项 |
| i18n 层 | ✅ | 双语条目存在 |
| 测试层 | 📝 | 无行为测试 |

### 交互链 11：alien_abduction — 返回随从+额外出随从

**权威描述**：「将一个随从返回其拥有者的手上。额外打出一个随从。」

| 层 | 状态 | 证据 |
|----|------|------|
| 定义层 | ✅ | 标准行动卡 |
| 注册层 | ✅ | `aliens.ts:42` — `registerAbility('alien_abduction', 'onPlay', alienAbduction)` |
| 执行层 | ✅ | 选择随从返回手牌，handler 检查 `isMinionProtected`（被保护时跳过返回但仍给额外随从额度）。`grantExtraMinion` 无条件发放，正确 |
| 状态层 | ✅ | `MINION_RETURNED` + `LIMIT_MODIFIED` 被 reduce 处理 |
| 验证层 | N/A | |
| UI 层 | ✅ | `createSimpleChoice` |
| i18n 层 | ✅ | 双语条目存在 |
| 测试层 | 📝 | 无行为测试 |

### 交互链 12：alien_jammed_signal — 无视基地能力（ongoing）

**权威描述**：「打出到基地上。持续：所有玩家无视此基地的能力。」

| 层 | 状态 | 证据 |
|----|------|------|
| 定义层 | ✅ | `data/factions/aliens.ts` — `subtype: 'ongoing'`, `ongoingTarget: 'base'` |
| 注册层 | ✅ | `aliens.ts:44` — `registerBaseAbilitySuppression('alien_jammed_signal', () => true)` |
| 执行层 | ⚠️ | 通过 `registerBaseAbilitySuppression` 全局压制基地能力，回调 `() => true` 表示无条件压制。实现正确但依赖框架层自动附着 ongoing 到基地的流程 |
| 状态层 | ✅ | ongoing 附着/分离通过框架层处理 |
| 验证层 | N/A | |
| UI 层 | N/A | 无交互 |
| i18n 层 | ✅ | 双语条目存在 |
| 测试层 | 📝 | 无行为测试 |
