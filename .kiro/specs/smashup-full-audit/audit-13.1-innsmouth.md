# 审查报告：印斯茅斯（Innsmouth）派系

## 审查汇总

| 指标 | 值 |
|------|-----|
| 派系 | 印斯茅斯 (Innsmouth) |
| 卡牌总数 | 1 随从 ×10 + 8 行动卡 = 9 种卡牌定义 |
| 审查交互链数 | 9 |
| ✅ 通过 | 5 |
| ⚠️ 语义偏差 | 3 |
| ❌ 缺失实现 | 1 |
| 通过率 | 55.6% |

## 严重问题清单

| 优先级 | 卡牌 | 问题 |
|--------|------|------|
| P0 | innsmouth_return_to_the_sea | i18n 说"将任意数量在这里的你的同名随从返回到手中"，但实现只返回与触发随从同 defId 的其他随从，不包含触发随从自身；且"任意数量"暗示玩家可选择返回哪些，实现自动返回全部无跳过选项 |
| P1 | innsmouth_mysteries_of_the_deep | i18n 说"你可以额外抽2张牌和2张疯狂卡"，"可以"暗示可选，实现有交互确认 ✅，但确认后抽牌和疯狂卡是绑定的，无法只选其一（原文 "and" 语义合理，此处为轻微偏差） |
| P1 | innsmouth_psychologist（心理学家） | i18n 说"你可以将手牌或弃牌堆中的一张疯狂卡返回疯狂牌库"，"可以"暗示可跳过，但实现自动执行无跳过选项；且优先从手牌找，不让玩家选择来源 |
| P1 | innsmouth_spreading_the_word | i18n 说"额外打出至多两个与场中一个随从同名的随从"，"一个随从同名"暗示先选定一个场上随从名字再匹配，实现直接匹配所有场上随从的 defId，语义更宽泛 |

## 审查矩阵

### 1. innsmouth_the_deep_ones（深潜者）
- i18n: "每个你的力量为2或以下的随从获得+1力量直到回合结束。"
- 定义层: ✅ `registerAbility('innsmouth_the_deep_ones', 'onPlay', ...)` 注册正确
- 执行层: ✅ 遍历所有基地，筛选 `controller === playerId && getMinionPower <= 2`，`addPowerCounter +1`
- 状态层: ✅ `addPowerCounter` 生成 `POWER_COUNTER_CHANGED` 事件
- 验证层: ✅ 无前置条件需验证
- i18n层: ⚠️ "直到回合结束" — 需确认 powerCounter 是否在回合结束时清除（取决于全局回合清理逻辑，非本能力职责）
- 测试层: ✅ `cthulhuExpansionAbilities.test.ts` 有 3 个测试用例覆盖
- **结论: ✅ 通过**

### 2. innsmouth_new_acolytes（新人）
- i18n: "所有玩家将它们弃牌堆中的所有随从洗回他们的牌库。"
- 定义层: ✅ `registerAbility('innsmouth_new_acolytes', 'onPlay', ...)` 注册正确
- 执行层: ✅ 遍历 `turnOrder` 所有玩家，筛选弃牌堆中 `type === 'minion'`，合并到牌库并洗牌
- 状态层: ✅ 生成 `DECK_RESHUFFLED` 事件
- 验证层: ✅ 无前置条件
- i18n层: ✅ 语义一致
- 测试层: ✅ `cthulhuExpansionAbilities.test.ts` 有 3 个测试用例
- **结论: ✅ 通过**

### 3. innsmouth_recruitment（招募）
- i18n: "抽取至多三张疯狂卡。你每这样做一次，你本回合就可以额外打出一个随从。"
- 定义层: ✅ `registerAbility('innsmouth_recruitment', 'onPlay', ...)` 注册正确
- 执行层: ⚠️ `drawMadnessCards(playerId, 3, ...)` 直接抽 3 张，"至多"暗示玩家可选择抽几张（0-3），实现固定抽 3 张无选择
- 状态层: ✅ 每张成功抽取的疯狂卡对应 1 个 `grantExtraMinion`
- 验证层: ✅ 无前置条件
- i18n层: ⚠️ "至多三张"语义偏差 — 应允许玩家选择数量
- 测试层: ✅ `madnessAbilities.test.ts` 有测试覆盖
- **结论: ⚠️ 语义偏差** — "至多"应允许选择数量，当前固定抽 3 张

### 4. innsmouth_the_locals（本地人）
- i18n: "展示你牌库顶的三张牌，将任何以此方式展示的本地人放到你的手牌。将剩下的牌放入你的牌库底。"
- 定义层: ✅ `registerAbility('innsmouth_the_locals', 'onPlay', ...)` 注册正确
- 执行层: ✅ `revealAndPickFromDeck` 展示 3 张，`predicate: card => card.defId === 'innsmouth_the_locals'`，匹配同 defId
- 状态层: ✅ 匹配卡入手牌，其余放牌库底
- 验证层: ✅ 无前置条件
- i18n层: ✅ "本地人"即同 defId，语义一致
- 测试层: ✅ `newFactionAbilities.test.ts` 有 4 个测试用例
- **结论: ✅ 通过**

