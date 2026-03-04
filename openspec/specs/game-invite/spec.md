# game-invite Specification

## Purpose
TBD - created by archiving change add-social-hub. Update Purpose after archive.
## Requirements
### Requirement: 发送游戏邀请
用户 SHALL 能够邀请在线好友加入当前游戏房间。

#### Scenario: 从好友列表邀请
- **WHEN** 用户在局内好友列表点击"邀请入局"
- **THEN** 系统发送包含 `matchId` 和 `gameName` 的邀请消息
- **AND** 目标好友收到实时邀请通知

#### Scenario: 邀请离线好友
- **WHEN** 用户尝试邀请离线好友
- **THEN** 邀请消息存入数据库
- **AND** 好友上线后可在消息中看到邀请

### Requirement: 接收游戏邀请
用户 SHALL 能够接收并响应游戏邀请。

#### Scenario: 查看邀请消息
- **WHEN** 用户收到游戏邀请
- **THEN** 聊天窗口显示特殊邀请卡片
- **AND** 卡片包含游戏名称和"加入游戏"按钮

#### Scenario: 接受邀请加入游戏
- **WHEN** 用户点击邀请卡片的"加入游戏"
- **THEN** 系统跳转到对应的游戏房间页面
- **AND** 自动尝试加入该房间

### Requirement: 邀请有效性
系统 SHALL 验证游戏邀请的有效性。

#### Scenario: 房间已满或已结束
- **WHEN** 用户点击加入但房间已满或已结束
- **THEN** 系统提示"房间已不可用"
- **AND** 用户留在当前页面

