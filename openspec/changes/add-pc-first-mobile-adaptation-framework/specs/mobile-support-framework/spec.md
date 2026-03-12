## ADDED Requirements

### Requirement: PC 主导的显式移动适配框架

系统 SHALL 以桌面体验为主版本，并通过显式的移动适配框架支持手机和平板，而不是为每个游戏隐式推断或临时拼接移动端行为。

#### Scenario: 游戏声明横屏适配 profile
- **GIVEN** 某个游戏声明 `mobileProfile = 'landscape-adapted'`
- **WHEN** 该游戏在手机设备上运行
- **THEN** 系统 MUST 启用对应的移动适配框架行为
- **AND** 桌面版布局继续作为权威版本

### Requirement: 框架层横屏适配壳

对于声明为 `landscape-adapted` 的游戏，系统 SHALL 在框架层提供横屏适配壳，保留主棋盘/主牌桌为核心画布，并把外围 HUD、侧栏、日志、说明和额外交互统一适配为移动端可用形式。

#### Scenario: 侧栏与 HUD 在手机横屏下被框架接管
- **GIVEN** 某个游戏的桌面版包含常驻侧栏和阶段 HUD
- **WHEN** 游戏在手机横屏下运行
- **THEN** 系统 MUST 允许这些外围区域进入移动适配壳
- **AND** 不要求该游戏重写一份独立移动端 Board

### Requirement: Hover 交互必须有触控替代

系统 SHALL 为依赖 hover 或细粒度鼠标定位的交互提供统一的触控替代方案，例如点击切换、长按预览、抽屉面板或模态层。

#### Scenario: 卡牌或状态说明在移动端可通过触控访问
- **GIVEN** 某个桌面交互依赖 hover 才能查看详细说明
- **WHEN** 用户在触控设备上使用该游戏
- **THEN** 系统 MUST 提供点击或长按等触控替代入口
- **AND** 不得要求用户拥有鼠标 hover 才能读取关键信息

### Requirement: 缩放和平移只能作为兜底

系统 SHALL 将缩放和平移视为移动端兜底能力，而不是主要适配手段。关键操作必须在默认视图中可触达，不能依赖用户先手动缩放或拖拽后才能完成核心流程。

#### Scenario: 默认视图即可完成关键操作
- **GIVEN** 用户首次在手机横屏进入对局
- **WHEN** 用户尝试执行核心操作路径
- **THEN** 系统 MUST 让关键操作入口在默认视图中可达
- **AND** 缩放和平移仅作为额外查看复杂区域的补充能力

### Requirement: WebView 仅作为容器目标

系统 SHALL 将 App WebView 与其他壳容器视为同一 H5 运行时的分发目标，而不是独立的移动端 UI 实现。

#### Scenario: 浏览器和 App WebView 复用同一运行时
- **GIVEN** 某个游戏声明 `shellTargets` 包含 `app-webview`
- **WHEN** 该游戏在浏览器或 App WebView 中启动
- **THEN** 系统 MUST 复用同一 H5 运行时与同一移动适配框架
- **AND** 不得要求为 App WebView 再维护一套独立游戏前端
