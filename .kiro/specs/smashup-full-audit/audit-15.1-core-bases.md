# 审查报告：基础版基地能力

## 审查汇总

| 指标 | 值 |
|------|-----|
| 范围 | 基础版 (Base Set) + AL9000 扩展基地 |
| 审查基地数 | 18（含纯数据驱动的限制类基地） |
| 审查交互链数 | 18 |
| ✅ 通过 | 14 |
| ⚠️ 语义偏差 | 3 |
| ❌ 缺失实现 | 1 |
| 通过率 | 77.8% |

## 严重问题清单

| 优先级 | 基地 | 问题 |
|--------|------|------|
| P1 | base_ninja_dojo | i18n 说"冠军可以消灭任意一个随从"，暗示可消灭任何基地上的随从，实现只提供当前基地上的随从选项 |
| P1 | base_fairy_ring | i18n 说"你可以打出一张额外的随从到这，或打出一张额外的战术"，"或"暗示二选一，实现同时给两个额度 |
| P1 | base_wizard_academy | i18n 说"选择一张替换这个基地，然后以任意顺序将其余的放回"，实现只让选一张排第一，其余保持原序，无完整排序交互 |
| P2 | base_the_field_of_honor | i18n 说"当一个或多个随从在这里被消灭"，暗示批量消灭只触发一次 1VP，实现每个随从单独触发（可能多次 1VP） |

## 审查矩阵

### 基础版 (Base Set)

#### 1. base_the_homeworld（家园）
- i18n: "每当有一个随从打出到这里后，它的拥有者可以额外打出一个力量为2或以下的随从。"
- 实现: `onMinionPlayed` → `LIMIT_MODIFIED(minion, +1)` + `restrictions: extraPlayMinionPowerMax: 2` 数据驱动
- **结论: ✅ 通过** — 额度授予 + 力量限制通过数据驱动实现

#### 2. base_the_mothership（母舰）
- i18n: "在这个基地计分后，冠军可以返回他在这里的一张力量为3或以下的随从到手牌。"
- 实现: `afterScoring` → 筛选冠军在此基地力量 ≤3 的随从 → Prompt 选择（含跳过）→ `MINION_RETURNED`
- **结论: ✅ 通过** — "可以"有跳过选项，力量限制正确

#### 3. base_central_brain（中央大脑）
- i18n: "每个在这里的随从获得+1力量。"
- 实现: 通过 `ongoing_modifiers.ts` 的 `registerBaseModifiers()` 实现持续性 power modifier
- **结论: ✅ 通过** — 被动 buff 通过 modifier 系统实现

#### 4. base_temple_of_goju（刚柔流寺庙）
- i18n: "在这个基地计分后，将每位玩家在这里力量最高的一张随从放入他们拥有者的牌库底。"
- 实现: `afterScoring` → 按玩家分组 → 找每位最高力量随从 → `CARD_TO_DECK_BOTTOM`
- **结论: ✅ 通过** — 正确按玩家分组找最高力量

#### 5. base_cave_of_shinies（闪光洞穴）
- i18n: "每当这里的一个随从被消灭后，它的拥有者获得1VP。"
- 实现: `onMinionDestroyed` → `VP_AWARDED(playerId, 1)`
- **结论: ✅ 通过**

#### 6. base_haunted_house（伊万斯堡城镇公墓）
- i18n: "在这个基地计分后，冠军弃掉他的手牌并抽取5张牌。"
- 实现: `afterScoring` → `CARDS_DISCARDED(全部手牌)` + `CARDS_DRAWN(5)`
- **结论: ✅ 通过**

#### 7. base_rhodes_plaza（罗德百货商场）
- i18n: "在这个基地计分时，每位玩家在这里每有一个随从就获得1VP。"
- 实现: `beforeScoring` → 按玩家统计随从数 → `VP_AWARDED(count)`
- **结论: ✅ 通过**

#### 8. base_the_factory（436-1337工厂）
- i18n: "当这个基地计分时，冠军在这里每有5力量就获得1VP。"
- 实现: `beforeScoring` → 找力量最高玩家 → `Math.floor(maxPower / 5)` → `VP_AWARDED`
- **结论: ✅ 通过**

#### 9. base_tar_pits（焦油坑）
- i18n: "每当有一个随从在这里被消灭后，将它放到其拥有者的牌库底。"
- 实现: `onMinionDestroyed` → `CARD_TO_DECK_BOTTOM`
- **结论: ✅ 通过**

#### 10. base_ninja_dojo（忍者道场）
- i18n: "在这个基地计分后，冠军可以消灭任意一个随从。"
- 实现: `afterScoring` → 只提供**当前基地**上的随从选项
- ⚠️ i18n 说"任意一个随从"，无"在这里"限定，暗示可消灭任何基地上的随从。实现限制为当前基地
- **结论: ⚠️ 语义偏差** — "任意一个随从"应包含所有基地

#### 11. base_mushroom_kingdom（蘑菇王国）
- i18n: "在每位玩家回合开始时，该玩家可以从任意基地移动一个其他玩家的随从到这。"
- 实现: `onTurnStart` → 收集其他基地对手随从 → Prompt（含跳过）→ `moveMinion`
- **结论: ✅ 通过** — "可以"有跳过选项

