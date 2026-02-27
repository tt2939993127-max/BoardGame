# D1 子项 — 实体筛选范围操作清单（Phase 2 审计）

> 审计范围：`src/games/smashup/abilities/` 基础版 8 派系 + `domain/baseAbilities.ts` + `domain/abilityHelpers.ts`
> 审计模式：`.filter()` / `.find()` / `for...of` / `for(let...)` 实体收集操作
> 生成时间：Task 5.1

---

## 清单格式说明

| 列 | 含义 |
|----|------|
| 文件 | 源文件名 |
| 行号 | 大致行号 |
| 卡牌/能力 | 对应的 defId |
| 操作类型 | filter / find / for...of / for(let) |
| 实体类型 | minion / base / card / player / ongoing |
| 筛选条件 | 代码中的过滤条件摘要 |
| 范围 | 本基地 / 所有基地 / 其他基地 / 弃牌堆 / 手牌 / 牌库 |
| 归属 | 己方 / 对手 / 所有 / 特定玩家 |

---

## 一、外星人（Aliens）— `abilities/aliens.ts`

| 行号 | 卡牌/能力 | 操作 | 实体 | 筛选条件 | 范围 | 归属 |
|------|-----------|------|------|----------|------|------|
| 55-60 | alien_supreme_overlord | for(let)+for...of | minion | `m.uid !== ctx.cardUid`（排除自身） | 所有基地 | 所有 |
| 88-90 | alien_collector | .filter() | minion | `getMinionPower() <= 3` | 本基地 | 所有 |
| 135 | alien_scout (afterScoring) | .filter() | minion | `m.defId === 'alien_scout'` | 本基地（计分基地） | 所有 |
| 168-175 | alien_invasion | for(let)+for...of | minion | 无过滤（所有随从） | 所有基地 | 所有 |
| 194-201 | alien_disintegrator | for(let)+for...of | minion | `getMinionPower() <= 3` | 所有基地 | 所有 |
| 211-218 | alien_beam_up | for(let)+for...of | minion | 无过滤（所有随从） | 所有基地 | 所有 |
| 226-232 | alien_crop_circles | for(let) | base | `base.minions.length > 0` | 所有基地 | N/A |
| 240 | alien_probe | .filter() | player | `pid !== ctx.playerId` | 所有玩家 | 对手 |
| 278-281 | alien_terraform | for(let) | base | 无过滤（所有基地） | 所有基地 | N/A |
| 294-300 | alien_abduction | for(let)+for...of | minion | 无过滤（所有随从） | 所有基地 | 所有 |
| 313-320 | buildCropCirclesReturnEvents | .filter()+.filter() | minion | `selectedSet.has(m.uid)` + 保护检查 | 本基地 | 所有 |
| ~590 | alien_terraform_play_minion (handler) | .filter() | card | `card.type === 'minion'` | 手牌 | 己方 |
| ~635 | alien_terraform_play_minion (handler) | .find() | card | `card.uid === selected.cardUid && card.type === 'minion'` | 手牌 | 己方 |

---

## 二、恐龙（Dinosaurs）— `abilities/dinosaurs.ts`

