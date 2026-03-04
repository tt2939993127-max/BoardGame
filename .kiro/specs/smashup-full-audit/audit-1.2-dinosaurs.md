# 审查 1.2：恐龙（Dinosaurs）派系语义审计

> 审查日期：2026-02-15
> 权威描述来源：`public/locales/zh-CN/game-smashup.json`

## 审查汇总

| 指标 | 数值 |
|------|------|
| 总交互链数 | 12 |
| ✅ 通过 | 11 |
| ⚠️ 语义偏差 | 1 |
| ❌ 缺失实现 | 0 |
| 📝 测试缺失 | 9 |
| 通过率 | 91.7% |

## 严重问题清单

| 优先级 | 交互链 | 问题 | 反模式 |
|--------|--------|------|--------|
| ⚠️ | dino_armor_stego | "其他玩家的回合中"判断使用 `currentPlayerIndex`，计分阶段可能不在任何玩家回合中，当前实现保守正确 | 边界情况 |
| P3 | 全部 | 多数能力缺少行为测试 | #4 |

---

## 审查矩阵

### 交互链 1：dino_king_rex — 无能力（纯力量7）

**权威描述**：无能力描述

| 层 | 状态 | 证据 |
|----|------|------|
| 定义层 | ✅ | `data/factions/dinosaurs.ts` — power: 7, 无 abilityTags |
| 注册层 | ✅ | 无需注册 |
| 执行层 | ✅ | 无能力，纯力量贡献 |
| 状态层 | N/A | |
| 验证层 | N/A | |
| UI 层 | N/A | |
| i18n 层 | ✅ | 双语条目存在 |
| 测试层 | N/A | |

### 交互链 2：dino_laser_triceratops — 消灭本基地力量≤2随从

**权威描述**：「消灭一个本基地的力量为2或以下的随从。」

| 层 | 状态 | 证据 |
|----|------|------|
| 定义层 | ✅ | `data/factions/dinosaurs.ts` — `abilityTags: ['onPlay']`, power: 4 |
| 注册层 | ✅ | `dinosaurs.ts:22` — `registerAbility('dino_laser_triceratops', 'onPlay', dinoLaserTriceratops)` |
| 执行层 | ✅ | 过滤本基地 `getMinionPower <= 2`（排除自身），使用 `resolveOrPrompt` 单候选自动执行。描述为强制效果（无"你可以"），正确 |
| 状态层 | ✅ | `MINION_DESTROYED` 被 reduce 处理 |
| 验证层 | N/A | |
| UI 层 | ✅ | `resolveOrPrompt` 多候选时创建 `createSimpleChoice` |
| i18n 层 | ✅ | 双语条目存在 |
| 测试层 | 📝 | 无行为测试 |

### 交互链 3：dino_armor_stego — 其他玩家回合+2力量（ongoing）

**权威描述**：「持续：在其他玩家的回合中+2力量。」

| 层 | 状态 | 证据 |
|----|------|------|
| 定义层 | ✅ | `data/factions/dinosaurs.ts` — `abilityTags: ['ongoing']`, power: 2 |
| 注册层 | ✅ | `ongoing_modifiers.ts` — `registerPowerModifier('dino_armor_stego', ...)` |
| 执行层 | ✅ | 检查 `currentPlayer !== ctx.minion.controller` 时 +2。只对自身 defId 生效 |
| 状态层 | ✅ | 通过 `getEffectivePower` 动态计算 |
| 验证层 | N/A | |
| UI 层 | N/A | 无交互 |
| i18n 层 | ✅ | 双语条目存在 |
| 测试层 | ⚠️ | 计分阶段 `currentPlayerIndex` 语义需确认（保守实现：计分时非自己回合=+2，合理） |

### 交互链 4：dino_war_raptor — 同基地每个战斗迅猛龙+1力量（ongoing）

**权威描述**：「持续：这个基地每有一个战斗迅猛龙（包括本卡）使本卡获得+1力量。」

