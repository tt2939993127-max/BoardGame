# 伤害计算管线迁移指南

> **状态**: ✅ DiceThrone 迁移完成（2026-02-15）  
> **适用范围**: 本指南基于 DiceThrone 迁移经验编写  
> **历史遗留**: SummonerWars/SmashUp 保持现有实现，新游戏应直接使用新管线

## 概述

本指南帮助开发者将现有的手动伤害计算代码迁移到新的伤害计算管线。

**DiceThrone 迁移完成度**: 26/27 个伤害计算点（96%），1 个遗留（PyroBlast 奖励骰结算，优先级低）。

## 为什么要迁移？

### 问题
旧的手动实现存在以下问题：
1. **ActionLog 信息不完整**：无法显示完整的伤害计算链路（基础伤害 + 各种修正）
2. **代码重复**：每个技能都要手动构建 `modifiers` 数组
3. **容易出错**：手动计算容易遗漏修正或计算错误
4. **难以维护**：修正逻辑分散在各处

### 收益
新管线提供：
1. **自动收集修正**：Token/状态/护盾自动收集，无需手动代码
2. **完整的 breakdown**：ActionLog 显示完整计算链路
3. **类型安全**：TypeScript 类型检查，减少错误
4. **易于维护**：统一的 API，修改一处即可

## 迁移步骤

### 1. 识别迁移目标

查找所有创建 `DAMAGE_DEALT` 事件的代码：

```typescript
// 旧代码模式
events.push({
    type: 'DAMAGE_DEALT',
    payload: { 
        targetId, 
        amount, 
        actualDamage, 
        sourceAbilityId,
        modifiers // 可选
    },
    sourceCommandType: 'ABILITY_EFFECT',
    timestamp
} as DamageDealtEvent);
```

### 2. 导入新管线

```typescript
import { createDamageCalculation } from '../../../../engine/primitives/damageCalculation';
```

### 3. 替换伤害计算代码

#### 场景 A：基础伤害（无修正）

**旧代码：**
```typescript
const dmg = 5;
events.push({
    type: 'DAMAGE_DEALT',
    payload: { targetId, amount: dmg, actualDamage: dmg, sourceAbilityId },
    sourceCommandType: 'ABILITY_EFFECT',
    timestamp
} as DamageDealtEvent);
```

**新代码：**
```typescript
const damageCalc = createDamageCalculation({
    source: { playerId: attackerId, abilityId: sourceAbilityId },
    target: { playerId: targetId },
    baseDamage: 5,
    state: ctx.state,
    timestamp,
    autoCollectTokens: false,
    autoCollectStatus: false,
    autoCollectShields: false,
});
events.push(...damageCalc.toEvents());
```

#### 场景 B：自动收集 Token 修正

**旧代码：**
```typescript
const fm = getFireMasteryCount(ctx);
const dmg = 5 + fm;
const modifiers = fm > 0 ? [
    { type: 'token', value: fm, sourceId: TOKEN_IDS.FIRE_MASTERY, sourceName: 'tokens.fire_mastery.name' }
] : [];
events.push({
    type: 'DAMAGE_DEALT',
    payload: { targetId, amount: dmg, actualDamage: dmg, sourceAbilityId, modifiers },
    sourceCommandType: 'ABILITY_EFFECT',
    timestamp
} as DamageDealtEvent);
```

**新代码：**
```typescript
const fm = getFireMasteryCount(ctx);
const damageCalc = createDamageCalculation({
    source: { playerId: attackerId, abilityId: sourceAbilityId },
    target: { playerId: targetId },
    baseDamage: 5,
    state: ctx.state,
    timestamp,
    // 手动添加 FM 修正（因为可能在授予 Token 之后）
    additionalModifiers: fm > 0 ? [{
        id: 'ability-fm',
        type: 'flat',
        value: fm,
        priority: 10,
        source: TOKEN_IDS.FIRE_MASTERY,
        description: 'tokens.fire_mastery.name',
    }] : [],
    autoCollectTokens: false, // 手动处理
    autoCollectStatus: false,
    autoCollectShields: false,
});
events.push(...damageCalc.toEvents());
```

