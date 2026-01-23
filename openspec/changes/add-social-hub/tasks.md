# 社交中心系统实现任务

## 1. NestJS 后端迁移

- [ ] 1.1 初始化 NestJS API 应用 (`apps/api`)
- [ ] 1.2 配置环境变量与启动脚本（API 端口 18001）
- [ ] 1.3 集成 MongoDB 连接与基础配置
- [ ] 1.4 集成 Redis 缓存模块（`@nestjs/cache-manager` + `cache-manager-redis-store`）
- [ ] 1.5 迁移 Auth 模块（注册/登录/JWT）
- [ ] 1.6 迁移邮箱验证逻辑（验证码存 Redis，替代内存 Map）
- [ ] 1.7 实现 JWT 黑名单（登出后 Token 失效）
- [ ] 1.8 保持 `/auth` 接口兼容现有前端
- [ ] 1.9 合并 Web + NestJS 为单体部署（game-server 继续独立）

## 2. 社交数据模型与后端基础（NestJS）

- [ ] 2.1 创建 Friend/Message 模型（NestJS Mongoose）
- [ ] 2.2 扩展 User 模型添加 `lastOnline` 字段
- [ ] 2.3 创建好友 API 控制器与服务
- [ ] 2.4 创建消息 API 控制器与服务
- [ ] 2.5 落地核心索引（User/Friend/Message/MatchRecord）
- [ ] 2.6 统一列表分页参数与响应结构

## 3. 实时通信层（NestJS Gateway）

- [ ] 3.1 创建 Social Gateway (`apps/api/src/gateways/social.gateway.ts`)
- [ ] 3.2 注册 `/social-socket` 命名空间
- [ ] 3.3 实现在线状态 Redis 存储（连接时 SET，断开时 DEL，心跳续期）
- [ ] 3.4 创建客户端 `socialSocket.ts` (`src/services/socialSocket.ts`)
- [ ] 3.5 实现好友在线状态广播（基于 Redis 查询）
- [ ] 3.6 实现消息实时推送
- [ ] 3.7 实现未读消息计数 Redis 缓存

## 4. 好友系统前端

- [ ] 4.1 创建 `SocialContext.tsx` 全局社交状态管理
- [ ] 4.2 实现好友列表组件 (`src/components/social/FriendList.tsx`)
- [ ] 4.3 实现用户搜索组件 (`src/components/social/UserSearch.tsx`)
- [ ] 4.4 实现好友请求组件 (`src/components/social/FriendRequests.tsx`)
- [ ] 4.5 实现在线状态指示器组件

## 5. 消息系统前端

- [ ] 5.1 实现会话列表组件 (`src/components/social/ConversationList.tsx`)
- [ ] 5.2 实现聊天窗口组件 (`src/components/social/ChatWindow.tsx`)
- [ ] 5.3 实现消息气泡组件
- [ ] 5.4 实现未读消息红点 Badge
- [ ] 5.5 实现消息输入框与发送

## 6. 双入口与社交模态窗口

- [ ] 6.1 实现头像下拉菜单 `UserMenu`（好友与聊天 / 对战记录）
- [ ] 6.2 在 `GameHUD` 悬浮球展开窗口增加"好友与聊天"入口
- [ ] 6.3 实现 `FriendsChatModal`（左侧好友/会话列表，右侧聊天窗口）
- [ ] 6.4 实现 `MatchHistoryModal`（对战记录分页列表）
- [ ] 6.5 头像入口与悬浮球入口共享未读红点与数量
- [ ] 6.6 对战记录仅通过头像下拉打开（不在悬浮球入口提供）

## 7. 游戏邀请系统

- [ ] 7.1 实现邀请发送 API（NestJS 模块）
- [ ] 7.2 实现邀请消息类型渲染
- [ ] 7.3 实现邀请接受跳转逻辑
- [ ] 7.4 在好友列表添加"邀请入局"按钮

## 8. 集成与测试

- [ ] 8.1 联调好友添加/删除流程
- [ ] 8.2 联调消息发送/接收流程
- [ ] 8.3 联调游戏邀请流程
- [ ] 8.4 测试多端在线状态同步
- [ ] 8.5 测试好友与聊天窗口 / 对战记录模态在不同页面的行为
- [ ] 8.6 验证单体部署下 Web + API 访问与 game-server 独立运行

## 依赖关系

```
1.x (NestJS 迁移) → 2.x (社交后端) → 3.x (实时通信) → 4.x/5.x (前端组件)
                                  ↓
6.x (好友与聊天窗口/对战记录) ← 4.x + 5.x
                ↓
7.x (游戏邀请) ← 6.x
                ↓
8.x (集成测试) ← All
```

## 可并行任务

- 4.x 和 5.x 可在 3.x 完成后并行开发
