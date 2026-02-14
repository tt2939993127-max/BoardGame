# 审计 11.3 - 炽原精灵士兵能力

## 1. 威势（intimidate）- 雌狮

### 权威描述（i18n）
> 每回合一次，在本单位攻击一个敌方单位之后，将本单位充能。

### 原子步骤拆解
**交互链 A：攻击后自动充能**
1. 攻击后触发（afterAttack）
2. 每回合一次限制
3. 自身充能+1

### 八层链路矩阵

| 层级 | 状态 | 说明 |
|------|------|------|
| 定义层 | ✅ | trigger=afterAttack, effects=[addCharge self +1], usesPerTurn=1 |
| 注册层 | ✅ | 无需执行器注册，addCharge 由通用 resolveAbilityEffects 处理 |
| 执行层 | ✅ | 发射 UNIT_CHARGED(sourcePosition, +1) |
| 状态层 | ✅ | UNIT_CHARGED 正确更新 boosts |
| 验证层 | ✅ | usesPerTurn=1 由 triggerAbilities 检查 abilityUsageCount |
| UI层 | ✅ | 无 UI 交互，攻击后自动触发 |
| i18n层 | ✅ | zh-CN: name="威势", description 完整 |
| 测试层 | ✅ | 3个测试：攻击后充能、每回合一次限制、第二回合重置 |

低风险备注：描述"攻击一个敌方单位之后"，但定义无 target ownership 检查。正常攻击流程强制攻击敌方，仅 healing 模式例外。极端边界情况，标记为低风险（详见 11.2 结论）。

---

## 2. 生命强化（life_up）- 雌狮

### 权威描述（i18n）
> 本单位每有1点充能，则获得生命+1，至多+5。

### 原子步骤拆解
**交互链 A：被动生命加成**
1. 被动触发（passive）
2. 读取自身充能数
3. 生命 += min(充能, 5)

### 八层链路矩阵

| 层级 | 状态 | 说明 |
|------|------|------|
| 定义层 | ✅ | trigger=passive, effects=[modifyLife self, value={type:attribute, attr:charge}] |
| 注册层 | ✅ | 无需执行器注册，被动效果由 getEffectiveLife 处理 |
| 执行层 | ✅ | abilityResolver.ts getEffectiveLife: modifyLife → `life += Math.min(value, 5)` |
| 状态层 | ✅ | 被动效果，无状态变更。伤害判定使用 getEffectiveLife 计算有效生命 |
| 验证层 | ✅ | 无需验证，被动触发 |
| UI层 | ✅ | 无 UI 交互，生命自动计算显示 |
| i18n层 | ✅ | zh-CN: name="生命强化", description 完整 |
| 测试层 | ✅ | 3个基础测试 + 2个集成测试（有充能时承受更多伤害不死亡、充能被移除后生命降低） |

---

## 3. 速度强化（speed_up）- 犀牛

### 权威描述（i18n）
> 本单位每有1点充能，则当本单位移动时，可以额外移动1个区格，至多额外移动5个区格。

### 原子步骤拆解
**交互链 A：被动移动加成**
1. 移动时触发（onMove）
2. 读取自身充能数
3. 额外移动 += min(充能, 5)

### 八层链路矩阵

| 层级 | 状态 | 说明 |
|------|------|------|
| 定义层 | ✅ | trigger=onMove, effects=[custom:speed_up_extra_move] |
| 注册层 | ✅ | 无需执行器注册，由 helpers.ts getMovementEnhancements 处理 |
| 执行层 | ✅ | helpers.ts L682: `speed_up_extra_move` → `extraDistance += Math.min(boosts, 5)` |
| 状态层 | ✅ | 被动效果，无状态变更。移动范围由 getValidMoveTargetsEnhanced 动态计算 |
| 验证层 | ✅ | 移动验证使用 canMoveToEnhanced，内部调用 getMovementEnhancements 包含 speed_up |
| UI层 | ✅ | 移动范围高亮自动包含额外格数 |
| i18n层 | ✅ | zh-CN: name="速度强化", description 完整 |
| 测试层 | ✅ | 3个测试：无充能=2格、有充能=2+充能格、超5充能上限+5 |

---

## 4. 聚能（gather_power）- 祖灵法师

### 权威描述（i18n）
> 在召唤本单位之后，将其充能。

### 原子步骤拆解
**交互链 A：召唤后自动充能**
1. 召唤后触发（onSummon）
2. 自身充能+1

### 八层链路矩阵

| 层级 | 状态 | 说明 |
|------|------|------|
| 定义层 | ✅ | trigger=onSummon, effects=[addCharge self +1] |
| 注册层 | ✅ | 无需执行器注册，addCharge 由通用 resolveAbilityEffects 处理 |
| 执行层 | ✅ | 发射 UNIT_CHARGED(position, +1) |
| 状态层 | ✅ | UNIT_CHARGED 正确更新 boosts |
| 验证层 | ✅ | 无需验证，召唤后自动触发 |
| UI层 | ✅ | 无 UI 交互，召唤后自动触发 |
| i18n层 | ✅ | zh-CN: name="聚能", description 完整 |
| 测试层 | ✅ | 2个测试：召唤后获得1充能、多次召唤累积充能 |

---

## 5. 祖灵交流（spirit_bond）- 祖灵法师

### 权威描述（i18n）
> 在本单位移动之后，将其充能，或者消耗1点充能以将其3个区格以内的一个友方单位充能。

### 原子步骤拆解
**交互链 A：充能自身**
1. 移动阶段激活（activated）
2. 玩家选择"充能自身"
3. 自身充能+1

**交互链 B：转移充能**
1. 移动阶段激活（activated）
2. 玩家选择"转移充能"
3. 检查自身充能 ≥ 1
4. 选择3格内友方非自身单位
5. 自身充能-1，目标充能+1

### 八层链路矩阵

| 层级 | 状态 | 说明 |
|------|------|------|
| 定义层 | ✅ | trigger=activated, effects=[custom:spirit_bond_action], interactionChain 两步（selectChoice→selectTarget(optional)），requiresTargetSelection=true |
| 注册层 | ✅ | executors/barbaric.ts register('spirit_bond') + payloadContract |
| 执行层 | ✅ | choice=self → UNIT_CHARGED +1；choice=transfer → 检查 boosts≥1 + 目标友方+3格内 → UNIT_CHARGED(self,-1) + UNIT_CHARGED(target,+1) |
| 状态层 | ✅ | UNIT_CHARGED 正确更新 boosts |
| 验证层 | ✅ | customValidator 检查：choice 合法、transfer 时 boosts≥1 + 目标存在+友方+非自身+3格内 |
| UI层 | ✅ | requiresButton=false, activationStep=selectChoice，UI 提供"充能自身"/"转移充能"选项 |
| i18n层 | ✅ | zh-CN: name="祖灵交流", description 完整，abilityButtons 有 spiritBondSelf/spiritBondTransfer |
| 测试层 | ✅ | 5个测试：充能自身、转移充能、无充能拒绝转移、超3格拒绝、非友方拒绝 |

---

## 结论

✅ 5个士兵能力全部通过，无 bug。
