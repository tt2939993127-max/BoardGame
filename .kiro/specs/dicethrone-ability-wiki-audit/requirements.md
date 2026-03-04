# 需求文档：王权骰铸能力与卡牌 Wiki 审计

## 简介

对王权骰铸（Dice Throne, gameId: dicethrone）全部 6 个角色的**全等级能力（Level 1/2/3）**、**Token 能力**和**卡牌定义**进行系统化审计。审计方式为对照官方 Wiki 描述，逐一比对代码中的能力定义（`abilities.ts`）、Token 定义（`tokens.ts`）、卡牌定义（`cards.ts`）和 i18n 描述文本（`game-dicethrone.json`），统计所有与 Wiki 不符的差异项。

## 术语表

- **审计系统（Audit_System）**：执行本次审计任务的流程与工具集合
- **能力定义（Ability_Definition）**：`src/games/dicethrone/heroes/<heroId>/abilities.ts` 中的 `AbilityDef` 对象，包含 Level 1 基础能力和 Level 2/3 升级变体
- **卡牌定义（Card_Definition）**：`src/games/dicethrone/heroes/<heroId>/cards.ts` 中的 `AbilityCard` 对象，包含专属卡和通用卡，含 cpCost、timing、effects、description 等字段
- **专属卡（Hero_Specific_Card）**：定义在各角色 `heroes/<heroId>/cards.ts` 中的角色独有卡牌（如 barbarian 的 card-energetic、card-dizzy 等），每个角色拥有不同的专属行动卡，通常占图集 index 0-14
- **通用卡（Common_Card）**：定义在 `src/games/dicethrone/domain/commonCards.ts` 的 `COMMON_CARDS` 数组中的所有角色共享卡牌（共 18 张，如 card-play-six、card-just-this 等），各角色通过 `injectCommonCardPreviewRefs` 引入
- **Token 定义（Token_Definition）**：`src/games/dicethrone/heroes/<heroId>/tokens.ts` 中的 `TokenDef` 对象
- **i18n 描述（I18n_Description）**：`public/locales/zh-CN/game-dicethrone.json` 和 `public/locales/en/game-dicethrone.json` 中的能力/Token/卡牌文案
- **Wiki 描述（Wiki_Description）**：Dice Throne 官方 Wiki 上的权威能力描述文本
- **差异项（Discrepancy）**：代码实现与 Wiki 描述之间的任何不一致，包括数值、效果、触发条件、描述文案等
- **角色（Hero）**：游戏中的可选英雄，当前共 6 个：barbarian（狂战士）、monk（僧侣）、pyromancer（火法师）、moon_elf（月精灵）、shadow_thief（暗影刺客）、paladin（圣骑士）

## 需求

### 需求 1：审计范围定义

**用户故事：** 作为开发者，我想明确审计的范围和对象，以便系统化地完成所有角色的能力、Token 和卡牌描述审计。

#### 验收标准

1. THE Audit_System SHALL 覆盖全部 6 个角色：barbarian、monk、pyromancer、moon_elf、shadow_thief、paladin
2. THE Audit_System SHALL 对每个角色审计以下四类内容：全等级能力（Level 1 基础能力和 Level 2/3 升级能力的 AbilityDef）、Token 能力（TokenDef）、专属卡（Hero_Specific_Card，各角色 cards.ts 中的角色独有卡牌）、通用卡（Common_Card，commonCards.ts 中的 18 张共享卡牌，仅需审计一次）
3. THE Audit_System SHALL 以官方 Wiki 描述作为权威参考来源
4. THE Audit_System SHALL 将代码中的能力定义（abilities.ts）、Token 定义（tokens.ts）、专属卡定义（各角色 cards.ts）、通用卡定义（domain/commonCards.ts）和 i18n 描述文本（game-dicethrone.json）作为审计对象

### 需求 2：能力审计

**用户故事：** 作为开发者，我想对照 Wiki 检查每个角色所有等级能力的描述准确性，以便发现并修正与 Wiki 不符的实现。

#### 验收标准

1. WHEN 审计一个角色的能力时，THE Audit_System SHALL 逐一比对该角色每个 Level 1、Level 2 和 Level 3 能力的以下维度：伤害数值、治疗数值、状态效果类型与数值、触发条件（骰子组合）、特殊标签（unblockable 等）、效果描述文案
2. WHEN 发现代码中的能力数值与 Wiki 描述不一致时，THE Audit_System SHALL 记录差异项，包含：角色名、能力名、能力等级、差异维度、Wiki 值、代码值
3. WHEN 发现代码中的效果描述文案与 Wiki 描述不一致时，THE Audit_System SHALL 记录差异项，包含：角色名、能力名、能力等级、Wiki 描述、代码描述
4. WHEN 发现代码中缺少 Wiki 上存在的能力时，THE Audit_System SHALL 记录为缺失项
5. WHEN 发现代码中存在 Wiki 上不存在的能力时，THE Audit_System SHALL 记录为多余项
6. THE Audit_System SHALL 对 Level 1 基础能力额外比对以下维度：基础触发条件（trigger/variants）、基础效果（effects）、被动标签（tags）

### 需求 3：Token 能力审计

**用户故事：** 作为开发者，我想对照 Wiki 检查每个角色所有 Token 的描述准确性，以便发现并修正与 Wiki 不符的实现。

#### 验收标准

