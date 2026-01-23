# Tasks: 引入领域内核与系统层（激进引擎化）

1) 现状盘点（对齐真实基线）
- 确认服务端注册是否依赖生成清单（例如 `src/games/manifest.server.generated.ts` / `src/games/manifest.server` 的实际导出关系）。
- 盘点现有跨游戏能力：`src/core/UndoManager`、`src/systems/AbilitySystem`、教程系统、归档/战报（MatchRecord）。

2) 确定新引擎包边界（仅规划，不落代码）
- 确定新根目录（建议 `src/engine/`）：核心类型、适配层、系统接口。
- 约定 Command/Event 命名与必备元信息字段（gameId、playerId、turn、timestamp、schemaVersion）。

3) Spec：领域内核（Domain Core）能力
- 明确：每个游戏的 Domain Core 模块位置与必需导出。
- 明确：确定性与序列化要求。
- 明确：回放语义（Events 回放或 Commands+Events）。

4) Spec：系统层（Systems）能力
- 明确：系统生命周期 hooks（beforeCommand/afterEvents/playerView）。
- 明确：Prompt/Choice 协议作为系统能力（替换游戏自定义 pendingChoice）。
- 明确：撤销作为系统能力（自动快照 + 多人握手）。
- 明确：隐藏信息的 redaction 机制。

5) Spec：Boardgame.io 适配层能力
- 明确：适配层职责与不可变约束（moves 不写规则）。
- 明确：move -> command 的映射方式。
- 明确：`G.sys`/`G.core` 的存储与迁移策略。

6) Spec：迁移路线（按产出分阶段）
- 阶段 1：落地适配层骨架 + `G.sys` 形状。
- 阶段 2：先迁移 TicTacToe（验证撤销自动化）。
- 阶段 3：引入 PromptSystem，迁移 Dicethrone 的 choice。
- 阶段 4：归档/回放接入统一 log（保证审计与重放）。

7) 验证计划（规划层）
- 确定性验证：同一初始状态 + 同一 event 流回放，最终 state 一致。
- 撤销验证：无需游戏手动 saveSnapshot 的撤销流程可用。
- 隐藏信息验证：player view 对其他玩家秘密字段不可见。

8) OpenSpec 严格校验
- 运行 `openspec validate implement-domain-core-and-systems --strict --no-interactive` 并修复所有问题。
