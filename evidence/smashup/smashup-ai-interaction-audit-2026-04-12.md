# 大杀四方 AI 交互链路强口径审计（2026-04-12）

## 1. 审计范围
- `src/games/smashup/ai.ts`
- `src/games/smashup/domain/**`
- `src/games/smashup/__tests__/scoreBases-auto-continue.test.ts`
- 对照引擎 watchdog：`src/engine/transport/onlineAiRecovery.ts`

目标：
- 逐类确认 Smash Up AI 是否能为当前交互产出合法命令；
- 确认是否存在“弃牌↔撤回弃牌”或其他重复交互/无解交互导致卡死的风险；
- 明确哪些由游戏层保证，哪些依赖引擎层 watchdog 兜底。

## 2. 权威实现入口
- AI 合法动作生成：`src/games/smashup/ai.ts`
- 交互原语：`src/engine/systems/InteractionSystem.ts`
- 响应窗口推进：`src/engine/systems/ResponseWindowSystem.ts`
- Smash Up 计分/afterScoring 链：`src/games/smashup/domain/scoringSession.ts`
- 反应队列：`src/games/smashup/domain/reactionQueue.ts`
- 在线卡死兜底：`src/engine/transport/onlineAiRecovery.ts`

## 3. 逐类结论

### A. 交互种类结论
- **Smash Up 当前 AI 面向的阻塞交互只有 `simple-choice`**。本轮 grep 未发现本游戏自定义 `slider-choice` / `compare-roll-choice` / `multistep-choice` 落点。
- **AI 优先级正确**：`buildSmashUpAiLegalActions()` 会先处理 `sys.interaction.current`，再处理 `sys.responseWindow.current`，最后才处理普通阶段动作。
  - 结论：当 `afterScoring` 响应窗口与主动选择链并存时，AI 不会越过当前交互直接点响应或结束阶段。

### B. 无解交互结论
- `createSimpleChoice()` 已通过 `ensureResolvableSimpleChoiceOptions()` 注入 `__emergency_skip__`，用于：
  - `empty-options`
  - `all-options-disabled`
  - `min-selection-unreachable`
- `buildInteractionActions()` 会基于 `getFreshSimpleChoiceOptions()` 读取刷新后的选项，因此：
  - **可选交互**：AI 可走空选择 `optionIds: []`
  - **必选但无解交互**：AI 可走 `__emergency_skip__`
- 现有证据：
  - `scoreBases-auto-continue.test.ts`：`required 动态交互在刷新后无合法选项时，AI 仍应拿到紧急跳过动作`
  - `promptSystem.test.ts`：空选项交互时 AI 至少会走 `__emergency_skip__` 或 cancel fallback

### C. afterScoring / reaction queue 结论
- `scoreBases` 阶段中，AI 会先看：
  1. 当前 `simple-choice`
  2. 当前 `responseWindow`
  3. `activate-special`
  4. `advance-phase`
- `canAdvancePhase()` 明确阻止以下错误推进：
  - 当前仍有 `sys.interaction.current`
  - 当前仍有 `sys.responseWindow.current`
  - `scoreBases` 阶段仍存在可激活的 special/talent
- 结论：**Smash Up AI 在 afterScoring 链上已有“先解交互、后推进阶段”的基本门禁，不是靠 UI 禁按钮硬挡。**

### D. “弃牌↔撤回弃牌”风险结论
- 本轮直接审 `src/games/smashup/ai.ts`，**未发现 Smash Up AI 暴露任何 undo / 撤回类动作**：
  - 无 `UNDO`
  - 无 `undo-sell`
  - 无“撤回弃牌”动作生成
- `draw` 阶段只暴露：
  - `discard-to-limit`
  - `advance-phase`
- 结论：**用户此前遇到的“弃牌↔撤回弃牌”循环不是 Smash Up 当前 AI 合法动作集里的原生模式。**

### E. 真正命中的设计风险
- **命中问题：watchdog 的 action-loop 阶段白名单之前漏掉了 Smash Up。**
- 旧实现只覆盖：
  - 通用 `main1/main2/discard/income/upkeep`
  - DiceThrone 掷骰阶段
  - Summoner Wars 阶段
- 结果：
  - 即使 Smash Up AI 在 `playCards / scoreBases / draw` 阶段出现重复动作日志，
  - watchdog 也只会按普通 `active-turn` 看待，而不会提升为 `action-loop`。
- 这不是 Smash Up AI 本身“没有动作”，而是**底层 loop 检测做成了硬编码 phase 白名单，却没把 Smash Up 接进去**。

## 4. 本轮最小修复
- 文件：`src/engine/transport/onlineAiRecovery.ts`
- 修复：把 Smash Up 的以下阶段加入 `AI_LOOP_PHASES`
  - `playCards`
  - `scoreBases`
  - `draw`

效果：
- 若未来 Smash Up 回归出“重复弃牌”“重复 recover”“重复交互解完又重开”的循环，只要它反映到 actionLog 的近期动作模式里，就能被 watchdog 识别为 `action-loop`，优先触发强制推进兜底。

