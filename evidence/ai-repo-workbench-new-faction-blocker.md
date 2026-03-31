# AI Repo Workbench New-Faction Blocker

## 当前结论

- `AI 仓库工作台` 首页入口、`/dev/ai-repo-workbench` 路由、本地 `RepoSession / WorkflowRun / DecisionRequest / ArtifactBundle` 纵切片已经实现。
- `npm run typecheck` 已通过，说明当前 TypeScript 层面可收口。
- 当前环境 **无法完成浏览器/E2E 证据截图**，阻塞点不是业务逻辑，而是运行环境对 Node 子进程的限制。

## 已实现的纵切片

- Home 工具入口新增 `AI 仓库工作台`
- 新页面：`/dev/ai-repo-workbench`
- 本地运行时：`src/features/ai-repo-workbench/runtime.ts`
- 真实人工决策点：`select-rule-source`
- 可见节点状态：`pending / running / waiting_decision / completed`
- 最终完成态：ArtifactBundle 面板，包含
  - `ruleSourceIndex`
  - `normalizedRuleCorpus`
  - `assetChecklist`
  - `factionDefinitionSnapshot`
  - `decisionLog`
  - `e2eStatus: not_applicable`

## 通过的验证

### TypeScript

命令：

```powershell
npm run typecheck
```

结果：

- 通过，无 TypeScript 错误。

## 浏览器 / E2E 阻塞证据

### 阻塞 1：E2E runtime registry 起初不兼容 worktree

已修复：

- `scripts/infra/e2e-runtime-registry.js`
- `scripts/infra/port-allocator.js`

修复内容：

- worktree 下 `.git` 是文件时，不再把主仓库 `.git` 目录当成本 worktree 可写目录
- 共享 registry / port reservation 改为支持回退到当前 worktree 的 `.tmp/boardgame-e2e`

### 阻塞 2：当前环境禁止 Node 子进程

命令：

```powershell
$env:CODEX_MANAGED_BY_NPM='0'; node scripts/infra/run-e2e-single.mjs ci e2e/lobby.e2e.ts "AI 仓库工作台可从工具入口进入并完成 new-faction 纵切片"
```

关键报错：

```text
当前运行环境不允许测试基建所需的 Node 子进程能力。
场景: E2E
失败阶段: fork
错误: EPERM (spawn)
```

影响：

- Playwright worker 无法启动
- E2E 三服务启动链路无法启动
- 无法在当前终端拿到真实浏览器截图

### 阻塞 3：构建同样被 `spawn EPERM` 拦截

命令：

```powershell
npm run build
```

关键报错：

```text
failed to load config from vite.config.ts
Error: spawn EPERM
...
at ensureServiceIsRunning (...\\node_modules\\esbuild\\lib\\main.js)
```

影响：

- 当前沙箱不仅拦 Playwright，也拦 esbuild service
- 因此不能在这里补一条“构建产物截图”作为替代证据

## 结论

- 这不是“页面没实现”，而是“当前运行环境禁止浏览器/E2E/构建链依赖的子进程”。
- 若要拿到最终截图证据，只需要把当前代码放到允许 `child_process` 的本地终端或 CI Runner 里，优先重跑：

```powershell
node scripts/infra/run-e2e-single.mjs ci e2e/lobby.e2e.ts "AI 仓库工作台可从工具入口进入并完成 new-faction 纵切片"
```

- 代码侧下一步不再是补 spec，而是直接在可运行环境里拿截图并补最终 evidence 文档。
