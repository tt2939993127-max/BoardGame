# SmashUp AI 增益目标错误重构方案（Draft v1）

## 任务概述
优化《大杀四方》本地 AI，重点解决“AI 在交互选择时把增益/有利效果给到错误目标，甚至给到对手”的问题，并给出可执行、可验证、可扩展到更多派系与交互的重构路线。

## RALPLAN-DR 摘要

### Principles
1. **语义显式化优先于顺序碰运气**：AI 不能靠 option 数组顺序决定增益/减益去向。
2. **优先修共享交互抽象，再补游戏层 scorer**：先让交互选项能表达“友军/敌军/收益/风险”语义，再让评分层消费。
3. **保留现有合法动作枚举链路**：不推翻 `buildSmashUpAiLegalActions`，在最小破坏前提下增强 metadata 与 scorer。
4. **先防明显错误，再追求更强博弈**：第一阶段先消灭“给对手上 buff”这类硬错，第二阶段再引入轻量 lookahead。
5. **验证必须覆盖回归样例与跨交互类型**：至少覆盖 player-target、minion-target、multi-choice 三类交互。

### Decision Drivers
1. 当前 SmashUp AI 对 `interaction-choice` 没有语义评分，等分时会稳定选第一个动作。
2. SmashUp 交互目标 helper 当前只输出 label/value，不输出阵营/收益类型，AI 无法推断目标亲疏。
3. 引擎内已有更成熟范式可复用：DiceThrone 已用交互 scorer + lookahead 处理语义目标选择。
4. 用户明确希望方案具备跨游戏通用性，不能把这次修复锁死在 SmashUp 私有补丁里。

### Viable Options

#### Option A：只在 SmashUp 新增若干特判 scorer
- **做法**：针对若干 `sourceId`（如 buff/debuff/player-target）在 `src/games/smashup/ai.ts` 手工判断。
- **优点**：落地快，改动少。
- **缺点**：会继续堆 `sourceId` 白名单；新派系/新交互仍会复发；不符合“百游戏”方向。

#### Option B：抽出通用 AI 语义层，并由 SmashUp 先接入（推荐）
- **做法**：在引擎/共享 AI 层定义统一的 `_ai` / `aiHints` 元数据协议与通用 interaction scorer 基座；SmashUp 先作为试点接入，在目标 option/helper 阶段显式写入 `targetOwnerId/targetControllerId/targetKind/effectIntent/estimatedSwing` 等提示；`buildInteractionActions` 把这类 metadata 提升为 AI action metadata；第二阶段再视效果把 SmashUp policy 从 `createScoredLocalAiPolicy` 升级到 `createLookaheadLocalAiPolicy`。
- **优点**：能系统修掉“buff 给敌人/ debuff 给自己/ player-target 选错人”等同类问题；后续其他游戏可直接复用同一套 hints + scorer 约定。
- **缺点**：需要先设计共享契约，再做 SmashUp 接线，初期改造面略大于 A。

#### Option C：直接做完整模拟器/搜索式 AI
- **做法**：对 interaction-choice 全量执行前瞻模拟，比较 resulting state。
- **优点**：理论上最强。
- **缺点**：超出当前问题边界；性能、状态复制、随机性和隐藏信息处理成本高，不适合先修“硬错”。

### Alternatives Invalidated
- **仅调高/调低 `interaction-choice` 基础权重** 无效：权重只决定“是否做交互”，无法区分不同交互选项。
- **仅重排 option 数组** 无效：修一个 prompt 会在别处继续复发，而且顺序不是稳定语义来源。

