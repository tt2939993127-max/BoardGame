# 需求文档：大杀四方（SmashUp）全派系全基地审计

## 简介

对大杀四方（SmashUp, gameId: `smashup`）进行系统性的全派系、全基地"描述→实现"一致性审计。审计范围覆盖全部 21 个派系（含疯狂牌库）和全部 40+ 张基地卡。审计方式为逐派系、逐基地进行，遵循 `docs/ai-rules/testing-audit.md` 中的"描述→实现全链路审查规范"。

审计目标：确保每张卡牌（随从/行动/基地）的规则描述文本与代码实现完全一致，发现并记录所有偏差（缺失实现、错误实现、多余实现）。

## 审计数据源与冲突处理规范

- **主要对照源**：SmashUp Wiki（https://smashup.fandom.com/wiki/）上的卡牌描述文本
- **代码侧数据源**：i18n JSON 描述 + 能力注册表实现代码
- **冲突处理原则**：当代码实现与 Wiki 描述存在差异时，**不自动以 Wiki 为准修改**，而是将差异累积记录，统一向用户确认后再决定以哪方为准
- **差异记录格式**：每条差异需记录：卡牌名称、defId、Wiki 描述摘要、代码实现摘要、差异点说明
- **确认批次**：每完成一个派系或一组基地的审计后，将该批次的差异汇总提交用户确认

## 术语表

- **Audit_System**: 审计系统，执行描述→实现全链路审查的流程
- **Faction**: 派系，大杀四方中的阵营单位，每个派系包含随从卡和行动卡
- **Base**: 基地卡，场上的争夺目标，达到临界点后记分
- **Ability**: 能力，卡牌上的效果描述，包括 onPlay（打出时）、talent（天赋）、ongoing（持续）、special（特殊）、onDestroy（被摧毁时）等标签
- **Base_Ability**: 基地能力，基地卡上的特殊效果，在特定时机触发
- **Description**: 描述文本，卡牌上的规则文字（来源：i18n JSON 或卡牌数据定义）
- **Implementation**: 实现代码，能力注册表中注册的执行函数
- **Deviation**: 偏差，描述与实现之间的不一致
- **Breakpoint**: 临界点，基地卡上的力量阈值
- **VP_Awards**: 胜利点奖励，基地记分时按排名分配的分数

## 需求

### 需求 1：基础版 8 派系审计

**用户故事：** 作为开发者，我希望审计基础版 8 个派系的所有卡牌，以确保描述与实现一致。

#### 验收标准

1. WHEN 审计外星人（Aliens）派系时，THE Audit_System SHALL 逐张检查所有随从卡和行动卡的能力描述与 `abilities/aliens.ts` 中的实现是否一致
2. WHEN 审计恐龙（Dinosaurs）派系时，THE Audit_System SHALL 逐张检查所有随从卡和行动卡的能力描述与 `abilities/dinosaurs.ts` 中的实现是否一致
3. WHEN 审计忍者（Ninjas）派系时，THE Audit_System SHALL 逐张检查所有随从卡和行动卡的能力描述与 `abilities/ninjas.ts` 中的实现是否一致
4. WHEN 审计海盗（Pirates）派系时，THE Audit_System SHALL 逐张检查所有随从卡和行动卡的能力描述与 `abilities/pirates.ts` 中的实现是否一致
5. WHEN 审计机器人（Robots）派系时，THE Audit_System SHALL 逐张检查所有随从卡和行动卡的能力描述与 `abilities/robots.ts` 中的实现是否一致
6. WHEN 审计巫师（Wizards）派系时，THE Audit_System SHALL 逐张检查所有随从卡和行动卡的能力描述与 `abilities/wizards.ts` 中的实现是否一致
7. WHEN 审计丧尸（Zombies）派系时，THE Audit_System SHALL 逐张检查所有随从卡和行动卡的能力描述与 `abilities/zombies.ts` 中的实现是否一致
8. WHEN 审计捣蛋鬼（Tricksters）派系时，THE Audit_System SHALL 逐张检查所有随从卡和行动卡的能力描述与 `abilities/tricksters.ts` 中的实现是否一致


### 需求 2：Awesome Level 9000 扩展派系审计

