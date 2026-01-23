# 桌游教学与多人联机平台

> AI 驱动的现代化桌游平台，专注于**桌游教学**与**轻量级联机对战**

[![React](https://img.shields.io/badge/React-19-61DAFB?logo=react)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.9-3178C6?logo=typescript)](https://www.typescriptlang.org/)
[![Boardgame.io](https://img.shields.io/badge/Boardgame.io-0.50-FF6B6B)](https://boardgame.io/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-4.1-06B6D4?logo=tailwindcss)](https://tailwindcss.com/)

---

## 入口

- **部署与运行（同域）**：[docs/deploy.md](docs/deploy.md)
- **后端说明**：[docs/framework/backend.md](docs/framework/backend.md)
- **测试模式（调试面板）**：[docs/test-mode.md](docs/test-mode.md)
- **工具脚本**：[docs/tools.md](docs/tools.md)

## 运行方式（同域，无跨域）

- **开发**：运行 `npm run dev`，访问 `http://localhost:5173`
- **Docker 一键部署**：运行 `docker compose up --build`，访问 `http://localhost:18080`

## 游戏与工具

权威清单：[src/games/manifest.ts](src/games/manifest.ts)

- **游戏**：`tictactoe`、`dicethrone`
- **工具**：`assetslicer`（入口 `/dev/slicer`）

## 约定

- **联机路由**：`/play/:gameId/match/:matchId`
- **同域策略**：开发用 Vite 代理，生产/容器用 Nginx 反代（详见 [docs/deploy.md](docs/deploy.md)）
- **环境变量**：参考 `.env.example`（端口、JWT、邮件等）

---

## 许可证

MIT License 2026
