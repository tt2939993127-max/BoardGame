## ADDED Requirements
### Requirement: Access/Refresh Token 签发
系统 SHALL 在注册/登录成功后返回短期 Access Token，并通过 httpOnly Cookie 下发 Refresh Token。

#### Scenario: 登录成功签发双令牌
- **WHEN** 用户提交有效账号密码并登录成功
- **THEN** 响应体包含 Access Token 与用户信息
- **AND** 响应头下发 Refresh Token Cookie

#### Scenario: 注册成功签发双令牌
- **WHEN** 用户注册成功
- **THEN** 响应体包含 Access Token 与用户信息
- **AND** 响应头下发 Refresh Token Cookie

### Requirement: Refresh Token 续签
系统 SHALL 提供 `/auth/refresh` 接口，用 Refresh Token 换取新的 Access Token，并进行 Refresh 轮换。

#### Scenario: Refresh 成功续签
- **WHEN** 客户端携带有效 Refresh Token 调用 `/auth/refresh`
- **THEN** 服务端返回新的 Access Token
- **AND** 下发新的 Refresh Token Cookie

#### Scenario: Refresh 复用被拒绝
- **WHEN** 客户端使用已轮换失效的 Refresh Token 调用 `/auth/refresh`
- **THEN** 服务端返回 401
- **AND** 撤销该用户关联的 Refresh Token

### Requirement: Refresh Token 撤销
系统 SHALL 支持在登出时撤销 Refresh Token，并防止其继续续签。

#### Scenario: 登出撤销 Refresh
- **WHEN** 用户调用 `/auth/logout`
- **THEN** 服务端撤销当前 Refresh Token
- **AND** 后续 refresh 请求被拒绝
