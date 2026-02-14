# Change: 新增大杀四方全卡牌与基地全链路审查规范

## Why
大杀四方当前已覆盖基础派系、克苏鲁扩展与 Awesome Level 9000 扩展，卡牌与基地能力分散在多个能力文件、持续效果注册表、交互处理器与测试中。缺少统一审查规范时，容易出现 i18n 描述与代码实现漂移，导致规则正确性风险。

## What Changes
- 新增 `smashup-audit` 能力规格，定义 16 个派系与全部基地卡的描述→实现全链路审查要求。
- 统一审查证据格式：按“独立交互链 × 六层”输出审查矩阵，并为每个 ❌ 项提供文件级证据与修复建议。
- 新增 `smashup-audit-report` 能力规格，定义最终汇总报告的严重度分级、通过率与修复优先级。
- 约束审查范围到 SmashUp 现有实现入口，避免遗漏 Ability 注册、交互处理、持续效果、基地能力与测试覆盖。

## Impact
- Affected specs: `smashup-audit`, `smashup-audit-report`
- Affected code/docs (apply 阶段预计涉及):
  - `public/locales/zh-CN/game-smashup.json`
  - `src/games/smashup/abilities/*.ts`
  - `src/games/smashup/domain/abilityRegistry.ts`
  - `src/games/smashup/domain/abilityInteractionHandlers.ts`
  - `src/games/smashup/domain/ongoingEffects.ts`
  - `src/games/smashup/domain/ongoingModifiers.ts`
  - `src/games/smashup/domain/baseAbilities.ts`
  - `src/games/smashup/domain/baseAbilities_expansion.ts`
  - `src/games/smashup/__tests__/*`
- Runtime impact: 无（本提案仅定义审查与交付契约，不改运行时逻辑）