### 5. innsmouth_return_to_the_sea（重返深海）
- i18n: "特殊：在一个基地计分后，将任意数量在这里的你的同名随从返回到手中而不是弃牌堆。"
- 定义层: ✅ `registerAbility('innsmouth_return_to_the_sea', 'special', ...)` 注册正确
- 执行层: ❌ 实现只返回与触发随从同 defId 的**其他**随从（`m.uid !== ctx.cardUid`），不包含触发随从自身。i18n 说"你的同名随从"应包含自身。且"任意数量"暗示玩家可选择返回哪些，实现自动返回全部无交互
- 状态层: ✅ 生成 `MINION_RETURNED` 事件
- 验证层: ⚠️ 作为 special 能力，触发时机依赖框架层计分后调用
- i18n层: ❌ "任意数量"→自动全部返回，缺少玩家选择；触发随从自身未被返回
- 测试层: ⚠️ 仅有注册检查测试，无行为测试
- **结论: ❌ 缺失实现** — 触发随从自身未返回 + 缺少"任意数量"选择交互

### 6. innsmouth_mysteries_of_the_deep（深潜者的秘密）
- i18n: "如果你在一个基地中有三个或更多拥有相同名字的随从，抽3张牌，之后你可以额外抽2张牌和2张疯狂卡。"
- 定义层: ✅ `registerAbility('innsmouth_mysteries_of_the_deep', 'onPlay', ...)` 注册正确
- 执行层: ✅ 检查所有基地是否有 3+ 同 defId 己方随从，有则抽 3 张 + 创建交互确认额外抽 2 张牌 + 2 张疯狂卡
- 状态层: ✅ 交互处理器正确实现额外抽牌 + 疯狂卡
- 验证层: ✅ 前置条件（3+ 同名随从）正确检查
- i18n层: ✅ "你可以"有交互确认
- 测试层: ✅ `interactionCompletenessAudit.test.ts` 有注册
- **结论: ✅ 通过**

### 7. innsmouth_sacred_circle（宗教圆环）
- i18n: "打出到基地上。天赋：你可以额外打出一个与这里的一个随从有着相同名字的随从到这里。"
- 定义层: ✅ `registerAbility('innsmouth_sacred_circle', 'talent', ...)` 注册正确
- 执行层: ✅ 找到 sacred_circle 所在基地，收集基地上随从 defId，检查手牌是否有匹配随从，有则 `grantExtraMinion` 限定到该基地
- 状态层: ✅ `grantExtraMinion` 带 `restrictToBase` 参数
- 验证层: ⚠️ "你可以"暗示可跳过，但实现在有匹配时自动授予额度无跳过选项（不过授予额度后玩家可以选择不使用，语义上可接受）
- i18n层: ✅ "与这里的一个随从有着相同名字"→检查基地上随从 defId 集合，语义一致
- 测试层: ⚠️ 仅在 `abilityBehaviorAudit.test.ts` 白名单中，无行为测试
- **结论: ✅ 通过**（额度授予后玩家可选择不使用）

### 8. innsmouth_spreading_the_word（散播谣言）
- i18n: "额外打出至多两个与场中一个随从同名的随从。"
- 定义层: ✅ `registerAbility('innsmouth_spreading_the_word', 'onPlay', ...)` 注册正确
- 执行层: ⚠️ 收集所有在场随从的 defId 集合，检查手牌中匹配数量，授予 min(2, matchCount) 个额外随从额度。i18n 说"与场中一个随从同名"暗示先选定一个名字，实现匹配所有场上名字，语义更宽泛
- 状态层: ✅ `grantExtraMinion` 事件正确
- 验证层: ✅ 无前置条件
- i18n层: ⚠️ "一个随从同名"→应先选定一个随从名字再匹配，实现匹配所有名字
- 测试层: ⚠️ 无专项行为测试
- **结论: ⚠️ 语义偏差** — 应限定为"选定一个名字"而非匹配所有名字

### 9. innsmouth_in_plain_sight（一目了然）
- i18n: "打出到一个基地上。你在这里的力量为2或以下的随从不会被对手的卡牌影响。"
- 定义层: ✅ `registerProtection('innsmouth_in_plain_sight', 'affect', ...)` 注册正确
- 执行层: ✅ 检查基地上是否有 in_plain_sight ongoing，只保护拥有者的力量 ≤2 随从，只拦截其他玩家的影响
- 状态层: ✅ 通过 `ongoingEffects` 保护系统实现
- 验证层: ✅ 正确检查 `controller === ownerId` 和 `power <= 2` 和 `sourcePlayerId !== ownerId`
- i18n层: ✅ 语义一致
- 测试层: ✅ `expansionOngoing.test.ts` 有 3 个测试用例
- **结论: ✅ 通过**

## 交叉影响备注

1. **innsmouth_in_plain_sight + 其他派系影响效果**：保护检查通过 `registerProtection` 系统实现，与其他保护效果（如 bear_cavalry_superiority）共用框架，叠加逻辑由框架处理
2. **innsmouth_recruitment + 疯狂卡系统**：依赖 `drawMadnessCards` 全局辅助函数，与其他克苏鲁扩展派系共享疯狂卡牌库
3. **innsmouth_sacred_circle + grantExtraMinion(restrictToBase)**：额度限定到特定基地，需确认 validate 层是否正确检查基地限制
4. **innsmouth_the_locals 同名机制**：依赖 `defId` 匹配，与 SmashUp 全局的"同名"语义一致（defId = 卡牌定义 ID）
