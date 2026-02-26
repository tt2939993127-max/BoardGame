# 实施计划：大杀四方（SmashUp）全派系全基地审计

## 概述

基于已有审计测试框架（`abilityBehaviorAudit.test.ts`、`interactionCompletenessAudit.test.ts` 等），逐步扩展为覆盖全部 21 个派系（含疯狂牌库）和 40+ 张基地卡的系统性"描述→实现"一致性审计。审计以自动化属性测试为主、人工审查为辅，差异累积后批量提交用户确认。

## Tasks

- [x] 1. 审计基础设施搭建
  - [x] 1.1 创建 Wiki 描述快照数据文件
    - 在 `src/games/smashup/__tests__/fixtures/` 下创建 `wikiSnapshots.ts`
    - 定义 `WikiCardSnapshot` 和 `WikiBaseSnapshot` 接口
    - 为基础版 8 派系的所有卡牌填充 Wiki 描述快照数据（英文原文）
    - 为所有基地卡填充 Wiki 数值快照（breakpoint、vpAwards）
    - _Requirements: 10.1_

  - [x] 1.2 创建审计工具函数模块
    - 在 `src/games/smashup/__tests__/helpers/` 下创建 `auditUtils.ts`
    - 实现 `getAllCardDefs(factionId)` 获取指定派系所有卡牌定义
    - 实现 `getAllBaseDefs()` 获取所有基地定义
    - 实现 `getCardI18nDescription(defId)` 读取 i18n 描述文本
    - 实现 `checkAbilityRegistration(defId, tag)` 检查能力注册表覆盖
    - 实现 `checkOngoingRegistration(defId)` 检查持续效果注册覆盖
    - 实现 `checkBaseAbilityRegistration(baseDefId)` 检查基地能力注册
    - 实现 `checkInteractionHandler(sourceId)` 检查交互处理函数注册
    - 实现关键词→行为映射表 `KEYWORD_BEHAVIOR_MAP`（参考设计文档）
    - _Requirements: 10.1, 10.2, 10.3_

  - [x] 1.3 创建审计结果输出格式化工具
    - 实现 `formatFactionAuditMatrix(results: CardAuditResult[])` 输出派系审计矩阵
    - 实现 `formatBaseAuditMatrix(results: BaseAuditResult[])` 输出基地审计矩阵
    - 实现 `formatGlobalSummary(summary: GlobalAuditSummary)` 输出汇总报告
    - 审计结果分三类：✅ 一致、⚠️ 偏差、❌ 缺失
    - _Requirements: 10.2, 10.4, 10.5_

- [x] 2. 核心属性测试
  - [x] 2.1 编写 Property 1: 能力标签执行器全覆盖属性测试
    - **Property 1: 能力标签执行器全覆盖**
    - 创建 `src/games/smashup/__tests__/audit-ability-coverage.property.test.ts`
    - 使用 fast-check 从 `getAllCardDefs()` 随机选取卡牌，验证声明了 abilityTags 的卡牌在 abilityRegistry 中有对应 `defId::tag` 执行器
    - 最少 100 次迭代
    - **Validates: Requirements 1.1-1.8, 2.1-2.4, 3.1-3.4, 4.1-4.4**

  - [x] 2.2 编写 Property 2: 持续效果注册覆盖属性测试
    - **Property 2: 持续效果注册覆盖**
    - 创建 `src/games/smashup/__tests__/audit-ongoing-coverage.property.test.ts`
    - 从 ongoing 类型行动卡中随机选取，验证在 ongoingEffects 或 ongoingModifiers 注册表中有对应条目
    - 最少 100 次迭代
    - **Validates: Requirements 11.1, 11.2, 11.3**

  - [x] 2.3 编写 Property 3: 描述关键词→注册表行为一致性属性测试
    - **Property 3: 描述关键词→注册表行为一致性**
    - 创建 `src/games/smashup/__tests__/audit-keyword-behavior.property.test.ts`
    - 从所有卡牌中随机选取，解析 i18n 描述中的关键词，验证对应注册表条目存在
    - 使用设计文档中的 `KEYWORD_BEHAVIOR_MAP` 映射表
    - 最少 100 次迭代
    - **Validates: Requirements 1.1-1.8, 2.1-2.4, 3.1-3.4, 4.1-4.4, 11.1-11.3**

  - [x] 2.4 编写 Property 6: 交互链完整性属性测试
    - **Property 6: 交互链完整性**
    - 创建 `src/games/smashup/__tests__/audit-interaction-chain.property.test.ts`
    - 扫描所有能力执行器中 `createSimpleChoice`/`queueInteraction` 的 sourceId，验证 interactionHandlers 注册表中有对应 handler
    - 复用/扩展已有 `interactionCompletenessAudit.test.ts` 的逻辑
    - 最少 100 次迭代
    - **Validates: Requirements 13.1, 13.2, 13.3, 13.4**

  - [x] 2.5 编写 Property 9: 疯狂牌终局惩罚正确性属性测试
    - **Property 9: 疯狂牌终局惩罚正确性**
    - 创建 `src/games/smashup/__tests__/audit-madness-penalty.property.test.ts`
    - 使用 `fc.nat({ max: 30 })` 生成疯狂卡数量 N，验证 VP 扣除值 === `Math.floor(N / 2)`
    - 最少 100 次迭代
    - **Validates: Requirements 3.5**

