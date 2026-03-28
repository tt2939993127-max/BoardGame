# 召唤师战争移动端悬浮球触摸拖拽 E2E 证据

## 测试命令

```bash
npm run typecheck
npm run test:e2e:ci:file -- e2e/summonerwars.e2e.ts "移动横屏：悬浮球短触摸不误拖，长按后仍可拖动且不阻塞结束阶段按钮"
```

结果：

- `typecheck` 通过
- 目标 E2E 用例通过

## 证据截图

### 1. 短触摸不会误拖动

完整路径：

- `D:\gongzuo\webgame\BoardGame\test-results\evidence-screenshots\summonerwars.e2e\移动横屏：悬浮球短触摸不误拖，长按后仍可拖动且不阻塞结束阶段按钮\30-mobile-fab-short-touch-stays-put.png`

截图：

![短触摸不会误拖动](../test-results/evidence-screenshots/summonerwars.e2e/移动横屏：悬浮球短触摸不误拖，长按后仍可拖动且不阻塞结束阶段按钮/30-mobile-fab-short-touch-stays-put.png)

人工复核结论：

- 悬浮球仍停留在右下默认位置，没有因为一次短触摸手势被拖走。
- `END PHASE` 右侧主操作按钮完整可见，没有被悬浮球额外展开或遮挡。

### 2. 长按后仍可拖动，且结束阶段按钮可点击

完整路径：

- `D:\gongzuo\webgame\BoardGame\test-results\evidence-screenshots\summonerwars.e2e\移动横屏：悬浮球短触摸不误拖，长按后仍可拖动且不阻塞结束阶段按钮\31-mobile-fab-long-press-drag-and-end-phase-clickable.png`

截图：

![长按拖动后仍可点击结束阶段](../test-results/evidence-screenshots/summonerwars.e2e/移动横屏：悬浮球短触摸不误拖，长按后仍可拖动且不阻塞结束阶段按钮/31-mobile-fab-long-press-drag-and-end-phase-clickable.png)

人工复核结论：

- 悬浮球已经从右下被拖到左上，说明移动端拖拽能力仍然保留。
- 右侧阶段按钮已从 `Summon` 切到 `Move`，右下出现红色确认条，说明 `END PHASE` 点击真实生效，没有再被悬浮球拖拽逻辑吞掉。

## 本次实现

- `src/components/system/FabMenu.tsx`
  - 移动端触控改为“长按后才允许拖拽”
  - 短触摸一旦发生位移，会取消长按拖拽准备，避免误拖
  - 桌面端继续保留原来的直接拖拽
- `e2e/summonerwars.e2e.ts`
  - 新增手机横屏 FAB 回归用例
  - 覆盖短触摸不移动、长按可拖动、拖后 `END PHASE` 可点击三条核心断言
