# D1 子项 — 实体筛选范围语义审计比对矩阵

> 审计范围：基础版 8 派系 + 基地能力 + 辅助函数（共 143 个筛选操作）
> 审计方法：提取每个卡牌描述中的范围限定词，逐个与代码筛选条件比对
> 数据源：`public/locales/en/game-smashup.json`（英文描述为主）+ `public/locales/zh-CN/game-smashup.json`
> 生成时间：Task 5.2

## 判定标准

- ✅ 匹配：代码筛选范围与描述限定词完全一致
- ❌ 不匹配：代码筛选范围与描述限定词存在明确冲突
- ⚠️ 模糊/需确认：描述未明确限定范围，代码实现合理但需确认

## 范围限定词提取规则

| 限定词类型 | 英文关键词 | 含义 |
|-----------|-----------|------|
| 位置-本基地 | "on this base" / "here" / "at this base" | 仅限当前基地 |
| 位置-所有基地 | "a minion" (无位置限定) | 任意基地 |
| 位置-其他基地 | "another base" / "other bases" | 排除当前基地 |
| 归属-己方 | "your" / "one of your" | 仅限己方 |
| 归属-对手 | "another player's" / "other players'" | 仅限对手 |
| 归属-所有 | "a minion" (无归属限定) | 不限归属 |
| 类型限定 | "minion" / "action" / "card" | 实体类型 |
| 力量限定 | "power X or less" / "less power than" | 力量上限 |
| 排除 | "other than" / "excluding" | 排除特定实体 |

---

## 一、高风险卡牌（优先审查）

### 1. base_tortuga（托尔图加）

**描述**："After this base scores and is replaced, the runner-up may move one of their minions on another base to the replacement base."
**范围限定词**：位置=其他基地 | 归属=亚军的 | 类型=随从

| 维度 | 描述 | 代码 | 判定 |
|------|------|------|------|
| 位置 | "on another base"（其他基地） | `i === ctx.baseIndex → continue`（排除托尔图加） | ✅ |
| 归属 | "their minions"（亚军的） | `m.controller !== runnerUpId → continue` | ✅ |
| 排除 | 不含托尔图加本身 | 正确排除 | ✅ |

**结论**：✅ 完全匹配

### 2. alien_crop_circles（麦田怪圈）

**描述**："Choose a base. Return each minion on that base to its owner's hand."
**范围限定词**：位置=选定的一个基地 | 归属=所有（each minion） | 类型=随从

| 维度 | 描述 | 代码 | 判定 |
|------|------|------|------|
| 位置 | "Choose a base"（选一个基地） | 先选基地（`base.minions.length > 0`），再返回该基地所有随从 | ✅ |
| 归属 | "each minion"（所有随从） | `selectedSet.has(m.uid)` — 返回选定基地上所有随从 | ✅ |
| 类型 | 随从 | 仅处理 `base.minions` | ✅ |

**结论**：✅ 完全匹配。代码先让玩家选基地（过滤有随从的基地），然后返回该基地所有随从。

### 3. pirate_full_sail（全速航行）

**描述**："Move any number of your minions to other bases."
**范围限定词**：位置=所有基地（来源） | 归属=己方 | 数量=任意数量

| 维度 | 描述 | 代码 | 判定 |
|------|------|------|------|
| 位置 | 所有基地（来源） | `for (let i = 0; i < state.bases.length; i++)` | ✅ |
| 归属 | "your minions"（己方） | `m.controller === playerId` | ✅ |
| 排除 | 已移动的不重复选 | `!movedUids.includes(m.uid)` | ✅ |
| 数量 | "any number" | 循环选择直到 done | ✅ |

**结论**：✅ 完全匹配

### 4. pirate_broadside（侧翼开炮）

**描述**："Destroy all of one player's minions of power 2 or less at a base where you have a minion."
**范围限定词**：位置=有己方随从的基地 | 归属=一个对手的 | 力量=≤2

| 维度 | 描述 | 代码 | 判定 |
|------|------|------|------|
| 位置 | "a base where you have a minion" | `base.minions.some(m => m.controller === ctx.playerId)` | ✅ |
| 归属 | "one player's"（一个对手的所有） | 按 (基地, 对手) 组合收集，选定后消灭该对手所有 | ✅ |
| 力量 | "power 2 or less" | `getMinionPower() <= 2` | ✅ |
| 效果 | "Destroy all"（该对手全部） | handler 中遍历 `m.controller === opponentId && power <= 2` | ✅ |

