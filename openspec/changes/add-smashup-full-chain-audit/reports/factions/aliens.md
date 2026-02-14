# 外星人（Aliens）全链路审查

> 对应任务：`tasks.md` 2.1 + 2.4（基础派系逐张审查 + 六层矩阵）
> 
> 描述源：`public/locales/zh-CN/game-smashup.json` 的 `alien_*`

## 1. 独立交互链拆分

1. `alien_supreme_overlord.return_minion`
2. `alien_collector.return_power_le3`
3. `alien_invader.gain_vp`
4. `alien_disintegrate.return_power_le3`
5. `alien_crop_circles.choose_base_then_return`
6. `alien_beaming_down.choose_opponent`
7. `alien_beaming_down.decide_to_deck_or_keep`
8. `alien_probe.choose_opponent_reveal`
9. `alien_probe.deck_choice_top_or_bottom`
10. `alien_scout.search_minion`
11. `alien_terraform.replace_base`
12. `alien_scout_ship_1.reveal_deck_top`
13. `alien_scout_ship_2.reveal_hand`
14. `alien_jammed_signals.restriction`
15. `alien_jammed_signals.self_destruct_on_turn_start`

## 2. 独立交互链 × 六层矩阵

| 交互链 | 定义层 | 执行层 | 状态层 | 验证层 | UI层 | 测试层 | 结论 |
|---|---|---|---|---|---|---|---|
| `alien_supreme_overlord.return_minion` | ✅ `aliens.ts::registerAbility` | ⚠️ `aliens.ts::alienSupremeOverlord`（仅筛对手） | ✅ `reduce.ts::MINION_RETURNED` | ✅ `commands.ts::PLAY_MINION` 基础校验 | ✅ `createSimpleChoice(sourceId=alien_supreme_overlord)` | 📝 无针对性行为断言 | ⚠️ 描述源冲突待确认 |
| `alien_collector.return_power_le3` | ✅ `aliens.ts::registerAbility` | ⚠️ `aliens.ts::alienCollector`（仅筛对手） | ✅ `reduce.ts::MINION_RETURNED` | ✅ `commands.ts::PLAY_MINION` 基础校验 | ✅ `createSimpleChoice(sourceId=alien_collector)` | ⚠️ `factionAbilities.test.ts` 仅测 Prompt 创建 | ⚠️ 描述源冲突 + 测试深度不足 |
| `alien_invader.gain_vp` | ✅ `aliens.ts::registerAbility` | ✅ `aliens.ts::alienInvader` | ✅ `reduce.ts::VP_AWARDED` | ✅ 基础命令合法性 | ✅ 无额外交互需求 | ✅ `factionAbilities.test.ts::alien_invader` | ✅ |
| `alien_disintegrate.return_power_le3` | ✅ `aliens.ts::registerAbility` | ⚠️ `aliens.ts::alienDisintegrate`（仅筛对手） | ✅ `reduce.ts::MINION_RETURNED` | ✅ `commands.ts::PLAY_ACTION` 基础校验 | ✅ `createSimpleChoice(sourceId=alien_disintegrate)` | ⚠️ `factionAbilities.test.ts` 仅测 Prompt 创建 | ⚠️ 描述源冲突 + 测试深度不足 |
| `alien_crop_circles.choose_base_then_return` | ✅ `aliens.ts::registerAbility` | ⚠️ `aliens.ts::returnAllMinionsFromBase`（实现为“全返还”，非“任意数量”） | ✅ `reduce.ts::MINION_RETURNED` | ✅ 基础命令合法性 | ✅ `createSimpleChoice(sourceId=alien_crop_circles)` | ⚠️ `promptResponseChain.test.ts` 偏链路，不校验“任意数量” | ⚠️ 行为偏差 |
| `alien_beaming_down.choose_opponent` | ✅ `aliens.ts::registerAbility` | ✅ `aliens.ts::alienBeamingDown` | ✅ `reduce.ts::REVEAL_HAND` | ✅ 基础命令合法性 | ✅ `sourceId=alien_beaming_down_choose_opponent` | 📝 缺少端到端分支断言 | 📝 测试缺失 |
| `alien_beaming_down.decide_to_deck_or_keep` | ✅ `aliens.ts::registerAlienInteractionHandlers` | ✅ `handler: alien_beaming_down_decide` | ✅ `reduce.ts::CARD_TO_DECK_TOP` | ✅ 由交互解算驱动 | ✅ 链式 Prompt 正常 | 📝 缺少 keep/to_deck 双分支断言 | 📝 测试缺失 |
| `alien_probe.choose_opponent_reveal` | ✅ `aliens.ts::registerAbility` | ✅ `aliens.ts::alienProbe` | ✅ `reduce.ts::REVEAL_HAND/REVEAL_DECK_TOP` | ✅ 基础命令合法性 | ✅ `sourceId=alien_probe_choose_opponent` | ⚠️ `revealSystem.test.ts` 验证写入状态，非完整业务链 | ⚠️ 测试深度不足 |
| `alien_probe.deck_choice_top_or_bottom` | ✅ `registerAlienInteractionHandlers` | ✅ `handler: alien_probe_deck_choice` | ✅ `reduce.ts::CARD_TO_DECK_BOTTOM` | ✅ 交互解算链 | ✅ 链式 Prompt 正常 | 📝 缺少 top/bottom 分支断言 | 📝 测试缺失 |
| `alien_scout.search_minion` | ✅ `aliens.ts::registerAbility` | ✅ `aliens.ts::alienScout` | ✅ `reduce.ts::CARDS_DRAWN` | ✅ 基础命令合法性 | ✅ `sourceId=alien_scout` | ✅ `query6Abilities.test.ts` 覆盖多场景 | ✅ |
| `alien_terraform.replace_base` | ✅ `aliens.ts::registerAbility` | ⚠️ `handler: alien_terraform`（固定使用 `baseDeck[0]`，未“搜寻一张基地”） | ✅ `reduce.ts::BASE_REPLACED` | ✅ 基础命令合法性 | ✅ `sourceId=alien_terraform` | 📝 缺少替换目标与牌库来源断言 | ⚠️ 行为偏差 |
| `alien_scout_ship_1.reveal_deck_top` | ✅ `aliens.ts::registerAbility` | ✅ `aliens.ts::alienScoutShip` + handler | ✅ `reduce.ts::REVEAL_DECK_TOP` | ✅ 基础命令合法性 | ✅ `sourceId=alien_scout_ship_choose_player` | ⚠️ `revealSystem.test.ts` 仅事件状态层 | ⚠️ 测试深度不足 |
| `alien_scout_ship_2.reveal_hand` | ✅ `aliens.ts::registerAbility` | ✅ `aliens.ts::alienScoutShipHand` + handler | ✅ `reduce.ts::REVEAL_HAND` | ✅ 基础命令合法性 | ✅ `sourceId=alien_scout_ship_hand_choose_opponent` | 📝 缺少专门行为断言 | 📝 测试缺失 |
| `alien_jammed_signals.restriction` | ✅ `aliens.ts` `registerRestriction` | ✅ `alienJammedSignalsRestriction` | ✅ 限制通过验证层生效 | ✅ `ongoingEffects.ts::isOperationRestricted` + `commands.ts` 调用 | ✅ 无额外交互 | 📝 缺少对 `play_minion/play_action` 双限制断言 | 📝 测试缺失 |
| `alien_jammed_signals.self_destruct_on_turn_start` | ✅ `aliens.ts` `registerTrigger` | ✅ `alienJammedSignalsDestroyTrigger` | ✅ `reduce.ts::ONGOING_DETACHED` | ✅ `reducer.ts::fireTriggers` onTurnStart 链 | ✅ 无额外交互 | 📝 缺少回合触发自毁断言 | 📝 测试缺失 |

