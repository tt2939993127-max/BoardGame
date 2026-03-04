# 审计 10.2 - 极地矮人冠军能力

## 1. 寒流（cold_snap）- 奥莱格

### 权威描述
本单位3个区格以内的友方建筑获得生命+1。

### 原子步骤拆解
1. 被动光环：3格内友方建筑 life+1

### 八层链路矩阵

| 层级 | 状态 | 说明 |
|------|------|------|
| 定义层 | ✅ | trigger=passive, effects=[auraStructureLife, range=3, value=1] |
| 注册层 | ✅ | abilityResolver.ts getEffectiveStructureLife 遍历友方单位被动技能 |
| 执行层 | N/A | 被动光环，无执行器 |
| 状态层 | N/A | 被动光环，无状态变更 |
| 验证层 | N/A | 被动光环 |
| UI层 | ✅ | 建筑生命显示通过 getEffectiveStructureLife |
| i18n层 | ✅ | zh-CN/en 均有 cold_snap 条目 |
| 测试层 | ⚠️ | 无直接测试 cold_snap 光环效果（通过 entity-chain-integrity 间接覆盖） |

⚠️ 低风险：cold_snap 无独立行为测试，但 getEffectiveStructureLife 逻辑简单且被 entity-chain-integrity 覆盖。

---

## 2. 威势（imposing）- 贾穆德

### 权威描述
每回合一次，在本单位攻击一个敌方单位之后，将本单位充能。

### 原子步骤拆解
1. 触发条件：攻击后（afterAttack）
2. 使用限制：每回合1次（usesPerTurn=1）
3. 效果：自身 boosts+1

### 八层链路矩阵

| 层级 | 状态 | 说明 |
|------|------|------|
| 定义层 | ✅ | trigger=afterAttack, effects=[addCharge self +1], usesPerTurn=1 |
| 注册层 | ✅ | 通过 abilityResolver 通用 afterAttack 处理 |
| 执行层 | ✅ | 攻击后自动触发 ABILITY_TRIGGERED + UNIT_CHARGED |
| 状态层 | ✅ | reduce UNIT_CHARGED 正确处理 |
| 验证层 | N/A | 自动触发 |
| UI层 | N/A | 自动触发 |
| i18n层 | ✅ | zh-CN/en 均有 imposing 条目 |
| 测试层 | ✅ | 1个测试：攻击后触发 ABILITY_TRIGGERED + UNIT_CHARGED |

✅ 全部通过。

---

## 3. 寒冰碎屑（ice_shards）- 贾穆德

### 权威描述
在你的建造阶段结束时，你可以消耗1点充能，以对每个和你所控制建筑相邻的敌方单位造成1点伤害。

### 原子步骤拆解
1. 触发条件：建造阶段结束（onPhaseEnd, requiredPhase=build）
2. 前置条件：boosts≥1
3. 消耗充能：UNIT_CHARGED(-1)
4. 遍历所有友方建筑（含活体结构）
5. 对每个建筑相邻的敌方单位造成1伤（去重）

### 八层链路矩阵

| 层级 | 状态 | 说明 |
|------|------|------|
| 定义层 | ✅ | trigger=onPhaseEnd, requiredPhase=build, customValidator 检查 boosts≥1 |
| 注册层 | ✅ | executors/frost.ts register('ice_shards') |
| 执行层 | ✅ | 消耗充能 → 遍历建筑+活体结构 → 相邻敌方去重 → UNIT_DAMAGED |
| 状态层 | ✅ | reduce 正确处理 UNIT_CHARGED + UNIT_DAMAGED |
| 验证层 | ✅ | customValidator: boosts≥1 |
| UI层 | ✅ | activationType=directExecute, quickCheck 检查 boosts≥1 |
| i18n层 | ✅ | zh-CN/en 均有 ice_shards 条目 |
| 测试层 | ✅ | 5个测试：消耗充能+伤害、无充能拒绝、友方不受伤、活体结构计入、去重 |

✅ 全部通过。

---

## 4. 高阶冰霜飞弹（greater_frost_bolt）- 纳蒂亚娜

### 权威描述
本单位2个区格以内每有一个友方建筑，则获得战力+1。

### 原子步骤拆解
1. 被动效果：calculateEffectiveStrength 中统计2格内友方建筑数量

### 八层链路矩阵

| 层级 | 状态 | 说明 |
|------|------|------|
| 定义层 | ✅ | trigger=onDamageCalculation, custom actionId=greater_frost_bolt_boost |
| 注册层 | ✅ | abilityResolver.ts calculateEffectiveStrength 中检查 greater_frost_bolt |
| 执行层 | ✅ | 遍历棋盘，统计2格内友方建筑+活体结构数量 |
| 状态层 | N/A | 被动加成 |
| 验证层 | N/A | 被动加成 |
| UI层 | ✅ | 战力显示通过 calculateEffectiveStrength |
| i18n层 | ✅ | zh-CN/en 均有 greater_frost_bolt 条目 |
| 测试层 | ✅ | 5个测试：无建筑=基础值、1建筑+1、2建筑+2、超2格不计入、活体结构计入 |

✅ 全部通过。

## 总结
极地矮人4个冠军能力全部通过，cold_snap 无独立测试但低风险。
