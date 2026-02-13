# 实现计划：DiceThrone 全链路审查

## 概述

按英雄逐个执行全链路审查，每个英雄审查完成后输出审查矩阵并修复发现的问题。审查顺序：僧侣 → 狂战士 → 圣骑士 → 火法师 → 月精灵 → 暗影盗贼。最后执行跨英雄共享状态一致性审查和 UI 交互链审查。

## Tasks

- [ ] 1. 僧侣（Monk）全链路审查
  - [ ] 1.1 审查僧侣技能定义 vs i18n vs customActions 执行逻辑
    - 读取 `heroes/monk/abilities.ts`、`customActions/monk.ts`、i18n JSON
    - 逐技能拆分原子效果，检查六层链路
    - 输出审查矩阵，记录发现的问题
    - _Requirements: 1.1, 1.2, 1.3, 3.1_
  - [ ] 1.2 审查僧侣 Token 定义 vs i18n vs executeTokens/tokenResponse 执行逻辑
    - 检查太极、闪避、净化、击倒的定义与执行一致性
    - _Requirements: 2.1, 2.2, 2.3, 4.1, 4.2, 4.3_
  - [ ] 1.3 审查僧侣卡牌定义 vs i18n vs executeCards 执行逻辑
    - 读取 `heroes/monk/cards.ts`，逐卡牌检查效果、CP 消耗、出牌时机
    - _Requirements: 5.1, 5.2, 5.3_
  - [ ] 1.4 修复僧侣审查中发现的所有问题
    - 修复代码/i18n 不一致
    - _Requirements: 1.4, 2.4, 3.4, 4.4, 5.4_
  - [ ]* 1.5 补充僧侣缺失的测试覆盖
    - **Property 2: CustomAction 输出与 AbilityDef 声明一致性**
    - **Validates: Requirements 3.1, 9.2**

- [ ] 2. 狂战士（Barbarian）全链路审查
  - [ ] 2.1 审查狂战士技能定义 vs i18n vs customActions 执行逻辑
    - 读取 `heroes/barbarian/abilities.ts`、`customActions/barbarian.ts`、i18n JSON
    - 逐技能（含 Level 2/3 升级）拆分原子效果，检查六层链路
    - _Requirements: 1.1, 1.2, 1.3, 3.1_
  - [ ] 2.2 审查狂战士 Token 定义 vs i18n vs 执行逻辑
    - 检查脑震荡、眩晕的定义与执行一致性
    - _Requirements: 2.1, 2.2, 2.3, 4.1, 4.2, 4.3_
  - [ ] 2.3 审查狂战士卡牌定义 vs i18n vs executeCards 执行逻辑
    - _Requirements: 5.1, 5.2, 5.3_
  - [ ] 2.4 修复狂战士审查中发现的所有问题
    - _Requirements: 1.4, 2.4, 3.4, 4.4, 5.4_
  - [ ]* 2.5 补充狂战士缺失的测试覆盖
    - **Property 2: CustomAction 输出与 AbilityDef 声明一致性**
    - **Validates: Requirements 3.1, 9.2**

- [ ] 3. Checkpoint - 僧侣和狂战士审查完成
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 4. 圣骑士（Paladin）全链路审查
  - [ ] 4.1 审查圣骑士技能定义 vs i18n vs customActions 执行逻辑
    - 读取 `heroes/paladin/abilities.ts`、`customActions/paladin.ts`、i18n JSON
    - 逐技能（含 Level 2/3 升级）拆分原子效果，检查六层链路
    - _Requirements: 1.1, 1.2, 1.3, 3.1_
  - [ ] 4.2 审查圣骑士 Token 定义 vs i18n vs 执行逻辑
    - 检查暴击、精准、守护、神罚、神圣祝福、教会税升级的定义与执行一致性
    - _Requirements: 2.1, 2.2, 2.3, 4.1, 4.2, 4.3_
  - [ ] 4.3 审查圣骑士卡牌定义 vs i18n vs executeCards 执行逻辑
    - _Requirements: 5.1, 5.2, 5.3_
  - [ ] 4.4 修复圣骑士审查中发现的所有问题
    - _Requirements: 1.4, 2.4, 3.4, 4.4, 5.4_
  - [ ]* 4.5 补充圣骑士缺失的测试覆盖
    - **Property 2: CustomAction 输出与 AbilityDef 声明一致性**
    - **Validates: Requirements 3.1, 9.2**

