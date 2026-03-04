# D8 时序正确审查报告

## 概述

审查阶段流转 FlowHooks 时序、攻击结算序列、回合结束清理顺序、不活动惩罚触发时机。

---

## 检查项 8.1：阶段流转和 FlowHooks 时序

**预期行为**：六阶段顺序 → 召唤→移动→建造→攻击→魔力→抽牌，FlowHooks 在每个阶段入口/出口正确触发

**实际行为**：

### 阶段顺序

helpers.ts PHASE_ORDER + getNextPhase：
```
summon(0) → move(1) → build(2) → attack(3) → magic(4) → draw(5) → summon(0)...
```
✅ 六阶段循环正确

### FlowHooks 调用链

flowHooks.ts `summonerWarsFlowHooks`：

| 钩子 | 触发时机 | 行为 |
|------|---------|------|
| canAdvance | 每次推进前 | 始终返回 `{ ok: true }`（游戏结束由引擎层处理）|
| getNextPhase | 推进时 | 返回 PHASE_ORDER 中的下一阶段 |
| onPhaseExit | 离开阶段时 | 攻击阶段：不活动惩罚；抽牌阶段：自动抽牌+onTurnEnd 触发 |
| onPhaseEnter | 进入阶段时 | draw→summon：TURN_CHANGED+事件卡弃置+onTurnStart；阶段开始技能 |

**状态**：✅ 正确

---

## 检查项 8.2：阶段开始/结束触发器

### 阶段开始触发器（PHASE_START_ABILITIES）

| 阶段 | 触发器 | 触发时机 | 验证 |
|------|--------|---------|------|
| summon | guidance（指引） | onPhaseEnter(summon) | ✅ triggerPhaseAbilities 在 onPhaseEnter 中调用 |
| move | illusion（幻化） | onPhaseEnter(move) | ✅ |
| attack | blood_rune（鲜血符文） | onPhaseEnter(attack) | ✅ |

### 阶段结束触发器（PHASE_END_ABILITIES）

| 阶段 | 触发器 | 触发时机 | 验证 |
|------|--------|---------|------|
| build | ice_shards（寒冰碎屑） | onPhaseExit(build) 末尾 | ✅ |
| attack | feed_beast（喟养巨食兽） | onPhaseExit(attack) 末尾 | ✅ |

**代码路径**：flowHooks.ts onPhaseExit → 先处理阶段特有逻辑（不活动惩罚/自动抽牌）→ 再调用 `triggerPhaseAbilities(onPhaseEnd)`

**注意**：onPhaseExit 中阶段结束技能在阶段特有逻辑之后触发。对于攻击阶段：不活动惩罚先于 feed_beast。这是正确的，因为不活动惩罚是阶段结束的固有逻辑，feed_beast 是技能触发。

**状态**：✅ 正确

---

## 检查项 8.3：攻击结算时序

**预期行为**：攻击声明 → 攻击前技能（life_drain/holy_arrow/healing）→ 骰子投掷 → 伤害计算（含被动加成）→ 减伤（evasion/divine_shield）→ 伤害应用 → afterAttack 触发器

**实际行为**（execute.ts DECLARE_ATTACK）：

```
1. beforeAttack 技能处理（life_drain/holy_arrow/healing）
   - 每个 beforeAttack 生成事件并 applyBeforeAttackEvents 更新 workingCore
   - life_drain: 消灭友方单位 → 战力×2
   - holy_arrow: 弃牌换魔力+充能 → 战力+N
   - healing: 弃牌 → 设置治疗模式

2. calculateEffectiveStrength（含 rage/power_boost/fortress_elite 等被动加成）
   + applyBeforeAttackStrength（beforeAttack 加成叠加）

3. rollDice（骰子投掷）

4. countHits（命中计算）
   - frost_axe 附加：⚔️面始终命中
   - evasion 减伤：特殊面时减伤
   - divine_shield 减伤：投2骰减伤（最少保留1命中）

5. UNIT_ATTACKED 事件（记录攻击行为）

6. UNIT_DAMAGED 事件（应用伤害）

7. afterAttack 触发器（triggerAbilities('afterAttack')）
   - telekinesis/high_telekinesis/mind_transmission
   - soul_transfer
   - rapid_fire_extra_attack
   - fortress_power
   - mind_capture

8. postProcessDeathChecks（死亡检测 + 连锁触发）
```

**状态**：✅ 时序正确

**证据**：execute.ts 中 DECLARE_ATTACK 按上述顺序线性执行，每步生成事件追加到 events 数组

---