| 层 | 状态 | 证据 |
|----|------|------|
| 定义层 | ✅ | `data/factions/dinosaurs.ts` — `abilityTags: ['ongoing']`, power: 2 |
| 注册层 | ✅ | `ongoing_modifiers.ts` — `registerPowerModifier('dino_war_raptor', ...)` |
| 执行层 | ✅ | 只对自身 defId 生效，计算同基地同控制者 `dino_war_raptor` 数量。描述"包括本卡"，实现含自身，正确 |
| 状态层 | ✅ | 通过 `getEffectivePower` 动态计算 |
| 验证层 | N/A | |
| UI 层 | N/A | 无交互 |
| i18n 层 | ✅ | 双语条目存在 |
| 测试层 | 📝 | 无行为测试 |

### 交互链 5：dino_wildlife_preserve — 保护己方随从不受对手战术影响（ongoing）

**权威描述**：「打出到基地上。持续：你在这里的随从不会受到其他玩家的战术影响。」

| 层 | 状态 | 证据 |
|----|------|------|
| 定义层 | ✅ | `data/factions/dinosaurs.ts` — `subtype: 'ongoing'`, `ongoingTarget: 'base'` |
| 注册层 | ✅ | `dinosaurs.ts:38` — `registerProtection('dino_wildlife_preserve', 'action', dinoWildlifePreserveChecker)` |
| 执行层 | ✅ | 检查基地上是否有 `dino_wildlife_preserve` ongoing 且 `ownerId === targetMinion.controller`。保护类型 `'action'` 对应"战术"，正确 |
| 状态层 | ✅ | 通过 `isMinionProtected` 在各能力 handler 中检查 |
| 验证层 | N/A | |
| UI 层 | N/A | 无交互 |
| i18n 层 | ✅ | 双语条目存在 |
| 测试层 | 📝 | 无行为测试 |

### 交互链 6：dino_natural_selection — 选己方随从，消灭同基地力量更低的随从

**权威描述**：「选择你的在一个基地上的随从。消灭一个在那里力量小于你的随从的随从。」

| 层 | 状态 | 证据 |
|----|------|------|
| 定义层 | ✅ | 标准行动卡 |
| 注册层 | ✅ | `dinosaurs.ts:25` — `registerAbility('dino_natural_selection', 'onPlay', dinoNaturalSelection)` |
| 执行层 | ✅ | 两步链：选己方随从（只列有合法目标的）→选同基地力量更低的随从→`destroyMinion`。描述"力量小于"，实现 `power < myPower`（严格小于），正确 |
| 状态层 | ✅ | `MINION_DESTROYED` 被 reduce 处理 |
| 验证层 | N/A | |
| UI 层 | ✅ | 两步 `createSimpleChoice` |
| i18n 层 | ✅ | 双语条目存在 |
| 测试层 | 📝 | 无行为测试 |

### 交互链 7：dino_survival_of_the_fittest — 每基地消灭最低力量随从

**权威描述**：「每个基地在存在两个及以上的随从且其中有随从有更高力量的情况下消灭一个最低力量的随从（如果出现平局你来选择）。」

| 层 | 状态 | 证据 |
|----|------|------|
| 定义层 | ✅ | 标准行动卡 |
| 注册层 | ✅ | `dinosaurs.ts:26` — `registerAbility('dino_survival_of_the_fittest', 'onPlay', dinoSurvivalOfTheFittest)` |
| 执行层 | ✅ | 遍历所有基地：≥2随从 + 有力量差异 → 找最低力量。唯一最低直接消灭，多个平局创建交互让玩家选择。多基地平局通过 `continuationContext.remainingBases` 链式处理 |
| 状态层 | ✅ | `MINION_DESTROYED` 被 reduce 处理 |
| 验证层 | N/A | |
| UI 层 | ✅ | 平局时 `createSimpleChoice`，链式多基地交互 |
| i18n 层 | ✅ | 双语条目存在 |
| 测试层 | 📝 | 无行为测试 |

### 交互链 8：dino_upgrade — 附着随从+2力量（ongoing）

**权威描述**：「打出到一个随从上。持续：该随从+2力量。」

| 层 | 状态 | 证据 |
|----|------|------|
| 定义层 | ✅ | `data/factions/dinosaurs.ts` — `subtype: 'ongoing'`, `ongoingTarget: 'minion'` |
| 注册层 | ✅ | `ongoing_modifiers.ts` — `registerPowerModifier('dino_upgrade', ...)` |
| 执行层 | ✅ | 检查 `attachedActions` 含 `dino_upgrade` 时 +2。框架层自动处理附着流程 |
| 状态层 | ✅ | 通过 `getEffectivePower` 动态计算 |
| 验证层 | N/A | |
| UI 层 | N/A | 无交互 |
| i18n 层 | ✅ | 双语条目存在 |
| 测试层 | 📝 | 无行为测试 |

