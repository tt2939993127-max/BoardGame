# 设计文档：DiceThrone 语义审查（D6-D10 + 语义拆解）

## 概述

本次审查聚焦两个方向：
1. D6-D10 五个新维度的系统性检查
2. 使用语义拆解方法论对所有英雄技能描述进行原子断言拆解，验证实现一致性

审查范围覆盖 6 个已实现英雄：Monk、Barbarian、Pyromancer、Moon Elf、Shadow Thief、Paladin。

## 架构分析

### 关键代码路径

| 审查维度 | 核心文件 | 审查焦点 |
|---------|---------|---------|
| D6 副作用传播 | `effects.ts`, `flowHooks.ts`, `reducer.ts`, `reduceCombat.ts` | 事件→消费者链路完整性 |
| D7 资源守恒 | `resourceSystem.ts`, `executeCards.ts`, `executeTokens.ts`, `flowHooks.ts` | CP/HP/Token 增减守恒 |
| D8 时序正确 | `attack.ts`, `flowHooks.ts`, `tokenResponse.ts` | 效果执行顺序、阶段流转 |
| D9 幂等与重入 | `reducer.ts`, `reduceCombat.ts` | Undo/重播安全性 |
| D10 元数据一致 | `customActions/*.ts`, `heroes/*/abilities.ts`, `tokenTypes.ts` | categories/tags/timing 声明 vs 实际行为 |
| 语义拆解 | `heroes/*/abilities.ts`, `customActions/*.ts`, `domain/combat/conditions.ts` | 描述→定义→执行全链路 |

### 审查方法

#### 语义拆解流程（每个技能/Token 必须执行）

1. 提取描述文本（i18n 或 AbilityDef.description）
2. 拆解为原子断言（五要素：主体/动作/目标/数值/条件）
3. 识别复杂语义模式（条件分支、组合效果、升级变体等）
4. 逐条对照 AbilityDef.effects → customAction handler → reducer
5. 输出审查矩阵

#### D6-D10 审查方法

- D6：追踪每种事件类型的所有消费者，验证无遗漏
- D7：构建资源流入/流出表，验证守恒
- D8：构建时序图，验证执行顺序
- D9：构建 Undo 场景，验证状态可逆
- D10：交叉比对声明元数据与运行时行为

### 审查分组策略

按英雄分组执行，每个英雄包含：
- 所有进攻/防御技能的语义拆解
- 英雄专属 Token 的语义拆解
- 英雄专属 customAction 的 D10 元数据审查
- 英雄相关的 D6/D7/D8 场景

通用机制（upkeep 状态效果、Token 响应窗口、卡牌系统）单独审查。

### 输出格式

每个审查任务输出：
1. 语义拆解矩阵（原子断言 × 实现层 × 通过/缺陷）
2. 升级变体差异矩阵（L1/L2/L3 字段对比，如适用）
3. 条件链真值表（多条件组合场景）
4. 发现的缺陷列表（含严重级别和修复建议）
5. 补充的测试用例

### 测试策略

- 使用 GameTestRunner 编写行为测试（首选）
- 每个发现的缺陷必须有对应测试
- 条件链真值表的关键组合必须有测试覆盖
- 跨机制交叉场景必须有集成测试

### 依赖与风险

- 依赖：i18n 文件中的描述文本作为语义拆解的输入源
- 风险：升级变体（L2/L3）可能尚未完全实现，需区分"未实现"和"实现错误"
- 风险：部分 customAction 的 categories 可能需要更新

## 决策记录

1. 按英雄分组而非按维度分组，减少上下文切换
2. 通用机制（upkeep/Token 响应/卡牌）单独一个任务，避免重复审查
3. 条件链真值表和跨机制交叉作为独立任务，因为它们跨越多个英雄
4. 修复和测试补充作为最后一个任务，集中处理所有发现的问题