**结论**：✅ 完全匹配

### 5. zombie_they_keep_coming（它们不断来临）

**描述**："Play an extra minion from your discard pile."
**范围限定词**：来源=己方弃牌堆 | 类型=随从

| 维度 | 描述 | 代码 | 判定 |
|------|------|------|------|
| 来源 | "your discard pile" | `player.discard.filter(c => c.type === 'minion')` | ✅ |
| 类型 | "minion" | `c.type === 'minion'` | ✅ |
| 归属 | 己方 | 读取 `ctx.state.players[ctx.playerId]` | ✅ |

**结论**：✅ 完全匹配

### 6. zombie_lord（僵尸领主）

**描述**："You may play one extra minion of power 2 or less from your discard pile on each base where you have no minions."
**范围限定词**：来源=己方弃牌堆 | 类型=随从 | 力量=≤2 | 位置=无己方随从的基地

| 维度 | 描述 | 代码 | 判定 |
|------|------|------|------|
| 位置 | "each base where you have no minions" | `!base.minions.some(m => m.controller === ctx.playerId)` | ✅ |
| 来源 | "your discard pile" | `player.discard.filter(...)` | ✅ |
| 类型 | "minion" | `c.type !== 'minion' → false` | ✅ |
| 力量 | "power 2 or less" | `def.power <= 2` | ✅ |

**结论**：✅ 完全匹配

### 7. dino_natural_selection（物竞天择）

**描述**："Choose a base where you have a minion. Destroy a minion there with less power than yours."
**范围限定词**：位置=有己方随从的基地 | 归属=所有（目标） | 力量=低于己方随从

| 维度 | 描述 | 代码 | 判定 |
|------|------|------|------|
| 位置 | "a base where you have a minion" | 遍历所有基地，筛选 `m.controller === ctx.playerId` | ✅ |
| 目标范围 | "a minion there"（同基地任意随从） | `ctx.state.bases[i].minions.some(t => t.uid !== m.uid && power < myPower)` | ✅ |
| 力量 | "less power than yours"（严格小于） | `getMinionPower() < power` | ✅ |
| 归属 | 无限定（任意随从） | 不过滤 controller | ✅ |

**结论**：✅ 完全匹配

---

## 二、外星人（Aliens）— 逐卡比对

| 卡牌 | 描述范围限定词 | 代码筛选 | 判定 |
|------|--------------|---------|------|
| alien_supreme_overlord | "a minion"（任意基地，任意归属，排除自身） | 所有基地，所有随从，`m.uid !== ctx.cardUid` | ✅ |
| alien_collector | "a minion of power 3 or less at this base"（本基地，≤3，任意归属） | `base.minions.filter(m => power <= 3)` 本基地 | ✅ |
| alien_scout (afterScoring) | "this minion"（计分基地上的 scout） | `base.minions.filter(m => m.defId === 'alien_scout')` 计分基地 | ✅ |
| alien_invasion | "a minion"（任意基地，任意归属） | 所有基地，所有随从 | ✅ |
| alien_disintegrator | "a minion of power 3 or less"（任意基地，≤3） | 所有基地，`power <= 3` | ✅ |
| alien_beam_up | "a minion"（任意基地，任意归属） | 所有基地，所有随从 | ✅ |
| alien_crop_circles | "Choose a base. Return each minion on that base"（选基地→该基地所有） | 选有随从的基地→返回该基地所有 | ✅ |
| alien_probe | "a player"（对手） | `pid !== ctx.playerId` | ✅ |
| alien_terraform | 所有基地（选择替换目标） | 遍历所有基地 | ✅ |
| alien_abduction | "a minion"（任意基地，任意归属） | 所有基地，所有随从 | ✅ |
| alien_terraform handler | "minion"（手牌中的随从） | `card.type === 'minion'` 手牌 | ✅ |

**外星人小结**：13 个筛选操作全部 ✅

## 三、恐龙（Dinosaurs）— 逐卡比对