## 现状证据
1. SmashUp 的 `buildInteractionActions` 会把 simple-choice 全部转成 `interaction-choice`，metadata 只带 `optionValue`/`optionIds`，没有友军/敌军/收益方向信息（`src/games/smashup/ai.ts:236-310`）。
2. SmashUp 当前 policy 仍是 `createScoredLocalAiPolicy`，scorer 列表里没有 interaction 专用 scorer；`actionKindScorer` 只给所有 `interaction-choice` 统一 +200（`src/games/smashup/ai.ts:788-805`, `src/games/smashup/ai.ts:1028-1040`）。
3. 评分器在总分相等时保留第一个动作：`pickBestLocalAiActionEvaluation` 从 `evaluations[0]` 开始，只在 `current.totalScore > best.totalScore` 时替换（`src/engine/ai/scoring.ts:63-76`）。这意味着 interaction options 没有额外 scorer 时，本质就是“拿第一个”。
4. SmashUp 的 `buildMinionTargetOptions` 会过滤保护，但输出仍只有 `id/label/value`，没有记录目标与施法者的关系，也没有 `effectIntent`（`src/games/smashup/domain/abilityHelpers.ts:1355-1415`）。
5. SmashUp 存在真实的 player-target/任意玩家交互，例如 `trickster_mark_of_sleep` 明确允许选择任意玩家（包含自己），若 AI 无法识别利害关系，就容易误选（`src/games/smashup/abilities/tricksters.ts:936-947`）。
6. 项目内已有成熟参照：DiceThrone 在 AI 中显式区分友军/敌军，并对增益/减益做目标价值计算（`src/games/dicethrone/ai.ts:491-554`, `src/games/dicethrone/ai.ts:1512-1648`），且其默认 policy 已是 `createLookaheadLocalAiPolicy`（`src/games/dicethrone/ai.ts:2182-2187`）。

## 根因判断
- **主根因**：SmashUp 的交互选项缺少“效果语义 + 目标关系”元数据，导致 AI 无法判断一个 option 对自己是利好还是利空。
- **放大器**：当前 policy 没有 interaction scorer，也没 lookahead；一旦多个交互选项都只有同一基础分，评分器稳定选第一个。
- **次级风险**：SmashUp 的各种 helper（minion/base/player/generic）没有统一 AI metadata 规范，导致每个新交互都可能再次落回“顺序决定行为”。
- **隐藏架构风险**：如果把 AI 语义直接塞进业务 `value/mergedValue`，会污染交互处理器契约，未来可能把 AI 辅助字段误当成真实规则输入。

## 需求摘要
1. AI 不能再把正向增益效果给敌方，不能把负向效果给己方，除非规则明确要求如此。
2. 修复方案不能只覆盖单一卡牌；至少要覆盖 minion-target、player-target、multi-choice 三类交互。
3. 方案必须保留现有 `buildSmashUpAiLegalActions` / `resolveNextLocalAiAction` 总体链路，避免引擎侧大规模破坏。
4. 改造后要能给未来派系复用，避免继续堆 `sourceId` 特判。

## 推荐方案（ADR）

### Decision
采用 **Option B：抽出通用 AI 语义层，由 SmashUp 率先接入，再按需推广到其他游戏**。

### Drivers
- 需要系统解决同类问题，而不是只修某一张牌。
- SmashUp 现有合法动作枚举链路已经稳定，可在 metadata/scorer 层增量演进。
- DiceThrone 已验证“语义 scorer + lookahead”路线在本项目内可行。
- 用户希望这次投入能复用于其他游戏，因此共享层设计优先于 SmashUp 私有特判。

### Alternatives considered
- A：SmashUp 临时特判 scorer。
- C：完整模拟/搜索式 AI。

### Why chosen
Option B 在改动量、正确性、可扩展性之间最平衡：比 A 更不易回归，比 C 风险和工期更可控，同时能把“buff/debuff/target affinity”变成显式契约，并为其他游戏复用留出标准接口。

### Consequences
- 需要先定义共享 AI hints/scorer 契约，再给 SmashUp 的目标 helper 和部分 player/generic prompt 补语义字段。
- `buildInteractionActions` / interaction scorer 会变复杂，但收益是长期的，并且可复用到后续游戏。
- 第一阶段仍以启发式为主，不追求完整最优解；后续若要更强 AI，可继续叠加 lookahead。

