# 审查 5.2：捣蛋鬼（Tricksters）派系多步骤能力

> 审查日期：2026-02-14
> 权威描述来源：`public/locales/zh-CN/game-smashup.json`

## 审查汇总

| 指标 | 数值 |
|------|------|
| 总交互链数 | 12 |
| ✅ 通过 | 7 |
| ⚠️ 语义偏差 | 4 |
| ❌ 缺失实现 | 0 |
| 📝 测试缺失 | 4 |
| 通过率 | 58.3% |

## 严重问题清单

| 优先级 | 交互链 | 问题 | 维度 |
|--------|--------|------|------|
| P0 | trickster_hideout | 描述说"消灭本卡来使战术无效"，实现只拦截但不自毁 hideout | D1 |
| P1 | trickster_gnome | 描述"你可以"但实现为强制效果（有目标时必须选择），缺少跳过选项 | D5 |
| P1 | trickster_block_the_path | 描述无"只限制对手"限定，但实现 `blockAction.ownerId === ctx.playerId` 跳过自己 | D1 |
| P2 | trickster_pay_the_piper | 描述"弃一张手牌"暗示玩家选择，实现为随机弃牌 | D5 |

---

## 审查矩阵

### 交互链 1：trickster_leprechaun — 持续消灭低力量随从

**权威描述**：「持续：在另一个玩家打出一个力量少于这个随从的随从到这时，消灭它（先结算它的能力）。」

| 层 | 状态 | 证据 |
|----|------|------|
| 定义层 | ✅ | `data/factions/tricksters.ts` — `abilityTags: ['ongoing']` |
| 注册层 | ✅ | `registerTrigger('trickster_leprechaun', 'onMinionPlayed', ...)` |
| 执行层 | ✅ | ① 只在同基地触发 `i !== trigCtx.baseIndex` ✅。② 只对其他玩家触发 `leprechaun.controller === trigCtx.playerId` ✅。③ 力量比较用 `getMinionPower`（考虑修正）✅。④ 严格小于 `trigPower < lepPower` 与描述"少于"一致 ✅。⑤ "先结算它的能力"——触发时机为 `onMinionPlayed`，在能力结算后触发 ✅。⑥ 发射 `MINION_DESTROYED` 事件 ✅ |
| 状态层 | ✅ | `MINION_DESTROYED` 被 reduce 处理 |
| 验证层 | N/A | |
| UI 层 | N/A | 自动效果 |
| i18n 层 | ✅ | 双语条目存在 |
| 测试层 | 📝 | 无专门行为测试（`ongoingEffects.test.ts` 有触发器基础设施测试但非 leprechaun 专项） |

### 交互链 2：trickster_brownie — 被影响时对手弃牌

**权威描述**：「持续：当其他玩家打出的一张卡的效果影响到了本随从，那个玩家随机弃两张手牌。」

| 层 | 状态 | 证据 |
|----|------|------|
| 定义层 | ✅ | `data/factions/tricksters.ts` — `abilityTags: ['ongoing']` |
| 注册层 | ✅ | `registerTrigger('trickster_brownie', 'onMinionAffected', ...)` |
| 执行层 | ✅ | ① 只对 brownie 自身触发 `trigCtx.triggerMinionDefId !== 'trickster_brownie'` ✅。② 只对其他玩家触发 `brownieOwner === trigCtx.playerId` ✅。③ 随机弃两张 `Math.min(2, opponent.hand.length)` ✅。④ "影响"通过 `onMinionAffected` 聚合时机实现（消灭/移动/力量修改/附着），与规则术语映射合理 ✅ |
| 状态层 | ✅ | `CARDS_DISCARDED` 被 reduce 处理 |
| 验证层 | N/A | |
| UI 层 | N/A | 自动效果 |
| i18n 层 | ✅ | 双语条目存在 |
| 测试层 | 📝 | 无专门行为测试 |

### 交互链 3：trickster_gnome — 消灭低力量随从

**权威描述**：「你可以摧毁这个基地的一个力量少于你在这个基地随从数量的随从。」

