# Change: 添加社交中心系统

## Why

当前平台缺乏用户社交功能，玩家无法添加好友、发送消息或邀请好友加入游戏。这限制了平台的用户粘性和多人游戏体验。需要构建一套商业级的社交系统，支持好友管理、即时通讯、游戏邀请和个人资料展示。

## What Changes

### 新增能力

- **`backend-platform`**: API 服务迁移至 NestJS，并与 Web 合并为单体部署（game-server 保持独立）
- **`friend-system`**: 好友添加/删除/搜索、好友列表、实时在线状态
- **`messaging`**: 私聊消息系统、消息通知（红点）、消息历史记录
- **`game-invite`**: 好友游戏邀请、邀请通知、快速加入
- **`user-profile`**: 头像下拉中的用户信息与"对战记录"入口（对战记录为独立模态框）
- **`social-widget`**: 双入口（头像下拉 + 悬浮球展开窗口）的好友/聊天窗口（好友 + 消息合一，左列表右聊天）

### 现有组件修改

- **`GameHUD`**: 保留局内对局信息入口，并提供"好友与聊天"入口（与头像下拉共享同一套面板）
- **`API 服务`**: 从 Koa 迁移到 NestJS，先重构再实现社交功能
- **`User Model`**: 扩展字段支持好友关系和在线状态
- **`lobbySocket`**: 仍用于大厅广播，新增 NestJS Social Gateway 处理社交消息推送

## Impact

- **Affected specs**: 新增 `backend-platform`，其他能力为新建
- **Affected code**:
  - `apps/api/src/modules/auth` → NestJS Auth 模块承接原认证能力
  - `src/components/game/GameHUD.tsx` → 保留局内信息入口，并提供"好友与聊天"入口
  - `apps/api/src/modules/auth/schemas/user.schema.ts` → 扩展 friends、lastOnline 字段
  - `src/services/lobbySocket.ts` → 保持大厅广播逻辑
  - `src/contexts/AuthContext.tsx` → 继续复用 `/auth` 接口
- **New files**:
  - `apps/api/` → NestJS API 应用（认证 + 社交 + 邀请）
  - `apps/api/src/modules/` → Auth/Friend/Message/Invite 模块
  - `apps/api/src/gateways/social.gateway.ts` → 社交 WebSocket Gateway
  - `src/components/social/` → 社交组件目录
  - `src/components/social/UserMenu.tsx` → 头像下拉菜单（好友与聊天 / 对战记录）
  - `src/components/social/FriendsChatModal.tsx` → 好友与聊天窗口（左列表右聊天）
  - `src/components/social/MatchHistoryModal.tsx` → 对战记录模态框

## 技术约束

1. **NestJS 迁移优先**: API 服务先迁移至 NestJS，再实现社交功能
2. **单体部署**: Web + NestJS 合并为单体应用（game-server 仍独立）
3. **Redis 缓存层**: 引入 Redis 管理验证码、在线状态、JWT 黑名单、未读计数
4. **索引策略**: Friend/User/Message/MatchRecord 建立核心查询索引
5. **分页策略**: 好友列表、会话列表、消息历史、对局记录统一分页
6. **入口形态**: 不新增页面/路由，提供头像下拉与悬浮球展开窗口双入口
7. **面板拆分**: "好友与聊天"为一个窗口（好友 + 消息合一），"对战记录"为独立模态框
8. **实时通信**: NestJS Gateway 提供 `/social-socket`，大厅仍用 `/lobby-socket`
9. **数据存储**: MongoDB 存储好友关系和消息历史
10. **在线状态**: 基于 Redis + WebSocket 连接状态 + 心跳机制
11. **消息通知**: 前端本地 Badge + 可选浏览器通知