| 行号 | 卡牌/能力 | 操作 | 实体 | 筛选条件 | 范围 | 归属 |
|------|-----------|------|------|----------|------|------|
| 50-52 | dino_laser_triceratops | .filter() | minion | `m.uid !== ctx.cardUid && getMinionPower() <= 2` | 本基地 | 所有 |
| 80-84 | dino_augmentation | for(let)+for...of | minion | 无过滤（所有随从） | 所有基地 | 所有 |
| 105-110 | dino_howl | for(let)+for...of | minion | `m.controller === ctx.playerId` | 所有基地 | 己方 |
| 118-130 | dino_natural_selection | for(let)+for...of | minion | `m.controller === ctx.playerId` + `hasTarget`（同基地有力量更低的） | 所有基地 | 己方（参照）|
| 160-170 | dino_survival_of_the_fittest | for(let)+for...of | minion | `getMinionPower() === minPower`（最低力量） | 所有基地 | 所有 |
| 160 | dino_survival_of_the_fittest | .filter() | minion | `getMinionPower() === minPower` | 本基地（循环内） | 所有 |
| 220-225 | dino_rampage | for(let) | base | `base.minions.some(m => m.controller === ctx.playerId)` | 所有基地 | 有己方随从的 |
| 230 | dino_rampage | .filter() | minion | `m.controller === ctx.playerId` | 本基地 | 己方 |
| 310 | dino_natural_selection (handler) | for...of | minion | `m.uid !== myMinion.uid && getMinionPower() < myPower` | 本基地 | 所有 |
| 380 | dino_rampage (handler) | .filter() | minion | `m.controller === playerId` | 本基地 | 己方 |
| 460 | dino_tooth_and_claw (interceptor) | .find() | minion | `m.uid === targetUid` | 本基地 | 所有 |
| 460 | dino_tooth_and_claw (interceptor) | .find() | ongoing | `a.defId === 'dino_tooth_and_claw'` | 附着卡 | 所有 |
| 490 | dino_wildlife_preserve | .some() | ongoing | `a.defId === 'dino_wildlife_preserve' && a.ownerId === controller` | 本基地 | 己方 |

---

## 三、忍者（Ninjas）— `abilities/ninjas.ts`

| 行号 | 卡牌/能力 | 操作 | 实体 | 筛选条件 | 范围 | 归属 |
|------|-----------|------|------|----------|------|------|
| 47 | ninja_master | .filter() | minion | `m.uid !== ctx.cardUid` | 本基地 | 所有 |
| 69 | ninja_tiger_assassin | .filter() | minion | `m.uid !== ctx.cardUid && getMinionPower() <= 3` | 本基地 | 所有 |
| 89-96 | ninja_seeing_stars | for(let)+for...of | minion | `getMinionPower() <= 3` | 所有基地 | 所有 |
| 131 | ninja_poison (onPlay) | .find() | minion | `m.uid === ctx.targetMinionUid` | 本基地 | 所有 |
| 152-162 | ninja_infiltrate (onPlay) | for...of | ongoing | `o.uid !== ctx.cardUid`（排除自身） | 本基地 | 所有 |
| 152-162 | ninja_infiltrate (onPlay) | for...of+for...of | ongoing | 随从附着卡 `a.uid !== ctx.cardUid` | 本基地 | 所有 |
| 200-210 | ninja_way_of_deception | for(let)+for...of | minion | `m.controller !== ctx.playerId` → continue（只收集己方） | 所有基地 | 己方 |
| 232 | ninja_disguise | for(let) | base | `base.minions.filter(m => m.controller === ctx.playerId).length > 0` | 所有基地 | 有己方随从的 |
| 253 | ninja_disguise_select | .filter() | minion | `m.controller === ctx.playerId` | 本基地 | 己方 |
| 256 | ninja_disguise_select | .filter() | card | `c.type === 'minion' && c.uid !== ctx.cardUid` | 手牌 | 己方 |
| 300 | ninja_hidden_ninja | .filter() | card | `c.type === 'minion'` | 手牌 | 己方 |
| 340 | ninja_acolyte | .filter() | card | `c.type === 'minion'` | 手牌 | 己方 |
| 400-410 | ninja_smoke_bomb (trigger) | for...of+for...of+for...of | ongoing | `attached.defId === 'ninja_smoke_bomb' && attached.ownerId === playerId` | 所有基地 | 己方 |
| 430-445 | ninja_assassination (trigger) | for(let)+for...of | minion | `m.attachedActions.find(a => a.defId === 'ninja_assassination')` | 所有基地 | 所有 |
| 455-465 | ninja_infiltrate (trigger) | for(let)+for...of+for...of | ongoing | `a.defId === 'ninja_infiltrate' && a.ownerId === playerId` | 所有基地 | 己方 |
| 610 | ninja_disguise (handler) | .filter() | card | `c.type === 'minion' && !playedUids.includes(c.uid)` | 手牌 | 己方 |
| 590 | ninja_disguise (handler) | .filter() | minion | `m.controller === playerId` | 本基地 | 己方 |
| 590 | ninja_disguise (handler) | .filter() | card | `c.type === 'minion' && c.uid !== ctx?.cardUid` | 手牌 | 己方 |

