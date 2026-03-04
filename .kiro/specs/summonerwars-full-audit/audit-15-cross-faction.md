# Task 15 - 交叉影响检查

## 15.1 共享技能 ID 和控制权转移

### 共享技能 ID 冲突检查

| 技能 ID | 定义位置 | 使用阵营 | 冲突 |
|---------|---------|---------|------|
| power_boost | abilities.ts | 堕落王国、洞穴地精 | ✅ 无冲突，全局唯一定义 |
| entangle | abilities-paladin.ts | 先锋军团 | ✅ 与 rebound 不同 ID |
| rebound | abilities-trickster.ts | 欺心巫族 | ✅ 与 entangle 不同 ID |
| intimidate | abilities-barbaric.ts + abilities-frost.ts | 炽原精灵、极地矮人 | ✅ 同一定义复用 |

### 控制权转移

- `CONTROL_TRANSFERRED` 事件正确更新 `unit.owner`
- `getUnitAbilities(unit, state)` 读取当前 owner 下的技能，控制权转移后技能查询不受影响
- `mind_control` 临时控制：`originalOwner` 保存在 unit 上，`TURN_CHANGED` 时通过解构 `{ originalOwner: origOwner, ... }` 归还
- `mind_capture` 永久控制：不保存 `originalOwner`，不归还

## 15.2 临时能力叠加和推拉免疫

### tempAbilities 生命周期

| 来源 | 写入时机 | 清除时机 | 验证 |
|------|---------|---------|------|
| 幻化（illusion） | ABILITIES_COPIED → `tempAbilities = copied` | TURN_CHANGED 解构清除 | ✅ |
| 力量颂歌（chant_of_power） | ABILITY_TRIGGERED → `grantedAbility` 写入 | TURN_CHANGED 解构清除 | ✅ |

### entanglementTargets 生命周期

- 写入：`ABILITY_TRIGGERED(chant_of_entanglement)` → reduce 中写入 `activeEvent.entanglementTargets`
- 读取：`getUnitAbilities()` 遍历所有玩家的 `activeEvents` 查找交缠颂歌
- 清除：execute.ts 后处理3 — 被消灭单位是交缠目标时，发射 `ACTIVE_EVENT_DISCARDED`

### stable 推拉免疫全量检查

| 推拉来源 | 文件 | stable 检查 | 状态 |
|---------|------|------------|------|
| telekinesis | executors/trickster.ts:100 | `getUnitAbilities(target, core).includes('stable')` | ✅ |
| high_telekinesis | executors/trickster.ts:100 | 同上（共享 executeTelekinesis） | ✅ |
| stun | execute/eventCards.ts:184 | `getUnitAbilities(stunUnit, core).includes('stable')` | ✅ |
| hypnotic_lure | execute/eventCards.ts:268 | `getUnitAbilities(lureUnit, core).includes('stable')` | ✅ |
| imposing | abilityResolver.ts:483 | `targetAbilityIds.includes('stable')` | ✅ |
| **ice_ram** | **executors/frost.ts** | **缺失 → 已修复** | 🔧 |
| sneak | execute/eventCards.ts | 仅移动友方0费单位 | N/A |
| glacial_shift | execute/eventCards.ts | 仅移动友方建筑 | N/A |
| structure_shift | executors/frost.ts | 仅移动友方建筑/活体结构 | N/A |

### 修复：ice_ram 缺少 stable 检查

**问题**：`ice_ram` executor 在推拉目标单位时未检查 `stable` 技能，导致有稳固的单位仍会被推拉。

**修复**：在 `executors/frost.ts` 的 ice_ram 推拉逻辑中添加 `!getUnitAbilities(targetUnit, core).includes('stable')` 检查。

### 叠加冲突检查

- tempAbilities（幻化复制）+ entanglement（交缠共享）可同时存在
- `getUnitAbilities` 先合并 base + temp，再合并交缠共享，使用 `includes` 去重
- 无叠加冲突风险
