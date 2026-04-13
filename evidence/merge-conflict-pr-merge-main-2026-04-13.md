# 冲突解决汇报：pr-merge-main

## 1. 背景
- base: pr-merge-main
- head: origin/main
- 触发命令: `git merge origin/main --no-commit --no-ff`

## 2. 冲突文件
- src/games/smashup/__tests__/factionAbilities.test.ts

## 3. 解决策略
### src/games/smashup/__tests__/factionAbilities.test.ts
- 策略：合并双方变更（保留主分支新增内容 + 保留分支已有引用）
- 冲突块裁决：
  - Import 冲突：保留 `queueImmediateExtraPlayInteractions` 引入，并合并双方 import 列表
- 合并要点：确保额外回合交互相关 helper 未被静默丢失
- 原因：该 helper 与派系能力交互链路相关，删除会导致测试覆盖与行为缺失

## 4. 风险与验证
- 风险点：额外回合交互链路与测试覆盖变化
- 验证命令：
  - `npx vitest src/games/__tests__/mobileSupport.test.ts`
  - `npx vitest src/games/dicethrone/__tests__/BonusDieOverlay.test.tsx`
  - `npx eslint src/games/mobileSupport.ts e2e/src/games/mobileSupport.ts src/core/ui/portal.tsx e2e/src/core/ui/portal.tsx vitest.setup.ts src/games/dicethrone/__tests__/BonusDieOverlay.test.tsx`（仅警告）
  - `npm run i18n:check`（仅 warning）
- 验证结果：
  - mobileSupport / BonusDieOverlay 单测通过
  - ESLint：仅 warning（react-refresh/only-export-components）
  - i18n:check：1 条动态 key warning（summonerwars CardSelectorOverlay）

## 5. 回归与行为变化登记
- 原 PR 目标问题：同步 origin/main 以继续合并主线 PR
- 本次额外发现的真实回归：
  - mobileSupport 默认值缺失导致 mobileBattlefieldZoom 相关断言失败
  - BonusDieOverlay server renderer 触发 HudPortal 报错
- 仅业务口径 / 规则变化：无

## 6. 结果
- 提交：待补
- 推送：待补
