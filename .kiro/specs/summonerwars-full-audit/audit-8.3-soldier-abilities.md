# 审计 8.3 - 洞穴地精士兵能力

## 1. 攀爬（climb）- 部落攀爬手

### 权威描述
攀爬手可以额外移动1格（总共3格），且可以穿过建筑物。

### 原子步骤拆解
1. 移动增强：基础2格 + 额外1格 = 3格
2. 穿越建筑：路径上的建筑不阻挡移动

### 八层链路矩阵

| 层级 | 状态 | 说明 |
|------|------|------|
| 定义层 | ✅ | trigger=onMove, effects=[extraMove +1, canPassThrough=structures] |
| 注册层 | ✅ | helpers.ts getUnitMoveEnhancements 读取 climb 配置 |
| 执行层 | ✅ | canMoveToEnhanced/getValidMoveTargetsEnhanced 使用增强后的移动距离和穿越规则 |
| 状态层 | ✅ | 标准 UNIT_MOVED 事件处理 |
| 验证层 | ✅ | validate.ts MOVE_UNIT 调用 canMoveToEnhanced |
| UI层 | ✅ | getValidMoveTargetsEnhanced 返回正确的可移动目标 |
| i18n层 | ✅ | zh-CN/en 均有 climb 条目 |
| 测试层 | ✅ | 3个测试：3格移动、穿过建筑、不能穿过单位 |

✅ 全部通过。

---

## 2. 冲锋（charge）- 野兽骑手

### 权威描述
野兽骑手以直线移动1-4格（替代正常移动）。如果移动3格或以上，获得+1战力直到回合结束。

### 原子步骤拆解
1. 移动方式：直线1-4格（替代正常2格移动）
2. 路径检查：直线路径不能被阻挡
3. 战力加成：移动≥3格 → UNIT_CHARGED(+1) → boosts+1
4. 战力计算：calculateEffectiveStrength 读取 boosts

### 八层链路矩阵

| 层级 | 状态 | 说明 |
|------|------|------|
| 定义层 | ✅ | trigger=onMove, custom actionId=charge_line_move, maxDistance=4 |
| 注册层 | ✅ | helpers.ts hasChargeAbility → getUnitMoveEnhancements 返回 charge 配置 |
| 执行层 | ✅ | execute MOVE_UNIT: 检测 charge + 距离≥3 → 发射 UNIT_CHARGED 事件 |
| 状态层 | ✅ | reduce UNIT_CHARGED: boosts += delta |
| 验证层 | ✅ | canMoveToEnhanced: charge 单位使用直线路径验证 |
| UI层 | ✅ | getValidMoveTargetsEnhanced 返回直线可达目标 |
| i18n层 | ✅ | zh-CN/en 均有 charge 条目 |
| 测试层 | ✅ | 6个测试：hasChargeAbility、1-4格移动、5格拒绝、路径阻挡、3格+1战力、2格无加成、calculateEffectiveStrength 验证 |

✅ 全部通过。

---

## 3. 禁足（immobile）- 部落抓附手

### 权威描述
抓附手不能移动。

### 原子步骤拆解
1. 被动效果：移动验证时拒绝所有移动

### 八层链路矩阵

| 层级 | 状态 | 说明 |
|------|------|------|
| 定义层 | ✅ | trigger=passive, custom actionId=immobile_check |
| 注册层 | N/A | 被动效果，在 helpers.ts/validate.ts 直接检查 |
| 执行层 | N/A | 被动效果，无执行器 |
| 状态层 | N/A | 被动效果，无状态变更 |
| 验证层 | ✅ | validate.ts MOVE_UNIT: isImmobile → 拒绝; helpers.ts getValidMoveTargetsEnhanced: immobile → 返回空 |
| UI层 | ✅ | getValidMoveTargetsEnhanced 返回空数组，UI 不显示移动目标 |
| i18n层 | ✅ | zh-CN/en 均有 immobile 条目 |
| 测试层 | ✅ | 4个测试：isImmobile 判定 true/false、getValidMoveTargetsEnhanced 返回空、移动命令被拒绝 |

✅ 全部通过。

---

## 4. 抓附（grab）- 部落抓附手

### 权威描述
当友方单位从抓附手相邻位置开始移动后，抓附手可以跟随移动到该单位原来的位置（或附近空格）。

### 原子步骤拆解
1. 触发条件：友方单位从抓附手相邻位置移动
2. 发射请求：GRAB_FOLLOW_REQUESTED 事件（含 grabberUnitId, movedUnitId）
3. 玩家选择：选择跟随目标位置（空格）
4. 执行跟随：ACTIVATE_ABILITY(grab) → UNIT_MOVED(reason=grab)

### 八层链路矩阵

| 层级 | 状态 | 说明 |
|------|------|------|
| 定义层 | ✅ | trigger=passive, requiresTargetSelection=true, targetSelection type=position |
| 注册层 | ✅ | executors/goblin.ts register('grab') |
| 执行层 | ✅ | MOVE_UNIT execute 检测相邻 grab 单位→发射 GRAB_FOLLOW_REQUESTED; grab executor 发射 UNIT_MOVED(reason=grab) |
| 状态层 | ✅ | reduce UNIT_MOVED 正确处理位置变更 |
| 验证层 | ✅ | customValidator: 目标位置必须存在且为空 |
| UI层 | ✅ | GRAB_FOLLOW_REQUESTED 触发 UI 交互提示选择位置 |
| i18n层 | ✅ | zh-CN/en 均有 grab 条目 |
| 测试层 | ✅ | 6个测试（两个文件合计）：触发 GRAB_FOLLOW_REQUESTED、非相邻不触发、跟随移动成功、被占据拒绝 |

✅ 全部通过。

## 总结
洞穴地精4个士兵能力全部通过八层链路审计，无 bug。
