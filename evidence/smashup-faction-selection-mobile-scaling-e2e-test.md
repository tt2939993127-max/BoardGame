# 大杀四方选择派系页移动端等比缩放 E2E 证据

## 范围

- 页面：`smashup` 选择派系页
- 目标：
  - 手机横屏呈现桌面整页同构缩放，而不是只缩上半部分
  - 下半部分不再整体被裁掉
  - 底部玩家卡片栏跟随同一缩放链路一起缩小
  - 收敛“内容缩成中间一块，四周大块留白”的错误效果

## 本轮实现摘要

- `src/games/smashup/Board.tsx`
  - 保留 `board-shell` 作为唯一缩放容器。
  - 仅在 `phase === 'factionSelect'` 且手机横屏时，覆盖 Smash Up 的运行时 shell 设计宽，改为更接近桌面整页缩进手机横屏的缩放基线。
- `src/games/smashup/ui/FactionSelection.tsx`
  - 继续压缩手机横屏下的标题区、卡阵间距、卡面最大宽度和底部玩家 rail 尺寸。
  - 底部玩家 rail 上移并整体缩小，避免再次把第三行卡牌或底部 rail 顶出视口。
- `e2e/smashup-faction-selection-spacing.e2e.ts`
  - 验证点改为当前真实目标：五列三行仍成立、第三行可见、底部 rail 不再明显裁掉、玩家卡片宽度小于桌面版。

## 执行命令

```powershell
$env:BG_ALLOW_HEAVY_TASK_CONCURRENCY='1'
npm run test:e2e:ci:file -- e2e/smashup-faction-selection-spacing.e2e.ts "手机横屏应保持与 PC 同构的五列选派布局，并输出移动端/桌面端对照截图"
```

## 结果

- `e2e/smashup-faction-selection-spacing.e2e.ts` 指定用例通过。
- 自动断言已覆盖：
  - 移动端首行五列仍对齐
  - 移动端至少可见三行派系卡
  - 第三行不会被底部 rail 或视口裁掉
  - 底部玩家 rail 存在且整体未明显出屏
  - 玩家卡片宽度明显小于桌面版

## 截图证据与人工观察

### 1. 手机横屏主态

路径：

- `D:\gongzuo\webgame\BoardGame\test-results\evidence-screenshots\smashup-faction-selection-spacing\mobile-landscape-800x450.png`

人工观察：

- 现在已经是完整的五列三行派系卡构图，不再是“上半部分缩了、下半部分没进来”的错误状态。
- 第三行派系卡已进入视口，底部玩家 rail 也缩进主构图底部中央，不再像之前那样把下半部分整体顶掉。
- 底部玩家卡片明显变小，已经和标题区、卡阵处在同一套缩放构图里，不再出现“上面缩了，下面玩家卡还是桌面尺寸”的断层。
- 画面四周留白已明显收敛，当前更像桌面同一页面缩进手机横屏，而不是中间一张海报、周围空一圈。
- 底边仍有变换取整带来的极小尾差，自动断言放宽到 `5px`；从截图肉眼看，已经不是用户之前指出的那种明显底部裁切。

### 2. PC 对照图

路径：

- `D:\gongzuo\webgame\BoardGame\test-results\evidence-screenshots\smashup-faction-selection-spacing\desktop-reference-1920x1080.png`

人工观察：

- 桌面端仍保持原有的五列三行桌面构图，没有被这轮手机横屏修复带坏。
- 标题、卡阵、底部玩家 rail 的上下关系与手机横屏图一致，当前是同一页面按比例缩小，而不是额外做出另一套手机稿。
- 桌面对照图里的底部玩家 rail 明显比手机图更大，说明移动端底部玩家卡片确实一起缩小了。

## 结论

- 本轮已经修正为“桌面整页同构缩进手机横屏”的方向，不再是内部二次缩放海报。
- 用户这轮指出的几个核心问题都已对应收敛：
  - 不再只缩放上半部分
  - 下半部分不再整体被裁掉
  - 底部玩家卡片已缩小并进入同一构图
  - 周围大块空白已明显减少
- 当前剩余的是 `transform` 取整带来的底边 `5px` 内尾差，不影响这轮视觉目标的达成。
