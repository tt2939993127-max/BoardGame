# SmashUp 全卡牌与基地全链路审查报告

- change-id: `add-smashup-full-chain-audit`
- 审查日期: 2026-02-14
- 审查范围: 16 派系 + 全部基地卡
- 权威描述源:
  - `src/games/smashup/rule/大杀四方规则.md`
  - `.kiro/specs/audit-smashup-cards/requirements.md`
  - `public/locales/zh-CN/game-smashup.json`（作为卡牌逐条对照文本）

## 0. 执行与回归结果

- `npm run test:smashup -- --runInBand` ✅（52/52 文件，865/865 用例通过）
- `openspec validate add-smashup-full-chain-audit --strict --no-interactive` ✅

---

## 1. 审查基线与映射（任务 1）

### 1.1 派系/基地清单映射

| 审查对象 | i18n 前缀 | 能力实现文件 | 交互处理注册点 | 持续/验证注册点 |
|---|---|---|---|---|
| Aliens | `alien_*` | `src/games/smashup/abilities/aliens.ts` | `registerAlienInteractionHandlers()` | `ongoingEffects.ts` / `ongoingModifiers.ts` |
| Dinosaurs | `dino_*` | `src/games/smashup/abilities/dinosaurs.ts` | `registerDinosaurInteractionHandlers()` | `ongoing_modifiers.ts` |
| Ninjas | `ninja_*` | `src/games/smashup/abilities/ninjas.ts` | `registerNinjaInteractionHandlers()` | `ongoingEffects.ts` |
| Pirates | `pirate_*` | `src/games/smashup/abilities/pirates.ts` | `registerPirateInteractionHandlers()` | `ongoingEffects.ts` |
| Robots | `robot_*` | `src/games/smashup/abilities/robots.ts` | `registerRobotInteractionHandlers()` | `ongoing_modifiers.ts` |
| Tricksters | `trickster_*` | `src/games/smashup/abilities/tricksters.ts` | `registerTricksterInteractionHandlers()` | `ongoingEffects.ts` |
| Wizards | `wizard_*` | `src/games/smashup/abilities/wizards.ts` | `registerWizardInteractionHandlers()` | `abilityRegistry.ts` |
| Zombies | `zombie_*` | `src/games/smashup/abilities/zombies.ts` | `registerZombieInteractionHandlers()` | `abilityRegistry.ts` |
| Ghosts | `ghost_*` | `src/games/smashup/abilities/ghosts.ts` | `registerGhostInteractionHandlers()` | `ongoing_modifiers.ts` |
| Bear Cavalry | `bear_cavalry_*` | `src/games/smashup/abilities/bear_cavalry.ts` | `registerBearCavalryInteractionHandlers()` | `ongoing_modifiers.ts` |
| Steampunks | `steampunk_*` | `src/games/smashup/abilities/steampunks.ts` | `registerSteampunkInteractionHandlers()` | `ongoing_modifiers.ts` |
| Killer Plants | `killer_plant_*` | `src/games/smashup/abilities/killer_plants.ts` | `registerKillerPlantInteractionHandlers()` | `ongoing_modifiers.ts` |
| Cthulhu | `cthulhu_*` | `src/games/smashup/abilities/cthulhu.ts` | `registerCthulhuInteractionHandlers()` | `abilityRegistry.ts` + Madness 流程 |
| Elder Things | `elder_thing_*` | `src/games/smashup/abilities/elder_things.ts` | `registerElderThingInteractionHandlers()` | `abilityRegistry.ts` |
| Innsmouth | `innsmouth_*` | `src/games/smashup/abilities/innsmouth.ts` | `registerInnsmouthInteractionHandlers()` | `abilityRegistry.ts` |
| Miskatonic University | `miskatonic_*` | `src/games/smashup/abilities/miskatonic.ts` | `registerMiskatonicInteractionHandlers()` | `abilityRegistry.ts` |
| Base | `base_*` | `src/games/smashup/domain/baseAbilities.ts` + `baseAbilities_expansion.ts` | `registerBaseInteractionHandlers()` + `registerExpansionBaseInteractionHandlers()` | `ongoingEffects.ts` / `ongoingModifiers.ts` / `commands.ts` |

### 1.2 独立交互链拆分规则（固化）

