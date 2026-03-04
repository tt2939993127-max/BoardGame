# 审查 7.1：幽灵（Ghosts）派系多步骤能力

> 审查日期：2026-02-14
> 权威描述来源：`public/locales/zh-CN/game-smashup.json`

## 审查汇总

| 指标 | 数值 |
|------|------|
| 总交互链数 | 13 |
| ✅ 通过 | 9 |
| ⚠️ 语义偏差 | 3 |
| ❌ 缺失实现 | 1 |
| 📝 测试缺失 | 5 |
| 通过率 | 69.2% |

## 严重问题清单

| 优先级 | 交互链 | 问题 | 维度 |
|--------|--------|------|------|
| P0 | ghost_make_contact | 描述"你只能在本卡是你的唯一手牌时打出它"前置条件未实现 | D2 |
| P1 | ghost_ghost | "你可以"但无跳过选项，有手牌时强制弃牌 | D5 |
| P1 | ghost_the_dead_rise | 弃牌交互为多选但无 min/max 约束，也无跳过选项 | D5 |
| P2 | ghost_spirit | 目标过滤只选对手随从，但描述"选择一个随从"无敌我限定 | D1 |

---

## 审查矩阵

### 交互链 1：ghost_spectre — 弃牌堆被动打出

**权威描述**：「异能：如果你只有2张或更少的手牌，则任何你可以打出一个随从的时候，你可以从弃牌堆打出本卡代替。」

| 层 | 状态 | 证据 |
|----|------|------|
| 定义层 | ✅ | `data/factions/ghosts.ts` — 无 abilityTags（被动能力） |
| 注册层 | ✅ | `registerDiscardPlayProvider({ id: 'ghost_spectre', ... })` |
| 执行层 | ✅ | ① 手牌≤2 检查 `player.hand.length > 2` ✅。② 弃牌堆过滤 `defId === 'ghost_spectre'` ✅。③ `consumesNormalLimit: false`（额外打出）——描述说"代替"，但 SmashUp 中 spectre 的"代替"指可以在任何打出随从的时机使用，不消耗额外额度也合理。④ `allowedBaseIndices: 'all'` ✅ |
| 状态层 | ✅ | 通过 PLAY_MINION fromDiscard 命令处理 |
| 验证层 | ✅ | 手牌数量检查在 getPlayableCards 中 |
| UI 层 | ✅ | 通过 DiscardPlayProvider 系统自动展示 |
| i18n 层 | ✅ | 双语条目存在 |
| 测试层 | ✅ | 通过 DiscardPlayProvider 系统测试覆盖 |

### 交互链 2：ghost_haunting — 手牌少时+3力量+不受影响（持续）

**权威描述**：「持续：如果你只有2张或更少的手牌，本随从+3力量并且不能被其他玩家的卡牌影响。」

| 层 | 状态 | 证据 |
|----|------|------|
| 定义层 | ✅ | `data/factions/ghosts.ts` — `abilityTags: ['ongoing']` |
| 注册层 | ✅ | `ongoing_modifiers.ts` — `registerPowerModifier('ghost_haunting', ...)` + `registerProtection('ghost_haunting', 'affect', ...)` |
| 执行层 | ✅ | ① 力量修正：`player.hand.length <= 2` 时 +3 ✅。② 保护：`defId === 'ghost_haunting'` + `player.hand.length <= 2` + 非自身控制者 ✅。③ 两个效果条件一致 ✅ |
| 状态层 | ✅ | 通过 `getEffectivePower` 和保护系统 |
| 验证层 | N/A | |
| UI 层 | N/A | |
| i18n 层 | ✅ | 双语条目存在 |
| 测试层 | ✅ | `ongoingModifiers.test.ts` 有完整力量修正测试（≤2/=0/=2/>2/不影响其他随从） |

### 交互链 3：ghost_ghost — 弃一张手牌

**权威描述**：「你可以从你的手牌弃一张卡。」

