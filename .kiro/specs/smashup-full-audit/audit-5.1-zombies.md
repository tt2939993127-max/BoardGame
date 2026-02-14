# 审查 5.1：僵尸（Zombies）派系多步骤能力

> 审查日期：2026-02-14
> 权威描述来源：`public/locales/zh-CN/game-smashup.json`

## 审查汇总

| 指标 | 数值 |
|------|------|
| 总交互链数 | 12 |
| ✅ 通过 | 8 |
| ⚠️ 语义偏差 | 3 |
| ❌ 缺失实现 | 0 |
| 📝 测试缺失 | 5 |
| 通过率 | 66.7% |

## 严重问题清单

| 优先级 | 交互链 | 问题 | 维度 |
|--------|--------|------|------|
| P1 | zombie_grave_digger | "你可以"但无跳过选项，弃牌堆有随从时强制选择 | D5 |
| P1 | zombie_lend_a_hand | "任意数量"应允许选0张，但实现 min:1 强制至少选1张 | D1 |
| P2 | zombie_mall_crawl | 实现先发 CARDS_DRAWN 再发 CARDS_DISCARDED（经手牌中转），描述说"置入弃牌堆"应直接从牌库到弃牌堆 | D2 |

---

## 审查矩阵

### 交互链 1：zombie_lord — 多基地遍历+弃牌堆额外打出力量≤2随从

**权威描述**：「你可以从弃牌堆在每个没有你随从的基地额外打出一个力量为2或以下的随从。」

| 层 | 状态 | 证据 |
|----|------|------|
| 定义层 | ✅ | `data/factions/zombies.ts` — `abilityTags: ['onPlay', 'extra']` |
| 注册层 | ✅ | `abilities/zombies.ts:35` — `registerAbility('zombie_lord', 'onPlay', zombieLord)` |
| 执行层 | ✅ | ① 找没有己方随从的基地 ✅。② 弃牌堆过滤 `type === 'minion' && def.power <= 2` ✅。③ 合并交互：选随从+选基地一步完成 ✅。④ "你可以"有"完成"按钮跳过 ✅。⑤ 每轮更新 `usedCardUids` 和 `filledBases`，限定条件全程约束 ✅。⑥ handler 中检查剩余基地和剩余随从，无则终止 ✅ |
| 状态层 | ✅ | `MINION_PLAYED` + `fromDiscard: true` 被 reduce 处理 |
| 验证层 | N/A | |
| UI 层 | ✅ | 合并交互 + "完成"跳过按钮 |
| i18n 层 | ✅ | 双语条目存在 |
| 测试层 | 📝 | 仅有交互完整性审计注册，无行为测试 |

### 交互链 2：zombie_grave_digger — 弃牌堆取回随从到手牌

**权威描述**：「你可以将一个随从从你的弃牌堆置入你的手牌中。」

| 层 | 状态 | 证据 |
|----|------|------|
| 定义层 | ✅ | `data/factions/zombies.ts` — `abilityTags: ['onPlay']` |
| 注册层 | ✅ | `abilities/zombies.ts:28` — `registerAbility('zombie_grave_digger', 'onPlay', zombieGraveDigger)` |
| 执行层 | ⚠️ | ① 过滤弃牌堆中随从 ✅。② **"你可以"但无跳过选项**——弃牌堆有随从时直接创建 Prompt 强制选择，无"跳过"按钮（D5 交互完整性违规）。③ handler 通过 `recoverCardsFromDiscard` 取回 ✅ |
| 状态层 | ✅ | `CARDS_RECOVERED` 被 reduce 处理 |
| 验证层 | N/A | |
| UI 层 | ⚠️ | 缺少跳过选项 |
| i18n 层 | ✅ | 双语条目存在 |
| 测试层 | ✅ | `zombieWizardAbilities.test.ts` 有正向（有随从创建 Prompt）和负向（无随从不产生事件）测试 |

### 交互链 3：zombie_walker — 查看牌库顶+弃掉或保留

**权威描述**：「查看你牌库顶的一张牌，弃掉它或将其返回你的牌库顶。」

