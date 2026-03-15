# 大杀四方移动端适配 E2E 证据

## 执行命令

```bash
npm run typecheck
npm run test -- src/games/__tests__/mobileSupport.test.ts
node scripts/infra/run-e2e-command.mjs ci e2e/smashup-4p-layout-test.e2e.ts --grep "移动端横屏应保持"
```

结果：
- `npm run typecheck` 通过
- `src/games/__tests__/mobileSupport.test.ts` 8/8 通过
- `e2e/smashup-4p-layout-test.e2e.ts` 中“移动端横屏应保持四人局布局可用，并支持手牌长按看牌”通过

## 本轮验证目标

- 移动端横屏下四人局布局仍在视口内
- 场上卡牌不再把单击伪装成桌面的 `hover`
- 随从附着行动卡默认隐藏，单击随从后才展开
- 随从天赋改为“第一次点击选中，第二次点击激活”
- 基地、随从、基地 `ongoing`、附着行动卡、手牌都继续支持长按看大图

## 关键截图

### 1. 横屏布局稳定

截图：
`D:\gongzuo\webgame\BoardGame\test-results\evidence-screenshots\smashup-4p-layout-test.e2e\移动端横屏应保持四人局布局可用，并支持手牌长按看牌\04-mobile-landscape-layout.png`

结论：
- 记分板、牌库、弃牌堆、手牌都还在 `812x375` 视口内
- 第一块基地和场上随从可见，没有被右下角操作区挤出屏幕

### 2. 第一次点击只选中并展开

截图：
`D:\gongzuo\webgame\BoardGame\test-results\evidence-screenshots\smashup-4p-layout-test.e2e\移动端横屏应保持四人局布局可用，并支持手牌长按看牌\05-mobile-single-tap-expands-attached-actions.png`

结论：
- 随从 `p0-b0-armor-stego` 第一次点击后，附着行动卡展开
- 测试断言该随从进入激活预备态，且 `talentUsed === false`
- 放大层没有出现，说明第一次点击只承担选中/展开语义

### 3. 第二次点击才激活天赋

截图：
`D:\gongzuo\webgame\BoardGame\test-results\evidence-screenshots\smashup-4p-layout-test.e2e\移动端横屏应保持四人局布局可用，并支持手牌长按看牌\06-mobile-second-tap-uses-talent.png`

结论：
- 第二次点击同一随从后，测试断言 `talentUsed === true`
- 激活预备态被清空，附着行动卡仍保持展开，便于继续后续交互

### 4. 随从长按看大图

截图：
`D:\gongzuo\webgame\BoardGame\test-results\evidence-screenshots\smashup-4p-layout-test.e2e\移动端横屏应保持四人局布局可用，并支持手牌长按看牌\07-mobile-minion-long-press-magnify.png`

结论：
- 随从长按后稳定打开放大层
- 长按流程没有误触发点击分支

### 5. 基地长按看大图

截图：
`D:\gongzuo\webgame\BoardGame\test-results\evidence-screenshots\smashup-4p-layout-test.e2e\移动端横屏应保持四人局布局可用，并支持手牌长按看牌\08-mobile-base-long-press-magnify.png`

结论：
- 基地不再依赖移动端不存在的 `hover`
- 单击不误开图，长按可稳定查看大图

### 6. 基地 ongoing 长按看大图

截图：
`D:\gongzuo\webgame\BoardGame\test-results\evidence-screenshots\smashup-4p-layout-test.e2e\移动端横屏应保持四人局布局可用，并支持手牌长按看牌\09-mobile-base-ongoing-long-press-magnify.png`

结论：
- 基地顶部 `ongoing` 行动卡在移动端可直接长按查看
- 长按后没有串到点击激活逻辑

### 7. 附着行动卡长按看大图

截图：
`D:\gongzuo\webgame\BoardGame\test-results\evidence-screenshots\smashup-4p-layout-test.e2e\移动端横屏应保持四人局布局可用，并支持手牌长按看牌\10-mobile-attached-action-long-press-magnify.png`

结论：
- 附着行动卡先通过点击随从展开，再可长按查看大图
- 这说明移动端语义已经稳定为“点击选中/展开，长按查看”

### 8. 手牌长按能力未回归

截图：
`D:\gongzuo\webgame\BoardGame\test-results\evidence-screenshots\smashup-4p-layout-test.e2e\移动端横屏应保持四人局布局可用，并支持手牌长按看牌\11-mobile-hand-long-press-magnify.png`

结论：
- 这轮收口没有破坏上一轮已经做好的手牌长按看牌
- 长按后原手牌仍保留在手牌区，没有误打出

## 最终结论

本轮移动端交互已经对齐当前裁决：

- 附着行动卡不再常显，必须先点击随从展开
- 随从天赋改为“第一次点击选中，第二次点击激活”
- 长按统一承担查看大图
- 相关 E2E 和单测都已通过
