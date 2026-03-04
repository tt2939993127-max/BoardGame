# 条件链真值表审查报告

## 概述

对攻击验证、移动验证、伤害计算、能力可用性等多条件组合场景构建真值表，验证每种关键组合的行为正确性。

---

## 真值表 1：攻击验证（canAttackEnhanced）

### 条件变量

| 变量 | 含义 | 取值 |
|------|------|------|
| attackType | 攻击类型 | melee / ranged |
| distance | 攻击距离 | 1-4 |
| isEnemy | 目标是否为敌方 | T/F |
| pathClear | 远程路径是否畅通 | T/F |
| straightLine | 是否直线 | T/F |
| range | 有效攻击范围 | 1(melee) / 4(ranged) |

### 真值表

| # | attackType | distance | isEnemy | pathClear | straightLine | 预期 | 实际 | 状态 |
|---|-----------|----------|---------|-----------|-------------|------|------|------|
| 1 | melee | 1 | T | - | - | ✅允许 | ✅允许 | ✅ |
| 2 | melee | 2 | T | - | - | ❌拒绝 | ❌拒绝(distance≠1) | ✅ |
| 3 | melee | 1 | F | - | - | ❌拒绝 | ❌拒绝(同方) | ✅ |
| 4 | ranged | 1 | T | T | T | ✅允许 | ✅允许 | ✅ |
| 5 | ranged | 2 | T | T | T | ✅允许 | ✅允许 | ✅ |
| 6 | ranged | 3 | T | T | T | ✅允许 | ✅允许 | ✅ |
| 7 | ranged | 4 | T | T | T | ✅允许 | ✅允许 | ✅ |
| 8 | ranged | 5 | T | T | T | ❌拒绝 | ❌拒绝(>range) | ✅ |
| 9 | ranged | 2 | T | F | T | ❌拒绝 | ❌拒绝(pathBlocked) | ✅ |
| 10 | ranged | 2 | T | T | F | ❌拒绝 | ❌拒绝(!straightLine) | ✅ |
| 11 | ranged | 2 | F | T | T | ❌拒绝 | ❌拒绝(同方) | ✅ |
| 12 | ranged | 0 | T | - | - | ❌拒绝 | ❌拒绝(distance=0) | ✅ |

### 特殊场景：ferocity（凶残）

凶残不影响 canAttackEnhanced 的判定，它影响的是 attackCount 限制（凶残单位不受3次攻击限制）。在 hasAvailableActions 中单独检查。

### 特殊场景：guardian（守卫）

守卫在当前实现中不影响 canAttackEnhanced。守卫的效果是"相邻敌方单位必须优先攻击守卫"，这个约束在 validate.ts 中检查，不在 canAttackEnhanced 中。

**代码路径**：helpers.ts canAttackEnhanced:937-965

**状态**：✅ 所有组合正确

---

## 真值表 2：移动验证（canMoveToEnhanced）

### 条件变量

| 变量 | 含义 | 取值 |
|------|------|------|
| baseMove | 基础移动距离 | 2 |
| extraMove | 技能额外移动 | -1 ~ +5 |
| flying | 是否飞行 | T/F |
| climb | 是否攀爬 | T/F |
| charge | 是否冲锋 | T/F |
| immobile | 是否禁足 | T/F |
| targetEmpty | 目标格是否为空 | T/F |

### 真值表

