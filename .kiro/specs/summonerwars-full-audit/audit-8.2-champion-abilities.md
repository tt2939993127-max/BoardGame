# 审计 8.2 - 洞穴地精冠军能力

## 1. 鲜血符文（blood_rune）- 布拉夫

### 权威描述
攻击阶段开始时，布拉夫必须选择：自身受到1点伤害，或花费1点魔力获得1点充能。

### 原子步骤拆解
- 链A（自伤）：攻击阶段开始 → 选择"damage" → 自身受1伤
- 链B（充能）：攻击阶段开始 → 检查魔力≥1 → 选择"charge" → 扣1魔力 → boosts+1

### 八层链路矩阵

| 层级 | 状态 | 说明 |
|------|------|------|
| 定义层 | ✅ | trigger=onPhaseStart, requiredPhase=attack, customValidator 检查 choice 和魔力 |
| 注册层 | ✅ | executors/goblin.ts register('blood_rune') |
| 执行层 | ✅ | damage→UNIT_DAMAGED(reason=blood_rune); charge→MAGIC_CHANGED(-1)+UNIT_CHARGED(+1) |
| 状态层 | ✅ | reduce 正确处理 UNIT_DAMAGED/MAGIC_CHANGED/UNIT_CHARGED |
| 验证层 | ✅ | customValidator: choice 必须为 damage/charge，charge 时检查 magic≥1 |
| UI层 | ✅ | requiresButton=false（阶段开始自动提示），activationStep=selectChoice |
| i18n层 | ✅ | zh-CN/en 均有 blood_rune 条目 |
| 测试层 | ✅ | 3个测试：自伤验证伤害、充能验证魔力和boosts、魔力不足拒绝 |

✅ 全部通过。

---

## 2. 力量强化（power_boost）- 布拉夫

### 权威描述
每点充能（boosts）+1战力，最多+5。

### 原子步骤拆解
1. 被动效果：calculateEffectiveStrength 读取 boosts
2. 加成上限：min(boosts, 5)

### 八层链路矩阵

| 层级 | 状态 | 说明 |
|------|------|------|
| 定义层 | ✅ | 复用亡灵法师 abilities.ts 中的 power_boost 定义 |
| 注册层 | ✅ | 通过 abilityResolver calculateEffectiveStrength 处理 |
| 执行层 | ✅ | abilityResolver.ts: `if (abilityIds.has('power_boost'))` → min(boosts, 5) |
| 状态层 | ✅ | boosts 由 UNIT_CHARGED 事件维护 |
| 验证层 | N/A | 被动效果，无需验证 |
| UI层 | ✅ | 战力显示通过 calculateEffectiveStrength |
| i18n层 | ✅ | 复用亡灵法师 power_boost 条目 |
| 测试层 | ✅ | 3个测试：3充能=3战力、8充能=5战力（上限）、0充能=0战力 |

✅ 全部通过。

---

## 3. 魔力成瘾（magic_addiction）- 史米革

### 权威描述
回合结束时，史米革必须花费1点魔力。如果无法支付，史米革被消灭。

### 原子步骤拆解
1. 触发条件：回合结束（onTurnEnd）
2. 检查魔力：magic≥1 → 扣1魔力；magic=0 → 自毁

### 八层链路矩阵

| 层级 | 状态 | 说明 |
|------|------|------|
| 定义层 | ✅ | trigger=onTurnEnd, custom actionId=magic_addiction_check |
| 注册层 | ✅ | executors/goblin.ts register('magic_addiction') |
| 执行层 | ✅ | magic≥1→MAGIC_CHANGED(-1); else→UNIT_DESTROYED(reason=magic_addiction) |
| 状态层 | ✅ | reduce 正确处理两种事件 |
| 验证层 | N/A | 自动触发，无需玩家验证 |
| UI层 | N/A | 自动触发，无按钮 |
| i18n层 | ✅ | zh-CN/en 均有 magic_addiction 条目 |
| 测试层 | ✅ | 2个测试：有魔力扣除验证状态、无魔力自毁验证棋盘清空 |

✅ 全部通过。

---

## 4. 凶残（ferocity）- 史米革/投石手

### 权威描述
凶残单位可以作为额外攻击单位，不计入每回合3次攻击限制。

### 原子步骤拆解
1. 被动效果：攻击验证时，凶残单位绕过 attackCount≥3 限制

### 八层链路矩阵

| 层级 | 状态 | 说明 |
|------|------|------|
| 定义层 | ✅ | trigger=passive, custom actionId=ferocity_extra_attack |
| 注册层 | N/A | 被动效果，在 validate.ts 中直接检查 |
| 执行层 | N/A | 被动效果，无执行器 |
| 状态层 | N/A | 被动效果，无状态变更 |
| 验证层 | ✅ | validate.ts DECLARE_ATTACK: hasFerocityAbility → 跳过 attackCount 检查 |
| UI层 | ✅ | canAttackEnhanced 在 helpers.ts 中考虑 ferocity |
| i18n层 | ✅ | zh-CN/en 均有 ferocity 条目 |
| 测试层 | ✅ | 3个测试：hasFerocityAbility 判定、attackCount=3 仍可攻击、非凶残被拒绝 |

✅ 全部通过。

---

## 5. 喂养巨食兽（feed_beast）- 巨食兽

### 权威描述
攻击阶段结束时，如果巨食兽本回合未击杀任何单位，必须选择：消灭一个相邻友方单位，或消灭自身。

### 原子步骤拆解
- 链A（吃友方）：攻击阶段结束 → 校验本回合击杀数=0 → 选择相邻友方 → UNIT_DESTROYED(reason=feed_beast, killerUnitId=巨食兽)
- 链B（自毁）：攻击阶段结束 → 校验本回合击杀数=0 → 选择自毁 → UNIT_DESTROYED(reason=feed_beast_self, killerUnitId=自身)
- 击杀追踪链：UNIT_DESTROYED(killerUnitId) → reduce.unitKillCountThisTurn[killerUnitId]++ → 下次 canActivateAbility/feed_beast customValidator 拒绝激活

### 八层链路矩阵

| 层级 | 状态 | 说明 |
|------|------|------|
| 定义层 | ✅ | trigger=onPhaseEnd, interactionChain 定义 choice+targetPosition 两步，customValidator 强制“本回合未击杀” |
| 注册层 | ✅ | executors/goblin.ts register('feed_beast') |
| 执行层 | ✅ | self_destroy→自毁事件; else→验证目标友方+相邻→消灭目标；两路径均携带 killerUnitId |
| 状态层 | ✅ | reduce UNIT_DESTROYED 正确处理，并按 killerUnitId 写入 unitKillCountThisTurn（回合切换清空） |
| 验证层 | ✅ | customValidator: 先拒绝“本回合已击杀”；其后自毁直接通过；吃友方检查目标存在+友方+非自身+相邻(距离=1) |
| UI层 | ✅ | activationStep=selectUnit, interactionChain 引导两步选择 |
| i18n层 | ✅ | zh-CN/en 均有 feed_beast 条目 |
| 测试层 | ✅ | 覆盖吃友方、自毁、本回合已击杀拒绝、非相邻/敌方目标拒绝、自动推进等回归场景 |

✅ 全部通过。

## 总结
洞穴地精5个冠军能力全部通过八层链路审计，无 bug。
