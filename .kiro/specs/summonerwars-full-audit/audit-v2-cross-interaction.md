# 跨机制语义交叉审查报告

## 概述

验证多个独立机制在特定场景下的交叉行为正确性。

---

## 交叉场景 1：充能 × 交缠颂歌

**场景描述**：充能单位被交缠颂歌连接，power_up/life_up/speed_up 是否通过交缠共享传递给连接的单位

**规则预期**：交缠颂歌共享技能（abilities），power_up/life_up/speed_up 是技能，应该被共享。但共享的是技能定义，不是充能值。被共享的 power_up 读取的是接收方自身的 boosts 值。

**代码行为**：

1. `getUnitAbilities`（helpers.ts:589）通过交缠颂歌共享 partner 的 `getUnitBaseAbilities`（base + tempAbilities）
2. 共享后，接收方拥有 power_up 技能
3. `calculateEffectiveStrength` 遍历 abilities 时，对 power_up 执行 `evaluateExpression({ type: 'attribute', target: 'self', attr: 'charge' }, ctx)`
4. ctx.sourceUnit 是接收方自身 → 读取接收方的 `boosts` 值

**结论**：如果接收方没有充能（boosts=0），power_up 加成为 0。如果接收方有充能，则按接收方的充能值加成。这是正确的行为——共享的是技能能力，不是数值。

**状态**：✅ 正确
**测试覆盖**：有（abilities-barbaric.test.ts 中有交缠颂歌测试）

---

## 交叉场景 2：幻化 × 充能能力

**场景描述**：幻化（illusion）复制了 power_up/life_up/speed_up，复制的能力读谁的充能值

**规则预期**：幻化复制技能到自身的 tempAbilities，复制的技能应读取复制者自身的充能值

**代码行为**：

1. 幻化通过 ABILITIES_COPIED 事件将目标技能写入源单位的 `tempAbilities`
2. `getUnitAbilities` 返回 base + tempAbilities
3. `calculateEffectiveStrength` 中 power_up 的 `evaluateExpression` 读取 `ctx.sourceUnit.boosts`
4. ctx.sourceUnit 是幻化单位自身 → 读取幻化单位的 boosts 值

**结论**：幻化单位通常没有充能（boosts=0），所以复制的 power_up 加成为 0。如果幻化单位通过其他方式获得充能（如 inspire），则按自身充能值加成。这是正确的。

**状态**：✅ 正确
**测试覆盖**：有（abilities-trickster.test.ts 中有幻化测试）

---

## 交叉场景 3：力量颂歌 × 无充能单位

**场景描述**：力量颂歌（chant_of_power）授予 power_up 给无充能的单位

**规则预期**：power_up 在充能为0时不产生加成，不应报错

**代码行为**：

1. 力量颂歌通过 ABILITY_TRIGGERED(grantedAbility: 'power_up') 写入目标的 tempAbilities
2. `calculateEffectiveStrength` 中 power_up 读取 `unit.boosts ?? 0`
3. boosts 为 undefined 或 0 时，`Math.min(0, 5) = 0`，加成为 0

**结论**：不会报错，加成为 0。正确。

**状态**：✅ 正确
**测试覆盖**：有

---

## 交叉场景 4：守卫 × 飞行/远程

**场景描述**：飞行单位远程攻击是否绕过守卫

**规则预期**：守卫只限制"相邻"的敌方单位必须攻击守卫。远程攻击者如果不与守卫相邻，不受守卫限制。

**代码行为**（validate.ts:290-310）：

```typescript
// 守卫检查：如果攻击者相邻有敌方守卫单位，必须攻击守卫单位
const adjDirs = [{ row: -1, col: 0 }, { row: 1, col: 0 }, { row: 0, col: -1 }, { row: 0, col: 1 }];
for (const d of adjDirs) {
  const adjPos = { row: attackerPos.row + d.row, col: attackerPos.col + d.col };
  const adjUnit = getUnitAt(core, adjPos);
  if (adjUnit && adjUnit.owner !== playerId
    && getUnitAbilities(adjUnit, core).includes('guardian')
    && canAttackEnhanced(core, attackerPos, adjPos)) {
    return { valid: false, error: '相邻有守卫单位，必须攻击守卫单位' };
  }
}
```

**分析**：
- 守卫检查只遍历攻击者的相邻格（距离=1）
- 远程攻击者如果距离守卫>1格，不会被检测到 → 可以自由选择目标 ✅
- 远程攻击者如果与守卫相邻（距离=1），必须攻击守卫 → 正确 ✅
- 飞行单位如果与守卫相邻，也必须攻击守卫 → 正确 ✅