## 3. 关键问题（带证据）

### ⚠️ 实现偏差

1. **`alien_crop_circles` 未实现“任意数量”选择**
   - 描述：`game-smashup.json` 指定“任意数量” @ `cards.alien_crop_circles.effectText`
   - 代码：`aliens.ts::returnAllMinionsFromBase` 当前会把基地所有随从全部返回
   - 影响：规则自由度丢失，可能改变策略结果

2. **`alien_terraform` 未实现“从牌组搜寻一张基地”**
   - 描述：`game-smashup.json` 要求“从牌组搜寻一张基地并替换”
   - 代码：`aliens.ts` interaction handler 直接使用 `state.core.baseDeck[0]`
   - 影响：可选性缺失，行为弱化为“替换为牌库顶”

### ⚠️ 描述源冲突（需确认）

3. **`alien_supreme_overlord` / `alien_collector` / `alien_disintegrate` 目标范围**
   - 描述文本写法是“一个随从/本基地一个随从”
   - 代码实现均限定 `controller !== ctx.playerId`
   - 当前结论：按本次 i18n 口径记为冲突，待规则权威文档确认最终口径

### 📝 测试缺失/深度不足

4. 缺少对以下链路的行为断言：
   - `alien_beaming_down` 两段分支
   - `alien_probe_deck_choice` top/bottom 分支
   - `alien_terraform` 搜寻与替换语义
   - `alien_jammed_signals` 限制与自毁触发

5. `interactionCompletenessAudit` 的外星人映射存在语义偏差风险：
   - 当前把 `alien_scout_ship_hand_choose_opponent` 建模为 `alien_scout_ship_choose_player` 的后续链
   - 但代码中它是 `alien_scout_ship_2` 的直接 sourceId（并非链式产物）
   - 风险：审计清单与真实业务链不一致，可能掩盖覆盖缺口

## 4. 修复建议（按优先级）

1. **P0（规则正确性）**：修复 `alien_crop_circles`（支持“任意数量”目标选择）
2. **P0（规则正确性）**：修复 `alien_terraform`（增加基地牌库可选搜索流程）
3. **P1（口径一致性）**：确认 3 张“返回随从”卡（`supreme_overlord/collector/disintegrate`）目标范围的权威规则来源
4. **P1（测试补全）**：补齐 `beaming_down/probe/terraform/jammed_signals` 的正向+负向+边界测试
5. **P2（审计机制一致性）**：修正 `interactionCompletenessAudit` 外星人 sourceId 建模
