# 社交中心系统设计文档

## Context

当前桌游平台已具备基础的用户认证和联机对战功能，但缺乏社交层。用户无法维护好友关系、进行即时通讯或便捷地邀请好友加入游戏。随着社交系统上线，后端将不再是简单服务，需要先迁移至 NestJS 再实施功能。

### 现有基础设施

- **认证服务**: NestJS + JWT，端口 18001
- **游戏服务**: GameTransportServer (Koa + socket.io)，端口 18000
- **WebSocket**: Socket.io 已用于大厅实时更新 (`lobbySocket.ts`)
- **悬浮球**: `GameHUD.tsx` 已实现可拖拽悬浮球 UI
- **部署形态**: 三进程（game-server:18000 / auth-server:18001 / web:80）

## Goals / Non-Goals

### Goals

0. 先完成 API 服务 NestJS 迁移，并保持 `/auth` 路由兼容
1. 实现完整的好友系统（添加/删除/搜索/在线状态）
2. 实现私聊消息系统（发送/接收/历史/通知）
3. 实现游戏邀请功能（邀请好友加入房间）
4. 提供双入口（主页右上角头像下拉 + 悬浮球展开窗口）
5. 构建 Steam 风格好友/聊天窗口（好友 + 消息合一，左列表右聊天）
6. 提供"对战记录"独立模态框（不新增独立页面）

### Non-Goals

- 不迁移游戏传输层服务（保持 `server.ts` 现状）
- 不新增独立 Profile 页面（改为头像下拉 + 好友与聊天窗口 + 对战记录模态框）
- 群聊功能（MVP 不包含）
- 好友分组/标签
- 消息加密（明文存储，生产环境可后续加密）
- 语音/视频通话

## 架构决策

### 1. 后端平台迁移（NestJS）

**决策**: API 服务迁移到 NestJS，社交系统基于 NestJS 构建

**范围**:
- NestJS Auth 模块承接原认证能力
- 保持 `/auth` 路由与响应结构兼容现有前端
- 游戏传输层服务保持独立运行

**部署形态**:
- 默认单体部署：NestJS API 与 Web 前端合并为同一进程与端口
- `game-server` 保持独立进程，避免影响对局稳定性

**理由**:
- 100 用户规模下单体化可降低部署复杂度与运维成本
- 保留 `game-server` 独立进程，避免对局逻辑与社交逻辑互相干扰
- 社交系统涉及多个模块（好友/消息/邀请/实时推送），需要模块化架构
- NestJS 提供统一的依赖注入与 WebSocket Gateway
- 便于后续扩展监控、任务队列和权限体系

**替代方案**:
- 继续使用 Koa 扩展 → 代码规模增大后维护成本高

**NestJS 模块结构**:
```
apps/api/src/
├── modules/
│   ├── auth/           # 认证（注册/登录/JWT/邮箱验证）
│   ├── user/           # 用户管理（资料/lastOnline）
│   ├── friend/         # 好友系统
│   ├── message/        # 消息系统
│   ├── invite/         # 游戏邀请
│   ├── leaderboard/    # 排行榜（从 server.ts 迁移）
│   └── match-archive/  # 战绩归档（事件驱动）
├── gateways/
│   └── social.gateway.ts  # 社交 WebSocket
├── shared/
│   ├── guards/         # JWT Guard 等
│   ├── decorators/     # @CurrentUser() 等
│   └── filters/        # 异常过滤器
└── app.module.ts

```

### 2. Redis 缓存层

**决策**: 引入 Redis 作为缓存与会话管理层

**理由**:
- **验证码存储**: 当前用内存 Map，服务重启丢失，多实例无法共享
- **在线状态**: 需要跨实例共享用户连接状态
- **JWT 黑名单**: 登出后需要使 Token 立即失效
- **未读消息计数**: 高频读取，需缓存减少 DB 压力
- **排行榜缓存**: 聚合查询昂贵，需缓存结果
- **Socket 会话**: 多实例部署时需 Redis Adapter 共享房间状态

**使用场景**:

| 场景 | Key 格式 | TTL | 说明 |
|------|----------|-----|------|
| 邮箱验证码 | `verify:email:{email}` | 5 分钟 | 替代内存 Map |
| JWT 黑名单 | `jwt:blacklist:{jti}` | Token 剩余有效期 | 登出后立即失效 |
| 用户在线状态 | `online:{userId}` | 60 秒 (心跳续期) | WebSocket 连接时设置 |
| 未读消息计数 | `unread:{userId}` | 无过期 | 写入时更新，读取后清零 |
| 排行榜缓存 | `leaderboard:{gameName}` | 5 分钟 | 减少聚合查询 |

**NestJS 集成**:
```typescript
// app.module.ts
import { CacheModule } from '@nestjs/cache-manager';
import { redisStore } from 'cache-manager-redis-store';

@Module({
  imports: [
    CacheModule.registerAsync({
      useFactory: () => ({
        store: redisStore,
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT || '6379'),
      }),
    }),
  ],
})
```

**Socket.io Redis Adapter** (多实例部署):
```typescript
// social.gateway.ts
import { createAdapter } from '@socket.io/redis-adapter';
// 启用后，不同 NestJS 实例可共享 WebSocket 房间
```

**替代方案**:
- 不使用 Redis → 单实例可行，但多实例部署困难，验证码重启丢失

### 3. 索引与分页策略

**决策**: 核心列表接口强制分页，核心查询字段必须建立索引。

**索引范围**:
- **User**: `username`/`email` 唯一索引（搜索与登录）
- **Friend**: `{ user: 1, friend: 1 }` 唯一复合索引
- **Message**: `{ from: 1, to: 1, createdAt: -1 }`、`{ to: 1, read: 1 }`
- **MatchRecord**: `{ gameName: 1, endedAt: -1 }`、`{ 'players.id': 1, endedAt: -1 }`

