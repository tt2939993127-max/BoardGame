# SmashUp 横屏移动端派系详情面板与泰坦区验证

## 结论

已按大杀四方 manifest 的 `preferredOrientation: 'landscape'` 进行横屏移动端验证。

当前已验证大杀四方派系选择页在横屏移动端打开派系详情弹层后：

- 左侧详情区会在简介与“确认选择”按钮之间显示泰坦预览
- 有泰坦时显示真实卡面，无泰坦时显示“该种族泰坦暂未接入”占位
- 右侧卡牌预览区仍保持独立滚动能力，没有被左侧泰坦区挤坏
- 横屏主验证下不会出现错误方向提示

## 验证方式

执行命令：

```powershell
$env:PW_WORKERS='1'
$env:PW_E2E_FRONTEND_PORT='6317'
$env:PW_E2E_GAME_SERVER_PORT='23100'
$env:PW_E2E_API_SERVER_PORT='24100'
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

- 顶部截图里，左侧 `Titan Preview` 区块位于简介下方、确认按钮上方，显示的是实际泰坦卡面，不是白块或 shimmer 占位。
- 左侧泰坦区高度约占详情列中段，确认按钮仍完整保留在底部，没有被新内容顶出可视区域。
- 滚动后截图里，右侧卡牌预览已经切到更靠后的牌，左侧泰坦区与确认按钮仍保持稳定，说明右侧是独立滚动容器，新增泰坦区没有破坏布局。
- 无泰坦截图里，占位文案出现在与泰坦区相同的位置，确认按钮仍可见，左侧详情列没有因为空状态塌陷。
- 本轮截图实看结论覆盖了“单泰坦”和“无泰坦”两种移动端状态；双泰坦场景已在组件内按独立网格布局处理，未回退到单卡硬编码。
