# Change: 引入 Refresh Token 无感续签

## Why
当前系统仅在注册/登录时签发 JWT，用户在 Token 失效或密钥轮换后必须重新登录，影响体验；且跨服务校验需要统一签名策略。为贴近商业项目实践，需要引入可轮换的 Refresh Token，以实现无感续签并强化撤销能力。

## What Changes
- 登录/注册响应改为返回短期 Access Token，并下发 httpOnly Refresh Token Cookie。
- 新增 `/auth/refresh`：使用 Refresh Token 轮换并签发新的 Access Token。
- 新增 Refresh Token 存储与撤销机制（Redis/DB，支持轮换与复用检测）。
- 前端在 Access Token 失效（401）时自动尝试刷新并重试一次请求。

## Impact
- Affected specs: `backend-platform`
- Affected code: `apps/api/src/modules/auth/*`, `apps/api/src/shared/guards/*`, `src/contexts/AuthContext.tsx`, 以及请求封装层
