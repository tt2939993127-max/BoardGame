## ADDED Requirements

### Requirement: E2E Runtime 生命周期必须独立于单次测试执行
系统 SHALL 提供独立的 E2E runtime 管理能力，用于显式启动、查询和停止测试服务，而不是把服务生命周期隐式绑定到每次 Playwright 命令。

#### Scenario: 显式启动共享 runtime
- **WHEN** 用户或 runner 请求启动当前 worktree 的共享 E2E runtime
- **THEN** 系统启动前端、游戏服务和 API 服务
- **AND** 仅在健康检查全部通过后将该 runtime 记录为 active

#### Scenario: 查询 runtime 状态
- **WHEN** 用户或 runner 查询当前 worktree 的 E2E runtime 状态
- **THEN** 系统返回 runtime 所属 worktree、scope、ports、ownerPid、servicePids 和实时健康状态

### Requirement: 多工作树必须相互隔离
系统 SHALL 以 `worktreeRoot + scope` 作为 runtime 隔离边界，禁止不同工作树隐式复用同一 E2E runtime。

#### Scenario: 另一个工作树占用相同共享端口
- **WHEN** 当前 worktree 请求复用共享单 worker 端口，而该端口已被其他 worktree 的 active runtime 占用
- **THEN** 系统拒绝复用
- **AND** 返回包含冲突 worktree 与 runtime 摘要的错误信息

#### Scenario: 多工作树并行使用隔离 runtime
- **WHEN** 两个工作树分别请求隔离 runtime
- **THEN** 系统为它们分配不同的端口组
- **AND** 两边的 registry 记录互不覆盖

### Requirement: Ready 状态必须基于真实健康检查
系统 SHALL 以真实端口监听与 HTTP 健康检查作为 runtime 就绪的唯一判据，不能仅依据进程仍在存活或 bootstrap 已登记。

#### Scenario: 前端进程已退出但 bootstrap 仍存活
- **WHEN** runtime owner 进程仍在，但前端端口未监听或 `/__ready` 不可访问
- **THEN** 系统将该 runtime 标记为 unhealthy 或 stale
- **AND** 后续测试执行不得把它当作可复用 runtime

#### Scenario: 服务全部健康
- **WHEN** 前端、游戏服务、API 服务端口均在监听，且 `/__ready`、`/games`、`/health` 均返回成功
- **THEN** runtime 可以被标记为 ready

### Requirement: 测试执行层必须只附着或显式请求 runtime
系统 SHALL 让测试执行层只负责附着到现有 runtime 或显式请求 runtime manager 启动，不能在 Windows / Codex 环境里继续引入未经验证的隐藏守护起服实验链。

#### Scenario: runner 附着共享 runtime
- **WHEN** 单文件 E2E 命令在当前 worktree 检测到健康的共享 runtime
- **THEN** runner 直接复用该 runtime
- **AND** 不重复发起新的后台起服实验

#### Scenario: runner 请求创建隔离 runtime
- **WHEN** 单文件 E2E 命令显式要求隔离运行
- **THEN** runner 通过 runtime manager 申请新的隔离 runtime
- **AND** 本次运行结束后只清理自己创建的 runtime

### Requirement: 清理必须支持精准停止
系统 SHALL 支持按 runtime 精准停止测试服务，并保证清理 registry 与端口状态一致。

#### Scenario: 精准停止指定 runtime
- **WHEN** 用户执行 stop/cleanup 并指定某个 runtime
- **THEN** 系统仅停止该 runtime 的 owner 和 service 进程
- **AND** 从共享 registry 中移除对应记录

#### Scenario: 清理共享 single-worker runtime
- **WHEN** 用户显式要求清理共享 single-worker E2E runtime
- **THEN** 系统停止该 runtime 并释放其共享端口
- **AND** 不影响其他 worktree 的隔离 runtime
