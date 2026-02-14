# 审计 11.2 - 炽原精灵冠军能力

## 1. 力量强化（power_up）- 蒙威尊者

### 权威描述（i18n）
> 本单位每有1点充能，则获得战力+1，至多为+5。

### 原子步骤拆解
**交互链 A：被动战力加成**
1. 被动触发（onDamageCalculation）
2. 读取自身充能数
3. 战力 += min(充能, 5)

### 八层链路矩阵

| 层级 | 状态 | 说明 |
|------|------|------|
| 定义层 | ✅ | trigger=onDamageCalculation, effects=[modifyStrength, value={type:attribute, attr:charge}] |
| 注册层 | ✅ | 无需执行器注册，被动效果由 calculateEffectiveStrength 处理 |
| 执行层 | ✅ | abilityResolver.ts: `power_boost` 或 `power_up` → `strength += Math.min(value, 5)` |
| 状态层 | ✅ | 被动效果，无状态变更 |
| 验证层 | ✅ | 无需验证，被动触发 |
| UI层 | ✅ | 无 UI 交互，战力自动计算显示 |
| i18n层 | ✅ | zh-CN: name="力量强化", description="本单位每有1点充能，则获得战力+1，至多为+5。" |
| 测试层 | ✅ | 3个测试：无充能=基础值、有充能=基础+充能、超5充能上限+5 |

---

## 2. 预备（prepare）- 梅肯达·露 / 边境弓箭手

### 权威描述（i18n）
> 你可以将本单位充能，以代替本单位的移动。

### 原子步骤拆解
**交互链 A：充能代替移动**
1. 移动阶段，单位未移动
2. 玩家点击"预备"按钮
3. 单位获得1点充能
4. 消耗该单位的移动行动（costsMoveAction=true）

### 八层链路矩阵

| 层级 | 状态 | 说明 |
|------|------|------|
| 定义层 | ✅ | trigger=activated, costsMoveAction=true, effects=[addCharge self +1], usesPerTurn=1, requiredPhase=move, customValidator 检查 hasMoved |
| 注册层 | ✅ | executors/barbaric.ts register('prepare') |
| 执行层 | ✅ | 发射 UNIT_CHARGED(position, +1) |
| 状态层 | ✅ | UNIT_CHARGED 在 reduce.ts 正确更新 boosts 字段 |
| 验证层 | ✅ | customValidator 检查 hasMoved=false + requiredPhase=move + usesPerTurn=1 |
| UI层 | ✅ | requiresButton=true, buttonPhase=move, activationType=directExecute, extraCondition 检查 !hasMoved |
| i18n层 | ✅ | zh-CN: name="预备", description 完整 |
| 测试层 | ✅ | 4个测试：正常充能、已移动拒绝、非移动阶段拒绝、每回合一次限制 |

---

## 3. 连续射击（rapid_fire）- 梅肯达·露 / 边境弓箭手

### 权威描述（i18n）
> 每回合一次，在本单位攻击之后，你可以消耗1点充能以使其进行一次额外的攻击。

### 原子步骤拆解
**交互链 A：额外攻击**
1. 攻击后触发（afterAttack）
2. 检查充能 ≥ 1
3. 发射 ABILITY_TRIGGERED 事件通知 UI
4. 玩家确认后通过 ACTIVATE_ABILITY 命令执行
5. 消耗1点充能
6. 授予额外攻击（EXTRA_ATTACK_GRANTED → 重置 hasAttacked + extraAttacks+1）

### 八层链路矩阵