## 检查项 8.4：多个 afterAttack 触发器的执行顺序

**预期行为**：多个 afterAttack 触发器同时存在时，执行顺序确定且不冲突

**实际行为**：`triggerAbilities('afterAttack', ctx)` 遍历攻击者的所有技能，按 abilities 数组顺序触发。由于每个单位的 abilities 数组是固定的（来自卡牌定义），顺序确定。

**潜在场景**：
- telekinesis + soul_transfer：念力推拉 + 灵魂转移。两者独立，不冲突。
- rapid_fire + fortress_power：连续射击 + 城塞之力。两者独立。

**状态**：✅ 顺序确定（按 abilities 数组顺序），无冲突

---

## 检查项 8.5：回合结束清理时序

**预期行为**：blood_rage 衰减 → magic_addiction → tempAbilities 清除 → abilityUsageCount 重置 → mind_control 归还 → ACTIVE 事件卡弃置

**实际行为**（追踪 flowHooks.ts）：

```
onPhaseExit(draw):
  1. 自动抽牌（CARD_DRAWN）
  2. triggerAllUnitsAbilities('onTurnEnd')
     → blood_rage 衰减（UNIT_CHARGED delta:-2）
     → magic_addiction 检查（MAGIC_CHANGED / UNIT_DESTROYED）

onPhaseEnter(from:draw, to:summon):
  3. TURN_CHANGED 事件
     → reduce.ts TURN_CHANGED handler:
       a. 清除 tempAbilities（幻化复制的技能）
       b. 清除 extraAttacks
       c. 归还 mind_control（originalOwner 恢复）
       d. 重置 hasMoved/hasAttacked/wasAttackedThisTurn
       e. 重置 moveCount/attackCount/hasAttackedEnemy
       f. 清空 abilityUsageCount
  4. 弃置当前玩家的主动事件卡（ACTIVE_EVENT_DISCARDED）
     - 殉葬火堆有充能时跳过
     - 圣洁审判有充能时消耗1充能代替弃置
  5. triggerAllUnitsAbilities('onTurnStart')
  6. triggerPhaseAbilities('onPhaseStart', summon)
```

**关键时序验证**：
- blood_rage 衰减（步骤2）在 TURN_CHANGED（步骤3）之前 → tempAbilities 尚未清除 → blood_rage 如果是通过 tempAbilities 获得的，衰减仍能正确执行 ✅
- mind_control 归还在 TURN_CHANGED 中执行 → 在 onTurnStart 之前 → 归还后的单位不会被新回合的 onTurnStart 技能影响 ✅
- abilityUsageCount 在 TURN_CHANGED 中清空 → 新回合技能使用次数正确重置 ✅

**状态**：✅ 清理时序正确

---

## 检查项 8.6：不活动惩罚触发时机和判定条件

**预期行为**：攻击阶段结束后，如果本回合未攻击敌方，召唤师受1伤

**实际行为**（flowHooks.ts onPhaseExit）：

```typescript
if (from === 'attack') {
  const player = core.players[playerId];
  if (!player.hasAttackedEnemy) {
    const summoner = getSummoner(core, playerId);
    if (summoner) {
      events.push({
        type: SW_EVENTS.UNIT_DAMAGED,
        payload: { position: summoner.position, damage: 1, reason: 'inaction' },
        timestamp,
      });
    }
  }
}
```

**判定条件**：`!player.hasAttackedEnemy`
- `hasAttackedEnemy` 在 UNIT_ATTACKED reducer 中设置：当攻击目标为敌方单位或建筑时设为 true
- 在 TURN_CHANGED 中重置为 false

**边界场景验证**：
- 禁足单位不移动 → 不影响 hasAttackedEnemy → 如果也没攻击则触发惩罚
- 只移动不攻击 → hasAttackedEnemy=false → 触发惩罚 ✅
- 攻击友方（治疗模式）→ hasAttackedEnemy 不变（治疗模式走独立路径，UNIT_ATTACKED 中目标为友方不设置 hasAttackedEnemy）→ 触发惩罚 ✅
- 召唤师不在棋盘上 → `getSummoner` 返回 undefined → 不触发 ✅

**状态**：✅ 正确

---

## 发现汇总

| # | 严重度 | 类别 | 描述 | 状态 |
|---|--------|------|------|------|
| 无 | - | - | D8 维度未发现缺陷 | ✅ |

**结论**：阶段流转时序正确，攻击结算序列完整，回合结束清理顺序合理（onTurnEnd 技能先于 TURN_CHANGED 状态重置），不活动惩罚判定条件正确。
