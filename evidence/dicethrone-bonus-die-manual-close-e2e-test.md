# DiceThrone 游戏内奖励骰特写手动关闭 E2E 证据

- 用例: `e2e/dicethrone/dicethrone-watch-out-spotlight.e2e.ts` / `bonus die spotlight should close on content click in display mode`
- 命令: `npm run test:e2e:ci:file -- e2e/dicethrone/dicethrone-watch-out-spotlight.e2e.ts "bonus die spotlight should close on content click in display mode"`

## 截图证据（已人工查看）

1) 游戏内奖励骰特写出现（局部元素图）
- 路径: `D:\gongzuo\webgame\BoardGame\test-results\evidence-screenshots\dicethrone\dicethrone-watch-out-spotlight.e2e\bonus-die-spotlight-should-close-on-content-click-in-display-mode\05-bonus-die-spotlight-overlay-visible-before-click-close.png`
- 观察:
  - 局部图中能直接看到骰子本体与骰面数值 `6`，满足“证据里必须看到对应物本体”的要求。
  - 骰面下方还能看到效果文案“月：施加致盲”，说明这张图对应的就是奖励骰特写本身，而不是普通棋盘区域。

2) 游戏内奖励骰特写出现（整页上下文图）
- 路径: `D:\gongzuo\webgame\BoardGame\test-results\evidence-screenshots\dicethrone\dicethrone-watch-out-spotlight.e2e\bonus-die-spotlight-should-close-on-content-click-in-display-mode\05-bonus-die-spotlight-visible-before-click-close.png`
- 观察:
  - 整页图中能看到奖励骰特写悬浮在棋盘中央，右侧操作区和手牌区仍然可见，说明这是游戏内临时特写层，不是教程弹窗。
  - 该图与局部元素图相互印证：局部图证明“骰子本体确实出现”，整页图证明“它出现在真实游戏链路里”。

3) 点击特写内容后关闭
- 路径: `D:\gongzuo\webgame\BoardGame\test-results\evidence-screenshots\dicethrone\dicethrone-watch-out-spotlight.e2e\bonus-die-spotlight-should-close-on-content-click-in-display-mode\06-bonus-die-spotlight-click-close.png`
- 观察:
  - 底部中间的奖励骰特写卡片已消失，说明游戏内逻辑改成了手动点击关闭。
  - 右侧“结束攻击”按钮和右下角手牌仍保持可见，特写关闭后流程回到可继续操作状态，没有被遮挡卡死。

## 当前结论

- 这份证据已经覆盖“游戏内奖励骰特写出现 → 玩家手动点击关闭 → 流程恢复可继续”的完整视觉链路。
- 游戏内逻辑与教程逻辑已区分：本证据覆盖**游戏内 displayOnly 奖励骰特写手动关闭**；教程 3 秒自动关闭证据见 `evidence/dicethrone-tutorial-bonus-die-autoclose-e2e-test.md`。
- 教程 3 秒自动关闭证据不受这次问题影响，见 `evidence/dicethrone-tutorial-bonus-die-autoclose-e2e-test.md`。