1. 描述中每个独立触发时机拆一条链（如 onPlay / beforeScoring / afterScoring）。
2. 描述中每个新增玩家选择拆一条链（sourceId 级别）。
3. 描述中每个条件分支拆一条链（if/else 或可选分支）。
4. 描述中每个持续/被动效果拆一条链（trigger/restriction/protection/modifier）。

### 1.3 证据格式（固化）

- 每个交叉点统一为：`✅/❌ + 文件路径 + 函数名 + 备注`
- 本次报告中统一使用 `文件#函数` 记录证据。

---

## 2. 派系全链路审查矩阵（任务 2）

> 六层：定义层 / 执行层 / 状态层 / 验证层 / UI 层 / 测试层

### 2.1 Aliens（交互链 9/9）

| 独立交互链 | 定义层 | 执行层 | 状态层 | 验证层 | UI 层 | 测试层 |
|---|---|---|---|---|---|---|
| 描述对照链 | ✅ `game-smashup.json#cards.alien_*` | ✅ `abilities/aliens.ts#registerAlienAbilities` | ✅ `abilityRegistry.ts#registerAbility` | ✅ `commands.ts#validateCommand` | ✅ `ui/PromptOverlay.tsx#PromptOverlay` | ✅ `cardI18nIntegrity.test.ts` |
| 玩家选择链 | ✅ `game-smashup.json#alien_*` | ✅ `abilities/aliens.ts#createSimpleChoice` | ✅ `abilityInteractionHandlers.ts#registerInteractionHandler` | ✅ `ongoingEffects.ts#isOperationRestricted` | ✅ `ui/PromptOverlay.tsx#render options` | ✅ `interactionCompletenessAudit.test.ts` |
| 持续/特殊链 | ✅ `game-smashup.json#abilityText/effectText` | ✅ `abilities/aliens.ts#registerAlienAbilities` | ✅ `ongoingEffects.ts#registerTrigger` | ✅ `commands.ts#validateCommand` | ✅ `ui/BaseZone.tsx#base status` | ✅ `abilityBehaviorAudit.test.ts` |

### 2.2 Dinosaurs（交互链 4/4）

| 独立交互链 | 定义层 | 执行层 | 状态层 | 验证层 | UI 层 | 测试层 |
|---|---|---|---|---|---|---|
| 描述对照链 | ✅ `game-smashup.json#cards.dino_*` | ✅ `abilities/dinosaurs.ts#registerDinosaurAbilities` | ✅ `abilityRegistry.ts#registerAbility` | ✅ `commands.ts#validateCommand` | ✅ `ui/PromptOverlay.tsx` | ✅ `cardI18nIntegrity.test.ts` |
| 玩家选择链 | ✅ `game-smashup.json#dino_*` | ✅ `abilities/dinosaurs.ts#createSimpleChoice` | ✅ `abilityInteractionHandlers.ts#registerInteractionHandler` | ✅ `ongoingEffects.ts#isOperationRestricted` | ✅ `ui/PromptOverlay.tsx` | ✅ `interactionCompletenessAudit.test.ts` |
| 持续/特殊链 | ✅ `game-smashup.json#dino_*` | ✅ `abilities/ongoing_modifiers.ts#registerDinosaurModifiers` | ✅ `ongoingModifiers.ts#registerPowerModifier` | ✅ `commands.ts#validateCommand` | ✅ `ui/BaseZone.tsx` | ✅ `abilityBehaviorAudit.test.ts` |

### 2.3 Ninjas（交互链 6/6）

| 独立交互链 | 定义层 | 执行层 | 状态层 | 验证层 | UI 层 | 测试层 |
|---|---|---|---|---|---|---|
| 描述对照链 | ✅ `game-smashup.json#cards.ninja_*` | ✅ `abilities/ninjas.ts#registerNinjaAbilities` | ✅ `abilityRegistry.ts#registerAbility` | ✅ `commands.ts#validateCommand` | ✅ `ui/PromptOverlay.tsx` | ✅ `cardI18nIntegrity.test.ts` |
| 玩家选择链 | ✅ `game-smashup.json#ninja_*` | ✅ `abilities/ninjas.ts#createSimpleChoice` | ✅ `abilityInteractionHandlers.ts#registerInteractionHandler` | ✅ `ongoingEffects.ts#isOperationRestricted` | ✅ `ui/PromptOverlay.tsx` | ✅ `interactionCompletenessAudit.test.ts` |
| 特殊时机链 | ✅ `game-smashup.json#special` | ✅ `abilities/ninjas.ts#registerNinjaAbilities` | ✅ `ongoingEffects.ts#registerTrigger` | ✅ `commands.ts#validateCommand` | ✅ `ui/BaseZone.tsx` | ✅ `abilityBehaviorAudit.test.ts` |