**用户故事：** 作为开发者，我希望审计 Awesome Level 9000 扩展的 4 个派系的所有卡牌，以确保描述与实现一致。

#### 验收标准

1. WHEN 审计幽灵（Ghosts）派系时，THE Audit_System SHALL 逐张检查所有随从卡和行动卡的能力描述与 `abilities/ghosts.ts` 中的实现是否一致
2. WHEN 审计熊骑兵（Bear Cavalry）派系时，THE Audit_System SHALL 逐张检查所有随从卡和行动卡的能力描述与 `abilities/bear_cavalry.ts` 中的实现是否一致
3. WHEN 审计蒸汽朋克（Steampunks）派系时，THE Audit_System SHALL 逐张检查所有随从卡和行动卡的能力描述与 `abilities/steampunks.ts` 中的实现是否一致
4. WHEN 审计食人花（Killer Plants）派系时，THE Audit_System SHALL 逐张检查所有随从卡和行动卡的能力描述与 `abilities/killer_plants.ts` 中的实现是否一致

### 需求 3：克苏鲁扩展派系审计

**用户故事：** 作为开发者，我希望审计克苏鲁扩展的 4 个派系（含疯狂牌库）的所有卡牌，以确保描述与实现一致。

#### 验收标准

1. WHEN 审计克苏鲁仆从（Minions of Cthulhu）派系时，THE Audit_System SHALL 逐张检查所有随从卡和行动卡的能力描述与 `abilities/cthulhu.ts` 中的实现是否一致
2. WHEN 审计远古物种（Elder Things）派系时，THE Audit_System SHALL 逐张检查所有随从卡和行动卡的能力描述与 `abilities/elder_things.ts` 中的实现是否一致
3. WHEN 审计印斯茅斯（Innsmouth）派系时，THE Audit_System SHALL 逐张检查所有随从卡和行动卡的能力描述与 `abilities/innsmouth.ts` 中的实现是否一致
4. WHEN 审计米斯卡塔尼克（Miskatonic University）派系时，THE Audit_System SHALL 逐张检查所有随从卡和行动卡的能力描述与 `abilities/miskatonic.ts` 中的实现是否一致
5. WHEN 审计疯狂（Madness）牌库时，THE Audit_System SHALL 检查疯狂牌的能力描述与实现是否一致，包括终局惩罚机制（每 2 张疯狂牌扣 1 VP）

### 需求 4：Monster Smash 扩展派系审计

**用户故事：** 作为开发者，我希望审计 Monster Smash 扩展的 4 个派系的所有卡牌，以确保描述与实现一致。

#### 验收标准

1. WHEN 审计科学怪人（Frankenstein）派系时，THE Audit_System SHALL 逐张检查所有随从卡和行动卡的能力描述与 `abilities/frankenstein.ts` 中的实现是否一致
2. WHEN 审计狼人（Werewolves）派系时，THE Audit_System SHALL 逐张检查所有随从卡和行动卡的能力描述与 `abilities/werewolves.ts` 中的实现是否一致
3. WHEN 审计吸血鬼（Vampires）派系时，THE Audit_System SHALL 逐张检查所有随从卡和行动卡的能力描述与 `abilities/vampires.ts` 中的实现是否一致
4. WHEN 审计巨蚁（Giant Ants）派系时，THE Audit_System SHALL 逐张检查所有随从卡和行动卡的能力描述与 `abilities/giant_ants.ts` 中的实现是否一致

### 需求 5：基础版基地卡审计

**用户故事：** 作为开发者，我希望审计基础版 16 张基地卡的能力和数值，以确保描述与实现一致。

#### 验收标准

1. THE Audit_System SHALL 检查每张基础版基地卡的临界点（breakpoint）数值与规则描述是否一致
2. THE Audit_System SHALL 检查每张基础版基地卡的 VP 奖励（vpAwards）数值与规则描述是否一致
3. WHEN 基地卡具有特殊能力时，THE Audit_System SHALL 检查能力描述与 `domain/baseAbilities.ts` 中的实现是否一致
4. WHEN 基地卡具有限制条件（restrictions）时，THE Audit_System SHALL 检查限制条件的实现与描述是否一致
5. WHEN 基地卡具有随从力量加成（minionPowerBonus）时，THE Audit_System SHALL 检查加成数值与描述是否一致
6. THE Audit_System SHALL 覆盖以下基础版基地：家园、母舰（外星人）；中央大脑、436-1337工厂（机器人）；绿洲丛林、焦油坑（恐龙）；刚柔流寺庙、忍者道场（忍者）；闪光洞穴、蘑菇王国（捣蛋鬼）；伊万斯堡城镇公墓、罗德百货商场（丧尸）；灰色猫眼石/海盗湾、托尔图加（海盗）；大图书馆、巫师学院（巫师）

