## Context
当前游戏注册来源分散在服务端注册数组、前端实现映射、前端展示配置，存在 ID 不一致与启用状态不同步风险；战绩归档依赖轮询，延迟高且在重启/异常时可能漏记。

## Goals / Non-Goals
- Goals:
  - 建立单一权威游戏清单，统一游戏 ID 与启用状态来源
  - 服务端/前端从清单派生自身配置，避免重复维护
  - 使用 game.onEnd 事件驱动战绩归档，移除轮询
- Non-Goals:
  - 不调整现有 UI 视觉样式
  - 不更改 MatchRecord 数据模型字段结构

## Decisions
- 决定引入 `games/manifest.ts` 作为单一权威清单（纯数据：id、type、enabled 等），禁止包含 React/DOM 依赖。
- 前端展示配置与实现映射必须从 manifest 派生，禁止再新增手工枚举游戏 ID。
- 服务端注册 BoardgameServer 仅使用 manifest 中 `type=game` 且 `enabled=true` 的条目。
- 战绩归档改为在每个游戏的 `game.onEnd` 中触发持久化，统一复用一个归档辅助函数（boardgame.io Game 文档已确认提供 onEnd）。

## Alternatives Considered
- 继续多处维护并增加一致性检查：降低迁移成本但仍有重复源，违背“单一权威”目标。
- 仅改轮询为更短间隔：无法解决重启漏记与延迟问题。

## Risks / Trade-offs
- 需要在 manifest 与实现映射之间建立一致性校验（开发期报错），否则仍可能引入空映射。

## Migration Plan
1. 新增 manifest 并迁移游戏 ID 与启用状态。
2. 重构前端展示配置与实现映射为“派生逻辑”。
3. 服务端注册改为派生清单。
4. 替换轮询为事件驱动归档，删除轮询代码。

## Open Questions
- 工具类条目（如 assetslicer）是否纳入 manifest 并标记 `type=tool`？
