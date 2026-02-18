# Change: 多步交互模型重构 — InteractionSystem 原生支持中间步骤

## Why

InteractionSystem 只有"一问一答"模型（simple-choice / slider-choice），不支持"多步调整 → 预览 → 最终确认"。DiceThrone 的骰子修改被迫用 3 层绕过：
1. 自定义 kind `dt:card-interaction` 绕过 SimpleChoiceSystem
2. `systems.ts` 手写 `_diceModCount` 计数器判断交互完成
3. UI 层 `pendingDieValues` 本地状态做预览（`any` 模式）
4. `adjust` 模式每次点 +/- 都发网络请求

核心问题：引擎层没有"中间步骤纯本地、确认时一次性提交"的交互模型。

## What Changes

1. 引擎层新增 `multistep-choice` 交互 kind，支持：
   - 中间步骤纯本地（不经过 pipeline，不发网络请求）
   - 确认时生成单一 `SYS_INTERACTION_CONFIRMED` 事件，携带累积结果
   - 取消时恢复初始状态（复用已有 `SYS_INTERACTION_CANCEL`）
2. DiceThrone 骰子修改迁移到 `multistep-choice`：
   - 删除 `pendingDieValues` UI 层补丁
   - 删除 `_diceModCount` 计数器
   - 删除 `adjust` 模式的逐步 dispatch
   - 所有骰子修改模式统一为"本地预览 → 确认提交"
3. **BREAKING**: `dt:card-interaction` 中骰子修改类交互改为 `multistep-choice`

## Impact

- 引擎层：`InteractionSystem.ts`（新增 kind 定义）、新增 `MultistepChoiceSystem.ts`
- DiceThrone：`systems.ts`、`DiceTray.tsx`、`RightSidebar.tsx`、`DiceActions`
- SmashUp / SummonerWars：零影响（不使用多步交互）