### 需求 6：Awesome Level 9000 扩展基地卡审计

**用户故事：** 作为开发者，我希望审计 AL9000 扩展的 8 张基地卡的能力和数值，以确保描述与实现一致。

#### 验收标准

1. THE Audit_System SHALL 检查每张 AL9000 扩展基地卡的临界点和 VP 奖励数值与规则描述是否一致
2. WHEN 基地卡具有特殊能力时，THE Audit_System SHALL 检查能力描述与 `domain/baseAbilities.ts` 或 `domain/baseAbilities_expansion.ts` 中的实现是否一致
3. WHEN 基地卡具有限制条件时，THE Audit_System SHALL 检查限制条件的实现与描述是否一致
4. THE Audit_System SHALL 覆盖以下 AL9000 基地：恐怖眺望台、鬼屋（幽灵）；荣誉之地、沙皇宫殿（熊骑兵）；发明家沙龙、工坊（蒸汽朋克）；温室、神秘花园（食人花）

### 需求 7：克苏鲁扩展基地卡审计

**用户故事：** 作为开发者，我希望审计克苏鲁扩展的 8 张基地卡的能力和数值，以确保描述与实现一致。

#### 验收标准

1. THE Audit_System SHALL 检查每张克苏鲁扩展基地卡的临界点和 VP 奖励数值与规则描述是否一致
2. WHEN 基地卡具有特殊能力时，THE Audit_System SHALL 检查能力描述与 `domain/baseAbilities_expansion.ts` 中的实现是否一致
3. THE Audit_System SHALL 覆盖以下克苏鲁基地：仪式场所、庇护所、疯狂山脉（远古物种）；拉莱耶（克苏鲁仆从）；印斯茅斯、伦格高原（印斯茅斯）；米斯卡塔尼克大学（米斯卡塔尼克）

### 需求 8：Monster Smash 扩展基地卡审计

**用户故事：** 作为开发者，我希望审计 Monster Smash 扩展的 8 张基地卡的能力和数值，以确保描述与实现一致。

#### 验收标准

1. THE Audit_System SHALL 检查每张 Monster Smash 扩展基地卡的临界点和 VP 奖励数值与规则描述是否一致
2. WHEN 基地卡具有特殊能力时，THE Audit_System SHALL 检查能力描述与 `domain/baseAbilities_expansion.ts` 中的实现是否一致
3. THE Audit_System SHALL 覆盖以下 Monster Smash 基地：实验工坊、魔像城堡（科学怪人）；集会场、巨石阵（狼人）；卵室、蚁丘（巨蚁）；血堡、地窖（吸血鬼）


### 需求 9：Pretty Pretty / Set4 扩展基地卡审计

**用户故事：** 作为开发者，我希望审计 Pretty Pretty 和 Set4 扩展中非派系专属基地卡的能力和数值，以确保描述与实现一致。

#### 验收标准

1. THE Audit_System SHALL 检查 Pretty Pretty 扩展基地卡的临界点和 VP 奖励数值与规则描述是否一致
2. THE Audit_System SHALL 覆盖以下 Pretty Pretty 基地：诡猫巷、九命之家（猫咪）；迷人峡谷、仙灵圈（仙灵）；美丽城堡、冰之城堡（公主）；平衡之地、小马乐园（神话马）
3. THE Audit_System SHALL 覆盖以下 Set4 基地：北极基地（电子猿）；牧场、绵羊神社（绵羊）
4. WHEN 基地卡具有限制条件或特殊能力时，THE Audit_System SHALL 检查实现与描述是否一致

### 需求 10：审计流程与输出规范

**用户故事：** 作为开发者，我希望审计流程遵循统一规范，输出结构化的审计报告，以便追踪和修复偏差。