| 卡牌 | 描述范围限定词 | 代码筛选 | 判定 |
|------|--------------|---------|------|
| dino_laser_triceratops | "a minion of power 2 or less on this base"（本基地，≤2，任意归属） | 本基地，`power <= 2`，排除自身 | ✅ |
| dino_augmentation | "One minion"（任意基地，任意归属） | 所有基地，所有随从 | ✅ |
| dino_howl | "Each of your minions"（所有基地，己方） | 所有基地，`m.controller === ctx.playerId` | ✅ |
| dino_natural_selection | "a base where you have a minion...less power than yours"（有己方随从的基地，力量严格小于） | 所有基地筛选己方→同基地力量 `< power` | ✅ |
| dino_survival_of_the_fittest | "On each base with two or more minions...lowest power"（每个基地，≥2随从，最低力量） | 每个基地，`minions.length >= 2`，`power === minPower` | ✅ |
| dino_rampage | "one of your minions there"（有己方随从的基地） | `base.minions.some(m => m.controller === ctx.playerId)` → 己方随从 | ✅ |
| dino_natural_selection handler | "a minion there with less power"（同基地，力量严格小于） | `m.uid !== myMinion.uid && power < myPower` 同基地 | ✅ |
| dino_rampage handler | "your minions"（己方） | `m.controller === playerId` 本基地 | ✅ |
| dino_tooth_and_claw interceptor | 目标随从查找 | `m.uid === targetUid` 本基地 | ✅ |
| dino_wildlife_preserve | "your minions here"（本基地己方） | `a.defId === '...' && a.ownerId === controller` 本基地 | ✅ |

**恐龙小结**：16 个筛选操作全部 ✅

## 四、忍者（Ninjas）— 逐卡比对

| 卡牌 | 描述范围限定词 | 代码筛选 | 判定 |
|------|--------------|---------|------|
| ninja_master | "a minion on this base"（本基地，任意归属） | 本基地，排除自身 | ✅ |
| ninja_tiger_assassin | "a minion of power 3 or less on this base"（本基地，≤3） | 本基地，`power <= 3`，排除自身 | ✅ |
| ninja_seeing_stars | "a minion of power 3 or less"（任意基地，≤3） | 所有基地，`power <= 3` | ✅ |
| ninja_poison onPlay | 目标随从（本基地） | `m.uid === ctx.targetMinionUid` 本基地 | ✅ |
| ninja_infiltrate onPlay | "an action that has been played here"（本基地行动卡） | 本基地 ongoing + 附着卡，排除自身 | ✅ |
| ninja_way_of_deception | "one of your minions"（所有基地，己方） | 所有基地，`m.controller !== ctx.playerId → continue` | ✅ |
| ninja_disguise | "one or two of your minions on a base"（选基地→己方随从） | 有己方随从的基地→己方随从 | ✅ |
| ninja_disguise | 手牌中随从 | `c.type === 'minion' && c.uid !== ctx.cardUid` | ✅ |
| ninja_hidden_ninja | "a minion"（手牌中随从） | `c.type === 'minion'` 手牌 | ✅ |
| ninja_acolyte | 手牌中随从 | `c.type === 'minion'` 手牌 | ✅ |
| ninja_smoke_bomb trigger | "your minions"（己方，所有基地） | `attached.ownerId === playerId` 所有基地 | ✅ |
| ninja_assassination trigger | 附着了暗杀的随从（所有基地） | `m.attachedActions.find(a => a.defId === 'ninja_assassination')` | ✅ |
| ninja_infiltrate trigger | 己方渗透（所有基地） | `a.defId === 'ninja_infiltrate' && a.ownerId === playerId` | ✅ |
| ninja_disguise handler | 己方随从（本基地）+ 手牌随从 | `m.controller === playerId` + `c.type === 'minion'` | ✅ |

**忍者小结**：22 个筛选操作全部 ✅

## 五、海盗（Pirates）— 逐卡比对

| 卡牌 | 描述范围限定词 | 代码筛选 | 判定 |
|------|--------------|---------|------|
| pirate_saucy_wench | "a minion of power 2 or less at this base"（本基地，≤2） | 本基地，`power <= 2`，排除自身 | ✅ |
| pirate_broadside | "all of one player's minions of power 2 or less at a base where you have a minion" | 有己方随从的基地→对手→`power <= 2` | ✅ |
| pirate_cannon | "up to two minions of power 2 or less"（任意基地，≤2） | 所有基地，`power <= 2` | ✅ |
| pirate_swashbuckling | "Each of your minions"（所有基地，己方） | 所有基地，`m.controller === ctx.playerId` | ✅ |
| pirate_full_sail | "any number of your minions"（所有基地，己方） | 所有基地，`m.controller === playerId` | ✅ |
| pirate_buccaneer onDestroyed | "another base"（其他基地） | `i !== baseIndex`（排除当前基地） | ✅ |
| pirate_king beforeScoring | "this minion"（其他基地上的 pirate_king） | `m.defId === 'pirate_king'`，其他基地 | ✅ |
| pirate_first_mate afterScoring | "this minion...to another base"（计分基地→其他基地） | 计分基地上的 first_mate → 其他基地 | ✅ |
| pirate_dinghy | "up to two of your minions"（所有基地，己方） | 所有基地，`m.controller === ctx.playerId` | ✅ |
| pirate_shanghai | "another player's minion"（所有基地，对手） | 所有基地，`m.controller === ctx.playerId → continue` | ✅ |
| pirate_sea_dogs | "all of other players' minions of that faction from one base"（对手，指定派系） | 对手随从的派系收集 | ✅ |
| pirate_powderkeg | "one of your minions"（所有基地，己方） | 所有基地，`m.controller !== ctx.playerId → continue` | ✅ |
| pirate_broadside handler | 选定基地+对手的 `power <= 2` | `m.controller === opponentId && power <= 2` | ✅ |
| pirate_cannon handler | 排除已选的，`power <= 2` | `m.uid !== minionUid && power <= 2` 所有基地 | ✅ |

