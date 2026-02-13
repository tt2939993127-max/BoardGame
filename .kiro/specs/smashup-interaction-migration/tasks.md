# Smash Up Prompt 系统迁移到 InteractionSystem - 任务列表

## 概述

本任务列表将 Smash Up 游戏的自定义 Prompt 系统迁移到引擎标准的 InteractionSystem。迁移分为 6 个阶段，每个阶段包含具体的编码任务和测试验证。

## 任务

### 阶段 1：基础设施准备

- [x] 1. 修改核心类型定义
  - [x] 1.1 修改 AbilityExecuteContext 接口
    - 在 `src/games/smashup/domain/types.ts` 或相关文件中找到 `AbilityExecuteContext` 定义
    - 添加 `matchState: MatchState<SmashUpCore>` 字段
    - 更新所有使用该接口的代码
    - _Requirements: 3.3_
  
  - [x] 1.2 修改 AbilityExecuteResult 接口
    - 添加 `matchState?: MatchState<SmashUpCore>` 可选字段
    - 更新返回该类型的函数签名
    - _Requirements: 3.3_

- [x] 2. 创建交互处理函数注册表
  - [x] 2.1 创建 abilityInteractionHandlers.ts
    - 在 `src/games/smashup/domain/` 创建新文件
    - 定义 `InteractionHandler` 类型
    - 实现 `registerInteractionHandler()` 函数
    - 实现 `getInteractionHandler()` 函数
    - 实现 `clearInteractionHandlers()` 函数（测试用）
    - _Requirements: 3.2_
  
  - [ ]* 2.2 为注册表编写单元测试
    - 测试注册和查找功能
    - 测试重复注册行为
    - 测试清空功能
    - _Requirements: 3.2_

- [x] 3. 简化 SmashUpEventSystem
  - [x] 3.1 移除 CHOICE_REQUESTED 监听逻辑
    - 在 `src/games/smashup/domain/systems.ts` 中移除监听 `CHOICE_REQUESTED` 的代码
    - 保留 `SYS_INTERACTION_RESOLVED` 监听逻辑
    - 修改为使用 `getInteractionHandler()` 分发
    - _Requirements: 3.1_
  
  - [x] 3.2 移除 SmashUpContinuationData 接口
    - 删除 `SmashUpContinuationData` 接口定义
    - 移除相关的类型引用
    - _Requirements: 3.1_

- [x] 4. 更新命令执行流程
  - [x] 4.1 修改 execute.ts 以支持 matchState 传递
    - 在 `src/games/smashup/domain/execute.ts` 中更新能力执行上下文创建
    - 添加 `matchState` 字段到 context
    - 处理能力执行器返回的 `matchState` 更新
    - _Requirements: 3.3_
  
  - [ ]* 4.2 为命令执行流程编写测试
    - 测试 matchState 正确传递
    - 测试 matchState 更新正确应用
    - _Requirements: 3.3_

- [x] 5. Checkpoint - 基础设施验证
  - 确保所有 TypeScript 编译通过
  - 确保所有新增测试通过
  - 询问用户是否有问题

### 阶段 2：核心派系能力迁移

- [x] 6. 迁移僵尸派系（Zombies）
  - [x] 6.1 重构僵尸能力执行器
    - 打开 `src/games/smashup/abilities/zombies.ts`
    - 找到所有生成 `CHOICE_REQUESTED` 事件的能力
    - 重构为直接调用 `createSimpleChoice()` 和 `queueInteraction()`
    - 更新返回类型为 `AbilityExecuteResult`
    - _Requirements: 3.2_
    - ⚠️ 注意：触发器相关的 `theyre_coming_to_get_you` 和 `tenacious_z` 仍使用 `requestChoice`（有 TODO 标记）
  
  - [x] 6.2 注册僵尸交互解决处理函数
    - 将原 `registerPromptContinuation` 调用改为 `registerInteractionHandler`
    - 内联继续逻辑到处理函数中
    - 确保 sourceId 匹配
    - _Requirements: 3.2_
  
  - [ ]* 6.3 更新僵尸能力测试
    - 更新 `src/games/smashup/__tests__/zombieWizardAbilities.test.ts`
    - 修改测试以验证 Interaction 创建而非 `CHOICE_REQUESTED` 事件
    - 确保所有测试通过
    - _Requirements: 8.2_

