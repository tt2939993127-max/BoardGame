## Context

当前 Android App 已以 `embedded` 作为默认构建模式，Web bundle 会被同步到 APK 内部。这样能保证稳定性，但主页、大厅、房间与游戏 UI 的任何前端变更都需要重新打包发布。

根据 Capacitor 官方文档，长期更新 Web 内容的主流方向是 Live Update / Realtime Updates：保持原生二进制不变，按版本向客户端下发新的 Web bundle。官方文档同时明确，这类能力只适用于不需要二进制更新的变更。

## Goals / Non-Goals

- Goals:
  - 让 Android `embedded` 模式支持 OTA 更新 H5 bundle
  - 保持当前 `embedded` 作为默认发布方案
  - 对 bundle 更新提供完整性校验、兼容性门控和失败回滚
  - 让发布链路支持渠道、灰度和紧急回退
- Non-Goals:
  - 不尝试对原生层改动做“免发包”更新
  - 不把 `remote WebView` 继续作为长期主线
  - 不在本 change 中同时实现 iOS

## Decisions

- Decision: Android 主线保持 `embedded`，新增本地 bundle OTA 层
  - Rationale: 这样既保留内置首包稳定性，又能把后续 H5 变更从 APK 发版中剥离。

- Decision: OTA 只更新 Web bundle，不更新原生二进制
  - Rationale: 这是 Capacitor 官方文档支持的边界，也是应用商店友好的边界。

- Decision: OTA bundle 必须带有兼容性元数据
  - Required fields:
    - `bundleVersion`
    - `channel`
    - `minBinaryVersion`
    - `targetBinaryVersionRange` 或等价字段
    - `hash/signature`
    - `publishedAt`
  - Rationale: 必须防止新 bundle 被旧壳错误加载。

- Decision: OTA 激活采用“下载 -> 校验 -> 标记待激活 -> 下次启动生效”为默认策略
  - Rationale: 比“下载后立刻热切换页面”更稳，容易做回滚，也更符合桌游对局中断风险控制。

- Decision: 必须支持启动失败自动回滚到上一个可用 bundle 或 APK 内置 bundle
  - Rationale: 没有自动回滚的 OTA 不是可上线方案。

- Decision: `remote WebView` 降级为兼容/调试路径，不再承担长期产品更新职责
  - Rationale: 产品主线应收敛到一个 bundle 交付模型，避免线上 remote 站点和 embedded 首包长期双轨。

- Decision: OTA 发布链路分为“非生产自动 channel”和“正式手动 channel”
  - Rule:
    - `main` 分支的自动化发布只允许推送到非生产 channel（默认 `edge`）
    - `stable` 等正式 channel 必须通过手动触发工作流发布
    - 正式 channel 必须绑定 GitHub Environment 审批
  - Rationale: 既保留持续交付效率，又避免每次合入 `main` 都直接影响正式 App 用户。

## Alternatives Considered

- Alternative: 继续使用 `remote WebView` 作为主线
  - Rejected: 虽然更新快，但长期产品边界、离线兜底、版本回滚、首包一致性都更差。

- Alternative: 保持纯 `embedded`，所有前端变更继续发 APK
  - Rejected: 不能满足“主页本体不再常规依赖重新发包”的目标。

## Risks / Trade-offs

- OTA 会增加客户端状态复杂度：当前激活 bundle、待激活 bundle、回滚 bundle。
  - Mitigation: 使用单一 bundle registry 和明确的状态机。

- OTA 可能把不兼容 bundle 下发到旧壳。
  - Mitigation: 强制版本门控与签名/hash 校验。

- OTA 失败可能导致启动白屏。
  - Mitigation: 引入健康检查与自动回滚到上一个成功 bundle / 内置 bundle。

- 发布链路复杂度上升。
  - Mitigation: 把 bundle 打包、上传、发布、回滚做成单独命令和文档。

- 自动化发布如果直接面向正式 channel，误发风险很高。
  - Mitigation: 默认自动化只发 `edge`，`stable` 需要手动触发 + 环境审批。

## Migration Plan

1. 保持当前 `embedded` 默认模式不变
2. 接入 OTA runtime 与本地 bundle registry
3. 增加 bundle manifest 与发布流程
4. 先在 Android 灰度渠道验证 OTA 下载、激活、回滚
5. 验证稳定后，把“前端改动默认走 OTA”写入正式发布规范
6. 将 `remote` 标记为非主线兼容模式
7. 接入 GitHub Actions 自动发布到非生产 channel，并为正式 channel 增加审批门禁
