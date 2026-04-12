## 1. 方案与设计
- [ ] 1.1 盘点 Summoner Wars 当前所有“等待玩家输入”本地 mode，并按来源分组（领域事件触发 / 事件卡多步骤 / after-attack / after-move / active-event）
- [ ] 1.2 明确哪些交互迁移为 `simple-choice`，哪些迁移为 `multistep-choice`，以及每条链路的取消/跳过/确认语义
- [ ] 1.3 明确 `playerView` 隐藏、AI 可见性、真人保护门禁与 watchdog 配合边界

## 2. 领域与引擎实现
- [ ] 2.1 将 AI 关键的领域事件后续交互改为引擎交互创建（不再只靠 UI `setMode`）
- [ ] 2.2 迁移 Summoner Wars 的本地多步选择链路到 `InteractionSystem` / `useMultistepInteraction`
- [ ] 2.3 清理已被引擎交互替代的本地 UI 状态机职责，避免双轨真相源
- [ ] 2.4 更新 `ai.ts`，确保 AI 能消费新交互并在无解时走合法 cancel/skip/pass

## 3. 验证与审计
- [ ] 3.1 补充/更新最相关的 Vitest 用例，验证 AI 能看到并解决这些交互
- [ ] 3.2 覆盖 hidden interaction / 真人不受影响 / 无解交互可收口 / 交互链不重触发
- [ ] 3.3 回写 `evidence/summonerwars/` 与 `evidence/engine/` 审计文档
- [ ] 3.4 运行 `openspec validate refactor-summonerwars-local-ui-interactions --strict --no-interactive`