**额外检查**：`canAttackEnhanced(core, attackerPos, adjPos)` 确保攻击者能实际攻击守卫（如近战单位相邻守卫 → 可以攻击 → 必须攻击守卫）。

**状态**：✅ 正确
**测试覆盖**：有（abilities-paladin.test.ts 中有守卫测试）

---

## 交叉场景 5：践踏 × 献祭

**场景描述**：践踏穿过有献祭（sacrifice）的单位，践踏伤害导致该单位死亡，是否触发献祭

**规则预期**：践踏造成1伤害，如果该伤害导致单位死亡，应触发 onDeath 触发器（包括献祭）

**代码行为**：

1. 践踏在 execute.ts MOVE_UNIT 中处理：穿过敌方单位时生成 UNIT_DAMAGED(damage:1)
2. 所有命令执行后经过 `postProcessDeathChecks`
3. postProcessDeathChecks 检测到 UNIT_DAMAGED 导致死亡 → 注入 `emitDestroyWithTriggers`
4. emitDestroyWithTriggers 默认不触发 onKill/onDeath（`triggerOnKill: false, triggerOnDeath: false`）

**原始问题**：践踏伤害通过 postProcessDeathChecks 自动注入 UNIT_DESTROYED，但 postProcessDeathChecks 中调用 emitDestroyWithTriggers 时没有设置 `triggerOnDeath: true`，导致间接伤害致死不触发 onDeath 能力（如献祭）。

**规则核对**：献祭（sacrifice）描述为"当该单位被消灭时，对所有相邻敌方单位造成1伤害"。没有限制消灭原因。用户确认：onDeath 应在单位死亡时触发，不论死因。

**修复**：在 `postProcessDeathChecks`（execute/helpers.ts）中为自动死亡注入 `triggerOnDeath: true`：
```typescript
const destroyEvents = emitDestroyWithTriggers(workingState, unit, position, {
  playerId: sourcePlayerId ?? workingState.currentPlayer,
  killerPlayerId: sourcePlayerId,
  skipMagicReward,
  timestamp: event.timestamp,
  triggerOnDeath: true, // 间接伤害致死也应触发 onDeath 能力
});
```

**修复后行为**：
- 践踏致死 → 触发献祭 ✅
- 事件卡伤害致死 → 触发献祭 ✅
- 所有间接伤害致死 → 触发 onDeath ✅

**严重度**：medium → 已修复

**状态**：✅ 已修复（测试覆盖：abilities-frost.test.ts CI-1 用例）

---

## 交叉场景 6：冲锋 × 缓慢

**场景描述**：冲锋（charge）与缓慢（slow）同时存在时的移动范围

**规则预期**：冲锋是独立的移动方式（1-4格直线），缓慢影响正常移动（-1格）。两者应独立。

**代码行为**（canMoveToEnhanced）：

```
1. getUnitMoveEnhancements 计算 extraDistance（含 slow 的 -1）
2. 冲锋检查（独立路径）：isChargeUnit && isInStraightLine && distance 1-4 → 允许
3. 正常移动检查：maxDistance = 2 + extraDistance（含 slow 的 -1 = 1）
```

**结论**：冲锋单位有缓慢时：
- 冲锋路径：1-4格直线 → 不受缓慢影响 ✅
- 正常移动：maxDistance = 2 + (-1) = 1格 → 受缓慢影响 ✅

**状态**：✅ 正确
**测试覆盖**：无（建议补充）

---

## 交叉场景 7：禁足 × 不活动惩罚

**场景描述**：禁足（immobile）单位不移动是否触发不活动惩罚

**规则预期**：不活动惩罚的条件是"攻击阶段结束时没有用任何攻击指定任何敌方卡牌"。禁足只影响移动，不影响攻击。如果禁足单位能攻击但没攻击，仍应触发惩罚。

**代码行为**：不活动惩罚检查 `!player.hasAttackedEnemy`，不检查移动。禁足单位不能移动但可以攻击（如果有相邻敌方）。

**结论**：
- 禁足单位不移动 → 不影响 hasAttackedEnemy → 如果也没攻击敌方 → 触发惩罚 ✅
- 禁足单位攻击了敌方 → hasAttackedEnemy=true → 不触发惩罚 ✅
- 禁足不是"不活动"的豁免条件 → 正确 ✅

**状态**：✅ 正确

---

## 交叉场景 8：活体结构 × 建筑能力

**场景描述**：寒冰魔像（mobile_structure）在所有建筑相关逻辑中的识别完整性

**规则预期**：寒冰魔像是"活体结构"，在建筑相关能力中应被视为建筑

