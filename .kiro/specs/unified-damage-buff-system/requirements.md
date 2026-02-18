# 需求文档

## 简介

统一三个游戏（王权骰铸、召唤师战争、大杀四方）的伤害计算与 buff 日志系统。修复王权骰铸的双重伤害路径和 Pyromancer 跳过状态效果的 bug，并为召唤师战争和大杀四方的 ActionLog 添加 buff/力量修正的 breakdown tooltip。

## 术语表

- **DamageCalculation**: 引擎层伤害计算原语（`engine/primitives/damageCalculation.ts`），支持自动收集 Token/Status/Shield 修正并生成带 breakdown 的 DAMAGE_DEALT 事件
- **ModifierStack**: 引擎层通用数值修改器栈（`engine/primitives/modifier.ts`），支持 flat/percent/override/compute 类型
- **路径A**: 王权骰铸中 `resolveEffectAction.damage` case 使用的伤害处理流程，通过 `applyOnDamageReceivedTriggers()` 处理被动触发器（modifyStat、removeStatus、custom/PREVENT_DAMAGE）
- **路径B**: 王权骰铸中 custom action 使用的伤害处理流程，通过 `createDamageCalculation` 引擎原语处理，使用 `collectStatusModifiers()` 收集状态修正
- **PassiveTrigger**: 王权骰铸 TokenDef 上的被动触发器配置，定义 Token/Status 在特定时机（如 `onDamageReceived`）自动执行的动作
- **autoCollect**: DamageCalculation 的配置项（autoCollectTokens/autoCollectStatus/autoCollectShields），控制是否自动收集对应类型的修正
- **Breakdown**: 伤害/力量计算的明细分解，显示基础值和各修正项的贡献
- **DamageSourceResolver**: 引擎层接口，游戏层实现后可将 sourceId 翻译为可显示标签
- **OngoingModifier**: 大杀四方中持续力量修正系统，通过注册表模式动态计算随从力量

## 需求

### 需求 1：统一王权骰铸伤害路径

**用户故事：** 作为开发者，我希望王权骰铸只有一条伤害计算路径，以消除逻辑重复和不一致。

#### 验收标准

1. WHEN `resolveEffectAction` 处理 `damage` 类型效果时，THE 伤害计算系统 SHALL 使用 `createDamageCalculation` 引擎原语替代手动计算
2. WHEN DamageCalculation 执行伤害计算时，THE DamageCalculation SHALL 支持 PassiveTrigger 中的 `custom` 类型动作（包括 PREVENT_DAMAGE）
3. WHEN DamageCalculation 执行伤害计算时，THE DamageCalculation SHALL 支持 PassiveTrigger 中的 `removeStatus` 类型动作
4. WHEN 路径统一完成后，THE 系统 SHALL 移除 `applyOnDamageReceivedTriggers` 函数及其相关代码
5. WHEN 统一后的伤害路径处理 Token 响应窗口时，THE 系统 SHALL 保持与现有 Token 响应窗口逻辑一致的行为
6. WHEN 路径统一完成后，THE 系统 SHALL 保证所有现有角色（monk、shadow_thief、barbarian、moon_elf、paladin、pyromancer 等）的伤害计算结果与统一前一致（Pyromancer bug 修复除外）

### 需求 2：修复 Pyromancer 状态效果跳过 bug

**用户故事：** 作为玩家，我希望 Pyromancer 的技能伤害能正确应用状态效果修正（如护甲减伤），以确保游戏规则一致性。

#### 验收标准

1. WHEN Pyromancer 的 custom action 产生伤害时，THE DamageCalculation SHALL 正确收集并应用目标的状态效果修正
2. WHEN Pyromancer 的 custom action 产生伤害时，THE DamageCalculation SHALL 正确收集并应用目标的 Token 修正
3. WHEN Pyromancer 的 custom action 产生伤害时，THE DamageCalculation SHALL 正确收集并应用目标的 Shield 修正
4. IF Pyromancer 的某个 custom action 确实需要跳过特定类型的自动收集，THEN THE 系统 SHALL 通过显式注释说明原因

