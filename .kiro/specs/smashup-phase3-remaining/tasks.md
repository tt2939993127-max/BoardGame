# 实现计划：Smash Up Phase 3 剩余能力

## 概述

按优先级分组实现所有剩余 TODO 项。先完成无 UI 阻塞的领域层能力，再实现需要 UI 的卡牌展示系统，最后处理被动保护类和终局规则。每个任务包含实现 + 测试，确保增量可验证。

## 任务

- [x] 1. Complete the Ritual 放牌库底修正
  - [x] 1.1 修改 `cthulhuCompleteTheRitualTrigger`，将随从的 `MINION_RETURNED` 事件替换为 `CARD_TO_DECK_BOTTOM` 事件，将 ongoing 行动卡的 `ONGOING_DETACHED` 事件替换为 `CARD_TO_DECK_BOTTOM` 事件
    - 文件：`src/games/smashup/abilities/cthulhu.ts`
    - 删除旧 TODO 注释
    - _Requirements: 4.1, 4.2_
  - [ ]* 1.2 更新现有 Complete the Ritual 测试，验证事件类型为 CARD_TO_DECK_BOTTOM
    - 文件：`src/games/smashup/__tests__/cthulhuExpansionAbilities.test.ts` 或 `newOngoingAbilities.test.ts`
    - 测试：触发后所有随从和 ongoing 产生 CARD_TO_DECK_BOTTOM 事件
    - **Property 7: Complete the Ritual 放牌库底**
    - **Validates: Requirements 4.1, 4.2**

- [x] 2. 母星力量≤2 校验
  - [x] 2.1 在 `baseAbilities.ts` 中为 `base_the_homeworld` 增加力量≤2 限制校验
    - 方案：通过 `registerRestriction` 或在 `BaseCardDef.restrictions` 数据中配置 `minionPowerLimit: 2`
    - 删除旧 TODO 注释
    - _Requirements: 3.1, 3.2, 3.3_
  - [ ]* 2.2 编写母星力量校验测试
    - 测试：力量≤2 允许、力量>2 拒绝
    - **Property 6: 力量≤2 出牌限制**
    - **Validates: Requirements 3.2, 3.3**

- [x] 3. Checkpoint - 确保所有测试通过
  - 确保所有测试通过，ask the user if questions arise.

- [x] 4. Full Sail 多步移动验证与测试
  - [x] 4.1 验证 `pirateFullSail` + `buildFullSailChooseMinionPrompt` + 两个 continuation 的完整性，修复任何遗漏
    - 文件：`src/games/smashup/abilities/pirates.ts`
    - 确认 `movedUids` 正确传递和累积
    - 确认 `done` 选项正确终止流程
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6_
  - [ ]* 4.2 编写 Full Sail 测试
    - 文件：`src/games/smashup/__tests__/pirateFullSail.test.ts`
    - 测试：移动1个随从、移动多个随从、选择完成、无随从时空事件
    - **Property 1: Full Sail 随从收集正确性**
    - **Property 2: Full Sail 继续链正确性**
    - **Validates: Requirements 1.1, 1.2, 1.3, 1.6**

- [x] 5. Furthering the Cause 精确触发验证
  - [x] 5.1 验证 `cthulhuFurtheringTheCauseTrigger` 已正确使用 `turnDestroyedMinions`，验证 reducer 中 MINION_DESTROYED 追踪和 TURN_CHANGED 清空逻辑
    - 文件：`src/games/smashup/abilities/cthulhu.ts`、`src/games/smashup/domain/reducer.ts`
    - 确认现有实现已完整（根据代码审查，已实现）
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5_
  - [ ]* 5.2 补充 Furthering the Cause 属性测试
    - **Property 3: Furthering the Cause VP 判定**
    - **Property 4: turnDestroyedMinions 追踪**
    - **Property 5: turnDestroyedMinions 回合清空**
    - **Validates: Requirements 2.1, 2.2, 2.3**

- [-] 6. 基础版剩余基地能力 Prompt 化
  - [x] 6.1 实现海盗湾（base_pirate_cove）afterScoring 能力：为非冠军玩家生成移动随从 Prompt + continuation
    - 文件：`src/games/smashup/domain/baseAbilities.ts`
    - _Requirements: 5a.1, 5a.2, 5a.3_
  - [x] 6.2 实现托尔图加（base_tortuga）afterScoring 能力：为亚军生成移动随从到替换基地 Prompt + continuation
    - 文件：`src/games/smashup/domain/baseAbilities.ts`
    - _Requirements: 5b.4, 5b.5, 5b.6_
  - [x] 6.3 实现巫师学院（base_wizard_academy）afterScoring 能力：冠军查看基地牌库顶3张并排列 Prompt + continuation
    - 文件：`src/games/smashup/domain/baseAbilities.ts`
    - _Requirements: 5c.7, 5c.8_
  - [x] 6.4 实现蘑菇王国（base_mushroom_kingdom）onTurnStart 能力：选择对手随从移动到蘑菇王国 Prompt + continuation
    - 文件：`src/games/smashup/domain/baseAbilities.ts`
    - _Requirements: 5d.9, 5d.10, 5d.11_
  - [ ]* 6.5 编写基础版基地能力测试
    - 文件：`src/games/smashup/__tests__/newBaseAbilities.test.ts`
    - 覆盖：海盗湾/托尔图加/巫师学院/蘑菇王国的正常路径+跳过路径
    - **Property 8: 海盗湾非冠军 Prompt 生成**
    - **Property 9: 蘑菇王国对手随从列表**
    - **Validates: Requirements 5a.1, 5d.9**

