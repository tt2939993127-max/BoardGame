# 审查 11.1：克苏鲁之仆（Cthulhu）派系多步骤能力

> 审查日期：2026-02-14
> 权威描述来源：`public/locales/zh-CN/game-smashup.json`

## 审查汇总

| 指标 | 数值 |
|------|------|
| 总交互链数 | 14 |
| ✅ 通过 | 9 |
| ⚠️ 语义偏差 | 4 |
| ❌ 缺失实现 | 1 |
| 📝 测试缺失 | 10 |
| 通过率 | 64.3% |

## 严重问题清单

| 优先级 | 交互链 | 问题 | 维度 |
|--------|--------|------|------|
| P0 | cthulhu_recruit_by_force | 描述"将任意数量的"但实现自动全部放入，无玩家选择 | D5 |
| P1 | cthulhu_it_begins_again | 描述"任意数量的战术"但实现自动全部洗回，无玩家选择 | D5 |
| P1 | cthulhu_mi_go | 描述"每个其他玩家可以抽"暗示对手可选择，但实现自动给所有对手抽疯狂卡 | D5 |
| P1 | cthulhu_chosen | 描述"你可以抽一张疯狂卡"但实现自动抽取无跳过 | D5 |
| P2 | cthulhu_servitor | Prompt 标题说"牌库顶"但描述说"牌库顶"，handler 实现为放牌库顶（`[cardUid, ...deck]`）——与描述一致但注释说"牌库底" | D1 |

---

## 审查矩阵

### 交互链 1：cthulhu_star_spawn — 转移疯狂卡给对手（天赋）

**权威描述**：「天赋：将一张疯狂卡从你的手上放到另一个玩家的手上。」

| 层 | 状态 | 证据 |
|----|------|------|
| 定义层 | ✅ | 随从，talent |
| 注册层 | ✅ | `registerAbility('cthulhu_star_spawn', 'talent', cthulhuStarSpawn)` |
| 执行层 | ✅ | ① 手中无疯狂卡时静默返回 ✅。② 选第一张疯狂卡 ✅。③ Prompt 选择对手 ✅。④ handler：`returnMadnessCard` + `drawMadnessCards(target)` ✅ |
| 状态层 | ✅ | 正确处理 |
| UI 层 | ✅ | Prompt 选择对手 |
| i18n 层 | ✅ | 双语条目存在 |
| 测试层 | 📝 | 无专门行为测试 |

### 交互链 2：cthulhu_chosen — 基地计分前抽疯狂卡+2力量

**权威描述**：「特殊：在一个基地计分前，你可以抽一张疯狂卡。该随从获得+2力量直到回合结束。」

| 层 | 状态 | 证据 |
|----|------|------|
| 定义层 | ✅ | 随从，beforeScoring 触发 |
| 注册层 | ✅ | `registerTrigger('cthulhu_chosen', 'beforeScoring', cthulhuChosenBeforeScoring)` |
| 执行层 | ⚠️ | ① 找计分基地上的 chosen ✅。② 抽疯狂卡 + `addPowerCounter` +2 ✅。③ **"你可以"但无跳过选项**——描述说"你可以抽一张疯狂卡"暗示可选择不抽，但实现自动抽取（D5 交互完整性：缺少跳过选项） |
| 状态层 | ✅ | 正确处理 |
| UI 层 | ⚠️ | 缺少跳过选项 |
| i18n 层 | ✅ | 双语条目存在 |
| 测试层 | 📝 | 无专门行为测试 |

### 交互链 3：cthulhu_servitor — 消灭自身+弃牌堆行动卡放牌库顶（天赋）

**权威描述**：「天赋：消灭本卡并从你的弃牌堆中选择一张战术卡放到你牌库顶。」

| 层 | 状态 | 证据 |
|----|------|------|
| 定义层 | ✅ | 随从，talent |
| 注册层 | ✅ | `registerAbility('cthulhu_servitor', 'talent', cthulhuServitor)` |
| 执行层 | ✅ | ① 消灭自身 ✅。② 弃牌堆无行动卡时仍消灭 ✅。③ Prompt 选择行动卡 ✅。④ handler 放牌库顶 `[cardUid, ...deck]` ✅ |
| 状态层 | ✅ | 正确处理 |
| UI 层 | ✅ | Prompt 选择 |
| i18n 层 | ✅ | 双语条目存在 |
| 测试层 | 📝 | 无专门行为测试 |

### 交互链 4：cthulhu_altar — 打出随从时额外行动（持续触发）

**权威描述**：「打出到基地上。任何时候当你打出一个随从到这时，你在本回合可以额外打出一个战术。」

| 层 | 状态 | 证据 |
|----|------|------|
| 定义层 | ✅ | ongoing 行动卡 |
| 注册层 | ✅ | `registerTrigger('cthulhu_altar', 'onMinionPlayed', cthulhuAltarTrigger)` |
| 执行层 | ✅ | ① 检查基地上有 altar 且属于当前玩家 ✅。② `grantExtraAction` ✅ |
| 状态层 | ✅ | 正确处理 |
| UI 层 | N/A | 自动触发 |
| i18n 层 | ✅ | 双语条目存在 |
| 测试层 | 📝 | 无专门行为测试 |

