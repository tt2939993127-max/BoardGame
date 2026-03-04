# 需求文档：Smash Up Phase 3 剩余能力实现

## 简介

本文档定义 Smash Up（大杀四方）Phase 3 所有剩余 TODO 项的实现需求。Phase 3 前两个任务（special_madness 和 6 个基地 Prompt 化）已完成，全仓测试 2266 pass / 0 fail。本次覆盖全部未完成项：海盗 Full Sail、克苏鲁能力修正、母星力量校验、所有剩余基地能力 Prompt 化、被动保护类基地、以及需要 UI 支持的外星人/密大能力。

## 术语表

- **Ability_System**：能力系统，负责注册和执行卡牌能力（onPlay / ongoing / trigger 等时机）
- **Prompt_System**：Prompt 系统，通过 `setPromptContinuation` 向玩家发起选择请求，玩家选择后通过 `registerPromptContinuation` 注册的回调处理结果
- **Reducer**：状态归约器（`domain/reducer.ts`），接收事件并更新游戏核心状态 `SmashUpCore`
- **SmashUpCore**：游戏核心状态对象，包含基地、玩家、牌库等所有游戏数据
- **turnDestroyedMinions**：`SmashUpCore` 上的字段，追踪本回合被消灭的随从记录
- **CARD_TO_DECK_BOTTOM**：已有事件类型，将卡牌从当前位置移至拥有者牌库底部
- **MINION_RETURNED**：已有事件类型，将随从从基地返回拥有者手牌
- **MINION_MOVED**：已有事件类型，将随从从一个基地移动到另一个基地
- **LIMIT_MODIFIED**：已有事件类型，修改玩家的出牌次数限制
- **BaseAbility**：基地能力，通过 `registerBaseAbility` / `registerExtended` 注册，在特定时机触发
- **Continuation**：Prompt 继续函数，通过 `registerPromptContinuation` 注册，处理玩家对 Prompt 的选择结果
- **Interceptor**：事件拦截器，在事件被 Reducer 处理前拦截并替换为其他事件

## 需求

### 需求 1：海盗 Full Sail 多步移动能力

**用户故事：** 作为玩家，我想使用 Full Sail 行动卡将任意数量的己方随从移动到其他基地，以便灵活调配战力。

#### 验收标准

1. WHEN 玩家打出 Full Sail 行动卡, THE Ability_System SHALL 收集该玩家在所有基地上的己方随从并生成"选择随从"Prompt
2. WHEN 玩家在 Full Sail Prompt 中选择一个随从, THE Prompt_System SHALL 生成"选择目标基地"Prompt，列出该随从当前所在基地以外的所有基地
3. WHEN 玩家选择目标基地后, THE Ability_System SHALL 产生 MINION_MOVED 事件将该随从移动到目标基地，并重新生成"选择随从"Prompt 以继续移动
4. WHEN 玩家在"选择随从"Prompt 中选择"完成移动", THE Prompt_System SHALL 结束 Full Sail 流程，不再生成新的 Prompt
5. WHEN 玩家没有可移动的己方随从时, THE Ability_System SHALL 自动结束 Full Sail 流程，返回空事件列表
6. WHEN 一个随从已在本次 Full Sail 中被移动过, THE Ability_System SHALL 将该随从从后续"选择随从"Prompt 的选项中排除

### 需求 2：克苏鲁 Furthering the Cause 精确触发

**用户故事：** 作为玩家，我想让 Furthering the Cause 持续行动卡在回合结束时正确检查"本回合是否有对手随从在此基地被消灭"，以便按规则获得 VP。

#### 验收标准

1. WHEN 一个随从被消灭时, THE Reducer SHALL 将该随从的 defId、baseIndex 和 owner 追加到 `turnDestroyedMinions` 数组
2. WHEN 回合切换时, THE Reducer SHALL 清空 `turnDestroyedMinions` 数组
3. WHEN 回合结束触发 Furthering the Cause 检查时, THE Ability_System SHALL 遍历 `turnDestroyedMinions` 判断是否有对手随从在该持续行动卡所在基地被消灭
4. WHEN 本回合有对手随从在该基地被消灭, THE Ability_System SHALL 产生 VP_AWARDED 事件为持续行动卡的拥有者加 1 VP
5. WHEN 本回合没有对手随从在该基地被消灭, THE Ability_System SHALL 不产生任何 VP 事件

