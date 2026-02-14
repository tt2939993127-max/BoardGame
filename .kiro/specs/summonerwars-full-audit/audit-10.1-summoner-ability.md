# 审计 10.1 - 极地矮人召唤师能力：结构变换（structure_shift）

## 权威描述
在丝瓦拉移动之后，可以指定其3个区格以内一个友方建筑为目标。将目标推拉1个区格。

## 原子步骤拆解
1. 触发条件：移动阶段，主动激活
2. 选择目标：3格内友方建筑（含活体结构/寒冰魔像）
3. 选择方向：推拉1格到空格
4. 执行推拉：UNIT_PUSHED(isStructure=true)

## 八层链路矩阵

| 层级 | 状态 | 说明 |
|------|------|------|
| 定义层 | ✅ | trigger=activated, interactionChain 两步（selectBuilding+selectDirection） |
| 注册层 | ✅ | executors/frost.ts register('structure_shift') |
| 执行层 | ✅ | 验证友方建筑/活体结构 + 距离≤3 + 目标空格 + 距离=1，发射 UNIT_PUSHED |
| 状态层 | ✅ | reduce UNIT_PUSHED(isStructure=true) 正确处理建筑位置变更 |
| 验证层 | ✅ | customValidator: 目标存在+友方建筑/活体结构+距离≤3+移动阶段 |
| UI层 | ✅ | requiresButton=false, buttonPhase='move' |
| i18n层 | ✅ | zh-CN/en 均有 structure_shift 条目 |
| 测试层 | ✅ | 4个测试：推拉成功、超3格拒绝、非移动阶段拒绝、敌方建筑拒绝 |

✅ 全部通过。