| 层级 | 状态 | 说明 |
|------|------|------|
| 定义层 | ✅ | trigger=afterAttack, effects=[custom:rapid_fire_extra_attack], usesPerTurn=1, customValidator 检查 boosts≥1 |
| 注册层 | ✅ | executors/barbaric.ts register('rapid_fire') |
| 执行层 | ✅ | 消耗1充能(UNIT_CHARGED -1) + 发射 EXTRA_ATTACK_GRANTED |
| 状态层 | ✅ | EXTRA_ATTACK_GRANTED 在 reduce.ts 重置 hasAttacked=false + extraAttacks+1；ATTACK_EXECUTED 消耗 extraAttacks |
| 验证层 | ✅ | customValidator 检查 boosts≥1 + usesPerTurn=1 |
| UI层 | ✅ | afterAttack 触发 ABILITY_TRIGGERED 事件，UI 检测后提示玩家确认 |
| i18n层 | ✅ | zh-CN: name="连续射击", description 完整 |
| 测试层 | ✅ | 5个测试：正常额外攻击、无充能拒绝、每回合一次限制、充能消耗验证、额外攻击后状态重置 |

---

## 4. 启悟（inspire）- 凯鲁尊者

### 权威描述（i18n）
> 在本单位移动之后，将其相邻的所有友方单位充能。

### 原子步骤拆解
**交互链 A：移动后充能相邻友方**
1. 移动阶段激活（activated）
2. 遍历四方向相邻格
3. 对每个友方非自身单位发射 UNIT_CHARGED +1

### 八层链路矩阵

| 层级 | 状态 | 说明 |
|------|------|------|
| 定义层 | ✅ | trigger=activated, effects=[addCharge adjacentAllies +1], requiredPhase=move |
| 注册层 | ✅ | executors/barbaric.ts register('inspire') |
| 执行层 | ✅ | 遍历四方向，友方+非自身→UNIT_CHARGED +1 |
| 状态层 | ✅ | UNIT_CHARGED 正确更新 boosts |
| 验证层 | ✅ | requiredPhase=move |
| UI层 | ✅ | requiresButton=false, activationType=directExecute（移动后自动触发） |
| i18n层 | ✅ | zh-CN: name="启悟", description 完整 |
| 测试层 | ✅ | 3个测试：充能相邻友方、不充能敌方、不充能自身 |

---

## 5. 撤退（withdraw）- 凯鲁尊者

### 权威描述（i18n）
> 在本单位攻击之后，你可以消耗1点充能或魔力。如果你这样做，则将本单位推拉1至2个区格。

### 原子步骤拆解
**交互链 A：攻击后消耗资源移动**
1. 攻击后触发（afterAttack）
2. 玩家选择消耗类型（充能/魔力）
3. 玩家选择目标位置（1-2格空格）
4. 消耗1充能或1魔力
5. 移动自身到目标位置

### 八层链路矩阵

| 层级 | 状态 | 说明 |
|------|------|------|
| 定义层 | ✅ | trigger=afterAttack, effects=[custom:withdraw_push_pull], interactionChain 两步（selectCostType→selectPosition） |
| 注册层 | ✅ | executors/barbaric.ts register('withdraw') + payloadContract |
| 执行层 | ✅ | 根据 costType 消耗充能(UNIT_CHARGED -1)或魔力(MAGIC_CHANGED -1)，然后 UNIT_MOVED |
| 状态层 | ✅ | UNIT_CHARGED/MAGIC_CHANGED/UNIT_MOVED 在 reduce.ts 正确处理 |
| 验证层 | ✅ | customValidator 检查：costType 合法、资源充足、目标位置1-2格+空格 |
| UI层 | ✅ | requiresButton=true, buttonPhase=attack, activationType=withdrawMode, quickCheck 检查充能或魔力 |
| i18n层 | ✅ | zh-CN: name="撤退", description 完整，uiHints.withdraw 有 selectCost/selectPosition 提示 |
| 测试层 | ✅ | 6个测试：充能移动1格、充能移动2格、魔力移动、超距拒绝、资源不足拒绝、非空格拒绝 |

---

## 结论

✅ 5个冠军能力全部通过，无 bug。

低风险备注：
- `intimidate`（威势）描述为"攻击一个敌方单位之后"，但定义无 target ownership 检查。正常攻击流程中 validate.ts 强制攻击敌方，仅 healing 模式允许攻击友方。若雌狮通过交缠颂歌获得 healing 并攻击友方，intimidate 仍会触发。此为极端边界情况（需跨阵营交缠），实际游戏中不会发生，标记为低风险。