### 需求 3：母星（The Homeworld）力量≤2 校验

**用户故事：** 作为玩家，我想让母星基地的"额外打出随从"限制为力量≤2，以便符合规则约束。

#### 验收标准

1. WHEN 玩家在母星打出一个随从后, THE BaseAbility SHALL 产生 LIMIT_MODIFIED 事件授予该玩家额外 1 次随从出牌机会
2. WHEN 玩家尝试使用母星授予的额外出牌机会打出力量大于 2 的随从到母星, THE Ability_System SHALL 拒绝该操作
3. WHEN 玩家使用母星授予的额外出牌机会打出力量小于等于 2 的随从到母星, THE Ability_System SHALL 允许该操作正常执行

### 需求 4：Complete the Ritual 放牌库底修正

**用户故事：** 作为玩家，我想让 Complete the Ritual 在触发时将基地上的随从和行动卡放回拥有者牌库底而非手牌，以便符合规则描述。

#### 验收标准

1. WHEN Complete the Ritual 在回合开始触发时, THE Ability_System SHALL 对基地上的每个随从产生 CARD_TO_DECK_BOTTOM 事件而非 MINION_RETURNED 事件
2. WHEN Complete the Ritual 在回合开始触发时, THE Ability_System SHALL 对基地上的每个持续行动卡产生 CARD_TO_DECK_BOTTOM 事件
3. WHEN CARD_TO_DECK_BOTTOM 事件被 Reducer 处理后, THE Reducer SHALL 将该卡牌从基地移除并放入拥有者牌库底部

### 需求 5：基础版剩余基地能力 Prompt 化

**用户故事：** 作为玩家，我想让基础版中需要 Prompt 选择的基地能力正确生效，以便获得完整的游戏体验。

#### 验收标准

##### 5a. 海盗湾（Pirate Cove）— 计分后非冠军移动随从

1. WHEN 海盗湾基地计分后, THE BaseAbility SHALL 为除冠军外的每位在此有随从的玩家生成"选择移动随从"Prompt
2. WHEN 非冠军玩家选择一个己方随从和目标基地, THE Prompt_System SHALL 产生 MINION_MOVED 事件将该随从移动到目标基地
3. WHEN 非冠军玩家选择"跳过", THE Prompt_System SHALL 不移动任何随从

##### 5b. 托尔图加（Tortuga）— 计分后亚军移动随从

4. WHEN 托尔图加基地计分后且亚军在此有随从, THE BaseAbility SHALL 为亚军生成"选择移动随从到替换基地"Prompt
5. WHEN 亚军选择一个己方随从, THE Prompt_System SHALL 产生 MINION_MOVED 事件将该随从移动到替换本基地的新基地上
6. WHEN 亚军选择"跳过", THE Prompt_System SHALL 不移动任何随从

##### 5c. 巫师学院（Wizard Academy）— 计分后冠军查看基地牌库顶

7. WHEN 巫师学院基地计分后, THE BaseAbility SHALL 让冠军查看基地牌库顶 3 张卡并生成"选择排列顺序"Prompt
8. WHEN 冠军选择排列顺序后, THE Prompt_System SHALL 按选择顺序重排基地牌库顶 3 张卡

##### 5d. 蘑菇王国（Mushroom Kingdom）— 回合开始移动对手随从

9. WHEN 当前玩家回合开始时蘑菇王国在场, THE BaseAbility SHALL 生成"选择对手随从"Prompt，列出所有基地上的对手随从
10. WHEN 玩家选择一个对手随从, THE Prompt_System SHALL 产生 MINION_MOVED 事件将该随从移动到蘑菇王国
11. WHEN 玩家选择"跳过", THE Prompt_System SHALL 不移动任何随从

### 需求 6：克苏鲁扩展剩余基地能力

**用户故事：** 作为玩家，我想让克苏鲁扩展的基地能力正确生效，以便在使用克苏鲁派系时获得完整体验。

#### 验收标准

##### 6a. 疯人院（The Asylum）— 随从入场后返回疯狂卡

1. WHEN 玩家在疯人院打出一个随从后, THE BaseAbility SHALL 生成"选择返回疯狂卡"Prompt，列出该玩家手牌和弃牌堆中的疯狂卡
2. WHEN 玩家选择一张疯狂卡, THE Prompt_System SHALL 将该疯狂卡返回疯狂牌堆
3. WHEN 玩家选择"跳过"或无疯狂卡可返回, THE Prompt_System SHALL 不执行任何操作