- [x] 7. Checkpoint - 确保所有测试通过
  - 确保所有测试通过，ask the user if questions arise.

- [x] 8. 克苏鲁扩展基地能力
  - [x] 8.1 创建 `domain/baseAbilities_expansion.ts`，导出 `registerExpansionBaseAbilities()` 和 `registerExpansionBasePromptContinuations()`
    - 在 `baseAbilities.ts` 的 `registerBaseAbilities()` 末尾调用
    - _Requirements: 6a-6d, 7a-7c, 8a-8e_
  - [x] 8.2 实现疯人院（base_the_asylum）onMinionPlayed 能力：选择返回疯狂卡 Prompt + continuation
    - _Requirements: 6a.1, 6a.2, 6a.3_
  - [x] 8.3 实现印斯茅斯基地（base_innsmouth_base）onMinionPlayed 能力：选择弃牌堆卡放牌库底 Prompt + continuation
    - _Requirements: 6b.4, 6b.5, 6b.6_
  - [x] 8.4 实现密大基地（base_miskatonic_university_base）afterScoring 能力：有随从的玩家返回疯狂卡 Prompt + continuation
    - _Requirements: 6c.7, 6c.8_
  - [x] 8.5 实现冷原高地（base_plateau_of_leng）onMinionPlayed 能力：检查手牌同名随从并生成打出 Prompt + continuation
    - _Requirements: 6d.9, 6d.10, 6d.11_
  - [ ]* 8.6 编写克苏鲁扩展基地测试
    - 文件：`src/games/smashup/__tests__/expansionBaseAbilities.test.ts`
    - 覆盖：疯人院/印斯茅斯/密大基地/冷原高地的正常路径+跳过路径+边界情况

- [x] 9. AL9000 扩展基地能力
  - [x] 9.1 实现温室（base_greenhouse）afterScoring 能力：冠军搜牌库选随从打出到新基地 Prompt + continuation
    - 文件：`domain/baseAbilities_expansion.ts`
    - _Requirements: 7a.1, 7a.2, 7a.3_
  - [x] 9.2 实现神秘花园（base_secret_garden）onTurnStart 能力：授予额外出牌机会 + 力量≤2 限制（复用母星校验模式）
    - _Requirements: 7b.4, 7b.5_
  - [x] 9.3 实现发明家沙龙（base_inventors_salon）afterScoring 能力：冠军从弃牌堆选行动卡放入手牌 Prompt + continuation
    - _Requirements: 7c.6, 7c.7_
  - [ ]* 9.4 编写 AL9000 扩展基地测试
    - 覆盖：温室/神秘花园/发明家沙龙

- [x] 10. Pretty Pretty 扩展基地能力
  - [x] 10.1 实现诡猫巷（base_cat_fanciers_alley）talent 能力：消灭己方随从抽卡 Prompt + continuation（每回合一次）
    - 文件：`domain/baseAbilities_expansion.ts`
    - _Requirements: 8a.1, 8a.2, 8a.3_
  - [x] 10.2 实现九命之屋（base_house_of_nine_lives）interceptor：拦截 MINION_DESTROYED 提供移动选项
    - 通过 `registerInterceptor` 注册
    - _Requirements: 8b.4, 8b.5, 8b.6_
  - [x] 10.3 实现魔法林地（base_enchanted_glade）onActionPlayed 能力：附着行动到随从后抽1卡
    - _Requirements: 8c.7_
  - [x] 10.4 实现仙灵之环（base_fairy_ring）onMinionPlayed 能力：首次打出随从后授予额外出牌机会
    - _Requirements: 8d.8_
  - [x] 10.5 实现平衡之地（base_land_of_balance）onMinionPlayed 能力：选择移动己方其他基地随从 Prompt + continuation
    - _Requirements: 8e.9, 8e.10, 8e.11_
  - [ ]* 10.6 编写 Pretty Pretty 扩展基地测试
    - 覆盖：诡猫巷/九命之屋/魔法林地/仙灵之环/平衡之地
    - **Property 10: 九命之屋拦截**
    - **Property 11: 平衡之地其他基地随从列表**
    - **Validates: Requirements 8b.4, 8e.9**

