# Design: 领域内核 + 系统层（激进引擎化）

## 为什么要这样设计
我们要持续增加不同类型桌游，同时还要统一平台能力（撤销、教程、回放/审计、prompt/choice、隐藏信息等）。

现有代码已经出现了“跨游戏能力正在外溢但缺乏统一落点”的信号：

- 撤销：`src/core/UndoManager` 是共享的，但目前需要每个游戏手动调用（如 TicTacToe 在 move 里 `saveSnapshot(G)`）。
- 选择/提示：Dicethrone 的 `pendingChoice` 是游戏特有结构，未来会在更多游戏里重复出现。
- 归档：服务端为归档需要往状态里注入 `__matchID`，属于“系统字段混入领域状态”。

如果不尽快把这些能力收敛到引擎层，游戏数量一多就会出现：同一能力 N 套实现、语义不一致、回放/调试困难、隐藏信息容易泄露。

## 总体架构

### 第 1 层：游戏插件装配
继续使用当前 manifest/registry 的方式做装配：

- `scripts/generate_game_manifests.js` 作为“游戏权威清单”来源。
- 每个游戏目录仍然拥有资源、i18n、UI，以及新增的“领域内核模块”。

### 第 2 层：会话/网络驱动器
保留 Boardgame.io 作为会话驱动器：

- 网络同步、match 存储、turn/stage 脚手架、随机数工具等。

但将其“降级为适配层”：

- Boardgame.io 的 moves 不再承载规则本体，只负责输入翻译与调用引擎管线。

### 第 3 层：领域内核（Domain Core）
每个游戏提供运行时无关的规则模块（纯 TS）。

核心概念：

- Command：玩家意图（纯数据）
- Event：权威后果（纯数据）
- Reducer：确定性地应用 event(s) 生成新状态
- Validator：校验命令合法性

选择这种模型而不是 DSL 的原因：

- 桌游类型差异非常大，DSL 早期会卡在表达力与调试体验。
- UI/交互差异也很大，强行统一表达会导致长期“抽象债”。

### 第 4 层：系统层（Systems）
系统层以插件方式承载跨游戏能力，并通过 hook 参与 command/event 管线。

系统必须满足：

- 确定性（无隐藏副作用）
- 面向纯数据（可序列化、可回放）
- 可按游戏启用/关闭

与现有代码最贴近的系统候选：

- UndoSystem（演进 `src/core/UndoManager`）
- PromptSystem（替换各游戏自造 `pendingChoice`）
- LogSystem（统一事件日志，支撑回放/审计/调试）
- Ability/Effect System（演进 `src/systems/AbilitySystem`，为骰子/卡牌类复用）

## 统一状态形状：`G.sys` + `G.core`
标准化所有游戏的 Boardgame.io `G`：

- `G.sys`：系统/平台状态
- `G.core`：游戏领域状态

`G.sys` 最小字段建议包含：

- `schemaVersion`
- `matchId`
- `log`（events 或 commands+events）
- `undo`（历史 + 撤销请求状态）
- `prompt`（当前 prompt / 队列）

目的：

- 让撤销、prompt、日志、隐藏信息等系统可以不依赖游戏私有字段。
- 消除像 `__matchID` 这种“系统字段混入领域状态”的现象。

## 适配层（Boardgame.io Adapter）
提供一个工具，将 Domain Core + Systems 组装成 Boardgame.io `Game`。

适配层职责：

- 将 move payload 翻译成 Command
- 执行管线：
  - Systems.beforeCommand
  - Core.validate
  - Core.produceEvents
  - Reduce events -> 更新 `G.core`
  - Systems.afterEvents -> 更新 `G.sys`
- 强制执行隐藏信息视图（player view/redaction）

适配层是“纪律执行点”：

- 规则不得写在 moves
- 隐藏信息必须由统一机制过滤

## 确定性与回放
确定性是一级需求：

- Commands / Events 必须可序列化。
- RNG 必须可控：
  - 可继续使用 Boardgame.io random，但要把随机结果记录为显式 Events；
  - 或者在 `G.sys` 保存 seed 并使用确定性 RNG。

回放通过重放 Events（或 Commands + 导出的 Events）实现。

## 迁移计划（设计视角）

1) 引入 `G.sys` + 适配层骨架（建议新建 `src/engine/` 包）。
2) 先迁移 TicTacToe：规模小、已有 UndoManager，能快速验证“撤销自动化”。
3) 引入 PromptSystem，迁移 Dicethrone 的 `pendingChoice` 结构。
4) 将 Dicethrone 的效果结算抽成 EffectSystem（可选），为未来卡牌/骰子游戏复用铺路。
5) 归档/回放：将统一 log 接入归档模型，提供重放与审计能力。

## 取舍
- 优点：
  - 平台能力集中复用；新增游戏更快
  - undo/prompt/log/hidden-info 行为一致
  - 回放/调试/审计能力跨游戏统一

- 代价：
  - 需要严格约束（moves 只做适配）
  - 增加内部引擎 API 维护成本
  - 现有游戏迁移需要阶段性投入

考虑到计划支持多类型桌游且平台能力不断增长，这个取舍是值得的。
