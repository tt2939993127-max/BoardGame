# 实施计划：王权骰铸（Dice Throne）能力与卡牌 Wiki 审计

## 概述

对王权骰铸全部 6 个角色的能力（Level 1/2/3）、Token、专属卡和通用卡（18 张共享卡）进行系统化 Wiki 对照审计。审计以人工逐角色对照为主，辅以自动化属性测试验证代码内部一致性。Wiki 描述提取为本地 TypeScript fixture 快照，审计报告按角色分组输出到 `.tmp/` 目录。

## Tasks

- [x] 1. 审计基础设施搭建
  - [x] 1.1 创建 Wiki 描述快照数据文件
    - 在 `src/games/dicethrone/__tests__/fixtures/` 下创建 `wikiSnapshots.ts`
    - 定义 `WikiAbilitySnapshot`、`WikiTokenSnapshot`、`WikiCardSnapshot` 接口
    - 为全部 6 个角色的能力（L1/L2/L3）、Token、专属卡填充 Wiki 描述快照数据
    - 为 18 张通用卡填充 Wiki 描述快照数据
    - _Requirements: 1.1, 1.2, 1.3, 1.4_

  - [x] 1.2 创建审计工具函数模块
    - 在 `src/games/dicethrone/__tests__/helpers/` 下创建 `auditUtils.ts`
    - 实现 `getHeroAbilities(heroId)` 获取指定角色所有等级能力定义
    - 实现 `getHeroTokens(heroId)` 获取指定角色所有 Token 定义
    - 实现 `getHeroCards(heroId)` 获取指定角色专属卡定义
    - 实现 `getCommonCards()` 获取全部 18 张通用卡定义
    - 实现 `getI18nDescription(key, locale)` 读取 i18n 描述文本（支持 zh-CN 和 en）
    - 实现 `classifySeverity(type: DiscrepancyType): Severity` 严重程度分类函数
    - _Requirements: 1.1, 1.2, 1.4, 4.3_

  - [x] 1.3 创建审计结果输出格式化工具
    - 在 `src/games/dicethrone/__tests__/helpers/` 下创建 `auditFormatters.ts`
    - 实现 `formatAbilityAuditMatrix(results)` 输出能力审计矩阵 Markdown 表格
    - 实现 `formatTokenAuditMatrix(results)` 输出 Token 审计矩阵
    - 实现 `formatCardAuditMatrix(results)` 输出卡牌审计矩阵（专属卡+通用卡共用）
    - 实现 `formatHeroAuditReport(heroResult)` 输出单角色完整审计报告
    - 实现 `formatGlobalSummary(summary: AuditSummary)` 输出汇总统计
    - 审计结果分三类：✅ 一致、❌ 差异、⚠️ 需人工验证
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5_

- [x] 2. 核心属性测试
  - [x] 2.1 编写 Property 1: 审计覆盖完整性属性测试
    - **Property 1: 审计覆盖完整性**
    - 创建 `src/games/dicethrone/__tests__/audit-coverage.property.test.ts`
    - 使用 fast-check 从 6 个 heroId 中随机选取，验证审计报告中存在该角色的能力审计、Token 审计和专属卡审计三个部分
    - 验证通用卡审计恰好出现一次
    - 最少 100 次迭代
    - **Validates: Requirements 1.1, 1.2**

  - [x] 2.2 编写 Property 2: 代码内部效果-描述一致性属性测试
    - **Property 2: 代码内部效果-描述一致性**
    - 创建 `src/games/dicethrone/__tests__/audit-effect-description.property.test.ts`
    - 从所有 AbilityDef/TokenDef/AbilityCard 中随机选取，验证 effects 中的 damage/heal/grantStatus 数值在 i18n 描述文本中有对应体现
    - 最少 100 次迭代
    - **Validates: Requirements 2.1, 3.1, 6A.1, 6B.2**

  - [x] 2.3 编写 Property 3: i18n key 覆盖完整性属性测试
    - **Property 3: i18n key 覆盖完整性**
    - 创建 `src/games/dicethrone/__tests__/audit-i18n-coverage.property.test.ts`
    - 从所有能力（含 L1/L2/L3）、Token、卡牌（专属卡+通用卡）ID 中随机选取，验证 en 和 zh-CN 两个 locale 的 i18n JSON 中存在对应 name 和 description key
    - 最少 100 次迭代
    - **Validates: Requirements 5.1, 5.4**

  - [x] 2.4 编写 Property 4: 差异严重程度分类正确性属性测试
    - **Property 4: 差异严重程度分类正确性**
    - 创建 `src/games/dicethrone/__tests__/audit-severity.property.test.ts`
    - 使用 fast-check 生成随机 DiscrepancyType，验证 `classifySeverity()` 映射结果符合设计文档的严重程度分级规则
    - 最少 100 次迭代
    - **Validates: Requirements 4.3**

  - [x] 2.5 编写 Property 5: Wiki 快照比对完整性属性测试
    - **Property 5: Wiki 快照比对完整性**
    - 创建 `src/games/dicethrone/__tests__/audit-wiki-comparison.property.test.ts`
    - 从 Wiki 快照条目中随机选取，验证审计报告中存在对应比对结果行（✅ 或 ❌）；从代码定义中随机选取，验证 Wiki 快照中不存在的条目被标记为"多余项"
    - 最少 100 次迭代
    - **Validates: Requirements 2.2, 2.3, 2.4, 2.5, 3.2, 3.3, 3.4, 3.5, 6A.2, 6A.3, 6A.4, 6A.5, 6B.3, 6B.4, 6B.5, 6B.6**