### 交互链 5：cthulhu_recruit_by_force — 弃牌堆随从放牌库顶

**权威描述**：「将任意数量的力量为3或以下的随从从你的弃牌堆放到你的牌库顶。」

| 层 | 状态 | 证据 |
|----|------|------|
| 定义层 | ✅ | 行动卡 |
| 注册层 | ✅ | `registerAbility('cthulhu_recruit_by_force', 'onPlay', cthulhuRecruitByForce)` |
| 执行层 | ❌ | ① 过滤弃牌堆 `power <= 3` 随从 ✅。② **"任意数量"但自动全部放入**——描述"将任意数量的"暗示玩家可选择放几个，但实现自动将所有合格随从放入牌库顶，无选择交互（D5 交互完整性违规）。③ 通过 `DECK_RESHUFFLED` 实现放牌库顶 ✅ |
| 状态层 | ✅ | 正确处理 |
| UI 层 | ❌ | 缺少多选交互 |
| i18n 层 | ✅ | 双语条目存在 |
| 测试层 | 📝 | 无专门行为测试 |

### 交互链 6：cthulhu_complete_the_ritual — 回合开始清场换基地（持续触发）

**权威描述**：「打出到一个你至少拥有一个随从的基地上。在你的回合开始时，将所有在基地上的随从和战术放回其拥有者的牌库底并将该基地同基地牌库最顶部的卡交换。」

| 层 | 状态 | 证据 |
|----|------|------|
| 定义层 | ✅ | ongoing 行动卡 |
| 注册层 | ✅ | `registerTrigger('cthulhu_complete_the_ritual', 'onTurnStart', ...)` |
| 执行层 | ✅ | ① 找基地上的 ritual ✅。② 所有随从 `CARD_TO_DECK_BOTTOM` ✅。③ 所有 ongoing 行动卡（含自身）`CARD_TO_DECK_BOTTOM` ✅。④ `BASE_SCORED`（空排名清除基地）+ `BASE_REPLACED`（新基地）✅。⑤ 只处理第一个 ritual ✅ |
| 状态层 | ✅ | 正确处理 |
| UI 层 | N/A | 自动触发 |
| i18n 层 | ✅ | 双语条目存在 |
| 测试层 | 📝 | 无专门行为测试 |

### 交互链 7：cthulhu_furthering_the_cause — 回合结束条件VP（持续触发）

**权威描述**：「打出到基地上。持续：在每回合结束时如果其他玩家在这里的随从被消灭过，获得1VP。」

| 层 | 状态 | 证据 |
|----|------|------|
| 定义层 | ✅ | ongoing 行动卡 |
| 注册层 | ✅ | `registerTrigger('cthulhu_furthering_the_cause', 'onTurnEnd', ...)` |
| 执行层 | ✅ | ① 检查 `turnDestroyedMinions` 中有对手随从在此基地被消灭 ✅。② `VP_AWARDED` +1 ✅ |
| 状态层 | ✅ | 正确处理 |
| UI 层 | N/A | 自动触发 |
| i18n 层 | ✅ | 双语条目存在 |
| 测试层 | 📝 | 无专门行为测试 |

### 交互链 8：cthulhu_whispers_in_darkness — 疯狂卡+2额外行动

**权威描述**：「抽一张疯狂卡。你在本回合可以额外打出两个战术。」

| 层 | 状态 | 证据 |
|----|------|------|
| 定义层 | ✅ | 行动卡 |
| 注册层 | ✅ | `registerAbility('cthulhu_whispers_in_darkness', 'onPlay', ...)` |
| 执行层 | ✅ | ① `drawMadnessCards` 1张 ✅。② 两次 `grantExtraAction` ✅ |
| 状态层 | ✅ | 正确处理 |
| UI 层 | N/A | 自动效果 |
| i18n 层 | ✅ | 双语条目存在 |
| 测试层 | 📝 | 无专门行为测试 |

### 交互链 9：cthulhu_corruption — 疯狂卡+消灭随从

**权威描述**：「抽一张疯狂卡。消灭一个随从。」

| 层 | 状态 | 证据 |
|----|------|------|
| 定义层 | ✅ | 行动卡 |
| 注册层 | ✅ | `registerAbility('cthulhu_corruption', 'onPlay', cthulhuCorruption)` |
| 执行层 | ✅ | ① `drawMadnessCards` ✅。② 收集所有随从（含己方）✅——描述"消灭一个随从"无敌我限定。③ Prompt 选择 ✅ |
| 状态层 | ✅ | 正确处理 |
| UI 层 | ✅ | Prompt 选择 |
| i18n 层 | ✅ | 双语条目存在 |
| 测试层 | 📝 | 无专门行为测试 |

