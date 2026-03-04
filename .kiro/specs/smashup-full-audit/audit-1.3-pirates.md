# 审查 1.3：海盗（Pirates）派系语义审计

> 审查日期：2026-02-15
> 权威描述来源：`public/locales/zh-CN/game-smashup.json`

## 审查汇总

| 指标 | 数值 |
|------|------|
| 总交互链数 | 12 |
| ✅ 通过 | 12 |
| ⚠️ 语义偏差 | 0 |
| ❌ 缺失实现 | 0 |
| 📝 测试缺失 | 9 |
| 通过率 | 100% |
| 本轮修复 Bug | 3（pirate_king/pirate_first_mate/alien_scout 的 ctx.playerId 过滤问题） |

## 严重问题清单

| 优先级 | 交互链 | 问题 | 反模式 | 状态 |
|--------|--------|------|--------|------|
| P1 | pirate_saucy_wench | "你可以"无跳过选项，有目标时强制消灭 | #1 | ✅ 已修复 — 添加跳过选项 |
| P1 | pirate_king | "你可以"自动执行无确认，自动移动到计分基地 | #1 | ✅ 已修复 — 确认/拒绝交互+多王链式处理 |
| P1 | pirate_king | `ctx.playerId` 过滤导致只有当前回合玩家的海盗王触发 | 玩家归属错误 | ✅ 已修复 — 移除 playerId 过滤，交互发给 controller |
| P1 | pirate_first_mate | "你可以移动你的两个随从"自动执行无确认 + 自动选第一个基地 | #1 + #6 | ✅ 已修复 — 选择至多2个己方随从+基地选择+跳过 |
| P1 | pirate_first_mate | `ctx.playerId` 过滤导致只有当前回合玩家的大副触发 | 玩家归属错误 | ✅ 已修复 — 移除 playerId 过滤，为每个 mate 的 controller 独立创建交互 |
| P1 | alien_scout (关联修复) | `ctx.playerId` 过滤导致只有当前回合玩家的侦察兵触发 afterScoring | 玩家归属错误 | ✅ 已修复 — 移除 playerId 过滤，交互发给 controller |
| ⚠️ | pirate_dinghy | "至多两个"第二个随从无跳过选项（强制选第二个） | #1 轻微 | ✅ 已修复 — 第二步添加跳过选项 |
| ⚠️ | pirate_cannon | "至多两个"第二个目标无跳过选项（强制选第二个） | #1 轻微 | ✅ 已修复 — 第二步添加跳过选项 |
| ⚠️ | pirate_buccaneer | "你可以"替代效果自动选第一个基地，无玩家选择 | #6 | ✅ 已修复 — 改为 onMinionDestroyed trigger，多基地时创建玩家选择交互 |
| P3 | 全部 | 多数能力缺少行为测试 | #4 | — |

---

## 审查矩阵

### 交互链 1：pirate_king — 基地计分前移动到该基地（special，可选）

**权威描述**：「特殊：在一个基地计分前，你可以移动本随从到那里。」

| 层 | 状态 | 证据 |
|----|------|------|
| 定义层 | ✅ | `data/factions/pirates.ts` — `abilityTags: ['special']`, power: 5 |
| 注册层 | ✅ | `pirates.ts:42` — `registerTrigger('pirate_king', 'beforeScoring', pirateKingBeforeScoring)` |
| 执行层 | ✅ | ✅ 已修复 — 遍历所有基地找不在计分基地的 `pirate_king`（不限当前回合玩家），创建确认/拒绝交互。多个 pirate_king 链式处理（每个单独确认）。交互发送给各 king 的 `controller`。无 matchState 时回退自动移动 |
| 状态层 | ✅ | `MINION_MOVED` 被 reduce 处理 |
| 验证层 | N/A | |
| UI 层 | ✅ | ✅ 已修复 — `createSimpleChoice` 含"移动到该基地"/"留在原地"选项 |
| i18n 层 | ✅ | 双语条目存在 |
| 测试层 | 📝 | 无行为测试 |

