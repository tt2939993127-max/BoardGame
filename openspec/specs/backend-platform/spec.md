# backend-platform Specification

## Purpose
TBD - created by archiving change add-social-hub. Update Purpose after archive.
## Requirements
### Requirement: NestJS API 服务迁移
系统 SHALL 将现有 Koa 认证服务迁移为 NestJS 应用，并保持接口兼容。

#### Scenario: 认证服务迁移完成
- **WHEN** NestJS API 服务启动
- **THEN** `/auth/register`、`/auth/login`、`/auth/me` 接口可用
- **AND** 返回结构与现有前端兼容

#### Scenario: 邮箱验证迁移完成
- **WHEN** 用户调用 `/auth/send-email-code` 与 `/auth/verify-email`
- **THEN** NestJS API 完成验证码发送与校验逻辑
- **AND** 验证码存储在 Redis 而非内存

### Requirement: NestJS 基础设施
系统 SHALL 提供 NestJS 标准化的模块与配置结构。

#### Scenario: 应用初始化
- **WHEN** 开发者启动 API 服务
- **THEN** `apps/api` 中存在清晰的模块划分（Auth/Friend/Message/Invite）
- **AND** MongoDB 与 Redis 连接配置可通过环境变量注入

### Requirement: 单体部署策略
系统 SHALL 支持 Web + NestJS 单体部署，且 game-server 保持独立运行。

#### Scenario: Web + API 合并部署
- **WHEN** 生产环境采用单体部署
- **THEN** Web 与 NestJS API 使用同一进程与端口对外服务
- **AND** 认证与社交接口仍保持 `/auth` 路由兼容

#### Scenario: game-server 独立运行
- **WHEN** API 服务合并为单体部署
- **THEN** `server.ts` 的 Boardgame.io 服务独立运行
- **AND** game-server 端口保持现状

### Requirement: Redis 缓存层
系统 SHALL 集成 Redis 作为缓存与会话管理层。

#### Scenario: 验证码存储
- **WHEN** 系统发送邮箱验证码
- **THEN** 验证码存入 Redis（Key: `verify:email:{email}`，TTL: 5 分钟）
- **AND** 服务重启后验证码仍可用

#### Scenario: JWT 黑名单
- **WHEN** 用户登出
- **THEN** 当前 Token 的 jti 存入 Redis 黑名单
- **AND** 后续请求使用该 Token 被拒绝

#### Scenario: 在线状态存储
- **WHEN** 用户 WebSocket 连接建立
- **THEN** 用户 ID 存入 Redis（Key: `online:{userId}`，TTL: 60 秒）
- **AND** 心跳续期保持在线状态

#### Scenario: 未读消息计数
- **WHEN** 用户收到新消息
- **THEN** Redis 中该用户未读计数递增（Key: `unread:{userId}`）
- **AND** 用户查看消息后计数清零

### Requirement: 索引与分页策略
系统 SHALL 建立核心查询索引并统一分页响应结构。

#### Scenario: 建立核心索引
- **WHEN** 系统初始化数据模型
- **THEN** Friend、Message、MatchRecord 具备核心查询索引
- **AND** User 的 `username`/`email` 为唯一索引

#### Scenario: 列表分页响应
- **WHEN** 客户端请求列表接口（好友/会话/消息/对局记录）
- **THEN** 接口支持 `page` + `limit` 参数
- **AND** 返回 `items`、`page`、`limit`、`total`、`hasMore`

### Requirement: 双后端边界
系统 SHALL 保持 Boardgame.io 游戏服务独立运行。

#### Scenario: 游戏服务保持不变
- **WHEN** API 服务迁移至 NestJS
- **THEN** `server.ts` 的 Boardgame.io 服务无需改动
- **AND** 游戏服务端口与大厅广播逻辑保持现状

