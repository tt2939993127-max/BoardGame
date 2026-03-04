# 需求文档：DiceThrone 全链路审查

## 简介

对 DiceThrone 游戏的全部 6 个英雄（僧侣、狂战士、圣骑士、火法师、月精灵、暗影盗贼）进行"描述→实现全链路审查"。审查范围覆盖技能定义、Token 定义、卡牌定义、i18n 文案、执行逻辑、UI 交互链的一致性与完整性。

## 术语表

- **AbilityDef**: 技能定义对象，包含 id、name、type、effects 等字段
- **TokenDef**: Token/状态效果定义对象，包含 id、category、activeUse/passiveTrigger 等字段
- **CustomAction**: 自定义动作处理器，处理复杂的技能效果逻辑
- **i18n**: 国际化文案，存储在 `public/locales/{lang}/game-dicethrone.json`
- **全链路**: 定义层→执行层→状态层→验证层→UI 层→测试层的完整实现路径
- **EARS**: Easy Approach to Requirements Syntax，需求书写模式

## 需求

### 需求 1：技能定义与 i18n 文案一致性

**用户故事：** 作为开发者，我希望每个英雄的技能定义（AbilityDef）与 i18n 文案完全一致，以确保玩家看到的描述与实际效果匹配。

#### 验收标准

1. WHEN 审查任意英雄的 AbilityDef 中的 effects 列表 THEN THE 审查系统 SHALL 验证每个 effect 的 damage/heal/grantToken/grantStatus 数值与对应 i18n 描述文本中的数值一致
2. WHEN 审查任意英雄的 AbilityDef 中的 trigger 条件 THEN THE 审查系统 SHALL 验证触发条件（骰面组合、小顺、大顺等）与 i18n 描述中的触发条件一致
3. WHEN 审查任意英雄的升级技能（Level 2/3）THEN THE 审查系统 SHALL 验证升级后的数值变化与 i18n 升级描述一致
4. IF 发现 AbilityDef 中的效果与 i18n 描述不一致 THEN THE 审查系统 SHALL 记录差异并标注需要修复的具体字段和文件

### 需求 2：Token 定义与 i18n 文案一致性

**用户故事：** 作为开发者，我希望每个英雄的 Token 定义（TokenDef）与 i18n 文案完全一致，以确保状态效果的描述准确。

#### 验收标准

1. WHEN 审查任意英雄的 TokenDef 中的 stackLimit THEN THE 审查系统 SHALL 验证叠加上限与 i18n 描述一致
2. WHEN 审查任意英雄的 TokenDef 中的 activeUse 配置 THEN THE 审查系统 SHALL 验证消耗效果（modifyDamageReceived/modifyDamageDealt/rollToNegate 等）与 i18n 描述一致
3. WHEN 审查任意英雄的 TokenDef 中的 passiveTrigger 配置 THEN THE 审查系统 SHALL 验证被动触发时机和效果与 i18n 描述一致
4. IF 发现 TokenDef 与 i18n 描述不一致 THEN THE 审查系统 SHALL 记录差异并标注需要修复的具体字段

### 需求 3：技能执行逻辑与定义一致性

**用户故事：** 作为开发者，我希望技能的实际执行逻辑（effects.ts + customActions）与 AbilityDef 定义完全一致，以确保游戏行为正确。

#### 验收标准

1. WHEN 审查任意 customAction 处理器 THEN THE 审查系统 SHALL 验证处理器产生的事件（damage/heal/grantToken/grantStatus）与对应 AbilityDef 中声明的效果一致
2. WHEN 审查 resolveEffectAction 函数 THEN THE 审查系统 SHALL 验证每种 action type（damage/heal/grantToken/grantStatus/choice/rollDie/drawCard）的处理逻辑与规则文档一致
3. WHEN 审查 isDefendableAttack 函数 THEN THE 审查系统 SHALL 验证 unblockable 标签和 ultimate 标签的处理逻辑与规则文档 §4.3/§4.4 一致
4. IF 发现执行逻辑与定义不一致 THEN THE 审查系统 SHALL 记录差异并标注需要修复的具体函数和文件

### 需求 4：Token 执行逻辑与定义一致性

**用户故事：** 作为开发者，我希望 Token 的实际执行逻辑（executeTokens.ts + tokenResponse.ts）与 TokenDef 定义完全一致。

#### 验收标准

1. WHEN 审查 consumable 类型 Token 的使用流程 THEN THE 审查系统 SHALL 验证 activeUse.timing 配置与 tokenResponse.ts 中的时机检查一致
2. WHEN 审查 debuff 类型 Token 的被动触发流程 THEN THE 审查系统 SHALL 验证 passiveTrigger.timing 配置与 flowHooks.ts 中的触发逻辑一致
3. WHEN 审查 Token 消耗逻辑 THEN THE 审查系统 SHALL 验证 consumeAmount 和效果值与 TokenDef 中的配置一致
4. IF 发现 Token 执行逻辑与定义不一致 THEN THE 审查系统 SHALL 记录差异并标注需要修复的具体函数

