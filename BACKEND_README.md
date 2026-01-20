# 桌游平台 - 后端说明

## 快速开始

### 1. 启动 MongoDB（使用 Docker）

```bash
# 启动 MongoDB 容器
docker-compose up -d mongodb

# 检查容器状态
docker-compose ps
```

### 2. 启动服务器

打开 **3 个终端**，分别运行：

```bash
# 终端 1: 前端开发服务器（端口 5174）
npm run dev

# 终端 2: API 服务器（端口 8001）
npm run dev:api

# 终端 3: 游戏服务器（端口 8000）
npm run dev:game
```

## 服务说明

| 服务 | 端口 | 说明 |
|------|------|------|
| 前端 | 5174 | Vite 开发服务器 |
| API | 8001 | 用户认证 API（注册/登录） |
| 游戏 | 8000 | Boardgame.io 游戏服务器 |
| MongoDB | 27017 | 数据库 |

## API 端点

### 认证接口（http://localhost:8001/auth）

- `POST /auth/register` - 注册新用户
  ```json
  {
    "username": "user123",
    "password": "password123"
  }
  ```

- `POST /auth/login` - 用户登录
  ```json
  {
    "username": "user123",
    "password": "password123"
  }
  ```

- `GET /auth/me` - 获取当前用户信息
  ```
  Authorization: Bearer <token>
  ```

## 测试认证

使用 PowerShell 测试 API：

```powershell
# 注册
$body = @{
    username = "testuser"
    password = "test123456"
} | ConvertTo-Json

Invoke-WebRequest -Uri "http://localhost:8001/auth/register" -Method POST -Body $body -ContentType "application/json"

# 登录
Invoke-WebRequest -Uri "http://localhost:8001/auth/login" -Method POST -Body $body -ContentType "application/json"
```

## 数据库管理

```bash
# 进入 MongoDB 容器
docker exec -it boardgame-mongodb mongosh

# 查看数据库
use boardgame
db.users.find()

# 停止并删除容器
docker-compose down

# 停止并删除容器+数据
docker-compose down -v
```

## 前端功能

1. 访问 `http://localhost:5174`
2. 点击右上角"注册"按钮
3. 创建账户并登录
4. 登录后可以看到用户名显示在右上角

## 故障排查

### MongoDB 连接失败

确保 Docker Desktop正在运行，并且 MongoDB 容器已启动：

```bash
docker ps
```

### API 服务器 404

确保 API 服务器正在运行：

```bash
# 检查进程
Get-Process | Where-Object {$_.ProcessName -like "*node*"}

# 检查端口
netstat -ano | findstr :8001
```

### CORS 错误

API 服务器已配置允许所有来源（开发环境）。如果仍有问题，检查浏览器控制台。

## 下一步

- [ ] 实现游戏记录保存（MongoDB Storage Adapter）
- [ ] 实现历史记录查看页面
- [ ] 实现对局回放功能
- [ ] 集成 Boardgame.io Lobby API 到现有 UI
