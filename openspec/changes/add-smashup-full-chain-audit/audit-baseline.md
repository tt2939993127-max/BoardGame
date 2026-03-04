# SmashUp 全链路审查基线（Task 1）

> 变更：`add-smashup-full-chain-audit`
> 
> 本文用于落实 `tasks.md` 的 1.1 / 1.2 / 1.3：
> - 建立 `i18n key 前缀 -> 能力实现文件 -> 交互处理器/持续效果注册点` 映射
> - 固化“独立交互链 × 六层”审查模板
> - 统一证据记录格式

## 0. 审查输入口径

- 描述输入源：`public/locales/zh-CN/game-smashup.json`（按本变更 design 约定）
- 实现核对范围：`src/games/smashup/abilities/*.ts` + `src/games/smashup/domain/*.ts`
- 若 i18n 文本与代码/规则文档冲突：标记为 `描述源冲突`，在报告中单列，不在本阶段静默修订描述源

---

## 1. 映射清单（Task 1.1）

### 1.1 前缀到实现入口映射

| i18n key 前缀 | 审查对象 | 能力实现文件 | 注册入口（能力/交互） |
|---|---|---|---|
| `alien_` | 外星人 | `src/games/smashup/abilities/aliens.ts` | `registerAlienAbilities` / `registerAlienInteractionHandlers` |
| `dino_` | 恐龙 | `src/games/smashup/abilities/dinosaurs.ts` | `registerDinosaurAbilities` / `registerDinosaurInteractionHandlers` |
| `ghost_` | 幽灵 | `src/games/smashup/abilities/ghosts.ts` | `registerGhostAbilities` / `registerGhostInteractionHandlers` |
| `ninja_` | 忍者 | `src/games/smashup/abilities/ninjas.ts` | `registerNinjaAbilities` / `registerNinjaInteractionHandlers` |
| `pirate_` | 海盗 | `src/games/smashup/abilities/pirates.ts` | `registerPirateAbilities` / `registerPirateInteractionHandlers` |
| `robot_` | 机器人 | `src/games/smashup/abilities/robots.ts` | `registerRobotAbilities` / `registerRobotInteractionHandlers` |
| `trickster_` | 捣蛋鬼 | `src/games/smashup/abilities/tricksters.ts` | `registerTricksterAbilities` / `registerTricksterInteractionHandlers` |
| `wizard_` | 巫师 | `src/games/smashup/abilities/wizards.ts` | `registerWizardAbilities` / `registerWizardInteractionHandlers` |
| `zombie_` | 僵尸 | `src/games/smashup/abilities/zombies.ts` | `registerZombieAbilities` / `registerZombieInteractionHandlers` |
| `cthulhu_` | 克苏鲁 | `src/games/smashup/abilities/cthulhu.ts` | `registerCthulhuAbilities` / `registerCthulhuInteractionHandlers` |
| `bear_cavalry_` | 熊骑兵 | `src/games/smashup/abilities/bear_cavalry.ts` | `registerBearCavalryAbilities` / `registerBearCavalryInteractionHandlers` |
| `steampunk_` | 蒸汽朋克 | `src/games/smashup/abilities/steampunks.ts` | `registerSteampunkAbilities` / `registerSteampunkInteractionHandlers` |
| `killer_plant_` | 食人花 | `src/games/smashup/abilities/killer_plants.ts` | `registerKillerPlantAbilities` / `registerKillerPlantInteractionHandlers` |
| `elder_thing_` | 远古之物 | `src/games/smashup/abilities/elder_things.ts` | `registerElderThingAbilities` / `registerElderThingInteractionHandlers` |
| `innsmouth_` | 印斯茅斯 | `src/games/smashup/abilities/innsmouth.ts` | `registerInnsmouthAbilities` / `registerInnsmouthInteractionHandlers` |
| `miskatonic_` | 米斯卡塔尼克大学 | `src/games/smashup/abilities/miskatonic.ts` | `registerMiskatonicAbilities` / `registerMiskatonicInteractionHandlers` |
| `base_` | 基地能力（含扩展） | `src/games/smashup/domain/baseAbilities.ts` + `src/games/smashup/domain/baseAbilities_expansion.ts` | `registerBaseAbilities` / `registerBaseInteractionHandlers` / `registerExpansionBaseAbilities` / `registerExpansionBaseInteractionHandlers` |
| `special_madness` | Madness 特殊牌 | `src/games/smashup/abilities/cthulhu.ts` | 与 Cthulhu 同入口，需额外核对特殊处理链 |

### 1.2 交互处理器与持续效果检查点

