# 召唤师战争移动端适配 E2E 证据

## 本轮结论

- 主证据链路已固定为真实 `/play/summonerwars?skipInitialization=true&numPlayers=2` + `TestHarness` 状态注入。
- 本轮执行通过：

```bash
npm run typecheck
node scripts/infra/run-e2e-command.mjs ci e2e/summonerwars.e2e.ts --grep "移动横屏：长按放大与阶段说明在手机和平板都可达"
```

- 我已逐张查看以下显式截图：
  - `D:\gongzuo\webgame\BoardGame\test-results\evidence-screenshots\summonerwars.e2e\移动横屏：长按放大与阶段说明在手机和平板都可达\10-phone-landscape-board.png`
  - `D:\gongzuo\webgame\BoardGame\test-results\evidence-screenshots\summonerwars.e2e\移动横屏：长按放大与阶段说明在手机和平板都可达\11-phone-hand-magnify-open.png`
  - `D:\gongzuo\webgame\BoardGame\test-results\evidence-screenshots\summonerwars.e2e\移动横屏：长按放大与阶段说明在手机和平板都可达\12-phone-phase-detail-open.png`
  - `D:\gongzuo\webgame\BoardGame\test-results\evidence-screenshots\summonerwars.e2e\移动横屏：长按放大与阶段说明在手机和平板都可达\13-phone-action-log-open.png`
  - `D:\gongzuo\webgame\BoardGame\test-results\evidence-screenshots\summonerwars.e2e\移动横屏：长按放大与阶段说明在手机和平板都可达\20-tablet-landscape-board.png`

## 读图判定

### 有效截图

#### `11-phone-hand-magnify-open.png`

我实际看到：
- 来自真实对局态，不是教程页，不是靠隐藏浮层伪装。
- 选中手牌后能打开显式放大层，右上角存在 `Close`。
- 背景仍是同一局棋盘，说明入口和放大层链路真实存在。

判定：
- 有效。

#### `12-phone-phase-detail-open.png`

我实际看到：
- 阶段面板已展开，`Summon / Move / Build / Attack / Magic / Draw` 可见。
- 详情内容能直接读到，不依赖 hover。
- 手区、棋盘、阶段区仍在同屏。

判定：
- 有效。

#### `13-phone-action-log-open.png`

我实际看到：
- action log 面板真实打开，背景仍能辨认棋盘和阶段区。
- 面板内容可读，没有横向炸开。
- 这是显式展开日志时的截图，所以面板本身覆盖部分背景是合理的。

判定：
- 有效。

#### `20-tablet-landscape-board.png`

我实际看到：
- 平板横屏主状态干净，棋盘、阶段区、`END PHASE`、弃牌堆、手牌可同时看到。
- 没有教程浮层，没有测试调试面板残留。
- 整体比例稳定，没有明显压扁或拉伸。

判定：
- 有效。

### 当前仍不建议当作最终通过主图的截图

#### `10-phone-landscape-board.png`

我实际看到：
- 这是来自真实对局态的手机横屏主状态图，不是伪证据。
- 整体比之前更接近等比主壳，主棋盘、阶段轨、手牌都比旧版更大、更集中。
- 但右侧系统 FAB 仍压在阶段区/弃牌堆附近，主状态信息层级还不够干净。
- `END PHASE` 在这张手机主图里没有像平板图那样完整稳定地露出。

判定：
- 不建议作为“手机横屏主状态已完全收口”的最终通过图。

原因：
- 主状态图仍有肉眼可见的系统 HUD 挤压。
- 这不是信息被隐藏，但仍属于关键信息区未完全让开的残留问题。

## 本轮代码改动与证据对应

### 已落地

- `src/games/summonerwars/manifest.ts`
  - 维持 `mobileLayoutPreset: 'board-shell'`，继续走整局等比壳。

- `src/index.css`
  - 为 `summonerwars` 增加 `board-shell` 设计宽度覆盖，手机横屏下整体放大到更接近可用状态，同时不改 PC。

- `src/games/summonerwars/Board.tsx`
  - 清理了已废弃的 `touchTargetScaleCompensation` 链路，避免继续在棋盘层做错误补偿。

- `src/games/summonerwars/ui/HandArea.tsx`
  - 重写为干净可编译版本。
  - 手区卡牌尺寸继续走壳内等比参考宽度。
  - 显式放大入口改成“视觉小图标 + 透明命中区”分离。
  - 透明命中区上移并外推，避免遮住再次点击卡牌取消选中。

## 当前收口状态

- 类型检查：通过。
- 单用例 E2E：通过。
- 真实看图：已执行。
- 当前结论：
  - `手牌放大入口`、`阶段详情`、`action log`、`平板主状态` 已形成有效证据。
  - `手机横屏主状态图` 仍有系统 HUD 让位不足的问题，还不适合直接宣称完全收口。