### 交互链 9：dino_howl — 全部己方随从+1力量（回合结束）

**权威描述**：「每个你的随从获得+1力量直到回合结束。」

| 层 | 状态 | 证据 |
|----|------|------|
| 定义层 | ✅ | 标准行动卡 |
| 注册层 | ✅ | `dinosaurs.ts:24` — `registerAbility('dino_howl', 'onPlay', dinoHowl)` |
| 执行层 | ✅ | 遍历所有基地己方随从，`addTempPower(uid, baseIndex, 1, ...)`。描述"直到回合结束"，`addTempPower` 在回合结束时自动清除 |
| 状态层 | ✅ | `POWER_COUNTER_ADDED` 被 reduce 处理 |
| 验证层 | N/A | |
| UI 层 | N/A | 无交互 |
| i18n 层 | ✅ | 双语条目存在 |
| 测试层 | 📝 | 无行为测试 |

### 交互链 10：dino_rampage — 降低基地爆破点

**权威描述**：「将一个基地的爆破点降低等同于你在这个基地的随从的力量数直到回合结束。」

| 层 | 状态 | 证据 |
|----|------|------|
| 定义层 | ✅ | 标准行动卡 |
| 注册层 | ✅ | `dinosaurs.ts:28` — `registerAbility('dino_rampage', 'onPlay', dinoRampage)` |
| 执行层 | ✅ | 使用 `resolveOrPrompt` 选择有己方随从的基地，计算己方总力量，`modifyBreakpoint(baseIndex, -myPower, ...)`。handler 重新计算力量确保一致性 |
| 状态层 | ✅ | `BREAKPOINT_MODIFIED` 被 reduce 处理 |
| 验证层 | N/A | |
| UI 层 | ✅ | `resolveOrPrompt` 多候选时创建交互 |
| i18n 层 | ✅ | 双语条目存在 |
| 测试层 | 📝 | 无行为测试 |

### 交互链 11：dino_augmentation — 一个随从+4力量（回合结束）

**权威描述**：「一个随从获得+4力量直到回合结束。」

| 层 | 状态 | 证据 |
|----|------|------|
| 定义层 | ✅ | 标准行动卡 |
| 注册层 | ✅ | `dinosaurs.ts:23` — `registerAbility('dino_augmentation', 'onPlay', dinoAugmentation)` |
| 执行层 | ✅ | 遍历所有基地所有随从供选择，handler 发射 `addTempPower(uid, baseIndex, 4, ...)`。描述无敌我限定，实现无限定，正确 |
| 状态层 | ✅ | `TEMP_POWER_ADDED` 被 reduce 处理 |
| 验证层 | N/A | |
| UI 层 | ✅ | `createSimpleChoice` |
| i18n 层 | ✅ | 双语条目存在 |
| 测试层 | 📝 | 无行为测试 |

### 交互链 12：dino_tooth_and_claw — 保护附着随从（ongoing，自毁）

**权威描述**：「打出到一个随从上。持续：如果一个能力将会影响该随从，消灭本卡，那么那个能力将不会影响该随从。」

| 层 | 状态 | 证据 |
|----|------|------|
| 定义层 | ✅ | `data/factions/dinosaurs.ts` — `subtype: 'ongoing'`, `ongoingTarget: 'minion'` |
| 注册层 | ✅ | `dinosaurs.ts:35-36` — `registerInterceptor` + `registerProtection('dino_tooth_and_claw', 'affect', ...)` |
| 执行层 | ✅ | 拦截器处理 `MINION_DESTROYED`/`MINION_RETURNED`/`CARD_TO_DECK_BOTTOM` 三种事件。检查 `attachedActions` 含 `dino_tooth_and_claw`，自毁（`ONGOING_DETACHED`）并替换原事件。只拦截其他玩家发起的影响（`ownerId !== target.controller`） |
| 状态层 | ✅ | `ONGOING_DETACHED` 被 reduce 处理，原事件被替换 |
| 验证层 | N/A | |
| UI 层 | N/A | 无交互 |
| i18n 层 | ✅ | 双语条目存在 |
| 测试层 | 📝 | 无行为测试 |