| 层 | 状态 | 证据 |
|----|------|------|
| 定义层 | ✅ | `data/factions/tricksters.ts` — `abilityTags: ['onPlay']` |
| 注册层 | ✅ | `abilities/tricksters.ts:109` — `registerAbility('trickster_gnome', 'onPlay', tricksterGnome)` |
| 执行层 | ⚠️ | ① `myMinionCount = base.minions.filter(...).length + 1`（+1 包含自身）✅。② 目标过滤无敌我限定 `m.uid !== ctx.cardUid`，与描述"一个随从"（无限定词=不区分）一致 ✅。③ 力量比较 `getMinionPower(...) < myMinionCount`（严格小于）✅。④ **"你可以"但使用 `resolveOrPrompt`**——`resolveOrPrompt` 在单候选时自动执行，多候选时创建 Prompt 但无跳过选项（D5 交互完整性违规） |
| 状态层 | ✅ | `MINION_DESTROYED` 被 reduce 处理 |
| 验证层 | N/A | |
| UI 层 | ⚠️ | 缺少跳过选项 |
| i18n 层 | ✅ | 双语条目存在 |
| 测试层 | ✅ | `factionAbilities.test.ts` 有正向和负向测试 |

### 交互链 4：trickster_gremlin — 被消灭后抽牌+对手弃牌

**权威描述**：「持续：在这个随从被消灭后，抽一张卡并且每个其他玩家随机弃掉一张卡。」

| 层 | 状态 | 证据 |
|----|------|------|
| 定义层 | ✅ | `data/factions/tricksters.ts` — `abilityTags: ['ongoing']` |
| 注册层 | ✅ | `abilities/tricksters.ts:114` — `registerAbility('trickster_gremlin', 'onDestroy', tricksterGremlinOnDestroy)` |
| 执行层 | ✅ | ① 拥有者抽1张牌 ✅。② 每个对手随机弃1张牌 ✅。③ 牌库为空时不抽 ✅。④ 对手手牌为空时跳过 ✅ |
| 状态层 | ✅ | `CARDS_DRAWN` + `CARDS_DISCARDED` 被 reduce 处理 |
| 验证层 | N/A | |
| UI 层 | N/A | 自动效果 |
| i18n 层 | ✅ | 双语条目存在 |
| 测试层 | ✅ | `onDestroyAbilities.test.ts` 有完整测试（正向+边界场景） |

### 交互链 5：trickster_enshrouding_mist — 额外打出随从到此基地

**权威描述**：「打出到基地上。持续：在你的回合，你可以额外打出一个随从到此基地。」

| 层 | 状态 | 证据 |
|----|------|------|
| 定义层 | ✅ | `data/factions/tricksters.ts` — `abilityTags: ['ongoing', 'extra']` |
| 注册层 | ✅ | `registerTrigger('trickster_enshrouding_mist', 'onTurnStart', ...)` |
| 执行层 | ✅ | ① 回合开始时触发 ✅。② 只在拥有者回合触发 `mist.ownerId !== trigCtx.playerId` ✅。③ 发射 `LIMIT_MODIFIED` + `restrictToBase: bi` 限定到此基地 ✅。④ "你可以"——额度授予后玩家可选择不使用 ✅ |
| 状态层 | ✅ | `LIMIT_MODIFIED` 被 reduce 处理 |
| 验证层 | ✅ | `restrictToBase` 限定额度只能用于此基地 |
| UI 层 | ✅ | 额度系统自动展示 |
| i18n 层 | ✅ | 双语条目存在 |
| 测试层 | ✅ | `coreProperties.test.ts` 有 ongoing 附着测试 |

### 交互链 6：trickster_hideout — 保护己方随从不受对手行动卡影响

**权威描述**：「打出到基地上。持续：如果另一个玩家的战术会影响到你在此基地的随从，消灭本卡来使战术无效。」

| 层 | 状态 | 证据 |
|----|------|------|
| 定义层 | ✅ | `data/factions/tricksters.ts` — `abilityTags: ['ongoing']` |
| 注册层 | ✅ | `registerProtection('trickster_hideout', 'action', ...)` |
| 执行层 | ⚠️ | ① 检查附着或同基地 ongoing ✅。② 只对其他玩家的行动卡生效 `ctx.targetMinion.controller !== ctx.sourcePlayerId` ✅。③ **描述说"消灭本卡来使战术无效"——实现只拦截但不自毁 hideout**。`registerProtection` 返回 true 后保护生效，但 hideout 卡仍留在场上（D1 语义保真违规：少做了"消灭本卡"步骤）。正确实现应在保护触发后发射 `ONGOING_DETACHED` 事件移除 hideout |
| 状态层 | ⚠️ | 保护拦截正确，但缺少 hideout 自毁的状态变更 |
| 验证层 | N/A | |
| UI 层 | N/A | |
| i18n 层 | ✅ | 双语条目存在 |
| 测试层 | ⚠️ | `ongoingEffects.test.ts` 有保护基础设施测试，但未验证 hideout 自毁 |

