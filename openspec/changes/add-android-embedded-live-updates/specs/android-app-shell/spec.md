## MODIFIED Requirements

### Requirement: Android 壳必须支持显式加载模式

系统 SHALL 为 Android App 壳提供显式的 H5 加载模式配置，至少支持 `embedded` 与 `remote` 两种模式，并由单一配置源控制当前构建使用哪一种模式。其中 `embedded` MUST 作为默认发布模式；`remote` MUST 仅作为兼容、调试或短期灰度路径保留。

#### Scenario: 使用 embedded 模式构建 Android 壳
- **GIVEN** Android 壳配置为 `embedded`
- **WHEN** 开发者执行 Android 正式构建
- **THEN** 系统 MUST 让 WebView 加载 APK 内嵌的 H5 资源
- **AND** 不得要求开发者手动修改 Capacitor 原生配置文件来切换模式

#### Scenario: 使用 remote 模式构建 Android 壳
- **GIVEN** Android 壳配置为 `remote`
- **WHEN** 开发者执行 Android 正式构建
- **THEN** 系统 MUST 让 WebView 直接加载配置的远程 H5 入口
- **AND** 不得再依赖 APK 内嵌资源作为当前版本页面来源

#### Scenario: Android 默认发布模式为 embedded
- **GIVEN** 开发者未显式设置 Android WebView 模式
- **WHEN** 开发者执行 Android 构建
- **THEN** 系统 MUST 默认按 `embedded` 模式构建
- **AND** 不得默认落到 `remote` 纯壳路径