- [ ] 5. 火法师（Pyromancer）全链路审查
  - [ ] 5.1 审查火法师技能定义 vs i18n vs customActions 执行逻辑
    - 读取 `heroes/pyromancer/abilities.ts`、`customActions/pyromancer.ts`、i18n JSON
    - 逐技能（含 Level 2/3 升级）拆分原子效果，检查六层链路
    - 特别关注火焰精通的消耗逻辑（非 Token 响应弹窗，由 customAction 自动消耗）
    - _Requirements: 1.1, 1.2, 1.3, 3.1_
  - [ ] 5.2 审查火法师 Token 定义 vs i18n vs 执行逻辑
    - 检查火焰精通、击倒、燃烧、眩晕的定义与执行一致性
    - _Requirements: 2.1, 2.2, 2.3, 4.1, 4.2, 4.3_
  - [ ] 5.3 审查火法师卡牌定义 vs i18n vs executeCards 执行逻辑
    - _Requirements: 5.1, 5.2, 5.3_
  - [ ] 5.4 修复火法师审查中发现的所有问题
    - _Requirements: 1.4, 2.4, 3.4, 4.4, 5.4_
  - [ ]* 5.5 补充火法师缺失的测试覆盖
    - **Property 2: CustomAction 输出与 AbilityDef 声明一致性**
    - **Validates: Requirements 3.1, 9.2**

- [ ] 6. Checkpoint - 圣骑士和火法师审查完成
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 7. 月精灵（Moon Elf）全链路审查
  - [ ] 7.1 审查月精灵技能定义 vs i18n vs customActions 执行逻辑
    - 读取 `heroes/moon_elf/abilities.ts`、`customActions/moon_elf.ts`、i18n JSON
    - 逐技能（含 Level 2/3 升级）拆分原子效果，检查六层链路
    - _Requirements: 1.1, 1.2, 1.3, 3.1_
  - [ ] 7.2 审查月精灵 Token 定义 vs i18n vs 执行逻辑
    - 检查闪避、致盲、缠绕、锁定的定义与执行一致性
    - _Requirements: 2.1, 2.2, 2.3, 4.1, 4.2, 4.3_
  - [ ] 7.3 审查月精灵卡牌定义 vs i18n vs executeCards 执行逻辑
    - _Requirements: 5.1, 5.2, 5.3_
  - [ ] 7.4 修复月精灵审查中发现的所有问题
    - _Requirements: 1.4, 2.4, 3.4, 4.4, 5.4_
  - [ ]* 7.5 补充月精灵缺失的测试覆盖
    - **Property 2: CustomAction 输出与 AbilityDef 声明一致性**
    - **Validates: Requirements 3.1, 9.2**

- [ ] 8. 暗影盗贼（Shadow Thief）全链路审查
  - [ ] 8.1 审查暗影盗贼技能定义 vs i18n vs customActions 执行逻辑
    - 读取 `heroes/shadow_thief/abilities.ts`、`customActions/shadow_thief.ts`、i18n JSON
    - 逐技能（含 Level 2/3 升级）拆分原子效果，检查六层链路
    - _Requirements: 1.1, 1.2, 1.3, 3.1_
  - [ ] 8.2 审查暗影盗贼 Token 定义 vs i18n vs 执行逻辑
    - 检查潜行、伏击、中毒的定义与执行一致性
    - _Requirements: 2.1, 2.2, 2.3, 4.1, 4.2, 4.3_
  - [ ] 8.3 审查暗影盗贼卡牌定义 vs i18n vs executeCards 执行逻辑
    - _Requirements: 5.1, 5.2, 5.3_
  - [ ] 8.4 修复暗影盗贼审查中发现的所有问题
    - _Requirements: 1.4, 2.4, 3.4, 4.4, 5.4_
  - [ ]* 8.5 补充暗影盗贼缺失的测试覆盖
    - **Property 2: CustomAction 输出与 AbilityDef 声明一致性**
    - **Validates: Requirements 3.1, 9.2**

