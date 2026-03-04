# 审查 9.2：食人花（Killer Plants）派系多步骤能力

> 审查日期：2026-02-14
> 权威描述来源：`public/locales/zh-CN/game-smashup.json`

## 审查汇总

| 指标 | 数值 |
|------|------|
| 总交互链数 | 12 |
| ✅ 通过 | 9 |
| ⚠️ 语义偏差 | 2 |
| ❌ 缺失实现 | 0 |
| 📝 测试缺失 | 4 |
| 通过率 | 75.0% |

## 严重问题清单

| 优先级 | 交互链 | 问题 | 维度 |
|--------|--------|------|------|
| P1 | killer_plant_blossom | 描述"打出至多三个同名的额外随从"但实现无条件给3个额外额度，无"同名"限制 | D1 |
| P2 | killer_plant_sprout | 描述"你可以"但实现无跳过选项（单候选时自动执行） | D5 |

---

## 审查矩阵

### 交互链 1：killer_plant_venus_man_trap — 搜索牌库打出力量≤2随从（天赋）

**权威描述**：「天赋：从你的牌库搜寻一个力量为2或以下的随从，将其作为一个额外随从打出到此基地。重洗你的牌库。」

| 层 | 状态 | 证据 |
|----|------|------|
| 定义层 | ✅ | `data/factions/killer_plants.ts` — `abilityTags: ['talent', 'extra']` |
| 注册层 | ✅ | `registerAbility('killer_plant_venus_man_trap', 'talent', killerPlantVenusManTrap)` |
| 执行层 | ✅ | ① 过滤牌库中 `type === 'minion'` 且 `power <= 2` ✅。② 单候选自动执行：`CARDS_DRAWN` + `grantExtraMinion` + `MINION_PLAYED`（锁定到此基地）+ `DECK_RESHUFFLED` ✅。③ 多候选创建 Prompt ✅。④ handler 通过 `continuationContext.baseIndex` 锁定目标基地 ✅。⑤ 无候选时静默返回 ✅。⑥ 洗牌排除已抽出的卡 ✅ |
| 状态层 | ✅ | 四个事件被 reduce 正确处理 |
| 验证层 | N/A | |
| UI 层 | ✅ | Prompt 选择 + 自动执行 |
| i18n 层 | ✅ | 双语条目存在 |
| 测试层 | ✅ | `newOngoingAbilities.test.ts` 有三个测试：多候选 Interaction、单候选自动、无候选无事件 |

### 交互链 2：killer_plant_weed_eater — 打出回合-2力量

**权威描述**：「本随从在你打出它的回合中-2力量。」

| 层 | 状态 | 证据 |
|----|------|------|
| 定义层 | ✅ | `data/factions/killer_plants.ts` — 无 abilityTags（onPlay 隐式） |
| 注册层 | ✅ | `registerAbility('killer_plant_weed_eater', 'onPlay', killerPlantWeedEater)` |
| 执行层 | ✅ | ① 发射 `POWER_COUNTER_REMOVED` 事件，amount=2 ✅。② 通过 powerCounter 系统实现回合内-2 ✅ |
| 状态层 | ✅ | `POWER_COUNTER_REMOVED` 被 reduce 处理 |
| 验证层 | N/A | |
| UI 层 | N/A | 自动效果 |
| i18n 层 | ✅ | 双语条目存在 |
| 测试层 | ✅ | `expansionAbilities.test.ts` 有正向测试 |

### 交互链 3：killer_plant_water_lily — 回合开始时抽牌（持续）

**权威描述**：「持续：在你的每回合开始时抽一张卡。你每回合只能使用一次浇花睡莲的能力。」

