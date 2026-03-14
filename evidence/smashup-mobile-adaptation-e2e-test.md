# 大杀四方移动端适配 E2E 证据

## 执行命令

```bash
npm run test -- src/games/__tests__/mobileSupport.test.ts
npm run test:e2e:ci -- e2e/smashup-4p-layout-test.e2e.ts -g "移动端横屏应保持"
```

结果：

- `src/games/__tests__/mobileSupport.test.ts` 8/8 通过
- `e2e/smashup-4p-layout-test.e2e.ts` 3/3 通过

## 本轮验证目标

- 移动端横屏下，四人局主布局仍在视口内
- 场上卡牌不再用单击默认打开大图
- 单击仍保留主语义：随从单击可直接触发可用天赋
- 基地、随从、基地上的持续行动、随从附着行动、手牌都支持长按看大图
- 触控设备上附着行动卡不再依赖 hover 才能触达

## 关键截图

### 1. 横屏布局稳定

截图：
`D:\gongzuo\webgame\BoardGame\test-results\evidence-screenshots\smashup-4p-layout-test.e2e\移动端横屏应保持四人局布局可用，并支持手牌长按看牌\04-mobile-landscape-layout.png`

核对结论：

- 记分板、牌库、弃牌堆和手牌都在 812x375 视口内
- 场上第一块基地、随从、基地持续行动都可见
- 右下操作区没有把主棋盘整体挤出可视区域

### 2. 单击保留主语义

截图：
`D:\gongzuo\webgame\BoardGame\test-results\evidence-screenshots\smashup-4p-layout-test.e2e\移动端横屏应保持四人局布局可用，并支持手牌长按看牌\05-mobile-single-tap-keeps-primary-action.png`

核对结论：

- 单击基地后，没有出现大图放大层
- 单击 `p0-b0-armor-stego` 后，测试断言确认该随从 `talentUsed === true`
- 同一步里放大层仍不存在，说明“单击激活”和“长按查看”已经分离

### 3. 随从长按看大图

截图：
`D:\gongzuo\webgame\BoardGame\test-results\evidence-screenshots\smashup-4p-layout-test.e2e\移动端横屏应保持四人局布局可用，并支持手牌长按看牌\06-mobile-minion-long-press-magnify.png`

核对结论：

- 长按随从后，放大层打开
- 之前单击产生的天赋状态没有被长按流程破坏

### 4. 基地长按看大图

截图：
`D:\gongzuo\webgame\BoardGame\test-results\evidence-screenshots\smashup-4p-layout-test.e2e\移动端横屏应保持四人局布局可用，并支持手牌长按看牌\07-mobile-base-long-press-magnify.png`

核对结论：

- 基地不再需要依赖移动端不存在的 hover
- 单击不误开图，长按可稳定打开基地大图

### 5. 基地持续行动长按看大图

截图：
`D:\gongzuo\webgame\BoardGame\test-results\evidence-screenshots\smashup-4p-layout-test.e2e\移动端横屏应保持四人局布局可用，并支持手牌长按看牌\08-mobile-base-ongoing-long-press-magnify.png`

核对结论：

- 基地顶部持续行动卡在移动端可直接长按查看
- 长按后没有误触发单击分支

### 6. 附着行动卡长按看大图

截图：
`D:\gongzuo\webgame\BoardGame\test-results\evidence-screenshots\smashup-4p-layout-test.e2e\移动端横屏应保持四人局布局可用，并支持手牌长按看牌\09-mobile-attached-action-long-press-magnify.png`

核对结论：

- 附着行动卡在粗指针环境下可见，说明不再依赖 hover
- 长按附着行动卡后，放大层打开，证明移动端已可达

### 7. 手牌长按仍然可用

截图：
`D:\gongzuo\webgame\BoardGame\test-results\evidence-screenshots\smashup-4p-layout-test.e2e\移动端横屏应保持四人局布局可用，并支持手牌长按看牌\10-mobile-hand-long-press-magnify.png`

核对结论：

- 这轮修改没有回归上一轮已做好的手牌长按看牌
- 长按手牌后，原手牌仍保留在手牌区，没有误打出

## 结论

这轮移动端交互调整已经满足当前裁决：

- 场上卡牌查看走长按，不再占用单击
- 单击继续服务部署、选择、天赋/特殊能力等主交互
- 基地持续行动和附着行动卡在触控设备上都可触达并可长按查看
