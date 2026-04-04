# 大杀四方移动端手牌点击放大 E2E 证据

## 范围

- 目标：大杀四方移动端手牌区移除常驻放大按钮，保留 `点击手牌直接放大`。
- 本轮代码范围：
  - `src/games/smashup/ui/HandArea.tsx`
  - `e2e/smashup-local-gameplay.e2e.ts`
  - `e2e/smashup-4p-layout-test.e2e.ts`

## 执行命令

1. `BG_HEAVY_MEMORY_MIN_FREE_GB=1 npm run test:e2e:ci:file -- e2e/smashup-local-gameplay.e2e.ts "本地模式：默认模式下点击手牌只放大，不会进入打出选择"`
   - 结果：通过
2. `BG_HEAVY_MEMORY_MIN_FREE_GB=1 npm run test:e2e:ci:file -- e2e/smashup-local-gameplay.e2e.ts "本地模式：手机横屏点击手牌直接放大，且不显示常驻放大按钮"`
   - 结果：通过
3. `BG_HEAVY_MEMORY_MIN_FREE_GB=1 BG_HEAVY_CPU_HARD_LIMIT=101 BG_HEAVY_CPU_SOFT_LIMIT=100 npm run test:e2e:ci:file -- e2e/smashup-4p-layout-test.e2e.ts "移动端横屏应保持四人局布局可用，并支持手牌长按看牌"`
   - 结果：失败
   - 失败点：`[data-testid="fab-sheet-exit"]` 未出现，阻塞在 exit fab sheet 断言，与本轮手牌按钮/点击放大改动不是同一症状。

## 截图证据

### 1. click 模式不应把手牌直接打到基地

- 路径：`D:\gongzuo\webgame\BoardGame\test-results\evidence-screenshots\smashup-local-gameplay.e2e\本地模式：默认模式下点击手牌只放大，不会进入打出选择\smashup-click-preview-only.png`

![smashup-click-preview-only](../test-results/evidence-screenshots/smashup-local-gameplay.e2e/本地模式：默认模式下点击手牌只放大，不会进入打出选择/smashup-click-preview-only.png)

人工观察：

- 三个基地的随从槽仍然为空，没有因为点了手牌就被直接打出。
- 手牌仍留在底部区域，说明 click 模式没有偷跑到“打牌”语义。
- 这张图没有放大层，因此它只用于证明“点击后未直接打出”，不是本轮主验收图。

判定：

- 有效，但只是辅助图。

### 2. 手机横屏下无常驻放大按钮，点击手牌直接放大

- 路径：`D:\gongzuo\webgame\BoardGame\test-results\evidence-screenshots\smashup-local-gameplay.e2e\本地模式：手机横屏点击手牌直接放大，且不显示常驻放大按钮\smashup-mobile-click-preview-no-persistent-button.png`

![smashup-mobile-click-preview-no-persistent-button](../test-results/evidence-screenshots/smashup-local-gameplay.e2e/本地模式：手机横屏点击手牌直接放大，且不显示常驻放大按钮/smashup-mobile-click-preview-no-persistent-button.png)

人工观察：

- 画面中央已经出现 `First Mate` 的放大层，说明手机横屏下点击手牌本体就能直接查看大图。
- 手牌右上角没有额外常驻的圆形放大镜按钮，底部只保留原手牌卡面本体。
- 基地上仍没有新打出的随从，说明这次点击只是查看，不是误触发出牌。

判定：

- 有效主证据图，直接对应本轮需求。

## 结论

- `HandArea` 当前已验证的核心语义是：`点击手牌 = 放大查看`。
- 移动端常驻放大按钮已移除；手机横屏证据图中不存在该按钮，同时点击手牌可以正常打开放大层。
- `smashup-4p-layout-test.e2e.ts` 已同步改成“按钮不存在 + 点击手牌放大 + 长按仍可查看”的预期，但整条大用例目前被既有 `exit fab sheet` 断言挡住，不能拿它作为本轮唯一收口证据。
- `click` 模式下的 `上滑打出` 旧回归用例这轮没有拿到干净通过结果，因此本证据文档不把它算进本轮结论。

## 其他校验

- `npx eslint src/games/smashup/ui/HandArea.tsx e2e/smashup-local-gameplay.e2e.ts e2e/smashup-4p-layout-test.e2e.ts --max-warnings 999`
  - 结果：0 error，只有仓库内既有 `no-explicit-any` warnings。