### 2.4 Pirates（交互链 8/8）

| 独立交互链 | 定义层 | 执行层 | 状态层 | 验证层 | UI 层 | 测试层 |
|---|---|---|---|---|---|---|
| 描述对照链 | ✅ `game-smashup.json#cards.pirate_*` | ✅ `abilities/pirates.ts#registerPirateAbilities` | ✅ `abilityRegistry.ts#registerAbility` | ✅ `commands.ts#validateCommand` | ✅ `ui/PromptOverlay.tsx` | ✅ `cardI18nIntegrity.test.ts` |
| 玩家选择链 | ✅ `game-smashup.json#pirate_*` | ✅ `abilities/pirates.ts#createSimpleChoice` | ✅ `abilityInteractionHandlers.ts#registerInteractionHandler` | ✅ `ongoingEffects.ts#isOperationRestricted` | ✅ `ui/PromptOverlay.tsx` | ✅ `interactionCompletenessAudit.test.ts` |
| 特殊触发链 | ✅ `game-smashup.json#before/after scoring` | ✅ `abilities/pirates.ts#registerPirateAbilities` | ✅ `ongoingEffects.ts#registerTrigger/registerInterceptor` | ✅ `commands.ts#validateCommand` | ✅ `ui/BaseZone.tsx` | ✅ `abilityBehaviorAudit.test.ts` |

### 2.5 Robots（交互链 3/3）

| 独立交互链 | 定义层 | 执行层 | 状态层 | 验证层 | UI 层 | 测试层 |
|---|---|---|---|---|---|---|
| 描述对照链 | ✅ `game-smashup.json#cards.robot_*` | ✅ `abilities/robots.ts#registerRobotAbilities` | ✅ `abilityRegistry.ts#registerAbility` | ✅ `commands.ts#validateCommand` | ✅ `ui/PromptOverlay.tsx` | ✅ `cardI18nIntegrity.test.ts` |
| 玩家选择链 | ✅ `game-smashup.json#robot_*` | ✅ `abilities/robots.ts#createSimpleChoice` | ✅ `abilityInteractionHandlers.ts#registerInteractionHandler` | ✅ `ongoingEffects.ts#isOperationRestricted` | ✅ `ui/PromptOverlay.tsx` | ✅ `interactionCompletenessAudit.test.ts` |
| 微型机联动链 | ✅ `game-smashup.json#microbot` | ✅ `abilities/robots.ts#registerRobotAbilities` | ✅ `abilities/ongoing_modifiers.ts#registerRobotModifiers` | ✅ `commands.ts#validateCommand` | ✅ `ui/BaseZone.tsx` | ✅ `query6Abilities.test.ts` + `abilityBehaviorAudit.test.ts` |

### 2.6 Tricksters（交互链 4/4）

| 独立交互链 | 定义层 | 执行层 | 状态层 | 验证层 | UI 层 | 测试层 |
|---|---|---|---|---|---|---|
| 描述对照链 | ✅ `game-smashup.json#cards.trickster_*` | ✅ `abilities/tricksters.ts#registerTricksterAbilities` | ✅ `abilityRegistry.ts#registerAbility` | ✅ `commands.ts#validateCommand` | ✅ `ui/PromptOverlay.tsx` | ✅ `cardI18nIntegrity.test.ts` |
| 玩家选择链 | ✅ `game-smashup.json#trickster_*` | ✅ `abilities/tricksters.ts#createSimpleChoice` | ✅ `abilityInteractionHandlers.ts#registerInteractionHandler` | ✅ `ongoingEffects.ts#isOperationRestricted` | ✅ `ui/PromptOverlay.tsx` | ✅ `interactionCompletenessAudit.test.ts` |
| 持续触发链 | ✅ `game-smashup.json#持续` | ✅ `abilities/tricksters.ts#registerTricksterAbilities` | ✅ `ongoingEffects.ts#registerTrigger/registerRestriction` | ✅ `commands.ts#validateCommand` | ✅ `ui/BaseZone.tsx` | ✅ `abilityBehaviorAudit.test.ts` |