### Follow-ups
- 共享契约落稳后，把 DiceThrone / 其他游戏逐步迁移到同一 hints + scorer 体系。
- 远程 AI 若未来上线，可直接消费相同 metadata 作为 prompt context。

## 实施步骤

### 阶段 0：先抽共享 AI 语义契约（通用层）
**目标文件**：
- `src/engine/ai/types.ts`
- 必要时：`src/engine/ai/scoring.ts`、`src/engine/ai/lookahead.ts`

**工作内容**：
1. 定义通用 `AiHint` / `AiInteractionHint` 协议，明确这些字段只服务 AI，不进入规则主载荷。
2. 设计共享 scorer 消费接口，至少支持：
   - 目标关系：self / ally / enemy / neutral
   - 效果意图：buff / debuff / destroy / move / inspect / resource / optional-skip
   - 覆盖口：`priorityHint` / `forcedTargetPolicy`
3. 明确边界：共享层只提供 schema、工具函数、基础 scorer；具体游戏负责产出 hints，不在引擎层硬编码某个游戏规则。

### 阶段 1：建立 SmashUp AI 交互语义契约
**目标文件**：
- `src/games/smashup/domain/abilityHelpers.ts`
- 必要时：`src/games/smashup/abilities/*.ts`、`src/games/smashup/domain/baseAbilities*.ts`

**工作内容**：
1. 先做一次 inventory，列出 SmashUp 中所有会进入 `simple-choice` 且可能影响目标优先级的入口，按 `minion/base/player/generic/multi-choice` 分类，确认哪些已经走 helper，哪些仍是手写 options。
2. 为 minion/base/player/generic 常用 option builder 补统一 AI metadata，并强制对齐阶段 0 的共享 `AiHint` 契约，放入独立 `_ai` / `aiHints` 字段，而不是污染业务 `value`：
   - `targetKind`: `'player' | 'minion' | 'base' | 'card'`
   - `targetPlayerId` / `targetOwnerId` / `targetControllerId`
   - `relationToActor`: `'self' | 'ally' | 'enemy' | 'neutral'`
   - `effectIntent`: `'buff' | 'debuff' | 'destroy' | 'move' | 'inspect' | 'resource' | 'optional-skip'`
   - 可选 `estimatedPowerSwing` / `priorityHint` / `forcedTargetPolicy`
3. 先改高频 helper（如 `buildMinionTargetOptions`），再补 player-target prompt（例如 `trickster_mark_of_sleep` 这类手写 options）。
4. 明确规范：只要 prompt 允许“任意玩家/任意随从”选择，就必须附上足够的 AI metadata，禁止纯 label/value 裸传；对暂时无法接线的旧 prompt，要在 inventory 中标记 blocker，不能假装已覆盖。

### 阶段 2：重构 SmashUp interaction action 生成与评分（基于共享层）
**目标文件**：
- `src/games/smashup/ai.ts`
- `src/engine/ai/scoring.ts`（若需要补共享 scorer 组合能力）
- 视需要参考 `src/games/dicethrone/ai.ts`

**工作内容**：
1. 在 `buildInteractionActions` 中把 option 元数据提升为统一 action metadata，而不是只存 `optionValue`。
2. 优先复用共享 interaction scorer；仅把 SmashUp 特有规则留在游戏层 scorer。
3. 新增/接入 `interactionValueScorer`：
   - buff/resource/正向效果 → 友军正分，敌军负分。
   - debuff/destroy/干扰效果 → 敌军正分，己方负分。
   - skip/confirm/cancel → 根据 `effectIntent` 与是否存在高价值候选做条件评分。
   - multi-choice → 聚合每个 option 的 swing，避免“前两个选项固定组合”。
4. 为存在特殊语义的卡保留 source-level override 入口：当同一 `targetKind + effectIntent` 不足以表达语义时，可通过 `priorityHint` / `forcedTargetPolicy` 覆盖，而不是回退到裸 `sourceId` if-else。
5. 让 `baseline` policy 先接入 interaction scorer，确保在不启用 lookahead 时也能消灭明显硬错。

