# D8 子项：写入-消费窗口对齐审计报告

> 审计范围：SmashUp 全部临时状态的写入时机、消费窗口、清理时机
> 审计日期：2026-02-27

---

## 8.1 SmashUp 完整阶段时间线

```
factionSelect → startTurn → playCards → scoreBases → draw → endTurn → startTurn → ...
                    │            │            │          │        │
                    │            │            │          │        └─ TURN_ENDED
                    │            │            │          └─ 抽2张牌
                    │            │            └─ Me First! → beforeScoring → 排名 → BASE_SCORED → afterScoring → BASE_CLEARED → BASE_REPLACED
                    │            └─ 打随从/行动/天赋/特殊（循环直到玩家结束）
                    └─ TURN_STARTED（清理上回合状态）→ 基地 onTurnStart → ongoing onTurnStart
```

### 临时状态写入-消费-清理时间线

| 临时状态 | 写入时机 | 消费窗口 | 清理时机 | 对齐 |
|----------|---------|---------|---------|------|
| `minionLimit` | TURN_STARTED(=1) / LIMIT_MODIFIED(+N) | playCards 阶段 validate | TURN_STARTED(=1) | ✅ |
| `minionsPlayed` | MINION_PLAYED reduce(+1) | playCards 阶段 validate | TURN_STARTED(=0) | ✅ |
| `actionLimit` | TURN_STARTED(=1) / LIMIT_MODIFIED(+N) | playCards 阶段 validate | TURN_STARTED(=1) | ✅ |
| `actionsPlayed` | ACTION_PLAYED reduce(+1) | playCards 阶段 validate | TURN_STARTED(=0) | ✅ |
| `baseLimitedMinionQuota` | LIMIT_MODIFIED(restrictToBase) | playCards 阶段 validate | TURN_STARTED(=undefined) | ✅ |
| `extraMinionPowerMax` | LIMIT_MODIFIED(powerMax) | playCards 阶段 validate | TURN_STARTED(=undefined) | ✅ |
| `sameNameMinionRemaining` | LIMIT_MODIFIED(sameNameOnly) | playCards 阶段 validate | TURN_STARTED(=undefined) | ✅ |
| `sameNameMinionDefId` | LIMIT_MODIFIED(sameNameDefId) | playCards 阶段 validate | TURN_STARTED(=null) | ✅ |
| `minionsPlayedPerBase` | MINION_PLAYED reduce | onMinionPlayed triggers | TURN_STARTED(=undefined) | ✅ |
| `tempPowerModifier` | TEMP_POWER_ADDED reduce | 力量计算（全阶段） | TURN_STARTED(=0) | ✅ |
| `talentUsed` | TALENT_USED reduce | USE_TALENT validate | TURN_STARTED(=false) | ✅ |
| `specialLimitUsed` | SPECIAL_LIMIT_USED reduce | ACTIVATE_SPECIAL validate | TURN_STARTED(=undefined) | ✅ |
| `pendingAfterScoringSpecials` | SPECIAL_AFTER_SCORING_ARMED | afterScoring triggers | TURN_STARTED(=undefined) | ✅ |
| `scoringEligibleBaseIndices` | onPhaseEnter(scoreBases) | scoreBases 阶段 | TURN_STARTED(=undefined) | ✅ |
| `tempBreakpointModifiers` | BREAKPOINT_MODIFIED | scoreBases 阶段 | TURN_STARTED(=undefined) | ✅ |
| `turnDestroyedMinions` | MINION_DESTROYED reduce | ongoing triggers | TURN_STARTED(=[]) | ✅ |
| `sleepMarkedPlayers` | 上回合写入 | TURN_STARTED(检查) | TURN_STARTED(清除) | ✅ |

---

## 8.2 grantExtraMinion/grantExtraAction 写入时机审计

### 审计方法
检查所有 `grantExtraMinion`/`grantExtraAction` 的写入时机是否在 playCards 阶段消费窗口之前或之内。

### 写入时机分类

#### A. playCards 阶段内写入（onPlay/onMinionPlayed 回调）— 消费窗口内 ✅

