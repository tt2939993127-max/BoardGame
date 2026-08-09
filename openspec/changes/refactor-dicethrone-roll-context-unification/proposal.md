# Change: DiceThrone 单槽当前骰区重构

## Why
当前 DiceThrone 对“可改骰的掷骰”存在多套并行承载：

- 主掷骰阶段使用 `core.dice`
- 少数奖励骰使用 `pendingBonusDiceSettlement`
- 另一批技能 / 卡牌 / 状态效果额外掷骰直接走 `displayOnly` 展示并在同批事件里自动结算

这导致规则语义被拆散：通用改骰卡、被动重掷、战术家“任意时刻”能力、目标掷骰、闪避投骰、奖励骰、对掷 / 比骰等都无法稳定复用同一套“当前骰子”判断。按本轮规则口径，规则上可修改的骰子不应因为来源不同而被降级成展示链。

本 change 合并原 `refactor-dicethrone-roll-context-unification` 与 `refactor-dicethrone-extra-dice-unification` 两条重复提案，统一落点为本 change；旧的 `dicethrone-dice-resolution` 内容已并入 `dicethrone-roll-context`。

## What Changes
- 为 DiceThrone 增加单一“当前骰区 / 当前骰子上下文（current roll context）”建模，覆盖：
  - 进攻掷骰
  - 防御掷骰
  - 目标掷骰
  - 技能 / 卡牌 / 状态效果产生的额外掷骰
  - 奖励骰组
  - 闪避投骰
  - 对掷 / 比骰
- 强制不变量：当前骰区是单槽寄存器，任一时刻只有一个当前可操作骰子结果。不存在“主骰当前、奖励骰也当前、展示骰再当前”的并行状态。
- 若后续效果又产生新的掷骰，新投掷会覆盖当前骰区；旧骰子不再可作为当前骰子被修改。若旧骰面仍要参与后续结算，必须在覆盖前提交为结算输入 / 快照。
- 覆盖后的旧骰子不再是当前骰子；除非规则另有明确效果，系统不得为内部覆盖记录新增玩家恢复按钮、命令或第三种结算流程。
- 让通用改骰入口（修改、重掷、被动、响应窗口中的掷骰类卡牌）统一针对当前骰子上下文，而不是只针对 `core.dice`。
- 将 `displayOnly` 职责收敛为不可干预结果回放、已结算结果展示或纯汇总说明，不再承载未完成的规则结算。
- 显式建模 Ultimate 成功发动后的结算锁：成功发动 Ultimate 后，其结算中规则不允许修改的骰子必须被当前骰子策略拒绝。
- 用上下文策略矩阵统一所有权、目标、队友 / 对手干预、多人目标归属、是否阻塞阶段推进。

## Impact
- Affected specs:
  - `dicethrone-roll-context`
- Superseded change:
  - `refactor-dicethrone-extra-dice-unification`
- Affected code:
  - `src/games/dicethrone/domain/core-types.ts`
  - `src/games/dicethrone/domain/rules.ts`
  - `src/games/dicethrone/domain/effects.ts`
  - `src/games/dicethrone/domain/execute.ts`
  - `src/games/dicethrone/domain/executeTokens.ts`
  - `src/games/dicethrone/domain/tokenResponse.ts`
  - `src/games/dicethrone/domain/reducer.ts`
  - `src/games/dicethrone/domain/commandValidation.ts`
  - `src/games/dicethrone/domain/passiveAbility.ts`
  - `src/games/dicethrone/domain/customActions/common.ts`
  - `src/games/dicethrone/domain/customActions/*`
  - `src/games/dicethrone/domain/flowHooks.ts`
  - `src/games/dicethrone/domain/systems.ts`
  - `src/games/dicethrone/Board.tsx`
  - `src/games/dicethrone/ui/DiceTray.tsx`
  - `src/games/dicethrone/ui/BonusDieOverlay.tsx`
  - `src/games/dicethrone/ui/BoardOverlays.tsx`
  - `src/games/dicethrone/hooks/useCardSpotlight.ts`
  - `src/games/dicethrone/ai.ts`
  - DiceThrone 相关 Vitest / Playwright / evidence 文档