- [x] 7. 迁移巫师派系（Wizards）
  - [x] 7.1 重构巫师能力执行器
    - 打开 `src/games/smashup/abilities/wizards.ts`
    - 重构所有需要交互的能力
    - 更新返回类型
    - _Requirements: 3.2_
  
  - [x] 7.2 注册巫师交互解决处理函数
    - 替换 `registerPromptContinuation` 为 `registerInteractionHandler`
    - 内联继续逻辑
    - _Requirements: 3.2_
  
  - [ ]* 7.3 更新巫师能力测试
    - 更新测试文件
    - 确保所有测试通过
    - _Requirements: 8.2_

- [x] 8. 迁移海盗派系（Pirates）
  - [x] 8.1 重构海盗能力执行器
    - 打开 `src/games/smashup/abilities/pirates.ts`
    - 重构所有需要交互的能力（包括多步交互如 Cannon）
    - 更新返回类型
    - _Requirements: 3.2_
  
  - [x] 8.2 注册海盗交互解决处理函数
    - 替换 `registerPromptContinuation` 为 `registerInteractionHandler`
    - 处理多步交互的上下文传递
    - _Requirements: 3.2_
  
  - [ ]* 8.3 更新海盗能力测试
    - 更新测试文件
    - 特别关注多步交互测试
    - _Requirements: 8.2_

- [x] 9. Checkpoint - 核心派系验证
  - 运行所有僵尸、巫师、海盗派系的测试
  - 确保所有测试通过
  - 询问用户是否有问题

### 阶段 3：扩展派系能力迁移

- [x] 10. 迁移忍者派系（Ninjas）
  - [x] 10.1 重构忍者能力执行器
    - 打开 `src/games/smashup/abilities/ninjas.ts`
    - 重构所有需要交互的能力
    - _Requirements: 3.2_
  
  - [x] 10.2 注册忍者交互解决处理函数
    - 替换注册方式
    - _Requirements: 3.2_
  
  - [ ]* 10.3 更新忍者能力测试
    - _Requirements: 8.2_

- [x] 11. 迁移机器人派系（Robots）
  - [x] 11.1 重构机器人能力执行器
    - 打开 `src/games/smashup/abilities/robots.ts`
    - 重构所有需要交互的能力
    - _Requirements: 3.2_
  
  - [x] 11.2 注册机器人交互解决处理函数
    - 替换注册方式
    - _Requirements: 3.2_
  
  - [ ]* 11.3 更新机器人能力测试
    - _Requirements: 8.2_

- [x] 12. 迁移外星人派系（Aliens）
  - [x] 12.1 重构外星人能力执行器
    - 打开 `src/games/smashup/abilities/aliens.ts`
    - 重构所有需要交互的能力
    - _Requirements: 3.2_
  
  - [x] 12.2 注册外星人交互解决处理函数
    - 替换注册方式
    - _Requirements: 3.2_
  
  - [ ]* 12.3 更新外星人能力测试
    - _Requirements: 8.2_

- [x] 13. 迁移恐龙派系（Dinosaurs）
  - [x] 13.1 重构恐龙能力执行器
    - 打开 `src/games/smashup/abilities/dinosaurs.ts`
    - 重构所有需要交互的能力
    - _Requirements: 3.2_
  
  - [x] 13.2 注册恐龙交互解决处理函数
    - 替换注册方式
    - _Requirements: 3.2_
  
  - [ ]* 13.3 更新恐龙能力测试
    - _Requirements: 8.2_

- [x] 14. 迁移骗术师派系（Tricksters）
  - [x] 14.1 重构骗术师能力执行器
    - 打开 `src/games/smashup/abilities/tricksters.ts`
    - 重构所有需要交互的能力
    - _Requirements: 3.2_
  
  - [x] 14.2 注册骗术师交互解决处理函数
    - 替换注册方式
    - _Requirements: 3.2_
  
  - [ ]* 14.3 更新骗术师能力测试
    - _Requirements: 8.2_

- [x] 15. 迁移蒸汽朋克派系（Steampunks）
  - [x] 15.1 重构蒸汽朋克能力执行器
    - 打开 `src/games/smashup/abilities/steampunks.ts`
    - 重构所有需要交互的能力
    - _Requirements: 3.2_
  
  - [x] 15.2 注册蒸汽朋克交互解决处理函数
    - 替换注册方式
    - _Requirements: 3.2_
  
  - [ ]* 15.3 更新蒸汽朋克能力测试
    - _Requirements: 8.2_

