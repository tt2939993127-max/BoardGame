# 游戏邀请接口

> 通过消息系统发送游戏邀请。

## 1. 发送游戏邀请

**POST** `/auth/invites/send`

### 请求头
```
Authorization: Bearer <token>
```

### 请求体
```json
{
  "toUserId": "好友ID",
  "matchId": "对局ID",
  "gameName": "tictactoe"
}
```

### 成功响应（201）
```json
{
  "message": "邀请已发送",
  "invite": {
    "id": "消息ID",
    "toUser": {
      "id": "用户ID",
      "username": "玩家名"
    },
    "matchId": "对局ID",
    "gameName": "tictactoe"
  }
}
```

### 常见错误
- 400 参数错误
- 401 未登录
- 403 非好友不可邀请
- 404 用户不存在
