## ADDED Requirements

### Requirement: 同域 /assets 资源路由
系统 SHALL 通过同域路径 `/assets/*` 提供运行时资源访问入口，并允许该路径在部署层被映射/反代到对象存储（例如 Cloudflare R2）。

#### Scenario: 资源以同域路径访问
- **WHEN** 前端请求任意资源（图片/音频/atlas json）
- **THEN** 资源 URL MUST 以 `/assets/` 作为路径前缀

#### Scenario: 部署层反代到对象存储
- **WHEN** 生产环境启用对象存储作为资源后端
- **THEN** `/assets/*` MUST 可被部署层反代到对象存储并保持路径结构一致

### Requirement: 资源路径归一化
系统 SHALL 提供统一的路径归一化规则，将非穿透源（非 `http(s)://`、`data:`、`blob:`）的资源路径规范化为 `/assets/<relative>`。

#### Scenario: 相对资源路径归一化
- **WHEN** 代码传入 `dicethrone/images/monk/compressed/dice-sprite`
- **THEN** 系统 MUST 输出 `/assets/dicethrone/images/monk/compressed/dice-sprite`

#### Scenario: 绝对 /assets 路径保持幂等
- **WHEN** 代码传入 `/assets/dicethrone/images/monk/compressed/dice-sprite`
- **THEN** 系统 MUST 返回同一值而不重复拼接

#### Scenario: 穿透源不改写
- **WHEN** 代码传入 `https://example.com/a.webp` 或 `data:image/png;base64,...`
- **THEN** 系统 MUST 原样返回该值

### Requirement: 可选独立资源域名（兼容）
系统 SHOULD 支持通过配置将资源基址切换为独立域名（例如 `https://assets.example.com`），但默认行为 MUST 保持同域 `/assets`。

#### Scenario: 默认保持 /assets
- **WHEN** 未配置独立域名
- **THEN** 资源 URL MUST 使用同域 `/assets/*`

#### Scenario: 配置独立域名
- **WHEN** 配置了独立资源域名基址
- **THEN** 系统 MUST 将资源解析为该域名下的 URL 且路径结构保持一致
