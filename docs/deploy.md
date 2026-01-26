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

- **生产/容器（NestJS 单体）**：
  - 入口：`apps/api/src/main.ts`（静态托管 + 反向代理）
  - 编排：`docker-compose.yml`（`web` 服务）
  - 对外仅暴露 `web`（单体），`game-server` 仅容器网络内通信

## 资源 /assets 与对象存储映射（官方）

- **开发**：直接使用 `public/assets`（不配置 R2 也能跑通）。
- **生产**：`/assets/*` 反代到对象存储（如 Cloudflare R2）。
- **对象存储 key 前缀**：`official/<gameId>/...`
  - 路径对应：`/assets/<gameId>/...` ⇄ `official/<gameId>/...`
- **可选独立资源域名**：前端可配置 `VITE_ASSETS_BASE_URL`（默认 `/assets`）。

## 资源发布流程（官方）

1. 准备/更新 `public/assets/<gameId>/...` 资源。
2. 生成清单：`npm run assets:manifest`（输出 `assets-manifest.json`）。
3. 校验清单：`npm run assets:validate`（缺文件/变体不一致会报错）。
4. 上传资源与清单到对象存储（路径 `official/<gameId>/...`）。

## UGC 资源前缀预留（未实现）

- **正式**：`ugc/<userId>/<packageId>/...`
- **审核 staging**：`staging/ugc/<userId>/<packageId>/...`

## 关键配置

- **端口**：前端开发 `5173`；游戏服务 `18000`；API 单体 `80`（容器内）；MongoDB `27017`
- **CORS/Origin 白名单**：`WEB_ORIGINS`（Docker 默认 `http://localhost:18080`）
- **环境变量示例**：`.env.example`

## 单体代理说明

- **/games、/default、/lobby-socket、/socket.io** 由 NestJS 反向代理到 game-server
- 代理目标由 `GAME_SERVER_PROXY_TARGET` 指定（Docker 内部默认 `http://game-server:18000`）

## 常见问题

- **端口占用**：优先只改 `docker-compose.yml` 中 `web` 的端口映射，并同步 `WEB_ORIGINS`
- **WebSocket 不通**：检查 `docker/nginx.conf` 的 Upgrade/Connection 头，以及访问路径是否以 `/default/`、`/lobby-socket/` 开头