- [x] 3. Checkpoint - 确保基础设施和核心属性测试通过
  - 确保所有测试通过，ask the user if questions arise.

- [ ] 4. 基础版 8 派系逐卡审计
  - [x] 4.1 审计外星人（Aliens）派系
    - 逐张检查 `data/factions/aliens.ts` 中所有卡牌的 abilityTags
    - 对照 `abilities/aliens.ts` 中的能力执行器实现
    - 对照 i18n 描述文本和 Wiki 快照
    - 输出审计矩阵，累积差异记录
    - _Requirements: 1.1_

  - [x] 4.2 审计恐龙（Dinosaurs）派系
    - 逐张检查 `data/factions/dinosaurs.ts` 中所有卡牌
    - 对照 `abilities/dinosaurs.ts` 中的能力执行器实现
    - 对照 i18n 描述文本和 Wiki 快照
    - 输出审计矩阵，累积差异记录
    - _Requirements: 1.2_

  - [x] 4.3 审计忍者（Ninjas）派系
    - 逐张检查 `data/factions/ninjas.ts` 中所有卡牌
    - 对照 `abilities/ninjas.ts` 中的能力执行器实现
    - 对照 i18n 描述文本和 Wiki 快照
    - 输出审计矩阵，累积差异记录
    - _Requirements: 1.3_

  - [x] 4.4 审计海盗（Pirates）派系
    - 逐张检查 `data/factions/pirates.ts` 中所有卡牌
    - 对照 `abilities/pirates.ts` 中的能力执行器实现
    - 对照 i18n 描述文本和 Wiki 快照
    - 输出审计矩阵，累积差异记录
    - _Requirements: 1.4_

  - [x] 4.5 审计机器人（Robots）派系
    - 逐张检查 `data/factions/robots.ts` 中所有卡牌
    - 对照 `abilities/robots.ts` 中的能力执行器实现
    - 对照 i18n 描述文本和 Wiki 快照
    - 输出审计矩阵，累积差异记录
    - _Requirements: 1.5_

  - [x] 4.6 审计巫师（Wizards）派系
    - 逐张检查 `data/factions/wizards.ts` 中所有卡牌
    - 对照 `abilities/wizards.ts` 中的能力执行器实现
    - 对照 i18n 描述文本和 Wiki 快照
    - 输出审计矩阵，累积差异记录
    - _Requirements: 1.6_

  - [-] 4.7 审计丧尸（Zombies）派系
    - 逐张检查 `data/factions/zombies.ts` 中所有卡牌
    - 对照 `abilities/zombies.ts` 中的能力执行器实现
    - 对照 i18n 描述文本和 Wiki 快照
    - 输出审计矩阵，累积差异记录
    - _Requirements: 1.7_

  - [~] 4.8 审计捣蛋鬼（Tricksters）派系
    - 逐张检查 `data/factions/tricksters.ts` 中所有卡牌
    - 对照 `abilities/tricksters.ts` 中的能力执行器实现
    - 对照 i18n 描述文本和 Wiki 快照
    - 输出审计矩阵，累积差异记录
    - _Requirements: 1.8_

  - [~] 4.9 提交基础版 8 派系差异汇总给用户确认
    - 汇总 4.1-4.8 发现的所有差异
    - 按差异类型分类（缺失实现/错误实现/多余实现/描述不一致）
    - 提交用户确认处理方式（以 Wiki 为准/以代码为准/保持现状）
    - _Requirements: 10.3, 10.4_