| 层 | 状态 | 证据 |
|----|------|------|
| 定义层 | ✅ | `data/factions/killer_plants.ts` — `abilityTags: ['ongoing']` |
| 注册层 | ✅ | `registerTrigger('killer_plant_water_lily', 'onTurnStart', killerPlantWaterLilyTrigger)` |
| 执行层 | ✅ | ① 遍历所有基地找 water_lily ✅。② 只触发控制者回合 ✅。③ 找到第一个后立即 return（"每回合只能使用一次"）✅。④ 检查牌库非空 ✅ |
| 状态层 | ✅ | `CARDS_DRAWN` 被 reduce 处理 |
| 验证层 | N/A | |
| UI 层 | N/A | 自动触发 |
| i18n 层 | ✅ | 双语条目存在 |
| 测试层 | 📝 | 无专门行为测试 |

### 交互链 4：killer_plant_sprout — 回合开始消灭自身+搜索打出随从（持续）

**权威描述**：「持续：在你的回合开始时消灭本卡。你可以从你的牌库中搜寻一个力量为3或以下的随从，作为额外随从打出到此基地，之后重洗牌库。」

| 层 | 状态 | 证据 |
|----|------|------|
| 定义层 | ✅ | `data/factions/killer_plants.ts` — `abilityTags: ['ongoing', 'extra']` |
| 注册层 | ✅ | `registerTrigger('killer_plant_sprout', 'onTurnStart', killerPlantSproutTrigger)` |
| 执行层 | ⚠️ | ① 消灭自身 `destroyMinion` ✅。② 搜索牌库 `power <= 3` 随从 ✅。③ 单候选自动执行 ✅。④ 多候选创建 Prompt ✅。⑤ 锁定到 sprout 所在基地 `continuationContext.baseIndex` ✅。⑥ **"你可以"但单候选时自动执行无跳过**——描述说"你可以"暗示可选择不搜索，但实现中单候选自动执行，多候选时 Prompt 也无跳过选项（D5 交互完整性：缺少跳过选项） |
| 状态层 | ✅ | `MINION_DESTROYED` + `CARDS_DRAWN` + `MINION_PLAYED` + `DECK_RESHUFFLED` 被 reduce 处理 |
| 验证层 | N/A | |
| UI 层 | ⚠️ | 缺少跳过选项 |
| i18n 层 | ✅ | 双语条目存在 |
| 测试层 | 📝 | 无专门行为测试（通过 venus_man_trap 测试间接覆盖搜索逻辑） |

### 交互链 5：killer_plant_budding — 搜索牌库同名卡

**权威描述**：「选择一个在场中的随从。从你的牌库中搜寻一张同名的卡将其加入手牌，之后重洗牌库。」

| 层 | 状态 | 证据 |
|----|------|------|
| 定义层 | ✅ | `data/factions/killer_plants.ts` — 行动卡，`subtype: 'standard'` |
| 注册层 | ✅ | `registerAbility('killer_plant_budding', 'onPlay', killerPlantBudding)` |
| 执行层 | ✅ | ① 收集场上所有随从（无敌我限定）✅。② 创建 Prompt 选择随从 ✅。③ handler 在牌库中找同 defId 的卡 ✅。④ 找到则 `CARDS_DRAWN` + `DECK_RESHUFFLED` ✅。⑤ 找不到则静默返回 ✅ |
| 状态层 | ✅ | `CARDS_DRAWN` + `DECK_RESHUFFLED` 被 reduce 处理 |
| 验证层 | N/A | |
| UI 层 | ✅ | Prompt 选择场上随从 |
| i18n 层 | ✅ | 双语条目存在 |
| 测试层 | 📝 | 无专门行为测试 |

### 交互链 6：killer_plant_deep_roots — 保护随从不被移动（持续）

**权威描述**：「打出到基地上。持续：你在此基地的随从不能因为其他玩家的能力而移动或返回你的手牌。」

| 层 | 状态 | 证据 |
|----|------|------|
| 定义层 | ✅ | `data/factions/killer_plants.ts` — `abilityTags: ['ongoing']`, `subtype: 'ongoing'` |
| 注册层 | ✅ | `registerProtection('killer_plant_deep_roots', 'move', killerPlantDeepRootsChecker)` |
| 执行层 | ✅ | ① 检查基地上有 deep_roots ✅。② 只保护 deep_roots 拥有者的随从 ✅。③ 只拦截对手效果 `ctx.sourcePlayerId !== ctx.targetMinion.controller` ✅ |
| 状态层 | N/A | 保护拦截 |
| 验证层 | N/A | |
| UI 层 | N/A | |
| i18n 层 | ✅ | 双语条目存在 |
| 测试层 | 📝 | 无专门行为测试 |