- [ ] 9. Checkpoint - 月精灵和暗影盗贼审查完成
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 10. 跨英雄共享状态效果一致性审查
  - [ ] 10.1 审查共享状态效果定义一致性
    - 比较击倒（僧侣 vs 火法师）、闪避（僧侣 vs 月精灵）的 TokenDef 关键字段
    - 检查燃烧和中毒的 flowHooks.ts upkeep 处理逻辑
    - _Requirements: 8.1, 8.2, 8.3_
  - [ ] 10.2 修复共享状态效果不一致问题
    - _Requirements: 8.4_
  - [ ]* 10.3 编写共享状态效果一致性测试
    - **Property 9: 共享状态效果跨英雄一致性**
    - **Property 10: 燃烧/中毒 upkeep 处理正确性**
    - **Validates: Requirements 8.1, 8.2, 8.3**

- [ ] 11. UI 交互链完整性审查
  - [ ] 11.1 审查 Token 响应弹窗触发链路
    - 检查 TokenResponseModal 的触发条件（shouldOpenTokenResponse）
    - 验证防御性 Token（太极/闪避/守护/神罚/潜行）和进攻性 Token（太极/暴击/伏击）的弹窗触发
    - _Requirements: 6.1, 6.2_
  - [ ] 11.2 审查 Choice/BonusDie/Knockdown/Purify 弹窗触发链路
    - 检查 ChoiceModal、BonusDieOverlay、ConfirmRemoveKnockdownModal、PurifyModal 的触发条件
    - _Requirements: 6.3, 6.4, 6.5, 6.6_
  - [ ] 11.3 修复 UI 交互链问题
    - _Requirements: 6.7_

- [ ] 12. 规则文档 vs 代码实现一致性审查
  - [ ] 12.1 审查回合阶段流转与伤害类型处理
    - 对照规则文档 §3 和 §7 检查 flowHooks.ts 和 effects.ts
    - _Requirements: 7.1, 7.2_
  - [ ] 12.2 审查终极技能、状态效果、攻击修正机制
    - 对照规则文档 §4.4、§6、§7.2 检查相关代码
    - _Requirements: 7.3, 7.4, 7.5_
  - [ ] 12.3 修复规则不一致问题
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5_
  - [ ]* 12.4 编写规则一致性属性测试
    - **Property 3: 可防御性判定正确性**
    - **Property 6: 阶段流转正确性**
    - **Property 7: 伤害类型处理正确性**
    - **Property 8: 状态效果叠加正确性**
    - **Validates: Requirements 7.1, 7.2, 7.3, 7.4, 7.5**

- [ ] 13. 测试覆盖完整性审查
  - [ ] 13.1 审查所有 customAction 的测试覆盖
    - 列出所有已注册的 customAction ID
    - 检查每个 ID 在测试文件中是否有对应测试
    - _Requirements: 9.1, 9.2_
  - [ ]* 13.2 编写 customAction 覆盖完整性审计测试
    - **Property 11: CustomAction 测试覆盖完整性**
    - **Validates: Requirements 9.2**

- [ ] 14. Final checkpoint - 全部审查完成
  - Ensure all tests pass, ask the user if questions arise.
  - 输出最终审查报告摘要

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- 每个英雄的审查独立进行，发现问题立即记录
- 修复任务（x.4）在审查完成后批量执行
- 审查矩阵以注释形式记录在修复 commit 中
- Property tests validate universal correctness properties
- Unit tests validate specific examples and edge cases
