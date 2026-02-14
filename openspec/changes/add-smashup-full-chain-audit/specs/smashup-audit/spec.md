## ADDED Requirements

### Requirement: 外星人（Aliens）派系全链路审查
系统 SHALL 对外星人派系全部卡牌执行描述→实现全链路审查，并输出可追溯证据。

#### Scenario: 外星人逐张描述实现比对
- **WHEN** 审查 `alien_*` 卡牌
- **THEN** 审查者 MUST 对照 `public/locales/zh-CN/game-smashup.json` 的 `effectText/abilityText` 与 `src/games/smashup/abilities/aliens.ts` 逐张比对

#### Scenario: 外星人交互与持续效果核对
- **WHEN** 卡牌描述包含玩家选择或持续效果
- **THEN** 审查者 MUST 验证 `Interaction_Handler` 注册完整
- **AND THEN** 审查者 MUST 验证 `ongoingEffects.ts` 或 `ongoingModifiers.ts` 存在对应注册
- **AND THEN** 审查者 MUST 输出独立交互链 × 六层矩阵并记录差异与修复建议

### Requirement: 恐龙（Dinosaurs）派系全链路审查
系统 SHALL 对恐龙派系全部卡牌执行描述→实现全链路审查，并输出可追溯证据。

#### Scenario: 恐龙逐张描述实现比对
- **WHEN** 审查 `dino_*` 卡牌
- **THEN** 审查者 MUST 对照 i18n 描述与 `src/games/smashup/abilities/dinosaurs.ts` 逐张比对

#### Scenario: 恐龙持续力量修正核对
- **WHEN** 描述包含持续力量修正（如回合外 +2 力量）
- **THEN** 审查者 MUST 验证 `ongoingModifiers.ts` 已正确注册与生效
- **AND THEN** 审查者 MUST 输出独立交互链 × 六层矩阵并记录差异与修复建议

### Requirement: 幽灵（Ghosts）派系全链路审查
系统 SHALL 对幽灵派系全部卡牌执行描述→实现全链路审查，并输出可追溯证据。

#### Scenario: 幽灵逐张描述实现比对
- **WHEN** 审查 `ghost_*` 卡牌
- **THEN** 审查者 MUST 对照 i18n 描述与 `src/games/smashup/abilities/ghosts.ts` 逐张比对

#### Scenario: 幽灵条件触发与 special 核对
- **WHEN** 描述包含条件触发（如“手牌 2 张或更少”）或 special 类型能力
- **THEN** 审查者 MUST 验证条件判断与触发时机在执行层和验证层均正确实现
- **AND THEN** 审查者 MUST 输出独立交互链 × 六层矩阵并记录差异与修复建议

### Requirement: 忍者（Ninjas）派系全链路审查
系统 SHALL 对忍者派系全部卡牌执行描述→实现全链路审查，并输出可追溯证据。

#### Scenario: 忍者逐张描述实现比对
- **WHEN** 审查 `ninja_*` 卡牌
- **THEN** 审查者 MUST 对照 i18n 描述与 `src/games/smashup/abilities/ninjas.ts` 逐张比对

#### Scenario: 忍者 special 计分时机核对
- **WHEN** 描述包含“基地计分前”等 special 触发时机
- **THEN** 审查者 MUST 验证计分流程中的触发钩子调用正确
- **AND THEN** 审查者 MUST 输出独立交互链 × 六层矩阵并记录差异与修复建议

### Requirement: 海盗（Pirates）派系全链路审查
系统 SHALL 对海盗派系全部卡牌执行描述→实现全链路审查，并输出可追溯证据。

#### Scenario: 海盗逐张描述实现比对
- **WHEN** 审查 `pirate_*` 卡牌
- **THEN** 审查者 MUST 对照 i18n 描述与 `src/games/smashup/abilities/pirates.ts` 逐张比对

#### Scenario: 海盗 special 复杂时机核对
- **WHEN** 描述包含“将要被消灭时”或“基地计分前/后”触发
- **THEN** 审查者 MUST 验证对应触发钩子与执行路径正确
- **AND THEN** 审查者 MUST 输出独立交互链 × 六层矩阵并记录差异与修复建议

### Requirement: 机器人（Robots）派系全链路审查
系统 SHALL 对机器人派系全部卡牌执行描述→实现全链路审查，并输出可追溯证据。

#### Scenario: 机器人逐张描述实现比对
- **WHEN** 审查 `robot_*` 卡牌
- **THEN** 审查者 MUST 对照 i18n 描述与 `src/games/smashup/abilities/robots.ts` 逐张比对

