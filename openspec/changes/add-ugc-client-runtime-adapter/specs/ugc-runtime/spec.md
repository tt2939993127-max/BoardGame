## ADDED Requirements

### Requirement: UGC 客户端运行态加载器
系统 SHALL 在客户端根据 UGC 包清单解析 rules/view 入口并生成运行态配置，用于 MatchRoom 动态注入。

#### Scenario: 解析入口并生成配置
- **WHEN** 客户端请求 `/ugc/packages/:packageId/manifest`
- **THEN** 系统 MUST 解析 `entryPoints.rules/view` 并生成运行态配置

### Requirement: UGC 资源基址
系统 SHALL 提供可配置的 UGC 资源基址用于拼接入口 URL，默认值为 `/assets`。

#### Scenario: 默认基址
- **WHEN** 客户端未显式配置资源基址
- **THEN** 系统 MUST 使用 `/assets` 作为默认基址

### Requirement: Manifest 命令类型枚举
系统 SHALL 支持在 UGC 包清单中提供 `commandTypes`，用于生成可枚举 moves。

#### Scenario: 提供命令类型
- **WHEN** manifest 包含 `commandTypes`
- **THEN** 系统 MUST 使用该列表生成可枚举 moves

### Requirement: UGC 联机入口复用
系统 SHALL 允许 UGC 游戏在 MatchRoom 中复用通用 Game/Board 适配器进入联机流程。

#### Scenario: MatchRoom 注入 UGC 实现
- **WHEN** 进入 `/play/:gameId/match/:matchId` 且 `gameId` 为 UGC 包
- **THEN** 系统 MUST 使用 UGC 适配器渲染联机对局

### Requirement: 视图入口优先策略
系统 SHALL 优先加载包内 view 入口，缺失时回退内置 runtime view。

#### Scenario: 包内 view 存在
- **WHEN** `entryPoints.view` 存在
- **THEN** 系统 MUST 使用该入口加载视图

#### Scenario: 包内 view 缺失
- **WHEN** `entryPoints.view` 不存在
- **THEN** 系统 MUST 使用内置 runtime view 作为回退

### Requirement: UGC 联机发布包限制
系统 SHALL 仅允许已发布的 UGC 包进入联机入口。

#### Scenario: 未发布包
- **WHEN** 客户端请求未发布的 UGC 包
- **THEN** 系统 MUST 拒绝并提示不可用
