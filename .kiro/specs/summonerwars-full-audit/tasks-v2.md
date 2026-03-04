# 实施计划：召唤师战争语义深度审查（D6-D10 + 复杂语义拆解）

## 概述

按维度逐个执行系统性审查，先做 D6-D10 五个维度，再做复杂语义拆解（差异矩阵、真值表、跨机制交叉），最后补充测试和修复。每个任务是可独立执行的审查+修复单元。

## 任务

- [x] 1. D6 副作用传播审查 → `audit-v2-d6.md`
  - [x] 1.1 审查 UNIT_DESTROYED 事件的完整消费链 ✅ 无缺陷
  - [x] 1.2 审查自伤致死和事件卡伤害传播 ✅ 无缺陷
  - [x] 1.3 审查控制权转移后的消灭归属 ✅ 无缺陷

- [x] 2. D7 资源守恒审查 → `audit-v2-d7.md`
  - [x] 2.1 审查魔力守恒 ✅ 所有路径均调用 clampMagic
  - [x] 2.2 审查充能守恒 ✅ ancestral_bond/spirit_bond 转移守恒正确
  - [x] 2.3 审查手牌/弃牌堆/棋盘守恒 ✅ 无缺陷

- [x] 3. D8 时序正确审查 → `audit-v2-d8.md`
  - [x] 3.1 审查阶段流转和 FlowHooks 时序 ✅ 六阶段顺序正确
  - [x] 3.2 审查攻击结算时序 ✅ 时序正确
  - [x] 3.3 审查回合结束清理时序 ✅ 清理顺序正确

- [x] 4. D9 幂等与重入审查 → `audit-v2-d9.md`
  - [x] 4.1 审查 Undo 操作的状态恢复 ✅ 快照恢复天然保证
  - [x] 4.2 审查 EventStream 刷新安全性 ✅ 首次挂载跳过历史

- [x] 5. D10 元数据一致审查 → `audit-v2-d10.md`
  - [x] 5.1 审查 AbilityDef 元数据与下游逻辑一致性 ✅ 全部一致

- [x] 6. 检查点 - D6-D10 审查完成
  - D6-D10 共发现 0 个缺陷
  - 所有维度通过

- [x] 7. 充能系统差异矩阵 → `audit-v2-charge-matrix.md`
  - [x] 7.1 构建充能系统差异矩阵
    - 列出所有充能相关能力：power_boost、blood_rage、imposing、intimidate、power_up、life_up、speed_up、gather_power、frost_axe、ice_shards、ancestral_bond、spirit_bond、blood_rune
    - 逐字段对比：获取方式、消耗方式、上限、衰减、加成公式
    - 验证定义层（AbilityDef）与执行层（executors/calculateEffectiveStrength/getEffectiveLife/getMovementEnhancements）一致
    - 输出差异矩阵表格
    - **发现 CM-1**: power_boost 被错误应用+5上限（medium）
    - **发现 CM-2**: blood_rage 被错误应用+5上限（low）
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5_

- [x] 8. 条件链真值表 → `audit-v2-truth-tables.md`
  - [x] 8.1 构建攻击验证真值表 ✅ 12组合全部正确
  - [x] 8.2 构建移动验证真值表 ✅ 15组合全部正确
  - [x] 8.3 构建伤害计算真值表 ✅ 发现 power_boost/blood_rage 上限问题（同 CM-1/CM-2）
  - [x] 8.4 构建能力可用性真值表 ✅ 7组合全部正确

- [x] 9. 跨机制语义交叉审查 → `audit-v2-cross-interaction.md`
  - [x] 9.1 审查充能 × 交缠颂歌/幻化/力量颂歌 ✅ 正确
  - [x] 9.2 审查守卫 × 飞行/远程 ✅ 正确
  - [x] 9.3 审查践踏 × 献祭、冲锋 × 缓慢
    - **发现 CI-1**: postProcessDeathChecks 不触发 onDeath，践踏致死不触发献祭（medium）
  - [x] 9.4 审查禁足 × 不活动惩罚、活体结构 × 建筑能力
    - **发现 CI-3**: structure_shift 与 mobile_structure 交互待验证（low）

- [x] 10. 检查点 - 语义拆解完成
  - 充能矩阵发现 2 个问题（CM-1 medium, CM-2 low）
  - 真值表发现同上 2 个问题
  - 跨机制交叉发现 1 个 medium 问题（CI-1）+ 2 个 low 问题

