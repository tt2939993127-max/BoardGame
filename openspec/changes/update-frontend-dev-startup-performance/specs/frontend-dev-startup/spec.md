## ADDED Requirements

### Requirement: 开发启动必须复用隔离的依赖缓存
系统 SHALL 复用同一工作目录和端口对应的 Vite 依赖预构建缓存；只有开发者显式设置缓存清理开关时才删除该缓存。

#### Scenario: 同端口重复启动
- **WHEN** 开发者在同一工作目录和端口重复启动前端
- **THEN** 启动包装器保留该端口的依赖预构建缓存
- **AND** 不与其他端口或工作目录共享缓存目录

#### Scenario: 显式清理缓存
- **WHEN** 开发者设置 `BG_VITE_CLEAN_DEPS_ON_START=1`
- **THEN** 启动包装器在启动前删除当前端口的依赖预构建缓存

### Requirement: 桌面首屏不得预加载原生移动模块
系统 SHALL 仅在检测到 Android 或 iOS 原生壳时加载原生更新、原生游戏包和原生插件模块；桌面首屏不得因这些模块产生请求或转换。

#### Scenario: 桌面浏览器访问首页
- **WHEN** 桌面浏览器首次访问首页
- **THEN** Capacitor、Capgo 和原生游戏包模块不进入首屏请求图

#### Scenario: 原生移动壳启动
- **WHEN** Android 或 iOS 原生壳启动应用
- **THEN** 系统检测原生桥并加载移动更新与已安装游戏包初始化

### Requirement: 开发服务器不得预热宽入口模块图
系统 SHALL 不在启动期预转换会展开桌面完整静态模块图的入口模块，以免预热阻塞开发服务器的 HTTP 就绪。

#### Scenario: 开发服务启动
- **WHEN** Vite 开发服务完成启动
- **THEN** 服务可以在不等待完整桌面模块图转换的情况下响应 HTTP 请求
- **AND** 入口模块按真实访问按需转换

### Requirement: 开发与 E2E 必须复用稳定依赖预构建清单
系统 SHALL 为开发和 E2E 使用同一份明确的依赖预构建清单，并关闭宽入口模块图的自动依赖发现。

#### Scenario: 空缓存首次访问
- **WHEN** 开发服务在没有现成依赖缓存时首次收到桌面页面请求
- **THEN** Vite 只预构建稳定清单中的依赖
- **AND** 不为发现依赖而爬取完整源码图

### Requirement: 关闭 HMR 必须停止轮询 watcher
系统 SHALL 在 `BG_DEV_DISABLE_HMR=1` 或 `BG_DEV_DISABLE_HOT_RELOAD=1` 时同时关闭 Vite 的文件 watcher。

#### Scenario: 默认开发命令关闭 HMR
- **WHEN** 开发命令设置 `BG_DEV_DISABLE_HMR=1`
- **THEN** Vite 不启动轮询 watcher
- **AND** HTTP 请求不因无效工作目录扫描被阻塞

### Requirement: 桌面首页不得空闲预取原生详情模块
系统 SHALL 只在原生移动壳中空闲预取含游戏包或 OTA 功能的详情模块；桌面版本页脚不得静态加载 OTA 实现。

#### Scenario: 桌面用户停留在首页
- **WHEN** 桌面浏览器在首页完成空闲期
- **THEN** 游戏详情弹窗的原生游戏包模块和 OTA 模块不进入请求图
- **AND** 用户点击详情入口时仍可按需加载详情弹窗

### Requirement: 非首页路由不得同步转换首页目录
系统 SHALL 通过路由级按需加载首页入口；加载期间必须提供可见的首页加载状态。

#### Scenario: 直接打开小黑屋配置表
- **WHEN** 桌面用户直接访问小黑屋配置表路由
- **THEN** 应用不请求首页目录模块
- **AND** 配置表独立完成渲染

### Requirement: 配置表必须使用独立且共享定义的运行入口
系统 SHALL 让直接访问的配置表仅加载配置表实际所需的应用壳，并让轻量入口与完整应用消费同一份路径和页面映射。

#### Scenario: 直接打开小黑屋配置表
- **WHEN** 桌面用户直接访问小黑屋配置表路由
- **THEN** 应用不初始化大厅、社交、教程、测试工具或移动全局层
- **AND** 路由与页面组件来自与完整应用相同的共享定义

### Requirement: 全局样式检测不得扫描非运行时工作区
系统 SHALL 只让 Tailwind 扫描 `src` 运行时源码，不得在首次 CSS 转换时自动扫描临时证据、文档或其它工作区目录。

#### Scenario: 冷启动转换全局样式
- **WHEN** Vite 首次请求全局样式入口
- **THEN** Tailwind 仅从 `src` 收集 utility 类
- **AND** 不依赖工作区自动扫描来生成运行时样式
