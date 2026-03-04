# 审查 9.1：蒸汽朋克（Steampunks）派系多步骤能力

> 审查日期：2026-02-14
> 权威描述来源：`public/locales/zh-CN/game-smashup.json`

## 审查汇总

| 指标 | 数值 |
|------|------|
| 总交互链数 | 12 |
| ✅ 通过 | 8 |
| ⚠️ 语义偏差 | 3 |
| ❌ 缺失实现 | 1 |
| 📝 测试缺失 | 7 |
| 通过率 | 66.7% |

## 严重问题清单

| 优先级 | 交互链 | 问题 | 维度 |
|--------|--------|------|------|
| P0 | steampunk_ornate_dome | 描述"摧毁所有其他玩家打到这里的战术"打出时效果未实现 | D2 |
| P1 | steampunk_mechanic | 描述"将其作为一个额外战术打出"但实现为取回手牌+额外行动额度，非直接打出 | D1 |
| P1 | steampunk_change_of_venue | 描述"将其作为一个额外战术打出"但实现为取回手牌+额外行动额度，非直接打出 | D1 |
| P2 | steampunk_captain_ahab | 描述"移动该随从到一个附属有你的战术的基地上"但实现自动选第一个，无玩家选择 | D5 |

---

## 审查矩阵

### 交互链 1：steampunk_steam_queen — 己方战术不受对手影响（持续）

**权威描述**：「持续：你的战术不会被其他玩家的卡牌所影响。」

| 层 | 状态 | 证据 |
|----|------|------|
| 定义层 | ✅ | `data/factions/steampunks.ts` — `abilityTags: ['ongoing']` |
| 注册层 | ✅ | `registerInterceptor('steampunk_steam_queen', steampunkSteamQueenInterceptor)` |
| 执行层 | ✅ | ① 拦截 `ONGOING_DETACHED` 事件 ✅。② 排除自毁/过期原因 `self_destruct`/`expired` ✅。③ 检查 queen 在场且行动卡属于 queen 控制者 ✅。④ 返回 `null` 阻止移除 ✅ |
| 状态层 | ✅ | 通过拦截器阻止事件 |
| 验证层 | N/A | |
| UI 层 | N/A | |
| i18n 层 | ✅ | 双语条目存在 |
| 测试层 | 📝 | 无专门行为测试 |

### 交互链 2：steampunk_mechanic — 从弃牌堆打出行动卡

**权威描述**：「选择一个在你弃牌堆中可以被打到基地上的战术，将其作为一个额外战术打出。」

| 层 | 状态 | 证据 |
|----|------|------|
| 定义层 | ✅ | `data/factions/steampunks.ts` — `abilityTags: ['onPlay', 'extra']` |
| 注册层 | ✅ | `registerAbility('steampunk_mechanic', 'onPlay', steampunkMechanic)` |
| 执行层 | ⚠️ | ① 过滤弃牌堆中行动卡 ✅。② 创建 Prompt 选择 ✅。③ **handler 实现为 `recoverCardsFromDiscard` + `grantExtraAction`**——描述说"将其作为一个额外战术打出"，意味着应直接打出到基地（触发 ongoing 附着等），但实现只是取回手牌+给额外行动额度，玩家需要手动再打出（D1 语义偏差：间接实现 vs 直接打出）。④ 描述说"可以被打到基地上的战术"暗示只选 ongoing 类型行动卡，但实现过滤所有行动卡 |
| 状态层 | ✅ | `CARDS_RECOVERED` + `LIMIT_MODIFIED` 被 reduce 处理 |
| 验证层 | N/A | |
| UI 层 | ✅ | Prompt 选择 |
| i18n 层 | ✅ | 双语条目存在 |
| 测试层 | 📝 | 无专门行为测试（expansionAbilities.test.ts 无 mechanic 测试） |

### 交互链 3：steampunk_steam_man — 有己方行动卡时+1力量（持续）

**权威描述**：「持续：+1力量如果你本基地有至少一个你的战术附属在它上面。」

