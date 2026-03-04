# 设计文档：大杀四方（SmashUp）全维度审计（D1-D33）— 第二阶段

## 概述

本设计文档描述第二阶段审计的技术方案：补全第一阶段缺失的运行时行为维度（D5/D8/D11-D19/D24/D31/D33）。

第一阶段已完成的内容（保留不变）：
- 静态属性测试（Property 1-3, 6, 9）
- 逐派系文本审计报告（`docs/audit/smashup/phase1-*.md`）
- 审计基础设施（`wikiSnapshots.ts`、`auditUtils.ts`）

### 核心设计决策

1. **GameTestRunner 行为测试为主**：运行时维度必须通过命令序列+状态断言验证，静态分析无法覆盖
2. **按维度组织而非按派系**：第一阶段按派系逐卡审计，第二阶段按 D 维度横切所有派系
3. **人工代码审查 + 自动化测试互补**：D1 子项（筛选范围）、D24（共返状态）以人工审查为主；D8（时序）、D11-D14（额度）、D19（组合）以 GameTestRunner 测试为主
4. **增量输出**：每个维度组完成后输出独立审计报告到 `docs/audit/smashup/`

## 架构

### 审计维度与工具映射

| 维度组 | 审计方法 | 工具 | 输出 |
|--------|---------|------|------|
| D1 子项（筛选范围） | 人工代码审查：逐个 filter/find 比对描述 | grep + 人工 | `docs/audit/smashup/phase2-filter-scope.md` |
| D5（交互语义） | 人工审查 createSimpleChoice 配置 + grep | grep + 人工 | `docs/audit/smashup/phase2-interaction-semantics.md` |
| D8（时序） | 人工审查 trigger 回调 + GameTestRunner 行为测试 | GameTestRunner | 测试文件 + `docs/audit/smashup/phase2-timing.md` |
| D8 子项（写入-消费窗口） | 阶段时间线分析 + GameTestRunner | GameTestRunner | `docs/audit/smashup/phase2-write-consume.md` |
| D11/D12/D13（额度对称） | reducer 分支分析 + GameTestRunner | GameTestRunner | 测试文件 + `docs/audit/smashup/phase2-quota.md` |
| D14（回合清理） | grep 临时字段 + 清理逻辑比对 + GameTestRunner | GameTestRunner | 测试文件 |
| D15（UI 同步） | Board.tsx 代码审查 | 人工 | `docs/audit/smashup/phase2-ui-sync.md` |
| D18/D19（否定+组合） | GameTestRunner 行为测试 | GameTestRunner | 测试文件 |
| D24（共返状态） | handler 代码审查 | grep + 人工 | `docs/audit/smashup/phase2-handler-coreturn.md` |
| D31（拦截路径） | 事件产生路径追踪 + GameTestRunner | GameTestRunner | 测试文件 + `docs/audit/smashup/phase2-protection-paths.md` |
| D33（跨派系一致） | 能力分组 + 实现路径比对 | grep + 人工 | `docs/audit/smashup/phase2-cross-faction.md` |
| D2 子项（打出约束） | 三层检查（数据→验证→UI） | grep + 人工 | `docs/audit/smashup/phase2-play-constraints.md` |

### SmashUp 阶段时间线（D8 审计基础）

```
回合开始
  ├── TURN_STARTED → 重置 minionsPlayed/actionsPlayed/baseLimitedMinionQuota 等
  ├── onTurnStart triggers 触发（基地能力授予额度等）
  │
  ├── playCards 阶段（消费窗口）
  │   ├── PLAY_MINION → reducer 消耗 minionLimit 或 baseLimitedMinionQuota
  │   ├── PLAY_ACTION → reducer 消耗 actionLimit
  │   ├── onMinionPlayed triggers 触发
  │   └── onCardPlayed triggers 触发
  │
  ├── scoring 阶段
  │   ├── beforeScoring triggers
  │   ├── 基地计分（VP 分配）
  │   └── afterScoring triggers
  │
  ├── draw 阶段（抽 2 张）
  │
  └── TURN_CHANGED → 清理回合临时状态
回合结束
```

### D8 审计重点：afterScoring ctx.playerId 语义

```
问题模式：
  fireTriggers('afterScoring', { playerId: currentTurnPlayer })
    → trigger 回调收到 ctx.playerId = currentTurnPlayer
    → 如果回调用 ctx.playerId 判断"谁拥有这张卡" → 非当前回合玩家的卡永远不触发

正确模式：
  trigger 回调内部遍历所有同名 ongoing 实例
    → 对每个实例用 instance.ownerId 独立判断
    → 不依赖 ctx.playerId
```

