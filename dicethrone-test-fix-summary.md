# DiceThrone 测试修复总结

## 修复进度

- **初始状态**: 61 个测试失败
- **当前状态**: 21 个测试失败
- **修复数量**: 40 个测试
- **修复率**: 65.6%

## 已修复的问题

### 1. 月精灵护盾系统（核心修复）
**问题**: 月精灵的"迷影步"防御技能试图读取 `pendingAttack.damage`（未设置），导致 `NaN` 计算。

**解决方案**:
- 从 `PREVENT_DAMAGE` 事件改为 `DAMAGE_SHIELD_GRANTED` 事件
- 添加 `reductionPercent` 字段支持百分比护盾
- 使用 `Math.ceil()` 向上取整护盾减免

**修改文件**:
- `src/games/dicethrone/domain/events.ts`
- `src/games/dicethrone/domain/reduceCombat.ts`
- `src/games/dicethrone/domain/customActions/moon_elf.ts`
- `src/games/dicethrone/__tests__/moon_elf-behavior.test.ts`

**测试结果**:
- ✅ `moon_elf-behavior.test.ts`: 32/32 通过
- ✅ `moon-elf-shield-integration.test.ts`: 2/2 通过

### 2. 护盾消耗优先级
**问题**: 护盾按数组顺序消耗，但测试期望百分比护盾优先。

**解决方案**: 修改 `handleDamageDealt` 使百分比护盾优先于固定值护盾消耗。

**测试结果**:
- ✅ `shield-logging-integration.test.ts`: 2/2 通过

### 3. 护盾双重扣减
**问题**: `createDamageCalculation` 默认收集护盾，导致护盾被计算管线和 reducer 双重消耗。

**解决方案**: 将 `autoCollectShields` 默认值改为 `false`。

**修改文件**:
- `src/engine/primitives/damageCalculation.ts`

**测试结果**:
- ✅ `shield-double-counting-regression.test.ts`: 5/5 通过

## 剩余问题（21 个测试失败）

### 1. i18n 覆盖率测试（3-4 个）
- `audit-i18n-coverage.property.test.ts`
- `audit-effect-description.property.test.ts`

### 2. 暴击 Token 相关（5 个）
- `crit-token-custom-action-damage.test.ts`
  - `getPlayerAbilityBaseDamage` 估算问题
  - `getPendingAttackExpectedDamage` 函数不存在
  - 暴击交互选择问题

### 3. Pyromancer 伤害计算（4 个）
- `pyromancer-damage.property.test.ts`
  - 护盾减免问题
  - 修正类型累加问题

### 4. 其他护盾/伤害测试（~9 个）
- `targeted-defense-damage.test.ts`: 锁定 buff 在防御投掷时的伤害加成
- `monk-vs-shadow-thief-shield.test.ts`: 护盾交互
- `shadow-shank-sneak-attack-bug.test.ts`: 伤害计算
- `sneak-vs-pyro-blast.test.ts`: Token 交互
- `undo-after-card-give-hand.test.ts`: 撤回系统
- `card-cross-audit.test.ts`: bonusCp 参数

## 关键修复点

1. **护盾系统架构调整**: 从事件驱动改为状态驱动
2. **百分比护盾支持**: 新增 `reductionPercent` 字段
3. **护盾消耗优先级**: 百分比 > 固定值
4. **避免双重扣减**: 护盾统一由 reducer 消耗

## 下一步

剩余测试主要涉及：
1. i18n 覆盖率（可能需要补充翻译）
2. 暴击 Token 估算逻辑（需要实现缺失的函数）
3. Pyromancer 伤害计算（可能是护盾消耗顺序问题）
4. 其他边缘情况（需要逐个分析）