| 层 | 状态 | 证据 |
|----|------|------|
| 定义层 | ✅ | `data/factions/steampunks.ts` — `abilityTags: ['ongoing']` |
| 注册层 | ✅ | `ongoing_modifiers.ts` — `registerPowerModifier('steampunk_steam_man', ...)` |
| 执行层 | ✅ | ① 检查 `defId === 'steampunk_steam_man'` ✅。② 计算基地上己方行动卡数（ongoing + 附着）✅。③ 有至少一个时 +1 ✅ |
| 状态层 | ✅ | 通过 `getEffectivePower` 计算 |
| 验证层 | N/A | |
| UI 层 | N/A | |
| i18n 层 | ✅ | 双语条目存在 |
| 测试层 | 📝 | 无专门行为测试 |

### 交互链 4：steampunk_captain_ahab — 移动到有己方行动卡的基地（天赋）

**权威描述**：「天赋：移动该随从到一个附属有你的战术的基地上。」

| 层 | 状态 | 证据 |
|----|------|------|
| 定义层 | ✅ | `data/factions/steampunks.ts` — `abilityTags: ['talent']` |
| 注册层 | ✅ | `registerAbility('steampunk_captain_ahab', 'talent', steampunkCaptainAhab)` |
| 执行层 | ⚠️ | ① 找当前基地 ✅。② 找有己方 ongoing 行动卡的其他基地 ✅。③ **自动选第一个找到的基地**——描述"一个附属有你的战术的基地"暗示玩家可选择（多个候选时），但实现自动选第一个（D5 交互完整性：缺少多候选时的选择交互）。④ 无候选时静默返回 ✅ |
| 状态层 | ✅ | `MINION_MOVED` 被 reduce 处理 |
| 验证层 | N/A | |
| UI 层 | ⚠️ | 缺少多候选时的选择交互 |
| i18n 层 | ✅ | 双语条目存在 |
| 测试层 | 📝 | 无专门行为测试 |

### 交互链 5：steampunk_ornate_dome — 禁止对手打行动卡+打出时摧毁（持续）

**权威描述**：「打出到基地上。摧毁所有其他玩家打到这里的战术。持续：其他玩家不能打出战术到本基地上。」

| 层 | 状态 | 证据 |
|----|------|------|
| 定义层 | ✅ | `data/factions/steampunks.ts` — `abilityTags: ['ongoing']`, `subtype: 'ongoing'` |
| 注册层 | ✅ | `registerRestriction('steampunk_ornate_dome', 'play_action', steampunkOrnateDomeChecker)` |
| 执行层 | ❌ | ① 限制检查：`ctx.playerId !== dome.ownerId` 时限制 ✅。② **"摧毁所有其他玩家打到这里的战术"打出时效果未实现**——描述有两个效果：打出时立即摧毁已有的对手行动卡 + 持续限制。实现只有持续限制，缺少打出时的即时摧毁效果（D2 边界完整违规） |
| 状态层 | ✅ | 限制系统正确拦截 |
| 验证层 | N/A | |
| UI 层 | N/A | |
| i18n 层 | ✅ | 双语条目存在 |
| 测试层 | ⚠️ | `ongoingEffects.test.ts` 有限制拦截测试，但无打出时摧毁测试 |

### 交互链 6：steampunk_aggromotive — 有随从时+5力量（持续）

**权威描述**：「打出到基地上。持续：如果你有一个随从在此基地，你在这里就拥有+5力量。」

| 层 | 状态 | 证据 |
|----|------|------|
| 定义层 | ✅ | `data/factions/steampunks.ts` — `abilityTags: ['ongoing']`, `subtype: 'ongoing'` |
| 注册层 | ✅ | `ongoing_modifiers.ts` — `registerPowerModifier('steampunk_aggromotive', ...)` |
| 执行层 | ✅ | ① 找基地上的 aggromotive ongoing ✅。② 检查拥有者在基地有随从 ✅。③ 给第一个己方随从 +5（避免重复计算）✅ |
| 状态层 | ✅ | 通过 `getEffectivePower` 计算 |
| 验证层 | N/A | |
| UI 层 | N/A | |
| i18n 层 | ✅ | 双语条目存在 |
| 测试层 | 📝 | 无专门行为测试 |

