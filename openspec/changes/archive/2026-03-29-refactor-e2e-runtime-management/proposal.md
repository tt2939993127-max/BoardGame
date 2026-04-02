# Change: 重构 E2E Runtime 管理

## Why
当前 E2E 运行链同时承担“前置检查、服务启动、健康检查、Playwright 执行、清理”多个职责，导致以下问题：

- 多工作树并行跑 E2E 时，固定共享端口与隐式起服容易互相干扰
- Windows / Codex 环境下，为了规避 `spawn EPERM` 与黑框弹窗，运行分支不断叠加，行为不可预测
- runtime registry 中“进程存活”“服务就绪”“端口监听”语义混杂，出现 `page.goto('/')` 超时但 runtime 仍显示 active 的假阳性
- 单文件 E2E 重跑成本过高，每次都重复执行前置检查与服务生命周期管理

继续在现有链路上打补丁，风险会持续放大；需要把 E2E 基建拆成明确的 runtime 管理层与测试执行层。

## What Changes
- 新增独立的 E2E runtime 管理能力，提供显式的 `start / status / stop` 生命周期
- 约束 runtime 作用域为“当前 worktree + scope”，避免多个工作树共享同一套隐式服务
- 把“runtime 存活”“端口监听”“HTTP 健康检查通过”拆成独立状态，并以健康检查作为唯一准入
- 收敛 `run-e2e-command` 职责：只做目标解析、轻量前置校验、调用 Playwright；不再隐式发起复杂后台起服实验
- 保留单 worker 共享端口模式，但只有在当前 worktree 显式声明并通过 runtime manager 起服后才允许复用
- 为多工作树并行场景提供隔离端口与精准清理能力

## Impact
- Affected specs: `e2e-runtime-management`
- Affected code:
  - `scripts/infra/run-e2e-command.mjs`
  - `scripts/infra/run-e2e-single.mjs`
  - `e2e/global-setup.ts`
  - `e2e/global-teardown.ts`
  - `scripts/infra/e2e-runtime-registry.js`
  - `scripts/infra/cleanup_test_connections.js`
  - 新增 `scripts/infra/e2e-runtime-manager.mjs` 或等价入口
