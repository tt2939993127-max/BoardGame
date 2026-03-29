## 1. Runtime Manager
- [x] 1.1 设计并实现独立的 E2E runtime manager 入口，支持 `start / status / stop`
- [x] 1.2 定义 runtime registry 的状态字段，显式区分 owner、service、ports、health
- [x] 1.3 为当前 worktree 生成稳定 scope，并避免不同 worktree 复用同一 runtime 记录

## 2. 启动与健康检查
- [x] 2.1 重构单 worker E2E 起服链，统一通过 runtime manager 启动
- [x] 2.2 将前端 / 游戏服务 / API 服务的监听状态与 HTTP 健康检查绑定，去掉“进程活着即 ready”的假设
- [x] 2.3 明确共享端口模式与隔离端口模式的准入条件

## 3. 执行层收口
- [x] 3.1 精简 `run-e2e-command`，让其只负责附着到已知 runtime 或显式请求 runtime manager
- [x] 3.2 让 `globalSetup/globalTeardown` 只做运行时校验与本次执行清理，不再承担复杂后台起服分支
- [x] 3.3 保留前置检查缓存，但确保它不掩盖 runtime 健康状态

## 4. 多工作树与清理
- [x] 4.1 为多工作树并行场景补充冲突检测与错误信息
- [x] 4.2 让清理命令支持按 runtime 精准停止，避免扫描式误杀
- [ ] 4.3 验证共享端口清理与隔离端口清理都能正确释放 registry

## 5. 验证
- [x] 5.1 在 Windows / Codex 下验证单文件 E2E 不再依赖隐式隐藏守护实验链
- [x] 5.2 验证同一 worktree 连续两次运行时能够稳定复用或稳定重建，不出现假 ready
- [ ] 5.3 验证两个 worktree 并行运行时不会互相占用同一 runtime