**Bug 修复记录**：
- ❌ 旧实现：`m.controller === ctx.playerId` 只处理当前回合玩家的海盗王
- ✅ 新实现：移除 `ctx.playerId` 过滤，遍历所有玩家的 pirate_king；交互 playerId 使用 `first.controller` / `next.controller`
- 规则依据：SmashUp 规则「记分前能力 (Before Scoring)：可使用"在基地记分前"能力」未限定只有当前玩家

### 交互链 2：pirate_buccaneer — 被消灭时移动到其他基地（special，替代效果）

**权威描述**：「特殊：如果本随从将要被消灭，将其移动到其他基地来代替。」

| 层 | 状态 | 证据 |
|----|------|------|
| 定义层 | ✅ | `data/factions/pirates.ts` — `abilityTags: ['special']`, power: 4 |
| 注册层 | ✅ | `pirates.ts` — `registerTrigger('pirate_buccaneer', 'onMinionDestroyed', buccaneerOnDestroyed)` + `registerInteractionHandler('pirate_buccaneer_move', buccaneerMoveHandler)` |
| 执行层 | ✅ | ✅ 已修复 — 改为 onMinionDestroyed trigger。无其他基地→正常消灭；1 个其他基地→自动移动；2+ 个其他基地→创建 `createSimpleChoice` 交互让玩家选择目标基地。通过 `pendingSaveMinionUids` 机制暂缓消灭等待交互解决 |
| 状态层 | ✅ | `MINION_MOVED` 替换 `MINION_DESTROYED` |
| 验证层 | N/A | |
| UI 层 | ✅ | ✅ 已修复 — 多基地时通过 `createSimpleChoice` 展示基地选择 UI |
| i18n 层 | ✅ | 双语条目存在 |
| 测试层 | ✅ | 7 个行为测试覆盖（自动移动/无基地/非 buccaneer/不在场/多基地交互/handler 注册/reducer） |

### 交互链 3：pirate_saucy_wench — 消灭本基地力量≤2随从（可选）

**权威描述**：「你可以消灭本基地的一个力量为2或以下的随从。」

| 层 | 状态 | 证据 |
|----|------|------|
| 定义层 | ✅ | `data/factions/pirates.ts` — `abilityTags: ['onPlay']`, power: 3 |
| 注册层 | ✅ | `pirates.ts:22` — `registerAbility('pirate_saucy_wench', 'onPlay', pirateSaucyWench)` |
| 执行层 | ✅ | ✅ 已修复 — 过滤本基地 `getMinionPower <= 2`（排除自身），创建选择交互含跳过选项。handler 处理 `{ skip: true }` |
| 状态层 | ✅ | `MINION_DESTROYED` 被 reduce 处理 |
| 验证层 | N/A | |
| UI 层 | ✅ | ✅ 已修复 — `createSimpleChoice` 含"跳过"选项 |
| i18n 层 | ✅ | 双语条目存在 |
| 测试层 | 📝 | 无行为测试 |

### 交互链 4：pirate_first_mate — 基地计分后移动到其他基地（special，可选）

**权威描述**：「特殊：在本基地计分后，你可以移动你的两个随从到其他基地而不是弃牌堆。」

| 层 | 状态 | 证据 |
|----|------|------|
| 定义层 | ✅ | `data/factions/pirates.ts` — `abilityTags: ['special']`, power: 2 |
| 注册层 | ✅ | `pirates.ts:43` — `registerTrigger('pirate_first_mate', 'afterScoring', pirateFirstMateAfterScoring)` |
| 执行层 | ✅ | ✅ 已修复 — 收集计分基地上所有 first_mate（不限当前回合玩家），为每个 first_mate 的 controller 独立创建"选择第1个随从"交互含跳过选项。选择后链式选目标基地→移动→选第2个随从（可跳过）→选基地→移动。描述"你的两个随从"正确实现为选择至多2个己方随从 |
| 状态层 | ✅ | `MINION_MOVED` 被 reduce 处理 |
| 验证层 | N/A | |
| UI 层 | ✅ | ✅ 已修复 — 多步 `createSimpleChoice` 含跳过选项 |
| i18n 层 | ✅ | 双语条目存在 |
| 测试层 | 📝 | 无行为测试 |

