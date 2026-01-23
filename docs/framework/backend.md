---
description: 后端框架封装说明（避免重复造轮子）
---

# 后端框架封装说明

> 目标：明确后端已有的「框架级封装」与复用入口，避免重复造轮子。

## 1. 架构总览（实际代码结构）

```
api-server.ts                # 认证服务入口（Koa）
server.ts                    # 游戏服务入口（Boardgame.io + Lobby Socket）
src/server/
├── auth.ts                  # 认证路由（注册/登录/验证）
├── db.ts                    # MongoDB 连接封装
├── email.ts                 # 邮件发送封装
└── models/
    ├── MatchRecord.ts       # 对局归档模型
    └── User.ts              # 用户模型
```

## 2. 端口与入口

- **开发入口**：`http://localhost:5173`（同域代理详见 `docs/deploy.md`）
- **游戏服务**：`18000`（`GAME_SERVER_PORT`）
- **认证服务**：`18001`（`API_SERVER_PORT`，前缀 `/auth`）
- **MongoDB**：`27017`

## 3. 数据库

- 服务端通过 `MONGO_URI` 连接数据库
- Docker 环境默认使用 `mongodb://mongodb:27017/boardgame`

## 4. 环境变量

- `GAME_SERVER_PORT`：游戏服务端口
- `API_SERVER_PORT`：认证服务端口
- `MONGO_URI`：Mongo 连接串
- `JWT_SECRET`：JWT 密钥（生产必须改）

## 5. 已封装的服务层能力

- **认证服务（Koa）**
  - 入口：`api-server.ts`
  - 路由：`src/server/auth.ts`
  - 依赖：`koa` / `@koa/router` / `koa-bodyparser` / `jsonwebtoken`

- **游戏服务（Boardgame.io Server）**
  - 入口：`server.ts`
  - 服务端游戏注册：基于 `src/games/manifest.ts` + `GAME_IMPLEMENTATIONS`
  - 比赛归档：`MatchRecord` + `archiveMatchResult`

- **大厅实时通信（Socket.IO）**
  - 服务端：`server.ts` 内的 Lobby Socket（`/lobby-socket`）
  - 客户端：`src/services/lobbySocket.ts`
  - 使用方式：订阅/取消订阅大厅更新 + 心跳

- **数据库封装**
  - 统一连接：`src/server/db.ts`
  - Mongoose 模型：`src/server/models/`

## 6. 何时扩展“框架”层（后端）

- **跨服务复用**（认证/游戏/大厅通用） → 放 `src/server/` 目录下封装模块
- **仅游戏服务内部使用** → 放 `server.ts` 附近的私有逻辑
- **数据层复用** → 放 `src/server/models/`

## 7. 扩展入口清单

- **新增 API 服务**：新增 `xxx-server.ts` 入口文件（对齐 `api-server.ts` 风格）
- **新增路由模块**：`src/server/<module>.ts`
- **新增数据模型**：`src/server/models/<Model>.ts`

## 8. 相关文档

- **部署与同域策略**：`docs/deploy.md`
- **测试模式（调试面板）**：`docs/test-mode.md`
- **工具脚本**：`docs/tools.md`

> ✅ 所有新增封装必须优先复用现有基础设施（DB、JWT、Socket.IO 机制）。
