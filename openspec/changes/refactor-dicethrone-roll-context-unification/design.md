## Context
DiceThrone 当前把“现在玩家能理解和操作的骰子”拆成多套实现路线：

1. 主骰路线
`core.dice -> DiceTray -> MODIFY_DIE / REROLL_DIE / TOGGLE_DIE_LOCK -> rollConfirmed / 技能重选`

2. 奖励骰路线
`pendingBonusDiceSettlement -> BonusDieOverlay -> REROLL_BONUS_DIE / SKIP_BONUS_DICE_REROLL`

3. 展示即结算路线
`BONUS_DIE_ROLLED / displayOnly -> 展示特写 -> 同批事件直接伤害 / 加伤 / 状态结算`

这些路线会让“任何骰子都可以被修改”的规则口径在实现中变成若干特例。战术家的战术优势、闪避、目标掷骰、奖励骰、对掷 / 比骰都可能因为不在同一个当前骰子模型里而被错误拒绝、提前结算或重复开窗口。

本轮用户已明确新的核心不变量：**当前骰子永远只有一种，而且新投掷会覆盖旧投掷**。因此本设计不做多套前台骰区，也不做 `core.dice`、奖励骰和 display-only 三个并行当前源。

## Goals
- 用一个领域层 Module 表达 DiceThrone 当前唯一可操作骰子，语义上等同于一个单槽当前骰区。
- 让通用改骰卡、被动、Token、响应窗口、AI 和 UI 都读取同一个当前骰子上下文。
- 支持“出牌后回到对应步骤继续游戏”：若后续出牌或效果产生新投掷并覆盖旧骰区，要修改旧骰面时必须回到覆盖前对应步骤，再沿同一流程继续。
- 显式区分规则可修改的骰子、规则锁定的骰子、已结算回放展示。
- 保留 Ultimate 成功发动后的硬例外：规则锁定后的结算骰不可被非法修改。

## Non-Goals
- 不重写引擎层通用骰子 primitive。
- 不引入多套同时可操作的骰池 UI。
- 不把通用 UndoSystem 当作骰子响应恢复机制；撤回整局状态和恢复结算步骤是两件事。
- 不顺手修改无关英雄平衡、卡牌数值或视觉皮肤。

## Decisions

- Decision: DiceThrone 只有一个单槽当前骰区，且新投掷破坏性覆盖旧投掷。
  - Rationale: 用户口径是“当前骰子只有一个，新投掷的骰子会覆盖旧的”。实现上必须把“当前骰子”收敛为唯一字段 / 唯一读取入口，而不是让主骰、奖励骰和展示骰各自争抢前台。
  - Consequence: 所有 UI、校验、AI、响应窗口只能消费 `currentRollContext`，旧字段只能作为迁移期兼容或派生展示，不得作为第二套当前源。

- Decision: “骰子区域没有被覆盖”翻译成规则语义：当前骰区仍保存该次投掷，且尚未被后续投掷覆盖。
  - Rationale: 覆盖不是 UI z-index 问题，而是单槽当前骰区的数据覆盖问题。只要后续投掷写入当前骰区，旧骰子就不再是当前可修改对象。
  - Consequence: 不允许 UI 自己判断“哪里没盖住就能改”。必须由领域层 current context 策略给出当前单槽里哪一次投掷可操作，以及旧骰面是否已经被覆盖。

- Decision: 中途出牌 / 用被动 / 用 Token 后若覆盖了骰区，旧骰面只能通过步骤级回退重新成为当前骰子。
  - Rationale: 通用撤回会恢复整局快照，可能撤掉卡牌、CP、弃牌、伤害与其他玩家动作；但 DiceThrone 这里需要的是“回到覆盖前对应步骤，让旧骰子重新写入当前骰区，再继续同一流程”。
  - Consequence: 实现应接入 `resolution frame` 或 DiceThrone 自有步骤级回退：后续投掷正常覆盖当前骰区；若要修改被覆盖的旧骰面，必须回退到覆盖前步骤，不能把父子骰子同时留在当前区。

- Decision: `displayOnly` 不承载未完成规则结算。
  - Rationale: 只要某次掷骰仍可能被卡牌 / 状态 / 被动修改，就必须进入当前骰子上下文，而不是先自动结算再播特写。
  - Consequence: `displayOnly` 只用于已结算回放、明确不可干预的结果或纯汇总说明。

- Decision: 所有权和干预权限来自同一策略矩阵。
  - Rationale: 2v2 队友干预、对手改骰、战术家“任意时刻”、闪避投骰、Ultimate 锁定不能由 UI、validate、execute 各自推断。
  - Consequence: `currentRollContext.policy` 是合法操作者、可修改性、可重掷性、是否阻塞流程的单一来源。

## Proposed Model

### Current Roll Context
DiceThrone 领域状态新增一个唯一当前上下文。它不是栈顶视图，而是单槽当前骰区：

- `currentRollContext?: DiceThroneRollContext`