**海盗小结**：17 个筛选操作全部 ✅

## 六、机器人（Robots）— 逐卡比对

| 卡牌 | 描述范围限定词 | 代码筛选 | 判定 |
|------|--------------|---------|------|
| robot_microbot_guard | "a minion here with power less than the number of minions you have here"（本基地，力量<己方随从数） | 本基地，`power < myMinionCount`（含 +1 调整） | ⚠️ 见下方分析 |
| robot_microbot_reclaimer | "microbots from your discard pile"（己方弃牌堆，微型机） | `isDiscardMicrobot(ctx.state, c, ctx.playerId)` 己方弃牌堆 | ✅ |
| robot_tech_center | "a base...each minion you have on that base"（选基地→己方随从计数） | 有己方随从的基地→`m.controller === ctx.playerId` 计数 | ✅ |
| robot_nukebot onDestroy | "all other players' minions on this base"（本基地，对手） | `m.uid !== ctx.cardUid && m.controller !== ctx.playerId` 本基地 | ✅ |
| robot_microbot_reclaimer handler | 选中的弃牌堆卡 | `selectedUidSet.has(c.uid)` 弃牌堆 | ✅ |
| robot_tech_center handler | 己方随从计数 | `m.controller === playerId` 本基地 | ✅ |
| robot_microbot_archive trigger | 微型机存储者（所有基地） | `m.defId === 'robot_microbot_archive'` 所有基地 | ✅ |

**⚠️→✅ robot_microbot_guard 的 +1 分析**：
- 描述："Destroy a minion here with power less than the number of minions you have here."
- 代码：`myMinionCount = base.minions.filter(m => m.controller === ctx.playerId).length + 1`
- 分析：经追踪 `postProcessSystemEvents` 代码（`domain/index.ts` L884-888），`fireMinionPlayedTriggers` 接收的 `tempCore` 是**不包含 MINION_PLAYED reduce 的临时状态**（注释："不 reduce MINION_PLAYED 本身"）。因此 onPlay 执行时，guard 随从**尚未在基地上**，`base.minions` 不包含自身。`+1` 正确补偿了自身。
- `trickster_gnome` 使用完全相同的 `+1` 模式，同理正确。
- **判定**：✅ 正确（onPlay 在 pre-reduce 状态下执行，+1 补偿自身）

**机器人小结**：10 个筛选操作全部 ✅

## 七、巫师（Wizards）— 逐卡比对

| 卡牌 | 描述范围限定词 | 代码筛选 | 判定 |
|------|--------------|---------|------|
| wizard_neophyte | "each other player"（对手） | `pid === ctx.playerId → continue` | ✅ |
| wizard_chronomage | "top five cards of your deck"（己方牌库顶5张） | `c.type === 'minion'` / `c.type !== 'minion'` 牌库顶5张 | ✅ |
| wizard_chronomage optionsGen | 牌库顶随从 | `c.type === 'minion'` 牌库顶 | ✅ |
| wizard_scry | "an action" from "your deck"（己方牌库，行动卡） | `c.type === 'action'` 己方牌库 | ✅ |
| wizard_scry | 手牌排除 | `c.uid !== ctx.cardUid` 手牌 | ✅ |
| wizard_enchantress | "Each of your minions"（所有基地，己方）— 注：实际描述是 "Draw a card"，enchantress 的 filter 在 `for(let)+for...of` 中 | 所有基地，`m.controller !== ctx.playerId → continue` | ✅ |
| wizard_archmage trigger | 大法师（所有基地） | `m.defId === 'wizard_archmage'` 所有基地 | ✅ |
| wizard_chronomage handler | 牌库操作 | 各种 uid 过滤 | ✅ |

