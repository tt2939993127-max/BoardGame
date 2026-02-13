# 需求文档：SummonerWars 技能系统架构治理

## 简介

SummonerWars 的技能系统存在四个严重反模式，违反了 AGENTS.md 中"技能定义单一数据源"和"禁止技能系统硬编码"的强制规范：

1. **abilityText 三重冗余**：卡牌配置 `abilityText` + AbilityDef `name`/`description` 硬编码中文 + i18n 部分存在
2. **自建 AbilityRegistry**：`abilities.ts` 自建了 `class AbilityRegistry`，与引擎层 `engine/primitives/ability.ts` 的通用 `AbilityRegistry<TDef>` 功能重复
3. **execute 巨型 switch-case**：`execute/abilities.ts` 有 30+ case 的 `switch(abilityId)`，违反"禁止 execute 层用 switch 巨型分发"
4. **UI 逐技能 if 硬编码**：`AbilityButtonsPanel.tsx` 有 10+ 个 `if (abilities.includes('xxx'))` 块，尽管 AbilityDef 已定义 `ui` 配置字段且部分技能已填充数据

本需求同时覆盖 SmashUp 的 abilityText 冗余问题（中等严重度）。

## 术语表

- **AbilityDef**：技能定义对象，SummonerWars 自建版本位于 `domain/abilities.ts`，引擎层通用版本位于 `engine/primitives/ability.ts`
- **AbilityRegistry**：技能注册表。引擎层提供泛型版本 `AbilityRegistry<TDef>`，SummonerWars 自建了非泛型版本
- **AbilityExecutorRegistry**：技能执行器注册表，引擎层提供，支持 `register(id, executor)` + `resolve(id)` 模式替代 switch-case
- **abilityText 字段**：卡牌配置中硬编码的中文技能描述字符串，是需要消除的冗余字段
- **abilityText() Helper**：DiceThrone 参考模式，接受 `(id, field)` 返回 `abilities.${id}.${field}` 格式的 i18n key
- **AbilityDef.ui**：已定义的 UI 元数据字段（`requiresButton`/`buttonPhase`/`buttonLabel`/`buttonVariant`），部分技能已填充但 UI 组件未消费
- **AbilityDef.validation**：已定义的验证规则字段，`abilityValidation.ts` 已正确消费（数据驱动）

## 需求

### 需求 1：SummonerWars AbilityRegistry 迁移至引擎层

**用户故事：** 作为开发者，我希望 SummonerWars 使用引擎层提供的 `AbilityRegistry<TDef>` 替代自建的 `AbilityRegistry`，以消除重复实现并获得引擎层的 `getByTag`/`has`/`getRegisteredIds` 等能力。

#### 验收标准

1. WHEN SummonerWars 的技能注册表被创建时，THE 注册表 SHALL 使用 `createAbilityRegistry<SWAbilityDef>('sw-abilities')` 创建，而非自建 `class AbilityRegistry`
2. WHEN 自建的 `AbilityRegistry` class 被移除后，THE `abilities.ts` SHALL 不包含任何 `class AbilityRegistry` 定义
3. WHEN SummonerWars 的 `AbilityDef` 接口被更新后，THE 接口 SHALL 扩展引擎层的 `AbilityDef<SWEffect, SWTrigger>`，仅添加 SummonerWars 特有字段（`validation`、`ui`、`usesPerTurn`、`targetSelection`）
4. WHEN 所有现有的 `abilityRegistry.get()`/`getAll()`/`getByTrigger()` 调用点被验证后，THE 调用 SHALL 保持兼容（引擎层 API 是超集）

### 需求 2：SummonerWars AbilityDef 文本迁移至 i18n

**用户故事：** 作为开发者，我希望 SummonerWars 的 AbilityDef 中的 name 和 description 字段使用 i18n key 而非硬编码中文。

#### 验收标准

1. WHEN AbilityDef 被定义时，THE `name` 字段 SHALL 存储 i18n key（格式：`abilities.<ability_id>.name`）
2. WHEN AbilityDef 被定义时，THE `description` 字段 SHALL 存储 i18n key（格式：`abilities.<ability_id>.description`）
3. THE i18n_System SHALL 在 `public/locales/zh-CN/game-summonerwars.json` 和 `public/locales/en/game-summonerwars.json` 中包含所有技能的 name 和 description 条目
4. THE SummonerWars 游戏 SHALL 提供 `abilityText(id, field)` helper 函数（参考 DiceThrone 模式）

### 需求 3：SummonerWars 卡牌配置 abilityText 字段移除

**用户故事：** 作为开发者，我希望卡牌配置中不再包含 `abilityText` 硬编码字段。

#### 验收标准

