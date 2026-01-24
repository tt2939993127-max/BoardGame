# game-registry Specification

## Purpose
定义游戏注册与发现机制，确保游戏清单的单一权威来源，并支持单目录新增游戏的开发体验。

## Requirements
### Requirement: 单一权威游戏清单
系统 SHALL 从 `src/games/<gameId>/manifest.ts` 自动发现并生成权威清单，作为所有游戏 ID 与启用状态的唯一来源。

#### Scenario: 自动发现权威清单
- **WHEN** 系统执行清单生成脚本
- **THEN** 输出的清单包含所有目录内的 `manifest.ts` 条目

### Requirement: 服务端注册派生
系统 SHALL 从自动生成的权威清单派生服务端可对局游戏列表。

#### Scenario: 注册可对局游戏
- **WHEN** 服务端启动并读取生成的游戏清单
- **THEN** 仅注册 `type=game` 且 `enabled=true` 的游戏

### Requirement: 前端展示派生
系统 SHALL 使用自动生成的权威清单作为前端展示的 ID 集合来源。

#### Scenario: 渲染大厅列表
- **WHEN** 前端渲染游戏大厅列表
- **THEN** 仅展示清单中存在且 `enabled=true` 的游戏条目

### Requirement: 实现映射一致性校验
系统 SHALL 在开发环境校验权威清单中的 `game` 条目是否具有对应实现映射。

#### Scenario: 缺失实现映射
- **WHEN** 权威清单包含未提供实现映射的游戏
- **THEN** 启动时抛出错误并阻止继续运行

### Requirement: 单目录新增游戏
系统 SHALL 支持通过新增 `src/games/<gameId>/` 目录完成新游戏接入，且无需修改其他文件。

#### Scenario: 新增游戏目录
- **WHEN** 新增游戏目录并补齐约定文件
- **THEN** 运行生成脚本后自动出现在大厅与服务端注册列表