##### 6b. 印斯茅斯基地（Innsmouth Base）— 随从入场后弃牌堆卡放牌库底

4. WHEN 玩家在印斯茅斯基地打出一个随从后, THE BaseAbility SHALL 生成"选择弃牌堆卡"Prompt，列出任意玩家弃牌堆中的卡牌
5. WHEN 玩家选择一张卡, THE Prompt_System SHALL 将该卡放入其拥有者的牌库底
6. WHEN 玩家选择"跳过", THE Prompt_System SHALL 不执行任何操作

##### 6c. 密斯卡托尼克大学基地（Miskatonic University Base）— 计分后返回疯狂卡

7. WHEN 密斯卡托尼克大学基地计分后, THE BaseAbility SHALL 让每位在此有随从的玩家可以将一张疯狂卡返回疯狂牌堆
8. WHEN 玩家选择一张疯狂卡, THE Prompt_System SHALL 将该疯狂卡返回疯狂牌堆

##### 6d. 冷原高地（Plateau of Leng）— 首次打出随从后可打同名随从

9. WHEN 玩家在冷原高地首次打出一个随从后, THE BaseAbility SHALL 检查该玩家手牌中是否有同名随从
10. WHEN 手牌中有同名随从, THE BaseAbility SHALL 生成"是否打出同名随从"Prompt
11. WHEN 玩家选择打出, THE Prompt_System SHALL 将该同名随从打出到冷原高地

### 需求 7：Awesome Level 9000 扩展剩余基地能力

**用户故事：** 作为玩家，我想让 AL9000 扩展的基地能力正确生效，以便在使用对应派系时获得完整体验。

#### 验收标准

##### 7a. 温室（Greenhouse）— 计分后搜牌库打出随从

1. WHEN 温室基地计分后, THE BaseAbility SHALL 让冠军搜索牌库并生成"选择随从"Prompt，列出牌库中的随从卡
2. WHEN 冠军选择一个随从, THE Prompt_System SHALL 将该随从打出到替换温室的新基地上
3. WHEN 冠军选择"跳过", THE Prompt_System SHALL 不打出任何随从

##### 7b. 神秘花园（Secret Garden）— 额外打出力量≤2 随从

4. THE BaseAbility SHALL 在每位玩家回合中授予额外 1 次随从出牌机会，限制目标为神秘花园且力量小于等于 2
5. WHEN 玩家尝试使用神秘花园授予的额外机会打出力量大于 2 的随从, THE Ability_System SHALL 拒绝该操作

##### 7c. 发明家沙龙（Inventor's Salon）— 计分后从弃牌堆取战术卡

6. WHEN 发明家沙龙基地计分后, THE BaseAbility SHALL 让冠军从弃牌堆中选择一张行动卡并生成 Prompt
7. WHEN 冠军选择一张行动卡, THE Prompt_System SHALL 将该行动卡放入冠军手牌

### 需求 8：Pretty Pretty 扩展剩余基地能力

**用户故事：** 作为玩家，我想让 Pretty Pretty 扩展的基地能力正确生效。

#### 验收标准

##### 8a. 诡猫巷（Cat Fanciers' Alley）— 消灭自己随从抽牌

1. WHEN 玩家在诡猫巷有随从且本回合未使用过此能力, THE BaseAbility SHALL 生成"选择消灭己方随从"Prompt
2. WHEN 玩家选择一个己方随从, THE Prompt_System SHALL 产生 MINION_DESTROYED 事件消灭该随从，并产生 CARDS_DRAWN 事件让该玩家抽 1 张卡
3. WHEN 玩家选择"跳过", THE Prompt_System SHALL 不执行任何操作

##### 8b. 九命之屋（House of Nine Lives）— 随从被消灭时可移到此处

4. WHEN 一个随从在其他基地被消灭时, THE Interceptor SHALL 检查九命之屋是否在场
5. IF 九命之屋在场, THEN THE Interceptor SHALL 生成"是否将该随从移到九命之屋"Prompt
6. WHEN 随从拥有者选择移动, THE Prompt_System SHALL 将该随从移动到九命之屋而非进入弃牌堆

