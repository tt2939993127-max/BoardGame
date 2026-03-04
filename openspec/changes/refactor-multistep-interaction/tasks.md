# 实现计划：多步交互模型重构

## Tasks

- [ ] 1. 引擎层：定义 MultistepChoiceData 类型
  - [ ] 1.1 在 `InteractionSystem.ts` 中新增 `MultistepChoiceData` 接口和 `createMultistepChoice` 工厂函数
  - [ ] 1.2 新增 `asMultistepChoice` UI 辅助函数

- [ ] 2. 引擎层：创建 MultistepChoiceSystem
  - [ ] 2.1 新建 `src/engine/systems/MultistepChoiceSystem.ts`
    - `beforeCommand`：`multistep-choice` 交互时阻塞该玩家的非系统命令
    - priority: 22（在 SimpleChoiceSystem(21) 之后）
  - [ ] 2.2 在 `src/engine/systems/index.ts` 导出
  - [ ] 2.3 各游戏 `game.ts` 的 systems 数组中添加 `createMultistepChoiceSystem()`

- [ ] 3. 引擎层：创建 useMultistepInteraction Hook
  - [ ] 3.1 新建 `src/engine/systems/useMultistepInteraction.ts`
    - 管理 `result` / `stepCount` 本地状态
    - `step()` 调用 `localReducer`，达到 `maxSteps` 时自动 confirm
    - `confirm()` 调用 `toCommands()` 生成命令列表并依次 dispatch
    - `cancel()` dispatch `SYS_INTERACTION_CANCEL`
    - 交互 ID 变化时重置本地状态

- [ ] 4. Checkpoint — 引擎层测试
  - [ ] 4.1 MultistepChoiceSystem 单元测试（阻塞行为）
  - [ ] 4.2 useMultistepInteraction Hook 单元测试（step/confirm/cancel/autoConfirm）

- [ ] 5. DiceThrone：迁移骰子修改交互
  - [ ] 5.1 `systems.ts`：骰子修改类 `INTERACTION_REQUESTED` 改为创建 `multistep-choice`
    - 定义 `DiceModifyResult` 类型和 `diceModifyReducer`
    - 定义 `diceModifyToCommands` 转换函数
    - 删除 `_diceModCount` 计数器和 `DIE_MODIFIED`/`DIE_REROLLED` 自动完成逻辑
  - [ ] 5.2 `DiceTray.tsx` + `DiceActions`：改用 `useMultistepInteraction`
    - 删除 `selectedDice`/`modifiedDice`/`totalAdjustment`/`pendingDieValues` props
    - 所有模式统一为 step() → 本地预览 → confirm()
  - [ ] 5.3 `RightSidebar.tsx`：删除骰子交互本地状态（4 个 useState + useEffect）

- [ ] 6. DiceThrone：迁移 selectDie（重掷）交互
  - [ ] 6.1 `systems.ts`：selectDie 类 `INTERACTION_REQUESTED` 改为创建 `multistep-choice`
    - 定义 `DiceSelectResult` 类型和 `diceSelectReducer`
    - 定义 `diceSelectToCommands`（生成 REROLL_DIE 命令列表）
  - [ ] 6.2 `DiceTray.tsx`：selectDie 模式改用 `useMultistepInteraction`

- [ ] 7. Checkpoint — DiceThrone 测试
  - [ ] 7.1 运行 DiceThrone 全量测试确认无回归
  - [ ] 7.2 运行引擎层全量测试
  - [ ] 7.3 运行 SmashUp / SummonerWars 测试确认零影响

- [ ] 8. 清理
  - [ ] 8.1 删除 `DiceTray.tsx` 中不再使用的 props 和逻辑
  - [ ] 8.2 确认 `dt:card-interaction` 仅用于状态选择类交互（非骰子）
  - [ ] 8.3 ESLint 检查所有修改文件

## Notes

- 中间步骤纯本地，不经过 pipeline，不发网络请求
- 确认时 `toCommands()` 生成的命令列表依次 dispatch，复用现有命令类型
- `dt:card-interaction` 保留用于状态选择类交互（selectStatus/selectPlayer/selectTargetStatus）
- `dt:token-response` / `dt:bonus-dice` 不在本次重构范围