#### 验收标准

1. THE Audit_System SHALL 对每张卡牌执行以下审计步骤：读取描述文本（i18n JSON 或卡牌数据）→ 读取实现代码（能力注册表/基地能力注册表）→ 逐条比对 → 记录偏差
2. THE Audit_System SHALL 将审计结果分为三类：✅ 一致（描述与实现匹配）、⚠️ 偏差（描述与实现不一致）、❌ 缺失（有描述无实现或有实现无描述）
3. WHEN 发现偏差时，THE Audit_System SHALL 记录偏差类型（缺失实现/错误实现/多余实现/数值错误）、涉及的卡牌 defId、描述文本摘要、实现代码位置
4. THE Audit_System SHALL 为每个派系和每组基地输出独立的审计矩阵，格式为：卡牌名称 | defId | 能力标签 | 描述摘要 | 实现状态 | 偏差说明
5. THE Audit_System SHALL 在全部审计完成后输出汇总报告，包含：总卡牌数、已审计数、一致数、偏差数、缺失数

### 需求 11：持续效果与力量修正审计

**用户故事：** 作为开发者，我希望审计所有持续效果（ongoing）和力量修正（power modifier）的实现，以确保与描述一致。

#### 验收标准

1. THE Audit_System SHALL 检查 `domain/ongoingEffects.ts` 中注册的所有持续效果与对应卡牌描述是否一致
2. THE Audit_System SHALL 检查 `domain/ongoingModifiers.ts` 中注册的所有力量修正与对应卡牌描述是否一致
3. THE Audit_System SHALL 检查 `abilities/ongoing_modifiers.ts` 中注册的所有持续力量修正与对应卡牌描述是否一致
4. WHEN 持续效果具有过期条件（回合结束/基地记分）时，THE Audit_System SHALL 检查过期逻辑的实现是否正确

### 需求 12：跨派系交叉验证（同类型一致性）

**用户故事：** 作为开发者，我希望对同类型的能力效果进行跨派系交叉验证，以确保相同语义的效果在不同派系中实现方式一致。

#### 验收标准

1. THE Audit_System SHALL 识别所有"消灭随从"类能力（如忍者暗杀、外星人绑架返回手牌等），检查消灭/移除的实现路径是否一致（事件类型、目标区域、触发 onDestroy 与否）
2. THE Audit_System SHALL 识别所有"抽牌"类能力，检查抽牌实现是否统一使用相同的事件/命令路径
3. THE Audit_System SHALL 识别所有"移动随从"类能力（如海盗移动到其他基地、忍者潜行等），检查移动实现是否一致处理 ongoing 效果的保留/失效
4. THE Audit_System SHALL 识别所有"力量修正"类能力（ongoing +N/-N power），检查修正的注册方式、过期时机、叠加规则是否跨派系一致
5. THE Audit_System SHALL 识别所有"打出额外随从/行动"类能力，检查额外打出的实现是否统一（计数器递增、阶段检查、限制条件）
6. THE Audit_System SHALL 识别所有"从弃牌堆回收"类能力，检查回收目标筛选（本方/任意方、随从/行动/任意）和回收目的地（手牌/场上/牌库顶）的实现是否与描述一致
7. WHEN 发现同类型能力在不同派系中实现方式不一致时，THE Audit_System SHALL 标记为 ⚠️ 交叉不一致，记录涉及的派系、卡牌、差异点，并累积提交用户确认

### 需求 13：交互链完整性审计

**用户故事：** 作为开发者，我希望审计所有需要玩家交互的能力的交互链完整性，以确保交互流程不中断。

#### 验收标准

1. THE Audit_System SHALL 检查每个创建交互（Interaction）的能力是否在 `domain/abilityInteractionHandlers.ts` 中注册了对应的交互处理函数
2. WHEN 能力需要多步交互时，THE Audit_System SHALL 检查交互链的每一步是否都有对应的处理函数
3. IF 发现有能力创建了交互但未注册处理函数，THEN THE Audit_System SHALL 将其标记为 ❌ 交互链断裂
4. THE Audit_System SHALL 检查基地能力的交互处理函数是否在 `domain/baseAbilities.ts` 或 `domain/baseAbilities_expansion.ts` 中正确注册