- [x] 11. Checkpoint - 确保所有测试通过
  - 确保所有测试通过，ask the user if questions arise.

- [x] 12. 被动保护类基地能力
  - [x] 12.1 实现美丽城堡（base_beautiful_castle）保护：通过 `registerProtection` 注册力量≥5 随从免疫 affect
    - 文件：`src/games/smashup/domain/ongoingEffects.ts` 或 `baseAbilities_expansion.ts`
    - _Requirements: 9a.1, 9a.2_
  - [x] 12.2 实现小马乐园（base_pony_paradise）保护：通过 `registerProtection` 注册 2+ 随从免疫 destroy
    - _Requirements: 9b.3, 9b.4_
  - [ ]* 12.3 编写被动保护类基地测试
    - **Property 12: 美丽城堡力量≥5 保护**
    - **Property 13: 小马乐园 2+ 随从保护**
    - **Validates: Requirements 9a.1, 9b.3**

- [x] 13. 卡牌展示系统（UI + 领域层）
  - [x] 13.1 在 `domain/types.ts` 新增 `REVEAL_HAND` / `REVEAL_DECK_TOP` 事件类型和 `pendingReveal` 状态字段
    - _Requirements: 10a.1, 10a.2, 10b.3_
  - [x] 13.2 在 `domain/reducer.ts` 新增 REVEAL_HAND / REVEAL_DECK_TOP 事件处理，写入 `pendingReveal`
    - _Requirements: 10a.1, 10a.2_
  - [x] 13.3 在 `domain/index.ts` 的 `playerView` 中过滤 `pendingReveal`（非查看者隐藏卡牌内容）
    - _Requirements: 10a.1_
  - [x] 13.4 实现 Alien Probe 能力：产生 REVEAL_HAND 事件展示对手手牌
    - 文件：`src/games/smashup/abilities/aliens.ts`
    - _Requirements: 10a.1_
  - [x] 13.5 实现 Alien Scout Ship 能力：产生 REVEAL_DECK_TOP 事件展示牌库顶
    - 文件：`src/games/smashup/abilities/aliens.ts`
    - _Requirements: 10a.2_
  - [x] 13.6 修改 Book of Iter 能力：增加 REVEAL_HAND 事件
    - 文件：`src/games/smashup/abilities/miskatonic.ts`
    - _Requirements: 10b.3_
  - [x] 13.7 创建 `ui/CardRevealOverlay.tsx` 组件：横向可滚动卡牌行展示，单张卡牌用特写风格，复用 CardPreview + PromptOverlay 视觉风格
    - 文件：`src/games/smashup/ui/CardRevealOverlay.tsx`
    - _Requirements: 10a.1, 10a.2, 10b.3_
  - [x] 13.8 在 `Board.tsx` 中集成 CardRevealOverlay，读取 `pendingReveal` 状态渲染
    - 文件：`src/games/smashup/Board.tsx`
    - 新增 `dismissReveal` move 清除 `pendingReveal`
    - _Requirements: 10a.1_
  - [ ]* 13.9 编写卡牌展示系统测试
    - 测试：REVEAL_HAND 事件产生、Reducer 写入 pendingReveal、playerView 过滤

- [x] 14. 疯狂卡平局规则
  - [x] 14.1 在 `domain/index.ts` 的 `isGameOver` 中增加疯狂卡平局规则：VP 相同时疯狂卡较少者胜
    - _Requirements: 12.3_
  - [ ]* 14.2 编写疯狂卡平局测试
    - 文件：`src/games/smashup/__tests__/madnessTiebreaker.test.ts`
    - 测试：VP 相同时疯狂卡少的玩家胜、疯狂卡也相同时继续游戏
    - _Requirements: 12.3_

- [x] 15. Full Sail Special 时机标注
  - [x] 15.1 在 `pirates.ts` 中为 Full Sail special 时机添加清晰的 TODO 注释，说明需要 beforeScoring 阶段的 special action 机制
    - 文件：`src/games/smashup/abilities/pirates.ts`
    - 标注 TODO + 清理触发条件（当 special action 机制实现后回填）
    - _Requirements: 11.1, 11.2, 11.3_

- [x] 16. 清理 baseAbilities.ts 中的 TODO 注释列表
  - [x] 16.1 删除 `baseAbilities.ts` 中已实现基地的 TODO 注释，保留未实现的（被动保护类如已实现也删除）
    - 确保注释列表与实际实现状态一致

- [x] 17. Final checkpoint - 确保所有测试通过
  - 确保所有测试通过，ask the user if questions arise.

## 备注

- 标记 `*` 的子任务为可选测试任务，可跳过以加速 MVP
- 每个任务引用具体需求编号以确保可追溯
- Checkpoint 确保增量验证
- 属性测试验证通用正确性属性，单元测试验证具体示例和边界情况
- `baseAbilities.ts` 当前接近行数限制，新增扩展包基地能力拆分到 `baseAbilities_expansion.ts`