### 交互链 7：killer_plant_choking_vines — 回合开始消灭附着随从（持续）

**权威描述**：「打出到一个随从上。持续：在你的回合开始时，消灭该随从。」

| 层 | 状态 | 证据 |
|----|------|------|
| 定义层 | ✅ | `data/factions/killer_plants.ts` — `abilityTags: ['ongoing']`, `ongoingTarget: 'minion'` |
| 注册层 | ✅ | `registerTrigger('killer_plant_choking_vines', 'onTurnStart', killerPlantChokingVinesTrigger)` |
| 执行层 | ✅ | ① 遍历所有基地所有随从找附着的 choking_vines ✅。② 只在拥有者回合触发 `attached.ownerId !== ctx.playerId` 时跳过 ✅。③ 发射 `destroyMinion` ✅ |
| 状态层 | ✅ | `MINION_DESTROYED` 被 reduce 处理 |
| 验证层 | N/A | |
| UI 层 | N/A | 自动触发 |
| i18n 层 | ✅ | 双语条目存在 |
| 测试层 | ✅ | 通过 ongoingE2E 间接覆盖 |

### 交互链 8：killer_plant_insta_grow — 额外打出随从

**权威描述**：「打出一个额外随从。」

| 层 | 状态 | 证据 |
|----|------|------|
| 定义层 | ✅ | `data/factions/killer_plants.ts` — `abilityTags: ['extra']` |
| 注册层 | ✅ | `registerAbility('killer_plant_insta_grow', 'onPlay', killerPlantInstaGrow)` |
| 执行层 | ✅ | `grantExtraMinion` 授予额度 ✅ |
| 状态层 | ✅ | `LIMIT_MODIFIED` 被 reduce 处理 |
| 验证层 | N/A | |
| UI 层 | ✅ | 额度系统自动展示 |
| i18n 层 | ✅ | 双语条目存在 |
| 测试层 | ✅ | `expansionAbilities.test.ts` 有额度授予和累加测试 |

### 交互链 9：killer_plant_blossom — 额外打出三个同名随从

**权威描述**：「打出至多三个同名的额外随从。」

| 层 | 状态 | 证据 |
|----|------|------|
| 定义层 | ✅ | `data/factions/killer_plants.ts` — `abilityTags: ['extra']` |
| 注册层 | ✅ | `registerAbility('killer_plant_blossom', 'onPlay', killerPlantBlossom)` |
| 执行层 | ⚠️ | ① 三次 `grantExtraMinion` 授予3个额外额度 ✅。② **"同名"限制未实现**——描述说"打出至多三个同名的额外随从"，意味着三个额外随从必须是同一种卡，但实现只给3个额度，玩家可以打出任意不同随从（D1 语义偏差：缺少"同名"约束）。③ "至多"——额度系统天然支持不使用 ✅ |
| 状态层 | ✅ | 三个 `LIMIT_MODIFIED` 被 reduce 处理 |
| 验证层 | ⚠️ | 缺少"同名"校验 |
| UI 层 | ✅ | 额度系统自动展示 |
| i18n 层 | ✅ | 双语条目存在 |
| 测试层 | 📝 | 无专门行为测试 |

### 交互链 10：killer_plant_sleep_spores — 对手随从-1力量（持续）

**权威描述**：「打出到基地上。持续：其他玩家在此基地的随从-1力量。（最低到0）」

