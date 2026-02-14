# 审计 8.1 - 洞穴地精召唤师能力：神出鬼没（vanish）

## 权威描述
攻击阶段，思尼克斯可以与场上任意一个费用为0的友方单位交换位置。每回合限用1次。

## 原子步骤拆解
1. 触发条件：攻击阶段，主动激活
2. 选择目标：场上费用为0的友方单位（非自身）
3. 交换位置：思尼克斯与目标单位互换棋盘位置
4. 使用限制：每回合1次

## 八层链路矩阵

| 层级 | 状态 | 说明 |
|------|------|------|
| 定义层 | ✅ | `abilities-goblin.ts` vanish: trigger=activated, usesPerTurn=1, requiresTargetSelection=true |
| 注册层 | ✅ | `executors/goblin.ts` register('vanish') |
| 执行层 | ✅ | 验证 owner=playerId + cost=0 + 非自身，发射 UNITS_SWAPPED 事件 |
| 状态层 | ✅ | reduce.ts UNITS_SWAPPED 处理位置互换 |
| 验证层 | ✅ | customValidator 检查：目标存在、友方、0费、非自身、攻击阶段 |
| UI层 | ✅ | requiresButton=true, buttonPhase='attack', quickCheck 检查场上有0费友方 |
| i18n层 | ✅ | zh-CN/en 均有 vanish 的 name/description 条目 |
| 测试层 | ✅ | 3个测试：交换成功、非0费拒绝、敌方拒绝，均验证状态变更 |

## 结论
✅ 全部通过，无问题。
