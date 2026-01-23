## ADDED Requirements

### Requirement: 系统层（Systems）
系统 SHALL 提供“系统层”，用于以可插拔方式承载跨游戏平台能力，并允许按游戏启用。

#### Scenario: 为游戏启用系统
- **GIVEN** 某游戏声明启用的系统列表
- **WHEN** 该游戏通过适配层运行
- **THEN** 启用的系统参与 command/event 执行管线

### Requirement: 系统生命周期 hooks
每个系统 SHALL 能够通过约定 hooks 观察并影响执行过程。

#### Scenario: 执行 hooks
- **WHEN** 系统处理一个 Command
- **THEN** 适配层按顺序调用 `beforeCommand`，执行核心逻辑后调用 `afterEvents`

### Requirement: Prompt/Choice 作为一等系统能力
系统 SHALL 提供统一 Prompt/Choice 协议来表达“需要玩家决策”的状态。

#### Scenario: 创建 Prompt
- **WHEN** 领域规则需要玩家决策（例如在 N 个选项中选 1 个）
- **THEN** 系统生成一个 Prompt，并能被共享 UI 渲染器渲染

#### Scenario: 解决 Prompt
- **GIVEN** 存在一个归属某玩家的 active prompt
- **WHEN** 该玩家提交“解决 prompt”的 Command
- **THEN** prompt 被确定性地解决，并继续推进规则执行

### Requirement: 撤销（Undo）作为系统能力
系统 SHALL 以平台系统的方式实现撤销，而不是依赖游戏手动保存快照。

#### Scenario: 自动快照边界
- **WHEN** 一个会改变领域状态的 Command 被接受
- **THEN** undo 系统按配置自动记录快照（或 diff）

#### Scenario: 多人撤销握手
- **GIVEN** 多人对局的撤销请求协议
- **WHEN** 玩家发起撤销请求
- **THEN** 系统记录请求并一致地执行 approve/reject/timeout 规则

### Requirement: 通过 player view 支持隐藏信息
系统 SHALL 支持隐藏信息：允许系统（以及/或者领域内核）提供玩家特定视图。

#### Scenario: 对其他玩家秘密信息做 redaction
- **GIVEN** 一个包含隐藏信息的对局
- **WHEN** 玩家 A 请求获取自己的视图
- **THEN** 返回的视图不会包含其他玩家拥有的秘密信息