### 交互链 10：cthulhu_fhtagn — 搜索牌库行动卡

**权威描述**：「从你的牌库顶依次展示卡牌直到你展示出2张战术。将它们放进你的手中并将剩下的放到你的牌库底。」

| 层 | 状态 | 证据 |
|----|------|------|
| 定义层 | ✅ | 行动卡 |
| 注册层 | ✅ | `registerAbility('cthulhu_fhtagn', 'onPlay', cthulhuFhtagn)` |
| 执行层 | ✅ | ① 使用 `revealAndPickFromDeck` 工具函数 ✅。② `predicate: card.type === 'action'` ✅。③ `maxPick: 2` ✅。④ `revealTo: 'all'` 公开展示 ✅ |
| 状态层 | ✅ | 正确处理 |
| UI 层 | N/A | 自动效果 |
| i18n 层 | ✅ | 双语条目存在 |
| 测试层 | 📝 | 无专门行为测试 |

### 交互链 11：cthulhu_madness_unleashed — 弃疯狂卡换抽牌+额外行动

**权威描述**：「弃掉任意数量的疯狂卡。你每弃掉一张卡，你就可以抽一张卡并在本回合中额外打出一个战术。」

| 层 | 状态 | 证据 |
|----|------|------|
| 定义层 | ✅ | 行动卡 |
| 注册层 | ✅ | `registerAbility('cthulhu_madness_unleashed', 'onPlay', cthulhuMadnessUnleashed)` |
| 执行层 | ✅ | ① 过滤手中疯狂卡（排除自身）✅。② Prompt 多选 ✅。③ handler：每张返回疯狂牌堆 + 抽等量牌 + 等量额外行动 ✅ |
| 状态层 | ✅ | 正确处理 |
| UI 层 | ✅ | 多选 Prompt |
| i18n 层 | ✅ | 双语条目存在 |
| 测试层 | 📝 | 无专门行为测试 |

### 交互链 12：cthulhu_seal_is_broken — 疯狂卡+1VP

**权威描述**：「抽一张疯狂卡获得1VP。」

| 层 | 状态 | 证据 |
|----|------|------|
| 定义层 | ✅ | 行动卡 |
| 注册层 | ✅ | `registerAbility('cthulhu_seal_is_broken', 'onPlay', ...)` |
| 执行层 | ✅ | ① `drawMadnessCards` ✅。② `VP_AWARDED` +1 ✅ |
| 状态层 | ✅ | 正确处理 |
| UI 层 | N/A | 自动效果 |
| i18n 层 | ✅ | 双语条目存在 |
| 测试层 | 📝 | 无专门行为测试 |

### 交互链 13：cthulhu_it_begins_again — 弃牌堆行动卡洗回牌库

**权威描述**：「将你弃牌堆任意数量的战术洗回你的牌库。」

| 层 | 状态 | 证据 |
|----|------|------|
| 定义层 | ✅ | 行动卡 |
| 注册层 | ✅ | `registerAbility('cthulhu_it_begins_again', 'onPlay', ...)` |
| 执行层 | ⚠️ | ① 过滤弃牌堆行动卡 ✅。② **"任意数量"但自动全部洗回**——与 recruit_by_force 同样问题（D5 交互完整性）。③ 洗牌用 `ctx.random.shuffle` ✅ |
| 状态层 | ✅ | 正确处理 |
| UI 层 | ⚠️ | 缺少多选交互 |
| i18n 层 | ✅ | 双语条目存在 |
| 测试层 | 📝 | 无专门行为测试 |

### 交互链 14：special_madness — 疯狂卡二选一

**权威描述**：（疯狂卡通用规则）「抽两张卡或将本卡返回疯狂牌堆。」

| 层 | 状态 | 证据 |
|----|------|------|
| 定义层 | ✅ | 特殊卡 |
| 注册层 | ✅ | `registerAbility('special_madness', 'onPlay', madnessOnPlay)` |
| 执行层 | ✅ | ① 二选一 Prompt ✅。② 抽牌：`Math.min(2, deck.length)` ✅。③ 返回：`returnMadnessCard` ✅ |
| 状态层 | ✅ | 正确处理 |
| UI 层 | ✅ | 二选一 Prompt |
| i18n 层 | ✅ | 双语条目存在 |
| 测试层 | 📝 | 无专门行为测试 |

---

## 交叉影响备注

### "任意数量"系列缺少选择交互

`cthulhu_recruit_by_force` 和 `cthulhu_it_begins_again` 都有"任意数量"描述但自动全部执行。在 SmashUp 中，选择放回多少张可能影响策略（如不想把某些卡放回牌库顶/洗回）。

### cthulhu_mi_go 对手选择权

描述"每个其他玩家可以抽一张疯狂卡"中的"可以"暗示对手有选择权（抽或不抽），不抽的让你抽一张牌。但实现自动给所有对手抽疯狂卡，只在疯狂牌库空时才让你抽牌。这是 P1 语义偏差。
