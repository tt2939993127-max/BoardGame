## ADDED Requirements

### Requirement: UGC 运行时入口（最终游戏）
系统 SHALL 提供 UGC 最终运行时入口以按 packageId 进入游戏并加载已发布内容。

#### Scenario: 打开运行时入口
- **WHEN** 用户从主页/分类点击某个 UGC 游戏
- **THEN** 系统 MUST 通过 packageId 拉取已发布包并进入运行时渲染

### Requirement: 包来源与发布校验
系统 SHALL 仅允许加载服务器已发布的 UGC 包，未发布或不存在时必须拒绝进入。

#### Scenario: 包未发布
- **WHEN** 用户请求未发布或不存在的 packageId
- **THEN** 系统 MUST 返回错误并阻止进入运行时

### Requirement: 宿主桥接与 iframe 挂载
系统 SHALL 使用 iframe 承载 UGC 视图，并通过 UGCHostBridge/UGCViewSdk 建立通信与生命周期管理。

#### Scenario: 进入与退出
- **WHEN** 用户进入 UGC 运行时
- **THEN** 宿主 MUST 创建 iframe 并绑定宿主桥接；离开时 MUST 调用视图卸载并销毁桥接

### Requirement: 运行时音频与资源路径
系统 SHALL 在宿主侧处理 SFX/BGM 请求并使用 `/assets/*` 资源路径归一化规则加载资源。

#### Scenario: 视图请求播放音效
- **WHEN** 视图通过 SDK 发送 PLAY_SFX 请求
- **THEN** 宿主 MUST 解析资源路径并播放对应音效

### Requirement: 本地预览限定
系统 SHALL 仅在 Builder 预览场景允许使用本地数据，运行时入口不得直接读取本地包。

#### Scenario: Builder 预览
- **WHEN** 用户在 Builder 中预览
- **THEN** 系统 MAY 使用本地数据渲染

#### Scenario: 运行时入口
- **WHEN** 用户进入运行时入口
- **THEN** 系统 MUST 仅使用服务器已发布包