1. WHEN 审计一个角色的 Token 时，THE Audit_System SHALL 逐一比对该角色每个 TokenDef 的以下维度：Token 名称、效果描述、触发时机（passiveTrigger.timing）、效果动作（passiveTrigger.actions / activeUse）、叠加上限（stackLimit）、类别（category: buff/debuff/consumable）
2. WHEN 发现代码中的 Token 效果与 Wiki 描述不一致时，THE Audit_System SHALL 记录差异项，包含：角色名、Token 名、差异维度、Wiki 值、代码值
3. WHEN 发现代码中的 Token 描述文案与 Wiki 描述不一致时，THE Audit_System SHALL 记录差异项，包含：角色名、Token 名、Wiki 描述、代码描述
4. WHEN 发现代码中缺少 Wiki 上存在的 Token 时，THE Audit_System SHALL 记录为缺失项
5. WHEN 发现代码中存在 Wiki 上不存在的 Token 时，THE Audit_System SHALL 记录为多余项

### 需求 4：审计报告输出

**用户故事：** 作为开发者，我想获得结构化的审计报告，以便快速定位和修复所有差异项。

#### 验收标准

1. THE Audit_System SHALL 按角色分组输出审计结果
2. THE Audit_System SHALL 对每个角色分别列出能力差异（含 Level 1/2/3）、Token 差异和专属卡差异，并单独列出通用卡差异（仅一份，不按角色重复）
3. THE Audit_System SHALL 在报告中为每个差异项标注严重程度：数值错误（高）、效果缺失/多余（高）、描述文案不一致（中）、触发条件不一致（高）
4. THE Audit_System SHALL 在报告末尾输出汇总统计：每个角色的差异项数量、按严重程度分类的差异项总数
5. THE Audit_System SHALL 将审计报告保存为 Markdown 文件，存放在 `.tmp/` 目录下

### 需求 5：i18n 描述一致性

**用户故事：** 作为开发者，我想确保 i18n 文件中的能力、Token 和卡牌描述与 Wiki 一致，以便玩家在游戏中看到准确的说明。

#### 验收标准

1. WHEN 审计 i18n 描述时，THE Audit_System SHALL 同时检查中文（zh-CN）和英文（en）两个 locale 的描述文本
2. WHEN 英文 i18n 描述与 Wiki 英文描述不一致时，THE Audit_System SHALL 记录为 i18n 差异项
3. WHEN 中文 i18n 描述与 Wiki 描述的语义不一致时，THE Audit_System SHALL 记录为 i18n 差异项
4. IF i18n 文件中缺少某个能力（含 Level 1）、Token 或卡牌的描述 key，THEN THE Audit_System SHALL 记录为 i18n 缺失项

### 需求 6：卡牌审计

**用户故事：** 作为开发者，我想对照 Wiki 检查每个角色的专属卡和所有角色共享的通用卡的定义准确性，以便发现并修正与 Wiki 不符的实现。

#### 验收标准

##### 6A：专属卡审计

1. WHEN 审计一个角色的专属卡时，THE Audit_System SHALL 逐一比对该角色 `heroes/<heroId>/cards.ts` 中每个 Hero_Specific_Card 的以下维度：卡牌名称（name）、CP 费用（cpCost）、使用时机（timing）、效果描述（description）、效果定义（effects）、卡牌类型（type）
2. WHEN 发现代码中的专属卡费用或效果数值与 Wiki 描述不一致时，THE Audit_System SHALL 记录差异项，包含：角色名、卡牌名、差异维度、Wiki 值、代码值
3. WHEN 发现代码中的专属卡效果描述与 Wiki 描述不一致时，THE Audit_System SHALL 记录差异项，包含：角色名、卡牌名、Wiki 描述、代码描述
4. WHEN 发现代码中缺少 Wiki 上该角色存在的专属卡时，THE Audit_System SHALL 记录为缺失项
5. WHEN 发现代码中存在 Wiki 上该角色不存在的专属卡时，THE Audit_System SHALL 记录为多余项
6. WHEN 发现专属卡的 timing 字段（使用时机：如 main_phase、defensive_roll 等）与 Wiki 描述的使用时机不一致时，THE Audit_System SHALL 记录为高严重程度差异项
7. THE Audit_System SHALL 对每个角色的专属卡列表与 Wiki 中该角色的卡牌列表进行完整性比对，确保无遗漏

##### 6B：通用卡审计

1. THE Audit_System SHALL 对 `src/games/dicethrone/domain/commonCards.ts` 中的 18 张 Common_Card 仅执行一次审计（通用卡所有角色共享，无需按角色重复审计）
2. WHEN 审计通用卡时，THE Audit_System SHALL 逐一比对每张 Common_Card 的以下维度：卡牌名称（name）、CP 费用（cpCost）、使用时机（timing）、效果描述（description）、效果定义（effects）
3. WHEN 发现通用卡的费用或效果数值与 Wiki 描述不一致时，THE Audit_System SHALL 记录差异项，包含：卡牌名、差异维度、Wiki 值、代码值
4. WHEN 发现通用卡的效果描述与 Wiki 描述不一致时，THE Audit_System SHALL 记录差异项，包含：卡牌名、Wiki 描述、代码描述
5. WHEN 发现 commonCards.ts 中缺少 Wiki 上存在的通用卡时，THE Audit_System SHALL 记录为缺失项
6. WHEN 发现 commonCards.ts 中存在 Wiki 上不存在的通用卡时，THE Audit_System SHALL 记录为多余项