### 交互链 7：steampunk_scrap_diving — 从弃牌堆取回行动卡

**权威描述**：「将一个战术从你的弃牌堆中加入你的手牌。」

| 层 | 状态 | 证据 |
|----|------|------|
| 定义层 | ✅ | `data/factions/steampunks.ts` — 行动卡，`subtype: 'standard'` |
| 注册层 | ✅ | `registerAbility('steampunk_scrap_diving', 'onPlay', steampunkScrapDiving)` |
| 执行层 | ✅ | ① 过滤弃牌堆中行动卡（排除自身）✅。② 创建 Prompt 选择 ✅。③ handler 发射 `recoverCardsFromDiscard` ✅。④ 无行动卡时静默返回 ✅ |
| 状态层 | ✅ | `CARDS_RECOVERED` 被 reduce 处理 |
| 验证层 | N/A | |
| UI 层 | ✅ | Prompt 选择 |
| i18n 层 | ✅ | 双语条目存在 |
| 测试层 | ✅ | `expansionAbilities.test.ts` 有多场景测试（多张选择、单张自动、无行动卡、只有自身） |

### 交互链 8：steampunk_zeppelin — 双向移动随从（天赋）

**权威描述**：「打出到基地上。天赋：从另一个基地移动一个你的随从到这里，或者从这里到另一个基地。」

| 层 | 状态 | 证据 |
|----|------|------|
| 定义层 | ✅ | `data/factions/steampunks.ts` — `abilityTags: ['ongoing', 'talent']`, `subtype: 'ongoing'` |
| 注册层 | ✅ | `registerAbility('steampunk_zeppelin', 'talent', steampunkZeppelin)` |
| 执行层 | ✅ | ① 找 zeppelin 所在基地 ✅。② 方向A：从其他基地移入 ✅。③ 方向B：从此基地移出 ✅。④ 合并所有候选为单个 Prompt ✅。⑤ handler 发射 `moveMinion` ✅ |
| 状态层 | ✅ | `MINION_MOVED` 被 reduce 处理 |
| 验证层 | N/A | |
| UI 层 | ✅ | 单步 Prompt 包含双向选项 |
| i18n 层 | ✅ | 双语条目存在 |
| 测试层 | 📝 | 无专门行为测试 |

### 交互链 9：steampunk_change_of_venue — 取回行动卡+额外打出

**权威描述**：「将你的一个打出在基地或随从上的战术拿回手牌。将其作为一个额外战术打出。」

| 层 | 状态 | 证据 |
|----|------|------|
| 定义层 | ✅ | `data/factions/steampunks.ts` — `abilityTags: ['extra']` |
| 注册层 | ✅ | `registerAbility('steampunk_change_of_venue', 'onPlay', steampunkChangeOfVenue)` |
| 执行层 | ⚠️ | ① 收集所有己方 ongoing 行动卡 ✅。② 创建 Prompt 选择 ✅。③ handler 发射 `ONGOING_DETACHED` + `grantExtraAction` ✅。④ **描述"将其作为一个额外战术打出"暗示取回的卡直接再打出**，但实现只是取回手牌+给额外行动额度，取回的卡和额外行动不绑定（D1 语义偏差：玩家可能用额外行动打其他卡）。⑤ 无 ongoing 时仍给额外行动 ✅ |
| 状态层 | ✅ | `ONGOING_DETACHED` + `LIMIT_MODIFIED` 被 reduce 处理 |
| 验证层 | N/A | |
| UI 层 | ✅ | Prompt 选择 |
| i18n 层 | ✅ | 双语条目存在 |
| 测试层 | 📝 | 无专门行为测试 |

### 交互链 10：steampunk_rotary_slug_thrower — 己方随从+2力量（持续）

**权威描述**：「打出到基地上。持续：你在这里的每个随从都获得+2力量。」