| 层 | 状态 | 证据 |
|----|------|------|
| 定义层 | ✅ | `data/factions/killer_plants.ts` — `abilityTags: ['ongoing']`, `subtype: 'ongoing'` |
| 注册层 | ✅ | `ongoing_modifiers.ts` — `registerPowerModifier('killer_plant_sleep_spores', ...)` |
| 执行层 | ✅ | ① 检查基地上有 sleep_spores ✅。② 只对非拥有者的随从生效 ✅。③ 返回 -1 ✅。④ "最低到0"——通过 `getEffectivePower` 的 `Math.max(0, ...)` 保证 ✅ |
| 状态层 | ✅ | 通过 `getEffectivePower` 计算 |
| 验证层 | N/A | |
| UI 层 | N/A | |
| i18n 层 | ✅ | 双语条目存在 |
| 测试层 | ✅ | 通过 ongoing modifiers 基础设施测试覆盖 |

### 交互链 11：killer_plant_overgrowth — 临界点降为0（持续）

**权威描述**：「打出到基地上。持续：自你的回合开始时，将本基地的爆破点降低到0点。」

| 层 | 状态 | 证据 |
|----|------|------|
| 定义层 | ✅ | `data/factions/killer_plants.ts` — `abilityTags: ['ongoing']`, `subtype: 'ongoing'` |
| 注册层 | ✅ | `ongoing_modifiers.ts` — `registerBreakpointModifier('killer_plant_overgrowth', ...)` |
| 执行层 | ✅ | ① 检查基地上有 overgrowth ✅。② 只在拥有者回合生效 ✅。③ 返回负值使临界点降为0 ✅ |
| 状态层 | ✅ | 通过 breakpoint modifier 系统计算 |
| 验证层 | N/A | |
| UI 层 | N/A | |
| i18n 层 | ✅ | 双语条目存在 |
| 测试层 | ✅ | `newOngoingAbilities.test.ts` 有临界点降为0测试 |

### 交互链 12：killer_plant_entangled — 全局移动限制+自毁（持续）

**权威描述**：「打出到基地上。持续：任何有你随从的基地里的随从都不能被移动或返回手牌。在你的回合开始时消灭本卡。」

| 层 | 状态 | 证据 |
|----|------|------|
| 定义层 | ✅ | `data/factions/killer_plants.ts` — `abilityTags: ['ongoing']`, `subtype: 'ongoing'` |
| 注册层 | ✅ | `registerProtection('killer_plant_entangled', 'move', ...)` + `registerTrigger('killer_plant_entangled', 'onTurnStart', ...)` |
| 执行层 | ✅ | ① 保护检查：遍历所有基地找 entangled，检查拥有者在目标随从所在基地有随从 ✅。② "任何有你随从的基地"——全局范围，不限于 entangled 所在基地 ✅。③ 自毁触发：拥有者回合开始时发射 `ONGOING_DETACHED` ✅。④ 非拥有者回合不自毁 ✅ |
| 状态层 | ✅ | `ONGOING_DETACHED` 被 reduce 处理 |
| 验证层 | N/A | |
| UI 层 | N/A | |
| i18n 层 | ✅ | 双语条目存在 |
| 测试层 | ✅ | `newOngoingAbilities.test.ts` 有保护测试 + 自毁测试 + 非控制者回合不自毁测试；`ongoingE2E.test.ts` 有集成测试 |

---

## 交叉影响备注

### killer_plant_blossom "同名"限制

描述"打出至多三个同名的额外随从"中的"同名"是关键限制——三个额外随从必须是同一种卡。当前实现只给3个额外额度，无法约束玩家打出不同随从。修复方案：需要在 validate 层添加约束，追踪 blossom 授予的额度，限制只能打出与第一个额外随从同名的卡。这需要在 core 状态中记录"blossom 锁定的 defId"。

### killer_plant_entangled 保护范围

entangled 的保护是全局的——"任何有你随从的基地里的随从都不能被移动"，不限于 entangled 所在基地。实现正确遍历所有基地检查拥有者是否有随从。但注意：保护对象是"所有随从"（包括对手的），不只是己方随从。这与 deep_roots（只保护己方）不同。

### killer_plant_sprout 与 killer_plant_venus_man_trap 搜索逻辑复用

两者的搜索+打出+洗牌逻辑高度相似（sprout 搜 ≤3，venus 搜 ≤2），可以考虑提取公共函数。