- [x] 3. Checkpoint - 基础设施和属性测试就绪
  - 确保所有测试通过，ask the user if questions arise.

- [x] 4. 审计角色 1：狂战士（Barbarian）
  - [x] 4.1 审计狂战士全等级能力（L1/L2/L3）
    - 逐一比对 `heroes/barbarian/abilities.ts` 中每个 AbilityDef 的伤害、治疗、状态效果、触发条件、特殊标签与 Wiki 快照
    - 检查 L2/L3 升级变体的数值变化和新增效果/标签
    - 输出能力审计矩阵到 `.tmp/dicethrone-audit-barbarian.md`
    - _Requirements: 2.1, 2.2, 2.3, 2.6_

  - [x] 4.2 审计狂战士 Token
    - 逐一比对 `heroes/barbarian/tokens.ts` 中每个 TokenDef 的名称、效果描述、触发时机、效果动作、叠加上限、类别与 Wiki 快照
    - 输出 Token 审计矩阵追加到 `.tmp/dicethrone-audit-barbarian.md`
    - _Requirements: 3.1, 3.2, 3.3_

  - [x] 4.3 审计狂战士专属卡
    - 逐一比对 `heroes/barbarian/cards.ts` 中每个 Hero_Specific_Card 的 cpCost、timing、effects、type、description 与 Wiki 快照
    - 输出专属卡审计矩阵追加到 `.tmp/dicethrone-audit-barbarian.md`
    - _Requirements: 6A.1, 6A.2, 6A.3, 6A.6, 6A.7_

  - [x] 4.4 审计狂战士 i18n 描述一致性
    - 检查 en 和 zh-CN 两个 locale 中该角色所有能力、Token、专属卡的 name/description key 是否存在
    - 比对 en locale 描述与 Wiki 英文描述、zh-CN locale 描述与 Wiki 语义
    - 将 i18n 差异追加到 `.tmp/dicethrone-audit-barbarian.md`
    - _Requirements: 5.1, 5.2, 5.3, 5.4_

- [x] 5. 审计角色 2：僧侣（Monk）
  - [x] 5.1 审计僧侣全等级能力（L1/L2/L3）
    - 逐一比对 `heroes/monk/abilities.ts` 中每个 AbilityDef 与 Wiki 快照
    - 输出能力审计矩阵到 `.tmp/dicethrone-audit-monk.md`
    - _Requirements: 2.1, 2.2, 2.3, 2.6_

  - [x] 5.2 审计僧侣 Token
    - 逐一比对 `heroes/monk/tokens.ts` 中每个 TokenDef 与 Wiki 快照
    - 输出 Token 审计矩阵追加到 `.tmp/dicethrone-audit-monk.md`
    - _Requirements: 3.1, 3.2, 3.3_

  - [x] 5.3 审计僧侣专属卡
    - 逐一比对 `heroes/monk/cards.ts` 中每个 Hero_Specific_Card 与 Wiki 快照
    - 输出专属卡审计矩阵追加到 `.tmp/dicethrone-audit-monk.md`
    - _Requirements: 6A.1, 6A.2, 6A.3, 6A.6, 6A.7_

  - [x] 5.4 审计僧侣 i18n 描述一致性
    - 检查 en 和 zh-CN 两个 locale 中该角色所有能力、Token、专属卡的 i18n 覆盖和描述一致性
    - 将 i18n 差异追加到 `.tmp/dicethrone-audit-monk.md`
    - _Requirements: 5.1, 5.2, 5.3, 5.4_

