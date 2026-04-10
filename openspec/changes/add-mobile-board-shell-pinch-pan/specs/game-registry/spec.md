## ADDED Requirements

### Requirement: 游戏注册表显式暴露战场缩放所有权
系统 SHALL 允许启用中的游戏 manifest 显式声明移动端整块战场缩放的所有权，以区分框架接管、游戏自管和完全关闭三种模式。

#### Scenario: 启用中的游戏声明战场缩放所有权
- **GIVEN** 某个启用中的游戏 manifest 被纳入自动生成的注册表
- **WHEN** 运行时消费该注册表条目
- **THEN** 条目 MUST 暴露 `mobileBattlefieldZoom`
- **AND** 当其值为 `shell-pinch-pan` 时，框架 MAY 为该游戏启用通用战场缩放
- **AND** 当其值为 `game-owned` 时，框架 MUST 不接管该游戏的整块战场缩放

#### Scenario: 未声明时使用安全默认值
- **GIVEN** 某个注册表条目没有单独声明 `mobileBattlefieldZoom`
- **WHEN** 运行时归一化该条目
- **THEN** 系统 MUST 为其补齐安全默认值
- **AND** 默认值 MUST 不把该条目误判为启用通用战场缩放
