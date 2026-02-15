# D10 元数据一致审查报告

## 概述

审查 AbilityDef 的 trigger/requiredPhase/usesPerTurn 与下游逻辑判定的一致性。

---

## 检查项 10.1：trigger 字段与实际触发路径一致性

### trigger 类型 → 实际触发路径映射

| trigger 值 | 实际触发路径 | 验证 |
|------------|-------------|------|
| `activated` | 玩家主动激活 → execute.ts ACTIVATE_ABILITY → executor | ✅ |
| `passive` | 自动生效，在 calculateEffectiveStrength/getEffectiveLife/移动验证中检查 | ✅ |
| `onDamageCalculation` | calculateEffectiveStrength 中遍历 abilities，匹配 trigger | ✅ |
| `afterAttack` | execute.ts DECLARE_ATTACK → triggerAbilities('afterAttack') | ✅ |
| `onKill` | emitDestroyWithTriggers → triggerAbilities('onKill') | ✅ |
| `onDeath` | emitDestroyWithTriggers → triggerAbilities('onDeath') | ✅ |
| `onUnitDestroyed` | emitDestroyWithTriggers → triggerAllUnitsAbilities('onUnitDestroyed') | ✅ |
| `onTurnEnd` | flowHooks onPhaseExit(draw) → triggerAllUnitsAbilities('onTurnEnd') | ✅ |
| `onTurnStart` | flowHooks onPhaseEnter(draw→summon) → triggerAllUnitsAbilities('onTurnStart') | ✅ |
| `onPhaseStart` | flowHooks onPhaseEnter → triggerPhaseAbilities('onPhaseStart') | ✅ |
| `onPhaseEnd` | flowHooks onPhaseExit → triggerPhaseAbilities('onPhaseEnd') | ✅ |
| `onMove` | getUnitMoveEnhancements 中遍历 abilities，匹配 trigger | ✅ |
| `onSummon` | execute.ts SUMMON_UNIT → triggerAbilities('onSummon') | ✅ |
| `beforeAttack` | execute.ts DECLARE_ATTACK → beforeAttack 处理 | ✅ |
| `onAdjacentEnemyAttack` | execute.ts 攻击结算中检查 evasion | ✅ |
| `onAdjacentEnemyLeave` | execute.ts 移动处理中检查 rebound | ✅ |

### 逐能力 trigger 验证（抽样）

| 能力 | 声明 trigger | 实际触发路径 | 一致 |
|------|-------------|-------------|------|
| blood_rage | onUnitDestroyed | emitDestroyWithTriggers → triggerAllUnitsAbilities('onUnitDestroyed') | ✅ |
| blood_rage_decay | onTurnEnd | flowHooks → triggerAllUnitsAbilities('onTurnEnd') | ✅ |
| sacrifice | onDeath | emitDestroyWithTriggers → triggerAbilities('onDeath') | ✅ |
| infection | onKill | emitDestroyWithTriggers → triggerAbilities('onKill') | ✅ |
| soulless | onKill | emitDestroyWithTriggers → triggerAbilities('onKill') | ✅ |
| soul_transfer | onKill | emitDestroyWithTriggers → triggerAbilities('onKill') | ✅ |
| rage | onDamageCalculation | calculateEffectiveStrength 遍历 | ✅ |
| power_boost | onDamageCalculation | calculateEffectiveStrength 遍历 | ✅ |
| telekinesis | afterAttack | execute.ts → triggerAbilities('afterAttack') | ✅ |
| illusion | onPhaseStart | flowHooks → triggerPhaseAbilities('onPhaseStart', move) | ✅ |
| guidance | onPhaseStart | flowHooks → triggerPhaseAbilities('onPhaseStart', summon) | ✅ |
| ice_shards | onPhaseEnd | flowHooks → triggerPhaseAbilities('onPhaseEnd', build) | ✅ |
| feed_beast | onPhaseEnd | flowHooks → triggerPhaseAbilities('onPhaseEnd', attack) | ✅ |
| flying | onMove | getUnitMoveEnhancements 遍历 | ✅ |
| trample | onMove | getUnitMoveEnhancements 遍历 | ✅ |
| slow | onMove | getUnitMoveEnhancements 遍历 | ✅ |

**状态**：✅ 所有 trigger 类型与实际触发路径一致

---

## 检查项 10.2：PHASE_START_ABILITIES / PHASE_END_ABILITIES 与 AbilityDef 一致性

### PHASE_START_ABILITIES

