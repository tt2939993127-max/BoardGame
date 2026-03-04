# Change: 单一权威游戏清单与事件驱动战绩归档

## Why
- 游戏注册来源分散（服务端注册、前端实现、前端展示各自维护），存在一致性风险与维护成本。
- 战绩归档依赖轮询，延迟高且在服务重启/异常时存在漏记风险。

## What Changes
- 引入单一权威游戏清单（纯数据）作为游戏 ID / 启用状态 / 类型的唯一来源。
- 服务端与前端从清单派生各自的注册与展示配置，消除多处手工维护。
- 使用 `game.onEnd` 事件驱动写入 `MatchRecord`，移除轮询归档任务。
- **BREAKING**：移除旧的硬编码注册与轮询归档逻辑，需按新清单派生流程迁移。

## Impact
- Affected specs: `game-registry`, `match-archive`
- Affected code: `server.ts`, `src/games/registry.ts`, `src/config/games.config.tsx`, `src/games/*/game.ts`, `src/server/models/MatchRecord.ts`