**代码行为**：

| 建筑相关逻辑 | 是否识别 mobile_structure | 代码路径 | 状态 |
|-------------|-------------------------|---------|------|
| frost_bolt（冰霜飞弹）| ✅ 检查 mobile_structure | calculateEffectiveStrength: `getUnitAbilities(adjCell.unit).includes('mobile_structure')` | ✅ |
| greater_frost_bolt（高阶冰霜飞弹）| ✅ 检查 mobile_structure | calculateEffectiveStrength: 同上 | ✅ |
| cold_snap（寒冰之握）| ✅ auraStructureLife 光环 | getEffectiveLife: `abilities.some(a => a.id === 'mobile_structure')` → 检查友方 auraStructureLife | ✅ |
| structure_shift（结构变换）| 需验证 | executor 中是否处理 mobile_structure | ⚠️ |
| living_gate（活体传送门）| ✅ 被动标记 | 召唤位置验证中检查 | ✅ |
| 召唤位置 | ✅ living_gate 提供召唤位置 | getValidSummonPositions 检查 living_gate | ✅ |

**structure_shift 验证**：structure_shift 推拉的是"建筑"（structure），寒冰魔像是"单位"（unit）。需要确认 structure_shift 是否也能推拉 mobile_structure 单位。

**状态**：⚠️ structure_shift 与 mobile_structure 的交互需要进一步验证

---

## 发现汇总

| # | 严重度 | 类别 | 描述 | 修复建议 |
|---|--------|------|------|---------|
| CI-1 | ~~medium~~ 已修复 | cross_interaction_bug | postProcessDeathChecks 中自动死亡检测不触发 onDeath（献祭），践踏/事件卡伤害致死不触发献祭 | ✅ 已修复：postProcessDeathChecks 中注入 triggerOnDeath:true |
| CI-2 | ~~low~~ 已补测试 | test_missing | 冲锋+缓慢交互场景无测试覆盖 | ✅ 已补充 2 个 GameTestRunner 测试 |
| CI-3 | ~~low~~ 已补测试 | test_missing | structure_shift 与 mobile_structure 的交互未验证 | ✅ 已验证并补充 2 个测试 |

**结论**：所有跨机制交互问题已修复/补充测试。CI-1 为实际 bug（间接伤害致死不触发 onDeath），已修复并覆盖测试。CI-2/CI-3 为测试缺失，已补充。

---

## D3 全面重审（写入→读取 ID 一致性）

### 审查方法

按 `testing-audit.md` 新增的 D3 规则，对所有"写入 ID → 后续读取匹配"的链路进行全量审查。

### 发现与修复

| # | 机制 | 问题 | 严重度 | 状态 |
|---|------|------|--------|------|
| D3-1 | 编织颂歌 (chant_of_weaving) | `eventCards.ts:565` 写入 `cwTarget.instanceId`，但 `validate.ts:132` 和 `execute.ts:123` 使用 `findUnitPosition()` 按 cardId 匹配 | high | ✅ 已修复：改用 `findUnitPositionByInstanceId()` |
| D3-2 | 编织颂歌测试 | `abilities-barbaric.test.ts:1309` 传 cardId 作为 targetUnitId | medium | ✅ 已修复：使用 `placeUnit` 返回值的 `.instanceId` |
| D3-3 | 亡灵法师执行测试 | `abilities-necromancer-execute.test.ts` 全部 10 处 sourceUnitId 使用 cardId 字符串字面量 | medium | ✅ 已修复：所有 `placeUnit` 调用捕获返回值并使用 `.instanceId` |
| D3-4 | 阶段触发测试 | `abilities-phase-triggered.test.ts` 7 处 sourceUnitId 使用 cardId | medium | ✅ 已修复：同上 |

### 确认无问题的机制

| 机制 | 写入 | 读取 | 状态 |
|------|------|------|------|
| 催眠引诱 (hypnotic_lure) | instanceId | instanceId | ✅ |
| 力量颂歌 (chant_of_power) | instanceId | instanceId | ✅ |
| 心灵操控 (mind_control) | targetPosition | position 匹配 | ✅ |
| 群情激愤 (goblin_frenzy) | targetPosition | position 匹配 | ✅ |
| 心灵捕获 (mind_capture) | instanceId | instanceId | ✅ |
| fire_sacrifice_summon | findBoardUnitByCardId | findBoardUnitByCardId | ✅ 一致 |
| life_drain | findBoardUnitByCardId | findBoardUnitByCardId | ✅ 一致 |

### 测试结果

全量测试通过：42 文件 / 868 用例 / 0 失败。ESLint 0 errors。
