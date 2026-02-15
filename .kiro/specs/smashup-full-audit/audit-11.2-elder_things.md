# 审查 11.2：远古之物（Elder Things）派系多步骤能力

> 审查日期：2026-02-14
> 权威描述来源：`public/locales/zh-CN/game-smashup.json`

## 审查汇总

| 指标 | 数值 |
|------|------|
| 总交互链数 | 11 |
| ✅ 通过 | 7 |
| ⚠️ 语义偏差 | 3 |
| ❌ 缺失实现 | 1 |
| 📝 测试缺失 | 8 |
| 通过率 | 63.6% |

## 严重问题清单

| 优先级 | 交互链 | 问题 | 维度 |
|--------|--------|------|------|
| P0 | elder_thing_shoggoth | 描述"你只能将这张卡打到你至少拥有6点力量的基地"前置条件未实现 | D2 |
| P1 | elder_thing_mi_go | 描述"每个其他玩家可以抽"暗示对手可选择，但实现自动给所有对手抽疯狂卡 | D5 |
| P1 | elder_thing_elder_thing | 选择"消灭两个随从"时自动选前两个，无玩家选择交互 | D5 |
| P1 | elder_thing_dunwich_horror | 描述"+5力量"但无力量修正注册 | D2 |

---

## 审查矩阵

### 交互链 1：elder_thing_elder_thing — 二选一+保护（onPlay+持续）

**权威描述**：「消灭两个你的其他的随从或将这个随从放到你的牌库底，这个随从不受对手卡牌的影响。」

| 层 | 状态 | 证据 |
|----|------|------|
| 定义层 | ✅ | 随从，onPlay + ongoing 保护 |
| 注册层 | ✅ | `registerAbility('elder_thing_elder_thing', 'onPlay', ...)` + `registerProtection('elder_thing_elder_thing', 'destroy'/'move', ...)` |
| 执行层 | ⚠️ | ① 己方其他随从 < 2 时自动放牌库底 ✅。② ≥ 2 时二选一 Prompt ✅。③ **选择"消灭"时 handler 自动选前两个随从**——描述"消灭两个你的其他的随从"暗示玩家可选择消灭哪两个，但 handler 用 `myMinions.slice(0, 2)` 自动选前两个（D5 交互完整性：缺少选择交互）。④ 保护检查：只保护 elder_thing 自身 + 只拦截对手 ✅ |
| 状态层 | ✅ | 正确处理 |
| UI 层 | ⚠️ | 缺少消灭目标选择 |
| i18n 层 | ✅ | 双语条目存在 |
| 测试层 | 📝 | 无专门行为测试 |

### 交互链 2：elder_thing_shoggoth — 对手选择抽疯狂卡或被消灭随从

**权威描述**：「你只能将这张卡打到你至少拥有6点力量的基地。每位其他玩家可以抽一张疯狂卡。消灭每个没这样做的玩家在这个基地的一个随从。」

| 层 | 状态 | 证据 |
|----|------|------|
| 定义层 | ✅ | 随从，onPlay |
| 注册层 | ✅ | `registerAbility('elder_thing_shoggoth', 'onPlay', elderThingShoggoth)` |
| 执行层 | ❌ | ① **"你只能将这张卡打到你至少拥有6点力量的基地"前置条件未实现**——函数无力量检查，任何基地都可打出（D2 边界完整违规）。② 链式对手选择 Prompt ✅。③ 选择"拒绝"时消灭该对手在此基地最弱随从 ✅。④ 多对手链式处理 ✅ |
| 状态层 | ✅ | 正确处理 |
| UI 层 | ✅ | 链式二选一 Prompt |
| i18n 层 | ✅ | 双语条目存在 |
| 测试层 | 📝 | 无专门行为测试 |

### 交互链 3：elder_thing_mi_go — 对手抽疯狂卡或你抽牌

**权威描述**：「每个其他玩家可以抽一张疯狂卡。每个不这样做的玩家，都能让你抽一张卡。」

