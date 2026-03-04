> **状态：已完成**。旧框架（boardgame.io）已完全移除，自研传输层已全面接管。本文档保留为历史记录。

## ADDED Requirements

### Requirement: 引擎适配层
系统 SHALL 提供 引擎适配层，用于承载领域内核 + 系统层。

#### Scenario: 通过领域内核构建可运行的游戏引擎
- **GIVEN** 一个领域内核模块与一组启用的系统
- **WHEN** 平台通过适配层构建可运行的游戏引擎
- **THEN** 该游戏可通过自研传输层（GameTransportServer/Client）运行

### Requirement: moves 不包含规则主体
在使用适配层的游戏中，dispatch 调用 SHALL 仅用于发送 Command 到引擎管线，不得承载规则主体。

#### Scenario: move 委托给适配层
- **WHEN** 一个 move 被调用
- **THEN** move 将校验、产出事件与更新 `G.core`/`G.sys` 的工作委托给适配层

### Requirement: 统一状态存储
适配层 SHALL 使用统一的状态形状存储对局状态。

#### Scenario: 初始化状态形状
- **WHEN** 对局初始化
- **THEN** `G` 中包含 `G.sys` 与 `G.core`

### Requirement: 强制 player view（隐藏信息）
适配层 SHALL 强制执行玩家视图规则，以支持隐藏信息。

#### Scenario: 使用系统提供的 player view
- **GIVEN** 某系统提供 player view / redaction 规则
- **WHEN** 服务端向玩家返回对局状态
- **THEN** 返回内容按规则做 redaction，不泄露其他玩家秘密信息

### Requirement: 迁移期间的归档兼容
系统 SHALL 在迁移到新状态形状期间提供归档兼容策略。

#### Scenario: 加载旧归档对局
- **GIVEN** 一个迁移前存储的对局
- **WHEN** 该对局被加载
- **THEN** 系统将其升级到新形状，或以明确可执行的错误拒绝加载
