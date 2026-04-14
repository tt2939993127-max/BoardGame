# DiceThrone 游戏内奖励骰特写手动关闭 E2E 证据

- 用例: `e2e/dicethrone/dicethrone-watch-out-spotlight.e2e.ts` / `bonus die spotlight should close on content click in display mode`
- 命令: `npm run test:e2e:ci:file -- e2e/dicethrone/dicethrone-watch-out-spotlight.e2e.ts "bonus die spotlight should close on content click in display mode"`

## 截图证据（已人工查看）

1) 游戏内奖励骰特写出现
- 路径: `D:\gongzuo\webgame\BoardGame\test-results\evidence-screenshots\dicethrone\dicethrone-watch-out-spotlight.e2e\bonus-die-spotlight-should-close-on-content-click-in-display-mode\05-bonus-die-spotlight-visible-before-click-close.png`
- 观察:
  - 画面底部中间可见奖励骰特写卡片，说明游戏内奖励骰特写已实际弹出。
  - 主棋盘、右侧按钮和手牌区仍在，特写是叠加在游戏画面上的瞬时层。

2) 点击特写内容后关闭
- 路径: `D:\gongzuo\webgame\BoardGame\test-results\evidence-screenshots\dicethrone\dicethrone-watch-out-spotlight.e2e\bonus-die-spotlight-should-close-on-content-click-in-display-mode\06-bonus-die-spotlight-click-close.png`
- 观察:
  - 底部中间的奖励骰特写卡片已消失，说明游戏内逻辑改成了手动点击关闭。
  - 右侧“结束攻击”按钮和右下角手牌仍保持可见，特写关闭后流程回到可继续操作状态，没有被遮挡卡死。

## 验收结论

- 达到本轮“游戏中的奖励骰特写改成手动关闭、教程仍走单独逻辑”的验收目标。
- 本证据只覆盖**游戏内 displayOnly 奖励骰特写手动关闭**；教程 3 秒自动关闭证据见 `evidence/dicethrone-tutorial-bonus-die-autoclose-e2e-test.md`。