| 层 | 状态 | 证据 |
|----|------|------|
| 定义层 | ✅ | `data/factions/zombies.ts` — `abilityTags: ['onPlay']` |
| 注册层 | ✅ | `abilities/zombies.ts:29` — `registerAbility('zombie_walker', 'onPlay', zombieWalker)` |
| 执行层 | ✅ | ① 牌库为空时返回空 ✅。② 读取 `deck[0]` 作为牌库顶 ✅。③ 创建二选一交互：弃掉/放回 ✅。④ 非"你可以"，强制二选一正确。⑤ handler 中 `keep` 直接返回（牌未移除，留在牌库顶）✅，`discard` 发射 `CARDS_DISCARDED` ✅。⑥ 私有查看，不发 REVEAL_DECK_TOP ✅ |
| 状态层 | ✅ | `CARDS_DISCARDED` 被 reduce 处理 |
| 验证层 | N/A | |
| UI 层 | ✅ | 二选一交互完整 |
| i18n 层 | ✅ | 双语条目存在 |
| 测试层 | ✅ | `zombieWizardAbilities.test.ts` 有创建 Prompt 测试 |

### 交互链 4：zombie_grave_robbing — 弃牌堆取回一张卡到手牌

**权威描述**：「将一张卡从你的弃牌堆置入你的手牌中。」

| 层 | 状态 | 证据 |
|----|------|------|
| 定义层 | ✅ | `data/factions/zombies.ts` — 行动卡，`subtype: 'standard'` |
| 注册层 | ✅ | `abilities/zombies.ts:30` — `registerAbility('zombie_grave_robbing', 'onPlay', zombieGraveRobbing)` |
| 执行层 | ✅ | ① 弃牌堆为空时返回空 ✅。② 展示所有弃牌堆卡牌（随从+行动），与描述"一张卡"一致 ✅。③ 非"你可以"，强制选择正确。④ handler 通过 `recoverCardsFromDiscard` 取回 ✅ |
| 状态层 | ✅ | `CARDS_RECOVERED` 被 reduce 处理 |
| 验证层 | N/A | |
| UI 层 | ✅ | 单选交互 |
| i18n 层 | ✅ | 双语条目存在 |
| 测试层 | ✅ | `zombieWizardAbilities.test.ts` 有多张/单张弃牌场景测试 |

### 交互链 5：zombie_not_enough_bullets — 取回弃牌堆同名随从

**权威描述**：「将任意数量的同名随从从你的弃牌堆置入你的手牌中。」

| 层 | 状态 | 证据 |
|----|------|------|
| 定义层 | ✅ | `data/factions/zombies.ts` — 行动卡，`subtype: 'standard'` |
| 注册层 | ✅ | `abilities/zombies.ts:31` — `registerAbility('zombie_not_enough_bullets', 'onPlay', zombieNotEnoughBullets)` |
| 执行层 | ✅ | ① 弃牌堆按 defId 分组 ✅。② 玩家选择一个随从名 ✅。③ handler 取回该 defId 的所有随从 ✅。④ "任意数量的同名"——实现为选名后全部取回，描述可理解为"选一个名字，取回所有同名"，语义合理 |
| 状态层 | ✅ | `CARDS_RECOVERED` 被 reduce 处理 |
| 验证层 | N/A | |
| UI 层 | ✅ | 按名字分组选择 |
| i18n 层 | ✅ | 双语条目存在 |
| 测试层 | 📝 | 仅有交互完整性审计注册，无行为测试 |

### 交互链 6：zombie_lend_a_hand — 弃牌堆洗回牌库

**权威描述**：「将任意数量的牌从你的弃牌堆洗回你的牌库中。」

| 层 | 状态 | 证据 |
|----|------|------|
| 定义层 | ✅ | `data/factions/zombies.ts` — 行动卡，`subtype: 'standard'` |
| 注册层 | ✅ | `abilities/zombies.ts:32` — `registerAbility('zombie_lend_a_hand', 'onPlay', zombieLendAHand)` |
| 执行层 | ⚠️ | ① 弃牌堆为空时返回空 ✅。② 多选交互 `min: 1, max: player.discard.length` ✅。③ **"任意数量"应允许选0张**（即跳过），但 `min: 1` 强制至少选1张——描述"任意数量"包含0（D1 语义保真违规）。④ handler 将选中卡与牌库合并后洗牌 ✅ |
| 状态层 | ✅ | `DECK_RESHUFFLED` 被 reduce 处理 |
| 验证层 | N/A | |
| UI 层 | ⚠️ | 缺少选0张（跳过）的选项 |
| i18n 层 | ✅ | 双语条目存在 |
| 测试层 | 📝 | 仅有交互完整性审计注册，无行为测试 |

