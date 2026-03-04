# 审计 11.4 - 炽原精灵事件卡

## 1. 力量颂歌（barbaric-chant-of-power）- 传奇

### 权威描述（i18n 推断 + 代码注释）
> 传奇。选择召唤师3格内的一个友方士兵或英雄，目标获得 power_up（力量强化）直到回合结束。

### 原子步骤拆解
**交互链 A：授予临时 power_up**
1. 选择目标（召唤师3格内友方非召唤师单位）
2. 发射 ABILITY_TRIGGERED 事件，payload 含 grantedAbility='power_up'
3. reduce.ts 将 power_up 写入目标的 tempAbilities
4. 回合结束时 tempAbilities 被清除

### 八层链路矩阵

| 层级 | 状态 | 说明 |
|------|------|------|
| 定义层 | ✅ | CARD_IDS.BARBARIC_CHANT_OF_POWER 在 ids.ts 定义 |
| 注册层 | ✅ | eventCards.ts case CARD_IDS.BARBARIC_CHANT_OF_POWER |
| 执行层 | ✅ | 检查目标友方+非召唤师 → ABILITY_TRIGGERED(grantedAbility='power_up', duration='end_of_turn') |
| 状态层 | ✅ | reduce.ts ABILITY_TRIGGERED: grantedAbility → 写入 tempAbilities；TURN_CHANGED: 清除 tempAbilities |
| 验证层 | ✅ | 执行层检查 owner===playerId + unitClass!=='summoner' |
| UI层 | ✅ | 事件卡选择目标 UI |
| i18n层 | ✅ | 事件卡名称和描述在 i18n 中定义 |
| 测试层 | ✅ | 1个测试：目标获得 power_up 技能触发事件 |

---

## 2. 生长颂歌（barbaric-chant-of-growth）

### 权威描述（i18n 推断 + 代码注释）
> 选择一个友方单位，将目标和每个相邻友方单位充能。

### 原子步骤拆解
**交互链 A：充能目标和相邻友方**
1. 选择目标友方单位
2. 目标充能+1
3. 遍历目标四方向相邻格
4. 对每个相邻友方单位充能+1

### 八层链路矩阵

| 层级 | 状态 | 说明 |
|------|------|------|
| 定义层 | ✅ | CARD_IDS.BARBARIC_CHANT_OF_GROWTH 在 ids.ts 定义 |
| 注册层 | ✅ | eventCards.ts case CARD_IDS.BARBARIC_CHANT_OF_GROWTH |
| 执行层 | ✅ | 检查目标友方 → UNIT_CHARGED(target,+1) + 遍历四方向相邻友方 → UNIT_CHARGED(adj,+1) |
| 状态层 | ✅ | UNIT_CHARGED 正确更新 boosts |
| 验证层 | ✅ | 执行层检查 owner===playerId |
| UI层 | ✅ | 事件卡选择目标 UI |
| i18n层 | ✅ | 事件卡名称和描述在 i18n 中定义 |
| 测试层 | ✅ | 1个测试：充能目标和相邻友方（含验证不充能敌方） |

---

## 3. 交缠颂歌（barbaric-chant-of-entanglement）- ACTIVE

### 权威描述（i18n 推断 + 代码注释）
> ACTIVE。选择两个友方士兵，它们共享技能。

### 原子步骤拆解
**交互链 A：标记两个目标共享技能**
1. 选择两个友方单位
2. 事件卡放入主动区域（isActive=true）
3. 发射 ABILITY_TRIGGERED(chant_of_entanglement) 事件
4. reduce.ts 将 entanglementTargets 写入主动事件卡
5. getUnitAbilities 查询时检查交缠颂歌，合并伙伴的 baseAbilities

### 八层链路矩阵

