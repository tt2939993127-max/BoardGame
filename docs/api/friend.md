# 好友接口

> 负责好友请求、好友列表与在线状态。

## 1. 获取好友列表

**GET** `/auth/friends`

### 请求头
```
Authorization: Bearer <token>
```

### 成功响应（200）
```json
{
  "friends": [
    {
      "id": "用户ID",
      "username": "玩家名",
      "online": true
    }
  ]
}
```

### 常见错误
- 401 未登录

---

## 2. 获取待处理好友请求

**GET** `/auth/friends/requests`

### 请求头
```
Authorization: Bearer <token>
```

### 成功响应（200）
```json
{
  "requests": [
    {
      "id": "请求ID",
      "fromUser": {
        "id": "用户ID",
        "username": "玩家名"
      }
    }
  ]
}
```

### 常见错误
- 401 未登录

---

## 3. 搜索用户

**GET** `/auth/friends/search?q=关键词`

### 请求头
```
Authorization: Bearer <token>
```

### 成功响应（200）
```json
{
  "users": [
    {
      "id": "用户ID",
      "username": "玩家名",
      "status": "none"
    }
  ]
}
```

### 状态说明
- `none`: 无关系
- `pending`: 已发送请求
- `incoming`: 对方已发送请求
- `accepted`: 已是好友

### 常见错误
- 400 缺少关键词
- 401 未登录

---

## 4. 发送好友请求

**POST** `/auth/friends/request`

### 请求头
```
Authorization: Bearer <token>
```

### 请求体
```json
{
  "userId": "目标用户ID"
}
```

### 成功响应（201）
```json
{
  "message": "好友请求已发送",
  "request": {
    "id": "请求ID",
    "toUser": {
      "id": "用户ID",
      "username": "玩家名"
    }
  }
}
```

### 常见错误
- 400 参数缺失/不能添加自己
- 401 未登录
- 404 用户不存在
- 409 已是好友或请求已存在

---

## 5. 接受好友请求

**POST** `/auth/friends/accept/:id`

### 请求头
```
Authorization: Bearer <token>
```

### 成功响应（200）
```json
{
  "message": "已接受好友请求",
  "friend": {
    "id": "用户ID",
    "username": "玩家名"
  }
}
```

### 常见错误
- 401 未登录
- 404 请求不存在

---

## 6. 拒绝好友请求

**POST** `/auth/friends/reject/:id`

### 请求头
```
Authorization: Bearer <token>
```

### 成功响应（200）
```json
{
  "message": "已拒绝好友请求",
  "friend": {
    "id": "用户ID",
    "username": "玩家名"
  }
}
```

### 常见错误
- 401 未登录
- 404 请求不存在

---

## 7. 删除好友

**DELETE** `/auth/friends/:id`

### 请求头
```
Authorization: Bearer <token>
```

### 成功响应（200）
```json
{
  "message": "好友已删除"
}
```

### 常见错误
- 401 未登录
- 404 好友关系不存在