- [~] 5. Checkpoint - 基础版派系审计完成
  - 确保所有测试通过，ask the user if questions arise.

- [ ] 6. Awesome Level 9000 扩展 4 派系审计
  - [~] 6.1 补充 AL9000 扩展 Wiki 快照数据
    - 在 `wikiSnapshots.ts` 中补充幽灵、熊骑兵、蒸汽朋克、食人花 4 个派系的 Wiki 描述快照
    - _Requirements: 2.1-2.4_

  - [~] 6.2 审计幽灵（Ghosts）派系
    - 逐张检查 `data/factions/ghosts.ts` 中所有卡牌
    - 对照 `abilities/ghosts.ts` 中的能力执行器实现
    - 对照 i18n 描述文本和 Wiki 快照
    - 输出审计矩阵，累积差异记录
    - _Requirements: 2.1_

  - [~] 6.3 审计熊骑兵（Bear Cavalry）派系
    - 逐张检查 `data/factions/bear_cavalry.ts` 中所有卡牌
    - 对照 `abilities/bear_cavalry.ts` 中的能力执行器实现
    - 对照 i18n 描述文本和 Wiki 快照
    - 输出审计矩阵，累积差异记录
    - _Requirements: 2.2_

  - [~] 6.4 审计蒸汽朋克（Steampunks）派系
    - 逐张检查 `data/factions/steampunks.ts` 中所有卡牌
    - 对照 `abilities/steampunks.ts` 中的能力执行器实现
    - 对照 i18n 描述文本和 Wiki 快照
    - 输出审计矩阵，累积差异记录
    - _Requirements: 2.3_

  - [~] 6.5 审计食人花（Killer Plants）派系
    - 逐张检查 `data/factions/killer_plants.ts` 中所有卡牌
    - 对照 `abilities/killer_plants.ts` 中的能力执行器实现
    - 对照 i18n 描述文本和 Wiki 快照
    - 输出审计矩阵，累积差异记录
    - _Requirements: 2.4_

  - [~] 6.6 提交 AL9000 扩展差异汇总给用户确认
    - 汇总 6.2-6.5 发现的所有差异，提交用户确认
    - _Requirements: 10.3, 10.4_

- [ ] 7. 克苏鲁扩展 4 派系 + 疯狂牌库审计
  - [~] 7.1 补充克苏鲁扩展 Wiki 快照数据
    - 在 `wikiSnapshots.ts` 中补充克苏鲁仆从、远古物种、印斯茅斯、米斯卡塔尼克 4 个派系及疯狂牌库的 Wiki 描述快照
    - _Requirements: 3.1-3.5_

  - [~] 7.2 审计克苏鲁仆从（Minions of Cthulhu）派系
    - 逐张检查 `data/factions/cthulhu.ts` 中所有卡牌
    - 对照 `abilities/cthulhu.ts` 中的能力执行器实现
    - 对照 i18n 描述文本和 Wiki 快照
    - 输出审计矩阵，累积差异记录
    - _Requirements: 3.1_

  - [~] 7.3 审计远古物种（Elder Things）派系
    - 逐张检查 `data/factions/elder_things.ts` 中所有卡牌
    - 对照 `abilities/elder_things.ts` 中的能力执行器实现
    - 对照 i18n 描述文本和 Wiki 快照
    - 输出审计矩阵，累积差异记录
    - _Requirements: 3.2_

  - [~] 7.4 审计印斯茅斯（Innsmouth）派系
    - 逐张检查 `data/factions/innsmouth.ts` 中所有卡牌
    - 对照 `abilities/innsmouth.ts` 中的能力执行器实现
    - 对照 i18n 描述文本和 Wiki 快照
    - 输出审计矩阵，累积差异记录
    - _Requirements: 3.3_

  - [~] 7.5 审计米斯卡塔尼克（Miskatonic University）派系
    - 逐张检查 `data/factions/miskatonic.ts` 中所有卡牌
    - 对照 `abilities/miskatonic.ts` 中的能力执行器实现
    - 对照 i18n 描述文本和 Wiki 快照
    - 输出审计矩阵，累积差异记录
    - _Requirements: 3.4_

  - [~] 7.6 审计疯狂（Madness）牌库
    - 检查 `data/factions/madness.ts` 中所有疯狂牌
    - 对照疯狂牌能力实现（包括终局惩罚机制：每 2 张疯狂牌扣 1 VP）
    - 对照 i18n 描述文本和 Wiki 快照
    - 输出审计矩阵，累积差异记录
    - _Requirements: 3.5_

  - [~] 7.7 提交克苏鲁扩展差异汇总给用户确认
    - 汇总 7.2-7.6 发现的所有差异，提交用户确认
    - _Requirements: 10.3, 10.4_