1. WHEN 所有 6 个派系的卡牌配置文件被更新后，THE 卡牌配置 SHALL 不包含任何 `abilityText` 属性
2. WHEN UnitCard 类型定义被更新后，THE TypeScript 类型 SHALL 不包含 `abilityText` 可选属性
3. WHEN `abilityText` 被移除后，THE 编译 SHALL 无类型错误（确认该字段无运行时消费者）

### 需求 4：SummonerWars execute 层 switch-case 消除

**用户故事：** 作为开发者，我希望 `execute/abilities.ts` 的巨型 switch-case 被替换为引擎层的 `AbilityExecutorRegistry` 注册模式，以便新增技能时只需注册执行器而无需修改分发逻辑。

#### 验收标准

1. WHEN 技能执行器被注册时，THE 系统 SHALL 使用 `createAbilityExecutorRegistry<SWAbilityCtx, GameEvent>()` 创建执行器注册表
2. WHEN 每个技能的执行逻辑被拆分后，THE 每个技能 SHALL 有独立的执行器函数，通过 `executorRegistry.register(abilityId, executor)` 注册
3. WHEN `executeActivateAbility` 被调用时，THE 函数 SHALL 通过 `executorRegistry.resolve(abilityId)` 查找并调用执行器，而非 switch-case 分发
4. WHEN 所有 30+ 个 case 被迁移后，THE `execute/abilities.ts` SHALL 不包含 `switch (abilityId)` 语句
5. WHEN 新技能需要添加时，THE 开发者 SHALL 只需在对应派系文件中注册执行器，无需修改 `execute/abilities.ts`

### 需求 5：SummonerWars UI 按钮渲染数据驱动化

**用户故事：** 作为开发者，我希望 `AbilityButtonsPanel` 根据 `AbilityDef.ui` 配置自动渲染技能按钮，而非逐技能 if 硬编码。

#### 验收标准

1. WHEN 单位被选中时，THE AbilityButtonsPanel SHALL 遍历单位的 `abilities` 数组，从 `abilityRegistry` 获取每个 AbilityDef，根据 `def.ui.requiresButton` 和 `def.ui.buttonPhase` 自动决定是否渲染按钮
2. WHEN 按钮被渲染时，THE 按钮文本 SHALL 从 `def.ui.buttonLabel`（i18n key）获取，样式从 `def.ui.buttonVariant` 获取
3. WHEN 按钮可用性被判断时，THE AbilityButtonsPanel SHALL 调用 `canUseAbility(def, ctx)` 获取禁用状态和提示文本
4. WHEN 所有技能的 `AbilityDef.ui` 配置被补全后，THE AbilityButtonsPanel SHALL 不包含任何 `if (abilities.includes('xxx'))` 硬编码块
5. IF 某个技能需要特殊的可用性检查逻辑（如"弃牌堆中有亡灵单位"），THEN THE 检查 SHALL 通过 `AbilityDef.validation.customValidator` 实现，而非 UI 层硬编码

### 需求 6：SmashUp 卡牌文本迁移至 i18n

**用户故事：** 作为开发者，我希望 SmashUp 的 `abilityText`/`abilityTextEn`/`effectText`/`effectTextEn` 迁移至 i18n 系统。

#### 验收标准

1. WHEN 卡牌定义被更新后，THE 定义 SHALL 不包含 `abilityText`/`abilityTextEn`/`effectText`/`effectTextEn` 字段，改为 `textKey` 属性
2. WHEN i18n key 被生成时，THE i18n_System SHALL 在 zh-CN 和 en 两个 locale 文件中包含所有卡牌文本条目
3. WHEN `resolveCardText`/`resolveCardName` 被调用时，THE 函数 SHALL 通过 `t(textKey)` 获取本地化文本

### 需求 7：SmashUp UI 层文本获取方式迁移

**用户故事：** 作为开发者，我希望 SmashUp 的 UI 组件通过 i18n 系统获取卡牌文本。

#### 验收标准

1. WHEN `resolveCardText` 签名变更后（`language` → `t: TFunction`），THE 所有 9 个 UI 调用点 SHALL 同步更新
2. WHEN 语言切换发生时，THE SmashUp_UI SHALL 自动显示对应语言的卡牌文本

### 需求 8：数据完整性与一致性保障

**用户故事：** 作为开发者，我希望迁移后的数据与原始硬编码文本完全一致。

#### 验收标准

1. FOR ALL SummonerWars 技能，THE i18n 中文文本 SHALL 与迁移前硬编码值完全一致
2. FOR ALL SmashUp 卡牌，THE i18n 中英文文本 SHALL 与迁移前硬编码值完全一致
3. WHEN 所有 i18n key 被引用时，THE 每个 key 在 zh-CN 和 en 两个 locale 文件中均有对应条目