#### 场景 C：乘法修正

**旧代码：**
```typescript
const fm = getFireMasteryCount(ctx);
const fmBonus = fm * 2; // 2x FM
const dmg = 4 + fmBonus;
const modifiers = fmBonus > 0 ? [
    { type: 'token', value: fmBonus, sourceId: TOKEN_IDS.FIRE_MASTERY, sourceName: 'tokens.fire_mastery.name' }
] : [];
events.push({
    type: 'DAMAGE_DEALT',
    payload: { targetId, amount: dmg, actualDamage: dmg, sourceAbilityId, modifiers },
    sourceCommandType: 'ABILITY_EFFECT',
    timestamp
} as DamageDealtEvent);
```

**新代码：**
```typescript
const fm = getFireMasteryCount(ctx);
const damageCalc = createDamageCalculation({
    source: { playerId: attackerId, abilityId: sourceAbilityId },
    target: { playerId: targetId },
    baseDamage: 4,
    state: ctx.state,
    timestamp,
    additionalModifiers: fm > 0 ? [{
        id: 'ability-fm-multiplier',
        type: 'flat',
        value: fm * 2, // 乘法修正
        priority: 10,
        source: TOKEN_IDS.FIRE_MASTERY,
        description: 'tokens.fire_mastery.name',
    }] : [],
    autoCollectTokens: false,
    autoCollectStatus: false,
    autoCollectShields: false,
});
events.push(...damageCalc.toEvents());
```

#### 场景 D：先授予 Token 再造成伤害

**旧代码：**
```typescript
// 1. 授予 Token
const currentFM = getFireMasteryCount(ctx);
const updatedFM = Math.min(currentFM + 2, limit);
events.push({
    type: 'TOKEN_GRANTED',
    payload: { targetId: attackerId, tokenId: TOKEN_IDS.FIRE_MASTERY, amount: 2, newTotal: updatedFM, sourceAbilityId },
    sourceCommandType: 'ABILITY_EFFECT',
    timestamp
} as TokenGrantedEvent);

// 2. 造成伤害（基于授予后的 FM）
const dmg = 5 + updatedFM;
const modifiers = updatedFM > 0 ? [
    { type: 'token', value: updatedFM, sourceId: TOKEN_IDS.FIRE_MASTERY, sourceName: 'tokens.fire_mastery.name' }
] : [];
events.push({
    type: 'DAMAGE_DEALT',
    payload: { targetId, amount: dmg, actualDamage: dmg, sourceAbilityId, modifiers },
    sourceCommandType: 'ABILITY_EFFECT',
    timestamp: timestamp + 0.1
} as DamageDealtEvent);
```

**新代码：**
```typescript
// 1. 授予 Token
const currentFM = getFireMasteryCount(ctx);
const updatedFM = Math.min(currentFM + 2, limit);
events.push({
    type: 'TOKEN_GRANTED',
    payload: { targetId: attackerId, tokenId: TOKEN_IDS.FIRE_MASTERY, amount: 2, newTotal: updatedFM, sourceAbilityId },
    sourceCommandType: 'ABILITY_EFFECT',
    timestamp
} as TokenGrantedEvent);

// 2. 造成伤害（基于授予后的 FM）
// 注意：必须手动添加修正，因为 state 还未更新
const damageCalc = createDamageCalculation({
    source: { playerId: attackerId, abilityId: sourceAbilityId },
    target: { playerId: targetId },
    baseDamage: 5,
    state: ctx.state,
    timestamp: timestamp + 0.1,
    additionalModifiers: updatedFM > 0 ? [{
        id: 'ability-fm',
        type: 'flat',
        value: updatedFM, // 使用授予后的值
        priority: 10,
        source: TOKEN_IDS.FIRE_MASTERY,
        description: 'tokens.fire_mastery.name',
    }] : [],
    autoCollectTokens: false, // 禁用自动收集（会读取旧状态）
    autoCollectStatus: false,
    autoCollectShields: false,
});
events.push(...damageCalc.toEvents());
```

