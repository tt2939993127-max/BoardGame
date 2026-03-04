# 伤害计算管线 - 需求文档

## 1. 背景与问题

### 1.1 当前问题

**ActionLog 伤害来源信息缺失**：
- DiceThrone 和 SummonerWars 的 ActionLog 只显示最终伤害数字（如"造成 6 点伤害"）
- 无法追溯伤害来源：基础伤害、骰子加成、Token 修正、状态效果、护盾减免等
- 玩家无法理解"为什么是这个数字"，影响游戏透明度和学习曲线

**底层设计缺陷**：
1. **事件数据不完整**：`DAMAGE_DEALT` 事件只记录 `amount` 和 `actualDamage`，缺少计算链路
2. **修正信息分散**：Token 修正在 `tokenResponse.ts`，状态修正在 `reduceCombat.ts`，护盾在 `handleDamageDealt`，无统一入口
3. **基础伤害推算错误**：ActionLog 格式化时用 `dealt - modTotal` 反推基础伤害，在多重修正场景下失败
4. **无法复用**：每个游戏自行实现伤害计算，代码重复且不一致

### 1.2 影响范围

- **DiceThrone**：所有技能伤害（100+ custom actions）
- **SummonerWars**：单位攻击、技能伤害、事件卡伤害
- **未来游戏**：任何涉及伤害计算的游戏都会遇到同样问题

## 2. 目标

### 2.1 核心目标

1. **完整的伤害追溯**：ActionLog 能显示完整的伤害计算链路（基础 → 修正 → 最终）
2. **统一的计算管线**：引擎层提供通用伤害计算框架，游戏层只需声明修正规则
3. **可扩展性**：支持任意类型的伤害修正（加法、乘法、上限、下限、条件修正等）
4. **向后兼容**：不破坏现有游戏逻辑，渐进式迁移

### 2.2 非目标

- 不改变游戏规则或数值平衡
- 不强制所有游戏立即迁移（允许共存）
- 不处理非伤害类数值计算（治疗、资源变化等可后续扩展）

## 3. 用户故事

### 3.1 玩家视角

**US-1：查看伤害明细**
- **作为** 玩家
- **我想要** 在 ActionLog 中看到伤害的完整计算过程
- **以便** 理解为什么造成了这个伤害值，学习游戏机制

**验收标准**：
- AC-1.1：ActionLog 显示基础伤害来源（技能名称）
- AC-1.2：显示所有正向修正（骰子、Token、状态加成）
- AC-1.3：显示所有负向修正（护盾、减伤状态）
- AC-1.4：显示最终伤害值
- AC-1.5：每个修正项显示来源名称和数值（如"+3 火焰精通"）

**示例**：
```
对 玩家2 造成 8 点伤害
├─ 基础伤害：5（烈焰冲击）
├─ +3 火焰精通
└─ 最终伤害：8
```

### 3.2 开发者视角

**US-2：声明式伤害计算**
- **作为** 游戏开发者
- **我想要** 用声明式 API 定义伤害计算规则
- **以便** 减少重复代码，避免手动管理修正链路

**验收标准**：
- AC-2.1：提供 `createDamageCalculation()` API，接收基础伤害和修正规则
- AC-2.2：自动收集所有修正（Token、状态、护盾）
- AC-2.3：自动生成包含完整链路的 `DAMAGE_DEALT` 事件
- AC-2.4：支持条件修正（如"仅对燃烧目标 +2"）
- AC-2.5：支持修正优先级（加法 → 乘法 → 上限）

**示例代码**：
```typescript
const damageCalc = createDamageCalculation({
  source: { abilityId: 'flame-strike', playerId: '0' },
  target: { playerId: '1' },
  baseDamage: 5,
  modifiers: [
    { type: 'token', tokenId: 'fire_mastery', value: 3 },
    { type: 'status', statusId: 'burn', condition: 'target', multiplier: 1.5 },
  ],
});

const events = damageCalc.resolve(state);
// 自动生成 DAMAGE_DEALT 事件，包含完整 modifiers 数组
```

