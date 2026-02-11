## Context
桌游平台需要支持大量不同类型桌游。当前 `systems/` 层以"通用游戏系统"思路设计（GAS 模式），试图统一 Ability/Effect/Condition 等领域概念，但实际无游戏采用。各游戏在 domain/ 层独立实现了条件评估、表达式计算、卡牌操作等相似逻辑，造成代码重复。

约束：
- 不同桌游机制差异巨大（回合制/实时、卡牌/骰子/棋盘），领域概念无法统一
- 引擎层禁止 import 游戏层（单向依赖）
- 所有状态操作须为纯函数（boardgame.io 约束）

## Goals / Non-Goals
- Goals:
  - 提供可复用的**工具函数**，消除各游戏重复的底层操作代码
  - 提供**可扩展框架**（注册器模式），让游戏定义自己的效果/条件/目标处理器
  - 删除无人使用的 systems/ 死代码，降低认知负担
- Non-Goals:
  - 不尝试统一"伤害/治疗/召唤"等领域概念
  - 不改变 engine/pipeline.ts 和 EngineSystem 接口
  - 不改变各游戏的 game.ts / domain/ 架构

## Decisions

### 1. 复用工具函数，不复用领域概念
- **决策**: primitives/ 只提供"怎么算"（表达式求值、条件判断、区域移动），不定义"算什么"（伤害类型、技能效果）
- **理由**: 审计发现 3 个游戏的条件评估逻辑结构相同（and/or/compare + 变量解析），但绑定的领域变量完全不同。工具层复用结构，游戏层绑定语义
- **替代方案**: 继续 GAS 模式 → 已证明失败，零采用率

### 2. 注册器模式 (Registry Pattern)
- **决策**: condition/target/effects 模块均采用"引擎提供框架 + 游戏注册处理器"模式
- **理由**: SummonerWars 的 AbilityRegistry 已证明此模式可行。游戏在 setup 阶段注册自己的 condition checker / target resolver / effect handler
- **替代方案**: 纯工具函数（无注册） → 无法处理游戏特有的条件类型和效果类型

### 3. 纯函数 API，无 class/singleton
- **决策**: 所有 primitives 模块导出纯函数，不使用 class 或 singleton
- **理由**: boardgame.io 要求状态操作为纯函数；纯函数更易测试和组合
- **替代方案**: 保留 DiceSystem 单例模式 → 与 boardgame.io 纯函数理念冲突

### 4. expression 模块统一三套实现
- **决策**: 提取公共 ExpressionNode 类型和 evaluate 函数，支持 add/mul/var/min/max/literal
- **理由**: DiceThrone（damage calc）、SummonerWars（Expression.ts）、SmashUp（power calc）有 3 套结构相同的表达式求值器
- **来源**: SummonerWars `domain/Expression.ts`, DiceThrone `domain/damageCalculation.ts`

## Risks / Trade-offs
- **迁移风险** → 缓解：逐游戏迁移，每迁移一个跑完整测试
- **过度抽象** → 缓解：primitives 只提取已在 ≥2 个游戏中重复的模式，不预测未来需求
- **API 设计不当** → 缓解：先实现 expression + condition + zones 三个最确定的模块，验证后再做 target/effects

## Migration Plan
1. 新建 `engine/primitives/` 全部模块 + 单元测试
2. 逐游戏迁移：SummonerWars → DiceThrone → SmashUp（按复杂度降序）
3. 每个游戏迁移后跑 Vitest + E2E 验证
4. 全部迁移完成后删除 `systems/`
5. 更新 AGENTS.md / engine-systems.md 文档引用

## Open Questions
- zones.ts 的 shuffle 是否需要支持可注入的随机源（用于测试确定性）？当前各游戏直接用 Math.random
- resources.ts 边界钳制策略：统一 clamp(0, max) 还是允许游戏自定义边界函数？