## 5. 新增验证
- 新增测试：`src/games/smashup/__tests__/scoreBases-auto-continue.test.ts`
  - 用例：`Smash Up 若未来回归出弃牌↔回收交替循环，watchdog 也应在本游戏阶段识别为 action-loop`
- 断言：
  - `resolveForceEndTurnForStalledAi(...).reason === 'action-loop'`
  - `loopInfo.pattern === 'alternating'`
  - 恢复命令为 `ADVANCE_PHASE`

## 6. 审计结论
- **结论 1**：Smash Up AI 当前没有暴露“撤回弃牌”类动作，用户描述的那种循环不属于本游戏当前 AI 合法动作集的直接产物。
- **结论 2**：Smash Up 的 `simple-choice / responseWindow / afterScoring` 现有门禁基本完整，AI 先交互、后响应、最后才推进阶段，链路方向正确。
- **结论 3**：本轮真正补到的底层缺口是 **watchdog 对 Smash Up phase 漏挂**；这会削弱“重复动作=卡死”的兜底判定。
- **结论 4**：最小风险修复不是重写 Smash Up AI，而是先把 Smash Up phase 接入现有 `action-loop` 检测。

## 7. 未覆盖风险
- `detectAiActionLoop()` 仍是**全局硬编码 phase 集合**，这说明底层设计仍偏脆弱；后续新增游戏/新阶段时，仍可能再次漏挂。
- 当前 loop 检测只识别：
  - 单动作重复
  - 两动作交替
- 三步以上循环（A→B→C→A）仍可能漏检。

## 8. 后续建议
- 长期正确方案：把“哪些 phase 允许 action-loop 检测”下沉为 **game AI runtime 配置**，不要继续硬编码在 `onlineAiRecovery.ts`。
- 若后续在 Smash Up 看到“同一 interaction/sourceId 连续 reopen”，应再补：
  - `interaction/sourceId` 级别的 reopen 指纹
  - 或 `responseWindow + interaction` 联合循环检测

## 9. 本轮证据路径
- 审计文档：`D:\\gongzuo\\webgame\\BoardGame\\evidence\\smashup\\smashup-ai-interaction-audit-2026-04-12.md`
- 代码修复：`D:\\gongzuo\\webgame\\BoardGame\\src\\engine\\transport\\onlineAiRecovery.ts`
- 测试：`D:\\gongzuo\\webgame\\BoardGame\\src\\games\\smashup\\__tests__\\scoreBases-auto-continue.test.ts`

## 10. 2026-04-12 补充修复：Hoverbot（盘旋机器人）过期 deck-top 选项必须自动失效

**症状**：盘旋机器人揭示牌库顶后，如果在玩家/AI 响应交互前牌库顶发生变化，旧实现仍会继续提供“打出已揭示随从”的选项，导致：  
- validate 失败 / 重复提示；  
- AI legalActions 里出现“stale play”与“skip”并存，增加循环/卡死风险。

**修复**：`src/games/smashup/abilities/robots.ts`  
`robotHoverbot` 的 `optionsGenerator` 现在会检查当前牌库顶 `uid` 是否仍等于 `continuationContext.cardUid`；若不一致，则只返回 `skip` 选项。

**验证**：`src/games/smashup/__tests__/scoreBases-auto-continue.test.ts`  
用例：`盘旋机器人揭示的牌已不再位于牌库顶时，AI 应只保留 skip，不再尝试 stale play`（本轮已通过）。

---

## 11. 2026-04-12 二次续审：Smash Up AI 交互全链路枚举结果

### 11.1 交互入口枚举
- **AI 主入口**：`src/games/smashup/ai.ts`
  - `buildSmashUpAiLegalActions()`：固定顺序为 `interaction.current → responseWindow.current → phase actions`
  - `buildInteractionActions()`：负责 `simple-choice` 的 live refresh、多选组合、空选/跳过动作
  - `buildResponseWindowActions()`：`response-pass + 可在窗口中打出的牌`
- **afterScoring / auto-continue 主链**：
  - `src/games/smashup/domain/scoringSession.ts`
  - `src/games/smashup/domain/reactionQueue.ts`
  - `src/games/smashup/domain/baseAbilities.ts`
  - `src/games/smashup/domain/ongoingEffects.ts`
- **会进入动态选项刷新的能力簇（grep `optionsGenerator/autoRefresh`）**：
  - `abilities/aliens.ts`
  - `abilities/cthulhu.ts`
  - `abilities/frankenstein.ts`
  - `abilities/cowboys.ts`
  - `abilities/ghosts.ts`
  - `abilities/giant_ants.ts`
  - `abilities/robots.ts`
  - `abilities/miskatonic.ts`
  - `abilities/titans.ts`
  - `abilities/vampires.ts`
  - `abilities/vikings.ts`
  - `abilities/zombies.ts`
  - `abilities/wizards.ts`
  - `domain/baseAbilities.ts`
  - `domain/extraPlay.ts`