### 阶段 3：按难度引入轻量 lookahead（仅在阶段 1/2 通过后启用）
**目标文件**：
- `src/games/smashup/ai.ts`
- 可选：`src/engine/ai/lookahead.ts`（若需小补丁）

**工作内容**：
1. 将 SmashUp policy 从 `createScoredLocalAiPolicy` 迁移到 `createLookaheadLocalAiPolicy`。
2. `projectAction` 先只覆盖高收益动作：
   - `interaction-choice`
   - `play-minion`
   - `play-action`
   - `advance-phase`
3. 前瞻评分只比较轻量局面指标：
   - 己方/敌方基地有效战力变化
   - 即将触发/阻止计分的压力变化
   - 手牌差 / 场面数差 / 关键随从存活
4. 仅在 `hard/expert` 难度开启较高预算；`normal` 保持低预算或仅 scorer。
5. 只有当阶段 2 已证明“buff/debuff 目标硬错”被消灭、且仍存在明显次优但非错误决策时，才推进本阶段；否则 lookahead 延后。

### 阶段 4：补测试与诊断证据
**目标文件**：
- 优先复用 `src/games/smashup/__tests__/scoreBases-auto-continue.test.ts`
- 视覆盖面补到 `src/games/smashup/__tests__/smashup.smoke.test.ts`
- 若需要引擎级断言，再看 `src/engine/ai/*`

**工作内容**：
1. 新增 AI 回归样例：
   - player-target：AI 不应把正向 player effect 给敌方。
   - minion-target：AI 不应把 buff 打到敌方随从。
   - debuff/destroy：AI 不应优先打自己。
   - multi-choice：AI 组合应优先累计正收益，而不是固定前 N 项。
2. 对 `resolveNextLocalAiAction` 断言最终选中的 action payload，而不仅是 legalActions 存在。
3. 记录 `providerMetadata.evaluations`，确保失败时能看见 scorer 分数与最终决策。

## Acceptance Criteria
1. 在可复现的 buff 交互里，AI 选择的目标必须属于自己/友军，不得再选择敌方。
2. 在可复现的 debuff/destroy 交互里，AI 选择的目标必须优先命中敌方，不得稳定命中自己。
3. 对于纯等分 interaction-choice，不再依赖 option 数组顺序决定结果；至少存在 1 个 interaction scorer 或 lookahead 分项打破平分。
4. `normal` 难度下 AI 响应延迟不出现明显退化；lookahead 预算保持在现有 difficulty 配置约束内。
5. 现有 SmashUp AI 相关回归测试（尤其 `scoreBases-auto-continue.test.ts` 中的 chain/hidden-choice/refresh 用例）不回退。
6. 所有会影响目标优先级的 SmashUp simple-choice 入口都已完成 inventory；未接入 `_ai/aiHints` 的入口必须显式列为残留，不得隐性遗漏。
7. AI 辅助 metadata 不进入规则处理主载荷；交互 handler 消费的业务 `value` 契约不因本次改造而扩散。
8. 至少有 1 处共享 AI 层代码被 SmashUp 真实复用，而不是把“通用性”只停留在文档命名上。

## 验证步骤
1. 运行与 SmashUp AI 相关的 Vitest 子集，优先单文件：
   - `src/games/smashup/__tests__/scoreBases-auto-continue.test.ts`
   - `src/games/smashup/__tests__/smashup.smoke.test.ts` 中的 AI 片段
2. 对新回归用例断言：
   - `resolution.action.kind`
   - `resolution.action.commands[0].payload`
   - `resolution.action.providerMetadata?.evaluations`（如需）
3. 若迁移到 lookahead，再额外检查不同 difficulty 下的 `confidence` 与 `providerMetadata` 是否仍有输出。

## 风险与缓解
- **风险 1：metadata 改造面太散**
  - **缓解**：先收敛到 helper，禁止在 abilities 里继续写裸 options；仅对无法走 helper 的 player/generic prompt 做补口。
