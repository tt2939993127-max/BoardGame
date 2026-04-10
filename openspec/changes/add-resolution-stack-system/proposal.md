# Change: 引入通用连续结算栈，收敛跨阶段/跨交互长事务

## Why
现在不只是 SmashUp `scoreBases`，仓库里多种“连续结算”都在重复踩同一类坑：一条逻辑链需要跨 **事件批、交互、响应窗口、阶段推进、延迟补发** 多个节点连续完成，但当前引擎没有“这是一笔尚未结清的长事务”的统一模型。

现状通常依赖以下手段拼接：
- `flowHalted`
- `responseWindow.current`
- `sys.interaction.current / queue`
- 游戏专属 `pending*` / `continuationContext`
- 事件系统里的 afterEvents 兜底补发

这些状态分别成立，但**没有一个统一权威来描述“当前还在结算哪条链、卡在哪一步、何时恢复、何时只允许补发一次”**。结果就是：
- 连续交互后漏续链 / 重复续链
- 响应窗口关闭后误自动推进
- 延迟清场、替换、补算等 follow-up 在多个系统重复持有
- 某个游戏修好一条链，另一条链继续按旧模式出 bug

继续逐游戏打补丁，只会复制 SmashUp 之前的问题。

## What Changes
- 在引擎层新增通用 **resolution stack / resolution session** 能力，用来描述“连续结算长事务”。
- 支持把一条结算链显式拆成 resolution frame（步骤帧），由统一驱动器决定：
  - 继续同步推进
  - 暂停等待 interaction
  - 暂停等待 response window
  - 等待 reduce 后再恢复
  - 完成当前帧并恢复父帧/同级帧
- 明确 deferred follow-up（如补发事件、延迟动作、替换后落点动作）归 resolution frame 所有，而不是散落在 interaction data 或 afterEvents 兜底里。
- 让 FlowSystem / InteractionSystem / ResponseWindowSystem 都只认“当前是否有未完成 resolution frame”，不再各自猜测是否还能自动推进。
- 第一阶段先让 SmashUp scoring session 迁移到该通用抽象；其他游戏按需接入，不强制全量一次性迁移。

## Impact
- Affected specs:
  - `resolution-stack`（新增）
  - `interaction-system`
  - `flow-system`
- Affected code:
  - `src/engine/systems/InteractionSystem.ts`
  - `src/engine/systems/FlowSystem.ts`（或等价 flow 实现入口）
  - `src/engine/systems/ResponseWindowSystem.ts`（或等价 response window 实现入口）
  - `src/engine/types.ts`
  - `src/games/smashup/domain/scoringSession.ts`
  - `src/games/smashup/domain/index.ts`
  - 其他存在连续结算链的游戏系统（按接入范围逐步推进）
