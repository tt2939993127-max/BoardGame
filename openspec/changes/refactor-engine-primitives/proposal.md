# Change: 删除旧 systems 层，新建 engine/primitives/ 工具函数库

## Why
当前旧 systems 层试图在引擎层预定义通用"游戏系统"（Ability、Effect、Condition、Combat 等），但经审计发现：
- 旧 core（Attribute/Tag/Effect/Ability/Condition）**零游戏使用**，属于完整死代码
- 旧 combat preset 仅 DiceThrone 部分使用
- SummonerWars 绕过 systems 层，在 domain/ 自建了一套平行的 AbilityDef/AbilityRegistry/AbilityCondition/Expression/TargetRef 体系
- 每个游戏独立实现条件评估、表达式计算、卡牌区域操作，存在大量重复代码

根本原因：systems/ 层试图复用**领域概念**（伤害、治疗、召唤），但不同桌游的触发时机、效果类型、执行上下文差异巨大，无法统一。

## What Changes
- **BREAKING** 删除旧 systems 目录（core/、presets/、CardSystem/、DiceSystem/、TokenSystem/、ResourceSystem/）
- **BREAKING** 新建 `src/engine/primitives/` 工具函数库，提供 7 个模块：
  - `expression.ts` — 表达式求值（add/mul/var/min/max）
  - `condition.ts` — 条件评估（and/or/compare）+ 可扩展自定义处理器注册
  - `target.ts` — 目标解析框架，游戏注册自定义解析器
  - `effects.ts` — 效果执行框架（不预定义效果类型，游戏注册自己的处理器）
  - `zones.ts` — 卡牌区域操作（draw/shuffle/move/peek/return）
  - `dice.ts` — 骰子操作（roll/lock/reroll，保留现有 DiceSystem 的核心能力）
  - `resources.ts` — 资源管理（get/set/modify + 边界钳制）
- 迁移 DiceThrone/SmashUp/SummonerWars 的 domain/ 层引用
- 更新 `AGENTS.md` 和 `docs/ai-rules/engine-systems.md` 中对 systems/ 的引用

核心原则：**复用工具函数，不复用领域概念**。提供框架让游戏注册自己的处理器，而非预定义效果类型。

## Impact
- Affected specs: `dice-system`（DiceSystem 类 → primitives/dice 纯函数）
- Affected code:
  - 删除: 旧 systems 全部文件（~2500 行）
  - 新增: `src/engine/primitives/`（~700 行）
  - 修改: 各游戏 domain/ 层的 import 路径和少量 API 调用
  - 修改: `AGENTS.md`、`docs/ai-rules/engine-systems.md`
- 预估收益: 未来每个复杂游戏减少 ~800 行重复代码，开发效率提升 ~30%
