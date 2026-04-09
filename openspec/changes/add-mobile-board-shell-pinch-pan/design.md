## Context

项目现有移动端复杂棋盘主要走 `board-shell`。它能提供统一壳层与 CSS/JS scale fallback，但没有“在真实战场上实时双指缩放 + 拖拽平移”的通用能力。与此同时，不同游戏对放大能力的拥有权并不一致：

- 有的游戏只有单卡 magnify。
- 有的游戏已经有整块棋盘/整块战场 magnify。
- 有的游戏未来可能更适合 `map-shell`，由游戏自己管理地图缩放。

因此，框架层需要一个**显式、可排除、默认保守**的能力模型，而不是“所有 board-shell 游戏自动双指缩放”。

## Goals

- 为 `board-shell` 提供可复用的移动端 `pinch + pan` 框架能力。
- 只缩放主画布，不缩放 HUD / rail / side dock。
- 通过 manifest 显式声明能力归属，避免和已有整块棋盘 magnify 冲突。
- 让 `smashup` 可作为首批接入对象。

## Non-Goals

- 不把整页浏览器缩放当作方案。
- 不把单卡 magnify 替换成通用 `pinch + pan`。
- 不在本变更里强行把所有复杂游戏一口气迁到通用能力。
- 不要求用户“必须先缩放才能玩”；该能力只作为可视导航补充。

## Manifest Contract

新增字段建议：

```ts
type GameMobileBattlefieldZoom = 'none' | 'shell-pinch-pan' | 'game-owned';
```

语义：

- `none`
  - 不启用通用战场缩放。
- `shell-pinch-pan`
  - 游戏使用 `MobileBoardShell` 提供的通用双指缩放 + 拖拽平移。
- `game-owned`
  - 游戏自己拥有整块棋盘/整块战场放大能力；框架不得再叠加通用层。

默认值应为 `none`，避免误把未审查游戏自动纳入。

## Gesture Model

### 1. 作用范围

- 手势层只包裹 `MobileBoardShell` 的 `canvas/content`。
- `topRail`、`sideDock`、`bottomRail` 保持原始尺寸和坐标系。

### 2. 进入条件

- 仅在移动视口、横屏、`mobileLayoutPreset='board-shell'` 且 manifest 为 `shell-pinch-pan` 时启用。
- 必须以双指手势启动缩放。

### 3. 单指行为

- 默认缩放比例为 `1` 时，通用层不得拦截单指操作，点击/长按/拖卡仍由游戏自己处理。
- 当缩放比例 `> 1` 后，允许单指拖拽平移画布。
- 平移应有边界约束，避免把整块棋盘拖出可视区。

### 4. 与游戏交互的关系

- 通用层不重算游戏命中区，也不改游戏点击语义。
- 首要目标是“看清楚和移动视野”，不是改写业务交互。
- 如果某游戏在缩放态下仍出现明显冲突，应回退为 `none` 或改由游戏声明 `game-owned`。

## First-Batch Rollout

### 直接排除

- 已经拥有“整块棋盘/战场放大”能力的游戏：manifest 标为 `game-owned`。

### 可作为首批候选

- 只有单卡 magnify、但没有整块战场 magnify 的 `board-shell` 游戏。
- 当前用户需求上下文下，`smashup` 是首批接入对象。

### 后续逐个评估

- 其他 `board-shell` 游戏先做交互审查，再决定是否切到 `shell-pinch-pan`。

## Risks

- 缩放态下的单指平移可能与游戏内拖拽/长按冲突。
- 已依赖 viewport 坐标的浮层、箭头、选区框，在缩放坐标系下可能错位。
- 如果没有 manifest 显式排除，容易和已有 board magnify 叠加出双套缩放。

## Mitigations

- 缩放为 `1` 时完全放行单指事件。
- 仅在 `shell-pinch-pan` 明确启用时注入手势层。
- 对首批接入游戏做专项 E2E：默认态、缩放态、平移态、HUD 不受影响、原有长按/点击链路不回归。