- [ ] 8. Monster Smash 扩展 4 派系审计
  - [~] 8.1 补充 Monster Smash 扩展 Wiki 快照数据
    - 在 `wikiSnapshots.ts` 中补充科学怪人、狼人、吸血鬼、巨蚁 4 个派系的 Wiki 描述快照
    - _Requirements: 4.1-4.4_

  - [~] 8.2 审计科学怪人（Frankenstein）派系
    - 逐张检查 `data/factions/frankenstein.ts` 中所有卡牌
    - 对照 `abilities/frankenstein.ts` 中的能力执行器实现
    - 对照 i18n 描述文本和 Wiki 快照
    - 输出审计矩阵，累积差异记录
    - _Requirements: 4.1_

  - [~] 8.3 审计狼人（Werewolves）派系
    - 逐张检查 `data/factions/werewolves.ts` 中所有卡牌
    - 对照 `abilities/werewolves.ts` 中的能力执行器实现
    - 对照 i18n 描述文本和 Wiki 快照
    - 输出审计矩阵，累积差异记录
    - _Requirements: 4.2_

  - [~] 8.4 审计吸血鬼（Vampires）派系
    - 逐张检查 `data/factions/vampires.ts` 中所有卡牌
    - 对照 `abilities/vampires.ts` 中的能力执行器实现
    - 对照 i18n 描述文本和 Wiki 快照
    - 输出审计矩阵，累积差异记录
    - _Requirements: 4.3_

  - [~] 8.5 审计巨蚁（Giant Ants）派系
    - 逐张检查 `data/factions/giant-ants.ts` 中所有卡牌
    - 对照 `abilities/giant_ants.ts` 中的能力执行器实现
    - 对照 i18n 描述文本和 Wiki 快照
    - 输出审计矩阵，累积差异记录
    - _Requirements: 4.4_

  - [~] 8.6 提交 Monster Smash 扩展差异汇总给用户确认
    - 汇总 8.2-8.5 发现的所有差异，提交用户确认
    - _Requirements: 10.3, 10.4_

- [~] 9. Checkpoint - 全部 21 派系审计完成
  - 确保所有测试通过，ask the user if questions arise.

- [ ] 10. 基地卡审计 - 基础版
  - [~] 10.1 审计基础版 16 张基地卡数值
    - 逐张检查 `data/cards.ts` 中基础版基地的 breakpoint、vpAwards、minionPowerBonus 数值
    - 对照 Wiki 快照数值
    - 覆盖：家园、母舰（外星人）；中央大脑、436-1337工厂（机器人）；绿洲丛林、焦油坑（恐龙）；刚柔流寺庙、忍者道场（忍者）；闪光洞穴、蘑菇王国（捣蛋鬼）；伊万斯堡城镇公墓、罗德百货商场（丧尸）；灰色猫眼石/海盗湾、托尔图加（海盗）；大图书馆、巫师学院（巫师）
    - _Requirements: 5.1, 5.2, 5.5, 5.6_

  - [~] 10.2 审计基础版基地卡特殊能力和限制条件
    - 检查有特殊能力的基地在 `domain/baseAbilities.ts` 中的注册
    - 检查有限制条件的基地的 restrictions 实现
    - 对照 i18n 描述文本和 Wiki 快照
    - 输出基地审计矩阵
    - _Requirements: 5.3, 5.4_

  - [~] 10.3 编写 Property 4: 基地数值一致性属性测试
    - **Property 4: 基地数值一致性**
    - 创建 `src/games/smashup/__tests__/audit-base-values.property.test.ts`
    - 从 `getAllBaseDefs()` 随机选取基地，验证 breakpoint 和 vpAwards 与 Wiki 参考数据一致
    - 最少 100 次迭代
    - **Validates: Requirements 5.1, 5.2, 5.5, 6.1, 7.1, 8.1, 9.1**

  - [~] 10.4 编写 Property 5: 基地能力与限制注册覆盖属性测试
    - **Property 5: 基地能力与限制注册覆盖**
    - 创建 `src/games/smashup/__tests__/audit-base-abilities.property.test.ts`
    - 从有能力描述的基地中随机选取，验证 baseAbilities 注册表有对应条目
    - 最少 100 次迭代
    - **Validates: Requirements 5.3, 5.4, 6.2, 6.3, 7.2, 8.2, 9.4**