#### Scenario: Microbot 联动逻辑核对
- **WHEN** 描述涉及“视为 Microbot”或“Microbot 数量加成”
- **THEN** 审查者 MUST 验证联动判断与加成计算路径正确
- **AND THEN** 审查者 MUST 输出独立交互链 × 六层矩阵并记录差异与修复建议

### Requirement: 捣蛋鬼（Tricksters）派系全链路审查
系统 SHALL 对捣蛋鬼派系全部卡牌执行描述→实现全链路审查，并输出可追溯证据。

#### Scenario: 捣蛋鬼逐张描述实现比对
- **WHEN** 审查 `trickster_*` 卡牌
- **THEN** 审查者 MUST 对照 i18n 描述与 `src/games/smashup/abilities/tricksters.ts` 逐张比对

#### Scenario: 捣蛋鬼持续触发核对
- **WHEN** 描述包含“当其他玩家打出随从到此基地时”等持续触发
- **THEN** 审查者 MUST 验证触发钩子与持续效果注册完整
- **AND THEN** 审查者 MUST 输出独立交互链 × 六层矩阵并记录差异与修复建议

### Requirement: 巫师（Wizards）派系全链路审查
系统 SHALL 对巫师派系全部卡牌执行描述→实现全链路审查，并输出可追溯证据。

#### Scenario: 巫师逐张描述实现比对
- **WHEN** 审查 `wizard_*` 卡牌
- **THEN** 审查者 MUST 对照 i18n 描述与 `src/games/smashup/abilities/wizards.ts` 逐张比对

#### Scenario: 巫师多步交互流程核对
- **WHEN** 描述包含“选择任意数量目标”等多步交互
- **THEN** 审查者 MUST 验证 Interaction_Handler 提供完整玩家选择流程
- **AND THEN** 审查者 MUST 输出独立交互链 × 六层矩阵并记录差异与修复建议

### Requirement: 僵尸（Zombies）派系全链路审查
系统 SHALL 对僵尸派系全部卡牌执行描述→实现全链路审查，并输出可追溯证据。

#### Scenario: 僵尸逐张描述实现比对
- **WHEN** 审查 `zombie_*` 卡牌
- **THEN** 审查者 MUST 对照 i18n 描述与 `src/games/smashup/abilities/zombies.ts` 逐张比对

#### Scenario: 弃牌堆打出与复活流程核对
- **WHEN** 描述涉及从弃牌堆打出或复活
- **THEN** 审查者 MUST 验证弃牌堆操作与额外打出流程完整
- **AND THEN** 审查者 MUST 输出独立交互链 × 六层矩阵并记录差异与修复建议

### Requirement: 克苏鲁仆从（Cthulhu）派系全链路审查
系统 SHALL 对克苏鲁仆从派系全部卡牌执行描述→实现全链路审查，并输出可追溯证据。

#### Scenario: 克苏鲁逐张描述实现比对
- **WHEN** 审查 `cthulhu_*` 卡牌
- **THEN** 审查者 MUST 对照 i18n 描述与 `src/games/smashup/abilities/cthulhu.ts` 逐张比对

#### Scenario: Madness 流程核对
- **WHEN** 描述涉及 Madness 抽取、弃置或返还
- **THEN** 审查者 MUST 验证相关流程在执行层与状态层完整可追踪
- **AND THEN** 审查者 MUST 输出独立交互链 × 六层矩阵并记录差异与修复建议

### Requirement: 熊骑兵（Bear Cavalry）派系全链路审查
系统 SHALL 对熊骑兵派系全部卡牌执行描述→实现全链路审查，并输出可追溯证据。

#### Scenario: 熊骑兵逐张描述实现比对
- **WHEN** 审查 `bear_cavalry_*` 卡牌
- **THEN** 审查者 MUST 对照 i18n 描述与 `src/games/smashup/abilities/bear_cavalry.ts` 逐张比对

#### Scenario: 强制移动逻辑核对
- **WHEN** 描述涉及强制移动对手随从
- **THEN** 审查者 MUST 验证目标选择与移动执行逻辑正确
- **AND THEN** 审查者 MUST 输出独立交互链 × 六层矩阵并记录差异与修复建议

### Requirement: 蒸汽朋克（Steampunks）派系全链路审查
系统 SHALL 对蒸汽朋克派系全部卡牌执行描述→实现全链路审查，并输出可追溯证据。

