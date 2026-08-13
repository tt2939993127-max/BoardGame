## 1. 特征测试与迁移契约
- [ ] 1.1 在改动旧链前补事务级特征测试：规则步骤单调、每个领域事件仅正式归约一次、暂停只由子 frame 表示
- [ ] 1.2 补 `BASE_CLEARED` 后才生成 `onMinionDiscardedFromBase` 的回归：First Mate 被移走时无弃牌触发；真实清场后抽牌/洗牌能看到新弃牌区
- [ ] 1.3 补 reaction 候选合同：同一 builder 同时决定“是否可响应”和实际选项，覆盖 Me First / After Scoring / 基地限制

## 2. 计分事务唯一权威
- [ ] 2.1 将 SmashUp `scoring session` 收敛为 `smashup:score-bases` resolution frame 的完整规则步骤，明确当前基地、剩余基地、延迟动作与力量快照的唯一落点
- [ ] 2.2 重构 `onPhaseEnter/onPhaseExit/onAutoContinueCheck`：只通过已正式归约的 frame step 推进 `scoreBases`，不再依赖 `flowHalted + scoredBaseIndices + afterScoringInitialPowers` 等松散组合
- [ ] 2.3 重构 `scoreOneBase()`：改为无权威 core 写入的单步事件规划器；禁止内部 reduce 后回滚 `preScoreCore`
- [ ] 2.4 把 deferred cleanup、replacement 与 reveal 的唯一所有权收回 scoring frame；从 `SmashUpEventSystem.afterEvents()` 与 `InteractionSystem.resolveInteraction()` 移除 SmashUp 专属传播/补发
- [ ] 2.5 收敛各 afterScoring handler（至少覆盖大副、海盗湾、托尔图加、刚柔流寺庙、母舰、侦察兵链）到新 frame 契约，handler 不再判断全局续链

## 3. Reaction 与表现解耦
- [ ] 3.1 让 SmashUp reaction frame/session 成为唯一 responder 权威，移除 ResponseWindow 镜像、双向 pass 桥接和重复 guard
- [ ] 3.2 删除 `buildPreviewStateWithPendingDomainEvents()`、`mergePromptResultCoreWithPreEventState()` 及其它影子 reduce/拼 core 机制
- [ ] 3.3 移除 `_waitForPostScoringReduce`、`_waitForScoreBasesInteractionReduce`、`_waitForStartTurnInteractionReduce` 的规则续链职责
- [ ] 3.4 把 post-scoring reveal 动画延迟迁到客户端事件表现层；领域 frame、AI recovery 与恢复逻辑不再读取视觉 deadline

## 4. Validation
- [ ] 4.1 运行事务特征测试及既有事故回归：`scoreBases-mefirst-window`、`base-tortuga-recovery`、`deferred-finalization`、`multi-base-chain-recovery`、`afterScoring-rescoring`、`beforeScoring-window-stuck`
- [ ] 4.2 运行单基地、多基地、基地能力与随从触发、After Scoring 重算、延迟清场/换基地只触发一次的领域组合
- [ ] 4.3 运行相关 E2E，并在 `evidence/` 留下截图与人工验收结论，证明多基地 + After Scoring + First Mate 真实链路稳定
- [ ] 4.4 运行 `npx eslint` 针对修改文件、必要时补 `npx tsc --noEmit`，并执行 `openspec validate refactor-smashup-scorebases-session-stability --strict --no-interactive`