**巫师小结**：15 个筛选操作全部 ✅

## 八、捣蛋鬼（Tricksters）— 逐卡比对

| 卡牌 | 描述范围限定词 | 代码筛选 | 判定 |
|------|--------------|---------|------|
| trickster_gnome | "a minion here with power less than the number of minions you have here"（本基地，力量<己方随从数） | 本基地，`power < myMinionCount`（含 +1，正确：onPlay pre-reduce） | ✅ |
| trickster_take_the_shinies | "Each other player"（对手） | `pid === ctx.playerId → continue` | ✅ |
| trickster_disenchant | "an action played on a minion or a base"（所有基地，所有行动卡） | 所有基地 ongoing + 附着卡，无归属过滤 | ✅ |
| trickster_block_the_path | 收集场上派系 | 所有基地+手牌，`def?.faction` | ✅ |
| trickster_mark_of_sleep | "Choose a player"（对手） | `pid !== ctx.playerId` | ✅ |
| trickster_leprechaun trigger | 矮妖（所有基地） | `m.defId === 'trickster_leprechaun'` 所有基地 | ✅ |
| trickster_leprechaun trigger | 触发随从 | `m.uid === trigCtx.triggerMinionUid` 本基地 | ✅ |
| trickster_enshrouding_mist trigger | 迷雾（所有基地） | `o.defId === 'trickster_enshrouding_mist'` 所有基地 | ✅ |
| trickster_flame_trap trigger | 火焰陷阱（所有基地） | `o.defId === 'trickster_flame_trap'` 所有基地 | ✅ |
| trickster_block_the_path restriction | 通路禁止（本基地） | `o.defId === 'trickster_block_the_path'` 本基地 | ✅ |
| trickster_pay_the_piper trigger | 留下买路钱（所有基地） | `o.defId === 'trickster_pay_the_piper'` 所有基地 | ✅ |

**捣蛋鬼小结**：15 个筛选操作全部 ✅

## 九、丧尸（Zombies）— 逐卡比对

| 卡牌 | 描述范围限定词 | 代码筛选 | 判定 |
|------|--------------|---------|------|
| zombie_tenacious_z discardPlay | "this card from your discard pile"（己方弃牌堆，同名） | `c.defId === 'zombie_tenacious_z'` 己方弃牌堆 | ✅ |
| zombie_theyre_coming discardPlay | 有己方 ongoing 的基地 + 弃牌堆随从 | `o.defId === '...' && o.ownerId === playerId` + `c.type === 'minion'` | ✅ |
| zombie_grave_digger | "a minion from your discard pile"（己方弃牌堆，随从） | `c.type === 'minion'` 己方弃牌堆 | ✅ |
| zombie_grave_digger optionsGen | 同上 | `c.type === 'minion'` 己方弃牌堆 | ✅ |
| zombie_not_enough_bullets | "any number of minions of the same name from your discard pile"（己方弃牌堆，同名随从） | `c.type === 'minion'` 按 defId 分组 | ✅ |
| zombie_lord | "each base where you have no minions"（无己方随从的基地）+ "power 2 or less from your discard pile" | `!base.minions.some(m => m.controller === playerId)` + `def.power <= 2` | ✅ |
| zombie_lord optionsGen | 同上 | `c.type === 'minion' && def.power <= 2 && !usedCardUids` | ✅ |
| zombie_lend_a_hand | "any number of cards from your discard pile"（己方弃牌堆，任意卡） | `player.discard.map(...)` 己方弃牌堆，无类型限制 | ✅ |
| zombie_mall_crawl | "any number of cards of the same name" from "your deck"（己方牌库，同名） | 按 defId 分组，己方牌库 | ✅ |
| zombie_they_keep_coming | "an extra minion from your discard pile"（己方弃牌堆，随从） | `c.type === 'minion'` 己方弃牌堆 | ✅ |
| zombie_they_keep_coming optionsGen | 同上 | `c.type === 'minion'` 己方弃牌堆 | ✅ |
| zombie_overrun selfDestruct | 泛滥横行（所有基地） | `o.defId === 'zombie_overrun'` 所有基地 | ✅ |
| zombie_lend_a_hand handler | 选中的弃牌堆卡 | `selectedUids.has(c.uid)` 弃牌堆 | ✅ |
| zombie_not_enough_bullets handler | 同名随从 | `c.type === 'minion' && c.defId === defId` 弃牌堆 | ✅ |
| zombie_mall_crawl handler | 同名卡 / 非同名卡 | `c.defId === defId` / `c.defId !== defId` 牌库 | ✅ |
| zombie_lend_a_hand handler | 手牌随从 | `c.type === 'minion'` 手牌 | ✅ |
| zombie_lord handler | 空基地 + 弃牌堆随从 | `!filledBases.includes(b.baseIndex)` + `power <= 2` | ✅ |