- [ ] 11. 基地卡审计 - 扩展包
  - [~] 11.1 审计 AL9000 扩展 8 张基地卡
    - 检查数值（breakpoint、vpAwards）和特殊能力
    - 覆盖：恐怖眺望台、鬼屋（幽灵）；荣誉之地、沙皇宫殿（熊骑兵）；发明家沙龙、工坊（蒸汽朋克）；温室、神秘花园（食人花）
    - 对照 `domain/baseAbilities_expansion.ts` 中的实现
    - _Requirements: 6.1, 6.2, 6.3, 6.4_

  - [~] 11.2 审计克苏鲁扩展 8 张基地卡
    - 检查数值和特殊能力
    - 覆盖：仪式场所、庇护所、疯狂山脉（远古物种）；拉莱耶（克苏鲁仆从）；印斯茅斯、伦格高原（印斯茅斯）；米斯卡塔尼克大学（米斯卡塔尼克）
    - 对照 `domain/baseAbilities_expansion.ts` 中的实现
    - _Requirements: 7.1, 7.2, 7.3_

  - [~] 11.3 审计 Monster Smash 扩展 8 张基地卡
    - 检查数值和特殊能力
    - 覆盖：实验工坊、魔像城堡（科学怪人）；集会场、巨石阵（狼人）；卵室、蚁丘（巨蚁）；血堡、地窖（吸血鬼）
    - 对照 `domain/baseAbilities_expansion.ts` 中的实现
    - _Requirements: 8.1, 8.2, 8.3_

  - [~] 11.4 审计 Pretty Pretty 和 Set4 扩展基地卡
    - 检查数值和特殊能力
    - 覆盖 Pretty Pretty：诡猫巷、九命之家（猫咪）；迷人峡谷、仙灵圈（仙灵）；美丽城堡、冰之城堡（公主）；平衡之地、小马乐园（神话马）
    - 覆盖 Set4：北极基地（电子猿）；牧场、绵羊神社（绵羊）
    - _Requirements: 9.1, 9.2, 9.3, 9.4_

  - [~] 11.5 提交全部基地卡差异汇总给用户确认
    - 汇总 10.1-10.2 和 11.1-11.4 发现的所有基地差异
    - 提交用户确认
    - _Requirements: 10.3, 10.4_

- [~] 12. Checkpoint - 全部基地卡审计完成
  - 确保所有测试通过，ask the user if questions arise.

- [ ] 13. 持续效果与力量修正专项审计
  - [~] 13.1 审计 `domain/ongoingEffects.ts` 全部注册条目
    - 逐条检查 protection/restriction/trigger/interceptor 注册
    - 对照对应卡牌的 i18n 描述文本
    - 检查过期条件（回合结束/基地记分）的实现正确性
    - _Requirements: 11.1, 11.4_

  - [~] 13.2 审计 `domain/ongoingModifiers.ts` 全部注册条目
    - 逐条检查 powerModifier/breakpointModifier 注册
    - 对照对应卡牌的 i18n 描述文本
    - 检查修正值、作用范围、过期时机
    - _Requirements: 11.2_

  - [~] 13.3 审计 `abilities/ongoing_modifiers.ts` 全部注册条目
    - 逐条检查各派系 ongoing 力量修正注册
    - 对照对应卡牌的 i18n 描述文本
    - _Requirements: 11.3_

  - [~] 13.4 编写 Property 8: 持续效果过期逻辑完整性属性测试
    - **Property 8: 持续效果过期逻辑完整性**
    - 创建 `src/games/smashup/__tests__/audit-ongoing-expiry.property.test.ts`
    - 从有过期条件的 ongoing 卡中随机选取，验证 ongoingEffects 触发器中有对应清理时机
    - 最少 100 次迭代
    - **Validates: Requirements 11.4**