---

## 四、海盗（Pirates）— `abilities/pirates.ts`

| 行号 | 卡牌/能力 | 操作 | 实体 | 筛选条件 | 范围 | 归属 |
|------|-----------|------|------|----------|------|------|
| 53-55 | pirate_saucy_wench | .filter() | minion | `m.uid !== ctx.cardUid && getMinionPower() <= 2` | 本基地 | 所有 |
| 79-92 | pirate_broadside | for(let)+for...of | minion | `m.controller !== ctx.playerId && getMinionPower() <= 2` | 所有基地（有己方随从的） | 对手 |
| 107-117 | pirate_cannon | for(let)+for...of | minion | `getMinionPower() <= 2` | 所有基地 | 所有 |
| 136-142 | pirate_swashbuckling | for(let)+for...of | minion | `m.controller === ctx.playerId` | 所有基地 | 己方 |
| 160-175 | pirate_full_sail (buildFullSailChooseMinionInteraction) | for(let)+for...of | minion | `m.controller === playerId && !movedUids.includes(m.uid)` | 所有基地 | 己方 |
| 210-220 | pirate_buccaneer (onDestroyed) | for(let) | base | `i !== baseIndex`（排除当前基地） | 其他基地 | N/A |
| 280-295 | pirate_king (beforeScoring) | for(let)+for...of | minion | `m.defId === 'pirate_king'` | 其他基地（非计分基地） | 所有 |
| 330-335 | pirate_first_mate (afterScoring) | .filter() | minion | `m.defId === 'pirate_first_mate'` | 本基地（计分基地） | 所有 |
| 335 | pirate_first_mate (afterScoring) | .filter() | base | `b.index !== scoringBaseIndex` | 其他基地 | N/A |
| 385-395 | pirate_dinghy | for(let)+for...of | minion | `m.controller === ctx.playerId` | 所有基地 | 己方 |
| 410-420 | pirate_shanghai | for(let)+for...of | minion | `m.controller === ctx.playerId → continue`（只收集对手） | 所有基地 | 对手 |
| 445-460 | pirate_sea_dogs | for...of+for...of | minion | `m.controller === ctx.playerId → continue`（对手随从的派系） | 所有基地 | 对手 |
| 470-480 | pirate_powderkeg | for(let)+for...of | minion | `m.controller !== ctx.playerId → continue`（只收集己方） | 所有基地 | 己方 |
| ~560 | pirate_broadside (handler) | for...of | minion | `m.controller === opponentId && getMinionPower() <= 2` | 本基地 | 特定对手 |
| ~580 | pirate_cannon (handler) | for(let)+for...of | minion | `m.uid !== minionUid && getMinionPower() <= 2` | 所有基地 | 所有 |

---

## 五、机器人（Robots）— `abilities/robots.ts`

| 行号 | 卡牌/能力 | 操作 | 实体 | 筛选条件 | 范围 | 归属 |
|------|-----------|------|------|----------|------|------|
| 40-42 | robot_microbot_guard | .filter() | minion | `m.controller === ctx.playerId`（计数己方） | 本基地 | 己方（计数） |
| 42-44 | robot_microbot_guard | .filter() | minion | `m.uid !== ctx.cardUid && getMinionPower() < myMinionCount` | 本基地 | 所有 |
| 88-90 | robot_microbot_reclaimer | .filter() | card | `isDiscardMicrobot(ctx.state, c, ctx.playerId)` | 弃牌堆 | 己方 |
| 160-165 | robot_tech_center | for(let) | base | `base.minions.filter(m => m.controller === playerId).length > 0` | 所有基地 | 有己方随从的 |
| 160 | robot_tech_center | .filter() | minion | `m.controller === ctx.playerId`（计数） | 本基地（循环内） | 己方 |
| 180-183 | robot_nukebot (onDestroy) | .filter() | minion | `m.uid !== ctx.cardUid && m.controller !== ctx.playerId` | 本基地 | 对手 |
| 215 | robot_microbot_reclaimer (handler) | .filter() | card | `selectedUidSet.has(c.uid)` | 弃牌堆 | 己方 |
| 240 | robot_tech_center (handler) | .filter() | minion | `m.controller === playerId`（计数） | 本基地 | 己方 |
| 330 | robot_microbot_archive (trigger) | .find() | minion | `m.defId === 'robot_microbot_archive'` | 所有基地 | 所有 |

