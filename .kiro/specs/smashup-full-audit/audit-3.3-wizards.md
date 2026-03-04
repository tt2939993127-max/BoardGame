# 审查 3.3：巫师（Wizards）派系多步骤能力

> 审查日期：2026-02-14
> 权威描述来源：`public/locales/zh-CN/game-smashup.json`

## 审查汇总

| 指标 | 数值 |
|------|------|
| 总交互链数 | 11 |
| ✅ 通过 | 8 |
| ⚠️ 语义偏差 | 2 |
| ❌ 缺失实现 | 0 |
| 📝 测试缺失 | 5 |
| 通过率 | 72.7% |

## 严重问题清单

| 优先级 | 交互链 | 问题 | 反模式 |
|--------|--------|------|--------|
| P1 | wizard_sacrifice | 描述顺序"抽牌→消灭"，实现顺序"消灭→抽牌"，可能影响触发链时序 | — |
| P2 | wizard_mass_enchantment | 无跳过选项但描述无"你可以"，强制选择合理；但多对手场景下只能选一张，未选中的非行动卡自然留在牌库顶（正确） | — |

---

## 审查矩阵

### 交互链 1：wizard_portal — 五张展示+多选随从+排序放回

**权威描述**：「展示你牌库顶的5张牌。将以此方式展示的任意数量的随从展示并置入你的手牌。将其他牌以任意顺序返回你的牌库顶。」

| 层 | 状态 | 证据 |
|----|------|------|
| 定义层 | ✅ | `data/factions/wizards.ts` — 行动卡 |
| 注册层 | ✅ | `abilities/wizards.ts:146+` — `registerAbility('wizard_portal', 'onPlay', wizardPortal)` |
| 执行层 | ✅ | 完整多步流程：① `revealDeckTop` 展示牌库顶5张给所有人 ② 有随从时创建多选 Prompt（min:0, max:随从数）③ handler 将选中随从放入手牌（`CARDS_DRAWN`）④ 剩余牌进入排序流程（`wizard_portal_order` 链式交互）⑤ 排序完成后逐张 `CARD_TO_DECK_TOP`（倒序确保先选的在最上面）。无随从时直接进入排序。单张剩余直接放回。 |
| 状态层 | ✅ | `CARDS_DRAWN` + `CARD_TO_DECK_TOP` 被 reduce 处理 |
| 验证层 | N/A | |
| UI 层 | ✅ | 多步 `createSimpleChoice`：随从多选→逐张排序 |
| i18n 层 | ✅ | 双语条目存在 |
| 测试层 | ✅ | `query6Abilities.test.ts` 有三个测试：有随从创建选择 Prompt、牌库为空无事件、全行动卡创建排序 Prompt |

### 交互链 2：wizard_scry — 搜牌库+展示+放入手牌+洗牌

**权威描述**：「从你的牌库搜寻一个战术并展示给所有玩家。将它放入你的手中并重洗牌库。」

| 层 | 状态 | 证据 |
|----|------|------|
| 定义层 | ✅ | `data/factions/wizards.ts` — 行动卡 |
| 注册层 | ✅ | `abilities/wizards.ts:146+` — `registerAbility('wizard_scry', 'onPlay', wizardScry)` |
| 执行层 | ✅ | 四步完整：① 过滤牌库中行动卡 ② 创建选择 Prompt ③ handler 发射 `REVEAL_HAND`（展示给所有人）④ `CARDS_DRAWN`（放入手牌）⑤ `DECK_RESHUFFLED`（洗牌库）。无行动卡时静默返回 |
| 状态层 | ✅ | `CARDS_DRAWN` + `DECK_RESHUFFLED` 被 reduce 处理 |
| 验证层 | N/A | |
| UI 层 | ✅ | `createSimpleChoice` |
| i18n 层 | ✅ | 双语条目存在 |
| 测试层 | ✅ | `query6Abilities.test.ts` 有正向（单张行动卡创建 Prompt）和负向（无行动卡无事件）测试 |

### 交互链 3：wizard_sacrifice — 选随从+抽牌+消灭

**权威描述**：「选择你的一个随从。抽等同于它力量的卡牌数。消灭那个仆从。」

| 层 | 状态 | 证据 |
|----|------|------|
| 定义层 | ✅ | `data/factions/wizards.ts` — 行动卡 |
| 注册层 | ✅ | `abilities/wizards.ts:146+` — `registerAbility('wizard_sacrifice', 'onPlay', wizardSacrifice)` |
| 执行层 | ⚠️ | ① 收集所有基地己方随从，创建选择 Prompt ✅。② handler 中 `getMinionPower` 获取力量值 ✅。③ **执行顺序：先 `destroyMinion` 再 `CARDS_DRAWN`**，但描述顺序是"抽牌→消灭"。这可能影响触发链时序（如 `robot_microbot_archive` 的 onMinionDestroyed 触发抽牌，如果先消灭再抽牌，archive 触发的抽牌会在献祭抽牌之前执行）。④ 无己方随从时静默返回 ✅ |
| 状态层 | ✅ | `MINION_DESTROYED` + `CARDS_DRAWN` 被 reduce 处理 |
| 验证层 | N/A | |
| UI 层 | ✅ | `createSimpleChoice` + handler |
| i18n 层 | ✅ | 双语条目存在 |
| 测试层 | ✅ | `query6Abilities.test.ts` + `zombieWizardAbilities.test.ts` 有多个测试（多随从/无随从/单随从） |