- [ ] 14. 跨派系交叉验证
  - [~] 14.1 识别并分组同类型能力
    - 扫描所有能力执行器，按事件类型自动归类
    - 手动补充语义分类（消灭随从/抽牌/移动随从/力量修正/额外出牌/弃牌堆回收/返回手牌/打出限制）
    - 参考设计文档 §2.3.2 的能力类型分组表
    - _Requirements: 12.1-12.6_

  - [~] 14.2 执行跨派系实现路径比对
    - 对每个能力类型组，比对组内所有卡牌的实现路径（事件类型、注册模式、交互模式）
    - 使用设计文档 §2.3.3 的一致性判定标准和白名单
    - 标记合理差异和待确认不一致
    - _Requirements: 12.1-12.7_

  - [~] 14.3 输出跨派系交叉验证审计文档
    - 生成 `.tmp/smashup-cross-faction-audit.md`
    - 按能力类型分节，记录实现比对结果
    - 格式参考设计文档 §3.3 的交叉验证审计文档模板
    - _Requirements: 12.7_

  - [~] 14.4 编写 Property 7: 跨派系同类能力实现路径一致性属性测试
    - **Property 7: 跨派系同类能力实现路径一致性**
    - 创建 `src/games/smashup/__tests__/audit-cross-faction.property.test.ts`
    - 从同类能力组中随机选取卡牌对，验证使用相同事件类型和注册模式
    - 最少 100 次迭代
    - **Validates: Requirements 12.1-12.6**

- [ ] 15. 交互链完整性审计
  - [~] 15.1 扫描全部能力执行器的交互创建点
    - 扫描所有 `abilities/*.ts` 和 `domain/baseAbilities*.ts` 中的 `createSimpleChoice`/`queueInteraction` 调用
    - 提取所有 sourceId
    - 对照 `domain/abilityInteractionHandlers.ts` 注册表
    - 标记未注册的 sourceId 为 ❌ 交互链断裂
    - _Requirements: 13.1, 13.3_

  - [~] 15.2 追踪多步交互链连续性
    - 对每个 interactionHandler，检查是否创建后续交互
    - 验证后续交互的 sourceId 也有对应 handler
    - 标记断裂的多步交互链
    - _Requirements: 13.2_

  - [~] 15.3 检查基地能力交互处理函数注册
    - 检查 `domain/baseAbilities.ts` 和 `domain/baseAbilities_expansion.ts` 中创建交互的基地能力
    - 验证对应的交互处理函数已注册
    - _Requirements: 13.4_

- [~] 16. Checkpoint - 交叉验证和交互链审计完成
  - 确保所有测试通过，ask the user if questions arise.

- [ ] 17. 汇总报告与审计完整性验证
  - [~] 17.1 生成全局审计汇总报告
    - 汇总所有派系和基地的审计结果
    - 输出：总卡牌数、已审计数、一致数、偏差数、缺失数
    - 输出：交叉不一致数、交互链断裂数
    - _Requirements: 10.5_

  - [~] 17.2 编写审计完整性验证测试
    - 创建 `src/games/smashup/__tests__/audit-completeness.test.ts`
    - 验证所有 21 个派系（含疯狂牌库）都被审计覆盖
    - 验证所有基地卡都被审计覆盖
    - 验证审计矩阵格式符合规范
    - _Requirements: 10.4, 10.5_

- [~] 18. Final checkpoint - 全部审计完成
  - 确保所有测试通过，ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- 审计以自动化属性测试为主，人工审查为辅
- 差异累积后按派系/基地组批量提交用户确认，不自动修改
- 已有测试资产（`abilityBehaviorAudit.test.ts`、`interactionCompletenessAudit.test.ts` 等）应优先复用和扩展
- 属性测试验证通用正确性属性，单元测试覆盖具体卡牌行为
- 跨派系交叉验证在全部派系审计完成后执行
- Wiki 快照数据分批补充，随审计进度逐步完善
