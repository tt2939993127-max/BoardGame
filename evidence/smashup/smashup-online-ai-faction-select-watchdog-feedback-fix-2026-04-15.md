# Smash Up 在线 AI factionSelect watchdog 误推进回归验证（2026-04-15）

## 对应反馈
- 反馈 ID：`69dd9e973d186c75bf372466`
- 现象：玩家选完第一个派系后，专家级 AI 不继续选派系，约 8 秒后直接进入空牌空派系的 `playCards`。

## 根因结论
- 这类坏局面的关键风险点不是 AI 选派系策略本身，而是 **AI seat 建连 / seat state 延迟时，watchdog 把 `factionSelect` 误当成可强制结束的普通 AI 回合**。
- 一旦在 `factionSelect` 阶段直接提交 `ADVANCE_PHASE`，就会绕过派系初始化，导致双方 `factions/hand/deck` 仍为空却进入对局阶段。
- 当前代码口径已经改为：**`factionSelect` 不允许走 `active-turn` 强制推进**；本轮补了单测和真实联机 E2E，证明该反馈场景不会再被误推进成空牌局。

## 本轮新增验证
### 1. 单测
- 命令：`npx vitest run src/engine/transport/__tests__/onlineAiRecovery-gameover.test.ts`
- 结果：8 passed
- 新增断言：`factionSelect` 阶段即使当前玩家是 AI，也不应返回 `active-turn` 强制推进方案。

### 2. 真实联机 E2E
- 命令：`npm run test:e2e:ci:file -- e2e/smashup/smashup-phase-transition-simple.e2e.ts "在线 AI seat 建连延迟超过 8 秒时，factionSelect 不应被 watchdog 误推进到空牌 playCards"`
- 用例做法：
  1. 创建 Smash Up 在线 AI 房；
  2. 人类先选第一个派系；
  3. 人为延迟 AI seat 的 claim-seat / 建连；
  4. 验证超过 watchdog 窗口后仍停留在 `factionSelect`，不会跳到空牌 `playCards`；
  5. AI seat 补上后继续完成双选；
  6. 人类完成第二选，最终正常进入带手牌/牌库的对局。

## 关键截图与肉眼结论

### A. 超过 watchdog 窗口后仍停留在派系选择
- 路径：`D:\gongzuo\webgame\BoardGame\test-results\evidence-screenshots\smashup\smashup-phase-transition-simple.e2e\在线-AI-seat-建连延迟超过-8-秒时，factionSelect-不应被-watchdog-误推进到空牌-playCards\在线-AI-seat-建连延迟超过-8-秒时，factionSelect-不应被-watchdog-误推进到空牌-playCards-online-ai-faction-select-still-waiting-after-watchdog.png`
- 我实际看到：页面仍是“选择你的派系”界面，不是棋盘出牌界面；右下角也没有进入结束回合/正常出牌链路。
- 我实际看到：中间仍是选秀状态卡片，而不是双方空手牌进入棋盘的坏局面。
- 验收判断：**达到本轮验收标准**，证明 watchdog 没有把 `factionSelect` 误推进成空牌 `playCards`。

### B. AI 补建连后完成双选，选秀权回到房主
- 路径：`D:\gongzuo\webgame\BoardGame\test-results\evidence-screenshots\smashup\smashup-phase-transition-simple.e2e\在线-AI-seat-建连延迟超过-8-秒时，factionSelect-不应被-watchdog-误推进到空牌-playCards\在线-AI-seat-建连延迟超过-8-秒时，factionSelect-不应被-watchdog-误推进到空牌-playCards-online-ai-faction-select-ai-picked-twice.png`
- 我实际看到：画面仍处在派系选择页，说明补建连后是继续选秀，而不是被错误跳相位。
- 我实际看到：选秀流程没有黑屏、没有空棋盘提前出现。
- 验收判断：**达到本轮验收标准**，说明 AI seat 延迟恢复后，流程仍沿正确的派系选择链路继续。

### C. 最终正常进入 playCards，双方不再是空牌空派系
- 路径：`D:\gongzuo\webgame\BoardGame\test-results\evidence-screenshots\smashup\smashup-phase-transition-simple.e2e\在线-AI-seat-建连延迟超过-8-秒时，factionSelect-不应被-watchdog-误推进到空牌-playCards\在线-AI-seat-建连延迟超过-8-秒时，factionSelect-不应被-watchdog-误推进到空牌-playCards-online-ai-faction-select-final-playcards.png`
- 我实际看到：已经进入正常棋盘视图，顶部显示“你自己 / 出牌阶段”，不再停留在坏掉的 setup 态。
- 我实际看到：底部存在 5 张可见手牌，左下角牌堆角标为 35，说明房主派系/牌组初始化正常，不是“空手牌+空牌库”。
- 我实际看到：棋盘上有 3 个正常基地位，页面没有出现双方空牌却持续轮转的异常画面。
- 验收判断：**达到本轮验收标准**，证明该反馈描述的“直接进入空牌局”已被阻断，且后续能正常进入对局。

## 结论
- 反馈 `69dd9e973d186c75bf372466` 可收口为 **resolved**。
- 当前证据链证明：即使 AI seat 建连晚于 watchdog 窗口，Smash Up 也不会再从 `factionSelect` 被误推进到空牌 `playCards`；AI 建连恢复后可继续完成选秀，最终正常开局。
