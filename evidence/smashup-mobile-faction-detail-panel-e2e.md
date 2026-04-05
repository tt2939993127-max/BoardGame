# SmashUp 横屏移动端派系详情面板与泰坦区验证

## 结论

已按大杀四方 manifest 的 `preferredOrientation: 'landscape'` 进行横屏移动端验证。

当前已验证大杀四方派系选择页在横屏移动端打开派系详情弹层后：

- 详情弹层已恢复为占据大部分横屏画面的桌面同构布局，不再缩成中间一张小海报
- 左侧详情区会在简介与“确认选择”按钮之间显示泰坦预览
- 有泰坦时显示真实卡面，无泰坦时显示“该种族泰坦暂未接入”占位
- 右侧卡牌预览区仍保持独立滚动能力，没有被左侧泰坦区挤坏
- 横屏主验证下不会出现错误方向提示

本轮根因是：`board-shell` 外层已经统一缩放后，`FactionSelection` 内部又对派系详情额外做了一次 `mobileLandscapeScale`，导致移动横屏详情被二次缩小。当前已移除这层内部缩放，并在 E2E 中新增“详情面板宽高占比”断言，防止回归。

## 验证方式

执行命令：

```powershell
npm run test:e2e:ci:file -- e2e/smashup-4p-layout-test.e2e.ts "横屏移动端打开派系详情时应显示泰坦区，并可完整滚动查看全部卡牌"
```

结果：

- `1 passed`

本轮验证用例位置：

- `e2e/smashup-4p-layout-test.e2e.ts`
- 用例名：`横屏移动端打开派系详情时应显示泰坦区，并可完整滚动查看全部卡牌`

## 截图证据

顶部状态：

![横屏移动端派系详情顶部](../test-results/evidence-screenshots/smashup-4p-layout-test.e2e/横屏移动端打开派系详情时应显示泰坦区，并可完整滚动查看全部卡牌/11-mobile-landscape-faction-detail-top.png)

滚动后状态：

![横屏移动端派系详情滚动后](../test-results/evidence-screenshots/smashup-4p-layout-test.e2e/横屏移动端打开派系详情时应显示泰坦区，并可完整滚动查看全部卡牌/12-mobile-landscape-faction-detail-bottom.png)

无泰坦占位状态：

![横屏移动端派系详情无泰坦占位](../test-results/evidence-screenshots/smashup-4p-layout-test.e2e/横屏移动端打开派系详情时应显示泰坦区，并可完整滚动查看全部卡牌/13-mobile-landscape-faction-detail-no-titan.png)

## 观察

- `11-mobile-landscape-faction-detail-top.png` 里，整块派系详情已经横向铺开到屏幕大部分宽度，左栏与右侧卡牌网格接近桌面端同构比例；这张图达到“详情不再过小、不是中间小卡片”的验收标准。
- 同一张图里，左侧 `Titan Preview` 区块位于简介下方、确认按钮上方，显示的是实际泰坦卡面，不是白块或 shimmer 占位；这张图达到“泰坦区真实渲染”的验收标准。
- `12-mobile-landscape-faction-detail-bottom.png` 里，右侧已经滚到更靠后的行动牌，左侧泰坦区与确认按钮仍保持稳定且完整可见，说明右侧是独立滚动容器，没有因为修大面板而把左栏挤坏；这张图达到“可完整滚动查看全部卡牌”的验收标准。
- `13-mobile-landscape-faction-detail-no-titan.png` 里，无泰坦派系仍保持同样的大面板尺寸，左栏出现“该种族泰坦暂未接入”占位，确认按钮仍保留在底部可见区域；这张图达到“空状态不塌陷、不缩水”的验收标准。

## 桌面回归补充

- 额外复跑并查看了桌面派系详情泰坦预览用例：`npm run test:e2e:ci:file -- e2e/smashup-faction-selection-spacing.e2e.ts "海盗派系详情中的泰坦预览应加载真实卡图"`。
- 关键截图：
  - `D:\gongzuo\webgame\BoardGame\test-results\evidence-screenshots\smashup-faction-selection-spacing.e2e\海盗派系详情中的泰坦预览应加载真实卡图\海盗派系详情中的泰坦预览应加载真实卡图-pirates-titan-preview-loaded.png`
- 肉眼可见桌面端海盗详情仍是完整的大面板布局，左栏泰坦卡和右侧卡牌网格都正常显示，没有被这次移动端修复带歪。
