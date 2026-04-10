## 1. Spec
- [x] 1.1 新增 `resolution-stack` capability spec，定义 frame、阻塞、恢复、完成语义
- [x] 1.2 修改 `interaction-system` spec，明确 interaction 只能阻塞/解锁 resolution frame，不拥有 deferred follow-up
- [x] 1.3 修改 `flow-system` spec，明确存在未完成 resolution frame 时不得错误 auto-continue

## 2. Engine skeleton
- [x] 2.1 在引擎层引入最小 resolution state 与基础 helper（push / block / resume / complete）
- [x] 2.2 为 InteractionSystem / ResponseWindowSystem / FlowSystem 接上 resolution-aware gate
- [x] 2.3 增加引擎层测试，覆盖 interaction 阻塞恢复、response window 阻塞恢复、phase auto-continue gate

## 3. SmashUp pilot migration
- [x] 3.1 将 SmashUp `scoringSession` 对齐到通用 resolution frame 抽象
- [x] 3.2 去掉 SmashUp 计分链里分散的 deferred ownership
- [x] 3.3 补齐多基地、afterScoring、response window、re-score 回归测试

## 4. Follow-up validation
- [ ] 4.1 选择第二个非 SmashUp 连续结算场景做试点验证
- [ ] 4.2 记录哪些旧 `pending* / continuationContext` 仍需保留为兼容层，哪些可删除
