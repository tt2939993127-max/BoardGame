# Dice Throne 枪手 The Law 多目标交互 E2E 证据

## 范围

- 目标：验证 `card-the-law` 对应的 `selectPlayer + selectCount = 2` 新交互链路已经从 UI 到领域结算闭环。
- 重点：
  - 只选 1 名目标时允许确认；
  - 选择 2 名目标时单次确认即可原子结算两名玩家的 `bounty + knockdown`；
  - 交互完成后 `sys.interaction.current` 被清空。

## 执行命令

```bash
npm run test:e2e:ci:file -- dicethrone-watch-out-spotlight.e2e.ts "枪手 The Law 多目标交互"
```

## 结果

- 结果：2 passed
- 文件：`e2e/dicethrone-watch-out-spotlight.e2e.ts`
- 用例：
  - `should allow confirming after selecting only one target`
  - `should resolve two selected targets in one confirmation`

## 截图证据

1. 单目标已选择，确认按钮可用：
   [14-the-law-single-target-selected.png](D:\gongzuo\webgame\BoardGame-wt-dicethrone-gunslinger-samurai\test-results\evidence-screenshots\dicethrone-watch-out-spotlight.e2e\should-allow-confirming-after-selecting-only-one-target\14-the-law-single-target-selected.png)
   - 说明：交互标题已出现，两个目标卡可见；仅选择 `僧侣-A` 后，确认按钮由禁用变为可点击。

2. 双目标已选择：
   [15-the-law-two-targets-selected.png](D:\gongzuo\webgame\BoardGame-wt-dicethrone-gunslinger-samurai\test-results\evidence-screenshots\dicethrone-watch-out-spotlight.e2e\should-resolve-two-selected-targets-in-one-confirmation\15-the-law-two-targets-selected.png)
   - 说明：`僧侣-A` 与 `圣骑士-B` 同时被选中，满足“至多 2 名目标玩家”的 UI 语义。

3. 双目标结算后：
   [16-the-law-two-targets-resolved.png](D:\gongzuo\webgame\BoardGame-wt-dicethrone-gunslinger-samurai\test-results\evidence-screenshots\dicethrone-watch-out-spotlight.e2e\should-resolve-two-selected-targets-in-one-confirmation\16-the-law-two-targets-resolved.png)
   - 说明：确认后交互关闭；测试断言同时验证两名目标玩家各获得 `1 bounty` 与 `1 knockdown`。

## 结论

- 这次新增的 `selectPlayer` 多目标交互不再停留在“领域层可跑”。
- 至少对 `The Law` 这条链路，已经完成：
  - OpenSpec 契约补充；
  - UI 单测；
  - 真实 E2E 验证；
  - 截图证据留档。

## Addendum（2026-03-28）：从手牌真实打出链路已补齐

- 先前这份证据只覆盖了“交互已经弹出后如何点击确认”，还没有覆盖“玩家从手牌点击 `The Law` 这张牌”。
- 本轮新增两条 E2E 后，这个缺口也已关闭：
  - `should resolve immediately in 1v1 after clicking the hand card`
  - `should open multi-target interaction after playing from hand in 3-player scene`
- 新增截图：
  1. `1v1` 从手牌点击前：
     [22-the-law-from-hand-1v1-before-play.png](D:\gongzuo\webgame\BoardGame-wt-dicethrone-gunslinger-samurai\test-results\evidence-screenshots\dicethrone-watch-out-spotlight.e2e\should-resolve-immediately-in-1v1-after-clicking-the-hand-card\22-the-law-from-hand-1v1-before-play.png)
  2. `1v1` 点击后直结算：
     [23-the-law-from-hand-1v1-after-play.png](D:\gongzuo\webgame\BoardGame-wt-dicethrone-gunslinger-samurai\test-results\evidence-screenshots\dicethrone-watch-out-spotlight.e2e\should-resolve-immediately-in-1v1-after-clicking-the-hand-card\23-the-law-from-hand-1v1-after-play.png)
  3. `3` 人局从手牌点击后，多目标已选择：
     [24-the-law-from-hand-3p-selected-targets.png](D:\gongzuo\webgame\BoardGame-wt-dicethrone-gunslinger-samurai\test-results\evidence-screenshots\dicethrone-watch-out-spotlight.e2e\should-open-multi-target-interaction-after-playing-from-hand-in-3-player-scene\24-the-law-from-hand-3p-selected-targets.png)
  4. `3` 人局从手牌点击后，多目标结算完成：
     [25-the-law-from-hand-3p-resolved.png](D:\gongzuo\webgame\BoardGame-wt-dicethrone-gunslinger-samurai\test-results\evidence-screenshots\dicethrone-watch-out-spotlight.e2e\should-open-multi-target-interaction-after-playing-from-hand-in-3-player-scene\25-the-law-from-hand-3p-resolved.png)
- 这意味着 `The Law` 当前已经同时完成了：
  - 从手牌点击打出；
  - `1v1` 直结算；
  - `3+` 人局进入多目标交互；
  - 交互确认后原子化结算多名玩家的 `bounty + knockdown`。
