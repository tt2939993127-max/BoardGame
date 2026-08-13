## MODIFIED Requirements

### Requirement: 客户端桥接层与服务端 recovery 必须使用同一套决策视图语义

系统 SHALL 将在线 AI 的正式决策视图和命令执行收敛到服务端。服务端执行器与其 watchdog recovery MUST 复用同一套“公共真相 + 私有增量”解析语义；浏览器只消费同步后的状态用于显示，不得构造或提交在线 AI 的正式决策。

#### Scenario: 服务端在公开 setup 场景自行决策

- **GIVEN** 某个在线 AI 处于公开 setup 决策场景
- **WHEN** 服务端执行器解析该 AI 决策视图
- **THEN** 系统 MUST 使用当前 authoritative shared 生成并执行合法动作
- **AND** 浏览器 MUST NOT 为该 AI 创建独立传输连接或提交该动作

#### Scenario: 服务端在私有决策场景自行决策

- **GIVEN** 某个在线 AI 当前依赖 hidden interaction、response window 或 seat 专属 option 列表
- **WHEN** 服务端执行器解析该 AI 决策视图
- **THEN** 系统 MUST 从当前权威状态派生该 AI 的 private overlay
- **AND** 不得依赖浏览器缓存的 seat 快照
- **AND** 浏览器 MUST NOT 以旧 overlay 提交正式 AI 命令

#### Scenario: 私有视图无法派生时不得静默退回浏览器

- **GIVEN** 服务端无法从当前权威状态为一个可行动 AI seat 派生所需 private overlay
- **WHEN** 服务端准备执行该 AI
- **THEN** 系统 MUST 停止该 seat 的自动执行并记录含对局、座位和状态版本的内部契约异常
- **AND** MUST NOT 回退到浏览器旧快照、共享视图猜测或静默跳过