---

## 六、巫师（Wizards）— `abilities/wizards.ts`

| 行号 | 卡牌/能力 | 操作 | 实体 | 筛选条件 | 范围 | 归属 |
|------|-----------|------|------|----------|------|------|
| 117-122 | wizard_neophyte | for...of | player | `pid === ctx.playerId → continue`（对手） | 所有玩家 | 对手 |
| 178-179 | wizard_chronomage | .filter() | card | `c.type === 'minion'` / `c.type !== 'minion'` | 牌库顶5张 | 己方 |
| 209 | wizard_chronomage (optionsGen) | .filter() | card | `c.type === 'minion'` | 牌库顶5张 | 己方 |
| 278 | wizard_scry | .filter() | card | `c.type === 'action'` | 牌库 | 己方 |
| 310 | wizard_scry | .filter() | card | `c.uid !== ctx.cardUid` | 手牌 | 己方 |
| 342-346 | wizard_enchantress | for(let)+for...of | minion | `m.controller !== ctx.playerId → continue`（己方） | 所有基地 | 己方 |
| 376-378 | wizard_archmage (trigger) | for...of+.find() | minion | `m.defId === 'wizard_archmage'` | 所有基地 | 所有 |
| 543 | wizard_chronomage (handler) | .filter() | card | `c.uid !== cardUid` | 牌库 | 己方 |
| 565 | wizard_chronomage (handler) | .filter() | uid | `!!uid`（过滤空值） | 选择结果 | N/A |
| 579 | wizard_chronomage (handler) | .filter() | card | `!pickedUids.has(c.uid)` | 牌库顶卡 | 己方 |
| 624 | wizard_chronomage (handler) | .filter() | card | `c.uid !== cardUid` | 剩余卡 | 己方 |

---

## 七、捣蛋鬼（Tricksters）— `abilities/tricksters.ts`

| 行号 | 卡牌/能力 | 操作 | 实体 | 筛选条件 | 范围 | 归属 |
|------|-----------|------|------|----------|------|------|
| 25 | trickster_gnome | .filter() | minion | `m.controller === ctx.playerId`（计数己方） | 本基地 | 己方（计数） |
| 26-28 | trickster_gnome | .filter() | minion | `m.uid !== ctx.cardUid && getMinionPower() < myMinionCount` | 本基地 | 所有 |
| 62-70 | trickster_take_the_shinies | for...of | player | `pid === ctx.playerId → continue`（对手） | 所有玩家 | 对手 |
| 90-105 | trickster_disenchant | for(let)+for...of+for...of | ongoing | 无过滤（所有 ongoing 行动卡） | 所有基地 | 所有 |
| 255-270 | trickster_block_the_path | for...of+for...of | minion/card | `def?.faction`（收集派系） | 所有基地+所有手牌 | 所有 |
| 281 | trickster_mark_of_sleep | .filter() | player | `pid !== ctx.playerId` | 所有玩家 | 对手 |
| 307-310 | trickster_leprechaun (trigger) | for(let)+.find() | minion | `m.defId === 'trickster_leprechaun'` | 所有基地 | 所有 |
| 316 | trickster_leprechaun (trigger) | .find() | minion | `m.uid === trigCtx.triggerMinionUid` | 本基地 | 所有 |
| 364 | trickster_enshrouding_mist (trigger) | .find() | ongoing | `o.defId === 'trickster_enshrouding_mist'` | 所有基地 | 所有 |
| 402 | trickster_flame_trap (trigger) | .find() | ongoing | `o.defId === 'trickster_flame_trap'` | 所有基地 | 所有 |
| 439 | trickster_block_the_path (restriction) | .find() | ongoing | `o.defId === 'trickster_block_the_path'` | 本基地 | 所有 |
| 456 | trickster_pay_the_piper (trigger) | .find() | ongoing | `o.defId === 'trickster_pay_the_piper'` | 所有基地 | 所有 |

---

