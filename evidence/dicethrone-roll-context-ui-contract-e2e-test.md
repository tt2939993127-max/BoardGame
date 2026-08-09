# DiceThrone 当前骰区与奖励骰确认：页面级验收

运行现场：`D:\gongzuo\webgame\BoardGame`，当前工作目录的 Chromium E2E 测试入口 `/play/dicethrone`。本轮用状态注入构造等价的当前骰区与奖励骰确认状态；它验证的是当前页面、调试面板和玩家界面的消费关系，不冒充跨端联机结算全链。

## 验收对象

- 新投掷覆盖旧骰区后，页面不再出现“回到覆盖前骰区”玩家按钮或命令入口。
- 调试面板改骰必须写入玩家当前看到的骰区，而不是只改旧骰子数组。
- 奖励骰保留“确认奖励骰”语义，不显示“结算奖励骰”或额外恢复动作。

## 截图链

1. `D:\gongzuo\webgame\BoardGame\test-results\evidence-screenshots\dicethrone\dicethrone-debug-panel-test.e2e\调试改骰会立即更新当前骰区和玩家骰盘，不生成覆盖恢复按钮\调试面板已写入当前骰区的六五四三二.jpg`
   - 同一真实棋盘右侧打开调试面板，骰子输入框已明确显示 `6 / 5 / 4 / 3 / 2`。
   - 这张图证明本轮实际点击的是调试工具的“应用骰子值”，不是直接改测试状态后伪造结果。

2. `D:\gongzuo\webgame\BoardGame\test-results\evidence-screenshots\dicethrone\dicethrone-debug-panel-test.e2e\调试改骰会立即更新当前骰区和玩家骰盘，不生成覆盖恢复按钮\调试改骰后当前骰盘显示新点数.jpg`
   - 关闭调试面板后，同一局面的右侧当前骰盘仍在玩家界面中可见；E2E 同时断言第一颗和第五颗骰子的实际展示值已变为 `6` 与 `2`。
   - 右侧动作区没有“回到覆盖前骰区”按钮。

3. `D:\gongzuo\webgame\BoardGame\test-results\evidence-screenshots\dicethrone\dicethrone-debug-panel-test.e2e\奖励骰只保留确认语义，不显示覆盖恢复或结算按钮\奖励骰只显示确认按钮且没有覆盖恢复按钮.jpg`
   - 奖励骰位于右侧骰盘，按钮文字为“确认奖励骰”。
   - 画面中没有“结算奖励骰”，也没有“回到覆盖前骰区”。其它常驻阶段按钮仍在其原有位置，没有被本轮删除或替换。

## 自动化结果

`npm run test:e2e:file -- e2e/dicethrone/dicethrone-debug-panel-test.e2e.ts`

结果：3 passed。

- 调试改骰会立即更新当前骰区和玩家骰盘，不生成覆盖恢复按钮。
- 奖励骰只保留确认语义，不显示覆盖恢复或结算按钮。

领域回归：`src/games/dicethrone/__tests__/roll-context.test.ts` 14 passed；新增调试改骰断言单独运行通过。

## AI 图面审计

```text
verdict: PASS
score: 94/100
hard_failures: []
negative_impact_checks:
  - 调试面板截图只用于证明调试输入，关闭面板后的原图单独证明玩家骰盘仍存在。
  - 当前骰盘没有被调试面板、手牌、阶段按钮或弃牌堆遮挡。
  - 奖励骰图的唯一额外操作是“确认奖励骰”；未出现无规则来源的恢复或结算按钮。
issues: []
```

图面结论：调试输入值、关闭面板后的当前骰盘、奖励骰确认按钮分别处于独立且可辨认的画面状态；三张图共同覆盖“写入来源 -> 玩家可见结果 -> 奖励骰玩家语义”，不以单一截图替代全部事实。