| 层 | 状态 | 证据 |
|----|------|------|
| 定义层 | ✅ | 随从，onPlay |
| 注册层 | ✅ | `registerAbility('elder_thing_mi_go', 'onPlay', elderThingMiGo)` |
| 执行层 | ⚠️ | ① **"可以"暗示对手有选择权**，但实现自动给所有对手抽疯狂卡，只在疯狂牌库空时才让你抽牌（D5 交互完整性：缺少对手选择交互）。② 疯狂牌库空时回退到你抽牌 ✅ |
| 状态层 | ✅ | 正确处理 |
| UI 层 | ⚠️ | 缺少对手选择交互 |
| i18n 层 | ✅ | 双语条目存在 |
| 测试层 | 📝 | 无专门行为测试 |

### 交互链 4：elder_thing_byakhee — 条件抽疯狂卡

**权威描述**：「如果其他玩家有随从在这个基地抽一张疯狂卡。」

| 层 | 状态 | 证据 |
|----|------|------|
| 定义层 | ✅ | 随从，onPlay |
| 注册层 | ✅ | `registerAbility('elder_thing_byakhee', 'onPlay', elderThingByakhee)` |
| 执行层 | ✅ | ① 检查基地上有对手随从 ✅。② 排除自身 ✅。③ `drawMadnessCards` 1张 ✅ |
| 状态层 | ✅ | 正确处理 |
| UI 层 | N/A | 自动效果 |
| i18n 层 | ✅ | 双语条目存在 |
| 测试层 | 📝 | 无专门行为测试 |

### 交互链 5：elder_thing_insanity — 对手抽两张疯狂卡

**权威描述**：「其他玩家抽两张疯狂卡。」

| 层 | 状态 | 证据 |
|----|------|------|
| 定义层 | ✅ | 行动卡 |
| 注册层 | ✅ | `registerAbility('elder_thing_insanity', 'onPlay', ...)` |
| 执行层 | ✅ | ① 遍历所有对手 ✅。② `drawMadnessCards(pid, 2)` ✅ |
| 状态层 | ✅ | 正确处理 |
| UI 层 | N/A | 自动效果 |
| i18n 层 | ✅ | 双语条目存在 |
| 测试层 | 📝 | 无专门行为测试 |

### 交互链 6：elder_thing_touch_of_madness — 对手疯狂卡+你抽牌+额外行动

**权威描述**：「每个其他玩家抽一张疯狂卡。你抽一张卡并且本回合额外打出一张战术。」

| 层 | 状态 | 证据 |
|----|------|------|
| 定义层 | ✅ | 行动卡 |
| 注册层 | ✅ | `registerAbility('elder_thing_touch_of_madness', 'onPlay', ...)` |
| 执行层 | ✅ | ① 对手各抽1疯狂卡 ✅。② 你抽1牌 ✅。③ `grantExtraAction` ✅ |
| 状态层 | ✅ | 正确处理 |
| UI 层 | N/A | 自动效果 |
| i18n 层 | ✅ | 双语条目存在 |
| 测试层 | 📝 | 无专门行为测试 |

### 交互链 7：elder_thing_power_of_madness — 对手展示手牌+弃疯狂卡+洗牌库

**权威描述**：「所有其他玩家展示他们的手牌，弃掉所有疯狂卡并且将他们的弃牌堆洗回他们的牌库。」

| 层 | 状态 | 证据 |
|----|------|------|
| 定义层 | ✅ | 行动卡 |
| 注册层 | ✅ | `registerAbility('elder_thing_power_of_madness', 'onPlay', ...)` |
| 执行层 | ✅ | ① 合并展示所有对手手牌（避免多人覆盖）✅。② 弃掉疯狂卡 `CARDS_DISCARDED` ✅。③ 洗弃牌堆回牌库 `DECK_RESHUFFLED` ✅ |
| 状态层 | ✅ | 正确处理 |
| UI 层 | ✅ | 展示手牌 |
| i18n 层 | ✅ | 双语条目存在 |
| 测试层 | 📝 | 无专门行为测试 |

### 交互链 8：elder_thing_spreading_horror — 对手随机弃牌

**权威描述**：「每位其他玩家随机弃牌直到弃出一张非疯狂卡。」

| 层 | 状态 | 证据 |
|----|------|------|
| 定义层 | ✅ | 行动卡 |
| 注册层 | ✅ | `registerAbility('elder_thing_spreading_horror', 'onPlay', ...)` |
| 执行层 | ✅ | ① 随机排列手牌 `ctx.random.shuffle` ✅。② 依次弃牌直到弃出非疯狂卡 ✅。③ 空手牌跳过 ✅ |
| 状态层 | ✅ | 正确处理 |
| UI 层 | N/A | 自动效果 |
| i18n 层 | ✅ | 双语条目存在 |
| 测试层 | 📝 | 无专门行为测试 |