| 层 | 状态 | 证据 |
|----|------|------|
| 定义层 | ✅ | `data/factions/ghosts.ts` — `abilityTags: ['onPlay']` |
| 注册层 | ✅ | `abilities/ghosts.ts` — `registerAbility('ghost_ghost', 'onPlay', ghostGhost)` |
| 执行层 | ⚠️ | ① 过滤手牌排除自身 `c.uid !== ctx.cardUid` ✅。② **"你可以"但无跳过选项**——有手牌时直接创建 Prompt 强制选择（D5 交互完整性违规）。③ handler 发射 `CARDS_DISCARDED` ✅ |
| 状态层 | ✅ | `CARDS_DISCARDED` 被 reduce 处理 |
| 验证层 | N/A | |
| UI 层 | ⚠️ | 缺少跳过选项 |
| i18n 层 | ✅ | 双语条目存在 |
| 测试层 | ✅ | `expansionAbilities.test.ts` 有多张/单张/空手牌场景测试 |

### 交互链 4：ghost_seance — 手牌少时抽牌到5张

**权威描述**：「如果你有2张或更少的手牌，抽牌直到你拥有5张手牌。」

| 层 | 状态 | 证据 |
|----|------|------|
| 定义层 | ✅ | `data/factions/ghosts.ts` — 行动卡，`subtype: 'standard'` |
| 注册层 | ✅ | `abilities/ghosts.ts` — `registerAbility('ghost_seance', 'onPlay', ghostSeance)` |
| 执行层 | ✅ | ① `handAfterPlay = player.hand.length - 1`（打出行动卡后手牌减1）✅。② `handAfterPlay > 2` 时不抽 ✅。③ `drawCount = 5 - handAfterPlay` ✅。④ 使用 `drawCards` 工具函数 ✅ |
| 状态层 | ✅ | `CARDS_DRAWN` 被 reduce 处理 |
| 验证层 | N/A | |
| UI 层 | N/A | 自动效果 |
| i18n 层 | ✅ | 双语条目存在 |
| 测试层 | ✅ | `expansionAbilities.test.ts` 有正向（手牌少抽到5）和负向（手牌多不抽）测试 |

### 交互链 5：ghost_shady_deal — 手牌少时获得1VP

**权威描述**：「如果你有2张或更少的手牌，则获得1VP。」

| 层 | 状态 | 证据 |
|----|------|------|
| 定义层 | ✅ | `data/factions/ghosts.ts` — 行动卡，`subtype: 'standard'` |
| 注册层 | ✅ | `abilities/ghosts.ts` — `registerAbility('ghost_shady_deal', 'onPlay', ghostShadyDeal)` |
| 执行层 | ✅ | ① `handAfterPlay = player.hand.length - 1` ✅。② `handAfterPlay > 2` 时不获得 ✅。③ 发射 `VP_AWARDED` 事件 ✅ |
| 状态层 | ✅ | `VP_AWARDED` 被 reduce 处理 |
| 验证层 | N/A | |
| UI 层 | N/A | 自动效果 |
| i18n 层 | ✅ | 双语条目存在 |
| 测试层 | ✅ | `expansionAbilities.test.ts` 有正向（获得VP）、负向（手牌多不获得）和累加测试 |

### 交互链 6：ghost_ghostly_arrival — 额外随从+行动

**权威描述**：「你可以打出一个额外的随从和/或一个额外的行动。」

| 层 | 状态 | 证据 |
|----|------|------|
| 定义层 | ✅ | `data/factions/ghosts.ts` — `abilityTags: ['extra']` |
| 注册层 | ✅ | `abilities/ghosts.ts` — `registerAbility('ghost_ghostly_arrival', 'onPlay', ghostGhostlyArrival)` |
| 执行层 | ✅ | ① `grantExtraMinion` + `grantExtraAction` 同时授予 ✅。② "你可以"——额度授予后玩家可选择不使用 ✅。③ "和/或"——两个额度独立，可只用一个 ✅ |
| 状态层 | ✅ | 两个 `LIMIT_MODIFIED` 被 reduce 处理 |
| 验证层 | N/A | |
| UI 层 | ✅ | 额度系统自动展示 |
| i18n 层 | ✅ | 双语条目存在 |
| 测试层 | ✅ | `expansionAbilities.test.ts` 有额度授予测试 |

