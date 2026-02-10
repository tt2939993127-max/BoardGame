# 桌游教学与多人联机平台


[![React](https://img.shields.io/badge/React-19-61DAFB?logo=react)](https://react.dev/) [![TypeScript](https://img.shields.io/badge/TypeScript-5.9-3178C6?logo=typescript)](https://www.typescriptlang.org/) [![Boardgame.io](https://img.shields.io/badge/Boardgame.io-0.50-FF6B6B)](https://boardgame.io/) [![Tailwind CSS](https://img.shields.io/badge/Tailwind-4.1-06B6D4?logo=tailwindcss)](https://tailwindcss.com/) [![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

AI 驱动的现代化桌游平台，专注于**桌游教学**与**联机对战**

支持多人实时对战、本地同屏、交互式教学，提供完整的大厅、社交、创作工具与管理后台。

> **在线体验**：[easyboardgame.top](https://easyboardgame.top)

<details>
<summary>作者的话</summary>

整个项目几乎只有这里不是 AI 生成的

事情的起因只是想让不想阅读说明书的朋友能够快速入坑桌游，加上看到谷歌反重力能够自动化测试，便想着如果代价足够低，没有比直接做成游戏更好的教学方式了

于是乎开始市场调研，BGA 和其他桌游电子化平台主要覆盖的都是德式游戏，还是有一定缺口，也就意味着这件事有实现的价值

然后就是半个多月从早到晚猛蹬 AI，反重力的自动化测试确实惊艳，但也仅限于静态网页，一旦到游戏就很难覆盖，最终还是高估了 AI（笑）。所幸框架搭建完成后，简单的游戏比如大杀四方只花了三天就搞定了，如果不并行的话也许只要一天，可惜离我预期的挂机就能出游戏还有些差距

期间 AI 桌游引擎的尝试算是彻底失败了，本来想着只要分层分模块将游戏的需求拆解，让 AI 达到百分百的正确率就能实现自然语言编程，结果还是不如直接生成代码方便。还是新出现的 Project Genie 和 TapTap 制造比较好，一步到位，如果未来真的有元宇宙，那么人人都能创造游戏可能就是其中的基石

废话到此为止吧，现在我得忙活自己的游戏和找工作的事情，暂时只能进行维护工作

最后是未来规划要做的游戏，如果真的有人在玩的话……（不会考虑已经存在的电子版）：
+ 召唤师战争六个新阵营+雇佣兵阵营（优先级中）
+ 法师战争（优先级中）
+ 石器时代（优先级低，至少还是要一个德式）

</details>

## ✨ 特性

- **多人实时对战** — 基于 boardgame.io + Socket.IO，功能有房间创建/加入/观战/重赛/日志/撤回
- **丰富的游戏库** — 召唤之战 (Summoner Wars)、王权骰铸 (Dice Throne)、Smash Up、井字棋等
- **本地同屏模式** — 同一设备上和朋友面对面对战
- **交互式教程** — 内置 Tutorial 引擎，支持 AI 自动演示和分步引导
- **社交系统** — 好友、聊天、对局邀请、战绩查看
- **~~简易原型工具（搁置）~~** — 可视化游戏原型构建器，快速验证规则想法
- **游戏工具** — 预览特效与音频，快速切图等
- **国际化 (i18n)** — 中英双语支持
- **管理后台** — 用户管理、房间监控、反馈处理、系统健康检查
- **Docker 一键部署** — 同域 / Cloudflare Pages 分离部署均可

## 🏗️ 技术栈
<details>
<summary>为什么选择前端</summary>

一者是最适宜 AI，能全自动完成和测试；二者是在不追求华丽表现的情况下游戏引擎对于桌游这类规则独特的游戏帮助不是很大；三者是完全不需要美术素材

</details>

**前端**：React 19 · TypeScript · Vite · Tailwind CSS · Framer Motion · Three.js · React Router · TanStack Query · i18next

**后端**：boardgame.io (Koa) · NestJS · MongoDB · Redis · Socket.IO

**基础设施**：Docker · Docker Compose · GitHub Actions CI/CD · Cloudflare Pages / R2

## 📦 项目结构

```
├── src/
│   ├── games/           # 游戏实现（每个游戏一个目录）
│   ├── engine/          # 引擎层（Undo / Flow / Prompt / Tutorial 等系统）
│   ├── components/      # UI 组件（大厅 / 对局 / 社交 / 管理后台）
│   ├── contexts/        # React Context（Auth / Audio / Social / Modal 等）
│   ├── services/        # Socket 服务（lobby / match / social）
│   ├── ugc/             # 简易原型构建工具与运行时
│   └── server/          # 服务端共享模块（DB / 存储 / 模型）
├── apps/api/            # NestJS API 服务（认证 / 管理 / 社交）
├── server.ts            # boardgame.io 游戏服务器入口
├── docker/              # Dockerfile 与 Nginx 配置
├── scripts/             # 构建 / 部署 / 资源处理脚本
├── docs/                # 项目文档
└── e2e/                 # Playwright 端到端测试
```

## 🚀 快速开始

### 前置要求

- [Node.js](https://nodejs.org/) >= 18
- [Git](https://git-scm.com/)
- [Docker](https://www.docker.com/)（可选，用于 MongoDB）

### 安装与启动

```bash
# 克隆仓库
git clone https://github.com/zhuanggenhua/BoardGame.git
cd BoardGame

# 安装依赖
npm install

# 复制环境变量模板
cp .env.example .env
```

> **Windows 用户**：将 `cp` 替换为 `copy`。

#### 方式一：使用 Docker（推荐，数据持久化）

```bash
npm run dev
```

#### 方式二：无 Docker（纯内存模式，适合快速体验）

无需安装 Docker 和 MongoDB，对局数据存在内存中，重启后丢失。

```bash
npm run dev:lite
```

启动后访问 http://localhost:5173 即可。

### 环境变量

开发环境只需复制 `.env.example` 即可运行，无需额外配置。核心变量：

| 变量 | 默认值 | 说明 |
|------|--------|------|
| `VITE_DEV_PORT` | `5173` | 前端开发端口 |
| `GAME_SERVER_PORT` | `18000` | 游戏服务端口 |
| `API_SERVER_PORT` | `18001` | API 服务端口 |
| `MONGO_URI` | `mongodb://localhost:27017/boardgame` | 数据库连接 |
| `JWT_SECRET` | 开发默认值 | JWT 密钥（生产环境必须修改） |

完整说明见 [.env.example](.env.example)。

## 🎮 添加新游戏

项目内置了完整的 AI 辅助创建工作流，分 6 个阶段逐步完成（骨架 → 类型 → 领域逻辑 → 系统组装 → UI → 收尾）。

使用支持 Skill 的 AI 编辑器（或者直接扔文档），调用 `.windsurf/skills/create-new-game` 技能即可开始，AI 会引导你完成全部流程……大概。

可以开新分支提pr，我会用ai审核

<details>
<summary>模型选择建议</summary>

如果把编程比作建造高楼，那么 GPT 是坚实的地基和每层的承重柱，Claude 是建筑的设计师并能快速添砖加瓦，Gemini 就是最后的装修

- **GPT**：最听话最稳定，排查 bug 和审查代码的首选，就是太过啰嗦导致规划任务比较耗人脑，写的代码也不够整洁，慢是最大的缺点
- **Claude**：规划任务和进行决策都很出色，体感代码质量最好，但容易没有充分阅读项目就开始动手，所以还是需要 GPT 审查兜底。似乎有更高的正确性（有点不好形容，但claude的决策是需要人工干预最少的，有些让gpt死循环的问题也能给出正确答案）
- **Gemini**：前端唯一真神，识图能力强于 Claude，很适合通过规则 PDF 和卡图来生成数据（大部分情况需要手动截图不然也不准），但干其他活容易改一个出一个bug

个人的省钱组合：windsurf 龟速版gpt + kiro 阉割版claude + 5天ed的反重力
也是三个臭皮匠顶个诸葛亮:)，不过现在性价比最高的方案应该变成warp了
</details>


## 🐳 Docker 部署

### 本地验证

```bash
docker compose up -d
# 访问 http://localhost:3000
```

### 生产部署（推荐镜像部署）

服务器上只需 Docker，无需克隆仓库。脚本会自动下载 compose 文件、引导配置环境变量、拉取镜像并启动：

```bash
# 下载部署脚本并执行（首次部署会进入交互式配置向导）
curl -fsSL https://raw.githubusercontent.com/zhuanggenhua/BoardGame/main/scripts/deploy/deploy-image.sh -o deploy.sh
bash deploy.sh

# 后续更新
bash deploy.sh update
```

> 前置要求：服务器已安装 Docker 和 Docker Compose（`docker compose` 命令可用）。

详细部署文档见 [docs/deploy.md](docs/deploy.md)。

## 🛠️ 常用命令

```bash
npm run dev              # 启动完整开发环境
npm run build            # 构建前端
npm run generate:manifests  # 重新生成游戏清单
npm run generate:locales    # 生成卡牌多语言文件
npm run compress:images     # 压缩图片资源
npm run assets:manifest     # 生成资源清单
npm run check:arch          # 架构检查
```

## 🧪 测试

- **Vitest 单元测试** — 游戏领域逻辑、引擎系统、API 服务等
- **GameTestRunner** — 游戏领域专用测试运行器，输入命令序列 → 执行 pipeline → 断言最终状态
- **Playwright E2E** — 端到端集成测试（需先启动服务）

```bash
npm test                 # 全量 Vitest
npm run test:game        # 游戏领域测试
npm run test:api         # API 测试
npm run test:e2e         # 端到端测试
```

详见 [自动化测试文档](docs/automated-testing.md)。

## 📄 文档

- [部署指南](docs/deploy.md) — 同域 / Pages 分离 / 镜像部署完整说明
- [前端框架](docs/framework/frontend.md) — 游戏 UI 框架与组件约定
- [后端框架](docs/framework/backend.md) — API 与游戏服务架构
- [API 文档](docs/api/README.md) — 认证、社交、管理等接口说明
- [原型构建器](docs/ugc-builder.md) — 简易游戏原型工具
- [自动化测试](docs/automated-testing.md) — 测试策略与实践

## 🤝 贡献

欢迎提交 Issue 和 Pull Request！

1. Fork 本仓库
2. 创建特性分支：`git checkout -b feature/amazing-feature`
3. 提交更改：`git commit -m 'Add amazing feature'`
4. 推送分支：`git push origin feature/amazing-feature`
5. 提交 Pull Request

## 📜 许可证

本项目代码基于 [MIT License](LICENSE) 开源。

游戏素材（图片、音效等）来自对应桌游的官方图包，版权归原作者所有，仅供学习交流使用，不可商用。