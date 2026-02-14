# 审计 10.3 - 极地矮人士兵能力

## 1. 冰霜飞弹（frost_bolt）- 冰霜法师

### 权威描述
本单位相邻每有一个友方建筑，则获得战力+1。

### 原子步骤拆解
1. 被动效果：calculateEffectiveStrength 中统计相邻（距离=1）友方建筑数量

### 八层链路矩阵

| 层级 | 状态 | 说明 |
|------|------|------|
| 定义层 | ✅ | trigger=onDamageCalculation, custom actionId=frost_bolt_boost |
| 注册层 | ✅ | abilityResolver.ts calculateEffectiveStrength 中检查 frost_bolt |
| 执行层 | ✅ | 遍历4方向相邻格，统计友方建筑+活体结构 |
| 状态层 | N/A | 被动加成 |
| 验证层 | N/A | 被动加成 |
| UI层 | ✅ | 战力显示通过 calculateEffectiveStrength |
| i18n层 | ✅ | zh-CN/en 均有 frost_bolt 条目 |
| 测试层 | ✅ | 6个测试：无建筑=基础值、1建筑+1、2建筑+2、非相邻不计入、敌方不计入、活体结构计入 |

✅ 全部通过。

---

## 2. 践踏（trample）- 熊骑兵

### 权威描述
当本单位移动时，可以穿过士兵。在本单位移动之后，对每个被穿过的士兵造成1点伤害。

### 原子步骤拆解
1. 移动增强：canPassThrough=units（穿过单位）
2. 伤害效果：damageOnPassThrough=1（穿过时造成1伤）

### 八层链路矩阵

| 层级 | 状态 | 说明 |
|------|------|------|
| 定义层 | ✅ | trigger=onMove, effects=[extraMove +0, canPassThrough=units, damageOnPassThrough=1] |
| 注册层 | ✅ | helpers.ts getUnitMoveEnhancements 读取 damageOnPassThrough |
| 执行层 | ✅ | execute MOVE_UNIT 中检测路径上的单位并发射 UNIT_DAMAGED |
| 状态层 | ✅ | reduce UNIT_DAMAGED 正确处理 |
| 验证层 | ✅ | canMoveToEnhanced 允许穿过单位 |
| UI层 | ✅ | getValidMoveTargetsEnhanced 返回穿越路径 |
| i18n层 | ✅ | zh-CN/en 均有 trample 条目 |
| 测试层 | ⚠️ | 无独立 trample 测试文件（通过 entity-chain-integrity 间接覆盖） |

⚠️ 低风险：trample 无独立行为测试，但 helpers.ts 中 damageOnPassThrough 逻辑已被 getUnitMoveEnhancements 测试覆盖。描述中"士兵"无敌我限定，实现中 damageOnPassThrough 对路径上所有单位生效（不区分敌我），语义正确。

---

## 3. 冰霜战斧（frost_axe）- 寒冰锻造师

### 权威描述
在本单位移动之后，你可以将其充能，或者消耗其所有充能（至少1点）以将其放置到3个区格以内一个友方士兵的底层。

### 原子步骤拆解
- 链A（充能）：移动后 → 选择"self" → UNIT_CHARGED(+1)
- 链B（附加）：移动后 → 选择"attach" → 检查 boosts≥1 → 选择3格内友方士兵 → 清空充能 → UNIT_ATTACHED

### 八层链路矩阵

| 层级 | 状态 | 说明 |
|------|------|------|
| 定义层 | ✅ | trigger=activated, interactionChain 两步（selectChoice+selectAttachTarget） |
| 注册层 | ✅ | executors/frost.ts register('frost_axe') |
| 执行层 | ✅ | self→UNIT_CHARGED(+1); attach→清空充能+UNIT_ATTACHED |
| 状态层 | ✅ | reduce UNIT_CHARGED + UNIT_ATTACHED 正确处理 |
| 验证层 | ✅ | customValidator: self 直接通过; attach 检查 boosts≥1+目标存在+友方+common+距离≤3+非自身 |
| UI层 | ✅ | activationStep=selectChoice |
| i18n层 | ✅ | zh-CN/en 均有 frost_axe 条目 |
| 测试层 | ⚠️ | 无独立 frost_axe 测试（通过 entity-chain-integrity 间接覆盖） |

⚠️ 低风险：frost_axe 无独立行为测试，但 executor 和 validator 逻辑完整。

---

## 4. 活体传送门（living_gate）- 寒冰魔像

### 权威描述
本卡牌视为传送门。

### 八层链路矩阵

| 层级 | 状态 | 说明 |
|------|------|------|
| 定义层 | ✅ | trigger=passive, effects=[] |
| 注册层 | ✅ | helpers.ts getValidSummonPositions 检查 living_gate |
| 执行层 | N/A | 被动效果 |
| 状态层 | N/A | 被动效果 |
| 验证层 | ✅ | 召唤验证时将 living_gate 单位视为传送门 |
| UI层 | ✅ | 召唤位置高亮包含 living_gate 相邻格 |
| i18n层 | ✅ | zh-CN/en 均有 living_gate 条目 |
| 测试层 | ⚠️ | 无独立测试 |

---

## 5. 活体结构（mobile_structure）- 寒冰魔像

### 权威描述
本卡牌视为建筑，但可以移动。

### 八层链路矩阵

| 层级 | 状态 | 说明 |
|------|------|------|
| 定义层 | ✅ | trigger=passive, effects=[] |
| 注册层 | ✅ | helpers.ts/executors 中检查 mobile_structure 将单位视为建筑 |
| 执行层 | ✅ | structure_shift/ice_shards 中将 mobile_structure 单位视为建筑 |
| 状态层 | N/A | 被动效果 |
| 验证层 | ✅ | frost_bolt/greater_frost_bolt 计算中将 mobile_structure 视为建筑 |
| UI层 | ✅ | 战力/建筑相关 UI 正确识别 |
| i18n层 | ✅ | zh-CN/en 均有 mobile_structure 条目 |
| 测试层 | ✅ | frost_bolt/greater_frost_bolt/ice_shards 测试中均有活体结构测试用例 |

✅ 全部通过。

---

## 6. 缓慢（slow）- 寒冰魔像

### 权威描述
本单位必须减少移动1个区格。

### 八层链路矩阵

| 层级 | 状态 | 说明 |
|------|------|------|
| 定义层 | ✅ | trigger=onMove, effects=[extraMove -1] |
| 注册层 | ✅ | helpers.ts getUnitMoveEnhancements 读取 extraMove=-1 |
| 执行层 | N/A | 被动效果 |
| 状态层 | N/A | 被动效果 |
| 验证层 | ✅ | canMoveToEnhanced 使用减少后的移动距离 |
| UI层 | ✅ | getValidMoveTargetsEnhanced 返回正确目标 |
| i18n层 | ✅ | zh-CN/en 均有 slow 条目 |
| 测试层 | ✅ | 3个测试：1格可移动、2格不可移动、相邻空格可达 |

✅ 全部通过。

## 总结
极地矮人6个士兵能力全部通过。trample/frost_axe/living_gate 无独立行为测试但低风险（逻辑简单或被间接覆盖）。