### 交互链 7：ghost_incorporeal — 不受其他玩家影响（持续保护）

**权威描述**：「打出到你的一个随从上。持续：本随从不会受到其他玩家卡牌的影响。」

| 层 | 状态 | 证据 |
|----|------|------|
| 定义层 | ✅ | `data/factions/ghosts.ts` — `abilityTags: ['ongoing']`, `ongoingTarget: 'minion'` |
| 注册层 | ✅ | `registerProtection('ghost_incorporeal', 'affect', ghostIncorporealChecker)` |
| 执行层 | ✅ | ① 检查附着 `attachedActions.some(a => a.defId === 'ghost_incorporeal')` ✅。② 只保护不受其他玩家影响 `ctx.sourcePlayerId !== ctx.targetMinion.controller` ✅ |
| 状态层 | N/A | 保护拦截 |
| 验证层 | N/A | |
| UI 层 | N/A | |
| i18n 层 | ✅ | 双语条目存在 |
| 测试层 | ✅ | `ongoingEffects.test.ts` 有附着保护基础设施测试 |

### 交互链 8：ghost_door_to_the_beyond — 手牌少时同基地己方随从+2（持续）

**权威描述**：「打出到基地上。持续：如果你只有2张或更少的手牌，则每个你在此基地的随从+2力量。」

| 层 | 状态 | 证据 |
|----|------|------|
| 定义层 | ✅ | `data/factions/ghosts.ts` — `abilityTags: ['ongoing']` |
| 注册层 | ✅ | `ongoing_modifiers.ts` — `registerPowerModifier('ghost_door_to_the_beyond', ...)` |
| 执行层 | ✅ | ① 检查基地上有此 ongoing 且属于随从控制者 ✅。② 手牌≤2 检查 ✅。③ 返回 +2 ✅ |
| 状态层 | ✅ | 通过 `getEffectivePower` 计算 |
| 验证层 | N/A | |
| UI 层 | N/A | |
| i18n 层 | ✅ | 双语条目存在 |
| 测试层 | 📝 | 无专门行为测试 |

### 交互链 9：ghost_make_contact — 控制对手随从

**权威描述**：「你只能在本卡是你的唯一手牌时打出它。打出到一个随从上。持续：只要本卡和该随从都在场，则该随从视作你的随从。」

| 层 | 状态 | 证据 |
|----|------|------|
| 定义层 | ✅ | `data/factions/ghosts.ts` — `abilityTags: ['ongoing']`, `ongoingTarget: 'minion'` |
| 注册层 | ✅ | `abilities/ghosts.ts` — `registerAbility('ghost_make_contact', 'onPlay', ghostMakeContact)` |
| 执行层 | ❌ | ① **"你只能在本卡是你的唯一手牌时打出它"前置条件未实现**——`ghostMakeContact` 函数无手牌数量检查，任何时候都可打出（D2 边界完整违规：缺少前置条件校验）。② 选择对手随从交互 ✅。③ handler 发射 `ONGOING_ATTACHED` 事件 ✅。④ reduce 中 `ghost_make_contact` 附着时改变 `controller` ✅。⑤ 移除时恢复 `controller = m.owner` ✅ |
| 状态层 | ✅ | `ONGOING_ATTACHED` 在 reduce 中正确处理控制权变更 |
| 验证层 | ❌ | 缺少打出前置条件校验 |
| UI 层 | ✅ | 选择对手随从交互 |
| i18n 层 | ✅ | 双语条目存在 |
| 测试层 | 📝 | 无专门行为测试 |

### 交互链 10：ghost_spirit — 弃牌消灭随从

**权威描述**：「选择一个随从。你可以弃置等同于该随从力量数量的卡来消灭它。」