**分页策略**:
- 所有列表接口统一 `page` + `limit` 参数（默认 `page=1`、`limit=50`、最大 100）
- 响应包含 `items`、`page`、`limit`、`total`、`hasMore`

### 4. WebSocket 通道设计

**决策**: 新建独立的 `/social-socket` 命名空间，与 `/lobby-socket` 分离

**理由**:
- 职责分离：大厅广播 vs 点对点社交消息
- 连接生命周期不同：社交 Socket 需全局保持
- 避免事件命名冲突

**替代方案**:
- 复用 `/lobby-socket` → 耦合过重，事件混杂

### 5. 在线状态机制

**决策**: 基于 WebSocket 连接状态 + 最后活跃时间

```
在线: WebSocket 已连接
离线: WebSocket 断开超过 30 秒
离开: WebSocket 断开 30 秒内（可配置）
```

**实现**:
- 客户端连接 `/social-socket` 时标记在线
- 断开时更新 `lastOnline` 时间戳
- 好友列表查询时计算状态

### 6. 社交入口与面板布局

**决策**: 采用 Steam 风格“好友/聊天窗口”，并提供双入口（主页右上角头像下拉 + 悬浮球展开窗口），不新增页面。

**入口**:
- 主页右上角用户头像按钮 → 下拉菜单
- 悬浮球（GameHUD）展开窗口 → 提供"好友与聊天"入口
- 头像入口与悬浮球入口共享同一套未读红点与数量

**好友/聊天窗口（好友 + 消息合一）布局**:
```
FriendsChatModal
├── 左侧：好友/会话列表（搜索、在线状态、未读）
└── 右侧：对话窗口（点击会话后展开）
```

**对战记录（独立模态框）**:
```
MatchHistoryModal
└── 分页对局记录列表（游戏/对手/结果/时间）
```

**与 GameHUD 关系**:
- `GameHUD` 保留局内对局信息面板
- 悬浮球展开窗口提供"好友与聊天"入口，便于局内快速打开
- 头像下拉中的"对战记录"打开独立模态框，不进入好友/聊天窗口

### 7. 数据模型

#### Friend 关系模型

```typescript
interface IFriend {
  user: ObjectId;       // 发起方
  friend: ObjectId;     // 接收方
  status: 'pending' | 'accepted' | 'blocked';
  createdAt: Date;
}
```

**索引**: `{ user: 1, friend: 1 }` 唯一复合索引

#### Message 消息模型

```typescript
interface IMessage {
  from: ObjectId;
  to: ObjectId;
  content: string;
  type: 'text' | 'invite';  // invite 为游戏邀请
  inviteData?: { matchId: string; gameName: string };
  read: boolean;
  createdAt: Date;
}
```

**索引**:
- `{ from: 1, to: 1, createdAt: -1 }` 会话查询
- `{ to: 1, read: 1 }` 未读消息计数

### 8. API 设计

#### 好友 API (`/auth/friends`)

| Method | Path | 说明 |
|--------|------|------|
| GET | `/` | 获取好友列表（含在线状态） |
| POST | `/request` | 发送好友请求 |
| POST | `/accept/:id` | 接受好友请求 |
| POST | `/reject/:id` | 拒绝好友请求 |
| DELETE | `/:id` | 删除好友 |
| GET | `/search?q=` | 搜索用户（按用户名） |

#### 消息 API (`/auth/messages`)

| Method | Path | 说明 |
|--------|------|------|
| GET | `/conversations` | 获取会话列表 |
| GET | `/:userId` | 获取与某用户的消息历史 |
| POST | `/send` | 发送消息 |
| POST | `/read/:userId` | 标记已读 |

#### 邀请 API (`/auth/invites`)

| Method | Path | 说明 |
|--------|------|------|
| POST | `/send` | 发送游戏邀请 |

### 9. 实时事件

#### Social Socket 事件

```typescript
// 客户端 → 服务器
'social:connect'      // 上线
'social:disconnect'   // 离线

// 服务器 → 客户端
'social:friendOnline'     // 好友上线
'social:friendOffline'    // 好友离线
'social:newMessage'       // 新消息
'social:friendRequest'    // 新好友请求
'social:gameInvite'       // 游戏邀请
```

## Risks / Trade-offs

| 风险 | 缓解措施 |
|------|----------|
| 单体部署与 game-server 分离 | 明确边界：Web+API 合并进 NestJS，游戏走独立 GameTransportServer |
| WebSocket 连接数增加 | 单例 Socket，复用连接 |
| 消息存储增长 | 分页加载，后续可加消息过期策略 |
| 在线状态不准确 | 心跳 + 重连机制 |
| 社交模态遮挡游戏 UI | 可快速关闭 + 记忆上次位置 |

## Migration Plan

1. 搭建 NestJS API 骨架（`apps/api`）并接入 MongoDB
2. 迁移认证与邮箱验证逻辑，保持 `/auth` 兼容
3. 实现社交数据模型与 API
4. 接入 Social Gateway 与在线状态机制
5. 合并 Web + NestJS 为单体部署模式（保留 game-server 独立）
6. GameHUD 增加悬浮球展开入口，主页提供头像下拉入口
7. 分阶段上线：好友系统 → 消息系统 → 邀请系统

## Open Questions

1. **消息持久化策略**: 是否需要消息过期/删除功能？（MVP 暂不实现）
2. **离线消息**: 用户离线时消息如何处理？（当前方案：存库，上线后拉取）
3. **通知权限**: 是否需要浏览器推送通知？（MVP 仅红点提示）
