# 召唤师战争移动端适配 E2E 证据

## 本轮结论

- 本轮验证基于真实对局页 `/play/summonerwars?skipInitialization=true&numPlayers=2`，通过 `TestHarness` 注入状态，不是教程页，也不是靠隐藏主内容伪造截图。
- 我实际重新查看了以下截图：
  - `D:\gongzuo\webgame\BoardGame\test-results\evidence-screenshots\summonerwars.e2e\移动横屏：长按放大与阶段说明在手机和平板都可达\10-phone-landscape-board.png`
  - `D:\gongzuo\webgame\BoardGame\test-results\evidence-screenshots\summonerwars.e2e\移动横屏：长按放大与阶段说明在手机和平板都可达\13-phone-action-log-open.png`
  - `D:\gongzuo\webgame\BoardGame\test-results\evidence-screenshots\summonerwars.e2e\移动横屏：长按放大与阶段说明在手机和平板都可达\20-tablet-landscape-board.png`
- 当前有效结论：
  - 手机主态图已经去掉测试调试入口污染，也不再截到骨架占位态。
  - action log 打开态仍完整留在视口内，没有再掉出屏幕。
  - 平板横屏主态保持等比主画布，阶段区、结束阶段按钮、手牌、弃牌堆都还在同屏。

## 本轮执行

```bash
npm run typecheck
npm run test:e2e:ci:file -- e2e/summonerwars.e2e.ts "移动横屏：长按放大与阶段说明在手机和平板都可达"
```

结果：

- `typecheck` 通过
- 单用例 E2E 通过

## 读图判定

### `10-phone-landscape-board.png`

我实际看到：

- 棋盘主体、地图格线、棋子、手牌都已经稳定渲染，没有再出现半透明 shimmer 占位块。
- 右侧此前污染主图的调试按钮已经消失，现在主态里只剩产品 HUD 自身的退出悬浮球。
- 棋盘主体仍是等比画布，没有被压扁；地图缩放系统也仍保留。
- 阶段条、手牌、资源条、牌堆都还在主态中，没有靠隐藏信息换空间。

判定：

- 有效主态图。

残留观察：

- 手机横屏下右侧退出悬浮球仍贴近阶段区，这是产品 HUD 的空间竞争，不是测试污染。
- 这不影响“真实主态有效”，但如果后续继续打磨手机横屏，还可以再优化主球与阶段区的相对让位。

### `13-phone-action-log-open.png`

我实际看到：

- action log 面板真实展开，内容可读。
- 面板右边界、下边界都还在视口内，没有横向炸开，也没有底部掉出屏幕。
- 打开 action log 时，棋盘和阶段区仍可辨认，属于有效的“展开态”证据。

判定：

- 有效截图。

### `20-tablet-landscape-board.png`

我实际看到：

- 平板横屏主态干净，没有教程层、调试层、测试残留层。
- 棋盘主画布占比明显更合理，阶段条、`END PHASE`、弃牌堆、手牌同时可达。
- 视觉上仍是单一主棋盘，不存在之前那种“双壳/假第二棋盘”的问题。

判定：

- 有效主态图。

## 本轮代码改动与图证对应

- `src/components/game/framework/widgets/GameDebugPanel.tsx`
  - 新增 `__BG_HIDE_DEBUG_PANEL__` 显式开关。
  - 目的不是隐藏产品信息，而是让移动端证据截图不再被测试调试入口污染。

- `e2e/summonerwars.e2e.ts`
  - 这条移动端证据用例注入 `__BG_HIDE_DEBUG_PANEL__ = true`。
  - 新增 `waitForSummonerWarsVisualStable()`，在主态截图前等待 `img-shimmer` 骨架全部消失，避免把资源未稳定的首帧误当最终证据。

## 当前收口状态

- 已修复：
  - 双层 `MobileBoardShell` 导致的假第二棋盘
  - action log 掉出屏幕
  - 证据图被调试入口污染
  - 主态图截到 shimmer 占位态

- 当前仍可继续打磨：
  - 手机横屏下，右侧退出悬浮球和阶段区的让位关系还可以再更干净一些
