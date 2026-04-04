# Dice Throne 离线提示与移动端偏移修复验证

## 本轮目标

- 修正联机 HUD 在加载 / sync 前就把真人或 AI 座位显示成“离线”的误报。
- 修正 Dice Throne v2 玩家板（武士 / 枪手）在移动端窄横屏下继续向右偏移的问题。

## 代码变更

- `src/pages/matchHudPresence.ts`
  - 新增在线 HUD 展示态归一化逻辑。
  - 连接未就绪时，把 `players[].isConnected` 统一降为 `undefined`，避免在加载中误显示红点 / 离线横幅。
  - 游戏传输层就绪后，优先采用 `GameProvider` 的 `matchPlayers`。
  - AI 座位在 HUD 展示层按常在线处理，避免出现“AI 2 号位离线 xx 秒”的假提示。
- `src/pages/MatchRoom.tsx`
  - 在线模式 HUD 改为放到 `GameProvider` 内，通过 `OnlineGameHudBridge` 读取真实传输态。
- `src/components/game/framework/widgets/GameHUD.tsx`
  - `isConnected === undefined` 时显示中性状态，不再当成离线。
  - 只有 `presenceReady=true` 后才渲染 `OpponentOfflineBanner`。
- `src/games/dicethrone/ui/CenterBoard.tsx`
  - 仅在移动窄视口下撤掉 v2 玩家板的额外 `translateX`，保留桌面端原有布局。

## 自动化验证

### 1. Vitest

命令：

```powershell
node scripts/infra/vitest-cli-safe.mjs run src/pages/__tests__/matchSeatValidation.test.ts --configLoader native --maxWorkers 1
```

结果：

- `30 passed`
- 新增覆盖：
  - 传输未就绪时不应把玩家误标成离线
  - 传输就绪后应优先采用在线同步状态
  - AI 座位在 HUD 中视作常在线

### 2. Playwright E2E

命令：

```powershell
npm run test:e2e:ci:file -- e2e/dicethrone-watch-out-spotlight.e2e.ts "mobile narrow viewport should keep magnify entries visible and clickable"
```

结果：

- `1 passed`

该用例本身覆盖：

- Dice Throne 手机窄横屏
- `samurai` / `gunslinger` 这套 v2 玩家板
- 主棋盘、玩家板、提示板、弃牌堆的移动端边界断言
- 主棋盘中心组合区（玩家板 + 提示板）的横向中心点断言，防止整体继续右漂

## 产物截图

- `D:\gongzuo\webgame\BoardGame\test-results\evidence-screenshots\dicethrone-watch-out-spotlight.e2e\mobile-narrow-viewport-should-keep-magnify-entries-visible-and-clickable\10-mobile-main-board-state.png`
- `D:\gongzuo\webgame\BoardGame\test-results\evidence-screenshots\dicethrone-watch-out-spotlight.e2e\mobile-narrow-viewport-should-keep-magnify-entries-visible-and-clickable\11-mobile-player-board-surface-magnify-open.png`
- `D:\gongzuo\webgame\BoardGame\test-results\evidence-screenshots\dicethrone-watch-out-spotlight.e2e\mobile-narrow-viewport-should-keep-magnify-entries-visible-and-clickable\12-mobile-tip-board-surface-magnify-open.png`
- `D:\gongzuo\webgame\BoardGame\test-results\evidence-screenshots\dicethrone-watch-out-spotlight.e2e\mobile-narrow-viewport-should-keep-magnify-entries-visible-and-clickable\13-mobile-player-board-button-magnify-open.png`
- `D:\gongzuo\webgame\BoardGame\test-results\evidence-screenshots\dicethrone-watch-out-spotlight.e2e\mobile-narrow-viewport-should-keep-magnify-entries-visible-and-clickable\14-mobile-discard-pile-inspect-open.png`

## 限制说明

- 本轮截图已成功生成，且对应 E2E 断言全部通过。
- 但当前会话的本地图像查看工具受限，无法直接打开这些本地 PNG 做肉眼复核。
- 因此本文件只记录“自动化断言已通过 + 截图路径已落地”的事实，不伪造“已人工看图”的结论。
