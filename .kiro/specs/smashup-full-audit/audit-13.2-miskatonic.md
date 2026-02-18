# 审查报告：米斯卡塔尼克大学（Miskatonic University）派系

## 审查汇总

| 指标 | 值 |
|------|-----|
| 派系 | 米斯卡塔尼克大学 (Miskatonic University) |
| 卡牌总数 | 4 随从 + 8 行动卡 = 12 种卡牌定义 |
| 审查交互链数 | 12 |
| ✅ 通过 | 8 |
| ⚠️ 语义偏差 | 4 |
| ❌ 缺失实现 | 0 |
| 通过率 | 66.7% |

## 严重问题清单

| 优先级 | 卡牌 | 问题 |
|--------|------|------|
| P0 | miskatonic_it_might_just_work | ✅ 已修复 — 中文版效果：弃1张疯狂卡，己方全体随从+1力量（CARDS_DISCARDED + TEMP_POWER_ADDED） |
| P0 | miskatonic_thing_on_the_doorstep | ✅ 已修复 — 中文版效果：special，基地计分前消灭最高力量随从（MINION_DESTROYED） |
| P0 | miskatonic_lost_knowledge | ✅ 已修复 — 中文版效果：ongoing talent，抽疯狂卡+额外随从到此基地 |
| P1 | miskatonic_those_meddling_kids | ✅ 已修复 — 点击式逐个消灭行动卡（带跳过按钮），支持"任意数量" |
| P1 | miskatonic_psychologist | i18n 说"你可以将手牌或弃牌堆中的一张疯狂卡返回疯狂牌库"，"可以"暗示可跳过，实现自动执行无跳过；且优先手牌不让玩家选择来源 |
| P1 | miskatonic_researcher | i18n 说"你可以抽一张疯狂卡"，"可以"暗示可跳过，实现自动执行无跳过选项 |
| P1 | miskatonic_field_trip | 交互 `min: 1` 强制至少放 1 张，但 i18n 说"任意数量"应允许 0 张（即跳过） |

## 审查矩阵

### 1. miskatonic_professor（教授 - 天赋）
- i18n: "天赋：弃掉一张疯狂卡。如果你这样做，你可以额外打出一个战术和/或一个额外的随从。"
- 定义层: ✅ `registerAbility('miskatonic_professor', 'talent', ...)` 注册正确
- 执行层: ✅ 检查手牌中是否有疯狂卡，有则弃掉（`CARDS_DISCARDED`）+ 授予额外行动 + 额外随从
- 状态层: ✅ 生成 `CARDS_DISCARDED` + `LIMIT_MODIFIED` 事件
- 验证层: ✅ 无疯狂卡时返回空事件
- i18n层: ⚠️ "你可以额外打出一个战术和/或一个额外的随从"暗示可选择只要行动或只要随从或两者都要，实现直接给两个额度（玩家可选择不使用，语义可接受）
- 测试层: ✅ `newFactionAbilities.test.ts` 有测试
- **结论: ✅ 通过**（额度授予后玩家可选择不使用）

### 2. miskatonic_librarian（图书管理员 - 天赋）
- i18n: "天赋：弃掉一张疯狂卡。如果你这样做，抽一张牌。"
- 定义层: ✅ `registerAbility('miskatonic_librarian', 'talent', ...)` 注册正确
- 执行层: ✅ 检查手牌疯狂卡，有则弃掉 + 抽 1 张牌
- 状态层: ✅ `CARDS_DISCARDED` + `CARDS_DRAWN` 事件
- 验证层: ✅ 无疯狂卡时返回空
- i18n层: ✅ 语义一致
- 测试层: ✅ `newFactionAbilities.test.ts` 有测试
- **结论: ✅ 通过**

### 3. miskatonic_psychologist（心理学家 - onPlay）
- i18n: "你可以将手牌或弃牌堆中的一张疯狂卡返回疯狂牌库。"
- 定义层: ✅ `registerAbility('miskatonic_psychologist', 'onPlay', ...)` 注册正确
- 执行层: ⚠️ 优先从手牌找疯狂卡，其次弃牌堆，找到即自动返回。问题：① "你可以"暗示可跳过，无跳过选项 ② 不让玩家选择从手牌还是弃牌堆返回
- 状态层: ✅ `returnMadnessCard` 生成 `MADNESS_RETURNED` 事件
- 验证层: ✅ 无疯狂卡时返回空
- i18n层: ⚠️ "可以"→应有跳过选项；"手牌或弃牌堆"→应让玩家选择来源
- 测试层: ⚠️ 无专项行为测试
- **结论: ⚠️ 语义偏差** — 缺少跳过选项和来源选择