- [x] 11. 测试补充与修复
  - [x] 11.1 修复审查发现的代码缺陷
    - **CM-1/CM-2 修正**：经核对 i18n 文本，power_boost 规则为"至多为+5"，CM-1 实为误报。blood_rage 无 modifyStrength 效果，CM-2 也为误报。但原代码使用 `ability.id` 硬编码判断上限，违反"禁止技能系统硬编码"规范。
    - **已修复**：将硬编码 ID 检查重构为数据驱动 `maxBonus` 字段：
      - `AbilityEffect` 类型新增 `maxBonus?: number`（modifyStrength/modifyLife）
      - `power_up`、`life_up`、`power_boost` 定义中声明 `maxBonus: 5`
      - `speed_up` 通过 `params.maxBonus` 传递上限
      - `calculateEffectiveStrength`、`getEffectiveLife`、`getEffectiveLifeBase`、`getUnitMoveEnhancements` 统一读取 `effect.maxBonus`
    - **CI-1 已修复**：用户确认 onDeath 应在单位死亡时触发（不论死因）。在 `postProcessDeathChecks` 中添加 `triggerOnDeath: true`，践踏/事件卡等间接伤害致死现在正确触发 onDeath 能力（如献祭）。
    - _Requirements: 9.1_
  - [x] 11.2 补充真值表关键组合测试
    - _Requirements: 9.2, 9.3_
  - [x] 11.3 补充跨机制交叉场景测试
    - 冲锋+缓慢交互测试 ✅ 2个用例
    - structure_shift + mobile_structure 交互测试 ✅ 2个用例（含敌方拒绝）
    - 践踏致死 × 献祭交互测试 ✅ 1个用例
    - _Requirements: 9.4_

- [x] 12. 最终检查点 - v2 审查完成
  - v2 审查总结报告：
    - **D6-D10**：5 个维度全部通过，0 个缺陷
    - **充能差异矩阵**：CM-1/CM-2 经 i18n 核对为误报，但触发了反硬编码重构（`maxBonus` 数据驱动）
    - **条件链真值表**：攻击/移动/伤害/能力可用性 4 张真值表全部通过
    - **跨机制交叉**：CI-1 已修复（postProcessDeathChecks triggerOnDeath），CI-2/CI-3 已补测试
    - **新增测试**：5 个（CI-1×1, CI-2×2, CI-3×2），全部通过
    - **修复 bug**：1 个（CI-1 间接伤害致死不触发 onDeath）
    - **反模式重构**：1 个（硬编码 ability.id 上限检查 → 数据驱动 maxBonus）
  - _Requirements: 9.5_

- [x] 13. D3 全面重审（写入→读取 ID 一致性）
  - [x] 13.1 更新 testing-audit.md 审查规范
    - 新增 D3 "写入→读取 ID 一致性" 审查规则
    - 新增 "规则术语必须查词汇表" 规则
    - 新增 "函数名不是证据" 规则
    - 新增 2 条教训附录（交缠颂歌 cardId/instanceId、交缠颂歌 tempAbilities 共享）
  - [x] 13.2 修复编织颂歌 D3 bug
    - `eventCards.ts:565` 写入 `cwTarget.instanceId`
    - `validate.ts:132` 和 `execute.ts:123` 使用 `findUnitPosition()` 按 cardId 匹配 → 改为 `findUnitPositionByInstanceId()`
  - [x] 13.3 修复测试 D3 问题
    - `abilities-barbaric.test.ts` 编织颂歌 targetUnitId 改用 instanceId
    - `abilities-necromancer-execute.test.ts` 全部 10 处 sourceUnitId 改用 instanceId
    - `abilities-phase-triggered.test.ts` 7 处 sourceUnitId 改用 instanceId
  - [x] 13.4 确认无问题的机制
    - 催眠引诱、力量颂歌、心灵操控、群情激愤、心灵捕获、fire_sacrifice_summon、life_drain 全部 ✅
  - [x] 13.5 全量测试通过
    - 42 文件 / 868 用例 / 0 失败
    - ESLint 0 errors

## 备注

- 本次审查是 v1 的补充，不重复八层链路审查
- D6-D10 审查按维度横向扫描，不按阵营纵向扫描
- 差异矩阵聚焦充能系统（召唤师战争最复杂的共享机制）
- 真值表聚焦攻击/移动验证（条件组合最多的判定逻辑）
- 跨机制交叉聚焦 v1 中标记为"低风险"但未深入的边界场景
- 测试补充优先级：P0（可能导致崩溃/无限循环）> P1（条件遗漏）> P2（边界场景）
