# 充能系统差异矩阵审查报告

## 概述

对所有使用充能（boosts）机制的能力进行逐字段差异对比，验证定义层（AbilityDef）与执行层（calculateEffectiveStrength/getEffectiveLife/getUnitMoveEnhancements/executors）的一致性。

---

## 充能系统差异矩阵

### A. 充能获取方式

| 能力 | 阵营 | 获取方式 | 触发条件 | 定义层 | 执行层 | 一致 |
|------|------|---------|---------|--------|--------|------|
| blood_rage | 亡灵 | 被动(消灭) | 你的回合中任意单位被消灭 | onUnitDestroyed, addCharge +1 | triggerAllUnitsAbilities('onUnitDestroyed') → UNIT_CHARGED delta:+1 | ✅ |
| power_boost | 亡灵 | 被动(受伤) | 该单位受到伤害标记 | onDamageCalculation（读取 damage 值） | calculateEffectiveStrength 中 modifyStrength(charge) | ✅ |
| imposing | 冰霜 | 攻击后 | 攻击后自动充能 | afterAttack, addCharge +1 | triggerAbilities('afterAttack') → UNIT_CHARGED delta:+1 | ✅ |
| intimidate | 炽原 | 攻击后 | 攻击后自动充能 | afterAttack, addCharge +1, usesPerTurn:1 | triggerAbilities('afterAttack') → UNIT_CHARGED delta:+1 | ✅ |
| prepare | 炽原 | 主动激活 | 移动阶段消耗移动次数 | activated, costsMoveAction, addCharge +1 | executor → UNIT_CHARGED delta:+1 | ✅ |
| inspire | 炽原 | 移动后自动 | 移动后相邻友方充能 | activated（移动后触发） | execute.ts MOVE_UNIT → UNIT_CHARGED delta:+1 per adjacent ally | ✅ |
| gather_power | 炽原 | 召唤时 | 友方单位被召唤到相邻格 | onSummon, addCharge +1 | triggerAbilities('onSummon') → UNIT_CHARGED delta:+1 | ✅ |
| spirit_bond | 炽原 | 主动激活 | 移动后选择充能自身 | activated, custom | executor → UNIT_CHARGED delta:+1 | ✅ |
| ancestral_bond | 炽原 | 主动激活 | 移动后充能目标+转移自身 | activated, custom | executor → UNIT_CHARGED delta:+1(目标) + 转移 | ✅ |
| frost_axe | 冰霜 | 主动激活 | 移动后选择充能 | activated, custom | executor → UNIT_CHARGED delta:+1 | ✅ |
| holy_arrow | 圣骑 | 攻击前 | 弃牌换魔力+充能 | beforeAttack | execute.ts DECLARE_ATTACK → UNIT_CHARGED delta:+N | ✅ |

### B. 充能消耗方式

| 能力 | 消耗方式 | 消耗量 | 定义层 | 执行层 | 一致 |
|------|---------|--------|--------|--------|------|
| blood_rage | 回合结束衰减 | -2/回合 | onTurnEnd, addCharge -2 | flowHooks → UNIT_CHARGED delta:-2 | ✅ |
| power_boost | 无消耗（读取 damage 值） | 0 | 被动读取 | calculateEffectiveStrength 读取 unit.damage | ✅ |
| power_up | 无消耗（被动读取） | 0 | 被动读取 charge | calculateEffectiveStrength 读取 unit.boosts | ✅ |
| life_up | 无消耗（被动读取） | 0 | 被动读取 charge | getEffectiveLife 读取 unit.boosts | ✅ |
| speed_up | 无消耗（被动读取） | 0 | 被动读取 charge | getUnitMoveEnhancements 读取 unit.boosts | ✅ |
| rapid_fire | 消耗充能 | -1/次 | afterAttack, custom | executor → UNIT_CHARGED delta:-1 | ✅ |
| withdraw | 消耗充能或魔力 | -1 | afterAttack, custom | executor → UNIT_CHARGED delta:-1 或 MAGIC_CHANGED delta:-1 | ✅ |
| frost_axe | 消耗充能附加 | -1/次 | activated, custom | executor → UNIT_CHARGED delta:-1 + UNIT_ATTACHED | ✅ |
| spirit_bond | 消耗充能转移 | -1/次 | activated, custom | executor → UNIT_CHARGED delta:-1(源) + delta:+1(目标) | ✅ |
| ancestral_bond | 消耗全部充能转移 | -all | activated, custom | executor → UNIT_CHARGED delta:-selfCharges(源) + delta:+selfCharges(目标) | ✅ |