#### Scenario: 蒸汽朋克逐张描述实现比对
- **WHEN** 审查 `steampunk_*` 卡牌
- **THEN** 审查者 MUST 对照 i18n 描述与 `src/games/smashup/abilities/steampunks.ts` 逐张比对

#### Scenario: 战术回收与重打流程核对
- **WHEN** 描述涉及战术卡从弃牌堆取回并额外打出
- **THEN** 审查者 MUST 验证回收、再打出与阶段限制流程完整
- **AND THEN** 审查者 MUST 输出独立交互链 × 六层矩阵并记录差异与修复建议

### Requirement: 食人花（Killer Plants）派系全链路审查
系统 SHALL 对食人花派系全部卡牌执行描述→实现全链路审查，并输出可追溯证据。

#### Scenario: 食人花逐张描述实现比对
- **WHEN** 审查 `killer_plant_*` 卡牌
- **THEN** 审查者 MUST 对照 i18n 描述与 `src/games/smashup/abilities/killer_plants.ts` 逐张比对

#### Scenario: 牌库搜寻与重洗核对
- **WHEN** 描述涉及按条件搜寻随从
- **THEN** 审查者 MUST 验证搜寻条件判断与重洗牌库逻辑正确
- **AND THEN** 审查者 MUST 输出独立交互链 × 六层矩阵并记录差异与修复建议

### Requirement: 远古物种（Elder Things）派系全链路审查
系统 SHALL 对远古物种派系全部卡牌执行描述→实现全链路审查，并输出可追溯证据。

#### Scenario: 远古物种逐张描述实现比对
- **WHEN** 审查 `elder_thing_*` 卡牌
- **THEN** 审查者 MUST 对照 i18n 描述与 `src/games/smashup/abilities/elder_things.ts` 逐张比对

#### Scenario: 二选一分支逻辑核对
- **WHEN** 描述包含“其他玩家可抽 Madness 或承受惩罚”
- **THEN** 审查者 MUST 验证玩家选择交互与两个分支执行都正确
- **AND THEN** 审查者 MUST 输出独立交互链 × 六层矩阵并记录差异与修复建议

### Requirement: 印斯茅斯（Innsmouth）派系全链路审查
系统 SHALL 对印斯茅斯派系全部卡牌执行描述→实现全链路审查，并输出可追溯证据。

#### Scenario: 印斯茅斯逐张描述实现比对
- **WHEN** 审查 `innsmouth_*` 卡牌
- **THEN** 审查者 MUST 对照 i18n 描述与 `src/games/smashup/abilities/innsmouth.ts` 逐张比对

#### Scenario: 同名随从判定核对
- **WHEN** 描述涉及同名随从联动
- **THEN** 审查者 MUST 验证同名判断基于 `defId` 且执行一致
- **AND THEN** 审查者 MUST 输出独立交互链 × 六层矩阵并记录差异与修复建议

### Requirement: 米斯卡塔尼克（Miskatonic University）派系全链路审查
系统 SHALL 对米斯卡塔尼克派系全部卡牌执行描述→实现全链路审查，并输出可追溯证据。

#### Scenario: 米斯卡塔尼克逐张描述实现比对
- **WHEN** 审查 `miskatonic_*` 卡牌
- **THEN** 审查者 MUST 对照 i18n 描述与 `src/games/smashup/abilities/miskatonic.ts` 逐张比对

#### Scenario: Madness 弃置换收益流程核对
- **WHEN** 描述涉及 Madness 检测、弃置与收益触发
- **THEN** 审查者 MUST 验证完整流程与边界条件
- **AND THEN** 审查者 MUST 输出独立交互链 × 六层矩阵并记录差异与修复建议

### Requirement: 基地卡全链路审查
系统 SHALL 对全部基地卡能力执行描述→实现全链路审查，并输出可追溯证据。

#### Scenario: 基地能力逐张描述实现比对
- **WHEN** 审查 `base_*` 能力文本
- **THEN** 审查者 MUST 对照 i18n `abilityText` 与 `src/games/smashup/domain/baseAbilities.ts`、`src/games/smashup/domain/baseAbilities_expansion.ts` 逐张比对

#### Scenario: 基地触发与限制机制核对
- **WHEN** 基地能力包含计分触发、持续触发或限制效果
- **THEN** 审查者 MUST 验证计分钩子、事件监听与 validate 拦截实现正确
- **AND THEN** 审查者 MUST 输出独立交互链 × 六层矩阵并记录差异与修复建议
