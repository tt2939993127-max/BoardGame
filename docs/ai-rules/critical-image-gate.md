# CriticalImageGate 使用规则

> 触发条件：修改 `CriticalImageGate`、调整对局首屏加载链路、排查“刷新进入对局很慢”时必读。

## 两种模式

- `blockRendering={true}`：默认模式。关键图片没准备好时阻塞棋盘渲染，适合教程、强引导、必须避免首帧资源切换抖动的场景。
- `blockRendering={false}`：后台预加载模式。棋盘先渲染，关键图片继续在后台加载，适合联机对局刷新和重连后的快速回到棋盘。

## 使用约束

- 联机对局刷新优先使用 `blockRendering={false}`，避免 `/game` 状态同步完成后又被关键图片二次卡住。
- 教程模式保留 `blockRendering={true}`，因为教程首步、资源切阶段和引导浮层经常互相依赖，不适合先放开棋盘再补资源。
- `blockRendering={false}` 不等于关闭预加载。`CriticalImageGate` 仍应继续执行 `preloadCriticalImages` / `preloadWarmImages`，只是不要再用 `LoadingScreen` 挡住棋盘。
- 如果某个游戏的首屏组件依赖“图片一定先进入预加载缓存”，先补组件兜底，再考虑把该场景改成阻塞模式；不要把整个联机链路重新改回全阻塞。

## 变更落点

- `src/components/game/framework/CriticalImageGate.tsx`：提供 `blockRendering` 能力。
- `src/pages/MatchRoom.tsx`：联机模式使用后台预加载，教程模式继续阻塞。
