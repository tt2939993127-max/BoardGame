## ADDED Requirements
### Requirement: 事件驱动战绩归档
系统 SHALL 在游戏结束事件触发时将战绩写入 `MatchRecord`。

#### Scenario: 对局结束入库
- **WHEN** `game.onEnd` 被触发且 `ctx.gameover` 存在
- **THEN** 以 `matchID`、`gameName`、`players`、`winnerID`、`endedAt` 写入一条战绩记录

### Requirement: 幂等去重
系统 SHALL 避免为同一 `matchID` 重复写入战绩。

#### Scenario: 重复结束事件
- **WHEN** 同一 `matchID` 的战绩已存在
- **THEN** 后续写入请求被忽略或跳过

### Requirement: 平局记录
系统 SHALL 正确记录平局结果。

#### Scenario: 平局结束
- **WHEN** `ctx.gameover` 标记为平局
- **THEN** `winnerID` 为空且所有玩家 `result` 为 `draw`

### Requirement: 禁止轮询归档
系统 SHALL 不再启动轮询任务归档战绩。

#### Scenario: 服务端运行时
- **WHEN** 服务端处于运行状态
- **THEN** 不存在周期性轮询归档任务