- [x] 6. Checkpoint - 前两个角色审计完成
  - 确保所有测试通过，ask the user if questions arise.

- [x] 7. 审计角色 3：火法师（Pyromancer）
  - [x] 7.1 审计火法师全等级能力（L1/L2/L3）
    - 逐一比对 `heroes/pyromancer/abilities.ts` 中每个 AbilityDef 与 Wiki 快照
    - 输出能力审计矩阵到 `.tmp/dicethrone-audit-pyromancer.md`
    - _Requirements: 2.1, 2.2, 2.3, 2.6_

  - [x] 7.2 审计火法师 Token
    - 逐一比对 `heroes/pyromancer/tokens.ts` 中每个 TokenDef 与 Wiki 快照
    - 输出 Token 审计矩阵追加到 `.tmp/dicethrone-audit-pyromancer.md`
    - _Requirements: 3.1, 3.2, 3.3_

  - [x] 7.3 审计火法师专属卡
    - 逐一比对 `heroes/pyromancer/cards.ts` 中每个 Hero_Specific_Card 与 Wiki 快照
    - 输出专属卡审计矩阵追加到 `.tmp/dicethrone-audit-pyromancer.md`
    - _Requirements: 6A.1, 6A.2, 6A.3, 6A.6, 6A.7_

  - [x] 7.4 审计火法师 i18n 描述一致性
    - 检查 en 和 zh-CN 两个 locale 中该角色所有能力、Token、专属卡的 i18n 覆盖和描述一致性
    - 将 i18n 差异追加到 `.tmp/dicethrone-audit-pyromancer.md`
    - _Requirements: 5.1, 5.2, 5.3, 5.4_

- [x] 8. 审计角色 4：月精灵（Moon Elf）
  - [x] 8.1 审计月精灵全等级能力（L1/L2/L3）
    - 逐一比对 `heroes/moon_elf/abilities.ts` 中每个 AbilityDef 与 Wiki 快照
    - 输出能力审计矩阵到 `.tmp/dicethrone-audit-moon_elf.md`
    - _Requirements: 2.1, 2.2, 2.3, 2.6_

  - [x] 8.2 审计月精灵 Token
    - 逐一比对 `heroes/moon_elf/tokens.ts` 中每个 TokenDef 与 Wiki 快照
    - 输出 Token 审计矩阵追加到 `.tmp/dicethrone-audit-moon_elf.md`
    - _Requirements: 3.1, 3.2, 3.3_

  - [x] 8.3 审计月精灵专属卡
    - 逐一比对 `heroes/moon_elf/cards.ts` 中每个 Hero_Specific_Card 与 Wiki 快照
    - 输出专属卡审计矩阵追加到 `.tmp/dicethrone-audit-moon_elf.md`
    - _Requirements: 6A.1, 6A.2, 6A.3, 6A.6, 6A.7_

  - [x] 8.4 审计月精灵 i18n 描述一致性
    - 检查 en 和 zh-CN 两个 locale 中该角色所有能力、Token、专属卡的 i18n 覆盖和描述一致性
    - 将 i18n 差异追加到 `.tmp/dicethrone-audit-moon_elf.md`
    - _Requirements: 5.1, 5.2, 5.3, 5.4_

- [x] 9. Checkpoint - 4 个角色审计完成
  - 确保所有测试通过，ask the user if questions arise.

- [x] 10. 审计角色 5：暗影刺客（Shadow Thief）
  - [x] 10.1 审计暗影刺客全等级能力（L1/L2/L3）
    - 逐一比对 `heroes/shadow_thief/abilities.ts` 中每个 AbilityDef 与 Wiki 快照
    - 输出能力审计矩阵到 `.tmp/dicethrone-audit-shadow_thief.md`
    - _Requirements: 2.1, 2.2, 2.3, 2.6_

  - [x] 10.2 审计暗影刺客 Token
    - 逐一比对 `heroes/shadow_thief/tokens.ts` 中每个 TokenDef 与 Wiki 快照
    - 输出 Token 审计矩阵追加到 `.tmp/dicethrone-audit-shadow_thief.md`
    - _Requirements: 3.1, 3.2, 3.3_

  - [x] 10.3 审计暗影刺客专属卡
    - 逐一比对 `heroes/shadow_thief/cards.ts` 中每个 Hero_Specific_Card 与 Wiki 快照
    - 输出专属卡审计矩阵追加到 `.tmp/dicethrone-audit-shadow_thief.md`
    - _Requirements: 6A.1, 6A.2, 6A.3, 6A.6, 6A.7_

  - [x] 10.4 审计暗影刺客 i18n 描述一致性
    - 检查 en 和 zh-CN 两个 locale 中该角色所有能力、Token、专属卡的 i18n 覆盖和描述一致性
    - 将 i18n 差异追加到 `.tmp/dicethrone-audit-shadow_thief.md`
    - _Requirements: 5.1, 5.2, 5.3, 5.4_