### 交互链 4：wizard_neophyte — 展示牌库顶+条件分支

**权威描述**：「展示你牌库最顶端的牌。如果它是一个战术，你可以将其放到手牌或作为一个额外战术打出。如果不是，将其返回你牌库顶。」

| 层 | 状态 | 证据 |
|----|------|------|
| 定义层 | ✅ | `data/factions/wizards.ts` — `abilityTags: ['onPlay', 'extra']` |
| 注册层 | ✅ | `abilities/wizards.ts:146+` — `registerAbility('wizard_neophyte', 'onPlay', wizardNeophyte)` |
| 执行层 | ✅ | ① `revealDeckTop` 展示给所有人 ✅。② 是行动卡时创建二选一 Prompt（放入手牌/作为额外行动打出）✅。③ 非行动卡时只展示不操作（留在牌库顶）✅。④ handler：`to_hand` → `CARDS_DRAWN`；`play_extra` → `CARDS_DRAWN` + `grantExtraAction` ✅ |
| 状态层 | ✅ | `CARDS_DRAWN` + `LIMIT_MODIFIED` 被 reduce 处理 |
| 验证层 | N/A | |
| UI 层 | ✅ | 二选一 `createSimpleChoice` |
| i18n 层 | ✅ | 双语条目存在 |
| 测试层 | 📝 | `interactionCompletenessAudit` 有注册覆盖，`coreProperties.test.ts` 有属性测试，但无完整行为测试 |

### 交互链 5：wizard_mass_enchantment — 展示对手牌库顶+选行动卡打出

**权威描述**：「展示每个其他玩家的牌库顶的牌。将其中一张战术卡作为一个额外战术打出。将其他未使用的卡放到拥有者的牌库顶。」

| 层 | 状态 | 证据 |
|----|------|------|
| 定义层 | ✅ | `data/factions/wizards.ts` — 行动卡，`abilityTags: ['extra']` |
| 注册层 | ✅ | `abilities/wizards.ts:146+` — `registerAbility('wizard_mass_enchantment', 'onPlay', wizardMassEnchantment)` |
| 执行层 | ✅ | ① 遍历所有对手牌库顶，合并为一个 `revealDeckTop` 事件 ✅。② 收集行动卡候选 ✅。③ 无行动卡时只展示 ✅。④ 有行动卡时创建选择 Prompt（无跳过，描述无"你可以"，强制选择正确）✅。⑤ handler：`CARD_TRANSFERRED`（从对手牌库移到己方手牌）+ `grantExtraAction` ✅。⑥ 未选中的卡自然留在对手牌库顶（`revealDeckTop` 不移除卡）✅ |
| 状态层 | ✅ | `CARD_TRANSFERRED` 从对手 deck 移除卡放入己方 hand，`LIMIT_MODIFIED` 授予额外行动 |
| 验证层 | N/A | |
| UI 层 | ✅ | `createSimpleChoice` |
| i18n 层 | ✅ | 双语条目存在 |
| 测试层 | ✅ | `query6Abilities.test.ts` 有正向（单对手创建 Prompt）和负向（对手牌库为空无事件）测试 |

### 交互链 6：wizard_archmage — 每回合额外打出一个战术（持续）

**权威描述**：「持续：你可以在你的每个回合打出一个额外战术。」

| 层 | 状态 | 证据 |
|----|------|------|
| 定义层 | ✅ | `data/factions/wizards.ts` — `abilityTags: ['ongoing', 'extra']` |
| 注册层 | ✅ | `abilities/wizards.ts:334+` — `registerTrigger('wizard_archmage', 'onTurnStart', ...)` |
| 执行层 | ✅ | ① 找到 archmage 控制者 ✅。② 只在控制者回合触发 ✅。③ 发射 `LIMIT_MODIFIED`（action +1）✅。④ "你可以"通过额度机制实现（玩家可选择是否使用额度），合理 |
| 状态层 | ✅ | `LIMIT_MODIFIED` 被 reduce 处理 |
| 验证层 | N/A | |
| UI 层 | N/A | |
| i18n 层 | ✅ | 双语条目存在 |
| 测试层 | ✅ | `baseFactionOngoing.test.ts` 有正向（控制者回合触发）和负向（非控制者回合不触发）测试 |

### 交互链 7：wizard_winds_of_change — 洗手牌+抽5张+额外行动

