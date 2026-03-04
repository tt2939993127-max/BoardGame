# 需求文档：大杀四方核心能力实现

## 简介

本需求文档定义大杀四方 (Smash Up) 桌游的核心能力系统实现，覆盖从派系选择到完整能力执行的全链路。当前游戏已具备基础骨架（类型定义、命令/事件/归约器、FlowSystem 钩子、17 个派系卡牌数据、44 张基地卡），但存在 10 个关键缺口：派系选择硬编码、行动卡无效果执行、随从能力仅部分实现（仅外星人 onPlay）、基地能力无执行逻辑、无目标选择系统、无特殊牌响应窗口、持续行动无附着管理、+1 力量指示物无命令、多基地记分不完整、测试覆盖不足。

本需求按四个阶段组织：A 阶段（核心可玩）、B 阶段（派系能力实装）、C 阶段（高级机制）、D 阶段（打磨）。

## 术语表

- **Ability_Resolver**: 能力解析器，负责将卡牌定义中的能力标签（onPlay/ongoing/talent/special/extra）映射到具体执行逻辑的模块
- **Action_Effect_Executor**: 行动卡效果执行器，根据行动卡子类型（standard/ongoing/special）执行对应效果并管理卡牌去向
- **Base_Ability_Trigger**: 基地能力触发器，在特定游戏事件（随从入场、记分前、记分后、回合开始）时检查并执行基地能力
- **Faction_Selection_System**: 派系选择系统，游戏开始前允许玩家从可用派系中选择 2 个派系组成牌库的交互流程
- **Me_First_Window**: "我先来！"响应窗口，当特定事件发生时，从当前玩家开始顺时针轮流允许打出特殊牌的机制
- **Ongoing_Action_Manager**: 持续行动管理器，负责将 ongoing 类型行动卡附着到基地或随从上，并在基地记分时清理
- **Power_Counter_System**: +1 力量指示物系统，管理随从上 +1 力量指示物的添加、移除和随从离场时的清理
- **Prompt_System**: 提示系统，引擎层已有的交互式目标选择系统，用于让玩家在能力执行过程中选择目标（随从、基地、玩家、手牌等）
- **Multi_Base_Scorer**: 多基地记分器，当多个基地同时达到临界点时，由当前玩家选择记分顺序并依次处理的模块
- **SmashUpCore**: 大杀四方核心游戏状态，包含玩家状态、基地状态、牌库、回合信息等
- **FlowSystem**: 流程系统，引擎层的阶段管理系统，控制回合阶段的推进和事件触发
- **CardDef**: 卡牌定义，静态数据结构，包含卡牌的名称、力量、能力文本、能力标签等
- **BaseCardDef**: 基地卡定义，包含基地名称、临界点、VP 奖励、能力文本等
- **AbilityTag**: 能力标签，标识能力的触发时机：onPlay（打出时）、ongoing（持续）、talent（天赋，每回合一次）、special（特殊，响应时打出）、extra（额外，不计入出牌限额）

## 需求

### 需求 1：派系选择系统

**用户故事：** 作为玩家，我希望在游戏开始前从可用派系列表中选择 2 个派系来组成我的牌库，这样每局游戏都能体验不同的派系组合策略。

#### 验收标准

1. WHEN 游戏初始化时，THE Faction_Selection_System SHALL 进入派系选择阶段，在所有玩家完成选择前阻止游戏正式开始
2. WHEN 进入派系选择阶段时，THE Faction_Selection_System SHALL 向每位玩家展示所有可用派系列表（包含派系名称和简介）
3. WHEN 一位玩家选择了一个派系时，THE Faction_Selection_System SHALL 将该派系标记为已被选择，其他玩家不可再选同一派系
4. WHEN 一位玩家完成 2 个派系的选择时，THE Faction_Selection_System SHALL 使用该玩家选择的 2 个派系的卡牌构建 40 张牌库并洗混
5. WHEN 所有玩家完成派系选择时，THE Faction_Selection_System SHALL 为每位玩家抽取 5 张起始手牌，翻开（玩家数+1）张基地，并推进到正式游戏阶段
6. IF 玩家选择的派系已被其他玩家选择，THEN THE Faction_Selection_System SHALL 拒绝该选择并提示玩家重新选择

### 需求 2：能力解析框架

