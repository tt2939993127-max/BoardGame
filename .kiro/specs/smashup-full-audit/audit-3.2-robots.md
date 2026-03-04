# 审查 3.2：机器人（Robots）派系多步骤能力

> 审查日期：2026-02-14
> 权威描述来源：`public/locales/zh-CN/game-smashup.json`

## 审查汇总

| 指标 | 数值 |
|------|------|
| 总交互链数 | 12 |
| ✅ 通过 | 6 |
| ⚠️ 语义偏差 | 4 |
| ❌ 缺失实现 | 0 |
| 📝 测试缺失 | 7 |
| 通过率 | 50.0% |

## 严重问题清单

| 优先级 | 交互链 | 问题 | 反模式 |
|--------|--------|------|--------|
| P0 | robot_microbot_alpha | "所有随从均视为微型机"未实现标记系统，archive 触发器和 reclaimer 回收仍用硬编码 defId 集合判断微型机 | — |
| P1 | robot_microbot_reclaimer | "任意数量的微型机"自动全部洗回，无玩家选择交互 | #1 |
| P1 | robot_microbot_fixer | "你的每个微型机的力量+1"实现为所有己方随从+1（隐式依赖 alpha 的"视为微型机"），但 alpha 不在场时也对非微型机生效 | — |
| P2 | robot_microbot_guard | `myMinionCount` 计算包含自身（+1），但 onPlay 时自身可能尚未在基地上，需确认时序 | — |

---

## 审查矩阵

### 交互链 1：robot_microbot_alpha — 双持续效果（+力量 + 视为微型机）

**权威描述**：「持续：你每有一个其他的微型机在场上，都让微型机阿尔法号力量+1。你的所有随从均视为微型机。」

| 层 | 状态 | 证据 |
|----|------|------|
| 定义层 | ✅ | `data/factions/robots.ts` — `abilityTags: ['ongoing']` |
| 注册层 | ✅（部分） | `ongoing_modifiers.ts:51` — `registerPowerModifier('robot_microbot_alpha', ...)` 力量修正已注册。**但"视为微型机"无标记注册** |
| 执行层 | ⚠️ | 力量修正：计算所有己方其他随从数量（所有基地），正确。**但"所有随从均视为微型机"未实现**——无 tag/flag 系统，`robot_microbot_archive` 的 `onMinionDestroyed` 触发器仍用硬编码 `microbotDefIds` 集合判断，非微型机随从被消灭时不会触发 archive 抽牌。`robot_microbot_reclaimer` 的弃牌堆回收同理。 |
| 状态层 | ✅ | 力量修正通过 `getEffectivePower` 正确计算 |
| 验证层 | N/A | |
| UI 层 | N/A | |
| i18n 层 | ✅ | 双语条目存在 |
| 测试层 | ⚠️ | `ongoingModifiers.test.ts` 有力量修正测试（跨基地、不计对手），但无"视为微型机"联动测试 |

### 交互链 2：robot_microbot_fixer — 条件额外打出 + 持续+1力量

**权威描述**：「如果这是你在本回合中打出的第一个随从，你可以打出一张额外的随从。持续：你的每个微型机的力量+1。」

| 层 | 状态 | 证据 |
|----|------|------|
| 定义层 | ✅ | `data/factions/robots.ts` — `abilityTags: ['onPlay', 'extra', 'ongoing']` |
| 注册层 | ✅ | `abilities/robots.ts:24` — `registerAbility('robot_microbot_fixer', 'onPlay', robotMicrobotFixer)` + `ongoing_modifiers.ts:69` — `registerPowerModifier('robot_microbot_fixer', ...)` |
| 执行层 | ⚠️ | ① 条件判断 `player.minionsPlayed > 0` 正确（第一个随从时 minionsPlayed 尚为 0）。② 额外打出通过 `grantExtraMinion` 授予额度，玩家可选择是否使用，合理。③ **力量修正对所有己方随从生效**（注释说"因为阿尔法号让所有随从视为微型机"），但 alpha 不在场时也对非微型机随从生效——描述说"你的每个微型机"，非微型机不应受益 |
| 状态层 | ✅ | `LIMIT_MODIFIED` 事件被 reduce 处理 |
| 验证层 | N/A | |
| UI 层 | N/A | |
| i18n 层 | ✅ | 双语条目存在 |
| 测试层 | ⚠️ | `ongoingModifiers.test.ts` 有修正测试，但未测试"alpha 不在场时非微型机不应受益"的场景 |