### D11/D12 审计重点：额度消耗分支

```
reducer PLAY_MINION 消耗逻辑（伪代码）：
  if (baseLimitedMinionQuota[targetBase] > 0) {
    // 优先消耗基地限定额度
    baseLimitedMinionQuota[targetBase]--
  } else if (minionsPlayed < minionLimit) {
    // 其次消耗全局额度
    minionsPlayed++
  }

审计要点：
  1. 条件优先级是否正确（基地限定优先于全局）
  2. 基地限定额度消耗后 minionsPlayed 是否不变
  3. 全局额度消耗后 baseLimitedMinionQuota 是否不变
  4. 约束条件（powerMax/sameNameOnly）是否在消耗分支中检查
```

### D31 审计重点：保护机制路径覆盖

```
事件产生路径清单（MINION_DESTROYED）：
  1. 直接命令执行（abilities/*.ts 中的 executor）
  2. 交互解决（abilityInteractionHandlers.ts 中的 handler）
  3. ongoing trigger 回调（ongoingEffects.ts 中的 trigger）
  4. 基地能力（baseAbilities*.ts）
  5. 计分后清场（scoring 流程）

每条路径都必须调用 filterProtectedMinionDestroyEvents
```

## 测试策略

### GameTestRunner 行为测试（核心）

| 测试文件 | 覆盖维度 | 测试内容 |
|----------|---------|---------|
| `audit-timing-triggers.test.ts` | D8 | afterScoring ctx.playerId 语义、onMinionPlayed post-reduce 计数器 |
| `audit-quota-symmetry.test.ts` | D11/D12/D13 | 额度写入-消耗对称、多来源消耗优先级 |
| `audit-turn-cleanup.test.ts` | D14 | 回合清理完整性 |
| `audit-negation-combination.test.ts` | D18/D19 | 否定路径、组合场景 |
| `audit-protection-paths.test.ts` | D31 | 保护机制在所有路径下生效 |

### 人工代码审查（补充）

| 审查项 | 覆盖维度 | 方法 |
|--------|---------|------|
| 筛选范围比对 | D1 子项 | grep filter/find + 描述比对 |
| createSimpleChoice 配置 | D5 | grep + multi/targetType 比对 |
| handler 共返模式 | D24 | grep events + queueInteraction |
| Board.tsx 数值计算 | D15 | 代码审查 |
| playConstraint 三层检查 | D2 子项 | grep + 三层追踪 |
| 跨派系实现路径 | D33 | 能力分组 + 事件类型比对 |

### 测试执行

```bash
# 运行所有第二阶段审计测试
npx vitest run src/games/smashup/__tests__/audit-timing-triggers.test.ts
npx vitest run src/games/smashup/__tests__/audit-quota-symmetry.test.ts
npx vitest run src/games/smashup/__tests__/audit-turn-cleanup.test.ts
npx vitest run src/games/smashup/__tests__/audit-negation-combination.test.ts
npx vitest run src/games/smashup/__tests__/audit-protection-paths.test.ts
```

## 正确性属性（第二阶段新增）

### Property 10: afterScoring trigger 不依赖 ctx.playerId

*对于任意* afterScoring/beforeScoring trigger，回调中判断卡牌 owner 时不得使用 `ctx.playerId`，必须遍历所有同名 ongoing 实例的 `ownerId`。

**Validates: Requirements 5.1**

### Property 11: onMinionPlayed 计数器使用 post-reduce 阈值

*对于任意* onMinionPlayed 回调中的"首次"判定，必须使用 `=== 1`（post-reduce）而非 `=== 0`（pre-reduce）。

**Validates: Requirements 5.2, 5.3**

### Property 12: 基地限定额度消耗隔离

*对于任意*打到有 `baseLimitedMinionQuota` 的基地的随从，消耗该额度后 `minionsPlayed` 不变；打到无限定额度的基地时 `baseLimitedMinionQuota` 不变。

**Validates: Requirements 7.3, 7.4, 10.1**

### Property 13: 回合清理完整

*对于任意*在回合中被写入的临时字段，在下一回合开始时该字段必须被重置为初始值。

**Validates: Requirements 8.1, 8.3**

### Property 14: 保护机制全路径生效

*对于任意*受 `registerProtection` 保护的随从，在所有事件产生路径下均不被消灭。

**Validates: Requirements 11.4**

### Property 15: 筛选范围与描述一致

*对于任意*能力执行器中的实体筛选操作，其筛选范围（位置/归属/类型/来源）必须与描述中的范围限定词一致。

**Validates: Requirements 3.1-3.5**
