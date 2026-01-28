# social-widget Specification

## Purpose
TBD - created by archiving change add-social-hub. Update Purpose after archive.
## Requirements
### Requirement: 头像下拉社交入口
系统 SHALL 在所有页面提供基于头像的社交入口。

#### Scenario: 头像下拉入口显示
- **WHEN** 用户已登录并访问任意页面
- **THEN** 顶部头像入口可点击展开
- **AND** 下拉项包含"好友与聊天"与"对战记录"入口

#### Scenario: 未登录时隐藏头像入口
- **WHEN** 用户未登录
- **THEN** 头像社交入口不显示

### Requirement: 悬浮球社交入口
系统 SHALL 在游戏对局中提供悬浮球展开入口以打开"好友与聊天"窗口。

#### Scenario: 局内通过悬浮球打开好友与聊天
- **WHEN** 用户在游戏对局中展开悬浮球并点击"好友与聊天"
- **THEN** 系统打开"好友与聊天"窗口

#### Scenario: 未登录时隐藏悬浮球社交入口
- **WHEN** 用户未登录
- **THEN** 悬浮球展开窗口不显示"好友与聊天"入口

### Requirement: 好友与聊天窗口
系统 SHALL 通过一个窗口同时展示好友列表与聊天窗口（好友 + 消息合一）。

#### Scenario: 打开好友与聊天窗口
- **WHEN** 用户点击头像下拉中的"好友与聊天"或局内悬浮球入口
- **THEN** 系统打开"好友与聊天"窗口
- **AND** 窗口左侧显示好友/会话列表
- **AND** 窗口右侧显示对话窗口（未选择时为空态）

#### Scenario: 关闭面板
- **WHEN** 用户点击遮罩或关闭按钮
- **THEN** 窗口关闭

### Requirement: 消息红点通知
头像入口与悬浮球入口 SHALL 显示未读消息提示。

#### Scenario: 有未读消息时显示红点
- **WHEN** 存在未读消息或待处理好友请求
- **THEN** 头像入口与悬浮球入口显示红点
- **AND** 红点内显示未读数量（超过 99 显示 99+）

#### Scenario: 无未读时隐藏红点
- **WHEN** 所有消息已读且无待处理请求
- **THEN** 头像入口与悬浮球入口不显示红点

### Requirement: 局内聊天
用户 SHALL 能够在游戏对局中与对手进行即时聊天。

#### Scenario: 发送局内消息
- **WHEN** 用户在局内"好友与聊天"窗口输入消息并发送
- **THEN** 消息发送给当前对局的对手
- **AND** 对手"好友与聊天"窗口实时显示新消息

#### Scenario: 非好友对手
- **WHEN** 对手不是好友
- **THEN** 局内聊天仍可正常使用
- **AND** 消息不存入私聊历史

