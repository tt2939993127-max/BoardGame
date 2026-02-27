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