| 卡牌 | 触发时机 | 写入时机 |
|------|---------|---------|
| `wizard_summon` | onPlay | playCards 阶段内 |
| `wizard_chronomage` | onPlay | playCards 阶段内 |
| `wizard_time_loop` | onPlay | playCards 阶段内 |
| `wizard_winds_of_change` | onPlay | playCards 阶段内 |
| `killer_plant_insta_grow` | onPlay | playCards 阶段内 |
| `killer_plant_blossom` | onPlay | playCards 阶段内 |
| `ghost_ghostly_arrival` | onPlay | playCards 阶段内 |
| `robot_zapbot` | onPlay | playCards 阶段内 |
| `robot_microbot_fixer` | onPlay(onMinionPlayed) | playCards 阶段内 |
| `robot_microbot_reclaimer` | onPlay(onMinionPlayed) | playCards 阶段内 |
| `robot_hoverbot` | onPlay | playCards 阶段内 |
| `zombie_outbreak` | onPlay | playCards 阶段内 |
| `zombie_they_keep_coming` | onPlay | playCards 阶段内 |
| `bear_cavalry_commission` | onPlay | playCards 阶段内 |
| `frankenstein_the_monster` | talent | playCards 阶段内 |
| `frankenstein_its_alive` | onPlay | playCards 阶段内 |
| `miskatonic_professor` | talent | playCards 阶段内 |
| `miskatonic_lost_knowledge` | talent | playCards 阶段内 |
| `miskatonic_psychological_profiling` | onPlay | playCards 阶段内 |
| `innsmouth_recruitment` | onPlay | playCards 阶段内 |
| `innsmouth_sacred_circle` | talent | playCards 阶段内 |
| `innsmouth_spreading_the_word` | onPlay | playCards 阶段内 |
| `elder_thing_touch_of_madness` | onPlay | playCards 阶段内 |
| `steampunk_change_of_venue` | onPlay | playCards 阶段内 |
| `werewolf_leader_of_the_pack` | talent(ongoing) | playCards 阶段内 |
| `killer_plant_sprout` | onTurnStart(ongoing) | startTurn → playCards 之前 |
| `killer_plant_venus_man_trap` | talent | playCards 阶段内 |
| `ghost_the_dead_rise` | onPlay | playCards 阶段内 |

#### B. startTurn 阶段写入（onTurnStart 基地能力/ongoing）— playCards 之前 ✅

| 卡牌/基地 | 触发时机 | 写入时机 |
|-----------|---------|---------|
| `base_secret_garden` | onTurnStart | startTurn 阶段（playCards 之前） |
| `base_the_homeworld` | onMinionPlayed | playCards 阶段内 |
| `base_fairy_ring` | onMinionPlayed | playCards 阶段内 |
| `cthulhu_altar` (ongoing) | onMinionPlayed | playCards 阶段内 |
| `wizard_archmage` (ongoing) | onTurnStart / onMinionPlayed | startTurn 或 playCards 阶段内 |
| `trickster_enshrouding_mist` (ongoing) | onTurnStart | startTurn 阶段（playCards 之前） |

### 8.2 结论：✅ 全部通过。所有额度写入发生在 playCards 消费窗口之前或之内。

---

## 8.3 基地能力额度授予时机重点审查

| 基地 | 描述 | 写入时机 | 消费窗口 | 清理时机 | 对齐 |
|------|------|---------|---------|---------|------|
| `base_the_homeworld` | 每打出随从+1额度(力量≤2) | onMinionPlayed(playCards内) | playCards | TURN_STARTED | ✅ |
| `base_secret_garden` | 回合开始+1额度(力量≤2,此基地) | onTurnStart(startTurn) | playCards | TURN_STARTED | ✅ |
| `base_fairy_ring` | 首次打出随从+1随从+1行动 | onMinionPlayed(playCards内) | playCards | TURN_STARTED | ✅ |
| `base_plateau_of_leng` | 首次打出随从+1同名额度 | onMinionPlayed(playCards内) | playCards | TURN_STARTED | ✅ |
| `trickster_enshrouding_mist` | 回合开始+1基地限定额度 | onTurnStart(startTurn) | playCards | TURN_STARTED | ✅ |

### 8.3 结论：✅ 全部通过。基地能力的额度授予时机均在消费窗口之前或之内，清理在下回合 TURN_STARTED。

---

## 总结

| 子任务 | 维度 | 结果 | 发现数 |
|--------|------|------|--------|
| 8.1 | 阶段时间线 + 临时状态对齐 | ✅ 全部对齐 | 0 |
| 8.2 | grantExtra* 写入时机 | ✅ 全部在消费窗口内 | 0 |
| 8.3 | 基地能力额度授予时机 | ✅ 全部正确 | 0 |

**D8 写入-消费窗口对齐审计结论：✅ 全部通过，未发现写入-消费窗口不对齐的情况。**