| # | immobile | charge | flying | extraMove | distance | targetEmpty | pathClear | 预期 | 实际 | 状态 |
|---|---------|--------|--------|-----------|----------|-------------|-----------|------|------|------|
| 1 | T | - | - | - | any | T | - | ❌禁足 | ❌禁足 | ✅ |
| 2 | F | F | F | 0 | 1 | T | T | ✅允许 | ✅允许 | ✅ |
| 3 | F | F | F | 0 | 2 | T | T | ✅允许 | ✅允许 | ✅ |
| 4 | F | F | F | 0 | 3 | T | - | ❌超距 | ❌超距 | ✅ |
| 5 | F | F | T | +1 | 3 | T | - | ✅飞行 | ✅飞行(canPassThrough) | ✅ |
| 6 | F | F | F | +1(swift) | 3 | T | T | ✅迅捷 | ✅(maxDist=3, BFS) | ✅ |
| 7 | F | F | F | +1(climb) | 3 | T | T | ✅攀爬 | ✅(canPassStructures) | ✅ |
| 8 | F | T | F | 0 | 3 | T | T(直线) | ✅冲锋 | ✅(1-4格直线) | ✅ |
| 9 | F | T | F | 0 | 5 | T | T(直线) | ❌超距 | ❌(>4格) | ✅ |
| 10 | F | T | F | 0 | 3 | T | F(有阻挡) | ❌阻挡 | ❌(intermediates not empty) | ✅ |
| 11 | F | T | F | 0 | 3 | F | T | ❌目标非空 | ❌(isCellEmpty) | ✅ |
| 12 | F | F | F | -1(slow) | 1 | T | T | ✅允许 | ✅(maxDist=1) | ✅ |
| 13 | F | F | F | -1(slow) | 2 | T | T | ❌超距 | ❌(maxDist=1) | ✅ |
| 14 | F | F | F | +5(speed_up max) | 7 | T | T | ✅允许 | ✅(maxDist=7, BFS) | ✅ |
| 15 | F | T | F | +1(swift) | 2 | T | T | ✅正常移动 | ✅(冲锋或正常均可) | ✅ |

### 特殊场景：冲锋+缓慢

冲锋（charge）和缓慢（slow）是独立机制：
- 冲锋：1-4格直线移动（独立路径，不受 extraMove 影响）
- 缓慢：extraMove -1（影响正常移动距离）
- 冲锋单位有缓慢时：可以选择冲锋（1-4格直线）或正常移动（maxDist=1）

**代码路径**：canMoveToEnhanced 先检查冲锋路径（独立判定），再检查正常移动路径。

**状态**：✅ 正确

### 特殊场景：风暴侵袭（storm_assault）

风暴侵袭在 getUnitMoveEnhancements 中 `extraDistance -= stormReduction`，影响所有单位的正常移动。冲锋不受影响（独立路径）。

**状态**：✅ 正确

---

## 真值表 3：伤害计算（calculateEffectiveStrength）

### 加成来源清单

| 加成来源 | 类型 | 公式 | 可叠加 |
|---------|------|------|--------|
| power_boost | 被动(伤害标记) | +damage（应无上限，当前被截断为+5） | 单一来源 |
| power_up | 被动(充能) | +min(charge, 5) | 单一来源 |
| blood_rage | 被动(充能) | +charge（应无上限，当前被截断为+5） | 单一来源 |
| rage | 被动(伤害标记) | +damage | 单一来源 |
| charge（冲锋） | 被动(boosts标记) | +boosts | 单一来源 |
| fortress_elite | 被动(光环) | +友方城塞单位数(2格内) | 单一来源 |
| radiant_shot | 被动(魔力) | +floor(魔力/2) | 单一来源 |
| frost_bolt | 被动(建筑) | +相邻友方建筑数 | 单一来源 |
| greater_frost_bolt | 被动(建筑) | +2格内友方建筑数 | 单一来源 |
| swarm（成群结队） | 事件卡 | +与目标相邻的友方单位数 | 单一来源 |
| hellfire_blade | 附加事件卡 | +2 | 单一来源 |
| hypnotic_lure | 事件卡 | +1（召唤师攻击被催眠目标） | 单一来源 |
| holy_judgment | 事件卡 | +1（友方士兵，有充能时） | 单一来源 |
| life_drain | 攻击前 | ×2（消灭友方单位） | 乘法 |
| holy_arrow | 攻击前 | +弃牌数（通过充能） | 加法 |

### 多加成叠加验证