| 类别 | 主检查文件 | 核对函数/入口 | 说明 |
|---|---|---|---|
| 交互处理器注册 | `src/games/smashup/domain/abilityInteractionHandlers.ts` | `registerInteractionHandler` / `getInteractionHandler` | 校验 `sourceId` 是否有对应处理器 |
| 交互覆盖审计 | `src/games/smashup/__tests__/interactionCompletenessAudit.test.ts` | `INTERACTION_SOURCES` / `HANDLER_CHAINS` | 校验 source 覆盖、链完整、孤儿 handler |
| 持续效果注册 | `src/games/smashup/domain/ongoingEffects.ts` | `registerProtection` / `registerRestriction` / `registerTrigger` / `registerInterceptor` | 校验保护/限制/触发/替代效果 |
| 限制与拦截执行 | `src/games/smashup/domain/ongoingEffects.ts` | `isOperationRestricted` / `interceptEvent` | 验证层核心入口 |
| 持续力量修正 | `src/games/smashup/domain/ongoingModifiers.ts` | `registerPowerModifier` / `registerBreakpointModifier` / `getEffectivePower` / `getEffectiveBreakpoint` | 持续加减值与临界点修正 |
| 持续修正聚合注册 | `src/games/smashup/abilities/ongoing_modifiers.ts` | `registerAllOngoingModifiers` | 核对各派系修正是否被统一挂载 |
| 基地能力触发 | `src/games/smashup/domain/baseAbilities.ts` | `triggerBaseAbility` / `triggerAllBaseAbilities` / `triggerExtendedBaseAbility` | 核对基地时机链 |

---

## 2. 独立交互链拆分规则 + 六层模板（Task 1.2）

### 2.1 拆分规则（原子单位 = 独立交互链）

对每张卡/每个基地能力，按描述逐句拆链，遇到下列任一信号必须拆新链：

1. 触发时机变化（例如：`onPlay` / `beforeScoring` / `afterScoring` / `onTurnStart`）
2. 出现新的玩家输入（选择目标、选择分支、可选跳过）
3. 出现独立条件-结果对（`如果...则...`）
4. 单个描述同时包含“即时效果 + 持续效果/后续触发”
5. 同一交互存在多分支结果（A 选项与 B 选项各自独立落地路径）

> 拆分自检：将所有链描述拼接后，需覆盖原描述每个语义句；若有漏句，拆分不通过。

### 2.2 六层检查定义

- 定义层：卡牌/能力/触发时机声明是否与描述一致
- 执行层：执行函数、handler、触发回调是否存在且语义一致
- 状态层：事件落地后状态是否正确持久化
- 验证层：validate/限制/保护/拦截是否与规则一致（允许/禁止边界）
- UI 层：交互入口、选项、提示文案是否完整可达
- 测试层：是否存在正向 + 负向 + 边界测试

### 2.3 六层矩阵模板（每条链必填）

| 交互链ID | 描述原文（i18n） | 定义层 | 执行层 | 状态层 | 验证层 | UI层 | 测试层 | 结论 |
|---|---|---|---|---|---|---|---|---|
| `<card_or_base>#<chain>` | `<逐句引用>` | `✅/❌` | `✅/❌` | `✅/❌` | `✅/❌` | `✅/❌` | `✅/❌` | `通过/缺陷` |

> 每个层位必须能展开到证据明细（见下一节）。

---

## 3. 审查证据格式（Task 1.3）

### 3.1 证据明细记录模板（强制字段）

| 交互链ID | 层 | 状态 | 文件路径 | 函数/注册点 | 证据摘要 | 问题分类 |
|---|---|---|---|---|---|---|
| `<id>` | `定义/执行/状态/验证/UI/测试` | `✅/❌/⚠️` | `src/...` | `functionName` | `一句话说明` | `❌缺失实现 / ⚠️实现偏差 / 📝测试缺失 / -` |

### 3.2 填写规范

- `文件路径`：必须是仓库相对路径，禁止写“某文件附近”
- `函数/注册点`：必须写明确标识（函数名、常量名、注册 key）
- `状态`：
  - `✅` 已实现且行为一致
  - `❌` 无代码或链路断裂
  - `⚠️` 有代码但行为偏差
- `问题分类`：仅对非 ✅ 项填写，且三选一（`❌/⚠️/📝`）

### 3.3 最小可复核证据集（每条缺陷至少包含）

1. 触发输入（描述原文 + 触发条件）
2. 代码证据（路径 + 函数/注册点）
3. 期望与实际差异
4. 修复建议（可直接改动的落点）
5. 回归测试建议（正向/负向/边界至少各 1）

---

## 4. 执行顺序（下一步）

1. 按 `tasks.md` 第 2 节从 16 派系逐个落地“独立交互链 × 六层”矩阵
2. 再执行第 3 节基地能力全链路审查
3. 汇总缺陷并进入修复与回归（第 4 节）