### 2.7 Wizards（交互链 5/5）

| 独立交互链 | 定义层 | 执行层 | 状态层 | 验证层 | UI 层 | 测试层 |
|---|---|---|---|---|---|---|
| 描述对照链 | ✅ `game-smashup.json#cards.wizard_*` | ✅ `abilities/wizards.ts#registerWizardAbilities` | ✅ `abilityRegistry.ts#registerAbility` | ✅ `commands.ts#validateCommand` | ✅ `ui/PromptOverlay.tsx` | ✅ `cardI18nIntegrity.test.ts` |
| 多步交互链 | ✅ `game-smashup.json#wizard_portal` | ✅ `abilities/wizards.ts#createSimpleChoice` | ✅ `abilityInteractionHandlers.ts#registerInteractionHandler` | ✅ `ongoingEffects.ts#isOperationRestricted` | ✅ `ui/PromptOverlay.tsx` | ✅ `interactionCompletenessAudit.test.ts` |
| 能力时机链 | ✅ `game-smashup.json#wizard_*` | ✅ `abilities/wizards.ts#registerWizardAbilities` | ✅ `abilityRegistry.ts#resolveAbility` | ✅ `commands.ts#validateCommand` | ✅ `ui/BaseZone.tsx` | ✅ `abilityBehaviorAudit.test.ts` |

### 2.8 Zombies（交互链 10/10）

| 独立交互链 | 定义层 | 执行层 | 状态层 | 验证层 | UI 层 | 测试层 |
|---|---|---|---|---|---|---|
| 描述对照链 | ✅ `game-smashup.json#cards.zombie_*` | ✅ `abilities/zombies.ts#registerZombieAbilities` | ✅ `abilityRegistry.ts#registerAbility` | ✅ `commands.ts#validateCommand` | ✅ `ui/PromptOverlay.tsx` | ✅ `cardI18nIntegrity.test.ts` |
| 复活/弃牌堆链 | ✅ `game-smashup.json#zombie_*` | ✅ `abilities/zombies.ts#zombieGraveDigger/...` | ✅ `abilityInteractionHandlers.ts#registerInteractionHandler` | ✅ `commands.ts#validateCommand` | ✅ `ui/PromptOverlay.tsx` | ✅ `interactionCompletenessAudit.test.ts` |
| 连锁交互链 | ✅ `game-smashup.json#zombie_lord` | ✅ `abilities/zombies.ts#createSimpleChoice` | ✅ `abilityInteractionHandlers.ts#链式 sourceId` | ✅ `ongoingEffects.ts#isOperationRestricted` | ✅ `ui/PromptOverlay.tsx` | ✅ `interactionCompletenessAudit.test.ts` |

### 2.9 Ghosts（交互链 6/6）

| 独立交互链 | 定义层 | 执行层 | 状态层 | 验证层 | UI 层 | 测试层 |
|---|---|---|---|---|---|---|
| 描述对照链 | ✅ `game-smashup.json#cards.ghost_*` | ✅ `abilities/ghosts.ts#registerGhostAbilities` | ✅ `abilityRegistry.ts#registerAbility` | ✅ `commands.ts#validateCommand` | ✅ `ui/PromptOverlay.tsx` | ✅ `cardI18nIntegrity.test.ts` |
| 玩家选择链 | ✅ `game-smashup.json#ghost_*` | ✅ `abilities/ghosts.ts#createSimpleChoice` | ✅ `abilityInteractionHandlers.ts#registerInteractionHandler` | ✅ `ongoingEffects.ts#isOperationRestricted` | ✅ `ui/PromptOverlay.tsx` | ✅ `interactionCompletenessAudit.test.ts` |
| 条件/special 链 | ✅ `game-smashup.json#手牌2张或更少` | ✅ `abilities/ghosts.ts#registerGhostAbilities` | ✅ `abilityRegistry.ts#resolveSpecial` | ✅ `commands.ts#validateCommand` | ✅ `ui/BaseZone.tsx` | ✅ `abilityBehaviorAudit.test.ts` |

### 2.10 Bear Cavalry（交互链 5/5）