### 11.2 静态审计重点结论
- **已做动态刷新的高风险链**：Hoverbot、Cast the Runes、Raiding Party、大量 discard/hand 多选交互，整体方向正确。
- **afterScoring 主链方向正确**：Smash Up AI 不会绕过当前交互直接去点 response-window 或 `advance-phase`。
- **真实新增命中点不在引擎层，而在 Smash Up 自身 AI/提示数据契约**：`multi + min=0 + skip按钮 + 动态来源` 的组合，仍可能制造冗余/过期/混合动作。

## 12. 本轮新命中的具体问题

### A. `robot_microbot_reclaimer` 的 discard 多选交互仍有 AI 风险
- 文件：`src/games/smashup/abilities/robots.ts`
- 旧实现问题：
  1. `multi.min = 0` 时仍手工塞了 `skip` 按钮，AI 会把它当普通选项参与组合。
  2. 没有 `optionsGenerator/autoRefresh`，弃牌堆若发生变化，交互候选会陈旧。
  3. `responseValidationMode` 未显式 live，AI 只能依赖旧 options 快照。
- 风险表现：
  - 产生 `skip + card` 这种语义错误的组合动作；
  - 产生已不在弃牌堆中的过期微型机选项；
  - 给“AI 卡死/无效动作”制造噪音空间。

### B. `buildInteractionActions()` 对 `optional multi` 交互存在通用 AI 冗余
- 文件：`src/games/smashup/ai.ts`
- 旧实现问题：
  1. 对 `min=0` prompt 先手工塞一条空选择动作；
  2. 再用组合枚举把空组合重复枚举一次；
  3. 对显式 `skip/done/cancel` 控制按钮没有做“不可与实体牌共选”的裁决。
- 风险表现：
  - 同一 prompt 出现重复“空选择”动作；
  - 出现 `skip + card` / `cancel + card` 这类根本不该给 AI 的混合动作；
  - 动作空间膨胀，增加错误评分与循环概率。

## 13. 本轮最小修复

### 修复 1：`robot_microbot_reclaimer` 改成真正的 optional multi live prompt
- 文件：`src/games/smashup/abilities/robots.ts`
- 调整：
  - 删除显式 `skip` 按钮
  - `multi.min=0` 保留，改为“可不选”
  - 增加 `autoRefresh: 'discard'`
  - 增加 `responseValidationMode: 'live'`
  - 增加 `optionsGenerator`，按最新弃牌堆 + `isDiscardMicrobot()` 重新生成选项
- 结果：
  - AI 与真人都只看到“当前仍合法”的微型机列表
  - 不再出现 `skip + card` 这种多选混合语义

### 修复 2：Smash Up AI 层统一收紧 optional multi 组合
- 文件：`src/games/smashup/ai.ts`
- 调整：
  - `min=0` 且已显式提供 `skip/done/cancel` 控制按钮时，不再额外注入空选择动作
  - 多选组合枚举时，禁止把 `skip/done/cancel` 与实体牌混在同一组合
  - 组合阶段不再重复生成空组合
- 结果：
  - `optional multi` AI 动作集变得稳定、去重、语义正确
  - 对其它 Smash Up 多选 prompt 也产生正向收敛效果

## 14. 新增/更新验证

### 14.1 `src/games/smashup/__tests__/robotAbilities.test.ts`
- 新断言：
  - `robot_microbot_reclaimer` 在 `min=0` 下**不再带显式 skip**
  - refresh 后 AI 不再拿到过期微型机
  - AI 不再生成 `skip + card` 混合动作
- 命令：
  - `node scripts/infra/vitest-cli-safe.mjs run src/games/smashup/__tests__/robotAbilities.test.ts --configLoader native --environment node`
- 结果：`11 passed`

### 14.2 `src/games/smashup/__tests__/scoreBases-auto-continue.test.ts`
- 新断言：
  - 对显式带 `skip` 的 `optional multi` prompt，AI 不再重复生成空选择，也不再生成 `skip + card` 混合组合
- 命令：
  - `node scripts/infra/vitest-cli-safe.mjs run src/games/smashup/__tests__/scoreBases-auto-continue.test.ts --configLoader native --environment node`
- 结果：`23 passed`

### 14.3 静态校验
- `node .\\node_modules\\eslint\\bin\\eslint.js src/games/smashup/abilities/robots.ts src/games/smashup/ai.ts src/games/smashup/__tests__/robotAbilities.test.ts src/games/smashup/__tests__/scoreBases-auto-continue.test.ts`
- 结果：`0 error / 6 warnings`
- `node .\\node_modules\\typescript\\bin\\tsc --noEmit --pretty false`
- 结果：通过

## 15. 当前未覆盖/后续风险
- 仍存在大量历史 `any` 警告，但本轮新增改动未引入 eslint error。
- Smash Up 内仍有少量 `multi.min=0 + 显式 skip` 设计残留；本轮 AI 组合层已兜底，但从**能力定义本身**继续清理冗余 skip，仍是更正确方向。
- 本轮未把所有 sourceId 逐一改成“无 skip + 纯空选择”；只先修了命中真实风险的 `robot_microbot_reclaimer`，并在 AI 层加统一裁决，属于“先止卡死、再逐能力清债”的策略。