### 4. miskatonic_researcher（研究员 - onPlay）
- i18n: "你可以抽一张疯狂卡。"
- 定义层: ✅ `registerAbility('miskatonic_researcher', 'onPlay', ...)` 注册正确
- 执行层: ⚠️ 直接调用 `drawMadnessCards(playerId, 1, ...)`，无跳过选项
- 状态层: ✅ 生成 `MADNESS_DRAWN` 事件
- 验证层: ✅ 疯狂牌库空时返回空
- i18n层: ⚠️ "你可以"暗示可跳过，实现自动执行
- 测试层: ⚠️ 无专项行为测试
- **结论: ⚠️ 语义偏差** — "可以"应有跳过选项

### 5. miskatonic_psychological_profiling（这太疯狂了...）
- i18n: "抽两张卡并抽一张疯狂卡。"
- 定义层: ✅ `registerAbility('miskatonic_psychological_profiling', 'onPlay', ...)` 注册正确
- 执行层: ✅ 抽 2 张牌 + 抽 1 张疯狂卡
- 状态层: ✅ `CARDS_DRAWN` + `MADNESS_DRAWN` 事件
- 验证层: ✅ 无前置条件
- i18n层: ✅ 语义一致（强制效果，无"可以"）
- 测试层: ✅ `madnessAbilities.test.ts` 有测试
- **结论: ✅ 通过**

### 6. miskatonic_mandatory_reading（最好不知道的事）
- i18n: "选择一位玩家。该玩家抽两张疯狂卡。你可以额外打出一个战术。"
- 定义层: ✅ `registerAbility('miskatonic_mandatory_reading', 'onPlay', ...)` 注册正确
- 执行层: ✅ 使用 `resolveOrPrompt` 选择对手，单对手自动执行。选择后给对手抽 2 张疯狂卡 + 自己获得额外行动
- 状态层: ✅ 交互处理器正确实现
- 验证层: ✅ 无对手时只给额外行动
- i18n层: ⚠️ "你可以额外打出一个战术"暗示可选，实现直接授予额度（玩家可选择不使用，可接受）
- 测试层: ✅ `madnessAbilities.test.ts` 有测试
- **结论: ✅ 通过**

### 7. miskatonic_lost_knowledge（通往超凡的门）
- i18n: "打出到基地上。天赋：抽一张疯狂卡，你可以额外打出一个随从到这。"
- 定义层: ✅ `registerAbility('miskatonic_lost_knowledge', 'talent', ...)` 注册正确（ongoing talent）
- 执行层: ✅ 抽 1 张疯狂卡 + 授予额外随从（restrictToBase 限定到 ongoing 所在基地）
- 状态层: ✅ `MADNESS_DRAWN` + `LIMIT_MODIFIED` 事件
- 验证层: ✅ 无前置条件
- i18n层: ✅ 语义一致
- 测试层: ⚠️ 无专项行为测试（待补充）
- **结论: ✅ 通过**（中文版效果已修正）

### 8. miskatonic_it_might_just_work（它可能有用）
- i18n: "弃掉一张疯狂卡来使你的每个随从获得+1力量直到回合结束。"
- 定义层: ✅ `registerAbility('miskatonic_it_might_just_work', 'onPlay', ...)` 注册正确
- 执行层: ✅ 检查手牌疯狂卡，有则弃 1 张 + 所有己方随从获得 TEMP_POWER_ADDED +1
- 状态层: ✅ `CARDS_DISCARDED` + `TEMP_POWER_ADDED`（每个己方随从一个）事件
- 验证层: ✅ 手牌无疯狂卡时返回 feedback
- i18n层: ✅ 语义一致（中文版效果已修正）
- 测试层: ✅ `madnessPromptAbilities.test.ts` 有测试（5 个用例）
- **结论: ✅ 通过**（中文版效果已修正）

