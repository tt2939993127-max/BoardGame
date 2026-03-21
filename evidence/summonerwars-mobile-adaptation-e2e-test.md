# 召唤师战争移动端适配 E2E 证据

## 测试命令

```bash
node scripts/infra/run-e2e-command.mjs ci e2e/summonerwars.e2e.ts --grep "移动横屏：触屏放大入口与阶段说明在手机和平板都可达"
```

## 结果

- 结果：通过
- 时间：2026-03-15
- 覆盖设备：
  - 手机横屏：`812 x 375`
  - 平板横屏：`1024 x 768`

## 截图证据

### 1. 手机横屏主界面

![手机横屏主界面](../test-results/evidence-screenshots/summonerwars.e2e/移动横屏：触屏放大入口与阶段说明在手机和平板都可达/移动横屏：触屏放大入口与阶段说明在手机和平板都可达-10-phone-landscape-board.png)

分析：
- 棋盘、阶段追踪器、结束阶段按钮、手牌区同时可见。
- 手牌左上角放大入口在每张牌上常显，触屏下无需 hover。
- 页面没有出现横向溢出，关键操作区都留在视口内。

### 2. 手机横屏手牌放大

![手机横屏手牌放大](../test-results/evidence-screenshots/summonerwars.e2e/移动横屏：触屏放大入口与阶段说明在手机和平板都可达/移动横屏：触屏放大入口与阶段说明在手机和平板都可达-11-phone-hand-magnify-open.png)

分析：
- 点击手牌左上角放大入口后，放大层成功打开。
- 放大层右上角出现明确的 `Close` 关闭按钮，触屏下可直接关闭。
- 测试同时验证了关闭后放大层样式状态恢复为关闭态。

### 3. 手机横屏阶段说明

![手机横屏阶段说明](../test-results/evidence-screenshots/summonerwars.e2e/移动横屏：触屏放大入口与阶段说明在手机和平板都可达/移动横屏：触屏放大入口与阶段说明在手机和平板都可达-12-phone-phase-detail-open.png)

分析：
- 点击阶段项后，右侧出现阶段说明面板。
- `Build` 说明可见，证明原本依赖 hover 的信息在触屏下已有点击替代入口。

### 4. 平板横屏主界面

![平板横屏主界面](../test-results/evidence-screenshots/summonerwars.e2e/移动横屏：触屏放大入口与阶段说明在手机和平板都可达/移动横屏：触屏放大入口与阶段说明在手机和平板都可达-20-tablet-landscape-board.png)

分析：
- 平板横屏下棋盘、手牌、阶段区和结束阶段按钮仍保持在视口内。
- 阶段说明面板可与主棋盘共存，没有把核心操作区挤出屏幕。

## 结论

- `summonerwars` 现已具备触屏可达的手牌放大入口。
- `summonerwars` 现已具备触屏可达的阶段说明入口。
- 手机和平板横屏下均通过了布局边界断言与核心交互断言。
