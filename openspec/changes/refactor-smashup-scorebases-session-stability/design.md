## Context
SmashUp 的计分阶段已经不是单个函数能描述的线性流程，而是一个跨多基地、多类触发源、多轮交互、多轮响应窗口的长事务。当前代码把这条事务拆散在多个系统中：

- FlowHooks 负责进入与退出 `scoreBases`
- `scoreOneBase()` 内部既做 beforeScoring、计分、afterScoring，又决定是否打开响应窗口和延迟清场
- `multi_base_scoring` handler 一边补链，一边继续推进剩余基地
- `SmashUpEventSystem.afterEvents()` 再次兜底 deferred events、flowHalted 与 post-scoring pending actions
- `InteractionSystem.resolveInteraction()` 还内嵌了 SmashUp 专属 `_deferredPostScoringEvents` 传递逻辑

这导致同一语义在不同层反复出现，任何一处新增“提前 return / halt / queue next interaction / auto continue”都可能破坏整条链。

## Goals / Non-Goals
- Goals:
  - 用单一状态机驱动 SmashUp `scoreBases` 结算链
  - 明确延迟清场/换基地事件的唯一所有者和唯一补发点
  - 让 afterScoring 响应窗口与重算流程回到同一会话，而不是依赖分散 flag 回跳
  - 让具体交互 handler（如大副、母舰、寺庙）只关心本步业务，不再负责全局续链
  - 移除引擎层对 SmashUp 专属 continuation payload 的认知
- Non-Goals:
  - 不改变 SmashUp 规则语义本身（结算先后、可选与强制效果仍按当前规则）
  - 不把通用引擎改造成“所有游戏都必须有 scoring session”
  - 不顺手重写无关的 response window / prompt UI 渲染逻辑

## Decisions

### Decision 1: 引入 SmashUp 专用 `scoring session` 作为唯一结算权威
`scoring session` 不是第二个 session 栈：它必须是 `smashup:score-bases` resolution frame 的唯一业务元数据，并由该 frame 的 `step` 表示当前规则阶段。这样仍符合 resolution frame stack 是跨系统主控制流唯一权威的既有合同。

该 session 至少显式保存：
- 锁定的待计分基地集合
- 当前正在结算的基地引用
- 已完成基地集合
- 当前规则阶段（`SELECTED → BEFORE_MANDATORY → BEFORE_OPTIONAL → AWARD_VP → AFTER_MANDATORY → AFTER_OPTIONAL → CLEAR_BASE → CLEAR_REACTIONS → REPLACE_BASE → REVEAL_REACTIONS → DONE`）
- 当前基地的延迟 post-scoring 事件
- 当前基地的 afterScoring 初始力量快照

每个阶段只能：发出正式领域事件后推进、创建子 frame 后暂停、或无副作用地推进到下一阶段。之后所有“继续同一基地 / 继续下一个基地 / 等待交互 / 等待 response window / 恢复清场换基地”都只读写这份 session，不再靠多个松散 flag 拼接。

### Decision 2: 延迟 `BASE_CLEARED/BASE_REPLACED` 只由 SmashUp session 驱动器补发
`_deferredPostScoringEvents` 仍可作为 session 内部过渡数据，但：
- `InteractionSystem` 不再感知并转移该字段
- 具体交互 handler 不再判断“是否最后一个交互”或直接 append deferred events
- `SmashUpEventSystem.afterEvents()` 不再兼任 deferred events 的最终补发器

唯一允许补发 deferred post-scoring events 的地方，是 scoring session 驱动器在确认：
1. 当前基地的 afterScoring 交互链全部结束
2. 当前基地的 afterScoring 响应窗口已结束
3. 如果需要重算，也已经完成重算

### Decision 3: 用稳定的基地引用替代长链上的裸 `baseIndex`
多基地计分会跨 `BASE_CLEARED/BASE_REPLACED`，单纯持有 `baseIndex` 很容易在“旧基地 / 新基地 / replacement target / pending action”之间混淆。实现期应改为使用稳定 session 引用（如 slot-based ref，或 `slotIndex + expectedBaseDefId` 组合），确保：
- 当前正在计分的是哪个槽位
- 延迟动作作用于“原计分基地”还是“替换后新基地”
- 多基地剩余列表不会因为中途替换而误判成新目标

### Decision 4: `scoreOneBase()` 退化为单基地步骤执行器，不再负责全局续链
重构后 `scoreOneBase()` 应只处理“当前基地下一步能推进到哪里”，而不再同时承担：
- 多基地总控
- deferred event 分发
- auto-continue 回跳策略
- 交互链续接

多基地推进、halt/恢复、响应窗口关闭后继续等逻辑都交给 scoring session driver。

### Decision 5: 交互系统只保留通用职责，continuationContext 视为 opaque 数据
引擎层交互系统只能做：
- 出队 / 选项刷新 / 交互切换
- 保持 `data.continuationContext` 原样透传