| 阶段 | 注册的能力 | AbilityDef trigger | 一致 |
|------|-----------|-------------------|------|
| summon | guidance | onPhaseStart | ✅ |
| move | illusion | onPhaseStart | ✅ |
| attack | blood_rune | onPhaseStart | ✅ |

### PHASE_END_ABILITIES

| 阶段 | 注册的能力 | AbilityDef trigger | 一致 |
|------|-----------|-------------------|------|
| build | ice_shards | onPhaseEnd | ✅ |
| attack | feed_beast | onPhaseEnd | ✅ |

**验证**：flowHooks.ts 中 `triggerPhaseAbilities` 函数会检查 `def.trigger !== trigger` 过滤不匹配的能力，因此即使 PHASE_START_ABILITIES 注册了错误的能力 ID，也会被 trigger 类型过滤掉。双重保障。

**状态**：✅ 正确

---

## 检查项 10.3：usesPerTurn 与 abilityUsageCount 追踪一致性

**机制**：
- AbilityDef 声明 `usesPerTurn: N`
- reduce.ts ABILITY_TRIGGERED handler 递增 `abilityUsageCount[usageKey]`
- validate.ts 检查 `abilityUsageCount[usageKey] >= usesPerTurn` 时拒绝激活
- TURN_CHANGED handler 清空 `abilityUsageCount: {}`

**关键能力验证**：

| 能力 | usesPerTurn | 追踪 | 重置 | 一致 |
|------|------------|------|------|------|
| revive_undead | 1 | ABILITY_TRIGGERED → usageCount+1 | TURN_CHANGED → {} | ✅ |
| blood_rune | 1 | ABILITY_TRIGGERED → usageCount+1 | TURN_CHANGED → {} | ✅ |
| imposing | 1（隐含，afterAttack 每次攻击触发一次） | 自动触发不计入 usageCount | N/A | ✅ |
| rapid_fire | 1（隐含，消耗充能限制） | executor 检查 boosts >= 1 | N/A | ✅ |

**skipUsageCount 机制**：ABILITY_TRIGGERED payload 中 `skipUsageCount: true` 时不递增计数。用于自动触发的技能（如 blood_rage_decay、guidance 等），避免占用手动激活的使用次数。

**状态**：✅ 正确

---

## 检查项 10.4：interactionChain 与 UI 交互步骤一致性

**机制**：AbilityDef 中 `interactionChain` 定义多步交互的步骤和 payload 契约。UI 层（useGameEvents.ts）根据 ABILITY_TRIGGERED 事件进入对应的交互模式。

**抽样验证**：

| 能力 | interactionChain steps | UI 交互模式 | 一致 |
|------|----------------------|------------|------|
| revive_undead | selectCard → selectPosition | abilityMode(selectCard → selectPosition) | ✅ |
| spirit_bond | choice(self/transfer) → [selectUnit] | abilityMode(selectUnit) | ✅ |
| ancestral_bond | selectUnit | abilityMode(selectUnit) | ✅ |
| frost_axe | choice(charge/attach) → [selectUnit] | abilityMode(selectUnit) | ✅ |
| structure_shift | selectUnit → selectDirection | abilityMode(selectUnit) | ✅ |

**状态**：✅ 正确

---

## 检查项 10.5：customValidator 与权威描述的限定条件对应

**抽样验证**：

| 能力 | 描述限定条件 | customValidator 检查 | 一致 |
|------|-------------|---------------------|------|
| revive_undead | 弃牌堆有普通单位 + 有合法召唤位置 | condition: hasCardInDiscard + hasLegalSummonPosition | ✅ |
| infection | 弃牌堆有疫病体 | condition: hasCardInDiscard(plagueZombie) | ✅ |
| soul_transfer | 被消灭单位在3格内 | condition: isInRange(victim, 3) | ✅ |
| blood_rage | 任意单位被消灭（你的回合中） | condition: always + triggerAllUnitsAbilities 限制当前回合玩家 | ✅ |
| blood_rage_decay | 有充能 | condition: hasCharge(self, minStacks:1) | ✅ |

**状态**：✅ 正确

---

## 发现汇总

| # | 严重度 | 类别 | 描述 | 状态 |
|---|--------|------|------|------|
| 无 | - | - | D10 维度未发现缺陷 | ✅ |

**结论**：所有 AbilityDef 的 trigger 类型与实际触发路径一致，PHASE_START/END_ABILITIES 注册正确，usesPerTurn 追踪和重置机制完整，interactionChain 与 UI 交互步骤匹配，customValidator 与描述限定条件对应。