- [ ] 11. 审计角色 6：圣骑士（Paladin）
  - [~] 11.1 审计圣骑士全等级能力（L1/L2/L3）
    - 逐一比对 `heroes/paladin/abilities.ts` 中每个 AbilityDef 与 Wiki 快照
    - 输出能力审计矩阵到 `.tmp/dicethrone-audit-paladin.md`
    - _Requirements: 2.1, 2.2, 2.3, 2.6_

  - [~] 11.2 审计圣骑士 Token
    - 逐一比对 `heroes/paladin/tokens.ts` 中每个 TokenDef 与 Wiki 快照
    - 输出 Token 审计矩阵追加到 `.tmp/dicethrone-audit-paladin.md`
    - _Requirements: 3.1, 3.2, 3.3_

  - [~] 11.3 审计圣骑士专属卡
    - 逐一比对 `heroes/paladin/cards.ts` 中每个 Hero_Specific_Card 与 Wiki 快照
    - 输出专属卡审计矩阵追加到 `.tmp/dicethrone-audit-paladin.md`
    - _Requirements: 6A.1, 6A.2, 6A.3, 6A.6, 6A.7_

  - [~] 11.4 审计圣骑士 i18n 描述一致性
    - 检查 en 和 zh-CN 两个 locale 中该角色所有能力、Token、专属卡的 i18n 覆盖和描述一致性
    - 将 i18n 差异追加到 `.tmp/dicethrone-audit-paladin.md`
    - _Requirements: 5.1, 5.2, 5.3, 5.4_

- [ ] 12. Checkpoint - 全部 6 个角色审计完成
  - 确保所有测试通过，ask the user if questions arise.

- [ ] 13. 通用卡审计
  - [~] 13.1 审计 18 张通用卡定义
    - 逐一比对 `src/games/dicethrone/domain/commonCards.ts` 中 COMMON_CARDS 的每张卡牌的 cpCost、timing、effects、type、description 与 Wiki 快照
    - 检查通用卡列表与 Wiki 的完整性（缺失/多余）
    - 输出通用卡审计矩阵到 `.tmp/dicethrone-audit-common-cards.md`
    - _Requirements: 6B.1, 6B.2, 6B.3, 6B.4, 6B.5, 6B.6_

  - [~] 13.2 审计通用卡 i18n 描述一致性
    - 检查 en 和 zh-CN 两个 locale 中 18 张通用卡的 name/description key 是否存在
    - 比对 en locale 描述与 Wiki 英文描述、zh-CN locale 描述与 Wiki 语义
    - 将 i18n 差异追加到 `.tmp/dicethrone-audit-common-cards.md`
    - _Requirements: 5.1, 5.2, 5.3, 5.4_

- [ ] 14. 汇总报告生成
  - [~] 14.1 生成全局审计汇总报告
    - 汇总 6 个角色审计报告和通用卡审计报告的所有差异
    - 按角色统计差异项数量（能力差异、Token 差异、专属卡差异）
    - 按严重程度分类统计（高/中）
    - 输出汇总报告到 `.tmp/dicethrone-audit-summary.md`
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5_

  - [~] 14.2 提交全部差异汇总给用户确认
    - 汇总所有角色和通用卡发现的差异
    - 按差异类型分类（数值错误/效果缺失/描述不一致/i18n 缺失）
    - 提交用户确认处理方式（以 Wiki 为准/以代码为准/需进一步调查）
    - _Requirements: 4.1, 4.4_

- [ ] 15. Final checkpoint - 全部审计完成
  - 确保所有测试通过，ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- 审计以人工逐角色对照为主，Wiki 数据提取为本地 TypeScript fixture 快照
- 差异累积后批量提交用户确认，不自动修改代码
- 已有测试资产（`card-cross-audit.test.ts`、`entity-chain-integrity.test.ts`、`card-playCondition-audit.test.ts`）应优先复用
- 属性测试验证代码内部一致性（效果-描述对齐、i18n 覆盖、严重程度分类），人工审计验证代码与 Wiki 的外部一致性
- 通用卡仅审计一次（Task 13），不按角色重复
- 每个角色的审计报告独立输出到 `.tmp/dicethrone-audit-<heroId>.md`