| 层 | 状态 | 证据 |
|----|------|------|
| 定义层 | ✅ | `data/factions/ghosts.ts` — `abilityTags: ['onPlay']` |
| 注册层 | ✅ | `abilities/ghosts.ts` — `registerAbility('ghost_spirit', 'onPlay', ghostSpirit)` |
| 执行层 | ⚠️ | ① **目标过滤 `m.controller === ctx.playerId` 排除己方随从**——描述说"选择一个随从"无敌我限定（D1 语义保真：多加了"只选对手"过滤）。② 力量≤可弃手牌数检查 ✅。③ 两步交互：选随从→选弃牌 ✅。④ "你可以"有跳过选项 ✅。⑤ 力量0时确认交互 ✅。⑥ 弃牌数量 = 力量值 ✅ |
| 状态层 | ✅ | `CARDS_DISCARDED` + `MINION_DESTROYED` 被 reduce 处理 |
| 验证层 | N/A | |
| UI 层 | ✅ | 选随从→选弃牌→确认/跳过 |
| i18n 层 | ✅ | 双语条目存在 |
| 测试层 | ✅ | `newFactionAbilities.test.ts` 有正向和边界测试 |

### 交互链 11：ghost_the_dead_rise — 弃牌后从弃牌堆打出随从

**权威描述**：「弃掉任意数量的卡。从你的弃牌堆中打出一个力量少于你弃牌数的额外随从。」

| 层 | 状态 | 证据 |
|----|------|------|
| 定义层 | ✅ | `data/factions/ghosts.ts` — `abilityTags: ['extra']` |
| 注册层 | ✅ | `abilities/ghosts.ts` — `registerAbility('ghost_the_dead_rise', 'onPlay', ghostTheDeadRise)` |
| 执行层 | ⚠️ | ① 多选弃牌交互 ✅。② **弃牌交互无 min/max 约束**——描述"任意数量"包含0，但实现中 handler 检查 `selectedCards.length === 0` 返回 undefined（错误），应允许弃0张（D5 交互完整性）。③ handler 中过滤弃牌堆 `def.power < discardCount`（严格小于）与描述"少于"一致 ✅。④ 链式选随从→选基地 ✅。⑤ `grantExtraMinion` 授予额度 ✅ |
| 状态层 | ✅ | `CARDS_DISCARDED` + `MINION_PLAYED` 被 reduce 处理 |
| 验证层 | N/A | |
| UI 层 | ⚠️ | 弃牌交互缺少跳过/弃0张选项 |
| i18n 层 | ✅ | 双语条目存在 |
| 测试层 | 📝 | 无专门行为测试 |

### 交互链 12：ghost_across_the_divide — 取回弃牌堆同名随从

**权威描述**：「选择一张卡的名字。将任意数量的该名字随从从你的弃牌堆放入你的手牌。」

| 层 | 状态 | 证据 |
|----|------|------|
| 定义层 | ✅ | `data/factions/ghosts.ts` — 行动卡，`subtype: 'standard'` |
| 注册层 | ✅ | `abilities/ghosts.ts` — `registerAbility('ghost_across_the_divide', 'onPlay', ghostAcrossTheDivide)` |
| 执行层 | ✅ | ① 弃牌堆按 defId 分组 ✅。② 选择卡名交互 ✅。③ handler 取回所有同名随从 ✅。④ "任意数量"——实现为选名后全部取回，与 zombie_not_enough_bullets 一致 |
| 状态层 | ✅ | `CARDS_RECOVERED` 被 reduce 处理 |
| 验证层 | N/A | |
| UI 层 | ✅ | 按名字分组选择 |
| i18n 层 | ✅ | 双语条目存在 |
| 测试层 | 📝 | 无专门行为测试 |

### 交互链 13：ghost_door_to_the_beyond — 力量修正（ongoing 部分单独审查）

已在交互链 8 中审查。

---

## 交叉影响备注

### ghost_make_contact 前置条件缺失

这是 P0 问题。描述明确说"你只能在本卡是你的唯一手牌时打出它"，但实现中无此校验。这意味着玩家可以在任何时候打出此卡控制对手随从，严重偏离设计意图。修复方案：在 `ghostMakeContact` 函数开头添加 `if (player.hand.filter(c => c.uid !== ctx.cardUid).length > 0) return { events: [] };` 或在 validate 层拦截。

### ghost_spirit 目标范围

描述"选择一个随从"无敌我限定，但实现只选对手随从。在 SmashUp 中，消灭自己的随从有时是有意义的（如触发 onDestroy 效果），此限制可能导致策略受限。