**用户故事：** 作为开发者，我希望建立一个通用的能力解析框架，能够根据卡牌定义中的能力标签（onPlay/ongoing/talent/special/extra）分发到对应的执行逻辑，这样可以统一管理所有派系的能力实现。

#### 验收标准

1. THE Ability_Resolver SHALL 支持按 AbilityTag（onPlay、ongoing、talent、special、extra）分发能力执行
2. WHEN 一张带有 onPlay 标签的随从被打出时，THE Ability_Resolver SHALL 在随从放置到基地后立即执行该随从的 onPlay 能力
3. WHEN 一张带有 talent 标签的随从的天赋被激活时，THE Ability_Resolver SHALL 检查该随从本回合是否已使用天赋，仅在未使用时执行
4. WHEN 一个能力需要选择目标时，THE Ability_Resolver SHALL 通过 Prompt_System 发起目标选择请求，暂停能力执行直到玩家完成选择
5. THE Ability_Resolver SHALL 提供按 defId 注册能力执行函数的机制，使每个派系可以独立注册自己的能力实现
6. IF 一张卡牌的 defId 没有注册对应的能力执行函数，THEN THE Ability_Resolver SHALL 跳过能力执行并记录警告日志

### 需求 3：行动卡效果系统

**用户故事：** 作为玩家，我希望打出行动卡时能够执行卡牌描述的效果（而不仅仅是消耗卡牌），这样行动卡才能发挥其战术价值。

#### 验收标准

1. WHEN 一张 standard 子类型的行动卡被打出时，THE Action_Effect_Executor SHALL 执行该卡牌的效果，然后将卡牌放入拥有者的弃牌堆
2. WHEN 一张 ongoing 子类型的行动卡被打出时，THE Action_Effect_Executor SHALL 将该卡牌附着到目标基地或随从上，卡牌留在场上而非进入弃牌堆
3. WHEN 一张 special 子类型的行动卡在 Me_First_Window 中被打出时，THE Action_Effect_Executor SHALL 执行该卡牌的效果，然后将卡牌放入弃牌堆
4. WHEN 一张 ongoing 行动卡所附着的基地被记分时，THE Ongoing_Action_Manager SHALL 将该行动卡移入其拥有者的弃牌堆
5. WHEN 一张 ongoing 行动卡所附着的随从离场时，THE Ongoing_Action_Manager SHALL 将该行动卡移入其拥有者的弃牌堆

### 需求 4：+1 力量指示物系统

**用户故事：** 作为玩家，我希望能够在随从上放置和移除 +1 力量指示物，这样能力和效果可以动态修改随从的力量值。

#### 验收标准

1. WHEN 一个效果要求在随从上放置 N 个 +1 力量指示物时，THE Power_Counter_System SHALL 将该随从的 powerModifier 增加 N
2. WHEN 一个效果要求从随从上移除 N 个 +1 力量指示物时，THE Power_Counter_System SHALL 将该随从的 powerModifier 减少 N（最低为 0）
3. WHEN 一个带有 +1 力量指示物的随从离场（被消灭、收回手牌、洗入牌库）时，THE Power_Counter_System SHALL 移除该随从上的所有指示物（powerModifier 归零）
4. WHEN 计算基地上的总力量时，THE SmashUpCore SHALL 将每个随从的 basePower + powerModifier 纳入计算

### 需求 5：多基地记分

**用户故事：** 作为玩家，我希望当多个基地同时达到临界点时，能够选择记分顺序，这样可以利用记分顺序获得战术优势。

#### 验收标准

1. WHEN 进入记分阶段且有多个基地的总力量达到或超过临界点时，THE Multi_Base_Scorer SHALL 通过 Prompt_System 让当前玩家选择先记分哪个基地
2. WHEN 一个基地完成记分后，THE Multi_Base_Scorer SHALL 重新检查剩余基地是否仍达到临界点（因为随从离场可能改变力量分布）
3. WHEN 记分过程中有新基地补充入场时，THE Multi_Base_Scorer SHALL 将新基地纳入后续的临界点检查
4. WHEN 一个基地记分时只有一位玩家有随从，THE Multi_Base_Scorer SHALL 仅将第一名 VP 奖励给该玩家
5. WHEN 多位玩家在同一基地力量相同时，THE Multi_Base_Scorer SHALL 将该名次的最高 VP 奖励给所有平局玩家