### 需求 5：卡牌定义与执行一致性

**用户故事：** 作为开发者，我希望卡牌定义与 executeCards.ts 中的执行逻辑一致，以确保卡牌效果正确。

#### 验收标准

1. WHEN 审查任意英雄的卡牌定义（cards.ts）THEN THE 审查系统 SHALL 验证每张卡牌的 effects 与 i18n 描述一致
2. WHEN 审查卡牌的 cpCost THEN THE 审查系统 SHALL 验证 CP 消耗与 i18n 描述一致
3. WHEN 审查卡牌的 playTiming THEN THE 审查系统 SHALL 验证出牌时机（mainPhase/rollPhase/instant）与 i18n 描述和规则文档 §5 一致
4. IF 发现卡牌定义与执行逻辑不一致 THEN THE 审查系统 SHALL 记录差异

### 需求 6：UI 交互链完整性

**用户故事：** 作为开发者，我希望所有 UI 交互链（Token 响应弹窗、Choice 弹窗、Bonus Dice 弹窗等）正确触发和关闭。

#### 验收标准

1. WHEN 玩家受到可防御攻击伤害且拥有防御性 Token（太极/闪避/守护/神罚/潜行）THEN THE TokenResponseModal SHALL 正确弹出并显示可用 Token 列表
2. WHEN 玩家发动攻击且拥有进攻性 Token（太极/暴击/伏击）THEN THE TokenResponseModal SHALL 在伤害结算前正确弹出
3. WHEN 技能效果包含 choice 类型动作 THEN THE ChoiceModal SHALL 正确弹出并显示选项
4. WHEN 技能效果包含 rollDie 类型动作且结果需要 bonus dice 重掷 THEN THE BonusDieOverlay SHALL 正确弹出
5. WHEN 玩家拥有击倒状态且进入进攻掷骰阶段 THEN THE ConfirmRemoveKnockdownModal SHALL 正确弹出并提供花费 2CP 移除的选项
6. WHEN 玩家拥有净化 Token 且拥有 debuff 状态 THEN THE PurifyModal SHALL 在适当时机弹出
7. IF 任何弹窗未正确触发或关闭 THEN THE 审查系统 SHALL 记录缺失的交互链路

### 需求 7：规则文档与代码实现一致性

**用户故事：** 作为开发者，我希望规则文档（王权骰铸规则.md）中描述的机制与代码实现完全一致。

#### 验收标准

1. WHEN 审查回合阶段流转（§3）THEN THE 审查系统 SHALL 验证 flowHooks.ts 中的阶段顺序和逻辑与规则一致
2. WHEN 审查伤害类型处理（§7）THEN THE 审查系统 SHALL 验证 effects.ts 中的伤害计算逻辑（一般/不可防御/纯粹/附属/终极）与规则一致
3. WHEN 审查终极技能机制（§4.4）THEN THE 审查系统 SHALL 验证终极技能的不可阻挡特性在 execute.ts 和 effects.ts 中正确实现
4. WHEN 审查状态效果机制（§6）THEN THE 审查系统 SHALL 验证状态效果的叠加限制、消耗性、永久性等特性与规则一致
5. WHEN 审查攻击修正机制（§7.2）THEN THE 审查系统 SHALL 验证攻击修正的打出时机和伤害继承逻辑与规则一致

### 需求 8：跨英雄状态效果共享一致性

**用户故事：** 作为开发者，我希望多个英雄共享的状态效果（如击倒、闪避）在不同英雄的定义中保持一致。

#### 验收标准

1. WHEN 审查击倒（knockdown）状态 THEN THE 审查系统 SHALL 验证僧侣和火法师的击倒定义（stackLimit、removalCost、passiveTrigger）完全一致
2. WHEN 审查闪避（evasive）Token THEN THE 审查系统 SHALL 验证僧侣和月精灵的闪避定义（stackLimit、activeUse、rollSuccess range）完全一致
3. WHEN 审查燃烧（burn）和中毒（poison）状态 THEN THE 审查系统 SHALL 验证两者的 passiveTrigger 逻辑（回合开始受伤、按层数计算）在 flowHooks.ts 中正确实现
4. IF 发现共享状态效果在不同英雄间定义不一致 THEN THE 审查系统 SHALL 记录差异

### 需求 9：测试覆盖完整性

**用户故事：** 作为开发者，我希望每个英雄的核心技能和 Token 都有对应的测试覆盖。

#### 验收标准

1. WHEN 审查测试文件 THEN THE 审查系统 SHALL 验证每个英雄至少有技能测试和 Token 测试
2. WHEN 审查测试覆盖 THEN THE 审查系统 SHALL 验证每个 customAction 处理器至少有一个测试用例
3. IF 发现缺失测试覆盖 THEN THE 审查系统 SHALL 记录需要补充测试的具体功能点
