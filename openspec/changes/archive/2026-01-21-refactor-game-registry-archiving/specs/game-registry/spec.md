## ADDED Requirements
### Requirement: 单一权威游戏清单
系统 SHALL 提供单一权威游戏清单，作为所有游戏 ID 与启用状态的唯一来源。

#### Scenario: 加载权威清单
- **WHEN** 系统启动加载游戏清单
- **THEN** 返回包含 `id`、`type`、`enabled` 等字段的条目集合

### Requirement: 服务端注册派生
系统 SHALL 仅从权威清单派生服务端可对局游戏列表。

#### Scenario: 注册可对局游戏
- **WHEN** 服务端启动并读取游戏清单
- **THEN** 仅注册 `type=game` 且 `enabled=true` 的游戏

### Requirement: 前端展示派生
系统 SHALL 以权威清单作为前端展示的 ID 集合来源。

#### Scenario: 渲染大厅列表
- **WHEN** 前端渲染游戏大厅列表
- **THEN** 仅展示清单中存在且 `enabled=true` 的游戏条目

### Requirement: 实现映射一致性校验
系统 SHALL 在开发环境校验权威清单中的 `game` 条目是否具有对应实现映射。

#### Scenario: 缺失实现映射
- **WHEN** 权威清单包含未提供实现映射的游戏
- **THEN** 启动时抛出错误并阻止继续运行
