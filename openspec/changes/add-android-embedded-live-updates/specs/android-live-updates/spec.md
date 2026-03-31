## ADDED Requirements

### Requirement: Android embedded 模式必须支持 OTA 更新 H5 bundle

系统 SHALL 在 Android `embedded` 模式下支持下载并激活新的 H5 bundle，而不要求重新发布 APK/AAB。

#### Scenario: 客户端激活新的 H5 bundle
- **GIVEN** Android App 当前使用 `embedded` 模式
- **AND** 服务端存在一个与当前二进制兼容的新 bundle
- **WHEN** 客户端完成 bundle 下载与校验
- **THEN** 系统 MUST 将该 bundle 标记为可激活版本
- **AND** 后续启动 MUST 能加载该新 bundle，而不是继续停留在 APK 内置 bundle

### Requirement: OTA bundle 必须经过完整性与兼容性校验

系统 SHALL 在激活 OTA bundle 之前校验 bundle 完整性、来源可信性与二进制兼容性。

#### Scenario: 不兼容 bundle 被拒绝
- **GIVEN** 服务端发布了一个 `minBinaryVersion` 高于当前 App 二进制版本的 bundle
- **WHEN** 客户端检查更新
- **THEN** 系统 MUST 不激活该 bundle
- **AND** MUST 保持当前已激活 bundle 或 APK 内置 bundle 继续运行

#### Scenario: bundle 校验失败被拒绝
- **GIVEN** 客户端下载的 bundle hash 或签名校验失败
- **WHEN** 系统准备激活该 bundle
- **THEN** 系统 MUST 拒绝激活
- **AND** MUST 记录错误原因供排查

### Requirement: OTA 激活失败必须自动回滚

系统 SHALL 在新 bundle 激活后发生启动失败或健康检查失败时，自动回滚到上一个可用 bundle 或 APK 内置 bundle。

#### Scenario: 新 bundle 启动失败
- **GIVEN** 客户端已将新 bundle 标记为当前激活版本
- **AND** 新 bundle 在启动阶段触发致命错误或未通过健康检查
- **WHEN** App 下次尝试进入主站
- **THEN** 系统 MUST 自动回滚到上一个成功版本
- **AND** 不得让用户永久卡在白屏或崩溃循环中

### Requirement: OTA 只覆盖 Web 内容，不覆盖原生二进制变更

系统 SHALL 明确区分可通过 OTA 下发的 Web 内容与必须重新发包的原生侧变更。

#### Scenario: 原生改动仍要求重新发包
- **GIVEN** 某次更新包含原生插件、权限、Manifest 或原生代码改动
- **WHEN** 发布者尝试仅通过 OTA 发布该变更
- **THEN** 系统 MUST 将其视为不受支持的更新类型
- **AND** 发布规范 MUST 明确要求重新发 APK/AAB

### Requirement: OTA 发布流水线必须支持自动化与正式门禁

系统 SHALL 提供自动化 OTA 发布流水线，并区分非生产自动发布与正式 channel 的受保护发布。

#### Scenario: main 自动发布到非生产 channel
- **GIVEN** 仓库已配置 OTA 自动发布工作流
- **AND** 开发者向 `main` 分支合入会影响 Android H5 bundle 的改动
- **WHEN** GitHub Actions 自动执行 OTA 发布
- **THEN** 系统 MUST 仅发布到非生产 channel
- **AND** 不得默认直接覆盖 `stable` 等正式 channel 的 `latest.json`

#### Scenario: stable 发布必须手动批准
- **GIVEN** 发布者要把 Android OTA 发布到 `stable`
- **WHEN** 发布者触发正式 OTA 工作流
- **THEN** 系统 MUST 要求显式指定正式 channel
- **AND** MUST 经过 GitHub Environment 或等价审批门禁后才能执行
