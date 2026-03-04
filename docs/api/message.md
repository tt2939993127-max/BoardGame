# 消息接口

> 负责私聊消息、会话列表与已读标记。

## 1. 获取会话列表

**GET** `/auth/messages/conversations`

### 请求头
```
Authorization: Bearer <token>
```

### 成功响应（200）
```json
{
  "conversations": [
    {
      "user": {
        "id": "用户ID",
        "username": "玩家名"
      },
      "lastMessage": {
        "id": "消息ID",
        "content": "最近一条消息",
        "type": "text",
        "inviteData": null,
        "createdAt": "2026-01-01T00:00:00.000Z",
        "fromSelf": false
      },
      "unread": 2
    }
  ]
}
```

### 常见错误
- 401 未登录

---

## 2. 获取与某用户的消息历史

**GET** `/auth/messages/:userId?page=1&limit=50`

### 请求头
```
Authorization: Bearer <token>
```

### 成功响应（200）
```json
{
  "targetUser": {
    "id": "用户ID",
    "username": "玩家名"
  },
  "messages": [
    {
      "id": "消息ID",
      "from": "发送方ID",
      "to": "接收方ID",
      "content": "消息内容",
      "type": "text",
      "inviteData": null,
      "createdAt": "2026-01-01T00:00:00.000Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 50,
    "total": 100
  }
}
```

### 常见错误
- 401 未登录
- 403 非好友不可访问
- 404 用户不存在

---

## 3. 发送消息

**POST** `/auth/messages/send`

### 请求头
```
Authorization: Bearer <token>
```

### 请求体
```json
{
  "toUserId": "目标用户ID",
  "content": "你好"
}
```

### 成功响应（201）
```json
{
  "message": "消息已发送",
  "messageData": {
    "id": "消息ID",
    "toUser": {
      "id": "用户ID",
      "username": "玩家名"
    }
  }
}
```

### 常见错误
- 400 参数错误
- 401 未登录
- 403 非好友不可发送
- 404 用户不存在

---

## 4. 标记已读

**POST** `/auth/messages/read/:userId`

### 请求头
```
Authorization: Bearer <token>
```

### 成功响应（200）
```json
{
  "message": "已标记为已读",
  "updated": 3
}
```

### 常见错误
- 401 未登录
- 403 非好友不可操作
- 404 用户不存在
