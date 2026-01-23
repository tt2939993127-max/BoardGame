# 部署与运行（同域）

本项目默认采用**同域访问**，避免 CORS 与 WebSocket 跨域问题。

## 入口地址

- **开发**：`http://localhost:5173`
- **Docker 一键部署**：`http://localhost:18080`

## 同域策略

- **开发（Vite 代理）**：
  - 入口：`vite.config.ts`
  - 前端使用同源地址访问：`src/config/server.ts`
  - 代理路径：`/games`、`/default`、`/lobby-socket`、`/auth`

- **生产/容器（Nginx 反代）**：
  - 入口：`docker/nginx.conf`
  - 编排：`docker-compose.yml`
  - 对外仅暴露 `web`，其余服务建议只在容器网络内通信

## 关键配置

- **端口**：前端开发 `5173`；游戏服务 `18000`；认证服务 `18001`；MongoDB `27017`
- **CORS/Origin 白名单**：`WEB_ORIGINS`（Docker 默认 `http://localhost:18080`）
- **环境变量示例**：`.env.example`

## 常见问题

- **端口占用**：优先只改 `docker-compose.yml` 中 `web` 的端口映射，并同步 `WEB_ORIGINS`
- **WebSocket 不通**：检查 `docker/nginx.conf` 的 Upgrade/Connection 头，以及访问路径是否以 `/default/`、`/lobby-socket/` 开头
