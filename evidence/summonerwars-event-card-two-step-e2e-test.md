# SummonerWars 事件牌两段式交互 E2E 证据（2026-04-18）

## 范围
- 目标：验证非交互事件牌采用“两段式流程”（第一次点击仅 armed 选中，第二次点击同卡才真正打出），并验证“点棋盘可取消 armed”。
- 用例：`e2e/summonerwars/summonerwars.e2e.ts` -> `事件卡：非交互事件牌应先 armed 再确认，点棋盘可取消`
- 补充回归：`事件卡：狱火铸剑打出流程`（交互型事件牌保持单击直进）

## 执行命令
```bash
npm run test:e2e:ci:file -- e2e/summonerwars/summonerwars.e2e.ts "事件卡：非交互事件牌应先 armed 再确认，点棋盘可取消"
npm run test:e2e:ci:file -- e2e/summonerwars/summonerwars.e2e.ts "事件卡：狱火铸剑打出流程"
```

## 关键截图与观察

### 1) armed 步骤（第一次点击仅选中）
- 路径：`D:/gongzuo/webgame/BoardGame/test-results/evidence-screenshots/summonerwars/summonerwars.e2e/事件卡：非交互事件牌应先-armed-再确认，点棋盘可取消/event-noninteractive-armed-step.png`
- 肉眼观察：
  - 手牌中的 `frost-ice-repair` 已出现选中态（高亮/上移视觉）。
  - 事件牌仍在手牌区域，没有被消耗。
- 验收判断：达标（满足“第一次点击只 armed，不立即打出”）。

### 2) 棋盘点击取消 armed
- 路径：`D:/gongzuo/webgame/BoardGame/test-results/evidence-screenshots/summonerwars/summonerwars.e2e/事件卡：非交互事件牌应先-armed-再确认，点棋盘可取消/event-noninteractive-board-cancel.png`
- 肉眼观察：
  - 手牌中的 `frost-ice-repair` 回到未选中态。
  - 事件牌仍然留在手牌。
- 验收判断：达标（满足“点棋盘可取消 armed，且不出牌”）。

### 3) 二次确认后真正打出
- 路径：`D:/gongzuo/webgame/BoardGame/test-results/evidence-screenshots/summonerwars/summonerwars.e2e/事件卡：非交互事件牌应先-armed-再确认，点棋盘可取消/event-noninteractive-confirm-play.png`
- 肉眼观察：
  - `frost-ice-repair` 已不在手牌中（被打出）。
  - 用例断言同时校验了目标友方建筑伤害从 `2` 降到 `0`，说明结算发生在二次确认后。
- 验收判断：达标（满足“第二次点击同卡才真正使用”）。

## 结果
- `事件卡：非交互事件牌应先 armed 再确认，点棋盘可取消`：通过。
- `事件卡：狱火铸剑打出流程`：通过（交互型事件牌单击直进未回归）。