**权威描述**：「将你的手牌洗回你的牌库再抽5张牌。你可以额外打出一个战术。」

| 层 | 状态 | 证据 |
|----|------|------|
| 定义层 | ✅ | `data/factions/wizards.ts` — 行动卡，`abilityTags: ['extra']` |
| 注册层 | ✅ | `abilities/wizards.ts:146+` — `registerAbility('wizard_winds_of_change', 'onPlay', wizardWindsOfChange)` |
| 执行层 | ✅ | ① 排除当前打出的行动卡（`ctx.cardUid`）后将手牌+牌库洗混 ✅。② `shuffleHandIntoDeck` 事件 ✅。③ 抽 min(5, 牌库长度) 张 ✅。④ `grantExtraAction` 额外行动 ✅ |
| 状态层 | ✅ | `HAND_SHUFFLED_INTO_DECK` + `CARDS_DRAWN` + `LIMIT_MODIFIED` 被 reduce 处理 |
| 验证层 | N/A | |
| UI 层 | N/A | 无交互，自动执行 |
| i18n 层 | ✅ | 双语条目存在 |
| 测试层 | ✅ | `zombieWizardAbilities.test.ts` + `query6Abilities.test.ts` 有多个测试（正常/牌不足场景） |

### 交互链 8：wizard_time_loop — 额外打出两个战术

**权威描述**：「打出两张额外的战术。」

| 层 | 状态 | 证据 |
|----|------|------|
| 定义层 | ✅ | `data/factions/wizards.ts` — 行动卡，`abilityTags: ['extra']` |
| 注册层 | ✅ | `abilities/wizards.ts:146+` — `registerAbility('wizard_time_loop', 'onPlay', wizardTimeLoop)` |
| 执行层 | ✅ | 两次 `grantExtraAction`，正确 |
| 状态层 | ✅ | 两个 `LIMIT_MODIFIED` 事件 |
| 验证层 | N/A | |
| UI 层 | N/A | |
| i18n 层 | ✅ | 双语条目存在 |
| 测试层 | 📝 | 无行为测试 |

### 交互链 9：wizard_chronomage — 额外打出一个战术

**权威描述**：「本回合你可以额外打出一个战术。」

| 层 | 状态 | 证据 |
|----|------|------|
| 定义层 | ✅ | `data/factions/wizards.ts` — `abilityTags: ['onPlay', 'extra']` |
| 注册层 | ✅ | `abilities/wizards.ts:146+` — `registerAbility('wizard_chronomage', 'onPlay', wizardChronomage)` |
| 执行层 | ✅ | `grantExtraAction`，"你可以"通过额度机制实现 |
| 状态层 | ✅ | `LIMIT_MODIFIED` |
| 验证层 | N/A | |
| UI 层 | N/A | |
| i18n 层 | ✅ | 双语条目存在 |
| 测试层 | 📝 | `turnCycle.test.ts` 有间接引用，无专项行为测试 |

### 交互链 10：wizard_summon — 额外打出一个随从

**权威描述**：「打出一张额外随从。」

| 层 | 状态 | 证据 |
|----|------|------|
| 定义层 | ✅ | `data/factions/wizards.ts` — 行动卡，`abilityTags: ['extra']` |
| 注册层 | ✅ | `abilities/wizards.ts:146+` — `registerAbility('wizard_summon', 'onPlay', wizardSummon)` |
| 执行层 | ✅ | `grantExtraMinion`，正确 |
| 状态层 | ✅ | `LIMIT_MODIFIED` |
| 验证层 | N/A | |
| UI 层 | N/A | |
| i18n 层 | ✅ | 双语条目存在 |
| 测试层 | 📝 | 无行为测试 |

### 交互链 11：wizard_sacrifice — 执行顺序语义偏差（补充分析）

**权威描述顺序**：「选择你的一个随从。**抽**等同于它力量的卡牌数。**消灭**那个仆从。」

**实现顺序**：handler 中先 `destroyMinion` 再 `CARDS_DRAWN`。

**影响分析**：
- 描述明确"先抽牌后消灭"。如果先消灭，`robot_microbot_archive` 的 `onMinionDestroyed` 触发器会在献祭抽牌之前执行，可能改变牌库状态。
- 实际影响取决于事件处理管线的时序——如果事件是批量发射后按顺序 reduce，则 `destroyMinion` 先 reduce 但 `onMinionDestroyed` 触发器可能在下一个 tick 执行，此时 `CARDS_DRAWN` 可能已经 reduce。需要确认引擎的事件处理时序。
- **建议**：调换事件顺序为 `CARDS_DRAWN` → `destroyMinion`，与描述一致。

---

## 简单能力（不在审查范围内，仅记录）

以下能力为单一效果，不涉及多步骤/条件/交互，不在本次审查范围内：

- `wizard_enchantress`：抽一张牌 — 单一效果 ✅
- `wizard_mystic_studies`：抽两张牌 — 单一效果 ✅