### 交互链 7：zombie_outbreak — 空基地额外打出随从

**权威描述**：「在一个没有你随从的基地额外打出一个随从。」

| 层 | 状态 | 证据 |
|----|------|------|
| 定义层 | ✅ | `data/factions/zombies.ts` — `abilityTags: ['extra']` |
| 注册层 | ✅ | `abilities/zombies.ts:33` — `registerAbility('zombie_outbreak', 'onPlay', zombieOutbreak)` |
| 执行层 | ✅ | ① 找没有己方随从的基地 ✅。② 检查手牌中有随从 ✅。③ 两步交互：选基地→选随从 ✅。④ handler 中 `grantExtraMinion` 授予额度 ✅。⑤ 第二步 handler 将随从打出到第一步选定的 `targetBaseIndex`，限定条件全程约束 ✅。⑥ 非"你可以"，强制执行正确 |
| 状态层 | ✅ | `LIMIT_MODIFIED` + `MINION_PLAYED` 被 reduce 处理 |
| 验证层 | N/A | |
| UI 层 | ✅ | 两步链式交互 |
| i18n 层 | ✅ | 双语条目存在 |
| 测试层 | 📝 | 仅有交互完整性审计注册（含链式 handler），无行为测试 |

### 交互链 8：zombie_mall_crawl — 搜索牌库同名卡放入弃牌堆

**权威描述**：「从你的牌库搜寻任意数量的同名的卡牌并将它们置入你的弃牌堆。之后重洗牌库。」

| 层 | 状态 | 证据 |
|----|------|------|
| 定义层 | ✅ | `data/factions/zombies.ts` — 行动卡，`subtype: 'standard'` |
| 注册层 | ✅ | `abilities/zombies.ts:34` — `registerAbility('zombie_mall_crawl', 'onPlay', zombieMallCrawl)` |
| 执行层 | ⚠️ | ① 牌库按 defId 分组 ✅。② 玩家选择一个卡名 ✅。③ handler 发射 `CARDS_DRAWN`（牌库→手牌）然后 `CARDS_DISCARDED`（手牌→弃牌堆）——**语义上应直接从牌库到弃牌堆**，不应经过手牌中转（D2 事件生命周期违规）。④ **描述说"之后重洗牌库"，但实现未发射 `DECK_RESHUFFLED` 事件**——缺少洗牌步骤 |
| 状态层 | ⚠️ | `CARDS_DRAWN` + `CARDS_DISCARDED` 被 reduce 处理，但缺少 `DECK_RESHUFFLED` |
| 验证层 | N/A | |
| UI 层 | ✅ | 按名字分组选择 |
| i18n 层 | ✅ | 双语条目存在 |
| 测试层 | 📝 | 仅有交互完整性审计注册，无行为测试 |

### 交互链 9：zombie_they_keep_coming — 弃牌堆额外打出随从

**权威描述**：「从你的弃牌堆中额外打出一个随从。」

| 层 | 状态 | 证据 |
|----|------|------|
| 定义层 | ✅ | `data/factions/zombies.ts` — `abilityTags: ['extra']` |
| 注册层 | ✅ | `abilities/zombies.ts:36` — `registerAbility('zombie_they_keep_coming', 'onPlay', zombieTheyKeepComing)` |
| 执行层 | ✅ | ① 弃牌堆过滤随从 ✅。② 选随从→选基地链式交互 ✅。③ `grantExtraMinion` 授予额度 ✅。④ 单基地时自动打出 ✅。⑤ `fromDiscard: true` 标记 ✅ |
| 状态层 | ✅ | `LIMIT_MODIFIED` + `MINION_PLAYED` 被 reduce 处理 |
| 验证层 | N/A | |
| UI 层 | ✅ | 链式交互（选随从→选基地） |
| i18n 层 | ✅ | 双语条目存在 |
| 测试层 | ✅ | 交互完整性审计含链式 handler 注册 |

### 交互链 10：zombie_overrun — 限制+回合开始自毁

**权威描述**：「打出到基地上。持续：其他玩家不能打出随从到此基地。在你的回合开始的时候消灭本战术。」

