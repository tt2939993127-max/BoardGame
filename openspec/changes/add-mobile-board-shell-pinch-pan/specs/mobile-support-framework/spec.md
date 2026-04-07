## ADDED Requirements

### Requirement: board-shell 可选提供通用战场双指缩放与拖拽平移
系统 SHALL 为 `board-shell` 游戏提供一个可选的通用移动端战场手势层，用于在真实战场画布上执行双指缩放与拖拽平移。

#### Scenario: 启用 shell-pinch-pan 的游戏进入移动端横屏
- **GIVEN** 某个游戏声明 `mobileLayoutPreset = 'board-shell'`
- **AND** 该游戏声明 `mobileBattlefieldZoom = 'shell-pinch-pan'`
- **WHEN** 用户在移动端横屏进入该游戏页
- **THEN** 系统 MUST 允许在主画布区域执行双指缩放
- **AND** 缩放后 MUST 允许通过拖拽平移查看被放大的战场区域

#### Scenario: 默认态不接管单指操作
- **GIVEN** 某个游戏启用了 `shell-pinch-pan`
- **AND** 当前主画布缩放比例仍为 `1`
- **WHEN** 用户在主画布上执行单指点击、长按或游戏自有拖拽
- **THEN** 通用手势层 MUST 不抢占这些默认单指交互

### Requirement: 通用战场手势层只作用于主画布
系统 SHALL 保证通用战场缩放层只作用于 `MobileBoardShell` 的主画布区域，不得把 HUD、侧栏、底部 rail 一起缩放。

#### Scenario: 打开通用战场缩放层的 board-shell 页面
- **GIVEN** 某个游戏启用了 `shell-pinch-pan`
- **WHEN** 用户执行双指缩放
- **THEN** 被缩放的区域 MUST 仅限主画布内容
- **AND** 顶部 rail、侧边 dock、底部 rail MUST 保持原始尺寸与坐标系

### Requirement: 已有整块棋盘/战场放大能力的游戏可排除框架接管
系统 SHALL 支持游戏显式声明“整块棋盘/战场放大由游戏自己负责”，防止框架层与游戏层叠加两套战场缩放。

#### Scenario: 游戏声明 game-owned
- **GIVEN** 某个游戏声明 `mobileBattlefieldZoom = 'game-owned'`
- **WHEN** 用户在移动端进入该游戏页
- **THEN** `MobileBoardShell` MUST 不注入通用战场 `pinch + pan` 手势层