| 层 | 状态 | 证据 |
|----|------|------|
| 定义层 | ✅ | `data/factions/steampunks.ts` — `abilityTags: ['ongoing']`, `subtype: 'ongoing'` |
| 注册层 | ✅ | `ongoing_modifiers.ts` — `registerPowerModifier('steampunk_rotary_slug_thrower', ...)` |
| 执行层 | ✅ | ① 检查基地上有该 ongoing 且属于随从控制者 ✅。② 返回 +2 ✅ |
| 状态层 | ✅ | 通过 `getEffectivePower` 计算 |
| 验证层 | N/A | |
| UI 层 | N/A | |
| i18n 层 | ✅ | 双语条目存在 |
| 测试层 | 📝 | 无专门行为测试 |

### 交互链 11：steampunk_difference_engine — 回合结束时多抽牌（持续）

**权威描述**：「打出到基地上。持续：如果你有一个随从在此基地，则在你回合结束时多抽一张牌。」

| 层 | 状态 | 证据 |
|----|------|------|
| 定义层 | ✅ | `data/factions/steampunks.ts` — `abilityTags: ['ongoing']`, `subtype: 'ongoing'` |
| 注册层 | ✅ | `registerTrigger('steampunk_difference_engine', 'onTurnEnd', steampunkDifferenceEngineTrigger)` |
| 执行层 | ✅ | ① 遍历所有基地找 difference_engine ✅。② 检查拥有者在基地有随从 ✅。③ 检查牌库非空 ✅。④ 发射 `CARDS_DRAWN` ✅ |
| 状态层 | ✅ | `CARDS_DRAWN` 被 reduce 处理 |
| 验证层 | N/A | |
| UI 层 | N/A | 自动触发 |
| i18n 层 | ✅ | 双语条目存在 |
| 测试层 | 📝 | 无专门行为测试 |

### 交互链 12：steampunk_escape_hatch — 随从被消灭时回手牌（持续）

**权威描述**：「打出到基地上。持续：当你在此基地的随从被消灭时，将它们放到手牌而不是弃牌堆。」

| 层 | 状态 | 证据 |
|----|------|------|
| 定义层 | ✅ | `data/factions/steampunks.ts` — `abilityTags: ['ongoing']`, `subtype: 'ongoing'` |
| 注册层 | ✅ | `registerTrigger('steampunk_escape_hatch', 'onMinionDestroyed', steampunkEscapeHatchTrigger)` |
| 执行层 | ✅ | ① 检查基地上有 escape_hatch ✅。② 找被消灭的随从 ✅。③ 只保护 hatch 拥有者的随从 ✅。④ 发射 `MINION_RETURNED` 事件 ✅ |
| 状态层 | ✅ | `MINION_RETURNED` 被 reduce 处理 |
| 验证层 | N/A | |
| UI 层 | N/A | 自动触发 |
| i18n 层 | ✅ | 双语条目存在 |
| 测试层 | 📝 | 无专门行为测试（ongoingE2E.test.ts 无 escape_hatch 测试） |

---

## 交叉影响备注

### steampunk_ornate_dome 打出时效果缺失

P0 问题。描述明确有两个效果："摧毁所有其他玩家打到这里的战术"（打出时即时效果）+ "其他玩家不能打出战术到本基地上"（持续效果）。实现只有持续限制，缺少打出时的即时摧毁。修复方案：需要在 ornate_dome 打出时（onPlay 或 ongoing 附着时）遍历基地上所有非己方 ongoing 行动卡，发射 `ONGOING_DETACHED` 事件。

### steampunk_mechanic 和 steampunk_change_of_venue 的"打出"语义

两者描述都说"将其作为一个额外战术打出"，但实现都是取回手牌+给额外行动额度。这种间接实现在功能上接近（玩家可以用额外行动打出取回的卡），但有语义差异：玩家可能用额外行动打其他卡而非取回的卡。在 SmashUp 中这可能是可接受的简化，但严格来说不完全匹配描述。

### steampunk_steam_queen 拦截范围

当前只拦截 `ONGOING_DETACHED` 事件，但"不受影响"可能还应包括移动、返回手牌等效果。需要确认规则原文的"影响"范围。