| 层 | 状态 | 证据 |
|----|------|------|
| 定义层 | ✅ | `data/factions/zombies.ts` — `abilityTags: ['ongoing']` |
| 注册层 | ✅ | `registerRestriction('zombie_overrun', 'play_minion', ...)` + `registerTrigger('zombie_overrun', 'onTurnStart', ...)` |
| 执行层 | ✅ | ① 限制检查：`ctx.playerId !== overrun.ownerId` 只限制非拥有者 ✅。② 自毁触发：`overrun.ownerId !== ctx.playerId` 只在拥有者回合触发 ✅。③ 发射 `ONGOING_DETACHED` 事件 ✅ |
| 状态层 | ✅ | `ONGOING_DETACHED` 被 reduce 处理 |
| 验证层 | ✅ | 限制检查正确拦截非拥有者的 play_minion |
| UI 层 | N/A | 自动效果 |
| i18n 层 | ✅ | 双语条目存在 |
| 测试层 | ✅ | `ongoingEffects.test.ts` 有限制和触发器基础设施测试 |

### 交互链 11：zombie_tenacious_z — 弃牌堆被动额外打出

**权威描述**：「异能：在你的回合中你可以从弃牌堆中把本随从作为额外随从打出，你每回合只能使用一个顽强丧尸的能力。」

| 层 | 状态 | 证据 |
|----|------|------|
| 定义层 | ✅ | `data/factions/zombies.ts` — `abilityTags: ['extra']` |
| 注册层 | ✅ | `registerDiscardPlayProvider({ id: 'zombie_tenacious_z', ... })` |
| 执行层 | ✅ | ① 每回合限一次：检查 `usedDiscardPlayAbilities` ✅。② 只取第一张（每回合只能用一个）✅。③ `consumesNormalLimit: false`（额外打出）✅。④ `allowedBaseIndices: 'all'`（可打到任意基地）✅ |
| 状态层 | ✅ | 通过 PLAY_MINION fromDiscard 命令处理 |
| 验证层 | ✅ | `usedDiscardPlayAbilities` 检查防止重复使用 |
| UI 层 | ✅ | 通过 DiscardPlayProvider 系统自动展示在可打出列表中 |
| i18n 层 | ✅ | 双语条目存在 |
| 测试层 | ✅ | 通过 DiscardPlayProvider 系统测试覆盖 |

### 交互链 12：zombie_theyre_coming_to_get_you — 持续弃牌堆打出

**权威描述**：「打出到基地上。持续：在你的回合，你可以从你的弃牌堆而不是你的手中打出一个随从到此基地。」

| 层 | 状态 | 证据 |
|----|------|------|
| 定义层 | ✅ | `data/factions/zombies.ts` — `abilityTags: ['ongoing']` |
| 注册层 | ✅ | `registerDiscardPlayProvider({ id: 'zombie_theyre_coming_to_get_you', ... })` |
| 执行层 | ✅ | ① 找附着了此 ongoing 卡的基地 ✅。② `allowedBaseIndices` 限定到这些基地 ✅。③ `consumesNormalLimit: true`（替代手牌，消耗正常额度）✅。④ 弃牌堆所有随从都可打出 ✅。⑤ "你可以"——通过 DiscardPlayProvider 系统，玩家可选择不使用 ✅ |
| 状态层 | ✅ | 通过 PLAY_MINION fromDiscard 命令处理 |
| 验证层 | ✅ | 基地限定通过 `allowedBaseIndices` 约束 |
| UI 层 | ✅ | 通过 DiscardPlayProvider 系统自动展示 |
| i18n 层 | ✅ | 双语条目存在 |
| 测试层 | ✅ | 通过 DiscardPlayProvider 系统测试覆盖 |

---

## 交叉影响备注

### zombie_mall_crawl 事件路径问题

当前实现发射 `CARDS_DRAWN` → `CARDS_DISCARDED`，这意味着卡牌先进入手牌再被弃掉。如果有"抽牌时触发"的效果（如某些基地能力），会被错误触发。正确实现应使用专用事件（如 `CARDS_SEARCHED_TO_DISCARD`）或直接操作弃牌堆，并补充 `DECK_RESHUFFLED` 事件。

### zombie_lord 与 grantExtraMinion

zombie_lord 不使用 `grantExtraMinion`，而是直接通过 `MINION_PLAYED` + `fromDiscard: true` 打出。这是正确的，因为描述说"额外打出"但 lord 的打出不消耗正常额度，且每个空基地限一个。