- **风险 2：误把强制自损/指定敌方例外效果也按“友军优先”处理**
  - **缓解**：`effectIntent` 之外允许 `priorityHint` / `forcedTargetPolicy` 明确例外；测试覆盖强制自损卡。
- **风险 3：lookahead 带来性能波动**
  - **缓解**：分阶段启用；先 scorer 后 lookahead；只在 hard/expert 提高预算。
- **风险 4：多选交互语义聚合不准确**
  - **缓解**：先实现线性求和，再用真实失败样例校正；不要第一版就做复杂搜索。
- **风险 5：AI metadata 与规则语义漂移**
  - **缓解**：把 `_ai/aiHints` 定义成集中 schema，要求新增相关交互时同步声明；用静态扫描或测试清单检查裸 prompt。
- **风险 6：过早引入 lookahead 掩盖第一阶段问题**
  - **缓解**：先以 scorer-only 通过硬错验收，再决定是否进入 lookahead 阶段。

## 非目标
- 不在本轮直接实现远程 AI provider。
- 不在本轮构建完整隐藏信息推理/蒙特卡洛搜索。
- 不顺手重写 SmashUp 全部动作评分，只优先修 interaction 目标语义与其前瞻。

## 可用 Agent 类型清单（供后续执行）
- `architect`：评审最终抽象边界与 helper 契约。
- `executor`：实现 SmashUp AI metadata/scorer/lookahead 改造。
- `analyst`：补充卡牌/交互样例盘点。
- `verifier`：复查回归样例、决策 metadata、测试覆盖。
- `test-engineer`：设计并补齐 AI 回归测试。
- `code-reviewer`：在实现完成后做静态审查。
- `explorer`：快速列出仍未接入 metadata 的 player/generic prompt。

## 后续执行建议
### Ralph 串行执行建议
- 车道 1（gpt-5.4/high）：实现 metadata 契约与 SmashUp scorer。
- 车道 2（gpt-5.4/high）：迁移/接入 lookahead，并做性能守门。
- 车道 3（gpt-5.4/high）：补测试与失败样例复盘。

### Team 并行执行建议
- Worker A：`src/games/smashup/domain/abilityHelpers.ts` + 手写 player/generic prompt 的 metadata 接线。
- Worker B：`src/games/smashup/ai.ts` scorer / lookahead 改造。
- Worker C：`src/games/smashup/__tests__/scoreBases-auto-continue.test.ts` 与 smoke 测试补回归。
- Verifier：只做整体验证与 providerMetadata 审核，不改业务逻辑。

### Launch hints
- `omx team run "按 .omx/plans/smashup-ai-buff-targeting-plan.md 执行 SmashUp AI 重构"`
- `$team 按 .omx/plans/smashup-ai-buff-targeting-plan.md 执行，A 负责 metadata，B 负责 ai.ts，C 负责测试，最后 verifier 收口`
- `$ralph 按 .omx/plans/smashup-ai-buff-targeting-plan.md 串行执行，先 metadata/scorer，再 lookahead，再测试`

## Team Verification Path
1. Worker A 证明：目标 option 已普遍带上 relation/effectIntent metadata。
2. Worker B 证明：interaction scorer/ lookahead 真正消费 metadata，而不是继续靠 option 顺序。
3. Worker C 证明：新增回归用例能稳定抓住“buff 给敌方”这类问题。
4. Verifier 证明：在至少 1 个 player-target + 1 个 minion-target + 1 个 multi-choice 场景中，AI 决策 payload 与预期一致。

## Draft Changelog
- v1：基于 SmashUp AI/Interaction/Scoring 现状代码证据形成初稿；推荐采用“语义 metadata + interaction scorer + 分阶段 lookahead”的路线。
- v2：补入 Architect/Critic 反馈：要求先做 simple-choice inventory、AI metadata 与业务 value 分离、为特殊语义保留 override、并把 lookahead 明确设为二阶段可选增强而非默认必做。