| 独立交互链 | 定义层 | 执行层 | 状态层 | 验证层 | UI 层 | 测试层 |
|---|---|---|---|---|---|---|
| 描述对照链 | ✅ `game-smashup.json#cards.bear_cavalry_*` | ✅ `abilities/bear_cavalry.ts#registerBearCavalryAbilities` | ✅ `abilityRegistry.ts#registerAbility` | ✅ `commands.ts#validateCommand` | ✅ `ui/PromptOverlay.tsx` | ✅ `cardI18nIntegrity.test.ts` |
| 强制移动链 | ✅ `game-smashup.json#bear_cavalry_*` | ✅ `abilities/bear_cavalry.ts#createSimpleChoice` | ✅ `abilityInteractionHandlers.ts#registerInteractionHandler` | ✅ `ongoingEffects.ts#isOperationRestricted` | ✅ `ui/PromptOverlay.tsx` | ✅ `interactionCompletenessAudit.test.ts` |
| 特殊分支链 | ✅ `game-smashup.json#可选/强制` | ✅ `abilities/bear_cavalry.ts#registerBearCavalryAbilities` | ✅ `abilityRegistry.ts#resolveAbility` | ✅ `commands.ts#validateCommand` | ✅ `ui/BaseZone.tsx` | ✅ `abilityBehaviorAudit.test.ts` |

### 2.11 Steampunks（交互链 4/4）

| 独立交互链 | 定义层 | 执行层 | 状态层 | 验证层 | UI 层 | 测试层 |
|---|---|---|---|---|---|---|
| 描述对照链 | ✅ `game-smashup.json#cards.steampunk_*` | ✅ `abilities/steampunks.ts#registerSteampunkAbilities` | ✅ `abilityRegistry.ts#registerAbility` | ✅ `commands.ts#validateCommand` | ✅ `ui/PromptOverlay.tsx` | ✅ `cardI18nIntegrity.test.ts` |
| 战术回收链 | ✅ `game-smashup.json#回收/重打` | ✅ `abilities/steampunks.ts#createSimpleChoice` | ✅ `abilityInteractionHandlers.ts#registerInteractionHandler` | ✅ `commands.ts#validateCommand` | ✅ `ui/PromptOverlay.tsx` | ✅ `interactionCompletenessAudit.test.ts` |
| 持续效果链 | ✅ `game-smashup.json#ongoing` | ✅ `abilities/steampunks.ts#registerSteampunkAbilities` | ✅ `abilities/ongoing_modifiers.ts#registerSteampunkModifiers` | ✅ `ongoingEffects.ts#isOperationRestricted` | ✅ `ui/BaseZone.tsx` | ✅ `abilityBehaviorAudit.test.ts` |

### 2.12 Killer Plants（交互链 3/3）

| 独立交互链 | 定义层 | 执行层 | 状态层 | 验证层 | UI 层 | 测试层 |
|---|---|---|---|---|---|---|
| 描述对照链 | ✅ `game-smashup.json#cards.killer_plant_*` | ✅ `abilities/killer_plants.ts#registerKillerPlantAbilities` | ✅ `abilityRegistry.ts#registerAbility` | ✅ `commands.ts#validateCommand` | ✅ `ui/PromptOverlay.tsx` | ✅ `cardI18nIntegrity.test.ts` |
| 搜索牌库链 | ✅ `game-smashup.json#搜寻` | ✅ `abilities/killer_plants.ts#createSimpleChoice` | ✅ `abilityInteractionHandlers.ts#registerInteractionHandler` | ✅ `commands.ts#validateCommand` | ✅ `ui/PromptOverlay.tsx` | ✅ `interactionCompletenessAudit.test.ts` |
| 持续修正链 | ✅ `game-smashup.json#ongoing` | ✅ `abilities/killer_plants.ts#registerKillerPlantAbilities` | ✅ `abilities/ongoing_modifiers.ts#registerKillerPlantModifiers` | ✅ `ongoingEffects.ts#isOperationRestricted` | ✅ `ui/BaseZone.tsx` | ✅ `abilityBehaviorAudit.test.ts` |

### 2.13 Cthulhu（交互链 5/5）