**US-3：渐进式迁移**
- **作为** 维护者
- **我想要** 逐步迁移现有游戏到新管线
- **以便** 降低风险，保持系统稳定

**验收标准**：
- AC-3.1：新管线与旧代码可共存（不强制迁移）
- AC-3.2：提供迁移指南和示例
- AC-3.3：迁移后的游戏通过所有现有测试
- AC-3.4：ActionLog 格式化自动识别新旧事件格式

## 4. 功能需求

### 4.1 引擎层：伤害计算管线

**FR-1：DamageCalculation 核心类**
- 位置：`src/engine/primitives/damageCalculation.ts`
- 职责：
  - 接收基础伤害和修正规则
  - 按优先级应用修正（加法 → 乘法 → 上限/下限）
  - 生成包含完整链路的 `DamageResult`
  - 支持条件修正（基于状态、Token、回合数等）

**FR-2：修正器类型系统**
```typescript
interface DamageModifier {
  type: 'base' | 'additive' | 'multiplicative' | 'shield' | 'status' | 'token';
  value: number;
  sourceId: string;        // 技能/Token/状态 ID
  sourceName?: string;     // i18n key 或显示名称
  condition?: ModifierCondition;  // 可选条件
  priority?: number;       // 执行优先级（默认按 type 排序）
}

interface ModifierCondition {
  type: 'target_has_status' | 'source_has_token' | 'turn_number' | 'custom';
  params?: Record<string, any>;
  check?: (state: any) => boolean;  // 自定义条件函数
}
```

**FR-3：伤害结果结构**
```typescript
interface DamageResult {
  baseDamage: number;
  modifiers: DamageModifier[];  // 按应用顺序排列
  finalDamage: number;
  actualDamage: number;         // 扣除护盾后实际扣血
  breakdown: {                  // 用于 ActionLog 展示
    base: { value: number; sourceId: string; sourceName?: string };
    steps: Array<{
      type: string;
      value: number;
      sourceId: string;
      sourceName?: string;
      runningTotal: number;
    }>;
  };
}
```

**FR-4：自动修正收集**
- 从 `state.players[targetId].damageShields` 收集护盾减免
- 从 `state.players[targetId].statusEffects` 收集状态修正
- 从 `state.players[sourceId].tokens` 收集 Token 加成
- 支持游戏层注册自定义修正源（如 DiceThrone 的 pendingDamage.modifiers）

### 4.2 游戏层：集成接口

**FR-5：Custom Action 集成**
```typescript
// 旧方式（手动构建事件）
events.push({
  type: 'DAMAGE_DEALT',
  payload: { targetId, amount: 8, actualDamage: 8, sourceAbilityId },
});

// 新方式（使用管线）
const damageCalc = createDamageCalculation({
  source: { abilityId: ctx.sourceAbilityId, playerId: ctx.playerId },
  target: { playerId: targetId },
  baseDamage: 5,
  state: ctx.state,
});
events.push(...damageCalc.toEvents());
```

**FR-6：ActionLog 自动格式化**
- `formatDiceThroneActionEntry` 读取 `payload.breakdown` 直接渲染
- 无需手动推算基础伤害
- 支持新旧事件格式（向后兼容）

### 4.3 测试需求

**FR-7：单元测试覆盖**
- 基础伤害计算（无修正）
- 加法修正（多个 Token 叠加）
- 乘法修正（状态效果）
- 护盾减免
- 条件修正（仅在特定状态下生效）
- 修正优先级（加法先于乘法）
- 上限/下限钳制

**FR-8：集成测试**
- DiceThrone：火焰精通 + 燃烧状态 + 护盾的完整链路
- SummonerWars：单位攻击 + 力量修正 + 伤害减免
- 迁移前后结果一致性（数值不变，只是记录更详细）

## 5. 非功能需求

### 5.1 性能

