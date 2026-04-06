# Change: 增加 board-shell 通用移动端战场拖拽放大能力

## Why

当前移动端 `board-shell` 复杂棋盘主要依赖外层适配和单卡 magnify，缺少“在真实战场上双指缩放并拖拽平移”的通用能力。用户需求明确要求这是一项可复用框架能力，而不是某个游戏单独做一层额外放大 UI。

## What Changes

- 为 `board-shell` 游戏新增可选的通用“战场双指缩放 + 拖拽平移”能力。
- 新增 manifest 显式字段，区分：
  - 不启用通用战场缩放
  - 使用壳层通用 `pinch + pan`
  - 游戏自己拥有整块棋盘/战场放大能力，框架不接管
- 约束该能力只作用于 `MobileBoardShell` 的主画布区域，不作用于顶部 HUD、侧栏、底部 rail。
- 规定通用能力是“补充可视导航”，不能成为完成主操作的前置条件。
- 以 `smashup` 作为首个接入游戏；其余游戏仅在完成交互审查后再按 manifest 显式启用。

## Impact

- Affected specs:
  - `mobile-support-framework`
  - `mobile-adaptive`
  - `game-registry`
- Affected code:
  - `src/games/manifest.types.ts`
  - `src/games/mobileSupport.ts`
  - `src/components/game/framework/MobileBoardShell.tsx`
  - `src/pages/MatchRoom.tsx`
  - `src/pages/LocalMatchRoom.tsx`
  - `src/games/__tests__/mobileSupport.test.ts`
  - `src/components/game/framework/__tests__/MobileBoardShell.test.tsx`
  - 首批接入游戏的 `manifest.ts` 与对应 E2E
