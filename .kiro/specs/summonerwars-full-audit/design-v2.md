# 设计文档：召唤师战争语义深度审查（D6-D10 + 复杂语义拆解）

## 概述

本审查是对 v1 全链路审计的补充，聚焦 D6-D10 五个新维度和复杂语义拆解。v1 已完成 50+ 能力和 24 张事件卡的八层链路审查（D1-D5），本次不重复已覆盖内容，而是从副作用传播、资源守恒、时序正确、幂等与重入、元数据一致五个系统性维度进行深度审查，并对充能系统、攻击/移动验证、跨机制交叉等复杂场景进行语义拆解。

## 架构

### 审查维度与代码映射

```
D6 副作用传播
├── postProcessDeathChecks (execute.ts)
├── 消灭触发器链 (abilityResolver.ts → executors/)
├── 事件卡持续效果 (reduce.ts ACTIVE_EVENT 处理)
└── 控制权转移后的归属 (reduce.ts CONTROL_TRANSFERRED)

D7 资源守恒
├── 魔力: clampMagic (helpers.ts) + reduce.ts MAGIC_CHANGED
├── 充能: reduce.ts UNIT_CHARGED/CHARGE_TRANSFERRED
├── 伤害标记: reduce.ts UNIT_DAMAGED/UNIT_HEALED
├── 手牌/弃牌堆: reduce.ts CARD_DRAWN/CARD_DISCARDED/UNIT_SUMMONED
└── 棋盘: reduce.ts UNIT_PLACED/UNIT_DESTROYED

D8 时序正确
├── FlowHooks (game.ts flowHooks)
├── 阶段流转 (validate.ts phase checks)
├── 攻击结算序列 (execute.ts ATTACK_EXECUTED → afterAttack)
└── 回合结束清理 (flowHooks.onTurnEnd)

D9 幂等与重入
├── Undo 系统 (engine/transport/)
├── EventStream 消费 (useGameEvents.ts)
└── abilityUsageCount 回退

D10 元数据一致
├── AbilityDef 字段 (abilities*.ts)
├── abilityRegistry 注册 (abilities.ts)
├── executorRegistry 注册 (executors/)
└── UI 可用性判定 (abilityHelpers.ts)
```

### 复杂语义拆解方法论

#### 方法 A：差异矩阵

适用于同一机制在不同实体上的变体对比。召唤师战争中的典型场景：

| 场景 | 矩阵维度 |
|------|---------|
| 充能系统 | 能力 × {获取方式, 消耗方式, 上限, 衰减, 加成公式} |
| 移动增强 | 能力 × {extraMove, canPassThrough, 特殊条件} |
| 推拉效果 | 能力 × {范围, 方向, 格数, 排除条件, stable检查} |

#### 方法 B：条件链真值表

适用于多条件组合判定。召唤师战争中的典型场景：

| 场景 | 条件变量 |
|------|---------|
| 攻击验证 | isAdjacent × isRanged × isPathClear × hasWall × ferocity × attackCount |
| 移动验证 | baseMove × extraMove × flying × climb × charge × immobile × slow |
| 能力可用性 | requiredPhase × usesPerTurn × customValidator × hasLegalTargets |
| 伤害计算 | baseStrength × rage × power_boost × fortress_elite × charge × radiant_shot |

#### 方法 C：跨机制语义交叉

适用于独立机制在特定场景下的交互验证。召唤师战争中的典型场景：

| 机制 A | 机制 B | 交叉点 |
|--------|--------|--------|
| 充能 | 交缠颂歌 | 充能加成是否通过交缠共享传递 |
| 幻化 | 充能能力 | 复制的充能能力读谁的充能值 |
| 守卫 | 飞行/远程 | 远程攻击是否绕过守卫 |
| 践踏 | 献祭 | 践踏致死是否触发献祭 |
| 冲锋 | 缓慢 | 移动范围如何叠加 |
| 禁足 | 不活动惩罚 | 禁足是否算"不活动" |
| 活体结构 | 建筑能力 | 寒冰魔像在所有建筑逻辑中的识别 |

## 审查输出格式

### D6-D10 维度审查格式

每个维度输出一份审查报告，格式：

```
## D[N] [维度名称]

### 检查项 [N].1：[检查内容]

**预期行为**：[规则文档/设计意图]
**实际行为**：[代码追踪结果]
**代码路径**：[文件:行号 → 文件:行号 → ...]
**状态**：✅/⚠️/❌
**证据**：[测试用例/grep 结果/代码片段]
```

### 差异矩阵格式

```
## 充能系统差异矩阵

| 能力 | 获取方式 | 消耗方式 | 上限 | 衰减 | 加成公式 | 定义一致 | 执行一致 |
|------|---------|---------|------|------|---------|---------|---------|
| power_boost | 被动(伤害标记) | 无 | 无 | 无 | +charge战力 | ✅/❌ | ✅/❌ |
| blood_rage | 任意消灭 | 无 | 无 | -2/回合 | +charge战力 | ✅/❌ | ✅/❌ |
| ... | ... | ... | ... | ... | ... | ... | ... |
```

### 条件链真值表格式

```
## 攻击验证真值表

| # | isAdj | isRanged | pathClear | hasWall | ferocity | atkCount<3 | 预期 | 实际 | 状态 |
|---|-------|----------|-----------|---------|----------|------------|------|------|------|
| 1 | T | F | - | - | F | T | ✅允许 | ✅允许 | ✅ |
| 2 | F | T | T | F | F | T | ✅允许 | ✅允许 | ✅ |
| ... | ... | ... | ... | ... | ... | ... | ... | ... | ... |
```

### 跨机制语义交叉格式

```
## 交叉场景：[机制A] × [机制B]

**场景描述**：[具体游戏场景]
**规则预期**：[规则文档推导的正确行为]
**代码行为**：[代码追踪的实际行为]
**状态**：✅/⚠️/❌
**测试覆盖**：有/无 → [测试文件:行号]
```

## 数据模型

### 审查发现分类（沿用 v1）

```typescript
interface AuditFinding {
  severity: 'critical' | 'high' | 'medium' | 'low';
  category: 'logic_error' | 'missing_implementation' | 'resource_leak' |
            'timing_error' | 'idempotency_violation' | 'metadata_mismatch' |
            'cross_interaction_bug' | 'test_missing';
  dimension: 'D6' | 'D7' | 'D8' | 'D9' | 'D10' | 'matrix' | 'truth_table' | 'cross';
  location: string;
  description: string;
  fix: string;
}
```

## 测试策略

### 审查验证方式

1. **代码追踪**：逐函数追踪事件传播链、资源变化链、时序链
2. **现有测试运行**：运行 `npm test -- src/games/summonerwars/` 确认 861 个测试全部通过
3. **真值表测试补充**：为条件链真值表中的关键组合补充 GameTestRunner 测试
4. **交叉场景测试补充**：为跨机制语义交叉场景补充集成测试
5. **修复验证**：对修复的问题运行相关测试确认不引入回归

### 测试补充优先级

| 优先级 | 场景 | 理由 |
|--------|------|------|
| P0 | 连锁消灭递归安全 | 可能导致无限循环 |
| P0 | 资源越界（魔力<0 或 >15） | 破坏游戏状态 |
| P1 | 条件链真值表中未覆盖的组合 | 可能导致非法操作 |
| P1 | 跨机制交叉中的边界场景 | 可能导致意外行为 |
| P2 | v1 标记为"低风险"的场景 | 提升覆盖率 |
