# 审计 11.1 - 炽原精灵召唤师能力：祖灵羁绊（ancestral_bond）

## 权威描述（i18n）

> 在本单位移动之后，可以指定其3个区格以内的一个友方单位为目标。将目标充能并且将本单位的所有充能移动到目标上。

## 原子步骤拆解

**交互链 A：祖灵羁绊**
1. 触发条件：移动阶段激活（activated）
2. 选择3格内友方单位为目标
3. 将目标充能+1
4. 将自身所有充能转移到目标上（自身归零，目标 += 自身充能数）

## 八层链路矩阵

| 层级 | 状态 | 说明 |
|------|------|------|
| 定义层 | ✅ | `abilities-barbaric.ts` trigger=activated, effects=[custom:ancestral_bond_transfer], requiresTargetSelection=true, validation.requiredPhase=move, customValidator 检查3格+友方+非自身 |
| 注册层 | ✅ | `executors/barbaric.ts` register('ancestral_bond') |
| 执行层 | ✅ | 先 UNIT_CHARGED(target, +1)，再 UNIT_CHARGED(self, -selfCharges) + UNIT_CHARGED(target, +selfCharges)。自身无充能时只充能目标1点 |
| 状态层 | ✅ | UNIT_CHARGED 在 reduce.ts 中正确更新 boosts 字段 |
| 验证层 | ✅ | customValidator 检查：目标存在、友方、非自身、3格内。requiredPhase=move |
| UI层 | ✅ | ui.activationStep='selectUnit'，无需按钮（requiresButton=false），移动阶段自动提示 |
| i18n层 | ✅ | zh-CN: name="祖灵羁绊", description 完整 |
| 测试层 | ✅ | 4个测试：充能+转移、无充能只充1点、超3格拒绝、非移动阶段拒绝 |

## 结论

✅ 全部通过，无问题。