禁止在交互系统里写入、合并或解释 SmashUp 专属 `_deferredPostScoringEvents` 之类字段，避免游戏规则再次侵入通用引擎。

### Decision 6: 权威 core 只由 pipeline 正式归约事件修改
`scoreOneBase()`、reaction queue、interaction handler 与 `SmashUpEventSystem.afterEvents()` 可以计算“下一步要发什么”，但不得把临时 `reduce()` 的结果写回权威 `MatchState.core`，也不得在之后回滚 core、手工挑字段拼回 handler 的 core。

若某一步需要基于尚未正式归约的事件决定后续内容，驱动器必须把该工作拆到下一轮已归约的 frame step；只有可证明纯粹、只用于本地计算且绝不回写 `MatchState` 的 projection 才可存在。`buildPreviewStateWithPendingDomainEvents()`、`mergePromptResultCoreWithPreEventState()` 和“先内部 reduce 再恢复 preScoreCore”的模式均是迁移后应删除的旧机制。

### Decision 7: SmashUp reaction session 是 Me First!/After Scoring 的唯一 responder 权威
SmashUp 的 reaction frame/session 单独拥有响应者顺序、当前响应者、已 pass 的玩家、行动后新一轮及关闭条件。通用 `ResponseWindowSystem` 不再为 SmashUp 建立镜像窗口，也不再把 `RESPONDER_CHANGED` / `CLOSED` 反向翻译成 SmashUp pass。

这不是将所有游戏的 response window 改成 SmashUp 模型。其它游戏继续使用通用系统；SmashUp 仅使用现有 resolution frame + interaction 协议承接其专用反应轮。`hasRespondableContent()` 与实际可选项必须共用同一候选构建/合法性入口，禁止保留“是否可响应”和“实际能打什么”两套 probe。

### Decision 8: 清场必须先成为事实，清场反应只从已清场事件产生
`onMinionDiscardedFromBase`、leave-play 和 discard 触发不得在 `BASE_SCORED` 后预测性入队。`BASE_CLEARED` 正式归约后，后处理只对该事件实际移入弃牌堆的对象生成反应，并携带所需 LKI。这样被 After Scoring 移走的 First Mate 不会获得从未发生的弃牌触发，抽牌/洗牌类效果也能看到已更新的区域状态。

### Decision 9: pipeline 轮次和视觉延迟不得成为规则阶段语义
`_waitForPostScoringReduce`、`_waitForScoreBasesInteractionReduce`、`_waitForStartTurnInteractionReduce` 不得作为 SmashUp 规则恢复条件。frame 只在事件正式归约后才被下一轮驱动器消费，不需要游戏层猜测“已进入第几轮 afterEvents”。

基地 reveal 的两秒表现延迟从规则 frame 移出：领域事件一次性完成清场与换基地，客户端按事件流播放动画并在本地锁住相关输入。刷新、联机恢复和 AI 不再读取墙上时钟来决定规则是否继续。

## Risks / Trade-offs
- 这是高耦合链路重构，短期改动面会明显大于“修一个触发器”。
- 需要同步改测试，否则旧测试会继续固化旧式 flag 行为。
- 重构过程中，最容易回归的是“单基地正常计分”和“afterScoring 响应窗口关闭后的自动推进”。

## Migration Plan
1. 先补事务级特征测试：阶段单调推进、事件只正式归约一次、清场事实后才产生 discard 反应，以及 reaction options 与“可响应”完全一致。
2. 将 scoring session 收敛为 `smashup:score-bases` resolution frame 的完整规则步骤，不改变现有卡牌语义；先迁移单基地，后迁移多基地。
3. 将 deferred cleanup、replacement 与 reveal 收回到该 frame；删除 InteractionSystem / handler / EventSystem 的续链所有权。
4. 将 SmashUp response 改为 reaction frame 的单一控制器，删除 ResponseWindow 镜像与双向 pass 桥接。
5. 删除影子 reduce、core restore/merge、pipeline 轮次 flag 和规则层动画 delay；只在删除后跑过特征测试才移除对应事故回归中的旧状态断言。
6. 用领域测试和 E2E 逐步锁定回归：单基地 → 多基地 → 链式 afterScoring → afterScoring response window → 重算 → First Mate/弃牌区快照。

## Open Questions
- session 状态最终是挂在 `sys.smashupScoring` 还是更通用命名下，但仅 SmashUp 使用？
- 稳定基地引用最终采用“槽位引用”还是“槽位 + 原基地 defId 校验”？
- `pendingPostScoringActions` 是否直接并入 scoring session，而不是继续留在 core？
- 现有 reveal 动画在客户端以哪一组领域事件作为开始/结束信号，是否已有可复用 visual-event consumer？