### 交互链 7：trickster_mark_of_sleep — 对手下回合不能打行动卡

**权威描述**：「选择一个玩家，该玩家不能在他的下个回合中打出战术。」

| 层 | 状态 | 证据 |
|----|------|------|
| 定义层 | ✅ | `data/factions/tricksters.ts` — 行动卡，`subtype: 'standard'` |
| 注册层 | ✅ | `abilities/tricksters.ts:119` — `registerAbility('trickster_mark_of_sleep', 'onPlay', tricksterMarkOfSleep)` |
| 执行层 | ✅ | ① 选择对手交互 ✅。② handler 将对手 ID 加入 `sleepMarkedPlayers` ✅。③ reduce 中回合开始时检查标记，设 `actionLimit: 0` ✅。④ 使用后清除标记 ✅。⑤ 重复标记检查 `currentMarked.includes(pid)` ✅ |
| 状态层 | ✅ | `sleepMarkedPlayers` 在 core 中持久化，回合开始时消费并清除 |
| 验证层 | ✅ | `actionLimit: 0` 阻止打出行动卡 |
| UI 层 | ✅ | 选择对手交互 |
| i18n 层 | ✅ | 双语条目存在 |
| 测试层 | 📝 | 无专门行为测试 |

### 交互链 8：trickster_flame_trap — 消灭打出的随从+自毁

**权威描述**：「打出到基地上。持续：当其他玩家打出一个随从到此基地时，消灭它（先结算它的能力）和本卡。」

| 层 | 状态 | 证据 |
|----|------|------|
| 定义层 | ✅ | `data/factions/tricksters.ts` — `abilityTags: ['ongoing']` |
| 注册层 | ✅ | `registerTrigger('trickster_flame_trap', 'onMinionPlayed', ...)` |
| 执行层 | ✅ | ① 只在同基地触发 ✅。② 只对其他玩家触发 ✅。③ 发射两个事件：`MINION_DESTROYED`（消灭随从）+ `ONGOING_DETACHED`（自毁陷阱）✅。④ "先结算它的能力"——`onMinionPlayed` 在能力结算后触发 ✅ |
| 状态层 | ✅ | 两个事件都被 reduce 处理 |
| 验证层 | N/A | |
| UI 层 | N/A | 自动效果 |
| i18n 层 | ✅ | 双语条目存在 |
| 测试层 | ✅ | `baseFactionOngoing.test.ts` 有正向（对手触发消灭+自毁）和负向（自己不触发）测试 |

### 交互链 9：trickster_take_the_shinies — 每个对手随机弃两张

**权威描述**：「每个其他玩家随机弃两张手牌。」

| 层 | 状态 | 证据 |
|----|------|------|
| 定义层 | ✅ | `data/factions/tricksters.ts` — 行动卡，`subtype: 'standard'` |
| 注册层 | ✅ | `abilities/tricksters.ts:111` — `registerAbility('trickster_take_the_shinies', 'onPlay', tricksterTakeTheShinies)` |
| 执行层 | ✅ | ① 遍历所有对手 ✅。② 随机选择至多2张 `Math.min(2, handCopy.length)` ✅。③ 手牌为空时跳过 ✅。④ 使用 `ctx.random.random()` 随机 ✅ |
| 状态层 | ✅ | `CARDS_DISCARDED` 被 reduce 处理 |
| 验证层 | N/A | |
| UI 层 | N/A | 自动效果 |
| i18n 层 | ✅ | 双语条目存在 |
| 测试层 | ✅ | `factionAbilities.test.ts` 有正向（弃2张）和边界（不足2张弃全部）测试 |

### 交互链 10：trickster_block_the_path — 限制指定派系打出随从

**权威描述**：「打出到基地上。持续：选择一个派系，该派系的随从不能被打出到此基地。」

