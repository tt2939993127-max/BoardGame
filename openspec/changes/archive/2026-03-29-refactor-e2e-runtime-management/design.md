## Context
当前 E2E 基建混合了两层职责：

- runtime 管理：起服务、记录端口、登记 owner、清理残留
- 测试执行：解析目标文件、跑 Playwright、输出日志

这导致 `run-e2e-command`、`globalSetup`、`cleanup`、`runtime-registry` 之间强耦合。多工作树并发时，固定共享端口与隐式起服链互相冲突；Windows / Codex 下又因为子进程窗口与 `spawn EPERM` 问题叠加了额外分支，使行为变得不可预测。

## Goals / Non-Goals
- Goals:
  - 让 E2E runtime 生命周期独立于 Playwright 执行
  - 明确支持多工作树并行使用 E2E
  - 把“ready”定义为真实端口与健康检查通过，而不是仅凭进程存活
  - 保持现有单文件命令入口不变，尽量减少调用方改动
- Non-Goals:
  - 本轮不重写所有 E2E 测试文件
  - 本轮不引入新的隐藏守护实验链
  - 本轮不追求全量 worker 并行自动编排

## Decisions

### Decision: 引入显式 runtime manager
新增单独的 runtime manager 命令层，负责：
- `start`: 启动 runtime，等待健康检查通过，再写入 registry
- `status`: 读取 registry 并执行实时健康检查
- `stop`: 精准停止指定 runtime

`run-e2e-command` 不再直接拼装复杂起服实验，只向 runtime manager 请求“确保某个 runtime 可用”。

### Decision: runtime 以 worktree 为主隔离
runtime 的唯一键继续使用 `worktreeRoot::scope`，但 scope 语义收口：
- `shared-single`: 当前 worktree 显式申请的单 worker 共享 runtime
- `isolated-single:<runId>`: 当前命令独占的隔离 runtime
- 多工作树之间禁止共享同一 runtime 记录

### Decision: ready 以健康检查为准
runtime 写入 active 前，必须同时满足：
- 三个端口都在监听
- 游戏服务 `/games` 可达
- API `/health` 可达
- 前端 `/__ready` 可达

只要任何一项失败，runtime 不得标记为 ready。

### Decision: globalSetup 退回附着角色
Playwright `globalSetup` 只负责：
- 校验本次要附着的 runtime 是否存在且健康
- 在需要时向 runtime manager 请求重建

它不再承担隐藏守护起服实验，也不再直接分叉多套复杂启动路径。

## Alternatives considered
- 继续在 `run-e2e-command` 上叠加共享守护与隐藏启动分支
  - 否决：已经证明在 Windows / Codex 下容易制造更多临时窗口和假 ready
- 彻底要求用户手工先起服务再跑 E2E
  - 否决：虽然简单，但会显著降低当前仓库的自动化可用性

## Risks / Trade-offs
- Runtime manager 抽离后，短期内需要同时兼容旧命令与新状态结构
  - Mitigation: 保持 `run-e2e-single`/`run-e2e-command` 入口不变，只替换内部实现
- 多工作树 registry 与端口预留逻辑交错，重构时容易出现 stale 记录
  - Mitigation: 把 registry 迁移和健康检查一起做，优先保证错误可见而不是静默复用

## Migration Plan
1. 先抽出 runtime manager 与健康检查接口
2. 让 `run-e2e-command` 接 runtime manager，但保留原命令行 API
3. 再精简 `globalSetup/globalTeardown`
4. 最后补多工作树并行验证与清理逻辑

## Open Questions
- 是否需要为“共享单 worker runtime”单独提供显式 CLI 命令，供人工长期持有
- 是否需要把前置检查缓存也纳入 runtime manager，而不是继续留在 runner 层