### 交互链 9：elder_thing_begin_the_summoning — 弃牌堆随从放牌库顶+额外行动

**权威描述**：「将你的弃牌堆中的一个随从放到你的牌库顶。这回合你可以额外打出一张战术。」

| 层 | 状态 | 证据 |
|----|------|------|
| 定义层 | ✅ | 行动卡 |
| 注册层 | ✅ | `registerAbility('elder_thing_begin_the_summoning', 'onPlay', ...)` |
| 执行层 | ✅ | ① 弃牌堆无随从时仍给额外行动 ✅。② Prompt 选择随从 ✅。③ handler 放牌库顶 `[cardUid, ...deck]` + `grantExtraAction` ✅ |
| 状态层 | ✅ | 正确处理 |
| UI 层 | ✅ | Prompt 选择 |
| i18n 层 | ✅ | 双语条目存在 |
| 测试层 | 📝 | 无专门行为测试 |

### 交互链 10：elder_thing_the_price_of_power — 计分前按疯狂卡数加力量（special）

**权威描述**：「特殊：在一个基地计分前，所有有随从在这里的其他玩家展示他们的手牌。每展示出一张疯狂卡，你在这里的一个随从就获得+2力量。」

| 层 | 状态 | 证据 |
|----|------|------|
| 定义层 | ✅ | 行动卡，special |
| 注册层 | ✅ | `registerAbility('elder_thing_the_price_of_power', 'special', ...)` |
| 执行层 | ✅ | ① 只展示在此基地有随从的对手手牌 ✅。② 合并展示避免覆盖 ✅。③ 统计疯狂卡总数 ✅。④ 轮流给己方随从 +2 力量 `addPowerCounter` ✅ |
| 状态层 | ✅ | 正确处理 |
| UI 层 | ✅ | 展示手牌 |
| i18n 层 | ✅ | 双语条目存在 |
| 测试层 | 📝 | 无专门行为测试 |

### 交互链 11：elder_thing_dunwich_horror — +5力量+回合结束消灭（持续）

**权威描述**：「打到一个随从上。这个随从获得+5力量。在回合结束时消灭这个随从。」

| 层 | 状态 | 证据 |
|----|------|------|
| 定义层 | ✅ | ongoing 行动卡，`ongoingTarget: 'minion'`（推测） |
| 注册层 | ⚠️ | `registerTrigger('elder_thing_dunwich_horror', 'onTurnEnd', ...)` 只注册了消灭触发。**"+5力量"无 `registerPowerModifier` 注册**（D2 缺失实现） |
| 执行层 | ⚠️ | ① 回合结束消灭附着随从 ✅。② **+5力量效果缺失**——无力量修正注册，附着的随从不会获得+5力量 |
| 状态层 | ✅ | 消灭正确处理 |
| UI 层 | N/A | |
| i18n 层 | ✅ | 双语条目存在 |
| 测试层 | 📝 | 无专门行为测试 |

---

## 交叉影响备注

### elder_thing_shoggoth 前置条件缺失

P0 问题。描述明确说"你只能将这张卡打到你至少拥有6点力量的基地"，但实现无此校验。修复方案：在 validate 层或 `elderThingShoggoth` 函数开头检查 `ctx.baseIndex` 基地上己方力量总和是否 ≥ 6。

### elder_thing_dunwich_horror +5力量缺失

描述有两个效果：+5力量 + 回合结束消灭。实现只有消灭，缺少力量修正。修复方案：在 `ongoing_modifiers.ts` 中添加 `registerPowerModifier('elder_thing_dunwich_horror', ...)` 检查随从是否附着了此卡。

### elder_thing_mi_go 与 cthulhu_mi_go 对手选择权

两个派系的 mi_go 都有"可以"描述但实现为自动执行。这是克苏鲁扩展的系统性问题——对手选择抽疯狂卡的交互未实现。修复需要为每个对手创建链式 Prompt（类似 shoggoth 的实现）。

### elder_thing_unfathomable_goals 链式处理

实现了正确的链式多对手处理：单随从自动消灭，多随从创建 Prompt 让对手选择。这是一个好的实现模式。
