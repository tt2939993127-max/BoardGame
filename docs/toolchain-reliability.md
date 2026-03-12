# 工具链可靠性规范

> 目标：核心后端开发启动既要稳定，也要足够快。

## 当前结论

对商业项目来说，关键后端的开发入口不应该长期依赖**运行时转译**。

本项目现在把后端开发启动分成三类：

1. **临时脚本 / 一次性命令**
   - 可以继续使用 `npx tsx ...`
   - 适合临时排查、短脚本
2. **普通 npm 脚本**
   - 可以直接调用项目本地二进制
   - 例如 `vite build`、`eslint .`
3. **核心后端开发入口**
   - 优先使用“预先 bundle + 运行产物 + watch 重建”
   - 不再把 `tsx` 运行时冷编译放到每次启动关键路径上

## 本项目采用的规则

### 1. 核心原则

**禁止依赖全局安装；核心后端开发入口优先使用 bundle runner，而不是直接运行 `tsx`。**

### 2. 当前标准实现

- `dev:api`
  - `node scripts/infra/dev-bundle-runner.mjs --label api --entry apps/api/src/main.ts --outfile temp/dev-bundles/api/main.mjs --tsconfig apps/api/tsconfig.json`
- `dev:game`
  - `node scripts/infra/dev-bundle-runner.mjs --label game --entry server.ts --outfile temp/dev-bundles/game/server.mjs --tsconfig tsconfig.server.json`
- `dev:game:nodemon`
  - `nodemon --config nodemon.json`
  - 仅作为备用调试入口，默认关键链路仍是 bundle runner
- `dev`
  - `node scripts/infra/dev-orchestrator.js`
  - 按 API → game-server → frontend 分阶段启动
- `scripts/infra/start-single-worker-servers.js` / `scripts/infra/start-worker-servers.js`
  - E2E 单 worker / 多 worker 服务启动也复用 `dev-bundle-runner`
  - 避免测试链路再走 `powershell` / `npm run` / `tsx` 的分散入口
- `smoke:startup`
  - `node scripts/infra/startup-smoke-test.mjs`
  - 使用独立端口和独立 bundle 目录做启动冒烟测试，避免误伤正在运行的本地开发进程

### 3. 版本基线

- 当前开发基线 Node 版本固定为 `24.1.0`
- 必须同步维护：
  - `.nvmrc`
  - `.node-version`
  - `package.json > engines.node`

`nodemon` 仍然是商业项目里常见的工具，但更适合作为**备用调试 watcher**，不应该继续担任本项目关键后端的默认启动入口。

## 为什么这样做

直接运行 `tsx` 的问题不是“不能用”，而是：

- 第一次冷启动容易被运行时转译拖慢
- 模块图越大，首次等待越明显
- 当 API / game-server 都是核心后端时，用户体感会非常差

预先 bundle 的好处是：

- 把大部分转译成本挪到一次构建里
- 运行时只执行产物，首冷显著更稳
- watch 重建时只在成功后重启后端，失败时保留旧进程继续跑

## 当前落地文件

- `scripts/infra/dev-bundle-runner.mjs`
- `scripts/infra/dev-orchestrator.js`
- `package.json`

## 检查清单

新增或修改关键后端启动链路时，至少检查：

- [ ] 是否还把 `tsx` 运行时转译放在启动关键路径？
- [ ] 是否能在干净环境下只靠 `npm install` 跑起来？
- [ ] 是否把 bundle 产物放在 `temp/` 下？
- [ ] 是否把 Node 版本钉死到仓库约定版本？
- [ ] watch 重建失败时，是否保留上一版可运行进程？
- [ ] 是否记录了端口 ready 的真实耗时，而不只看日志打印时间？
- [ ] 是否保留独立端口的启动 smoke test，避免改坏关键后端启动链路？

## 相关文档

- `AGENTS.md`
- `docs/deploy.md`
- `docs/temp-files-management.md`
- `scripts/infra/dev-bundle-runner.mjs`