- [x] 16. 迁移植物派系（Plants → killer_plants.ts）
  - [x] 16.1 重构植物能力执行器
    - 打开 `src/games/smashup/abilities/killer_plants.ts`
    - 重构所有需要交互的能力
    - _Requirements: 3.2_
  
  - [x] 16.2 注册植物交互解决处理函数
    - 替换注册方式
    - _Requirements: 3.2_
  
  - [ ]* 16.3 更新植物能力测试
    - _Requirements: 8.2_

- [N/A] 17. 迁移极客派系（Geeks）
  - 该派系文件不存在，跳过

- [N/A] 18. 迁移 Query6 能力
  - query6.ts 无交互能力，无需迁移

- [x] 18.5 迁移额外派系（任务列表外新增）
  - [x] 迁移幽灵派系（Ghosts）— `ghosts.ts`
  - [x] 迁移黑熊骑兵派系（Bear Cavalry）— `bear_cavalry.ts`

- [x] 19. Checkpoint - 扩展派系验证

### 阶段 4：克苏鲁扩展迁移

- [x] 20. 迁移克苏鲁派系（Cthulhu）
  - [x] 20.1 重构克苏鲁能力执行器
    - 打开 `src/games/smashup/abilities/cthulhu.ts`
    - 重构所有需要交互的能力
    - _Requirements: 3.2_
  
  - [x] 20.2 注册克苏鲁交互解决处理函数
    - 替换注册方式
    - _Requirements: 3.2_
  
  - [ ]* 20.3 更新克苏鲁能力测试
    - _Requirements: 8.2_

- [x] 21. 迁移远古之物派系（Elder Things）
  - [x] 21.1 重构远古之物能力执行器
    - 打开 `src/games/smashup/abilities/elder_things.ts`
    - 重构所有需要交互的能力
    - _Requirements: 3.2_
  
  - [x] 21.2 注册远古之物交互解决处理函数
    - 替换注册方式
    - _Requirements: 3.2_
  
  - [ ]* 21.3 更新远古之物能力测试
    - _Requirements: 8.2_

- [x] 22. 迁移印斯茅斯派系（Innsmouth）
  - [x] 22.1 重构印斯茅斯能力执行器
    - 打开 `src/games/smashup/abilities/innsmouth.ts`
    - 重构所有需要交互的能力
    - _Requirements: 3.2_
  
  - [x] 22.2 注册印斯茅斯交互解决处理函数
    - 替换注册方式
    - _Requirements: 3.2_
  
  - [ ]* 22.3 更新印斯茅斯能力测试
    - _Requirements: 8.2_

- [x] 23. 迁移密斯卡托尼克大学派系（Miskatonic University）
  - [x] 23.1 重构密大能力执行器
    - 打开 `src/games/smashup/abilities/miskatonic.ts`
    - 重构所有需要交互的能力
    - _Requirements: 3.2_
  
  - [x] 23.2 注册密大交互解决处理函数
    - 替换注册方式
    - _Requirements: 3.2_
  
  - [ ]* 23.3 更新密大能力测试
    - _Requirements: 8.2_

- [N/A] 24. 迁移天赋能力（Talents）
  - talents.ts 无交互能力，无需迁移

- [x] 25. Checkpoint - 克苏鲁扩展验证

### 阶段 5：基地能力迁移

- [x] 26. 迁移基础基地能力
  - [x] 26.1 重构基础基地能力执行器
    - 打开 `src/games/smashup/domain/baseAbilities.ts`
    - 重构所有需要交互的基地能力
    - _Requirements: 3.2_
  
  - [x] 26.2 注册基础基地交互解决处理函数
    - 替换注册方式
    - _Requirements: 3.2_
  
  - [ ]* 26.3 更新基础基地能力测试
    - _Requirements: 8.2_

- [x] 27. 迁移扩展基地能力
  - [x] 27.1 重构扩展基地能力执行器
    - 打开 `src/games/smashup/domain/baseAbilities_expansion.ts`
    - 重构所有需要交互的扩展基地能力
    - _Requirements: 3.2_
  
  - [x] 27.2 注册扩展基地交互解决处理函数
    - 替换注册方式
    - _Requirements: 3.2_
  
  - [ ]* 27.3 更新扩展基地能力测试
    - _Requirements: 8.2_

- [x] 28. Checkpoint - 基地能力验证

### 阶段 6：清理和最终验证