### 需求 6：目标选择系统集成

**用户故事：** 作为玩家，我希望在能力需要选择目标时（如选择一个随从、一个基地、一张手牌），能够通过交互界面进行选择，这样能力可以精确地作用于我想要的目标。

#### 验收标准

1. WHEN 一个能力需要选择一个基地上的随从作为目标时，THE Prompt_System SHALL 展示所有合法目标随从供玩家选择
2. WHEN 一个能力需要选择一个基地作为目标时，THE Prompt_System SHALL 展示所有合法目标基地供玩家选择
3. WHEN 一个能力需要从手牌中选择卡牌时，THE Prompt_System SHALL 展示玩家手牌中所有合法选项供选择
4. WHEN 一个能力的目标选择有数量限制时（如"选择最多 2 个随从"），THE Prompt_System SHALL 强制执行该数量限制
5. IF 一个能力的合法目标为空（如场上没有可选随从），THEN THE Ability_Resolver SHALL 跳过该能力的目标选择步骤并继续执行后续逻辑
6. WHEN 玩家完成目标选择时，THE Prompt_System SHALL 将选择结果传回 Ability_Resolver 以继续能力执行

### 需求 7：基础版 8 派系能力实装

**用户故事：** 作为玩家，我希望基础版 8 个派系（海盗、忍者、外星人、恐龙、机器人、巫师、僵尸、诡术师）的所有卡牌能力都能正确执行，这样可以体验完整的基础版游戏。

#### 验收标准

1. WHEN 海盗派系的随从或行动卡能力被触发时，THE Ability_Resolver SHALL 正确执行移动随从到其他基地、额外出牌等海盗主题能力
2. WHEN 忍者派系的随从或行动卡能力被触发时，THE Ability_Resolver SHALL 正确执行消灭随从、从手牌直接放置随从等忍者主题能力
3. WHEN 外星人派系的随从或行动卡能力被触发时，THE Ability_Resolver SHALL 正确执行收回随从到手牌、额外出牌等外星人主题能力
4. WHEN 恐龙派系的随从或行动卡能力被触发时，THE Ability_Resolver SHALL 正确执行力量增强、大型随从优势等恐龙主题能力
5. WHEN 机器人派系的随从或行动卡能力被触发时，THE Ability_Resolver SHALL 正确执行从牌库打出随从、微型机器人联动等机器人主题能力
6. WHEN 巫师派系的随从或行动卡能力被触发时，THE Ability_Resolver SHALL 正确执行抽牌、额外打出行动卡等巫师主题能力
7. WHEN 僵尸派系的随从或行动卡能力被触发时，THE Ability_Resolver SHALL 正确执行从弃牌堆复活随从、弃牌堆操作等僵尸主题能力
8. WHEN 诡术师派系的随从或行动卡能力被触发时，THE Ability_Resolver SHALL 正确执行消灭自己随从获益、转移随从等诡术师主题能力

### 需求 8：基地能力触发

**用户故事：** 作为玩家，我希望基地卡上描述的能力能够在正确的时机自动触发，这样基地不仅是记分场所，还能影响游戏策略。

#### 验收标准

1. WHEN 一个随从被打出到一个有"随从入场时"能力的基地时，THE Base_Ability_Trigger SHALL 在随从的 onPlay 能力之后触发基地能力
2. WHEN 一个基地进入记分流程时，THE Base_Ability_Trigger SHALL 在颁发 VP 之前触发"记分前"基地能力
3. WHEN 一个基地完成记分后，THE Base_Ability_Trigger SHALL 在清场之前触发"记分后"基地能力
4. WHEN 一个玩家的回合开始时，THE Base_Ability_Trigger SHALL 检查所有场上基地并触发"回合开始时"基地能力
5. WHEN 一个基地能力需要玩家选择时，THE Base_Ability_Trigger SHALL 通过 Prompt_System 发起交互选择

### 需求 9：特殊牌响应窗口（Me First!）

**用户故事：** 作为玩家，我希望在特定事件发生时（如基地记分前），能够按顺时针顺序打出特殊牌进行响应，这样可以在关键时刻改变局势。

#### 验收标准

