## ADDED Requirements

### Requirement: 好友请求发送
用户 SHALL 能够通过用户名搜索其他用户并发送好友请求。

#### Scenario: 搜索用户并发送请求
- **WHEN** 用户在搜索框输入目标用户名并点击"添加好友"
- **THEN** 系统创建一条 `status: 'pending'` 的好友关系记录
- **AND** 目标用户收到实时好友请求通知

#### Scenario: 重复发送请求
- **WHEN** 用户尝试向已发送请求或已是好友的用户发送请求
- **THEN** 系统拒绝请求并提示"已发送请求"或"已是好友"

### Requirement: 好友请求处理
用户 SHALL 能够接受或拒绝收到的好友请求。

#### Scenario: 接受好友请求
- **WHEN** 用户点击"接受"好友请求
- **THEN** 好友关系状态更新为 `accepted`
- **AND** 双方好友列表中出现对方

#### Scenario: 拒绝好友请求
- **WHEN** 用户点击"拒绝"好友请求
- **THEN** 好友关系记录被删除
- **AND** 发送方不会收到拒绝通知

### Requirement: 好友列表展示
用户 SHALL 能够查看自己的好友列表，包含在线状态。

#### Scenario: 获取好友列表
- **WHEN** 用户打开好友列表
- **THEN** 系统返回所有 `status: 'accepted'` 的好友
- **AND** 每个好友显示当前在线状态（在线/离线/离开）

### Requirement: 好友在线状态
系统 SHALL 实时更新好友的在线状态。

#### Scenario: 好友上线
- **WHEN** 好友建立 WebSocket 连接
- **THEN** 用户的好友列表中该好友状态变为"在线"

#### Scenario: 好友离线
- **WHEN** 好友 WebSocket 断开超过 30 秒
- **THEN** 用户的好友列表中该好友状态变为"离线"

### Requirement: 删除好友
用户 SHALL 能够删除已有的好友关系。

#### Scenario: 删除好友
- **WHEN** 用户在好友列表中点击"删除好友"并确认
- **THEN** 双方的好友关系记录被删除
- **AND** 双方好友列表中不再显示对方