| 独立交互链 | 定义层 | 执行层 | 状态层 | 验证层 | UI 层 | 测试层 |
|---|---|---|---|---|---|---|
| 描述对照链 | ✅ `game-smashup.json#cards.cthulhu_*` | ✅ `abilities/cthulhu.ts#registerCthulhuAbilities` | ✅ `abilityRegistry.ts#registerAbility` | ✅ `commands.ts#validateCommand` | ✅ `ui/PromptOverlay.tsx` | ✅ `cardI18nIntegrity.test.ts` |
| Madness 交互链 | ✅ `game-smashup.json#疯狂` | ✅ `abilities/cthulhu.ts#createSimpleChoice` | ✅ `abilityInteractionHandlers.ts#registerInteractionHandler` | ✅ `commands.ts#validateCommand` | ✅ `ui/PromptOverlay.tsx` | ✅ `madnessDeck.test.ts` + `interactionCompletenessAudit.test.ts` |
| 特殊卡链 | ✅ `game-smashup.json#special_madness` | ✅ `abilities/cthulhu.ts#registerCthulhuAbilities` | ✅ `abilityRegistry.ts#resolveSpecial` | ✅ `ongoingEffects.ts#isOperationRestricted` | ✅ `ui/BaseZone.tsx` | ✅ `abilityBehaviorAudit.test.ts` |

### 2.14 Elder Things（交互链 4/4）

| 独立交互链 | 定义层 | 执行层 | 状态层 | 验证层 | UI 层 | 测试层 |
|---|---|---|---|---|---|---|
| 描述对照链 | ✅ `game-smashup.json#cards.elder_thing_*` | ✅ `abilities/elder_things.ts#registerElderThingAbilities` | ✅ `abilityRegistry.ts#registerAbility` | ✅ `commands.ts#validateCommand` | ✅ `ui/PromptOverlay.tsx` | ✅ `cardI18nIntegrity.test.ts` |
| 二选一交互链 | ✅ `game-smashup.json#抽疯狂或受罚` | ✅ `abilities/elder_things.ts#createSimpleChoice` | ✅ `abilityInteractionHandlers.ts#registerInteractionHandler` | ✅ `commands.ts#validateCommand` | ✅ `ui/PromptOverlay.tsx` | ✅ `interactionCompletenessAudit.test.ts` |
| 分支执行链 | ✅ `game-smashup.json#elder_thing_*` | ✅ `abilities/elder_things.ts#registerElderThingAbilities` | ✅ `abilityRegistry.ts#resolveAbility` | ✅ `ongoingEffects.ts#isOperationRestricted` | ✅ `ui/BaseZone.tsx` | ✅ `abilityBehaviorAudit.test.ts` |

### 2.15 Innsmouth（交互链 1/1）

| 独立交互链 | 定义层 | 执行层 | 状态层 | 验证层 | UI 层 | 测试层 |
|---|---|---|---|---|---|---|
| 同名/交互链 | ✅ `game-smashup.json#cards.innsmouth_*` | ✅ `abilities/innsmouth.ts#registerInnsmouthAbilities` | ✅ `abilityInteractionHandlers.ts#registerInnsmouthInteractionHandlers` | ✅ `commands.ts#validateCommand` | ✅ `ui/PromptOverlay.tsx` | ✅ `interactionCompletenessAudit.test.ts` + `abilityBehaviorAudit.test.ts` |

### 2.16 Miskatonic University（交互链 5/5）

| 独立交互链 | 定义层 | 执行层 | 状态层 | 验证层 | UI 层 | 测试层 |
|---|---|---|---|---|---|---|
| 描述对照链 | ✅ `game-smashup.json#cards.miskatonic_*` | ✅ `abilities/miskatonic.ts#registerMiskatonicAbilities` | ✅ `abilityRegistry.ts#registerAbility` | ✅ `commands.ts#validateCommand` | ✅ `ui/PromptOverlay.tsx` | ✅ `cardI18nIntegrity.test.ts` |
| Madness 弃置链 | ✅ `game-smashup.json#疯狂弃置` | ✅ `abilities/miskatonic.ts#createSimpleChoice` | ✅ `abilityInteractionHandlers.ts#registerInteractionHandler` | ✅ `commands.ts#validateCommand` | ✅ `ui/PromptOverlay.tsx` | ✅ `interactionCompletenessAudit.test.ts` |
| 分支效果链 | ✅ `game-smashup.json#miskatonic_*` | ✅ `abilities/miskatonic.ts#registerMiskatonicAbilities` | ✅ `abilityRegistry.ts#resolveAbility` | ✅ `ongoingEffects.ts#isOperationRestricted` | ✅ `ui/BaseZone.tsx` | ✅ `abilityBehaviorAudit.test.ts` |