### 交互链 3：robot_microbot_reclaimer — 条件额外打出 + 微型机回收

**权威描述**：「如果这是你在本回合中打出的第一个随从，你可以打出一张额外的随从。从你的弃牌堆中将任意数量的微型机洗回你的牌库。」

| 层 | 状态 | 证据 |
|----|------|------|
| 定义层 | ✅ | `data/factions/robots.ts` — `abilityTags: ['onPlay', 'extra']` |
| 注册层 | ✅ | `abilities/robots.ts:25` — `registerAbility('robot_microbot_reclaimer', 'onPlay', robotMicrobotReclaimer)` |
| 执行层 | ⚠️ | ① 条件判断 `player.minionsPlayed === 0` 正确。② **"任意数量"自动全部洗回**，无玩家选择交互——描述"任意数量"暗示玩家可选择数量（0到全部），但实现自动将所有微型机洗回（反模式 #1 变体）。③ 微型机判断用硬编码 `microbotDefIds` 集合，不受 alpha "视为微型机"影响 |
| 状态层 | ✅ | `DECK_RESHUFFLED` 事件被 reduce 处理 |
| 验证层 | N/A | |
| UI 层 | ⚠️ | 无选择交互，应有多选 Prompt 让玩家选择回收哪些微型机 |
| i18n 层 | ✅ | 双语条目存在 |
| 测试层 | 📝 | 无行为测试 |

### 交互链 4：robot_microbot_archive — 微型机被消灭后抽牌（持续触发）

**权威描述**：「持续：每当你的一个微型机（包括本随从）被消灭后，抓一张牌。」

| 层 | 状态 | 证据 |
|----|------|------|
| 定义层 | ✅ | `data/factions/robots.ts` — `abilityTags: ['ongoing']` |
| 注册层 | ✅ | `abilities/robots.ts:322+` — `registerTrigger('robot_microbot_archive', 'onMinionDestroyed', ...)` |
| 执行层 | ⚠️ | ① 触发条件用硬编码 `microbotDefIds` 判断是否微型机——不受 alpha "视为微型机"影响。② 找 archive 拥有者时只找第一个 archive（`break`），多个 archive 场景未处理。③ "包括本随从"——archive 自身被消灭时，代码先找场上 archive，但此时 archive 可能已从场上移除（取决于 reduce 时序），需确认 |
| 状态层 | ✅ | `CARDS_DRAWN` 事件被 reduce 处理 |
| 验证层 | N/A | |
| UI 层 | N/A | |
| i18n 层 | ✅ | 双语条目存在 |
| 测试层 | ✅ | `baseFactionOngoing.test.ts` 有正向（微型机被消灭触发）和负向（非微型机不触发）测试 |

### 交互链 5：robot_microbot_guard — 消灭力量低于己方随从数的随从

**权威描述**：「消灭本基地上一个力量低于你在这里随从数量的随从。」

| 层 | 状态 | 证据 |
|----|------|------|
| 定义层 | ✅ | `data/factions/robots.ts` — `abilityTags: ['onPlay']` |
| 注册层 | ✅ | `abilities/robots.ts:23` — `registerAbility('robot_microbot_guard', 'onPlay', robotMicrobotGuard)` |
| 执行层 | ✅ | ① 目标过滤无敌我限定（`m.uid !== ctx.cardUid`），与描述一致。② `myMinionCount = base.minions.filter(...).length + 1`（+1 包含自身），力量比较用 `getMinionPower(...) < myMinionCount`（严格小于），与描述"低于"一致。③ 无目标时静默返回，有目标时创建 Prompt 选择 |
| 状态层 | ✅ | `destroyMinion` → `MINION_DESTROYED` |
| 验证层 | N/A | |
| UI 层 | ✅ | `createSimpleChoice` + handler 注册 |
| i18n 层 | ✅ | 双语条目存在 |
| 测试层 | 📝 | `promptResponseChain.test.ts` 有交互链注册测试，无行为测试 |

### 交互链 6：robot_hoverbot — 展示牌库顶+条件打出

**权威描述**：「展示你牌库顶的牌。如果它是随从牌，你可以将其作为额外随从打出。否则将其回你的牌库顶。」