### 9. miskatonic_book_of_iter_the_unseen（金克丝!）
- i18n: "从你的手牌和弃牌堆返回至多两张疯狂卡到疯狂卡牌堆。"
- 定义层: ✅ `registerAbility('miskatonic_book_of_iter_the_unseen', 'onPlay', ...)` 注册正确
- 执行层: ✅ 收集手牌/弃牌堆疯狂卡 → 创建选择交互（按来源+数量组合选项 + 跳过）
- 状态层: ✅ `MADNESS_RETURNED` 事件（每张返回的疯狂卡一个）
- 验证层: ✅ 无对手手牌时跳过查看
- i18n层: ✅ 语义一致
- 测试层: ✅ `interactionCompletenessAudit.test.ts` 有注册
- **结论: ✅ 通过**

### 10. miskatonic_thing_on_the_doorstep（老詹金斯!?）
- i18n: "特殊：在一个基地计分前，消灭一个在那里拥有最高力量的随从。"
- 定义层: ✅ `registerAbility('miskatonic_thing_on_the_doorstep', 'special', ...)` 注册正确
- 执行层: ✅ 找到计分基地上最高力量随从，唯一则直接消灭，多个并列则创建选择交互
- 状态层: ✅ `MINION_DESTROYED` 事件
- 验证层: ✅ 基地无随从时返回 feedback
- i18n层: ✅ 语义一致（中文版效果已修正）
- 测试层: ✅ `madnessPromptAbilities.test.ts` 有测试（4 个用例）
- **结论: ✅ 通过**（中文版效果已修正）

### 11. miskatonic_those_meddling_kids（这些多管闲事的小鬼）
- i18n: "消灭一个基地上任意数量的战术。"
- 定义层: ✅ `registerAbility('miskatonic_those_meddling_kids', 'onPlay', ...)` 注册正确
- 执行层: ⚠️ 选择基地后消灭该基地上**所有**行动卡（ongoing + attached），"任意数量"暗示玩家可选择消灭哪些，实现消灭全部
- 状态层: ✅ 生成 `ONGOING_DETACHED` 事件
- 验证层: ✅ 无行动卡的基地不出现在选项中
- i18n层: ⚠️ "任意数量"→应允许选择消灭哪些，实现消灭全部
- 测试层: ✅ `cthulhuExpansionAbilities.test.ts` 有测试
- **结论: ⚠️ 语义偏差** — "任意数量"应允许选择，实现消灭全部

### 12. miskatonic_field_trip（实地考察）
- i18n: "从你的手上放置任意数量的卡牌到你的牌库底且你每放一张就可以抽一张卡。"
- 定义层: ✅ `registerAbility('miskatonic_field_trip', 'onPlay', ...)` 注册正确
- 执行层: ⚠️ 创建多选交互 `min: 1, max: handCards.length`，但"任意数量"应包含 0（即可跳过），`min: 1` 强制至少放 1 张
- 状态层: ✅ 交互处理器：手牌放牌库底 + 抽等量牌
- 验证层: ✅ 手牌为空时返回空
- i18n层: ⚠️ "任意数量"应允许 0 张，`min: 1` 不符
- 测试层: ⚠️ 无专项行为测试
- **结论: ⚠️ 语义偏差** — `min: 1` 应改为 `min: 0` 以允许跳过

## 交叉影响备注

1. **miskatonic_it_might_just_work 弃牌 vs 返回牌库**：此 bug 影响疯狂卡经济 — 返回牌库意味着疯狂卡可被再次抽取，弃牌则进入弃牌堆。对游戏平衡有实质影响
2. **miskatonic_professor/librarian 天赋 + 疯狂卡弃牌**：教授和图书管理员的天赋正确使用 `CARDS_DISCARDED`（弃牌），与 it_might_just_work 的 `MADNESS_RETURNED`（返回牌库）形成不一致
3. **miskatonic_mandatory_reading + 多对手**：多对手时有选择交互，单对手自动执行，符合 `resolveOrPrompt` 模式
4. **miskatonic_lost_knowledge 前置条件**：正确排除当前打出的卡来计算手牌疯狂卡数量，避免了"打出自己后手牌减少"的时序问题
5. **miskatonic_field_trip 牌库底 + 抽牌顺序**：交互处理器先将卡放牌库底再从牌库顶抽，但使用 `newDeckUids.slice(0, drawCount)` 从新牌库顶抽，可能抽到刚放底的卡（如果原牌库为空）— 需确认是否符合预期
