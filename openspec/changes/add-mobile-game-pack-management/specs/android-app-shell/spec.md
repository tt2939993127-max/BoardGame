## MODIFIED Requirements

### Requirement: Android 壳必须支持显式加载模式

系统 SHALL 为 Android App 壳提供显式的 H5 加载模式配置，至少支持 `embedded` 与 `remote` 两种模式，并由单一配置源控制当前构建使用哪一种模式。

#### Scenario: 使用 embedded 模式构建 Android 壳
- **GIVEN** Android 壳配置为 `embedded`
- **WHEN** 开发者执行 Android 正式构建
- **THEN** 系统 MUST 让 WebView 加载 APK 内嵌的 H5 资源
- **AND** 内嵌内容 MUST 至少包含基础壳、通用 runtime 与包管理入口
- **AND** 不得要求开发者手动修改 Capacitor 原生配置文件来切换模式

#### Scenario: 使用 remote 模式构建 Android 壳
- **GIVEN** Android 壳配置为 `remote`
- **WHEN** 开发者执行 Android 正式构建
- **THEN** 系统 MUST 让 WebView 直接加载配置的远程 HTTPS H5 入口
- **AND** 不得再依赖 APK 内嵌资源作为当前版本页面来源

### Requirement: embedded 模式必须支持按游戏分包的运行时架构
系统 SHALL 允许 Android `embedded` 模式以“基础壳 + runtime + 按游戏分包”架构运行，而不是默认要求所有游戏模块随 APK 一次性内置。

#### Scenario: embedded 模式未安装某游戏包
- **GIVEN** Android 壳运行在 `embedded` 模式
- **AND** 某个游戏被标记为 `package-managed`
- **AND** 当前设备尚未安装该游戏包
- **WHEN** 用户查看该游戏详情页或尝试进入该游戏
- **THEN** 系统 MUST 允许先停留在壳内基础页面
- **AND** MUST 通过包管理流程安装该游戏所需模块包与素材包
- **AND** 不得因为首包未内置该游戏代码而导致整个 App 无法启动

#### Scenario: embedded 模式更新通用 runtime
- **GIVEN** Android 壳运行在 `embedded` 模式
- **AND** 服务端发布了新的 runtime 版本
- **WHEN** 客户端执行运行时更新
- **THEN** 系统 MUST 支持仅更新通用 runtime
- **AND** 不得因此要求重新下载所有已安装游戏包