### 需求 3：DamageCalculation 引擎层增强

**用户故事：** 作为引擎开发者，我希望 DamageCalculation 能支持所有 PassiveTrigger 动作类型，以便所有游戏的伤害路径都能统一使用引擎原语。

#### 验收标准

1. WHEN DamageCalculation 收集修正时，THE DamageCalculation SHALL 扫描目标玩家的 TokenDef 中 `onDamageReceived` 时机的 PassiveTrigger
2. WHEN PassiveTrigger 包含 `modifyStat` 动作时，THE DamageCalculation SHALL 将其转换为 ModifierStack 中的 flat 类型修改器
3. WHEN PassiveTrigger 包含 `removeStatus` 动作时，THE DamageCalculation SHALL 生成对应的 STATUS_REMOVED 事件并附加到结果中
4. WHEN PassiveTrigger 包含 `custom` 动作且产生 PREVENT_DAMAGE 事件时，THE DamageCalculation SHALL 将阻止量作为负值 flat 修改器应用到伤害计算中
5. WHEN PassiveTrigger 包含 `custom` 动作时，THE DamageCalculation SHALL 将 custom handler 产生的副作用事件附加到结果中

### 需求 4：召唤师战争攻击日志 Breakdown 增强

**用户故事：** 作为玩家，我希望在召唤师战争的攻击日志中看到战力 breakdown tooltip，以了解哪些 buff 贡献了多少骰子数。

#### 验收标准

1. WHEN 攻击日志显示伤害数值时，THE ActionLog 格式化器 SHALL 使用 `buildDamageBreakdownSegment` 生成带 tooltip 的 breakdown 片段
2. WHEN 单位拥有战力 buff（如附加事件卡、催眠引诱、冲锋、城塞精锐等）时，THE Breakdown SHALL 列出每个 buff 的名称和贡献值
3. WHEN 单位基础战力未被修正时，THE ActionLog SHALL 显示普通数值而非 breakdown tooltip
4. THE 召唤师战争 SHALL 实现 `DamageSourceResolver` 接口以支持 breakdown 中的来源名称解析
5. WHEN 攻击日志增强后，THE 系统 SHALL 保持现有日志条目的结构和内容不变，仅在有 buff 时额外添加 breakdown tooltip

### 需求 5：大杀四方力量 Breakdown 日志增强

**用户故事：** 作为玩家，我希望在大杀四方的基地结算日志中看到力量 breakdown，以了解哪些 ongoing 效果贡献了多少力量。

#### 验收标准

1. WHEN 基地结算日志显示玩家力量总和时，THE ActionLog 格式化器 SHALL 使用 breakdown 格式显示力量明细
2. WHEN 随从拥有力量修正（powerModifier、tempPowerModifier、ongoingModifier）时，THE Breakdown SHALL 列出每个修正来源的名称和贡献值
3. WHEN 随从没有任何力量修正时，THE ActionLog SHALL 显示普通力量数值而非 breakdown tooltip
4. THE 大杀四方 SHALL 扩展 `getOngoingPowerModifier` 以返回每个修正来源的明细信息（而非仅返回总和）
5. WHEN 力量 breakdown 增强后，THE 系统 SHALL 保持现有力量计算逻辑和基地结算逻辑不变，仅增强日志展示

### 需求 6：Breakdown 数据结构通用化

**用户故事：** 作为引擎开发者，我希望 breakdown 数据结构能适配不同游戏的数值模型（伤害、战力、力量），以实现跨游戏复用。

#### 验收标准

1. THE `buildDamageBreakdownSegment` SHALL 支持自定义基础值标签（如"基础伤害"、"基础战力"、"基础力量"）
2. WHEN 游戏层传入 breakdown 数据时，THE 框架层 SHALL 统一渲染 tooltip 样式，游戏层无需关心渲染逻辑
3. THE Breakdown 渲染组件 SHALL 支持正值（绿色/增益）和负值（红色/减益）的视觉区分
