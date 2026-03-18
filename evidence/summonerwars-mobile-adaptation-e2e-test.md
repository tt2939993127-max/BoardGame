# 召唤师战争移动端适配 E2E 证据

## 本轮结论

- 本轮验收按项目内移动端规范执行，先拍同场景 `PC` 主态参考图，再对照 `手机横屏` 与 `平板横屏` 主态图，不再只看手机和平板互相比。
- 这次验证基于真实对局页：
  - `/play/summonerwars?skipInitialization=true&numPlayers=2`
  - 通过 `TestHarness` 注入真实证据状态
  - 不是教程页，不是隐藏浮层伪造主态
- 当前结论：`summonerwars` 手机横屏主态已经收口到“和 PC 主态表现差不多”的等比结果。
  - 棋盘主体不再像之前那样因为短视口被压得明显偏瘦
  - 手机主态的棋盘 framing 已经接近 PC，而不是另一套小号布局
  - 平板主态继续正常

## 本轮执行

```bash
npm run typecheck
npm run test:e2e:ci:file -- e2e/summonerwars.e2e.ts "移动横屏：长按放大与阶段说明在手机和平板都可达"
```

结果：

- `typecheck` 通过
- 目标 E2E 用例通过

## 实际查看的截图

### 1. PC 主态参考图

完整路径：

- `D:\gongzuo\webgame\BoardGame\test-results\evidence-screenshots\summonerwars.e2e\移动横屏：长按放大与阶段说明在手机和平板都可达\00-pc-reference-board.png`

我实际看到：

- 棋盘主体在画面中占比明确，是整张图的视觉中心。
- 右侧阶段区、右下 `END PHASE`、底部手牌都围绕同一张主体棋盘布置。
- 这张图作为本轮权威对照基线有效。

判定：

- 有效。

### 2. 手机横屏主态图

完整路径：

- `D:\gongzuo\webgame\BoardGame\test-results\evidence-screenshots\summonerwars.e2e\移动横屏：长按放大与阶段说明在手机和平板都可达\10-phone-landscape-board.png`

我实际看到：

- 手机图里的棋盘主体已经明显比上一轮更大，不再是“棋盘很瘦、两边大黑边、底部手牌过度抢画面”的状态。
- 棋盘、阶段区、`END PHASE`、弃牌堆仍在同一套主画面关系里，没有出现“回合阶段没进等比体系”的旧问题。
- 手机图相对 PC 仍然会多一点上下裁切，这是短高视口下为了保持主体接近 PC framing 的有意识取舍；但肉眼看过去已经是同一套布局语言，不是另一套小号 UI。

判定：

- 有效。

### 3. 平板横屏主态图

完整路径：

- `D:\gongzuo\webgame\BoardGame\test-results\evidence-screenshots\summonerwars.e2e\移动横屏：长按放大与阶段说明在手机和平板都可达\20-tablet-landscape-board.png`

我实际看到：

- 平板主态继续稳定，棋盘主体、阶段区、结束阶段按钮、底部手牌保持一致关系。
- 平板图和 PC 图本来就更接近，这轮修改没有把它带坏。

判定：

- 有效。

### 4. 手机 action log 展开图

完整路径：

- `D:\gongzuo\webgame\BoardGame\test-results\evidence-screenshots\summonerwars.e2e\移动横屏：长按放大与阶段说明在手机和平板都可达\13-phone-action-log-open.png`

我实际看到：

- action log 面板仍留在手机视口内，没有再次掉出屏幕。
- 这张图用于验证局部交互，不作为“主态是否等比”的主证据。

判定：

- 有效，但仅用于交互验证，不用于主态等比结论。

## 与 PC 对照后的收口判断

- 这一轮真正新增的验收门槛是：移动端必须先对照 `PC` 主态再下结论。
- 对照 `00-pc-reference-board.png` 与 `10-phone-landscape-board.png` 后，我的判断是：
  - 手机主态已经回到“和 PC 差不多”的关系
  - 差异主要体现在短高视口下的 framing 裁切，而不是主体被压扁、阶段区脱离缩放体系、或底部 HUD 另起一套比例
- 对照 `00-pc-reference-board.png` 与 `20-tablet-landscape-board.png` 后，我的判断是：
  - 平板主态正常
  - 本轮修改没有带来 PC / 平板回归

## 本轮代码改动

- `D:\gongzuo\webgame\BoardGame\.windsurf\skills\adapt-game-mobile\SKILL.md`
  - 新增硬规则：移动端验收必须对照同场景 `PC` 主态图，且判断标准是“看起来和 PC 差不多”。
- `D:\gongzuo\webgame\BoardGame\src\games\summonerwars\Board.tsx`
  - 新增手机横屏默认地图 framing。
  - 保持地图等比、保留拖拽与双指缩放，只调整默认初始视图，不动 PC。
- `D:\gongzuo\webgame\BoardGame\e2e\summonerwars.e2e.ts`
  - 补拍 `00-pc-reference-board.png`
  - 把主态验收改成 `PC -> 手机 -> 平板` 对照
  - 新增主态比例对照断言，不再只检查“元素还在视口里”

## 当前状态

- 这轮不再是“测试通过但看图不对”。
- 我已经实际对照看了 `PC / 手机 / 平板` 三张主态图。
- 以当前图片内容判断，这轮 `summonerwars` 的手机横屏主态已经收口。
