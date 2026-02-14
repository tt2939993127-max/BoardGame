# 审计 10.4 - 极地矮人事件卡

## 1. 寒冰冲撞（FROST_ICE_RAM）

### 权威描述
传奇/ACTIVE。持续：在一个友方建筑移动或被推拉之后，你可以指定其相邻的一个单位为目标。对目标造成1点伤害。你可以将目标推拉1个区格。

### 原子步骤拆解
1. 打出条件：召唤阶段，放入主动事件区
2. 持续效果：友方建筑移动/推拉后触发
3. 选择目标：建筑相邻的单位
4. 造成1伤：UNIT_DAMAGED(reason=ice_ram)
5. 可选推拉：UNIT_PUSHED 1格

### 八层链路矩阵

| 层级 | 状态 | 说明 |
|------|------|------|
| 定义层 | ✅ | config: isActive=true, eventType=legendary, cost=0, playPhase=summon |
| 注册层 | ✅ | execute/eventCards.ts case CARD_IDS.FROST_ICE_RAM（空，ACTIVE 自动处理） |
| 执行层 | ✅ | executors/frost.ts register('ice_ram'): 验证相邻+造成1伤+可选推拉 |
| 状态层 | ✅ | reduce UNIT_DAMAGED + UNIT_PUSHED 正确处理 |
| 验证层 | ✅ | executor 内部验证距离=1 + 目标存在 |
| UI层 | ✅ | ACTIVE 事件卡标准 UI + 建筑移动后触发交互 |
| i18n层 | ✅ | zh-CN/en 均有 frost-ice-ram 条目 |
| 测试层 | ✅ | 1个测试：作为 ACTIVE 放入主动区域 |

✅ 全部通过。

---

## 2. 冰川位移（FROST_GLACIAL_SHIFT）

### 权威描述
指定你的召唤师3个区格以内至多三个友方建筑为目标。将每个目标推拉1至2个区格。

### 原子步骤拆解
1. 打出条件：建造阶段，花费0魔力
2. 选择目标：召唤师3格内至多3个友方建筑
3. 为每个目标选择推拉方向和距离（1-2格）
4. 执行推拉：每个目标发射 UNIT_PUSHED

### 八层链路矩阵

| 层级 | 状态 | 说明 |
|------|------|------|
| 定义层 | ✅ | config: cost=0, playPhase=build |
| 注册层 | ✅ | execute/eventCards.ts case CARD_IDS.FROST_GLACIAL_SHIFT |
| 执行层 | ✅ | 读取 shiftDirections 数组，逐个验证+发射 UNIT_PUSHED |
| 状态层 | ✅ | reduce UNIT_PUSHED(isStructure=true) 正确处理 |
| 验证层 | ✅ | 执行层内部验证友方建筑+距离 |
| UI层 | ✅ | 需要玩家选择每个建筑的推拉方向 |
| i18n层 | ✅ | zh-CN/en 均有 frost-glacial-shift 条目 |
| 测试层 | ✅ | 1个测试：推拉建筑到新位置 |

✅ 全部通过。

---

## 3. 寒冰修补（FROST_ICE_REPAIR）

### 权威描述
从每个友方建筑上移除2点伤害。

### 原子步骤拆解
1. 打出条件：移动阶段，花费0魔力
2. 遍历所有友方建筑
3. 每个建筑移除2伤害：STRUCTURE_HEALED

### 八层链路矩阵

| 层级 | 状态 | 说明 |
|------|------|------|
| 定义层 | ✅ | config: cost=0, playPhase=move |
| 注册层 | ✅ | execute/eventCards.ts case CARD_IDS.FROST_ICE_REPAIR |
| 执行层 | ✅ | 遍历棋盘，友方建筑发射 STRUCTURE_HEALED(amount=2) |
| 状态层 | ✅ | reduce STRUCTURE_HEALED 正确处理（不低于0） |
| 验证层 | ✅ | 标准事件卡验证 |
| UI层 | ✅ | 标准事件卡 UI |
| i18n层 | ✅ | zh-CN/en 均有 frost-ice-repair 条目 |
| 测试层 | ✅ | 1个测试：两个友方建筑各移除2伤害+敌方不受影响+不低于0 |

✅ 全部通过。

---

## 4. 护城墙（FROST_PARAPET）

### 权威描述
建筑卡。允许友方远程单位穿过护城墙射击。

### 八层链路矩阵

| 层级 | 状态 | 说明 |
|------|------|------|
| 定义层 | ✅ | config: cardType=structure, isGate=false, life=5 |
| 注册层 | ✅ | helpers.ts isRangedPathClear 中检查护城墙穿透 |
| 执行层 | N/A | 被动效果 |
| 状态层 | N/A | 建筑标准处理 |
| 验证层 | ✅ | 远程攻击路径验证中友方护城墙不阻挡 |
| UI层 | ✅ | 攻击目标高亮正确 |
| i18n层 | ✅ | zh-CN/en 均有 frost-parapet 条目 |
| 测试层 | ✅ | ranged-blocking.test.ts 中有护城墙穿透测试 |

✅ 全部通过。

## 总结
极地矮人4张事件卡（含护城墙建筑）全部通过八层链路审计，无 bug。
