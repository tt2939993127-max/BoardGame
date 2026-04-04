# 大杀四方选择派系页移动端等比缩放 E2E 证据（已失效，待重跑）

> 失效说明：本文件最初记录的是“`board-shell` 外再套一层内部缩放舞台”的实现结果。该实现已被判定为错误，因为它会制造大块无意义留白，不符合“桌面整页等比缩放”的真实目标。
> 当前代码已经改成复用外层 `board-shell` 统一缩放，不再做内部二次缩放；因此本文内旧截图和旧结论只能作为历史记录，不能继续作为当前版本已验收的证明。

## 范围

- 目标页面：`smashup` 选择派系页
- 本轮目标：
  - 手机横屏保持与 PC 同构的五列桌面构图
  - 不再只缩放上半部分
  - 底部玩家卡片栏不再被裁剪
  - 底部玩家卡片也必须跟随同一缩放链路缩小

## 当前改动摘要

- 已移除选择派系页内部那层额外的 `scale-to-fit` 主舞台，不再在 `board-shell` 外层统一缩放之外再做第二次缩放。
- 底部玩家卡片栏继续保留在主构图里，跟随页面统一缩放链路，而不是独立悬在缩放体系之外。
- 文档已补充：`board-shell` 全屏面板默认复用外层统一缩放，内部二次缩放属于反模式。

## 执行命令

```bash
npm run test:e2e:ci:file -- e2e/smashup-faction-selection-spacing.e2e.ts
npm run test:e2e:ci:file -- e2e/smashup-4p-layout-test.e2e.ts "横屏移动端打开派系详情时应显示泰坦区，并可完整滚动查看全部卡牌"
```

结果：

- `e2e/smashup-faction-selection-spacing.e2e.ts` 通过
- `e2e/smashup-4p-layout-test.e2e.ts` 指定用例通过

## 截图证据与人工观察

### 1. 手机横屏主态

路径：

- `D:\gongzuo\webgame\BoardGame\test-results\evidence-screenshots\smashup-faction-selection-spacing\mobile-landscape-800x450.png`

人工观察：

- 首屏仍是五列派系卡的桌面构图缩小版，没有退化成四列或单列手机稿。
- 底部两名玩家的派系选择卡片栏完整显示在画面内，没有再被屏幕下沿裁掉。
- 底部玩家卡片宽度明显跟随主界面一起缩小，不再出现“上面缩了、下面没缩”的断层。

### 2. PC 对照图

路径：

- `D:\gongzuo\webgame\BoardGame\test-results\evidence-screenshots\smashup-faction-selection-spacing\desktop-reference-1920x1080.png`

人工观察：

- PC 仍保持原来的五列桌面排布和底部玩家卡片栏，没有被这轮移动端修复带歪。
- 与手机横屏图对照后，主标题、五列卡阵、底部玩家卡片栏的上下关系保持一致，只是整体按比例缩小。
- 手机图里的底部卡片栏与 PC 同样位于主构图底部中央，信息层级一致。

### 3. 手机横屏派系详情顶部

路径：

- `D:\gongzuo\webgame\BoardGame\test-results\evidence-screenshots\smashup-4p-layout-test.e2e\横屏移动端打开派系详情时应显示泰坦区，并可完整滚动查看全部卡牌\11-mobile-landscape-faction-detail-top.png`

人工观察：

- 派系详情弹层仍保持在视口中央，没有被本轮主舞台调整挤出屏幕。
- 左侧信息栏和右侧预览卡区同时可见，顶部泰坦区入口仍存在。

### 4. 手机横屏派系详情底部

路径：

- `D:\gongzuo\webgame\BoardGame\test-results\evidence-screenshots\smashup-4p-layout-test.e2e\横屏移动端打开派系详情时应显示泰坦区，并可完整滚动查看全部卡牌\12-mobile-landscape-faction-detail-bottom.png`

人工观察：

- 右侧预览卡区可以滚到更下方的卡牌，没有被弹层高度错误截断。
- 弹层底部仍完整落在视口内，没有出现新裁剪或底部空洞。

## 历史结论（已失效）

- 这批截图只能证明“上一版二次缩放实现”解决了裁剪和底部玩家卡片未缩放的问题。
- 它们不能证明当前版本已经满足“桌面整页等比缩放且无多余留白”。

## 当前状态

- 已删除选择派系页内部二次缩放，改为直接复用 `board-shell` 外层统一缩放。
- `docs/mobile-adaptation.md` 与 `.windsurf/skills/adapt-game-mobile/SKILL.md` 已明确补充：`board-shell` 内禁止再套第二层 `transform: scale(...)`。
- 当前缺口：
  - 需要重新跑移动端主态截图
  - 需要用新截图重新判断“周围留白是否收敛到合理范围”
  - 需要用新截图更新本文件，替换掉当前失效证据

## 阻塞

- 本轮重跑时，仓库 E2E 管理器多次因机器剩余可用内存低于 `2.5GB` 门槛而拒绝启动。
- 在拿到新截图前，不能把当前版本宣称为“已完成最终验收”。
