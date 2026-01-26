# 认证接口

> 负责注册、登录、JWT、邮箱验证、登出。

## 1. 注册

**POST** `/auth/register`

### 请求体
```json
{
  "username": "玩家名",
  "password": "密码"
}
```

### 成功响应（201）
```json
{
  "message": "注册成功",
  "user": {
    "id": "用户ID",
    "username": "玩家名"
  },
  "token": "JWT Token"
}
```

### 常见错误
- 400 用户名/密码缺失
- 400 用户名长度不合法
- 400 密码长度不足
- 409 用户名已存在

---

## 2. 登录

**POST** `/auth/login`

### 请求体
```json
{
  "username": "玩家名",
  "password": "密码"
}
```

### 成功响应（200）
```json
{
  "message": "登录成功",
  "user": {
    "id": "用户ID",
    "username": "玩家名"
  },
  "token": "JWT Token"
}
```

### 常见错误
- 400 用户名/密码缺失
- 401 用户名或密码错误

---

## 3. 获取当前用户

**GET** `/auth/me`

### 请求头
```
Authorization: Bearer <token>
```

### 成功响应（200）
```json
{
  "user": {
    "id": "用户ID",
    "username": "玩家名",
    "email": "user@example.com",
    "emailVerified": true,
    "createdAt": "2026-01-01T00:00:00.000Z"
  }
}
```

### 常见错误
- 401 未登录或 Token 无效
- 404 用户不存在

---

## 4. 发送邮箱验证码

**POST** `/auth/send-email-code`

### 请求头
```
Authorization: Bearer <token>
```

### 请求体
```json
{
  "email": "user@example.com"
}
```

### 成功响应（200）
```json
{
  "message": "验证码已发送"
}
```

### 常见错误
- 400 缺少邮箱
- 400 邮箱格式错误
- 409 邮箱已被占用
- 401 未登录

---

## 5. 验证邮箱

**POST** `/auth/verify-email`

### 请求头
```
Authorization: Bearer <token>
```

### 请求体
```json
{
  "email": "user@example.com",
  "code": "123456"
}
```

### 成功响应（200）
```json
{
  "message": "邮箱绑定成功",
  "user": {
    "id": "用户ID",
    "username": "玩家名",
    "email": "user@example.com",
    "emailVerified": true
  }
}
```

### 常见错误
- 400 邮箱或验证码缺失
- 400 验证码错误或过期
- 401 未登录

---

## 6. 登出

**POST** `/auth/logout`

### 请求头
```
Authorization: Bearer <token>
```

### 成功响应（200）
```json
{
  "message": "退出登录成功"
}
```

### 说明
- 登出后 Token 会写入黑名单，直到过期为止。