1. WHEN 一个触发 Me_First_Window 的事件发生时（如基地即将记分），THE Me_First_Window SHALL 从当前玩家开始顺时针轮流询问每位玩家是否要打出特殊牌
2. WHEN 轮到一位玩家时，THE Me_First_Window SHALL 允许该玩家打出 1 张手牌中的 special 子类型行动卡或选择让过
3. WHEN 一位玩家打出特殊牌后，THE Me_First_Window SHALL 执行该特殊牌的效果，然后继续询问下一位玩家
4. WHEN 所有玩家连续让过（即一轮中无人打出特殊牌）时，THE Me_First_Window SHALL 关闭响应窗口并继续原流程
5. WHEN 特殊牌的效果改变了游戏状态时，THE Me_First_Window SHALL 允许其他玩家对此变化再次响应

### 需求 10：扩展派系能力实装

**用户故事：** 作为玩家，我希望扩展包派系（幽灵、熊骑兵、蒸汽朋克、杀手植物）的所有卡牌能力都能正确执行，这样可以体验更丰富的派系组合。

#### 验收标准

1. WHEN 幽灵派系的随从或行动卡能力被触发时，THE Ability_Resolver SHALL 正确执行从弃牌堆打出随从、穿越基地等幽灵主题能力
2. WHEN 熊骑兵派系的随从或行动卡能力被触发时，THE Ability_Resolver SHALL 正确执行消灭对手随从、力量压制等熊骑兵主题能力
3. WHEN 蒸汽朋克派系的随从或行动卡能力被触发时，THE Ability_Resolver SHALL 正确执行附着行动卡增益、机械联动等蒸汽朋克主题能力
4. WHEN 杀手植物派系的随从或行动卡能力被触发时，THE Ability_Resolver SHALL 正确执行力量增长、繁殖扩张等杀手植物主题能力

### 需求 11：克苏鲁扩展机制

**用户故事：** 作为玩家，我希望克苏鲁扩展的特殊机制（疯狂牌库、疯狂牌惩罚）和相关派系（克苏鲁教团、远古之物、印斯茅斯、米斯卡塔尼克大学）能力正确执行，这样可以体验克苏鲁主题的独特玩法。

#### 验收标准

1. WHEN 使用克苏鲁扩展派系时，THE SmashUpCore SHALL 初始化一个包含 30 张疯狂行动卡的独立疯狂牌库
2. WHEN 一个效果要求玩家抽取疯狂牌时，THE SmashUpCore SHALL 从疯狂牌库顶部抽取指定数量的疯狂牌加入该玩家手牌
3. WHEN 一张疯狂牌离场时，THE SmashUpCore SHALL 将该疯狂牌放入其控制者的弃牌堆（而非返回疯狂牌库）
4. WHEN 游戏结束计算最终 VP 时，THE SmashUpCore SHALL 对每位玩家弃牌堆和手牌中的疯狂牌按每 2 张扣 1 VP 进行惩罚
5. WHEN 克苏鲁扩展四个派系的能力被触发时，THE Ability_Resolver SHALL 正确执行各派系的主题能力（教团的牺牲、远古之物的疯狂散播、印斯茅斯的弃牌堆操作、米大的疯狂牌管理）

### 需求 12：领域测试覆盖

**用户故事：** 作为开发者，我希望核心领域逻辑有完善的自动化测试覆盖，这样可以在后续开发中快速发现回归问题。

#### 验收标准

1. THE 测试套件 SHALL 覆盖所有命令的验证逻辑（PLAY_MINION、PLAY_ACTION、DISCARD_TO_LIMIT 及新增命令）
2. THE 测试套件 SHALL 覆盖所有事件的归约逻辑（确保每种事件正确更新状态）
3. THE 测试套件 SHALL 覆盖能力解析框架的分发逻辑（onPlay/ongoing/talent/special/extra 各标签的正确触发）
4. THE 测试套件 SHALL 覆盖基地记分流程（单基地记分、多基地记分、VP 平局处理、记分后清场）
5. THE 测试套件 SHALL 覆盖派系选择流程（选择、互斥、牌库构建）
6. THE 测试套件 SHALL 覆盖 +1 力量指示物的添加、移除和离场清理
7. THE 测试套件 SHALL 覆盖持续行动卡的附着和清理逻辑
8. WHEN 新增任何能力实现时，THE 开发者 SHALL 同步补充该能力的测试用例