**Bug 修复记录**：
- ❌ 旧实现：`m.controller === ctx.playerId` 只处理当前回合玩家的大副
- ✅ 新实现：移除 `ctx.playerId` 过滤，遍历所有 first_mate；为每个 mate 的 `controller` 独立创建交互
- 规则依据：SmashUp 规则「记分后清理：使用"记分后"能力」未限定只有当前玩家

### 交互链 5：pirate_dinghy — 移动至多两个己方随从

**权威描述**：「移动至多你的两个随从到其他基地。」

| 层 | 状态 | 证据 |
|----|------|------|
| 定义层 | ✅ | 标准行动卡 |
| 注册层 | ✅ | `pirates.ts:30` — `registerAbility('pirate_dinghy', 'onPlay', pirateDinghy)` |
| 执行层 | ✅ | 四步链：选第一个随从→选目标基地→移动→选第二个随从→选目标基地→移动。过滤 `controller === playerId` |
| 状态层 | ✅ | `MINION_MOVED` 被 reduce 处理 |
| 验证层 | N/A | |
| UI 层 | ✅ | ✅ 已修复 — 第二步含跳过选项 |
| i18n 层 | ✅ | 双语条目存在 |
| 测试层 | 📝 | 无行为测试 |

### 交互链 6：pirate_powderkeg — 消灭己方随从+同基地低力量随从

**权威描述**：「消灭一个你的随从之后消灭所有同基地中与你被消灭的随从相等力量或更低的随从。」

| 层 | 状态 | 证据 |
|----|------|------|
| 定义层 | ✅ | 标准行动卡 |
| 注册层 | ✅ | `pirates.ts:27` — `registerAbility('pirate_powderkeg', 'onPlay', piratePowderkeg)` |
| 执行层 | ✅ | 选择己方随从，handler 计算其力量，先消灭选中随从，再消灭同基地所有 `getMinionPower <= power` 的其他随从。描述"相等力量或更低"，实现 `<= power`，正确 |
| 状态层 | ✅ | 多个 `MINION_DESTROYED` 被 reduce 处理 |
| 验证层 | N/A | |
| UI 层 | ✅ | `createSimpleChoice` 选择牺牲随从 |
| i18n 层 | ✅ | 双语条目存在 |
| 测试层 | 📝 | 无行为测试 |

### 交互链 7：pirate_broadside — 消灭对手在己方有随从基地的所有力量≤2随从

**权威描述**：「消灭一个你拥有一个随从的基地里的一个玩家的所有力量为2或以下的随从。」

| 层 | 状态 | 证据 |
|----|------|------|
| 定义层 | ✅ | 标准行动卡 |
| 注册层 | ✅ | `pirates.ts:23` — `registerAbility('pirate_broadside', 'onPlay', pirateBroadside)` |
| 执行层 | ✅ | 收集所有 (基地, 对手) 组合（基地需有己方随从），选择后消灭该对手在该基地所有 `getMinionPower <= 2` 的随从。描述"一个玩家的所有力量≤2"，实现正确 |
| 状态层 | ✅ | 多个 `MINION_DESTROYED` 被 reduce 处理 |
| 验证层 | N/A | |
| UI 层 | ✅ | `createSimpleChoice` 选择基地+对手组合 |
| i18n 层 | ✅ | 双语条目存在 |
| 测试层 | 📝 | 无行为测试 |

### 交互链 8：pirate_full_sail — 移动任意数量己方随从（special）

**权威描述**：「移动你任意数量的随从到其他基地。特殊：在一个基地计分前，你可以打出本卡。」

| 层 | 状态 | 证据 |
|----|------|------|
| 定义层 | ✅ | `data/factions/pirates.ts` — `subtype: 'special'`, `abilityTags: ['special']` |
| 注册层 | ✅ | `pirates.ts:32` — `registerAbility('pirate_full_sail', 'special', pirateFullSail)` |
| 执行层 | ✅ | 循环链：选己方随从→选目标基地→移动→继续选或完成。`buildFullSailChooseMinionInteraction` 排除已移动随从，含"完成移动"选项 |
| 状态层 | ✅ | `MINION_MOVED` 被 reduce 处理 |
| 验证层 | ✅ | `commands.ts` 验证 `subtype === 'special'` 只能在 Me First! 响应窗口打出；`specialNeedsBase` 要求选择达标基地 |
| UI 层 | ✅ | 循环 `createSimpleChoice` 含"完成移动"选项 |
| i18n 层 | ✅ | 双语条目存在 |
| 测试层 | 📝 | 无行为测试 |

