## 1. Spec & Architecture
- [x] 1.1 新增 `android-download-management` capability，明确后台继续、断点续传、状态恢复与错误分类要求
- [x] 1.2 明确 APK 更新包与游戏资源包共享的下载任务注册表、状态机与诊断字段
- [x] 1.3 运行 `openspec validate refactor-android-download-resilience --strict --no-interactive`

## 2. Native Download Runtime
- [x] 2.1 落地原生下载任务注册表/状态模型/ForegroundService 骨架
- [ ] 2.2 将游戏资源包下载迁移到统一 `ForegroundService` 执行层
- [ ] 2.3 将 APK 更新包下载迁移到统一 `ForegroundService` 或系统托管执行层
- [ ] 2.4 将 partial 文件、续传协商与失败降级策略收口到统一下载执行器
- [ ] 2.5 增加“单 active + 持久队列 + 同目标去重”的并发策略实现

## 3. JS State & UX
- [x] 3.1 JS 侧改为查询原生任务状态，而不是把进行中任务直接判失败
- [ ] 3.2 为“后台继续中 / 排队中 / 待恢复 / 待安装 / 可重试”补齐状态语义与文案
- [ ] 3.3 清理旧的“上次下载未完成，请重新发起”原型兜底逻辑，并切换到队列/恢复语义

## 4. Verification
- [ ] 4.1 验证切后台后下载继续或可恢复
- [ ] 4.2 验证杀进程后能恢复任务状态
- [ ] 4.3 验证部分下载命中续传，不强制从 0 开始
- [ ] 4.4 验证校验失败/空间不足/网络失败时错误原因可区分