### 4. 验证迁移

#### 单元测试
确保现有测试通过：
```bash
npm test -- src/games/dicethrone/__tests__/pyromancer-behavior.test.ts --run
```

#### 集成测试
创建迁移验证测试：
```typescript
describe('技能迁移验证', () => {
    it('数值结果与旧实现一致', () => {
        const calc = createDamageCalculation({
            source: { playerId: '0', abilityId: 'test' },
            target: { playerId: '1' },
            baseDamage: 5,
            state: mockState,
            additionalModifiers: [{ id: 'fm', type: 'flat', value: 3, priority: 10, source: 'fire_mastery' }],
        });
        
        const result = calc.resolve();
        expect(result.finalDamage).toBe(8); // 5 + 3
        expect(result.breakdown.base.value).toBe(5);
        expect(result.breakdown.steps).toHaveLength(1);
    });
});
```

## 常见问题

### Q1: 什么时候使用 `autoCollectTokens`？

**A:** 只有当满足以下条件时才使用自动收集：
1. `state.core.tokenDefinitions` 已正确设置
2. Token 已经在 state 中（不是刚授予的）
3. Token 定义包含 `damageBonus` 字段

否则使用 `additionalModifiers` 手动添加。

### Q2: 如何处理护盾减免？

**A:** 新管线会自动处理护盾减免（如果启用 `autoCollectShields`）。如果需要手动控制：

```typescript
const damageCalc = createDamageCalculation({
    // ...
    autoCollectShields: false, // 禁用自动收集
    additionalModifiers: [{
        id: 'custom-shield',
        type: 'flat',
        value: -shieldAmount, // 负数表示减免
        priority: 100, // 高优先级（最后应用）
        source: 'shield',
    }],
});
```

### Q3: 如何处理条件修正？

**A:** 使用 `condition` 函数：

```typescript
additionalModifiers: [{
    id: 'burn-bonus',
    type: 'flat',
    value: 2,
    source: 'burn-bonus',
    condition: (ctx) => {
        const target = ctx.state.core.players[ctx.target.playerId];
        return (target.statusEffects.burn || 0) > 0;
    },
}]
```

### Q4: 迁移后 ActionLog 显示不正确？

**A:** 检查以下几点：
1. `breakdown` 字段是否正确生成
2. `sourceName` 是否为 i18n key
3. ActionLog 格式化代码是否支持新格式

### Q5: 测试失败怎么办？

**A:** 常见原因：
1. **数值不匹配**：检查是否使用了授予后的 Token 数量
2. **tokenDefinitions 为空**：测试环境需要正确设置
3. **时序问题**：确保 timestamp 递增

## 迁移检查清单

- [ ] 导入 `createDamageCalculation`
- [ ] 替换 `DAMAGE_DEALT` 事件创建代码
- [ ] 确定是否需要自动收集（Token/状态/护盾）
- [ ] 处理特殊情况（先授予 Token、乘法修正等）
- [ ] 运行现有测试验证数值一致性
- [ ] 创建集成测试验证 breakdown 结构
- [ ] 检查 ActionLog 显示是否正确
- [ ] 删除旧的手动 modifiers 构建代码
- [ ] 添加迁移标记注释（`【已迁移到新伤害计算管线】`）

## 参考资料

- 引擎实现：`src/engine/primitives/damageCalculation.ts`
- 单元测试：`src/engine/primitives/__tests__/damageCalculation.test.ts`
- 集成测试：`src/games/dicethrone/domain/__tests__/damage-pipeline-migration.test.ts`
- 迁移示例：`src/games/dicethrone/domain/customActions/pyromancer.ts`
- 设计文档：`.kiro/specs/damage-calculation-pipeline/design.md`

## 下一步

完成迁移后：
1. 更新 `AGENTS.md` 中的引擎系统文档
2. 在新游戏中默认使用新管线
3. 逐步迁移其他角色的技能
4. 考虑性能优化（缓存、批处理）

---

**最后更新**: 2026-02-15  
**适用版本**: Phase 2+