`DiceThroneRollContext` 至少包含：

- `id`
- `kind`: `offensive | defensive | targeting | effect | bonus | evasion | compare`
- `ownerPlayerId`
- `targetPlayerId?`
- `sourceAbilityId?`
- `sourceCardId?`
- `sourceTokenId?`
- `phase`
- `dice[]`
- `status`: `open | settling | settled | locked`
- `policy`
- `settlement`
- `display`
- `coveredPreviousRollRef?`: 仅用于审计 / 回退定位；不得作为第二套当前骰子读取

### Policy
`policy` 是所有校验层的单一判断来源：

- `modifiableBy`: `owner | opponents | allies | both | any | none`
- `rerollableBy`: `owner | opponents | allies | both | any | none`
- `allowPassiveReroll`
- `allowRollCards`
- `ultimateLocked`
- `blocksPhaseFlow`

### Settlement
`settlement` 只描述“最终骰面确认后怎么继续”：

- `mode`: `selectAttack | targetPlayer | damage | attackBonus | threshold | tokenNegate | compare | none`
- `resumeFrameId?`
- `followupStep?`
- `metadata?`

### Display
`display` 只描述展示皮肤，不决定规则：

- `surface`: `diceTray | bonusOverlay | compactOverlay | recapOnly`
- `replayOnly`
- `summaryKey?`

## Current Dice Invariant
- 同一时刻最多只有一个 `currentRollContext`，它就是当前骰区。
- 任何改骰 / 重掷 / 被动重掷 / 骰子响应命令都必须携带或解析到这个唯一上下文。
- 若当前骰区未被覆盖，不得用另一个字段继续表达“也能操作的骰子”。
- 若效果中途产生新骰子：
  1. 覆盖前若旧骰面还要被后续流程使用，先提交为结算输入 / 快照；
  2. 新投掷破坏性写入唯一 `currentRollContext`；
  3. 旧骰子不再是当前骰子，不能继续被普通改骰命令修改；
  4. 若玩家后来要改旧骰面，必须回退到覆盖前对应步骤，让旧骰面重新成为当前骰区内容，再沿流程继续。
- 若骰子已结算并被后续投掷覆盖，后续只能走步骤级回退 / 重新结算机制，不能继续用改骰命令假装还在同一窗口。

## Migration Strategy
1. 合并 OpenSpec：保留 `refactor-dicethrone-roll-context-unification`，删除重复的 `refactor-dicethrone-extra-dice-unification`。
2. 新增 `currentRollContext` 类型、helper 和兼容读取层，先不删除旧字段。
3. 将 `getActiveDice`、`getRollerId`、可改骰判断、骰子签名、响应窗口源 ID 改为优先读取当前上下文。
4. 将 `MODIFY_DIE`、`REROLL_DIE`、`USE_PASSIVE_ABILITY.rerollDie` 改为面向当前上下文。
5. 将目标掷骰、闪避、`rollDie`、可改奖励骰、对掷 / 比骰迁入当前上下文。
6. 将 `pendingBonusDiceSettlement` 退化为迁移期适配或展示派生数据。
7. 清理 `displayOnly` 滥用，只保留已结算回放和明确不可干预结果。
8. 更新 UI、AI、Vitest、E2E 和 evidence。

## Risks / Trade-offs
- Risk: 一次性迁移所有英雄 custom action 会过大。
  - Mitigation: 先做兼容读取层，再按掷骰类别迁移：目标掷骰 / 闪避 / rollDie / 奖励骰 / 对掷。

- Risk: 当前 `displayOnly` 链路依赖同批事件立刻产出伤害或状态。
  - Mitigation: 拆成“创建当前骰子上下文 -> 等待干预或跳过 -> 以最终骰面结算”三段。

- Risk: 旧字段在迁移期仍可能被新代码误当成当前骰子。
  - Mitigation: 所有新逻辑只能经 `resolveCurrentRollContext` 读取；直接读 `core.dice` 仅限兼容层内部。

- Risk: 多人局和 2v2 的合法干预者再次分叉。
  - Mitigation: UI、validate、execute、AI 都只读 `context.policy`。

## Resolved Questions
- 主骰池是否完全收编到当前上下文？是。迁移期可以保留 `core.dice` 作为存储兼容，但语义上当前骰区入口只有 `currentRollContext`，后续投掷会覆盖它。
- 可交互额外骰是否复用 `DiceTray`？规则上必须复用同一上下文；视觉上可继续使用不同展示壳层。
- 出牌后是否走 Undo？不走通用整局 Undo。若出牌或效果产生新投掷并覆盖骰区，要改旧骰面时走步骤级回退到覆盖前步骤。

## Open Questions
- compare roll / duel roll 是否全部复用 `MODIFY_DIE / REROLL_DIE`，还是保留轻量上下文专用命令包装。
- 第一批实现是否优先覆盖战术家 + 闪避 + 奖励骰，还是先覆盖所有通用 roll 卡。