- [ ] 29. 移除废弃代码
  - [ ] 29.1 删除 promptContinuation.ts
    - 删除 `src/games/smashup/domain/promptContinuation.ts` 文件
    - 移除所有对该文件的 import 引用（13+ 个测试文件仍在引用）
    - _Requirements: 3.1, 8.1_
  
  - [ ] 29.2 移除 CHOICE_REQUESTED 事件定义
    - 在 `src/games/smashup/domain/types.ts` 中删除 `SU_EVENTS.CHOICE_REQUESTED` 常量
    - 删除 `ChoiceRequestedEvent` 接口
    - 移除相关的类型导出
    - _Requirements: 3.1, 8.1_
  
  - [x] 29.3 完全移除 systems.ts 中的桥接逻辑
    - 移除所有与 `CHOICE_REQUESTED` 相关的代码（已在 Phase 1 完成）
    - 简化事件处理逻辑
    - 确保只保留 `SYS_INTERACTION_RESOLVED` 的分发逻辑
    - _Requirements: 3.1, 8.1_

- [ ] 30. 更新辅助函数
  - [ ] 30.1 重构 abilityHelpers.ts
    - 移除或重构 `requestChoice()` 函数
    - ⚠️ zombies.ts 触发器仍依赖 `requestChoice`（有 TODO 标记）
    - 如果保留，改为返回 `InteractionDescriptor` 而非事件
    - 更新所有使用该函数的代码
    - _Requirements: 3.2_

- [ ] 31. 运行完整测试套件
  - [ ]* 31.1 运行所有单元测试
    - 执行 `npm test`
    - 确保所有测试通过
    - _Requirements: 8.2_
  
  - [ ]* 31.2 运行集成测试
    - 执行端到端测试
    - 验证完整的交互流程
    - _Requirements: 8.2_
  
  - [ ]* 31.3 运行 property-based 测试
    - **Property 1: 能力直接使用 InteractionSystem API**
    - **Validates: Requirements 3.2, 8.1**
    - 验证所有需要交互的能力都使用 `createSimpleChoice` 和 `queueInteraction`
    - _Requirements: 3.2, 8.1_
  
  - [ ]* 31.4 运行 property-based 测试
    - **Property 2: 不再使用 promptContinuation 注册表**
    - **Validates: Requirements 3.2**
    - 验证代码中不存在 `registerPromptContinuation` 调用
    - _Requirements: 3.2_
  
  - [ ]* 31.5 运行 property-based 测试
    - **Property 3: 交互流程功能完整性**
    - **Validates: Requirements 8.2**
    - 对每个交互能力验证完整流程：创建 → 响应 → 解决 → 最终状态
    - _Requirements: 8.2_

- [ ] 32. 代码质量检查
  - [ ] 32.1 TypeScript 编译检查
    - 运行 `npm run build` 或 `tsc --noEmit`
    - 确保没有编译错误
    - _Requirements: 8.1_
  
  - [ ] 32.2 ESLint 检查
    - 运行 `npm run lint`
    - 修复所有 lint 错误和警告
    - _Requirements: 8.1_
  
  - [ ] 32.3 代码审查
    - 检查代码注释是否清晰
    - 验证命名一致性
    - 确保符合项目编码规范
    - _Requirements: 8.3_

- [ ] 33. 更新文档
  - [ ] 33.1 更新代码注释
    - 为新增的函数和接口添加注释
    - 更新修改过的函数注释
    - 说明设计决策
    - _Requirements: 8.3_
  
  - [ ] 33.2 更新相关文档
    - 如果有开发者文档，更新交互系统使用说明
    - 记录迁移过程中的关键决策
    - _Requirements: 8.3_

- [ ] 34. 最终验证
  - 运行所有测试，确保 100% 通过
  - 手动测试几个关键的交互能力
  - 验证性能没有明显退化
  - 确认代码行数减少（预期减少 100+ 行）
  - 询问用户是否满意，是否需要进一步调整

## 注意事项

- 标记 `*` 的任务为可选测试任务，可以根据时间和需求决定是否执行
- 每个 Checkpoint 任务都应该暂停并询问用户，确保没有问题再继续
- 如果某个派系的能力特别复杂，可以拆分为更小的子任务
- 保持频繁的 Git commit，每完成一个派系就提交一次
- 如果遇到问题，及时记录并与用户沟通

## 预期成果

- 移除约 100+ 行桥接代码
- 所有能力直接使用 InteractionSystem
- 所有测试通过
- 代码更简洁、更易维护
- 符合引擎规范，与其他游戏一致