## 八、丧尸（Zombies）— `abilities/zombies.ts`

| 行号 | 卡牌/能力 | 操作 | 实体 | 筛选条件 | 范围 | 归属 |
|------|-----------|------|------|----------|------|------|
| 52 | zombie_tenacious_z (discardPlay) | .filter() | card | `c.defId === 'zombie_tenacious_z'` | 弃牌堆 | 己方 |
| 76-79 | zombie_theyre_coming (discardPlay) | for(let) | base | `base.ongoingActions.some(o => o.defId === '...' && o.ownerId === playerId)` | 所有基地 | 己方 ongoing |
| 84 | zombie_theyre_coming (discardPlay) | .filter() | card | `c.type === 'minion'` | 弃牌堆 | 己方 |
| 104 | zombie_grave_digger | .filter() | card | `c.type === 'minion'` | 弃牌堆 | 己方 |
| 119 | zombie_grave_digger (optionsGen) | .filter() | card | `c.type === 'minion'` | 弃牌堆 | 己方 |
| 182 | zombie_not_enough_bullets | .filter() | card | `c.type === 'minion'` | 弃牌堆 | 己方 |
| 186 | zombie_not_enough_bullets | for...of | card | 按 defId 分组 | 弃牌堆 | 己方 |
| 237-240 | zombie_lord | for(let) | base | `!base.minions.some(m => m.controller === playerId)`（无己方随从的基地） | 所有基地 | 无己方随从 |
| 246 | zombie_lend_a_hand | .filter() | card | `c.type === 'minion' && c.uid !== ctx.cardUid` | 手牌 | 己方 |
| 265-268 | zombie_lord | for(let) | base | `!base.minions.some(m => m.controller === playerId)` | 所有基地 | 无己方随从 |
| 274 | zombie_lord | .filter() | card | `c.type !== 'minion' → false && def.power <= 2` | 弃牌堆 | 己方 |
| 295 | zombie_lord (helper) | .filter() | card | `!usedCardUids.includes(c.uid)` | 弃牌堆随从 | 己方 |
| 303 | zombie_lord (helper) | .filter() | base | `!filledBases.includes(b.baseIndex)` | 空基地 | N/A |
| 311-315 | zombie_lord (optionsGen) | .filter().filter() | card | `c.type === 'minion' && def.power <= 2 && !usedCardUids.includes(c.uid)` | 弃牌堆 | 己方 |
| 342 | zombie_mall_crawl | for...of | card | 按 defId 分组 | 牌库 | 己方 |
| 374 | zombie_they_keep_coming | .filter() | card | `c.type === 'minion'` | 弃牌堆 | 己方 |
| 389 | zombie_they_keep_coming (optionsGen) | .filter() | card | `c.type === 'minion'` | 弃牌堆 | 己方 |
| 408-421 | zombie_overrun (selfDestruct) | for(let)+.find() | ongoing | `o.defId === 'zombie_overrun'` | 所有基地 | 所有 |
| 453 | zombie_lend_a_hand (handler) | .filter() | uid | `Boolean`（过滤空值） | 选择结果 | N/A |
| 457 | zombie_lend_a_hand (handler) | .filter() | card | `selectedUids.has(c.uid)` | 弃牌堆 | 己方 |
| 475 | zombie_not_enough_bullets (handler) | .filter() | card | `c.type === 'minion' && c.defId === defId` | 弃牌堆 | 己方 |
| 502 | zombie_mall_crawl (handler) | .filter() | card | `c.defId === defId` | 牌库 | 己方 |
| 514 | zombie_mall_crawl (handler) | .filter() | card | `c.defId !== defId` | 牌库 | 己方 |
| 534 | zombie_lend_a_hand (handler) | .filter() | card | `c.type === 'minion'` | 手牌 | 己方 |
| 581 | zombie_lord (handler) | .filter() | base | `!filledBases.includes(b.baseIndex)` | 空基地 | N/A |
| 584 | zombie_lord (handler) | .filter() | card | `c.type === 'minion' && !usedCardUids.includes(c.uid) && def.power <= 2` | 弃牌堆 | 己方 |

---

## 九、基地能力 — `domain/baseAbilities.ts`（高风险卡牌）