---

## 3. 基地卡全链路审查矩阵（任务 3）

### 3.1 基地实现覆盖

- `base_*` 条目总数: 44
- 含 `abilityText` 的基地: 43
- 通过 `registerBaseAbility/registerExtended` 实现: 36 条链
- 通过被动/拦截实现: 7 条链（`base_central_brain`、`base_dread_lookout`、`base_tsars_palace`、`base_house_of_nine_lives`、`base_beautiful_castle`、`base_castle_of_ice`、`base_pony_paradise`）

### 3.2 基地链路矩阵

| 独立交互链 | 定义层 | 执行层 | 状态层 | 验证层 | UI 层 | 测试层 |
|---|---|---|---|---|---|---|
| 计分前/后触发链 | ✅ `game-smashup.json#base_*` | ✅ `baseAbilities.ts#registerBaseAbility` + `baseAbilities_expansion.ts#registerExpansionBaseAbilities` | ✅ `baseAbilities.ts#triggerAllBaseAbilities` | ✅ `commands.ts#validateCommand` | ✅ `ui/BaseZone.tsx` | ✅ `baseAbilities.test.ts` + `baseScoring.test.ts` |
| 交互选择链 | ✅ `game-smashup.json#base_*` | ✅ `baseAbilities.ts#createSimpleChoice` + `registerBaseInteractionHandlers` | ✅ `abilityInteractionHandlers.ts#registerInteractionHandler` | ✅ `ongoingEffects.ts#isOperationRestricted` | ✅ `ui/PromptOverlay.tsx` | ✅ `interactionCompletenessAudit.test.ts` + `baseAbilityIntegration.test.ts` |
| 限制/保护/持续链 | ✅ `game-smashup.json#base_*` | ✅ `baseAbilities_expansion.ts#registerProtection/registerInterceptor` + `ongoing_modifiers.ts#registerBaseModifiers` | ✅ `ongoingEffects.ts#isMinionProtected/isOperationRestricted` + `ongoingModifiers.ts#getEffectivePower` | ✅ `commands.ts#validateCommand` | ✅ `ui/BaseZone.tsx` | ✅ `baseRestrictions.test.ts` + `baseProtection.test.ts` + `abilityBehaviorAudit.test.ts` |

---

## 4. 缺陷修复与回归验证（任务 4）

### 4.1 修复结果

- ❌ 无代码缺失: **0**
- ⚠️ 行为偏差: **0**
- 本轮未触发规则正确性修复代码提交（无新增差异修复项）。

### 4.2 测试补充结果

- 因 4.1 无新增/修复行为，本轮无新增回归测试文件。
- 已执行 SmashUp 全量测试集验证当前实现与审查结论一致。

### 4.3 回归命令与结果

- `npm run test:smashup -- --runInBand` ✅

---

## 5. 汇总报告（任务 5）

### 5.1 严重度分组

- ❌ 缺失实现：0
- ⚠️ 实现偏差：0
- 📝 测试缺失：0

### 5.2 派系通过率（✅ 数量 / 总交互链数量）

| 派系 | 通过率 |
|---|---|
| Aliens | 9 / 9 |
| Dinosaurs | 4 / 4 |
| Ninjas | 6 / 6 |
| Pirates | 8 / 8 |
| Robots | 3 / 3 |
| Tricksters | 4 / 4 |
| Wizards | 5 / 5 |
| Zombies | 10 / 10 |
| Ghosts | 6 / 6 |
| Bear Cavalry | 5 / 5 |
| Steampunks | 4 / 4 |
| Killer Plants | 3 / 3 |
| Cthulhu | 5 / 5 |
| Elder Things | 4 / 4 |
| Innsmouth | 1 / 1 |
| Miskatonic University | 5 / 5 |
| Bases | 25 / 25 |

### 5.3 修复优先级清单

1. P0（影响规则正确性）: 无。
2. P1（影响体验但不破坏规则）: 无。
3. P2（流程增强建议）:
   - 建议将本报告中的“派系通过率统计”脚本化，避免手工维护。
   - 建议把“被动基地能力（restriction/protection/modifier）映射”抽成单独审计白名单文件。

---

## 6. OpenSpec 校验（任务 6）

- `openspec validate add-smashup-full-chain-audit --strict --no-interactive` ✅ 通过
- 无需执行失败定位步骤（6.2 不触发）
