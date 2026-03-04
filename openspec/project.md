# Project Context

## Purpose
开发一个 AI 驱动的现代化桌游平台，核心解决“桌游教学”与“轻量级联机”需求，并支持 UGC 制作简单原型。支持从规则文档自动生成游戏逻辑，并兼容主流桌游模拟器 (TTS) 的美术资源。

## Tech Stack
- **Frontend**: React 19 (Vite 7, TypeScript), Tailwind CSS 4
- **Game Engine**: 自研引擎（DomainCore + Pipeline + Systems 架构）
- **Realtime**: Socket.io（GameTransportServer 游戏状态同步 + Lobby/Match 实时通信）
- **Backend**: Node.js (Koa 游戏服务 + NestJS 认证/社交), MongoDB
- **Infrastructure**: Docker / Docker Compose

## Project Conventions

### Code Style
- Functional Components + Hooks
- TypeScript Strong Typing (avoid `any`)
- Tailwind CSS Utility Classes
- Chinese UI/Comments as primary language

### Architecture Patterns
- **Game Logic**: Pure functions (DomainCore: setup/validate/execute/reduce/playerView) + Pipeline 执行管线
- **UI Components**: Atomic Design, localized game boards in `src/games/<game>/`
- **State Sync**: WebSocket (Socket.io) for multiplayer, GameTransportServer/Client 架构

### Testing Strategy
- Vitest（游戏/接口）与 Playwright（E2E）
- GameTestRunner（游戏领域层测试）
- Manual UI verification
- ESLint for static analysis

### Git Workflow
- Feature branches (e.g., `feature/tutorial-system`)
- Squash commits for clean history
- Conventional Commits (feat, fix, docs, etc.)

## Domain Context
- **MatchState<TCore>**: 游戏状态，包含 `core`（领域状态）和 `sys`（系统状态）。
- **DomainCore**: 游戏领域内核接口（setup/validate/execute/reduce/playerView/isGameOver）。
- **Command**: 玩家操作指令（type + playerId + payload）。
- **GameEvent**: 领域事件（type + payload），由 execute 产生，由 reduce 消费。
- **Pipeline**: 执行管线，串联 validate → execute → reduce → systems。

## Important Constraints
- UI must be responsive (Desktop/Tablet).
- All games must support both local and online multiplayer.
- Tutorial system must be generic enough to support different game types.
- Support lightweight UGC prototypes with minimal setup.

## External Dependencies
- React / ReactDOM
- Tailwind CSS
- Vite
- Socket.io
- framer-motion
