# DiceThrone 护盾减伤日志修复总结

## 问题描述

用户反馈游戏日志中护盾减伤记录重复显示，且最终伤害数值错误。

### 用户案例（截图）
- 管理员1 打出"下次一定"卡牌（6点护盾）
- 管理员1 发动"神圣防御"技能（3点护盾）
- 游客6118 使用"破隐一击"造成 10 点伤害
- **实际日志显示**：
  - 破隐一击 10
  - 打不到我 -5（❌ 错误：这是百分比护盾，不应该单独显示）
  - 下次一定！ -6
  - 打不到我 -2（❌ 错误：重复显示）
  - 最终显示 10 点伤害（❌ 错误：应该是 0 点）

## 问题分析

### 第一阶段：护盾消耗信息丢失 ✅ 已修复

护盾消耗在 reducer 层直接修改状态，不生成事件。日志系统只能看到 `DAMAGE_DEALT` 事件，护盾消耗信息丢失。

**解决方案**：在 `DAMAGE_DEALT` 事件的 payload 中添加 `shieldsConsumed` 字段，reducer 层回填护盾消耗信息。

### 第二阶段：日志显示基础伤害而非最终伤害 ✅ 已修复

修复第一阶段后，日志仍然显示基础伤害（如 13 点）而非最终伤害（如 3 点）。

**根本原因**：`dealt` 的计算逻辑有误，当 `canUseResolvedTotalDamage` 为 true 时重复扣除护盾。

**解决方案**：修复 `dealt` 计算逻辑，避免重复扣除。

### 第三阶段：护盾重复显示 ❌ 本次修复

修复前两阶段后，护盾减伤记录重复显示（同一个护盾出现两次）。

**根本原因**：
1. `reduceCombat.ts` 中 `shieldsConsumed` 数组包含了**所有护盾**（固定值 + 百分比）
2. `game.ts` 中又单独处理了百分比护盾（通过 `shieldEvent` 查找并添加）
3. 导致百分比护盾被添加两次：一次来自 `shieldsConsumed` 数组，一次来自单独处理

**证据**：
- `reduceCombat.ts` 第 143-148 行：百分比护盾也被添加到 `shieldsConsumed` 数组
- `game.ts` 第 515-528 行（修复前）：单独处理百分比护盾，再次添加到 breakdown

## 解决方案

### 统一护盾处理逻辑

**修改文件**：`src/games/dicethrone/game.ts`

删除单独处理百分比护盾的代码，统一使用 `shieldsConsumed` 数组：

```typescript
// 如果有护盾消耗记录，在 breakdown tooltip 中追加护盾行
// 注意：shieldsConsumed 包含所有护盾（固定值 + 百分比），不需要单独处理
if (shieldsConsumed && shieldsConsumed.length > 0 && breakdownSeg.type === 'breakdown') {
    for (const shield of shieldsConsumed) {
        const shieldSource = shield.sourceId
            ? resolveAbilitySourceLabel(shield.sourceId, core, targetId)
            : null;
        breakdownSeg.lines.push({
            label: shieldSource?.label ?? 'actionLog.damageSource.shield',
            labelIsI18n: shieldSource?.isI18n ?? true,
            labelNs: shieldSource?.isI18n ? shieldSource.ns : DT_NS,
            value: -shield.absorbed,
            color: 'negative',
        });
    }
    // 更新显示数值为最终实际伤害
    breakdownSeg.displayText = String(dealt);
}
```

**关键改动**：
1. ❌ 删除：单独处理百分比护盾的代码块（通过 `shieldEvent` 查找）
2. ❌ 删除：单独处理固定值护盾的代码块
3. ✅ 保留：统一处理 `shieldsConsumed` 数组的代码块
4. ✅ 简化：只在有护盾消耗时更新一次 `displayText`

## 测试验证

所有护盾相关测试通过（29/29）：
- ✅ 护盾消耗记录测试（3/3）
- ✅ 护盾叠加消耗测试（8/8）
- ✅ 护盾清理测试（13/13）
- ✅ 护盾双重扣减回归测试（5/5）

## 影响范围

- ✅ 不影响游戏逻辑（护盾消耗逻辑保持不变）
- ✅ 不影响其他测试（所有护盾相关测试通过）
- ✅ 向后兼容（旧的 DAMAGE_DEALT 事件仍然有效）

## 教训

**测试不足**：之前的测试只验证了"护盾消耗信息是否记录"和"最终伤害数值是否正确"，但没有验证"breakdown 中护盾行的数量是否正确"。

**应该添加的断言**：
```typescript
// 验证 breakdown 中护盾行的数量
const shieldLines = entry.segments[1].lines.filter(line => 
    line.label.includes('shield') || line.label.includes('护盾')
);
expect(shieldLines).toHaveLength(2); // 两个护盾，不应该有重复
```

## 相关文档

- 护盾消耗 bug 修复：`docs/bugs/dicethrone-shield-fix-summary.md`
- 护盾消耗 bug 详细分析：`docs/bugs/dicethrone-shield-consumption-bug.md`