| 层 | 状态 | 证据 |
|----|------|------|
| 定义层 | ✅ | `data/factions/robots.ts` — `abilityTags: ['onPlay', 'extra']` |
| 注册层 | ✅ | `abilities/robots.ts:26` — `registerAbility('robot_hoverbot', 'onPlay', robotHoverbot)` |
| 执行层 | ✅ | ① `peekDeckTop` 展示牌库顶并发射 reveal 事件。② 是随从时创建交互：打出/跳过二选一（"你可以"有跳过选项 ✅）。③ 非随从时直接返回（peek 不移除卡，留在牌库顶）。④ 打出时链式选基地（多基地场景） |
| 状态层 | ✅ | `MINION_PLAYED` + `fromDeck: true` 被 reduce 处理 |
| 验证层 | N/A | |
| UI 层 | ✅ | 打出/跳过选项 + 基地选择链式交互 |
| i18n 层 | ✅ | 双语条目存在 |
| 测试层 | 📝 | 无行为测试 |

### 交互链 7：robot_zapbot — 额外打出力量≤2随从

**权威描述**：「你可以打出一张力量为2或更低的额外随从。」

| 层 | 状态 | 证据 |
|----|------|------|
| 定义层 | ✅ | `data/factions/robots.ts` — `abilityTags: ['extra']` |
| 注册层 | ✅ | `abilities/robots.ts:27` — `registerAbility('robot_zapbot', 'onPlay', robotZapbot)` |
| 执行层 | ✅ | ① 手牌过滤 `def.power <= 2`（力量≤2），正确。② "你可以"有跳过选项 ✅。③ handler 中二次验证 `def.power > 2` 拒绝，限定条件全程约束 ✅。④ 多基地链式选基地 |
| 状态层 | ✅ | `grantExtraMinion` + `MINION_PLAYED` |
| 验证层 | N/A | |
| UI 层 | ✅ | 随从选择 + 跳过 + 基地选择 |
| i18n 层 | ✅ | 双语条目存在 |
| 测试层 | ✅ | `factionAbilities.test.ts` 有正向（有合格随从创建交互）和负向（无合格随从无交互）测试 |

### 交互链 8：robot_warbot — 不能被消灭（持续保护）

**权威描述**：「持续：本随从不能被消灭。」

| 层 | 状态 | 证据 |
|----|------|------|
| 定义层 | ✅ | `data/factions/robots.ts` — `abilityTags: ['ongoing']` |
| 注册层 | ✅ | `abilities/robots.ts:322+` — `registerProtection('robot_warbot', 'destroy', ...)` |
| 执行层 | ✅ | 保护条件 `ctx.targetMinion.defId === 'robot_warbot'`，只保护 warbot 自身，正确 |
| 状态层 | N/A | 保护拦截，无状态变更 |
| 验证层 | N/A | |
| UI 层 | N/A | |
| i18n 层 | ✅ | 双语条目存在 |
| 测试层 | ✅ | `baseFactionOngoing.test.ts` 有正向（warbot 受保护）和负向（非 warbot 不受保护）测试 |

### 交互链 9：robot_nukebot — 被消灭后消灭其他玩家随从（onDestroy）

**权威描述**：「持续：在本随从被消灭后，消灭本基地上其他玩家的所有随从。」

| 层 | 状态 | 证据 |
|----|------|------|
| 定义层 | ✅ | `data/factions/robots.ts` — `abilityTags: ['ongoing']` |
| 注册层 | ✅ | `abilities/robots.ts:32` — `registerAbility('robot_nukebot', 'onDestroy', robotNukebotOnDestroy)` |
| 执行层 | ✅ | 过滤 `m.controller !== ctx.playerId`（其他玩家），排除自身 `m.uid !== ctx.cardUid`。对所有目标发射 `destroyMinion` 事件 |
| 状态层 | ✅ | `MINION_DESTROYED` 被 reduce 处理 |
| 验证层 | N/A | |
| UI 层 | N/A | 自动执行，无需交互 |
| i18n 层 | ✅ | 双语条目存在 |
| 测试层 | ✅ | `onDestroyAbilities.test.ts` 有覆盖 |

### 交互链 10：robot_tech_center — 按基地随从数抽牌

**权威描述**：「选择一个基地。该基地上你每有一个随从，就抓一张牌。」