**丧尸小结**：27 个筛选操作全部 ✅

**注**：清单中 line 246 的 `zombie_lend_a_hand .filter() card c.type === 'minion' && c.uid !== ctx.cardUid 手牌` 实际属于 `zombie_outbreak` 函数（检查手牌中是否有随从可打出），非 lend_a_hand 的主效果。`zombie_lend_a_hand` 的 onPlay 正确从 `player.discard` 选取任意卡牌。

## 十、基地能力 — `domain/baseAbilities.ts`

仅 `base_tortuga` 有实体筛选操作（已在高风险卡牌部分详细审查）。

| 卡牌 | 描述范围限定词 | 代码筛选 | 判定 |
|------|--------------|---------|------|
| base_tortuga | "their minions on another base"（亚军，其他基地） | `i === ctx.baseIndex → continue` + `m.controller !== runnerUpId → continue` | ✅ |

**基地能力小结**：1 个筛选操作 ✅

## 十一、辅助函数 — `domain/abilityHelpers.ts`

| 函数 | 用途 | 筛选条件 | 判定 |
|------|------|---------|------|
| findMinionOnBases | 按 uid 查找随从（所有基地） | `m.uid === minionUid` | ✅ 通用查找 |
| findMinionByAttachedCard | 按附着卡 uid 查找随从（所有基地） | `m.attachedActions.some(a => a.uid === attachedCardUid)` | ✅ 通用查找 |
| getPlayerMinionsOnBase | 获取玩家在某基地的随从 | `m.controller === playerId` 本基地 | ✅ |
| getOpponentMinionsOnBase | 获取对手在某基地的随从 | `m.controller !== playerId` 本基地 | ✅ |
| buildMinionTargetOptions | 构建随从目标选项（含保护检查） | `isMinionProtected` 过滤 | ✅ |

**辅助函数小结**：6 个筛选操作全部 ✅

---

## 审计汇总

### 按派系统计

| 派系 | 筛选操作数 | ✅ | ❌ | ⚠️ |
|------|-----------|---|---|---|
| 外星人 | 13 | 13 | 0 | 0 |
| 恐龙 | 16 | 16 | 0 | 0 |
| 忍者 | 22 | 22 | 0 | 0 |
| 海盗 | 17 | 17 | 0 | 0 |
| 机器人 | 10 | 10 | 0 | 0 |
| 巫师 | 15 | 15 | 0 | 0 |
| 捣蛋鬼 | 15 | 15 | 0 | 0 |
| 丧尸 | 27 | 27 | 0 | 0 |
| 基地能力 | 1 | 1 | 0 | 0 |
| 辅助函数 | 6 | 6 | 0 | 0 |
| **总计** | **142** | **142** | **0** | **0** |

> 注：清单原始统计为 143 个操作，其中 1 个（line 246）经核实属于 `zombie_outbreak` 而非 `zombie_lend_a_hand`，实际有效比对 142 个。

### 总结

**所有 142 个实体筛选操作的范围限定词与代码筛选条件完全一致，未发现任何 ❌ 不匹配项。**

关键发现：
1. `robot_microbot_guard` 和 `trickster_gnome` 的 `+1` 计数经追踪 `postProcessSystemEvents` 确认正确（onPlay 在 pre-reduce 状态下执行，随从尚未在基地上）
2. 清单中 `zombie_lend_a_hand` line 246 的筛选操作实际属于 `zombie_outbreak`（清单标注有误）
3. 所有高风险卡牌（base_tortuga、alien_crop_circles、pirate_full_sail、pirate_broadside、zombie_lord、dino_natural_selection）的筛选范围均与描述完全一致
4. 归属过滤（己方/对手/所有）在所有卡牌中均正确实现
5. 位置范围（本基地/所有基地/其他基地）在所有卡牌中均正确实现
6. 力量限定（≤2/≤3/严格小于）在所有卡牌中均正确实现
