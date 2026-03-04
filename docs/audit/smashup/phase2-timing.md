# D8 时序正确性审计报告

> 审计范围：SmashUp 全部 afterScoring/beforeScoring/onMinionPlayed trigger 回调
> 审计日期：2026-02-27

---

## 7.1 afterScoring/beforeScoring trigger 的 owner vs playerId 审计

### 审计方法
检查所有 afterScoring/beforeScoring trigger 回调中，是否误用 `ctx.playerId`（当前回合玩家）作为卡牌 owner。

### 背景
`fireTriggers` 将 `ctx.playerId`（= 当前回合玩家 `pid`）传递给所有 trigger。但 afterScoring 时，触发效果的实体可能属于非当前回合玩家。如果 trigger 回调直接使用 `ctx.playerId` 作为效果目标，会导致效果错误地应用到当前回合玩家而非卡牌实际拥有者。

### 审计结果

#### ongoing afterScoring triggers

| trigger | 使用的 owner 来源 | 是否正确 |
|---------|-------------------|---------|
| `alien_scout` | `scout.controller`（从 base.minions 查找） | ✅ |
| `pirate_first_mate` | `mate.controller`（从 base.minions 查找） | ✅ |
| `vampire_buffet` | `armed.playerId`（从 pendingAfterScoringSpecials 读取） | ✅ |
| `giant_ant_we_are_the_champions` | `armed.playerId`（从 pendingAfterScoringSpecials 读取） | ✅ |

#### 基地 afterScoring 能力

| 基地 | 使用的 owner 来源 | 是否正确 |
|------|-------------------|---------|
| `base_haunted_house` | `ctx.rankings[0].playerId`（冠军） | ✅ |
| `base_temple_of_goju` | 遍历 `base.minions`，按 `m.owner` 分组 | ✅ |
| `base_great_library` | 遍历 `base.minions`，按 `m.controller` 收集 | ✅ |
| `base_the_mothership` | `ctx.rankings[0].playerId`（冠军） | ✅ |
| `base_ninja_dojo` | `ctx.rankings[0].playerId`（冠军） | ✅ |
| `base_pirate_cove` | 遍历 `ctx.rankings`，排除冠军 | ✅ |
| `base_tortuga` | `ctx.rankings[1].playerId`（亚军） | ✅ |
| `base_wizard_academy` | `ctx.rankings[0].playerId`（冠军） | ✅ |
| `base_ritual_site` | 遍历 `base.minions`，按 `m.owner` 处理 | ✅ |
| `base_golem_schloss` | `ctx.rankings[0].playerId`（冠军） | ✅ |
| `base_miskatonic_university_base` | `ctx.rankings[0].playerId`（冠军） | ✅ |
| `base_greenhouse` | `ctx.rankings[0].playerId`（冠军） | ✅ |
| `base_inventors_salon` | `ctx.rankings[0].playerId`（冠军） | ✅ |

### 7.1 结论：✅ 全部通过。所有 afterScoring trigger 正确使用实体 owner/controller 或 rankings 中的 playerId，未误用 `ctx.playerId`。

---

## 7.2 onMinionPlayed 计数器阈值审计

### 审计方法
grep 所有 `minionsPlayed` 比较操作，验证是否使用 post-reduce 阈值。

### 背景
onPlay/onMinionPlayed 回调在 reduce 之后执行。第一个随从打出后 `minionsPlayed` 已从 0 变为 1。因此"首次打出"的正确判定是 `=== 1`（不是 `=== 0`）。

### 审计结果

| 卡牌 | 条件 | 阈值 | 语义 | 正确性 |
|------|------|------|------|--------|
| `robot_microbot_fixer` | `minionsPlayed > 1` | post-reduce | "之前已打过随从"→不触发 | ✅ |
| `robot_microbot_reclaimer` | `minionsPlayed === 1` | post-reduce | "这是第一个随从"→触发 | ✅ |
| `ninja_acolyte` (special) | `minionsPlayed > 0` | pre-reduce (validate) | "本回合还未打出随从" | ✅ |
| `ghost_spectre` (ongoing) | `minionsPlayed >= minionLimit` | post-reduce | "额度已用完" | ✅ |
| `commands.ts` validate | `minionsPlayed >= minionLimit` | pre-reduce | "额度已用完" | ✅ |

### 7.2 结论：✅ 全部通过。所有计数器阈值与 reduce 时序一致。

---

## 7.3 onMinionPlayed 权威计数器审计

### 审计方法
检查所有"首次打出随从到某基地"的判定是否使用 `minionsPlayedPerBase`（权威计数器）而非 `base.minions.length`（派生状态）。

### 审计结果

| 卡牌/基地 | 判定方式 | 正确性 |
|-----------|---------|--------|
| `base_laboratorium` | `minionsPlayedPerBase?.[baseIndex] ?? 0` !== 1 | ✅ |
| `base_moot_site` | `minionsPlayedPerBase?.[baseIndex] ?? 0` !== 1 | ✅ |
| `base_plateau_of_leng` | `minionsPlayedPerBase?.[baseIndex] ?? 0` !== 1 | ✅ |
| `base_fairy_ring` | `minionsPlayedPerBase?.[baseIndex] ?? 0` !== 1 | ✅ |
| `giant_ant` (ongoing) | `minionsPlayedPerBase?.[baseIndex] ?? 0` > 0 | ✅ |
| `ongoingEffects.ts` restriction | `minionsPlayedPerBase?.[baseIndex] ?? 0` >= limit | ✅ |

**未发现使用 `base.minions.length` 作为"首次打出"判定的情况。**

### 7.3 结论：✅ 全部通过。所有"首次打出"判定使用权威计数器 `minionsPlayedPerBase`。

---

## 总结

| 子任务 | 维度 | 结果 | 发现数 |
|--------|------|------|--------|
| 7.1 | afterScoring owner vs playerId | ✅ 全部通过 | 0 |
| 7.2 | 计数器阈值 post-reduce 一致性 | ✅ 全部通过 | 0 |
| 7.3 | 权威计数器 minionsPlayedPerBase | ✅ 全部通过 | 0 |

**D8 时序正确性审计结论：✅ 全部通过，未发现缺陷。**

> 注：任务 7.4（GameTestRunner 行为测试）将在后续编写。