| 层 | 状态 | 证据 |
|----|------|------|
| 定义层 | ✅ | `data/factions/robots.ts` — 行动卡，`subtype: 'standard'` |
| 注册层 | ✅ | `abilities/robots.ts:30` — `registerAbility('robot_tech_center', 'onPlay', robotTechCenter)` |
| 执行层 | ✅ | ① 收集有己方随从的基地。② 创建 Prompt 选择基地。③ handler 按选中基地己方随从数抽牌 |
| 状态层 | ✅ | `CARDS_DRAWN` 事件被 reduce 处理 |
| 验证层 | N/A | |
| UI 层 | ✅ | `createSimpleChoice` + handler |
| i18n 层 | ✅ | 双语条目存在 |
| 测试层 | ✅ | `factionAbilities.test.ts` 有基本测试 |

### 交互链 11：robot_microbot_fixer — 持续力量修正（ongoing 部分单独审查）

**权威描述**：「持续：你的每个微型机的力量+1。」

| 层 | 状态 | 证据 |
|----|------|------|
| 定义层 | ✅ | 与交互链 2 共享 |
| 注册层 | ✅ | `ongoing_modifiers.ts:69` — `registerPowerModifier('robot_microbot_fixer', ...)` |
| 执行层 | ⚠️ | 修正对所有同控制者随从生效（注释说"因为阿尔法号让所有随从视为微型机"）。**但 alpha 不在场时，非微型机随从也获得+1，与描述"你的每个微型机"不一致**。正确实现应检查 alpha 是否在场：alpha 在场→所有己方随从+1；alpha 不在场→仅微型机+1 |
| 状态层 | ✅ | 通过 `getEffectivePower` 计算 |
| 验证层 | N/A | |
| UI 层 | N/A | |
| i18n 层 | ✅ | 与交互链 2 共享 |
| 测试层 | ⚠️ | 有修正测试但未覆盖"alpha 不在场时非微型机不应受益"场景 |

### 交互链 12：robot_microbot_alpha — 力量修正（ongoing 部分单独审查）

**权威描述**：「持续：你每有一个其他的微型机在场上，都让微型机阿尔法号力量+1。」

| 层 | 状态 | 证据 |
|----|------|------|
| 定义层 | ✅ | 与交互链 1 共享 |
| 注册层 | ✅ | `ongoing_modifiers.ts:51` — `registerPowerModifier('robot_microbot_alpha', ...)` |
| 执行层 | ✅ | 计算所有己方其他随从数量（所有基地），只对 alpha 自身生效。由于 alpha 自身的"视为微型机"效果，所有己方随从都算微型机，所以计算所有己方其他随从是正确的 |
| 状态层 | ✅ | 通过 `getEffectivePower` 计算 |
| 验证层 | N/A | |
| UI 层 | N/A | |
| i18n 层 | ✅ | 与交互链 1 共享 |
| 测试层 | ✅ | `ongoingModifiers.test.ts` 有完整测试（跨基地、不计对手、不影响其他随从） |

---

## 交叉影响备注

### "视为微型机"联动缺陷

`robot_microbot_alpha` 的"你的所有随从均视为微型机"效果缺乏统一的标记系统，导致以下消费点不一致：

| 消费点 | 当前行为 | 正确行为 |
|--------|---------|---------|
| `robot_microbot_fixer` 力量修正 | ✅ 对所有己方随从生效（隐式正确，但 alpha 不在场时也生效） | alpha 在场→所有己方随从；alpha 不在场→仅微型机 |
| `robot_microbot_alpha` 力量修正 | ✅ 计算所有己方其他随从（正确，因为 alpha 自身在场时所有随从都是微型机） | 正确 |
| `robot_microbot_archive` 触发器 | ❌ 硬编码 `microbotDefIds` 判断 | alpha 在场→所有己方随从被消灭都触发；alpha 不在场→仅微型机 |
| `robot_microbot_reclaimer` 回收 | ❌ 硬编码 `microbotDefIds` 判断 | alpha 在场→弃牌堆所有己方随从都可回收；alpha 不在场→仅微型机 |
| `robot_microbot_guard` 目标判断 | N/A（不涉及微型机判断） | N/A |

**建议修复**：创建统一的 `isMicrobot(state, minion)` 查询函数，检查 alpha 是否在场来决定判断逻辑。所有消费点统一调用此函数。