| 层 | 状态 | 证据 |
|----|------|------|
| 定义层 | ✅ | `data/factions/tricksters.ts` — `abilityTags: ['ongoing']` |
| 注册层 | ✅ | `registerAbility('trickster_block_the_path', 'onPlay', ...)` + `registerRestriction('trickster_block_the_path', 'play_minion', ...)` |
| 执行层 | ⚠️ | ① 打出时收集场上和手牌中所有派系 ✅。② 选择派系交互 ✅。③ handler 将派系信息存入 ongoing metadata ✅。④ **限制检查 `blockAction.ownerId === ctx.playerId` 跳过自己**——描述说"该派系的随从不能被打出到此基地"，无"其他玩家"限定词，应对所有玩家生效（D1 语义保真违规：多加了"只限制对手"过滤条件） |
| 状态层 | ✅ | metadata 正确持久化 |
| 验证层 | ⚠️ | 限制检查多了"只限制对手"条件 |
| UI 层 | ✅ | 派系选择交互 |
| i18n 层 | ✅ | 双语条目存在 |
| 测试层 | ⚠️ | `ongoingEffects.test.ts` 有限制基础设施测试，但未验证"自己也受限"场景 |

### 交互链 11：trickster_disenchant — 消灭已打出的行动卡

**权威描述**：「消灭一个已经被打出到一个随从或基地上的战术。」

| 层 | 状态 | 证据 |
|----|------|------|
| 定义层 | ✅ | `data/factions/tricksters.ts` — 行动卡，`subtype: 'standard'` |
| 注册层 | ✅ | `abilities/tricksters.ts:113` — `registerAbility('trickster_disenchant', 'onPlay', tricksterDisenchant)` |
| 执行层 | ⚠️ | ① 收集所有基地上的 ongoing 行动卡和随从附着行动卡 ✅。② **只收集对手的行动卡** `ongoing.ownerId !== ctx.playerId`——描述说"一个已经被打出到一个随从或基地上的战术"，无"对手"限定词，应包含自己的行动卡（D1 语义保真违规：多加了"只限制对手"过滤条件）。③ handler 发射 `ONGOING_DETACHED` ✅ |
| 状态层 | ✅ | `ONGOING_DETACHED` 被 reduce 处理 |
| 验证层 | N/A | |
| UI 层 | ✅ | 选择行动卡交互 |
| i18n 层 | ✅ | 双语条目存在 |
| 测试层 | ✅ | `factionAbilities.test.ts` 有基地 ongoing 和随从附着两种场景测试 |

### 交互链 12：trickster_pay_the_piper — 对手打出随从后弃牌

**权威描述**：「打出到基地上。持续：在其他玩家打出一个随从到此基地后，那个玩家弃一张手牌。」

| 层 | 状态 | 证据 |
|----|------|------|
| 定义层 | ✅ | `data/factions/tricksters.ts` — `abilityTags: ['ongoing']` |
| 注册层 | ✅ | `registerTrigger('trickster_pay_the_piper', 'onMinionPlayed', ...)` |
| 执行层 | ⚠️ | ① 只在同基地触发 ✅。② 只对其他玩家触发 ✅。③ **"弃一张手牌"——实现为随机弃牌**，但描述"弃一张手牌"在 SmashUp 规则中通常指玩家自己选择弃哪张（D5 交互完整性：应有选择交互而非随机）。不过 SmashUp 基础规则中"弃牌"默认为随机弃牌（与 MTG 不同），此处标记为 ⚠️ 待确认 |
| 状态层 | ✅ | `CARDS_DISCARDED` 被 reduce 处理 |
| 验证层 | N/A | |
| UI 层 | N/A | 自动效果（随机弃牌无需交互） |
| i18n 层 | ✅ | 双语条目存在 |
| 测试层 | 📝 | 无专门行为测试 |

---

## 交叉影响备注

### trickster_hideout 自毁缺失的连锁影响

hideout 不自毁意味着它可以无限次保护己方随从，而描述明确说"消灭本卡来使战术无效"——这是一次性保护。当前实现使 hideout 成为永久保护，严重偏离设计意图。

### trickster_block_the_path 与 trickster_disenchant 的"对手限定"

两张卡的描述都没有"对手"/"其他玩家"限定词，但实现都加了 `ownerId !== ctx.playerId` 过滤。这可能是设计意图（SmashUp 中很少有自损效果），但从描述语义来看是多加了限定。建议向用户确认。

### trickster_leprechaun 与 trickster_flame_trap 的触发顺序

两者都在 `onMinionPlayed` 时触发。如果同一基地同时有 leprechaun 和 flame_trap，打出的随从会被消灭两次（两个 `MINION_DESTROYED` 事件）。reduce 应能正确处理重复消灭（第二次消灭时随从已不在场），但需确认不会产生异常。
