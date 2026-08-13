# DiceThrone 当前骰区与奖励骰确认：页面级验收

运行现场：`D:\gongzuo\webgame\BoardGame`，当前工作目录的 Chromium E2E 测试入口 `/play/dicethrone`。本轮用状态注入构造等价的当前骰区与奖励骰确认状态；它验证的是当前页面、调试面板和玩家界面的消费关系，不冒充跨端联机结算全链。

## 验收对象

- 新投掷覆盖旧骰区后，页面不再出现“回到覆盖前骰区”玩家按钮或命令入口。
- 调试面板改骰必须写入玩家当前看到的骰区，而不是只改旧骰子数组。
- 奖励骰不再有“确认奖励骰”或“结算奖励骰”专用语义：无合法介入时自动结算；允许免费重投时，只能由右侧 2D 骰盘下方的普通“确认”收口。

## 截图链

1. `D:\gongzuo\webgame\BoardGame\test-results\evidence-screenshots\dicethrone\dicethrone-debug-panel-test.e2e\调试改骰会立即更新当前骰区和玩家骰盘，不生成覆盖恢复按钮\调试面板已写入当前骰区的六五四三二.jpg`
   - 同一真实棋盘右侧打开调试面板，骰子输入框已明确显示 `6 / 5 / 4 / 3 / 2`。
   - 这张图证明本轮实际点击的是调试工具的“应用骰子值”，不是直接改测试状态后伪造结果。

2. `D:\gongzuo\webgame\BoardGame\test-results\evidence-screenshots\dicethrone\dicethrone-debug-panel-test.e2e\调试改骰会立即更新当前骰区和玩家骰盘，不生成覆盖恢复按钮\调试改骰后当前骰盘显示新点数.jpg`
   - 关闭调试面板后，同一局面的右侧当前骰盘仍在玩家界面中可见；E2E 同时断言第一颗和第五颗骰子的实际展示值已变为 `6` 与 `2`。
   - 右侧动作区没有“回到覆盖前骰区”按钮。

3. `D:\gongzuo\webgame\BoardGame\test-results\evidence-screenshots\dicethrone\dicethrone-ninja-bonus-reroll.e2e\死亡盛放-II-应从真实槽位进入奖励骰界面，并在-2-次重投后达到上限\ninja-death-blossom-2-limit-reached.jpg`
   - 奖励骰位于右侧 2D 骰盘，五颗骰子均已静置且清晰可读；免费重投达到两次上限后，普通“确认”仍是唯一收口入口。
   - 画面中没有“确认奖励骰”“结算奖励骰”或“回到覆盖前骰区”。

4. `D:\gongzuo\webgame\BoardGame\test-results\evidence-screenshots\dicethrone\tianshi-ability-card-real-entry.e2e\神圣惩戒应从真实槽位投出-4-个额外骰并收口到最终伤害、Token-和状态\tianshi-divine-punishment-after-auto-settle.jpg`
   - 没有合法介入手段时，奖励骰自动结算，不出现任何奖励骰专用确认；顶部对手生命已清楚显示 `48`。
   - 伤害飘字和骰子翻转均已退场，截图是玩家可见的最终静置态，不是领域已结算但画面仍冻结的中间帧。

## 自动化结果

`node scripts/infra/run-e2e-single.mjs ci e2e/dicethrone/tianshi-ability-card-real-entry.e2e.ts "神圣惩戒应从真实槽位"`

`node scripts/infra/run-e2e-single.mjs ci e2e/dicethrone/dicethrone-ninja-bonus-reroll.e2e.ts "死亡盛放 II 应从真实槽位进入奖励骰界面，并在 2 次重投后达到上限"`

结果：2 passed。

- 自动结算奖励骰不显示专用确认，且顶部对手生命在最终图中同步为 `48`。
- 可免费重投奖励骰两次达到上限后只显示普通确认；确认收口后，对手生命同步为 `25`。

领域与 UI 回归：`src/games/dicethrone/__tests__/roll-context.test.ts`、`src/games/dicethrone/ui/__tests__/diceStagePolicy.test.ts` 与 `src/components/game/framework/hooks/__tests__/useVisualStateBuffer.test.ts` 共 52 passed。

## AI 图面审计

```text
verdict: PASS
score: 94/100
hard_failures: []
negative_impact_checks:
  - 调试面板截图只用于证明调试输入，关闭面板后的原图单独证明玩家骰盘仍存在。
  - 当前骰盘没有被调试面板、手牌、阶段按钮或弃牌堆遮挡。
  - 自动结算分支没有奖励骰专用确认；可重投分支只保留右侧骰盘的普通确认，未出现无规则来源的恢复或结算按钮。
issues: []
```

图面结论：调试输入值、关闭面板后的当前骰盘、自动结算最终态与可重投上限态分别处于独立且可辨认的画面状态；四张图共同覆盖“写入来源 -> 玩家可见结果 -> 自动结算/普通确认分流”，不以单一截图替代全部事实。