- **NFR-1**：伤害计算不增加超过 5% 的执行时间（相比手动构建事件）
- **NFR-2**：修正收集使用缓存，避免重复遍历状态树

### 5.2 可维护性

- **NFR-3**：新增修正类型只需扩展 `DamageModifier.type`，无需修改核心逻辑
- **NFR-4**：提供 TypeScript 类型推导，减少运行时错误

### 5.3 兼容性

- **NFR-5**：旧事件格式（无 `breakdown`）仍能正常显示（降级为简单数字）
- **NFR-6**：不破坏现有 reducer 逻辑（`handleDamageDealt` 仍正常工作）

## 6. 约束与假设

### 6.1 约束

- 必须符合现有引擎架构（Domain + Pipeline + Systems）
- 不得修改 `DAMAGE_DEALT` 事件的核心字段（`targetId`、`amount`、`actualDamage`）
- 必须通过所有现有测试（迁移后数值结果不变）

### 6.2 假设

- 所有伤害修正都可以表示为加法或乘法（暂不支持复杂公式）
- 修正优先级可以通过 `type` 隐式确定（特殊情况用 `priority` 显式指定）
- ActionLog 的 `breakdown` segment 已支持（需验证）

## 7. 成功指标

### 7.1 功能指标

- ✅ DiceThrone 所有技能的 ActionLog 显示完整伤害链路
- ✅ SummonerWars 攻击伤害显示力量修正和减伤
- ✅ 新增游戏使用新管线，代码量减少 30%

### 7.2 质量指标

- ✅ 单元测试覆盖率 > 90%
- ✅ 迁移后所有现有 E2E 测试通过
- ✅ 无性能回归（执行时间增加 < 5%）

### 7.3 开发者体验

- ✅ 迁移指南文档完整（含示例）
- ✅ 新增技能时无需手动管理 `modifiers` 数组
- ✅ ActionLog 格式化代码减少 50 行

## 8. 风险与缓解

### 8.1 风险

**R-1：迁移成本高**
- 影响：DiceThrone 有 100+ custom actions 需要迁移
- 缓解：提供自动化迁移脚本，批量替换模式代码

**R-2：性能回归**
- 影响：每次伤害计算都要遍历状态收集修正
- 缓解：使用缓存，只在状态变化时重新收集

**R-3：边缘情况遗漏**
- 影响：某些特殊修正逻辑无法用新管线表达
- 缓解：保留 `customModifier` 回调，允许游戏层注入自定义逻辑

### 8.2 回滚计划

- 新管线作为可选功能，不强制使用
- 迁移失败时可回退到旧代码
- 保留旧事件格式的 ActionLog 渲染逻辑

## 9. 里程碑

### Phase 1：引擎层实现（1 周）
- [ ] `damageCalculation.ts` 核心类
- [ ] 修正器类型系统
- [ ] 单元测试（覆盖率 > 90%）

### Phase 2：DiceThrone 试点迁移（1 周）
- [ ] 迁移 5 个代表性技能（基础、Token、状态、护盾）
- [ ] ActionLog 格式化适配
- [ ] 集成测试验证

### Phase 3：全量迁移（2 周）
- [ ] DiceThrone 所有 custom actions
- [ ] SummonerWars 攻击系统
- [ ] 迁移指南文档

### Phase 4：优化与推广（1 周）
- [ ] 性能优化（缓存、批处理）
- [ ] 新游戏模板更新
- [ ] 代码审查与重构

## 10. 参考资料

- 现有实现：`src/games/dicethrone/domain/tokenResponse.ts`（Token 修正）
- 现有实现：`src/games/dicethrone/domain/reduceCombat.ts`（护盾减免）
- 类似系统：`src/engine/primitives/modifier.ts`（通用修改器管线）
- ActionLog 格式：`src/games/dicethrone/game.ts` L217-L300

---

**文档版本**：v1.0  
**创建日期**：2025-02-15  
**负责人**：AI Agent  
**状态**：待审核
