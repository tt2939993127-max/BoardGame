## 1. 方案与设计
- [x] 1.1 盘点 Summoner Wars 当前所有“等待玩家输入”本地 mode，并按来源分组（领域事件触发 / 事件卡多步骤 / after-attack / after-move / active-event）
- [x] 1.2 明确哪些交互迁移为 `simple-choice`，哪些迁移为 `multistep-choice`，以及每条链路的取消/跳过/确认语义
- [x] 1.3 明确 `playerView` 隐藏、AI 可见性、真人保护门禁与 watchdog 配合边界

## 2. 领域与引擎实现
- [x] 2.1 将 AI 关键的领域事件后续交互改为引擎交互创建（不再只靠 UI `setMode`）
- [ ] 2.2 迁移 Summoner Wars 的本地多步选择链路到 `InteractionSystem` / `useMultistepInteraction`
  - 2026-04-17 第一批已完成：`useEventCardModes` 中 `event_target` / `funeral_pyre` / `mind_control` / `hypnotic_lure` / `chant_entanglement` 改为直接从当前 `simple-choice` 交互派生 presenter，移除对应本地真相源
  - 待继续：`magic_event_choice` / `stun` / `withdraw` / `after_attack_*` / `telekinesis_*` 的 simple-choice 镜像清理
  - 待继续：`blood_summon` / `annihilate` / `sneak` / `glacial_shift` / `revive_undead` 的复杂多步抽象
- [x] 2.3 清理已被引擎交互替代的本地 UI 状态机职责，避免双轨真相源
- [x] 2.4 更新 `ai.ts`，确保 AI 能消费新交互并在无解时走合法 cancel/skip/pass

## 3. 验证与审计
- [x] 3.1 补充/更新最相关的 Vitest 用例，验证 AI 能看到并解决这些交互
- [ ] 3.2 覆盖 hidden interaction / 真人不受影响 / 无解交互可收口 / 交互链不重触发
- [ ] 3.2 覆盖 hidden interaction / 真人不受影响 / 无解交互可收口 / 交互链不重触发
  - 已有：transport / watchdog / stale-seat 在线房覆盖 hidden interaction、真人保护、emergency skip
  - 缺口：Summoner Wars 专属 owner/guest 可见性 UI 证据、Phase B 代表链路 cancel/skip 闭环、代表链路不重触发回归
- [ ] 3.3 回写 `evidence/summonerwars/` 与 `evidence/engine/` 审计文档
- [ ] 3.4 运行 `openspec validate refactor-summonerwars-local-ui-interactions --strict --no-interactive`