| # | 场景 | 加成组合 | 预期 | 实际 | 状态 |
|---|------|---------|------|------|------|
| 1 | 亡灵战士(str:1) + 3伤害 | power_boost(+3) | 4 | 4（min(3,5)=3） | ✅ |
| 2 | 蒙威尊者(str:3) + 4充能 | power_up(+4) | 7 | 7（min(4,5)=4） | ✅ |
| 3 | 蒙威尊者(str:3) + 6充能 | power_up(+5上限) | 8 | 8（min(6,5)=5） | ✅ |
| 4 | 血腥狂怒单位(str:2) + 3充能 | blood_rage(+3) | 5 | 5（min(3,5)=3） | ✅ |
| 5 | 城塞精锐(str:2) + 2友方城塞 | fortress_elite(+2) | 4 | 4 | ✅ |
| 6 | 辉光射击(str:2) + 10魔力 | radiant_shot(+5) | 7 | 7 | ✅ |
| 7 | 冰霜飞弹(str:1) + 3相邻建筑 | frost_bolt(+3) | 4 | 4 | ✅ |
| 8 | 单位(str:2) + hellfire_blade + swarm(2邻) | +2 +2 | 6 | 6 | ✅ |
| 9 | 召唤师(str:3) + hypnotic_lure | +1 | 4 | 4 | ✅ |
| 10 | 士兵(str:1) + holy_judgment | +1 | 2 | 2 | ✅ |

### 叠加顺序

calculateEffectiveStrength 按以下顺序叠加：
1. 基础战力（card.strength）
2. 附加事件卡加成（hellfire_blade +2）
3. 催眠引诱加成（hypnotic_lure +1）
4. 被动/onDamageCalculation 技能加成（rage/power_boost/power_up/blood_rage）
5. 成群结队加成（swarm）
6. 冲锋加成（charge boosts）
7. 城塞精锐加成（fortress_elite）
8. 辉光射击加成（radiant_shot）
9. 冰霜飞弹加成（frost_bolt/greater_frost_bolt）
10. 圣洁审判加成（holy_judgment）
11. Math.max(0, strength) 最终下限

所有加成为加法叠加（除 life_drain 为乘法），顺序不影响结果。

**状态**：✅ 叠加逻辑正确

---

## 真值表 4：能力可用性（canActivateAbility）

### 条件变量

| 变量 | 含义 |
|------|------|
| requiredPhase | 要求的阶段 |
| currentPhase | 当前阶段 |
| usesPerTurn | 每回合使用次数限制 |
| usageCount | 已使用次数 |
| customValidator | 自定义验证 |
| hasLegalTargets | 是否有合法目标 |

### 真值表

| # | phaseMatch | usageOK | validatorOK | hasTargets | 预期 | 实际 | 状态 |
|---|-----------|---------|-------------|------------|------|------|------|
| 1 | T | T | T | T | ✅可用 | ✅可用 | ✅ |
| 2 | F | T | T | T | ❌阶段不匹配 | ❌拒绝 | ✅ |
| 3 | T | F(已用完) | T | T | ❌次数用完 | ❌拒绝 | ✅ |
| 4 | T | T | F(条件不满足) | T | ❌验证失败 | ❌拒绝 | ✅ |
| 5 | T | T | T | F | ❌无目标 | ❌拒绝 | ✅ |
| 6 | T | T | 无validator | T | ✅可用 | ✅可用 | ✅ |
| 7 | 无requiredPhase | T | T | T | ✅可用 | ✅可用 | ✅ |

### 关键能力可用性验证

| 能力 | requiredPhase | usesPerTurn | customValidator | 验证 |
|------|-------------|------------|----------------|------|
| revive_undead | summon | 1 | 弃牌堆有普通单位+有召唤位置 | ✅ |
| blood_rune | attack | 1 | 无（选择模式由 UI 处理） | ✅ |
| prepare | move | 1 | 未移动(!hasMoved) | ✅ |
| frost_axe | move（隐含） | 无 | 移动后自动触发 | ✅ |
| structure_shift | move（隐含） | 无 | 移动后自动触发 | ✅ |

**状态**：✅ 所有组合正确

---

## 发现汇总

| # | 严重度 | 类别 | 描述 | 来源 |
|---|--------|------|------|------|
| TT-1 | medium | logic_error | power_boost 被+5上限截断（同 CM-1） | 真值表3 |
| TT-2 | low | logic_error | blood_rage 被+5上限截断（同 CM-2） | 真值表3 |

**结论**：攻击验证、移动验证、能力可用性判定的条件组合均正确。伤害计算中发现 power_boost/blood_rage 的上限截断问题（与充能矩阵报告一致）。
