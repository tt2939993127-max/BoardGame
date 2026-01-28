# user-profile Specification

## Purpose
TBD - created by archiving change add-social-hub. Update Purpose after archive.
## Requirements
### Requirement: 头像下拉用户信息
用户 SHALL 能够通过头像下拉查看用户基础信息。

#### Scenario: 展示用户信息
- **WHEN** 用户点击右上角头像展开下拉菜单
- **THEN** 下拉菜单展示用户名与在线状态
- **AND** 下拉菜单展示邮箱验证状态

### Requirement: 对战记录入口
用户 SHALL 能够从头像下拉打开"对战记录"模态框。

#### Scenario: 打开对战记录
- **WHEN** 用户点击头像下拉中的"对战记录"
- **THEN** 系统打开"对战记录"模态框

### Requirement: 对战记录展示
系统 SHALL 在"对战记录"模态框展示用户的历史对局记录。

#### Scenario: 查看对战记录列表
- **WHEN** 用户打开"对战记录"模态框
- **THEN** 系统展示用户参与的历史对局
- **AND** 每条记录包含游戏名称、对手、结果、时间

#### Scenario: 对战记录分页
- **WHEN** 用户滚动到列表底部
- **THEN** 系统加载更多历史对局记录