### C. 充能上限与加成公式

| 能力 | 上限 | 加成类型 | 加成公式 | 定义层 | 执行层 | 一致 |
|------|------|---------|---------|--------|--------|------|
| power_boost | 无上限 | 战力 | +charge（充能数，至多+5） | modifyStrength(charge) | calculateEffectiveStrength: `effect.maxBonus=5` | ✅ |
| power_up | 最多+5 | 战力 | +min(charge, 5) | modifyStrength(charge) | calculateEffectiveStrength: `effect.maxBonus=5` | ✅ |
| life_up | 最多+5 | 生命 | +min(charge, 5) | modifyLife(charge) | getEffectiveLife: `effect.maxBonus=5` | ✅ |
| speed_up | 最多+5 | 移动 | +min(charge, 5) | custom(speed_up_extra_move) | getUnitMoveEnhancements: `params.maxBonus=5` | ✅ |
| blood_rage | 无上限 | 战力 | +charge | modifyStrength(charge) | calculateEffectiveStrength 通过 modifyStrength 处理 | ✅（注：blood_rage 无 modifyStrength 效果，战力加成来自 power_boost） |
| charge（冲锋） | 无上限 | 战力 | +boosts（冲锋距离标记） | 被动 | calculateEffectiveStrength: `if charge && boosts > 0: strength += boosts` | ✅ |
| fortress_elite | N/A | 战力 | +友方城塞单位数（2格内） | 被动 | calculateEffectiveStrength: 遍历2格内友方城塞单位 | ✅ |
| radiant_shot | N/A | 战力 | +floor(魔力/2) | 被动 | calculateEffectiveStrength: `Math.floor(playerMagic / 2)` | ✅ |
| frost_bolt | N/A | 战力 | +相邻友方建筑数 | onDamageCalculation | calculateEffectiveStrength: 遍历相邻友方建筑 | ✅ |
| greater_frost_bolt | N/A | 战力 | +2格内友方建筑数 | onDamageCalculation | calculateEffectiveStrength: 遍历2格内友方建筑 | ✅ |

### ⚠️ power_boost 上限问题 → 经核对为误报

**原始发现**：power_boost 被 `Math.min(value, 5)` 截断，审查认为规则无此限制。

**核对结果**：i18n 文本明确写道"本单位每有1点充能，则获得战力+1，**至多为+5**"（en: "up to +5"）。+5 上限是规则要求，代码行为正确。

**但代码存在反模式**：原代码使用 `if (ability.id === 'power_boost' || ability.id === 'power_up')` 硬编码判断，违反 AGENTS.md "禁止技能系统硬编码" 规范。

**已修复**：重构为数据驱动 `maxBonus` 字段，power_boost 和 power_up 的 AbilityDef 中声明 `maxBonus: 5`。

**严重度**：~~medium~~ → 误报（逻辑正确，但触发了反硬编码重构）

### ⚠️ blood_rage 上限问题 → 经核对为误报

**原始发现**：blood_rage 通过通用 modifyStrength 路径被+5截断。

**核对结果**：blood_rage 的 AbilityDef 只有 `addCharge` 效果（充能获取），没有 `modifyStrength` 效果。战力加成来自同一单位上的 `power_boost` 能力（独立的 AbilityDef）。blood_rage 本身不参与战力计算。

**严重度**：~~low~~ → 误报（blood_rage 无 modifyStrength 效果）

---

## 发现汇总

| # | 严重度 | 类别 | 描述 | 处理结果 |
|---|--------|------|------|---------|
| CM-1 | ~~medium~~ 误报 | 规则核对错误 | power_boost 的+5上限是规则要求（i18n: "至多为+5"），代码行为正确 | 误报，但触发了反硬编码重构 |
| CM-2 | ~~low~~ 误报 | 审查错误 | blood_rage 无 modifyStrength 效果，战力加成来自同一单位的 power_boost 能力 | 误报 |

**实际修复**：
- 将 `calculateEffectiveStrength` / `getEffectiveLife` / `getEffectiveLifeBase` / `getUnitMoveEnhancements` 中的硬编码 `ability.id` 检查重构为数据驱动的 `effect.maxBonus` 字段
- `AbilityEffect` 类型新增 `maxBonus?: number`
- `power_up`、`life_up`、`power_boost` 声明 `maxBonus: 5`
- `speed_up` 通过 `params.maxBonus: 5` 传递

**结论**：充能系统整体设计正确，获取/消耗/转移守恒。原始审查的 CM-1/CM-2 经 i18n 文本核对为误报，但发现了硬编码反模式并完成重构。