##### 8c. 魔法林地（Enchanted Glade）— 打出战术到随从后抽牌

7. WHEN 玩家在魔法林地打出一张附着行动卡到随从上后, THE BaseAbility SHALL 产生 CARDS_DRAWN 事件让该玩家抽 1 张卡

##### 8d. 仙灵之环（Fairy Ring）— 首次打出随从后额外出牌

8. WHEN 玩家在仙灵之环首次打出一个随从后, THE BaseAbility SHALL 产生 LIMIT_MODIFIED 事件授予该玩家额外 1 次随从出牌机会和额外 1 次行动出牌机会

##### 8e. 平衡之地（Land of Balance）— 打出随从后移动自己随从

9. WHEN 玩家在平衡之地打出一个随从后, THE BaseAbility SHALL 生成"选择移动己方随从"Prompt，列出该玩家在其他基地的随从
10. WHEN 玩家选择一个己方随从, THE Prompt_System SHALL 产生 MINION_MOVED 事件将该随从移动到平衡之地
11. WHEN 玩家选择"跳过", THE Prompt_System SHALL 不移动任何随从

### 需求 9：被动保护类基地能力

**用户故事：** 作为玩家，我想让具有被动保护效果的基地正确限制对随从的操作，以便按规则保护随从。

#### 验收标准

##### 9a. 美丽城堡（Beautiful Castle）— 力量≥5 随从免疫

1. WHILE 美丽城堡在场, THE Interceptor SHALL 阻止任何针对该基地上力量大于等于 5 的随从的消灭、移动或影响操作
2. WHEN 一个能力试图影响美丽城堡上力量大于等于 5 的随从, THE Interceptor SHALL 忽略该操作并保持随从不变

##### 9b. 小马乐园（Pony Paradise）— 2+ 随从免疫消灭

3. WHILE 小马乐园在场且某玩家在此有 2 个或以上随从, THE Interceptor SHALL 阻止该玩家在此基地的随从被消灭
4. WHEN 一个能力试图消灭小马乐园上拥有 2 个或以上随从的玩家的随从, THE Interceptor SHALL 忽略该消灭操作

### 需求 10：需要 UI 支持的能力（标记为待 UI）

**用户故事：** 作为玩家，我想让外星人和密大的手牌查看类能力在 UI 支持就绪后可以使用。

#### 验收标准

##### 10a. 外星人 Probe / Scout Ship — 查看对手手牌/牌库顶

1. WHEN 玩家打出 Alien Probe 行动卡, THE Ability_System SHALL 产生 REVEAL_HAND 事件展示目标对手的手牌（需要 UI 展示组件）
2. WHEN 玩家打出 Alien Scout Ship 行动卡, THE Ability_System SHALL 产生 REVEAL_DECK_TOP 事件展示牌库顶卡牌（需要 UI 展示组件）

##### 10b. 密大 Book of Iter — 查看对手手牌

3. WHEN Book of Iter 的额外行动能力触发时, THE Ability_System SHALL 产生 REVEAL_HAND 事件展示对手手牌（需要 UI 展示组件）

### 需求 11：Full Sail Special 时机（基地计分前打出）

**用户故事：** 作为玩家，我想在基地计分前使用 Full Sail 的 special 能力打出该卡，以便在关键时刻调配随从。

#### 验收标准

1. WHEN 基地进入计分流程前, THE Ability_System SHALL 检查当前玩家手牌中是否有可在计分前打出的 special 卡牌
2. WHEN 玩家选择在计分前打出 Full Sail, THE Ability_System SHALL 执行 Full Sail 的 onPlay 效果（多步移动随从）
3. IF 计分前 special action 机制尚未实现, THEN THE Ability_System SHALL 在代码中标注 TODO 并跳过此时机

### 需求 12：疯狂卡终局 VP 惩罚

**用户故事：** 作为玩家，我想在游戏结束时按规则扣除疯狂卡带来的 VP 惩罚，以便正确计算最终得分。

#### 验收标准

1. WHEN 游戏结束进入最终计分时, THE Ability_System SHALL 统计每位玩家牌组、手牌和弃牌堆中的疯狂卡数量
2. THE Ability_System SHALL 按每 2 张疯狂卡扣除 1 VP 的规则计算惩罚（向下取整）
3. WHEN 存在 VP 平局时, THE Ability_System SHALL 以疯狂卡较少的玩家为胜者