| 层级 | 状态 | 说明 |
|------|------|------|
| 定义层 | ✅ | CARD_IDS.BARBARIC_CHANT_OF_ENTANGLEMENT 在 ids.ts 定义 |
| 注册层 | ✅ | eventCards.ts case CARD_IDS.BARBARIC_CHANT_OF_ENTANGLEMENT |
| 执行层 | ✅ | 检查两个目标存在 → createAbilityTriggeredEvent('chant_of_entanglement', {targetUnitId1, targetUnitId2}) |
| 状态层 | ✅ | reduce.ts ABILITY_TRIGGERED: chant_of_entanglement → 写入 entanglementTargets 到 activeEvent |
| 验证层 | ✅ | 执行层检查两个目标存在 |
| UI层 | ✅ | 事件卡选择两个目标 UI |
| i18n层 | ✅ | 事件卡名称和描述在 i18n 中定义 |
| 测试层 | ✅ | 2个测试：放入主动区域+标记目标、技能共享验证 |

关键实现细节：
- getUnitAbilities 中遍历所有玩家的 activeEvents，找到 BARBARIC_CHANT_OF_ENTANGLEMENT
- 如果当前单位是 entanglementTargets 之一，获取伙伴的 getUnitBaseAbilities（含 tempAbilities）
- 共享是双向的（A 获得 B 的技能，B 也获得 A 的技能）

---

## 4. 编织颂歌（barbaric-chant-of-weaving）- ACTIVE

### 权威描述（i18n 推断 + 代码注释）
> ACTIVE。选择一个友方单位为目标。你可以在目标相邻的空格召唤单位。每次在目标相邻召唤时，将目标充能。

### 原子步骤拆解
**交互链 A：标记目标+扩展召唤位置**
1. 选择一个友方单位
2. 事件卡放入主动区域（isActive=true）
3. 发射 HYPNOTIC_LURE_MARKED 标记目标（复用 reduce 逻辑）
4. 发射 ABILITY_TRIGGERED(chant_of_weaving) 事件

**交互链 B：召唤时充能目标（被动效果）**
1. 玩家在目标相邻空格召唤单位
2. validate.ts 扩展合法召唤位置（包含目标相邻空格）
3. execute.ts 召唤后检查编织颂歌，如果召唤位置与目标相邻 → UNIT_CHARGED(target, +1)

### 八层链路矩阵

| 层级 | 状态 | 说明 |
|------|------|------|
| 定义层 | ✅ | CARD_IDS.BARBARIC_CHANT_OF_WEAVING 在 ids.ts 定义（使用字符串字面量 'barbaric-chant-of-weaving'） |
| 注册层 | ✅ | eventCards.ts case 'barbaric-chant-of-weaving' |
| 执行层 | ✅ | 链A: HYPNOTIC_LURE_MARKED + ABILITY_TRIGGERED；链B: execute.ts SUMMON_UNIT 后检查 cwEvent → UNIT_CHARGED(target,+1) |
| 状态层 | ✅ | HYPNOTIC_LURE_MARKED 写入 targetUnitId 到 activeEvent；UNIT_CHARGED 正确更新 boosts |
| 验证层 | ✅ | validate.ts SUMMON_UNIT: 检查编织颂歌 activeEvent → 扩展合法召唤位置到目标相邻空格 |
| UI层 | ✅ | 召唤位置高亮自动包含目标相邻空格 |
| i18n层 | ✅ | 事件卡名称和描述在 i18n 中定义 |
| 测试层 | ✅ | 3个测试：放入主动区域+标记目标、目标相邻可召唤、召唤时充能目标 |

低风险备注：
- eventCards.ts 中 case 使用字符串字面量 `'barbaric-chant-of-weaving'` 而非 `CARD_IDS.BARBARIC_CHANT_OF_WEAVING`。功能正确（值相同），但不符合"禁止字符串字面量"规范。其他三张事件卡均使用 CARD_IDS 常量。

---

## 结论

✅ 4张事件卡全部通过，无 bug。

低风险发现：
1. `useEventCardModes.ts` 中所有事件卡 case 均使用字符串字面量而非 `CARD_IDS` 常量（系统性风格问题，非编织颂歌独有）。执行层 `eventCards.ts` 和验证层 `validate.ts` 已正确使用常量。功能正确，属全局重构范围。