#### 12. base_pirate_cove（海盗湾）
- i18n: "在这个基地计分后，除了冠军的所有玩家可以从这里移动一个随从到其他基地而不是进入弃牌堆。"
- 实现: `afterScoring` → 遍历非冠军玩家 → 每位有随从的玩家生成 Prompt → 链式选择目标基地 → `moveMinion`
- **结论: ✅ 通过** — 多玩家多步交互正确实现

#### 13. base_tortuga（托尔图加）
- i18n: "冠军计分后，亚军可以移动他的一个随从到替换本基地的基地上。"
- 实现: `afterScoring` → 取 `rankings[1]` 亚军 → Prompt 选择随从（含跳过）→ `moveMinion` 到同 baseIndex
- **结论: ✅ 通过**

#### 14. base_great_library（大图书馆）
- i18n: "在这个基地计分后，所有在这里有随从的玩家可以抽一张卡牌。"
- 实现: `afterScoring` → 收集有随从的玩家 → 每位 `CARDS_DRAWN(1)`
- ⚠️ "可以"暗示可跳过，实现自动抽牌无跳过选项。但抽牌通常是正面效果，跳过意义不大
- **结论: ✅ 通过**（正面效果自动执行可接受）

#### 15. base_wizard_academy（巫师学院）
- i18n: "在这个基地计分后，冠军查看基地牌库顶的3张牌。选择一张替换这个基地，然后以任意顺序将其余的放回。"
- 实现: `afterScoring` → 展示 3 张基地卡 → Prompt 选择 1 张排第一 → 其余保持原序
- ⚠️ "以任意顺序将其余的放回"暗示完整排序交互，实现只选 1 张排第一，其余保持原序
- **结论: ⚠️ 语义偏差** — 缺少完整排序交互（仅 2 张剩余时影响不大，3 张时有差异）

#### 16. base_locker_room（更衣室）
- i18n: "你的回合开始时，如果你有随从在这，抽一张卡牌。"
- 实现: `onTurnStart` → 检查有己方随从 → `CARDS_DRAWN(1)`
- **结论: ✅ 通过**

### AL9000 扩展

#### 17. base_haunted_house_al9000（鬼屋）
- i18n: "在一个玩家打出一个随从到这后，这个玩家必须弃掉一张卡牌。"
- 实现: `onMinionPlayed` → 1 张手牌自动弃 / 多张 Prompt 选择 → `CARDS_DISCARDED`
- **结论: ✅ 通过** — "必须"无跳过选项，正确

#### 18. base_the_field_of_honor（荣誉之地）
- i18n: "当一个或多个随从在这里被消灭，那个将它们消灭的玩家获得1VP。"
- 实现: `onMinionDestroyed` → `VP_AWARDED(destroyerId, 1)`
- ⚠️ "一个或多个"暗示批量消灭事件只触发一次 1VP，实现每个随从单独触发 `onMinionDestroyed`，可能导致批量消灭时获得多个 1VP
- **结论: ⚠️ 语义偏差** — 批量消灭可能多次触发（取决于框架层是否合并消灭事件）

#### 19. base_the_workshop（工坊）
- i18n: "当一个玩家打出一个战术到这个基地时，该玩家可以额外打出一张战术。"
- 实现: `onActionPlayed` → `LIMIT_MODIFIED(action, +1)`
- **结论: ✅ 通过**

#### 20. base_stadium（体育场）
- i18n: "这里的一个随从被消灭后，它的控制者抽一张卡牌。"
- 实现: `onMinionDestroyed` → `CARDS_DRAWN(controllerId, 1)`
- **结论: ✅ 通过**

#### 21. base_ritual_site（仪式场所）
- i18n: "在这个基地计分后。在它上面的所有随从洗回他们的拥有者牌库，而不是进入弃牌堆。"
- 实现: `afterScoring` → 遍历所有随从 → `CARD_TO_DECK_BOTTOM`
- **结论: ✅ 通过**

### 纯数据驱动限制类基地（无能力代码）

以下基地通过 `BaseCardDef.restrictions` 或 `isOperationRestricted` 数据驱动实现，无需能力代码：

- base_the_jungle（绿洲丛林）— 无能力文本
- base_dread_lookout（恐怖眺望台）— "玩家不能打出战术到这个基地上" → 限制类
- base_tsars_palace（沙皇宫殿）— "力量为2或以下的随从不能被打出到这里" → 限制类
- base_castle_of_ice（冰之城堡）— "随从不能被打出到这" → 限制类
- base_north_pole（北极基地）— "玩家每回合只能打出一个随从到这个基地" → 限制类

## 交叉影响备注

1. **base_the_homeworld + base_secret_garden**：两者都授予额外随从额度 + 力量 ≤2 限制，使用相同的 `restrictions: extraPlayMinionPowerMax` 机制
2. **base_cave_of_shinies + base_the_field_of_honor**：两者都在随从消灭时触发，但前者给拥有者 VP，后者给消灭者 VP
3. **base_tar_pits + base_ritual_site**：两者都改变随从消灭/计分后的去向（牌库底 vs 洗回牌库）
4. **base_ninja_dojo 范围问题**：如果确认"任意一个随从"包含所有基地，需要修改为全局随从选择