**特殊时机验证**：
- ✅ `subtype: 'special'` 确保只能在 Me First! 窗口打出
- ✅ Me First! 窗口在 `onPhaseEnter('scoreBases')` 中通过 `openMeFirstWindow` 打开
- ✅ 响应窗口循环机制（loopUntilAllPass）确保所有玩家有机会响应

### 交互链 9：pirate_cannon — 消灭至多两个力量≤2随从

**权威描述**：「消灭至多两个力量为2或以下的随从。」

| 层 | 状态 | 证据 |
|----|------|------|
| 定义层 | ✅ | 标准行动卡 |
| 注册层 | ✅ | `pirates.ts:24` — `registerAbility('pirate_cannon', 'onPlay', pirateCannon)` |
| 执行层 | ✅ | 两步链：选第一个目标→消灭→选第二个目标→消灭。遍历所有基地过滤 `getMinionPower <= 2` |
| 状态层 | ✅ | `MINION_DESTROYED` 被 reduce 处理 |
| 验证层 | N/A | |
| UI 层 | ✅ | ✅ 已修复 — 第二步含跳过选项 |
| i18n 层 | ✅ | 双语条目存在 |
| 测试层 | 📝 | 无行为测试 |

### 交互链 10：pirate_shanghai — 移动对手随从到另一基地

**权威描述**：「移动一个其他玩家的随从到另一个基地。」

| 层 | 状态 | 证据 |
|----|------|------|
| 定义层 | ✅ | 标准行动卡 |
| 注册层 | ✅ | `pirates.ts:34` — `registerAbility('pirate_shanghai', 'onPlay', pirateShanghai)` |
| 执行层 | ✅ | 两步链：选对手随从→选目标基地→`moveMinion`。过滤 `controller !== playerId`，正确 |
| 状态层 | ✅ | `MINION_MOVED` 被 reduce 处理 |
| 验证层 | N/A | |
| UI 层 | ✅ | 两步 `createSimpleChoice` |
| i18n 层 | ✅ | 双语条目存在 |
| 测试层 | 📝 | 无行为测试 |

### 交互链 11：pirate_sea_dogs — 指定派系，批量移动对手随从

**权威描述**：「指定一个派系。移动所有其他玩家该派系的随从从一个基地到另一个。」

| 层 | 状态 | 证据 |
|----|------|------|
| 定义层 | ✅ | 标准行动卡 |
| 注册层 | ✅ | `pirates.ts:35` — `registerAbility('pirate_sea_dogs', 'onPlay', pirateSeaDogs)` |
| 执行层 | ✅ | 三步链：选派系→选来源基地→选目标基地→批量移动该派系对手随从。描述"从一个基地到另一个"，实现正确限定单基地来源 |
| 状态层 | ✅ | 多个 `MINION_MOVED` 被 reduce 处理 |
| 验证层 | N/A | |
| UI 层 | ✅ | 三步 `createSimpleChoice` |
| i18n 层 | ✅ | 双语条目存在 |
| 测试层 | 📝 | 无行为测试 |

### 交互链 12：pirate_swashbuckling — 全部己方随从+1力量（回合结束）

**权威描述**：「你的每个随从获得+1力量直到回合结束。」

| 层 | 状态 | 证据 |
|----|------|------|
| 定义层 | ✅ | 标准行动卡 |
| 注册层 | ✅ | `pirates.ts:25` — `registerAbility('pirate_swashbuckling', 'onPlay', pirateSwashbuckling)` |
| 执行层 | ✅ | 遍历所有基地己方随从，`addPowerCounter(uid, baseIndex, 1, ...)`。描述"直到回合结束"，`addPowerCounter` 在回合结束时自动清除 |
| 状态层 | ✅ | `POWER_COUNTER_ADDED` 被 reduce 处理 |
| 验证层 | N/A | |
| UI 层 | N/A | 无交互 |
| i18n 层 | ✅ | 双语条目存在 |
| 测试层 | 📝 | 无行为测试 |
